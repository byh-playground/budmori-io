import { DEFINITION } from './definition.js';
import { FormationSkill, targetBodyDimensions } from '../model-base.js';
export class HammerSkill extends FormationSkill {
    constructor() {
        super(DEFINITION);
    }
    cast(owner, slot) {
        const TARGET = owner.enemy();
        if (!TARGET) {
            return false;
        }
        const BODY = targetBodyDimensions(TARGET);
        owner.addEffect(DEFINITION.id, {
            x: TARGET.x,
            y: TARGET.y,
            z: BODY.z,
            bodyHeight: BODY.bodyHeight,
            bodyRadius: BODY.bodyRadius,
            duration: 0.7,
        });
        owner.damage(TARGET, this.power(slot.level, this.definition.upgradeBase));
        TARGET.stun = Math.max(TARGET.stun || 0, 1);
        return true;
    }
}
