import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
} from 'https://cdn.jsdelivr.net/npm/@pixiv/three-vrm-animation@3/lib/three-vrm-animation.module.js';

const SAMPLE_MODEL_URL = './models/Firefly.vrm';
const BUNDLED_VRM_ANIMATIONS = Object.freeze({
  appearing: {
    label: 'APPEARING',
    url: './assets/appearing-JPRXVVPX.vrma',
  },
  liked: {
    label: 'LIKED',
    url: './assets/liked-QPZJXMIS.vrma',
  },
  waiting: {
    label: 'WAITING',
    url: './assets/waiting-4DOXHN5U.vrma',
  },
});
const BACKEND_BASE = window.location.origin;
const TRANSLATIONS = {
  en: {
    app: {
      title: 'VRM Viewer Next',
    },
    panel: {
      default: 'Panel',
      emotion: 'Emotion',
      face: 'Face',
      pose: 'Pose',
      model: 'Model',
      download: 'Download',
      option: 'Option',
    },
    menu: {
      main: 'Main menu',
    },
    aria: {
      takePhoto: 'Take photo',
      showModelInfo: 'Show model info',
      openGithub: 'Open GitHub',
      hideInterface: 'Hide interface',
      showInterface: 'Show interface',
    },
    field: {
      status: 'Status',
      title: 'Title',
      author: 'Author',
      version: 'Format',
      avatarPermission: 'Avatar Permission',
      violentUsage: 'Violence',
      sexualUsage: 'Sexual',
      commercialUsage: 'Commercial',
      creditNotation: 'Credit Notation',
      redistribution: 'Redistribution',
      modification: 'Modification',
      contact: 'Contact',
      reference: 'Reference',
      license: 'License',
      otherPermissionUrl: 'Other Permission URL',
      otherLicenseUrl: 'Other License URL',
    },
    emotion: {
      joy: 'Joy',
      angry: 'Angry',
      sorrow: 'Sorrow',
      fun: 'Fun',
    },
    face: {
      lookAtCamera: 'Look At Camera',
      autoBlink: 'Auto Blink',
      blink: 'Blink',
      blinkRight: 'Blink R',
      blinkLeft: 'Blink L',
      aa: 'A',
      ih: 'I',
      ou: 'U',
      ee: 'E',
      oh: 'O',
    },
    pose: {
      placeholder: 'Enter pose name...',
      save: 'Save pose',
      editBones: 'Edit bones',
      moveModel: 'Move model',
      closeEditor: 'Close pose editor',
      add: 'Add pose',
      clear: 'Clear Pose',
      edit: 'Edit pose',
      delete: 'Delete pose',
      customDefaultName: 'Custom Pose',
      builtin: {
        tStance: 'T-Stance',
        aStance: 'A-Stance',
        modelStand: 'Model Stand',
        doublePeace: 'Double Peace',
      },
    },
    model: {
      selectFile: 'Select VRM File',
      showDefaultModel: 'Show Default Model',
    },
    download: {
      copy: 'Paste a hub.vroid.com link. The local backend will deobfuscate it, then this viewer will preview and expose the VRM file.',
      placeholder: 'https://hub.vroid.com/characters/...',
      fetch: 'Fetch VRM',
      noticeTitle: 'Download Notice',
      noticeBody: "Downloaded models are for educational and research use only! Please delete it in time after research! \nPlease be sure to respect the original author's copyright, terms of use, signature requirements, and restrictions on redistribution, modification, etc.! \nPlease do not use the model for infringing, illegal or harmful purposes!",
      noticeAgree: 'Agree',
      noticeReject: 'Decline',
      noticeDeclined: 'Download cancelled!',
      waiting: 'Waiting for a VRoid Hub link.',
      generatedModel: 'Generated model',
      preview: 'Preview',
      downloadVrm: 'Download VRM',
      working: 'Working...',
      submitting: 'Submitting request to local backend...',
      ready: 'VRM is ready. You can preview it or download the file.',
      processing: 'Backend is processing the model...',
    },
    option: {
      idleMotion: 'Idle Motion',
      grid: 'Grid',
      axis: 'XYZ Axis',
      resetCamera: 'Reset Camera',
    },
    drop: {
      title: 'Drop a VRM file here',
      subtitle: 'The new viewer already supports VRM 0.x and VRM 1.0 loading.',
    },
    status: {
      ready: 'Ready',
      loading: 'Loading {label}...',
      loadingProgress: 'Loading {label}... {percent}%',
      loaded: 'Loaded: {label}',
    },
    label: {
      sampleModel: 'sample model',
      downloadedModel: 'downloaded model',
    },
    error: {
      invalidUrl: 'Please enter a valid URL.',
      useHubLink: 'Please use a hub.vroid.com link.',
      invalidHubPage: 'The URL does not look like a VRoid Hub model page.',
      pollFailed: 'Polling the backend job failed.',
      backendJobFailed: 'The backend job failed.',
      timeout: 'Timed out while waiting for the backend response.',
      backendRequestFailed: 'Backend request failed.',
      noVrmExtension: 'Opened as glTF, but no VRM extension was recognized.',
    },
    meta: {
      allowed: 'Allowed',
      disallowed: 'Disallowed',
      onlyAuthor: 'Only Author',
      licensedPersonOnly: 'Licensed Person Only',
      everyone: 'Everyone',
      personalNonProfit: 'Personal / Non-Profit',
      personalProfit: 'Personal / Profit',
      corporation: 'Corporation',
      required: 'Required',
      notRequired: 'Not Required',
      allowedWithRedistribution: 'Allowed with Redistribution',
      prohibited: 'Prohibited',
      unknownVersion: 'Unknown',
    },
  },
  zh: {
    app: {
      title: 'VRM Viewer Next',
    },
    panel: {
      default: '面板',
      emotion: '情绪',
      face: '面部',
      pose: '姿势',
      model: '模型',
      download: '下载',
      option: '选项',
    },
    menu: {
      main: '主菜单',
    },
    aria: {
      openGithub: '打开 GitHub 页面',
      takePhoto: '拍照',
      showModelInfo: '查看模型信息',
      hideInterface: '隐藏界面',
      showInterface: '显示界面',
    },
    field: {
      status: '状态',
      title: '标题',
      author: '作者',
      version: '格式',
      avatarPermission: '角色使用权限',
      violentUsage: '暴力表现',
      sexualUsage: '性表现',
      commercialUsage: '商用',
      creditNotation: '署名标注',
      redistribution: '再分发',
      modification: '修改',
      contact: '联系方式',
      reference: '参考链接',
      license: '许可证',
      otherPermissionUrl: '其他权限链接',
      otherLicenseUrl: '其他许可证链接',
    },
    emotion: {
      joy: '开心',
      angry: '生气',
      sorrow: '悲伤',
      fun: '愉快',
    },
    face: {
      lookAtCamera: '视线跟随镜头',
      autoBlink: '自动眨眼',
      blink: '眨眼',
      blinkRight: '右眼',
      blinkLeft: '左眼',
      aa: 'A',
      ih: 'I',
      ou: 'U',
      ee: 'E',
      oh: 'O',
    },
    pose: {
      placeholder: '输入姿势名称...',
      save: '保存姿势',
      editBones: '编辑骨骼',
      moveModel: '移动模型',
      closeEditor: '关闭姿势编辑',
      add: '新增姿势',
      clear: '取消姿势',
      edit: '编辑姿势',
      delete: '删除姿势',
      customDefaultName: '自定义姿势',
      builtin: {
        tStance: 'T姿势',
        aStance: 'A姿势',
        modelStand: '模特站姿',
        doublePeace: '双手比耶',
      },
    },
    model: {
      selectFile: '选择 VRM 文件',
      showDefaultModel: '显示默认模型',
    },
    download: {
      copy: '粘贴 hub.vroid.com 链接。本地后端会先解混淆，然后本查看器会直接预览并提供 VRM 文件。',
      placeholder: 'https://hub.vroid.com/characters/...',
      fetch: '获取 VRM',
      noticeTitle: '下载提示',
      noticeBody: '下载的模型仅限用于教育与研究用途！请您在研究后及时删除！\n请务必尊重原作者的版权、使用条款、署名要求，以及对再分发、修改等方面的限制！\n请勿将模型用于侵权、违法或有害用途！',
      noticeAgree: '同意',
      noticeReject: '拒绝',
      noticeDeclined: '已取消下载！',
      waiting: '等待输入 VRoid Hub 链接。',
      generatedModel: '已生成模型',
      preview: '预览',
      downloadVrm: '下载 VRM',
      working: '处理中...',
      submitting: '正在提交到本地后端...',
      ready: 'VRM 已就绪，你可以预览或下载文件。',
      processing: '后端正在处理模型...',
    },
    option: {
      idleMotion: '待机动作',
      grid: '网格',
      axis: 'XYZ 坐标轴',
      resetCamera: '重置镜头',
    },
    drop: {
      title: '将 VRM 文件拖到这里',
      subtitle: '新版查看器已支持加载 VRM 0.x 和 VRM 1.0。',
    },
    status: {
      ready: '就绪',
      loading: '正在加载 {label}...',
      loadingProgress: '正在加载 {label}... {percent}%',
      loaded: '已加载：{label}',
    },
    label: {
      sampleModel: '默认模型',
      downloadedModel: '已下载模型',
    },
    error: {
      invalidUrl: '请输入有效的 URL。',
      useHubLink: '请使用 hub.vroid.com 链接。',
      invalidHubPage: '这个链接看起来不是 VRoid Hub 模型页面。',
      pollFailed: '轮询后端任务失败。',
      backendJobFailed: '后端任务执行失败。',
      timeout: '等待后端响应超时。',
      backendRequestFailed: '后端请求失败。',
      noVrmExtension: '文件被识别为 glTF，但没有检测到 VRM 扩展。',
    },
    meta: {
      allowed: '允许',
      disallowed: '不允许',
      onlyAuthor: '仅作者本人',
      licensedPersonOnly: '仅授权用户',
      everyone: '所有人',
      personalNonProfit: '个人 / 非营利',
      personalProfit: '个人 / 营利',
      corporation: '法人',
      required: '必须',
      notRequired: '无需',
      allowedWithRedistribution: '允许再分发',
      prohibited: '禁止',
      unknownVersion: '未知',
    },
  },
  ja: {
    app: {
      title: 'VRM Viewer Next',
    },
    panel: {
      default: 'パネル',
      emotion: '感情',
      face: '表情',
      pose: 'ポーズ',
      model: 'モデル',
      download: 'ダウンロード',
      option: 'オプション',
    },
    menu: {
      main: 'メインメニュー',
    },
    aria: {
      openGithub: 'GitHubページを開く',
      takePhoto: '撮影',
      showModelInfo: 'モデル情報を表示',
      hideInterface: 'UI を非表示',
      showInterface: 'UI を表示',
    },
    field: {
      status: '状態',
      title: 'タイトル',
      author: '作者',
      version: 'フォーマット',
      avatarPermission: 'アバター利用許可',
      violentUsage: '暴力表現',
      sexualUsage: '性的表現',
      commercialUsage: '商用',
      creditNotation: 'クレジット表記',
      redistribution: '再配布',
      modification: '改変',
      contact: '連絡先',
      reference: '参考',
      license: 'ライセンス',
      otherPermissionUrl: 'その他の許可 URL',
      otherLicenseUrl: 'その他のライセンス URL',
    },
    emotion: {
      joy: '喜び',
      angry: '怒り',
      sorrow: '悲しみ',
      fun: '楽しさ',
    },
    face: {
      lookAtCamera: 'カメラを見る',
      autoBlink: '自動まばたき',
      blink: 'まばたき',
      blinkRight: '右目',
      blinkLeft: '左目',
      aa: 'A',
      ih: 'I',
      ou: 'U',
      ee: 'E',
      oh: 'O',
    },
    pose: {
      placeholder: 'ポーズ名を入力...',
      save: 'ポーズを保存',
      editBones: 'ボーンを編集',
      moveModel: 'モデルを移動',
      closeEditor: 'ポーズ編集を閉じる',
      add: 'ポーズを追加',
      clear: 'ポーズを解除',
      edit: 'ポーズを編集',
      delete: 'ポーズを削除',
      customDefaultName: 'カスタムポーズ',
      builtin: {
        tStance: 'Tスタンス',
        aStance: 'Aスタンス',
        modelStand: 'モデル立ち',
        doublePeace: 'ダブルピース',
      },
    },
    model: {
      selectFile: 'VRM ファイルを選択',
      showDefaultModel: 'デフォルトモデルを表示',
    },
    download: {
      copy: 'hub.vroid.com のリンクを貼り付けてください。ローカルバックエンドが難読化を解除し、このビューアーで VRM をプレビューして取得できます。',
      placeholder: 'https://hub.vroid.com/characters/...',
      fetch: 'VRM を取得',
      noticeTitle: 'ダウンロードの確認',
      noticeBody: 'ダウンロードしたモデルは教育および研究目的のみに使用してください！研究後、時間内に削除してください！ \nオリジナル作者の著作権、利用規約、署名要件、再配布や改変などの制限を必ず尊重してください！ \n侵害、違法、または有害な目的でモデルを使用しないでください！',
      noticeAgree: '同意する',
      noticeReject: '拒否する',
      noticeDeclined: 'ダウンロードをキャンセルしました！',
      waiting: 'VRoid Hub のリンクを待機しています。',
      generatedModel: '生成されたモデル',
      preview: 'プレビュー',
      downloadVrm: 'VRM をダウンロード',
      working: '処理中...',
      submitting: 'ローカルバックエンドへ送信しています...',
      ready: 'VRM の準備ができました。プレビューまたはダウンロードできます。',
      processing: 'バックエンドがモデルを処理しています...',
    },
    option: {
      idleMotion: '待機モーション',
      grid: 'グリッド',
      axis: 'XYZ 軸',
      resetCamera: 'カメラをリセット',
    },
    drop: {
      title: 'ここに VRM ファイルをドロップ',
      subtitle: '新しいビューアーは VRM 0.x と VRM 1.0 の読み込みに対応しています。',
    },
    status: {
      ready: '準備完了',
      loading: '{label} を読み込み中...',
      loadingProgress: '{label} を読み込み中... {percent}%',
      loaded: '読み込み完了: {label}',
    },
    label: {
      sampleModel: 'デフォルトモデル',
      downloadedModel: 'ダウンロード済みモデル',
    },
    error: {
      invalidUrl: '有効な URL を入力してください。',
      useHubLink: 'hub.vroid.com のリンクを使用してください。',
      invalidHubPage: 'この URL は VRoid Hub のモデルページではないようです。',
      pollFailed: 'バックエンドジョブの確認に失敗しました。',
      backendJobFailed: 'バックエンドジョブが失敗しました。',
      timeout: 'バックエンドの応答待ちがタイムアウトしました。',
      backendRequestFailed: 'バックエンドリクエストに失敗しました。',
      noVrmExtension: 'glTF として開かれましたが、VRM 拡張が見つかりませんでした。',
    },
    meta: {
      allowed: '許可',
      disallowed: '禁止',
      onlyAuthor: '作者のみ',
      licensedPersonOnly: '許可された利用者のみ',
      everyone: '誰でも可',
      personalNonProfit: '個人 / 非営利',
      personalProfit: '個人 / 営利',
      corporation: '法人',
      required: '必要',
      notRequired: '不要',
      allowedWithRedistribution: '再配布付きで許可',
      prohibited: '禁止',
      unknownVersion: '不明',
    },
  },
};
const HTML_LANG_BY_LOCALE = {
  en: 'en',
  zh: 'zh-CN',
  ja: 'ja',
};

function getTranslationValue(locale, key) {
  return key.split('.').reduce((value, segment) => value?.[segment], TRANSLATIONS[locale]);
}

function detectPreferredLocale() {
  const languages = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language || 'en'];

  for (const language of languages) {
    const normalized = String(language).toLowerCase();
    if (normalized.startsWith('zh')) {
      return 'zh';
    }
    if (normalized.startsWith('ja')) {
      return 'ja';
    }
    if (normalized.startsWith('en')) {
      return 'en';
    }
  }

  return 'en';
}

let currentLocale = detectPreferredLocale();

function t(key, vars = {}) {
  let value = getTranslationValue(currentLocale, key) ?? getTranslationValue('en', key) ?? key;
  value = String(value);
  return value.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}

function applyStaticTranslations() {
  document.documentElement.lang = HTML_LANG_BY_LOCALE[currentLocale] || 'en';
  document.title = t('app.title');

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.setAttribute('placeholder', t(node.dataset.i18nPlaceholder));
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
    node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel));
  });
}

function getLocalizedModelLabel(label) {
  const normalized = String(label || '').toLowerCase();
  if (normalized === 'sample model') {
    return t('label.sampleModel');
  }
  if (normalized === 'downloaded model') {
    return t('label.downloadedModel');
  }
  return label;
}

function formatLoadingStatus(label, progress = null) {
  const localizedLabel = getLocalizedModelLabel(label);
  if (typeof progress === 'number') {
    return t('status.loadingProgress', {
      label: localizedLabel,
      percent: Math.round(progress * 100),
    });
  }
  return t('status.loading', { label: localizedLabel });
}

function formatLoadedStatus(label, resolvedTitle) {
  return t('status.loaded', {
    label: resolvedTitle !== '-' ? resolvedTitle : getLocalizedModelLabel(label),
  });
}

function isIdleMotionActive() {
  return Boolean(idleMotionEnabled && idleMotionToggle?.checked);
}

function syncPhotoCaptureButtonState() {
  if (!photoCaptureButton) {
    return;
  }

  photoCaptureButton.disabled = photoCaptureInProgress || !currentVrm;
}

function createPhotoFileName() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `vrm-photo-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;
}

function downloadDataUrl(dataUrl, fileName) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

const stageShell = document.querySelector('.stage-shell');
const viewport = document.getElementById('viewport');
const dropZone = document.getElementById('drop-zone');
const menuDock = document.querySelector('.menu-dock');

const panelCard = document.getElementById('panel-card');
const panelTitle = document.getElementById('panel-title');
const photoCaptureButton = document.getElementById('photo-capture-button');
const infoToggleButton = document.getElementById('info-toggle-button');
const chromeToggleButton = document.getElementById('chrome-toggle-button');
const infoCard = document.getElementById('info-card');
const downloadConsentDialog = document.getElementById('download-consent-dialog');
const downloadConsentAgreeButton = document.getElementById('download-consent-agree-button');
const downloadConsentRejectButton = document.getElementById('download-consent-reject-button');

const fileInput = document.getElementById('file-input');
const loadSampleButton = document.getElementById('load-sample-button');
const resetCameraButton = document.getElementById('reset-camera-button');

const modelFieldNodes = Array.from(document.querySelectorAll('[data-model-field]'));

const downloadForm = document.getElementById('download-form');
const downloadUrlInput = document.getElementById('download-url-input');
const downloadSubmitButton = document.getElementById('download-submit-button');
const downloadStatus = document.getElementById('download-status');
const downloadResult = document.getElementById('download-result');
const downloadResultUrl = document.getElementById('download-result-url');
const downloadPreviewButton = document.getElementById('download-preview-button');
const downloadFileLink = document.getElementById('download-file-link');

const lookAtToggle = document.getElementById('face-look-at-toggle');
const autoBlinkToggle = document.getElementById('face-auto-blink-toggle');
const idleMotionToggle = document.getElementById('option-idle-toggle');
const gridToggle = document.getElementById('option-grid-toggle');
const axisToggle = document.getElementById('option-axis-toggle');

const poseList = document.getElementById('pose-list');
const poseEditorShell = document.getElementById('pose-editor-shell');
const poseAddShell = document.getElementById('pose-add-shell');
const poseNameInput = document.getElementById('pose-name-input');
const poseAddButton = document.getElementById('pose-add-button');
const poseSaveButton = document.getElementById('pose-save-button');
const poseBoneButton = document.getElementById('pose-bone-button');
const poseMoveButton = document.getElementById('pose-move-button');
const poseCloseEditButton = document.getElementById('pose-close-edit-button');

const menuButtons = Array.from(document.querySelectorAll('.menu-item'));
const panelViews = Array.from(document.querySelectorAll('.panel-view'));

const CUSTOM_POSES_STORAGE_KEY = 'vrm-viewer-next-custom-poses-v3';
const EDITABLE_BONE_NAMES = [
  'hips',
  'spine',
  'chest',
  'upperChest',
  'neck',
  'head',
  'leftShoulder',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'leftThumbMetacarpal',
  'leftThumbProximal',
  'leftThumbDistal',
  'leftIndexProximal',
  'leftIndexIntermediate',
  'leftIndexDistal',
  'leftMiddleProximal',
  'leftMiddleIntermediate',
  'leftMiddleDistal',
  'leftRingProximal',
  'leftRingIntermediate',
  'leftRingDistal',
  'leftLittleProximal',
  'leftLittleIntermediate',
  'leftLittleDistal',
  'rightShoulder',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'rightThumbMetacarpal',
  'rightThumbProximal',
  'rightThumbDistal',
  'rightIndexProximal',
  'rightIndexIntermediate',
  'rightIndexDistal',
  'rightMiddleProximal',
  'rightMiddleIntermediate',
  'rightMiddleDistal',
  'rightRingProximal',
  'rightRingIntermediate',
  'rightRingDistal',
  'rightLittleProximal',
  'rightLittleIntermediate',
  'rightLittleDistal',
  'leftUpperLeg',
  'leftLowerLeg',
  'leftFoot',
  'leftToes',
  'rightUpperLeg',
  'rightLowerLeg',
  'rightFoot',
  'rightToes',
];

const LEGACY_MODEL_STAND_POSE = JSON.parse('{"chest":{"rotation":[0.012278820379590289,-0.10910634844609612,0.025790845665005887,0.9936195789026748]},"head":{"rotation":[-0.03951058593834458,0.2259593135032279,0.1313244729333955,0.9644351637350872]},"hips":{"rotation":[0.017228731254989447,0.00547331977139479,-0.12264095469162245,0.992286455527007],"position":[0,-0.011806604761992912,0]},"jaw":{"rotation":[0,0,0,1]},"leftEye":{"rotation":[-0.0077197466184405145,-0.026961475556941915,-0.00020821766360691694,0.9996066431318592]},"leftFoot":{"rotation":[-0.026291200481363606,-0.028364906450515696,-0.011265309662227472,0.999188319416073]},"leftHand":{"rotation":[0.04664492270187753,-0.011264460495008583,-0.7472238799317854,0.6628377149616498]},"leftIndexDistal":{"rotation":[0,0,0.14762898703832336,0.9890428110987102]},"leftIndexIntermediate":{"rotation":[-0.001116780057892448,-0.009792799738895453,0.31326513571133113,0.9496145579251286]},"leftIndexProximal":{"rotation":[-0.009435822429217741,-0.03504781390548765,0.08832606593350363,0.99543011913054]},"leftLittleDistal":{"rotation":[0,0,0.16149149039479485,0.9868741047013382]},"leftLittleIntermediate":{"rotation":[0,0,0.2091898081247271,0.9778750555038922]},"leftLittleProximal":{"rotation":[0,0,0.1329234131335883,0.9911263119506604]},"leftLowerArm":{"rotation":[0.4200664495916165,0.7613187412379351,-0.2564674946986147,-0.42209285273550434]},"leftLowerLeg":{"rotation":[0.06085844492799631,-0.0027654224792274342,0.04530908710156422,0.997113678948133]},"leftMiddleDistal":{"rotation":[0.04289103977040288,0.010452528714092356,0.2532726697937827,0.9663871160598244]},"leftMiddleIntermediate":{"rotation":[0,0,0.27733936504610845,0.9607720211349942]},"leftMiddleProximal":{"rotation":[0.014010056406145053,0.0004051926526628843,0.14133637204018817,0.9898624066388866]},"leftRingDistal":{"rotation":[-0.00003445926351437929,-0.0008999417921871566,0.27376552534418264,0.9617960418146633]},"leftRingIntermediate":{"rotation":[0,0,0.23654847635620369,0.9716196881154471]},"leftRingProximal":{"rotation":[0,0,0.1355871721345739,0.9907654206483741]},"leftShoulder":{"rotation":[-0.13148825261348285,0.2454182211891548,0.09458307182149503,0.9557901331661747]},"leftThumbDistal":{"rotation":[-0.07847967367897261,0.2390704394209022,-0.01804463115624607,0.9676573035433432]},"leftThumbIntermediate":{"rotation":[-0.12112827620038757,-0.1158984884054545,-0.16316367022463918,0.9722515609701424]},"leftThumbProximal":{"rotation":[0.15392696102298822,-0.15865822109731637,0.11849760856038216,0.9680353176996865]},"leftToes":{"rotation":[0.017321922797459022,0.0005592403629967282,0.00258620546238398,0.9998464631042717]},"leftUpperArm":{"rotation":[-0.0613741716699987,-0.0041038367275873094,0.147478217659628,0.9871507204535052]},"leftUpperLeg":{"rotation":[-0.0439264955767638,-0.14431534495391912,0.07090549491540486,0.9860101191103352]},"neck":{"rotation":[-0.034784681390979774,0.054953196441120525,0.05763776752504462,0.9962168739266369]},"rightEye":{"rotation":[-0.0077197466184405145,-0.026961475556941915,-0.00020821766360691694,0.9996066431318592]},"rightFoot":{"rotation":[-0.06721818655114367,-0.24182207935250205,-0.12501763981652333,0.9598824860727035]},"rightHand":{"rotation":[-0.3593233592881644,0.010699491400713043,-0.023608054827899138,0.9328530988858201]},"rightIndexDistal":{"rotation":[0,0,-0.16991038502866665,0.9854595177171969]},"rightIndexIntermediate":{"rotation":[0,0,-0.16991038502866665,0.9854595177171969]},"rightIndexProximal":{"rotation":[0.0008413288327252442,-0.004879604655119282,-0.16990830205256297,0.9854474367097517]},"rightLittleDistal":{"rotation":[0,0,-0.22846168704883907,0.9735529043410011]},"rightLittleIntermediate":{"rotation":[0,0,-0.22846168704883907,0.9735529043410011]},"rightLittleProximal":{"rotation":[0.034643866391465016,-0.008129805916450126,-0.2283169917131937,0.9729363083327958]},"rightLowerArm":{"rotation":[0,0,-0.01394287850101109,0.9999027933449861]},"rightLowerLeg":{"rotation":[0.04638224642039796,0.05764499456950083,0.00268106249020702,0.997255510750381]},"rightMiddleDistal":{"rotation":[0,0,-0.20345601305263378,0.9790840876823229]},"rightMiddleIntermediate":{"rotation":[0,0,-0.20345601305263378,0.9790840876823229]},"rightMiddleProximal":{"rotation":[0,0,-0.20345601305263378,0.9790840876823229]},"rightRingDistal":{"rotation":[0,0,-0.22846168704883907,0.9735529043410011]},"rightRingIntermediate":{"rotation":[0,0,-0.22846168704883907,0.9735529043410011]},"rightRingProximal":{"rotation":[0.027177964264291816,0.0008440124390392434,-0.2270116886013926,0.973512372360925]},"rightShoulder":{"rotation":[0,0,0,1]},"rightThumbDistal":{"rotation":[0,-0.20345601305263378,0,0.9790840876823229]},"rightThumbIntermediate":{"rotation":[-0.034187909804441495,-0.25477795893454697,0.03120483390704014,0.9658911102216355]},"rightThumbProximal":{"rotation":[-0.05051779743418874,-0.01103355143752485,-0.015932831409803054,0.9985351059268476]},"rightToes":{"rotation":[0.006575861187685371,0.0010256544894177819,0.009185638423100804,0.9999356629950092]},"rightUpperArm":{"rotation":[-0.05251907807888021,0.049543380034267594,-0.6353237947333742,0.7688633661308816]},"rightUpperLeg":{"rotation":[-0.05337147715195232,-0.12172198975559077,0.2689553943933254,0.9539382781203875]},"spine":{"rotation":[0.05414150040452461,-0.017382172263996565,0.043723662943329786,0.9974240819832604]},"upperChest":{"rotation":[-0.0580006210117048,-0.034797111175251444,0.057820793079578624,0.996033054122082]}}');
const LEGACY_A_STANCE_POSE = JSON.parse('{"chest":{"rotation":[0,0,0,1]},"head":{"rotation":[0,0,0,1]},"hips":{"rotation":[0,0,0,1],"position":[0,0,0]},"leftEye":{"rotation":[0.0021619814156454286,-0.00010930301623449401,2.3631164346489317e-7,0.9999976569418316]},"leftFoot":{"rotation":[0,0,0,1]},"leftHand":{"rotation":[0,0,0,1]},"leftIndexDistal":{"rotation":[0,0,0,1]},"leftIndexIntermediate":{"rotation":[0,0,0,1]},"leftIndexProximal":{"rotation":[0,0,0,1]},"leftLittleDistal":{"rotation":[0,0,0,1]},"leftLittleIntermediate":{"rotation":[0,0,0,1]},"leftLittleProximal":{"rotation":[0,0,0,1]},"leftLowerArm":{"rotation":[0,0,0,1]},"leftLowerLeg":{"rotation":[0,0,0,1]},"leftMiddleDistal":{"rotation":[0,0,0,1]},"leftMiddleIntermediate":{"rotation":[0,0,0,1]},"leftMiddleProximal":{"rotation":[0,0,0,1]},"leftRingDistal":{"rotation":[0,0,0,1]},"leftRingIntermediate":{"rotation":[0,0,0,1]},"leftRingProximal":{"rotation":[0,0,0,1]},"leftShoulder":{"rotation":[0,0,0.08532541830751879,0.9963531366893201]},"leftThumbDistal":{"rotation":[0,0,0,1]},"leftThumbIntermediate":{"rotation":[0,0,0,1]},"leftThumbProximal":{"rotation":[0,0,0,1]},"leftToes":{"rotation":[0,0,0,1]},"leftUpperArm":{"rotation":[0,0,0.42669474387529654,0.904395707392066]},"leftUpperLeg":{"rotation":[0,0,0,1]},"neck":{"rotation":[0,0,0,1]},"rightEye":{"rotation":[0.0021619813995019063,-0.00016395452394365808,3.5446746431506993e-7,0.9999976494748458]},"rightFoot":{"rotation":[0,0,0,1]},"rightHand":{"rotation":[0,0,0,1]},"rightIndexDistal":{"rotation":[0,0,0,1]},"rightIndexIntermediate":{"rotation":[0,0,0,1]},"rightIndexProximal":{"rotation":[0,0,0,1]},"rightLittleDistal":{"rotation":[0,0,0,1]},"rightLittleIntermediate":{"rotation":[0,0,0,1]},"rightLittleProximal":{"rotation":[0,0,0,1]},"rightLowerArm":{"rotation":[0,0,0,1]},"rightLowerLeg":{"rotation":[0,0,0,1]},"rightMiddleDistal":{"rotation":[0,0,0,1]},"rightMiddleIntermediate":{"rotation":[0,0,0,1]},"rightMiddleProximal":{"rotation":[0,0,0,1]},"rightRingDistal":{"rotation":[0,0,0,1]},"rightRingIntermediate":{"rotation":[0,0,0,1]},"rightRingProximal":{"rotation":[0,0,0,1]},"rightShoulder":{"rotation":[0,0,-0.08027473717361218,0.9967727757978284]},"rightThumbDistal":{"rotation":[0,0,0,1]},"rightThumbIntermediate":{"rotation":[0,0,0,1]},"rightThumbProximal":{"rotation":[0,0,0,1]},"rightToes":{"rotation":[0,0,0,1]},"rightUpperArm":{"rotation":[0,0,-0.4235327838350045,0.905880776381181]},"rightUpperLeg":{"rotation":[0,0,0,1]},"spine":{"rotation":[0,0,0,1]},"upperChest":{"rotation":[0,0,0,1]}}');
const LEGACY_DOUBLE_PEACE_POSE = JSON.parse('{"chest":{"rotation":[0.12632718442249216,0.026281165305772566,0.03221940244673012,0.9911168714798633]},"head":{"rotation":[0.0027296037623219314,0.010739806818506272,0.0735938572544038,0.9972267294789185]},"hips":{"rotation":[-0.2645056184689331,0.0019267135930340525,0.0020199005432862986,0.9643801043027034],"position":[0,-0.012452963631743863,0]},"jaw":{"rotation":[0,0,0,1]},"leftEye":{"rotation":[-0.00906868136923852,-0.03557369321960342,-0.0003228241187679641,0.9993258563419287]},"leftFoot":{"rotation":[-0.1867583887861061,-0.06523979101630183,-0.025313176508238215,0.9799103617072481]},"leftHand":{"rotation":[-0.4838185183377676,-0.29598034427742215,-0.26327747467543094,0.7803846797851646]},"leftIndexDistal":{"rotation":[0,0,-0.06199846955623789,0.99807624446867]},"leftIndexIntermediate":{"rotation":[0,0,-0.022327864296377356,0.9997507021632758]},"leftIndexProximal":{"rotation":[0.019577435593636682,-0.22062120482851355,-0.08619510260816965,0.9713461856011787]},"leftLittleDistal":{"rotation":[0.1568558064757093,0.21174499192527432,0.6914503730233792,0.6726490139851915]},"leftLittleIntermediate":{"rotation":[0,0,0.7071067811865476,0.7071067811865476]},"leftLittleProximal":{"rotation":[0,0,0.7071067811865476,0.7071067811865476]},"leftLowerArm":{"rotation":[0.1531335249909013,-0.8955697399089319,-0.19258680326404629,0.3706956807029786]},"leftLowerLeg":{"rotation":[-0.9348719810281108,-0.08680289408085946,0.002917923677716539,0.34419634278878425]},"leftMiddleDistal":{"rotation":[0,0,-0.1027875159593063,0.9947033359564627]},"leftMiddleIntermediate":{"rotation":[0,0,-0.03560914475372165,0.9993657932958825]},"leftMiddleProximal":{"rotation":[-0.0025998890083756806,0.026237604050329804,-0.05001800865324346,0.9984002341351922]},"leftRingDistal":{"rotation":[0.020109773358269148,-0.04606801784897169,0.7056045193530629,0.7068207672497173]},"leftRingIntermediate":{"rotation":[0,0,0.7071067811865476,0.7071067811865476]},"leftRingProximal":{"rotation":[0,0,0.7071067811865476,0.7071067811865476]},"leftShoulder":{"rotation":[0.14970505139160767,0.08225125884746781,0.00458948493365012,0.9852928826668175]},"leftThumbDistal":{"rotation":[-0.2352667891960039,0.5120312942050936,-0.08042272363114115,0.8221956441017001]},"leftThumbIntermediate":{"rotation":[-0.19526587838834705,0.19936097888560989,0.05132514215627221,0.9589015416702786]},"leftThumbProximal":{"rotation":[0.015117549045717915,0.2785812214774047,0.05203494511926526,0.9588828537613147]},"leftToes":{"rotation":[-0.1560958523329507,0,0,0.9877419120825286]},"leftUpperArm":{"rotation":[-0.05428686848127214,-0.006254668892780225,0.20711937276589928,0.9767882986873868]},"leftUpperLeg":{"rotation":[0.5094288540339944,-0.09682970246177416,0.02926017187675027,0.8545467182901814]},"neck":{"rotation":[0.021324469889157163,0.0339885011895868,0.00917318269108375,0.9991525916946561]},"rightEye":{"rotation":[-0.00906868136923852,-0.03557369321960342,-0.0003228241187679641,0.9993258563419287]},"rightFoot":{"rotation":[-0.12395573494864745,0.09049474601830933,0.04111912197729003,0.9872967611231382]},"rightHand":{"rotation":[-0.44280339661923906,0.3086714445259864,0.11544655766925878,0.8338580116536773]},"rightIndexDistal":{"rotation":[0.05330036017931064,-0.003294151309216382,0.06159782908638367,0.9966714241031256]},"rightIndexIntermediate":{"rotation":[0,0,0.032965166168983304,0.9994565012142607]},"rightIndexProximal":{"rotation":[0.026816887596401728,0.2260805294594699,0.11469751744390717,0.9669606652967703]},"rightLittleDistal":{"rotation":[0,0,-0.7071067811865476,0.7071067811865476]},"rightLittleIntermediate":{"rotation":[0,0,-0.7071067811865476,0.7071067811865476]},"rightLittleProximal":{"rotation":[0,0,-0.7071067811865476,0.7071067811865476]},"rightLowerArm":{"rotation":[0.19263594354276867,0.8853527724706663,0.24700735822048922,0.34355381895538134]},"rightLowerLeg":{"rotation":[0.0783724729201963,0.08769430161608016,-0.051711596735022056,0.9917123452471263]},"rightMiddleDistal":{"rotation":[0,0,0.08026455767348724,0.9967735955478955]},"rightMiddleIntermediate":{"rotation":[0,0,0.025254406039762072,0.9996810566253513]},"rightMiddleProximal":{"rotation":[0.0015431107204760663,-0.01552789257243461,0.09887755580983747,0.9949772521613929]},"rightRingDistal":{"rotation":[-0.03493325772154775,0.02278703462818298,-0.699902223950215,0.7130198422676309]},"rightRingIntermediate":{"rotation":[0,0,-0.7071067811865476,0.7071067811865476]},"rightRingProximal":{"rotation":[0,0,-0.7071067811865476,0.7071067811865476]},"rightShoulder":{"rotation":[0.13535152880765017,-0.05998725819668628,0.044167519672674044,0.987993280700552]},"rightThumbDistal":{"rotation":[-0.2641501833322756,-0.27212364333005323,-0.11376620464754332,0.9182759139095377]},"rightThumbIntermediate":{"rotation":[-0.26279511809487904,-0.2786395210745717,0.0077608225630609925,0.9237091061768182]},"rightThumbProximal":{"rotation":[-0.0005566764027957766,-0.204426535127855,-0.12281526488418068,0.9711466895162806]},"rightToes":{"rotation":[0.02013218727499586,0.0031907754708250763,-0.02778424723961253,0.9994060984368405]},"rightUpperArm":{"rotation":[-0.008709214553583594,-0.02015019077944208,-0.15949862764656433,0.986954055248913]},"rightUpperLeg":{"rotation":[0.2771228032093447,0.06988093981711571,0.00893575287706687,0.9582482760288127]},"spine":{"rotation":[0.015806572645082347,-0.0024959887593055223,0.03720684708748699,0.999179449764224]},"upperChest":{"rotation":[0.05414806199721468,0.03449260362149727,-0.11788092909125188,0.9909502178383833]}}');
const LEGACY_WAITING_BONE_SEQUENCE = [
  ['spine', 'x', true],
  ['chest', 'x', false],
  ['upperChest', 'x', false],
  ['neck', 'x', false],
];
const LEGACY_WAITING_ROTATION_KEYS = {
  0.0: 0,
  0.8: Math.PI / 132,
  1.8: Math.PI / 92,
  2.2: Math.PI / 116,
  3.4: 0,
  4.0: -Math.PI / 240,
  4.5: -Math.PI / 300,
  4.8: 0,
};

const BUILT_IN_POSES = [
  { id: 't-stance', name: 'T-Stance', labelKey: 'pose.builtin.tStance', overrides: {} },
  {
    id: 'a-stance',
    name: 'A-Stance',
    labelKey: 'pose.builtin.aStance',
    poseData: LEGACY_A_STANCE_POSE,
  },
  {
    id: 'model-stand',
    name: 'Model Stand',
    labelKey: 'pose.builtin.modelStand',
    poseData: LEGACY_MODEL_STAND_POSE,
  },
  {
    id: 'double-peace',
    name: 'Double Peace',
    labelKey: 'pose.builtin.doublePeace',
    poseData: LEGACY_DOUBLE_PEACE_POSE,
  },
];

function bindSliderControl(inputId, outputId, expressionNames) {
  const input = document.getElementById(inputId);
  const output = document.getElementById(outputId);

  return {
    input,
    output,
    expressionNames: Array.isArray(expressionNames) ? expressionNames : [expressionNames],
    row: input.closest('.slider-row'),
  };
}

const emotionControls = [
  bindSliderControl('emotion-joy', 'emotion-joy-value', 'happy'),
  bindSliderControl('emotion-angry', 'emotion-angry-value', 'angry'),
  bindSliderControl('emotion-sorrow', 'emotion-sorrow-value', 'sad'),
  bindSliderControl('emotion-fun', 'emotion-fun-value', ['relaxed', 'surprised']),
];

const faceControls = [
  bindSliderControl('face-blink', 'face-blink-value', 'blink'),
  bindSliderControl('face-blink-right', 'face-blink-right-value', 'blinkRight'),
  bindSliderControl('face-blink-left', 'face-blink-left-value', 'blinkLeft'),
  bindSliderControl('face-aa', 'face-aa-value', 'aa'),
  bindSliderControl('face-ih', 'face-ih-value', 'ih'),
  bindSliderControl('face-ou', 'face-ou-value', 'ou'),
  bindSliderControl('face-ee', 'face-ee-value', 'ee'),
  bindSliderControl('face-oh', 'face-oh-value', 'oh'),
];

const allExpressionControls = [...emotionControls, ...faceControls];

const toggleRows = [
  { input: lookAtToggle, row: lookAtToggle.closest('.toggle-row') },
  { input: autoBlinkToggle, row: autoBlinkToggle.closest('.toggle-row') },
  { input: idleMotionToggle, row: idleMotionToggle.closest('.toggle-row') },
  { input: gridToggle, row: gridToggle.closest('.toggle-row') },
  { input: axisToggle, row: axisToggle.closest('.toggle-row') },
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe3f4ff);

const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 1000);
camera.position.set(0.0, 1.35, 2.8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xe3f4ff, 1);
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0.0, 1.2, 0.0);
controls.enableDamping = true;
controls.minDistance = 0.08;
controls.maxDistance = 8;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);

const skyLight = new THREE.HemisphereLight(0xffffff, 0xdcecff, 0.95);
scene.add(skyLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
keyLight.position.set(0.4, 1.8, 3.4);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
fillLight.position.set(-1.6, 1.4, 2.2);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.18);
rimLight.position.set(0.3, 2.3, -2.2);
scene.add(rimLight);

const gridHelper = new THREE.GridHelper(10, 20, 0x8fb0d2, 0xc4d7eb);
scene.add(gridHelper);

const axesHelper = new THREE.AxesHelper(0.5);
scene.add(axesHelper);

const lookAtTarget = new THREE.Object3D();
scene.add(lookAtTarget);

const poseMarkerGroup = new THREE.Group();
poseMarkerGroup.visible = false;
scene.add(poseMarkerGroup);

const moveControlAnchor = new THREE.Object3D();
moveControlAnchor.visible = false;
scene.add(moveControlAnchor);

function createVrmLoader() {
  const nextLoader = new GLTFLoader();
  nextLoader.register((parser) => new VRMLoaderPlugin(parser, { autoUpdateHumanBones: false }));
  return nextLoader;
}

const vrmAnimationLoader = new GLTFLoader();
vrmAnimationLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));
const bundledVrmAnimationSourceCache = new Map();

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
raycaster.params.Line.threshold = 0.08;
const pointer = new THREE.Vector2();
const markerCameraPosition = new THREE.Vector3();
const markerWorldPosition = new THREE.Vector3();
const modelInteractionWorldPoint = new THREE.Vector3();
const modelInteractionFallbackCenter = new THREE.Vector3();
const modelInteractionFallbackSize = new THREE.Vector3();
const modelInteractionFallbackBox = new THREE.Box3();
const baseModelPosition = new THREE.Vector3();
const baseModelRotation = new THREE.Euler();
const baseModelScale = new THREE.Vector3(1, 1, 1);
const lookAtCameraWorldPosition = new THREE.Vector3();
const lookAtParentTargetPosition = new THREE.Vector3();
const lookAtEyeDirection = new THREE.Vector3();
const lookAtEyeEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const lookAtEyeQuaternion = new THREE.Quaternion();
const LOOK_AT_FORWARD_VRM0 = new THREE.Vector3(0, 0, -1);
const LOOK_AT_FORWARD_VRM1 = new THREE.Vector3(0, 0, 1);
const LOOK_AT_MAX_YAW = THREE.MathUtils.degToRad(14);
const LOOK_AT_MAX_PITCH_UP = THREE.MathUtils.degToRad(9);
const LOOK_AT_MAX_PITCH_DOWN = THREE.MathUtils.degToRad(7);
const MAX_IDLE_ANIMATION_DELTA = 1 / 30;
const IDLE_INTRO_TO_WAITING_BLEND_SECONDS = 0.18;
const IDLE_WAITING_LOOP_START_SECONDS = 0.22;
const SAMPLE_MODEL_REQUEST_COOLDOWN_MS = 1000;
const MODEL_INTERACTION_DOUBLE_TAP_MS = 360;
const MODEL_INTERACTION_MAX_MOVE_PX = 18;

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.visible = false;
transformControls.size = 0.8;
const transformControlsHelper = transformControls.getHelper();
transformControlsHelper.visible = false;
scene.add(transformControlsHelper);

let activePanel = null;
let currentVrm = null;
let currentObjectUrl = null;
let currentDownloadResult = null;
let gridVisible = true;
let axisVisible = true;
let uiChromeHidden = false;
let idleMotionEnabled = true;
let lookAtEnabled = true;
let autoBlinkEnabled = true;
let blinkPhase = 'waiting';
let blinkTimer = nextBlinkDelay();
let blinkElapsed = 0;
let currentModelYaw = Math.PI;
let currentModelVersion = '0';
let defaultPoseSnapshot = null;
let customPoses = [];
let selectedCustomPoseId = null;
let selectedPoseKey = null;
let poseEditorMode = null;
let activePoseTool = null;
let activePoseBoneName = null;
let poseMarkerMeshes = [];
let lastMoveAnchorPosition = new THREE.Vector3();
let eyeLookFallbackBones = [];
let idleAnimationMixer = null;
let idleAnimationAction = null;
let idleAnimationIntroAction = null;
let idleAnimationLoadPromise = null;
let idleAnimationSequenceToken = 0;
let idleAnimationLoopTransitionPrimed = false;
let interactionAnimationMixer = null;
let interactionAnimationAction = null;
let interactionAnimationLoadPromise = null;
let interactionAnimationToken = 0;
let isAppearingAnimationActive = false;
let modelPointerDownClientX = 0;
let modelPointerDownClientY = 0;
let lastModelTapAt = 0;
let lastModelTapClientX = 0;
let lastModelTapClientY = 0;
let pendingSelectedPoseReapplyAfterIntro = false;
let photoCaptureInProgress = false;
let downloadConsentResolver = null;
let sampleModelRequestInFlight = false;
let lastSampleModelRequestAt = 0;

function nextBlinkDelay() {
  return 2 + Math.random() * 2.6;
}

function formatPanelTitle(panelName) {
  if (!panelName) {
    return t('panel.default');
  }

  return t(`panel.${panelName}`);
}

function safeLocalStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function loadCustomPoses() {
  const raw = safeLocalStorageGet(CUSTOM_POSES_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomPoses() {
  safeLocalStorageSet(CUSTOM_POSES_STORAGE_KEY, JSON.stringify(customPoses));
}

function createPoseId() {
  return `pose-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getPoseKey(kind, poseId) {
  return `${kind}:${poseId}`;
}

function isCurrentVrm0() {
  return String(currentModelVersion).startsWith('0');
}

function getSelectedBuiltInPose() {
  if (!selectedPoseKey?.startsWith('builtin:')) {
    return null;
  }

  const poseId = selectedPoseKey.slice('builtin:'.length);
  return BUILT_IN_POSES.find((pose) => pose.id === poseId) || null;
}

function getBuiltInPoseLabel(pose) {
  if (!pose) {
    return '';
  }

  return pose.labelKey ? t(pose.labelKey) : pose.name;
}

function reapplySelectedPoseAfterLoad() {
  if (!currentVrm || !selectedPoseKey) {
    return false;
  }

  if (selectedPoseKey.startsWith('builtin:')) {
    const preset = getSelectedBuiltInPose();
    if (!preset) {
      selectedPoseKey = null;
      renderPoseList();
      return false;
    }

    applyBuiltInPose(preset);
    return true;
  }

  if (selectedPoseKey.startsWith('custom:')) {
    const poseId = selectedPoseKey.slice('custom:'.length);
    const pose = customPoses.find((item) => item.id === poseId);
    if (!pose?.snapshot) {
      selectedPoseKey = null;
      selectedCustomPoseId = null;
      renderPoseList();
      return false;
    }

    applyPoseSnapshot(pose.snapshot);
    selectCustomPose(pose.id);
    return true;
  }

  return false;
}

function flushPendingSelectedPoseReapplyAfterIntro() {
  if (!pendingSelectedPoseReapplyAfterIntro) {
    return false;
  }

  pendingSelectedPoseReapplyAfterIntro = false;
  const restoredSelectedPose = reapplySelectedPoseAfterLoad();
  if (restoredSelectedPose && currentVrm?.scene) {
    frameCameraToModel(currentVrm.scene);
  }

  return restoredSelectedPose;
}

function getBuiltInPoseSpec(preset) {
  if (preset.poseData) {
    if (isCurrentVrm0()) {
      return {
        mode: 'legacy-pose-data',
        poseData: preset.poseData,
      };
    }

    return {
      mode: 'normalized-pose-data',
      poseData: preset.poseData,
    };
  }

  if (preset.overrides) {
    return { mode: 'local-overrides', overrides: preset.overrides };
  }

  return { mode: 'local-overrides', overrides: {} };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatSliderValue(value) {
  if (Math.abs(value) < 0.005) {
    return '0';
  }

  return value.toFixed(2).replace(/\.?0+$/, '');
}

function setSliderDisplay(control, value) {
  control.input.value = String(value);
  control.output.textContent = formatSliderValue(value);
}

function getSliderValue(control) {
  return Number(control.input.value || 0);
}

function setControlEnabled(control, isEnabled) {
  control.input.disabled = !isEnabled;
  control.row.classList.toggle('is-disabled', !isEnabled);
}

function setToggleEnabled(record, isEnabled) {
  record.input.disabled = !isEnabled;
  record.row.classList.toggle('is-disabled', !isEnabled);
}

function prettifyMetaValue(value) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  if (typeof value === 'boolean') {
    return t(value ? 'meta.allowed' : 'meta.disallowed');
  }

  const raw = String(value);
  const mapping = {
    onlyAuthor: 'meta.onlyAuthor',
    OnlyAuthor: 'meta.onlyAuthor',
    licensedPerson: 'meta.licensedPersonOnly',
    ExplicitlyLicensedPerson: 'meta.licensedPersonOnly',
    everyone: 'meta.everyone',
    Everyone: 'meta.everyone',
    disallow: 'meta.disallowed',
    Disallow: 'meta.disallowed',
    allow: 'meta.allowed',
    Allow: 'meta.allowed',
    personalNonProfit: 'meta.personalNonProfit',
    personalProfit: 'meta.personalProfit',
    corporation: 'meta.corporation',
    required: 'meta.required',
    unnecessary: 'meta.notRequired',
    allowModification: 'meta.allowed',
    allowModificationRedistribution: 'meta.allowedWithRedistribution',
    prohibited: 'meta.prohibited',
  };

  return mapping[raw] ? t(mapping[raw]) : raw;
}

function normalizeMeta(vrm) {
  const meta = vrm?.meta;
  if (!meta) {
    return {
      status: '-',
      title: '-',
      author: '-',
      version: t('meta.unknownVersion'),
      avatarPermission: '-',
      violentUsage: '-',
      sexualUsage: '-',
      commercialUsage: '-',
      creditNotation: '-',
      redistribution: '-',
      modification: '-',
      contact: '-',
      reference: '-',
      license: '-',
      otherPermissionUrl: '-',
      otherLicenseUrl: '-',
    };
  }

  const references = Array.isArray(meta.references)
    ? meta.references.filter(Boolean).join(', ')
    : (meta.reference || '-');

  const author = Array.isArray(meta.authors)
    ? meta.authors.filter(Boolean).join(', ')
    : (meta.author || '-');

  return {
    status: '-',
    title: meta.name || meta.title || '-',
    author,
    version: meta.metaVersion || meta.version || (Array.isArray(meta.authors) ? 'VRM 1.0' : 'VRM 0.x'),
    avatarPermission: prettifyMetaValue(meta.avatarPermission || meta.allowedUserName),
    violentUsage: prettifyMetaValue(meta.allowExcessivelyViolentUsage ?? meta.violentUssageName),
    sexualUsage: prettifyMetaValue(meta.allowExcessivelySexualUsage ?? meta.sexualUssageName),
    commercialUsage: prettifyMetaValue(meta.commercialUsage || meta.commercialUssageName),
    creditNotation: prettifyMetaValue(meta.creditNotation),
    redistribution: prettifyMetaValue(meta.allowRedistribution),
    modification: prettifyMetaValue(meta.modification),
    contact: meta.contactInformation || '-',
    reference: references,
    license: meta.licenseName || meta.thirdPartyLicenses || meta.copyrightInformation || '-',
    otherPermissionUrl: meta.otherPermissionUrl || '-',
    otherLicenseUrl: meta.otherLicenseUrl || '-',
  };
}

function buildVrmDiagnostics(vrm, meta = normalizeMeta(vrm)) {
  const humanoid = vrm?.humanoid;
  const expressionManager = vrm?.expressionManager;
  const lookAt = vrm?.lookAt;
  const rawBoneNames = [
    'head',
    'neck',
    'leftEye',
    'rightEye',
    'leftFoot',
    'rightFoot',
  ];

  const expressionsToCheck = [
    'lookLeft',
    'lookRight',
    'lookUp',
    'lookDown',
    'blink',
    'blinkLeft',
    'blinkRight',
  ];

  const rawBones = Object.fromEntries(
    rawBoneNames.map((boneName) => [boneName, Boolean(humanoid?.getRawBoneNode?.(boneName))]),
  );

  const normalizedBones = Object.fromEntries(
    rawBoneNames.map((boneName) => [boneName, Boolean(humanoid?.getNormalizedBoneNode?.(boneName))]),
  );

  const expressions = Object.fromEntries(
    expressionsToCheck.map((name) => [name, Boolean(expressionManager?.getExpression?.(name))]),
  );

  return {
    title: meta.title,
    version: meta.version,
    metaVersion: vrm?.meta?.metaVersion ?? 'unknown',
    hasLookAt: Boolean(lookAt),
    reliableNativeLookAt: hasReliableNativeLookAt(vrm),
    lookAtType: lookAt?.applier?.type || 'none',
    lookAtApplier: lookAt?.applier?.constructor?.name || 'none',
    lookAtAutoUpdate: lookAt?.autoUpdate ?? null,
    humanoidAutoUpdateHumanBones: humanoid?.autoUpdateHumanBones ?? null,
    rawBones,
    normalizedBones,
    expressions,
  };
}

function logVrmDiagnostics(vrm, meta) {
  const diagnostics = buildVrmDiagnostics(vrm, meta);
  window.__vrmLookAtDebug = diagnostics;
  window.__vrmCurrent = vrm;

  console.groupCollapsed(`[VRM Debug] ${diagnostics.title}`);
  console.table({
    version: diagnostics.version,
    metaVersion: diagnostics.metaVersion,
    hasLookAt: diagnostics.hasLookAt,
    reliableNativeLookAt: diagnostics.reliableNativeLookAt,
    lookAtType: diagnostics.lookAtType,
    lookAtApplier: diagnostics.lookAtApplier,
    lookAtAutoUpdate: diagnostics.lookAtAutoUpdate,
    humanoidAutoUpdateHumanBones: diagnostics.humanoidAutoUpdateHumanBones,
  });
  console.log('Raw bones', diagnostics.rawBones);
  console.log('Normalized bones', diagnostics.normalizedBones);
  console.log('Expressions', diagnostics.expressions);
  console.groupEnd();

  return diagnostics;
}

function buildVrmAnimationDiagnostics(gltf, vrm, meta = normalizeMeta(vrm)) {
  const jsonAnimations = Array.isArray(gltf?.parser?.json?.animations) ? gltf.parser.json.animations : [];
  const gltfAnimations = Array.isArray(gltf?.animations) ? gltf.animations : [];
  const extensionsUsed = Array.isArray(gltf?.parser?.json?.extensionsUsed) ? gltf.parser.json.extensionsUsed : [];

  const clips = gltfAnimations.map((clip, index) => {
    const fallbackName = jsonAnimations[index]?.name || `animation-${index + 1}`;
    const name = clip?.name || fallbackName;

    return {
      index,
      name,
      duration: roundDebugNumber(clip?.duration ?? 0),
      trackCount: Array.isArray(clip?.tracks) ? clip.tracks.length : 0,
      sampleTracks: Array.isArray(clip?.tracks)
        ? clip.tracks.slice(0, 6).map((track) => track.name)
        : [],
    };
  });

  const namedAnimations = {
    APPEARING: clips.some((clip) => /appearing/i.test(clip.name)),
    LIKED: clips.some((clip) => /liked/i.test(clip.name)),
    WAITING: clips.some((clip) => /waiting/i.test(clip.name)),
  };

  return {
    title: meta.title,
    version: meta.version,
    clipCount: clips.length,
    clipNames: clips.map((clip) => clip.name),
    jsonAnimationCount: jsonAnimations.length,
    extensionsUsed,
    hasVrmAnimationExtension: extensionsUsed.includes('VRMC_vrm_animation'),
    namedAnimations,
    clips,
  };
}

function logVrmAnimationDiagnostics(gltf, vrm, meta) {
  const diagnostics = buildVrmAnimationDiagnostics(gltf, vrm, meta);
  window.__vrmAnimationDebug = diagnostics;

  console.groupCollapsed(`[VRM Animation Debug] ${diagnostics.title}`);
  console.table({
    version: diagnostics.version,
    clipCount: diagnostics.clipCount,
    jsonAnimationCount: diagnostics.jsonAnimationCount,
    hasVrmAnimationExtension: diagnostics.hasVrmAnimationExtension,
    hasAppearing: diagnostics.namedAnimations.APPEARING,
    hasLiked: diagnostics.namedAnimations.LIKED,
    hasWaiting: diagnostics.namedAnimations.WAITING,
  });

  if (diagnostics.extensionsUsed.length) {
    console.log('extensionsUsed', diagnostics.extensionsUsed);
  }

  if (diagnostics.clips.length) {
    console.table(
      diagnostics.clips.map((clip) => ({
        index: clip.index,
        name: clip.name,
        duration: clip.duration,
        trackCount: clip.trackCount,
        sampleTracks: clip.sampleTracks.join(', '),
      })),
    );
  } else {
    console.log('No embedded animation clips found in this VRM/glTF payload.');
  }

  console.groupEnd();
  return diagnostics;
}

function extractBundledVrmAnimation(gltf, source) {
  const vrmAnimations = Array.isArray(gltf?.userData?.vrmAnimations) ? gltf.userData.vrmAnimations : [];
  const vrmAnimation = vrmAnimations[0] ?? null;

  if (!vrmAnimation) {
    throw new Error(`[VRMA] ${source.label} did not expose gltf.userData.vrmAnimations[0].`);
  }

  return vrmAnimation;
}

function loadBundledVrmAnimationSource(kind) {
  const source = BUNDLED_VRM_ANIMATIONS[kind];
  if (!source) {
    return Promise.resolve(null);
  }

  const cachedPromise = bundledVrmAnimationSourceCache.get(kind);
  if (cachedPromise) {
    return cachedPromise;
  }

  const loadPromise = vrmAnimationLoader.loadAsync(source.url)
    .then((gltf) => ({
      ...source,
      vrmAnimation: extractBundledVrmAnimation(gltf, source),
      gltf,
    }))
    .catch((error) => {
      console.warn(`[VRMA] Failed to load ${source.label} from ${source.url}`, error);
      return null;
    });

  bundledVrmAnimationSourceCache.set(kind, loadPromise);
  return loadPromise;
}

async function createBundledVrmAnimationClip(kind, vrm) {
  if (!vrm) {
    return null;
  }

  const source = await loadBundledVrmAnimationSource(kind);
  if (!source) {
    return null;
  }

  try {
    const clip = createVRMAnimationClip(source.vrmAnimation, vrm);
    clip.name = source.label.toLowerCase();
    clip.userData = {
      ...clip.userData,
      hasExpressionTracks: Boolean(
        source.vrmAnimation.expressionTracks?.preset?.size
        || source.vrmAnimation.expressionTracks?.custom?.size
      ),
      hasLookAtTrack: Boolean(source.vrmAnimation.lookAtTrack),
    };
    return clip;
  } catch (error) {
    console.warn(`[VRMA] Failed to create ${source.label} clip for ${normalizeMeta(vrm).title}`, error);
    return null;
  }
}

function getActiveBundledVrmAnimationClip() {
  return interactionAnimationAction?.getClip?.()
    || idleAnimationIntroAction?.getClip?.()
    || idleAnimationAction?.getClip?.()
    || null;
}

function isBundledVrmAnimationDrivingExpressions() {
  return Boolean(getActiveBundledVrmAnimationClip()?.userData?.hasExpressionTracks);
}

function isBundledVrmAnimationDrivingLookAt() {
  return Boolean(getActiveBundledVrmAnimationClip()?.userData?.hasLookAtTrack);
}

const POSE_DEBUG_BONES = [
  'hips',
  'spine',
  'chest',
  'upperChest',
  'neck',
  'head',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'leftUpperLeg',
  'rightUpperLeg',
  'leftLowerLeg',
  'rightLowerLeg',
];

function roundDebugNumber(value) {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : value;
}

function roundDebugArray(values, size = values.length) {
  return values.slice(0, size).map((value) => roundDebugNumber(value));
}

function summarizePoseTransform(transform) {
  if (!transform) {
    return null;
  }

  return {
    rotation: Array.isArray(transform.rotation) ? roundDebugArray(transform.rotation, 4) : null,
    position: Array.isArray(transform.position) ? roundDebugArray(transform.position, 3) : null,
  };
}

function summarizeNodeTransform(node) {
  if (!node) {
    return null;
  }

  return {
    rotation: roundDebugArray(node.quaternion.toArray(), 4),
    position: roundDebugArray(node.position.toArray(), 3),
  };
}

function buildPoseDebugSnapshot(label, extra = {}) {
  const humanoid = currentVrm?.humanoid;
  if (!humanoid) {
    return {
      label,
      ready: false,
      ...extra,
    };
  }

  const normalizedPose = humanoid.getNormalizedPose?.() ?? null;
  const rawPose = humanoid.getRawPose?.() ?? null;

  const bones = Object.fromEntries(
    POSE_DEBUG_BONES.map((boneName) => [
      boneName,
      {
        normalizedPose: summarizePoseTransform(normalizedPose?.[boneName]),
        rawPose: summarizePoseTransform(rawPose?.[boneName]),
        normalizedNode: summarizeNodeTransform(humanoid.getNormalizedBoneNode?.(boneName)),
        rawNode: summarizeNodeTransform(humanoid.getRawBoneNode?.(boneName)),
      },
    ]),
  );

  return {
    label,
    ready: true,
    selectedPoseKey,
    lookAtEnabled,
    activePoseTool,
    humanoidAutoUpdateHumanBones: humanoid.autoUpdateHumanBones,
    baseModelPosition: roundDebugArray(baseModelPosition.toArray(), 3),
    scenePosition: currentVrm ? roundDebugArray(currentVrm.scene.position.toArray(), 3) : null,
    sceneRotation: currentVrm ? roundDebugArray(currentVrm.scene.rotation.toArray(), 3) : null,
    bones,
    ...extra,
  };
}

function logPoseDebug(label, extra = {}) {
  const snapshot = buildPoseDebugSnapshot(label, extra);
  window.__vrmPoseDebug = snapshot;
  window.__dumpPoseDebug = (nextLabel = 'manual-dump') => {
    const manualSnapshot = buildPoseDebugSnapshot(nextLabel);
    console.groupCollapsed(`[VRM Pose Debug] ${nextLabel}`);
    console.log(manualSnapshot);
    console.groupEnd();
    return manualSnapshot;
  };

  console.groupCollapsed(`[VRM Pose Debug] ${label}`);
  console.log(snapshot);
  console.groupEnd();
  return snapshot;
}

function applyLegacyPoseData(poseData) {
  const humanoid = currentVrm?.humanoid;
  const vrm = currentVrm;
  if (!humanoid || !poseData || !vrm) {
    return;
  }

  const previousAutoUpdateHumanBones = humanoid.autoUpdateHumanBones;
  logPoseDebug('before-apply-legacy-pose', {
    appliedPoseBones: Object.keys(poseData),
  });

  if (typeof humanoid.setNormalizedPose === 'function') {
    humanoid.setNormalizedPose(poseData);
  }

  if (typeof humanoid.setRawPose === 'function') {
    humanoid.setRawPose(poseData);
  } else if (typeof humanoid.setPose === 'function') {
    humanoid.setPose(poseData);
  }

  humanoid.autoUpdateHumanBones = true;
  humanoid.update?.();
  vrm.update?.(0);
  humanoid.autoUpdateHumanBones = previousAutoUpdateHumanBones;

  vrm.scene.rotation.copy(baseModelRotation);
  vrm.scene.position.copy(baseModelPosition);
  vrm.scene.scale.copy(baseModelScale);
  vrm.scene.updateMatrixWorld(true);
  logPoseDebug('after-apply-legacy-pose', {
    appliedPoseBones: Object.keys(poseData),
  });
}

function resetVrmToViewerDefaultPose(vrm, { isVrm0 = false } = {}) {
  const humanoid = vrm?.humanoid;
  if (!humanoid || isVrm0) {
    return;
  }

  const previousAutoUpdateHumanBones = humanoid.autoUpdateHumanBones;
  humanoid.autoUpdateHumanBones = true;

  if (typeof humanoid.resetNormalizedPose === 'function') {
    humanoid.resetNormalizedPose();
  } else if (typeof humanoid.resetPose === 'function') {
    humanoid.resetPose();
  } else if (typeof humanoid.resetRawPose === 'function') {
    humanoid.autoUpdateHumanBones = false;
    humanoid.resetRawPose();
  }

  humanoid.update?.();
  vrm.update?.(0);
  humanoid.autoUpdateHumanBones = previousAutoUpdateHumanBones;
}

function stabilizeLoadedVrmScene(vrm) {
  if (!vrm?.scene) {
    return;
  }

  vrm.scene.updateMatrixWorld(true);
  vrm.scene.traverse((object) => {
    if (!object?.isMesh) {
      return;
    }

    object.frustumCulled = false;
    object.geometry?.computeBoundingBox?.();
    object.geometry?.computeBoundingSphere?.();
  });
}

function clearIdleAnimationState() {
  idleAnimationMixer?.removeEventListener('finished', handleIdleAnimationFinished);
  idleAnimationLoopTransitionPrimed = false;

  if (idleAnimationIntroAction) {
    idleAnimationIntroAction.stop();
    idleAnimationIntroAction = null;
  }

  if (idleAnimationAction) {
    idleAnimationAction.reset();
    idleAnimationAction.stop();
    idleAnimationAction = null;
  }

  idleAnimationMixer?.stopAllAction?.();
  idleAnimationMixer = null;
}

function clearInteractionAnimationState() {
  interactionAnimationMixer?.removeEventListener('finished', handleInteractionAnimationFinished);

  if (interactionAnimationAction) {
    interactionAnimationAction.reset();
    interactionAnimationAction.stop();
    interactionAnimationAction = null;
  }

  interactionAnimationMixer?.stopAllAction?.();
  interactionAnimationMixer = null;
}

function stopLegacyWaitingAnimation() {
  idleAnimationSequenceToken += 1;
  isAppearingAnimationActive = false;
  idleAnimationLoadPromise = null;
  clearIdleAnimationState();
}

function stopInteractionAnimation() {
  interactionAnimationToken += 1;
  interactionAnimationLoadPromise = null;
  clearInteractionAnimationState();
}

function buildLegacyWaitingClip() {
  const humanoid = currentVrm?.humanoid;
  if (!humanoid) {
    return null;
  }

  const tracks = [];

  LEGACY_WAITING_BONE_SEQUENCE.forEach(([boneName, axis, invert]) => {
    const bone = humanoid.getRawBoneNode?.(boneName);
    if (!bone) {
      return;
    }

    const times = [];
    const values = [];
    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const direction = invert ? -1 : 1;
    const baseEuler = new THREE.Euler().setFromQuaternion(bone.quaternion.clone(), 'XYZ');

    Object.entries(LEGACY_WAITING_ROTATION_KEYS).forEach(([time, angle]) => {
      const euler = new THREE.Euler(baseEuler.x, baseEuler.y, baseEuler.z, 'XYZ');
      if (axisIndex === 0) {
        euler.x += angle * direction;
      } else if (axisIndex === 1) {
        euler.y += angle * direction;
      } else {
        euler.z += angle * direction;
      }

      const quaternion = new THREE.Quaternion().setFromEuler(euler);
      times.push(Number(time));
      values.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    });

    tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, values));
  });

  if (!tracks.length) {
    return null;
  }

  return new THREE.AnimationClip('legacy-waiting', -1, tracks);
}

function ensureLegacyWaitingAnimation() {
  if (!currentVrm || idleAnimationAction || idleAnimationIntroAction || idleAnimationLoadPromise) {
    return;
  }

  const clip = buildLegacyWaitingClip();
  if (!clip) {
    return;
  }

  clearIdleAnimationState();
  idleAnimationMixer = new THREE.AnimationMixer(currentVrm.scene);
  idleAnimationAction = idleAnimationMixer.clipAction(clip);
  idleAnimationAction.setEffectiveTimeScale(0.92);
  idleAnimationAction.play();
  idleAnimationMixer.update(0);
  setVrmSceneVisibility(true);
}

function handleIdleAnimationFinished(event) {
  if (!idleAnimationIntroAction || event.action !== idleAnimationIntroAction) {
    return;
  }

  if (flushPendingSelectedPoseReapplyAfterIntro()) {
    isAppearingAnimationActive = false;
    return;
  }

  if (idleAnimationAction && isIdleMotionActive()) {
    if (!idleAnimationLoopTransitionPrimed) {
      idleAnimationLoopTransitionPrimed = true;
      idleAnimationAction.reset();
      alignIdleWaitingActionToLoopStart(idleAnimationAction);
      idleAnimationAction.enabled = true;
      idleAnimationAction.play();
      idleAnimationAction.crossFadeFrom(
        idleAnimationIntroAction,
        IDLE_INTRO_TO_WAITING_BLEND_SECONDS,
        false,
      );
    }

    return;
  }

  isAppearingAnimationActive = false;
  idleAnimationIntroAction.stop();
  idleAnimationIntroAction = null;

  clearIdleAnimationState();
  if (isIdleMotionActive()) {
    ensureLegacyWaitingAnimation();
    return;
  }

  restoreDefaultBonePose();
  setVrmSceneVisibility(true);
}

function startBundledIdleAnimationSequence(vrm, { introClip = null, waitingClip = null } = {}) {
  if (!vrm || (!introClip && !waitingClip)) {
    return false;
  }

  clearIdleAnimationState();
  idleAnimationLoopTransitionPrimed = false;
  isAppearingAnimationActive = Boolean(introClip);

  idleAnimationMixer = new THREE.AnimationMixer(vrm.scene);
  idleAnimationMixer.addEventListener('finished', handleIdleAnimationFinished);

  if (waitingClip) {
    idleAnimationAction = idleAnimationMixer.clipAction(waitingClip);
    idleAnimationAction.setLoop(THREE.LoopRepeat, Infinity);
    idleAnimationAction.clampWhenFinished = false;
    idleAnimationAction.enabled = true;
  }

  if (introClip) {
    idleAnimationIntroAction = idleAnimationMixer.clipAction(introClip);
    idleAnimationIntroAction.setLoop(THREE.LoopOnce, 1);
    idleAnimationIntroAction.clampWhenFinished = true;
    idleAnimationIntroAction.enabled = true;
    idleAnimationIntroAction.reset();
    idleAnimationIntroAction.play();
  } else if (idleAnimationAction) {
    idleAnimationAction.reset();
    alignIdleWaitingActionToLoopStart(idleAnimationAction);
    idleAnimationAction.play();
  }

  idleAnimationMixer.update(0);
  setVrmSceneVisibility(true, vrm);

  return true;
}

function alignIdleWaitingActionToLoopStart(action) {
  if (!action) {
    return;
  }

  const clipDuration = action.getClip?.()?.duration ?? 0;
  const maxLoopStartTime = Math.max(clipDuration - (1 / 60), 0);
  action.time = Math.min(IDLE_WAITING_LOOP_START_SECONDS, maxLoopStartTime);
}

function maybeFinalizeIdleLoopTransition() {
  if (
    !idleAnimationMixer
    || !idleAnimationIntroAction
    || !idleAnimationLoopTransitionPrimed
  ) {
    return;
  }

  if (idleAnimationIntroAction.getEffectiveWeight() > 0.001) {
    return;
  }

  isAppearingAnimationActive = false;
  idleAnimationIntroAction.stop();
  idleAnimationIntroAction = null;
  idleAnimationLoopTransitionPrimed = false;
}

async function ensurePreferredWaitingAnimation(options = {}) {
  const { playIntro = false, allowWaiting = true } = options;

  if (!currentVrm || idleAnimationAction || idleAnimationIntroAction || idleAnimationLoadPromise) {
    return;
  }

  const vrm = currentVrm;
  const requestToken = idleAnimationSequenceToken + 1;
  idleAnimationSequenceToken = requestToken;
  const shouldLoadWaitingClip = Boolean(allowWaiting);

  const loadPromise = (async () => {
    const [waitingClip, introClip] = await Promise.all([
      shouldLoadWaitingClip ? createBundledVrmAnimationClip('waiting', vrm) : Promise.resolve(null),
      playIntro ? createBundledVrmAnimationClip('appearing', vrm) : Promise.resolve(null),
    ]);

    if (requestToken !== idleAnimationSequenceToken || currentVrm !== vrm) {
      return;
    }

    if (playIntro && !introClip) {
      isAppearingAnimationActive = false;
    }

    if (playIntro && !introClip && flushPendingSelectedPoseReapplyAfterIntro()) {
      return;
    }

    if (startBundledIdleAnimationSequence(vrm, { introClip, waitingClip })) {
      return;
    }

    if (shouldLoadWaitingClip) {
      ensureLegacyWaitingAnimation();
      return;
    }

    restoreDefaultBonePose();
    setVrmSceneVisibility(true, vrm);
  })().catch((error) => {
    if (requestToken !== idleAnimationSequenceToken || currentVrm !== vrm) {
      return;
    }

    if (playIntro) {
      isAppearingAnimationActive = false;
    }

    if (playIntro && flushPendingSelectedPoseReapplyAfterIntro()) {
      return;
    }

    console.warn('[VRMA] Falling back to legacy waiting motion.', error);
    if (shouldLoadWaitingClip) {
      ensureLegacyWaitingAnimation();
      return;
    }

    restoreDefaultBonePose();
    setVrmSceneVisibility(true, vrm);
  });

  idleAnimationLoadPromise = loadPromise;

  try {
    await loadPromise;
  } finally {
    if (idleAnimationLoadPromise === loadPromise) {
      idleAnimationLoadPromise = null;
    }
  }
}

function setModelFields(fields) {
  modelFieldNodes.forEach((node) => {
    const key = node.dataset.modelField;
    node.textContent = fields[key] ?? '-';
  });
}

function refreshEyeLookFallbackBones() {
  const humanoid = currentVrm?.humanoid;
  if (!humanoid) {
    eyeLookFallbackBones = [];
    return;
  }

  eyeLookFallbackBones = ['leftEye', 'rightEye']
    .map((boneName) => {
      const bone = humanoid.getNormalizedBoneNode?.(boneName) || humanoid.getRawBoneNode?.(boneName);
      if (!bone) {
        return null;
      }

      return {
        boneName,
        bone,
        restQuaternion: bone.quaternion.clone(),
      };
    })
    .filter(Boolean);
}

function hasReliableNativeLookAt(vrm = currentVrm) {
  const lookAt = vrm?.lookAt;
  if (!lookAt) {
    return false;
  }

  const applierType = lookAt.applier?.type || '';
  if (applierType === 'bone') {
    const humanoid = vrm?.humanoid;
    return Boolean(
      humanoid?.getRawBoneNode?.('leftEye')
      && humanoid?.getRawBoneNode?.('rightEye')
    );
  }

  if (applierType === 'expression') {
    const manager = vrm?.expressionManager;
    const requiredExpressions = ['lookLeft', 'lookRight', 'lookUp', 'lookDown'];
    return requiredExpressions.every((name) => Boolean(manager?.getExpression?.(name)));
  }

  return false;
}

function shouldUseNativeLookAt() {
  return Boolean(lookAtEnabled && hasReliableNativeLookAt(currentVrm));
}

function restoreEyeLookFallback() {
  eyeLookFallbackBones.forEach((entry) => {
    entry.bone.quaternion.copy(entry.restQuaternion);
  });
}

function applyEyeLookFallback() {
  const isVrmAnimationDrivingLookAt = isBundledVrmAnimationDrivingLookAt();
  if (
    !lookAtEnabled
    || !eyeLookFallbackBones.length
    || activePoseTool === 'bone'
    || shouldUseNativeLookAt()
    || isVrmAnimationDrivingLookAt
  ) {
    if (isVrmAnimationDrivingLookAt) {
      restoreEyeLookFallback();
    }
    return;
  }

  const eyeForward = String(currentVrm?.meta?.metaVersion ?? '').startsWith('0')
    ? LOOK_AT_FORWARD_VRM0
    : LOOK_AT_FORWARD_VRM1;

  camera.updateMatrixWorld(true);
  camera.getWorldPosition(lookAtCameraWorldPosition);

  eyeLookFallbackBones.forEach((entry) => {
    const { bone, restQuaternion } = entry;
    const parent = bone.parent;
    if (!parent) {
      return;
    }

    parent.updateWorldMatrix(true, false);
    lookAtParentTargetPosition.copy(lookAtCameraWorldPosition);
    parent.worldToLocal(lookAtParentTargetPosition);

    lookAtEyeDirection.copy(lookAtParentTargetPosition).sub(bone.position);
    if (lookAtEyeDirection.lengthSq() < 1e-8) {
      bone.quaternion.copy(restQuaternion);
      return;
    }

    lookAtEyeDirection.normalize();
    lookAtEyeQuaternion.setFromUnitVectors(eyeForward, lookAtEyeDirection);
    lookAtEyeEuler.setFromQuaternion(lookAtEyeQuaternion, 'YXZ');
    lookAtEyeEuler.y = THREE.MathUtils.clamp(lookAtEyeEuler.y, -LOOK_AT_MAX_YAW, LOOK_AT_MAX_YAW);
    lookAtEyeEuler.x = THREE.MathUtils.clamp(lookAtEyeEuler.x, -LOOK_AT_MAX_PITCH_UP, LOOK_AT_MAX_PITCH_DOWN);
    lookAtEyeEuler.z = 0;
    lookAtEyeQuaternion.setFromEuler(lookAtEyeEuler);

    bone.quaternion.copy(restQuaternion).multiply(lookAtEyeQuaternion);
  });
}

function getModelHitFromPointerEvent(event) {
  if (!currentVrm) {
    return null;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const meshHit = raycaster
    .intersectObject(currentVrm.scene, true)
    .find((hit) => hit.object?.isMesh && hit.object.visible) || null;
  if (meshHit) {
    return meshHit;
  }

  const bounds = getModelScreenBounds();
  if (!bounds) {
    return null;
  }

  const fallbackMargin = 18;
  const isInsideProjectedBounds = (
    event.clientX >= bounds.left - fallbackMargin
    && event.clientX <= bounds.right + fallbackMargin
    && event.clientY >= bounds.top - fallbackMargin
    && event.clientY <= bounds.bottom + fallbackMargin
  );
  if (!isInsideProjectedBounds) {
    return null;
  }

  modelInteractionFallbackBox.setFromObject(currentVrm.scene);
  if (modelInteractionFallbackBox.isEmpty()) {
    return null;
  }

  modelInteractionFallbackBox.getCenter(modelInteractionFallbackCenter);
  modelInteractionFallbackBox.getSize(modelInteractionFallbackSize);
  modelInteractionFallbackCenter.y = (
    modelInteractionFallbackBox.min.y + (modelInteractionFallbackSize.y * 0.62)
  );

  return {
    object: {
      isMesh: true,
      visible: true,
      name: '[model-bounds-fallback]',
    },
    point: modelInteractionFallbackCenter.clone(),
    distance: camera.position.distanceTo(modelInteractionFallbackCenter),
    userData: {
      synthetic: true,
      source: 'screen-bounds-fallback',
    },
  };
}

function spawnHeartBurst(worldPoint, screenPoint = null) {
  if (!worldPoint && !screenPoint) {
    return;
  }

  const stageRect = stageShell.getBoundingClientRect();
  let centerX;
  let centerY;

  if (screenPoint) {
    centerX = screenPoint.clientX - stageRect.left;
    centerY = screenPoint.clientY - stageRect.top;
  } else {
    const viewportRect = viewport.getBoundingClientRect();
    const projectedPoint = worldPoint.clone().project(camera);
    centerX = viewportRect.left - stageRect.left + ((projectedPoint.x + 1) * 0.5 * viewportRect.width);
    centerY = viewportRect.top - stageRect.top + ((1 - projectedPoint.y) * 0.5 * viewportRect.height);
  }

  const particleCount = 8;
  const glyphs = ['\u2665', '\u2661', '\u2665', '\u2661', '\u2665', '\u2665', '\u2661', '\u2665'];
  const colors = ['#ff5f97', '#ff7aa2', '#ff8fb8', '#ff6f61', '#ff9bc5', '#ff7998'];

  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement('span');
    const angle = (-Math.PI / 2) + (((index - ((particleCount - 1) / 2)) / particleCount) * Math.PI * 0.9) + ((Math.random() - 0.5) * 0.36);
    const distance = 56 + Math.random() * 44;

    particle.className = 'heart-burst-particle';
    particle.textContent = glyphs[index % glyphs.length];
    particle.style.left = `${centerX + (Math.random() - 0.5) * 14}px`;
    particle.style.top = `${centerY + (Math.random() - 0.5) * 18}px`;
    particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--dy', `${Math.sin(angle) * distance - (34 + Math.random() * 24)}px`);
    particle.style.setProperty('--size', `${18 + Math.random() * 18}px`);
    particle.style.setProperty('--duration', `${760 + Math.random() * 320}ms`);
    particle.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
    particle.style.setProperty('--rotate-start', `${-18 + Math.random() * 36}deg`);
    particle.style.setProperty('--rotate-end', `${-28 + Math.random() * 56}deg`);
    particle.style.setProperty('--scale-end', `${1 + Math.random() * 0.45}`);
    particle.addEventListener('animationend', () => {
      particle.remove();
    }, { once: true });

    stageShell.appendChild(particle);
  }
}

function updateLookAtTarget() {
  if (isBundledVrmAnimationDrivingLookAt()) {
    return;
  }

  if (!shouldUseNativeLookAt() || currentVrm?.lookAt?.target !== lookAtTarget) {
    return;
  }

  camera.updateMatrixWorld(true);
  camera.getWorldPosition(lookAtTarget.position);
  lookAtTarget.updateMatrixWorld(true);
}

function restoreStateAfterInteractionAnimation(vrm) {
  if (!vrm || currentVrm !== vrm) {
    return;
  }

  if (selectedPoseKey) {
    reapplySelectedPoseAfterLoad();
    setVrmSceneVisibility(true, vrm);
    return;
  }

  const shouldResumeIdleMotion = isIdleMotionActive() && !activePoseTool && !poseEditorMode;
  if (shouldResumeIdleMotion) {
    // Keep the default pose hidden while the waiting animation is being applied,
    // so the model does not briefly flash a visible T-stance after LIKED.
    restoreDefaultBonePose();
    setVrmSceneVisibility(false, vrm);
    void ensurePreferredWaitingAnimation({ allowWaiting: true });
    return;
  }

  restoreDefaultBonePose();
  setVrmSceneVisibility(true, vrm);
}

async function resumeIdleMotionAfterInteractionAnimation(vrm) {
  if (!vrm || currentVrm !== vrm) {
    return;
  }

  try {
    await ensurePreferredWaitingAnimation({ allowWaiting: true });
  } finally {
    if (!vrm || currentVrm !== vrm) {
      return;
    }

    clearInteractionAnimationState();

    if (!idleAnimationAction && !idleAnimationIntroAction && !idleAnimationLoadPromise) {
      restoreDefaultBonePose();
      setVrmSceneVisibility(true, vrm);
    }
  }
}

function handleInteractionAnimationFinished(event) {
  if (!interactionAnimationAction || event.action !== interactionAnimationAction) {
    return;
  }

  const vrm = currentVrm;
  const shouldResumeIdleMotionSmoothly = Boolean(
    vrm
    && !selectedPoseKey
    && isIdleMotionActive()
    && !activePoseTool
    && !poseEditorMode
  );

  if (shouldResumeIdleMotionSmoothly) {
    void resumeIdleMotionAfterInteractionAnimation(vrm);
    return;
  }

  clearInteractionAnimationState();
  restoreStateAfterInteractionAnimation(vrm);
}

async function triggerLikedInteraction(hitPoint, options = {}) {
  const { screenPoint = null } = options;
  console.log('[LIKED Debug] trigger requested', {
    hasCurrentVrm: Boolean(currentVrm),
    hasHitPoint: Boolean(hitPoint),
    hasScreenPoint: Boolean(screenPoint),
    isAppearingAnimationActive,
    hasInteractionAnimationAction: Boolean(interactionAnimationAction),
    hasInteractionAnimationLoadPromise: Boolean(interactionAnimationLoadPromise),
    selectedPoseKey,
    idleMotionEnabled,
    idleMotionToggleChecked: idleMotionToggle?.checked,
  });

  if (
    !currentVrm
    || !hitPoint
    || isAppearingAnimationActive
    || interactionAnimationAction
    || interactionAnimationLoadPromise
  ) {
    console.log('[LIKED Debug] trigger blocked', {
      missingVrm: !currentVrm,
      missingHitPoint: !hitPoint,
      blockedByAppearing: isAppearingAnimationActive,
      blockedByPlayingInteraction: Boolean(interactionAnimationAction),
      blockedByLoadingInteraction: Boolean(interactionAnimationLoadPromise),
    });
    return;
  }

  const vrm = currentVrm;
  const requestToken = interactionAnimationToken + 1;
  interactionAnimationToken = requestToken;

  stopLegacyWaitingAnimation();
  spawnHeartBurst(hitPoint, screenPoint);

  const loadPromise = (async () => {
    console.log('[LIKED Debug] loading liked clip...');
    const likedClip = await createBundledVrmAnimationClip('liked', vrm);

    if (requestToken !== interactionAnimationToken || currentVrm !== vrm) {
      console.log('[LIKED Debug] liked clip ignored due to stale request.');
      return;
    }

    if (!likedClip) {
      console.warn('[LIKED Debug] liked clip was not created.');
      restoreStateAfterInteractionAnimation(vrm);
      return;
    }

    console.log('[LIKED Debug] liked clip ready', {
      name: likedClip.name,
      duration: likedClip.duration,
      trackCount: Array.isArray(likedClip.tracks) ? likedClip.tracks.length : 0,
      hasExpressionTracks: Boolean(likedClip.userData?.hasExpressionTracks),
      hasLookAtTrack: Boolean(likedClip.userData?.hasLookAtTrack),
    });

    clearInteractionAnimationState();
    interactionAnimationMixer = new THREE.AnimationMixer(vrm.scene);
    interactionAnimationMixer.addEventListener('finished', handleInteractionAnimationFinished);
    interactionAnimationAction = interactionAnimationMixer.clipAction(likedClip);
    interactionAnimationAction.setLoop(THREE.LoopOnce, 1);
    interactionAnimationAction.clampWhenFinished = true;
    interactionAnimationAction.enabled = true;
    interactionAnimationAction.reset();
    interactionAnimationAction.play();
    interactionAnimationMixer.update(0);
    setVrmSceneVisibility(true, vrm);
    console.log('[LIKED Debug] interaction animation started.');
  })().catch((error) => {
    if (requestToken !== interactionAnimationToken || currentVrm !== vrm) {
      return;
    }

    console.warn('[VRMA] Failed to play LIKED interaction.', error);
    restoreStateAfterInteractionAnimation(vrm);
  });

  interactionAnimationLoadPromise = loadPromise;

  try {
    await loadPromise;
  } finally {
    if (interactionAnimationLoadPromise === loadPromise) {
      interactionAnimationLoadPromise = null;
    }
  }
}

function handleModelDoubleClick(event) {
  console.log('[LIKED Debug] native dblclick received', {
    hasCurrentVrm: Boolean(currentVrm),
    isAppearingAnimationActive,
    activePoseTool,
    poseEditorMode,
    clientX: event.clientX,
    clientY: event.clientY,
  });

  if (!currentVrm || isAppearingAnimationActive || activePoseTool || poseEditorMode) {
    console.log('[LIKED Debug] native dblclick blocked', {
      missingVrm: !currentVrm,
      blockedByAppearing: isAppearingAnimationActive,
      blockedByActivePoseTool: Boolean(activePoseTool),
      blockedByPoseEditorMode: poseEditorMode,
    });
    return;
  }

  const hit = getModelHitFromPointerEvent(event);
  console.log('[LIKED Debug] native dblclick hit test', {
    hitObjectName: hit?.object?.name || null,
    hitDistance: hit?.distance ?? null,
    hitPoint: hit?.point ? hit.point.toArray() : null,
    isSyntheticHit: Boolean(hit?.userData?.synthetic),
    syntheticSource: hit?.userData?.source || null,
  });
  if (!hit?.point) {
    return;
  }

  modelInteractionWorldPoint.copy(hit.point);
  event.preventDefault();
  event.stopPropagation();
  void triggerLikedInteraction(
    modelInteractionWorldPoint.clone(),
    {
      screenPoint: {
        clientX: event.clientX,
        clientY: event.clientY,
      },
    },
  );
}

function handleModelInteractionPointerDown(event) {
  modelPointerDownClientX = event.clientX;
  modelPointerDownClientY = event.clientY;
  console.log('[LIKED Debug] pointerdown recorded', {
    clientX: event.clientX,
    clientY: event.clientY,
  });
}

function handleModelInteractionPointerUp(event) {
  console.log('[LIKED Debug] pointerup received', {
    hasCurrentVrm: Boolean(currentVrm),
    isAppearingAnimationActive,
    activePoseTool,
    poseEditorMode,
    clientX: event.clientX,
    clientY: event.clientY,
  });

  if (!currentVrm || isAppearingAnimationActive || activePoseTool || poseEditorMode) {
    console.log('[LIKED Debug] pointerup blocked', {
      missingVrm: !currentVrm,
      blockedByAppearing: isAppearingAnimationActive,
      blockedByActivePoseTool: Boolean(activePoseTool),
      blockedByPoseEditorMode: poseEditorMode,
    });
    return;
  }

  const pointerTravel = Math.hypot(
    event.clientX - modelPointerDownClientX,
    event.clientY - modelPointerDownClientY,
  );
  console.log('[LIKED Debug] pointerup travel', {
    pointerTravel,
    threshold: MODEL_INTERACTION_MAX_MOVE_PX,
  });
  if (pointerTravel > MODEL_INTERACTION_MAX_MOVE_PX) {
    return;
  }

  const hit = getModelHitFromPointerEvent(event);
  console.log('[LIKED Debug] pointerup hit test', {
    hitObjectName: hit?.object?.name || null,
    hitDistance: hit?.distance ?? null,
    hitPoint: hit?.point ? hit.point.toArray() : null,
    isSyntheticHit: Boolean(hit?.userData?.synthetic),
    syntheticSource: hit?.userData?.source || null,
  });
  if (!hit?.point) {
    return;
  }

  const now = performance.now();
  const tapDistance = Math.hypot(
    event.clientX - lastModelTapClientX,
    event.clientY - lastModelTapClientY,
  );
  const isDoubleTap = (
    now - lastModelTapAt <= MODEL_INTERACTION_DOUBLE_TAP_MS
    && tapDistance <= MODEL_INTERACTION_MAX_MOVE_PX * 1.5
  );
  console.log('[LIKED Debug] double tap evaluation', {
    now,
    lastModelTapAt,
    deltaMs: now - lastModelTapAt,
    thresholdMs: MODEL_INTERACTION_DOUBLE_TAP_MS,
    tapDistance,
    tapDistanceThreshold: MODEL_INTERACTION_MAX_MOVE_PX * 1.5,
    isDoubleTap,
  });

  lastModelTapAt = now;
  lastModelTapClientX = event.clientX;
  lastModelTapClientY = event.clientY;

  if (!isDoubleTap) {
    return;
  }

  lastModelTapAt = 0;
  modelInteractionWorldPoint.copy(hit.point);
  event.preventDefault();
  event.stopPropagation();
  void triggerLikedInteraction(
    modelInteractionWorldPoint.clone(),
    {
      screenPoint: {
        clientX: event.clientX,
        clientY: event.clientY,
      },
    },
  );
}

function setStatus(message) {
  setModelFields({
    ...normalizeMeta(currentVrm),
    status: message,
  });
}

function setMeta(fields = {}) {
  setModelFields({
    status: fields.status || '-',
    title: fields.title || '-',
    author: fields.author || '-',
    version: fields.version || '-',
    avatarPermission: fields.avatarPermission || '-',
    violentUsage: fields.violentUsage || '-',
    sexualUsage: fields.sexualUsage || '-',
    commercialUsage: fields.commercialUsage || '-',
    creditNotation: fields.creditNotation || '-',
    redistribution: fields.redistribution || '-',
    modification: fields.modification || '-',
    contact: fields.contact || '-',
    reference: fields.reference || '-',
    license: fields.license || '-',
    otherPermissionUrl: fields.otherPermissionUrl || '-',
    otherLicenseUrl: fields.otherLicenseUrl || '-',
  });
}

function clonePoseData(poseData) {
  if (!poseData || typeof poseData !== 'object') {
    return null;
  }

  return Object.fromEntries(
    Object.entries(poseData).map(([boneName, transform]) => [
      boneName,
      {
        ...(Array.isArray(transform?.rotation) ? { rotation: [...transform.rotation] } : {}),
        ...(Array.isArray(transform?.position) ? { position: [...transform.position] } : {}),
      },
    ]),
  );
}

function transformPoseRotationForY180(rotation) {
  if (!Array.isArray(rotation) || rotation.length !== 4) {
    return rotation;
  }

  const [x, y, z, w] = rotation;
  return [-x, y, -z, w];
}

function transformPosePositionForY180(position) {
  if (!Array.isArray(position) || position.length !== 3) {
    return position;
  }

  const [x, y, z] = position;
  return [-x, y, -z];
}

function convertPoseDataAcrossVrmFacing(poseData) {
  const cloned = clonePoseData(poseData);
  if (!cloned) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(cloned).map(([boneName, transform]) => [
      boneName,
      {
        ...(Array.isArray(transform?.rotation) ? { rotation: transformPoseRotationForY180(transform.rotation) } : {}),
        ...(Array.isArray(transform?.position) ? { position: transformPosePositionForY180(transform.position) } : {}),
      },
    ]),
  );
}

function normalizePoseDataForStorage(poseData, modelVersion = currentModelVersion) {
  const cloned = clonePoseData(poseData);
  if (!cloned) {
    return null;
  }

  return String(modelVersion).startsWith('0')
    ? convertPoseDataAcrossVrmFacing(cloned)
    : cloned;
}

function denormalizeStoredPoseDataForCurrentModel(poseData, modelVersion = currentModelVersion) {
  const cloned = clonePoseData(poseData);
  if (!cloned) {
    return null;
  }

  return String(modelVersion).startsWith('0')
    ? convertPoseDataAcrossVrmFacing(cloned)
    : cloned;
}

function getEditableRawBones() {
  const humanoid = currentVrm?.humanoid;
  if (!humanoid?.getRawBoneNode) {
    return [];
  }

  return EDITABLE_BONE_NAMES
    .map((boneName) => [boneName, humanoid.getRawBoneNode(boneName)])
    .filter(([, bone]) => Boolean(bone));
}

function getEditablePoseBones() {
  const humanoid = currentVrm?.humanoid;
  if (!humanoid) {
    return [];
  }

  return EDITABLE_BONE_NAMES
    .map((boneName) => {
      const rawBone = humanoid.getRawBoneNode?.(boneName) || null;
      const controlBone = humanoid.getNormalizedBoneNode?.(boneName) || rawBone;
      if (!controlBone) {
        return null;
      }

      return {
        boneName,
        rawBone: rawBone || controlBone,
        controlBone,
      };
    })
    .filter(Boolean);
}

function captureCurrentPoseSnapshot() {
  if (!currentVrm) {
    return null;
  }

  const normalizedPose = clonePoseData(currentVrm.humanoid?.getNormalizedPose?.());
  if (normalizedPose) {
    return {
      snapshotFormat: 'relative-normalized-pose-v2',
      position: [baseModelPosition.x, baseModelPosition.y, baseModelPosition.z],
      poseData: normalizePoseDataForStorage(normalizedPose),
    };
  }

  const rawPose = clonePoseData(currentVrm.humanoid?.getRawPose?.());
  if (rawPose) {
    return {
      snapshotFormat: 'relative-raw-pose-v1',
      position: [baseModelPosition.x, baseModelPosition.y, baseModelPosition.z],
      poseData: rawPose,
    };
  }

  const bones = Object.fromEntries(
    getEditableRawBones().map(([boneName, bone]) => [
      boneName,
      [bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w],
    ]),
  );

  return {
    position: [baseModelPosition.x, baseModelPosition.y, baseModelPosition.z],
    bones,
  };
}

function applyRelativeRawPoseData(poseData) {
  const humanoid = currentVrm?.humanoid;
  const vrm = currentVrm;
  if (!humanoid || !poseData || !vrm) {
    return;
  }

  const previousAutoUpdateHumanBones = humanoid.autoUpdateHumanBones;
  humanoid.autoUpdateHumanBones = false;

  if (typeof humanoid.resetRawPose === 'function') {
    humanoid.resetRawPose();
  } else if (typeof humanoid.resetPose === 'function') {
    humanoid.resetPose();
  }

  if (typeof humanoid.setRawPose === 'function') {
    humanoid.setRawPose(poseData);
  } else if (typeof humanoid.setPose === 'function') {
    humanoid.setPose(poseData);
  }

  humanoid.update?.();
  vrm.update?.(0);
  humanoid.autoUpdateHumanBones = previousAutoUpdateHumanBones;
}

function applyNormalizedPoseData(poseData) {
  const humanoid = currentVrm?.humanoid;
  const vrm = currentVrm;
  if (!humanoid || !poseData || !vrm) {
    return;
  }

  const previousAutoUpdateHumanBones = humanoid.autoUpdateHumanBones;
  humanoid.autoUpdateHumanBones = true;

  if (typeof humanoid.resetNormalizedPose === 'function') {
    humanoid.resetNormalizedPose();
  } else if (typeof humanoid.resetPose === 'function') {
    humanoid.resetPose();
  }

  if (typeof humanoid.setNormalizedPose === 'function') {
    humanoid.setNormalizedPose(poseData);
  } else if (typeof humanoid.setPose === 'function') {
    humanoid.setPose(poseData);
  } else if (typeof humanoid.setRawPose === 'function') {
    humanoid.autoUpdateHumanBones = false;
    humanoid.resetRawPose?.();
    humanoid.setRawPose(poseData);
  }

  humanoid.update?.();
  vrm.update?.(0);
  humanoid.autoUpdateHumanBones = previousAutoUpdateHumanBones;
}

function applyStoredSnapshotPose(snapshot) {
  if (!currentVrm || !snapshot) {
    return;
  }

  if (snapshot.snapshotFormat === 'relative-normalized-pose-v2' && snapshot.poseData) {
    const poseData = denormalizeStoredPoseDataForCurrentModel(snapshot.poseData);
    if (poseData) {
      applyNormalizedPoseData(poseData);
    }
    return;
  }

  if (snapshot.snapshotFormat === 'relative-normalized-pose-v1' && snapshot.poseData) {
    applyNormalizedPoseData(snapshot.poseData);
    return;
  }

  if (snapshot.snapshotFormat === 'relative-raw-pose-v1' && snapshot.poseData) {
    applyRelativeRawPoseData(snapshot.poseData);
    return;
  }

  getEditableRawBones().forEach(([boneName, bone]) => {
    const quaternion = snapshot.bones?.[boneName];
    if (!quaternion) {
      return;
    }

    bone.quaternion.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
  });
}

function restoreDefaultBonePose() {
  if (!defaultPoseSnapshot || !currentVrm) {
    return;
  }

  applyStoredSnapshotPose(defaultPoseSnapshot);

  baseModelPosition.fromArray(defaultPoseSnapshot.position);
  currentVrm.scene.position.copy(baseModelPosition);
  currentVrm.scene.rotation.copy(baseModelRotation);
  currentVrm.scene.scale.copy(baseModelScale);
  syncHumanoidPoseState();
}

function setPoseEditorVisible(isVisible) {
  poseEditorShell.hidden = !isVisible;
  poseAddShell.hidden = isVisible;
}

function syncPoseUiState() {
  const modelReady = Boolean(currentVrm);
  const editorOpen = Boolean(poseEditorMode);

  poseSaveButton.disabled = !modelReady;
  poseBoneButton.disabled = !modelReady;
  poseMoveButton.disabled = !modelReady;
  poseCloseEditButton.disabled = false;
  poseAddButton.disabled = !modelReady;
  poseNameInput.disabled = !modelReady;

  if (!editorOpen) {
    poseNameInput.value = '';
  }
}

function setPoseTool(toolName) {
  activePoseTool = toolName;
  poseBoneButton.classList.toggle('is-active', toolName === 'bone');
  poseMoveButton.classList.toggle('is-active', toolName === 'move');

  if (!currentVrm || !poseEditorMode) {
    poseMarkerGroup.visible = false;
    moveControlAnchor.visible = false;
    transformControls.detach();
    transformControls.visible = false;
    transformControlsHelper.visible = false;
    syncHumanoidPoseState();
    return;
  }

  if (toolName === 'bone') {
    poseMarkerGroup.visible = true;
    moveControlAnchor.visible = false;
    transformControls.setMode('rotate');
    transformControls.setSpace('local');

    const fallbackBoneName = activePoseBoneName || getEditablePoseBones()[0]?.boneName || null;
    if (fallbackBoneName) {
      activePoseBoneName = fallbackBoneName;
      const targetBone = currentVrm.humanoid?.getNormalizedBoneNode?.(activePoseBoneName)
        || currentVrm.humanoid?.getRawBoneNode?.(activePoseBoneName);
      if (targetBone) {
        transformControls.attach(targetBone);
        transformControls.visible = true;
        transformControlsHelper.visible = true;
      }
    }
    syncHumanoidPoseState();
    return;
  }

  poseMarkerGroup.visible = false;

  if (toolName === 'move') {
    moveControlAnchor.visible = true;
    placeMoveControlAnchor();
    transformControls.setMode('translate');
    transformControls.setSpace('world');
    transformControls.attach(moveControlAnchor);
    transformControls.visible = true;
    transformControlsHelper.visible = true;
    syncHumanoidPoseState();
    return;
  }

  moveControlAnchor.visible = false;
  transformControls.detach();
  transformControls.visible = false;
  transformControlsHelper.visible = false;
  syncHumanoidPoseState();
}

function closePoseEditor() {
  poseEditorMode = null;
  activePoseBoneName = null;
  poseNameInput.value = '';
  setPoseEditorVisible(false);
  setPoseTool(null);
  syncPoseUiState();
}

function openPoseEditor(mode, pose = null) {
  poseEditorMode = mode;
  poseNameInput.value = pose?.name || '';
  setPoseEditorVisible(true);
  setPoseTool(null);
  syncPoseUiState();
  poseNameInput.focus();
  poseNameInput.select();
}

function selectCustomPose(poseId) {
  selectedCustomPoseId = poseId;
  selectedPoseKey = poseId ? getPoseKey('custom', poseId) : null;
  renderPoseList();
}

function setVrmSceneVisibility(isVisible, vrm = currentVrm) {
  if (!vrm?.scene) {
    return;
  }

  vrm.scene.visible = isVisible;
}

function clearSelectedPoseState() {
  pendingSelectedPoseReapplyAfterIntro = false;
  selectedPoseKey = null;
  selectedCustomPoseId = null;
}

function resumeIdleMotionFromDefaultPose({ enableIdleMotion = false } = {}) {
  clearSelectedPoseState();

  if (enableIdleMotion) {
    idleMotionEnabled = true;
    idleMotionToggle.checked = true;
  }

  closePoseEditor();
  renderPoseList();

  if (!currentVrm) {
    return;
  }

  setVrmSceneVisibility(true);
  stopLegacyWaitingAnimation();
  restoreDefaultBonePose();

  if (!idleMotionEnabled) {
    return;
  }

  void ensurePreferredWaitingAnimation();
}

function applyPoseSnapshot(snapshot) {
  if (!currentVrm || !snapshot) {
    return;
  }

  setVrmSceneVisibility(true);
  pendingSelectedPoseReapplyAfterIntro = false;
  stopLegacyWaitingAnimation();
  restoreDefaultBonePose();
  applyStoredSnapshotPose(snapshot);

  if (Array.isArray(snapshot.position) && snapshot.position.length === 3) {
    baseModelPosition.fromArray(snapshot.position);
    currentVrm.scene.position.copy(baseModelPosition);
  }

  if (activePoseTool === 'move') {
    placeMoveControlAnchor();
  }

  syncHumanoidPoseState();
}

function applyBuiltInPose(preset) {
  if (!currentVrm) {
    return;
  }

  setVrmSceneVisibility(true);
  pendingSelectedPoseReapplyAfterIntro = false;
  stopLegacyWaitingAnimation();
  const poseSpec = getBuiltInPoseSpec(preset);
  const presetLabel = getBuiltInPoseLabel(preset);

  window.__vrmLastBuiltInPoseRequest = {
    presetId: preset.id,
    presetName: presetLabel,
    currentModelVersion,
    poseMode: poseSpec.mode,
    lookAtEnabled,
    selectedPoseKeyBefore: selectedPoseKey,
    timestamp: Date.now(),
  };
  console.log('[VRM Built-in Pose] apply start', window.__vrmLastBuiltInPoseRequest);

  logPoseDebug('before-restore-default-pose', {
    presetId: preset.id,
    presetName: presetLabel,
  });
  restoreDefaultBonePose();
  logPoseDebug('after-restore-default-pose', {
    presetId: preset.id,
    presetName: presetLabel,
  });

  if (poseSpec.mode === 'legacy-pose-data' && poseSpec.poseData) {
    applyLegacyPoseData(poseSpec.poseData);
    selectedPoseKey = getPoseKey('builtin', preset.id);
    selectedCustomPoseId = null;
    renderPoseList();

    if (activePoseTool === 'move') {
      placeMoveControlAnchor();
    }

    syncHumanoidPoseState();
    window.__vrmLastBuiltInPoseResult = {
      presetId: preset.id,
      presetName: presetLabel,
      selectedPoseKeyAfter: selectedPoseKey,
      mode: poseSpec.mode,
      lookAtEnabled,
      timestamp: Date.now(),
    };
    console.log('[VRM Built-in Pose] apply done', window.__vrmLastBuiltInPoseResult);
    logPoseDebug('after-apply-built-in-pose', {
      presetId: preset.id,
      presetName: presetLabel,
      mode: poseSpec.mode,
    });
    return;
  }

  if (poseSpec.mode === 'normalized-pose-data' && poseSpec.poseData) {
    const normalizedPoseData = convertPoseDataAcrossVrmFacing(poseSpec.poseData) || poseSpec.poseData;
    applyNormalizedPoseData(normalizedPoseData);
    selectedPoseKey = getPoseKey('builtin', preset.id);
    selectedCustomPoseId = null;
    renderPoseList();

    if (activePoseTool === 'move') {
      placeMoveControlAnchor();
    }

    syncHumanoidPoseState();
    window.__vrmLastBuiltInPoseResult = {
      presetId: preset.id,
      presetName: presetLabel,
      selectedPoseKeyAfter: selectedPoseKey,
      mode: poseSpec.mode,
      lookAtEnabled,
      timestamp: Date.now(),
    };
    console.log('[VRM Built-in Pose] apply done', window.__vrmLastBuiltInPoseResult);
    logPoseDebug('after-apply-built-in-pose', {
      presetId: preset.id,
      presetName: presetLabel,
      mode: poseSpec.mode,
    });
    return;
  }

  const humanoid = currentVrm?.humanoid;
  const previousAutoUpdateHumanBones = humanoid?.autoUpdateHumanBones;
  if (humanoid) {
    humanoid.autoUpdateHumanBones = true;
  }

  getEditablePoseBones().forEach(({ boneName, controlBone }) => {
    const override = poseSpec.overrides?.[boneName];
    if (!override) {
      return;
    }

    const deltaQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(override[0], override[1], override[2], 'XYZ'),
    );

    controlBone.quaternion.multiply(deltaQuaternion);
  });

  humanoid?.update?.();
  currentVrm?.update?.(0);
  if (humanoid) {
    humanoid.autoUpdateHumanBones = previousAutoUpdateHumanBones;
  }

  selectedPoseKey = getPoseKey('builtin', preset.id);
  selectedCustomPoseId = null;
  renderPoseList();

  if (activePoseTool === 'move') {
    placeMoveControlAnchor();
  }

  syncHumanoidPoseState();
  window.__vrmLastBuiltInPoseResult = {
    presetId: preset.id,
    presetName: presetLabel,
    selectedPoseKeyAfter: selectedPoseKey,
    mode: poseSpec.mode,
    lookAtEnabled,
    timestamp: Date.now(),
  };
  console.log('[VRM Built-in Pose] apply done', window.__vrmLastBuiltInPoseResult);
  logPoseDebug('after-apply-built-in-pose', {
    presetId: preset.id,
    presetName: presetLabel,
    mode: poseSpec.mode,
  });
}

function syncHumanoidPoseState() {
  const humanoid = currentVrm?.humanoid;
  if (!humanoid) {
    return;
  }

  const selectedBuiltInPose = getSelectedBuiltInPose();
  const selectedBuiltInPoseSpec = selectedBuiltInPose ? getBuiltInPoseSpec(selectedBuiltInPose) : null;
  const shouldKeepLegacyPoseSynchronized = Boolean(
    selectedBuiltInPoseSpec?.mode === 'legacy-pose-data' && activePoseTool !== 'bone'
  );
  const shouldUseFallbackLookAt = Boolean(
    lookAtEnabled && eyeLookFallbackBones.length && activePoseTool !== 'bone' && !shouldUseNativeLookAt()
  );
  const shouldAutoUpdateHumanBones = Boolean(
    shouldKeepLegacyPoseSynchronized
    || shouldUseFallbackLookAt
    || activePoseTool === 'bone'
  );

  if (shouldAutoUpdateHumanBones && humanoid.getRawPose && humanoid.setNormalizedPose) {
    humanoid.setNormalizedPose(humanoid.getRawPose());
  }

  humanoid.autoUpdateHumanBones = shouldAutoUpdateHumanBones;
  logPoseDebug('after-sync-humanoid-pose-state', {
    shouldAutoUpdateHumanBones,
    shouldKeepLegacyPoseSynchronized,
    shouldUseFallbackLookAt,
    selectedBuiltInPoseId: selectedBuiltInPose?.id ?? null,
    selectedBuiltInPoseMode: selectedBuiltInPoseSpec?.mode ?? null,
  });
}

function createCircleLoop(radius, color, rotation) {
  const points = [];
  const segments = 48;

  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.72,
    depthTest: false,
    depthWrite: false,
  });
  const loop = new THREE.LineLoop(geometry, material);
  loop.rotation.set(rotation[0], rotation[1], rotation[2]);
  return loop;
}

function createPoseMarkers() {
  poseMarkerMeshes.forEach((mesh) => {
    poseMarkerGroup.remove(mesh);
    mesh.traverse((child) => {
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    });
  });
  poseMarkerMeshes = [];

  if (!currentVrm) {
    return;
  }

  getEditablePoseBones().forEach(({ boneName, rawBone, controlBone }) => {
    const marker = new THREE.Group();
    const ringRadius = 0.032;
    const ringConfigs = [
      { color: 0xff6b6b, rotation: [0, Math.PI / 2, 0] },
      { color: 0x4bd16f, rotation: [Math.PI / 2, 0, 0] },
      { color: 0x5a9cf1, rotation: [0, 0, 0] },
    ];

    ringConfigs.forEach((config, index) => {
      const ring = createCircleLoop(ringRadius, config.color, config.rotation);
      ring.renderOrder = 10 + index;
      ring.userData.boneName = boneName;
      ring.userData.controlBone = controlBone;
      ring.userData.rawBone = rawBone;
      marker.add(ring);
    });

    marker.userData.boneName = boneName;
    marker.userData.controlBone = controlBone;
    marker.userData.rawBone = rawBone;
    poseMarkerGroup.add(marker);
    poseMarkerMeshes.push(marker);
  });
}

function updatePoseMarkers() {
  if (!poseMarkerMeshes.length) {
    return;
  }

  poseMarkerMeshes.forEach((mesh) => {
    const rawBone = mesh.userData.rawBone;
    if (!rawBone) {
      return;
    }

    rawBone.getWorldPosition(mesh.position);
    camera.getWorldPosition(markerCameraPosition);
    markerWorldPosition.copy(mesh.position);
    const distance = markerCameraPosition.distanceTo(markerWorldPosition);
    const scale = THREE.MathUtils.clamp(0.075 + distance * 0.038, 0.16, 0.5);
    mesh.scale.setScalar(scale);
    const isSelected = activePoseBoneName === mesh.userData.boneName;
    mesh.children.forEach((child) => {
      if (child.material?.opacity !== undefined) {
        child.material.opacity = 0.52;
      }
    });
    mesh.visible = poseMarkerGroup.visible && !isSelected;
  });
}

function placeMoveControlAnchor() {
  if (!currentVrm) {
    return;
  }

  const box = new THREE.Box3().setFromObject(currentVrm.scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  moveControlAnchor.position.set(center.x, box.min.y + size.y * 0.55, center.z);
  lastMoveAnchorPosition.copy(moveControlAnchor.position);
}

function handlePoseMarkerPick(event) {
  if (activePoseTool !== 'bone' || !poseMarkerGroup.visible || !currentVrm) {
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hit = raycaster.intersectObjects(poseMarkerMeshes, true)[0];
  if (!hit?.object?.userData?.controlBone) {
    return;
  }

  activePoseBoneName = hit.object.userData.boneName;
  transformControls.attach(hit.object.userData.controlBone);
  transformControls.visible = true;
  updatePoseMarkers();
  event.stopPropagation();
}

function handlePoseListClick(event) {
  const target = event.target.closest('[data-pose-action]');
  if (!target) {
    return;
  }

  const { poseAction, poseId, poseKind } = target.dataset;
  console.log('[VRM Pose Click]', {
    poseAction,
    poseId,
    poseKind,
    selectedPoseKey,
  });

  if (poseAction === 'clear') {
    resumeIdleMotionFromDefaultPose({ enableIdleMotion: true });
    return;
  }

  if (poseKind === 'builtin') {
    const preset = BUILT_IN_POSES.find((item) => item.id === poseId);
    if (preset) {
      window.__vrmLastPoseClick = {
        poseAction,
        poseId,
        poseKind,
        timestamp: Date.now(),
      };
      applyBuiltInPose(preset);
    }
    return;
  }

  const pose = customPoses.find((item) => item.id === poseId);
  if (!pose) {
    return;
  }

  if (poseAction === 'select') {
    applyPoseSnapshot(pose.snapshot);
    selectCustomPose(pose.id);
    return;
  }

  if (poseAction === 'edit') {
    applyPoseSnapshot(pose.snapshot);
    selectCustomPose(pose.id);
    openPoseEditor('edit', pose);
    return;
  }

  if (poseAction === 'delete') {
    customPoses = customPoses.filter((item) => item.id !== pose.id);
    if (selectedCustomPoseId === pose.id) {
      selectedCustomPoseId = null;
    }
    if (selectedPoseKey === getPoseKey('custom', pose.id)) {
      selectedPoseKey = null;
    }
    saveCustomPoses();
    closePoseEditor();
    renderPoseList();
  }
}

function getPoseActionIcon(action) {
  if (action === 'edit') {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20l4.2-1 9-9-3.2-3.2-9 9z"></path>
        <path d="M12.8 5.8l3.2 3.2"></path>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14"></path>
      <path d="M9 7V5h6v2"></path>
      <path d="M8 10v8"></path>
      <path d="M12 10v8"></path>
      <path d="M16 10v8"></path>
      <path d="M6 7l1 13h10l1-13"></path>
    </svg>
  `;
}

function renderPoseList() {
  const clearPoseHtml = `
    <div class="pose-row${!selectedPoseKey ? ' is-selected' : ''}">
      <button class="pose-select-button" type="button" data-pose-action="clear">${escapeHtml(t('pose.clear'))}</button>
    </div>
  `;

  const builtInHtml = BUILT_IN_POSES.map((pose) => `
    <div class="pose-row${selectedPoseKey === getPoseKey('builtin', pose.id) ? ' is-selected' : ''}">
      <button class="pose-select-button" type="button" data-pose-action="select" data-pose-kind="builtin" data-pose-id="${pose.id}">${escapeHtml(getBuiltInPoseLabel(pose))}</button>
    </div>
  `).join('');

  const customHtml = customPoses.map((pose) => {
    if (selectedPoseKey === getPoseKey('custom', pose.id)) {
      return `
        <div class="pose-selected-row">
          <button class="pose-icon-button" type="button" data-pose-action="edit" data-pose-kind="custom" data-pose-id="${pose.id}" aria-label="${escapeHtml(t('pose.edit'))}">
            ${getPoseActionIcon('edit')}
          </button>
          <button class="pose-name-button" type="button" data-pose-action="select" data-pose-kind="custom" data-pose-id="${pose.id}">${escapeHtml(pose.name)}</button>
          <button class="pose-icon-button" type="button" data-pose-action="delete" data-pose-kind="custom" data-pose-id="${pose.id}" aria-label="${escapeHtml(t('pose.delete'))}">
            ${getPoseActionIcon('delete')}
          </button>
        </div>
      `;
    }

    return `
      <div class="pose-row">
        <button class="pose-select-button" type="button" data-pose-action="select" data-pose-kind="custom" data-pose-id="${pose.id}">${escapeHtml(pose.name)}</button>
      </div>
    `;
  }).join('');

  poseList.innerHTML = `${clearPoseHtml}${builtInHtml}${customHtml}`;
}

function savePoseFromEditor() {
  if (!currentVrm) {
    return;
  }

  const snapshot = captureCurrentPoseSnapshot();
  if (!snapshot) {
    return;
  }

  const name = poseNameInput.value.trim() || t('pose.customDefaultName');

  if (poseEditorMode === 'edit' && selectedCustomPoseId) {
    customPoses = customPoses.map((pose) => (
      pose.id === selectedCustomPoseId
        ? { ...pose, name, snapshot }
        : pose
    ));
  } else {
    const pose = {
      id: createPoseId(),
      name,
      snapshot,
    };
    customPoses.push(pose);
    selectedCustomPoseId = pose.id;
  }

  selectedPoseKey = selectedCustomPoseId ? getPoseKey('custom', selectedCustomPoseId) : null;
  saveCustomPoses();
  renderPoseList();
  closePoseEditor();
}

function setDownloadStatus(message) {
  downloadStatus.textContent = message;
}

function showDownloadResult(result) {
  currentDownloadResult = result || null;

  if (!result) {
    downloadResult.hidden = true;
    downloadResultUrl.textContent = '';
    downloadFileLink.removeAttribute('href');
    downloadFileLink.removeAttribute('download');
    return;
  }

  const finalUrl = result.downloadUrl || result.modelUrl || '';
  downloadResult.hidden = false;
  downloadResultUrl.textContent = finalUrl;
  downloadFileLink.href = finalUrl;
  downloadFileLink.download = inferFileNameFromUrl(finalUrl);
}

function setDownloadBusy(isBusy) {
  downloadSubmitButton.disabled = isBusy;
  downloadUrlInput.disabled = isBusy;
  downloadSubmitButton.textContent = isBusy ? t('download.working') : t('download.fetch');
}

function inferFileNameFromUrl(url) {
  try {
    const parsed = new URL(url, window.location.href);
    const parts = parsed.pathname.split('/');
    return decodeURIComponent(parts[parts.length - 1] || 'model.vrm');
  } catch {
    return 'model.vrm';
  }
}

function resolveExpressionName(control) {
  if (!currentVrm?.expressionManager) {
    return null;
  }

  return control.expressionNames.find((name) => currentVrm.expressionManager.getExpression(name)) || null;
}

function hasBlinkSupport() {
  return Boolean(resolveExpressionName(faceControls[0]) || resolveExpressionName(faceControls[1]) || resolveExpressionName(faceControls[2]));
}

function syncExpressionAvailability() {
  const lookAtAvailable = Boolean(currentVrm?.lookAt || eyeLookFallbackBones.length);
  const blinkAvailable = hasBlinkSupport();

  allExpressionControls.forEach((control) => {
    setControlEnabled(control, Boolean(resolveExpressionName(control)));
  });

  setToggleEnabled(toggleRows[0], lookAtAvailable);
  setToggleEnabled(toggleRows[1], blinkAvailable);
  lookAtToggle.checked = lookAtEnabled;
  autoBlinkToggle.checked = autoBlinkEnabled;

  applyLookAtState();
}

function revokeObjectUrl() {
  if (!currentObjectUrl) {
    return;
  }

  URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = null;
}

function disposeCurrentVrm() {
  if (!currentVrm) {
    return;
  }

  stopLegacyWaitingAnimation();
  stopInteractionAnimation();
  pendingSelectedPoseReapplyAfterIntro = false;

  if (currentVrm.lookAt) {
    currentVrm.lookAt.reset?.();
    currentVrm.lookAt.target = null;
  }

  restoreEyeLookFallback();

  scene.remove(currentVrm.scene);
  renderer.renderLists.dispose();
  renderer.resetState();
  VRMUtils.deepDispose(currentVrm.scene);

  currentVrm = null;
  currentModelVersion = '0';
  defaultPoseSnapshot = null;
  activePoseBoneName = null;
  eyeLookFallbackBones = [];
  lastModelTapAt = 0;
  syncPhotoCaptureButtonState();
  createPoseMarkers();
  setPoseTool(activePoseTool);
  syncPoseUiState();
}

function getFootAnchor() {
  const humanoid = currentVrm?.humanoid;
  if (!humanoid?.getRawBoneNode) {
    return null;
  }

  const boneNames = ['leftFoot', 'rightFoot', 'leftToes', 'rightToes'];
  const positions = boneNames
    .map((boneName) => humanoid.getRawBoneNode(boneName))
    .filter(Boolean)
    .map((bone) => bone.getWorldPosition(new THREE.Vector3()));

  if (!positions.length) {
    return null;
  }

  const anchor = new THREE.Vector3();
  positions.forEach((position) => anchor.add(position));
  anchor.divideScalar(positions.length);
  return anchor;
}

function alignModelToOrigin(root) {
  root.position.set(0, 0, 0);
  root.rotation.set(0, currentModelYaw, 0);
  root.scale.set(1, 1, 1);

  for (let index = 0; index < 2; index += 1) {
    root.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(root);
    const footAnchor = getFootAnchor();
    const center = box.getCenter(new THREE.Vector3());
    const anchorX = footAnchor?.x ?? center.x;
    const anchorZ = footAnchor?.z ?? center.z;

    root.position.x -= anchorX;
    root.position.z -= anchorZ;
    root.position.y -= box.min.y;
  }

  root.updateMatrixWorld(true);
}

function frameModel(root) {
  alignModelToOrigin(root);
  frameCameraToModel(root);

  baseModelPosition.copy(root.position);
  baseModelRotation.copy(root.rotation);
  baseModelScale.copy(root.scale);
}

function frameCameraToModel(root) {
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxSize = Math.max(size.x, size.y, size.z) || 1;
  const distance = Math.max(2.4, maxSize * 2.35);
  camera.position.set(
    center.x,
    Math.max(box.min.y + size.y * 0.58, 1.0),
    center.z + distance,
  );
  controls.target.set(
    center.x,
    box.min.y + size.y * 0.48,
    center.z,
  );
  controls.update();
}

function closePanel() {
  activePanel = null;
  panelCard.classList.add('is-collapsed');
  panelTitle.textContent = t('panel.default');
  setPoseTool(null);

  menuButtons.forEach((button) => {
    button.classList.remove('is-active');
  });

  panelViews.forEach((panel) => {
    panel.classList.remove('is-active');
  });
}

function setInfoVisible(isVisible) {
  infoCard.hidden = !isVisible;
}

function setChromeHidden(isHidden) {
  uiChromeHidden = isHidden;
  document.body.classList.toggle('chrome-hidden', uiChromeHidden);
  chromeToggleButton.classList.toggle('is-toggled', uiChromeHidden);
  chromeToggleButton.setAttribute('aria-label', uiChromeHidden ? t('aria.showInterface') : t('aria.hideInterface'));

  if (uiChromeHidden) {
    setInfoVisible(false);
    closePanel();
  }
}

function closeDownloadConsentDialog(accepted) {
  if (downloadConsentDialog) {
    downloadConsentDialog.hidden = true;
  }

  if (!downloadConsentResolver) {
    return;
  }

  const resolve = downloadConsentResolver;
  downloadConsentResolver = null;
  resolve(accepted);
}

function requestDownloadConsent() {
  if (!downloadConsentDialog || !downloadConsentAgreeButton || !downloadConsentRejectButton) {
    return Promise.resolve(true);
  }

  if (downloadConsentResolver) {
    closeDownloadConsentDialog(false);
  }

  downloadConsentDialog.hidden = false;

  return new Promise((resolve) => {
    downloadConsentResolver = resolve;
    downloadConsentAgreeButton.focus();
  });
}

function capturePhoto() {
  if (!currentVrm || photoCaptureInProgress) {
    return;
  }

  photoCaptureInProgress = true;
  syncPhotoCaptureButtonState();

  const previousBackground = scene.background;
  const previousClearColor = renderer.getClearColor(new THREE.Color()).clone();
  const previousClearAlpha = renderer.getClearAlpha();
  const previousGridVisible = gridHelper.visible;
  const previousAxesVisible = axesHelper.visible;
  const previousPoseMarkerVisible = poseMarkerGroup.visible;
  const previousMoveControlAnchorVisible = moveControlAnchor.visible;
  const previousTransformControlsVisible = transformControls.visible;
  const previousTransformControlsHelperVisible = transformControlsHelper.visible;

  try {
    document.body.classList.add('photo-capture');
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    gridHelper.visible = false;
    axesHelper.visible = false;
    poseMarkerGroup.visible = false;
    moveControlAnchor.visible = false;
    transformControls.visible = false;
    transformControlsHelper.visible = false;

    controls.update();
    renderer.render(scene, camera);

    const dataUrl = renderer.domElement.toDataURL('image/png');
    downloadDataUrl(dataUrl, createPhotoFileName());
  } catch (error) {
    console.error('[Photo Capture] Failed to export transparent PNG.', error);
  } finally {
    document.body.classList.remove('photo-capture');
    scene.background = previousBackground;
    renderer.setClearColor(previousClearColor, previousClearAlpha);
    gridHelper.visible = previousGridVisible;
    axesHelper.visible = previousAxesVisible;
    poseMarkerGroup.visible = previousPoseMarkerVisible;
    moveControlAnchor.visible = previousMoveControlAnchorVisible;
    transformControls.visible = previousTransformControlsVisible;
    transformControlsHelper.visible = previousTransformControlsHelperVisible;
    renderer.render(scene, camera);
    photoCaptureInProgress = false;
    syncPhotoCaptureButtonState();
  }
}

function resetBlinkState() {
  blinkPhase = 'waiting';
  blinkTimer = nextBlinkDelay();
  blinkElapsed = 0;
}

function updateAutoBlink(delta) {
  if (!autoBlinkEnabled || !hasBlinkSupport()) {
    resetBlinkState();
    return 0;
  }

  if (blinkPhase === 'waiting') {
    blinkTimer -= delta;
    if (blinkTimer <= 0) {
      blinkPhase = 'closing';
      blinkElapsed = 0;
    }
    return 0;
  }

  blinkElapsed += delta;

  if (blinkPhase === 'closing') {
    const weight = Math.min(blinkElapsed / 0.055, 1);
    if (weight >= 1) {
      blinkPhase = 'opening';
      blinkElapsed = 0;
    }
    return weight;
  }

  const weight = Math.max(1 - blinkElapsed / 0.09, 0);
  if (weight <= 0) {
    resetBlinkState();
    return 0;
  }

  return weight;
}

function applyLookAtState() {
  syncHumanoidPoseState();

  if (currentVrm?.lookAt) {
    currentVrm.lookAt.target = shouldUseNativeLookAt() ? lookAtTarget : null;
    currentVrm.lookAt.autoUpdate = shouldUseNativeLookAt();
  }

  if (!lookAtEnabled) {
    currentVrm?.lookAt?.reset?.();
    restoreEyeLookFallback();
  }

  logPoseDebug('after-apply-look-at-state', {
    lookAtEnabled,
    lookAtMode: shouldUseNativeLookAt() ? 'native' : (lookAtEnabled ? 'fallback' : 'off'),
  });
}

function applyExpressionState(autoBlinkWeight = 0) {
  const manager = currentVrm?.expressionManager;
  if (!manager || isBundledVrmAnimationDrivingExpressions()) {
    return;
  }

  emotionControls.forEach((control) => {
    const expressionName = resolveExpressionName(control);
    if (!expressionName) {
      return;
    }

    manager.setValue(expressionName, getSliderValue(control));
  });

  const blinkValue = Math.max(getSliderValue(faceControls[0]), autoBlinkWeight);
  const blinkRightValue = Math.max(getSliderValue(faceControls[1]), autoBlinkWeight);
  const blinkLeftValue = Math.max(getSliderValue(faceControls[2]), autoBlinkWeight);

  [
    [faceControls[0], blinkValue],
    [faceControls[1], blinkRightValue],
    [faceControls[2], blinkLeftValue],
    [faceControls[3], getSliderValue(faceControls[3])],
    [faceControls[4], getSliderValue(faceControls[4])],
    [faceControls[5], getSliderValue(faceControls[5])],
    [faceControls[6], getSliderValue(faceControls[6])],
    [faceControls[7], getSliderValue(faceControls[7])],
  ].forEach(([control, value]) => {
    const expressionName = resolveExpressionName(control);
    if (!expressionName) {
      return;
    }

    manager.setValue(expressionName, value);
  });
}

function updateIdleMotion(delta) {
  if (!currentVrm) {
    return;
  }

  currentVrm.scene.position.copy(baseModelPosition);
  currentVrm.scene.rotation.copy(baseModelRotation);
  currentVrm.scene.scale.copy(baseModelScale);

  if (interactionAnimationAction || interactionAnimationLoadPromise) {
    setVrmSceneVisibility(true);
    return;
  }

  const shouldDeferSelectedPoseReapply = Boolean(pendingSelectedPoseReapplyAfterIntro && selectedPoseKey);
  const shouldRunIdleMotion = isIdleMotionActive();
  const shouldKeepIntroPlaying = Boolean(idleAnimationIntroAction) && !activePoseTool && !poseEditorMode;
  const shouldKeepIntroLoading = Boolean(idleAnimationLoadPromise) && !shouldRunIdleMotion && !activePoseTool && !poseEditorMode;

  if ((!shouldRunIdleMotion && !shouldKeepIntroPlaying && !shouldKeepIntroLoading) || activePoseTool || poseEditorMode || (selectedPoseKey && !shouldDeferSelectedPoseReapply)) {
    setVrmSceneVisibility(true);
    if (shouldDeferSelectedPoseReapply) {
      flushPendingSelectedPoseReapplyAfterIntro();
    }
    stopLegacyWaitingAnimation();
    return;
  }

  if (!shouldRunIdleMotion && (shouldKeepIntroPlaying || shouldKeepIntroLoading)) {
    idleAnimationMixer?.update(Math.min(delta, MAX_IDLE_ANIMATION_DELTA));
    maybeFinalizeIdleLoopTransition();
    return;
  }

  void ensurePreferredWaitingAnimation({ allowWaiting: true });
  idleAnimationMixer?.update(Math.min(delta, MAX_IDLE_ANIMATION_DELTA));
  maybeFinalizeIdleLoopTransition();
}

async function loadVrm(url, label, options = {}) {
  setStatus(formatLoadingStatus(label));
  disposeCurrentVrm();
  stopInteractionAnimation();
  isAppearingAnimationActive = false;
  pendingSelectedPoseReapplyAfterIntro = false;
  const vrmLoader = createVrmLoader();

  try {
    const gltf = await vrmLoader.loadAsync(url, (progress) => {
      if (!progress.total) {
        return;
      }

      const ratio = Math.min(progress.loaded / progress.total, 1);
      setStatus(formatLoadingStatus(label, ratio));
    });

    const vrm = gltf.userData.vrm;
    if (!vrm) {
      throw new Error(t('error.noVrmExtension'));
    }

    const meta = normalizeMeta(vrm);
    const isVrm0 = String(meta.version).startsWith('0');
    currentModelVersion = isVrm0 ? '0' : '1';
    currentModelYaw = isVrm0 ? Math.PI : 0;

    if (isVrm0) {
      VRMUtils.rotateVRM0(vrm);
    }

    resetVrmToViewerDefaultPose(vrm, { isVrm0 });
    stabilizeLoadedVrmScene(vrm);
    const shouldPlayIntro = !activePoseTool && !poseEditorMode;
    const shouldAllowWaitingAfterIntro = isIdleMotionActive();
    isAppearingAnimationActive = shouldPlayIntro;
    setVrmSceneVisibility(!shouldPlayIntro, vrm);

    scene.add(vrm.scene);
    currentVrm = vrm;
    if (!shouldPlayIntro) {
      setVrmSceneVisibility(true, vrm);
    }
    syncPhotoCaptureButtonState();
    refreshEyeLookFallbackBones();
    frameModel(vrm.scene);
    defaultPoseSnapshot = captureCurrentPoseSnapshot();
    createPoseMarkers();
    const shouldDeferSelectedPoseReapply = Boolean(selectedPoseKey && shouldPlayIntro);
    pendingSelectedPoseReapplyAfterIntro = shouldDeferSelectedPoseReapply;
    const restoredSelectedPose = shouldDeferSelectedPoseReapply ? false : reapplySelectedPoseAfterLoad();
    if (restoredSelectedPose) {
      frameCameraToModel(vrm.scene);
    }
    syncPoseUiState();
    setMeta(meta);
    logVrmDiagnostics(vrm, meta);
    logVrmAnimationDiagnostics(gltf, vrm, meta);
    syncExpressionAvailability();
    applyExpressionState(0);
    setStatus(formatLoadedStatus(label, meta.title));

    if (shouldPlayIntro) {
      void ensurePreferredWaitingAnimation({ playIntro: true, allowWaiting: shouldAllowWaitingAfterIntro });
    }

    if (options.revealInfoOnLoad) {
      setChromeHidden(false);
      closePanel();
      setInfoVisible(true);
    }
  } catch (error) {
    isAppearingAnimationActive = false;
    pendingSelectedPoseReapplyAfterIntro = false;
    console.error(error);
    setMeta();
    syncExpressionAvailability();
    syncPoseUiState();
    setStatus(error instanceof Error ? error.message : String(error));
  }
}

function handleFiles(files) {
  const file = files?.[0];
  if (!file) {
    return;
  }

  revokeObjectUrl();
  currentObjectUrl = URL.createObjectURL(file);
  void loadVrm(currentObjectUrl, file.name, { revealInfoOnLoad: true });
}

async function loadSampleModelWithGuard() {
  const now = Date.now();
  if (sampleModelRequestInFlight || now - lastSampleModelRequestAt < SAMPLE_MODEL_REQUEST_COOLDOWN_MS) {
    return;
  }

  sampleModelRequestInFlight = true;
  lastSampleModelRequestAt = now;
  loadSampleButton.disabled = true;

  try {
    revokeObjectUrl();
    await loadVrm(SAMPLE_MODEL_URL, 'sample model', { revealInfoOnLoad: true });
  } finally {
    const remainingCooldown = Math.max(
      SAMPLE_MODEL_REQUEST_COOLDOWN_MS - (Date.now() - lastSampleModelRequestAt),
      0,
    );

    if (remainingCooldown > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, remainingCooldown));
    }

    sampleModelRequestInFlight = false;
    loadSampleButton.disabled = false;
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

function validateVroidUrl(value) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(t('error.invalidUrl'));
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'hub.vroid.com' && hostname !== 'www.hub.vroid.com') {
    throw new Error(t('error.useHubLink'));
  }

  if (!/\/characters\/|\/models\//i.test(parsed.pathname)) {
    throw new Error(t('error.invalidHubPage'));
  }

  return parsed.toString();
}

async function pollJob(jobId) {
  const deadline = Date.now() + 15 * 60 * 1000;

  while (Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, 1500));

    const response = await fetchJson(`${BACKEND_BASE}/api/jobs/${encodeURIComponent(jobId)}`, {
      method: 'GET',
    });

    if (!response.ok || !response.data) {
      throw new Error(t('error.pollFailed'));
    }

    const job = response.data;
    if (job.status === 'done' && job.result) {
      if (job.result.ok === false) {
        throw new Error(job.result.message || t('error.backendJobFailed'));
      }

      return job.result;
    }

    if (job.status === 'error') {
      throw new Error(job.result?.message || t('error.backendJobFailed'));
    }

    setDownloadStatus(t('download.processing'));
  }

  throw new Error(t('error.timeout'));
}

async function requestDownloadedModel(url) {
  const response = await fetchJson(`${BACKEND_BASE}/api/deobfuscate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (response.status === 202 && response.data?.jobId) {
    return pollJob(response.data.jobId);
  }

  if (!response.ok || !response.data || response.data.ok === false) {
    throw new Error(response.data?.message || t('error.backendRequestFailed'));
  }

  return response.data;
}

function setActivePanel(panelName) {
  activePanel = panelName;
  panelCard.classList.remove('is-collapsed');
  panelTitle.textContent = formatPanelTitle(panelName);

  if (panelName !== 'pose') {
    setPoseTool(null);
  }

  menuButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.panelTarget === panelName);
  });

  panelViews.forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.panel === panelName);
  });
}

function getModelScreenBounds() {
  if (!currentVrm) {
    return null;
  }

  const box = new THREE.Box3().setFromObject(currentVrm.scene);
  if (box.isEmpty()) {
    return null;
  }

  const viewportRect = viewport.getBoundingClientRect();
  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];

  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;

  corners.forEach((corner) => {
    corner.project(camera);

    const x = viewportRect.left + ((corner.x + 1) * 0.5 * viewportRect.width);
    const y = viewportRect.top + ((1 - corner.y) * 0.5 * viewportRect.height);

    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  });

  return { left, right, top, bottom };
}

function isPointNearModel(clientX, clientY) {
  const bounds = getModelScreenBounds();
  if (!bounds) {
    return false;
  }

  const margin = 84;
  return (
    clientX >= bounds.left - margin &&
    clientX <= bounds.right + margin &&
    clientY >= bounds.top - margin &&
    clientY <= bounds.bottom + margin
  );
}

function resizeRenderer() {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;

  if (!width || !height) {
    return;
  }

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const autoBlinkWeight = updateAutoBlink(delta);

  updateIdleMotion(delta);
  interactionAnimationMixer?.update(Math.min(delta, MAX_IDLE_ANIMATION_DELTA));
  applyExpressionState(autoBlinkWeight);
  updateLookAtTarget();
  applyEyeLookFallback();
  currentVrm?.update(delta);
  updatePoseMarkers();
  controls.update();
  renderer.render(scene, camera);
}

transformControls.addEventListener('dragging-changed', (event) => {
  controls.enabled = !event.value;
});

transformControls.addEventListener('objectChange', () => {
  if (activePoseTool === 'move' && currentVrm && transformControls.object === moveControlAnchor) {
    const delta = new THREE.Vector3().subVectors(moveControlAnchor.position, lastMoveAnchorPosition);
    baseModelPosition.add(delta);
    currentVrm.scene.position.copy(baseModelPosition);
    lastMoveAnchorPosition.copy(moveControlAnchor.position);
  }
});

renderer.domElement.addEventListener('pointerdown', handlePoseMarkerPick);
renderer.domElement.addEventListener('pointerdown', handleModelInteractionPointerDown);
renderer.domElement.addEventListener('pointerup', handleModelInteractionPointerUp);
renderer.domElement.addEventListener('dblclick', handleModelDoubleClick);

menuButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const panelName = button.dataset.panelTarget;

    if (activePanel === panelName && !panelCard.classList.contains('is-collapsed')) {
      closePanel();
      return;
    }

    setChromeHidden(false);
    setActivePanel(panelName);
  });
});

infoToggleButton.addEventListener('click', () => {
  setChromeHidden(false);
  setInfoVisible(infoCard.hidden);
});

chromeToggleButton.addEventListener('click', () => {
  setChromeHidden(!uiChromeHidden);
});

photoCaptureButton.addEventListener('click', () => {
  capturePhoto();
});

downloadConsentAgreeButton?.addEventListener('click', () => {
  closeDownloadConsentDialog(true);
});

downloadConsentRejectButton?.addEventListener('click', () => {
  closeDownloadConsentDialog(false);
});

document.addEventListener('pointerdown', (event) => {
  const target = event.target;

  if (!downloadConsentDialog?.hidden) {
    return;
  }

  if (uiChromeHidden) {
    if (!stageShell.contains(target)) {
      return;
    }

    if (!isPointNearModel(event.clientX, event.clientY)) {
      setChromeHidden(false);
    }

    return;
  }

  if (activePanel === 'pose' && poseEditorMode && !panelCard.contains(target) && !menuDock.contains(target)) {
    return;
  }

  if (!infoCard.hidden && !infoCard.contains(target) && !infoToggleButton.contains(target)) {
    setInfoVisible(false);
  }

  if (activePanel && !panelCard.contains(target) && !menuDock.contains(target)) {
    closePanel();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !downloadConsentDialog?.hidden) {
    closeDownloadConsentDialog(false);
  }
});

poseList.addEventListener('click', handlePoseListClick);

poseAddButton.addEventListener('click', () => {
  selectedCustomPoseId = null;
  selectedPoseKey = null;
  renderPoseList();
  openPoseEditor('create');
});

poseSaveButton.addEventListener('click', () => {
  savePoseFromEditor();
});

poseBoneButton.addEventListener('click', () => {
  if (!currentVrm) {
    return;
  }

  setPoseTool(activePoseTool === 'bone' ? null : 'bone');
});

poseMoveButton.addEventListener('click', () => {
  if (!currentVrm) {
    return;
  }

  setPoseTool(activePoseTool === 'move' ? null : 'move');
});

poseCloseEditButton.addEventListener('click', () => {
  closePoseEditor();
});

poseNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    savePoseFromEditor();
  }
});

allExpressionControls.forEach((control) => {
  setSliderDisplay(control, 0);
  control.input.addEventListener('input', () => {
    control.output.textContent = formatSliderValue(getSliderValue(control));
  });
});

lookAtToggle.addEventListener('change', () => {
  lookAtEnabled = lookAtToggle.checked;
  applyLookAtState();

  if (currentVrm) {
    console.log('[VRM Debug] Look At toggled', {
      enabled: lookAtEnabled,
      diagnostics: buildVrmDiagnostics(currentVrm),
    });
  }
});

autoBlinkToggle.addEventListener('change', () => {
  autoBlinkEnabled = autoBlinkToggle.checked;
  resetBlinkState();
});

idleMotionToggle.addEventListener('change', () => {
  idleMotionEnabled = idleMotionToggle.checked;
  if (idleMotionEnabled) {
    resumeIdleMotionFromDefaultPose();
    return;
  }

  pendingSelectedPoseReapplyAfterIntro = false;
  setVrmSceneVisibility(true);
  stopLegacyWaitingAnimation();
});

gridToggle.addEventListener('change', () => {
  gridVisible = gridToggle.checked;
  gridHelper.visible = gridVisible;
});

axisToggle.addEventListener('change', () => {
  axisVisible = axisToggle.checked;
  axesHelper.visible = axisVisible;
});

fileInput.addEventListener('change', (event) => {
  handleFiles(event.target.files);
  event.target.value = '';
});

loadSampleButton.addEventListener('click', () => {
  void loadSampleModelWithGuard();
});

resetCameraButton.addEventListener('click', () => {
  if (currentVrm) {
    frameModel(currentVrm.scene);
    return;
  }

  camera.position.set(0.0, 1.35, 2.8);
  controls.target.set(0.0, 1.2, 0.0);
  controls.update();
});

downloadPreviewButton.addEventListener('click', () => {
  if (!currentDownloadResult?.modelUrl && !currentDownloadResult?.downloadUrl) {
    return;
  }

  void loadVrm(currentDownloadResult.modelUrl || currentDownloadResult.downloadUrl, 'downloaded model', {
    revealInfoOnLoad: true,
  });
});

downloadForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  let validatedUrl;
  try {
    validatedUrl = validateVroidUrl(downloadUrlInput.value.trim());
  } catch (error) {
    setDownloadStatus(error instanceof Error ? error.message : String(error));
    return;
  }

  const agreedToDownload = await requestDownloadConsent();
  if (!agreedToDownload) {
    setDownloadStatus(t('download.noticeDeclined'));
    return;
  }

  showDownloadResult(null);
  setDownloadBusy(true);
  setDownloadStatus(t('download.submitting'));

  try {
    const result = await requestDownloadedModel(validatedUrl);
    showDownloadResult(result);
    setDownloadStatus(t('download.ready'));
    await loadVrm(result.modelUrl || result.downloadUrl, 'downloaded model', {
      revealInfoOnLoad: true,
    });
  } catch (error) {
    console.error(error);
    setDownloadStatus(error instanceof Error ? error.message : String(error));
  } finally {
    setDownloadBusy(false);
  }
});

['dragenter', 'dragover'].forEach((type) => {
  dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    dropZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((type) => {
  dropZone.addEventListener(type, (event) => {
    event.preventDefault();

    if (type === 'drop') {
      handleFiles(event.dataTransfer?.files);
    }

    dropZone.classList.remove('drag-over');
  });
});

window.addEventListener('resize', resizeRenderer);

gridToggle.checked = true;
axisToggle.checked = true;
idleMotionToggle.checked = true;
lookAtToggle.checked = true;
autoBlinkToggle.checked = true;
customPoses = loadCustomPoses();

applyStaticTranslations();
setMeta();
setStatus(t('status.ready'));
setDownloadStatus(t('download.waiting'));
showDownloadResult(null);
syncExpressionAvailability();
renderPoseList();
setPoseEditorVisible(false);
syncPoseUiState();
syncPhotoCaptureButtonState();
closePanel();
resizeRenderer();
animate();
