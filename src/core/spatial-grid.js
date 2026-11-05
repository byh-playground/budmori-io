// The farm's small-world spatial grid: meter-scale actors on a -64..64 world, 1.5 m cells. The grid itself is the
// GameKit `spatial` module's UniformGrid; this file only owns the farm's numbers. Items are tracked by identity
// (units, food, air effects), and anything outside the world is kept apart and tested exactly, so query order is
// the cell row order and then insertion order for every caller.
const { UniformGrid: UNIFORM_GRID } = globalThis.BloomGamekitSpatial;

export const FARM_GRID = Object.freeze({
    cellSize: 1.5,
    width: 128,
    height: 128,
    originX: -64,
    originY: -64,
    outside: 'overflow',
    track: 'identity',
});

export function createFarmGrid() {
    return new UNIFORM_GRID(FARM_GRID);
}

// Cells along one axis; a food search snapshot key is `row * FARM_GRID_COLS + column`.
export const FARM_GRID_COLS = createFarmGrid().cols;
