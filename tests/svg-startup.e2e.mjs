import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'tests/output');await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':decodeURIComponent(name)));
  if(!file.startsWith(root)){res.writeHead(403);res.end();return}
  try{const bytes=await readFile(file);res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html':file.endsWith('.svg')?'image/svg+xml':'text/javascript'});res.end(bytes)}
  catch{res.writeHead(404);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:process.env.BUDMORI_BROWSER_CHANNEL||'chromium',headless:true});
const report={checks:[],errors:[]};
try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),requests=[];
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('request',request=>requests.push(request.url()));
  await page.goto(base);await page.waitForFunction(()=>window.BUDMORI,{},{timeout:30000});
  const compiled=await page.evaluate(()=>[...Object.values(BudmoriVectorResources.troops),...Object.values(BudmoriVectorResources.bosses)].map(a=>({hash:a.sourceSha256,vertices:a.geometry.vertices.length,indices:a.geometry.indices?.length,sourcePaths:'sourcePaths'in a})));
  assert.equal(compiled.length,5);assert(compiled.every(a=>a.indices>0&&!a.sourcePaths&&/^[a-f0-9]{64}$/.test(a.hash)));
  const svgRequests=()=>requests.filter(url=>/\/assets\/(troops|bosses)\/.*\.svg\?/.test(url));
  assert.equal(svgRequests().length,5,'startup fetches five original SVGs exactly once');
  assert(!requests.some(url=>url.includes('compiled-assets')||url.includes('vector-assets.generated')));
  await page.locator('#newGame').tap();await page.locator('#raid').tap();await page.waitForFunction(()=>BUDMORI.sim.scene==='raid');
  assert.equal(await page.evaluate(()=>BUDMORI.renderer.assetsReady),true);
  await page.screenshot({path:path.join(output,'mobile-source-svg-boss.png')});
  await page.locator('#return').tap();await page.waitForFunction(()=>BUDMORI.sim.scene==='farm');
  assert.equal(svgRequests().length,5,'scene transitions reuse retained compiled resources');
  assert.deepEqual(report.errors,[]);report.checks.push('original SVG startup, indexed geometry, no generated asset request, scene reuse, prewarmed boss');
  await context.close();
  const retryContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const retryPage=await retryContext.newPage();let failures=0;
  await retryPage.route('**/assets/troops/pea.svg?*',route=>{if(failures++===0)return route.fulfill({status:503,body:'temporary'});return route.continue()});
  await retryPage.goto(base);
  const retry=retryPage.locator('#bloom-module-loading button');await retry.waitFor({state:'visible'});
  assert.equal(await retryPage.evaluate(()=>!!window.BUDMORI),false,'game cannot start with missing character resources');
  await retry.click();await retryPage.waitForFunction(()=>window.BUDMORI,{},{timeout:30000});
  assert.equal(failures,2);report.checks.push('failed source blocks startup and explicit retry succeeds');
  await retryContext.close();report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error}
finally{await browser.close();server.close();await writeFile(path.join(output,'svg-startup-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report))}
