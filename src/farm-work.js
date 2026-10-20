import { FACILITY_IDS } from './farm-plot.js';
import { nearestResourceTile, takeFromTile } from './world-map.js';
// Piles of grain, trees and rocks that workers fight like enemies: each hit stacks up, five stacks shake one food loose,
// a pile holds a fixed amount of food and vanishes when it is used up, and the field keeps a few piles around.
// Piles and swings are transient presentation-adjacent state; they are rebuilt after a load.
export const SWING_WINDUP = 0.28,
    SWING_RECOVER = 0.36;
const NEAR_PILE = 4.4,
    WAIT_DISTANCE = 6.5,
    CHARGE_SPEED = 18,
    CHARGE_TIMEOUT = 1.6,
    RECOIL_SPEED = 5.5;
const STACKS_PER_FOOD = 5;
// Piles and the construction site are kept per farm plot, so each plot shows only its own.
export function pilesOf(world, plotId) {
    let list = world._pilesByPlot.get(plotId);
    if (!list) {
        list = [];
        world._pilesByPlot.set(plotId, list);
    }
    return list;
}
// Facilities stand in fixed slots in a row at the back of the field, drawn behind the units so they never hide one.
export function facilityPosition(config, id) {
    const WORK = config.farm.work;
    return {
        x: WORK.facilityRowX + (FACILITY_IDS.indexOf(id) - (FACILITY_IDS.length - 1) / 2) * WORK.facilitySpacing,
        y: WORK.facilityRowY,
    };
}
function pilePosition(world, config) {
    const WORK = config.farm.work;
    let best = null,
        bestGap = -1;
    for (let attempt = 0; attempt < 14; attempt++) {
        const ANGLE = world.random() * Math.PI * 2,
            REACH = Math.sqrt(world.random()),
            X = Math.cos(ANGLE) * REACH * WORK.pileRadiusX,
            Y = Math.sin(ANGLE) * REACH * WORK.pileRadiusY;
        let gap = Infinity;
        for (const PILE of world._piles) {
            gap = Math.min(gap, Math.hypot(PILE.x - X, PILE.y - Y));
        }
        // Keep the facility slots free, built or not.
        for (const ID of FACILITY_IDS) {
            const SLOT = facilityPosition(config, ID);
            gap = Math.min(gap, Math.hypot(SLOT.x - X, SLOT.y - Y) * (WORK.pileGap / 3.5));
        }
        if (gap >= WORK.pileGap) {
            return { x: X, y: Y };
        }
        if (gap > bestGap) {
            bestGap = gap;
            best = { x: X, y: Y };
        }
    }
    return best || { x: 0, y: 0 };
}
function spawnPile(world, config, kind) {
    const POSITION = pilePosition(world, config);
    world._piles.push({
        id: ++world._pileId,
        kind,
        x: POSITION.x,
        y: POSITION.y,
        food: world.pileSpec(kind).amount,
        maxFood: world.pileSpec(kind).amount,
        stack: 0,
        hitRev: 0,
        big: false,
    });
    world.emit('drop-dust', POSITION.x, POSITION.y);
}
// Starts the construction site for a facility: a solid frame that builders ram until the work is done.
export function startSite(world, config, facilityId, level, hits, plotId, at = null) {
    // A new farm goes up on its own grid cell, which is where the builders walk to; the rest go up in this farm.
    const POSITION =
        at ?? (FACILITY_IDS.includes(facilityId) ? facilityPosition(config, facilityId) : pilePosition(world, config));
    pilesOf(world, plotId).push({
        id: ++world._pileId,
        kind: 'site',
        facility: facilityId,
        level,
        plotId,
        x: POSITION.x,
        y: POSITION.y,
        food: 1,
        maxFood: 1,
        done: 0,
        need: hits,
        stack: 0,
        hitRev: 0,
        big: false,
    });
    world.emit('drop-dust', POSITION.x, POSITION.y);
    assignWorkers(world, config);
}
// Rebuilds the construction site that was saved mid-work.
export function restoreSite(world, data) {
    pilesOf(world, data.plotId).push({
        id: ++world._pileId,
        kind: 'site',
        facility: data.facility,
        level: data.level,
        plotId: data.plotId,
        x: data.x,
        y: data.y,
        food: 1,
        maxFood: 1,
        done: data.done,
        need: data.need,
        stack: 0,
        hitRev: 0,
        big: false,
    });
}
// Construction sites of a farm plot. Every plot can build several things at once, each in its own slot.
export function sitesOf(world, plotId = world.activePlotId) {
    return pilesOf(world, plotId).filter((pile) => pile.kind === 'site');
}
function plotHasSite(world, plotId = world.activePlotId) {
    return pilesOf(world, plotId).some((pile) => pile.kind === 'site');
}
export { plotHasSite };
// Builders' hits on one plot are shared evenly between its sites, a finished site hands its share to the others.
// Used wherever the walk is not watched (away from the game, or a farm that is not on screen).
// Returns the names of what got finished and the hits nobody needed.
export function spreadBuildHits(world, plotId, hits) {
    const BUILT = [],
        OPEN = [...sitesOf(world, plotId)];
    let left = hits;
    while (OPEN.length > 0 && left > 0) {
        const SHARE = left / OPEN.length,
            DONE = OPEN.filter((site) => SHARE >= site.need - site.done);
        if (DONE.length === 0) {
            for (const SITE of OPEN) {
                SITE.fraction = (SITE.fraction || 0) + (SHARE % 1);
                SITE.done += Math.floor(SHARE) + Math.floor(SITE.fraction);
                SITE.fraction %= 1;
            }
            left = 0;
            break;
        }
        for (const SITE of DONE) {
            left -= SITE.need - SITE.done;
            BUILT.push(world.siteName(SITE));
            const LIST = pilesOf(world, plotId);
            LIST.splice(LIST.indexOf(SITE), 1);
            world.completeFacility(SITE);
            OPEN.splice(OPEN.indexOf(SITE), 1);
        }
    }
    return { built: BUILT, open: OPEN, left };
}
export const HITS_PER_WORK = STACKS_PER_FOOD;
// The most pieces lying on a farm's ground before its hitters wait for the haulers.
export const GROUND_LIMIT = 12;
// How long one haul takes a carrier that is out of sight, from picking a piece up to putting it down.
const HAUL_TRIP_SECONDS = 4;
// A piece the resource workers knocked loose: it lies on the farm's ground until a hauler carries it to the store.
export function itemsOf(world, plotId) {
    let list = world._itemsByPlot.get(plotId);
    if (!list) {
        list = [];
        world._itemsByPlot.set(plotId, list);
    }
    return list;
}
// Food workers fight grain piles, resource workers fight trees and rocks (the kind they were given), builders work
// the construction site. Haulers carry what the resource workers knock loose; they are not tied to a pile.
function effectiveKind(world, unit) {
    return world._workerKinds.get(unit.id) || 'food';
}
function worksOn(world, unit, pile) {
    const KIND = effectiveKind(world, unit);
    if (KIND === 'build') {
        return pile.kind === 'site';
    }
    if (KIND === 'resource') {
        return pile.kind === (world._workerResource.get(unit.id) ?? 'wood');
    }
    return KIND === 'food' && pile.kind === 'grain';
}
function capacity(config, pile, siteCapacity) {
    const WORK = config.farm.work;
    // A construction site has no cap: every builder adds their own hits, so the speed scales with the head count.
    // Builders split evenly between the sites that are going up at the same time.
    return pile.kind === 'site' ? siteCapacity : WORK.maxAttackers;
}
// Piles are solid: the radius shrinks a little as the pile is used up.
export function pileRadius(pile) {
    if (pile.kind === 'site') {
        return 1.8;
    }
    return (pile.kind === 'wood' ? 0.4 : 0.85) * (0.95 + 0.5 * (pile.food / pile.maxFood));
}
export function resetWork(world) {
    world._pilesByPlot = new Map();
    world._pileId = 0;
    world._pileRespawn = 0;
    world._workAssign = new Map();
    world._swings = new Map();
    world._itemsByPlot = new Map();
    world._carry = new Map();
}
// Assignments are sticky: a worker keeps its pile until the pile is gone or the worker stops working,
// so re-running this never reshuffles who attacks what.
export function assignWorkers(world, config) {
    const WORKERS = world.units.filter((u) => world.isWorker(u) && u.hp > 0 && u.down <= 0 && u.mature),
        BY_ID = new Map(WORKERS.map((u) => [u.id, u])),
        PREVIOUS = world._workAssign,
        ASSIGN = new Map(),
        TAKEN_IDS = new Set(),
        SITE_COUNT = world._piles.filter((pile) => pile.kind === 'site').length,
        BUILDER_COUNT = WORKERS.filter((u) => effectiveKind(world, u) === 'build').length,
        SITE_CAPACITIES = new Map();
    // Builders are shared out as evenly as possible; the first sites in the list get the odd ones.
    let siteIndex = 0;
    for (const PILE of world._piles) {
        if (PILE.kind === 'site') {
            const BASE = Math.floor(BUILDER_COUNT / SITE_COUNT),
                ODD = BUILDER_COUNT % SITE_COUNT;
            SITE_CAPACITIES.set(PILE, BASE + (siteIndex++ < ODD ? 1 : 0));
        }
    }
    for (const PILE of world._piles) {
        const MEMBERS = [];
        for (const [ID, OLD] of PREVIOUS) {
            if (
                OLD.pile === PILE &&
                OLD.attacking &&
                BY_ID.has(ID) &&
                worksOn(world, BY_ID.get(ID), PILE) &&
                MEMBERS.length < capacity(config, PILE, SITE_CAPACITIES.get(PILE))
            ) {
                MEMBERS.push(ID);
                TAKEN_IDS.add(ID);
            }
        }
        const FREE = WORKERS.filter((u) => !TAKEN_IDS.has(u.id) && worksOn(world, u, PILE)).sort(
            (a, b) => Math.hypot(a.x - PILE.x, a.y - PILE.y) - Math.hypot(b.x - PILE.x, b.y - PILE.y),
        );
        for (const UNIT of FREE) {
            if (MEMBERS.length >= capacity(config, PILE, SITE_CAPACITIES.get(PILE))) {
                break;
            }
            MEMBERS.push(UNIT.id);
            TAKEN_IDS.add(UNIT.id);
        }
        for (const ID of MEMBERS) {
            ASSIGN.set(ID, { pile: PILE, attacking: true });
        }
    }
    // Workers beyond the attacker limit wait near the closest pile until a slot opens.
    for (const UNIT of WORKERS) {
        if (TAKEN_IDS.has(UNIT.id)) {
            continue;
        }
        let nearest = null,
            nearestDistance = Infinity;
        for (const PILE of world._piles) {
            if (!worksOn(world, UNIT, PILE)) {
                continue;
            }
            const D = Math.hypot(UNIT.x - PILE.x, UNIT.y - PILE.y);
            if (D < nearestDistance) {
                nearestDistance = D;
                nearest = PILE;
            }
        }
        if (nearest) {
            ASSIGN.set(UNIT.id, { pile: nearest, attacking: false });
        }
    }
    world._workAssign = ASSIGN;
    for (const ID of [...world._swings.keys()]) {
        if (!ASSIGN.get(ID)?.attacking) {
            world._swings.delete(ID);
        }
    }
}
function impactSite(world, config, pile) {
    pile.done++;
    pile.hitRev++;
    if (pile.done % 10 === 0) {
        world.markProgressChanged();
    }
    const COMPLETE = pile.done >= pile.need;
    world.emit('thresh', pile.x, pile.y, 0, { big: COMPLETE, duration: COMPLETE ? 0.9 : 0.55 });
    if (COMPLETE) {
        world._piles.splice(world._piles.indexOf(pile), 1);
        world.completeFacility(pile);
        world.emit('landing-shockwave', pile.x, pile.y);
        assignWorkers(world, config);
    }
}
function impact(world, config, pile) {
    if (pile.kind === 'site') {
        impactSite(world, config, pile);
        return;
    }
    pile.stack++;
    pile.hitRev++;
    const COMPLETE = pile.stack >= STACKS_PER_FOOD;
    world.emit('thresh', pile.x, pile.y, 0, { big: COMPLETE, duration: COMPLETE ? 0.9 : 0.55 });
    if (!COMPLETE) {
        return;
    }
    pile.stack = 0;
    pile.food--;
    world.foodTaps.revision++;
    if (pile.kind === 'grain') {
        world.foodTaps.produced++;
        world.spawnFood(
            (world.random() - 0.5) * config.farm.arena.radiusX * 1.6,
            (world.random() - 0.5) * config.farm.arena.radiusY * 1.5,
            1,
            { allowBossEvent: false, from: { x: pile.x, y: pile.y, z: 0.9 } },
        );
    } else {
        // The piece comes out of the stock of the nearest forest or rock tile; with none left the pile is spent.
        const TILE = nearestResourceTile(world.worldMap, world.activePlotId, pile.kind);
        if (TILE >= 0 && takeFromTile(world.worldMap, TILE, 1) >= 1) {
            itemsOf(world, world.activePlotId).push({
                id: ++world._pileId,
                kind: pile.kind,
                x: pile.x + (world.random() - 0.5) * 4,
                y: pile.y + (world.random() - 0.5) * 3,
            });
            world.emit('food-land', pile.x, pile.y);
        } else {
            pile.food = 0;
        }
    }
    world.markProgressChanged();
    if (pile.food <= 0) {
        world._piles.splice(world._piles.indexOf(pile), 1);
        world.emit('landing-shockwave', pile.x, pile.y);
        assignWorkers(world, config);
    }
}
// Explorers have no pile: they walk into the tile they are exploring and look around; the fog lifts where they stand.
function exploreOrder(world, unit) {
    const SPOT = world.exploreSpot(unit);
    if (!SPOT) {
        // Nothing left to explore: an explorer still out in the fog comes home.
        return unit.workOut ? { x: 0, y: 0, fx: 0, fy: 0, speed: 7, hold: false, face: false } : null;
    }
    if (SPOT.out) {
        unit.workOut = true;
    }
    const DISTANCE = Math.hypot(unit.x - SPOT.x, unit.y - SPOT.y);
    return {
        x: SPOT.x,
        y: SPOT.y,
        fx: SPOT.fx,
        fy: SPOT.fy,
        speed: SPOT.speed,
        hold: DISTANCE <= 0.6,
        face: DISTANCE <= 0.6,
    };
}
// Haulers walk to the nearest piece lying on the ground that no other hauler is going for, pick it up, and carry it
// to the store in the middle of the farm. The model keeps the trip; this only says where to go.
const STORE_SPOT = { x: 0, y: 0 };
function carryOrder(world, unit) {
    const STATE = world._carry.get(unit.id);
    if (STATE?.kind) {
        unit.workOut = false;
        return {
            x: STORE_SPOT.x,
            y: STORE_SPOT.y,
            fx: STORE_SPOT.x,
            fy: STORE_SPOT.y,
            speed: 9,
            hold: false,
            face: false,
        };
    }
    if (STATE?.target) {
        return {
            x: STATE.target.x,
            y: STATE.target.y,
            fx: STATE.target.x,
            fy: STATE.target.y,
            speed: 9,
            hold: false,
            face: false,
        };
    }
    return null;
}
// One step for the haulers of the farm on screen: choose a piece, pick it up, bring it to the store.
export function stepCarriers(world) {
    const ITEMS = itemsOf(world, world.activePlotId),
        ALIVE = new Set();
    for (const UNIT of world.unitCollection.unitsInPlot(world.activePlotId)) {
        if (!world.isWorker(UNIT) || UNIT.hp <= 0 || world._workerKinds.get(UNIT.id) !== 'haul') {
            continue;
        }
        ALIVE.add(UNIT.id);
        let state = world._carry.get(UNIT.id);
        if (!state) {
            state = { kind: null, target: null };
            world._carry.set(UNIT.id, state);
        }
        if (state.kind) {
            if (Math.hypot(UNIT.x - STORE_SPOT.x, UNIT.y - STORE_SPOT.y) <= 1.6) {
                world.materials[state.kind]++;
                world.markProgressChanged();
                state.kind = null;
            }
            continue;
        }
        if (state.target && !ITEMS.includes(state.target)) {
            state.target = null;
        }
        if (!state.target) {
            let best = null,
                bestDistance = Infinity;
            for (const ITEM of ITEMS) {
                if ([...world._carry.values()].some((other) => other !== state && other.target === ITEM)) {
                    continue;
                }
                const D = Math.hypot(UNIT.x - ITEM.x, UNIT.y - ITEM.y);
                if (D < bestDistance) {
                    best = ITEM;
                    bestDistance = D;
                }
            }
            state.target = best;
        }
        if (state.target && Math.hypot(UNIT.x - state.target.x, UNIT.y - state.target.y) <= 1.4) {
            ITEMS.splice(ITEMS.indexOf(state.target), 1);
            state.kind = state.target.kind;
            state.target = null;
        }
    }
    for (const ID of [...world._carry.keys()]) {
        if (!ALIVE.has(ID)) {
            world._carry.delete(ID);
        }
    }
}
// A farm out of sight keeps the same pace without the walking: its resource workers knock pieces loose at their
// rate, its haulers carry one piece per trip, and what is carried comes out of the nearest tile's stock.
// Returns what reached the store, and keeps the fractions for the next call.
export function settleResourcesAway(world, plotId, seconds) {
    const MAKE = { wood: 0, stone: 0 };
    let haulers = 0;
    for (const [ID, KIND] of world._workerKinds) {
        if (world._workerPlots.get(ID) !== plotId) {
            continue;
        }
        if (KIND === 'resource') {
            MAKE[world._workerResource.get(ID) ?? 'wood'] += world._workerRates.get(ID) || 0;
        } else if (KIND === 'haul') {
            haulers++;
        }
    }
    const TOTAL = MAKE.wood + MAKE.stone,
        GOT = { wood: 0, stone: 0 };
    if (!(TOTAL > 0) || haulers === 0) {
        return GOT;
    }
    for (const KIND of ['wood', 'stone']) {
        const TILE = MAKE[KIND] > 0 ? nearestResourceTile(world.worldMap, plotId, KIND) : -1;
        if (TILE < 0) {
            continue;
        }
        const RATE = Math.min(MAKE[KIND], ((haulers / HAUL_TRIP_SECONDS) * MAKE[KIND]) / TOTAL);
        world._idleCarry[KIND] = (world._idleCarry[KIND] ?? 0) + RATE * seconds;
        const WHOLE = Math.floor(world._idleCarry[KIND]),
            TAKEN = Math.floor(takeFromTile(world.worldMap, TILE, WHOLE));
        world._idleCarry[KIND] -= WHOLE;
        world.materials[KIND] += TAKEN;
        GOT[KIND] = TAKEN;
    }
    if (GOT.wood + GOT.stone > 0) {
        world.markProgressChanged();
    }
    return GOT;
}
// What a worker should do this tick: where to go and how fast, or hold still while winding up or recoiling.
export function workOrder(world, unit) {
    const ASSIGN = world._workAssign.get(unit.id);
    if (!ASSIGN) {
        if (world._workerKinds.get(unit.id) === 'explore') {
            return exploreOrder(world, unit);
        }
        return world._workerKinds.get(unit.id) === 'haul' ? carryOrder(world, unit) : null;
    }
    const PILE = ASSIGN.pile,
        SWING = world._swings.get(unit.id);
    if (world.outsideFarm(PILE.x, PILE.y)) {
        // The job is on another cell of the grid: this builder may leave the farm until it is back inside.
        unit.workOut = true;
    }
    const DISTANCE = Math.hypot(unit.x - PILE.x, unit.y - PILE.y),
        ORDER = { x: PILE.x, y: PILE.y, fx: PILE.x, fy: PILE.y, speed: 9, hold: false, face: false };
    if (!ASSIGN.attacking) {
        // Over the attacker limit: wait a little way off until a spot opens up.
        ORDER.hold = DISTANCE <= WAIT_DISTANCE;
        return ORDER;
    }
    if (!SWING || SWING.phase === 'idle') {
        // Anywhere near its own pile a worker just turns to it; only a far one walks over.
        ORDER.hold = DISTANCE <= NEAR_PILE;
        ORDER.face = ORDER.hold;
    } else if (SWING.phase === 'fire') {
        ORDER.speed = CHARGE_SPEED;
    } else if (SWING.phase === 'windup') {
        ORDER.hold = true;
        ORDER.face = true;
    } else {
        ORDER.hold = true;
    }
    return ORDER;
}
function pushOutOfPiles(world) {
    for (const PILE of world._piles) {
        const R = pileRadius(PILE);
        for (const UNIT of world.units) {
            const DX = UNIT.x - PILE.x,
                DY = UNIT.y - PILE.y,
                MIN = R + UNIT.radius * 0.6,
                D = Math.hypot(DX, DY);
            if (D >= MIN) {
                continue;
            }
            const NX = D > 1e-6 ? DX / D : 1,
                NY = D > 1e-6 ? DY / D : 0;
            UNIT.x = PILE.x + NX * MIN;
            UNIT.y = PILE.y + NY * MIN;
            const INWARD = UNIT.vx * NX + UNIT.vy * NY;
            if (INWARD < 0) {
                UNIT.vx -= NX * INWARD;
                UNIT.vy -= NY * INWARD;
            }
        }
    }
}
export function stepWork(world, config, dt) {
    const WORK = config.farm.work;
    pushOutOfPiles(world);
    // Keep the configured number of piles of every kind; refill one at a time after a short wait.
    let missing = null;
    for (const KIND of Object.keys(WORK.pileKinds)) {
        // Trees and rocks only stand where some forest or rock tile in sight still has stock.
        if (KIND !== 'grain' && nearestResourceTile(world.worldMap, world.activePlotId, KIND) < 0) {
            continue;
        }
        if (world._piles.filter((pile) => pile.kind === KIND).length < world.pileSpec(KIND).count) {
            missing = KIND;
            break;
        }
    }
    if (missing) {
        const EMPTY = world._piles.length === 0;
        world._pileRespawn += dt;
        if (EMPTY || world._pileRespawn >= WORK.pileRespawnSeconds) {
            spawnPile(world, config, missing);
            world._pileRespawn = 0;
            assignWorkers(world, config);
        }
    }
    const FOOD_FULL = world.food.length >= WORK.maxFood,
        GROUND_FULL = itemsOf(world, world.activePlotId).length >= GROUND_LIMIT;
    for (const [ID, ASSIGN] of world._workAssign) {
        if (!ASSIGN.attacking || !world._piles.includes(ASSIGN.pile)) {
            continue;
        }
        const UNIT = world._unitById.get(ID);
        if (!UNIT || UNIT.hp <= 0) {
            world._swings.delete(ID);
            continue;
        }
        const PILE = ASSIGN.pile;
        let swing = world._swings.get(ID);
        if (!swing) {
            swing = { phase: 'idle', elapsed: 0, wait: (UNIT.seed * 7) % 0.8 };
            world._swings.set(ID, swing);
        }
        const NEAR = Math.hypot(PILE.x - UNIT.x, PILE.y - UNIT.y) <= NEAR_PILE;
        if (swing.phase === 'idle') {
            if (!NEAR) {
                continue;
            }
            swing.wait -= dt;
            if (
                swing.wait <= 0 &&
                !(FOOD_FULL && ASSIGN.pile.kind === 'grain') &&
                !(GROUND_FULL && (ASSIGN.pile.kind === 'wood' || ASSIGN.pile.kind === 'stone'))
            ) {
                swing.phase = 'windup';
                swing.elapsed = 0;
            }
            continue;
        }
        swing.elapsed += dt;
        if (swing.phase === 'windup' && swing.elapsed >= SWING_WINDUP) {
            swing.phase = 'fire';
            swing.elapsed = 0;
        } else if (swing.phase === 'fire') {
            const DX = UNIT.x - PILE.x,
                DY = UNIT.y - PILE.y,
                D = Math.hypot(DX, DY);
            if (D <= pileRadius(PILE) + UNIT.radius * 0.6 + 0.12) {
                // Body slam: the pile takes the hit and the worker bounces back off it.
                impact(world, config, PILE);
                const NX = D > 1e-6 ? DX / D : 1,
                    NY = D > 1e-6 ? DY / D : 0;
                UNIT.vx = NX * RECOIL_SPEED;
                UNIT.vy = NY * RECOIL_SPEED;
                swing.phase = 'recover';
                swing.elapsed = 0;
            } else if (swing.elapsed >= CHARGE_TIMEOUT) {
                swing.phase = 'recover';
                swing.elapsed = 0;
            }
        } else if (swing.phase === 'recover' && swing.elapsed >= SWING_RECOVER) {
            const RATE = world._workerRates.get(ID) || 0.1,
                INTERVAL = 1 / (RATE * STACKS_PER_FOOD);
            swing.phase = 'idle';
            swing.elapsed = 0;
            swing.wait = Math.max(0, INTERVAL - SWING_WINDUP - SWING_RECOVER - 0.5);
        }
    }
}
