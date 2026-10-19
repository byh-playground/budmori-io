import { UNIT_GRADES } from '../../unit-grades.js';

// Small flat-style drawing helpers shared by the farm mode effects. Everything is a solid fill or
// a plain stroke; alpha is the only blending used.
export const TAU = Math.PI * 2;
export function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
export function easeOut(t) {
    return 1 - (1 - clamp01(t)) ** 3;
}
// Rises past 1 at 60% then settles at 1, a quick pop used for hearts and sparkles.
export function pop(t) {
    const T = clamp01(t);
    return T < 0.6 ? Math.sin((T / 0.6) * Math.PI * 0.5) * 1.18 : 1.18 - 0.18 * ((T - 0.6) / 0.4);
}

export function rgba(hex, alpha) {
    const MATCH = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!MATCH) {
        return hex;
    }
    return `rgba(${parseInt(MATCH[1], 16)},${parseInt(MATCH[2], 16)},${parseInt(MATCH[3], 16)},${clamp01(alpha).toFixed(3)})`;
}
export function gradeColor(tier, fallback = '#58b9bb') {
    return UNIT_GRADES[tier - 1]?.outlineColor || fallback;
}

// Screen-space ellipse stroke, for rings that float above the ground such as the merge hole.
export function strokeArc(renderer, point, rx, ry, start, end, color, width) {
    const C = renderer.ctx;
    C.strokeStyle = color;
    C.lineWidth = Math.max(0.5, width);
    C.lineCap = 'round';
    C.beginPath();
    C.ellipse(point.x, point.y, Math.max(0.01, rx), Math.max(0.01, ry), 0, start, end);
    C.stroke();
}
// Four-point sparkle: a flat diamond cross.
export function drawSparkle(renderer, point, radius, color, rotation = 0) {
    const C = renderer.ctx,
        INNER = radius * 0.28,
        COS = Math.cos(rotation),
        SIN = Math.sin(rotation);
    C.fillStyle = color;
    C.beginPath();
    for (let i = 0; i < 8; i++) {
        const R = i % 2 === 0 ? radius : INNER,
            A = (i * Math.PI) / 4,
            X = Math.cos(A) * R,
            Y = Math.sin(A) * R;
        const PX = point.x + X * COS - Y * SIN,
            PY = point.y + X * SIN + Y * COS;
        if (i === 0) {
            C.moveTo(PX, PY);
        } else {
            C.lineTo(PX, PY);
        }
    }
    C.closePath();
    C.fill();
}
// Tapered ray from an inner to an outer point in screen space.
export function drawRay(renderer, from, to, halfWidth, color) {
    const C = renderer.ctx,
        DX = to.x - from.x,
        DY = to.y - from.y,
        LENGTH = Math.hypot(DX, DY) || 1,
        NX = (-DY / LENGTH) * halfWidth,
        NY = (DX / LENGTH) * halfWidth;
    C.fillStyle = color;
    C.beginPath();
    C.moveTo(from.x + NX, from.y + NY);
    C.lineTo(to.x, to.y);
    C.lineTo(from.x - NX, from.y - NY);
    C.closePath();
    C.fill();
}
