import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';

export class SweepBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
    }
    writeArea(_boss, _action, _scene, pad, area) {
        // resolveBossCircle hits the whole disk, not a ring around the weapon tip.
        area.kind = 'sweep';
        area.reach = this.config.reach + pad;
    }
    activate(world, action) {
        world.resolveBossCircle(action, action.id, this.config.reach);
        world.enterBossPatternRecovery(action);
        return;
    }
    get hitMetric() {
        return 'sweepHits';
    }
}
