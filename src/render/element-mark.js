import { ELEMENTS } from '../model/lineage.js';
import { ELEMENT_ICONS } from '../units/species-face.js';

const { OperationImages: OPERATION_IMAGES, drawOperations: DRAW_OPERATIONS } = globalThis.BloomGamekitFace;

// The mark image density: pixels across its 24-unit icon grid. A mark is drawn from the image at most at half that
// size; larger draws use paths so nothing is magnified.
const MARK_PIXELS = 64;
const MAX_DISPLAY_TO_IMAGE_SCALE = 0.5;

// The element mark as draw operations on its 24-unit icon grid: one description for the baked image and the paths.
function elementMarkOps(element) {
    const ICON = ELEMENT_ICONS[element];
    if (!ICON) {
        return [];
    }
    if (ICON.poly) {
        const PATH = [...ICON.poly.map((point, index) => [index ? 'L' : 'M', ...point]), ['Z']];
        return [
            { fill: ELEMENTS[element].color, path: PATH, opacity: 1 },
            { stroke: '#4a3a30', path: PATH, width: 1.6 },
        ];
    }
    return [
        {
            stroke: ELEMENTS[element].color,
            path: ICON.lines.flatMap(([from, to]) => [
                ['M', ...from],
                ['L', ...to],
            ]),
            width: 3,
        },
    ];
}

// Every element mark as an image on the device atlas, keyed by element. prepare() uploads them once, outside game
// frames; the device replays them after a lost context is restored.
export function createElementMarkImages(ctx) {
    return new OPERATION_IMAGES(
        ctx,
        [...ELEMENT_ICONS.keys()]
            .filter((element) => ELEMENT_ICONS[element])
            .map((element) => [element, { operations: elementMarkOps(element), pixelsPerUnit: MARK_PIXELS / 24 }]),
    );
}

// The element mark: a small picture in the element's colour, centred on screen point (x, y). It is an image
// uploaded once (renderer.elementMarks); paths only where that image would be magnified.
export function drawElementMark(renderer, element, x, y, size) {
    if (!ELEMENT_ICONS[element]) {
        return;
    }
    const C = renderer.ctx,
        SCALE = size / 24;
    if (size <= MARK_PIXELS * MAX_DISPLAY_TO_IMAGE_SCALE && renderer.elementMarks.ready) {
        C.globalAlpha = 1;
        renderer.elementMarks.draw(element, x - 12 * SCALE, y - 12 * SCALE, SCALE, SCALE);
        return;
    }
    C.save();
    C.transform(SCALE, 0, 0, SCALE, x - 12 * SCALE, y - 12 * SCALE);
    DRAW_OPERATIONS(C, elementMarkOps(element), 1);
    C.restore();
}
