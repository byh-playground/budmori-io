import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { speciesById, SPECIES_COUNT } from '../src/units/species-catalog.js';
import { FACE_IDS, STATE_FACES, TEMPERAMENT_FACES, buildFace } from '../src/units/face-layer.js';
import { elementCheekColor, unitLook } from '../src/units/species-face.js';
import { speciesPortraitSource } from '../src/units/species-paint.js';
import { TEMPERAMENTS } from '../src/model/lineage.js';

globalThis.DOMParser = DOMParser;
globalThis.XMLSerializer = XMLSerializer;
const SOURCES = Object.fromEntries(
    Array.from({ length: SPECIES_COUNT }, (_, species) => [
        species,
        fs.readFileSync(new URL('../assets/troops/' + speciesById(species).asset, import.meta.url), 'utf8'),
    ]),
);
globalThis.BudmoriVectorResources = { sources: SOURCES };

// Bodies carry no face art: three anchor sockets are the only face resource of a species.
for (let species = 0; species < SPECIES_COUNT; species++) {
    const SOURCE = new DOMParser().parseFromString(SOURCES[species], 'image/svg+xml').documentElement,
        METADATA = JSON.parse(SOURCE.getElementsByTagName('metadata')[0].textContent),
        IDS = new Set([...SOURCE.getElementsByTagName('*')].map((node) => node.getAttribute('id'))),
        PARTS = new Set(METADATA.parts.map((part) => part.id)),
        [VIEW_X, VIEW_Y, VIEW_W, VIEW_H] = SOURCE.getAttribute('viewBox').split(/\s+/).map(Number);
    assert.ok(
        ![...IDS, ...PARTS].some((id) => /^face-(neutral|happy|focused|attack|surprised|hurt|hungry|dead)$/.test(id)),
        'No authored face art in the body',
    );
    assert.ok(PARTS.size <= 16, 'Body parts stay within the vector pose limit');
    for (const PART of METADATA.parts) {
        assert.ok(IDS.has(PART.id), 'Metadata part exists in authored SVG');
        assert.ok(PART.parent === null || PARTS.has(PART.parent), 'Part parent exists');
    }
    for (const [NAME, SELECTION] of Object.entries(METADATA.expressions)) {
        assert.ok(['neutral', 'guard'].includes(NAME), 'Body expressions are body variants only: ' + NAME);
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
    const SOCKETS = ['face-eye-left', 'face-eye-right', 'face-mouth'].map((name) => {
        const SOCKET = METADATA.sockets[name];
        assert.equal(SOCKET?.part, 'body', name + ' belongs to body');
        const [X, Y] = SOCKET.point;
        assert.ok(X >= VIEW_X && X <= VIEW_X + VIEW_W && Y >= VIEW_Y && Y <= VIEW_Y + VIEW_H, name + ' is in canvas');
        return SOCKET.point;
    });
    assert.ok(SOCKETS[0][0] < SOCKETS[1][0], 'Left eye lies left of the right eye');
    assert.ok(SOCKETS[2][1] > SOCKETS[0][1], 'Mouth lies below the eyes');
    assert.equal(METADATA.sockets.mouth.part, 'body', 'Attack mouth socket follows the body');

    // One rule builds every face for every species; all of them are finite, drawn on the body and distinct.
    const ANCHOR = { eyeLeft: SOCKETS[0], eyeRight: SOCKETS[1], mouth: SOCKETS[2] },
        GAP = SOCKETS[1][0] - SOCKETS[0][0],
        SEEN = new Set();
    for (const FACE of FACE_IDS) {
        const OPS = buildFace(FACE, ANCHOR, null);
        assert.ok(OPS.length >= 3, FACE + ' has parts');
        for (const OP of OPS) {
            assert.ok(OP.fill || OP.stroke, 'Every operation has a colour');
            for (const [, ...NUMBERS] of OP.path) {
                assert.ok(NUMBERS.every(Number.isFinite), FACE + ' coordinates are finite');
                for (let index = 0; index < NUMBERS.length; index += 2) {
                    assert.ok(
                        Math.abs(NUMBERS[index] - SOCKETS[0][0] - GAP / 2) < GAP * 1.5 &&
                            Math.abs(NUMBERS[index + 1] - SOCKETS[0][1]) < GAP * 1.2,
                        FACE + ' stays on the face of ' + SOURCE.getAttribute('id'),
                    );
                }
            }
        }
        SEEN.add(JSON.stringify(OPS));
    }
    assert.equal(SEEN.size, FACE_IDS.length, 'All faces differ in every species');
    assert.notDeepEqual(buildFace('neutral', ANCHOR, null), buildFace('neutral', ANCHOR, '#4a9de0'), 'Cheek colour');
}

// State faces take priority over temperament; temperament only shows while nothing else happens.
assert.equal(TEMPERAMENT_FACES.length, TEMPERAMENTS.length);
for (let temperament = 0; temperament < TEMPERAMENTS.length; temperament++) {
    assert.deepEqual(unitLook('neutral', temperament), { body: 'neutral', face: TEMPERAMENT_FACES[temperament] });
    for (const STATE of STATE_FACES.filter((face) => face !== 'neutral')) {
        assert.deepEqual(unitLook(STATE, temperament), { body: 'neutral', face: STATE });
    }
    assert.deepEqual(unitLook('sleep', temperament), { body: 'neutral', face: 'happy' });
    assert.deepEqual(unitLook('guard', temperament), { body: 'guard', face: null });
    assert.deepEqual(unitLook('guard-attack', temperament), { body: 'neutral', face: 'attack' });
}
assert.deepEqual(unitLook('neutral', -1), { body: 'neutral', face: 'neutral' }, 'Enemies and seedlings');
assert.deepEqual(
    TEMPERAMENTS.map((entry) => entry.name),
    ['느긋', '소심', '발끈', '까불', '다정'],
);

// Portraits are the body plus the same face; cheeks take the element colour; the cache is finite.
for (let species = 0; species < SPECIES_COUNT; species++) {
    const BODY = new DOMParser().parseFromString(SOURCES[species], 'image/svg+xml').documentElement,
        BODY_COUNT = BODY.getElementsByTagName('*').length;
    for (let temperament = 0; temperament < TEMPERAMENTS.length; temperament++) {
        const URI = speciesPortraitSource(species, 1, temperament),
            PORTRAIT = new DOMParser().parseFromString(
                decodeURIComponent(URI.split(',').slice(1).join(',')),
                'image/svg+xml',
            ).documentElement,
            LAYER = [...PORTRAIT.getElementsByTagName('g')].filter((node) => node.getAttribute('id') === 'face-layer');
        assert.equal(LAYER.length, 1, 'One face layer over the body');
        assert.ok(PORTRAIT.getElementsByTagName('*').length > BODY_COUNT, 'Face is added to the body');
        assert.ok(URI.includes(encodeURIComponent(elementCheekColor(1))), 'Cheeks use the element colour');
        assert.equal(speciesPortraitSource(species, 1, temperament), URI, 'Finite portrait cache');
    }
}
assert.equal(elementCheekColor(0), null);
for (const FILE of ['src/render/farm-render-units.js', 'src/ui/codex-dialog.js']) {
    assert.doesNotMatch(
        fs.readFileSync(new URL('../' + FILE, import.meta.url), 'utf8'),
        /drawFaceMarks|faceOverlaySvg/,
        'No second brow overlay',
    );
}
console.log(
    'Face layer passed: ' +
        SPECIES_COUNT +
        ' species x ' +
        FACE_IDS.length +
        ' faces from three body sockets; state priority/portraits/cheek colour preserved',
);
