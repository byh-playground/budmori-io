// Shared boss-reward tuning. Farm events use their event multiplier; Raid
// deployment bonuses affect acquisition chance only, never progression XP.
import {awardBossKillXp} from './player-progression.js';

export const BOSS_REWARD_SETTINGS = Object.freeze({
  acquisitionChance: 0.20,
  farmEventAcquisitionMultiplier: 2
});

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
    const unit = grantUnit
      ? grantUnit(reward)
      : world.units.length < world.capacity
        ? world.spawn(reward.species, reward.tier, reward.x, reward.y)
        : null;
    if (!unit) continue;
    reward.status = 'granted';
    reward.unitId = unit.id;
    granted.push(reward);
    const event = world.farmBossEvent;
    if (event?.encounterId === reward.encounterId) {
      event.rewardStatus = 'granted';
      event.rewardUnitId = unit.id;
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
  if (previous) return previous;
  if (!['farm','raid'].includes(source) || !Number.isSafeInteger(encounterId) || encounterId <= (world.bossRewardWatermarks[source] || 0)) {
    throw new RangeError('A settled or stale boss encounter cannot be rolled again');
  }
  const receipt = decideBossAcquisition({ ...options, random: options?.random || (() => world.random()) });
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
  const receiptKey = options?.receiptKey || receipt.receiptKey || `${receipt.source}:${receipt.encounterId}`;
  const result = awardBossKillXp(wallet, receiptKey);
  if (result.awarded) {
    progressionOwner.playerProgression = result.state;
  }
  receipt.xpReceiptKey = receiptKey;
  receipt.xpStatus = result.awarded ? 'awarded' : result.reason === 'duplicate-receipt' ? 'already-awarded' : 'unsettled';
  receipt.xpAmount = result.awarded ? result.xpAwarded : 0;
  receipt.levelsGained = result.levelsGained;
  receipt.pointsAwarded = result.pointsAwarded;
  return {receipt, progression:result.state, awarded:result.awarded, reason:result.reason,
    xpAwarded:result.xpAwarded, levelsGained:result.levelsGained, pointsAwarded:result.pointsAwarded};
}
