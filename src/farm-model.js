const {SeededPRNG}=globalThis.BloomGamekitDeterministic;
const presentationClocks=new WeakMap();
const presentationEventTimes=new WeakMap();
export function presentationEventTimeMs(event){return presentationEventTimes.get(event)??(Number.isFinite(event?.time)?event.time*1000:0)}
export function bindPresentationClock(world,clock){if(clock)presentationClocks.set(world,clock);else presentationClocks.delete(world)}
  // sim.js
  var CONFIG = Object.freeze({ cap: 72, maxFarmCap:100, maxFarmUnitId:999999999, maxRaidPlayerUnits:100, maxRaidPlayers:4, raidPlayerIdStride:1000000, maxRaidUnits:400, maxUnitRadius:.47, maxTier: 4, starterSeconds: 60, matureMeals: 3, gravity: 19, fixedStep: 1 / 120, raid:Object.freeze({radiusX:23,radiusY:17,bossRadius:4.4,bossHeight:5.2,basicReach:6.2,sweepReach:6.5,weaponRadius:.85,chaseSpeed:2.65,basicWindup:.5,basicDuration:.24,basicRecover:.48,sweepWindup:1.05,sweepDuration:1.05,sweepRecover:1.05,sweepInterval:6.8,dropHeight:3,buffDuration:3,buffCooldown:12,buffDamage:1.25}) });
function bossAttackArea(boss,unitRadius=0){
  const c=CONFIG.raid,phase=boss.phase,heavy=phase==='sweep-windup'||phase==='sweep',wind=phase==='sweep-windup'||phase==='strike-windup';
  if(!heavy&&phase!=='strike-windup'&&phase!=='strike')return null;
  const width=c.weaponRadius+Math.max(0,unitRadius),duration=heavy?(wind?c.sweepWindup:c.sweepDuration):(wind?c.basicWindup:c.basicDuration);
  return heavy?{kind:'sweep',x:boss.x,y:boss.y,width,sweepRadius:c.sweepReach,outerRadius:c.sweepReach+width,startAngle:((boss.startAngle%(Math.PI*2))+Math.PI*2)%(Math.PI*2),progress:clamp(boss.clock/duration,0,1),active:phase==='sweep'}:{kind:'basic',x:boss.x,y:boss.y,width,startRadius:Math.max(0,boss.radius-.25),endRadius:c.basicReach,angle:boss.angle,progress:clamp(boss.clock/duration,0,1),active:phase==='strike'};
}
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
  {id:"capacity",name:"Garden expansion",icon:"＋",metric:"birth",goal:3,parent:"growth",description:"Expand farm capacity by 7 per level, up to 100.",value:l=>`${Math.min(100,72+7*l)} troops`}
];
class FarmProgress {
 constructor(){this.levels=Object.fromEntries(TREE_NODES.map(n=>[n.id,0]));this.records={eat:0,birth:0,merge:0,hit:0}}
 record(kind){if(kind in this.records)this.records[kind]++}
 ready(n){return this.levels[n.id]<4&&(!n.parent||this.levels[n.parent]>0)&&this.records[n.metric]>=n.goal*(this.levels[n.id]+1)}
 invest(id){const n=TREE_NODES.find(n=>n.id===id);if(!n||!this.ready(n))return false;this.levels[id]++;return true}
 rate(id){return 1+.1*this.levels[id]}
 get autoTapSeconds(){return .5/this.rate('food')}
}
// Simulation types are independent of the renderer skin mapping.
const ATTACK_TYPES = Object.freeze([
  {kind:"ram",windup:.28,recover:.65,stand:1.45,damage:1},
  {kind:"lob",windup:.38,recover:1.25,stand:4.1,damage:1.6},
  {kind:"leap",windup:.32,recover:.9,stand:2.5,damage:1.3}
]);
const ArenaGeometry = {
  bounds(scene='raid',margin=0){return scene==='raid'?{x:CONFIG.raid.radiusX-margin,y:CONFIG.raid.radiusY-margin}:{x:9.5-margin,y:6.8-margin}},
  inside(p,scene='raid',margin=0){const r=this.bounds(scene,margin);return p.x*p.x/(r.x*r.x)+p.y*p.y/(r.y*r.y)<=1},
  clamp(p,scene='raid',margin=0){const r=this.bounds(scene,margin),k=Math.max(1,Math.hypot(p.x/r.x,p.y/r.y));return {x:p.x/k,y:p.y/k}},
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
  create(from,to,kind){const distance=Math.hypot(to.x-from.x,to.y-from.y);return {from:{x:from.x,y:from.y,z:kind==="lob"?.45:0},to:{...to},height:kind==="ram"?0:(kind==="lob"?2:2.7),duration:kind==="ram"?Math.max(.12,distance/10):.65+distance*.055}},
  sample(path,q){q=clamp(q,0,1);return {x:path.from.x+(path.to.x-path.from.x)*q,y:path.from.y+(path.to.y-path.from.y)*q,z:path.from.z*(1-q)+4*path.height*q*(1-q)}}
};
class AttackCycle {
  constructor(owner){this.owner=owner;this.phase="idle";this.elapsed=0;this.action=null;}
  get spec(){return ATTACK_TYPES[this.owner.species]}
    begin(sim,target){
    const u=this.owner;if(this.phase!=="idle"||u.down>0||u.stun>0||u.z>.1)return false;
    this.phase="windup";this.elapsed=0;this.action={id:++sim.attackSerial,target:{...target},hit:false,path:null};
    u.angle=Math.atan2(target.y-u.y,target.x-u.x);u.vx=u.vy=0;
    sim.combatEvent("prepare",u,this.action);return true;
  }
  interrupt(){if(this.phase!=="idle"){this.phase="recover";this.elapsed=0;this.action=null}}
  recover(sim,recoil=false){this.phase="recover";this.elapsed=0;const u=this.owner;if(recoil){u.vx=-Math.cos(u.angle)*2.2;u.vy=-Math.sin(u.angle)*2.2}sim.combatEvent("recover",u,this.action)}
  update(sim,dt){
    const u=this.owner;
    if(u.stun>0||u.down>0){this.interrupt();return true}
    if(this.phase==="idle")return false;
    this.elapsed+=dt;
    if(this.phase==="windup"){
      u.vx*=Math.exp(-dt*18);u.vy*=Math.exp(-dt*18);
      if(this.elapsed>=this.spec.windup){
        this.elapsed=0;this.phase="active";const a=this.action;a.path=Ballistics.create(u,a.target,this.spec.kind);sim.combatEvent("launch",u,a);
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
  knock(...args){this.ability.interrupt();super.knock(...args)}
  integrate(dt){if(!this.ability.integrate(dt))super.integrate(dt)}
};

  var Unit = class extends AttackingBody(Knockable(Body)) {
    constructor(id, species, tier, x, y) {
      super(x, y);
      Object.assign(this, { id, species, tier, meals: 0, growth: 0, age: 0, cooldown: 0, home: { x, y }, hp: stats(tier).hp, down: 0, seed: id * 2.39996,ownerId:'',farmId:0,dropLanded:true });
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
    static createRaidBattle(seed=731,expectedPlayers=['solo']){
      const w=new Garden(seed);w.units=[];w.food=[];w.scene='raid';w.running=false;w.boss=w.createBoss();w.boss.phase='resting';
      w.encounter={outcome:'idle',elapsed:0};w.raidExpectedPlayers=[...expectedPlayers];w.raidRosters=[];w.raidDeploymentStarted=false;w.nextId=1;w.starter=0;return w;
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
      this.mode = "breed";
      this.scene = "farm";
      this.running = false;
      this.encounter={outcome:'idle',elapsed:0};
      this.boss=this.createBoss();
      this.raidExpectedPlayers=['solo'];this.raidRosters=[];this.raidDeploymentStarted=false;
      this.metrics = { births: 0, merges: 0, directHits: 0, contacts: 0, landings: 0, basicHits:0, sweepHits:0 };
      for (let i = 0; i < 36; i++) {
        const u = this.spawn(i % 3, 1, (this.random() - 0.5) * 15, (this.random() - 0.5) * 11);
        u.meals = i < 18 ? 3 : 0;
        u.growth = u.meals;
      }
    }
    get armyHealth(){return this.units.reduce((sum,u)=>({current:sum.current+Math.max(0,Math.min(stats(u.tier).hp,u.hp)),max:sum.max+stats(u.tier).hp,living:sum.living+(u.hp>0?1:0),total:sum.total+1}),{current:0,max:0,living:0,total:0})}
    get capacity(){return Math.min(CONFIG.maxFarmCap,CONFIG.cap+7*(this.progress?.levels?.capacity||0))}
    raidRoster(ownerId){return this.raidRosters.find(r=>r.ownerId===ownerId)||null}
    setRaidPlayers(players){
      if(this.scene!=='raid'||!Array.isArray(players)||players.length<1||players.length>CONFIG.maxRaidPlayers||players.some(p=>typeof p!=='string'||!p)||new Set(players).size!==players.length)return false;
      const live=[...players],ordered=this.raidDeploymentStarted?[...this.raidExpectedPlayers,...live.filter(id=>!this.raidExpectedPlayers.includes(id))]:live;if(ordered.length>CONFIG.maxRaidPlayers)return false;
      this.raidExpectedPlayers=ordered;if(!this.raidDeploymentStarted)this.raidRosters=this.raidRosters.filter(r=>live.includes(r.ownerId));
      this.raidRosters.sort((a,b)=>this.raidExpectedPlayers.indexOf(a.ownerId)-this.raidExpectedPlayers.indexOf(b.ownerId));return true;
    }
    raidTotal(){return this.raidRosters.reduce((n,r)=>n+r.troops.length,0)}
    raidRemaining(ownerId){const r=this.raidRoster(ownerId);return r?r.troops.reduce((n,t)=>n+(!t.deployed?1:0),0):0}
    registerRaidRoster(ownerId,entries){
      if(this.scene!=='raid'||!this.raidExpectedPlayers.includes(ownerId)||this.raidRoster(ownerId)||!Array.isArray(entries)||entries.length>CONFIG.maxRaidPlayerUnits||this.raidTotal()+entries.length>CONFIG.maxRaidUnits)return false;
      const ids=new Set(),troops=[];for(const e of entries){if(!Array.isArray(e)||e.length!==3||!Number.isSafeInteger(e[0])||e[0]<1||e[0]>CONFIG.maxFarmUnitId||!Number.isInteger(e[1])||e[1]<0||e[1]>2||!Number.isInteger(e[2])||e[2]<1||e[2]>4||ids.has(e[0]))return false;ids.add(e[0]);troops.push({farmId:e[0],species:e[1],tier:e[2],deployed:false})}
      const orderKey=farmId=>{let h=(this.seed^Math.imul(farmId,0x9e3779b9))>>>0;for(let i=0;i<ownerId.length;i++){h^=ownerId.charCodeAt(i);h=Math.imul(h,0x01000193)}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return h>>>0};
      troops.sort((a,b)=>orderKey(a.farmId)-orderKey(b.farmId)||a.farmId-b.farmId);
      this.raidRosters.push({ownerId,troops,lastDeploySequence:0,buffUntil:0,buffReadyAt:0});this.raidRosters.sort((a,b)=>this.raidExpectedPlayers.indexOf(a.ownerId)-this.raidExpectedPlayers.indexOf(b.ownerId));return true;
    }
    deployNextRaidUnit(ownerId,sequence,x,y){
      if(this.scene!=='raid'||!this.raidExpectedPlayers.every(id=>this.raidRoster(id))||this.units.length>=CONFIG.maxRaidUnits||!Number.isSafeInteger(sequence)||!Number.isFinite(x)||!Number.isFinite(y))return false;
      const roster=this.raidRoster(ownerId),troop=roster?.troops.find(t=>!t.deployed);if(!roster||sequence!==roster.lastDeploySequence+1||!troop||!ArenaGeometry.inside({x,y},'raid',.5))return false;
      const farmId=troop.farmId,slot=this.raidExpectedPlayers.indexOf(ownerId),troopIndex=roster.troops.indexOf(troop),id=(slot+1)*CONFIG.raidPlayerIdStride+troopIndex+1;if(this.units.some(u=>u.id===id))return false;
      const u=new Unit(id,troop.species,troop.tier,x,y);Object.assign(u,{ownerId,farmId,z:CONFIG.raid.dropHeight,vz:0,dropLanded:false,meals:3,growth:3});troop.deployed=true;roster.lastDeploySequence=sequence;this.units.push(u);
      if(!this.raidDeploymentStarted){this.raidDeploymentStarted=true;this.running=true;this.encounter={outcome:'fighting',elapsed:0};this.boss.phase='chase'}
      this.combat('unit-drop',{unit:id,ownerId,x,y,z:u.z});return true;
    }
    useRaidBuff(ownerId){const r=this.raidRoster(ownerId);if(!this.running||!r||this.time<r.buffReadyAt)return false;r.buffUntil=this.time+CONFIG.raid.buffDuration;r.buffReadyAt=this.time+CONFIG.raid.buffCooldown;this.combat('buff',{ownerId,until:r.buffUntil});return true}
    random() {
      return this.rng.nextUint32() / 4294967296;
    }
    spawn(species, tier, x, y) {
      if (this.units.length >= (this.scene==='farm'?this.capacity:CONFIG.maxRaidUnits)) return null;
      const u = new Unit(this.nextId++, species, clamp(tier, 1, CONFIG.maxTier), x, y);
      this.units.push(u);
      return u;
    }
    notice(kind,detail={}){const event={sequence:++this.eventSequence,kind,...detail};this.notices.push(event);if(this.notices.length>512)this.notices.shift();return event}
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
    createBoss(){return {x:0,y:0,z:0,radius:CONFIG.raid.bossRadius,height:CONFIG.raid.bossHeight,hp:2400,maxHp:2400,phase:'resting',clock:0,angle:0,facing:0,flash:0,hit:new Set(),swings:0,basicCount:0,attackId:0,targetId:0,sweepClock:0,attackKind:'basic',startAngle:0,travel:0}}
    setScene(scene){
      if(scene===this.scene)return;
      this.projectiles=[];this.scene=scene;this.running=scene==='raid';this.encounter={outcome:this.running?'fighting':'idle',elapsed:0};this.boss=this.createBoss();
      for(let i=0;i<this.units.length;i++){
        const u=this.units[i];if(scene==='raid'){u.home={x:u.x,y:u.y};u.farmId=u.id;u.ownerId='solo';u.id=1000000+u.farmId;u.dropLanded=true;const angle=i*2.3999632297,rad=10.5+(i%3)*.9;Object.assign(u,{x:Math.cos(angle)*rad,y:Math.sin(angle)*rad*.84})}else{u.id=u.farmId||u.id;u.ownerId='';u.farmId=0;u.dropLanded=true;Object.assign(u,u.home)}
        u.ability=new AttackCycle(u);Object.assign(u,{z:0,vx:0,vy:0,vz:0,stun:0,down:0,hp:stats(u.tier).hp});
      }
      if(this.running){this.boss.phase='chase';this.raidExpectedPlayers=['solo'];this.raidRosters=[{ownerId:'solo',troops:this.units.map(u=>({farmId:u.farmId,species:u.species,tier:u.tier,deployed:true})),buffUntil:0,buffReadyAt:0}];this.raidDeploymentStarted=true}else{this.raidExpectedPlayers=['solo'];this.raidRosters=[];this.raidDeploymentStarted=false}
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
      if(this.scene==='raid'&&this.running)this.encounter.elapsed+=dt;
      if(this.scene==='farm')this.starter += dt;
      while (this.scene==='farm'&&this.starter >= CONFIG.starterSeconds / this.progress.rate("production")) {
        this.starter -= CONFIG.starterSeconds / this.progress.rate("production");
        const u = this.spawn(Math.floor(this.random() * 3), 1, -7, 0);
        if (u && this.scene === "raid") {
          u.home = { x: -7, y: 0 };
          const a=u.seed;Object.assign(u,ArenaGeometry.clamp({x:this.boss.x+Math.cos(a)*12,y:this.boss.y+Math.sin(a)*12},'raid',u.radius));
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
        else if (this.running&&u.dropLanded) this.raidUnit(u, dt);
        const oldZ = u.z,oldPosition={x:u.x,y:u.y,z:u.z};
        u.integrate(dt);
        if(this.scene==="raid"&&u.hp<=0&&u.z===0&&u.vz===0){u.vx=u.vy=0;}
        if(this.scene==="raid"&&this.running)u.ability.afterMove(this,oldPosition);
        if (oldZ > 0 && u.z === 0) {
          if(this.scene==='raid'&&!u.dropLanded){u.dropLanded=true;u.bounce=.16;this.combat('drop-land',{unit:u.id,ownerId:u.ownerId,x:u.x,y:u.y,z:0});this.effects.push({kind:'drop-dust',x:u.x,y:u.y,z:0,life:0})}
          this.metrics.landings++;
          if(this.scene==='raid')this.combat('unit-land',{unit:u.id,x:u.x,y:u.y,z:0,strength:Math.min(1,Math.hypot(u.vx,u.vy)/8)});
          else if (Math.hypot(u.vx, u.vy) > 1) this.emit("land", u.x, u.y);
        }
        this.boundBody(u,this.scene,u.radius);

      }
      if(this.scene==='raid')this.raidContacts(units);else for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) if (contact(units[i], units[j])) this.metrics.contacts++;
      if (this.scene === "farm") {
        for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) this.pair(units[i], units[j]);
      } else if (this.running) { this.updateProjectiles(dt);this.updateBoss(dt);for(const u of this.units)this.separateBoss(u); }
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
    raidContacts(units){
      const size=1.5,cells=new Map(),key=(x,y)=>`${x},${y}`;
      for(let i=0;i<units.length;i++){const u=units[i];if(u.hp<=0||!u.dropLanded)continue;const cx=Math.floor(u.x/size),cy=Math.floor(u.y/size),near=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)near.push(...(cells.get(key(cx+dx,cy+dy))||[]));near.sort((a,b)=>a-b);for(const j of near){const other=units[j];if(other.hp>0&&other.dropLanded&&contact(other,u))this.metrics.contacts++}const k=key(cx,cy);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(i)}
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
    combat(kind,detail){const event=this.notice(kind,{time:this.time,...detail}),toPresentationTime=presentationClocks.get(this);if(toPresentationTime)presentationEventTimes.set(event,toPresentationTime(this.time))}
    boundBody(body,scene,margin){
      const before={x:body.x,y:body.y},p=ArenaGeometry.clamp(before,scene,margin);body.x=p.x;body.y=p.y;
      if(before.x!==p.x||before.y!==p.y){const r=ArenaGeometry.bounds(scene,margin),nx=p.x/(r.x*r.x),ny=p.y/(r.y*r.y),n=Math.hypot(nx,ny)||1,out=((body.vx||0)*nx+(body.vy||0)*ny)/n;
        if(out>0){body.vx-=1.3*out*nx/n;body.vy-=1.3*out*ny/n}}
    }
    separateBoss(u){
      const b=this.boss;if(u.hp<=0||!u.dropLanded||u.z>b.height)return;const dx=u.x-b.x,dy=u.y-b.y,d=Math.hypot(dx,dy),r=b.radius+u.radius;
      if(d>=r)return;const a=d>1e-6?Math.atan2(dy,dx):u.seed,nx=Math.cos(a),ny=Math.sin(a);u.x=b.x+nx*r;u.y=b.y+ny*r;
      const inward=u.vx*nx+u.vy*ny;if(inward<0){u.vx-=inward*nx;u.vy-=inward*ny}this.boundBody(u,'raid',u.radius);
    }
    combatEvent(kind,u,action){
      this.combatLog.push({kind,id:action?.id??0,unit:u.id,species:u.species,time:this.time,x:u.x,y:u.y,z:u.z});if(this.combatLog.length>240)this.combatLog.shift();
      if(kind==="launch")this.combat("attack-launch",{species:u.species,unit:u.id,x:u.x,y:u.y,z:u.z,attackKind:ATTACK_TYPES[u.species].kind});
    }
    damageBoss(u,action,point){
      if(action.hit||this.boss.hp<=0)return false;action.hit=true;
      const spec=ATTACK_TYPES[u.species],roster=this.raidRoster(u.ownerId),buffed=!!roster&&this.time<roster.buffUntil;this.boss.hp=Math.max(0,this.boss.hp-stats(u.tier).atk*spec.damage*(buffed?CONFIG.raid.buffDamage:1));this.boss.flash=.13;
      const dx=point.x-this.boss.x,dy=point.y-this.boss.y,d=Math.hypot(dx,dy)||1;
      this.combat('boss-hit',{unit:u.id,ownerId:u.ownerId,species:u.species,attackKind:spec.kind,buffed,x:this.boss.x+dx/d*this.boss.radius,y:this.boss.y+dy/d*this.boss.radius,z:clamp(point.z+.2,.2,this.boss.height),nx:dx/d,ny:dy/d,strength:spec.damage*(buffed?CONFIG.raid.buffDamage:1)});
      this.combatEvent('damage',u,action);this.progress.record('hit');return true;
    }

    updateProjectiles(dt){
      for(const p of this.projectiles){
        const old={x:p.x,y:p.y,z:p.z};p.elapsed+=dt;Object.assign(p,Ballistics.sample(p.path,p.elapsed/p.path.duration));
        const hit=ArenaGeometry.sweep(old,p,p.radius,p.height,this.boss);
        if(hit){Object.assign(p,{x:hit.x,y:hit.y,z:hit.z});this.damageBoss({id:p.owner,species:p.species,tier:p.tier,x:p.x,y:p.y,z:p.z},p,hit)}
        else if(p.elapsed>=p.path.duration){p.z=0;this.emit('shell-land',p.x,p.y)}
      }
      this.projectiles=this.projectiles.filter(p=>!p.hit&&p.elapsed<p.path.duration);this.boss.flash=Math.max(0,(this.boss.flash||0)-dt);
    }

    raidUnit(u,dt){
      if(!u.dropLanded)return;
      if(u.hp<=0){u.down=1;u.ability.interrupt();return}
      if(u.ability.update(this,dt)||u.stun>0||u.z>.1)return;
      const b=this.boss,spec=ATTACK_TYPES[u.species],dx=u.x-b.x,dy=u.y-b.y,n=Math.hypot(dx,dy)||1;
      // Hold the current firing bearing. Ranged troops retreat from a boss that closes in;
      // they never follow a rotating slot through its body to reach the opposite side.
      const stand=b.radius+spec.stand+(u.tier-1)*.12,min=stand-.55,max=stand+.55;
      if(n>max||(spec.kind==='lob'&&n<min)){
        const slot=ArenaGeometry.clamp({x:b.x+dx/n*stand,y:b.y+dy/n*stand},'raid',u.radius);
        this.steer(u,slot.x,slot.y,dt,4.1);return;
      }
      u.vx=u.vy=0;
      const target=spec.kind==='lob'?{x:b.x,y:b.y}:{x:b.x+dx/n*(b.radius+u.radius-.16),y:b.y+dy/n*(b.radius+u.radius-.16)};
      u.ability.begin(this,target);
    }
    finish(outcome){
      if(!this.running)return;this.running=false;this.encounter.outcome=outcome;this.projectiles=[];this.boss.phase='resting';
      for(const u of this.units)u.ability.interrupt();this.combat(outcome,{x:this.boss.x,y:this.boss.y,z:0});
    }
    bossAttackArea(unitRadius=0){return bossAttackArea(this.boss,unitRadius)}
    bossWeaponPoint(phase=this.boss.phase,q=0){
      const b=this.boss,c=CONFIG.raid;
      if(phase==='sweep'){const a=b.startAngle+Math.PI*2*q;return {x:b.x+Math.cos(a)*c.sweepReach,y:b.y+Math.sin(a)*c.sweepReach,z:.2}}
      const reach=b.radius-.25+(c.basicReach-b.radius+.25)*Math.sin(Math.PI*clamp(q,0,1));return {x:b.x+Math.cos(b.angle)*reach,y:b.y+Math.sin(b.angle)*reach,z:.2};
    }
    beginBossAttack(kind,target){
      const b=this.boss;b.attackKind=kind;b.clock=0;b.phase=kind==='basic'?'strike-windup':'sweep-windup';b.angle=Math.atan2(target.y-b.y,target.x-b.x);b.startAngle=b.angle-Math.PI/2;b.hit.clear();
      this.combat('boss-prepare',{attackKind:kind,x:b.x,y:b.y,z:0,angle:b.angle});
    }
    hitBossUnit(u,kind,p){
      const b=this.boss,heavy=kind==='sweep';if(u.hp<=0||!u.dropLanded||b.hit.has(u.id))return false;
      b.hit.add(u.id);const dx=u.x-b.x,dy=u.y-b.y,n=Math.hypot(dx,dy)||1;u.knock(dx/n,dy/n,heavy?13:8.5,heavy?10.2:7.2);u.hp=Math.max(0,u.hp-(heavy?10:8));if(u.hp===0)u.down=1;
      this.metrics.directHits++;this.metrics[heavy?'sweepHits':'basicHits']++;
      this.combat('unit-hit',{attackKind:kind,attackId:b.attackId,unit:u.id,x:p.x,y:p.y,z:Math.max(.15,u.z+.25),nx:dx/n,ny:dy/n,strength:heavy?1.8:1});return true;
    }
    hitBossWeapon(from,to,kind){
      const c=CONFIG.raid;
      for(const u of this.units){
        if(u.hp<=0||!u.dropLanded||this.boss.hit.has(u.id))continue;const p=ArenaGeometry.sweep(from,to,c.weaponRadius,1.4,{x:u.x,y:u.y,z:u.z,radius:u.radius,height:.65});if(p)this.hitBossUnit(u,kind,p);
      }
    }
    hitBossSweep(q0,q1){
      const b=this.boss,arc=Math.max(0,Math.min(1,q1)-Math.max(0,q0))*Math.PI*2;let hits=0;
      for(const u of this.units){
        if(u.hp<=0||!u.dropLanded||b.hit.has(u.id))continue;
        const area=bossAttackArea(b,u.radius),dx=u.x-b.x,dy=u.y-b.y,d=Math.hypot(dx,dy),blade=area.width;
        if(d>area.sweepRadius+blade||.2<u.z-1.4||.2>u.z+.65)continue;
        const pad=d<=blade?Math.PI:Math.asin(Math.min(1,blade/d)),unitAngle=Math.atan2(dy,dx),scanStart=area.startAngle+Math.PI*2*Math.max(0,Math.min(1,q0)),offset=((unitAngle-scanStart)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
        if(offset>arc+pad&&offset<Math.PI*2-pad)continue;
        const radius=Math.min(d,area.sweepRadius),p={x:b.x+Math.cos(unitAngle)*radius,y:b.y+Math.sin(unitAngle)*radius,z:.2};if(this.hitBossUnit(u,'sweep',p))hits++;
      }
      return hits;
    }
    updateBoss(dt){
      const b=this.boss,c=CONFIG.raid;
      if(!this.raidDeploymentStarted)return;
      if(b.hp<=0){this.finish('victory');return}if(this.raidRosters.length&&this.raidRosters.every(r=>r.troops.every(t=>t.deployed))&&!this.units.some(u=>u.hp>0)){this.finish('defeat');return}
      const living=this.units.filter(u=>u.hp>0&&u.dropLanded);if(!living.length)return;
      b.clock+=dt;b.sweepClock+=dt;
      if(b.phase==='chase'){
        let target=living.find(u=>u.id===b.targetId);if(!target){target=living[(b.basicCount*7+b.swings*11)%living.length];b.targetId=target.id}
        const dx=target.x-b.x,dy=target.y-b.y,d=Math.hypot(dx,dy)||1;b.facing=Math.atan2(dy,dx);b.angle=b.facing;
        if(b.sweepClock>=c.sweepInterval){this.beginBossAttack('sweep',target);return}
        if(d<=c.basicReach+c.weaponRadius*.35&&target.z<1.6&&b.clock>.35){this.beginBossAttack('basic',target);return}
        if(d>b.radius+target.radius+.2){const old={x:b.x,y:b.y};b.x+=dx/d*c.chaseSpeed*dt;b.y+=dy/d*c.chaseSpeed*dt;this.boundBody(b,'raid',b.radius+.25);b.travel+=Math.hypot(b.x-old.x,b.y-old.y)}
      }else if(b.phase==='strike-windup'||b.phase==='sweep-windup'){
        const heavy=b.phase==='sweep-windup';if(b.clock>=(heavy?c.sweepWindup:c.basicWindup)){b.phase=heavy?'sweep':'strike';b.clock=0;b.attackId=++this.attackSerial;if(heavy){b.swings++;b.sweepClock=0}else b.basicCount++;this.combat('boss-launch',{attackKind:heavy?'sweep':'basic',attackId:b.attackId,x:b.x,y:b.y,z:.2})}
      }else if(b.phase==='strike'||b.phase==='sweep'){
        const heavy=b.phase==='sweep',duration=heavy?c.sweepDuration:c.basicDuration,previous=Math.max(0,(b.clock-dt)/duration),q=Math.min(1,b.clock/duration);
        if(heavy)this.hitBossSweep(previous,q);else this.hitBossWeapon(this.bossWeaponPoint(b.phase,previous),this.bossWeaponPoint(b.phase,q),'basic');
        if(heavy)b.angle=b.startAngle+Math.PI*2*q;
        if(b.clock>=duration){b.phase='recover';b.clock=0}
      }else if(b.phase==='recover'&&b.clock>=(b.attackKind==='sweep'?c.sweepRecover:c.basicRecover)){b.phase='chase';b.clock=0;b.targetId=0}
    }

  };


export {Garden,Unit,AttackCycle,FarmProgress,TREE_NODES,ATTACK_TYPES,ArenaGeometry,Ballistics,CONFIG,clamp,stats,bossAttackArea};
