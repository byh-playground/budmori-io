import { DEFINITION } from './definition.js';
import { FormationSkill } from '../model-base.js';
export class GiantSkill extends FormationSkill {
    constructor() {
        super(DEFINITION);
    }
    cast(owner, slot) {
        const CANDIDATES = owner.allies().filter((unit) => unit.giantUntil <= owner.world.time);
        if (!CANDIDATES.length) {
            return false;
        }
        for (let i = 0; i < Math.min(CANDIDATES.length, this.definition.upgradeBase + slot.level - 1); i++) {
            const J = i + Math.floor(owner.world.random() * (CANDIDATES.length - i)),
                UNIT = CANDIDATES[J];
            CANDIDATES[J] = CANDIDATES[i];
            CANDIDATES[i] = UNIT;
            UNIT.giantUntil = owner.world.time + 7.5;
            owner.addEffect(DEFINITION.id, { x: UNIT.x, y: UNIT.y, unitId: UNIT.id, duration: 7.5 });
        }
        return true;
    }
    update(owner, effect, dt) {
        effect.age += dt;
        const UNIT = owner.world._unitForId(effect.unitId);
        if (!UNIT || UNIT.hp <= 0) {
            return false;
        }
        effect.x = UNIT.x;
        effect.y = UNIT.y;
        if (effect.age >= effect.duration) {
            UNIT.giantUntil = 0;
            UNIT.giantEndedAt = owner.world.time;
            return false;
        }
        return true;
    }
}
