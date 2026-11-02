import { BOSS_SPECIES } from '../units/species-catalog.js';
import { TOWER_ELEMENT_ORDER, towerElement } from './tower-theme.js';

// Initial tuning, not a time limit. A floor owns one boss (floor 100: one guardian, then the crown once it is down):
// the army gangs up on that one boss. Its difficulty grows through its summon band instead of more bosses: higher
// floors call more minions at once (`minionCap`, also bounded by the army's size, see towerMinionCap), from more kinds
// and from the start of the fight, carrying the elements of the bands already climbed (encounterElements). Each
// minion's own strength stays a fixed share of the boss (summon.mouth-t1 minion). The boss leaps out of the arena
// centre in an arc that peaks at `launchApex` (the height troops leave the tower door at) and lands at the centre; the
// fight starts with the leap while the army is sent in. The floor-100 crown leaps straight up and down at the centre.
export const TOWER_ENCOUNTER_SETTINGS = Object.freeze({
    summonBands: Object.freeze([
        Object.freeze({ through: 20, minionCap: 2, kinds: Object.freeze(['caster']), summonFrom: 0.75, cooldown: 10 }),
        Object.freeze({
            through: 40,
            minionCap: 3,
            kinds: Object.freeze(['caster', 'ranged']),
            summonFrom: 1,
            cooldown: 10,
        }),
        Object.freeze({
            through: 60,
            minionCap: 4,
            kinds: Object.freeze(['caster', 'ranged', 'bomber']),
            summonFrom: 1,
            cooldown: 9,
        }),
        Object.freeze({
            through: 100,
            minionCap: 6,
            kinds: Object.freeze(['caster', 'ranged', 'bomber']),
            summonFrom: 1,
            cooldown: 8,
        }),
    ]),
    // A small army meets fewer minions: one more minion may be alive per this many living troops (at least one).
    troopsPerMinion: 25,
    launchApex: 7,
    hpGainPerFloor: 0.018,
    attackGainPerFloor: 0.012,
    preparationFloors: 8,
    firstBattleScale: 0.55,
    summitSeconds: 8,
});
// The most minions any band allows alive at once (the battle actor capacity reserves this many).
export const MAX_TOWER_MINIONS = Math.max(...TOWER_ENCOUNTER_SETTINGS.summonBands.map((band) => band.minionCap));

// The summon band of a floor (the farm boss, outside the tower, uses the first one).
export function towerSummonBand(floor) {
    const BANDS = TOWER_ENCOUNTER_SETTINGS.summonBands;
    return BANDS.find((band) => floor <= band.through) ?? BANDS.at(-1);
}
// Minions alive at once: the floor band's cap, bounded by the army still standing.
export function towerMinionCap(floor, livingTroops) {
    return Math.min(
        towerSummonBand(floor).minionCap,
        Math.max(1, Math.floor(livingTroops / TOWER_ENCOUNTER_SETTINGS.troopsPerMinion)),
    );
}
// The elements a floor's minions draw from: the boss's band first, then one more earlier band per summon band
// climbed (21-40: two, 41-60: three, 61-100: four).
export function minionElements(floor) {
    return encounterElements(floor, TOWER_ENCOUNTER_SETTINGS.summonBands.indexOf(towerSummonBand(floor)) + 1);
}

// `count` elements: the floor's own band element first, then the bands already climbed, newest first. From floor 81
// there are five bands but four minion elements: the floor number drops one earlier band, so the line-up changes from
// floor to floor without any random state.
export function encounterElements(floor, count) {
    const BAND = TOWER_ELEMENT_ORDER.indexOf(towerElement(floor)),
        EARLIER = TOWER_ELEMENT_ORDER.slice(0, BAND).reverse();
    if (EARLIER.length >= count) {
        EARLIER.splice(floor % EARLIER.length, EARLIER.length - (count - 1));
    }
    return [towerElement(floor), ...EARLIER].slice(0, count);
}

export function createTowerEncounter(floor) {
    const ROSTER = [{ species: BOSS_SPECIES, element: towerElement(floor), final: false }];
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
