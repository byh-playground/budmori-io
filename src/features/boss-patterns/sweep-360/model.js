import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';

// Both hands start out at the two sides of the body (screen left and right, whatever way the boss faces) and swing
// round the same way at once, half a turn each: the left one across the front, the right one across the back, so
// between them the whole circle is swept. The area is the whole disc from the body out.
export const SWEEP_HAND_STARTS = Object.freeze({ 'arm-left': Math.PI, 'arm-right': 0 });
export class SweepBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
        this.physicalActive = true;
    }
    writeArea(boss, _action, _scene, pad, area) {
        area.kind = 'sweep';
        area.reach = this.reachFor(boss) + pad;
        area.angle = 0;
    }
    expectedHits(world, _targets) {
        return world.bossGroundUnitsNear(world.boss.x, world.boss.y, this.reachFor(world.boss)).length;
    }
    updateActive(world, action, dt) {
        const Q0 = Math.max(0, (action.phaseElapsed - dt) / this.config.active),
            Q1 = Math.min(1, action.phaseElapsed / this.config.active);
        for (const ARM_START of Object.values(SWEEP_HAND_STARTS)) {
            world.resolveBossWedge(
                action,
                action.id,
                this.reachFor(world.boss),
                ARM_START + Math.PI * Q0,
                ARM_START + Math.PI * Q1,
            );
        }
        if (action.phaseElapsed >= this.config.active - 1e-9) {
            world.enterBossPatternRecovery(action);
        }
    }
    get hitMetric() {
        return 'sweepHits';
    }
}
