import { FEATURE as SEED } from './seed/definition.js';
import { FEATURE as SPIKE } from './spike/definition.js';

// Existing save discriminants select one feature for all perspectives.
export function projectileFeature(projectile) {
    return projectileFlightFeature(projectile);
}

export function projectileFlightFeature(projectile) {
    return projectile.projectileKind === 'chestnut-spike' ? SPIKE : SEED;
}
