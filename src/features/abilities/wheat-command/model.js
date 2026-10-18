import { getAbilityEffects } from '../../../ability-progression.js';
import { abilityProfile } from '../../../unit-abilities.js';
import { WHEAT_COMMAND_CRIT_FEATURE } from '../wheat-command-crit.js';

const DEFINITION = WHEAT_COMMAND_CRIT_FEATURE.definition;
const ABILITY_ID = DEFINITION.id;

export class WheatCommandModel {
    static config(progression, tier) {
        const EFFECT = getAbilityEffects(progression, ABILITY_ID, tier);
        if (!EFFECT) {
            return null;
        }
        const RANGE_LEVEL = EFFECT.branchLevels.range || 0,
            RANGE_MULTIPLIER = DEFINITION.branches.range.values[RANGE_LEVEL];
        return {
            level: EFFECT.powerLevel,
            speedValue: EFFECT.value,
            rangeMultiplier: RANGE_MULTIPLIER,
            radius: abilityProfile(7).range * RANGE_MULTIPLIER,
        };
    }
    static trigger(sim, source, action, config) {
        if (
            !sim ||
            !source ||
            !action ||
            !config ||
            action.wheatCommandResolved ||
            !Number.isFinite(config.radius) ||
            typeof sim.random !== 'function'
        ) {
            return false;
        }
        action.wheatCommandResolved = true;
        if (sim.random() >= DEFINITION.triggerChance) {
            return false;
        }
        const RADIUS_SQUARED = config.radius * config.radius,
            TICK = sim.simulationTick;
        let affected = 0;
        for (const UNIT of sim.units || []) {
            const DX = UNIT.x - source.x,
                DY = UNIT.y - source.y;
            if (UNIT.hp > 0 && UNIT.faction === source.faction && DX * DX + DY * DY <= RADIUS_SQUARED) {
                this.refreshBuff(UNIT, config.level, TICK);
                affected++;
            }
        }
        if (affected > 0) {
            sim.combat?.('wheat-command', {
                unit: source.id,
                x: source.x,
                y: source.y,
                z: source.z || 0,
                radius: config.radius,
                level: config.level,
                affected,
            });
        }
        return affected > 0;
    }
    static refreshBuff(unit, level, tick) {
        if (
            !unit ||
            !Number.isSafeInteger(level) ||
            level < 0 ||
            level > 2 ||
            !Number.isSafeInteger(tick) ||
            tick < 0
        ) {
            return false;
        }
        const BUFFS = Array.isArray(unit.wheatCommandBuffs)
            ? unit.wheatCommandBuffs.filter((buff) => buff.expiresAtTick > tick)
            : [];
        unit.wheatCommandBuffs = BUFFS;
        const EXISTING = BUFFS.find((buff) => buff.level === level),
            EXPIRES_AT_TICK = tick + DEFINITION.durationTicks;
        if (EXISTING) {
            EXISTING.expiresAtTick = Math.max(EXISTING.expiresAtTick, EXPIRES_AT_TICK);
        } else {
            BUFFS.push({ level, expiresAtTick: EXPIRES_AT_TICK });
            BUFFS.sort((a, b) => a.level - b.level);
        }
        unit.ability?.syncAttackSpeedMultiplier?.(tick);
        return true;
    }
    static activeBuff(unit, tick) {
        const BUFFS = Array.isArray(unit?.wheatCommandBuffs) ? unit.wheatCommandBuffs : [];
        let strongest = null;
        for (const BUFF of BUFFS) {
            if (BUFF.expiresAtTick > tick && (!strongest || BUFF.level > strongest.level)) {
                strongest = BUFF;
            }
        }
        return strongest;
    }
    static attackSpeedMultiplier(unit, tick) {
        const ACTIVE = this.activeBuff(unit, tick);
        return ACTIVE ? 1 + DEFINITION.powerValues[ACTIVE.level] : 1;
    }
}
