import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile, writeFile, mkdtemp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve, join} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import fontAssets from './font-asset-fixture.cjs';
import moduleReferences from './module-reference-fixture.cjs';
import runtimeSources from './runtime-source.cjs';

// Run with an optional candidate index.html path. No harness, SDK replacement,
// simulated time, or running-world edits: all actions below use the shipped UI.
const started = performance.now(), budgetMs = 180000, scenarioBudgetMs = 170000;
const sourceFile = resolve(process.argv[2] || fileURLToPath(new URL('../index.html', import.meta.url)));
const original = await readFile(sourceFile), html = original.toString('utf8');
const app = runtimeSources.read(sourceFile, html);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const artifact = name => fileURLToPath(new URL('./' + name, import.meta.url));
const reportPath = artifact('browser-report.json');
const report = {
  status: 'RUNNING', sourceFile, sourceSHA256: sha256(original), budgetMs, scenarioBudgetMs,
  nominalTargetMs: 60000, scheduler: 'production SDK timers and requestAnimationFrame',
  environment: 'local solo Chromium / SwiftShader; desktop and mobile emulation run sequentially',
  checks: [], screenshots: [], errors: [], unexpectedNetwork: [], fontAssetFixtures: [],
  coverageLimits: [
    'Initial camps and encounters are test-server fixtures; gameplay algorithms are unchanged.',
    'Combat means rendered damage on a durable target; death uses a separate lethal initial encounter.',
    'Save/load covers UI download, same-version file import, and local solo continuation after reload.',
    'No multiplayer, old-save migration, long campaign, real phone performance, or pixel comparison.',
  ],
};

// Inject only initial world contents, before the ordinary session is created.
// This does not wrap step/advance, stop a driver, change RNG/time, or expose a
// mutation API. UI reset/solo entry still run the production initialization path.
function fixtureResponse(encounter) {
  const fixture = `;(() => {
    globalThis.__testWorldRenderer=ctx;
    const devicePrototype=BloomGamekitRendering.WebGLDevice.prototype,endFrame=devicePrototype.endFrame;
    globalThis.__captureActualWorldPixels=false;globalThis.__actualWorldPixelSummary=null;
    devicePrototype.endFrame=function(...args){if(globalThis.__captureActualWorldPixels){globalThis.__captureActualWorldPixels=false;const gl=this.gl,w=this.canvas.width,h=this.canvas.height,pixels=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);const bg=pixels.subarray(0,4);let green=0,bright=0,different=0;for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2];if(g>r*1.15&&g>b*1.12)green++;if(r>215&&g>210&&b>180)bright++;if(Math.abs(r-bg[0])+Math.abs(g-bg[1])+Math.abs(b-bg[2])>36)different++}globalThis.__actualWorldPixelSummary={width:w,height:h,green,bright,different,error:gl.getError()}}return endFrame.apply(this,args)};
    const initialize = bloomInitialize;
    bloomInitialize = function(...args) {
      const result = initialize(...args);
      for (const camp of state.camps) {
        camp.enabled = false; camp.spawned = true; camp.regrowth = [];
      }
      for (const unit of state.units) if (unit.team === 'enemy') {
        unit.stun = 1e6; unit.aggroAt = unit.wanderAt = state.time + 1e6;
      }
      const m = state.mother;
      if (${JSON.stringify(encounter)} === 'recovery') {
        const point = ThemedTerrain.safePoint(m.x + 500, m.y, m.size + 4);
        SpatialPosition.constrain(m, point.x, point.y); spatialUnit(m, true);
        m.hp = 1;
        for (const unit of state.units) if (unit.team === 'friendly') unit.stun = 1e6;
        for (const [dx, dy] of [[24, 0], [-24, 0], [0, 24]]) {
          const enemy = spawn('swordsman', 'enemy', m.x + dx, m.y + dy,
            {camp: 0, rarityGrade: 5, hpScale: 20, attackScale: 10});
          if (!enemy) throw Error('Cannot place initial lethal encounter');
          enemy.cooldown = 0; enemy.aggroAt = 0; engageEnemy(enemy, m);
          state.camps[0].remaining++;
        }
      } else {
        const enemy = spawn('shellbug', 'enemy', m.x + 65, m.y,
          {camp: 0, rarityGrade: 1, hpScale: 1000});
        if (!enemy) throw Error('Cannot place initial durable encounter');
        enemy.stun = 1e6; enemy.aggroAt = enemy.wanderAt = state.time + 1e6;
        state.camps[0].remaining++;
        globalThis.__playerScenarioEncounterId = enemy.id;
      }
      rebuildGrid(); spatialBoundary();
      return result;
    };
  })();`;
  const marker = '/* MAIN_RUNTIME_TEST_HOOK */';
  assert(app.game.includes(marker), 'Candidate game source must provide the fixture insertion point');
  return runtimeSources.response(app, app.game.replace(marker, () => fixture));
}
const responses = {'/solo': fixtureResponse('solo'), '/recovery': fixtureResponse('recovery')};
report.gameSourceSHA256 = sha256(app.game);
report.testResponseSHA256 = Object.fromEntries(Object.entries(responses).map(([route, body]) => [route, sha256(body.html + body.game)]));
const server = createServer(runtimeSources.serve(responses));
let browser, page, activeContext, deadlineTimer;
const remaining = () => Math.max(1, scenarioBudgetMs - (performance.now() - started));
async function bounded(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(Error(label + ' exceeded ' + ms + 'ms')), ms);
    })]);
  } finally { clearTimeout(timer); }
}
function healthy() {
  assert.deepEqual(report.errors, [], 'Browser errors');
  assert.deepEqual(report.unexpectedNetwork, [], 'Solo scenario attempted external networking');
}
async function check(name, operation) {
  const at = performance.now();
  await operation(); healthy();
  report.checks.push({name, elapsedMs: Math.round(performance.now() - at)});
  console.log('PASS ' + name);
}
const read = (fn, arg) => bounded(page.evaluate(fn, arg), Math.min(5000, remaining()), 'UI/render observation');
const wait = (fn, arg, timeout = 8000) => page.waitForFunction(fn, arg, {timeout: Math.min(timeout, remaining())});
const mother = () => read(() => {
  const model = projectionQueue.find(q => q.kind === 'mother' && q.source.id === -1)?.source;
  return model ? {x: model.x, y: model.y, hp: model.hp} : null;
});
const moved = async before => {
  await wait(p => {
    const m = projectionQueue.find(q => q.kind === 'mother' && q.source.id === -1)?.source;
    return m && Math.hypot(m.x - p.x, m.y - p.y) > 10;
  }, before, 5000);
  assert(await mother(), 'The moved local character remains in the actual actor render pass');
};
async function screenshot(name) {
  const path = artifact(name);
  await page.screenshot({path, timeout: Math.min(5000, remaining())});
  report.screenshots.push(path);
}
async function webglPixels(){
  await page.evaluate(()=>{globalThis.__actualWorldPixelSummary=null;globalThis.__captureActualWorldPixels=true});
  await wait(()=>!!globalThis.__actualWorldPixelSummary,null,5000);
  return page.evaluate(()=>globalThis.__actualWorldPixelSummary);
}
async function openPause() {
  await page.locator('#pause').click();
  await page.locator('#modal.show #sheet [data-ux="settings"]').waitFor({state: 'visible'});
  await page.waitForTimeout(350); // Let the last real rendered movement settle.
}
async function resume() {
  await page.locator('#modal.show #sheet .primary[data-action="close"]').click();
  await page.locator('#modal.show').waitFor({state: 'hidden'});
}
async function settings() {
  await openPause();
  await page.locator('#sheet [data-ux="settings"]').click();
  await page.locator('#sheet [data-action="export"]').waitFor({state: 'visible'});
}
async function newPlayer(options, route) {
  activeContext = await browser.newContext({...options, acceptDownloads: true});
  await activeContext.route('**/*', request => {
    if (new URL(request.request().url()).origin === base) return request.continue();
    report.unexpectedNetwork.push(request.request().url().slice(0, 300));
    return request.abort();
  });
  report.fontAssetFixtures.push(await fontAssets.install(activeContext));
  await moduleReferences.install(activeContext, html);
  await activeContext.routeWebSocket('**/*', socket => {
    report.unexpectedNetwork.push(socket.url().slice(0, 300));
    socket.close();
  });
  page = await activeContext.newPage();
  page.setDefaultTimeout(8000); page.setDefaultNavigationTimeout(30000);
  page.on('pageerror', error => report.errors.push(String(error).slice(0, 1000)));
  page.on('console', message => {
    if (message.type() === 'error') report.errors.push(message.text().slice(0, 1000));
  });
  await page.goto(base + route, {waitUntil: 'domcontentloaded'});
  await wait(() => globalThis.BloomSimulation?.runtime?.ready &&
    document.querySelector('#view')?.dataset.rendererBackend === 'WebGL', null, 30000);
  await page.locator('#sheet [data-public="solo"]').click();
  await page.locator('#modal.show').waitFor({state: 'hidden'});
}
let base;
async function scenario() {
  await new Promise((resolveListen, reject) => {
    server.once('error', reject); server.listen(0, '127.0.0.1', resolveListen);
  });
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({
    headless: true, timeout: Math.min(30000, remaining()),
    ...(process.env.CHROMIUM_EXECUTABLE_PATH ? {executablePath: process.env.CHROMIUM_EXECUTABLE_PATH} : {}),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
  await check('Desktop solo entry and real automatic combat', async () => {
    await newPlayer({viewport: {width: 920, height: 700}, deviceScaleFactor: 1}, '/solo');
    await wait(() => {
      const target = projectionQueue.find(q => q.kind === 'unit' && q.source.id === globalThis.__playerScenarioEncounterId)?.source;
      return target && target.hp > 0 && target.hp < target.maxHp;
    });
    assert(await mother(), 'The local character is rendered during combat');
    assert.match(await page.locator('#motherHealth').innerText(), /HP/);
    await screenshot('browser-combat.png');
    const pixels=await webglPixels();report.worldPixels=pixels;assert.equal(pixels.error,0);assert.ok(pixels.green>pixels.width*pixels.height*.5,`Terrain is present in actual WebGL pixels: ${JSON.stringify(pixels)}`);assert.ok(pixels.bright>100,'Unit art, combat text, or world labels are present in actual WebGL pixels');assert.ok(pixels.different>pixels.width*pixels.height*.05,'The WebGL framebuffer contains drawn scene variation');
    // Fusion fading writes ctx.globalAlpha around RallyArt.draw; sample the same production boundary plus the production white-flash outline through the actual WebGL target.
    const artPixels=await page.evaluate(()=>{const c=__testWorldRenderer,gl=c.gl,canvas=c.canvas;c.beginFrame();c.save();c.setTransform(1,0,0,1,0,0);c.device.clear({color:[0,0,1,1]});c.globalAlpha=.5;RallyArt.draw(c,'swordsman','friendly',canvas.width/2,canvas.height/2,24,0,0,{gradeOutline:'#ff3020',whiteFlash:true});c.globalAlpha=1;c.vector.flush();const side=96,p=new Uint8Array(side*side*4),x=Math.floor((canvas.width-side)/2),y=Math.floor((canvas.height-side)/2);gl.readPixels(x,y,side,side,gl.RGBA,gl.UNSIGNED_BYTE,p);let maxRed=0,redBias=0,visible=0;for(let i=0;i<p.length;i+=4){maxRed=Math.max(maxRed,p[i]);if(p[i]>20&&p[i]>p[i+1]+8)redBias++;if(p[i]>35&&p[i+1]>35)visible++}const error=gl.getError();c.restore();c.endFrame();return{maxRed,redBias,visible,error}});assert.equal(artPixels.error,0);assert.ok(artPixels.maxRed<=132&&artPixels.redBias===0&&artPixels.visible>100,`Game art white flash and 0.5 object fade are one WebGL composition: ${JSON.stringify(artPixels)}`);report.artPixelProbe=artPixels;
    report.artPixelProbe=artPixels;
  });
  await check('WASD movement, pause freeze, Escape resume, and keyboard roll', async () => {
    const before = await mother();
    await page.keyboard.down('KeyD');
    try { await moved(before); } finally { await page.keyboard.up('KeyD'); }
    await openPause();
    const frozen = await mother();
    await page.keyboard.down('KeyD');
    try {
      await page.waitForTimeout(350);
      const after = await mother();
      assert(Math.hypot(after.x - frozen.x, after.y - frozen.y) < 1, 'Solo pause keeps the rendered character still');
    } finally { await page.keyboard.up('KeyD'); }
    await page.keyboard.press('Escape');
    await page.locator('#modal.show').waitFor({state: 'hidden'});
    const from = await mother();
    await page.keyboard.down('KeyA');
    try {
      await page.keyboard.press('Space');
      await wait(() => document.querySelector('#rollStatus')?.dataset.ready === 'false', null, 5000);
      await wait(p => projectionQueue.some(q => q.kind === 'mother' && q.source.id === -1 && q.source.x < p.x - 10), from, 5000);
    } finally { await page.keyboard.up('KeyA'); }
    await wait(() => document.querySelector('#rollStatus')?.dataset.ready === 'true', null, 5000);
    const left = await mother();
    await page.keyboard.down('KeyD');
    try {
      await wait(p => projectionQueue.some(q => q.kind === 'mother' && q.source.id === -1 && q.source.x > p.x + 10), left, 5000);
    } finally { await page.keyboard.up('KeyD'); }
  });
  await check('Mouse double-click roll through the canvas', async () => {
    const before = await mother();
    await page.locator('#view').dblclick({position: {x: 650, y: 380}, delay: 40});
    await wait(() => document.querySelector('#rollStatus')?.dataset.ready === 'false', null, 5000);
    await moved(before);
    await screenshot('browser-desktop.png');
  });
  await check('Settings save, downloaded backup import, and solo continuation after reload', async () => {
    // Ordinary keyboard movement ends the click route before saving, so reload
    // resumes a stationary position rather than an unfinished destination.
    const walking = await mother();
    await page.keyboard.down('KeyD');
    try { await moved(walking); await settings(); } finally { await page.keyboard.up('KeyD'); }
    const saved = await mother();
    const hud = await page.locator('#minerals').innerText();
    await page.locator('#sheet [data-action="save"]').click();
    await wait(() => document.querySelector('#status')?.textContent.includes('이 기기에 진행을 저장했어요'));
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#sheet [data-action="export"]').click();
    const download = await downloadEvent;
    const backup = join(await mkdtemp(join(tmpdir(), 'budmori-player-')), 'backup.json');
    await download.saveAs(backup);
    report.backupFile = backup;
    await resume();
    await page.keyboard.down('KeyD');
    try { await moved(saved); } finally { await page.keyboard.up('KeyD'); }
    await settings();
    const chooserEvent = page.waitForEvent('filechooser');
    await page.locator('#sheet [data-action="import"]').click();
    await (await chooserEvent).setFiles(backup);
    await wait(() => document.querySelector('#status')?.textContent.includes('백업한 군락을 불러왔어요'));
    await page.locator('#sheet [data-ux="settings"]').waitFor({state: 'visible'});
    await page.waitForTimeout(350);
    const restored = await mother();
    assert(Math.hypot(restored.x - saved.x, restored.y - saved.y) < 2, 'File import restores the character position shown when backing up');
    assert.equal(await page.locator('#minerals').innerText(), hud, 'File import restores displayed resources');
    await page.reload({waitUntil: 'domcontentloaded'});
    await wait(() => globalThis.BloomSimulation?.runtime?.ready, null, 30000);
    assert.match(await page.locator('#sheet [data-public="solo"]').innerText(), /이어하기/);
    await page.locator('#sheet [data-public="solo"]').click();
    await openPause();
    const continued = await mother();
    assert(Math.hypot(continued.x - saved.x, continued.y - saved.y) < 2, 'Solo continuation restores the imported position after reload');
    await resume();
    const before = await mother();
    await page.keyboard.down('KeyD');
    try { await moved(before); } finally { await page.keyboard.up('KeyD'); }
  });
  await activeContext.close(); activeContext = null; page = null;
  await check('Mobile touch movement and double-tap roll', async () => {
    // A fresh solo world shares the desktop fixture; recovery gets its own
    // initial encounter via navigation, never an edit of a running session.
    await newPlayer({viewport: {width: 360, height: 640}, deviceScaleFactor: 2,
      isMobile: true, hasTouch: true}, '/solo');
    await wait(() => projectionQueue.some(q => q.kind === 'mother' && q.source.id === -1));
    const before = await mother();
    await page.touchscreen.tap(275, 340);
    await moved(before);
    const beforeRoll = await mother();
    await page.touchscreen.tap(85, 340);
    await page.touchscreen.tap(85, 340);
    await wait(() => document.querySelector('#rollStatus')?.dataset.ready === 'false', null, 5000);
    await wait(() => document.querySelector('#rollStatus')?.dataset.ready === 'true', null, 5000);
    await moved(beforeRoll);
    await screenshot('browser-mobile.png');
  });
  // New context prevents an earlier solo save from replacing the death fixture.
  await activeContext.close(); activeContext = null; page = null;
  await check('Mobile real combat death, visible countdown, automatic revive, and resumed input', async () => {
    await newPlayer({viewport: {width: 360, height: 640}, deviceScaleFactor: 2,
      isMobile: true, hasTouch: true}, '/recovery');
    try { await page.locator('#reviveOverlay').waitFor({state: 'visible', timeout: 12000}); }
    catch (error) { const diagnostic=await page.evaluate(()=>BloomDiagnostics.snapshot()); throw new Error(`${error.message} · renderer diagnostics ${JSON.stringify(diagnostic.errors)}`); }
    assert.equal(await page.locator('#modal.show').count(), 0, 'Combat death does not open a blocking menu');
    assert.match(await page.locator('#reviveCountdown').innerText(), /^[123]$/);
    assert.equal(await page.locator('#reviveCountdownUnit').innerText(), '초 후 부활');
    const card = await page.locator('#reviveCountdownCard').boundingBox();
    assert(card && card.x >= 0 && card.y >= 0 && card.x + card.width <= 360 && card.y + card.height <= 640, 'Mobile countdown fits the viewport');
    await screenshot('browser-revive.png');
    await page.locator('#reviveOverlay').waitFor({state: 'hidden', timeout: 10000});
    await wait(() => projectionQueue.some(q => q.kind === 'mother' && q.source.id === -1 && q.source.hp > 0));
    assert.match(await page.locator('#motherHealth').innerText(), /HP/);
    const revived = await mother();
    await page.touchscreen.tap(85, 340);
    await moved(revived);
    await screenshot('browser-mobile-recovered.png');
  });
  assert.equal(await read(() => globalThis.BloomDiagnostics?.fatal), false, 'No fatal renderer/runtime failure');
  healthy(); report.status = 'PASS';
}
try {
  await Promise.race([scenario(), new Promise((_, reject) => {
    deadlineTimer = setTimeout(() => reject(Error('Player scenario exceeded its 170s budget; coverage is incomplete')), remaining());
  })]);
} catch (error) {
  report.status = 'FAIL'; report.error = String(error);
  try {
    report.lastUI = await read(() => ({
      fatal: globalThis.BloomDiagnostics?.fatal, health: document.querySelector('#motherHealth')?.textContent,
      roll: document.querySelector('#rollStatus')?.textContent, modal: document.querySelector('#modal.show #sheet')?.innerText.slice(0, 700),
    }));
    await screenshot('browser-failure.png');
  } catch {}
  console.error(report.error); process.exitCode = 1;
} finally {
  clearTimeout(deadlineTimer);
  await bounded(browser?.close() || Promise.resolve(), 3000, 'Browser cleanup').catch(error => {
    report.status = 'FAIL'; report.cleanupError = String(error); process.exitCode = 1;
  });
  server.closeAllConnections();
  await bounded(new Promise(resolveClose => server.close(resolveClose)), 1000, 'Server cleanup').catch(() => {});
  report.elapsedMs = Math.round(performance.now() - started);
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({status: report.status, sourceSHA256: report.sourceSHA256,
    elapsedMs: report.elapsedMs, budgetMs, checks: report.checks.length, reportPath, screenshots: report.screenshots}));
  if (report.cleanupError) process.exit(1);
}
