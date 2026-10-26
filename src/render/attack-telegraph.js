const TAU = Math.PI * 2,
    ARC_STEP = Math.PI / 36;
function point(out, count, x, y) {
    out[count * 2] = x;
    out[count * 2 + 1] = y;
    return count + 1;
}
function arc(out, count, x, y, r, start, end) {
    const SEGMENTS = Math.max(1, Math.ceil(Math.abs(end - start) / ARC_STEP));
    for (let i = 0; i <= SEGMENTS; i++) {
        const A = start + ((end - start) * i) / SEGMENTS;
        count = point(out, count, x + Math.cos(A) * r, y + Math.sin(A) * r);
    }
    return count;
}

// One boundary for a swept body capsule united with its (possibly larger)
// landing disk. Analytic intersections remove internal circle/rectangle seams;
// this is not a convex hull, which would invent danger beside the landing disk.
function bodyLandingContour(out, x, y, endX, endY, r, landingRadius) {
    const DX = endX - x,
        DY = endY - y,
        D = Math.hypot(DX, DY),
        ANGLE = Math.atan2(DY, DX),
        R = Math.max(r, landingRadius);
    if (D <= R - r + 1e-9) {
        return arc(out, 0, endX, endY, R, 0, TAU);
    }
    const JOIN = Math.sqrt(Math.max(0, R * R - r * r));
    let n = 0;
    if (D >= JOIN) {
        const A = Math.acos(-JOIN / R);
        n = arc(out, n, x, y, r, ANGLE - Math.PI / 2, ANGLE - Math.PI * 1.5);
        n = arc(out, n, endX, endY, R, ANGLE + A, ANGLE - A);
    } else {
        const CROSS = (r * r - R * R + D * D) / (2 * D),
            HEIGHT = Math.sqrt(Math.max(0, r * r - CROSS * CROSS));
        const SMALL = Math.atan2(HEIGHT, CROSS),
            LARGE = Math.atan2(HEIGHT, CROSS - D);
        n = arc(out, n, x, y, r, ANGLE - SMALL, ANGLE + SMALL - TAU);
        n = arc(out, n, endX, endY, R, ANGLE + LARGE, ANGLE - LARGE);
    }
    return n;
}

// Writes world XY coordinates into the caller's reusable buffer. The contour is
// the horizontal damage footprint; model height/airborne checks remain intact.
export function bossDangerContour(area, out) {
    let n = 0;
    if (area.kind === 'sweep') {
        return arc(out, 0, area.x, area.y, area.reach, 0, TAU);
    }
    if (area.kind === 'sector') {
        n = point(out, n, area.x, area.y);
        return arc(out, n, area.x, area.y, area.reach, area.angle - area.sector / 2, area.angle + area.sector / 2);
    }
    if (area.kind === 'charge') {
        return bodyLandingContour(out, area.x, area.y, area.endX, area.endY, area.width, area.width);
    }
    if (area.kind === 'leap') {
        return bodyLandingContour(out, area.x, area.y, area.targetX, area.targetY, area.width, area.reach);
    }
    return 0;
}
