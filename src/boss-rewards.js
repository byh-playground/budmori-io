// Shared boss-reward tuning. Farm events use their event multiplier; Raid
// deployment bonuses affect acquisition chance only, never progression XP.
import { awardBossKillXp, FARM_BOSS_EVENT_MAX_STAGE } from './player-progression.js';
import { BOSS_SPECIES_WEIGHTS } from './species-catalog.js';
import { sampleBinomial } from './binomial-sampler.js';
const FORMAT_PERCENT = new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 4,
});
const FORMAT_COUNT = new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 0,
});
function readBossRoll(random) {
    const ROLL = random();
    if (!Number.isFinite(ROLL) || ROLL < 0 || ROLL >= 1) {
        throw new RangeError('Boss acquisition roll must be in [0, 1)');
    }
    return ROLL;
}
export const BOSS_REWARD_SETTINGS = Object.freeze({
    acquisitionChance: 0.02,
    farmEventAcquisitionMultiplier: 2,
    stageHpBase: 200,
    stageHpMultiplier: 1.5,
    stageAttackBase: 4,
    stageAttackMultiplier: 1.2,
    stageXpBase: 20,
    stageXpMultiplier: 1.5,
    stageRollMultiplier: 1.5,
    maxStage: FARM_BOSS_EVENT_MAX_STAGE,
    maxRollCount: Math.ceil(1.5 ** (FARM_BOSS_EVENT_MAX_STAGE - 1)),
    speciesWeights: BOSS_SPECIES_WEIGHTS,
});
export function bossStageStats(stage) {
    if (!Number.isSafeInteger(stage) || stage < 1 || stage > BOSS_REWARD_SETTINGS.maxStage) {
        throw new RangeError(`Boss stage must be from 1 to ${BOSS_REWARD_SETTINGS.maxStage}`);
    }
    const EXPONENT = stage - 1,
        ROLL_BUDGET = BOSS_REWARD_SETTINGS.stageRollMultiplier ** EXPONENT,
        ROLLS = Math.floor(ROLL_BUDGET);
    return {
        stage,
        hp: BOSS_REWARD_SETTINGS.stageHpBase * BOSS_REWARD_SETTINGS.stageHpMultiplier ** EXPONENT,
        attackPower: BOSS_REWARD_SETTINGS.stageAttackBase * BOSS_REWARD_SETTINGS.stageAttackMultiplier ** EXPONENT,
        xp: Math.round(BOSS_REWARD_SETTINGS.stageXpBase * BOSS_REWARD_SETTINGS.stageXpMultiplier ** EXPONENT),
        rollBudget: ROLL_BUDGET,
        rolls: ROLLS,
        bonusRollChance: ROLL_BUDGET - ROLLS,
    };
}
export function bossRewardRollDescription(stage, { farmEvent = false, acquisitionMultiplier = 1 } = {}) {
    const STATS = bossStageStats(stage),
        CHANCE =
            bossAcquisitionChance({
                farmEvent,
                acquisitionMultiplier,
            }) * 100,
        BASE = `${FORMAT_COUNT.format(STATS.rolls)}회`,
        BONUS = STATS.bonusRollChance
            ? ` + ${FORMAT_PERCENT.format(STATS.bonusRollChance * 100)}% 확률로 1회 추가`
            : '';
    return `${BASE}${BONUS} · 추첨당 ${FORMAT_PERCENT.format(CHANCE)}% · 성공마다 T1 1마리`;
}
export function chooseBossSpecies(random, weights = BOSS_REWARD_SETTINGS.speciesWeights) {
    if (
        typeof random !== 'function' ||
        !Array.isArray(weights) ||
        weights.length !== BOSS_REWARD_SETTINGS.speciesWeights.length ||
        weights.some((weight) => !Number.isFinite(weight) || weight <= 0)
    ) {
        throw new TypeError('Boss species weights and random source are required');
    }
    const TOTAL = weights.reduce((sum, weight) => sum + weight, 0);
    let remaining = random() * TOTAL;
    if (!Number.isFinite(remaining) || remaining < 0 || remaining >= TOTAL) {
        throw new RangeError('Boss species roll must be in [0, 1)');
    }
    for (let index = 0; index < weights.length; index += 1) {
        remaining -= weights[index];
        if (remaining < 0) {
            return index;
        }
    }
    return weights.length - 1;
}
export function bossAcquisitionChance({ farmEvent = false, acquisitionMultiplier = 1 } = {}) {
    if (!Number.isFinite(acquisitionMultiplier) || acquisitionMultiplier < 0 || acquisitionMultiplier > 2) {
        throw new RangeError('Boss acquisition multiplier must be in [0, 2]');
    }
    const MULTIPLIER = farmEvent ? BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier : acquisitionMultiplier;
    return Math.min(1, Math.max(0, BOSS_REWARD_SETTINGS.acquisitionChance * MULTIPLIER));
}
export function decideBossAcquisition({
    encounterId,
    source = 'raid',
    random,
    species = 3,
    tier = 1,
    x = 0,
    y = 0,
    acquisitionMultiplier = 1,
    receiptKey = null,
} = {}) {
    if (
        !Number.isSafeInteger(encounterId) ||
        encounterId < 1 ||
        !['farm', 'raid'].includes(source) ||
        typeof random !== 'function'
    ) {
        throw new TypeError('A boss encounter ID, source, and random roll are required');
    }
    if (receiptKey !== null && (typeof receiptKey !== 'string' || !receiptKey.trim() || receiptKey.length > 255)) {
        throw new TypeError('Boss receipt key must be a non-empty string');
    }
    const CHANCE = bossAcquisitionChance({
        farmEvent: source === 'farm',
        acquisitionMultiplier,
    });
    const ROLL = readBossRoll(random);
    return {
        encounterId,
        source,
        receiptKey: receiptKey || `${source}:${encounterId}`,
        acquisitionMultiplier:
            source === 'farm' ? BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier : acquisitionMultiplier,
        species,
        tier,
        x,
        y,
        chance: CHANCE,
        roll: ROLL,
        status: ROLL < CHANCE ? 'pending' : 'missed',
        unitId: 0,
    };
}
export function grantPendingBossAcquisitions(world, options) {
    return typeof world.mutateUnits === 'function'
        ? world.mutateUnits(grantPendingBossAcquisitionsCommitted, world, options)
        : grantPendingBossAcquisitionsCommitted(world, options);
}
function grantPendingBossAcquisitionsCommitted(world, { grantUnit = null } = {}) {
    const GRANTED = [];
    for (const REWARD of world.bossRewardReceipts || []) {
        if (REWARD.status !== 'pending') {
            continue;
        }
        if (!Array.isArray(REWARD.drops)) {
            const REMAINING = REWARD.successCount - REWARD.grantedCount;
            for (let index = 0; index < REMAINING; index++) {
                if (world.units.length >= world.capacity) {
                    break;
                }
                const UNIT = grantUnit
                    ? grantUnit({
                          ...REWARD,
                          tier: 1,
                          successIndex: REWARD.grantedCount,
                      })
                    : world.spawn(REWARD.species, 1, REWARD.x, REWARD.y);
                if (!UNIT) {
                    break;
                }
                REWARD.grantedCount++;
                REWARD.unitId ||= UNIT.id;
                GRANTED.push({
                    ...REWARD,
                    tier: 1,
                    unitId: UNIT.id,
                    successIndex: REWARD.grantedCount - 1,
                });
            }
            REWARD.status = REWARD.grantedCount < REWARD.successCount ? 'pending' : 'granted';
            const EVENT = world.farmBossEvent;
            if (EVENT?.encounterId === REWARD.encounterId) {
                EVENT.rewardStatus = REWARD.status;
                EVENT.rewardUnitId = REWARD.unitId;
            }
            continue;
        }
        const DROPS = Array.isArray(REWARD.drops)
            ? REWARD.drops
            : [
                  {
                      roll: REWARD.roll,
                      status: 'pending',
                      unitId: 0,
                  },
              ];
        for (const DROP of DROPS) {
            if (DROP.status !== 'pending') {
                continue;
            }
            const UNIT = grantUnit
                ? grantUnit({
                      ...REWARD,
                      roll: DROP.roll,
                  })
                : world.units.length < world.capacity
                  ? world.spawn(REWARD.species, REWARD.tier, REWARD.x, REWARD.y)
                  : null;
            if (!UNIT) {
                continue;
            }
            DROP.status = 'granted';
            DROP.unitId = UNIT.id;
            GRANTED.push({
                ...REWARD,
                roll: DROP.roll,
                unitId: UNIT.id,
            });
        }
        const PENDING = DROPS.some((drop) => drop.status === 'pending');
        const SUCCESSFUL = DROPS.filter((drop) => drop.status === 'granted');
        REWARD.status = PENDING ? 'pending' : SUCCESSFUL.length ? 'granted' : 'missed';
        REWARD.unitId = PENDING ? 0 : SUCCESSFUL[0]?.unitId || 0;
        const EVENT = world.farmBossEvent;
        if (EVENT?.encounterId === REWARD.encounterId) {
            EVENT.rewardStatus = REWARD.status;
            EVENT.rewardUnitId = REWARD.unitId;
        }
    }
    return GRANTED;
}
export function resolveBossAcquisition(world, options) {
    return typeof world.mutateUnits === 'function'
        ? world.mutateUnits(resolveBossAcquisitionCommitted, world, options)
        : resolveBossAcquisitionCommitted(world, options);
}
function resolveBossAcquisitionCommitted(world, options) {
    const { encounterId: ENCOUNTER_ID, source: SOURCE = 'raid' } = options || {};
    const REQUESTED_RECEIPT_KEY = options?.receiptKey;
    if (
        REQUESTED_RECEIPT_KEY !== undefined &&
        (typeof REQUESTED_RECEIPT_KEY !== 'string' ||
            !REQUESTED_RECEIPT_KEY.trim() ||
            REQUESTED_RECEIPT_KEY.length > 255)
    ) {
        throw new TypeError('Boss receipt key must be a non-empty string');
    }
    world.bossRewardReceipts ||= [];
    world.bossRewardWatermarks ||= {
        farm: 0,
        raid: 0,
    };
    const PREVIOUS = world.bossRewardReceipts.find((receipt) =>
        REQUESTED_RECEIPT_KEY
            ? receipt.receiptKey === REQUESTED_RECEIPT_KEY
            : receipt.encounterId === ENCOUNTER_ID && receipt.source === SOURCE,
    );
    if (PREVIOUS) {
        if (PREVIOUS.status === 'pending') {
            grantPendingBossAcquisitions(world, {
                grantUnit: options?.grantUnit || null,
            });
        }
        return PREVIOUS;
    }
    if (
        !['farm', 'raid'].includes(SOURCE) ||
        !Number.isSafeInteger(ENCOUNTER_ID) ||
        ENCOUNTER_ID <= (world.bossRewardWatermarks[SOURCE] || 0)
    ) {
        throw new RangeError('A settled or stale boss encounter cannot be rolled again');
    }
    const RANDOM = options?.random || (() => world.random()),
        ROLL_BUDGET = options?.rollBudget ?? options?.rollCount ?? 1;
    if (
        !Number.isFinite(ROLL_BUDGET) ||
        ROLL_BUDGET < 0 ||
        ROLL_BUDGET > BOSS_REWARD_SETTINGS.maxRollCount ||
        !Number.isSafeInteger(Math.floor(ROLL_BUDGET))
    ) {
        throw new RangeError('Boss drop roll budget is out of range');
    }
    const BASE_ROLL_COUNT = Math.floor(ROLL_BUDGET),
        BONUS_ROLL_CHANCE = ROLL_BUDGET - BASE_ROLL_COUNT,
        CHANCE = bossAcquisitionChance({
            farmEvent: SOURCE === 'farm',
            acquisitionMultiplier: options?.acquisitionMultiplier ?? 1,
        }),
        DECISION =
            BASE_ROLL_COUNT > 0
                ? decideBossAcquisition({
                      ...options,
                      tier: 1,
                      random: RANDOM,
                  })
                : {
                      encounterId: ENCOUNTER_ID,
                      source: SOURCE,
                      receiptKey: options?.receiptKey || `${SOURCE}:${ENCOUNTER_ID}`,
                      acquisitionMultiplier:
                          SOURCE === 'farm'
                              ? BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier
                              : (options?.acquisitionMultiplier ?? 1),
                      species: options?.species ?? 3,
                      tier: 1,
                      x: options?.x ?? 0,
                      y: options?.y ?? 0,
                      chance: CHANCE,
                      roll: 0,
                      status: 'missed',
                      unitId: 0,
                  };
    let successCount = DECISION.status === 'pending' ? 1 : 0,
        rollCount = BASE_ROLL_COUNT;
    if (BASE_ROLL_COUNT > 1) {
        successCount += sampleBinomial(BASE_ROLL_COUNT - 1, CHANCE, RANDOM);
    }
    if (BONUS_ROLL_CHANCE > 0 && readBossRoll(RANDOM) < BONUS_ROLL_CHANCE) {
        rollCount++;
        if (readBossRoll(RANDOM) < CHANCE) {
            successCount++;
        }
    }
    const RECEIPT = {
        ...DECISION,
        rollBudget: ROLL_BUDGET,
        bonusRollChance: BONUS_ROLL_CHANCE,
        rollCount,
        successCount,
        grantedCount: 0,
        status: successCount > 0 ? 'pending' : 'missed',
        unitId: 0,
    };
    world.bossRewardReceipts.push(RECEIPT);
    world.bossRewardWatermarks[SOURCE] = ENCOUNTER_ID;
    // Retain pending receipts and a small settled history; encounter IDs only move forward.
    const SETTLED = world.bossRewardReceipts.filter((item) => item.status !== 'pending');
    if (SETTLED.length > 128) {
        const REMOVE = new Set(SETTLED.slice(0, SETTLED.length - 128));
        world.bossRewardReceipts = world.bossRewardReceipts.filter((item) => !REMOVE.has(item));
    }
    const EVENT = world.farmBossEvent;
    if (EVENT?.encounterId === ENCOUNTER_ID) {
        EVENT.rewardStatus = RECEIPT.status;
        EVENT.rewardChance = RECEIPT.chance;
        EVENT.rewardRoll = RECEIPT.roll;
        EVENT.rewardUnitId = RECEIPT.unitId;
    }
    if (RECEIPT.status === 'pending') {
        grantPendingBossAcquisitions(world, {
            grantUnit: options?.grantUnit || null,
        });
    }
    return RECEIPT;
}

// The encounter receipt is the idempotency key for both parts of a boss kill.
// Callers may supply an owner-scoped progression wallet for future Raid use;
// Farm encounters use the saved wallet on the Garden itself.
export function settleBossKill(world, options) {
    return typeof world.mutateUnits === 'function'
        ? world.mutateUnits(settleBossKillCommitted, world, options)
        : settleBossKillCommitted(world, options);
}
function settleBossKillCommitted(world, options) {
    const RECEIPT = resolveBossAcquisition(world, options);
    const PROGRESSION_OWNER = options?.progressionOwner || world;
    const WALLET = options?.playerProgression || PROGRESSION_OWNER.playerProgression;
    const RECEIPT_KEY =
        RECEIPT.xpReceiptKey || options?.receiptKey || RECEIPT.receiptKey || `${RECEIPT.source}:${RECEIPT.encounterId}`;
    // Once XP is recorded on this immutable acquisition receipt, a repeated
    // settlement must not replace its awarded amount with a duplicate's zero.
    if (RECEIPT.xpReceiptKey && ['awarded', 'already-awarded'].includes(RECEIPT.xpStatus)) {
        return {
            receipt: RECEIPT,
            progression: WALLET,
            awarded: false,
            reason: 'duplicate-receipt',
            xpAwarded: RECEIPT.xpAmount ?? 0,
            levelsGained: RECEIPT.levelsGained ?? 0,
            pointsAwarded: RECEIPT.pointsAwarded ?? 0,
        };
    }
    const RESULT = awardBossKillXp(WALLET, RECEIPT_KEY, options?.xpAmount === undefined ? undefined : options.xpAmount);
    if (RESULT.awarded) {
        PROGRESSION_OWNER.playerProgression = RESULT.state;
    }
    if (RESULT.awarded || RESULT.reason === 'duplicate-receipt') {
        RECEIPT.xpReceiptKey = RECEIPT_KEY;
        RECEIPT.xpStatus = RESULT.awarded ? 'awarded' : 'already-awarded';
        RECEIPT.xpAmount = RESULT.awarded ? RESULT.xpAwarded : 0;
        RECEIPT.levelsGained = RESULT.levelsGained;
        RECEIPT.pointsAwarded = RESULT.pointsAwarded;
    } else {
        RECEIPT.xpStatus = 'unsettled';
    }
    return {
        receipt: RECEIPT,
        progression: RESULT.state,
        awarded: RESULT.awarded,
        reason: RESULT.reason,
        xpAwarded: RESULT.xpAwarded,
        levelsGained: RESULT.levelsGained,
        pointsAwarded: RESULT.pointsAwarded,
    };
}
