import { isBossActorId, isCombatActorId } from '../../core/combat-identity.js';
import { areOpposingFactions } from '../../core/factions.js';
// One basic attack owns a finite set of slots. Presentation particles are never slots.
// Timings use the simulation tick; probability/RAW/command decisions are sampled by the caller once at launch.
const MAX_ACTION_STRIKES = 32;

// Body-bound strike slots belong to this live incarnation and this exact cycle.
// Already emitted projectiles have their own snapshot/generation lifecycle.
export function attackOwnerCanContinue(world, unit, action, record) {
    return (
        unit.hp > 0 &&
        unit.stun <= 0 &&
        unit.down <= 0 &&
        unit.generation === record.ownerGeneration &&
        world._unitForId(record.owner) === unit &&
        unit.ability?.action === action &&
        unit.ability.phase === 'active'
    );
}

// Runtime sets are derived from the validated transport record once per action. Restored records have new identity
// and reconstruct through the same DTO validator. Only the resolver writes the checkpoint; no hidden timing or damage
// is cached. Each species keeps its own cache, created once at module load.
export function createAttackRuntime() {
    const CACHE = new WeakMap();
    return (record) => {
        let runtime = CACHE.get(record);
        if (!runtime || runtime.checkpoint !== record.attack) {
            runtime = { action: AttackAction.fromDTO(record.attack), checkpoint: record.attack };
            CACHE.set(record, runtime);
        }
        return runtime;
    };
}

// Commits a launched record to its immutable strike plan; `durationTicks` is the plan length.
export function commitAttackAction(world, record, durationTicks) {
    record.launchTick = world.simulationTick;
    record.attack = new AttackAction(
        { durationTicks, strikes: record.shots.map(({ tick, weight }) => ({ tick, weight })) },
        record.launchTick,
    ).toDTO();
}

// Strike candidates in hit order: the chosen target, then the other live opposing bosses, then every opposing unit.
export function strikeCandidates(world, unit, primary) {
    const CANDIDATES = primary ? [primary] : [];
    for (const BOSS of world.bosses) {
        if (BOSS !== primary && BOSS.active && BOSS.hp > 0 && areOpposingFactions(unit, BOSS)) {
            CANDIDATES.push(BOSS);
        }
    }
    // The same live-faction index used by sensing is current after the owner lookup. A boss-only battle needs no
    // scan of every allied body per slot.
    let hasUnitEnemy = false;
    for (const [FACTION, COUNT] of world._liveFactionCounts) {
        if (FACTION !== unit.faction && COUNT > 0) {
            hasUnitEnemy = true;
            break;
        }
    }
    if (hasUnitEnemy) {
        for (const TARGET of world.units) {
            if (TARGET !== primary && TARGET.hp > 0 && areOpposingFactions(unit, TARGET)) {
                CANDIDATES.push(TARGET);
            }
        }
    }
    return CANDIDATES;
}

// The first sample per target is kept for every later strike of the action. A record that carries
// `criticalChances` also freezes the chance used for that sample.
export function sampleCriticalRoll(world, record, key) {
    if (!Object.hasOwn(record.criticalRolls, key)) {
        record.criticalRolls[key] = world.random();
        if (record.criticalChances) {
            record.criticalChances[key] = Math.min(1, Math.max(0, record.source.attackerStats.critChance));
        }
    }
    return Reflect.get(record.criticalRolls, key);
}

function defineAttackAction({ durationTicks, strikes }) {
    if (
        !Number.isSafeInteger(durationTicks) ||
        durationTicks < 1 ||
        !Array.isArray(strikes) ||
        strikes.length < 1 ||
        strikes.length > MAX_ACTION_STRIKES
    ) {
        throw new TypeError('An attack needs a finite duration and bounded strike slots');
    }
    let previousTick = -1;
    let totalWeight = 0;
    for (const STRIKE of strikes) {
        if (
            !Number.isSafeInteger(STRIKE.tick) ||
            STRIKE.tick < previousTick ||
            STRIKE.tick < 0 ||
            STRIKE.tick >= durationTicks ||
            !Number.isFinite(STRIKE.weight) ||
            STRIKE.weight <= 0
        ) {
            throw new TypeError('Invalid attack strike');
        }
        previousTick = STRIKE.tick;
        totalWeight += STRIKE.weight;
    }
    if (Math.abs(totalWeight - 1) > 1e-9) {
        throw new RangeError('Strike weights must share one whole attack damage budget');
    }
    return Object.freeze({
        durationTicks,
        strikes: Object.freeze(strikes.map(({ tick, weight }) => Object.freeze({ tick, weight }))),
    });
}

export class AttackAction {
    constructor(plan, startTick) {
        if (
            !Number.isSafeInteger(startTick) ||
            startTick < 0 ||
            !Number.isSafeInteger(startTick + plan.durationTicks)
        ) {
            throw new RangeError('Invalid action start tick');
        }
        this.plan = defineAttackAction(plan);
        this.startTick = startTick;
        this.nextSlot = 0;
        this.cancelled = false;
        this.lastTick = startTick - 1;
        this.hits = plan.strikes.map(() => new Set());
        this.claims = new Set();
    }

    // Consume before returning, so retrying the same tick cannot emit the same strike twice.
    // The owner decides whether launched projectiles survive cancellation; those have their own lifecycle.
    advance(tick) {
        if (!Number.isSafeInteger(tick) || tick < this.lastTick) {
            throw new RangeError('Attack time must be monotonic simulation ticks');
        }
        this.lastTick = tick;
        const READY = [];
        if (this.cancelled) {
            return READY;
        }
        while (this.nextSlot < this.plan.strikes.length) {
            const STRIKE = this.plan.strikes[this.nextSlot];
            if (tick < this.startTick + STRIKE.tick) {
                break;
            }
            READY.push({ slot: this.nextSlot, weight: STRIKE.weight });
            this.nextSlot += 1;
        }
        return READY;
    }

    claimHit(slot, targetId, generation = null) {
        const KEY = generation === null ? targetId : attackTargetKey(targetId, generation);
        if (
            this.cancelled ||
            !Number.isInteger(slot) ||
            slot < 0 ||
            slot >= this.nextSlot ||
            !validHitKey(KEY) ||
            this.hits[slot].has(KEY)
        ) {
            return false;
        }
        this.hits[slot].add(KEY);
        return true;
    }

    // Named, once-per-action budgets, e.g. command, critical, RAW consumption, or extra attachment.
    // A follow-up strike uses the same action and cannot create another copy of the budget.
    claimOnce(key) {
        if (
            this.cancelled ||
            typeof key !== 'string' ||
            !key ||
            key.length > 128 ||
            this.claims.size >= 64 ||
            this.claims.has(key)
        ) {
            return false;
        }
        this.claims.add(key);
        return true;
    }

    toDTO() {
        return {
            version: 1,
            plan: structuredClone(this.plan),
            startTick: this.startTick,
            nextSlot: this.nextSlot,
            cancelled: this.cancelled,
            lastTick: this.lastTick,
            hits: this.hits.map((hits) => [...hits]),
            claims: [...this.claims],
        };
    }

    static fromDTO(dto) {
        if (!isAttackActionDTO(dto)) {
            throw new TypeError('Invalid attack action checkpoint');
        }
        const ACTION = new AttackAction(dto.plan, dto.startTick);
        ACTION.nextSlot = dto.nextSlot;
        ACTION.cancelled = dto.cancelled;
        ACTION.lastTick = dto.lastTick;
        ACTION.hits = dto.hits.map((hits) => new Set(hits));
        ACTION.claims = new Set(dto.claims);
        return ACTION;
    }

    cancel() {
        this.cancelled = true;
        this.nextSlot = this.plan.strikes.length;
        this.hits.forEach((hits) => hits.clear());
        this.claims.clear();
    }
}

// Type and generation are part of identity; a new boss encounter cannot reuse old hit/critical claims.
export function attackTargetKey(targetId, generation) {
    if (!isCombatActorId(targetId, true) || !Number.isSafeInteger(generation) || generation < 0) {
        return null;
    }
    return JSON.stringify([isBossActorId(targetId) ? 'boss' : 'unit', targetId, generation]);
}

function validHitKey(key) {
    if (Number.isSafeInteger(key) && key >= 0) {
        return true;
    }
    if (typeof key !== 'string' || key.length > 100) {
        return false;
    }
    try {
        const PARTS = JSON.parse(key);
        return (
            Array.isArray(PARTS) &&
            PARTS.length === 3 &&
            PARTS[0] === (isBossActorId(PARTS[1]) ? 'boss' : 'unit') &&
            attackTargetKey(PARTS[1], PARTS[2]) === key
        );
    } catch {
        return false;
    }
}

export function isAttackActionDTO(dto) {
    if (
        !dto ||
        Object.keys(dto).sort().join(',') !== 'cancelled,claims,hits,lastTick,nextSlot,plan,startTick,version' ||
        dto.version !== 1
    ) {
        return false;
    }
    try {
        if (
            Object.keys(dto.plan).sort().join(',') !== 'durationTicks,strikes' ||
            !dto.plan.strikes.every((strike) => Object.keys(strike).sort().join(',') === 'tick,weight')
        ) {
            return false;
        }
        defineAttackAction(dto.plan);
    } catch {
        return false;
    }
    return (
        Number.isSafeInteger(dto.startTick) &&
        dto.startTick >= 0 &&
        Number.isSafeInteger(dto.startTick + dto.plan.durationTicks) &&
        Number.isSafeInteger(dto.nextSlot) &&
        dto.nextSlot >= 0 &&
        dto.nextSlot <= dto.plan.strikes.length &&
        typeof dto.cancelled === 'boolean' &&
        Number.isSafeInteger(dto.lastTick) &&
        dto.lastTick >= dto.startTick - 1 &&
        (!dto.cancelled || dto.nextSlot === dto.plan.strikes.length) &&
        (dto.cancelled ||
            dto.nextSlot === dto.plan.strikes.filter((strike) => dto.startTick + strike.tick <= dto.lastTick).length) &&
        Array.isArray(dto.hits) &&
        dto.hits.length === dto.plan.strikes.length &&
        dto.hits.every(
            (hits, slot) =>
                Array.isArray(hits) &&
                hits.length <= 1024 &&
                (slot < dto.nextSlot || hits.length === 0) &&
                hits.every(validHitKey) &&
                new Set(hits).size === hits.length,
        ) &&
        Array.isArray(dto.claims) &&
        dto.claims.length <= 64 &&
        dto.claims.every((key) => typeof key === 'string' && key.length > 0 && key.length <= 128) &&
        new Set(dto.claims).size === dto.claims.length
    );
}
