import { CONFIG } from './farm-config.js';

// The player's standing choices for the farm (worker share, breeding weights, deploy order). The garden applies
// them and the play settings save keeps them; both ask these rules, so the two can never disagree.
export function isWorkBasisPoints(basisPoints) {
    return Number.isSafeInteger(basisPoints) && basisPoints >= 0 && basisPoints <= 10000;
}
// One weight per species; null is an even split by headcount.
export function isBreedWeights(weights) {
    return (
        weights === null ||
        (Array.isArray(weights) &&
            weights.length <= CONFIG.unit.speciesCount &&
            weights.every((weight) => Number.isSafeInteger(weight) && weight >= 0) &&
            weights.some((weight) => weight > 0))
    );
}
// Every species exactly once.
export function isDeployOrder(order) {
    const COUNT = CONFIG.unit.speciesCount;
    return (
        Array.isArray(order) &&
        order.length === COUNT &&
        new Set(order).size === COUNT &&
        order.every((species) => Number.isSafeInteger(species) && species >= 0 && species < COUNT)
    );
}
