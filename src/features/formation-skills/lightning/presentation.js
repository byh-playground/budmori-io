import { bolt, burst, FormationPresentation } from '../presentation-base.js';
export class LightningPresentation extends FormationPresentation {
    draw(renderer, effect) {
        const DELAY = effect.telegraphSeconds ?? 0;
        if (effect.age < DELAY) {
            const PROGRESS = effect.age / DELAY;
            renderer.groundEllipse(
                effect.x,
                effect.y,
                effect.radius,
                effect.radius,
                `rgba(120,180,255,${0.12 + PROGRESS * 0.18})`,
            );
            renderer.ring(effect.x, effect.y, effect.radius, '#b4dfff', effect.radius * 0.05);
            return;
        }
        const AGE = effect.age - DELAY;
        if (effect.radius > 0) {
            renderer.groundEllipse(
                effect.x,
                effect.y,
                effect.radius,
                effect.radius,
                `rgba(190,225,255,${Math.max(0, 0.5 - AGE)})`,
            );
        }
        const BODY_HEIGHT = Math.max(0.5, effect.bodyHeight || 0.7),
            BODY_RADIUS = Math.max(0.2, effect.bodyRadius || 0.3),
            // A bolt reaches three body heights up for a small body; a tall one stays within a screen's sky.
            RISE = Math.min(BODY_HEIGHT * 3.4, BODY_HEIGHT * 0.5 + 2.4),
            HIT_Z = effect.radius > 0 ? effect.z : effect.z + BODY_HEIGHT;
        bolt(renderer, effect.x, effect.y, HIT_Z, RISE, AGE, effect.id, BODY_RADIUS);
        if (AGE < 0.5) {
            burst(renderer, effect.x, effect.y, HIT_Z, BODY_RADIUS, AGE, effect.id, '190,225,255');
        }
        if (AGE < 0.12) {
            const SKY = renderer.project(effect.x, effect.y, HIT_Z + RISE),
                TOP = renderer.project(effect.x, effect.y, HIT_Z);
            renderer.ellipse(
                TOP.x,
                TOP.y,
                renderer.scale * BODY_RADIUS * 2.6,
                renderer.scale * BODY_RADIUS * 2,
                `rgba(220,240,255,${0.55 * (1 - AGE / 0.12)})`,
            );
            renderer.ellipse(
                SKY.x,
                SKY.y,
                renderer.scale * BODY_RADIUS * 1.4,
                renderer.scale * BODY_RADIUS * 0.8,
                `rgba(200,225,255,${0.5 * (1 - AGE / 0.12)})`,
            );
        }
    }
}
