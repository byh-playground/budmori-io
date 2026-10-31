import {
    FACE_IDS,
    DEFAULT_CHEEK_COLOR,
    ellipsePath,
    faceParts,
    facePartPlacement,
    cheekEllipses,
} from '../units/face-layer.js';
import { ELEMENT_ICONS } from '../units/species-face.js';
import { elementMarkOps } from './unit-face-overlay.js';

// Overlay image density: pixels per eye gap for face parts, across the unit cheek circle, and across an element mark.
// An overlay is drawn at most half that size; larger draws use paths so nothing is magnified.
const FACE_PART_PIXELS = 128;
const CHEEK_PIXELS = 64;
const MARK_PIXELS = 64;
const MAX_DISPLAY_TO_IMAGE_SCALE = 0.5;

// Face parts, the cheek and the element marks as images on the device atlas, uploaded once and overlaid on any body
// in every art mode. Every species shares one eye and mouth part per expression; one white cheek takes the element
// colour when drawn. Pictures are rasterised once per page; prepare() uploads them outside game frames (renderer
// start and a restored graphics context), and a frame before that draws the same parts as paths.
export class UnitOverlayImages {
    constructor(renderer) {
        this.renderer = renderer;
        this.pictures = null;
        this.images = new Map();
        this.generation = -1;
        this.disposed = false;
    }
    prepare() {
        const DEVICE = this.renderer.device,
            GENERATION = DEVICE.stats.restores ?? 0;
        if (this.disposed || DEVICE.state !== 'ready' || GENERATION === this.generation) {
            return;
        }
        this.pictures ??= overlayPictures();
        const ATLAS = DEVICE.textureAtlas;
        this.images.clear();
        for (const [KEY, PICTURE] of this.pictures) {
            const REGION = ATLAS.allocate(PICTURE.canvas.width, PICTURE.canvas.height);
            ATLAS.upload(REGION, PICTURE.canvas);
            this.images.set(KEY, { ...PICTURE, region: REGION });
        }
        this.generation = GENERATION;
    }
    _ready() {
        const DEVICE = this.renderer.device;
        return !this.disposed && DEVICE.state === 'ready' && (DEVICE.stats.restores ?? 0) === this.generation;
    }
    // Draws a face on the current transform, which maps the body's own canvas (the posed face). `pixelsPerUnit` is
    // how many screen pixels one body-canvas unit covers. False when it would be magnified: the caller draws paths.
    drawFace(anchor, faceId, cheekColor, alpha, pixelsPerUnit) {
        const { gap: GAP, origins: ORIGINS } = facePartPlacement(anchor);
        if (GAP * pixelsPerUnit > FACE_PART_PIXELS * MAX_DISPLAY_TO_IMAGE_SCALE || !this._ready()) {
            return false;
        }
        const C = this.renderer.ctx,
            PARTS = faceParts(faceId),
            CHEEK = this.images.get('cheek');
        C.globalAlpha = alpha * PARTS.cheeks.opacity;
        C.withColor(cheekColor ?? DEFAULT_CHEEK_COLOR, () => {
            for (const [CX, CY, RX, RY] of cheekEllipses(anchor, PARTS.cheeks)) {
                drawImage(C, CHEEK, CX, CY, RX, RY);
            }
        });
        C.globalAlpha = alpha;
        for (const [INDEX, [OX, OY]] of ORIGINS.entries()) {
            drawImage(C, this.images.get(`${faceId}:${INDEX}`), OX, OY, GAP, GAP);
        }
        return true;
    }
    // The element mark centred on screen point (x, y), `size` pixels across its 24-unit icon grid.
    drawElementMark(element, x, y, size) {
        if (size > MARK_PIXELS * MAX_DISPLAY_TO_IMAGE_SCALE || !this._ready()) {
            return false;
        }
        const SCALE = size / 24;
        this.renderer.ctx.globalAlpha = 1;
        drawImage(
            this.renderer.ctx,
            this.images.get(`element:${element}`),
            x - 12 * SCALE,
            y - 12 * SCALE,
            SCALE,
            SCALE,
        );
        return true;
    }
    dispose() {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        if (this.renderer.device.state === 'ready') {
            for (const IMAGE of this.images.values()) {
                IMAGE.region.atlas.release(IMAGE.region);
            }
        }
        this.images.clear();
    }
}

// Every overlay picture, keyed as drawn: `${face}:${part}`, 'cheek' and `element:${element}`.
function overlayPictures() {
    const PICTURES = new Map();
    for (const FACE of FACE_IDS) {
        const PARTS = faceParts(FACE);
        for (const [INDEX, OPS] of [...PARTS.eyes, PARTS.mouth].entries()) {
            PICTURES.set(`${FACE}:${INDEX}`, rasterise(OPS, FACE_PART_PIXELS));
        }
    }
    // A unit circle squashed to each cheek when drawn; white so the element colour can replace it.
    PICTURES.set(
        'cheek',
        rasterise([{ fill: '#ffffff', opacity: 1, path: ellipsePath(0, 0, 1, 1) }], CHEEK_PIXELS / 2),
    );
    for (const [ELEMENT, ICON] of ELEMENT_ICONS.entries()) {
        if (ICON) {
            PICTURES.set(`element:${ELEMENT}`, rasterise(elementMarkOps(ELEMENT), MARK_PIXELS / 24));
        }
    }
    return PICTURES;
}
// Rasterises draw operations ({ fill | stroke, path, width?, opacity? } in local units) into a canvas.
// Returns it with the local rectangle it covers.
function rasterise(operations, pixelsPerUnit) {
    const BOX = [Infinity, Infinity, -Infinity, -Infinity];
    for (const OPERATION of operations) {
        const PAD = (OPERATION.width || 0) / 2;
        for (const [, ...NUMBERS] of OPERATION.path) {
            for (let index = 0; index < NUMBERS.length; index += 2) {
                BOX[0] = Math.min(BOX[0], NUMBERS[index] - PAD);
                BOX[1] = Math.min(BOX[1], NUMBERS[index + 1] - PAD);
                BOX[2] = Math.max(BOX[2], NUMBERS[index] + PAD);
                BOX[3] = Math.max(BOX[3], NUMBERS[index + 1] + PAD);
            }
        }
    }
    // One clear texel around the art keeps linear sampling from bleeding a neighbour in.
    const MARGIN = 1 / pixelsPerUnit,
        X = BOX[0] - MARGIN,
        Y = BOX[1] - MARGIN,
        WIDTH = Math.ceil((BOX[2] - BOX[0]) * pixelsPerUnit) + 2,
        HEIGHT = Math.ceil((BOX[3] - BOX[1]) * pixelsPerUnit) + 2,
        CANVAS = new OffscreenCanvas(WIDTH, HEIGHT),
        C = CANVAS.getContext('2d');
    C.setTransform(pixelsPerUnit, 0, 0, pixelsPerUnit, -X * pixelsPerUnit, -Y * pixelsPerUnit);
    C.lineCap = 'round';
    C.lineJoin = 'round';
    for (const OPERATION of operations) {
        const PATH = new Path2D();
        for (const [COMMAND, ...N] of OPERATION.path) {
            if (COMMAND === 'M') {
                PATH.moveTo(N[0], N[1]);
            } else if (COMMAND === 'L') {
                PATH.lineTo(N[0], N[1]);
            } else if (COMMAND === 'Q') {
                PATH.quadraticCurveTo(N[0], N[1], N[2], N[3]);
            } else if (COMMAND === 'C') {
                PATH.bezierCurveTo(N[0], N[1], N[2], N[3], N[4], N[5]);
            } else {
                PATH.closePath();
            }
        }
        if (OPERATION.fill) {
            C.globalAlpha = OPERATION.opacity ?? 1;
            C.fillStyle = OPERATION.fill;
            C.fill(PATH);
        } else {
            C.globalAlpha = 1;
            C.strokeStyle = OPERATION.stroke;
            C.lineWidth = OPERATION.width;
            C.stroke(PATH);
        }
    }
    return { canvas: CANVAS, x: X, y: Y, width: WIDTH / pixelsPerUnit, height: HEIGHT / pixelsPerUnit };
}
// Places an image whose local origin goes to (x, y) and whose local unit is (scaleX, scaleY) on the current transform.
function drawImage(ctx, image, x, y, scaleX, scaleY) {
    ctx.drawRegion(
        image.region,
        x + image.x * scaleX,
        y + image.y * scaleY,
        image.width * scaleX,
        image.height * scaleY,
    );
}
