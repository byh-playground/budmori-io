import { TAU, clamp01, drawSparkle, easeOut, pop, rgba } from './vfx-kit.js';

const GOLD = '#e1be67',
    GOLD_LIGHT = '#fae19e',
    FOOD = '#c2913e',
    DUST = '#b3a989',
    DUST_DARK = '#7e7e63',
    CREAM = '#fff4cf';

// Ring of short tapered ticks on the ground, used for impacts and shockwave edges.
function groundTicks(renderer, x, y, inner, outer, count, color, width, offset = 0) {
    const C = renderer.ctx;
    C.strokeStyle = color;
    C.lineWidth = Math.max(0.5, width);
    C.lineCap = 'round';
    for (let index = 0; index < count; index++) {
        const ANGLE = offset + (index * TAU) / count,
            FROM = renderer.project(x + Math.cos(ANGLE) * inner, y + Math.sin(ANGLE) * inner, 0.02),
            TO = renderer.project(x + Math.cos(ANGLE) * outer, y + Math.sin(ANGLE) * outer, 0.02);
        C.beginPath();
        C.moveTo(FROM.x, FROM.y);
        C.lineTo(TO.x, TO.y);
        C.stroke();
    }
}
// A flat puff that grows while rising and fades.
function puff(renderer, x, y, z, radius, color, alpha) {
    const POINT = renderer.project(x, y, z);
    renderer.ellipse(POINT.x, POINT.y, renderer.scale * radius, renderer.scale * radius * 0.78, rgba(color, alpha));
}

export class FeedEffect {
    draw(renderer, effect, progress) {
        const P = clamp01(progress);
        renderer.ring(effect.x, effect.y, 0.2 + easeOut(P) * 0.6, rgba(FOOD, 0.9 * (1 - P)), 0.06 * (1 - P) + 0.012);
        for (let index = 0; index < 3; index++) {
            const T = clamp01((P - index * 0.08) / 0.7);
            if (T <= 0 || T >= 1) {
                continue;
            }
            const ANGLE = (index * TAU) / 3 + 0.5,
                POINT = renderer.project(
                    effect.x + Math.cos(ANGLE) * 0.18 * T,
                    effect.y + Math.sin(ANGLE) * 0.14 * T,
                    0.15 + easeOut(T) * 0.7,
                );
            drawSparkle(
                renderer,
                POINT,
                renderer.scale * 0.07 * pop(T * 2) * (1 - T * 0.5),
                rgba(GOLD_LIGHT, 1 - T),
                T * 2,
            );
        }
    }
}

export class FoodLandingEffect {
    draw(renderer, effect, progress) {
        const T = clamp01(progress / 0.45);
        if (T >= 1) {
            return;
        }
        renderer.groundEllipse(
            effect.x,
            effect.y,
            0.1 + easeOut(T) * 0.4,
            0.1 + easeOut(T) * 0.4,
            rgba(GOLD, 0.35 * (1 - T)),
        );
        renderer.ring(effect.x, effect.y, 0.1 + easeOut(T) * 0.5, rgba(FOOD, 0.85 * (1 - T)), 0.055 * (1 - T) + 0.01);
        for (let index = 0; index < 5; index++) {
            const ANGLE = (index * TAU) / 5 + 0.3,
                REACH = easeOut(T) * (0.34 + (index % 2) * 0.14),
                POINT = renderer.project(
                    effect.x + Math.cos(ANGLE) * REACH,
                    effect.y + Math.sin(ANGLE) * REACH * 0.8,
                    0.06 + Math.sin(T * Math.PI) * (0.22 + (index % 2) * 0.1),
                );
            renderer.ellipse(
                POINT.x,
                POINT.y,
                renderer.scale * 0.065,
                renderer.scale * 0.05,
                rgba(index % 2 ? GOLD_LIGHT : GOLD, 1 - T * T),
            );
        }
    }
}

export class ImpactEffect {
    draw(renderer, effect, progress) {
        const P = clamp01(progress);
        renderer.groundEllipse(
            effect.x,
            effect.y,
            0.2 + easeOut(P) * 0.7,
            0.2 + easeOut(P) * 0.7,
            rgba(DUST, 0.3 * (1 - P)),
        );
        renderer.ring(
            effect.x,
            effect.y,
            0.1 + easeOut(P) * 0.85,
            rgba(DUST_DARK, 0.85 * (1 - P)),
            0.06 * (1 - P) + 0.01,
        );
        groundTicks(
            renderer,
            effect.x,
            effect.y,
            0.2 + easeOut(P) * 0.6,
            0.32 + easeOut(P) * 0.85,
            6,
            rgba(DUST_DARK, 0.5 * (1 - P)),
            3,
        );
    }
}

export class ShockwaveEffect {
    draw(renderer, effect, progress) {
        const P = clamp01(progress / (effect.duration || 0.55)),
            RADIUS = Math.max(0.08, effect.radius) * (0.2 + 0.8 * easeOut(P)),
            FADE = 1 - P;
        renderer.groundEllipse(effect.x, effect.y, RADIUS, RADIUS, rgba(GOLD, 0.16 * FADE));
        renderer.ring(effect.x, effect.y, RADIUS, rgba(GOLD, 0.9 * FADE), 0.12 * FADE + 0.025);
        renderer.ring(
            effect.x,
            effect.y,
            Math.max(0.05, RADIUS - 0.14),
            rgba(GOLD_LIGHT, 0.6 * FADE),
            0.045 * FADE + 0.01,
        );
        groundTicks(renderer, effect.x, effect.y, RADIUS * 0.72, RADIUS * 0.94, 12, rgba(CREAM, 0.7 * FADE), 3, P);
    }
}

export class DropDustEffect {
    draw(renderer, effect, progress) {
        const P = clamp01(progress / 0.5);
        if (P >= 1) {
            return;
        }
        renderer.ring(
            effect.x,
            effect.y,
            0.12 + easeOut(P) * 0.5,
            rgba(DUST_DARK, 0.45 * (1 - P)),
            0.045 * (1 - P) + 0.01,
        );
        for (let index = 0; index < 6; index++) {
            const ANGLE = (index * TAU) / 6 + 0.4,
                REACH = easeOut(P) * 0.42;
            puff(
                renderer,
                effect.x + Math.cos(ANGLE) * REACH,
                effect.y + Math.sin(ANGLE) * REACH * 0.7,
                0.05 + P * 0.22,
                0.08 + P * 0.09,
                index % 2 ? '#c9bf9c' : DUST,
                0.95 * (1 - P),
            );
        }
    }
}

export class EatingEffect {
    draw(renderer, effect, progress) {
        const P = clamp01(progress),
            Z = effect.z || 0.5;
        renderer.ring(
            effect.x,
            effect.y,
            0.15 + easeOut(P) * 0.5,
            rgba(GOLD_LIGHT, 0.6 * (1 - P)),
            0.035 * (1 - P) + 0.01,
        );
        for (let index = 0; index < 4; index++) {
            const T = clamp01(P / 0.7),
                ANGLE = (index * TAU) / 4 + 0.6,
                POINT = renderer.project(
                    effect.x + Math.cos(ANGLE) * easeOut(T) * 0.38,
                    effect.y + Math.sin(ANGLE) * easeOut(T) * 0.3,
                    Z + easeOut(T) * 0.65 - T * T * 0.2,
                );
            if (T < 1) {
                drawSparkle(
                    renderer,
                    POINT,
                    renderer.scale * 0.12 * pop(T * 2) * (1 - T * 0.6),
                    rgba(index % 2 ? CREAM : GOLD, 1 - T),
                    T * 3,
                );
            }
        }
    }
}
