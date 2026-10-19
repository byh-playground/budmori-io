import { scaleMoveSpeed } from '../../unit-stats.js';

export class FarmMode {
    constructor(feature, config) {
        this.feature = feature;
        this.config = config;
    }
    wander(world, unit, dt) {
        world.steer(
            unit,
            Math.sin(world.time * 0.18 + unit.seed) * (this.config.farm.arena.radiusX * 0.78),
            Math.cos(world.time * 0.16 + unit.seed) * (this.config.farm.arena.radiusY * 0.78),
            dt,
            scaleMoveSpeed(1.3, unit),
        );
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
