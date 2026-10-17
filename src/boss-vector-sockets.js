import {BOSS_PATTERN_CONFIG} from './boss-patterns.js';
import {readVectorSockets,socketWorldPoint,WORLD_DEPTH_PROJECTION} from './vector-sockets.cjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const bossAssets=new Map();
// Runtime-only assets/players are never attached to a Garden or save snapshot.
export function bindBossSocketAsset(species,record){
  const label=`species ${species}, ${record.compiled.sourcePath||record.compiled.metadata.id}`;
  const anchors=readVectorSockets(record.compiled,label);
  bossAssets.get(species)?.player?.dispose();
  bossAssets.set(species,{record,anchors,player:null});
  return anchors;
}
export function unbindBossSocketAsset(species,record){
  const entry=bossAssets.get(species);if(entry?.record!==record)return;
  entry.player?.dispose();bossAssets.delete(species);
}
export function bossSummonPose(b,parts=new Set()){
  const config=BOSS_PATTERN_CONFIG['summon.mouth-t1'],phase=b.patternPhase,elapsed=Math.max(0,b.patternPhaseElapsed||0);
  const aim=Math.atan2(-WORLD_DEPTH_PROJECTION*Math.sin(b.patternAim??b.angle),Math.cos(b.patternAim??b.angle));
  const body={x:0,y:0,rotation:0,scaleX:1,scaleY:1},arms={'arm-left':0,'arm-right':0};
  let releasePulse=0;
  if(phase==='windup'){
    const wind=clamp(elapsed/config.windup,0,1),ease=wind*wind*(3-2*wind);
    body.y=2*ease;body.scaleX=1+.025*ease;body.scaleY=1-.035*ease;arms['arm-left']=-.34*ease;arms['arm-right']=.34*ease;
  }else if(phase==='active'||phase==='recover'){
    const last=(b.patternReleased||0)-1,age=last<0?1:phase==='active'?Math.max(0,elapsed-last*config.releaseInterval):elapsed;
    releasePulse=clamp(1-age/.16,0,1);body.scaleX=1+.025*releasePulse;body.scaleY=1-.018*releasePulse;body.rotation=aim*.02;arms['arm-left']=-.3;arms['arm-right']=.3;
  }
  const extras={};for(const part of ['foot-left','foot-right','leaf','kernel-mark','hilum'])if(parts.has(part))extras[part]={x:0,y:0,rotation:part==='leaf'?.08*releasePulse:0};
  return{body,arms,extras,impact:false,releasePulse};
}
export function sampleBossSummon(player,metadata,b){
  const name=b.patternPhase==='windup'?'windup':b.patternPhase==='recover'?'recover':'fire';
  const clipName=metadata.clips[name]?name:'idle',clip=metadata.clips[clipName];
  if(!clip)throw new Error(`Vector socket contract (${metadata.id}): summon clip ${name} or idle is required`);
  // Explicit phase seek has no crossfade/frame-history state. Restore and model
  // release sampling use exactly the same authored pose as the rendered summon.
  player.play(clipName,0);player.seek(Math.min(clip.durationMs,Math.max(0,b.patternPhaseElapsed||0)*1000));
  const pose=bossSummonPose(b);player.setBasePose('body',pose.body);
  return pose;
}
export function bossMouthWorldPoint(boss,released){
  const entry=bossAssets.get(boss.species);
  if(!entry)throw new Error(`Vector socket contract (species ${boss.species}): startup boss asset binding is missing`);
  const {record,anchors}=entry,action=boss.patternRuntime?.active;
  if(action?.id!=='summon.mouth-t1')throw new Error(`Vector socket contract (species ${boss.species}): mouth spawn requires the active summon pattern`);
  entry.player||=record.asset.createPlayer({clip:'idle',startedAtMs:0});
  sampleBossSummon(entry.player,record.compiled.metadata,{
    angle:boss.angle,patternAim:action.aim,patternPhase:action.phase,patternPhaseElapsed:action.phaseElapsed,patternReleased:released??action.released
  });
  return socketWorldPoint(boss,entry.player.getSocket('mouth'),anchors.ground);
}
