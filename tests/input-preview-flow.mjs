import assert from 'node:assert/strict';
export const readInputPreviewMetrics=page=>page.evaluate(()=>__army.BloomSimulation.runtime.preview);
export const readInputPreviewBody=page=>page.evaluate(()=>__army.BloomSimulation.runtime.preview.display);
export async function assertInputPreviewReady(page){await page.waitForFunction(()=>__army?.BloomSimulation?.runtime?.preview.enabled,undefined,{timeout:15000,polling:'raf'});const metrics=await readInputPreviewMetrics(page);assert.equal(metrics.phase,'ready');assert.equal(metrics.error,null);return metrics;}

// Permanent USER flow: deadlines/poll/RAF run normally. A caller may arrange an
// actual RTC transport delay and pass waiting=true/release; this helper never
// changes timers, ticks, world state, snapshots, or the production scheduler.
export async function exerciseInputPreviewFlow(page,{waiting=false,release=async()=>{}}={}){
 await assertInputPreviewReady(page);
 await page.waitForFunction(()=>document.activeElement===document.querySelector('#view'),undefined,{timeout:5000,polling:'raf'});
 if(!waiting)await page.waitForFunction(()=>bloomInputPending===0,undefined,{timeout:5000,polling:'raf'});
 if(waiting){try{await page.waitForFunction(()=>['held','stalled'].includes(__army.BloomSimulation.runtime.metrics.advanceStatus),undefined,{timeout:5000,polling:'raf'});}catch(error){const context=await page.evaluate(()=>({status:BloomSimulation.session.status,advance:BloomSimulation.runtime.metrics.advanceStatus,preview:BloomSimulation.runtime.preview,queued:__sharedBrowser?.heldRTC.length,stallCount:BloomSimulation.session.metrics.stalls}));throw new Error('RTC waiting witness unavailable: '+JSON.stringify(context),{cause:error})}}
 else {const tick=await page.evaluate(()=>__army.BloomSimulation.tick);await page.waitForFunction(t=>__army.BloomSimulation.tick>t,tick,{timeout:5000,polling:'raf'});}
 // Witness the actual publication, not a later cross-process polling read.
 // Wrappers only observe; each original method is called exactly once.
 const before=await page.evaluate(()=>{
  const sim=__army.BloomSimulation,session=sim.session,prototype=BloomGamekitInterpolation.PresentationRuntime.prototype;
  const authority=()=>({tick:sim.tick,hash:BloomOwnedSDK.hashBytes(sim.adapter.save()),rng:sim.state.rng});
  const witness=globalThis.__previewIdentityWitness={state:sim.state,leader:WorldPlayers.local().leader,baselines:new Map(),first:null,executed:null,keyAt:null};
  witness.baselines.set(sim.tick,authority());
  const onKey=event=>{if(event.code==='KeyD'&&witness.keyAt===null)witness.keyAt=performance.now()};document.addEventListener('keydown',onKey,true);
  const advance=session.advance,capture=prototype.capturePreview;
  session.advance=function(input,...args){const incoming=bloomDecodeInput(input),at=performance.now(),tick=sim.tick;const result=advance.call(this,input,...args);
   if(witness.keyAt!==null&&incoming.manual&&!incoming.suspended&&incoming.x>0&&!witness.executed)witness.executed={at,tick,status:result.status};
   if(!witness.first)witness.baselines.set(sim.tick,authority());return result};
  prototype.capturePreview=function(packet,now){const active=witness.keyAt!==null&&!witness.first,before=active?authority():null,baseline=active?witness.baselines.get(sim.tick):null;
   const result=capture.call(this,packet,now);
   if(active&&result){const after=authority();witness.first={...after,baseline,unchanged:before.hash===after.hash&&before.tick===after.tick&&before.rng===after.rng,sameState:sim.state===witness.state,sameLeader:WorldPlayers.local().leader===witness.leader,at:performance.now(),keyAt:witness.keyAt,display:structuredClone(sim.runtime.preview.display),renderFrame:__army.performance.frames};witness.positions=[sim.runtime.preview.display.x];const sample=()=>{if(witness.positions.length>=5)return;witness.positions.push(sim.runtime.preview.display.x);setTimeout(sample,15)};setTimeout(sample,15);}return result};
  witness.cleanup=()=>{session.advance=advance;prototype.capturePreview=capture;document.removeEventListener('keydown',onKey,true)};
  return{...authority(),commandSequence:session.localInputState.commandSequence,renderFrame:__army.performance.frames,at:performance.now(),units:sim.state.units.length};
 });
 try{
  await page.keyboard.down('d');
  await page.waitForFunction(()=>!!__previewIdentityWitness.first,undefined,{timeout:1200,polling:'raf'});
  const {first,executed}=await page.evaluate(()=>({first:__previewIdentityWitness.first,executed:__previewIdentityWitness.executed}));
  assert.ok(!executed||first.at<executed.at,'preview publication precedes authority consuming the new input');
  assert.ok(first.unchanged);assert.ok(first.baseline);assert.equal(first.hash,first.baseline.hash);assert.equal(first.rng,first.baseline.rng);assert.equal(first.sameState,true);assert.equal(first.sameLeader,true);
  if(waiting)assert.equal(first.tick,before.tick,'network wait leaves authority at its original boundary');
  await page.waitForFunction(()=>__previewIdentityWitness.positions?.length===5,undefined,{timeout:1500,polling:'raf'});
  const positions=await page.evaluate(()=>__previewIdentityWitness.positions);
  assert.ok(positions.every(Number.isFinite));assert.ok(new Set(positions.map(x=>x.toFixed(4))).size>1,`native-clock samples of the shared render model are continuous (not a frame-rate assertion): ${JSON.stringify(positions)}`);
  await page.keyboard.up('d');await page.keyboard.down('a');await page.evaluate(()=>new Promise(requestAnimationFrame));await page.keyboard.up('a');
  await page.keyboard.press('Space');await page.evaluate(()=>new Promise(requestAnimationFrame));await page.keyboard.press('Space');await page.evaluate(()=>new Promise(requestAnimationFrame));
  await page.waitForFunction(frame=>__army.performance.frames>frame,first.renderFrame,{timeout:5000,polling:'raf'});
  await release();await page.waitForFunction(sequence=>__army.BloomSimulation.session.localInputState.executedCommandSequence>=sequence+2,before.commandSequence,{timeout:5000,polling:'raf'});
  const confirmation=await page.evaluate(()=>__army.BloomSimulation.session.localInputState);assert.ok(confirmation.capture.executeTick>=confirmation.capture.captureTick);
  return{before,first,positions,inputToSampleMs:first.at-first.keyAt,confirmation,metrics:await readInputPreviewMetrics(page)};
 }finally{await page.keyboard.up('d');await page.keyboard.up('a');await page.evaluate(()=>{__previewIdentityWitness?.cleanup();delete globalThis.__previewIdentityWitness});}
}
export async function assertInputPreviewCleared(page){const state=await readInputPreviewMetrics(page);assert.equal(state.enabled,false);assert.equal(state.capability?.pendingCount??0,0);return state;}
