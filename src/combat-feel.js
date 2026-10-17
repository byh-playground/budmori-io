import {presentationEventTimeMs} from './farm-model.js';
const {ObjectPool}=globalThis.BloomGamekitObjectPool;
// Only these primitive unit-land notice copies are owned by the display queue.
// Garden notices, interpolation history and the longer-lived bossHit alias are not pooled.
const createLandingEffect=()=>({sequence:0,kind:'unit-land',time:0,unit:null,x:0,y:0,z:0,strength:0,at:0,heard:false});
function resetLandingEffect(e){e.sequence=e.time=e.x=e.y=e.z=e.strength=e.at=0;e.unit=null;e.heard=false}

// Presentation reads committed combat notices. It never pauses or writes simulation state.
export class CombatFeel {
 constructor(audio){this.audio=audio;this.world=null;this.revision=null;this.sequence=0;this.effects=[];this.landingPool=new ObjectPool(createLandingEffect,resetLandingEffect,48);this.poses=new Map();this.bossHit=null;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.counts={hits:0,landings:0}}
 acquireLandingEffect(e,at){
  const event=this.landingPool.acquire();
  event.sequence=e.sequence;event.time=e.time;event.unit=e.unit;event.x=e.x;event.y=e.y;event.z=e.z;event.strength=e.strength;event.at=at;event.heard=false;
  return event;
 }
 releaseEffect(event){if(event.kind==='unit-land')this.landingPool.release(event)}
 observe(world,displayTimeMs,revision=0){
  if(this.world!==world||this.revision!==revision){this.world=world;this.revision=revision;this.sequence=world.eventSequence;for(const e of this.effects)this.releaseEffect(e);this.effects.length=0;this.poses.clear();this.bossHit=null;return}
  for(const e of world.notices){
   if(e.sequence<=this.sequence)continue;
   if(['boss-hit','unit-hit','unit-land','attack-launch','boss-launch'].includes(e.kind)){
    const at=presentationEventTimeMs(e),event=e.kind==='unit-land'?this.acquireLandingEffect(e,at):{...e,at,heard:false};
    this.effects.push(event);if(this.effects.length>48)this.releaseEffect(this.effects.shift());
    if(e.kind==='boss-hit'){this.counts.hits++;this.bossHit=event}
    if(e.kind==='unit-hit'){
     this.poses.set(e.unit,{at,until:at+180,strength:e.strength});this.counts.hits++;
    }
    if(e.kind==='unit-land')this.counts.landings++;
   }
  }
  this.sequence=world.eventSequence;
  // Finish compaction before the next acquire; no released queue slot is read again.
  let retained=0;for(const e of this.effects)if(displayTimeMs-e.at<430)this.effects[retained++]=e;else this.releaseEffect(e);this.effects.length=retained;
  for(const [id,p]of this.poses)if(displayTimeMs>p.until)this.poses.delete(id);
 }
 squash(id,displayTimeMs){const p=this.poses.get(id);return !p||this.reduced?0:Math.sin(Math.min(1,(displayTimeMs-p.at)/180)*Math.PI)*Math.min(.2,p.strength*.12)}
 boss(displayTimeMs){const e=this.bossHit;if(!e||this.reduced)return {x:0,y:0,squash:0};const q=Math.max(0,Math.min(1,(displayTimeMs-e.at)/160)),k=Math.sin(q*Math.PI)*(1-q);return{x:-e.nx*k*.1,y:-e.ny*k*.1,squash:k*.035}}
 sound(event){
  if(event.kind==='boss-hit')this.audio.sound('strike',event.species||0);
  else if(event.kind==='unit-hit')this.audio.sound(event.attackKind==='sweep'?'heavy':'strike');
  else if(event.kind==='unit-land'&&event.strength>.2)this.audio.sound('land');
  else if(event.kind==='boss-launch')this.audio.sound('launch');
 }
 draw(r,displayTimeMs){
  for(const e of this.effects){
   const age=displayTimeMs-e.at;if(age<0||age>430)continue;if(!e.heard){e.heard=true;this.sound(e)}
   const q=age/430,heavy=e.attackKind==='sweep',impact=e.kind==='unit-hit'||e.kind==='boss-hit',landing=e.kind==='unit-land';
   if(e.kind==='attack-launch'){
    const t=Math.min(1,q/.35),p=r.project(e.x,e.y,e.z+.2);if(t<1)r.ellipse(p.x,p.y,r.scale*.12*(1-t),r.scale*.2*(1-t),'#ffe7a6');continue;
   }
   if(!impact&&!landing)continue;
   const t=Math.min(1,q/(landing?.9:.7)),alpha=1-t;if(alpha<=0)continue;
   const size=landing?.7:heavy?1.15:.6,color=landing?'157,142,107':e.kind==='boss-hit'?'245,199,102':'231,147,83';
   r.ring(e.x,e.y,.15+t*size,`rgba(${color},${alpha*.8})`,landing?.045:.075);
   const center=r.project(e.x,e.y,e.z||.1),n=landing?5:6;
   for(let i=0;i<n;i++){
    const a=i*Math.PI*2/n+(e.sequence%11)*.19,d=(.12+t*size)*(landing?1.2:1),p=r.project(e.x+Math.cos(a)*d,e.y+Math.sin(a)*d,(e.z||.1)+(landing?.12:Math.sin(t*Math.PI)*.5));
    if(landing)r.ellipse(p.x,p.y,r.scale*.09*(1-t),r.scale*.045*(1-t),`rgba(${color},${alpha*.65})`,a);
    else {const inner={x:center.x+(p.x-center.x)*.55,y:center.y+(p.y-center.y)*.55};r.line(inner,p,.055,`rgba(255,242,190,${alpha})`)}
   }
   if(impact&&t<.28)r.ellipse(center.x,center.y,r.scale*.18*(1-t),r.scale*.12*(1-t),'#fff4d6');
  }
 }
}
