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

// A ranged body keeps first-hit/safe-gap pressure but gives up durability.
// Contact bodies gain health and power without changing tier material growth.
// Profile multiplier metadata is resolved here, never copied into runtime stats.
const SPECIES_STAT_OVERRIDES = [
    { maxHpMultiplier: 1.35, attackPowerMultiplier: 1.2, armor: 20, moveSpeed: 1.12 }, // Pea frontline.
    { maxHpMultiplier: 0.8, attackSpeed: 0.92 }, // Corn ranged pressure.
    { maxHpMultiplier: 1.2, attackPowerMultiplier: 1.2, armor: 10, moveSpeed: 1.12 }, // Redbean diver.
    { maxHpMultiplier: 0.9, armor: 8 }, // Chestnut ranged thorns.
    { maxHpMultiplier: 1.25, attackPowerMultiplier: 1.15, armor: 15, moveSpeed: 1.08 }, // Peanut brawler.
    { maxHpMultiplier: 1.5, attackPowerMultiplier: 1.1, armor: 25 }, // Walnut guard.
    { maxHpMultiplier: 1.15, attackPowerMultiplier: 1.2, armor: 10, moveSpeed: 1.12 }, // Rice finisher.
    { maxHpMultiplier: 1.25, attackPowerMultiplier: 1.05, armor: 15, moveSpeed: 1.08 }, // Wheat support.
    { maxHpMultiplier: 1.35, attackPowerMultiplier: 1.15, armor: 20, moveSpeed: 1.08 }, // Barley breaker.
];
export const COMMON_UNIT_STAT_PROFILES = Object.freeze(
    Array.from({ length: SPECIES_COUNT }, (_, species) =>
        Object.freeze({
            ...COMMON_UNIT_STAT_DEFAULTS,
            ...SPECIES_STAT_OVERRIDES[species],
        }),
    ),
);
// One tower run's stat cards change every unit alike: {stat: {flat, pct}}. A stat is (base + flat) * (1 + pct); regen's
// pct is a share of max HP per second. The run sets them and the end of the run clears them.
const RUN_MODS = {};
function withRunMods(stats, modifiers = RUN_MODS) {
    const OUT = { ...stats };
    for (const [STAT, MOD] of Object.entries(modifiers)) {
        if (STAT !== 'regen') {
            OUT[STAT] = (OUT[STAT] + MOD.flat) * (1 + MOD.pct);
        }
    }
    OUT.maxHp = Math.round(OUT.maxHp);
    if (modifiers.regen) {
        OUT.regen += modifiers.regen.flat + OUT.maxHp * modifiers.regen.pct;
    }
    return OUT;
}
function createBaseStats(tier, speciesProfile, modifiers = RUN_MODS) {
    const {
        maxHpMultiplier: MAX_HP_MULTIPLIER = 1,
        attackPowerMultiplier: ATTACK_POWER_MULTIPLIER = 1,
        ...COMMON_STATS
    } = speciesProfile;
    let maxHp = TIER_HP * MAX_HP_MULTIPLIER;
    let attackPower = TIER_ATTACK * ATTACK_POWER_MULTIPLIER;
    for (let resultTier = 2; resultTier <= tier; resultTier++) {
        const TRANSITION_MULTIPLIER = UNIT_GRADES[resultTier - 1].materialCost / 2;
        maxHp *= TIER_HP_SCALE * TRANSITION_MULTIPLIER;
        attackPower *= TIER_ATTACK_SCALE * TRANSITION_MULTIPLIER;
    }
    return Object.freeze(
        withRunMods(
            {
                maxHp,
                attackPower,
                ...COMMON_UNIT_STAT_DEFAULTS,
                ...COMMON_STATS,
            },
            modifiers,
        ),
    );
}

// Only frozen definition inputs are cached. Unit state and caller overrides are
// read anew, so tier/species changes, buffs, and restored objects cannot go stale.
const BASE_STATS_BY_PROFILE = new Map();
const UNMODIFIED_STATS_BY_PROFILE = new Map();
function fillBaseStats() {
    BASE_STATS_BY_PROFILE.clear();
    for (const PROFILE of [COMMON_UNIT_STAT_DEFAULTS, ...COMMON_UNIT_STAT_PROFILES]) {
        if (!UNMODIFIED_STATS_BY_PROFILE.has(PROFILE)) {
            UNMODIFIED_STATS_BY_PROFILE.set(
                PROFILE,
                Array.from({ length: MAX_UNIT_TIER }, (_, index) => createBaseStats(index + 1, PROFILE, {})),
            );
        }
        BASE_STATS_BY_PROFILE.set(
            PROFILE,
            Array.from(
                {
                    length: MAX_UNIT_TIER,
                },
                (_, index) => createBaseStats(index + 1, PROFILE),
            ),
        );
    }
}
fillBaseStats();
export function setRunStatMods(mods) {
    for (const STAT of Object.keys(RUN_MODS)) {
        delete RUN_MODS[STAT];
    }
    Object.assign(RUN_MODS, mods);
    fillBaseStats();
}
export function baseUnitStatsFor(tier, species, includePlayerRun = true) {
    tier = Math.max(1, Math.min(MAX_UNIT_TIER, Number.isInteger(tier) ? tier : 1));
    const PROFILE = COMMON_UNIT_STAT_PROFILES[species] || COMMON_UNIT_STAT_DEFAULTS;
    return (includePlayerRun ? BASE_STATS_BY_PROFILE : UNMODIFIED_STATS_BY_PROFILE).get(PROFILE)[tier - 1];
}

// Preserve the public mutable-result contract; callers never receive the cache.
export function resolveUnitStats(unit, overrides) {
    const BASE = withRunMods(
            unit?.statProfile
                ? { ...COMMON_UNIT_STAT_DEFAULTS, ...unit.statProfile }
                : baseUnitStatsFor(unit?.tier, unit?.species, unit?.faction !== 'enemy'),
            unit?.statModifiers || {},
        ),
        MULTIPLIER = Number.isFinite(unit?.permanentStatMultiplier) ? Math.max(0, unit.permanentStatMultiplier) : 1;
    const RESULT = {
        ...BASE,
        maxHp: BASE.maxHp * MULTIPLIER * growthHealthMultiplierFor(unit),
        attackPower: BASE.attackPower * MULTIPLIER,
        ...(unit?.isFormationClone ? { maxHp: 1 } : {}),
        ...overrides,
    };
    // Percentage regeneration follows effective max HP for every body, including growth and summons.
    // Flat regeneration and explicit caller overrides remain unchanged.
    if (!Object.hasOwn(overrides || {}, 'regen')) {
        RESULT.regen +=
            (RESULT.maxHp - BASE.maxHp) *
            ((unit?.statProfile || unit?.faction === 'enemy' ? 0 : RUN_MODS.regen?.pct || 0) +
                (unit?.statModifiers?.regen?.pct || 0));
    }
    return RESULT;
}
function growthHealthMultiplierFor(unit) {
    // Split children inherit only their spawn multiplier, never the parent's permanent tree.
    return unit?.species === 4 && unit.isBattleOnlySummon ? 1 : (unit?.growthMaxHpMultiplier ?? 1);
}
// Legacy base-HP consumers retain their established semantics for all other species.
export function unitMaxHpFor(unit) {
    if (unit.statProfile || Object.keys(unit.statModifiers || {}).length) {
        return resolveUnitStats(unit).maxHp;
    }
    const SPLIT_MULTIPLIER =
        unit.species === 4 && unit.isBattleOnlySummon && Number.isFinite(unit.permanentStatMultiplier)
            ? Math.max(0, unit.permanentStatMultiplier)
            : 1;
    return unit.isFormationClone
        ? 1
        : baseUnitStatsFor(unit.tier, unit.species, unit.faction !== 'enemy').maxHp *
              growthHealthMultiplierFor(unit) *
              SPLIT_MULTIPLIER;
}
// Capture run growth on each body; independent worlds and later permanent XP cannot leak into it.
export function applyRunGrowthHealth(unit, progression, { preserveRatio = false } = {}) {
    const HAS_GROWTH_HEALTH =
        (unit.species === 2 ||
            unit.species === 3 ||
            unit.species === 4 ||
            unit.species === 5 ||
            unit.species === 6 ||
            unit.species === 7 ||
            unit.species === 8) &&
        unit.faction === 'player' &&
        !unit.isFormationClone &&
        !unit.isBattleOnlySummon;
    if (!HAS_GROWTH_HEALTH && (unit.growthMaxHpMultiplier ?? 1) === 1) {
        return;
    }
    const PREVIOUS_MAX = unitMaxHpFor(unit),
        ABILITY_ID =
            unit.species === 8
                ? 'barley-armor-break'
                : unit.species === 7
                  ? 'wheat-command-crit'
                  : unit.species === 6
                    ? 'rice-low-health-harvest'
                    : unit.species === 5
                      ? 'walnut-raw-guard'
                      : unit.species === 4
                        ? 'peanut-death-split'
                        : unit.species === 3
                          ? 'chestnut-target-thorns'
                          : 'kidney-continuous-leap',
        BUILD = progression?.abilities?.[ABILITY_ID];
    unit.growthMaxHpMultiplier =
        HAS_GROWTH_HEALTH && BUILD?.treeVersion === 1 ? 1 + 0.04 * (BUILD.nodeRanks['basic-2'] || 0) : 1;
    const NEXT_MAX = unitMaxHpFor(unit);
    if (unit.hp > 0) {
        unit.hp = preserveRatio ? Math.min(1, unit.hp / PREVIOUS_MAX) * NEXT_MAX : Math.min(unit.hp, NEXT_MAX);
    }
}
function combatStats(unit, overrides) {
    return overrides === undefined &&
        !unit?.statProfile &&
        !Object.keys(unit?.statModifiers || {}).length &&
        !unit?.isFormationClone &&
        (unit?.permanentStatMultiplier ?? 1) === 1 &&
        growthHealthMultiplierFor(unit) === 1
        ? baseUnitStatsFor(unit?.tier, unit?.species, unit?.faction !== 'enemy')
        : resolveUnitStats(unit, overrides);
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
    const MAX_HP = target.isFormationClone ? 1 : Number.isFinite(receiverStats?.maxHp) ? receiverStats.maxHp : 0;
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
        // Numeric DTO/fixture consumers retain the public helper contract.
        // All live combatants, including the boss, use Unit.setHealth.
        target.hp = value;
    }
}
