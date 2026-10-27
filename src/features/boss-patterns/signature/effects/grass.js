import { TAU, ballistic, clamp, outBack, polar, rand } from './brush.js';

// Grass: tapered green sprouts that burst from the ground.
const GRASS_CONFIG = Object.freeze({
    lifeMs: 1400,
    sprouts: 7,
    mainHeight: 7.6,
    mainWidth: 0.75,
    smallHeight: 2.6,
    smallHeightSpread: 2,
    smallWidth: 0.3,
    smallWidthSpread: 0.08,
    dustPuffs: 7,
    flecks: 12,
    windupSprouts: 5,
    body: '#7fd24a',
    dark: '#2d6a1c',
    leaf: '#6cc23c',
    main: '#6fcf3e',
    tip: '#c0f580',
    soil: '#4a3720',
    soilLight: '#6b4f2c',
    ring: '#fff0c8',
    dust: '#e7d4b0',
    fleckGreen: '#8fe05a',
    fleckSoil: '#8a6a3c',
});
const MAIN_SPOT = 99;

function leaf(brush, x, y, angle, size, fill) {
    const COS = Math.cos(angle),
        SIN = Math.sin(angle),
        PTS = [
            [0, 0],
            [size * 0.55, -size * 0.34],
            [size * 1.7, -size * 0.06],
            [size * 0.6, size * 0.3],
        ].map(([lx, ly]) => [x + lx * COS - ly * SIN, y + lx * SIN + ly * COS]);
    brush.poly(PTS, fill, 1, GRASS_CONFIG.dark, 1.2);
}
function sprout(brush, x, y, height, width, lean, seconds, seed, fill, alpha) {
    const BASE = brush.at(x, y),
        PX = brush.lift(height),
        SEGMENTS = 9,
        LEFT = [],
        RIGHT = [],
        MIDS = [];
    for (let index = 0; index <= SEGMENTS; index++) {
        const F = index / SEGMENTS,
            HALF = width * brush.scale * (1 - F) ** 0.8 + 0.4,
            CX = BASE.x + Math.sin(seed + seconds * 5 + F * 3) * PX * 0.05 * F + lean * PX * F * F,
            CY = BASE.y - PX * F;
        LEFT.push([CX - HALF, CY]);
        RIGHT.push([CX + HALF, CY]);
        MIDS.push([CX, CY]);
    }
    const OUTLINE = [...LEFT, ...RIGHT.reverse()];
    brush.poly(OUTLINE, fill, alpha, GRASS_CONFIG.dark, 2);
    if (PX > brush.scale * 1.4) {
        const A = MIDS[4],
            SIZE = Math.max(7, width * brush.scale * 1.6);
        leaf(brush, A[0], A[1], -2.7, SIZE, GRASS_CONFIG.leaf);
        leaf(brush, A[0], A[1], -0.45, SIZE, GRASS_CONFIG.leaf);
    }
    leaf(
        brush,
        MIDS[SEGMENTS][0],
        MIDS[SEGMENTS][1],
        -Math.PI / 2,
        Math.max(6, width * brush.scale * 1.3),
        GRASS_CONFIG.tip,
    );
}

function grassEruption(brush, event, seconds) {
    const R = event.reach,
        UP = clamp(seconds / 0.18) * (1 - clamp((seconds - 0.8) / 0.4)),
        RING = clamp(seconds / 0.5),
        FADE = seconds > 0.85 ? 1 - clamp((seconds - 0.85) / 0.5) : 1;
    brush.flat(event.x, event.y, R * 0.62 * UP, R * 0.62 * UP, GRASS_CONFIG.soil, 0.9);
    brush.flat(event.x, event.y, R * 0.45 * UP, R * 0.45 * UP, GRASS_CONFIG.soilLight, 0.9);
    if (RING < 1) {
        brush.flat(
            event.x,
            event.y,
            R * (0.3 + 0.95 * RING),
            R * (0.3 + 0.95 * RING),
            null,
            0.8 * (1 - RING),
            GRASS_CONFIG.ring,
            0.1,
        );
    }
    const SPOTS = [];
    for (let index = 0; index < GRASS_CONFIG.sprouts; index++) {
        const AT = polar(
            event.x,
            event.y,
            (index / GRASS_CONFIG.sprouts) * TAU + 0.4,
            R * (0.55 + 0.35 * rand(index, 8)),
        );
        SPOTS.push({ ...AT, index });
    }
    SPOTS.push({ x: event.x, y: event.y, index: MAIN_SPOT });
    SPOTS.sort((a, b) => b.y - a.y);
    for (const SPOT of SPOTS) {
        const MAIN = SPOT.index === MAIN_SPOT,
            L = clamp((seconds - (MAIN ? 0 : 0.06 + SPOT.index * 0.03)) / 0.5);
        if (L <= 0 || FADE <= 0) {
            continue;
        }
        const HEIGHT =
                (MAIN
                    ? GRASS_CONFIG.mainHeight
                    : GRASS_CONFIG.smallHeight + GRASS_CONFIG.smallHeightSpread * rand(SPOT.index, 2)) *
                (L < 1 ? outBack(L) : 1) *
                FADE,
            WIDTH = MAIN
                ? GRASS_CONFIG.mainWidth
                : GRASS_CONFIG.smallWidth + GRASS_CONFIG.smallWidthSpread * rand(SPOT.index, 3);
        brush.flat(SPOT.x, SPOT.y, WIDTH * 2.2, WIDTH * 2.2, GRASS_CONFIG.soil, 0.9 * FADE);
        sprout(
            brush,
            SPOT.x,
            SPOT.y,
            HEIGHT,
            WIDTH,
            ((SPOT.x - event.x) / R) * 0.15,
            seconds,
            SPOT.index,
            MAIN ? GRASS_CONFIG.main : GRASS_CONFIG.body,
            Math.min(1, FADE * 1.4),
        );
    }
    for (let index = 0; index < GRASS_CONFIG.dustPuffs; index++) {
        const T = seconds - rand(index, 2) * 0.12;
        if (T < 0 || T > 0.7) {
            continue;
        }
        const K = T / 0.7,
            AT = polar(event.x, event.y, rand(index, 1) * TAU, R * (0.2 + 0.9 * rand(index, 3)) * K);
        brush.dot(AT.x, AT.y, K * 0.6, 0.25 + 0.45 * K, GRASS_CONFIG.dust, 0.65 * (1 - K));
    }
    const FLECK_TIME = seconds - 0.02;
    if (FLECK_TIME >= 0 && FLECK_TIME <= 1) {
        for (let index = 0; index < GRASS_CONFIG.flecks; index++) {
            const AT = ballistic(
                event.x,
                event.y,
                rand(index, 1) * TAU,
                0.8 + 2 * rand(index, 2),
                FLECK_TIME,
                0,
                3 + 4 * rand(index, 3),
                9,
            );
            if (AT.z >= 0) {
                brush.dot(
                    AT.x,
                    AT.y,
                    AT.z,
                    index % 2 ? 0.1 : 0.14,
                    index % 2 ? GRASS_CONFIG.fleckGreen : GRASS_CONFIG.fleckSoil,
                    1 - FLECK_TIME,
                );
            }
        }
    }
}

// Small sprouts poke out of the ground inside the danger disc while the eruption winds up.
function grassWindup(brush, area, progress, seconds) {
    for (let index = 0; index < GRASS_CONFIG.windupSprouts; index++) {
        const G = clamp((progress - 0.15 - index * 0.1) / 0.35);
        if (G <= 0) {
            continue;
        }
        const AT = polar(
            area.x,
            area.y,
            (index / GRASS_CONFIG.windupSprouts) * TAU + 0.3,
            area.reach * (0.4 + 0.5 * rand(index, 3)),
        );
        brush.flat(AT.x, AT.y, 0.3 * G, 0.3 * G, GRASS_CONFIG.soil, 0.9);
        sprout(
            brush,
            AT.x,
            AT.y,
            0.6 + 0.6 * G,
            0.12,
            Math.sin(seconds * 10 + index) * 0.2,
            seconds,
            index,
            GRASS_CONFIG.body,
            1,
        );
    }
}

export const GRASS_EFFECT = Object.freeze({ lifeMs: GRASS_CONFIG.lifeMs, draw: grassEruption, windup: grassWindup });
