// Grain piles that workers fight like enemies: each hit stacks up, five stacks shake one food loose,
// a pile holds a fixed amount of food and vanishes when it is used up, and the field keeps a few piles around.
// Piles and swings are transient presentation-adjacent state; they are rebuilt after a load.
export const SWING_WINDUP = 0.28,
    SWING_FIRE = 0.4,
    SWING_RECOVER = 0.36;
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
export function resetWork(world) {
    world._piles = [];
    world._pileId = 0;
    world._pileRespawn = 0;
    world._workAssign = new Map();
    world._swings = new Map();
}
export function assignWorkers(world, config) {
    const WORK = config.farm.work,
        FREE = world.units.filter((u) => world.isWorker(u) && u.hp > 0 && u.down <= 0 && u.mature),
        ASSIGN = new Map();
    for (const PILE of world._piles) {
        FREE.sort((a, b) => Math.hypot(a.x - PILE.x, a.y - PILE.y) - Math.hypot(b.x - PILE.x, b.y - PILE.y));
        const TAKEN = FREE.splice(0, WORK.maxAttackers);
        TAKEN.forEach((unit, index) => {
            const ANGLE = (index / WORK.maxAttackers) * Math.PI * 2 + 0.9;
            ASSIGN.set(unit.id, {
                pile: PILE,
                attacking: true,
                x: PILE.x + Math.cos(ANGLE) * 1.9,
                y: PILE.y + Math.sin(ANGLE) * 1.9 * 0.75,
            });
        });
    }
    // Workers beyond the attacker limit wait near the closest pile until a slot opens.
    for (const UNIT of FREE) {
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
                x: nearest.x + Math.cos(ANGLE) * 3.4,
                y: nearest.y + Math.sin(ANGLE) * 3.4 * 0.75,
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
export function stepWork(world, config, dt) {
    const WORK = config.farm.work;
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
        if (!UNIT || UNIT.hp <= 0 || Math.hypot(ASSIGN.x - UNIT.x, ASSIGN.y - UNIT.y) > 0.35) {
            world._swings.delete(ID);
            continue;
        }
        let swing = world._swings.get(ID);
        if (!swing) {
            swing = { phase: 'idle', elapsed: 0, wait: (UNIT.seed * 7) % 0.8 };
            world._swings.set(ID, swing);
        }
        if (swing.phase === 'idle') {
            swing.wait -= dt;
            if (swing.wait <= 0 && !FULL) {
                swing.phase = 'windup';
                swing.elapsed = 0;
            }
            continue;
        }
        swing.elapsed += dt;
        if (swing.phase === 'windup' && swing.elapsed >= SWING_WINDUP) {
            impact(world, config, ASSIGN.pile);
            swing.phase = 'fire';
            swing.elapsed = 0;
        } else if (swing.phase === 'fire' && swing.elapsed >= SWING_FIRE) {
            swing.phase = 'recover';
            swing.elapsed = 0;
        } else if (swing.phase === 'recover' && swing.elapsed >= SWING_RECOVER) {
            const RATE = world._workerRates.get(ID) || 0.1,
                INTERVAL = 1 / (RATE * STACKS_PER_FOOD);
            swing.phase = 'idle';
            swing.elapsed = 0;
            swing.wait = Math.max(0, INTERVAL - SWING_WINDUP - SWING_FIRE - SWING_RECOVER);
        }
    }
}
