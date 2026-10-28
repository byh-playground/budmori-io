// The face is not authored art: every species gets the same faces from three anchor points in its body.
// Geometry is built once per (anchor, face) in the SVG canvas of the body, so a renderer can draw it with
// the live body transform and the codex can place it into an SVG without a second description.

export const STATE_FACES = Object.freeze([
    'neutral',
    'happy',
    'focused',
    'attack',
    'surprised',
    'hurt',
    'hungry',
    'dead',
]);
export const TEMPERAMENT_FACES = Object.freeze([
    'temperament-0',
    'temperament-1',
    'temperament-2',
    'temperament-3',
    'temperament-4',
]);
export const FACE_IDS = Object.freeze([...STATE_FACES, ...TEMPERAMENT_FACES]);

const EYE_COLOR = '#4a2420',
    INK_COLOR = '#2c1c18',
    GLINT_COLOR = '#fff5d8',
    TONGUE_COLOR = '#e9776b',
    DEFAULT_CHEEK_COLOR = '#ec8070',
    EYE_SIZE = 0.165,
    MOUTH_HALF_WIDTH = 0.19,
    ELLIPSE_KAPPA = 0.5522847498;

function ellipsePath(cx, cy, rx, ry) {
    const KX = rx * ELLIPSE_KAPPA,
        KY = ry * ELLIPSE_KAPPA;
    return [
        ['M', cx + rx, cy],
        ['C', cx + rx, cy + KY, cx + KX, cy + ry, cx, cy + ry],
        ['C', cx - KX, cy + ry, cx - rx, cy + KY, cx - rx, cy],
        ['C', cx - rx, cy - KY, cx - KX, cy - ry, cx, cy - ry],
        ['C', cx + KX, cy - ry, cx + rx, cy - KY, cx + rx, cy],
        ['Z'],
    ];
}

function layoutOf({ eyeLeft, eyeRight, mouth }) {
    const GAP = eyeRight[0] - eyeLeft[0],
        U = GAP * EYE_SIZE;
    return {
        gap: GAP,
        u: U,
        ex: [eyeLeft[0], eyeRight[0]],
        ey: [eyeLeft[1], eyeRight[1]],
        mx: mouth[0],
        my: mouth[1],
        w: GAP * MOUTH_HALF_WIDTH,
        stroke: Math.max(2.6, GAP * 0.055),
    };
}

function boxOf(operation) {
    const PAD = operation.width ? operation.width / 2 : 0,
        BOX = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [, ...NUMBERS] of operation.path) {
        for (let index = 0; index < NUMBERS.length; index += 2) {
            BOX[0] = Math.min(BOX[0], NUMBERS[index] - PAD);
            BOX[1] = Math.min(BOX[1], NUMBERS[index + 1] - PAD);
            BOX[2] = Math.max(BOX[2], NUMBERS[index] + PAD);
            BOX[3] = Math.max(BOX[3], NUMBERS[index + 1] + PAD);
        }
    }
    return BOX;
}
const STYLE_OF = (operation) =>
    operation.fill ? 'f' + operation.fill + '/' + operation.opacity : 's' + operation.stroke + '/' + operation.width;
const OVERLAPS = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

// One draw per colour: an operation joins the nearest earlier one of its style unless an operation drawn
// between them overlaps it, so the layering (glints over eyes, teeth over mouth) is unchanged.
function mergeByStyle(operations) {
    const MERGED = [];
    for (const OPERATION of operations) {
        const ENTRY = { operation: { ...OPERATION, path: [...OPERATION.path] }, box: boxOf(OPERATION) },
            STYLE = STYLE_OF(OPERATION);
        let target = null;
        for (let index = MERGED.length - 1; index >= 0; index--) {
            if (STYLE_OF(MERGED[index].operation) === STYLE) {
                target = MERGED[index];
                break;
            }
            if (OVERLAPS(MERGED[index].box, ENTRY.box)) {
                break;
            }
        }
        if (target) {
            target.operation.path.push(...OPERATION.path);
            target.box = [
                Math.min(target.box[0], ENTRY.box[0]),
                Math.min(target.box[1], ENTRY.box[1]),
                Math.max(target.box[2], ENTRY.box[2]),
                Math.max(target.box[3], ENTRY.box[3]),
            ];
        } else {
            MERGED.push(ENTRY);
        }
    }
    return MERGED.map((entry) => entry.operation);
}

// anchor: { eyeLeft: [x, y], eyeRight: [x, y], mouth: [x, y] } in the body's SVG canvas.
// cheekColor: the element colour of the unit, or null for the shared cheek colour.
// Returns draw operations: { fill | stroke: colour, path: [[command, ...NUMBERS]], width?, opacity? }.
export function buildFace(faceId, anchor, cheekColor = null) {
    const L = layoutOf(anchor),
        { u: U, ex: EX, ey: EY, mx: MX, my: MY, w: W } = L,
        OPS = [];
    const FILL = (path, color, opacity = 1) => OPS.push({ fill: color, path, opacity });
    const STROKE = (path, scale = 1, color = INK_COLOR) => OPS.push({ stroke: color, path, width: L.stroke * scale });
    const LINE = (x1, y1, x2, y2, scale) =>
        STROKE(
            [
                ['M', x1, y1],
                ['L', x2, y2],
            ],
            scale,
        );
    const CURVE = (x1, y1, cx, cy, x2, y2, scale) =>
        STROKE(
            [
                ['M', x1, y1],
                ['Q', cx, cy, x2, y2],
            ],
            scale,
        );
    const CHEEKS = (scale = 1, opacity = 1) => {
        const RX = L.gap * 0.2 * scale,
            Y = MY + L.gap * 0.05;
        for (const SIDE of [-1, 1]) {
            FILL(
                ellipsePath(EX[SIDE < 0 ? 0 : 1] + SIDE * L.gap * 0.2, Y, RX, RX * 0.62),
                cheekColor ?? DEFAULT_CHEEK_COLOR,
                opacity,
            );
        }
    };
    const EYES = (rx = 1, ry = 1, dy = 0) => {
        for (const I of [0, 1]) {
            FILL(ellipsePath(EX[I], EY[I] + dy * U, U * rx, U * ry * 1.05), EYE_COLOR);
        }
    };
    const GLINTS = (rx = 1, big = 0.3, small = 0.14, dy = 0) => {
        for (const I of [0, 1]) {
            FILL(ellipsePath(EX[I] - 0.3 * U * rx, EY[I] + dy * U - 0.35 * U, U * big, U * big), GLINT_COLOR);
            if (small) {
                FILL(
                    ellipsePath(EX[I] + 0.35 * U * rx, EY[I] + dy * U + 0.3 * U, U * small, U * small),
                    GLINT_COLOR,
                    0.8,
                );
            }
        }
    };
    const SMILE = (half, depth, scale) => CURVE(MX - half, MY, MX, MY + depth, MX + half, MY, scale);
    // A closed mouth outline that holds the open-mouth fill; optional tongue.
    const OPEN_MOUTH = (half, depth, tongue) => {
        FILL(
            [
                ['M', MX - half, MY - U * 0.1],
                ['Q', MX, MY - U * 0.1, MX + half, MY - U * 0.1],
                ['Q', MX + half * 0.8, MY + depth, MX, MY + depth + U * 0.05],
                ['Q', MX - half * 0.8, MY + depth, MX - half, MY - U * 0.1],
                ['Z'],
            ],
            INK_COLOR,
        );
        if (tongue) {
            FILL(ellipsePath(MX, MY + depth * 0.78, half * 0.5, U * 0.38), TONGUE_COLOR);
        }
    };
    const BROW = (side, x1, y1, x2, y2, scale = 1) => {
        const I = side < 0 ? 0 : 1;
        LINE(EX[I] + x1 * U, EY[I] + y1 * U, EX[I] + x2 * U, EY[I] + y2 * U, scale);
    };
    const ARC_UP = (i, scale = 1.25) =>
        CURVE(EX[i] - U, EY[i] + U * 0.35, EX[i], EY[i] - U, EX[i] + U, EY[i] + U * 0.35, scale);
    switch (faceId) {
        case 'neutral':
            CHEEKS();
            EYES();
            GLINTS(1, 0.3, 0);
            SMILE(W, W * 0.525, 1.15);
            break;
        case 'happy':
            CHEEKS(1.2);
            ARC_UP(0);
            ARC_UP(1);
            OPEN_MOUTH(W, U * 1.5, true);
            break;
        case 'focused':
            CHEEKS(1, 0.55);
            for (const I of [0, 1]) {
                FILL(
                    [
                        ['M', EX[I] - U * 1.05, EY[I] - U * 0.1],
                        ['Q', EX[I] - U * 1.05, EY[I] + U * 0.85, EX[I], EY[I] + U * 0.85],
                        ['Q', EX[I] + U * 1.05, EY[I] + U * 0.85, EX[I] + U * 1.05, EY[I] - U * 0.1],
                        ['Z'],
                    ],
                    EYE_COLOR,
                );
            }
            BROW(-1, -1.15, -1.15, 0.95, -0.8, 1.2);
            BROW(1, 1.15, -1.15, -0.95, -0.8, 1.2);
            LINE(MX - W * 0.45, MY + U * 0.1, MX + W * 0.45, MY + U * 0.1, 1.2);
            break;
        case 'attack':
            CHEEKS(1, 0.8);
            for (const I of [0, 1]) {
                FILL(ellipsePath(EX[I], EY[I] + U * 0.1, U * 0.95, U * 0.84), EYE_COLOR);
            }
            BROW(-1, -1.3, -1.55, 1.1, -0.7, 1.5);
            BROW(1, 1.3, -1.55, -1.1, -0.7, 1.5);
            OPEN_MOUTH(W * 0.85, U * 1.5, false);
            FILL(
                [
                    ['M', MX - W * 0.62, MY - U * 0.05],
                    ['L', MX + W * 0.62, MY - U * 0.05],
                    ['L', MX + W * 0.62, MY + U * 0.4],
                    ['L', MX - W * 0.62, MY + U * 0.4],
                    ['Z'],
                ],
                '#ffffff',
            );
            break;
        case 'surprised':
            CHEEKS(1, 0.9);
            for (const I of [0, 1]) {
                FILL(ellipsePath(EX[I], EY[I], U * 1.12, U * 1.28), EYE_COLOR);
                FILL(ellipsePath(EX[I] - 0.35 * U, EY[I] - 0.5 * U, U * 0.38, U * 0.38), GLINT_COLOR);
                FILL(ellipsePath(EX[I] + 0.4 * U, EY[I] + 0.4 * U, U * 0.17, U * 0.17), GLINT_COLOR, 0.85);
                CURVE(EX[I] - U, EY[I] - U * 1.85, EX[I], EY[I] - U * 2.4, EX[I] + U, EY[I] - U * 1.85, 0.8);
            }
            FILL(ellipsePath(MX, MY + U * 0.55, U * 0.5, U * 0.72), INK_COLOR);
            break;
        case 'hurt':
            CHEEKS(1, 0.8);
            STROKE(
                [
                    ['M', EX[0] - U * 0.9, EY[0] - U * 0.8],
                    ['L', EX[0] + U * 0.8, EY[0]],
                    ['L', EX[0] - U * 0.9, EY[0] + U * 0.8],
                ],
                1.3,
            );
            STROKE(
                [
                    ['M', EX[1] + U * 0.9, EY[1] - U * 0.8],
                    ['L', EX[1] - U * 0.8, EY[1]],
                    ['L', EX[1] + U * 0.9, EY[1] + U * 0.8],
                ],
                1.3,
            );
            STROKE(
                [
                    ['M', MX - W * 0.8, MY + U * 0.3],
                    ['Q', MX - W * 0.4, MY - U * 0.35, MX, MY + U * 0.3],
                    ['Q', MX + W * 0.4, MY + U * 0.95, MX + W * 0.8, MY + U * 0.3],
                ],
                1.1,
            );
            break;
        case 'hungry':
            CHEEKS(1, 0.6);
            for (const I of [0, 1]) {
                FILL(ellipsePath(EX[I], EY[I] + U * 0.15, U * 0.95, U * 0.84), EYE_COLOR);
                FILL(ellipsePath(EX[I] - 0.25 * U, EY[I] - 0.05 * U, U * 0.3, U * 0.3), GLINT_COLOR);
            }
            BROW(-1, -1.1, -1.0, 1.0, -1.5, 0.9);
            BROW(1, 1.1, -1.0, -1.0, -1.5, 0.9);
            CURVE(MX - W * 0.5, MY + U * 0.5, MX, MY - U * 0.2, MX + W * 0.5, MY + U * 0.5, 1.1);
            break;
        case 'dead':
            CHEEKS(1, 0.5);
            for (const I of [0, 1]) {
                LINE(EX[I] - U * 0.8, EY[I] - U * 0.8, EX[I] + U * 0.8, EY[I] + U * 0.8, 1.2);
                LINE(EX[I] + U * 0.8, EY[I] - U * 0.8, EX[I] - U * 0.8, EY[I] + U * 0.8, 1.2);
            }
            LINE(MX - W * 0.45, MY + U * 0.2, MX + W * 0.45, MY + U * 0.2, 1.1);
            break;
        case 'temperament-0': // 느긋: small round eyes gazing up, relaxed shallow smile
            CHEEKS(1.1, 0.9);
            for (const I of [0, 1]) {
                FILL(ellipsePath(EX[I], EY[I], U * 0.72, U * 0.84), EYE_COLOR);
                FILL(ellipsePath(EX[I] + U * 0.1, EY[I] - U * 0.3, U * 0.3, U * 0.3), GLINT_COLOR);
            }
            CURVE(MX - W * 0.55, MY + U * 0.1, MX, MY + W * 0.55 + U * 0.1, MX + W * 0.55, MY + U * 0.1, 1.1);
            break;
        case 'temperament-1': // 소심: wet eyes, worried brows, trembling mouth
            CHEEKS(1, 0.9);
            for (const I of [0, 1]) {
                FILL(ellipsePath(EX[I], EY[I] + U * 0.05, U, U * 1.15), EYE_COLOR);
                FILL(ellipsePath(EX[I] - U * 0.3, EY[I] - U * 0.35, U * 0.4, U * 0.4), GLINT_COLOR);
                FILL(ellipsePath(EX[I] + U * 0.35, EY[I] + U * 0.4, U * 0.2, U * 0.2), GLINT_COLOR, 0.9);
            }
            BROW(-1, -1.1, -1.0, 0.9, -1.7, 0.95);
            BROW(1, 1.1, -1.0, -0.9, -1.7, 0.95);
            STROKE(
                [
                    ['M', MX - W * 0.55, MY + U * 0.3],
                    ['Q', MX - W * 0.28, MY - U * 0.15, MX, MY + U * 0.3],
                    ['Q', MX + W * 0.28, MY + U * 0.75, MX + W * 0.55, MY + U * 0.3],
                ],
                1.0,
            );
            break;
        case 'temperament-2': // 발끈: slanted brows, round dark eyes, pout
            CHEEKS(1.15);
            for (const I of [0, 1]) {
                FILL(ellipsePath(EX[I], EY[I] + U * 0.1, U * 0.9, U * 0.9), EYE_COLOR);
            }
            BROW(-1, -1.3, -1.5, 1.0, -0.8, 1.2);
            BROW(1, 1.3, -1.5, -1.0, -0.8, 1.2);
            CURVE(MX - W * 0.5, MY + U * 0.45, MX, MY - U * 0.25, MX + W * 0.5, MY + U * 0.45, 1.1);
            break;
        case 'temperament-3': // 까불: one big eye, one wink, open grin with tongue
            CHEEKS(1.15);
            FILL(ellipsePath(EX[0], EY[0], U * 1.1, U * 1.26), EYE_COLOR);
            FILL(ellipsePath(EX[0] - U * 0.3, EY[0] - U * 0.4, U * 0.4, U * 0.4), GLINT_COLOR);
            FILL(ellipsePath(EX[0] + U * 0.35, EY[0] + U * 0.4, U * 0.17, U * 0.17), GLINT_COLOR, 0.85);
            ARC_UP(1, 1.2);
            OPEN_MOUTH(W * 0.75, U * 1.4, true);
            break;
        case 'temperament-4': // 다정: closed upward-arched eyes, big blush, small smile
            CHEEKS(1.4);
            ARC_UP(0);
            ARC_UP(1);
            SMILE(W * 0.6, W * 0.95, 1.15);
            break;
        default:
            throw new RangeError('Unknown face: ' + faceId);
    }
    return mergeByStyle(OPS);
}

// SVG markup of the same face, for portraits that are plain SVG images.
export function faceSvg(faceId, anchor, cheekColor = null) {
    const D = (path) =>
        path.map(([command, ...numbers]) => command + numbers.map((n) => +n.toFixed(2)).join(' ')).join('');
    return buildFace(faceId, anchor, cheekColor)
        .map((op) =>
            op.fill
                ? `<path d="${D(op.path)}" fill="${op.fill}"${op.opacity < 1 ? ` opacity="${op.opacity}"` : ''}/>`
                : `<path d="${D(op.path)}" fill="none" stroke="${op.stroke}" stroke-width="${+op.width.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`,
        )
        .join('');
}
