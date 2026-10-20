// Draws the shared world map on a canvas: lit land with a shoreline against the fog, bosses with their danger,
// cleared flags, the farm, and the exploration itself — the tile being explored fills up like a gauge while a
// party of explorers walks out to it. The same view serves the full map screen (pan, zoom, pick a tile) and the
// small map on the farm screen.
import {
    WORLD_MAP_SETTINGS,
    WORLD_MAP_TILE_COUNT,
    canChallenge,
    hasBoss,
    inReach,
    tileDanger,
    tileSpecies,
    tileTerrain,
    tileIndex,
    tileX,
    tileY,
} from './world-map.js';

const RADIUS = WORLD_MAP_SETTINGS.radius;
const COLORS = {
    background: '#efeadb',
    fog: '#e2dcc6',
    fogFar: '#eeeadb',
    fogPuff: '#ece7d4',
    fogEdge: '#cfc8ae',
    land: ['#d3dfc6', '#cbd9be', '#d9e4cd'],
    forestLand: ['#c3d5b3', '#bcd0ac'],
    rockLand: ['#dbd6c6', '#d2cdbd'],
    swampLand: ['#c5d6cb', '#bdd0c8'],
    rock: '#a79f8d',
    rockLight: '#c5bfae',
    water: '#9fbfc4',
    shore: '#a9bc99',
    farm: '#c2913e',
    nest: '#b9774a',
    cave: '#6b5240',
    scout: '#7c9bb0',
    ink: '#4a4438',
    paper: '#fffaf0',
    tree: '#8fae86',
    trunk: '#a08358',
};
const TERRAIN_LAND = {
    plain: COLORS.land,
    forest: COLORS.forestLand,
    rock: COLORS.rockLand,
    swamp: COLORS.swampLand,
};
const NEIGHBOURS = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
];
const SIDES = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
];
const POP_MS = 650;
// Exploration points per second of one untrained explorer, and how long a dot takes to walk out to the tile.
const PARTY_TRIP_SECONDS = 2;
const MIN_SCALE = 10;
const MAX_SCALE = 72;

// A stable number in [0, 1) for a tile, used only to vary the look of the land.
function look(index, salt) {
    let value = (Math.imul(index + 1, 0x9e3779b9) ^ Math.imul(salt + 7, 0x85ebca6b)) >>> 0;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}
const INSIDE = (x, y) => Math.abs(x) <= RADIUS && Math.abs(y) <= RADIUS;
const CLAMP = (value, min, max) => Math.min(max, Math.max(min, value));
const EASE_OUT_BACK = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

export function createWorldMapView(
    canvas,
    { interactive = false, onSelect = () => {}, fps = 30, bossSprite = () => null } = {},
) {
    const CONTEXT = canvas.getContext('2d');
    const CAMERA = { x: 0, y: 0, scale: 28 };
    const POINTERS = new Map();
    const POP_AT = new Map();
    let width = 0,
        height = 0,
        ratio = 1,
        manual = false,
        previousLit = null,
        frame = 0,
        lastDraw = 0,
        gesture = null,
        provider = null,
        partyPhase = 0,
        lastRender = 0;

    function resize() {
        ratio = Math.min(2, globalThis.devicePixelRatio || 1);
        width = Math.max(1, canvas.clientWidth);
        height = Math.max(1, canvas.clientHeight);
        const PIXEL_WIDTH = Math.round(width * ratio),
            PIXEL_HEIGHT = Math.round(height * ratio);
        if (canvas.width !== PIXEL_WIDTH || canvas.height !== PIXEL_HEIGHT) {
            canvas.width = PIXEL_WIDTH;
            canvas.height = PIXEL_HEIGHT;
        }
    }
    // Frames the whole lit land with a margin of fog, so the player always sees where the edge of the map is.
    function fit(map) {
        resize();
        let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
        for (const INDEX of map.revealed) {
            minX = Math.min(minX, tileX(INDEX));
            maxX = Math.max(maxX, tileX(INDEX));
            minY = Math.min(minY, tileY(INDEX));
            maxY = Math.max(maxY, tileY(INDEX));
        }
        const MARGIN = interactive ? 1.6 : 1.2;
        CAMERA.x = (minX + maxX) / 2;
        CAMERA.y = (minY + maxY) / 2;
        CAMERA.scale = CLAMP(
            Math.min(width / (maxX - minX + 1 + MARGIN * 2), height / (maxY - minY + 1 + MARGIN * 2)),
            MIN_SCALE,
            interactive ? 56 : 40,
        );
        manual = false;
    }
    function screenX(x) {
        return (x - CAMERA.x) * CAMERA.scale + width / 2;
    }
    function screenY(y) {
        return (y - CAMERA.y) * CAMERA.scale + height / 2;
    }
    // The tile under a point of the canvas, or -1 outside the map.
    function pick(clientX, clientY) {
        const BOX = canvas.getBoundingClientRect(),
            X = Math.round((clientX - BOX.left - width / 2) / CAMERA.scale + CAMERA.x),
            Y = Math.round((clientY - BOX.top - height / 2) / CAMERA.scale + CAMERA.y);
        return INSIDE(X, Y) ? tileIndex(X, Y) : -1;
    }
    function drawTree(cx, cy, r) {
        CONTEXT.fillStyle = COLORS.trunk;
        CONTEXT.fillRect(cx - r * 0.18, cy + r * 0.5, r * 0.36, r * 0.8);
        CONTEXT.fillStyle = COLORS.tree;
        CONTEXT.beginPath();
        CONTEXT.arc(cx, cy, r, 0, Math.PI * 2);
        CONTEXT.fill();
    }
    function drawGround(index, x, y, s, terrain) {
        if (terrain === 'forest') {
            for (let tree = 0; tree < 3; tree++) {
                drawTree(
                    x + s * (0.22 + 0.56 * look(index, 40 + tree)),
                    y + s * (0.3 + 0.3 * look(index, 50 + tree)),
                    s * (0.12 + 0.05 * look(index, 60 + tree)),
                );
            }
        } else if (terrain === 'rock') {
            for (let rock = 0; rock < 2; rock++) {
                const RX = x + s * (0.28 + 0.44 * look(index, 70 + rock)),
                    RY = y + s * (0.55 + 0.25 * look(index, 80 + rock)),
                    RR = s * (0.12 + 0.07 * look(index, 90 + rock));
                CONTEXT.fillStyle = COLORS.rock;
                CONTEXT.beginPath();
                CONTEXT.moveTo(RX - RR * 1.3, RY + RR * 0.7);
                CONTEXT.lineTo(RX - RR * 0.4, RY - RR);
                CONTEXT.lineTo(RX + RR * 0.7, RY - RR * 0.5);
                CONTEXT.lineTo(RX + RR * 1.3, RY + RR * 0.7);
                CONTEXT.closePath();
                CONTEXT.fill();
                CONTEXT.fillStyle = COLORS.rockLight;
                CONTEXT.beginPath();
                CONTEXT.moveTo(RX - RR * 0.4, RY - RR);
                CONTEXT.lineTo(RX + RR * 0.7, RY - RR * 0.5);
                CONTEXT.lineTo(RX, RY);
                CONTEXT.closePath();
                CONTEXT.fill();
            }
        } else if (terrain === 'swamp') {
            CONTEXT.fillStyle = COLORS.water;
            for (let pool = 0; pool < 2; pool++) {
                CONTEXT.beginPath();
                CONTEXT.ellipse(
                    x + s * (0.3 + 0.4 * look(index, 100 + pool)),
                    y + s * (0.35 + 0.35 * look(index, 110 + pool)),
                    s * 0.18,
                    s * 0.09,
                    0,
                    0,
                    Math.PI * 2,
                );
                CONTEXT.fill();
            }
        } else if (look(index, 2) < 0.16) {
            drawTree(x + s * 0.5, y + s * 0.5, s * 0.17);
        } else if (look(index, 2) < 0.4) {
            CONTEXT.strokeStyle = COLORS.tree;
            CONTEXT.lineWidth = Math.max(1, s * 0.04);
            CONTEXT.beginPath();
            const TX = x + s * (0.3 + 0.4 * look(index, 3)),
                TY = y + s * (0.5 + 0.3 * look(index, 4));
            CONTEXT.moveTo(TX - s * 0.06, TY);
            CONTEXT.lineTo(TX - s * 0.09, TY - s * 0.12);
            CONTEXT.moveTo(TX, TY);
            CONTEXT.lineTo(TX, TY - s * 0.16);
            CONTEXT.moveTo(TX + s * 0.06, TY);
            CONTEXT.lineTo(TX + s * 0.09, TY - s * 0.12);
            CONTEXT.stroke();
        }
    }
    function drawLand(index, x, y, s, lit, now, terrain) {
        const VARIANT = TERRAIN_LAND[terrain][Math.floor(look(index, 1) * TERRAIN_LAND[terrain].length)],
            POP = POP_AT.get(index),
            AGE = POP === undefined ? POP_MS : now - POP;
        let size = s;
        if (AGE < POP_MS) {
            size = s * CLAMP(EASE_OUT_BACK(AGE / POP_MS), 0.2, 1.08);
        }
        const OFFSET = (s - size) / 2;
        CONTEXT.fillStyle = VARIANT;
        CONTEXT.fillRect(x + OFFSET - 0.3, y + OFFSET - 0.3, size + 0.6, size + 0.6);
        if (AGE < POP_MS) {
            CONTEXT.strokeStyle = COLORS.scout;
            CONTEXT.globalAlpha = 1 - AGE / POP_MS;
            CONTEXT.lineWidth = 2;
            CONTEXT.beginPath();
            CONTEXT.arc(x + s / 2, y + s / 2, s * (0.3 + (AGE / POP_MS) * 0.9), 0, Math.PI * 2);
            CONTEXT.stroke();
            CONTEXT.globalAlpha = 1;
        }
        // The ground decides what is drawn on it; the small variations come from the tile so nothing looks stamped.
        if (s >= 16) {
            drawGround(index, x, y, s, terrain);
        }
        // Shoreline: the edge of the lit land where the fog begins.
        CONTEXT.strokeStyle = COLORS.shore;
        CONTEXT.lineWidth = 2;
        CONTEXT.beginPath();
        for (const [DX, DY] of SIDES) {
            const NX = tileX(index) + DX,
                NY = tileY(index) + DY;
            if (INSIDE(NX, NY) && !lit.has(tileIndex(NX, NY))) {
                const FROM_X = DX === 0 ? x : x + (DX > 0 ? s : 0),
                    FROM_Y = DY === 0 ? y : y + (DY > 0 ? s : 0),
                    TO_X = DX === 0 ? x + s : FROM_X,
                    TO_Y = DY === 0 ? y + s : FROM_Y;
                CONTEXT.moveTo(FROM_X, FROM_Y);
                CONTEXT.lineTo(TO_X, TO_Y);
            }
        }
        CONTEXT.stroke();
    }
    function drawFog(index, x, y, s, reachable) {
        const INSET = Math.max(1, s * 0.05);
        CONTEXT.fillStyle = reachable ? COLORS.fog : COLORS.fogFar;
        CONTEXT.beginPath();
        CONTEXT.roundRect(x + INSET, y + INSET, s - INSET * 2, s - INSET * 2, s * 0.22);
        CONTEXT.fill();
        if (!reachable) {
            return;
        }
        CONTEXT.fillStyle = COLORS.fogPuff;
        for (let puff = 0; puff < 3; puff++) {
            CONTEXT.beginPath();
            CONTEXT.arc(
                x + s * (0.25 + 0.5 * look(index, 10 + puff)),
                y + s * (0.3 + 0.4 * look(index, 20 + puff)),
                s * (0.1 + 0.08 * look(index, 30 + puff)),
                0,
                Math.PI * 2,
            );
            CONTEXT.fill();
        }
    }
    function drawFarm(x, y, s) {
        CONTEXT.fillStyle = COLORS.paper;
        CONTEXT.fillRect(x + s * 0.24, y + s * 0.44, s * 0.52, s * 0.34);
        CONTEXT.fillStyle = COLORS.farm;
        CONTEXT.beginPath();
        CONTEXT.moveTo(x + s * 0.16, y + s * 0.46);
        CONTEXT.lineTo(x + s * 0.5, y + s * 0.18);
        CONTEXT.lineTo(x + s * 0.84, y + s * 0.46);
        CONTEXT.closePath();
        CONTEXT.fill();
        CONTEXT.fillRect(x + s * 0.44, y + s * 0.56, s * 0.12, s * 0.22);
    }
    function drawMine(x, y, s) {
        CONTEXT.fillStyle = '#5b4630';
        CONTEXT.fillRect(x + s * 0.3, y + s * 0.5, s * 0.4, s * 0.36);
        CONTEXT.fillStyle = '#1b130c';
        CONTEXT.fillRect(x + s * 0.4, y + s * 0.6, s * 0.2, s * 0.26);
        CONTEXT.fillStyle = '#c9a15a';
        CONTEXT.fillRect(x + s * 0.28, y + s * 0.44, s * 0.44, s * 0.08);
    }
    // The boss itself stands on its tile (its own sprite, bobbing); the nest is only the fallback while it loads.
    function drawBoss(x, y, s, index, danger, open, now, species) {
        const SPRITE = bossSprite(species);
        if (!SPRITE || !SPRITE.complete || !SPRITE.naturalWidth) {
            drawNest(x, y, s, danger, open, now);
            return;
        }
        const BOB = Math.sin(now / 380 + index) * s * 0.025,
            SIZE = s * (0.7 + Math.min(0.2, danger * 0.02));
        CONTEXT.fillStyle = 'rgba(0,0,0,0.16)';
        CONTEXT.beginPath();
        CONTEXT.ellipse(x + s * 0.5, y + s * 0.84, SIZE * 0.36, SIZE * 0.1, 0, 0, Math.PI * 2);
        CONTEXT.fill();
        CONTEXT.drawImage(SPRITE, x + (s - SIZE) / 2, y + s * 0.86 - SIZE + BOB, SIZE, SIZE);
        if (s >= 16) {
            const FONT = Math.max(9, s * 0.3),
                LABEL = String(danger);
            CONTEXT.font = `700 ${FONT}px system-ui, sans-serif`;
            const BADGE_WIDTH = CONTEXT.measureText(LABEL).width + FONT * 0.7;
            CONTEXT.fillStyle = COLORS.paper;
            CONTEXT.beginPath();
            CONTEXT.roundRect(x + s - BADGE_WIDTH - s * 0.04, y + s * 0.04, BADGE_WIDTH, FONT * 1.2, FONT * 0.5);
            CONTEXT.fill();
            CONTEXT.fillStyle = COLORS.ink;
            CONTEXT.textAlign = 'center';
            CONTEXT.textBaseline = 'middle';
            CONTEXT.fillText(LABEL, x + s - BADGE_WIDTH / 2 - s * 0.04, y + s * 0.04 + FONT * 0.62);
        }
        if (open) {
            CONTEXT.strokeStyle = COLORS.nest;
            CONTEXT.globalAlpha = 0.55 + 0.45 * Math.sin(now / 260);
            CONTEXT.lineWidth = 2.5;
            CONTEXT.beginPath();
            CONTEXT.roundRect(x + 1.5, y + 1.5, s - 3, s - 3, s * 0.18);
            CONTEXT.stroke();
            CONTEXT.globalAlpha = 1;
        }
    }
    function drawNest(x, y, s, danger, open, now) {
        CONTEXT.fillStyle = COLORS.nest;
        CONTEXT.beginPath();
        CONTEXT.ellipse(x + s * 0.5, y + s * 0.62, s * 0.34, s * 0.26, 0, Math.PI, 0);
        CONTEXT.lineTo(x + s * 0.84, y + s * 0.72);
        CONTEXT.lineTo(x + s * 0.16, y + s * 0.72);
        CONTEXT.closePath();
        CONTEXT.fill();
        CONTEXT.fillStyle = COLORS.cave;
        CONTEXT.beginPath();
        CONTEXT.ellipse(x + s * 0.5, y + s * 0.72, s * 0.15, s * 0.15, 0, Math.PI, 0);
        CONTEXT.fill();
        CONTEXT.fillStyle = COLORS.paper;
        for (const EYE of [-0.05, 0.05]) {
            CONTEXT.beginPath();
            CONTEXT.arc(x + s * (0.5 + EYE), y + s * 0.65, Math.max(1, s * 0.022), 0, Math.PI * 2);
            CONTEXT.fill();
        }
        if (s >= 16) {
            const FONT = Math.max(9, s * 0.3),
                LABEL = String(danger);
            CONTEXT.font = `700 ${FONT}px system-ui, sans-serif`;
            const BADGE_WIDTH = CONTEXT.measureText(LABEL).width + FONT * 0.7;
            CONTEXT.fillStyle = COLORS.paper;
            CONTEXT.beginPath();
            CONTEXT.roundRect(x + s - BADGE_WIDTH - s * 0.04, y + s * 0.04, BADGE_WIDTH, FONT * 1.2, FONT * 0.5);
            CONTEXT.fill();
            CONTEXT.fillStyle = COLORS.ink;
            CONTEXT.textAlign = 'center';
            CONTEXT.textBaseline = 'middle';
            CONTEXT.fillText(LABEL, x + s - BADGE_WIDTH / 2 - s * 0.04, y + s * 0.04 + FONT * 0.62);
        }
        if (open) {
            CONTEXT.strokeStyle = COLORS.nest;
            CONTEXT.globalAlpha = 0.55 + 0.45 * Math.sin(now / 260);
            CONTEXT.lineWidth = 2.5;
            CONTEXT.beginPath();
            CONTEXT.roundRect(x + 1.5, y + 1.5, s - 3, s - 3, s * 0.18);
            CONTEXT.stroke();
            CONTEXT.globalAlpha = 1;
        }
    }
    function drawExploreTarget(x, y, s, progress, now) {
        const INSET = Math.max(1, s * 0.05);
        CONTEXT.save();
        CONTEXT.beginPath();
        CONTEXT.roundRect(x + INSET, y + INSET, s - INSET * 2, s - INSET * 2, s * 0.22);
        CONTEXT.clip();
        CONTEXT.fillStyle = COLORS.scout;
        CONTEXT.globalAlpha = 0.42;
        CONTEXT.fillRect(x, y + s * (1 - progress), s, s * progress);
        CONTEXT.restore();
        CONTEXT.strokeStyle = COLORS.scout;
        CONTEXT.lineWidth = 2;
        CONTEXT.setLineDash([s * 0.14, s * 0.1]);
        CONTEXT.lineDashOffset = -now / 70;
        CONTEXT.beginPath();
        CONTEXT.roundRect(x + INSET, y + INSET, s - INSET * 2, s - INSET * 2, s * 0.22);
        CONTEXT.stroke();
        CONTEXT.setLineDash([]);
        if (s >= 18) {
            CONTEXT.lineWidth = Math.max(1.5, s * 0.05);
            CONTEXT.beginPath();
            CONTEXT.arc(x + s * 0.46, y + s * 0.44, s * 0.14, 0, Math.PI * 2);
            CONTEXT.moveTo(x + s * 0.56, y + s * 0.54);
            CONTEXT.lineTo(x + s * 0.68, y + s * 0.66);
            CONTEXT.stroke();
            if (s >= 26) {
                CONTEXT.fillStyle = COLORS.ink;
                CONTEXT.font = `700 ${Math.max(9, s * 0.2)}px system-ui, sans-serif`;
                CONTEXT.textAlign = 'center';
                CONTEXT.textBaseline = 'alphabetic';
                CONTEXT.fillText(`${Math.floor(progress * 100)}%`, x + s / 2, y + s * 0.92);
            }
        }
    }
    // Each farm's explorers walk from that farm out to the tile it is exploring, one dot per explorer.
    function drawParty(from, target, count, now) {
        const FARM = from;
        if (FARM === undefined || target < 0 || !(count > 0)) {
            return;
        }
        const FROM_X = screenX(tileX(FARM)),
            FROM_Y = screenY(tileY(FARM)),
            TO_X = screenX(tileX(target)),
            TO_Y = screenY(tileY(target));
        CONTEXT.strokeStyle = COLORS.scout;
        CONTEXT.globalAlpha = 0.55;
        CONTEXT.lineWidth = 2;
        CONTEXT.setLineDash([3, 6]);
        CONTEXT.beginPath();
        CONTEXT.moveTo(FROM_X, FROM_Y);
        CONTEXT.lineTo(TO_X, TO_Y);
        CONTEXT.stroke();
        CONTEXT.setLineDash([]);
        CONTEXT.globalAlpha = 1;
        const COUNT = Math.min(60, count);
        for (let member = 0; member < COUNT; member++) {
            const T = (partyPhase + member / COUNT) % 1,
                SWAY = Math.sin(now / 300 + member * 2.1) * CAMERA.scale * 0.05;
            CONTEXT.fillStyle = COLORS.scout;
            CONTEXT.strokeStyle = COLORS.paper;
            CONTEXT.lineWidth = 1.5;
            CONTEXT.beginPath();
            CONTEXT.arc(
                FROM_X + (TO_X - FROM_X) * T + SWAY,
                FROM_Y + (TO_Y - FROM_Y) * T - SWAY,
                Math.max(3, CAMERA.scale * 0.09),
                0,
                Math.PI * 2,
            );
            CONTEXT.fill();
            CONTEXT.stroke();
        }
    }

    function render(map, state = {}, now = performance.now()) {
        resize();
        const LIT = new Set(map.revealed);
        if (previousLit) {
            for (const INDEX of LIT) {
                if (!previousLit.has(INDEX)) {
                    POP_AT.set(INDEX, now);
                }
            }
            if (!manual && LIT.size !== previousLit.size) {
                fit(map);
            }
        } else {
            fit(map);
        }
        previousLit = LIT;
        const S = CAMERA.scale,
            MIN_X = Math.max(-RADIUS, Math.floor(CAMERA.x - width / 2 / S) - 1),
            MAX_X = Math.min(RADIUS, Math.ceil(CAMERA.x + width / 2 / S) + 1),
            MIN_Y = Math.max(-RADIUS, Math.floor(CAMERA.y - height / 2 / S) - 1),
            MAX_Y = Math.min(RADIUS, Math.ceil(CAMERA.y + height / 2 / S) + 1),
            FARMS = new Set(map.farms.map((farm) => farm.tile));
        CONTEXT.setTransform(ratio, 0, 0, ratio, 0, 0);
        CONTEXT.fillStyle = COLORS.background;
        CONTEXT.fillRect(0, 0, width, height);
        // The whole map is a fixed size; its outline tells the player how much there is still to find.
        CONTEXT.strokeStyle = COLORS.fogEdge;
        CONTEXT.lineWidth = 1.5;
        CONTEXT.setLineDash([6, 6]);
        CONTEXT.strokeRect(screenX(-RADIUS - 0.5), screenY(-RADIUS - 0.5), S * (RADIUS * 2 + 1), S * (RADIUS * 2 + 1));
        CONTEXT.setLineDash([]);
        for (let y = MIN_Y; y <= MAX_Y; y++) {
            for (let x = MIN_X; x <= MAX_X; x++) {
                const INDEX = tileIndex(x, y),
                    PX = screenX(x - 0.5),
                    PY = screenY(y - 0.5);
                if (LIT.has(INDEX)) {
                    drawLand(INDEX, PX, PY, S, LIT, now, tileTerrain(map, INDEX));
                } else if (
                    NEIGHBOURS.some(([dx, dy]) => INSIDE(x + dx, y + dy) && LIT.has(tileIndex(x + dx, y + dy)))
                ) {
                    drawFog(INDEX, PX, PY, S, inReach(map, INDEX));
                }
            }
        }
        for (let y = MIN_Y; y <= MAX_Y; y++) {
            for (let x = MIN_X; x <= MAX_X; x++) {
                const INDEX = tileIndex(x, y),
                    PX = screenX(x - 0.5),
                    PY = screenY(y - 0.5);
                if (!LIT.has(INDEX)) {
                    continue;
                }
                if (map.mines.includes(INDEX)) {
                    drawMine(PX, PY, S);
                }
                if (FARMS.has(INDEX)) {
                    drawFarm(PX, PY, S);
                } else if (hasBoss(map, INDEX)) {
                    drawBoss(
                        PX,
                        PY,
                        S,
                        INDEX,
                        tileDanger(map, INDEX),
                        canChallenge(map, INDEX),
                        now,
                        tileSpecies(map, INDEX),
                    );
                }
            }
        }
        const TARGETS = state.targets ?? [];
        if (TARGETS.length > 0) {
            partyPhase = (partyPhase + Math.min(100, now - lastRender) / 1000 / PARTY_TRIP_SECONDS) % 1;
        }
        for (const TARGET of TARGETS) {
            drawExploreTarget(
                screenX(tileX(TARGET.tile) - 0.5),
                screenY(tileY(TARGET.tile) - 0.5),
                S,
                TARGET.progress,
                now,
            );
            drawParty(TARGET.from, TARGET.tile, TARGET.count, now);
        }
        if (state.selected >= 0 && state.selected < WORLD_MAP_TILE_COUNT) {
            CONTEXT.strokeStyle = COLORS.ink;
            CONTEXT.lineWidth = 3;
            CONTEXT.beginPath();
            CONTEXT.roundRect(
                screenX(tileX(state.selected) - 0.5) + 1,
                screenY(tileY(state.selected) - 0.5) + 1,
                S - 2,
                S - 2,
                S * 0.18,
            );
            CONTEXT.stroke();
        }
        lastRender = now;
    }
    function loop(now) {
        frame = requestAnimationFrame(loop);
        if (now - lastDraw < 1000 / fps) {
            return;
        }
        lastDraw = now;
        const SNAPSHOT = provider?.();
        if (SNAPSHOT) {
            render(SNAPSHOT.map, SNAPSHOT, now);
        }
    }

    if (interactive) {
        const ZOOM = (factor, atX, atY) => {
            const BOX = canvas.getBoundingClientRect(),
                BEFORE_X = (atX - BOX.left - width / 2) / CAMERA.scale + CAMERA.x,
                BEFORE_Y = (atY - BOX.top - height / 2) / CAMERA.scale + CAMERA.y;
            CAMERA.scale = CLAMP(CAMERA.scale * factor, MIN_SCALE, MAX_SCALE);
            CAMERA.x = BEFORE_X - (atX - BOX.left - width / 2) / CAMERA.scale;
            CAMERA.y = BEFORE_Y - (atY - BOX.top - height / 2) / CAMERA.scale;
            manual = true;
        };
        const SPREAD = () => {
            const [A, B] = [...POINTERS.values()];
            return Math.hypot(A.x - B.x, A.y - B.y);
        };
        canvas.style.touchAction = 'none';
        canvas.addEventListener('pointerdown', (event) => {
            canvas.setPointerCapture?.(event.pointerId);
            POINTERS.set(event.pointerId, { x: event.clientX, y: event.clientY });
            gesture = { moved: POINTERS.size > 1, spread: POINTERS.size > 1 ? SPREAD() : 0 };
        });
        canvas.addEventListener('pointermove', (event) => {
            const POINTER = POINTERS.get(event.pointerId);
            if (!POINTER || !gesture) {
                return;
            }
            const DX = event.clientX - POINTER.x,
                DY = event.clientY - POINTER.y;
            if (POINTERS.size === 1) {
                if (!gesture.moved && Math.hypot(DX, DY) < 6) {
                    return;
                }
                gesture.moved = true;
                CAMERA.x -= DX / CAMERA.scale;
                CAMERA.y -= DY / CAMERA.scale;
                manual = true;
            }
            POINTER.x = event.clientX;
            POINTER.y = event.clientY;
            if (POINTERS.size === 2) {
                const NEXT = SPREAD(),
                    [A, B] = [...POINTERS.values()];
                if (gesture.spread > 0) {
                    ZOOM(NEXT / gesture.spread, (A.x + B.x) / 2, (A.y + B.y) / 2);
                }
                gesture.spread = NEXT;
                gesture.moved = true;
            }
        });
        const RELEASE = (event) => {
            const WAS_TAP = gesture && !gesture.moved && POINTERS.size === 1 && event.type === 'pointerup';
            POINTERS.delete(event.pointerId);
            if (WAS_TAP) {
                const INDEX = pick(event.clientX, event.clientY);
                if (INDEX >= 0) {
                    onSelect(INDEX);
                }
            }
            if (POINTERS.size === 0) {
                gesture = null;
            }
        };
        canvas.addEventListener('pointerup', RELEASE);
        canvas.addEventListener('pointercancel', RELEASE);
        canvas.addEventListener(
            'wheel',
            (event) => {
                event.preventDefault();
                ZOOM(event.deltaY < 0 ? 1.15 : 1 / 1.15, event.clientX, event.clientY);
            },
            { passive: false },
        );
    }
    return {
        render,
        fit,
        resize,
        // Starts drawing frames from whatever the provider returns until stop() is called.
        start(nextProvider) {
            provider = nextProvider;
            previousLit = null;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(loop);
        },
        stop() {
            cancelAnimationFrame(frame);
            frame = 0;
            provider = null;
        },
        // Show the whole lit land again after the player moved the camera.
        recenter(map) {
            fit(map);
        },
    };
}
