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
        this.protectedFoods = new Set();
        this.waitingSeeds = new Set();
        this.nearbyUnits = [];
        this.eaten = new Set();
        this.work = { protectionVisits: 0, pickupQueries: 0, pickupChecks: 0, deliveryVisits: 0 };
        this.groundedClaims = 0;
        this.byUnit = new Map();
        this.byFood = new Map();
        this.queues = [[], []];
        this.revision = 0;
        this.availabilityRevision = 0;
        this.brokerQueued = false;
    }
    eligible(unit, readyWithin = 0) {
        const W = this.world;
        return (
            !!unit &&
            W.scene === 'farm' &&
            W.farmBossEvent.phase === 'idle' &&
            !W.tower.active &&
            W.unitCollection.has(unit) &&
            unit.hp > 0 &&
            !unit.fed &&
            unit.down <= 0 &&
            unit.stun <= 0 &&
            unit.z <= 0.1 &&
            !this.eaten.has(unit) &&
            !W.isWorker(unit) &&
            !W.unitCollection.reservationOwner(unit)?.startsWith('merge:') &&
            (unit.seedling ? unit.seedling.cooldown <= readyWithin : unit.mature && unit.cooldown <= readyWithin)
        );
    }
    available(food, unit) {
        return (
            this.world._isCurrentGroundedFood(food) &&
            (!this.protectedFoods.has(food) || !!unit?.seedling) &&
            (!this.byFood.has(food) || this.byFood.get(food).unit === unit)
        );
    }
    get availableCount() {
        return Math.max(0, this.world._groundedFoodCount - this.groundedClaims);
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
            grounded: true,
            since: this.world.time,
            progressAt: this.world.time,
            distance: Math.hypot(food.x - unit.x, food.y - unit.y),
        };
        this.protectedFoods.delete(food);
        this.waitingSeeds.delete(unit);
        this.groundedClaims++;
        this.byUnit.set(unit, CLAIM);
        this.byFood.set(food, CLAIM);
        this.trimProtection();
        this.revision++;
        return true;
    }
    releaseUnit(unit) {
        const CLAIM = this.byUnit.get(unit);
        if (!CLAIM) {
            return false;
        }
        if (CLAIM.grounded) {
            this.groundedClaims--;
        }
        this.byUnit.delete(unit);
        this.byFood.delete(CLAIM.food);
        this.revision++;
        this.availabilityRevision++;
        return true;
    }
    foodLanded(food) {
        const CLAIM = this.byFood.get(food);
        if (CLAIM && !CLAIM.grounded) {
            CLAIM.grounded = true;
            this.groundedClaims++;
        }
    }
    target(unit) {
        return this.byUnit.get(unit)?.food || null;
    }
    pickupRadius(unit) {
        return Math.max(FOOD_RESERVATION.pickupMinimum, unit.radius + FOOD_RESERVATION.pickupPadding);
    }
    arrived(unit, food) {
        return this.eligible(unit) && Math.hypot(unit.x - food.x, unit.y - food.y) <= this.pickupRadius(unit);
    }
    canConsume(food, unit) {
        if ((unit && this.eaten.has(unit)) || (this.protectedFoods.has(food) && !unit?.seedling)) {
            return false;
        }
        const CLAIM = this.byFood.get(food);
        if (!CLAIM || CLAIM.unit === unit) {
            return true;
        }
        return (
            !!unit &&
            !CLAIM.unit.seedling &&
            this.arrived(unit, food) &&
            ((!CLAIM.unit.seedling && !!unit.seedling) || !this.arrived(CLAIM.unit, food))
        );
    }
    consumed(food, unit) {
        const PREVIOUS = this.byFood.get(food)?.unit;
        this.protectedFoods.delete(food);
        if (PREVIOUS) {
            this.world.clearFoodTargetSearch(PREVIOUS);
        }
        if (unit) {
            this.world.clearFoodTargetSearch(unit);
            this.eaten.add(unit);
            this.waitingSeeds.delete(unit);
        }
        this.trimProtection();
    }
    trimProtection() {
        const NEEDED = this.waitingSeeds.size;
        while (this.protectedFoods.size > NEEDED) {
            this.protectedFoods.delete(this.protectedFoods.values().next().value);
            this.availabilityRevision++;
        }
    }
    prepareProtection(readyWithin = 0) {
        const W = this.world,
            START = W.profiler?.start();
        const BEFORE = this.work.protectionVisits;
        this.waitingSeeds.clear();
        for (const UNIT of W.unitCollection.items) {
            this.work.protectionVisits++;
            if (UNIT.seedling && this.eligible(UNIT, readyWithin) && !this.byUnit.has(UNIT)) {
                this.waitingSeeds.add(UNIT);
            }
        }
        this.trimProtection();
        // A protected pool covers searches still waiting for their budget. One pass over
        // food, never a unit x food scan. Distant adult leases yield to the next seed meal.
        for (const FOOD of this.protectedFoods) {
            if (!W.food.includes(FOOD)) {
                this.protectedFoods.delete(FOOD);
            }
        }
        for (const FOOD of W.food) {
            this.work.protectionVisits++;
            if (this.protectedFoods.size >= this.waitingSeeds.size) {
                break;
            }
            const CLAIM = this.byFood.get(FOOD);
            if (CLAIM?.unit.seedling || this.protectedFoods.has(FOOD)) {
                continue;
            }
            if (CLAIM) {
                W.clearFoodTargetSearch(CLAIM.unit);
            }
            this.protectedFoods.add(FOOD);
            this.revision++;
        }
        W.profiler?.count('foodProtectionVisits', this.work.protectionVisits - BEFORE);
        W.profiler?.end('foodProtection', START);
    }
    deliveryTarget() {
        // advanceWork may run without a model tick (and after removals). Revalidate here.
        for (const UNIT of this.waitingSeeds) {
            this.work.deliveryVisits++;
            this.world.profiler?.count('foodDeliveryVisits');
            if (!this.eligible(UNIT) || this.byUnit.has(UNIT)) {
                continue;
            }
            return UNIT;
        }
        return null;
    }
    assignDelivery(unit, food) {
        if (!unit || !this.eligible(unit) || this.byUnit.has(unit)) {
            return;
        }
        this.world.clearFoodTargetSearch(unit);
        const CLAIM = {
            unit,
            food,
            grounded: false,
            since: this.world.time,
            progressAt: this.world.time,
            distance: Math.hypot(food.tx - unit.x, food.ty - unit.y),
        };
        this.byUnit.set(unit, CLAIM);
        this.byFood.set(food, CLAIM);
        this.waitingSeeds.delete(unit);
        this.trimProtection();
        this.revision++;
    }
    pickup() {
        const W = this.world,
            START = W.profiler?.start();
        const QUERIES = this.work.pickupQueries,
            CHECKS = this.work.pickupChecks;
        // Unit centers are already in the model's grid; reuse a buffer for local contenders.
        for (const FOOD of W._groundedFoods) {
            if (!W._isCurrentGroundedFood(FOOD)) {
                continue;
            }
            const CLAIM = this.byFood.get(FOOD);
            let winner = CLAIM && this.arrived(CLAIM.unit, FOOD) ? CLAIM.unit : null;
            if (CLAIM?.unit.seedling && !winner) {
                continue;
            }
            if (!winner?.seedling) {
                const R = this.maxPickupRadius;
                this.work.pickupQueries++;
                W.unitSpatial.queryAABB(FOOD.x - R, FOOD.y - R, FOOD.x + R, FOOD.y + R, this.nearbyUnits);
                let distance = winner ? Math.hypot(winner.x - FOOD.x, winner.y - FOOD.y) : Infinity;
                for (const UNIT of this.nearbyUnits) {
                    this.work.pickupChecks++;
                    if (
                        !this.eligible(UNIT) ||
                        ((this.protectedFoods.has(FOOD) || CLAIM?.unit.seedling) && !UNIT.seedling)
                    ) {
                        continue;
                    }
                    if (winner && !UNIT.seedling && (winner.seedling || winner === CLAIM?.unit)) {
                        continue;
                    }
                    const D = Math.hypot(UNIT.x - FOOD.x, UNIT.y - FOOD.y);
                    if (
                        D <= this.pickupRadius(UNIT) &&
                        ((UNIT.seedling && (!winner?.seedling || UNIT.seedling.fed < winner.seedling.fed)) ||
                            (UNIT.seedling?.fed === winner?.seedling?.fed &&
                                (D < distance || (D === distance && UNIT.id < winner?.id))))
                    ) {
                        winner = UNIT;
                        distance = D;
                    }
                }
            }
            if (winner && W.consumeGroundFood(FOOD, winner)) {
                winner.vz = 2;
                W.emit('eat', winner.x, winner.y, 0.5);
                if (winner.seedling) {
                    W.feedSeedling(winner);
                } else {
                    winner.meals = 1;
                    W.markProgressChanged();
                }
            }
        }
        W.profiler?.count('foodPickupQueries', this.work.pickupQueries - QUERIES);
        W.profiler?.count('foodPickupChecks', this.work.pickupChecks - CHECKS);
        W.profiler?.end('foodPickup', START);
    }
    advance(dt = 0) {
        const W = this.world;
        this.eaten.clear();
        this.maxPickupRadius = FOOD_RESERVATION.pickupMinimum;
        for (const UNIT of W.unitCollection.items) {
            this.maxPickupRadius = Math.max(this.maxPickupRadius, this.pickupRadius(UNIT));
        }
        // At most one record per grounded food; no per-unit scan of the food field.
        for (const [UNIT, CLAIM] of this.byUnit) {
            const DISTANCE = Math.hypot(CLAIM.food.x - UNIT.x, CLAIM.food.y - UNIT.y);
            if (DISTANCE + FOOD_RESERVATION.progressDistance < CLAIM.distance) {
                CLAIM.distance = DISTANCE;
                CLAIM.progressAt = W.time;
            }
            if (
                !this.eligible(UNIT, dt) ||
                (!W._isCurrentGroundedFood(CLAIM.food) &&
                    !(UNIT.seedling && CLAIM.food.phase !== 'grounded' && W.food.includes(CLAIM.food))) ||
                W.time - CLAIM.since >= FOOD_RESERVATION.leaseSeconds ||
                W.time - CLAIM.progressAt >= FOOD_RESERVATION.stalledSeconds
            ) {
                W.clearFoodTargetSearch(UNIT);
            }
        }
        this.prepareProtection(dt);
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
                // Finish the oldest seed search before starting another. Rotating all
                // seeds after every candidate made their nearest results stale together.
                // The broker still spends only the SDK quantum and 24 units per tick.
                if (UNIT.seedling) {
                    QUEUE.unshift(STATE);
                } else {
                    QUEUE.push(STATE);
                }
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
