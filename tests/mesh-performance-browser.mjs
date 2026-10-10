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
const holdMs = Number(process.env.BLOOM_LOAD_HOLD_MS || 2000);
assert(Number.isSafeInteger(holdMs) && holdMs >= 1000 && holdMs <= 30000, 'BLOOM_LOAD_HOLD_MS must be 1000..30000');
const netcodeMode = process.env.BLOOM_NETCODE_MODE || 'lockstep';
assert(['lockstep', 'rollback'].includes(netcodeMode), 'BLOOM_NETCODE_MODE must be lockstep or rollback');
const previewSelection = process.env.BLOOM_LOAD_PREVIEW || 'both';
assert(['both', 'on', 'off'].includes(previewSelection), 'BLOOM_LOAD_PREVIEW must be both, on, or off');
const previews = previewSelection === 'both' ? [false, true] : [previewSelection === 'on'];
const renderSubstages = process.env.BLOOM_RENDER_SUBSTAGES === '1';
// Explicit developmental fixture, never a production import or provenance claim.
const candidateRendering = process.env.BLOOM_RENDERING_CANDIDATE ? await readFile(resolve(process.env.BLOOM_RENDERING_CANDIDATE)) : null;
const candidateOrder = process.env.BLOOM_RENDERING_CANDIDATE_ORDER || 'last';
assert(['first', 'last'].includes(candidateOrder), 'BLOOM_RENDERING_CANDIDATE_ORDER must be first or last');
const candidateIndex = candidateRendering ? (candidateOrder === 'first' ? 0 : Math.max(0, files.length - 1)) : -1;
const report = { kind: 'Actual Chromium/SwiftShader WebGL, production RAF/deadlines; not phone hardware FPS', netcodeMode,
  viewport: { width: 360, height: 640, dpr: 2 }, warmupMs: 1500, holdMs,
  scope: 'Four-species initial army, disabled camps and stunned enemies. Public preview OFF control keeps its initial allocated scope. No physics, time or rendering override.', renderSubstages, results: [] };
if (candidateRendering) report.developmentalRenderingFixture = { sha256: runtime.hash(candidateRendering), bytes: candidateRendering.length };
let browser;
function fixture(app, count, preview, useSilhouetteBatch) {
  const silhouetteBatchAdapter = useSilhouetteBatch ? `
    globalThis.__meshSilhouetteBatch={calls:0};
    if(ctx?.withSilhouette&&typeof ctx.drawMeshSilhouette==='function'){
      const silhouetteContext=ctx,genericSilhouette=silhouetteContext.withSilhouette;
      silhouetteContext.withSilhouette=function(color,width,paint,radius){
        const hadOwn=Object.hasOwn(this,'drawMesh'),originalDraw=this.drawMesh;let captured=null,calls=0;
        this.drawMesh=function(mesh,options){calls++;if(calls>1)throw Error('Silhouette candidate expects one retained mesh paint');captured={mesh,options}};
        try{paint()}finally{if(hadOwn)this.drawMesh=originalDraw;else delete this.drawMesh}
        if(calls!==1||!captured)throw Error('Silhouette candidate did not capture one retained mesh');
        globalThis.__meshSilhouetteBatch.calls++;
        const options=captured.options||{};return this.drawMeshSilhouette(captured.mesh,{transform:options.transform||null,morph:options.morph||[0,0],parts:options.parts||null,color,width,radius});
      };
    }
  ` : '';
  const actorInstrumentation = renderSubstages ? `
    globalThis.__actorStageProfile={enabled:false,insideArt:false,stageMs:0,stageCalls:0,unitMs:0,unitCalls:0,shadowMs:0,shadowCalls:0,artMs:0,artCalls:0,meshSubmitMs:0,meshSubmitCalls:0};
    const actorProfile=globalThis.__actorStageProfile;
    const measure=(name,original)=>function(...args){if(!actorProfile.enabled)return original.apply(this,args);const start=performance.now();try{return original.apply(this,args)}finally{actorProfile[name+'Ms']+=performance.now()-start;actorProfile[name+'Calls']++}};
    const projectedActors=drawProjectedActors;drawProjectedActors=measure('stage',projectedActors);
    const drawUnitCore=drawUnit;drawUnit=measure('unit',drawUnitCore);
    const shadowCore=cshadow;cshadow=function(...args){if(!actorProfile.enabled||projectionDrawingActors)return shadowCore.apply(this,args);const start=performance.now();try{return shadowCore.apply(this,args)}finally{actorProfile.shadowMs+=performance.now()-start;actorProfile.shadowCalls++}};
    const meshDrawCore=ctx.drawMesh;ctx.drawMesh=function(...args){if(!actorProfile.enabled||!actorProfile.insideArt)return meshDrawCore.apply(this,args);const start=performance.now();try{return meshDrawCore.apply(this,args)}finally{actorProfile.meshSubmitMs+=performance.now()-start;actorProfile.meshSubmitCalls++}};
    const artCore=RallyArt.draw;RallyArt.draw=function(...args){if(!actorProfile.enabled)return artCore.apply(this,args);const nested=actorProfile.insideArt,start=performance.now();actorProfile.insideArt=true;try{return artCore.apply(this,args)}finally{actorProfile.artMs+=performance.now()-start;actorProfile.artCalls++;actorProfile.insideArt=nested}};
  ` : '';
  const source = `;(() => {
    const initialize=bloomInitialize;
    bloomInitialize=function(...args){CONFIG.netcode.mode=${JSON.stringify(netcodeMode)};const result=initialize(...args);
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
    ${silhouetteBatchAdapter}
    ${actorInstrumentation}
    globalThis.__meshLoadRead=()=>({tick:BloomSimulation.tick,time:state.time,playing,paused,modal:modalKind,netcodeMode:BloomSimulation.session.profile.mode,
      friendly:state.units.filter(u=>u.team==='friendly'&&u.hp>0).length,
      render:ctx.stats(),preview:((p)=>({phase:p.phase,enabled:p.enabled,error:p.error,captureMs:p.captureMs,captureBytes:p.captureBytes,scope:p.scope,capability:p.capability}))(BloomSimulation.runtime.preview),
      profiler:BloomDiagnostics.snapshot().runtime.profiler,actorSubstages:globalThis.__actorStageProfile?{...globalThis.__actorStageProfile}:null,silhouetteBatch:globalThis.__meshSilhouetteBatch?{...globalThis.__meshSilhouetteBatch}:null,fatal:BloomDiagnostics.fatal});
  })();`;
  assert(app.game.includes('/* MAIN_RUNTIME_TEST_HOOK */'));
  return runtime.response(app, app.game.replace('/* MAIN_RUNTIME_TEST_HOOK */', () => source));
}
async function installAssets(context, app, renderingCandidate) {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  for (const entry of app.config.modules) {
    const bytes = renderingCandidate && entry.name === 'rendering' ? renderingCandidate : await readFile(resolve(app.root, 'vendor/upstream', entry.name + '.js'));
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
  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex], renderingCandidate = fileIndex === candidateIndex ? candidateRendering : null;
    const app = runtime.read(file), responses = {};
    if (renderingCandidate) app.config.modules = app.config.modules.map(entry => entry.name === 'rendering'
      ? { ...entry, bytes: renderingCandidate.length, sha256: runtime.hash(renderingCandidate), url: `https://rendering-candidate.invalid/${runtime.hash(renderingCandidate)}/rendering.js` } : entry);
    for (const count of counts) for (const preview of previews) responses[`/${count}-${preview}`] = fixture(app, count, preview, !!renderingCandidate);
    const server = createServer(runtime.serve(responses));
    await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
    try {
      for (const count of counts) for (const preview of previews) {
        const context = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
        const errors = [], row = { file, renderingVariant:renderingCandidate?'candidate':'pinned', netcodeMode, silhouetteBatchFastPath:!!renderingCandidate, sourceSHA256: runtime.hash(app.game), fixtureSHA256: responses[`/${count}-${preview}`].gameSha,
          renderingSHA256: app.config.modules.find(entry => entry.name === 'rendering').sha256, sdk: app.config.distCommit, count, preview, errors };
        report.results.push(row);
        try {
          await installAssets(context, app, renderingCandidate);
          const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(30000);
          await page.goto(`http://127.0.0.1:${server.address().port}/${count}-${preview}`, { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => globalThis.BloomSimulation?.runtime?.ready);
          await page.locator('#sheet [data-public="solo"]').click({timeout: 30000});
          await page.locator('#modal.show').waitFor({ state: 'hidden' });
          await page.waitForTimeout(report.warmupMs);
          const before = await page.evaluate(() => { BloomDiagnostics.setProfiler(true); if(globalThis.__actorStageProfile){for(const key of ['stageMs','stageCalls','unitMs','unitCalls','shadowMs','shadowCalls','artMs','artCalls','meshSubmitMs','meshSubmitCalls'])__actorStageProfile[key]=0;__actorStageProfile.insideArt=false;__actorStageProfile.enabled=true} if(globalThis.__meshSilhouetteBatch)__meshSilhouetteBatch.calls=0; return __meshLoadRead(); });
          const start = performance.now(); await page.keyboard.down('KeyD'); await page.waitForTimeout(holdMs); await page.keyboard.up('KeyD');
          const after = await page.evaluate(() => __meshLoadRead());
          row.wallMs = performance.now() - start; row.before = before; row.after = after;
          row.effectiveTPS = (after.tick - before.tick) * 1000 / row.wallMs;
          row.previewFailure = after.preview.error || null;
          row.status = errors.length || after.fatal || after.friendly !== count || after.netcodeMode !== netcodeMode || after.preview.phase === 'failed' || preview && !after.preview.enabled ? 'FAIL' : after.tick <= before.tick ? 'STALLED' : 'MEASURED';
        } catch (error) { row.status = 'FAIL'; errors.push(error.stack || String(error)); }
        finally { await context.close(); }
        console.log(JSON.stringify({ file, count, preview, status: row.status, tps: row.effectiveTPS,
          actors: row.after?.profiler?.summary?.stages?.['render.actors'], actorSubstages: row.after?.actorSubstages, silhouetteBatch: row.after?.silhouetteBatch, mesh: row.after?.render?.mesh }));
      }
    } finally { await new Promise(resolveClose => server.close(resolveClose)); }
  }
} finally {
  await browser?.close();
  report.outcome = report.results.length && report.results.every(row => row.status === 'MEASURED') ? 'MEASURED' : 'PERFORMANCE_FAIL';
  await writeFile(new URL('./mesh-performance-report.json', import.meta.url), JSON.stringify(report, null, 2));
}
if (report.results.some(row => row.status === 'FAIL')) process.exitCode = 1;
