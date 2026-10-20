/**
 * Owner-local settlement of a shared Raid into one personal Farm.
 *
 * This module deliberately knows nothing about the lockstep Raid world or
 * storage APIs. The caller must pass exactly one owner's private Farm snapshot
 * and an owner-scoped reward callback. Persist the returned Farm as one unit;
 * that makes the settlement receipt, sleeping units, and rewards atomic.
 */

import { isValidUnitTier } from './unit-grades.js';
import { FACTION_CONFIG, hasFaction } from './factions.js';
import { SPECIES_COUNT } from './species-catalog.js';
import { advanceFarmBossEncounterEpoch } from './farm-boss-stages.js';
import { BOSS_REWARD_SETTINGS } from './boss-rewards.js';
import { finishChallenge, tileDanger } from './world-map.js';
export const RAID_SLEEP_SECONDS = 60;
export const RAID_SETTLEMENT_RECEIPT_LIMIT = 128;
const FAIL = (message) => {
    throw new TypeError(message);
};
const IS_NON_EMPTY_STRING = (value) => typeof value === 'string' && value.trim().length > 0;
const IS_COUNT = (value) => Number.isSafeInteger(value) && value >= 0;
function ledgerState(farm) {
    const NEXT_SEQUENCE = farm.nextRaidRunSequence ?? 0;
    const WATERMARK = farm.raidSettlementWatermark ?? 0;
    const ACTIVE_SEQUENCE = farm.activeRaidRunSequence ?? null;
    const ACTIVE_SESSION_ID = farm.activeRaidSessionId ?? null;
    const RECEIPTS = farm.raidSettlementReceipts ?? [];
    if (
        !IS_COUNT(NEXT_SEQUENCE) ||
        !IS_COUNT(WATERMARK) ||
        WATERMARK > NEXT_SEQUENCE ||
        (ACTIVE_SEQUENCE !== null && (!Number.isSafeInteger(ACTIVE_SEQUENCE) || ACTIVE_SEQUENCE < 1)) ||
        (ACTIVE_SESSION_ID !== null && !IS_NON_EMPTY_STRING(ACTIVE_SESSION_ID)) ||
        !Array.isArray(RECEIPTS) ||
        (ACTIVE_SEQUENCE === null) !== (ACTIVE_SESSION_ID === null)
    ) {
        FAIL('Private Farm Raid settlement ledger is invalid');
    }
    if (
        (ACTIVE_SEQUENCE === null && NEXT_SEQUENCE !== WATERMARK) ||
        (ACTIVE_SEQUENCE !== null && (ACTIVE_SEQUENCE !== NEXT_SEQUENCE || ACTIVE_SEQUENCE !== WATERMARK + 1))
    ) {
        FAIL('Private Farm Raid run sequence is inconsistent');
    }
    return {
        nextSequence: NEXT_SEQUENCE,
        watermark: WATERMARK,
        activeSequence: ACTIVE_SEQUENCE,
        activeSessionId: ACTIVE_SESSION_ID,
        receipts: RECEIPTS,
    };
}
function ownerRoster(raidWorld, ownerId) {
    if (
        !raidWorld ||
        typeof raidWorld !== 'object' ||
        !Array.isArray(raidWorld.raidRosters) ||
        !Array.isArray(raidWorld.units) ||
        !IS_NON_EMPTY_STRING(ownerId)
    ) {
        FAIL('A Raid world, roster array, unit array, and owner ID are required');
    }
    const OWNER_ROSTERS = raidWorld.raidRosters.filter((roster) => roster?.ownerId === ownerId);
    if (OWNER_ROSTERS.length !== 1 || !Array.isArray(OWNER_ROSTERS[0].troops)) {
        FAIL('The Raid must contain exactly one roster for this owner');
    }
    return OWNER_ROSTERS[0];
}

/**
 * An unambiguous, owner-scoped idempotency key that survives reconnects and
 * retries as long as the caller supplies the same stable session and encounter
 * identifiers. JSON tuple encoding avoids delimiter collisions in user ids.
 */
export function raidSettlementKey({ ownerId, sessionId, encounterId } = {}) {
    if (
        !IS_NON_EMPTY_STRING(ownerId) ||
        !IS_NON_EMPTY_STRING(sessionId) ||
        !(IS_NON_EMPTY_STRING(encounterId) || (Number.isSafeInteger(encounterId) && encounterId > 0))
    ) {
        FAIL('A Raid owner, stable session ID, and encounter ID are required');
    }
    return `raid:${JSON.stringify([ownerId, sessionId, encounterId])}`;
}
function isBattleOnlySummon(unit) {
    // Farm normalization intentionally writes empty/zero defaults on permanent
    // units. Only treat non-default marker values as a summon candidate; partial
    // non-default markers are still rejected by the strict Peanut split validator.
    return (
        unit?.isBattleOnlySummon === true ||
        (unit?.battleSummonKind !== undefined && unit.battleSummonKind !== '') ||
        (unit?.battleSummonParentId !== undefined && unit.battleSummonParentId !== 0)
    );
}

/**
 * Read one owner's casualty/deployment result. Farm IDs may overlap across
 * peers, so every original shared unit must match that owner's unique roster
 * entry. Explicit pea split summons are validated against their dead parent and
 * then excluded from original Farm casualty/deployment counts.
 */
function raidOwnerManifest(raidWorld, ownerId) {
    const ROSTER = ownerRoster(raidWorld, ownerId);
    const MANIFEST = new Map();
    for (const TROOP of ROSTER.troops) {
        if (
            !TROOP ||
            !Number.isSafeInteger(TROOP.farmId) ||
            TROOP.farmId < 1 ||
            !Number.isInteger(TROOP.species) ||
            TROOP.species < 0 ||
            TROOP.species >= SPECIES_COUNT ||
            !isValidUnitTier(TROOP.tier) ||
            typeof TROOP.deployed !== 'boolean' ||
            MANIFEST.has(TROOP.farmId)
        ) {
            FAIL('The owner Raid roster must have unique Farm IDs and valid deployed entries');
        }
        MANIFEST.set(TROOP.farmId, TROOP);
    }
    const OWNER_UNITS = raidWorld.units.filter((unit) => unit?.ownerId === ownerId);
    if (OWNER_UNITS.some((unit) => !hasFaction(unit, FACTION_CONFIG.PLAYER))) {
        FAIL('An enemy-faction actor cannot enter an owner’s Farm settlement');
    }
    const OWNER_UNITS_BY_ID = new Map();
    for (const UNIT of OWNER_UNITS) {
        if (
            !Number.isSafeInteger(UNIT.id) ||
            UNIT.id < 1 ||
            OWNER_UNITS_BY_ID.has(UNIT.id) ||
            !Number.isFinite(UNIT.hp) ||
            UNIT.hp < 0
        ) {
            FAIL('The owner Raid units must have unique IDs and valid health');
        }
        OWNER_UNITS_BY_ID.set(UNIT.id, UNIT);
    }
    const ORIGINAL_UNITS_BY_FARM_ID = new Map();
    const DEAD_FARM_UNIT_IDS = [];
    for (const UNIT of OWNER_UNITS) {
        if (isBattleOnlySummon(UNIT)) {
            const PARENT = OWNER_UNITS_BY_ID.get(UNIT.battleSummonParentId);
            const PARENT_TROOP = PARENT && MANIFEST.get(PARENT.farmId);
            const VALID_SPLIT =
                hasFaction(UNIT, FACTION_CONFIG.PLAYER) &&
                UNIT.isBattleOnlySummon === true &&
                UNIT.battleSummonKind === 'peanut-death-split' &&
                Number.isSafeInteger(UNIT.battleSummonParentId) &&
                UNIT.battleSummonParentId > 0 &&
                Number.isSafeInteger(UNIT.battleSummonParentGeneration) &&
                UNIT.battleSummonParentGeneration > 0 &&
                PARENT &&
                PARENT.ownerId === ownerId &&
                !isBattleOnlySummon(PARENT) &&
                PARENT.hp <= 0 &&
                PARENT_TROOP?.deployed === true &&
                PARENT.farmId === UNIT.farmId &&
                PARENT.generation === UNIT.battleSummonParentGeneration &&
                PARENT.species === 4 &&
                UNIT.species === 4 &&
                UNIT.tier === 1 &&
                UNIT.canSplit === false &&
                UNIT.countsTowardPermanentRoster === false &&
                UNIT.eligibleForRaidDeployment === false &&
                UNIT.breedingEligible === false &&
                UNIT.mergeEligible === false &&
                UNIT.usesPersistentSleep === false;
            if (!VALID_SPLIT) {
                FAIL('A battle-only Raid split is missing its validated origin marker');
            }
            continue;
        }
        const TROOP = MANIFEST.get(UNIT.farmId);
        if (
            !TROOP ||
            !TROOP.deployed ||
            TROOP.species !== UNIT.species ||
            TROOP.tier !== UNIT.tier ||
            ORIGINAL_UNITS_BY_FARM_ID.has(UNIT.farmId)
        ) {
            FAIL('A Raid unit does not match this owner’s deployed roster');
        }
        ORIGINAL_UNITS_BY_FARM_ID.set(UNIT.farmId, UNIT);
        if (UNIT.hp <= 0) {
            DEAD_FARM_UNIT_IDS.push(UNIT.farmId);
        }
    }
    for (const [FARM_ID, TROOP] of MANIFEST) {
        if (TROOP.deployed && !ORIGINAL_UNITS_BY_FARM_ID.has(FARM_ID)) {
            FAIL('A deployed original Farm unit is missing from this owner’s Raid world');
        }
    }
    return {
        roster: ROSTER,
        manifest: MANIFEST,
        deadFarmUnitIds: DEAD_FARM_UNIT_IDS.sort((a, b) => a - b),
        availableAtStart: ROSTER.troops.length,
        originalUnitsDeployed: ROSTER.troops.filter((troop) => troop.deployed).length,
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
    if (!IS_COUNT(availableAtStart) || !IS_COUNT(originalUnitsDeployed) || originalUnitsDeployed > availableAtStart) {
        FAIL(
            'Raid deployment counts must be non-negative integers and original deployed cannot exceed the starting roster',
        );
    }
    if (availableAtStart === 0 || originalUnitsDeployed === 0) {
        return 0;
    }
    return Math.min(2, Math.max(1, 1 + (availableAtStart - originalUnitsDeployed) / availableAtStart));
}
function clone(value) {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}
function validateReturnedPrivateFarm(sourceFarm, resultFarm, sleptFarmUnitIds) {
    if (sourceFarm.ownerId !== undefined && resultFarm.ownerId !== sourceFarm.ownerId) {
        FAIL('The Raid victory resolver returned a different owner Farm');
    }
    const ORIGINAL_UNITS = new Map(sourceFarm.units.map((unit) => [unit.id, unit]));
    const RESULT_UNITS = new Map();
    for (const UNIT of resultFarm.units) {
        if (!UNIT || !Number.isSafeInteger(UNIT.id) || UNIT.id < 1 || RESULT_UNITS.has(UNIT.id)) {
            FAIL('The Raid victory resolver returned invalid or duplicate private Farm units');
        }
        RESULT_UNITS.set(UNIT.id, UNIT);
    }
    for (const [UNIT_ID, ORIGINAL] of ORIGINAL_UNITS) {
        const RESULT = RESULT_UNITS.get(UNIT_ID);
        if (!RESULT || RESULT.species !== ORIGINAL.species || RESULT.tier !== ORIGINAL.tier) {
            FAIL('The Raid victory resolver did not preserve the owner’s Farm roster');
        }
    }
    for (const UNIT_ID of sleptFarmUnitIds) {
        const UNIT = RESULT_UNITS.get(UNIT_ID);
        if (!UNIT || UNIT.hp !== 0 || UNIT.down !== RAID_SLEEP_SECONDS) {
            FAIL('The Raid victory resolver must preserve the owner Farm’s casualty sleep');
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
        FAIL('A private Farm snapshot with a units array is required');
    }
    const LEDGER = ledgerState(farm);
    if (LEDGER.activeSequence !== null) {
        if (sessionId !== null && sessionId !== LEDGER.activeSessionId) {
            FAIL('This Farm already has a different active Raid; reconnect to it or settle it first');
        }
        return {
            farm,
            runSequence: LEDGER.activeSequence,
            sessionId: LEDGER.activeSessionId,
            resumed: true,
        };
    }
    if (sessionId !== null && !IS_NON_EMPTY_STRING(sessionId)) {
        FAIL('Raid session ID must be a non-empty string');
    }
    const RUN_SEQUENCE = LEDGER.nextSequence + 1;
    const STABLE_SESSION_ID = sessionId ?? `farm-raid-${RUN_SEQUENCE}`;
    const NEXT_FARM = clone(farm);
    NEXT_FARM.nextRaidRunSequence = RUN_SEQUENCE;
    NEXT_FARM.activeRaidRunSequence = RUN_SEQUENCE;
    NEXT_FARM.activeRaidSessionId = STABLE_SESSION_ID;
    NEXT_FARM.raidSettlementWatermark = LEDGER.watermark;
    NEXT_FARM.raidSettlementReceipts = [...LEDGER.receipts];
    return {
        farm: NEXT_FARM,
        runSequence: RUN_SEQUENCE,
        sessionId: STABLE_SESSION_ID,
        resumed: false,
    };
}

/**
 * Close a previously reserved run when its Raid runtime no longer exists.
 * This is only called from the explicit "end previous Raid" action; it never
 * applies casualties, rewards, XP, or points. A dedicated owner sentinel keeps
 * the receipt distinct from any live owner's normal settlement key.
 */
export function abortReservedRaidRun(farm, { completedAtMs = null } = {}) {
    if (!farm || typeof farm !== 'object' || Array.isArray(farm) || !Array.isArray(farm.units)) {
        FAIL('A private Farm snapshot with a units array is required');
    }
    if (completedAtMs !== null && (!Number.isFinite(completedAtMs) || completedAtMs < 0)) {
        FAIL('Settlement timestamp must be a non-negative finite number');
    }
    const LEDGER = ledgerState(farm);
    if (LEDGER.activeSequence === null) {
        return {
            farm,
            receipt: null,
            applied: false,
        };
    }
    const OWNER_ID = 'recovery-abort';
    const { activeSequence: RUN_SEQUENCE, activeSessionId: SESSION_ID } = LEDGER;
    const RECEIPT = {
        key: raidSettlementKey({
            ownerId: OWNER_ID,
            sessionId: SESSION_ID,
            encounterId: RUN_SEQUENCE,
        }),
        ownerId: OWNER_ID,
        sessionId: SESSION_ID,
        encounterId: RUN_SEQUENCE,
        runSequence: RUN_SEQUENCE,
        outcome: 'aborted',
        status: 'settled',
        completedAtMs,
        sleptFarmUnitIds: [],
        availableAtStart: 0,
        originalUnitsDeployed: 0,
        deploymentMultiplier: 0,
        reward: null,
    };
    const NEXT_FARM = clone(farm);
    NEXT_FARM.activeRaidRunSequence = null;
    NEXT_FARM.activeRaidSessionId = null;
    NEXT_FARM.raidSettlementWatermark = RUN_SEQUENCE;
    NEXT_FARM.raidSettlementReceipts = [...LEDGER.receipts, RECEIPT].slice(-RAID_SETTLEMENT_RECEIPT_LIMIT);
    return {
        farm: NEXT_FARM,
        receipt: clone(RECEIPT),
        applied: true,
    };
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
export function settleRaidOwnerFarm(
    farm,
    { ownerId, sessionId, encounterId, runSequence, outcome, raidWorld, completedAtMs, settleVictory = null } = {},
) {
    if (!farm || typeof farm !== 'object' || Array.isArray(farm) || !Array.isArray(farm.units)) {
        FAIL('A private Farm snapshot with a units array is required');
    }
    const KEY = raidSettlementKey({
        ownerId,
        sessionId,
        encounterId,
    });
    if (!['victory', 'defeat', 'aborted'].includes(outcome)) {
        FAIL('Raid outcome must be victory, defeat, or aborted');
    }
    if (!Number.isSafeInteger(runSequence) || runSequence < 1) {
        FAIL('A positive Farm-local Raid run sequence is required');
    }
    if (settleVictory !== null && typeof settleVictory !== 'function') {
        FAIL('settleVictory must be a function');
    }
    if (completedAtMs !== undefined && (!Number.isFinite(completedAtMs) || completedAtMs < 0)) {
        FAIL('Settlement timestamp must be a non-negative finite number');
    }
    const LEDGER = ledgerState(farm);
    if (runSequence <= LEDGER.watermark) {
        const PREVIOUS = LEDGER.receipts.find((receipt) => receipt?.key === KEY);
        return {
            farm,
            receipt: clone(
                PREVIOUS || {
                    key: KEY,
                    ownerId,
                    sessionId,
                    encounterId,
                    runSequence,
                    outcome: 'already-settled',
                    status: 'compacted',
                    sleptFarmUnitIds: [],
                    availableAtStart: 0,
                    originalUnitsDeployed: 0,
                    deploymentMultiplier: 0,
                    reward: null,
                },
            ),
            applied: false,
        };
    }
    if (
        runSequence !== LEDGER.watermark + 1 ||
        LEDGER.activeSequence !== runSequence ||
        LEDGER.activeSessionId !== sessionId
    ) {
        FAIL('Raid settlement does not match the active Farm-local run');
    }
    const RAID_STAGE = raidWorld?.boss?.stage,
        HIGHEST_CLEARED_STAGE = farm.farmBossProgress?.highestClearedRaidStage,
        // A nest the world map has opened up may sit further out than the stage rule alone allows.
        MAP_STAGE =
            farm.worldMap && (farm.worldMap.challengeTile ?? -1) >= 0
                ? tileDanger(farm.worldMap, farm.worldMap.challengeTile)
                : -1;
    if (
        !Number.isSafeInteger(HIGHEST_CLEARED_STAGE) ||
        HIGHEST_CLEARED_STAGE < 0 ||
        HIGHEST_CLEARED_STAGE > BOSS_REWARD_SETTINGS.maxStage ||
        ((outcome !== 'aborted' || RAID_STAGE !== undefined) &&
            (!Number.isSafeInteger(RAID_STAGE) || RAID_STAGE < 1 || RAID_STAGE > BOSS_REWARD_SETTINGS.maxStage)) ||
        (Number.isSafeInteger(RAID_STAGE) && RAID_STAGE > HIGHEST_CLEARED_STAGE + 1 && RAID_STAGE !== MAP_STAGE)
    ) {
        FAIL('Raid stage is locked or the private stage progress is invalid');
    }
    const FIRST_CLEAR = outcome === 'victory' && RAID_STAGE > HIGHEST_CLEARED_STAGE;
    const RAID_OWNER = raidOwnerManifest(raidWorld, ownerId);
    const {
        manifest: MANIFEST,
        deadFarmUnitIds: DEAD_FARM_UNIT_IDS,
        availableAtStart: AVAILABLE_AT_START,
        originalUnitsDeployed: ORIGINAL_UNITS_DEPLOYED,
    } = RAID_OWNER;
    const UNITS_BY_FARM_ID = new Map();
    for (const UNIT of farm.units) {
        if (!UNIT || !Number.isSafeInteger(UNIT.id) || UNIT.id < 1 || UNITS_BY_FARM_ID.has(UNIT.id)) {
            FAIL('Private Farm units must have unique positive IDs');
        }
        UNITS_BY_FARM_ID.set(UNIT.id, UNIT);
    }
    for (const [FARM_UNIT_ID, TROOP] of MANIFEST) {
        const FARM_UNIT = UNITS_BY_FARM_ID.get(FARM_UNIT_ID);
        if (!FARM_UNIT || FARM_UNIT.species !== TROOP.species || FARM_UNIT.tier !== TROOP.tier) {
            FAIL('The Raid roster no longer matches this owner’s private Farm units');
        }
    }
    for (const FARM_UNIT_ID of DEAD_FARM_UNIT_IDS) {
        if (!UNITS_BY_FARM_ID.has(FARM_UNIT_ID)) {
            FAIL('A dead Raid unit does not belong to this owner Farm');
        }
    }
    let privateFarm = clone(farm);
    privateFarm.raidSettlementReceipts = Array.isArray(privateFarm.raidSettlementReceipts)
        ? privateFarm.raidSettlementReceipts
        : [];
    const DEAD_SET = new Set(DEAD_FARM_UNIT_IDS);
    for (const UNIT of privateFarm.units) {
        if (!DEAD_SET.has(UNIT.id)) {
            continue;
        }
        // Farm's existing recovery clock uses hp=0 + down=60 as retained sleep.
        // Units stay in the owner's roster and become unavailable until it elapses.
        UNIT.hp = 0;
        UNIT.down = RAID_SLEEP_SECONDS;
    }
    let rewardSummary = null;
    let deploymentMultiplier = 0;
    if (outcome === 'victory') {
        // The registered roster is the encounter-start denominator. Its deployed
        // flags count unique original troops used at any time, including casualties;
        // summoned Raid units are not entries and cannot affect this ratio.
        deploymentMultiplier = raidDeploymentRewardMultiplier({
            availableAtStart: AVAILABLE_AT_START,
            originalUnitsDeployed: ORIGINAL_UNITS_DEPLOYED,
        });
        if (deploymentMultiplier > 0) {
            if (settleVictory === null) {
                FAIL('A reward-capable Raid victory needs the common reward/progression resolver');
            }
            const RESOLUTION = settleVictory({
                farm: privateFarm,
                ownerId,
                sessionId,
                encounterId,
                receiptKey: KEY,
                source: 'raid',
                stage: RAID_STAGE,
                firstClear: FIRST_CLEAR,
                deploymentMultiplier,
            });
            if (
                !RESOLUTION ||
                !RESOLUTION.farm ||
                typeof RESOLUTION.farm !== 'object' ||
                Array.isArray(RESOLUTION.farm) ||
                !Array.isArray(RESOLUTION.farm.units)
            ) {
                FAIL('The Raid victory resolver must return a private Farm snapshot and summary');
            }
            validateReturnedPrivateFarm(farm, RESOLUTION.farm, DEAD_FARM_UNIT_IDS);
            privateFarm = clone(RESOLUTION.farm);
            rewardSummary = RESOLUTION.summary ?? null;
        }
        if (RAID_STAGE > privateFarm.farmBossProgress.highestClearedRaidStage) {
            privateFarm.farmBossProgress.highestClearedRaidStage = RAID_STAGE;
            privateFarm.farmBossProgress.currentStage = Math.min(RAID_STAGE + 1, BOSS_REWARD_SETTINGS.maxStage);
        }
    }

    // A result closes this encounter generation exactly once, in the same
    // private-Farm snapshot as its settlement receipt. Abandoned runs and
    // duplicate callbacks never advance the epoch.
    if (outcome === 'victory' || outcome === 'defeat') {
        advanceFarmBossEncounterEpoch(privateFarm.farmBossProgress);
        if (privateFarm.worldMap) {
            finishChallenge(privateFarm.worldMap, outcome === 'victory' && RAID_STAGE === MAP_STAGE);
        }
    }
    const RECEIPT = {
        key: KEY,
        ownerId,
        sessionId,
        encounterId,
        runSequence,
        outcome,
        status: 'settled',
        completedAtMs: completedAtMs ?? null,
        sleptFarmUnitIds: [...DEAD_FARM_UNIT_IDS].sort((a, b) => a - b),
        availableAtStart: AVAILABLE_AT_START,
        originalUnitsDeployed: ORIGINAL_UNITS_DEPLOYED,
        deploymentMultiplier,
        reward: rewardSummary === null ? null : clone(rewardSummary),
    };
    // The resolver cannot erase or rewrite the bounded idempotency ledger.
    privateFarm.nextRaidRunSequence = LEDGER.nextSequence;
    privateFarm.activeRaidRunSequence = null;
    privateFarm.activeRaidSessionId = null;
    privateFarm.raidSettlementWatermark = runSequence;
    privateFarm.raidSettlementReceipts = [...LEDGER.receipts, RECEIPT].slice(-RAID_SETTLEMENT_RECEIPT_LIMIT);
    return {
        farm: privateFarm,
        receipt: clone(RECEIPT),
        applied: true,
    };
}
