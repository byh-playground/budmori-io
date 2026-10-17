import { BreedFarmMode } from './features/farm-modes/breed/model.js';

export function createFarmModeBehaviors(config) {
    return Object.freeze({ breed: Object.freeze(new BreedFarmMode(config)) });
}
