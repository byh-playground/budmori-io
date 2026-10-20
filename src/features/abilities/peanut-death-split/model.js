import { getAbilityEffects } from '../../../ability-progression.js';
import { PEANUT_DEATH_SPLIT_FEATURE } from './definition.js';

const ABILITY_ID = PEANUT_DEATH_SPLIT_FEATURE.definition.id;

export class PeanutDeathSplitModel {
    static config(progression, tier) {
        const EFFECT = getAbilityEffects(progression, ABILITY_ID, tier);
        if (!EFFECT) {
            return null;
        }
        return {
            childCount: PEANUT_DEATH_SPLIT_FEATURE.definition.childCount,
            statMultiplier: EFFECT.value,
        };
    }
    static descriptors({ unit, progression, inBattle = false } = {}) {
        if (
            !inBattle ||
            !unit ||
            unit.hp > 0 ||
            unit.isBattleOnlySummon ||
            unit.canSplit === false ||
            unit.splitUsedThisBattle === true
        ) {
            return [];
        }
        const CONFIG = this.config(progression, unit.tier);
        if (!CONFIG) {
            return [];
        }
        return Array.from({ length: CONFIG.childCount }, () => ({
            species: unit.species,
            tier: 1,
            isBattleOnlySummon: true,
            battleSummonKind: 'peanut-death-split',
            battleSummonParentId: unit.id,
            battleSummonParentGeneration: unit.generation,
            ownerId: unit.ownerId || '',
            farmId: unit.farmId || 0,
            faction: unit.faction,
            countsTowardPermanentRoster: false,
            breedingEligible: false,
            mergeEligible: false,
            canSplit: false,
            splitUsedThisBattle: true,
            usesPersistentSleep: false,
            lifetime: 'until-death-or-battle-end',
            permanentStatMultiplier: CONFIG.statMultiplier,
        }));
    }
}
