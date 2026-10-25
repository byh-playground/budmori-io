import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';

export class LeapBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
        this.physicalActive = true;
    }
    landingRadiusFor(boss) {
        return this.attackExtentFor(boss, this.config.landingRadius);
    }
    writeArea(boss, action, scene, pad, area) {
        const { CONFIG, CLAMP } = this.dependencies;
        area.kind = 'leap';
        area.width = boss.radius + pad;
        area.reach = this.landingRadiusFor(boss) + pad;
        let x = action.target?.x ?? boss.x;
        let y = action.target?.y ?? boss.y;
        if (action.phase === 'windup') {
            const DX = x - boss.x,
                DY = y - boss.y,
                D_LOCAL = Math.hypot(DX, DY);
            if (D_LOCAL > this.reachFor(boss)) {
                x = boss.x + (DX / D_LOCAL) * this.reachFor(boss);
                y = boss.y + (DY / D_LOCAL) * this.reachFor(boss);
            }
            const RX = CONFIG[scene].arena.radiusX - boss.radius - 0.25,
                RY = CONFIG[scene].arena.radiusY - boss.radius - 0.25,
                K = Math.max(1, Math.hypot(x / RX, y / RY));
            x /= K;
            y /= K;
        }
        area.targetX = x;
        area.targetY = y;
        const SX = action.start?.x ?? boss.x,
            SY = action.start?.y ?? boss.y;
        area.x = SX;
        area.y = SY;
        if (action.phase === 'active' && action.path) {
            area.progress = CLAMP(Math.max(0, action.phaseElapsed || 0) / action.path.duration, 0, 1);
        }
    }
    activate(world, action, boss) {
        const { ARENA_GEOMETRY, BALLISTICS } = this.dependencies;
        let x = action.target?.x ?? boss.x;
        let y = action.target?.y ?? boss.y;
        const DX = x - boss.x;
        const DY = y - boss.y;
        const D_LOCAL = Math.hypot(DX, DY);
        if (D_LOCAL > this.reachFor(boss)) {
            x = boss.x + (DX / D_LOCAL) * this.reachFor(boss);
            y = boss.y + (DY / D_LOCAL) * this.reachFor(boss);
        }
        const LAND = ARENA_GEOMETRY.clamp(
            {
                x,
                y,
            },
            world.scene,
            boss.radius + 0.25,
        );
        action.target = {
            x: LAND.x,
            y: LAND.y,
            z: 0,
        };
        action.path = BALLISTICS.create(
            {
                x: boss.x,
                y: boss.y,
                z: 0,
            },
            action.target,
            'leap',
        );
        return;
    }
    expectedHits(world, targets, boss) {
        const TARGET = this.selectedTarget(world, targets, undefined, boss);
        return world.bossGroundUnitsNear(TARGET.x, TARGET.y, this.landingRadiusFor(boss), boss).length;
    }
    updateActive(world, action, _dt, boss) {
        const { CONFIG, BALLISTICS } = this.dependencies;
        const OLD = {
                x: boss.x,
                y: boss.y,
                z: boss.z,
            },
            P = BALLISTICS.sample(action.path, action.phaseElapsed / action.path.duration);
        boss.x = P.x;
        boss.y = P.y;
        boss.z = P.z;
        world.sweepBossBody(OLD, action.id, boss);
        if (action.phaseElapsed >= action.path.duration) {
            boss.x = action.path.to.x;
            boss.y = action.path.to.y;
            boss.z = 0;
            const RADIUS = this.landingRadiusFor(boss),
                EXTENT = RADIUS + CONFIG.unit.maxRadius;
            for (const UNIT_LOCAL of world._collectBossTargets(
                boss.x - EXTENT,
                boss.y - EXTENT,
                boss.x + EXTENT,
                boss.y + EXTENT,
                world._bossHitCandidates,
                true,
            )) {
                if (action.hitIds.has(UNIT_LOCAL.id)) {
                    continue;
                }
                const DX = UNIT_LOCAL.x - boss.x,
                    DY = UNIT_LOCAL.y - boss.y,
                    D_LOCAL = Math.hypot(DX, DY);
                if (D_LOCAL <= RADIUS + UNIT_LOCAL.radius) {
                    world.hitBossPatternUnit(
                        UNIT_LOCAL,
                        action.id,
                        {
                            x: UNIT_LOCAL.x,
                            y: UNIT_LOCAL.y,
                            z: 0,
                        },
                        {
                            x: DX / (D_LOCAL || 1),
                            y: DY / (D_LOCAL || 1),
                        },
                        boss,
                    );
                }
            }
            world.combat('boss-pattern-land', {
                patternId: action.id,
                attackId: boss.attackId,
                x: boss.x,
                y: boss.y,
                z: 0,
            });
            world.enterBossPatternRecovery(action);
        }
    }
    target(world, living, boss) {
        return world.leapBossTarget(living, undefined, boss);
    }
    selectedTarget(_world, targets, _fallback) {
        return targets.leap;
    }
    eligible(world, targets, _aliveAdds, boss) {
        return !!this.selectedTarget(world, targets, undefined, boss);
    }
}
