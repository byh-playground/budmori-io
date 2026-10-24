import { DEFINITION } from './definition.js';
import { MeteorSkill } from '../model-base.js';
export class MeteorShowerSkill extends MeteorSkill {
    constructor() {
        super(DEFINITION);
    }
    cast(owner, slot) {
        if (!owner.enemy()) {
            return false;
        }
        const PROFILE = this.profile(owner);
        for (let i = 0; i < PROFILE.upgradeBase + PROFILE.upgradeStep * (slot.level - 1); i++) {
            this.launch(owner, slot, i);
        }
        return true;
    }
}
