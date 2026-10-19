import { validateSnapshot } from './farm-snapshot-validation.js';

// Restore only a snapshot produced by the current runtime schema. Save imports
// and version compatibility are handled explicitly at the user-facing boundary.
export function normalizeSnapshot(raw, { clone = true } = {}) {
    const SNAPSHOT = clone ? structuredClone(raw) : raw;
    // Work state added in 0.10.27 to 0.10.32: checkpoints written before it simply have none.
    SNAPSHOT.materials ??= { wood: 0, stone: 0 };
    SNAPSHOT.savedSite ??= null;
    validateSnapshot(SNAPSHOT);
    return SNAPSHOT;
}
