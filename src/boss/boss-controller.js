import { createBarleyArmorShredBuckets } from '../features/abilities/barley-shred/model.js';
import { resolveUnitStats, applyHealing, resolveKnockback } from '../units/unit-stats.js';
import { bossStageStats } from './boss-rewards.js';
import { BOSS_PATTERN_IDS, createBossPatternRuntime, chooseBossPattern } from './boss-patterns.js';
import { CONFIG, CLAMP } from '../model/farm-config.js';
import { BOSS_BEHAVIORS } from '../boss/boss-behaviors.js';

// A controller owns behavior, never a second body/HP/stat record. Encounter
// state stays on the Unit and is captured once by the existing checkpoint.
export class BossController {
    constructor(unit) {
        this.unit = unit;
    }
    configureStage(stage, species = this.unit.species) {
        const STATS = bossStageStats(stage),
            UNIT = this.unit;
        UNIT.ability?.interrupt();
        UNIT.specialAbility?.interrupt();
        UNIT.ability?.resetCombatEffects?.();
        UNIT.generation = ++UNIT._world.entityGenerationSerial;
        UNIT.species = CLAMP(species, 0, CONFIG.unit.speciesCount - 1);
        UNIT.initializeActions();
        UNIT.patternRuntime = createBossPatternRuntime();
        // Reconfiguring this actor cancels its own pending cast, never another actor's faction cast.
        if (UNIT._world.formationRuntime.bossCast?.casterId === UNIT.id) {
            UNIT._world.formationRuntime.bossCast = null;
        }
        UNIT._world._bossHitBatch = UNIT._world._bossHitBatch.filter((hit) => hit.bossId !== UNIT.id);
        UNIT._world.clearPeaRecoveryBoost(UNIT);
        Object.assign(UNIT, {
            deathSplitHandled: false,
            splitUsedThisBattle: false,
            walnutStoredRawDamage: 0,
            walnutGuardUntilTick: 0,
            walnutNextGuardTick: 0,
            wheatCommandUntil: 0,
            wheatCommandCritBonus: 0,
            wheatCommandBuffs: [],
            barleyArmorShredBuckets: createBarleyArmorShredBuckets(),
            landingRecovery: 0,
            scatterAttackCount: 0,
            kidneyLeapReadyTick: 0,
            kidneyLeapLastUseTick: 0,
            chestnutNextThornTick: 0,
            moveControlActive: false,
            knockVx: 0,
            knockVy: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            stun: 0,
            down: 0,
        });
        UNIT.stage = STATS.stage;
        UNIT.setBaseStats({ maxHp: STATS.hp, attackPower: STATS.attackPower });
        UNIT.setHealth(UNIT.maxHp);
        return UNIT;
    }
    armorModifier() {
        const UNIT = this.unit;
        return (1 - CLAMP(UNIT.hp / Math.max(1, UNIT.maxHp), 0, 1)) * 100;
    }
    knock(nx, ny, power, _lift, source) {
        const UNIT = this.unit,
            POWER = resolveKnockback(power, source, UNIT);
        UNIT.knockVx += nx * POWER;
        UNIT.knockVy += ny * POWER;
    }
    advancePatternClock(dt) {
        const RUNTIME = this.unit.patternRuntime;
        RUNTIME.encounterElapsed += dt;
        for (const ID of BOSS_PATTERN_IDS) {
            RUNTIME.cooldowns[ID] = Math.max(0, (RUNTIME.cooldowns[ID] || 0) - dt);
        }
    }
    updatePattern(world, dt, living) {
        const B_LOCAL = this.unit,
            RUNTIME = B_LOCAL.patternRuntime;
        let action = RUNTIME.active;
        if (!action) {
            const TARGETS = world.bossPatternTargets(living, this.unit),
                TARGET = TARGETS.nearest || world.nearestBossTarget(living, undefined, this.unit),
                ELIGIBLE = world.eligibleBossPatterns(living, TARGETS, this.unit),
                SELECTED = chooseBossPattern(RUNTIME, ELIGIBLE, () => world.random());
            if (SELECTED) {
                const BEHAVIOR = BOSS_BEHAVIORS.forId(SELECTED),
                    PICK = BEHAVIOR.selectedTarget(world, TARGETS, TARGET, this.unit);
                world.beginBossPattern(SELECTED, PICK, this.unit);
                action = RUNTIME.active;
                BEHAVIOR.selected(world, this.unit);
            } else {
                return false;
            }
        }
        if (action.phase === 'active' && BOSS_BEHAVIORS.forId(action.id).physicalActive) {
            return true;
        }
        action.phaseElapsed += dt;
        BOSS_BEHAVIORS.update(world, action, dt, living, this.unit);
        return true;
    }
    integrateKnockback(world, dt) {
        const BOSS = this.unit;
        if (Math.hypot(BOSS.knockVx, BOSS.knockVy) < 1e-6) {
            return;
        }
        BOSS.x += BOSS.knockVx * dt;
        BOSS.y += BOSS.knockVy * dt;
        world.boundBody(BOSS, world.scene, BOSS.radius);
        BOSS.knockVx *= Math.exp(-dt * 6);
        BOSS.knockVy *= Math.exp(-dt * 6);
    }
    integrate(world, dt) {
        const BOSS = this.unit;
        // Encounter entrance owns its drop trajectory. The regular body owns
        // gravity, steering and basic-attack motion throughout live combat.
        if (!BOSS.active || (world.scene === 'farm' && world.farmBossEvent.phase !== 'fighting')) {
            return true;
        }
        this.integrateKnockback(world, dt);
        const ACTION = BOSS.patternRuntime.active;
        if (
            BOSS.stun <= 0 &&
            world.formationRuntime.bossCast?.casterId !== BOSS.id &&
            ACTION?.phase === 'active' &&
            BOSS_BEHAVIORS.forId(ACTION.id).physicalActive
        ) {
            const DELAY = Math.min(dt, ACTION.motionDelay || 0);
            ACTION.motionDelay = Math.max(0, (ACTION.motionDelay || 0) - DELAY);
            const ACTIVE_DT = dt - DELAY;
            if (ACTIVE_DT > 0) {
                ACTION.phaseElapsed += ACTIVE_DT;
                BOSS_BEHAVIORS.forId(ACTION.id).updateActive(world, ACTION, ACTIVE_DT, BOSS);
                world._settleBossHits(BOSS);
            }
            return true;
        }
        if (ACTION || world.formationRuntime.bossCast?.casterId === BOSS.id) {
            BOSS.vx = BOSS.vy = 0;
        }
        return false;
    }
    update(world, dt) {
        const B_LOCAL = this.unit;
        B_LOCAL.chaseVx = B_LOCAL.chaseVy = 0;
        B_LOCAL.moveControlActive = false;
        B_LOCAL.landingRecovery = Math.max(0, B_LOCAL.landingRecovery - dt);
        if (!B_LOCAL.active) {
            return;
        }
        if (B_LOCAL.hp <= 0) {
            B_LOCAL.ability.interrupt();
            B_LOCAL.specialAbility?.interrupt();
            B_LOCAL.active = false;
            B_LOCAL.patternRuntime.active = null;
            return;
        }
        const STATS = resolveUnitStats(B_LOCAL);
        if (STATS.regen > 0) {
            applyHealing(B_LOCAL, STATS.regen * dt, STATS);
        }
        // Cooldowns advance exactly once even while a basic cycle or card is
        // occupying the actor. Recovery also keeps advancing during a stun.
        this.advancePatternClock(dt);
        const ACTIVE_ATTACK =
            B_LOCAL.specialAbility && B_LOCAL.specialAbility.phase !== 'idle'
                ? B_LOCAL.specialAbility
                : B_LOCAL.ability;
        if (B_LOCAL.stun > 0 || ACTIVE_ATTACK.phase !== 'idle') {
            world.battleUnit(B_LOCAL, dt, null);
            return;
        }
        if (
            world.formationRuntime.bossCast?.casterId === B_LOCAL.id ||
            B_LOCAL.z > 0.1 ||
            B_LOCAL.landingRecovery > 0
        ) {
            return;
        }
        const LIVING = world.livingBossTargets();
        if (!LIVING.length) {
            return;
        }
        if (!this.updatePattern(world, dt, LIVING)) {
            world.battleUnit(B_LOCAL, dt, world.nearestBossTarget(LIVING, undefined, this.unit));
            B_LOCAL.facing = B_LOCAL.angle;
        }
        world._settleBossHits(this.unit);
    }
}
