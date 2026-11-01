import { Garden, CONFIG } from './farm-model.js';
import { Unit } from './farm-unit.js';
import {
    createPlayerProgressionState,
    isValidPlayerProgressionState,
    migratePlayerProgressionState,
    OVERALL_PROGRESSION_SETTINGS,
} from './player-progression.js';
import { validateBossRewardLedger, migrateBossRewardLedger } from '../save/boss-reward-ledger.js';
import {
    TEMPERAMENT_COUNT,
    SEED_FEEDS,
    SEED_FEED_COOLDOWN_SECONDS,
    isValidGenes,
    isValidCombine,
    isValidCodex,
} from './lineage.js';
const FAIL = () => {
    throw new TypeError('올바른 농장 진행 저장 데이터가 아니에요.');
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
    return structuredClone(player);
}
// A seed has no species while it grows; the save keeps the one it will become.
function savedSpecies(unit) {
    return unit.seedling ? unit.seedling.heritage : unit.species;
}
function cohortValues(unit) {
    return [
        savedSpecies(unit),
        unit.tier,
        unit.meals >= 1,
        Math.max(0, unit.growthDuration - unit.growthElapsed),
        unit.growthDuration,
        unit.cooldown,
        unit.cooldownDuration,
        unit.hp <= 0 ? unit.down : 0,
        unit.temperament,
        unit.genes.join(','),
        unit.seedling ? `${unit.seedling.fed}/${unit.seedling.cooldown}` : '',
    ];
}
// One disk contract: progress counts and entitlements, never the live world.
// Equal species/tier/fed/timer cohorts collapse to one count. Timers pause while
// offline, matching the Farm simulation; there is no wall-clock progression.
export function captureFarmProgress(world) {
    ASSERT(world.scene === 'farm');
    const GROUPS = new Map(),
        RECENTLY_SETTLED = new Set((world.bossRewardReceipts || []).slice(-8));
    for (const UNIT of world.roster.residents()) {
        if (UNIT.isBattleOnlySummon || UNIT.countsTowardPermanentRoster === false || UNIT.faction !== 'player') {
            continue;
        }
        const [SPECIES, TIER, FED, GROWTH, DURATION, COOLDOWN, COOLDOWN_DURATION, REST, TEMPERAMENT, GENES, SEEDLING] =
            cohortValues(UNIT);
        const KEY = [
            SPECIES,
            TIER,
            Number(FED),
            GROWTH,
            GROWTH ? DURATION : 0,
            COOLDOWN,
            COOLDOWN ? COOLDOWN_DURATION : 0,
            REST,
            TEMPERAMENT,
            GENES,
            SEEDLING,
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
        if (TEMPERAMENT !== 0) {
            ROW.temperament = TEMPERAMENT;
        }
        if (GENES !== '0,0') {
            ROW.genes = [...UNIT.genes];
        }
        if (UNIT.seedling) {
            ROW.seedling = { fed: UNIT.seedling.fed, cooldown: UNIT.seedling.cooldown };
        }
        GROUPS.set(KEY, ROW);
    }
    const ROSTER = [...GROUPS.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row);
    return {
        ...(world.combine.recipe >= 0 ? { combine: { ...world.combine } } : {}),
        codex: structuredClone(world.codex),
        seed: world.seed,
        rngState: world.rng.state,
        nextId: world.nextId,
        player: copyPlayer(world.playerProgression),
        roster: ROSTER,
        food: {
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
                            !reward.revealed ||
                            (Number.isSafeInteger(reward.queuedCount) && reward.queuedCount > 0) ||
                            RECENTLY_SETTLED.has(reward),
                    )
                    .map((reward) => structuredClone(reward)),
                rewardRngState: world.bossRewardRngState,
                queuedRewards: world.bossRewardInventory
                    .filter((entry) => entry.count > 0)
                    .map(({ species, tier, count }) => ({ species, tier, count })),
            },
        },
    };
}
export function validateFarmProgress(data, { allowLegacy = false } = {}) {
    keys(
        data,
        ['seed', 'rngState', 'nextId', 'player', 'roster', 'food', 'totals', 'ledger'],
        ['mode', 'combine', 'codex'],
    );
    ASSERT(
        INTEGER(data.seed, 0, 0xffffffff) &&
            INTEGER(data.rngState, 0, 0xffffffff) &&
            INTEGER(data.nextId, 1, CONFIG.farm.maxUnitId + 1) &&
            (data.mode === undefined || ['breed', 'merge'].includes(data.mode)) &&
            (data.combine === undefined || isValidCombine(data.combine)) &&
            (data.codex === undefined || isValidCodex(data.codex)),
    );
    const PLAYER = data.player,
        DEFAULTS = createPlayerProgressionState();
    keys(
        PLAYER,
        Object.keys(DEFAULTS).filter((key) => !allowLegacy || !['overallXp', 'towerRewards'].includes(key)),
        allowLegacy ? ['overallXp', 'towerRewards'] : [],
    );
    keys(PLAYER.abilities, Object.keys(DEFAULTS.abilities));
    ASSERT(
        isValidPlayerProgressionState(PLAYER, { allowLegacy }) &&
            Array.isArray(PLAYER.processedBossKillReceipts) &&
            PLAYER.processedBossKillReceipts.length <= 100000 &&
            PLAYER.processedBossKillReceipts.every(STRING),
    );
    ASSERT(Array.isArray(data.roster));
    const COHORTS = new Set(),
        RESIDENT_IDS = new Set();
    let maxResidentId = 0;
    for (const ROW of data.roster) {
        keys(
            ROW,
            ['species', 'tier', 'residentIds'],
            ['fed', 'growth', 'cooldown', 'rest', 'temperament', 'genes', 'seedling'],
        );
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
        if (Object.hasOwn(ROW, 'temperament')) {
            ASSERT(INTEGER(ROW.temperament, 1, TEMPERAMENT_COUNT - 1));
        }
        if (Object.hasOwn(ROW, 'genes')) {
            ASSERT(isValidGenes(ROW.genes) && ROW.genes.some((gene) => gene !== 0));
        }
        // A seed climbs the tower with the troops, so it can be knocked down and rest like any of them.
        if (Object.hasOwn(ROW, 'seedling')) {
            keys(ROW.seedling, ['fed', 'cooldown']);
            ASSERT(
                INTEGER(ROW.seedling.fed, 0, SEED_FEEDS - 1) &&
                    NUMBER(ROW.seedling.cooldown, 0, SEED_FEED_COOLDOWN_SECONDS) &&
                    ROW.growth,
            );
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
            ROW.temperament || 0,
            (ROW.genes || [0, 0]).join(','),
            ROW.seedling ? `${ROW.seedling.fed}/${ROW.seedling.cooldown}` : '',
        ].join(':');
        ASSERT(!COHORTS.has(SIGNATURE));
        COHORTS.add(SIGNATURE);
    }
    ASSERT(RESIDENT_IDS.size <= OVERALL_PROGRESSION_SETTINGS.maxCapacity);
    ASSERT(data.nextId > maxResidentId);
    keys(data.food, ['produced', 'count']);
    ASSERT(INTEGER(data.food.produced) && INTEGER(data.food.count, 0, 140));
    keys(data.totals, ['births', 'merges']);
    ASSERT(INTEGER(data.totals.births) && INTEGER(data.totals.merges));
    const LEDGER = data.ledger;
    keys(LEDGER, ['boss']);
    const BOSS = LEDGER.boss;
    validateBossRewardLedger(BOSS);
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
export function migrateFarmProgress(data) {
    // Species rollouts can migrate v4 to v4. Read only known entries before validating
    // the resulting current-schema container; never mutate or write the source on failure.
    const PLAYER = migratePlayerProgressionState(data?.player),
        NEXT = structuredClone(data);
    NEXT.player = PLAYER;
    if (Object.hasOwn(NEXT.ledger.boss, 'rewardStreams')) {
        NEXT.ledger.boss = migrateBossRewardLedger(NEXT.ledger.boss);
    }
    validateFarmProgress(NEXT);
    return NEXT;
}
export function restoreFarmProgress(data) {
    data = migrateFarmProgress(data);
    const WORLD = new Garden(data.seed);
    WORLD.resetUnits();
    WORLD.food = [];
    WORLD.nextId = 1;
    WORLD.playerProgression = copyPlayer(data.player);
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
            UNIT.temperament = ROW.temperament || 0;
            UNIT.genes = ROW.genes ? [...ROW.genes] : [0, 0];
            UNIT.setSeedling(ROW.seedling ? { ...ROW.seedling } : null);
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
    WORLD.foodTaps.produced = data.food.produced;
    WORLD.nextId = data.nextId;
    const { boss: BOSS } = data.ledger;
    Object.assign(WORLD, {
        nextBossEncounterId: BOSS.nextEncounterId,
        bossRewardWatermarks: {
            ...BOSS.settledThrough,
        },
        bossRewardRngState: BOSS.rewardRngState,
        bossRewardInventory: BOSS.queuedRewards.map(({ species, tier, count }) => ({ species, tier, count })),
    });
    WORLD.bossRewardReceipts = structuredClone(BOSS.pendingRewards);
    WORLD.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(data.rngState);
    if (data.combine) {
        WORLD.combine = { ...data.combine };
    }
    // The saved codex plus everything the restored units already are.
    WORLD.codex = structuredClone(data.codex ?? { recipes: [], forms: [], colors: [] });
    for (const UNIT of WORLD.roster.residents()) {
        if (!UNIT.seedling) {
            WORLD.recordCodex(UNIT);
        }
    }
    WORLD.reconcileMateReservations();
    return WORLD;
}
