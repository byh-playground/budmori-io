import { FACTION_CONFIG, hasFaction } from '../../../core/factions.js';

// Phase objects execute the existing event record. No parallel phase/timer is
// kept here: save restoration and reset select behavior from that same record.
export function createFarmBossEventPhases(config) {
    class FarmBossEventPhase {
        update(_world, _dt) {
            return false;
        }
    }
    class MarchingFarmBossEventPhase extends FarmBossEventPhase {
        update(world, dt) {
            const TOWER = config.farm.tower,
                GATE = world.towerGate;
            world.farmBossEvent.elapsed += dt;
            // Whoever reaches the door goes in and is out of sight; the rest follow until the march runs out.
            let outside = 0;
            for (const UNIT of [...world.units]) {
                if (UNIT.isBattleOnlySummon || UNIT.hp <= 0) {
                    continue;
                }
                if (Math.hypot(UNIT.x - GATE.x, UNIT.y - GATE.y) <= TOWER.gateRadius) {
                    world.benchUnit(UNIT);
                } else {
                    outside++;
                }
            }
            if (outside === 0 || world.farmBossEvent.elapsed >= TOWER.marchSeconds) {
                world.finishMarch();
            }
            return true;
        }
    }
    class DroppingFarmBossEventPhase extends FarmBossEventPhase {
        update(world, dt) {
            world.farmBossEvent.elapsed += dt;
            world.boss.z = Math.max(
                0,
                config.battle.dropHeight -
                    0.5 * config.physics.gravity * world.farmBossEvent.elapsed * world.farmBossEvent.elapsed,
            );
            if (world.boss.z === 0) {
                world.boss.dropLanded = true;
                world.farmBossEvent.phase = 'fighting';
                world.farmBossEvent.elapsed = 0;
                world.combat('farm-boss-land', {
                    x: world.boss.x,
                    y: world.boss.y,
                    z: 0,
                });
            }
            return true;
        }
    }
    class FightingFarmBossEventPhase extends FarmBossEventPhase {
        update(world, dt) {
            world.farmBossEvent.elapsed += dt;
            if (world.advanceBossEncounter(dt)) {
                world.finishFarmBossEvent('victory');
                return true;
            }
            if (
                !world.reserveCounts.size &&
                !world.units.some((u) => hasFaction(u, FACTION_CONFIG.PLAYER) && u.hp > 0)
            ) {
                world.finishFarmBossEvent('defeat');
                return true;
            }
            return false;
        }
    }
    class CelebratingFarmBossEventPhase extends FarmBossEventPhase {
        update(world, dt) {
            world.farmBossEvent.elapsed += dt;
            const DURATION =
                world.farmBossEvent.outcome === 'defeat'
                    ? config.farm.bossEvent.celebrationSeconds
                    : config.farm.bossEvent.fadeSeconds;
            if (world.farmBossEvent.elapsed >= DURATION) {
                world.farmBossEvent.phase = 'fading';
                world.farmBossEvent.elapsed = 0;
            }
            return true;
        }
    }
    class FadingFarmBossEventPhase extends FarmBossEventPhase {
        update(world, dt) {
            world.farmBossEvent.elapsed += dt;
            if (world.farmBossEvent.elapsed >= config.farm.bossEvent.fadeSeconds) {
                world.farmBossEvent = {
                    phase: 'idle',
                    elapsed: 0,
                    outcome: 'idle',
                    encounterId: 0,
                    rewardStatus: 'none',
                    rewardChance: 0,
                    rewardRoll: 0,
                    rewardUnitId: 0,
                };
                world.replaceBosses([world.createBoss()]);
                world.bossEncounter = null;
                world.markProgressChanged();
                world.afterFloor();
            }
            return true;
        }
    }
    return Object.freeze({
        idle: Object.freeze(new FarmBossEventPhase()),
        marching: Object.freeze(new MarchingFarmBossEventPhase()),
        dropping: Object.freeze(new DroppingFarmBossEventPhase()),
        fighting: Object.freeze(new FightingFarmBossEventPhase()),
        celebrating: Object.freeze(new CelebratingFarmBossEventPhase()),
        fading: Object.freeze(new FadingFarmBossEventPhase()),
    });
}
