import {
    attackBudgetInputs,
    attackBudgetShape,
    attackRecordShape,
    captureAttackGeometry,
    attackBudgetValues,
} from './attack-profile.js';
import { AttackAction, attackTargetKey, isAttackActionDTO, attackOwnerCanContinue } from './attack-action.js';
import { growthForAbility, growthBuildOf } from './state.js';
import { COMMON_UNIT_STAT_DEFAULTS } from '../../units/unit-stats.js';
import { mergeMaterialCostForTier } from '../../units/unit-grades.js';

const PEA_WEIGHTS = Object.freeze([null, [1], [1], [0.45, 0.55], [1], [0.4, 0.6], [0.2, 0.25, 0.55]]);
const COMBO_TICKS = [0, 0, 0, 4, 0, 6, 8];
const PEA_SLOT_TICKS = Object.freeze([null, [0], [0], [0, 4], [0], [0, 6], [0, 3, 8]]);
const ABILITY_ID = 'pea-recovery-boost';

export function peaGrowthBuild(progression) {
    const INVESTMENT = progression?.abilities?.[ABILITY_ID];
    return INVESTMENT?.treeVersion === 1 ? growthBuildOf(INVESTMENT) : null;
}

function peaBudgetFromInputs(tier, form, recoverySeconds, one, current) {
    const BASE_TICKS = 9 + Math.ceil(recoverySeconds * 20 - 1e-9);
    let materials = 1;
    for (let grade = 2; grade <= tier; grade++) {
        materials *= mergeMaterialCostForTier(grade);
    }
    const GRADE =
        one > 0 && current > 0 && Number.isFinite(one + current)
            ? (one / current) * materials * 1.05 ** (tier - 1)
            : 1.75 ** (tier - 1);
    return (GRADE * (BASE_TICKS + COMBO_TICKS[form])) / BASE_TICKS;
}

export function createPeaAttack(world, unit, action, recoverySeconds) {
    const BUILD = peaGrowthBuild(world.abilityProgressionFor(unit)),
        GROWTH = growthForAbility(ABILITY_ID);
    if (unit.species !== 0 || !BUILD || !GROWTH) {
        return null;
    }
    const RANKS = BUILD.nodeRanks,
        FORM = GROWTH.attackTier(BUILD, unit.tier),
        RECOVERY = recoverySeconds * (1 - 0.015 * (RANKS['basic-3'] || 0)),
        CONTEXT = world.createAttackContext(unit, { attackMultiplier: 1, attackKind: 'ram' }),
        INPUTS = attackBudgetInputs(unit),
        COUNTER = unit.peaCounterExpiresAtTick > 0 && world.simulationTick <= unit.peaCounterExpiresAtTick;
    // Consumption is at action start, even if this action misses or is interrupted.
    unit.peaCounterExpiresAtTick = 0;
    return {
        version: 1,
        id: action.id,
        owner: unit.id,
        ownerGeneration: unit.generation,
        ...captureAttackGeometry(unit),
        tier: unit.tier,
        form: FORM,
        slot: 0,
        launchTick: null,
        contactTick: null,
        comboTicks: COMBO_TICKS[FORM],
        windupSeconds: 0.28,
        recoverySeconds: RECOVERY,
        stage: 'contact',
        stageProgress: 0,
        contact: null,
        direction: null,
        counter: COUNTER,
        ranks: {
            power: RANKS['basic-1'] || 0,
            counter: RANKS['basic-2'] || 0,
            recovery: RANKS['basic-3'] || 0,
            first: RANKS['specialty-2'] || 0,
            last: RANKS['specialty-3'] || 0,
        },
        budgetInputs: {
            tierOneAttack: INPUTS.one,
            tierAttack: INPUTS.current,
            ...(INPUTS.profile ? { profile: INPUTS.profile } : {}),
            baseRecovery: recoverySeconds,
        },
        directMultiplier:
            peaBudgetFromInputs(unit.tier, FORM, RECOVERY, INPUTS.one, INPUTS.current) *
            (1 + 0.03 * (RANKS['basic-1'] || 0)) *
            (COUNTER ? 1 + 0.05 * (RANKS['basic-2'] || 0) : 1),
        source: {
            attackerStats: structuredClone(CONTEXT.attackerStats),
            attackPowerMultiplier: CONTEXT.attackPowerMultiplier,
            sourceDamageScale: world.passiveAttackScale(unit, CONTEXT.attackerStats.maxHp),
            sourceKind: CONTEXT.sourceKind,
        },
        attack: null,
        criticalRolls: {},
    };
}

export function startPeaContacts(world, unit, action, hit) {
    const RECORD = action.peaAttack;
    if (RECORD.contactTick !== null) {
        return;
    }
    RECORD.contactTick = world.simulationTick;
    RECORD.contact = { x: hit.x, y: hit.y, z: 0 };
    RECORD.direction = { x: Math.cos(unit.angle), y: Math.sin(unit.angle) };
    const WEIGHTS = PEA_WEIGHTS[RECORD.form];
    RECORD.attack = new AttackAction(
        {
            durationTicks: RECORD.comboTicks + 1,
            strikes: WEIGHTS.map((weight, slot) => ({
                tick: PEA_SLOT_TICKS[RECORD.form][slot],
                weight,
            })),
        },
        world.simulationTick,
    ).toDTO();
}

export function resolvePeaContacts(world, unit, action, target, hit) {
    const RECORD = action.peaAttack;
    if (!RECORD?.attack || !attackOwnerCanContinue(world, unit, action, RECORD)) {
        return;
    }
    const NEXT = RECORD.attack.plan.strikes[RECORD.attack.nextSlot];
    if (!NEXT || world.simulationTick < RECORD.attack.startTick + NEXT.tick) {
        return;
    }
    const ATTACK = AttackAction.fromDTO(RECORD.attack),
        READY = ATTACK.advance(world.simulationTick);
    for (const STRIKE of READY) {
        if (!attackOwnerCanContinue(world, unit, action, RECORD)) {
            break;
        }
        RECORD.slot = STRIKE.slot;
        if (!hit || !ATTACK.claimHit(STRIKE.slot, target.id, target.generation)) {
            continue;
        }
        const KEY = attackTargetKey(target.id, target.generation);
        if (!Object.hasOwn(RECORD.criticalRolls, KEY)) {
            RECORD.criticalRolls[KEY] = world.random();
        }
        const SOURCE = RECORD.source,
            WEIGHT =
                STRIKE.weight +
                (STRIKE.slot === 0 ? 0.08 * RECORD.ranks.first : 0) +
                (STRIKE.slot === PEA_WEIGHTS[RECORD.form].length - 1 ? 0.08 * RECORD.ranks.last : 0),
            PROC = ATTACK.claimOnce('basic-proc');
        world.damageCombatTarget(unit, { id: action.id, hit: false }, target, hit, {
            attackKind: 'ram',
            suppressBasicProc: !PROC,
            attackContext: {
                source: unit,
                sourceKind: SOURCE.sourceKind,
                attackerStats: SOURCE.attackerStats,
                damageMultiplier: RECORD.directMultiplier * WEIGHT,
                attackPowerMultiplier: SOURCE.attackPowerMultiplier,
                giantBonusDamage: (RECORD.giantBonusDamage || 0) * STRIKE.weight,
                sourceDamageScale: SOURCE.sourceDamageScale,
                kind: 'ram',
                strikeIndex: STRIKE.slot,
                buffed: false,
                sourceStatOverrides: { ...SOURCE.attackerStats },
                area: false,
                criticalRoll: RECORD.criticalRolls[KEY],
                hitTargets: null,
            },
        });
    }
    RECORD.attack = ATTACK.toDTO();
}

export function isPeaAttackRecord(record) {
    if (
        !record ||
        !attackRecordShape(
            record,
            'version id owner ownerGeneration tier form slot launchTick contactTick comboTicks windupSeconds recoverySeconds stage stageProgress contact direction counter ranks budgetInputs directMultiplier source attack criticalRolls',
        ) ||
        record.version !== 1 ||
        !Number.isSafeInteger(record.id) ||
        record.id < 1 ||
        !Number.isSafeInteger(record.ownerGeneration) ||
        record.ownerGeneration < 1 ||
        !Number.isInteger(record.tier) ||
        record.tier < 1 ||
        record.tier > 6 ||
        !Number.isInteger(record.form) ||
        record.form < 1 ||
        record.form > record.tier ||
        record.comboTicks !== COMBO_TICKS[record.form] ||
        record.windupSeconds !== 0.28 ||
        !Number.isFinite(record.recoverySeconds) ||
        record.recoverySeconds <= 0 ||
        record.recoverySeconds > 100 ||
        !Number.isFinite(record.directMultiplier) ||
        record.directMultiplier < 0 ||
        typeof record.counter !== 'boolean' ||
        !Number.isInteger(record.slot) ||
        record.slot < 0 ||
        record.slot >= PEA_WEIGHTS[record.form].length ||
        !['contact', 'rebound', 'charge'].includes(record.stage) ||
        !Number.isFinite(record.stageProgress) ||
        record.stageProgress < 0 ||
        record.stageProgress > 1 ||
        !exactKeys(record.ranks, 'power counter recovery first last') ||
        !['power', 'counter', 'recovery', 'first', 'last'].every(
            (key) =>
                Number.isInteger(record.ranks[key]) &&
                record.ranks[key] >= 0 &&
                record.ranks[key] <= (['first', 'last'].includes(key) ? 5 : 10),
        ) ||
        !exactKeys(record.source, 'attackerStats attackPowerMultiplier sourceDamageScale sourceKind') ||
        !exactKeys(
            record.source.attackerStats,
            ['maxHp', 'attackPower', ...Object.keys(COMMON_UNIT_STAT_DEFAULTS)].join(' '),
        ) ||
        !Object.values(record.source.attackerStats).every((value) => Number.isFinite(value) && value >= 0) ||
        record.source.attackerStats.maxHp <= 0 ||
        record.source.attackPowerMultiplier !== 1 ||
        !Number.isFinite(record.source.sourceDamageScale) ||
        record.source.sourceDamageScale < 0 ||
        !['direct', 'enemy'].includes(record.source.sourceKind) ||
        !record.criticalRolls ||
        !Object.values(record.criticalRolls).every((roll) => Number.isFinite(roll) && roll >= 0 && roll < 1)
    ) {
        return false;
    }
    const INPUTS = record.budgetInputs;
    if (
        !attackBudgetShape(INPUTS, 'tierOneAttack tierAttack baseRecovery') ||
        !attackBudgetValues(INPUTS).every(Number.isFinite) ||
        INPUTS.baseRecovery <= 0 ||
        record.recoverySeconds !== INPUTS.baseRecovery * (1 - 0.015 * record.ranks.recovery) ||
        record.directMultiplier !==
            peaBudgetFromInputs(
                record.tier,
                record.form,
                record.recoverySeconds,
                INPUTS.tierOneAttack,
                INPUTS.tierAttack,
            ) *
                (1 + 0.03 * record.ranks.power) *
                (record.counter ? 1 + 0.05 * record.ranks.counter : 1)
    ) {
        return false;
    }
    for (const KEY of Object.keys(record.criticalRolls)) {
        let parts;
        try {
            parts = JSON.parse(KEY);
        } catch {
            return false;
        }
        if (!Array.isArray(parts) || attackTargetKey(parts[1], parts[2]) !== KEY) {
            return false;
        }
    }
    return (
        (record.launchTick === null || (Number.isSafeInteger(record.launchTick) && record.launchTick >= 0)) &&
        (record.contactTick === null
            ? record.attack === null &&
              record.contact === null &&
              record.direction === null &&
              record.slot === 0 &&
              Object.keys(record.criticalRolls).length === 0
            : record.launchTick !== null &&
              Number.isSafeInteger(record.contactTick) &&
              record.contactTick >= record.launchTick &&
              isAttackActionDTO(record.attack) &&
              record.attack.startTick === record.contactTick &&
              record.attack.plan.durationTicks === record.comboTicks + 1 &&
              record.attack.plan.strikes.length === PEA_WEIGHTS[record.form].length &&
              record.attack.plan.strikes.every(
                  (strike, index) =>
                      strike.weight === PEA_WEIGHTS[record.form][index] &&
                      strike.tick === PEA_SLOT_TICKS[record.form][index],
              ) &&
              record.slot === Math.max(0, record.attack.nextSlot - 1) &&
              record.contact &&
              ['x', 'y', 'z'].every((key) => Number.isFinite(record.contact[key])) &&
              record.contact.z === 0 &&
              record.direction &&
              ['x', 'y'].every((key) => Number.isFinite(record.direction[key])) &&
              Math.abs(Math.hypot(record.direction.x, record.direction.y) - 1) < 1e-9)
    );
}

function exactKeys(value, keys) {
    return (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).sort().join(' ') === keys.split(' ').sort().join(' ')
    );
}
