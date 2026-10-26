import { scaleAttackArea } from '../../units/unit-stats.js';

// Shared contract only; concrete pattern behavior lives with its presentation.
export class BossPattern {
    constructor(feature, dependencies) {
        this.feature = feature;
        this.id = feature.id;
        this.config = feature.config;
        this.dependencies = dependencies;
        this.physicalActive = false;
    }
    target(world, living, boss) {
        return world.nearestBossTarget(living, true, boss);
    }
    selectedTarget(_world, targets, _fallback) {
        return targets.nearest;
    }
    attackExtentFor(boss, extent) {
        // Render projections carry the resolved scalar, while live Units own
        // their base profile/modifiers. Both use the same geometry calculation.
        return scaleAttackArea(
            extent,
            boss,
            Number.isFinite(boss.attackArea) ? { attackArea: boss.attackArea } : undefined,
        );
    }
    reachFor(boss) {
        return this.attackExtentFor(boss, this.config.reach);
    }
    eligible(world, targets, _aliveAdds, boss) {
        const TARGET = this.selectedTarget(world, targets, undefined, boss);
        return (
            !!TARGET && Math.hypot(TARGET.x - boss.x, TARGET.y - boss.y) <= this.reachFor(boss) + TARGET.radius + 1e-9
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
