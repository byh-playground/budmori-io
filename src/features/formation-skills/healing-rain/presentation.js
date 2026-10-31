import { FormationPresentation, bodyScale, cloud, stroke, REFERENCE_RADIUS } from '../presentation-base.js';
export class HealingRainPresentation extends FormationPresentation {
    draw(renderer, effect, world) {
        const FADE = Math.min(1, effect.age * 3, (effect.duration - effect.age) * 3);
        for (const UNIT of world.formationInjuredAllies.get(effect.role || 'player') || []) {
            const SCALE = bodyScale(UNIT.radius);
            // The cloud sits above the body; streaks fall from it to the ground, spaced and sized by the body.
            const BODY = UNIT.radius / REFERENCE_RADIUS,
                FALL = Math.max(1.8, UNIT.height + 0.8 * SCALE);
            cloud(renderer, UNIT.x, UNIT.y, UNIT.height + 1.6 * SCALE, 1.3 * SCALE, FADE * 0.7);
            for (let i = 0; i < 4; i++) {
                const Z = (((i * 0.6 * (FALL / 1.8) - effect.age * 2 * (FALL / 1.8)) % FALL) + FALL) % FALL;
                stroke(
                    renderer,
                    [
                        [UNIT.x + (i - 1.5) * 0.18 * Math.max(1, BODY), UNIT.y, Z + 0.45 * Math.max(1, BODY)],
                        [UNIT.x + (i - 1.5) * 0.18 * Math.max(1, BODY), UNIT.y, Z],
                    ],
                    `rgba(136,216,188,${FADE * 0.8})`,
                    0.07 * SCALE,
                );
            }
        }
    }
}
