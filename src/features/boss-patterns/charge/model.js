import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';

export class ChargeBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
        this.physicalActive = true;
    }
    writeArea(boss, action, scene, pad, area) {
        const { ARENA_GEOMETRY } = this.dependencies;
        area.kind = 'charge';
        area.width = boss.radius + pad;
        const SX = action.start?.x ?? boss.x,
            SY = action.start?.y ?? boss.y,
            END = ARENA_GEOMETRY.rayEnd(
                { x: SX, y: SY },
                Math.cos(area.angle),
                Math.sin(area.angle),
                this.reachFor(boss),
                scene,
                boss.radius + 0.25,
            );
        area.endX = action.phase === 'recover' ? boss.x : END.x;
        area.endY = action.phase === 'recover' ? boss.y : END.y;
        area.x = SX;
        area.y = SY;
    }
    activate(_world, action, boss) {
        action.start = {
            x: boss.x,
            y: boss.y,
            z: boss.z,
        };
        action.traveled = 0;
        return;
    }
    // The units in the lane the boss runs along, as wide as its body.
    expectedHits(world, targets, boss) {
        const TARGET = this.selectedTarget(world, targets, undefined, boss),
            BOSS = boss,
            AIM = Math.atan2(TARGET.y - BOSS.y, TARGET.x - BOSS.x),
            DX = Math.cos(AIM),
            DY = Math.sin(AIM);
        return world.bossGroundUnitsNear(BOSS.x, BOSS.y, this.reachFor(boss), boss).filter((unit) => {
            const AHEAD = (unit.x - BOSS.x) * DX + (unit.y - BOSS.y) * DY,
                SIDE = Math.abs((unit.x - BOSS.x) * DY - (unit.y - BOSS.y) * DX);
            return AHEAD >= 0 && SIDE <= BOSS.radius + unit.radius;
        }).length;
    }
    updateActive(world, action, dt, boss) {
        const { ARENA_GEOMETRY } = this.dependencies;
        const DIRECTION = {
                x: Math.cos(action.aim),
                y: Math.sin(action.aim),
            },
            REMAINING = Math.max(0, this.reachFor(boss) - action.traveled),
            DISTANCE = Math.min(this.config.speed * dt, REMAINING),
            OLD = {
                x: boss.x,
                y: boss.y,
                z: boss.z,
            },
            CANDIDATE = {
                x: boss.x + DIRECTION.x * DISTANCE,
                y: boss.y + DIRECTION.y * DISTANCE,
            },
            BOUNDED = ARENA_GEOMETRY.rayEnd(OLD, DIRECTION.x, DIRECTION.y, DISTANCE, world, boss.radius + 0.25),
            HIT_BOUNDARY = Math.hypot(CANDIDATE.x - BOUNDED.x, CANDIDATE.y - BOUNDED.y) > 1e-8;
        boss.x = BOUNDED.x;
        boss.y = BOUNDED.y;
        const MOVED = Math.hypot(boss.x - OLD.x, boss.y - OLD.y);
        action.traveled += MOVED;
        boss.travel += MOVED;
        world.sweepBossBody(OLD, action.id, boss);
        if (HIT_BOUNDARY || action.traveled >= this.reachFor(boss) - 1e-8 || MOVED < 1e-8) {
            world.enterBossPatternRecovery(action);
        }
    }
    target(world, living, boss) {
        return world.chargeBossTarget(living, undefined, boss);
    }
    selectedTarget(_world, targets, _fallback) {
        return targets.charge;
    }
    eligible(world, targets, _aliveAdds, boss) {
        return !!this.selectedTarget(world, targets, undefined, boss);
    }
    sweepNormal(boss) {
        return { x: Math.cos(boss.patternRuntime.active.aim), y: Math.sin(boss.patternRuntime.active.aim) };
    }
}
