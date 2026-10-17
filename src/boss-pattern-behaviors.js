import { BossPattern } from './features/boss-patterns/model-base.js';
import { SweepBossPattern } from './features/boss-patterns/sweep-360/model.js';
import { SlamBossPattern } from './features/boss-patterns/front-slam/model.js';
import { ChargeBossPattern } from './features/boss-patterns/charge/model.js';
import { LeapBossPattern } from './features/boss-patterns/leap-slam/model.js';
import { FanBossPattern } from './features/boss-patterns/fan-sweep/model.js';
import { MouthSummonBossPattern } from './features/boss-patterns/mouth-summon/model.js';
import { BOSS_PATTERN_CONFIG, BOSS_AIM_TURN_RATE } from './boss-patterns.js';

// Compose the model perspective once. Feature folders own their concrete
// behavior and presentation; mutable action records remain on the boss.
export function createBossPatternBehaviors(dependencies) {
    const { CONFIG, ArenaGeometry: ARENA_GEOMETRY, Ballistics: BALLISTICS, clamp: CLAMP } = dependencies;
    const DEPENDENCIES = Object.freeze({ CONFIG, ARENA_GEOMETRY, BALLISTICS, CLAMP });
    const PATTERNS = Object.freeze(
        Object.fromEntries(
            [
                new SweepBossPattern(DEPENDENCIES),
                new SlamBossPattern(DEPENDENCIES),
                new ChargeBossPattern(DEPENDENCIES),
                new LeapBossPattern(DEPENDENCIES),
                new FanBossPattern(DEPENDENCIES),
                new MouthSummonBossPattern(DEPENDENCIES),
            ].map((pattern) => [pattern.feature.id, Object.freeze(pattern)]),
        ),
    );
    const DEFAULT_PATTERN = Object.freeze(new BossPattern({ id: '', config: null }, DEPENDENCIES));
    class BossPatternPhase {
        update(_world, _action, _dt, _living) {
            /* Unknown phases stay unchanged. */
        }
    }
    class WindupBossPatternPhase extends BossPatternPhase {
        update(world, action, dt, living) {
            const CONFIG_LOCAL = BOSS_PATTERN_CONFIG[action.id],
                REMAINING = CONFIG_LOCAL.windup - action.phaseElapsed;
            if (!action.locked) {
                const TARGET = world.bossTargetForPattern(action.id, living);
                if (TARGET) {
                    action.targetId = TARGET.id;
                    action.target = {
                        x: TARGET.x,
                        y: TARGET.y,
                        z: TARGET.z || 0,
                    };
                    const DESIRED = Math.atan2(TARGET.y - world.boss.y, TARGET.x - world.boss.x),
                        DELTA = Math.atan2(Math.sin(DESIRED - action.aim), Math.cos(DESIRED - action.aim));
                    action.aim += CLAMP(DELTA, -BOSS_AIM_TURN_RATE * dt, BOSS_AIM_TURN_RATE * dt);
                    world.boss.angle = world.boss.facing = action.aim;
                }
                if (REMAINING <= 0.25 + 1e-9) {
                    action.locked = true;
                    world.combat('boss-pattern-lock', {
                        patternId: action.id,
                        attackId: world.boss.attackId + 1,
                        targetId: action.targetId || 0,
                        x: action.target?.x ?? world.boss.x,
                        y: action.target?.y ?? world.boss.y,
                        angle: action.aim,
                    });
                }
            }
            if (action.phaseElapsed >= CONFIG_LOCAL.windup - 1e-9) {
                world.activateBossPattern(action);
            }
            return;
        }
    }
    class ActiveBossPatternPhase extends BossPatternPhase {
        update(world, action, dt, _living) {
            PATTERNS[action.id].updateActive(world, action, dt);
        }
    }
    class RecoverBossPatternPhase extends BossPatternPhase {
        update(world, action, _dt, _living) {
            if (action.phaseElapsed >= BOSS_PATTERN_CONFIG[action.id].recover) {
                world.boss.patternRuntime.active = null;
            }
        }
    }
    const PHASES = Object.freeze({
        windup: new WindupBossPatternPhase(),
        active: new ActiveBossPatternPhase(),
        recover: new RecoverBossPatternPhase(),
    });
    const UNKNOWN_PHASE = new BossPatternPhase();
    return Object.freeze({
        weaponPoint(boss, q) {
            return (PATTERNS[boss.patternRuntime?.active?.id] || DEFAULT_PATTERN).weaponPoint(boss, q);
        },
        forId(id) {
            return PATTERNS[id];
        },
        update(world, action, dt, living) {
            (PHASES[action.phase] || UNKNOWN_PHASE).update(world, action, dt, living);
        },
    });
}
