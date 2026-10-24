import { DEFINITION } from './definition.js';
import { FlyingSkill, targetBodyDimensions } from '../model-base.js';
export class UfoSkill extends FlyingSkill {
    constructor() {
        super(DEFINITION);
    }
    beamTargets(owner, effect) {
        const PROFILE = this.profile(owner);
        if (PROFILE.beamWidth > 0) {
            effect.beamWidth = PROFILE.beamWidth;
            return owner.verticalTargets(effect.x, effect.y, PROFILE.beamWidth, PROFILE.targetCount);
        }
        const TARGET = owner.verticalTarget(effect.x, effect.y);
        return TARGET ? [TARGET] : [];
    }
    onPulse(owner, effect) {
        const TARGETS = this.beamTargets(owner, effect);
        for (const TARGET of TARGETS) {
            owner.damage(TARGET, this.profile(owner).pulseDamage);
        }
        effect.beamTargetZ = TARGETS.length
            ? Math.min(...TARGETS.map((target) => targetBodyDimensions(target).topZ))
            : 0;
    }
    update(owner, effect, dt) {
        const ALIVE = super.update(owner, effect, dt),
            TARGETS = this.beamTargets(owner, effect);
        effect.beamTarget = TARGETS.length > 0;
        effect.beamTargetZ = TARGETS.length
            ? Math.min(...TARGETS.map((target) => targetBodyDimensions(target).topZ))
            : 0;
        return ALIVE;
    }
}
