import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';

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
        world.resolveBossSector(action, action.id, this.config.reach, this.config.sector);
        world.enterBossPatternRecovery(action);
        return;
    }
}
