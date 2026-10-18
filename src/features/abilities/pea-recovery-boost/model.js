import { getAbilityEffects } from '../../../ability-progression.js';
import { PEA_RECOVERY_BOOST_FEATURE } from '../pea-recovery-boost.js';

const ABILITY_ID = PEA_RECOVERY_BOOST_FEATURE.definition.id;

export class PeaRecoveryBoostModel {
    static config(progression, tier) {
        const EFFECT = getAbilityEffects(progression, ABILITY_ID, tier);
        if (!EFFECT) {
            return null;
        }
        return {
            durationTicks: PEA_RECOVERY_BOOST_FEATURE.model.durationTicks,
            speedMultiplier: PEA_RECOVERY_BOOST_FEATURE.model.multiplierForBonus(EFFECT.value),
        };
    }
}
