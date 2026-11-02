import { BOSS_SPECIES } from '../units/species-catalog.js';
import { TOWER_ELEMENT_ORDER, towerElement } from './tower-theme.js';

// Initial tuning, not a time limit. A floor owns one finite roster; every boss on it gets the floor's whole stat
// budget (encounterBudget), so a floor with more bosses is that much harder rather than the same fight split up.
// Every boss but the crown enters at the start and lands next to the others as one pack (`packSpacing`: centre to
// centre in boss radii, so bodies do not overlap). In the fight they keep together (bossPackTarget: each takes its
// nearest ally within `packLeash` radii of the pack centre) and never stand inside each other (separateBossPack), so the army
// meets all of them at once instead of killing them one at a time. They leap out of
// the arena centre one after another (`launchStaggerSeconds` apart), each in an arc that peaks at `launchApex` (the
// height troops leave the tower door at) and lands on its own spot. The fight
// does not wait for them: it starts with the first leap while the army is sent in.
// The floor-100 crown waits until every other boss is down and leaps straight up and down at the centre.
export const TOWER_ENCOUNTER_SETTINGS = Object.freeze({
    bands: Object.freeze([
        Object.freeze({ through: 20, count: 1 }),
        Object.freeze({ through: 40, count: 2 }),
        Object.freeze({ through: 60, count: 3 }),
        Object.freeze({ through: 100, count: 4 }),
    ]),
    packSpacing: 2.2,
    // A boss of the pack picks its own nearest ally only within this many boss radii of the pack centre.
    packLeash: 3,
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
        ROSTER = encounterElements(floor, COUNT).map((element) => ({ species: BOSS_SPECIES, element, final: false }));
    if (floor === 100) {
        // The crown is one more plain sprout with the same authored rig/patterns, in the top band's element.
        ROSTER.push({ species: BOSS_SPECIES, element: towerElement(floor), final: true });
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

// Where roster entry `index` of `count` opening bosses lands: around the centre on the smallest ring that keeps
// neighbours `packSpacing` radii apart. One boss lands at the centre.
export function bossDropPoint(index, count, radius) {
    if (count <= 1) {
        return { x: 0, y: 0 };
    }
    const ANGLE = -Math.PI / 2 + (index * Math.PI * 2) / count,
        RING = (TOWER_ENCOUNTER_SETTINGS.packSpacing * radius) / (2 * Math.sin(Math.PI / count));
    return { x: Math.cos(ANGLE) * RING, y: Math.sin(ANGLE) * RING };
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
