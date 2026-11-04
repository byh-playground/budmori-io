import { BOSS_BEHAVIORS } from './boss-behaviors.js';
import {
    BOSS_BASIC_PATTERN,
    MINION_KINDS,
    createBossPatternRuntime,
    minionKindOf,
    signaturePatternFor,
} from './boss-patterns.js';
import { scaleMoveSpeed } from '../units/unit-stats.js';

// A boss minion IS-A boss summon (the summoner shrunk to a giant unit, MINION_KINDS) and HAS-A behaviour: one
// object per kind below. A behaviour casts boss-kit patterns with the minion as the caster (same targeting,
// telegraph, hits). The cast in progress, the cooldowns and a bomber's chosen pack live on the minion
// (patternRuntime); none of it is saved, so after a reload the minion starts over idle (a lit fuse is lit again
// when it reaches a pack). While a cast runs the minion stands still and does nothing else.
class BossMinionBehavior {
    constructor(kind) {
        this.kind = kind;
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
class CasterMinion extends BossMinionBehavior {
    patternIds(unit) {
        const ID = signaturePatternFor(unit.enemyElement);
        return ID ? [ID, BOSS_BASIC_PATTERN] : [BOSS_BASIC_PATTERN];
    }
    act(world, unit, _dt, living) {
        if (!this.ready(unit)) {
            return false;
        }
        const TARGETS = world.bossPatternTargets(living, unit),
            FALLBACK = TARGETS.nearest || world.nearestBossTarget(living, undefined, unit);
        for (const ID of this.patternIds(unit)) {
            const BEHAVIOR = BOSS_BEHAVIORS.forId(ID);
            if (unit.patternRuntime.cooldowns[ID] <= 1e-9 && BEHAVIOR.eligible(world, TARGETS, 0, unit)) {
                this.begin(world, unit, ID, BEHAVIOR.selectedTarget(world, TARGETS, FALLBACK, unit));
                return true;
            }
        }
        return false;
    }
}

// Keeps keepDistance from its nearest ally: steps back first when one is inside fleeDistance, then the mortar when
// ready, else a bolt; between casts it backs off when closer than keepDistance and closes in beyond its bolt's reach.
class RangedMinion extends BossMinionBehavior {
    act(world, unit, dt, living) {
        const TARGET = world.nearestBossTarget(living, true, unit);
        if (!this.ready(unit) || !TARGET) {
            return true;
        }
        const DISTANCE = Math.hypot(unit.x - TARGET.x, unit.y - TARGET.y);
        if (DISTANCE < this.kind.fleeDistance && this.stepBack(world, unit, dt, living)) {
            return true;
        }
        for (const ID of [this.kind.pattern, this.kind.basic]) {
            if (this.canCast(unit, ID, world, TARGET)) {
                this.begin(world, unit, ID, TARGET);
                return true;
            }
        }
        if (DISTANCE < this.kind.keepDistance) {
            this.stepBack(world, unit, dt, living);
        } else if (DISTANCE > BOSS_BEHAVIORS.forId(this.kind.basic).reachFor(unit) + TARGET.radius) {
            world.steer(unit, TARGET.x, TARGET.y, dt, this.speed(unit));
        } else {
            unit.vx = unit.vy = 0;
        }
        return true;
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
    act(world, unit, dt, living) {
        if (!this.ready(unit)) {
            return true;
        }
        const TARGET = this.pack(world, unit, dt, living);
        if (!TARGET) {
            return true;
        }
        if (this.canCast(unit, this.kind.pattern, world, TARGET)) {
            this.begin(world, unit, this.kind.pattern, TARGET);
            return true;
        }
        world.steer(unit, TARGET.x, TARGET.y, dt, this.speed(unit));
        return true;
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
