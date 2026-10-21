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
import { bossDangerContour } from './attack-telegraph.js';
import { drawFarmGrounds, drawTowerHall } from './farm-scenery.js';
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
const ZOOM_MIN = 0.06,
    ZOOM_MAX = 1.8;
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
        const NEXT = clamp(this.zoom * factor, ZOOM_MIN, ZOOM_MAX);
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
    // A wide screen sits a little further back and higher up, so the tower behind the farm shows.
    homeZoom() {
        return this.aspect > 1.2 ? 0.72 : 1;
    }
    baseY() {
        return this.aspect < 0.8 ? 1.1 : this.aspect > 1.2 ? -3.3 : -0.3;
    }
    resetZoom() {
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
        const INSIDE = !!sim2.insideTower,
            KEY = INSIDE ? `in${sim2.tower?.floor}` : 'out',
            MARCHING = sim2.farmBossEvent?.phase === 'marching';
        if (this.sceneKey === undefined) {
            this.sceneKey = KEY;
            this.sceneChangedAt = -1e9;
            this.towerShotUntil = 0;
        } else if (KEY !== this.sceneKey) {
            const WAS_INSIDE = this.sceneKey !== 'out';
            this.sceneKey = KEY;
            this.sceneChangedAt = now;
            if (INSIDE && !WAS_INSIDE) {
                this.fitHall();
            } else if (!INSIDE) {
                this.towerShotUntil = now + 2600;
            }
        }
        if (MARCHING || now < this.towerShotUntil) {
            const ZOOM_TARGET = this.aspect > 1.2 ? 0.55 : 0.8;
            this.zoom += (ZOOM_TARGET - this.zoom) * 0.07;
            this.configure(this.scene, true);
            const BASE_Y = this.baseY(),
                TARGET_Y = -0.2 * this.view[1] - WORLD_DEPTH_PROJECTION * CONFIG.farm.arena.radiusY - BASE_Y;
            this.setPan(this.pan.x * 0.9, this.pan.y + (TARGET_Y - this.pan.y) * 0.07);
            this.cameraReturning = true;
        } else if (this.cameraReturning && !INSIDE) {
            this.zoom += (this.homeZoom() - this.zoom) * 0.1;
            this.configure(this.scene, true);
            this.setPan(this.pan.x * 0.9, this.pan.y * 0.9);
            if (Math.abs(this.zoom - this.homeZoom()) < 0.01 && Math.abs(this.pan.y) < 0.05) {
                this.resetZoom();
                this.cameraReturning = false;
            }
        } else if (INSIDE) {
            this.cameraReturning = false;
            this.fitHall();
        }
    }
    // Inside the tower the whole hall is always in view: no panning or zooming, so tapping anywhere deploys.
    fitHall() {
        const { radiusX: RX, radiusY: RY } = CONFIG.farm.arena,
            BASE = this.scenePresentation.cameraView(this.aspect),
            FIT = Math.min(BASE[0] / (RX + 1), BASE[1] / (RY * WORLD_DEPTH_PROJECTION + 3.5));
        if (Math.abs(this.zoom - FIT) > 1e-6) {
            this.zoom = FIT;
            this.configure(this.scene, true);
        }
        this.setPan(0, 0);
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
        const PRESENTATION = this.scenePresentation;
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
        this.directCamera(sim2, now);
        const C = this.ctx,
            PRESENTATION = this.scenePresentation;
        PRESENTATION.collectJoy(sim2, this.joyEffects);
        C.beginFrame({
            width: this.canvas.width,
            height: this.canvas.height,
            clearColor: [0.9, 0.92, 0.87, 1],
        });
        this.terrain(sim2, now);
        const SIDES = sim2.insideTower || sim2.scene !== 'farm';
        for (const U of sim2.units) {
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
        const BOSS_VISIBLE = PRESENTATION.bossVisible(sim2);
        if (BOSS_VISIBLE) {
            this.groundEllipse(sim2.boss.x, sim2.boss.y, sim2.boss.radius * 1.05, sim2.boss.radius * 0.75, '#38472c33');
            if (SIDES) {
                this.ring(sim2.boss.x, sim2.boss.y, sim2.boss.radius * 1.05, '#f0463c', 0.12);
            }
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
        this.drawSceneFade(sim2, now);
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
