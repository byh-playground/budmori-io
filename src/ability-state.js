import {
    createFormationSkillState,
    formationInvestedPoints,
    isValidFormationSkillState,
} from './formation-skill-state.js';
import { SPECIES_ABILITY_DEFINITIONS } from './ability-catalog.js';
import { createFarmUpgradeState, getFarmUpgradeInvestedCount, isValidFarmUpgradeState } from './farm-upgrades.js';
import {
    createRaidDeploymentCardsState,
    isValidRaidDeploymentCardsState,
    raidDeploymentCardsInvestedPoints,
} from './raid-deployment-cards.js';
export const ABILITY_TREE_SCHEMA_VERSION = 1;
export const BASELINE_ABILITY_MIGRATION_VERSION = 2;
export function createAbilityProgressionState({ availablePoints = 0 } = {}) {
    if (!isNonNegativeInteger(availablePoints)) {
        throw new TypeError('availablePoints must be a non-negative integer');
    }
    return {
        schemaVersion: ABILITY_TREE_SCHEMA_VERSION,
        baselineAbilityMigrationVersion: BASELINE_ABILITY_MIGRATION_VERSION,
        availablePoints,
        farmUpgrades: createFarmUpgradeState(),
        abilities: Object.fromEntries(
            SPECIES_ABILITY_DEFINITIONS.map((definition) => [
                definition.id,
                {
                    rootUnlocked: false,
                    powerLevel: 0,
                    gradeLevel: 0,
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
    if (
        !state ||
        typeof state !== 'object' ||
        state.schemaVersion !== ABILITY_TREE_SCHEMA_VERSION ||
        state.baselineAbilityMigrationVersion !== BASELINE_ABILITY_MIGRATION_VERSION
    ) {
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
        if (!INVESTMENT || typeof INVESTMENT.rootUnlocked !== 'boolean') {
            return false;
        }
        if (!isNonNegativeInteger(INVESTMENT.powerLevel) || INVESTMENT.powerLevel > DEFINITION.powerValues.length - 1) {
            return false;
        }
        if (
            !isNonNegativeInteger(INVESTMENT.gradeLevel) ||
            INVESTMENT.gradeLevel > DEFINITION.gradeThresholds.length - 1
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
        if (
            (DEFINITION.defaultUnlocked && INVESTMENT.rootUnlocked) ||
            (!DEFINITION.defaultUnlocked &&
                !INVESTMENT.rootUnlocked &&
                (INVESTMENT.powerLevel !== 0 ||
                    INVESTMENT.gradeLevel !== 0 ||
                    Object.values(BRANCH_LEVELS).some((level) => level !== 0)))
        ) {
            return false;
        }
    }
    return Object.keys(state.abilities).every((abilityId) =>
        SPECIES_ABILITY_DEFINITIONS.some((definition) => definition.id === abilityId),
    );
}

// Raid rooms receive only the public, owner-scoped build needed by simulation.
// XP history and the shared point wallet remain in that owner's Farm save.
export function createAbilityRuntimeSnapshot(state) {
    if (!isValidPlayerLikeAbilityState(state)) {
        throw new TypeError('Cannot snapshot invalid ability progression state');
    }
    return {
        schemaVersion: ABILITY_TREE_SCHEMA_VERSION,
        baselineAbilityMigrationVersion: BASELINE_ABILITY_MIGRATION_VERSION,
        level: state.level,
        formationSkills: structuredClone(state.formationSkills || createFormationSkillState()),
        raidDeploymentCards: structuredClone(state.raidDeploymentCards || createRaidDeploymentCardsState()),
        availablePoints: state.availablePoints,
        farmUpgrades: {
            ...state.farmUpgrades,
        },
        abilities: Object.fromEntries(
            SPECIES_ABILITY_DEFINITIONS.map((definition) => [
                definition.id,
                {
                    ...state.abilities[definition.id],
                    ...(definition.branches
                        ? {
                              branchLevels: Object.fromEntries(
                                  Object.keys(definition.branches).map((branchId) => [
                                      branchId,
                                      state.abilities[definition.id].branchLevels?.[branchId] || 0,
                                  ]),
                              ),
                          }
                        : {}),
                },
            ]),
        ),
    };
}
export function isValidAbilityRuntimeSnapshot(snapshot) {
    if (
        !snapshot ||
        typeof snapshot !== 'object' ||
        snapshot.schemaVersion !== ABILITY_TREE_SCHEMA_VERSION ||
        snapshot.baselineAbilityMigrationVersion !== BASELINE_ABILITY_MIGRATION_VERSION ||
        !Number.isSafeInteger(snapshot.level) ||
        snapshot.level < 1
    ) {
        return false;
    }
    const STATE = {
        schemaVersion: snapshot.schemaVersion,
        baselineAbilityMigrationVersion: snapshot.baselineAbilityMigrationVersion,
        formationSkills: snapshot.formationSkills,
        raidDeploymentCards: snapshot.raidDeploymentCards || createRaidDeploymentCardsState(),
        level: snapshot.level,
        experience: 0,
        availablePoints: snapshot.availablePoints,
        farmUpgrades: snapshot.farmUpgrades,
        abilities: snapshot.abilities,
        processedBossKillReceipts: [],
    };
    if (
        !isValidAbilityProgressionState(STATE) ||
        (STATE.formationSkills !== undefined && !isValidFormationSkillState(STATE.formationSkills)) ||
        !isValidRaidDeploymentCardsState(STATE.raidDeploymentCards)
    ) {
        return false;
    }
    const INVESTED = Object.entries(STATE.abilities).reduce(
        (total, [abilityId, investment]) =>
            total +
            investedAbilityPoints(
                investment,
                SPECIES_ABILITY_DEFINITIONS.find((item) => item.id === abilityId),
            ),
        0,
    );
    return (
        INVESTED +
            formationInvestedPoints(STATE.formationSkills) +
            raidDeploymentCardsInvestedPoints(STATE.raidDeploymentCards) +
            getFarmUpgradeInvestedCount(STATE.farmUpgrades) +
            STATE.availablePoints ===
        STATE.level - 1
    );
}
function isValidPlayerLikeAbilityState(state) {
    const ABILITY_STATE = {
        schemaVersion: state?.schemaVersion,
        baselineAbilityMigrationVersion: state?.baselineAbilityMigrationVersion,
        availablePoints: state?.availablePoints,
        farmUpgrades: state?.farmUpgrades,
        abilities: state?.abilities,
    };
    if (
        !isValidAbilityProgressionState(ABILITY_STATE) ||
        !Number.isSafeInteger(state?.level) ||
        state.level < 1 ||
        !isValidRaidDeploymentCardsState(state?.raidDeploymentCards)
    ) {
        return false;
    }
    const INVESTED_POINTS = Object.entries(state.abilities).reduce(
        (total, [abilityId, investment]) =>
            total +
            investedAbilityPoints(
                investment,
                SPECIES_ABILITY_DEFINITIONS.find((item) => item.id === abilityId),
            ),
        0,
    );
    return (
        INVESTED_POINTS +
            formationInvestedPoints(state.formationSkills) +
            raidDeploymentCardsInvestedPoints(state.raidDeploymentCards) +
            getFarmUpgradeInvestedCount(state.farmUpgrades) +
            state.availablePoints ===
        state.level - 1
    );
}
function isNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
}
function investedAbilityPoints(investment, definition) {
    return (
        Number(investment.rootUnlocked && !definition?.defaultUnlocked) +
        investment.powerLevel +
        investment.gradeLevel +
        Object.values(investment.branchLevels || {}).reduce((total, level) => total + level, 0)
    );
}

// Older saves paid for default ability roots and grade reductions. Return
// only those recorded investments, preserve power/range upgrades, and stamp
// the state so loading or normalizing it again cannot refund twice.
export function migrateBaselineAbilityInvestments(state) {
    if (
        !state ||
        typeof state !== 'object' ||
        state.baselineAbilityMigrationVersion === BASELINE_ABILITY_MIGRATION_VERSION
    ) {
        return 0;
    }
    let refund = 0;
    for (const DEFINITION of SPECIES_ABILITY_DEFINITIONS) {
        if (!DEFINITION.defaultUnlocked) {
            continue;
        }
        const BUILD = state.abilities?.[DEFINITION.id];
        if (!BUILD) {
            continue;
        }
        refund += Number(BUILD.rootUnlocked === true);
        refund += Number.isSafeInteger(BUILD.gradeLevel) && BUILD.gradeLevel > 0 ? BUILD.gradeLevel : 0;
        BUILD.rootUnlocked = false;
        BUILD.gradeLevel = 0;
    }
    const POINTS =
        Number.isSafeInteger(state.availablePoints) && state.availablePoints >= 0 ? state.availablePoints : 0;
    state.availablePoints = POINTS + refund;
    state.baselineAbilityMigrationVersion = BASELINE_ABILITY_MIGRATION_VERSION;
    return refund;
}
