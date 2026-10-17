import { FarmMode } from '../model-base.js';
import { FEATURE } from './definition.js';
import { scaleMoveSpeed } from '../../../unit-stats.js';

export class MergeFarmMode extends FarmMode {
    constructor(config) {
        super(FEATURE, config);
    }
    enter(_world) {
        /* Reselecting merge preserves its task. */
    }
    changed(world) {
        return world.mode !== this.feature.id;
    }
    updateReady(world, u, dt) {
        const TASK = world.mergeTask;
        if (TASK?.phase === 'approach' && TASK.materialIds?.includes(u.id)) {
            const ANCHOR = world._unitById.get(TASK.materialIds[0]);
            if (ANCHOR && u.cooldown <= 0) {
                world.steer(
                    u,
                    u.id === ANCHOR.id ? u.x : ANCHOR.x,
                    u.id === ANCHOR.id ? u.y : ANCHOR.y,
                    dt,
                    scaleMoveSpeed(2.2, u),
                );
            }
            return;
        }
        this.wander(world, u, dt);
        return;
    }
    resolveContacts(world, _units) {
        world.resolveMergeTaskAfterMovement();
    }
    pair(world, a, b, priorityResolved) {
        return world.mergeGroup([a, b], { priorityResolved });
    }
}
