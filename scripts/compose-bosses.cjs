'use strict';

// A boss is its species' troop art made big, with two changes that are the same for every species: the painted arms are
// taken off, and two floating hands are put beside the body. A hand has no shoulder: it is one fixed-size shape that the
// attack poses move around the body, so it never stretches. The result is written to assets/bosses/ and is what the
// game loads. Everything that differs per species (hand colours, which hand holds a weapon) is read from the species
// catalogue; where the painted arms were is measured here once.
const FS = require('node:fs'),
    PATH = require('node:path'),
    { pathToFileURL: PATH_TO_FILE_URL } = require('node:url'),
    { DOMParser: DOM_PARSER, XMLSerializer: XML_SERIALIZER } = require('@xmldom/xmldom');

// The painted arms are the shapes with these ids (the guard arms and shield grip of the troop art are not arms).
const ARM_ID = /^(?:[a-z]+-)?arm-(?:left|right)(?:-(?:art|shape|outline|crease))?$/;
// Where the painted arms were in each troop art, [left, top, right, bottom] in its canvas. The walnut's left box also
// holds its hammer, so it is the right one mirrored.
const ARM_BOXES = {
    0: { left: [47, 222, 83, 278], right: [254, 220, 289, 279] },
    1: { left: [9, 140, 42, 202], right: [241, 139, 274, 202] },
    2: { left: [17, 174, 61, 232], right: [196, 178, 238, 232] },
    3: { left: [42, 179, 88, 225], right: [232, 179, 278, 225] },
    4: { left: [87, 180, 104, 214], right: [212, 181, 231, 214] },
    5: { left: [60, 174, 98, 225], right: [222, 174, 260, 225] },
    6: { left: [47, 193, 92, 253], right: [228, 193, 273, 253] },
    7: { left: [65, 188, 98, 238], right: [203, 188, 246, 240] },
    8: { left: [57, 196, 115, 251], right: [214, 199, 264, 256] },
};
// The peanut boss keeps its shell shut: the open halves and the two kernels of the troop's shot make a scary mask.
const DROPPED_PARTS = { 4: ['shell-left', 'shell-right', 'kernel-left', 'kernel-right'] };
// ... and the closed shell must stay drawn through every clip, so its fade tracks go too.
const DROPPED_TRACKS = { 4: ['shell-base'] };
const HAND_SIZE = { share: 0.2, min: 20, max: 32 };
const SOURCE_FILE = (species, asset) =>
    species.id === 3 ? 'assets/boss-sources/chestnut.svg' : `assets/troops/${asset}`;

function mix(hex, amount) {
    const CHANNELS = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
    return `rgb(${CHANNELS.map((c) => Math.round(c + (255 - c) * amount)).join(',')})`;
}
// A mitten fist, knuckles toward the camera and thumb on the outer side, drawn in a unit circle at the origin. It never
// turns: the hands only move.
function handArt(side, [fill, outline, x, y, radius]) {
    const ID = (name) => `hand-${side}-${name}`;
    return `<g id="${ID('art')}" transform="translate(${x} ${y}) rotate(90) scale(${radius})">
      <path id="${ID('palm')}" d="M-.15 -1 C.7 -1 1 -.4 1 .1 C1 .75 .5 1 -.1 1 C-.75 1 -1 .5 -1 0 C-1 -.6 -.6 -1 -.15 -1Z" fill="${fill}" stroke="${outline}" stroke-width=".26" stroke-linejoin="round"/>
      <path id="${ID('thumb')}" d="M.55 -.55 C.85 -.95 1.35 -.8 1.25 -.4 C1.18 -.15 .95 -.1 .8 -.2" fill="${fill}" stroke="${outline}" stroke-width=".24" stroke-linecap="round" stroke-linejoin="round"/>
      <path id="${ID('shine')}" d="M-.5 -.45 C-.3 -.7 0 -.75 .2 -.7" fill="none" stroke="${mix(fill, 0.4)}" stroke-width=".18" stroke-linecap="round"/>
      <path id="${ID('crease')}" d="M-.1 .15 C.1 .3 .3 .3 .5 .15" fill="none" stroke="${outline}" stroke-width=".1" stroke-linecap="round" opacity=".6"/>
    </g>`;
}
function composeOne(root, species, asset) {
    const SOURCE = FS.readFileSync(PATH.join(root, SOURCE_FILE(species, asset)), 'utf8'),
        DOCUMENT = new DOM_PARSER().parseFromString(SOURCE, 'image/svg+xml'),
        SVG = DOCUMENT.documentElement,
        METADATA_NODE = DOCUMENT.getElementsByTagName('metadata').item(0),
        METADATA = JSON.parse(METADATA_NODE.textContent);
    const DROPPED = new Set(DROPPED_PARTS[species.id] || []),
        DOOMED = [];
    const WALK = (node) => {
        for (let child = node.firstChild; child; child = child.nextSibling) {
            if (child.nodeType !== 1) {
                continue;
            }
            const ID = child.getAttribute('id');
            if (ID && (ARM_ID.test(ID) || DROPPED.has(ID))) {
                DOOMED.push(child);
            } else {
                WALK(child);
            }
        }
    };
    WALK(SVG);
    for (const NODE of DOOMED) {
        NODE.parentNode.removeChild(NODE);
    }
    const BOX = ARM_BOXES[species.id],
        HALF = (BOX.right[2] - BOX.left[0]) / 2,
        RADIUS = Math.max(HAND_SIZE.min, Math.min(HAND_SIZE.max, HALF * HAND_SIZE.share)),
        REST = {
            'arm-left': [BOX.left[0] + RADIUS * 0.2, (BOX.left[1] + BOX.left[3]) / 2],
            'arm-right': [BOX.right[2] - RADIUS * 0.2, (BOX.right[1] + BOX.right[3]) / 2],
        },
        CENTRE = [(BOX.left[2] + BOX.right[0]) / 2, (BOX.left[1] + BOX.left[3] + BOX.right[1] + BOX.right[3]) / 4];
    const GONE = new Set(['arm-left', 'arm-right', ...DROPPED]);
    METADATA.id = `${METADATA.id.replace(/-(?:troop|boss)$/, '')}-boss`;
    METADATA.parts = METADATA.parts
        .filter((part) => !GONE.has(part.id))
        .concat(
            ['arm-left', 'arm-right'].map((id) => ({
                id,
                parent: null,
                pivot: REST[id].map((value) => Math.round(value * 100) / 100),
            })),
        );
    METADATA.sockets = Object.fromEntries(
        Object.entries(METADATA.sockets).filter(
            ([name, socket]) => !GONE.has(socket.part) && !name.startsWith('shoulder-'),
        ),
    );
    Object.assign(METADATA.sockets, {
        'hand-left': { part: 'arm-left', point: REST['arm-left'] },
        'hand-right': { part: 'arm-right', point: REST['arm-right'] },
        // The edge of the left hand: its distance from the hand is the hand's radius, the same for both hands.
        'hand-edge': { part: 'arm-left', point: [REST['arm-left'][0] + RADIUS, REST['arm-left'][1]] },
        'hand-centre': { part: 'body', point: CENTRE },
    });
    for (const CLIP of Object.values(METADATA.clips)) {
        for (const KEYFRAME of CLIP.keyframes) {
            for (const PART of [...GONE, ...(DROPPED_TRACKS[species.id] || [])]) {
                delete KEYFRAME.parts[PART];
            }
        }
    }
    for (const EXPRESSION of Object.values(METADATA.expressions)) {
        for (const LIST of [EXPRESSION.show, EXPRESSION.hide]) {
            for (let at = LIST.length - 1; at >= 0; at--) {
                if (DROPPED.has(LIST[at])) {
                    LIST.splice(at, 1);
                }
            }
        }
    }
    METADATA_NODE.textContent = JSON.stringify(METADATA);
    const HAND = (side) =>
        `<g id="arm-${side}">${handArt(side, [species.limbFill, species.limbOutline, ...REST[`arm-${side}`], RADIUS])}</g>`;
    const OUT = new XML_SERIALIZER().serializeToString(DOCUMENT),
        META_END = OUT.indexOf('</metadata>') + '</metadata>'.length,
        CLOSE = OUT.lastIndexOf('</svg>');
    // The right hand is drawn before everything painted (behind the body), the left one after (in front of it).
    return `${OUT.slice(0, META_END)}\n  ${HAND('right')}${OUT.slice(META_END, CLOSE)}  ${HAND('left')}\n${OUT.slice(CLOSE)}`.replace(
        /\n{3,}/g,
        '\n\n',
    );
}
async function composeBosses(root) {
    const { SPECIES_CATALOG } = await import(PATH_TO_FILE_URL(PATH.join(root, 'src/species-catalog.js')).href);
    FS.mkdirSync(PATH.join(root, 'assets/bosses'), { recursive: true });
    for (const SPECIES of SPECIES_CATALOG) {
        FS.writeFileSync(PATH.join(root, 'assets/bosses', SPECIES.asset), composeOne(root, SPECIES, SPECIES.asset));
    }
}
module.exports = { composeBosses };
