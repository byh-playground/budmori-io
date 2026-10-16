// Shared boss-reward tuning. Farm encounters use the normal boss acquisition
// chance with one event-only multiplier; deployment bonuses do not stack.
export const BOSS_REWARD_SETTINGS = Object.freeze({
  acquisitionChance: 0.20,
  farmEventAcquisitionMultiplier: 2
});

export function bossAcquisitionChance({ farmEvent = false } = {}) {
  const multiplier = farmEvent ? BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier : 1;
  return Math.min(1, Math.max(0, BOSS_REWARD_SETTINGS.acquisitionChance * multiplier));
}

export function decideBossAcquisition({ encounterId, source = 'raid', random, species = 3, tier = 1, x = 0, y = 0 } = {}) {
  if (!Number.isSafeInteger(encounterId) || encounterId < 1 || !['farm', 'raid'].includes(source) || typeof random !== 'function') {
    throw new TypeError('A boss encounter ID, source, and random roll are required');
  }
  const chance = bossAcquisitionChance({ farmEvent: source === 'farm' });
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new RangeError('Boss acquisition roll must be in [0, 1)');
  return { encounterId, source, species, tier, x, y, chance, roll, status: roll < chance ? 'pending' : 'missed', unitId: 0 };
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
  world.bossRewardReceipts ||= [];
  world.bossRewardWatermarks ||= {farm:0,raid:0};
  const previous = world.bossRewardReceipts.find(receipt => receipt.encounterId === encounterId && receipt.source === source);
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
