import { SimulationScene } from '../model-base.js';
import { FEATURE } from './definition.js';

export class FarmSimulationScene extends SimulationScene {
    constructor(dependencies) {
        const { CONFIG } = dependencies;
        super(dependencies);
        this.feature = FEATURE;
        this.dropLandingEvent = 'boss-add-land';
        this.battleCapacity = CONFIG.farm.capacity.battleUnits;
    }
    progressionFor(world, _unit) {
        return world.playerProgression;
    }
    inBattle(world) {
        return world.farmBossEvent?.phase === 'fighting';
    }
    canSenseBoss(world) {
        return this.inBattle(world);
    }
    summonId(world) {
        return world.nextId++;
    }
    capacity(world) {
        return world.capacity;
    }
    unitId(unit, _index) {
        return unit.farmId || unit.id;
    }
    enterUnit(_world, unit, _index) {
        unit.id = unit.farmId || unit.id;
        unit.ownerId = '';
        unit.farmId = 0;
        unit.dropLanded = true;
        Object.assign(unit, unit.home);
    }
    setupRoster(world) {
        world.raidExpectedPlayers = ['solo'];
        world.raidRosters = [];
        world.raidDeploymentStarted = false;
    }
    advanceRest(_world, unit, dt) {
        unit.down = Math.max(0, unit.down - dt);
        if (unit.down < 1e-9) {
            unit.down = 0;
        }
        return true;
    }
    restoreUnit(world, unit) {
        const { STATS } = this.dependencies;
        if (unit.down !== 0) {
            return;
        }

        const MAX_HP = STATS(unit.tier, unit.species).maxHp;
        world.releaseMate(unit);
        unit.revive(MAX_HP);
    }
    landUnit(world, unit) {
        if (Math.hypot(unit.vx, unit.vy) > 1) {
            world.emit('land', unit.x, unit.y);
        }
    }
    checkpointProgress(world, dt, advanced) {
        if (!advanced) {
            return;
        }
        world._progressTimerCheckpoint += dt;
        if (world._progressTimerCheckpoint >= 5) {
            world._progressTimerCheckpoint = 0;
            world.markProgressChanged();
        }
    }
    resolveContacts(world, units, dt) {
        world.resolveFarmContacts(units, dt);
    }
    resolveLifeContacts(world, units) {
        const { FARM_MODES } = this.dependencies;
        FARM_MODES.breed.resolveContacts(world, units);
    }
    updateBossPhase(world, dt) {
        const { BOSS_EVENT_PHASES } = this.dependencies;
        return BOSS_EVENT_PHASES[world.farmBossEvent.phase].update(world, dt);
    }
    updateBattle(world, dt) {
        if (world.farmBossEvent.phase === 'idle') {
            super.updateBattle(world, dt);
            return;
        }
        world.updateBoss(dt);
    }
}
