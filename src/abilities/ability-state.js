import { SPECIES_ABILITY_DEFINITIONS } from './ability-definitions.js';
import {
    growthForAbility,
    growthBuildOf,
    isGrowthInvestment,
    isValidMixedAbilityEntries,
} from '../features/species-growth/state.js';
const ABILITY_TREE_SCHEMA_VERSION = 4;
// Every species keeps its own mastery: beating its boss fills the XP bar, each level earns one point for that
// species' abilities only. XP is the remainder toward the next level, so it carries over across level-ups.
export { MASTERY_FIRST_LEVEL_XP, MASTERY_LEVEL_XP_MULTIPLIER, masteryXpForNextLevel } from '../model/mastery.js';
import { legacyInvestedPoints } from '../features/species-growth/legacy-state.js';
export {
    isValidLegacyAbilityProgressionState,
    isValidLegacyAbilityInvestment,
} from '../features/species-growth/legacy-state.js';
export function investedPointsOf(investment) {
    if (isGrowthInvestment(investment)) {
        const GROWTH = growthForAbility('corn-kernel-chain');
        return GROWTH.investedPoints(growthBuildOf(investment));
    }
    return legacyInvestedPoints(investment);
}
// Released trees include the starting point; legacy species keep their previous level-minus-one budget.
export function masteryPointsLeft(investment) {
    return investment.masteryLevel - (isGrowthInvestment(investment) ? 0 : 1) - investedPointsOf(investment);
}
export function createAbilityProgressionState() {
    return {
        schemaVersion: ABILITY_TREE_SCHEMA_VERSION,
        abilities: Object.fromEntries(
            SPECIES_ABILITY_DEFINITIONS.map((definition) => [
                definition.id,
                growthForAbility(definition.id)
                    ? {
                          treeVersion: 1,
                          ...growthForAbility(definition.id).createBuild(),
                      }
                    : {
                          powerLevel: 0,
                          ...(definition.branches
                              ? {
                                    branchLevels: Object.fromEntries(
                                        Object.keys(definition.branches).map((branchId) => [branchId, 0]),
                                    ),
                                }
                              : {}),
                          masteryLevel: 1,
                          masteryXp: 0,
                      },
            ]),
        ),
    };
}
export function isValidAbilityProgressionState(state) {
    return isValidMixedAbilityEntries(state);
}
