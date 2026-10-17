import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';

export class FanBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
    }
    writeArea(_boss, _action, _scene, pad, area) {
        area.kind = 'fan';
        area.reach = this.config.reach;
        area.width = this.config.width + pad;
        area.sector = this.config.sector;
    }
    updateActive(world, action, dt) {
        const Q0 = Math.max(0, (action.phaseElapsed - dt) / this.config.active),
            Q1 = Math.min(1, action.phaseElapsed / this.config.active);
        world.fanBossWeapon(action, Q0, Q1);
        if (action.phaseElapsed >= this.config.active) {
            world.enterBossPatternRecovery(action);
        }
    }
    get hitMetric() {
        return 'sweepHits';
    }
    weaponPoint(boss, q) {
        const { CLAMP } = this.dependencies;
        const ACTION = boss.patternRuntime.active;
        const ANGLE = ACTION.aim - this.config.sector / 2 + this.config.sector * CLAMP(q, 0, 1);
        return {
            x: boss.x + Math.cos(ANGLE) * this.config.reach,
            y: boss.y + Math.sin(ANGLE) * this.config.reach,
            z: boss.z + 0.2,
        };
    }
}
