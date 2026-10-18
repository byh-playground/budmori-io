import { getAbilityEffects } from '../../../ability-progression.js';
import { WALNUT_RAW_GUARD_FEATURE } from './definition.js';

const DEFINITION = WALNUT_RAW_GUARD_FEATURE.definition;

export class WalnutRawGuardModel {
    static config(progression, tier) {
        const EFFECT = getAbilityEffects(progression, DEFINITION.id, tier);
        if (!EFFECT) {
            return null;
        }
        return {
            rawDamageMultiplier: EFFECT.value,
            cooldownTicks: DEFINITION.cooldownTicks,
            durationTicks: DEFINITION.durationTicks,
            armorBonus: DEFINITION.armorBonus,
            maxBonusAttackMultiples: DEFINITION.maxBonusAttackMultiples,
        };
    }
    static canStart(unit, tick, config) {
        return !!(
            config &&
            unit?.hp > 0 &&
            Number.isSafeInteger(tick) &&
            tick >= (unit.walnutNextGuardTick || 0) &&
            !(unit.walnutStoredRawDamage > 0)
        );
    }
    static start(unit, tick, config) {
        if (!this.canStart(unit, tick, config)) {
            return false;
        }
        unit.walnutNextGuardTick = tick + config.cooldownTicks;
        unit.walnutGuardUntilTick = tick + config.durationTicks;
        return true;
    }
    static isGuarding(unit, tick) {
        return !!(unit?.hp > 0 && unit.walnutGuardUntilTick > tick);
    }
    static armorBonus(unit, tick, config) {
        return config && this.isGuarding(unit, tick) ? config.armorBonus : 0;
    }
    static accumulate(unit, rawDamage, tick, config) {
        if (!config || !this.isGuarding(unit, tick) || !Number.isFinite(rawDamage) || rawDamage <= 0) {
            return false;
        }
        unit.walnutStoredRawDamage = (unit.walnutStoredRawDamage || 0) + rawDamage;
        return true;
    }
    static nextHammerBonus(unit, attackPower, config) {
        if (!config || !Number.isFinite(unit?.walnutStoredRawDamage) || unit.walnutStoredRawDamage <= 0) {
            return 0;
        }
        return Math.min(
            unit.walnutStoredRawDamage * config.rawDamageMultiplier,
            attackPower * config.maxBonusAttackMultiples,
        );
    }
    static consume(unit) {
        const CONSUMED = Number.isFinite(unit?.walnutStoredRawDamage) && unit.walnutStoredRawDamage > 0;
        if (unit) {
            unit.walnutStoredRawDamage = 0;
        }
        return CONSUMED;
    }
    static clear(unit) {
        unit.walnutGuardUntilTick = 0;
        unit.walnutStoredRawDamage = 0;
    }
}
