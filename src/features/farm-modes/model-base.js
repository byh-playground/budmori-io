import { scaleMoveSpeed } from '../../unit-stats.js';

const WANDER_SECONDS_MIN = 16,
    WANDER_SECONDS_SPREAD = 16,
    WANDER_EXTENT = 0.82,
    WANDER_ARRIVE = 0.5;
// A stable number in [0, 1) for a unit seed and a salt.
function wanderUnit(seed, salt) {
    let h = Math.imul(Math.floor(seed * 1000) | 0, 0x9e3779b1) ^ Math.imul(salt | 0, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

export class FarmMode {
    constructor(feature, config) {
        this.feature = feature;
        this.config = config;
    }
    // A resting unit walks to a spot of its own and stays there a while before picking the next one.
    // The old target orbited the farm faster than the unit could walk, so everyone chased it in small circles
    // around the middle and piled up there. Spots are spread evenly over the ground (square root of the radius),
    // and the same unit and time always pick the same spot.
    wander(world, unit, dt) {
        if (unit.migrate && world.stepMigrant(unit, dt)) {
            return;
        }
        const ARENA = this.config.farm.arena,
            PERIOD = WANDER_SECONDS_MIN + WANDER_SECONDS_SPREAD * wanderUnit(unit.seed, 7),
            EPOCH = Math.floor(world.time / PERIOD + wanderUnit(unit.seed, 3)),
            ANGLE = wanderUnit(unit.seed, EPOCH * 2 + 11) * Math.PI * 2,
            RADIUS = Math.sqrt(wanderUnit(unit.seed, EPOCH * 2 + 12)) * WANDER_EXTENT,
            X = Math.cos(ANGLE) * RADIUS * ARENA.radiusX,
            Y = Math.sin(ANGLE) * RADIUS * ARENA.radiusY;
        if (Math.hypot(X - unit.x, Y - unit.y) < WANDER_ARRIVE) {
            return;
        }
        world.steer(unit, X, Y, dt, scaleMoveSpeed(1.3, unit));
    }
    update(world, unit, dt) {
        if (unit.stun > 0 || unit.z > 0.1) {
            return;
        }
        if (world.isWorker(unit)) {
            // Workers keep to their job at the work station: no eating, no breeding.
            const ORDER = world.workOrder(unit);
            if (!ORDER) {
                this.wander(world, unit, dt);
            } else if (ORDER.hold) {
                if (ORDER.face) {
                    unit.angle = Math.atan2(ORDER.fy - unit.y, ORDER.fx - unit.x);
                }
            } else {
                world.steer(unit, ORDER.x, ORDER.y, dt, scaleMoveSpeed(ORDER.speed, unit));
                if (Math.hypot(ORDER.x - unit.x, ORDER.y - unit.y) < 0.4) {
                    unit.angle = Math.atan2(ORDER.fy - unit.y, ORDER.fx - unit.x);
                }
            }
            return;
        }
        if (!unit.mature || unit.cooldown > 0) {
            if (!world.avoidNearbyFood(unit, dt)) {
                this.wander(world, unit, dt);
            }
            return;
        }
        this.updateReady(world, unit, dt);
    }
}
