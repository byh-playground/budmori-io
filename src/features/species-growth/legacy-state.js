import { SPECIES_ABILITY_DEFINITIONS } from '../../abilities/ability-definitions.js';
import { masteryXpForNextLevel } from '../../model/mastery.js';

export function legacyInvestedPoints(investment) {
    return (
        investment.powerLevel + Object.values(investment.branchLevels || {}).reduce((total, level) => total + level, 0)
    );
}
export function isValidLegacyAbilityProgressionState(state) {
    return !!(
        state &&
        typeof state === 'object' &&
        state.schemaVersion === 3 &&
        state.abilities &&
        typeof state.abilities === 'object' &&
        !Array.isArray(state.abilities) &&
        Object.keys(state.abilities).length === SPECIES_ABILITY_DEFINITIONS.length &&
        SPECIES_ABILITY_DEFINITIONS.every((definition) =>
            isValidLegacyAbilityInvestment(definition, state.abilities[definition.id]),
        )
    );
}

export function isValidLegacyAbilityInvestment(definition, investment) {
    if (
        !investment ||
        typeof investment !== 'object' ||
        Array.isArray(investment) ||
        !isNonNegativeInteger(investment.powerLevel) ||
        investment.powerLevel > definition.powerValues.length - 1 ||
        !Number.isSafeInteger(investment.masteryLevel) ||
        investment.masteryLevel < 1 ||
        !Number.isFinite(investment.masteryXp) ||
        investment.masteryXp < 0 ||
        investment.masteryXp >= masteryXpForNextLevel(investment.masteryLevel) ||
        Object.keys(investment).some(
            (key) => !['powerLevel', 'branchLevels', 'masteryLevel', 'masteryXp'].includes(key),
        )
    ) {
        return false;
    }
    const BRANCHES = definition.branches || {},
        BRANCH_LEVELS = investment.branchLevels || {};
    if (
        (Object.keys(BRANCHES).length === 0 && Object.hasOwn(investment, 'branchLevels')) ||
        (Object.hasOwn(investment, 'branchLevels') &&
            (typeof investment.branchLevels !== 'object' ||
                !investment.branchLevels ||
                Array.isArray(investment.branchLevels) ||
                Object.keys(BRANCH_LEVELS).length !== Object.keys(BRANCHES).length ||
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
    return investment.masteryLevel - 1 - legacyInvestedPoints(investment) >= 0;
}
function isNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
}
