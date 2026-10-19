import { drawFormationEffects } from './formation-skill-presentations.js';
import { scenePresentation } from './farm-render-scenes.js';
import { FoodPresentation, ProjectilePresentation } from './farm-render-items.js';
import { UnitPresentation } from './farm-render-units.js';
import { UNIT_GRADES } from './unit-grades.js';
import { CornAttachmentPresentation } from './features/abilities/corn-attachment/presentation.js';
import { disposeEffectPresentations, drawEffect } from './farm-render-effects.js';
import {
    drawMergeBlackHoleBack,
    drawMergeBlackHoleFront,
    mergeMaterialPosition,
    mergeMaterialProgress,
} from './features/farm-modes/merge/presentation.js';
import {
    readVectorSockets,
    bossVectorScale,
    WORLD_HEIGHT_PROJECTION,
    WORLD_DEPTH_PROJECTION,
} from './vector-sockets.cjs';
import { bindBossSocketAsset, unbindBossSocketAsset } from './boss-vector-sockets.js';
import { BossPresentation, bossAttackPresentation } from './farm-render-boss.js';
import { CONFIG, clamp, bossAttackArea } from './farm-model.js';
import { facilityPosition } from './farm-work.js';
import { bossDangerContour } from './attack-telegraph.js';
const { bosses: BOSS_VECTOR_ASSETS, troops: TROOP_VECTOR_ASSETS } = globalThis.BudmoriVectorResources;
// Original SVG sources are compiled once by the startup loader before this module runs.
const {
    WebGLDevice: WEB_GL_DEVICE,
    VectorContext: VECTOR_CONTEXT,
    MeshRenderer: MESH_RENDERER,
} = globalThis.BloomGamekitRendering;
const { createVectorAsset: CREATE_VECTOR_ASSET } = globalThis.BloomGamekitVectorAssets;
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
// render.js
const COMPARE_ACTORS = (a, b) => b.depth - a.depth || a.id - b.id;
const EMPTY_UNIT_IDS = new Set();
const GRADE_RING_COLORS = UNIT_GRADES.map(({ outlineColor }) => outlineColor);
const GRADE_RING_WIDTHS = UNIT_GRADES.map(({ tier }) => 0.05 + 0.012 * (tier - 2));
const CORN_ATTACHMENT_PRESENTATION = new CornAttachmentPresentation();
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
        this.unitPresentation = new UnitPresentation(this);
        this.mergeHoleBackPresentation = { draw: (task) => drawMergeBlackHoleBack(this, task) };
        this.mergeHoleFrontPresentation = { draw: (task) => drawMergeBlackHoleFront(this, task) };
        this.mergeMaterialPresentation = { draw: (effect) => drawEffect(this, effect) };
        this.foodPresentation = new FoodPresentation(this);
        this.projectilePresentation = new ProjectilePresentation(this);
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
        this.bossSpeciesAssets = new Map();
        for (const SPECIES of this.vectorAssets.keys()) {
            const RECORD = this.bossAssets.get(SPECIES === 3 ? 'chestnut' : `species-${SPECIES}`);
            if (!RECORD) {
                throw new Error('Missing required boss vector asset for species ' + SPECIES);
            }
            RECORD.anchors = bindBossSocketAsset(SPECIES, RECORD);
            this.bossSpeciesAssets.set(SPECIES, RECORD);
        }
        this.bossPlayer = null;
        this.bossPlayerAsset = null;
        this.bossPlayers = new Map();
        this.assetsReady = false;
        this.prewarmStats = null;
        this.prewarmDurationMs = 0;
        this.bossTelegraph = null;
        this.bossPresentation = new BossPresentation(this);
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
        this.scenePresentation = scenePresentation(scene);
        const A = this.aspect;
        this.view = this.scenePresentation.cameraView(A);
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
        bossAttackPresentation(area).drawTelegraph(this, area);
    }
    drawBossDanger(area) {
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
    terrain(sim2) {
        const S = this.scale,
            PRESENTATION = this.scenePresentation,
            { radiusX: RX, radiusY: RY } = CONFIG[sim2.scene].arena;
        this.groundEllipse(0, -0.2, RX + 1.3, RY + 1.1, '#bcc7a6');
        this.groundEllipse(0, 0, RX + 1.2, RY + 1.1, PRESENTATION.groundColor);
        this.groundEllipse(0, 0.15, RX + 0.3, RY + 0.3, PRESENTATION.surfaceColor);
        for (const P of this.terrainDots) {
            this.ellipse(P.x, P.y, S * 0.026, S * 0.02, '#a7b58b80');
        }
        for (const P of this.terrainLeaves) {
            this.ellipse(P.x, P.y, 0.25 * S, 0.11 * S, '#94a577', P.angle);
            this.ellipse(P.x + 0.1 * S, P.y - 0.09 * S, 0.19 * S, 0.075 * S, '#a8b78a', P.angle + 0.7);
        }
        PRESENTATION.drawBoundary(this);
        if (sim2.scene === 'farm') {
            this.drawWorkShadows(sim2);
            this.drawFacilities(sim2);
        }
        const AREA = PRESENTATION.dangerVisible(sim2)
            ? renderedBossAttackArea(sim2.boss, sim2.scene, this.telegraphBoss, this.dangerArea)
            : null;
        this.bossTelegraph = AREA;
        if (AREA) {
            this.drawBossTelegraph(AREA);
        }
    }
    drawWorkShadows(sim2) {
        for (const PILE of sim2.piles || []) {
            this.groundEllipse(PILE.x, PILE.y, 1.5, 1.0, '#54452433');
        }
        for (const FACILITY of sim2.facilities || []) {
            const AT = facilityPosition(CONFIG, FACILITY.id);
            this.groundEllipse(AT.x, AT.y, 1.6, 1.1, '#54452433');
        }
    }
    // Facilities are scenery along the back edge of the field, drawn before the units so nothing hides behind them.
    drawFacilities(sim2) {
        const UPGRADING = sim2.buildSite?.facility;
        for (const FACILITY of sim2.facilities || []) {
            if (FACILITY.id !== UPGRADING) {
                this.drawFacility(FACILITY);
            }
        }
    }
    // Piles, construction sites and facilities stand among the units, so they are sorted with them by depth.
    addWorkActors(sim2) {
        const OBJECTS = this.workObjects || (this.workObjects = { draw: (source) => this.drawWorkObject(source) });
        for (const PILE of sim2.piles || []) {
            this.addActor(OBJECTS, { pile: PILE, sim: sim2 }, 0.785 * PILE.y, -2000000 - PILE.id);
        }
        const SEEN = this.pileHits;
        if (SEEN && SEEN.size > 12) {
            const LIVE = new Set((sim2.piles || []).map((pile) => pile.id));
            for (const ID of SEEN.keys()) {
                if (!LIVE.has(ID)) {
                    SEEN.delete(ID);
                }
            }
        }
    }
    drawWorkObject(source) {
        this.drawPile(source.pile, this.displayTimeMs);
    }
    drawPile(pile, now) {
        const PILE = pile;
        const SEEN = this.pileHits || (this.pileHits = new Map());
        {
            const S = this.scale * (0.95 + 0.5 * (PILE.food / PILE.maxFood));
            let seen = SEEN.get(PILE.id);
            if (!seen) {
                seen = { rev: PILE.hitRev, at: -1e9 };
                SEEN.set(PILE.id, seen);
            }
            if (seen.rev !== PILE.hitRev) {
                seen.rev = PILE.hitRev;
                seen.at = now;
            }
            // Each hit squashes and shakes the pile.
            const HIT = clamp(1 - (now - seen.at) / 220, 0, 1),
                BASE = this.project(PILE.x, PILE.y, 0),
                X = BASE.x + Math.sin(now * 0.07) * HIT * 0.05 * S,
                SQUASH = 1 + HIT * 0.14,
                LIFT = 1 - HIT * 0.16;
            if (PILE.kind === 'site') {
                this.drawSite(PILE, BASE, X, S * 1.7, SQUASH, LIFT);
                return;
            }
            if (PILE.kind === 'wood') {
                // Tree: a trunk that sways with each hit under a flat round crown.
                this.ellipse(X, BASE.y - 0.1 * S, 0.34 * S, 0.16 * S, '#7a5a34');
                this.ellipse(X, BASE.y - 0.5 * S * LIFT, 0.2 * S * SQUASH, 0.5 * S * LIFT, '#9a7442');
                this.ellipse(X + 0.06 * S, BASE.y - 0.5 * S * LIFT, 0.07 * S, 0.42 * S * LIFT, '#b48a52');
                this.ellipse(X, BASE.y - 1.05 * S * LIFT, 0.78 * S * SQUASH, 0.52 * S * LIFT, '#6f9b6f');
                this.ellipse(X - 0.3 * S, BASE.y - 0.92 * S * LIFT, 0.42 * S, 0.3 * S, '#7fab76');
                this.ellipse(X + 0.22 * S, BASE.y - 1.2 * S * LIFT, 0.4 * S, 0.28 * S, '#8fb98a');
            } else if (PILE.kind === 'stone') {
                this.ellipse(X, BASE.y - 0.28 * S * LIFT, 0.8 * S * SQUASH, 0.54 * S * LIFT, '#8f8d80');
                this.ellipse(X - 0.05 * S, BASE.y - 0.42 * S * LIFT, 0.64 * S * SQUASH, 0.42 * S * LIFT, '#a9a79a');
                this.ellipse(X - 0.2 * S, BASE.y - 0.54 * S * LIFT, 0.26 * S, 0.14 * S, '#c8c6b9');
                this.ellipse(X + 0.34 * S, BASE.y - 0.16 * S * LIFT, 0.2 * S, 0.1 * S, '#7c7a6e');
            } else {
                this.ellipse(X, BASE.y - 0.16 * S * LIFT, 0.86 * S * SQUASH, 0.4 * S * LIFT, '#c99f4a');
                this.ellipse(X, BASE.y - 0.34 * S * LIFT, 0.72 * S * SQUASH, 0.44 * S * LIFT, '#dcb85f');
                this.ellipse(X, BASE.y - 0.56 * S * LIFT, 0.5 * S * SQUASH, 0.34 * S * LIFT, '#e6c773');
                this.ellipse(X - 0.1 * S, BASE.y - 0.72 * S * LIFT, 0.2 * S, 0.12 * S, '#f1dc9a');
                this.ellipse(X, BASE.y - 0.4 * S * LIFT, 0.74 * S * SQUASH, 0.08 * S, '#a9793b');
                for (let index = -2; index <= 2; index++) {
                    this.ellipse(
                        X + index * 0.15 * S,
                        BASE.y - 0.24 * S * LIFT,
                        0.025 * S,
                        0.1 * S,
                        '#b98e45',
                        index * 0.25,
                    );
                }
            }
            // Five slots in front of the pile: one fills per hit, all five fill when a grain flies out.
            for (let index = 0; index < 5; index++) {
                const SLOT_X = BASE.x + (index - 2) * 0.27 * S,
                    SLOT_Y = BASE.y + 0.14 * S;
                this.ellipse(SLOT_X, SLOT_Y, 0.115 * S, 0.1 * S, '#6b522a99');
                this.ellipse(SLOT_X, SLOT_Y, 0.085 * S, 0.072 * S, index < PILE.stack ? '#f6d36b' : '#efe3bf');
            }
        }
    }
    // A construction site: a timber frame that fills in with each hit, and a progress bar above it.
    drawSite(site, base, x, s, squash, lift) {
        const RATIO = clamp(site.done / site.need, 0, 1);
        this.ellipse(x, base.y - 0.1 * s, 0.9 * s * squash, 0.3 * s, '#a58a5a');
        this.ellipse(x - 0.55 * s, base.y - 0.5 * s * lift, 0.07 * s, 0.5 * s * lift, '#7a5a34');
        this.ellipse(x + 0.55 * s, base.y - 0.5 * s * lift, 0.07 * s, 0.5 * s * lift, '#7a5a34');
        this.ellipse(x, base.y - 0.98 * s * lift, 0.66 * s, 0.07 * s, '#7a5a34');
        if (RATIO > 0.34) {
            this.ellipse(x, base.y - 0.45 * s * lift, 0.5 * s * squash, 0.3 * s * lift, '#c9a96a');
        }
        if (RATIO > 0.67) {
            this.ellipse(x, base.y - 0.92 * s * lift, 0.7 * s * squash, 0.3 * s * lift, '#b9774a');
        }
        const BAR_Y = base.y - 1.4 * s;
        this.ellipse(x, BAR_Y, 0.8 * s, 0.1 * s, '#4a463699');
        this.ellipse(x - 0.78 * s * (1 - RATIO), BAR_Y, Math.max(0.01, 0.76 * s * RATIO), 0.075 * s, '#f6d36b');
    }
    drawFacility(facility) {
        const FACILITY = facility;
        {
            const AT = facilityPosition(CONFIG, FACILITY.id),
                BASE = this.project(AT.x, AT.y, 0),
                S = this.scale * (1.9 + 0.12 * FACILITY.level),
                X = BASE.x;
            if (FACILITY.id === 'windmill') {
                const SPIN = (this.displayTimeMs || 0) * 0.002;
                this.ellipse(X, BASE.y - 0.4 * S, 0.5 * S, 0.5 * S, '#e8dcc0');
                this.ellipse(X, BASE.y - 0.95 * S, 0.5 * S, 0.22 * S, '#b9774a');
                for (let blade = 0; blade < 4; blade++) {
                    const ANGLE = SPIN + (blade * Math.PI) / 2;
                    this.ellipse(
                        X + Math.cos(ANGLE) * 0.5 * S,
                        BASE.y - 0.75 * S + Math.sin(ANGLE) * 0.5 * S,
                        0.4 * S,
                        0.07 * S,
                        '#f6f0e0',
                        ANGLE,
                    );
                }
            } else if (FACILITY.id === 'granary') {
                this.ellipse(X, BASE.y - 0.35 * S, 0.8 * S, 0.45 * S, '#c9a96a');
                this.ellipse(X, BASE.y - 0.85 * S, 0.9 * S, 0.3 * S, '#b9774a');
                this.ellipse(X, BASE.y - 0.3 * S, 0.2 * S, 0.28 * S, '#7a5a34');
            } else {
                this.ellipse(X - 0.5 * S, BASE.y - 0.5 * S, 0.07 * S, 0.5 * S, '#7a5a34');
                this.ellipse(X + 0.5 * S, BASE.y - 0.5 * S, 0.07 * S, 0.5 * S, '#7a5a34');
                this.ellipse(X, BASE.y - 0.8 * S, 0.62 * S, 0.07 * S, '#9a7442');
                this.ellipse(X - 0.2 * S, BASE.y - 0.6 * S, 0.06 * S, 0.22 * S, '#8f8d80', 0.4);
                this.ellipse(X + 0.2 * S, BASE.y - 0.6 * S, 0.06 * S, 0.22 * S, '#7fa77a', -0.4);
            }
            for (let pip = 0; pip < FACILITY.level; pip++) {
                this.ellipse(
                    X + (pip - (FACILITY.level - 1) / 2) * 0.22 * S,
                    BASE.y + 0.18 * S,
                    0.07 * S,
                    0.07 * S,
                    '#f6d36b',
                );
            }
        }
    }
    addActor(presentation, source, depth, id, vector = false) {
        const INDEX = this.actors.length,
            ACTOR = this.actorPool[INDEX] || (this.actorPool[INDEX] = {});
        ACTOR.presentation = presentation;
        ACTOR.source = source;
        ACTOR.depth = depth;
        ACTOR.id = id;
        ACTOR.vector = vector;
        this.actors.push(ACTOR);
    }
    render(sim2, feel = null, now = performance.now()) {
        this.feel = feel;
        this.displayTimeMs = now;
        this.configure(sim2.scene);
        const C = this.ctx,
            PRESENTATION = this.scenePresentation;
        PRESENTATION.collectJoy(sim2, this.joyEffects);
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
            // Grade is a ground ring batched with the shadows, so each unit needs one native vector draw.
            if (U.tier > 1 && !U.isFormationClone) {
                this.ring(U.x, U.y, SHADOW * 1.12, GRADE_RING_COLORS[U.tier - 1], GRADE_RING_WIDTHS[U.tier - 1]);
            }
        }
        const BOSS_VISIBLE = PRESENTATION.bossVisible(sim2);
        if (BOSS_VISIBLE) {
            this.groundEllipse(sim2.boss.x, sim2.boss.y, sim2.boss.radius * 1.05, sim2.boss.radius * 0.75, '#38472c33');
        }
        const HIDDEN_MERGE_RESULT_IDS = PRESENTATION.hiddenUnitIds?.(sim2) || EMPTY_UNIT_IDS,
            ACTORS = this.actors;
        ACTORS.length = 0;
        PRESENTATION.drawMergeBlackHoles?.(this, sim2);
        for (const U of sim2.units) {
            if (!HIDDEN_MERGE_RESULT_IDS.has(U.id)) {
                this.addActor(
                    this.unitPresentation,
                    U,
                    0.785 * U.y - 0.62 * U.z,
                    U.id,
                    this.vectorAssets.has(U.species),
                );
            }
        }
        if (BOSS_VISIBLE) {
            this.addActor(this.bossPresentation, sim2.boss, 0.785 * sim2.boss.y - 0.62 * (sim2.boss.z || 0), 0, true);
        }
        PRESENTATION.collectFood(this, sim2);
        if (sim2.scene === 'farm') {
            this.addWorkActors(sim2);
        }
        if (BOSS_VISIBLE) {
            for (const F of sim2.projectiles) {
                this.addActor(this.projectilePresentation, F, 0.785 * F.y - 0.62 * F.z, -F.id);
            }
        }
        for (let index = 0; index < sim2.effects.length; index++) {
            const EFFECT = sim2.effects[index];
            if (EFFECT.kind !== 'merge-material') {
                continue;
            }
            const PROGRESS = mergeMaterialProgress(EFFECT);
            if (PROGRESS === null) {
                continue;
            }
            const POSITION = mergeMaterialPosition(EFFECT, PROGRESS);
            this.addActor(
                this.mergeMaterialPresentation,
                EFFECT,
                0.785 * POSITION.y - 0.62 * POSITION.z,
                -1000000 - index,
            );
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
            ACTOR.presentation.draw(ACTOR.source, sim2);
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
        for (const GROUP of sim2.cornAttachments?.groups || []) {
            for (const ATTACHMENT of GROUP.attachments) {
                if (ATTACHMENT.status === 'attached' || ATTACHMENT.status === 'fading') {
                    CORN_ATTACHMENT_PRESENTATION.drawAttachment(this, ATTACHMENT, GROUP);
                }
            }
        }
        for (const E of sim2.effects) {
            if (E.kind !== 'merge-material') {
                drawEffect(this, E);
            }
        }
        drawFormationEffects(this, sim2);
        this.stats = C.endFrame();
    }
    dispose() {
        disposeEffectPresentations(this);
        for (const SPECIES of this.vectorAssets.keys()) {
            unbindBossSocketAsset(SPECIES, this.bossSpeciesAssets.get(SPECIES));
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
        this.bossSpeciesAssets.clear();
        this.actors.length = 0;
        this.actorPool.length = 0;
        this.liveUnitIds.clear();
        this.joyEffects.length = 0;
        this.ctx.dispose();
        this.device.dispose();
    }
};
export { DIORAMA as Diorama };
