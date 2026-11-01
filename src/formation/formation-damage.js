// Approved offensive relic budget. Both factions and UI read this one formula.
export const FORMATION_DAMAGE_SETTINGS = Object.freeze({ floorGain: 0.05, levelFactor: 2, bossBaseScale: 0.25 });

export function formationBaseValue(base, floor, level, role = 'player') {
    const FLOOR = Math.max(1, Math.trunc(floor) || 1),
        LEVEL = Math.max(1, Math.trunc(level) || 1);
    return (
        (base + base * FORMATION_DAMAGE_SETTINGS.floorGain * (FLOOR - 1)) *
        FORMATION_DAMAGE_SETTINGS.levelFactor ** (LEVEL - 1) *
        (role === 'boss' ? FORMATION_DAMAGE_SETTINGS.bossBaseScale : 1)
    );
}

export function formationDamageBudget(definition, floor, level, role = 'player', hitCount = 1) {
    const PROFILE = definition.damage,
        HITS = Math.max(1, hitCount);
    return {
        damage: formationBaseValue(PROFILE.base, floor, level, role) / HITS,
        maxHpDamageRatio: PROFILE.maxHpRatio / HITS,
        missingHpDamageRatio: PROFILE.missingHpRatio / HITS,
    };
}

export function formationHealingBudget(definition, floor, level, role, averageMaxHp) {
    return (
        formationBaseValue(definition.healing.base, floor, level, role) + averageMaxHp * definition.healing.maxHpRatio
    );
}

// A boss's damage charge scales with the floor, independently of relic level or damage power.
export function formationDamageThreshold(profile, floor, maxHp = Infinity) {
    return Math.min(formationBaseValue(profile.base, floor, 1), maxHp * profile.maxHpRatio);
}

// HP-dependent terms are evaluated for each actual target immediately before the hit.
// Armor/guard/reduction remain the combat owner's responsibility.
export function formationDamageForTarget(base, components, maxHp, hp) {
    return (
        base +
        maxHp * (components?.maxHpDamageRatio || 0) +
        Math.max(0, maxHp - hp) * (components?.missingHpDamageRatio || 0)
    );
}
