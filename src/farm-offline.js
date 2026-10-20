// Idle progress: when the player was away, the farm is settled with a formula instead of replaying the simulation.
// Workers keep producing, a construction site keeps getting built, and breeders keep breeding as long as food lasts.
import { HITS_PER_WORK, sitesOf, spreadBuildHits } from './farm-work.js';
import { RESERVE_PLOT_ID } from './farm-plot.js';
import {
    FARM_CELL,
    WORLD_MAP_SETTINGS,
    nearestResourceTile,
    takeFromTile,
    tileRemaining,
    tileResource,
    tileX,
    tileY,
} from './world-map.js';

// Gatherers away from the game: they make trips like they do on screen (walk, gather a small load, walk home), so the
// longer the way to the tile the less they bring, and the tiles they take from lose what they gave.
function settleHauling(world, plotId, rate, seconds) {
    const GOT = { wood: 0, stone: 0 },
        WALK = 9 * 0.12,
        HOME = world.worldMap.farms.find((farm) => farm.plotId === plotId);
    if (!HOME || !(rate > 0)) {
        return GOT;
    }
    const CARRY = { wood: 0, stone: 0 };
    let left = seconds;
    for (let round = 0; round < 40 && left > 1e-6; round++) {
        const WANTED = world.materials.wood + GOT.wood <= world.materials.stone + GOT.stone ? 'wood' : 'stone',
            TILE =
                nearestResourceTile(world.worldMap, plotId, WANTED) >= 0
                    ? nearestResourceTile(world.worldMap, plotId, WANTED)
                    : nearestResourceTile(world.worldMap, plotId);
        if (TILE < 0) {
            break;
        }
        const KIND = tileResource(world.worldMap, TILE),
            DX = (tileX(TILE) - tileX(HOME.tile)) * FARM_CELL.width,
            DY = (tileY(TILE) - tileY(HOME.tile)) * FARM_CELL.height,
            TRIP_WALK = (2 * Math.hypot(DX, DY)) / WALK,
            TRIP_WORK = WORLD_MAP_SETTINGS.carryLoad / rate,
            PER_SECOND = WORLD_MAP_SETTINGS.carryLoad / (TRIP_WALK + TRIP_WORK),
            REMAINING = tileRemaining(world.worldMap, TILE),
            TIME = Math.min(left, REMAINING / PER_SECOND),
            TAKEN = takeFromTile(world.worldMap, TILE, PER_SECOND * TIME);
        CARRY[KIND] += TAKEN;
        left -= TIME;
        const WHOLE = Math.floor(CARRY[KIND]);
        GOT[KIND] += WHOLE;
        CARRY[KIND] -= WHOLE;
    }
    world.materials.wood += GOT.wood;
    world.materials.stone += GOT.stone;
    return GOT;
}
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
    const SUMMARY = { seconds: AWAY, food: 0, wood: 0, stone: 0, births: 0, sites: [], built: [] };
    let foodRate = 0;
    const GATHER_RATES = new Map();
    const BUILD_RATES = new Map();
    for (const [ID, KIND] of world._workerKinds) {
        const RATE = world._workerRates.get(ID) || 0;
        if (KIND === 'food') {
            foodRate += RATE;
        } else if (KIND === 'explore') {
            // Exploring is done on foot, in front of the player: nothing is explored while away.
            continue;
        } else if (KIND === 'resource') {
            GATHER_RATES.set(world._workerPlots.get(ID), (GATHER_RATES.get(world._workerPlots.get(ID)) || 0) + RATE);
        } else {
            const PLOT_ID = world._workerPlots.get(ID);
            BUILD_RATES.set(PLOT_ID, (BUILD_RATES.get(PLOT_ID) || 0) + RATE);
        }
    }
    // Builders of every farm plot: their hits are shared evenly between the sites of the plot, a finished site
    // hands its share to the others, and whatever is left over goes to gathering.
    for (const PLOT_ID of [...world._pilesByPlot.keys()]) {
        const RATE = BUILD_RATES.get(PLOT_ID) || 0,
            SITES = sitesOf(world, PLOT_ID);
        if (SITES.length === 0) {
            GATHER_RATES.set(PLOT_ID, (GATHER_RATES.get(PLOT_ID) || 0) + RATE);
            continue;
        }
        if (!(RATE > 0)) {
            continue;
        }
        const RESULT = spreadBuildHits(world, PLOT_ID, RATE * HITS_PER_WORK * SECONDS);
        SUMMARY.built.push(...RESULT.built);
        for (const SITE of RESULT.open) {
            SUMMARY.sites.push({ name: world.siteName(SITE), percent: Math.floor((SITE.done / SITE.need) * 100) });
        }
    }
    SUMMARY.wood = 0;
    SUMMARY.stone = 0;
    for (const [PLOT_ID, RATE] of GATHER_RATES) {
        const GOT = settleHauling(world, PLOT_ID, RATE, SECONDS);
        SUMMARY.wood += GOT.wood;
        SUMMARY.stone += GOT.stone;
    }
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
