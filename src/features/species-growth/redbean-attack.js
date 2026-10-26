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
import { baseUnitStatsFor, COMMON_UNIT_STAT_DEFAULTS } from '../../units/unit-stats.js';
import { mergeMaterialCostForTier } from '../../units/unit-grades.js';
import { areOpposingFactions } from '../../core/factions.js';

const REDBEAN_WEIGHTS = Object.freeze([null, [1], [1], [0.45, 0.55], [0.45, 0.55], [0.4, 0.6], [0.2, 0.25, 0.55]]);
const LEGS = [
    null,
    [[9, 0.65]],
    [[11, 1.1]],
    [
        [9, 0.8],
        [12, 1.4],
    ],
    [
        [9, 0.8],
        [12, 1.1],
    ],
    [
        [11, 1.3],
        [15, 2.2],
    ],
    [
        [8, 0.6],
        [11, 1.1],
        [16, 2.7],
    ],
];
export function redbeanGrowthBuild(progression) {
    const ENTRY = progression?.abilities?.['kidney-continuous-leap'];
    return ENTRY?.treeVersion === 1 ? growthBuildOf(ENTRY) : null;
}
export function redbeanPlan(form, speed) {
    let end = 0;
    const LEGS_LOCAL = LEGS[form].map(([ticks, height], index) => {
        const START = end + (index ? 1 : 0);
        end = START + Math.max(3, Math.ceil(ticks / speed - 1e-9));
        return { start: START, end, height };
    });
    const STRIKES = REDBEAN_WEIGHTS[form].map((weight, index) => {
        const LEG = LEGS_LOCAL[index];
        const AERIAL = (form === 5 && index === 0) || (form === 6 && index === 1);
        return { tick: AERIAL ? LEG.end - 2 : LEG.end, weight };
    });
    return { legs: LEGS_LOCAL, durationTicks: end, strikes: STRIKES };
}
function redbeanCycleTicks(form, speed, chance) {
    const RECOVERY = Math.ceil(10 / speed - 1e-9),
        RESET = 2;
    return (
        Math.ceil(6.4 / speed - 1e-9) +
        redbeanPlan(form, speed).durationTicks +
        1 +
        RECOVERY -
        chance * Math.max(0, RECOVERY - RESET)
    );
}
function redbeanBudgetMultiplier(tier, form, speed, chance, one, current) {
    let materials = 1;
    for (let grade = 2; grade <= tier; grade++) {
        materials *= mergeMaterialCostForTier(grade);
    }
    const GRADE =
        one > 0 && current > 0 && Number.isFinite(one + current)
            ? (one * materials * 1.05 ** (tier - 1)) / current
            : 1.75 ** (tier - 1);
    return (GRADE * redbeanCycleTicks(form, speed, chance)) / redbeanCycleTicks(1, speed, chance);
}
export function createRedbeanAttack(world, unit, action, commandSpeed) {
    const BUILD = redbeanGrowthBuild(world.abilityProgressionFor(unit));
    if (!BUILD || unit.species !== 2) {
        return null;
    }
    const R = BUILD.nodeRanks,
        FORM = growthForAbility('kidney-continuous-leap').attackTier(BUILD, unit.tier);
    const CONTEXT = world.createAttackContext(unit, { attackKind: 'leap', attackMultiplier: 1 });
    const SPEED = Math.max(
        0.05,
        Math.min(
            4,
            (unit.statProfile
                ? CONTEXT.attackerStats.attackSpeed
                : baseUnitStatsFor(unit.tier, 2, unit.faction !== 'enemy').attackSpeed) *
                commandSpeed *
                (1 + 0.02 * (R['basic-3'] || 0)),
        ),
    );
    const CHANCE = Math.min(0.65, 0.2 + 0.09 * (R['specialty-2'] || 0));
    const INPUTS = attackBudgetInputs(unit);
    return {
        version: 1,
        id: action.id,
        owner: unit.id,
        ownerGeneration: unit.generation,
        ...captureAttackGeometry(unit),
        ...(unit.attackMotionProfile?.heightScale != null ? { heightScale: unit.attackMotionProfile.heightScale } : {}),
        tier: unit.tier,
        form: FORM,
        speed: SPEED,
        chance: CHANCE,
        windupSeconds: 0.32 / SPEED,
        recoverySeconds: 0.5 / SPEED,
        ranks: { power: R['basic-1'] || 0, radius: R['specialty-1'] || 0, finish: R['specialty-3'] || 0 },
        budgetInputs: INPUTS,
        directMultiplier:
            redbeanBudgetMultiplier(unit.tier, FORM, SPEED, CHANCE, INPUTS.one, INPUTS.current) *
            (1 + 0.03 * (R['basic-1'] || 0)),
        source: {
            attackerStats: structuredClone(CONTEXT.attackerStats),
            attackPowerMultiplier: CONTEXT.attackPowerMultiplier,
            sourceDamageScale: world.passiveAttackScale(unit, CONTEXT.attackerStats.maxHp),
            sourceKind: CONTEXT.sourceKind,
        },
        launchTick: null,
        motionTick: 0,
        slot: 0,
        leg: 0,
        progress: 0,
        stage: 'windup',
        origin: null,
        points: null,
        attack: null,
        reset: false,
        criticalRolls: {},
    };
}
export function launchRedbeanAttack(world, unit, action) {
    const R = action.redbeanAttack;
    if (R.launchTick !== null) {
        return;
    }
    R.launchTick = world.simulationTick;
    R.origin = { x: unit.x, y: unit.y };
    const TARGET = action.prepareAim ?? world.attackTarget(unit, action),
        X = TARGET?.x ?? action.target.x,
        Y = TARGET?.y ?? action.target.y;
    const ANGLE = Math.atan2(unit.y - Y, unit.x - X),
        DISTANCE = (TARGET?.radius || 0) + unit.radius - 0.12;
    R.points = LEGS[R.form].map((_, i) => {
        const SIDE = (R.form === 4 || R.form === 6) && i === 1 ? 0.35 : 0;
        return { x: X + Math.cos(ANGLE + SIDE) * DISTANCE, y: Y + Math.sin(ANGLE + SIDE) * DISTANCE };
    });
    const PLAN = redbeanPlan(R.form, R.speed);
    R.attack = new AttackAction({ durationTicks: PLAN.durationTicks + 1, strikes: PLAN.strikes }, R.launchTick).toDTO();
}
export function sampleRedbeanMotion(record, tick) {
    const PLAN = redbeanPlan(record.form, record.speed);
    let index = PLAN.legs.findIndex((leg) => tick <= leg.end);
    if (index < 0) {
        index = PLAN.legs.length - 1;
    }
    const LEG = PLAN.legs[index],
        Q = Math.max(0, Math.min(1, (tick - LEG.start) / (LEG.end - LEG.start))),
        FROM = index ? record.points[index - 1] : record.origin,
        TO = record.points[index];
    record.leg = index;
    record.progress = Q;
    record.stage = tick <= LEG.start || Q === 1 ? 'ground' : 'flight';
    // Smooth planar motion never retargets after departure. Height is real collision state.
    return {
        x: FROM.x + (TO.x - FROM.x) * Q,
        y: FROM.y + (TO.y - FROM.y) * Q,
        z:
            Q === 0 || Q === 1
                ? 0
                : Math.sin(Math.PI * Q) * LEG.height * (record.heightScale ?? attackGeometryScale(record)),
    };
}
export function resolveRedbeanSlots(world, unit, action, geometry) {
    const R = action.redbeanAttack;
    if (!R?.attack || !attackOwnerCanContinue(world, unit, action, R)) {
        return;
    }
    const ATTACK = AttackAction.fromDTO(R.attack),
        READY = ATTACK.advance(
            Math.min(world.simulationTick, R.launchTick + redbeanPlan(R.form, R.speed).durationTicks),
        );
    for (const STRIKE of READY) {
        if (!attackOwnerCanContinue(world, unit, action, R)) {
            break;
        }
        R.slot = STRIKE.slot;
        const FINAL = STRIKE.slot === REDBEAN_WEIGHTS[R.form].length - 1,
            POINT = sampleRedbeanMotion(R, redbeanPlan(R.form, R.speed).strikes[STRIKE.slot].tick),
            RADIUS =
                (FINAL && [4, 6].includes(R.form) ? 0.8 : 0.65) *
                (1 + 0.04 * R.ranks.radius) *
                R.source.attackerStats.attackArea *
                attackGeometryScale(R),
            PRIMARY = world.attackTarget(unit, action),
            CANDIDATES = [];
        if (PRIMARY) {
            CANDIDATES.push(PRIMARY);
        }
        for (const TARGET of world.combatUnits()) {
            if (TARGET !== PRIMARY && TARGET.hp > 0 && areOpposingFactions(unit, TARGET)) {
                CANDIDATES.push(TARGET);
            }
        }
        let secondary = 0;
        for (const TARGET of CANDIDATES) {
            if (!attackOwnerCanContinue(world, unit, action, R)) {
                break;
            }
            const IS_PRIMARY = TARGET === PRIMARY;
            if (
                (!IS_PRIMARY && secondary >= 4) ||
                !geometry.overlaps({ ...POINT, radius: RADIUS, height: unit.height }, TARGET)
            ) {
                continue;
            }
            const ID = TARGET.id;
            if (!ATTACK.claimHit(STRIKE.slot, ID, TARGET.generation)) {
                continue;
            }
            if (!IS_PRIMARY) {
                secondary++;
            }
            const KEY = attackTargetKey(ID, TARGET.generation);
            if (!Object.hasOwn(R.criticalRolls, KEY)) {
                R.criticalRolls[KEY] = world.random();
            }
            const SOURCE = R.source;
            world.damageCombatTarget(unit, { id: action.id, hit: false }, TARGET, POINT, {
                attackKind: 'leap',
                suppressBasicProc: !ATTACK.claimOnce('basic-proc'),
                attackContext: {
                    source: unit,
                    sourceKind: SOURCE.sourceKind,
                    attackerStats: SOURCE.attackerStats,
                    damageMultiplier:
                        R.directMultiplier *
                        (STRIKE.weight + (FINAL ? 0.08 * R.ranks.finish : 0)) *
                        (IS_PRIMARY ? 1 : 0.5),
                    attackPowerMultiplier: SOURCE.attackPowerMultiplier,
                    sourceDamageScale: SOURCE.sourceDamageScale,
                    kind: 'leap',
                    strikeIndex: STRIKE.slot,
                    buffed: false,
                    sourceStatOverrides: { ...SOURCE.attackerStats },
                    area: true,
                    criticalRoll: R.criticalRolls[KEY],
                    hitTargets: null,
                },
            });
        }
        if (FINAL && ATTACK.claimOnce('final-reset')) {
            R.reset = world.random() < R.chance;
            world.combat('redbean-final-reset', { unit: unit.id, actionId: action.id, success: R.reset });
        }
        world.combat('redbean-strike', {
            unit: unit.id,
            actionId: action.id,
            slot: STRIKE.slot,
            form: R.form,
            ...POINT,
        });
    }
    R.attack = ATTACK.toDTO();
}
const EXACT = (value, keys) =>
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(' ') === keys.split(' ').sort().join(' ');
export function isRedbeanAttackRecord(r) {
    if (
        !attackRecordShape(
            r,
            'version id owner ownerGeneration tier form speed chance windupSeconds recoverySeconds ranks budgetInputs directMultiplier source launchTick motionTick slot leg progress stage origin points attack reset criticalRolls' +
                (Object.hasOwn(r || {}, 'heightScale') ? ' heightScale' : ''),
        ) ||
        (Object.hasOwn(r || {}, 'heightScale') &&
            (!Number.isFinite(r.heightScale) || r.heightScale <= 0 || !Number.isFinite(r.heightScale ** 2))) ||
        r.version !== 1 ||
        !['id', 'ownerGeneration'].every((k) => Number.isSafeInteger(r[k]) && r[k] > 0) ||
        !Number.isInteger(r.tier) ||
        r.tier < 1 ||
        r.tier > 6 ||
        !Number.isInteger(r.form) ||
        r.form < 1 ||
        r.form > r.tier ||
        !Number.isFinite(r.speed) ||
        r.speed < 0.05 ||
        r.speed > 4 ||
        !Number.isFinite(r.chance) ||
        r.chance < 0.2 ||
        r.chance > 0.65 ||
        ![0, 1, 2, 3, 4, 5].some((rank) => r.chance === Math.min(0.65, 0.2 + 0.09 * rank)) ||
        r.windupSeconds !== 0.32 / r.speed ||
        r.recoverySeconds !== 0.5 / r.speed ||
        !EXACT(r.ranks, 'power radius finish') ||
        !Object.entries(r.ranks).every(([k, v]) => Number.isInteger(v) && v >= 0 && v <= (k === 'power' ? 10 : 5)) ||
        !attackBudgetShape(r.budgetInputs, 'one current') ||
        !attackBudgetValues(r.budgetInputs).every(Number.isFinite) ||
        r.directMultiplier !==
            redbeanBudgetMultiplier(r.tier, r.form, r.speed, r.chance, r.budgetInputs.one, r.budgetInputs.current) *
                (1 + 0.03 * r.ranks.power) ||
        !EXACT(r.source, 'attackerStats attackPowerMultiplier sourceDamageScale sourceKind') ||
        !EXACT(r.source.attackerStats, ['maxHp', 'attackPower', ...Object.keys(COMMON_UNIT_STAT_DEFAULTS)].join(' ')) ||
        !Object.values(r.source.attackerStats).every((v) => Number.isFinite(v) && v >= 0) ||
        r.source.attackerStats.maxHp <= 0 ||
        ![1, 3].includes(r.source.attackPowerMultiplier) ||
        !Number.isFinite(r.source.sourceDamageScale) ||
        r.source.sourceDamageScale < 0 ||
        !['direct', 'enemy'].includes(r.source.sourceKind) ||
        typeof r.reset !== 'boolean' ||
        !Number.isFinite(r.motionTick) ||
        r.motionTick < 0 ||
        !Number.isInteger(r.slot) ||
        r.slot < 0 ||
        r.slot >= REDBEAN_WEIGHTS[r.form].length ||
        !Number.isInteger(r.leg) ||
        r.leg < 0 ||
        r.leg >= LEGS[r.form].length ||
        !Number.isFinite(r.progress) ||
        r.progress < 0 ||
        r.progress > 1 ||
        !['windup', 'ground', 'flight'].includes(r.stage) ||
        !r.criticalRolls ||
        typeof r.criticalRolls !== 'object' ||
        Array.isArray(r.criticalRolls) ||
        !Object.values(r.criticalRolls).every((v) => Number.isFinite(v) && v >= 0 && v < 1)
    ) {
        return false;
    }
    for (const KEY of Object.keys(r.criticalRolls)) {
        try {
            const PARTS = JSON.parse(KEY);
            if (!Array.isArray(PARTS) || attackTargetKey(PARTS[1], PARTS[2]) !== KEY) {
                return false;
            }
        } catch {
            return false;
        }
    }
    if (r.launchTick === null) {
        return (
            r.attack === null &&
            r.origin === null &&
            r.points === null &&
            r.motionTick === 0 &&
            r.slot === 0 &&
            r.leg === 0 &&
            r.progress === 0 &&
            r.stage === 'windup' &&
            !r.reset &&
            Object.keys(r.criticalRolls).length === 0
        );
    }
    const PLAN = redbeanPlan(r.form, r.speed);
    if (!Number.isInteger(r.motionTick) || r.motionTick > PLAN.durationTicks || !isAttackActionDTO(r.attack)) {
        return false;
    }
    const HIT_KEYS = new Set(r.attack.hits.flat());
    const SAMPLE = { ...r };
    if (
        !Array.isArray(r.points) ||
        r.points.length !== PLAN.legs.length ||
        !EXACT(r.origin, 'x y') ||
        !r.points.every((point) => EXACT(point, 'x y'))
    ) {
        return false;
    }
    sampleRedbeanMotion(SAMPLE, r.motionTick);
    if (
        r.leg !== SAMPLE.leg ||
        r.progress !== SAMPLE.progress ||
        r.stage !== SAMPLE.stage ||
        r.attack.cancelled ||
        r.attack.claims.some((claim) => !['basic-proc', 'final-reset'].includes(claim)) ||
        r.attack.claims.includes('basic-proc') !== HIT_KEYS.size > 0 ||
        HIT_KEYS.size !== Object.keys(r.criticalRolls).length ||
        r.attack.lastTick !== r.launchTick + r.motionTick ||
        r.attack.nextSlot !== PLAN.strikes.filter((strike) => strike.tick <= r.motionTick).length ||
        r.attack.claims.includes('final-reset') !== (r.attack.nextSlot === PLAN.strikes.length) ||
        Object.keys(r.criticalRolls).some((key) => !r.attack.hits.some((hits) => hits.includes(key))) ||
        ![r.origin, ...r.points].every((point) =>
            Object.values(point).every((value) => Number.isFinite(value) && Math.abs(value) <= 100),
        )
    ) {
        return false;
    }
    return (
        Number.isSafeInteger(r.launchTick) &&
        r.launchTick >= 0 &&
        EXACT(r.origin, 'x y') &&
        Object.values(r.origin).every(Number.isFinite) &&
        Array.isArray(r.points) &&
        r.points.length === PLAN.legs.length &&
        r.points.every((p) => EXACT(p, 'x y') && Object.values(p).every(Number.isFinite)) &&
        isAttackActionDTO(r.attack) &&
        r.attack.startTick === r.launchTick &&
        r.attack.plan.durationTicks === PLAN.durationTicks + 1 &&
        JSON.stringify(r.attack.plan.strikes) === JSON.stringify(PLAN.strikes) &&
        r.slot === Math.max(0, r.attack.nextSlot - 1) &&
        (!r.reset || r.attack.claims.includes('final-reset'))
    );
}
