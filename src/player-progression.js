import {
    createAbilityProgressionState,
    isValidAbilityProgressionState,
    isValidLegacyAbilityProgressionState,
    masteryXpForNextLevel,
} from './ability-state.js';
import { growthForAbility, growthBuildOf, isGrowthInvestment } from './features/species-growth/state.js';
import { SPECIES_ABILITY_DEFINITIONS } from './ability-definitions.js';

// Beating a boss feeds the mastery of its own species; the XP a kill pays grows with the floor.
export const BOSS_KILL_XP = 20;
export const FARM_BOSS_EVENT_MAX_STAGE = 61;
const RECEIPT_MEMORY = 500;
export function createPlayerProgressionState() {
    return {
        ...createAbilityProgressionState(),
        towerBest: 0,
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
    return (
        (isValidAbilityProgressionState(state) || (allowLegacy && isValidLegacyAbilityProgressionState(state))) &&
        Object.keys(state).length === 4 &&
        Object.keys(state).every((key) =>
            ['schemaVersion', 'abilities', 'towerBest', 'processedBossKillReceipts'].includes(key),
        ) &&
        Number.isSafeInteger(state.towerBest) &&
        state.towerBest >= 0 &&
        state.towerBest <= FARM_BOSS_EVENT_MAX_STAGE &&
        Array.isArray(state.processedBossKillReceipts) &&
        state.processedBossKillReceipts.every((key) => typeof key === 'string' && key.length > 0) &&
        new Set(state.processedBossKillReceipts).size === state.processedBossKillReceipts.length
    );
}
