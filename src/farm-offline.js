// Idle progress: when the player was away, the farm is settled with a formula instead of replaying the simulation.
// Workers keep producing, a construction site keeps getting built, and breeders keep breeding as long as food lasts.
import { activeSite } from './farm-work.js';
import { RESERVE_PLOT_ID } from './farm-plot.js';

const STACKS_PER_FOOD = 5;

export function applyOffline(world, config, rawSeconds) {
    const OFFLINE = config.farm.offline,
        WORK = config.farm.work,
        BREEDING = config.farm.breeding;
    if (world.scene !== 'farm' || world.running || world.farmBossEvent?.phase !== 'idle') {
        return null;
    }
    const AWAY = Math.min(rawSeconds, OFFLINE.capSeconds);
    if (!(AWAY >= OFFLINE.minSeconds)) {
        return null;
    }
    // Away time is what is shown; production runs for the efficiency share of it.
    const SECONDS = AWAY * OFFLINE.efficiency;
    world.refreshWorkers();
    const SUMMARY = { seconds: AWAY, food: 0, wood: 0, stone: 0, births: 0, site: null, built: null };
    let foodRate = 0,
        gatherRate = 0,
        buildRate = 0;
    for (const [ID, KIND] of world._workerKinds) {
        const RATE = world._workerRates.get(ID) || 0;
        if (KIND === 'food') {
            foodRate += RATE;
        } else if (KIND === 'resource') {
            gatherRate += RATE;
        } else {
            buildRate += RATE;
        }
    }
    // Builders: hits on the site, then gathering for whatever time is left once it is done.
    const SITE = activeSite(world);
    if (SITE && buildRate > 0) {
        const HITS_PER_SECOND = buildRate * STACKS_PER_FOOD,
            REMAINING = SITE.need - SITE.done,
            HITS = HITS_PER_SECOND * SECONDS;
        if (HITS >= REMAINING) {
            gatherRate += buildRate * Math.max(0, 1 - REMAINING / HITS);
            SUMMARY.built = world.siteName(SITE);
            world._piles.splice(world._piles.indexOf(SITE), 1);
            world.completeFacility(SITE);
        } else {
            SITE.done += Math.floor(HITS);
            SUMMARY.site = { name: world.siteName(SITE), percent: Math.floor((SITE.done / SITE.need) * 100) };
        }
    } else if (!SITE) {
        gatherRate += buildRate;
    }
    const MATERIALS = Math.floor(gatherRate * SECONDS),
        WOOD = Math.ceil(MATERIALS / 2);
    world.materials.wood += WOOD;
    world.materials.stone += MATERIALS - WOOD;
    SUMMARY.wood = WOOD;
    SUMMARY.stone = MATERIALS - WOOD;
    let pool = Math.floor(foodRate * SECONDS);
    SUMMARY.food = pool;
    // Units that were recovering or resting are ready again.
    const RESIDENTS = world.roster.residents().filter((unit) => unit.plotId !== RESERVE_PLOT_ID);
    for (const UNIT of RESIDENTS) {
        UNIT.cooldown = 0;
        if (UNIT.down > 0) {
            UNIT.down = Math.min(UNIT.down, 0.05);
        }
        if (!UNIT.mature && pool >= BREEDING.matureMeals) {
            pool -= BREEDING.matureMeals;
            UNIT.growthElapsed = UNIT.growthDuration;
        }
    }
    // Breeding rounds: every pair of resting adults of a species makes a child per round while food and room last.
    const COST = 2 + BREEDING.matureMeals,
        ROUND_SECONDS = BREEDING.cooldownSeconds + BREEDING.growthSeconds,
        ROUNDS = Math.floor(AWAY / ROUND_SECONDS),
        CAPACITY = world.totalFarmCapacity,
        SPECIES_COUNT = world.farmTargets.length,
        COUNTS = new Array(SPECIES_COUNT).fill(0),
        ADULTS = new Array(SPECIES_COUNT).fill(0);
    for (const UNIT of world.roster.residents()) {
        if (UNIT.plotId === RESERVE_PLOT_ID || UNIT.isBattleOnlySummon) {
            continue;
        }
        COUNTS[UNIT.species]++;
        if (UNIT.mature && UNIT.hp > 0 && !world._workerIds.has(UNIT.id)) {
            ADULTS[UNIT.species]++;
        }
    }
    for (let round = 0; round < ROUNDS && pool >= COST; round++) {
        let progressed = false;
        for (let species = 0; species < SPECIES_COUNT; species++) {
            const TARGET = Math.floor((world.farmTargets[species] / 10000) * CAPACITY),
                ROOM = CAPACITY - world.ownedPopulation - world.birthReservations;
            let births = Math.min(
                Math.floor(ADULTS[species] / 2),
                TARGET - COUNTS[species],
                ROOM,
                Math.floor(pool / COST),
            );
            while (births-- > 0) {
                const CHILD = world.spawn(species, 1, (world.random() - 0.5) * 10, (world.random() - 0.5) * 6);
                if (!CHILD) {
                    break;
                }
                CHILD.growthElapsed = CHILD.growthDuration;
                pool -= COST;
                COUNTS[species]++;
                ADULTS[species]++;
                SUMMARY.births++;
                progressed = true;
            }
        }
        if (!progressed) {
            break;
        }
    }
    // Food nobody ate goes to the warehouse.
    world.warehouseFood = Math.min(WORK.warehouseLimit, world.warehouseFood + pool);
    world.metrics.births += SUMMARY.births;
    world._nextWorkerRefreshTick = 0;
    world.refreshWorkers();
    world.markProgressChanged();
    return SUMMARY;
}
