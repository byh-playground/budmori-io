// Shared boss-reward tuning. Farm events use their event multiplier; Raid
// deployment bonuses affect acquisition chance only, never progression XP.
import {awardBossKillXp} from './player-progression.js';
import {BOSS_SPECIES_WEIGHTS} from './species-catalog.js';

export const BOSS_REWARD_SETTINGS = Object.freeze({
  acquisitionChance: 0.20,
  farmEventAcquisitionMultiplier: 2,
  stageHpBase: 200,
  stageHpMultiplier: 1.5,
  stageAttackBase: 4,
  stageAttackMultiplier: 1.2,
  stageXpBase: 20,
  stageXpMultiplier: 1.2,
  maxStage: 61,
  speciesWeights: BOSS_SPECIES_WEIGHTS
});

export function bossStageStats(stage) {
  if (!Number.isSafeInteger(stage) || stage < 1 || stage > BOSS_REWARD_SETTINGS.maxStage) throw new RangeError(`Boss stage must be from 1 to ${BOSS_REWARD_SETTINGS.maxStage}`);
  const exponent = stage - 1;
  return {
    stage,
    hp: BOSS_REWARD_SETTINGS.stageHpBase * BOSS_REWARD_SETTINGS.stageHpMultiplier ** exponent,
    attackPower: BOSS_REWARD_SETTINGS.stageAttackBase * BOSS_REWARD_SETTINGS.stageAttackMultiplier ** exponent,
    xp: Math.round(BOSS_REWARD_SETTINGS.stageXpBase * BOSS_REWARD_SETTINGS.stageXpMultiplier ** exponent),
    rolls: Math.floor(stage / 5)
  };
}

export function chooseBossSpecies(random, weights = BOSS_REWARD_SETTINGS.speciesWeights) {
  if (typeof random !== 'function' || !Array.isArray(weights) || weights.length !== BOSS_REWARD_SETTINGS.speciesWeights.length || weights.some(weight => !Number.isFinite(weight) || weight <= 0)) throw new TypeError('Boss species weights and random source are required');
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let remaining = random() * total;
  if (!Number.isFinite(remaining) || remaining < 0 || remaining >= total) throw new RangeError('Boss species roll must be in [0, 1)');
  for (let index = 0; index < weights.length; index += 1) {
    remaining -= weights[index];
    if (remaining < 0) return index;
  }
  return weights.length - 1;
}

export function bossAcquisitionChance({ farmEvent = false, acquisitionMultiplier = 1 } = {}) {
  if (!Number.isFinite(acquisitionMultiplier) || acquisitionMultiplier < 0 || acquisitionMultiplier > 2) {
    throw new RangeError('Boss acquisition multiplier must be in [0, 2]');
  }
  const multiplier = farmEvent ? BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier : acquisitionMultiplier;
  return Math.min(1, Math.max(0, BOSS_REWARD_SETTINGS.acquisitionChance * multiplier));
}

export function decideBossAcquisition({ encounterId, source = 'raid', random, species = 3, tier = 1, x = 0, y = 0, acquisitionMultiplier = 1, receiptKey = null } = {}) {
  if (!Number.isSafeInteger(encounterId) || encounterId < 1 || !['farm', 'raid'].includes(source) || typeof random !== 'function') {
    throw new TypeError('A boss encounter ID, source, and random roll are required');
  }
  if (receiptKey !== null && (typeof receiptKey !== 'string' || !receiptKey.trim() || receiptKey.length > 255)) throw new TypeError('Boss receipt key must be a non-empty string');
  const chance = bossAcquisitionChance({ farmEvent: source === 'farm', acquisitionMultiplier });
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new RangeError('Boss acquisition roll must be in [0, 1)');
  return { encounterId, source, receiptKey: receiptKey || `${source}:${encounterId}`, acquisitionMultiplier: source === 'farm' ? BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier : acquisitionMultiplier, species, tier, x, y, chance, roll, status: roll < chance ? 'pending' : 'missed', unitId: 0 };
}

export function grantPendingBossAcquisitions(world, { grantUnit = null } = {}) {
  const granted = [];
  for (const reward of world.bossRewardReceipts || []) {
    if (reward.status !== 'pending') continue;
    const drops = Array.isArray(reward.drops) ? reward.drops : [{roll: reward.roll, status: 'pending', unitId: 0}];
    for (const drop of drops) {
      if (drop.status !== 'pending') continue;
      const unit = grantUnit
        ? grantUnit({...reward, roll:drop.roll})
        : world.units.length < world.capacity
          ? world.spawn(reward.species, reward.tier, reward.x, reward.y)
          : null;
      if (!unit) continue;
      drop.status = 'granted';
      drop.unitId = unit.id;
      granted.push({...reward, roll:drop.roll, unitId:unit.id});
    }
    const pending = drops.some(drop => drop.status === 'pending');
    const successful = drops.filter(drop => drop.status === 'granted');
    reward.status = pending ? 'pending' : successful.length ? 'granted' : 'missed';
    reward.unitId = pending ? 0 : successful[0]?.unitId || 0;
    const event = world.farmBossEvent;
    if (event?.encounterId === reward.encounterId) {
      event.rewardStatus = reward.status;
      event.rewardUnitId = reward.unitId;
    }
  }
  return granted;
}

export function resolveBossAcquisition(world, options) {
  const { encounterId, source = 'raid' } = options || {};
  const requestedReceiptKey = options?.receiptKey;
  if (requestedReceiptKey !== undefined && (typeof requestedReceiptKey !== 'string' || !requestedReceiptKey.trim() || requestedReceiptKey.length > 255)) throw new TypeError('Boss receipt key must be a non-empty string');
  world.bossRewardReceipts ||= [];
  world.bossRewardWatermarks ||= {farm:0,raid:0};
  const previous = world.bossRewardReceipts.find(receipt => requestedReceiptKey
    ? receipt.receiptKey === requestedReceiptKey
    : receipt.encounterId === encounterId && receipt.source === source);
  if (previous) {
    if (previous.status === 'pending') grantPendingBossAcquisitions(world, { grantUnit: options?.grantUnit || null });
    return previous;
  }
  if (!['farm','raid'].includes(source) || !Number.isSafeInteger(encounterId) || encounterId <= (world.bossRewardWatermarks[source] || 0)) {
    throw new RangeError('A settled or stale boss encounter cannot be rolled again');
  }
  const random = options?.random || (() => world.random());
  const rollCount = options?.rollCount === undefined ? 1 : options.rollCount;
  if (!Number.isSafeInteger(rollCount) || rollCount < 0 || rollCount > BOSS_REWARD_SETTINGS.maxStage) throw new RangeError('Boss drop roll count is out of range');
  const decision = rollCount > 0
    ? decideBossAcquisition({ ...options, random })
    : {
        encounterId,
        source,
        receiptKey: options?.receiptKey || `${source}:${encounterId}`,
        acquisitionMultiplier: source === 'farm' ? BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier : options?.acquisitionMultiplier ?? 1,
        species: options?.species ?? 3,
        tier: options?.tier ?? 1,
        x: options?.x ?? 0,
        y: options?.y ?? 0,
        chance: bossAcquisitionChance({farmEvent:source === 'farm', acquisitionMultiplier:options?.acquisitionMultiplier ?? 1}),
        roll: 0,
        status: 'missed',
        unitId: 0
      };
  const drops = rollCount > 0
    ? [{roll:decision.roll, status:decision.roll < decision.chance ? 'pending' : 'missed', unitId:0}, ...Array.from({length:rollCount-1}, () => {
        const roll = random();
        if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new RangeError('Boss acquisition roll must be in [0, 1)');
        return {roll, status:roll < decision.chance ? 'pending' : 'missed', unitId:0};
      })]
    : [];
  const receipt = {...decision, drops, rollCount, roll:drops[0]?.roll ?? 0, status:drops.some(drop => drop.status === 'pending') ? 'pending' : 'missed', unitId:0};
  world.bossRewardReceipts.push(receipt);
  world.bossRewardWatermarks[source] = encounterId;
  // Retain pending receipts and a small settled history; encounter IDs only move forward.
  let settled = world.bossRewardReceipts.filter(item => item.status !== 'pending');
  if (settled.length > 128) {
    const remove = new Set(settled.slice(0, settled.length - 128));
    world.bossRewardReceipts = world.bossRewardReceipts.filter(item => !remove.has(item));
  }
  const event = world.farmBossEvent;
  if (event?.encounterId === encounterId) {
    event.rewardStatus = receipt.status;
    event.rewardChance = receipt.chance;
    event.rewardRoll = receipt.roll;
    event.rewardUnitId = receipt.unitId;
  }
  if (receipt.status === 'pending') grantPendingBossAcquisitions(world, { grantUnit: options?.grantUnit || null });
  return receipt;
}

// The encounter receipt is the idempotency key for both parts of a boss kill.
// Callers may supply an owner-scoped progression wallet for future Raid use;
// Farm encounters use the saved wallet on the Garden itself.
export function settleBossKill(world, options) {
  const receipt = resolveBossAcquisition(world, options);
  const progressionOwner = options?.progressionOwner || world;
  const wallet = options?.playerProgression || progressionOwner.playerProgression;
  const receiptKey = receipt.xpReceiptKey || options?.receiptKey || receipt.receiptKey || `${receipt.source}:${receipt.encounterId}`;
  // Once XP is recorded on this immutable acquisition receipt, a repeated
  // settlement must not replace its awarded amount with a duplicate's zero.
  if (receipt.xpReceiptKey && ['awarded', 'already-awarded'].includes(receipt.xpStatus)) {
    return {receipt, progression:wallet, awarded:false, reason:'duplicate-receipt',
      xpAwarded:receipt.xpAmount ?? 0, levelsGained:receipt.levelsGained ?? 0,
      pointsAwarded:receipt.pointsAwarded ?? 0};
  }
  const result = awardBossKillXp(wallet, receiptKey, options?.xpAmount === undefined ? undefined : options.xpAmount);
  if (result.awarded) progressionOwner.playerProgression = result.state;
  if (result.awarded || result.reason === 'duplicate-receipt') {
    receipt.xpReceiptKey = receiptKey;
    receipt.xpStatus = result.awarded ? 'awarded' : 'already-awarded';
    receipt.xpAmount = result.awarded ? result.xpAwarded : 0;
    receipt.levelsGained = result.levelsGained;
    receipt.pointsAwarded = result.pointsAwarded;
  } else {
    receipt.xpStatus = 'unsettled';
  }
  return {receipt, progression:result.state, awarded:result.awarded, reason:result.reason,
    xpAwarded:result.xpAwarded, levelsGained:result.levelsGained, pointsAwarded:result.pointsAwarded};
}
