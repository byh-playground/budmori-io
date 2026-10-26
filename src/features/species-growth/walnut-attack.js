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
const ATTACK_KIND = 'walnut-hammer';

const WALNUT_WEIGHTS = Object.freeze([
    null,
    [1],
    [0.6, 0.4],
    [0.35, 0.65],
    [0.25, 0.45, 0.3],
    [0.25, 0.45, 0.3],
    [0.15, 0.2, 0.4, 0.25],
]);
const TICKS = [null, [5], [3, 8], [3, 8], [2, 6, 9], [2, 6, 9], [1, 4, 7, 9]];
const STAGES = [
    null,
    ['down'],
    ['down', 'up'],
    ['sweep', 'down'],
    ['sweep', 'down', 'impact'],
    ['up', 'down', 'impact'],
    ['block', 'up', 'down', 'wedge'],
];
function walnutFinalDirectSlot(form) {
    return form === 1 ? 0 : form === 6 ? 2 : 1;
}
function walnutRawWeight(form, slot) {
    return form < 4
        ? slot === walnutFinalDirectSlot(form)
            ? 1
            : 0
        : slot === walnutFinalDirectSlot(form)
          ? 0.7
          : slot === walnutFinalDirectSlot(form) + 1
            ? 0.3
            : 0;
}
export function walnutGrowthBuild(progression) {
    const ENTRY = progression?.abilities?.['walnut-raw-guard'];
    return ENTRY?.treeVersion === 1 ? growthBuildOf(ENTRY) : null;
}
function walnutBudgetMultiplier(tier, one, current) {
    let materials = 1;
    for (let grade = 2; grade <= tier; grade++) {
        materials *= mergeMaterialCostForTier(grade);
    }
    return one > 0 && current > 0 && Number.isFinite(one) && Number.isFinite(current)
        ? (one / current) * materials * 1.05 ** (tier - 1)
        : 1.75 ** (tier - 1);
}
function walnutShots(form) {
    return WALNUT_WEIGHTS[form].map((weight, slot) => ({
        slot,
        tick: TICKS[form][slot],
        weight,
        stage: STAGES[form][slot],
    }));
}
export function createWalnutAttack(world, unit, action, commandSpeed = 1) {
    const BUILD = walnutGrowthBuild(world.abilityProgressionFor(unit));
    if (unit.species !== 5 || !BUILD) {
        return null;
    }
    const R = BUILD.nodeRanks;
    const FORM = growthForAbility('walnut-raw-guard').attackTier(BUILD, unit.tier);
    const C = world.createAttackContext(unit, { attackKind: ATTACK_KIND, attackMultiplier: 1 });
    const SPEED = Math.min(
        4,
        Math.max(0.05, C.attackerStats.attackSpeed * commandSpeed * (1 + 0.02 * (R['basic-3'] || 0))),
    );
    const INPUTS = attackBudgetInputs(unit);
    const TARGET = world.attackTarget(unit, action);
    const DX = (TARGET?.x ?? action.target.x) - unit.x,
        DY = (TARGET?.y ?? action.target.y) - unit.y;
    const DIST = Math.hypot(DX, DY) || 1;
    const TRAVEL = Math.max(0, DIST - (TARGET?.radius || 0) * 0.98);
    const ATTACK_POWER = C.attackerStats.attackPower * C.attackPowerMultiplier * (1 + 0.03 * (R['basic-1'] || 0));
    const MULTIPLIER = walnutBudgetMultiplier(unit.tier, INPUTS.one, INPUTS.current) * (1 + 0.03 * (R['basic-1'] || 0));
    const SOURCE_DAMAGE_SCALE = world.passiveAttackScale(unit, C.attackerStats.maxHp);
    // The cap follows the complete pre-critical direct budget. Stored RAW itself is never grade-scaled.
    const DIRECT_BUDGET = C.attackerStats.attackPower * C.attackPowerMultiplier * MULTIPLIER * SOURCE_DAMAGE_SCALE;
    const STORED = Math.max(0, unit.walnutStoredRawDamage || 0);
    const CONVERSION = 1 + 0.25 * (R['specialty-2'] || 0);
    unit.walnutStoredRawDamage = 0;
    return {
        version: 2,
        id: action.id,
        owner: unit.id,
        ownerGeneration: unit.generation,
        ...captureAttackGeometry(unit),
        tier: unit.tier,
        form: FORM,
        attackPower: ATTACK_POWER,
        storedRaw: STORED,
        rawBudget: Math.min(STORED * CONVERSION, DIRECT_BUDGET * 3),
        speed: SPEED,
        windupSeconds: 0.5,
        durationSeconds: 0.5,
        recoverySeconds: 1 / SPEED,
        ranks: { power: R['basic-1'] || 0, conversion: R['specialty-2'] || 0, finish: R['specialty-3'] || 0 },
        budgetInputs: INPUTS,
        multiplier: MULTIPLIER,
        source: {
            attackerStats: structuredClone(C.attackerStats),
            statMultiplier: unit.permanentStatMultiplier ?? 1,
            attackPowerMultiplier: C.attackPowerMultiplier,
            sourceKind: C.sourceKind,
            sourceDamageScale: SOURCE_DAMAGE_SCALE,
        },
        origin: { x: unit.x, y: unit.y, z: 0 },
        point: { x: unit.x + (DX / DIST) * TRAVEL, y: unit.y + (DY / DIST) * TRAVEL, z: 0 },
        targetId: action.targetId,
        targetGeneration: action.targetGeneration,
        shots: walnutShots(FORM),
        launchTick: null,
        motionTick: 0,
        attack: null,
        criticalRolls: {},
    };
}
export function launchWalnutAttack(world, action) {
    const R = action.walnutAttack;
    if (!R || R.launchTick !== null) {
        return;
    }
    R.launchTick = world.simulationTick;
    R.attack = new AttackAction(
        { durationTicks: 11, strikes: R.shots.map(({ tick, weight }) => ({ tick, weight })) },
        R.launchTick,
    ).toDTO();
}
// A finite hammer corridor or local contact circle, never a traveling wave.
function walnutSlotGeometry(r, slot) {
    const STAGE = r.shots[slot].stage,
        LOCAL = STAGE === 'impact' || STAGE === 'wedge';
    const SCALE = r.source.attackerStats.attackArea * attackGeometryScale(r);
    return {
        from: LOCAL ? r.point : r.origin,
        to: r.point,
        radius: (LOCAL ? 0.65 : STAGE === 'sweep' || STAGE === 'block' ? 0.45 : 0.25) * SCALE,
        height: 0.5 * attackGeometryScale(r),
    };
}
// Runtime sets are derived from the validated transport record once per action.
// Restored records have new identity and reconstruct through the same DTO validator.
// Only this consumer writes the checkpoint; no hidden timing or damage is cached.
const WALNUT_RUNTIME = new WeakMap();
function walnutRuntime(record) {
    let runtime = WALNUT_RUNTIME.get(record);
    if (!runtime || runtime.checkpoint !== record.attack) {
        runtime = { action: AttackAction.fromDTO(record.attack), checkpoint: record.attack };
        WALNUT_RUNTIME.set(record, runtime);
    }
    return runtime;
}
export function resolveWalnutSlots(world, unit, action, elapsed, geometry) {
    const R = action.walnutAttack;
    if (!R || R.launchTick === null || !attackOwnerCanContinue(world, unit, action, R)) {
        return;
    }
    R.motionTick = Math.min(10, Math.max(0, Math.round(elapsed * 20)));
    const RUNTIME = walnutRuntime(R),
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
        const G = walnutSlotGeometry(R, S.slot),
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
            }
            // Read the serializable target-key cache through the generic builtin.
            // A keyed load here repeatedly deoptimized on new boss generations.
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
                        (S.weight + (S.slot === walnutFinalDirectSlot(R.form) ? 0.08 * R.ranks.finish : 0)) *
                        (MAIN ? 1 : 0.5),
                    rawDamageBonus: MAIN ? R.rawBudget * walnutRawWeight(R.form, S.slot) : 0,
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
        world.combat('walnut-strike', {
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
export function isWalnutAttackRecord(r) {
    if (
        !attackRecordShape(
            r,
            'version id owner ownerGeneration tier form attackPower storedRaw rawBudget speed windupSeconds durationSeconds recoverySeconds ranks budgetInputs multiplier source origin point targetId targetGeneration shots launchTick motionTick attack criticalRolls',
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
        !Number.isFinite(r.storedRaw) ||
        r.storedRaw < 0 ||
        !Number.isFinite(r.attackPower) ||
        r.attackPower < 0 ||
        r.attackPower !==
            r.source?.attackerStats?.attackPower * r.source?.attackPowerMultiplier * (1 + 0.03 * r.ranks?.power) ||
        !Number.isFinite(r.rawBudget) ||
        !Number.isFinite(r.storedRaw * (1 + 0.25 * r.ranks?.conversion)) ||
        !Number.isFinite(
            r.source?.attackerStats?.attackPower *
                r.source?.attackPowerMultiplier *
                r.multiplier *
                r.source?.sourceDamageScale *
                3,
        ) ||
        r.rawBudget !==
            Math.min(
                r.storedRaw * (1 + 0.25 * r.ranks?.conversion),
                r.source?.attackerStats?.attackPower *
                    r.source?.attackPowerMultiplier *
                    r.multiplier *
                    r.source?.sourceDamageScale *
                    3,
            ) ||
        !Number.isFinite(r.speed) ||
        r.speed < 0.05 ||
        r.speed > 4 ||
        r.windupSeconds !== 0.5 ||
        r.durationSeconds !== 0.5 ||
        r.recoverySeconds !== 1 / r.speed ||
        !EXACT(r.ranks, 'power conversion finish') ||
        !Object.entries(r.ranks).every(([k, v]) => Number.isInteger(v) && v >= 0 && v <= (k === 'power' ? 10 : 5)) ||
        !attackBudgetShape(r.budgetInputs, 'one current') ||
        !attackBudgetValues(r.budgetInputs).every((v) => Number.isFinite(v) && v >= 0) ||
        r.budgetInputs.one > r.budgetInputs.current ||
        (r.tier === 1 && r.budgetInputs.one !== r.budgetInputs.current) ||
        !Number.isFinite(r.multiplier) ||
        r.multiplier < 1 ||
        r.multiplier !==
            walnutBudgetMultiplier(r.tier, r.budgetInputs.one, r.budgetInputs.current) * (1 + 0.03 * r.ranks.power) ||
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
            (r.source.attackerStats.attackPower *
                r.source.attackPowerMultiplier *
                r.multiplier *
                r.source.sourceDamageScale *
                (1 + 0.08 * r.ranks.finish) +
                r.rawBudget) *
                Math.max(1, r.source.attackerStats.critMultiplier),
        ) ||
        !Number.isFinite((r.source.attackerStats.attackArea * 0.65) ** 2) ||
        ![r.origin, r.point].every(
            (p) =>
                EXACT(p, 'x y z') &&
                Object.values(p).every((v) => Number.isFinite(v) && Math.abs(v) <= 100) &&
                p.z === 0,
        ) ||
        JSON.stringify(r.shots) !== JSON.stringify(walnutShots(r.form)) ||
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
