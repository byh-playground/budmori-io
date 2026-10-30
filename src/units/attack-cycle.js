import { barleyRange } from '../features/species-growth/barley-attack.js';
import { wheatRange } from '../features/species-growth/wheat-attack.js';
import { riceRange } from '../features/species-growth/rice-attack.js';
import { peanutRange } from '../features/species-growth/peanut-attack.js';
import { chestnutRange } from '../features/species-growth/chestnut-attack.js';
import { WheatCommandModel } from '../features/abilities/wheat-command/model.js';
import { resolveUnitStats, scaleAttackRecovery } from './unit-stats.js';
import { abilityProfile, unitCapabilityComposition } from './unit-abilities.js';
import { kitSpecies } from './species-catalog.js';
import { AttackAction } from '../features/species-growth/attack-action.js';
import { composeUnitAttackCycles } from './unit-attack-capabilities.js';
import { areOpposingFactions } from '../core/factions.js';
import { CONFIG } from '../model/farm-config.js';
import { BOSS_BASIC_TIMING } from '../boss/boss-patterns.js';
import { ARENA_GEOMETRY, BALLISTICS } from '../model/arena-geometry.js';

// Initial correction limits are tuning defaults, not extra attack range.
const PREPARE_AIM_PROFILE = Object.freeze({
    movement: 0.75,
    turn: Math.PI / 6,
    lockSeconds: 0.1,
    lockFraction: 0.25,
    cancelRecoverySeconds: 0.1,
});

// A boss swings its basic attack faster than the army does; only the two timings differ.
const BOSS_PROFILES = new WeakMap();
function bossBasicProfile(profile) {
    if (!BOSS_PROFILES.has(profile)) {
        BOSS_PROFILES.set(
            profile,
            Object.freeze({ ...profile, timing: Object.freeze({ ...profile.timing, ...BOSS_BASIC_TIMING }) }),
        );
    }
    return BOSS_PROFILES.get(profile);
}

// The common cycle owns phase, action identity, recovery and bounded prepare aim.
// Capability mixins own their action geometry, budgets and committed behavior.
export class AttackCycle {
    constructor(owner) {
        this.owner = owner;
        this.motionPoint = { x: 0, y: 0, z: 0 };
        this.phase = 'idle';
        this.elapsed = 0;
        this.action = null;
        this.interruptedRecoverySeconds = null;
        this._attackSpeedMultiplier = 1;
    }
    get spec() {
        const PROFILE = abilityProfile(kitSpecies(this.owner));
        return this.owner.patternRuntime ? bossBasicProfile(PROFILE) : PROFILE;
    }
    get composition() {
        return unitCapabilityComposition(kitSpecies(this.owner));
    }
    attackSpeedMultiplier(sim) {
        return WheatCommandModel.attackSpeedMultiplier(this.owner, sim.simulationTick);
    }
    attackRecoverySecondsFor(multiplier) {
        const U = this.owner,
            BASE_ATTACK_SPEED = resolveUnitStats(U).attackSpeed;
        return scaleAttackRecovery(this.spec.timing.recovery, U, {
            attackSpeed: BASE_ATTACK_SPEED * multiplier,
        });
    }
    attackRecoverySeconds(sim) {
        return (
            this.interruptedRecoverySeconds ??
            this.attackRecoverySecondsFor(sim ? this.attackSpeedMultiplier(sim) : this._attackSpeedMultiplier)
        );
    }
    attackRange(sim) {
        const U = this.owner;
        const RANGE =
            (chestnutRange(sim, U) ??
                peanutRange(sim, U) ??
                riceRange(sim, U) ??
                barleyRange(sim, U) ??
                wheatRange(sim, U) ??
                this.spec.range) + (kitSpecies(U) === 3 ? 0 : (U.tier - 1) * 0.12);
        // Keep the authored surface standoff when a body profile enlarges the actor.
        return RANGE + U.attackRangeOffset;
    }
    syncAttackSpeedMultiplier(tick) {
        const NEXT_MULTIPLIER = WheatCommandModel.attackSpeedMultiplier(this.owner, tick),
            PREVIOUS_MULTIPLIER = this._attackSpeedMultiplier;
        if (
            this.phase === 'recover' &&
            this.interruptedRecoverySeconds === null &&
            NEXT_MULTIPLIER !== PREVIOUS_MULTIPLIER
        ) {
            const PREVIOUS_RECOVERY = this.attackRecoverySecondsFor(PREVIOUS_MULTIPLIER),
                NEXT_RECOVERY = this.attackRecoverySecondsFor(NEXT_MULTIPLIER);
            if (PREVIOUS_RECOVERY > 0) {
                this.elapsed = Math.min(NEXT_RECOVERY, (this.elapsed * NEXT_RECOVERY) / PREVIOUS_RECOVERY);
            }
        }
        this._attackSpeedMultiplier = NEXT_MULTIPLIER;
    }
    begin(sim, target) {
        const U = this.owner;
        if (this.phase !== 'idle' || U.down > 0 || U.stun > 0 || U.z > 0.1 || U.landingRecovery > 0) {
            return false;
        }
        this.phase = 'windup';
        this.elapsed = 0;
        this.interruptedRecoverySeconds = null;
        this._attackSpeedMultiplier = this.attackSpeedMultiplier(sim);
        this.action = {
            id: ++sim.attackSerial,
            target: {
                ...target,
            },
            targetId: target.id ?? 'boss',
            targetGeneration: target.generation ?? sim._unitForId(target.id)?.generation ?? 0,
            hit: false,
            path: null,
        };
        const TARGET = sim.attackTarget(U, this.action);
        if (TARGET?.hp > 0) {
            this.action.prepareAim = {
                originX: U.x,
                originY: U.y,
                startX: TARGET.x,
                startY: TARGET.y,
                x: TARGET.x,
                y: TARGET.y,
                radius: TARGET.radius,
                reacquired: false,
                locked: false,
            };
        }
        this.prepareAttack?.(sim);
        U.angle = Math.atan2(target.y - U.y, target.x - U.x);
        U.vx = U.vy = 0;
        sim.combatEvent('prepare', U, this.action, this);
        return true;
    }
    interrupt() {
        if (this.phase === 'idle') {
            return;
        }
        // Melee slots belong to the actor. Launched corn/chestnut projectiles
        // keep their existing independent lifetime and captured owner generation.
        const RECORD =
            this.action?.peaAttack ||
            this.action?.redbeanAttack ||
            this.action?.peanutAttack ||
            this.action?.walnutAttack ||
            this.action?.riceAttack ||
            this.action?.wheatAttack ||
            this.action?.barleyAttack;
        if (RECORD?.attack) {
            const ATTACK = AttackAction.fromDTO(RECORD.attack);
            ATTACK.cancel();
            RECORD.attack = ATTACK.toDTO();
        }
        // Cancellation clears pending strikes, but cannot restart a recovery
        // already in progress or lose the species' committed recovery timing.
        if (this.hasFixedRecoveryTiming?.()) {
            this.interruptedRecoverySeconds = this.attackRecoverySeconds();
        }
        if (this.phase !== 'recover') {
            this.phase = 'recover';
            this.elapsed = 0;
        }
        this.action = null;
    }
    recover(sim, recoil = false) {
        this.syncAttackSpeedMultiplier(sim.simulationTick);
        this.phase = 'recover';
        this.elapsed = 0;
        const U = this.owner;
        if (recoil) {
            U.vx = -Math.cos(U.angle) * 2.2;
            U.vy = -Math.sin(U.angle) * 2.2;
        }
        sim.combatEvent('recover', U, this.action, this);
    }
    ready() {
        this.phase = 'idle';
        this.action = null;
        this.elapsed = 0;
        this.interruptedRecoverySeconds = null;
    }
    updatePrepareAim(sim, windup, dt) {
        const A = this.action,
            AIM = A?.prepareAim,
            U = this.owner;
        // Older in-flight checkpoints retain their original aim. A new action
        // alone allocates correction state; restoring cannot restart preparation.
        if (!AIM || AIM.locked) {
            return true;
        }
        if (
            this.elapsed + dt >=
            windup - Math.min(PREPARE_AIM_PROFILE.lockSeconds, windup * PREPARE_AIM_PROFILE.lockFraction)
        ) {
            AIM.locked = true;
            return true;
        }
        const WITHIN_AIM = (target) => {
            const ANGLE = Math.atan2(target.y - U.y, target.x - U.x),
                INITIAL_ANGLE = Math.atan2(AIM.startY - AIM.originY, AIM.startX - AIM.originX),
                TURN = Math.atan2(Math.sin(ANGLE - INITIAL_ANGLE), Math.cos(ANGLE - INITIAL_ANGLE)),
                SLACK = this === U.specialAbility ? 0 : this.composition.outerRangeSlack;
            return (
                Math.hypot(target.x - AIM.startX, target.y - AIM.startY) <= PREPARE_AIM_PROFILE.movement + 1e-9 &&
                Math.abs(TURN) <= PREPARE_AIM_PROFILE.turn + 1e-9 &&
                Math.hypot(target.x - U.x, target.y - U.y) <= target.radius + this.attackRange(sim) + SLACK + 1e-9
            );
        };
        let target = sim.attackTarget(U, A);
        if (!(target?.hp > 0)) {
            if (AIM.reacquired) {
                return false;
            }
            AIM.reacquired = true;
            let distance = Infinity;
            for (const CANDIDATE of sim.combatUnits()) {
                if (
                    CANDIDATE.hp <= 0 ||
                    !areOpposingFactions(U, CANDIDATE) ||
                    !CANDIDATE.dropLanded ||
                    sim._benched.has(CANDIDATE) ||
                    !WITHIN_AIM(CANDIDATE)
                ) {
                    continue;
                }
                const NEXT = Math.hypot(CANDIDATE.x - U.x, CANDIDATE.y - U.y),
                    ID = String(CANDIDATE.id),
                    PREVIOUS_ID = String(target?.id ?? '~');
                if (NEXT < distance || (NEXT === distance && ID < PREVIOUS_ID)) {
                    target = CANDIDATE;
                    distance = NEXT;
                }
            }
            if (!(target?.hp > 0)) {
                return false;
            }
            A.targetId = target.id;
            A.targetGeneration = target.generation;
        }
        if (WITHIN_AIM(target)) {
            AIM.x = target.x;
            AIM.y = target.y;
            AIM.radius = target.radius;
            this.correctPreparedAim?.(sim, AIM);
        }
        return true;
    }
    update(sim, dt) {
        const U = this.owner,
            BLOCKED = U.stun > 0 || U.down > 0;
        if (BLOCKED) {
            this.interrupt();
        }
        if (this.phase === 'windup') {
            const WINDUP = this.attackWindupSeconds?.(sim) ?? this.spec.timing.windup;
            if (!this.updatePrepareAim(sim, WINDUP, dt)) {
                this.interrupt();
                if (this.phase === 'recover') {
                    // No committed attack remains. Yield promptly to a fresh
                    // target or pursuit instead of paying a full attack recovery.
                    this.interruptedRecoverySeconds = Math.min(
                        this.attackRecoverySeconds(sim),
                        PREPARE_AIM_PROFILE.cancelRecoverySeconds,
                    );
                }
            }
        }
        if (
            this.action &&
            (this.phase === 'windup' || this.phase === 'active') &&
            !this.action.cornAttack &&
            !this.action.redbeanAttack &&
            !this.action.chestnutAttack &&
            !this.action.peanutAttack &&
            !this.action.walnutAttack &&
            !this.action.riceAttack &&
            !this.action.wheatAttack &&
            !this.action.barleyAttack &&
            !(sim.attackTarget(U, this.action)?.hp > 0)
        ) {
            this.interrupt();
            return true;
        }
        if (this.phase === 'recover') {
            this.syncAttackSpeedMultiplier(sim.simulationTick);
        }
        if (this.phase === 'idle') {
            return BLOCKED;
        }
        if (this.phase !== 'active') {
            this.elapsed += dt;
        }
        if (this.phase === 'windup') {
            U.vx *= Math.exp(-dt * 18);
            U.vy *= Math.exp(-dt * 18);
            const WINDUP = this.attackWindupSeconds?.(sim) ?? this.spec.timing.windup;
            if (this.elapsed >= WINDUP) {
                this.action.motionDelay = Math.max(0, dt - (this.elapsed - WINDUP));
                this.elapsed = 0;
                this.phase = 'active';
                this.createAttackPath();
                sim.combatEvent('launch', U, this.action, this);
                this.onLaunch?.(sim, this.action);
                this.launchAttack?.(sim);
            }
        } else if (this.phase === 'recover') {
            this.updateRecovery?.(sim);
            if (this.elapsed >= this.attackRecoverySeconds(sim)) {
                this.ready();
            }
        }
        return true;
    }
}

export const CREATE_UNIT_ATTACK_CYCLE = composeUnitAttackCycles(AttackCycle, {
    ArenaGeometry: ARENA_GEOMETRY,
    Ballistics: BALLISTICS,
    CONFIG,
});
