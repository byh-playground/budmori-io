export const FOOD_RESERVATION = Object.freeze({
    pickupMinimum: 0.42,
    pickupPadding: 0.1,
    leaseSeconds: 8,
    stalledSeconds: 2.5,
    progressDistance: 0.08,
    retryDistance: 1,
    // An adult scans the grounded foods once, a unit of work per food, while there are this few: the rings cost a
    // unit per grid cell (81 cells at 50 foods) and then the whole list again.
    directScanLimit: 64,
    // Work units the food search broker spends a tick. A search is at most one per food (50 at a full field), so
    // this many finish a tick or two of searches; the old 24 could not finish one.
    searchUnitsPerTick: 200,
});
export const FOOD_SEARCH_BROKER_KEY = 'farm-food-search-broker';
