// Startup presentation only: no simulation clock, RNG or renderer state.
// Loaded as the first native module and reused by bootstrap. The HTML reload
// link remains usable even if this module itself is unavailable.
addEventListener(
    'error',
    (event) => {
        if (event.target?.matches?.('script[data-bloom-bootstrap]')) {
            document.getElementById('bloom-loading-label').textContent = '시작 파일을 불러오지 못했어요';
            document.getElementById('bloom-loading-detail').textContent = '연결 상태를 확인하고 다시 불러와 주세요.';
            document.getElementById('bloom-loading-progress').hidden = true;
            document.getElementById('bloom-loading-retry').hidden = false;
        }
    },
    true,
);
const LABELS = {
    modules: '게임 기능을 불러오고 있어요',
    'vector-download': '캐릭터 그림을 불러오고 있어요',
    vectors: '캐릭터 원본을 준비하고 있어요',
    game: '게임 화면을 준비하고 있어요',
    'atlas-plan': '애니메이션 구성을 준비하고 있어요',
    atlas: '애니메이션 이미지를 준비하고 있어요',
};

export function yieldStartupFrame() {
    return new Promise((resolve) => {
        // The timer also lets startup finish in a background tab where RAF stops.
        const DONE = () => {
            clearTimeout(TIMER);
            cancelAnimationFrame(FRAME);
            resolve();
        };
        const TIMER = setTimeout(DONE, 80);
        const FRAME = requestAnimationFrame(() => setTimeout(DONE, 0));
    });
}

export function createStartupLoading() {
    const ELEMENT = document.getElementById('bloom-module-loading'),
        LABEL = document.getElementById('bloom-loading-label'),
        DETAIL = document.getElementById('bloom-loading-detail'),
        PROGRESS = document.getElementById('bloom-loading-progress'),
        RETRY = document.getElementById('bloom-loading-retry'),
        STARTED = performance.now(),
        STAGES = [];
    let current = null;
    let state = 'loading';
    let finished = null;
    function report(stage, completed = null, total = null) {
        if (state !== 'loading') {
            return;
        }
        const NOW = performance.now();
        if (current?.stage !== stage) {
            if (current) {
                current.wallMs = NOW - current.startedAt;
            }
            current = { stage, startedAt: NOW, completed, total };
            STAGES.push(current);
        }
        Object.assign(current, { completed, total });
        LABEL.textContent = LABELS[stage] || LABELS.game;
        PROGRESS.hidden = false;
        if (Number.isInteger(total) && total > 0) {
            PROGRESS.max = total;
            PROGRESS.value = completed;
            DETAIL.textContent = `${completed} / ${total} 완료 · 현재 단계 기준`;
        } else {
            PROGRESS.removeAttribute('value');
            DETAIL.textContent = '준비가 끝나면 자동으로 시작해요';
        }
    }
    return Object.freeze({
        element: ELEMENT,
        label: LABEL,
        retry: RETRY,
        begin() {
            state = 'loading';
            finished = null;
            current = null;
        },
        report,
        yield: yieldStartupFrame,
        complete() {
            const NOW = performance.now();
            finished = NOW;
            if (current) {
                current.wallMs = NOW - current.startedAt;
            }
            state = 'ready';
            document.body.removeAttribute('data-startup');
            document.body.removeAttribute('aria-busy');
            ELEMENT.remove();
            // Startup controls can no longer retain focus over the real menu.
            if (!document.activeElement || document.activeElement === document.body) {
                document.querySelector('#continueGame:not(:disabled), #newGame')?.focus();
            }
        },
        fail(message) {
            state = 'error';
            finished = performance.now();
            if (current) {
                current.wallMs = finished - current.startedAt;
            }
            DETAIL.textContent = message;
            PROGRESS.hidden = true;
        },
        snapshot() {
            return {
                state,
                startedAtMs: STARTED,
                wallMs: (finished ?? performance.now()) - STARTED,
                stages: STAGES.map((stage) => ({ ...stage })),
            };
        },
    });
}
