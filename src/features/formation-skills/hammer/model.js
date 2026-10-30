import { DEFINITION } from './definition.js';
import { FormationSkill, targetBodyDimensions } from '../model-base.js';
export const HAMMER_IMPACT_TIME = 0.55;
export class HammerSkill extends FormationSkill {
    constructor() {
        super(DEFINITION);
    }
    cast(owner, slot) {
        const TARGET = owner.enemy();
        if (!TARGET) {
            return false;
        }
        const PROFILE = this.profile(owner),
            BODY = targetBodyDimensions(TARGET);
        owner.addEffect(DEFINITION.id, {
            x: TARGET.x,
            y: TARGET.y,
            z: BODY.z,
            bodyHeight: BODY.bodyHeight,
            bodyRadius: BODY.bodyRadius,
            ...this.sizeState(owner, TARGET),
            targetId: owner.targetId(TARGET),
            targetGeneration: owner.targetGeneration?.(TARGET),
            damage: this.power(slot.level, PROFILE.upgradeBase),
            stunSeconds: PROFILE.stunSeconds,
            impacted: false,
            duration: PROFILE.durationSeconds,
        });
        return true;
    }
    update(owner, effect, dt) {
        effect.age += dt;
        const TARGET = owner.target(effect.targetId, effect.targetGeneration);
        if (TARGET && !effect.impacted) {
            const BODY = targetBodyDimensions(TARGET);
            effect.x = TARGET.x;
            effect.y = TARGET.y;
            effect.z = BODY.z;
            effect.bodyHeight = BODY.bodyHeight;
            effect.bodyRadius = BODY.bodyRadius;
            Object.assign(effect, this.sizeState(owner, TARGET));
        }
        if (!effect.impacted && effect.age + 1e-9 >= HAMMER_IMPACT_TIME) {
            effect.impacted = true;
            if (TARGET) {
                owner.damage(TARGET, effect.damage);
                TARGET.stun = Math.max(TARGET.stun || 0, effect.stunSeconds ?? this.definition.stunSeconds);
            }
        }
        return effect.age < effect.duration;
    }
}
