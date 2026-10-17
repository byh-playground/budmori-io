import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';

export class ChargeBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
    }
    writeArea(boss, action, scene, pad, area) {
        const { CONFIG } = this.dependencies;
        area.kind = 'charge';
        area.width = boss.radius + pad;
        const SX = action.start?.x ?? boss.x,
            SY = action.start?.y ?? boss.y,
            DX = Math.cos(area.angle),
            DY = Math.sin(area.angle);
        // The last physical substep is radially clamped, rather than clamping the
        // requested full reach (which can rotate and greatly overstate the lane).
        const RX = CONFIG[scene].arena.radiusX - boss.radius - 0.25,
            RY = CONFIG[scene].arena.radiusY - boss.radius - 0.25;
        const A_LOCAL = (DX * DX) / (RX * RX) + (DY * DY) / (RY * RY),
            B_LOCAL = 2 * ((SX * DX) / (RX * RX) + (SY * DY) / (RY * RY)),
            C_LOCAL = (SX * SX) / (RX * RX) + (SY * SY) / (RY * RY) - 1;
        const EXIT = Math.max(
                0,
                (-B_LOCAL + Math.sqrt(Math.max(0, B_LOCAL * B_LOCAL - 4 * A_LOCAL * C_LOCAL))) / (2 * A_LOCAL),
            ),
            STEP = this.config.speed * CONFIG.physics.fixedStep;
        const DISTANCE =
            EXIT < this.config.reach
                ? Math.min(this.config.reach, (Math.floor(EXIT / STEP + 1e-8) + 1) * STEP)
                : this.config.reach;
        const EX = SX + DX * DISTANCE,
            EY = SY + DY * DISTANCE,
            K = Math.max(1, Math.hypot(EX / RX, EY / RY));
        area.endX = action.phase === 'recover' ? boss.x : EX / K;
        area.endY = action.phase === 'recover' ? boss.y : EY / K;
        area.x = SX;
        area.y = SY;
    }
    activate(world, action) {
        action.start = {
            x: world.boss.x,
            y: world.boss.y,
            z: world.boss.z,
        };
        action.traveled = 0;
        return;
    }
    updateActive(world, action, dt) {
        const { ARENA_GEOMETRY } = this.dependencies;
        const DIRECTION = {
                x: Math.cos(action.aim),
                y: Math.sin(action.aim),
            },
            REMAINING = Math.max(0, this.config.reach - action.traveled),
            DISTANCE = Math.min(this.config.speed * dt, REMAINING),
            OLD = {
                x: world.boss.x,
                y: world.boss.y,
                z: world.boss.z,
            },
            CANDIDATE = {
                x: world.boss.x + DIRECTION.x * DISTANCE,
                y: world.boss.y + DIRECTION.y * DISTANCE,
            },
            BOUNDED = ARENA_GEOMETRY.clamp(CANDIDATE, world.scene, world.boss.radius + 0.25),
            HIT_BOUNDARY = Math.hypot(CANDIDATE.x - BOUNDED.x, CANDIDATE.y - BOUNDED.y) > 1e-8;
        world.boss.x = BOUNDED.x;
        world.boss.y = BOUNDED.y;
        const MOVED = Math.hypot(world.boss.x - OLD.x, world.boss.y - OLD.y);
        action.traveled += MOVED;
        world.boss.travel += MOVED;
        world.sweepBossBody(OLD, action.id);
        if (HIT_BOUNDARY || action.traveled >= this.config.reach - 1e-8 || MOVED < 1e-8) {
            world.enterBossPatternRecovery(action);
        }
    }
    target(world, living) {
        return world.chargeBossTarget(living);
    }
    selectedTarget(_world, targets, _fallback) {
        return targets.charge;
    }
    eligible(world, targets, _aliveAdds) {
        return !!this.selectedTarget(world, targets);
    }
    sweepNormal(boss) {
        return { x: Math.cos(boss.patternRuntime.active.aim), y: Math.sin(boss.patternRuntime.active.aim) };
    }
}
