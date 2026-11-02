'use strict';

const FS = require('node:fs'),
    PATH = require('node:path'),
    CRYPTO = require('node:crypto');
const { DOMParser: DOM_PARSER } = require('@xmldom/xmldom');
const { readVectorSockets: READ_VECTOR_SOCKETS } = require('../src/vector-sockets.cjs');
const { validateUnitBodySource: VALIDATE_UNIT_BODY_SOURCE } = require('../src/features/unit-body/definition.cjs');
const SVG_SHAPE_ELEMENTS = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
function validateTroopArtwork(bytes, file) {
    const ERRORS = [];
    const DOCUMENT = new DOM_PARSER({
        onError(level, message) {
            ERRORS.push(`${level}: ${message}`);
        },
    }).parseFromString(bytes.toString('utf8'), 'image/svg+xml');
    if (ERRORS.length || !DOCUMENT?.documentElement || DOCUMENT.documentElement.nodeName !== 'svg') {
        throw new Error(`Invalid SVG XML in ${file}${ERRORS.length ? `: ${ERRORS.join('; ')}` : ''}`);
    }
    const IDS = new Map();
    let shapeCount = 0;
    const VISIT = (node) => {
        if (node.nodeType !== 1) {
            return;
        }
        const ID = node.getAttribute('id');
        for (const NAME of ['opacity', 'fill-opacity', 'stroke-opacity', 'stop-opacity']) {
            if (node.hasAttribute(NAME)) {
                const VALUE = Number(node.getAttribute(NAME));
                if (VALUE !== 0 && VALUE !== 1) {
                    throw new Error(`Troop artwork must use opaque paint: ${file}#${ID} ${NAME}`);
                }
            }
        }
        if (ID) {
            if (IDS.has(ID)) {
                throw new Error(`Duplicate SVG DOM id "${ID}" in ${file}`);
            }
            IDS.set(ID, node);
        }
        if (SVG_SHAPE_ELEMENTS.has(node.nodeName)) {
            shapeCount++;
            if (!ID) {
                throw new Error(`Painted SVG shape <${node.nodeName}> must keep its DOM id in ${file}`);
            }
        }
        for (let child = node.firstChild; child; child = child.nextSibling) {
            VISIT(child);
        }
    };
    VISIT(DOCUMENT.documentElement);
    if (!shapeCount) {
        throw new Error(`No supported painted SVG shapes found in ${file}`);
    }
    const METADATA_NODE = DOCUMENT.getElementsByTagName('metadata').item(0);
    if (!METADATA_NODE || METADATA_NODE.getAttribute('id') !== 'vector-asset') {
        throw new Error(`Missing vector metadata in ${file}`);
    }
    const METADATA = JSON.parse(METADATA_NODE.textContent);
    READ_VECTOR_SOCKETS({
        metadata: METADATA,
        viewBox: DOCUMENT.documentElement.getAttribute('viewBox').trim().split(/[ ,]+/).map(Number),
        sourcePath: file,
    });
    for (const [NAME, CLIP] of Object.entries(METADATA.clips)) {
        for (const FRAME of CLIP.keyframes) {
            for (const POSE of Object.values(FRAME.parts)) {
                if (Object.hasOwn(POSE, 'opacity')) {
                    throw new Error(`Troop clips must use opaque part motion: ${file}#${NAME}`);
                }
            }
        }
    }
    return shapeCount;
}
function validateVectorSources(root) {
    const CONFIG = JSON.parse(FS.readFileSync(PATH.join(root, 'scripts/vector-assets-sources.json'), 'utf8'));
    if (CONFIG.schemaVersion !== 1 || !Array.isArray(CONFIG.assets) || !Array.isArray(CONFIG.bosses)) {
        throw Error('Invalid vector source inventory');
    }
    const SPECS = [
        ...CONFIG.assets.map((a) => ({
            kind: 'troop',
            id: a.species,
            file: a.file,
            qualityPreset: a.qualityPreset,
        })),
        ...CONFIG.bosses.map((a) => ({
            kind: 'boss',
            id: a.id,
            file: a.file,
            qualityPreset: a.qualityPreset,
        })),
    ];
    const KEYS = new Set();
    return SPECS.map((spec) => {
        if (!/^assets\/(troops|bosses)\/[a-z0-9-]+\.svg$/.test(spec.file)) {
            throw Error('Original SVG source path required');
        }
        if (spec.kind === 'troop' && (!Number.isSafeInteger(spec.id) || spec.id < 0)) {
            throw Error('Valid troop species ID required');
        }
        if (spec.kind === 'boss' && (typeof spec.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(spec.id))) {
            throw Error('Valid boss resource ID required');
        }
        if (!['standard', 'smallAsset'].includes(spec.qualityPreset)) {
            throw Error('A shared GameKit SVG quality preset is required');
        }
        const KEY = spec.kind + ':' + spec.id;
        if (KEYS.has(KEY)) {
            throw Error('Duplicate SVG resource identity');
        }
        KEYS.add(KEY);
        const BYTES = FS.readFileSync(PATH.join(root, spec.file));
        if (!BYTES.length || BYTES.length > 512 * 1024) {
            throw Error('SVG source size outside supported bounds');
        }
        validateTroopArtwork(BYTES, spec.file);
        const SOURCE = {
            ...spec,
            bytes: BYTES.length,
            sha256: CRYPTO.createHash('sha256').update(BYTES).digest('hex'),
        };
        if (spec.kind === 'troop') {
            VALIDATE_UNIT_BODY_SOURCE(spec.id, SOURCE);
        }
        return SOURCE;
    });
}
module.exports = {
    validateVectorSources,
};
if (require.main === module) {
    console.log(JSON.stringify(validateVectorSources(PATH.resolve(__dirname, '..')), null, 2));
}
