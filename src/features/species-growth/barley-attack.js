import {
    attackBudgetInputs,
    attackBudgetShape,
    attackRecordShape,
    attackGeometryScale,
    captureAttackGeometry,
    attackBudgetValues,
} from './attack-profile.js';
import { BarleyArmorShredModel } from '../abilities/barley-shred/model.js';
import { AttackAction, attackTargetKey, isAttackActionDTO, attackOwnerCanContinue } from './attack-action.js';
import { growthBuildOf, growthForAbility } from './state.js';
import { COMMON_UNIT_STAT_DEFAULTS } from '../../unit-stats.js';
import { mergeMaterialCostForTier } from '../../unit-grades.js';
import { areOpposingFactions } from '../../factions.js';
const ATTACK_KIND = 'ram';

export const BARLEY_WEIGHTS = Object.freeze([
    null,
    [1],
    [0.4, 0.6],
    [0.4, 0.6],
    [0.4, 0.6],
    [0.25, 0.3, 0.45],
    [0.2, 0.2, 0.25, 0.35],
]);
const STAGES = [
    null,
    ['front'],
    ['front', 'pull'],
    ['broad', 'diagonal'],
    ['half', 'finish'],
    ['left', 'right', 'finish'],
    ['low', 'return', 'pull', 'finish'],
];
const RATIOS = [null, [0.65], [0.25, 0.75], [0.25, 0.75], [0.25, 0.75], [0.15, 0.45, 0.85], [0.1, 0.35, 0.6, 0.9]];
// Repartition the verified legacy contact (2 ticks) plus recovery budget.
// The active flail window overlaps that budget instead of extending it.
export function barleyTiming(speed) {
    const RECOVERY = Math.ceil(13 / speed);
    // With at most two recovery ticks, legacy recoil returns in one contact
    // tick after the opening cycle. Keep that measured sustained cadence.
    const TOTAL = RECOVERY + (RECOVERY <= 2 ? 1 : 2);
    const ACTIVE = Math.min(10, TOTAL - 1);
    return { activeTicks: ACTIVE, recoveryTicks: TOTAL - ACTIVE };
}
export function barleyGrowthBuild(progression) {
    const ENTRY = progression?.abilities?.['barley-armor-break'];
    return ENTRY?.treeVersion === 1 ? growthBuildOf(ENTRY) : null;
}
export function barleyRange(world, unit) {
    if (unit.species !== 8) {
        return null;
    }
    const BUILD = barleyGrowthBuild(world.abilityProgressionFor(unit));
    return BUILD ? 1.45 * (growthForAbility('barley-armor-break').attackTier(BUILD, unit.tier) >= 4 ? 1.3 : 1) : null;
}
export function barleyBudgetMultiplier(tier, one, current) {
    let materials = 1;
    for (let grade = 2; grade <= tier; grade++) {
        materials *= mergeMaterialCostForTier(grade);
    }
    return one > 0 && current > 0 && Number.isFinite(one + current)
        ? (one * materials * 1.05 ** (tier - 1)) / current
        : 1.75 ** (tier - 1);
}
export function barleyShots(form, activeTicks = 10) {
    return BARLEY_WEIGHTS[form].map((weight, slot) => ({
        slot,
        tick:
            form === 1
                ? Math.min(2, activeTicks)
                : Math.max(1, Math.min(activeTicks, Math.round(RATIOS[form][slot] * activeTicks))),
        weight,
        stage: STAGES[form][slot],
    }));
}
export function createBarleyAttack(world, unit, action, commandSpeed = 1) {
    const BUILD = barleyGrowthBuild(world.abilityProgressionFor(unit));
    if (unit.species !== 8 || !BUILD) {
        return null;
    }
    const R = BUILD.nodeRanks;
    const FORM = growthForAbility('barley-armor-break').attackTier(BUILD, unit.tier);
    const C = world.createAttackContext(unit, { attackKind: ATTACK_KIND, attackMultiplier: 1 });
    const SPEED = Math.max(0.05, C.attackerStats.attackSpeed * commandSpeed * (1 + 0.02 * (R['basic-3'] || 0)));
    const INPUTS = attackBudgetInputs(unit);
    const TARGET = world.attackTarget(unit, action);
    const DX = (TARGET?.x ?? action.target.x) - unit.x,
        DY = (TARGET?.y ?? action.target.y) - unit.y;
    const DIST = Math.hypot(DX, DY) || 1;
    const TRAVEL = Math.max(0, DIST - (TARGET?.radius || 0) * 0.98);
    const TIMING = barleyTiming(SPEED);
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
            speed: R['basic-3'] || 0,
            shred: R['specialty-1'] || 0,
            duration: R['specialty-2'] || 0,
            finish: R['specialty-3'] || 0,
        },
        budgetInputs: INPUTS,
        multiplier: barleyBudgetMultiplier(unit.tier, INPUTS.one, INPUTS.current) * (1 + 0.03 * (R['basic-1'] || 0)),
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
        shots: barleyShots(FORM, TIMING.activeTicks),
        launchTick: null,
        motionTick: 0,
        attack: null,
        criticalRolls: {},
        criticalChances: {},
    };
}
export function launchBarleyAttack(world, action) {
    const R = action.barleyAttack;
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
// Finite committed flail corridors, with broad outer and focused inner arcs.
export function barleySlotGeometry(r, slot) {
    const STAGE = r.shots[slot].stage;
    const WIDE = ['half', 'finish', 'broad', 'low', 'return', 'left', 'right'].includes(STAGE);
    const NARROW = STAGE === 'pull' || STAGE === 'diagonal';
    const SCALE = r.source.attackerStats.attackArea * (r.form >= 4 ? 1.3 : 1) * attackGeometryScale(r);
    return {
        from: r.origin,
        to: r.point,
        radius: (WIDE ? 0.65 : NARROW ? 0.22 : 0.38) * SCALE,
        height: (STAGE === 'low' ? 0.3 : 0.5) * attackGeometryScale(r),
    };
}
// Runtime sets are derived from the validated transport record once per action.
// Restored records have new identity and reconstruct through the same DTO validator.
// Only this consumer writes the checkpoint; no hidden timing or damage is cached.
const BARLEY_RUNTIME = new WeakMap();
function barleyRuntime(record) {
    let runtime = BARLEY_RUNTIME.get(record);
    if (!runtime || runtime.checkpoint !== record.attack) {
        runtime = { action: AttackAction.fromDTO(record.attack), checkpoint: record.attack };
        BARLEY_RUNTIME.set(record, runtime);
    }
    return runtime;
}
export function resolveBarleySlots(world, unit, action, elapsed, geometry) {
    const R = action.barleyAttack;
    if (!R || R.launchTick === null || !attackOwnerCanContinue(world, unit, action, R)) {
        return;
    }
    R.motionTick = Math.min(Math.round(R.durationSeconds * 20), Math.max(0, Math.round(elapsed * 20)));
    const RUNTIME = barleyRuntime(R),
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
        const G = barleySlotGeometry(R, S.slot),
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
                R.criticalChances[KEY] = Math.min(1, Math.max(0, R.source.attackerStats.critChance));
            }
            // Keep the first target-hit sample for every later strike in this action.
            const CRITICAL_ROLL = Reflect.get(R.criticalRolls, KEY),
                SOURCE = R.source;
            const DAMAGE = world.damageCombatTarget(unit, { id: action.id, hit: false }, T, HIT, {
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
            // Each successful slot applies its own share after damage. The final
            // multi-hit slot benefits from shred but never repeats the budget.
            const SHRED_SLOTS = Math.max(1, R.shots.length - 1);
            if (DAMAGE && (R.shots.length === 1 || S.slot < SHRED_SLOTS)) {
                const AMOUNT =
                    ((1 + 0.4 * R.ranks.shred) * (1 + 0.03 * R.ranks.power) * (1 + 0.2 * (R.tier - 1))) / SHRED_SLOTS;
                const RESULT = BarleyArmorShredModel.applyAmount(
                    T,
                    world.simulationTick,
                    AMOUNT,
                    60 + 8 * R.ranks.duration,
                );
                if (RESULT) {
                    world.combat('barley-shred', {
                        sourceUnit: unit.id,
                        unit: ID,
                        amount: RESULT.amount,
                        x: T.x,
                        y: T.y,
                        z: T.z || 0,
                    });
                }
            }
        }
        world.combat('barley-strike', {
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
export function isBarleyAttackRecord(r) {
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
        r.durationSeconds !== barleyTiming(r.speed).activeTicks / 20 ||
        r.recoverySeconds !== barleyTiming(r.speed).recoveryTicks / 20 ||
        !EXACT(r.ranks, 'power speed shred duration finish') ||
        !Object.entries(r.ranks).every(
            ([k, v]) => Number.isInteger(v) && v >= 0 && v <= (['power', 'speed'].includes(k) ? 10 : 5),
        ) ||
        !attackBudgetShape(r.budgetInputs, 'one current') ||
        !attackBudgetValues(r.budgetInputs).every((v) => Number.isFinite(v) && v >= 0) ||
        r.budgetInputs.one > r.budgetInputs.current ||
        (r.tier === 1 && r.budgetInputs.one !== r.budgetInputs.current) ||
        !Number.isFinite(r.multiplier) ||
        r.multiplier < 1 ||
        r.multiplier !==
            barleyBudgetMultiplier(r.tier, r.budgetInputs.one, r.budgetInputs.current) * (1 + 0.03 * r.ranks.power) ||
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
        !Number.isFinite((r.source.attackerStats.attackArea * (r.form >= 4 ? 1.3 : 1) * 0.65) ** 2) ||
        ![r.origin, r.point].every(
            (p) =>
                EXACT(p, 'x y z') &&
                Object.values(p).every((v) => Number.isFinite(v) && Math.abs(v) <= 100) &&
                p.z === 0,
        ) ||
        JSON.stringify(r.shots) !== JSON.stringify(barleyShots(r.form, Math.round(r.durationSeconds * 20))) ||
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
                v <= Math.min(1, r.source.attackerStats.critChance),
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
