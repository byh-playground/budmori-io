import { BOSS_SPECIES } from '../units/species-catalog.js';

// Initial tuning, not a time limit. A floor owns one finite roster and one
// aggregate stat budget; adding actors divides that budget rather than copying it.
export const TOWER_ENCOUNTER_SETTINGS = Object.freeze({
    bands: Object.freeze([
        Object.freeze({ through: 20, count: 1 }),
        Object.freeze({ through: 45, count: 2 }),
        Object.freeze({ through: 75, count: 3 }),
        Object.freeze({ through: 100, count: 4 }),
    ]),
    reinforcementSeconds: 12,
    hpGainPerFloor: 0.018,
    attackGainPerFloor: 0.012,
    preparationFloors: 8,
    firstBattleScale: 0.55,
    summitSeconds: 8,
});

export function createTowerEncounter(floor) {
    const COUNT = TOWER_ENCOUNTER_SETTINGS.bands.find((band) => floor <= band.through).count,
        ROSTER = Array.from({ length: COUNT }, () => ({
            species: BOSS_SPECIES,
            hpShare: floor === 100 ? 0.5 / COUNT : 1 / COUNT,
            attackShare: floor === 100 ? 0.56 / COUNT : 1 / COUNT,
            final: false,
        }));
    if (floor === 100) {
        // The crown is one more plain sprout with the same authored rig/patterns.
        ROSTER.push({ species: BOSS_SPECIES, hpShare: 0.5, attackShare: 0.44, final: true });
    }
    return {
        roster: ROSTER,
        nextIndex: 0,
        elapsed: 0,
        nextJoinAt: 0,
        clearedIds: [],
        floor,
        completed: false,
    };
}

export function encounterBudget(floor, startFloor) {
    const PREPARATION = Math.min(1, Math.max(0, floor - startFloor) / TOWER_ENCOUNTER_SETTINGS.preparationFloors),
        SCALE =
            floor === 1
                ? 1
                : TOWER_ENCOUNTER_SETTINGS.firstBattleScale +
                  (1 - TOWER_ENCOUNTER_SETTINGS.firstBattleScale) * PREPARATION;
    return {
        hp: (1 + TOWER_ENCOUNTER_SETTINGS.hpGainPerFloor * (floor - 1)) * SCALE,
        attack: (1 + TOWER_ENCOUNTER_SETTINGS.attackGainPerFloor * (floor - 1)) * SCALE,
    };
}
