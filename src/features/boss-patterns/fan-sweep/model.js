import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';

// One arm swings across the front sector. The area is the whole sector from the body out, drawn like a slam's.
export class FanBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
        this.physicalActive = true;
    }
    writeArea(_boss, _action, _scene, pad, area) {
        area.kind = 'sector';
        area.reach = this.config.reach + pad;
        area.sector = this.config.sector;
    }
    expectedHits(world, targets) {
        const TARGET = this.selectedTarget(world, targets),
            AIM = Math.atan2(TARGET.y - world.boss.y, TARGET.x - world.boss.x);
        return world
            .bossGroundUnitsNear(world.boss.x, world.boss.y, this.config.reach)
            .filter((unit) => world.bossWedgeContains(unit, this.config.reach, AIM, this.config.sector / 2)).length;
    }
    updateActive(world, action, dt) {
        const Q0 = Math.max(0, (action.phaseElapsed - dt) / this.config.active),
            Q1 = Math.min(1, action.phaseElapsed / this.config.active),
            START = action.aim - this.config.sector / 2;
        world.resolveBossWedge(
            action,
            action.id,
            this.config.reach,
            START + this.config.sector * Q0,
            START + this.config.sector * Q1,
        );
        if (action.phaseElapsed >= this.config.active) {
            world.enterBossPatternRecovery(action);
        }
    }
    get hitMetric() {
        return 'sweepHits';
    }
}
