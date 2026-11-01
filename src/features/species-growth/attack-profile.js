import { giantBonusDamage } from '../formation-skills/giant/definition.js';
import { isBossActorId, isCombatActorId } from '../../core/combat-identity.js';
import { mergeMaterialCostForTier } from '../../units/unit-grades.js';
import {
    baseUnitStatsFor,
    applyStatModifier,
    captureAttackPowerInputs,
    attackPowerFromInputs,
} from '../../units/unit-stats.js';
import { SPECIES_COUNT } from '../../units/species-catalog.js';
import { TEMPERAMENT_TILTS } from '../../model/lineage.js';

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
    return {
        one: baseUnitStatsFor(1, unit.species, false).attackPower,
        current: baseUnitStatsFor(unit.tier, unit.species, false).attackPower,
        power: captureAttackPowerInputs(unit),
    };
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
    return (
        !(Object.hasOwn(inputs || {}, 'profile') && Object.hasOwn(inputs || {}, 'power')) &&
        exactKeys(
            inputs,
            `${keys}${Object.hasOwn(inputs || {}, 'profile') ? ' profile' : ''}${Object.hasOwn(inputs || {}, 'power') ? ' power' : ''}`,
        )
    );
}

export function attackBudgetValues(inputs) {
    return Object.entries(inputs)
        .filter(([key]) => key !== 'profile' && key !== 'power')
        .map(([, value]) => value);
}

// Absence preserves existing troop records byte-for-byte. The actor's resolved
// body profile supplies this one scale; the attack never infers a boss branch.
export function captureAttackGeometry(unit) {
    const SCALE = unit.attackGeometryScale ?? 1;
    const BONUS = giantBonusDamage(unit, unit._world?.time ?? 0);
    return { ...(SCALE === 1 ? {} : { geometryScale: SCALE }), ...(BONUS > 0 ? { giantBonusDamage: BONUS } : {}) };
}

export function attackGeometryScale(record) {
    return Object.hasOwn(record, 'geometryScale') ? record.geometryScale : 1;
}

function validAttackPower(record) {
    const INPUTS = record.budgetInputs,
        POWER = INPUTS?.power,
        VALID_MODIFIER = (value) => exactKeys(value, 'flat pct basePct') && Object.values(value).every(Number.isFinite);
    if (
        !exactKeys(POWER, 'species kind base run local permanentMultiplier temperament') ||
        !Number.isInteger(POWER.species) ||
        POWER.species < 0 ||
        POWER.species > SPECIES_COUNT ||
        !['species', 'profile'].includes(POWER.kind) ||
        !Number.isFinite(POWER.base) ||
        POWER.base < 0 ||
        !VALID_MODIFIER(POWER.run) ||
        !VALID_MODIFIER(POWER.local) ||
        !Number.isFinite(POWER.permanentMultiplier) ||
        POWER.permanentMultiplier < 0 ||
        !Number.isInteger(POWER.temperament) ||
        POWER.temperament < -1 ||
        POWER.temperament >= TEMPERAMENT_TILTS.length
    ) {
        return false;
    }
    const BARE_ONE = baseUnitStatsFor(1, POWER.species, false).attackPower,
        BARE_CURRENT = baseUnitStatsFor(record.tier, POWER.species, false).attackPower,
        ATTACK = attackPowerFromInputs(POWER);
    return (
        (INPUTS.one ?? INPUTS.tierOneAttack) === BARE_ONE &&
        (INPUTS.current ?? INPUTS.tierAttack) === BARE_CURRENT &&
        (POWER.kind !== 'species' || POWER.base === BARE_CURRENT) &&
        (POWER.kind !== 'profile' || Object.values(POWER.run).every((value) => value === 0)) &&
        (record.source?.species === undefined || record.source.species === POWER.species) &&
        (!isBossActorId(record.owner) || (POWER.kind === 'profile' && POWER.temperament === -1)) &&
        (record.source?.faction !== 'enemy' ||
            (POWER.temperament === -1 && Object.values(POWER.run).every((value) => value === 0))) &&
        Number.isFinite(ATTACK) &&
        ATTACK >= 0 &&
        record.source?.attackerStats?.attackPower === ATTACK &&
        (record.source.statMultiplier === undefined || record.source.statMultiplier === POWER.permanentMultiplier) &&
        (INPUTS.permanentMultiplier === undefined || INPUTS.permanentMultiplier === POWER.permanentMultiplier)
    );
}

// These five families historically verified the actual source against their
// tier input. New records have a separate derivation; old armed records keep
// their captured proof and damage until that action ends.
export function attackSourcePowerMatches(record, tierAttack, multiplier) {
    if (Object.hasOwn(record.budgetInputs || {}, 'power')) {
        return validAttackPower(record);
    }
    return !!record.budgetInputs?.profile || record.source?.attackerStats?.attackPower === tierAttack * multiplier;
}

export function attackRecordShape(record, keys) {
    if (
        !exactKeys(
            record,
            `${keys}${Object.hasOwn(record || {}, 'geometryScale') ? ' geometryScale' : ''}${Object.hasOwn(record || {}, 'giantBonusDamage') ? ' giantBonusDamage' : ''}`,
        ) ||
        (record.giantBonusDamage !== undefined &&
            (!Number.isFinite(record.giantBonusDamage) || record.giantBonusDamage < 0)) ||
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
    if (Object.hasOwn(INPUTS || {}, 'power')) {
        return !Object.hasOwn(INPUTS, 'profile') && validAttackPower(record);
    }
    if (!Object.hasOwn(INPUTS || {}, 'profile')) {
        return !isBossActorId(record.owner);
    }
    if (
        !exactKeys(
            PROFILE,
            `attackPower flat pct permanentMultiplier${Object.hasOwn(PROFILE || {}, 'basePct') ? ' basePct' : ''}`,
        ) ||
        !Object.values(PROFILE).every(Number.isFinite) ||
        PROFILE.permanentMultiplier < 0 ||
        (isBossActorId(record.owner) && record.source?.faction !== undefined && record.source.faction !== 'enemy')
    ) {
        return false;
    }
    const ATTACK = applyStatModifier(PROFILE.attackPower, PROFILE);
    return (
        Number.isFinite(ATTACK) &&
        ATTACK >= 0 &&
        record.source?.attackerStats?.attackPower === ATTACK * PROFILE.permanentMultiplier &&
        (record.source.statMultiplier === undefined || record.source.statMultiplier === PROFILE.permanentMultiplier) &&
        (INPUTS.permanentMultiplier === undefined || INPUTS.permanentMultiplier === PROFILE.permanentMultiplier)
    );
}
