import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import * as VECTORS from '../vendor/upstream/vector-assets.js';
import { speciesById, SPECIES_COUNT } from '../src/units/species-catalog.js';
import { elementPaintRegions, speciesPortraitSource } from '../src/units/species-paint.js';

globalThis.DOMParser = DOMParser;
globalThis.XMLSerializer = XMLSerializer;
globalThis.BloomGamekitVectorAssets = VECTORS;
const SOURCES = Object.fromEntries(
    Array.from({ length: SPECIES_COUNT }, (_, species) => [
        species,
        fs.readFileSync(new URL('../assets/troops/' + speciesById(species).asset, import.meta.url), 'utf8'),
    ]),
);
globalThis.BudmoriVectorResources = { sources: SOURCES };
const SERIALIZER = new XMLSerializer();
let regions = 0;
for (let species = 0; species < SPECIES_COUNT; species++) {
    const ROOT = new DOMParser().parseFromString(SOURCES[species], 'image/svg+xml').documentElement,
        ORIGINAL = SERIALIZER.serializeToString(ROOT),
        SHAPES = [...ROOT.getElementsByTagName('*')],
        NAMED = SHAPES.filter((node) => node.getAttribute('data-paint-region') === 'element-cheeks');
    assert.ok(NAMED.length >= 2, 'Each species names its original cheek fills');
    regions += NAMED.length;
    for (let element = 1; element <= 5; element++) {
        const URI = speciesPortraitSource(species, element),
            COLOURED = new DOMParser().parseFromString(
                decodeURIComponent(URI.split(',').slice(1).join(',')),
                'image/svg+xml',
            ).documentElement,
            COPY = [...COLOURED.getElementsByTagName('*')];
        assert.equal(COPY.length, SHAPES.length, 'No duplicate face geometry');
        assert.equal(speciesPortraitSource(species, element), URI, 'Finite UI palette cache');
        COPY.forEach((node, index) => {
            if (node.getAttribute('data-paint-region') === 'element-cheeks') {
                assert.notEqual(node.getAttribute('fill'), SHAPES[index].getAttribute('fill'));
                node.setAttribute('fill', SHAPES[index].getAttribute('fill'));
            }
        });
        assert.equal(
            SERIALIZER.serializeToString(COLOURED),
            ORIGINAL,
            'Only named fill changes; alpha/strokes/expressions/weapons survive',
        );
        assert.equal(SERIALIZER.serializeToString(ROOT), ORIGINAL, 'Reusable original is unchanged');
        assert.ok(elementPaintRegions(element)['element-cheeks'].every(Number.isFinite));
    }
}
assert.equal(elementPaintRegions(0), null);
assert.equal(regions, 66);
console.log(
    JSON.stringify({
        status: 'PASS',
        species: SPECIES_COUNT,
        palettes: 50,
        namedFills: regions,
        onlyNamedFillChanges: true,
        duplicateCheekGeometry: false,
    }),
);
