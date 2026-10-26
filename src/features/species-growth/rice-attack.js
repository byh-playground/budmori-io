import {
    attackBudgetInputs,
    attackBudgetShape,
    attackRecordShape,
    attackGeometryScale,
    captureAttackGeometry,
    attackBudgetValues,
} from './attack-profile.js';
import { AttackAction, attackTargetKey, isAttackActionDTO, attackOwnerCanContinue } from './attack-action.js';
import { growthBuildOf, growthForAbility } from './state.js';
import { COMMON_UNIT_STAT_DEFAULTS } from '../../units/unit-stats.js';
import { mergeMaterialCostForTier } from '../../units/unit-grades.js';
import { areOpposingFactions } from '../../core/factions.js';
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
const RATIOS = [null, [0.65], [0.25, 0.75], [0.25, 0.75], [0.25, 0.75], [0.15, 0.45, 0.85], [0.1, 0.35, 0.6, 0.9]];
// Repartition the verified legacy contact (2 ticks) plus recovery budget.
// The active scythe window overlaps that budget instead of extending it.
function riceTiming(speed) {
    const RECOVERY = Math.ceil(13 / speed);
    // With at most two recovery ticks, legacy recoil returns in one contact
    // tick after the opening cycle. Keep that measured sustained cadence.
    const TOTAL = RECOVERY + (RECOVERY <= 2 ? 1 : 2);
    const ACTIVE = Math.min(10, TOTAL - 1);
    return { activeTicks: ACTIVE, recoveryTicks: TOTAL - ACTIVE };
}
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
function riceBudgetMultiplier(tier, one, current) {
    let materials = 1;
    for (let grade = 2; grade <= tier; grade++) {
        materials *= mergeMaterialCostForTier(grade);
    }
    return one > 0 && current > 0 && Number.isFinite(one + current)
        ? (one * materials * 1.05 ** (tier - 1)) / current
        : 1.75 ** (tier - 1);
}
function riceShots(form, activeTicks = 10) {
    return RICE_WEIGHTS[form].map((weight, slot) => ({
        slot,
        tick: Math.max(1, Math.min(activeTicks, Math.round(RATIOS[form][slot] * activeTicks))),
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
    const TIMING = riceTiming(SPEED);
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
        multiplier: riceBudgetMultiplier(unit.tier, INPUTS.one, INPUTS.current) * (1 + 0.03 * (R['basic-1'] || 0)),
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
    R.launchTick = world.simulationTick;
    R.attack = new AttackAction(
        {
            durationTicks: Math.round(R.durationSeconds * 20) + 1,
            strikes: R.shots.map(({ tick, weight }) => ({ tick, weight })),
        },
        R.launchTick,
    ).toDTO();
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
// Runtime sets are derived from the validated transport record once per action.
// Restored records have new identity and reconstruct through the same DTO validator.
// Only this consumer writes the checkpoint; no hidden timing or damage is cached.
const RICE_RUNTIME = new WeakMap();
function riceRuntime(record) {
    let runtime = RICE_RUNTIME.get(record);
    if (!runtime || runtime.checkpoint !== record.attack) {
        runtime = { action: AttackAction.fromDTO(record.attack), checkpoint: record.attack };
        RICE_RUNTIME.set(record, runtime);
    }
    return runtime;
}
export function resolveRiceSlots(world, unit, action, elapsed, geometry) {
    const R = action.riceAttack;
    if (!R || R.launchTick === null || !attackOwnerCanContinue(world, unit, action, R)) {
        return;
    }
    R.motionTick = Math.min(Math.round(R.durationSeconds * 20), Math.max(0, Math.round(elapsed * 20)));
    const RUNTIME = riceRuntime(R),
        A = RUNTIME.action,
        READY = A.advance(R.launchTick + R.motionTick);
    if (!READY.length) {
        R.attack.lastTick = A.lastTick;
        return;
    }
    for (const S of READY) {
        if (!attackOwnerCanContinue(world, unit, action, R)) {
            break;
        }
        const G = riceSlotGeometry(R, S.slot),
            TARGET = world.attackTarget(unit, action),
            PRIMARY = TARGET?.hp > 0 ? TARGET : null;
        const CANDIDATES = PRIMARY ? [PRIMARY] : [];
        for (const BOSS of world.bosses) {
            if (BOSS !== PRIMARY && BOSS.active && BOSS.hp > 0 && areOpposingFactions(unit, BOSS)) {
                CANDIDATES.push(BOSS);
            }
        }
        // The same live-faction index used by sensing is current after the owner
        // lookup. A boss-only battle needs no scan of every allied body per slot.
        let hasUnitEnemy = false;
        for (const [FACTION, COUNT] of world._liveFactionCounts) {
            if (FACTION !== unit.faction && COUNT > 0) {
                hasUnitEnemy = true;
                break;
            }
        }
        if (hasUnitEnemy) {
            for (const T of world.units) {
                if (T !== PRIMARY && T.hp > 0 && areOpposingFactions(unit, T)) {
                    CANDIDATES.push(T);
                }
            }
        }
        let secondary = 0;
        for (const T of CANDIDATES) {
            if (!attackOwnerCanContinue(world, unit, action, R)) {
                break;
            }
            const MAIN = T === PRIMARY;
            if (!MAIN && secondary >= 4) {
                continue;
            }
            const HIT = geometry.sweep(G.from, G.to, G.radius, G.height, T);
            if (!HIT) {
                continue;
            }
            const ID = T.id;
            if (!A.claimHit(S.slot, ID, T.generation)) {
                continue;
            }
            if (!MAIN) {
                secondary++;
            }
            const KEY = attackTargetKey(ID, T.generation);
            if (!Object.hasOwn(R.criticalRolls, KEY)) {
                R.criticalRolls[KEY] = world.random();
                const MAX_HP = world.combatTargetDefense(T).maxHp;
                const LOST = Math.max(0, Math.min(1, 1 - T.hp / MAX_HP));
                R.criticalChances[KEY] = Math.min(
                    1,
                    Math.max(0, R.source.attackerStats.critChance + LOST * (0.35 + 0.08 * R.ranks.critical)),
                );
            }
            // Keep the first target-hit sample for every later strike in this action.
            const CRITICAL_ROLL = Reflect.get(R.criticalRolls, KEY),
                SOURCE = R.source;
            world.damageCombatTarget(unit, { id: action.id, hit: false }, T, HIT, {
                attackKind: ATTACK_KIND,
                suppressBasicProc: !A.claimOnce('basic-proc'),
                attackContext: {
                    source: unit,
                    sourceKind: SOURCE.sourceKind,
                    attackerStats: SOURCE.attackerStats,
                    damageMultiplier:
                        R.multiplier *
                        (S.weight + (S.slot === R.shots.length - 1 ? 0.08 * R.ranks.finish : 0)) *
                        (MAIN ? 1 : 0.5),
                    criticalChanceSnapshot: Reflect.get(R.criticalChances, KEY),
                    attackPowerMultiplier: SOURCE.attackPowerMultiplier,
                    sourceDamageScale: SOURCE.sourceDamageScale,
                    kind: ATTACK_KIND,
                    strikeIndex: S.slot,
                    buffed: false,
                    sourceStatOverrides: SOURCE.attackerStats,
                    area: true,
                    criticalRoll: CRITICAL_ROLL,
                    hitTargets: null,
                },
            });
        }
        world.combat('rice-strike', {
            unit: unit.id,
            actionId: action.id,
            slot: S.slot,
            form: R.form,
            stage: R.shots[S.slot].stage,
        });
    }
    // The plan and start tick are immutable after launch. Keep their original
    // transport copy and synchronize only consumed slots and mutable claims.
    R.attack.nextSlot = A.nextSlot;
    R.attack.lastTick = A.lastTick;
    R.attack.cancelled = A.cancelled;
    for (const S of READY) {
        R.attack.hits[S.slot] = [...A.hits[S.slot]];
    }
    R.attack.claims = [...A.claims];
}
const EXACT = (v, keys) =>
    v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.keys(v).sort().join(' ') === keys.split(' ').sort().join(' ');
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
        r.durationSeconds !== riceTiming(r.speed).activeTicks / 20 ||
        r.recoverySeconds !== riceTiming(r.speed).recoveryTicks / 20 ||
        !EXACT(r.ranks, 'power critical range finish') ||
        !Object.entries(r.ranks).every(([k, v]) => Number.isInteger(v) && v >= 0 && v <= (k === 'power' ? 10 : 5)) ||
        !attackBudgetShape(r.budgetInputs, 'one current') ||
        !attackBudgetValues(r.budgetInputs).every((v) => Number.isFinite(v) && v >= 0) ||
        r.budgetInputs.one > r.budgetInputs.current ||
        (r.tier === 1 && r.budgetInputs.one !== r.budgetInputs.current) ||
        !Number.isFinite(r.multiplier) ||
        r.multiplier < 1 ||
        r.multiplier !==
            riceBudgetMultiplier(r.tier, r.budgetInputs.one, r.budgetInputs.current) * (1 + 0.03 * r.ranks.power) ||
        !EXACT(r.source, 'attackerStats statMultiplier attackPowerMultiplier sourceKind sourceDamageScale') ||
        !EXACT(r.source.attackerStats, ['maxHp', 'attackPower', ...Object.keys(COMMON_UNIT_STAT_DEFAULTS)].join(' ')) ||
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
                EXACT(p, 'x y z') &&
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
