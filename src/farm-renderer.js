import {ATTACK_TYPES,Ballistics,CONFIG,clamp,bossAttackArea} from './farm-model.js';
const {bosses:BOSS_VECTOR_ASSETS,troops:TROOP_VECTOR_ASSETS}=globalThis.BudmoriVectorResources;
// Original SVG sources are compiled once by the startup loader before this module runs.
const {WebGLDevice,VectorContext,MeshRenderer}=globalThis.BloomGamekitRendering;
const {createVectorAsset}=globalThis.BloomGamekitVectorAssets;
// Historical Budmori grade outline colors for the currently supported T1–T4.
const TIER_OUTLINE_COLORS=[
  [0xd8/255,0xd4/255,0xbd/255,1],
  [0x83/255,0xce/255,0x76/255,1],
  [0x78/255,0xb9/255,0xff/255,1],
  [0xbd/255,0x8c/255,0xff/255,1]
];
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
      this.bossPlayer=null;this.bossPlayerAsset=null;this.assetsReady=false;this.prewarmStats=null;this.prewarmDurationMs=0;this.bossTelegraph=null;
      this.ctx.isBloomWebGL = true;
      this.canvas.dataset.rendererBackend = "Budmori authored 2.5D vectors";
      this.resize();
      const boss=this.bossAssets.get('chestnut');if(!boss)throw new Error('Pinned chestnut boss vector asset is required');
      const prewarmAt=performance.now();this.bossPlayer=boss.asset.createPlayer({clip:'idle',startedAtMs:0});this.bossPlayerAsset=boss;
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
    attackEffects(world){
      for(const u of world.units){
        const a=u.ability,s=ATTACK_TYPES[u.species];
        if(u.buffed&&u.hp>0)this.ring(u.x,u.y,u.radius+.16,'#eacb72',.055);
        if(a.phase==='windup')this.ring(u.x,u.y,u.radius+.1,ATTACK_ACCENTS[u.species],.065,0,Math.PI*2*Math.min(1,a.elapsed/s.windup));
        if(world.scene==='farm'&&u.cooldown>0){const duration=u.cooldownDuration||world.breedCooldownDuration?.()||CONFIG.breedCooldownSeconds,progress=1-clamp(u.cooldown/duration,0,1);if(progress>0)this.ring(u.x,u.y,u.radius+.085,'#8fac68',.035,0,Math.PI*2*progress)}
      }
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
    }
    bossPose(world){
      const b=world.boss,k=this.feel?.boss(this.displayTimeMs)||{x:0,y:0,squash:0},ground=this.project(b.x+k.x,b.y+k.y,0),p=this.project(b.x+k.x,b.y+k.y,b.z||0),r=this.scale*b.radius*1.16;
      return {b,p,ground,r,k};
    }
    bossMotion(b,world){
      const event=world.farmBossEvent;
      if(event?.phase==='celebrating'&&event.outcome==='defeat')return 'idle';
      if(b.hp<=0)return 'death';
      if(b.flash>.09&&b.phase==='chase')return 'hit';
      if(b.phase==='strike-windup'||b.phase==='sweep-windup')return 'windup';
      if(b.phase==='strike')return 'strike';if(b.phase==='sweep')return 'sweep';if(b.phase==='recover')return 'recover';
      return b.phase==='chase'?'walk':'idle';
    }
    drawBoss(world){
      const record=this.bossAssets.get('chestnut');if(!record||!this.bossPlayer||this.bossPlayerAsset!==record)throw new Error('Prewarmed chestnut boss player is required');
      const {b,p,r,k}=this.bossPose(world),event=world.farmBossEvent,metadata=record.compiled.metadata,name=this.bossMotion(b,world),clip=metadata.clips[name]||metadata.clips.idle;
      const timed=['windup','strike','sweep','recover','hit','death'].includes(name),clipStartAtMs=timed?this.displayTimeMs-Math.min(clip.durationMs,Math.max(0,b.clock||0)*1000):name==='walk'?this.displayTimeMs-Math.max(0,b.travel||0)*110:this.displayTimeMs-((b.travel||0)*37%clip.durationMs);
      if(this.bossPlayer.currentClip!==name)this.bossPlayer.transitionTo(name,clipStartAtMs,70);
      const expression=b.hp<=0?'dead':event?.phase==='celebrating'&&event.outcome==='defeat'?'happy':name==='windup'?'focused':name==='strike'||name==='sweep'?'attack':b.flash>.07?'hurt':'neutral';
      if(this.bossPlayer.currentExpression!==expression)this.bossPlayer.setExpression(expression);
      this.bossPlayer.seek(this.displayTimeMs);
      const [, ,width]=record.compiled.viewBox,s=2*r/220,anchorX=160,anchorY=261,matrix=[s,0,0,s,p.x-anchorX*s,p.y-anchorY*s];
      const defeatBounce=event?.phase==='celebrating'&&event.outcome==='defeat'?Math.max(0,Math.sin(event.elapsed*Math.PI*2/CONFIG.farmBossEvent.celebrationSeconds*2)):0;
      const fade=event?.phase==='fading'?clamp(1-event.elapsed/CONFIG.farmBossEvent.fadeSeconds,0,1):1;
      this.bossPlayer.setBasePose('body',{y:-18*defeatBounce,scaleX:(1+(k.squash||0))*(1-.04*defeatBounce),scaleY:(1-(k.squash||0))*(1+.06*defeatBounce),opacity:fade});
      const aiming=['strike-windup','sweep-windup','strike','sweep'].includes(b.phase);
      if(aiming){const target=Math.atan2(-.62*Math.sin(b.angle),Math.cos(b.angle));this.bossPlayer.setBasePose('arm-right',{rotation:target-.504});this.bossPlayer.setBasePose('arm-left',{rotation:target+Math.PI-2.637})}
      else{this.bossPlayer.setBasePose('arm-right',{rotation:0});this.bossPlayer.setBasePose('arm-left',{rotation:0})}
      this.bossPlayer.draw({projection:this.ctx.vector.projection,matrix});
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
        const b=sim2.boss,event=sim2.farmBossEvent,area=(raid||event?.phase==='fighting')?bossAttackArea(b,CONFIG.maxUnitRadius):null;this.bossTelegraph=area;
        if(area){
          const heavy=area.kind==='sweep',color=heavy?'#b46c45':'#a35c48';
          if(heavy){
            const fill=this.project(area.x,area.y);this.ellipse(fill.x,fill.y,area.outerRadius*this.scale,area.outerRadius*this.scale*.62,'#b46c4522');
            this.strokeGroundEllipse(area.x,area.y,area.outerRadius,area.outerRadius,color,area.active?.075:.12);
            const progress=area.active?area.progress:1;this.ring(area.x,area.y,area.outerRadius+.13,'#dfad65',.16,area.startAngle,area.startAngle+progress*Math.PI*2);
          }else{
            const nx=Math.cos(area.angle),ny=Math.sin(area.angle),width=area.width,start=area.startRadius,end=area.endRadius;
            for(const side of [-1,1])this.line(this.project(area.x+nx*start-ny*width*side,area.y+ny*start+nx*width*side),this.project(area.x+nx*end-ny*width*side,area.y+ny*end+nx*width*side),.08,color);
            for(const distance of [start,end])this.ring(area.x+nx*distance,area.y+ny*distance,width,color,.06);
          }
        }
      }
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
      const actors = sim2.units.map((u) => ({ depth: 0.785 * u.y - 0.62 * u.z, id: u.id, vector:this.vectorAssets.has(u.species), draw: () => this.drawUnit(u, sim2) }));
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
      if(sim2.scene==="raid"||farmBossVisible)for(const f of sim2.projectiles)actors.push({depth:.785*f.y-.62*f.z,id:-f.id,draw:()=>{const p=this.project(f.x,f.y,f.z),tail=Ballistics.sample(f.path,Math.max(0,(f.elapsed-.04)/f.path.duration));this.groundEllipse(f.x,f.y,.14,.10,"#55452433");this.line(this.project(tail.x,tail.y,tail.z),p,.07,"#ba964a80");this.ellipse(p.x,p.y,this.scale*.14,this.scale*.2,"#cfa957",.3);this.ellipse(p.x-this.scale*.03,p.y-this.scale*.05,this.scale*.05,this.scale*.08,"#fff0ae")}});
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
      this.attackEffects(sim2);
      feel?.draw(this,this.displayTimeMs);
      for (const e of sim2.effects) {
        const q = e.life;
        if (e.kind === "feed") this.ring(e.x,e.y,.15+q*.35,`rgba(166,121,59,${(1-q)*.6})`,.035);
        else if(e.kind === "food-land") {
          const t=Math.min(1,q/.35);this.ring(e.x,e.y,.10+t*.42,`rgba(194,145,62,${(1-t)*.85})`,.055);
          for(let i=0;i<3&&t<1;i++){const a=i*Math.PI*2/3,p=this.project(e.x+Math.cos(a)*t*.4,e.y+Math.sin(a)*t*.4,.08+Math.sin(t*Math.PI)*.2);this.ellipse(p.x,p.y,this.scale*.045,this.scale*.035,`rgba(245,213,133,${1-t})`);}
        }
        else if (e.kind === "land" || e.kind === "impact") this.ring(e.x, e.y, 0.1 + q * 0.8, `rgba(146,131,78,${(1 - q) * 0.65})`);
        else if(e.kind==='drop-dust'){const t=Math.min(1,q/.28);this.ring(e.x,e.y,.12+t*.4,`rgba(126,126,99,${(1-t)*.42})`,.045);for(let i=0;i<4;i++){const a=i*Math.PI/2+t*.35,p=this.project(e.x+Math.cos(a)*t*.33,e.y+Math.sin(a)*t*.22,.025+Math.sin(t*Math.PI)*.1);this.ellipse(p.x,p.y,this.scale*.045,this.scale*.03,`rgba(179,169,137,${1-t})`)}}
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
      this.bossPlayer?.dispose();this.bossPlayer=null;for(const record of this.bossAssets?.values()||[])record.asset.dispose();this.bossAssets?.clear();
      this.ctx.dispose();this.device.dispose();
    }
  };


export {Diorama};
