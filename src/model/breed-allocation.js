// UI percentages only. The farm's saved weight array and allocation rules stay unchanged.
export function apportionBreedShares(weights, total = 100) {
    if (!weights.length) {
        return [];
    }
    const SUM = weights.reduce((sum, weight) => sum + weight, 0),
        EXACT = weights.map((weight) => (SUM > 0 ? (weight / SUM) * total : total / weights.length)),
        SHARES = EXACT.map(Math.floor),
        ORDER = EXACT.map((value, index) => ({ index, rest: value - SHARES[index] })).sort(
            (a, b) => b.rest - a.rest || a.index - b.index,
        );
    const REMAINING = total - SHARES.reduce((sum, share) => sum + share, 0);
    for (let index = 0; index < REMAINING; index++) {
        SHARES[ORDER[index].index]++;
    }
    return SHARES;
}

export function adjustBreedShare(weights, selectedIndex, value) {
    if (weights.length <= 1) {
        return weights.map(() => 100);
    }
    const SELECTED = Math.max(0, Math.min(100, Math.round(value))),
        OTHER_SHARES = apportionBreedShares(
            weights.filter((_, index) => index !== selectedIndex),
            100 - SELECTED,
        );
    OTHER_SHARES.splice(selectedIndex, 0, SELECTED);
    return OTHER_SHARES;
}
