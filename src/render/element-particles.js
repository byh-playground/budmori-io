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
// shape: flame (rising hot trail), dot (droplet), shard (rotating crystal), leaf (spinning blade), bolt (zigzag).
// speed: ground reach in world units; lift: peak rise; gravity: pull back down; count: [normal, crowded fight].
export const ELEMENT_PARTICLES = Object.freeze({
    1: {
        shape: 'flame',
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
        ring: 'ripple',
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
// Visual language referenced against pixelfx's hit-spark, frost-nova and lightning-strike at
// a84159688af3ca37a4be05a0d422b94451b2e24e. Geometry is authored here for the native vector renderer.
// A restrained coloured shell, a narrow lit edge and a tiny hot core keep the element legible at game scale.
function shard(renderer, point, radius, angle, color, core, alpha) {
    const C = renderer.ctx,
        DX = Math.cos(angle) * radius,
        DY = Math.sin(angle) * radius;
    C.beginPath();
    C.moveTo(point.x + DX * 1.9, point.y + DY * 1.9);
    C.lineTo(point.x - DY * 0.65, point.y + DX * 0.65);
    C.lineTo(point.x - DX * 1.25, point.y - DY * 1.25);
    C.lineTo(point.x + DY * 0.65, point.y - DX * 0.65);
    C.closePath();
    C.fillStyle = `rgba(${color},${alpha})`;
    C.fill();
    renderer.line(
        { x: point.x - DX, y: point.y - DY },
        { x: point.x + DX * 1.65, y: point.y + DY * 1.65 },
        0.024,
        `rgba(${core},${alpha})`,
    );
}

// Draws the same bounded particle count as before. All paths depend only on progress and seed.
export function emitElementParticles(renderer, element, at, t, { count, size = 1, seed = 0 }) {
    if (t < 0 || t >= 1) {
        return;
    }
    const SPEC = ELEMENT_PARTICLES[element],
        RGB = ELEMENT_RGB[element],
        ALPHA = Math.min(1, (1 - t) * 1.35),
        MOVE = EASE_OUT(Math.min(1, t * 1.4));
    for (let i = 0; i < count; i++) {
        const ANGLE = (i / count) * TAU + seed * 0.7,
            SPREAD = 0.75 + RAND(i + seed, 7) * 0.5,
            REACH = (0.08 + SPEC.speed * SPREAD * MOVE) * size,
            RISE = (SPEC.lift * EASE_OUT(t) * SPREAD - SPEC.gravity * t * t) * size,
            X = at.x + Math.cos(ANGLE) * REACH,
            Y = at.y + Math.sin(ANGLE) * REACH,
            Z = Math.max(0, at.z + 0.1 * size + RISE),
            POINT = renderer.project(X, Y, Z),
            R = Math.max(renderer.pixelRatio * 0.65, renderer.scale * SPEC.size * size * (1 - t * 0.5));
        if (SPEC.shape === 'flame') {
            const TAIL = renderer.project(
                X - Math.cos(ANGLE) * 0.09 * size,
                Y - Math.sin(ANGLE) * 0.09 * size,
                Z - 0.12 * size,
            );
            renderer.line(TAIL, POINT, 0.11 * size * (1 - t * 0.55), `rgba(${RGB},${ALPHA * 0.7})`);
            renderer.line(TAIL, POINT, 0.035 * size, `rgba(${SPEC.core},${ALPHA})`);
            renderer.ellipse(POINT.x, POINT.y - R * 0.25, R * 0.52, R * 0.8, `rgba(255,250,209,${ALPHA})`);
        } else if (SPEC.shape === 'dot') {
            renderer.ellipse(POINT.x, POINT.y, R * 0.9, R * 1.55, `rgba(${RGB},${ALPHA * 0.85})`, ANGLE * 0.2);
            renderer.ellipse(POINT.x - R * 0.25, POINT.y - R * 0.45, R * 0.3, R * 0.65, `rgba(232,250,255,${ALPHA})`);
        } else if (SPEC.shape === 'shard') {
            shard(renderer, POINT, R, ANGLE + t * 2, RGB, SPEC.core, ALPHA);
        } else if (SPEC.shape === 'leaf') {
            const TURN = ANGLE + t * 5;
            renderer.ellipse(POINT.x, POINT.y, R * 1.25, R * 0.42, `rgba(${RGB},${ALPHA})`, TURN);
            renderer.line(
                { x: POINT.x - Math.cos(TURN) * R, y: POINT.y - Math.sin(TURN) * R },
                { x: POINT.x + Math.cos(TURN) * R, y: POINT.y + Math.sin(TURN) * R },
                0.025 * size,
                `rgba(218,255,151,${ALPHA})`,
            );
        } else if (Math.floor(t * 14 + i) % 3 !== 1 || t < 0.2) {
            const FROM = renderer.project(at.x, at.y, at.z + 0.15 * size),
                JITTER = (RAND(i + seed, 3) - 0.5) * R * 2,
                KNEE = {
                    x: FROM.x + (POINT.x - FROM.x) * 0.55 + JITTER,
                    y: FROM.y + (POINT.y - FROM.y) * 0.55 - JITTER,
                },
                END = { x: POINT.x, y: POINT.y };
            renderer.line(FROM, KNEE, 0.1 * size, `rgba(${RGB},${ALPHA * 0.7})`);
            renderer.line(KNEE, END, 0.07 * size, `rgba(${RGB},${ALPHA})`);
            renderer.line(FROM, KNEE, 0.025 * size, `rgba(${SPEC.core},${ALPHA})`);
            renderer.line(KNEE, END, 0.02 * size, `rgba(${SPEC.core},${ALPHA})`);
        }
    }
}
// One expanding ground rim; water adds a quieter inner ripple, frost keeps separated teeth.
export function drawElementRing(renderer, element, at, t, size) {
    if (t < 0 || t >= 1) {
        return;
    }
    const STYLE = ELEMENT_PARTICLES[element].ring,
        RADIUS = (0.12 + EASE_OUT(t) * 0.65) * size,
        ALPHA = (1 - t) ** 1.5,
        COLOR = `rgba(${ELEMENT_RGB[element]},${ALPHA * 0.65})`;
    if (STYLE === 'solid' || STYLE === 'ripple') {
        renderer.ring(at.x, at.y, RADIUS, COLOR, 0.045 * size);
        if (STYLE === 'ripple' && t > 0.12) {
            renderer.ring(at.x, at.y, RADIUS * 0.65, `rgba(207,239,255,${ALPHA * 0.48})`, 0.025 * size);
        }
    } else if (STYLE === 'dashed') {
        for (let i = 0; i < 6; i++) {
            renderer.ring(at.x, at.y, RADIUS, COLOR, 0.045 * size, (i / 6) * TAU, (i / 6) * TAU + TAU / 9);
        }
    }
}
