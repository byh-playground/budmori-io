import { awardBossKillXp, FARM_BOSS_EVENT_MAX_STAGE } from './player-progression.js';
import { BOSS_SPECIES_WEIGHTS } from './species-catalog.js';

const FORMAT_PERCENT = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
const FORMAT_COUNT = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
const PRD_UNITS_PER_TICK = 10;
const STREAM_DOMAINS = Object.freeze({
    normal: Object.freeze({ prd: 0x2f6e2b1d, boxes: 0x5c3a9217 }),
    event: Object.freeze({ prd: 0x739d41e5, boxes: 0x1b8c55a3 }),
    firstClear: Object.freeze({ prd: 0x4a61c7d3, boxes: 0x2db83f91 }),
});
const STREAM_SOURCE = Object.freeze({ farm: 'event' });

function requireSdk() {
    const SDK = globalThis.BloomGamekitDeterministic;
    if (!SDK?.SeededPRNG || !SDK?.PseudoRandomDistribution) {
        throw new Error('GameKit 0.12.2 deterministic PRD API is required');
    }
    return SDK;
}

function mixedSeed(seed, domain) {
    let value = (seed ^ domain) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
    value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
    return (value ^ (value >>> 16)) >>> 0;
}

function streamFor(source) {
    return STREAM_SOURCE[source];
}

function streamSeed(seed, kind, field) {
    const DOMAIN = STREAM_DOMAINS[kind]?.[field];
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff || DOMAIN === undefined) {
        throw new RangeError('Invalid boss reward stream seed');
    }
    return mixedSeed(seed, DOMAIN);
}

function createStream(seed, kind) {
    return {
        rngState: streamSeed(seed, kind, 'prd'),
        distributionState: null,
        payoutRngState: streamSeed(seed, kind, 'boxes'),
    };
}

export function createBossRewardStreams(seed) {
    return {
        normal: createStream(seed, 'normal'),
        event: createStream(seed, 'event'),
        firstClear: createStream(seed, 'firstClear'),
    };
}

export const BOSS_REWARD_SETTINGS = Object.freeze({
    acquisitionChance: 0.05,
    firstClearAcquisitionChance: 0.15,
    farmEventAcquisitionMultiplier: 2,
    stageHpBase: 200,
    stageHpMultiplier: 1.2,
    stageAttackBase: 4,
    stageAttackMultiplier: 1.1,
    stageXpBase: 20,
    stageXpMultiplier: 1.5,
    stageRollMultiplier: 1.5,
    maxStage: FARM_BOSS_EVENT_MAX_STAGE,
    maxRollCount: Math.floor(1.5 ** (FARM_BOSS_EVENT_MAX_STAGE - 1)),
    maxBoxCount: 100,
    prdUnitsPerTick: PRD_UNITS_PER_TICK,
    speciesWeights: BOSS_SPECIES_WEIGHTS,
});

export function bossRewardBoxPayouts(total) {
    if (!Number.isSafeInteger(total) || total < 1) {
        throw new RangeError('Boss reward quantity must be a positive safe integer');
    }
    const BOX_COUNT = Math.min(total, BOSS_REWARD_SETTINGS.maxBoxCount),
        BASE = Math.floor(total / BOX_COUNT),
        EXTRA = total % BOX_COUNT;
    const PAYOUTS = Array.from({ length: BOX_COUNT }, (_, index) => BASE + (index < EXTRA ? 1 : 0));
    if (PAYOUTS.some((amount) => !Number.isSafeInteger(amount) || amount < 1)) {
        throw new RangeError('Boss reward box payout is outside the safe integer range');
    }
    return PAYOUTS;
}

export function bossStageStats(stage) {
    if (!Number.isSafeInteger(stage) || stage < 1 || stage > BOSS_REWARD_SETTINGS.maxStage) {
        throw new RangeError(`Boss stage must be from 1 to ${BOSS_REWARD_SETTINGS.maxStage}`);
    }
    const EXPONENT = stage - 1,
        TOTAL = Math.floor(BOSS_REWARD_SETTINGS.stageRollMultiplier ** EXPONENT),
        PAYOUTS = bossRewardBoxPayouts(TOTAL);
    return {
        stage,
        hp: BOSS_REWARD_SETTINGS.stageHpBase * BOSS_REWARD_SETTINGS.stageHpMultiplier ** EXPONENT,
        attackPower: BOSS_REWARD_SETTINGS.stageAttackBase * BOSS_REWARD_SETTINGS.stageAttackMultiplier ** EXPONENT,
        xp: Math.round(BOSS_REWARD_SETTINGS.stageXpBase * BOSS_REWARD_SETTINGS.stageXpMultiplier ** EXPONENT),
        rollBudget: TOTAL,
        rolls: PAYOUTS.length,
        boxCount: PAYOUTS.length,
        boxPayouts: PAYOUTS,
        bonusRollChance: 0,
    };
}

export function bossRewardRollDescription(
    stage,
    { farmEvent = false, firstClear = false, acquisitionMultiplier = 1 } = {},
) {
    const STATS = bossStageStats(stage),
        NOMINAL_CHANCE = bossAcquisitionChance({ farmEvent, firstClear, acquisitionMultiplier: 1 }) * 100,
        CHANCE = bossAcquisitionChance({ farmEvent, firstClear, acquisitionMultiplier }) * 100,
        PAYOUTS = STATS.boxPayouts,
        MIN = Math.min(...PAYOUTS),
        MAX = Math.max(...PAYOUTS),
        RANGE = MIN === MAX ? FORMAT_COUNT.format(MIN) : `${FORMAT_COUNT.format(MIN)}–${FORMAT_COUNT.format(MAX)}`;
    return `${FORMAT_COUNT.format(STATS.boxCount)}회 추첨 · 상자당 ${RANGE}마리 · ${firstClear ? '첫 클리어' : '재도전'} 기본 확률 ${FORMAT_PERCENT.format(NOMINAL_CHANCE)}% · 편성 반영 ${FORMAT_PERCENT.format(CHANCE)}%`;
}

export function chooseBossSpecies(random, weights = BOSS_REWARD_SETTINGS.speciesWeights) {
    if (
        typeof random !== 'function' ||
        !Array.isArray(weights) ||
        weights.length !== BOSS_REWARD_SETTINGS.speciesWeights.length ||
        weights.some((weight) => !Number.isFinite(weight) || weight <= 0)
    ) {
        throw new TypeError('Boss species weights and random source are required');
    }
    const TOTAL = weights.reduce((sum, weight) => sum + weight, 0);
    let remaining = random() * TOTAL;
    if (!Number.isFinite(remaining) || remaining < 0 || remaining >= TOTAL) {
        throw new RangeError('Boss species roll must be in [0, 1)');
    }
    for (let index = 0; index < weights.length; index += 1) {
        remaining -= weights[index];
        if (remaining < 0) {
            return index;
        }
    }
    return weights.length - 1;
}

export function bossAcquisitionChance({ farmEvent = false, firstClear = false, acquisitionMultiplier = 1 } = {}) {
    if (!Number.isFinite(acquisitionMultiplier) || acquisitionMultiplier < 0 || acquisitionMultiplier > 2) {
        throw new RangeError('Boss acquisition multiplier must be in [0, 2]');
    }
    if (farmEvent) {
        return BOSS_REWARD_SETTINGS.acquisitionChance * BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier;
    }
    const BASE = firstClear ? BOSS_REWARD_SETTINGS.firstClearAcquisitionChance : BOSS_REWARD_SETTINGS.acquisitionChance;
    return Math.min(1, BASE * acquisitionMultiplier);
}

function ensureWorldRewardState(world) {
    world.bossRewardReceipts ||= [];
    world.bossRewardWatermarks ||= { farm: 0 };
    world.bossRewardStreams ||= createBossRewardStreams(world.seed >>> 0);
    world.bossRewardInventory ||= [];
    return world;
}

function shufflePayouts(payouts, seed) {
    const { SeededPRNG: SEEDED_PRNG } = requireSdk();
    const RNG = new SEEDED_PRNG(seed);
    for (let index = payouts.length - 1; index > 0; index -= 1) {
        const OTHER = RNG.nextInt(index + 1);
        [payouts[index], payouts[OTHER]] = [payouts[OTHER], payouts[index]];
    }
    return { payouts, rngState: RNG.state };
}

export function getBossRewardQueueCount(world, species, tier = 1) {
    return (world.bossRewardInventory || [])
        .filter((entry) => entry.species === species && entry.tier === tier)
        .reduce((sum, entry) => {
            const NEXT = sum + entry.count;
            if (!Number.isSafeInteger(NEXT)) {
                throw new RangeError('Owned boss reward quantity exceeds the safe integer range');
            }
            return NEXT;
        }, 0);
}

function allocatePlacedRewards(world, species, tier, quantity) {
    let remaining = quantity;
    for (const RECEIPT of world.bossRewardReceipts) {
        if (
            remaining === 0 ||
            RECEIPT.species !== species ||
            RECEIPT.tier !== tier ||
            !Number.isSafeInteger(RECEIPT.queuedCount) ||
            RECEIPT.queuedCount <= 0
        ) {
            continue;
        }
        const PLACED = Math.min(remaining, RECEIPT.queuedCount);
        RECEIPT.queuedCount -= PLACED;
        RECEIPT.placedCount += PLACED;
        RECEIPT.grantedCount = RECEIPT.placedCount;
        remaining -= PLACED;
    }
    if (remaining !== 0) {
        throw new Error('Boss reward queue and receipt counts diverged');
    }
}

export function grantPendingBossAcquisitions(world) {
    return typeof world.mutateUnits === 'function'
        ? world.mutateUnits(grantPendingBossAcquisitionsCommitted, world)
        : grantPendingBossAcquisitionsCommitted(world);
}

function grantPendingBossAcquisitionsCommitted(world) {
    ensureWorldRewardState(world);
    if (world.scene !== 'farm' || !Array.isArray(world.units) || !world.bossRewardInventory.length) {
        return [];
    }
    const GRANTED = [];
    let capacity = Math.max(
        0,
        world.capacity - (Number.isSafeInteger(world.ownedPopulation) ? world.ownedPopulation : world.units.length),
    );
    for (const GROUP of world.bossRewardInventory) {
        if (capacity <= 0) {
            break;
        }
        const COUNT = Math.min(capacity, GROUP.count),
            // A species the farm does not have yet comes as a pair, so it can breed right away.
            NEW_SPECIES = !world.units.some((unit) => unit.species === GROUP.species && !unit.isBattleOnlySummon);
        let placed = 0;
        while (placed < COUNT) {
            const INDEX = world.units.length,
                ANGLE = INDEX * 2.399963229728653 + ((world.seed >>> 0) % 6283) / 1000,
                RADIUS = Math.sqrt(INDEX + 0.5) * 0.35,
                UNIT = world.spawn(GROUP.species, GROUP.tier, Math.cos(ANGLE) * RADIUS, Math.sin(ANGLE) * RADIUS);
            if (!UNIT) {
                break;
            }
            GRANTED.push(UNIT);
            placed += 1;
        }
        if (placed > 0) {
            if (NEW_SPECIES && placed === 1 && capacity - placed > 0) {
                const PARTNER = world.spawn(GROUP.species, GROUP.tier, Math.cos(placed) * 0.6, Math.sin(placed) * 0.6);
                if (PARTNER) {
                    GRANTED.push(PARTNER);
                    capacity -= 1;
                }
            }
            GROUP.count -= placed;
            capacity -= placed;
            allocatePlacedRewards(world, GROUP.species, GROUP.tier, placed);
        }
    }
    world.bossRewardInventory = world.bossRewardInventory.filter((entry) => entry.count > 0);
    if (GRANTED.length) {
        world.markProgressChanged?.();
    }
    return GRANTED;
}

function findExistingReceipt(world, receiptKey, encounterId, source) {
    return world.bossRewardReceipts.find(
        (receipt) =>
            (receiptKey && receipt.receiptKey === receiptKey) ||
            (receipt.encounterId === encounterId && receipt.source === source),
    );
}

function shuffleForNewReceipt(world, source, total, firstClear = false) {
    const KIND = streamFor(source, firstClear),
        STREAM = world.bossRewardStreams[KIND],
        PAYOUTS = bossRewardBoxPayouts(total),
        SHUFFLED = shufflePayouts(PAYOUTS, STREAM.payoutRngState);
    return {
        payouts: SHUFFLED.payouts,
        payoutRngStateAfter: SHUFFLED.rngState,
    };
}

export function resolveBossAcquisition(world, options = {}) {
    return typeof world.mutateUnits === 'function'
        ? world.mutateUnits(resolveBossAcquisitionCommitted, world, options)
        : resolveBossAcquisitionCommitted(world, options);
}

function resolveBossAcquisitionCommitted(world, options = {}) {
    ensureWorldRewardState(world);
    const ENCOUNTER_ID = options.encounterId,
        SOURCE = options.source || 'farm',
        REQUESTED_KEY = options.receiptKey;
    if (
        SOURCE !== 'farm' ||
        !Number.isSafeInteger(ENCOUNTER_ID) ||
        ENCOUNTER_ID < 1 ||
        (REQUESTED_KEY !== undefined &&
            (typeof REQUESTED_KEY !== 'string' || !REQUESTED_KEY.trim() || REQUESTED_KEY.length > 255))
    ) {
        throw new TypeError('A boss encounter ID, source, and valid receipt key are required');
    }
    const RECEIPT_KEY = REQUESTED_KEY || `${SOURCE}:${ENCOUNTER_ID}`,
        PREVIOUS = findExistingReceipt(world, REQUESTED_KEY, ENCOUNTER_ID, SOURCE);
    if (PREVIOUS) {
        return PREVIOUS;
    }
    if (ENCOUNTER_ID <= (world.bossRewardWatermarks[SOURCE] || 0)) {
        throw new RangeError('A settled or stale boss encounter cannot be rolled again');
    }
    const TOTAL = options.rollBudget ?? options.rollCount ?? 1;
    if (!Number.isSafeInteger(TOTAL) || TOTAL < 1 || TOTAL > BOSS_REWARD_SETTINGS.maxRollCount) {
        throw new RangeError('Boss reward quantity is outside the safe integer range');
    }
    const SPECIES = options.species ?? 3;
    if (!Number.isSafeInteger(SPECIES) || SPECIES < 0 || SPECIES >= BOSS_REWARD_SETTINGS.speciesWeights.length) {
        throw new RangeError('Boss reward species is invalid');
    }
    const FIRST_CLEAR = false,
        STREAM_KIND = streamFor(SOURCE),
        STREAM = world.bossRewardStreams[STREAM_KIND],
        CHANCE = bossAcquisitionChance({
            farmEvent: SOURCE === 'farm',
            firstClear: FIRST_CLEAR,
            acquisitionMultiplier: options.acquisitionMultiplier ?? 1,
        }),
        SHUFFLED = shuffleForNewReceipt(world, SOURCE, TOTAL, FIRST_CLEAR),
        BOX_COUNT = SHUFFLED.payouts.length,
        RECEIPT = {
            encounterId: ENCOUNTER_ID,
            source: SOURCE,
            receiptKey: RECEIPT_KEY,
            acquisitionMultiplier:
                SOURCE === 'farm'
                    ? BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier
                    : (options.acquisitionMultiplier ?? 1),
            stage: Number.isSafeInteger(options.stage) ? options.stage : 0,
            species: SPECIES,
            tier: 1,
            x: Number.isFinite(options.x) ? options.x : 0,
            y: Number.isFinite(options.y) ? options.y : 0,
            firstClear: FIRST_CLEAR,
            chance: CHANCE,
            baselineChance: FIRST_CLEAR
                ? BOSS_REWARD_SETTINGS.firstClearAcquisitionChance
                : BOSS_REWARD_SETTINGS.acquisitionChance,
            rollBudget: TOTAL,
            rollCount: BOX_COUNT,
            boxCount: BOX_COUNT,
            successCount: 0,
            acquiredCount: 0,
            grantedCount: 0,
            placedCount: 0,
            queuedCount: 0,
            unitId: 0,
            revealedCount: 0,
            boxes: [],
            calculation: {
                version: 1,
                payouts: SHUFFLED.payouts,
                hits: [],
                payoutRngStateAfter: SHUFFLED.payoutRngStateAfter,
                jobState: null,
            },
            status: 'calculating',
        };
    if (streamFor(SOURCE, FIRST_CLEAR) !== STREAM_KIND || !Number.isSafeInteger(STREAM.rngState)) {
        throw new TypeError('Boss reward streams are not initialized');
    }
    world.bossRewardReceipts.push(RECEIPT);
    world.bossRewardWatermarks[SOURCE] = ENCOUNTER_ID;
    trimRewardReceipts(world);
    if (SOURCE === 'farm' && world.farmBossEvent?.encounterId === ENCOUNTER_ID) {
        world.farmBossEvent.rewardStatus = 'calculating';
        world.farmBossEvent.rewardChance = CHANCE;
        world.farmBossEvent.rewardRoll = 0;
        world.farmBossEvent.rewardUnitId = 0;
    }
    world.markProgressChanged?.();
    return RECEIPT;
}

function copyInventory(world) {
    return (world.bossRewardInventory || []).map((entry) => ({ ...entry }));
}

function completeRewardCalculation(world, receipt, jobState) {
    const CALC = receipt.calculation,
        HIT_SET = new Set(CALC.hits),
        BOXES = CALC.payouts.map((payout, index) => ({ payout, hit: HIT_SET.has(index) }));
    let acquired = 0;
    for (const BOX of BOXES) {
        if (BOX.hit) {
            acquired += BOX.payout;
            if (!Number.isSafeInteger(acquired)) {
                throw new RangeError('Owned boss reward quantity exceeds the safe integer range');
            }
        }
    }
    const KIND = streamFor(receipt.source, receipt.firstClear === true),
        NEXT_INVENTORY = copyInventory(world),
        GROUP = NEXT_INVENTORY.find((entry) => entry.species === receipt.species && entry.tier === receipt.tier);
    if (acquired > 0) {
        const CURRENT = GROUP?.count || 0,
            NEXT = CURRENT + acquired;
        if (!Number.isSafeInteger(NEXT)) {
            throw new RangeError('Owned boss reward quantity exceeds the safe integer range');
        }
        if (GROUP) {
            GROUP.count = NEXT;
        } else {
            NEXT_INVENTORY.push({ species: receipt.species, tier: receipt.tier, count: acquired });
        }
    }
    const NEXT_STREAM = {
        rngState: jobState.rngState,
        distributionState: jobState.distributionState,
        payoutRngState: CALC.payoutRngStateAfter,
    };

    // These four assignments are one synchronous settlement commit. Until here,
    // all PRD and shuffle work exists only on the receipt's resumable working copy.
    world.bossRewardStreams[KIND] = NEXT_STREAM;
    world.bossRewardInventory = NEXT_INVENTORY;
    receipt.boxes = BOXES;
    receipt.successCount = CALC.hits.length;
    receipt.acquiredCount = acquired;
    receipt.placedCount = 0;
    receipt.queuedCount = acquired;
    receipt.grantedCount = 0;
    receipt.revealedCount = 0;
    receipt.calculation = null;
    receipt.status = 'ready';
    if (receipt.source === 'farm' && world.farmBossEvent?.encounterId === receipt.encounterId) {
        world.farmBossEvent.rewardStatus = 'ready';
    }
}

function trimRewardReceipts(world) {
    const KEEP = new Set();
    let completed = 0;
    for (let index = world.bossRewardReceipts.length - 1; index >= 0; index -= 1) {
        const RECEIPT = world.bossRewardReceipts[index],
            NEEDS_PRESENTATION =
                RECEIPT.status === 'calculating' ||
                (Number.isSafeInteger(RECEIPT.queuedCount) && RECEIPT.queuedCount > 0);
        if (NEEDS_PRESENTATION || (RECEIPT.status === 'ready' && completed < 8)) {
            KEEP.add(RECEIPT);
            if (RECEIPT.status === 'ready') {
                completed += 1;
            }
        }
    }
    world.bossRewardReceipts = world.bossRewardReceipts.filter((receipt) => KEEP.has(receipt));
}

export function advanceBossRewardCalculations(world, { maxUnitsPerReward = PRD_UNITS_PER_TICK } = {}) {
    if (!Number.isSafeInteger(maxUnitsPerReward) || maxUnitsPerReward < 1 || maxUnitsPerReward > PRD_UNITS_PER_TICK) {
        throw new RangeError('Boss reward work must be from 1 to 10 units per logical tick');
    }
    ensureWorldRewardState(world);
    if (world.scene !== 'farm') {
        return false;
    }
    let changed = false;
    for (const SOURCE of ['farm']) {
        const RECEIPT = world.bossRewardReceipts.find(
                (entry) => entry.source === SOURCE && entry.status === 'calculating',
            ),
            CALC = RECEIPT?.calculation;
        if (!RECEIPT || !CALC) {
            continue;
        }
        const STREAM_KIND = streamFor(SOURCE, RECEIPT.firstClear === true),
            STREAM = world.bossRewardStreams[STREAM_KIND],
            { SeededPRNG: SEEDED_PRNG, PseudoRandomDistribution: PSEUDO_RANDOM_DISTRIBUTION } = requireSdk(),
            RNG = new SEEDED_PRNG(STREAM.rngState),
            PRD = new PSEUDO_RANDOM_DISTRIBUTION({ probability: RECEIPT.chance, rng: RNG });
        let job = null;
        try {
            if (CALC.jobState) {
                job = PRD.restoreRollJob(CALC.jobState);
            } else {
                if (STREAM.distributionState) {
                    PRD.restore(STREAM.distributionState);
                }
                if (PRD.probability !== RECEIPT.chance) {
                    PRD.setProbability(RECEIPT.chance);
                }
                job = PRD.createRollJob(RECEIPT.boxCount);
            }
            if (RECEIPT.chance === 1 && CALC.hits.length === 0) {
                CALC.hits = Array.from({ length: RECEIPT.boxCount }, (_, index) => index);
            }
            let units = 0;
            while (!job.done && units < maxUnitsPerReward) {
                const PRIOR_SUCCESSES = job.successes,
                    STEP = job.step(1);
                units += STEP.unitsUsed;
                if (RECEIPT.chance !== 1 && STEP.successes > PRIOR_SUCCESSES) {
                    if (STEP.successes !== PRIOR_SUCCESSES + 1) {
                        throw new Error('A single PRD interval returned multiple reward successes');
                    }
                    CALC.hits.push(STEP.processedTrials - 1);
                }
                if (STEP.unitsUsed === 0 && !STEP.done) {
                    throw new Error('The resumable boss reward job did not advance');
                }
            }
            CALC.jobState = job.capture();
            changed = true;
            if (job.done) {
                completeRewardCalculation(world, RECEIPT, CALC.jobState);
                trimRewardReceipts(world);
            }
        } finally {
            job?.dispose();
            PRD.dispose();
        }
    }
    if (changed) {
        world.markProgressChanged?.();
    }
    return changed;
}

export function advanceBossRewardReveal(world, receiptKey, maxBoxes = 10) {
    if (!Number.isSafeInteger(maxBoxes) || maxBoxes < 1 || maxBoxes > 10) {
        throw new RangeError('Boss reward reveal must be from 1 to 10 boxes');
    }
    ensureWorldRewardState(world);
    const RECEIPT = world.bossRewardReceipts.find((entry) => entry.receiptKey === receiptKey);
    if (!RECEIPT || RECEIPT.status !== 'ready') {
        return null;
    }
    if (RECEIPT.revealedCount >= RECEIPT.boxCount) {
        return RECEIPT;
    }
    RECEIPT.revealedCount = Math.min(RECEIPT.boxCount, RECEIPT.revealedCount + maxBoxes);
    return RECEIPT;
}

export function openAllBossRewardBoxes(world, receiptKey) {
    ensureWorldRewardState(world);
    const RECEIPT = world.bossRewardReceipts.find((entry) => entry.receiptKey === receiptKey);
    if (!RECEIPT || RECEIPT.status !== 'ready') {
        return null;
    }
    RECEIPT.revealedCount = RECEIPT.boxCount;
    return RECEIPT;
}

export function settleBossKill(world, options) {
    return typeof world.mutateUnits === 'function'
        ? world.mutateUnits(settleBossKillCommitted, world, options)
        : settleBossKillCommitted(world, options);
}

function settleBossKillCommitted(world, options = {}) {
    const RECEIPT = resolveBossAcquisitionCommitted(world, options),
        PROGRESSION_OWNER = options.progressionOwner || world,
        WALLET = options.playerProgression || PROGRESSION_OWNER.playerProgression,
        RECEIPT_KEY = RECEIPT.xpReceiptKey || options.receiptKey || RECEIPT.receiptKey;
    if (RECEIPT.xpReceiptKey && ['awarded', 'already-awarded'].includes(RECEIPT.xpStatus)) {
        return {
            receipt: RECEIPT,
            progression: WALLET,
            awarded: false,
            reason: 'duplicate-receipt',
            xpAwarded: RECEIPT.xpAmount ?? 0,
            levelsGained: RECEIPT.levelsGained ?? 0,
            pointsAwarded: RECEIPT.pointsAwarded ?? 0,
        };
    }
    const RESULT = awardBossKillXp(WALLET, RECEIPT_KEY, options.xpAmount === undefined ? undefined : options.xpAmount);
    if (RESULT.awarded) {
        PROGRESSION_OWNER.playerProgression = RESULT.state;
    }
    if (RESULT.awarded || RESULT.reason === 'duplicate-receipt') {
        RECEIPT.xpReceiptKey = RECEIPT_KEY;
        RECEIPT.xpStatus = RESULT.awarded ? 'awarded' : 'already-awarded';
        RECEIPT.xpAmount = RESULT.awarded ? RESULT.xpAwarded : 0;
        RECEIPT.levelsGained = RESULT.levelsGained;
        RECEIPT.pointsAwarded = RESULT.pointsAwarded;
    } else {
        RECEIPT.xpStatus = 'unsettled';
    }
    world.markProgressChanged?.();
    return {
        receipt: RECEIPT,
        progression: RESULT.state,
        awarded: RESULT.awarded,
        reason: RESULT.reason,
        xpAwarded: RESULT.xpAwarded,
        levelsGained: RESULT.levelsGained,
        pointsAwarded: RESULT.pointsAwarded,
    };
}
