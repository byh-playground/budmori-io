import { Signal } from '../core/signal.js';

// The sole owner of roster membership and permanent removal. Callers may read
// items, but additions, removals and hydration must use this transaction boundary.
export class UnitCollection {
    constructor(world, unitType, notifications) {
        this.world = world;
        this.unitType = unitType;
        this.items = [];
        this.byId = new Map();
        this.residentCountsBySpecies = new Map();
        this.residentIdsBySpecies = new Map();
        this.residentCount = 0;
        this.revision = 0;
        this.subscriptions = new Map();
        this.reservations = new Map();
        this.retiredDuringStep = [];
        this.onAdded = new Signal(notifications);
        this.onRemoved = new Signal(notifications);
        this.onReplaced = new Signal(notifications);
        this.onReset = new Signal(notifications);
        this.onHealthChanged = new Signal(notifications, true);
    }
    has(unit) {
        return this.items.includes(unit);
    }
    unitById(id) {
        return this.byId.get(id) || null;
    }
    _rebuildIndexes() {
        this.revision++;
        this.byId.clear();
        this.residentCountsBySpecies.clear();
        this.residentIdsBySpecies.clear();
        this.residentCount = 0;
        for (const UNIT of this.items) {
            this._indexUnit(UNIT);
        }
        this.world._syncOwnedSpeciesCounts?.();
    }
    refreshIndexes() {
        this._rebuildIndexes();
    }
    _indexUnit(unit) {
        this.revision++;
        this.byId.set(unit.id, unit);
        if (this.isResident(unit)) {
            this.residentCount++;
            this.residentCountsBySpecies.set(unit.species, (this.residentCountsBySpecies.get(unit.species) || 0) + 1);
            let ids = this.residentIdsBySpecies.get(unit.species);
            if (!ids) {
                ids = new Set();
                this.residentIdsBySpecies.set(unit.species, ids);
            }
            ids.add(unit.id);
        }
    }
    _unindexUnit(unit) {
        this.revision++;
        this.byId.delete(unit.id);
        if (this.isResident(unit)) {
            this.residentCount = Math.max(0, this.residentCount - 1);
            const COUNT = (this.residentCountsBySpecies.get(unit.species) || 0) - 1;
            if (COUNT > 0) {
                this.residentCountsBySpecies.set(unit.species, COUNT);
            } else {
                this.residentCountsBySpecies.delete(unit.species);
            }
            const IDS = this.residentIdsBySpecies.get(unit.species);
            IDS?.delete(unit.id);
            if (IDS?.size === 0) {
                this.residentIdsBySpecies.delete(unit.species);
            }
        }
        this.world._syncOwnedSpeciesCounts?.();
    }
    // Puts the farm's residents in the given order; everything else keeps its place.
    reorder(orderedIds) {
        const RESIDENTS = this.items.filter((unit) => this.isResident(unit));
        if (
            !Array.isArray(orderedIds) ||
            orderedIds.length !== RESIDENTS.length ||
            new Set(orderedIds).size !== orderedIds.length ||
            orderedIds.some((id) => !this.isResident(this.byId.get(id)))
        ) {
            return false;
        }
        const ORDERED = orderedIds.map((id) => this.byId.get(id));
        let index = 0;
        this.items = this.items.map((unit) => (this.isResident(unit) ? ORDERED[index++] : unit));
        this._rebuildIndexes();
        this.world._unitSpatialDirty = true;
        return true;
    }
    isResident(unit) {
        return !!(
            unit &&
            unit.faction === 'player' &&
            unit.isBattleOnlySummon !== true &&
            unit.isFormationClone !== true &&
            unit.countsTowardPermanentRoster !== false
        );
    }
    reservationOwner(unitOrId) {
        return this.reservations.get(typeof unitOrId === 'object' ? unitOrId?.id : unitOrId) || null;
    }
    reserve(owner, units, { replaceOwners = [] } = {}) {
        if (
            typeof owner !== 'string' ||
            !owner ||
            !Array.isArray(units) ||
            units.length < 2 ||
            !Array.isArray(replaceOwners)
        ) {
            return false;
        }
        const IDS = new Set(),
            ALLOWED_OWNERS = new Set(replaceOwners),
            REPLACED_OWNERS = new Set();
        if (
            units.some((unit) => {
                if (!this.has(unit) || IDS.has(unit.id)) {
                    return true;
                }
                const CURRENT_OWNER = this.reservationOwner(unit.id);
                if (CURRENT_OWNER && CURRENT_OWNER !== owner) {
                    if (!ALLOWED_OWNERS.has(CURRENT_OWNER)) {
                        return true;
                    }
                    REPLACED_OWNERS.add(CURRENT_OWNER);
                }
                IDS.add(unit.id);
                return false;
            })
        ) {
            return false;
        }
        for (const REPLACED_OWNER of REPLACED_OWNERS) {
            this.releaseReservations(REPLACED_OWNER);
        }
        for (const ID of IDS) {
            this.reservations.set(ID, owner);
        }
        return true;
    }
    releaseReservations(owner) {
        let released = 0;
        for (const [ID, CURRENT_OWNER] of this.reservations) {
            if (CURRENT_OWNER === owner) {
                this.reservations.delete(ID);
                released++;
            }
        }
        return released;
    }
    releaseUnitReservation(unitOrId) {
        return this.reservations.delete(typeof unitOrId === 'object' ? unitOrId?.id : unitOrId);
    }
    attach(unit) {
        unit.attachWorld(this.world);
        const OFF_DIED = unit.onDied.on(() => {
                if (this.has(unit)) {
                    this.world.processUnitDeath(unit);
                }
            }),
            OFF_REVIVED = unit.onRevived.on(() => {
                if (this.has(unit)) {
                    this.world.processUnitRevival(unit);
                }
            });
        const OFF_HEALTH = unit.onHealthChanged.on((event) => {
            if (this.has(unit)) {
                this.world._syncUnitAliveCount(unit);
                this.onHealthChanged.emit(event);
            }
        });
        this.subscriptions.set(unit, [OFF_DIED, OFF_REVIVED, OFF_HEALTH]);
    }
    retire(unit, options, preserveMergeTask = null) {
        this.world.releaseMate(unit);
        for (const TASK of [...this.world.mergeTasks]) {
            if (TASK !== preserveMergeTask && (TASK.materialIds?.includes(unit.id) || TASK.resultId === unit.id)) {
                this.world.cancelMergeTask(TASK);
            }
        }
        this.releaseUnitReservation(unit.id);
        for (const OFF of this.subscriptions.get(unit) || []) {
            OFF();
        }
        this.subscriptions.delete(unit);
        this.world._trackUnitRemoved(unit, options);
        unit.dispose();
        if (this.world._spatialStepActive) {
            this.retiredDuringStep.push(unit);
        } else {
            this.releaseReferences(unit);
            this.clearBorrowedReferences();
        }
    }
    releaseReferences(unit) {
        this.world.unitSpatial.remove(unit);
        this.world._unitStepOrder.delete(unit);
        this.world._unitAliveState.delete(unit);
    }
    clearBorrowedReferences() {
        for (const GROUP of this.world._mergeEligibleGroups) {
            GROUP.length = 0;
        }
        for (const KEY of [
            '_stepUnits',
            '_unitCandidates',
            '_contactQuery',
            '_bossGridUnits',
            '_bossGroundUnits',
            '_bossQueryCandidates',
            '_bossHitCandidates',
            '_mergeNearestScratch',
            '_mergeMaterialsScratch',
        ]) {
            if (this.world._spatialStepActive) {
                this.world[KEY].length = 0;
            } else {
                // An out-of-step caller may still be iterating its borrowed
                // snapshot. Drop the owner's reference without truncating it.
                this.world[KEY] = [];
            }
        }
    }
    releaseStepReferences() {
        if (!this.retiredDuringStep.length) {
            return;
        }
        for (const UNIT of this.retiredDuringStep) {
            this.releaseReferences(UNIT);
        }
        this.retiredDuringStep.length = 0;
        this.clearBorrowedReferences();
    }
    add(unit, { markProgress = true } = {}) {
        if (!(unit instanceof this.unitType) || this.items.some((owned) => owned === unit || owned.id === unit.id)) {
            return false;
        }
        this.world._beginSpatialQueryBatch();
        try {
            unit.spawnedAtSimulationTick = this.world.simulationTick;
            this.items.push(unit);
            this._indexUnit(unit);
            this.attach(unit);
            this.world._trackUnitAdded(unit);
        } finally {
            this.world._endSpatialQueryBatch();
        }
        this.world._markMergeAvailabilityChanged();
        this.publishChange(this.onAdded, { unitId: unit.id }, markProgress && !unit.isBattleOnlySummon);
        return true;
    }
    remove(unit, { markProgress = true, ...options } = {}) {
        if (!this.has(unit)) {
            return false;
        }
        const REMAINING = this.items.filter((owned) => owned !== unit);
        this.world._beginSpatialQueryBatch();
        try {
            this.retire(unit, options);
            this._unindexUnit(unit);
            this.items = REMAINING;
        } finally {
            this.world._endSpatialQueryBatch();
        }
        this.world._markMergeAvailabilityChanged();
        this.publishChange(this.onRemoved, { unitId: unit.id }, markProgress && !unit.isBattleOnlySummon);
        return true;
    }
    replace(materials, result, complete, preserveMergeTask = null) {
        const CONSUMED = new Set(materials);
        if (
            CONSUMED.size < 2 ||
            CONSUMED.size !== materials.length ||
            !materials.every((unit) => this.has(unit)) ||
            !(result instanceof this.unitType) ||
            this.items.some((unit) => unit === result || unit.id === result.id)
        ) {
            return false;
        }
        // Replacement decreases existing ownership, so a migrated roster above
        // today's spawn cap is valid. Prepare everything before consuming it.
        const REMAINING = this.items.filter((unit) => !CONSUMED.has(unit));
        REMAINING.push(result);
        this.world._beginSpatialQueryBatch();
        try {
            for (const UNIT of CONSUMED) {
                this.retire(UNIT, undefined, preserveMergeTask);
            }
            this.items = REMAINING;
            this._rebuildIndexes();
            this.attach(result);
            this.world._trackUnitAdded(result);
            // The feature completes IDs/task/effect state before any observer
            // can see the committed replacement or request a save checkpoint.
            complete?.();
        } finally {
            this.world._endSpatialQueryBatch();
        }
        this.world._markMergeAvailabilityChanged();
        this.publishChange(
            this.onReplaced,
            { materialIds: materials.map((unit) => unit.id), resultId: result.id },
            true,
        );
        return true;
    }
    publishChange(signal, event, markProgress) {
        return this.world.mutationNotifications.run(this._publishChange, this, signal, event, markProgress);
    }
    _publishChange(signal, event, markProgress) {
        const ERRORS = [];
        if (markProgress) {
            try {
                this.world.markProgressChanged();
            } catch (error) {
                ERRORS.push(error);
            }
        }
        try {
            signal.emit(event);
        } catch (error) {
            ERRORS.push(error);
        }
        if (ERRORS.length) {
            throw ERRORS.length === 1 ? ERRORS[0] : new AggregateError(ERRORS, 'Unit collection observers failed.');
        }
    }
    reset(units = []) {
        const NEXT = [...units],
            IDS = new Set();
        for (const UNIT of NEXT) {
            if (!(UNIT instanceof this.unitType) || IDS.has(UNIT.id)) {
                throw new TypeError('A roster requires distinct owned Unit instances.');
            }
            IDS.add(UNIT.id);
        }
        const RETAINED = new Set(NEXT);
        this.world._beginSpatialQueryBatch();
        try {
            for (const UNIT of this.items) {
                if (!RETAINED.has(UNIT)) {
                    this.retire(UNIT);
                }
            }
            this.items = NEXT;
            this._rebuildIndexes();
            this.reservations.clear();
            for (const UNIT of NEXT) {
                if (!this.subscriptions.has(UNIT)) {
                    this.attach(UNIT);
                }
            }
            this.world._rebuildUnitSpatialIndex();
        } finally {
            this.world._endSpatialQueryBatch();
        }
        this.world._markMergeAvailabilityChanged();
        this.onReset.emit({ unitIds: NEXT.map((unit) => unit.id) });
    }
    removeWhere(predicate, options) {
        let index = 0;
        while (index < this.items.length) {
            const UNIT = this.items[index];
            if (predicate(UNIT)) {
                this.remove(UNIT, options);
            } else {
                index++;
            }
        }
    }
    dispose() {
        try {
            this.reset();
        } finally {
            this.onAdded.clear();
            this.onRemoved.clear();
            this.onReplaced.clear();
            this.onPlacementChanged.clear();
            this.onReset.clear();
            this.onHealthChanged.clear();
        }
    }
}
