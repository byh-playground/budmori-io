import { cornActionFor } from '../species-growth/corn-attack.js';

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
        if (projectile.cornActionId) {
            const ACTION = cornActionFor(world, projectile.cornActionId);
            if (!ACTION) {
                projectile.hit = true;
                return;
            }
            if (world.simulationTick <= ACTION.launchTick) {
                return;
            }
        }
        const OLD = this.oldPoint;
        OLD.x = projectile.x;
        OLD.y = projectile.y;
        OLD.z = projectile.z;
        projectile.elapsed += dt;
        Object.assign(
            projectile,
            BALLISTICS.sample(projectile.path, projectile.elapsed / projectile.path.duration, this.motionPoint),
        );
        if (projectile.cornActionId) {
            if (projectile.elapsed + 1e-9 < projectile.path.duration) {
                return;
            }
            projectile.elapsed = projectile.path.duration;
            const AREA = projectile.cornForm >= 4,
                TARGETS = [world.boss, ...world.units],
                ELIGIBLE = (target) =>
                    target &&
                    target.hp > 0 &&
                    target.faction !== projectile.faction &&
                    (target !== world.boss || projectile.faction === 'player') &&
                    (target.z || 0) <= projectile.height &&
                    (target.z || 0) + target.height >= 0 &&
                    Math.hypot(target.x - projectile.path.to.x, target.y - projectile.path.to.y) <=
                        target.radius + (AREA ? 0.8 : projectile.radius),
                PRIMARY = projectile.targetId === 'boss' ? world.boss : world._unitForId(projectile.targetId),
                TARGET =
                    PRIMARY?.generation === projectile.targetGeneration && ELIGIBLE(PRIMARY)
                        ? PRIMARY
                        : TARGETS.find(ELIGIBLE),
                HITS = TARGET
                    ? [
                          TARGET,
                          ...(AREA ? TARGETS.filter((entry) => entry !== TARGET && ELIGIBLE(entry)).slice(0, 4) : []),
                      ]
                    : [];
            if (!HITS.length) {
                this.impact(world, projectile, null, null);
            }
            for (let index = 0; index < HITS.length; index++) {
                this.impact(
                    world,
                    projectile,
                    HITS[index],
                    { x: projectile.x, y: projectile.y, z: projectile.z },
                    { scale: index === 0 ? 1 : 0.5, area: AREA },
                );
            }
            return;
        }
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
