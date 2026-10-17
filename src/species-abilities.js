import { isAbilityActive, powerLevelFor } from './ability-progression.js';
import { SPECIES_ABILITY_DEFINITIONS } from './ability-catalog.js';
import { abilityProfile, hasUnitCapability } from './unit-abilities.js';

// These are game-specific contracts, separate from the generic tree/wallet.
// Values below follow docs/unit-stats.md and the confirmed follow-up decisions.
const DEFINITION_BY_ID = new Map(SPECIES_ABILITY_DEFINITIONS.map((definition) => [definition.id, definition]));
export const MAX_BEAN_SPLIT_CHILDREN = Math.max(...DEFINITION_BY_ID.get('pea-death-split').powerValues);
function definitionFor(abilityId) {
    return DEFINITION_BY_ID.get(abilityId) || null;
}
export function getBeanSplitCount(progression, tier = 3) {
    const DEFINITION = definitionFor('pea-death-split');
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
        return 0;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return DEFINITION.powerValues[LEVEL] || DEFINITION.powerValues[0];
}
export function getCornBurstConfig(progression, tier) {
    const DEFINITION = definitionFor('corn-burst-fire');
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
        return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return {
        species: 1,
        attackKind: 'lob',
        projectileCount: DEFINITION.powerValues[LEVEL],
        perProjectileAttackMultiplier:
            abilityProfile(DEFINITION.species).skillMultiplier * DEFINITION.projectileAttackShare,
        skillMultiplierShare: DEFINITION.projectileAttackShare,
        oneBasicAttackCycle: true,
        timeSpaced: true,
    };
}
export function createCornBurstShotSchedule(config, { activeSeconds, recoverySeconds } = {}) {
    if (
        !config ||
        !Number.isFinite(activeSeconds) ||
        activeSeconds < 0 ||
        !Number.isFinite(recoverySeconds) ||
        recoverySeconds < 0
    ) {
        return [];
    }
    const WINDOW_SECONDS = activeSeconds + recoverySeconds;
    if (!(WINDOW_SECONDS > 0) || !Number.isSafeInteger(config.projectileCount) || config.projectileCount < 1) {
        return [];
    }
    return Array.from(
        {
            length: config.projectileCount,
        },
        (_, index) => ({
            shotIndex: index,
            delaySeconds: (index * WINDOW_SECONDS) / config.projectileCount,
            attackMultiplier: config.perProjectileAttackMultiplier,
        }),
    );
}
export function getPopcornExplosionConfig(progression, tier) {
    const DEFINITION = definitionFor('corn-popcorn-chain');
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
        return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    const RADIUS_MULTIPLIER = DEFINITION.radiusMultipliers[LEVEL];
    return {
        species: DEFINITION.species,
        fuseSeconds: DEFINITION.fuseSeconds,
        chainOnPopcornContact: true,
        triggersOncePerProjectile: true,
        eachTargetAtMostOncePerProjectile: true,
        damageMultiplier: DEFINITION.powerValues[LEVEL],
        radiusBaseRangeFraction: DEFINITION.baseRangeFraction,
        radiusMultiplier: RADIUS_MULTIPLIER,
        radius: abilityProfile(DEFINITION.species).range * DEFINITION.baseRangeFraction * RADIUS_MULTIPLIER,
    };
}
export function getChestnutSpikeConfig(progression, tier) {
    const DEFINITION = definitionFor('chestnut-spike-fan');
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
        return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return {
        species: DEFINITION.species,
        targetPattern: 'fan-toward-target',
        projectileCount: DEFINITION.powerValues[LEVEL],
        projectileAttackMultiplier: DEFINITION.projectileAttackMultiplier,
        fanSpreadRadians: DEFINITION.fanSpreadRadians,
        intervalBasicCycles: DEFINITION.intervalBasicCycles,
    };
}
export function getChestnutSpikeIntervalSeconds(config, basicAttackCycleSeconds) {
    if (!config || !Number.isFinite(basicAttackCycleSeconds) || basicAttackCycleSeconds <= 0) {
        return null;
    }
    return config.intervalBasicCycles * basicAttackCycleSeconds;
}
export function getChestnutSpikeFanAngles(config, targetAngle) {
    if (
        !config ||
        !Number.isSafeInteger(config.projectileCount) ||
        config.projectileCount < 1 ||
        !Number.isFinite(config.fanSpreadRadians) ||
        config.fanSpreadRadians < 0 ||
        !Number.isFinite(targetAngle)
    ) {
        return [];
    }
    if (config.projectileCount === 1) {
        return [targetAngle];
    }
    const START = targetAngle - config.fanSpreadRadians / 2;
    const STEP = config.fanSpreadRadians / (config.projectileCount - 1);
    return Array.from(
        {
            length: config.projectileCount,
        },
        (_, index) => START + STEP * index,
    );
}
export function createPopcornExplosionState(projectileId) {
    return {
        projectileId,
        exploded: false,
        damagedTargetIds: [],
    };
}
export function triggerPopcornExplosion(config, state, cause) {
    if (
        !config ||
        !config.triggersOncePerProjectile ||
        !isPopcornExplosionState(state) ||
        state.exploded ||
        !['impact', 'popcorn-contact'].includes(cause)
    ) {
        return {
            triggered: false,
            state,
        };
    }
    return {
        triggered: true,
        state: {
            ...state,
            exploded: true,
            cause,
        },
    };
}
export function canDamageTargetFromPopcornExplosion(state, targetId) {
    return (
        isPopcornExplosionState(state) &&
        state.exploded &&
        targetId !== undefined &&
        targetId !== null &&
        !state.damagedTargetIds.includes(targetId)
    );
}
export function markPopcornTargetDamaged(state, targetId) {
    if (!canDamageTargetFromPopcornExplosion(state, targetId)) {
        return state;
    }
    return {
        ...state,
        damagedTargetIds: [...state.damagedTargetIds, targetId],
    };
}
function isPopcornExplosionState(state) {
    return !!state && typeof state === 'object' && Array.isArray(state.damagedTargetIds);
}

// Called by the deterministic battle simulation on a real unit's death. It
// returns spawn descriptors only; the caller still owns IDs, placement, HP,
// parent sleep, combat membership, and battle-end cleanup.
export function createBeanSplitDescriptors({ unit, progression, inBattle = false } = {}) {
    if (
        !inBattle ||
        !unit ||
        !hasUnitCapability(unit.species, 'deathSplit') ||
        !Number.isFinite(unit.hp) ||
        unit.hp > 0 ||
        unit.isBattleOnlySummon ||
        unit.battleOnlySummon ||
        unit.canSplit === false ||
        unit.splitUsedThisBattle === true
    ) {
        return [];
    }
    const COUNT = getBeanSplitCount(progression, unit.tier);
    if (!COUNT) {
        return [];
    }
    return Array.from(
        {
            length: COUNT,
        },
        () => ({
            species: unit.species,
            tier: 1,
            isBattleOnlySummon: true,
            battleSummonKind: 'pea-death-split',
            battleSummonParentId: unit.id,
            ownerId: unit.ownerId || '',
            farmId: unit.farmId || 0,
            countsTowardPermanentRoster: false,
            eligibleForRaidDeployment: false,
            breedingEligible: false,
            mergeEligible: false,
            canSplit: false,
            splitUsedThisBattle: true,
            usesPersistentSleep: false,
            lifetime: 'until-death-or-battle-end',
        }),
    );
}
export function getContinuousLeapConfig(progression, tier) {
    const DEFINITION = definitionFor('kidney-continuous-leap');
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
        return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return {
        cooldownResetChance: DEFINITION.powerValues[LEVEL],
        resetCooldownOnSuccessfulRoll: true,
        usesExistingAttackReadiness: true,
        leapAtCloseRangeWhenReady: true,
        avoidsGroundSweepWhileAirborne: true,
    };
}
export function shouldResetLeapCooldown(config, roll) {
    return !!config && Number.isFinite(roll) && roll >= 0 && roll < config.cooldownResetChance;
}
export function getLandingShockwaveConfig(progression, tier) {
    const DEFINITION = definitionFor('kidney-landing-shockwave');
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
        return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    const MULTIPLIER = DEFINITION.powerValues[LEVEL];
    return {
        damageMultiplier: MULTIPLIER,
        radiusMultiplier: MULTIPLIER,
        triggersOncePerLanding: true,
        // Repeated shockwaves happen only when the separate continuous-leap tree
        // causes another leap to occur; this module invents no timing or loop.
        repeatedAfterCooldownReset: isAbilityActive(progression, 'kidney-continuous-leap', tier),
    };
}
export function resolveKidneyLandingEffects(progression, tier, roll) {
    const LEAP = getContinuousLeapConfig(progression, tier);
    const SHOCKWAVE = getLandingShockwaveConfig(progression, tier);
    return {
        resetCooldown: shouldResetLeapCooldown(LEAP, roll),
        shockwave: SHOCKWAVE,
        repeatableShockwave: !!LEAP && !!SHOCKWAVE,
    };
}

// Useful when callers need to enumerate only abilities owned by the requested
// species without duplicating the catalog's species mapping.
export function abilitiesForSpecies(species) {
    return SPECIES_ABILITY_DEFINITIONS.filter((definition) => definition.species === species);
}
export function getRiceHarvestMultiplier(progression, tier, targetHp, targetMaxHp) {
    const DEFINITION = definitionFor('rice-low-health-harvest');
    if (
        !isAbilityActive(progression, DEFINITION.id, tier) ||
        !Number.isFinite(targetHp) ||
        !Number.isFinite(targetMaxHp) ||
        targetMaxHp <= 0 ||
        targetHp / targetMaxHp > DEFINITION.targetHpThreshold
    ) {
        return 1;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return DEFINITION.powerValues[LEVEL] || DEFINITION.powerValues[0];
}
export function getWheatCommandConfig(progression, tier) {
    const DEFINITION = definitionFor('wheat-command-crit');
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
        return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return {
        critBonus: DEFINITION.powerValues[LEVEL] || DEFINITION.powerValues[0],
        durationSeconds: DEFINITION.durationSeconds,
        radius: abilityProfile(DEFINITION.species).range * DEFINITION.radiusRangeRatio,
        radiusRangeRatio: DEFINITION.radiusRangeRatio,
    };
}
export function refreshWheatCommandBuff(source, config, now, durationSeconds = config?.durationSeconds) {
    if (!source || !config || !Number.isFinite(now) || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
        return false;
    }
    const CURRENT_UNTIL = Number.isFinite(source.wheatCommandUntil) ? source.wheatCommandUntil : 0;
    const CURRENT_BONUS = Number.isFinite(source.wheatCommandCritBonus) ? source.wheatCommandCritBonus : 0;
    source.wheatCommandUntil = now + durationSeconds;
    source.wheatCommandCritBonus = Math.max(CURRENT_UNTIL > now ? CURRENT_BONUS : 0, config.critBonus);
    return true;
}
export function getBarleyArmorBreakConfig(progression, tier) {
    const DEFINITION = definitionFor('barley-armor-break');
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
        return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return {
        armorReduction: DEFINITION.powerValues[LEVEL] || DEFINITION.powerValues[0],
        durationSeconds: DEFINITION.durationSeconds,
    };
}
export function refreshBarleyArmorBreak(target, config, now, durationSeconds = config?.durationSeconds) {
    if (!target || !config || !Number.isFinite(now) || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
        return false;
    }
    const CURRENT_UNTIL = Number.isFinite(target.barleyArmorBreakUntil) ? target.barleyArmorBreakUntil : 0;
    const CURRENT_REDUCTION = Number.isFinite(target.barleyArmorBreakReduction) ? target.barleyArmorBreakReduction : 0;
    const ACTIVE_REDUCTION = CURRENT_UNTIL > now ? CURRENT_REDUCTION : 0;
    target.barleyArmorBreakUntil = now + durationSeconds;
    target.barleyArmorBreakReduction = Math.max(ACTIVE_REDUCTION, config.armorReduction);
    return true;
}
export function effectiveBarleyArmor(target, baselineArmor, now) {
    const REDUCTION =
        target &&
        Number.isFinite(target.barleyArmorBreakUntil) &&
        target.barleyArmorBreakUntil > now &&
        Number.isFinite(target.barleyArmorBreakReduction)
            ? Math.max(0, Math.min(1, target.barleyArmorBreakReduction))
            : 0;
    return Math.max(0, Number.isFinite(baselineArmor) ? baselineArmor : 0) * (1 - REDUCTION);
}

// Keep draft balance values in the catalog and derive runtime effects here.
export function getPeanutAssaultConfig(progression, tier) {
    const DEFINITION = definitionFor('peanut-separated-assault');
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
        return null;
    }
    return {
        strikeCount: DEFINITION.powerValues[powerLevelFor(progression, DEFINITION.id)],
        attackMultiplier: DEFINITION.strikeAttackMultiplier,
        spreadRadians: DEFINITION.spreadRadians,
    };
}
export function getWalnutGuardConfig(progression, tier) {
    const DEFINITION = definitionFor('walnut-guard-slam');
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
        return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return {
        damageMultiplier: DEFINITION.powerValues[LEVEL],
        receivedDamageMultiplier: DEFINITION.receivedDamageMultiplier,
        receivedKnockbackMultiplier: DEFINITION.receivedKnockbackMultiplier,
        guardRecoveryStartFraction: DEFINITION.guardRecoveryStartFraction,
        radius:
            abilityProfile(DEFINITION.species).range *
            DEFINITION.radiusBaseRangeFraction *
            DEFINITION.radiusMultipliers[LEVEL],
    };
}
export function isWalnutGuardActive(unit, config, recoverySeconds) {
    return (
        !!config &&
        hasUnitCapability(unit?.species, 'guard') &&
        unit.hp > 0 &&
        unit.down <= 0 &&
        unit.stun <= 0 &&
        unit.z <= 0.1 &&
        unit.ability?.phase === 'recover' &&
        !!unit.ability.action &&
        !unit.ability.action.walnutEmpowered &&
        !unit.ability.action.walnutGuardUsed &&
        unit.ability.elapsed >= recoverySeconds * config.guardRecoveryStartFraction &&
        unit.ability.elapsed < recoverySeconds
    );
}
