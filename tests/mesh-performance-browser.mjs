// Separate benchmark: real production RAF/deadlines, initial populations only.
// It deliberately does not fix/rebase timers or manually advance/render the game.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import runtime from './runtime-source.cjs';

const inputs = process.argv.slice(2);
const files = inputs.length ? inputs.map(file => resolve(file)) : [resolve('index.html')];
const counts = (process.env.BLOOM_LOAD_COUNTS || '155,500,1000').split(',').map(Number);
assert(counts.every(n => Number.isSafeInteger(n) && n > 0 && n <= 5000));
// Explicit developmental fixture, never a production import or provenance claim.
const candidateRendering = process.env.BLOOM_RENDERING_CANDIDATE ? await readFile(resolve(process.env.BLOOM_RENDERING_CANDIDATE)) : null;
const report = { kind: 'Actual Chromium/SwiftShader WebGL, production RAF/deadlines; not phone hardware FPS',
  viewport: { width: 360, height: 640, dpr: 2 }, warmupMs: 1500, holdMs: 2000,
  scope: 'Four-species initial army, disabled camps and stunned enemies. Public preview OFF control keeps its initial allocated scope. No physics, time or rendering override.', results: [] };
if (candidateRendering) report.developmentalRenderingFixture = { sha256: runtime.hash(candidateRendering), bytes: candidateRendering.length };
let browser;
function fixture(app, count, preview) {
  const source = `;(() => {
    const initialize=bloomInitialize;
    bloomInitialize=function(...args){const result=initialize(...args);
      for(const camp of state.camps){camp.enabled=false;camp.spawned=true;camp.regrowth=[]}
      for(const u of state.units)if(u.team==='friendly')idMap.delete(u.id);
      state.units=state.units.filter(u=>u.team!=='friendly');
      const m=state.mother,types=['swordsman','shellbug','dandelion','archer'];
      for(let i=0;i<${count};i++){const a=i*2.399963229728653,d=12+Math.sqrt(i)*3;
        const u=spawn(types[i%types.length],'friendly',m.x+Math.cos(a)*d,m.y+Math.sin(a)*d,{rarityGrade:1});
        if(!u)throw Error('Load fixture spawn failed');u.ownerId=BloomSimulation.ownerId;
      }
      for(const u of state.units)if(u.team==='enemy'){u.stun=1e6;u.aggroAt=u.wanderAt=state.time+1e6}
      rebuildGrid();spatialBoundary();return result;
    };
    ${preview ? '' : `const enable=BloomOwnedSDK.LocalInputPreview.prototype.setEnabled;
    BloomOwnedSDK.LocalInputPreview.prototype.setEnabled=function(){return enable.call(this,false)};`}
    globalThis.__meshLoadRead=()=>({tick:BloomSimulation.tick,time:state.time,playing,paused,modal:modalKind,
      friendly:state.units.filter(u=>u.team==='friendly'&&u.hp>0).length,
      render:ctx.stats(),preview:((p)=>({phase:p.phase,enabled:p.enabled,error:p.error,captureMs:p.captureMs,captureBytes:p.captureBytes,scope:p.scope,capability:p.capability}))(BloomSimulation.runtime.preview),
      profiler:BloomDiagnostics.snapshot().runtime.profiler,fatal:BloomDiagnostics.fatal});
  })();`;
  assert(app.game.includes('/* MAIN_RUNTIME_TEST_HOOK */'));
  return runtime.response(app, app.game.replace('/* MAIN_RUNTIME_TEST_HOOK */', () => source));
}
async function installAssets(context, app) {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  for (const entry of app.config.modules) {
    const bytes = candidateRendering && entry.name === 'rendering' ? candidateRendering : await readFile(resolve(app.root, 'vendor/upstream', entry.name + '.js'));
    assert.equal(bytes.length, entry.bytes); assert.equal(runtime.hash(bytes), entry.sha256);
    await context.route(entry.url, route => route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: bytes }));
  }
  const lock = JSON.parse(await readFile(resolve(app.root, 'gamekit-lock.json'), 'utf8'));
  for (const asset of lock.assets) {
    const bytes = await readFile(resolve(app.root, 'vendor/upstream', asset.file));
    assert.equal(bytes.length, asset.bytes); assert.equal(runtime.hash(bytes), asset.sha256);
    await context.route(`https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@${lock.distCommit}/${asset.file}`,
      route => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: bytes }));
  }
  await context.routeWebSocket('**/*', socket => socket.close());
}
try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  report.browser = browser.version();
  for (const file of files) {
    const app = runtime.read(file), responses = {};
    if (candidateRendering) app.config.modules = app.config.modules.map(entry => entry.name === 'rendering'
      ? { ...entry, bytes: candidateRendering.length, sha256: runtime.hash(candidateRendering), url: `https://rendering-candidate.invalid/${runtime.hash(candidateRendering)}/rendering.js` } : entry);
    for (const count of counts) for (const preview of [false, true]) responses[`/${count}-${preview}`] = fixture(app, count, preview);
    const server = createServer(runtime.serve(responses));
    await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
    try {
      for (const count of counts) for (const preview of [false, true]) {
        const context = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
        const errors = [], row = { file, sourceSHA256: runtime.hash(app.game), fixtureSHA256: responses[`/${count}-${preview}`].gameSha,
          renderingSHA256: app.config.modules.find(entry => entry.name === 'rendering').sha256, sdk: app.config.distCommit, count, preview, errors };
        report.results.push(row);
        try {
          await installAssets(context, app);
          const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(30000);
          await page.goto(`http://127.0.0.1:${server.address().port}/${count}-${preview}`, { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => globalThis.BloomSimulation?.runtime?.ready);
          await page.locator('#sheet [data-public="solo"]').click({timeout: 30000});
          await page.locator('#modal.show').waitFor({ state: 'hidden' });
          await page.waitForTimeout(report.warmupMs);
          const before = await page.evaluate(() => { BloomDiagnostics.setProfiler(true); return __meshLoadRead(); });
          const start = performance.now(); await page.keyboard.down('KeyD'); await page.waitForTimeout(report.holdMs); await page.keyboard.up('KeyD');
          const after = await page.evaluate(() => __meshLoadRead());
          row.wallMs = performance.now() - start; row.before = before; row.after = after;
          row.effectiveTPS = (after.tick - before.tick) * 1000 / row.wallMs;
          row.status = errors.length || after.fatal || after.friendly !== count ? 'FAIL' : after.tick <= before.tick ? 'STALLED' : 'MEASURED';
        } catch (error) { row.status = 'FAIL'; errors.push(error.stack || String(error)); }
        finally { await context.close(); }
        console.log(JSON.stringify({ file, count, preview, status: row.status, tps: row.effectiveTPS,
          actors: row.after?.profiler?.summary?.stages?.['render.actors'], mesh: row.after?.render?.mesh }));
      }
    } finally { await new Promise(resolveClose => server.close(resolveClose)); }
  }
} finally {
  await browser?.close();
  report.outcome = report.results.length && report.results.every(row => row.status === 'MEASURED') ? 'MEASURED' : 'PERFORMANCE_FAIL';
  await writeFile(new URL('./mesh-performance-report.json', import.meta.url), JSON.stringify(report, null, 2));
}
if (report.results.some(row => row.status === 'FAIL')) process.exitCode = 1;
