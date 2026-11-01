import { formationHealingBudget } from '../../../formation/formation-damage.js';
import { DEFINITION } from './definition.js';
import { FormationSkill } from '../model-base.js';
import { applyHealing, resolveUnitStats, unitMaxHpFor } from '../../../units/unit-stats.js';
export class HealingRainSkill extends FormationSkill {
    constructor() {
        super(DEFINITION);
        this.injuredScratch = [];
        this.chargeSnapshots = new WeakMap();
        this.recipientIdentities = new WeakMap();
    }
    originalAllies(owner) {
        return (owner.role === 'boss' ? [owner.caster] : owner.allies()).filter(
            (unit) => unit && unit.hp > 0 && !unit.seedling && !unit.isFormationClone && !unit.isBattleOnlySummon,
        );
    }
    requiredCharge(owner, slot, force = false) {
        const PROFILE = this.profile(owner),
            CASTER = owner.role === 'boss' ? owner.caster : null,
            KEY = `${owner.world.simulationTick}:${owner.world.tower.floor}:${slot.level}:${owner.role}:${CASTER?.id}:${CASTER?.generation}:${CASTER?.maxHp}`;
        if (force || this.chargeSnapshots.get(slot) !== KEY) {
            const ORIGINALS = this.originalAllies(owner),
                AVERAGE = ORIGINALS.length
                    ? ORIGINALS.reduce((sum, unit) => sum + unitMaxHpFor(unit), 0) / ORIGINALS.length
                    : 0;
            slot.healingTotal = formationHealingBudget(
                PROFILE,
                owner.world.tower.floor,
                slot.level,
                owner.role,
                AVERAGE,
            );
            slot.required = slot.healingTotal * PROFILE.chargeRatio;
            slot.charge = Math.min(slot.charge || 0, slot.required);
            this.chargeSnapshots.set(slot, KEY);
        }
        return slot.required;
    }
    canCast(owner) {
        return owner.injuredAllies().length > 0 && this.originalAllies(owner).length > 0;
    }
    cast(owner, slot) {
        if (!this.canCast(owner)) {
            return false;
        }
        const PROFILE = this.profile(owner);
        this.requiredCharge(owner, slot, true);
        owner.addEffect(DEFINITION.id, {
            x: 0,
            y: 0,
            duration: PROFILE.durationSeconds,
            total: slot.healingTotal,
            recipients: [],
        });
        return true;
    }
    update(owner, effect, dt) {
        const SPAN = Math.min(dt, Math.max(0, effect.duration - effect.age));
        effect.age += dt;
        let amount = (effect.total * SPAN) / effect.duration;
        const INJURED = owner.injuredAllies(this.injuredScratch);
        effect.recipients ||= [];
        let identities = this.recipientIdentities.get(effect);
        if (!identities) {
            identities = new Set(effect.recipients.map(({ id, generation }) => `${id}:${generation}`));
            this.recipientIdentities.set(effect, identities);
        }
        let injuredCount = INJURED.length;
        while (amount > 1e-9 && injuredCount) {
            const SHARE = amount / injuredCount;
            let spent = 0;
            for (let i = 0; i < injuredCount; i++) {
                const UNIT = INJURED[i];
                const HEALED = applyHealing(UNIT, SHARE, { ...resolveUnitStats(UNIT), healingReceivedMultiplier: 1 });
                spent += HEALED;
                const IDENTITY = `${UNIT.id}:${UNIT.generation}`;
                if (HEALED > 0 && !identities.has(IDENTITY)) {
                    effect.recipients.push({ id: UNIT.id, generation: UNIT.generation });
                    identities.add(IDENTITY);
                }
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
        return effect.age + 1e-9 < effect.duration;
    }
}
