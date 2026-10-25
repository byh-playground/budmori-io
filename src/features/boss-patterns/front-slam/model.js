import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';
import { BOSS_CONTACT_MARGIN } from '../../../boss-patterns.js';

// The basic attack: one strong hit on the nearest unit in front of the boss.
export class SlamBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
    }
    reachFor(boss) {
        return this.attackExtentFor(boss, Math.max(this.config.reach, boss.radius + BOSS_CONTACT_MARGIN));
    }
    writeArea(boss, _action, _scene, pad, area) {
        area.kind = 'sector';
        area.reach = this.reachFor(boss) + pad;
        area.sector = this.config.sector;
    }
    activate(world, action) {
        world.resolveBossWedge(
            action,
            action.id,
            this.reachFor(world.boss),
            action.aim - this.config.sector / 2,
            action.aim + this.config.sector / 2,
            1,
        );
        world.enterBossPatternRecovery(action);
        return;
    }
}
