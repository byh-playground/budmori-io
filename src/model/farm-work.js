// Piles of grain that food workers fight like enemies: each hit stacks up, five stacks shake one food loose,
// a pile holds a fixed amount of food and vanishes when it is used up, and the field keeps a few piles around.
// Piles and swings are transient presentation-adjacent state; they are rebuilt after a load.
const SWING_WINDUP = 0.28,
    SWING_RECOVER = 0.36;
// Draft numbers: food falls 1.5–3.5 from its pile.
const FOOD_DROP_MIN = 1.5,
    FOOD_DROP_MAX = 3.5,
    NEAR_PILE = 4.4,
    CHARGE_SPEED = 18,
    CHARGE_TIMEOUT = 1.6,
    RECOIL_SPEED = 5.5;
const STACKS_PER_FOOD = 5;
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
        for (const PILE of world.piles) {
            gap = Math.min(gap, Math.hypot(PILE.x - X, PILE.y - Y));
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
function spawnPile(world, config) {
    const POSITION = pilePosition(world, config),
        AMOUNT = config.farm.work.pileKind.amount;
    world.piles.push({
        id: ++world._pileId,
        x: POSITION.x,
        y: POSITION.y,
        food: AMOUNT,
        maxFood: AMOUNT,
        stack: 0,
        hitRev: 0,
        big: false,
    });
    world.emit('drop-dust', POSITION.x, POSITION.y);
}
// Piles are solid: the radius shrinks a little as the pile is used up.
function pileRadius(pile) {
    return 0.85 * (0.95 + 0.5 * (pile.food / pile.maxFood));
}
// How many of each species work. The slider fixes the farm-wide worker share. Without breeding weights every species
// gives the same share; with them, the breeders are split between species by weight and everyone else works.
// lengths: species -> adults. Returns species -> workers.
export function workersBySpecies(lengths, ratio, weights) {
    const WORKERS = new Map();
    if (!weights) {
        for (const [SPECIES, LENGTH] of lengths) {
            WORKERS.set(SPECIES, Math.floor(ratio * LENGTH + 1e-9));
        }
        return WORKERS;
    }
    let total = 0;
    for (const LENGTH of lengths.values()) {
        total += LENGTH;
    }
    const ALLOC = new Map([...lengths.keys()].map((species) => [species, 0]));
    let remaining = total - Math.floor(ratio * total + 1e-9),
        active = [...lengths.keys()].filter((species) => (weights[species] || 0) > 0 && lengths.get(species) > 0);
    while (remaining > 0 && active.length) {
        const WEIGHT = active.reduce((sum, species) => sum + weights[species], 0),
            FULL = active.filter(
                (species) =>
                    (remaining * weights[species]) / WEIGHT >= lengths.get(species) - ALLOC.get(species) - 1e-9,
            );
        if (FULL.length) {
            for (const FULL_SPECIES of FULL) {
                const ROOM = lengths.get(FULL_SPECIES) - ALLOC.get(FULL_SPECIES);
                ALLOC.set(FULL_SPECIES, lengths.get(FULL_SPECIES));
                remaining -= ROOM;
            }
            active = active.filter((species) => !FULL.includes(species));
            continue;
        }
        const SHARES = active.map((species) => ({ species, exact: (remaining * weights[species]) / WEIGHT }));
        let given = 0;
        for (const SHARE of SHARES) {
            const BASE = Math.floor(SHARE.exact + 1e-9);
            ALLOC.set(SHARE.species, ALLOC.get(SHARE.species) + BASE);
            given += BASE;
            SHARE.rest = SHARE.exact - BASE;
        }
        SHARES.sort((a, b) => b.rest - a.rest || a.species - b.species);
        for (let i = 0; given < remaining && i < SHARES.length; i++, given++) {
            ALLOC.set(SHARES[i].species, ALLOC.get(SHARES[i].species) + 1);
        }
        remaining = 0;
    }
    for (const [SPECIES, LENGTH] of lengths) {
        WORKERS.set(SPECIES, LENGTH - ALLOC.get(SPECIES));
    }
    return WORKERS;
}
export function resetWork(world) {
    world._piles = [];
    world._pileId = 0;
    world._pileRespawn = 0;
    world._workAssign = new Map();
    world._swings = new Map();
}
// Assignments are sticky: a worker keeps its pile until the pile is gone or the worker stops working,
// so re-running this never reshuffles who attacks what. Everyone attacks; newcomers go to the pile with the fewest workers.
export function assignWorkers(world, _config) {
    const WORKERS = world.units.filter((u) => world.isWorker(u) && u.hp > 0 && u.down <= 0 && u.mature),
        PREVIOUS = world._workAssign,
        ASSIGN = new Map(),
        COUNTS = new Map(world.piles.map((pile) => [pile, 0]));
    if (!world.piles.length) {
        world._workAssign = ASSIGN;
        world._swings.clear();
        return;
    }
    const FREE = [];
    for (const UNIT of WORKERS) {
        const OLD = PREVIOUS.get(UNIT.id);
        if (OLD && COUNTS.has(OLD.pile)) {
            ASSIGN.set(UNIT.id, { pile: OLD.pile });
            COUNTS.set(OLD.pile, COUNTS.get(OLD.pile) + 1);
        } else {
            FREE.push(UNIT);
        }
    }
    for (const UNIT of FREE) {
        let best = null,
            bestCount = Infinity,
            bestDistance = Infinity;
        for (const PILE of world.piles) {
            const COUNT = COUNTS.get(PILE),
                D = Math.hypot(UNIT.x - PILE.x, UNIT.y - PILE.y);
            if (COUNT < bestCount || (COUNT === bestCount && D < bestDistance)) {
                best = PILE;
                bestCount = COUNT;
                bestDistance = D;
            }
        }
        ASSIGN.set(UNIT.id, { pile: best });
        COUNTS.set(best, bestCount + 1);
    }
    // A pile that just appeared (or one that emptied out) evens out: move the nearest worker from the fullest pile to the emptiest.
    for (let guard = WORKERS.length; guard > 0; guard--) {
        let most = null,
            least = null;
        for (const PILE of world.piles) {
            most = !most || COUNTS.get(PILE) > COUNTS.get(most) ? PILE : most;
            least = !least || COUNTS.get(PILE) < COUNTS.get(least) ? PILE : least;
        }
        if (COUNTS.get(most) - COUNTS.get(least) <= 1) {
            break;
        }
        let mover = null,
            moverDistance = Infinity;
        for (const UNIT of WORKERS) {
            if (ASSIGN.get(UNIT.id).pile !== most) {
                continue;
            }
            const D = Math.hypot(UNIT.x - least.x, UNIT.y - least.y);
            if (D < moverDistance) {
                mover = UNIT;
                moverDistance = D;
            }
        }
        ASSIGN.set(mover.id, { pile: least });
        COUNTS.set(most, COUNTS.get(most) - 1);
        COUNTS.set(least, COUNTS.get(least) + 1);
    }
    world._workAssign = ASSIGN;
    for (const ID of [...world._swings.keys()]) {
        if (!ASSIGN.has(ID)) {
            world._swings.delete(ID);
        }
    }
}
function impact(world, config, pile) {
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
    world.foodTaps.produced++;
    // The food lands in a ring around the pile it came from, not anywhere on the field.
    const ANGLE = world.random() * Math.PI * 2,
        REACH = FOOD_DROP_MIN + world.random() * (FOOD_DROP_MAX - FOOD_DROP_MIN);
    world.spawnFood(pile.x + Math.cos(ANGLE) * REACH, pile.y + Math.sin(ANGLE) * REACH * 0.8, 1, {
        from: { x: pile.x, y: pile.y, z: 0.9 },
    });
    world.markProgressChanged();
    if (pile.food <= 0) {
        world.piles.splice(world.piles.indexOf(pile), 1);
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
    for (const PILE of world.piles) {
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
    // Keep the configured number of piles; refill one at a time after a short wait.
    if (world.piles.length < WORK.pileKind.count) {
        world._pileRespawn += dt;
        if (world.piles.length === 0 || world._pileRespawn >= WORK.pileRespawnSeconds) {
            spawnPile(world, config);
            world._pileRespawn = 0;
            assignWorkers(world, config);
        }
    }
    const FOOD_FULL = world.food.length >= WORK.maxFood;
    for (const [ID, ASSIGN] of world._workAssign) {
        if (!world.piles.includes(ASSIGN.pile)) {
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
            if (swing.wait <= 0 && !FOOD_FULL) {
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
