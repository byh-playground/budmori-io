import { SeedProjectile } from '../features/projectiles/seed/model.js';
import { SpikeProjectile } from '../features/projectiles/spike/model.js';
import { projectileFeature } from '../features/projectiles/definition.js';

export function createProjectileBehaviors(dependencies) {
    const BEHAVIORS = Object.freeze(
        Object.fromEntries(
            [new SeedProjectile(dependencies), new SpikeProjectile(dependencies)].map((behavior) => [
                behavior.feature.id,
                Object.freeze(behavior),
            ]),
        ),
    );
    return Object.freeze({
        forProjectile(projectile) {
            return BEHAVIORS[projectileFeature(projectile).id];
        },
    });
}
