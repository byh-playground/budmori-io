import {ATTACK_TYPES,Ballistics,CONFIG,clamp} from './farm-model.js';
import {SeedArt,SEED_STYLES} from './seed-art.js';
const {WebGLDevice,VectorContext}=globalThis.BloomGamekitRendering;
  // render.js
  const COLORS=SEED_STYLES.map(s=>s.shell);
  var Diorama = class {
    constructor(canvas) {
      this.canvas = canvas;
      this.device = new WebGLDevice(canvas, { alpha: false, depth: false, stencil: false, antialias: true });
      this.ctx = new VectorContext(this.device);
      this.ctx.isBloomWebGL = true;
      this.canvas.dataset.rendererBackend = "Budmori authored 2.5D vectors";
      this.resize();
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
      for(const u of world.units){const a=u.ability,s=ATTACK_TYPES[u.species];if(a.phase==='windup')this.ring(u.x,u.y,u.radius+.1,COLORS[u.species],.065,0,Math.PI*2*Math.min(1,a.elapsed/s.windup));}
    }
    drawUnit(u,sim){
      u=this.feel?this.feel.unit(u,this.now):u;
      const dead=u.hp<=0,walk=dead?0:Math.min(1,Math.hypot(u.vx,u.vy)),bob=u.z===0?Math.abs(Math.sin(sim.time*9+u.seed))*.10*walk:0,p=this.project(u.x,u.y,u.z+bob);
      const r=Math.max(u.size*this.scale*.78,(sim.scene==='raid'?4.5:11)*this.pixelRatio);
      const joy=sim.effects.some(e=>['eat','birth','merge'].includes(e.kind)&&e.life<.85&&Math.hypot(e.x-u.x,e.y-u.y)<1.2);
      SeedArt.draw(this.ctx,u.species,p.x,p.y,r,u,sim.time,{pixelRatio:this.pixelRatio,extra:this.feel?.squash(u.id,this.now)||0,expression:u.z>.5||u.stun>0?'surprised':joy?'happy':!u.fed?'hungry':'normal'});
    }
    bossPose(world){
      const b=world.boss,k=this.feel?.boss(this.now)||{x:0,y:0,squash:0};return {b,p:this.project(b.x+k.x,b.y+k.y,0),r:this.scale*b.radius*1.16,k};
    }
    bossSkin(world,faceOnly=false){
      const {b,p,r,k}=this.bossPose(world),wind=b.phase.endsWith('windup'),active=b.phase==='strike'||b.phase==='sweep';
      const skin={species:0,tier:4,hp:b.hp,down:0,z:0,vx:0,vy:0,seed:0,flash:b.flash,bounce:0,ability:{phase:wind?'windup':active?'active':'idle',elapsed:wind?.24:0}};
      SeedArt.draw(this.ctx,0,p.x,p.y,r,skin,world.time,{pixelRatio:this.pixelRatio,boss:true,hideFace:!faceOnly,faceOnly,extra:k.squash,expression:b.hp<=0?'dead':wind?'surprised':active?'happy':'normal'});
    }
    drawBoss(world){this.bossSkin(world)}
    drawBossFace(world){this.bossSkin(world,true)}
    drawBossWeapon(world){
      const b=world.boss,c=CONFIG.raid,heavy=b.phase==='sweep'||b.phase==='sweep-windup';
      let angle=heavy?b.startAngle:b.angle,reach=b.radius+.15;
      if(b.phase==='sweep'){angle=b.startAngle+Math.PI*2*Math.min(1,b.clock/c.sweepDuration);reach=c.sweepReach}
      else if(b.phase==='strike')reach=b.radius-.25+(c.basicReach-b.radius+.25)*Math.sin(Math.PI*Math.min(1,b.clock/c.basicDuration));
      else if(b.phase.endsWith('windup'))reach=heavy?c.sweepReach:b.radius-.25;
      const base=this.project(b.x+Math.cos(angle)*(b.radius*.65),b.y+Math.sin(angle)*(b.radius*.65),.35),tip=this.project(b.x+Math.cos(angle)*reach,b.y+Math.sin(angle)*reach,.35);
      this.line(base,tip,.4,'#314331');this.line(base,tip,.24,'#879866');
      this.ellipse(tip.x,tip.y,c.weaponRadius*this.scale,c.weaponRadius*this.scale*.62,b.phase.endsWith('windup')?'#ba7752':'#b5aa73',angle);
      if(b.phase==='sweep'){const back=angle-.18,tail=this.project(b.x+Math.cos(back)*reach,b.y+Math.sin(back)*reach,.35);this.line(tail,tip,.26,'#e6cf7b99')}
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
        const b=sim2.boss,wind=b.phase.endsWith('windup'),active=b.phase==='strike'||b.phase==='sweep',heavy=b.phase==='sweep-windup'||b.phase==='sweep';
        if(wind||active){
          const reach=heavy?CONFIG.raid.sweepReach:CONFIG.raid.basicReach,color=heavy?'#b46c45':'#a98a52';
          if(heavy){this.ring(b.x,b.y,reach+CONFIG.raid.weaponRadius,color,wind?.09:.05);this.ring(b.x,b.y,reach-CONFIG.raid.weaponRadius,'#c59b7288',.045);const progress=Math.min(1,b.clock/(wind?CONFIG.raid.sweepWindup:CONFIG.raid.sweepDuration));this.ring(b.x,b.y,reach+CONFIG.raid.weaponRadius+.12,'#dfad65',.14,b.startAngle,b.startAngle+progress*Math.PI*2)}
          else{
            const nx=Math.cos(b.angle),ny=Math.sin(b.angle),start=b.radius-.25,width=CONFIG.raid.weaponRadius;
            for(const side of [-1,1])this.line(this.project(b.x+nx*start-ny*width*side,b.y+ny*start+nx*width*side),this.project(b.x+nx*reach-ny*width*side,b.y+ny*reach+nx*width*side),.055,color);
            for(const distance of [start,reach])this.ring(b.x+nx*distance,b.y+ny*distance,width,color,.05);
          }

        }
      }
    }

    render(sim2,feel=null,now=performance.now()) {
      this.feel=feel;this.now=now;this.configure(sim2.scene);
      const c = this.ctx;
      c.beginFrame({ width: this.canvas.width, height: this.canvas.height, clearColor: [0.9, 0.92, 0.87, 1] });
      this.terrain(sim2);
      for (const u of sim2.units) {
        const a = clamp(0.24 - u.z * 0.035, 0.07, 0.24);
        this.groundEllipse(u.x, u.y, u.size * (0.65 + u.z * 0.035), u.size * 0.42, `rgba(42,61,35,${a})`);
        if (u.down > 0) this.ring(u.x, u.y, 0.45, "#aa9a60");
      }
      if(sim2.scene==='raid'){this.groundEllipse(sim2.boss.x,sim2.boss.y,sim2.boss.radius*1.05,sim2.boss.radius*.75,'#38472c33');this.drawBossWeapon(sim2)}
      const actors = sim2.units.map((u) => ({ depth: 0.785 * u.y - 0.62 * u.z, id: u.id, draw: () => this.drawUnit(u, sim2) }));
      if (sim2.scene === "raid") actors.push({ depth: 0.785 * sim2.boss.y, id: 0, draw: () => this.drawBoss(sim2) });
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
      if(sim2.scene==="raid")for(const f of sim2.projectiles)actors.push({depth:.785*f.y-.62*f.z,id:-f.id,draw:()=>{const p=this.project(f.x,f.y,f.z),tail=Ballistics.sample(f.path,Math.max(0,(f.elapsed-.04)/f.path.duration));this.groundEllipse(f.x,f.y,.14,.10,"#55452433");this.line(this.project(tail.x,tail.y,tail.z),p,.07,"#ba964a80");this.ellipse(p.x,p.y,this.scale*.14,this.scale*.2,"#cfa957",.3);this.ellipse(p.x-this.scale*.03,p.y-this.scale*.05,this.scale*.05,this.scale*.08,"#fff0ae")}});
      actors.sort((a, b) => b.depth - a.depth || a.id - b.id);
      for (const actor of actors) actor.draw();
      this.attackEffects(sim2);
      feel?.draw(this,now);
      for (const e of sim2.effects) {
        const q = e.life;
        if (e.kind === "feed") this.ring(e.x,e.y,.15+q*.35,`rgba(166,121,59,${(1-q)*.6})`,.035);
        else if(e.kind === "food-land") {
          const t=Math.min(1,q/.35);this.ring(e.x,e.y,.10+t*.42,`rgba(194,145,62,${(1-t)*.85})`,.055);
          for(let i=0;i<3&&t<1;i++){const a=i*Math.PI*2/3,p=this.project(e.x+Math.cos(a)*t*.4,e.y+Math.sin(a)*t*.4,.08+Math.sin(t*Math.PI)*.2);this.ellipse(p.x,p.y,this.scale*.045,this.scale*.035,`rgba(245,213,133,${1-t})`);}
        }
        else if (e.kind === "land" || e.kind === "impact") this.ring(e.x, e.y, 0.1 + q * 0.8, `rgba(146,131,78,${(1 - q) * 0.65})`);
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
      // Face is the final body layer: low contact effects and foreground troops cannot erase it.
      if(sim2.scene==='raid')this.drawBossFace(sim2);
      this.stats = c.endFrame();
    }
  };


export {Diorama};
