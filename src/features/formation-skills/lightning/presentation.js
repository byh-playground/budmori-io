import { bolt, burst, FormationPresentation } from '../presentation-base.js';
export class LightningPresentation extends FormationPresentation {
    draw(renderer, effect) {
        const BODY_HEIGHT = Math.max(0.5, effect.bodyHeight || 0.7),
            BODY_RADIUS = Math.max(0.2, effect.bodyRadius || 0.3),
            // A bolt reaches three body heights up for a small body; a tall one stays within a screen's sky.
            RISE = Math.min(BODY_HEIGHT * 3.4, BODY_HEIGHT + 2.4);
        bolt(renderer, effect.x, effect.y, effect.z + BODY_HEIGHT, RISE, effect.age, effect.id, BODY_RADIUS);
        if (effect.age < 0.5) {
            burst(
                renderer,
                effect.x,
                effect.y,
                effect.z + BODY_HEIGHT,
                BODY_RADIUS,
                effect.age,
                effect.id,
                '190,225,255',
            );
        }
        if (effect.age < 0.12) {
            const SKY = renderer.project(effect.x, effect.y, effect.z + BODY_HEIGHT + RISE),
                TOP = renderer.project(effect.x, effect.y, effect.z + BODY_HEIGHT);
            renderer.ellipse(
                TOP.x,
                TOP.y,
                renderer.scale * BODY_RADIUS * 2.6,
                renderer.scale * BODY_RADIUS * 2,
                `rgba(220,240,255,${0.55 * (1 - effect.age / 0.12)})`,
            );
            renderer.ellipse(
                SKY.x,
                SKY.y,
                renderer.scale * BODY_RADIUS * 1.4,
                renderer.scale * BODY_RADIUS * 0.8,
                `rgba(200,225,255,${0.5 * (1 - effect.age / 0.12)})`,
            );
        }
    }
}
