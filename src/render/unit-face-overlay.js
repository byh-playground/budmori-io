import { ELEMENTS } from '../model/lineage.js';
import { ELEMENT_ICONS } from '../units/species-face.js';

// The element mark: a small picture in the element's colour, centred on screen point (x, y).
export function drawElementMark(ctx, element, x, y, size) {
    const ICON = ELEMENT_ICONS[element];
    if (!ICON) {
        return;
    }
    const SCALE = size / 24,
        AT = ([ax, ay]) => [x + (ax - 12) * SCALE, y + (ay - 12) * SCALE];
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (ICON.poly) {
        ICON.poly.forEach((point, index) => (index ? ctx.lineTo(...AT(point)) : ctx.moveTo(...AT(point))));
        ctx.closePath();
        ctx.fillStyle = ELEMENTS[element].color;
        ctx.fill();
        ctx.strokeStyle = '#4a3a30';
        ctx.lineWidth = 1.6 * SCALE;
    } else {
        for (const [FROM, TO] of ICON.lines) {
            ctx.moveTo(...AT(FROM));
            ctx.lineTo(...AT(TO));
        }
        ctx.strokeStyle = ELEMENTS[element].color;
        ctx.lineWidth = 3 * SCALE;
    }
    ctx.stroke();
}
