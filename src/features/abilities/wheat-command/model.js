import { growthBuildOf } from '../../species-growth/state.js';
import { getAbilityEffects } from '../../../ability-progression.js';
import { abilityProfile } from '../../../unit-abilities.js';
import { WHEAT_COMMAND_CRIT_FEATURE } from '../wheat-command-crit.js';

const DEFINITION = WHEAT_COMMAND_CRIT_FEATURE.definition;
const ABILITY_ID = DEFINITION.id;

export class WheatCommandModel {
    static config(progression, tier) {
        const ENTRY = progression?.abilities?.[ABILITY_ID];
        if (ENTRY?.treeVersion === 1) {
            const R = growthBuildOf(ENTRY).nodeRanks,
                LEVEL = R['specialty-1'] || 0,
                POWER_RANK = R['basic-1'] || 0;
            const RANGE_MULTIPLIER = 2 + 0.5 * (R['specialty-2'] || 0);
            return {
                level: LEVEL,
                speedValue: (0.5 + 0.125 * LEVEL) * (1 + 0.03 * POWER_RANK),
                powerRank: POWER_RANK,
                tier,
                rangeMultiplier: RANGE_MULTIPLIER,
                radius: abilityProfile(7).range * RANGE_MULTIPLIER,
                growth: true,
            };
        }
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
        // A configured body keeps the same reach beyond its surface. Ordinary
        // troop radii and the shared command's effect/recipient rules are unchanged.
        const RADIUS = config?.radius + (source?.attackRangeOffset ?? 0);
        if (
            !sim ||
            !source ||
            !action ||
            !config ||
            action.wheatCommandResolved ||
            action.wheatAttack?.commandResolved ||
            !Number.isFinite(RADIUS * RADIUS) ||
            RADIUS < 0 ||
            typeof sim.random !== 'function'
        ) {
            return false;
        }
        action.wheatCommandResolved = true;
        if (action.wheatAttack) {
            action.wheatAttack.commandResolved = true;
        }
        if (sim.random() >= DEFINITION.triggerChance) {
            return false;
        }
        const RADIUS_SQUARED = RADIUS * RADIUS,
            TICK = sim.simulationTick;
        // Preserve the field roster and its order; the active encounter body is
        // another same-faction recipient, not a separate buff implementation.
        const UNITS = sim.units || [],
            RECIPIENTS = sim.boss?.active && !UNITS.includes(sim.boss) ? [...UNITS, sim.boss] : UNITS;
        let affected = 0;
        for (const UNIT of RECIPIENTS) {
            const DX = UNIT.x - source.x,
                DY = UNIT.y - source.y;
            if (UNIT.hp > 0 && UNIT.faction === source.faction && DX * DX + DY * DY <= RADIUS_SQUARED) {
                this.refreshBuff(
                    UNIT,
                    config.level,
                    TICK,
                    config.growth ? config.speedValue : undefined,
                    config.growth ? config.tier : undefined,
                    config.growth ? config.powerRank : undefined,
                );
                affected++;
            }
        }
        if (action.wheatAttack) {
            action.wheatAttack.commandTriggered = affected > 0;
        }
        if (affected > 0) {
            sim.combat?.('wheat-command', {
                unit: source.id,
                x: source.x,
                y: source.y,
                z: source.z || 0,
                radius: RADIUS,
                level: config.level,
                affected,
            });
        }
        return affected > 0;
    }
    static refreshBuff(unit, level, tick, bonus, tier, powerRank) {
        if (
            !unit ||
            !Number.isSafeInteger(level) ||
            level < 0 ||
            level > (bonus === undefined ? 2 : 5) ||
            (tier !== undefined && (!Number.isInteger(tier) || tier < 1 || tier > 6 || bonus === undefined)) ||
            (powerRank !== undefined &&
                (!Number.isInteger(powerRank) || powerRank < 0 || powerRank > 10 || bonus === undefined)) ||
            (bonus !== undefined && bonus !== (0.5 + 0.125 * level) * (1 + 0.03 * (powerRank ?? 0))) ||
            !Number.isSafeInteger(tick) ||
            tick < 0
        ) {
            return false;
        }
        const BUFFS = Array.isArray(unit.wheatCommandBuffs)
            ? unit.wheatCommandBuffs.filter((buff) => buff.expiresAtTick > tick)
            : [];
        unit.wheatCommandBuffs = BUFFS;
        const EXISTING = BUFFS.find((buff) => this.buffBonus(buff) === (bonus ?? DEFINITION.powerValues[level])),
            EXPIRES_AT_TICK = tick + DEFINITION.durationTicks * (tier ?? 1);
        const NEXT =
            bonus === undefined
                ? { level, appliedAtTick: tick, expiresAtTick: EXPIRES_AT_TICK }
                : {
                      level,
                      bonus,
                      ...(tier === undefined ? {} : { tier }),
                      ...(powerRank === undefined ? {} : { powerRank }),
                      appliedAtTick: tick,
                      expiresAtTick: EXPIRES_AT_TICK,
                  };
        if (EXISTING) {
            NEXT.expiresAtTick = Math.max(EXISTING.expiresAtTick, EXPIRES_AT_TICK);
            BUFFS[BUFFS.indexOf(EXISTING)] = NEXT;
        } else {
            BUFFS.push(NEXT);
            BUFFS.sort((a, b) => this.buffBonus(a) - this.buffBonus(b));
        }
        unit.ability?.syncAttackSpeedMultiplier?.(tick);
        return true;
    }
    static buffBonus(buff) {
        return buff.bonus ?? DEFINITION.powerValues[buff.level];
    }
    static activeBuff(unit, tick) {
        const BUFFS = Array.isArray(unit?.wheatCommandBuffs) ? unit.wheatCommandBuffs : [];
        let strongest = null;
        for (const BUFF of BUFFS) {
            if (BUFF.expiresAtTick > tick && (!strongest || this.buffBonus(BUFF) > this.buffBonus(strongest))) {
                strongest = BUFF;
            }
        }
        return strongest;
    }
    static attackSpeedMultiplier(unit, tick) {
        const ACTIVE = this.activeBuff(unit, tick);
        return ACTIVE ? 1 + this.buffBonus(ACTIVE) : 1;
    }
}
