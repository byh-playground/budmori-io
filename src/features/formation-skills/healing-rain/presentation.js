import { FormationPresentation, bodyScale, cloud, stroke } from '../presentation-base.js';
export class HealingRainPresentation extends FormationPresentation {
    draw(renderer, effect, world) {
        const FADE = Math.min(1, effect.age * 3, (effect.duration - effect.age) * 3);
        for (const UNIT of world.units) {
            if (UNIT.hp <= 0 || UNIT.faction !== 'player' || UNIT.hp >= UNIT.maxHp) {
                continue;
            }
            const SCALE = bodyScale(UNIT.radius);
            cloud(renderer, UNIT.x, UNIT.y, UNIT.height + 1.6 * SCALE, 1.3 * SCALE, FADE * 0.7);
            for (let i = 0; i < 4; i++) {
                const Z = (((i * 0.6 - effect.age * 2) % 1.8) + 1.8) % 1.8;
                stroke(
                    renderer,
                    [
                        [UNIT.x + (i - 1.5) * 0.18, UNIT.y, Z + 0.45],
                        [UNIT.x + (i - 1.5) * 0.18, UNIT.y, Z],
                    ],
                    `rgba(136,216,188,${FADE * 0.8})`,
                    0.07 * SCALE,
                );
            }
        }
    }
}
