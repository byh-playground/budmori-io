// Lineage: the temperament and colour genes a unit carries, and the recipe book. Pure data and rules; the world
// supplies the random source so every roll stays on the seeded stream.

export const TEMPERAMENTS = Object.freeze([
    Object.freeze({ id: 0, name: '끈기' }),
    Object.freeze({ id: 1, name: '듬직' }),
    Object.freeze({ id: 2, name: '발끈' }),
    Object.freeze({ id: 3, name: '성급' }),
    Object.freeze({ id: 4, name: '다정' }),
]);
export const TEMPERAMENT_COUNT = TEMPERAMENTS.length;

// Element 0 is "none": the plain colour. Elements 1..5 beat the next one in the cycle and lose to the previous one.
export const ELEMENTS = Object.freeze([
    Object.freeze({ id: 0, name: '무속성', color: '#d8d4bd' }),
    Object.freeze({ id: 1, name: '불', color: '#d98f72' }),
    Object.freeze({ id: 2, name: '얼음', color: '#93c2d8' }),
    Object.freeze({ id: 3, name: '풀', color: '#86b583' }),
    Object.freeze({ id: 4, name: '전기', color: '#d6c36d' }),
    Object.freeze({ id: 5, name: '물', color: '#7b97cf' }),
]);
export const ELEMENT_COUNT = ELEMENTS.length - 1;

// Seeds only drop the first-tier species; the rest are made by recipes.
export const SEED_SPECIES = Object.freeze([0, 6, 7, 2, 8]);

export const SEED_GENE_RATES = Object.freeze({ carrier: 0.15, recessive: 0.02 });
export const SEED_FEEDS = 3;
export const SEED_FEED_COOLDOWN_SECONDS = 5;
export const TEMPERAMENT_MUTATION_RATE = 0.1;

export const RECIPES = Object.freeze([
    Object.freeze({ a: 0, b: 6, result: 1 }),
    Object.freeze({ a: 0, b: 7, result: 3 }),
    Object.freeze({ a: 0, b: 2, result: 4 }),
    Object.freeze({ a: 6, b: 8, result: 5 }),
    Object.freeze({ a: 0, b: 8, result: 7 }),
    Object.freeze({ a: 6, b: 7, result: 2 }),
    Object.freeze({ a: 6, b: 2, result: 8 }),
    Object.freeze({ a: 7, b: 2, result: 6 }),
    Object.freeze({ a: 7, b: 8, result: 6 }),
    Object.freeze({ a: 2, b: 8, result: 0 }),
]);

export function recipeFor(speciesA, speciesB) {
    if (speciesA === speciesB) {
        return null;
    }
    return (
        RECIPES.find(
            (recipe) =>
                (recipe.a === speciesA && recipe.b === speciesB) || (recipe.a === speciesB && recipe.b === speciesA),
        ) || null
    );
}

export function isValidGenes(genes) {
    return (
        Array.isArray(genes) &&
        genes.length === 2 &&
        genes.every((gene) => Number.isInteger(gene) && gene >= 0 && gene <= ELEMENT_COUNT)
    );
}

// Only two matching recessive genes show; a single one is a hidden carrier.
export function elementOf(genes) {
    return genes[0] === genes[1] ? genes[0] : 0;
}

export function carriedElement(genes) {
    return genes[0] !== genes[1] ? Math.max(genes[0], genes[1]) : 0;
}

export function rollSeedGenes(random) {
    const ROLL = random();
    if (ROLL < SEED_GENE_RATES.recessive) {
        const ELEMENT = 1 + Math.floor(random() * ELEMENT_COUNT);
        return [ELEMENT, ELEMENT];
    }
    if (ROLL < SEED_GENE_RATES.recessive + SEED_GENE_RATES.carrier) {
        const ELEMENT = 1 + Math.floor(random() * ELEMENT_COUNT);
        return random() < 0.5 ? [0, ELEMENT] : [ELEMENT, 0];
    }
    return [0, 0];
}

export function rollTemperament(random) {
    return Math.floor(random() * TEMPERAMENT_COUNT);
}

// The result keeps its materials' temperaments 90% of the time, split evenly by material; otherwise it takes one the
// materials do not have.
export function inheritTemperament(materialTemperaments, random) {
    const OWN = new Set(materialTemperaments);
    if (random() < TEMPERAMENT_MUTATION_RATE) {
        const OTHERS = TEMPERAMENTS.map((entry) => entry.id).filter((id) => !OWN.has(id));
        if (OTHERS.length) {
            return OTHERS[Math.floor(random() * OTHERS.length)];
        }
    }
    return materialTemperaments[Math.floor(random() * materialTemperaments.length)];
}

// Two different materials each hand one random gene to the result.
export function inheritGenes(materialGenes, random) {
    const FIRST = Math.floor(random() * materialGenes.length);
    let second = materialGenes.length > 1 ? Math.floor(random() * (materialGenes.length - 1)) : FIRST;
    if (materialGenes.length > 1 && second >= FIRST) {
        second += 1;
    }
    return [materialGenes[FIRST][random() < 0.5 ? 0 : 1], materialGenes[second][random() < 0.5 ? 0 : 1]];
}

// The element a hit of `attacker` deals against `defender`: 2 when it beats, 0.5 when it loses, 1 otherwise.
export function elementMultiplier(attacker, defender) {
    if (attacker === 0 || defender === 0 || attacker === defender) {
        return 1;
    }
    if (defender === (attacker % ELEMENT_COUNT) + 1) {
        return 2;
    }
    if (attacker === (defender % ELEMENT_COUNT) + 1) {
        return 0.5;
    }
    return 1;
}
