import { FACILITY_IDS } from './farm-plot.js';
// Grain piles that workers fight like enemies: each hit stacks up, five stacks shake one food loose,
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
export function startSite(world, config, facilityId, level, hits, plotId) {
    const POSITION = FACILITY_IDS.includes(facilityId)
        ? facilityPosition(config, facilityId)
        : pilePosition(world, config);
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
// Food workers fight grain piles, resource workers fight trees and rocks, builders work the construction site.
// Builders with nothing to build gather materials instead.
function effectiveKind(world, unit) {
    const KIND = world._workerKinds.get(unit.id) || 'food';
    return KIND === 'build' && !plotHasSite(world) ? 'resource' : KIND;
}
function worksOn(world, unit, pile) {
    const KIND = effectiveKind(world, unit);
    if (KIND === 'build') {
        return pile.kind === 'site';
    }
    if (KIND === 'explore') {
        return false;
    }
    return KIND === 'resource' ? pile.kind === 'wood' || pile.kind === 'stone' : pile.kind === 'grain';
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
        world.materials[pile.kind]++;
        world.emit('food-land', pile.x, pile.y);
    }
    world.markProgressChanged();
    if (pile.food <= 0) {
        world._piles.splice(world._piles.indexOf(pile), 1);
        world.emit('landing-shockwave', pile.x, pile.y);
        assignWorkers(world, config);
    }
}
// What a worker should do this tick: where to go and how fast, or hold still while winding up or recoiling.
export function workOrder(world, unit) {
    const ASSIGN = world._workAssign.get(unit.id);
    if (!ASSIGN) {
        return null;
    }
    const PILE = ASSIGN.pile,
        SWING = world._swings.get(unit.id),
        DISTANCE = Math.hypot(unit.x - PILE.x, unit.y - PILE.y),
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
    const FOOD_FULL = world.food.length >= WORK.maxFood;
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
            if (swing.wait <= 0 && !(FOOD_FULL && ASSIGN.pile.kind === 'grain')) {
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
