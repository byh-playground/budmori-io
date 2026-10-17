import { DEFINITION } from './definition.js';
import { FlyingSkill } from '../model-base.js';
export class UfoSkill extends FlyingSkill {
    constructor() {
        super(DEFINITION);
    }
    onPulse(owner, effect) {
        const TARGET = owner.verticalTarget(effect.x, effect.y);
        if (TARGET) {
            owner.damage(TARGET, this.definition.pulseDamage);
        }
        effect.beamTargetZ = TARGET?.z ?? 0;
    }
}
