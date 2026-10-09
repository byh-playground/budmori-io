import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import fontAssets from './font-asset-fixture.cjs';
import moduleReferences from './module-reference-fixture.cjs';
import runtimeSources from './runtime-source.cjs';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const old=JSON.parse(await readFile(new URL('./fixtures/v63-compatibility.json',import.meta.url),'utf8')).disk;
const app=runtimeSources.read(fileURLToPath(new URL('../index.html',import.meta.url)),html);
const server=createServer(runtimeSources.serve({'/':runtimeSources.response(app)}));
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1000,height:800}});
 const fontFixture=await fontAssets.install(context,{failFirst:true});
 await moduleReferences.install(context,html);
 await context.addInitScript(value=>{if(!localStorage.getItem('qa-save-seeded')){localStorage.setItem('bloom-weapon-cards-v3',value);localStorage.setItem('qa-save-seeded','1')}},old);
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const ready=()=>page.waitForFunction(()=>globalThis.BloomSimulation?.runtime?.ready&&globalThis.__army?.performance.frames>2);
 const stored=()=>page.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3'));
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.locator('#bloomFontAssetGate').getByText('저장 데이터는 변경되지 않았어요').waitFor();
 assert.equal(await stored(),old,'failed font loading preserves an unsupported protected save');
 assert.equal(await page.evaluate(()=>BloomSimulation.runtime.ready),false,'world boot is withheld until shared font readiness');
 await page.locator('#bloomFontAssetGate button').click();await ready();
 assert.equal(fontFixture.requests,2,'retry requests the exact pinned font asset again');
 assert.match(await page.locator('#sheet').innerText(),/지원하지 않는 저장 버전/);assert.equal(await stored(),old);
 assert.equal(await page.evaluate(()=>__army.save()),false);
 await page.locator('select[aria-label="시뮬레이션 초당 계산 횟수"]').selectOption('20');assert.equal(await stored(),old,'changing TPS cannot replace unsupported save');
 for(let i=0;i<2;i++){
  await page.locator('[data-public="solo"]').click();assert.match(await page.locator('#sheet').innerText(),/지원하지 않는 저장 버전/);
  assert.match(await page.locator('#sheet').innerText(),/새 게임을 확인하면 기존 저장이 교체/);
  await page.locator('[data-action="pause"]').click();assert.equal(await stored(),old,'cancel preserves exact old bytes');
 }
 await page.reload();await ready();assert.equal(await stored(),old,'reload/pagehide retains rejected bytes');
 await page.locator('[data-public="solo"]').click();
 if(process.env.BLOOM_SAVE_UI_SCREENSHOT)await page.screenshot({path:process.env.BLOOM_SAVE_UI_SCREENSHOT});
 await page.locator('[data-action="reset"]').click();
 await page.waitForFunction(()=>!BloomSimulation.runtime.metrics.persistenceProtected&&!__army.paused);
 const fresh=await stored();assert.equal(JSON.parse(fresh).productVersion,'0.2.0');
 await page.locator('#pause').click();await page.locator('[data-ux="settings"]').click();
 // Settle the reset button's queued tutorial acknowledgement before the import baseline.
 await page.evaluate(()=>BloomSimulation.runtime.snapshot('save'));
 const before=await page.evaluate(()=>({storage:localStorage.getItem('bloom-weapon-cards-v3'),state:JSON.stringify(__army.state)}));
 const chooser=page.waitForEvent('filechooser');await page.locator('[data-action="import"]').click();
 await (await chooser).setFiles({name:'old-save.json',mimeType:'application/json',buffer:Buffer.from(old)});
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('지원하지 않는 저장 버전'));
 assert.equal(await stored(),before.storage,'unsupported upload cannot overwrite current storage');
 assert.equal(await page.evaluate(()=>JSON.stringify(__army.state)),before.state,'unsupported upload cannot change current authority');
 assert.equal(await page.evaluate(()=>BloomDiagnostics.fatal),false);assert.deepEqual(errors,[]);
 console.log('PASS Chromium/SwiftShader: unsupported startup notice, repeated cancel, TPS, pagehide/reload protection, confirmed new game, unsupported file import retains current bytes');
}finally{await browser?.close();await new Promise(r=>server.close(r))}
