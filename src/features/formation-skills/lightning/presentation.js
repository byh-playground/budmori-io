import { bolt, FormationPresentation } from '../presentation-base.js';
export class LightningPresentation extends FormationPresentation {
    draw(renderer, effect) {
        bolt(renderer, effect.x, effect.y, effect.z, 11, effect.age, effect.id);
    }
}
