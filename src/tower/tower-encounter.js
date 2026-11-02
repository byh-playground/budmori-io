import { BOSS_SPECIES } from '../units/species-catalog.js';
import { TOWER_ELEMENT_ORDER, towerElement } from './tower-theme.js';

// Initial tuning, not a time limit. A floor owns one finite roster and one
// aggregate stat budget; adding actors divides that budget rather than copying it.
// Every boss but the crown enters at the start, spread on a ring (`spreadRatio` of the arena radii) so the army,
// arriving from every edge, meets different bosses at once instead of killing them one at a time. They leap out of
// the arena centre one after another (`launchStaggerSeconds` apart), each in an arc that peaks at `launchApex` (the
// height troops leave the tower door at) and lands on its own spot; the fight starts once every one has landed.
// The floor-100 crown waits until every other boss is down and leaps straight up and down at the centre.
export const TOWER_ENCOUNTER_SETTINGS = Object.freeze({
    bands: Object.freeze([
        Object.freeze({ through: 20, count: 1 }),
        Object.freeze({ through: 40, count: 2 }),
        Object.freeze({ through: 60, count: 3 }),
        Object.freeze({ through: 100, count: 4 }),
    ]),
    // The floor budget × this, by how many bosses open the fight (index = count - 1), shared evenly among them.
    // Bosses that fight at once and spread out hit fewer troops each than one boss the whole army crowds, so a
    // floor with more of them needs a larger total to stay as hard (tuned against the 0.67.12 fights).
    budgetByBossCount: Object.freeze([1, 1, 1.08, 1.5]),
    spreadRatio: 0.5,
    launchStaggerSeconds: 0.5,
    launchApex: 7,
    hpGainPerFloor: 0.018,
    attackGainPerFloor: 0.012,
    preparationFloors: 8,
    firstBattleScale: 0.55,
    summitSeconds: 8,
});

// One element per opening boss: the floor's own band element first, then the bands already climbed, newest first.
// Each boss keeps a single element, so a pair of bosses reads as "water and grass" rather than one boss that suddenly
// uses two. From floor 81 there are five bands but four bosses: the floor number drops one earlier band, so the
// line-up changes from floor to floor without any random state.
export function encounterElements(floor, count) {
    const BAND = TOWER_ELEMENT_ORDER.indexOf(towerElement(floor)),
        EARLIER = TOWER_ELEMENT_ORDER.slice(0, BAND).reverse();
    if (EARLIER.length >= count) {
        EARLIER.splice(floor % EARLIER.length, EARLIER.length - (count - 1));
    }
    return [towerElement(floor), ...EARLIER].slice(0, count);
}

export function createTowerEncounter(floor) {
    const COUNT = TOWER_ENCOUNTER_SETTINGS.bands.find((band) => floor <= band.through).count,
        SHARE = TOWER_ENCOUNTER_SETTINGS.budgetByBossCount[COUNT - 1] / COUNT,
        ROSTER = encounterElements(floor, COUNT).map((element) => ({
            species: BOSS_SPECIES,
            element,
            hpShare: floor === 100 ? 0.5 * SHARE : SHARE,
            attackShare: floor === 100 ? 0.56 * SHARE : SHARE,
            final: false,
        }));
    if (floor === 100) {
        // The crown is one more plain sprout with the same authored rig/patterns, in the top band's element.
        ROSTER.push({
            species: BOSS_SPECIES,
            element: towerElement(floor),
            hpShare: 0.5,
            attackShare: 0.44,
            final: true,
        });
    }
    return {
        roster: ROSTER,
        nextIndex: 0,
        elapsed: 0,
        clearedIds: [],
        floor,
        completed: false,
    };
}

// Where roster entry `index` of `count` opening bosses lands. One boss lands at the centre.
export function bossDropPoint(index, count, arena) {
    if (count <= 1) {
        return { x: 0, y: 0 };
    }
    const ANGLE = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return {
        x: Math.cos(ANGLE) * arena.radiusX * TOWER_ENCOUNTER_SETTINGS.spreadRatio,
        y: Math.sin(ANGLE) * arena.radiusY * TOWER_ENCOUNTER_SETTINGS.spreadRatio,
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
