// Draws the shared world map as a grid of tile buttons. The grid is built once; every render only updates the
// classes and labels of the tiles, so opening the map or lifting a fog tile never rebuilds the page.
import {
    WORLD_MAP_SETTINGS,
    WORLD_MAP_TILE_COUNT,
    canChallenge,
    isCleared,
    isRevealed,
    nextExploreTile,
    tileDanger,
    tileIndex,
    tileX,
    tileY,
    hasNest,
    farmDistance,
} from './world-map.js';

const SIDE = WORLD_MAP_SETTINGS.radius * 2 + 1;

export function createWorldMapScreen(grid, onSelect) {
    const CELLS = [];
    grid.style.setProperty('--world-map-side', String(SIDE));
    for (let index = 0; index < WORLD_MAP_TILE_COUNT; index++) {
        const CELL = document.createElement('button');
        CELL.type = 'button';
        CELL.className = 'world-map__tile';
        CELL.dataset.tile = String(index);
        CELLS.push(CELL);
        grid.append(CELL);
    }
    grid.addEventListener('click', (event) => {
        const CELL = event.target.closest('[data-tile]');
        if (CELL) {
            onSelect(Number(CELL.dataset.tile));
        }
    });
    return {
        // Colour and label of one tile from the map state; the same text is the tile's accessible name.
        render(map, selected) {
            const NEXT = nextExploreTile(map),
                FARMS = new Set(map.farms.map((farm) => farm.tile));
            CELLS.forEach((cell, index) => {
                const LIT = isRevealed(map, index),
                    NEST = LIT && hasNest(map, index),
                    DONE = isCleared(map, index);
                let state = 'fog',
                    label = '',
                    name = '아직 안개에 덮여 있어요';
                if (FARMS.has(index)) {
                    state = 'farm';
                    label = '농';
                    name = '농장';
                } else if (DONE) {
                    state = 'cleared';
                    label = '✓';
                    name = '정리한 칸';
                } else if (NEST) {
                    state = 'nest';
                    label = String(tileDanger(map, index));
                    name = `보스 둥지, 위험도 ${label}단계`;
                } else if (LIT) {
                    state = 'lit';
                    name = farmDistance(map, index) <= WORLD_MAP_SETTINGS.safeRadius ? '농장 주변' : '빈 칸';
                }
                const CLASSES = ['world-map__tile', `world-map__tile--${state}`];
                if (state === 'nest' && canChallenge(map, index)) {
                    CLASSES.push('world-map__tile--open');
                }
                if (!LIT && index === NEXT) {
                    CLASSES.push('world-map__tile--next');
                }
                if (index === map.exploreTarget) {
                    CLASSES.push('world-map__tile--target');
                }
                if (index === selected) {
                    CLASSES.push('world-map__tile--selected');
                }
                const CLASS_NAME = CLASSES.join(' ');
                if (cell.className !== CLASS_NAME) {
                    cell.className = CLASS_NAME;
                }
                if (cell.textContent !== label) {
                    cell.textContent = label;
                }
                cell.setAttribute('aria-label', `${tileX(index)}, ${tileY(index)} ${name}`);
            });
        },
        center() {
            CELLS[tileIndex(0, 0)]?.scrollIntoView({ block: 'center', inline: 'center' });
        },
    };
}
