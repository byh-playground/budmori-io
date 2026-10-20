// The shared world map: one grid of tiles that every farm sits on.
// Explorers lift the fog tile by tile. Bosses spawn over time on lit tiles within a farm's sight and stay until
// someone beats them; how dangerous a boss is depends only on how far its tile lies from the nearest farm.
import { chooseBossSpecies } from './boss-rewards.js';
export const WORLD_MAP_SETTINGS = {
    radius: 12,
    // Tiles within this many steps of a farm start lit and never hold a boss.
    safeRadius: 1,
    // A boss turns up this often (game seconds) while fewer than maxBosses are out.
    spawnSeconds: 150,
    maxBosses: 3,
    firstTileCost: 60,
    tileCostStep: 4,
    maxDanger: 61,
    // How much harder a tile is to explore than the base cost: the ground it lies on.
    terrainCost: { plain: 1, forest: 1.5, rock: 2, swamp: 2.5 },
    // Stages added per tile of straight-line distance beyond the first ring of bosses.
    dangerPerTile: 4,
    // How far from a farm explorers may lift the fog, in tiles (a square around the farm). Towers add to it.
    baseReach: 2,
};
// How far apart the centres of neighbouring farm cells sit in farm units: exactly one farm's width and height,
// so the grounds meet edge to edge.
export const FARM_CELL = { width: 46, height: 34 };
const SIDE = WORLD_MAP_SETTINGS.radius * 2 + 1;
export const WORLD_MAP_TILE_COUNT = SIDE * SIDE;
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
export function tileIndex(x, y) {
    return (y + WORLD_MAP_SETTINGS.radius) * SIDE + (x + WORLD_MAP_SETTINGS.radius);
}
export function tileX(index) {
    return (index % SIDE) - WORLD_MAP_SETTINGS.radius;
}
export function tileY(index) {
    return Math.floor(index / SIDE) - WORLD_MAP_SETTINGS.radius;
}
function inside(x, y) {
    return Math.abs(x) <= WORLD_MAP_SETTINGS.radius && Math.abs(y) <= WORLD_MAP_SETTINGS.radius;
}
// A stable number in [0, 1) for a tile; the same seed and tile always give the same value.
function tileUnit(seed, index, salt) {
    let value = (seed ^ Math.imul(index + 1, 0x9e3779b9) ^ Math.imul(salt, 0x85ebca6b)) >>> 0;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}
// The reach of a farm is not saved; the game says how far each one sees, and a bare map sees the base reach.
const REACH_PROVIDERS = new WeakMap();
export function setReachProvider(map, provider) {
    REACH_PROVIDERS.set(map, provider);
}
export function farmReachOf(map, plotId) {
    const EXTRA = REACH_PROVIDERS.get(map)?.(plotId) ?? 0;
    return WORLD_MAP_SETTINGS.baseReach + Math.max(0, EXTRA);
}
// Whether a tile lies inside the square that some farm can see.
export function inReach(map, index) {
    const X = tileX(index),
        Y = tileY(index);
    return map.farms.some(
        (farm) =>
            Math.max(Math.abs(X - tileX(farm.tile)), Math.abs(Y - tileY(farm.tile))) <= farmReachOf(map, farm.plotId),
    );
}
function farmTiles(map) {
    return map.farms.map((farm) => farm.tile);
}
// Steps to the nearest farm, counting diagonals as one step.
export function farmDistance(map, index) {
    const X = tileX(index),
        Y = tileY(index);
    let best = Infinity;
    for (const FARM of farmTiles(map)) {
        best = Math.min(best, Math.max(Math.abs(X - tileX(FARM)), Math.abs(Y - tileY(FARM))));
    }
    return best;
}
export function createWorldMap(seed, firstPlotId) {
    const MAP = {
        seed: Number.isSafeInteger(seed) ? seed >>> 0 : 0,
        progress: {},
        exploreTarget: -1,
        challengeTile: -1,
        buildTile: -1,
        revealed: [],
        bosses: [],
        spawnClock: 0,
        spawnCount: 0,
        farms: [{ plotId: firstPlotId, tile: tileIndex(0, 0) }],
    };
    for (let y = -WORLD_MAP_SETTINGS.safeRadius; y <= WORLD_MAP_SETTINGS.safeRadius; y++) {
        for (let x = -WORLD_MAP_SETTINGS.safeRadius; x <= WORLD_MAP_SETTINGS.safeRadius; x++) {
            MAP.revealed.push(tileIndex(x, y));
        }
    }
    MAP.revealed.sort((a, b) => a - b);
    return MAP;
}
export function isRevealed(map, index) {
    return map.revealed.includes(index);
}
// Straight-line distance from a tile to the nearest farm tile.
function farmReach(map, index) {
    const X = tileX(index),
        Y = tileY(index);
    let best = Infinity;
    for (const FARM of farmTiles(map)) {
        best = Math.min(best, Math.hypot(X - tileX(FARM), Y - tileY(FARM)));
    }
    return best;
}
// Danger is the stage the existing raid curve already knows: a boss two tiles from a farm is stage 1.
export function tileDanger(map, index) {
    const STAGE = Math.round(1 + (farmReach(map, index) - 2) * WORLD_MAP_SETTINGS.dangerPerTile);
    return Math.max(1, Math.min(WORLD_MAP_SETTINGS.maxDanger, STAGE));
}
export function hasBoss(map, index) {
    return map.bosses.includes(index);
}
export function tileInfo(map, index) {
    const REVEALED = isRevealed(map, index),
        BOSS = hasBoss(map, index);
    return {
        index,
        x: tileX(index),
        y: tileY(index),
        revealed: REVEALED,
        boss: REVEALED && BOSS,
        danger: tileDanger(map, index),
    };
}
// The species of a boss on a tile never changes, so it looks the same every time the map is opened.
export function tileSpecies(map, index) {
    return chooseBossSpecies(() => tileUnit(map.seed, index, 3));
}
// A boss can be challenged when its tile is lit and inside the sight of a farm.
export function canChallenge(map, index) {
    return isRevealed(map, index) && hasBoss(map, index) && inReach(map, index);
}
export function beginChallenge(map, index) {
    if (!canChallenge(map, index)) {
        return false;
    }
    map.challengeTile = index;
    return true;
}
// A won raid removes the boss (another one spawns later); a lost or dropped one only ends the challenge.
export function finishChallenge(map, victory) {
    const TILE = map.challengeTile ?? -1;
    map.challengeTile = -1;
    if (!victory || TILE < 0 || !hasBoss(map, TILE)) {
        return false;
    }
    map.bosses = map.bosses.filter((boss) => boss !== TILE);
    return true;
}
// Time passes: a boss spawns on a random lit tile in some farm's sight each time the clock runs out, while there
// are fewer than the cap. Returns the tiles that got a boss.
export function advanceSpawns(map, seconds) {
    const SPAWNED = [];
    map.spawnClock += seconds;
    while (map.spawnClock >= WORLD_MAP_SETTINGS.spawnSeconds) {
        const CANDIDATES = map.revealed.filter(
            (tile) =>
                farmDistance(map, tile) > WORLD_MAP_SETTINGS.safeRadius && !hasBoss(map, tile) && inReach(map, tile),
        );
        if (map.bosses.length >= WORLD_MAP_SETTINGS.maxBosses || CANDIDATES.length === 0) {
            map.spawnClock = WORLD_MAP_SETTINGS.spawnSeconds;
            break;
        }
        map.spawnClock -= WORLD_MAP_SETTINGS.spawnSeconds;
        const TILE = CANDIDATES[Math.floor(tileUnit(map.seed, map.spawnCount, 11) * CANDIDATES.length)];
        map.spawnCount++;
        map.bosses.push(TILE);
        map.bosses.sort((a, b) => a - b);
        SPAWNED.push(TILE);
    }
    return SPAWNED;
}

export const TERRAIN_NAMES = { plain: '평지', forest: '숲', rock: '바위산', swamp: '늪' };
// The ground of a tile never changes. It is only known once the tile is lit, but it decides how long the fog takes.
export function tileTerrain(map, index) {
    const ROLL = tileUnit(map.seed, index, 4);
    return ROLL < 0.55 ? 'plain' : ROLL < 0.75 ? 'forest' : ROLL < 0.9 ? 'rock' : 'swamp';
}
// Gauge points one more tile costs; later tiles cost more.
export function exploreCost(map) {
    const REVEALED_BEYOND_START = Math.max(0, map.revealed.length - (WORLD_MAP_SETTINGS.safeRadius * 2 + 1) ** 2);
    return WORLD_MAP_SETTINGS.firstTileCost + WORLD_MAP_SETTINGS.tileCostStep * REVEALED_BEYOND_START;
}
// What it takes to lift the fog from one particular tile: the base cost times its ground.
export function tileCost(map, index) {
    return Math.round(exploreCost(map) * WORLD_MAP_SETTINGS.terrainCost[tileTerrain(map, index)]);
}
function touchesLight(index, lit) {
    const X = tileX(index),
        Y = tileY(index);
    return NEIGHBOURS.some(([dx, dy]) => inside(X + dx, Y + dy) && lit.has(tileIndex(X + dx, Y + dy)));
}
// The tile a farm's explorers go to: the one the player chose when it can be explored, otherwise the fog tile
// closest to that farm among those it can see.
export function exploreTargetFor(map, plotId) {
    const LIT = new Set(map.revealed);
    if (
        map.exploreTarget >= 0 &&
        !LIT.has(map.exploreTarget) &&
        touchesLight(map.exploreTarget, LIT) &&
        inReach(map, map.exploreTarget)
    ) {
        return map.exploreTarget;
    }
    const FARM = map.farms.find((farm) => farm.plotId === plotId);
    if (!FARM) {
        return -1;
    }
    const REACH = farmReachOf(map, plotId),
        FX = tileX(FARM.tile),
        FY = tileY(FARM.tile);
    let best = -1,
        bestScore = Infinity;
    for (let y = FY - REACH; y <= FY + REACH; y++) {
        for (let x = FX - REACH; x <= FX + REACH; x++) {
            if (!inside(x, y)) {
                continue;
            }
            const INDEX = tileIndex(x, y);
            if (LIT.has(INDEX) || !touchesLight(INDEX, LIT)) {
                continue;
            }
            const SCORE = Math.max(Math.abs(x - FX), Math.abs(y - FY)) + tileUnit(map.seed, INDEX, 2) * 0.5;
            if (SCORE < bestScore) {
                best = INDEX;
                bestScore = SCORE;
            }
        }
    }
    return best;
}
// A tile's fog is a grid of pieces. The explorers' work lifts them one at a time, and the tile is lit once
// nearly all of them are gone. map.progress keeps, per fogged tile, the sorted list of lifted pieces.
export const FOG_GRID = 8;
export const FOG_PIECES = FOG_GRID * FOG_GRID;
export const FOG_LIT_AT = FOG_PIECES - 2;
const PIECE_W = FARM_CELL.width / FOG_GRID,
    PIECE_H = FARM_CELL.height / FOG_GRID;
// A piece's centre and the piece under a point, in the tile's own coordinates (centre 0,0; farm y runs up).
export function fogPieceCenter(piece) {
    return {
        x: ((piece % FOG_GRID) + 0.5) * PIECE_W - FARM_CELL.width / 2,
        y: (Math.floor(piece / FOG_GRID) + 0.5) * PIECE_H - FARM_CELL.height / 2,
    };
}
export function fogPieceAt(x, y) {
    const COL = Math.min(FOG_GRID - 1, Math.max(0, Math.floor((x + FARM_CELL.width / 2) / PIECE_W))),
        ROW = Math.min(FOG_GRID - 1, Math.max(0, Math.floor((y + FARM_CELL.height / 2) / PIECE_H)));
    return ROW * FOG_GRID + COL;
}
// A piece away from the ones other explorers hold is worth walking a little further for (up to a few pieces).
function spreadBonus(piece, taken) {
    if (!taken || taken.size === 0) {
        return 0;
    }
    const C = fogPieceCenter(piece);
    let nearest = Infinity;
    for (const OTHER of taken) {
        const O = fogPieceCenter(OTHER);
        nearest = Math.min(nearest, Math.hypot(C.x - O.x, C.y - O.y));
    }
    return Math.min(nearest, 18) * 0.7;
}
// The piece an explorer standing at (x, y) in the tile works on: the nearest one still under fog that no other
// explorer has taken (the nearest taken one when every piece is taken), -1 if none is left.
export function nearestFogPiece(map, tile, x, y, taken = null) {
    const LIFTED = new Set(map.progress[tile] ?? []);
    let best = -1,
        bestDistance = Infinity;
    for (let piece = 0; piece < FOG_PIECES; piece++) {
        if (LIFTED.has(piece)) {
            continue;
        }
        const C = fogPieceCenter(piece),
            D = Math.hypot(C.x - x, C.y - y) + (taken?.has(piece) ? 1000 : 0) - spreadBonus(piece, taken);
        if (D < bestDistance) {
            best = piece;
            bestDistance = D;
        }
    }
    return best;
}
// Work one piece of a tile's fog takes.
export function fogPieceCost(map, tile) {
    return tileCost(map, tile) / FOG_PIECES;
}
// How much of the tile's fog is gone, from 0 to 1; `partial` is the worked-on share of pieces not yet lifted.
export function exploreFraction(map, index, partial = 0) {
    return Math.min(1, ((map.progress[index]?.length ?? 0) + partial) / FOG_PIECES);
}
// A fogged tile can be picked as the next exploration target when it touches lit ground.
export function canExploreTile(map, index) {
    return (
        Number.isSafeInteger(index) &&
        index >= 0 &&
        index < WORLD_MAP_TILE_COUNT &&
        !isRevealed(map, index) &&
        touchesLight(index, new Set(map.revealed)) &&
        inReach(map, index)
    );
}
// Chooses where the explorers go next; -1 lets them pick on their own. Returns false for an unreachable tile.
export function setExploreTarget(map, index) {
    if (index === -1) {
        map.exploreTarget = -1;
        return true;
    }
    const LIT = new Set(map.revealed);
    if (!Number.isSafeInteger(index) || index < 0 || index >= WORLD_MAP_TILE_COUNT || LIT.has(index)) {
        return false;
    }
    if (!touchesLight(index, LIT) || !inReach(map, index)) {
        return false;
    }
    map.exploreTarget = index;
    return true;
}
// Lifts one piece of a tile's fog; the tile is lit once all but a couple of pieces are gone. Returns the tiles lit.
export function liftFogPiece(map, tile, piece) {
    if (
        !Number.isSafeInteger(tile) ||
        tile < 0 ||
        tile >= WORLD_MAP_TILE_COUNT ||
        isRevealed(map, tile) ||
        !(piece >= 0 && piece < FOG_PIECES)
    ) {
        return [];
    }
    const LIFTED = map.progress[tile] ?? [];
    if (!LIFTED.includes(piece)) {
        LIFTED.push(piece);
        LIFTED.sort((a, b) => a - b);
    }
    if (LIFTED.length < FOG_LIT_AT) {
        map.progress[tile] = LIFTED;
        return [];
    }
    delete map.progress[tile];
    map.revealed.push(tile);
    map.revealed.sort((a, b) => a - b);
    if (map.exploreTarget === tile) {
        map.exploreTarget = -1;
    }
    return [tile];
}
// A new farm goes on lit ground that no farm holds yet, with no boss on the tile or the ring around it.
export function farmBuildBlock(map, index) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= WORLD_MAP_TILE_COUNT || !isRevealed(map, index)) {
        return 'unexplored';
    }
    if (map.farms.some((farm) => farm.tile === index)) {
        return 'occupied';
    }
    const X = tileX(index),
        Y = tileY(index);
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (!inside(X + dx, Y + dy)) {
                continue;
            }
            const AROUND = tileIndex(X + dx, Y + dy);
            if (hasBoss(map, AROUND)) {
                return 'boss';
            }
        }
    }
    return null;
}
export function canBuildFarm(map, index) {
    return farmBuildBlock(map, index) === null;
}
export function beginFarmBuild(map, index) {
    if (!canBuildFarm(map, index)) {
        return false;
    }
    map.buildTile = index;
    return true;
}
// The farm is finished: it takes the planned tile (or, for a build that was planned before tiles were chosen,
// the lit free tile closest to the first farm).
export function finishFarmBuild(map, plotId) {
    let tile = map.buildTile ?? -1;
    if (!(tile >= 0 && canBuildFarm(map, tile))) {
        tile = -1;
        let bestDistance = Infinity;
        for (let index = 0; index < WORLD_MAP_TILE_COUNT; index++) {
            if (!canBuildFarm(map, index)) {
                continue;
            }
            const DISTANCE = farmDistance(map, index);
            if (DISTANCE < bestDistance) {
                tile = index;
                bestDistance = DISTANCE;
            }
        }
    }
    map.buildTile = -1;
    if (tile < 0) {
        return -1;
    }
    map.farms.push({ plotId, tile });
    // The ring around a new farm is always in sight, so the first thing left to explore is never next door.
    const X = tileX(tile),
        Y = tileY(tile);
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const NEXT = tileIndex(X + dx, Y + dy);
            if (inside(X + dx, Y + dy) && !map.revealed.includes(NEXT)) {
                map.revealed.push(NEXT);
            }
        }
    }
    map.revealed.sort((a, b) => a - b);
    return tile;
}
const SORTED_INDEXES = (list) =>
    Array.isArray(list) &&
    list.every(
        (value, position) =>
            Number.isSafeInteger(value) &&
            value >= 0 &&
            value < WORLD_MAP_TILE_COUNT &&
            (position === 0 || value > list[position - 1]),
    );
// Progress is kept per tile: only tiles still in the fog, as the sorted list of fog pieces already lifted.
const VALID_PROGRESS = (progress) =>
    !!progress &&
    typeof progress === 'object' &&
    !Array.isArray(progress) &&
    Object.entries(progress).every(
        ([key, value]) =>
            /^\d+$/.test(key) &&
            Number(key) < WORLD_MAP_TILE_COUNT &&
            Number.isSafeInteger(value) &&
            value > 0 &&
            value < 1 << FOG_PIECES,
    );
export function isValidWorldMap(map) {
    if (!map || typeof map !== 'object' || Array.isArray(map)) {
        return false;
    }
    const KEYS = Object.keys(map)
        .filter((key) => key !== 'challengeTile' && key !== 'buildTile')
        .sort()
        .join(',');
    if (KEYS !== 'bosses,exploreTarget,farms,progress,revealed,seed,spawnClock,spawnCount') {
        return false;
    }
    if (
        !Number.isSafeInteger(map.seed) ||
        map.seed < 0 ||
        map.seed > 0xffffffff ||
        !VALID_PROGRESS(map.progress) ||
        !Number.isSafeInteger(map.exploreTarget) ||
        map.exploreTarget < -1 ||
        map.exploreTarget >= WORLD_MAP_TILE_COUNT ||
        !(
            map.challengeTile === undefined ||
            (Number.isSafeInteger(map.challengeTile) &&
                map.challengeTile >= -1 &&
                map.challengeTile < WORLD_MAP_TILE_COUNT)
        ) ||
        !(
            map.buildTile === undefined ||
            (Number.isSafeInteger(map.buildTile) && map.buildTile >= -1 && map.buildTile < WORLD_MAP_TILE_COUNT)
        ) ||
        !SORTED_INDEXES(map.revealed) ||
        !SORTED_INDEXES(map.bosses) ||
        !Number.isFinite(map.spawnClock) ||
        map.spawnClock < 0 ||
        !Number.isSafeInteger(map.spawnCount) ||
        map.spawnCount < 0 ||
        !Array.isArray(map.farms) ||
        map.farms.length === 0
    ) {
        return false;
    }
    const LIT = new Set(map.revealed);
    return (
        map.bosses.every((index) => LIT.has(index)) &&
        new Set(map.farms.map((farm) => farm.tile)).size === map.farms.length &&
        map.farms.every(
            (farm) =>
                farm &&
                typeof farm === 'object' &&
                Object.keys(farm).sort().join(',') === 'plotId,tile' &&
                typeof farm.plotId === 'string' &&
                farm.plotId.length > 0 &&
                Number.isSafeInteger(farm.tile) &&
                LIT.has(farm.tile),
        )
    );
}
