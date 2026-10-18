import { getAbilityEffects } from '../../../ability-progression.js';
import { KIDNEY_CONTINUOUS_LEAP_FEATURE } from '../kidney-continuous-leap.js';

const ABILITY_ID = KIDNEY_CONTINUOUS_LEAP_FEATURE.definition.id;

export class KidneyLeapModel {
    static config(progression, tier) {
        const EFFECT = getAbilityEffects(progression, ABILITY_ID, tier);
        if (!EFFECT) {
            return null;
        }
        return {
            cooldownResetChance: EFFECT.value,
            cooldownTicks: KIDNEY_CONTINUOUS_LEAP_FEATURE.model.cooldownTicks,
        };
    }
    static shouldResetCooldown(config, roll) {
        return !!config && Number.isFinite(roll) && roll >= 0 && roll < config.cooldownResetChance;
    }
}
