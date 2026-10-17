import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';

const TAU = Math.PI * 2;

export class SweepBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
        this.physicalActive = true;
    }
    writeArea(_boss, action, _scene, pad, area) {
        area.kind = 'sweep';
        area.reach = this.config.reach;
        area.width = this.config.width + pad;
        area.angle = action.startAngle ?? action.aim - Math.PI / 2;
    }
    activate(_world, action) {
        action.startAngle = action.aim - Math.PI / 2;
    }
    updateActive(world, action, dt) {
        const Q0 = Math.max(0, (action.phaseElapsed - dt) / this.config.active),
            Q1 = Math.min(1, action.phaseElapsed / this.config.active);
        world.sweepBossWeapon(action, Q0, Q1);
        if (action.phaseElapsed >= this.config.active - 1e-9) {
            world.enterBossPatternRecovery(action);
        }
    }
    weaponPoint(boss, q) {
        const { CLAMP } = this.dependencies,
            ACTION = boss.patternRuntime?.active,
            AIM = ACTION?.aim ?? boss.patternAim ?? boss.angle,
            START_ANGLE = ACTION?.startAngle ?? AIM - Math.PI / 2,
            ANGLE = START_ANGLE + TAU * CLAMP(q, 0, 1);
        return {
            x: boss.x + Math.cos(ANGLE) * this.config.reach,
            y: boss.y + Math.sin(ANGLE) * this.config.reach,
            z: (boss.z || 0) + 0.2,
        };
    }
    get hitMetric() {
        return 'sweepHits';
    }
}
