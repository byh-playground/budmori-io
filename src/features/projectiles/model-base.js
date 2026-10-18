export class BallisticProjectile {
    constructor(feature, dependencies) {
        this.feature = feature;
        this.dependencies = dependencies;
        this.oldPoint = { x: 0, y: 0, z: 0 };
        this.motionPoint = { x: 0, y: 0, z: 0 };
    }
    advanceLifecycle(_world, _projectile, _dt) {
        /* Plain damage projectiles have only a physical flight clock. */
    }
    update(world, projectile, dt) {
        const { Ballistics: BALLISTICS, ArenaGeometry: ARENA_GEOMETRY } = this.dependencies;
        const OLD = this.oldPoint;
        OLD.x = projectile.x;
        OLD.y = projectile.y;
        OLD.z = projectile.z;
        projectile.elapsed += dt;
        Object.assign(
            projectile,
            BALLISTICS.sample(projectile.path, projectile.elapsed / projectile.path.duration, this.motionPoint),
        );
        const CANDIDATE =
            projectile.targetId && projectile.targetId !== 'boss' ? world._unitForId(projectile.targetId) : world.boss;
        const TARGET =
            CANDIDATE &&
            CANDIDATE.generation === projectile.targetGeneration &&
            (CANDIDATE === world.boss || CANDIDATE.hp > 0)
                ? CANDIDATE
                : null;
        const HIT = TARGET ? ARENA_GEOMETRY.sweep(OLD, projectile, projectile.radius, projectile.height, TARGET) : null;
        this.impact(world, projectile, TARGET, HIT);
    }
    updateChain(_world, _projectile) {
        /* Damage shells have no delayed chain reaction. */
    }
}
