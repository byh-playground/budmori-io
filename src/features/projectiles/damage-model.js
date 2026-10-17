import { BallisticProjectile } from './model-base.js';

export class DamageProjectile extends BallisticProjectile {
    constructor(feature, dependencies) {
        super(feature, dependencies);
        this.landingEffect = feature.landingEffect;
    }
    impact(world, projectile, target, hit) {
        if (hit) {
            Object.assign(projectile, { x: hit.x, y: hit.y, z: hit.z });
            const SOURCE = world._unitForId(projectile.owner),
                IMPACT_UNIT = SOURCE || {
                    id: projectile.owner,
                    ownerId: projectile.ownerId || '',
                    faction: projectile.faction,
                    isFormationClone: !!projectile.isFormationClone,
                    species: projectile.species,
                    tier: projectile.tier,
                    x: projectile.x,
                    y: projectile.y,
                    z: projectile.z,
                };
            world.damageCombatTarget(IMPACT_UNIT, projectile, target, hit, {
                attackMultiplier: projectile.attackMultiplier,
                attackKind: projectile.projectileKind || 'lob',
            });
            return;
        }
        if (projectile.elapsed >= projectile.path.duration) {
            projectile.z = 0;
            world.emit(this.landingEffect, projectile.x, projectile.y);
        }
    }
    isAlive(projectile) {
        return !projectile.hit && projectile.elapsed < projectile.path.duration;
    }
}
