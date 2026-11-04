import { hasFaction, FACTION_CONFIG } from '../core/factions.js';
import { scaleMoveSpeed } from '../units/unit-stats.js';
import { BOSS_ENRAGE } from '../boss/boss-patterns.js';
import { bossMinionBehavior } from '../boss/boss-minions.js';
import { ARENA_GEOMETRY } from './arena-geometry.js';
import { unitCapabilityComposition } from '../units/unit-abilities.js';
import { kitSpecies } from '../units/species-catalog.js';

const {
    BehaviorTree: BEHAVIOR_TREE,
    action: ACTION_NODE,
    guard: GUARD_NODE,
    selector: SELECTOR_NODE,
} = globalThis.BloomGamekitBehavior;
const HOLD = () => true;

// The unit being played this tick: one reusable record per world for each tree below; nothing in it is saved.
export class UnitIntentTurn {
    begin(world, unit, dt, enemy, scene) {
        this.world = world;
        this.unit = unit;
        this.dt = dt;
        this.enemy = enemy;
        this.scene = scene;
        return this;
    }
}

// What a living unit does this tick, first match wins.
export const UNIT_INTENT = new BEHAVIOR_TREE(
    SELECTOR_NODE('unit intent', [
        GUARD_NODE(
            'marching',
            ({ world }) => world.farmBossEvent.phase === 'marching',
            ACTION_NODE('march', ({ world, unit }) => {
                world._marchUnit(unit);
                return true;
            }),
        ),
        GUARD_NODE(
            'merge material',
            ({ world, unit }) => world.isMergeTaskMaterial(unit),
            ACTION_NODE('wait for merge', HOLD),
        ),
        // A boss minion runs its own behaviour; when that leaves the turn it fights as an ordinary unit.
        ACTION_NODE('boss minion', ({ world, unit, dt }) => !!bossMinionBehavior(unit)?.update(world, unit, dt)),
        // Commands are army-wide, even after retreat has taken a unit beyond its ordinary farm perception. Never
        // resume farming inside a fight.
        GUARD_NODE(
            'tower fight',
            ({ world, unit }) =>
                world.tower.active &&
                ['dropping', 'fighting'].includes(world.farmBossEvent.phase) &&
                hasFaction(unit, FACTION_CONFIG.PLAYER),
            ACTION_NODE('fight', ({ world, unit, dt, enemy }) => {
                let target = enemy,
                    nearestDistance = Infinity;
                if (!target && world.farmBossEvent.phase === 'fighting') {
                    for (const THREAT of world._armyThreatsForTick()) {
                        const DISTANCE = Math.hypot(unit.x - THREAT.x, unit.y - THREAT.y);
                        if (THREAT.hp > 0 && DISTANCE < nearestDistance) {
                            target = THREAT;
                            nearestDistance = DISTANCE;
                        }
                    }
                }
                world.battleUnit(unit, dt, target);
                return true;
            }),
        ),
        GUARD_NODE(
            'enemy in sight',
            ({ enemy }) => !!enemy,
            ACTION_NODE('battle', ({ world, unit, dt, enemy }) => {
                world.battleUnit(unit, dt, enemy);
                return true;
            }),
        ),
        GUARD_NODE(
            'farmer',
            ({ unit }) => unit.hp > 0 && hasFaction(unit, FACTION_CONFIG.PLAYER) && !unit.isBattleOnlySummon,
            ACTION_NODE('farm', ({ world, unit, dt }) => {
                const ACTIVE_ATTACK =
                    unit.specialAbility && unit.specialAbility.phase !== 'idle' ? unit.specialAbility : unit.ability;
                if (ACTIVE_ATTACK.phase !== 'idle') {
                    if (ACTIVE_ATTACK.phase !== 'recover') {
                        ACTIVE_ATTACK.interrupt();
                    }
                    ACTIVE_ATTACK.update(world, dt);
                }
                world.farmUnit(unit, dt);
                return true;
            }),
        ),
        ACTION_NODE('unoccupied', ({ world, unit, dt, scene }) => {
            scene.updateUnoccupied(world, unit, dt);
            return true;
        }),
    ]),
);

// A living, landed fighter after this tick's attack step: the army command it is under and its attack's state, and
// where it stands against the enemy, measured once on first use.
export class BattleTurn {
    begin(world, unit, dt, enemy, attack, attackBusy, retreat, parallelGuard) {
        this.world = world;
        this.unit = unit;
        this.dt = dt;
        this.enemy = enemy;
        this.attack = attack;
        this.attackBusy = attackBusy;
        this.retreat = retreat;
        this.parallelGuard = parallelGuard;
        this.scatter =
            world.tower.active && world.battleCommand === 'scatter' && hasFaction(unit, FACTION_CONFIG.PLAYER);
        // Scatter is separation on top of the same attack rule: a unit pushed out of reach cannot attack. The
        // recovery after an attack is free time, so a scattering unit keeps spreading through it.
        this.recoverSpread = attackBusy && attack.phase === 'recover' && this.scatter;
        this.measured = false;
        return this;
    }
    // Hold the current firing bearing. Ranged troops retreat from a boss that closes in; they never follow a
    // rotating slot through its body to reach the opposite side.
    measure() {
        if (!this.measured) {
            const U = this.unit,
                ENEMY = this.enemy;
            this.dx = U.x - ENEMY.x;
            this.dy = U.y - ENEMY.y;
            this.n = Math.hypot(this.dx, this.dy) || 1;
            this.behavior = unitCapabilityComposition(kitSpecies(U));
            this.stand = ENEMY.radius + U.ability.attackRange(this.world);
            this.min = this.stand - 0.55;
            this.max = this.stand + this.behavior.outerRangeSlack;
            this.measured = true;
        }
        return this;
    }
}

// What a fighter does after its attack step, first match wins.
export const ARMY_COMMAND = new BEHAVIOR_TREE(
    SELECTOR_NODE('army command', [
        GUARD_NODE(
            'retreat',
            (turn) => turn.retreat,
            SELECTOR_NODE('retreat', [
                GUARD_NODE(
                    'committed',
                    ({ unit, attack }) =>
                        unit.stun > 0 ||
                        unit.down > 0 ||
                        unit.z > 0.1 ||
                        unit.landingRecovery > 0 ||
                        attack.phase === 'active' ||
                        attack.phase === 'windup',
                    ACTION_NODE('hold', HOLD),
                ),
                ACTION_NODE('fall back', ({ world, unit, dt }) => {
                    world._retreatArmyUnit(unit, dt);
                    return true;
                }),
            ]),
        ),
        GUARD_NODE(
            'busy',
            ({ unit, attackBusy, recoverSpread }) =>
                (attackBusy && !recoverSpread) || unit.stun > 0 || unit.z > 0.1 || unit.landingRecovery > 0,
            ACTION_NODE('hold', HOLD),
        ),
        GUARD_NODE(
            'guarding',
            ({ world, unit, parallelGuard }) => !parallelGuard && !!unit.ability.isGuarding?.(world.simulationTick),
            ACTION_NODE('guard', HOLD),
        ),
        GUARD_NODE('no enemy', ({ enemy }) => !enemy, ACTION_NODE('idle', HOLD)),
        GUARD_NODE(
            'scatter',
            (turn) => turn.scatter,
            ACTION_NODE('spread', (turn) =>
                turn.world._scatterArmyUnit(turn.unit, turn.dt, turn.enemy, turn.measure().max, turn.recoverSpread),
            ),
        ),
        GUARD_NODE(
            'spreading after attack',
            (turn) => turn.recoverSpread,
            ACTION_NODE('stop', ({ unit }) => {
                unit.vx = unit.vy = 0;
                return true;
            }),
        ),
        ACTION_NODE('close in', (turn) => {
            const {
                world: WORLD,
                unit: U,
                enemy: ENEMY,
                dx: DX,
                dy: DY,
                n: N,
                stand: STAND,
                min: MIN,
                max: MAX,
            } = turn.measure();
            if (!(N > MAX || (turn.behavior.retreatWithinRange && N < MIN))) {
                return false;
            }
            const SLOT = ARENA_GEOMETRY.clamp(
                {
                    x: ENEMY.x + (DX / N) * (STAND - (kitSpecies(U) === 4 ? 0.1 : 0)),
                    y: ENEMY.y + (DY / N) * (STAND - (kitSpecies(U) === 4 ? 0.1 : 0)),
                },
                WORLD,
                U.radius,
            );
            // A ranged actor at the wall can fire within its existing maximum range instead of endlessly steering
            // toward a clamped retreat point.
            if (!(N > MAX || Math.hypot(SLOT.x - U.x, SLOT.y - U.y) > 0.08)) {
                return false;
            }
            // An enraged boss runs troops down (BOSS_ENRAGE.chaseMultiplier).
            WORLD.steer(
                U,
                SLOT.x,
                SLOT.y,
                turn.dt,
                scaleMoveSpeed(U.bodyProfile ? 1 : 4.1, U) * (U.enraged ? BOSS_ENRAGE.chaseMultiplier : 1),
            );
            return true;
        }),
        ACTION_NODE('attack', (turn) => {
            const { world: WORLD, unit: U, enemy: ENEMY, dx: DX, dy: DY, n: N } = turn.measure();
            U.vx = U.vy = 0;
            const TARGET = turn.behavior.aimAtCenter
                ? {
                      id: ENEMY.id,
                      generation: ENEMY.generation,
                      x: ENEMY.x,
                      y: ENEMY.y,
                  }
                : {
                      id: ENEMY.id,
                      generation: ENEMY.generation,
                      x: ENEMY.x + (DX / N) * (ENEMY.radius + U.radius - 0.16),
                      y: ENEMY.y + (DY / N) * (ENEMY.radius + U.radius - 0.16),
                  };
            const SPECIAL_ABILITY = U.specialAbility;
            if (
                SPECIAL_ABILITY?.canBegin?.(WORLD) &&
                N <= ENEMY.radius + SPECIAL_ABILITY.spec.range + (U.tier - 1) * 0.12 + U.attackRangeOffset
            ) {
                SPECIAL_ABILITY.begin(WORLD, TARGET);
                return true;
            }
            if (!turn.parallelGuard && U.ability.tryStartGuard?.(WORLD, TARGET)) {
                return true;
            }
            U.ability.begin(WORLD, TARGET);
            return true;
        }),
    ]),
);
