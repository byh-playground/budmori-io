import { createFormationSkillState } from './formation-skill-state.js';
import { Garden, Unit, CONFIG } from './farm-model.js';
import { createPlayerProgressionState, isValidPlayerProgressionState } from './player-progression.js';
import { BOSS_REWARD_SETTINGS } from './boss-rewards.js';
const FAIL = () => {
    throw new TypeError('올바른 농장 진행 저장 데이터가 아닙니다.');
};
const ASSERT = (value) => {
    if (!value) {
        FAIL();
    }
};
const INTEGER = (value, min = 0, max = 1e12) => Number.isSafeInteger(value) && value >= min && value <= max;
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
        formationSkills: structuredClone(player.formationSkills || createFormationSkillState()),
        level: player.level,
        experience: player.experience,
        availablePoints: player.availablePoints,
        farmUpgrades: {
            ...player.farmUpgrades,
        },
        abilities: Object.fromEntries(
            Object.entries(player.abilities).map(([id, build]) => [
                id,
                {
                    rootUnlocked: build.rootUnlocked,
                    powerLevel: build.powerLevel,
                    gradeLevel: build.gradeLevel,
                },
            ]),
        ),
        processedBossKillReceipts: [...player.processedBossKillReceipts],
    };
}
const REWARD_EXTRAS = [
    'acquisitionMultiplier',
    'xpReceiptKey',
    'xpStatus',
    'xpAmount',
    'levelsGained',
    'pointsAwarded',
];
function pendingReward(reward) {
    const ROLLS = reward.drops
        ? reward.drops.filter((drop) => drop.status === 'pending').map((drop) => drop.roll)
        : [reward.roll];
    const RESULT = {
        encounterId: reward.encounterId,
        source: reward.source,
        receiptKey: reward.receiptKey || `${reward.source}:${reward.encounterId}`,
        species: reward.species,
        tier: reward.tier,
        chance: reward.chance,
        rolls: ROLLS,
    };
    for (const KEY of REWARD_EXTRAS) {
        if (reward[KEY] !== undefined) {
            RESULT[KEY] = reward[KEY];
        }
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
    const GROUPS = new Map();
    for (const UNIT of world.units) {
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
            PREVIOUS.count++;
            continue;
        }
        const ROW = {
            species: SPECIES,
            tier: TIER,
            count: 1,
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
    const ROSTER = [...GROUPS.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row),
        STAGE = world.farmBossProgress;
    return {
        seed: world.seed,
        rngState: world.rng.state,
        mode: world.mode,
        player: copyPlayer(world.playerProgression),
        roster: ROSTER,
        food: {
            count: world.food.length,
            remainder: world.foodTaps.remainder,
            produced: world.foodTaps.produced,
        },
        totals: {
            births: world.metrics.births,
            merges: world.metrics.merges,
        },
        bossStages: {
            currentStage: STAGE.currentStage,
            encounterSeed: STAGE.encounterSeed,
            encounterEpoch: STAGE.encounterEpoch,
            nextSelectionId: STAGE.nextSelectionId,
            selections: STAGE.selections.map(({ stage, species, selectionId }) => ({
                stage,
                species,
                selectionId,
            })),
        },
        ledger: {
            boss: {
                nextEncounterId: world.nextBossEncounterId,
                settledThrough: {
                    ...world.bossRewardWatermarks,
                },
                pendingRewards: world.bossRewardReceipts
                    .filter((reward) => reward.status === 'pending')
                    .map(pendingReward),
            },
            raid: {
                nextRunSequence: world.nextRaidRunSequence,
                activeRun:
                    world.activeRaidRunSequence === null
                        ? null
                        : {
                              sequence: world.activeRaidRunSequence,
                              sessionId: world.activeRaidSessionId,
                          },
                settledThrough: world.raidSettlementWatermark,
            },
        },
    };
}
export function validateFarmProgress(data) {
    keys(data, ['seed', 'rngState', 'mode', 'player', 'roster', 'food', 'totals', 'bossStages', 'ledger']);
    ASSERT(
        INTEGER(data.seed, 0, 0xffffffff) &&
            INTEGER(data.rngState, 0, 0xffffffff) &&
            ['breed', 'merge'].includes(data.mode),
    );
    const PLAYER = data.player,
        DEFAULTS = createPlayerProgressionState();
    keys(
        PLAYER,
        Object.keys(DEFAULTS).filter((key) => key !== 'formationSkills'),
        ['formationSkills'],
    );
    keys(PLAYER.farmUpgrades, Object.keys(DEFAULTS.farmUpgrades));
    keys(PLAYER.abilities, Object.keys(DEFAULTS.abilities));
    for (const BUILD of Object.values(PLAYER.abilities)) {
        keys(BUILD, ['rootUnlocked', 'powerLevel', 'gradeLevel']);
    }
    ASSERT(
        isValidPlayerProgressionState(PLAYER) &&
            INTEGER(PLAYER.level, 1) &&
            NUMBER(PLAYER.experience) &&
            Array.isArray(PLAYER.processedBossKillReceipts) &&
            PLAYER.processedBossKillReceipts.length <= 100000 &&
            PLAYER.processedBossKillReceipts.every(STRING),
    );
    ASSERT(Array.isArray(data.roster) && data.roster.length <= CONFIG.farm.capacity.max);
    let count = 0;
    const COHORTS = new Set();
    for (const ROW of data.roster) {
        keys(ROW, ['species', 'tier', 'count'], ['fed', 'growth', 'cooldown', 'rest']);
        ASSERT(
            INTEGER(ROW.species, 0, CONFIG.unit.speciesCount - 1) &&
                INTEGER(ROW.tier, 1, CONFIG.unit.maxTier) &&
                INTEGER(ROW.count, 1, CONFIG.farm.capacity.max),
        );
        count += ROW.count;
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
    ASSERT(count <= CONFIG.farm.capacity.max);
    keys(data.food, ['count', 'remainder', 'produced']);
    ASSERT(INTEGER(data.food.count, 0, 140) && INTEGER(data.food.remainder, 0, 4) && INTEGER(data.food.produced));
    keys(data.totals, ['births', 'merges']);
    ASSERT(INTEGER(data.totals.births) && INTEGER(data.totals.merges));
    const STAGE = data.bossStages;
    keys(STAGE, ['currentStage', 'encounterSeed', 'encounterEpoch', 'nextSelectionId', 'selections']);
    ASSERT(
        INTEGER(STAGE.currentStage, 1, BOSS_REWARD_SETTINGS.maxStage) &&
            INTEGER(STAGE.encounterSeed, 0, 0xffffffff) &&
            INTEGER(STAGE.encounterEpoch) &&
            INTEGER(STAGE.nextSelectionId, 1) &&
            Array.isArray(STAGE.selections) &&
            STAGE.selections.length <= BOSS_REWARD_SETTINGS.maxStage,
    );
    const STAGES = new Set(),
        SELECTIONS = new Set();
    for (const ENTRY of STAGE.selections) {
        keys(ENTRY, ['stage', 'species', 'selectionId']);
        ASSERT(
            INTEGER(ENTRY.stage, 1, BOSS_REWARD_SETTINGS.maxStage) &&
                INTEGER(ENTRY.species, 0, CONFIG.unit.speciesCount - 1) &&
                INTEGER(ENTRY.selectionId, 1, STAGE.nextSelectionId - 1) &&
                !STAGES.has(ENTRY.stage) &&
                !SELECTIONS.has(ENTRY.selectionId),
        );
        STAGES.add(ENTRY.stage);
        SELECTIONS.add(ENTRY.selectionId);
    }
    const LEDGER = data.ledger;
    keys(LEDGER, ['boss', 'raid']);
    const BOSS = LEDGER.boss,
        RAID = LEDGER.raid;
    keys(BOSS, ['nextEncounterId', 'settledThrough', 'pendingRewards']);
    keys(BOSS.settledThrough, ['farm', 'raid']);
    keys(RAID, ['nextRunSequence', 'activeRun', 'settledThrough']);
    ASSERT(
        INTEGER(BOSS.settledThrough.farm) &&
            INTEGER(BOSS.settledThrough.raid) &&
            INTEGER(BOSS.nextEncounterId, BOSS.settledThrough.farm + 1) &&
            INTEGER(RAID.nextRunSequence) &&
            INTEGER(RAID.settledThrough, BOSS.settledThrough.raid, RAID.nextRunSequence),
    );
    if (RAID.activeRun === null) {
        ASSERT(RAID.nextRunSequence === RAID.settledThrough);
    } else {
        keys(RAID.activeRun, ['sequence', 'sessionId']);
        ASSERT(
            INTEGER(RAID.activeRun.sequence, 1) &&
                RAID.activeRun.sequence === RAID.nextRunSequence &&
                RAID.activeRun.sequence === RAID.settledThrough + 1 &&
                STRING(RAID.activeRun.sessionId) &&
                RAID.activeRun.sessionId.length <= 128,
        );
    }
    ASSERT(Array.isArray(BOSS.pendingRewards) && BOSS.pendingRewards.length <= 100000);
    const RECEIPTS = new Set(),
        ENCOUNTERS = new Set();
    for (const REWARD of BOSS.pendingRewards) {
        keys(REWARD, ['encounterId', 'source', 'receiptKey', 'species', 'tier', 'chance', 'rolls'], REWARD_EXTRAS);
        ASSERT(
            ['farm', 'raid'].includes(REWARD.source) &&
                INTEGER(REWARD.encounterId, 1, BOSS.settledThrough[REWARD.source]) &&
                STRING(REWARD.receiptKey) &&
                !RECEIPTS.has(REWARD.receiptKey) &&
                INTEGER(REWARD.species, 0, CONFIG.unit.speciesCount - 1) &&
                INTEGER(REWARD.tier, 1, CONFIG.unit.maxTier) &&
                NUMBER(REWARD.chance, 0, 1),
        );
        RECEIPTS.add(REWARD.receiptKey);
        const ENCOUNTER = `${REWARD.source}:${REWARD.encounterId}`;
        ASSERT(!ENCOUNTERS.has(ENCOUNTER));
        ENCOUNTERS.add(ENCOUNTER);
        ASSERT(
            Array.isArray(REWARD.rolls) &&
                REWARD.rolls.length > 0 &&
                REWARD.rolls.length <= BOSS_REWARD_SETTINGS.maxStage &&
                REWARD.rolls.every((roll) => NUMBER(roll, 0, 1) && roll < REWARD.chance),
        );
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
    WORLD.mode = data.mode;
    WORLD.playerProgression = copyPlayer(data.player);
    WORLD.farmBossProgress = structuredClone(data.bossStages);
    Object.assign(WORLD.metrics, data.totals);
    const COUNT = data.roster.reduce((total, row) => total + row.count, 0);
    for (const ROW of data.roster) {
        for (let i = 0; i < ROW.count; i++) {
            const POINT = position(WORLD.units.length, COUNT, data.seed, 0.7),
                UNIT = new Unit(WORLD.nextId++, ROW.species, ROW.tier, POINT.x, POINT.y);
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
    });
    const { boss: BOSS, raid: RAID } = data.ledger;
    Object.assign(WORLD, {
        nextBossEncounterId: BOSS.nextEncounterId,
        bossRewardWatermarks: {
            ...BOSS.settledThrough,
        },
        nextRaidRunSequence: RAID.nextRunSequence,
        activeRaidRunSequence: RAID.activeRun?.sequence ?? null,
        activeRaidSessionId: RAID.activeRun?.sessionId ?? null,
        raidSettlementWatermark: RAID.settledThrough,
    });
    WORLD.bossRewardReceipts = BOSS.pendingRewards.map((reward) => {
        const { rolls: ROLLS, ...FIELDS } = reward;
        return {
            ...FIELDS,
            x: 0,
            y: 0,
            roll: ROLLS[0],
            status: 'pending',
            unitId: 0,
            rollCount: ROLLS.length,
            drops: ROLLS.map((roll) => ({
                roll,
                status: 'pending',
                unitId: 0,
            })),
        };
    });
    WORLD.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(data.rngState);
    WORLD.reconcileMateReservations();
    return WORLD;
}
