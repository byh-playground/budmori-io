import { ELEMENTS } from '../model/lineage.js';
import { ELEMENT_ICONS, faceMarks } from '../units/species-face.js';

// The temperament's brows and the element's cheeks drawn over a unit's face, and the element mark floating above it.
// `matrix` is the unit's vector transform and `shift` how far the animation has moved the face from its rest pose.

export function drawFaceMarks(ctx, species, temperament, element, matrix, shift) {
    const [SCALE, , , , OX, OY] = matrix,
        SIZE = Math.abs(SCALE);
    for (const MARK of faceMarks(species, temperament, element)) {
        ctx.beginPath();
        if (MARK.kind === 'ellipse') {
            ctx.ellipse(
                (MARK.x + shift.x) * SCALE + OX,
                (MARK.y + shift.y) * SCALE + OY,
                MARK.rx * SIZE,
                MARK.ry * SIZE,
                0,
                0,
                Math.PI * 2,
            );
            ctx.fillStyle = MARK.fill;
            ctx.fill();
            ctx.strokeStyle = MARK.stroke;
            ctx.lineWidth = MARK.strokeWidth * SIZE;
            ctx.stroke();
        } else {
            ctx.moveTo((MARK.x1 + shift.x) * SCALE + OX, (MARK.y1 + shift.y) * SCALE + OY);
            ctx.lineTo((MARK.x2 + shift.x) * SCALE + OX, (MARK.y2 + shift.y) * SCALE + OY);
            ctx.strokeStyle = MARK.color;
            ctx.lineWidth = MARK.width * SIZE;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }
}

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
