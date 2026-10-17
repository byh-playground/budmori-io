import { DEFINITION } from './definition.js';
import { MeteorSkill, T1_DIAMETER } from '../model-base.js';
export class MeteorShowerSkill extends MeteorSkill {
    constructor() {
        super(DEFINITION);
    }
    cast(owner, slot) {
        if (!owner.enemy()) {
            return false;
        }
        for (let i = 0; i < this.definition.upgradeBase + slot.level - 1; i++) {
            this.launch(owner, slot, i);
            const EFFECT = owner.effects[owner.effects.length - 1];
            EFFECT.radius = T1_DIAMETER;
            EFFECT.damage = 25;
        }
        return true;
    }
}
