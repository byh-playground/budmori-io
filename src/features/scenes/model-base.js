export class SimulationScene {
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    advanceClock(_world, _dt) {
        /* Only running raids own an encounter clock. */
    }
    advanceRest(_world, _unit, _dt) {
        return false;
    }
    restoreUnit(_world, _unit) {
        /* Raid units stay down for the encounter. */
    }
    afterDownedIntegration(_world, _unit) {
        /* Farm corpses retain their physical velocity. */
    }
    afterLivingIntegration(_world, _unit) {
        /* Farm deaths settle through the regular physics path. */
    }
    fallbackEnemy(_world, _unit) {
        return null;
    }
    updateUnoccupied(_world, _unit, _dt) {
        /* No neutral Farm combat update. */
    }
    checkpointProgress(_world, _dt, _advanced) {
        /* Raid timing is transient. */
    }
    resolveLifeContacts(_world, _units) {
        /* Raid contact cannot breed or merge. */
    }
    updateBossPhase(_world, _dt) {
        return false;
    }
    advanceDownedUnit(world, unit, dt) {
        const ADVANCED = this.advanceRest(world, unit, dt),
            OLD_Z = unit.z;
        unit.integrate(dt);
        this.afterDownedIntegration(world, unit);
        if (OLD_Z > 0 && unit.z === 0) {
            world.metrics.landings++;
            this.landUnit(world, unit);
        }
        this.restoreUnit(world, unit);
        world.unitSpatial.update(unit);
        return ADVANCED;
    }
    separateBossUnits(world) {
        for (const UNIT of world.units) {
            world.separateBoss(UNIT);
            world.unitSpatial.update(UNIT);
        }
    }
    updateBattle(world, dt) {
        if (!world.boss.active) {
            return;
        }
        world.updateProjectiles(dt);
        world.updateBoss(dt);
        // Preserve the pre-update active decision for ordinary encounters.
        this.separateBossUnits(world);
    }
}
