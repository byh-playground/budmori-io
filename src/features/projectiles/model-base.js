export class BallisticProjectile {
    constructor(feature, dependencies) {
        this.feature = feature;
        this.dependencies = dependencies;
    }
    update(world, projectile, dt) {
        const { Ballistics: BALLISTICS, ArenaGeometry: ARENA_GEOMETRY } = this.dependencies;
        const OLD = { x: projectile.x, y: projectile.y, z: projectile.z };
        projectile.elapsed += dt;
        Object.assign(projectile, BALLISTICS.sample(projectile.path, projectile.elapsed / projectile.path.duration));
        const CANDIDATE =
            projectile.targetId && projectile.targetId !== 'boss' ? world._unitForId(projectile.targetId) : world.boss;
        const TARGET = CANDIDATE === world.boss || CANDIDATE?.hp > 0 ? CANDIDATE : null;
        const HIT = TARGET ? ARENA_GEOMETRY.sweep(OLD, projectile, projectile.radius, projectile.height, TARGET) : null;
        this.impact(world, projectile, TARGET, HIT);
    }
    updateChain(_world, _projectile) {
        /* Damage shells have no delayed chain reaction. */
    }
}
