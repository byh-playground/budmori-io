import {ATTACK_TYPES,Ballistics,CONFIG,clamp,bossAttackArea} from './farm-model.js';
import {farmBreedingCooldown,farmSleepSeconds,splitArcProgress,sevenSegmentDigitLines} from './farm-indicators.js';
import {UNIT_GRADES} from './unit-grades.js';
import {capsuleContourPoints} from './attack-telegraph.js';
import {BOSS_PATTERN_CONFIG} from './boss-patterns.js';
const {bosses:BOSS_VECTOR_ASSETS,troops:TROOP_VECTOR_ASSETS}=globalThis.BudmoriVectorResources;
// Original SVG sources are compiled once by the startup loader before this module runs.
const {WebGLDevice,VectorContext,MeshRenderer}=globalThis.BloomGamekitRendering;
const {createVectorAsset}=globalThis.BloomGamekitVectorAssets;
// Historical Budmori grade outline colors come from the shared grade catalog.
const TIER_OUTLINE_COLORS=UNIT_GRADES.map(({outlineColor})=>{
  const rgb=outlineColor.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i).slice(1).map(value=>parseInt(value,16)/255);
  return [...rgb,1];
});
function unitMotion(u,sim){
  const dead=u.hp<=0||u.down>0,airborne=!u.dropLanded||u.z>.1,phase=u.ability?.phase||'idle';
  const moving=Math.hypot(u.vx||0,u.vy||0)>.18,kind=ATTACK_TYPES[u.species]?.kind;
  if(dead)return 'death';if(sim.scene==='raid'&&sim.encounter?.outcome==='victory')return 'victory';if(airborne)return 'airborne';if(u.stun>0)return 'hit';if(u.bounce>.04)return 'landing';
  if(phase==='windup')return 'windup';if(phase==='active')return 'fire';
  if(phase==='recover')return kind==='lob'&&u.ability?.action?.path&&u.ability.elapsed<.12?'fire':'recover';
  return moving?'walk':'idle';
}
function motionElapsedMs(u,name,clip){
  if(name==='idle'||name==='walk'||name==='airborne')return ((u.seed||0)*80)%clip.durationMs;
  if(name==='windup'||name==='fire'||name==='recover')return clamp((u.ability?.elapsed||0)*1000,0,clip.durationMs);
  if(name==='hit')return clip.durationMs*(1-clamp((u.stun||0)/.5,0,1));
  if(name==='landing')return clip.durationMs*(1-clamp((u.bounce||0)/.22,0,1));
  if(name==='victory')return ((Math.abs(u.seed||0)*97.531)%clip.durationMs);
  return clip.durationMs;
}
function unitExpression(u,sim){
  const dead=u.hp<=0||u.down>0,airborne=!u.dropLanded||u.z>.5;
  const joy=sim.scene==='farm'&&sim.effects.some(e=>['eat','birth','merge'].includes(e.kind)&&e.life<.85&&Math.hypot(e.x-u.x,e.y-u.y)<1.2);
  const phase=u.ability?.phase;
  const restingCooldown=sim.scene==='farm'&&u.cooldown>0&&phase==='idle';
  return dead?'dead':sim.scene==='raid'&&sim.encounter?.outcome==='victory'?'happy':u.stun>0?'hurt':airborne?'surprised':phase==='windup'?'focused':phase==='active'?'attack':restingCooldown?'neutral':joy?'happy':sim.scene==='farm'&&!u.fed?'hungry':'neutral';
}
function renderedBossAttackArea(boss,unitRadius=0){
  if(!boss?.patternId||boss.patternPhase==='recover')return null;
  return bossAttackArea({...boss,patternRuntime:{active:{
    id:boss.patternId,phase:boss.patternPhase,phaseElapsed:boss.patternPhaseElapsed,aim:boss.patternAim,locked:boss.patternLocked,
    start:{x:boss.patternStartX,y:boss.patternStartY,z:boss.patternStartZ},target:{x:boss.patternTargetX,y:boss.patternTargetY,z:boss.patternTargetZ}
  }}},unitRadius);
}
  // render.js
  const ATTACK_ACCENTS=['#8fac68','#dbb76b','#b58b9c','#9a6947'];
  var Diorama = class {
    constructor(canvas) {
      this.canvas = canvas;
      this.device = new WebGLDevice(canvas, { alpha: false, depth: false, stencil: false, antialias: true });
      this.ctx = new VectorContext(this.device);
      this.vectorAssets=new Map();this.vectorPlayers=new Map();
      const entries=Object.entries(TROOP_VECTOR_ASSETS);
      if(entries.length!==4||typeof createVectorAsset!=='function')throw new Error('All pinned GameKit troop and vector-assets sources are required');
      this.meshes=new MeshRenderer(this.device);this.ctx.meshRenderer=this.meshes;
      for(const [species,compiled] of entries)this.vectorAssets.set(Number(species),{compiled,asset:createVectorAsset(this.meshes,compiled)});
      this.bossAssets=new Map(Object.entries(BOSS_VECTOR_ASSETS).map(([id,compiled])=>[id,{compiled,asset:createVectorAsset(this.meshes,compiled)}]));
      this.bossPlayer=null;this.bossPlayerAsset=null;this.bossPlayers=new Map();this.assetsReady=false;this.prewarmStats=null;this.prewarmDurationMs=0;this.bossTelegraph=null;
      this.ctx.isBloomWebGL = true;
      this.canvas.dataset.rendererBackend = "Budmori authored 2.5D vectors";
      this.resize();
      const boss=this.bossAssets.get('chestnut');if(!boss)throw new Error('Pinned chestnut boss vector asset is required');
      const prewarmAt=performance.now();this.bossPlayer=boss.asset.createPlayer({clip:'idle',startedAtMs:0});this.bossPlayerAsset=boss;this.bossPlayers.set(3,{record:boss,player:this.bossPlayer});
      this.ctx.beginFrame({width:this.canvas.width,height:this.canvas.height,clearColor:[0.9,0.92,0.87,1]});
      this.bossPlayer.draw({projection:this.ctx.vector.projection,matrix:[.001,0,0,.001,100,100]});
      this.prewarmStats=this.ctx.endFrame();this.prewarmDurationMs=performance.now()-prewarmAt;this.assetsReady=true;
    }
    resize() {
      const r = this.canvas.getBoundingClientRect(), d = Math.min(globalThis.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(r.width * d);
      this.pixelRatio = d;
      this.canvas.height = Math.round(r.height * d);
      const aspect = r.width / r.height;this.aspect=aspect;this.scene=null;
      this.view = aspect > 1.2 ? [Math.max(12, 9 * aspect), 9] : [11.7, 11.7 / aspect];
      this.offset = [0, aspect < 0.8 ? 1.1 : -0.3];
      this.scale = this.canvas.width / (2 * this.view[0]);
    }
    project(x, y, z = 0) {
      return { x: (x + this.offset[0] + this.view[0]) * this.scale, y: (this.view[1] - (0.62 * y + 0.785 * z + this.offset[1])) * this.scale };
    }
    screenToWorld(clientX,clientY){const r=this.canvas.getBoundingClientRect(),px=(clientX-r.left)*this.pixelRatio,py=(clientY-r.top)*this.pixelRatio;return{x:px/this.scale-this.offset[0]-this.view[0],y:(this.view[1]-py/this.scale-this.offset[1])/.62}}
    configure(scene){
      if(this.scene===scene)return;this.scene=scene;const a=this.aspect;
      if(scene==='raid')this.view=a>1.2?[Math.max(26.5,17*a),17]:[26.5,26.5/a];
      else this.view=a>1.2?[Math.max(12,9*a),9]:[11.7,11.7/a];
      this.offset=[0,a<.8?1.1:-.3];this.scale=this.canvas.width/(2*this.view[0]);
    }
    ellipse(x, y, rx, ry, color2, angle = 0) {
      const c = this.ctx;
      c.fillStyle = color2;
      c.beginPath();
      c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), angle, 0, Math.PI * 2);
      c.fill();
    }
    groundEllipse(x, y, rx, ry, color2, z = 0) {
      const p = this.project(x, y, z);
      this.ellipse(p.x, p.y, rx * this.scale, ry * this.scale * 0.62, color2);
    }
    strokeGroundEllipse(x,y,rx,ry,color2,width=.08){const c=this.ctx,p=this.project(x,y);c.strokeStyle=color2;c.lineWidth=width*this.scale;c.beginPath();c.ellipse(p.x,p.y,rx*this.scale,ry*this.scale*.62,0,0,Math.PI*2);c.stroke()}
    strokeGroundCapsule(area,color2,width=.08){
      const c=this.ctx,points=capsuleContourPoints(area).map(point=>this.project(point.x,point.y));
      c.strokeStyle=color2;c.lineWidth=width*this.scale;c.beginPath();c.moveTo(points[0].x,points[0].y);
      for(const point of points.slice(1))c.lineTo(point.x,point.y);
      c.closePath();c.stroke();
    }
    groundPolygon(points,fill,stroke=null,width=.055){
      if(!points.length)return;const c=this.ctx,projected=points.map(point=>this.project(point.x,point.y));
      c.beginPath();c.moveTo(projected[0].x,projected[0].y);for(const point of projected.slice(1))c.lineTo(point.x,point.y);c.closePath();
      if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width*this.scale;c.stroke()}
    }
    groundSector(x,y,angle,sector,outerRadius,innerRadius=0,fill='#b46c4530',stroke='#b46c45'){
      const points=[],segments=Math.max(12,Math.ceil(sector/(Math.PI/48))),start=angle-sector/2,end=angle+sector/2;
      if(innerRadius<=0)points.push({x,y});
      for(let i=0;i<=segments;i++){const a=start+(end-start)*i/segments;points.push({x:x+Math.cos(a)*outerRadius,y:y+Math.sin(a)*outerRadius})}
      if(innerRadius>0)for(let i=segments;i>=0;i--){const a=start+(end-start)*i/segments;points.push({x:x+Math.cos(a)*innerRadius,y:y+Math.sin(a)*innerRadius})}
      this.groundPolygon(points,fill,stroke,.045);
      if(innerRadius<=0){const c=this.ctx,center=this.project(x,y),left=this.project(x+Math.cos(start)*outerRadius,y+Math.sin(start)*outerRadius),right=this.project(x+Math.cos(end)*outerRadius,y+Math.sin(end)*outerRadius);this.line(center,left,.035,stroke);this.line(center,right,.035,stroke)}
    }
    drawBossTelegraph(area){
      const color=area.active?'#bd6648':area.locked?'#d09852':'#a8755c',soft=area.active?'rgba(195,91,62,.2)':'rgba(199,147,77,.15)';
      if(area.kind==='sweep'){
        this.strokeGroundEllipse(area.x,area.y,Math.max(0,area.sweepRadius-area.width),Math.max(0,area.sweepRadius-area.width),color,area.active?.075:.12);
        const progress=area.active?area.progress:1;this.ring(area.x,area.y,area.outerRadius,color,.1,area.startAngle,area.startAngle+progress*Math.PI*2);
        this.ring(area.x,area.y,area.sweepRadius,'rgba(216,159,84,.25)',.045);
      }else if(area.kind==='sector'){
        this.groundSector(area.x,area.y,area.angle,area.sector,area.reach,0,soft,color);
      }else if(area.kind==='fan'){
        const inner=Math.max(0,area.reach-area.width),outer=area.reach+area.width;
        this.groundSector(area.x,area.y,area.angle,area.sector,outer,inner,soft,color);
        const q=area.active?clamp(area.progress,0,1):0,a=area.angle-area.sector/2+q*area.sector;
        const from=this.project(area.x+Math.cos(a)*inner,area.y+Math.sin(a)*inner),to=this.project(area.x+Math.cos(a)*outer,area.y+Math.sin(a)*outer);this.line(from,to,.12,area.active?'#f0c27b':'#d8ae70');
      }else if(area.kind==='charge'){
        const endRadius=area.active?Math.hypot(area.endX-area.x,area.endY-area.y):area.reach;
        this.strokeGroundCapsule({x:area.x,y:area.y,angle:area.angle,width:area.width,startRadius:0,endRadius:Math.max(.04,endRadius)},soft);
        const end=this.project(area.x+Math.cos(area.angle)*endRadius,area.y+Math.sin(area.angle)*endRadius),start=this.project(area.x,area.y);this.line(start,end,.045,color);
      }else if(area.kind==='leap'){
        const radius=area.reach,progress=area.progress||0,x=area.targetX,y=area.targetY;
        this.groundEllipse(x,y,radius,radius,soft);this.strokeGroundEllipse(x,y,radius,radius,color,area.active?.09:.12);
        this.strokeGroundEllipse(x,y,.46,.46,'#ead59b',.06);
        const from=this.project(area.x,area.y),to=this.project(x,y);this.line(from,to,.055,'rgba(184,110,69,.58)');
        const head=this.project(x-Math.cos(Math.atan2(y-area.y,x-area.x))*.56,y-Math.sin(Math.atan2(y-area.y,x-area.x))*.56);this.line(head,to,.10,color);
        if(area.active){const r=radius*(1-.2*progress);this.strokeGroundEllipse(x,y,r,r,'rgba(247,207,128,.7)',.045)}
      }else if(area.kind==='summon'){
        const config=BOSS_PATTERN_CONFIG[area.patternId],reach=config?.landingRadius||4.8,angle=area.angle,target={x:area.x+Math.cos(angle)*reach,y:area.y+Math.sin(angle)*reach};
        this.groundSector(area.x,area.y,angle,Math.PI/7,reach,.25,'rgba(183,125,73,.11)','rgba(178,129,76,.55)');
        this.line(this.project(area.x,area.y),this.project(target.x,target.y),.05,'rgba(167,123,74,.62)');
        this.groundEllipse(target.x,target.y,.65,.48,soft);this.strokeGroundEllipse(target.x,target.y,.65,.48,color,.085);
        this.ring(target.x,target.y,.28,'#f1d391',.045,0,Math.PI*1.8);
      }
    }
    ring(x, y, r, color2, width = 0.045, start = 0, end = Math.PI * 2) {
      const c = this.ctx, p = this.project(x, y);
      c.strokeStyle = color2;
      c.lineWidth = width * this.scale;
      c.beginPath();
      c.ellipse(p.x, p.y, r * this.scale, r * this.scale * 0.62, 0, -end, -start);
      c.stroke();
    }
    line(a, b, width, color2) {
      const c = this.ctx;
      c.strokeStyle = color2;
      c.lineWidth = width * this.scale;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
    }
    pixelLine(a,b,width,color2){
      const c=this.ctx;c.strokeStyle=color2;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
    }
    unitRingEffects(u,world){
      const effects=[],a=u.ability,s=ATTACK_TYPES[u.species];
      if(u.buffed&&u.hp>0)effects.push({radius:u.radius+.16,color:'#eacb72',width:.055,progress:1});
      if(a.phase==='windup'&&s)effects.push({radius:u.radius+.1,color:ATTACK_ACCENTS[u.species],width:.065,progress:Math.min(1,a.elapsed/s.windup)});
      const breeding=farmBreedingCooldown(u,world,CONFIG.breedCooldownSeconds);
      if(breeding&&breeding.progress>0)effects.push({radius:u.radius+.085,color:'#8fac68',width:.035,progress:breeding.progress});
      return effects;
    }
    drawUnitRingLayer(u,effects,side){
      for(const effect of effects){
        const arc=splitArcProgress(effect.progress)[side];
        if(arc)this.ring(u.x,u.y,effect.radius,effect.color,effect.width,arc[0],arc[1]);
      }
    }
    drawSevenSegmentDigit(digit,x,y,size,color){
      for(const [from,to] of sevenSegmentDigitLines(digit,x,y,size))this.pixelLine(from,to,size*.7,color);
    }
    drawSleepZ(x,y,size,color){
      const stroke=size*.32;
      this.pixelLine({x,y:y-size},{x:x+size,y:y-size},stroke,color);
      this.pixelLine({x:x+size,y:y-size},{x,y:y+size},stroke,color);
      this.pixelLine({x,y:y+size},{x:x+size,y:y+size},stroke,color);
    }
    drawSleepBadge(u,sim,pose){
      const seconds=farmSleepSeconds(u,sim.scene);if(!seconds)return;
      const d=this.pixelRatio,scale=1.75*d,w=43*d,h=16*d,x=pose.p.x-w/2,y=pose.p.y-pose.r*1.92-h/2;
      const c=this.ctx;
      c.fillStyle='#35473df0';c.beginPath();c.roundRect(x,y,w,h,h/2);c.fill();
      c.strokeStyle='#f3edcf';c.lineWidth=d;c.beginPath();c.roundRect(x,y,w,h,h/2);c.stroke();
      this.drawSleepZ(x+5.8*d,y+8*d,2.3*d,'#f3edcf');
      this.drawSleepZ(x+10.4*d,y+5.2*d,1.75*d,'#f3edcf');
      const label=String(Math.min(99,seconds)).padStart(2,'0');
      this.drawSevenSegmentDigit(Number(label[0]),x+24*d,y+8*d,scale,'#fff7db');
      this.drawSevenSegmentDigit(Number(label[1]),x+34*d,y+8*d,scale,'#fff7db');
    }
    drawVectorUnit(u,sim,p,r){
      const record=this.vectorAssets.get(u.species);if(!record)throw new Error('Missing required troop vector asset for species '+u.species);
      let player=this.vectorPlayers.get(u.id);
      const metadata=record.compiled.metadata,motionName=unitMotion(u,sim),clip=metadata.clips[motionName]||metadata.clips.idle;
      const clipStartAtMs=this.displayTimeMs-motionElapsedMs(u,motionName,clip);
      if(!player){player=record.asset.createPlayer({clip:motionName,startedAtMs:clipStartAtMs});this.vectorPlayers.set(u.id,player)}
      else if(player.currentClip!==motionName)player.play(motionName,clipStartAtMs);
      const expression=unitExpression(u,sim);if(expression!==player.currentExpression)player.setExpression(expression);
      player.seek(this.displayTimeMs);
      const [, ,width,height]=record.compiled.viewBox,scale=2*r/Math.max(width,height),centerY=p.y-r*.79;
      const matrix=[scale,0,0,scale,p.x-width*scale*.5,centerY-height*scale*.5];
      const outline=TIER_OUTLINE_COLORS[u.tier-1];
      if(outline){
        // One enlarged silhouette pass, never eight full asset redraws.
        const border=1.5*this.pixelRatio,factor=1+border/Math.max(r,1);
        const outlineMatrix=[scale*factor,0,0,scale*factor,p.x-width*scale*factor*.5,centerY-height*scale*factor*.5];
        player.draw({projection:this.ctx.vector.projection,matrix:outlineMatrix,color:outline,forceColor:true});
      }
      player.draw({projection:this.ctx.vector.projection,matrix});
      return true;
    }
    drawUnit(u,sim){
      const dead=u.hp<=0,walk=dead?0:Math.min(1,Math.hypot(u.vx,u.vy)),bob=u.z===0?Math.abs(Math.sin(sim.time*9+u.seed))*.10*walk:0,p=this.project(u.x,u.y,u.z+bob);
      const r=Math.max(u.size*this.scale*.78,(sim.scene==='raid'?4.5:11)*this.pixelRatio);
      this.drawVectorUnit(u,sim,p,r);
      return {p,r};
    }
    drawFarmUnitActor(u,sim){
      const effects=this.unitRingEffects(u,sim);
      this.drawUnitRingLayer(u,effects,'rear');
      const pose=this.drawUnit(u,sim);
      this.drawUnitRingLayer(u,effects,'front');
      this.drawSleepBadge(u,sim,pose);
    }
    bossPose(world){
      const b=world.boss,k=this.feel?.boss(this.displayTimeMs)||{x:0,y:0,squash:0},ground=this.project(b.x+k.x,b.y+k.y,0),p=this.project(b.x+k.x,b.y+k.y,b.z||0),r=this.scale*b.radius*1.16;
      return {b,p,ground,r,k};
    }
    bossMotion(b,world){
      const event=world.farmBossEvent;
      if(event?.phase==='celebrating'&&event.outcome==='defeat')return 'idle';
      if(b.hp<=0)return 'death';
      if(b.flash>.09&&b.patternPhase==='idle')return 'hit';
      if(b.patternPhase==='windup')return 'windup';
      if(b.patternPhase==='active'){
        if(b.patternId==='attack.sweep-360'||b.patternId==='attack.fan-sweep')return 'sweep';
        if(b.patternId==='attack.charge')return 'walk';
        if(b.patternId==='attack.leap-slam')return b.z>.1?'airborne':'strike';
        if(b.patternId==='summon.mouth-t1')return 'fire';
        return 'strike';
      }
      if(b.patternPhase==='recover')return 'recover';
      return b.phase==='chase'?'walk':'idle';
    }
    drawBoss(world){
      const {b,p,r,k}=this.bossPose(world),event=world.farmBossEvent,species=Number.isInteger(b.species)?b.species:3;
      const record=species===3?this.bossAssets.get('chestnut'):this.vectorAssets.get(species);if(!record)throw new Error('Missing required boss vector asset for species '+species);
      let instance=this.bossPlayers.get(species);if(!instance){const player=record.asset.createPlayer({clip:'idle',startedAtMs:this.displayTimeMs});instance={record,player};this.bossPlayers.set(species,instance)}
      const player=instance.player;this.bossPlayer=player;this.bossPlayerAsset=record;
      const metadata=record.compiled.metadata,name=this.bossMotion(b,world),fallbackClip=name==='airborne'?(metadata.clips.strike?'strike':metadata.clips.fire?'fire':'idle'):['strike','sweep','fire'].includes(name)&&!metadata.clips[name]?(metadata.clips.fire?'fire':'idle'):'idle',clipName=metadata.clips[name]?name:fallbackClip,clip=metadata.clips[clipName];
      const timed=['windup','strike','sweep','recover','hit','death','fire','airborne'].includes(name),elapsed=b.patternId?b.patternPhaseElapsed:b.clock;
      const clipStartAtMs=timed?this.displayTimeMs-Math.min(clip.durationMs,Math.max(0,elapsed||0)*1000):name==='walk'?this.displayTimeMs-Math.max(0,b.travel||0)*110:this.displayTimeMs-((b.travel||0)*37%clip.durationMs);
      if(player.currentClip!==clipName)player.transitionTo(clipName,clipStartAtMs,70);
      const summonOpen=b.patternId==='summon.mouth-t1'&&(b.patternPhase==='active'||b.patternPhase==='windup'&&b.patternPhaseElapsed>=BOSS_PATTERN_CONFIG['summon.mouth-t1'].windup*.5);
      const expression=b.hp<=0?'dead':event?.phase==='celebrating'&&event.outcome==='defeat'?'happy':summonOpen?'attack':b.patternPhase==='windup'?'focused':b.patternPhase==='active'?'attack':b.flash>.07?'hurt':'neutral';
      if(!metadata.expressions?.[expression]&&!metadata.expressions?.neutral)throw new Error('Boss asset is missing a supported expression');
      const safeExpression=metadata.expressions?.[expression]?expression:'neutral';if(player.currentExpression!==safeExpression)player.setExpression(safeExpression);
      player.seek(this.displayTimeMs);
      const [, ,width,height]=record.compiled.viewBox,s=2*r/220,ground=metadata.sockets?.ground?.point||[width/2,height],anchorX=ground[0],anchorY=ground[1],matrix=[s,0,0,s,p.x-anchorX*s,p.y-anchorY*s];
      const defeatBounce=event?.phase==='celebrating'&&event.outcome==='defeat'?Math.max(0,Math.sin(event.elapsed*Math.PI*2/CONFIG.farmBossEvent.celebrationSeconds*2)):0,summonConfig=BOSS_PATTERN_CONFIG['summon.mouth-t1'],summonSquash=b.patternId==='summon.mouth-t1'&&b.patternPhase==='windup'?.12*Math.sin(Math.PI*clamp((b.patternPhaseElapsed||0)/summonConfig.windup,0,1)):0;
      const fade=event?.phase==='fading'?clamp(1-event.elapsed/CONFIG.farmBossEvent.fadeSeconds,0,1):1;
      player.setBasePose('body',{y:-18*defeatBounce,scaleX:(1+(k.squash||0)+summonSquash)*(1-.04*defeatBounce),scaleY:(1-(k.squash||0)-summonSquash*.65)*(1+.06*defeatBounce),opacity:fade});
      const parts=new Set(metadata.parts.map(part=>part.id)),aiming=b.patternId&&b.patternPhase!=='idle',target=Math.atan2(-.62*Math.sin(b.patternAim),Math.cos(b.patternAim));
      if(parts.has('arm-right')&&parts.has('arm-left')){
        if(aiming&&b.patternId==='summon.mouth-t1'&&b.patternPhase==='active'){
          player.setBasePose('arm-right',{rotation:.42});player.setBasePose('arm-left',{rotation:-.42});
        }else if(aiming){player.setBasePose('arm-right',{rotation:target-.504});player.setBasePose('arm-left',{rotation:target+Math.PI-2.637})}
        else{player.setBasePose('arm-right',{rotation:0});player.setBasePose('arm-left',{rotation:0})}
      }
      player.draw({projection:this.ctx.vector.projection,matrix});
      if(b.patternId==='summon.mouth-t1'&&b.patternPhase==='active'&&b.patternReleased>0){
        this.ctx.flush();const mouth=this.project(b.summonMouthX,b.summonMouthY,b.summonMouthZ),pulse=.55+.45*Math.sin((b.patternPhaseElapsed||0)*Math.PI*8);
        this.ellipse(mouth.x,mouth.y,this.scale*.18*pulse,this.scale*.12*pulse,'rgba(255,210,113,.72)');
        this.ellipse(mouth.x+Math.cos(target)*this.scale*.16,mouth.y+Math.sin(target)*this.scale*.10,this.scale*.065,this.scale*.08,'#fff1ad');
      }
    }
    terrain(sim2) {
      const c = this.ctx, S = this.scale, raid=sim2.scene==='raid',rx=raid?CONFIG.raid.radiusX:9.5,ry=raid?CONFIG.raid.radiusY:6.8;
      this.groundEllipse(0, -0.2, rx+1.3, ry+1.1, "#bcc7a6");
      this.groundEllipse(0, 0, rx+1.2, ry+1.1, sim2.scene === "farm" ? "#d1d8b8" : "#cecfb3");
      this.groundEllipse(0, 0.15, rx+.3, ry+.3, sim2.scene === "farm" ? "#d9dfc2" : "#d7d8bf");
      for (let i = 0; i < 92; i++) {
        const a = i * 2.39996, rad = Math.sqrt((i + 0.5) / 92), x = Math.cos(a) * (rx+.3) * rad, y = Math.sin(a) * (ry+.3) * rad, p = this.project(x, y);
        this.ellipse(p.x, p.y, S * 0.026, S * 0.02, "#a7b58b80");
      }
      for (let i = 0; i < 24; i++) {
        const a = i * 2.39996, x = Math.cos(a) * (rx+.55), y = Math.sin(a) * (ry+.55), p = this.project(x, y);
        this.ellipse(p.x, p.y, 0.25 * S, 0.11 * S, "#94a577", a);
        this.ellipse(p.x + 0.1 * S, p.y - 0.09 * S, 0.19 * S, 0.075 * S, "#a8b78a", a + 0.7);
      }
      if(raid){
        this.strokeGroundEllipse(0,0,CONFIG.raid.radiusX-.5,CONFIG.raid.radiusY-.5,'#728e61a8',.075);
        if(this.dropTarget){const t=this.dropTarget;this.groundEllipse(t.x,t.y,.32,.22,t.valid?'#f3d58a55':'#b56d6266');this.strokeGroundEllipse(t.x,t.y,.36,.25,t.valid?'#f4e0a0':'#b36359',.055)}
      }
      const event=sim2.farmBossEvent,area=(raid||sim2.scene==='farm'&&event?.phase==='fighting')?renderedBossAttackArea(sim2.boss,CONFIG.maxUnitRadius):null;this.bossTelegraph=area;
      if(area)this.drawBossTelegraph(area);
    }

    render(sim2,feel=null,now=performance.now()) {
      this.feel=feel;this.displayTimeMs=now;this.configure(sim2.scene);
      const c = this.ctx;
      c.beginFrame({ width: this.canvas.width, height: this.canvas.height, clearColor: [0.9, 0.92, 0.87, 1] });
      this.terrain(sim2);
      for (const u of sim2.units) {
        const a = clamp(0.22 / (1 + u.z * .3), 0.045, 0.22),shadow=u.size*.66/(1+u.z*.65);
        this.groundEllipse(u.x, u.y, shadow, shadow * .62, `rgba(42,61,35,${a})`);
        if (u.down > 0) this.ring(u.x, u.y, 0.45, "#aa9a60");
      }
      const farmBossVisible=sim2.scene==='farm'&&sim2.farmBossEvent?.phase!=='idle';
      if(sim2.scene==='raid'||farmBossVisible){this.groundEllipse(sim2.boss.x,sim2.boss.y,sim2.boss.radius*1.05,sim2.boss.radius*.75,'#38472c33')}
      const hiddenMergeResultId=sim2.scene==='farm'&&sim2.mode==='merge'&&sim2.mergeTask?.phase==='animation'?sim2.mergeTask.resultId:0;
      const actors = sim2.units.filter(unit=>unit.id!==hiddenMergeResultId).map((u) => ({ depth: 0.785 * u.y - 0.62 * u.z, id: u.id, vector:this.vectorAssets.has(u.species), draw: () => this.drawFarmUnitActor(u, sim2) }));
      if (sim2.scene === "raid"||farmBossVisible) actors.push({ depth: 0.785 * sim2.boss.y - .62*(sim2.boss.z||0), id: 0, vector:true, draw: () => this.drawBoss(sim2) });
      if (sim2.scene === "farm") for (const f of sim2.food) actors.push({ depth: 0.785 * f.y - 0.62 * f.z, id: -1, draw: () => {
        this.groundEllipse(f.x,f.y,.10,.07,"#55452433");
        if(f.phase === "flight") {
          const tail=this.project(f.x-f.vx*.045,f.y-f.vy*.045,Math.max(0,f.z-f.vz*.045)+.1),head=this.project(f.x,f.y,f.z+.1);
          this.line(tail,head,.055,"#e6bd7480");
        }
        const p = this.project(f.x, f.y, f.z + 0.1);
        this.ellipse(p.x, p.y, this.scale * 0.09, this.scale * 0.12, "#c78a43", 0.4);
        this.ellipse(p.x - 0.025 * this.scale, p.y - 0.08 * this.scale, this.scale * 0.036, this.scale * 0.05, "#e7bf72");
      } });
      if(sim2.scene==="raid"||farmBossVisible)for(const f of sim2.projectiles)actors.push({depth:.785*f.y-.62*f.z,id:-f.id,draw:()=>{
        const p=this.project(f.x,f.y,f.z),tail=Ballistics.sample(f.path,Math.max(0,(f.elapsed-.04)/f.path.duration));
        this.groundEllipse(f.x,f.y,.14,.10,"#55452433");
        if(f.isPopcorn&&f.landed){
          const fuse=Math.max(0,Math.min(1,f.fuseRemaining||0));
          this.groundEllipse(f.x,f.y,.16,.12,f.exploded?"#d86c3b55":"#c78a4366");
          if(!f.exploded&&f.popcornConfig?.radius>0)this.ring(f.x,f.y,f.popcornConfig.radius,"rgba(190,111,52,.18)",.035);
          if(f.exploded){const progress=Math.max(0,Math.min(1,(f.explosionLife||0)/.5));this.ring(f.x,f.y,(f.popcornConfig?.radius||.3)*(.25+.75*progress),`rgba(224,111,54,${.68*(1-progress)})`,.12);}
          else this.ring(f.x,f.y,.2+.2*(1-fuse),`rgba(238,181,83,${.45+.4*(1-fuse)})`,.045);
          const kernel=this.project(f.x,f.y,.12);this.ellipse(kernel.x,kernel.y,this.scale*.13,this.scale*.08,f.exploded?"#e37f42":"#d4a347",.2);
          this.ellipse(kernel.x-this.scale*.035,kernel.y-this.scale*.02,this.scale*.045,this.scale*.03,"#ffe0a0");
        }else if(f.projectileKind==="chestnut-spike"){
          const angle=Math.atan2(f.path.to.y-f.path.from.y,f.path.to.x-f.path.from.x),tip={x:p.x+Math.cos(angle)*this.scale*.22,y:p.y-.62*Math.sin(angle)*this.scale*.22};
          this.line(this.project(tail.x,tail.y,tail.z),p,.055,"#778f4c88");this.line(p,tip,.105,"#79964e");
          this.ellipse(tip.x,tip.y,this.scale*.045,this.scale*.035,"#d5df9d",angle);
        }else{
          this.line(this.project(tail.x,tail.y,tail.z),p,.07,"#ba964a80");
          this.ellipse(p.x,p.y,this.scale*.14,this.scale*.2,"#cfa957",.3);
          this.ellipse(p.x-this.scale*.03,p.y-this.scale*.05,this.scale*.05,this.scale*.08,"#fff0ae");
        }
      }});
      actors.sort((a, b) => b.depth - a.depth || a.id - b.id);
      let vectorRun=false;
      for (const actor of actors) {
        if(actor.vector&&!vectorRun){c.flush();vectorRun=true}
        else if(!actor.vector&&vectorRun){c.flush();vectorRun=false}
        actor.draw();
      }
      if(vectorRun)c.flush();
      const liveUnitIds=new Set(sim2.units.map(unit=>unit.id));
      for(const [id,player] of this.vectorPlayers)if(!liveUnitIds.has(id)){player.dispose();this.vectorPlayers.delete(id)}
      feel?.draw(this,this.displayTimeMs);
      for (const e of sim2.effects) {
        const delay=Number.isFinite(e.delay)?e.delay:0,span=Number.isFinite(e.span)?e.span:1;
        if(e.life<delay)continue;
        const q=Number.isFinite(e.span)?clamp((e.life-delay)/span,0,1):e.life;
        if (e.kind === "feed") this.ring(e.x,e.y,.15+q*.35,`rgba(166,121,59,${(1-q)*.6})`,.035);
        else if(e.kind === "food-land") {
          const t=Math.min(1,q/.35);this.ring(e.x,e.y,.10+t*.42,`rgba(194,145,62,${(1-t)*.85})`,.055);
          for(let i=0;i<3&&t<1;i++){const a=i*Math.PI*2/3,p=this.project(e.x+Math.cos(a)*t*.4,e.y+Math.sin(a)*t*.4,.08+Math.sin(t*Math.PI)*.2);this.ellipse(p.x,p.y,this.scale*.045,this.scale*.035,`rgba(245,213,133,${1-t})`);}
        }
        else if (e.kind === "land" || e.kind === "impact") this.ring(e.x, e.y, 0.1 + q * 0.8, `rgba(146,131,78,${(1 - q) * 0.65})`);
        else if(e.kind==='landing-shockwave'){
          const progress=clamp(q/(e.duration||.55),0,1),radius=Math.max(.08,e.radius)*(.2+.8*progress);
          this.groundEllipse(e.x,e.y,radius,radius,`rgba(225,190,103,${.12*(1-progress)})`);
          this.ring(e.x,e.y,radius,`rgba(234,194,104,${.82*(1-progress)})`,.12*(1-progress)+.025);
          this.ring(e.x,e.y,Math.max(.05,radius-.12),`rgba(250,225,158,${.55*(1-progress)})`,.045);
        }
        else if(e.kind==='popcorn-explosion'){
          const progress=clamp(q/(e.duration||.5),0,1),radius=Math.max(.08,e.radius)*(.18+.82*progress);
          this.groundEllipse(e.x,e.y,radius,radius,`rgba(235,143,63,${.18*(1-progress)})`);
          this.ring(e.x,e.y,radius,`rgba(233,115,49,${.88*(1-progress)})`,.1*(1-progress)+.025);
          this.ring(e.x,e.y,Math.max(.05,radius*.72),`rgba(255,206,101,${.7*(1-progress)})`,.055);
          for(let i=0;i<5;i++){const a=i*Math.PI*2/5+progress*.8,d=radius*(.55+.3*progress),p=this.project(e.x+Math.cos(a)*d,e.y+Math.sin(a)*d,.08*(1-progress));this.ellipse(p.x,p.y,this.scale*.045*(1-progress),this.scale*.03*(1-progress),`rgba(255,216,119,${1-progress})`,a)}
        }
        else if(e.kind==='popcorn-kernel-impact'){
          const progress=clamp(q/(e.duration||.25),0,1);this.ring(e.x,e.y,.08+progress*(e.radius||.1)*1.6,`rgba(225,150,72,${.65*(1-progress)})`,.045);
        }
        else if(e.kind==='drop-dust'){const t=Math.min(1,q/.28);this.ring(e.x,e.y,.12+t*.4,`rgba(126,126,99,${(1-t)*.42})`,.045);for(let i=0;i<4;i++){const a=i*Math.PI/2+t*.35,p=this.project(e.x+Math.cos(a)*t*.33,e.y+Math.sin(a)*t*.22,.025+Math.sin(t*Math.PI)*.1);this.ellipse(p.x,p.y,this.scale*.045,this.scale*.03,`rgba(179,169,137,${1-t})`)}}
        else if(e.kind==='merge-material'){
          const t=clamp(q,0,1),x=e.x+(e.targetX-e.x)*t,y=e.y+(e.targetY-e.y)*t,z=(e.z||0)+Math.sin(Math.PI*t)*.55;
          const start=this.project(e.x,e.y,e.z||0),point=this.project(x,y,z);
          this.line(start,point,.045,`rgba(88,185,187,${.2+.65*(1-t)})`);
          this.ellipse(point.x,point.y,this.scale*.12*(1-.4*t),this.scale*.09*(1-.4*t),`rgba(88,185,187,${1-.35*t})`,t*Math.PI);
        }
        else if (e.kind === "birth" || e.kind === "merge") {
          const birth=e.kind==="birth", color=birth?"#df87a4":"#58b9bb";
          this.ring(e.x,e.y,birth ? .35+q*1.5 : 1.8*(1-q)+.15,color,.07);
          for(let i=0;i<6;i++) {
            const a=i*Math.PI/3+q*(birth?.3:2), spread=birth?.4+q*1.3:1.8*(1-q);
            const p=this.project(e.x+Math.cos(a)*spread,e.y+Math.sin(a)*spread,e.z+q*.9);
            const r=this.scale*.14; c.fillStyle=color;
            if(birth) {
              this.ellipse(p.x-r*.44,p.y-r*.25,r*.6,r*.6,color); this.ellipse(p.x+r*.44,p.y-r*.25,r*.6,r*.6,color);
              c.beginPath(); c.moveTo(p.x-r,p.y); c.lineTo(p.x,p.y+r); c.lineTo(p.x+r,p.y); c.closePath(); c.fill();
            } else {
              c.beginPath(); c.moveTo(p.x,p.y-r*1.5); c.lineTo(p.x+r,p.y); c.lineTo(p.x,p.y+r*1.5); c.lineTo(p.x-r,p.y); c.closePath(); c.fill();
            }
          }
        }
        else if (e.kind === "eat") {
          for (let i = 0; i < 3; i++) {
            const a = i * Math.PI * 2 / 3, t=Math.min(1,q/.45), p = this.project(e.x + Math.cos(a) * t*.35, e.y + Math.sin(a) * t*.35, e.z + t*.6);
            this.ellipse(p.x, p.y, this.scale * 0.05, this.scale * 0.075, `rgba(255,235,160,${Math.max(0,1-q/.45)})`, a);
          }
        }
      }
      this.stats = c.endFrame();
    }
    dispose(){
      for(const player of this.vectorPlayers.values())player.dispose();this.vectorPlayers.clear();
      for(const record of this.vectorAssets.values())record.asset.dispose();this.vectorAssets.clear();
      for(const {player} of this.bossPlayers.values())player.dispose();this.bossPlayers.clear();this.bossPlayer=null;for(const record of this.bossAssets?.values()||[])record.asset.dispose();this.bossAssets?.clear();
      this.ctx.dispose();this.device.dispose();
    }
  };


export {Diorama};
