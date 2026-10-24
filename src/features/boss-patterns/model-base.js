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
    reachFor(_boss) {
        return this.config.reach;
    }
    eligible(world, targets, _aliveAdds) {
        const TARGET = this.selectedTarget(world, targets);
        return (
            !!TARGET &&
            Math.hypot(TARGET.x - world.boss.x, TARGET.y - world.boss.y) <=
                this.reachFor(world.boss) + TARGET.radius + 1e-9
        );
    }
    // How many units this attack would hit right now; null for an attack that does no damage.
    expectedHits(_world, _targets) {
        return null;
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
