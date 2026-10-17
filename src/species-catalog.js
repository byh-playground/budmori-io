// Canonical registered species metadata shared by the Farm and boss picker.
// Add future species here once their simulation, ability, and SVG assets ship.
export const SPECIES_CATALOG = Object.freeze([
  Object.freeze({id:0,name:'콩',asset:'pea.svg',bossWeight:1}),
  Object.freeze({id:1,name:'옥수수',asset:'corn-kernel.svg',bossWeight:1}),
  Object.freeze({id:2,name:'강낭콩',asset:'kidney-bean.svg',bossWeight:1}),
  Object.freeze({id:3,name:'밤톨',asset:'chestnut.svg',bossWeight:1}),
  Object.freeze({id:4,name:'땅콩',asset:'peanut.svg',bossWeight:1}),
  Object.freeze({id:5,name:'호두',asset:'walnut.svg',bossWeight:1})
]);
export const SPECIES_COUNT = SPECIES_CATALOG.length;
export const BOSS_SPECIES_WEIGHTS = Object.freeze(SPECIES_CATALOG.map(species=>species.bossWeight));
export function speciesById(id){return SPECIES_CATALOG.find(species=>species.id===id)||SPECIES_CATALOG[SPECIES_CATALOG.length-1]}
