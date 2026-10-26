import { drawGlyphText, formatDamage, textWidth } from '../../../render/damage-numbers.js';

// Pixel sizes: the mark is a readable fraction of the drawn body, never smaller or larger than these bounds.
const STATUS = Object.freeze({ minHeight: 11, maxHeight: 34, bodyShare: 0.16 });
// Shield outline and a crack, in a unit box (x -0.5..0.5 of the shield width, y 0..1 of the height).
const SHIELD_STROKES = Object.freeze([
    [
        [-0.5, 0.78],
        [0, 1],
        [0.5, 0.78],
        [0.5, 0.42],
        [0, 0],
        [-0.5, 0.42],
        [-0.5, 0.78],
    ],
    [
        [0, 1],
        [-0.12, 0.7],
        [0.14, 0.5],
        [-0.04, 0.24],
    ],
]);
export class BarleyArmorShredPresentation {
    label(_definition, value) {
        return `기본 공격 적중 후 방어력 ${value} 감소 · 감소마다 3초 · 방어력 최저 0`;
    }
    title(value) {
        return `방어력 −${value}`;
    }
    draw(renderer, event, progress) {
        const T = Math.min(1, progress / 0.72),
            ALPHA = 1 - T,
            CENTER = renderer.project(event.x, event.y, (event.z || 0) + 0.18);
        if (ALPHA <= 0) {
            return;
        }
        renderer.ring(event.x, event.y, 0.22 + T * 0.48, `rgba(191,209,196,${ALPHA * 0.72})`, 0.065);
        for (let index = 0; index < 4; index++) {
            const ANGLE = Math.PI / 4 + (index * Math.PI) / 2 + (event.sequence % 5) * 0.12,
                FROM = {
                    x: CENTER.x + Math.cos(ANGLE) * renderer.scale * 0.08,
                    y: CENTER.y + Math.sin(ANGLE) * renderer.scale * 0.08,
                },
                TO = {
                    x: CENTER.x + Math.cos(ANGLE) * renderer.scale * (0.22 + T * 0.18),
                    y: CENTER.y + Math.sin(ANGLE) * renderer.scale * (0.22 + T * 0.18),
                };
            renderer.line(FROM, TO, 0.055, `rgba(229,242,229,${ALPHA})`);
        }
    }
    // A cracked shield and "-N" over the head of whatever is shredded, placed and sized from its drawn body
    // (`height`, `radius`), the same numbers every skill effect uses.
    drawStatus(renderer, target) {
        const AMOUNT = target.barleyArmorShredTotal || 0;
        if (target.hp <= 0 || AMOUNT <= 0) {
            return;
        }
        const PIXEL = renderer.pixelRatio,
            HEAD = renderer.project(target.x, target.y, (target.z || 0) + target.height),
            BODY_WIDTH = 2 * target.radius * renderer.scale,
            HEIGHT = Math.max(
                STATUS.minHeight * PIXEL,
                Math.min(STATUS.maxHeight * PIXEL, BODY_WIDTH * STATUS.bodyShare),
            ),
            TEXT = `-${formatDamage(AMOUNT)}`,
            TEXT_WIDTH = textWidth(TEXT) * HEIGHT,
            GAP = HEIGHT * 0.25,
            SHIELD_WIDTH = HEIGHT * 0.9,
            LEFT = HEAD.x - (SHIELD_WIDTH + GAP + TEXT_WIDTH) / 2,
            BASE = HEAD.y - HEIGHT * 0.5,
            CX = LEFT + SHIELD_WIDTH / 2,
            LEFT_FRACTION = target.barleyArmorShredLeft ?? 1,
            FILL = '#d8e5d7',
            OUTLINE = 'rgba(46,58,48,0.9)';
        const AT = ([x, y]) => ({ x: CX + x * SHIELD_WIDTH, y: BASE - y * HEIGHT });
        for (const STROKE of SHIELD_STROKES) {
            const POINTS = STROKE.map(AT);
            for (const [WIDTH, COLOR] of [
                [HEIGHT * 0.26, OUTLINE],
                [HEIGHT * 0.12, FILL],
            ]) {
                for (let index = 1; index < POINTS.length; index++) {
                    renderer.pixelLine(POINTS[index - 1], POINTS[index], WIDTH, COLOR);
                }
            }
        }
        // The time bar under the shield runs out as the newest shred wears off.
        const BAR_Y = BASE + HEIGHT * 0.16,
            BAR_HALF = SHIELD_WIDTH * 0.5;
        renderer.pixelLine({ x: CX - BAR_HALF, y: BAR_Y }, { x: CX + BAR_HALF, y: BAR_Y }, HEIGHT * 0.2, OUTLINE);
        renderer.pixelLine(
            { x: CX - BAR_HALF, y: BAR_Y },
            { x: CX - BAR_HALF + 2 * BAR_HALF * LEFT_FRACTION, y: BAR_Y },
            HEIGHT * 0.1,
            FILL,
        );
        drawGlyphText(renderer, TEXT, LEFT + SHIELD_WIDTH + GAP + TEXT_WIDTH / 2, BASE, HEIGHT * 0.82, FILL, OUTLINE);
    }
}
