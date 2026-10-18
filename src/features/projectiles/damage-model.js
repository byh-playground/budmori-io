import { BallisticProjectile } from './model-base.js';
import { abilityFeatureFor } from '../../ability-catalog.js';

export class DamageProjectile extends BallisticProjectile {
    constructor(feature, dependencies) {
        super(feature, dependencies);
        this.landingEffect = feature.landingEffect;
    }
    impact(world, projectile, target, hit) {
        if (hit) {
            Object.assign(projectile, { x: hit.x, y: hit.y, z: hit.z });
            const SOURCE = world._unitForId(projectile.owner),
                LIVE_OWNER = SOURCE?.generation === projectile.ownerGeneration ? SOURCE : null,
                IMPACT_UNIT = LIVE_OWNER || {
                    id: projectile.owner,
                    generation: projectile.ownerGeneration || 0,
                    ownerId: projectile.ownerId || '',
                    faction: projectile.faction,
                    isFormationClone: !!projectile.isFormationClone,
                    species: projectile.species,
                    tier: projectile.tier,
                    x: projectile.x,
                    y: projectile.y,
                    z: projectile.z,
                };
            const ATTACK_CONTEXT = projectile.attackPayload
                    ? {
                          ...structuredClone(projectile.attackPayload),
                          source: IMPACT_UNIT,
                          criticalRoll: null,
                          area: false,
                          hitTargets: null,
                      }
                    : null,
                DID_HIT = world.damageCombatTarget(IMPACT_UNIT, projectile, target, hit, {
                    attackMultiplier: projectile.attackMultiplier,
                    attackKind: projectile.projectileKind || 'lob',
                    attackContext: ATTACK_CONTEXT,
                });
            if (DID_HIT && target.hp > 0 && projectile.abilityEffect?.abilityId) {
                abilityFeatureFor(projectile.abilityEffect.abilityId)?.model?.onProjectileHit?.(
                    world,
                    target,
                    projectile,
                    projectile.abilityEffect.config,
                );
            }
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
