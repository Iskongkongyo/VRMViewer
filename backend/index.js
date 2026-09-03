import { KTX2Decoder, ZSTDDecoder } from "@babylonjs/ktx2decoder";

import {
	Accessor,
	Extension,
	NodeIO,
	PropertyType,
	VertexLayout,
} from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS, EXTTextureWebP } from "@gltf-transform/extensions";
import { createReadStream, existsSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { mkdir, writeFile, readFile, readdir, rm, stat, utimes } from "node:fs/promises";
import vm from "node:vm"
import crypto from "node:crypto";
import sharp from "sharp";
import { setGlobalDispatcher, Agent } from 'undici';
import { fileURLToPath } from "node:url";
import { unpack } from "webcrack-unpacker";

import { default as initialize } from "./src/basis_transcoder.cjs";
import { generate_buffer, generate_texture } from "./src/deobfuscator.cjs"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ROOT = __dirname;
const CACHE_DIR = path.join(APP_ROOT, "cache");
const OUTPUT_DIR = path.join(APP_ROOT, "output");
const DEBUG_DIR = path.join(APP_ROOT, "debug");
const DEFAULT_HOST = process.env.HOST || "::";
const DEFAULT_PORT = Number(process.env.PORT || 8787);
const DEFAULT_MAX_CONCURRENT_DOWNLOADS = Number(process.env.MAX_CONCURRENT_DOWNLOADS || 1);
const DEFAULT_MAX_QUEUE_SIZE = Number(process.env.MAX_QUEUE_SIZE || 100);
const DEFAULT_DOWNLOAD_RETENTION_MS = Number(process.env.DOWNLOAD_RETENTION_MS || 60 * 60 * 1000);
const DEFAULT_UNCLAIMED_OUTPUT_RETENTION_MS = Number(process.env.UNCLAIMED_OUTPUT_RETENTION_MS || 30 * 60 * 1000);
const DEFAULT_JOB_RETENTION_MS = Number(process.env.JOB_RETENTION_MS || 24 * 60 * 60 * 1000);
const DEFAULT_CACHE_RETENTION_MS = Number(process.env.CACHE_RETENTION_MS || 24 * 60 * 60 * 1000);
const DEFAULT_CLEANUP_INTERVAL_MS = Number(process.env.CLEANUP_INTERVAL_MS || 60 * 1000);
const DEFAULT_CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const DEFAULT_PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || null;
const ENABLE_DEBUG_ARTIFACTS = /^(1|true|yes|on)$/i.test(process.env.ENABLE_DEBUG_ARTIFACTS || "");
const DEFAULT_SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "vrm_session";
const DEFAULT_SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 2 * 60 * 60 * 1000);
const DEFAULT_MAX_SESSION_MODELS = Number(process.env.MAX_SESSION_MODELS || 24);
const DEFAULT_MAX_SESSION_JOBS = Number(process.env.MAX_SESSION_JOBS || 32);
const DEFAULT_SESSION_COOKIE_SAME_SITE = process.env.SESSION_COOKIE_SAME_SITE || "Lax";
const DEFAULT_SESSION_COOKIE_SECURE = /^(1|true|yes|on)$/i.test(process.env.SESSION_COOKIE_SECURE || "");
const SESSION_JWT_SECRET = process.env.SESSION_JWT_SECRET || "LoveFirefly1314" || crypto.randomBytes(32).toString("hex");

const COMMON_HEADERS = {
	'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
	'Accept-Language': 'en-US,en;q=0.9',
	'Cookie': '',
	'Origin': 'https://hub.vroid.com',
	'Referer': 'https://hub.vroid.com/',
	'Host': 'hub.vroid.com'
};

const MAX_VROID_HUB_COOKIE_LENGTH = 16 * 1024;

function normalizeVroidHubCookie(value) {
	if (value === undefined || value === null) {
		return "";
	}

	if (typeof value !== "string") {
		throw createHttpError(400, '"cookie" must be a string.');
	}

	let cookie = value.trim().replace(/^cookie\s*:\s*/i, "").trim();
	if (!cookie) {
		return "";
	}

	if (cookie.length > MAX_VROID_HUB_COOKIE_LENGTH) {
		throw createHttpError(400, `Cookie is too large. Limit: ${MAX_VROID_HUB_COOKIE_LENGTH} characters.`);
	}

	if (/[\r\n\0]/.test(cookie)) {
		throw createHttpError(400, "Cookie contains invalid control characters.");
	}

	return cookie;
}

function getEffectiveVroidHubCookie(cookieOverride = "") {
	const frontendCookie = normalizeVroidHubCookie(cookieOverride);
	if (frontendCookie) {
		return frontendCookie;
	}

	return normalizeVroidHubCookie(COMMON_HEADERS.Cookie || "");
}

function buildVroidHubHeaders(cookieOverride = "", extraHeaders = {}) {
	return {
		...COMMON_HEADERS,
		Cookie: getEffectiveVroidHubCookie(cookieOverride),
		...extraHeaders,
	};
}

function buildCookieScopedTargetKey(modelId, cookieOverride = "") {
	const effectiveCookie = getEffectiveVroidHubCookie(cookieOverride);
	if (!effectiveCookie) {
		return modelId;
	}

	const fingerprint = crypto
		.createHash("sha256")
		.update(effectiveCookie)
		.digest("hex")
		.slice(0, 16);
	return `${modelId}:cookie:${fingerprint}`;
}

setGlobalDispatcher(new Agent({
	allowH2: true,
}));

let basisModulePromise = null;

function ensureFiniteNumber(value, fallback, { min = null, allowNegativeOne = false } = {}) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}

	if (allowNegativeOne && parsed === -1) {
		return -1;
	}

	if (min !== null && parsed < min) {
		return fallback;
	}

	return parsed;
}

function parseBooleanFlag(value, fallback = false) {
	if (value === undefined || value === null || value === "") {
		return fallback;
	}

	if (typeof value === "boolean") {
		return value;
	}

	const normalized = String(value).trim().toLowerCase();
	if (["1", "true", "yes", "on"].includes(normalized)) {
		return true;
	}
	if (["0", "false", "no", "off"].includes(normalized)) {
		return false;
	}
	return fallback;
}

async function ensureDirectory(dirPath) {
	await mkdir(dirPath, { recursive: true });
}

async function ensureRuntimeDirectories() {
	await Promise.all([
		ensureDirectory(CACHE_DIR),
		ensureDirectory(OUTPUT_DIR),
	]);

	if (ENABLE_DEBUG_ARTIFACTS) {
		await ensureDirectory(DEBUG_DIR);
	}
}

async function touchFile(filePath) {
	const now = new Date();
	try {
		await utimes(filePath, now, now);
	} catch (error) {
		if (error?.code !== "ENOENT") {
			throw error;
		}
	}
}

async function cleanupExpiredCacheFiles(config) {
	if (config.cacheRetentionMs < 0) {
		return { deletedCount: 0 };
	}

	let entries;
	try {
		entries = await readdir(CACHE_DIR, { withFileTypes: true });
	} catch (error) {
		if (error?.code === "ENOENT") {
			return { deletedCount: 0 };
		}
		throw error;
	}

	const expirationCutoff = Date.now() - config.cacheRetentionMs;
	let deletedCount = 0;

	for (const entry of entries) {
		if (!entry.isFile()) {
			continue;
		}

		const filePath = path.join(CACHE_DIR, entry.name);
		try {
			const fileStat = await stat(filePath);
			if (!Number.isFinite(fileStat.mtimeMs) || fileStat.mtimeMs > expirationCutoff) {
				continue;
			}

			await rm(filePath, { force: true });
			deletedCount += 1;
		} catch (error) {
			if (error?.code !== "ENOENT") {
				throw error;
			}
		}
	}

	return { deletedCount };
}

function normalizeModelId(target) {
	const value = String(target ?? "").trim();
	if (!value) {
		throw new Error("A VRoid Hub model URL or numeric model ID is required.");
	}

	if (/^\d+$/.test(value)) {
		return {
			modelId: value,
			sourceUrl: `https://hub.vroid.com/en/models/${value}`,
			input: value,
		};
	}

	let parsedUrl;
	try {
		parsedUrl = new URL(value);
	} catch {
		throw new Error("The provided target is not a valid VRoid Hub URL or model ID.");
	}

	if (!/(^|\.)hub\.vroid\.com$/i.test(parsedUrl.hostname)) {
		throw new Error("Only hub.vroid.com VRoid Hub URLs are supported.");
	}

	const modelMatch = parsedUrl.pathname.match(/\/models\/(\d+)(?:\/)?$/i);
	if (!modelMatch?.[1]) {
		throw new Error("Could not extract a VRoid Hub model ID from the provided URL.");
	}

	return {
		modelId: modelMatch[1],
		sourceUrl: parsedUrl.toString(),
		input: value,
	};
}

function createJobId() {
	return crypto.randomBytes(8).toString("hex");
}

function safeTokenEquals(left, right) {
	if (!left || !right) {
		return false;
	}

	const leftBuffer = Buffer.from(String(left), "utf8");
	const rightBuffer = Buffer.from(String(right), "utf8");
	if (leftBuffer.length !== rightBuffer.length) {
		return false;
	}

	return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parseAllowedOrigins(value) {
	const normalized = String(value ?? "").trim();
	if (!normalized || normalized === "*") {
		return [];
	}

	return [...new Set(
		normalized
			.split(",")
			.map((origin) => origin.trim())
			.filter(Boolean),
	)];
}

function isProtectedMode(config) {
	return Array.isArray(config.allowedOrigins) && config.allowedOrigins.length > 0;
}

function base64UrlEncodeJson(value) {
	return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function parseBase64UrlJson(value) {
	return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function signSessionJwt(sessionPayload, secret, ttlMs) {
	const header = {
		alg: "HS256",
		typ: "JWT",
	};
	const now = Math.floor(Date.now() / 1000);
	const payload = {
		iss: "vroid-hub-deobfuscation-service",
		iat: now,
		exp: now + Math.max(1, Math.floor(ttlMs / 1000)),
		...sessionPayload,
	};

	const encodedHeader = base64UrlEncodeJson(header);
	const encodedPayload = base64UrlEncodeJson(payload);
	const signature = crypto
		.createHmac("sha256", secret)
		.update(`${encodedHeader}.${encodedPayload}`)
		.digest("base64url");

	return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifySessionJwt(token, secret) {
	if (!token || typeof token !== "string") {
		throw createHttpError(401, "Missing session cookie.");
	}

	const parts = token.split(".");
	if (parts.length !== 3) {
		throw createHttpError(401, "Invalid session token.");
	}

	const [encodedHeader, encodedPayload, encodedSignature] = parts;
	const expectedSignature = crypto
		.createHmac("sha256", secret)
		.update(`${encodedHeader}.${encodedPayload}`)
		.digest("base64url");

	if (!safeTokenEquals(encodedSignature, expectedSignature)) {
		throw createHttpError(401, "Invalid session signature.");
	}

	const header = parseBase64UrlJson(encodedHeader);
	if (header.alg !== "HS256" || header.typ !== "JWT") {
		throw createHttpError(401, "Unsupported session token format.");
	}

	const payload = parseBase64UrlJson(encodedPayload);
	const now = Math.floor(Date.now() / 1000);
	if (typeof payload.exp !== "number" || payload.exp <= now) {
		throw createHttpError(401, "Session expired.");
	}

	return payload;
}

function createEmptySessionState() {
	return {
		sid: createJobId(),
		models: {},
		modelOrder: [],
		jobs: {},
		jobOrder: [],
	};
}

async function getBasisModule() {
	if (!basisModulePromise) {
		basisModulePromise = initialize().then((module) => {
			module.initializeBasis();
			return module;
		});
	}

	return basisModulePromise;
}

const decryptAndDecodeVRMFile = async (fileContents) => {
	console.log("Starting to decrypt and decode VRM file...");
	const iv = fileContents.slice(0, 16);
	const keyBytes = fileContents.slice(16, 48);
	const fileBody = fileContents.slice(48, fileContents.byteLength);

	const decryptionKey = await crypto.subtle.importKey(
		"raw",
		keyBytes,
		"AES-CBC",
		true,
		["decrypt"],
	);

	const decrypted = await crypto.subtle.decrypt(
		{
			name: "AES-CBC",
			iv,
		},
		decryptionKey,
		fileBody,
	);

	const decodedSize = new DataView(decrypted.slice(0, 4)).getUint32(0, true);
	const decryptedBody = new Uint8Array(decrypted.slice(4));

	try {
		const zlib = await import('node:zlib');
		return zlib.zstdDecompressSync(decryptedBody, { maxOutputLength: decodedSize });
	} catch(e) {
		console.log("zlib.zstdDecompress requires Node v23.8; fallback to ZSTDDecoder");
	}

	const decoder = new ZSTDDecoder();
	await decoder.init();

	const decoded = decoder.decode(decryptedBody, decodedSize);
	return decoded;
};

async function fetchText(url, cookieOverride = "") {
	const headers = buildVroidHubHeaders(cookieOverride, {
  		'Accept': '*/*',
  		'Accept-Encoding': 'identity',
	});
	
	const response = await fetch(url, { headers })
	if (!response.ok) {
		throw new Error(`Couldn't get ${url}, status code: ${response.status}`)
	}
	return response.text()
}

function regexMatch(string, regex) {
	const match = string.match(regex)
	if (match === null) {
		throw new Error("Couldn't match regex")
	}
	match.shift()
	return match
}

async function fetchSeedMapModule(cookieOverride = "") {
	console.log("Fetching seed map generation module...");

	const baseUrl = "https://hub.vroid.com"

	const html = await fetchText(`${baseUrl}/en`, cookieOverride)
	const [ webpackJsPath ] = regexMatch(html, /<script src="(\/_next\/static\/chunks\/webpack-[\da-f]{16}\.js)"/)
	
	const webpackJs = await fetchText(baseUrl + webpackJsPath, cookieOverride)
	const [ modelViewerNumId ] = regexMatch(webpackJs, /(\d+):"ModelViewer"/)
	const [ modelViewerHexId ] = regexMatch(webpackJs, new RegExp(`${modelViewerNumId}:"([\\da-f]{16})"`))

	const modelViewerJs = await fetchText(`${baseUrl}/_next/static/chunks/ModelViewer.${modelViewerHexId}.js`, cookieOverride)

	const unpacked = await unpack(modelViewerJs)

	let moduleJs;
	for (const module of unpacked.bundle.modules) {
    	// check for custom base64 alphabet injected by obfuscator.
    	// if the module is obfuscated, it's probably the seedmap gen code :3
    	if (module[1].code.includes('"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/="')) {
        	console.log(`Found seed map gen module: ${module[1].id}`)
        	moduleJs = module[1].code
    	}
	}

	if (moduleJs === undefined) {
		throw new Error("Seed map gen module not found")
	}

	return moduleJs
}

// vroid hub adds new timestamps fairly often in an obfuscated JS module, so instead of
// reimplementing it ourselves it's better to just fetch their code and run it :)
const computeSeedMap = async (inputValue, url, cookieOverride = "") => {
	let moduleJs
	const seedMapModulePath = path.join(CACHE_DIR, "seedmapModule.js");
	if (existsSync(seedMapModulePath)) {
		moduleJs = await readFile(seedMapModulePath, 'utf8')
		await touchFile(seedMapModulePath);
	} else {
		moduleJs = await fetchSeedMapModule(cookieOverride)
		await ensureDirectory(CACHE_DIR);
		await writeFile(seedMapModulePath, moduleJs)
	}

	console.log("Computing seed map...")

	const seedmapFuncRegex = /^export let ([\w$]+) = async (\([\w$\s,]+\)) =>/m
	const [ seedmapFuncName, seedmapFuncArgs ] = regexMatch(moduleJs, seedmapFuncRegex)

	// epic hack since es modules can't be run under node's vm thingy
	moduleJs = moduleJs.replace(seedmapFuncRegex, `async function ${seedmapFuncName} ${seedmapFuncArgs}`)

	const context = {
    	// setInterval is used for some anti-debugging crap, we can just stub this one
    	setInterval: function(){},
		setTimeout: function(){},
		clearTimeout: function(){},
		clearInterval: function(){},
    	TextEncoder
	};
	context.window = context;
	context.globalThis = context;
	context.self = context;
	context.crypto = { subtle: crypto.subtle };
	vm.createContext(context);
	vm.runInContext(moduleJs, context);

	// console.log("seedMapStartingState", await context[seedmapFunctionName]("0", ""))
	return await context[seedmapFuncName](inputValue, url)
};

class RandomGenerator {
	constructor(seed = 0x5491333) {
		this._x = 0x75bcd15;
		this._y = 0x159a55e5;
		this._z = 0x1f123bb5;
		this._w = seed;
	}

	next() {
		return Math.abs(this._next()) / 0x80000000;
	}

	nextInRange(range) {
		return Math.floor(range * this.next()) % range;
	}

	_next() {
		const temp = this._x ^ (this._x << 11);
		this._x = this._y;
		this._y = this._z;
		this._z = this._w;
		this._w = this._w ^ (this._w >>> 19) ^ (temp ^ (temp >>> 8));
		return this._w;
	}

	replaceX(x) {
		this._x = x
	}
}

class Deobfuscator {
	constructor(seed, version, timestamp) {
		this.seed = seed;
		this.version = version;
		this.timestamp = timestamp;
		this.someConstantIdk = BigInt("2352940687395663367")
		this.metaTextureData = this._generateMetaTexture();		
	}

	_generateMetaTexture() {
		console.log("Generating meta texture...");
		
		if (this.version === '5.0') {
			return generate_texture(BigInt(this.seed), this.someConstantIdk)
		}

		const prng = new RandomGenerator(this.seed);
		prng.replaceX(0x2567de00)
		const data = new Uint8Array(256 * 256 * 4);
		for (let i = 0; i < 256 * 256; i++) {
			data[i * 4] = prng.nextInRange(256); // R
			data[i * 4 + 1] = prng.nextInRange(256); // G
			data[i * 4 + 2] = prng.nextInRange(256); // B
			data[i * 4 + 3] = 255; // A
		}

		return data;
	}

	_getMetaPosition(uVal, vVal) {
		const index = (vVal * 256 + uVal) * 4;
		const r = this.metaTextureData[index];
		const g = this.metaTextureData[index + 1];
		const b = this.metaTextureData[index + 2];
		return [r / 255, g / 255, b / 255];
	}

	processVertexDisplacement(accessor, vertexCount, meta, processed) {
		const array = accessor.getArray();

		let adjustComponent;
		switch (this.version) {
			case "4.0", "5.0":
				adjustComponent = (value, meta) => {
					return value * (2 ** (meta / 8));
				};
				break;
			default:
				throw new Error(`Unknown obfuscation version: ${this.version}`);
		}


		for (let i = 0; i < vertexCount; i++) {
			const uVal = Math.floor(meta[i * 2] * 256);
			const vVal = Math.floor(meta[i * 2 + 1] * 256);
			const [x, y, z] = this._getMetaPosition(uVal, vVal);

			if (
				processed[0].has(array[i * 3]) &&
				processed[1].has(array[i * 3 + 1]) &&
				processed[2].has(array[i * 3 + 2])
			) {
				continue;
			}

			array[i * 3] = adjustComponent(array[i * 3], x);
			array[i * 3 + 1] = adjustComponent(array[i * 3 + 1], y);
			array[i * 3 + 2] = adjustComponent(array[i * 3 + 2], z);

			processed[0].add(array[i * 3]);
			processed[1].add(array[i * 3 + 1]);
			processed[2].add(array[i * 3 + 2]);
		}

		accessor.setArray(array);
	}

	processPrimitive(document, primitive) {
		const vertexCount = primitive.getAttribute("POSITION").getCount();

		let metaData;
		if (this.version === '5.0') {
			metaData = generate_buffer(BigInt(this.seed), this.someConstantIdk, 2 * vertexCount)
		} else {
			const randomGenerator = new RandomGenerator(this.seed);
			randomGenerator.replaceX(0x2567de00)
			metaData = new Float32Array(2 * vertexCount);

			for (let i = 0; i < 2 * vertexCount; i++) {
				metaData[i] = (randomGenerator.nextInRange(256) + 0.5) / 256;
			}
		}

		const accessor = document.createAccessor();
		accessor.setType(Accessor.Type.VEC2);
		accessor.setArray(metaData);

		primitive.setAttribute("META", accessor);
	}

	processDocument(document) {
		const root = document.getRoot();

		for (const mesh of root.listMeshes()) {
			for (const primitive of mesh.listPrimitives()) {
				this.processPrimitive(document, primitive);
			}
		}

		const processed = [new Set(), new Set(), new Set()];

		console.log("Processing vertex displacement...");
		for (const mesh of root.listMeshes()) {
			for (const primitive of mesh.listPrimitives()) {
				const position = primitive.getAttribute("POSITION");
				if (!position) {
					continue;
				}

				const meta = primitive.getAttribute("META");
				const vertexCount = position.getCount();
				this.processVertexDisplacement(
					position,
					vertexCount,
					meta.getArray(),
					processed,
				);

				meta.dispose();
			}
		}
	}
}

const makeSafeFilename = (name) => {
	return name.replace(/[<>:"\/\\|?*\u0000-\u001F]/g, (x) => {
		return '_x'+('0'+x.charCodeAt(0).toString(16)).substr(-2)+'_';
	});
}

const writeTexture = async (texture, suffix, buffer, ext, debugDir = null) => {
	if (!debugDir) {
		return;
	}

	let name = texture.getName();
	const match = name.match(/^data:.*?\bbase64,(.+)(.)$/);
	if (match) {
		const data = Buffer.from(match[1], "base64");
		name = crypto.createHash("md5").update(data).digest("hex")+"_"+match[2];
		await writeFile(path.join(debugDir, `${name}.${suffix}.base64.png`), data);
	}
	await writeFile(path.join(debugDir, `${makeSafeFilename(name)}.${suffix}.${ext || "png"}`), buffer);
}

const VRM_EXTENSION_NAME = "VRM";
const PIXIV_EXTENSION_NAME = "PIXIV_vroid_hub_preview_mesh";
const PIXIV_BASIS_EXTENSION_NAME = "PIXIV_texture_basis";

// Base class - preserve respective json.extensions[] data
class PreservationExtension extends Extension {
	static EXTENSION_NAME = null;
	extensionName = null;

	read(context) {
		const jsonDoc = context.jsonDoc;
		const json = jsonDoc.json;

		this.data = json.extensions[this.extensionName];
		return this;
	}

	// Write data during export
	write(context) {
		const jsonDoc = context.jsonDoc;
		const data = this.data;

		if (data) {
			jsonDoc.json.extensions = jsonDoc.json.extensions || {};
			jsonDoc.json.extensions[this.extensionName] = data;
		}

		return this;
	}
}

// Common pool for extensions that need textures to be patched first
class TexturePoolExtension extends PreservationExtension {
	static _vrmTextures = null;

	_saveTextures = (json) => {
		if (this._vrmTextures) return;
		this._vrmTextures = (json.textures||[]).map((t) => ({
			name: t.name,
			source: t.source,
			sampler: t.sampler,
		}));
	}

	_reapplyTextures = (json) => {
		if (!this._vrmTextures) return;
		const sourceToIdx = {};

		json.textures.forEach((tex, i) => sourceToIdx[tex.source] = i);
		this._vrmTextures.forEach(tex => {
			if (sourceToIdx[tex.source] !== undefined) {
				json.textures[sourceToIdx[tex.source]] = tex;
			} else {
				sourceToIdx[tex.source] = json.textures.push(tex) - 1;
			}
		});

		this._vrmTextures = null;
	}
}

export class VRM_v0_Extension extends TexturePoolExtension {
	static EXTENSION_NAME = VRM_EXTENSION_NAME;
	extensionName = VRM_EXTENSION_NAME;

	read(context) {
		super.read(context);
		const jsonDoc = context.jsonDoc;
		const json = jsonDoc.json;

		this._saveTextures(json);
		this.samplers = json.samplers || [];

		this.data.materialProperties ||= [];
		for (let mat of this.data.materialProperties) {
			if (!mat.textureProperties) continue;
			mat._textureSources = [];
			for (let prop in mat.textureProperties) {
				mat._textureSources[prop] = json.textures[mat.textureProperties[prop]].source;
			}
		}

		return this;
	}

	write(context) {
		const jsonDoc = context.jsonDoc;
		const json = jsonDoc.json;

		this._reapplyTextures(json);
		json.samplers = this.samplers || [];

		const sourceToIdx = {};
		json.textures.forEach((tex, i) => sourceToIdx[tex.source] = i);

		this.data.materialProperties ||= [];
		for (let mat of this.data.materialProperties) {
			if (!mat._textureSources) continue;
			for (let prop in mat._textureSources) {
				mat.textureProperties[prop] = sourceToIdx[mat._textureSources[prop]];
			}
			delete mat._textureSources;
		}

		super.write(context);

		return this;
	}
}

export class VRM_v1_Extension extends TexturePoolExtension {
	static EXTENSION_NAME = "VRMC_vrm";
	extensionName = "VRMC_vrm";

	read(context) {
		super.read(context);
		const jsonDoc = context.jsonDoc;
		const json = jsonDoc.json;

		this._saveTextures(json);
		this.samplers = json.samplers || [];

		return this;
	}

	write(context) {
		super.write(context);
		const jsonDoc = context.jsonDoc;
		const json = jsonDoc.json;

		this._reapplyTextures(json);
		json.samplers = this.samplers || [];

		return this;
	}
}

export class VRM_v1_materials_mtoon_Extension extends TexturePoolExtension {
	static EXTENSION_NAME = "VRMC_materials_mtoon";
	extensionName = "VRMC_materials_mtoon";
	prereadTypes = [PropertyType.MESH];
	prewriteTypes = [PropertyType.MESH];

	preread(context) {
		const jsonDoc = context.jsonDoc;
		const json = jsonDoc.json;

		this._saveTextures(json);

		this.materials_mtoon = {};
		for (let idx in json.materials) {
			let mat = json.materials[idx];
			if (!mat.extensions?.VRMC_materials_mtoon) continue;

			let ext = mat.extensions.VRMC_materials_mtoon;
			for (let k of Object.keys(ext)) {
				if (!k.match(/^.*Texture$/)) continue;
				ext[k]._source = json.textures[ext[k].index].source;
			}
			this.materials_mtoon[idx] = ext;
		}
	}

	prewrite(context) {
		const jsonDoc = context.jsonDoc;
		const json = jsonDoc.json;

		this._reapplyTextures(json);

		const sourceToIdx = {};
		json.textures.forEach((tex, i) => sourceToIdx[tex.source] = i);

		for (let mat of this.document.getRoot().listMaterials()) {
			const idx = context.materialIndexMap.get(mat);
			if (!this.materials_mtoon[idx]) continue;

			json.materials[idx].extensions ||= {};
			json.materials[idx].extensions.VRMC_materials_mtoon = this.materials_mtoon[idx];
			const ext = json.materials[idx].extensions.VRMC_materials_mtoon;

			for (let k of Object.keys(ext)) {
				if (!k.match(/^.*Texture$/)) continue;
				ext[k].index = sourceToIdx[ext[k]._source];
				delete ext[k]._source;
			}
		}
	}
}

export class VRM_v1_node_constraint_Extension extends PreservationExtension {
	static EXTENSION_NAME = "VRMC_node_constraint";
	extensionName = "VRMC_node_constraint";

	read(context) {
		super.read(context);
		const jsonDoc = context.jsonDoc;
		const json = jsonDoc.json;

		this.node_constraint = {};
		for (let idx in json.nodes) {
			let node = json.nodes[idx];
			if (!node.extensions?.VRMC_node_constraint) continue;

			let ext = node.extensions.VRMC_node_constraint;
			this.node_constraint[idx] = ext;
		}
	}

	write(context) {
		super.write(context);
		const jsonDoc = context.jsonDoc;
		const json = jsonDoc.json;

		for (let node of this.document.getRoot().listNodes()) {
			const idx = context.nodeIndexMap.get(node);
			if (!this.node_constraint[idx]) continue;

			json.nodes[idx].extensions ||= {};
			json.nodes[idx].extensions.VRMC_node_constraint = this.node_constraint[idx];
		}
	}
}

export class VRM_v1_materials_hdr_emissiveMultiplier_Extension extends TexturePoolExtension {
	static EXTENSION_NAME = "VRMC_materials_hdr_emissiveMultiplier";
	extensionName = "VRMC_materials_hdr_emissiveMultiplier";
	prereadTypes = [PropertyType.MESH];
	prewriteTypes = [PropertyType.MESH];

	preread(context) {
		const jsonDoc = context.jsonDoc;
		const json = jsonDoc.json;

		this._saveTextures(json);

		this.emissiveMultiplier = {};
		for (let idx in json.materials) {
			let mat = json.materials[idx];
			if (!mat.extensions?.VRMC_materials_hdr_emissiveMultiplier) continue;

			let ext = mat.extensions.VRMC_materials_hdr_emissiveMultiplier;
			this.emissiveMultiplier[idx] = ext;
		}
	}

	prewrite(context) {
		const jsonDoc = context.jsonDoc;
		const json = jsonDoc.json;

		this._reapplyTextures(json);

		for (let mat of this.document.getRoot().listMaterials()) {
			const idx = context.materialIndexMap.get(mat);
			if (!this.emissiveMultiplier[idx]) continue;

			json.materials[idx].extensions ||= {};
			json.materials[idx].extensions.VRMC_materials_hdr_emissiveMultiplier = this.emissiveMultiplier[idx];
		}
	}
}

export class PIXIVExtension extends Extension {
	static EXTENSION_NAME = PIXIV_EXTENSION_NAME;
	extensionName = PIXIV_EXTENSION_NAME;

	read(context) {
		const jsonDoc = context.jsonDoc;
		const json = jsonDoc.json;

		this.data = json.extensions[PIXIV_EXTENSION_NAME];

		return this;
	}

	write() {
		throw "This extension must be removed prior to writing.";
	}
}

export class PIXIVBasisExtension extends Extension {
	static EXTENSION_NAME = PIXIV_BASIS_EXTENSION_NAME;
	extensionName = PIXIV_BASIS_EXTENSION_NAME;
	prereadTypes = [PropertyType.TEXTURE];

	preread(context) {
		console.log("Detected PIXIV basis extension, fixing it up...");
		const textures = context.jsonDoc.json.textures || [];
		for (const texture of textures) {
			if (texture.extensions?.PIXIV_texture_basis) {
				texture.source = texture.extensions.PIXIV_texture_basis.source;
			}
		}

		context.jsonDoc.json.textures = textures;

		return this;
	}

	read() {}
	write() {
		throw "This extension must be removed prior to writing.";
	}
}

async function deobfuscateVRoidHubGLB(target, options = {}) {
	const { modelId: id } = typeof target === "string" ? normalizeModelId(target) : target;
	const debugDir = options.enableDebugArtifacts
		? path.join(DEBUG_DIR, options.debugDirectoryName || id)
		: null;

	console.log(`Starting deobfuscation process for VRoid Hub GLB ${id}...`);
	let vrmData = null;
	let vrmUrl = null;

	await ensureRuntimeDirectories();

	if (debugDir) {
		await rm(debugDir, { recursive: true, force: true });
		await ensureDirectory(debugDir);
	}

	const cachedInfoPath = path.join(CACHE_DIR, `${id}.json`);
	const cachedGlbPath = path.join(CACHE_DIR, `${id}.glb`);
	if (existsSync(cachedInfoPath) === true && existsSync(cachedGlbPath) === true) {
		console.log(`Loading cached GLB for ID: ${id}...`);
		const vrmInfo = JSON.parse(await readFile(cachedInfoPath, "utf-8"));
		vrmUrl = vrmInfo.url;
		vrmData = await readFile(cachedGlbPath);
		await Promise.all([
			touchFile(cachedInfoPath),
			touchFile(cachedGlbPath),
		]);
	} else {
		console.log(`Fetching VRM data for ID: ${id}...`);
		
		const fetchOptions = {
			headers: buildVroidHubHeaders(options.cookie, {
				"X-Api-Version": "11",
				"Accept": "application/json, text/plain, */*",
			}),
		};
		let response = await fetch(`https://hub.vroid.com/api/character_models/${id}/optimized_preview`, fetchOptions);
		if (response.status === 404) {
			console.log('/optimized_preview not found, trying /preview')
			response = await fetch(`https://hub.vroid.com/api/character_models/${id}/preview`, fetchOptions);
		}

		vrmData = await response.arrayBuffer();

		if (!response.ok) throw new Error("Failed to grab the encrypted VRM.");

		vrmData = await decryptAndDecodeVRMFile(vrmData);

		vrmUrl = response.url;
		await writeFile(cachedGlbPath, vrmData);
		await writeFile(
			cachedInfoPath,
			JSON.stringify({ id, url: vrmUrl }, null, 2),
		);
		console.log(`Fetched and decrypted VRM data for ID: ${id}.`);
	}

	let seedMap = await computeSeedMap(id, vrmUrl, options.cookie);

	// Other subextensions that just need their json.extension[] data transferred
	// https://github.com/vrm-c/vrm-specification/tree/master/specification
	const VRM_v1_SubExtensions = [];
	const VRM_v1_SUBEXTENSION_NAMES = [
		"VRMC_springBone",
		"VRMC_springBone_limit",
		"VRMC_springBone_extended_collider",
		"VRMC_vrm_animation"
	]
	for (let extName of VRM_v1_SUBEXTENSION_NAMES) {
		VRM_v1_SubExtensions.push(
			class VRM_SubExtension extends PreservationExtension {
				static EXTENSION_NAME = extName;
				extensionName = extName;
			}
		)
	}

	const io = new NodeIO().registerExtensions([
		...KHRONOS_EXTENSIONS,
		EXTTextureWebP,
		VRM_v0_Extension,
		VRM_v1_Extension,
		VRM_v1_materials_mtoon_Extension,
		VRM_v1_node_constraint_Extension,
		VRM_v1_materials_hdr_emissiveMultiplier_Extension,
		PIXIVExtension,
		PIXIVBasisExtension,
	]).registerExtensions(
		VRM_v1_SubExtensions
	);

	// Read the GLB file
	console.log("Reading GLB file...");
	const doc = await io.readBinary(vrmData);
	const extensions = doc.getRoot().listExtensionsUsed();
	const basisUExtension = extensions.find(
		(ext) => ext.extensionName === "KHR_texture_basisu",
	);
	basisUExtension?.dispose();

	const pixivExtension = extensions.find(
		(ext) => ext.extensionName === PIXIV_EXTENSION_NAME,
	);
	const { timestamp, version } = pixivExtension.data;
	pixivExtension?.dispose();

	const pixivBasisExtension = extensions.find(
		(ext) => ext.extensionName === PIXIV_BASIS_EXTENSION_NAME,
	);
	pixivBasisExtension?.dispose();

	console.log("Obfuscation version and timestamp:", version, timestamp);

	let seed = seedMap[timestamp];

	if (seed === undefined) {
		console.log(`Seed not found for timestamp ${timestamp}, fetching new seedmap gen module...`)
		await rm(path.join(CACHE_DIR, "seedmapModule.js"), { force: true })
		seedMap = await computeSeedMap(id, vrmUrl, options.cookie);

		seed = seedMap[timestamp]

		if (seed === undefined) {
			throw new Error(`Seed not found for timestamp: ${timestamp}`);
		}
	}
	
	const deobfuscator = new Deobfuscator(seed, version, timestamp);
	deobfuscator.processDocument(doc);

	const decoder = new KTX2Decoder();
	const { BasisFile } = await getBasisModule();

	const textures = doc.getRoot().listTextures() || [];
	console.log("Decoding textures...");
	for (const texture of textures) {
		const image = texture.getImage();
		const mime = texture.getMimeType();

		if (!image) continue;

		if (mime === "image/ktx2") {
			const decoded = await decoder.decode(image, {
				ASTC: true,
				BC7: true,
				ETC2: true,
				ETC1S: true,
				PVRTC: true,
				S3TC: true,
				UASTC: true,
			});

			const pngBuffer = await sharp(decoded.mipmaps[0].data, {
				raw: {
					width: decoded.width,
					height: decoded.height,
					channels: 4,
				},
			})
				.png()
				.toBuffer();

			await writeTexture(texture, "ktx2", pngBuffer, undefined, debugDir);

			texture.setImage(pngBuffer);
			texture.setMimeType("image/png");
		} else if (mime === "image/basis") {

			const dv = new DataView(image.buffer, image.byteOffset, image.byteLength);
			const magic = dv.getUint32(0);
			if (magic === 0x89504e47) {
				console.log("Fixing mime type for PNG", texture.getName());
				texture.setMimeType("image/png");
				await writeTexture(texture, "png", image, undefined, debugDir);
				continue;
			} else if (magic === 0xffd8ffdb || magic === 0xffd8ffe0 || magic === 0xffd8ffee || magic === 0xffd8ffe1) {
				console.log("Fixing mime type for JPEG", texture.getName());
				texture.setMimeType("image/jpeg");
				await writeTexture(texture, "jpeg", image, 'jpg', debugDir);
				continue;
			}

			const basisFile = new BasisFile(image);

			const width = basisFile.getImageWidth(0, 0);
			const height = basisFile.getImageHeight(0, 0);
			basisFile.startTranscoding();

			const dstSize = width * height * 4;
			const dst = new Uint8Array(dstSize);

			if (!basisFile.transcodeImage(dst, 0, 0, 13, 0, 0)) {
				throw new Error("Failed to transcode image");
			}

			const pngBuffer = await sharp(dst, {
				raw: {
					width,
					height,
					channels: 4,
				},
			})
				.png()
				.toBuffer();

			await writeTexture(texture, "basis", pngBuffer, undefined, debugDir);

			texture.setImage(pngBuffer);
			texture.setMimeType("image/png");
		} else if (mime === "image/png") {

			const dv = new DataView(image.buffer, image.byteOffset, image.byteLength);
			const magic = dv.getUint32(0);
			
			if (magic === 0x52494646) {
				console.log("Convering WEBP to PNG:", texture.getName());
				const pngBuffer = await sharp(image)
					.png({ compressionLevel: 9, adaptiveFiltering: true, force: true })
					.toBuffer();
				texture.setImage(pngBuffer);
				await writeTexture(texture, "webp", pngBuffer, undefined, debugDir);
			}
		}
	}

	io.setVertexLayout(VertexLayout.SEPARATE);
	const outputGLB = Buffer.from(await io.writeBinary(doc));

	if (options.outputPath) {
		await ensureDirectory(path.dirname(options.outputPath));
		await writeFile(options.outputPath, outputGLB);
	}

	console.log(
		`Deobfuscation process for VRoid Hub GLB with ID: ${id} completed.`,
	);
	return {
		buffer: outputGLB,
		modelId: id,
		timestamp,
		version,
		vrmUrl,
	};
}

function buildOutputFileName(modelId) {
	return `${modelId}.deob.vrm`;
}

function isOutputArtifactFileName(fileName) {
	return typeof fileName === "string" && fileName.endsWith(".deob.vrm");
}

function isOutputArtifactMetadataFileName(fileName) {
	return typeof fileName === "string" && fileName.endsWith(".deob.vrm.meta.json");
}

function buildOutputMetadataPath(outputPath) {
	return `${outputPath}.meta.json`;
}

async function readOutputArtifactMetadata(outputPath) {
	const metadataPath = buildOutputMetadataPath(outputPath);
	try {
		const raw = await readFile(metadataPath, "utf8");
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch (error) {
		if (error?.code === "ENOENT" || error instanceof SyntaxError) {
			return null;
		}
		throw error;
	}
}

async function writeOutputArtifactMetadata(job) {
	if (!job?.outputPath) {
		return;
	}

	const metadataPath = buildOutputMetadataPath(job.outputPath);
	const payload = {
		modelId: job.modelId,
		jobId: job.id,
		createdAt: job.finishedAt || job.createdAt || Date.now(),
		firstDownloadedAt: job.firstDownloadedAt || null,
		lastDownloadedAt: job.lastDownloadedAt || null,
		downloadCount: job.downloadCount || 0,
	};
	await writeFile(metadataPath, JSON.stringify(payload, null, 2));
}

async function deleteOutputArtifactMetadata(outputPath) {
	await rm(buildOutputMetadataPath(outputPath), { force: true });
}

function calculateOutputArtifactExpiresAt(metadata, fileStat, config) {
	const lastDownloadedAt = Number.isFinite(metadata?.lastDownloadedAt) ? metadata.lastDownloadedAt : null;
	if (lastDownloadedAt !== null) {
		if (config.downloadRetentionMs < 0) {
			return null;
		}
		return lastDownloadedAt + config.downloadRetentionMs;
	}

	const createdAt = Number.isFinite(metadata?.createdAt)
		? metadata.createdAt
		: (Number.isFinite(fileStat?.mtimeMs) ? fileStat.mtimeMs : Date.now());

	if (config.unclaimedOutputRetentionMs < 0) {
		return null;
	}
	return createdAt + config.unclaimedOutputRetentionMs;
}

async function cleanupExpiredOutputFiles(config, { jobByOutputPath = null, deleteTrackedJobArtifact = null } = {}) {
	let entries;
	try {
		entries = await readdir(OUTPUT_DIR, { withFileTypes: true });
	} catch (error) {
		if (error?.code === "ENOENT") {
			return { deletedCount: 0, deletedMetadataCount: 0 };
		}
		throw error;
	}

	let deletedCount = 0;
	let deletedMetadataCount = 0;
	const now = Date.now();

	for (const entry of entries) {
		if (!entry.isFile() || !isOutputArtifactMetadataFileName(entry.name)) {
			continue;
		}

		const metadataPath = path.join(OUTPUT_DIR, entry.name);
		const outputPath = metadataPath.slice(0, -".meta.json".length);
		if (existsSync(outputPath)) {
			continue;
		}

		await rm(metadataPath, { force: true });
		deletedMetadataCount += 1;
	}

	for (const entry of entries) {
		if (!entry.isFile() || !isOutputArtifactFileName(entry.name)) {
			continue;
		}

		const outputPath = path.join(OUTPUT_DIR, entry.name);
		try {
			const fileStat = await stat(outputPath);
			const metadata = await readOutputArtifactMetadata(outputPath);
			const expiresAt = calculateOutputArtifactExpiresAt(metadata, fileStat, config);
			if (expiresAt === null || expiresAt > now) {
				continue;
			}

			const trackedJob = jobByOutputPath?.get(outputPath) || null;
			if (trackedJob && typeof deleteTrackedJobArtifact === "function") {
				await deleteTrackedJobArtifact(trackedJob, "retention expired (directory scan)");
			} else {
				await rm(outputPath, { force: true });
				await deleteOutputArtifactMetadata(outputPath);
			}

			deletedCount += 1;
		} catch (error) {
			if (error?.code !== "ENOENT") {
				throw error;
			}
		}
	}

	return { deletedCount, deletedMetadataCount };
}

function createHttpError(statusCode, message) {
	const error = new Error(message);
	error.statusCode = statusCode;
	return error;
}

function getErrorStatusCode(error, fallback = 500) {
	const statusCode = Number(error?.statusCode);
	if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599) {
		return statusCode;
	}
	return fallback;
}

function getErrorMessage(error, fallback = "Unexpected server error.") {
	if (error instanceof Error && error.message) {
		return error.message;
	}
	return fallback;
}

function buildPublicBaseUrl(req, config) {
	if (config.publicBaseUrl) {
		return config.publicBaseUrl.replace(/\/+$/, "");
	}

	const forwardedProto = req.headers["x-forwarded-proto"];
	const forwardedHost = req.headers["x-forwarded-host"];
	const protocol = typeof forwardedProto === "string" && forwardedProto ? forwardedProto : "http";
	const host = typeof forwardedHost === "string" && forwardedHost
		? forwardedHost
		: (req.headers.host || `${config.host}:${config.port}`);

	return `${protocol}://${host}`;
}

function getRequestOrigin(req) {
	if (typeof req.headers.origin === "string" && req.headers.origin.trim()) {
		return req.headers.origin.trim();
	}
	return "";
}

function parseRequestCookies(req) {
	const rawCookieHeader = req.headers.cookie;
	if (!rawCookieHeader) {
		return {};
	}

	return Object.fromEntries(
		rawCookieHeader
			.split(";")
			.map((segment) => segment.trim())
			.filter(Boolean)
			.map((segment) => {
				const separatorIndex = segment.indexOf("=");
				if (separatorIndex === -1) {
					return [segment, ""];
				}

				const name = segment.slice(0, separatorIndex).trim();
				const value = segment.slice(separatorIndex + 1).trim();
				try {
					return [name, decodeURIComponent(value)];
				} catch {
					return [name, value];
				}
			}),
	);
}

function isOriginAllowed(origin, config) {
	if (!origin || !isProtectedMode(config)) {
		return false;
	}

	return config.allowedOrigins.includes(origin);
}

function assertAllowedOrigin(req, config, { allowMissingOrigin = false } = {}) {
	if (!isProtectedMode(config)) {
		return;
	}

	const origin = getRequestOrigin(req);
	if (!origin) {
		if (allowMissingOrigin) {
			return;
		}
		throw createHttpError(403, "Origin header is required.");
	}

	if (!isOriginAllowed(origin, config)) {
		throw createHttpError(403, "Origin is not allowed.");
	}
}

function getRequestSessionToken(req, config) {
	const cookies = parseRequestCookies(req);
	return cookies[config.sessionCookieName] || "";
}

function normalizeSessionState(payload) {
	return {
		sid: typeof payload.sid === "string" && payload.sid ? payload.sid : createJobId(),
		models: payload.models && typeof payload.models === "object" ? { ...payload.models } : {},
		modelOrder: Array.isArray(payload.modelOrder) ? [...payload.modelOrder] : [],
		jobs: payload.jobs && typeof payload.jobs === "object" ? { ...payload.jobs } : {},
		jobOrder: Array.isArray(payload.jobOrder) ? [...payload.jobOrder] : [],
	};
}

function getSessionStateFromRequest(req, config, { createIfMissing = false, allowMissingOrigin = false } = {}) {
	if (!isProtectedMode(config)) {
		return null;
	}

	assertAllowedOrigin(req, config, { allowMissingOrigin });

	const sessionToken = getRequestSessionToken(req, config);
	if (!sessionToken) {
		if (createIfMissing) {
			return createEmptySessionState();
		}
		throw createHttpError(401, "Missing session cookie.");
	}

	try {
		const payload = verifySessionJwt(sessionToken, config.sessionJwtSecret);
		return normalizeSessionState(payload);
	} catch (error) {
		if (createIfMissing) {
			return createEmptySessionState();
		}
		throw error;
	}
}

function rememberModelInSession(sessionState, modelId, config) {
	sessionState.models[modelId] = Date.now();
	sessionState.modelOrder = sessionState.modelOrder.filter((entry) => entry !== modelId);
	sessionState.modelOrder.push(modelId);

	while (sessionState.modelOrder.length > config.maxSessionModels) {
		const staleModelId = sessionState.modelOrder.shift();
		if (staleModelId) {
			delete sessionState.models[staleModelId];
		}
	}
}

function rememberJobInSession(sessionState, job, config) {
	rememberModelInSession(sessionState, job.modelId, config);
	sessionState.jobs[job.id] = job.modelId;
	sessionState.jobOrder = sessionState.jobOrder.filter((entry) => entry !== job.id);
	sessionState.jobOrder.push(job.id);

	while (sessionState.jobOrder.length > config.maxSessionJobs) {
		const staleJobId = sessionState.jobOrder.shift();
		if (staleJobId) {
			delete sessionState.jobs[staleJobId];
		}
	}
}

function assertSessionCanAccessJob(sessionState, job) {
	if (!sessionState) {
		return;
	}

	const hasModelPermission = sessionState.models?.[job.modelId];
	const boundModelId = sessionState.jobs?.[job.id];
	if (!hasModelPermission || boundModelId !== job.modelId) {
		throw createHttpError(403, "This session is not allowed to access the requested job.");
	}
}

function buildSessionCookieValue(sessionState, config) {
	const token = signSessionJwt(
		normalizeSessionState(sessionState),
		config.sessionJwtSecret,
		config.sessionTtlMs,
	);

	const parts = [
		`${config.sessionCookieName}=${encodeURIComponent(token)}`,
		"Path=/",
		"HttpOnly",
		`SameSite=${config.sessionCookieSameSite}`,
		`Max-Age=${Math.max(1, Math.floor(config.sessionTtlMs / 1000))}`,
	];

	if (config.sessionCookieSecure) {
		parts.push("Secure");
	}

	return parts.join("; ");
}

function setSessionCookie(res, sessionState, config) {
	if (!isProtectedMode(config) || !sessionState) {
		return;
	}

	res.setHeader("Set-Cookie", buildSessionCookieValue(sessionState, config));
}

function setCorsHeaders(req, res, config) {
	const origin = getRequestOrigin(req);

	if (!isProtectedMode(config)) {
		if (origin) {
			res.setHeader("Access-Control-Allow-Origin", origin);
			res.setHeader("Access-Control-Allow-Credentials", "true");
			res.setHeader("Vary", "Origin");
		} else {
			res.setHeader("Access-Control-Allow-Origin", "*");
		}
	} else {
		if (origin && isOriginAllowed(origin, config)) {
			res.setHeader("Access-Control-Allow-Origin", origin);
			res.setHeader("Access-Control-Allow-Credentials", "true");
			res.setHeader("Vary", "Origin");
		}
	}

	res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");
	res.setHeader("Access-Control-Max-Age", "86400");
}

function sendJson(req, res, statusCode, payload, config) {
	setCorsHeaders(req, res, config);
	res.writeHead(statusCode, {
		"Content-Type": "application/json; charset=utf-8",
		"Cache-Control": "no-store",
	});
	res.end(JSON.stringify(payload, null, 2));
}

async function readJsonBody(req, maxBytes = 1024 * 1024) {
	const chunks = [];
	let total = 0;

	for await (const chunk of req) {
		total += chunk.length;
		if (total > maxBytes) {
			throw createHttpError(413, `Request body is too large. Limit: ${maxBytes} bytes.`);
		}
		chunks.push(Buffer.from(chunk));
	}

	if (chunks.length === 0) {
		return {};
	}

	try {
		return JSON.parse(Buffer.concat(chunks).toString("utf8"));
	} catch {
		throw createHttpError(400, "Request body must be valid JSON.");
	}
}

function serializeConfig(config) {
	return {
		host: config.host,
		port: config.port,
		authMode: config.authMode,
		maxConcurrentDownloads: config.maxConcurrentDownloads,
		maxQueueSize: config.maxQueueSize,
		downloadRetentionMs: config.downloadRetentionMs,
		unclaimedOutputRetentionMs: config.unclaimedOutputRetentionMs,
		jobRetentionMs: config.jobRetentionMs,
		cacheRetentionMs: config.cacheRetentionMs,
		cleanupIntervalMs: config.cleanupIntervalMs,
		corsOrigin: config.corsOrigin,
		publicBaseUrl: config.publicBaseUrl,
		sessionCookieName: config.sessionCookieName,
		sessionTtlMs: config.sessionTtlMs,
		enableDebugArtifacts: config.enableDebugArtifacts,
	};
}

function createJobManager(config) {
	const jobs = new Map();
	const pendingQueue = [];
	const runningJobIds = new Set();
	const activeJobIdByTarget = new Map();
	const reusableJobIdByTarget = new Map();

	async function deleteJobArtifact(job, reason = "artifact cleanup") {
		if (!job.outputPath) {
			return;
		}

		const filePath = job.outputPath;
		job.outputPath = null;
		job.fileName = null;
		job.sizeBytes = null;
		job.expiresAt = null;
		job.lastArtifactCleanupReason = reason;

		if (reusableJobIdByTarget.get(job.reuseKey) === job.id) {
			reusableJobIdByTarget.delete(job.reuseKey);
		}

		await Promise.all([
			rm(filePath, { force: true }),
			deleteOutputArtifactMetadata(filePath),
		]);
	}

	function getQueuePosition(jobId) {
		const index = pendingQueue.indexOf(jobId);
		return index === -1 ? null : index + 1;
	}

	function isArtifactAvailable(job) {
		return Boolean(job?.outputPath && existsSync(job.outputPath));
	}

	function buildDownloadPath(job) {
		return `/api/jobs/${encodeURIComponent(job.id)}/download`;
	}

	function serializeJob(job, req) {
		const baseUrl = req ? buildPublicBaseUrl(req, config) : (config.publicBaseUrl || null);
		const artifactAvailable = isArtifactAvailable(job);
		const downloadPath = artifactAvailable ? buildDownloadPath(job) : null;

		return {
			id: job.id,
			modelId: job.modelId,
			targetKey: job.targetKey,
			sourceUrl: job.sourceUrl,
			status: job.status,
			createdAt: job.createdAt,
			startedAt: job.startedAt,
			finishedAt: job.finishedAt,
			queuePosition: job.status === "queued" ? getQueuePosition(job.id) : null,
			downloadCount: job.downloadCount,
			firstDownloadedAt: job.firstDownloadedAt,
			lastDownloadedAt: job.lastDownloadedAt,
			expiresAt: job.expiresAt,
			artifact: {
				available: artifactAvailable,
				fileName: artifactAvailable ? job.fileName : null,
				sizeBytes: artifactAvailable ? job.sizeBytes : null,
				downloadPath,
				downloadUrl: artifactAvailable && baseUrl ? `${baseUrl}${downloadPath}` : null,
			},
			result: job.status === "done" ? {
				modelId: job.modelId,
				version: job.version || null,
				timestamp: job.timestamp || null,
				vrmUrl: job.vrmUrl || null,
			} : null,
			error: job.status === "error" ? {
				message: job.errorMessage,
			} : null,
			management: {
				canDelete: isProtectedMode(config),
			},
			lastArtifactCleanupReason: job.lastArtifactCleanupReason || null,
		};
	}

	function listJobs() {
		return [...jobs.values()].sort((left, right) => right.createdAt - left.createdAt);
	}

	function getJob(jobId) {
		return jobs.get(jobId) || null;
	}

	function getReusableJob(targetKey) {
		const reusableJobId = reusableJobIdByTarget.get(targetKey);
		if (!reusableJobId) {
			return null;
		}

		const job = jobs.get(reusableJobId);
		if (!job || !isArtifactAvailable(job)) {
			reusableJobIdByTarget.delete(targetKey);
			return null;
		}

		return job;
	}

	async function processJob(job) {
		job.status = "running";
		job.startedAt = Date.now();

		try {
			const outputPath = path.join(OUTPUT_DIR, buildOutputFileName(job.modelId));
			const result = await deobfuscateVRoidHubGLB(job.modelId, {
				outputPath,
				enableDebugArtifacts: config.enableDebugArtifacts,
				debugDirectoryName: job.id,
				cookie: job.vroidHubCookie,
			});

			job.status = "done";
			job.finishedAt = Date.now();
			job.outputPath = outputPath;
			job.fileName = path.basename(outputPath);
			job.sizeBytes = result.buffer.byteLength;
			job.version = result.version;
			job.timestamp = result.timestamp;
			job.vrmUrl = result.vrmUrl;
			job.expiresAt = config.unclaimedOutputRetentionMs < 0
				? null
				: job.finishedAt + config.unclaimedOutputRetentionMs;
			await writeOutputArtifactMetadata(job);

			reusableJobIdByTarget.set(job.reuseKey, job.id);
		} catch (error) {
			job.status = "error";
			job.finishedAt = Date.now();
			job.errorMessage = getErrorMessage(error, "Deobfuscation failed.");
		} finally {
			if (activeJobIdByTarget.get(job.reuseKey) === job.id) {
				activeJobIdByTarget.delete(job.reuseKey);
			}
		}
	}

	function drainQueue() {
		while (runningJobIds.size < config.maxConcurrentDownloads && pendingQueue.length > 0) {
			const nextJobId = pendingQueue.shift();
			const job = jobs.get(nextJobId);

			if (!job || job.status !== "queued") {
				continue;
			}

			runningJobIds.add(job.id);
			void processJob(job)
				.catch((error) => {
					job.status = "error";
					job.finishedAt = Date.now();
					job.errorMessage = getErrorMessage(error, "Deobfuscation failed.");
				})
				.finally(() => {
					runningJobIds.delete(job.id);
					drainQueue();
				});
		}
	}

	async function enqueue(targetInfo, { force = false, cookie = "" } = {}) {
		const normalizedCookie = normalizeVroidHubCookie(cookie);
		const targetKey = buildCookieScopedTargetKey(targetInfo.modelId, normalizedCookie);
		const activeJobId = activeJobIdByTarget.get(targetKey);
		if (activeJobId) {
			const activeJob = jobs.get(activeJobId);
			if (activeJob) {
				return { job: activeJob, reused: true, reuseReason: "already-processing" };
			}
			activeJobIdByTarget.delete(targetKey);
		}

		if (!force) {
			const reusableJob = getReusableJob(targetKey);
			if (reusableJob) {
				return { job: reusableJob, reused: true, reuseReason: "cached-output" };
			}
		}

		if (pendingQueue.length >= config.maxQueueSize) {
			throw createHttpError(503, `Queue is full. Max queued jobs: ${config.maxQueueSize}.`);
		}

		const job = {
			id: createJobId(),
			modelId: targetInfo.modelId,
			targetKey: targetInfo.modelId,
			reuseKey: targetKey,
			vroidHubCookie: normalizedCookie,
			sourceUrl: targetInfo.sourceUrl,
			status: "queued",
			createdAt: Date.now(),
			startedAt: null,
			finishedAt: null,
			outputPath: null,
			fileName: null,
			sizeBytes: null,
			version: null,
			timestamp: null,
			vrmUrl: null,
			errorMessage: null,
			downloadCount: 0,
			firstDownloadedAt: null,
			lastDownloadedAt: null,
			expiresAt: null,
			lastArtifactCleanupReason: null,
		};

		jobs.set(job.id, job);
		activeJobIdByTarget.set(job.reuseKey, job.id);
		pendingQueue.push(job.id);
		drainQueue();

		return { job, reused: false, reuseReason: null };
	}

	async function markDownloaded(job, res) {
		if (res.statusCode < 200 || res.statusCode >= 300) {
			return;
		}

		const now = Date.now();
		job.downloadCount += 1;
		job.firstDownloadedAt ||= now;
		job.lastDownloadedAt = now;

		if (config.downloadRetentionMs === 0) {
			await deleteJobArtifact(job, "deleted after successful download");
			return;
		}

		if (config.downloadRetentionMs > 0) {
			job.expiresAt = now + config.downloadRetentionMs;
			await writeOutputArtifactMetadata(job);
			return;
		}

		job.expiresAt = null;
		await writeOutputArtifactMetadata(job);
	}

	async function streamJobDownload(jobId, req, res) {
		const job = jobs.get(jobId);
		if (!job) {
			sendJson(req, res, 404, { ok: false, message: "Job not found." }, config);
			return;
		}

		if (!isArtifactAvailable(job)) {
			sendJson(req, res, 404, { ok: false, message: "Download artifact is no longer available." }, config);
			return;
		}

		setCorsHeaders(req, res, config);
		const responseHeaders = {
			"Content-Type": "application/octet-stream",
			"Content-Disposition": `attachment; filename="${job.fileName}"`,
			"Cache-Control": "no-store",
		};
		if (Number.isFinite(job.sizeBytes)) {
			responseHeaders["Content-Length"] = String(job.sizeBytes);
		}
		res.writeHead(200, responseHeaders);

		const fileStream = createReadStream(job.outputPath);
		fileStream.on("error", () => {
			if (!res.headersSent) {
				sendJson(req, res, 500, { ok: false, message: "Failed to stream the generated VRM file." }, config);
			} else {
				res.destroy();
			}
		});

		res.on("finish", () => {
			void markDownloaded(job, res);
		});

		fileStream.pipe(res);
	}

	async function removeJob(jobId) {
		const job = jobs.get(jobId);
		if (!job) {
			return { found: false, deleted: false };
		}

		if (job.status === "running") {
			throw createHttpError(409, "This job is already running and cannot be removed safely.");
		}

		if (job.status === "queued") {
			const index = pendingQueue.indexOf(job.id);
			if (index >= 0) {
				pendingQueue.splice(index, 1);
			}
		}

		if (activeJobIdByTarget.get(job.reuseKey) === job.id) {
			activeJobIdByTarget.delete(job.reuseKey);
		}

		if (reusableJobIdByTarget.get(job.reuseKey) === job.id) {
			reusableJobIdByTarget.delete(job.reuseKey);
		}

		await deleteJobArtifact(job, "job removed manually");
		jobs.delete(job.id);

		return { found: true, deleted: true };
	}

	async function cleanupExpiredData() {
		const now = Date.now();

		for (const job of [...jobs.values()]) {
			if (job.outputPath && job.expiresAt !== null && job.expiresAt <= now) {
				await deleteJobArtifact(job, "retention expired");
			}

			if (
				job.finishedAt &&
				config.jobRetentionMs >= 0 &&
				now - job.finishedAt > config.jobRetentionMs &&
				!job.outputPath &&
				job.status !== "running" &&
				job.status !== "queued"
			) {
				if (reusableJobIdByTarget.get(job.reuseKey) === job.id) {
					reusableJobIdByTarget.delete(job.reuseKey);
				}
				jobs.delete(job.id);
			}
		}

		const jobByOutputPath = new Map(
			[...jobs.values()]
				.filter((job) => typeof job.outputPath === "string" && job.outputPath)
				.map((job) => [job.outputPath, job]),
		);
		await cleanupExpiredOutputFiles(config, {
			jobByOutputPath,
			deleteTrackedJobArtifact: deleteJobArtifact,
		});
		await cleanupExpiredCacheFiles(config);
	}

	void cleanupExpiredData().catch((error) => {
		console.error("cleanupExpiredData startup error:", error);
	});

	const cleanupTimer = setInterval(() => {
		void cleanupExpiredData().catch((error) => {
			console.error("cleanupExpiredData error:", error);
		});
	}, config.cleanupIntervalMs);
	cleanupTimer.unref?.();

	function getStats() {
		return {
			totalJobs: jobs.size,
			queuedJobs: pendingQueue.length,
			runningJobs: runningJobIds.size,
			completedJobs: [...jobs.values()].filter((job) => job.status === "done").length,
			failedJobs: [...jobs.values()].filter((job) => job.status === "error").length,
		};
	}

	function close() {
		clearInterval(cleanupTimer);
	}

	return {
		enqueue,
		getJob,
		listJobs,
		serializeJob,
		streamJobDownload,
		removeJob,
		getStats,
		close,
	};
}

function createServerConfig(overrides = {}) {
	const corsOrigin = overrides.corsOrigin || DEFAULT_CORS_ORIGIN;
	const allowedOrigins = parseAllowedOrigins(corsOrigin);
	const publicBaseUrl = overrides.publicBaseUrl || DEFAULT_PUBLIC_BASE_URL;
	const sessionCookieSameSite = overrides.sessionCookieSameSite || DEFAULT_SESSION_COOKIE_SAME_SITE;
	const sessionCookieSecure = parseBooleanFlag(
		overrides.sessionCookieSecure,
		DEFAULT_SESSION_COOKIE_SECURE || /^https:\/\//i.test(publicBaseUrl || "") || String(sessionCookieSameSite).toLowerCase() === "none",
	);

	return {
		host: overrides.host || DEFAULT_HOST,
		port: ensureFiniteNumber(overrides.port, DEFAULT_PORT, { min: 1 }),
		maxConcurrentDownloads: ensureFiniteNumber(overrides.maxConcurrentDownloads, DEFAULT_MAX_CONCURRENT_DOWNLOADS, { min: 1 }),
		maxQueueSize: ensureFiniteNumber(overrides.maxQueueSize, DEFAULT_MAX_QUEUE_SIZE, { min: 1 }),
		downloadRetentionMs: ensureFiniteNumber(overrides.downloadRetentionMs, DEFAULT_DOWNLOAD_RETENTION_MS, { min: 0, allowNegativeOne: true }),
		unclaimedOutputRetentionMs: ensureFiniteNumber(overrides.unclaimedOutputRetentionMs, DEFAULT_UNCLAIMED_OUTPUT_RETENTION_MS, { min: 0, allowNegativeOne: true }),
		jobRetentionMs: ensureFiniteNumber(overrides.jobRetentionMs, DEFAULT_JOB_RETENTION_MS, { min: 0, allowNegativeOne: true }),
		cacheRetentionMs: ensureFiniteNumber(overrides.cacheRetentionMs, DEFAULT_CACHE_RETENTION_MS, { min: 0, allowNegativeOne: true }),
		cleanupIntervalMs: ensureFiniteNumber(overrides.cleanupIntervalMs, DEFAULT_CLEANUP_INTERVAL_MS, { min: 1000 }),
		corsOrigin,
		allowedOrigins,
		authMode: allowedOrigins.length > 0 ? "protected" : "public",
		publicBaseUrl,
		sessionCookieName: overrides.sessionCookieName || DEFAULT_SESSION_COOKIE_NAME,
		sessionTtlMs: ensureFiniteNumber(overrides.sessionTtlMs, DEFAULT_SESSION_TTL_MS, { min: 60 * 1000 }),
		maxSessionModels: ensureFiniteNumber(overrides.maxSessionModels, DEFAULT_MAX_SESSION_MODELS, { min: 1 }),
		maxSessionJobs: ensureFiniteNumber(overrides.maxSessionJobs, DEFAULT_MAX_SESSION_JOBS, { min: 1 }),
		sessionCookieSameSite,
		sessionCookieSecure,
		sessionJwtSecret: overrides.sessionJwtSecret || SESSION_JWT_SECRET,
		enableDebugArtifacts: parseBooleanFlag(overrides.enableDebugArtifacts, ENABLE_DEBUG_ARTIFACTS),
	};
}

function parseCliArguments(argv) {
	const options = {
		server: false,
		help: false,
		host: DEFAULT_HOST,
		port: DEFAULT_PORT,
		maxConcurrentDownloads: DEFAULT_MAX_CONCURRENT_DOWNLOADS,
		maxQueueSize: DEFAULT_MAX_QUEUE_SIZE,
		downloadRetentionMs: DEFAULT_DOWNLOAD_RETENTION_MS,
		unclaimedOutputRetentionMs: DEFAULT_UNCLAIMED_OUTPUT_RETENTION_MS,
		jobRetentionMs: DEFAULT_JOB_RETENTION_MS,
		cacheRetentionMs: DEFAULT_CACHE_RETENTION_MS,
		cleanupIntervalMs: DEFAULT_CLEANUP_INTERVAL_MS,
		corsOrigin: DEFAULT_CORS_ORIGIN,
		publicBaseUrl: DEFAULT_PUBLIC_BASE_URL,
		sessionCookieName: DEFAULT_SESSION_COOKIE_NAME,
		sessionTtlMs: DEFAULT_SESSION_TTL_MS,
		maxSessionModels: DEFAULT_MAX_SESSION_MODELS,
		maxSessionJobs: DEFAULT_MAX_SESSION_JOBS,
		sessionCookieSameSite: DEFAULT_SESSION_COOKIE_SAME_SITE,
		sessionCookieSecure: DEFAULT_SESSION_COOKIE_SECURE,
		sessionJwtSecret: SESSION_JWT_SECRET,
		enableDebugArtifacts: ENABLE_DEBUG_ARTIFACTS,
		target: null,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const current = argv[index];
		const next = argv[index + 1];

		switch (current) {
			case "--server":
			case "serve":
				options.server = true;
				break;
			case "--help":
			case "-h":
				options.help = true;
				break;
			case "--host":
				options.host = next;
				index += 1;
				break;
			case "--port":
				options.port = next;
				index += 1;
				break;
			case "--max-concurrent":
				options.maxConcurrentDownloads = next;
				index += 1;
				break;
			case "--max-queue-size":
				options.maxQueueSize = next;
				index += 1;
				break;
			case "--download-retention-ms":
				options.downloadRetentionMs = next;
				index += 1;
				break;
			case "--unclaimed-output-retention-ms":
				options.unclaimedOutputRetentionMs = next;
				index += 1;
				break;
			case "--job-retention-ms":
				options.jobRetentionMs = next;
				index += 1;
				break;
			case "--cache-retention-ms":
				options.cacheRetentionMs = next;
				index += 1;
				break;
			case "--cleanup-interval-ms":
				options.cleanupIntervalMs = next;
				index += 1;
				break;
			case "--cors-origin":
				options.corsOrigin = next;
				index += 1;
				break;
			case "--public-base-url":
				options.publicBaseUrl = next;
				index += 1;
				break;
			case "--session-cookie-name":
				options.sessionCookieName = next;
				index += 1;
				break;
			case "--session-ttl-ms":
				options.sessionTtlMs = next;
				index += 1;
				break;
			case "--session-cookie-same-site":
				options.sessionCookieSameSite = next;
				index += 1;
				break;
			case "--session-cookie-secure":
				options.sessionCookieSecure = true;
				break;
			case "--no-session-cookie-secure":
				options.sessionCookieSecure = false;
				break;
			case "--keep-forever":
				options.downloadRetentionMs = -1;
				break;
			case "--delete-after-download":
				options.downloadRetentionMs = 0;
				break;
			case "--debug-artifacts":
				options.enableDebugArtifacts = true;
				break;
			case "--no-debug-artifacts":
				options.enableDebugArtifacts = false;
				break;
			default:
				if (current.startsWith("--host=")) {
					options.host = current.slice("--host=".length);
				} else if (current.startsWith("--port=")) {
					options.port = current.slice("--port=".length);
				} else if (current.startsWith("--max-concurrent=")) {
					options.maxConcurrentDownloads = current.slice("--max-concurrent=".length);
				} else if (current.startsWith("--max-queue-size=")) {
					options.maxQueueSize = current.slice("--max-queue-size=".length);
				} else if (current.startsWith("--download-retention-ms=")) {
					options.downloadRetentionMs = current.slice("--download-retention-ms=".length);
				} else if (current.startsWith("--unclaimed-output-retention-ms=")) {
					options.unclaimedOutputRetentionMs = current.slice("--unclaimed-output-retention-ms=".length);
				} else if (current.startsWith("--job-retention-ms=")) {
					options.jobRetentionMs = current.slice("--job-retention-ms=".length);
				} else if (current.startsWith("--cache-retention-ms=")) {
					options.cacheRetentionMs = current.slice("--cache-retention-ms=".length);
				} else if (current.startsWith("--cleanup-interval-ms=")) {
					options.cleanupIntervalMs = current.slice("--cleanup-interval-ms=".length);
				} else if (current.startsWith("--cors-origin=")) {
					options.corsOrigin = current.slice("--cors-origin=".length);
				} else if (current.startsWith("--public-base-url=")) {
					options.publicBaseUrl = current.slice("--public-base-url=".length);
				} else if (current.startsWith("--session-cookie-name=")) {
					options.sessionCookieName = current.slice("--session-cookie-name=".length);
				} else if (current.startsWith("--session-ttl-ms=")) {
					options.sessionTtlMs = current.slice("--session-ttl-ms=".length);
				} else if (current.startsWith("--session-cookie-same-site=")) {
					options.sessionCookieSameSite = current.slice("--session-cookie-same-site=".length);
				} else if (!current.startsWith("-") && !options.target) {
					options.target = current;
				}
				break;
		}
	}

	return {
		server: options.server,
		help: options.help,
		target: options.target,
		config: createServerConfig(options),
	};
}

function printUsage() {
	console.log(`
Usage:
  node index.js <VRoid-Hub-URL-or-model-id>
  node index.js --server [options]

Server options:
  --host <host>                           Host to bind. Default: ${DEFAULT_HOST}
  --port <port>                           Port to bind. Default: ${DEFAULT_PORT}
  --max-concurrent <count>                Max concurrent downloads. Default: ${DEFAULT_MAX_CONCURRENT_DOWNLOADS}
  --max-queue-size <count>                Max queued jobs. Default: ${DEFAULT_MAX_QUEUE_SIZE}
  --download-retention-ms <ms>            Keep file after successful download. -1 keeps forever, 0 deletes immediately after first successful download.
  --unclaimed-output-retention-ms <ms>    Keep finished files that nobody downloads yet. -1 keeps forever.
  --job-retention-ms <ms>                 Keep finished job metadata after artifact cleanup. -1 keeps forever.
  --cache-retention-ms <ms>               Keep files in cache/. -1 keeps forever, 0 removes them on the next cleanup sweep. Default: ${DEFAULT_CACHE_RETENTION_MS}
  --cleanup-interval-ms <ms>              Cleanup sweep interval. Default: ${DEFAULT_CLEANUP_INTERVAL_MS}
  --cors-origin <origin>                  CORS origin. Default: ${DEFAULT_CORS_ORIGIN}
  --public-base-url <url>                 Override public base URL in API responses.
  --session-cookie-name <name>            Cookie name for protected mode. Default: ${DEFAULT_SESSION_COOKIE_NAME}
  --session-ttl-ms <ms>                   Session cookie TTL. Default: ${DEFAULT_SESSION_TTL_MS}
  --session-cookie-same-site <value>      Cookie SameSite. Default: ${DEFAULT_SESSION_COOKIE_SAME_SITE}
  --session-cookie-secure                 Force Secure cookies in protected mode.
  --keep-forever                          Same as --download-retention-ms -1
  --delete-after-download                 Same as --download-retention-ms 0
  --debug-artifacts / --no-debug-artifacts

HTTP API:
  POST   /api/deobfuscate                 Body: { "url": "...", "force": false, "cookie": "optional" }
  GET    /api/jobs                        List tracked jobs (protected mode only)
  GET    /api/jobs/:id                    Inspect one job
  GET    /api/jobs/:id/download           Download generated VRM
  DELETE /api/jobs/:id                    Remove queued/finished job and artifact (protected mode only)
  GET    /api/health                      Health + queue stats
  GET    /api/config                      Active service config
`);
}

function startServer(config) {
	const jobManager = createJobManager(config);

	const server = http.createServer(async (req, res) => {
		const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
		const pathname = requestUrl.pathname;

		if (req.method === "OPTIONS") {
			setCorsHeaders(req, res, config);
			res.writeHead(204);
			res.end();
			return;
		}

		if (pathname === "/favicon.ico") {
			res.writeHead(204);
			res.end();
			return;
		}

		try {
			if (req.method === "GET" && pathname === "/") {
				const endpoints = {
					createJob: "POST /api/deobfuscate",
					getJob: "GET /api/jobs/:id",
					downloadJobFile: "GET /api/jobs/:id/download",
					health: "GET /api/health",
				};

				if (isProtectedMode(config)) {
					endpoints.listJobs = "GET /api/jobs";
					endpoints.deleteJob = "DELETE /api/jobs/:id";
					endpoints.config = "GET /api/config";
				}

				sendJson(req, res, 200, {
					ok: true,
					service: "VRoid Hub deobfuscation API",
					config: serializeConfig(config),
					stats: jobManager.getStats(),
					endpoints,
				}, config);
				return;
			}

			if (req.method === "GET" && pathname === "/api/health") {
				sendJson(req, res, 200, {
					ok: true,
					config: serializeConfig(config),
					stats: jobManager.getStats(),
				}, config);
				return;
			}

			if (req.method === "GET" && pathname === "/api/config") {
				if (!isProtectedMode(config)) {
					throw createHttpError(403, "This endpoint is disabled in public mode.");
				}

				const sessionState = getSessionStateFromRequest(req, config, { allowMissingOrigin: true });
				setSessionCookie(res, sessionState, config);
				sendJson(req, res, 200, {
					ok: true,
					config: serializeConfig(config),
				}, config);
				return;
			}

			if (req.method === "GET" && pathname === "/api/jobs") {
				if (!isProtectedMode(config)) {
					throw createHttpError(403, "This endpoint is disabled in public mode.");
				}

				const sessionState = getSessionStateFromRequest(req, config, { allowMissingOrigin: true });
				setSessionCookie(res, sessionState, config);
				const visibleJobs = jobManager
					.listJobs()
					.filter((job) => {
						try {
							assertSessionCanAccessJob(sessionState, job);
							return true;
						} catch {
							return false;
						}
					})
					.map((job) => jobManager.serializeJob(job, req));
				sendJson(req, res, 200, {
					ok: true,
					jobs: visibleJobs,
				}, config);
				return;
			}

			const downloadMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/download$/);
			if (req.method === "GET" && downloadMatch?.[1]) {
				const jobId = decodeURIComponent(downloadMatch[1]);
				const job = jobManager.getJob(jobId);
				if (!job) {
					sendJson(req, res, 404, { ok: false, message: "Job not found." }, config);
					return;
				}

				if (isProtectedMode(config)) {
					const sessionState = getSessionStateFromRequest(req, config, { allowMissingOrigin: true });
					assertSessionCanAccessJob(sessionState, job);
					setSessionCookie(res, sessionState, config);
				}

				await jobManager.streamJobDownload(jobId, req, res);
				return;
			}

			const jobMatch = pathname.match(/^\/api\/jobs\/([^/]+)$/);
			if (jobMatch?.[1]) {
				const jobId = decodeURIComponent(jobMatch[1]);

				if (req.method === "GET") {
					const job = jobManager.getJob(jobId);
					if (!job) {
						sendJson(req, res, 404, { ok: false, message: "Job not found." }, config);
						return;
					}

					if (isProtectedMode(config)) {
						const sessionState = getSessionStateFromRequest(req, config, { allowMissingOrigin: true });
						assertSessionCanAccessJob(sessionState, job);
						setSessionCookie(res, sessionState, config);
					}

					sendJson(req, res, 200, {
						ok: true,
						job: jobManager.serializeJob(job, req),
					}, config);
					return;
				}

				if (req.method === "DELETE") {
					if (!isProtectedMode(config)) {
						throw createHttpError(403, "DELETE is disabled in public mode.");
					}

					const job = jobManager.getJob(jobId);
					if (!job) {
						sendJson(req, res, 404, { ok: false, message: "Job not found." }, config);
						return;
					}

					const sessionState = getSessionStateFromRequest(req, config, { allowMissingOrigin: true });
					assertSessionCanAccessJob(sessionState, job);
					const result = await jobManager.removeJob(jobId);
					if (!result.found) {
						sendJson(req, res, 404, { ok: false, message: "Job not found." }, config);
						return;
					}

					setSessionCookie(res, sessionState, config);
					sendJson(req, res, 200, {
						ok: true,
						message: "Job removed successfully.",
					}, config);
					return;
				}
			}

			if (req.method === "POST" && pathname === "/api/deobfuscate") {
				let sessionState = null;
				if (isProtectedMode(config)) {
					sessionState = getSessionStateFromRequest(req, config, { createIfMissing: true, allowMissingOrigin: true });
				}

				const body = await readJsonBody(req);
				const rawTarget = body.url ?? body.target ?? body.id;
				if (!rawTarget) {
					throw createHttpError(400, 'Request body must include "url", "target", or "id".');
				}

				const targetInfo = normalizeModelId(rawTarget);
				const force = parseBooleanFlag(body.force, false);
				const cookie = normalizeVroidHubCookie(body.cookie);
				const { job, reused, reuseReason } = await jobManager.enqueue(targetInfo, { force, cookie });
				const statusCode = reused && job.status === "done" ? 200 : 202;

				if (sessionState) {
					rememberJobInSession(sessionState, job, config);
					setSessionCookie(res, sessionState, config);
				}

				sendJson(req, res, statusCode, {
					ok: true,
					reused,
					reuseReason,
					job: jobManager.serializeJob(job, req),
				}, config);
				return;
			}

			sendJson(req, res, 404, { ok: false, message: "Route not found." }, config);
		} catch (error) {
			const statusCode = getErrorStatusCode(error);
			sendJson(req, res, statusCode, {
				ok: false,
				message: getErrorMessage(error),
			}, config);
		}
	});

	server.listen(config.port, config.host, () => {
		const publicBaseUrl = config.publicBaseUrl || `http://${config.host}:${config.port}`;
		console.log(`VRoid Hub download API ready: ${publicBaseUrl}`);
		console.log(`Auth mode: ${config.authMode}`);
		console.log(`Max concurrent downloads: ${config.maxConcurrentDownloads}`);
		console.log(`Download retention ms: ${config.downloadRetentionMs}`);
		console.log(`Unclaimed output retention ms: ${config.unclaimedOutputRetentionMs}`);
		console.log(`Cache retention ms: ${config.cacheRetentionMs}`);
	});

	server.on("close", () => {
		jobManager.close();
	});

	return server;
}

async function runCliDownload(target, config) {
	const targetInfo = normalizeModelId(target);
	const outputPath = path.join(OUTPUT_DIR, buildOutputFileName(targetInfo.modelId));
	const result = await deobfuscateVRoidHubGLB(targetInfo, {
		outputPath,
		enableDebugArtifacts: config.enableDebugArtifacts,
		debugDirectoryName: `cli-${targetInfo.modelId}`,
	});

	console.log(`Saved deobfuscated VRM to: ${outputPath}`);
	return result;
}

async function main() {
	const parsedCli = parseCliArguments(process.argv.slice(2));
	await ensureRuntimeDirectories();
	await cleanupExpiredOutputFiles(parsedCli.config);
	await cleanupExpiredCacheFiles(parsedCli.config);

	if (parsedCli.help) {
		printUsage();
		return;
	}

	if (parsedCli.server) {
		startServer(parsedCli.config);
		return;
	}

	if (!parsedCli.target) {
		printUsage();
		throw new Error("A VRoid Hub model URL or numeric model ID is required.");
	}

	await runCliDownload(parsedCli.target, parsedCli.config);
}

main().catch((error) => {
	console.error(getErrorMessage(error));
	if (error instanceof Error && error.stack) {
		console.error(error.stack);
	}
	process.exitCode = 1;
});
