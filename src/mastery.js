// Shared mastery curve used by legacy progression and the released species trees.
export const MASTERY_FIRST_LEVEL_XP = 100;
export const MASTERY_LEVEL_XP_MULTIPLIER = 1.2;
export function masteryXpForNextLevel(level) {
    if (!Number.isSafeInteger(level) || level < 1) {
        throw new RangeError('mastery level must be a positive integer');
    }
    return MASTERY_FIRST_LEVEL_XP * MASTERY_LEVEL_XP_MULTIPLIER ** (level - 1);
}
