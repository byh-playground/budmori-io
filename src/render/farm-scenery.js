// The look of the places the troops fight and live in: the farm with the great tower behind it,
// and the tower's own hall. Everything is drawn from the farm's world coordinates; nothing here
// touches the simulation.
import { WORLD_HEIGHT_PROJECTION } from '../vector-sockets.js';
import { CONFIG } from '../model/farm-model.js';
import { towerTheme } from '../tower/tower-theme.js';

const { radiusX: RX, radiusY: RY } = CONFIG.farm.arena;
const { radiusX: HALL_RX, radiusY: HALL_RY } = CONFIG.farm.tower.arena;
const TAU = Math.PI * 2;
// Tower: stacked round tiers (radius, height) standing right behind the door in the fence.
const TIERS = [
    { r: 6.6, h: 7.5 },
    { r: 5.5, h: 7 },
    { r: 4.5, h: 6.5 },
    { r: 3.6, h: 6 },
    { r: 2.7, h: 4.5 },
];
const TOWER_Y = RY + TIERS[0].r - 0.4;
const HALL_WALL_HEIGHT = 9;

function seeded(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function mix(a, b, t) {
    return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}
function rgb(c, alpha = 1) {
    return alpha === 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

const RANDOM = seeded(20241);
const PATCHES = Array.from({ length: 34 }, (_, i) => ({
    x: (RANDOM() * 2 - 1) * RX,
    y: (RANDOM() * 2 - 1) * RY,
    rx: 2.5 + RANDOM() * 5,
    ry: 1.5 + RANDOM() * 3,
    color: i % 3 === 0 ? 'rgba(160,184,112,0.35)' : i % 3 === 1 ? 'rgba(226,235,172,0.38)' : 'rgba(132,166,104,0.22)',
}));
const TUFTS = Array.from({ length: 190 }, () => ({
    x: (RANDOM() * 2 - 1) * (RX - 0.6),
    y: (RANDOM() * 2 - 1) * (RY - 0.6),
    s: 0.7 + RANDOM() * 0.6,
}));
const FLOWER_COLORS = ['#f6f1ec', '#f4d35e', '#ee8fa6', '#b9a2e6'];
const FLOWERS = Array.from({ length: 70 }, () => ({
    x: (RANDOM() * 2 - 1) * (RX - 1),
    y: (RANDOM() * 2 - 1) * (RY - 1),
    color: FLOWER_COLORS[Math.floor(RANDOM() * FLOWER_COLORS.length)],
}));
const STONES = Array.from({ length: 16 }, () => ({
    x: (RANDOM() * 2 - 1) * (RX - 1),
    y: (RANDOM() * 2 - 1) * (RY - 1),
    s: 0.25 + RANDOM() * 0.3,
}));
// Trees stand outside the fence, never in front of the door.
const TREES = [];
for (let tries = 0; tries < 900 && TREES.length < 64; tries++) {
    const X = (RANDOM() * 2 - 1) * (RX + 11),
        Y = (RANDOM() * 2 - 1) * (RY + 10) + 2;
    const INSIDE = Math.abs(X) < RX + 2 && Math.abs(Y) < RY + 2,
        DOOR = Math.abs(X) < 11 && Y > RY - 2,
        CROWDED = TREES.some((t) => Math.hypot(t.x - X, t.y - Y) < 3.2);
    if (!INSIDE && !DOOR && !CROWDED) {
        TREES.push({ x: X, y: Y, s: 0.85 + RANDOM() * 0.55, shade: RANDOM() });
    }
}
TREES.sort((a, b) => b.y - a.y);
const BUSHES = Array.from({ length: 26 }, () => ({
    x: (RANDOM() * 2 - 1) * (RX + 3),
    y: (RANDOM() * 2 - 1) * (RY + 3),
    s: 0.6 + RANDOM() * 0.5,
}));
const SKY_STOPS = [
    { at: 0, top: [118, 190, 232], bottom: [190, 226, 242] },
    { at: 0.45, top: [226, 134, 110], bottom: [250, 200, 138] },
    { at: 1, top: [16, 22, 58], bottom: [52, 52, 108] },
];
function skyAt(floor) {
    const T = Math.min(1, Math.max(0, (floor - 1) / 99));
    const B = T <= SKY_STOPS[1].at ? 1 : 2,
        A = B - 1,
        K = (T - SKY_STOPS[A].at) / (SKY_STOPS[B].at - SKY_STOPS[A].at);
    return {
        top: mix(SKY_STOPS[A].top, SKY_STOPS[B].top, K),
        bottom: mix(SKY_STOPS[A].bottom, SKY_STOPS[B].bottom, K),
        night: T,
    };
}

class Painter {
    constructor(renderer) {
        this.r = renderer;
        this.c = renderer.ctx;
        this.s = renderer.scale;
    }
    p(x, y, z = 0) {
        return this.r.project(x, y, z);
    }
    poly(points, fill, stroke = null, width = 1) {
        const C = this.c;
        C.beginPath();
        points.forEach((q, i) => (i ? C.lineTo(q.x, q.y) : C.moveTo(q.x, q.y)));
        C.closePath();
        if (fill) {
            C.fillStyle = fill;
            C.fill();
        }
        if (stroke) {
            C.strokeStyle = stroke;
            C.lineWidth = width;
            C.stroke();
        }
    }
    // A band around a standing cylinder: from the bottom ring up to the top ring, between two positions on its front.
    band(cx, cy, r, z0, z1, t0, t1, fill, taper = 0.96) {
        const N = 14,
            PTS = [];
        for (let i = 0; i <= N; i++) {
            const T = t0 + ((t1 - t0) * i) / N;
            PTS.push(this.p(cx + T * r, cy - r * Math.sqrt(Math.max(0, 1 - T * T)), z0));
        }
        for (let i = N; i >= 0; i--) {
            const T = t0 + ((t1 - t0) * i) / N,
                R2 = r * taper;
            PTS.push(this.p(cx + T * R2, cy - R2 * Math.sqrt(Math.max(0, 1 - T * T)), z1));
        }
        this.poly(PTS, fill);
    }
    groundRect(x0, y0, x1, y1, fill) {
        const A = this.p(x0, y1),
            B = this.p(x1, y0),
            C = this.c;
        C.fillStyle = fill;
        C.fillRect(Math.floor(A.x), Math.floor(A.y), Math.ceil(B.x - A.x) + 1, Math.ceil(B.y - A.y) + 1);
    }
    visible(point, margin = 80) {
        const R = this.r.canvas;
        return point.x > -margin && point.x < R.width + margin && point.y > -margin * 6 && point.y < R.height + margin;
    }
}

function drawTree(paint, tree) {
    const B = paint.p(tree.x, tree.y);
    if (!paint.visible(B, 140)) {
        return;
    }
    const S = paint.s * tree.s,
        C = paint.c;
    paint.r.ellipse(B.x + 0.2 * S, B.y + 0.05 * S, 1.5 * S, 0.5 * S, 'rgba(48,66,40,0.28)');
    C.strokeStyle = '#7d5c3d';
    C.lineWidth = 0.42 * S;
    C.lineCap = 'round';
    C.beginPath();
    C.moveTo(B.x, B.y);
    C.lineTo(B.x, B.y - 1.9 * S * WORLD_HEIGHT_PROJECTION * 1.3);
    C.stroke();
    const TOP = B.y - 2.9 * S * WORLD_HEIGHT_PROJECTION * 1.3,
        DARK = tree.shade > 0.5 ? '#5f8c58' : '#67955c',
        LIGHT = tree.shade > 0.5 ? '#86b36d' : '#8dbb72';
    paint.r.ellipse(B.x, TOP + 0.35 * S, 1.65 * S, 1.25 * S, DARK);
    paint.r.ellipse(B.x - 0.55 * S, TOP + 0.05 * S, 1.15 * S, 0.95 * S, DARK);
    paint.r.ellipse(B.x + 0.6 * S, TOP + 0.1 * S, 1.1 * S, 0.9 * S, DARK);
    paint.r.ellipse(B.x - 0.25 * S, TOP - 0.25 * S, 1.05 * S, 0.8 * S, LIGHT);
}
function drawBush(paint, bush) {
    const B = paint.p(bush.x, bush.y);
    if (!paint.visible(B, 60)) {
        return;
    }
    const S = paint.s * bush.s;
    paint.r.ellipse(B.x, B.y - 0.15 * S, 1.1 * S, 0.7 * S, '#6c9a5a');
    paint.r.ellipse(B.x - 0.4 * S, B.y - 0.3 * S, 0.7 * S, 0.5 * S, '#86b06a');
}

function drawTower(paint, glow) {
    const C = paint.c,
        S = paint.s;
    let z = 0;
    for (let i = 0; i < TIERS.length; i++) {
        const TIER_R = TIERS[i].r,
            TIER_H = TIERS[i].h,
            TOP_Z = z + TIER_H;
        // lit left side, shaded right side
        paint.band(0, TOWER_Y, TIER_R, z, TOP_Z, -1, 1, '#c9c2b0');
        paint.band(0, TOWER_Y, TIER_R, z, TOP_Z, 0.25, 1, '#a49d8d');
        paint.band(0, TOWER_Y, TIER_R, z, TOP_Z, 0.72, 1, '#8c8575');
        // stone courses
        C.strokeStyle = 'rgba(88,80,70,0.22)';
        C.lineWidth = Math.max(1, 0.05 * S);
        C.beginPath();
        for (let zz = z + 1.1; zz < TOP_Z - 0.3; zz += 1.1) {
            for (let k = 0; k <= 12; k++) {
                const T = -1 + (2 * k) / 12,
                    Q = paint.p(T * TIER_R, TOWER_Y - TIER_R * Math.sqrt(Math.max(0, 1 - T * T)), zz);
                if (k) {
                    C.lineTo(Q.x, Q.y);
                } else {
                    C.moveTo(Q.x, Q.y);
                }
            }
        }
        C.stroke();
        // top ledge with battlements
        const TC = paint.p(0, TOWER_Y, TOP_Z),
            LEDGE = TIER_R + 0.45;
        paint.r.ellipse(TC.x, TC.y, LEDGE * S, LEDGE * S * 0.62, '#b8b19f');
        paint.r.ellipse(TC.x, TC.y - 0.05 * S, (TIER_R - 0.1) * S, (TIER_R - 0.1) * S * 0.62, '#d8d2bf');
        for (let k = 0; k < 15; k++) {
            const A = Math.PI + (Math.PI * (k + 0.5)) / 15;
            const M = paint.p(Math.cos(A) * LEDGE * 0.97, TOWER_Y + Math.sin(A) * LEDGE * 0.97 * -1, TOP_Z);
            paint.r.ellipse(M.x, M.y - 0.15 * S, 0.2 * S, 0.17 * S, '#9d9684');
        }
        // arched windows glowing on the tiers above the base
        if (i > 0) {
            for (const T of [-0.55, 0, 0.55]) {
                const WX = T * TIER_R * 0.98,
                    WY = TOWER_Y - TIER_R * Math.sqrt(1 - T * T) * 0.98,
                    BASE = paint.p(WX, WY, z + TIER_H * 0.32),
                    WW = 0.42 * S * Math.sqrt(1 - T * T) + 1,
                    WH = TIER_H * 0.4 * WORLD_HEIGHT_PROJECTION * S;
                C.fillStyle = '#4b4358';
                C.fillRect(BASE.x - WW - 1, BASE.y - WH - WW, WW * 2 + 2, WH + WW);
                C.fillStyle = glow > 0 ? '#ffe3a1' : '#f3cf86';
                C.fillRect(BASE.x - WW, BASE.y - WH - WW + 1, WW * 2, WH + WW - 1);
                paint.r.ellipse(BASE.x, BASE.y - WH - WW + 1, WW, WW * 0.8, glow > 0 ? '#ffe3a1' : '#f3cf86');
            }
        }
        z = TOP_Z;
    }
    // the spire
    const SPIRE_BASE = paint.p(0, TOWER_Y, z),
        SPIRE_TOP = paint.p(0, TOWER_Y, z + 6),
        R = TIERS[TIERS.length - 1].r;
    paint.poly(
        [
            { x: SPIRE_BASE.x - R * S * 0.95, y: SPIRE_BASE.y },
            { x: SPIRE_TOP.x, y: SPIRE_TOP.y },
            { x: SPIRE_BASE.x + R * S * 0.95, y: SPIRE_BASE.y },
        ],
        '#6f7f9d',
    );
    paint.poly(
        [
            { x: SPIRE_BASE.x + R * S * 0.2, y: SPIRE_BASE.y },
            { x: SPIRE_TOP.x, y: SPIRE_TOP.y },
            { x: SPIRE_BASE.x + R * S * 0.95, y: SPIRE_BASE.y },
        ],
        '#5b6a88',
    );
    C.strokeStyle = '#5a4a3a';
    C.lineWidth = 0.1 * S;
    C.beginPath();
    C.moveTo(SPIRE_TOP.x, SPIRE_TOP.y);
    C.lineTo(SPIRE_TOP.x, SPIRE_TOP.y - 2 * S);
    C.stroke();
    paint.poly(
        [
            { x: SPIRE_TOP.x, y: SPIRE_TOP.y - 2 * S },
            { x: SPIRE_TOP.x + 1.5 * S, y: SPIRE_TOP.y - 1.6 * S },
            { x: SPIRE_TOP.x, y: SPIRE_TOP.y - 1.2 * S },
        ],
        '#d5584b',
    );
    drawDoor(paint, glow);
}
function drawDoor(paint, glow) {
    const S = paint.s,
        C = paint.c,
        BASE = paint.p(0, RY + 0.05, 0),
        W = 1.7 * S,
        H = 3.6 * WORLD_HEIGHT_PROJECTION * S;
    // steps and the warm light spilling out
    paint.r.ellipse(BASE.x, BASE.y + 0.1 * S, 2.6 * S, 0.9 * S, '#b3ab97');
    paint.r.ellipse(BASE.x, BASE.y, 2.1 * S, 0.7 * S, '#c4bda9');
    C.fillStyle = '#5a4f6c';
    C.fillRect(BASE.x - W - 0.25 * S, BASE.y - H - W - 0.25 * S, (W + 0.25 * S) * 2, H + W + 0.25 * S);
    paint.r.ellipse(BASE.x, BASE.y - H - W + 0.1 * S, W + 0.25 * S, W * 0.95, '#5a4f6c');
    C.fillStyle = '#2b2236';
    C.fillRect(BASE.x - W, BASE.y - H - W, W * 2, H + W);
    paint.r.ellipse(BASE.x, BASE.y - H - W + 0.1 * S, W, W * 0.9, '#2b2236');
    const LIGHT = 0.35 + glow * 0.45;
    C.fillStyle = `rgba(255,186,98,${LIGHT})`;
    C.fillRect(BASE.x - W * 0.7, BASE.y - H * 0.8, W * 1.4, H * 0.8);
    paint.r.ellipse(BASE.x, BASE.y - H * 0.8, W * 0.7, W * 0.6, `rgba(255,186,98,${LIGHT})`);
    if (glow > 0) {
        paint.r.ellipse(BASE.x, BASE.y - H * 0.4, 5 * S, 2.2 * S, `rgba(255,200,120,${0.12 * glow})`);
    }
    // a lantern on each side of the door
    for (const SIDE of [-1, 1]) {
        const X = BASE.x + SIDE * (W + 0.9 * S);
        C.strokeStyle = '#4a3b30';
        C.lineWidth = 0.14 * S;
        C.beginPath();
        C.moveTo(X, BASE.y);
        C.lineTo(X, BASE.y - H * 0.7);
        C.stroke();
        paint.r.ellipse(X, BASE.y - H * 0.75, 0.32 * S, 0.4 * S, '#ffd88a');
        paint.r.ellipse(X, BASE.y - H * 0.75, 0.9 * S, 1.0 * S, 'rgba(255,214,130,0.18)');
    }
}

function drawFence(paint) {
    const S = paint.s,
        C = paint.c;
    const POST_Z = 1.15,
        GAP = CONFIG.farm.tower.gateRadius + 0.6;
    const SIDES = [
        // [x0, y0, x1, y1] walking the border, the back edge broken at the door
        [-RX, RY, -GAP, RY],
        [GAP, RY, RX, RY],
        [RX, RY, RX, -RY],
        [RX, -RY, -RX, -RY],
        [-RX, -RY, -RX, RY],
    ];
    const POSTS = [];
    for (const [X0, Y0, X1, Y1] of SIDES) {
        const LEN = Math.hypot(X1 - X0, Y1 - Y0),
            COUNT = Math.max(1, Math.round(LEN / 2.4));
        const RUN = [];
        for (let k = 0; k <= COUNT; k++) {
            RUN.push(paint.p(X0 + ((X1 - X0) * k) / COUNT, Y0 + ((Y1 - Y0) * k) / COUNT));
        }
        POSTS.push(RUN);
    }
    C.lineCap = 'round';
    for (const [PASS, COLOR, WIDTH] of [
        [0, '#8a6a46', 0.1],
        [1, '#b08a5c', 0.1],
    ]) {
        C.strokeStyle = COLOR;
        C.lineWidth = Math.max(1.2, WIDTH * S);
        C.beginPath();
        for (const RUN of POSTS) {
            for (let k = 0; k < RUN.length - 1; k++) {
                const A = RUN[k],
                    B = RUN[k + 1];
                if (!paint.visible(A, 200) && !paint.visible(B, 200)) {
                    continue;
                }
                for (const RZ of [0.45, 0.9]) {
                    const DZ = RZ * WORLD_HEIGHT_PROJECTION * S - PASS * 0.05 * S;
                    C.moveTo(A.x, A.y - DZ);
                    C.lineTo(B.x, B.y - DZ);
                }
            }
        }
        C.stroke();
    }
    for (const [PASS, COLOR] of [
        [0, '#7a5a38'],
        [1, '#a67f52'],
    ]) {
        C.strokeStyle = COLOR;
        C.lineWidth = Math.max(2, 0.22 * S - PASS * 0.08 * S);
        C.beginPath();
        for (const RUN of POSTS) {
            for (const A of RUN) {
                if (!paint.visible(A, 100)) {
                    continue;
                }
                C.moveTo(A.x + PASS * -0.03 * S, A.y);
                C.lineTo(A.x + PASS * -0.03 * S, A.y - POST_Z * WORLD_HEIGHT_PROJECTION * S);
            }
        }
        C.stroke();
    }
    // heavier posts either side of the door
    for (const SIDE of [-1, 1]) {
        const A = paint.p(SIDE * GAP, RY);
        C.strokeStyle = '#6e4f31';
        C.lineWidth = 0.38 * S;
        C.beginPath();
        C.moveTo(A.x, A.y);
        C.lineTo(A.x, A.y - 1.8 * WORLD_HEIGHT_PROJECTION * S);
        C.stroke();
        paint.r.ellipse(A.x, A.y - 1.8 * WORLD_HEIGHT_PROJECTION * S, 0.3 * S, 0.22 * S, '#8f6c45');
    }
}

export function drawFarmGrounds(renderer, world) {
    const P = new Painter(renderer),
        S = P.s,
        C = P.c,
        W = renderer.canvas.width,
        H = renderer.canvas.height,
        GLOW = world.farmBossEvent?.phase === 'marching' ? 1 : 0;
    // sky, hills and the far meadow behind the tower
    const HORIZON = P.p(0, RY + 11).y;
    C.fillStyle = '#a8bd84';
    C.fillRect(0, 0, W, H);
    if (HORIZON > 0) {
        const BANDS = ['#cfe4ea', '#dbeaea', '#e6f0e4'];
        BANDS.forEach((color, i) => {
            C.fillStyle = color;
            C.fillRect(0, (HORIZON * i) / BANDS.length, W, HORIZON / BANDS.length + 1);
        });
        for (const [X, RXH, RYH, COLOR] of [
            [-14, 15, 4.2, '#b5cba4'],
            [11, 17, 3.4, '#a6bf93'],
            [-2, 22, 2.4, '#9fb88d'],
        ]) {
            renderer.ellipse(P.p(X, RY + 11).x, HORIZON, RXH * S, RYH * S, COLOR);
        }
        C.fillStyle = '#a8bd84';
        C.fillRect(0, HORIZON, W, H - HORIZON + 1);
    }
    for (const TREE of TREES) {
        if (TREE.y > RY + 3) {
            drawTree(P, TREE);
        }
    }
    drawTower(P, GLOW);
    // the farm itself: meadow, patches, a worn path from the door
    P.groundRect(-RX - 0.6, -RY - 0.6, RX + 0.6, RY + 0.4, '#b8c88c');
    P.groundRect(-RX, -RY, RX, RY, '#c9d79f');
    for (const PATCH of PATCHES) {
        renderer.groundEllipse(PATCH.x, PATCH.y, PATCH.rx, PATCH.ry, PATCH.color);
    }
    for (let y = RY - 0.5, i = 0; y > 3; y -= 1.3, i++) {
        const X = Math.sin(i * 1.7) * 0.7;
        renderer.groundEllipse(X, y, 2.0 + 0.1 * (i % 3), 1.1, '#d9c796');
        renderer.groundEllipse(X, y, 1.4, 0.8, '#e3d3a6');
    }
    C.strokeStyle = '#8fa96a';
    C.lineWidth = Math.max(1, 0.06 * S);
    C.lineCap = 'round';
    C.beginPath();
    for (const T of TUFTS) {
        const B = P.p(T.x, T.y);
        if (!P.visible(B, 20)) {
            continue;
        }
        const U = 0.34 * S * T.s;
        C.moveTo(B.x, B.y);
        C.lineTo(B.x - U * 0.5, B.y - U);
        C.moveTo(B.x, B.y);
        C.lineTo(B.x + U * 0.1, B.y - U * 1.25);
        C.moveTo(B.x, B.y);
        C.lineTo(B.x + U * 0.55, B.y - U * 0.9);
    }
    C.stroke();
    for (const F of FLOWERS) {
        const B = P.p(F.x, F.y);
        if (P.visible(B, 20)) {
            const D = Math.max(2, 0.13 * S);
            C.fillStyle = F.color;
            C.fillRect(B.x - D / 2, B.y - D, D, D);
        }
    }
    for (const STONE of STONES) {
        renderer.groundEllipse(STONE.x, STONE.y, STONE.s * 1.2, STONE.s * 0.9, '#aeb2a0');
        renderer.groundEllipse(STONE.x - 0.05, STONE.y + 0.05, STONE.s * 0.8, STONE.s * 0.55, '#c6c9b8');
    }
    drawFence(P);
    for (const BUSH of BUSHES) {
        if (Math.abs(BUSH.x) > RX + 0.8 || Math.abs(BUSH.y) > RY + 0.8) {
            drawBush(P, BUSH);
        }
    }
    for (const TREE of TREES) {
        if (TREE.y <= RY + 3) {
            drawTree(P, TREE);
        }
    }
}

function drawHallWall(paint, tint, sky, now) {
    const S = paint.s,
        C = paint.c,
        Z = HALL_WALL_HEIGHT,
        X0 = -HALL_RX - 2,
        X1 = HALL_RX + 2;
    const A = paint.p(X0, HALL_RY, 0),
        B = paint.p(X1, HALL_RY, 0),
        TOP = Z * WORLD_HEIGHT_PROJECTION * S;
    C.fillStyle = rgb(tint.wall);
    C.fillRect(A.x, A.y - TOP, B.x - A.x, TOP);
    // brick courses
    C.strokeStyle = 'rgba(0,0,0,0.16)';
    C.lineWidth = Math.max(1, 0.04 * S);
    C.beginPath();
    for (let z = 1; z < Z; z++) {
        const Y = A.y - z * WORLD_HEIGHT_PROJECTION * S;
        C.moveTo(A.x, Y);
        C.lineTo(B.x, Y);
    }
    C.stroke();
    const ACCENT = rgb(tint.accent);
    for (let x = -HALL_RX; x <= HALL_RX; x += 8) {
        const BASE = paint.p(x, HALL_RY, 0),
            FLICKER = 0.85 + 0.15 * Math.sin(now * 0.011 + x * 1.3);
        if (!paint.visible(BASE, 160)) {
            continue;
        }
        // an arched window onto the sky outside
        const WW = 1.5 * S,
            WB = BASE.y - 2.6 * WORLD_HEIGHT_PROJECTION * S,
            WT = BASE.y - 7 * WORLD_HEIGHT_PROJECTION * S;
        C.fillStyle = rgb(tint.floor, 0.9);
        C.fillRect(BASE.x - WW - 0.25 * S, WT - WW, WW * 2 + 0.5 * S, WB - WT + WW);
        paint.r.ellipse(BASE.x, WT, WW + 0.25 * S, WW + 0.2 * S, rgb(tint.floor, 0.9));
        C.fillStyle = rgb(sky.top);
        C.fillRect(BASE.x - WW, WT - WW, WW * 2, (WB - WT + WW) * 0.55);
        C.fillStyle = rgb(sky.bottom);
        C.fillRect(BASE.x - WW, WT - WW + (WB - WT + WW) * 0.55, WW * 2, (WB - WT + WW) * 0.45);
        paint.r.ellipse(BASE.x, WT, WW, WW, rgb(sky.top));
        if (sky.night > 0.7) {
            for (let k = 0; k < 6; k++) {
                C.fillStyle = 'rgba(255,255,240,0.85)';
                C.fillRect(
                    BASE.x - WW + ((k * 37) % 100) * 0.0285 * WW * 0.97,
                    WT - WW * 0.8 + ((k * 53) % 100) * 0.01 * (WB - WT + WW) * 0.9,
                    2,
                    2,
                );
            }
        } else {
            paint.r.ellipse(
                BASE.x - WW * 0.3 + ((now * 0.00002 * S + x) % 1) * 0,
                WT + WW * 0.9,
                WW * 0.55,
                WW * 0.22,
                'rgba(255,255,255,0.55)',
            );
        }
        // torches on the pillars between the windows
        for (const SIDE of [-1, 1]) {
            const TX = BASE.x + SIDE * 4 * S;
            C.fillStyle = rgb(mix(tint.wall, [0, 0, 0], 0.25));
            C.fillRect(
                TX - 0.35 * S,
                BASE.y - 6 * WORLD_HEIGHT_PROJECTION * S,
                0.7 * S,
                6 * WORLD_HEIGHT_PROJECTION * S,
            );
            const TY = BASE.y - 3.6 * WORLD_HEIGHT_PROJECTION * S;
            paint.r.ellipse(
                TX,
                TY,
                1.7 * S * FLICKER,
                1.9 * S * FLICKER,
                `rgba(${tint.accent[0]},${tint.accent[1]},${tint.accent[2]},0.09)`,
            );
            paint.r.ellipse(TX, TY, 0.28 * S, 0.5 * S * FLICKER, ACCENT);
            paint.r.ellipse(TX, TY + 0.1 * S, 0.14 * S, 0.28 * S, '#fff1c4');
        }
    }
    C.fillStyle = rgb(mix(tint.wall, [255, 255, 255], 0.14));
    C.fillRect(A.x, A.y - TOP - 0.35 * S, B.x - A.x, 0.35 * S);
    C.fillStyle = 'rgba(0,0,0,0.3)';
    C.fillRect(A.x, A.y - 0.2 * S, B.x - A.x, 0.2 * S);
}

function drawOpenSky(paint, sky, now, summit) {
    const C = paint.c,
        W = paint.r.canvas.width,
        H = paint.r.canvas.height;
    for (let index = 0; index < 12; index++) {
        C.fillStyle = rgb(mix(sky.top, sky.bottom, index / 11));
        C.fillRect(0, (H * index) / 12, W, H / 12 + 1);
    }
    for (let index = 0; index < 16; index++) {
        const X = ((index * 173 + now * 0.002) % (W + 120)) - 60,
            Y = (H * (0.1 + ((index * 29) % 35) / 100)) / 2;
        paint.r.ellipse(X, Y, ((25 + (index % 3) * 12) * paint.s) / 12, (7 * paint.s) / 12, '#ffffff28');
    }
    if (summit) {
        const POINT = paint.p(0, HALL_RY, 10);
        paint.r.ellipse(POINT.x, POINT.y, 3.2 * paint.s, 3.2 * paint.s, '#fff0ba44');
        paint.r.ellipse(POINT.x, POINT.y, 1.8 * paint.s, 1.8 * paint.s, '#ffe7a4');
    }
}

function drawThemeDecorations(paint, theme, now) {
    const C = paint.c,
        S = paint.s;
    // Wall-mounted or painted decoration: none of these shapes are simulation obstacles.
    if (theme.id === 'royal') {
        paint.groundRect(-3.8, -HALL_RY, 3.8, HALL_RY, '#7e375c66');
        paint.groundRect(-3.9, -HALL_RY, -3.75, HALL_RY, '#edcc8b99');
        paint.groundRect(3.75, -HALL_RY, 3.9, HALL_RY, '#edcc8b99');
    }
    for (const X of [-18, -10, 10, 18]) {
        const BASE = paint.p(X, HALL_RY, 2.5),
            TOP = paint.p(X, HALL_RY, 7.5);
        if (theme.id === 'garden') {
            C.strokeStyle = '#93b978';
            C.lineWidth = Math.max(1, S * 0.13);
            C.beginPath();
            C.moveTo(BASE.x, BASE.y);
            C.lineTo(TOP.x + Math.sin(now * 0.0008 + X) * S * 0.12, TOP.y);
            C.stroke();
            for (let index = 0; index < 5; index++) {
                paint.r.ellipse(
                    BASE.x + (index % 2 ? -0.4 : 0.4) * S,
                    BASE.y - index * 0.7 * S,
                    S * 0.5,
                    S * 0.23,
                    '#a5c68c',
                );
            }
        } else if (theme.id === 'armory') {
            paint.r.ellipse(BASE.x, BASE.y - S * 1.1, S * 0.8, S, '#8da5b7');
            for (const SIDE of [-1, 1]) {
                paint.r.line(
                    { x: BASE.x + SIDE * S, y: TOP.y + S },
                    { x: BASE.x - SIDE * S, y: BASE.y },
                    0.14,
                    '#d4e1e6',
                );
            }
        } else if (theme.id === 'royal' || theme.id === 'entrance') {
            paint.poly(
                [
                    { x: TOP.x - S, y: TOP.y },
                    { x: TOP.x + S, y: TOP.y },
                    { x: BASE.x + S, y: BASE.y - S },
                    { x: BASE.x, y: BASE.y },
                    { x: BASE.x - S, y: BASE.y - S },
                ],
                theme.id === 'royal' ? '#b96887' : '#b68b58',
                '#ead39e',
                Math.max(1, S * 0.06),
            );
        }
    }
}

export function drawTowerHall(renderer, world, now) {
    const P = new Painter(renderer),
        S = P.s,
        C = P.c,
        W = renderer.canvas.width,
        H = renderer.canvas.height,
        TINT = towerTheme(world.tower?.floor || 1),
        SUMMIT = world.tower?.phase === 'summit',
        SKY = SUMMIT ? { top: [107, 159, 195], bottom: [255, 219, 161], night: 0 } : skyAt(world.tower?.floor || 1);
    C.fillStyle = '#15111d';
    C.fillRect(0, 0, W, H);
    if (TINT.id === 'terrace' || SUMMIT) {
        drawOpenSky(P, SKY, now, SUMMIT);
    } else {
        drawHallWall(P, TINT, SKY, now);
    }
    // flagstones laid in running bond, not a grid
    P.groundRect(-HALL_RX, -HALL_RY, HALL_RX, HALL_RY, rgb(TINT.floor));
    const ROW = 3,
        SLAB = 5;
    const RAND = seeded(7 + (world.tower?.floor || 1));
    for (let y = -HALL_RY, row = 0; y < HALL_RY; y += ROW, row++) {
        for (let x = -HALL_RX - (row % 2 ? SLAB / 2 : 0); x < HALL_RX; x += SLAB) {
            const X0 = Math.max(-HALL_RX, x),
                X1 = Math.min(HALL_RX, x + SLAB),
                Y1 = Math.min(HALL_RY, y + ROW),
                T = RAND();
            if (X1 > X0) {
                P.groundRect(
                    X0,
                    y,
                    X1,
                    Y1,
                    T < 0.33 ? 'rgba(255,255,255,0.05)' : T < 0.66 ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0)',
                );
            }
        }
    }
    C.strokeStyle = 'rgba(0,0,0,0.3)';
    C.lineWidth = Math.max(1, 0.05 * S);
    C.beginPath();
    for (let y = -HALL_RY, row = 0; y <= HALL_RY; y += ROW, row++) {
        const A = P.p(-HALL_RX, y),
            B = P.p(HALL_RX, y);
        C.moveTo(A.x, A.y);
        C.lineTo(B.x, B.y);
        if (y < HALL_RY) {
            for (let x = -HALL_RX - (row % 2 ? SLAB / 2 : 0); x < HALL_RX; x += SLAB) {
                if (x > -HALL_RX) {
                    const V0 = P.p(x, y),
                        V1 = P.p(x, Math.min(HALL_RY, y + ROW));
                    C.moveTo(V0.x, V0.y);
                    C.lineTo(V1.x, V1.y);
                }
            }
        }
    }
    C.stroke();
    drawThemeDecorations(P, TINT, now);
    // a rune circle where the guardian of the floor lands
    for (const [R, ALPHA, WIDTH] of [
        [8, 0.3, 0.14],
        [7.2, 0.18, 0.06],
        [3.2, 0.22, 0.08],
    ]) {
        renderer.strokeGroundEllipse(
            0,
            0,
            R,
            R,
            `rgba(${TINT.accent[0]},${TINT.accent[1]},${TINT.accent[2]},${ALPHA})`,
            WIDTH,
        );
    }
    for (let k = 0; k < 8; k++) {
        const A = (k * TAU) / 8,
            P0 = P.p(Math.cos(A) * 3.6, Math.sin(A) * 3.6),
            P1 = P.p(Math.cos(A) * 7, Math.sin(A) * 7);
        C.strokeStyle = `rgba(${TINT.accent[0]},${TINT.accent[1]},${TINT.accent[2]},0.15)`;
        C.lineWidth = Math.max(1, 0.06 * S);
        C.beginPath();
        C.moveTo(P0.x, P0.y);
        C.lineTo(P1.x, P1.y);
        C.stroke();
    }
    if (TINT.id === 'terrace' || SUMMIT) {
        for (let x = -HALL_RX; x <= HALL_RX; x += 2.5) {
            const POINT = P.p(x, HALL_RY, 0);
            C.fillStyle = rgb(TINT.wall);
            C.fillRect(POINT.x - S * 0.8, POINT.y - S * 0.9, S * 1.6, S * 0.9);
        }
    }
    // the low wall around the hall
    const EDGE = rgb(mix(TINT.wall, [255, 255, 255], 0.1));
    const L = P.p(-HALL_RX, -HALL_RY),
        R = P.p(HALL_RX, -HALL_RY);
    C.fillStyle = EDGE;
    C.fillRect(L.x, L.y, R.x - L.x, 0.5 * S);
    for (const SIDE of [-1, 1]) {
        const T = P.p(SIDE * HALL_RX, HALL_RY),
            B = P.p(SIDE * HALL_RX, -HALL_RY);
        C.fillRect(Math.min(T.x, T.x + SIDE * 0.9 * S), T.y, 0.9 * S, B.y - T.y);
    }
}
