import { SPECIES_ABILITY_DEFINITIONS } from "./ability-catalog.js";
import { isValidAbilityProgressionState } from "./ability-state.js";
import { isValidPlayerProgressionState } from "./player-progression.js";
import { FARM_UPGRADE_MAX_LEVELS, FARM_UPGRADE_NODES } from "./farm-upgrades.js";

// Progression rules are shared by simulation commands and UI queries.
// This module never imports presentation code or reads the DOM.
export const SHARED_ABILITY_POINT_COST = 1;

const definitionById = new Map(SPECIES_ABILITY_DEFINITIONS.map(definition => [definition.id, definition]));

export function abilityStateFor(state, abilityId) {
  if (!definitionById.has(abilityId) || !state?.abilities?.[abilityId]) return null;
  return state.abilities[abilityId];
}

export function getAbilityPowerLevel(state, abilityId) {
  return abilityStateFor(state, abilityId)?.powerLevel || 0;
}

export function getAbilityGradeLevel(state, abilityId) {
  return abilityStateFor(state, abilityId)?.gradeLevel || 0;
}

export function getMinimumApplicableTier(state, abilityId) {
  const definition = definitionById.get(abilityId);
  if (!definition) return null;
  const gradeLevel = getAbilityGradeLevel(state, abilityId);
  return definition.gradeThresholds[Math.min(gradeLevel, definition.gradeThresholds.length - 1)];
}

export function isAbilityActive(state, abilityId, unitTier) {
  const investment = abilityStateFor(state, abilityId);
  const minimumTier = getMinimumApplicableTier(state, abilityId);
  return !!investment?.rootUnlocked && Number.isInteger(unitTier) && unitTier >= minimumTier;
}

export function powerLevelFor(state, abilityId) {
  return getAbilityPowerLevel(state, abilityId);
}

export function getAbilityEffects(state, abilityId, unitTier) {
  const definition = definitionById.get(abilityId);
  if (!definition || !isAbilityActive(state, abilityId, unitTier)) return null;
  const level = getAbilityPowerLevel(state, abilityId);
  return { abilityId, species: definition.species, unitTier, powerLevel: level, value: definition.powerValues[level] };
}

export function getInvestedPointCount(state) {
  if (!isValidAbilityProgressionState(state)) return 0;
  return Object.values(state.abilities).reduce((total, investment) => total +
    Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel, 0);
}

export function canPurchaseAbilityNode(state, abilityId, nodeId, context = {}) {
  const definition = definitionById.get(abilityId);
  if (!definition) return { allowed: false, reason: "unknown-ability" };
  if (!isValidAbilityProgressionState(state)) return { allowed: false, reason: "invalid-state" };
  const lockReason = progressionLockReason(context);
  if (lockReason) return { allowed: false, reason: lockReason };

  const investment = state.abilities[abilityId];
  const node = parseNodeId(nodeId);
  if (!node) return { allowed: false, reason: "unknown-node" };
  if (node.kind === "root") {
    if (investment.rootUnlocked) return { allowed: false, reason: "already-invested" };
    const highestTier = context.highestSpeciesTier?.[definition.species] ?? context.highestSpeciesTier ?? 0;
    if (!Number.isInteger(highestTier) || highestTier < definition.rootTier) return { allowed: false, reason: "requires-rare-tier" };
  } else {
    if (!investment.rootUnlocked) return { allowed: false, reason: "root-required" };
    const currentLevel = node.kind === "power" ? investment.powerLevel : investment.gradeLevel;
    const maxLevel = node.kind === "power" ? definition.powerValues.length - 1 : definition.gradeThresholds.length - 1;
    if (node.level <= currentLevel) return { allowed: false, reason: "already-invested" };
    if (node.level !== currentLevel + 1) return { allowed: false, reason: "prerequisite-required" };
    if (node.level > maxLevel) return { allowed: false, reason: "max-level" };
  }
  if (state.availablePoints < SHARED_ABILITY_POINT_COST) return { allowed: false, reason: "insufficient-points" };
  return { allowed: true, reason: null };
}

export function purchaseAbilityNode(state, abilityId, nodeId, context = {}) {
  const check = canPurchaseAbilityNode(state, abilityId, nodeId, context);
  if (!check.allowed) return { ok: false, reason: check.reason, state };
  const node = parseNodeId(nodeId);
  const next = cloneState(state);
  next.availablePoints -= SHARED_ABILITY_POINT_COST;
  if (node.kind === "root") next.abilities[abilityId].rootUnlocked = true;
  else if (node.kind === "power") next.abilities[abilityId].powerLevel = node.level;
  else next.abilities[abilityId].gradeLevel = node.level;
  return { ok: true, reason: null, state: next };
}

export function canResetAbilityProgression(state, context = {}) {
  if (!isValidAbilityProgressionState(state)) return { allowed: false, reason: "invalid-state" };
  const lockReason = progressionLockReason(context);
  if (lockReason) return { allowed: false, reason: lockReason };
  if (getInvestedPointCount(state) === 0) return { allowed: false, reason: "nothing-invested" };
  return { allowed: true, reason: null };
}

export function resetAbilityProgression(state, context = {}) {
  const check = canResetAbilityProgression(state, context);
  if (!check.allowed) return { ok: false, reason: check.reason, state };
  const refunded = getInvestedPointCount(state);
  const next = cloneState(state);
  next.availablePoints += refunded;
  next.abilities = Object.fromEntries(SPECIES_ABILITY_DEFINITIONS.map(definition => [definition.id, {
    rootUnlocked: false,
    powerLevel: 0,
    gradeLevel: 0
  }]));
  return { ok: true, reason: null, refunded, state: next };
}

export function canPurchaseFarmUpgrade(state, nodeId, context = {}) {
  const node = FARM_UPGRADE_NODES.find(candidate => candidate.id === nodeId);
  if (!node) return { allowed: false, reason: "unknown-node" };
  if (!isValidPlayerProgressionState(state)) return { allowed: false, reason: "invalid-state" };
  const lockReason = progressionLockReason(context);
  if (lockReason) return { allowed: false, reason: lockReason };
  if (state.farmUpgrades[nodeId] >= FARM_UPGRADE_MAX_LEVELS[nodeId]) return { allowed: false, reason: "max-level" };
  if (state.availablePoints < SHARED_ABILITY_POINT_COST) return { allowed: false, reason: "insufficient-points" };
  return { allowed: true, reason: null };
}

export function purchaseFarmUpgrade(state, nodeId, context = {}) {
  const check = canPurchaseFarmUpgrade(state, nodeId, context);
  if (!check.allowed) return { ok: false, reason: check.reason, state };
  const next = cloneState(state);
  next.availablePoints -= SHARED_ABILITY_POINT_COST;
  next.farmUpgrades[nodeId] += 1;
  return { ok: true, reason: null, state: next };
}

export function getAbilityNodeStatus(state, definition, nodeId, context = {}) {
  const node = parseNodeId(nodeId);
  if (!node) return { purchased: false, ready: false, reason: "unknown-node" };
  const investment = state?.abilities?.[definition.id] || { rootUnlocked: false, powerLevel: 0, gradeLevel: 0 };
  if (node.kind === "root" && investment.rootUnlocked) return { purchased: true, ready: false, reason: "already-invested" };
  if (node.kind === "power" && node.level <= investment.powerLevel) return { purchased: true, ready: false, reason: "already-invested" };
  if (node.kind === "grade" && node.level <= investment.gradeLevel) return { purchased: true, ready: false, reason: "already-invested" };
  const result = canPurchaseAbilityNode(state, definition.id, nodeId, context);
  return { purchased: false, ready: result.allowed, reason: result.reason };
}

function parseNodeId(nodeId) {
  if (nodeId === "root") return { kind: "root", level: 0 };
  const match = /^(power|grade)-(\d+)$/.exec(String(nodeId || ""));
  if (!match) return null;
  return { kind: match[1], level: Number(match[2]) };
}

function cloneState(state) {
  return {
    ...state,
    farmUpgrades: { ...state.farmUpgrades },
    abilities: Object.fromEntries(Object.entries(state.abilities).map(([id, value]) => [id, { ...value }]))
  };
}

function progressionLockReason(context) {
  if (context.location !== "farm" || context.inCombat === true) return context.inCombat ? "combat-lock" : "farm-only";
  return null;
}
