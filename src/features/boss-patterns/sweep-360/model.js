import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';

// Both arms start out to the sides (-90 and +90 degrees from the aim) and swing round the same way at once, half a
// turn each: one across the front, one across the back, so between them the whole circle is swept. The area is the
// whole disc from the body out.
export class SweepBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
        this.physicalActive = true;
    }
    writeArea(_boss, action, _scene, pad, area) {
        area.kind = 'sweep';
        area.reach = this.config.reach + pad;
        area.angle = action.startAngle ?? action.aim - Math.PI / 2;
    }
    activate(_world, action) {
        action.startAngle = action.aim - Math.PI / 2;
    }
    updateActive(world, action, dt) {
        const Q0 = Math.max(0, (action.phaseElapsed - dt) / this.config.active),
            Q1 = Math.min(1, action.phaseElapsed / this.config.active);
        for (const ARM_START of [action.startAngle, action.startAngle + Math.PI]) {
            world.resolveBossWedge(
                action,
                action.id,
                this.config.reach,
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
