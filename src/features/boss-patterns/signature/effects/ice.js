import { TAU, ballistic, clamp, outBack, polar, rand } from './brush.js';

// Ice: a ring of thick, frosted crystals with white rime and a shattered end.
const ICE_CONFIG = Object.freeze({
    lifeMs: 1100,
    crystals: 20,
    bigEvery: 3,
    bigHeight: 4.6,
    bigHeightSpread: 1.2,
    smallHeight: 2.7,
    smallHeightSpread: 1,
    bigWidth: 1.1,
    smallWidth: 0.72,
    snow: 22,
    shatterPieces: 3,
    windupCrystals: 8,
    body: '#bfe0f3',
    shade: '#7fb5df',
    light: '#eaf7fd',
    outline: '#4f86b0',
    rime: '#f3fbff',
    rimeEdge: '#9cc6e6',
    frost: '#e6f6ff',
    frostEdge: '#bfe3fa',
    windupEdge: '#cfeaff',
    shard: '#a9d3ee',
    white: '#ffffff',
});

function crystal(brush, x, y, height, width, lean, seed, alpha) {
    const BASE = brush.at(x, y),
        H = brush.lift(height),
        W = width * brush.scale,
        SHOULDER = H * 0.68,
        TIP_X = BASE.x + lean * H,
        TIP_Y = BASE.y - H,
        SL = [BASE.x - W * 0.92 + lean * H * 0.3, BASE.y - SHOULDER],
        SR = [BASE.x + W * 0.92 + lean * H * 0.3, BASE.y - SHOULDER],
        TOP_L = [TIP_X - W * 0.22, TIP_Y + H * 0.07],
        TOP_R = [TIP_X + W * 0.22, TIP_Y + H * 0.07];
    brush.flat(x, y, width * 1.7, width * 1.7, ICE_CONFIG.rime, alpha * 0.8, ICE_CONFIG.rimeEdge, 0.04);
    brush.poly(
        [[BASE.x - W, BASE.y], SL, TOP_L, [TIP_X, TIP_Y], TOP_R, SR, [BASE.x + W, BASE.y]],
        ICE_CONFIG.body,
        alpha,
        ICE_CONFIG.outline,
        1.6,
    );
    brush.poly(
        [[BASE.x + W * 0.12, BASE.y], [TIP_X + W * 0.02, TIP_Y], TOP_R, SR, [BASE.x + W, BASE.y]],
        ICE_CONFIG.shade,
        alpha * 0.75,
    );
    brush.poly(
        [[BASE.x - W, BASE.y], SL, TOP_L, [TIP_X - W * 0.15, TIP_Y + H * 0.06], [BASE.x - W * 0.2, BASE.y - H * 0.32]],
        ICE_CONFIG.light,
        alpha * 0.7,
    );
    brush.poly([SL, TOP_L, [TIP_X, TIP_Y], TOP_R, SR, [BASE.x, BASE.y - H * 0.5]], ICE_CONFIG.white, alpha * 0.45);
    brush.stroke(
        [
            { x: BASE.x - W * 0.35, y: BASE.y - H * 0.05 },
            { x: BASE.x - W * 0.2 + (rand(seed, 5) - 0.5) * W * 0.6, y: BASE.y - H * 0.3 },
            { x: BASE.x - W * 0.3 + (rand(seed, 6) - 0.5) * W * 0.6, y: BASE.y - H * 0.55 },
        ],
        0.03,
        ICE_CONFIG.white,
        alpha * 0.85,
    );
    brush.stroke(
        [
            { x: BASE.x - W * 0.7, y: BASE.y - H * 0.14 },
            { x: BASE.x - W * 0.66 + lean * H * 0.2, y: BASE.y - SHOULDER },
        ],
        Math.max(0.03, width * 0.14),
        ICE_CONFIG.white,
        alpha * 0.9,
    );
}

function iceRing(brush, event, seconds) {
    const R = event.reach,
        FROST = clamp(seconds / 0.3) * (1 - clamp((seconds - 0.8) / 0.4));
    brush.flat(event.x, event.y, R * 0.96, R * 0.96, ICE_CONFIG.frost, 0.26 * FROST, ICE_CONFIG.frostEdge, 0.08);
    const SPOTS = [];
    for (let index = 0; index < ICE_CONFIG.crystals; index++) {
        const DIST = R * (0.5 + 0.45 * rand(index, 2));
        SPOTS.push({
            ...polar(event.x, event.y, (index / ICE_CONFIG.crystals) * TAU + rand(index, 1) * 0.25, DIST),
            index,
            dist: DIST,
        });
    }
    SPOTS.sort((a, b) => b.y - a.y);
    for (const SPOT of SPOTS) {
        const L = seconds - (SPOT.dist / R) * 0.28 - rand(SPOT.index, 3) * 0.05;
        if (L < 0) {
            continue;
        }
        const SHATTER = clamp((seconds - 0.7 - (SPOT.dist / R) * 0.1) / 0.3);
        if (SHATTER >= 1) {
            continue;
        }
        const BIG = SPOT.index % ICE_CONFIG.bigEvery === 0,
            HEIGHT =
                (BIG
                    ? ICE_CONFIG.bigHeight + ICE_CONFIG.bigHeightSpread * rand(SPOT.index, 4)
                    : ICE_CONFIG.smallHeight + ICE_CONFIG.smallHeightSpread * rand(SPOT.index, 5)) *
                outBack(clamp(L / 0.22)) *
                (1 - SHATTER * 0.5),
            WIDTH = (BIG ? ICE_CONFIG.bigWidth : ICE_CONFIG.smallWidth) * (1 - SHATTER * 0.3);
        crystal(
            brush,
            SPOT.x,
            SPOT.y,
            HEIGHT,
            WIDTH,
            (rand(SPOT.index, 6) - 0.5) * 0.25,
            SPOT.index,
            1 - SHATTER * SHATTER,
        );
        if (SHATTER > 0) {
            for (let piece = 0; piece < ICE_CONFIG.shatterPieces; piece++) {
                const AT = ballistic(
                    SPOT.x,
                    SPOT.y,
                    rand(SPOT.index * 9 + piece, 5) * TAU,
                    1 + 1.6 * rand(SPOT.index * 9 + piece, 6),
                    SHATTER,
                    HEIGHT * 0.4,
                    1.5,
                    4,
                );
                brush.dot(AT.x, AT.y, AT.z, 0.14, piece % 2 ? ICE_CONFIG.white : ICE_CONFIG.shard, 1 - SHATTER);
            }
        }
    }
    for (let index = 0; index < ICE_CONFIG.snow; index++) {
        const Q = (seconds - rand(index, 7) * 0.5) / 0.9;
        if (Q < 0 || Q > 1) {
            continue;
        }
        const AT = polar(event.x, event.y, rand(index, 8) * TAU, R * Math.sqrt(rand(index, 9)));
        brush.dot(AT.x, AT.y, 3.5 - Q * 3, 0.07 + 0.05 * rand(index, 10), ICE_CONFIG.white, Math.sin(Q * Math.PI));
    }
}

// Frost spreads over the danger ring and small crystals show up while the pulse winds up.
function iceWindup(brush, area, progress) {
    brush.flat(
        area.x,
        area.y,
        area.reach * progress,
        area.reach * progress,
        ICE_CONFIG.frost,
        0.2,
        ICE_CONFIG.windupEdge,
        0.06,
    );
    for (let index = 0; index < ICE_CONFIG.windupCrystals; index++) {
        const G = clamp((progress - index * 0.06) / 0.3);
        if (G > 0) {
            const AT = polar(
                area.x,
                area.y,
                (index / ICE_CONFIG.windupCrystals) * TAU + 0.2,
                area.reach * (0.5 + 0.4 * rand(index, 2)),
            );
            crystal(brush, AT.x, AT.y, 0.7 * G, 0.22, 0, index, 1);
        }
    }
}

export const ICE_EFFECT = Object.freeze({ lifeMs: ICE_CONFIG.lifeMs, draw: iceRing, windup: iceWindup });
