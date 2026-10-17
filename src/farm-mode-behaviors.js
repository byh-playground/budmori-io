import { BreedFarmMode } from './features/farm-modes/breed/model.js';
import { MergeFarmMode } from './features/farm-modes/merge/model.js';

export function createFarmModeBehaviors(config) {
    return Object.freeze(
        Object.fromEntries(
            [new BreedFarmMode(config), new MergeFarmMode(config)].map((mode) => [
                mode.feature.id,
                Object.freeze(mode),
            ]),
        ),
    );
}
