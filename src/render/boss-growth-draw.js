import { ELEMENTS } from '../model/lineage.js';
import { bossLeafCount, bossAuraLevel, BOSS_LEAF_ANGLES } from '../tower/boss-growth.js';
import { faceAnchor, posedFace, POSED } from './unit-face-draw.js';

// Where the extra leaves grow and how big the aura is, in the sprout body's own canvas (320 x 350).
const LEAF_BASE = Object.freeze([160, 168]),
    LEAF_SCALE = 1.5,
    AURA_CENTER_Y_FROM_EYES = 20,
    AURA_RINGS = Object.freeze([150, 178, 206]),
    LEAF_FILL = '#7bc96f',
    LEAF_INK = '#1b2410';

// The leaf outline, pointing up from its base, as one closed path.
function leafPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-16, -24, -10, -50, 0, -64);
    ctx.bezierCurveTo(10, -50, 16, -24, 0, 0);
    ctx.closePath();
}
function disc(ctx, cx, cy, radius) {
    const K = radius * 0.5522847498;
    ctx.beginPath();
    ctx.moveTo(cx + radius, cy);
    ctx.bezierCurveTo(cx + radius, cy + K, cx + K, cy + radius, cx, cy + radius);
    ctx.bezierCurveTo(cx - K, cy + radius, cx - radius, cy + K, cx - radius, cy);
    ctx.bezierCurveTo(cx - radius, cy - K, cx - K, cy - radius, cx, cy - radius);
    ctx.bezierCurveTo(cx + K, cy - radius, cx + radius, cy - K, cx + radius, cy);
    ctx.closePath();
}

// Draws the boss's growth behind its body: an element aura from floor 10 and extra leaves that peek out around the head.
// Call before the body is submitted; it follows the body's squash and lean the same way the face does.
export function drawBossGrowth(ctx, record, player, matrix, element, floor, alpha = 1) {
    const LEAVES = bossLeafCount(floor),
        AURA = bossAuraLevel(floor);
    if (LEAVES <= 1 && AURA <= 0) {
        return;
    }
    const REST = faceAnchor(record.compiled),
        P = posedFace(player, REST, POSED),
        COLOR = ELEMENTS[element]?.color;
    ctx.save();
    ctx.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
    ctx.transform(P[0], P[1], P[2], P[3], P[4], P[5]);
    if (AURA > 0 && COLOR) {
        const CENTER_Y = REST.eyeLeft[1] + AURA_CENTER_Y_FROM_EYES;
        ctx.fillStyle = COLOR;
        for (const [INDEX, RADIUS] of AURA_RINGS.entries()) {
            ctx.globalAlpha = alpha * AURA * (0.1 + INDEX * 0.05);
            disc(ctx, (REST.eyeLeft[0] + REST.eyeRight[0]) / 2, CENTER_Y, RADIUS);
            ctx.fill();
        }
    }
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    // The sprout's own leaf is the first one; the others fan out behind the head.
    for (let i = 1; i < LEAVES; i++) {
        ctx.save();
        ctx.translate(LEAF_BASE[0], LEAF_BASE[1]);
        ctx.rotate((BOSS_LEAF_ANGLES[i] * Math.PI) / 180);
        ctx.scale(LEAF_SCALE, LEAF_SCALE);
        leafPath(ctx);
        ctx.fillStyle = LEAF_FILL;
        ctx.fill();
        ctx.strokeStyle = LEAF_INK;
        ctx.lineWidth = 5 / LEAF_SCALE;
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}
