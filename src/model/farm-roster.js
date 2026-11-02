function isResident(unit) {
    return (
        !!unit &&
        unit.faction === 'player' &&
        unit.isBattleOnlySummon !== true &&
        unit.isFormationClone !== true &&
        unit.countsTowardPermanentRoster !== false
    );
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
        const UNIT = this.collection.unitById(id);
        return isResident(UNIT) ? UNIT : null;
    }

    ownedPopulation() {
        return this.collection.residentCount;
    }
}
