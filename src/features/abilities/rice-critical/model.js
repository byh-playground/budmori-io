import { getAbilityEffects } from '../../../ability-progression.js';

const ABILITY_ID = 'rice-low-health-harvest';

export class RiceCriticalModel {
    static chanceBonus(progression, tier, currentHp, maxHp) {
        if (!Number.isFinite(currentHp) || currentHp <= 0 || !Number.isFinite(maxHp) || maxHp <= 0) {
            return 0;
        }
        const EFFECT = getAbilityEffects(progression, ABILITY_ID, tier);
        if (!EFFECT) {
            return 0;
        }
        const MISSING_HP_RATIO = Math.max(0, Math.min(1, 1 - currentHp / maxHp));
        return MISSING_HP_RATIO * EFFECT.value;
    }
}
