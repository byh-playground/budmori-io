import { SPECIES_ABILITY_DEFINITIONS } from './ability-definitions.js';
export const ABILITY_TREE_SCHEMA_VERSION = 3;
// Every species keeps its own mastery: beating its boss fills the XP bar, each level earns one point for that
// species' abilities only. XP is the remainder toward the next level, so it carries over across level-ups.
export const MASTERY_FIRST_LEVEL_XP = 100;
export const MASTERY_LEVEL_XP_MULTIPLIER = 1.2;
export function masteryXpForNextLevel(level) {
    if (!Number.isSafeInteger(level) || level < 1) {
        throw new RangeError('mastery level must be a positive integer');
    }
    return MASTERY_FIRST_LEVEL_XP * MASTERY_LEVEL_XP_MULTIPLIER ** (level - 1);
}
export function investedPointsOf(investment) {
    return (
        investment.powerLevel + Object.values(investment.branchLevels || {}).reduce((total, level) => total + level, 0)
    );
}
// Points a species can still spend: one per mastery level above the first, minus what it already put in.
export function masteryPointsLeft(investment) {
    return investment.masteryLevel - 1 - investedPointsOf(investment);
}
export function createAbilityProgressionState() {
    return {
        schemaVersion: ABILITY_TREE_SCHEMA_VERSION,
        abilities: Object.fromEntries(
            SPECIES_ABILITY_DEFINITIONS.map((definition) => [
                definition.id,
                {
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
    if (!state || typeof state !== 'object' || state.schemaVersion !== ABILITY_TREE_SCHEMA_VERSION) {
        return false;
    }
    if (!state.abilities || typeof state.abilities !== 'object') {
        return false;
    }
    if (Object.keys(state.abilities).length !== SPECIES_ABILITY_DEFINITIONS.length) {
        return false;
    }
    for (const DEFINITION of SPECIES_ABILITY_DEFINITIONS) {
        const INVESTMENT = state.abilities[DEFINITION.id];
        if (!INVESTMENT || !isNonNegativeInteger(INVESTMENT.powerLevel)) {
            return false;
        }
        if (INVESTMENT.powerLevel > DEFINITION.powerValues.length - 1) {
            return false;
        }
        if (
            !Number.isSafeInteger(INVESTMENT.masteryLevel) ||
            INVESTMENT.masteryLevel < 1 ||
            !Number.isFinite(INVESTMENT.masteryXp) ||
            INVESTMENT.masteryXp < 0 ||
            INVESTMENT.masteryXp >= masteryXpForNextLevel(INVESTMENT.masteryLevel)
        ) {
            return false;
        }
        const BRANCHES = DEFINITION.branches || {},
            BRANCH_LEVELS = INVESTMENT.branchLevels || {};
        if (
            (Object.keys(BRANCHES).length === 0 && Object.hasOwn(INVESTMENT, 'branchLevels')) ||
            (Object.hasOwn(INVESTMENT, 'branchLevels') &&
                (Object.keys(BRANCH_LEVELS).length !== Object.keys(BRANCHES).length ||
                    Object.keys(BRANCH_LEVELS).some((branchId) => !Object.hasOwn(BRANCHES, branchId))))
        ) {
            return false;
        }
        for (const [BRANCH_ID, BRANCH] of Object.entries(BRANCHES)) {
            const LEVEL = BRANCH_LEVELS[BRANCH_ID] ?? 0;
            if (!isNonNegativeInteger(LEVEL) || LEVEL > BRANCH.values.length - 1) {
                return false;
            }
        }
    }
    if (SPECIES_ABILITY_DEFINITIONS.some((definition) => masteryPointsLeft(state.abilities[definition.id]) < 0)) {
        return false;
    }
    return Object.keys(state.abilities).every((abilityId) =>
        SPECIES_ABILITY_DEFINITIONS.some((definition) => definition.id === abilityId),
    );
}

function isNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
}
