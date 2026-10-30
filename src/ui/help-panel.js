import { HELP_SCENES } from './help-scenes.js';

// The help tab: one pill tab per scene. A card is the real game in a frame (?help=<card>), so it is mounted only
// while the tab is visible and thrown away when it is not. The caption follows the frame's authoritative state.
const LOAD_TIMEOUT_MS = 15000;
// Beside the points the card never takes more than this share of the window height.
const MAX_HEIGHT_SHARE = 0.5;
// Never squeeze a stacked card below this height, even when the text under it needs the room.
const MIN_STACKED_HEIGHT = 160;
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
        STAGE = DEMO.parentElement,
        CAPTION = dollar('helpCaption'),
        POINTS = dollar('helpPoints'),
        TABS = dollar('helpTabs');
    let index = 0,
        frame = null,
        watch = 0,
        visible = false,
        startedAt = 0,
        endedAt = 0;
    // The frame boots the whole game, so its own start-up screen is hidden behind a plain placeholder until it plays.
    function reveal() {
        DEMO.dataset.loading = 'false';
        if (frame) {
            frame.style.visibility = '';
        }
    }
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
            reveal();
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
            reveal();
            CAPTION.textContent = '데모를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요';
            return;
        }
        watch = requestAnimationFrame(observe);
    }
    // The frame is the real game at the real window size, scaled down to fit the card: every proportion
    // (UI against the field, text against the boss) is what the player sees in play.
    function fit() {
        const WIDTH = window.innerWidth,
            HEIGHT = window.innerHeight,
            AVAILABLE_WIDTH = Math.max(120, STAGE.clientWidth),
            PANEL = dollar('helpPanel'),
            // Stacked (the points sit under the card): the card gets what the rest of the panel leaves free.
            STACKED = POINTS.offsetLeft <= STAGE.offsetLeft,
            CONTENT_BOTTOM =
                POINTS.getBoundingClientRect().bottom -
                PANEL.getBoundingClientRect().top +
                PANEL.scrollTop +
                parseFloat(getComputedStyle(PANEL).paddingBottom),
            ROOM = PANEL.clientHeight - (CONTENT_BOTTOM - DEMO.offsetHeight),
            AVAILABLE_HEIGHT = STACKED ? Math.max(MIN_STACKED_HEIGHT, ROOM) : HEIGHT * MAX_HEIGHT_SHARE,
            SCALE = Math.min(1, AVAILABLE_WIDTH / WIDTH, AVAILABLE_HEIGHT / HEIGHT);
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
        CAPTION.textContent = '';
        endedAt = 0;
        startedAt = performance.now();
        frame = document.createElement('iframe');
        frame.title = `${SCENE.title} 데모`;
        frame.tabIndex = -1;
        frame.style.visibility = 'hidden';
        DEMO.dataset.loading = 'true';
        frame.src = new URL(`?help=${SCENE.id}`, location.href).href;
        DEMO.replaceChildren(frame);
        fit();
        watch = requestAnimationFrame(observe);
    }
    function paintCard() {
        const SCENE = HELP_SCENES[index];
        POINTS.replaceChildren(
            ...SCENE.points.map((text) => {
                const POINT = document.createElement('li');
                POINT.textContent = text;
                return POINT;
            }),
        );
        for (const TAB of TABS.children) {
            TAB.setAttribute('aria-selected', String(Number(TAB.dataset.card) === index));
        }
    }
    function show(next) {
        index = Math.max(0, Math.min(HELP_SCENES.length - 1, next));
        paintCard();
        mount();
    }
    TABS.replaceChildren(
        ...HELP_SCENES.map((scene, cardIndex) => {
            const TAB = document.createElement('button');
            TAB.type = 'button';
            TAB.role = 'tab';
            TAB.dataset.card = String(cardIndex);
            TAB.textContent = scene.title;
            TAB.onclick = () => show(cardIndex);
            return TAB;
        }),
    );
    // The tab can open straight onto this card while its panel is still laid out at zero width, so the card
    // is fitted whenever the panel itself changes size, not only when the window does.
    window.addEventListener('resize', () => visible && fit());
    new ResizeObserver(() => visible && fit()).observe(STAGE);
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
