import { FormationPresentation, stroke } from '../presentation-base.js';
export class HammerPresentation extends FormationPresentation {
    draw(renderer, effect) {
        const Q = Math.min(1, effect.age / 0.18),
            Z = effect.z + 1 + (1 - Q) * 5,
            P = renderer.project(effect.x, effect.y, Z),
            S = renderer.scale,
            C = renderer.ctx,
            FADE = Math.max(0, 1 - (effect.age - 0.2) / 0.5);
        stroke(
            renderer,
            [
                [effect.x - 0.3, effect.y, Z - 1.7],
                [effect.x, effect.y, Z],
            ],
            `rgba(130,90,65,${FADE})`,
            0.2,
        );
        C.fillStyle = `rgba(132,153,172,${FADE})`;
        C.beginPath();
        C.roundRect(P.x - S * 0.9, P.y - S * 0.4, S * 1.8, S * 0.8, S * 0.12);
        C.fill();
        C.fillStyle = `rgba(216,229,234,${FADE})`;
        C.beginPath();
        C.roundRect(P.x - S * 0.85, P.y - S * 0.35, S * 1.7, S * 0.13, S * 0.04);
        C.fill();
        if (effect.age > 0.18) {
            renderer.ring(effect.x, effect.y, (effect.age - 0.18) * 4, `rgba(233,218,146,${FADE})`, 0.1);
        }
    }
}
