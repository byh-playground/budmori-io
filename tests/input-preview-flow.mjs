import assert from 'node:assert/strict';
export const readInputPreviewMetrics=page=>page.evaluate(()=>__army.BloomSimulation.runtime.preview);
export const readInputPreviewBody=page=>page.evaluate(()=>__army.BloomSimulation.runtime.preview.display);
export async function assertInputPreviewReady(page){await page.waitForFunction(()=>__army?.BloomSimulation?.runtime?.preview.enabled,undefined,{timeout:15000,polling:'raf'});const metrics=await readInputPreviewMetrics(page);assert.equal(metrics.phase,'ready');assert.equal(metrics.error,null);return metrics;}

// Permanent USER flow: deadlines/poll/RAF run normally. A caller may arrange an
// actual RTC transport delay and pass waiting=true/release; this helper never
// changes timers, ticks, world state, snapshots, or the production scheduler.
export async function exerciseInputPreviewFlow(page,{waiting=false,release=async()=>{}}={}){
 await assertInputPreviewReady(page);
 await page.locator('#view').click();
 await page.waitForFunction(()=>bloomInputPending===0,undefined,{timeout:5000,polling:'raf'});
 if(waiting)await page.waitForFunction(()=>['held','stalled'].includes(__army.BloomSimulation.session.status),undefined,{timeout:5000,polling:'raf'});
 else {const tick=await page.evaluate(()=>__army.BloomSimulation.tick);await page.waitForFunction(t=>__army.BloomSimulation.tick>t,tick,{timeout:1500,polling:'raf'});}
 const before=await page.evaluate(()=>{const sim=__army.BloomSimulation;globalThis.__previewIdentityWitness={state:sim.state,leader:WorldPlayers.local().leader};return{tick:sim.tick,hash:BloomOwnedSDK.hashBytes(sim.adapter.save()),rng:sim.state.rng,commandSequence:sim.session.localInputState.commandSequence,publishes:sim.runtime.preview.capability?.previewPublishes??0,display:sim.runtime.preview.display,renderFrame:__army.performance.frames,at:performance.now(),units:sim.state.units.length}});
 try{
  await page.keyboard.down('d');
  await page.waitForFunction(count=>{const sim=__army.BloomSimulation;if((sim.runtime.preview.capability?.previewPublishes??0)<=count)return false;const w=__previewIdentityWitness;globalThis.__previewFirstWitness={tick:sim.tick,hash:BloomOwnedSDK.hashBytes(sim.adapter.save()),rng:sim.state.rng,sameState:sim.state===w.state,sameLeader:WorldPlayers.local().leader===w.leader,display:structuredClone(sim.runtime.preview.display),renderFrame:__army.performance.frames,at:performance.now()};return true},before.publishes,{timeout:1200,polling:'raf'});
  const first=await page.evaluate(()=>__previewFirstWitness);
  assert.equal(first.tick,before.tick,'fresh input response precedes the next actual authority tick');assert.equal(first.hash,before.hash);assert.equal(first.rng,before.rng);assert.equal(first.sameState,true);assert.equal(first.sameLeader,true);
  const positions=await page.evaluate(async()=>{const out=[__army.BloomSimulation.runtime.preview.display.x];for(let i=0;i<4;i++){await new Promise(requestAnimationFrame);out.push(__army.BloomSimulation.runtime.preview.display.x)}return out});
  assert.ok(positions.every(Number.isFinite));assert.ok(new Set(positions.map(x=>x.toFixed(4))).size>1,'holding input renders continuous shared-schema positions');
  await page.keyboard.up('d');await page.keyboard.down('a');await page.evaluate(()=>new Promise(requestAnimationFrame));await page.keyboard.up('a');
  await page.keyboard.press('Space');await page.evaluate(()=>new Promise(requestAnimationFrame));await page.keyboard.press('Space');await page.evaluate(()=>new Promise(requestAnimationFrame));
  assert.ok(first.renderFrame>before.renderFrame,'normal game world render consumed the new model; GPU pixels remain owned by the enclosing suite endFrame witness');
  await release();await page.waitForFunction(sequence=>__army.BloomSimulation.session.localInputState.executedCommandSequence>=sequence+2,before.commandSequence,{timeout:5000,polling:'raf'});
  const confirmation=await page.evaluate(()=>__army.BloomSimulation.session.localInputState);assert.ok(confirmation.capture.executeTick>=confirmation.capture.captureTick);
  return{before,first,positions,inputToSampleMs:first.at-before.at,confirmation,metrics:await readInputPreviewMetrics(page)};
 }finally{await page.keyboard.up('d');await page.keyboard.up('a');await page.evaluate(()=>{delete globalThis.__previewIdentityWitness;delete globalThis.__previewFirstWitness});}
}
export async function assertInputPreviewCleared(page){const state=await readInputPreviewMetrics(page);assert.equal(state.enabled,false);assert.equal(state.capability?.pendingCount??0,0);return state;}
