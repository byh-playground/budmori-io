import { BOSS_BEHAVIORS } from './boss-behaviors.js';
import {
    BOSS_BASIC_PATTERN,
    MINION_KINDS,
    createBossPatternRuntime,
    minionKindOf,
    signaturePatternFor,
} from './boss-patterns.js';
import { scaleMoveSpeed } from '../units/unit-stats.js';

const {
    BehaviorTree: BEHAVIOR_TREE,
    action: ACTION_NODE,
    guard: GUARD_NODE,
    selector: SELECTOR_NODE,
} = globalThis.BloomGamekitBehavior;
const HOLD = () => true;

// The minion being played this tick and what it sees, each read once on first use (one record per behaviour).
class MinionTurn {
    begin(behavior, world, unit, dt, living) {
        this.behavior = behavior;
        this.world = world;
        this.unit = unit;
        this.dt = dt;
        this.living = living;
        this._targets = this._fallback = this._nearest = this.pack = null;
        return this;
    }
    get targets() {
        return (this._targets ??= this.world.bossPatternTargets(this.living, this.unit));
    }
    // A caster's fallback target: the nearest for patterns, else the nearest ally at all.
    get fallback() {
        return (this._fallback ??=
            this.targets.nearest || this.world.nearestBossTarget(this.living, undefined, this.unit));
    }
    get nearest() {
        return (this._nearest ??= this.world.nearestBossTarget(this.living, true, this.unit));
    }
    get distance() {
        return Math.hypot(this.unit.x - this.nearest.x, this.unit.y - this.nearest.y);
    }
    get ready() {
        return this.behavior.ready(this.unit);
    }
    // Start `id` on `target` when it is off cooldown and reaches it.
    castOn(id, target) {
        if (!this.behavior.canCast(this.unit, id, this.world, target)) {
            return false;
        }
        this.behavior.begin(this.world, this.unit, id, target);
        return true;
    }
    steerAt(target) {
        this.world.steer(this.unit, target.x, target.y, this.dt, this.behavior.speed(this.unit));
        return true;
    }
}

// A boss minion IS-A boss summon (the summoner shrunk to a giant unit, MINION_KINDS) and HAS-A behaviour: one
// object per kind below. A behaviour casts boss-kit patterns with the minion as the caster (same targeting,
// telegraph, hits). The cast in progress, the cooldowns and a bomber's chosen pack live on the minion
// (patternRuntime); none of it is saved, so after a reload the minion starts over idle (a lit fuse is lit again
// when it reaches a pack). While a cast runs the minion stands still and does nothing else.
class BossMinionBehavior {
    constructor(kind, tree) {
        this.kind = kind;
        this.tree = tree;
        this.turn = new MinionTurn();
    }
    // True when the tree took the minion's turn; false leaves it to its ordinary intent.
    act(world, unit, dt, living) {
        return this.tree.decide(this.turn.begin(this, world, unit, dt, living)) !== null;
    }
    // The pattern ids whose cooldowns this minion runs down.
    patternIds(_unit) {
        return [this.kind.basic, this.kind.pattern].filter(Boolean);
    }
    runtime(unit) {
        if (!unit.patternRuntime) {
            const BASE = createBossPatternRuntime();
            unit.patternRuntime = {
                ...BASE,
                cooldowns: {
                    ...BASE.cooldowns,
                    ...Object.fromEntries(this.patternIds(unit).map((id) => [id, BASE.cooldowns[id] ?? 0])),
                },
                cooldownScale: this.kind.castCooldownMultiplier,
            };
        }
        return unit.patternRuntime;
    }
    // True when the behaviour took the minion's turn this tick (its ordinary intent is skipped).
    update(world, unit, dt) {
        if (unit.hp <= 0) {
            return false;
        }
        const RUNTIME = this.runtime(unit);
        RUNTIME.encounterElapsed += dt;
        for (const ID of this.patternIds(unit)) {
            RUNTIME.cooldowns[ID] = Math.max(0, RUNTIME.cooldowns[ID] - dt);
        }
        const LIVING = world.livingBossTargets();
        if (!RUNTIME.active) {
            if (!LIVING.length) {
                return false;
            }
            const TOOK_TURN = this.act(world, unit, dt, LIVING);
            if (!RUNTIME.active) {
                return TOOK_TURN;
            }
        }
        this.cast(world, unit, dt, LIVING);
        return true;
    }
    // Free to move or start a cast: not thrown, stunned, still falling from the mouth or landing.
    ready(unit) {
        return unit.dropLanded && unit.stun <= 0 && unit.z <= 0.1 && unit.landingRecovery <= 0;
    }
    canCast(unit, id, world, target) {
        return (
            unit.patternRuntime.cooldowns[id] <= 1e-9 &&
            BOSS_BEHAVIORS.forId(id).eligible(world, { nearest: target }, 0, unit)
        );
    }
    begin(world, unit, id, target) {
        world.beginBossPattern(id, target, unit);
        BOSS_BEHAVIORS.forId(id).selected(world, unit);
    }
    cast(world, unit, dt, living) {
        const ACTION = unit.patternRuntime.active,
            BEHAVIOR = BOSS_BEHAVIORS.forId(ACTION.id);
        unit.vx = unit.vy = 0;
        unit.moveControlActive = false;
        ACTION.phaseElapsed += dt;
        if (ACTION.phase === 'active' && BEHAVIOR.physicalActive) {
            BEHAVIOR.updateActive(world, ACTION, dt, unit);
        } else {
            BOSS_BEHAVIORS.update(world, ACTION, dt, living, unit);
        }
        world._settleBossHits(unit);
    }
    speed(unit) {
        return scaleMoveSpeed(unit.bodyProfile ? 1 : 4.1, unit) * (this.kind.speedMultiplier ?? 1);
    }
}

// Today's minion: its summoner's element skill whenever that is ready and reaches, else the boss's slam on a troop in
// reach, else it walks up as an ordinary unit.
function casterCast(turn, id) {
    const BEHAVIOR = id && BOSS_BEHAVIORS.forId(id);
    if (
        !BEHAVIOR ||
        !(turn.unit.patternRuntime.cooldowns[id] <= 1e-9) ||
        !BEHAVIOR.eligible(turn.world, turn.targets, 0, turn.unit)
    ) {
        return false;
    }
    turn.behavior.begin(
        turn.world,
        turn.unit,
        id,
        BEHAVIOR.selectedTarget(turn.world, turn.targets, turn.fallback, turn.unit),
    );
    return true;
}
class CasterMinion extends BossMinionBehavior {
    constructor(kind) {
        super(
            kind,
            new BEHAVIOR_TREE(
                GUARD_NODE(
                    'ready',
                    (turn) => turn.ready,
                    SELECTOR_NODE('cast', [
                        ACTION_NODE('element skill', (turn) =>
                            casterCast(turn, signaturePatternFor(turn.unit.enemyElement)),
                        ),
                        ACTION_NODE('slam', (turn) => casterCast(turn, BOSS_BASIC_PATTERN)),
                    ]),
                ),
            ),
        );
    }
    patternIds(unit) {
        const ID = signaturePatternFor(unit.enemyElement);
        return ID ? [ID, BOSS_BASIC_PATTERN] : [BOSS_BASIC_PATTERN];
    }
}

// Keeps keepDistance from its nearest ally: steps back first when one is inside fleeDistance, then the mortar when
// ready, else a bolt; between casts it backs off when closer than keepDistance and closes in beyond its bolt's reach.
class RangedMinion extends BossMinionBehavior {
    constructor(kind) {
        super(
            kind,
            new BEHAVIOR_TREE(
                SELECTOR_NODE('ranged', [
                    GUARD_NODE('not ready', (turn) => !turn.ready || !turn.nearest, ACTION_NODE('hold', HOLD)),
                    GUARD_NODE(
                        'ally too close',
                        (turn) => turn.distance < kind.fleeDistance,
                        ACTION_NODE('flee', (turn) =>
                            turn.behavior.stepBack(turn.world, turn.unit, turn.dt, turn.living),
                        ),
                    ),
                    ACTION_NODE('mortar', (turn) => turn.castOn(kind.pattern, turn.nearest)),
                    ACTION_NODE('bolt', (turn) => turn.castOn(kind.basic, turn.nearest)),
                    GUARD_NODE(
                        'inside keep distance',
                        (turn) => turn.distance < kind.keepDistance,
                        ACTION_NODE('back off', (turn) => {
                            turn.behavior.stepBack(turn.world, turn.unit, turn.dt, turn.living);
                            return true;
                        }),
                    ),
                    GUARD_NODE(
                        'out of bolt reach',
                        (turn) =>
                            turn.distance > BOSS_BEHAVIORS.forId(kind.basic).reachFor(turn.unit) + turn.nearest.radius,
                        ACTION_NODE('close in', (turn) => turn.steerAt(turn.nearest)),
                    ),
                    ACTION_NODE('stand', (turn) => {
                        turn.unit.vx = turn.unit.vy = 0;
                        return true;
                    }),
                ]),
            ),
        );
    }
    // Away from the allies within keepDistance, around (never into) its own side's bosses; false when cornered.
    stepBack(world, unit, dt, living) {
        const NEAR = living.filter(
                (ally) => Math.hypot(ally.x - unit.x, ally.y - unit.y) < this.kind.keepDistance + ally.radius,
            ),
            BOSSES = world.bosses.filter((boss) => boss.active && boss.hp > 0);
        return world.retreatFrom(unit, dt, NEAR, this.speed(unit), BOSSES);
    }
}

// Runs at the densest pack of allies and lights its fuse there (the blast pattern); it dies in the blast.
class BomberMinion extends BossMinionBehavior {
    constructor(kind) {
        super(
            kind,
            new BEHAVIOR_TREE(
                SELECTOR_NODE('bomber', [
                    GUARD_NODE('not ready', (turn) => !turn.ready, ACTION_NODE('hold', HOLD)),
                    // Picking the pack keeps it for retargetSeconds, so it happens once per free tick.
                    ACTION_NODE(
                        'no pack',
                        (turn) => !(turn.pack = turn.behavior.pack(turn.world, turn.unit, turn.dt, turn.living)),
                    ),
                    ACTION_NODE('light fuse', (turn) => turn.castOn(kind.pattern, turn.pack)),
                    ACTION_NODE('run at pack', (turn) => turn.steerAt(turn.pack)),
                ]),
            ),
        );
    }
    // The ally it runs at: kept for retargetSeconds while it lives, then picked again.
    pack(world, unit, dt, living) {
        const PACK = (unit.patternRuntime.pack ||= { targetId: 0, retargetIn: 0 });
        PACK.retargetIn -= dt;
        const KEPT = world._unitForId(PACK.targetId);
        if (PACK.retargetIn > 0 && KEPT && KEPT.hp > 0 && living.includes(KEPT)) {
            return KEPT;
        }
        const TARGET = this.densestPack(unit, living) ?? world.nearestBossTarget(living, true, unit);
        PACK.targetId = TARGET?.id ?? 0;
        PACK.retargetIn = this.kind.retargetSeconds;
        return TARGET;
    }
    // Among the grounded allies within scanRadius: the one with the most others within clusterRadius (nearest wins
    // a tie, then the lower id since `living` is sorted by id).
    densestPack(unit, living) {
        const NEAR = living.filter(
            (ally) => ally.z <= 0.1 && Math.hypot(ally.x - unit.x, ally.y - unit.y) <= this.kind.scanRadius,
        );
        let best = null,
            bestCount = -1,
            bestDistance = Infinity;
        for (const ALLY of NEAR) {
            let count = 0;
            for (const OTHER of NEAR) {
                if (OTHER !== ALLY && Math.hypot(OTHER.x - ALLY.x, OTHER.y - ALLY.y) <= this.kind.clusterRadius) {
                    count++;
                }
            }
            const DISTANCE = Math.hypot(ALLY.x - unit.x, ALLY.y - unit.y);
            if (count > bestCount || (count === bestCount && DISTANCE < bestDistance)) {
                best = ALLY;
                bestCount = count;
                bestDistance = DISTANCE;
            }
        }
        return best;
    }
}

const BEHAVIORS = new Map([
    [MINION_KINDS.caster.id, new CasterMinion(MINION_KINDS.caster)],
    [MINION_KINDS.ranged.id, new RangedMinion(MINION_KINDS.ranged)],
    [MINION_KINDS.bomber.id, new BomberMinion(MINION_KINDS.bomber)],
]);
// The behaviour of a boss minion, or null for everyone else.
export function bossMinionBehavior(unit) {
    return BEHAVIORS.get(minionKindOf(unit)?.id) ?? null;
}
