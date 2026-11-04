import { createBarleyArmorShredBuckets } from '../features/abilities/barley-shred/model.js';
import { unitStats, applyHealing, resolveKnockback } from '../units/unit-stats.js';
import { bossStageStats } from './boss-rewards.js';
import { BOSS_STAGGER, BOSS_PATTERN_IDS, createBossPatternRuntime } from './boss-patterns.js';
import { BossTurn, BOSS_TURN, BOSS_STAGGER_STATES } from './boss-turn.js';
import { CONFIG, CLAMP } from '../model/farm-config.js';
import { BOSS_BEHAVIORS } from '../boss/boss-behaviors.js';

// A controller owns behavior, never a second body/HP/stat record. Encounter
// state stays on the Unit and is captured once by the existing checkpoint.
export class BossController {
    constructor(unit) {
        this.unit = unit;
        this.turn = new BossTurn(this);
    }
    configureStage(stage, species = this.unit.species) {
        const STATS = bossStageStats(stage),
            UNIT = this.unit;
        UNIT.ability?.interrupt();
        UNIT.specialAbility?.interrupt();
        UNIT.ability?.resetCombatEffects?.();
        UNIT.generation = ++UNIT._world.entityGenerationSerial;
        UNIT.species = CLAMP(species, 0, CONFIG.unit.speciesCount);
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
            basicCount: 0,
            specialCount: 0,
            wheatCommandUntil: 0,
            wheatCommandCritBonus: 0,
            wheatCommandBuffs: [],
            barleyArmorShredBuckets: createBarleyArmorShredBuckets(),
            landingRecovery: 0,
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
    receivedDamageScale() {
        return this.unit.stun > 0 ? BOSS_STAGGER.damageTaken : 1;
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
        // The farm boss's entrance owns its drop trajectory (boss-event-phases.js). A tower floor's entrance leaps
        // are ordinary ballistic flight, so the regular body owns them as it owns gravity, steering and basic-attack
        // motion throughout live combat.
        const PHASE = world.farmBossEvent.phase,
            BODY_MOVES = PHASE === 'fighting';
        if (!BOSS.active || (world.scene === 'farm' && !BODY_MOVES)) {
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
        B_LOCAL.enraged = world.bossEnraged;
        const TURN = this.turn.begin(world, dt);
        BOSS_STAGGER_STATES.update(B_LOCAL.patternRuntime, TURN);
        const STATS = unitStats(B_LOCAL);
        if (STATS.regen > 0) {
            applyHealing(B_LOCAL, STATS.regen * dt, STATS);
        }
        // Cooldowns advance exactly once even while a basic cycle or card is
        // occupying the actor. Recovery also keeps advancing during a stun.
        this.advancePatternClock(dt);
        BOSS_TURN.decide(TURN);
    }
}
