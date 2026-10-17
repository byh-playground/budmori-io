import { DEFINITION } from './definition.js';
import { FormationSkill } from '../model-base.js';
import { applyHealing, resolveUnitStats } from '../../../unit-stats.js';
export class HealingRainSkill extends FormationSkill {
    constructor() {
        super(DEFINITION);
    }
    cast(owner, slot) {
        if (owner.injuredAllies().length === 0) {
            return false;
        }
        owner.addEffect(DEFINITION.id, {
            x: 0,
            y: 0,
            duration: 3,
            total: this.power(slot.level, this.definition.upgradeBase),
        });
        return true;
    }
    update(owner, effect, dt) {
        const SPAN = Math.min(dt, Math.max(0, effect.duration - effect.age));
        effect.age += dt;
        let amount = (effect.total * SPAN) / effect.duration;
        let injured = owner.injuredAllies();
        while (amount > 1e-9 && injured.length) {
            const SHARE = amount / injured.length;
            let spent = 0;
            for (const UNIT of injured) {
                spent += applyHealing(UNIT, SHARE, { ...resolveUnitStats(UNIT), healingReceivedMultiplier: 1 });
            }
            amount -= spent;
            injured = injured.filter((unit) => unit.hp < resolveUnitStats(unit).maxHp - 1e-9);
            if (spent < 1e-9) {
                break;
            }
        }
        return effect.age < effect.duration;
    }
}
