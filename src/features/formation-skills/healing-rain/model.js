import { DEFINITION } from './definition.js';
import { FormationSkill } from '../model-base.js';
import { applyHealing, resolveUnitStats } from '../../../unit-stats.js';
export class HealingRainSkill extends FormationSkill {
    constructor() {
        super(DEFINITION);
        this.injuredScratch = [];
    }
    cast(owner, slot) {
        if (owner.injuredAllies().length === 0) {
            return false;
        }
        const PROFILE = this.profile(owner);
        owner.addEffect(DEFINITION.id, {
            x: 0,
            y: 0,
            duration: PROFILE.durationSeconds,
            total: this.power(slot.level, PROFILE.upgradeBase),
        });
        return true;
    }
    update(owner, effect, dt) {
        const SPAN = Math.min(dt, Math.max(0, effect.duration - effect.age));
        effect.age += dt;
        let amount = (effect.total * SPAN) / effect.duration;
        const INJURED = owner.injuredAllies(this.injuredScratch);
        let injuredCount = INJURED.length;
        while (amount > 1e-9 && injuredCount) {
            const SHARE = amount / injuredCount;
            let spent = 0;
            for (let i = 0; i < injuredCount; i++) {
                const UNIT = INJURED[i];
                spent += applyHealing(UNIT, SHARE, { ...resolveUnitStats(UNIT), healingReceivedMultiplier: 1 });
            }
            amount -= spent;
            let remaining = 0;
            for (let i = 0; i < injuredCount; i++) {
                const UNIT = INJURED[i];
                if (UNIT.hp < resolveUnitStats(UNIT).maxHp - 1e-9) {
                    INJURED[remaining++] = UNIT;
                }
            }
            injuredCount = remaining;
            if (spent < 1e-9) {
                break;
            }
        }
        return effect.age < effect.duration;
    }
}
