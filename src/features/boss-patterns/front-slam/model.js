import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';
import { BOSS_CONTACT_MARGIN } from '../../../boss/boss-patterns.js';

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
    activate(world, action, boss) {
        world.resolveBossWedge(
            action,
            action.id,
            this.reachFor(boss),
            action.aim - this.config.sector / 2,
            action.aim + this.config.sector / 2,
            1,
            boss,
        );
        world.enterBossPatternRecovery(action);
        return;
    }
}
