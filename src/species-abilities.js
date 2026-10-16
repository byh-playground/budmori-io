import { isAbilityActive, powerLevelFor } from "./ability-tree.js";
import { SPECIES_ABILITY_DEFINITIONS } from "./ability-catalog.js";
import { abilityProfile } from "./unit-abilities.js";

// These are game-specific contracts, separate from the generic tree/wallet.
// Values below follow docs/unit-stats.md and the confirmed follow-up decisions.
const definitionById = new Map(SPECIES_ABILITY_DEFINITIONS.map(definition => [definition.id, definition]));

export const MAX_BEAN_SPLIT_CHILDREN = Math.max(
  ...definitionById.get("pea-death-split").powerValues
);

function definitionFor(abilityId) {
  return definitionById.get(abilityId) || null;
}

export function getBeanSplitCount(progression, tier = 3) {
  const definition = definitionFor("pea-death-split");
  if (!isAbilityActive(progression, definition.id, tier)) return 0;
  const level = powerLevelFor(progression, definition.id);
  return definition.powerValues[level] || definition.powerValues[0];
}

export function getCornBurstConfig(progression, tier) {
  const definition = definitionFor("corn-burst-fire");
  if (!isAbilityActive(progression, definition.id, tier)) return null;
  const level = powerLevelFor(progression, definition.id);
  return {
    species: 1,
    attackKind: "lob",
    projectileCount: definition.powerValues[level],
    perProjectileAttackMultiplier: abilityProfile(definition.species).skillMultiplier * definition.projectileAttackShare,
    skillMultiplierShare: definition.projectileAttackShare,
    oneBasicAttackCycle: true,
    timeSpaced: true
  };
}

export function createCornBurstShotSchedule(config, { activeSeconds, recoverySeconds } = {}) {
  if (!config || !Number.isFinite(activeSeconds) || activeSeconds < 0 || !Number.isFinite(recoverySeconds) || recoverySeconds < 0) return [];
  const windowSeconds = activeSeconds + recoverySeconds;
  if (!(windowSeconds > 0) || !Number.isSafeInteger(config.projectileCount) || config.projectileCount < 1) return [];
  return Array.from({ length: config.projectileCount }, (_, index) => ({
    shotIndex: index,
    delaySeconds: index * windowSeconds / config.projectileCount,
    attackMultiplier: config.perProjectileAttackMultiplier
  }));
}

export function getPopcornExplosionConfig(progression, tier) {
  const definition = definitionFor("corn-popcorn-chain");
  if (!isAbilityActive(progression, definition.id, tier)) return null;
  const level = powerLevelFor(progression, definition.id);
  const radiusMultiplier = definition.radiusMultipliers[level];
  return {
    species: definition.species,
    fuseSeconds: definition.fuseSeconds,
    chainOnPopcornContact: true,
    triggersOncePerProjectile: true,
    eachTargetAtMostOncePerProjectile: true,
    damageMultiplier: definition.powerValues[level],
    radiusBaseRangeFraction: definition.baseRangeFraction,
    radiusMultiplier,
    radius: abilityProfile(definition.species).range * definition.baseRangeFraction * radiusMultiplier
  };
}

export function getChestnutSpikeConfig(progression, tier) {
  const definition = definitionFor("chestnut-spike-fan");
  if (!isAbilityActive(progression, definition.id, tier)) return null;
  const level = powerLevelFor(progression, definition.id);
  return {
    species: definition.species,
    targetPattern: "fan-toward-target",
    projectileCount: definition.powerValues[level],
    projectileAttackMultiplier: definition.projectileAttackMultiplier,
    fanSpreadRadians: definition.fanSpreadRadians,
    intervalBasicCycles: definition.intervalBasicCycles
  };
}

export function getChestnutSpikeIntervalSeconds(config, basicAttackCycleSeconds) {
  if (!config || !Number.isFinite(basicAttackCycleSeconds) || basicAttackCycleSeconds <= 0) return null;
  return config.intervalBasicCycles * basicAttackCycleSeconds;
}

export function getChestnutSpikeFanAngles(config, targetAngle) {
  if (!config || !Number.isSafeInteger(config.projectileCount) || config.projectileCount < 1 || !Number.isFinite(config.fanSpreadRadians) || config.fanSpreadRadians < 0 || !Number.isFinite(targetAngle)) return [];
  if (config.projectileCount === 1) return [targetAngle];
  const start = targetAngle - config.fanSpreadRadians / 2;
  const step = config.fanSpreadRadians / (config.projectileCount - 1);
  return Array.from({ length: config.projectileCount }, (_, index) => start + step * index);
}

export function createPopcornExplosionState(projectileId) {
  return { projectileId, exploded: false, damagedTargetIds: [] };
}

export function triggerPopcornExplosion(config, state, cause) {
  if (!config || !config.triggersOncePerProjectile || !isPopcornExplosionState(state) || state.exploded || !["impact", "popcorn-contact"].includes(cause)) {
    return { triggered: false, state };
  }
  return { triggered: true, state: { ...state, exploded: true, cause } };
}

export function canDamageTargetFromPopcornExplosion(state, targetId) {
  return isPopcornExplosionState(state) && state.exploded && targetId !== undefined && targetId !== null && !state.damagedTargetIds.includes(targetId);
}

export function markPopcornTargetDamaged(state, targetId) {
  if (!canDamageTargetFromPopcornExplosion(state, targetId)) return state;
  return { ...state, damagedTargetIds: [...state.damagedTargetIds, targetId] };
}

function isPopcornExplosionState(state) {
  return !!state && typeof state === "object" && Array.isArray(state.damagedTargetIds);
}

// Called by the deterministic battle simulation on a real unit's death. It
// returns spawn descriptors only; the caller still owns IDs, placement, HP,
// parent sleep, combat membership, and battle-end cleanup.
export function createBeanSplitDescriptors({ unit, progression, inBattle = false } = {}) {
  if (!inBattle || !unit || unit.species !== 0 || !Number.isFinite(unit.hp) || unit.hp > 0 || unit.isBattleOnlySummon || unit.battleOnlySummon || unit.canSplit === false || unit.splitUsedThisBattle === true) return [];
  const count = getBeanSplitCount(progression, unit.tier);
  if (!count) return [];
  return Array.from({ length: count }, () => ({
    species: unit.species,
    tier: 1,
    isBattleOnlySummon: true,
    battleSummonKind: "pea-death-split",
    battleSummonParentId: unit.id,
    ownerId: unit.ownerId || "",
    farmId: unit.farmId || 0,
    countsTowardPermanentRoster: false,
    eligibleForRaidDeployment: false,
    breedingEligible: false,
    mergeEligible: false,
    canSplit: false,
    splitUsedThisBattle: true,
    usesPersistentSleep: false,
    lifetime: "until-death-or-battle-end"
  }));
}

export function getContinuousLeapConfig(progression, tier) {
  const definition = definitionFor("kidney-continuous-leap");
  if (!isAbilityActive(progression, definition.id, tier)) return null;
  const level = powerLevelFor(progression, definition.id);
  return {
    cooldownResetChance: definition.powerValues[level],
    resetCooldownOnSuccessfulRoll: true,
    usesExistingAttackReadiness: true,
    leapAtCloseRangeWhenReady: true,
    avoidsGroundSweepWhileAirborne: true
  };
}

export function shouldResetLeapCooldown(config, roll) {
  return !!config && Number.isFinite(roll) && roll >= 0 && roll < config.cooldownResetChance;
}

export function getLandingShockwaveConfig(progression, tier) {
  const definition = definitionFor("kidney-landing-shockwave");
  if (!isAbilityActive(progression, definition.id, tier)) return null;
  const level = powerLevelFor(progression, definition.id);
  const multiplier = definition.powerValues[level];
  return {
    damageMultiplier: multiplier,
    radiusMultiplier: multiplier,
    triggersOncePerLanding: true,
    // Repeated shockwaves happen only when the separate continuous-leap tree
    // causes another leap to occur; this module invents no timing or loop.
    repeatedAfterCooldownReset: isAbilityActive(progression, "kidney-continuous-leap", tier)
  };
}

export function resolveKidneyLandingEffects(progression, tier, roll) {
  const leap = getContinuousLeapConfig(progression, tier);
  const shockwave = getLandingShockwaveConfig(progression, tier);
  return {
    resetCooldown: shouldResetLeapCooldown(leap, roll),
    shockwave,
    repeatableShockwave: !!leap && !!shockwave
  };
}

// Useful when callers need to enumerate only abilities owned by the requested
// species without duplicating the catalog's species mapping.
export function abilitiesForSpecies(species) {
  return SPECIES_ABILITY_DEFINITIONS.filter(definition => definition.species === species);
}

