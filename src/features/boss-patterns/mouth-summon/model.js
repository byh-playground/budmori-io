import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';
import { unitBodyRadius } from '../../unit-body/definition.js';
import { isBossMinion } from '../../../boss/boss-patterns.js';

export class MouthSummonBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
    }
    writeArea(boss, _action, _scene, _pad, area) {
        area.kind = 'summon';
        area.reach = this.landingDistance(boss);
    }
    // A minion's body radius: its species' T1 body at the minion scale.
    minionRadius(boss) {
        return (
            unitBodyRadius({ species: boss.species, tier: 1, growthElapsed: 1, growthDuration: 1 }) *
            this.config.minion.bodyScale
        );
    }
    // Where minions land, from the boss's centre: just clear of its body.
    landingDistance(boss) {
        return boss.radius + this.minionRadius(boss) + this.config.landingGap;
    }
    // Minions that may still join: the summon band's cap (bounded by the army's size) less those alive.
    minionRoom(world) {
        const ALIVE = world.units.reduce((n, u) => n + (isBossMinion(u) && u.hp > 0 ? 1 : 0), 0);
        return Math.max(0, world.bossMinionCap() - ALIVE);
    }
    activate(world, action, boss) {
        boss.patternRuntime.cooldowns[action.id] = world.bossPatternCooldown(this.id);
        action.volleyCount = Math.min(this.config.volleyCount, this.minionRoom(world));
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
    eligible(world, _targets, _aliveAdds, boss) {
        return boss.patternRuntime.encounterElapsed + 1e-9 >= this.config.firstEligible && this.minionRoom(world) > 0;
    }
    // The shockwave goes off as the windup starts, so the ground is clear by the time the first minion lands.
    selected(world, boss) {
        boss.patternRuntime.cooldowns[this.id] = world.bossPatternCooldown(this.id);
        world.bossSummonShockwave(boss, this.config.shockwave);
    }
}
