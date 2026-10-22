import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';

// The basic attack: one strong hit on the nearest unit in front of the boss.
export class SlamBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
    }
    writeArea(_boss, _action, _scene, pad, area) {
        area.kind = 'sector';
        area.reach = this.config.reach + pad;
        area.sector = this.config.sector;
    }
    activate(world, action) {
        world.resolveBossWedge(
            action,
            action.id,
            this.config.reach,
            action.aim - this.config.sector / 2,
            action.aim + this.config.sector / 2,
            1,
        );
        world.enterBossPatternRecovery(action);
        return;
    }
}
