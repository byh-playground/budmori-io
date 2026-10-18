import { bolt, FormationPresentation } from '../presentation-base.js';
export class LightningPresentation extends FormationPresentation {
    draw(renderer, effect) {
        const BODY_HEIGHT = Math.max(0.5, effect.bodyHeight || 0.7),
            BODY_RADIUS = Math.max(0.2, effect.bodyRadius || 0.3);
        bolt(
            renderer,
            effect.x,
            effect.y,
            effect.z + BODY_HEIGHT,
            BODY_HEIGHT * 2.4,
            effect.age,
            effect.id,
            BODY_RADIUS,
        );
    }
}
