// Canonical registered species metadata shared by the Farm and boss picker.
// Add future species here once their simulation, ability, and SVG assets ship.
export const SPECIES_CATALOG = Object.freeze([
    Object.freeze({
        id: 0,
        name: '콩',
        asset: 'pea.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#83ad47',
        limbOutline: '#4a1c16',
        bossWeight: 1,
    }),
    Object.freeze({
        id: 1,
        name: '옥수수',
        asset: 'corn-kernel.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#f7cd36',
        limbOutline: '#4a1c16',
        bossWeight: 1,
    }),
    Object.freeze({
        id: 2,
        name: '팥',
        asset: 'kidney-bean.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#d06a8f',
        limbOutline: '#4b1a20',
        bossWeight: 1,
    }),
    Object.freeze({
        id: 3,
        name: '밤톨',
        asset: 'chestnut.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#84472f',
        limbOutline: '#2c201c',
        bossWeight: 1,
    }),
    Object.freeze({
        id: 4,
        name: '땅콩',
        asset: 'peanut.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#c89d67',
        limbOutline: '#3b241e',
        bossWeight: 1,
    }),
    Object.freeze({
        id: 5,
        name: '호두',
        asset: 'walnut.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#a96c18',
        limbOutline: '#431811',
        // The weapon this species' boss holds: it goes wherever that floating hand goes.
        heldItem: Object.freeze({ part: 'hammer', hand: 'arm-right' }),
        bossWeight: 1,
    }),
    Object.freeze({
        id: 6,
        name: '쌀',
        asset: 'rice.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#f3efe4',
        limbOutline: '#4b211b',
        // The weapon this species' boss holds: it goes wherever that floating hand goes.
        heldItem: Object.freeze({ part: 'sickle', hand: 'arm-right' }),
        bossWeight: 1,
    }),
    Object.freeze({
        id: 7,
        name: '밀',
        asset: 'wheat.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#e4b247',
        limbOutline: '#34271f',
        // The weapon this species' boss holds: it goes wherever that floating hand goes.
        heldItem: Object.freeze({ part: 'command-baton', hand: 'arm-right' }),
        bossWeight: 1,
    }),
    Object.freeze({
        id: 8,
        name: '보리',
        asset: 'barley.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#ddaa43',
        limbOutline: '#4b211b',
        bossWeight: 1,
    }),
]);
export const SPECIES_COUNT = SPECIES_CATALOG.length;
export const BOSS_SPECIES_WEIGHTS = Object.freeze(SPECIES_CATALOG.map((species) => species.bossWeight));
export function speciesById(id) {
    return SPECIES_CATALOG.find((species) => species.id === id) || SPECIES_CATALOG[SPECIES_CATALOG.length - 1];
}
export function giantSpeciesName(id) {
    return `거대 ${speciesById(id).name}`;
}
export function speciesRewardName(id) {
    return `${speciesById(id).name} 종`;
}
