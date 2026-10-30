import {
    TEMPERAMENT_COUNT,
    SEED_FEEDS,
    SEED_FEED_COOLDOWN_SECONDS,
    isValidGenes,
    isValidCombine,
    isValidCodex,
    recipeFor,
} from '../model/lineage.js';
import { isWheatAttackRecord } from '../features/species-growth/wheat-attack.js';
import { isBarleyAttackRecord } from '../features/species-growth/barley-attack.js';
import { isRiceAttackRecord } from '../features/species-growth/rice-attack.js';
import { isWalnutAttackRecord } from '../features/species-growth/walnut-attack.js';
import { isPeanutAttackRecord } from '../features/species-growth/peanut-attack.js';
import { isChestnutAttackRecord } from '../features/species-growth/chestnut-attack.js';
import { isRedbeanAttackRecord } from '../features/species-growth/redbean-attack.js';
import { isPeaAttackRecord } from '../features/species-growth/pea-attack.js';
import { isValidFormationRuntime } from '../formation/formation-skill-state.js';
import { CONFIG } from '../model/farm-model.js';
import { validateFoodRuntime } from '../features/farm-modes/food-reservations/checkpoint.js';
import { isValidPlayerProgressionState, FARM_BOSS_EVENT_MAX_STAGE } from '../model/player-progression.js';
import { hasUnitCapability, specialAbilityCompositionFor } from '../units/unit-abilities.js';
import { kitSpecies } from '../units/species-catalog.js';
import { mergeMaterialCostForTier } from '../units/unit-grades.js';
import { BOSS_PATTERN_IDS, BOSS_PATTERN_CONFIG } from '../boss/boss-patterns.js';
import { BOSS_REWARD_SETTINGS, bossStageStats } from '../boss/boss-rewards.js';
import { resolveUnitStats } from '../units/unit-stats.js';
import { FACTION_CONFIG, hasFaction } from '../core/factions.js';
import {
    FARM_SNAPSHOT_SHAPE as GARDEN_SHAPE,
    UNIT_SNAPSHOT_SHAPE as UNIT_SHAPE,
    BOSS_SNAPSHOT_SHAPE,
} from './farm-snapshot.js';
import { attackGeometryScale } from '../features/species-growth/attack-profile.js';
import { isBossActorId } from '../core/combat-identity.js';
import { attackTargetKey } from '../features/species-growth/attack-action.js';
import { isCornAttackRecord, cornKernelMultiplier } from '../features/species-growth/corn-attack.js';
import { CORN_ATTACHMENT_FEATURE } from '../features/abilities/corn-attachment/definition.js';
import {
    BARLEY_ARMOR_SHRED_BUCKETS,
    BARLEY_ARMOR_SHRED_LEGACY_DURATION_TICKS,
    BARLEY_ARMOR_SHRED_MAX_DURATION_TICKS,
} from '../features/abilities/barley-shred/model.js';
const INTEGER = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= min && v <= max;
const VALID_BATTLE_UNIT_ID = (id, bossSummonSerial) =>
    INTEGER(id, 1, CONFIG.farm.maxUnitId) ||
    INTEGER(id, CONFIG.boss.summonIdBase + 1, CONFIG.boss.summonIdBase + bossSummonSerial);
function validActorId(raw, id) {
    return raw.bosses.some((boss) => boss.id === id) || VALID_BATTLE_UNIT_ID(id, raw.bossSummonSerial);
}
function assertSnapshot(ok) {
    if (!ok) {
        throw new TypeError('올바른 농장 저장 데이터가 아니에요.');
    }
}
const ASSERT = assertSnapshot;
const MAX_PEANUT_SPLIT_CHILDREN = 2;
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
                ? CONFIG.farm.capacity.battleUnits
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
function validateAttackCycle(cycle) {
    shape(cycle, UNIT_SHAPE.ability, 'actor.attackCycle');
    ASSERT(
        cycle.interruptedRecoverySeconds === null ||
            (cycle.phase === 'recover' &&
                cycle.action === null &&
                Number.isFinite(cycle.interruptedRecoverySeconds) &&
                cycle.interruptedRecoverySeconds > 0 &&
                cycle.interruptedRecoverySeconds <= 100000),
    );
    const AIM = cycle.action?.prepareAim;
    if (AIM !== undefined) {
        ASSERT(
            AIM &&
                Object.keys(AIM).sort().join(',') === 'locked,originX,originY,radius,reacquired,startX,startY,x,y' &&
                ['originX', 'originY', 'startX', 'startY', 'x', 'y', 'radius'].every((key) =>
                    Number.isFinite(AIM[key]),
                ) &&
                AIM.radius >= 0 &&
                typeof AIM.reacquired === 'boolean' &&
                typeof AIM.locked === 'boolean' &&
                (cycle.phase === 'windup' || AIM.locked),
        );
    }
}
function validateProgression(progression) {
    ASSERT(isValidPlayerProgressionState(progression));
}
function validWheatCommandBuffs(buffs, tick) {
    return (
        Array.isArray(buffs) &&
        buffs.length <= 66 &&
        buffs.every(
            (buff) =>
                buff &&
                Object.keys(buff).every((key) =>
                    ['level', 'bonus', 'tier', 'powerRank', 'appliedAtTick', 'expiresAtTick'].includes(key),
                ) &&
                Number.isSafeInteger(buff.level) &&
                buff.level >= 0 &&
                buff.level <= (buff.bonus === undefined ? 2 : 5) &&
                (buff.tier === undefined || (INTEGER(buff.tier, 1, 6) && buff.bonus !== undefined)) &&
                (buff.powerRank === undefined || (INTEGER(buff.powerRank, 0, 10) && buff.bonus !== undefined)) &&
                (buff.bonus === undefined ||
                    buff.bonus === (0.5 + 0.125 * buff.level) * (1 + 0.03 * (buff.powerRank ?? 0))) &&
                (buff.appliedAtTick === undefined ||
                    (INTEGER(buff.appliedAtTick, 0, tick) &&
                        buff.appliedAtTick < buff.expiresAtTick &&
                        buff.expiresAtTick - buff.appliedAtTick <= 360)) &&
                INTEGER(buff.expiresAtTick, 1, 1e12),
        ) &&
        new Set(buffs.map((buff) => buff.bonus ?? [0.5, 0.75, 1.125][buff.level])).size === buffs.length
    );
}
function validBarleyArmorShredBuckets(buckets, tick, allowLegacy) {
    const LEGACY = allowLegacy && buckets?.length === BARLEY_ARMOR_SHRED_LEGACY_DURATION_TICKS;
    const SIZE = LEGACY ? BARLEY_ARMOR_SHRED_LEGACY_DURATION_TICKS : BARLEY_ARMOR_SHRED_BUCKETS;
    const HORIZON = LEGACY ? BARLEY_ARMOR_SHRED_LEGACY_DURATION_TICKS : BARLEY_ARMOR_SHRED_MAX_DURATION_TICKS;
    return (
        Array.isArray(buckets) &&
        buckets.length === SIZE &&
        Array.from(buckets).every(
            (bucket, index) =>
                bucket &&
                Object.keys(bucket).length === 2 &&
                Object.hasOwn(bucket, 'expiresAtTick') &&
                Object.hasOwn(bucket, 'amount') &&
                INTEGER(bucket.expiresAtTick, 0, 1e12) &&
                Number.isFinite(bucket.amount) &&
                bucket.amount >= 0 &&
                (bucket.expiresAtTick === 0
                    ? bucket.amount === 0
                    : bucket.amount > 0 &&
                      bucket.expiresAtTick % SIZE === index &&
                      bucket.expiresAtTick <= tick + HORIZON),
        )
    );
}
function validateActorAttackState(actor, raw, cornActions, chestnutActions, allowLegacyBarleyShred) {
    const U = actor;
    validateAttackCycle(U.ability);
    ASSERT(
        Number.isFinite(U.landingRecovery) &&
            U.landingRecovery >= 0 &&
            U.landingRecovery <= 0.25 + 1e-9 &&
            INTEGER(U.generation, 1, 1e12) &&
            Number.isFinite(U.permanentStatMultiplier) &&
            U.permanentStatMultiplier >= 1 &&
            U.permanentStatMultiplier <= 2.25 &&
            Number.isFinite(U.growthMaxHpMultiplier) &&
            (U.growthMaxHpMultiplier === 1 ||
                ((kitSpecies(U) === 2 ||
                    kitSpecies(U) === 3 ||
                    kitSpecies(U) === 4 ||
                    kitSpecies(U) === 5 ||
                    kitSpecies(U) === 6 ||
                    kitSpecies(U) === 7 ||
                    kitSpecies(U) === 8) &&
                    !U.isBattleOnlySummon &&
                    !U.isFormationClone &&
                    hasFaction(U, FACTION_CONFIG.PLAYER) &&
                    U.growthMaxHpMultiplier >= 1 &&
                    U.growthMaxHpMultiplier <= 1.4 &&
                    Math.abs((U.growthMaxHpMultiplier - 1) / 0.04 - Math.round((U.growthMaxHpMultiplier - 1) / 0.04)) <
                        1e-9)) &&
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
            validWheatCommandBuffs(U.wheatCommandBuffs, raw.simulationTick) &&
            validBarleyArmorShredBuckets(U.barleyArmorShredBuckets, raw.simulationTick, allowLegacyBarleyShred),
    );
    ASSERT(
        INTEGER(U.species, 0, CONFIG.unit.speciesCount - 1) &&
            INTEGER(U.tier, 1, CONFIG.unit.maxTier) &&
            ['idle', 'windup', 'active', 'recover'].includes(U.ability.phase) &&
            typeof U.ownerId === 'string' &&
            Number.isSafeInteger(U.farmId) &&
            Object.values(FACTION_CONFIG).includes(U.faction) &&
            typeof U.isBattleOnlySummon === 'boolean' &&
            typeof U.splitUsedThisBattle === 'boolean' &&
            typeof U.deathSplitHandled === 'boolean' &&
            INTEGER(U.peanutInheritedPowerRank, 0, 10) &&
            INTEGER(U.peanutInheritedSpeedRank, 0, 10) &&
            INTEGER(U.chestnutNextThornTick, 0, 1e12),
    );
    ASSERT(!!specialAbilityCompositionFor(kitSpecies(U)) === (U.specialAbility !== null));
    if (U.specialAbility) {
        validateAttackCycle(U.specialAbility);
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
                kitSpecies(U) === 4 &&
                    isPeanutAttackRecord(R) &&
                    R.id === A.id &&
                    R.owner === U.id &&
                    R.ownerGeneration === U.generation &&
                    R.tier === U.tier &&
                    R.child === U.isBattleOnlySummon &&
                    (!R.child ||
                        (R.ranks.power === U.peanutInheritedPowerRank &&
                            R.budgetInputs.speedRank === U.peanutInheritedSpeedRank)) &&
                    U.hp > 0 &&
                    (R.launchTick === null
                        ? U.ability.phase === 'windup' && A.path === null
                        : (U.ability.phase === 'active' || U.ability.phase === 'recover') &&
                          R.launchTick <= raw.simulationTick &&
                          R.motionTick ===
                              (U.ability.phase === 'recover' ? 10 : Math.min(10, Math.round(U.ability.elapsed * 20))) &&
                          A.path?.duration === R.durationSeconds &&
                          A.path.height === 0 &&
                          A.path.from.z === 0 &&
                          [A.path.from.x, A.path.from.y].every((v) => Number.isFinite(v) && Math.abs(v) <= 100) &&
                          sameCheckpointValue(A.path.from, A.path.to)) &&
                    R.targetId === A.targetId &&
                    R.targetGeneration === A.targetGeneration,
            );
        }
        if (A.walnutAttack !== undefined) {
            const R = A.walnutAttack;
            ASSERT(
                kitSpecies(U) === 5 &&
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
                              (U.ability.phase === 'recover' ? 10 : Math.min(10, Math.round(U.ability.elapsed * 20))) &&
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
                kitSpecies(U) === 6 &&
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
                                  : Math.min(Math.round(R.durationSeconds * 20), Math.round(U.ability.elapsed * 20))) &&
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
                kitSpecies(U) === 7 &&
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
                                  : Math.min(Math.round(R.durationSeconds * 20), Math.round(U.ability.elapsed * 20))) &&
                          A.path?.duration === R.durationSeconds &&
                          A.path.height === 0 &&
                          sameCheckpointValue(A.path.from, R.origin) &&
                          sameCheckpointValue(A.path.to, R.origin)) &&
                    R.targetId === A.targetId &&
                    R.targetGeneration === A.targetGeneration,
            );
        }
        if (A.barleyAttack !== undefined) {
            const R = A.barleyAttack;
            ASSERT(
                kitSpecies(U) === 8 &&
                    isBarleyAttackRecord(R) &&
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
                                  : Math.min(Math.round(R.durationSeconds * 20), Math.round(U.ability.elapsed * 20))) &&
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
                kitSpecies(U) === 2 &&
                    isRedbeanAttackRecord(A.redbeanAttack) &&
                    A.redbeanAttack.id === A.id &&
                    A.redbeanAttack.owner === U.id &&
                    A.redbeanAttack.ownerGeneration === U.generation &&
                    A.redbeanAttack.tier === U.tier,
            );
        }
        if (A.peaAttack !== undefined) {
            ASSERT(
                kitSpecies(U) === 0 &&
                    isPeaAttackRecord(A.peaAttack) &&
                    A.peaAttack.id === A.id &&
                    A.peaAttack.owner === U.id &&
                    A.peaAttack.ownerGeneration === U.generation &&
                    A.peaAttack.tier === U.tier,
            );
        }
        if (A.chestnutAttack !== undefined) {
            const R = A.chestnutAttack,
                C = chestnutActions.get(A.id);
            ASSERT(
                kitSpecies(U) === 3 &&
                    isChestnutAttackRecord(R, { pending: true }) &&
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
            const CANONICAL = cornActions.get(A.id);
            ASSERT(
                A.cornAttack.launchTick === null
                    ? !CANONICAL &&
                          Object.keys(A.cornAttack.criticalRolls).length === 0 &&
                          A.cornAttack.firstAttachTick === null
                    : CANONICAL && sameCheckpointValue(A.cornAttack, CANONICAL),
            );
            ASSERT(
                kitSpecies(U) === 1 &&
                    isCornAttackRecord(A.cornAttack, { pending: true }) &&
                    A.cornAttack.id === A.id &&
                    A.cornAttack.owner === U.id &&
                    A.cornAttack.ownerGeneration === U.generation &&
                    A.cornAttack.tier === U.tier,
            );
        }
        if (hasUnitCapability(kitSpecies(U), 'repeatedStrike') && !A.peanutAttack) {
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
                INTEGER(A.resolvedMask, 0, MASK) && INTEGER(A.hitMask, 0, MASK) && (A.hitMask & ~A.resolvedMask) === 0,
            );
        }
        if (kitSpecies(U) === 3 && A.thornShotsRemaining !== undefined) {
            ASSERT(
                INTEGER(A.thornTargetGeneration, 1, 1e12) &&
                    validActorId(raw, A.thornTargetId) &&
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
    ASSERT(Number.isFinite(U.ability.elapsed) && U.ability.elapsed >= 0);
}
// Root identity, tower checkpoint and formation runtime.
function validateRootFields(raw) {
    finiteTree(raw);
    shape(raw, GARDEN_SHAPE);
    ASSERT(
        Array.isArray(raw.bosses) &&
            raw.bosses.length >= 1 &&
            raw.bosses.length <= 5 &&
            raw.bosses[0].id === 'boss' &&
            new Set(raw.bosses.map((boss) => boss.id)).size === raw.bosses.length,
    );
    validateTowerCheckpoint(raw);

    ASSERT(isValidFormationRuntime(raw.formationRuntime));
    const CAST = raw.formationRuntime.bossCast;
    if (CAST) {
        ASSERT(raw.bosses.some((boss) => boss.id === CAST.casterId && boss.generation === CAST.casterGeneration));
    }
    for (const EFFECT of raw.formationRuntime.effects) {
        if (EFFECT.role === 'boss') {
            ASSERT(
                raw.bosses.some((boss) => boss.id === EFFECT.casterId && boss.generation === EFFECT.casterGeneration),
            );
        }
    }
    ASSERT(
        INTEGER(raw.seed, 0, 0xffffffff) &&
            INTEGER(raw.rng.state, 0, 0xffffffff) &&
            INTEGER(raw.simulationTick, 0, 1e12),
    );
    ASSERT(raw.scene === 'farm');
    ASSERT(Array.isArray(raw.mergeTasks) && raw.mergeTasks.length <= CONFIG.farm.capacity.battleUnits);
    ASSERT(isValidCombine(raw.combine) && isValidCodex(raw.codex));
}
// Chestnut and corn attack records.
function validateAttackRecords(raw) {
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
    return { CHESTNUT_ACTIONS, CORN_ACTIONS };
}
// Pending merge tasks and their material costs.
function validateMergeTasks(raw) {
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
        ASSERT(INTEGER(T.partnerSpecies, -1, CONFIG.unit.speciesCount - 1));
        if (T.phase === 'approach') {
            const MATERIALS = T.materialIds.map((id) => raw.units.find((u) => u.id === id)),
                FIRST = MATERIALS[0],
                COMBINE = T.partnerSpecies >= 0,
                COST = COMBINE ? 2 : mergeMaterialCostForTier(FIRST?.tier + 1);
            ASSERT(
                INTEGER(T.aId, 1, CONFIG.farm.maxUnitId) &&
                    INTEGER(T.bId, 1, CONFIG.farm.maxUnitId) &&
                    T.aId === T.materialIds[0] &&
                    T.bId === T.materialIds[1] &&
                    COST === MATERIALS.length &&
                    FIRST &&
                    INTEGER(T.sourceSpecies, 0, CONFIG.unit.speciesCount - 1) &&
                    INTEGER(T.sourceTier, 1, CONFIG.unit.maxTier) &&
                    T.sourceSpecies === FIRST.species &&
                    T.sourceTier === FIRST.tier &&
                    (COMBINE
                        ? MATERIALS[1] &&
                          MATERIALS[1].species === T.partnerSpecies &&
                          recipeFor(FIRST.species, T.partnerSpecies) !== null &&
                          MATERIALS.every((u) => u && u.tier === FIRST.tier)
                        : MATERIALS.every((u) => u && u.tier === FIRST.tier && u.species === FIRST.species)) &&
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
            if (COMBINE) {
                PENDING_MERGE_COST[FIRST.species] += 1;
                PENDING_MERGE_COST[T.partnerSpecies] += 1;
            } else {
                PENDING_MERGE_COST[FIRST.species] += MATERIALS.length - 1;
            }
        } else {
            const RESULT = raw.units.find((u) => u.id === T.resultId);
            ASSERT(
                T.aId === 0 &&
                    T.bId === 0 &&
                    INTEGER(T.resultId, 1, CONFIG.farm.maxUnitId) &&
                    !MERGE_TASK_UNIT_IDS.has(T.resultId) &&
                    RESULT &&
                    INTEGER(T.sourceSpecies, 0, CONFIG.unit.speciesCount - 1) &&
                    INTEGER(T.sourceTier, 1, CONFIG.unit.maxTier) &&
                    (T.partnerSpecies >= 0
                        ? RESULT.species === recipeFor(T.sourceSpecies, T.partnerSpecies)?.result &&
                          RESULT.tier === T.sourceTier &&
                          T.materialIds.length === 2
                        : RESULT.species === T.sourceSpecies &&
                          RESULT.tier === T.sourceTier + 1 &&
                          T.materialIds.length === mergeMaterialCostForTier(RESULT.tier)),
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
            ['idle', 'marching', 'dropping', 'fighting', 'celebrating', 'fading'].includes(raw.farmBossEvent.phase) &&
            ['idle', 'fighting', 'victory', 'defeat'].includes(raw.farmBossEvent.outcome) &&
            Number.isFinite(raw.farmBossEvent.elapsed) &&
            raw.farmBossEvent.elapsed >= 0,
    );
}
// Player progression and food counters.
function validateProgressionState(raw) {
    ASSERT(INTEGER(raw.nextBossEncounterId, 1, 1e12) && Array.isArray(raw.bossRewardReceipts));
    validateProgression(raw.playerProgression);
    if (raw.runProgressionSnapshot !== null) {
        validateProgression(raw.runProgressionSnapshot);
    }
    ASSERT(Array.isArray(raw.food) && raw.food.length <= 140);
}
// The farm boss event phases.
function validateFarmBossEvent(raw) {
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
            ASSERT(raw.bosses.every((boss) => !boss.active));
        }
    } else if (FARM_EVENT.phase === 'marching') {
        ASSERT(raw.tower.active && FARM_EVENT.outcome === 'fighting');
    } else if (FARM_EVENT.phase === 'dropping' || FARM_EVENT.phase === 'fighting') {
        ASSERT(
            raw.scene === 'farm' &&
                FARM_EVENT.outcome === 'fighting' &&
                raw.bosses.some((boss) => boss.active) &&
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
                raw.bosses.every((boss) => !boss.active) &&
                INTEGER(FARM_EVENT.encounterId, 1, raw.nextBossEncounterId - 1),
        );
        ASSERT(
            FARM_EVENT.outcome === 'victory'
                ? raw.bosses.every((boss) => boss.hp === 0)
                : raw.bosses.some((boss) => boss.hp > 0),
        );
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
    return { FARM_EVENT };
}
// Boss reward streams, inventory and receipts.
function validateBossRewards(raw, context) {
    const { FARM_EVENT } = context;
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
                (RECEIPT.roll ?? 0) === FARM_EVENT.rewardRoll &&
                RECEIPT.unitId === FARM_EVENT.rewardUnitId,
        );
    }
}
// Counters, the live roster, boss summons and generations.
function validateUnits(raw, context, allowLegacyBarleyShred) {
    const { CHESTNUT_ACTIONS, CORN_ACTIONS } = context;
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
                INTEGER(U.battleSummonEncounterId, 0, 1e12),
        );
        ASSERT(typeof U.dropLanded === 'boolean' && INTEGER(U.battleSummonParentGeneration, 0, 1e12));
        ASSERT(INTEGER(U.temperament, 0, TEMPERAMENT_COUNT - 1) && isValidGenes(U.genes));
        if (U.seedling !== null) {
            ASSERT(
                U.seedling &&
                    typeof U.seedling === 'object' &&
                    Object.keys(U.seedling).length === 2 &&
                    INTEGER(U.seedling.fed, 0, SEED_FEEDS - 1) &&
                    Number.isFinite(U.seedling.cooldown) &&
                    U.seedling.cooldown >= 0 &&
                    U.seedling.cooldown <= SEED_FEED_COOLDOWN_SECONDS + 1e-9 &&
                    U.growthElapsed < U.growthDuration - 1e-9 &&
                    !U.isBattleOnlySummon,
            );
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
        if (!U.isBattleOnlySummon || U.battleSummonKind !== 'peanut-death-split') {
            ASSERT(U.peanutInheritedPowerRank === 0 && U.peanutInheritedSpeedRank === 0);
        }
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
                        raw.bosses.some(
                            (boss) => boss.encounterId === U.battleSummonEncounterId && boss.species === U.species,
                        ) &&
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
        validateActorAttackState(U, raw, CORN_ACTIONS, CHESTNUT_ACTIONS, allowLegacyBarleyShred);
    }
    for (const BOSS of raw.bosses) {
        validateActorAttackState(BOSS, raw, CORN_ACTIONS, CHESTNUT_ACTIONS, allowLegacyBarleyShred);
    }
    for (const [PARENT_ID, CHILDREN] of SUMMONS_BY_PARENT) {
        ASSERT(CHILDREN.length <= MAX_PEANUT_SPLIT_CHILDREN);
        ASSERT(
            CHILDREN.every(
                (child) =>
                    child.peanutInheritedPowerRank === CHILDREN[0].peanutInheritedPowerRank &&
                    child.peanutInheritedSpeedRank === CHILDREN[0].peanutInheritedSpeedRank,
            ),
        );
        const PARENT = UNITS_BY_ID.get(PARENT_ID);
        ASSERT(PARENT && PARENT.ownerId === CHILDREN[0].ownerId && PARENT.farmId === CHILDREN[0].farmId);
    }
    const GENERATIONS = new Set();
    for (const U of [...raw.units, ...raw.bosses]) {
        ASSERT(!GENERATIONS.has(U.generation));
        GENERATIONS.add(U.generation);
    }
    ASSERT(
        INTEGER(raw.entityGenerationSerial, 1, 1e12) &&
            raw.bosses.every((boss) => boss.generation <= raw.entityGenerationSerial) &&
            raw.units.every((unit) => unit.generation <= raw.entityGenerationSerial),
    );
    return { UNITS_BY_ID };
}
// Food piles.
function validateFood(raw) {
    validateFoodRuntime(raw.foodRuntime, raw, ASSERT);
    for (const F of raw.food) {
        ASSERT(['flight', 'bounce', 'grounded'].includes(F.phase));
        for (const K of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'tx', 'ty']) {
            ASSERT(Number.isFinite(F[K]));
        }
    }
}
// Projectiles and the attacks they belong to.
function validateProjectiles(raw, context) {
    const { CHESTNUT_ACTIONS, CORN_ACTIONS } = context;
    const PROJECTILE_IDS = new Set(),
        CORN_PROJECTILE_SLOTS = new Set(),
        CHESTNUT_PROJECTILE_SLOTS = new Set();
    for (const P of raw.projectiles) {
        validatePath(P.path);
        ASSERT(INTEGER(P.id, 1, raw.projectileSerial) && !PROJECTILE_IDS.has(P.id));
        PROJECTILE_IDS.add(P.id);
        ASSERT(
            raw.bosses.some((boss) => boss.id === P.owner) ||
                INTEGER(P.owner, 1, raw.nextId - 1) ||
                INTEGER(P.owner, CONFIG.boss.summonIdBase + 1, CONFIG.boss.summonIdBase + raw.bossSummonSerial),
        );
        ASSERT(!isBossActorId(P.owner) || (P.faction === FACTION_CONFIG.ENEMY && P.ownerId === 'boss'));
        ASSERT(P.targetId === undefined || validActorId(raw, P.targetId));
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
                    P.radius === 0.12 * attackGeometryScale(R) &&
                    P.height === 0.5 * attackGeometryScale(R) &&
                    P.path.height === 0 &&
                    P.path.duration === Math.max(0.1, 0.3 / R.speed) &&
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
                (P.projectileKind === 'chestnut-spike'
                    ? P.species === 3 && P.shotIndex === undefined && INTEGER(P.fanIndex, 0, 2)
                    : INTEGER(P.shotIndex, 0, 4)),
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
}
// Corn attachment groups.
function validateCornAttachments(raw, context) {
    const { CORN_ACTIONS, UNITS_BY_ID } = context;
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
            const TARGET = raw.bosses.find((boss) => boss.id === GROUP.targetId) || UNITS_BY_ID.get(GROUP.targetId);
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
                validActorId(raw, GROUP.targetId) &&
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
                    (raw.bosses.some((boss) => boss.id === ATTACHMENT.ownerId) ||
                        INTEGER(ATTACHMENT.ownerId, 1, 1e12)) &&
                    (!isBossActorId(ATTACHMENT.ownerId) ||
                        (ATTACHMENT.payload?.faction === FACTION_CONFIG.ENEMY &&
                            ATTACHMENT.payload.ownerId === 'boss')) &&
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
}
// Projectile and boss summon serials.
function validateSerials(raw) {
    ASSERT(INTEGER(raw.projectileSerial, 0, 1e12) && INTEGER(raw.bossSummonSerial, 0, 1e12));
    for (const BOSS of raw.bosses) {
        validateBoss(BOSS, raw);
    }
}
export function validateSnapshot(raw, { allowLegacyBarleyShred = false } = {}) {
    // Shared results of earlier sections that later sections cross-check against.
    const CONTEXT = {};
    validateRootFields(raw);
    Object.assign(CONTEXT, validateAttackRecords(raw));
    validateMergeTasks(raw);
    validateProgressionState(raw);
    Object.assign(CONTEXT, validateFarmBossEvent(raw));
    validateBossRewards(raw, CONTEXT);
    Object.assign(CONTEXT, validateUnits(raw, CONTEXT, allowLegacyBarleyShred));
    validateFood(raw);
    validateProjectiles(raw, CONTEXT);
    validateCornAttachments(raw, CONTEXT);
    validateSerials(raw);
    return true;
}
function validateTowerCheckpoint(raw) {
    ASSERT(
        ['engage', 'scatter', 'retreat'].includes(raw.battleCommand) &&
            INTEGER(raw.frontlineLimit, 1, 500) &&
            typeof raw.insideTower === 'boolean' &&
            Array.isArray(raw.deployOrder) &&
            raw.deployOrder.length === CONFIG.unit.speciesCount &&
            new Set(raw.deployOrder).size === raw.deployOrder.length &&
            raw.deployOrder.every((species) => INTEGER(species, 0, CONFIG.unit.speciesCount - 1)) &&
            Array.isArray(raw.benchedIds) &&
            new Set(raw.benchedIds).size === raw.benchedIds.length &&
            raw.benchedIds.every((id) => raw.units.some((unit) => unit.id === id)) &&
            Array.isArray(raw.ejectQueue) &&
            new Set(raw.ejectQueue.map((entry) => entry.unitId)).size === raw.ejectQueue.length &&
            raw.ejectQueue.every(
                (entry) =>
                    entry &&
                    Object.keys(entry).length === 3 &&
                    raw.benchedIds.includes(entry.unitId) &&
                    Number.isFinite(entry.at) &&
                    entry.at >= 0 &&
                    entry.target &&
                    Object.keys(entry.target).length === 2 &&
                    Number.isFinite(entry.target.x) &&
                    Number.isFinite(entry.target.y),
            ) &&
            Number.isFinite(raw.deployReadyTime) &&
            raw.deployReadyTime >= 0 &&
            INTEGER(raw.deployCount, 0, CONFIG.farm.capacity.battleUnits),
    );
    const TOWER = raw.tower;
    ASSERT(
        TOWER &&
            typeof TOWER === 'object' &&
            !Array.isArray(TOWER) &&
            typeof TOWER.active === 'boolean' &&
            INTEGER(TOWER.floor, 0, FARM_BOSS_EVENT_MAX_STAGE) &&
            ['battle', 'elite', 'mid', 'power', 'event'].includes(TOWER.kind) &&
            Array.isArray(TOWER.cards) &&
            Array.isArray(TOWER.bossCards) &&
            Array.isArray(TOWER.doors) &&
            TOWER.doors.length <= 3 &&
            Array.isArray(TOWER.relics) &&
            Array.isArray(TOWER.bossRelics) &&
            Array.isArray(TOWER.undyingUsed) &&
            Array.isArray(TOWER.sleepUntil) &&
            TOWER.sleepUntil.every(
                (entry) =>
                    Array.isArray(entry) &&
                    entry.length === 2 &&
                    INTEGER(entry[0], 1) &&
                    INTEGER(entry[1], 0, FARM_BOSS_EVENT_MAX_STAGE + CONFIG.farm.tower.sleepMax),
            ) &&
            new Set(TOWER.sleepUntil.map(([id]) => id)).size === TOWER.sleepUntil.length &&
            (!TOWER.active || (TOWER.floor >= 1 && raw.runProgressionSnapshot !== null)),
    );
    for (const ENTRIES of [TOWER.relics, TOWER.bossRelics]) {
        ASSERT(
            ENTRIES.length <= CONFIG.farm.tower.relicSlots &&
                ENTRIES.every(
                    (entry) =>
                        Array.isArray(entry) &&
                        entry.length === 2 &&
                        typeof entry[0] === 'string' &&
                        INTEGER(entry[1], 1, CONFIG.farm.tower.relicMaxLevel),
                ) &&
                new Set(ENTRIES.map(([id]) => id)).size === ENTRIES.length,
        );
    }
    if (TOWER.phase !== undefined) {
        ASSERT(['climbing', 'summit', 'complete'].includes(TOWER.phase));
    }
    if (TOWER.summitElapsed !== undefined) {
        ASSERT(Number.isFinite(TOWER.summitElapsed) && TOWER.summitElapsed >= 0);
    }
    if (TOWER.startFloor !== undefined) {
        ASSERT(INTEGER(TOWER.startFloor, 0, FARM_BOSS_EVENT_MAX_STAGE));
    }
    if (TOWER.rewardRunId !== undefined) {
        ASSERT(INTEGER(TOWER.rewardRunId, 0, raw.playerProgression.towerRewards.runId));
    }
    const ENCOUNTER = raw.bossEncounter;
    if (ENCOUNTER === null) {
        ASSERT(raw.bosses.length === 1);
        return;
    }
    ASSERT(
        ENCOUNTER &&
            Object.keys(ENCOUNTER).length === 7 &&
            ['roster', 'nextIndex', 'elapsed', 'nextJoinAt', 'clearedIds', 'floor', 'completed'].every((key) =>
                Object.hasOwn(ENCOUNTER, key),
            ) &&
            Array.isArray(ENCOUNTER.roster) &&
            ENCOUNTER.roster.length >= 1 &&
            ENCOUNTER.roster.length <= 5 &&
            ENCOUNTER.roster.every(
                (entry) =>
                    entry &&
                    Object.keys(entry).length === 4 &&
                    INTEGER(entry.species, 0, CONFIG.unit.speciesCount - 1) &&
                    Number.isFinite(entry.hpShare) &&
                    entry.hpShare > 0 &&
                    entry.hpShare <= 1 &&
                    Number.isFinite(entry.attackShare) &&
                    entry.attackShare > 0 &&
                    entry.attackShare <= 1 &&
                    typeof entry.final === 'boolean',
            ) &&
            INTEGER(ENCOUNTER.nextIndex, 1, ENCOUNTER.roster.length) &&
            ENCOUNTER.nextIndex === raw.bosses.length &&
            raw.bosses.every(
                (boss, index) =>
                    boss.id === (index === 0 ? 'boss' : `boss-${index}`) &&
                    boss.species === ENCOUNTER.roster[index].species &&
                    boss.isFinalBoss === ENCOUNTER.roster[index].final &&
                    boss.stage === ENCOUNTER.floor &&
                    boss.encounterId === raw.farmBossEvent.encounterId,
            ) &&
            Number.isFinite(ENCOUNTER.elapsed) &&
            ENCOUNTER.elapsed >= 0 &&
            Number.isFinite(ENCOUNTER.nextJoinAt) &&
            ENCOUNTER.nextJoinAt >= 0 &&
            Array.isArray(ENCOUNTER.clearedIds) &&
            new Set(ENCOUNTER.clearedIds).size === ENCOUNTER.clearedIds.length &&
            ENCOUNTER.clearedIds.every((id) => raw.bosses.some((boss) => boss.id === id && boss.hp <= 0)) &&
            INTEGER(ENCOUNTER.floor, 1, FARM_BOSS_EVENT_MAX_STAGE) &&
            typeof ENCOUNTER.completed === 'boolean' &&
            (!ENCOUNTER.completed ||
                (ENCOUNTER.nextIndex === ENCOUNTER.roster.length && raw.bosses.every((boss) => boss.hp <= 0))),
    );
}
function validateBoss(boss, raw) {
    shape(boss, BOSS_SNAPSHOT_SHAPE, `bosses.${boss.id}`);
    ASSERT(
        isBossActorId(boss.id) &&
            boss.ownerId === 'boss' &&
            boss.tier === 1 &&
            boss.farmId === 0 &&
            boss.canSplit === false &&
            boss.isBattleOnlySummon === false &&
            boss.isFormationClone === false &&
            boss.peanutInheritedPowerRank === 0 &&
            boss.peanutInheritedSpeedRank === 0 &&
            boss.growth === 3 &&
            boss.growthElapsed === 1 &&
            boss.growthDuration === 1 &&
            hasFaction(boss, FACTION_CONFIG.ENEMY) &&
            INTEGER(boss.generation, 1, 1e12) &&
            boss.hp >= 0 &&
            boss.hp <= boss.maxHp &&
            INTEGER(boss.species, 0, CONFIG.unit.speciesCount - 1) &&
            boss.maxHp > 0 &&
            INTEGER(boss.stage, 0, BOSS_REWARD_SETTINGS.maxStage) &&
            Number.isFinite(boss.attackPower) &&
            boss.attackPower > 0 &&
            Number.isFinite(boss.moveSpeed) &&
            boss.moveSpeed > 0 &&
            INTEGER(boss.encounterId, 0, 1e12),
    );
    if (boss.statProfile) {
        const EFFECTIVE = resolveUnitStats(boss);
        ASSERT(
            boss.maxHp === EFFECTIVE.maxHp &&
                boss.attackPower === EFFECTIVE.attackPower &&
                boss.moveSpeed === EFFECTIVE.moveSpeed,
        );
    } else if (boss.stage === 0) {
        ASSERT(boss.attackPower === 4);
    } else {
        const STAGE_STATS = bossStageStats(boss.stage);
        ASSERT(boss.maxHp === STAGE_STATS.hp && boss.attackPower === STAGE_STATS.attackPower);
    }
    const RUNTIME = boss.patternRuntime;
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
                RUNTIME.cooldowns[ID] <= BOSS_PATTERN_CONFIG[ID].cooldown,
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
    ASSERT(typeof boss.isFinalBoss === 'boolean' && typeof boss.dropLanded === 'boolean');
}
function validatePath(p) {
    ASSERT(p && p.from && p.to && p.duration > 0 && Number.isFinite(p.height));
    for (const K of ['x', 'y']) {
        ASSERT(Number.isFinite(p.from[K]) && Number.isFinite(p.to[K]));
    }
    ASSERT(Number.isFinite(p.from.z));
}
