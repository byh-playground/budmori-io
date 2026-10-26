import { peaGrowthBuild } from '../../species-growth/pea-attack.js';
import { getAbilityEffects } from '../../../abilities/ability-progression.js';
import { PEA_RECOVERY_BOOST_FEATURE } from '../pea-recovery-boost.js';

const ABILITY_ID = PEA_RECOVERY_BOOST_FEATURE.definition.id;

export class PeaRecoveryBoostModel {
    static config(progression, tier) {
        const BUILD = peaGrowthBuild(progression);
        if (BUILD) {
            return { durationTicks: 40, speedMultiplier: 1.25 + 0.06 * (BUILD.nodeRanks['specialty-1'] || 0) };
        }
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
