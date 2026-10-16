import { SPECIES_ABILITY_DEFINITIONS } from "./ability-catalog.js";
import { createFarmUpgradeState, getFarmUpgradeInvestedCount, isValidFarmUpgradeState } from "./farm-upgrades.js";

export const ABILITY_TREE_SCHEMA_VERSION = 1;

export function createAbilityProgressionState({ availablePoints = 0 } = {}) {
  if (!isNonNegativeInteger(availablePoints)) throw new TypeError("availablePoints must be a non-negative integer");
  return {
    schemaVersion: ABILITY_TREE_SCHEMA_VERSION,
    availablePoints,
    farmUpgrades: createFarmUpgradeState(),
    abilities: Object.fromEntries(SPECIES_ABILITY_DEFINITIONS.map(definition => [definition.id, {
      rootUnlocked: false,
      powerLevel: 0,
      gradeLevel: 0
    }]))
  };
}

export function isValidAbilityProgressionState(state) {
  if (!state || typeof state !== "object" || state.schemaVersion !== ABILITY_TREE_SCHEMA_VERSION) return false;
  if (!isNonNegativeInteger(state.availablePoints) || !isValidFarmUpgradeState(state.farmUpgrades) || !state.abilities || typeof state.abilities !== "object") return false;
  if (Object.keys(state.abilities).length !== SPECIES_ABILITY_DEFINITIONS.length) return false;
  for (const definition of SPECIES_ABILITY_DEFINITIONS) {
    const investment = state.abilities[definition.id];
    if (!investment || typeof investment.rootUnlocked !== "boolean") return false;
    if (!isNonNegativeInteger(investment.powerLevel) || investment.powerLevel > definition.powerValues.length - 1) return false;
    if (!isNonNegativeInteger(investment.gradeLevel) || investment.gradeLevel > definition.gradeThresholds.length - 1) return false;
    if (!investment.rootUnlocked && (investment.powerLevel !== 0 || investment.gradeLevel !== 0)) return false;
  }
  return Object.keys(state.abilities).every(abilityId => SPECIES_ABILITY_DEFINITIONS.some(definition => definition.id === abilityId));
}

// Raid rooms receive only the public, owner-scoped build needed by simulation.
// XP history and the shared point wallet remain in that owner's Farm save.
export function createAbilityRuntimeSnapshot(state) {
  if (!isValidPlayerLikeAbilityState(state)) throw new TypeError("Cannot snapshot invalid ability progression state");
  return {
    schemaVersion: ABILITY_TREE_SCHEMA_VERSION,
    level: state.level,
    availablePoints: state.availablePoints,
    farmUpgrades: { ...state.farmUpgrades },
    abilities: Object.fromEntries(SPECIES_ABILITY_DEFINITIONS.map(({ id }) => [id, { ...state.abilities[id] }]))
  };
}

export function isValidAbilityRuntimeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || snapshot.schemaVersion !== ABILITY_TREE_SCHEMA_VERSION ||
      !Number.isSafeInteger(snapshot.level) || snapshot.level < 1) return false;
  const state = {
    schemaVersion: snapshot.schemaVersion,
    level: snapshot.level,
    experience: 0,
    availablePoints: snapshot.availablePoints,
    farmUpgrades: snapshot.farmUpgrades,
    abilities: snapshot.abilities,
    processedBossKillReceipts: []
  };
  if (!isValidAbilityProgressionState(state)) return false;
  const invested = Object.values(state.abilities).reduce((total, investment) => total +
    Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel, 0);
  return invested + getFarmUpgradeInvestedCount(state.farmUpgrades) + state.availablePoints === state.level - 1;
}

function isValidPlayerLikeAbilityState(state) {
  const abilityState = {
    schemaVersion: state?.schemaVersion,
    availablePoints: state?.availablePoints,
    farmUpgrades: state?.farmUpgrades,
    abilities: state?.abilities
  };
  if (!isValidAbilityProgressionState(abilityState) || !Number.isSafeInteger(state?.level) || state.level < 1) return false;
  const investedPoints = Object.values(state.abilities).reduce((total, investment) =>
    total + Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel, 0);
  return investedPoints + getFarmUpgradeInvestedCount(state.farmUpgrades) + state.availablePoints === state.level - 1;
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}
