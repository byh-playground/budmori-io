import {
    burst,
    FormationPresentation,
    groundShadow,
    stroke,
    glint,
    radialStreaks,
    segmentedRing,
} from '../presentation-base.js';
import { HAMMER_IMPACT_TIME } from './model.js';
export class HammerPresentation extends FormationPresentation {
    draw(renderer, effect) {
        // The hammer is as big as its size reference (the struck body, or the boss that swings it) and lands on the
        // top of the struck body.
        const BODY_RADIUS = effect.bodyRadius || 0.3,
            R = Math.max(0.2, (effect.sizeRadius || BODY_RADIUS) * 0.55),
            H = Math.max(BODY_RADIUS * 2, effect.bodyHeight || BODY_RADIUS * 2),
            AGE = effect.age,
            RISE_END = 0.2,
            TOP = effect.z + H,
            HIGH = TOP + R * 3.4,
            AIM_Z = TOP + R * 0.15,
            S = renderer.scale,
            C = renderer.ctx;
        let headZ;
        if (AGE < RISE_END) {
            headZ = HIGH + R * 0.5 * (1 - AGE / RISE_END);
        } else if (AGE < HAMMER_IMPACT_TIME) {
            const T = (AGE - RISE_END) / (HAMMER_IMPACT_TIME - RISE_END);
            headZ = HIGH + (AIM_Z - HIGH) * T ** 2.4;
        } else {
            headZ = AIM_Z + Math.min(0.5, (AGE - HAMMER_IMPACT_TIME) * 3) * 0;
        }
        const FADE = AGE < HAMMER_IMPACT_TIME + 0.25 ? 1 : Math.max(0, 1 - (AGE - HAMMER_IMPACT_TIME - 0.25) / 0.35);
        if (FADE <= 0) {
            return;
        }
        const WARN = Math.min(1, AGE / HAMMER_IMPACT_TIME);
        groundShadow(renderer, effect.x, effect.y, R * (1.6 + WARN * 0.6), 0.18 + WARN * 0.3, FADE);
        segmentedRing(
            renderer,
            effect.x,
            effect.y,
            0.01,
            R * (2.6 - WARN * 1.2),
            FADE * 0.8,
            WARN * 0.3,
            '255,214,120',
        );
        // motion streaks while falling
        if (AGE >= RISE_END && AGE < HAMMER_IMPACT_TIME) {
            for (let i = -1; i <= 1; i++) {
                stroke(
                    renderer,
                    [
                        [effect.x + i * R * 1.5, effect.y, headZ + R * 4],
                        [effect.x + i * R * 1.5, effect.y, headZ + R * 1.2],
                    ],
                    `rgba(255,255,255,0.35)`,
                    R * 0.16,
                );
            }
        }
        // handle
        stroke(
            renderer,
            [
                [effect.x, effect.y, headZ + R * 0.6],
                [effect.x, effect.y, headZ + R * 5],
            ],
            `rgba(76,48,30,${FADE})`,
            R * 1.05,
        );
        stroke(
            renderer,
            [
                [effect.x, effect.y, headZ + R * 0.6],
                [effect.x, effect.y, headZ + R * 5],
            ],
            `rgba(160,106,64,${FADE})`,
            R * 0.7,
        );
        // head
        const P = renderer.project(effect.x, effect.y, headZ + R * 0.9),
            W = S * R * 3.4,
            HH = S * R * 1.9;
        C.beginPath();
        C.roundRect(P.x - W / 2, P.y - HH / 2, W, HH, S * R * 0.35);
        C.fillStyle = `rgba(58,70,86,${FADE})`;
        C.fill();
        C.beginPath();
        C.roundRect(P.x - W / 2 + S * R * 0.18, P.y - HH / 2 + S * R * 0.14, W - S * R * 0.36, HH * 0.42, S * R * 0.25);
        C.fillStyle = `rgba(178,196,214,${FADE})`;
        C.fill();
        C.beginPath();
        C.roundRect(P.x - W / 2, P.y - HH / 2, W, HH, S * R * 0.35);
        C.strokeStyle = `rgba(28,34,44,${FADE})`;
        C.lineWidth = Math.max(1, S * R * 0.14);
        C.stroke();
        if (AGE >= HAMMER_IMPACT_TIME) {
            const T = AGE - HAMMER_IMPACT_TIME;
            burst(renderer, effect.x, effect.y, AIM_Z, R, T, effect.id, '255,224,130');
            renderer.ring(
                effect.x,
                effect.y,
                R * (1 + T * 7),
                `rgba(255,224,130,${Math.max(0, 1 - T / 0.5)})`,
                R * 0.13,
                0,
                Math.PI * 2,
                AIM_Z,
            );
            renderer.ring(
                effect.x,
                effect.y,
                R * (0.6 + T * 4.5),
                `rgba(255,255,255,${Math.max(0, 1 - T / 0.35)})`,
                R * 0.07,
                0,
                Math.PI * 2,
                AIM_Z,
            );
            if (T < 0.1) {
                const F = renderer.project(effect.x, effect.y, AIM_Z);
                renderer.ellipse(F.x, F.y, S * R * 0.8, S * R * 0.4, `rgba(255,248,210,${0.6 * (1 - T / 0.1)})`);
            }
            radialStreaks(renderer, effect.x, effect.y, AIM_Z, R * 2.4, T / 0.5, effect.id, '255,216,137');
            glint(renderer, effect.x, effect.y, AIM_Z, R * 0.38, Math.max(0, 1 - T / 0.13), '255,245,192');
            // stun stars orbiting the head
            if (T < 1) {
                for (let i = 0; i < 3; i++) {
                    const A = T * 6 + (i * Math.PI * 2) / 3;
                    glint(
                        renderer,
                        effect.x + Math.cos(A) * R * 1.3,
                        effect.y + Math.sin(A) * R * 0.5,
                        AIM_Z + R * 0.9,
                        R * 0.13,
                        FADE,
                        '255,236,120',
                    );
                }
            }
        }
    }
}
