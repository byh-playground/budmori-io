import { createAbilityProgressionState, isValidAbilityProgressionState } from './ability-state.js';
import {
    createFormationSkillState,
    isValidFormationSkillState,
    formationInvestedPoints,
} from './formation-skill-state.js';
import { getFarmUpgradeInvestedCount } from './farm-upgrades.js';
import { createFarmPlotsProgression, isValidFarmPlotsProgression } from './farm-plot.js';
import {
    createRaidDeploymentCardsState,
    isValidRaidDeploymentCardsState,
    raidDeploymentCardsInvestedPoints,
} from './raid-deployment-cards.js';

// Level thresholds and boss-kill rewards use separate confirmed base values.
export const PLAYER_PROGRESS_BASE_XP = 100;
export const BOSS_KILL_XP = 20;
export const FIRST_LEVEL_XP = PLAYER_PROGRESS_BASE_XP;
export const LEVEL_XP_MULTIPLIER = 1.2;
export const SHARED_POINTS_PER_LEVEL = 1;
export const FARM_BOSS_EVENT_MAX_STAGE = 61;
export function createPlayerProgressionState() {
    return {
        ...createAbilityProgressionState(),
        formationSkills: createFormationSkillState(),
        raidDeploymentCards: createRaidDeploymentCardsState(),
        farmPlots: createFarmPlotsProgression(),
        level: 1,
        experience: 0,
        farmBossEventStage: 1,
        processedBossKillReceipts: [],
    };
}

// XP is the remainder toward the next level, so it naturally carries over
// across level-ups. receiptKey makes this helper idempotent if a caller retries
// the same persisted boss-kill receipt.
export function awardBossKillXp(state, receiptKey, xpAmount = BOSS_KILL_XP) {
    if (!isValidPlayerProgressionState(state)) {
        return {
            state,
            awarded: false,
            reason: 'invalid-state',
            xpAwarded: 0,
            levelsGained: 0,
            pointsAwarded: 0,
        };
    }
    if (typeof receiptKey !== 'string' || receiptKey.trim().length === 0) {
        return {
            state,
            awarded: false,
            reason: 'invalid-receipt',
            xpAwarded: 0,
            levelsGained: 0,
            pointsAwarded: 0,
        };
    }
    if (!Number.isFinite(xpAmount) || xpAmount < 0 || xpAmount >= 1e13) {
        return {
            state,
            awarded: false,
            reason: 'invalid-xp',
            xpAwarded: 0,
            levelsGained: 0,
            pointsAwarded: 0,
        };
    }
    if (state.processedBossKillReceipts.includes(receiptKey)) {
        return {
            state,
            awarded: false,
            reason: 'duplicate-receipt',
            xpAwarded: 0,
            levelsGained: 0,
            pointsAwarded: 0,
        };
    }
    let level = state.level;
    let experience = state.experience + xpAmount;
    let levelsGained = 0;
    while (experience >= experienceForNextLevel(level)) {
        experience -= experienceForNextLevel(level);
        level += 1;
        levelsGained += 1;
    }
    const POINTS_AWARDED = levelsGained * SHARED_POINTS_PER_LEVEL;
    const NEXT_STATE = {
        ...state,
        level,
        experience,
        availablePoints: state.availablePoints + POINTS_AWARDED,
        abilities: Object.fromEntries(
            Object.entries(state.abilities).map(([id, value]) => [
                id,
                {
                    ...value,
                },
            ]),
        ),
        processedBossKillReceipts: [...state.processedBossKillReceipts, receiptKey],
    };
    return {
        state: NEXT_STATE,
        awarded: true,
        reason: null,
        xpAwarded: xpAmount,
        levelsGained,
        pointsAwarded: POINTS_AWARDED,
    };
}
export function experienceForNextLevel(level) {
    if (!Number.isSafeInteger(level) || level < 1) {
        throw new RangeError('level must be a positive integer');
    }
    return FIRST_LEVEL_XP * LEVEL_XP_MULTIPLIER ** (level - 1);
}
export function formatXpForDisplay(experience) {
    const VALUE = Number.isFinite(experience) ? Math.max(0, experience) : 0;
    return new Intl.NumberFormat('ko-KR', {
        maximumFractionDigits: 1,
    }).format(VALUE);
}
export function isValidPlayerProgressionState(state) {
    if (
        !isValidAbilityProgressionState(state) ||
        (state.formationSkills !== undefined && !isValidFormationSkillState(state.formationSkills)) ||
        !isValidRaidDeploymentCardsState(state.raidDeploymentCards) ||
        !isValidFarmPlotsProgression(state.farmPlots) ||
        !Number.isSafeInteger(state.level) ||
        state.level < 1 ||
        !Number.isSafeInteger(state.farmBossEventStage) ||
        state.farmBossEventStage < 1 ||
        state.farmBossEventStage > FARM_BOSS_EVENT_MAX_STAGE ||
        !Number.isFinite(state.experience) ||
        state.experience < 0 ||
        state.experience >= experienceForNextLevel(state.level) ||
        !Array.isArray(state.processedBossKillReceipts) ||
        !state.processedBossKillReceipts.every((key) => typeof key === 'string' && key.length > 0) ||
        new Set(state.processedBossKillReceipts).size !== state.processedBossKillReceipts.length
    ) {
        return false;
    }
    const INVESTED_POINTS = Object.entries(state.abilities).reduce(
        (total, [, investment]) =>
            total +
            investment.powerLevel +
            Object.values(investment.branchLevels || {}).reduce((branchTotal, level) => branchTotal + level, 0),
        0,
    );
    return (
        INVESTED_POINTS +
            getFarmUpgradeInvestedCount(state.farmUpgrades) +
            formationInvestedPoints(state.formationSkills) +
            raidDeploymentCardsInvestedPoints(state.raidDeploymentCards) +
            state.availablePoints ===
        state.level - 1
    );
}
