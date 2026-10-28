import { ELEMENTS } from '../model/lineage.js';
import { speciesById } from './species-catalog.js';
import { selectUnitExpression } from './species-face.js';

// UI and native meshes use the same named fills in the authored SVG. No face geometry is added.
const PALETTES = ELEMENTS.map((element) =>
    element.id === 0
        ? null
        : Object.freeze({
              'element-cheeks': Object.freeze(
                  [1, 3, 5].map((offset) => parseInt(element.color.slice(offset, offset + 2), 16) / 255),
              ),
          }),
);
const PORTRAITS = new Map();
const ROOTS = new Map();

export function elementPaintRegions(element) {
    return PALETTES[element] ?? null;
}

export function speciesPortraitSource(species, element = 0, temperament = -1) {
    const EXPRESSION = selectUnitExpression('neutral', temperament);
    if (!elementPaintRegions(element) && EXPRESSION === 'neutral') {
        return './assets/troops/' + speciesById(species).asset;
    }
    const KEY = species + ':' + element + ':' + EXPRESSION;
    if (!PORTRAITS.has(KEY)) {
        if (!ROOTS.has(species)) {
            const SOURCE = globalThis.BudmoriVectorResources.sources[species];
            ROOTS.set(species, new DOMParser().parseFromString(SOURCE, 'image/svg+xml').documentElement);
        }
        const SVG = elementPaintRegions(element)
            ? globalThis.BloomGamekitVectorAssets.applySvgPaintRegions(ROOTS.get(species), elementPaintRegions(element))
            : ROOTS.get(species).cloneNode(true);
        if (EXPRESSION !== 'neutral') {
            const METADATA = JSON.parse(SVG.getElementsByTagName('metadata')[0].textContent),
                SELECTION = METADATA.expressions[EXPRESSION];
            if (!SELECTION) {
                throw new TypeError('Missing authored portrait expression: ' + EXPRESSION);
            }
            for (const NODE of SVG.getElementsByTagName('*')) {
                const ID = NODE.getAttribute('id');
                if (SELECTION.hide.includes(ID)) {
                    NODE.setAttribute('display', 'none');
                }
                if (SELECTION.show.includes(ID)) {
                    NODE.removeAttribute('display');
                }
            }
        }
        PORTRAITS.set(
            KEY,
            'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(SVG)),
        );
    }
    return PORTRAITS.get(KEY);
}
