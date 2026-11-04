// Scene lab: a deterministic, parameter-driven fight for looking at one thing on screen.
// `?lab=<json>` builds a help-style scene (same seed, same scripted clock, same renderer as play), so a frame is
// reproducible from the URL alone. Capture it with tests/tools/capture-scene.mjs.
//
//   {
//     "seed": 731, "rate": 0.25, "ms": 8000,           // random seed, playback speed, scene length
//     "floor": 1,                                      // tower floor: 1 water, 21 grass, 41 fire, 61 ice, 81 lightning
//     "units": [{ "s": 3, "t": 1, "x": -7, "y": 0, "n": 1, "ring": 3, "giant": false, "hp": 1, "stun": 0 }],
//     "boss": { "hp": 1e7, "stun": 60, "giant": false, "x": 0, "y": 0, "pattern": "signature.water", "entry": false },
//     "relics": { "meteor": 3 }, "bossRelics": { "hammer": 2 },    // formation skills of each side, id: level
//     "charge": true,                                  // fill every skill slot once the fight starts
//     "minions": "ranged",                             // every boss summon spits this MINION_KINDS kind
//     "elapsed": 61                                    // fight seconds already gone (61 starts a tower boss enraged)
//   }
// `s` species 0-8, `t` tier 1-6, `n` copies spread on a circle of radius `ring` around (x, y).
// Every field is optional. A boss without `stun` fights; `pattern` makes its next special exactly that pattern.
// The step names the boss's pattern in progress, else a minion's (`minion.mortar:windup`), else flight or idle.
import { BOSS_PATTERN_CONFIG, BOSS_PATTERN_IDS, BOSS_RHYTHM, MINION_KINDS } from '../boss/boss-patterns.js';

const DEFAULTS = Object.freeze({ seed: 731, rate: 0.25, ms: 8000, floor: 1 });

export function parseLabParams(text) {
    if (!text) {
        return null;
    }
    const RAW = text.trim();
    // The URL may carry plain JSON or base64 of it; both give the same scene.
    const JSON_TEXT = RAW.startsWith('{') ? RAW : atob(RAW);
    return JSON.parse(JSON_TEXT);
}

// Spawns the units and returns each with its spec; states are applied once the fight is set up (labStates).
function labUnits(world, units) {
    const SPAWNED = [];
    for (const SPEC of units) {
        const COUNT = Math.max(1, SPEC.n ?? 1),
            RING = SPEC.ring ?? (COUNT > 1 ? 2 + COUNT * 0.35 : 0);
        for (let index = 0; index < COUNT; index++) {
            const ANGLE = (index / COUNT) * Math.PI * 2;
            const UNIT = world.spawn(
                SPEC.s ?? 0,
                SPEC.t ?? 1,
                (SPEC.x ?? 0) + Math.cos(ANGLE) * RING,
                (SPEC.y ?? 0) + Math.sin(ANGLE) * RING,
            );
            if (!UNIT) {
                continue;
            }
            UNIT.growth = 3;
            UNIT.growthElapsed = UNIT.growthDuration;
            UNIT.z = 0;
            UNIT.dropLanded = true;
            SPAWNED.push([UNIT, SPEC]);
        }
    }
    return SPAWNED;
}

// Starting the climb and entering the floor reset health ratios and giant size, so these go on last.
function labStates(spawned) {
    for (const [UNIT, SPEC] of spawned) {
        if (SPEC.hp !== undefined) {
            UNIT.setHealth(Math.max(1, UNIT.maxHp * SPEC.hp));
        }
        if (SPEC.stun) {
            UNIT.stun = SPEC.stun;
        }
        if (SPEC.giant) {
            UNIT.giantUntil = 1e9;
        }
    }
}

function labBoss(world, spec) {
    const BOSS = world.boss;
    const HP = spec.hp ?? 1e7;
    // "entry": true keeps the floor's entry leaps (tower-encounter.js); otherwise the boss stands at x, y now.
    if (!spec.entry) {
        Object.assign(BOSS, { x: spec.x ?? 0, y: spec.y ?? 0, z: 0, vx: 0, vy: 0, vz: 0, dropLanded: true });
    }
    Object.assign(BOSS, {
        hp: HP,
        maxHp: Math.max(HP, BOSS.maxHp),
        stun: spec.stun ?? 0,
    });
    if (spec.giant) {
        BOSS.giantUntil = 1e9;
    }
    const PATTERN = spec.pattern;
    if (PATTERN) {
        if (!BOSS_PATTERN_IDS.includes(PATTERN)) {
            throw new Error(`lab: unknown boss pattern ${PATTERN}`);
        }
        const RUNTIME = BOSS.patternRuntime,
            CONFIG = BOSS_PATTERN_CONFIG[PATTERN];
        // Only the asked pattern is off cooldown; the rhythm counters make the next special its kind.
        for (const ID of BOSS_PATTERN_IDS) {
            RUNTIME.cooldowns[ID] = ID === PATTERN ? 0 : 1e9;
        }
        // An element skill is the boss's own: the boss takes that element.
        if (CONFIG.element) {
            BOSS.enemyElement = CONFIG.element;
        }
        BOSS.basicCount = BOSS_RHYTHM.basicsPerSpecial;
        BOSS.specialCount = CONFIG.element ? 0 : BOSS_RHYTHM.specialsPerArea - 1;
        // Patterns gated by remaining HP need the boss at or below their unlock fraction, and by fight time past
        // their first use.
        BOSS.hp = Math.min(HP, BOSS.maxHp * Math.min(1, CONFIG.unlockHp));
        RUNTIME.encounterElapsed = Math.max(RUNTIME.encounterElapsed, CONFIG.firstEligible ?? 0);
    }
}

export function createLabScene(text) {
    const P = { ...DEFAULTS, ...parseLabParams(text) };
    return {
        id: 'lab',
        title: 'lab',
        seed: P.seed,
        rate: P.rate,
        durationMs: P.ms,
        timeline: [],
        setup(world) {
            world.resetUnits();
            world.setWorkBasisPoints(0);
            // A climb needs someone to climb, and may only start near the best floor reached: grant that first.
            const SPAWNED = labUnits(world, P.units?.length ? P.units : [{ s: 0, t: 1, x: -20, y: 20 }]);
            world.playerProgression.towerBest = 100;
            if (!world.startTower(P.floor)) {
                throw new Error('lab: the tower did not start');
            }
            // A real climb cannot start above floor 80; the lab may stand on any floor.
            Object.assign(world.tower, { floor: P.floor, startFloor: P.floor });
            for (const [ID, LEVEL] of Object.entries(P.relics ?? {})) {
                world.tower.relics.set(ID, LEVEL);
            }
            for (const [ID, LEVEL] of Object.entries(P.bossRelics ?? {})) {
                world.tower.bossRelics.set(ID, LEVEL);
            }
            world.finishMarch();
            world._benched.clear();
            world._benchRevision++;
            labBoss(world, P.boss ?? { stun: 60 });
            if (P.minions) {
                const KIND = MINION_KINDS[P.minions];
                if (!KIND) {
                    throw new Error(`lab: unknown minion kind ${P.minions}`);
                }
                world.drawBossMinionKind = () => KIND;
            }
            labStates(SPAWNED);
            world.farmBossEvent.phase = 'fighting';
            world.farmBossEvent.elapsed = P.elapsed ?? 0;
            world._unitSpatialDirty = true;
        },
        // Skill slots appear when the fight starts; fill them once so each skill fires at its own pace afterwards.
        auto(world, _timeMs, memo) {
            if (P.charge && !memo.charged && world.formationRuntime.slots.length) {
                memo.charged = true;
                for (const SLOT of world.formationRuntime.slots) {
                    SLOT.charge = 1e9;
                }
            }
            return null;
        },
        step(world) {
            const ACTIVE = world.boss?.patternRuntime?.active;
            if (ACTIVE) {
                return `${ACTIVE.id}:${ACTIVE.phase}`;
            }
            const CAST = world.units.find((unit) => unit.hp > 0 && unit.patternRuntime?.active)?.patternRuntime.active;
            if (CAST) {
                return `${CAST.id}:${CAST.phase}`;
            }
            return world.projectiles.length > 0 ? 'flight' : 'idle';
        },
        steps: {},
    };
}
