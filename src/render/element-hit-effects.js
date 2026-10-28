import { ELEMENTS } from '../model/lineage.js';

// How a unit's elemental hit looks on the enemy it lands on. One drawer per element id (lineage.js: 1 fire, 2 ice,
// 3 grass, 4 lightning, 5 water). A plain hit keeps the generic cream sparks in combat-feel.js.
// Presentation only: the hit event already carries the element and its matchup multiplier.
const MATCHUP_SIZE = Object.freeze({ 2: 1.25, 1: 1, 0.5: 0.8 });
const MATCHUP_PARTICLES = Object.freeze({ 2: 2, 1: 0, 0.5: -1 });
// Particle budget: [normal count, count while a crowded fight thins the decoration out].
const PARTICLES = Object.freeze({ 1: [6, 2], 2: [6, 2], 3: [5, 2], 4: [3, 1], 5: [7, 2] });
const TAU = Math.PI * 2;
const FLASH = '#fff4d6';
const LEAF_DARK_RGB = '86,130,84';
export const ELEMENT_RGB = Object.freeze(
    ELEMENTS.map((element) => {
        const N = parseInt(element.color.slice(1), 16);
        return `${(N >> 16) & 255},${(N >> 8) & 255},${N & 255}`;
    }),
);
const RAND = (seed, salt) => {
    const X = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
    return X - Math.floor(X);
};
const EASE_OUT = (t) => 1 - (1 - t) ** 3;

function frame(event, dense) {
    const MULT = event.elementMultiplier ?? 1,
        [BASE, THIN] = PARTICLES[event.element];
    return {
        size: MATCHUP_SIZE[MULT] ?? 1,
        count: dense ? THIN : Math.max(2, BASE + (MATCHUP_PARTICLES[MULT] ?? 0)),
        rgb: ELEMENT_RGB[event.element],
        seed: event.sequence || 0,
        at: (renderer, dx, dy, dz) => renderer.project(event.x + dx, event.y + dy, (event.z || 0.1) + dz),
    };
}
function flash(renderer, event, t, scale) {
    if (t < 0.28) {
        const C = renderer.project(event.x, event.y, event.z || 0.1),
            K = 1 - t / 0.28;
        renderer.ellipse(C.x, C.y, renderer.scale * 0.18 * K * scale, renderer.scale * 0.12 * K * scale, FLASH);
    }
}
const EMBER = {
    draw(renderer, event, t, dense) {
        const F = frame(event, dense),
            A = 1 - t;
        for (let i = 0; i < F.count; i++) {
            const ANGLE = (i / F.count) * TAU + F.seed * 0.7,
                REACH = (0.08 + 0.4 * EASE_OUT(t)) * F.size,
                P = F.at(
                    renderer,
                    Math.cos(ANGLE) * REACH,
                    Math.sin(ANGLE) * REACH,
                    (0.1 + 0.6 * EASE_OUT(t)) * F.size,
                ),
                R = renderer.scale * 0.085 * F.size * (1 - t * 0.7);
            renderer.ellipse(P.x, P.y, R * 1.7, R * 1.7, `rgba(${F.rgb},${A * 0.45})`);
            renderer.ellipse(P.x, P.y, R, R, `rgba(255,214,120,${A})`);
        }
        flash(renderer, event, t, 1);
    },
};
const DROPLET = {
    draw(renderer, event, t, dense) {
        const F = frame(event, dense),
            A = Math.min(1, (1 - t) * 1.4);
        for (let i = 0; i < F.count; i++) {
            const ANGLE = (i / F.count) * TAU + F.seed * 0.5,
                SPEED = 0.75 + RAND(i + F.seed, 7) * 0.4,
                OUT = 0.65 * t * SPEED * F.size,
                HEIGHT = (0.15 + (1.1 * t - 1.5 * t * t) * SPEED) * F.size,
                P = F.at(renderer, Math.cos(ANGLE) * OUT, Math.sin(ANGLE) * OUT, Math.max(0, HEIGHT)),
                R = renderer.scale * 0.065 * F.size * (1 - t * 0.4);
            renderer.ellipse(P.x, P.y, R, R, `rgba(${F.rgb},${A})`);
            renderer.ellipse(P.x - R * 0.3, P.y - R * 0.35, R * 0.35, R * 0.35, `rgba(255,255,255,${A * 0.7})`);
        }
        flash(renderer, event, t, 1);
    },
    ground(renderer, event, t) {
        const F = frame(event, false);
        renderer.ring(event.x, event.y, (0.1 + EASE_OUT(t) * 0.55) * F.size, `rgba(${F.rgb},${(1 - t) * 0.6})`, 0.035);
    },
};
const LEAF = {
    draw(renderer, event, t, dense) {
        const F = frame(event, dense),
            A = Math.min(1, (1 - t) * 1.3),
            GROWTH = Math.sin(Math.min(1, t * 1.3) * Math.PI) * 0.5 * F.size;
        for (const SIDE of [-1, 1]) {
            const BASE = renderer.project(event.x + SIDE * 0.06, event.y, 0),
                TIP = renderer.project(event.x + SIDE * 0.16 * F.size, event.y, GROWTH);
            renderer.line(BASE, TIP, 0.045, `rgba(${F.rgb},${A * 0.9})`);
        }
        for (let i = 0; i < F.count; i++) {
            const ANGLE = (i / F.count) * TAU + F.seed * 0.4 + t * 1.4,
                REACH = (0.1 + 0.55 * EASE_OUT(t * 0.9)) * F.size,
                P = F.at(
                    renderer,
                    Math.cos(ANGLE) * REACH,
                    Math.sin(ANGLE) * REACH,
                    (0.2 + Math.sin(t * 3.1) * 0.25) * F.size,
                );
            renderer.ellipse(
                P.x,
                P.y,
                renderer.scale * 0.11 * F.size,
                renderer.scale * 0.05 * F.size,
                `rgba(${i % 2 ? F.rgb : LEAF_DARK_RGB},${A})`,
                ANGLE + t * 5,
            );
        }
        flash(renderer, event, t, 0.8);
    },
};
const CRYSTAL = {
    draw(renderer, event, t, dense) {
        const F = frame(event, dense),
            A = 1 - t;
        for (let i = 0; i < F.count; i++) {
            const ANGLE = (i / F.count) * TAU + F.seed * 0.6,
                REACH = (0.08 + 0.6 * EASE_OUT(Math.min(1, t * 1.6))) * F.size,
                P = F.at(
                    renderer,
                    Math.cos(ANGLE) * REACH,
                    Math.sin(ANGLE) * REACH,
                    (0.12 + 0.2 * EASE_OUT(t)) * F.size,
                ),
                R = renderer.scale * 0.07 * F.size * (0.7 + RAND(i + F.seed, 5) * 0.6) * (1 - t * 0.5),
                TURN = ANGLE + t * 2;
            renderer.ellipse(P.x, P.y, R * 0.8, R * 1.7, `rgba(${F.rgb},${A})`, TURN);
            renderer.ellipse(P.x, P.y, R * 0.3, R * 1.2, `rgba(255,255,255,${A * 0.9})`, TURN);
        }
        flash(renderer, event, t, 1);
    },
    ground(renderer, event, t) {
        const F = frame(event, false),
            R = (0.1 + EASE_OUT(t) * 0.7) * F.size;
        for (let i = 0; i < 6; i++) {
            const START = (i / 6) * TAU;
            renderer.ring(event.x, event.y, R, `rgba(${F.rgb},${(1 - t) * 0.85})`, 0.04, START, START + TAU / 9);
        }
    },
};
const BOLT = {
    draw(renderer, event, t, dense) {
        const F = frame(event, dense),
            A = 1 - t;
        for (let i = 0; i < F.count; i++) {
            if (t > 0.2 && Math.floor(t * 14 + i) % 3 === 1) {
                continue;
            }
            const ANGLE = (i / F.count) * TAU + F.seed * 0.9,
                REACH = (0.15 + 0.7 * EASE_OUT(Math.min(1, t * 1.4))) * F.size;
            let from = F.at(renderer, 0, 0, 0.15 * F.size);
            for (let step = 1; step <= 4; step++) {
                const K = step / 4,
                    JITTER = (RAND(i * 9 + step, F.seed) - 0.5) * 0.28 * F.size,
                    TO = F.at(
                        renderer,
                        Math.cos(ANGLE) * REACH * K + JITTER,
                        Math.sin(ANGLE) * REACH * K - JITTER,
                        (0.15 + 0.15 * K) * F.size,
                    );
                renderer.line(from, TO, 0.07, `rgba(${F.rgb},${A})`);
                renderer.line(from, TO, 0.025, `rgba(255,255,240,${A})`);
                from = TO;
            }
        }
        flash(renderer, event, t, 1.5);
    },
};
const DRAWERS = Object.freeze({ 1: EMBER, 2: CRYSTAL, 3: LEAF, 4: BOLT, 5: DROPLET });

export function drawElementHit(renderer, event, t, dense) {
    DRAWERS[event.element].draw(renderer, event, t, dense);
}
// The floor ring under a hit: element colour where the element has one, nothing for lightning.
export function drawElementHitGround(renderer, event, t) {
    const DRAWER = DRAWERS[event.element];
    if (DRAWER.ground) {
        DRAWER.ground(renderer, event, t);
    } else if (DRAWER !== BOLT) {
        const F = frame(event, false);
        renderer.ring(event.x, event.y, (0.15 + t * 0.6) * F.size, `rgba(${F.rgb},${(1 - t) * 0.8})`, 0.06);
    }
}
