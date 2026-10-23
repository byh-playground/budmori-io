import { SPECIES_CATALOG } from '../../species-catalog.js';

export const SPECIES_MASTERY_CAP = 50;
export const EVOLUTION_UNLOCK_LEVELS = Object.freeze([2, 6, 12, 20, 30]);

// Rollout is explicit: a species is enabled only with its attack, effects, UI and save consumer.
// Stage zero deliberately leaves every species unavailable. These are research slots, not live abilities.
export const SPECIES_GROWTH_DEFINITIONS = Object.freeze(
    SPECIES_CATALOG.map(({ id }) => createSpeciesGrowthDefinition(id)),
);

export function createSpeciesGrowthDefinition(species, { available = false, basic = [], specialty = [] } = {}) {
    const NODES = [
        ...EVOLUTION_UNLOCK_LEVELS.map((level, index) => ({
            id: `evolution-${index + 2}`,
            kind: 'evolution',
            tier: index + 2,
            maxRank: 1,
            pointCost: 2,
            unlockLevels: [level],
            prerequisite: index === 0 ? null : `evolution-${index + 1}`,
            available,
        })),
        ...['basic', 'specialty'].flatMap((kind) =>
            Array.from({ length: 3 }, (_, index) => ({
                id: `${kind}-${index + 1}`,
                kind,
                name: (kind === 'basic' ? basic : specialty)[index] || null,
                maxRank: kind === 'basic' ? 10 : 5,
                pointCost: kind === 'basic' ? 1 : 2,
                unlockLevels:
                    kind === 'basic'
                        ? Array.from({ length: 10 }, (_, rank) => rank * 5 + 1)
                        : Array.from({ length: 5 }, (_, rank) => rank * 8 + 11),
                prerequisite: null,
                available,
            })),
        ),
    ];
    return Object.freeze({
        species,
        available,
        nodes: Object.freeze(
            NODES.map((node) => Object.freeze({ ...node, unlockLevels: Object.freeze(node.unlockLevels) })),
        ),
    });
}

export function speciesGrowthDefinition(species) {
    return SPECIES_GROWTH_DEFINITIONS.find((definition) => definition.species === species) || null;
}

export function growthTreeCapacity(definition) {
    return definition.nodes.reduce((total, node) => total + node.maxRank * node.pointCost, 0);
}
