// Game-owned startup integration. Diagnostics start before configuration parsing
// or any asynchronous SDK import so an unresponsive startup can be inspected.
let config = null;
let initStage = 'bootstrap';
let debugTools = null;
let diagnosticRing = null;
let gameScriptAttempted = false;

const loading = document.createElement('div');
loading.id = 'bloom-module-loading';
loading.setAttribute('role', 'status');
loading.style.cssText = 'position:fixed;inset:0;z-index:1000;display:grid;place-content:center;gap:16px;text-align:center;background:#183225;color:#ecf4d5;font:600 16px system-ui';
const label = document.createElement('span');
const retry = document.createElement('button');
label.textContent = '게임을 준비하고 있어요';
retry.textContent = '다시 시도';
retry.hidden = true;
loading.append(label, retry);
document.body.append(loading);

const diagnosticButton = document.createElement('button');
diagnosticButton.id = 'bloom-diagnostic-copy';
diagnosticButton.type = 'button';
diagnosticButton.textContent = '진단 복사';
diagnosticButton.setAttribute('aria-label', '오류 및 최근 입력 진단 정보 복사');
diagnosticButton.style.cssText = 'position:fixed;left:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:1001;min-width:48px;min-height:44px;padding:0 12px;border:0;border-radius:16px;background:#f9faeedd;color:#33483b;font:600 12px system-ui;box-shadow:0 3px 12px #0003;touch-action:manipulation;-webkit-tap-highlight-color:transparent';
const diagnosticText = document.createElement('textarea');
diagnosticText.id = 'bloom-diagnostic-text';
diagnosticText.readOnly = true;
diagnosticText.setAttribute('aria-label', '진단 정보 복사 결과');
diagnosticText.hidden = true;
diagnosticText.style.cssText = 'position:fixed;left:12px;right:12px;bottom:68px;z-index:1002;width:calc(100% - 24px);height:38vh;padding:12px;border:1px solid #526e50;border-radius:12px;background:#fff;color:#111;font:12px/1.4 ui-monospace,monospace';
const diagnosticStatus = document.createElement('span');
diagnosticStatus.id = 'bloom-diagnostic-status';
diagnosticStatus.setAttribute('role', 'status');
diagnosticStatus.setAttribute('aria-live', 'polite');
diagnosticStatus.style.cssText = 'position:fixed;left:12px;bottom:62px;z-index:1002;max-width:calc(100% - 24px);padding:6px 10px;border-radius:8px;background:#183225;color:#ecf4d5;font:12px system-ui';
diagnosticStatus.hidden = true;
document.body.append(diagnosticButton, diagnosticText, diagnosticStatus);

const earlyErrors = [];
const recentInputs = [];
const INPUT_CAPACITY = 24;
const ERROR_CAPACITY = 16;
function fallbackText(value, limit = 500) {
  const raw = typeof value === 'string' ? value : value?.message || 'Non-text error omitted';
  return String(raw)
    .replace(/(?:password|token|api[_-]?key|authorization|secret|cookie)\s*[=:]\s*[^\s,;]+/gi, '[redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(?:https?|blob|file):[^\s)]+/gi, '[source]')
    .replace(/\s+/g, ' ').slice(0, limit);
}
function sourceName(value) {
  try { return new URL(value, location.href).pathname.split('/').filter(Boolean).at(-1)?.slice(0, 80) || ''; }
  catch { return ''; }
}
function recordDiagnostic(error, kind = 'startup-error', details = {}) {
  const source = sourceName(details.source || '');
  if (diagnosticRing) {
    diagnosticRing.report(error, {
      kind, origin: 'bootstrap', source,
      line: Number.isSafeInteger(details.line) && details.line >= 0 ? details.line : 0,
      column: Number.isSafeInteger(details.column) && details.column >= 0 ? details.column : 0,
      cause: `stage=${initStage}`
    });
    return;
  }
  if (earlyErrors.length === ERROR_CAPACITY) earlyErrors.shift();
  earlyErrors.push({
    kind: fallbackText(kind, 64), message: fallbackText(error), source,
    line: Number.isSafeInteger(details.line) && details.line >= 0 ? details.line : 0,
    column: Number.isSafeInteger(details.column) && details.column >= 0 ? details.column : 0,
    stage: initStage, atMs: Math.round(performance.now())
  });
}
function earlyError(event) {
  recordDiagnostic(event.error ?? event.message ?? 'Global error', 'global-error', {
    source: event.filename, line: event.lineno, column: event.colno
  });
}
function earlyRejection(event) {
  recordDiagnostic(event.reason ?? 'Unhandled promise rejection', 'unhandled-rejection');
}
window.addEventListener('error', earlyError, true);
window.addEventListener('unhandledrejection', earlyRejection);
function removeEarlyDiagnostics() {
  window.removeEventListener('error', earlyError, true);
  window.removeEventListener('unhandledrejection', earlyRejection);
}

function recordInput(event) {
  const target = event.target instanceof Element ? event.target : null;
  const control = target?.closest('button,canvas,[role="button"]') || null;
  const entry = {
    atMs: Math.round(performance.now()), type: event.type,
    target: control ? { tag: control.tagName.toLowerCase(), id: String(control.id || '').slice(0, 48) } : null
  };
  if (event.type === 'pointerdown' && ['mouse', 'touch', 'pen'].includes(event.pointerType)) entry.pointer = event.pointerType;
  if (event.type === 'keydown' && ['Enter', ' ', 'Escape'].includes(event.key)) entry.key = event.key === ' ' ? 'Space' : event.key;
  if (recentInputs.length === INPUT_CAPACITY) recentInputs.shift();
  recentInputs.push(entry);
}
for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown']) {
  document.addEventListener(type, recordInput, true);
}

function appVersion() {
  return String(config?.productVersion || document.getElementById('startVersion')?.textContent || document.getElementById('productVersion')?.textContent || 'unknown').trim().slice(0, 80);
}
function diagnosticSnapshot() {
  const errors = diagnosticRing ? diagnosticRing.snapshot() : {
    format: 'bootstrap fallback diagnostics v1', release: appVersion(), total: earlyErrors.length,
    dropped: 0, errors: earlyErrors.map(record => ({ ...record }))
  };
  return JSON.stringify({
    format: 'budmori startup diagnostics v1',
    app: { version: appVersion(), gameBundleSha256: config?.game?.sha256 || null },
    browser: String(navigator.userAgent || 'unknown').slice(0, 240),
    initStage,
    recentInputs: recentInputs.map(record => ({ ...record })),
    diagnostics: errors
  }, null, 2);
}
diagnosticButton.addEventListener('click', async () => {
  diagnosticStatus.hidden = false;
  diagnosticText.hidden = false;
  const text = diagnosticSnapshot();
  try {
    const result = debugTools?.copyDiagnostic
      ? await debugTools.copyDiagnostic(text, { clipboard: navigator.clipboard, textarea: diagnosticText })
      : await (async () => {
          try {
            if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return { copied: true }; }
          } catch {}
          diagnosticText.value = text; diagnosticText.focus(); diagnosticText.select();
          return { copied: false };
        })();
    if (result.copied) {
      diagnosticText.hidden = true;
      diagnosticStatus.textContent = '진단 정보가 복사됐어요';
    } else {
      diagnosticStatus.textContent = '자동 복사를 못 했어요. 아래 텍스트를 길게 눌러 복사해 주세요';
    }
  } catch (error) {
    recordDiagnostic(error, 'diagnostic-copy-error');
    console.error('Diagnostic copy failed', error);
    diagnosticText.value = diagnosticSnapshot(); diagnosticText.hidden = false;
    diagnosticText.focus(); diagnosticText.select();
    diagnosticStatus.textContent = '자동 복사를 못 했어요. 아래 텍스트를 길게 눌러 복사해 주세요';
  }
});

try {
  const manifest = document.getElementById('bloom-runtime-manifest');
  if (!manifest) throw new Error('Runtime manifest is missing');
  config = JSON.parse(manifest.textContent);
} catch (error) {
  initStage = 'manifest';
  recordDiagnostic(error, 'manifest-error');
  label.textContent = '게임 설정을 읽지 못했어요. 진단 정보를 복사해 알려 주세요';
  retry.textContent = '다시 불러오기';
  retry.hidden = false;
  console.error('Game manifest failed to initialize', error);
}

const ready = new Map();
let pending = false;
let started = false;
let vectorLoader = null;
const digest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
async function namespace(entry) {
  if (ready.has(entry.name)) return ready.get(entry.name);
  const response = await fetch(entry.url, { cache: 'force-cache' });
  if (!response.ok) throw new Error('Module request failed: ' + response.status + ' (' + entry.name + ')');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== entry.bytes || await digest(bytes) !== entry.sha256) throw new Error('Module integrity failed: ' + entry.name);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }));
  try {
    const exports = await import(url), record = { exports, verifiedImportURL: url };
    ready.set(entry.name, record);
    return record;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
async function enableGamekitDiagnostics(record) {
  const api = record?.exports;
  if (typeof api?.DiagnosticRing !== 'function' || typeof api?.copyDiagnostic !== 'function') {
    throw new Error('Required gamekit diagnostics API is unavailable');
  }
  const ring = new api.DiagnosticRing({ capacity: ERROR_CAPACITY, release: appVersion() });
  for (const prior of earlyErrors) ring.report(prior.message, {
    kind: prior.kind, origin: 'bootstrap', source: prior.source, line: prior.line, column: prior.column,
    cause: `stage=${prior.stage}`
  });
  diagnosticRing = ring;
  debugTools = api;
  ring.installGlobal(window);
  removeEarlyDiagnostics();
  earlyErrors.length = 0;
}
async function loadDiagnostics() {
  const entry = config.modules.find(module => module.name === 'debug-tools');
  if (!entry) throw new Error('Required gamekit debug-tools module is missing from the manifest');
  initStage = 'loading-debug-tools';
  await enableGamekitDiagnostics(await namespace(entry));
}
async function launch() {
  if (pending || started || !config) return;
  pending = true;
  retry.hidden = true;
  label.textContent = '게임을 준비하고 있어요';
  try {
    if (!debugTools) await loadDiagnostics();
    initStage = 'loading-modules';
    const modules = await Promise.all(config.modules.map(async entry => ({ entry, record: await namespace(entry) })));
    for (const { entry, record } of modules) globalThis[entry.globalName] = record.exports;
    initStage = 'loading-vector-assets';
    label.textContent = '캐릭터를 준비하고 있어요';
    vectorLoader ||= globalThis.BloomGamekitVectorAssetLoader.createVectorAssetLoader({ maxEntries: 16 });
    const troops = {}, bosses = {};
    const records = await Promise.all(config.vectorAssets.map(async spec => {
      const url = new URL(spec.file + '?version=' + spec.sha256, document.baseURI).href;
      const preset = globalThis.BloomGamekitVectorAssetLoader.VECTOR_ASSET_QUALITY_PRESETS[spec.qualityPreset];
      if (!preset) throw new Error('Unknown shared SVG quality preset: ' + spec.qualityPreset);
      const compiled = await vectorLoader.load(url, { ...preset, sourcePath: spec.file, expectedSha256: spec.sha256, maxBytes: spec.bytes });
      if (compiled.sourceSha256 !== spec.sha256) throw new Error('Vector source integrity failed: ' + spec.file);
      return { spec, compiled };
    }));
    for (const { spec, compiled } of records) (spec.kind === 'troop' ? troops : bosses)[spec.id] = compiled;
    globalThis.BudmoriVectorResources = Object.freeze({ troops: Object.freeze(troops), bosses: Object.freeze(bosses) });
    let scope = null;
    if (config.scope) {
      const entry = { ...config.scope, name: 'app-simulation-scope', url: new URL(config.scope.file + '?version=' + config.scope.sha256, document.baseURI).href };
      const record = await namespace(entry);
      globalThis.BloomSimulationScopeModule = record.exports;
      scope = Object.freeze({ ...entry, verifiedImportURL: record.verifiedImportURL });
    }
    globalThis.BloomModuleReferences = Object.freeze({ sourceCommit: config.sourceCommit, distCommit: config.distCommit, scope,
      modules: Object.freeze(modules.map(({ entry, record }) => Object.freeze({ ...entry, verifiedImportURL: record.verifiedImportURL }))),
      dispose() { for (const record of ready.values()) URL.revokeObjectURL(record.verifiedImportURL); ready.clear(); }
    });
    initStage = 'loading-game-script';
    const script = document.createElement('script'), asset = config.game;
    script.src = new URL(asset.file + '?version=' + asset.sha256, document.baseURI).href;
    script.integrity = 'sha256-' + btoa(String.fromCharCode(...Uint8Array.from(asset.sha256.match(/../g), b => parseInt(b, 16))));
    script.crossOrigin = 'anonymous';
    globalThis.BloomGameSourceURL = script.src;
    globalThis.BloomGameSourceIntegrity = script.integrity;
    gameScriptAttempted = true;
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = () => { gameScriptAttempted = false; reject(new Error('Game source loading failed')); };
      document.body.append(script);
    });
    initStage = 'verifying-game-init';
    if (!globalThis.BUDMORI) throw new Error('Game script loaded but app initialization did not complete');
    started = true;
    initStage = 'ready';
    loading.remove();
  } catch (error) {
    recordDiagnostic(error, 'startup-error');
    label.textContent = '게임을 시작하지 못했어요. 진단 정보를 복사해 알려 주세요';
    retry.textContent = gameScriptAttempted && !globalThis.BUDMORI ? '다시 불러오기' : '다시 시도';
    retry.hidden = false;
    console.error('Game startup failed at ' + initStage, error);
  } finally {
    pending = false;
  }
}
retry.addEventListener('click', () => {
  if (!config || gameScriptAttempted && !globalThis.BUDMORI) location.reload();
  else void launch();
});
if (config) void launch();
