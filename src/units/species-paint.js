import { ELEMENTS } from '../model/lineage.js';
import { speciesById } from './species-catalog.js';

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

export function speciesPortraitSource(species, element = 0) {
    if (!elementPaintRegions(element)) {
        return './assets/troops/' + speciesById(species).asset;
    }
    const KEY = species + ':' + element;
    if (!PORTRAITS.has(KEY)) {
        if (!ROOTS.has(species)) {
            const SOURCE = globalThis.BudmoriVectorResources.sources[species];
            ROOTS.set(species, new DOMParser().parseFromString(SOURCE, 'image/svg+xml').documentElement);
        }
        const SVG = globalThis.BloomGamekitVectorAssets.applySvgPaintRegions(
            ROOTS.get(species),
            elementPaintRegions(element),
        );
        PORTRAITS.set(
            KEY,
            'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(SVG)),
        );
    }
    return PORTRAITS.get(KEY);
}
