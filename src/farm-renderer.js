import {
    readVectorSockets,
    bossVectorScale,
    WORLD_HEIGHT_PROJECTION,
    WORLD_DEPTH_PROJECTION,
} from './vector-sockets.cjs';
import { bindBossSocketAsset, unbindBossSocketAsset, bossSummonPose, sampleBossSummon } from './boss-vector-sockets.js';
import { ATTACK_TYPES, Ballistics, CONFIG, clamp, bossAttackArea } from './farm-model.js';
import { farmBreedingCooldown, unitRestPresentation } from './farm-indicators.js';
import { UNIT_GRADES } from './unit-grades.js';
import { bossDangerContour } from './attack-telegraph.js';
import { BOSS_PATTERN_CONFIG } from './boss-patterns.js';
const { bosses: BOSS_VECTOR_ASSETS, troops: TROOP_VECTOR_ASSETS } = globalThis.BudmoriVectorResources;
// Original SVG sources are compiled once by the startup loader before this module runs.
const {
    WebGLDevice: WEB_GL_DEVICE,
    VectorContext: VECTOR_CONTEXT,
    MeshRenderer: MESH_RENDERER,
} = globalThis.BloomGamekitRendering;
const { createVectorAsset: CREATE_VECTOR_ASSET } = globalThis.BloomGamekitVectorAssets;
// Historical Budmori grade outline colors come from the shared grade catalog.
const TIER_OUTLINE_COLORS = UNIT_GRADES.map(({ outlineColor }) => {
    const RGB = outlineColor
        .match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
        .slice(1)
        .map((value) => parseInt(value, 16) / 255);
    return [...RGB, 1];
});
function unitMotion(u, sim, rest) {
    const DEAD = u.hp <= 0 || u.down > 0,
        AIRBORNE = !u.dropLanded || u.z > 0.1,
        PHASE = u.ability?.phase || 'idle';
    const MOVING = Math.hypot(u.vx || 0, u.vy || 0) > 0.18,
        KIND = ATTACK_TYPES[u.species]?.kind;
    if (rest) {
        return rest.phase;
    }
    if (DEAD) {
        return 'death';
    }
    if (sim.scene === 'raid' && sim.encounter?.outcome === 'victory') {
        return 'victory';
    }
    if (AIRBORNE) {
        return 'airborne';
    }
    if (u.stun > 0) {
        return 'hit';
    }
    if (u.bounce > 0.04) {
        return 'landing';
    }
    if (PHASE === 'windup') {
        return 'windup';
    }
    if (PHASE === 'active') {
        return KIND === 'peanut-dual-strike' && u.ability.peanutStrikeCount > 2
            ? `fire-${u.ability.peanutStrikeCount}`
            : 'fire';
    }
    if (PHASE === 'recover') {
        return KIND === 'lob' && u.ability?.action?.path && u.ability.elapsed < 0.12 ? 'fire' : 'recover';
    }
    return MOVING ? 'walk' : 'idle';
}
function motionElapsedMs(u, name, clip) {
    if (name === 'idle' || name === 'walk' || name === 'airborne') {
        return ((u.seed || 0) * 80) % clip.durationMs;
    }
    if (name === 'windup' || name === 'fire' || name.startsWith('fire-') || name === 'recover') {
        return clamp((u.ability?.elapsed || 0) * 1000, 0, clip.durationMs);
    }
    if (name === 'hit') {
        return clip.durationMs * (1 - clamp((u.stun || 0) / 0.5, 0, 1));
    }
    if (name === 'landing') {
        return clip.durationMs * (1 - clamp((u.bounce || 0) / 0.22, 0, 1));
    }
    if (name === 'victory') {
        return (Math.abs(u.seed || 0) * 97.531) % clip.durationMs;
    }
    return clip.durationMs;
}
function unitExpression(u, sim, joyEffects, rest) {
    const DEAD = u.hp <= 0 || u.down > 0,
        AIRBORNE = !u.dropLanded || u.z > 0.5;
    const PHASE = u.ability?.phase;
    const RESTING_COOLDOWN = sim.scene === 'farm' && u.cooldown > 0 && PHASE === 'idle';
    if (rest) {
        return rest.phase === 'defeat' ? 'dead' : rest.phase === 'wake' ? 'neutral' : 'sleep';
    }
    if (DEAD) {
        return 'dead';
    }
    if (sim.scene === 'raid' && sim.encounter?.outcome === 'victory') {
        return 'happy';
    }
    if (u.stun > 0) {
        return 'hurt';
    }
    if (AIRBORNE) {
        return 'surprised';
    }
    if (u.walnutGuarding) {
        return 'guard';
    }
    if (PHASE === 'windup') {
        return 'focused';
    }
    if (PHASE === 'active') {
        return 'attack';
    }
    if (RESTING_COOLDOWN) {
        return 'neutral';
    }
    if (sim.scene === 'farm') {
        for (const E of joyEffects) {
            if (Math.hypot(E.x - u.x, E.y - u.y) < 1.2) {
                return 'happy';
            }
        }
        if (!u.fed) {
            return 'hungry';
        }
    }
    return 'neutral';
}
function renderedBossAttackArea(boss, scene, scratch, area) {
    if (
        !boss?.patternId ||
        boss.hp <= 0 ||
        (boss.patternPhase === 'recover' && (boss.patternPhaseElapsed || 0) >= 0.14)
    ) {
        return null;
    }
    const ACTION = scratch.patternRuntime.active;
    scratch.x = boss.x;
    scratch.y = boss.y;
    scratch.z = boss.z;
    scratch.angle = boss.angle;
    scratch.radius = boss.radius;
    scratch.height = boss.height;
    ACTION.id = boss.patternId;
    ACTION.phase = boss.patternPhase;
    ACTION.phaseElapsed = boss.patternPhaseElapsed;
    ACTION.aim = boss.patternAim;
    ACTION.locked = boss.patternLocked;
    ACTION.start.x = boss.patternStartX;
    ACTION.start.y = boss.patternStartY;
    ACTION.start.z = boss.patternStartZ;
    ACTION.target.x = boss.patternTargetX;
    ACTION.target.y = boss.patternTargetY;
    ACTION.target.z = boss.patternTargetZ;
    return bossAttackArea(scratch, 0, scene, area);
}
function bossAttackPose(b, parts) {
    const ID = b.patternId,
        CONFIG_LOCAL = BOSS_PATTERN_CONFIG[ID],
        PHASE = b.patternPhase,
        ELAPSED = Math.max(0, b.patternPhaseElapsed || 0),
        AIM = Math.atan2(-0.62 * Math.sin(b.patternAim ?? b.angle), Math.cos(b.patternAim ?? b.angle));
    const BODY = {
            y: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
        },
        ARMS = {
            'arm-left': 0,
            'arm-right': 0,
        },
        EXTRAS = {};
    for (const PART of ['foot-left', 'foot-right', 'leaf', 'kernel-mark', 'hilum']) {
        if (parts.has(PART)) {
            EXTRAS[PART] = {
                x: 0,
                y: 0,
                rotation: 0,
            };
        }
    }
    if (!CONFIG_LOCAL || !parts.has('body')) {
        return {
            body: BODY,
            arms: ARMS,
            extras: EXTRAS,
            impact: false,
            releasePulse: 0,
        };
    }
    const WIND = PHASE === 'windup' ? clamp(ELAPSED / CONFIG_LOCAL.windup, 0, 1) : 0,
        WIND_EASE = WIND * WIND * (3 - 2 * WIND);
    const RECOVERING = PHASE === 'recover',
        RECOVER = RECOVERING ? clamp(ELAPSED / CONFIG_LOCAL.recover, 0, 1) : 0,
        RECOVER_EASE = RECOVER * RECOVER * (3 - 2 * RECOVER);
    // Instant circle/sector hits enter recovery in the same simulation step. The
    // first 140 ms of recovery is their authored follow-through, not a retimed hit.
    const INSTANT_IMPACT = RECOVERING && ['attack.sweep-360', 'attack.front-slam'].includes(ID) && ELAPSED < 0.14;
    const LEAP_IMPACT = RECOVERING && ID === 'attack.leap-slam' && ELAPSED < 0.18;
    const ACTIVE = PHASE === 'active',
        RECOVER_IMPACT = INSTANT_IMPACT || LEAP_IMPACT;
    const IMPACT = ACTIVE || RECOVER_IMPACT;
    const LEAD = Math.cos(AIM) >= 0 ? 'arm-right' : 'arm-left',
        TRAIL = LEAD === 'arm-right' ? 'arm-left' : 'arm-right';
    const STRIKE_ANGLE = clamp(AIM, -1.2, 1.2);
    const ARM = (key, value) => {
        if (parts.has(key)) {
            ARMS[key] = value;
        }
    };
    const WINDUP = () => {
        BODY.y = 4 * WIND_EASE;
        BODY.scaleX = 1 - 0.035 * WIND_EASE;
        BODY.scaleY = 1 + 0.06 * WIND_EASE;
        BODY.rotation = AIM * 0.045 * WIND_EASE;
        ARM(LEAD, -0.72 + STRIKE_ANGLE * 0.22);
        ARM(TRAIL, 0.28 - STRIKE_ANGLE * 0.12);
    };
    const SETTLE = () => {
        BODY.y = 3 * (1 - RECOVER_EASE);
        BODY.scaleX = 1 + 0.045 * (1 - RECOVER_EASE);
        BODY.scaleY = 1 - 0.065 * (1 - RECOVER_EASE);
        BODY.rotation = AIM * 0.025 * (1 - RECOVER_EASE);
        ARM(LEAD, 0.35 * (1 - RECOVER_EASE) + STRIKE_ANGLE * 0.16);
        ARM(TRAIL, -0.12 * (1 - RECOVER_EASE));
    };
    const STRIKE = () => {
        BODY.y = -3;
        BODY.scaleX = 1.075;
        BODY.scaleY = 0.91;
        BODY.rotation = AIM * 0.09;
        ARM(LEAD, 0.95 + STRIKE_ANGLE * 0.55);
        ARM(TRAIL, -0.42 - STRIKE_ANGLE * 0.18);
    };
    switch (ID) {
        case 'attack.front-slam':
            if (PHASE === 'windup') {
                WINDUP();
            } else if (IMPACT) {
                STRIKE();
            } else if (RECOVERING) {
                SETTLE();
            }
            break;
        case 'attack.sweep-360': {
            if (PHASE === 'windup') {
                WINDUP();
                ARM('arm-left', -0.72);
                ARM('arm-right', 0.72);
            } else if (IMPACT) {
                const Q = INSTANT_IMPACT ? 1 : clamp(ELAPSED / Math.max(CONFIG_LOCAL.active, 0.001), 0, 1),
                    SWEEP = 2 * Math.PI * Q;
                BODY.rotation = 0.12 * Math.sin(SWEEP);
                BODY.scaleX = 1.055;
                BODY.scaleY = 0.94;
                ARM('arm-left', -0.78 - 0.55 * Math.sin(SWEEP));
                ARM('arm-right', 0.78 + 0.55 * Math.sin(SWEEP));
            } else if (RECOVERING) {
                SETTLE();
            }
            break;
        }
        case 'attack.charge':
            if (PHASE === 'windup') {
                WINDUP();
            } else if (ACTIVE) {
                const STRIDE = Math.sin((b.patternTraveled || 0) * 3.1),
                    LIFT = Math.max(0, STRIDE);
                BODY.y = -1.5 - Math.abs(STRIDE) * 1.2;
                BODY.scaleX = 1.055;
                BODY.scaleY = 0.965;
                BODY.rotation = AIM * 0.11;
                ARM(LEAD, -0.72 + STRIKE_ANGLE * 0.3 + STRIDE * 0.12);
                ARM(TRAIL, 0.46 - STRIDE * 0.18);
                EXTRAS['foot-left'] = {
                    x: -STRIDE * 4,
                    y: -LIFT * 5,
                    rotation: -STRIDE * 0.12,
                };
                EXTRAS['foot-right'] = {
                    x: STRIDE * 4,
                    y: -Math.max(0, -STRIDE) * 5,
                    rotation: STRIDE * 0.12,
                };
                if (parts.has('leaf')) {
                    EXTRAS.leaf = {
                        rotation: STRIDE * 0.14,
                    };
                }
            } else if (RECOVERING) {
                SETTLE();
            }
            break;
        case 'attack.leap-slam':
            if (PHASE === 'windup') {
                WINDUP();
                BODY.y = 5 * WIND_EASE;
                BODY.scaleX = 1 - 0.05 * WIND_EASE;
                BODY.scaleY = 1 + 0.09 * WIND_EASE;
                ARM(LEAD, -0.9);
                ARM(TRAIL, -0.45);
            } else if (ACTIVE) {
                const LIFT = clamp((b.z || 0) / Math.max(1, b.height || 1), 0, 1);
                BODY.rotation = AIM * 0.06;
                BODY.scaleX = 1 + 0.045 * LIFT;
                BODY.scaleY = 1 - 0.035 * LIFT;
                ARM('arm-left', -0.28);
                ARM('arm-right', 0.28);
                EXTRAS['foot-left'] = {
                    y: -4 * LIFT,
                    rotation: -0.08 * LIFT,
                };
                EXTRAS['foot-right'] = {
                    y: -4 * LIFT,
                    rotation: 0.08 * LIFT,
                };
                if (parts.has('leaf')) {
                    EXTRAS.leaf = {
                        rotation: -0.12 * LIFT,
                    };
                }
            } else if (LEAP_IMPACT) {
                BODY.y = 5;
                BODY.scaleX = 1.12;
                BODY.scaleY = 0.8;
                BODY.rotation = AIM * 0.08;
                ARM('arm-left', -0.65);
                ARM('arm-right', 0.65);
                EXTRAS['foot-left'] = {
                    x: -5,
                    y: 2,
                    rotation: -0.14,
                };
                EXTRAS['foot-right'] = {
                    x: 5,
                    y: 2,
                    rotation: 0.14,
                };
            } else if (RECOVERING) {
                SETTLE();
            }
            break;
        case 'attack.fan-sweep':
            if (PHASE === 'windup') {
                WINDUP();
            } else if (ACTIVE) {
                const Q = clamp(ELAPSED / CONFIG_LOCAL.active, 0, 1),
                    ARC = AIM - CONFIG_LOCAL.sector / 2 + CONFIG_LOCAL.sector * Q,
                    PROJECTED = Math.atan2(-0.62 * Math.sin(ARC), Math.cos(ARC));
                BODY.rotation = 0.1 * Math.sin(PROJECTED - AIM);
                BODY.scaleX = 1.035;
                BODY.scaleY = 0.97;
                ARM(LEAD, 0.4 + clamp(PROJECTED, -1.1, 1.1) * 0.58);
                ARM(TRAIL, -0.3 - clamp(PROJECTED, -1.1, 1.1) * 0.2);
                if (parts.has('leaf')) {
                    EXTRAS.leaf = {
                        rotation: 0.12 * Math.sin(Q * Math.PI),
                    };
                }
            } else if (RECOVERING && ELAPSED < 0.12) {
                const ARC = AIM + CONFIG_LOCAL.sector / 2,
                    PROJECTED = Math.atan2(-0.62 * Math.sin(ARC), Math.cos(ARC));
                BODY.rotation = 0.08 * Math.sin(PROJECTED - AIM);
                BODY.scaleX = 1.05;
                ARM(LEAD, 0.4 + PROJECTED * 0.5);
            } else if (RECOVERING) {
                SETTLE();
            }
            break;
        case 'summon.mouth-t1':
            return bossSummonPose(b, parts);
    }
    if (
        RECOVERING &&
        !RECOVER_IMPACT &&
        !['attack.front-slam', 'attack.sweep-360', 'attack.charge', 'attack.leap-slam', 'attack.fan-sweep'].includes(ID)
    ) {
        SETTLE();
    }
    if (parts.has('kernel-mark') && ID === 'attack.charge') {
        EXTRAS['kernel-mark'] = {
            rotation: ACTIVE ? 0.08 * Math.sin((b.patternTraveled || 0) * 3.1) : 0,
        };
    }
    if (parts.has('hilum') && ID === 'attack.charge') {
        EXTRAS.hilum = {
            rotation: ACTIVE ? 0.08 * Math.sin((b.patternTraveled || 0) * 3.1) : 0,
        };
    }
    return {
        body: BODY,
        arms: ARMS,
        extras: EXTRAS,
        impact: IMPACT,
        releasePulse: 0,
    };
}
// render.js
const COMPARE_ACTORS = (a, b) => b.depth - a.depth || a.id - b.id;
const ATTACK_ACCENTS = ['#8fac68', '#dbb76b', '#b58b9c', '#9a6947', '#d7914f', '#a86b32'];
const DIORAMA = class Diorama {
    constructor(canvas) {
        this.canvas = canvas;
        this.device = new WEB_GL_DEVICE(canvas, {
            alpha: false,
            depth: false,
            stencil: false,
            antialias: true,
        });
        this.ctx = new VECTOR_CONTEXT(this.device);
        this.vectorAssets = new Map();
        this.vectorPlayers = new Map();
        this.vectorPlayerAssets = new WeakMap();
        this.actors = [];
        this.actorPool = [];
        this.liveUnitIds = new Set();
        this.joyEffects = [];
        this.unitRings = [];
        this.unitRingPool = [{}, {}, {}];
        this.breedingIndicator = {};
        this.restIndicator = {};
        this.dangerContour = new Float64Array(512);
        this.dangerArea = {};
        this.telegraphBoss = {
            patternRuntime: {
                active: {
                    start: {},
                    target: {},
                },
            },
        };
        const ENTRIES = Object.entries(TROOP_VECTOR_ASSETS);
        if (
            ENTRIES.length !== CONFIG.unit.speciesCount ||
            ENTRIES.some(([species], index) => Number(species) !== index) ||
            typeof CREATE_VECTOR_ASSET !== 'function'
        ) {
            throw new Error('All pinned GameKit troop and vector-assets sources are required');
        }
        this.meshes = new MESH_RENDERER(this.device);
        this.ctx.meshRenderer = this.meshes;
        for (const [SPECIES, COMPILED] of ENTRIES) {
            this.vectorAssets.set(Number(SPECIES), {
                compiled: COMPILED,
                asset: CREATE_VECTOR_ASSET(this.meshes, COMPILED),
                anchors: readVectorSockets(COMPILED, `species ${SPECIES}, ${COMPILED.sourcePath}`),
                parts: new Set(COMPILED.metadata.parts.map((part) => part.id)),
                faceParts: COMPILED.metadata.parts.filter((part) => part.id.startsWith('face-')).map((part) => part.id),
            });
        }
        this.bossAssets = new Map(
            Object.entries(BOSS_VECTOR_ASSETS).map(([id, compiled]) => [
                id,
                {
                    compiled,
                    asset: CREATE_VECTOR_ASSET(this.meshes, compiled),
                    parts: new Set(compiled.metadata.parts.map((part) => part.id)),
                },
            ]),
        );
        for (const SPECIES of this.vectorAssets.keys()) {
            const RECORD = this.bossAssets.get(SPECIES === 3 ? 'chestnut' : `species-${SPECIES}`);
            if (!RECORD) {
                throw new Error('Missing required boss vector asset for species ' + SPECIES);
            }
            RECORD.anchors = bindBossSocketAsset(SPECIES, RECORD);
        }
        this.bossPlayer = null;
        this.bossPlayerAsset = null;
        this.bossPlayers = new Map();
        this.assetsReady = false;
        this.prewarmStats = null;
        this.prewarmDurationMs = 0;
        this.bossTelegraph = null;
        this.ctx.isBloomWebGL = true;
        this.canvas.dataset.rendererBackend = 'Budmori authored 2.5D vectors';
        this.resize();
        const BOSS = this.bossAssets.get('chestnut');
        if (!BOSS) {
            throw new Error('Pinned chestnut boss vector asset is required');
        }
        const PREWARM_AT = performance.now();
        this.bossPlayer = BOSS.asset.createPlayer({
            clip: 'idle',
            startedAtMs: 0,
        });
        this.bossPlayerAsset = BOSS;
        this.bossPlayers.set(3, {
            record: BOSS,
            player: this.bossPlayer,
        });
        this.ctx.beginFrame({
            width: this.canvas.width,
            height: this.canvas.height,
            clearColor: [0.9, 0.92, 0.87, 1],
        });
        this.bossPlayer.draw({
            projection: this.ctx.vector.projection,
            matrix: [0.001, 0, 0, 0.001, 100, 100],
        });
        this.prewarmStats = this.ctx.endFrame();
        this.prewarmDurationMs = performance.now() - PREWARM_AT;
        this.assetsReady = true;
    }
    resize() {
        const R = this.canvas.getBoundingClientRect(),
            D = Math.min(globalThis.devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(R.width * D);
        this.pixelRatio = D;
        this.canvas.height = Math.round(R.height * D);
        this.aspect = R.width / R.height;
        this.configure(this.scene || 'farm', true);
    }
    project(x, y, z = 0) {
        return {
            x: (x + this.offset[0] + this.view[0]) * this.scale,
            y:
                (this.view[1] - (WORLD_DEPTH_PROJECTION * y + WORLD_HEIGHT_PROJECTION * z + this.offset[1])) *
                this.scale,
        };
    }
    screenToWorld(clientX, clientY) {
        const R = this.canvas.getBoundingClientRect(),
            PX = (clientX - R.left) * this.pixelRatio,
            PY = (clientY - R.top) * this.pixelRatio;
        return {
            x: PX / this.scale - this.offset[0] - this.view[0],
            y: (this.view[1] - PY / this.scale - this.offset[1]) / WORLD_DEPTH_PROJECTION,
        };
    }
    configure(scene, force = false) {
        if (this.scene === scene && !force) {
            return;
        }
        if (this.scene !== scene) {
            this.pan = {
                x: 0,
                y: 0,
            };
        }
        this.scene = scene;
        const A = this.aspect;
        if (scene === 'raid') {
            this.view = A > 1.2 ? [Math.max(26.5, 17 * A), 17] : [26.5, 26.5 / A];
        } else {
            this.view = A > 1.2 ? [Math.max(12, 9 * A), 9] : [11.7, 11.7 / A];
        }
        this.scale = this.canvas.width / (2 * this.view[0]);
        const { radiusX: RX, radiusY: RY } = CONFIG[scene].arena;
        // Keep the authored zoom. Pan only far enough to inspect the terrain and
        // tall boss art at its edge; never move simulation bodies or saved points.
        const BOUNDS = {
            left: -RX - 1.3,
            right: RX + 1.3,
            bottom: -(RY + 1.3) * WORLD_DEPTH_PROJECTION,
            top: (RY + 1.3) * WORLD_DEPTH_PROJECTION,
        };
        const BOSS_SCALE = bossVectorScale(CONFIG.boss.radius),
            BOSS_X = RX - CONFIG.boss.radius,
            BOSS_Y = (RY - CONFIG.boss.radius) * WORLD_DEPTH_PROJECTION;
        const INCLUDE_BOSS = (record) => {
            const [X, Y, W, H] = record.compiled.viewBox,
                G = record.anchors.ground;
            BOUNDS.left = Math.min(BOUNDS.left, -BOSS_X - (G.x - X) * BOSS_SCALE);
            BOUNDS.right = Math.max(BOUNDS.right, BOSS_X + (X + W - G.x) * BOSS_SCALE);
            BOUNDS.bottom = Math.min(BOUNDS.bottom, -BOSS_Y - (Y + H - G.y) * BOSS_SCALE);
            BOUNDS.top = Math.max(
                BOUNDS.top,
                BOSS_Y + (G.y - Y) * BOSS_SCALE + CONFIG.raid.dropHeight * WORLD_HEIGHT_PROJECTION,
            );
        };
        for (const RECORD of this.bossAssets.values()) {
            INCLUDE_BOSS(RECORD);
        }
        const BASE_Y = A < 0.8 ? 1.1 : -0.3,
            TOP = this.view[1] - BASE_Y,
            BOTTOM = TOP - this.canvas.height / this.scale;
        this.panLimits = {
            minX: Math.min(0, this.view[0] - BOUNDS.right),
            maxX: Math.max(0, -this.view[0] - BOUNDS.left),
            minY: Math.min(0, TOP - BOUNDS.top),
            maxY: Math.max(0, BOTTOM - BOUNDS.bottom),
        };
        this.pan.x = clamp(this.pan.x, this.panLimits.minX, this.panLimits.maxX);
        this.pan.y = clamp(this.pan.y, this.panLimits.minY, this.panLimits.maxY);
        this.offset = [this.pan.x, BASE_Y + this.pan.y];
        this.terrainDots = Array.from(
            {
                length: 92,
            },
            (_, i) => {
                const ANGLE = i * 2.39996,
                    RAD = Math.sqrt((i + 0.5) / 92);
                return this.project(Math.cos(ANGLE) * (RX + 0.3) * RAD, Math.sin(ANGLE) * (RY + 0.3) * RAD);
            },
        );
        this.terrainLeaves = Array.from(
            {
                length: 24,
            },
            (_, i) => {
                const ANGLE = i * 2.39996;
                return {
                    ...this.project(Math.cos(ANGLE) * (RX + 0.55), Math.sin(ANGLE) * (RY + 0.55)),
                    angle: ANGLE,
                };
            },
        );
    }
    get cameraPan() {
        return {
            x: this.pan.x,
            y: this.pan.y,
        };
    }
    setPan(x, y) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return false;
        }
        const B = this.panLimits,
            NEXT_X = clamp(x, B.minX, B.maxX),
            NEXT_Y = clamp(y, B.minY, B.maxY),
            DX = NEXT_X - this.pan.x,
            DY = NEXT_Y - this.pan.y;
        if (DX === 0 && DY === 0) {
            return false;
        }
        this.pan.x = NEXT_X;
        this.pan.y = NEXT_Y;
        this.offset[0] = NEXT_X;
        this.offset[1] = (this.aspect < 0.8 ? 1.1 : -0.3) + NEXT_Y;
        // Cached terrain decoration follows the same camera delta without being
        // regenerated on every pointer move.
        for (const POINTS of [this.terrainDots, this.terrainLeaves]) {
            for (const POINT of POINTS) {
                POINT.x += DX * this.scale;
                POINT.y -= DY * this.scale;
            }
        }
        return true;
    }
    panByScreen(dx, dy) {
        return this.setPan(
            this.pan.x + (dx * this.pixelRatio) / this.scale,
            this.pan.y - (dy * this.pixelRatio) / this.scale,
        );
    }
    resetPan() {
        return this.setPan(0, 0);
    }
    ellipse(x, y, rx, ry, color2, angle = 0) {
        const C = this.ctx;
        C.fillStyle = color2;
        C.beginPath();
        C.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), angle, 0, Math.PI * 2);
        C.fill();
    }
    groundEllipse(x, y, rx, ry, color2, z = 0) {
        const P = this.project(x, y, z);
        this.ellipse(P.x, P.y, rx * this.scale, ry * this.scale * 0.62, color2);
    }
    strokeGroundEllipse(x, y, rx, ry, color2, width = 0.08) {
        const C = this.ctx,
            P = this.project(x, y);
        C.strokeStyle = color2;
        C.lineWidth = width * this.scale;
        C.beginPath();
        C.ellipse(P.x, P.y, rx * this.scale, ry * this.scale * 0.62, 0, 0, Math.PI * 2);
        C.stroke();
    }
    drawBossTelegraph(area) {
        if (area.kind === 'summon') {
            // A summon has no direct damage. Keep its arrival cue separate from red
            // attack danger, rather than painting a fictitious damaging wedge.
            const REACH = BOSS_PATTERN_CONFIG[area.patternId].landingRadius,
                X = area.x + Math.cos(area.angle) * REACH,
                Y = area.y + Math.sin(area.angle) * REACH;
            this.strokeGroundEllipse(X, Y, 0.65, 0.48, '#bd915d', 0.085);
            this.ring(X, Y, 0.28, '#f1d391', 0.045, 0, Math.PI * 1.8);
            return;
        }
        const C = this.ctx,
            POINTS = this.dangerContour,
            COUNT = bossDangerContour(area, POINTS);
        if (!COUNT) {
            return;
        }
        const S = this.scale,
            OX = this.offset[0] + this.view[0],
            OY = this.view[1] - this.offset[1],
            ALPHA = C.globalAlpha;
        C.beginPath();
        for (let i = 0; i < COUNT; i++) {
            const X = (POINTS[i * 2] + OX) * S,
                Y = (OY - WORLD_DEPTH_PROJECTION * POINTS[i * 2 + 1]) * S;
            if (i === 0) {
                C.moveTo(X, Y);
            } else {
                C.lineTo(X, Y);
            }
        }
        C.closePath();
        const FLASH = area.phase === 'recover',
            FADE = FLASH ? Math.max(0, 1 - area.elapsed / 0.14) : 1,
            PROGRESS = clamp(area.progress, 0, 1);
        C.fillStyle = '#e63744';
        C.globalAlpha = ALPHA * (FLASH ? 0.38 * FADE : area.active ? 0.25 : 0.08 + 0.18 * PROGRESS * PROGRESS);
        C.fill();
        C.strokeStyle = FLASH ? '#ff7377' : area.locked || area.active ? '#e43d49' : '#c93240';
        C.lineWidth = Math.max(1.6 * this.pixelRatio, (FLASH ? 0.13 : 0.095) * S);
        C.globalAlpha = ALPHA * (FLASH ? FADE : 0.9);
        C.lineJoin = 'round';
        C.stroke();
        C.globalAlpha = ALPHA;
    }
    drawLocalScatter(scatter) {
        if (!scatter?.active || !Number.isFinite(scatter.x) || !Number.isFinite(scatter.y) || !(scatter.radius > 0)) {
            return;
        }
        const C = this.ctx,
            S = this.scale,
            R = scatter.radius,
            P = this.project(scatter.x, scatter.y),
            RY = R * S * WORLD_DEPTH_PROJECTION;
        const SEGMENTS = Math.max(8, Math.min(24, Math.round((Math.PI * 2 * R * S) / (10 * this.pixelRatio)))),
            STEP = (Math.PI * 2) / SEGMENTS;
        C.beginPath();
        // Explicit separated arc segments keep the circle hollow and avoid any
        // dash state leaking into enemy outlines or later character drawing.
        for (let i = 0; i < SEGMENTS; i++) {
            for (let j = 0; j <= 4; j++) {
                const A = i * STEP + (j / 4) * STEP * 0.58,
                    X = P.x + Math.cos(A) * R * S,
                    Y = P.y - Math.sin(A) * RY;
                if (j === 0) {
                    C.moveTo(X, Y);
                } else {
                    C.lineTo(X, Y);
                }
            }
        }
        C.strokeStyle = '#145967';
        C.lineWidth = 3.4 * this.pixelRatio;
        C.lineCap = 'round';
        C.stroke();
        C.strokeStyle = '#50e3ed';
        C.lineWidth = 1.7 * this.pixelRatio;
        C.stroke();
        C.beginPath();
        const ARROW = Math.max(0.25, (3.5 * this.pixelRatio) / S),
            TIP = R + ARROW * 0.9;
        for (let i = 0; i < 4; i++) {
            const A = Math.PI / 4 + (i * Math.PI) / 2,
                DX = Math.cos(A),
                DY = Math.sin(A),
                TX = P.x + DX * TIP * S,
                TY = P.y - DY * TIP * S * WORLD_DEPTH_PROJECTION;
            C.moveTo(P.x + DX * (R - ARROW * 0.55) * S, P.y - DY * (R - ARROW * 0.55) * S * WORLD_DEPTH_PROJECTION);
            C.lineTo(TX, TY);
            C.moveTo(
                P.x + (DX * (TIP - ARROW) - DY * ARROW * 0.55) * S,
                P.y - (DY * (TIP - ARROW) + DX * ARROW * 0.55) * S * WORLD_DEPTH_PROJECTION,
            );
            C.lineTo(TX, TY);
            C.lineTo(
                P.x + (DX * (TIP - ARROW) + DY * ARROW * 0.55) * S,
                P.y - (DY * (TIP - ARROW) - DX * ARROW * 0.55) * S * WORLD_DEPTH_PROJECTION,
            );
        }
        const CENTER = 2.8 * this.pixelRatio;
        C.moveTo(P.x - CENTER, P.y);
        C.lineTo(P.x + CENTER, P.y);
        C.moveTo(P.x, P.y - CENTER);
        C.lineTo(P.x, P.y + CENTER);
        const HANDLE = this.project(
                Number.isFinite(scatter.handleX) ? scatter.handleX : scatter.x,
                Number.isFinite(scatter.handleY) ? scatter.handleY : scatter.y,
            ),
            HR = 3.5 * this.pixelRatio;
        C.moveTo(HANDLE.x + HR, HANDLE.y);
        C.ellipse(HANDLE.x, HANDLE.y, HR, HR, 0, 0, Math.PI * 2);
        C.strokeStyle = '#145967';
        C.lineWidth = 3.5 * this.pixelRatio;
        C.stroke();
        C.strokeStyle = '#7df5fb';
        C.lineWidth = 1.7 * this.pixelRatio;
        C.stroke();
    }
    ring(x, y, r, color2, width = 0.045, start = 0, end = Math.PI * 2) {
        const C = this.ctx,
            P = this.project(x, y);
        C.strokeStyle = color2;
        C.lineWidth = width * this.scale;
        C.beginPath();
        C.ellipse(P.x, P.y, r * this.scale, r * this.scale * 0.62, 0, -end, -start);
        C.stroke();
    }
    line(a, b, width, color2) {
        const C = this.ctx;
        C.strokeStyle = color2;
        C.lineWidth = width * this.scale;
        C.lineCap = 'round';
        C.beginPath();
        C.moveTo(a.x, a.y);
        C.lineTo(b.x, b.y);
        C.stroke();
    }
    pixelLine(a, b, width, color2) {
        const C = this.ctx;
        C.strokeStyle = color2;
        C.lineWidth = width;
        C.lineCap = 'round';
        C.beginPath();
        C.moveTo(a.x, a.y);
        C.lineTo(b.x, b.y);
        C.stroke();
    }
    addUnitRing(radius, color, width, progress) {
        const EFFECT = this.unitRingPool[this.unitRings.length];
        EFFECT.radius = radius;
        EFFECT.color = color;
        EFFECT.width = width;
        EFFECT.progress = progress;
        this.unitRings.push(EFFECT);
    }
    unitRingEffects(u, world) {
        const EFFECTS = this.unitRings,
            A = u.ability,
            S_LOCAL = ATTACK_TYPES[u.species];
        EFFECTS.length = 0;
        if (u.buffed && u.hp > 0) {
            this.addUnitRing(u.radius + 0.16, '#eacb72', 0.055, 1);
        }
        if (A.phase === 'windup' && S_LOCAL) {
            this.addUnitRing(
                u.radius + 0.1,
                ATTACK_ACCENTS[u.species] || ATTACK_ACCENTS[0],
                0.065,
                Math.min(1, A.elapsed / S_LOCAL.timing.windup),
            );
        }
        const BREEDING = farmBreedingCooldown(u, world, CONFIG.farm.breeding.cooldownSeconds, this.breedingIndicator);
        if (BREEDING && BREEDING.progress > 0) {
            this.addUnitRing(u.radius + 0.085, '#8fac68', 0.035, BREEDING.progress);
        }
        return EFFECTS;
    }
    drawUnitRingLayer(u, effects, side) {
        for (const EFFECT of effects) {
            const SWEEP = Math.PI * 2 * Math.max(0, Math.min(1, Number(EFFECT.progress) || 0));
            if (side === 'rear' && SWEEP > 0) {
                this.ring(u.x, u.y, EFFECT.radius, EFFECT.color, EFFECT.width, 0, Math.min(Math.PI, SWEEP));
            } else if (side === 'front' && SWEEP > Math.PI) {
                this.ring(u.x, u.y, EFFECT.radius, EFFECT.color, EFFECT.width, Math.PI, SWEEP);
            }
        }
    }
    drawSleepIndicator(rest, pose) {
        if (!rest || rest.phase === 'defeat') {
            return;
        }
        const C = this.ctx,
            D = this.pixelRatio,
            P = pose.p,
            R = pose.r;
        // Short lavender elapsed bar BELOW the body. No HP colors, grade outline,
        // overhead numeric badge, or countdown for Raid's non-advancing recovery.
        if (rest.progress >= 0) {
            const W = Math.max(18 * D, Math.min(30 * D, R * 1.6)),
                H = 3 * D,
                X = P.x - W / 2,
                Y = P.y + R * 0.35 + 3 * D;
            C.fillStyle = '#494257';
            C.beginPath();
            C.roundRect(X - D, Y - D, W + 2 * D, H + 2 * D, 2.5 * D);
            C.fill();
            C.fillStyle = '#c2b2e8';
            C.beginPath();
            C.roundRect(X, Y, W * rest.progress, H, 1.5 * D);
            C.fill();
        }
        if (rest.phase === 'sleep') {
            const SIZE = 2.4 * D,
                X = P.x + R * 0.9,
                Y = P.y - R * 0.9;
            C.strokeStyle = '#494257';
            C.lineWidth = 2.2 * D;
            C.lineCap = 'round';
            C.beginPath();
            C.moveTo(X, Y - SIZE);
            C.lineTo(X + SIZE * 1.5, Y - SIZE);
            C.lineTo(X, Y + SIZE);
            C.lineTo(X + SIZE * 1.5, Y + SIZE);
            C.stroke();
            C.strokeStyle = '#ded3f5';
            C.lineWidth = D;
            C.stroke();
        }
    }
    drawVectorUnit(u, sim, p, r, rest) {
        const RECORD = this.vectorAssets.get(u.species);
        if (!RECORD) {
            throw new Error('Missing required troop vector asset for species ' + u.species);
        }
        let player = this.vectorPlayers.get(u.id);
        if (player && this.vectorPlayerAssets.get(player) !== RECORD) {
            player.dispose();
            this.vectorPlayers.delete(u.id);
            player = null;
        }
        const METADATA = RECORD.compiled.metadata,
            MOTION_NAME = unitMotion(u, sim, rest),
            CLIP = METADATA.clips[MOTION_NAME] || METADATA.clips.idle;
        const CLIP_START_AT_MS = rest ? 0 : this.displayTimeMs - motionElapsedMs(u, MOTION_NAME, CLIP);
        if (!player) {
            player = RECORD.asset.createPlayer({
                clip: MOTION_NAME,
                startedAtMs: CLIP_START_AT_MS,
            });
            this.vectorPlayers.set(u.id, player);
            this.vectorPlayerAssets.set(player, RECORD);
        } else if (player.currentClip !== MOTION_NAME) {
            player.play(MOTION_NAME, CLIP_START_AT_MS);
        }
        const EXPRESSION = unitExpression(u, sim, this.joyEffects, rest);
        if (EXPRESSION !== player.currentExpression) {
            player.setExpression(EXPRESSION);
        }
        player.seek(rest ? rest.elapsed * 1000 : this.displayTimeMs);
        const [, , WIDTH, HEIGHT] = RECORD.compiled.viewBox,
            SCALE = (2 * r) / Math.max(WIDTH, HEIGHT),
            CENTER_Y = p.y - r * 0.79;
        const MATRIX = [SCALE, 0, 0, SCALE, p.x - WIDTH * SCALE * 0.5, CENTER_Y - HEIGHT * SCALE * 0.5];
        // Native vector players submit directly to MeshRenderer, so flush earlier 2D paint first.
        this.ctx.vector.flush();
        const OUTLINE = TIER_OUTLINE_COLORS[u.tier - 1];
        if (OUTLINE) {
            // One enlarged silhouette pass, never eight full asset redraws.
            const BORDER = 1.5 * this.pixelRatio,
                FACTOR = 1 + BORDER / Math.max(r, 1);
            const OUTLINE_MATRIX = [
                SCALE * FACTOR,
                0,
                0,
                SCALE * FACTOR,
                p.x - WIDTH * SCALE * FACTOR * 0.5,
                CENTER_Y - HEIGHT * SCALE * FACTOR * 0.5,
            ];
            // Faces are interior details, never part of the enlarged silhouette.
            for (const PART of RECORD.faceParts) {
                player.setPartVisible(PART, false);
            }
            player.draw({
                projection: this.ctx.vector.projection,
                matrix: OUTLINE_MATRIX,
                color: OUTLINE,
                forceColor: true,
            });
            player.setExpression(EXPRESSION);
        }
        player.draw({
            projection: this.ctx.vector.projection,
            matrix: MATRIX,
        });
        return true;
    }
    drawUnit(u, sim, rest) {
        const DEAD = u.hp <= 0,
            WALK = DEAD ? 0 : Math.min(1, Math.hypot(u.vx, u.vy)),
            BOB = u.z === 0 ? Math.abs(Math.sin(sim.time * 9 + u.seed)) * 0.1 * WALK : 0,
            P = this.project(u.x, u.y, u.z + BOB);
        const R = Math.max(u.size * this.scale * 0.78, (sim.scene === 'raid' ? 4.5 : 11) * this.pixelRatio);
        this.drawVectorUnit(u, sim, P, R, rest);
        return {
            p: P,
            r: R,
        };
    }
    drawFarmUnitActor(u, sim) {
        const EFFECTS = this.unitRingEffects(u, sim);
        this.drawUnitRingLayer(u, EFFECTS, 'rear');
        const REST = unitRestPresentation(u, sim, CONFIG.unit.corpseRecoverySeconds, this.restIndicator);
        const POSE = this.drawUnit(u, sim, REST);
        this.drawUnitRingLayer(u, EFFECTS, 'front');
        this.drawSleepIndicator(REST, POSE);
    }
    bossPose(world) {
        const B = world.boss,
            K =
                B.patternId === 'summon.mouth-t1'
                    ? {
                          x: 0,
                          y: 0,
                          squash: 0,
                      }
                    : this.feel?.boss(this.displayTimeMs) || {
                          x: 0,
                          y: 0,
                          squash: 0,
                      },
            GROUND = this.project(B.x + K.x, B.y + K.y, 0),
            P = this.project(B.x + K.x, B.y + K.y, B.z || 0),
            R = this.scale * B.radius * 1.16;
        return {
            b: B,
            p: P,
            ground: GROUND,
            r: R,
            k: K,
        };
    }
    bossMotion(b, world) {
        const EVENT = world.farmBossEvent;
        if (EVENT?.phase === 'celebrating' && EVENT.outcome === 'defeat') {
            return 'idle';
        }
        if (b.hp <= 0) {
            return 'death';
        }
        if (b.flash > 0.09 && b.patternPhase === 'idle') {
            return 'hit';
        }
        if (b.patternPhase === 'windup') {
            return 'windup';
        }
        if (b.patternPhase === 'active') {
            if (b.patternId === 'attack.sweep-360' || b.patternId === 'attack.fan-sweep') {
                return 'sweep';
            }
            if (b.patternId === 'attack.charge') {
                return 'walk';
            }
            if (b.patternId === 'attack.leap-slam') {
                return b.z > 0.1 ? 'airborne' : 'strike';
            }
            if (b.patternId === 'summon.mouth-t1') {
                return 'fire';
            }
            return 'strike';
        }
        if (b.patternPhase === 'recover') {
            if (b.patternId === 'attack.sweep-360' && (b.patternPhaseElapsed || 0) < 0.14) {
                return 'sweep';
            }
            if (
                ['attack.front-slam', 'attack.leap-slam'].includes(b.patternId) &&
                (b.patternPhaseElapsed || 0) < 0.18
            ) {
                return 'strike';
            }
            if (b.patternId === 'attack.fan-sweep' && (b.patternPhaseElapsed || 0) < 0.12) {
                return 'sweep';
            }
            return 'recover';
        }
        return b.phase === 'chase' ? 'walk' : 'idle';
    }
    drawBoss(world) {
        const { b: B, p: P, k: K } = this.bossPose(world),
            EVENT = world.farmBossEvent,
            SPECIES = B.species;
        const RECORD = this.bossAssets.get(SPECIES === 3 ? 'chestnut' : `species-${SPECIES}`);
        if (!RECORD) {
            throw new Error('Missing required boss vector asset for species ' + SPECIES);
        }
        let instance = this.bossPlayers.get(SPECIES);
        if (!instance) {
            const PLAYER = RECORD.asset.createPlayer({
                clip: 'idle',
                startedAtMs: this.displayTimeMs,
            });
            instance = {
                record: RECORD,
                player: PLAYER,
            };
            this.bossPlayers.set(SPECIES, instance);
        }
        const PLAYER = instance.player;
        this.bossPlayer = PLAYER;
        this.bossPlayerAsset = RECORD;
        const METADATA = RECORD.compiled.metadata,
            NAME = this.bossMotion(B, world),
            FALLBACK_CLIP =
                NAME === 'airborne'
                    ? METADATA.clips.strike
                        ? 'strike'
                        : METADATA.clips.fire
                          ? 'fire'
                          : 'idle'
                    : ['strike', 'sweep', 'fire'].includes(NAME) && !METADATA.clips[NAME]
                      ? METADATA.clips.fire
                          ? 'fire'
                          : 'idle'
                      : 'idle',
            CLIP_NAME = METADATA.clips[NAME] ? NAME : FALLBACK_CLIP,
            CLIP = METADATA.clips[CLIP_NAME];
        const TIMED = ['windup', 'strike', 'sweep', 'recover', 'hit', 'death', 'fire', 'airborne'].includes(NAME),
            ELAPSED = B.patternId ? B.patternPhaseElapsed : B.clock;
        const CLIP_START_AT_MS = TIMED
            ? this.displayTimeMs - Math.min(CLIP.durationMs, Math.max(0, ELAPSED || 0) * 1000)
            : NAME === 'walk'
              ? this.displayTimeMs - Math.max(0, B.travel || 0) * 110
              : this.displayTimeMs - (((B.travel || 0) * 37) % CLIP.durationMs);
        const SUMMONING = B.patternId === 'summon.mouth-t1';
        if (SUMMONING) {
            sampleBossSummon(PLAYER, METADATA, B);
        } else if (instance.summoning || PLAYER.currentClip !== CLIP_NAME) {
            PLAYER.transitionTo(CLIP_NAME, CLIP_START_AT_MS, 70);
        }
        instance.summoning = SUMMONING;
        const SUMMON_OPEN =
            B.patternId === 'summon.mouth-t1' &&
            (B.patternPhase === 'active' ||
                (B.patternPhase === 'windup' &&
                    B.patternPhaseElapsed >= BOSS_PATTERN_CONFIG['summon.mouth-t1'].windup * 0.5));
        const EXPRESSION =
            B.hp <= 0
                ? 'dead'
                : EVENT?.phase === 'celebrating' && EVENT.outcome === 'defeat'
                  ? 'happy'
                  : SUMMON_OPEN
                    ? 'attack'
                    : B.patternPhase === 'windup'
                      ? 'focused'
                      : B.patternPhase === 'active'
                        ? 'attack'
                        : B.flash > 0.07
                          ? 'hurt'
                          : 'neutral';
        if (!METADATA.expressions?.[EXPRESSION] && !METADATA.expressions?.neutral) {
            throw new Error('Boss asset is missing a supported expression');
        }
        const SAFE_EXPRESSION = METADATA.expressions?.[EXPRESSION] ? EXPRESSION : 'neutral';
        if (PLAYER.currentExpression !== SAFE_EXPRESSION) {
            PLAYER.setExpression(SAFE_EXPRESSION);
        }
        if (B.patternId !== 'summon.mouth-t1') {
            PLAYER.seek(this.displayTimeMs);
        }
        const S_LOCAL = this.scale * bossVectorScale(B.radius),
            GROUND = RECORD.anchors.ground,
            MATRIX = [S_LOCAL, 0, 0, S_LOCAL, P.x - GROUND.x * S_LOCAL, P.y - GROUND.y * S_LOCAL];
        const DEFEAT_BOUNCE =
            EVENT?.phase === 'celebrating' && EVENT.outcome === 'defeat'
                ? Math.max(0, Math.sin(((EVENT.elapsed * Math.PI * 2) / CONFIG.farm.bossEvent.celebrationSeconds) * 2))
                : 0;
        const FADE = EVENT?.phase === 'fading' ? clamp(1 - EVENT.elapsed / CONFIG.farm.bossEvent.fadeSeconds, 0, 1) : 1;
        const PARTS = RECORD.parts,
            POSE = bossAttackPose(B, PARTS);
        PLAYER.setBasePose('body', {
            x: 0,
            y: POSE.body.y - 18 * DEFEAT_BOUNCE,
            rotation: POSE.body.rotation,
            scaleX: POSE.body.scaleX * (1 + (K.squash || 0)) * (1 - 0.04 * DEFEAT_BOUNCE),
            scaleY: POSE.body.scaleY * (1 - (K.squash || 0)) * (1 + 0.06 * DEFEAT_BOUNCE),
            opacity: FADE,
        });
        for (const [PART, ROTATION] of Object.entries(POSE.arms)) {
            if (PARTS.has(PART)) {
                PLAYER.setBasePose(PART, {
                    rotation: ROTATION,
                });
            }
        }
        for (const [PART, PART_POSE] of Object.entries(POSE.extras)) {
            if (PARTS.has(PART)) {
                PLAYER.setBasePose(PART, PART_POSE);
            }
        }
        const MOUTH_SOCKET = PLAYER.getSocket('mouth'),
            MOUTH_SCREEN = {
                x: MOUTH_SOCKET.x * S_LOCAL + MATRIX[4],
                y: MOUTH_SOCKET.y * S_LOCAL + MATRIX[5],
            };
        this.ctx.vector.flush();
        PLAYER.draw({
            projection: this.ctx.vector.projection,
            matrix: MATRIX,
        });
        if (B.patternId === 'summon.mouth-t1' && B.patternReleased > 0 && POSE.releasePulse > 0 && MOUTH_SCREEN) {
            this.ctx.flush();
            const MOUTH = MOUTH_SCREEN,
                PULSE = 0.55 + 0.45 * POSE.releasePulse,
                TARGET = Math.atan2(-0.62 * Math.sin(B.patternAim), Math.cos(B.patternAim));
            this.ellipse(
                MOUTH.x,
                MOUTH.y,
                this.scale * 0.18 * PULSE,
                this.scale * 0.12 * PULSE,
                'rgba(255,210,113,.72)',
            );
            this.ellipse(
                MOUTH.x + Math.cos(TARGET) * this.scale * 0.16,
                MOUTH.y + Math.sin(TARGET) * this.scale * 0.1,
                this.scale * 0.065,
                this.scale * 0.08,
                '#fff1ad',
            );
        }
    }
    terrain(sim2) {
        const S = this.scale,
            RAID = sim2.scene === 'raid',
            { radiusX: RX, radiusY: RY } = CONFIG[sim2.scene].arena;
        this.groundEllipse(0, -0.2, RX + 1.3, RY + 1.1, '#bcc7a6');
        this.groundEllipse(0, 0, RX + 1.2, RY + 1.1, sim2.scene === 'farm' ? '#d1d8b8' : '#cecfb3');
        this.groundEllipse(0, 0.15, RX + 0.3, RY + 0.3, sim2.scene === 'farm' ? '#d9dfc2' : '#d7d8bf');
        for (const P of this.terrainDots) {
            this.ellipse(P.x, P.y, S * 0.026, S * 0.02, '#a7b58b80');
        }
        for (const P of this.terrainLeaves) {
            this.ellipse(P.x, P.y, 0.25 * S, 0.11 * S, '#94a577', P.angle);
            this.ellipse(P.x + 0.1 * S, P.y - 0.09 * S, 0.19 * S, 0.075 * S, '#a8b78a', P.angle + 0.7);
        }
        if (RAID) {
            this.strokeGroundEllipse(
                0,
                0,
                CONFIG.raid.arena.radiusX - 0.5,
                CONFIG.raid.arena.radiusY - 0.5,
                '#728e61a8',
                0.075,
            );
        }
        const EVENT = sim2.farmBossEvent,
            AREA =
                RAID || (sim2.scene === 'farm' && EVENT?.phase === 'fighting')
                    ? renderedBossAttackArea(sim2.boss, sim2.scene, this.telegraphBoss, this.dangerArea)
                    : null;
        this.bossTelegraph = AREA;
        if (AREA) {
            this.drawBossTelegraph(AREA);
        }
    }
    addActor(kind, source, depth, id, vector = false) {
        const INDEX = this.actors.length,
            ACTOR = this.actorPool[INDEX] || (this.actorPool[INDEX] = {});
        ACTOR.kind = kind;
        ACTOR.source = source;
        ACTOR.depth = depth;
        ACTOR.id = id;
        ACTOR.vector = vector;
        this.actors.push(ACTOR);
    }
    drawFood(f) {
        this.groundEllipse(f.x, f.y, 0.1, 0.07, '#55452433');
        if (f.phase === 'flight') {
            const TAIL = this.project(f.x - f.vx * 0.045, f.y - f.vy * 0.045, Math.max(0, f.z - f.vz * 0.045) + 0.1),
                HEAD = this.project(f.x, f.y, f.z + 0.1);
            this.line(TAIL, HEAD, 0.055, '#e6bd7480');
        }
        const P = this.project(f.x, f.y, f.z + 0.1);
        this.ellipse(P.x, P.y, this.scale * 0.09, this.scale * 0.12, '#c78a43', 0.4);
        this.ellipse(
            P.x - 0.025 * this.scale,
            P.y - 0.08 * this.scale,
            this.scale * 0.036,
            this.scale * 0.05,
            '#e7bf72',
        );
    }
    drawProjectile(f) {
        const P = this.project(f.x, f.y, f.z),
            TAIL = Ballistics.sample(f.path, Math.max(0, (f.elapsed - 0.04) / f.path.duration));
        this.groundEllipse(f.x, f.y, 0.14, 0.1, '#55452433');
        if (f.isPopcorn && f.landed) {
            const FUSE = Math.max(0, Math.min(1, f.fuseRemaining || 0));
            this.groundEllipse(f.x, f.y, 0.16, 0.12, f.exploded ? '#d86c3b55' : '#c78a4366');
            if (!f.exploded && f.popcornConfig?.radius > 0) {
                this.ring(f.x, f.y, f.popcornConfig.radius, 'rgba(190,111,52,.18)', 0.035);
            }
            if (f.exploded) {
                const PROGRESS = Math.max(0, Math.min(1, (f.explosionLife || 0) / 0.5));
                this.ring(
                    f.x,
                    f.y,
                    (f.popcornConfig?.radius || 0.3) * (0.25 + 0.75 * PROGRESS),
                    `rgba(224,111,54,${0.68 * (1 - PROGRESS)})`,
                    0.12,
                );
            } else {
                this.ring(f.x, f.y, 0.2 + 0.2 * (1 - FUSE), `rgba(238,181,83,${0.45 + 0.4 * (1 - FUSE)})`, 0.045);
            }
            const KERNEL = this.project(f.x, f.y, 0.12);
            this.ellipse(
                KERNEL.x,
                KERNEL.y,
                this.scale * 0.13,
                this.scale * 0.08,
                f.exploded ? '#e37f42' : '#d4a347',
                0.2,
            );
            this.ellipse(
                KERNEL.x - this.scale * 0.035,
                KERNEL.y - this.scale * 0.02,
                this.scale * 0.045,
                this.scale * 0.03,
                '#ffe0a0',
            );
        } else if (f.projectileKind === 'chestnut-spike') {
            const ANGLE = Math.atan2(f.path.to.y - f.path.from.y, f.path.to.x - f.path.from.x),
                TIP = {
                    x: P.x + Math.cos(ANGLE) * this.scale * 0.22,
                    y: P.y - 0.62 * Math.sin(ANGLE) * this.scale * 0.22,
                };
            this.line(this.project(TAIL.x, TAIL.y, TAIL.z), P, 0.055, '#778f4c88');
            this.line(P, TIP, 0.105, '#79964e');
            this.ellipse(TIP.x, TIP.y, this.scale * 0.045, this.scale * 0.035, '#d5df9d', ANGLE);
        } else {
            this.line(this.project(TAIL.x, TAIL.y, TAIL.z), P, 0.07, '#ba964a80');
            this.ellipse(P.x, P.y, this.scale * 0.14, this.scale * 0.2, '#cfa957', 0.3);
            this.ellipse(
                P.x - this.scale * 0.03,
                P.y - this.scale * 0.05,
                this.scale * 0.05,
                this.scale * 0.08,
                '#fff0ae',
            );
        }
    }
    render(sim2, feel = null, now = performance.now()) {
        this.feel = feel;
        this.displayTimeMs = now;
        this.configure(sim2.scene);
        const C = this.ctx,
            JOY_EFFECTS = this.joyEffects;
        JOY_EFFECTS.length = 0;
        if (sim2.scene === 'farm') {
            for (const E of sim2.effects) {
                if (E.life < 0.85 && (E.kind === 'eat' || E.kind === 'birth' || E.kind === 'merge')) {
                    JOY_EFFECTS.push(E);
                }
            }
        }
        C.beginFrame({
            width: this.canvas.width,
            height: this.canvas.height,
            clearColor: [0.9, 0.92, 0.87, 1],
        });
        this.terrain(sim2);
        for (const U of sim2.units) {
            const A = clamp(0.22 / (1 + U.z * 0.3), 0.045, 0.22),
                SHADOW = (U.size * 0.66) / (1 + U.z * 0.65);
            this.groundEllipse(U.x, U.y, SHADOW, SHADOW * 0.62, `rgba(42,61,35,${A})`);
        }
        const FARM_BOSS_VISIBLE = sim2.scene === 'farm' && sim2.farmBossEvent?.phase !== 'idle';
        if (sim2.scene === 'raid' || FARM_BOSS_VISIBLE) {
            this.groundEllipse(sim2.boss.x, sim2.boss.y, sim2.boss.radius * 1.05, sim2.boss.radius * 0.75, '#38472c33');
        }
        const HIDDEN_MERGE_RESULT_ID =
            sim2.scene === 'farm' && sim2.mode === 'merge' && sim2.mergeTask?.phase === 'animation'
                ? sim2.mergeTask.resultId
                : 0;
        const ACTORS = this.actors;
        ACTORS.length = 0;
        for (const U of sim2.units) {
            if (U.id !== HIDDEN_MERGE_RESULT_ID) {
                this.addActor('unit', U, 0.785 * U.y - 0.62 * U.z, U.id, this.vectorAssets.has(U.species));
            }
        }
        if (sim2.scene === 'raid' || FARM_BOSS_VISIBLE) {
            this.addActor('boss', sim2.boss, 0.785 * sim2.boss.y - 0.62 * (sim2.boss.z || 0), 0, true);
        }
        if (sim2.scene === 'farm') {
            for (const F of sim2.food) {
                this.addActor('food', F, 0.785 * F.y - 0.62 * F.z, -1);
            }
        }
        if (sim2.scene === 'raid' || FARM_BOSS_VISIBLE) {
            for (const F of sim2.projectiles) {
                this.addActor('projectile', F, 0.785 * F.y - 0.62 * F.z, -F.id);
            }
        }
        // Preserve stable source order for equal depth/id and every vector flush boundary.
        ACTORS.sort(COMPARE_ACTORS);
        let vectorRun = false;
        for (const ACTOR of ACTORS) {
            if (ACTOR.vector && !vectorRun) {
                C.flush();
                vectorRun = true;
            } else if (!ACTOR.vector && vectorRun) {
                C.flush();
                vectorRun = false;
            }
            if (ACTOR.kind === 'unit') {
                this.drawFarmUnitActor(ACTOR.source, sim2);
            } else if (ACTOR.kind === 'boss') {
                this.drawBoss(sim2);
            } else if (ACTOR.kind === 'food') {
                this.drawFood(ACTOR.source);
            } else {
                this.drawProjectile(ACTOR.source);
            }
            ACTOR.source = null;
        }
        if (vectorRun) {
            C.flush();
        }
        const LIVE_UNIT_IDS = this.liveUnitIds;
        LIVE_UNIT_IDS.clear();
        for (const U of sim2.units) {
            LIVE_UNIT_IDS.add(U.id);
        }
        for (const [ID, PLAYER] of this.vectorPlayers) {
            if (!LIVE_UNIT_IDS.has(ID)) {
                PLAYER.dispose();
                this.vectorPlayers.delete(ID);
            }
        }
        feel?.draw(this, this.displayTimeMs);
        for (const E of sim2.effects) {
            const DELAY = Number.isFinite(E.delay) ? E.delay : 0,
                SPAN = Number.isFinite(E.span) ? E.span : 1;
            if (E.life < DELAY) {
                continue;
            }
            const Q = Number.isFinite(E.span) ? clamp((E.life - DELAY) / SPAN, 0, 1) : E.life;
            if (E.kind === 'feed') {
                this.ring(E.x, E.y, 0.15 + Q * 0.35, `rgba(166,121,59,${(1 - Q) * 0.6})`, 0.035);
            } else if (E.kind === 'food-land') {
                const T = Math.min(1, Q / 0.35);
                this.ring(E.x, E.y, 0.1 + T * 0.42, `rgba(194,145,62,${(1 - T) * 0.85})`, 0.055);
                for (let i = 0; i < 3 && T < 1; i++) {
                    const A = (i * Math.PI * 2) / 3,
                        P = this.project(
                            E.x + Math.cos(A) * T * 0.4,
                            E.y + Math.sin(A) * T * 0.4,
                            0.08 + Math.sin(T * Math.PI) * 0.2,
                        );
                    this.ellipse(P.x, P.y, this.scale * 0.045, this.scale * 0.035, `rgba(245,213,133,${1 - T})`);
                }
            } else if (E.kind === 'land' || E.kind === 'impact') {
                this.ring(E.x, E.y, 0.1 + Q * 0.8, `rgba(146,131,78,${(1 - Q) * 0.65})`);
            } else if (E.kind === 'landing-shockwave' || E.kind === 'walnut-shockwave') {
                const PROGRESS = clamp(Q / (E.duration || 0.55), 0, 1),
                    RADIUS = Math.max(0.08, E.radius) * (0.2 + 0.8 * PROGRESS);
                this.groundEllipse(E.x, E.y, RADIUS, RADIUS, `rgba(225,190,103,${0.12 * (1 - PROGRESS)})`);
                this.ring(
                    E.x,
                    E.y,
                    RADIUS,
                    `rgba(234,194,104,${0.82 * (1 - PROGRESS)})`,
                    0.12 * (1 - PROGRESS) + 0.025,
                );
                this.ring(E.x, E.y, Math.max(0.05, RADIUS - 0.12), `rgba(250,225,158,${0.55 * (1 - PROGRESS)})`, 0.045);
            } else if (E.kind === 'popcorn-explosion') {
                const PROGRESS = clamp(Q / (E.duration || 0.5), 0, 1),
                    RADIUS = Math.max(0.08, E.radius) * (0.18 + 0.82 * PROGRESS);
                this.groundEllipse(E.x, E.y, RADIUS, RADIUS, `rgba(235,143,63,${0.18 * (1 - PROGRESS)})`);
                this.ring(E.x, E.y, RADIUS, `rgba(233,115,49,${0.88 * (1 - PROGRESS)})`, 0.1 * (1 - PROGRESS) + 0.025);
                this.ring(E.x, E.y, Math.max(0.05, RADIUS * 0.72), `rgba(255,206,101,${0.7 * (1 - PROGRESS)})`, 0.055);
                for (let i = 0; i < 5; i++) {
                    const A = (i * Math.PI * 2) / 5 + PROGRESS * 0.8,
                        D = RADIUS * (0.55 + 0.3 * PROGRESS),
                        P = this.project(E.x + Math.cos(A) * D, E.y + Math.sin(A) * D, 0.08 * (1 - PROGRESS));
                    this.ellipse(
                        P.x,
                        P.y,
                        this.scale * 0.045 * (1 - PROGRESS),
                        this.scale * 0.03 * (1 - PROGRESS),
                        `rgba(255,216,119,${1 - PROGRESS})`,
                        A,
                    );
                }
            } else if (E.kind === 'popcorn-kernel-impact') {
                const PROGRESS = clamp(Q / (E.duration || 0.25), 0, 1);
                this.ring(
                    E.x,
                    E.y,
                    0.08 + PROGRESS * (E.radius || 0.1) * 1.6,
                    `rgba(225,150,72,${0.65 * (1 - PROGRESS)})`,
                    0.045,
                );
            } else if (E.kind === 'drop-dust') {
                const T = Math.min(1, Q / 0.28);
                this.ring(E.x, E.y, 0.12 + T * 0.4, `rgba(126,126,99,${(1 - T) * 0.42})`, 0.045);
                for (let i = 0; i < 4; i++) {
                    const A = (i * Math.PI) / 2 + T * 0.35,
                        P = this.project(
                            E.x + Math.cos(A) * T * 0.33,
                            E.y + Math.sin(A) * T * 0.22,
                            0.025 + Math.sin(T * Math.PI) * 0.1,
                        );
                    this.ellipse(P.x, P.y, this.scale * 0.045, this.scale * 0.03, `rgba(179,169,137,${1 - T})`);
                }
            } else if (E.kind === 'merge-material') {
                const T = clamp(Q, 0, 1),
                    X = E.x + (E.targetX - E.x) * T,
                    Y = E.y + (E.targetY - E.y) * T,
                    Z = (E.z || 0) + Math.sin(Math.PI * T) * 0.55;
                const START = this.project(E.x, E.y, E.z || 0),
                    POINT = this.project(X, Y, Z);
                this.line(START, POINT, 0.045, `rgba(88,185,187,${0.2 + 0.65 * (1 - T)})`);
                this.ellipse(
                    POINT.x,
                    POINT.y,
                    this.scale * 0.12 * (1 - 0.4 * T),
                    this.scale * 0.09 * (1 - 0.4 * T),
                    `rgba(88,185,187,${1 - 0.35 * T})`,
                    T * Math.PI,
                );
            } else if (E.kind === 'birth' || E.kind === 'merge') {
                const BIRTH = E.kind === 'birth',
                    COLOR = BIRTH ? '#df87a4' : '#58b9bb';
                this.ring(E.x, E.y, BIRTH ? 0.35 + Q * 1.5 : 1.8 * (1 - Q) + 0.15, COLOR, 0.07);
                for (let i = 0; i < 6; i++) {
                    const A = (i * Math.PI) / 3 + Q * (BIRTH ? 0.3 : 2),
                        SPREAD = BIRTH ? 0.4 + Q * 1.3 : 1.8 * (1 - Q);
                    const P = this.project(E.x + Math.cos(A) * SPREAD, E.y + Math.sin(A) * SPREAD, E.z + Q * 0.9);
                    const R = this.scale * 0.14;
                    C.fillStyle = COLOR;
                    if (BIRTH) {
                        this.ellipse(P.x - R * 0.44, P.y - R * 0.25, R * 0.6, R * 0.6, COLOR);
                        this.ellipse(P.x + R * 0.44, P.y - R * 0.25, R * 0.6, R * 0.6, COLOR);
                        C.beginPath();
                        C.moveTo(P.x - R, P.y);
                        C.lineTo(P.x, P.y + R);
                        C.lineTo(P.x + R, P.y);
                        C.closePath();
                        C.fill();
                    } else {
                        C.beginPath();
                        C.moveTo(P.x, P.y - R * 1.5);
                        C.lineTo(P.x + R, P.y);
                        C.lineTo(P.x, P.y + R * 1.5);
                        C.lineTo(P.x - R, P.y);
                        C.closePath();
                        C.fill();
                    }
                }
            } else if (E.kind === 'eat') {
                for (let i = 0; i < 3; i++) {
                    const A = (i * Math.PI * 2) / 3,
                        T = Math.min(1, Q / 0.45),
                        P = this.project(E.x + Math.cos(A) * T * 0.35, E.y + Math.sin(A) * T * 0.35, E.z + T * 0.6);
                    this.ellipse(
                        P.x,
                        P.y,
                        this.scale * 0.05,
                        this.scale * 0.075,
                        `rgba(255,235,160,${Math.max(0, 1 - Q / 0.45)})`,
                        A,
                    );
                }
            }
        }
        this.drawLocalScatter(sim2.localScatter);
        this.stats = C.endFrame();
    }
    dispose() {
        for (const SPECIES of this.vectorAssets.keys()) {
            unbindBossSocketAsset(SPECIES, this.bossAssets.get(SPECIES === 3 ? 'chestnut' : `species-${SPECIES}`));
        }
        for (const PLAYER of this.vectorPlayers.values()) {
            PLAYER.dispose();
        }
        this.vectorPlayers.clear();
        for (const RECORD of this.vectorAssets.values()) {
            RECORD.asset.dispose();
        }
        this.vectorAssets.clear();
        for (const { player: PLAYER } of this.bossPlayers.values()) {
            PLAYER.dispose();
        }
        this.bossPlayers.clear();
        this.bossPlayer = null;
        for (const RECORD of this.bossAssets?.values() || []) {
            RECORD.asset.dispose();
        }
        this.bossAssets?.clear();
        this.actors.length = 0;
        this.actorPool.length = 0;
        this.liveUnitIds.clear();
        this.joyEffects.length = 0;
        this.ctx.dispose();
        this.device.dispose();
    }
};
export { DIORAMA as Diorama };
