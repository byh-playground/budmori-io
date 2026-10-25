import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';

// One arm swings across the front sector. The area is the whole sector from the body out, drawn like a slam's.
export class FanBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
        this.physicalActive = true;
    }
    writeArea(boss, _action, _scene, pad, area) {
        area.kind = 'sector';
        area.reach = this.reachFor(boss) + pad;
        area.sector = this.config.sector;
    }
    expectedHits(world, targets, boss) {
        const REACH = this.reachFor(boss),
            TARGET = this.selectedTarget(world, targets, undefined, boss),
            AIM = Math.atan2(TARGET.y - boss.y, TARGET.x - boss.x);
        return world
            .bossGroundUnitsNear(boss.x, boss.y, REACH, boss)
            .filter((unit) => world.bossWedgeContains(unit, REACH, AIM, this.config.sector / 2, boss)).length;
    }
    updateActive(world, action, dt, boss) {
        const Q0 = Math.max(0, (action.phaseElapsed - dt) / this.config.active),
            Q1 = Math.min(1, action.phaseElapsed / this.config.active),
            START = action.aim - this.config.sector / 2;
        world.resolveBossWedge(
            action,
            action.id,
            this.reachFor(boss),
            START + this.config.sector * Q0,
            START + this.config.sector * Q1,
            undefined,
            boss,
        );
        if (action.phaseElapsed >= this.config.active) {
            world.enterBossPatternRecovery(action);
        }
    }
    get hitMetric() {
        return 'sweepHits';
    }
}
