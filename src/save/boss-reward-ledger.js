import { BOSS_REWARD_SETTINGS, bossRewardBaseAmount, bossRewardAmount } from '../boss/boss-rewards.js';
import { SPECIES_COUNT } from '../units/species-catalog.js';
import { MAX_UNIT_TIER } from '../units/unit-grades.js';

const ASSERT = (value) => {
    if (!value) {
        throw new TypeError('올바른 보상 저장 데이터가 아니에요.');
    }
};
const INTEGER = (value, min = 0, max = 1e12) => Number.isSafeInteger(value) && value >= min && value <= max;
const SAFE_INTEGER = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => INTEGER(value, min, max);
const NUMBER = (value, min = 0, max = 1e12) => Number.isFinite(value) && value >= min && value <= max;
const STRING = (value) => typeof value === 'string' && value.trim().length > 0 && value.length < 256;
const CONFIG = { unit: { speciesCount: SPECIES_COUNT, maxTier: MAX_UNIT_TIER } };
function keys(value, required, optional = []) {
    ASSERT(value && typeof value === 'object' && !Array.isArray(value));
    ASSERT(required.every((key) => Object.hasOwn(value, key)));
    ASSERT(Object.keys(value).every((key) => required.includes(key) || optional.includes(key)));
}
// Disk schema 1 / pre-single-chest checkpoints only. These historical values
// validate earned entitlements; they never participate in a new reward roll.
const LEGACY_REWARD_SETTINGS = Object.freeze({
    firstClearAcquisitionChance: 1,
    acquisitionChance: 0.05,
    maxRollCount: 600,
    maxBoxCount: 100,
});
const REWARD_EXTRAS = [
    'x',
    'y',
    'acquisitionMultiplier',
    'baselineChance',
    'stage',
    'firstClear',
    'rollBudget',
    'bonusRollChance',
    'rollCount',
    'boxCount',
    'successCount',
    'acquiredCount',
    'grantedCount',
    'placedCount',
    'queuedCount',
    'status',
    'calculation',
    'unitId',
    'boxes',
    'revealedCount',
];
function validateLegacyBossRewardLedger(boss) {
    keys(boss, ['nextEncounterId', 'settledThrough', 'pendingRewards', 'rewardStreams', 'queuedRewards']);
    keys(boss.settledThrough, ['farm']);
    ASSERT(INTEGER(boss.settledThrough.farm) && INTEGER(boss.nextEncounterId, boss.settledThrough.farm + 1));
    const STREAMS = boss.rewardStreams;
    keys(STREAMS, ['normal', 'event', 'firstClear']);
    for (const STREAM of Object.values(STREAMS)) {
        keys(STREAM, ['rngState', 'distributionState', 'payoutRngState']);
        ASSERT(
            INTEGER(STREAM.rngState, 0, 0xffffffff) &&
                INTEGER(STREAM.payoutRngState, 0, 0xffffffff) &&
                (STREAM.distributionState === null ||
                    (() => {
                        keys(STREAM.distributionState, [
                            'version',
                            'probability',
                            'consecutiveFailures',
                            'pendingTrials',
                        ]);
                        return (
                            STREAM.distributionState.version === 1 &&
                            NUMBER(STREAM.distributionState.probability, 0, 1) &&
                            SAFE_INTEGER(STREAM.distributionState.consecutiveFailures) &&
                            SAFE_INTEGER(STREAM.distributionState.pendingTrials)
                        );
                    })()),
        );
    }
    ASSERT(
        Array.isArray(boss.queuedRewards) &&
            boss.queuedRewards.length <= CONFIG.unit.speciesCount &&
            Array.isArray(boss.pendingRewards) &&
            boss.pendingRewards.length <= 100000,
    );
    const INVENTORY = new Map();
    for (const GROUP of boss.queuedRewards) {
        keys(GROUP, ['species', 'tier', 'count']);
        const GROUP_KEY = `${GROUP.species}:${GROUP.tier}`;
        ASSERT(
            INTEGER(GROUP.species, 0, CONFIG.unit.speciesCount - 1) &&
                GROUP.tier === 1 &&
                SAFE_INTEGER(GROUP.count, 1) &&
                !INVENTORY.has(GROUP_KEY),
        );
        INVENTORY.set(GROUP_KEY, GROUP.count);
    }
    const RECEIPTS = new Set(),
        ENCOUNTERS = new Set(),
        QUEUED_BY_GROUP = new Map(),
        DISTRIBUTION_KEYS = ['version', 'probability', 'consecutiveFailures', 'pendingTrials'],
        VALID_DISTRIBUTION = (state) => {
            keys(state, DISTRIBUTION_KEYS);
            return (
                state.version === 1 &&
                NUMBER(state.probability, 0, 1) &&
                SAFE_INTEGER(state.consecutiveFailures) &&
                SAFE_INTEGER(state.pendingTrials)
            );
        },
        VALID_JOB = (state, boxCount) => {
            keys(state, [
                'version',
                'totalTrials',
                'processedTrials',
                'remainingTrials',
                'successes',
                'distributionState',
                'rngState',
            ]);
            return (
                state.version === 1 &&
                state.totalTrials === boxCount &&
                INTEGER(state.processedTrials, 0, boxCount) &&
                INTEGER(state.remainingTrials, 0, boxCount) &&
                state.processedTrials + state.remainingTrials === boxCount &&
                INTEGER(state.successes, 0, state.processedTrials) &&
                INTEGER(state.rngState, 0, 0xffffffff) &&
                VALID_DISTRIBUTION(state.distributionState)
            );
        };
    for (const REWARD of boss.pendingRewards) {
        const BASE_KEYS = ['encounterId', 'source', 'receiptKey', 'species', 'tier', 'chance', 'firstClear'];
        keys(REWARD, BASE_KEYS, [...REWARD_EXTRAS, 'rolls']);
        ASSERT(
            REWARD.source === 'farm' &&
                INTEGER(REWARD.encounterId, 1, boss.settledThrough[REWARD.source]) &&
                STRING(REWARD.receiptKey) &&
                !RECEIPTS.has(REWARD.receiptKey) &&
                INTEGER(REWARD.species, 0, CONFIG.unit.speciesCount - 1) &&
                INTEGER(REWARD.tier, 1, CONFIG.unit.maxTier) &&
                NUMBER(REWARD.chance, 0, 1) &&
                typeof REWARD.firstClear === 'boolean',
        );
        RECEIPTS.add(REWARD.receiptKey);
        const ENCOUNTER = `${REWARD.source}:${REWARD.encounterId}`;
        ASSERT(!ENCOUNTERS.has(ENCOUNTER));
        ENCOUNTERS.add(ENCOUNTER);
        if (['calculating', 'ready'].includes(REWARD.status)) {
            ASSERT(
                REWARD.tier === 1 &&
                    SAFE_INTEGER(REWARD.acquiredCount) &&
                    SAFE_INTEGER(REWARD.placedCount) &&
                    SAFE_INTEGER(REWARD.queuedCount) &&
                    REWARD.placedCount + REWARD.queuedCount === REWARD.acquiredCount &&
                    REWARD.grantedCount === REWARD.placedCount,
            );
            if (REWARD.queuedCount > 0) {
                const GROUP_KEY = `${REWARD.species}:${REWARD.tier}`,
                    QUEUED = (QUEUED_BY_GROUP.get(GROUP_KEY) || 0) + REWARD.queuedCount;
                ASSERT(Number.isSafeInteger(QUEUED));
                QUEUED_BY_GROUP.set(GROUP_KEY, QUEUED);
            }
            ASSERT(
                REWARD.baselineChance ===
                    (REWARD.firstClear
                        ? LEGACY_REWARD_SETTINGS.firstClearAcquisitionChance
                        : LEGACY_REWARD_SETTINGS.acquisitionChance) &&
                    REWARD.chance === Math.min(1, REWARD.baselineChance * (REWARD.acquisitionMultiplier ?? 1)) &&
                    SAFE_INTEGER(REWARD.rollBudget, 1, LEGACY_REWARD_SETTINGS.maxRollCount) &&
                    INTEGER(REWARD.boxCount, 1, LEGACY_REWARD_SETTINGS.maxBoxCount) &&
                    REWARD.boxCount === Math.min(REWARD.rollBudget, LEGACY_REWARD_SETTINGS.maxBoxCount) &&
                    REWARD.rollCount === REWARD.boxCount &&
                    INTEGER(REWARD.successCount, 0, REWARD.boxCount),
            );
            if (REWARD.status === 'calculating') {
                const CALC = REWARD.calculation;
                keys(CALC, ['version', 'payouts', 'hits', 'payoutRngStateAfter', 'jobState']);
                ASSERT(
                    CALC.version === 1 &&
                        Array.isArray(CALC.payouts) &&
                        CALC.payouts.length === REWARD.boxCount &&
                        Array.isArray(CALC.hits) &&
                        CALC.hits.length <= REWARD.boxCount &&
                        CALC.hits.every(
                            (index, i) =>
                                INTEGER(index, 0, REWARD.boxCount - 1) && (i === 0 || CALC.hits[i - 1] < index),
                        ) &&
                        INTEGER(CALC.payoutRngStateAfter, 0, 0xffffffff) &&
                        (CALC.jobState === null || VALID_JOB(CALC.jobState, REWARD.boxCount)) &&
                        REWARD.successCount === 0 &&
                        REWARD.acquiredCount === 0 &&
                        REWARD.queuedCount === 0,
                );
                const BASE = Math.floor(REWARD.rollBudget / REWARD.boxCount),
                    EXTRA = REWARD.rollBudget % REWARD.boxCount;
                ASSERT(
                    CALC.payouts.every((payout) => INTEGER(payout, BASE, BASE + (EXTRA > 0 ? 1 : 0))) &&
                        CALC.payouts.reduce((sum, payout) => sum + payout, 0) === REWARD.rollBudget &&
                        CALC.payouts.filter((payout) => payout === BASE + 1).length === EXTRA,
                );
                if (CALC.jobState) {
                    ASSERT(
                        CALC.hits.every((index) => index < CALC.jobState.processedTrials) &&
                            CALC.jobState.successes === CALC.hits.length &&
                            CALC.jobState.distributionState.probability === REWARD.chance,
                    );
                } else {
                    ASSERT(CALC.hits.length === 0);
                }
            } else {
                const BASE = Math.floor(REWARD.rollBudget / REWARD.boxCount),
                    EXTRA = REWARD.rollBudget % REWARD.boxCount,
                    EXTRA_HITS = REWARD.acquiredCount - REWARD.successCount * BASE;
                ASSERT(
                    REWARD.calculation === null &&
                        SAFE_INTEGER(REWARD.acquiredCount, 0, REWARD.rollBudget) &&
                        REWARD.successCount <= REWARD.acquiredCount &&
                        (REWARD.successCount === 0) === (REWARD.acquiredCount === 0) &&
                        INTEGER(
                            EXTRA_HITS,
                            Math.max(0, REWARD.successCount - (REWARD.boxCount - EXTRA)),
                            Math.min(EXTRA, REWARD.successCount),
                        ),
                );
            }
        } else {
            ASSERT(false);
        }
        if (REWARD.acquisitionMultiplier !== undefined) {
            ASSERT(NUMBER(REWARD.acquisitionMultiplier, 0, 2));
        }
    }
    ASSERT(
        INVENTORY.size === QUEUED_BY_GROUP.size &&
            [...INVENTORY].every(([key, quantity]) => QUEUED_BY_GROUP.get(key) === quantity),
    );

    for (const REWARD of boss.pendingRewards) {
        ASSERT(
            (REWARD.x === undefined || Number.isFinite(REWARD.x)) &&
                (REWARD.y === undefined || Number.isFinite(REWARD.y)),
        );
        ASSERT(REWARD.stage === undefined || INTEGER(REWARD.stage, 0, BOSS_REWARD_SETTINGS.maxStage));
        ASSERT(REWARD.unitId === undefined || INTEGER(REWARD.unitId));
        ASSERT(REWARD.bonusRollChance === undefined || REWARD.bonusRollChance === 0);
        ASSERT(REWARD.rolls === undefined || INTEGER(REWARD.rolls, 1, REWARD.boxCount));
        ASSERT(REWARD.revealedCount === undefined || INTEGER(REWARD.revealedCount, 0, REWARD.boxCount));
        if (REWARD.boxes !== undefined) {
            ASSERT(
                Array.isArray(REWARD.boxes) && (REWARD.boxes.length === 0 || REWARD.boxes.length === REWARD.boxCount),
            );
            const BASE = Math.floor(REWARD.rollBudget / REWARD.boxCount),
                EXTRA = REWARD.rollBudget % REWARD.boxCount;
            for (const BOX of REWARD.boxes) {
                keys(BOX, ['payout', 'hit']);
                ASSERT(INTEGER(BOX.payout, BASE, BASE + (EXTRA > 0 ? 1 : 0)) && typeof BOX.hit === 'boolean');
            }
            if (REWARD.boxes.length) {
                ASSERT(
                    REWARD.status === 'ready' &&
                        REWARD.boxes.reduce((sum, box) => sum + box.payout, 0) === REWARD.rollBudget &&
                        REWARD.boxes.filter((box) => box.payout === BASE + 1).length === EXTRA,
                );
                ASSERT(
                    REWARD.boxes.filter((box) => box.hit).length === REWARD.successCount &&
                        REWARD.boxes.reduce((sum, box) => sum + (box.hit ? box.payout : 0), 0) === REWARD.acquiredCount,
                );
            }
        }
    }
    return true;
}

const REWARD_KEYS =
    'encounterId source receiptKey stage species tier payoutRule baseAmount bandIndex kindReward record acquiredCount placedCount queuedCount revealed status'.split(
        ' ',
    );
// One ledger invariant for disk saves and runtime checkpoints.
export function validateBossRewardLedger(boss) {
    return validateSingleChestLedger(boss);
}

function validateSingleChestLedger(boss, { legacyCategorical = false } = {}) {
    keys(boss, ['nextEncounterId', 'settledThrough', 'pendingRewards', 'rewardRngState', 'queuedRewards']);
    keys(boss.settledThrough, ['farm']);
    ASSERT(INTEGER(boss.settledThrough.farm) && INTEGER(boss.nextEncounterId, boss.settledThrough.farm + 1));
    ASSERT(INTEGER(boss.rewardRngState, 0, 0xffffffff));
    ASSERT(Array.isArray(boss.pendingRewards) && boss.pendingRewards.length <= 100000);
    ASSERT(Array.isArray(boss.queuedRewards) && boss.queuedRewards.length <= CONFIG.unit.speciesCount);
    const INVENTORY = new Map(),
        QUEUED = new Map(),
        IDS = new Set(),
        ENCOUNTERS = new Set();
    for (const GROUP of boss.queuedRewards) {
        keys(GROUP, ['species', 'tier', 'count']);
        const KEY = `${GROUP.species}:${GROUP.tier}`;
        ASSERT(
            INTEGER(GROUP.species, 0, CONFIG.unit.speciesCount - 1) &&
                GROUP.tier === 1 &&
                SAFE_INTEGER(GROUP.count, 1) &&
                !INVENTORY.has(KEY),
        );
        INVENTORY.set(KEY, GROUP.count);
    }
    for (const REWARD of boss.pendingRewards) {
        keys(REWARD, legacyCategorical ? REWARD_KEYS.filter((key) => key !== 'payoutRule') : REWARD_KEYS);
        ASSERT(
            REWARD.source === 'farm' &&
                INTEGER(REWARD.encounterId, 1, boss.settledThrough.farm) &&
                STRING(REWARD.receiptKey),
        );
        ASSERT(!IDS.has(REWARD.receiptKey) && !ENCOUNTERS.has(REWARD.encounterId));
        IDS.add(REWARD.receiptKey);
        ENCOUNTERS.add(REWARD.encounterId);
        ASSERT(
            INTEGER(REWARD.stage, 1, BOSS_REWARD_SETTINGS.maxStage) &&
                INTEGER(REWARD.species, 0, CONFIG.unit.speciesCount - 1) &&
                REWARD.tier === 1,
        );
        ASSERT(typeof REWARD.record === 'boolean' && typeof REWARD.revealed === 'boolean' && REWARD.status === 'ready');
        ASSERT(
            SAFE_INTEGER(REWARD.acquiredCount) &&
                SAFE_INTEGER(REWARD.placedCount) &&
                SAFE_INTEGER(REWARD.queuedCount) &&
                REWARD.placedCount + REWARD.queuedCount === REWARD.acquiredCount,
        );
        if (legacyCategorical) {
            // Schema 2 only: validate its earned amount before converting it.
            // These historical numbers never participate in a new settlement.
            ASSERT(INTEGER(REWARD.kindReward, 1, 3));
            if (REWARD.bandIndex === null) {
                ASSERT(REWARD.baseAmount === 0 && REWARD.revealed === true);
            } else {
                const BASE = Math.ceil(REWARD.stage / 10) * REWARD.kindReward * (REWARD.record ? 2 : 1);
                ASSERT(
                    INTEGER(REWARD.bandIndex, 0, 6) &&
                        REWARD.baseAmount === BASE &&
                        REWARD.acquiredCount === Math.round((BASE * REWARD.bandIndex) / 3),
                );
            }
        } else if (REWARD.payoutRule === 'settled') {
            // Earned historical entitlements are preserved, including unopened
            // receipts and quantities above the new cap. Do not reinterpret them.
            ASSERT(
                REWARD.baseAmount === 0 &&
                    REWARD.bandIndex === null &&
                    REWARD.kindReward === 1 &&
                    REWARD.record === false,
            );
        } else {
            ASSERT(
                REWARD.payoutRule === 'capped' &&
                    INTEGER(REWARD.bandIndex, 0, 6) &&
                    REWARD.baseAmount === bossRewardBaseAmount(REWARD.stage, REWARD.kindReward, REWARD.record) &&
                    REWARD.acquiredCount === bossRewardAmount(REWARD.baseAmount, REWARD.bandIndex),
            );
        }
        if (REWARD.queuedCount > 0) {
            const KEY = `${REWARD.species}:${REWARD.tier}`,
                COUNT = (QUEUED.get(KEY) || 0) + REWARD.queuedCount;
            ASSERT(SAFE_INTEGER(COUNT));
            QUEUED.set(KEY, COUNT);
        }
    }
    ASSERT(INVENTORY.size === QUEUED.size && [...INVENTORY].every(([key, count]) => QUEUED.get(key) === count));
    return true;
}

function finishLegacyCalculation(receipt, stream) {
    const SDK = globalThis.BloomGamekitDeterministic;
    ASSERT(SDK?.SeededPRNG && SDK?.PseudoRandomDistribution);
    const RNG = new SDK.SeededPRNG(stream.rngState),
        PRD = new SDK.PseudoRandomDistribution({ probability: receipt.chance, rng: RNG });
    const CALC = receipt.calculation,
        HITS = [...CALC.hits];
    let job;
    try {
        if (CALC.jobState) {
            job = PRD.restoreRollJob(CALC.jobState);
        } else {
            if (stream.distributionState) {
                PRD.restore(stream.distributionState);
            }
            if (PRD.probability !== receipt.chance) {
                PRD.setProbability(receipt.chance);
            }
            job = PRD.createRollJob(receipt.boxCount);
        }
        if (receipt.chance === 1 && HITS.length === 0) {
            for (let i = 0; i < receipt.boxCount; i++) {
                HITS.push(i);
            }
        }
        // At most 100 historical box trials. A one-unit PRD step consumes at
        // least one trial, so this import-only completion has a fixed bound.
        for (let stepCount = 0; !job.done && stepCount < receipt.boxCount; stepCount++) {
            const BEFORE = job.successes,
                STEP = job.step(1);
            ASSERT(STEP.unitsUsed > 0);
            if (receipt.chance !== 1 && STEP.successes > BEFORE) {
                ASSERT(STEP.successes === BEFORE + 1);
                HITS.push(STEP.processedTrials - 1);
            }
        }
        ASSERT(job.done);
        const STATE = job.capture();
        stream.rngState = STATE.rngState;
        stream.distributionState = STATE.distributionState;
        stream.payoutRngState = CALC.payoutRngStateAfter;
        return HITS.reduce((sum, index) => sum + CALC.payouts[index], 0);
    } finally {
        job?.dispose();
        PRD.dispose();
    }
}

// Explicit schema migration only: no live simulation or new settlement calls this.
// The caller validates the enclosing farm/checkpoint before committing the clone.
function migratePrdBossRewardLedger(boss) {
    validateLegacyBossRewardLedger(boss);
    const LEGACY = structuredClone(boss),
        INVENTORY = LEGACY.queuedRewards;
    const RECEIPTS = LEGACY.pendingRewards.map((receipt) => {
        const ACQUIRED =
            receipt.status === 'calculating'
                ? finishLegacyCalculation(receipt, LEGACY.rewardStreams.event)
                : receipt.acquiredCount;
        const PLACED = receipt.status === 'calculating' ? 0 : receipt.placedCount;
        const QUEUED = receipt.status === 'calculating' ? ACQUIRED : receipt.queuedCount;
        if (receipt.status === 'calculating' && ACQUIRED > 0) {
            const GROUP = INVENTORY.find((group) => group.species === receipt.species && group.tier === 1);
            if (GROUP) {
                ASSERT(SAFE_INTEGER(GROUP.count + ACQUIRED));
                GROUP.count += ACQUIRED;
            } else {
                INVENTORY.push({ species: receipt.species, tier: 1, count: ACQUIRED });
            }
        }
        return {
            encounterId: receipt.encounterId,
            source: receipt.source,
            receiptKey: receipt.receiptKey,
            stage: Math.max(1, receipt.stage || 1),
            species: receipt.species,
            tier: 1,
            payoutRule: 'settled',
            baseAmount: 0,
            bandIndex: null,
            kindReward: 1,
            record: false,
            acquiredCount: ACQUIRED,
            placedCount: PLACED,
            queuedCount: QUEUED,
            revealed: true,
            status: 'ready',
        };
    });
    const MIGRATED = {
        nextEncounterId: LEGACY.nextEncounterId,
        settledThrough: LEGACY.settledThrough,
        pendingRewards: RECEIPTS,
        rewardRngState: LEGACY.rewardStreams.event.rngState,
        queuedRewards: INVENTORY,
    };
    validateBossRewardLedger(MIGRATED);
    return MIGRATED;
}

// Import boundaries only: schema 1 PRD and schema 2 categorical receipts are
// validated in their original contract, then become immutable earned claims.
export function migrateBossRewardLedger(boss) {
    ASSERT(boss && typeof boss === 'object' && !Array.isArray(boss));
    if (Object.hasOwn(boss, 'rewardStreams')) {
        return migratePrdBossRewardLedger(boss);
    }
    ASSERT(Array.isArray(boss.pendingRewards));
    if (boss.pendingRewards.some((receipt) => !Object.hasOwn(receipt, 'payoutRule'))) {
        validateSingleChestLedger(boss, { legacyCategorical: true });
        const NEXT = structuredClone(boss);
        for (const RECEIPT of NEXT.pendingRewards) {
            RECEIPT.payoutRule = 'settled';
            RECEIPT.baseAmount = 0;
            RECEIPT.bandIndex = null;
            RECEIPT.kindReward = 1;
            RECEIPT.record = false;
        }
        validateBossRewardLedger(NEXT);
        return NEXT;
    }
    validateBossRewardLedger(boss);
    return boss;
}
