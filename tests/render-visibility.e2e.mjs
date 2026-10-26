// Exact native WebGL pixels and animation poses for identical render snapshots.
// A test-only server removes the app's automatic RAF registration on both sides;
// simulation equivalence/performance are measured by separate paired scenarios.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url))),
    BASE = process.env.PERFORMANCE_BASE_ROOT || path.resolve(ROOT, '../baseline'),
    KIND = process.argv[2] || 'desktop',
    VIEWPORTS = {
        desktop: { width: 1280, height: 800 },
        portrait: { width: 390, height: 844 },
        landscape: { width: 844, height: 390 },
    },
    VIEWPORT = VIEWPORTS[KIND],
    OUTPUT = path.join(ROOT, 'tests/output/render-visibility', KIND),
    ROOTS = { base: BASE, candidate: ROOT },
    MODULES = new Map(),
    ERRORS = [],
    REPORT = {
        status: 'running',
        viewport: KIND,
        baseCommit: '881fd7c9b97efc00ca2e2a46c1ee5b069f7ccdfe',
        scope: 'Identical controlled render DTOs, native SVG players and WebGL readPixels in one browser process.',
        limitations: [
            'Controlled render snapshots exercise presentation boundaries, not natural combat outcomes.',
            'SwiftShader with touch/CSS viewport emulation; no hardware GPU or physical mobile FPS claim.',
            'Bosses, complex projectiles and attachment targets may intentionally remain uncullable.',
        ],
        checks: [],
        captures: [],
    },
    TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
assert.ok(VIEWPORT, 'desktop, portrait or landscape');
assert.notEqual(fs.realpathSync(BASE), fs.realpathSync(ROOT));
REPORT.sources = {};
for (const FILE of ['index.html', 'src/farm-renderer.js', 'src/farm-render-units.js', 'src/farm-session.js']) {
    const HASH = (bytes) => createHash('sha256').update(bytes).digest('hex'),
        EXPECTED = HASH(
            execFileSync('git', ['show', `${REPORT.baseCommit}:${FILE}`], { cwd: ROOT, maxBuffer: 8 * 1024 * 1024 }),
        ),
        BASE_HASH = HASH(fs.readFileSync(path.join(BASE, FILE)));
    assert.equal(BASE_HASH, EXPECTED, `immutable baseline ${FILE}`);
    REPORT.sources[FILE] = { base: BASE_HASH, candidate: HASH(fs.readFileSync(path.join(ROOT, FILE))) };
}
fs.mkdirSync(OUTPUT, { recursive: true });
const DEADLINE = setTimeout(() => {
    console.error('Render visibility scenario exceeded 180 seconds');
    process.exit(1);
}, 180000);
const SERVER = http.createServer((request, response) => {
    const URL_LOCAL = new URL(request.url, 'http://localhost'),
        MATCH = URL_LOCAL.pathname.match(/^\/(base|candidate)\/(.*)$/),
        DIRECTORY = MATCH && ROOTS[MATCH[1]],
        FILE = DIRECTORY && path.resolve(DIRECTORY, MATCH[2] || 'index.html');
    if (URL_LOCAL.pathname === '/favicon.ico') {
        response.writeHead(204).end();
        return;
    }
    if (!FILE || !FILE.startsWith(DIRECTORY + path.sep) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(404).end();
        return;
    }
    let bytes = fs.readFileSync(FILE);
    if (FILE === path.join(DIRECTORY, 'src/farm-app.js')) {
        const SOURCE = bytes.toString('utf8');
        assert.equal(SOURCE.match(/requestAnimationFrame\(frame\);/g)?.length, 2);
        bytes = Buffer.from(SOURCE.replaceAll('requestAnimationFrame(frame);', '/* test owns explicit frames */'));
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(bytes);
});
let browser;
try {
    const MANIFEST = JSON.parse(
        fs
            .readFileSync(path.join(ROOT, 'index.html'), 'utf8')
            .match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
    );
    for (const MODULE of MANIFEST.modules) {
        const BYTES = fs.readFileSync(path.join(ROOT, 'vendor/upstream', MODULE.name + '.js'));
        assert.equal(createHash('sha256').update(BYTES).digest('hex'), MODULE.sha256);
        MODULES.set(MODULE.url, BYTES);
    }
    await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
    const ORIGIN = `http://127.0.0.1:${SERVER.address().port}`;
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    REPORT.browser = browser.version();
    REPORT.platform = process.platform;
    const PAGES = {};
    for (const VARIANT of ['base', 'candidate']) {
        const CONTEXT = await browser.newContext({
            viewport: VIEWPORT,
            deviceScaleFactor: 1,
            hasTouch: KIND !== 'desktop',
            isMobile: KIND !== 'desktop',
            serviceWorkers: 'block',
        });
        await CONTEXT.route('**/*', (route) => {
            const URL_LOCAL = route.request().url();
            if (URL_LOCAL.startsWith(ORIGIN)) {
                return route.continue();
            }
            if (MODULES.has(URL_LOCAL)) {
                return route.fulfill({
                    body: MODULES.get(URL_LOCAL),
                    contentType: 'text/javascript',
                    headers: { 'access-control-allow-origin': '*' },
                });
            }
            return route.abort();
        });
        const PAGE = await CONTEXT.newPage();
        PAGE.setDefaultTimeout(20000);
        PAGE.on('pageerror', (error) => ERRORS.push(`${VARIANT}: ${error}`));
        await PAGE.goto(`${ORIGIN}/${VARIANT}/index.html`);
        await PAGE.waitForFunction(() => Boolean(globalThis.BUDMORI));
        await PAGE.evaluate(async () => {
            const { Garden: GARDEN } = await import('./src/farm-model.js'),
                { FarmSession: SESSION } = await import('./src/farm-session.js'),
                { WORLD_HEIGHT_PROJECTION: HEIGHT, WORLD_DEPTH_PROJECTION: DEPTH } =
                    await import('./src/vector-sockets.js'),
                R = BUDMORI.renderer;
            const STATE = (globalThis.__visibility = {
                r: R,
                w: null,
                d: null,
                refs: new Map(),
                time: 100000,
                captures: [],
            });
            STATE.setup = (tower) => {
                const W = new GARDEN(731);
                W.resetUnits();
                W.setWorkBasisPoints(0);
                W.time = 100;
                for (let i = 0; i < 27; i++) {
                    const U = W.spawn(i % 9, (i % 6) + 1, ((i % 9) - 4) * 1.4, (Math.floor(i / 9) - 1) * 2);
                    U.growthElapsed = U.growthDuration;
                    U.dropLanded = true;
                    U.vx = U.vy = U.vz = U.z = 0;
                }
                if (tower) {
                    if (!W.startTower(1) || !W.finishMarch()) {
                        throw new Error('Native tower fixture failed');
                    }
                    W._benched.clear();
                    W._benchRevision++;
                    W.farmBossEvent.phase = 'fighting';
                    Object.assign(W.boss, { z: 0, dropLanded: true, stun: 0, x: 0, y: 3 });
                }
                const S = new SESSION(W);
                S.captureClock = () => 100000;
                S.capturePresentation('reset');
                const SAMPLE = S.presentation(100050),
                    D = Object.create(W, {
                        units: { value: structuredClone(SAMPLE.units), writable: true },
                        bosses: { value: structuredClone(SAMPLE.bosses), writable: true },
                        boss: { value: structuredClone(SAMPLE.boss), writable: true },
                    });
                Object.assign(D, {
                    time: 100,
                    displayTimeMs: 100000,
                    presentationRevision: 1,
                    food: [],
                    effects: [],
                    projectiles: [],
                    formationEffects: [],
                    formationSlots: [],
                    bossSlots: [],
                    formationInjuredAllies: new Map(),
                    cornAttachments: { groups: [] },
                });
                STATE.w = W;
                STATE.d = D;
                STATE.original = structuredClone(D.units);
                STATE.cameraPositions = null;
                STATE.time = 100000;
                R.render(D, null, STATE.time);
                R.sceneChangedAt = -1e9;
                R.towerShotUntil = 0;
                R.cameraReturning = false;
                R.resetZoom();
                STATE.refs = new Map(R.vectorPlayers);
            };
            STATE.place = (unit, x, y, z = 0) => {
                unit.x = x / R.scale - R.offset[0] - R.view[0];
                unit.y = (R.view[1] - y / R.scale - R.offset[1]) / DEPTH;
                unit.z = z;
            };
            STATE.resetUnits = () => {
                STATE.d.units.forEach((unit, index) => Object.assign(unit, structuredClone(STATE.original[index])));
                STATE.d.effects = [];
                STATE.d.projectiles = [];
                STATE.d.cornAttachments.groups.length = 0;
            };
            STATE.render = async (name, capture = false, poses = true) => {
                STATE.time += 50;
                STATE.d.time = STATE.time / 1000;
                STATE.d.displayTimeMs = STATE.time;
                R.render(STATE.d, null, STATE.time);
                const GL = R.device.gl,
                    PIXELS = new Uint8Array(R.canvas.width * R.canvas.height * 4);
                GL.readPixels(0, 0, R.canvas.width, R.canvas.height, GL.RGBA, GL.UNSIGNED_BYTE, PIXELS);
                const PNG = capture ? R.canvas.toDataURL('image/png').split(',')[1] : null,
                    DIGEST = await crypto.subtle.digest('SHA-256', PIXELS),
                    HEX = [...new Uint8Array(DIGEST)].map((v) => v.toString(16).padStart(2, '0')).join('');
                return {
                    name,
                    pixels: HEX,
                    png: PNG,
                    size: [R.canvas.width, R.canvas.height],
                    units: STATE.d.units.length,
                    visible: R.visibleUnits?.length ?? STATE.d.units.length,
                    actors: R.actors.length,
                    stats: R.stats,
                    camera: { zoom: R.zoom, pan: R.cameraPan, scale: R.scale, manual: R.manualCamera },
                    players: STATE.d.units.map((unit) => {
                        const PLAYER = R.vectorPlayers.get(unit.id);
                        return {
                            id: unit.id,
                            species: unit.species,
                            clip: PLAYER?.currentClip,
                            samePlayer: PLAYER === STATE.refs.get(unit.id),
                            ...(poses ? { time: PLAYER?.currentTimeMs, body: PLAYER?.getPartPose('body') } : {}),
                        };
                    }),
                };
            };
            STATE.boundary = (edge, special = false) => {
                STATE.resetUnits();
                R.takeCameraControl();
                R.zoom = 1.8;
                R.configure('farm', true);
                R.setPan(R.panLimits.minX * 0.25, R.panLimits.maxY * 0.25);
                const W = R.canvas.width,
                    H = R.canvas.height;
                STATE.d.units.forEach((unit, index) => {
                    const POSITION = ((index % 9) + 0.5) / 9,
                        OUT = Math.floor(index / 9),
                        GAP = OUT === 0 ? -4 : OUT === 1 ? -35 : -800,
                        X = edge === 'left' ? GAP : edge === 'right' ? W - GAP : POSITION * W,
                        Y = edge === 'top' ? GAP : edge === 'bottom' ? H - GAP : POSITION * H;
                    STATE.place(unit, X, Y);
                    unit.vx = index % 2;
                    if (special && OUT < 2) {
                        unit.giantUntil = STATE.time / 1000 + 20;
                        unit.giantSizeMultiplier = 3;
                        unit.bodyScale *= 3;
                        unit.size *= 3;
                        unit.radius *= 3;
                        unit.height *= 3;
                    }
                });
            };
            STATE.splitHeight = () => {
                STATE.boundary('bottom');
                const W = R.canvas.width,
                    H = R.canvas.height;
                STATE.d.units.forEach((unit, index) => {
                    // First row: visible ground shadow, body far above viewport.
                    // Second: ground below viewport while airborne body is visible.
                    const ROW = Math.floor(index / 9),
                        Y = ROW === 0 ? H * 0.5 : ROW === 1 ? H + 300 : H + 2000,
                        Z = ROW === 0 ? (H + 400) / (R.scale * HEIGHT) : 400 / (R.scale * HEIGHT);
                    STATE.place(unit, (((index % 9) + 0.5) * W) / 9, Y, Z);
                });
            };
            STATE.special = () => {
                STATE.boundary('right', true);
                const D = STATE.d,
                    W = R.canvas.width,
                    H = R.canvas.height;
                D.units.forEach((unit, index) => {
                    if (index < 9) {
                        STATE.place(unit, W - 8, ((index + 0.5) * H) / 9);
                        unit.isFormationClone = index % 2 === 0;
                        unit.cloneParentId = D.units[(index + 1) % 9].id;
                        unit.cloneBornAt = D.time - 0.2;
                    } else if (index < 18) {
                        STATE.place(unit, 8, (((index % 9) + 0.5) * H) / 9);
                        unit.hp = 0;
                        unit.down = 20;
                    }
                });
                const TARGET = D.units[0];
                D.cornAttachments.groups.push({
                    id: 1,
                    targetId: TARGET.id,
                    targetGeneration: TARGET.generation,
                    targetX: TARGET.x,
                    targetY: TARGET.y,
                    targetZ: TARGET.z,
                    firstAttachTick: 0,
                    closeAtTick: 20,
                    attachments: [{ id: 1, ownerId: 1, ownerGeneration: 0, status: 'attached', angle: 0 }],
                });
                // The hammer contact belongs to a distant committed point, not its owner center.
                const HAMMER = D.units[23],
                    CENTER = D.units[4];
                Object.assign(HAMMER.ability, {
                    walnutForm: 6,
                    walnutImpactLife: 0.8,
                    walnutPointX: CENTER.x,
                    walnutPointY: CENTER.y,
                });
            };
            STATE.weapons = () => {
                STATE.boundary('left', true);
                for (const UNIT of STATE.d.units) {
                    if (UNIT.species < 6) {
                        continue;
                    }
                    const PREFIX = ['rice', 'wheat', 'barley'][UNIT.species - 6],
                        CLIP = Object.keys(R.vectorAssets.get(UNIT.species).compiled.metadata.clips).find((name) =>
                            name.startsWith(`fire-${PREFIX}-ready-`),
                        ),
                        STAGE = CLIP.split('-').at(-1),
                        A = UNIT.ability;
                    Object.assign(A, { phase: 'active', elapsed: 0.1 });
                    A[PREFIX + 'Form'] = 6;
                    A[PREFIX + 'ActionId'] = UNIT.id;
                    A[PREFIX + 'PreviousStage'] = 'ready';
                    A[PREFIX + 'Stage'] = STAGE;
                    A[PREFIX + 'FirstStage'] = STAGE;
                    A[PREFIX + 'LastStage'] = STAGE;
                    A[PREFIX + 'StageProgress'] = 0.5;
                    A[PREFIX + 'PointX'] = UNIT.x + 0.5;
                    A[PREFIX + 'PointY'] = UNIT.y;
                    A[PREFIX + 'Face'] = -1;
                    A[PREFIX + 'RecoveryDuration'] = 0.6;
                    A.wheatLongBaton = true;
                }
            };
            STATE.effects = () => {
                STATE.boundary('left');
                const D = STATE.d;
                for (const [INDEX, KIND_LOCAL] of [
                    'impact',
                    'land',
                    'drop-dust',
                    'food-land',
                    'eat',
                    'thresh',
                    'landing-shockwave',
                    'walnut-shockwave',
                ].entries()) {
                    for (const X of [-3, -1000]) {
                        const POINT = {};
                        STATE.place(POINT, X, ((INDEX + 0.5) * R.canvas.height) / 8);
                        D.effects.push({
                            kind: KIND_LOCAL,
                            x: POINT.x,
                            y: POINT.y,
                            z: 0.5,
                            life: 0.2,
                            radius: 2,
                            big: true,
                        });
                    }
                }
                const START = {},
                    END = {};
                STATE.place(START, -80, R.canvas.height * 0.45);
                STATE.place(END, 80, R.canvas.height * 0.45);
                for (const [INDEX, FORM] of [0, 5].entries()) {
                    D.projectiles.push({
                        id: 3000 + INDEX,
                        species: 1,
                        x: START.x,
                        y: START.y,
                        z: 0.8,
                        height: 0.3,
                        radius: 0.15,
                        cornForm: FORM,
                        cornSlot: INDEX,
                        elapsed: 0.5,
                        path: {
                            from: { x: START.x - 3, y: START.y, z: 1 },
                            to: { x: END.x, y: END.y, z: 0 },
                            duration: 1,
                            height: 2,
                        },
                    });
                }
            };
            STATE.clock = (phase, visible) => {
                const D = STATE.d;
                D.effects = [];
                D.projectiles = [];
                D.cornAttachments.groups.length = 0;
                D.units.forEach((unit, index) => {
                    STATE.place(
                        unit,
                        visible ? (((index % 9) + 0.5) * R.canvas.width) / 9 : -2000,
                        ((Math.floor(index / 9) + 1) * R.canvas.height) / 4,
                    );
                    unit.z = 0;
                    unit.vx = phase === 'walk' ? 1 : 0;
                    unit.vy = 0;
                    unit.hp = 100;
                    unit.down = 0;
                    unit.stun = 0;
                    unit.bounce = 0;
                    unit.dropLanded = true;
                    unit.ability.phase = ['windup', 'active', 'recover'].includes(phase) ? phase : 'idle';
                    unit.ability.elapsed = 0.12;
                    // Generic authored attack clips still exercise offscreen action clocks.
                    for (const NAME of ['pea', 'redbean', 'chestnut', 'peanut', 'walnut', 'rice', 'wheat', 'barley']) {
                        unit.ability[NAME + 'Form'] = 0;
                    }
                });
            };
            STATE.cameraClock = (phase, visible) => {
                if (!STATE.cameraPositions) {
                    R.takeCameraControl();
                    R.zoom = 1.8;
                    R.configure('farm', true);
                    R.setPan(0, 0);
                    STATE.clock('idle', true);
                    STATE.cameraPositions = STATE.d.units.map((unit) => ({ x: unit.x, y: unit.y, z: unit.z }));
                    STATE.returnPan = R.cameraPan;
                }
                STATE.clock(phase, true);
                STATE.d.units.forEach((unit, index) => Object.assign(unit, STATE.cameraPositions[index]));
                R.takeCameraControl();
                if (visible) {
                    R.setPan(STATE.returnPan.x, STATE.returnPan.y);
                } else {
                    R.setPan(R.panLimits.minX, R.panLimits.maxY);
                }
            };
        });
        PAGES[VARIANT] = PAGE;
    }
    const COMPARE = async (name, setup, { capture = false, poses = false, culls = false } = {}) => {
        const RESULTS = {};
        for (const VARIANT of ['base', 'candidate']) {
            if (setup) {
                await PAGES[VARIANT].evaluate(setup);
            }
            const RESULT = await PAGES[VARIANT].evaluate(
                ({ name: n, capture: c, poses: p }) => globalThis.__visibility.render(n, c, p),
                { name, capture, poses },
            );
            if (RESULT.png) {
                const FILE = `${VARIANT}-${name}.png`;
                fs.writeFileSync(path.join(OUTPUT, FILE), Buffer.from(RESULT.png, 'base64'));
                REPORT.captures.push(FILE);
            }
            delete RESULT.png;
            RESULTS[VARIANT] = RESULT;
        }
        REPORT.checks.push({ name, ...RESULTS });
        fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
        assert.deepEqual(RESULTS.candidate.camera, RESULTS.base.camera, `${name}: identical camera`);
        assert.equal(RESULTS.candidate.pixels, RESULTS.base.pixels, `${name}: exact WebGL pixels`);
        assert.deepEqual(RESULTS.candidate.players, RESULTS.base.players, `${name}: clip/instance/pose equality`);
        if (poses) {
            assert.ok(
                RESULTS.candidate.players.every((player) => player.samePlayer),
                `${name}: native players survived invisibility`,
            );
        }
        if (culls) {
            assert.ok(
                RESULTS.candidate.visible < RESULTS.base.visible,
                `${name}: invisible units were actually omitted`,
            );
        }
        console.log(
            `[visibility ${KIND}] ${name}: pixels/players equal, ${RESULTS.base.visible} -> ${RESULTS.candidate.visible} visible`,
        );
    };
    for (const TOWER of [false, true]) {
        for (const PAGE of Object.values(PAGES)) {
            await PAGE.evaluate((tower) => globalThis.__visibility.setup(tower), TOWER);
        }
        const SCENE = TOWER ? 'tower' : 'farm';
        await COMPARE(`${SCENE}-default`, null, { capture: true });
        for (const EDGE of ['left', 'right', 'top', 'bottom']) {
            for (const PAGE of Object.values(PAGES)) {
                await PAGE.evaluate((edge) => globalThis.__visibility.boundary(edge), EDGE);
            }
            await COMPARE(`${SCENE}-${EDGE}`, null, { capture: EDGE === 'left', culls: true });
        }
        await COMPARE(`${SCENE}-height-split`, () => globalThis.__visibility.splitHeight(), {
            capture: true,
            culls: true,
        });
        await COMPARE(`${SCENE}-giant-clone-sleep-corn`, () => globalThis.__visibility.special(), { capture: true });
        await COMPARE(`${SCENE}-weapons`, () => globalThis.__visibility.weapons(), { capture: true });
        await COMPARE(`${SCENE}-effects-projectiles`, () => globalThis.__visibility.effects(), {
            capture: true,
            culls: true,
        });
        for (const PAGE of Object.values(PAGES)) {
            await PAGE.evaluate(() => globalThis.__visibility.resetUnits());
        }
        for (const [INDEX, PHASE] of ['idle', 'walk', 'idle', 'windup', 'active', 'recover', 'idle'].entries()) {
            const VISIBLE = INDEX === 0 || INDEX === 2 || INDEX === 6;
            for (const PAGE of Object.values(PAGES)) {
                await PAGE.evaluate(({ phase, visible }) => globalThis.__visibility.clock(phase, visible), {
                    phase: PHASE,
                    visible: VISIBLE,
                });
            }
            await COMPARE(`${SCENE}-clock-${INDEX}-${PHASE}`, null, {
                poses: VISIBLE,
                capture: INDEX === 6,
                culls: !VISIBLE,
            });
        }
        for (const [INDEX, PHASE] of ['idle', 'walk', 'idle', 'windup', 'active', 'recover', 'idle'].entries()) {
            const VISIBLE = INDEX === 0 || INDEX === 2 || INDEX === 6;
            for (const PAGE of Object.values(PAGES)) {
                await PAGE.evaluate(({ phase, visible }) => globalThis.__visibility.cameraClock(phase, visible), {
                    phase: PHASE,
                    visible: VISIBLE,
                });
            }
            await COMPARE(`${SCENE}-camera-clock-${INDEX}-${PHASE}`, null, {
                poses: VISIBLE,
                capture: INDEX === 6,
                culls: !VISIBLE,
            });
        }
    }
    assert.deepEqual(ERRORS, []);
    REPORT.status = 'passed';
} catch (error) {
    REPORT.status = 'failed';
    REPORT.failure = error.stack;
    throw error;
} finally {
    REPORT.errors = ERRORS;
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
    await browser?.close();
    await new Promise((resolve) => SERVER.close(resolve));
    clearTimeout(DEADLINE);
}
