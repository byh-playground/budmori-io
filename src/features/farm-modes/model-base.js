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
            const SLOT = world.workSlot(unit);
            if (SLOT) {
                world.steer(unit, SLOT.x, SLOT.y, dt, scaleMoveSpeed(2.6, unit));
                if (Math.hypot(SLOT.x - unit.x, SLOT.y - unit.y) < 0.3) {
                    const NODE = this.config.farm.work.node;
                    unit.angle = Math.atan2(NODE.y - unit.y, NODE.x - unit.x);
                }
            } else {
                this.wander(world, unit, dt);
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
