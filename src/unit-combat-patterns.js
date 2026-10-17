// Deterministic, renderer-independent combat data for the new unit archetypes.
// These helpers do not own simulation state: callers persist the returned
// masks on the authoritative action snapshot and re-run them after rollback.
export const PEANUT_BASE_STRIKE = Object.freeze({
    count: 2,
    attackMultiplier: 0.5,
    activeSeconds: 0.5,
    spreadRadians: Math.PI / 12,
});
const MASK_BITS = 30;
export function createPeanutStrikeSchedule({
    strikeCount = PEANUT_BASE_STRIKE.count,
    activeSeconds = PEANUT_BASE_STRIKE.activeSeconds,
    attackMultiplier = PEANUT_BASE_STRIKE.attackMultiplier,
    spreadRadians = PEANUT_BASE_STRIKE.spreadRadians,
} = {}) {
    if (
        !Number.isSafeInteger(strikeCount) ||
        strikeCount < 1 ||
        strikeCount > MASK_BITS ||
        !Number.isFinite(activeSeconds) ||
        activeSeconds <= 0 ||
        !Number.isFinite(attackMultiplier) ||
        attackMultiplier <= 0 ||
        !Number.isFinite(spreadRadians) ||
        spreadRadians < 0 ||
        spreadRadians > Math.PI
    ) {
        return [];
    }
    return Array.from(
        {
            length: strikeCount,
        },
        (_, strikeIndex) => {
            const SIDE = strikeIndex % 2 === 0 ? -1 : 1;
            return Object.freeze({
                strikeIndex,
                kernelIndex: strikeIndex % 2,
                side: SIDE,
                angleOffsetRadians: SIDE * spreadRadians,
                dueSeconds: ((strikeIndex + 0.5) / strikeCount) * activeSeconds,
                attackMultiplier,
            });
        },
    );
}
export function hasStrikeMask(mask, strikeIndex) {
    return (
        Number.isSafeInteger(mask) &&
        mask >= 0 &&
        Number.isSafeInteger(strikeIndex) &&
        strikeIndex >= 0 &&
        strikeIndex < MASK_BITS &&
        (mask & (1 << strikeIndex)) !== 0
    );
}
export function resolveStrikeMask({ resolvedMask = 0, hitMask = 0 } = {}, strikeIndex, didHit) {
    if (
        !Number.isSafeInteger(resolvedMask) ||
        resolvedMask < 0 ||
        !Number.isSafeInteger(hitMask) ||
        hitMask < 0 ||
        !Number.isSafeInteger(strikeIndex) ||
        strikeIndex < 0 ||
        strikeIndex >= MASK_BITS ||
        typeof didHit !== 'boolean'
    ) {
        return null;
    }
    const BIT = 1 << strikeIndex;
    if ((resolvedMask & BIT) !== 0) {
        return null;
    }
    return {
        resolvedMask: resolvedMask | BIT,
        hitMask: didHit ? hitMask | BIT : hitMask,
    };
}
