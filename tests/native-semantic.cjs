'use strict';
// Test-only oracle for incompatible ownership schemas. It compares observable
// values and alias topology, not historical wire bytes or insertion order.
// Same-build tests still require exact snapshot bytes and cache roundtrips.
const assert=require('node:assert/strict');
function normalize(value){
 const seen=new Map();
 function visit(source){
  if(!source||typeof source!=='object')return source;
  if(seen.has(source))return seen.get(source);
  if(source instanceof Uint8Array)return Array.from(source);
  const out=Array.isArray(source)?[]:{};seen.set(source,out);
  const controller=!!source.cooldownsMs&&typeof source.phase==='string'&&Array.isArray(source.hit),
   decision=typeof source.mode==='string'&&Object.hasOwn(source,'nextThink')&&Object.hasOwn(source,'safeSince'),
   movement=typeof source.type==='string'&&typeof source.team==='string'&&(source.movement||Object.hasOwn(source,'deployed')&&Object.hasOwn(source,'undeploy'));
  const omit=new Set(controller?['schema','timer','origin','remainingMs','durationMs','previousRemainingMs','left','fromX','fromY','fromZ']:decision?['schema','target','progress','avoid','targetId','targetHP','progressAt','avoidId','avoidUntil']:[]);
  if(movement)for(const k of ['movement','order','returning','visibleHuntReturn','deployed','undeploy'])omit.add(k);
  const actor=typeof source.type==='string'&&typeof source.hp==='number'&&typeof source.x==='number'&&typeof source.y==='number';
  const rolling=!!source.roll||Object.hasOwn(source,'rollCooldownMs'),primary=!!source.primaryAttack||Object.hasOwn(source,'moaCooldown');
  const impact=!!source.impact||Object.hasOwn(source,'impactVX')||Object.hasOwn(source,'impactVY'),body=!!source.body||Object.hasOwn(source,'bodyContact')||Object.hasOwn(source,'bodyLeanX')||Object.hasOwn(source,'bodyLeanY');
  const sprout=!!source.sprout||Object.keys(source).some(k=>/^sprout(Aim|Recoil|SeedKind|Kick|Charge)$|^sprout(Aim|Kick|Charge|Own)_/.test(k));
  if(rolling)for(const k of ['roll','rollCooldownMs','rollRemainingMs','rollInvulnerableMs','rollPose','rollX','rollY','rollLastX','rollLastY'])omit.add(k);
  if(primary)for(const k of ['primaryAttack','moaCooldown','pendingMoa','moaTarget','attackPose'])omit.add(k);
  if(impact)for(const k of ['impact','impactVX','impactVY'])omit.add(k);
  if(body)for(const k of ['body','bodyContact','bodyLeanX','bodyLeanY'])omit.add(k);
  if(actor)for(const k of ['spatial','worldX','worldY','worldZ'])omit.add(k);
  if(sprout)for(const k of Object.keys(source))if(k==='sprout'||/^sprout(Aim|Recoil|SeedKind|Kick|Charge)$|^sprout(Aim|Kick|Charge|Own)_/.test(k))omit.add(k);
  if(actor)omit.add('rarityLocked');
  // Auxiliary deadlines replace their old saved HUD countdown mirror.
  if(actor)omit.add('auxCooldowns');
  if(source.abilities&&source.growth)omit.add('aux');
  if(typeof source.nextFireMs==='number'&&typeof source.readyIdle==='boolean'){omit.add('displaySeconds');omit.add('sampledAtMs');}
  if(!primary){if(source.pendingMoa===null)omit.add('pendingMoa');if(source.moaTarget===0)omit.add('moaTarget');}
  if(Array.isArray(source.units)&&source.mother)omit.add('version');
  for(const key of ['migration','moaMigration'])if(source[key]===null)omit.add(key);
  for(const k of Object.keys(source))if(!omit.has(k))out[k]=visit(source[k]);
  if(rolling)out.roll=source.roll?visit(source.roll):{direction:{x:source.rollX||0,y:source.rollY||0},lastDirection:{x:source.rollLastX||0,y:source.rollLastY||0},cooldown:{leftMs:source.rollCooldownMs||0},invulnerability:{leftMs:source.rollInvulnerableMs||0},leftMs:source.rollRemainingMs||0,progress:source.rollPose||0};
  if(primary)out.primaryAttack=source.primaryAttack?visit(source.primaryAttack):{cooldown:{leftSeconds:source.moaCooldown||0},pose:{leftSeconds:source.attackPose||0},pending:visit(source.pendingMoa??null),targetId:source.moaTarget||0};
  if(impact)out.impact=source.impact?visit(source.impact):{velocity:{x:source.impactVX||0,y:source.impactVY||0}};
  if(body)out.body=source.body?visit(source.body):{contact:source.bodyContact||0,lean:{x:source.bodyLeanX||0,y:source.bodyLeanY||0}};
  if(actor){const constrained={};for(const [k,axis]of [['worldX','x'],['worldY','y'],['worldZ','z']])if(Object.hasOwn(source,k))constrained[axis]=source[k];out.spatial=source.spatial?visit(source.spatial):{constrained};}
  if(sprout){if(source.sprout)out.sprout=visit(source.sprout);else{const state={mounts:{}};for(const [key,field]of [['sproutAim','aim'],['sproutRecoil','recoil'],['sproutSeedKind','seedKind'],['sproutKick','kick'],['sproutCharge','charge']])if(Object.hasOwn(source,key))state[field]=source[key];for(const key of Object.keys(source)){const m=/^sprout(Aim|Kick|Charge|Own)_(.+)$/.exec(key);if(m)(state.mounts[m[2]]||(state.mounts[m[2]]={}))[m[1]==='Own'?'owned':m[1].toLowerCase()]=source[key]}out.sprout=state;}}

  if(controller){
   const timer=source.timer,origin=source.origin;
   out.timer={leftMs:timer?.leftMs??timer?.remainingMs??source.remainingMs,durationMs:timer?.durationMs??source.durationMs};
   if(timer&&Object.hasOwn(timer,'previousLeftMs'))out.timer.previousLeftMs=timer.previousLeftMs;
   else if(timer&&Object.hasOwn(timer,'previousRemainingMs'))out.timer.previousLeftMs=timer.previousRemainingMs;
   else if(Object.hasOwn(source,'previousRemainingMs'))out.timer.previousLeftMs=source.previousRemainingMs;
   if(timer)seen.set(timer,out.timer);
   out.origin=origin?visit(origin):{x:source.fromX,y:source.fromY,z:source.fromZ};
  }
  if(decision){
   out.target=source.target?visit(source.target):{id:source.targetId,hp:source.targetHP};
   out.progress=source.progress?visit(source.progress):{atSeconds:source.progressAt};
   out.avoid=source.avoid?visit(source.avoid):{id:source.avoidId,untilSeconds:source.avoidUntil};
  }
  if(movement){
   const m=source.movement;
   // Old same-runtime owners expose the deployment enum even though wire
   // snapshots contain only the two disjoint phase-dependent scalar views.
   const deployment=m?.deployment?visit(m.deployment):{phase:source.undeploy>0?'packing':source.deployed>0?'deploying':'packed',seconds:source.undeploy||source.deployed||0};
   out.movement={intent:m?.intent??source.order??'follow',homePhase:m?.homePhase??(source.returning?'return':'active'),causes:{visibility:m?.causes?.visibility??source.visibleHuntReturn??false},deployment};
   if(m){seen.set(m,out.movement);if(m.causes)seen.set(m.causes,out.movement.causes)}
  }
  return out;
 }
 return {value:visit(value),visit,seen};
}
// Canonical graph encoding detects lost aliases, cycles and sparse array holes.
function graph(value){const seen=new Map(),records=[];function ref(v){if(v===undefined)return{undefined:true};if(typeof v==='number'&&!Number.isFinite(v))return{number:String(v)};if(Object.is(v,-0))return{number:'-0'};if(!v||typeof v!=='object')return v;if(seen.has(v))return{ref:seen.get(v)};const id=records.length,entry={array:Array.isArray(v),values:[]};if(entry.array)entry.length=v.length;records.push(entry);seen.set(v,id);for(const k of Object.keys(v).sort())entry.values.push([k,ref(v[k])]);return{ref:id}}return{root:ref(value),records}}
function semanticSnapshot(e){
 const source=e.run('bloomCapture()'),normal=normalize(source.world),world=normal.value;
 // Spatial runtime cache ownership is normalized as well: the old controller's
 // fromZ anchor is the new origin record's z anchor. Actual heights remain in
 // the authoritative world. Empty metadata and key order are not gameplay.
 const spatial=[];
 for(const entry of source.spatial){
  const target=normal.visit(entry.object),anchor=entry.anchor;
  let common=anchor;
  // Checkpoint height is native spatial.constrained.z, validated as world data.
  // Its old duplicate worldZ anchor entry has no separate runtime meaning.
  if(anchor&&Object.hasOwn(anchor,'worldZ')){common={...anchor};delete common.worldZ;}
  if(entry.object.cooldownsMs&&anchor&&Object.hasOwn(anchor,'fromZ')){
   common={...anchor};delete common.fromZ;
   spatial.push({object:target.origin,anchor:{z:normal.visit(anchor.fromZ)}});
  }
  const record={object:target};if(entry.unit!==undefined)record.unit=normal.visit(entry.unit);if(common&&Object.keys(common).length)record.anchor=normal.visit(common);
  if(Object.hasOwn(record,'unit')||Object.hasOwn(record,'anchor'))spatial.push(record);
 }
 // Spatial cache traversal order changes with native nesting. Identify entries
 // by the canonical world object index and compare their metadata separately.
 const indexed=new Map(),queue=[world];while(queue.length){const v=queue.shift();if(!v||typeof v!=='object'||indexed.has(v))continue;indexed.set(v,indexed.size);for(const k of Object.keys(v).sort())queue.push(v[k])}
 const caches=spatial.map(r=>({object:indexed.get(r.object),unit:r.unit,anchor:r.anchor})).sort((a,b)=>a.object-b.object);
 return {world:graph(world),spatial:caches,tick:source.tick,seed:source.seed,timeUnit:source.timeUnit,tickRate:source.tickRate};
}
function sameSemantic(engines,label){assert.deepEqual(semanticSnapshot(engines[0]),semanticSnapshot(engines[1]),label+' semantic world/RNG/IDs/aliases/spatial');assert.deepEqual(graph(normalize(engines[0].run('bloomCurrentEffects')).value),graph(normalize(engines[1].run('bloomCurrentEffects')).value),label+' effect payload/order/IDs')}
module.exports={normalize,graph,semanticSnapshot,sameSemantic};
