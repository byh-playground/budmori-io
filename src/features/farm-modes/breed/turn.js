import { scaleMoveSpeed } from '../../../units/unit-stats.js';

const {
    BehaviorTree: BEHAVIOR_TREE,
    action: ACTION_NODE,
    guard: GUARD_NODE,
    selector: SELECTOR_NODE,
} = globalThis.BloomGamekitBehavior;

// A walk to food or a mate runs a little faster than a stroll.
const GO_SPEED = 3.6;

// The unit being played this tick, one reusable record per mode; nothing in it is saved.
export class FarmUnitTurn {
    begin(mode, world, unit, dt) {
        this.mode = mode;
        this.world = world;
        this.unit = unit;
        this.dt = dt;
        return this;
    }
    wander() {
        this.mode.wander(this.world, this.unit, this.dt);
        return true;
    }
    // Toward `target`, or a stroll when there is none.
    goToOrWander(target) {
        if (!target) {
            return this.wander();
        }
        this.world.steer(this.unit, target.x, target.y, this.dt, scaleMoveSpeed(GO_SPEED, this.unit));
        return true;
    }
    // Workers keep to their job at the work station: no eating, no breeding.
    work() {
        const { world: WORLD, unit: UNIT, dt: DT } = this,
            ORDER = WORLD.workOrder(UNIT);
        if (!ORDER) {
            return this.wander();
        }
        if (ORDER.hold) {
            if (ORDER.face) {
                UNIT.angle = Math.atan2(ORDER.fy - UNIT.y, ORDER.fx - UNIT.x);
            }
            return true;
        }
        WORLD.steer(UNIT, ORDER.x, ORDER.y, DT, scaleMoveSpeed(ORDER.speed, UNIT));
        if (Math.hypot(ORDER.x - UNIT.x, ORDER.y - UNIT.y) < 0.4) {
            UNIT.angle = Math.atan2(ORDER.fy - UNIT.y, ORDER.fx - UNIT.x);
        }
        return true;
    }
    // Fed and grown: the mate the world holds for this unit. One that is already standing in the field is walked to;
    // otherwise a unit keeps clear of food lying about (the next meal is not for it).
    goToMate() {
        const { world: WORLD, unit: UNIT, dt: DT } = this,
            TARGET = UNIT.cooldown === 0 ? WORLD.findOrReserveMate(UNIT) : null,
            HAS_DESIGNATED_MATE = TARGET && WORLD.hasFieldUnit(TARGET);
        if (!HAS_DESIGNATED_MATE && WORLD.avoidNearbyFood(UNIT, DT)) {
            return true;
        }
        return this.goToOrWander(TARGET);
    }
}

// What a farm unit does this tick, first match wins (the order the units' needs come in).
export const FARM_UNIT_TURN = new BEHAVIOR_TREE(
    SELECTOR_NODE('farm unit', [
        GUARD_NODE(
            'stunned or airborne',
            ({ unit }) => unit.stun > 0 || unit.z > 0.1,
            ACTION_NODE('hold', () => true),
        ),
        // A seed looks for farm food and eats it, one meal per cooldown; between meals it wanders like the others.
        GUARD_NODE(
            'seedling',
            ({ unit }) => !!unit.seedling,
            SELECTOR_NODE('seedling', [
                GUARD_NODE(
                    'resting',
                    ({ unit }) => unit.seedling.cooldown > 0,
                    ACTION_NODE('wander', (turn) => turn.wander()),
                ),
                ACTION_NODE('go to food', (turn) => turn.goToOrWander(turn.world.requestGroundFoodTarget(turn.unit))),
            ]),
        ),
        GUARD_NODE(
            'worker',
            ({ world, unit }) => world.isWorker(unit),
            ACTION_NODE('work', (turn) => turn.work()),
        ),
        GUARD_NODE(
            'growing or resting',
            ({ unit }) => !unit.mature || unit.cooldown > 0,
            ACTION_NODE(
                'avoid food or wander',
                (turn) => turn.world.avoidNearbyFood(turn.unit, turn.dt) || turn.wander(),
            ),
        ),
        GUARD_NODE(
            'hungry',
            ({ unit }) => !unit.fed,
            ACTION_NODE('go to food', (turn) => turn.goToOrWander(turn.world.requestGroundFoodTarget(turn.unit))),
        ),
        ACTION_NODE('go to mate', (turn) => turn.goToMate()),
    ]),
);
