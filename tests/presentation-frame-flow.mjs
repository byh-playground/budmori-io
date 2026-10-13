import assert from 'node:assert/strict';

// Observe shipped render frames; never advance time, change authority or replace SDK methods.
export const presentationFrameProbe = `;(()=>{
 const stats=globalThis.__presentationFrames={frames:0,projectiles:0,elevated:0,retained:0,errors:[]};
 const begin=bloomBeginPresentation;
 const feedbackSample=CombatFeedback.sample;
 CombatFeedback.sample=function(p){const result=feedbackSample.call(this,p);if(!Number.isFinite(result.sx)&&stats.errors.length<8)stats.errors.push('invalid feedback '+JSON.stringify(p));return result;};
 bloomBeginPresentation=function(...args){
  const ready=begin(...args);if(!ready)return ready;
  const fail=message=>{if(stats.errors.length<8)stats.errors.push(message)};
  const frame=presentation.frame;stats.frames++;
  if(!frame||frame.nowMs!==presentation.frameNow)fail('one frame clock');
  if(!Number.isFinite(presentation.time)||presentation.time>presentation.currentTime)fail('display time bounds');
  const shots=bloomRenderProjectiles();let shotCount=0;
  frame.forEach((model,id,generation)=>{
   if(frame.sample(id,generation)!==model||frame.modelFor(model)!==model)fail('shared frame model');
   if(id.startsWith('unit:')&&bloomRenderUnit(model.id)!==model)fail('unit frame consumer');
   if(id.startsWith('projectile:')){
    const point=model.abilityShot?sproutVisualPoint(model):model;
    if(!Number.isFinite(point.y))fail('invalid shot '+JSON.stringify({model,point,owner:gearOwner(model)}));
    shotCount++;stats.projectiles++;
    if(!shots.includes(model))fail('projectile frame consumer');
    if(Number.isFinite(model.z)&&model.z>(model.groundZ||0)+20)stats.elevated++;
    if(![...presentation.maps.projectile.values()].some(entry=>entry.id===id))stats.retained++;
   }
  });
  if(shotCount!==shots.length)fail('display lifetime list');
  const local=bloomRenderUnit(bloomRenderWorld().local.leaderId);
  const pose=local&&presentationPose(local);
  if(!pose||pose.x!==local.x||pose.y!==local.y||pose.z!==local.z)fail('local preview/body shared position');
  return ready;
 };
})();`;

export async function assertPresentationFrames(page,{projectiles=false}={}){
 const stats=await page.evaluate(()=>globalThis.__presentationFrames);
 assert(stats?.frames>0,'Actual game frames were observed');assert.deepEqual(stats.errors,[]);
 if(projectiles)assert(stats.projectiles>0,'Actual projectile frames were observed');
 return stats;
}
