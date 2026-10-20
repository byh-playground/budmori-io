import { isValidFormationRuntime } from './formation-skill-state.js';
import { CONFIG } from './farm-model.js';
import { isValidPlayerProgressionState } from './player-progression.js';
import { hasUnitCapability, specialAbilityCompositionFor } from './unit-abilities.js';
import { mergeMaterialCostForTier } from './unit-grades.js';
import { BOSS_PATTERN_IDS } from './boss-patterns.js';
import { BOSS_REWARD_SETTINGS, bossStageStats } from './boss-rewards.js';
import { FACTION_CONFIG, hasFaction } from './factions.js';
import { FARM_SNAPSHOT_SHAPE as GARDEN_SHAPE, UNIT_SNAPSHOT_SHAPE as UNIT_SHAPE } from './farm-snapshot.js';
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
function finiteTree(v, depth = 0, key = '') {
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
            SAFE_COUNTERS.has(key)
                ? Number.isSafeInteger(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER
                : Number.isFinite(v) && Math.abs(v) < 1e13,
        );
    } else if (Array.isArray(v)) {
        const MAX =
            key === 'units'
                ? CONFIG.battle.capacity.battleUnits
                : key === 'projectiles'
                  ? CONFIG.battle.capacity.projectiles
                  : key === 'bossRewardReceipts' || key === 'processedBossKillReceipts'
                    ? 100000
                    : 1024;
        ASSERT(v.length <= MAX);
        v.forEach((x) => finiteTree(x, depth + 1));
    } else if (v && typeof v === 'object') {
        for (const [K, X] of Object.entries(v)) {
            ASSERT(!['__proto__', 'constructor', 'prototype'].includes(K));
            finiteTree(X, depth + 1, K);
        }
    } else {
        ASSERT(v === null || typeof v === 'boolean' || (typeof v === 'string' && v.length < 256));
    }
}
function shape(v, t, path = 'snapshot') {
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
function validWheatCommandBuffs(buffs) {
    return (
        Array.isArray(buffs) &&
        buffs.length <= 3 &&
        buffs.every(
            (buff) =>
                buff &&
                Number.isSafeInteger(buff.level) &&
                buff.level >= 0 &&
                buff.level <= 2 &&
                INTEGER(buff.expiresAtTick, 1, 1e12),
        ) &&
        new Set(buffs.map((buff) => buff.level)).size === buffs.length
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
    ASSERT(isValidPlayerProgressionState(raw.playerProgression));
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
                typeof REWARD.firstClear === 'boolean' &&
                !REWARD.firstClear,
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
            INTEGER(raw.foodTaps.remainder, 0, 4) &&
            raw.foodTaps.autoClock >= 0 &&
            raw.foodTaps.autoClock < 0.51,
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
            if (hasUnitCapability(U.species, 'repeatedStrike')) {
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
    const PROJECTILE_IDS = new Set();
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
    const ATTACHMENTS = new Set(),
        CORN_DEFINITION = CORN_ATTACHMENT_FEATURE.definition;
    ASSERT(
        INTEGER(raw.cornAttachments.nextGroupId, 1, 1e12) &&
            INTEGER(raw.cornAttachments.nextAttachmentId, 1, 1e12) &&
            Array.isArray(raw.cornAttachments.groups) &&
            raw.cornAttachments.groups.length <= CONFIG.battle.capacity.projectiles,
    );
    for (const GROUP of raw.cornAttachments.groups) {
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
            ASSERT(
                INTEGER(ATTACHMENT.id, 1, raw.cornAttachments.nextAttachmentId - 1) &&
                    !ATTACHMENTS.has(ATTACHMENT.id) &&
                    ATTACHMENT.groupId === GROUP.id &&
                    ATTACHMENT.targetId === GROUP.targetId &&
                    ATTACHMENT.targetGeneration === GROUP.targetGeneration &&
                    INTEGER(ATTACHMENT.ownerId, 1, 1e12) &&
                    INTEGER(ATTACHMENT.ownerGeneration, 1, 1e12) &&
                    Number.isFinite(ATTACHMENT.damageMultiplier) &&
                    ATTACHMENT.damageMultiplier >= 0.5 &&
                    ATTACHMENT.damageMultiplier <= 1 &&
                    ['attached', 'fading', 'removed'].includes(ATTACHMENT.status) &&
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
            raw.boss.radius === CONFIG.boss.radius &&
            raw.boss.height === CONFIG.boss.height &&
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
