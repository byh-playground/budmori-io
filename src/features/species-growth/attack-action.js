// One basic attack owns a finite set of slots. Presentation particles are never slots.
// Timings use the simulation tick; probability/RAW/command decisions are sampled by the caller once at launch.
export const MAX_ACTION_STRIKES = 32;

export function defineAttackAction({ durationTicks, strikes }) {
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

    claimHit(slot, targetId) {
        if (
            this.cancelled ||
            !Number.isInteger(slot) ||
            slot < 0 ||
            slot >= this.nextSlot ||
            !Number.isSafeInteger(targetId) ||
            targetId < 0 ||
            this.hits[slot].has(targetId)
        ) {
            return false;
        }
        this.hits[slot].add(targetId);
        return true;
    }

    // Named, once-per-action budgets, e.g. command, critical, RAW consumption, or extra attachment.
    // A follow-up strike uses the same action and cannot create another copy of the budget.
    claimOnce(key) {
        if (this.cancelled || typeof key !== 'string' || !key || this.claims.has(key)) {
            return false;
        }
        this.claims.add(key);
        return true;
    }

    cancel() {
        this.cancelled = true;
        this.nextSlot = this.plan.strikes.length;
        this.hits.forEach((hits) => hits.clear());
        this.claims.clear();
    }
}
