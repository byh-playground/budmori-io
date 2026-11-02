import { FormationPresentation, bodyScale, stroke, glint, segmentedRing } from '../presentation-base.js';
export class CopyPresentation extends FormationPresentation {
    draw(renderer, effect) {
        const Q = Math.min(1, effect.age / effect.duration),
            FADE = Math.min(1, Q * 8) * (1 - Q),
            RADIUS = effect.radius,
            WAVE = RADIUS * (0.25 + (1 - (1 - Q) ** 3) * 0.75);
        renderer.groundEllipse(effect.x, effect.y, WAVE, WAVE, `rgba(77,151,212,${FADE * 0.12})`);
        segmentedRing(renderer, effect.x, effect.y, 0.02, WAVE, FADE, Q * 0.65, '127,210,249');
        renderer.ring(effect.x, effect.y, WAVE * 0.9, `rgba(185,242,255,${FADE * 0.5})`, RADIUS * 0.012);
        for (let i = 0; i < 8; i++) {
            const A = (i * Math.PI) / 4 + effect.id * 0.2,
                D = RADIUS * (0.82 + Q * 0.18);
            glint(
                renderer,
                effect.x + Math.cos(A) * D,
                effect.y + Math.sin(A) * D,
                RADIUS * Q * 0.3,
                RADIUS * 0.045,
                FADE * 0.8,
                '173,229,255',
            );
        }
    }
}
// The copy's blue dissolve; the shared death puff (render/death-presentation.js) is the same streaks in grey,
// spread with the body's radius.
export class CopyDissolvePresentation {
    constructor({ streak = '115,190,244', glint: glintColor = '189,240,255', spreadPerRadius = 0 } = {}) {
        this.streak = streak;
        this.glint = glintColor;
        this.spreadPerRadius = spreadPerRadius;
    }
    draw(renderer, effect, age) {
        const Q = Math.min(1, age / 0.6),
            FADE = (1 - Q) ** 1.3,
            SPREAD = Q * Math.max(1, (effect.radius || 0) * this.spreadPerRadius);
        for (let i = 0; i < 9; i++) {
            const A = i * 2.39996,
                X = effect.x + Math.cos(A) * SPREAD,
                Y = effect.y + Math.sin(A) * SPREAD,
                Z = effect.z + SPREAD * 1.3;
            stroke(
                renderer,
                [
                    [X, Y, Z],
                    [X + 0.04, Y, Z + 0.14],
                ],
                `rgba(${this.streak},${FADE})`,
                0.055 * (1 - Q),
            );
            if (i % 3 === 0) {
                glint(renderer, X, Y, Z, 0.05 * bodyScale(effect.radius), FADE, this.glint);
            }
        }
    }
}
