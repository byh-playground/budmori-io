const {SeededPRNG}=globalThis.BloomGamekitDeterministic;
  // sim.js
  var CONFIG = Object.freeze({ cap: 72, maxTier: 4, starterSeconds: 60, matureMeals: 3, gravity: 19, fixedStep: 1 / 120 });
  var clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  var stats = (tier) => ({ hp: 40 * 1.5 ** (tier - 1), atk: 4 * 1.2 ** (tier - 1) });
  var Body = class {
    constructor(x, y) {
      Object.assign(this, { x, y, z: 0, vx: 0, vy: 0, vz: 0, angle: 0, stun: 0, flash: 0, bounce: 0 });
    }
  };
  var Knockable = (Base) => class extends Base {
    knock(nx, ny, power, lift = 0) {
      this.vx += nx * power;
      this.vy += ny * power;
      this.vz = Math.max(this.vz, lift);
      this.stun = Math.max(this.stun, 0.5);
      this.flash = 0.18;
    }
    integrate(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.z > 0 || this.vz > 0) {
        this.vz -= CONFIG.gravity * dt;
        this.z += this.vz * dt;
        if (this.z < 0) {
          this.z = 0;
          if (this.vz < -3) {
            this.vz = -this.vz * 0.24;
            this.bounce = 0.22;
          } else this.vz = 0;
        }
      }
      const drag = Math.exp(-(this.z > 0.04 ? 0.8 : 5) * dt);
      this.vx *= drag;
      this.vy *= drag;
      this.stun = Math.max(0, this.stun - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.bounce = Math.max(0, this.bounce - dt);
    }
  };

const TREE_NODES = [
  {id:"production",name:"새싹 생산",icon:"♧",metric:"eat",goal:8,parent:null,description:"새싹 생산 속도 +10%/단계",value:l=>`${(60/(1+.1*l)).toFixed(1)}초`},
  {id:"food",name:"자동 탭",icon:"◒",metric:"eat",goal:12,parent:"production",description:"자동 탭 속도 +10%/단계 · 수동은 매 탭 +1",value:l=>`${(.5/(1+.1*l)).toFixed(3)}초 / 탭`},
  {id:"growth",name:"먹이 찾기",icon:"❧",metric:"eat",goal:10,parent:"production",description:"먹이를 향한 이동속도 +10%/단계 · 성체까지 3끼 유지",value:l=>`${(2.2*(1+.1*l)).toFixed(2)} 속도`},
  {id:"breed",name:"번식 회복",icon:"♡",metric:"birth",goal:2,parent:"growth",description:"부모의 번식 대기 속도 +10%/단계",value:l=>`${(5/(1+.1*l)).toFixed(2)}초`},
  {id:"merge",name:"합체 회복",icon:"◇",metric:"merge",goal:2,parent:"growth",description:"합체 후 대기 속도 +10%/단계 · 체력·공격 배율 유지",value:l=>`${(4/(1+.1*l)).toFixed(2)}초`},
  {id:"control",name:"제어 범위",icon:"◎",metric:"hit",goal:5,parent:null,description:"충전 선택 반경 +0.25/단계",value:l=>`${(1.5+.25*l).toFixed(2)} 반경`}
];
class FarmProgress {
 constructor(){this.levels=Object.fromEntries(TREE_NODES.map(n=>[n.id,0]));this.records={eat:0,birth:0,merge:0,hit:0}}
 record(kind){if(kind in this.records)this.records[kind]++}
 ready(n){return this.levels[n.id]<4&&(!n.parent||this.levels[n.parent]>0)&&this.records[n.metric]>=n.goal*(this.levels[n.id]+1)}
 invest(id){const n=TREE_NODES.find(n=>n.id===id);if(!n||!this.ready(n))return false;this.levels[id]++;return true}
 rate(id){return 1+.1*this.levels[id]}
 get autoTapSeconds(){return .5/this.rate('food')}
 get controlRadius(){return 1.5+.25*this.levels.control}
}
// Farm-owned tuning; art and archetype identities come from RALLY FRONTIER.
const ATTACK_TYPES = Object.freeze([
  {art:"lancer",name:"왕사슴 돌격대",kind:"ram",color:"#bf8144",windup:.28,recover:.65,stand:3.65,minReach:1.8,maxReach:6,damage:1,arc:0},
  {art:"siege",name:"철갑씨앗포",kind:"lob",color:"#648b6b",windup:.38,recover:1.25,stand:5.65,minReach:2.2,maxReach:8,damage:1.6,arc:2},
  {art:"rogue",name:"그림자벼룩",kind:"leap",color:"#8b719c",windup:.32,recover:.9,stand:4.65,minReach:2,maxReach:7,damage:1.3,arc:2.7}
]);
const ArenaGeometry = {
  inside(p){return p.x*p.x/(9.2*9.2)+p.y*p.y/(6.5*6.5)<=1},
  clamp(p){const k=Math.max(1,Math.hypot(p.x/9.2,p.y/6.5));return {x:p.x/k,y:p.y/k}},
  overlaps(a,b){return a.z<=b.z+b.height && a.z+a.height>=b.z && Math.hypot(a.x-b.x,a.y-b.y)<=a.radius+b.radius},
  // Swept XY cylinder versus finite Z interval; includes entity radii, never center-only.
  sweep(a,b,r,h,target){
    const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,R=r+target.radius;
    let lo=0,hi=1;const A=dx*dx+dy*dy,B=2*((a.x-target.x)*dx+(a.y-target.y)*dy),C=(a.x-target.x)**2+(a.y-target.y)**2-R*R;
    if(A<1e-12){if(C>0)return null}else{const D=B*B-4*A*C;if(D<0)return null;lo=Math.max(lo,(-B-Math.sqrt(D))/(2*A));hi=Math.min(hi,(-B+Math.sqrt(D))/(2*A))}
    const bottom=target.z-h,top=target.z+target.height;if(Math.abs(dz)<1e-12){if(a.z<bottom||a.z>top)return null}else{let x=(bottom-a.z)/dz,y=(top-a.z)/dz;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y)}
    if(lo>hi||hi<0||lo>1)return null;const t=clamp(lo,0,1);return {x:a.x+dx*t,y:a.y+dy*t,z:a.z+dz*t,t};
  }
};
const Ballistics = {
  create(from,to,kind,power=0){const distance=Math.hypot(to.x-from.x,to.y-from.y);return {from:{x:from.x,y:from.y,z:kind==="lob"?.45:0},to:{...to},height:kind==="ram"?0:(kind==="lob"?2:2.7)+power*.6,duration:kind==="ram"?Math.max(.12,distance/(8+4*power)):.65+distance*.055}},
  sample(path,q){q=clamp(q,0,1);return {x:path.from.x+(path.to.x-path.from.x)*q,y:path.from.y+(path.to.y-path.from.y)*q,z:path.from.z*(1-q)+4*path.height*q*(1-q)}}
};
class AttackCycle {
  constructor(owner){this.owner=owner;this.phase="idle";this.elapsed=0;this.manualCooldown=0;this.action=null;}
  get spec(){return ATTACK_TYPES[this.owner.species]}
  ready(){const u=this.owner;return this.phase==="idle"&&this.manualCooldown<=0&&u.down<=0&&u.stun<=0&&u.z<=.1}
  begin(sim,target,power=0,manual=false){
    const u=this.owner;if(this.phase!=="idle"||u.down>0||u.stun>0||u.z>.1)return false;
    this.phase="windup";this.elapsed=0;this.action={id:++sim.attackSerial,target:{...target},power,manual,hit:false,path:null};
    if(manual)this.manualCooldown=3;u.angle=Math.atan2(target.y-u.y,target.x-u.x);u.vx=u.vy=0;
    sim.combatEvent("prepare",u,this.action);return true;
  }
  interrupt(){if(this.phase!=="idle"){this.phase="recover";this.elapsed=0;this.action=null}}
  recover(sim,recoil=false){this.phase="recover";this.elapsed=0;const u=this.owner;if(recoil){u.vx=-Math.cos(u.angle)*2.2;u.vy=-Math.sin(u.angle)*2.2}sim.combatEvent("recover",u,this.action)}
  update(sim,dt){
    this.manualCooldown=Math.max(0,this.manualCooldown-dt);const u=this.owner;
    if(u.stun>0||u.down>0){this.interrupt();return true}
    if(this.phase==="idle")return false;
    this.elapsed+=dt;
    if(this.phase==="windup"){
      u.vx*=Math.exp(-dt*18);u.vy*=Math.exp(-dt*18);
      if(this.elapsed>=this.spec.windup){
        this.elapsed=0;this.phase="active";const a=this.action;a.path=Ballistics.create(u,a.target,this.spec.kind,a.power);sim.combatEvent("launch",u,a);
        if(this.spec.kind==="lob"){
          sim.projectiles.push({id:a.id,owner:u.id,species:u.species,tier:u.tier,path:a.path,elapsed:0,x:u.x,y:u.y,z:.45,radius:.12,height:.24,hit:false});
          this.recover(sim,true);
        }
      }
    }else if(this.phase==="recover"&&this.elapsed>=this.spec.recover){this.phase="idle";this.action=null;this.elapsed=0}
    return true;
  }
  integrate(dt){
    const u=this.owner,a=this.action;if(this.phase!=="active"||!a?.path||u.stun>0||u.down>0)return false;
    const p=Ballistics.sample(a.path,this.elapsed/a.path.duration);u.vx=(p.x-u.x)/dt;u.vy=(p.y-u.y)/dt;u.vz=(p.z-u.z)/dt;u.x=p.x;u.y=p.y;u.z=p.z;u.flash=Math.max(0,u.flash-dt);u.bounce=Math.max(0,u.bounce-dt);return true;
  }
  afterMove(sim,old){
    const a=this.action,u=this.owner;if(this.phase!=="active"||!a?.path)return;
    const hit=!a.hit&&ArenaGeometry.sweep(old,u,u.radius,.65,sim.boss);
    if(hit){sim.damageBoss(u,a,hit);if(this.spec.kind==="ram"){u.x=hit.x;u.y=hit.y;u.z=hit.z;this.recover(sim,true);return}}
    if(this.elapsed>=a.path.duration){u.z=0;u.vz=0;u.vx=u.vy=0;if(this.spec.kind==="leap"){u.bounce=.2;sim.combatEvent("land-attack",u,a);if(!a.hit&&ArenaGeometry.overlaps({x:u.x,y:u.y,z:0,radius:u.radius+.35,height:.65},sim.boss))sim.damageBoss(u,a,u)}this.recover(sim,true)}
  }
}
const AttackingBody=Base=>class extends Base{
  constructor(...args){super(...args);this.ability=new AttackCycle(this)}
  chargeReady(){return this.ability.ready()}
  knock(...args){this.ability.interrupt();super.knock(...args)}
  integrate(dt){if(!this.ability.integrate(dt))super.integrate(dt)}
};

  var Unit = class extends AttackingBody(Knockable(Body)) {
    constructor(id, species, tier, x, y) {
      super(x, y);
      Object.assign(this, { id, species, tier, meals: 0, growth: 0, age: 0, cooldown: 0, home: { x, y }, hp: stats(tier).hp, down: 0, seed: id * 2.39996 });
    }
    get radius() {
      return (0.25 + 0.055 * this.tier) * (this.mature ? 1 : 0.8);
    }
    get mature() {
      return this.growth >= CONFIG.matureMeals;
    }
    get fed() {
      return this.meals >= CONFIG.matureMeals;
    }
    get size() {
      return (0.55 + 0.1 * this.tier) * (this.mature ? 1 : 0.76);
    }
  };
  function contact(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), r = a.radius + b.radius;
    if (Math.abs(a.z-b.z)>.65)return false;
    if(d>=r){if(d<r+.22&&a.z<.1&&b.z<.1&&a.ability.phase==="idle"&&b.ability.phase==="idle"){const k=(r+.22-d)*.035/(d||1);a.x-=dx*k;a.y-=dy*k;b.x+=dx*k;b.y+=dy*k}return false;}
    const nx = d > 1e-6 ? dx / d : 1, ny = d > 1e-6 ? dy / d : 0, overlap = r - d;
    a.x -= nx * overlap * 0.5;
    a.y -= ny * overlap * 0.5;
    b.x += nx * overlap * 0.5;
    b.y += ny * overlap * 0.5;
    const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (closing > 0) {
      const impulse = closing * 0.57;
      a.vx -= nx * impulse;
      a.vy -= ny * impulse;
      b.vx += nx * impulse;
      b.vy += ny * impulse;
      if (closing > 2) {
        const receiver = Math.hypot(a.vx, a.vy) > Math.hypot(b.vx, b.vy) ? a : b;
        receiver.vz = Math.max(receiver.vz, Math.min(4, closing * 0.2));
        receiver.stun = Math.max(receiver.stun, 0.3);
        receiver.flash = 0.1;
      }
    }
    return true;
  }

  var Garden = class {
    constructor(seed = 731) {
      this.seed = seed;this.progress=new FarmProgress();this.notices=[];this.eventSequence=0;
      this.reset();
    }
    reset() {
      this.rng = new SeededPRNG(this.seed);
      this.units = [];
      this.food = [];
      this.effects = [];
      this.events = [];
      this.time = 0;
      this.nextId = 1;
      this.starter = 0;
      this.notices=[];this.eventSequence=0;
      this.foodTaps = { remainder: 0, autoClock: 0, produced: 0, revision: 0 };
      this.projectiles=[];this.attackSerial=0;this.combatLog=[];
      this.moveTarget = null;
      this.cast = null;
      this.mode = "breed";
      this.scene = "farm";
      this.running = false;
      this.aim = { x: 0, y: -4.8 };
      this.boss = { x: 0, y: 3.4, z:0, radius:2, height:2.4, flash:0, hp: 2400, maxHp: 2400, phase: "idle", clock: 0, angle: -Math.PI, hit: /* @__PURE__ */ new Set(), swings: 0 };
      this.metrics = { births: 0, merges: 0, directHits: 0, contacts: 0, landings: 0 };
      for (let i = 0; i < 36; i++) {
        const u = this.spawn(i % 3, 1, (this.random() - 0.5) * 15, (this.random() - 0.5) * 11);
        u.meals = i < 18 ? 3 : 0;
        u.growth = u.meals;
      }
    }
    random() {
      return this.rng.nextUint32() / 4294967296;
    }
    spawn(species, tier, x, y) {
      if (this.units.length >= CONFIG.cap) return null;
      const u = new Unit(this.nextId++, species, clamp(tier, 1, CONFIG.maxTier), x, y);
      this.units.push(u);
      return u;
    }
    notice(kind,detail={}){this.notices.push({sequence:++this.eventSequence,kind,...detail});if(this.notices.length>512)this.notices.shift()}
    emit(kind, x, y, z = 0) {
      this.progress.record(kind);
      this.notice(kind);
      this.effects.push({ kind, x, y, z, life: 0 });
      if (this.effects.length > 100) this.effects.shift();
      this.events.push(kind);
      if (this.events.length > 20) this.events.shift();
    }
    tapFood(source) {
      if ((source !== "auto" && source !== "manual") || (source === "manual" && this.scene !== "farm") || this.food.length >= 140) return false;
      const completed = this.foodTaps.remainder === 4;
      this.foodTaps.remainder++;
      this.foodTaps.revision++;
      if (this.foodTaps.remainder >= 5) {
        this.foodTaps.remainder -= 5;
        this.scatter((this.random() - .5) * 14, (this.random() - .5) * 9, 1);
        this.foodTaps.produced++;
      }
      this.notice("food-tap",{source,completed,remainder:this.foodTaps.remainder});
      return true;
    }
    advanceAutoTaps(elapsed) {
      // Real elapsed time, independent of demo speed. Do not replay hidden/stalled frames.
      if (!Number.isFinite(elapsed) || elapsed <= 0) return;
      this.foodTaps.autoClock += Math.min(elapsed, .1);
      const interval = this.progress.autoTapSeconds;
      while (this.foodTaps.autoClock + 1e-9 >= interval) {
        this.foodTaps.autoClock = Math.max(0, this.foodTaps.autoClock - interval);
        this.tapFood("auto");
      }
    }
    command(x, y) {
      this.aim = { x: clamp(x, -8, 8), y: clamp(y, -5.5, 5.5) };
      if (this.running) this.moveTarget = { ...this.aim };
    }
    scatter(x, y, count = 1) {
      for (let i = 0; i < count && this.food.length < 140; i++) {
        let tx=clamp(x,-8,8),ty=clamp(y,-5.7,5.7);
        const boundary=Math.hypot(tx/8,ty/5.7); if(boundary>1){tx/=boundary;ty/=boundary;}
        const angle=this.random()*Math.PI*2, sx=Math.cos(angle)*10.2, sy=Math.sin(angle)*7.0;
        const duration=.85+this.random()*.25, z=.3;
        this.food.push({x:sx,y:sy,z,vx:(tx-sx)/duration,vy:(ty-sy)/duration,vz:6*duration-z/duration,seed:this.random(),phase:"flight",tx,ty});
        this.emit("feed",tx,ty);
      }
    }
    setScene(scene2) {
      this.cancelCharge();
      if (scene2 === this.scene) return;
      this.running = false;this.projectiles=[];
      for (const u of this.units) {
        if (scene2 === "raid") {
          u.home = { x: u.x, y: u.y };
          u.x = (u.id % 9 - 4) * 0.7;
          u.y = -3.7 - Math.floor((u.id - 1) / 9) * 0.64;
        } else {
          u.x = u.home.x;
          u.y = u.home.y;
        }
        u.ability=new AttackCycle(u);
        Object.assign(u, { z: 0, vx: 0, vy: 0, vz: 0, stun: 0, down: 0, hp: stats(u.tier).hp });
      }
      this.scene = scene2;
      this.moveTarget = null;
      this.boss.phase = "idle";
      this.boss.clock = 0;
      this.boss.hp = this.boss.maxHp;
      if (scene2 === "raid") this.deploy();
    }
    deploy() {
      if (this.scene !== "raid") return;
      if (this.running) { this.command(this.aim.x, this.aim.y); return; }
      for (let i = 0; i < this.units.length; i++) {
        const u = this.units[i];
        u.x = clamp(this.aim.x + (i % 9 - 4) * 0.66, -9, 9);
        u.y = clamp(this.aim.y - Math.floor(i / 9) * 0.62, -6.5, 0);
        Object.assign(u, { vx: 0, vy: 0, z: 0, vz: 0, stun: 0, down: 0, hp: stats(u.tier).hp });
      }
      this.boss.hp = this.boss.maxHp;
      this.boss.phase = "rest";
      this.boss.clock = 1;
      this.running = true;
    }
    pair(a, b) {
      if (a === b || a.species !== b.species || !a.mature || !b.mature || a.cooldown > 0 || b.cooldown > 0 || !this.units.includes(a) || !this.units.includes(b) || Math.hypot(a.x - b.x, a.y - b.y) > a.radius + b.radius + 0.2) return false;
      if (this.mode === "merge") {
        if (a.tier !== b.tier || a.tier >= CONFIG.maxTier) return false;
        const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
        this.units = this.units.filter((u2) => u2 !== a && u2 !== b);
        const u = this.spawn(a.species, a.tier + 1, x, y);
        u.meals = 3;
        u.growth = 3;
        u.cooldown = 4 / this.progress.rate("merge");
        this.metrics.merges++;
        this.emit("merge", x, y, 1);
      } else {
        if (!a.fed || !b.fed || this.units.length >= CONFIG.cap) return false;
        const child = this.spawn(a.species, 1, (a.x + b.x) / 2, (a.y + b.y) / 2);
        child.vz = 3;
        a.meals = b.meals = 0;
        a.cooldown = b.cooldown = 5 / this.progress.rate("breed");
        this.metrics.births++;
        this.emit("birth", child.x, child.y, 0.7);
      }
      return true;
    }
    step(dt) {

      this.time += dt;
      this.starter += dt;
      while (this.starter >= CONFIG.starterSeconds / this.progress.rate("production")) {
        this.starter -= CONFIG.starterSeconds / this.progress.rate("production");
        const u = this.spawn(Math.floor(this.random() * 3), 1, -7, 0);
        if (u && this.scene === "raid") {
          u.home = { x: -7, y: 0 };
          u.y = -5;
        }
        if (u) this.emit("starter", u.x, u.y);
      }
      this.effects = this.effects.filter((e) => (e.life += dt) < 1);
      for (const f of this.food) {
        if(f.phase!=="grounded") {
          f.x+=f.vx*dt; f.y+=f.vy*dt;
          f.z+=f.vz*dt-6*dt*dt; f.vz-=12*dt;
          if(f.z<=0) {
            f.z=0;
            if(f.phase==="flight") { f.x=f.tx; f.y=f.ty; f.vx=f.vy=0; f.vz=1.1; f.phase="bounce"; this.emit("food-land",f.x,f.y); }
            else {f.vz=0;f.phase="grounded";}
          }
        }
      }
      const units = [...this.units];
      for (const u of units) {
        u.age += dt;

        u.cooldown = Math.max(0, u.cooldown - dt);

        if (this.scene === "farm") this.farmUnit(u, dt);
        else if (this.running) this.raidUnit(u, dt);
        const oldZ = u.z,oldPosition={x:u.x,y:u.y,z:u.z};
        u.integrate(dt);
        if(this.scene==="raid"&&this.running)u.ability.afterMove(this,oldPosition);
        if (oldZ > 0 && u.z === 0) {
          this.metrics.landings++;
          if (Math.hypot(u.vx, u.vy) > 1) this.emit("land", u.x, u.y);
        }
        const boundary = Math.hypot(u.x / 9.5, u.y / 6.8);
        if (boundary > 1) {
          u.x /= boundary;
          u.y /= boundary;
          const nx = u.x / (9.5 * 9.5), ny = u.y / (6.8 * 6.8), n = Math.hypot(nx, ny), out = (u.vx * nx + u.vy * ny) / n;
          if (out > 0) {
            u.vx -= 1.35 * out * nx / n;
            u.vy -= 1.35 * out * ny / n;
          }
        }
      }
      for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
        if (contact(units[i], units[j])) this.metrics.contacts++;
      }
      if (this.scene === "farm") {
        for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) this.pair(units[i], units[j]);
      } else if (this.running) { this.updateProjectiles(dt);this.updateBoss(dt); }
    }
    steer(u, x, y, dt, speed2) {
      const dx = x - u.x, dy = y - u.y, d = Math.hypot(dx, dy);
      if (d > 0.08) {
        const rate = 1 - Math.exp(-dt * 3);
        u.vx += (dx / d * speed2 - u.vx) * rate;
        u.vy += (dy / d * speed2 - u.vy) * rate;
        u.angle = Math.atan2(dy, dx);
      }
    }
    farmUnit(u, dt) {
      if (u.stun > 0 || u.z > 0.1) return;
      let target = null, best = Infinity;
      if (!u.mature || this.mode === "breed" && !u.fed) {
        for (const f of this.food) {
          const d = Math.hypot(f.x - u.x, f.y - u.y);
          if (f.phase === "grounded" && d < best) {
            best = d;
            target = f;
          }
        }
        if (target && best < 0.42) {
          this.food.splice(this.food.indexOf(target), 1);
          u.meals++;
          u.growth = Math.min(CONFIG.matureMeals, u.growth + 1);
          u.vz = 2;
          this.emit("eat", u.x, u.y, 0.5);
          target = null;
        }
      } else if (u.cooldown === 0) {
        for (const p of this.units) {
          if (p === u || p.species !== u.species || !p.mature || p.cooldown > 0 || this.mode === "breed" && !p.fed || this.mode === "merge" && (p.tier !== u.tier || u.tier >= CONFIG.maxTier)) continue;
          const d = Math.hypot(p.x - u.x, p.y - u.y);
          if (d < best) {
            best = d;
            target = p;
          }
        }
      }
      if (target) this.steer(u, target.x, target.y, dt, 2.2 * (target.phase === "grounded" ? this.progress.rate("growth") : 1));
      else this.steer(u, Math.sin(this.time * 0.18 + u.seed) * 7.4, Math.cos(this.time * 0.16 + u.seed) * 5.3, dt, 0.75);
    }
    chargeMembers(x,y){return this.units.filter(u=>u.chargeReady()&&Math.hypot(u.x-x,u.y-y)<=this.progress.controlRadius+1e-9).map(u=>u.id)}
    beginCharge(origin,radius,ids,pointerType="mouse"){
      if(this.scene!=="raid"||!this.running)return false;
      this.cast={origin:{...origin},aim:{...origin},radius,ids:ids.filter(id=>this.units.some(u=>u.id===id&&u.chargeReady())),elapsed:0,pointerType};return true;
    }
    aimCharge(p){if(this.cast)this.cast.aim={...p}}
    cancelCharge(){if(this.cast){this.emit("cancel",this.cast.origin.x,this.cast.origin.y);this.cast=null}}
    chargePower(){return this.cast?clamp(this.cast.elapsed/1.2,0,1):0}
    chargePoint(u,cast=this.cast){
      const spec=ATTACK_TYPES[u.species],power=clamp(cast.elapsed/1.2,0,1),reach=spec.minReach+(spec.maxReach-spec.minReach)*power;
      const dx=cast.aim.x-u.x,dy=cast.aim.y-u.y,d=Math.hypot(dx,dy),scale=d>0?Math.min(d,reach)/d:0;
      return {...ArenaGeometry.clamp({x:u.x+dx*scale,y:u.y+dy*scale}),power};
    }
    releaseCharge(){
      const cast=this.cast;if(!cast)return [];if(Math.hypot(cast.aim.x-cast.origin.x,cast.aim.y-cast.origin.y)<.25){this.cancelCharge();return []}
      const launched=[];for(const id of cast.ids){const u=this.units.find(v=>v.id===id);if(u?.chargeReady()){const target=this.chargePoint(u,cast);if(u.ability.begin(this,target,target.power,true))launched.push(id)}}
      if(launched.length)this.moveTarget=null;else this.emit("cancel",cast.origin.x,cast.origin.y);this.cast=null;return launched;
    }
    combatEvent(kind,u,action){
      this.combatLog.push({kind,id:action?.id??0,unit:u.id,species:u.species,time:this.time,x:u.x,y:u.y,z:u.z});if(this.combatLog.length>240)this.combatLog.shift();
      if(kind==="launch"||kind==="land-attack")this.emit(kind,u.x,u.y,u.z+.2);
      if(kind==="launch")this.notice("attack-launch",{species:u.species});
    }
    damageBoss(u,action,point){
      if(action.hit||this.boss.hp<=0)return false;action.hit=true;
      const spec=ATTACK_TYPES[u.species];this.boss.hp=Math.max(0,this.boss.hp-stats(u.tier).atk*spec.damage);this.boss.flash=.13;
      const dx=point.x-this.boss.x,dy=point.y-this.boss.y,d=Math.hypot(dx,dy)||1;
      this.emit("strike",this.boss.x+dx/d*this.boss.radius,this.boss.y+dy/d*this.boss.radius,clamp(point.z+.3,.2,this.boss.height));
      this.combatEvent("damage",u,action);this.progress.record("hit");this.notice("attack-hit");return true;
    }
    updateProjectiles(dt){
      for(const p of this.projectiles){p.elapsed+=dt;Object.assign(p,Ballistics.sample(p.path,p.elapsed/p.path.duration));
        if(p.elapsed>=p.path.duration){p.z=0;this.emit("shell-land",p.x,p.y);if(ArenaGeometry.overlaps({...p,radius:.6,height:.4},this.boss))this.damageBoss({id:p.owner,species:p.species,tier:p.tier,x:p.x,y:p.y,z:0},p,p)}
      }
      this.projectiles=this.projectiles.filter(p=>p.elapsed<p.path.duration);this.boss.flash=Math.max(0,(this.boss.flash||0)-dt);
    }
    raidUnit(u,dt){
      if(u.down>0){u.down-=dt;u.ability.update(this,dt);if(u.down<=0)u.hp=stats(u.tier).hp;return}
      if(u.ability.update(this,dt)||u.stun>0||u.z>.1)return;
      if(this.cast?.ids.includes(u.id)){u.vx*=Math.exp(-dt*16);u.vy*=Math.exp(-dt*16);return}
      if(this.moveTarget){
        const i=this.units.indexOf(u),a=i*2.3999632297,r=Math.sqrt(i)*.66,target=ArenaGeometry.clamp({x:this.moveTarget.x+Math.cos(a)*r,y:this.moveTarget.y+Math.sin(a)*r});
        const d=Math.hypot(target.x-u.x,target.y-u.y);if(d>.16)this.steer(u,target.x,target.y,dt,Math.min(3,d*3));else{u.vx*=Math.exp(-dt*12);u.vy*=Math.exp(-dt*12)}return;
      }
      const b=this.boss,spec=ATTACK_TYPES[u.species],a=-Math.PI+.25+((Math.floor((u.id-1)/3)%12)/11)*(Math.PI-.5),stand=spec.stand+(u.tier-1)*.15;
      const slot=ArenaGeometry.clamp({x:b.x+Math.cos(a)*stand,y:b.y+Math.sin(a)*stand}),d=Math.hypot(slot.x-u.x,slot.y-u.y);
      if(d>.42){this.steer(u,slot.x,slot.y,dt,3.5);return}
      const dx=u.x-b.x,dy=u.y-b.y,n=Math.hypot(dx,dy)||1;
      const target=spec.kind==="lob"?{x:b.x,y:b.y}:{x:b.x+dx/n*(b.radius+u.radius-.12),y:b.y+dy/n*(b.radius+u.radius-.12)};
      u.ability.begin(this,target,0,false);
    }
    updateBoss(dt) {
      const b = this.boss;
      if (b.hp <= 0) {
        this.projectiles=[];this.cancelCharge();for(const u of this.units)u.ability.interrupt();
        b.phase = "resting";
        this.running = false;
        this.emit("win", b.x, b.y, 2);
        return;
      }
      b.clock += dt;
      if (b.phase === "rest" && b.clock > 2 && this.units.some((u) => Math.hypot(u.x - b.x, u.y - b.y) < 4.8)) {
        b.phase = "windup";
        b.clock = 0;
        b.hit.clear();
        b.angle = -Math.PI - 0.2;
      } else if (b.phase === "windup" && b.clock > 1.1) {
        b.phase = "sweep";
        b.clock = 0;
        b.swings++;
      } else if (b.phase === "sweep") {
        b.angle = -Math.PI - 0.2 + clamp(b.clock / 0.72, 0, 1) * (Math.PI + 0.4);
        const hx = b.x + Math.cos(b.angle) * 3.2, hy = b.y + Math.sin(b.angle) * 3.2;
        for (const u of this.units) {
          if (b.hit.has(u.id) || !ArenaGeometry.overlaps({x:u.x,y:u.y,z:u.z,radius:u.radius,height:.65},{x:hx,y:hy,z:.05,radius:1,height:1.5})) continue;
          b.hit.add(u.id);
          const dx = u.x - b.x, dy = u.y - b.y, d = Math.hypot(dx, dy) || 1;
          u.knock(dx / d, dy / d, 10.5, 6 + this.random() * 1.5);
          u.hp -= 14;
          if (u.hp <= 0) u.down = 3;
          this.metrics.directHits++;
          this.emit("impact", u.x, u.y, 0.5);
        }
        if (b.clock > 0.72) {
          b.phase = "recover";
          b.clock = 0;
        }
      } else if (b.phase === "recover" && b.clock > 1.1) {
        b.phase = "rest";
        b.clock = 0;
      }
    }
  };


export {Garden,Unit,AttackCycle,FarmProgress,TREE_NODES,ATTACK_TYPES,ArenaGeometry,Ballistics,CONFIG,clamp,stats};
