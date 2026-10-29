// How far a boss has grown on a floor. The doors panel and the battlefield both read this, so they never disagree.

// More leaves as the floors go up.
export function bossLeafCount(floor) {
    return floor < 10 ? 1 : floor < 20 ? 2 : floor < 40 ? 3 : floor < 70 ? 4 : 5;
}
// No aura before floor 10, then it grows stronger.
export function bossAuraLevel(floor) {
    return floor < 10 ? 0 : Math.min(1, 0.25 + (floor - 10) / 120);
}
// Leaf angles around the head, in degrees; the first leaf is the tallest.
export const BOSS_LEAF_ANGLES = Object.freeze([0, -34, 34, -66, 66]);
