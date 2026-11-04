import { scaleAttackRecovery } from '../units/unit-stats.js';
import { SweepBossPattern } from '../features/boss-patterns/sweep-360/model.js';
import { ChargeBossPattern } from '../features/boss-patterns/charge/model.js';
import { LeapBossPattern } from '../features/boss-patterns/leap-slam/model.js';
import { FanBossPattern } from '../features/boss-patterns/fan-sweep/model.js';
import { SpinThrowBossPattern } from '../features/boss-patterns/spin-throw/model.js';
import { SlamBossPattern } from '../features/boss-patterns/slam/model.js';
import { MouthSummonBossPattern } from '../features/boss-patterns/mouth-summon/model.js';
import {
    WaterJetPattern,
    RootEruptionPattern,
    FireBreathPattern,
    FrostPulsePattern,
    ChainLightningPattern,
} from '../features/boss-patterns/signature/model.js';
import { MinionBoltPattern, MinionMortarPattern, MinionBlastPattern } from '../features/boss-patterns/minion/model.js';
import { BOSS_PATTERN_CONFIG, BOSS_AIM_TURN_RATE } from './boss-patterns.js';

const { StateMachine: STATE_MACHINE } = globalThis.BloomGamekitBehavior;

// Compose the model perspective once. Feature folders own their concrete
// behavior and presentation; mutable action records remain on the boss.
export function createBossPatternBehaviors(dependencies) {
    const { CONFIG, ArenaGeometry: ARENA_GEOMETRY, Ballistics: BALLISTICS, clamp: CLAMP } = dependencies;
    const DEPENDENCIES = Object.freeze({ CONFIG, ARENA_GEOMETRY, BALLISTICS, CLAMP });
    const PATTERNS = Object.freeze(
        Object.fromEntries(
            [
                new SlamBossPattern(DEPENDENCIES),
                new SweepBossPattern(DEPENDENCIES),
                new ChargeBossPattern(DEPENDENCIES),
                new LeapBossPattern(DEPENDENCIES),
                new FanBossPattern(DEPENDENCIES),
                new SpinThrowBossPattern(DEPENDENCIES),
                new MouthSummonBossPattern(DEPENDENCIES),
                new WaterJetPattern(DEPENDENCIES),
                new RootEruptionPattern(DEPENDENCIES),
                new FireBreathPattern(DEPENDENCIES),
                new FrostPulsePattern(DEPENDENCIES),
                new ChainLightningPattern(DEPENDENCIES),
                new MinionBoltPattern(DEPENDENCIES),
                new MinionMortarPattern(DEPENDENCIES),
                new MinionBlastPattern(DEPENDENCIES),
            ].map((pattern) => [pattern.feature.id, Object.freeze(pattern)]),
        ),
    );
    // The phases of one cast: the action record's `phase` field. Windup aims and then launches, the pattern's own
    // model runs the active phase and ends it (enterBossPatternRecovery), the recovery waits and frees the caster.
    const CONTEXT = { world: null, dt: 0, living: null, boss: null };
    const PHASES = new STATE_MACHINE({
        field: 'phase',
        initial: 'windup',
        states: {
            windup: {
                to: ['active'],
                update(action, { world, dt, living, boss }) {
                    const CONFIG_LOCAL = BOSS_PATTERN_CONFIG[action.id],
                        REMAINING = CONFIG_LOCAL.windup - action.phaseElapsed;
                    if (!action.locked) {
                        const TARGET = world.bossTargetForPattern(action.id, living, boss);
                        if (TARGET) {
                            action.targetId = TARGET.id;
                            action.target = {
                                x: TARGET.x,
                                y: TARGET.y,
                                z: TARGET.z || 0,
                            };
                            const DESIRED = Math.atan2(TARGET.y - boss.y, TARGET.x - boss.x),
                                DELTA = Math.atan2(Math.sin(DESIRED - action.aim), Math.cos(DESIRED - action.aim));
                            action.aim += CLAMP(DELTA, -BOSS_AIM_TURN_RATE * dt, BOSS_AIM_TURN_RATE * dt);
                            boss.angle = boss.facing = action.aim;
                        }
                        if (REMAINING <= 0.25 + 1e-9) {
                            action.locked = true;
                            world.combat('boss-pattern-lock', {
                                patternId: action.id,
                                attackId: boss.attackId + 1,
                                targetId: action.targetId || 0,
                                x: action.target?.x ?? boss.x,
                                y: action.target?.y ?? boss.y,
                                angle: action.aim,
                            });
                        }
                    }
                    if (action.phaseElapsed >= CONFIG_LOCAL.windup - 1e-9) {
                        action.motionDelay = Math.max(0, dt + REMAINING);
                        return 'active';
                    }
                    return null;
                },
            },
            active: {
                to: ['recover'],
                enter: (action, { world, boss }) => world.launchBossPattern(action, boss),
                update: (action, { world, dt, boss }) => PATTERNS[action.id].updateActive(world, action, dt, boss),
            },
            recover: {
                to: [],
                enter(action) {
                    action.phaseElapsed = 0;
                },
                update(action, { boss }) {
                    if (action.phaseElapsed >= scaleAttackRecovery(BOSS_PATTERN_CONFIG[action.id].recover, boss)) {
                        boss.patternRuntime.active = null;
                    }
                },
            },
        },
    });
    const WITH = (world, dt, living, boss) => {
        CONTEXT.world = world;
        CONTEXT.dt = dt;
        CONTEXT.living = living;
        CONTEXT.boss = boss;
        return CONTEXT;
    };
    return Object.freeze({
        forId(id) {
            return PATTERNS[id];
        },
        // The cast's first phase, for a new action record.
        initialPhase: PHASES.initial,
        update(world, action, dt, living, boss) {
            PHASES.update(action, WITH(world, dt, living, boss));
        },
        // Windup over (or a pattern that starts at once): launch it.
        activate(world, action, boss) {
            PHASES.transition(action, 'active', WITH(world, 0, null, boss));
        },
        // The pattern's active part is done.
        recover(action) {
            PHASES.transition(action, 'recover', CONTEXT);
        },
    });
}
