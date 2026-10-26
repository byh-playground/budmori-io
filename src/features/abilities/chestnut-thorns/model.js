import { getAbilityEffects } from '../../../abilities/ability-progression.js';
import { CHESTNUT_THORNS_FEATURE } from './definition.js';

const ABILITY_ID = CHESTNUT_THORNS_FEATURE.definition.id;

export class ChestnutThornsModel {
    static config(progression, tier) {
        const EFFECT = getAbilityEffects(progression, ABILITY_ID, tier);
        if (!EFFECT) {
            return null;
        }
        return {
            projectileCount: EFFECT.value,
            cooldownTicks: CHESTNUT_THORNS_FEATURE.definition.cooldownTicks,
            spacingTicks: CHESTNUT_THORNS_FEATURE.definition.spacingTicks,
            attackMultiplier: 1,
        };
    }
    static resolveTarget(world, targetId, generation) {
        const TARGET = world._unitForId(targetId);
        return TARGET?.generation === generation ? TARGET : null;
    }
}
