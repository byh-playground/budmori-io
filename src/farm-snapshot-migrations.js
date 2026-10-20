import { validateSnapshot } from './farm-snapshot-validation.js';

// Restore only a snapshot produced by the current runtime schema. Save imports
// and version compatibility are handled explicitly at the user-facing boundary.
export function normalizeSnapshot(raw, { clone = true } = {}) {
    const SNAPSHOT = clone ? structuredClone(raw) : raw;
    validateSnapshot(SNAPSHOT);
    return SNAPSHOT;
}
