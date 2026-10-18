import { SPECIES_CATALOG } from './species-catalog.js';

export const RAID_DEPLOYMENT_CARD_LIMIT = 4;
export const RAID_DEPLOYMENT_CARD_SLOT_COST = 1;
export const RAID_DEPLOYMENT_CARD_SCHEMA_VERSION = 1;

export function createRaidDeploymentCardsState({ firstSpecies = 0 } = {}) {
    if (firstSpecies !== null && !isSpeciesId(firstSpecies)) {
        throw new TypeError('firstSpecies must be an owned catalog species or null');
    }
    return {
        schemaVersion: RAID_DEPLOYMENT_CARD_SCHEMA_VERSION,
        unlockedSlots: 1,
        speciesBySlot: [firstSpecies, null, null, null],
    };
}

export function isValidRaidDeploymentCardsState(state) {
    if (
        !state ||
        typeof state !== 'object' ||
        state.schemaVersion !== RAID_DEPLOYMENT_CARD_SCHEMA_VERSION ||
        !Number.isSafeInteger(state.unlockedSlots) ||
        state.unlockedSlots < 1 ||
        state.unlockedSlots > RAID_DEPLOYMENT_CARD_LIMIT ||
        !Array.isArray(state.speciesBySlot) ||
        state.speciesBySlot.length !== RAID_DEPLOYMENT_CARD_LIMIT ||
        state.speciesBySlot.some((speciesId, index) =>
            index >= state.unlockedSlots ? speciesId !== null : speciesId !== null && !isSpeciesId(speciesId),
        )
    ) {
        return false;
    }
    const SELECTED = state.speciesBySlot.filter((speciesId) => speciesId !== null);
    return new Set(SELECTED).size === SELECTED.length;
}

export function raidDeploymentCardsInvestedPoints(state) {
    return isValidRaidDeploymentCardsState(state) ? state.unlockedSlots - 1 : 0;
}

export function migrateRaidDeploymentCardsState(state, ownedSpecies) {
    if (state !== undefined) {
        return state;
    }
    const OWNED = new Set((Array.isArray(ownedSpecies) ? ownedSpecies : []).filter(isSpeciesId).sort((a, b) => a - b));
    const FIRST = OWNED.has(0) ? 0 : (SPECIES_CATALOG.find(({ id }) => OWNED.has(id))?.id ?? null);
    return createRaidDeploymentCardsState({ firstSpecies: FIRST });
}

export function resetRaidDeploymentCardsState(state) {
    if (!isValidRaidDeploymentCardsState(state)) {
        return null;
    }
    return {
        schemaVersion: RAID_DEPLOYMENT_CARD_SCHEMA_VERSION,
        unlockedSlots: 1,
        speciesBySlot: [state.speciesBySlot[0], null, null, null],
    };
}

export function raidDeploymentCardSpecies(state) {
    return isValidRaidDeploymentCardsState(state)
        ? state.speciesBySlot.slice(0, state.unlockedSlots).filter((speciesId) => speciesId !== null)
        : [];
}

export function isSpeciesId(value) {
    return Number.isSafeInteger(value) && SPECIES_CATALOG.some((species) => species.id === value);
}

export class RaidDeploymentCards {
    constructor(world) {
        this.world = world;
    }
    editable() {
        return this.world.scene === 'farm' && !this.world.running && this.world.farmBossEvent?.phase === 'idle';
    }
    buySlot() {
        return this.world.mutationNotifications.run(() => {
            const PLAYER = this.world.playerProgression,
                STATE = PLAYER.raidDeploymentCards;
            if (
                !this.editable() ||
                !isValidRaidDeploymentCardsState(STATE) ||
                STATE.unlockedSlots >= RAID_DEPLOYMENT_CARD_LIMIT ||
                PLAYER.availablePoints < RAID_DEPLOYMENT_CARD_SLOT_COST
            ) {
                return false;
            }
            STATE.unlockedSlots++;
            PLAYER.availablePoints -= RAID_DEPLOYMENT_CARD_SLOT_COST;
            this.world.markProgressChanged();
            return true;
        });
    }
    select(slot, speciesId) {
        return this.world.mutationNotifications.run(() => {
            const STATE = this.world.playerProgression.raidDeploymentCards,
                OWNED = new Set(
                    this.world.units
                        .filter((unit) => unit.countsTowardPermanentRoster !== false)
                        .map((unit) => unit.species),
                );
            if (
                !this.editable() ||
                !isValidRaidDeploymentCardsState(STATE) ||
                !Number.isSafeInteger(slot) ||
                slot < 0 ||
                slot >= STATE.unlockedSlots ||
                (speciesId !== null &&
                    (!isSpeciesId(speciesId) || !OWNED.has(speciesId) || STATE.speciesBySlot.includes(speciesId)))
            ) {
                return false;
            }
            STATE.speciesBySlot[slot] = speciesId;
            this.world.markProgressChanged();
            return true;
        });
    }
    reset() {
        return this.world.mutationNotifications.run(() => {
            const PLAYER = this.world.playerProgression,
                STATE = PLAYER.raidDeploymentCards,
                REFUNDED = raidDeploymentCardsInvestedPoints(STATE),
                NEXT = resetRaidDeploymentCardsState(STATE);
            if (!this.editable() || !NEXT || REFUNDED === 0) {
                return false;
            }
            PLAYER.availablePoints += REFUNDED;
            PLAYER.raidDeploymentCards = NEXT;
            this.world.markProgressChanged();
            return true;
        });
    }
}
