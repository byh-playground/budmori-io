import { Garden, Unit, CONFIG } from './farm-model.js';
import { createPlayerProgressionState, isValidPlayerProgressionState } from './player-progression.js';
import { BOSS_REWARD_SETTINGS } from './boss-rewards.js';
const FAIL = () => {
    throw new TypeError('올바른 농장 진행 저장 데이터가 아니에요.');
};
const ASSERT = (value) => {
    if (!value) {
        FAIL();
    }
};
const INTEGER = (value, min = 0, max = 1e12) => Number.isSafeInteger(value) && value >= min && value <= max;
const SAFE_INTEGER = (value, min = 0, max = Number.MAX_SAFE_INTEGER) =>
    Number.isSafeInteger(value) && value >= min && value <= max;
const NUMBER = (value, min = 0, max = 1e12) => Number.isFinite(value) && value >= min && value <= max;
const STRING = (value) => typeof value === 'string' && value.trim().length > 0 && value.length < 256;
function keys(value, required, optional = []) {
    ASSERT(value && typeof value === 'object' && !Array.isArray(value));
    ASSERT(required.every((key) => Object.hasOwn(value, key)));
    ASSERT(Object.keys(value).every((key) => required.includes(key) || optional.includes(key)));
}
function copyPlayer(player) {
    return {
        schemaVersion: player.schemaVersion,
        formationSkills: structuredClone(player.formationSkills),
        level: player.level,
        experience: player.experience,
        farmBossEventStage: player.farmBossEventStage,
        availablePoints: player.availablePoints,
        farmUpgrades: {
            ...player.farmUpgrades,
        },
        abilities: Object.fromEntries(
            Object.entries(player.abilities).map(([id, build]) => [
                id,
                {
                    ...build,
                    ...(build.branchLevels ? { branchLevels: { ...build.branchLevels } } : {}),
                },
            ]),
        ),
        processedBossKillReceipts: [...player.processedBossKillReceipts],
    };
}
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
    'xpReceiptKey',
    'xpStatus',
    'xpAmount',
    'levelsGained',
    'pointsAwarded',
];
function pendingReward(reward) {
    const RESULT = {};
    for (const [KEY, VALUE] of Object.entries(reward)) {
        if (KEY === 'boxes' || KEY === 'revealedCount') {
            continue;
        }
        RESULT[KEY] = structuredClone(VALUE);
    }
    return RESULT;
}
function cohortValues(unit) {
    return [
        unit.species,
        unit.tier,
        unit.meals >= 1,
        Math.max(0, unit.growthDuration - unit.growthElapsed),
        unit.growthDuration,
        unit.cooldown,
        unit.cooldownDuration,
        unit.hp <= 0 ? unit.down : 0,
    ];
}
// One disk contract: progress counts and entitlements, never the live world.
// Equal species/tier/fed/timer cohorts collapse to one count. Timers pause while
// offline, matching the Farm simulation; there is no wall-clock progression.
export function captureFarmProgress(world) {
    ASSERT(world.scene === 'farm');
    const GROUPS = new Map(),
        RECENTLY_SETTLED = new Set(
            (world.bossRewardReceipts || []).filter((reward) => reward.status === 'ready').slice(-8),
        );
    for (const UNIT of world.roster.residents()) {
        if (UNIT.isBattleOnlySummon || UNIT.countsTowardPermanentRoster === false || UNIT.faction !== 'player') {
            continue;
        }
        const [SPECIES, TIER, FED, GROWTH, DURATION, COOLDOWN, COOLDOWN_DURATION, REST] = cohortValues(UNIT);
        const KEY = [
            SPECIES,
            TIER,
            Number(FED),
            GROWTH,
            GROWTH ? DURATION : 0,
            COOLDOWN,
            COOLDOWN ? COOLDOWN_DURATION : 0,
            REST,
        ].join(':');
        const PREVIOUS = GROUPS.get(KEY);
        if (PREVIOUS) {
            PREVIOUS.residentIds.push(UNIT.id);
            continue;
        }
        const ROW = {
            species: SPECIES,
            tier: TIER,
            residentIds: [UNIT.id],
        };
        if (FED) {
            ROW.fed = true;
        }
        if (GROWTH > 0) {
            ROW.growth = {
                remaining: GROWTH,
                duration: DURATION,
            };
        }
        if (COOLDOWN > 0) {
            ROW.cooldown = {
                remaining: COOLDOWN,
                duration: COOLDOWN_DURATION,
            };
        }
        if (REST > 0) {
            ROW.rest = REST;
        }
        GROUPS.set(KEY, ROW);
    }
    const ROSTER = [...GROUPS.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row);
    return {
        seed: world.seed,
        rngState: world.rng.state,
        nextId: world.nextId,
        player: copyPlayer(world.playerProgression),
        roster: ROSTER,
        food: {
            warehouse: world.warehouseFood,
            autoClock: world.foodTaps.autoClock,
            remainder: world.foodTaps.remainder,
            produced: world.foodTaps.produced,
            count: world.food.length,
        },
        totals: {
            births: world.metrics.births,
            merges: world.metrics.merges,
        },
        ledger: {
            boss: {
                nextEncounterId: world.nextBossEncounterId,
                settledThrough: {
                    ...world.bossRewardWatermarks,
                },
                pendingRewards: world.bossRewardReceipts
                    .filter(
                        (reward) =>
                            reward.status === 'calculating' ||
                            (Number.isSafeInteger(reward.queuedCount) && reward.queuedCount > 0) ||
                            RECENTLY_SETTLED.has(reward),
                    )
                    .map(pendingReward),
                rewardStreams: structuredClone(world.bossRewardStreams),
                queuedRewards: world.bossRewardInventory
                    .filter((entry) => entry.count > 0)
                    .map(({ species, tier, count }) => ({ species, tier, count })),
            },
        },
    };
}
export function validateFarmProgress(data) {
    keys(data, ['seed', 'rngState', 'nextId', 'player', 'roster', 'food', 'totals', 'ledger'], ['mode']);
    ASSERT(
        INTEGER(data.seed, 0, 0xffffffff) &&
            INTEGER(data.rngState, 0, 0xffffffff) &&
            INTEGER(data.nextId, 1, CONFIG.farm.maxUnitId + 1) &&
            (data.mode === undefined || ['breed', 'merge'].includes(data.mode)),
    );
    const PLAYER = data.player,
        DEFAULTS = createPlayerProgressionState();
    keys(PLAYER, Object.keys(DEFAULTS));
    keys(PLAYER.farmUpgrades, Object.keys(DEFAULTS.farmUpgrades));
    keys(PLAYER.abilities, Object.keys(DEFAULTS.abilities));
    for (const [ABILITY_ID, BUILD] of Object.entries(PLAYER.abilities)) {
        const BRANCH_KEYS = Object.keys(DEFAULTS.abilities[ABILITY_ID].branchLevels || {});
        keys(BUILD, ['powerLevel'], BRANCH_KEYS.length ? ['branchLevels'] : []);
        if (Object.hasOwn(BUILD, 'branchLevels')) {
            keys(BUILD.branchLevels, BRANCH_KEYS);
        }
    }
    ASSERT(
        isValidPlayerProgressionState(PLAYER) &&
            INTEGER(PLAYER.level, 1) &&
            NUMBER(PLAYER.experience) &&
            Array.isArray(PLAYER.processedBossKillReceipts) &&
            PLAYER.processedBossKillReceipts.length <= 100000 &&
            PLAYER.processedBossKillReceipts.every(STRING),
    );
    ASSERT(Array.isArray(data.roster));
    const COHORTS = new Set(),
        RESIDENT_IDS = new Set();
    let maxResidentId = 0;
    for (const ROW of data.roster) {
        keys(ROW, ['species', 'tier', 'residentIds'], ['fed', 'growth', 'cooldown', 'rest']);
        ASSERT(
            INTEGER(ROW.species, 0, CONFIG.unit.speciesCount - 1) &&
                INTEGER(ROW.tier, 1, CONFIG.unit.maxTier) &&
                Array.isArray(ROW.residentIds) &&
                ROW.residentIds.length > 0,
        );
        for (const ID of ROW.residentIds) {
            ASSERT(INTEGER(ID, 1, data.nextId - 1) && !RESIDENT_IDS.has(ID));
            RESIDENT_IDS.add(ID);
            maxResidentId = Math.max(maxResidentId, ID);
        }
        if (Object.hasOwn(ROW, 'fed')) {
            ASSERT(ROW.fed === true);
        }
        for (const KEY of ['growth', 'cooldown']) {
            if (Object.hasOwn(ROW, KEY)) {
                keys(ROW[KEY], ['remaining', 'duration']);
                ASSERT(
                    NUMBER(ROW[KEY].remaining, Number.MIN_VALUE, 100000) &&
                        NUMBER(ROW[KEY].duration, ROW[KEY].remaining, 100000),
                );
            }
        }
        if (Object.hasOwn(ROW, 'rest')) {
            ASSERT(NUMBER(ROW.rest, Number.MIN_VALUE, CONFIG.unit.corpseRecoverySeconds));
        }
        const SIGNATURE = [
            ROW.species,
            ROW.tier,
            Number(!!ROW.fed),
            ROW.growth?.remaining || 0,
            ROW.growth?.duration || 0,
            ROW.cooldown?.remaining || 0,
            ROW.cooldown?.duration || 0,
            ROW.rest || 0,
        ].join(':');
        ASSERT(!COHORTS.has(SIGNATURE));
        COHORTS.add(SIGNATURE);
    }
    ASSERT(RESIDENT_IDS.size <= CONFIG.farm.capacity.max);
    ASSERT(data.nextId > maxResidentId);
    keys(data.food, ['warehouse', 'autoClock', 'remainder', 'produced', 'count']);
    ASSERT(
        SAFE_INTEGER(data.food.warehouse) &&
            NUMBER(data.food.autoClock, 0, 0.51) &&
            data.food.autoClock < 0.51 &&
            INTEGER(data.food.remainder, 0, 4) &&
            INTEGER(data.food.produced) &&
            INTEGER(data.food.count, 0, 140),
    );
    keys(data.totals, ['births', 'merges']);
    ASSERT(INTEGER(data.totals.births) && INTEGER(data.totals.merges));
    const LEDGER = data.ledger;
    keys(LEDGER, ['boss']);
    const BOSS = LEDGER.boss;
    keys(BOSS, ['nextEncounterId', 'settledThrough', 'pendingRewards', 'rewardStreams', 'queuedRewards']);
    keys(BOSS.settledThrough, ['farm']);
    ASSERT(INTEGER(BOSS.settledThrough.farm) && INTEGER(BOSS.nextEncounterId, BOSS.settledThrough.farm + 1));
    const STREAMS = BOSS.rewardStreams;
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
        Array.isArray(BOSS.queuedRewards) &&
            BOSS.queuedRewards.length <= CONFIG.unit.speciesCount &&
            Array.isArray(BOSS.pendingRewards) &&
            BOSS.pendingRewards.length <= 100000,
    );
    const INVENTORY = new Map();
    for (const GROUP of BOSS.queuedRewards) {
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
    for (const REWARD of BOSS.pendingRewards) {
        const BASE_KEYS = ['encounterId', 'source', 'receiptKey', 'species', 'tier', 'chance', 'firstClear'];
        keys(REWARD, BASE_KEYS, [...REWARD_EXTRAS, 'rolls']);
        ASSERT(
            REWARD.source === 'farm' &&
                INTEGER(REWARD.encounterId, 1, BOSS.settledThrough[REWARD.source]) &&
                STRING(REWARD.receiptKey) &&
                !RECEIPTS.has(REWARD.receiptKey) &&
                INTEGER(REWARD.species, 0, CONFIG.unit.speciesCount - 1) &&
                INTEGER(REWARD.tier, 1, CONFIG.unit.maxTier) &&
                NUMBER(REWARD.chance, 0, 1) &&
                typeof REWARD.firstClear === 'boolean' &&
                !REWARD.firstClear,
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
                        ? BOSS_REWARD_SETTINGS.firstClearAcquisitionChance
                        : BOSS_REWARD_SETTINGS.acquisitionChance) &&
                    REWARD.chance === Math.min(1, REWARD.baselineChance * (REWARD.acquisitionMultiplier ?? 1)) &&
                    SAFE_INTEGER(REWARD.rollBudget, 1, BOSS_REWARD_SETTINGS.maxRollCount) &&
                    INTEGER(REWARD.boxCount, 1, BOSS_REWARD_SETTINGS.maxBoxCount) &&
                    REWARD.boxCount === Math.min(REWARD.rollBudget, BOSS_REWARD_SETTINGS.maxBoxCount) &&
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
                            CALC.jobState.successes === CALC.hits.length,
                    );
                }
            } else {
                ASSERT(
                    REWARD.calculation === null &&
                        SAFE_INTEGER(REWARD.acquiredCount, 0, REWARD.rollBudget) &&
                        REWARD.successCount <= REWARD.acquiredCount &&
                        (REWARD.successCount === 0) === (REWARD.acquiredCount === 0),
                );
            }
        } else {
            FAIL();
        }
        if (REWARD.acquisitionMultiplier !== undefined) {
            ASSERT(NUMBER(REWARD.acquisitionMultiplier, 0, 2));
        }
        if (REWARD.xpReceiptKey !== undefined) {
            ASSERT(STRING(REWARD.xpReceiptKey));
        }
        if (REWARD.xpStatus !== undefined) {
            ASSERT(['awarded', 'already-awarded', 'unsettled'].includes(REWARD.xpStatus));
        }
        for (const KEY of ['xpAmount', 'levelsGained', 'pointsAwarded']) {
            if (REWARD[KEY] !== undefined) {
                ASSERT(NUMBER(REWARD[KEY]));
            }
        }
    }
    ASSERT(
        INVENTORY.size === QUEUED_BY_GROUP.size &&
            [...INVENTORY].every(([key, quantity]) => QUEUED_BY_GROUP.get(key) === quantity),
    );
    return true;
}
// Deep value comparison occurs only at an actual save boundary. No JSON
// serialization, entity snapshot, or storage write is needed for equal progress.
export function sameFarmProgress(a, b) {
    if (a === b) {
        return true;
    }
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) {
        return false;
    }
    const KEYS_A = Object.keys(a),
        KEYS_B = Object.keys(b);
    return (
        KEYS_A.length === KEYS_B.length &&
        KEYS_A.every((key) => Object.hasOwn(b, key) && sameFarmProgress(a[key], b[key]))
    );
}
function position(index, count, seed, scale) {
    const ANGLE = index * 2.399963229728653 + (seed % 6283) / 1000,
        RADIUS = Math.sqrt((index + 0.5) / Math.max(1, count)) * scale;
    return {
        x: Math.cos(ANGLE) * CONFIG.farm.arena.radiusX * RADIUS,
        y: Math.sin(ANGLE) * CONFIG.farm.arena.radiusY * RADIUS,
    };
}
export function restoreFarmProgress(data) {
    validateFarmProgress(data);
    const WORLD = new Garden(data.seed);
    WORLD.resetUnits();
    WORLD.food = [];
    WORLD.nextId = 1;
    WORLD.playerProgression = copyPlayer(data.player);
    WORLD.warehouseFood = data.food.warehouse;
    Object.assign(WORLD.metrics, data.totals);
    const RESIDENT_TOTAL = data.roster.reduce((total, row) => total + row.residentIds.length, 0);
    let placed = 0;
    for (const ROW of data.roster) {
        for (const ID of ROW.residentIds) {
            const POINT = position(placed++, RESIDENT_TOTAL, data.seed, 0.7),
                UNIT = new Unit(ID, ROW.species, ROW.tier, POINT.x, POINT.y);
            UNIT.meals = ROW.fed ? 1 : 0;
            UNIT.growthDuration = ROW.growth?.duration || WORLD.breedGrowthDuration();
            UNIT.growthElapsed = ROW.growth ? ROW.growth.duration - ROW.growth.remaining : UNIT.growthDuration;
            UNIT.growth = Math.floor(
                (CONFIG.farm.breeding.matureMeals * UNIT.growthElapsed) / UNIT.growthDuration + 1e-9,
            );
            UNIT.cooldown = ROW.cooldown?.remaining || 0;
            UNIT.cooldownDuration = ROW.cooldown?.duration || 0;
            if (ROW.rest) {
                UNIT.hp = 0;
                UNIT.down = ROW.rest;
                UNIT.deathSplitHandled = true;
            }
            WORLD.addUnit(UNIT, { markProgress: false });
        }
    }
    for (let i = 0; i < data.food.count; i++) {
        const POINT = position(i, data.food.count, data.seed + 103, 0.8);
        WORLD.food.push({
            ...POINT,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            seed: (i * 0.61803398875) % 1,
            phase: 'grounded',
            tx: POINT.x,
            ty: POINT.y,
        });
    }
    Object.assign(WORLD.foodTaps, {
        remainder: data.food.remainder,
        produced: data.food.produced,
        autoClock: data.food.autoClock,
    });
    WORLD.nextId = data.nextId;
    const { boss: BOSS } = data.ledger;
    Object.assign(WORLD, {
        nextBossEncounterId: BOSS.nextEncounterId,
        bossRewardWatermarks: {
            ...BOSS.settledThrough,
        },
        bossRewardStreams: structuredClone(BOSS.rewardStreams),
        bossRewardInventory: BOSS.queuedRewards.map(({ species, tier, count }) => ({ species, tier, count })),
    });
    WORLD.bossRewardReceipts = BOSS.pendingRewards.map((reward) => ({
        ...reward,
        x: Number.isFinite(reward.x) ? reward.x : 0,
        y: Number.isFinite(reward.y) ? reward.y : 0,
        boxes: [],
        revealedCount: reward.status === 'ready' ? reward.boxCount : 0,
    }));
    WORLD.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(data.rngState);
    WORLD.reconcileMateReservations();
    return WORLD;
}
