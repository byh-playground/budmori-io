import { ELEMENTS } from '../model/lineage.js';

// Existing temperament brows use eye anchors. Cheek colour lives only in authored SVG named fills.
const FACE = (viewBox, eyes, eyeH) => Object.freeze({ viewBox, eyes, eyeH });
const SPECIES_FACES = Object.freeze([
    FACE(
        [320, 350],
        [
            [139, 190],
            [216, 190],
        ],
        27,
    ),
    FACE(
        [285, 295],
        [
            [102, 89],
            [180, 89],
        ],
        27,
    ),
    FACE(
        [260, 320],
        [
            [96, 93],
            [156, 93],
        ],
        23,
    ),
    FACE(
        [320, 300],
        [
            [128, 116],
            [192, 116],
        ],
        24,
    ),
    FACE(
        [320, 300],
        [
            [137.5, 143.8],
            [180, 143.8],
        ],
        13.8,
    ),
    FACE(
        [320, 300],
        [
            [133.1, 151.3],
            [185.6, 151.3],
        ],
        18,
    ),
    FACE(
        [320, 350],
        [
            [126, 163],
            [189, 163],
        ],
        20.6,
    ),
    FACE(
        [320, 350],
        [
            [123, 159],
            [180, 159],
        ],
        20,
    ),
    FACE(
        [320, 350],
        [
            [125.5, 151.7],
            [195.4, 151.9],
        ],
        23.1,
    ),
    FACE(
        [320, 350],
        [
            [129.2, 227.2],
            [192.2, 227.2],
        ],
        23.4,
    ),
]);

// Dark brows, except on the chestnut whose body is as dark.
const BROW_COLORS = Object.freeze({ 3: '#f1dfc8' });
const BROW_COLOR = '#3a2620';
// Per temperament: how high the brow sits over the eye, its length and thickness (in eye heights), and how far its inner
// and outer ends move down (+) or up (-). 끈기 flat, 듬직 low and heavy, 발끈 slanted in, 성급 raised, 다정 drooping out.
const BROWS = Object.freeze([
    Object.freeze({ lift: 0.95, length: 0.7, width: 0.2, inner: 0, outer: 0 }),
    Object.freeze({ lift: 0.8, length: 0.9, width: 0.3, inner: 0, outer: 0 }),
    Object.freeze({ lift: 0.9, length: 0.75, width: 0.24, inner: 0.45, outer: -0.15 }),
    Object.freeze({ lift: 1.35, length: 0.7, width: 0.2, inner: -0.25, outer: 0.05 }),
    Object.freeze({ lift: 1.0, length: 0.7, width: 0.2, inner: -0.2, outer: 0.35 }),
]);

// Existing temperament brows in the original canvas; colour never adds face geometry
// (none for a negative temperament, as on an enemy).
export function faceMarks(species, temperament) {
    const FACE_LOCAL = SPECIES_FACES[species],
        MARKS = [];
    if (!FACE_LOCAL) {
        return MARKS;
    }
    if (!(temperament >= 0)) {
        return MARKS;
    }
    const BROW = BROWS[temperament] ?? BROWS[0],
        MID = (FACE_LOCAL.eyes[0][0] + FACE_LOCAL.eyes[1][0]) / 2;
    for (const [X, Y] of FACE_LOCAL.eyes) {
        const SIDE = Math.sign(MID - X) || 1,
            H = FACE_LOCAL.eyeH,
            TOP = Y - BROW.lift * H,
            HALF = BROW.length * H;
        MARKS.push({
            kind: 'line',
            x1: X - SIDE * HALF,
            y1: TOP + BROW.outer * H,
            x2: X + SIDE * HALF,
            y2: TOP + BROW.inner * H,
            width: BROW.width * H,
            color: BROW_COLORS[species] ?? BROW_COLOR,
        });
    }
    return MARKS;
}

// The small element picture: flame, snowflake (strokes), leaf, bolt and drop, as points in a 24 x 24 box.
export const ELEMENT_ICONS = Object.freeze([
    null,
    Object.freeze({
        poly: [
            [12, 2],
            [15, 7],
            [19, 13],
            [18, 18],
            [14, 22],
            [10, 22],
            [6, 18],
            [5, 13],
            [8, 9],
            [9, 12],
            [10, 6],
        ],
    }),
    Object.freeze({
        lines: [
            [
                [12, 2],
                [12, 22],
            ],
            [
                [3.3, 7],
                [20.7, 17],
            ],
            [
                [3.3, 17],
                [20.7, 7],
            ],
        ],
    }),
    Object.freeze({
        poly: [
            [4, 20],
            [5, 13],
            [9, 7],
            [15, 4],
            [21, 3],
            [20, 10],
            [17, 16],
            [11, 19],
        ],
    }),
    Object.freeze({
        poly: [
            [14, 2],
            [5, 14],
            [11, 14],
            [9, 22],
            [19, 9],
            [13, 9],
        ],
    }),
    Object.freeze({
        poly: [
            [12, 2],
            [16, 8],
            [19, 13],
            [18, 18],
            [14, 22],
            [10, 22],
            [6, 18],
            [5, 13],
            [8, 8],
        ],
    }),
]);
export function elementIconSvg(element, size = 16) {
    const ICON = ELEMENT_ICONS[element];
    if (!ICON) {
        return '';
    }
    const COLOR = ELEMENTS[element].color,
        SHAPE = ICON.poly
            ? `<polygon points="${ICON.poly.map((point) => point.join(',')).join(' ')}" fill="${COLOR}" stroke="#4a3a30" stroke-width="1.6" stroke-linejoin="round"/>`
            : `<path d="${ICON.lines.map(([from, to]) => `M${from.join(' ')} L${to.join(' ')}`).join(' ')}" fill="none" stroke="${COLOR}" stroke-width="3" stroke-linecap="round"/>`;
    return `<svg class="element-icon" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${SHAPE}</svg>`;
}
// The face marks as an SVG laid over the species picture (same canvas, so it lines up at any size).
export function faceOverlaySvg(species, temperament) {
    const FACE_LOCAL = SPECIES_FACES[species];
    if (!FACE_LOCAL) {
        return '';
    }
    const SHAPES = faceMarks(species, temperament).map(
        (mark) =>
            `<line x1="${mark.x1}" y1="${mark.y1}" x2="${mark.x2}" y2="${mark.y2}" stroke="${mark.color}" stroke-width="${mark.width}" stroke-linecap="round"/>`,
    );
    return `<svg class="face-overlay" viewBox="0 0 ${FACE_LOCAL.viewBox[0]} ${FACE_LOCAL.viewBox[1]}" aria-hidden="true">${SHAPES.join('')}</svg>`;
}
