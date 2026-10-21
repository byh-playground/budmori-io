import { FormationPresentation, stroke } from '../presentation-base.js';
export class CopyPresentation extends FormationPresentation {
    draw(renderer, effect) {
        const Q = Math.min(1, effect.age / effect.duration);
        renderer.ring(effect.x, effect.y, effect.radius, '#84c6e8dd', 0.12);
        renderer.groundEllipse(effect.x, effect.y, effect.radius, effect.radius, `rgba(120,196,235,${(1 - Q) * 0.3})`);
    }
}
export class CopyDissolvePresentation {
    draw(renderer, effect, age) {
        const Q = Math.min(1, age / 0.6);
        for (let i = 0; i < 9; i++) {
            const A = i * 2.39996,
                X = effect.x + Math.cos(A) * Q,
                Y = effect.y + Math.sin(A) * Q,
                Z = effect.z + Q * 1.3;
            stroke(
                renderer,
                [
                    [X, Y, Z],
                    [X + 0.07, Y, Z + 0.13],
                ],
                `rgba(161,218,255,${1 - Q})`,
                0.06 * (1 - Q),
            );
        }
    }
}
