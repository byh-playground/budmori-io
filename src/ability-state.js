import { SPECIES_ABILITY_DEFINITIONS } from './ability-definitions.js';
import { createFarmUpgradeState, isValidFarmUpgradeState } from './farm-upgrades.js';
export const ABILITY_TREE_SCHEMA_VERSION = 2;
export function createAbilityProgressionState({ availablePoints = 0 } = {}) {
    if (!isNonNegativeInteger(availablePoints)) {
        throw new TypeError('availablePoints must be a non-negative integer');
    }
    return {
        schemaVersion: ABILITY_TREE_SCHEMA_VERSION,
        availablePoints,
        farmUpgrades: createFarmUpgradeState(),
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
                },
            ]),
        ),
    };
}
export function isValidAbilityProgressionState(state) {
    if (!state || typeof state !== 'object' || state.schemaVersion !== ABILITY_TREE_SCHEMA_VERSION) {
        return false;
    }
    if (
        !isNonNegativeInteger(state.availablePoints) ||
        !isValidFarmUpgradeState(state.farmUpgrades) ||
        !state.abilities ||
        typeof state.abilities !== 'object'
    ) {
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
    return Object.keys(state.abilities).every((abilityId) =>
        SPECIES_ABILITY_DEFINITIONS.some((definition) => definition.id === abilityId),
    );
}

function isNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
}
