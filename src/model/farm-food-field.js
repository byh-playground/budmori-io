import { CONFIG } from './farm-config.js';
import { scaleMoveSpeed } from '../units/unit-stats.js';
import { FOOD_RESERVATION } from '../features/farm-modes/food-reservations/definition.js';

const EMPTY_FOOD_SEARCH_BUCKET = Object.freeze([]);

/**
 * 농장 식량 공간 색인과 목표 탐색.
 * 상태(`foodSpatial`, `_foodOrder`, `_groundedFoods*`, `_foodSearch*`)는 Garden 생성자가 만들고,
 * 이 클래스는 그 상태를 다루는 메서드만 소유한다. Garden은 이 클래스를 상속한다.
 */
export const FARM_FOOD_FIELD = (base) =>
    class FarmFoodField extends base {
        _refreshFoodSearchSnapshot() {
            const CELLS = new Map();
            for (const KEY of this.foodSpatial.usedCells) {
                const BUCKET = this.foodSpatial.cells[KEY];
                if (BUCKET?.length) {
                    CELLS.set(KEY, BUCKET.slice());
                }
            }
            this._foodSearchSnapshot = {
                revision: this._groundedFoodRevision,
                foods: this._groundedFoods,
                cells: CELLS,
            };
        }
        _rebuildFoodSpatialIndex() {
            const SPATIAL_START = this.profiler?.start(),
                PREVIOUS_FOODS = this._groundedFoods,
                NEXT_FOODS = this._groundedFoodsScratch;
            this.foodSpatial.clear();
            this._foodOrder.clear();
            NEXT_FOODS.length = 0;
            let grounded = 0;
            for (let index = 0; index < this.food.length; index++) {
                const FOOD = this.food[index];
                this._foodOrder.set(FOOD, index);
                if (FOOD.phase === 'grounded') {
                    this.foodSpatial.insert(FOOD);
                    NEXT_FOODS.push(FOOD);
                    grounded++;
                }
            }
            const CHANGED =
                NEXT_FOODS.length !== PREVIOUS_FOODS.length ||
                NEXT_FOODS.some((food, index) => food !== PREVIOUS_FOODS[index]);
            this._groundedFoodCount = grounded;
            if (CHANGED) {
                this._groundedFoodRevision++;
                this._groundedFoods = NEXT_FOODS;
                // Search jobs retain the prior immutable snapshot until their result is discarded.
                this._groundedFoodsScratch = [];
            } else {
                NEXT_FOODS.length = 0;
            }
            if (this._foodSearchSnapshot.revision !== this._groundedFoodRevision) {
                this._refreshFoodSearchSnapshot();
            }
            this._foodSpatialDirty = false;
            this.profiler?.end('spatial', SPATIAL_START);
        }
        _trackFoodAdded(food) {
            if (!this._spatialStepActive) {
                this._foodSpatialDirty = true;
                if (food.phase === 'grounded') {
                    this._groundedFoodRevision++;
                }
                return;
            }
            this._foodOrder.set(food, this.food.length - 1);
            if (food.phase === 'grounded') {
                this.foodSpatial.insert(food);
                this._groundedFoodCount = (this._groundedFoodCount || 0) + 1;
                this._groundedFoodRevision++;
            }
        }
        consumeGroundFood(food, unit = null) {
            if (food?.phase !== 'grounded' || !this.foodSpatial.itemCells.has(food)) {
                return false;
            }
            const CLAIM = this._foodReservations.byFood.get(food);
            if (CLAIM && CLAIM.unit !== unit) {
                return false;
            }
            const INDEX = this.food.indexOf(food);
            if (INDEX < 0) {
                return false;
            }
            this.food.splice(INDEX, 1);
            this._foodReservations.releaseFood(food);
            this.foodSpatial.remove(food);
            this._foodOrder.delete(food);
            this._groundedFoodCount = Math.max(0, this._groundedFoodCount - 1);
            this._groundedFoodRevision++;
            return true;
        }
        _cancelFoodTargetSearch(unit) {
            const STATE = this._foodSearchStates?.get(unit);
            if (!STATE) {
                return false;
            }
            this._foodSearchStates.delete(unit);
            this._foodReservations.cancel(STATE);
            return true;
        }
        clearFoodTargetSearch(unit) {
            this._foodReservations.releaseUnit(unit);
            this._cancelFoodTargetSearch(unit);
        }
        updateFoodSpatial(food) {
            const START = this.profiler?.start();
            this.foodSpatial.update(food);
            this.profiler?.end('spatial', START);
        }
        avoidNearbyFood(u, dt) {
            const RADIUS = 1.25;
            let pushX = 0;
            let pushY = 0;
            let strongest = 0;
            let nearest = null;
            let nearestDistance = Infinity;
            if (!this._spatialStepActive) {
                this._rebuildFoodSpatialIndex();
            }
            this.foodSpatial.queryAABB(u.x - RADIUS, u.y - RADIUS, u.x + RADIUS, u.y + RADIUS, this._foodCandidates);
            this._foodCandidates.sort(
                (a, b) => (this._foodOrder.get(a) ?? Infinity) - (this._foodOrder.get(b) ?? Infinity),
            );
            for (const FOOD of this._foodCandidates) {
                if (FOOD.phase !== 'grounded') {
                    continue;
                }
                const DX = u.x - FOOD.x,
                    DY = u.y - FOOD.y,
                    DISTANCE = Math.hypot(DX, DY);
                if (DISTANCE >= RADIUS) {
                    continue;
                }
                const STRENGTH = 1 - DISTANCE / RADIUS,
                    WEIGHT = STRENGTH * STRENGTH;
                if (DISTANCE < nearestDistance) {
                    nearestDistance = DISTANCE;
                    nearest = FOOD;
                }
                strongest = Math.max(strongest, STRENGTH);
                if (DISTANCE > 1e-6) {
                    pushX += (DX / DISTANCE) * WEIGHT;
                    pushY += (DY / DISTANCE) * WEIGHT;
                }
            }
            if (!nearest) {
                return false;
            }
            let magnitude = Math.hypot(pushX, pushY);
            if (magnitude < 1e-4) {
                if (nearestDistance > 1e-6) {
                    pushX = u.x - nearest.x;
                    pushY = u.y - nearest.y;
                    magnitude = nearestDistance;
                } else {
                    const ANGLE = (u.seed + (nearest.seed || 0)) * 2.3999632297;
                    pushX = Math.cos(ANGLE);
                    pushY = Math.sin(ANGLE);
                    magnitude = 1;
                }
            }
            const AWAY_X = pushX / magnitude,
                AWAY_Y = pushY / magnitude;
            let desiredX = Math.sin(this.time * 0.18 + u.seed) * (CONFIG.farm.arena.radiusX * 0.78) - u.x;
            let desiredY = Math.cos(this.time * 0.16 + u.seed) * (CONFIG.farm.arena.radiusY * 0.78) - u.y;
            const DESIRED_LENGTH = Math.hypot(desiredX, desiredY) || 1;
            desiredX /= DESIRED_LENGTH;
            desiredY /= DESIRED_LENGTH;
            const TOWARD_FOOD = desiredX * AWAY_X + desiredY * AWAY_Y;
            if (TOWARD_FOOD < 0) {
                desiredX -= TOWARD_FOOD * AWAY_X;
                desiredY -= TOWARD_FOOD * AWAY_Y;
            }
            let moveX = desiredX + AWAY_X * (0.5 + 1.5 * strongest);
            let moveY = desiredY + AWAY_Y * (0.5 + 1.5 * strongest);
            let moveLength = Math.hypot(moveX, moveY);
            if (moveLength < 1e-4) {
                moveX = AWAY_X;
                moveY = AWAY_Y;
                moveLength = 1;
            }
            this.steer(u, u.x + moveX / moveLength, u.y + moveY / moveLength, dt, scaleMoveSpeed(2, u));
            return true;
        }
        findNearestGroundFood(x, y) {
            if (!this._spatialStepActive) {
                this._rebuildFoodSpatialIndex();
            }
            if (!this._groundedFoodCount) {
                return null;
            }
            const GRID = this.foodSpatial,
                CX = GRID.cellX(x),
                CY = GRID.cellY(y);
            if (CX < 0 || CY < 0 || CX >= GRID.cellCount || CY >= GRID.cellCount) {
                return null;
            }
            let nearest = null;
            let nearestDistance = Infinity;
            let nearestOrder = Infinity;
            const MAX_RING = Math.max(CX, CY, GRID.cellCount - 1 - CX, GRID.cellCount - 1 - CY);
            for (let ring = 0; ring <= MAX_RING; ring++) {
                GRID.queryCellRing(CX, CY, ring, this._foodCandidates);
                for (const FOOD of this._foodCandidates) {
                    if (!this._isCurrentGroundedFood(FOOD)) {
                        continue;
                    }
                    const DISTANCE = Math.hypot(FOOD.x - x, FOOD.y - y),
                        ORDER = this._foodOrder.get(FOOD) ?? Infinity;
                    if (DISTANCE < nearestDistance || (DISTANCE === nearestDistance && ORDER < nearestOrder)) {
                        nearest = FOOD;
                        nearestDistance = DISTANCE;
                        nearestOrder = ORDER;
                    }
                }
                if (nearest && nearestDistance < GRID.distanceToOutsideRing(x, y, CX, CY, ring)) {
                    break;
                }
                if ((2 * ring + 1) * (2 * ring + 1) > this._groundedFoodCount) {
                    nearest = null;
                    nearestDistance = Infinity;
                    nearestOrder = Infinity;
                    for (const FOOD of this._groundedFoods) {
                        if (!this._isCurrentGroundedFood(FOOD)) {
                            continue;
                        }
                        const DISTANCE = Math.hypot(FOOD.x - x, FOOD.y - y),
                            ORDER = this._foodOrder.get(FOOD) ?? Infinity;
                        if (DISTANCE < nearestDistance || (DISTANCE === nearestDistance && ORDER < nearestOrder)) {
                            nearest = FOOD;
                            nearestDistance = DISTANCE;
                            nearestOrder = ORDER;
                        }
                    }
                    break;
                }
            }
            return nearest;
        }
        _isCurrentGroundedFood(food) {
            return !!food && food.phase === 'grounded' && this.foodSpatial.itemCells.has(food);
        }
        _startFoodTargetSearch(unit) {
            const GRID = this.foodSpatial,
                CX = GRID.cellX(unit.x),
                CY = GRID.cellY(unit.y);
            if (CX < 0 || CY < 0 || CX >= GRID.cellCount || CY >= GRID.cellCount) {
                return null;
            }
            const STATE = {
                key: `food-target:${unit.id}:${++this._foodSearchJobSequence}`,
                unit,
                snapshot: this._foodSearchSnapshot,
                revision: this._foodSearchSnapshot.revision,
                claimRevision: this._foodReservations.revision,
                availabilityRevision: this._foodReservations.availabilityRevision,
                maxDistance: this._foodReservations.maxDistance(unit),
                x: unit.x,
                y: unit.y,
                centerX: CX,
                centerY: CY,
                maxRing: Math.max(CX, CY, GRID.cellCount - 1 - CX, GRID.cellCount - 1 - CY),
                ring: 0,
                ringCellIndex: 0,
                bucket: EMPTY_FOOD_SEARCH_BUCKET,
                bucketIndex: 0,
                phase: 'rings',
                fallbackIndex: 0,
                nearest: null,
                nearestDistance: Infinity,
                nearestOrder: Infinity,
                status: 'searching',
                target: null,
            };
            this._foodSearchStates.set(unit, STATE);
            this._foodReservations.enqueue(STATE);
            return null;
        }
        _finishFoodTargetSearch(state, result) {
            const UNIT = state.unit;
            if (this._foodSearchStates.get(UNIT) !== state || !this._foodReservations.eligible(UNIT)) {
                this.clearFoodTargetSearch(UNIT);
                return;
            }
            if (result && this._foodReservations.claim(UNIT, result)) {
                state.target = result;
                state.status = 'ready';
                return;
            }
            if (
                this._foodReservations.availableCount &&
                (result ||
                    state.revision !== this._groundedFoodRevision ||
                    state.availabilityRevision !== this._foodReservations.availabilityRevision)
            ) {
                this._foodSearchStates.delete(UNIT);
                this._startFoodTargetSearch(UNIT);
                return;
            }
            state.status = 'empty';
        }
        _stepFoodTargetSearch(state, maxUnits) {
            const GRID = this.foodSpatial,
                SNAPSHOT = state.snapshot;
            let unitsUsed = 0;
            while (true) {
                if (state.phase === 'fallback' && state.fallbackIndex >= SNAPSHOT.foods.length) {
                    return { done: true, unitsUsed, result: state.nearest };
                }
                if (state.phase === 'rings') {
                    const RING_CELLS = state.ring === 0 ? 1 : 8 * state.ring,
                        RING_COMPLETE = state.ringCellIndex >= RING_CELLS && state.bucketIndex >= state.bucket.length;
                    if (RING_COMPLETE) {
                        if (
                            state.nearest &&
                            state.nearestDistance <
                                GRID.distanceToOutsideRing(state.x, state.y, state.centerX, state.centerY, state.ring)
                        ) {
                            return { done: true, unitsUsed, result: state.nearest };
                        }
                        if ((2 * state.ring + 1) ** 2 > this._groundedFoodCount) {
                            state.phase = 'fallback';
                            state.fallbackIndex = 0;
                            state.nearest = null;
                            state.nearestDistance = Infinity;
                            state.nearestOrder = Infinity;
                            continue;
                        }
                        state.ring++;
                        state.ringCellIndex = 0;
                        state.bucket = EMPTY_FOOD_SEARCH_BUCKET;
                        state.bucketIndex = 0;
                    }
                }
                if (unitsUsed >= maxUnits) {
                    return { done: false, unitsUsed };
                }
                if (state.phase === 'fallback') {
                    const FOOD = SNAPSHOT.foods[state.fallbackIndex++];
                    if (this._isCurrentGroundedFood(FOOD)) {
                        this._considerFoodTarget(state, FOOD);
                    }
                    this._foodSearchWork.candidateChecks++;
                    unitsUsed++;
                    continue;
                }
                if (state.bucketIndex < state.bucket.length) {
                    const FOOD = state.bucket[state.bucketIndex++];
                    if (this._isCurrentGroundedFood(FOOD)) {
                        this._considerFoodTarget(state, FOOD);
                    }
                    this._foodSearchWork.candidateChecks++;
                    unitsUsed++;
                    continue;
                }
                const RING = state.ring,
                    INDEX = state.ringCellIndex++,
                    EDGE_COUNT = RING === 0 ? 1 : 2 * (2 * RING + 1);
                let cellX, cellY;
                if (RING === 0) {
                    cellX = state.centerX;
                    cellY = state.centerY;
                } else if (INDEX < EDGE_COUNT) {
                    cellX = state.centerX - RING + Math.floor(INDEX / 2);
                    cellY = INDEX % 2 === 0 ? state.centerY - RING : state.centerY + RING;
                } else {
                    const INNER_INDEX = INDEX - EDGE_COUNT;
                    cellX = INNER_INDEX % 2 === 0 ? state.centerX - RING : state.centerX + RING;
                    cellY = state.centerY - RING + 1 + Math.floor(INNER_INDEX / 2);
                }
                const CELL_KEY =
                    cellX >= 0 && cellY >= 0 && cellX < GRID.cellCount && cellY < GRID.cellCount
                        ? cellY * GRID.cellCount + cellX
                        : -1;
                state.bucket =
                    CELL_KEY < 0 ? EMPTY_FOOD_SEARCH_BUCKET : SNAPSHOT.cells.get(CELL_KEY) || EMPTY_FOOD_SEARCH_BUCKET;
                state.bucketIndex = 0;
                this._foodSearchWork.cellVisits++;
                unitsUsed++;
            }
        }
        _considerFoodTarget(state, food) {
            if (!this._foodReservations.available(food, state.unit)) {
                return;
            }
            const DISTANCE = Math.hypot(food.x - state.x, food.y - state.y),
                ORDER = this._foodOrder.get(food) ?? Infinity;
            if (DISTANCE > state.maxDistance) {
                return;
            }
            if (
                DISTANCE < state.nearestDistance ||
                (DISTANCE === state.nearestDistance && ORDER < state.nearestOrder)
            ) {
                state.nearest = food;
                state.nearestDistance = DISTANCE;
                state.nearestOrder = ORDER;
            }
        }
        requestGroundFoodTarget(unit) {
            if (!this._spatialStepActive) {
                this._rebuildFoodSpatialIndex();
            }
            if (!this._foodReservations.eligible(unit) || !this._groundedFoodCount) {
                this.clearFoodTargetSearch(unit);
                return null;
            }
            const RESERVED = this._foodReservations.target(unit);
            if (RESERVED && this._foodReservations.available(RESERVED, unit)) {
                return RESERVED;
            }
            const STATE = this._foodSearchStates.get(unit);
            if (!this._foodReservations.availableCount) {
                return null;
            }
            if (STATE?.status === 'searching') {
                return null;
            }
            if (
                STATE?.status === 'empty' &&
                STATE.revision === this._foodSearchSnapshot.revision &&
                STATE.availabilityRevision === this._foodReservations.availabilityRevision &&
                Math.hypot(unit.x - STATE.x, unit.y - STATE.y) < FOOD_RESERVATION.retryDistance
            ) {
                return null;
            }
            if (STATE) {
                this._cancelFoodTargetSearch(unit);
            }
            return this._startFoodTargetSearch(unit);
        }
    };
