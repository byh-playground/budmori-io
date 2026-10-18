import { DEFINITION } from './definition.js';
import { FlyingSkill, targetBodyDimensions } from '../model-base.js';
export class UfoSkill extends FlyingSkill {
    constructor() {
        super(DEFINITION);
    }
    onPulse(owner, effect) {
        const TARGET = owner.verticalTarget(effect.x, effect.y);
        if (TARGET) {
            owner.damage(TARGET, this.definition.pulseDamage);
        }
        effect.beamTargetZ = TARGET ? targetBodyDimensions(TARGET).topZ : 0;
    }
    update(owner, effect, dt) {
        const ALIVE = super.update(owner, effect, dt),
            TARGET = owner.verticalTarget(effect.x, effect.y);
        effect.beamTarget = !!TARGET;
        effect.beamTargetZ = TARGET ? targetBodyDimensions(TARGET).topZ : 0;
        return ALIVE;
    }
}
