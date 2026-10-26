import {
    createAbilityProgressionState,
    isValidAbilityProgressionState,
    isValidLegacyAbilityProgressionState,
    masteryXpForNextLevel,
} from './ability-state.js';
import {
    growthForAbility,
    growthBuildOf,
    isGrowthInvestment,
    migrateAbilityProgressionState,
} from './features/species-growth/state.js';
import { SPECIES_ABILITY_DEFINITIONS } from './ability-definitions.js';

// Beating a boss feeds the mastery of its own species; the XP a kill pays grows with the floor.
const BOSS_KILL_XP = 20;
export const FARM_BOSS_EVENT_MAX_STAGE = 100;
export const OVERALL_PROGRESSION_SETTINGS = Object.freeze({
    initialCapacity: 200,
    capacityPerLevel: 20,
    maxCapacity: 1000,
    firstLevelXp: 100,
    levelXpStep: 25,
    floorXpBase: 20,
    floorXpStep: 4,
    maxXp: 1e12,
});
const MAX_OVERALL_LEVEL =
    1 +
    (OVERALL_PROGRESSION_SETTINGS.maxCapacity - OVERALL_PROGRESSION_SETTINGS.initialCapacity) /
        OVERALL_PROGRESSION_SETTINGS.capacityPerLevel;
const PLAYER_FIELDS = ['schemaVersion', 'abilities', 'towerBest', 'processedBossKillReceipts'];

// The cumulative XP is the sole progression value. Level and capacity are views,
// so neither UI nor save migration can accidentally drift from the growth curve.
export function overallXpForLevel(level) {
    const STEPS = Math.max(0, Math.min(MAX_OVERALL_LEVEL, Math.floor(level)) - 1);
    return (
        STEPS * OVERALL_PROGRESSION_SETTINGS.firstLevelXp +
        ((STEPS * (STEPS - 1)) / 2) * OVERALL_PROGRESSION_SETTINGS.levelXpStep
    );
}
export function overallLevel(state) {
    let level = 1;
    while (level < MAX_OVERALL_LEVEL && (state?.overallXp || 0) >= overallXpForLevel(level + 1)) {
        level++;
    }
    return level;
}
export function farmCapacityForProgression(state) {
    return Math.min(
        OVERALL_PROGRESSION_SETTINGS.maxCapacity,
        OVERALL_PROGRESSION_SETTINGS.initialCapacity +
            (overallLevel(state) - 1) * OVERALL_PROGRESSION_SETTINGS.capacityPerLevel,
    );
}
export function highestTowerStartFloor(best) {
    const BEST = Math.max(0, Math.min(FARM_BOSS_EVENT_MAX_STAGE, Math.floor(best) || 0));
    return Math.max(1, BEST - Math.ceil(BEST * 0.2));
}

// Tower traversal is monotonic within a run. One persisted run/floor watermark
// rejects retries from this or any older run without an ever-growing receipt log.
export function beginTowerRewardRun(state) {
    if (!isValidPlayerProgressionState(state) || state.towerRewards.runId >= 1e12) {
        return { state, started: false, runId: null };
    }
    const RUN_ID = state.towerRewards.runId + 1;
    return {
        state: { ...state, towerRewards: { runId: RUN_ID, settledFloor: 0 } },
        started: true,
        runId: RUN_ID,
    };
}
function towerFloorXp(floor, difficultyMultiplier = 1) {
    if (
        !Number.isSafeInteger(floor) ||
        floor < 1 ||
        floor > FARM_BOSS_EVENT_MAX_STAGE ||
        !Number.isFinite(difficultyMultiplier) ||
        difficultyMultiplier < 1 ||
        difficultyMultiplier > 3
    ) {
        return 0;
    }
    return Math.round(
        (OVERALL_PROGRESSION_SETTINGS.floorXpBase + (floor - 1) * OVERALL_PROGRESSION_SETTINGS.floorXpStep) *
            difficultyMultiplier,
    );
}
export function awardTowerFloorXp(state, runId, floor, difficultyMultiplier = 1) {
    const XP = towerFloorXp(floor, difficultyMultiplier),
        REJECT = (reason) => ({ state, awarded: false, reason, xpAwarded: 0, levelsGained: 0 });
    if (!isValidPlayerProgressionState(state) || XP <= 0) {
        return REJECT('invalid-state-or-floor');
    }
    if (runId !== state.towerRewards.runId || runId <= 0) {
        return REJECT('inactive-run');
    }
    if (floor <= state.towerRewards.settledFloor) {
        return REJECT('duplicate-floor');
    }
    const NEXT = {
        ...state,
        overallXp: Math.min(OVERALL_PROGRESSION_SETTINGS.maxXp, state.overallXp + XP),
        towerRewards: { runId, settledFloor: floor },
    };
    return {
        state: NEXT,
        awarded: true,
        reason: null,
        xpAwarded: NEXT.overallXp - state.overallXp,
        levelsGained: overallLevel(NEXT) - overallLevel(state),
    };
}

// Only the explicit released four-field player shape is a legacy record. Missing
// half of the new contract or unknown fields are corrupt data, not a reset request.
export function migratePlayerProgressionState(state) {
    const NEXT = migrateAbilityProgressionState(state);
    if (!Object.hasOwn(NEXT, 'overallXp') && !Object.hasOwn(NEXT, 'towerRewards')) {
        if (!isValidPlayerProgressionState(NEXT, { allowLegacy: true })) {
            throw new TypeError('Invalid legacy player progression');
        }
        NEXT.overallXp = 0;
        NEXT.towerRewards = { runId: 0, settledFloor: 0 };
    }
    if (!isValidPlayerProgressionState(NEXT)) {
        throw new TypeError('Invalid player progression');
    }
    return NEXT;
}
const RECEIPT_MEMORY = 500;
export function createPlayerProgressionState() {
    return {
        ...createAbilityProgressionState(),
        towerBest: 0,
        overallXp: 0,
        towerRewards: { runId: 0, settledFloor: 0 },
        processedBossKillReceipts: [],
    };
}

// receiptKey makes this helper idempotent if a caller retries the same persisted boss-kill receipt.
export function awardMasteryXp(state, receiptKey, species, xpAmount = BOSS_KILL_XP) {
    const REJECT = (reason) => ({
        state,
        awarded: false,
        reason,
        xpAwarded: 0,
        levelsGained: 0,
        pointsAwarded: 0,
    });
    if (!isValidPlayerProgressionState(state)) {
        return REJECT('invalid-state');
    }
    if (typeof receiptKey !== 'string' || receiptKey.trim().length === 0) {
        return REJECT('invalid-receipt');
    }
    if (!Number.isFinite(xpAmount) || xpAmount < 0 || xpAmount >= 1e13) {
        return REJECT('invalid-xp');
    }
    const DEFINITION = SPECIES_ABILITY_DEFINITIONS.find((definition) => definition.species === species);
    if (!DEFINITION) {
        return REJECT('unknown-species');
    }
    if (state.processedBossKillReceipts.includes(receiptKey)) {
        return REJECT('duplicate-receipt');
    }
    const MASTERY = state.abilities[DEFINITION.id],
        GROWTH = growthForAbility(DEFINITION.id);
    if (GROWTH && isGrowthInvestment(MASTERY)) {
        const RESULT = GROWTH.awardXp(growthBuildOf(MASTERY), xpAmount);
        if (!RESULT.ok) {
            return REJECT(RESULT.reason);
        }
        const NEXT = structuredClone(state);
        NEXT.abilities[DEFINITION.id] = { ...NEXT.abilities[DEFINITION.id], ...RESULT.build };
        NEXT.processedBossKillReceipts = [...state.processedBossKillReceipts, receiptKey].slice(-RECEIPT_MEMORY);
        return {
            state: NEXT,
            awarded: true,
            reason: null,
            xpAwarded: xpAmount,
            levelsGained: RESULT.levelsGained,
            pointsAwarded: RESULT.pointsAwarded,
        };
    }
    let level = MASTERY.masteryLevel;
    let experience = MASTERY.masteryXp + xpAmount;
    let levelsGained = 0;
    while (experience >= masteryXpForNextLevel(level)) {
        experience -= masteryXpForNextLevel(level);
        level += 1;
        levelsGained += 1;
    }
    const NEXT_STATE = {
        ...state,
        abilities: Object.fromEntries(
            Object.entries(state.abilities).map(([id, value]) => [
                id,
                id === DEFINITION.id ? { ...value, masteryLevel: level, masteryXp: experience } : { ...value },
            ]),
        ),
        // Only a retry of a recent kill needs the duplicate guard, so the list stays short.
        processedBossKillReceipts: [...state.processedBossKillReceipts, receiptKey].slice(-RECEIPT_MEMORY),
    };
    return {
        state: NEXT_STATE,
        awarded: true,
        reason: null,
        xpAwarded: xpAmount,
        levelsGained,
        pointsAwarded: levelsGained,
    };
}
export function formatXpForDisplay(experience) {
    const VALUE = Number.isFinite(experience) ? Math.max(0, experience) : 0;
    return new Intl.NumberFormat('ko-KR', {
        maximumFractionDigits: 1,
    }).format(VALUE);
}
export function isValidPlayerProgressionState(state, { allowLegacy = false } = {}) {
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
        return false;
    }
    const LEGACY = allowLegacy && !Object.hasOwn(state, 'overallXp') && !Object.hasOwn(state, 'towerRewards'),
        FIELDS = LEGACY ? PLAYER_FIELDS : [...PLAYER_FIELDS, 'overallXp', 'towerRewards'],
        REWARDS = state.towerRewards;
    return (
        (isValidAbilityProgressionState(state) || (allowLegacy && isValidLegacyAbilityProgressionState(state))) &&
        Object.keys(state).length === FIELDS.length &&
        Object.keys(state).every((key) => FIELDS.includes(key)) &&
        Number.isSafeInteger(state.towerBest) &&
        state.towerBest >= 0 &&
        state.towerBest <= (LEGACY ? 61 : FARM_BOSS_EVENT_MAX_STAGE) &&
        (LEGACY ||
            (Number.isSafeInteger(state.overallXp) &&
                state.overallXp >= 0 &&
                state.overallXp <= OVERALL_PROGRESSION_SETTINGS.maxXp &&
                REWARDS &&
                typeof REWARDS === 'object' &&
                !Array.isArray(REWARDS) &&
                Object.keys(REWARDS).length === 2 &&
                Object.hasOwn(REWARDS, 'runId') &&
                Object.hasOwn(REWARDS, 'settledFloor') &&
                Number.isSafeInteger(REWARDS.runId) &&
                REWARDS.runId >= 0 &&
                REWARDS.runId <= 1e12 &&
                Number.isSafeInteger(REWARDS.settledFloor) &&
                REWARDS.settledFloor >= 0 &&
                REWARDS.settledFloor <= FARM_BOSS_EVENT_MAX_STAGE &&
                (REWARDS.runId > 0 || REWARDS.settledFloor === 0))) &&
        Array.isArray(state.processedBossKillReceipts) &&
        state.processedBossKillReceipts.every((key) => typeof key === 'string' && key.length > 0) &&
        new Set(state.processedBossKillReceipts).size === state.processedBossKillReceipts.length
    );
}
