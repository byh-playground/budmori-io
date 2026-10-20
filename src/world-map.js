// The shared world map: one grid of tiles that every farm sits on.
// Explorers fill an exploration gauge; every full gauge lifts the fog from one more tile. Which tiles hold a
// boss nest, and how dangerous they are, is a pure function of the map seed and the distance to the nearest
// farm, so the map needs no stored layout and can be settled offline with plain arithmetic.
import { chooseBossSpecies } from './boss-rewards.js';
export const WORLD_MAP_SETTINGS = {
    radius: 12,
    // Tiles within this many steps of a farm start lit and never hold a nest.
    safeRadius: 1,
    nestChance: 0.34,
    firstTileCost: 60,
    tileCostStep: 4,
    maxDanger: 61,
    // Stages added per tile of straight-line distance beyond the first ring of nests.
    dangerPerTile: 4,
};
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
        gauge: 0,
        exploreTarget: -1,
        challengeTile: -1,
        revealed: [],
        cleared: [],
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
export function isCleared(map, index) {
    return map.cleared.includes(index);
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
// Danger is the stage the existing raid curve already knows: the first ring of nests is stage 1.
export function tileDanger(map, index) {
    const STAGE = Math.round(1 + (farmReach(map, index) - 2) * WORLD_MAP_SETTINGS.dangerPerTile);
    return Math.max(1, Math.min(WORLD_MAP_SETTINGS.maxDanger, STAGE));
}
export function hasNest(map, index) {
    return (
        farmDistance(map, index) > WORLD_MAP_SETTINGS.safeRadius &&
        tileUnit(map.seed, index, 1) < WORLD_MAP_SETTINGS.nestChance
    );
}
export function tileInfo(map, index) {
    const REVEALED = isRevealed(map, index),
        NEST = hasNest(map, index);
    return {
        index,
        x: tileX(index),
        y: tileY(index),
        revealed: REVEALED,
        nest: REVEALED && NEST,
        cleared: isCleared(map, index),
        danger: tileDanger(map, index),
    };
}
// The boss species that holds a nest never changes, so a nest looks the same every time the map is opened.
export function tileSpecies(map, index) {
    return chooseBossSpecies(() => tileUnit(map.seed, index, 3));
}
// A tile belongs to the player when it lies next to a farm or has been cleared.
function claimed(map, index) {
    return isCleared(map, index) || farmDistance(map, index) <= WORLD_MAP_SETTINGS.safeRadius;
}
// Nests can only be challenged from the edge of the claimed land, so the map is taken one step at a time.
export function canChallenge(map, index) {
    if (!isRevealed(map, index) || !hasNest(map, index) || isCleared(map, index)) {
        return false;
    }
    const X = tileX(index),
        Y = tileY(index);
    return NEIGHBOURS.some(([dx, dy]) => inside(X + dx, Y + dy) && claimed(map, tileIndex(X + dx, Y + dy)));
}
export function beginChallenge(map, index) {
    if (!canChallenge(map, index)) {
        return false;
    }
    map.challengeTile = index;
    return true;
}
// A won raid clears the tile for good; a lost or dropped one only ends the challenge.
export function finishChallenge(map, victory) {
    const TILE = map.challengeTile ?? -1;
    map.challengeTile = -1;
    return victory && TILE >= 0 ? markCleared(map, TILE) : false;
}
// Gauge points one more tile costs; later tiles cost more.
export function exploreCost(map) {
    const REVEALED_BEYOND_START = Math.max(0, map.revealed.length - (WORLD_MAP_SETTINGS.safeRadius * 2 + 1) ** 2);
    return WORLD_MAP_SETTINGS.firstTileCost + WORLD_MAP_SETTINGS.tileCostStep * REVEALED_BEYOND_START;
}
function touchesLight(index, lit) {
    const X = tileX(index),
        Y = tileY(index);
    return NEIGHBOURS.some(([dx, dy]) => inside(X + dx, Y + dy) && lit.has(tileIndex(X + dx, Y + dy)));
}
// The tile the explorers lift the fog from next: the chosen one when it is reachable, else the closest to a farm.
export function nextExploreTile(map) {
    const LIT = new Set(map.revealed);
    if (map.exploreTarget >= 0 && !LIT.has(map.exploreTarget) && touchesLight(map.exploreTarget, LIT)) {
        return map.exploreTarget;
    }
    let best = -1,
        bestScore = Infinity;
    for (let index = 0; index < WORLD_MAP_TILE_COUNT; index++) {
        if (LIT.has(index) || !touchesLight(index, LIT)) {
            continue;
        }
        const SCORE = farmDistance(map, index) + tileUnit(map.seed, index, 2) * 0.5;
        if (SCORE < bestScore) {
            best = index;
            bestScore = SCORE;
        }
    }
    return best;
}
// A fogged tile can be picked as the next exploration target when it touches lit ground.
export function canExploreTile(map, index) {
    return (
        Number.isSafeInteger(index) &&
        index >= 0 &&
        index < WORLD_MAP_TILE_COUNT &&
        !isRevealed(map, index) &&
        touchesLight(index, new Set(map.revealed))
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
    if (!touchesLight(index, LIT)) {
        return false;
    }
    map.exploreTarget = index;
    return true;
}
// Adds explorer work to the gauge and lifts the fog for every full gauge. Returns the tiles revealed.
export function advanceExploration(map, points) {
    const FOUND = [];
    if (!(points > 0)) {
        return FOUND;
    }
    map.gauge += points;
    while (FOUND.length < WORLD_MAP_TILE_COUNT) {
        const COST = exploreCost(map),
            NEXT = nextExploreTile(map);
        if (NEXT < 0) {
            map.gauge = 0;
            break;
        }
        if (map.gauge < COST) {
            break;
        }
        map.gauge -= COST;
        map.revealed.push(NEXT);
        map.revealed.sort((a, b) => a - b);
        if (map.exploreTarget === NEXT) {
            map.exploreTarget = -1;
        }
        FOUND.push(NEXT);
    }
    return FOUND;
}
export function markCleared(map, index) {
    if (!isRevealed(map, index) || isCleared(map, index)) {
        return false;
    }
    map.cleared.push(index);
    map.cleared.sort((a, b) => a - b);
    return true;
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
export function isValidWorldMap(map) {
    if (!map || typeof map !== 'object' || Array.isArray(map)) {
        return false;
    }
    const KEYS = Object.keys(map)
        .filter((key) => key !== 'challengeTile')
        .sort()
        .join(',');
    if (KEYS !== 'cleared,exploreTarget,farms,gauge,revealed,seed') {
        return false;
    }
    if (
        !Number.isSafeInteger(map.seed) ||
        map.seed < 0 ||
        map.seed > 0xffffffff ||
        !Number.isFinite(map.gauge) ||
        map.gauge < 0 ||
        !Number.isSafeInteger(map.exploreTarget) ||
        map.exploreTarget < -1 ||
        map.exploreTarget >= WORLD_MAP_TILE_COUNT ||
        !(
            map.challengeTile === undefined ||
            (Number.isSafeInteger(map.challengeTile) &&
                map.challengeTile >= -1 &&
                map.challengeTile < WORLD_MAP_TILE_COUNT)
        ) ||
        !SORTED_INDEXES(map.revealed) ||
        !SORTED_INDEXES(map.cleared) ||
        !Array.isArray(map.farms) ||
        map.farms.length === 0
    ) {
        return false;
    }
    const LIT = new Set(map.revealed);
    return (
        map.cleared.every((index) => LIT.has(index)) &&
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
