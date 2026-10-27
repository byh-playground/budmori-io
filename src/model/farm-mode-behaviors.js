import { BreedFarmMode } from '../features/farm-modes/breed/model.js';
import { CONFIG } from './farm-config.js';

export const FARM_MODES = Object.freeze({ breed: Object.freeze(new BreedFarmMode(CONFIG)) });
