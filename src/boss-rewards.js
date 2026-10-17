// Shared boss-reward tuning. Farm events use their event multiplier; Raid
// deployment bonuses affect acquisition chance only, never progression XP.
import { awardBossKillXp } from './player-progression.js';
import { BOSS_SPECIES_WEIGHTS } from './species-catalog.js';
export const BOSS_REWARD_SETTINGS = Object.freeze({
    acquisitionChance: 0.2,
    farmEventAcquisitionMultiplier: 2,
    stageHpBase: 200,
    stageHpMultiplier: 1.5,
    stageAttackBase: 4,
    stageAttackMultiplier: 1.2,
    stageXpBase: 20,
    stageXpMultiplier: 1.2,
    maxStage: 61,
    speciesWeights: BOSS_SPECIES_WEIGHTS,
});
export function bossStageStats(stage) {
    if (!Number.isSafeInteger(stage) || stage < 1 || stage > BOSS_REWARD_SETTINGS.maxStage) {
        throw new RangeError(`Boss stage must be from 1 to ${BOSS_REWARD_SETTINGS.maxStage}`);
    }
    const EXPONENT = stage - 1;
    return {
        stage,
        hp: BOSS_REWARD_SETTINGS.stageHpBase * BOSS_REWARD_SETTINGS.stageHpMultiplier ** EXPONENT,
        attackPower: BOSS_REWARD_SETTINGS.stageAttackBase * BOSS_REWARD_SETTINGS.stageAttackMultiplier ** EXPONENT,
        xp: Math.round(BOSS_REWARD_SETTINGS.stageXpBase * BOSS_REWARD_SETTINGS.stageXpMultiplier ** EXPONENT),
        rolls: Math.floor(stage / 5),
    };
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
    const ROLL = random();
    if (!Number.isFinite(ROLL) || ROLL < 0 || ROLL >= 1) {
        throw new RangeError('Boss acquisition roll must be in [0, 1)');
    }
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
export function grantPendingBossAcquisitions(world, { grantUnit = null } = {}) {
    const GRANTED = [];
    for (const REWARD of world.bossRewardReceipts || []) {
        if (REWARD.status !== 'pending') {
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
    const RANDOM = options?.random || (() => world.random());
    const ROLL_COUNT = options?.rollCount === undefined ? 1 : options.rollCount;
    if (!Number.isSafeInteger(ROLL_COUNT) || ROLL_COUNT < 0 || ROLL_COUNT > BOSS_REWARD_SETTINGS.maxStage) {
        throw new RangeError('Boss drop roll count is out of range');
    }
    const DECISION =
        ROLL_COUNT > 0
            ? decideBossAcquisition({
                  ...options,
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
                  tier: options?.tier ?? 1,
                  x: options?.x ?? 0,
                  y: options?.y ?? 0,
                  chance: bossAcquisitionChance({
                      farmEvent: SOURCE === 'farm',
                      acquisitionMultiplier: options?.acquisitionMultiplier ?? 1,
                  }),
                  roll: 0,
                  status: 'missed',
                  unitId: 0,
              };
    const DROPS =
        ROLL_COUNT > 0
            ? [
                  {
                      roll: DECISION.roll,
                      status: DECISION.roll < DECISION.chance ? 'pending' : 'missed',
                      unitId: 0,
                  },
                  ...Array.from(
                      {
                          length: ROLL_COUNT - 1,
                      },
                      () => {
                          const ROLL = RANDOM();
                          if (!Number.isFinite(ROLL) || ROLL < 0 || ROLL >= 1) {
                              throw new RangeError('Boss acquisition roll must be in [0, 1)');
                          }
                          return {
                              roll: ROLL,
                              status: ROLL < DECISION.chance ? 'pending' : 'missed',
                              unitId: 0,
                          };
                      },
                  ),
              ]
            : [];
    const RECEIPT = {
        ...DECISION,
        drops: DROPS,
        rollCount: ROLL_COUNT,
        roll: DROPS[0]?.roll ?? 0,
        status: DROPS.some((drop) => drop.status === 'pending') ? 'pending' : 'missed',
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
