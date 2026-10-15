import {ATTACK_TYPES,Ballistics,clamp} from './farm-model.js';
import {BudmoriArt} from './unit-art.js';
const {WebGLDevice,VectorContext}=globalThis.BloomGamekitRendering;
  // render.js
  var TYPES = ATTACK_TYPES.map(d=>d.art);
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
      const aspect = r.width / r.height;
      this.view = aspect > 1.2 ? [Math.max(12, 9 * aspect), 9] : [11.7, 11.7 / aspect];
      this.offset = [0, aspect < 0.8 ? 1.1 : -0.3];
      this.scale = this.canvas.width / (2 * this.view[0]);
    }
    project(x, y, z = 0) {
      return { x: (x + this.offset[0] + this.view[0]) * this.scale, y: (this.view[1] - (0.62 * y + 0.785 * z + this.offset[1])) * this.scale };
    }
    groundPoint(clientX, clientY) {
      const r = this.canvas.getBoundingClientRect();
      return { x: ((clientX - r.left) / r.width * 2 - 1) * this.view[0] - this.offset[0], y: ((1 - (clientY - r.top) / r.height * 2) * this.view[1] - this.offset[1]) / 0.62 };
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
    attackPreview(sim2){
      const c=this.ctx,k=sim2.cast;if(!k)return;
      const power=sim2.chargePower();this.ring(k.origin.x,k.origin.y,k.radius,"#59a68a",.045);this.ring(k.origin.x,k.origin.y,k.radius+.1,"#86b9cc",.075,-Math.PI/2,-Math.PI/2+Math.PI*2*power);
      for(const id of k.ids){
        const u=sim2.units.find(v=>v.id===id);if(!u)continue;const ready=u.chargeReady();this.ring(u.x,u.y,u.radius+.16,ready?"#e0ce70":"#939b94",.065);if(!ready)continue;
        const target=sim2.chargePoint(u,k),spec=ATTACK_TYPES[u.species],path=Ballistics.create(u,target,spec.kind,target.power);
        let prev=this.project(u.x,u.y,path.from.z);for(let i=1;i<=16;i++){const p=Ballistics.sample(path,i/16),next=this.project(p.x,p.y,p.z);this.line(prev,next,.025,spec.color);prev=next}
        this.ring(target.x,target.y,spec.kind==="lob"?.6:spec.kind==="leap"?.45:.22,"#c69637",.05);
        const p=this.project(target.x,target.y,.04),s=this.scale*.12;this.line({x:p.x-s,y:p.y},{x:p.x+s,y:p.y},.035,"#e4bb55");this.line({x:p.x,y:p.y-s},{x:p.x,y:p.y+s},.035,"#e4bb55");
      }
      // White cursor is intent; gold endpoints are capped executable world positions.
      const p=this.project(k.aim.x,k.aim.y,.02);this.ellipse(p.x,p.y,this.pixelRatio*3,this.pixelRatio*3,"#ffffff");
      if(k.pointerType==="touch"){const top={x:p.x,y:p.y-44*this.pixelRatio};this.line(p,top,.02,"#ffffffaa");this.ellipse(top.x,top.y,6*this.pixelRatio,6*this.pixelRatio,"#ffffffaa");}
    }
    attackEffects(sim2){
      for(const e of sim2.effects){
        const q=e.life;if(e.kind==="cancel"){const t=Math.min(1,q/.35);this.ring(e.x,e.y,sim2.progress.controlRadius*(1-t*.35),`rgba(158,109,90,${1-t})`,.07)}
        if(["strike","shell-land","land-attack","launch"].includes(e.kind)){
          const t=Math.min(1,q/.32),alpha=1-t;if(alpha<=0)continue;
          this.ring(e.x,e.y,.12+t*(e.kind==="shell-land"?.8:.45),`rgba(205,155,65,${alpha})`,.06);
          if(e.kind!=="launch")for(let i=0;i<4;i++){const a=i*Math.PI/2,p=this.project(e.x+Math.cos(a)*t*.5,e.y+Math.sin(a)*t*.5,e.z+.12+t*.25);this.ellipse(p.x,p.y,this.scale*.055,this.scale*.09,`rgba(255,239,182,${alpha})`,a)}
        }
      }
      for(const u of sim2.units){const a=u.ability,s=ATTACK_TYPES[u.species];if(a.phase==="windup")this.ring(u.x,u.y,u.radius+.08,s.color,.065,0,Math.PI*2*Math.min(1,a.elapsed/s.windup));else if(a.manualCooldown>0)this.ring(u.x,u.y,u.radius+.08,"#899488",.025,0,Math.PI*2*(1-a.manualCooldown/3));}
    }

    drawUnit(u, sim2) {
      const c = this.ctx, walk = Math.min(1, Math.hypot(u.vx, u.vy)), bob = u.z === 0 ? Math.abs(Math.sin(sim2.time * 9 + u.seed)) * 0.14 * walk : 0, p = this.project(u.x + Math.sin(sim2.time * 9 + u.seed) * 0.065 * walk, u.y, u.z + bob);
      const r = Math.max(u.size * this.scale * 0.78, 11 * this.pixelRatio);
      const landing = u.bounce > 0 ? u.bounce : 0, airStretch = clamp(Math.abs(u.vz) * 0.014, 0, 0.12), squash = 1 + landing * 0.8 - airStretch - (u.ability.phase==="windup"?.12:0);
      BudmoriArt.draw(c, TYPES[u.species], "friendly", p.x, p.y - r * 0.35, r, Math.atan2(-Math.sin(u.angle)*.62,Math.cos(u.angle)), sim2.time * 1e3, { respectOriginalFacing: true, phaseOffsetMs: u.id * 37, poseStretch: squash, poseTilt: Math.sin(sim2.time * 9 + u.seed) * 0.045 * walk, whiteFlash: u.flash > 0.09, hit: u.flash > 0, attack: u.ability.phase==="active" || (u.ability.phase==="recover"&&u.ability.elapsed<.13), deployed: u.ability.phase!=="idle", turretFacing: Math.atan2(-Math.sin(u.angle)*.62,Math.cos(u.angle)), alpha: u.down > 0 ? 0.55 : 1 });
      const joy = sim2.effects.some(e => (e.kind === "eat" || e.kind === "birth" || e.kind === "merge") && e.life < 0.85 && Math.hypot(e.x-u.x,e.y-u.y)<1.2);
      const expression = u.z > 0.5 || u.stun > 0 || u.down > 0 ? "surprised" : joy ? "happy" : !u.fed ? "hungry" : "normal";
      if(sim2.scene==="farm")this.face(p.x, p.y-r*0.35, r*.7, u.species, expression, squash, Math.sin(sim2.time*9+u.seed)*0.045*walk);
      if (u.tier > 1) {
        for (let k = 0; k < u.tier - 1; k++) {
          const x = p.x + (k - (u.tier - 2) / 2) * r * 0.34, y = p.y - r * 1.5;
          c.fillStyle = "#f1df9f";
          c.beginPath();
          c.moveTo(x, y - r * 0.11);
          c.lineTo(x + r * 0.1, y);
          c.lineTo(x, y + r * 0.11);
          c.lineTo(x - r * 0.1, y);
          c.closePath();
          c.fill();
        }
      }
    }
    face(x, y, r, species, expression, stretch=1, tilt=0) {
      const c=this.ctx, ink="#263c39", cream="#fff1ce";
      c.save(); c.translate(x,y); c.rotate(tilt); c.scale(1/stretch,stretch);
      const fy=species===1?r*0.48:species===0?r*0.04:r*0.16;
      // A warm face inset keeps eyes and mouth readable against each original silhouette.
      this.ellipse(0,fy,r*0.46,r*0.36,cream);
      c.strokeStyle=ink; c.lineWidth=Math.max(this.pixelRatio*1.1,r*0.075);
      for(const side of [-1,1]) {
        const ex=side*r*0.20,ey=fy-r*0.075;
        if(expression==="happy") { c.beginPath(); c.moveTo(ex-r*.08,ey+r*.025); c.lineTo(ex,ey-r*.055); c.lineTo(ex+r*.08,ey+r*.025); c.stroke(); }
        else this.ellipse(ex,ey,r*(expression==="surprised"?.085:.065),r*(expression==="hungry"?.065:.10),ink);
      }
      if(expression==="surprised") this.ellipse(0,fy+r*.14,r*.09,r*.12,ink);
      else { c.beginPath(); c.moveTo(-r*.13,fy+r*(expression==="hungry"?.20:.10)); c.lineTo(0,fy+r*(expression==="hungry"?.13:.19)); c.lineTo(r*.13,fy+r*(expression==="hungry"?.20:.10)); c.stroke(); }
      if(expression==="happy") for(const side of [-1,1]) this.ellipse(side*r*.31,fy+r*.09,r*.075,r*.045,"#eaa09b");
      c.restore();
    }
    drawBoss(sim2) {
      const b = sim2.boss, c = this.ctx, p = this.project(b.x, b.y, 0), r = this.scale * 2.35, wind = b.phase === "windup", sweep = b.phase === "sweep";
      BudmoriArt.draw(c, "guardshroom", "enemy", p.x, p.y - r * 0.34, r, void 0, sim2.time * 1e3, { respectOriginalFacing: true, poseStretch: wind ? 1.07 : 1 + Math.sin(sim2.time * 2) * 0.012 + (b.flash||0)*.2, poseTilt: wind ? -0.07 : sweep ? 0.04 : 0, attack: sweep });
      this.face(p.x, p.y-r*.34, r, 1, wind ? "surprised" : sweep ? "happy" : "normal", wind ? 1.07 : 1, wind ? -.07 : sweep ? .04 : 0);
      const angle = wind || sweep ? b.angle : -0.3, h = this.project(b.x + Math.cos(angle) * 3.2, b.y + Math.sin(angle) * 3.2, wind ? 1 : 0.25), base = this.project(b.x, b.y, 0.4);
      this.line(base, h, 0.58, "#283d2c");
      this.line(base, h, 0.41, "#7d9560");
      c.save();
      c.translate(h.x, h.y);
      c.rotate(Math.atan2(h.y - base.y, h.x - base.x));
      c.fillStyle = wind ? "#bd7854" : "#a4a872";
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4, x = Math.cos(a) * this.scale * 0.87, y = Math.sin(a) * this.scale * 0.65;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
      c.fill();
      this.ellipse(-this.scale * 0.19, -this.scale * 0.16, this.scale * 0.26, this.scale * 0.12, "#d3ce96");
      c.restore();
    }
    terrain(sim2) {
      const c = this.ctx, S = this.scale;
      this.groundEllipse(0, -0.2, 10.8, 7.9, "#bcc7a6");
      this.groundEllipse(0, 0, 10.7, 7.9, sim2.scene === "farm" ? "#d1d8b8" : "#cecfb3");
      this.groundEllipse(0, 0.15, 9.8, 7.1, sim2.scene === "farm" ? "#d9dfc2" : "#d7d8bf");
      for (let i = 0; i < 92; i++) {
        const a = i * 2.39996, rad = Math.sqrt((i + 0.5) / 92), x = Math.cos(a) * 9.8 * rad, y = Math.sin(a) * 7.1 * rad, p = this.project(x, y);
        this.ellipse(p.x, p.y, S * 0.026, S * 0.02, "#a7b58b80");
      }
      for (let i = 0; i < 24; i++) {
        const a = i * 2.39996, x = Math.cos(a) * 10.05, y = Math.sin(a) * 7.35, p = this.project(x, y);
        this.ellipse(p.x, p.y, 0.25 * S, 0.11 * S, "#94a577", a);
        this.ellipse(p.x + 0.1 * S, p.y - 0.09 * S, 0.19 * S, 0.075 * S, "#a8b78a", a + 0.7);
      }
      if (sim2.scene === "raid") {
        const b = sim2.boss;
        if (b.phase === "windup" || b.phase === "sweep") {
          c.save();
          c.globalAlpha = b.phase === "windup" ? 0.15 : 0.07;
          const p = this.project(b.x, b.y);
          c.fillStyle = "#c36543";
          c.beginPath();
          c.moveTo(p.x, p.y);
          c.ellipse(p.x, p.y, 4.25 * S, 4.25 * S * 0.62, 0, -0.2, Math.PI + 0.2);
          c.closePath();
          c.fill();
          c.restore();
          this.ring(b.x, b.y, 4.25, "#b86a49", 0.045, -Math.PI - 0.2, 0.2);
        }
        if (!sim2.running || sim2.moveTarget) {
          this.ring(sim2.aim.x, sim2.aim.y, 0.45, "#397f83", 0.07);
          this.ring(sim2.aim.x, sim2.aim.y, 0.2, "#597f70", 0.04);
        }
      }
    }
    render(sim2) {
      const c = this.ctx;
      c.beginFrame({ width: this.canvas.width, height: this.canvas.height, clearColor: [0.9, 0.92, 0.87, 1] });
      this.terrain(sim2);
      for (const u of sim2.units) {
        const a = clamp(0.24 - u.z * 0.035, 0.07, 0.24);
        this.groundEllipse(u.x, u.y, u.size * (0.65 + u.z * 0.035), u.size * 0.42, `rgba(42,61,35,${a})`);
        if (u.down > 0) this.ring(u.x, u.y, 0.45, "#aa9a60");
      }
      if (sim2.scene === "raid") this.groundEllipse(sim2.boss.x, sim2.boss.y, 2.6, 1.9, "#38472c33");
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
      this.attackPreview(sim2);
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
      this.stats = c.endFrame();
    }
  };


export {Diorama};
