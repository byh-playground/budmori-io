import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';
import { FACTION_CONFIG, hasFaction } from '../../../factions.js';

export class MouthSummonBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
    }
    writeArea(_boss, _action, _scene, _pad, area) {
        area.kind = 'summon';
    }
    activate(world, action, boss) {
        const { CONFIG } = this.dependencies;
        boss.patternRuntime.cooldowns[action.id] = this.config.cooldown;
        const ALIVE = world.units.reduce((n, u) => n + (hasFaction(u, FACTION_CONFIG.ENEMY) && u.hp > 0 ? 1 : 0), 0);
        action.volleyCount = Math.min(this.config.volleyCount, Math.max(0, CONFIG.boss.maxSummons - ALIVE));
        action.nextRelease = 0;
        world.spawnBossMouthUnit(action, boss);
        action.nextRelease = this.config.releaseInterval;
        return;
    }
    updateActive(world, action, _dt, boss) {
        while (action.released < action.volleyCount && action.phaseElapsed + 1e-9 >= action.nextRelease) {
            if (!world.spawnBossMouthUnit(action, boss)) {
                break;
            }
            action.nextRelease += this.config.releaseInterval;
        }
        if (action.phaseElapsed >= this.config.active) {
            world.enterBossPatternRecovery(action);
        }
    }
    selectedTarget(_world, _targets, fallback) {
        return fallback;
    }
    eligible(_world, _targets, aliveAdds, boss) {
        const { CONFIG } = this.dependencies;
        return (
            boss.patternRuntime.encounterElapsed + 1e-9 >= this.config.firstEligible &&
            aliveAdds < CONFIG.boss.maxSummons
        );
    }
    selected(_world, boss) {
        boss.patternRuntime.cooldowns[this.id] = this.config.cooldown;
    }
}
