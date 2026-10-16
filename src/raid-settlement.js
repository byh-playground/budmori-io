/**
 * Owner-local settlement of a shared Raid into one personal Farm.
 *
 * This module deliberately knows nothing about the lockstep Raid world or
 * storage APIs. The caller must pass exactly one owner's private Farm snapshot
 * and an owner-scoped reward callback. Persist the returned Farm as one unit;
 * that makes the settlement receipt, sleeping units, and rewards atomic.
 */

import {isValidUnitTier} from './unit-grades.js';

export const RAID_SLEEP_SECONDS = 60;
export const RAID_SETTLEMENT_RECEIPT_LIMIT = 128;

const fail = (message) => { throw new TypeError(message); };
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;

function ledgerState(farm) {
  const nextSequence = farm.nextRaidRunSequence ?? 0;
  const watermark = farm.raidSettlementWatermark ?? 0;
  const activeSequence = farm.activeRaidRunSequence ?? null;
  const activeSessionId = farm.activeRaidSessionId ?? null;
  const receipts = farm.raidSettlementReceipts ?? [];
  if (!isCount(nextSequence) || !isCount(watermark) || watermark > nextSequence ||
      activeSequence !== null && (!Number.isSafeInteger(activeSequence) || activeSequence < 1) ||
      activeSessionId !== null && !isNonEmptyString(activeSessionId) ||
      !Array.isArray(receipts) || (activeSequence === null) !== (activeSessionId === null)) {
    fail('Private Farm Raid settlement ledger is invalid');
  }
  if (activeSequence === null && nextSequence !== watermark ||
      activeSequence !== null && (activeSequence !== nextSequence || activeSequence !== watermark + 1)) {
    fail('Private Farm Raid run sequence is inconsistent');
  }
  return { nextSequence, watermark, activeSequence, activeSessionId, receipts };
}

function ownerRoster(raidWorld, ownerId) {
  if (!raidWorld || typeof raidWorld !== 'object' || !Array.isArray(raidWorld.raidRosters) ||
      !Array.isArray(raidWorld.units) || !isNonEmptyString(ownerId)) {
    fail('A Raid world, roster array, unit array, and owner ID are required');
  }
  const ownerRosters = raidWorld.raidRosters.filter(roster => roster?.ownerId === ownerId);
  if (ownerRosters.length !== 1 || !Array.isArray(ownerRosters[0].troops)) {
    fail('The Raid must contain exactly one roster for this owner');
  }
  return ownerRosters[0];
}

/**
 * An unambiguous, owner-scoped idempotency key that survives reconnects and
 * retries as long as the caller supplies the same stable session and encounter
 * identifiers. JSON tuple encoding avoids delimiter collisions in user ids.
 */
export function raidSettlementKey({ ownerId, sessionId, encounterId } = {}) {
  if (!isNonEmptyString(ownerId) || !isNonEmptyString(sessionId) ||
      !(isNonEmptyString(encounterId) || Number.isSafeInteger(encounterId) && encounterId > 0)) {
    fail('A Raid owner, stable session ID, and encounter ID are required');
  }
  return `raid:${JSON.stringify([ownerId, sessionId, encounterId])}`;
}

function isBattleOnlySummon(unit) {
  // Farm normalization intentionally writes empty/zero defaults on permanent
  // units. Only treat non-default marker values as a summon candidate; partial
  // non-default markers are still rejected by the strict pea-split validator.
  return unit?.isBattleOnlySummon === true ||
    unit?.battleSummonKind !== undefined && unit.battleSummonKind !== '' ||
    unit?.battleSummonParentId !== undefined && unit.battleSummonParentId !== 0;
}

/**
 * Read one owner's casualty/deployment result. Farm IDs may overlap across
 * peers, so every original shared unit must match that owner's unique roster
 * entry. Explicit pea split summons are validated against their dead parent and
 * then excluded from original Farm casualty/deployment counts.
 */
function raidOwnerManifest(raidWorld, ownerId) {
  const roster = ownerRoster(raidWorld, ownerId);
  const manifest = new Map();
  for (const troop of roster.troops) {
    if (!troop || !Number.isSafeInteger(troop.farmId) || troop.farmId < 1 ||
        !Number.isInteger(troop.species) || troop.species < 0 || troop.species > 3 ||
        !isValidUnitTier(troop.tier) ||
        typeof troop.deployed !== 'boolean' || manifest.has(troop.farmId)) {
      fail('The owner Raid roster must have unique Farm IDs and valid deployed entries');
    }
    manifest.set(troop.farmId, troop);
  }

  const ownerUnits = raidWorld.units.filter(unit => unit?.ownerId === ownerId);
  const ownerUnitsById = new Map();
  for (const unit of ownerUnits) {
    if (!Number.isSafeInteger(unit.id) || unit.id < 1 || ownerUnitsById.has(unit.id) ||
        !Number.isFinite(unit.hp) || unit.hp < 0) {
      fail('The owner Raid units must have unique IDs and valid health');
    }
    ownerUnitsById.set(unit.id, unit);
  }

  const originalUnitsByFarmId = new Map();
  const deadFarmUnitIds = [];
  for (const unit of ownerUnits) {
    if (isBattleOnlySummon(unit)) {
      const parent = ownerUnitsById.get(unit.battleSummonParentId);
      const parentTroop = parent && manifest.get(parent.farmId);
      const validSplit = unit.isBattleOnlySummon === true &&
        unit.battleSummonKind === 'pea-death-split' &&
        Number.isSafeInteger(unit.battleSummonParentId) && unit.battleSummonParentId > 0 &&
        parent && parent.ownerId === ownerId && !isBattleOnlySummon(parent) && parent.hp <= 0 &&
        parentTroop?.deployed === true && parent.farmId === unit.farmId &&
        parent.species === 0 && unit.species === 0 && unit.tier === 1 &&
        unit.canSplit === false && unit.countsTowardPermanentRoster === false &&
        unit.eligibleForRaidDeployment === false && unit.breedingEligible === false &&
        unit.mergeEligible === false && unit.usesPersistentSleep === false;
      if (!validSplit) fail('A battle-only Raid split is missing its validated origin marker');
      continue;
    }
    const troop = manifest.get(unit.farmId);
    if (!troop || !troop.deployed || troop.species !== unit.species || troop.tier !== unit.tier ||
        originalUnitsByFarmId.has(unit.farmId)) {
      fail('A Raid unit does not match this owner’s deployed roster');
    }
    originalUnitsByFarmId.set(unit.farmId, unit);
    if (unit.hp <= 0) deadFarmUnitIds.push(unit.farmId);
  }

  for (const [farmId, troop] of manifest) {
    if (troop.deployed && !originalUnitsByFarmId.has(farmId)) {
      fail('A deployed original Farm unit is missing from this owner’s Raid world');
    }
  }
  return {
    roster,
    manifest,
    deadFarmUnitIds: deadFarmUnitIds.sort((a, b) => a - b),
    availableAtStart: roster.troops.length,
    originalUnitsDeployed: roster.troops.filter(troop => troop.deployed).length
  };
}

export function raidDeadFarmUnitIds(raidWorld, ownerId) {
  return raidOwnerManifest(raidWorld, ownerId).deadFarmUnitIds;
}

/**
 * Provisional deployment-bonus rule for Raid-only boss acquisition.
 *
 * The denominator is the owner's eligible roster captured at fight start, not
 * the live Raid count. The numerator counts unique original roster entries
 * ever deployed during the encounter; deaths do not unmark them, and summons
 * are not in that roster.
 * This is an implementation proposal pending confirmation of the exact game
 * formula; Farm-event bonuses must use the common reward settings instead.
 * Return 0 when nobody was deployed so an empty raid cannot earn loot.
 */
export function raidDeploymentRewardMultiplier({ availableAtStart, originalUnitsDeployed } = {}) {
  if (!isCount(availableAtStart) || !isCount(originalUnitsDeployed) || originalUnitsDeployed > availableAtStart) {
    fail('Raid deployment counts must be non-negative integers and original deployed cannot exceed the starting roster');
  }
  if (availableAtStart === 0 || originalUnitsDeployed === 0) return 0;
  return Math.min(2, Math.max(1, 1 + (availableAtStart - originalUnitsDeployed) / availableAtStart));
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function validateReturnedPrivateFarm(sourceFarm, resultFarm, sleptFarmUnitIds) {
  if (sourceFarm.ownerId !== undefined && resultFarm.ownerId !== sourceFarm.ownerId) {
    fail('The Raid victory resolver returned a different owner Farm');
  }
  const originalUnits = new Map(sourceFarm.units.map(unit => [unit.id, unit]));
  const resultUnits = new Map();
  for (const unit of resultFarm.units) {
    if (!unit || !Number.isSafeInteger(unit.id) || unit.id < 1 || resultUnits.has(unit.id)) {
      fail('The Raid victory resolver returned invalid or duplicate private Farm units');
    }
    resultUnits.set(unit.id, unit);
  }
  for (const [unitId, original] of originalUnits) {
    const result = resultUnits.get(unitId);
    if (!result || result.species !== original.species || result.tier !== original.tier) {
      fail('The Raid victory resolver did not preserve the owner’s Farm roster');
    }
  }
  for (const unitId of sleptFarmUnitIds) {
    const unit = resultUnits.get(unitId);
    if (!unit || unit.hp !== 0 || unit.down !== RAID_SLEEP_SECONDS) {
      fail('The Raid victory resolver must preserve the owner Farm’s casualty sleep');
    }
  }
}

/**
 * Reserve one serialized Raid run on a private Farm before session creation.
 * Persist this candidate with the FarmStorage compare-before-write guard. A
 * reconnect reuses the active sequence/session; another new run is rejected
 * until the active one has settled.
 */
export function reserveRaidRun(farm, { sessionId = null } = {}) {
  if (!farm || typeof farm !== 'object' || Array.isArray(farm) || !Array.isArray(farm.units)) {
    fail('A private Farm snapshot with a units array is required');
  }
  const ledger = ledgerState(farm);
  if (ledger.activeSequence !== null) {
    if (sessionId !== null && sessionId !== ledger.activeSessionId) {
      fail('This Farm already has a different active Raid; reconnect to it or settle it first');
    }
    return { farm, runSequence: ledger.activeSequence, sessionId: ledger.activeSessionId, resumed: true };
  }
  if (sessionId !== null && !isNonEmptyString(sessionId)) fail('Raid session ID must be a non-empty string');
  const runSequence = ledger.nextSequence + 1;
  const stableSessionId = sessionId ?? `farm-raid-${runSequence}`;
  const nextFarm = clone(farm);
  nextFarm.nextRaidRunSequence = runSequence;
  nextFarm.activeRaidRunSequence = runSequence;
  nextFarm.activeRaidSessionId = stableSessionId;
  nextFarm.raidSettlementWatermark = ledger.watermark;
  nextFarm.raidSettlementReceipts = [...ledger.receipts];
  return { farm: nextFarm, runSequence, sessionId: stableSessionId, resumed: false };
}

/**
 * Close a previously reserved run when its Raid runtime no longer exists.
 * This is only called from the explicit "end previous Raid" action; it never
 * applies casualties, rewards, XP, or points. A dedicated owner sentinel keeps
 * the receipt distinct from any live owner's normal settlement key.
 */
export function abortReservedRaidRun(farm, { completedAtMs = null } = {}) {
  if (!farm || typeof farm !== 'object' || Array.isArray(farm) || !Array.isArray(farm.units)) {
    fail('A private Farm snapshot with a units array is required');
  }
  if (completedAtMs !== null && (!Number.isFinite(completedAtMs) || completedAtMs < 0)) {
    fail('Settlement timestamp must be a non-negative finite number');
  }
  const ledger = ledgerState(farm);
  if (ledger.activeSequence === null) return { farm, receipt: null, applied: false };

  const ownerId = 'recovery-abort';
  const { activeSequence: runSequence, activeSessionId: sessionId } = ledger;
  const receipt = {
    key: raidSettlementKey({ ownerId, sessionId, encounterId: runSequence }),
    ownerId,
    sessionId,
    encounterId: runSequence,
    runSequence,
    outcome: 'aborted',
    status: 'settled',
    completedAtMs,
    sleptFarmUnitIds: [],
    availableAtStart: 0,
    originalUnitsDeployed: 0,
    deploymentMultiplier: 0,
    reward: null
  };
  const nextFarm = clone(farm);
  nextFarm.activeRaidRunSequence = null;
  nextFarm.activeRaidSessionId = null;
  nextFarm.raidSettlementWatermark = runSequence;
  nextFarm.raidSettlementReceipts = [...ledger.receipts, receipt].slice(-RAID_SETTLEMENT_RECEIPT_LIMIT);
  return { farm: nextFarm, receipt: clone(receipt), applied: true };
}

/**
 * Apply one completed Raid outcome to one owner's private Farm snapshot.
 *
 * Casualties and deployment counts are derived from the requested owner's
 * verified Raid roster, not from another peer's Farm IDs or from shared unit
 * counts. `settleVictory` receives a plain Farm snapshot and must return
 * `{farm: plainFarmSnapshot, summary}`. To use class-based common resolvers, the
 * callback hydrates with `restore()`, settles, then returns `snapshot(garden)`.
 * The callback is required for reward-capable victories and is never called on
 * a loss or abort.
 *
 * Returns { farm, receipt, applied }. The receipt is stored inside that Farm,
 * so a duplicate return after reload or rollback cannot reapply deaths/rewards.
 */
export function settleRaidOwnerFarm(farm, {
  ownerId,
  sessionId,
  encounterId,
  runSequence,
  outcome,
  raidWorld,
  completedAtMs,
  settleVictory = null
} = {}) {
  if (!farm || typeof farm !== 'object' || Array.isArray(farm) || !Array.isArray(farm.units)) {
    fail('A private Farm snapshot with a units array is required');
  }
  const key = raidSettlementKey({ ownerId, sessionId, encounterId });
  if (!['victory', 'defeat', 'aborted'].includes(outcome)) fail('Raid outcome must be victory, defeat, or aborted');
  if (!Number.isSafeInteger(runSequence) || runSequence < 1) fail('A positive Farm-local Raid run sequence is required');
  if (settleVictory !== null && typeof settleVictory !== 'function') fail('settleVictory must be a function');
  if (completedAtMs !== undefined && (!Number.isFinite(completedAtMs) || completedAtMs < 0)) {
    fail('Settlement timestamp must be a non-negative finite number');
  }

  const ledger = ledgerState(farm);
  if (runSequence <= ledger.watermark) {
    const previous = ledger.receipts.find(receipt => receipt?.key === key);
    return {
      farm,
      receipt: clone(previous || {
        key, ownerId, sessionId, encounterId, runSequence, outcome: 'already-settled',
        status: 'compacted', sleptFarmUnitIds: [], availableAtStart: 0,
        originalUnitsDeployed: 0, deploymentMultiplier: 0, reward: null
      }),
      applied: false
    };
  }
  if (runSequence !== ledger.watermark + 1 || ledger.activeSequence !== runSequence ||
      ledger.activeSessionId !== sessionId) {
    fail('Raid settlement does not match the active Farm-local run');
  }

  const raidOwner = raidOwnerManifest(raidWorld, ownerId);
  const {manifest, deadFarmUnitIds, availableAtStart, originalUnitsDeployed} = raidOwner;

  const unitsByFarmId = new Map();
  for (const unit of farm.units) {
    if (!unit || !Number.isSafeInteger(unit.id) || unit.id < 1 || unitsByFarmId.has(unit.id)) {
      fail('Private Farm units must have unique positive IDs');
    }
    unitsByFarmId.set(unit.id, unit);
  }
  for (const [farmUnitId, troop] of manifest) {
    const farmUnit = unitsByFarmId.get(farmUnitId);
    if (!farmUnit || farmUnit.species !== troop.species || farmUnit.tier !== troop.tier) {
      fail('The Raid roster no longer matches this owner’s private Farm units');
    }
  }
  for (const farmUnitId of deadFarmUnitIds) {
    if (!unitsByFarmId.has(farmUnitId)) fail('A dead Raid unit does not belong to this owner Farm');
  }

  let privateFarm = clone(farm);
  privateFarm.raidSettlementReceipts = Array.isArray(privateFarm.raidSettlementReceipts)
    ? privateFarm.raidSettlementReceipts
    : [];
  const deadSet = new Set(deadFarmUnitIds);
  for (const unit of privateFarm.units) {
    if (!deadSet.has(unit.id)) continue;
    // Farm's existing recovery clock uses hp=0 + down=60 as retained sleep.
    // Units stay in the owner's roster and become unavailable until it elapses.
    unit.hp = 0;
    unit.down = RAID_SLEEP_SECONDS;
  }

  let rewardSummary = null;
  let deploymentMultiplier = 0;
  if (outcome === 'victory') {
    // The registered roster is the encounter-start denominator. Its deployed
    // flags count unique original troops used at any time, including casualties;
    // summoned Raid units are not entries and cannot affect this ratio.
    deploymentMultiplier = raidDeploymentRewardMultiplier({ availableAtStart, originalUnitsDeployed });
    if (deploymentMultiplier > 0) {
      if (settleVictory === null) fail('A reward-capable Raid victory needs the common reward/progression resolver');
      const resolution = settleVictory({
        farm: privateFarm,
        ownerId,
        sessionId,
        encounterId,
        receiptKey: key,
        source: 'raid',
        deploymentMultiplier
      });
      if (!resolution || !resolution.farm || typeof resolution.farm !== 'object' ||
          Array.isArray(resolution.farm) || !Array.isArray(resolution.farm.units)) {
        fail('The Raid victory resolver must return a private Farm snapshot and summary');
      }
      validateReturnedPrivateFarm(farm, resolution.farm, deadFarmUnitIds);
      privateFarm = clone(resolution.farm);
      rewardSummary = resolution.summary ?? null;
    }
  }

  const receipt = {
    key,
    ownerId,
    sessionId,
    encounterId,
    runSequence,
    outcome,
    status: 'settled',
    completedAtMs: completedAtMs ?? null,
    sleptFarmUnitIds: [...deadFarmUnitIds].sort((a, b) => a - b),
    availableAtStart,
    originalUnitsDeployed,
    deploymentMultiplier,
    reward: rewardSummary === null ? null : clone(rewardSummary)
  };
  // The resolver cannot erase or rewrite the bounded idempotency ledger.
  privateFarm.nextRaidRunSequence = ledger.nextSequence;
  privateFarm.activeRaidRunSequence = null;
  privateFarm.activeRaidSessionId = null;
  privateFarm.raidSettlementWatermark = runSequence;
  privateFarm.raidSettlementReceipts = [...ledger.receipts, receipt].slice(-RAID_SETTLEMENT_RECEIPT_LIMIT);
  return { farm: privateFarm, receipt: clone(receipt), applied: true };
}
