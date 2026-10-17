import { UnitAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';

export class DualStrikePresentation extends UnitAttackPresentation {
    constructor() {
        super();
        this.id = FEATURE.id;
    }
    activeMotion(unit) {
        return unit.ability.peanutStrikeCount > 2 ? `fire-${unit.ability.peanutStrikeCount}` : 'fire';
    }
}
