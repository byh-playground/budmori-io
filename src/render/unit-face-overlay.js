import { ELEMENTS } from '../model/lineage.js';
import { ELEMENT_ICONS } from '../units/species-face.js';

// The element mark as draw operations on its 24-unit icon grid: one description for the baked image and the paths.
export function elementMarkOps(element) {
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

// The element mark: a small picture in the element's colour, centred on screen point (x, y). It is an image
// uploaded once (UnitOverlayImages); paths only where that image would be magnified.
export function drawElementMark(renderer, element, x, y, size) {
    if (!ELEMENT_ICONS[element] || renderer.unitOverlays.drawElementMark(element, x, y, size)) {
        return;
    }
    const C = renderer.ctx,
        SCALE = size / 24;
    C.save();
    C.transform(SCALE, 0, 0, SCALE, x - 12 * SCALE, y - 12 * SCALE);
    drawOperations(C, elementMarkOps(element), 1);
    C.restore();
}

// Draws { fill | stroke, path, width?, opacity? } operations as paths on the current transform.
export function drawOperations(ctx, operations, alpha) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const OP of operations) {
        ctx.beginPath();
        for (const [COMMAND, ...N] of OP.path) {
            if (COMMAND === 'M') {
                ctx.moveTo(N[0], N[1]);
            } else if (COMMAND === 'L') {
                ctx.lineTo(N[0], N[1]);
            } else if (COMMAND === 'Q') {
                ctx.quadraticCurveTo(N[0], N[1], N[2], N[3]);
            } else if (COMMAND === 'C') {
                ctx.bezierCurveTo(N[0], N[1], N[2], N[3], N[4], N[5]);
            } else {
                ctx.closePath();
            }
        }
        if (OP.fill) {
            ctx.globalAlpha = (OP.opacity ?? 1) * alpha;
            ctx.fillStyle = OP.fill;
            ctx.fill();
        } else {
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = OP.stroke;
            ctx.lineWidth = OP.width;
            ctx.stroke();
        }
    }
}
