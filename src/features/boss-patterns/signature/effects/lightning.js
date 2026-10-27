import { TAU, ballistic, clamp, rand } from './brush.js';

// Lightning: a strike from above plus a forked arc between two bodies, one hop per chain link.
const LIGHTNING_CONFIG = Object.freeze({
    lifeMs: 360,
    sparks: 9,
    strikeThickness: 1.6,
    arcThickness: 1.3,
    windupArcs: 4,
    // Outer glow first, white core last; widths in world units.
    bolt: Object.freeze([
        Object.freeze({ width: 0.34, color: '#397b94', alpha: 0.45 }),
        Object.freeze({ width: 0.15, color: '#7fd0ff', alpha: 0.85 }),
        Object.freeze({ width: 0.07, color: '#f3fcff', alpha: 1 }),
    ]),
    scorch: '#1a1d2a',
    ring: '#c8ebff',
    glow: '#3a8ad8',
    spark: '#e6f6ff',
    windupGlow: '#7fd0ff',
});

function boltPoints(brush, from, to, seed, depth, out) {
    const A = brush.at(from.x, from.y, from.z),
        B = brush.at(to.x, to.y, to.z),
        DX = B.x - A.x,
        DY = B.y - A.y,
        LENGTH = Math.hypot(DX, DY) || 1,
        STEPS = Math.max(3, Math.floor(LENGTH / (brush.scale * 0.55))),
        AMP = Math.min(brush.scale * 1.1, LENGTH * 0.13),
        POINTS = [A];
    for (let step = 1; step < STEPS; step++) {
        const F = step / STEPS,
            OFFSET = (rand(step + seed * 13, seed) - 0.5) * 2 * AMP * Math.sin(F * Math.PI);
        POINTS.push({ x: A.x + DX * F - (DY / LENGTH) * OFFSET, y: A.y + DY * F + (DX / LENGTH) * OFFSET });
    }
    POINTS.push(B);
    out.push(POINTS);
    if (depth > 0) {
        for (let step = 2; step < STEPS - 1; step += 2) {
            if (rand(step + seed * 5, seed + 2) < 0.45) {
                const P = POINTS[step],
                    ANGLE = (rand(step, seed + 3) - 0.5) * 1.8,
                    LEN = LENGTH * (0.18 + 0.2 * rand(step, seed + 4));
                out.push([
                    P,
                    {
                        x: P.x + Math.sin(ANGLE) * LEN * 0.6,
                        y: P.y + Math.cos(ANGLE) * LEN * 0.8 * (rand(step, seed) > 0.5 ? 1 : -0.4),
                    },
                ]);
            }
        }
    }
}
function strokeBolt(brush, paths, alpha, thick) {
    for (const LAYER of LIGHTNING_CONFIG.bolt) {
        for (const PATH of paths) {
            brush.stroke(PATH, LAYER.width * thick, LAYER.color, alpha * LAYER.alpha);
        }
    }
}

function lightningHop(brush, event, seconds) {
    const FADE = (1 - clamp(seconds / 0.34)) ** 1.5,
        FLICKER = Math.floor(seconds * 30) + event.hop * 7,
        STRIKE = [],
        ARC = [],
        FROM = { x: event.x, y: event.y, z: 1 },
        TO = { x: event.toX, y: event.toY, z: 0.8 },
        RING = clamp(seconds / 0.26);
    brush.flat(event.toX, event.toY, 1.9, 1.9, LIGHTNING_CONFIG.scorch, 0.22 * FADE);
    brush.flat(
        event.toX,
        event.toY,
        0.5 + 3 * RING,
        0.5 + 3 * RING,
        null,
        (1 - RING) * 0.9,
        LIGHTNING_CONFIG.ring,
        0.12 * (1 - RING) + 0.04,
    );
    boltPoints(brush, { x: event.toX, y: event.toY, z: 7 }, TO, FLICKER, 2, STRIKE);
    boltPoints(brush, FROM, TO, FLICKER + 41, 1, ARC);
    // Bolts, their glow and the sparks are light: overlapping layers brighten instead of covering each other.
    brush.add(true);
    brush.dot(event.toX, event.toY, 0.8, 2.6 * FADE + 0.4, LIGHTNING_CONFIG.glow, 0.34 * FADE);
    strokeBolt(brush, STRIKE, FADE, LIGHTNING_CONFIG.strikeThickness);
    strokeBolt(brush, ARC, FADE, LIGHTNING_CONFIG.arcThickness);
    for (let index = 0; index < LIGHTNING_CONFIG.sparks; index++) {
        const AT = ballistic(
            event.toX,
            event.toY,
            rand(index + event.hop * 11, 1) * TAU,
            2 + 5 * rand(index, 2),
            seconds,
            0.8,
            4 * rand(index, 3),
            14,
        );
        brush.dot(AT.x, AT.y, Math.max(0, AT.z), 0.09, LIGHTNING_CONFIG.spark, FADE);
    }
}

// Arcs flicker around the rim of the danger disc while the chain winds up.
function lightningWindup(brush, area, progress, seconds) {
    brush.add(true);
    const FLICKER = Math.floor(seconds * 14);
    for (let index = 0; index < LIGHTNING_CONFIG.windupArcs; index++) {
        const A0 = seconds * 3 + (index * TAU) / LIGHTNING_CONFIG.windupArcs,
            PATH = [];
        for (let step = 0; step <= 6; step++) {
            const A = A0 + step * 0.07,
                R = area.reach * (1 + (rand(step + index * 9 + FLICKER, 2) - 0.5) * 0.18);
            PATH.push(brush.at(area.x + Math.cos(A) * R, area.y + Math.sin(A) * R, 0.1));
        }
        strokeBolt(brush, [PATH], 0.7 * progress, 0.55);
    }
    brush.dot(area.x, area.y, 6, 1.4 * progress, LIGHTNING_CONFIG.windupGlow, 0.3 * progress);
}

export const LIGHTNING_EFFECT = Object.freeze({
    lifeMs: LIGHTNING_CONFIG.lifeMs,
    draw: lightningHop,
    windup: lightningWindup,
});
