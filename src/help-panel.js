import { HELP_SCENES } from './help-scenes.js';

// The help tab: one card per scene. A card is the real game in a frame (?help=<card>), so it is mounted only
// while the tab is visible and thrown away when it is not. The caption follows the frame's authoritative state.
const LOAD_TIMEOUT_MS = 15000;
// The card never takes more than this share of the window height, so the caption and buttons stay on screen.
const MAX_HEIGHT_SHARE = 0.5;
// A finished card rests this long on its last frame, then plays again by itself.
const LOOP_PAUSE_MS = 1500;

function readSnapshot(frame) {
    try {
        return frame.contentWindow?.__budmoriHelp?.snapshot() ?? null;
    } catch {
        return null;
    }
}

export function createHelpPanel(dollar) {
    const DEMO = dollar('helpDemo'),
        CAPTION = dollar('helpCaption'),
        TITLE = dollar('helpTitle'),
        RULE = dollar('helpRule'),
        DOTS = dollar('helpDots'),
        PREV = dollar('helpPrev'),
        NEXT = dollar('helpNext');
    let index = 0,
        frame = null,
        watch = 0,
        visible = false,
        startedAt = 0,
        endedAt = 0;
    function unmount() {
        cancelAnimationFrame(watch);
        watch = 0;
        frame?.remove();
        frame = null;
    }
    function observe() {
        if (!frame) {
            return;
        }
        const SNAPSHOT = readSnapshot(frame);
        if (SNAPSHOT) {
            CAPTION.textContent = HELP_SCENES[index].steps[SNAPSHOT.step] ?? '';
            if (SNAPSHOT.state !== 'ended') {
                endedAt = 0;
            } else if (endedAt === 0) {
                endedAt = performance.now();
            } else if (performance.now() - endedAt > LOOP_PAUSE_MS) {
                mount();
                return;
            }
        } else if (performance.now() - startedAt > LOAD_TIMEOUT_MS) {
            CAPTION.textContent = '데모를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요';
            return;
        }
        watch = requestAnimationFrame(observe);
    }
    // The frame is the real game at the real window size, scaled down to fit the card: every proportion
    // (UI against the field, text against the boss) is what the player sees in play.
    function fit() {
        const PANEL = dollar('helpPanel'),
            WIDTH = window.innerWidth,
            HEIGHT = window.innerHeight,
            AVAILABLE_WIDTH = Math.max(120, PANEL.clientWidth - 2 * parseFloat(getComputedStyle(PANEL).paddingLeft)),
            SCALE = Math.min(1, AVAILABLE_WIDTH / WIDTH, (HEIGHT * MAX_HEIGHT_SHARE) / HEIGHT);
        DEMO.style.width = `${Math.round(WIDTH * SCALE)}px`;
        DEMO.style.height = `${Math.round(HEIGHT * SCALE)}px`;
        if (frame) {
            frame.style.width = `${WIDTH}px`;
            frame.style.height = `${HEIGHT}px`;
            frame.style.transform = `scale(${SCALE})`;
        }
    }
    function mount() {
        unmount();
        if (!visible) {
            return;
        }
        const SCENE = HELP_SCENES[index];
        CAPTION.textContent = '불러오는 중이에요';
        endedAt = 0;
        startedAt = performance.now();
        frame = document.createElement('iframe');
        frame.title = `${SCENE.title} 데모`;
        frame.tabIndex = -1;
        frame.src = new URL(`?help=${SCENE.id}`, location.href).href;
        DEMO.replaceChildren(frame);
        fit();
        watch = requestAnimationFrame(observe);
    }
    function paintCard() {
        const SCENE = HELP_SCENES[index];
        TITLE.textContent = `${index + 1}/${HELP_SCENES.length} · ${SCENE.title}`;
        RULE.textContent = SCENE.rule;
        PREV.disabled = index === 0;
        NEXT.disabled = index === HELP_SCENES.length - 1;
        for (const DOT of DOTS.children) {
            DOT.setAttribute('aria-current', String(Number(DOT.dataset.card) === index));
        }
    }
    function show(next) {
        index = Math.max(0, Math.min(HELP_SCENES.length - 1, next));
        paintCard();
        mount();
    }
    DOTS.replaceChildren(
        ...HELP_SCENES.map((scene, cardIndex) => {
            const DOT = document.createElement('button');
            DOT.type = 'button';
            DOT.dataset.card = String(cardIndex);
            DOT.setAttribute('aria-label', scene.title);
            DOT.onclick = () => show(cardIndex);
            return DOT;
        }),
    );
    PREV.onclick = () => show(index - 1);
    NEXT.onclick = () => show(index + 1);
    window.addEventListener('resize', () => visible && fit());
    paintCard();
    return {
        setVisible(value) {
            if (visible === value) {
                return;
            }
            visible = value;
            if (visible) {
                mount();
            } else {
                unmount();
            }
        },
    };
}
