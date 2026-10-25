import { isBossActorId, isCombatActorId } from '../../combat-identity.js';
import { baseUnitStatsFor } from '../../unit-stats.js';

const EXACT_KEYS = (value, keys) =>
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(' ') === keys.split(' ').sort().join(' ');

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

export function attackBudgetShape(inputs, keys) {
    return EXACT_KEYS(inputs, `${keys}${Object.hasOwn(inputs || {}, 'profile') ? ' profile' : ''}`);
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
        !EXACT_KEYS(record, `${keys}${Object.hasOwn(record || {}, 'geometryScale') ? ' geometryScale' : ''}`) ||
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
        !EXACT_KEYS(PROFILE, 'attackPower flat pct permanentMultiplier') ||
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
