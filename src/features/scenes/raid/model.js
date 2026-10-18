import { SimulationScene } from '../model-base.js';
import { FEATURE } from './definition.js';
import { createBossPatternRuntime } from '../../../boss-patterns.js';
import { createAbilityRuntimeSnapshot } from '../../../ability-state.js';
import { raidDeploymentCardSpecies } from '../../../raid-deployment-cards.js';
import { FACTION_CONFIG, hasFaction } from '../../../factions.js';

export class RaidSimulationScene extends SimulationScene {
    constructor(dependencies) {
        const { CONFIG } = dependencies;
        super(dependencies);
        this.feature = FEATURE;
        this.dropLandingEvent = 'drop-land';
        this.battleCapacity = CONFIG.raid.capacity.battleUnits;
    }
    progressionFor(world, unit) {
        return world.raidRoster(unit?.ownerId)?.abilitySnapshot || null;
    }
    inBattle(world) {
        return world.running;
    }
    canSenseBoss(world) {
        return world.running && world.raidDeploymentStarted;
    }
    summonId(world) {
        const { CONFIG } = this.dependencies;
        return CONFIG.raid.ids.summonBase + ++world.raidSummonSerial;
    }
    capacity(_world) {
        const { CONFIG } = this.dependencies;
        return CONFIG.raid.capacity.units;
    }
    unitId(_unit, index) {
        return 1000000 + index + 1;
    }
    enterUnit(_world, unit, index) {
        unit.home = {
            x: unit.x,
            y: unit.y,
        };
        unit.farmId = unit.farmId || unit.id;
        unit.ownerId = 'solo';
        unit.id = 1000000 + index + 1;
        unit.dropLanded = true;
        const ANGLE = index * 2.3999632297,
            RAD = 10.5 + (index % 3) * 0.9;
        Object.assign(unit, {
            x: Math.cos(ANGLE) * RAD,
            y: Math.sin(ANGLE) * RAD * 0.84,
        });
    }
    setupRoster(world) {
        world.boss.active = true;
        world.boss.encounterId = world.activeRaidRunSequence || world.nextRaidRunSequence || 1;
        world.boss.patternRuntime = createBossPatternRuntime();
        world.raidExpectedPlayers = ['solo'];
        world.raidRosters = [
            {
                ownerId: 'solo',
                deploymentCardSpecies: raidDeploymentCardSpecies(world.playerProgression.raidDeploymentCards),
                troops: world.units
                    .filter((u) => !u.isBattleOnlySummon)
                    .map((u) => ({
                        farmId: u.farmId,
                        species: u.species,
                        tier: u.tier,
                        deployed: true,
                    })),
                abilitySnapshot: createAbilityRuntimeSnapshot(world.playerProgression),
                buffUntil: 0,
                buffReadyAt: 0,
            },
        ];
        world.raidDeploymentStarted = true;
    }
    advanceClock(world, dt) {
        if (world.running) {
            world.encounter.elapsed += dt;
        }
    }
    afterDownedIntegration(world, unit) {
        if (world.running && unit.z === 0 && unit.vz === 0) {
            unit.vx = unit.vy = 0;
        }
    }
    afterLivingIntegration(_world, unit) {
        if (unit.hp <= 0 && unit.z === 0 && unit.vz === 0) {
            unit.vx = unit.vy = 0;
        }
    }
    fallbackEnemy(world, unit) {
        return world.running && hasFaction(unit, FACTION_CONFIG.PLAYER) && world.boss.hp > 0 ? world.boss : null;
    }
    updateUnoccupied(world, unit, dt) {
        if (world.running) {
            world.raidUnit(unit, dt, null);
        }
    }
    landUnit(world, unit) {
        world.combat('unit-land', {
            unit: unit.id,
            x: unit.x,
            y: unit.y,
            z: 0,
            strength: Math.min(1, Math.hypot(unit.vx, unit.vy) / 8),
        });
    }
    resolveContacts(world, units, dt) {
        world.raidContacts(units, dt);
    }
}
