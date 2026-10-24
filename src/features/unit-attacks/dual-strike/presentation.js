import { UnitAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';

// The two kernels remain authored parts of one native vector player. The model's
// finite slot schedule drives these clips; they never own actors, HP or damage.
export class DualStrikePresentation extends UnitAttackPresentation {
    constructor() {
        super();
        this.id = FEATURE.id;
    }
    windupMotion(unit) {
        return unit.ability.peanutForm ? `windup-t${unit.ability.peanutForm}` : 'windup';
    }
    activeMotion(unit) {
        return unit.ability.peanutForm
            ? `fire-t${unit.ability.peanutForm}`
            : unit.ability.peanutStrikeCount > 2
              ? `fire-${unit.ability.peanutStrikeCount}`
              : 'fire';
    }
    clipElapsedMs(unit, motion) {
        const FORM = unit.ability.peanutForm;
        // These short cooperation clips share the actual action phase clock.
        // A paused/reset frame clock must not advance a kernel into its next slot.
        return FORM && (motion === `windup-t${FORM}` || motion === `fire-t${FORM}`)
            ? unit.ability.elapsed * 1000
            : null;
    }
}
