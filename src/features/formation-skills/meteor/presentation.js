import { FormationPresentation, stroke } from '../presentation-base.js';
export class MeteorPresentation extends FormationPresentation {
    constructor() {
        super();
        this.bodySize = 1.3;
        this.tailWidth = 2;
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
            renderer.ring(effect.x, effect.y, R * (1.1 - Q * 0.25), `rgba(255,150,80,${0.35 + Q * 0.5})`, 0.12);
            renderer.groundEllipse(effect.x, effect.y, R * 0.8, R * 0.8, `rgba(255,120,60,${Q * 0.25})`);
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
            renderer.ring(effect.x, effect.y, R * Q, `rgba(255,215,138,${1 - Q})`, 0.3 * (1 - Q) + 0.03);
            renderer.ring(effect.x, effect.y, R * Q * 0.6, `rgba(255,255,255,${1 - Q})`, 0.15 * (1 - Q));
            if (Q < 0.25) {
                const F = renderer.project(effect.x, effect.y, 0.4);
                renderer.ellipse(F.x, F.y, S * R * 0.9, S * R * 0.6, `rgba(255,236,190,${0.7 * (1 - Q / 0.25)})`);
            }
            for (let i = 0; i < 9; i++) {
                const A = i * 2.39996,
                    P = renderer.project(
                        effect.x + Math.cos(A) * R * Q,
                        effect.y + Math.sin(A) * R * Q,
                        Math.sin(Q * Math.PI) * 1.8,
                    );
                renderer.ellipse(P.x, P.y, S * 0.14 * (1 - Q), S * 0.1 * (1 - Q), `rgba(150,112,77,${1 - Q})`);
            }
        }
    }
}
