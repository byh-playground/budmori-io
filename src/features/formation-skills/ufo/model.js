import { DEFINITION } from './definition.js';
import { FlyingSkill } from '../model-base.js';
export class UfoSkill extends FlyingSkill {
    constructor() {
        super(DEFINITION);
        this.interval = 0.5;
    }
    strike(owner, effect, _target) {
        const TARGET = owner.verticalTarget(effect.x, effect.y);
        if (TARGET) {
            owner.damage(TARGET, 10);
        }
    }
}
