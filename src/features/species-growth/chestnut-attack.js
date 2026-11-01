import {
    attackBudgetInputs,
    attackBudgetShape,
    attackRecordShape,
    attackGeometryScale,
    captureAttackGeometry,
    attackBudgetValues,
} from './attack-profile.js';
import { AttackAction, attackTargetKey, isAttackActionDTO } from './attack-action.js';
import { growthBuildOf, growthForAbility } from './state.js';
import { COMMON_UNIT_STAT_DEFAULTS } from '../../units/unit-stats.js';
import { mergeMaterialCostForTier } from '../../units/unit-grades.js';
import { areOpposingFactions } from '../../core/factions.js';
import { CHESTNUT_ATTACK_RANGE } from '../abilities/chestnut-thorns/definition.js';

const CHESTNUT_WEIGHTS = Object.freeze([null, [1], [0.45, 0.55], [1], [0.4, 0.6], [0.4, 0.6], [0.25, 0.3, 0.45]]);
const STAGES = [
    null,
    ['thrust'],
    ['cross-left', 'cross-right'],
    ['fan'],
    ['fan', 'converge'],
    ['fan', 'central'],
    ['spread', 'converge', 'central'],
];
const NEUTRAL_RANKS = Object.freeze({});
export function chestnutGrowthBuild(progression) {
    const ENTRY = progression?.abilities?.['chestnut-target-thorns'];
    return ENTRY?.treeVersion === 1 ? growthBuildOf(ENTRY) : null;
}
export function chestnutRange(world, unit) {
    if (unit.species !== 3) {
        return null;
    }
    const BUILD = chestnutGrowthBuild(world.abilityProgressionFor(unit));
    if (!BUILD) {
        return null;
    }
    const FORM = growthForAbility('chestnut-target-thorns').attackTier(BUILD, unit.tier);
    return (
        (FORM >= 3 ? CHESTNUT_ATTACK_RANGE.evolved : CHESTNUT_ATTACK_RANGE.base) *
        (1 + 0.04 * (BUILD.nodeRanks['specialty-2'] || 0))
    );
}
// All six forms share one actor cadence and one normalized basic-attack budget.
function chestnutBudgetMultiplier(tier, one, current) {
    let materials = 1;
    for (let grade = 2; grade <= tier; grade++) {
        materials *= mergeMaterialCostForTier(grade);
    }
    const MULTIPLIER = (one / current) * materials * 1.05 ** (tier - 1);
    return one > 0 &&
        current > 0 &&
        Number.isFinite(one) &&
        Number.isFinite(current) &&
        Number.isFinite(MULTIPLIER) &&
        MULTIPLIER > 0
        ? MULTIPLIER
        : 1.75 ** (tier - 1);
}
// The old S1 actor repeated every 20 ticks while thorns repeated every 60.
// Transfer that fixed 1/3 contribution, so attack speed now strengthens all thorns.
export function chestnutShots(form, density, speed) {
    const BASE = CHESTNUT_WEIGHTS[form];
    const SHOTS = BASE.map((baseWeight, index) => ({
        offset: index * 3,
        baseWeight,
        finish: index === BASE.length - 1,
        stage: STAGES[form][index],
    }));
    for (let index = 0; index < density; index++) {
        SHOTS.push({ offset: ((index + 1) * 6) / density, baseWeight: 0, finish: false, stage: 'thrust' });
    }
    SHOTS.sort((a, b) => a.offset - b.offset);
    return SHOTS.map((shot, slot) => ({
        slot,
        // The actor can finish recovery before the end-of-tick emitter runs.
        // Compress finite slots into its remaining whole ticks, including tick 0.
        tick: Math.min(Math.max(0, Math.ceil(13 / speed) - 1), Math.ceil(shot.offset / speed - 1e-9)),
        weight: 1 / SHOTS.length,
        baseWeight: shot.baseWeight,
        finish: shot.finish,
        stage: shot.stage,
    }));
}
export function createChestnutAttack(world, unit, action, commandSpeed = 1) {
    const BUILD = chestnutGrowthBuild(world.abilityProgressionFor(unit));
    if (unit.species !== 3) {
        return null;
    }
    // An unresearched summon still fires the same basic thorn. No player build
    // is granted, and no-growth actors must not fall back to a contact lunge.
    const R = BUILD?.nodeRanks ?? NEUTRAL_RANKS,
        FORM = BUILD ? growthForAbility('chestnut-target-thorns').attackTier(BUILD, unit.tier) : 1;
    const C = world.createAttackContext(unit, { attackKind: 'chestnut-spike', attackMultiplier: 1 });
    const SPEED = Math.max(0.05, C.attackerStats.attackSpeed * commandSpeed * (1 + 0.02 * (R['basic-3'] || 0)));
    const INPUTS = attackBudgetInputs(unit);
    const SHOTS = chestnutShots(FORM, R['specialty-1'] || 0, SPEED);
    return {
        version: 2,
        id: action.id,
        owner: unit.id,
        ownerGeneration: unit.generation,
        ...captureAttackGeometry(unit),
        tier: unit.tier,
        form: FORM,
        speed: SPEED,
        windupSeconds: 0.28 / SPEED,
        recoverySeconds: 0.65 / SPEED,
        budgetInputs: INPUTS,
        multiplier: chestnutBudgetMultiplier(unit.tier, INPUTS.one, INPUTS.current) * (1 + 0.03 * (R['basic-1'] || 0)),
        ranks: {
            power: R['basic-1'] || 0,
            density: R['specialty-1'] || 0,
            range: R['specialty-2'] || 0,
            finish: R['specialty-3'] || 0,
        },
        source: {
            id: unit.id,
            generation: unit.generation,
            ownerId: unit.ownerId,
            faction: unit.faction,
            isFormationClone: !!unit.isFormationClone,
            species: 3,
            tier: unit.tier,
            x: unit.x,
            y: unit.y,
            z: unit.z || 0,
            sourceKind: C.sourceKind,
            attackerStats: structuredClone(C.attackerStats),
            attackPowerMultiplier: C.attackPowerMultiplier,
            sourceDamageScale: world.passiveAttackScale(unit, C.attackerStats.maxHp),
        },
        launchTick: null,
        origin: null,
        point: null,
        targetId: action.targetId,
        targetGeneration: action.targetGeneration,
        shots: SHOTS,
        motionTick: 0,
        nextShot: 0,
        completedSlots: Array(SHOTS.length).fill(false),
        cancelled: false,
        attack: null,
        criticalRolls: {},
    };
}
export function launchChestnutAttack(world, unit, action) {
    const R = action.chestnutAttack;
    if (!R || R.launchTick !== null) {
        return false;
    }
    R.launchTick = world.simulationTick;
    R.origin = { x: unit.x, y: unit.y, z: 0.35 * attackGeometryScale(R) };
    const CANDIDATE = world._unitForId(R.targetId);
    const T = action.prepareAim ?? (CANDIDATE?.generation === R.targetGeneration ? CANDIDATE : null);
    // A committed near-face point includes projectile radius, not the body's
    // contact radius. Never pursue a target after this point is captured.
    const DX = (T?.x ?? action.target.x) - unit.x,
        DY = (T?.y ?? action.target.y) - unit.y;
    const DIST = Math.hypot(DX, DY) || 1;
    const TRAVEL =
        T && (action.prepareAim || T.generation === R.targetGeneration)
            ? Math.max(0.1, DIST - T.radius + 0.04)
            : Math.hypot(action.target.x - unit.x, action.target.y - unit.y);
    R.point = { x: unit.x + (DX / DIST) * TRAVEL, y: unit.y + (DY / DIST) * TRAVEL, z: 0 };
    R.attack = new AttackAction(
        { durationTicks: R.shots.at(-1).tick + 20, strikes: R.shots.map((s) => ({ tick: s.tick, weight: s.weight })) },
        R.launchTick,
    ).toDTO();
    world.chestnutAttacks.push(R);
    emitChestnutShots(world, R);
    return true;
}
function emitChestnutShots(world, r) {
    if (r.cancelled || r.nextShot === r.shots.length) {
        return;
    }
    const OWNER = world._unitForId(r.owner);
    if (
        !OWNER ||
        OWNER.generation !== r.ownerGeneration ||
        OWNER.hp <= 0 ||
        OWNER.stun > 0 ||
        OWNER.down > 0 ||
        (OWNER.ability.action?.chestnutAttack !== r && r.nextShot < r.shots.length)
    ) {
        r.cancelled = true;
    }
    if (r.cancelled || r.launchTick + r.shots[r.nextShot].tick > world.simulationTick) {
        return;
    }
    const A = AttackAction.fromDTO(r.attack);
    A.advance(world.simulationTick);
    r.attack = A.toDTO();
    while (
        !r.cancelled &&
        r.nextShot < r.shots.length &&
        r.launchTick + r.shots[r.nextShot].tick <= world.simulationTick
    ) {
        const S = r.shots[r.nextShot];
        const DURATION = Math.max(0.1, 0.3 / r.speed);
        const P = {
            id: ++world.projectileSerial,
            owner: r.owner,
            ownerGeneration: r.ownerGeneration,
            targetId: r.targetId,
            targetGeneration: r.targetGeneration,
            faction: r.source.faction,
            ownerId: r.source.ownerId,
            species: 3,
            tier: r.tier,
            element: world.attackElement(OWNER),
            isFormationClone: r.source.isFormationClone,
            path: { from: { ...r.origin }, to: { ...r.point }, height: 0, duration: DURATION },
            elapsed: 0,
            ...r.origin,
            radius: 0.12 * attackGeometryScale(r),
            height: 0.5 * attackGeometryScale(r),
            // Drawing only: a giant's shards are drawn as big as its body. Absent at normal size, so old saves match.
            ...(OWNER.giantScale > 1 ? { chestnutGiant: OWNER.giantScale } : {}),
            hit: false,
            attackMultiplier: 1,
            projectileKind: 'chestnut-spike',
            fanIndex: S.slot,
            chestnutActionId: r.id,
            chestnutSlot: S.slot,
            chestnutForm: r.form,
            chestnutStage: S.stage,
            chestnutBornTick: world.simulationTick,
        };
        world.projectiles.push(P);
        r.nextShot++;
    }
}
export function advanceChestnutAttacks(world) {
    for (const R of world.chestnutAttacks) {
        R.motionTick = world.simulationTick - R.launchTick;
        emitChestnutShots(world, R);
    }
    const LIVE = new Set(world.projectiles.filter((p) => !p.hit).map((p) => p.chestnutActionId));
    world.chestnutAttacks = world.chestnutAttacks.filter(
        (r) =>
            (!r.cancelled && r.nextShot < r.shots.length) ||
            LIVE.has(r.id) ||
            world._unitForId(r.owner)?.ability.action?.chestnutAttack === r,
    );
}
function chestnutRecordFor(world, id) {
    return world.chestnutAttacks.find((r) => r.id === id);
}
export function resolveChestnutImpact(world, p, geometry, old) {
    const R = chestnutRecordFor(world, p.chestnutActionId);
    if (!R) {
        p.hit = true;
        return;
    }
    if (world.simulationTick <= p.chestnutBornTick) {
        return;
    }
    const AREA = ['fan', 'spread', 'converge'].includes(p.chestnutStage);
    const PRIMARY = world._unitForId(p.targetId);
    const END = p.elapsed + 1e-9 >= p.path.duration;
    const DIRECT =
        PRIMARY?.generation === p.targetGeneration && PRIMARY.hp > 0 && areOpposingFactions(R.source, PRIMARY)
            ? geometry.sweep(old, p, p.radius, p.height, PRIMARY)
            : null;
    // Single-target shots use swept collisions. Area slots resolve in their
    // committed impact region, and never promote a surviving secondary.
    if (!END && (!DIRECT || AREA)) {
        return;
    }
    const A = AttackAction.fromDTO(R.attack);
    A.advance(world.simulationTick);
    const TARGETS = AREA ? [PRIMARY, ...world.combatUnits()] : [DIRECT ? PRIMARY : null];
    const SEEN = new Set();
    let secondary = 0;
    for (const T of TARGETS) {
        if (!T || T.hp <= 0 || !areOpposingFactions(R.source, T)) {
            continue;
        }
        const ID = T.id,
            KEY = attackTargetKey(ID, T.generation);
        if (SEEN.has(KEY)) {
            continue;
        }
        SEEN.add(KEY);
        const MAIN = ID === R.targetId && T.generation === R.targetGeneration;
        if (!MAIN && (!AREA || secondary >= 4)) {
            continue;
        }
        if (AREA) {
            const FAN = ['fan', 'spread'].includes(p.chestnutStage);
            const DX = R.point.x - R.origin.x,
                DY = R.point.y - R.origin.y,
                LENGTH = Math.hypot(DX, DY) || 1;
            const TX = T.x - R.origin.x,
                TY = T.y - R.origin.y;
            const FORWARD = (TX * DX + TY * DY) / LENGTH,
                SIDE = Math.abs(TX * DY - TY * DX) / LENGTH;
            const INSIDE = FAN
                ? FORWARD >= -T.radius &&
                  SIDE <= FORWARD + T.radius * Math.SQRT2 &&
                  Math.hypot(TX, TY) <= LENGTH + T.radius &&
                  (T.z || 0) <= 0.7 * attackGeometryScale(R) &&
                  (T.z || 0) + T.height >= 0
                : geometry.overlaps(
                      {
                          ...R.point,
                          radius: 0.65 * (1 + 0.04 * R.ranks.range) * attackGeometryScale(R),
                          height: 0.7 * attackGeometryScale(R),
                      },
                      T,
                  );
            if (!INSIDE) {
                continue;
            }
        }
        if (!AREA && !DIRECT) {
            continue;
        }
        if (!A.claimHit(p.chestnutSlot, ID, T.generation)) {
            continue;
        }
        if (!MAIN) {
            secondary++;
        }
        if (!Object.hasOwn(R.criticalRolls, KEY)) {
            R.criticalRolls[KEY] = world.random();
        }
        const S = R.shots[p.chestnutSlot];
        const BASE = S.baseWeight + (S.finish ? 0.08 * R.ranks.finish : 0);
        const WEIGHT = BASE * (MAIN ? 1 : 0.5) + (MAIN ? (S.weight * (1 + 0.4 * R.ranks.density)) / 3 : 0);
        const SNAPSHOT = R.source,
            CANDIDATE = world._unitForId(R.owner),
            SOURCE = CANDIDATE?.generation === R.ownerGeneration && CANDIDATE.hp > 0 ? CANDIDATE : SNAPSHOT,
            KIND = 'chestnut-spike',
            FIRST = A.claimOnce('basic-proc');
        world.damageCombatTarget(SOURCE, { id: R.id, hit: false }, T, DIRECT || R.point, {
            attackKind: KIND,
            suppressBasicProc: !FIRST || SOURCE === SNAPSHOT,
            attackContext: {
                source: SOURCE,
                sourceKind: SNAPSHOT.sourceKind,
                attackerStats: SNAPSHOT.attackerStats,
                attackPowerMultiplier: SNAPSHOT.attackPowerMultiplier,
                giantBonusDamage: (R.giantBonusDamage || 0) * S.weight * (MAIN ? 1 : 0.5),
                sourceDamageScale: SNAPSHOT.sourceDamageScale,
                damageMultiplier: R.multiplier * WEIGHT,
                kind: KIND,
                strikeIndex: S.slot,
                buffed: false,
                sourceStatOverrides: { ...SNAPSHOT.attackerStats },
                area: AREA,
                criticalRoll: R.criticalRolls[KEY],
                hitTargets: null,
            },
        });
    }
    R.attack = A.toDTO();
    R.completedSlots[p.chestnutSlot] = true;
    p.hit = true;
}
function exactKeys(value, keys) {
    return (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).sort().join(' ') === keys.split(' ').sort().join(' ')
    );
}
export function isChestnutAttackRecord(r, { pending = false } = {}) {
    if (
        !attackRecordShape(
            r,
            'version id owner ownerGeneration tier form speed windupSeconds recoverySeconds budgetInputs multiplier ranks source launchTick origin point targetId targetGeneration shots motionTick nextShot completedSlots cancelled attack criticalRolls',
        ) ||
        r.version !== 2 ||
        !Number.isSafeInteger(r.id) ||
        r.id < 1 ||
        !Number.isSafeInteger(r.ownerGeneration) ||
        r.ownerGeneration < 1 ||
        !Number.isSafeInteger(r.targetGeneration) ||
        r.targetGeneration < 1 ||
        !attackTargetKey(r.targetId, r.targetGeneration) ||
        !Number.isInteger(r.form) ||
        r.form < 1 ||
        r.form > 6 ||
        !Number.isInteger(r.tier) ||
        r.tier < r.form ||
        r.tier > 6 ||
        typeof r.cancelled !== 'boolean' ||
        !Number.isFinite(r.speed) ||
        r.speed < 0.05 ||
        r.windupSeconds !== 0.28 / r.speed ||
        r.recoverySeconds !== 0.65 / r.speed ||
        !Number.isFinite(r.multiplier) ||
        r.multiplier <= 0 ||
        !Array.isArray(r.shots) ||
        r.shots.length < 1 ||
        r.shots.length > 32 ||
        !Number.isInteger(r.nextShot) ||
        r.nextShot < 0 ||
        r.nextShot > r.shots.length
    ) {
        return false;
    }
    if (
        !exactKeys(r.ranks, 'power density range finish') ||
        !Object.entries(r.ranks).every(([k, v]) => Number.isInteger(v) && v >= 0 && v <= (k === 'power' ? 10 : 5)) ||
        !attackBudgetShape(r.budgetInputs, 'one current') ||
        !attackBudgetValues(r.budgetInputs).every(Number.isFinite) ||
        r.multiplier !==
            chestnutBudgetMultiplier(r.tier, r.budgetInputs.one, r.budgetInputs.current) * (1 + 0.03 * r.ranks.power)
    ) {
        return false;
    }
    const SHOTS = chestnutShots(r.form, r.ranks.density, r.speed);
    const COUNT = SHOTS.length;
    if (
        !Number.isSafeInteger(r.motionTick) ||
        r.motionTick < 0 ||
        r.shots.length !== COUNT ||
        !r.shots.every(
            (s, i) =>
                exactKeys(s, 'slot tick weight baseWeight finish stage') &&
                Object.keys(SHOTS[i]).every((key) => s[key] === SHOTS[i][key]),
        ) ||
        !Array.isArray(r.completedSlots) ||
        r.completedSlots.length !== COUNT ||
        !r.completedSlots.every((v, i) => typeof v === 'boolean' && (i < r.nextShot || !v))
    ) {
        return false;
    }
    const S = r.source;
    if (
        !exactKeys(
            S,
            'id generation ownerId faction isFormationClone species tier x y z sourceKind attackerStats attackPowerMultiplier sourceDamageScale',
        ) ||
        S.id !== r.owner ||
        S.generation !== r.ownerGeneration ||
        S.species !== 3 ||
        S.tier !== r.tier ||
        typeof S.ownerId !== 'string' ||
        !['player', 'enemy'].includes(S.faction) ||
        !['direct', 'enemy'].includes(S.sourceKind) ||
        typeof S.isFormationClone !== 'boolean' ||
        !['x', 'y', 'z', 'attackPowerMultiplier', 'sourceDamageScale'].every((k) => Number.isFinite(S[k])) ||
        S.sourceDamageScale < 0 ||
        !exactKeys(S.attackerStats, ['maxHp', 'attackPower', ...Object.keys(COMMON_UNIT_STAT_DEFAULTS)].join(' ')) ||
        !Object.values(S.attackerStats).every(Number.isFinite) ||
        !r.criticalRolls ||
        typeof r.criticalRolls !== 'object' ||
        Array.isArray(r.criticalRolls)
    ) {
        return false;
    }
    if (r.launchTick === null) {
        return (
            pending &&
            r.attack === null &&
            r.origin === null &&
            r.point === null &&
            r.nextShot === 0 &&
            r.motionTick === 0 &&
            !r.cancelled &&
            Object.keys(r.criticalRolls).length === 0
        );
    }
    if (
        !Number.isSafeInteger(r.launchTick) ||
        r.launchTick < 0 ||
        !isAttackActionDTO(r.attack) ||
        r.attack.startTick !== r.launchTick ||
        r.attack.cancelled ||
        r.nextShot > r.attack.nextSlot ||
        r.attack.plan.durationTicks !== r.shots.at(-1).tick + 20 ||
        r.attack.plan.strikes.length !== COUNT ||
        !r.attack.plan.strikes.every((s, i) => s.tick === r.shots[i].tick && s.weight === r.shots[i].weight)
    ) {
        return false;
    }
    const KEYS = new Set(r.attack.hits.flat());
    return (
        r.attack.hits.every(
            (h, i) =>
                (i < r.nextShot || !h.length) &&
                (!h.length || r.completedSlots[i]) &&
                h.length <= (!['fan', 'spread', 'converge'].includes(r.shots[i].stage) ? 1 : 5),
        ) &&
        KEYS.size === Object.keys(r.criticalRolls).length &&
        Object.entries(r.criticalRolls).every(
            ([key, value]) => KEYS.has(key) && Number.isFinite(value) && value >= 0 && value < 1,
        ) &&
        r.attack.claims.length === Number(KEYS.size > 0) &&
        r.attack.claims.every((c) => c === 'basic-proc') &&
        [r.origin, r.point].every((p) => exactKeys(p, 'x y z') && ['x', 'y', 'z'].every((k) => Number.isFinite(p[k])))
    );
}
