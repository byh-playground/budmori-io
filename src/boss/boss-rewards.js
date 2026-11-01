import { FARM_BOSS_EVENT_MAX_STAGE } from '../model/player-progression.js';
import { SPECIES_COUNT } from '../units/species-catalog.js';

// One categorical draw per victory. Numerators are thirds of the floor reward;
// paired weights preserve its mean even when the resulting quantities round.
export const BOSS_REWARD_BANDS = Object.freeze(
    [
        ['꽝', 5, 0],
        ['매우 적음', 10, 1],
        ['적음', 20, 2],
        ['보통', 30, 3],
        ['많음', 20, 4],
        ['매우 많음', 10, 5],
        ['대박', 5, 6],
    ].map(([label, weight, numerator]) => Object.freeze({ label, weight, numerator })),
);
const TOTAL_WEIGHT = BOSS_REWARD_BANDS.reduce((sum, band) => sum + band.weight, 0);
const REWARD_DENOMINATOR = 3;
export const BOSS_REWARD_SETTINGS = Object.freeze({
    // Combat progression is unchanged by the reward rework.
    stageHpBase: 200,
    stageAttackBase: 4,
    stageXpBase: 20,
    stageStep: 0.5,
    stageGrowth: 1.03,
    stageGrowthCap: 2,
    rewardFloorStep: 10,
    maxKindReward: 3,
    recordMultiplier: 2,
    maxStage: FARM_BOSS_EVENT_MAX_STAGE,
    speciesCount: SPECIES_COUNT,
});

function requireSdk() {
    const SDK = globalThis.BloomGamekitDeterministic;
    if (!SDK?.SeededPRNG) {
        throw new Error('GameKit deterministic SeededPRNG API is required');
    }
    return SDK;
}

export function createBossRewardRngState(seed) {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
        throw new RangeError('Invalid boss reward stream seed');
    }
    let value = (seed ^ 0x739d41e5) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
    value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
    return (value ^ (value >>> 16)) >>> 0;
}

function validateStage(stage) {
    if (!Number.isSafeInteger(stage) || stage < 1 || stage > BOSS_REWARD_SETTINGS.maxStage) {
        throw new RangeError(`Boss stage must be from 1 to ${BOSS_REWARD_SETTINGS.maxStage}`);
    }
}

export function bossStageStats(stage) {
    validateStage(stage);
    const FLOORS = stage - 1,
        LINEAR = 1 + BOSS_REWARD_SETTINGS.stageStep * FLOORS,
        GROWTH = Math.min(BOSS_REWARD_SETTINGS.stageGrowthCap, BOSS_REWARD_SETTINGS.stageGrowth ** FLOORS);
    return {
        stage,
        hp: Math.round(BOSS_REWARD_SETTINGS.stageHpBase * LINEAR * GROWTH),
        attackPower: BOSS_REWARD_SETTINGS.stageAttackBase * LINEAR * GROWTH,
        xp: Math.round(BOSS_REWARD_SETTINGS.stageXpBase * LINEAR),
    };
}

export function bossRewardBaseAmount(stage, kindReward = 1, record = false) {
    validateStage(stage);
    if (
        !Number.isSafeInteger(kindReward) ||
        kindReward < 1 ||
        kindReward > BOSS_REWARD_SETTINGS.maxKindReward ||
        typeof record !== 'boolean'
    ) {
        throw new RangeError('Invalid boss floor reward multiplier');
    }
    return (
        Math.ceil(stage / BOSS_REWARD_SETTINGS.rewardFloorStep) *
        kindReward *
        (record ? BOSS_REWARD_SETTINGS.recordMultiplier : 1)
    );
}

export function bossRewardBand(roll) {
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
        throw new RangeError('Boss reward roll must be in [0, 1)');
    }
    let cumulative = 0;
    for (let index = 0; index < BOSS_REWARD_BANDS.length; index += 1) {
        cumulative += BOSS_REWARD_BANDS[index].weight;
        if (roll < cumulative / TOTAL_WEIGHT) {
            return index;
        }
    }
    throw new Error('Boss reward distribution does not cover its roll');
}

export function bossRewardAmount(baseAmount, bandIndex) {
    if (
        !Number.isSafeInteger(baseAmount) ||
        baseAmount < 1 ||
        baseAmount >
            Math.ceil(BOSS_REWARD_SETTINGS.maxStage / BOSS_REWARD_SETTINGS.rewardFloorStep) *
                BOSS_REWARD_SETTINGS.maxKindReward *
                BOSS_REWARD_SETTINGS.recordMultiplier ||
        !Number.isSafeInteger(bandIndex) ||
        bandIndex < 0 ||
        bandIndex >= BOSS_REWARD_BANDS.length
    ) {
        throw new RangeError('Invalid boss reward base amount or band');
    }
    return Math.round((baseAmount * BOSS_REWARD_BANDS[bandIndex].numerator) / REWARD_DENOMINATOR);
}

export function bossRewardQueueBySpecies(world) {
    const COUNTS = new Map();
    for (const ENTRY of world.bossRewardInventory) {
        COUNTS.set(ENTRY.species, (COUNTS.get(ENTRY.species) || 0) + ENTRY.count);
    }
    return [...COUNTS].filter(([, count]) => count > 0);
}

function allocatePlacedRewards(world, species, tier, quantity) {
    let remaining = quantity;
    for (const RECEIPT of world.bossRewardReceipts) {
        if (remaining === 0 || RECEIPT.species !== species || RECEIPT.tier !== tier || RECEIPT.queuedCount <= 0) {
            continue;
        }
        const PLACED = Math.min(remaining, RECEIPT.queuedCount);
        RECEIPT.queuedCount -= PLACED;
        RECEIPT.placedCount += PLACED;
        remaining -= PLACED;
    }
    if (remaining !== 0) {
        throw new Error('Boss reward queue and receipt counts diverged');
    }
}

export function grantPendingBossAcquisitions(world) {
    return world.mutateUnits(grantPendingBossAcquisitionsCommitted, world);
}

function grantPendingBossAcquisitionsCommitted(world) {
    if (world.scene !== 'farm' || !world.bossRewardInventory.length) {
        return [];
    }
    const GRANTED = [];
    let capacity = Math.max(0, world.freeRoom());
    for (const GROUP of world.bossRewardInventory) {
        if (capacity <= 0) {
            break;
        }
        const COUNT = Math.min(capacity, GROUP.count);
        let placed = 0;
        while (placed < COUNT) {
            const INDEX = world.units.length,
                ANGLE = INDEX * 2.399963229728653 + ((world.seed >>> 0) % 6283) / 1000,
                RADIUS = Math.sqrt(INDEX + 0.5) * 0.35,
                UNIT = world.spawn(GROUP.species, GROUP.tier, Math.cos(ANGLE) * RADIUS, Math.sin(ANGLE) * RADIUS, {
                    lineage: world.rollSeedLineage(),
                });
            if (!UNIT) {
                break;
            }
            GRANTED.push(UNIT);
            placed += 1;
        }
        if (placed > 0) {
            GROUP.count -= placed;
            capacity -= placed;
            allocatePlacedRewards(world, GROUP.species, GROUP.tier, placed);
        }
    }
    world.bossRewardInventory = world.bossRewardInventory.filter((entry) => entry.count > 0);
    if (GRANTED.length) {
        world.markProgressChanged();
    }
    return GRANTED;
}

function trimRewardReceipts(world) {
    const RECENT = new Set(world.bossRewardReceipts.slice(-8));
    world.bossRewardReceipts = world.bossRewardReceipts.filter(
        (receipt) => receipt.queuedCount > 0 || !receipt.revealed || RECENT.has(receipt),
    );
}

export function revealBossReward(world, receiptKey) {
    const RECEIPT = world.bossRewardReceipts.find((entry) => entry.receiptKey === receiptKey);
    if (RECEIPT && !RECEIPT.revealed) {
        RECEIPT.revealed = true;
        trimRewardReceipts(world);
        world.markProgressChanged();
    }
    return RECEIPT || null;
}

export function settleBossKill(world, options) {
    return world.mutateUnits(settleBossKillCommitted, world, options);
}

function settleBossKillCommitted(world, options = {}) {
    const ENCOUNTER_ID = options.encounterId,
        SOURCE = options.source || 'farm',
        REQUESTED_KEY = options.receiptKey;
    if (
        SOURCE !== 'farm' ||
        !Number.isSafeInteger(ENCOUNTER_ID) ||
        ENCOUNTER_ID < 1 ||
        ENCOUNTER_ID > 1e12 ||
        (REQUESTED_KEY !== undefined &&
            (typeof REQUESTED_KEY !== 'string' || !REQUESTED_KEY.trim() || REQUESTED_KEY.length >= 256))
    ) {
        throw new TypeError('A boss encounter ID, source, and valid receipt key are required');
    }
    const PREVIOUS = world.bossRewardReceipts.find(
        (receipt) =>
            (REQUESTED_KEY && receipt.receiptKey === REQUESTED_KEY) ||
            (receipt.encounterId === ENCOUNTER_ID && receipt.source === SOURCE),
    );
    if (PREVIOUS) {
        return { receipt: PREVIOUS };
    }
    if (ENCOUNTER_ID <= world.bossRewardWatermarks[SOURCE]) {
        throw new RangeError('A settled or stale boss encounter cannot be rolled again');
    }
    const STAGE = options.stage ?? 1,
        KIND_REWARD = options.kindReward ?? 1,
        RECORD = options.record ?? false,
        BASE_AMOUNT = bossRewardBaseAmount(STAGE, KIND_REWARD, RECORD),
        SPECIES = options.species;
    if (!Number.isSafeInteger(SPECIES) || SPECIES < 0 || SPECIES >= BOSS_REWARD_SETTINGS.speciesCount) {
        throw new RangeError('Boss reward species is invalid');
    }
    const { SeededPRNG: SEEDED_PRNG } = requireSdk(),
        RNG = new SEEDED_PRNG(world.bossRewardRngState),
        BAND_INDEX = bossRewardBand(RNG.nextUint32() / 0x100000000),
        ACQUIRED = bossRewardAmount(BASE_AMOUNT, BAND_INDEX),
        INVENTORY = world.bossRewardInventory.map((entry) => ({ ...entry })),
        GROUP = INVENTORY.find((entry) => entry.species === SPECIES && entry.tier === 1);
    if (ACQUIRED > 0) {
        const COUNT = (GROUP?.count || 0) + ACQUIRED;
        if (!Number.isSafeInteger(COUNT)) {
            throw new RangeError('Owned boss reward quantity exceeds the safe integer range');
        }
        if (GROUP) {
            GROUP.count = COUNT;
        } else {
            INVENTORY.push({ species: SPECIES, tier: 1, count: ACQUIRED });
        }
    }
    const RECEIPT = {
        encounterId: ENCOUNTER_ID,
        source: SOURCE,
        receiptKey: REQUESTED_KEY || `${SOURCE}:${ENCOUNTER_ID}`,
        stage: STAGE,
        species: SPECIES,
        tier: 1,
        baseAmount: BASE_AMOUNT,
        bandIndex: BAND_INDEX,
        kindReward: KIND_REWARD,
        record: RECORD,
        acquiredCount: ACQUIRED,
        placedCount: 0,
        queuedCount: ACQUIRED,
        revealed: false,
        status: 'ready',
    };
    // Commit the random state, ledger and entitlements together. Opening the
    // chest never draws again, so skipping/reloading cannot change its reward.
    world.bossRewardRngState = RNG.state;
    world.bossRewardInventory = INVENTORY;
    world.bossRewardReceipts.push(RECEIPT);
    world.bossRewardWatermarks[SOURCE] = ENCOUNTER_ID;
    trimRewardReceipts(world);
    if (world.farmBossEvent.encounterId === ENCOUNTER_ID) {
        world.farmBossEvent.rewardStatus = 'ready';
    }
    world.markProgressChanged();
    return { receipt: RECEIPT };
}
