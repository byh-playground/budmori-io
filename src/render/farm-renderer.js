import { labRequested } from '../debug/lab.js';
import { barleyPreviewEnvelope } from '../features/unit-attacks/barley/presentation.js';
import { wheatPreviewEnvelope } from '../features/unit-attacks/wheat/presentation.js';
import { ricePreviewEnvelope } from '../features/unit-attacks/rice/presentation.js';
import { sampleChestnutShards } from '../features/projectiles/spike/presentation.js';
import { unitBodyDefinition } from '../features/unit-body/definition.js';
import { includeCornProjectileBounds } from '../features/projectiles/corn/presentation.js';
import { drawFormationEffects, includeFormationEffectBounds } from '../formation/formation-skill-presentations.js';
import { scenePresentation } from './farm-render-scenes.js';
import { FoodPresentation, ProjectilePresentation } from './farm-render-items.js';
import { UnitPresentation } from './farm-render-units.js';
import { UnitSpriteAtlas, UNIT_SPRITE_ATLAS } from './unit-sprite-atlas.js';
import { UnitOverlayImages } from './unit-overlay-images.js';
import { unitCullingEnabled, unitMayBeVisible } from './farm-render-visibility.js';
import { UNIT_GRADES } from '../units/unit-grades.js';
import { CornAttachmentPresentation } from '../features/abilities/corn-attachment/presentation.js';
import { disposeEffectPresentations, drawEffect } from './farm-render-effects.js';
import {
    drawMergeBlackHoleBack,
    drawMergeBlackHoleFront,
    mergeMaterialPosition,
    mergeMaterialProgress,
} from '../features/farm-modes/merge/presentation.js';
import {
    readVectorSockets,
    BOSS_ART_RADIUS,
    bossVectorScale,
    WORLD_HEIGHT_PROJECTION,
    WORLD_DEPTH_PROJECTION,
} from '../vector-sockets.js';
import { bindBossSocketAsset, bossHandRig, unbindBossSocketAsset } from './boss-vector-sockets.js';
import { BossPresentation, bossAttackPresentation } from './farm-render-boss.js';
import { CONFIG, clamp, bossAttackArea, ArenaGeometry } from '../model/farm-model.js';
import { BOSS_SPECIES, kitSpecies } from '../units/species-catalog.js';
import { bossDangerContour } from './attack-telegraph.js';
import { drawFarmGrounds, drawTowerHall } from './farm-scenery.js';
const { bosses: BOSS_VECTOR_ASSETS, troops: TROOP_VECTOR_ASSETS } = globalThis.BudmoriVectorResources;
// Original SVG sources are compiled once by the startup loader before this module runs.
const { WebGLDevice: WEB_GL_DEVICE, VectorContext: VECTOR_CONTEXT } = globalThis.BloomGamekitRendering;
const { createVectorActor: CREATE_VECTOR_ACTOR, holdVectorAsset: HOLD_VECTOR_ASSET } =
    globalThis.BloomGamekitVectorAssets;
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
    scratch.attackArea = boss.attackArea;
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
const ZOOM_MAX = 1.8;
const DIORAMA = class Diorama {
    constructor(canvas, { deferSpritePreparation = false } = {}) {
        this.canvas = canvas;
        // The single code setting chooses only body art, never game state.
        // Help iframes retain native vectors instead of preparing a whole atlas.
        const ART_QUERY = new URLSearchParams(globalThis.location?.search);
        if (!['vector', 'sprite'].includes(CONFIG.render.unitArt)) {
            throw new TypeError('CONFIG.render.unitArt must be vector or sprite');
        }
        this.unitArtMode =
            ART_QUERY.has('help') || labRequested(globalThis.location?.search)
                ? 'previewVector'
                : CONFIG.render.unitArt;
        this.device = new WEB_GL_DEVICE(canvas, {
            alpha: false,
            depth: this.unitArtMode !== 'sprite',
            stencil: false,
            antialias: true,
            // Sampled body art lives in the device's shared atlas, whose layers are allocated up front.
            ...(this.unitArtMode === 'sprite' ? { textureAtlas: UNIT_SPRITE_ATLAS } : {}),
        });
        this.ctx = new VECTOR_CONTEXT(this.device);
        this.vectorAssets = new Map();
        this.vectorPlayers = new Map();
        this.vectorPlayerAssets = new WeakMap();
        this.cornAttachmentBodies = new Map();
        this.actors = [];
        this.visibleUnits = [];
        this.actorPool = [];
        this.actorDepthStep = 0;
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
            ENTRIES.length !== CONFIG.unit.speciesCount + 1 ||
            ENTRIES.some(([species], index) => Number(species) !== index) ||
            typeof CREATE_VECTOR_ACTOR !== 'function' ||
            typeof HOLD_VECTOR_ASSET !== 'function'
        ) {
            throw new Error('All pinned GameKit troop and vector-assets sources are required');
        }
        for (const [SPECIES, COMPILED] of ENTRIES) {
            this.vectorAssets.set(Number(SPECIES), {
                compiled: COMPILED,
                // Keeps the mesh resident while no actor of this species exists.
                hold: HOLD_VECTOR_ASSET(this.ctx, COMPILED),
                anchors: readVectorSockets(COMPILED, `species ${SPECIES}, ${COMPILED.sourcePath}`),
                parts: new Set(COMPILED.metadata.parts.map((part) => part.id)),
            });
        }
        this.unitSprites = new UnitSpriteAtlas(this, this.unitArtMode === 'sprite');
        this.unitOverlays = new UnitOverlayImages(this);
        this.unitPresentation.prepareBodyGroups();
        this.bossAssets = new Map(
            Object.entries(BOSS_VECTOR_ASSETS).map(([id, compiled]) => [
                id,
                {
                    compiled,
                    hold: HOLD_VECTOR_ASSET(this.ctx, compiled),
                    parts: new Set(compiled.metadata.parts.map((part) => part.id)),
                },
            ]),
        );
        this.bossSpeciesAssets = new Map();
        for (const SPECIES of this.vectorAssets.keys()) {
            const RECORD = this.bossAssets.get(`species-${SPECIES}`);
            if (!RECORD) {
                throw new Error('Missing required boss vector asset for species ' + SPECIES);
            }
            RECORD.anchors = bindBossSocketAsset(SPECIES, RECORD, this.ctx);
            RECORD.hands = bossHandRig(RECORD.compiled);
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
        this.canvas.dataset.rendererBackend = this.unitSprites.enabled
            ? 'Budmori sampled sprite units + native vector exceptions'
            : 'Budmori authored 2.5D vectors';
        this.resize();
        const BOSS = this.bossSpeciesAssets.get(BOSS_SPECIES);
        if (!BOSS) {
            throw new Error('Pinned current boss vector asset is required');
        }
        const PREWARM_AT = performance.now();
        this.bossPlayer = CREATE_VECTOR_ACTOR(this.ctx, BOSS.compiled, {
            clip: 'idle',
            startedAtMs: 0,
        });
        this.bossPlayerAsset = BOSS;
        this.bossPlayers.set('prewarm', {
            record: BOSS,
            player: this.bossPlayer,
        });
        this.ctx.beginFrame({
            width: this.canvas.width,
            height: this.canvas.height,
            clearColor: [0.9, 0.92, 0.87, 1],
        });
        this.unitOverlays.prepare();
        if (!deferSpritePreparation) {
            this.unitSprites.prepare();
        }
        this.ctx.drawVectorActor(this.bossPlayer, {
            matrix: [0.001, 0, 0, 0.001, 100, 100],
        });
        this.prewarmStats = this.ctx.endFrame();
        this.prewarmDurationMs = performance.now() - PREWARM_AT;
        this.assetsReady = !deferSpritePreparation;
        // SDK resources restore first; the app resumes its suspended clock
        // after this listener, so image preparation cannot advance game time.
        this.onSpritesRestored = () => {
            this.unitOverlays.prepare();
            if (
                !this.assetsReady ||
                this.unitSprites.disposed ||
                !this.unitSprites.enabled ||
                this.device.state !== 'ready'
            ) {
                return;
            }
            this.ctx.beginFrame({ width: this.canvas.width, height: this.canvas.height });
            this.unitSprites.prepare();
            this.ctx.endFrame();
        };
        this.canvas.addEventListener('webglcontextrestored', this.onSpritesRestored);
    }
    async prepareStartup(options) {
        const START = performance.now();
        this.ctx.beginFrame({ width: this.canvas.width, height: this.canvas.height });
        try {
            await this.unitSprites.prepareAsync(options);
            this.assetsReady = true;
        } finally {
            // A confirmed context loss invalidates the frame itself. Do not
            // replace the preparation error with an unavailable-frame error.
            if (this.device.state === 'ready' && !this.device.gl.isContextLost()) {
                this.ctx.endFrame();
            }
            this.startupPreparationWallMs = performance.now() - START;
        }
        // A viewport change during cooperative preparation must not leave the
        // first visible frame at the old canvas size.
        this.resize();
    }
    resize() {
        const CENTER = this.view
            ? {
                  x: this.canvas.width / (2 * this.scale) - this.offset[0] - this.view[0],
                  y: (this.view[1] - this.canvas.height / (2 * this.scale) - this.offset[1]) / WORLD_DEPTH_PROJECTION,
              }
            : null;
        const R = this.canvas.getBoundingClientRect(),
            D = Math.min(globalThis.devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(R.width * D);
        this.pixelRatio = D;
        this.canvas.height = Math.round(R.height * D);
        this.aspect = R.width / R.height;
        if (this.insideTower && this.manualCamera) {
            this.zoom = clamp(this.zoom, this.minimumZoom(), ZOOM_MAX);
        }
        this.configure(this.scene || 'farm', true);
        if (CENTER && this.manualCamera) {
            this.setPan(
                -CENTER.x,
                this.view[1] - this.baseY() - this.canvas.height / (2 * this.scale) - CENTER.y * WORLD_DEPTH_PROJECTION,
            );
        }
    }
    project(x, y, z = 0) {
        return {
            x: (x + this.offset[0] + this.view[0] + (this.shakeX || 0)) * this.scale,
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
            x: PX / this.scale - this.offset[0] - this.view[0] - (this.shakeX || 0),
            y: (this.view[1] - PY / this.scale - this.offset[1]) / WORLD_DEPTH_PROJECTION,
        };
    }
    // The smallest a unit is drawn, in pixels. Zoomed out it shrinks with the view instead of staying full size.
    minimumUnitPixels() {
        const BASE = this.scenePresentation.minimumUnitPixels * this.pixelRatio;
        return this.scene === 'farm' && this.zoom < 1 ? Math.max(3 * this.pixelRatio, BASE * this.zoom) : BASE;
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
            this.zoom = this.homeZoom();
        }
        this.scene = scene;
        this.scenePresentation = scenePresentation(scene);
        const A = this.aspect;
        this.zoom ??= this.homeZoom();
        this.baseView = this.scenePresentation.cameraView(A);
        const ZOOM = scene === 'farm' ? this.zoom : 1;
        this.view = [this.baseView[0] / ZOOM, this.baseView[1] / ZOOM];
        this.scale = this.canvas.width / (2 * this.view[0]);
        const { radiusX: RX, radiusY: RY } = this.cameraArena || CONFIG[scene].arena;
        // Keep the authored zoom. Pan only far enough to inspect the terrain and
        // tall boss art at its edge; never move simulation bodies or saved points.
        const BOUNDS = {
            left: -RX - 1.3,
            right: RX + 1.3,
            bottom: -(RY + 1.3) * WORLD_DEPTH_PROJECTION,
            top: (RY + 1.3) * WORLD_DEPTH_PROJECTION,
        };
        const BOSS_SCALE = bossVectorScale(),
            BOSS_X = RX - BOSS_ART_RADIUS,
            BOSS_Y = (RY - BOSS_ART_RADIUS) * WORLD_DEPTH_PROJECTION;
        const INCLUDE_BOSS = (record) => {
            const [X, Y, W, H] = record.compiled.viewBox,
                G = record.anchors.ground;
            BOUNDS.left = Math.min(BOUNDS.left, -BOSS_X - (G.x - X) * BOSS_SCALE);
            BOUNDS.right = Math.max(BOUNDS.right, BOSS_X + (X + W - G.x) * BOSS_SCALE);
            BOUNDS.bottom = Math.min(BOUNDS.bottom, -BOSS_Y - (Y + H - G.y) * BOSS_SCALE);
            BOUNDS.top = Math.max(
                BOUNDS.top,
                BOSS_Y + (G.y - Y) * BOSS_SCALE + CONFIG.battle.dropHeight * WORLD_HEIGHT_PROJECTION,
            );
        };
        for (const RECORD of this.bossAssets.values()) {
            INCLUDE_BOSS(RECORD);
        }
        const BASE_Y = this.baseY(),
            TOP = this.view[1] - BASE_Y,
            BOTTOM = TOP - this.canvas.height / this.scale;
        this.panLimits = {
            minX: Math.min(0, this.view[0] - BOUNDS.right),
            maxX: Math.max(0, -this.view[0] - BOUNDS.left),
            minY: Math.min(0, TOP - BOUNDS.top),
            maxY: Math.max(0, BOTTOM - BOUNDS.bottom),
        };
        if (scene === 'farm' && ZOOM !== 1) {
            // Zoomed out or in: the middle of the screen may rest anywhere on the land, not only the edges of it.
            this.panLimits.minX = Math.min(this.panLimits.minX, -BOUNDS.right);
            this.panLimits.maxX = Math.max(this.panLimits.maxX, -BOUNDS.left);
            this.panLimits.minY = Math.min(this.panLimits.minY, -BOUNDS.top - BASE_Y);
            this.panLimits.maxY = Math.max(this.panLimits.maxY, -BOUNDS.bottom - BASE_Y);
        }
        this.pan.x = clamp(this.pan.x, this.panLimits.minX, this.panLimits.maxX);
        this.pan.y = clamp(this.pan.y, this.panLimits.minY, this.panLimits.maxY);
        this.offset = [this.pan.x, BASE_Y + this.pan.y];
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
        this.offset[1] = this.baseY() + NEXT_Y;
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
    // Zoom keeps the ground under the pointer where it is. factor > 1 closes in.
    zoomAt(factor, clientX = null, clientY = null) {
        if (this.scene !== 'farm' || !(factor > 0)) {
            return false;
        }
        const NEXT = clamp(this.zoom * factor, this.minimumZoom(), ZOOM_MAX);
        if (NEXT === this.zoom) {
            return false;
        }
        const R = this.canvas.getBoundingClientRect(),
            PX = (clientX === null ? R.width / 2 : clientX - R.left) * this.pixelRatio,
            PY = (clientY === null ? R.height / 2 : clientY - R.top) * this.pixelRatio,
            WX = PX / this.scale - this.offset[0] - this.view[0],
            WY = this.view[1] - PY / this.scale - this.offset[1];
        this.zoom = NEXT;
        this.configure(this.scene, true);
        const BASE_Y = this.offset[1] - this.pan.y;
        this.setPan(PX / this.scale - this.view[0] - WX, this.view[1] - PY / this.scale - WY - BASE_Y);
        return true;
    }
    minimumZoom() {
        const BASE = this.scenePresentation.cameraView(this.aspect),
            ARENA = this.insideTower ? CONFIG.farm.tower.arena : CONFIG.farm.arena,
            OVERVIEW = Math.min(
                BASE[0] / (ARENA.radiusX + 1),
                BASE[1] / (ARENA.radiusY * WORLD_DEPTH_PROJECTION + 3.5),
            );
        return this.insideTower ? OVERVIEW : Math.min(this.homeZoom() / 2, OVERVIEW);
    }
    takeCameraControl() {
        this.manualCamera = true;
    }
    // A wide screen sits a little further back and higher up, so the tower behind the farm shows.
    homeZoom() {
        return this.aspect > 1.2 ? 0.72 : 1;
    }
    baseY() {
        return this.aspect < 0.8 ? 1.1 : this.aspect > 1.2 ? -3.3 : -0.3;
    }
    resetZoom() {
        this.manualCamera = false;
        if (this.insideTower && this.cameraWorld) {
            this.hallFramingKey = null;
            this.fitHall(this.cameraWorld);
            return true;
        }
        this.zoom = this.homeZoom();
        this.configure(this.scene, true);
        return this.resetPan();
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
    // In a fight every body stands on a side ring: ally blue, enemy red. A fallen one turns grey with a cross.
    drawSideMarker(u, shadow) {
        if (u.hp <= 0 || u.down > 0) {
            this.groundEllipse(u.x, u.y, shadow * 1.05, shadow * 0.7, 'rgba(30,30,36,0.35)');
            this.ring(u.x, u.y, shadow * 1.05, 'rgba(120,124,134,0.9)', 0.05);
            const C = this.ctx,
                ARM = shadow * 0.8,
                A = this.project(u.x - ARM, u.y - ARM * 0.6, 0),
                B = this.project(u.x + ARM, u.y + ARM * 0.6, 0),
                D = this.project(u.x - ARM, u.y + ARM * 0.6, 0),
                E = this.project(u.x + ARM, u.y - ARM * 0.6, 0);
            C.beginPath();
            C.moveTo(A.x, A.y);
            C.lineTo(B.x, B.y);
            C.moveTo(D.x, D.y);
            C.lineTo(E.x, E.y);
            C.strokeStyle = 'rgba(232,90,80,0.95)';
            C.lineWidth = Math.max(2 * this.pixelRatio, this.scale * 0.12);
            C.lineCap = 'round';
            C.stroke();
            return;
        }
        const ALLY = u.faction === 'player';
        this.groundEllipse(
            u.x,
            u.y,
            shadow * 1.05,
            shadow * 0.7,
            ALLY ? 'rgba(70,170,240,0.22)' : 'rgba(240,70,60,0.26)',
        );
        this.ring(u.x, u.y, shadow * 1.05, ALLY ? '#4fb8f2' : '#f0463c', 0.08);
    }
    // `z` lifts the ring off the floor for marks that belong at a body's height, such as a hit on a boss's head.
    ring(x, y, r, color2, width = 0.045, start = 0, end = Math.PI * 2, z = 0) {
        const C = this.ctx,
            P = this.project(x, y, z);
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
    // One long triangle from a base `width` wide at `a` to a sharp point at `b` (screen points, width in world units).
    spike(a, b, width, color2) {
        const C = this.ctx,
            DX = b.x - a.x,
            DY = b.y - a.y,
            HALF = (width * this.scale) / 2 / (Math.hypot(DX, DY) || 1),
            NX = -DY * HALF,
            NY = DX * HALF;
        C.fillStyle = color2;
        C.beginPath();
        C.moveTo(a.x + NX, a.y + NY);
        C.lineTo(b.x, b.y);
        C.lineTo(a.x - NX, a.y - NY);
        C.closePath();
        C.fill();
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
    terrain(sim2, now) {
        if (sim2.insideTower) {
            drawTowerHall(this, sim2, now);
            return;
        }
        drawFarmGrounds(this, sim2);
        this.scenePresentation.drawBoundary(this);
        this.drawWorkShadows(sim2);
    }
    // The camera follows the climb: on the march it pulls back to show the tower and its door, and
    // it stays there a moment when the troops come back out; inside, it rests on the hall.
    directCamera(sim2, now) {
        if (
            [0, 2, 3, 4, 5, 6, 7, 8].includes(this.attackPreviewSpecies) &&
            sim2.units.length === 1 &&
            sim2.units[0].species === this.attackPreviewSpecies
        ) {
            this.fitAttackPreview(sim2);
            return;
        }
        this.cameraDirected = false;
        const INSIDE = !!sim2.insideTower,
            KEY = INSIDE ? `in${sim2.tower?.floor}` : 'out',
            MARCHING = sim2.farmBossEvent?.phase === 'marching';
        if (this.sceneKey === undefined) {
            this.sceneKey = KEY;
            this.manualCamera = false;
            this.sceneChangedAt = -1e9;
            this.towerShotUntil = 0;
        } else if (KEY !== this.sceneKey) {
            const WAS_INSIDE = this.sceneKey !== 'out';
            this.sceneKey = KEY;
            this.manualCamera = false;
            this.sceneChangedAt = now;
            if (INSIDE && !WAS_INSIDE) {
                this.fitHall(sim2);
            } else if (!INSIDE) {
                this.hallFramingKey = null;
                this.towerShotUntil = now + 2600;
            }
        }
        // An outside-tower transition must never override the hall's reserved sky.
        // Entering the floor can happen while the previous exterior shot is still timed.
        if (INSIDE) {
            this.towerShotUntil = 0;
            this.cameraReturning = false;
            this.cameraDirected = now - this.sceneChangedAt < 700;
            if (!this.manualCamera) {
                this.fitHall(sim2);
            }
            return;
        }
        if (MARCHING || now < this.towerShotUntil) {
            this.cameraDirected = true;
            const ZOOM_TARGET = this.aspect > 1.2 ? 0.55 : 0.8;
            this.zoom += (ZOOM_TARGET - this.zoom) * 0.07;
            this.configure(this.scene, true);
            const BASE_Y = this.baseY(),
                TARGET_Y = -0.2 * this.view[1] - WORLD_DEPTH_PROJECTION * CONFIG.farm.arena.radiusY - BASE_Y;
            this.setPan(this.pan.x * 0.9, this.pan.y + (TARGET_Y - this.pan.y) * 0.07);
            this.cameraReturning = true;
        } else if (this.cameraReturning && !INSIDE) {
            this.cameraDirected = true;
            this.zoom += (this.homeZoom() - this.zoom) * 0.1;
            this.configure(this.scene, true);
            this.setPan(this.pan.x * 0.9, this.pan.y * 0.9);
            if (Math.abs(this.zoom - this.homeZoom()) < 0.01 && Math.abs(this.pan.y) < 0.05) {
                this.resetZoom();
                this.cameraReturning = false;
            }
        }
    }
    // Isolated pea help frames show the real contact and body, not the entire hall.
    // This flag is installed only by the help entry point, never for a live run.
    fitAttackPreview(world) {
        if (this.attackPreviewSpecies === 3) {
            this.fitChestnutPreview(world);
            return;
        }
        if (this.attackPreviewSpecies === 2) {
            this.fitJumpPreview(world);
            return;
        }
        if (this.attackPreviewSpecies === 8) {
            this.fitRicePreview(world, barleyPreviewEnvelope);
            return;
        }
        if (this.attackPreviewSpecies === 7) {
            this.fitRicePreview(world, wheatPreviewEnvelope);
            return;
        }
        if (this.attackPreviewSpecies === 6) {
            this.fitRicePreview(world);
            return;
        }
        if (this.attackPreviewSpecies === 5) {
            this.fitWalnutPreview(world);
            return;
        }
        if (this.attackPreviewSpecies === 4) {
            this.fitPeanutPreview(world);
            return;
        }
        const UNIT = world.units[0],
            BODY = unitBodyDefinition(kitSpecies(UNIT)),
            BASE = this.scenePresentation.cameraView(this.aspect),
            // 96px full art keeps the authored torso above32px even at maximum compression.
            SCALE = (96 * this.pixelRatio) / (UNIT.bodyScale * Math.max(BODY.viewBox[2], BODY.viewBox[3])),
            FOCUS_X = world.boss.x - world.boss.radius - 0.8,
            FOCUS_Y = world.boss.y;
        this.zoom = (2 * BASE[0] * SCALE) / this.canvas.width;
        this.configure(this.scene, true);
        const PAN_X = (this.canvas.width * 0.45) / this.scale - FOCUS_X - this.view[0],
            PAN_Y =
                this.view[1] -
                this.baseY() -
                (this.canvas.height * 0.76) / this.scale -
                FOCUS_Y * WORLD_DEPTH_PROJECTION;
        this.panLimits.minX = Math.min(this.panLimits.minX, PAN_X);
        this.panLimits.maxX = Math.max(this.panLimits.maxX, PAN_X);
        this.panLimits.minY = Math.min(this.panLimits.minY, PAN_Y);
        this.panLimits.maxY = Math.max(this.panLimits.maxY, PAN_Y);
        this.setPan(PAN_X, PAN_Y);
    }
    fitRicePreview(world, previewEnvelope = ricePreviewEnvelope) {
        const UNIT = world.units[0],
            BASE = this.scenePresentation.cameraView(this.aspect),
            ENVELOPE = previewEnvelope(this, UNIT),
            ART = UNIT.bodyScale * 350,
            PAD = 12 * this.pixelRatio,
            SCALE = Math.min(
                (124 * this.pixelRatio) / ART,
                (this.canvas.height - 2 * PAD) / (ENVELOPE.above + ENVELOPE.below),
            ),
            GROUND_Y = PAD + ENVELOPE.above * SCALE;
        this.zoom = (2 * BASE[0] * SCALE) / this.canvas.width;
        this.configure(this.scene, true);
        const PAN_X = (this.canvas.width * 0.4) / this.scale - UNIT.x - this.view[0],
            PAN_Y = this.view[1] - this.baseY() - GROUND_Y / this.scale - UNIT.y * WORLD_DEPTH_PROJECTION;
        this.panLimits.minX = Math.min(this.panLimits.minX, PAN_X);
        this.panLimits.maxX = Math.max(this.panLimits.maxX, PAN_X);
        this.panLimits.minY = Math.min(this.panLimits.minY, PAN_Y);
        this.panLimits.maxY = Math.max(this.panLimits.maxY, PAN_Y);
        this.setPan(PAN_X, PAN_Y);
    }
    fitWalnutPreview(world) {
        const UNIT = world.units[0],
            BODY = unitBodyDefinition(kitSpecies(UNIT)),
            BASE = this.scenePresentation.cameraView(this.aspect),
            ART = UNIT.bodyScale * Math.max(BODY.viewBox[2], BODY.viewBox[3]),
            SCALE = Math.min((124 * this.pixelRatio) / ART, (this.canvas.height - 40 * this.pixelRatio) / ART),
            GROUND_Y = this.canvas.height * 0.5 + ART * SCALE * 0.25;
        this.zoom = (2 * BASE[0] * SCALE) / this.canvas.width;
        this.configure(this.scene, true);
        // Keep both the raised hammer and the below-foot guard/contact ring in
        // the center of the isolated help canvas, including the180px modal.
        const PAN_X = (this.canvas.width * 0.44) / this.scale - UNIT.x - this.view[0],
            PAN_Y = this.view[1] - this.baseY() - GROUND_Y / this.scale - UNIT.y * WORLD_DEPTH_PROJECTION;
        this.panLimits.minX = Math.min(this.panLimits.minX, PAN_X);
        this.panLimits.maxX = Math.max(this.panLimits.maxX, PAN_X);
        this.panLimits.minY = Math.min(this.panLimits.minY, PAN_Y);
        this.panLimits.maxY = Math.max(this.panLimits.maxY, PAN_Y);
        this.setPan(PAN_X, PAN_Y);
    }
    fitPeanutPreview(world) {
        const UNIT = world.units[0],
            BODY = unitBodyDefinition(kitSpecies(UNIT)),
            BASE = this.scenePresentation.cameraView(this.aspect),
            ART = UNIT.bodyScale * Math.max(BODY.viewBox[2], BODY.viewBox[3]),
            // Both source kernels, the opened shell and the grounded feet fit
            // the authored canvas. Reserve the complete canvas, not just the pod.
            SCALE = Math.min((124 * this.pixelRatio) / ART, (this.canvas.height - 24 * this.pixelRatio) / ART);
        this.zoom = (2 * BASE[0] * SCALE) / this.canvas.width;
        this.configure(this.scene, true);
        const PAN_X = (this.canvas.width * 0.4) / this.scale - UNIT.x - this.view[0],
            PAN_Y =
                this.view[1] -
                this.baseY() -
                (this.canvas.height - 18 * this.pixelRatio) / this.scale -
                UNIT.y * WORLD_DEPTH_PROJECTION;
        this.panLimits.minX = Math.min(this.panLimits.minX, PAN_X);
        this.panLimits.maxX = Math.max(this.panLimits.maxX, PAN_X);
        this.panLimits.minY = Math.min(this.panLimits.minY, PAN_Y);
        this.panLimits.maxY = Math.max(this.panLimits.maxY, PAN_Y);
        this.setPan(PAN_X, PAN_Y);
    }
    fitChestnutPreview(world) {
        const UNIT = world.units[0],
            BODY = unitBodyDefinition(kitSpecies(UNIT)),
            ART = UNIT.bodyScale * Math.max(BODY.viewBox[2], BODY.viewBox[3]),
            BASE = this.scenePresentation.cameraView(this.aspect),
            BOUNDS = {
                left: UNIT.x - ART * 0.75,
                right: UNIT.x + ART * 0.75,
                top: UNIT.y * WORLD_DEPTH_PROJECTION + ART * 1.25,
                bottom: UNIT.y * WORLD_DEPTH_PROJECTION - ART * 0.15,
            },
            PATH = {
                height: 0,
                from: { x: UNIT.x, y: UNIT.y, z: 0.35 },
                to: { x: world.boss.x - world.boss.radius + 0.04, y: world.boss.y, z: 0.35 },
            };
        // Reserve all committed directions before any shot appears, including
        // tip width and the full trail. The camera therefore never follows a shard.
        const PROJECTILES = ['thrust', 'cross-left', 'cross-right', 'fan', 'spread', 'converge', 'central'].map(
            (stage) => ({ path: PATH, chestnutStage: stage }),
        );
        PROJECTILES.push(...world.projectiles.filter((p) => p.chestnutActionId));
        for (const PROJECTILE of PROJECTILES) {
            for (const Q of [0, 0.25, 0.5, 0.75, 1]) {
                for (const SHARD of sampleChestnutShards(PROJECTILE, Q)) {
                    const X = SHARD.x + Math.cos(SHARD.angle) * SHARD.length,
                        Y =
                            (SHARD.y + Math.sin(SHARD.angle) * SHARD.length) * WORLD_DEPTH_PROJECTION +
                            SHARD.z * WORLD_HEIGHT_PROJECTION;
                    BOUNDS.left = Math.min(BOUNDS.left, SHARD.x - 0.12, X - 0.12);
                    BOUNDS.right = Math.max(BOUNDS.right, SHARD.x + 0.12, X + 0.12);
                    BOUNDS.top = Math.max(BOUNDS.top, Y + 0.12);
                    BOUNDS.bottom = Math.min(BOUNDS.bottom, Y - 0.12);
                }
            }
        }
        const PAD = 14 * this.pixelRatio,
            SCALE = Math.min(
                (108 * this.pixelRatio) / ART,
                (this.canvas.width - 2 * PAD) / (BOUNDS.right - BOUNDS.left),
                (this.canvas.height - 2 * PAD) / (BOUNDS.top - BOUNDS.bottom),
            );
        this.zoom = (2 * BASE[0] * SCALE) / this.canvas.width;
        this.configure(this.scene, true);
        const PAN_X = this.canvas.width / (2 * this.scale) - (BOUNDS.left + BOUNDS.right) / 2 - this.view[0],
            PAN_Y =
                this.view[1] - this.baseY() - this.canvas.height / (2 * this.scale) - (BOUNDS.top + BOUNDS.bottom) / 2;
        this.panLimits.minX = Math.min(this.panLimits.minX, PAN_X);
        this.panLimits.maxX = Math.max(this.panLimits.maxX, PAN_X);
        this.panLimits.minY = Math.min(this.panLimits.minY, PAN_Y);
        this.panLimits.maxY = Math.max(this.panLimits.maxY, PAN_Y);
        this.setPan(PAN_X, PAN_Y);
    }
    fitJumpPreview(world) {
        const UNIT = world.units[0],
            BODY = unitBodyDefinition(kitSpecies(UNIT)),
            BASE = this.scenePresentation.cameraView(this.aspect),
            ART_WORLD_HEIGHT = UNIT.bodyScale * Math.max(BODY.viewBox[2], BODY.viewBox[3]),
            // Reserve the complete rotating body plus real flight height and the landing ground.
            MAX_HEIGHT = [0, 0.65, 1.1, 1.4, 1.1, 2.2, 2.7][UNIT.tier],
            SCALE = Math.min(
                (96 * this.pixelRatio) / ART_WORLD_HEIGHT,
                (this.canvas.height - 24 * this.pixelRatio) /
                    (ART_WORLD_HEIGHT * 1.4 + MAX_HEIGHT * WORLD_HEIGHT_PROJECTION),
            ),
            FOCUS_X = UNIT.x,
            FOCUS_Y = UNIT.y;
        this.zoom = (2 * BASE[0] * SCALE) / this.canvas.width;
        this.configure(this.scene, true);
        const PAN_X = (this.canvas.width * 0.45) / this.scale - FOCUS_X - this.view[0],
            PAN_Y =
                this.view[1] -
                this.baseY() -
                (this.canvas.height - 22 * this.pixelRatio) / this.scale -
                FOCUS_Y * WORLD_DEPTH_PROJECTION;
        this.panLimits.minX = Math.min(this.panLimits.minX, PAN_X);
        this.panLimits.maxX = Math.max(this.panLimits.maxX, PAN_X);
        this.panLimits.minY = Math.min(this.panLimits.minY, PAN_Y);
        this.panLimits.maxY = Math.max(this.panLimits.maxY, PAN_Y);
        this.setPan(PAN_X, PAN_Y);
    }

    // The original 46 x 34 framing preserves readable troops in the larger hall.
    // Default view reserves airborne effects; manual control remains stable until reset or a new floor.
    fitHall(world) {
        const { radiusX: RX, radiusY: RY } = CONFIG.farm.arena,
            BASE = this.scenePresentation.cameraView(this.aspect),
            HALL_FIT = Math.min(BASE[0] / (RX + 1), BASE[1] / (RY * WORLD_DEPTH_PROJECTION + 3.5)),
            HALF_X = BASE[0] / HALL_FIT,
            HALL_SCALE = this.canvas.width / (2 * HALF_X),
            TOP = BASE[1] / HALL_FIT - this.baseY(),
            BOTTOM = TOP - this.canvas.height / HALL_SCALE;
        // Keep any extra sky for this floor instead of snapping in and out on every cloud cast.
        if (this.hallFramingKey !== this.sceneKey) {
            this.hallFramingKey = this.sceneKey;
            this.hallEffectBounds = { left: Infinity, right: -Infinity, top: -Infinity };
        }
        const BOUNDS = this.hallEffectBounds;
        includeFormationEffectBounds(world, BOUNDS);
        includeCornProjectileBounds(world, BOUNDS);
        const LEFT = Math.min(-HALF_X, BOUNDS.left),
            RIGHT = Math.max(HALF_X, BOUNDS.right),
            FRAME_TOP = Math.max(TOP, BOUNDS.top),
            SCALE = Math.min(this.canvas.width / (RIGHT - LEFT), this.canvas.height / (FRAME_TOP - BOTTOM)),
            FIT = (2 * BASE[0] * SCALE) / this.canvas.width;
        if (Math.abs(this.zoom - FIT) > 1e-6) {
            this.zoom = FIT;
            this.configure(this.scene, true);
        }
        // Leave headroom when the fight moves north in the expanded hall.
        // Translate the original view instead of shrinking troops to fit the whole map.
        let headroom = 0;
        for (const BOSS of world.bosses) {
            if (!BOSS.active || BOSS.hp <= 0) {
                continue;
            }
            const RECORD = this.bossSpeciesAssets.get(BOSS.species),
                ART_TOP =
                    BOSS.y * WORLD_DEPTH_PROJECTION +
                    (BOSS.z || 0) * WORLD_HEIGHT_PROJECTION +
                    (RECORD.anchors.ground.y - RECORD.compiled.viewBox[1]) * bossVectorScale(BOSS);
            headroom = Math.max(headroom, ART_TOP + 1 - FRAME_TOP);
        }
        const PAN_X = -(LEFT + RIGHT) / 2,
            PAN_Y =
                this.view[1] -
                this.baseY() -
                this.canvas.height / (2 * this.scale) -
                (FRAME_TOP + BOTTOM) / 2 -
                headroom;
        // Hall framing owns these bounds; the farm's manual-pan limits must not crop airborne effects.
        this.panLimits.minX = Math.min(this.panLimits.minX, PAN_X);
        this.panLimits.maxX = Math.max(this.panLimits.maxX, PAN_X);
        this.panLimits.minY = Math.min(this.panLimits.minY, PAN_Y);
        this.panLimits.maxY = Math.max(this.panLimits.maxY, PAN_Y);
        this.setPan(PAN_X, PAN_Y);
    }
    // Going through the door fades out and each new place fades in, so the climb reads as a cut, not a pop.
    drawSceneFade(sim2, now) {
        const EVENT = sim2.farmBossEvent,
            MARCH = EVENT?.phase === 'marching' ? EVENT.elapsed / CONFIG.farm.tower.marchSeconds : 0,
            OUT = MARCH > 0.82 ? (MARCH - 0.82) / 0.18 : 0,
            IN_MS = sim2.insideTower ? 700 : 500,
            IN = clamp(1 - (now - this.sceneChangedAt) / IN_MS, 0, 1),
            DARK = Math.max(clamp(OUT, 0, 1), IN);
        if (DARK > 0.01) {
            const C = this.ctx;
            C.fillStyle = `rgba(14,10,22,${DARK})`;
            C.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    drawDanger(sim2) {
        this.bossTelegraph = null;
        if (!this.scenePresentation.dangerVisible(sim2)) {
            return;
        }
        for (const BOSS of sim2.bosses) {
            const AREA = renderedBossAttackArea(BOSS, sim2, this.telegraphBoss, this.dangerArea);
            if (AREA) {
                this.drawBossTelegraph(AREA);
                if (BOSS.id === sim2.boss.id) {
                    this.bossTelegraph = AREA;
                }
            }
        }
    }
    drawWorkShadows(sim2) {
        for (const PILE of sim2.piles || []) {
            this.groundEllipse(PILE.x, PILE.y, 1.5, 1.0, '#54452433');
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
            {
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
    addActor(presentation, source, depth, id, culled = false) {
        const INDEX = this.actors.length,
            ACTOR = this.actorPool[INDEX] || (this.actorPool[INDEX] = {});
        ACTOR.presentation = presentation;
        ACTOR.source = source;
        ACTOR.depth = depth;
        ACTOR.id = id;
        ACTOR.culled = culled;
        this.actors.push(ACTOR);
    }
    // A source-order rank supplies stable, disjoint body/rear/front slots even when two actors have equal world
    // depth. Native body meshes may be grouped freely; every translucent overlay stays in painter order.
    drawActors(sim) {
        const C = this.ctx,
            ACTORS = this.actors,
            STEP = 1.8 / (ACTORS.length + 1);
        this.actorDepthStep = STEP;
        for (let index = 0; index < ACTORS.length; index++) {
            ACTORS[index].drawDepth = 0.9 - (index + 1) * STEP;
        }
        C.depthFunc = 'lequal';
        const DEPTH_BATCHED = this.unitPresentation.drawBodies(ACTORS, sim);
        for (const ACTOR of ACTORS) {
            if (!ACTOR.culled) {
                if (DEPTH_BATCHED) {
                    C.depth = ACTOR.drawDepth;
                }
                ACTOR.presentation.draw(ACTOR.source, sim);
            }
        }
        C.depthTest = false;
        C.depth = 0;
    }
    render(sim2, feel = null, now = performance.now()) {
        this.feel = feel;
        this.displayTimeMs = now;
        this.shakeX = this.feel?.shake(now) || 0;
        this.cameraWorld = sim2;
        const ARENA = ArenaGeometry.arena(sim2),
            ARENA_CHANGED = this.cameraArena !== ARENA;
        this.cameraArena = ARENA;
        this.insideTower = !!sim2.insideTower;
        this.configure(sim2.scene, ARENA_CHANGED);
        this.directCamera(sim2, now);
        const C = this.ctx,
            PRESENTATION = this.scenePresentation;
        PRESENTATION.collectJoy(sim2, this.joyEffects);
        if (
            !C.beginFrame({
                width: this.canvas.width,
                height: this.canvas.height,
                clearColor: [0.9, 0.92, 0.87, 1],
            })
        ) {
            return;
        }
        // A restored render target has lost its pixels. This is a distinct
        // preparation generation; ordinary frames take an O(1) ready path.
        this.unitSprites.prepare();
        this.unitSprites.beginFrame();
        this.terrain(sim2, now);
        this.unitPresentation.prepareUnits(sim2.units, sim2.time, sim2);
        // Attachment targets need their native body transform even when their
        // center is outside the view; the attached art can still cross it.
        this.cornAttachmentBodies.clear();
        for (const GROUP of sim2.cornAttachments?.groups || []) {
            this.cornAttachmentBodies.set(GROUP.targetId, null);
        }
        const HIDDEN_MERGE_RESULT_IDS = PRESENTATION.hiddenUnitIds?.(sim2) || EMPTY_UNIT_IDS,
            VISIBLE_UNITS = this.visibleUnits,
            CULL_UNITS = unitCullingEnabled(this);
        this.unitCullingActive = CULL_UNITS;
        VISIBLE_UNITS.length = 0;
        const SIDES = sim2.insideTower || sim2.scene !== 'farm';
        for (const SOURCE of sim2.units) {
            const U = this.unitPresentation.displayUnit(SOURCE);
            if (CULL_UNITS && !unitMayBeVisible(this, U, sim2)) {
                if (!HIDDEN_MERGE_RESULT_IDS.has(U.id)) {
                    this.unitPresentation.prepareHiddenUnit(U, sim2);
                }
                continue;
            }
            if (CULL_UNITS) {
                VISIBLE_UNITS.push(U);
            }
            const A = clamp(0.22 / (1 + U.z * 0.3), 0.045, 0.22),
                SHADOW = (U.size * 0.66) / (1 + U.z * 0.65);
            this.groundEllipse(U.x, U.y, SHADOW, SHADOW * 0.62, `rgba(42,61,35,${A})`);
            // Grade is a ground ring batched with the shadows, so each unit needs one native vector draw.
            if (U.tier > 1 && !U.isFormationClone) {
                this.ring(U.x, U.y, SHADOW * 1.12, GRADE_RING_COLORS[U.tier - 1], GRADE_RING_WIDTHS[U.tier - 1]);
            }
            if (SIDES) {
                this.drawSideMarker(U, SHADOW);
            }
        }
        this.drawDanger(sim2);
        feel?.drawGround(this, this.displayTimeMs);
        const BOSS_VISIBLE = PRESENTATION.bossVisible(sim2) && sim2.tower.phase !== 'summit',
            DISPLAY_BOSSES = this.displayBosses || (this.displayBosses = []);
        DISPLAY_BOSSES.length = 0;
        if (BOSS_VISIBLE) {
            for (const SOURCE of sim2.bosses) {
                const BOSS = this.bossPresentation.displayBoss(SOURCE, sim2);
                DISPLAY_BOSSES.push(BOSS);
                this.groundEllipse(BOSS.x, BOSS.y, BOSS.radius * 1.05, BOSS.radius * 0.75, '#38472c33');
                if (SIDES) {
                    this.ring(BOSS.x, BOSS.y, BOSS.radius * 1.05, BOSS.isFinalBoss ? '#f5cc67' : '#f0463c', 0.12);
                    if (BOSS.isFinalBoss) {
                        this.ring(BOSS.x, BOSS.y, BOSS.radius * 1.15, '#fff1b788', 0.06);
                    }
                }
            }
        }
        const ACTORS = this.actors;
        ACTORS.length = 0;
        PRESENTATION.drawMergeBlackHoles?.(this, sim2);
        // Both lists retain source order, so a cursor avoids a per-frame
        // visibility Set while keeping hidden actors at their original depth.
        let visibleIndex = 0;
        for (const SOURCE of sim2.units) {
            const U = this.unitPresentation.displayUnit(SOURCE),
                CULLED = CULL_UNITS && U.id !== VISIBLE_UNITS[visibleIndex]?.id;
            if (CULL_UNITS && !CULLED) {
                visibleIndex++;
            }
            if (!HIDDEN_MERGE_RESULT_IDS.has(U.id)) {
                this.addActor(this.unitPresentation, U, 0.785 * U.y - 0.62 * U.z, U.id, CULLED);
            }
        }
        for (let index = 0; index < DISPLAY_BOSSES.length; index++) {
            const BOSS = DISPLAY_BOSSES[index];
            this.addActor(this.bossPresentation, BOSS, 0.785 * BOSS.y - 0.62 * (BOSS.z || 0), -10000 - index);
        }
        if (!sim2.insideTower) {
            PRESENTATION.collectFood(this, sim2);
        }
        if (sim2.scene === 'farm' && !sim2.insideTower) {
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
        // Preserve stable source order for equal depth/id; the context keeps submission order itself.
        ACTORS.sort(COMPARE_ACTORS);
        // Evaluate shared numeric poses before visible submission. Actor order and
        // every body/face/effect boundary below remain in painter order.
        for (const ACTOR of ACTORS) {
            if (ACTOR.culled) {
                continue;
            }
            if (ACTOR.presentation === this.unitPresentation) {
                this.unitPresentation.prepareVisibleUnit(ACTOR.source, sim2);
            } else if (ACTOR.presentation === this.bossPresentation) {
                this.bossPresentation.prepareVisibleBoss(ACTOR.source, sim2);
            }
        }
        C.preparePoses();
        this.drawActors(sim2);
        for (const ACTOR of ACTORS) {
            ACTOR.source = null;
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
        const LIVE_BOSS_KEYS = new Set(sim2.bosses.map((boss) => boss.id + ':' + boss.generation));
        for (const [KEY, INSTANCE] of this.bossPlayers) {
            if (!LIVE_BOSS_KEYS.has(KEY)) {
                INSTANCE.player.dispose();
                this.bossPlayers.delete(KEY);
            }
        }
        for (const ID of this.bossPresentation.attackDisplays.keys()) {
            if (!sim2.bosses.some((boss) => boss.id === ID)) {
                this.bossPresentation.attackDisplays.delete(ID);
            }
        }
        feel?.draw(this, this.displayTimeMs);
        for (const GROUP of sim2.cornAttachments?.groups || []) {
            const BODY = this.attachmentBody(sim2, GROUP, feel);
            if (!BODY) {
                continue;
            }
            for (const ATTACHMENT of GROUP.attachments) {
                if (ATTACHMENT.status === 'attached' || ATTACHMENT.status === 'fading') {
                    CORN_ATTACHMENT_PRESENTATION.drawAttachment(this, ATTACHMENT, GROUP, {
                        tick: sim2.simulationTick,
                        body: BODY,
                    });
                }
            }
        }
        for (const E of sim2.effects) {
            if (E.kind !== 'merge-material') {
                drawEffect(this, E);
            }
        }
        drawFormationEffects(this, sim2);
        this.drawSceneFade(sim2, now);
        this.stats = C.endFrame();
    }
    captureCornAttachmentBody(target, id, player, matrix) {
        this.cornAttachmentBodies.set(id, {
            generation: target.generation,
            definition: unitBodyDefinition(kitSpecies(target)),
            transform: player.getPartPose('body').transform,
            matrix,
            radius: target.radius,
            height: target.height || 1,
            // Four SVG units, so kernels scale with the actual target art (including giant units).
            scale: (Math.hypot(matrix[0], matrix[1]) * 4) / (this.scale * 0.055),
            shiftX: 0,
            shiftY: 0,
        });
    }
    // Use the very same posed SVG matrix as the body just drawn, including recoil, rotation and giant scale.
    attachmentBody(_sim2, group) {
        const CAPTURED = this.cornAttachmentBodies.get(group.targetId);
        // Missing or old-generation render targets must never receive a default-position kernel.
        return CAPTURED?.generation === group.targetGeneration ? CAPTURED : null;
    }
    dispose() {
        this.canvas.removeEventListener('webglcontextrestored', this.onSpritesRestored);
        disposeEffectPresentations(this);
        this.unitSprites.dispose();
        this.unitOverlays.dispose();
        for (const SPECIES of this.vectorAssets.keys()) {
            unbindBossSocketAsset(SPECIES, this.bossSpeciesAssets.get(SPECIES));
        }
        for (const PLAYER of this.vectorPlayers.values()) {
            PLAYER.dispose();
        }
        this.vectorPlayers.clear();
        for (const RECORD of this.vectorAssets.values()) {
            RECORD.hold.release();
        }
        this.vectorAssets.clear();
        for (const { player: PLAYER } of this.bossPlayers.values()) {
            PLAYER.dispose();
        }
        this.bossPlayers.clear();
        this.bossPlayer = null;
        for (const RECORD of this.bossAssets?.values() || []) {
            RECORD.hold.release();
        }
        this.bossAssets?.clear();
        this.bossSpeciesAssets.clear();
        this.bossPresentation.attackDisplays.clear();
        this.bossPresentation.preparedVisibleBosses.clear();
        this.actors.length = 0;
        this.actorPool.length = 0;
        this.liveUnitIds.clear();
        this.unitPresentation.riceDisplayUnits.clear();
        this.unitPresentation.wheatDisplayUnits.clear();
        this.unitPresentation.barleyDisplayUnits.clear();
        this.unitPresentation.preparedVisibleUnits.clear();
        this.unitPresentation.playerIdentities.clear();
        this.unitPresentation.bodyGroups.clear();
        this.unitPresentation.activeBodyGroups.length = 0;
        this.unitPresentation.riceDisplayWorld = null;
        this.unitPresentation.riceDisplayTime = 0;
        this.joyEffects.length = 0;
        this.ctx.dispose();
        this.device.dispose();
    }
};
export { DIORAMA as Diorama };
