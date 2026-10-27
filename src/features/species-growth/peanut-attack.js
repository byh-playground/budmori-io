import {
    attackBudgetInputs,
    attackBudgetShape,
    attackRecordShape,
    attackGeometryScale,
    captureAttackGeometry,
    attackBudgetValues,
    exactKeys,
    attackBudgetMultiplier,
} from './attack-profile.js';
import { resolveStrikeSlots, strikeSpecies } from './strike-slots.js';
import { attackTargetKey, isAttackActionDTO, commitAttackAction, createAttackRuntime } from './attack-action.js';
import { growthBuildOf, growthForAbility } from './state.js';
import { COMMON_UNIT_STAT_DEFAULTS } from '../../units/unit-stats.js';
import { FEATURE as DUAL_STRIKE_FEATURE } from '../unit-attacks/dual-strike/definition.js';

const PEANUT_WEIGHTS = Object.freeze([
    null,
    [0.5, 0.5],
    [0.45, 0.55],
    [0.3, 0.3, 0.4],
    [0.25, 0.25, 0.5],
    [0.2, 0.2, 0.3, 0.3],
    [0.15, 0.15, 0.2, 0.2, 0.3],
]);
const TICKS = [null, [3, 8], [3, 8], [2, 5, 9], [2, 5, 9], [1, 4, 6, 9], [1, 3, 5, 7, 9]];
const STAGES = [
    null,
    ['tap-left', 'tap-right'],
    ['spread-left', 'spread-right'],
    ['cross-left', 'cross-right', 'cross-left'],
    ['close-left', 'close-right', 'central'],
    ['sweep-left', 'sweep-right', 'close-left', 'close-right'],
    ['spread-left', 'spread-right', 'sweep-left', 'sweep-right', 'central'],
];
function peanutGrowthBuild(progression) {
    const ENTRY = progression?.abilities?.['peanut-death-split'];
    return ENTRY?.treeVersion === 1 ? growthBuildOf(ENTRY) : null;
}
export function peanutRange(world, unit) {
    if (unit.species !== 4) {
        return null;
    }
    if (unit.isBattleOnlySummon) {
        return 1.45;
    }
    const BUILD = peanutGrowthBuild(world.abilityProgressionFor(unit));
    return BUILD ? 1.45 * (1 + 0.04 * (BUILD.nodeRanks['specialty-1'] || 0)) : null;
}
function peanutShots(form) {
    return PEANUT_WEIGHTS[form].map((weight, slot) => ({
        slot,
        tick: TICKS[form][slot],
        weight,
        stage: STAGES[form][slot],
    }));
}
export function createPeanutAttack(world, unit, action, commandSpeed = 1) {
    const BUILD = peanutGrowthBuild(world.abilityProgressionFor(unit));
    if (unit.species !== 4 || (!BUILD && !unit.isBattleOnlySummon)) {
        return null;
    }
    const CHILD = !!unit.isBattleOnlySummon;
    const R = CHILD
        ? { 'basic-1': unit.peanutInheritedPowerRank, 'basic-3': unit.peanutInheritedSpeedRank }
        : BUILD.nodeRanks;
    const FORM = CHILD ? 1 : growthForAbility('peanut-death-split').attackTier(BUILD, unit.tier);
    const C = world.createAttackContext(unit, { attackKind: DUAL_STRIKE_FEATURE.id, attackMultiplier: 1 });
    const SPEED = Math.min(
        4,
        Math.max(0.05, C.attackerStats.attackSpeed * commandSpeed * (1 + 0.02 * (R['basic-3'] || 0))),
    );
    const INPUTS = {
        ...attackBudgetInputs(unit),
        speedRank: R['basic-3'] || 0,
        commandSpeed,
    };
    const TARGET = world.attackTarget(unit, action);
    const DX = (TARGET?.x ?? action.target.x) - unit.x,
        DY = (TARGET?.y ?? action.target.y) - unit.y;
    const DIST = Math.hypot(DX, DY) || 1;
    const TRAVEL = Math.max(0, DIST - (TARGET?.radius || 0) * 0.98);
    return {
        version: 2,
        id: action.id,
        owner: unit.id,
        ownerGeneration: unit.generation,
        ...captureAttackGeometry(unit),
        tier: unit.tier,
        form: FORM,
        child: CHILD,
        speed: SPEED,
        windupSeconds: 0.25,
        durationSeconds: 0.5,
        recoverySeconds: 1 / SPEED,
        ranks: { power: R['basic-1'] || 0, range: R['specialty-1'] || 0, finish: R['specialty-2'] || 0 },
        budgetInputs: INPUTS,
        multiplier:
            (CHILD ? 1 : attackBudgetMultiplier(unit.tier, INPUTS.one, INPUTS.current)) *
            (1 + 0.03 * (R['basic-1'] || 0)),
        source: {
            attackerStats: structuredClone(C.attackerStats),
            attackPowerMultiplier: C.attackPowerMultiplier,
            sourceKind: C.sourceKind,
            sourceDamageScale: world.passiveAttackScale(unit, C.attackerStats.maxHp),
        },
        origin: { x: unit.x, y: unit.y, z: 0 },
        point: { x: unit.x + (DX / DIST) * TRAVEL, y: unit.y + (DY / DIST) * TRAVEL, z: 0 },
        targetId: action.targetId,
        targetGeneration: action.targetGeneration,
        shots: peanutShots(FORM),
        launchTick: null,
        motionTick: 0,
        attack: null,
        criticalRolls: {},
    };
}
export function launchPeanutAttack(world, action) {
    const R = action.peanutAttack;
    if (!R || R.launchTick !== null) {
        return;
    }
    commitAttackAction(world, R, 11);
}
// These are committed melee contact corridors, not independent projectiles.
// Both kernels belong to the same body and cannot outlive its action.
function peanutSlotGeometry(r, slot) {
    const SHOT = r.shots[slot];
    const DX = r.point.x - r.origin.x,
        DY = r.point.y - r.origin.y;
    const D = Math.hypot(DX, DY) || 1,
        NX = -DY / D,
        NY = DX / D;
    const SIDE = SHOT.stage.endsWith('left') ? -1 : SHOT.stage.endsWith('right') ? 1 : 0;
    const SWEEP = SHOT.stage.startsWith('sweep'),
        SPREAD = SHOT.stage.startsWith('spread');
    const SCALE = (1 + 0.04 * r.ranks.range) * r.source.attackerStats.attackArea * attackGeometryScale(r);
    const OFFSET = SIDE * (SWEEP ? 0.55 : SPREAD ? 0.35 : 0.18) * SCALE;
    return {
        from: { x: r.origin.x + NX * OFFSET, y: r.origin.y + NY * OFFSET, z: 0 },
        to: {
            x: r.point.x + NX * (SWEEP ? -OFFSET : OFFSET * 0.3),
            y: r.point.y + NY * (SWEEP ? -OFFSET : OFFSET * 0.3),
            z: 0,
        },
        radius: (SWEEP ? 0.45 : SHOT.stage === 'central' ? 0.38 : 0.2) * SCALE,
        height: 0.5 * attackGeometryScale(r),
    };
}
const RUNTIME_OF = createAttackRuntime();
const PEANUT_STRIKES = strikeSpecies({
    recordKey: 'peanutAttack',
    runtime: RUNTIME_OF,
    slotGeometry: peanutSlotGeometry,
    attackKind: DUAL_STRIKE_FEATURE.id,
    eventKind: 'peanut-strike',
    motionTicks: () => 10,
    contextFor: () => ({}),
});
export function resolvePeanutSlots(world, unit, action, elapsed, geometry) {
    resolveStrikeSlots(world, unit, action, elapsed, geometry, PEANUT_STRIKES);
}
export function isPeanutAttackRecord(r) {
    if (
        !attackRecordShape(
            r,
            'version id owner ownerGeneration tier form child speed windupSeconds durationSeconds recoverySeconds ranks budgetInputs multiplier source origin point targetId targetGeneration shots launchTick motionTick attack criticalRolls',
        ) ||
        r.version !== 2 ||
        !['id', 'ownerGeneration', 'targetGeneration'].every((k) => Number.isSafeInteger(r[k]) && r[k] > 0) ||
        attackTargetKey(r.targetId, r.targetGeneration) === null ||
        !Number.isInteger(r.tier) ||
        r.tier < 1 ||
        r.tier > 6 ||
        !Number.isInteger(r.form) ||
        r.form < 1 ||
        r.form > r.tier ||
        typeof r.child !== 'boolean' ||
        !Number.isFinite(r.speed) ||
        r.speed < 0.05 ||
        r.speed > 4 ||
        r.windupSeconds !== 0.25 ||
        r.durationSeconds !== 0.5 ||
        r.recoverySeconds !== 1 / r.speed ||
        !exactKeys(r.ranks, 'power range finish') ||
        !Object.entries(r.ranks).every(([k, v]) => Number.isInteger(v) && v >= 0 && v <= (k === 'power' ? 10 : 5)) ||
        (r.child && (r.form !== 1 || r.tier !== 1 || r.ranks.range !== 0 || r.ranks.finish !== 0)) ||
        !attackBudgetShape(r.budgetInputs, 'one current speedRank commandSpeed') ||
        !attackBudgetValues(r.budgetInputs).every(Number.isFinite) ||
        !Number.isInteger(r.budgetInputs.speedRank) ||
        r.budgetInputs.speedRank < 0 ||
        r.budgetInputs.speedRank > 10 ||
        r.budgetInputs.commandSpeed <= 0 ||
        r.speed !==
            Math.min(
                4,
                Math.max(
                    0.05,
                    r.source?.attackerStats?.attackSpeed *
                        r.budgetInputs.commandSpeed *
                        (1 + 0.02 * r.budgetInputs.speedRank),
                ),
            ) ||
        r.multiplier !==
            (r.child ? 1 : attackBudgetMultiplier(r.tier, r.budgetInputs.one, r.budgetInputs.current)) *
                (1 + 0.03 * r.ranks.power) ||
        !exactKeys(r.source, 'attackerStats attackPowerMultiplier sourceKind sourceDamageScale') ||
        !exactKeys(
            r.source.attackerStats,
            ['maxHp', 'attackPower', ...Object.keys(COMMON_UNIT_STAT_DEFAULTS)].join(' '),
        ) ||
        !Object.values(r.source.attackerStats).every((v) => Number.isFinite(v) && v >= 0) ||
        r.source.attackerStats.maxHp <= 0 ||
        ![1, 3].includes(r.source.attackPowerMultiplier) ||
        !Number.isFinite(r.source.sourceDamageScale) ||
        r.source.sourceDamageScale < 0 ||
        !['direct', 'enemy'].includes(r.source.sourceKind) ||
        !Number.isFinite(
            r.source.attackerStats.attackPower *
                r.source.attackPowerMultiplier *
                r.multiplier *
                (1 + 0.08 * r.ranks.finish) *
                r.source.sourceDamageScale *
                Math.max(1, r.source.attackerStats.critMultiplier),
        ) ||
        !Number.isFinite(((1 + 0.04 * r.ranks.range) * r.source.attackerStats.attackArea) ** 2) ||
        ![r.origin, r.point].every(
            (p) =>
                exactKeys(p, 'x y z') &&
                Object.values(p).every((v) => Number.isFinite(v) && Math.abs(v) <= 100) &&
                p.z === 0,
        ) ||
        JSON.stringify(r.shots) !== JSON.stringify(peanutShots(r.form)) ||
        !Number.isInteger(r.motionTick) ||
        r.motionTick < 0 ||
        r.motionTick > 10 ||
        !r.criticalRolls ||
        typeof r.criticalRolls !== 'object' ||
        Array.isArray(r.criticalRolls) ||
        !Object.values(r.criticalRolls).every((v) => Number.isFinite(v) && v >= 0 && v < 1)
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
        A.plan.durationTicks === 11 &&
        JSON.stringify(A.plan.strikes) === JSON.stringify(r.shots.map(({ tick, weight }) => ({ tick, weight }))) &&
        A.claims.every((c) => c === 'basic-proc') &&
        A.claims.includes('basic-proc') === KEYS.size > 0 &&
        Object.keys(r.criticalRolls).length === KEYS.size &&
        Object.keys(r.criticalRolls).every((k) => KEYS.has(k)) &&
        A.hits.every((hits) => hits.length <= 5)
    );
}
