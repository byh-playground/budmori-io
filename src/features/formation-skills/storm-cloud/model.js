import { DEFINITION } from './definition.js';
import { FlyingSkill } from '../model-base.js';
export class StormCloudSkill extends FlyingSkill {
    constructor() {
        super(DEFINITION);
        this.interval = 1;
    }
    strike(owner, _effect, target) {
        owner.damage(target, 15);
    }
}
