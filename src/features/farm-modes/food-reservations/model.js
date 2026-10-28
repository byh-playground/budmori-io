import { FOOD_RESERVATION, FOOD_SEARCH_BROKER_KEY } from './definition.js';
import { captureFoodRuntime, restoreFoodRuntime } from './checkpoint.js';
import { scaleMoveSpeed } from '../../../units/unit-stats.js';

// Exclusive food ownership and the ordering inside one SDK-budgeted search job.
// Units and foods remain owned by the existing collections; these maps only borrow them.
export class FoodReservations {
    constructor(world) {
        this.world = world;
        this.reset();
    }
    reset() {
        this.byUnit = new Map();
        this.byFood = new Map();
        this.queues = [[], []];
        this.revision = 0;
        this.availabilityRevision = 0;
        this.brokerQueued = false;
    }
    eligible(unit) {
        const W = this.world;
        return (
            !!unit &&
            W.scene === 'farm' &&
            W.farmBossEvent.phase === 'idle' &&
            !W.tower.active &&
            W.unitCollection.has(unit) &&
            unit.hp > 0 &&
            !unit.fed &&
            !W.isWorker(unit) &&
            !W.unitCollection.reservationOwner(unit)?.startsWith('merge:') &&
            (unit.seedling ? unit.seedling.cooldown <= 0 : unit.mature && unit.cooldown <= 0)
        );
    }
    available(food, unit) {
        return (
            this.world._isCurrentGroundedFood(food) && (!this.byFood.has(food) || this.byFood.get(food).unit === unit)
        );
    }
    get availableCount() {
        return Math.max(0, this.world._groundedFoodCount - this.byFood.size);
    }
    maxDistance(unit) {
        return scaleMoveSpeed(3.6, unit) * FOOD_RESERVATION.leaseSeconds * 0.75;
    }
    claim(unit, food) {
        if (!this.eligible(unit) || !this.available(food, unit)) {
            return false;
        }
        const PREVIOUS = this.byUnit.get(unit);
        if (PREVIOUS && this.available(PREVIOUS.food, unit)) {
            return PREVIOUS.food === food;
        }
        if (Math.hypot(food.x - unit.x, food.y - unit.y) > this.maxDistance(unit)) {
            return false;
        }
        this.releaseUnit(unit);
        const CLAIM = {
            unit,
            food,
            since: this.world.time,
            progressAt: this.world.time,
            distance: Math.hypot(food.x - unit.x, food.y - unit.y),
        };
        this.byUnit.set(unit, CLAIM);
        this.byFood.set(food, CLAIM);
        this.revision++;
        return true;
    }
    releaseUnit(unit) {
        const CLAIM = this.byUnit.get(unit);
        if (!CLAIM) {
            return false;
        }
        this.byUnit.delete(unit);
        this.byFood.delete(CLAIM.food);
        this.revision++;
        this.availabilityRevision++;
        return true;
    }
    releaseFood(food) {
        const CLAIM = this.byFood.get(food);
        return CLAIM ? this.releaseUnit(CLAIM.unit) : false;
    }
    target(unit) {
        return this.byUnit.get(unit)?.food || null;
    }
    advance() {
        const W = this.world;
        // At most one record per grounded food; no per-unit scan of the food field.
        for (const [UNIT, CLAIM] of this.byUnit) {
            const DISTANCE = Math.hypot(CLAIM.food.x - UNIT.x, CLAIM.food.y - UNIT.y);
            if (DISTANCE + FOOD_RESERVATION.progressDistance < CLAIM.distance) {
                CLAIM.distance = DISTANCE;
                CLAIM.progressAt = W.time;
            }
            if (
                !this.eligible(UNIT) ||
                !W._isCurrentGroundedFood(CLAIM.food) ||
                W.time - CLAIM.since >= FOOD_RESERVATION.leaseSeconds ||
                W.time - CLAIM.progressAt >= FOOD_RESERVATION.stalledSeconds
            ) {
                W.clearFoodTargetSearch(UNIT);
            }
        }
        if (W.scene !== 'farm' || W.farmBossEvent.phase !== 'idle' || W.tower.active) {
            for (const UNIT of [...W._foodSearchStates.keys()]) {
                W.clearFoodTargetSearch(UNIT);
            }
        }
    }
    enqueue(state) {
        this.queues[state.unit.seedling ? 0 : 1].push(state);
        this.ensureBroker();
    }
    cancel(state) {
        for (let index = 0; index < this.queues.length; index++) {
            this.queues[index] = this.queues[index].filter((job) => job !== state);
        }
        if (!this.queues.some((queue) => queue.length)) {
            this.world._foodSearchScheduler?.cancel(FOOD_SEARCH_BROKER_KEY);
            this.brokerQueued = false;
        }
    }
    ensureBroker() {
        if (this.brokerQueued || !this.queues.some((queue) => queue.length)) {
            return;
        }
        this.brokerQueued = true;
        this.world._foodSearchScheduler.enqueue({
            key: FOOD_SEARCH_BROKER_KEY,
            owner: this.world,
            priority: 1,
            isValid: () => this.world.scene === 'farm' && this.brokerQueued,
            step: ({ maxUnits }) => this.step(maxUnits),
            onComplete: () => {
                this.brokerQueued = false;
            },
        });
    }
    step(maxUnits) {
        let unitsUsed = 0;
        while (unitsUsed < maxUnits && this.queues.some((queue) => queue.length)) {
            const QUEUE = this.queues[0].length ? this.queues[0] : this.queues[1],
                STATE = QUEUE.shift(),
                UNIT = STATE.unit;
            if (this.world._foodSearchStates.get(UNIT) !== STATE || !this.eligible(UNIT)) {
                unitsUsed++;
                this.world.clearFoodTargetSearch(UNIT);
                continue;
            }
            if (!this.availableCount) {
                unitsUsed++;
                STATE.status = 'empty';
                STATE.revision = this.world._groundedFoodRevision;
                STATE.availabilityRevision = this.availabilityRevision;
                continue;
            }
            const RESULT = this.world._stepFoodTargetSearch(STATE, maxUnits - unitsUsed);
            unitsUsed += Math.max(1, RESULT.unitsUsed);
            if (RESULT.done) {
                this.world._finishFoodTargetSearch(STATE, RESULT.result);
            } else {
                QUEUE.push(STATE);
            }
        }
        return { done: !this.queues.some((queue) => queue.length), unitsUsed };
    }
    capture() {
        return captureFoodRuntime(this);
    }
    restore(data) {
        restoreFoodRuntime(this, data);
    }
}
