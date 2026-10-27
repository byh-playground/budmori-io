import { isBossActorId, isCombatActorId } from '../../core/combat-identity.js';
import { mergeMaterialCostForTier } from '../../units/unit-grades.js';
import { baseUnitStatsFor } from '../../units/unit-stats.js';

// True when `value` is a plain object whose own keys are exactly the space-separated `keys`.
export function exactKeys(value, keys) {
    return (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).sort().join(' ') === keys.split(' ').sort().join(' ')
    );
}

// Keep the species merge normalization separate from an actor's actual power.
// A fixed profile changes source stats, never the existing material-cost curve.
// Capture its derivation so checkpoints can still verify actual damage.
export function attackBudgetInputs(unit) {
    const INPUTS = {
        one: baseUnitStatsFor(1, unit.species, unit.faction !== 'enemy').attackPower,
        current: baseUnitStatsFor(unit.tier, unit.species, unit.faction !== 'enemy').attackPower,
    };
    if (unit.statProfile) {
        INPUTS.profile = {
            attackPower: unit.statProfile.attackPower,
            flat: unit.statModifiers?.attackPower?.flat ?? 0,
            pct: unit.statModifiers?.attackPower?.pct ?? 0,
            permanentMultiplier: Number.isFinite(unit.permanentStatMultiplier)
                ? Math.max(0, unit.permanentStatMultiplier)
                : 1,
        };
    }
    return INPUTS;
}

// The normalized basic-attack budget of a merged tier: the species' tier-one-to-tier-N attack ratio times the merge
// material cost curve, with a fixed 5% bonus per tier. Without usable base stats the budget grows 1.75 per tier.
export function attackBudgetMultiplier(tier, one, current) {
    let materials = 1;
    for (let grade = 2; grade <= tier; grade++) {
        materials *= mergeMaterialCostForTier(grade);
    }
    return one > 0 && current > 0 && Number.isFinite(one + current)
        ? (one * materials * 1.05 ** (tier - 1)) / current
        : 1.75 ** (tier - 1);
}

// Strike moments (fraction of the active window) by form; the melee-contact species share them.
export const CONTACT_STRIKE_RATIOS = Object.freeze([
    null,
    [0.65],
    [0.25, 0.75],
    [0.25, 0.75],
    [0.25, 0.75],
    [0.15, 0.45, 0.85],
    [0.1, 0.35, 0.6, 0.9],
]);

// Repartition the verified legacy contact (2 ticks) plus recovery budget.
// The active window overlaps that budget instead of extending it.
export function contactAttackTiming(speed) {
    const RECOVERY = Math.ceil(13 / speed);
    // With at most two recovery ticks, legacy recoil returns in one contact
    // tick after the opening cycle. Keep that measured sustained cadence.
    const TOTAL = RECOVERY + (RECOVERY <= 2 ? 1 : 2);
    const ACTIVE = Math.min(10, TOTAL - 1);
    return { activeTicks: ACTIVE, recoveryTicks: TOTAL - ACTIVE };
}

export function attackBudgetShape(inputs, keys) {
    return exactKeys(inputs, `${keys}${Object.hasOwn(inputs || {}, 'profile') ? ' profile' : ''}`);
}

export function attackBudgetValues(inputs) {
    return Object.entries(inputs)
        .filter(([key]) => key !== 'profile')
        .map(([, value]) => value);
}

// Absence preserves existing troop records byte-for-byte. The actor's resolved
// body profile supplies this one scale; the attack never infers a boss branch.
export function captureAttackGeometry(unit) {
    const SCALE = unit.attackGeometryScale ?? 1;
    return SCALE === 1 ? {} : { geometryScale: SCALE };
}

export function attackGeometryScale(record) {
    return Object.hasOwn(record, 'geometryScale') ? record.geometryScale : 1;
}

export function attackRecordShape(record, keys) {
    if (
        !exactKeys(record, `${keys}${Object.hasOwn(record || {}, 'geometryScale') ? ' geometryScale' : ''}`) ||
        !isCombatActorId(record.owner) ||
        !Number.isFinite(attackGeometryScale(record)) ||
        attackGeometryScale(record) <= 0 ||
        !Number.isFinite(attackGeometryScale(record) ** 2) ||
        !Number.isFinite((attackGeometryScale(record) * (record.source?.attackerStats?.attackArea ?? 1)) ** 2)
    ) {
        return false;
    }
    const INPUTS = record.budgetInputs,
        PROFILE = INPUTS?.profile;
    if (!Object.hasOwn(INPUTS || {}, 'profile')) {
        return !isBossActorId(record.owner);
    }
    if (
        !exactKeys(PROFILE, 'attackPower flat pct permanentMultiplier') ||
        !Object.values(PROFILE).every(Number.isFinite) ||
        PROFILE.permanentMultiplier < 0 ||
        (isBossActorId(record.owner) && record.source?.faction !== undefined && record.source.faction !== 'enemy')
    ) {
        return false;
    }
    const ATTACK = (PROFILE.attackPower + PROFILE.flat) * (1 + PROFILE.pct);
    return (
        Number.isFinite(ATTACK) &&
        ATTACK >= 0 &&
        record.source?.attackerStats?.attackPower === ATTACK * PROFILE.permanentMultiplier &&
        (record.source.statMultiplier === undefined || record.source.statMultiplier === PROFILE.permanentMultiplier) &&
        (INPUTS.permanentMultiplier === undefined || INPUTS.permanentMultiplier === PROFILE.permanentMultiplier)
    );
}
