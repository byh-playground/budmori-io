// Floating damage numbers. Every confirmed hit gets its own number at the place it landed, so a crowd of hits keeps its
// rhythm; clutter is handled by drawing the other decoration less, never by merging the numbers.
// The digits are strokes in the same vector style as the rest of the battle, so no font has to be downloaded.
export const DAMAGE_NUMBER = Object.freeze({
    lifeMs: 800,
    // World units: the digit height of a normal hit and the factor a critical hit adds.
    height: 0.7,
    criticalScale: 1.7,
    rise: 1.1,
    // How far apart simultaneous numbers drift, so a volley stays readable.
    spread: 0.09,
    popFraction: 0.14,
    fadeFraction: 0.35,
});

const GLYPH_WIDTH = 0.6;
const FLIP = (strokes) => strokes.map((stroke) => stroke.map(([x, y]) => [GLYPH_WIDTH - x, 1 - y]));
const SIX = [
    [
        [0.5, 1],
        [0.15, 0.85],
        [0, 0.5],
        [0, 0.2],
        [0.2, 0],
        [0.45, 0],
        [0.6, 0.2],
        [0.6, 0.4],
        [0.4, 0.55],
        [0.15, 0.5],
        [0, 0.35],
    ],
];
// Each glyph is a list of strokes; a stroke is a polyline in a 0.6 x 1 box (y up).
const GLYPHS = Object.freeze({
    0: [
        [
            [0, 0.2],
            [0.1, 0.05],
            [0.3, 0],
            [0.5, 0.05],
            [0.6, 0.2],
            [0.6, 0.8],
            [0.5, 0.95],
            [0.3, 1],
            [0.1, 0.95],
            [0, 0.8],
            [0, 0.2],
        ],
    ],
    1: [
        [
            [0.1, 0.8],
            [0.32, 1],
            [0.32, 0],
        ],
    ],
    2: [
        [
            [0, 0.8],
            [0.1, 0.95],
            [0.3, 1],
            [0.5, 0.95],
            [0.6, 0.8],
            [0.55, 0.6],
            [0, 0],
            [0.6, 0],
        ],
    ],
    3: [
        [
            [0, 0.9],
            [0.3, 1],
            [0.55, 0.9],
            [0.55, 0.62],
            [0.25, 0.5],
            [0.55, 0.38],
            [0.55, 0.1],
            [0.3, 0],
            [0, 0.1],
        ],
    ],
    4: [
        [
            [0.45, 0],
            [0.45, 1],
            [0, 0.3],
            [0.6, 0.3],
        ],
    ],
    5: [
        [
            [0.55, 1],
            [0.05, 1],
            [0, 0.55],
            [0.3, 0.62],
            [0.55, 0.5],
            [0.6, 0.2],
            [0.4, 0],
            [0.05, 0.05],
        ],
    ],
    6: SIX,
    7: [
        [
            [0, 1],
            [0.6, 1],
            [0.2, 0],
        ],
    ],
    8: [
        [
            [0.3, 0.5],
            [0.05, 0.65],
            [0.05, 0.9],
            [0.3, 1],
            [0.55, 0.9],
            [0.55, 0.65],
            [0.3, 0.5],
            [0, 0.35],
            [0, 0.1],
            [0.3, 0],
            [0.6, 0.1],
            [0.6, 0.35],
            [0.3, 0.5],
        ],
    ],
    9: FLIP(SIX),
    '-': [
        [
            [0, 0.5],
            [0.4, 0.5],
        ],
    ],
    '!': [
        [
            [0.1, 1],
            [0.1, 0.3],
        ],
        [
            [0.1, 0],
            [0.1, 0.02],
        ],
    ],
    '.': [
        [
            [0.1, 0],
            [0.1, 0.02],
        ],
    ],
    K: [
        [
            [0, 0],
            [0, 1],
        ],
        [
            [0.6, 1],
            [0, 0.45],
            [0.6, 0],
        ],
    ],
    M: [
        [
            [0, 0],
            [0, 1],
            [0.3, 0.45],
            [0.6, 1],
            [0.6, 0],
        ],
    ],
});
const ADVANCE = Object.freeze({ '!': 0.35, '.': 0.35, '-': 0.55 });
const ADVANCE_DEFAULT = 0.8;

// 12345 -> "12.3K": a hit never needs more than a few glyphs.
export function formatDamage(amount) {
    const VALUE = Math.max(1, Math.round(amount));
    if (VALUE >= 1e6) {
        return `${(VALUE / 1e6).toFixed(VALUE < 1e7 ? 1 : 0)}M`;
    }
    if (VALUE >= 1e4) {
        return `${(VALUE / 1e3).toFixed(VALUE < 1e5 ? 1 : 0)}K`;
    }
    return String(VALUE);
}

function textWidth(text) {
    let width = 0;
    for (const CHAR of text) {
        width += ADVANCE[CHAR] ?? ADVANCE_DEFAULT;
    }
    return width - 0.2;
}

const STYLES = Object.freeze({
    dealt: Object.freeze({ fill: [255, 244, 214], outline: [54, 38, 24], prefix: '', suffix: '' }),
    critical: Object.freeze({ fill: [255, 207, 74], outline: [122, 59, 0], prefix: '', suffix: '!' }),
    taken: Object.freeze({ fill: [255, 154, 120], outline: [84, 30, 20], prefix: '-', suffix: '' }),
});
const OUTLINE_WIDTH = 0.3;
const FILL_WIDTH = 0.14;

// Draws `text` centred on `x` with its baseline at `y`, `height` pixels tall; shared by every number-like mark.
export function drawGlyphText(renderer, text, x, y, height, fill, outline) {
    let cursor = x - (textWidth(text) * height) / 2;
    for (const CHAR of text) {
        for (const STROKE of GLYPHS[CHAR]) {
            const POINTS = STROKE.map(([gx, gy]) => ({ x: cursor + gx * height, y: y - gy * height }));
            for (const [WIDTH, COLOR] of [
                [OUTLINE_WIDTH, outline],
                [FILL_WIDTH, fill],
            ]) {
                for (let index = 1; index < POINTS.length; index++) {
                    renderer.pixelLine(POINTS[index - 1], POINTS[index], height * WIDTH, COLOR);
                }
            }
        }
        cursor += (ADVANCE[CHAR] ?? ADVANCE_DEFAULT) * height;
    }
}
export { textWidth };

export class DamageNumberPresentation {
    lifeMs = DAMAGE_NUMBER.lifeMs;
    // `reduced` keeps the number but drops the pop and the rise: the information stays, the motion goes.
    draw(renderer, event, progress, feel) {
        // Isolated pea demonstrations keep the body readable; hits and their HUD totals remain real.
        if ([0, 2].includes(renderer.attackPreviewSpecies)) {
            return;
        }
        const STYLE = STYLES[event.critical ? 'critical' : event.role],
            REDUCED = feel?.reduced === true,
            POP = Math.min(1, progress / DAMAGE_NUMBER.popFraction),
            ALPHA = Math.min(1, (1 - progress) / DAMAGE_NUMBER.fadeFraction),
            SCALE =
                (event.critical ? DAMAGE_NUMBER.criticalScale : 1) *
                (REDUCED ? 1 : 0.65 + 0.45 * Math.sin(POP * Math.PI * 0.5)),
            LIFT = REDUCED ? 0 : DAMAGE_NUMBER.rise * (1 - (1 - progress) ** 2),
            DRIFT = (((event.sequence * 7919) % 11) - 5) * DAMAGE_NUMBER.spread,
            POINT = renderer.project(event.x + DRIFT, event.y, event.z + 0.5 + LIFT),
            TEXT = `${STYLE.prefix}${formatDamage(event.amount)}${STYLE.suffix}`,
            HEIGHT = DAMAGE_NUMBER.height * SCALE * renderer.scale;
        if (ALPHA <= 0) {
            return;
        }
        const OUTLINE = `rgba(${STYLE.outline},${ALPHA * 0.9})`,
            FILL = `rgba(${STYLE.fill},${ALPHA})`;
        drawGlyphText(renderer, TEXT, POINT.x, POINT.y, HEIGHT, FILL, OUTLINE);
    }
}
