// Startup presentation only: no simulation clock, RNG or renderer state.
// Loaded as the first native module and reused by bootstrap. The HTML reload
// link remains usable even if this module itself is unavailable.
// Progress itself is GameKit boot (createBoot/bindBootProgress/yieldFrame); this file owns the stages, their
// weights and the text (docs/startup-loading.md).
import { applyPageText } from './i18n/text.js';
import { BOOT } from './i18n/messages/boot.js';
import { PAGE } from './i18n/messages/page.js';
import { unitArtMode } from './render/unit-art.js';

// The page's static text (data-i18n) in the page locale. This is the first module the page runs, so the loading
// panel already reads in the player's language before bootstrap reports any step (docs/i18n.md).
applyPageText(document, PAGE);
const ELEMENT = document.getElementById('bloom-module-loading'),
    LABEL = document.getElementById('bloom-loading-label'),
    DETAIL = document.getElementById('bloom-loading-detail'),
    PROGRESS = document.getElementById('bloom-loading-progress'),
    RETRY = document.getElementById('bloom-loading-retry');
addEventListener(
    'error',
    (event) => {
        if (event.target?.matches?.('script[data-bloom-bootstrap]')) {
            showStartupFailure(BOOT.bootstrapUnavailable(), BOOT.bootstrapUnavailableDetail());
        }
    },
    true,
);
// Weight = the stage's share of the bar: its measured wall time in tenths of a second, at least 1
// (docs/startup-loading.md "단계 가중치"; the sprite path sums to the measured 6.1 s). The atlas stages exist only
// with the sprite body-art backend, so the default vector path fills the bar with its own five stages.
const LOAD_STAGES = Object.freeze([
    { id: 'modules', weight: 1 },
    { id: 'vector-download', weight: 1 },
    { id: 'vectors', weight: 4 },
    { id: 'game-modules', weight: 6 },
    { id: 'game', weight: 3 },
]);
const ATLAS_STAGES = Object.freeze([
    { id: 'atlas-plan', weight: 2 },
    { id: 'atlas', weight: 44 },
]);
const STARTUP_STAGES = Object.freeze(
    unitArtMode(location.search) === 'sprite' ? [...LOAD_STAGES, ...ATLAS_STAGES] : LOAD_STAGES,
);
const LABELS = {
    modules: BOOT.stageModules,
    'vector-download': BOOT.stageVectorDownload,
    vectors: BOOT.stageVectors,
    'game-modules': BOOT.stageGameModules,
    game: BOOT.stageGame,
    'atlas-plan': BOOT.stageAtlasPlan,
    atlas: BOOT.stageAtlas,
};

// A failure before or during loading: the static reload link does a full page reload (no in-page retry).
export function showStartupFailure(label, detail) {
    LABEL.textContent = label;
    DETAIL.textContent = detail;
    PROGRESS.hidden = true;
    RETRY.hidden = false;
}

// The argument is the verified GameKit boot module. The returned controller is also `globalThis.BudmoriStartup`, which
// the game uses to report its own stages (report/finish) and to yield between synchronous work.
export function createStartupLoading({ createBoot, bindBootProgress, yieldFrame }) {
    const STARTED = performance.now(),
        TIMES = [],
        REPORTED = new Map(),
        BOOT_PROGRESS = createBoot({ stages: STARTUP_STAGES });
    let state = 'loading';
    let finished = null;
    BOOT_PROGRESS.subscribe((progress) => {
        if (state !== 'loading') {
            return;
        }
        const NOW = performance.now();
        if (progress.stage && TIMES.at(-1)?.stage !== progress.stage) {
            TIMES.push({ stage: progress.stage, startedAtMs: NOW - STARTED });
        }
        Object.assign(TIMES.at(-1) ?? {}, {
            completed: progress.completed,
            total: progress.total,
            endedAtMs: NOW - STARTED,
        });
    });
    bindBootProgress(BOOT_PROGRESS, {
        progress: PROGRESS,
        label: LABEL,
        text: (progress) =>
            progress.failed
                ? BOOT.startFailed()
                : BOOT.stageProgress({
                      stage: (LABELS[progress.stage] ?? PAGE.loadingLabel)(),
                      percent: Math.floor(progress.overall * 100),
                  }),
    });
    DETAIL.textContent = '';
    return Object.freeze({
        boot: BOOT_PROGRESS,
        yield: yieldFrame,
        // The game reports absolute counts (completed of total); the first report begins the stage.
        report(stage, completed, total) {
            if (!REPORTED.has(stage)) {
                BOOT_PROGRESS.begin(stage, total);
                REPORTED.set(stage, 0);
            }
            if (completed > REPORTED.get(stage)) {
                BOOT_PROGRESS.advance(stage, completed - REPORTED.get(stage));
                REPORTED.set(stage, completed);
            }
        },
        finish(stage) {
            BOOT_PROGRESS.finish(stage);
        },
        complete() {
            finished = performance.now();
            state = 'ready';
            BOOT_PROGRESS.complete();
            document.body.removeAttribute('data-startup');
            document.body.removeAttribute('aria-busy');
            ELEMENT.remove();
            // Startup controls can no longer retain focus over the real menu.
            if (!document.activeElement || document.activeElement === document.body) {
                document.querySelector('#continueGame:not(:disabled), #newGame')?.focus();
            }
        },
        fail(error, message) {
            finished = performance.now();
            state = 'error';
            BOOT_PROGRESS.fail(error);
            showStartupFailure(BOOT.startFailed(), message);
        },
        snapshot() {
            return {
                state,
                startedAtMs: STARTED,
                wallMs: (finished ?? performance.now()) - STARTED,
                overall: BOOT_PROGRESS.state.overall,
                stages: TIMES.map((stage) => ({ ...stage, wallMs: stage.endedAtMs - stage.startedAtMs })),
            };
        },
    });
}
