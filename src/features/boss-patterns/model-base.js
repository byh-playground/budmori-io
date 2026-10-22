// Shared contract only; concrete pattern behavior lives with its presentation.
export class BossPattern {
    constructor(feature, dependencies) {
        this.feature = feature;
        this.id = feature.id;
        this.config = feature.config;
        this.dependencies = dependencies;
        this.physicalActive = false;
    }
    target(world, living) {
        return world.nearestBossTarget(living, true);
    }
    selectedTarget(_world, targets, _fallback) {
        return targets.nearest;
    }
    eligible(world, targets, _aliveAdds) {
        const TARGET = this.selectedTarget(world, targets);
        return (
            !!TARGET &&
            Math.hypot(TARGET.x - world.boss.x, TARGET.y - world.boss.y) <= this.config.reach + TARGET.radius + 1e-9
        );
    }
    selected(_world) {
        /* Most cooldowns begin on activation. */
    }
    activate(_world, _action) {
        /* Sustained patterns can begin without setup. */
    }
    updateActive(_world, _action, _dt) {
        /* Instant patterns enter recovery on activation. */
    }
    get hitMetric() {
        return 'basicHits';
    }
    sweepNormal(_boss) {
        return null;
    }
}
