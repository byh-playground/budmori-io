import { labRequested } from './debug/lab.js';
import { isolatedPage } from './save/save-adapter.js';
import { createStartupLoading } from './startup-loading.js';

// The intro is a public route, not a normal farm state.
if (new URLSearchParams(location.search).get('showcaseDemo') !== '1' && location.hash === '#/showcase') {
    window.__BLOOM_SHOWCASE_DEEPLINK = true;
    history.replaceState(null, '', location.pathname + location.search);
}
// Game-owned startup integration. Diagnostics start before configuration parsing
// or any asynchronous SDK import so an unresponsive startup can be inspected.
// An isolated scene runs this same page; its saves live in memory (see save/save-adapter.js).
if (isolatedPage(location.search)) {
    if (new URLSearchParams(location.search).has('help') || labRequested(location.search)) {
        document.documentElement.classList.add('help-scene');
    }
    if (new URLSearchParams(location.search).get('showcaseDemo') === '1') {
        const CONTEXT = window.AudioContext || window.webkitAudioContext;
        if (CONTEXT) {
            CONTEXT.prototype.resume = function () {
                return Promise.resolve();
            };
        }
    }
    if (/^(corn|pea|redbean)-t[1-6]$/.test(new URLSearchParams(location.search).get('help'))) {
        document.documentElement.classList.add(
            'growth-preview-scene',
            `${new URLSearchParams(location.search).get('help').split('-')[0]}-preview-scene`,
        );
    }
}
let config = null;
let initStage = 'bootstrap';
let debugTools = null;
let diagnosticRing = null;
const STARTUP = createStartupLoading();
globalThis.BudmoriStartup = STARTUP;
const LABEL = STARTUP.label;
const RETRY = STARTUP.retry;
const ERROR_POPUP = document.createElement('div');
ERROR_POPUP.id = 'bloom-error-popup';
ERROR_POPUP.hidden = true;
ERROR_POPUP.setAttribute('role', 'alertdialog');
ERROR_POPUP.setAttribute('aria-modal', 'true');
ERROR_POPUP.setAttribute('aria-labelledby', 'bloom-error-title');
ERROR_POPUP.style.cssText =
    'position:fixed;inset:0;z-index:2000;display:none;place-items:center;padding:20px;background:#101b18cc;font:16px system-ui;color:#183225';
const ERROR_PANEL = document.createElement('section');
ERROR_PANEL.style.cssText =
    'width:min(100%,420px);max-height:90dvh;overflow:auto;box-sizing:border-box;padding:24px;border-radius:20px;background:#f9faee;box-shadow:0 12px 40px #0006';
const ERROR_TITLE = document.createElement('h2');
ERROR_TITLE.id = 'bloom-error-title';
ERROR_TITLE.textContent = '게임이 오류로 중단됐어요';
const ERROR_MESSAGE = document.createElement('p');
ERROR_MESSAGE.textContent = '진단 정보를 복사해 알려 주시거나 새로고침해 주세요.';
const DIAGNOSTIC_BUTTON = document.createElement('button');
DIAGNOSTIC_BUTTON.id = 'bloom-diagnostic-copy';
DIAGNOSTIC_BUTTON.type = 'button';
DIAGNOSTIC_BUTTON.textContent = '진단 복사';
DIAGNOSTIC_BUTTON.style.cssText =
    'min-height:48px;padding:0 16px;border:0;border-radius:12px;background:#315b40;color:#fff;font:600 16px system-ui;touch-action:manipulation';
const RELOAD_BUTTON = document.createElement('button');
RELOAD_BUTTON.type = 'button';
RELOAD_BUTTON.textContent = '새로고침';
RELOAD_BUTTON.style.cssText =
    'min-height:48px;margin-left:8px;padding:0 16px;border:1px solid #526e50;border-radius:12px;background:#fff;color:#183225;font:600 16px system-ui;touch-action:manipulation';
const DIAGNOSTIC_TEXT = document.createElement('textarea');
DIAGNOSTIC_TEXT.id = 'bloom-diagnostic-text';
DIAGNOSTIC_TEXT.readOnly = true;
DIAGNOSTIC_TEXT.setAttribute('aria-label', '진단 정보 복사 결과');
DIAGNOSTIC_TEXT.hidden = true;
DIAGNOSTIC_TEXT.style.cssText =
    'display:block;box-sizing:border-box;width:100%;height:30vh;margin-top:12px;padding:10px;border:1px solid #526e50;border-radius:12px;background:#fff;color:#111;font:12px/1.4 ui-monospace,monospace';
const DIAGNOSTIC_STATUS = document.createElement('span');
DIAGNOSTIC_STATUS.id = 'bloom-diagnostic-status';
DIAGNOSTIC_STATUS.setAttribute('role', 'status');
DIAGNOSTIC_STATUS.setAttribute('aria-live', 'polite');
DIAGNOSTIC_STATUS.style.cssText = 'display:block;margin-top:10px;font:14px system-ui;color:#183225';
DIAGNOSTIC_STATUS.hidden = true;
const ERROR_ACTIONS = document.createElement('div');
ERROR_ACTIONS.append(DIAGNOSTIC_BUTTON, RELOAD_BUTTON);
ERROR_PANEL.append(ERROR_TITLE, ERROR_MESSAGE, ERROR_ACTIONS, DIAGNOSTIC_STATUS, DIAGNOSTIC_TEXT);
ERROR_POPUP.append(ERROR_PANEL);
document.body.append(ERROR_POPUP);
function showErrorPopup(message) {
    if (message) {
        ERROR_MESSAGE.textContent = message;
    }
    ERROR_POPUP.style.display = 'grid';
    ERROR_POPUP.hidden = false;
    DIAGNOSTIC_BUTTON.focus();
}
RELOAD_BUTTON.addEventListener('click', () => location.reload());
const EARLY_ERRORS = [];
const RECENT_INPUTS = [];
const INPUT_CAPACITY = 24;
const ERROR_CAPACITY = 16;
function fallbackText(value, limit = 500) {
    const RAW = typeof value === 'string' ? value : value?.message || 'Non-text error omitted';
    return String(RAW)
        .replace(/(?:password|token|api[_-]?key|authorization|secret|cookie)\s*[=:]\s*[^\s,;]+/gi, '[redacted]')
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
        .replace(/(?:https?|blob|file):[^\s)]+/gi, '[source]')
        .replace(/\s+/g, ' ')
        .slice(0, limit);
}
function sourceName(value) {
    try {
        return new URL(value, location.href).pathname.split('/').filter(Boolean).at(-1)?.slice(0, 80) || '';
    } catch {
        return '';
    }
}
function recordDiagnostic(error, kind = 'startup-error', details = {}) {
    const SOURCE = sourceName(details.source || ''),
        CAUSE = details.operation
            ? `stage=${initStage};operation=${fallbackText(details.operation, 64)}`
            : `stage=${initStage}`;
    if (diagnosticRing) {
        diagnosticRing.report(error, {
            kind,
            origin: details.origin || 'bootstrap',
            source: SOURCE,
            line: Number.isSafeInteger(details.line) && details.line >= 0 ? details.line : 0,
            column: Number.isSafeInteger(details.column) && details.column >= 0 ? details.column : 0,
            cause: CAUSE,
            fatal: details.fatal === true,
        });
        return;
    }
    if (EARLY_ERRORS.length === ERROR_CAPACITY) {
        EARLY_ERRORS.shift();
    }
    EARLY_ERRORS.push({
        kind: fallbackText(kind, 64),
        message: fallbackText(error),
        origin: fallbackText(details.origin || 'bootstrap', 64),
        source: SOURCE,
        line: Number.isSafeInteger(details.line) && details.line >= 0 ? details.line : 0,
        column: Number.isSafeInteger(details.column) && details.column >= 0 ? details.column : 0,
        cause: CAUSE,
        stage: initStage,
        atMs: Math.round(performance.now()),
    });
}
function reportRuntimeDiagnostic(error, kind = 'runtime-error', details = {}) {
    const NAME = typeof error?.name === 'string' && error.name ? error.name : 'Error',
        MESSAGE = typeof error?.message === 'string' ? error.message : 'Non-text error omitted',
        DIAGNOSTIC_ERROR = {
            message: `${NAME}: ${MESSAGE}`.slice(0, 500),
            stack: typeof error?.stack === 'string' ? error.stack : '',
        };
    recordDiagnostic(DIAGNOSTIC_ERROR, kind, {
        ...details,
        origin: details.origin || 'app',
    });
}
function earlyError(event) {
    recordDiagnostic(event.error ?? event.message ?? 'Global error', 'global-error', {
        source: event.filename,
        line: event.lineno,
        column: event.colno,
    });
    if (initStage !== 'ready') {
        showErrorPopup('게임을 시작하는 중 오류가 발생했어요. 진단 정보를 복사해 알려 주세요.');
    }
}
function earlyRejection(event) {
    recordDiagnostic(event.reason ?? 'Unhandled promise rejection', 'unhandled-rejection');
    if (initStage !== 'ready') {
        showErrorPopup('게임을 시작하는 중 오류가 발생했어요. 진단 정보를 복사해 알려 주세요.');
    }
}
window.addEventListener('error', earlyError, true);
window.addEventListener('unhandledrejection', earlyRejection);
function removeEarlyDiagnostics() {
    window.removeEventListener('error', earlyError, true);
    window.removeEventListener('unhandledrejection', earlyRejection);
}
function recordInput(event) {
    const TARGET = event.target instanceof Element ? event.target : null;
    const CONTROL = TARGET?.closest('button,canvas,[role="button"]') || null;
    const ENTRY = {
        atMs: Math.round(performance.now()),
        type: event.type,
        target: CONTROL
            ? {
                  tag: CONTROL.tagName.toLowerCase(),
                  id: String(CONTROL.id || '').slice(0, 48),
              }
            : null,
    };
    if (event.type === 'pointerdown' && ['mouse', 'touch', 'pen'].includes(event.pointerType)) {
        ENTRY.pointer = event.pointerType;
    }
    if (event.type === 'keydown' && ['Enter', ' ', 'Escape'].includes(event.key)) {
        ENTRY.key = event.key === ' ' ? 'Space' : event.key;
    }
    if (RECENT_INPUTS.length === INPUT_CAPACITY) {
        RECENT_INPUTS.shift();
    }
    RECENT_INPUTS.push(ENTRY);
}
for (const TYPE of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown']) {
    document.addEventListener(TYPE, recordInput, true);
}
function appVersion() {
    return String(
        config?.productVersion ||
            document.getElementById('startVersion')?.textContent ||
            document.getElementById('productVersion')?.textContent ||
            'unknown',
    )
        .trim()
        .slice(0, 80);
}
function detailedDiagnosticSnapshot() {
    const ERRORS = diagnosticRing
        ? diagnosticRing.snapshot()
        : {
              format: 'bootstrap fallback diagnostics v1',
              release: appVersion(),
              total: EARLY_ERRORS.length,
              dropped: 0,
              errors: EARLY_ERRORS.map((record) => ({
                  ...record,
              })),
          };
    return JSON.stringify(
        {
            format: 'budmori startup diagnostics v2',
            performance: globalThis.BudmoriPerformanceDiagnostics?.snapshot() || null,
            app: {
                version: appVersion(),
                gameBundleSha256: config?.game?.sha256 || null,
            },
            browser: String(navigator.userAgent || 'unknown').slice(0, 240),
            initStage,
            recentInputs: RECENT_INPUTS.map((record) => ({
                ...record,
            })),
            diagnostics: ERRORS,
        },
        null,
        2,
    );
}
function diagnosticSnapshot() {
    const ERRORS = diagnosticRing?.snapshot() || { total: EARLY_ERRORS.length, errors: EARLY_ERRORS },
        LINES = [
            `budmori ${appVersion()} · build ${config?.game?.sha256?.slice(0, 12) || '미확인'} · SDK source ${config?.sourceCommit?.slice(0, 12) || '미확인'}`,
        ];
    LINES.push(...(globalThis.BudmoriPerformanceDiagnostics?.summary() || ['성능 미측정 · 시작 단계 ' + initStage]));
    LINES.push(
        `오류 ${ERRORS.total || 0} · 단계 ${initStage} · 최근 입력 ${
            RECENT_INPUTS.slice(-3)
                .map((input) => `${input.type || 'input'}:${input.target?.id || input.target?.tag || ''}`)
                .join(', ') || '없음'
        }`,
    );
    for (const ERROR of (ERRORS.errors || []).slice(-1)) {
        LINES.push(`[${ERROR.kind || 'error'} / ${ERROR.visibility || 'blocking'}] ${ERROR.message || '오류'}`);
        if (ERROR.stack) {
            LINES.push(ERROR.stack.split('\n').slice(0, 4).join(' ← '));
        }
        if (ERROR.source || ERROR.line || ERROR.column || ERROR.cause) {
            LINES.push(
                `위치 ${ERROR.source || ''}:${ERROR.line || 0}:${ERROR.column || 0} · 원인 ${ERROR.cause || '미제공'}`,
            );
        }
    }
    return LINES.join('\n');
}
globalThis.BloomDiagnostics = Object.freeze({
    summary: diagnosticSnapshot,
    detail: detailedDiagnosticSnapshot,
    report: reportRuntimeDiagnostic,
    async copy({ textarea } = {}) {
        const TEXT = diagnosticSnapshot();
        const RESULT = debugTools?.copyDiagnostic
            ? await debugTools.copyDiagnostic(TEXT, { clipboard: navigator.clipboard, textarea })
            : { copied: false, text: TEXT };
        if (!RESULT.copied && textarea) {
            textarea.hidden = false;
            textarea.value = TEXT;
            textarea.focus();
            textarea.select();
        }
        return RESULT;
    },
});
DIAGNOSTIC_BUTTON.addEventListener('click', async () => {
    DIAGNOSTIC_STATUS.hidden = false;
    DIAGNOSTIC_TEXT.hidden = true;
    const TEXT = diagnosticSnapshot();
    try {
        const RESULT = debugTools?.copyDiagnostic
            ? await debugTools.copyDiagnostic(TEXT, {
                  clipboard: navigator.clipboard,
                  textarea: DIAGNOSTIC_TEXT,
              })
            : await (async () => {
                  try {
                      if (navigator.clipboard?.writeText) {
                          await navigator.clipboard.writeText(TEXT);
                          return {
                              copied: true,
                          };
                      }
                  } catch (error) {
                      recordDiagnostic(error, 'clipboard-copy-error');
                  }
                  return {
                      copied: false,
                  };
              })();
        if (RESULT.copied) {
            DIAGNOSTIC_TEXT.hidden = true;
            DIAGNOSTIC_STATUS.textContent = '진단 정보가 복사됐어요';
        } else {
            DIAGNOSTIC_TEXT.value = RESULT.text || TEXT;
            DIAGNOSTIC_TEXT.hidden = false;
            DIAGNOSTIC_TEXT.focus();
            DIAGNOSTIC_TEXT.select();
            DIAGNOSTIC_STATUS.textContent = '자동 복사를 못 했어요. 아래 텍스트를 길게 눌러 복사해 주세요';
        }
    } catch (error) {
        recordDiagnostic(error, 'diagnostic-copy-error');
        console.error('Diagnostic copy failed', error);
        DIAGNOSTIC_TEXT.value = diagnosticSnapshot();
        DIAGNOSTIC_TEXT.hidden = false;
        DIAGNOSTIC_TEXT.focus();
        DIAGNOSTIC_TEXT.select();
        DIAGNOSTIC_STATUS.textContent = '자동 복사를 못 했어요. 아래 텍스트를 길게 눌러 복사해 주세요';
    }
});
try {
    const MANIFEST = document.getElementById('bloom-runtime-manifest');
    if (!MANIFEST) {
        throw new Error('Runtime manifest is missing');
    }
    config = JSON.parse(MANIFEST.textContent);
} catch (error) {
    initStage = 'manifest';
    STARTUP.fail(fallbackText(error));
    recordDiagnostic(error, 'manifest-error');
    LABEL.textContent = '게임 설정을 읽지 못했어요. 진단 정보를 복사해 알려 주세요';
    RETRY.textContent = '다시 불러오기';
    RETRY.hidden = false;
    showErrorPopup('게임 준비를 마치지 못했어요. ' + fallbackText(error));
    console.error('Game manifest failed to initialize', error);
}
const READY = new Map();
let pending = false;
let started = false;
let vectorLoader = null;
const VECTOR_SOURCE_TEXT = new Map();
const VECTOR_RESPONSES = new Map();
const DIGEST = async (bytes) =>
    Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) =>
        b.toString(16).padStart(2, '0'),
    ).join('');
async function namespace(entry) {
    if (READY.has(entry.name)) {
        return READY.get(entry.name);
    }
    const RESPONSE = await fetch(entry.url, {
        cache: 'force-cache',
    });
    if (!RESPONSE.ok) {
        throw new Error('Module request failed: ' + RESPONSE.status + ' (' + entry.name + ')');
    }
    const BYTES = await RESPONSE.arrayBuffer();
    if (BYTES.byteLength !== entry.bytes || (await DIGEST(BYTES)) !== entry.sha256) {
        throw new Error('Module integrity failed: ' + entry.name);
    }
    const URL_LOCAL = URL.createObjectURL(
        new Blob([BYTES], {
            type: 'text/javascript',
        }),
    );
    try {
        const EXPORTS = await import(URL_LOCAL),
            RECORD = {
                exports: EXPORTS,
                verifiedImportURL: URL_LOCAL,
            };
        READY.set(entry.name, RECORD);
        return RECORD;
    } catch (error) {
        URL.revokeObjectURL(URL_LOCAL);
        throw error;
    }
}
async function enableGamekitDiagnostics(record) {
    const API = record?.exports;
    if (typeof API?.DiagnosticRing !== 'function' || typeof API?.copyDiagnostic !== 'function') {
        throw new Error('Required gamekit diagnostics API is unavailable');
    }
    const RING = new API.DiagnosticRing({
        capacity: ERROR_CAPACITY,
        release: appVersion(),
    });
    for (const PRIOR of EARLY_ERRORS) {
        RING.report(PRIOR.message, {
            kind: PRIOR.kind,
            origin: 'bootstrap',
            source: PRIOR.source,
            line: PRIOR.line,
            column: PRIOR.column,
            cause: `stage=${PRIOR.stage}`,
        });
    }
    diagnosticRing = RING;
    debugTools = API;
    RING.installGlobal(window, {
        onReport: () => {
            if (initStage !== 'ready') {
                showErrorPopup('게임을 시작하는 중 오류가 발생했어요. 진단 정보를 복사해 알려 주세요.');
            }
        },
    });
    removeEarlyDiagnostics();
    EARLY_ERRORS.length = 0;
}
async function loadDiagnostics() {
    const ENTRY = config.modules.find((module) => module.name === 'debug-tools');
    if (!ENTRY) {
        throw new Error('Required gamekit debug-tools module is missing from the manifest');
    }
    initStage = 'loading-debug-tools';
    await enableGamekitDiagnostics(await namespace(ENTRY));
}
async function launch() {
    if (pending || started || !config) {
        return;
    }
    pending = true;
    STARTUP.begin();
    STARTUP.report('modules', 0, config.modules.length);
    await STARTUP.yield();
    LABEL.textContent = '게임을 준비하고 있어요';
    try {
        if (!debugTools) {
            await loadDiagnostics();
        }
        initStage = 'loading-modules';
        let modulesDone = 0;
        const MODULES = await Promise.all(
            config.modules.map(async (entry) => {
                const RECORD = await namespace(entry);
                STARTUP.report('modules', ++modulesDone, config.modules.length);
                return { entry, record: RECORD };
            }),
        );
        for (const { entry: ENTRY, record: RECORD } of MODULES) {
            globalThis[ENTRY.globalName] = RECORD.exports;
        }
        const VECTOR_URLS = [
            ...new Set(
                config.vectorAssets.map(
                    (spec) => new URL(spec.file + '?version=' + spec.sha256, document.baseURI).href,
                ),
            ),
        ];
        let downloaded = 0;
        STARTUP.report('vector-download', downloaded, VECTOR_URLS.length);
        await Promise.all(
            VECTOR_URLS.map(async (url) => {
                const RESPONSE = await fetch(url, { cache: 'force-cache' });
                if (!RESPONSE.ok) {
                    throw new Error('Vector request failed: ' + RESPONSE.status + ' (' + new URL(url).pathname + ')');
                }
                // Download in parallel, then compile each quality variant between paints.
                VECTOR_SOURCE_TEXT.set(url, await RESPONSE.clone().text());
                VECTOR_RESPONSES.set(url, RESPONSE);
                STARTUP.report('vector-download', ++downloaded, VECTOR_URLS.length);
            }),
        );
        initStage = 'loading-vector-assets';
        LABEL.textContent = '캐릭터를 준비하고 있어요';
        // Keep troop and giant variants in separate quality-keyed startup cache entries.
        vectorLoader ||= globalThis.BloomGamekitVectorAssetLoader.createVectorAssetLoader({
            maxEntries: config.vectorAssets.length,
            fetch: async (url, options) => {
                const RESPONSE = VECTOR_RESPONSES.has(url)
                    ? VECTOR_RESPONSES.get(url).clone()
                    : await fetch(url, options);
                if (RESPONSE.ok) {
                    VECTOR_SOURCE_TEXT.set(url, await RESPONSE.clone().text());
                }
                return RESPONSE;
            },
        });
        const TROOPS = {},
            BOSSES = {},
            SOURCES = {};
        const RECORDS = [];
        STARTUP.report('vectors', 0, config.vectorAssets.length);
        for (const SPEC of config.vectorAssets) {
            await STARTUP.yield();
            const URL_LOCAL = new URL(SPEC.file + '?version=' + SPEC.sha256, document.baseURI).href;
            const PRESET = globalThis.BloomGamekitVectorAssetLoader.VECTOR_ASSET_QUALITY_PRESETS[SPEC.qualityPreset];
            if (!PRESET) {
                throw new Error('Unknown shared SVG quality preset: ' + SPEC.qualityPreset);
            }
            const COMPILED = await vectorLoader.load(URL_LOCAL, {
                ...PRESET,
                sourcePath: SPEC.file,
                expectedSha256: SPEC.sha256,
                maxBytes: SPEC.bytes,
            });
            if (COMPILED.sourceSha256 !== SPEC.sha256) {
                throw new Error('Vector source integrity failed: ' + SPEC.file);
            }
            RECORDS.push({
                spec: SPEC,
                compiled: COMPILED,
            });
            STARTUP.report('vectors', RECORDS.length, config.vectorAssets.length);
        }
        for (const { spec: SPEC, compiled: COMPILED } of RECORDS) {
            (SPEC.kind === 'troop' ? TROOPS : BOSSES)[SPEC.id] = COMPILED;
            if (SPEC.kind === 'troop') {
                SOURCES[SPEC.id] = VECTOR_SOURCE_TEXT.get(
                    new URL(SPEC.file + '?version=' + SPEC.sha256, document.baseURI).href,
                );
            }
        }
        VECTOR_RESPONSES.clear();
        globalThis.BudmoriVectorResources = Object.freeze({
            troops: Object.freeze(TROOPS),
            bosses: Object.freeze(BOSSES),
            sources: Object.freeze(SOURCES),
        });
        let scope = null;
        if (config.scope) {
            const ENTRY = {
                ...config.scope,
                name: 'app-simulation-scope',
                url: new URL(config.scope.file + '?version=' + config.scope.sha256, document.baseURI).href,
            };
            const RECORD = await namespace(ENTRY);
            globalThis.BloomSimulationScopeModule = RECORD.exports;
            scope = Object.freeze({
                ...ENTRY,
                verifiedImportURL: RECORD.verifiedImportURL,
            });
        }
        globalThis.BloomModuleReferences = Object.freeze({
            sourceCommit: config.sourceCommit,
            distCommit: config.distCommit,
            scope,
            modules: Object.freeze(
                MODULES.map(({ entry, record }) =>
                    Object.freeze({
                        ...entry,
                        verifiedImportURL: record.verifiedImportURL,
                    }),
                ),
            ),
            dispose() {
                for (const RECORD of READY.values()) {
                    URL.revokeObjectURL(RECORD.verifiedImportURL);
                }
                READY.clear();
            },
        });
        initStage = 'loading-game-script';
        STARTUP.report('game');
        await STARTUP.yield();
        // Native ES modules are the authored runtime; no generated IIFE or build artifact.
        const GAME_URL = new URL('./farm-app.js', import.meta.url).href;
        globalThis.BloomGameSourceURL = GAME_URL;
        globalThis.BloomGameSourceIntegrity = null;
        await import(GAME_URL);
        initStage = 'verifying-game-init';
        if (!globalThis.BUDMORI) {
            throw new Error('Game script loaded but app initialization did not complete');
        }
        started = true;
        initStage = 'ready';
        STARTUP.complete();
    } catch (error) {
        STARTUP.fail(fallbackText(error));
        recordDiagnostic(error, 'startup-error');
        LABEL.textContent = '게임을 시작하지 못했어요. 진단 정보를 복사해 알려 주세요';
        RETRY.hidden = false;
        console.error('Game startup failed at ' + initStage, error);
        showErrorPopup('게임 준비를 마치지 못했어요. ' + fallbackText(error));
    } finally {
        pending = false;
    }
}
globalThis.BloomReportRuntimeFatal = (error) => {
    initStage = 'runtime-frame';
    recordDiagnostic(error, 'runtime-fatal', {
        fatal: true,
    });
    console.error('Farm render loop stopped', error);
    showErrorPopup('게임이 오류로 중단됐어요. 진단 정보를 복사해 알려 주세요.');
};

if (config) {
    void launch();
}
