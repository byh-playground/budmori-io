import { isWheatAttackRecord } from './features/species-growth/wheat-attack.js';
import { isRiceAttackRecord } from './features/species-growth/rice-attack.js';
import { isWalnutAttackRecord } from './features/species-growth/walnut-attack.js';
import { isPeanutAttackRecord } from './features/species-growth/peanut-attack.js';
import { isChestnutAttackRecord } from './features/species-growth/chestnut-attack.js';
import { isRedbeanAttackRecord } from './features/species-growth/redbean-attack.js';
import { isPeaAttackRecord } from './features/species-growth/pea-attack.js';
import { isValidFormationRuntime } from './formation-skill-state.js';
import { CONFIG } from './farm-model.js';
import { isValidPlayerProgressionState } from './player-progression.js';
import { hasUnitCapability, specialAbilityCompositionFor } from './unit-abilities.js';
import { mergeMaterialCostForTier } from './unit-grades.js';
import { BOSS_PATTERN_IDS } from './boss-patterns.js';
import { BOSS_REWARD_SETTINGS, bossStageStats } from './boss-rewards.js';
import { FACTION_CONFIG, hasFaction } from './factions.js';
import { FARM_SNAPSHOT_SHAPE as GARDEN_SHAPE, UNIT_SNAPSHOT_SHAPE as UNIT_SHAPE } from './farm-snapshot.js';
import { attackTargetKey } from './features/species-growth/attack-action.js';
import { isCornAttackRecord, cornKernelMultiplier } from './features/species-growth/corn-attack.js';
import { CORN_ATTACHMENT_FEATURE } from './features/abilities/corn-attachment/definition.js';
const INTEGER = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= min && v <= max;
const VALID_BATTLE_UNIT_ID = (id, bossSummonSerial) =>
    INTEGER(id, 1, CONFIG.farm.maxUnitId) ||
    INTEGER(id, CONFIG.boss.summonIdBase + 1, CONFIG.boss.summonIdBase + bossSummonSerial);
export { VALID_BATTLE_UNIT_ID as validBattleUnitId };
function assertSnapshot(ok) {
    if (!ok) {
        throw new TypeError('올바른 농장 저장 데이터가 아니에요.');
    }
}
const ASSERT = assertSnapshot;
const MAX_PEANUT_SPLIT_CHILDREN = 2;
export { assertSnapshot };
function finiteTree(v, depth = 0, key = '', progression = false) {
    ASSERT(depth < 18);
    if (typeof v === 'number') {
        const SAFE_COUNTERS = new Set([
            'count',
            'queuedCount',
            'acquiredCount',
            'placedCount',
            'rollBudget',
            'rngState',
            'payoutRngState',
            'totalTrials',
            'processedTrials',
            'remainingTrials',
            'successes',
            'consecutiveFailures',
            'pendingTrials',
        ]);
        ASSERT(
            progression && ['masteryLevel', 'masteryXp'].includes(key)
                ? Number.isFinite(v) && v >= 0
                : SAFE_COUNTERS.has(key)
                  ? Number.isSafeInteger(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER
                  : Number.isFinite(v) && Math.abs(v) < 1e13,
        );
    } else if (Array.isArray(v)) {
        const MAX =
            key === 'units'
                ? CONFIG.battle.capacity.battleUnits
                : key === 'projectiles' || key === 'actions' || key === 'groups' || key === 'chestnutAttacks'
                  ? CONFIG.battle.capacity.projectiles
                  : key === 'bossRewardReceipts' || key === 'processedBossKillReceipts'
                    ? 100000
                    : 1024;
        ASSERT(v.length <= MAX);
        v.forEach((x) => finiteTree(x, depth + 1, '', progression));
    } else if (v && typeof v === 'object') {
        for (const [K, X] of Object.entries(v)) {
            ASSERT(!['__proto__', 'constructor', 'prototype'].includes(K));
            finiteTree(
                X,
                depth + 1,
                K,
                progression || (depth === 0 && ['playerProgression', 'runProgressionSnapshot'].includes(K)),
            );
        }
    } else {
        ASSERT(v === null || typeof v === 'boolean' || (typeof v === 'string' && v.length < 256));
    }
}
function shape(v, t, path = 'snapshot') {
    if (path === 'snapshot.playerProgression' || path === 'snapshot.runProgressionSnapshot') {
        validateProgression(v);
        return;
    }
    if (v === null || typeof v !== 'object' || Array.isArray(v)) {
        throw new TypeError(`Invalid farm snapshot object at ${path}.`);
    }
    if (Object.keys(v).length !== Object.keys(t).length) {
        const EXPECTED = Object.keys(t),
            RECEIVED = Object.keys(v);
        throw new TypeError(
            `Invalid farm snapshot fields at ${path}: expected [${EXPECTED.join(', ')}], received [${RECEIVED.join(', ')}].`,
        );
    }
    for (const [K, X] of Object.entries(t)) {
        if (!Object.hasOwn(v, K)) {
            throw new TypeError(`Missing farm snapshot field: ${path}.${K}.`);
        }
        if (X === null) {
            continue;
        }
        if (Array.isArray(X)) {
            if (!Array.isArray(v[K])) {
                throw new TypeError(`Invalid farm snapshot list: ${path}.${K}.`);
            }
            continue;
        }
        if (typeof X === 'object' && Object.keys(X).length === 0) {
            // An empty template object is a free-form map (tile keys and the like); the world map checks its contents.
            if (v[K] === null || typeof v[K] !== 'object' || Array.isArray(v[K])) {
                throw new TypeError(`Invalid farm snapshot map: ${path}.${K}.`);
            }
        } else if (typeof X === 'object') {
            shape(v[K], X, `${path}.${K}`);
        } else {
            if (typeof v[K] !== typeof X) {
                throw new TypeError(`Invalid farm snapshot field: ${path}.${K}.`);
            }
        }
    }
}
// The launched owner record is a view of the authoritative ledger, not a second mutable budget.
function sameCheckpointValue(left, right) {
    if (left === right) {
        return true;
    }
    if (
        !left ||
        !right ||
        typeof left !== 'object' ||
        typeof right !== 'object' ||
        Array.isArray(left) !== Array.isArray(right)
    ) {
        return false;
    }
    const KEYS = Object.keys(left);
    return (
        KEYS.length === Object.keys(right).length &&
        KEYS.every((key) => Object.hasOwn(right, key) && sameCheckpointValue(left[key], right[key]))
    );
}
function validateProgression(progression) {
    ASSERT(
        progression &&
            Object.keys(progression).length === 4 &&
            ['schemaVersion', 'abilities', 'towerBest', 'processedBossKillReceipts'].every((key) =>
                Object.hasOwn(progression, key),
            ) &&
            isValidPlayerProgressionState(progression),
    );
}
function validWheatCommandBuffs(buffs) {
    return (
        Array.isArray(buffs) &&
        buffs.length <= 396 &&
        buffs.every(
            (buff) =>
                buff &&
                Object.keys(buff).every((key) =>
                    ['level', 'bonus', 'tier', 'powerRank', 'expiresAtTick'].includes(key),
                ) &&
                Number.isSafeInteger(buff.level) &&
                buff.level >= 0 &&
                buff.level <= (buff.bonus === undefined ? 2 : 5) &&
                (buff.tier === undefined || (INTEGER(buff.tier, 1, 6) && buff.bonus !== undefined)) &&
                (buff.powerRank === undefined || (INTEGER(buff.powerRank, 0, 10) && buff.bonus !== undefined)) &&
                (buff.bonus === undefined ||
                    buff.bonus ===
                        (0.5 + 0.125 * buff.level) *
                            1.5 ** ((buff.tier ?? 1) - 1) *
                            (1 + 0.03 * (buff.powerRank ?? 0))) &&
                INTEGER(buff.expiresAtTick, 1, 1e12),
        ) &&
        new Set(buffs.map((buff) => buff.bonus ?? [0.5, 0.75, 1.125][buff.level])).size === buffs.length
    );
}
function validBarleyArmorShredBuckets(buckets) {
    return (
        Array.isArray(buckets) &&
        buckets.length === 60 &&
        buckets.every(
            (bucket, index) =>
                bucket &&
                INTEGER(bucket.expiresAtTick, 0, 1e12) &&
                Number.isFinite(bucket.amount) &&
                bucket.amount >= 0 &&
                (bucket.expiresAtTick === 0
                    ? bucket.amount === 0
                    : bucket.amount > 0 && bucket.expiresAtTick % 60 === index),
        )
    );
}
export function validateSnapshot(raw) {
    finiteTree(raw);
    shape(raw, GARDEN_SHAPE);
    ASSERT(isValidFormationRuntime(raw.formationRuntime));
    ASSERT(
        INTEGER(raw.seed, 0, 0xffffffff) &&
            INTEGER(raw.rng.state, 0, 0xffffffff) &&
            INTEGER(raw.simulationTick, 0, 1e12),
    );
    ASSERT(raw.scene === 'farm');
    ASSERT(Array.isArray(raw.mergeTasks) && raw.mergeTasks.length <= CONFIG.farm.capacity.battleUnits);
    const CHESTNUT_ACTIONS = new Map();
    ASSERT(Array.isArray(raw.chestnutAttacks) && raw.chestnutAttacks.length <= CONFIG.battle.capacity.projectiles);
    for (const R of raw.chestnutAttacks) {
        ASSERT(
            isChestnutAttackRecord(R) &&
                INTEGER(R.id, 1, raw.attackSerial) &&
                R.launchTick <= raw.simulationTick &&
                R.attack.lastTick <= raw.simulationTick &&
                !CHESTNUT_ACTIONS.has(R.id),
        );
        CHESTNUT_ACTIONS.set(R.id, R);
    }
    const CORN_ACTIONS = new Map();
    ASSERT(
        Array.isArray(raw.cornAttachments.actions) &&
            raw.cornAttachments.actions.length <= CONFIG.battle.capacity.projectiles,
    );
    for (const RECORD of raw.cornAttachments.actions) {
        ASSERT(
            isCornAttackRecord(RECORD) &&
                INTEGER(RECORD.id, 1, raw.attackSerial) &&
                RECORD.launchTick <= raw.simulationTick &&
                RECORD.attack.lastTick <= raw.simulationTick &&
                !RECORD.attack.cancelled &&
                (RECORD.firstAttachTick === null || RECORD.firstAttachTick <= raw.simulationTick) &&
                !CORN_ACTIONS.has(RECORD.id),
        );
        const HIT_KEYS = new Set(RECORD.attack.hits.flat());
        ASSERT(
            Object.keys(RECORD.criticalRolls).length === HIT_KEYS.size &&
                Object.keys(RECORD.criticalRolls).every((key) => HIT_KEYS.has(key)),
        );
        CORN_ACTIONS.set(RECORD.id, RECORD);
    }
    const MERGE_TASK_UNIT_IDS = new Set(),
        PENDING_MERGE_COST = new Int32Array(CONFIG.unit.speciesCount);
    for (const T of raw.mergeTasks) {
        ASSERT(
            raw.scene === 'farm' &&
                T &&
                ['approach', 'animation'].includes(T.phase) &&
                Number.isFinite(T.elapsed) &&
                T.elapsed >= 0 &&
                Number.isFinite(T.duration) &&
                T.duration > 0 &&
                T.duration <= CONFIG.farm.merge.animationSeconds + 1e-9 &&
                T.elapsed <= T.duration + 1e-9 &&
                Array.isArray(T.materialIds) &&
                T.materialIds.length >= 2 &&
                T.materialIds.length <= CONFIG.farm.merge.maxMaterials &&
                new Set(T.materialIds).size === T.materialIds.length &&
                T.materialIds.every((id) => INTEGER(id, 1, CONFIG.farm.maxUnitId) && !MERGE_TASK_UNIT_IDS.has(id)) &&
                Number.isFinite(T.centerX) &&
                Number.isFinite(T.centerY) &&
                Number.isFinite(T.centerZ) &&
                T.centerZ >= 0 &&
                Array.isArray(T.startPositions),
        );
        for (const ID of T.materialIds) {
            MERGE_TASK_UNIT_IDS.add(ID);
        }
        if (T.phase === 'approach') {
            const MATERIALS = T.materialIds.map((id) => raw.units.find((u) => u.id === id)),
                FIRST = MATERIALS[0],
                COST = mergeMaterialCostForTier(FIRST?.tier + 1);
            ASSERT(
                INTEGER(T.aId, 1, CONFIG.farm.maxUnitId) &&
                    INTEGER(T.bId, 1, CONFIG.farm.maxUnitId) &&
                    T.aId === T.materialIds[0] &&
                    T.bId === T.materialIds[1] &&
                    COST === MATERIALS.length &&
                    FIRST &&
                    INTEGER(T.sourceSpecies, 0, CONFIG.unit.speciesCount - 1) &&
                    INTEGER(T.sourceTier, 1, CONFIG.unit.maxTier - 1) &&
                    T.sourceSpecies === FIRST.species &&
                    T.sourceTier === FIRST.tier &&
                    MATERIALS.every((u) => u && u.tier === FIRST.tier && u.species === FIRST.species) &&
                    T.startPositions.length === MATERIALS.length &&
                    T.startPositions.every(
                        (position, index) =>
                            position?.id === MATERIALS[index].id &&
                            Number.isFinite(position.x) &&
                            Number.isFinite(position.y) &&
                            Number.isFinite(position.z) &&
                            position.z >= 0,
                    ),
            );
            PENDING_MERGE_COST[FIRST.species] += MATERIALS.length - 1;
        } else {
            const RESULT = raw.units.find((u) => u.id === T.resultId);
            ASSERT(
                T.aId === 0 &&
                    T.bId === 0 &&
                    INTEGER(T.resultId, 1, CONFIG.farm.maxUnitId) &&
                    !MERGE_TASK_UNIT_IDS.has(T.resultId) &&
                    RESULT &&
                    INTEGER(T.sourceSpecies, 0, CONFIG.unit.speciesCount - 1) &&
                    INTEGER(T.sourceTier, 1, CONFIG.unit.maxTier - 1) &&
                    RESULT.species === T.sourceSpecies &&
                    RESULT.tier === T.sourceTier + 1 &&
                    T.materialIds.length === mergeMaterialCostForTier(RESULT.tier),
            );
            MERGE_TASK_UNIT_IDS.add(T.resultId);
        }
    }
    for (let species = 0; species < CONFIG.unit.speciesCount; species++) {
        if (PENDING_MERGE_COST[species] > 0) {
            const OWNED_COUNT = raw.units.filter((u) => !u.isBattleOnlySummon && u.species === species).length;
            ASSERT(OWNED_COUNT - PENDING_MERGE_COST[species] >= 2);
        }
    }
    ASSERT(
        raw.units.length <=
            (raw.scene === 'farm'
                ? raw.farmBossEvent?.phase === 'idle'
                    ? CONFIG.farm.capacity.max
                    : CONFIG.farm.capacity.battleUnits
                : 0) &&
            raw.food.length <= 140 &&
            raw.projectiles.length <= CONFIG.battle.capacity.projectiles,
    );
    ASSERT(
        raw.farmBossEvent &&
            ['idle', 'dropping', 'fighting', 'celebrating', 'fading'].includes(raw.farmBossEvent.phase) &&
            ['idle', 'fighting', 'victory', 'defeat'].includes(raw.farmBossEvent.outcome) &&
            Number.isFinite(raw.farmBossEvent.elapsed) &&
            raw.farmBossEvent.elapsed >= 0,
    );
    ASSERT(INTEGER(raw.nextBossEncounterId, 1, 1e12) && Array.isArray(raw.bossRewardReceipts));
    validateProgression(raw.playerProgression);
    if (raw.runProgressionSnapshot !== null) {
        validateProgression(raw.runProgressionSnapshot);
    }
    ASSERT(Array.isArray(raw.food) && raw.food.length <= 140);
    const FARM_EVENT = raw.farmBossEvent;
    if (FARM_EVENT.phase === 'idle') {
        ASSERT(
            FARM_EVENT.outcome === 'idle' &&
                FARM_EVENT.elapsed === 0 &&
                FARM_EVENT.encounterId === 0 &&
                FARM_EVENT.rewardStatus === 'none' &&
                FARM_EVENT.rewardChance === 0 &&
                FARM_EVENT.rewardRoll === 0 &&
                FARM_EVENT.rewardUnitId === 0,
        );
        if (raw.scene === 'farm') {
            ASSERT(!raw.boss.active);
        }
    } else if (FARM_EVENT.phase === 'dropping' || FARM_EVENT.phase === 'fighting') {
        ASSERT(
            raw.scene === 'farm' &&
                FARM_EVENT.outcome === 'fighting' &&
                raw.boss.active &&
                INTEGER(FARM_EVENT.encounterId, 1, raw.nextBossEncounterId - 1) &&
                FARM_EVENT.rewardStatus === 'unresolved' &&
                FARM_EVENT.rewardChance === 0 &&
                FARM_EVENT.rewardRoll === 0 &&
                FARM_EVENT.rewardUnitId === 0,
        );
    } else {
        ASSERT(
            raw.scene === 'farm' &&
                ['victory', 'defeat'].includes(FARM_EVENT.outcome) &&
                !raw.boss.active &&
                INTEGER(FARM_EVENT.encounterId, 1, raw.nextBossEncounterId - 1),
        );
        ASSERT(FARM_EVENT.outcome === 'victory' ? raw.boss.hp === 0 : raw.boss.hp > 0);
        ASSERT(
            FARM_EVENT.outcome === 'victory'
                ? ['calculating', 'ready'].includes(FARM_EVENT.rewardStatus)
                : FARM_EVENT.rewardStatus === 'none',
        );
    }
    ASSERT(
        raw.bossRewardWatermarks &&
            INTEGER(raw.bossRewardWatermarks.farm, 0, 1e12) &&
            raw.nextBossEncounterId > raw.bossRewardWatermarks.farm,
    );
    ASSERT(
        raw.bossRewardStreams &&
            typeof raw.bossRewardStreams === 'object' &&
            Object.keys(raw.bossRewardStreams).length === 3 &&
            ['normal', 'event', 'firstClear'].every((key) => Object.hasOwn(raw.bossRewardStreams, key)),
    );
    const VALID_DISTRIBUTION = (state) =>
            state &&
            typeof state === 'object' &&
            !Array.isArray(state) &&
            Object.keys(state).length === 4 &&
            state.version === 1 &&
            Number.isFinite(state.probability) &&
            state.probability >= 0 &&
            state.probability <= 1 &&
            INTEGER(state.consecutiveFailures) &&
            INTEGER(state.pendingTrials),
        VALID_JOB = (state, count) =>
            state &&
            typeof state === 'object' &&
            !Array.isArray(state) &&
            Object.keys(state).length === 7 &&
            state.version === 1 &&
            state.totalTrials === count &&
            INTEGER(state.processedTrials, 0, count) &&
            INTEGER(state.remainingTrials, 0, count) &&
            state.processedTrials + state.remainingTrials === count &&
            INTEGER(state.successes, 0, state.processedTrials) &&
            INTEGER(state.rngState, 0, 0xffffffff) &&
            VALID_DISTRIBUTION(state.distributionState);
    for (const STREAM of Object.values(raw.bossRewardStreams)) {
        ASSERT(
            STREAM &&
                INTEGER(STREAM.rngState, 0, 0xffffffff) &&
                INTEGER(STREAM.payoutRngState, 0, 0xffffffff) &&
                (STREAM.distributionState === null || VALID_DISTRIBUTION(STREAM.distributionState)),
        );
    }
    ASSERT(Array.isArray(raw.bossRewardInventory) && raw.bossRewardInventory.length <= CONFIG.unit.speciesCount);
    const INVENTORY = new Map();
    for (const GROUP of raw.bossRewardInventory) {
        ASSERT(
            GROUP &&
                INTEGER(GROUP.species, 0, CONFIG.unit.speciesCount - 1) &&
                GROUP.tier === 1 &&
                INTEGER(GROUP.count, 1) &&
                !INVENTORY.has(`${GROUP.species}:${GROUP.tier}`),
        );
        INVENTORY.set(`${GROUP.species}:${GROUP.tier}`, GROUP.count);
    }
    const REWARD_IDS = new Set(),
        QUEUED_BY_GROUP = new Map();
    for (const REWARD of raw.bossRewardReceipts) {
        ASSERT(
            REWARD &&
                INTEGER(REWARD.encounterId, 1, 1e12) &&
                REWARD.source === 'farm' &&
                REWARD.encounterId <= raw.bossRewardWatermarks[REWARD.source] &&
                INTEGER(REWARD.species, 0, CONFIG.unit.speciesCount - 1) &&
                INTEGER(REWARD.tier, 1, CONFIG.unit.maxTier) &&
                Number.isFinite(REWARD.x) &&
                Number.isFinite(REWARD.y) &&
                Number.isFinite(REWARD.chance) &&
                REWARD.chance >= 0 &&
                REWARD.chance <= 1 &&
                typeof REWARD.firstClear === 'boolean',
        );
        const KEY = REWARD.receiptKey || REWARD.source + ':' + REWARD.encounterId;
        ASSERT(!REWARD_IDS.has(KEY));
        REWARD_IDS.add(KEY);
        if (['calculating', 'ready'].includes(REWARD.status)) {
            ASSERT(
                REWARD.tier === 1 &&
                    REWARD.baselineChance ===
                        (REWARD.firstClear
                            ? BOSS_REWARD_SETTINGS.firstClearAcquisitionChance
                            : BOSS_REWARD_SETTINGS.acquisitionChance) &&
                    REWARD.chance === Math.min(1, REWARD.baselineChance * (REWARD.acquisitionMultiplier ?? 1)) &&
                    Number.isSafeInteger(REWARD.acquiredCount) &&
                    REWARD.acquiredCount >= 0 &&
                    Number.isSafeInteger(REWARD.placedCount) &&
                    REWARD.placedCount >= 0 &&
                    Number.isSafeInteger(REWARD.queuedCount) &&
                    REWARD.queuedCount >= 0 &&
                    REWARD.placedCount + REWARD.queuedCount === REWARD.acquiredCount &&
                    REWARD.grantedCount === REWARD.placedCount,
            );
            if (REWARD.queuedCount > 0) {
                const GROUP_KEY = `${REWARD.species}:${REWARD.tier}`,
                    QUEUED = (QUEUED_BY_GROUP.get(GROUP_KEY) || 0) + REWARD.queuedCount;
                ASSERT(Number.isSafeInteger(QUEUED));
                QUEUED_BY_GROUP.set(GROUP_KEY, QUEUED);
            }
            ASSERT(
                INTEGER(REWARD.rollBudget, 1, BOSS_REWARD_SETTINGS.maxRollCount) &&
                    INTEGER(REWARD.boxCount, 1, BOSS_REWARD_SETTINGS.maxBoxCount) &&
                    REWARD.boxCount === Math.min(REWARD.rollBudget, BOSS_REWARD_SETTINGS.maxBoxCount) &&
                    REWARD.rollCount === REWARD.boxCount &&
                    INTEGER(REWARD.successCount, 0, REWARD.boxCount),
            );
            if (REWARD.status === 'calculating') {
                const CALC = REWARD.calculation;
                ASSERT(
                    CALC &&
                        CALC.version === 1 &&
                        Array.isArray(CALC.payouts) &&
                        CALC.payouts.length === REWARD.boxCount &&
                        Array.isArray(CALC.hits) &&
                        CALC.hits.length <= REWARD.boxCount &&
                        CALC.hits.every(
                            (index, i) =>
                                INTEGER(index, 0, REWARD.boxCount - 1) && (i === 0 || CALC.hits[i - 1] < index),
                        ) &&
                        INTEGER(CALC.payoutRngStateAfter, 0, 0xffffffff) &&
                        (CALC.jobState === null || VALID_JOB(CALC.jobState, REWARD.boxCount)) &&
                        REWARD.successCount === 0 &&
                        REWARD.acquiredCount === 0 &&
                        REWARD.queuedCount === 0,
                );
                const BASE = Math.floor(REWARD.rollBudget / REWARD.boxCount),
                    EXTRA = REWARD.rollBudget % REWARD.boxCount;
                ASSERT(
                    CALC.payouts.every(
                        (payout) => Number.isSafeInteger(payout) && payout >= BASE && payout <= BASE + (EXTRA ? 1 : 0),
                    ) &&
                        CALC.payouts.reduce((sum, payout) => sum + payout, 0) === REWARD.rollBudget &&
                        CALC.payouts.filter((payout) => payout === BASE + 1).length === EXTRA,
                );
                if (CALC.jobState) {
                    ASSERT(
                        CALC.jobState.successes === CALC.hits.length &&
                            CALC.hits.every((index) => index < CALC.jobState.processedTrials),
                    );
                }
            } else {
                ASSERT(
                    REWARD.calculation === null &&
                        Number.isSafeInteger(REWARD.acquiredCount) &&
                        REWARD.acquiredCount >= 0 &&
                        REWARD.acquiredCount <= REWARD.rollBudget &&
                        REWARD.successCount <= REWARD.acquiredCount &&
                        (REWARD.successCount === 0) === (REWARD.acquiredCount === 0),
                );
            }
        } else {
            ASSERT(false);
        }
        if (REWARD.acquisitionMultiplier !== undefined) {
            ASSERT(
                Number.isFinite(REWARD.acquisitionMultiplier) &&
                    REWARD.acquisitionMultiplier >= 0 &&
                    REWARD.acquisitionMultiplier <= 2,
            );
        }
    }
    ASSERT(
        INVENTORY.size === QUEUED_BY_GROUP.size &&
            [...INVENTORY].every(([key, quantity]) => QUEUED_BY_GROUP.get(key) === quantity),
    );

    if (FARM_EVENT.outcome === 'victory' && FARM_EVENT.phase !== 'idle') {
        const RECEIPT = raw.bossRewardReceipts.find(
            (reward) => reward.source === 'farm' && reward.encounterId === FARM_EVENT.encounterId,
        );
        ASSERT(
            RECEIPT &&
                RECEIPT.status === FARM_EVENT.rewardStatus &&
                RECEIPT.chance === FARM_EVENT.rewardChance &&
                RECEIPT.roll === FARM_EVENT.rewardRoll &&
                RECEIPT.unitId === FARM_EVENT.rewardUnitId,
        );
    }
    ASSERT(
        raw.corpseRecoveryVersion === 1 &&
            INTEGER(raw.nextId, 1, 1e9) &&
            INTEGER(raw.bossSummonSerial, 0, 1e12) &&
            INTEGER(raw.foodTaps.produced, 0, 1e12),
    );
    const IDS = new Set(),
        MATE_ID_LIMIT = CONFIG.farm.maxUnitId;
    const UNITS_BY_ID = new Map(),
        SUMMONS_BY_PARENT = new Map();
    for (const U of raw.units) {
        shape(U, UNIT_SHAPE);
        ASSERT(
            Number.isFinite(U.growthElapsed) &&
                U.growthElapsed >= 0 &&
                Number.isFinite(U.growthDuration) &&
                U.growthDuration > 0 &&
                U.growthElapsed <= U.growthDuration + 1e-9 &&
                Number.isFinite(U.cooldown) &&
                U.cooldown >= 0 &&
                Number.isFinite(U.cooldownDuration) &&
                U.cooldownDuration >= U.cooldown - 1e-9 &&
                U.cooldownDuration <= 100000 &&
                INTEGER(U.mateId, 0, MATE_ID_LIMIT) &&
                Number.isFinite(U.perceptionRange) &&
                U.perceptionRange > 0 &&
                U.perceptionRange <= 100 &&
                Number.isFinite(U.down) &&
                U.down >= 0 &&
                U.down <= CONFIG.unit.corpseRecoverySeconds &&
                INTEGER(U.battleSummonEncounterId, 0, 1e12) &&
                Number.isFinite(U.landingRecovery) &&
                U.landingRecovery >= 0 &&
                U.landingRecovery <= 0.25 + 1e-9 &&
                INTEGER(U.generation, 1, 1e12) &&
                Number.isFinite(U.permanentStatMultiplier) &&
                U.permanentStatMultiplier >= 1 &&
                U.permanentStatMultiplier <= 2.25 &&
                Number.isFinite(U.growthMaxHpMultiplier) &&
                (U.growthMaxHpMultiplier === 1 ||
                    ((U.species === 2 ||
                        U.species === 3 ||
                        U.species === 4 ||
                        U.species === 5 ||
                        U.species === 6 ||
                        U.species === 7) &&
                        !U.isBattleOnlySummon &&
                        !U.isFormationClone &&
                        hasFaction(U, FACTION_CONFIG.PLAYER) &&
                        U.growthMaxHpMultiplier >= 1 &&
                        U.growthMaxHpMultiplier <= 1.4 &&
                        Math.abs(
                            (U.growthMaxHpMultiplier - 1) / 0.04 - Math.round((U.growthMaxHpMultiplier - 1) / 0.04),
                        ) < 1e-9)) &&
                INTEGER(U.walnutNextGuardTick, 0, 1e12) &&
                INTEGER(U.walnutGuardUntilTick, 0, 1e12) &&
                Number.isFinite(U.walnutStoredRawDamage) &&
                U.walnutStoredRawDamage >= 0 &&
                Number.isFinite(U.wheatCommandUntil) &&
                U.wheatCommandUntil >= 0 &&
                U.wheatCommandUntil <= 1e12 &&
                Number.isFinite(U.wheatCommandCritBonus) &&
                U.wheatCommandCritBonus >= 0 &&
                U.wheatCommandCritBonus <= 0.5 &&
                Number.isFinite(U.barleyArmorBreakUntil) &&
                U.barleyArmorBreakUntil >= 0 &&
                U.barleyArmorBreakUntil <= 1e12 &&
                Number.isFinite(U.barleyArmorBreakReduction) &&
                U.barleyArmorBreakReduction >= 0 &&
                U.barleyArmorBreakReduction <= 0.75 &&
                INTEGER(U.kidneyLeapReadyTick, 0, 1e12) &&
                INTEGER(U.kidneyLeapLastUseTick, 0, 1e12) &&
                typeof U.peaRecoveryPending === 'boolean' &&
                INTEGER(U.peaCounterExpiresAtTick, 0, 1e12) &&
                typeof U.peaCounterPending === 'boolean' &&
                INTEGER(U.peaRecoveryBoostExpiresAtTick, 0, 1e12) &&
                Number.isFinite(U.peaRecoveryBoostMultiplier) &&
                U.peaRecoveryBoostMultiplier >= 0 &&
                U.peaRecoveryBoostMultiplier <= 2 &&
                validWheatCommandBuffs(U.wheatCommandBuffs) &&
                validBarleyArmorShredBuckets(U.barleyArmorShredBuckets),
        );
        ASSERT(
            INTEGER(U.species, 0, CONFIG.unit.speciesCount - 1) &&
                INTEGER(U.tier, 1, CONFIG.unit.maxTier) &&
                ['idle', 'windup', 'active', 'recover'].includes(U.ability.phase) &&
                typeof U.ownerId === 'string' &&
                Number.isSafeInteger(U.farmId) &&
                Object.values(FACTION_CONFIG).includes(U.faction) &&
                typeof U.dropLanded === 'boolean' &&
                typeof U.isBattleOnlySummon === 'boolean' &&
                typeof U.splitUsedThisBattle === 'boolean' &&
                typeof U.deathSplitHandled === 'boolean' &&
                INTEGER(U.battleSummonParentGeneration, 0, 1e12) &&
                INTEGER(U.chestnutNextThornTick, 0, 1e12),
        );
        ASSERT(!!specialAbilityCompositionFor(U.species) === (U.specialAbility !== null));
        if (U.specialAbility) {
            ASSERT(
                ['idle', 'windup', 'active', 'recover'].includes(U.specialAbility.phase) &&
                    Number.isFinite(U.specialAbility.elapsed) &&
                    U.specialAbility.elapsed >= 0,
            );
            if (U.specialAbility.action) {
                ASSERT(
                    INTEGER(U.specialAbility.action.id, 1, raw.attackSerial) &&
                        typeof U.specialAbility.action.hit === 'boolean' &&
                        U.specialAbility.action.target &&
                        Number.isFinite(U.specialAbility.action.target.x) &&
                        Number.isFinite(U.specialAbility.action.target.y),
                );
                if (U.specialAbility.action.leapDepartureCommitted !== undefined) {
                    ASSERT(typeof U.specialAbility.action.leapDepartureCommitted === 'boolean');
                }
                if (U.specialAbility.action.leapCooldownResetApplied !== undefined) {
                    ASSERT(typeof U.specialAbility.action.leapCooldownResetApplied === 'boolean');
                }
                if (U.specialAbility.action.path) {
                    validatePath(U.specialAbility.action.path);
                }
            }
            if (['active', 'windup'].includes(U.specialAbility.phase)) {
                ASSERT(U.specialAbility.action !== null);
            }
            if (U.specialAbility.phase === 'active') {
                validatePath(U.specialAbility.action.path);
            }
        }
        if (U.hp <= 0) {
            ASSERT(U.down > 0 && !U.isBattleOnlySummon);
        } else {
            ASSERT(U.down === 0);
        }
        if (hasFaction(U, FACTION_CONFIG.ENEMY)) {
            ASSERT(
                U.isBattleOnlySummon &&
                    U.battleSummonKind === 'boss-mouth-t1' &&
                    U.ownerId === 'boss' &&
                    U.farmId === 0,
            );
        } else {
            ASSERT(U.battleSummonKind !== 'boss-mouth-t1' && U.ownerId !== 'boss');
        }
        ASSERT(!IDS.has(U.id));
        IDS.add(U.id);
        UNITS_BY_ID.set(U.id, U);
        if (U.isBattleOnlySummon) {
            if (U.isFormationClone) {
                ASSERT(
                    U.battleSummonKind === 'formation-copy' &&
                        U.faction === 'player' &&
                        U.hp > 0 &&
                        U.hp <= 1 &&
                        U.canSplit === false &&
                        U.countsTowardPermanentRoster === false &&
                        U.breedingEligible === false &&
                        U.mergeEligible === false &&
                        U.usesPersistentSleep === false &&
                        U.lifetime === 'until-death-or-battle-end' &&
                        INTEGER(U.battleSummonParentId, 1, 1e12),
                );
                ASSERT(raw.farmBossEvent.phase === 'fighting');
            } else if (U.battleSummonKind === 'peanut-death-split') {
                ASSERT(
                    raw.scene === 'farm' &&
                        INTEGER(U.battleSummonParentId, 1, Number.MAX_SAFE_INTEGER) &&
                        INTEGER(U.battleSummonParentGeneration, 1, 1e12) &&
                        U.battleSummonEncounterId === 0 &&
                        U.species === 4 &&
                        hasUnitCapability(U.species, 'deathSplit') &&
                        U.tier === 1 &&
                        U.permanentStatMultiplier <= 2.25 &&
                        U.canSplit === false &&
                        U.countsTowardPermanentRoster === false &&
                        U.breedingEligible === false &&
                        U.mergeEligible === false &&
                        U.usesPersistentSleep === false &&
                        U.lifetime === 'until-death-or-battle-end' &&
                        U.deathSplitHandled === false &&
                        U.splitUsedThisBattle === true &&
                        U.hp > 0,
                );
                const PARENT = UNITS_BY_ID.get(U.battleSummonParentId);
                ASSERT(
                    PARENT &&
                        hasFaction(PARENT, FACTION_CONFIG.PLAYER) &&
                        PARENT.isBattleOnlySummon === false &&
                        PARENT.hp <= 0 &&
                        PARENT.generation === U.battleSummonParentGeneration &&
                        hasUnitCapability(PARENT.species, 'deathSplit') &&
                        PARENT.species === 4 &&
                        PARENT.splitUsedThisBattle &&
                        PARENT.faction === U.faction &&
                        PARENT.ownerId === U.ownerId &&
                        PARENT.farmId === U.farmId,
                );
                const LIST = SUMMONS_BY_PARENT.get(PARENT.id) || [];
                LIST.push(U);
                SUMMONS_BY_PARENT.set(PARENT.id, LIST);
                ASSERT(INTEGER(U.id, 1, raw.nextId - 1) && raw.farmBossEvent.phase !== 'idle');
            } else {
                ASSERT(
                    U.battleSummonKind === 'boss-mouth-t1' &&
                        U.battleSummonParentId === 0 &&
                        INTEGER(U.battleSummonEncounterId, 1, 1e12) &&
                        U.battleSummonEncounterId === raw.boss.encounterId &&
                        U.species === raw.boss.species &&
                        U.tier === 1 &&
                        U.ownerId === 'boss' &&
                        U.farmId === 0 &&
                        U.canSplit === false &&
                        U.countsTowardPermanentRoster === false &&
                        U.breedingEligible === false &&
                        U.mergeEligible === false &&
                        U.usesPersistentSleep === false &&
                        U.lifetime === 'until-death-or-battle-end' &&
                        U.deathSplitHandled === false &&
                        U.splitUsedThisBattle === true &&
                        U.hp > 0 &&
                        U.battleSummonEncounterId > 0 &&
                        U.id >= CONFIG.boss.summonIdBase &&
                        U.id <= CONFIG.boss.summonIdBase + raw.bossSummonSerial,
                );
                ASSERT(raw.farmBossEvent.phase === 'fighting');
            }
        } else {
            ASSERT(
                U.battleSummonKind === '' &&
                    U.battleSummonParentId === 0 &&
                    U.battleSummonEncounterId === 0 &&
                    U.countsTowardPermanentRoster === true &&
                    U.breedingEligible === true &&
                    U.mergeEligible === true &&
                    U.canSplit === true &&
                    U.usesPersistentSleep === true &&
                    U.lifetime === '',
            );
            ASSERT(INTEGER(U.id, 1, raw.nextId - 1));
        }
        if (U.ability.action) {
            const A = U.ability.action;
            ASSERT(
                INTEGER(A.id, 1, raw.attackSerial) &&
                    INTEGER(A.targetGeneration, 1, 1e12) &&
                    typeof A.hit === 'boolean' &&
                    A.target &&
                    Number.isFinite(A.target.x) &&
                    Number.isFinite(A.target.y),
            );
            if (A.peanutAttack !== undefined) {
                const R = A.peanutAttack;
                ASSERT(
                    U.species === 4 &&
                        isPeanutAttackRecord(R) &&
                        R.id === A.id &&
                        R.owner === U.id &&
                        R.ownerGeneration === U.generation &&
                        R.tier === U.tier &&
                        R.child === U.isBattleOnlySummon &&
                        U.hp > 0 &&
                        (R.launchTick === null
                            ? U.ability.phase === 'windup' && A.path === null
                            : (U.ability.phase === 'active' || U.ability.phase === 'recover') &&
                              R.launchTick <= raw.simulationTick &&
                              R.motionTick ===
                                  (U.ability.phase === 'recover'
                                      ? 10
                                      : Math.min(10, Math.round(U.ability.elapsed * 20))) &&
                              A.path?.duration === R.durationSeconds &&
                              A.path.height === 0 &&
                              sameCheckpointValue(A.path.from, R.origin) &&
                              sameCheckpointValue(A.path.to, R.origin)) &&
                        R.targetId === A.targetId &&
                        R.targetGeneration === A.targetGeneration,
                );
            }
            if (A.walnutAttack !== undefined) {
                const R = A.walnutAttack;
                ASSERT(
                    U.species === 5 &&
                        isWalnutAttackRecord(R) &&
                        R.id === A.id &&
                        R.owner === U.id &&
                        R.ownerGeneration === U.generation &&
                        R.tier === U.tier &&
                        U.hp > 0 &&
                        (R.launchTick === null
                            ? U.ability.phase === 'windup' && A.path === null
                            : (U.ability.phase === 'active' || U.ability.phase === 'recover') &&
                              R.launchTick <= raw.simulationTick &&
                              R.motionTick ===
                                  (U.ability.phase === 'recover'
                                      ? 10
                                      : Math.min(10, Math.round(U.ability.elapsed * 20))) &&
                              A.path?.duration === R.durationSeconds &&
                              A.path.height === 0 &&
                              sameCheckpointValue(A.path.from, R.origin) &&
                              sameCheckpointValue(A.path.to, R.origin)) &&
                        R.targetId === A.targetId &&
                        R.targetGeneration === A.targetGeneration,
                );
            }
            if (A.riceAttack !== undefined) {
                const R = A.riceAttack;
                ASSERT(
                    U.species === 6 &&
                        isRiceAttackRecord(R) &&
                        R.id === A.id &&
                        R.owner === U.id &&
                        R.ownerGeneration === U.generation &&
                        R.tier === U.tier &&
                        U.hp > 0 &&
                        (R.launchTick === null
                            ? U.ability.phase === 'windup' && A.path === null
                            : (U.ability.phase === 'active' || U.ability.phase === 'recover') &&
                              R.launchTick <= raw.simulationTick &&
                              R.motionTick ===
                                  (U.ability.phase === 'recover'
                                      ? Math.round(R.durationSeconds * 20)
                                      : Math.min(
                                            Math.round(R.durationSeconds * 20),
                                            Math.round(U.ability.elapsed * 20),
                                        )) &&
                              A.path?.duration === R.durationSeconds &&
                              A.path.height === 0 &&
                              sameCheckpointValue(A.path.from, R.origin) &&
                              sameCheckpointValue(A.path.to, R.origin)) &&
                        R.targetId === A.targetId &&
                        R.targetGeneration === A.targetGeneration,
                );
            }
            if (A.wheatAttack !== undefined) {
                const R = A.wheatAttack;
                ASSERT(
                    U.species === 7 &&
                        isWheatAttackRecord(R) &&
                        R.id === A.id &&
                        R.owner === U.id &&
                        R.ownerGeneration === U.generation &&
                        R.tier === U.tier &&
                        U.hp > 0 &&
                        (R.launchTick === null
                            ? U.ability.phase === 'windup' && A.path === null
                            : (U.ability.phase === 'active' || U.ability.phase === 'recover') &&
                              R.launchTick <= raw.simulationTick &&
                              R.motionTick ===
                                  (U.ability.phase === 'recover'
                                      ? Math.round(R.durationSeconds * 20)
                                      : Math.min(
                                            Math.round(R.durationSeconds * 20),
                                            Math.round(U.ability.elapsed * 20),
                                        )) &&
                              A.path?.duration === R.durationSeconds &&
                              A.path.height === 0 &&
                              sameCheckpointValue(A.path.from, R.origin) &&
                              sameCheckpointValue(A.path.to, R.origin)) &&
                        R.targetId === A.targetId &&
                        R.targetGeneration === A.targetGeneration,
                );
            }
            if (A.redbeanAttack !== undefined) {
                ASSERT(
                    U.species === 2 &&
                        isRedbeanAttackRecord(A.redbeanAttack) &&
                        A.redbeanAttack.id === A.id &&
                        A.redbeanAttack.owner === U.id &&
                        A.redbeanAttack.ownerGeneration === U.generation &&
                        A.redbeanAttack.tier === U.tier,
                );
            }
            if (A.peaAttack !== undefined) {
                ASSERT(
                    U.species === 0 &&
                        isPeaAttackRecord(A.peaAttack) &&
                        A.peaAttack.id === A.id &&
                        A.peaAttack.owner === U.id &&
                        A.peaAttack.ownerGeneration === U.generation &&
                        A.peaAttack.tier === U.tier,
                );
            }
            if (A.chestnutAttack !== undefined) {
                const R = A.chestnutAttack,
                    C = CHESTNUT_ACTIONS.get(A.id);
                ASSERT(
                    U.species === 3 &&
                        isChestnutAttackRecord(R, { pending: true }) &&
                        !R.periodic &&
                        R.id === A.id &&
                        R.owner === U.id &&
                        R.ownerGeneration === U.generation &&
                        R.tier === U.tier &&
                        R.targetId === A.targetId &&
                        R.targetGeneration === A.targetGeneration &&
                        (R.launchTick === null ? C === undefined : C && sameCheckpointValue(R, C)),
                );
            }
            if (A.cornAttack !== undefined) {
                const CANONICAL = CORN_ACTIONS.get(A.id);
                ASSERT(
                    A.cornAttack.launchTick === null
                        ? !CANONICAL &&
                              Object.keys(A.cornAttack.criticalRolls).length === 0 &&
                              A.cornAttack.firstAttachTick === null
                        : CANONICAL && sameCheckpointValue(A.cornAttack, CANONICAL),
                );
                ASSERT(
                    U.species === 1 &&
                        isCornAttackRecord(A.cornAttack, { pending: true }) &&
                        A.cornAttack.id === A.id &&
                        A.cornAttack.owner === U.id &&
                        A.cornAttack.ownerGeneration === U.generation &&
                        A.cornAttack.tier === U.tier,
                );
            }
            if (hasUnitCapability(U.species, 'repeatedStrike') && !A.peanutAttack) {
                ASSERT(
                    INTEGER(A.peanutStrikeCount, 2, 5) &&
                        Number.isFinite(A.peanutAttackMultiplier) &&
                        A.peanutAttackMultiplier > 0 &&
                        A.peanutAttackMultiplier <= 10 &&
                        Number.isFinite(A.peanutSpreadRadians) &&
                        A.peanutSpreadRadians >= 0 &&
                        A.peanutSpreadRadians <= Math.PI / 6,
                );
                const MASK = (1 << A.peanutStrikeCount) - 1;
                ASSERT(
                    INTEGER(A.resolvedMask, 0, MASK) &&
                        INTEGER(A.hitMask, 0, MASK) &&
                        (A.hitMask & ~A.resolvedMask) === 0,
                );
            }
            if (U.species === 3 && A.thornShotsRemaining !== undefined) {
                ASSERT(
                    INTEGER(A.thornTargetGeneration, 1, 1e12) &&
                        (A.thornTargetId === 'boss' || VALID_BATTLE_UNIT_ID(A.thornTargetId, raw.bossSummonSerial)) &&
                        INTEGER(A.thornShotsRemaining, 0, 2) &&
                        INTEGER(A.thornNextShotTick, 0, 1e12) &&
                        INTEGER(A.thornShotIndex, 0, 2) &&
                        A.thornConfig?.projectileCount >= 1 &&
                        A.thornConfig.projectileCount <= 3,
                );
            }
            if (A.path) {
                validatePath(A.path);
            }
            if (A.pendingShots !== undefined) {
                ASSERT(
                    Array.isArray(A.pendingShots) &&
                        A.pendingShots.length <= 3 &&
                        A.pendingShots.every(
                            (shot) =>
                                INTEGER(shot.shotIndex, 1, 4) &&
                                Number.isFinite(shot.delaySeconds) &&
                                shot.delaySeconds >= 0 &&
                                Number.isFinite(shot.attackMultiplier) &&
                                shot.attackMultiplier > 0 &&
                                shot.attackMultiplier <= 10,
                        ),
                );
            }
            if (A.projectileAbility !== undefined) {
                ASSERT(A.projectileAbility && Object.hasOwn(A.projectileAbility, 'effect'));
                if (A.projectileAbility.effect) {
                    ASSERT(
                        A.projectileAbility.effect.abilityId === 'corn-kernel-chain' &&
                            Number.isFinite(A.projectileAbility.effect.config.damageMultiplier) &&
                            A.projectileAbility.effect.config.damageMultiplier >= 0.5 &&
                            A.projectileAbility.effect.config.damageMultiplier <= 1,
                    );
                }
            }
        }
        if (U.ability.phase === 'active' || U.ability.phase === 'windup') {
            ASSERT(U.ability.action !== null);
        }
        if (U.ability.phase === 'active') {
            validatePath(U.ability.action.path);
        }
    }
    for (const [PARENT_ID, CHILDREN] of SUMMONS_BY_PARENT) {
        ASSERT(CHILDREN.length <= MAX_PEANUT_SPLIT_CHILDREN);
        const PARENT = UNITS_BY_ID.get(PARENT_ID);
        ASSERT(PARENT && PARENT.ownerId === CHILDREN[0].ownerId && PARENT.farmId === CHILDREN[0].farmId);
    }
    const GENERATIONS = new Set();
    for (const U of raw.units) {
        ASSERT(!GENERATIONS.has(U.generation));
        GENERATIONS.add(U.generation);
    }
    ASSERT(
        INTEGER(raw.entityGenerationSerial, 1, 1e12) &&
            raw.entityGenerationSerial >= raw.boss.generation &&
            raw.units.every((unit) => unit.generation <= raw.entityGenerationSerial),
    );
    for (const F of raw.food) {
        ASSERT(['flight', 'bounce', 'grounded'].includes(F.phase));
        for (const K of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'tx', 'ty']) {
            ASSERT(Number.isFinite(F[K]));
        }
    }
    const PROJECTILE_IDS = new Set(),
        CORN_PROJECTILE_SLOTS = new Set(),
        CHESTNUT_PROJECTILE_SLOTS = new Set();
    for (const P of raw.projectiles) {
        validatePath(P.path);
        ASSERT(INTEGER(P.id, 1, raw.projectileSerial) && !PROJECTILE_IDS.has(P.id));
        PROJECTILE_IDS.add(P.id);
        ASSERT(
            INTEGER(P.owner, 1, raw.nextId - 1) ||
                INTEGER(P.owner, CONFIG.boss.summonIdBase + 1, CONFIG.boss.summonIdBase + raw.bossSummonSerial),
        );
        ASSERT(
            P.targetId === undefined || P.targetId === 'boss' || VALID_BATTLE_UNIT_ID(P.targetId, raw.bossSummonSerial),
        );
        if (P.chestnutActionId !== undefined) {
            const R = CHESTNUT_ACTIONS.get(P.chestnutActionId),
                S = R?.shots[P.chestnutSlot],
                K = `${P.chestnutActionId}:${P.chestnutSlot}`;
            ASSERT(
                R &&
                    S &&
                    !CHESTNUT_PROJECTILE_SLOTS.has(K) &&
                    P.chestnutSlot < R.nextShot &&
                    P.species === 3 &&
                    P.tier === R.tier &&
                    P.chestnutForm === R.form &&
                    P.chestnutStage === S.stage &&
                    P.owner === R.owner &&
                    P.ownerGeneration === R.ownerGeneration &&
                    P.targetId === R.targetId &&
                    P.targetGeneration === R.targetGeneration &&
                    P.faction === R.source.faction &&
                    P.ownerId === R.source.ownerId &&
                    P.isFormationClone === R.source.isFormationClone &&
                    P.projectileKind === 'chestnut-spike' &&
                    P.attackMultiplier === 1 &&
                    P.radius === 0.12 &&
                    P.height === 0.5 &&
                    P.path.height === 0 &&
                    P.path.duration === Math.max(0.1, 0.3 / (R.periodic ? 1 : R.speed)) &&
                    sameCheckpointValue(P.path.from, R.origin) &&
                    sameCheckpointValue(P.path.to, R.point) &&
                    INTEGER(P.chestnutBornTick, R.launchTick, raw.simulationTick) &&
                    P.chestnutBornTick === R.launchTick + S.tick &&
                    typeof P.hit === 'boolean' &&
                    P.hit === R.completedSlots[P.chestnutSlot] &&
                    Number.isFinite(P.elapsed) &&
                    P.elapsed >= 0,
            );
            CHESTNUT_PROJECTILE_SLOTS.add(K);
            continue;
        }
        if (P.cornActionId !== undefined) {
            const RECORD = CORN_ACTIONS.get(P.cornActionId),
                SHOT = RECORD?.shots[P.cornSlot];
            const SLOT_KEY = `${P.cornActionId}:${P.cornSlot}`;
            ASSERT(
                RECORD &&
                    SHOT &&
                    !CORN_PROJECTILE_SLOTS.has(SLOT_KEY) &&
                    P.species === 1 &&
                    P.tier === RECORD.tier &&
                    P.cornForm === RECORD.form &&
                    INTEGER(P.cornSlot, 0, RECORD.shots.length - 1) &&
                    P.shotIndex === P.cornSlot &&
                    P.owner === RECORD.owner &&
                    P.ownerGeneration === RECORD.ownerGeneration &&
                    INTEGER(P.targetGeneration, 1, 1e12) &&
                    P.faction === RECORD.source.faction &&
                    P.ownerId === RECORD.source.ownerId &&
                    P.attackMultiplier === RECORD.directMultiplier * SHOT.weight &&
                    P.path.duration === SHOT.duration &&
                    typeof P.hit === 'boolean' &&
                    P.attackPayload?.damageMultiplier === P.attackMultiplier &&
                    P.attackPayload.sourceDamageScale === RECORD.source.sourceDamageScale &&
                    P.attackPayload.attackPowerMultiplier === RECORD.source.attackPowerMultiplier &&
                    P.attackPayload.attackerStats?.attackPower === RECORD.source.attackerStats.attackPower,
            );
            CORN_PROJECTILE_SLOTS.add(SLOT_KEY);
            continue;
        }
        ASSERT(
            Object.values(FACTION_CONFIG).includes(P.faction) &&
                typeof P.ownerId === 'string' &&
                INTEGER(P.species, 0, CONFIG.unit.speciesCount - 1) &&
                INTEGER(P.tier, 1, CONFIG.unit.maxTier) &&
                typeof P.hit === 'boolean' &&
                Number.isFinite(P.attackMultiplier) &&
                P.attackMultiplier > 0 &&
                P.attackMultiplier <= 10 &&
                INTEGER(P.shotIndex, 0, 4),
        );
        ASSERT(
            INTEGER(P.ownerGeneration, 1, 1e12) &&
                INTEGER(P.targetGeneration, 1, 1e12) &&
                P.attackPayload &&
                Number.isFinite(P.attackPayload.attackerStats?.attackPower) &&
                Number.isFinite(P.attackPayload.damageMultiplier) &&
                P.attackPayload.damageMultiplier > 0 &&
                P.attackPayload.damageMultiplier <= 10,
        );
        if (P.cornPayload) {
            ASSERT(
                P.species === 1 &&
                    Number.isFinite(P.cornPayload.attackerStats?.attackPower) &&
                    Number.isFinite(P.cornPayload.attackPowerMultiplier) &&
                    typeof P.cornPayload.ownerId === 'string' &&
                    Object.values(FACTION_CONFIG).includes(P.cornPayload.faction),
            );
        }
    }
    for (const R of CHESTNUT_ACTIONS.values()) {
        for (let i = 0; i < R.nextShot; i++) {
            ASSERT(R.completedSlots[i] || CHESTNUT_PROJECTILE_SLOTS.has(`${R.id}:${i}`));
        }
    }
    const ATTACHMENTS = new Set(),
        CORN_GROUP_TARGETS = new Set(),
        CORN_DEFINITION = CORN_ATTACHMENT_FEATURE.definition;
    ASSERT(
        INTEGER(raw.cornAttachments.nextGroupId, 1, 1e12) &&
            INTEGER(raw.cornAttachments.nextAttachmentId, 1, 1e12) &&
            Array.isArray(raw.cornAttachments.groups) &&
            raw.cornAttachments.groups.length <= CONFIG.battle.capacity.projectiles,
    );
    for (const GROUP of raw.cornAttachments.groups) {
        const RECORD = GROUP.cornActionId === undefined ? null : CORN_ACTIONS.get(GROUP.cornActionId);
        ASSERT(GROUP.cornActionId === undefined || !!RECORD);
        const KERNEL_INDICES = new Set(),
            TARGET_KEY = attackTargetKey(GROUP.targetId, GROUP.targetGeneration),
            GROUP_KEY = `${GROUP.cornActionId}:${TARGET_KEY}`;
        let previousKernelIndex = -1;
        if (RECORD) {
            ASSERT(!CORN_GROUP_TARGETS.has(GROUP_KEY) && GROUP.firstAttachTick === RECORD.firstAttachTick);
            CORN_GROUP_TARGETS.add(GROUP_KEY);
            const PENDING = GROUP.attachments.filter((attachment) => attachment.status === 'attached');
            const TARGET = GROUP.targetId === 'boss' ? raw.boss : UNITS_BY_ID.get(GROUP.targetId);
            ASSERT(
                GROUP.status !== 'cancelled' ||
                    !TARGET ||
                    TARGET.generation !== GROUP.targetGeneration ||
                    TARGET.hp <= 0,
            );
            ASSERT(
                (GROUP.status === 'collecting'
                    ? raw.simulationTick < GROUP.closeAtTick &&
                      GROUP.nextExplosionTick === null &&
                      PENDING.length === GROUP.attachments.length
                    : GROUP.status === 'exploding'
                      ? raw.simulationTick >= GROUP.closeAtTick &&
                        PENDING.length > 0 &&
                        GROUP.nextExplosionTick === PENDING[0].explosionTick
                      : PENDING.length === 0) &&
                    GROUP.attachments.every((attachment) =>
                        attachment.status === 'attached'
                            ? attachment.explosionTick > raw.simulationTick &&
                              attachment.fadeTicks === CORN_DEFINITION.fadeTicks
                            : GROUP.status === 'cancelled' || attachment.explosionTick <= raw.simulationTick,
                    ),
            );
        }
        ASSERT(
            INTEGER(GROUP.id, 1, raw.cornAttachments.nextGroupId - 1) &&
                INTEGER(GROUP.targetGeneration, 1, 1e12) &&
                (GROUP.targetId === 'boss' || VALID_BATTLE_UNIT_ID(GROUP.targetId, raw.bossSummonSerial)) &&
                ['collecting', 'exploding', 'complete', 'cancelled'].includes(GROUP.status) &&
                Number.isFinite(GROUP.targetX) &&
                Number.isFinite(GROUP.targetY) &&
                Number.isFinite(GROUP.targetZ) &&
                INTEGER(GROUP.firstAttachTick, 0, raw.simulationTick) &&
                GROUP.closeAtTick === GROUP.firstAttachTick + CORN_DEFINITION.attachDelayTicks &&
                (GROUP.nextExplosionTick === null || INTEGER(GROUP.nextExplosionTick, 0, 1e12)) &&
                Array.isArray(GROUP.attachments) &&
                GROUP.attachments.length > 0 &&
                GROUP.attachments.length <= CONFIG.battle.capacity.projectiles,
        );
        for (const ATTACHMENT of GROUP.attachments) {
            const SLOT = RECORD?.shots.findIndex(
                (shot) =>
                    ATTACHMENT.cornKernelIndex >= shot.kernelStart &&
                    ATTACHMENT.cornKernelIndex < shot.kernelStart + shot.kernelCount,
            );
            const HIT_SLOT = SLOT === -1 ? RECORD.shots.length - 1 : SLOT;
            ASSERT(
                INTEGER(ATTACHMENT.id, 1, raw.cornAttachments.nextAttachmentId - 1) &&
                    !ATTACHMENTS.has(ATTACHMENT.id) &&
                    ATTACHMENT.groupId === GROUP.id &&
                    ATTACHMENT.targetId === GROUP.targetId &&
                    ATTACHMENT.targetGeneration === GROUP.targetGeneration &&
                    INTEGER(ATTACHMENT.ownerId, 1, 1e12) &&
                    INTEGER(ATTACHMENT.ownerGeneration, 1, 1e12) &&
                    Number.isFinite(ATTACHMENT.damageMultiplier) &&
                    (RECORD
                        ? ATTACHMENT.cornActionId === GROUP.cornActionId &&
                          INTEGER(ATTACHMENT.cornKernelIndex, 0, RECORD.terminalIndex) &&
                          !KERNEL_INDICES.has(ATTACHMENT.cornKernelIndex) &&
                          ATTACHMENT.cornKernelIndex > previousKernelIndex &&
                          RECORD.attack.hits[HIT_SLOT]?.includes(TARGET_KEY) &&
                          (ATTACHMENT.cornDamageScale === 1 || ATTACHMENT.cornDamageScale === 0.5) &&
                          ATTACHMENT.damageMultiplier ===
                              cornKernelMultiplier(RECORD, ATTACHMENT.cornKernelIndex) * ATTACHMENT.cornDamageScale &&
                          ATTACHMENT.explosionTick ===
                              RECORD.firstAttachTick +
                                  CORN_DEFINITION.attachDelayTicks +
                                  ATTACHMENT.cornKernelIndex * CORN_DEFINITION.explosionSpacingTicks &&
                          ATTACHMENT.ownerId === RECORD.owner &&
                          ATTACHMENT.ownerGeneration === RECORD.ownerGeneration
                        : ATTACHMENT.damageMultiplier >= 0.5 && ATTACHMENT.damageMultiplier <= 1) &&
                    ['attached', 'fading', 'removed'].includes(ATTACHMENT.status) &&
                    (!RECORD ||
                        (ATTACHMENT.status === 'removed' ? ATTACHMENT.fadeTicks === 0 : ATTACHMENT.fadeTicks > 0)) &&
                    INTEGER(ATTACHMENT.fadeTicks, 0, CORN_DEFINITION.fadeTicks) &&
                    Number.isFinite(ATTACHMENT.angle) &&
                    Number.isFinite(ATTACHMENT.offsetX) &&
                    Number.isFinite(ATTACHMENT.offsetY) &&
                    ATTACHMENT.payload &&
                    Number.isFinite(ATTACHMENT.payload.attackerStats?.attackPower) &&
                    Number.isFinite(ATTACHMENT.payload.attackPowerMultiplier) &&
                    typeof ATTACHMENT.payload.ownerId === 'string' &&
                    Object.values(FACTION_CONFIG).includes(ATTACHMENT.payload.faction),
            );
            ATTACHMENTS.add(ATTACHMENT.id);
            KERNEL_INDICES.add(ATTACHMENT.cornKernelIndex);
            previousKernelIndex = ATTACHMENT.cornKernelIndex;
        }
    }
    ASSERT(INTEGER(raw.projectileSerial, 0, 1e12) && INTEGER(raw.bossSummonSerial, 0, 1e12));
    ASSERT(
        hasFaction(raw.boss, FACTION_CONFIG.ENEMY) &&
            INTEGER(raw.boss.generation, 1, 1e12) &&
            raw.boss.hp >= 0 &&
            raw.boss.hp <= raw.boss.maxHp &&
            INTEGER(raw.boss.species, 0, CONFIG.unit.speciesCount - 1) &&
            raw.boss.maxHp > 0 &&
            INTEGER(raw.boss.stage, 0, BOSS_REWARD_SETTINGS.maxStage) &&
            Number.isFinite(raw.boss.attackPower) &&
            raw.boss.attackPower >= 4 &&
            Number.isFinite(raw.boss.moveSpeed) &&
            raw.boss.moveSpeed > 0 &&
            INTEGER(raw.boss.encounterId, 0, 1e12) &&
            Number.isFinite(raw.boss.barleyArmorBreakUntil) &&
            raw.boss.barleyArmorBreakUntil >= 0 &&
            raw.boss.barleyArmorBreakUntil <= 1e12 &&
            Number.isFinite(raw.boss.barleyArmorBreakReduction) &&
            raw.boss.barleyArmorBreakReduction >= 0 &&
            raw.boss.barleyArmorBreakReduction <= 0.75 &&
            validBarleyArmorShredBuckets(raw.boss.barleyArmorShredBuckets),
    );
    if (raw.boss.stage === 0) {
        ASSERT(raw.boss.attackPower === 4);
    } else {
        const STAGE_STATS = bossStageStats(raw.boss.stage);
        ASSERT(raw.boss.maxHp === STAGE_STATS.hp && raw.boss.attackPower === STAGE_STATS.attackPower);
    }
    const RUNTIME = raw.boss.patternRuntime;
    ASSERT(
        RUNTIME &&
            Number.isFinite(RUNTIME.encounterElapsed) &&
            RUNTIME.encounterElapsed >= 0 &&
            RUNTIME.weights &&
            RUNTIME.cooldowns,
    );
    for (const ID of BOSS_PATTERN_IDS) {
        ASSERT(
            Number.isFinite(RUNTIME.weights[ID]) &&
                RUNTIME.weights[ID] >= 0 &&
                RUNTIME.weights[ID] <= 3 &&
                Number.isFinite(RUNTIME.cooldowns[ID]) &&
                RUNTIME.cooldowns[ID] >= 0 &&
                RUNTIME.cooldowns[ID] <= 10,
        );
    }
    ASSERT(
        Object.keys(RUNTIME.weights).length === BOSS_PATTERN_IDS.length &&
            Object.keys(RUNTIME.cooldowns).length === BOSS_PATTERN_IDS.length,
    );
    if (RUNTIME.active) {
        const A = RUNTIME.active;
        ASSERT(
            BOSS_PATTERN_IDS.includes(A.id) &&
                ['windup', 'active', 'recover'].includes(A.phase) &&
                Number.isFinite(A.phaseElapsed) &&
                A.phaseElapsed >= 0 &&
                Number.isFinite(A.aim) &&
                (A.targetId === 0 || VALID_BATTLE_UNIT_ID(A.targetId, raw.bossSummonSerial)) &&
                typeof A.locked === 'boolean' &&
                Array.isArray(A.hitIds) &&
                A.hitIds.length <= CONFIG.battle.capacity.battleUnits &&
                A.hitIds.every((id) => VALID_BATTLE_UNIT_ID(id, raw.bossSummonSerial)) &&
                new Set(A.hitIds).size === A.hitIds.length &&
                INTEGER(A.released, 0, 4) &&
                INTEGER(A.volleyCount, 0, 4),
        );
        if (A.target) {
            ASSERT(Number.isFinite(A.target.x) && Number.isFinite(A.target.y) && Number.isFinite(A.target.z));
        }
        if (A.path) {
            validatePath(A.path);
        }
    }
    return true;
}
function validatePath(p) {
    ASSERT(p && p.from && p.to && p.duration > 0 && Number.isFinite(p.height));
    for (const K of ['x', 'y']) {
        ASSERT(Number.isFinite(p.from[K]) && Number.isFinite(p.to[K]));
    }
    ASSERT(Number.isFinite(p.from.z));
}
