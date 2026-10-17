import { DEFINITION } from './definition.js';
import { FlyingSkill } from '../model-base.js';

export class StormCloudSkill extends FlyingSkill {
    constructor() {
        super(DEFINITION);
    }
    strike(owner, _effect, target) {
        owner.damage(target, this.definition.pulseDamage);
    }
}
