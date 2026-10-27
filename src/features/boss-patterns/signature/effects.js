import { WORLD_DEPTH_PROJECTION, WORLD_HEIGHT_PROJECTION } from '../../../vector-sockets.js';

// Hand-drawn element effects of the five signature skills. Every particle is a pure function of the time since the
// effect began (hash-seeded), so nothing is stored between frames and a replay always looks the same.
const TAU = Math.PI * 2;
function clamp(value, low = 0, high = 1) {
    return Math.min(high, Math.max(low, value));
}
function outBack(t) {
    return 1 + 2.9 * (t - 1) ** 3 + 1.9 * (t - 1) ** 2;
}
export function rand(index, seed = 0) {
    const X = Math.sin(index * 127.1 + seed * 311.7 + 0.5) * 43758.5453;
    return X - Math.floor(X);
}

// World positions in, flat shapes out. `alpha` multiplies whatever the frame had when the brush was made.
class Brush {
    constructor(renderer) {
        this.renderer = renderer;
        this.c = renderer.ctx;
        this.base = this.c.globalAlpha;
        this.scale = renderer.scale;
    }
    done() {
        this.add(false);
        this.c.globalAlpha = this.base;
    }
    // Light adds up where it overlaps: glow, sparks and bolts are drawn with the additive operation.
    add(on) {
        const MODE = on ? 'lighter' : 'source-over';
        if (this.c.globalCompositeOperation !== MODE) {
            this.c.globalCompositeOperation = MODE;
        }
    }
    at(x, y, z = 0) {
        return this.renderer.project(x, y, z);
    }
    dot(x, y, z, radius, color, alpha) {
        const P = this.at(x, y, z);
        this.c.globalAlpha = this.base * alpha;
        this.c.fillStyle = color;
        this.c.beginPath();
        this.c.ellipse(P.x, P.y, Math.max(0.6, radius * this.scale), Math.max(0.6, radius * this.scale), 0, 0, TAU);
        this.c.fill();
    }
    flat(x, y, radiusX, radiusY, color, alpha, outline = null, width = 0.06) {
        const P = this.at(x, y);
        this.c.globalAlpha = this.base * alpha;
        this.c.beginPath();
        this.c.ellipse(
            P.x,
            P.y,
            Math.max(0.6, radiusX * this.scale),
            Math.max(0.6, radiusY * this.scale * 0.62),
            0,
            0,
            TAU,
        );
        if (color) {
            this.c.fillStyle = color;
            this.c.fill();
        }
        if (outline) {
            this.c.strokeStyle = outline;
            this.c.lineWidth = width * this.scale;
            this.c.stroke();
        }
    }
    poly(points, fill, alpha, stroke = null, width = 1.4) {
        this.c.globalAlpha = this.base * alpha;
        this.c.beginPath();
        points.forEach((point, index) =>
            index ? this.c.lineTo(point[0], point[1]) : this.c.moveTo(point[0], point[1]),
        );
        this.c.closePath();
        if (fill) {
            this.c.fillStyle = fill;
            this.c.fill();
        }
        if (stroke) {
            this.c.strokeStyle = stroke;
            this.c.lineWidth = width;
            this.c.lineJoin = 'round';
            this.c.stroke();
        }
    }
    // A flat flame packet: a four-cornered sliver pointing along `angle` (screen).
    sliver(x, y, z, size, angle, color, alpha) {
        const P = this.at(x, y, z),
            S = size * this.scale,
            COS = Math.cos(angle),
            SIN = Math.sin(angle),
            CORNERS = [
                [0.78, 0],
                [-0.48, -0.42],
                [-0.72, 0],
                [-0.48, 0.42],
            ];
        this.c.globalAlpha = this.base * alpha;
        this.c.fillStyle = color;
        this.c.beginPath();
        CORNERS.forEach(([cx, cy], index) => {
            const X = P.x + (cx * COS - cy * SIN) * S,
                Y = P.y + (cx * SIN + cy * COS) * S;
            if (index) {
                this.c.lineTo(X, Y);
            } else {
                this.c.moveTo(X, Y);
            }
        });
        this.c.closePath();
        this.c.fill();
    }
    stroke(points, width, color, alpha) {
        this.c.globalAlpha = this.base * alpha;
        this.c.strokeStyle = color;
        this.c.lineWidth = Math.max(1, width * this.scale);
        this.c.lineCap = 'round';
        this.c.lineJoin = 'round';
        this.c.beginPath();
        points.forEach((point, index) => (index ? this.c.lineTo(point.x, point.y) : this.c.moveTo(point.x, point.y)));
        this.c.stroke();
    }
    // Screen height of `z` world height units.
    lift(z) {
        return z * WORLD_HEIGHT_PROJECTION * this.scale;
    }
}

// ---------------------------------------------------------------- fire: a flat-packet breath (one burst per tick)
const FIRE_HOT = '#fff09a',
    FIRE_MID = '#ff9b32',
    FIRE_COOL = '#d94718';
function fireBurst(brush, event, seconds) {
    const HALF = event.sector / 2,
        MOUTH = event.radius * 0.85,
        SEED = event.tick ?? 1,
        PACKETS = [];
    for (let index = 0; index < 90; index++) {
        const DELAY = rand(index, SEED + 1) * 0.2,
            LIFE = 0.42 + 0.14 * rand(index, SEED + 2),
            Q = (seconds - DELAY) / LIFE;
        if (Q < 0 || Q > 1) {
            continue;
        }
        const U = rand(index, SEED + 3) * 2 - 1,
            EDGE = rand(index, SEED + 4) < 0.14,
            OFFSET =
                (EDGE ? Math.sign(U || 1) * (0.86 + 0.12 * rand(index, SEED + 5)) : Math.sign(U) * Math.abs(U) ** 0.9) *
                    HALF +
                Math.sin(Q * TAU + rand(index, SEED + 6) * 6) * HALF * 0.03,
            TRAVEL = Q ** 0.94,
            DIST = MOUTH + (event.reach * (0.98 + 0.16 * rand(index, SEED + 7)) - MOUTH) * TRAVEL,
            ANGLE = event.angle + OFFSET,
            CENTER = 1 - Math.min(1, Math.abs(OFFSET) / HALF);
        PACKETS.push({
            q: Q,
            x: event.x + Math.cos(ANGLE) * DIST,
            y: event.y + Math.sin(ANGLE) * DIST,
            z: 1.6 * (1 - TRAVEL) + 0.4 + Math.sin(Q * Math.PI) * 1.4 * rand(index, SEED + 9),
            size: (0.55 + 0.9 * Math.sin(Math.PI * Q)) * (0.7 + 0.3 * CENTER) * (0.7 + 0.6 * rand(index, SEED + 8)),
            alpha: (0.55 + 0.4 * CENTER) * clamp(Q / 0.05) * clamp((1 - Q) / 0.14),
            heading: Math.atan2(-WORLD_DEPTH_PROJECTION * Math.sin(ANGLE), Math.cos(ANGLE)),
        });
    }
    const SCORCH = clamp(seconds / 0.4) * (1 - clamp((seconds - 0.4) / 0.4));
    brush.flat(
        event.x + Math.cos(event.angle) * event.reach * 0.62,
        event.y + Math.sin(event.angle) * event.reach * 0.62,
        event.reach * 0.28,
        event.reach * 0.28,
        '#ff6a1e',
        0.16 * SCORCH,
    );
    const SMOKE = [];
    for (let index = 0; index < 8; index++) {
        const Q = (seconds - 0.2 - rand(index, SEED + 11) * 0.2) / 0.6;
        if (Q >= 0 && Q <= 1) {
            const ANGLE = event.angle + (rand(index, SEED + 12) * 2 - 1) * HALF * 0.8,
                DIST = event.reach * (0.5 + 0.5 * rand(index, SEED + 13));
            SMOKE.push({ q: Q, x: event.x + Math.cos(ANGLE) * DIST, y: event.y + Math.sin(ANGLE) * DIST });
            brush.dot(
                SMOKE.at(-1).x,
                SMOKE.at(-1).y,
                0.8 + Q * 2,
                0.35 + 0.5 * Q,
                '#1d1612',
                0.2 * Math.sin(Q * Math.PI),
            );
        }
    }
    for (const PACKET of PACKETS) {
        brush.sliver(
            PACKET.x,
            PACKET.y,
            PACKET.z,
            PACKET.size,
            PACKET.heading,
            PACKET.q < 0.24 ? FIRE_HOT : PACKET.q < 0.58 ? FIRE_MID : FIRE_COOL,
            PACKET.alpha,
        );
    }
    // The glow of the hot packets, the muzzle flash and the sparks add up where they overlap.
    brush.add(true);
    for (const PACKET of PACKETS) {
        if (PACKET.q < 0.3) {
            brush.dot(PACKET.x, PACKET.y, PACKET.z, PACKET.size * 1.7, '#ff8a28', PACKET.alpha * 0.2);
        }
    }
    const MUZZLE = 1 - clamp(seconds / 0.32);
    if (MUZZLE > 0) {
        const X = event.x + Math.cos(event.angle) * MOUTH,
            Y = event.y + Math.sin(event.angle) * MOUTH;
        brush.dot(X, Y, 1.4, 1.5 * MUZZLE + 0.3, '#ff8a28', 0.3 * MUZZLE);
        brush.dot(X, Y, 1.4, 0.8 * MUZZLE + 0.2, '#ffe9a0', 0.6 * MUZZLE);
    }
    for (const SPARK of SMOKE) {
        brush.dot(SPARK.x, SPARK.y, 0.5 + SPARK.q * 2.6, 0.12, '#ffd070', 0.9 * (1 - SPARK.q));
    }
}

// ----------------------------------------------------- grass: tapered green sprouts that burst from the ground
const GRASS_BODY = '#7fd24a',
    GRASS_DARK = '#2d6a1c',
    GRASS_LEAF = '#6cc23c',
    GRASS_MAIN = '#6fcf3e';
function leaf(brush, x, y, angle, size, fill) {
    const COS = Math.cos(angle),
        SIN = Math.sin(angle),
        PTS = [
            [0, 0],
            [size * 0.55, -size * 0.34],
            [size * 1.7, -size * 0.06],
            [size * 0.6, size * 0.3],
        ].map(([lx, ly]) => [x + lx * COS - ly * SIN, y + lx * SIN + ly * COS]);
    brush.poly(PTS, fill, 1, GRASS_DARK, 1.2);
}
function sprout(brush, x, y, height, width, lean, seconds, seed, fill, alpha) {
    const BASE = brush.at(x, y),
        PX = brush.lift(height),
        SEGMENTS = 9,
        LEFT = [],
        RIGHT = [],
        MIDS = [];
    for (let index = 0; index <= SEGMENTS; index++) {
        const F = index / SEGMENTS,
            HALF = width * brush.scale * (1 - F) ** 0.8 + 0.4,
            CX = BASE.x + Math.sin(seed + seconds * 5 + F * 3) * PX * 0.05 * F + lean * PX * F * F,
            CY = BASE.y - PX * F;
        LEFT.push([CX - HALF, CY]);
        RIGHT.push([CX + HALF, CY]);
        MIDS.push([CX, CY]);
    }
    const OUTLINE = [...LEFT, ...RIGHT.reverse()];
    brush.poly(OUTLINE, fill, alpha, GRASS_DARK, 2);
    if (PX > brush.scale * 1.4) {
        const A = MIDS[4],
            SIZE = Math.max(7, width * brush.scale * 1.6);
        leaf(brush, A[0], A[1], -2.7, SIZE, GRASS_LEAF);
        leaf(brush, A[0], A[1], -0.45, SIZE, GRASS_LEAF);
    }
    leaf(brush, MIDS[SEGMENTS][0], MIDS[SEGMENTS][1], -Math.PI / 2, Math.max(6, width * brush.scale * 1.3), '#c0f580');
}
function grassEruption(brush, event, seconds) {
    const R = event.reach,
        UP = clamp(seconds / 0.18) * (1 - clamp((seconds - 0.8) / 0.4)),
        RING = clamp(seconds / 0.5),
        FADE = seconds > 0.85 ? 1 - clamp((seconds - 0.85) / 0.5) : 1;
    brush.flat(event.x, event.y, R * 0.62 * UP, R * 0.62 * UP, '#4a3720', 0.9);
    brush.flat(event.x, event.y, R * 0.45 * UP, R * 0.45 * UP, '#6b4f2c', 0.9);
    if (RING < 1) {
        brush.flat(
            event.x,
            event.y,
            R * (0.3 + 0.95 * RING),
            R * (0.3 + 0.95 * RING),
            null,
            0.8 * (1 - RING),
            '#fff0c8',
            0.1,
        );
    }
    const SPOTS = [];
    for (let index = 0; index < 7; index++) {
        const ANGLE = (index / 7) * TAU + 0.4,
            DIST = R * (0.55 + 0.35 * rand(index, 8));
        SPOTS.push({ x: event.x + Math.cos(ANGLE) * DIST, y: event.y + Math.sin(ANGLE) * DIST, index });
    }
    SPOTS.push({ x: event.x, y: event.y, index: 99 });
    SPOTS.sort((a, b) => b.y - a.y);
    for (const SPOT of SPOTS) {
        const MAIN = SPOT.index === 99,
            L = clamp((seconds - (MAIN ? 0 : 0.06 + SPOT.index * 0.03)) / 0.5);
        if (L <= 0 || FADE <= 0) {
            continue;
        }
        const HEIGHT = (MAIN ? 7.6 : 2.6 + 2 * rand(SPOT.index, 2)) * (L < 1 ? outBack(L) : 1) * FADE,
            WIDTH = MAIN ? 0.75 : 0.3 + 0.08 * rand(SPOT.index, 3);
        brush.flat(SPOT.x, SPOT.y, WIDTH * 2.2, WIDTH * 2.2, '#4a3720', 0.9 * FADE);
        sprout(
            brush,
            SPOT.x,
            SPOT.y,
            HEIGHT,
            WIDTH,
            ((SPOT.x - event.x) / R) * 0.15,
            seconds,
            SPOT.index,
            MAIN ? GRASS_MAIN : GRASS_BODY,
            Math.min(1, FADE * 1.4),
        );
    }
    for (let index = 0; index < 7; index++) {
        const T = seconds - rand(index, 2) * 0.12;
        if (T < 0 || T > 0.7) {
            continue;
        }
        const K = T / 0.7,
            ANGLE = rand(index, 1) * TAU,
            DIST = R * (0.2 + 0.9 * rand(index, 3)) * K;
        brush.dot(
            event.x + Math.cos(ANGLE) * DIST,
            event.y + Math.sin(ANGLE) * DIST,
            K * 0.6,
            0.25 + 0.45 * K,
            '#e7d4b0',
            0.65 * (1 - K),
        );
    }
    for (let index = 0; index < 12; index++) {
        const T = seconds - 0.02;
        if (T < 0 || T > 1) {
            continue;
        }
        const ANGLE = rand(index, 1) * TAU,
            SPEED = (0.8 + 2 * rand(index, 2)) * T,
            LIFT = (3 + 4 * rand(index, 3)) * T - 9 * T * T;
        if (LIFT < 0) {
            continue;
        }
        brush.dot(
            event.x + Math.cos(ANGLE) * SPEED,
            event.y + Math.sin(ANGLE) * SPEED * 0.5,
            LIFT,
            index % 2 ? 0.1 : 0.14,
            index % 2 ? '#8fe05a' : '#8a6a3c',
            1 - T,
        );
    }
}

// ----------------------------------------------- water: a jet made of hundreds of droplets, a splash at its end
const WATER_DARK = '#2f86d6',
    WATER_MID = '#4cb0f2',
    WATER_LIGHT = '#6ac4fa',
    WATER_SPARK = '#f2fbff';
function waterJet(brush, event, seconds) {
    const COS = Math.cos(event.angle),
        SIN = Math.sin(event.angle),
        REACH = event.reach,
        START = event.radius * 0.85,
        EXTENT = REACH + 1.4,
        WIDTH = event.width,
        DROPS = [];
    for (let index = 0; index < 220; index++) {
        const LIFE = 0.34 + 0.2 * rand(index, 3),
            DELAY = rand(index, 4) * 0.34,
            Q = (seconds - DELAY) / LIFE;
        if (Q < 0 || Q > 1) {
            continue;
        }
        const ALONG = START + (EXTENT - START) * Q,
            SPREAD = (rand(index, 1) * 2 - 1) * WIDTH * (0.35 + 0.65 * Math.min(1, Q * 1.6)),
            TURBULENCE = Math.sin(Q * 14 + rand(index, 2) * 6 + seconds * 22) * 0.12 * (0.3 + Q),
            ARC = Math.sin(Q * Math.PI) * (0.3 + 1.1 * rand(index, 5));
        let along = ALONG,
            lift = 0.9 + ARC,
            across = SPREAD + TURBULENCE;
        if (ALONG > REACH) {
            const E = (ALONG - REACH) / 1.4;
            along = REACH + E * 0.9 * (rand(index, 6) - 0.3);
            lift = 0.9 + Math.sin(E * Math.PI * 0.9) * (1 + 2 * rand(index, 7));
            across = SPREAD * (1 + E);
        }
        DROPS.push({
            x: event.x + COS * along - SIN * across,
            y: event.y + SIN * along + COS * across,
            z: lift,
            r: (0.22 + 0.26 * rand(index, 8)) * (ALONG > REACH ? 0.7 : 1),
            a: clamp(Q / 0.04) * (1 - clamp((Q - 0.9) / 0.1)),
            tone: rand(index, 9),
        });
    }
    for (const DROP of DROPS) {
        brush.dot(DROP.x, DROP.y, DROP.z, DROP.r * 1.7, WATER_DARK, 0.4 * DROP.a);
    }
    for (const DROP of DROPS) {
        brush.dot(DROP.x, DROP.y, DROP.z, DROP.r, DROP.tone > 0.5 ? WATER_MID : WATER_LIGHT, 0.82 * DROP.a);
    }
    brush.add(true);
    for (const DROP of DROPS) {
        brush.dot(DROP.x - DROP.r * 0.3, DROP.y, DROP.z + DROP.r * 0.5, DROP.r * 0.38, WATER_SPARK, 0.9 * DROP.a);
    }
    brush.add(false);
    const SPLASH = clamp((seconds - 0.28) / 0.7),
        TX = event.x + COS * REACH,
        TY = event.y + SIN * REACH;
    for (let ring = 0; ring < 3; ring++) {
        const Q = clamp(SPLASH * 1.15 - ring * 0.12);
        if (Q > 0 && Q < 1) {
            const RADIUS = 1 + Q * (4.5 + ring);
            brush.flat(TX, TY, RADIUS, RADIUS, null, (1 - Q) * 0.85, '#d2f0ff', 0.16 * (1 - Q) + 0.05);
        }
    }
    for (let index = 0; index < 28; index++) {
        const T = (seconds - 0.2 - rand(index, 22) * 0.35) / 0.55;
        if (T < 0 || T > 1) {
            continue;
        }
        const ANGLE = rand(index, 1) * TAU,
            SPEED = 2 + 5 * rand(index, 2),
            HEIGHT = (3 + 4 * rand(index, 3)) * T - 9 * T * T;
        if (HEIGHT >= 0) {
            brush.dot(
                TX + Math.cos(ANGLE) * SPEED * T,
                TY + Math.sin(ANGLE) * SPEED * T * 0.5,
                HEIGHT,
                0.12 + 0.12 * rand(index, 4),
                index % 2 ? WATER_LIGHT : WATER_SPARK,
                1 - T * T,
            );
        }
    }
    const POOL = clamp((seconds - 0.4) / 0.5) * (1 - clamp((seconds - 0.8) / 0.4));
    brush.flat(TX, TY, 2.4, 2.4, '#3c8cd2', 0.28 * POOL, '#bee9ff', 0.05);
}

// --------------------------------------- ice: a ring of thick, frosted crystals with white rime and a shattered end
const ICE_BODY = '#bfe0f3',
    ICE_SHADE = '#7fb5df',
    ICE_LIGHT = '#eaf7fd',
    ICE_OUTLINE = '#4f86b0',
    ICE_RIME = '#f3fbff';
function crystal(brush, x, y, height, width, lean, seed, alpha) {
    const BASE = brush.at(x, y),
        H = brush.lift(height),
        W = width * brush.scale,
        SHOULDER = H * 0.68,
        TIP_X = BASE.x + lean * H,
        TIP_Y = BASE.y - H,
        SL = [BASE.x - W * 0.92 + lean * H * 0.3, BASE.y - SHOULDER],
        SR = [BASE.x + W * 0.92 + lean * H * 0.3, BASE.y - SHOULDER],
        TOP_L = [TIP_X - W * 0.22, TIP_Y + H * 0.07],
        TOP_R = [TIP_X + W * 0.22, TIP_Y + H * 0.07];
    brush.flat(x, y, width * 1.7, width * 1.7, ICE_RIME, alpha * 0.8, '#9cc6e6', 0.04);
    brush.poly(
        [[BASE.x - W, BASE.y], SL, TOP_L, [TIP_X, TIP_Y], TOP_R, SR, [BASE.x + W, BASE.y]],
        ICE_BODY,
        alpha,
        ICE_OUTLINE,
        1.6,
    );
    brush.poly(
        [[BASE.x + W * 0.12, BASE.y], [TIP_X + W * 0.02, TIP_Y], TOP_R, SR, [BASE.x + W, BASE.y]],
        ICE_SHADE,
        alpha * 0.75,
    );
    brush.poly(
        [[BASE.x - W, BASE.y], SL, TOP_L, [TIP_X - W * 0.15, TIP_Y + H * 0.06], [BASE.x - W * 0.2, BASE.y - H * 0.32]],
        ICE_LIGHT,
        alpha * 0.7,
    );
    brush.poly([SL, TOP_L, [TIP_X, TIP_Y], TOP_R, SR, [BASE.x, BASE.y - H * 0.5]], '#ffffff', alpha * 0.45);
    brush.stroke(
        [
            { x: BASE.x - W * 0.35, y: BASE.y - H * 0.05 },
            { x: BASE.x - W * 0.2 + (rand(seed, 5) - 0.5) * W * 0.6, y: BASE.y - H * 0.3 },
            { x: BASE.x - W * 0.3 + (rand(seed, 6) - 0.5) * W * 0.6, y: BASE.y - H * 0.55 },
        ],
        0.03,
        '#ffffff',
        alpha * 0.85,
    );
    brush.stroke(
        [
            { x: BASE.x - W * 0.7, y: BASE.y - H * 0.14 },
            { x: BASE.x - W * 0.66 + lean * H * 0.2, y: BASE.y - SHOULDER },
        ],
        Math.max(0.03, width * 0.14),
        '#ffffff',
        alpha * 0.9,
    );
}
function iceRing(brush, event, seconds) {
    const R = event.reach,
        FROST = clamp(seconds / 0.3) * (1 - clamp((seconds - 0.8) / 0.4));
    brush.flat(event.x, event.y, R * 0.96, R * 0.96, '#e6f6ff', 0.26 * FROST, '#bfe3fa', 0.08);
    const SPOTS = [];
    for (let index = 0; index < 20; index++) {
        const ANGLE = (index / 20) * TAU + rand(index, 1) * 0.25,
            DIST = R * (0.5 + 0.45 * rand(index, 2));
        SPOTS.push({ x: event.x + Math.cos(ANGLE) * DIST, y: event.y + Math.sin(ANGLE) * DIST, index, dist: DIST });
    }
    SPOTS.sort((a, b) => b.y - a.y);
    for (const SPOT of SPOTS) {
        const L = seconds - (SPOT.dist / R) * 0.28 - rand(SPOT.index, 3) * 0.05;
        if (L < 0) {
            continue;
        }
        const SHATTER = clamp((seconds - 0.7 - (SPOT.dist / R) * 0.1) / 0.3);
        if (SHATTER >= 1) {
            continue;
        }
        const BIG = SPOT.index % 3 === 0,
            HEIGHT =
                (BIG ? 4.6 + 1.2 * rand(SPOT.index, 4) : 2.7 + 1 * rand(SPOT.index, 5)) *
                outBack(clamp(L / 0.22)) *
                (1 - SHATTER * 0.5),
            WIDTH = (BIG ? 1.1 : 0.72) * (1 - SHATTER * 0.3);
        crystal(
            brush,
            SPOT.x,
            SPOT.y,
            HEIGHT,
            WIDTH,
            (rand(SPOT.index, 6) - 0.5) * 0.25,
            SPOT.index,
            1 - SHATTER * SHATTER,
        );
        if (SHATTER > 0) {
            for (let piece = 0; piece < 3; piece++) {
                const ANGLE = rand(SPOT.index * 9 + piece, 5) * TAU,
                    SPEED = 1 + 1.6 * rand(SPOT.index * 9 + piece, 6);
                brush.dot(
                    SPOT.x + Math.cos(ANGLE) * SPEED * SHATTER,
                    SPOT.y + Math.sin(ANGLE) * SPEED * SHATTER * 0.5,
                    HEIGHT * 0.4 + SHATTER * 1.5 - 4 * SHATTER * SHATTER,
                    0.14,
                    piece % 2 ? '#ffffff' : '#a9d3ee',
                    1 - SHATTER,
                );
            }
        }
    }
    for (let index = 0; index < 22; index++) {
        const Q = (seconds - rand(index, 7) * 0.5) / 0.9;
        if (Q < 0 || Q > 1) {
            continue;
        }
        const ANGLE = rand(index, 8) * TAU,
            DIST = R * Math.sqrt(rand(index, 9));
        brush.dot(
            event.x + Math.cos(ANGLE) * DIST,
            event.y + Math.sin(ANGLE) * DIST,
            3.5 - Q * 3,
            0.07 + 0.05 * rand(index, 10),
            '#ffffff',
            Math.sin(Q * Math.PI),
        );
    }
}

// ------------------------------------------ lightning: a strike from above plus a forked arc between two bodies
const BOLT_LAYERS = [
    { width: 0.34, color: '#397b94', alpha: 0.45 },
    { width: 0.15, color: '#7fd0ff', alpha: 0.85 },
    { width: 0.07, color: '#f3fcff', alpha: 1 },
];
function boltPoints(brush, from, to, seed, depth, out) {
    const A = brush.at(from.x, from.y, from.z),
        B = brush.at(to.x, to.y, to.z),
        DX = B.x - A.x,
        DY = B.y - A.y,
        LENGTH = Math.hypot(DX, DY) || 1,
        STEPS = Math.max(3, Math.floor(LENGTH / (brush.scale * 0.55))),
        AMP = Math.min(brush.scale * 1.1, LENGTH * 0.13),
        POINTS = [A];
    for (let step = 1; step < STEPS; step++) {
        const F = step / STEPS,
            OFFSET = (rand(step + seed * 13, seed) - 0.5) * 2 * AMP * Math.sin(F * Math.PI);
        POINTS.push({ x: A.x + DX * F - (DY / LENGTH) * OFFSET, y: A.y + DY * F + (DX / LENGTH) * OFFSET });
    }
    POINTS.push(B);
    out.push(POINTS);
    if (depth > 0) {
        for (let step = 2; step < STEPS - 1; step += 2) {
            if (rand(step + seed * 5, seed + 2) < 0.45) {
                const P = POINTS[step],
                    ANGLE = (rand(step, seed + 3) - 0.5) * 1.8,
                    LEN = LENGTH * (0.18 + 0.2 * rand(step, seed + 4));
                out.push([
                    P,
                    {
                        x: P.x + Math.sin(ANGLE) * LEN * 0.6,
                        y: P.y + Math.cos(ANGLE) * LEN * 0.8 * (rand(step, seed) > 0.5 ? 1 : -0.4),
                    },
                ]);
            }
        }
    }
}
function strokeBolt(brush, paths, alpha, thick) {
    for (const LAYER of BOLT_LAYERS) {
        for (const PATH of paths) {
            brush.stroke(PATH, LAYER.width * thick, LAYER.color, alpha * LAYER.alpha);
        }
    }
}
function lightningHop(brush, event, seconds) {
    const FADE = (1 - clamp(seconds / 0.34)) ** 1.5,
        FLICKER = Math.floor(seconds * 30) + event.hop * 7,
        STRIKE = [],
        ARC = [],
        FROM = { x: event.x, y: event.y, z: 1 },
        TO = { x: event.toX, y: event.toY, z: 0.8 },
        RING = clamp(seconds / 0.26);
    brush.flat(event.toX, event.toY, 1.9, 1.9, '#1a1d2a', 0.22 * FADE);
    brush.flat(
        event.toX,
        event.toY,
        0.4 + 2.2 * RING,
        0.4 + 2.2 * RING,
        null,
        (1 - RING) * 0.9,
        '#c8ebff',
        0.12 * (1 - RING) + 0.04,
    );
    boltPoints(brush, { x: event.toX, y: event.toY, z: 7 }, TO, FLICKER, 2, STRIKE);
    boltPoints(brush, FROM, TO, FLICKER + 41, 1, ARC);
    // Bolts, their glow and the sparks are light: overlapping layers brighten instead of covering each other.
    brush.add(true);
    brush.dot(event.toX, event.toY, 0.8, 1.9 * FADE + 0.3, '#3a8ad8', 0.34 * FADE);
    strokeBolt(brush, STRIKE, FADE, 1.1);
    strokeBolt(brush, ARC, FADE, 0.9);
    for (let index = 0; index < 9; index++) {
        const ANGLE = rand(index + event.hop * 11, 1) * TAU,
            SPEED = (2 + 5 * rand(index, 2)) * seconds,
            HEIGHT = 0.8 + 4 * rand(index, 3) * seconds - 14 * seconds * seconds;
        brush.dot(
            event.toX + Math.cos(ANGLE) * SPEED,
            event.toY + Math.sin(ANGLE) * SPEED * 0.5,
            Math.max(0, HEIGHT),
            0.09,
            '#e6f6ff',
            FADE,
        );
    }
}

export const SIGNATURE_EFFECTS = Object.freeze({
    1: Object.freeze({ lifeMs: 800, draw: fireBurst }),
    2: Object.freeze({ lifeMs: 1100, draw: iceRing }),
    3: Object.freeze({ lifeMs: 1400, draw: grassEruption }),
    4: Object.freeze({ lifeMs: 360, draw: lightningHop }),
    5: Object.freeze({ lifeMs: 1000, draw: waterJet }),
});
export function drawSignatureEffect(renderer, event, progress, lifeMs) {
    const BRUSH = new Brush(renderer);
    SIGNATURE_EFFECTS[event.element].draw(BRUSH, event, (progress * lifeMs) / 1000);
    BRUSH.done();
}

// ------------------------------------------------- windup: small signs of the coming skill inside the danger area
function windupFire(brush, area, progress, seconds) {
    brush.add(true);
    for (let index = 0; index < 18; index++) {
        const Q = (seconds * 0.9 + rand(index, 1)) % 1,
            ANGLE = area.angle + (rand(index, 2) * 2 - 1) * (area.sector / 2) * 0.9,
            DIST = area.reach * (0.15 + 0.85 * rand(index, 3)) * progress;
        brush.dot(
            area.x + Math.cos(ANGLE) * DIST,
            area.y + Math.sin(ANGLE) * DIST,
            0.4 + Q * 1.6,
            0.1,
            '#ffaa3c',
            (1 - Q) * 0.9 * progress,
        );
    }
}
function windupGrass(brush, area, progress, seconds) {
    for (let index = 0; index < 5; index++) {
        const G = clamp((progress - 0.15 - index * 0.1) / 0.35);
        if (G <= 0) {
            continue;
        }
        const ANGLE = (index / 5) * TAU + 0.3,
            DIST = area.reach * (0.4 + 0.5 * rand(index, 3)),
            X = area.x + Math.cos(ANGLE) * DIST,
            Y = area.y + Math.sin(ANGLE) * DIST;
        brush.flat(X, Y, 0.3 * G, 0.3 * G, '#4a3720', 0.9);
        sprout(brush, X, Y, 0.6 + 0.6 * G, 0.12, Math.sin(seconds * 10 + index) * 0.2, seconds, index, GRASS_BODY, 1);
    }
}
function windupWater(brush, area, progress, seconds) {
    const COS = Math.cos(area.angle),
        SIN = Math.sin(area.angle);
    for (let index = 0; index < 14; index++) {
        const Q = (seconds * 0.8 + rand(index, 1)) % 1,
            ALONG = area.reach * Math.min(1, progress + 0.15) * (0.1 + 0.9 * rand(index, 2)),
            ACROSS = (rand(index, 3) * 2 - 1) * area.width * 0.9;
        brush.dot(
            area.x + COS * ALONG - SIN * ACROSS,
            area.y + SIN * ALONG + COS * ACROSS,
            0.5 + Q * 0.8,
            0.07 + 0.08 * rand(index, 4),
            '#cfeeff',
            Math.sin(Q * Math.PI) * 0.85,
        );
    }
}
function windupIce(brush, area, progress) {
    brush.flat(area.x, area.y, area.reach * progress, area.reach * progress, '#e6f6ff', 0.2, '#cfeaff', 0.06);
    for (let index = 0; index < 8; index++) {
        const G = clamp((progress - index * 0.06) / 0.3);
        if (G > 0) {
            const ANGLE = (index / 8) * TAU + 0.2,
                DIST = area.reach * (0.5 + 0.4 * rand(index, 2));
            crystal(
                brush,
                area.x + Math.cos(ANGLE) * DIST,
                area.y + Math.sin(ANGLE) * DIST,
                0.7 * G,
                0.22,
                0,
                index,
                1,
            );
        }
    }
}
function windupLightning(brush, area, progress, seconds) {
    brush.add(true);
    const FLICKER = Math.floor(seconds * 14);
    for (let index = 0; index < 4; index++) {
        const A0 = seconds * 3 + (index * TAU) / 4,
            PATH = [];
        for (let step = 0; step <= 6; step++) {
            const A = A0 + step * 0.07,
                R = area.reach * (1 + (rand(step + index * 9 + FLICKER, 2) - 0.5) * 0.18);
            PATH.push(brush.at(area.x + Math.cos(A) * R, area.y + Math.sin(A) * R, 0.1));
        }
        strokeBolt(brush, [PATH], 0.7 * progress, 0.55);
    }
    brush.dot(area.x, area.y, 6, 1.4 * progress, '#7fd0ff', 0.3 * progress);
}
const WINDUPS = Object.freeze({ 1: windupFire, 2: windupIce, 3: windupGrass, 4: windupLightning, 5: windupWater });
export function drawSignatureWindup(renderer, element, area) {
    const BRUSH = new Brush(renderer);
    WINDUPS[element](BRUSH, area, clamp(area.progress), area.elapsed ?? 0);
    BRUSH.done();
}
