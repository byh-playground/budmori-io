// Actual source/SDK presentation contract. Fixtures are detached render DTOs;
// model actions, growth rules and protected refactor files are never changed.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUTPUT = path.join(ROOT, 'tests/output/seedling-motion');
const TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
};
const ERRORS = [];
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MANIFEST = JSON.parse(
    HTML.match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
);
const MODULES = new Map(
    MANIFEST.modules.map((item) => [item.url, fs.readFileSync(path.join(ROOT, 'vendor/upstream', item.name + '.js'))]),
);
const SERVER = http.createServer((request, response) => {
    const FILE = path.resolve(ROOT, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(request.url.includes('favicon.ico') ? 204 : 404).end();
        return;
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(fs.readFileSync(FILE));
});
await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
let browser;
try {
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        ...(process.env.BUDMORI_HARDWARE_RENDERING === '1'
            ? { ignoreDefaultArgs: ['--enable-unsafe-swiftshader'] }
            : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }),
    });
    const PAGE = await browser.newPage({ viewport: { width: 1100, height: 850 } });
    PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
    PAGE.on('console', (message) => {
        if (message.type() === 'error') {
            ERRORS.push(message.text());
        }
    });
    await PAGE.route(/cdn\.jsdelivr\.net\/gh\/byh-playground\/bloom-gamekit@/, (route) => {
        const BYTES = MODULES.get(route.request().url());
        return BYTES
            ? route.fulfill({
                  body: BYTES,
                  contentType: 'text/javascript',
                  headers: { 'access-control-allow-origin': '*' },
              })
            : route.abort();
    });
    await PAGE.goto(`http://127.0.0.1:${SERVER.address().port}/index.html`);
    await PAGE.waitForFunction(() => globalThis.BUDMORI);
    await PAGE.locator('#newGame').click();
    await PAGE.waitForFunction(
        () => BUDMORI.runtime.presentationView?.units.length && BUDMORI.renderer.vectorPlayers.size,
    );
    const RESULT = await PAGE.evaluate(async () => {
        const ATTACKS = await import('/src/features/unit-attacks/presentation.js');
        const { snapshot: SNAPSHOT } = await import('/src/save/farm-snapshot.js');
        const APP = BUDMORI;
        APP.runtime.paused = true;
        const R = APP.renderer,
            P = R.unitPresentation,
            WORLD = APP.sim;
        const MODEL_BEFORE = JSON.stringify(SNAPSHOT(WORLD));
        const BASE = APP.runtime.presentationView.units[0];
        const TRACE = [];
        const IDS = new Set();
        const CHECK = (value, message) => {
            if (!value) {
                throw new Error(message);
            }
        };
        const FIXTURE = (species, isSeedling, id = 100000 + species) => ({
            ...BASE,
            id,
            generation: 1,
            seed: 0.25,
            species,
            isSeedling,
            hp: 100,
            down: 0,
            z: 0,
            vx: 0,
            vy: 0,
            stun: 0,
            bounce: 0,
            dropLanded: true,
            walnutGuarding: species === 5,
            fed: true,
            ability: {
                ...BASE.ability,
                phase: 'windup',
                elapsed: 0.14,
                barleyForm: 1,
                barleyFirstStage: 'front',
                barleyPreviousStage: 'ready',
                barleyStage: 'front',
                barleyLastStage: 'front',
                barleyStageProgress: 0.5,
                barleyWindupDuration: 0.28,
                barleyRecoveryDuration: 0.62,
                wheatForm: 1,
                riceForm: 1,
                walnutForm: 1,
                chestnutForm: 1,
                redbeanForm: 1,
                peaForm: 1,
            },
        });
        const OBSERVE = (unit, expectedClip, native = false) => {
            IDS.add(unit.id);
            R.displayTimeMs += 17;
            const PREPARED = P.prepareVisibleUnit(unit, WORLD);
            const CLIPS = PREPARED.record.compiled.metadata.clips;
            CHECK(
                PREPARED.player.currentClip === expectedClip,
                `Unexpected clip ${PREPARED.player.currentClip}, expected ${expectedClip}`,
            );
            CHECK(!!CLIPS[expectedClip], 'Chosen clip must exist in the actual displayed asset');
            CHECK(PREPARED.hasPhaseClock === native, 'Common/native clock mismatch');
            const ELAPSED = Math.min(unit.ability.elapsed * 1000, CLIPS[expectedClip].durationMs);
            const CONTROL = globalThis.BloomGamekitVectorAssets.createVectorActor(R.ctx, PREPARED.record.compiled, {
                clip: expectedClip,
                startedAtMs: native ? 0 : R.displayTimeMs - ELAPSED,
            });
            CONTROL.setExpression(PREPARED.player.currentExpression);
            CONTROL.seek(native ? PREPARED.phaseTimeMs : R.displayTimeMs);
            const ACTUAL_POSE = PREPARED.player.getPartPose('body');
            const EXPECTED_POSE = CONTROL.getPartPose('body');
            const ERROR = Math.max(
                ...ACTUAL_POSE.transform.map((value, index) => Math.abs(value - EXPECTED_POSE.transform[index])),
            );
            CONTROL.dispose();
            CHECK(ERROR < 1e-6, 'Displayed common/native pose clock differs from its authored clip');
            TRACE.push({
                species: unit.species,
                isSeedling: unit.isSeedling,
                phase: unit.ability.phase,
                asset: PREPARED.record.compiled.sourcePath,
                clip: PREPARED.player.currentClip,
                nativeClock: PREPARED.hasPhaseClock,
                phaseTimeMs: PREPARED.phaseTimeMs,
                poseMaxError: ERROR,
                expression: PREPARED.player.currentExpression,
            });
            return PREPARED;
        };
        for (let species = 0; species < 10; species++) {
            const UNIT = FIXTURE(species, true);
            for (const [PHASE, CLIP] of [
                ['windup', 'windup'],
                ['active', 'fire'],
                ['recover', 'recover'],
            ]) {
                UNIT.ability.phase = PHASE;
                const PREPARED = OBSERVE(UNIT, CLIP);
                CHECK(
                    PREPARED.record.compiled.sourcePath === 'assets/troops/sprout.svg',
                    'Growing stage must keep sprout art',
                );
                CHECK(
                    !['guard', 'guard-attack'].includes(PREPARED.player.currentExpression),
                    'Mature guard expression leaked into sprout art',
                );
                CHECK(
                    ATTACKS.unitAttackPresentation(UNIT).groundOffset === undefined,
                    'Mature native offset leaked into seedling',
                );
            }
        }
        const BARLEY = FIXTURE(8, true, 200000);
        const GROWING = OBSERVE(BARLEY, 'windup');
        BARLEY.isSeedling = false;
        const MATURE = OBSERVE(BARLEY, 'windup-barley-front', true);
        CHECK(MATURE.player !== GROWING.player, 'Growth must replace the asset-owned player');
        CHECK(MATURE.record.compiled.sourcePath === 'assets/troops/barley.svg', 'Adult barley asset missing');
        CHECK(Math.abs(MATURE.phaseTimeMs - 500) < 1e-6, 'Adult barley normalized clock changed');
        BARLEY.ability.phase = 'active';
        OBSERVE(BARLEY, 'fire-barley-ready-front', true);
        BARLEY.ability.phase = 'recover';
        OBSERVE(BARLEY, 'recover-barley-front', true);
        const MATURE_SPROUT = FIXTURE(9, false, 200001);
        OBSERVE(MATURE_SPROUT, 'windup');
        MATURE_SPROUT.ability.phase = 'active';
        OBSERVE(MATURE_SPROUT, 'fire');
        CHECK(MODEL_BEFORE === JSON.stringify(SNAPSHOT(WORLD)), 'Presentation fixture changed simulation state');
        for (const ID of IDS) {
            R.vectorPlayers.get(ID)?.dispose();
            R.vectorPlayers.delete(ID);
            P.playerIdentities.delete(ID);
            P.preparedVisibleUnits.delete(ID);
        }
        APP.runtime.paused = false;
        const GL = R.device.gl,
            DEBUG = GL.getExtension('WEBGL_debug_renderer_info');
        return {
            trace: TRACE,
            modelUnchanged: true,
            renderer: GL.getParameter(DEBUG?.UNMASKED_RENDERER_WEBGL ?? GL.RENDERER),
            glError: GL.getError(),
        };
    });
    await PAGE.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(RESULT.trace.length, 36);
    assert.equal(RESULT.glError, 0);
    assert.deepEqual(ERRORS, []);
    fs.mkdirSync(OUTPUT, { recursive: true });
    const REPORT = {
        status: 'PASS',
        sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
        sourceDirty: !!execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim(),
        scope: 'Actual game boot and detached render-DTO contract fixtures; no user-save reproduction, simulation changes or performance measurement',
        ...RESULT,
        errors: ERRORS,
    };
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
    console.log(JSON.stringify(REPORT, null, 2));
} finally {
    await browser?.close();
    await new Promise((resolve) => SERVER.close(resolve));
}
