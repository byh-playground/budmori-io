// Idle progress: when the player was away, the farm is settled with a formula instead of replaying the simulation.
// Workers keep producing, a construction site keeps getting built, and breeders keep breeding as long as food lasts.
import { HITS_PER_WORK, sitesOf, spreadBuildHits } from './farm-work.js';
import { RESERVE_PLOT_ID } from './farm-plot.js';
import { FARM_CELL, WORLD_MAP_SETTINGS, nearestResourceTile, takeFromTile, tileX, tileY } from './world-map.js';

// Gatherers and haulers away from the game: gatherers knock material loose at the tile, haulers carry it home in small
// loads, so what arrives is the smaller of the two. The longer the way, the fewer trips the haulers make, and the
// tiles lose what the gatherers took (a mine never does). Whatever lay on the ground is carried first.
function settleHauling(world, plotId, rates, seconds) {
    const GOT = { wood: 0, stone: 0 },
        WALK = 9 * 0.12,
        HOME = world.worldMap.farms.find((farm) => farm.plotId === plotId);
    if (!HOME) {
        return GOT;
    }
    const FLOW = [];
    for (const KIND of ['wood', 'stone']) {
        const RATE = rates.gather[KIND];
        if (!(RATE > 0)) {
            continue;
        }
        const TILE = nearestResourceTile(world.worldMap, plotId, KIND);
        if (TILE < 0) {
            continue;
        }
        const DX = (tileX(TILE) - tileX(HOME.tile)) * FARM_CELL.width,
            DY = (tileY(TILE) - tileY(HOME.tile)) * FARM_CELL.height;
        FLOW.push({
            kind: KIND,
            tile: TILE,
            make: RATE * (world.worldMap.mines.includes(TILE) ? 0.5 : 1),
            trip: (2 * Math.hypot(DX, DY)) / WALK + 1,
        });
    }
    const MAKE = FLOW.reduce((total, flow) => total + flow.make, 0);
    if (!(MAKE > 0) || !(rates.haul > 0)) {
        return GOT;
    }
    for (const FLOW_ITEM of FLOW) {
        // The haulers split their trips between the kinds in proportion to what is made.
        const SHARE = FLOW_ITEM.make / MAKE,
            CARRY = (rates.haul * SHARE * WORLD_MAP_SETTINGS.carryLoad) / FLOW_ITEM.trip,
            TOTAL = Math.min(FLOW_ITEM.make, CARRY) * seconds,
            ON_GROUND = world._drops.get(FLOW_ITEM.tile) ?? 0,
            FROM_GROUND = Math.min(ON_GROUND, TOTAL),
            FROM_TILE = takeFromTile(world.worldMap, FLOW_ITEM.tile, TOTAL - FROM_GROUND);
        if (ON_GROUND - FROM_GROUND > 1e-9) {
            world._drops.set(FLOW_ITEM.tile, ON_GROUND - FROM_GROUND);
        } else {
            world._drops.delete(FLOW_ITEM.tile);
        }
        GOT[FLOW_ITEM.kind] += Math.floor(FROM_GROUND + FROM_TILE);
    }
    world.materials.wood += GOT.wood;
    world.materials.stone += GOT.stone;
    return GOT;
}
export function applyOffline(world, config, rawSeconds) {
    const OFFLINE = config.farm.offline,
        WORK = config.farm.work,
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
    const SUMMARY = { seconds: AWAY, food: 0, wood: 0, stone: 0, births: 0, sites: [], built: [] };
    let foodRate = 0;
    const GATHER_RATES = new Map();
    const GATHER_OF = (plotId) => {
        if (!GATHER_RATES.has(plotId)) {
            GATHER_RATES.set(plotId, { gather: { wood: 0, stone: 0 }, haul: 0 });
        }
        return GATHER_RATES.get(plotId);
    };
    const BUILD_RATES = new Map();
    for (const [ID, KIND] of world._workerKinds) {
        const RATE = world._workerRates.get(ID) || 0;
        if (KIND === 'food') {
            foodRate += RATE;
        } else if (KIND === 'explore') {
            // Exploring is done on foot, in front of the player: nothing is explored while away.
            continue;
        } else if (KIND === 'resource') {
            GATHER_OF(world._workerPlots.get(ID)).gather[world._workerResource.get(ID) ?? 'wood'] += RATE;
        } else if (KIND === 'haul') {
            GATHER_OF(world._workerPlots.get(ID)).haul += 1;
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
        if (SITES.length === 0 || !(RATE > 0)) {
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
