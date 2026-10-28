import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import * as VECTORS from '../vendor/upstream/vector-assets.js';
import { speciesById, SPECIES_COUNT } from '../src/units/species-catalog.js';
import { idleUnitExpressions, selectUnitExpression } from '../src/units/species-face.js';
import { speciesPortraitSource } from '../src/units/species-paint.js';

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
const EXPRESSIONS = ['neutral', 'focused', 'attack', 'surprised', 'happy'];
assert.deepEqual(
    idleUnitExpressions().sort(),
    ['neutral', 'hungry', ...EXPRESSIONS].filter((value, index, array) => array.indexOf(value) === index).sort(),
);
for (let species = 0; species < SPECIES_COUNT; species++) {
    const SOURCE = new DOMParser().parseFromString(SOURCES[species], 'image/svg+xml').documentElement,
        ORIGINAL = new XMLSerializer().serializeToString(SOURCE),
        METADATA = JSON.parse(SOURCE.getElementsByTagName('metadata')[0].textContent);
    const IDS = new Set([...SOURCE.getElementsByTagName('*')].map((node) => node.getAttribute('id'))),
        PARTS = new Set(METADATA.parts.map((part) => part.id));
    if (speciesById(species).asset === 'barley.svg') {
        const NODES = [...SOURCE.getElementsByTagName('*')];
        for (const SIDE of ['left', 'right']) {
            const EYE = NODES.find((node) => node.getAttribute('id') === 'barley-hungry-eye-' + SIDE),
                GLINT = NODES.find((node) => node.getAttribute('id') === 'barley-hungry-glint-' + SIDE);
            assert.ok(
                Math.hypot(
                    Number(EYE.getAttribute('cx')) - Number(GLINT.getAttribute('cx')),
                    Number(EYE.getAttribute('cy')) - Number(GLINT.getAttribute('cy')),
                ) +
                    Number(GLINT.getAttribute('r')) <=
                    Number(EYE.getAttribute('r')),
                'Barley hungry highlight stays inside its authored eye',
            );
        }
    }
    for (const PART of METADATA.parts) {
        assert.ok(IDS.has(PART.id), 'Metadata part exists in authored SVG');
        assert.ok(PART.parent === null || PARTS.has(PART.parent), 'Part parent exists');
    }
    for (const SELECTION of Object.values(METADATA.expressions)) {
        for (const ID of [...SELECTION.show, ...SELECTION.hide]) {
            assert.ok(PARTS.has(ID), 'Expression targets declared parts');
        }
    }
    for (const CLIP of Object.values(METADATA.clips)) {
        for (const KEYFRAME of CLIP.keyframes) {
            for (const ID of Object.keys(KEYFRAME.parts)) {
                assert.ok(PARTS.has(ID), 'Clip targets a current authored part');
            }
        }
    }
    for (let temperament = 0; temperament < 5; temperament++) {
        const EXPRESSION = selectUnitExpression('neutral', temperament);
        assert.equal(EXPRESSION, EXPRESSIONS[temperament]);
        assert.ok(METADATA.expressions[EXPRESSION], 'All ten species author the selected face');
        const URI = speciesPortraitSource(species, 1, temperament),
            PORTRAIT = new DOMParser().parseFromString(
                decodeURIComponent(URI.split(',').slice(1).join(',')),
                'image/svg+xml',
            ).documentElement,
            NODES = [...PORTRAIT.getElementsByTagName('*')],
            FACE_GROUPS = NODES.filter((node) => node.tagName === 'g' && /^face-/.test(node.getAttribute('id')));
        assert.equal(NODES.length, SOURCE.getElementsByTagName('*').length, 'No extra face geometry');
        assert.deepEqual(
            FACE_GROUPS.filter((node) => node.getAttribute('display') !== 'none').map((node) =>
                node.getAttribute('id'),
            ),
            METADATA.expressions[EXPRESSION].show.filter((id) => /^face-/.test(id)),
            'Exactly the authored selected face',
        );
        assert.equal(speciesPortraitSource(species, 1, temperament), URI, 'Finite portrait cache');
        for (const STATE of ['focused', 'attack', 'hurt', 'hungry', 'sleep', 'dead', 'happy', 'guard']) {
            assert.equal(
                selectUnitExpression(STATE, temperament),
                STATE,
                'State/guard faces take priority over temperament',
            );
        }
    }
    assert.equal(new XMLSerializer().serializeToString(SOURCE), ORIGINAL, 'SVG source remains immutable');
}
for (const FILE of ['src/render/farm-render-units.js', 'src/ui/codex-dialog.js']) {
    assert.doesNotMatch(
        fs.readFileSync(new URL('../' + FILE, import.meta.url), 'utf8'),
        /drawFaceMarks|faceOverlaySvg/,
        'No extra brow overlay submission',
    );
}
console.log(
    'Authored body + one face composition passed: 10 species x 5 temperaments; state priority/palette/cache preserved',
);
