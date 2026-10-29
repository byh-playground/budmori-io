import { faceSvg } from './face-layer.js';
import { elementCheekColor, unitLook } from './species-face.js';

const PORTRAITS = new Map();
const ROOTS = new Map();

// UI portraits are the body SVG with the same face the game draws, appended as one group over the body.
export function speciesPortraitSource(species, element = 0, temperament = -1) {
    return speciesFacePortraitSource(species, unitLook('neutral', temperament).face, element);
}

// The same portrait with an explicit face id (a state face such as 'surprised' or 'happy').
export function speciesFacePortraitSource(species, faceId, element = 0) {
    const FACE = faceId,
        COLOR = elementCheekColor(element);
    const KEY = species + ':' + element + ':' + FACE;
    if (!PORTRAITS.has(KEY)) {
        if (!ROOTS.has(species)) {
            const SOURCE = globalThis.BudmoriVectorResources.sources[species];
            ROOTS.set(species, new DOMParser().parseFromString(SOURCE, 'image/svg+xml').documentElement);
        }
        const SVG = ROOTS.get(species).cloneNode(true),
            SOCKETS = JSON.parse(SVG.getElementsByTagName('metadata')[0].textContent).sockets,
            ANCHOR = {
                eyeLeft: SOCKETS['face-eye-left'].point,
                eyeRight: SOCKETS['face-eye-right'].point,
                mouth: SOCKETS['face-mouth'].point,
            },
            LAYER = new DOMParser().parseFromString(
                `<g xmlns="http://www.w3.org/2000/svg" id="face-layer">${faceSvg(FACE, ANCHOR, COLOR)}</g>`,
                'image/svg+xml',
            ).documentElement;
        SVG.appendChild(SVG.ownerDocument.importNode(LAYER, true));
        PORTRAITS.set(
            KEY,
            'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(SVG)),
        );
    }
    return PORTRAITS.get(KEY);
}

// Where the body's mouth sits as a fraction of its SVG canvas, so UI can aim something at it.
export function speciesMouthAnchor(species) {
    if (!ROOTS.has(species)) {
        const SOURCE = globalThis.BudmoriVectorResources.sources[species];
        ROOTS.set(species, new DOMParser().parseFromString(SOURCE, 'image/svg+xml').documentElement);
    }
    const SVG = ROOTS.get(species),
        BOX = SVG.getAttribute('viewBox').split(/[ ,]+/).map(Number),
        POINT = JSON.parse(SVG.getElementsByTagName('metadata')[0].textContent).sockets['face-mouth'].point;
    return { x: (POINT[0] - BOX[0]) / BOX[2], y: (POINT[1] - BOX[1]) / BOX[3] };
}
