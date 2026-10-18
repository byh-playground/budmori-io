import { RESERVE_PLOT_ID } from './farm-plot.js';

const BASIS_POINT_TOTAL = 10000;

function isResident(unit) {
    return (
        !!unit &&
        unit.faction === 'player' &&
        unit.isBattleOnlySummon !== true &&
        unit.isFormationClone !== true &&
        unit.countsTowardPermanentRoster !== false
    );
}

function compareSpeciesId(a, b) {
    return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
}

function largestRemainder(weights, total) {
    const ENTRIES = [...weights].map(([speciesId, weight]) => ({ speciesId, weight: BigInt(weight) }));
    if (!ENTRIES.length || !Number.isSafeInteger(total) || total < 0) {
        return new Map();
    }
    const DENOMINATOR = ENTRIES.reduce((sum, entry) => sum + entry.weight, 0n);
    if (DENOMINATOR <= 0n) {
        return new Map();
    }
    let assigned = 0;
    for (const ENTRY of ENTRIES) {
        const NUMERATOR = BigInt(total) * ENTRY.weight;
        ENTRY.value = Number(NUMERATOR / DENOMINATOR);
        ENTRY.remainder = NUMERATOR % DENOMINATOR;
        assigned += ENTRY.value;
    }
    ENTRIES.sort((a, b) =>
        a.remainder === b.remainder ? compareSpeciesId(a.speciesId, b.speciesId) : a.remainder > b.remainder ? -1 : 1,
    );
    for (let i = 0; i < total - assigned; i++) {
        ENTRIES[i % ENTRIES.length].value++;
    }
    return new Map(ENTRIES.map((entry) => [entry.speciesId, entry.value]));
}

/**
 * The collection remains the sole owner of Unit instances. FarmingRoster is a
 * command/query boundary over that collection; it stores no duplicate roster.
 */
export class FarmingRoster {
    constructor(unitCollection) {
        if (!unitCollection || !Array.isArray(unitCollection.items)) {
            throw new TypeError('FarmingRoster requires a UnitCollection.');
        }
        this.collection = unitCollection;
    }

    residents() {
        return this.collection.items.filter(isResident);
    }

    residentsOfSpecies(speciesId) {
        return [...(this.collection.residentIdsBySpecies.get(speciesId) || [])]
            .map((id) => this.collection.unitById(id))
            .filter(isResident);
    }

    residentById(id) {
        return this.collection.items.find((unit) => isResident(unit) && unit.id === id) || null;
    }

    ownedPopulation() {
        return this.collection.residentCount;
    }

    placedPopulation(plotId) {
        return this.collection.residentCountsByPlot.get(plotId) || 0;
    }

    residentIds(plotId = undefined) {
        const UNITS = plotId === undefined ? this.collection.items : this.collection.unitsInPlot(plotId);
        return UNITS.filter(isResident).map((unit) => unit.id);
    }

    countsBySpecies({ includeReservations = [] } = {}) {
        const COUNTS = new Map(this.collection.residentCountsBySpecies);
        for (const RESERVATION of includeReservations) {
            if (Number.isSafeInteger(RESERVATION?.species)) {
                COUNTS.set(RESERVATION.species, (COUNTS.get(RESERVATION.species) || 0) + 1);
            }
        }
        return COUNTS;
    }

    canSpeciesAdvance(speciesId, targetBasisPoints, { includeReservations = [], excludeReservation = null } = {}) {
        if (
            !Number.isSafeInteger(targetBasisPoints) ||
            targetBasisPoints <= 0 ||
            targetBasisPoints > BASIS_POINT_TOTAL
        ) {
            return false;
        }
        const RESERVATIONS =
            excludeReservation === null
                ? includeReservations
                : includeReservations.filter((reservation) => reservation !== excludeReservation);
        const COUNTS = this.countsBySpecies({ includeReservations: RESERVATIONS });
        let total = 0;
        for (const COUNT of COUNTS.values()) {
            total += COUNT;
        }
        const OWN = COUNTS.get(speciesId) || 0;
        return BigInt(targetBasisPoints) * BigInt(total) >= BigInt(OWN) * BigInt(BASIS_POINT_TOTAL);
    }

    static normalizeTargetBasisPoints(current, speciesIds, selectedSpeciesId, selectedValue) {
        const ORDERED = [...new Set(speciesIds)].sort(compareSpeciesId);
        if (!ORDERED.length || !ORDERED.includes(selectedSpeciesId) || !Number.isSafeInteger(selectedValue)) {
            return null;
        }
        if (ORDERED.length === 1) {
            return new Map([[ORDERED[0], BASIS_POINT_TOTAL]]);
        }
        const FIXED = Math.max(0, Math.min(BASIS_POINT_TOTAL, selectedValue));
        const OTHER_IDS = ORDERED.filter((id) => id !== selectedSpeciesId);
        let weights = new Map(
            OTHER_IDS.map((id) => [id, Math.max(0, Number.isSafeInteger(current?.get?.(id)) ? current.get(id) : 0)]),
        );
        if ([...weights.values()].every((weight) => weight === 0)) {
            weights = new Map(OTHER_IDS.map((id) => [id, 1]));
        }
        const RESULT = largestRemainder(weights, BASIS_POINT_TOTAL - FIXED);
        RESULT.set(selectedSpeciesId, FIXED);
        return new Map(ORDERED.map((id) => [id, RESULT.get(id) || 0]));
    }

    static allocateTargetCounts(targetBasisPoints, slotCount, speciesIds) {
        const IDS = [...new Set(speciesIds)].sort(compareSpeciesId);
        const WEIGHTS = IDS.map((id) => [
            id,
            Math.max(0, Number.isSafeInteger(targetBasisPoints?.get?.(id)) ? targetBasisPoints.get(id) : 0),
        ]);
        return largestRemainder(WEIGHTS, slotCount);
    }
}

export { BASIS_POINT_TOTAL, RESERVE_PLOT_ID, isResident as isPermanentFarmResident };
