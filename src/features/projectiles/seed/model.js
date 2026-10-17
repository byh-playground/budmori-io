import { DamageProjectile } from '../damage-model.js';
import { FEATURE } from './definition.js';

export class SeedProjectile extends DamageProjectile {
    constructor(dependencies) {
        super(FEATURE, dependencies);
    }
}
