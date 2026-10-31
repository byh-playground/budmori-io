// Idle progress: when the player was away, the farm is settled with a formula instead of replaying the simulation.
// Same rules as while playing, at a fraction of the pace: workers make food, each adult pair breeds once per round for
// two food, and only the parents that were adults when you left breed.

export function applyOffline(world, config, rawSeconds) {
    const OFFLINE = config.farm.offline,
        BREEDING = config.farm.breeding;
    if (world.scene !== 'farm' || world.farmBossEvent?.phase !== 'idle') {
        return null;
    }
    const AWAY = Math.min(rawSeconds, OFFLINE.capSeconds);
    if (!(AWAY >= OFFLINE.minSeconds)) {
        return null;
    }
    // Away time is what is shown; production runs for the efficiency share of it.
    const SECONDS = AWAY * OFFLINE.efficiency;
    world.refreshWorkers();
    const SUMMARY = { seconds: AWAY, food: 0, births: 0 };
    let foodRate = 0;
    for (const ID of world._workerIds) {
        foodRate += world._workerRates.get(ID) || 0;
    }
    let pool = Math.floor(foodRate * SECONDS);
    SUMMARY.food = pool;
    // Units that were recovering or resting are ready again.
    const RESIDENTS = world.roster.residents();
    for (const UNIT of RESIDENTS) {
        UNIT.cooldown = 0;
        if (UNIT.down > 0) {
            UNIT.down = Math.min(UNIT.down, 0.05);
        }
        if (!UNIT.seedling && !UNIT.mature) {
            UNIT.growthElapsed = UNIT.growthDuration;
        }
    }
    // Breeding rounds: every pair of resting adults of a species makes a child per round while food and room last.
    const COST = 2,
        ROUND_SECONDS = BREEDING.cooldownSeconds + BREEDING.growthSeconds,
        ROUNDS = Math.floor(SECONDS / ROUND_SECONDS),
        CAPACITY = world.capacity,
        SPECIES_COUNT = config.unit.speciesCount,
        ADULTS = new Array(SPECIES_COUNT).fill(0);
    for (const UNIT of world.roster.residents()) {
        if (UNIT.isBattleOnlySummon || UNIT.seedling) {
            continue;
        }
        if (UNIT.mature && UNIT.hp > 0 && !world._workerIds.has(UNIT.id)) {
            ADULTS[UNIT.species]++;
        }
    }
    for (let round = 0; round < ROUNDS && pool >= COST; round++) {
        // When food or room cannot cover every pair, the births of the round are shared in proportion to each species'
        // pairs (the slider's share), as in play where every pair competes for food alike, never by species id.
        const PAIRS = ADULTS.map((count) => Math.floor(count / 2)),
            TOTAL = PAIRS.reduce((sum, pairs) => sum + pairs, 0),
            ROOM = CAPACITY - world.ownedPopulation - world.birthReservations,
            BIRTHS = Math.min(TOTAL, ROOM, Math.floor(pool / COST));
        if (BIRTHS <= 0) {
            break;
        }
        const SHARES = PAIRS.map((pairs) => Math.floor((pairs * BIRTHS) / TOTAL));
        // Leftover births go to the largest remainders; ties rotate with the round so no species id is always first.
        const ORDER = PAIRS.map((_, index) => (round + index) % SPECIES_COUNT).sort(
            (a, b) => ((PAIRS[b] * BIRTHS) % TOTAL) - ((PAIRS[a] * BIRTHS) % TOTAL),
        );
        for (let left = BIRTHS - SHARES.reduce((sum, share) => sum + share, 0), index = 0; left > 0; index++) {
            SHARES[ORDER[index]]++;
            left--;
        }
        let progressed = false;
        for (let species = 0; species < SPECIES_COUNT; species++) {
            for (let births = SHARES[species]; births > 0; births--) {
                const CHILD = world.spawn(species, 1, (world.random() - 0.5) * 10, (world.random() - 0.5) * 6);
                if (!CHILD) {
                    break;
                }
                CHILD.growthElapsed = CHILD.growthDuration;
                pool -= COST;
                SUMMARY.births++;
                progressed = true;
            }
        }
        if (!progressed) {
            break;
        }
    }
    world.metrics.births += SUMMARY.births;
    world._nextWorkerRefreshTick = 0;
    world.refreshWorkers();
    world.markProgressChanged();
    return SUMMARY;
}
