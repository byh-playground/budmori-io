import {
    attackBudgetInputs,
    attackBudgetShape,
    attackRecordShape,
    attackGeometryScale,
    captureAttackGeometry,
    attackBudgetValues,
    exactKeys,
    attackBudgetMultiplier,
    CONTACT_STRIKE_RATIOS,
    contactAttackTiming,
} from './attack-profile.js';
import { resolveStrikeSlots, strikeSpecies } from './strike-slots.js';
import { attackTargetKey, isAttackActionDTO, commitAttackAction, createAttackRuntime } from './attack-action.js';
import { growthBuildOf, growthForAbility } from './state.js';
import { COMMON_UNIT_STAT_DEFAULTS } from '../../units/unit-stats.js';
const ATTACK_KIND = 'ram';

const RICE_WEIGHTS = Object.freeze([
    null,
    [1],
    [0.45, 0.55],
    [0.4, 0.6],
    [0.4, 0.6],
    [0.25, 0.3, 0.45],
    [0.2, 0.2, 0.25, 0.35],
]);
const STAGES = [
    null,
    ['slash'],
    ['slash', 'return'],
    ['low', 'diagonal'],
    ['wide', 'inward'],
    ['diagonal', 'return', 'harvest'],
    ['left', 'right', 'inward', 'semicircle'],
];
function riceGrowthBuild(progression) {
    const ENTRY = progression?.abilities?.['rice-low-health-harvest'];
    return ENTRY?.treeVersion === 1 ? growthBuildOf(ENTRY) : null;
}
export function riceRange(world, unit) {
    if (unit.species !== 6) {
        return null;
    }
    const BUILD = riceGrowthBuild(world.abilityProgressionFor(unit));
    return BUILD ? 1.45 * (1 + 0.04 * (BUILD.nodeRanks['specialty-2'] || 0)) : null;
}
function riceShots(form, activeTicks = 10) {
    return RICE_WEIGHTS[form].map((weight, slot) => ({
        slot,
        tick: Math.max(1, Math.min(activeTicks, Math.round(CONTACT_STRIKE_RATIOS[form][slot] * activeTicks))),
        weight,
        stage: STAGES[form][slot],
    }));
}
export function createRiceAttack(world, unit, action, commandSpeed = 1) {
    const BUILD = riceGrowthBuild(world.abilityProgressionFor(unit));
    if (unit.species !== 6 || !BUILD) {
        return null;
    }
    const R = BUILD.nodeRanks;
    const FORM = growthForAbility('rice-low-health-harvest').attackTier(BUILD, unit.tier);
    const C = world.createAttackContext(unit, { attackKind: ATTACK_KIND, attackMultiplier: 1 });
    const SPEED = Math.max(0.05, C.attackerStats.attackSpeed * commandSpeed * (1 + 0.02 * (R['basic-3'] || 0)));
    const INPUTS = attackBudgetInputs(unit);
    const TARGET = world.attackTarget(unit, action);
    const DX = (TARGET?.x ?? action.target.x) - unit.x,
        DY = (TARGET?.y ?? action.target.y) - unit.y;
    const DIST = Math.hypot(DX, DY) || 1;
    const TRAVEL = Math.max(0, DIST - (TARGET?.radius || 0) * 0.98);
    const TIMING = contactAttackTiming(SPEED);
    return {
        version: 1,
        id: action.id,
        owner: unit.id,
        ownerGeneration: unit.generation,
        ...captureAttackGeometry(unit),
        tier: unit.tier,
        form: FORM,
        speed: SPEED,
        windupSeconds: 0.28,
        durationSeconds: TIMING.activeTicks / 20,
        recoverySeconds: TIMING.recoveryTicks / 20,
        ranks: {
            power: R['basic-1'] || 0,
            critical: R['specialty-1'] || 0,
            range: R['specialty-2'] || 0,
            finish: R['specialty-3'] || 0,
        },
        budgetInputs: INPUTS,
        multiplier: attackBudgetMultiplier(unit.tier, INPUTS.one, INPUTS.current) * (1 + 0.03 * (R['basic-1'] || 0)),
        source: {
            attackerStats: structuredClone(C.attackerStats),
            statMultiplier: unit.permanentStatMultiplier ?? 1,
            attackPowerMultiplier: C.attackPowerMultiplier,
            sourceKind: C.sourceKind,
            sourceDamageScale: world.passiveAttackScale(unit, C.attackerStats.maxHp),
        },
        origin: { x: unit.x, y: unit.y, z: 0 },
        point: { x: unit.x + (DX / DIST) * TRAVEL, y: unit.y + (DY / DIST) * TRAVEL, z: 0 },
        targetId: action.targetId,
        targetGeneration: action.targetGeneration,
        shots: riceShots(FORM, TIMING.activeTicks),
        launchTick: null,
        motionTick: 0,
        attack: null,
        criticalRolls: {},
        criticalChances: {},
    };
}
export function launchRiceAttack(world, action) {
    const R = action.riceAttack;
    if (!R || R.launchTick !== null) {
        return;
    }
    commitAttackAction(world, R, Math.round(R.durationSeconds * 20) + 1);
}
// Finite committed scythe corridors, with broad outer and focused inner arcs.
function riceSlotGeometry(r, slot) {
    const STAGE = r.shots[slot].stage;
    const WIDE = STAGE === 'wide' || STAGE === 'semicircle';
    const NARROW = STAGE === 'inward' || STAGE === 'harvest';
    const SCALE = r.source.attackerStats.attackArea * (1 + 0.04 * r.ranks.range) * attackGeometryScale(r);
    return {
        from: r.origin,
        to: r.point,
        radius: (WIDE ? 0.65 : NARROW ? 0.22 : 0.38) * SCALE,
        height: (STAGE === 'diagonal' ? 0.8 : 0.5) * attackGeometryScale(r),
    };
}
const RUNTIME_OF = createAttackRuntime();
const RICE_STRIKES = strikeSpecies({
    recordKey: 'riceAttack',
    runtime: RUNTIME_OF,
    slotGeometry: riceSlotGeometry,
    attackKind: ATTACK_KIND,
    eventKind: 'rice-strike',
});
export function resolveRiceSlots(world, unit, action, elapsed, geometry) {
    resolveStrikeSlots(world, unit, action, elapsed, geometry, RICE_STRIKES);
}
export function isRiceAttackRecord(r) {
    if (
        !attackRecordShape(
            r,
            'version id owner ownerGeneration tier form speed windupSeconds durationSeconds recoverySeconds ranks budgetInputs multiplier source origin point targetId targetGeneration shots launchTick motionTick attack criticalRolls criticalChances',
        ) ||
        r.version !== 1 ||
        !['id', 'ownerGeneration', 'targetGeneration'].every((k) => Number.isSafeInteger(r[k]) && r[k] > 0) ||
        attackTargetKey(r.targetId, r.targetGeneration) === null ||
        !Number.isInteger(r.tier) ||
        r.tier < 1 ||
        r.tier > 6 ||
        !Number.isInteger(r.form) ||
        r.form < 1 ||
        r.form > r.tier ||
        !Number.isFinite(r.speed) ||
        r.speed < 0.05 ||
        r.windupSeconds !== 0.28 ||
        r.durationSeconds !== contactAttackTiming(r.speed).activeTicks / 20 ||
        r.recoverySeconds !== contactAttackTiming(r.speed).recoveryTicks / 20 ||
        !exactKeys(r.ranks, 'power critical range finish') ||
        !Object.entries(r.ranks).every(([k, v]) => Number.isInteger(v) && v >= 0 && v <= (k === 'power' ? 10 : 5)) ||
        !attackBudgetShape(r.budgetInputs, 'one current') ||
        !attackBudgetValues(r.budgetInputs).every((v) => Number.isFinite(v) && v >= 0) ||
        r.budgetInputs.one > r.budgetInputs.current ||
        (r.tier === 1 && r.budgetInputs.one !== r.budgetInputs.current) ||
        !Number.isFinite(r.multiplier) ||
        r.multiplier < 1 ||
        r.multiplier !==
            attackBudgetMultiplier(r.tier, r.budgetInputs.one, r.budgetInputs.current) * (1 + 0.03 * r.ranks.power) ||
        !exactKeys(r.source, 'attackerStats statMultiplier attackPowerMultiplier sourceKind sourceDamageScale') ||
        !exactKeys(
            r.source.attackerStats,
            ['maxHp', 'attackPower', ...Object.keys(COMMON_UNIT_STAT_DEFAULTS)].join(' '),
        ) ||
        !Object.values(r.source.attackerStats).every((v) => Number.isFinite(v) && v >= 0) ||
        r.source.attackerStats.maxHp <= 0 ||
        !Number.isFinite(r.source.statMultiplier) ||
        r.source.statMultiplier < 0 ||
        (!r.budgetInputs.profile &&
            r.source.attackerStats.attackPower !== r.budgetInputs.current * r.source.statMultiplier) ||
        ![1, 3].includes(r.source.attackPowerMultiplier) ||
        !Number.isFinite(r.source.sourceDamageScale) ||
        r.source.sourceDamageScale < 0 ||
        !['direct', 'enemy'].includes(r.source.sourceKind) ||
        !Number.isFinite(
            r.source.attackerStats.attackPower *
                r.source.attackPowerMultiplier *
                r.multiplier *
                r.source.sourceDamageScale *
                (1 + 0.08 * r.ranks.finish) *
                Math.max(1, r.source.attackerStats.critMultiplier),
        ) ||
        !Number.isFinite((r.source.attackerStats.attackArea * (1 + 0.04 * r.ranks.range) * 0.65) ** 2) ||
        ![r.origin, r.point].every(
            (p) =>
                exactKeys(p, 'x y z') &&
                Object.values(p).every((v) => Number.isFinite(v) && Math.abs(v) <= 100) &&
                p.z === 0,
        ) ||
        JSON.stringify(r.shots) !== JSON.stringify(riceShots(r.form, Math.round(r.durationSeconds * 20))) ||
        !Number.isInteger(r.motionTick) ||
        r.motionTick < 0 ||
        r.motionTick > Math.round(r.durationSeconds * 20) ||
        !r.criticalRolls ||
        typeof r.criticalRolls !== 'object' ||
        Array.isArray(r.criticalRolls) ||
        !Object.values(r.criticalRolls).every((v) => Number.isFinite(v) && v >= 0 && v < 1) ||
        !r.criticalChances ||
        typeof r.criticalChances !== 'object' ||
        Array.isArray(r.criticalChances) ||
        !Object.values(r.criticalChances).every(
            (v) =>
                Number.isFinite(v) &&
                v >= Math.min(1, r.source.attackerStats.critChance) &&
                v <= Math.min(1, r.source.attackerStats.critChance + 0.35 + 0.08 * r.ranks.critical),
        ) ||
        Object.keys(r.criticalChances).sort().join(' ') !== Object.keys(r.criticalRolls).sort().join(' ')
    ) {
        return false;
    }
    if (r.launchTick === null) {
        return r.attack === null && r.motionTick === 0 && Object.keys(r.criticalRolls).length === 0;
    }
    if (!Number.isSafeInteger(r.launchTick) || r.launchTick < 0 || !isAttackActionDTO(r.attack)) {
        return false;
    }
    const A = r.attack,
        KEYS = new Set(A.hits.flat());
    return (
        !A.cancelled &&
        A.startTick === r.launchTick &&
        A.lastTick === r.launchTick + r.motionTick &&
        A.plan.durationTicks === Math.round(r.durationSeconds * 20) + 1 &&
        JSON.stringify(A.plan.strikes) === JSON.stringify(r.shots.map(({ tick, weight }) => ({ tick, weight }))) &&
        A.claims.every((c) => c === 'basic-proc') &&
        A.claims.includes('basic-proc') === KEYS.size > 0 &&
        Object.keys(r.criticalRolls).length === KEYS.size &&
        Object.keys(r.criticalRolls).every((k) => KEYS.has(k)) &&
        A.hits.every((hits) => hits.length <= 5)
    );
}
