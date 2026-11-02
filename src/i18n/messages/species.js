import { LOCALE } from '../locale.js';
import { speciesById } from '../../units/species-catalog.js';

// Presentation names of a species (src/units/species-catalog.js keeps them as TextPairs).
const GIANT = { ko: ({ name }) => `거대 ${name}`, en: ({ name }) => `Giant ${name}` };

export function speciesName(id) {
    return LOCALE.text(speciesById(id).name);
}
// A boss is a giant of its species: "거대 콩" / "Giant Pea".
export function giantSpeciesName(id) {
    return LOCALE.text(GIANT, { name: speciesName(id) });
}
export function speciesDescription(id) {
    return LOCALE.text(speciesById(id).description);
}
