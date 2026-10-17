import { BallisticProjectile } from '../model-base.js';
import { FEATURE } from './definition.js';

export class PopcornProjectile extends BallisticProjectile {
    constructor(dependencies) {
        super(FEATURE, dependencies);
    }
    update(world, projectile, dt) {
        if (!projectile.landed) {
            super.update(world, projectile, dt);
            return;
        }
        if (!projectile.exploded) {
            projectile.fuseRemaining = Math.max(0, projectile.fuseRemaining - dt);
        } else {
            projectile.explosionLife = (projectile.explosionLife || 0) + dt;
        }
    }
    impact(world, projectile, _target, hit) {
        if (!(hit || projectile.elapsed >= projectile.path.duration)) {
            return;
        }
        if (hit) {
            Object.assign(projectile, { x: hit.x, y: hit.y, z: 0 });
        } else {
            projectile.z = 0;
        }
        projectile.landed = true;
        projectile.fuseRemaining = projectile.popcornConfig.fuseSeconds;
        world.effects.push({
            kind: 'popcorn-kernel-impact',
            x: projectile.x,
            y: projectile.y,
            z: 0,
            life: 0,
            duration: 0.25,
            radius: projectile.radius,
            owner: projectile.owner,
        });
    }
    updateChain(world, projectile) {
        if (!projectile.landed || projectile.exploded) {
            return;
        }
        const TOUCHING = world.projectiles.some(
            (other) =>
                other !== projectile &&
                other.isPopcorn &&
                other.landed &&
                !other.exploded &&
                Math.hypot(other.x - projectile.x, other.y - projectile.y) <= other.radius + projectile.radius,
        );
        if (projectile.fuseRemaining > 0 && !TOUCHING) {
            return;
        }
        world.explodePopcorn(projectile);
    }
    isAlive(projectile) {
        return !projectile.exploded || projectile.explosionLife < 0.5;
    }
}
