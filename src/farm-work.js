// Grain piles that workers fight like enemies: each hit stacks up, five stacks shake one food loose,
// a pile holds a fixed amount of food and vanishes when it is used up, and the field keeps a few piles around.
// Piles and swings are transient presentation-adjacent state; they are rebuilt after a load.
export const SWING_WINDUP = 0.28,
    SWING_RECOVER = 0.36;
const NEAR_PILE = 4.4,
    CHARGE_SPEED = 18,
    CHARGE_TIMEOUT = 1.6,
    RECOIL_SPEED = 5.5,
    RING_RADIUS = 2.8;
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
        for (const PILE of world._piles) {
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
    const POSITION = pilePosition(world, config);
    world._piles.push({
        id: ++world._pileId,
        x: POSITION.x,
        y: POSITION.y,
        food: config.farm.work.pileFood,
        maxFood: config.farm.work.pileFood,
        stack: 0,
        hitRev: 0,
        big: false,
    });
    world.emit('drop-dust', POSITION.x, POSITION.y);
}
// Piles are solid: the radius shrinks a little as the pile is used up.
export function pileRadius(pile) {
    return 0.85 * (0.95 + 0.5 * (pile.food / pile.maxFood));
}
export function resetWork(world) {
    world._piles = [];
    world._pileId = 0;
    world._pileRespawn = 0;
    world._workAssign = new Map();
    world._swings = new Map();
}
// Assignments are sticky: a worker keeps its pile and its spot until the pile is gone or the worker stops working,
// so re-running this never shuffles spots around and makes workers jitter back and forth.
export function assignWorkers(world, config) {
    const WORK = config.farm.work,
        WORKERS = world.units.filter((u) => world.isWorker(u) && u.hp > 0 && u.down <= 0 && u.mature),
        BY_ID = new Map(WORKERS.map((u) => [u.id, u])),
        PREVIOUS = world._workAssign,
        ASSIGN = new Map(),
        TAKEN_IDS = new Set();
    for (const PILE of world._piles) {
        const MEMBERS = [],
            USED_SLOTS = new Set();
        for (const [ID, OLD] of PREVIOUS) {
            if (OLD.pile === PILE && OLD.attacking && BY_ID.has(ID) && MEMBERS.length < WORK.maxAttackers) {
                MEMBERS.push({ id: ID, slot: OLD.slot });
                USED_SLOTS.add(OLD.slot);
                TAKEN_IDS.add(ID);
            }
        }
        const FREE = WORKERS.filter((u) => !TAKEN_IDS.has(u.id)).sort(
            (a, b) => Math.hypot(a.x - PILE.x, a.y - PILE.y) - Math.hypot(b.x - PILE.x, b.y - PILE.y),
        );
        for (const UNIT of FREE) {
            if (MEMBERS.length >= WORK.maxAttackers) {
                break;
            }
            let slot = 0;
            while (USED_SLOTS.has(slot)) {
                slot++;
            }
            USED_SLOTS.add(slot);
            MEMBERS.push({ id: UNIT.id, slot });
            TAKEN_IDS.add(UNIT.id);
        }
        for (const MEMBER of MEMBERS) {
            const ANGLE = (MEMBER.slot / WORK.maxAttackers) * Math.PI * 2 + 0.9;
            ASSIGN.set(MEMBER.id, {
                pile: PILE,
                attacking: true,
                slot: MEMBER.slot,
                x: PILE.x + Math.cos(ANGLE) * RING_RADIUS,
                y: PILE.y + Math.sin(ANGLE) * RING_RADIUS * 0.75,
            });
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
            const D = Math.hypot(UNIT.x - PILE.x, UNIT.y - PILE.y);
            if (D < nearestDistance) {
                nearestDistance = D;
                nearest = PILE;
            }
        }
        if (nearest) {
            const ANGLE = UNIT.seed * 3.1;
            ASSIGN.set(UNIT.id, {
                pile: nearest,
                attacking: false,
                slot: -1,
                x: nearest.x + Math.cos(ANGLE) * 4.6,
                y: nearest.y + Math.sin(ANGLE) * 4.6 * 0.75,
            });
        }
    }
    world._workAssign = ASSIGN;
    for (const ID of [...world._swings.keys()]) {
        if (!ASSIGN.get(ID)?.attacking) {
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
    world.foodTaps.produced++;
    world.foodTaps.revision++;
    world.markProgressChanged();
    world.spawnFood(
        (world.random() - 0.5) * config.farm.arena.radiusX * 1.6,
        (world.random() - 0.5) * config.farm.arena.radiusY * 1.5,
        1,
        { allowBossEvent: false, from: { x: pile.x, y: pile.y, z: 0.9 } },
    );
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
        ORDER = { x: ASSIGN.x, y: ASSIGN.y, fx: PILE.x, fy: PILE.y, speed: 9, hold: false, face: false };
    if (!ASSIGN.attacking || !SWING) {
        return ORDER;
    }
    if (SWING.phase === 'idle' && Math.hypot(unit.x - PILE.x, unit.y - PILE.y) <= NEAR_PILE) {
        ORDER.hold = true;
        ORDER.face = true;
    }
    if (SWING.phase === 'fire') {
        ORDER.x = PILE.x;
        ORDER.y = PILE.y;
        ORDER.speed = CHARGE_SPEED;
    } else if (SWING.phase === 'windup') {
        ORDER.hold = true;
        ORDER.face = true;
    } else if (SWING.phase === 'recover') {
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
    while (world._piles.length < WORK.pileCount) {
        if (world._piles.length === 0 || world._pileRespawn >= WORK.pileRespawnSeconds) {
            spawnPile(world, config);
            world._pileRespawn = 0;
            assignWorkers(world, config);
        } else {
            world._pileRespawn += dt;
            break;
        }
    }
    const FULL = world.food.length >= WORK.maxFood;
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
            if (swing.wait <= 0 && !FULL) {
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
