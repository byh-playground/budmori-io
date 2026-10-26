import { DEFINITION } from './definition.js';
import { FormationSkill } from '../model-base.js';
import { formationUpgradeValue } from '../../../formation/formation-skill-state.js';
export class GiantSkill extends FormationSkill {
    constructor() {
        super(DEFINITION);
    }
    candidates(owner) {
        return owner.allies().filter((unit) => unit.giantUntil <= owner.world.time);
    }
    canCast(owner) {
        return this.candidates(owner).length > 0;
    }
    cast(owner, slot) {
        const PROFILE = this.profile(owner),
            CANDIDATES = this.candidates(owner);
        if (!CANDIDATES.length) {
            return false;
        }
        const TARGET_COUNT = Math.min(CANDIDATES.length, formationUpgradeValue(PROFILE, slot.level));
        for (let i = 0; i < TARGET_COUNT; i++) {
            const J = i + Math.floor(owner.world.random() * (CANDIDATES.length - i)),
                UNIT = CANDIDATES[J];
            CANDIDATES[J] = CANDIDATES[i];
            CANDIDATES[i] = UNIT;
            UNIT.giantSizeMultiplier = PROFILE.sizeMultiplier;
            UNIT.giantUntil = owner.world.time + PROFILE.durationSeconds;
            owner.addEffect(DEFINITION.id, {
                x: UNIT.x,
                y: UNIT.y,
                radius: UNIT.radius,
                unitId: UNIT.id,
                unitGeneration: UNIT.generation,
                duration: PROFILE.durationSeconds,
            });
        }
        return true;
    }
    update(owner, effect, dt) {
        effect.age += dt;
        const UNIT = owner.world._unitForId(effect.unitId);
        if (
            !UNIT ||
            UNIT.hp <= 0 ||
            (effect.unitGeneration !== undefined && UNIT.generation !== effect.unitGeneration)
        ) {
            return false;
        }
        effect.x = UNIT.x;
        effect.y = UNIT.y;
        effect.radius = UNIT.radius;
        if (effect.age >= effect.duration) {
            UNIT.giantUntil = 0;
            UNIT.giantSizeMultiplier = this.definition.sizeMultiplier;
            UNIT.giantEndedAt = owner.world.time;
            return false;
        }
        return true;
    }
}
