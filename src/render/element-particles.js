import { ELEMENTS } from '../model/lineage.js';

// One particle routine for every elemental effect (hit, projectile, and any later melee contact). An element is a row in
// ELEMENT_PARTICLES: how many particles, how they fly, and what shape they are. Particles are a pure function of
// progress and a seed, so nothing is pooled or stored and the presentation never owns simulation state.
// lineage.js element ids: 1 fire, 2 ice, 3 grass, 4 lightning, 5 water.
const TAU = Math.PI * 2;
export const ELEMENT_RGB = Object.freeze(
    ELEMENTS.map((element) => {
        const N = parseInt(element.color.slice(1), 16);
        return `${(N >> 16) & 255},${(N >> 8) & 255},${N & 255}`;
    }),
);
// shape: dot (soft ember or droplet), shard (rotating crystal), leaf (spinning blade), bolt (flickering zigzag).
// speed: ground reach in world units; lift: peak rise; gravity: pull back down; count: [normal, crowded fight].
export const ELEMENT_PARTICLES = Object.freeze({
    1: {
        shape: 'dot',
        count: [6, 2],
        speed: 0.4,
        lift: 0.7,
        gravity: 0,
        size: 0.085,
        core: '255,214,120',
        ring: 'solid',
    },
    2: {
        shape: 'shard',
        count: [6, 2],
        speed: 0.65,
        lift: 0.2,
        gravity: 0,
        size: 0.07,
        core: '255,255,255',
        ring: 'dashed',
    },
    3: {
        shape: 'leaf',
        count: [5, 2],
        speed: 0.55,
        lift: 0.35,
        gravity: 0.25,
        size: 0.11,
        core: '86,130,84',
        ring: 'solid',
    },
    4: {
        shape: 'bolt',
        count: [3, 1],
        speed: 0.7,
        lift: 0.15,
        gravity: 0,
        size: 0.1,
        core: '255,255,240',
        ring: 'none',
    },
    5: {
        shape: 'dot',
        count: [7, 2],
        speed: 0.65,
        lift: 1.1,
        gravity: 1.5,
        size: 0.065,
        core: '176,206,255',
        ring: 'solid',
    },
});
const MATCHUP_SIZE = Object.freeze({ 2: 1.25, 1: 1, 0.5: 0.8 });
const MATCHUP_COUNT = Object.freeze({ 2: 2, 1: 0, 0.5: -1 });
const RAND = (seed, salt) => {
    const X = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
    return X - Math.floor(X);
};
const EASE_OUT = (t) => 1 - (1 - t) ** 3;

// How big and how many for a hit of this matchup (the same 1.25 / 1 / 0.8 the damage number uses).
export function matchupParticles(element, matchup, crowded) {
    const [NORMAL, CROWDED] = ELEMENT_PARTICLES[element].count;
    return {
        size: MATCHUP_SIZE[matchup] ?? 1,
        count: crowded ? CROWDED : Math.max(2, NORMAL + (MATCHUP_COUNT[matchup] ?? 0)),
    };
}
// Draws `count` particles of `element` flying out of `at` (world x, y, z) at progress t in 0..1.
export function emitElementParticles(renderer, element, at, t, { count, size = 1, seed = 0 }) {
    const SPEC = ELEMENT_PARTICLES[element],
        RGB = ELEMENT_RGB[element],
        ALPHA = Math.min(1, (1 - t) * 1.3),
        MOVE = EASE_OUT(Math.min(1, t * 1.4));
    for (let i = 0; i < count; i++) {
        const ANGLE = (i / count) * TAU + seed * 0.7,
            SPREAD = 0.75 + RAND(i + seed, 7) * 0.5,
            REACH = (0.08 + SPEC.speed * SPREAD * MOVE) * size,
            RISE = (SPEC.lift * EASE_OUT(t) * SPREAD - SPEC.gravity * t * t) * size,
            POINT = renderer.project(
                at.x + Math.cos(ANGLE) * REACH,
                at.y + Math.sin(ANGLE) * REACH,
                Math.max(0, at.z + 0.1 * size + RISE),
            ),
            R = renderer.scale * SPEC.size * size * (1 - t * 0.5);
        if (SPEC.shape === 'dot') {
            renderer.ellipse(POINT.x, POINT.y, R * 1.7, R * 1.7, `rgba(${RGB},${ALPHA * 0.45})`);
            renderer.ellipse(POINT.x, POINT.y, R, R, `rgba(${SPEC.core},${ALPHA})`);
        } else if (SPEC.shape === 'shard') {
            const TURN = ANGLE + t * 2;
            renderer.ellipse(POINT.x, POINT.y, R * 0.8, R * 1.7, `rgba(${RGB},${ALPHA})`, TURN);
            renderer.ellipse(POINT.x, POINT.y, R * 0.3, R * 1.2, `rgba(${SPEC.core},${ALPHA * 0.9})`, TURN);
        } else if (SPEC.shape === 'leaf') {
            renderer.ellipse(POINT.x, POINT.y, R, R * 0.45, `rgba(${i % 2 ? RGB : SPEC.core},${ALPHA})`, ANGLE + t * 5);
        } else if (Math.floor(t * 14 + i) % 3 !== 1 || t < 0.2) {
            const JITTER = (RAND(i + seed, 3) - 0.5) * R * 2,
                FROM = renderer.project(at.x, at.y, at.z + 0.15 * size);
            renderer.line(FROM, { x: POINT.x + JITTER, y: POINT.y - JITTER }, 0.07, `rgba(${RGB},${ALPHA})`);
            renderer.line(FROM, { x: POINT.x + JITTER, y: POINT.y - JITTER }, 0.025, `rgba(${SPEC.core},${ALPHA})`);
        }
    }
}
// The floor mark under an elemental effect: a solid ring, a broken (frosty) ring, or none.
export function drawElementRing(renderer, element, at, t, size) {
    const STYLE = ELEMENT_PARTICLES[element].ring,
        RADIUS = (0.12 + EASE_OUT(t) * 0.65) * size,
        COLOR = `rgba(${ELEMENT_RGB[element]},${(1 - t) * 0.8})`;
    if (STYLE === 'solid') {
        renderer.ring(at.x, at.y, RADIUS, COLOR, 0.05);
    } else if (STYLE === 'dashed') {
        for (let i = 0; i < 6; i++) {
            renderer.ring(at.x, at.y, RADIUS, COLOR, 0.04, (i / 6) * TAU, (i / 6) * TAU + TAU / 9);
        }
    }
}
