// Presentation reads committed combat notices. It never pauses or writes simulation state.
export class CombatFeel {
 constructor(audio){this.audio=audio;this.world=null;this.sequence=0;this.effects=[];this.poses=new Map();this.bossHit=null;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.counts={hits:0,landings:0}}
 observe(world,now){
  if(this.world!==world){this.world=world;this.sequence=world.eventSequence;this.effects=[];this.poses.clear();this.bossHit=null;return}
  for(const e of world.notices){
   if(e.sequence<=this.sequence)continue;
   if(['boss-hit','unit-hit','unit-land','attack-launch','boss-launch'].includes(e.kind)){
    this.effects.push({...e,at:now});if(this.effects.length>48)this.effects.shift();
    if(e.kind==='boss-hit'){this.counts.hits++;this.bossHit={...e,at:now};this.audio.sound('strike',e.species||0)}
    if(e.kind==='unit-hit'){
     const u=world.units.find(u=>u.id===e.unit);if(u)this.poses.set(u.id,{at:now,until:now+180,heldUntil:now+(this.reduced?0:35),x:u.x,y:u.y,z:u.z,strength:e.strength});
     this.counts.hits++;this.audio.sound(e.attackKind==='sweep'?'heavy':'strike');
    }
    if(e.kind==='unit-land'){this.counts.landings++;if(e.strength>.2)this.audio.sound('land')}
    if(e.kind==='boss-launch')this.audio.sound('launch');
   }
  }
  this.sequence=world.eventSequence;this.effects=this.effects.filter(e=>now-e.at<430);for(const [id,p]of this.poses)if(now>p.until)this.poses.delete(id);
 }
 unit(u,now){
  const p=this.poses.get(u.id);if(!p||now>p.heldUntil)return u;
  return Object.assign(Object.create(Object.getPrototypeOf(u)),u,{x:p.x,y:p.y,z:p.z});
 }
 squash(id,now){const p=this.poses.get(id);return !p||this.reduced?0:Math.sin(Math.min(1,(now-p.at)/180)*Math.PI)*Math.min(.2,p.strength*.12)}
 boss(now){const e=this.bossHit;if(!e||this.reduced)return {x:0,y:0,squash:0};const q=Math.min(1,(now-e.at)/160),k=Math.sin(q*Math.PI)*(1-q);return{x:-e.nx*k*.1,y:-e.ny*k*.1,squash:k*.035}}
 draw(r,now){
  for(const e of this.effects){
   const q=(now-e.at)/430;if(q<0||q>1)continue;const c=r.ctx,heavy=e.attackKind==='sweep',impact=e.kind==='unit-hit'||e.kind==='boss-hit',landing=e.kind==='unit-land';
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
