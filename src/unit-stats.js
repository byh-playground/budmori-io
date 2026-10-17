import { MAX_UNIT_TIER, UNIT_GRADES } from './unit-grades.js';
import { SPECIES_COUNT } from './species-catalog.js';
const TIER_HP = 40;
const TIER_HP_SCALE = 1.5;
const TIER_ATTACK = 4;
const TIER_ATTACK_SCALE = 1.2;
const ARMOR_SCALE = 100;

// Shared combat vocabulary for every unit. Zero crit chance preserves the
// normal baseline; critical hits use the agreed 2x multiplier once enabled.
export const COMMON_UNIT_STAT_DEFAULTS = Object.freeze({
    armor: 0,
    moveSpeed: 1,
    attackSpeed: 1,
    critChance: 0,
    critMultiplier: 2,
    armorPenetration: 0,
    attackArea: 1,
    lifesteal: 0,
    regen: 0,
    healingReceivedMultiplier: 1,
    knockbackPower: 1,
    knockbackResistance: 0,
    statusDuration: 1,
    statusResistance: 0,
});

// Static profiles are the one production source for unit common-stat tuning.
// All current species inherit neutral values; fixtures may override these to
// exercise the shared math without changing live balance.
export const COMMON_UNIT_STAT_PROFILES = Object.freeze(
    Array.from(
        {
            length: SPECIES_COUNT,
        },
        () =>
            Object.freeze({
                ...COMMON_UNIT_STAT_DEFAULTS,
            }),
    ),
);
function createBaseStats(tier, speciesProfile) {
    let maxHp = TIER_HP;
    let attackPower = TIER_ATTACK;
    for (let resultTier = 2; resultTier <= tier; resultTier++) {
        const TRANSITION_MULTIPLIER = UNIT_GRADES[resultTier - 1].materialCost / 2;
        maxHp *= TIER_HP_SCALE * TRANSITION_MULTIPLIER;
        attackPower *= TIER_ATTACK_SCALE * TRANSITION_MULTIPLIER;
    }
    return Object.freeze({
        maxHp,
        attackPower,
        ...COMMON_UNIT_STAT_DEFAULTS,
        ...speciesProfile,
    });
}

// Only frozen definition inputs are cached. Unit state and caller overrides are
// read anew, so tier/species changes, buffs, and restored objects cannot go stale.
const BASE_STATS_BY_PROFILE = new Map(
    [COMMON_UNIT_STAT_DEFAULTS, ...COMMON_UNIT_STAT_PROFILES].map((profile) => [
        profile,
        Array.from(
            {
                length: MAX_UNIT_TIER,
            },
            (_, index) => createBaseStats(index + 1, profile),
        ),
    ]),
);
export function baseUnitStatsFor(tier, species) {
    tier = Math.max(1, Math.min(MAX_UNIT_TIER, Number.isInteger(tier) ? tier : 1));
    const PROFILE = COMMON_UNIT_STAT_PROFILES[species] || COMMON_UNIT_STAT_DEFAULTS;
    return BASE_STATS_BY_PROFILE.get(PROFILE)?.[tier - 1] || createBaseStats(tier, PROFILE);
}

// Preserve the public mutable-result contract; callers never receive the cache.
export function resolveUnitStats(unit, overrides) {
    return {
        ...baseUnitStatsFor(unit?.tier, unit?.species),
        ...overrides,
    };
}
function combatStats(unit, overrides) {
    return overrides === undefined ? baseUnitStatsFor(unit?.tier, unit?.species) : resolveUnitStats(unit, overrides);
}
export function resolveDamage(
    rawDamage,
    armor = 0,
    armorPenetration = 0,
    critical = false,
    critMultiplier = COMMON_UNIT_STAT_DEFAULTS.critMultiplier,
) {
    const RAW = Number.isFinite(rawDamage) ? Math.max(0, rawDamage) : 0;
    const PENETRATION = clamp(Number.isFinite(armorPenetration) ? armorPenetration : 0, 0, 1);
    const EFFECTIVE_ARMOR = Math.max(0, Number.isFinite(armor) ? armor : 0) * (1 - PENETRATION);
    const CRIT = critical ? Math.max(1, Number.isFinite(critMultiplier) ? critMultiplier : 1) : 1;
    const MITIGATED = (RAW * CRIT * ARMOR_SCALE) / (ARMOR_SCALE + EFFECTIVE_ARMOR);
    return {
        rawDamage: RAW,
        effectiveArmor: EFFECTIVE_ARMOR,
        critical,
        damage: MITIGATED,
    };
}
export function resolveCritical(stats, roll = 1) {
    const CHANCE = clamp(Number.isFinite(stats?.critChance) ? stats.critChance : 0, 0, 1);
    return CHANCE > 0 && roll < CHANCE;
}
export function scaleMoveSpeed(baseSpeed, unit, overrides) {
    return (
        Math.max(0, Number.isFinite(baseSpeed) ? baseSpeed : 0) * Math.max(0, combatStats(unit, overrides).moveSpeed)
    );
}
export function scaleAttackRecovery(baseRecovery, unit, overrides) {
    return (
        Math.max(0, Number.isFinite(baseRecovery) ? baseRecovery : 0) /
        Math.max(0.05, combatStats(unit, overrides).attackSpeed)
    );
}
export function scaleAttackArea(baseArea, unit, overrides) {
    return Math.max(0, Number.isFinite(baseArea) ? baseArea : 0) * Math.max(0, combatStats(unit, overrides).attackArea);
}
export function applyDamage(
    target,
    rawDamage,
    {
        armor = 0,
        armorPenetration = 0,
        critical = false,
        critMultiplier = COMMON_UNIT_STAT_DEFAULTS.critMultiplier,
    } = {},
) {
    if (!target || !Number.isFinite(target.hp)) {
        return {
            actualLoss: 0,
            ...resolveDamage(rawDamage, armor, armorPenetration, critical, critMultiplier),
        };
    }
    const RESOLVED = resolveDamage(rawDamage, armor, armorPenetration, critical, critMultiplier);
    const ACTUAL_LOSS = Math.min(Math.max(0, target.hp), RESOLVED.damage);
    setHealth(target, Math.max(0, target.hp - ACTUAL_LOSS));
    return {
        ...RESOLVED,
        actualLoss: ACTUAL_LOSS,
    };
}
export function applyHealing(target, amount, receiverStats = combatStats(target)) {
    if (!target || !Number.isFinite(target.hp) || target.hp <= 0) {
        return 0;
    }
    const MAX_HP = Number.isFinite(receiverStats?.maxHp) ? receiverStats.maxHp : 0;
    const RECEIVED = Number.isFinite(receiverStats?.healingReceivedMultiplier)
        ? Math.max(0, receiverStats.healingReceivedMultiplier)
        : 1;
    const REQUESTED = Number.isFinite(amount) ? Math.max(0, amount) * RECEIVED : 0;
    const HEALED = Math.min(Math.max(0, MAX_HP - target.hp), REQUESTED);
    setHealth(target, target.hp + HEALED);
    return HEALED;
}

// One attack shares a single crit roll across its targets. Lifesteal uses
// actual HP removed after armor and overkill, and area attacks return one third.
export function applyDamageToTargets(
    source,
    targets,
    {
        rawDamage,
        area = false,
        sourceKind = 'direct',
        sourceStatOverrides,
        armorForTarget = (target) => combatStats(target).armor,
        roll = () => 1,
    } = {},
) {
    const SOURCE_STATS = source ? combatStats(source, sourceStatOverrides) : null;
    const CRITICAL = !!SOURCE_STATS && SOURCE_STATS.critChance > 0 && resolveCritical(SOURCE_STATS, roll());
    const HITS = [];
    let totalActualLoss = 0;
    for (const TARGET of targets || []) {
        const RESULT = applyDamage(TARGET, rawDamage, {
            armor: armorForTarget(TARGET),
            armorPenetration: SOURCE_STATS?.armorPenetration || 0,
            critical: CRITICAL,
            critMultiplier: SOURCE_STATS?.critMultiplier ?? COMMON_UNIT_STAT_DEFAULTS.critMultiplier,
        });
        HITS.push(RESULT);
        totalActualLoss += RESULT.actualLoss;
    }
    const BASE_RATE = sourceKind === 'direct' ? SOURCE_STATS?.lifesteal || 0 : 0;
    const HEAL_RATE = area ? BASE_RATE / 3 : BASE_RATE;
    const HEALED = source && HEAL_RATE > 0 ? applyHealing(source, totalActualLoss * HEAL_RATE, SOURCE_STATS) : 0;
    return {
        hits: HITS,
        totalActualLoss,
        healed: HEALED,
        critical: CRITICAL,
    };
}
export function resolveStatusDuration(baseDuration, source, target, { sourceStatOverrides, targetStatOverrides } = {}) {
    const SOURCE_STATS = source ? combatStats(source, sourceStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const TARGET_STATS = target ? combatStats(target, targetStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const DURATION_SCALE = Number.isFinite(SOURCE_STATS.statusDuration) ? Math.max(0, SOURCE_STATS.statusDuration) : 1;
    const RESISTANCE = clamp(Number.isFinite(TARGET_STATS.statusResistance) ? TARGET_STATS.statusResistance : 0, 0, 1);
    return Math.max(0, Number.isFinite(baseDuration) ? baseDuration : 0) * DURATION_SCALE * (1 - RESISTANCE);
}
export function resolveKnockback(basePower, source, target, { sourceStatOverrides, targetStatOverrides } = {}) {
    const SOURCE_STATS = source ? combatStats(source, sourceStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const TARGET_STATS = target ? combatStats(target, targetStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const POWER = Number.isFinite(SOURCE_STATS.knockbackPower) ? Math.max(0, SOURCE_STATS.knockbackPower) : 1;
    const RESISTANCE = clamp(
        Number.isFinite(TARGET_STATS.knockbackResistance) ? TARGET_STATS.knockbackResistance : 0,
        0,
        1,
    );
    return Math.max(0, Number.isFinite(basePower) ? basePower : 0) * POWER * (1 - RESISTANCE);
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function setHealth(target, value) {
    if (typeof target.setHealth === 'function') {
        target.setHealth(value);
    } else {
        // Plain boss/checkpoint records use the same numeric helper contract.
        target.hp = value;
    }
}
