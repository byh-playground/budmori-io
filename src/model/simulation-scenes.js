import { FarmSimulationScene } from '../features/scenes/farm/model.js';

export function createSimulationScenes(dependencies) {
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
