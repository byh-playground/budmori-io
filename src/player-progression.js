import { createAbilityProgressionState, isValidAbilityProgressionState } from "./ability-state.js";
import { getFarmUpgradeInvestedCount } from "./farm-upgrades.js";

// One base value anchors both confirmed progression numbers. The next-level
// increment is derived, not tuned independently.
export const PLAYER_PROGRESS_BASE_XP = 100;
export const BOSS_KILL_XP = PLAYER_PROGRESS_BASE_XP;
export const FIRST_LEVEL_XP = PLAYER_PROGRESS_BASE_XP;
export const LEVEL_XP_MULTIPLIER = 1.2;
export const SHARED_POINTS_PER_LEVEL = 1;

export function createPlayerProgressionState() {
  return {
    ...createAbilityProgressionState(),
    level: 1,
    experience: 0,
    processedBossKillReceipts: []
  };
}

// XP is the remainder toward the next level, so it naturally carries over
// across level-ups. receiptKey makes this helper idempotent if a caller retries
// the same persisted boss-kill receipt.
export function awardBossKillXp(state, receiptKey) {
  if (!isValidPlayerProgressionState(state)) {
    return { state, awarded: false, reason: "invalid-state", xpAwarded: 0, levelsGained: 0, pointsAwarded: 0 };
  }
  if (typeof receiptKey !== "string" || receiptKey.trim().length === 0) {
    return { state, awarded: false, reason: "invalid-receipt", xpAwarded: 0, levelsGained: 0, pointsAwarded: 0 };
  }
  if (state.processedBossKillReceipts.includes(receiptKey)) {
    return { state, awarded: false, reason: "duplicate-receipt", xpAwarded: 0, levelsGained: 0, pointsAwarded: 0 };
  }

  let level = state.level;
  let experience = state.experience + BOSS_KILL_XP;
  let levelsGained = 0;
  while (experience >= experienceForNextLevel(level)) {
    experience -= experienceForNextLevel(level);
    level += 1;
    levelsGained += 1;
  }
  const pointsAwarded = levelsGained * SHARED_POINTS_PER_LEVEL;
  const nextState = {
    ...state,
    level,
    experience,
    availablePoints: state.availablePoints + pointsAwarded,
    abilities: Object.fromEntries(Object.entries(state.abilities).map(([id, value]) => [id, { ...value }])),
    processedBossKillReceipts: [...state.processedBossKillReceipts, receiptKey]
  };
  return { state: nextState, awarded: true, reason: null, xpAwarded: BOSS_KILL_XP, levelsGained, pointsAwarded };
}

export function experienceForNextLevel(level) {
  if (!Number.isSafeInteger(level) || level < 1) throw new RangeError("level must be a positive integer");
  return FIRST_LEVEL_XP * LEVEL_XP_MULTIPLIER ** (level - 1);
}

export function formatXpForDisplay(experience) {
  const value = Number.isFinite(experience) ? Math.max(0, experience) : 0;
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(value);
}

export function isValidPlayerProgressionState(state) {
  if (!isValidAbilityProgressionState(state) ||
    !Number.isSafeInteger(state.level) || state.level < 1 ||
    !Number.isFinite(state.experience) || state.experience < 0 ||
    state.experience >= experienceForNextLevel(state.level) ||
    !Array.isArray(state.processedBossKillReceipts) ||
    !state.processedBossKillReceipts.every(key => typeof key === "string" && key.length > 0) ||
    new Set(state.processedBossKillReceipts).size !== state.processedBossKillReceipts.length) return false;
  const investedPoints = Object.values(state.abilities).reduce((total, investment) =>
    total + Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel, 0);
  return investedPoints + getFarmUpgradeInvestedCount(state.farmUpgrades) + state.availablePoints === state.level - 1;
}
