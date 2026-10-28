import { faceSvg } from './face-layer.js';
import { elementCheekColor, unitLook } from './species-face.js';

const PORTRAITS = new Map();
const ROOTS = new Map();

// UI portraits are the body SVG with the same face the game draws, appended as one group over the body.
export function speciesPortraitSource(species, element = 0, temperament = -1) {
    const FACE = unitLook('neutral', temperament).face,
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
