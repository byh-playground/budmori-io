import { SPECIES_ABILITY_DEFINITIONS } from '../../abilities/ability-definitions.js';
import { isValidLegacyAbilityProgressionState, isValidLegacyAbilityInvestment } from './legacy-state.js';
import { SpeciesGrowth } from './model.js';
import { speciesGrowthDefinition } from './definition.js';

const SPECIES_TREE_VERSION = 1;
const GROWTH_BY_ABILITY = new Map(
    SPECIES_ABILITY_DEFINITIONS.filter((definition) => speciesGrowthDefinition(definition.species)?.available).map(
        (definition) => [definition.id, new SpeciesGrowth(speciesGrowthDefinition(definition.species))],
    ),
);

export function growthForAbility(abilityId) {
    return GROWTH_BY_ABILITY.get(abilityId) || null;
}

export function isGrowthInvestment(investment) {
    return investment?.treeVersion === SPECIES_TREE_VERSION;
}

export function growthBuildOf(investment) {
    return {
        masteryLevel: investment.masteryLevel,
        masteryXp: investment.masteryXp,
        nodeRanks: investment.nodeRanks,
        ...(investment.legacyMastery ? { legacyMastery: investment.legacyMastery } : {}),
    };
}

function isValidGrowthInvestment(abilityId, investment) {
    const GROWTH = growthForAbility(abilityId),
        DEFINITION = SPECIES_ABILITY_DEFINITIONS.find((definition) => definition.id === abilityId);
    return !!(
        GROWTH &&
        isGrowthInvestment(investment) &&
        ['treeVersion', 'masteryLevel', 'masteryXp', 'nodeRanks'].every((key) => Object.hasOwn(investment, key)) &&
        Object.keys(investment).every((key) =>
            ['treeVersion', 'masteryLevel', 'masteryXp', 'nodeRanks', 'legacyMastery', 'legacyInvestment'].includes(
                key,
            ),
        ) &&
        GROWTH.isValidBuild(growthBuildOf(investment)) &&
        (!Object.hasOwn(investment, 'legacyMastery') ||
            (investment.legacyMastery &&
                Object.keys(investment.legacyMastery).length === 2 &&
                Object.hasOwn(investment.legacyMastery, 'masteryLevel') &&
                Object.hasOwn(investment.legacyMastery, 'masteryXp'))) &&
        (!Object.hasOwn(investment, 'legacyInvestment') ||
            isValidLegacyAbilityInvestment(DEFINITION, investment.legacyInvestment))
    );
}

// Validate each known source entry before migration; a future or malformed tree is never
// interpreted as a legacy investment. The full farm container is validated before anything is written.
export function migrateAbilityProgressionState(state) {
    if (
        !(state?.schemaVersion === 3
            ? isValidLegacyAbilityProgressionState(state)
            : isValidMixedAbilityEntries(state, { allowLegacy: true }))
    ) {
        throw new TypeError('Invalid ability progression');
    }
    const NEXT = structuredClone(state);
    NEXT.schemaVersion = 4;
    for (const [ABILITY_ID, INVESTMENT] of Object.entries(state.abilities)) {
        const GROWTH = growthForAbility(ABILITY_ID);
        if (GROWTH && !isGrowthInvestment(INVESTMENT)) {
            NEXT.abilities[ABILITY_ID] = {
                treeVersion: SPECIES_TREE_VERSION,
                ...GROWTH.migrateBuild(INVESTMENT),
                legacyInvestment: structuredClone(INVESTMENT),
            };
        }
    }
    return NEXT;
}

export function isValidMixedAbilityEntries(state, { allowLegacy = false } = {}) {
    return !!(
        state &&
        typeof state === 'object' &&
        state.schemaVersion === 4 &&
        state.abilities &&
        typeof state.abilities === 'object' &&
        !Array.isArray(state.abilities) &&
        Object.keys(state.abilities).length === SPECIES_ABILITY_DEFINITIONS.length &&
        SPECIES_ABILITY_DEFINITIONS.every((definition) =>
            growthForAbility(definition.id)
                ? isValidGrowthInvestment(definition.id, state.abilities[definition.id]) ||
                  (allowLegacy && isValidLegacyAbilityInvestment(definition, state.abilities[definition.id]))
                : isValidLegacyAbilityInvestment(definition, state.abilities[definition.id]),
        )
    );
}
