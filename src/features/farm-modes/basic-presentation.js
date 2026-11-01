import { TAU, clamp01, drawLitSparkle, drawContactLight, drawLitMote, easeOut, pop, rgba } from './vfx-kit.js';

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
    renderer.ellipse(
        POINT.x,
        POINT.y,
        renderer.scale * radius,
        renderer.scale * radius * 0.58,
        rgba(color, alpha * 0.7),
    );
    renderer.ellipse(
        POINT.x - renderer.scale * radius * 0.12,
        POINT.y - renderer.scale * radius * 0.14,
        renderer.scale * radius * 0.65,
        renderer.scale * radius * 0.28,
        rgba('#d6ccb0', alpha * 0.48),
    );
}

export class FeedEffect {
    draw(renderer, effect, progress) {
        const P = clamp01(progress);
        if (P >= 1) {
            return;
        }
        drawContactLight(renderer, effect.x, effect.y, 0.12, 0.24, P, GOLD);
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
            drawLitSparkle(
                renderer,
                POINT,
                renderer.scale * 0.07 * pop(T * 2) * (1 - T * 0.5),
                GOLD_LIGHT,
                1 - T,
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
        drawContactLight(renderer, effect.x, effect.y, 0.05, 0.2, T, GOLD);
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
            drawLitMote(renderer, POINT, renderer.scale * 0.065, index % 2 ? GOLD_LIGHT : GOLD, 1 - T * T);
        }
    }
}

export class ImpactEffect {
    draw(renderer, effect, progress) {
        const P = clamp01(progress);
        if (P >= 1) {
            return;
        }
        drawContactLight(renderer, effect.x, effect.y, 0.06, 0.32, P, GOLD_LIGHT);
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
            rgba(DUST_DARK, 0.55 * (1 - P)),
            3,
        );
        groundTicks(
            renderer,
            effect.x,
            effect.y,
            0.25 + easeOut(P) * 0.66,
            0.32 + easeOut(P) * 0.85,
            6,
            rgba(GOLD_LIGHT, 0.68 * (1 - P) ** 2),
            1.2,
        );
    }
}

export class ShockwaveEffect {
    draw(renderer, effect, progress) {
        const P = clamp01(progress / (effect.duration || 0.55)),
            RADIUS = Math.max(0.08, effect.radius) * (0.2 + 0.8 * easeOut(P)),
            FADE = 1 - P;
        if (P >= 1) {
            return;
        }
        drawContactLight(renderer, effect.x, effect.y, 0.08, Math.min(0.48, effect.radius * 0.28), P, GOLD_LIGHT);
        renderer.groundEllipse(effect.x, effect.y, RADIUS, RADIUS, rgba(GOLD, 0.12 * FADE));
        renderer.ring(effect.x, effect.y, RADIUS, rgba(FOOD, 0.76 * FADE), 0.15 * FADE + 0.025);
        renderer.ring(effect.x, effect.y, RADIUS * 1.01, rgba(GOLD_LIGHT, 0.9 * FADE ** 1.6), 0.055 * FADE + 0.012);
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
                drawLitSparkle(
                    renderer,
                    POINT,
                    renderer.scale * 0.12 * pop(T * 2) * (1 - T * 0.6),
                    index % 2 ? CREAM : GOLD,
                    1 - T,
                    T * 3,
                );
            }
        }
    }
}

// Straw chaff and kernels bursting out of the grain stack when a worker thrashes it.
export class ThreshEffect {
    draw(renderer, effect, progress) {
        const BIG = effect.big === true,
            DURATION = BIG ? 0.9 : 0.55,
            P = clamp01(progress / DURATION);
        if (P >= 1) {
            return;
        }
        const C = renderer.ctx,
            COUNT = BIG ? 14 : 7;
        if (BIG) {
            renderer.ring(
                effect.x,
                effect.y,
                0.4 + easeOut(P) * 1.3,
                rgba(GOLD, 0.8 * (1 - P)),
                0.08 * (1 - P) + 0.012,
            );
        }
        C.lineCap = 'round';
        for (let index = 0; index < COUNT; index++) {
            const ANGLE = (index * TAU) / COUNT + (index % 2) * 0.35,
                REACH = (BIG ? 2.1 : 1.3) * (0.55 + (index % 3) * 0.22) * easeOut(P),
                LIFT = Math.sin(P * Math.PI) * (BIG ? 1.8 : 1.2) * (0.6 + (index % 4) * 0.15),
                FROM = renderer.project(
                    effect.x + Math.cos(ANGLE) * REACH,
                    effect.y + Math.sin(ANGLE) * REACH * 0.7,
                    0.5 + LIFT,
                ),
                SPIN = ANGLE + P * 7;
            C.strokeStyle = rgba(index % 2 ? '#e9cf84' : '#a97c33', 1 - P * P);
            C.lineWidth = Math.max(1, renderer.scale * 0.06);
            C.beginPath();
            C.moveTo(FROM.x - Math.cos(SPIN) * renderer.scale * 0.1, FROM.y - Math.sin(SPIN) * renderer.scale * 0.05);
            C.lineTo(FROM.x + Math.cos(SPIN) * renderer.scale * 0.1, FROM.y + Math.sin(SPIN) * renderer.scale * 0.05);
            C.stroke();
            C.strokeStyle = rgba(CREAM, (1 - P) ** 2 * 0.85);
            C.lineWidth = Math.max(0.7, renderer.scale * 0.023);
            C.beginPath();
            C.moveTo(FROM.x, FROM.y);
            C.lineTo(FROM.x + Math.cos(SPIN) * renderer.scale * 0.1, FROM.y + Math.sin(SPIN) * renderer.scale * 0.05);
            C.stroke();
        }
        for (let index = 0; index < (BIG ? 6 : 3); index++) {
            const ANGLE = index * 2.1 + 0.7,
                REACH = (0.4 + easeOut(P) * 0.9) * (BIG ? 1.2 : 0.8),
                POINT = renderer.project(
                    effect.x + Math.cos(ANGLE) * REACH,
                    effect.y + Math.sin(ANGLE) * REACH * 0.7,
                    0.45 + Math.sin(P * Math.PI) * 1.0,
                );
            drawLitMote(renderer, POINT, renderer.scale * 0.06, FOOD, 1 - P);
        }
        puff(renderer, effect.x, effect.y + 0.05, 0.3 + P * 0.4, 0.3 + P * 0.35, DUST, 0.5 * (1 - P));
    }
}
