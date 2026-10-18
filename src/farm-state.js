import { Garden, Unit, createUnitAttackCycle, CREATE_UNIT_SPECIAL_ABILITY } from './farm-model.js';
import { normalizeSnapshot } from './farm-snapshot-migrations.js';
import { validateSnapshot } from './farm-snapshot-validation.js';
export { snapshot } from './farm-snapshot.js';
export { normalizeSnapshot, validateSnapshot };

// Only hydration constructs runtime owners. DTO shapes and validation do not
// inspect constructors or copy caches back into the persisted field contract.
export function restore(raw) {
    raw = normalizeSnapshot(raw);
    validateSnapshot(raw);
    const G = new Garden();
    const { units: UNIT_DATA, ...WORLD_DATA } = structuredClone(raw);
    G.resetUnits();
    Object.assign(G, WORLD_DATA);
    G.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(raw.rng.state);
    if (G.boss.patternRuntime.active) {
        G.boss.patternRuntime.active.hitIds = new Set(raw.boss.patternRuntime.active.hitIds);
    }
    G.resetUnits(
        UNIT_DATA.map((data) => {
            const U = Object.assign(new Unit(data.id, data.species, data.tier, data.x, data.y), structuredClone(data));
            U.ability = Object.assign(createUnitAttackCycle(U), structuredClone(data.ability));
            const SPECIAL = CREATE_UNIT_SPECIAL_ABILITY(U);
            U.specialAbility = SPECIAL ? Object.assign(SPECIAL, structuredClone(data.specialAbility || {})) : null;
            return U;
        }),
    );
    G.reconcileMateReservations();
    return G;
}
