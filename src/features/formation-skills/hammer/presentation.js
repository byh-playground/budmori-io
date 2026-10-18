import { FormationPresentation, stroke } from '../presentation-base.js';
export class HammerPresentation extends FormationPresentation {
    draw(renderer, effect) {
        const BODY_RADIUS = Math.max(0.2, effect.bodyRadius || 0.3),
            BODY_HEIGHT = Math.max(BODY_RADIUS * 2, effect.bodyHeight || BODY_RADIUS * 2),
            TELEGRAPH_END = 0.14,
            IMPACT_TIME = 0.42,
            DROP = Math.max(0, Math.min(1, (effect.age - TELEGRAPH_END) / (IMPACT_TIME - TELEGRAPH_END))),
            FALL = DROP ** 2.2,
            START_Z = effect.z + BODY_HEIGHT + BODY_RADIUS * 3.2,
            IMPACT_Z = effect.z + BODY_HEIGHT * 0.55,
            Z = START_Z + (IMPACT_Z - START_Z) * FALL,
            HEAD_WIDTH = BODY_RADIUS * 6,
            HEAD_HEIGHT = BODY_RADIUS * 1.8,
            P = renderer.project(effect.x, effect.y, Z),
            S = renderer.scale,
            C = renderer.ctx,
            FADE = Math.max(0, 1 - Math.max(0, effect.age - IMPACT_TIME) / 0.28);
        if (effect.age < TELEGRAPH_END) {
            const TELEGRAPH = 1 - effect.age / TELEGRAPH_END,
                AIM = renderer.project(effect.x, effect.y, IMPACT_Z);
            renderer.ellipse(
                AIM.x,
                AIM.y,
                S * BODY_RADIUS * (1.8 + (1 - TELEGRAPH) * 0.8),
                S * BODY_RADIUS * 0.52,
                `rgba(233,218,146,${0.32 + TELEGRAPH * 0.42})`,
            );
        }
        stroke(
            renderer,
            [
                [effect.x, effect.y, Z + HEAD_HEIGHT * 0.9],
                [effect.x, effect.y, Z],
            ],
            `rgba(130,90,65,${FADE})`,
            BODY_RADIUS * 0.7,
        );
        C.fillStyle = `rgba(132,153,172,${FADE})`;
        C.beginPath();
        C.roundRect(
            P.x - (S * HEAD_WIDTH) / 2,
            P.y - (S * HEAD_HEIGHT) / 2,
            S * HEAD_WIDTH,
            S * HEAD_HEIGHT,
            S * BODY_RADIUS * 0.3,
        );
        C.fill();
        C.fillStyle = `rgba(216,229,234,${FADE})`;
        C.beginPath();
        C.roundRect(
            P.x - (S * HEAD_WIDTH) / 2.1,
            P.y - (S * HEAD_HEIGHT) / 2,
            (S * HEAD_WIDTH) / 1.05,
            S * HEAD_HEIGHT * 0.16,
            S * BODY_RADIUS * 0.1,
        );
        C.fill();
        if (effect.age > IMPACT_TIME) {
            renderer.ring(
                effect.x,
                effect.y,
                BODY_RADIUS * (1.1 + (effect.age - IMPACT_TIME) * 5),
                `rgba(233,218,146,${FADE})`,
                BODY_RADIUS * 0.3,
            );
        }
    }
}
