import { UnitAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';

export class LobPresentation extends UnitAttackPresentation {
    constructor() {
        super();
        this.id = FEATURE.id;
    }
    recoverMotion(unit) {
        return unit.ability?.action?.path && unit.ability.elapsed < 0.12 ? 'fire' : 'recover';
    }
}
