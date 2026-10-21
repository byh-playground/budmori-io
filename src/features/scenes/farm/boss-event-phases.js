import { FACTION_CONFIG, hasFaction } from '../../../factions.js';

// Phase objects execute the existing event record. No parallel phase/timer is
// kept here: save restoration and reset select behavior from that same record.
export function createFarmBossEventPhases(config) {
    class FarmBossEventPhase {
        update(_world, _dt) {
            return false;
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
            if (world.boss.hp <= 0) {
                world.finishFarmBossEvent('victory');
                return true;
            }
            if (!world.handCounts.size && !world.units.some((u) => hasFaction(u, FACTION_CONFIG.PLAYER) && u.hp > 0)) {
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
                world.boss = world.createBoss();
                world.markProgressChanged();
            }
            return true;
        }
    }
    return Object.freeze({
        idle: Object.freeze(new FarmBossEventPhase()),
        dropping: Object.freeze(new DroppingFarmBossEventPhase()),
        fighting: Object.freeze(new FightingFarmBossEventPhase()),
        celebrating: Object.freeze(new CelebratingFarmBossEventPhase()),
        fading: Object.freeze(new FadingFarmBossEventPhase()),
    });
}
