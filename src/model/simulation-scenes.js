import { FarmSimulationScene } from '../features/scenes/farm/model.js';
import { createFarmBossEventPhases } from '../features/scenes/farm/boss-event-phases.js';
import { CONFIG, STATS } from './farm-config.js';
import { CREATE_UNIT_ATTACK_CYCLE } from '../units/attack-cycle.js';
import { FARM_MODES } from './farm-mode-behaviors.js';

function createSimulationScenes(dependencies) {
    const {
        config: CONFIG,
        stats: STATS,
        createUnitAttackCycle: CREATE_UNIT_ATTACK_CYCLE,
        farmModes: FARM_MODES,
        bossEventPhases: BOSS_EVENT_PHASES,
    } = dependencies;
    const DEPENDENCIES = Object.freeze({ CONFIG, STATS, CREATE_UNIT_ATTACK_CYCLE, FARM_MODES, BOSS_EVENT_PHASES });
    return Object.freeze(
        Object.fromEntries(
            [new FarmSimulationScene(DEPENDENCIES)].map((scene) => [scene.feature.id, Object.freeze(scene)]),
        ),
    );
}

export const SIMULATION_SCENES = createSimulationScenes({
    config: CONFIG,
    stats: STATS,
    createUnitAttackCycle: CREATE_UNIT_ATTACK_CYCLE,
    farmModes: FARM_MODES,
    bossEventPhases: createFarmBossEventPhases(CONFIG),
});
