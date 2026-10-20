import { FARM_CAPACITY_STEPS } from './farm-upgrades.js';
import { SPECIES_COUNT } from './species-catalog.js';

export const INITIAL_FARM_PLOT_ID = 'plot-1';
export const RESERVE_PLOT_ID = 'reserve';
export const MAX_FARM_FOOD = 140;

export function createFarmPlotsProgression() {
    return {
        plots: [{ id: INITIAL_FARM_PLOT_ID, capacityLevel: FARM_CAPACITY_STEPS.length - 1 }],
        currentPlotId: INITIAL_FARM_PLOT_ID,
        nextPlotNumber: 2,
        targetBasisPoints: Array.from({ length: SPECIES_COUNT }, (_, speciesId) => Number(speciesId === 0) * 10000),
    };
}

export function getFarmPlotsCapacity(state) {
    if (!isValidFarmPlotsProgression(state)) {
        return 0;
    }
    return state.plots.reduce((total, plot) => total + FARM_CAPACITY_STEPS[plot.capacityLevel], 0);
}

export function isValidFarmPlotsProgression(state) {
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
        return false;
    }
    const KEYS = Object.keys(state).sort();
    if (KEYS.join(',') !== 'currentPlotId,nextPlotNumber,plots,targetBasisPoints') {
        return false;
    }
    if (
        !Array.isArray(state.plots) ||
        state.plots.length === 0 ||
        !Number.isSafeInteger(state.nextPlotNumber) ||
        state.nextPlotNumber !== state.plots.length + 1 ||
        !Array.isArray(state.targetBasisPoints) ||
        state.targetBasisPoints.length !== SPECIES_COUNT ||
        !state.targetBasisPoints.every((value) => Number.isSafeInteger(value) && value >= 0 && value <= 10000) ||
        state.targetBasisPoints.reduce((total, value) => total + value, 0) !== 10000
    ) {
        return false;
    }
    const IDS = new Set();
    for (let index = 0; index < state.plots.length; index++) {
        const PLOT = state.plots[index];
        if (
            !PLOT ||
            typeof PLOT !== 'object' ||
            Array.isArray(PLOT) ||
            Object.keys(PLOT).sort().join(',') !== 'capacityLevel,id' ||
            PLOT.id !== `plot-${index + 1}` ||
            !Number.isSafeInteger(PLOT.capacityLevel) ||
            PLOT.capacityLevel < 0 ||
            PLOT.capacityLevel >= FARM_CAPACITY_STEPS.length ||
            IDS.has(PLOT.id)
        ) {
            return false;
        }
        IDS.add(PLOT.id);
    }
    return IDS.has(state.currentPlotId);
}

export class FarmPlot {
    constructor(state, food = []) {
        const { id: ID, capacityLevel: CAPACITY_LEVEL } = state || {};
        if (typeof ID !== 'string' || !/^plot-[1-9]\d*$/.test(ID)) {
            throw new TypeError('A farm plot requires a stable plot id.');
        }
        if (
            !Number.isSafeInteger(CAPACITY_LEVEL) ||
            CAPACITY_LEVEL < 0 ||
            CAPACITY_LEVEL >= FARM_CAPACITY_STEPS.length
        ) {
            throw new RangeError('A farm plot capacity level is invalid.');
        }
        if (!Array.isArray(food) || food.length > MAX_FARM_FOOD) {
            throw new RangeError('A farm plot food list is invalid.');
        }
        this.id = ID;
        this.state = state;
        this.food = food;
    }

    get capacityLevel() {
        return this.state.capacityLevel;
    }

    get capacity() {
        return FARM_CAPACITY_STEPS[this.capacityLevel];
    }

    get foodCount() {
        return this.food.length;
    }

    static fromSave(data, food = []) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new TypeError('A farm plot save is invalid.');
        }
        const KEYS = Object.keys(data).sort().join(',');
        if (KEYS !== 'capacityLevel,id') {
            throw new TypeError('A farm plot save has an unexpected shape.');
        }
        return new FarmPlot(data, food);
    }
}

export function createInitialFarmPlot() {
    return new FarmPlot({ id: INITIAL_FARM_PLOT_ID, capacityLevel: FARM_CAPACITY_STEPS.length - 1 });
}
