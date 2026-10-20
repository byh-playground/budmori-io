import { validateSnapshot } from './farm-snapshot-validation.js';
import { INITIAL_FARM_PLOT_ID } from './farm-plot.js';
import { createWorldMap } from './world-map.js';

// Restore only a snapshot produced by the current runtime schema. Save imports
// and version compatibility are handled explicitly at the user-facing boundary.
export function normalizeSnapshot(raw, { clone = true } = {}) {
    const SNAPSHOT = clone ? structuredClone(raw) : raw;
    // Work state added in 0.10.27 to 0.10.32: checkpoints written before it simply have none.
    SNAPSHOT.materials ??= { wood: 0, stone: 0 };
    SNAPSHOT.savedSites ??= [];
    // World map added in 0.14.0: checkpoints written before it start with a fresh map around the first farm.
    SNAPSHOT.worldMap ??= createWorldMap(SNAPSHOT.seed, INITIAL_FARM_PLOT_ID);
    validateSnapshot(SNAPSHOT);
    return SNAPSHOT;
}
