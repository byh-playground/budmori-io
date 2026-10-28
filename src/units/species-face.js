import { ELEMENTS } from '../model/lineage.js';

// Only authored face groups: neutral temperament mapping never triggers a combat action.
const TEMPERAMENT_EXPRESSIONS = Object.freeze(['neutral', 'focused', 'attack', 'surprised', 'happy']);

export function selectUnitExpression(stateExpression, temperament = -1) {
    return stateExpression === 'neutral' ? (TEMPERAMENT_EXPRESSIONS[temperament] ?? stateExpression) : stateExpression;
}

export function idleUnitExpressions() {
    return [
        ...new Set([
            'neutral',
            'hungry',
            ...TEMPERAMENT_EXPRESSIONS.map((_, temperament) => selectUnitExpression('neutral', temperament)),
        ]),
    ];
}

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
