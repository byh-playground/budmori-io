const TIER_HP = 40;
const TIER_HP_SCALE = 1.5;
const TIER_ATTACK = 4;
const TIER_ATTACK_SCALE = 1.2;
const ARMOR_SCALE = 100;

// Shared combat vocabulary for every unit. These are deliberately neutral so
// that adding the stat layer does not alter current unit balance.
export const COMMON_UNIT_STAT_DEFAULTS = Object.freeze({
  armor: 0,
  moveSpeed: 1,
  attackSpeed: 1,
  critChance: 0,
  critMultiplier: 1,
  armorPenetration: 0,
  attackArea: 1,
  lifesteal: 0,
  regen: 0,
  healingReceivedMultiplier: 1,
  knockbackPower: 1,
  knockbackResistance: 0,
  statusDuration: 1,
  statusResistance: 0
});

// Static profiles are the one production source for unit common-stat tuning.
// All current species inherit neutral values; fixtures may override these to
// exercise the shared math without changing live balance.
export const COMMON_UNIT_STAT_PROFILES = Object.freeze([0, 1, 2, 3].map(() => Object.freeze({ ...COMMON_UNIT_STAT_DEFAULTS })));

export function resolveUnitStats(unit, overrides = {}) {
  const tier = Math.max(1, Math.min(4, Number.isInteger(unit?.tier) ? unit.tier : 1));
  const speciesProfile = COMMON_UNIT_STAT_PROFILES[unit?.species] || COMMON_UNIT_STAT_DEFAULTS;
  return {
    maxHp: TIER_HP * TIER_HP_SCALE ** (tier - 1),
    attackPower: TIER_ATTACK * TIER_ATTACK_SCALE ** (tier - 1),
    ...COMMON_UNIT_STAT_DEFAULTS,
    ...speciesProfile,
    ...overrides
  };
}

export function resolveDamage(rawDamage, armor = 0, armorPenetration = 0, critical = false, critMultiplier = 1) {
  const raw = Number.isFinite(rawDamage) ? Math.max(0, rawDamage) : 0;
  const penetration = clamp(Number.isFinite(armorPenetration) ? armorPenetration : 0, 0, 1);
  const effectiveArmor = Math.max(0, Number.isFinite(armor) ? armor : 0) * (1 - penetration);
  const crit = critical ? Math.max(1, Number.isFinite(critMultiplier) ? critMultiplier : 1) : 1;
  const mitigated = raw * crit * ARMOR_SCALE / (ARMOR_SCALE + effectiveArmor);
  return { rawDamage: raw, effectiveArmor, critical, damage: mitigated };
}

export function resolveCritical(stats, roll = 1) {
  const chance = clamp(Number.isFinite(stats?.critChance) ? stats.critChance : 0, 0, 1);
  return chance > 0 && roll < chance;
}

export function scaleMoveSpeed(baseSpeed, unit, overrides = {}) {
  return Math.max(0, Number.isFinite(baseSpeed) ? baseSpeed : 0) * Math.max(0, resolveUnitStats(unit, overrides).moveSpeed);
}

export function scaleAttackRecovery(baseRecovery, unit, overrides = {}) {
  return Math.max(0, Number.isFinite(baseRecovery) ? baseRecovery : 0) / Math.max(.05, resolveUnitStats(unit, overrides).attackSpeed);
}

export function scaleAttackArea(baseArea, unit, overrides = {}) {
  return Math.max(0, Number.isFinite(baseArea) ? baseArea : 0) * Math.max(0, resolveUnitStats(unit, overrides).attackArea);
}

export function applyDamage(target, rawDamage, { armor = 0, armorPenetration = 0, critical = false, critMultiplier = 1 } = {}) {
  if (!target || !Number.isFinite(target.hp)) return { actualLoss: 0, ...resolveDamage(rawDamage, armor, armorPenetration, critical, critMultiplier) };
  const resolved = resolveDamage(rawDamage, armor, armorPenetration, critical, critMultiplier);
  const actualLoss = Math.min(Math.max(0, target.hp), resolved.damage);
  target.hp = Math.max(0, target.hp - actualLoss);
  return { ...resolved, actualLoss };
}

export function applyHealing(target, amount, receiverStats = resolveUnitStats(target)) {
  if (!target || !Number.isFinite(target.hp) || target.hp <= 0) return 0;
  const maxHp = Number.isFinite(receiverStats?.maxHp) ? receiverStats.maxHp : 0;
  const received = Number.isFinite(receiverStats?.healingReceivedMultiplier) ? Math.max(0, receiverStats.healingReceivedMultiplier) : 1;
  const requested = Number.isFinite(amount) ? Math.max(0, amount) * received : 0;
  const healed = Math.min(Math.max(0, maxHp - target.hp), requested);
  target.hp += healed;
  return healed;
}

// One attack shares a single crit roll across its targets. Lifesteal uses
// actual HP removed after armor and overkill, and area attacks return one third.
export function applyDamageToTargets(source, targets, {
  rawDamage,
  area = false,
  sourceKind = "direct",
  sourceStatOverrides = {},
  armorForTarget = target => resolveUnitStats(target).armor,
  roll = () => 1
} = {}) {
  const sourceStats = source ? resolveUnitStats(source, sourceStatOverrides) : null;
  const critical = !!sourceStats && sourceStats.critChance > 0 && resolveCritical(sourceStats, roll());
  const hits = [];
  let totalActualLoss = 0;
  for (const target of targets || []) {
    const result = applyDamage(target, rawDamage, {
      armor: armorForTarget(target),
      armorPenetration: sourceStats?.armorPenetration || 0,
      critical,
      critMultiplier: sourceStats?.critMultiplier || 1
    });
    hits.push(result);
    totalActualLoss += result.actualLoss;
  }
  const baseRate = sourceKind === "direct" ? sourceStats?.lifesteal || 0 : 0;
  const healRate = area ? baseRate / 3 : baseRate;
  const healed = source && healRate > 0 ? applyHealing(source, totalActualLoss * healRate, sourceStats) : 0;
  return { hits, totalActualLoss, healed, critical };
}

export function resolveStatusDuration(baseDuration, source, target, { sourceStatOverrides = {}, targetStatOverrides = {} } = {}) {
  const sourceStats = source ? resolveUnitStats(source, sourceStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
  const targetStats = target ? resolveUnitStats(target, targetStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
  const durationScale = Number.isFinite(sourceStats.statusDuration) ? Math.max(0, sourceStats.statusDuration) : 1;
  const resistance = clamp(Number.isFinite(targetStats.statusResistance) ? targetStats.statusResistance : 0, 0, 1);
  return Math.max(0, Number.isFinite(baseDuration) ? baseDuration : 0) * durationScale * (1 - resistance);
}

export function resolveKnockback(basePower, source, target, { sourceStatOverrides = {}, targetStatOverrides = {} } = {}) {
  const sourceStats = source ? resolveUnitStats(source, sourceStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
  const targetStats = target ? resolveUnitStats(target, targetStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
  const power = Number.isFinite(sourceStats.knockbackPower) ? Math.max(0, sourceStats.knockbackPower) : 1;
  const resistance = clamp(Number.isFinite(targetStats.knockbackResistance) ? targetStats.knockbackResistance : 0, 0, 1);
  return Math.max(0, Number.isFinite(basePower) ? basePower : 0) * power * (1 - resistance);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
