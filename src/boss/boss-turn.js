import { unitStats, applyHealing } from '../units/unit-stats.js';
import {
    BOSS_PATTERN_CONFIG,
    BOSS_STAGGER,
    BOSS_BASIC_PATTERN,
    bossHealthFraction,
    chooseBossPattern,
} from './boss-patterns.js';
import { BOSS_BEHAVIORS } from './boss-behaviors.js';

const {
    BehaviorTree: BEHAVIOR_TREE,
    StateMachine: STATE_MACHINE,
    action: ACTION_NODE,
    guard: GUARD_NODE,
    selector: SELECTOR_NODE,
} = globalThis.BloomGamekitBehavior;

// One reusable record per boss controller for the tick being played: the world, dt and what the boss sees, each
// read once on first use. A behaviour tree leaf or a stagger state reads it; nothing in it is saved.
export class BossTurn {
    constructor(controller) {
        this.controller = controller;
        this.world = null;
        this.dt = 0;
        this._living = null;
        this._targets = null;
        this._target = null;
        this._eligible = null;
    }
    begin(world, dt) {
        this.world = world;
        this.dt = dt;
        this._living = this._targets = this._target = this._eligible = null;
        return this;
    }
    get boss() {
        return this.controller.unit;
    }
    get living() {
        return (this._living ??= this.world.livingBossTargets());
    }
    get targets() {
        return (this._targets ??= this.world.bossPatternTargets(this.living, this.boss));
    }
    // The cast's fallback target: the nearest for patterns, else the nearest troop at all.
    get target() {
        return (this._target ??=
            this.targets.nearest || this.world.nearestBossTarget(this.living, undefined, this.boss));
    }
    get eligible() {
        return (this._eligible ??= this.world.eligibleBossPatterns(this.living, this.targets, this.boss));
    }
    // A cast on `id` that is not the slam: the pattern's own target, its selection hook, and (unless it runs on its
    // own clock) a special for the rhythm. False when there is nothing to cast.
    castSpecial(id, ownClock = false) {
        if (!id) {
            return false;
        }
        const BOSS = this.boss,
            BEHAVIOR = BOSS_BEHAVIORS.forId(id),
            PICK = BEHAVIOR.selectedTarget(this.world, this.targets, this.target, BOSS) ?? this.target;
        if (!ownClock) {
            BOSS.basicCount = 0;
            BOSS.specialCount++;
        }
        this.world.beginBossPattern(id, PICK, BOSS);
        BEHAVIOR.selected(this.world, BOSS);
        return this.runPattern();
    }
    // The slam counts toward the next special.
    castSlam() {
        this.world.beginBossPattern(BOSS_BASIC_PATTERN, this.targets.nearest, this.boss);
        this.boss.basicCount++;
        return this.runPattern();
    }
    // One tick of the cast in progress (a physical active phase is moved by the body in integrate()).
    runPattern() {
        const BOSS = this.boss,
            ACTION = BOSS.patternRuntime.active;
        if (!(ACTION.phase === 'active' && BOSS_BEHAVIORS.forId(ACTION.id).physicalActive)) {
            ACTION.phaseElapsed += this.dt;
            BOSS_BEHAVIORS.update(this.world, ACTION, this.dt, this.living, BOSS);
        }
        this.world._settleBossHits(BOSS);
        return true;
    }
    // Nothing to cast: walk at the nearest troop and swing the ordinary basic attack when it reaches.
    walk() {
        const BOSS = this.boss;
        this.world.battleUnit(BOSS, this.dt, this.world.nearestBossTarget(this.living, false, BOSS));
        BOSS.facing = BOSS.angle;
        // A basic attack that just started counts toward the next special.
        if (BOSS.ability.phase !== 'idle') {
            BOSS.basicCount++;
        }
        this.world._settleBossHits(BOSS);
        return true;
    }
}

const ACTIVE_ATTACK = (boss) =>
    boss.specialAbility && boss.specialAbility.phase !== 'idle' ? boss.specialAbility : boss.ability;
const HOLD = () => true;

// What a free boss does this tick, first match wins. Each leaf that casts also runs the cast's first tick.
export const BOSS_TURN = new BEHAVIOR_TREE(
    SELECTOR_NODE('boss turn', [
        // Stunned, or a basic swing or card is still playing out: only that swing moves on.
        GUARD_NODE(
            'stunned or swinging',
            ({ boss }) => boss.stun > 0 || ACTIVE_ATTACK(boss).phase !== 'idle',
            ACTION_NODE('finish swing', (turn) => {
                turn.world.battleUnit(turn.boss, turn.dt, null);
                return true;
            }),
        ),
        GUARD_NODE(
            'casting a card or airborne',
            ({ world, boss }) =>
                world.formationRuntime.bossCast?.casterId === boss.id || boss.z > 0.1 || boss.landingRecovery > 0,
            ACTION_NODE('hold', HOLD),
        ),
        GUARD_NODE('no troops', (turn) => !turn.living.length, ACTION_NODE('idle', HOLD)),
        GUARD_NODE(
            'pattern in progress',
            ({ boss }) => !!boss.patternRuntime.active,
            ACTION_NODE('run pattern', (turn) => turn.runPattern()),
        ),
        // A pattern on its own clock (the summon) comes before the rhythm and leaves its counters alone.
        ACTION_NODE('own-clock pattern', (turn) =>
            turn.castSpecial(turn.eligible.find((id) => BOSS_PATTERN_CONFIG[id].ownClock) ?? null, true),
        ),
        GUARD_NODE(
            'slam in reach',
            (turn) => BOSS_BEHAVIORS.forId(BOSS_BASIC_PATTERN).eligible(turn.world, turn.targets, 0, turn.boss),
            SELECTOR_NODE('close', [
                ACTION_NODE('enraged barrage', (turn) =>
                    turn.castSpecial(turn.world.bossAreaBarrage(turn.eligible, turn.boss)),
                ),
                ACTION_NODE('rhythm special', (turn) =>
                    turn.castSpecial(
                        chooseBossPattern(
                            turn.boss.patternRuntime,
                            turn.eligible.filter((id) => !BOSS_PATTERN_CONFIG[id].ownClock),
                            () => turn.world.random(),
                            turn.boss,
                        ),
                    ),
                ),
                ACTION_NODE('slam', (turn) => turn.castSlam()),
            ]),
        ),
        // No troop in the slam's reach: close the gap, or walk while no gap closer reaches.
        ACTION_NODE('gap closer', (turn) => turn.castSpecial(turn.world.bossGapCloser(turn.targets, turn.boss))),
        ACTION_NODE('walk', (turn) => turn.walk()),
    ]),
);

// Stagger (BOSS_STAGGER): health lost while standing fills the gauge and a full gauge knocks the boss down; up
// again it heals a share of what it lost and swings at once, standing once that swing is over. The state is the
// pattern runtime's `stagger` field, so it is saved with it.
export const BOSS_STAGGER_STATES = new STATE_MACHINE({
    field: 'stagger',
    initial: 'standing',
    states: {
        standing: {
            to: ['down'],
            update(runtime, { boss }) {
                const HEALTH = bossHealthFraction(boss);
                if (boss.stun > 0 || HEALTH > runtime.staggerFrom) {
                    runtime.staggerFrom = HEALTH;
                    return null;
                }
                return runtime.staggerFrom - HEALTH >= BOSS_STAGGER.gauge - 1e-9 ? 'down' : null;
            },
        },
        down: {
            to: ['rising', 'standing'],
            enter(runtime, { boss }) {
                runtime.staggerFrom = bossHealthFraction(boss);
                boss.stun = Math.max(boss.stun, BOSS_STAGGER.seconds);
            },
            update(runtime, turn) {
                const BOSS = turn.boss;
                runtime.staggerFrom = bossHealthFraction(BOSS);
                if (BOSS.stun > 0) {
                    return null;
                }
                const STATS = unitStats(BOSS);
                applyHealing(
                    BOSS,
                    Math.max(0, runtime.risenFrom * STATS.maxHp - BOSS.hp) * BOSS_STAGGER.recovery.healLost,
                    STATS,
                );
                runtime.staggerFrom = runtime.risenFrom = bossHealthFraction(BOSS);
                return turn.living.length ? 'rising' : 'standing';
            },
        },
        // Dropping whatever the boss was doing when it went down.
        rising: {
            to: ['standing'],
            enter(_runtime, turn) {
                const BOSS = turn.boss;
                BOSS.ability.interrupt();
                BOSS.specialAbility?.interrupt();
                turn.world.beginBossPattern(
                    BOSS_STAGGER.recovery.pattern,
                    turn.world.nearestBossTarget(turn.living, true, BOSS),
                    BOSS,
                );
                turn.world.activateBossPattern(BOSS.patternRuntime.active, BOSS);
            },
            update(runtime, { boss }) {
                runtime.staggerFrom = bossHealthFraction(boss);
                const ACTIVE = runtime.active;
                return ACTIVE?.id !== BOSS_STAGGER.recovery.pattern || ACTIVE.phase === 'recover' ? 'standing' : null;
            },
        },
    },
});
