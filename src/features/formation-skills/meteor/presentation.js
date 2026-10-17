import { FormationPresentation, stroke } from '../presentation-base.js';
export class MeteorPresentation extends FormationPresentation {
    constructor() {
        super();
        this.bodySize = 0.8;
        this.tailWidth = 1.2;
    }
    draw(renderer, effect) {
        const AGE = effect.age - effect.delay;
        if (AGE < 0) {
            return;
        }
        const S = renderer.scale,
            R = effect.radius;
        if (AGE < 0.75) {
            const Q = AGE / 0.75,
                Z = 12 * (1 - Q * Q),
                P = renderer.project(effect.x, effect.y, Z),
                T = renderer.project(effect.x - 0.9, effect.y, Z + 2.8);
            renderer.ring(effect.x, effect.y, R, '#dc905b88', 0.04);
            stroke(
                renderer,
                [
                    [effect.x - 0.9, effect.y, Z + 2.8],
                    [effect.x, effect.y, Z],
                ],
                '#ffb458aa',
                this.tailWidth,
            );
            renderer.ellipse(P.x, P.y, S * this.bodySize, S * this.bodySize * 1.2, '#824c3d', -0.25);
            renderer.ellipse(P.x - S * 0.09, P.y - S * 0.08, S * 0.21, S * 0.24, '#efbc76', -0.25);
            renderer.ellipse(T.x, T.y, S * 0.13, S * 0.2, '#ffe4a455');
        } else {
            const Q = Math.min(1, (AGE - 0.75) / 0.5);
            renderer.groundEllipse(
                effect.x,
                effect.y,
                R * (0.45 + Q * 0.55),
                R * (0.45 + Q * 0.55),
                `rgba(239,157,72,${(1 - Q) * 0.26})`,
            );
            renderer.ring(effect.x, effect.y, R * Q, `rgba(255,215,138,${1 - Q})`, 0.15 * (1 - Q) + 0.02);
            for (let i = 0; i < 9; i++) {
                const A = i * 2.39996,
                    P = renderer.project(
                        effect.x + Math.cos(A) * R * Q,
                        effect.y + Math.sin(A) * R * Q,
                        Math.sin(Q * Math.PI) * 0.8,
                    );
                renderer.ellipse(P.x, P.y, S * 0.07 * (1 - Q), S * 0.05 * (1 - Q), `rgba(150,112,77,${1 - Q})`);
            }
        }
    }
}
