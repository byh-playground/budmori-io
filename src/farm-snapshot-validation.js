import { CONFIG } from './farm-model.js';
import { isValidPlayerProgressionState } from './player-progression.js';
import { isValidAbilityRuntimeSnapshot } from './ability-state.js';
import { MAX_BEAN_SPLIT_CHILDREN } from './species-abilities.js';
import { hasUnitCapability } from './unit-abilities.js';
import { raidSettlementKey } from './raid-settlement.js';
import { mergeMaterialCostForTier } from './unit-grades.js';
import { BOSS_PATTERN_IDS } from './boss-patterns.js';
import { BOSS_REWARD_SETTINGS, bossStageStats } from './boss-rewards.js';
import { FACTION_CONFIG, hasFaction } from './factions.js';
import { FARM_SNAPSHOT_SHAPE as GARDEN_SHAPE, UNIT_SNAPSHOT_SHAPE as UNIT_SHAPE } from './farm-snapshot.js';
const INTEGER = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
const VALID_BATTLE_UNIT_ID = (id, bossSummonSerial) =>
    INTEGER(id, 1, CONFIG.farm.maxUnitId) ||
    INTEGER(id, CONFIG.boss.summonIdBase + 1, CONFIG.boss.summonIdBase + bossSummonSerial);
export { VALID_BATTLE_UNIT_ID as validBattleUnitId };
function assertSnapshot(ok) {
    if (!ok) {
        throw new TypeError('올바른 농장 저장 데이터가 아닙니다.');
    }
}
const ASSERT = assertSnapshot;
export { assertSnapshot };
function finiteTree(v, depth = 0, key = '') {
    ASSERT(depth < 18);
    if (typeof v === 'number') {
        ASSERT(Number.isFinite(v) && Math.abs(v) < 1e13);
    } else if (Array.isArray(v)) {
        const MAX =
            key === 'units'
                ? CONFIG.raid.capacity.battleUnits
                : key === 'projectiles'
                  ? CONFIG.raid.capacity.projectiles
                  : key === 'bossRewardReceipts' || key === 'processedBossKillReceipts'
                    ? 100000
                    : key === 'raidSettlementReceipts'
                      ? 128
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
function shape(v, t) {
    ASSERT(v !== null && typeof v === 'object' && !Array.isArray(v));
    ASSERT(Object.keys(v).length === Object.keys(t).length);
    for (const [K, X] of Object.entries(t)) {
        ASSERT(Object.hasOwn(v, K));
        if (X === null) {
            continue;
        }
        if (Array.isArray(X)) {
            ASSERT(Array.isArray(v[K]));
            continue;
        }
        if (typeof X === 'object') {
            shape(v[K], X);
        } else {
            ASSERT(typeof v[K] === typeof X);
        }
    }
}
export function validateSnapshot(raw) {
    finiteTree(raw);
    shape(raw, GARDEN_SHAPE);
    ASSERT(INTEGER(raw.seed, 0, 0xffffffff) && INTEGER(raw.rng.state, 0, 0xffffffff));
    ASSERT(['farm', 'raid'].includes(raw.scene) && ['breed', 'merge'].includes(raw.mode));
    if (raw.mergeTask !== null) {
        const T = raw.mergeTask;
        ASSERT(
            raw.scene === 'farm' &&
                raw.mode === 'merge' &&
                T &&
                ['approach', 'animation'].includes(T.phase) &&
                Number.isFinite(T.elapsed) &&
                T.elapsed >= 0 &&
                Number.isFinite(T.duration) &&
                T.duration > 0 &&
                T.duration <= CONFIG.farm.merge.animationSeconds + 1e-9 &&
                Array.isArray(T.materialIds) &&
                T.materialIds.length >= 2 &&
                T.materialIds.length <= CONFIG.farm.merge.maxMaterials &&
                new Set(T.materialIds).size === T.materialIds.length &&
                T.materialIds.every((id) => INTEGER(id, 1, CONFIG.farm.maxUnitId)),
        );
        if (T.phase === 'approach') {
            const MATERIALS = T.materialIds.map((id) => raw.units.find((u) => u.id === id)),
                FIRST = MATERIALS[0],
                COST = mergeMaterialCostForTier(FIRST?.tier + 1),
                SAME_SPECIES_COUNT = raw.units.filter(
                    (u) => !u.isBattleOnlySummon && u.species === FIRST?.species,
                ).length;
            ASSERT(
                INTEGER(T.aId, 1, CONFIG.farm.maxUnitId) &&
                    INTEGER(T.bId, 1, CONFIG.farm.maxUnitId) &&
                    T.aId === T.materialIds[0] &&
                    T.bId === T.materialIds[1] &&
                    COST === MATERIALS.length &&
                    FIRST &&
                    MATERIALS.every((u) => u && u.tier === FIRST.tier && u.species === FIRST.species) &&
                    SAME_SPECIES_COUNT - MATERIALS.length + 1 >= 2,
            );
        } else {
            const RESULT = raw.units.find((u) => u.id === T.resultId);
            ASSERT(
                T.aId === 0 &&
                    T.bId === 0 &&
                    T.elapsed <= T.duration + 1e-9 &&
                    INTEGER(T.resultId, 1, CONFIG.farm.maxUnitId) &&
                    RESULT &&
                    INTEGER(T.sourceSpecies, 0, CONFIG.unit.speciesCount - 1) &&
                    INTEGER(T.sourceTier, 1, CONFIG.unit.maxTier - 1) &&
                    RESULT.species === T.sourceSpecies &&
                    RESULT.tier === T.sourceTier + 1 &&
                    T.materialIds.length === mergeMaterialCostForTier(RESULT.tier),
            );
        }
    }
    ASSERT(
        raw.units.length <=
            (raw.scene === 'farm'
                ? raw.farmBossEvent?.phase === 'idle'
                    ? CONFIG.farm.capacity.max
                    : CONFIG.farm.capacity.battleUnits
                : CONFIG.raid.capacity.battleUnits) &&
            raw.food.length <= 140 &&
            raw.projectiles.length <= CONFIG.raid.capacity.projectiles,
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
                ? ['missed', 'pending', 'granted'].includes(FARM_EVENT.rewardStatus)
                : FARM_EVENT.rewardStatus === 'none',
        );
    }
    ASSERT(
        raw.bossRewardWatermarks &&
            INTEGER(raw.bossRewardWatermarks.farm, 0, 1e12) &&
            INTEGER(raw.bossRewardWatermarks.raid, 0, 1e12) &&
            raw.nextBossEncounterId > raw.bossRewardWatermarks.farm,
    );
    const REWARD_IDS = new Set();
    for (const REWARD of raw.bossRewardReceipts) {
        ASSERT(
            REWARD &&
                INTEGER(REWARD.encounterId, 1, 1e12) &&
                ['farm', 'raid'].includes(REWARD.source) &&
                REWARD.encounterId <= raw.bossRewardWatermarks[REWARD.source] &&
                INTEGER(REWARD.species, 0, CONFIG.unit.speciesCount - 1) &&
                INTEGER(REWARD.tier, 1, CONFIG.unit.maxTier) &&
                Number.isFinite(REWARD.x) &&
                Number.isFinite(REWARD.y) &&
                Number.isFinite(REWARD.chance) &&
                REWARD.chance >= 0 &&
                REWARD.chance <= 1 &&
                Number.isFinite(REWARD.roll) &&
                REWARD.roll >= 0 &&
                REWARD.roll < 1 &&
                ['pending', 'missed', 'granted'].includes(REWARD.status) &&
                INTEGER(REWARD.unitId, 0, CONFIG.farm.maxUnitId),
        );
        const KEY = REWARD.receiptKey || REWARD.source + ':' + REWARD.encounterId;
        ASSERT(!REWARD_IDS.has(KEY));
        REWARD_IDS.add(KEY);
        ASSERT((REWARD.status === 'granted') === REWARD.unitId > 0);
        if (REWARD.drops !== undefined) {
            ASSERT(
                Array.isArray(REWARD.drops) &&
                    REWARD.drops.length <= BOSS_REWARD_SETTINGS.maxStage &&
                    INTEGER(REWARD.rollCount, 0, BOSS_REWARD_SETTINGS.maxStage) &&
                    REWARD.drops.length === REWARD.rollCount,
            );
            for (const DROP of REWARD.drops) {
                ASSERT(
                    DROP &&
                        Number.isFinite(DROP.roll) &&
                        DROP.roll >= 0 &&
                        DROP.roll < 1 &&
                        ['pending', 'missed', 'granted'].includes(DROP.status) &&
                        INTEGER(DROP.unitId, 0, CONFIG.farm.maxUnitId) &&
                        (DROP.status === 'granted') === DROP.unitId > 0,
                );
            }
            ASSERT(
                REWARD.status ===
                    (REWARD.drops.some((drop) => drop.status === 'pending')
                        ? 'pending'
                        : REWARD.drops.some((drop) => drop.status === 'granted')
                          ? 'granted'
                          : 'missed'),
            );
        }
        if (REWARD.receiptKey !== undefined) {
            ASSERT(
                typeof REWARD.receiptKey === 'string' && REWARD.receiptKey.length > 0 && REWARD.receiptKey.length < 256,
            );
        }
        if (REWARD.acquisitionMultiplier !== undefined) {
            ASSERT(
                Number.isFinite(REWARD.acquisitionMultiplier) &&
                    REWARD.acquisitionMultiplier >= 0 &&
                    REWARD.acquisitionMultiplier <= 2,
            );
        }
        if (REWARD.source === 'farm' && REWARD.status === 'granted') {
            ASSERT(REWARD.unitId < raw.nextId);
        }
    }
    const STAGE_PROGRESS = raw.farmBossProgress;
    ASSERT(
        STAGE_PROGRESS &&
            INTEGER(STAGE_PROGRESS.currentStage, 1, BOSS_REWARD_SETTINGS.maxStage) &&
            INTEGER(STAGE_PROGRESS.encounterSeed, 0, 0xffffffff) &&
            INTEGER(STAGE_PROGRESS.encounterEpoch, 0, 1e12) &&
            INTEGER(STAGE_PROGRESS.nextSelectionId, 1, 1e12) &&
            Array.isArray(STAGE_PROGRESS.selections) &&
            STAGE_PROGRESS.selections.length <= BOSS_REWARD_SETTINGS.maxStage,
    );
    const STAGE_IDS = new Set(),
        SELECTION_IDS = new Set();
    for (const SELECTION of STAGE_PROGRESS.selections) {
        ASSERT(
            SELECTION &&
                INTEGER(SELECTION.stage, 1, BOSS_REWARD_SETTINGS.maxStage) &&
                INTEGER(SELECTION.species, 0, CONFIG.unit.speciesCount - 1) &&
                INTEGER(SELECTION.selectionId, 1, STAGE_PROGRESS.nextSelectionId - 1) &&
                !STAGE_IDS.has(SELECTION.stage) &&
                !SELECTION_IDS.has(SELECTION.selectionId),
        );
        STAGE_IDS.add(SELECTION.stage);
        SELECTION_IDS.add(SELECTION.selectionId);
    }
    ASSERT(
        INTEGER(raw.nextRaidRunSequence, 0, 1e12) &&
            INTEGER(raw.raidSettlementWatermark, 0, raw.nextRaidRunSequence) &&
            raw.nextRaidRunSequence >= raw.bossRewardWatermarks.raid &&
            raw.raidSettlementWatermark >= raw.bossRewardWatermarks.raid &&
            Array.isArray(raw.raidSettlementReceipts),
    );
    const ACTIVE_RAID = raw.activeRaidRunSequence,
        ACTIVE_SESSION = raw.activeRaidSessionId;
    ASSERT((ACTIVE_RAID === null) === (ACTIVE_SESSION === null));
    if (ACTIVE_RAID === null) {
        ASSERT(raw.nextRaidRunSequence === raw.raidSettlementWatermark);
    } else {
        ASSERT(
            INTEGER(ACTIVE_RAID, 1, 1e12) &&
                ACTIVE_RAID === raw.nextRaidRunSequence &&
                ACTIVE_RAID === raw.raidSettlementWatermark + 1 &&
                typeof ACTIVE_SESSION === 'string' &&
                ACTIVE_SESSION.trim().length > 0 &&
                ACTIVE_SESSION.length <= 128,
        );
    }
    const RAID_RECEIPT_KEYS = new Set();
    for (const RECEIPT of raw.raidSettlementReceipts) {
        ASSERT(
            RECEIPT &&
                typeof RECEIPT.ownerId === 'string' &&
                RECEIPT.ownerId.length > 0 &&
                typeof RECEIPT.sessionId === 'string' &&
                RECEIPT.sessionId.length > 0 &&
                INTEGER(RECEIPT.encounterId, 1, 1e12) &&
                INTEGER(RECEIPT.runSequence, 1, raw.raidSettlementWatermark) &&
                ['victory', 'defeat', 'aborted'].includes(RECEIPT.outcome),
        );
        ASSERT(
            RECEIPT.status === 'settled' &&
                RECEIPT.key ===
                    raidSettlementKey({
                        ownerId: RECEIPT.ownerId,
                        sessionId: RECEIPT.sessionId,
                        encounterId: RECEIPT.encounterId,
                    }) &&
                !RAID_RECEIPT_KEYS.has(RECEIPT.key) &&
                RECEIPT.runSequence <= raw.raidSettlementWatermark &&
                Array.isArray(RECEIPT.sleptFarmUnitIds) &&
                RECEIPT.sleptFarmUnitIds.every((id) => INTEGER(id, 1, CONFIG.farm.maxUnitId)) &&
                new Set(RECEIPT.sleptFarmUnitIds).size === RECEIPT.sleptFarmUnitIds.length &&
                INTEGER(RECEIPT.availableAtStart, 0, CONFIG.raid.capacity.playerUnits) &&
                INTEGER(RECEIPT.originalUnitsDeployed, 0, RECEIPT.availableAtStart) &&
                Number.isFinite(RECEIPT.deploymentMultiplier) &&
                RECEIPT.deploymentMultiplier >= 0 &&
                RECEIPT.deploymentMultiplier <= 2 &&
                (RECEIPT.completedAtMs === null ||
                    (Number.isFinite(RECEIPT.completedAtMs) && RECEIPT.completedAtMs >= 0)) &&
                (RECEIPT.reward === null ||
                    (RECEIPT.reward && typeof RECEIPT.reward === 'object' && !Array.isArray(RECEIPT.reward))),
        );
        RAID_RECEIPT_KEYS.add(RECEIPT.key);
    }
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
    ASSERT(
        Array.isArray(raw.raidExpectedPlayers) &&
            raw.raidExpectedPlayers.length >= 1 &&
            raw.raidExpectedPlayers.length <= CONFIG.raid.capacity.players &&
            raw.raidExpectedPlayers.every((p) => typeof p === 'string' && p.length > 0) &&
            new Set(raw.raidExpectedPlayers).size === raw.raidExpectedPlayers.length &&
            Array.isArray(raw.raidRosters),
    );
    const ROSTER_OWNERS = new Set(),
        MANIFEST = new Set();
    for (const R of raw.raidRosters) {
        ASSERT(
            raw.raidExpectedPlayers.includes(R.ownerId) &&
                !ROSTER_OWNERS.has(R.ownerId) &&
                Array.isArray(R.troops) &&
                R.troops.length <= CONFIG.raid.capacity.playerUnits &&
                isValidAbilityRuntimeSnapshot(R.abilitySnapshot),
        );
        ASSERT(
            typeof R.settlementSessionId === 'string' &&
                R.settlementSessionId.length <= 128 &&
                INTEGER(R.settlementRunSequence, 0, 1e12) &&
                INTEGER(R.settlementEncounterId, 0, 1e12),
        );
        ASSERT(
            R.settlementRunSequence === 0
                ? R.settlementSessionId === '' && R.settlementEncounterId === 0
                : R.settlementSessionId.trim().length > 0 && R.settlementEncounterId === R.settlementRunSequence,
        );
        ROSTER_OWNERS.add(R.ownerId);
        const IDS = new Set();
        for (const T of R.troops) {
            ASSERT(
                INTEGER(T.farmId, 1, CONFIG.farm.maxUnitId) &&
                    INTEGER(T.species, 0, CONFIG.unit.speciesCount - 1) &&
                    INTEGER(T.tier, 1, CONFIG.unit.maxTier) &&
                    typeof T.deployed === 'boolean' &&
                    !IDS.has(T.farmId),
            );
            IDS.add(T.farmId);
            MANIFEST.add(R.ownerId + ':' + T.farmId);
        }
        ASSERT(
            INTEGER(R.lastDeploySequence, 0, R.troops.length) &&
                R.lastDeploySequence === R.troops.filter((t) => t.deployed).length &&
                Number.isFinite(R.buffUntil) &&
                Number.isFinite(R.buffReadyAt) &&
                R.buffUntil >= 0 &&
                R.buffReadyAt >= 0,
        );
    }
    ASSERT(MANIFEST.size <= CONFIG.raid.capacity.units);
    const IDS = new Set(),
        DEPLOYED = new Set(),
        MATE_ID_LIMIT =
            raw.scene === 'raid'
                ? CONFIG.raid.capacity.players * CONFIG.raid.ids.playerStride + CONFIG.raid.capacity.playerUnits
                : CONFIG.farm.maxUnitId;
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
                U.barleyArmorBreakReduction <= 0.75,
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
                typeof U.walnutEmpoweredNextBasic === 'boolean' &&
                INTEGER(U.chestnutBasicCycles, 0, 1e12),
        );
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
            if (hasFaction(U, FACTION_CONFIG.PLAYER) && U.battleSummonKind === 'pea-death-split') {
                ASSERT(
                    ['farm', 'raid'].includes(raw.scene) &&
                        INTEGER(U.battleSummonParentId, 1, Number.MAX_SAFE_INTEGER) &&
                        U.battleSummonEncounterId === 0 &&
                        hasUnitCapability(U.species, 'deathSplit') &&
                        U.tier === 1 &&
                        U.canSplit === false &&
                        U.countsTowardPermanentRoster === false &&
                        U.eligibleForRaidDeployment === false &&
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
                        hasUnitCapability(PARENT.species, 'deathSplit') &&
                        PARENT.species === U.species &&
                        PARENT.splitUsedThisBattle &&
                        PARENT.ownerId === U.ownerId &&
                        PARENT.farmId === U.farmId,
                );
                const LIST = SUMMONS_BY_PARENT.get(PARENT.id) || [];
                LIST.push(U);
                SUMMONS_BY_PARENT.set(PARENT.id, LIST);
                if (raw.scene === 'raid') {
                    ASSERT(
                        U.id >= CONFIG.raid.ids.summonBase &&
                            U.id < CONFIG.raid.ids.summonBase + CONFIG.raid.capacity.battleUnits &&
                            raw.raidExpectedPlayers.includes(U.ownerId) &&
                            INTEGER(U.farmId, 1, CONFIG.farm.maxUnitId),
                    );
                } else {
                    ASSERT(INTEGER(U.id, 1, raw.nextId - 1) && raw.farmBossEvent.phase !== 'idle');
                }
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
                        U.eligibleForRaidDeployment === false &&
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
                ASSERT(raw.scene === 'raid' ? raw.running && raw.boss.active : raw.farmBossEvent.phase === 'fighting');
            }
        } else {
            ASSERT(
                U.battleSummonKind === '' &&
                    U.battleSummonParentId === 0 &&
                    U.battleSummonEncounterId === 0 &&
                    U.countsTowardPermanentRoster === true &&
                    U.eligibleForRaidDeployment === true &&
                    U.breedingEligible === true &&
                    U.mergeEligible === true &&
                    U.canSplit === true &&
                    U.usesPersistentSleep === true &&
                    U.lifetime === '',
            );
            if (raw.scene === 'raid') {
                const ROSTER = raw.raidRosters.find((r) => r.ownerId === U.ownerId),
                    TROOP_INDEX = ROSTER?.troops.findIndex((t) => t.farmId === U.farmId) ?? -1,
                    SLOT = raw.raidExpectedPlayers.indexOf(U.ownerId),
                    CURRENT_ID = (SLOT + 1) * CONFIG.raid.ids.playerStride + TROOP_INDEX + 1,
                    LEGACY_ID = (SLOT + 1) * CONFIG.raid.ids.playerStride + U.farmId;
                ASSERT(
                    raw.raidExpectedPlayers.includes(U.ownerId) &&
                        INTEGER(U.farmId, 1, CONFIG.farm.maxUnitId) &&
                        MANIFEST.has(U.ownerId + ':' + U.farmId) &&
                        !DEPLOYED.has(U.ownerId + ':' + U.farmId) &&
                        (U.id === CURRENT_ID || (U.farmId <= CONFIG.farm.capacity.max && U.id === LEGACY_ID)),
                );
                DEPLOYED.add(U.ownerId + ':' + U.farmId);
            } else {
                ASSERT(INTEGER(U.id, 1, raw.nextId - 1));
            }
        }
        if (U.ability.action) {
            const A = U.ability.action;
            ASSERT(
                INTEGER(A.id, 1, raw.attackSerial) &&
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
            if (hasUnitCapability(U.species, 'guard')) {
                ASSERT(typeof A.walnutEmpowered === 'boolean' && typeof A.walnutGuardUsed === 'boolean');
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
                ASSERT(A.projectileAbility && Object.hasOwn(A.projectileAbility, 'popcorn'));
                if (A.projectileAbility.popcorn) {
                    validatePopcornConfig(A.projectileAbility.popcorn);
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
        ASSERT(CHILDREN.length <= MAX_BEAN_SPLIT_CHILDREN);
        const PARENT = UNITS_BY_ID.get(PARENT_ID);
        ASSERT(PARENT && PARENT.ownerId === CHILDREN[0].ownerId && PARENT.farmId === CHILDREN[0].farmId);
    }
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
            INTEGER(
                P.owner,
                1,
                raw.scene === 'raid'
                    ? CONFIG.raid.ids.summonBase + CONFIG.raid.capacity.battleUnits - 1
                    : raw.nextId - 1,
            ) || INTEGER(P.owner, CONFIG.boss.summonIdBase + 1, CONFIG.boss.summonIdBase + raw.bossSummonSerial),
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
        if (P.isPopcorn) {
            ASSERT(
                typeof P.landed === 'boolean' &&
                    typeof P.exploded === 'boolean' &&
                    Array.isArray(P.damagedTargetIds) &&
                    P.damagedTargetIds.length <= CONFIG.raid.capacity.battleUnits + 1 &&
                    P.damagedTargetIds.every((id) => id === 'boss' || VALID_BATTLE_UNIT_ID(id, raw.bossSummonSerial)) &&
                    new Set(P.damagedTargetIds).size === P.damagedTargetIds.length &&
                    Number.isFinite(P.fuseRemaining) &&
                    P.fuseRemaining >= 0 &&
                    P.fuseRemaining <= 1.01,
            );
            validatePopcornConfig(P.popcornConfig);
            if (P.exploded) {
                ASSERT(Number.isFinite(P.explosionLife) && P.explosionLife >= 0 && P.explosionLife < 0.5 + 1e-9);
            }
        }
    }
    ASSERT(
        INTEGER(raw.projectileSerial, 0, 1e12) &&
            INTEGER(raw.raidSummonSerial, 0, CONFIG.raid.capacity.battleUnits) &&
            INTEGER(raw.bossSummonSerial, 0, 1e12),
    );
    ASSERT(
        hasFaction(raw.boss, FACTION_CONFIG.ENEMY) &&
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
            raw.boss.barleyArmorBreakReduction <= 0.75,
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
                A.hitIds.length <= CONFIG.raid.capacity.battleUnits &&
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
    ASSERT(['idle', 'fighting', 'victory', 'defeat'].includes(raw.encounter.outcome) && raw.encounter.elapsed >= 0);
    ASSERT(raw.running === (raw.encounter.outcome === 'fighting'));
    ASSERT(
        typeof raw.raidDeploymentStarted === 'boolean' &&
            (!raw.raidDeploymentStarted || raw.raidRosters.length === raw.raidExpectedPlayers.length),
    );
    return true;
}
function validatePath(p) {
    ASSERT(p && p.from && p.to && p.duration > 0 && Number.isFinite(p.height));
    for (const K of ['x', 'y']) {
        ASSERT(Number.isFinite(p.from[K]) && Number.isFinite(p.to[K]));
    }
    ASSERT(Number.isFinite(p.from.z));
}
function validatePopcornConfig(c) {
    ASSERT(
        c &&
            c.species === 1 &&
            c.fuseSeconds === 1 &&
            c.chainOnPopcornContact === true &&
            c.triggersOncePerProjectile === true &&
            c.eachTargetAtMostOncePerProjectile === true &&
            Number.isFinite(c.damageMultiplier) &&
            c.damageMultiplier >= 0.5 &&
            c.damageMultiplier <= 1.5 &&
            c.radiusBaseRangeFraction === 0.25 &&
            Number.isFinite(c.radiusMultiplier) &&
            c.radiusMultiplier >= 1 &&
            c.radiusMultiplier <= 2 &&
            Number.isFinite(c.radius) &&
            c.radius > 0 &&
            c.radius <= 10,
    );
}
