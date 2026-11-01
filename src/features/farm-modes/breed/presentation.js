import { TAU, clamp01, drawLitSparkle, drawContactLight, easeOut, pop, rgba } from '../vfx-kit.js';

const HEART = '#e5809f',
    HEART_LIGHT = '#fbd3df',
    HEART_COUNT = 5,
    BURST_COUNT = 6;

function drawHeart(renderer, point, radius, color) {
    const C = renderer.ctx;
    renderer.ellipse(point.x - radius * 0.44, point.y - radius * 0.25, radius * 0.6, radius * 0.6, color);
    renderer.ellipse(point.x + radius * 0.44, point.y - radius * 0.25, radius * 0.6, radius * 0.6, color);
    C.fillStyle = color;
    C.beginPath();
    C.moveTo(point.x - radius, point.y);
    C.lineTo(point.x, point.y + radius);
    C.lineTo(point.x + radius, point.y);
    C.closePath();
    C.fill();
}

// A calm welcome: two soft rings, hearts that pop in and float up, and a few sparks.
export class BirthEffect {
    draw(renderer, effect, progress) {
        const P = clamp01(progress),
            X = effect.x,
            Y = effect.y,
            Z = effect.z || 0.7;
        if (P >= 1) {
            return;
        }
        drawContactLight(renderer, X, Y, Z * 0.45, 0.32, P, HEART_LIGHT);
        renderer.ring(X, Y, 0.25 + easeOut(P) * 1.3, rgba(HEART, 0.75 * (1 - P)), 0.05 * (1 - P) + 0.012);
        if (P > 0.16) {
            const Q = clamp01((P - 0.16) / 0.84);
            renderer.ring(X, Y, 0.15 + easeOut(Q) * 0.9, rgba(HEART_LIGHT, 0.8 * (1 - Q)), 0.035 * (1 - Q) + 0.01);
        }
        if (P < 0.4) {
            const T = P / 0.4;
            for (let index = 0; index < BURST_COUNT; index++) {
                const ANGLE = (index * TAU) / BURST_COUNT + 0.4,
                    POINT = renderer.project(
                        X + Math.cos(ANGLE) * easeOut(T) * 0.85,
                        Y + Math.sin(ANGLE) * easeOut(T) * 0.7,
                        Z * 0.5 + easeOut(T) * 0.35,
                    );
                drawLitSparkle(
                    renderer,
                    POINT,
                    renderer.scale * 0.085 * (1 - T),
                    index % 2 ? HEART_LIGHT : HEART,
                    1 - T,
                    T * 2,
                );
            }
        }
        for (let index = 0; index < HEART_COUNT; index++) {
            const T = clamp01((P - index * 0.05) / 0.82);
            if (T <= 0 || T >= 1) {
                continue;
            }
            const ANGLE = (index * TAU) / HEART_COUNT + 0.4,
                SWAY = Math.sin(T * TAU * 1.2 + index * 1.3) * 0.09,
                POINT = renderer.project(
                    X + Math.cos(ANGLE) * 0.42 * easeOut(T) + SWAY,
                    Y + Math.sin(ANGLE) * 0.3 * easeOut(T),
                    Z + easeOut(T) * 1.25,
                ),
                SIZE = renderer.scale * 0.15 * pop(T * 1.8),
                ALPHA = T < 0.6 ? 1 : 1 - (T - 0.6) / 0.4;
            drawHeart(renderer, POINT, SIZE, rgba(HEART, ALPHA));
            renderer.ellipse(
                POINT.x - SIZE * 0.5,
                POINT.y - SIZE * 0.42,
                SIZE * 0.16,
                SIZE * 0.12,
                rgba(HEART_LIGHT, ALPHA * 0.9),
            );
        }
    }
}
