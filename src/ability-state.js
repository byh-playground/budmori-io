import { SPECIES_ABILITY_DEFINITIONS } from "./ability-catalog.js";

export const ABILITY_TREE_SCHEMA_VERSION = 1;

export function createAbilityProgressionState({ availablePoints = 0 } = {}) {
  if (!isNonNegativeInteger(availablePoints)) throw new TypeError("availablePoints must be a non-negative integer");
  return {
    schemaVersion: ABILITY_TREE_SCHEMA_VERSION,
    availablePoints,
    abilities: Object.fromEntries(SPECIES_ABILITY_DEFINITIONS.map(definition => [definition.id, {
      rootUnlocked: false,
      powerLevel: 0,
      gradeLevel: 0
    }]))
  };
}

export function isValidAbilityProgressionState(state) {
  if (!state || typeof state !== "object" || state.schemaVersion !== ABILITY_TREE_SCHEMA_VERSION) return false;
  if (!isNonNegativeInteger(state.availablePoints) || !state.abilities || typeof state.abilities !== "object") return false;
  for (const definition of SPECIES_ABILITY_DEFINITIONS) {
    const investment = state.abilities[definition.id];
    if (!investment || typeof investment.rootUnlocked !== "boolean") return false;
    if (!isNonNegativeInteger(investment.powerLevel) || investment.powerLevel > definition.powerValues.length - 1) return false;
    if (!isNonNegativeInteger(investment.gradeLevel) || investment.gradeLevel > definition.gradeThresholds.length - 1) return false;
    if (!investment.rootUnlocked && (investment.powerLevel !== 0 || investment.gradeLevel !== 0)) return false;
  }
  return true;
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}
