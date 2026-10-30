// Canonical registered species metadata shared by the Farm and boss picker.
// Add future species here once their simulation, ability, and SVG assets ship.
export const SPECIES_CATALOG = Object.freeze([
    Object.freeze({
        id: 0,
        name: '콩',
        description: '적에게 다가가 박치기로 싸우는 병사예요.',
        asset: 'pea.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#83ad47',
        limbOutline: '#4a1c16',
    }),
    Object.freeze({
        id: 1,
        name: '옥수수',
        description: '옥수수 알을 붙여 폭발시키는 원거리 병사예요.',
        asset: 'corn-kernel.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#f7cd36',
        limbOutline: '#4a1c16',
    }),
    Object.freeze({
        id: 2,
        name: '팥',
        description: '적에게 도약해 착지 충격으로 공격하는 병사예요.',
        asset: 'kidney-bean.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#d06a8f',
        limbOutline: '#4b1a20',
    }),
    Object.freeze({
        id: 3,
        name: '밤톨',
        description: '가시를 날려 멀리 있는 적을 공격하는 병사예요.',
        asset: 'chestnut.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#84472f',
        limbOutline: '#2c201c',
    }),
    Object.freeze({
        id: 4,
        name: '땅콩',
        description: '양쪽에서 협공하고 쓰러지면 분열체를 남기는 병사예요.',
        asset: 'peanut.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#c89d67',
        limbOutline: '#3b241e',
    }),
    Object.freeze({
        id: 5,
        name: '호두',
        description: '단단한 몸으로 버티며 망치를 휘두르는 병사예요.',
        asset: 'walnut.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#a96c18',
        limbOutline: '#431811',
        // The weapon this species' boss holds: it goes wherever that floating hand goes.
        heldItem: Object.freeze({ part: 'hammer', hand: 'arm-right' }),
    }),
    Object.freeze({
        id: 6,
        name: '쌀',
        description: '낫을 휘둘러 가까운 적을 베는 병사예요.',
        asset: 'rice.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#f3efe4',
        limbOutline: '#4b211b',
        // The weapon this species' boss holds: it goes wherever that floating hand goes.
        heldItem: Object.freeze({ part: 'sickle', hand: 'arm-right' }),
    }),
    Object.freeze({
        id: 7,
        name: '밀',
        description: '지휘봉으로 싸우고 주변 아군의 공격을 돕는 병사예요.',
        asset: 'wheat.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#e4b247',
        limbOutline: '#34271f',
        // The weapon this species' boss holds: it goes wherever that floating hand goes.
        heldItem: Object.freeze({ part: 'command-baton', hand: 'arm-right' }),
    }),
    Object.freeze({
        id: 8,
        name: '보리',
        description: '도리깨로 공격하며 적의 방어를 약하게 만드는 병사예요.',
        asset: 'barley.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#ddaa43',
        limbOutline: '#4b211b',
    }),
    // A plain sprout: no ability of its own, so it plays by the shared rules alone. Every boss is this species.
    Object.freeze({
        id: 9,
        name: '새싹',
        description: '성장이 끝난 새싹 병사예요. 기본 공격으로 함께 싸워요.',
        asset: 'sprout.svg',
        limbFill: '#d9bd8a',
        limbOutline: '#2c201c',
    }),
]);
export const SPECIES_COUNT = SPECIES_CATALOG.length;
// The plain sprout is a unit of its own: no ability, the shared rules alone. Every boss is one; the species a win
// pays is drawn separately.
export const SPROUT_SPECIES = 9;
export const BOSS_SPECIES = SPROUT_SPECIES;
// What a unit is in play: its art, body, attack and stats. A growing seed is the plain sprout in all of them; its
// eventual species stays in `unit.species` for the lineage, the codex and what it grows into.
export function kitSpecies(unit) {
    return unit?.seedling || unit?.isSeedling ? SPROUT_SPECIES : unit?.species;
}
export function speciesById(id) {
    return SPECIES_CATALOG.find((species) => species.id === id) || SPECIES_CATALOG[SPECIES_CATALOG.length - 1];
}
export function giantSpeciesName(id) {
    return `거대 ${speciesById(id).name}`;
}
