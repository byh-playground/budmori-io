import { FormationPresentation, bodyScale, glint, segmentedRing } from '../presentation-base.js';
export class HealingRainPresentation extends FormationPresentation {
    constructor() {
        super();
        this.recipientActors = new Map();
    }
    draw(renderer, effect, world) {
        const Q = Math.min(1, effect.age / effect.duration),
            FADE = Math.max(0, Math.min(1, Q * 8, (1 - Q) * 4));
        this.recipientActors.clear();
        for (const UNIT of world.units) {
            this.recipientActors.set(UNIT.id, UNIT);
        }
        for (const BOSS of world.bosses) {
            this.recipientActors.set(BOSS.id, BOSS);
        }
        for (const RECIPIENT of effect.recipients || []) {
            const UNIT = this.recipientActors.get(RECIPIENT.id);
            if (!UNIT || UNIT.hp <= 0 || UNIT.generation !== RECIPIENT.generation) {
                continue;
            }
            const RADIUS = Math.max(0.15, UNIT.radius),
                SCALE = bodyScale(RADIUS),
                HEIGHT = Math.max(0.4, UNIT.height),
                Z = (UNIT.z || 0) + HEIGHT * (0.12 + Q * 0.85);
            // A brief rising hoop and two crossing lights read as rapid recovery, not a weather cloud.
            renderer.groundEllipse(UNIT.x, UNIT.y, RADIUS * 1.2, RADIUS * 1.2, `rgba(110,226,146,${FADE * 0.12})`);
            renderer.ring(
                UNIT.x,
                UNIT.y,
                RADIUS * (1.1 - Q * 0.25),
                `rgba(129,238,170,${FADE * 0.7})`,
                0.045 * SCALE,
                0,
                Math.PI * 2,
                Z,
            );
            segmentedRing(renderer, UNIT.x, UNIT.y, UNIT.z || 0, RADIUS * 1.15, FADE * 0.65, -Q * 0.8, '155,240,164');
            for (let i = 0; i < 2; i++) {
                const A = i * Math.PI + effect.id * 0.4,
                    D = RADIUS * (0.7 - Q * 0.2);
                glint(
                    renderer,
                    UNIT.x + Math.cos(A) * D,
                    UNIT.y + Math.sin(A) * D,
                    Z + i * HEIGHT * 0.2,
                    0.075 * SCALE,
                    FADE * 0.85,
                    '202,255,186',
                );
            }
        }
    }
}
