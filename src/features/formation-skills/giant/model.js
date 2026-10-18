import { DEFINITION } from './definition.js';
import { FormationSkill } from '../model-base.js';
import { formationUpgradeValue } from '../../../formation-skill-state.js';
export class GiantSkill extends FormationSkill {
    constructor() {
        super(DEFINITION);
    }
    cast(owner, slot) {
        const CANDIDATES = owner.allies().filter((unit) => unit.giantUntil <= owner.world.time);
        if (!CANDIDATES.length) {
            return false;
        }
        const TARGET_COUNT = Math.min(CANDIDATES.length, formationUpgradeValue(this.definition, slot.level));
        for (let i = 0; i < TARGET_COUNT; i++) {
            const J = i + Math.floor(owner.world.random() * (CANDIDATES.length - i)),
                UNIT = CANDIDATES[J];
            CANDIDATES[J] = CANDIDATES[i];
            CANDIDATES[i] = UNIT;
            UNIT.giantUntil = owner.world.time + this.definition.durationSeconds;
            owner.addEffect(DEFINITION.id, {
                x: UNIT.x,
                y: UNIT.y,
                radius: UNIT.radius,
                unitId: UNIT.id,
                duration: this.definition.durationSeconds,
            });
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
        effect.radius = UNIT.radius;
        if (effect.age >= effect.duration) {
            UNIT.giantUntil = 0;
            UNIT.giantEndedAt = owner.world.time;
            return false;
        }
        return true;
    }
}
