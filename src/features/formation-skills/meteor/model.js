import { DEFINITION } from './definition.js';
import { MeteorSkill } from '../model-base.js';
export class LargeMeteorSkill extends MeteorSkill {
    constructor() {
        super(DEFINITION);
        this.knockback = true;
    }
}
