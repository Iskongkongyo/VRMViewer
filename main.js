import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://${HOST}:${PORT}`;

const FRONTEND_INDEX = path.join(__dirname, 'index.html');
const ASSETS_DIR = path.join(__dirname, 'assets');
const MODELS_DIR = path.join(__dirname, 'models');
const OUTPUT_DIR = path.join(__dirname, 'output');

// 设置vrh-deobfuscator项目根目录
// vrh-deobfuscator项目地址：https://github.com/uwu/vrh-deobfuscator
const DEOBFUSCATOR_DIR = process.env.DEOBFUSCATOR_DIR || 'D:/vrh-deobfuscator';
const DEOBFUSCATOR_ENTRY = process.env.DEOBFUSCATOR_ENTRY || path.join(DEOBFUSCATOR_DIR, 'src', 'index.js');
const NODE_BIN = process.env.NODE_BIN || process.execPath;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

app.use(cors());

app.use(express.json({ limit: '1mb' }));
app.use('/assets', express.static(ASSETS_DIR, {
  index: false,
  fallthrough: false,
}));
app.use('/models', express.static(MODELS_DIR, {
  index: false,
  fallthrough: false,
}));
app.use('/output', express.static(OUTPUT_DIR, {
  index: false,
  fallthrough: false,
  setHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
  },
}));

const jobs = new Map();
let currentJob = null;
const queue = [];

function makeId() {
  return crypto.randomBytes(8).toString('hex');
}

function extractModelId(url) {
  try {
    const value = new URL(url);
    const match = value.pathname.match(/\/models\/(\d+)/i);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

function inferFileName(url) {
  const modelId = extractModelId(url);
  if (modelId) return `${modelId}.deob.vrm`;
  return `downloaded-model-${makeId()}.deob.vrm`;
}

function buildOutputUrl(fileName) {
  return `${PUBLIC_BASE_URL}/output/${encodeURIComponent(fileName)}`;
}

function extractOutputPath(stdoutText, stderrText, url) {
  const modelId = extractModelId(url);
  const combined = `${stdoutText}\n${stderrText}`;

  const patterns = [
    /Saved(?:\s+VRM)?\s+to:\s*(.+\.vrm)/i,
    /Output:\s*(.+\.vrm)/i,
    /Wrote\s+(.+\.vrm)/i,
    /(output[\\/].+\.vrm)/i,
    /([A-Z]:[^\n\r]+\.vrm)/i,
  ];

  for (const pattern of patterns) {
    const match = combined.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/^['"]|['"]$/g, '');
    }
  }

  if (modelId) {
    const directCandidate = path.join(DEOBFUSCATOR_DIR, `${modelId}.deob.vrm`);
    if (fs.existsSync(directCandidate)) {
      return directCandidate;
    }
  }

  return null;
}

function moveIfNeeded(filePath, targetName) {
  const resolved = path.resolve(filePath);
  const finalPath = path.join(OUTPUT_DIR, targetName);

  if (resolved === finalPath) return finalPath;
  fs.copyFileSync(resolved, finalPath);
  return finalPath;
}

function createJobError(publicMessage, internalDetails, statusCode = 500) {
  const error = new Error(publicMessage);
  error.publicMessage = publicMessage;
  error.internalDetails = internalDetails;
  error.statusCode = statusCode;
  return error;
}

function inferSafeCliMessage(stdoutText, stderrText, exitCode) {
  const combined = `${stdoutText}\n${stderrText}`.toLowerCase();

  if (combined.includes('failed to grab the encrypted vrm')) {
    return '无法从 VRoid Hub 获取加密的 VRM。请检查链接是否有效且可访问！';
  }

  if (combined.includes('403') || combined.includes('forbidden') || combined.includes('unauthorized')) {
    return 'VRoid Hub 拒绝访问此模型。请检查链接权限，然后重试！';
  }

  if (combined.includes('404') || combined.includes('not found')) {
    return '无法在 VRoid Hub 上找到请求的模型！';
  }

  if (
    combined.includes('timeout') ||
    combined.includes('timed out') ||
    combined.includes('econnreset') ||
    combined.includes('enotfound') ||
    combined.includes('network')
  ) {
    return '连接 VRoid Hub 时发生了网络错误，请稍后重试！';
  }

  return `无法从该链接生成 VRM 文件！反混淆器以代码 ${exitCode} 退出！`;
}

function getPublicErrorMessage(error, fallbackMessage) {
  if (error && typeof error === 'object' && typeof error.publicMessage === 'string' && error.publicMessage) {
    return error.publicMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function getInternalErrorDetails(error) {
  if (!error) return '未知错误！';

  if (typeof error === 'object' && typeof error.internalDetails === 'string' && error.internalDetails) {
    return error.internalDetails;
  }

  if (error instanceof Error && error.stack) {
    return error.stack;
  }

  return String(error);
}

function removePreviousOutput(url) {
  const modelId = extractModelId(url);
  if (!modelId) return;

  const staleFile = path.join(DEOBFUSCATOR_DIR, `${modelId}.deob.vrm`);
  if (fs.existsSync(staleFile)) {
    fs.unlinkSync(staleFile);
  }
}

function runCliJob({ id, url }) {
  return new Promise((resolve, reject) => {
    const stdoutChunks = [];
    const stderrChunks = [];

    const child = spawn(NODE_BIN, [DEOBFUSCATOR_ENTRY, url], {
      cwd: DEOBFUSCATOR_DIR,
      env: {
        ...process.env,
      },
      windowsHide: true,
    });

    child.stdout.on('data', (chunk) => {
      stdoutChunks.push(Buffer.from(chunk));
      process.stdout.write(`[job:${id}] ${chunk}`);
    });

    child.stderr.on('data', (chunk) => {
      stderrChunks.push(Buffer.from(chunk));
      process.stderr.write(`[job:${id}] ${chunk}`);
    });

    child.on('error', (error) => {
      reject(createJobError(
        'Unable to start the deobfuscator process.',
        error instanceof Error ? error.stack || error.message : String(error),
      ));
    });

    child.on('close', (code) => {
      const stdoutText = Buffer.concat(stdoutChunks).toString('utf8');
      const stderrText = Buffer.concat(stderrChunks).toString('utf8');

      if (code !== 0) {
        reject(createJobError(
          inferSafeCliMessage(stdoutText, stderrText, code),
          `deobfuscator 以代码 ${code} 退出\n${stderrText || stdoutText}`,
        ));
        return;
      }

      resolve({ stdoutText, stderrText });
    });
  });
}

async function processJob(job) {
  job.status = 'running';
  job.startedAt = Date.now();

  try {
    removePreviousOutput(job.url);

    const result = await runCliJob(job);
    const outputPath = extractOutputPath(result.stdoutText, result.stderrText, job.url);

    if (!outputPath || !fs.existsSync(outputPath)) {
      throw createJobError(
        'deobfuscator运行结束，但未找到 VRM 输出文件！',
        `未检测到输出文件： ${job.url}\nstdout:\n${result.stdoutText}\nstderr:\n${result.stderrText}`,
      );
    }

    const finalFileName = inferFileName(job.url);
    const finalPath = moveIfNeeded(outputPath, finalFileName);
    const fileName = path.basename(finalPath);
    const fileUrl = buildOutputUrl(fileName);

    job.status = 'done';
    job.finishedAt = Date.now();
    job.result = {
      ok: true,
      fileName,
      modelUrl: fileUrl,
      downloadUrl: fileUrl,
      message: 'Completed successfully.',
    };
  } catch (error) {
    console.error(`[job:${job.id}] 过程失败\n${getInternalErrorDetails(error)}`);
    job.status = 'error';
    job.finishedAt = Date.now();
    job.result = {
      ok: false,
      jobId: job.id,
      message: getPublicErrorMessage(error, '无法处理 VRoid Hub 链接！'),
    };
  }
}

async function drainQueue() {
  if (currentJob || queue.length === 0) return;

  currentJob = queue.shift();
  await processJob(currentJob);
  currentJob = null;

  drainQueue().catch((error) => {
    console.error('drainQueue error:', error);
  });
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    host: HOST,
    port: PORT,
    viewerUrl: `${PUBLIC_BASE_URL}/`,
    currentJobId: currentJob?.id || null,
    queued: queue.length,
  });
});

app.post('/api/deobfuscate', async (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    res.status(400).json({ ok: false, message: '请求体必须包含一个 url 字段！' });
    return;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    res.status(400).json({ ok: false, message: 'URL 值不是有效的链接！' });
    return;
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    res.status(400).json({ ok: false, message: '仅支持 http 和 https 链接！' });
    return;
  }

  const job = {
    id: makeId(),
    url,
    status: 'queued',
    createdAt: Date.now(),
    startedAt: null,
    finishedAt: null,
    result: null,
  };

  jobs.set(job.id, job);
  queue.push(job);
  drainQueue().catch((error) => {
    console.error('queue error:', error);
  });

  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    if (job.status === 'done') {
      res.json(job.result);
      return;
    }

    if (job.status === 'error') {
      res.status(500).json(job.result);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  res.status(202).json({
    ok: true,
    queued: true,
    jobId: job.id,
    message: '该工作仍在运行，轮询 /api/jobs/:id 以获取进度！',
  });
});

app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    res.status(404).json({ ok: false, message: '该工作没有发现！' });
    return;
  }

  res.json({
    ok: true,
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    result: job.result,
  });
});

app.get(['/', '/index.html'], (_req, res) => {
  res.sendFile(FRONTEND_INDEX);
});


app.listen(PORT, HOST, () => {
  console.log(`Local backend ready: http://${HOST}:${PORT}`);
  console.log(`Viewer: ${PUBLIC_BASE_URL}/`);
  console.log(`Using deobfuscator: ${DEOBFUSCATOR_ENTRY}`);
});
