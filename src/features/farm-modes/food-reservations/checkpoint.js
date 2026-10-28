import { FixedSpatialGrid } from '../../../core/spatial-grid.js';

const STATE_FIELDS =
    'key revision claimRevision availabilityRevision x y centerX centerY maxRing ring ringCellIndex bucketIndex phase fallbackIndex nearestDistance nearestOrder status maxDistance'.split(
        ' ',
    );

// Checkpoints preserve consumed slots as null tombstones in immutable search snapshots.
// This keeps bucket/fallback cursors exact without adding permanent food IDs or changing disk saves.
export function captureFoodRuntime(owner) {
    const W = owner.world,
        FOOD_INDEX = new Map(W.food.map((food, index) => [food, index])),
        SNAPSHOTS = [],
        SNAPSHOT_INDEX = new Map();
    function snapshotIndex(snapshot) {
        if (SNAPSHOT_INDEX.has(snapshot)) {
            return SNAPSHOT_INDEX.get(snapshot);
        }
        const INDEX = SNAPSHOTS.length,
            POSITIONS = new Map(snapshot.foods.map((food, index) => [food, index]));
        SNAPSHOT_INDEX.set(snapshot, INDEX);
        SNAPSHOTS.push({
            revision: snapshot.revision,
            foods: snapshot.foods.map((food) => FOOD_INDEX.get(food) ?? null),
            cells: [...snapshot.cells].map(([key, foods]) => [key, foods.map((food) => POSITIONS.get(food))]),
        });
        return INDEX;
    }
    const CURRENT = snapshotIndex(W._foodSearchSnapshot),
        STATES = [...W._foodSearchStates.values()],
        STATE_INDEX = new Map(STATES.map((state, index) => [state, index]));
    return {
        revision: owner.revision,
        availabilityRevision: owner.availabilityRevision,
        groundedRevision: W._groundedFoodRevision,
        grounded: W._groundedFoods.map((food) => FOOD_INDEX.get(food) ?? null),
        groundedCount: W._groundedFoodCount,
        sequence: W._foodSearchJobSequence,
        current: CURRENT,
        snapshots: SNAPSHOTS,
        states: STATES.map((state) => ({
            unitId: state.unit.id,
            generation: state.unit.generation,
            snapshot: snapshotIndex(state.snapshot),
            values: Object.fromEntries(
                STATE_FIELDS.filter((key) => state[key] !== undefined).map((key) => [
                    key,
                    typeof state[key] === 'number' && !Number.isFinite(state[key]) ? null : state[key],
                ]),
            ),
            bucket: state.bucket.map((food) => state.snapshot.foods.indexOf(food)),
            nearest: state.nearest ? state.snapshot.foods.indexOf(state.nearest) : -1,
            target: state.target ? state.snapshot.foods.indexOf(state.target) : -1,
        })),
        queues: owner.queues.map((queue) => queue.map((state) => STATE_INDEX.get(state))),
        claims: [...owner.byUnit.values()].map((claim) => ({
            unitId: claim.unit.id,
            generation: claim.unit.generation,
            food: FOOD_INDEX.get(claim.food),
            since: claim.since,
            progressAt: claim.progressAt,
            distance: claim.distance,
        })),
    };
}

export function restoreFoodRuntime(owner, data) {
    const W = owner.world;
    owner.reset();
    W._foodSearchStates = new Map();
    if (!data) {
        return;
    }
    const UNITS = new Map(W.unitCollection.items.map((unit) => [unit.id, unit]));
    W.foodSpatial.clear();
    W._foodOrder.clear();
    W._groundedFoods = [];
    W._groundedFoodsScratch = [];
    W.food.forEach((food, index) => {
        W._foodOrder.set(food, index);
        if (food.phase === 'grounded') {
            W.foodSpatial.insert(food);
            W._groundedFoods.push(food);
        }
    });
    W._groundedFoods = data.grounded.map((index) => (index === null ? { phase: 'removed' } : W.food[index]));
    W._groundedFoodCount = data.groundedCount;
    W._groundedFoodRevision = data.groundedRevision;
    W._foodSearchJobSequence = data.sequence;
    const SNAPSHOTS = data.snapshots.map((snapshot) => {
        const FOODS = snapshot.foods.map((index) => (index === null ? { phase: 'removed' } : W.food[index]));
        return {
            revision: snapshot.revision,
            foods: FOODS,
            cells: new Map(snapshot.cells.map(([key, indices]) => [key, indices.map((index) => FOODS[index])])),
        };
    });
    W._foodSearchSnapshot = SNAPSHOTS[data.current];
    const STATES = data.states.map((record) => {
        const SNAPSHOT = SNAPSHOTS[record.snapshot],
            STATE = {
                ...record.values,
                unit: UNITS.get(record.unitId),
                snapshot: SNAPSHOT,
                bucket: record.bucket.map((index) => SNAPSHOT.foods[index]),
                nearest: record.nearest < 0 ? null : SNAPSHOT.foods[record.nearest],
                target: record.target < 0 ? null : SNAPSHOT.foods[record.target],
            };
        STATE.nearestDistance ??= Infinity;
        STATE.nearestOrder ??= Infinity;
        W._foodSearchStates.set(STATE.unit, STATE);
        return STATE;
    });
    owner.queues = data.queues.map((indices) => indices.map((index) => STATES[index]));
    owner.revision = data.revision;
    owner.availabilityRevision = data.availabilityRevision;
    for (const RECORD of data.claims) {
        const CLAIM = {
            unit: UNITS.get(RECORD.unitId),
            food: W.food[RECORD.food],
            since: RECORD.since,
            progressAt: RECORD.progressAt,
            distance: RECORD.distance,
        };
        owner.byUnit.set(CLAIM.unit, CLAIM);
        owner.byFood.set(CLAIM.food, CLAIM);
    }
    owner.ensureBroker();
}

export function validateFoodRuntime(data, raw, assert) {
    if (data === null) {
        return;
    }
    const INT = (value) => Number.isSafeInteger(value) && value >= 0,
        INDEX = (value, length) => INT(value) && value < length,
        UNITS = new Map(raw.units.map((unit) => [unit.id, unit])),
        CELL_COUNT = new FixedSpatialGrid().cellCount,
        UNIQUE_LIVE = (indices) =>
            new Set(indices.filter((index) => index !== null)).size ===
            indices.filter((index) => index !== null).length;
    assert(
        data &&
            INT(data.revision) &&
            INT(data.availabilityRevision) &&
            INT(data.groundedRevision) &&
            INT(data.sequence) &&
            Array.isArray(data.snapshots) &&
            Array.isArray(data.states) &&
            Array.isArray(data.claims) &&
            Array.isArray(data.queues) &&
            data.queues.length === 2,
    );
    assert(
        Array.isArray(data.grounded) &&
            data.grounded.length <= 140 &&
            UNIQUE_LIVE(data.grounded) &&
            data.grounded.every((index) => index === null || INDEX(index, raw.food.length)) &&
            INT(data.groundedCount) &&
            data.groundedCount <= 140,
    );
    assert(
        data.states.length <= raw.units.length &&
            data.snapshots.length <= data.states.length + 1 &&
            INDEX(data.current, data.snapshots.length) &&
            data.claims.length <= raw.food.length,
    );
    for (const SNAPSHOT of data.snapshots) {
        assert(
            INT(SNAPSHOT.revision) &&
                Array.isArray(SNAPSHOT.foods) &&
                SNAPSHOT.foods.length <= 140 &&
                UNIQUE_LIVE(SNAPSHOT.foods) &&
                SNAPSHOT.foods.every((index) => index === null || INDEX(index, raw.food.length)) &&
                Array.isArray(SNAPSHOT.cells) &&
                SNAPSHOT.cells.length <= SNAPSHOT.foods.length,
        );
        const CELL_KEYS = new Set(),
            CELL_FOODS = new Set();
        for (const [KEY, INDICES] of SNAPSHOT.cells) {
            assert(
                INDEX(KEY, CELL_COUNT ** 2) &&
                    !CELL_KEYS.has(KEY) &&
                    Array.isArray(INDICES) &&
                    INDICES.length <= SNAPSHOT.foods.length,
            );
            CELL_KEYS.add(KEY);
            for (const ITEM of INDICES) {
                assert(INDEX(ITEM, SNAPSHOT.foods.length) && !CELL_FOODS.has(ITEM));
                CELL_FOODS.add(ITEM);
            }
        }
    }
    const OWNERS = new Set(),
        KEYS = new Set();
    for (const STATE of data.states) {
        const UNIT = UNITS.get(STATE.unitId);
        assert(
            UNIT &&
                UNIT.generation === STATE.generation &&
                !OWNERS.has(STATE.unitId) &&
                INDEX(STATE.snapshot, data.snapshots.length) &&
                STATE.values &&
                STATE_FIELDS.every((key) => Object.hasOwn(STATE.values, key)),
        );
        OWNERS.add(STATE.unitId);
        const V = STATE.values,
            LENGTH = data.snapshots[STATE.snapshot].foods.length;
        assert(
            typeof V.key === 'string' &&
                !KEYS.has(V.key) &&
                ['searching', 'ready', 'empty'].includes(V.status) &&
                ['rings', 'fallback'].includes(V.phase) &&
                INT(V.revision) &&
                INT(V.claimRevision) &&
                INT(V.availabilityRevision),
        );
        KEYS.add(V.key);
        assert(
            Array.isArray(STATE.bucket) &&
                new Set(STATE.bucket).size === STATE.bucket.length &&
                STATE.bucket.every((index) => INDEX(index, LENGTH)) &&
                INT(V.bucketIndex) &&
                V.bucketIndex <= STATE.bucket.length &&
                INT(V.fallbackIndex) &&
                V.fallbackIndex <= LENGTH &&
                INT(V.ring) &&
                V.ring <= V.maxRing + 1 &&
                INT(V.ringCellIndex) &&
                V.ringCellIndex <= (V.ring === 0 ? 1 : 8 * V.ring) &&
                INDEX(V.centerX, CELL_COUNT) &&
                INDEX(V.centerY, CELL_COUNT) &&
                V.maxRing === Math.max(V.centerX, V.centerY, CELL_COUNT - 1 - V.centerX, CELL_COUNT - 1 - V.centerY) &&
                Number.isFinite(V.x) &&
                Number.isFinite(V.y) &&
                (V.nearestDistance === null || (Number.isFinite(V.nearestDistance) && V.nearestDistance >= 0)) &&
                (V.nearestOrder === null || INT(V.nearestOrder)),
        );
        assert(
            (STATE.nearest === -1 || INDEX(STATE.nearest, LENGTH)) &&
                (STATE.target === -1 || INDEX(STATE.target, LENGTH)) &&
                Number.isFinite(V.maxDistance) &&
                V.maxDistance > 0,
        );
    }
    const QUEUED = data.queues.flat();
    assert(
        new Set(QUEUED).size === QUEUED.length &&
            QUEUED.every(
                (index) => INDEX(index, data.states.length) && data.states[index].values.status === 'searching',
            ),
    );
    assert(data.states.every((state, index) => state.values.status !== 'searching' || QUEUED.includes(index)));
    const CLAIMED_UNITS = new Set(),
        CLAIMED_FOOD = new Set();
    for (const CLAIM of data.claims) {
        const UNIT = UNITS.get(CLAIM.unitId);
        assert(
            UNIT &&
                UNIT.generation === CLAIM.generation &&
                UNIT.hp > 0 &&
                INDEX(CLAIM.food, raw.food.length) &&
                raw.food[CLAIM.food].phase === 'grounded' &&
                !CLAIMED_UNITS.has(CLAIM.unitId) &&
                !CLAIMED_FOOD.has(CLAIM.food) &&
                CLAIM.since >= 0 &&
                CLAIM.since <= CLAIM.progressAt &&
                CLAIM.progressAt <= raw.time &&
                CLAIM.distance >= 0,
        );
        CLAIMED_UNITS.add(CLAIM.unitId);
        CLAIMED_FOOD.add(CLAIM.food);
    }
}
