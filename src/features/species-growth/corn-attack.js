import { targetBodyDimensions } from '../formation-skills/model-base.js';
import { AttackAction, attackTargetKey, isAttackActionDTO } from './attack-action.js';
import { speciesGrowthDefinition } from './definition.js';
import { SpeciesGrowth } from './model.js';
import { baseUnitStatsFor, COMMON_UNIT_STAT_DEFAULTS } from '../../unit-stats.js';
import { mergeMaterialCostForTier } from '../../unit-grades.js';

// Normalize the current run's flat attack across the actual consumed material count.
// This preserves the +5% expected transition budget without fitting individual random seeds.
export const CORN_MERGE_DPS_TARGET = 1.05;
export function cornMergeBudgetMultiplier(tier, species = 1) {
    if (!Number.isInteger(tier) || tier < 1 || tier > 6) {
        throw new RangeError('Invalid corn merge tier');
    }
    const TIER_ONE_ATTACK = baseUnitStatsFor(1, species).attackPower,
        TIER_ATTACK = baseUnitStatsFor(tier, species).attackPower;
    return cornBudgetFromInputs(tier, TIER_ONE_ATTACK, TIER_ATTACK);
}

function cornBudgetFromInputs(tier, tierOneAttack, tierAttack) {
    if (tier === 1) {
        return 1;
    }
    // Product cards are nonnegative. Zero/negative attack from a diagnostic override
    // keeps a finite multiplier and the existing zero-damage rule, never divides by zero.
    if (!Number.isFinite(tierOneAttack) || !Number.isFinite(tierAttack) || !(tierOneAttack > 0) || !(tierAttack > 0)) {
        return (CORN_MERGE_DPS_TARGET / 0.6) ** (tier - 1);
    }
    let materials = 1;
    for (let grade = 2; grade <= tier; grade++) {
        materials *= mergeMaterialCostForTier(grade);
    }
    return (tierOneAttack / tierAttack) * materials * CORN_MERGE_DPS_TARGET ** (tier - 1);
}

const CORN_ABILITY = 'corn-kernel-chain';
const FORMS = Object.freeze([
    null,
    { weights: [1], times: [0.45], kernels: [1], height: 1.2 },
    { weights: [0.34, 0.33, 0.33], times: [0.35, 0.45, 0.55], kernels: [1, 1, 1], height: 1.4 },
    { weights: [1], times: [0.45], kernels: [4], height: 1.6 },
    { weights: [1], times: [0.45], kernels: [5], height: 3.2 },
    { weights: [1], times: [0.45], kernels: [6], height: 0 },
    { weights: [0.25, 0.3, 0.45], times: [0.35, 0.5, 0.65], kernels: [3, 3, 3], height: 0 },
]);

export function cornGrowthBuild(progression) {
    const INVESTMENT = progression?.abilities?.[CORN_ABILITY];
    if (INVESTMENT?.treeVersion !== 1 || !INVESTMENT.nodeRanks) {
        return null;
    }
    return {
        masteryLevel: INVESTMENT.masteryLevel,
        masteryXp: INVESTMENT.masteryXp,
        nodeRanks: INVESTMENT.nodeRanks,
        ...(INVESTMENT.legacyMastery ? { legacyMastery: INVESTMENT.legacyMastery } : {}),
    };
}

export function createCornAttack(world, unit, action, commandSpeed = 1) {
    const BUILD = cornGrowthBuild(world.abilityProgressionFor(unit));
    if (unit.species !== 1 || !BUILD) {
        return null;
    }
    const GROWTH = new SpeciesGrowth(speciesGrowthDefinition(1)),
        FORM = GROWTH.attackTier(BUILD, unit.tier),
        CONFIG = FORMS[FORM],
        CONTEXT = world.createAttackContext(unit, { attackMultiplier: 1, attackKind: 'lob' }),
        RANKS = BUILD.nodeRanks,
        SPEED = Math.min(
            1.63 / 0.35,
            Math.max(0.05, CONTEXT.attackerStats.attackSpeed * commandSpeed * (1 + 0.02 * (RANKS['basic-3'] || 0))),
        ),
        GRADE = cornMergeBudgetMultiplier(unit.tier, unit.species),
        BASE_KERNELS = CONFIG.kernels.reduce((total, count) => total + count, 0),
        EXTRA = (RANKS['specialty-3'] || 0) > 0 && world.random() < 0.08 * RANKS['specialty-3'];
    let kernelStart = 0;
    const SHOTS = CONFIG.weights.map((weight, slot) => {
        const SHOT = {
            slot,
            weight,
            duration: CONFIG.times[slot] / SPEED,
            kernelStart,
            kernelCount: CONFIG.kernels[slot],
        };
        kernelStart += CONFIG.kernels[slot];
        return SHOT;
    });
    return {
        version: 1,
        id: action.id,
        owner: unit.id,
        ownerGeneration: unit.generation,
        tier: unit.tier,
        form: FORM,
        launchTick: null,
        firstAttachTick: null,
        speed: SPEED,
        budgetInputs: {
            tierOneAttack: baseUnitStatsFor(1, unit.species).attackPower,
            tierAttack: baseUnitStatsFor(unit.tier, unit.species).attackPower,
            gradeMultiplier: GRADE,
            permanentMultiplier: Number.isFinite(unit.permanentStatMultiplier)
                ? Math.max(0, unit.permanentStatMultiplier)
                : 1,
            directRank: RANKS['basic-1'] || 0,
            attachmentRank: RANKS['basic-2'] || 0,
            speedRank: RANKS['basic-3'] || 0,
            commandSpeed,
        },
        windupSeconds: 0.38 / SPEED,
        recoverySeconds: 1.25 / SPEED,
        shots: SHOTS,
        baseKernelCount: BASE_KERNELS,
        extraKernel: EXTRA,
        terminalIndex: BASE_KERNELS - 1 + Number(EXTRA),
        ranks: {
            heating: RANKS['specialty-1'] || 0,
            finish: RANKS['specialty-2'] || 0,
            extra: RANKS['specialty-3'] || 0,
        },
        directMultiplier: 1.6 * GRADE * (1 + 0.03 * (RANKS['basic-1'] || 0)),
        attachmentMultiplier: 0.5 * GRADE * (1 + 0.03 * (RANKS['basic-2'] || 0)),
        source: {
            id: unit.id,
            generation: unit.generation,
            ownerId: unit.ownerId || '',
            faction: unit.faction,
            isFormationClone: !!unit.isFormationClone,
            species: unit.species,
            tier: unit.tier,
            hp: unit.hp,
            x: unit.x,
            y: unit.y,
            z: unit.z || 0,
            giantUntil: unit.giantUntil || 0,
            sourceKind: CONTEXT.sourceKind,
            attackerStats: structuredClone(CONTEXT.attackerStats),
            attackPowerMultiplier: CONTEXT.attackPowerMultiplier,
            sourceDamageScale: world.passiveDamageScale(
                unit,
                CONTEXT.attackerStats.maxHp,
                world.boss,
                world.boss.maxHp,
            ),
            buffed: CONTEXT.buffed,
        },
        attack: null,
        criticalRolls: {},
    };
}

export function launchCornAttack(world, unit, action) {
    const RECORD = action.cornAttack;
    if (!RECORD || RECORD.launchTick !== null) {
        return false;
    }
    RECORD.launchTick = world.simulationTick;
    RECORD.attack = new AttackAction(
        {
            durationTicks: Math.ceil(RECORD.recoverySeconds * 20) + 1,
            strikes: RECORD.shots.map((shot) => ({ tick: Math.ceil(shot.duration * 20 - 1e-9), weight: shot.weight })),
        },
        RECORD.launchTick,
    ).toDTO();
    world.cornAttachments.actions ||= [];
    world.cornAttachments.actions.push(RECORD);
    for (const SHOT of RECORD.shots) {
        const PROJECTILE = world.spawnLobProjectile(unit, action, {
            shotIndex: SHOT.slot,
            attackMultiplier: RECORD.directMultiplier * SHOT.weight,
        });
        if (!PROJECTILE) {
            continue;
        }
        const METEOR = RECORD.form >= 5,
            DX = action.target.x - unit.x,
            DY = action.target.y - unit.y,
            DISTANCE = Math.hypot(DX, DY) || 1,
            OFFSET = RECORD.form === 6 ? (SHOT.slot - 1) * 0.08 : 0,
            TO = {
                ...action.target,
                x: action.target.x - (DY / DISTANCE) * OFFSET,
                y: action.target.y + (DX / DISTANCE) * OFFSET,
            },
            TARGET = action.targetId === 'boss' ? world.boss : world._unitForId(action.targetId),
            TARGET_BODY = targetBodyDimensions(TARGET),
            SKY_SPREAD = RECORD.form === 6 ? (SHOT.slot - 1) * 3.4 : 0,
            SKY_Z = TARGET_BODY.topZ + Math.max(4.8, TARGET_BODY.bodyHeight * 0.4) + SHOT.slot * 0.6,
            HEIGHT = RECORD.form >= 4 ? 0.7 : RECORD.form === 3 ? 0.45 : PROJECTILE.height;
        PROJECTILE.cornActionId = RECORD.id;
        PROJECTILE.cornSlot = SHOT.slot;
        PROJECTILE.cornForm = RECORD.form;
        PROJECTILE.path = {
            from: METEOR ? { x: TO.x + SKY_SPREAD, y: TO.y, z: SKY_Z } : { x: unit.x, y: unit.y, z: 0.45 },
            to: TO,
            height: FORMS[RECORD.form].height,
            duration: SHOT.duration,
        };
        PROJECTILE.x = PROJECTILE.path.from.x;
        PROJECTILE.y = PROJECTILE.path.from.y;
        PROJECTILE.z = PROJECTILE.path.from.z;
        PROJECTILE.height = HEIGHT;
        PROJECTILE.radius = RECORD.form >= 3 ? HEIGHT * 0.32 : PROJECTILE.radius;
        PROJECTILE.attackPayload = cornAttackContext(RECORD, SHOT.weight, null);
        delete PROJECTILE.attackPayload.source;
        PROJECTILE.abilityEffect = null;
        delete PROJECTILE.cornPayload;
    }
    return true;
}

export function cornActionFor(world, id) {
    return world.cornAttachments?.actions?.find((action) => action.id === id) || null;
}

export function cornCriticalRoll(world, record, target) {
    const KEY = attackTargetKey(target === world.boss ? 'boss' : target.id, target.generation);
    if (!Object.hasOwn(record.criticalRolls, KEY)) {
        record.criticalRolls[KEY] = world.random();
    }
    return record.criticalRolls[KEY];
}

export function cornAttackContext(record, weight, criticalRoll, multiplier = record.directMultiplier, world = null) {
    const SOURCE = record.source,
        CANDIDATE = world?._unitForId(record.owner),
        LIVE_SOURCE = CANDIDATE?.generation === record.ownerGeneration ? CANDIDATE : null;
    return {
        source: LIVE_SOURCE || { ...SOURCE },
        sourceKind: SOURCE.sourceKind,
        attackerStats: structuredClone(SOURCE.attackerStats),
        damageMultiplier: multiplier * weight,
        attackPowerMultiplier: SOURCE.attackPowerMultiplier,
        sourceDamageScale: SOURCE.sourceDamageScale,
        kind: 'lob',
        strikeIndex: null,
        buffed: SOURCE.buffed,
        sourceStatOverrides: { ...SOURCE.attackerStats },
        area: false,
        criticalRoll,
        hitTargets: null,
    };
}

export function cornKernelMultiplier(record, index) {
    const BASE =
        index < record.baseKernelCount
            ? record.attachmentMultiplier / record.baseKernelCount
            : record.attachmentMultiplier;
    return (
        BASE * (1 + Math.min(0.02 * record.ranks.heating * index, 0.2)) +
        (index === record.terminalIndex ? record.attachmentMultiplier * 0.08 * record.ranks.finish : 0)
    );
}

export function isCornAttackRecord(record, { pending = false } = {}) {
    if (
        !record ||
        !exactKeys(
            record,
            'version id owner ownerGeneration tier form launchTick firstAttachTick speed budgetInputs windupSeconds recoverySeconds shots baseKernelCount extraKernel terminalIndex ranks directMultiplier attachmentMultiplier source attack criticalRolls',
        ) ||
        record.version !== 1 ||
        !Number.isSafeInteger(record.id) ||
        record.id < 1 ||
        !Number.isInteger(record.form) ||
        record.form < 1 ||
        record.form > 6 ||
        !Number.isInteger(record.tier) ||
        record.tier < record.form ||
        record.tier > 6 ||
        !Number.isSafeInteger(record.owner) ||
        record.owner < 1 ||
        !Number.isSafeInteger(record.ownerGeneration) ||
        record.ownerGeneration < 1 ||
        !Number.isFinite(record.speed) ||
        record.speed < 0.05 ||
        record.speed > 1.63 / 0.35 ||
        record.windupSeconds !== 0.38 / record.speed ||
        record.recoverySeconds !== 1.25 / record.speed ||
        typeof record.extraKernel !== 'boolean' ||
        !record.ranks ||
        !exactKeys(record.ranks, 'heating finish extra') ||
        (record.extraKernel && record.ranks.extra === 0) ||
        !['heating', 'finish', 'extra'].every(
            (key) => Number.isInteger(record.ranks[key]) && record.ranks[key] >= 0 && record.ranks[key] <= 5,
        ) ||
        !Number.isFinite(record.directMultiplier) ||
        record.directMultiplier <= 0 ||
        !Number.isFinite(record.attachmentMultiplier) ||
        record.attachmentMultiplier <= 0 ||
        !record.source ||
        !exactKeys(
            record.source,
            'id generation ownerId faction isFormationClone species tier hp x y z giantUntil sourceKind attackerStats attackPowerMultiplier sourceDamageScale buffed',
        ) ||
        record.source.id !== record.owner ||
        record.source.generation !== record.ownerGeneration ||
        record.source.species !== 1 ||
        record.source.tier !== record.tier ||
        !['player', 'enemy'].includes(record.source.faction) ||
        typeof record.source.ownerId !== 'string' ||
        !['direct', 'enemy'].includes(record.source.sourceKind) ||
        !['hp', 'x', 'y', 'z', 'giantUntil'].every((key) => Number.isFinite(record.source[key])) ||
        typeof record.source.isFormationClone !== 'boolean' ||
        typeof record.source.buffed !== 'boolean' ||
        !validCornStats(record.source.attackerStats) ||
        !Number.isFinite(record.source.attackPowerMultiplier) ||
        ![1, 3].includes(record.source.attackPowerMultiplier) ||
        !Number.isFinite(record.source.sourceDamageScale) ||
        record.source.sourceDamageScale < 0 ||
        !record.criticalRolls ||
        typeof record.criticalRolls !== 'object' ||
        Array.isArray(record.criticalRolls)
    ) {
        return false;
    }
    const INPUTS = record.budgetInputs;
    if (
        !exactKeys(
            INPUTS,
            'tierOneAttack tierAttack gradeMultiplier permanentMultiplier directRank attachmentRank speedRank commandSpeed',
        ) ||
        !['tierOneAttack', 'tierAttack', 'gradeMultiplier', 'permanentMultiplier', 'commandSpeed'].every(
            (key) => Number.isFinite(INPUTS[key]) && INPUTS[key] >= 0,
        ) ||
        !(INPUTS.gradeMultiplier > 0) ||
        !(INPUTS.commandSpeed > 0) ||
        !['directRank', 'attachmentRank', 'speedRank'].every(
            (key) => Number.isInteger(INPUTS[key]) && INPUTS[key] >= 0 && INPUTS[key] <= 10,
        ) ||
        INPUTS.gradeMultiplier !== cornBudgetFromInputs(record.tier, INPUTS.tierOneAttack, INPUTS.tierAttack) ||
        record.directMultiplier !== 1.6 * INPUTS.gradeMultiplier * (1 + 0.03 * INPUTS.directRank) ||
        record.attachmentMultiplier !== 0.5 * INPUTS.gradeMultiplier * (1 + 0.03 * INPUTS.attachmentRank) ||
        record.source.attackerStats.attackPower !== INPUTS.tierAttack * INPUTS.permanentMultiplier ||
        record.speed !==
            Math.min(
                1.63 / 0.35,
                Math.max(
                    0.05,
                    record.source.attackerStats.attackSpeed * INPUTS.commandSpeed * (1 + 0.02 * INPUTS.speedRank),
                ),
            )
    ) {
        return false;
    }
    const FORM = FORMS[record.form];
    if (
        !Array.isArray(record.shots) ||
        record.shots.length !== FORM.weights.length ||
        record.baseKernelCount !== FORM.kernels.reduce((total, count) => total + count, 0) ||
        record.terminalIndex !== record.baseKernelCount - 1 + Number(record.extraKernel)
    ) {
        return false;
    }
    let kernelStart = 0;
    for (let slot = 0; slot < FORM.weights.length; slot++) {
        const SHOT = record.shots[slot];
        if (
            !exactKeys(SHOT, 'slot weight duration kernelStart kernelCount') ||
            SHOT.slot !== slot ||
            SHOT.weight !== FORM.weights[slot] ||
            SHOT.duration !== FORM.times[slot] / record.speed ||
            SHOT.kernelStart !== kernelStart ||
            SHOT.kernelCount !== FORM.kernels[slot]
        ) {
            return false;
        }
        kernelStart += SHOT.kernelCount;
    }
    for (const [KEY, ROLL] of Object.entries(record.criticalRolls)) {
        let target;
        try {
            target = JSON.parse(KEY);
        } catch {
            return false;
        }
        if (
            !Array.isArray(target) ||
            attackTargetKey(target[1], target[2]) !== KEY ||
            !Number.isFinite(ROLL) ||
            ROLL < 0 ||
            ROLL >= 1
        ) {
            return false;
        }
    }
    return (
        (record.firstAttachTick === null ||
            (Number.isSafeInteger(record.firstAttachTick) && record.firstAttachTick >= 0)) &&
        ((pending && record.launchTick === null && record.attack === null) ||
            (Number.isSafeInteger(record.launchTick) &&
                record.launchTick >= 0 &&
                isAttackActionDTO(record.attack) &&
                record.attack.startTick === record.launchTick &&
                record.attack.plan.durationTicks === Math.ceil(record.recoverySeconds * 20) + 1 &&
                record.attack.plan.strikes.length === record.shots.length &&
                record.attack.plan.strikes.every(
                    (strike, index) =>
                        strike.tick === Math.ceil(record.shots[index].duration * 20 - 1e-9) &&
                        strike.weight === record.shots[index].weight,
                )))
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

function validCornStats(stats) {
    return (
        exactKeys(stats, ['maxHp', 'attackPower', ...Object.keys(COMMON_UNIT_STAT_DEFAULTS)].join(' ')) &&
        Object.values(stats).every((value) => Number.isFinite(value) && value >= 0) &&
        stats.maxHp > 0
    );
}
