import { DamageProjectile } from '../damage-model.js';
import { FEATURE } from './definition.js';

export class SpikeProjectile extends DamageProjectile {
    constructor(dependencies) {
        super(FEATURE, dependencies);
    }
}
