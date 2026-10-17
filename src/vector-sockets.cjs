'use strict';
// Points are already in the compiled SVG canvas coordinate system. Source SVG
// transforms are baked into geometry; never apply them again to these anchors.
function readVectorSockets({metadata,viewBox,sourcePath},label=sourcePath||metadata?.id||'unknown asset'){
  const fail=message=>{throw new Error(`Vector socket contract (${label}): ${message}`)};
  if(!Array.isArray(viewBox)||viewBox.length!==4||!viewBox.every(Number.isFinite)||viewBox[2]<=0||viewBox[3]<=0)fail('a finite SVG viewBox is required');
  const parts=new Map((metadata?.parts||[]).map(part=>[part.id,part]));
  const anchors={};
  for(const name of ['mouth','ground']){
    const socket=metadata?.sockets?.[name];
    if(!socket||!parts.has(socket.part))fail(`${name} must name an authored part`);
    if(!Array.isArray(socket.point)||socket.point.length!==2||!socket.point.every(Number.isFinite))fail(`${name} must contain two finite canvas coordinates`);
    const [x,y]=socket.point;
    if(x<viewBox[0]||x>viewBox[0]+viewBox[2]||y<viewBox[1]||y>viewBox[1]+viewBox[3])fail(`${name} lies outside the SVG canvas`);
    anchors[name]=Object.freeze({part:socket.part,x,y});
  }
  if(anchors.ground.part!=='body')fail('ground must belong to body');
  if(anchors.mouth.y>=anchors.ground.y)fail('mouth must be above the authored ground baseline');
  return Object.freeze(anchors);
}
const BOSS_VECTOR_DIAMETER=220,BOSS_VECTOR_RADIUS_SCALE=1.16,WORLD_HEIGHT_PROJECTION=.785,WORLD_DEPTH_PROJECTION=.62;
function bossVectorScale(radius){return 2*radius*BOSS_VECTOR_RADIUS_SCALE/BOSS_VECTOR_DIAMETER}
function socketWorldPoint(boss,socket,ground){
  const scale=bossVectorScale(boss.radius);
  // Boss art is a screen-facing billboard. Its canvas x is world x, not facing
  // distance. Keep the static ground baseline fixed to the world's shadow root.
  return{x:boss.x+(socket.x-ground.x)*scale,y:boss.y,z:(boss.z||0)+(ground.y-socket.y)*scale/WORLD_HEIGHT_PROJECTION};
}
module.exports={readVectorSockets,bossVectorScale,socketWorldPoint,WORLD_HEIGHT_PROJECTION,WORLD_DEPTH_PROJECTION};
