import { ELEMENTS } from '../model/lineage.js';
import { bossLeafCount, bossAuraLevel, BOSS_LEAF_ANGLES } from '../tower/boss-growth.js';
import { speciesFacePortraitSource, speciesMouthAnchor } from '../units/species-paint.js';
import { iconSvg } from './icons.js';

// The boss that is choosing a card in the doors panel. It eats the card it picked: it watches the card come, opens its
// mouth, bites, chews twice and swallows. Leaves and an aura around its body show how far it has grown.
// The face is the game's own state faces; the squash and stretch keep the body's volume.

const EAT_MS = 1000,
    GULP_MS = 860,
    FLIGHT_START_MS = 70,
    FLIGHT_MS = 480;

// Face changes in time: watch, mouth open, bite, two chews, swallow.
const EAT_FACES = Object.freeze([
    [0, 'hungry'],
    [90, 'surprised'],
    [430, 'neutral'],
    [520, 'focused'],
    [600, 'neutral'],
    [680, 'focused'],
    [760, 'neutral'],
    [830, 'happy'],
]);
const BODY_KEYS = Object.freeze([
    [0, 'scale(1) rotate(0)'],
    [0.09, 'scale(1.06,.93) rotate(0)'],
    [0.28, 'scale(.95,1.08) rotate(-3deg)'],
    [0.46, 'scale(.95,1.08) rotate(-3deg)'],
    [0.51, 'scale(1.1,.9) rotate(0)'],
    [0.6, 'scale(.98,1.03)'],
    [0.67, 'scale(1.04,.96)'],
    [0.74, 'scale(.99,1.02)'],
    [0.8, 'scale(1.04,.96)'],
    [0.86, 'scale(.92,1.14)'],
    [0.92, 'scale(1.1,.9)'],
    [0.97, 'scale(.98,1.03)'],
    [1, 'scale(1)'],
]);

let currentFace = '',
    appearanceKey = '',
    chipsKey = '',
    eatSerial = 0,
    gulpedSerial = 0,
    eatRun = null;

function reducedMotion() {
    return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
function setFace(host, species, element, face) {
    const IMG = host.querySelector('#doorBossImg');
    if (currentFace !== face || IMG.dataset.element !== String(element)) {
        currentFace = face;
        IMG.dataset.element = String(element);
        IMG.src = speciesFacePortraitSource(species, face, element);
    }
}
function drawGrowth(host, floor, element) {
    const COLOR = ELEMENTS[element]?.color || '#7bc96f';
    host.style.setProperty('--boss-elem', COLOR);
    let leaves = '';
    for (let i = 0; i < bossLeafCount(floor); i++) {
        leaves +=
            `<g transform="rotate(${BOSS_LEAF_ANGLES[i]} 100 76)">` +
            '<path d="M100 80 C84 56 90 30 100 16 C110 30 116 56 100 80Z" fill="#7bc96f" stroke="#1b2410" stroke-width="3.5"/>' +
            '<path d="M100 74 L100 28" stroke="#1b2410" stroke-width="2" opacity=".5"/></g>';
    }
    host.querySelector('#doorBossFx').innerHTML =
        '<defs><radialGradient id="doorBossAura" cx="50%" cy="58%" r="50%">' +
        `<stop offset="55%" stop-color="${COLOR}" stop-opacity="0"/><stop offset="100%" stop-color="${COLOR}" stop-opacity=".6"/>` +
        '</radialGradient></defs>' +
        `<circle cx="100" cy="116" r="84" fill="url(#doorBossAura)" opacity="${bossAuraLevel(floor)}"/>` +
        leaves;
}
function drawChips(host, chips, hideId) {
    const HOST = host.querySelector('#doorBossCards');
    HOST.replaceChildren(
        ...chips.map((chip) => {
            const ITEM = document.createElement('i');
            ITEM.title = `${chip.name} Lv.${chip.level}`;
            ITEM.innerHTML = iconSvg(chip.icon) + (chip.level > 1 ? chip.level : '');
            ITEM.dataset.new = String(chip.id === hideId);
            return ITEM;
        }),
    );
}

function cancelEat() {
    if (!eatRun) {
        return;
    }
    for (const TIMER of eatRun.timers) {
        clearTimeout(TIMER);
    }
    for (const ANIMATION of eatRun.animations) {
        ANIMATION.cancel();
    }
    eatRun.ghost?.remove();
    eatRun = null;
}

function playEat(host, species, element, cardEl, onGulp) {
    cancelEat();
    const RUN = (eatRun = { timers: [], animations: [], ghost: null }),
        BODY = host.querySelector('#doorBossBody'),
        IMG = host.querySelector('#doorBossImg'),
        RING = host.querySelector('#doorBossRing'),
        IMG_BOX = IMG.getBoundingClientRect(),
        CARD_BOX = cardEl.getBoundingClientRect(),
        MOUTH = speciesMouthAnchor(species);
    const END = {
            x: IMG_BOX.left + IMG_BOX.width * MOUTH.x - (CARD_BOX.left + CARD_BOX.width / 2),
            y: IMG_BOX.top + IMG_BOX.height * MOUTH.y - (CARD_BOX.top + CARD_BOX.height / 2),
        },
        CONTROL = { x: END.x + (END.x >= 0 ? -70 : 70), y: END.y * 0.55 - 40 };
    const GHOST = cardEl.cloneNode(true);
    GHOST.classList.add('boss-eat-ghost');
    GHOST.removeAttribute('id');
    Object.assign(GHOST.style, {
        left: CARD_BOX.left + 'px',
        top: CARD_BOX.top + 'px',
        width: CARD_BOX.width + 'px',
        height: CARD_BOX.height + 'px',
        opacity: '0',
    });
    document.body.append(GHOST);
    RUN.ghost = GHOST;
    cardEl.style.opacity = '0.3';
    const STEPS = 9,
        FRAMES = [];
    for (let i = 0; i <= STEPS; i++) {
        // The card accelerates toward the mouth along a curve, turning and shrinking as it goes.
        const T = Math.pow(i / STEPS, 1.8),
            U = 1 - T;
        FRAMES.push({
            offset: i / STEPS,
            opacity: i === STEPS ? 0 : 1,
            transform:
                `translate(${(2 * U * T * CONTROL.x + T * T * END.x).toFixed(1)}px,${(2 * U * T * CONTROL.y + T * T * END.y).toFixed(1)}px) ` +
                `rotate(${(-38 * T).toFixed(1)}deg) scale(${(1 - 0.85 * T).toFixed(2)})`,
        });
    }
    RUN.timers.push(
        setTimeout(() => {
            RUN.animations.push(GHOST.animate(FRAMES, { duration: FLIGHT_MS, easing: 'linear', fill: 'forwards' }));
        }, FLIGHT_START_MS),
    );
    RUN.animations.push(
        BODY.animate(
            BODY_KEYS.map(([offset, transform]) => ({ offset, transform })),
            { duration: EAT_MS, easing: 'ease-in-out' },
        ),
    );
    for (const [AT, FACE] of EAT_FACES) {
        RUN.timers.push(setTimeout(() => setFace(host, species, element, FACE), AT));
    }
    RUN.timers.push(
        setTimeout(() => {
            RUN.animations.push(
                RING.animate(
                    [
                        { opacity: 0.9, transform: 'scale(.6)' },
                        { opacity: 0, transform: 'scale(2.6)' },
                    ],
                    { duration: 650, easing: 'ease-out' },
                ),
            );
            GHOST.remove();
            onGulp();
        }, GULP_MS),
    );
    RUN.timers.push(
        setTimeout(() => {
            GHOST.remove();
            eatRun = null;
        }, EAT_MS),
    );
}

// Keeps the boss in the doors panel in step with the card choice. `cards` lists what the boss has so far.
export function syncBossChoiceMascot(host, state) {
    const VISIBLE = state.visible,
        SPECIES = state.species,
        FLOOR = state.floor,
        ELEMENT = state.element,
        SERIAL = state.serial,
        PHASE = state.phase,
        SELECTED_EL = state.selectedEl,
        CARDS = state.cards,
        PICKED_ID = state.pickedId;
    host.hidden = !VISIBLE;
    if (!VISIBLE) {
        cancelEat();
        appearanceKey = chipsKey = '';
        currentFace = '';
        eatSerial = gulpedSerial = 0;
        return;
    }
    const APPEAR = `${FLOOR}:${ELEMENT}`;
    if (appearanceKey !== APPEAR) {
        appearanceKey = APPEAR;
        drawGrowth(host, FLOOR, ELEMENT);
    }
    if (PHASE === 'selected' && eatSerial !== SERIAL) {
        eatSerial = SERIAL;
        if (SELECTED_EL && !reducedMotion()) {
            playEat(host, SPECIES, ELEMENT, SELECTED_EL, () => {
                gulpedSerial = SERIAL;
                chipsKey = '';
                drawChipsFor(host, CARDS, SERIAL, true, PICKED_ID);
            });
        } else {
            gulpedSerial = SERIAL;
            setFace(host, SPECIES, ELEMENT, 'happy');
        }
    } else if (!eatRun) {
        setFace(
            host,
            SPECIES,
            ELEMENT,
            PHASE === 'outcome' || PHASE === '' ? 'happy' : PHASE === 'offers' ? 'hungry' : 'neutral',
        );
    }
    drawChipsFor(host, CARDS, SERIAL, PHASE === 'outcome' || PHASE === '' || gulpedSerial === SERIAL, PICKED_ID);
}

function drawChipsFor(host, cards, serial, revealed, pickedId) {
    const KEY = `${serial}:${revealed}:${cards.length}`;
    if (chipsKey === KEY) {
        return;
    }
    chipsKey = KEY;
    drawChips(host, revealed ? cards : cards.filter((card) => card.id !== pickedId), revealed ? pickedId : null);
}
