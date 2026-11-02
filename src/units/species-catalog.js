// Canonical registered species metadata shared by the Farm and boss picker.
// Add future species here once their simulation, ability, and SVG assets ship.
export const SPECIES_CATALOG = Object.freeze([
    Object.freeze({
        id: 0,
        name: { ko: '콩', en: 'Pea' },
        description: { ko: '적에게 다가가 박치기로 싸우는 병사예요.', en: 'Charges in and fights with headbutts.' },
        asset: 'pea.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#83ad47',
        limbOutline: '#4a1c16',
    }),
    Object.freeze({
        id: 1,
        name: { ko: '옥수수', en: 'Corn' },
        description: {
            ko: '옥수수 알을 붙여 폭발시키는 원거리 병사예요.',
            en: 'Ranged fighter that sticks kernels on foes and blows them up.',
        },
        asset: 'corn-kernel.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#f7cd36',
        limbOutline: '#4a1c16',
    }),
    Object.freeze({
        id: 2,
        name: { ko: '팥', en: 'Red Bean' },
        description: {
            ko: '적에게 도약해 착지 충격으로 공격하는 병사예요.',
            en: 'Leaps at foes and strikes with the landing impact.',
        },
        asset: 'kidney-bean.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#d06a8f',
        limbOutline: '#4b1a20',
    }),
    Object.freeze({
        id: 3,
        name: { ko: '밤톨', en: 'Chestnut' },
        description: { ko: '가시를 날려 멀리 있는 적을 공격하는 병사예요.', en: 'Shoots thorns at distant foes.' },
        asset: 'chestnut.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#84472f',
        limbOutline: '#2c201c',
    }),
    Object.freeze({
        id: 4,
        name: { ko: '땅콩', en: 'Peanut' },
        description: {
            ko: '양쪽에서 협공하고 쓰러지면 분열체를 남기는 병사예요.',
            en: 'Attacks from both sides and splits in two when it falls.',
        },
        asset: 'peanut.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#c89d67',
        limbOutline: '#3b241e',
    }),
    Object.freeze({
        id: 5,
        name: { ko: '호두', en: 'Walnut' },
        description: {
            ko: '단단한 몸으로 버티며 망치를 휘두르는 병사예요.',
            en: 'Holds the line with a tough shell and swings a hammer.',
        },
        asset: 'walnut.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#a96c18',
        limbOutline: '#431811',
        // The weapon this species' boss holds: it goes wherever that floating hand goes.
        heldItem: Object.freeze({ part: 'hammer', hand: 'arm-right' }),
    }),
    Object.freeze({
        id: 6,
        name: { ko: '쌀', en: 'Rice' },
        description: { ko: '낫을 휘둘러 가까운 적을 베는 병사예요.', en: 'Swings a sickle to cut down nearby foes.' },
        asset: 'rice.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#f3efe4',
        limbOutline: '#4b211b',
        // The weapon this species' boss holds: it goes wherever that floating hand goes.
        heldItem: Object.freeze({ part: 'sickle', hand: 'arm-right' }),
    }),
    Object.freeze({
        id: 7,
        name: { ko: '밀', en: 'Wheat' },
        description: {
            ko: '지휘봉으로 싸우고 주변 아군의 공격을 돕는 병사예요.',
            en: 'Fights with a baton and boosts nearby allies’ attacks.',
        },
        asset: 'wheat.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#e4b247',
        limbOutline: '#34271f',
        // The weapon this species' boss holds: it goes wherever that floating hand goes.
        heldItem: Object.freeze({ part: 'command-baton', hand: 'arm-right' }),
    }),
    Object.freeze({
        id: 8,
        name: { ko: '보리', en: 'Barley' },
        description: {
            ko: '도리깨로 공격하며 적의 방어를 약하게 만드는 병사예요.',
            en: 'Strikes with a flail and weakens enemy defense.',
        },
        asset: 'barley.svg',
        // The colours of the floating hands a boss of this species swings: fill and outline.
        limbFill: '#ddaa43',
        limbOutline: '#4b211b',
    }),
]);
export const SPECIES_COUNT = SPECIES_CATALOG.length;
// The plain sprout is not a species: it is never bred, collected or counted. It is the unit a seed fights as and every
// boss is, with no ability of its own and the shared rules alone. Its id sits just after the last species, so the art,
// body and stat tables that index by id still reach it.
export const SPROUT_SPECIES = SPECIES_COUNT;
export const SPROUT = Object.freeze({
    id: SPROUT_SPECIES,
    name: { ko: '새싹', en: 'Sprout' },
    asset: 'sprout.svg',
    limbFill: '#d9bd8a',
    limbOutline: '#2c201c',
});
export const BOSS_SPECIES = SPROUT_SPECIES;
// What a unit is in play: its art, body, attack and stats. A growing seed is the plain sprout in all of them; its
// eventual species stays in `unit.species` for the lineage, the codex and what it grows into.
export function kitSpecies(unit) {
    return unit?.seedling || unit?.isSeedling ? SPROUT_SPECIES : unit?.species;
}
export function speciesById(id) {
    if (id === SPROUT_SPECIES) {
        return SPROUT;
    }
    return SPECIES_CATALOG.find((species) => species.id === id) || SPECIES_CATALOG[SPECIES_CATALOG.length - 1];
}
