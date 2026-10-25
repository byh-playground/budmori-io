import { DEFINITION } from './definition.js';
import { FormationSkill, sizeValue, targetBodyDimensions } from '../model-base.js';
export class LightningSkill extends FormationSkill {
    constructor() {
        super(DEFINITION);
    }
    cast(owner, slot) {
        const TARGET = owner.enemy();
        if (!TARGET) {
            return false;
        }
        const PROFILE = this.profile(owner),
            BODY = targetBodyDimensions(TARGET),
            SIZE = this.sizeState(owner, TARGET),
            RADIUS = sizeValue(PROFILE, SIZE, 'aoeRadius'),
            DAMAGE = this.power(slot.level, PROFILE.upgradeBase);
        owner.addEffect(DEFINITION.id, {
            x: TARGET.x,
            y: TARGET.y,
            z: RADIUS > 0 ? 0 : BODY.z,
            ...SIZE,
            bodyHeight: BODY.bodyHeight,
            bodyRadius: BODY.bodyRadius,
            duration: PROFILE.telegraphSeconds + 0.65,
            telegraphSeconds: PROFILE.telegraphSeconds,
            radius: RADIUS,
            damage: DAMAGE,
            impacted: RADIUS === 0,
        });
        if (RADIUS === 0) {
            owner.damage(TARGET, DAMAGE);
        }
        return true;
    }
    update(owner, effect, dt) {
        effect.age += dt;
        if (!effect.impacted && effect.age + 1e-9 >= effect.telegraphSeconds) {
            effect.impacted = true;
            owner.areaDamage(effect.x, effect.y, effect.radius, effect.damage, false);
        }
        return effect.age < effect.duration;
    }
}
