const {SeededPRNG}=globalThis.BloomGamekitDeterministic;
import {resolveUnitStats,applyDamageToTargets,applyHealing,resolveStatusDuration,resolveKnockback,scaleMoveSpeed,scaleAttackRecovery,scaleAttackArea} from './unit-stats.js';
import {UNIT_ABILITY_PROFILES as ATTACK_TYPES,abilityProfile} from './unit-abilities.js';
import {bossAcquisitionChance, settleBossKill, grantPendingBossAcquisitions} from './boss-rewards.js';
import {createPlayerProgressionState} from './player-progression.js';
import {purchaseAbilityNode, resetAbilityProgression} from './ability-tree.js';
import {createAbilityRuntimeSnapshot, isValidAbilityRuntimeSnapshot} from './ability-state.js';
import {createBeanSplitDescriptors, getCornBurstConfig, createCornBurstShotSchedule, getPopcornExplosionConfig, getChestnutSpikeConfig, getChestnutSpikeFanAngles, getChestnutSpikeIntervalSeconds, getContinuousLeapConfig, shouldResetLeapCooldown, getLandingShockwaveConfig} from './species-abilities.js';
import {MAX_BEAN_SPLIT_CHILDREN} from './species-abilities.js';
const presentationClocks=new WeakMap();
const presentationEventTimes=new WeakMap();
export function presentationEventTimeMs(event){return presentationEventTimes.get(event)??(Number.isFinite(event?.time)?event.time*1000:0)}
export function bindPresentationClock(world,clock){if(clock)presentationClocks.set(world,clock);else presentationClocks.delete(world)}
  // sim.js
  const BREED_COOLDOWN_SECONDS=10;
  var CONFIG = Object.freeze({ cap: 72, maxFarmCap:100, maxFarmBattleUnits:100*(1+MAX_BEAN_SPLIT_CHILDREN), maxFarmUnitId:999999999, maxRaidPlayerUnits:100, maxRaidPlayers:4, raidPlayerIdStride:1000000, maxRaidUnits:400, maxRaidBattleUnits:400*(1+MAX_BEAN_SPLIT_CHILDREN), maxRaidProjectiles:400*(1+MAX_BEAN_SPLIT_CHILDREN)*4, raidSummonIdBase:4000000+100+1, maxSpecies:4, maxUnitRadius:.47, maxTier: 4, starterSeconds: 60, breedCooldownSeconds: BREED_COOLDOWN_SECONDS, breedGrowthSeconds: BREED_COOLDOWN_SECONDS/2, mergeAnimationSeconds:.85, matureMeals: 3, corpseRecoverySeconds:60, farmBossEvent:Object.freeze({spawnChance:.01,fadeSeconds:.5,celebrationSeconds:1}), gravity: 19, fixedStep: 1 / 120, raid:Object.freeze({radiusX:23,radiusY:17,perceptionRange:18,bossRadius:4.4,bossHeight:5.2,basicReach:6.2,sweepReach:6.5,weaponRadius:.85,chaseSpeed:2.65,basicWindup:.5,basicDuration:.24,basicRecover:.48,sweepWindup:1.05,sweepDuration:1.05,sweepRecover:1.05,sweepInterval:6.8,dropHeight:3,buffDuration:3,buffCooldown:12,buffDamage:1.25}) });
const MAP_ENEMY_TARGETS={farm:world=>world.farmBossEvent?.phase==='fighting'&&world.boss?.active?[world.boss]:[],raid:world=>world.running&&world.raidDeploymentStarted&&world.boss?.active?[world.boss]:[]};
function bossAttackArea(boss,unitRadius=0){
  const c=CONFIG.raid,phase=boss.phase,heavy=phase==='sweep-windup'||phase==='sweep',wind=phase==='sweep-windup'||phase==='strike-windup';
  if(!heavy&&phase!=='strike-windup'&&phase!=='strike')return null;
  const width=c.weaponRadius+Math.max(0,unitRadius),duration=heavy?(wind?c.sweepWindup:c.sweepDuration):(wind?c.basicWindup:c.basicDuration);
  return heavy?{kind:'sweep',x:boss.x,y:boss.y,width,sweepRadius:c.sweepReach,outerRadius:c.sweepReach+width,startAngle:((boss.startAngle%(Math.PI*2))+Math.PI*2)%(Math.PI*2),progress:clamp(boss.clock/duration,0,1),active:phase==='sweep'}:{kind:'basic',x:boss.x,y:boss.y,width,startRadius:Math.max(0,boss.radius-.25),endRadius:c.basicReach,angle:boss.angle,progress:clamp(boss.clock/duration,0,1),active:phase==='strike'};
}
  var clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  var stats = (tier,species) => resolveUnitStats({tier,species});
  var Body = class {
    constructor(x, y) {
      Object.assign(this, { x, y, z: 0, vx: 0, vy: 0, vz: 0, angle: 0, stun: 0, flash: 0, bounce: 0 });
    }
  };
  var Knockable = (Base) => class extends Base {
    knock(nx, ny, power, lift = 0, source = null) {
      const appliedPower=resolveKnockback(power,source,this);
      this.vx += nx * appliedPower;
      this.vy += ny * appliedPower;
      this.vz = Math.max(this.vz, lift * (power>0?appliedPower/power:0));
      this.stun = Math.max(this.stun, resolveStatusDuration(0.5,source,this));
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
  {id:"production",name:"새싹 생산",icon:"♧",metric:"eat",goal:8,parent:null,description:"이전 저장 호환용 · 새싹 자동 생산은 종료",value:l=>`${(60/(1+.1*l)).toFixed(1)}초`,hidden:true},
  {id:"food",name:"자동 탭",icon:"◒",metric:"eat",goal:12,parent:null,description:"자동 탭 속도 +10%/단계 · 수동은 매 탭 +1",value:l=>`${(.5/(1+.1*l)).toFixed(3)}초 / 탭`},
  {id:"growth",name:"먹이 찾기",icon:"❧",metric:"eat",goal:10,parent:null,description:"먹이를 향한 이동속도 +10%/단계",value:l=>`${(2.2*(1+.1*l)).toFixed(2)} 속도`},
  {id:"breed",name:"번식 회복",icon:"♡",metric:"birth",goal:2,parent:"growth",description:"부모 대기시간 감소 · 새끼 성장시간은 대기시간의 절반",value:l=>`${(CONFIG.breedCooldownSeconds/(1+.1*l)).toFixed(2)}초`},
  {id:"merge",name:"합체 회복",icon:"◇",metric:"merge",goal:2,parent:"growth",description:"합체 후 대기 속도 +10%/단계 · 체력·공격 배율 유지",value:l=>`${(4/(1+.1*l)).toFixed(2)}초`},
  {id:"capacity",name:"Garden expansion",icon:"＋",metric:"birth",goal:3,parent:"growth",description:"Expand farm capacity by 7 per level, up to 100.",value:l=>`${Math.min(100,72+7*l)} troops`}
];
class FarmProgress {
 constructor(){this.levels=Object.fromEntries(TREE_NODES.map(n=>[n.id,0]));this.records={eat:0,birth:0,merge:0,hit:0}}
 record(kind){if(kind in this.records)this.records[kind]++}
 ready(n){return !n.hidden&&this.levels[n.id]<4&&(!n.parent||this.levels[n.parent]>0)&&this.records[n.metric]>=n.goal*(this.levels[n.id]+1)}
 invest(id){const n=TREE_NODES.find(n=>n.id===id);if(!n||!this.ready(n))return false;this.levels[id]++;return true}
 rate(id){return 1+.1*this.levels[id]}
 get autoTapSeconds(){return .5/this.rate('food')}
}
// Simulation types are independent of the renderer skin mapping.
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
  create(from,to,kind){const distance=Math.hypot(to.x-from.x,to.y-from.y),melee=kind==="ram"||kind==="punch";return {from:{x:from.x,y:from.y,z:kind==="lob"?.45:0},to:{...to},height:melee?0:(kind==="lob"?2:2.7),duration:melee?Math.max(.12,distance/10):.65+distance*.055}},
  sample(path,q){q=clamp(q,0,1);return {x:path.from.x+(path.to.x-path.from.x)*q,y:path.from.y+(path.to.y-path.from.y)*q,z:path.from.z*(1-q)+4*path.height*q*(1-q)}}
};
class AttackCycle {
  constructor(owner){this.owner=owner;this.phase="idle";this.elapsed=0;this.action=null;}
  get spec(){return abilityProfile(this.owner.species)}
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
          const burst=getCornBurstConfig(sim.abilityProgressionFor(u),u.tier);
          const popcorn=getPopcornExplosionConfig(sim.abilityProgressionFor(u),u.tier);
          const recovery=scaleAttackRecovery(this.spec.recovery,u);
          const shots=burst?createCornBurstShotSchedule(burst,{activeSeconds:0,recoverySeconds:recovery}):[{shotIndex:0,delaySeconds:0,attackMultiplier:this.spec.skillMultiplier}];
          a.pendingShots=shots.slice(1);
          a.projectileAbility={popcorn};
          sim.spawnLobProjectile(u,a,shots[0],popcorn);
          this.recover(sim,true);
        }
      }
    }else if(this.phase==="recover"){
      const pending=this.action?.pendingShots||[];
      while(pending.length&&pending[0].delaySeconds<=this.elapsed+1e-9){
        const shot=pending.shift();sim.spawnLobProjectile(u,this.action,shot,this.action.projectileAbility?.popcorn||null);
      }
      if(this.elapsed>=scaleAttackRecovery(this.spec.recovery,u)){this.phase="idle";this.action=null;this.elapsed=0}
    }
    return true;
  }
  integrate(dt){
    const u=this.owner,a=this.action;if(this.phase!=="active"||!a?.path||u.stun>0||u.down>0)return false;
    const p=Ballistics.sample(a.path,this.elapsed/a.path.duration);u.vx=(p.x-u.x)/dt;u.vy=(p.y-u.y)/dt;u.vz=(p.z-u.z)/dt;u.x=p.x;u.y=p.y;u.z=p.z;u.flash=Math.max(0,u.flash-dt);u.bounce=Math.max(0,u.bounce-dt);return true;
  }
  afterMove(sim,old){
    const a=this.action,u=this.owner;if(this.phase!=="active"||!a?.path)return;
    const areaRadius=scaleAttackArea(u.radius,u);
    const hit=!a.hit&&ArenaGeometry.sweep(old,u,areaRadius,.65,sim.boss);
    if(hit){sim.damageBoss(u,a,hit);if(this.spec.kind==="ram"||this.spec.kind==="punch"){u.x=hit.x;u.y=hit.y;u.z=hit.z;this.recover(sim,true);return}}
    if(this.elapsed>=a.path.duration){u.z=0;u.vz=0;u.vx=u.vy=0;if(this.spec.kind==="leap"){
      u.bounce=.2;sim.combatEvent("land-attack",u,a);
      if(!a.hit&&ArenaGeometry.overlaps({x:u.x,y:u.y,z:0,radius:scaleAttackArea(u.radius+.35,u),height:.65},sim.boss))sim.damageBoss(u,a,u);
      const progression=sim.abilityProgressionFor(u),leap=getContinuousLeapConfig(progression,u.tier),shockwave=getLandingShockwaveConfig(progression,u.tier);
      if(shockwave)sim.triggerLandingShockwave(u,a,shockwave);
      if(leap&&shouldResetLeapCooldown(leap,sim.random())){this.phase="idle";this.elapsed=0;this.action=null;sim.combat("leap-cooldown-reset",{unit:u.id,ownerId:u.ownerId,species:u.species});return}
    }this.recover(sim,true)}
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
      Object.assign(this, { id, species, tier, meals: 0, growth: 0, growthElapsed: 0, growthDuration: CONFIG.breedGrowthSeconds, age: 0, cooldown: 0, cooldownDuration:0, mateId:0, perceptionRange:CONFIG.raid.perceptionRange, home: { x, y }, hp: stats(tier,species).maxHp, down: 0, seed: id * 2.39996,ownerId:'',farmId:0,dropLanded:true,
        isBattleOnlySummon:false,battleSummonKind:'',battleSummonParentId:0,countsTowardPermanentRoster:true,eligibleForRaidDeployment:true,breedingEligible:true,mergeEligible:true,canSplit:true,splitUsedThisBattle:false,deathSplitHandled:false,usesPersistentSleep:true,lifetime:'',chestnutBasicCycles:0 });
    }
    get radius() {
      return (0.25 + 0.055 * this.tier) * (this.mature ? 1 : 0.8);
    }
    get mature() {
      return this.growthElapsed >= this.growthDuration - 1e-9;
    }
    get fed() {
      return this.meals >= 1;
    }
    get size() {
      const growth=this.mature?1:this.growthDuration>0?clamp(this.growthElapsed/this.growthDuration,0,1):1;
      return (0.55 + 0.1 * this.tier) * (0.5 + 0.5 * growth);
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
      const impulseA=resolveKnockback(impulse,b,a),impulseB=resolveKnockback(impulse,a,b);
      a.vx -= nx * impulseA;
      a.vy -= ny * impulseA;
      b.vx += nx * impulseB;
      b.vy += ny * impulseB;
      if (closing > 2) {
        const receiver = Math.hypot(a.vx, a.vy) > Math.hypot(b.vx, b.vy) ? a : b;
        receiver.vz = Math.max(receiver.vz, Math.min(4, closing * 0.2));
        receiver.stun = Math.max(receiver.stun, resolveStatusDuration(0.3,receiver===a?b:a,receiver));
        receiver.flash = 0.1;
      }
    }
    return true;
  }

  var Garden = class {
    constructor(seed = 731) {
      this.seed = seed;this.progress=new FarmProgress();this.notices=[];this.eventSequence=0;this.mergeTask=null;
      this.reset();
    }
    static createRaidBattle(seed=731,expectedPlayers=['solo']){
      const w=new Garden(seed);w.units=[];w.food=[];w.scene='raid';w.running=false;w.boss=w.createBoss();w.boss.phase='resting';
      w.encounter={outcome:'idle',elapsed:0};w.raidExpectedPlayers=[...expectedPlayers];w.raidRosters=[];w.raidDeploymentStarted=false;w.nextId=1;w.starter=0;return w;
    }
    reset() {
      this.mergeTask=null;
      this.corpseRecoveryVersion=1;
      this.rng = new SeededPRNG(this.seed);
      this.units = [];
      this.food = [];
      this.effects = [];
      this.events = [];
      this.time = 0;
      this.nextId = 1;
      this.nextBossEncounterId = 1;
      this.bossRewardReceipts = [];
      this.bossRewardWatermarks = {farm:0,raid:0};
      this.nextRaidRunSequence = 0;
      this.activeRaidRunSequence = null;
      this.activeRaidSessionId = null;
      this.raidSettlementWatermark = 0;
      this.raidSettlementReceipts = [];
      this.playerProgression = createPlayerProgressionState();
      this.starter = 0;
      this.notices=[];this.eventSequence=0;
      this.foodTaps = { remainder: 0, autoClock: 0, produced: 0, revision: 0 };
      this.projectiles=[];this.attackSerial=0;this.projectileSerial=0;this.raidSummonSerial=0;this.combatLog=[];
      this.mode = "breed";
      this.scene = "farm";
      this.running = false;
      this.encounter={outcome:'idle',elapsed:0};
      this.farmBossEvent={phase:'idle',elapsed:0,outcome:'idle',encounterId:0,rewardStatus:'none',rewardChance:0,rewardRoll:0,rewardUnitId:0};
      this.boss=this.createBoss();
      this.raidExpectedPlayers=['solo'];this.raidRosters=[];this.raidDeploymentStarted=false;
      this.metrics = { births: 0, merges: 0, directHits: 0, contacts: 0, landings: 0, basicHits:0, sweepHits:0 };
      for (let i = 0; i < 2; i++) {
        const u = this.spawn(0, 1, (this.random() - 0.5) * 4, (this.random() - 0.5) * 3);
        u.meals = 0;
        u.growth = CONFIG.matureMeals;
        u.growthDuration=this.breedGrowthDuration();
        u.growthElapsed=u.growthDuration;
      }
    }
    get armyHealth(){return this.units.reduce((sum,u)=>{const maxHp=stats(u.tier,u.species).maxHp;return {current:sum.current+Math.max(0,Math.min(maxHp,u.hp)),max:sum.max+maxHp,living:sum.living+(u.hp>0?1:0),total:sum.total+1}},{current:0,max:0,living:0,total:0})}
    get capacity(){return Math.min(CONFIG.maxFarmCap,CONFIG.cap+7*(this.progress?.levels?.capacity||0))}
    breedCooldownDuration(){return CONFIG.breedCooldownSeconds/this.progress.rate("breed")}
    breedGrowthDuration(){return this.breedCooldownDuration()/2}
    abilityProgressionFor(unit){return this.scene==='raid'?this.raidRoster(unit?.ownerId)?.abilitySnapshot||null:this.playerProgression}
    highestSpeciesTiers(){const tiers=Array(CONFIG.maxSpecies).fill(0);for(const unit of this.units)if(!unit.isBattleOnlySummon)tiers[unit.species]=Math.max(tiers[unit.species],unit.tier);return tiers}
    investAbilityNode(abilityId,nodeId){const inCombat=this.running||this.farmBossEvent?.phase!=='idle';const result=purchaseAbilityNode(this.playerProgression,abilityId,nodeId,{location:this.scene,inCombat,highestSpeciesTier:this.highestSpeciesTiers()});if(result.ok)this.playerProgression=result.state;return result}
    resetAbilityTree(){const inCombat=this.running||this.farmBossEvent?.phase!=='idle';const result=resetAbilityProgression(this.playerProgression,{location:this.scene,inCombat});if(result.ok)this.playerProgression=result.state;return result}
    spawnLobProjectile(unit,action,shot,popcornConfig=null){
      if(this.projectiles.length>=CONFIG.maxRaidProjectiles)return null;
      const id=++this.projectileSerial;
      const projectile={id,owner:unit.id,species:unit.species,tier:unit.tier,path:structuredClone(action.path),elapsed:0,x:unit.x,y:unit.y,z:.45,radius:scaleAttackArea(.12,unit),height:.24,hit:false,attackMultiplier:shot.attackMultiplier??this.speciesAbilityDamageMultiplier(unit),shotIndex:shot.shotIndex??0};
      if(popcornConfig)Object.assign(projectile,{isPopcorn:true,popcornConfig:structuredClone(popcornConfig),landed:false,exploded:false,fuseRemaining:popcornConfig.fuseSeconds,damagedTargetIds:[]});
      this.projectiles.push(projectile);return projectile;
    }
    speciesAbilityDamageMultiplier(unit){return abilityProfile(unit.species).skillMultiplier}
    spawnChestnutSpikes(unit,action,config){
      if(this.projectiles.length+config.projectileCount>CONFIG.maxRaidProjectiles)return false;
      const cycleSeconds=abilityProfile(unit.species).windup+scaleAttackRecovery(abilityProfile(unit.species).recovery,unit),interval=getChestnutSpikeIntervalSeconds(config,cycleSeconds);
      if(!Number.isFinite(interval)||interval<=0)return false;
      unit.chestnutBasicCycles++;
      if(unit.chestnutBasicCycles%config.intervalBasicCycles!==0)return false;
      const angle=Math.atan2(action.target.y-unit.y,action.target.x-unit.x),angles=getChestnutSpikeFanAngles(config,angle),distance=Math.hypot(action.target.x-unit.x,action.target.y-unit.y),length=Math.max(abilityProfile(unit.species).range,distance)+this.boss.radius;
      for(let index=0;index<angles.length;index++){
        const a=angles[index],target={x:unit.x+Math.cos(a)*length,y:unit.y+Math.sin(a)*length,z:0},path=Ballistics.create({x:unit.x,y:unit.y,z:0},target,'punch');path.height=.7;
        this.projectiles.push({id:++this.projectileSerial,owner:unit.id,species:unit.species,tier:unit.tier,path,elapsed:0,x:unit.x,y:unit.y,z:0,radius:scaleAttackArea(.08,unit),height:.22,hit:false,attackMultiplier:config.projectileAttackMultiplier,projectileKind:'chestnut-spike',fanIndex:index});
      }
      return true;
    }
    handleUnitDeath(unit){
      if(!unit||unit.deathSplitHandled)return false;
      unit.deathSplitHandled=true;
      if(unit.isBattleOnlySummon){unit.down=0;this.units=this.units.filter(candidate=>candidate!==unit);return false}
      const inBattle=this.scene==='raid'?this.running:this.farmBossEvent?.phase==='fighting';
      const descriptors=createBeanSplitDescriptors({unit,progression:this.abilityProgressionFor(unit),inBattle});
      if(!descriptors.length)return false;
      if(this.units.length+descriptors.length>(this.scene==='raid'?CONFIG.maxRaidBattleUnits:CONFIG.maxFarmBattleUnits))return false;
      unit.splitUsedThisBattle=true;unit.down=CONFIG.corpseRecoverySeconds;
      for(let index=0;index<descriptors.length;index++){
        const desc=descriptors[index],angle=(index+.5)*Math.PI*2/descriptors.length,id=this.scene==='raid'?CONFIG.raidSummonIdBase+ ++this.raidSummonSerial:this.nextId++;
        const x=unit.x+Math.cos(angle)*.38,y=unit.y+Math.sin(angle)*.38,child=new Unit(id,desc.species,desc.tier,x,y);
        Object.assign(child,desc,{ownerId:unit.ownerId,farmId:unit.farmId,home:{x,y},hp:stats(desc.tier,desc.species).maxHp,down:0,growthElapsed:child.growthDuration,growth:CONFIG.matureMeals,meals:1,dropLanded:true,deathSplitHandled:false});
        this.units.push(child);
      }
      this.combat('pea-split',{unit:unit.id,ownerId:unit.ownerId,species:0,count:descriptors.length,x:unit.x,y:unit.y});
      return true;
    }
    cleanupBattleSummons(){this.units=this.units.filter(unit=>!unit.isBattleOnlySummon);this.projectiles=[];return true}
    triggerLandingShockwave(unit,action,config){
      const range=abilityProfile(unit.species).range*config.radiusMultiplier,point={x:unit.x,y:unit.y,z:0},distance=Math.hypot(unit.x-this.boss.x,unit.y-this.boss.y);
      this.effects.push({kind:'landing-shockwave',x:unit.x,y:unit.y,z:0,life:0,duration:.55,radius:range,owner:unit.id});
      if(this.boss.hp>0&&distance<=range+this.boss.radius){const blast={id:action.id,hit:false,attackKind:'kidney-shockwave'};this.damageBoss(unit,blast,point,{attackMultiplier:config.damageMultiplier,attackKind:'kidney-shockwave'});}
      this.combat('kidney-shockwave',{unit:unit.id,ownerId:unit.ownerId,species:2,x:unit.x,y:unit.y,radius:range,damageMultiplier:config.damageMultiplier});
    }
    senseEnemy(unit){
      if(unit.hp<=0||!unit.dropLanded)return null;
      const targets=MAP_ENEMY_TARGETS[this.scene]?.(this)||[];
      for(const target of targets)if(target&&target.hp>0&&Number.isFinite(target.x)&&Number.isFinite(target.y)&&Number.isFinite(target.radius)&&Math.hypot(unit.x-target.x,unit.y-target.y)<=unit.perceptionRange+target.radius+1e-9)return target;
      return null;
    }
    raidRoster(ownerId){return this.raidRosters.find(r=>r.ownerId===ownerId)||null}
    setRaidPlayers(players){
      if(this.scene!=='raid'||!Array.isArray(players)||players.length<1||players.length>CONFIG.maxRaidPlayers||players.some(p=>typeof p!=='string'||!p)||new Set(players).size!==players.length)return false;
      const live=[...players],ordered=this.raidDeploymentStarted?[...this.raidExpectedPlayers,...live.filter(id=>!this.raidExpectedPlayers.includes(id))]:live;if(ordered.length>CONFIG.maxRaidPlayers)return false;
      this.raidExpectedPlayers=ordered;if(!this.raidDeploymentStarted)this.raidRosters=this.raidRosters.filter(r=>live.includes(r.ownerId));
      this.raidRosters.sort((a,b)=>this.raidExpectedPlayers.indexOf(a.ownerId)-this.raidExpectedPlayers.indexOf(b.ownerId));return true;
    }
    raidTotal(){return this.raidRosters.reduce((n,r)=>n+r.troops.length,0)}
    raidRemaining(ownerId){const r=this.raidRoster(ownerId);return r?r.troops.reduce((n,t)=>n+(!t.deployed?1:0),0):0}
    registerRaidRoster(ownerId,entries,abilitySnapshot=createAbilityRuntimeSnapshot(createPlayerProgressionState()),settlement=null){
      if(this.scene!=='raid'||!this.raidExpectedPlayers.includes(ownerId)||this.raidRoster(ownerId)||!Array.isArray(entries)||entries.length>CONFIG.maxRaidPlayerUnits||this.raidTotal()+entries.length>CONFIG.maxRaidUnits)return false;
      if(!isValidAbilityRuntimeSnapshot(abilitySnapshot))return false;
      const hasSettlement=settlement!==null;
      if(hasSettlement&&(!settlement||typeof settlement!=='object'||typeof settlement.sessionId!=='string'||!settlement.sessionId.trim()||settlement.sessionId.length>128||!Number.isSafeInteger(settlement.runSequence)||settlement.runSequence<1||settlement.runSequence>1e12||settlement.encounterId!==settlement.runSequence))return false;
      const ids=new Set(),troops=[];for(const e of entries){if(!Array.isArray(e)||e.length!==3||!Number.isSafeInteger(e[0])||e[0]<1||e[0]>CONFIG.maxFarmUnitId||!Number.isInteger(e[1])||e[1]<0||e[1]>=CONFIG.maxSpecies||!Number.isInteger(e[2])||e[2]<1||e[2]>4||ids.has(e[0]))return false;ids.add(e[0]);troops.push({farmId:e[0],species:e[1],tier:e[2],deployed:false})}
      const orderKey=farmId=>{let h=(this.seed^Math.imul(farmId,0x9e3779b9))>>>0;for(let i=0;i<ownerId.length;i++){h^=ownerId.charCodeAt(i);h=Math.imul(h,0x01000193)}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return h>>>0};
      troops.sort((a,b)=>orderKey(a.farmId)-orderKey(b.farmId)||a.farmId-b.farmId);
      this.raidRosters.push({ownerId,troops,abilitySnapshot:structuredClone(abilitySnapshot),settlementSessionId:hasSettlement?settlement.sessionId:'',settlementRunSequence:hasSettlement?settlement.runSequence:0,settlementEncounterId:hasSettlement?settlement.encounterId:0,lastDeploySequence:0,buffUntil:0,buffReadyAt:0});this.raidRosters.sort((a,b)=>this.raidExpectedPlayers.indexOf(a.ownerId)-this.raidExpectedPlayers.indexOf(b.ownerId));return true;
    }
    deployNextRaidUnit(ownerId,sequence,x,y){
      if(this.scene!=='raid'||!this.raidExpectedPlayers.every(id=>this.raidRoster(id))||this.units.length>=CONFIG.maxRaidBattleUnits||!Number.isSafeInteger(sequence)||!Number.isFinite(x)||!Number.isFinite(y))return false;
      const roster=this.raidRoster(ownerId),troop=roster?.troops.find(t=>!t.deployed);if(!roster||sequence!==roster.lastDeploySequence+1||!troop||!ArenaGeometry.inside({x,y},'raid',.5))return false;
      const farmId=troop.farmId,slot=this.raidExpectedPlayers.indexOf(ownerId),troopIndex=roster.troops.indexOf(troop),id=(slot+1)*CONFIG.raidPlayerIdStride+troopIndex+1;if(this.units.some(u=>u.id===id))return false;
      const u=new Unit(id,troop.species,troop.tier,x,y),growthDuration=this.breedGrowthDuration();Object.assign(u,{ownerId,farmId,z:CONFIG.raid.dropHeight,vz:0,dropLanded:false,meals:1,growth:CONFIG.matureMeals,growthDuration,growthElapsed:growthDuration});troop.deployed=true;roster.lastDeploySequence=sequence;this.units.push(u);
      if(!this.raidDeploymentStarted){this.raidDeploymentStarted=true;this.running=true;this.encounter={outcome:'fighting',elapsed:0};this.boss.active=true;this.boss.phase='chase'}
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
        if(this.tryStartFarmBossEvent(tx,ty))continue;
        const angle=this.random()*Math.PI*2, sx=Math.cos(angle)*10.2, sy=Math.sin(angle)*7.0;
        const duration=.85+this.random()*.25, z=.3;
        this.food.push({x:sx,y:sy,z,vx:(tx-sx)/duration,vy:(ty-sy)/duration,vz:6*duration-z/duration,seed:this.random(),phase:"flight",tx,ty});
        this.emit("feed",tx,ty);
      }
    }
    tryStartFarmBossEvent(x,y){
      if(this.scene!=='farm'||this.boss.active||this.farmBossEvent.phase!=='idle'||this.random()>=CONFIG.farmBossEvent.spawnChance)return false;
      for(const unit of this.units)if(!unit.isBattleOnlySummon){unit.splitUsedThisBattle=false;unit.deathSplitHandled=false;unit.chestnutBasicCycles=0}
      this.boss=this.createBoss();Object.assign(this.boss,{x,y,z:CONFIG.raid.dropHeight,active:true});
      this.farmBossEvent={phase:'dropping',elapsed:0,outcome:'fighting',encounterId:this.nextBossEncounterId++,rewardStatus:'unresolved',rewardChance:0,rewardRoll:0,rewardUnitId:0};
      this.combat('farm-boss-drop',{x,y,z:this.boss.z});
      return true;
    }
    getBossAcquisitionChance({farmEvent=false}={}){return bossAcquisitionChance({farmEvent})}
    createBoss(){return {x:0,y:0,z:0,radius:CONFIG.raid.bossRadius,height:CONFIG.raid.bossHeight,hp:2400,maxHp:2400,active:false,phase:'resting',clock:0,angle:0,facing:0,flash:0,hit:new Set(),swings:0,basicCount:0,attackId:0,targetId:0,sweepClock:0,attackKind:'basic',startAngle:0,travel:0}}
    setScene(scene){
      if(scene===this.scene)return;
      this.projectiles=[];this.scene=scene;this.running=scene==='raid';this.encounter={outcome:this.running?'fighting':'idle',elapsed:0};this.farmBossEvent={phase:'idle',elapsed:0,outcome:'idle',encounterId:0,rewardStatus:'none',rewardChance:0,rewardRoll:0,rewardUnitId:0};this.boss=this.createBoss();
      const idMap=new Map(this.units.map((u,index)=>[u.id,scene==='raid'?1000000+index+1:(u.farmId||u.id)]));
      for(let i=0;i<this.units.length;i++){
        const u=this.units[i],oldMateId=u.mateId;if(scene==='raid'){u.home={x:u.x,y:u.y};u.farmId=u.farmId||u.id;u.ownerId='solo';u.id=1000000+i+1;u.dropLanded=true;const angle=i*2.3999632297,rad=10.5+(i%3)*.9;Object.assign(u,{x:Math.cos(angle)*rad,y:Math.sin(angle)*rad*.84})}else{u.id=u.farmId||u.id;u.ownerId='';u.farmId=0;u.dropLanded=true;Object.assign(u,u.home)}u.mateId=idMap.get(oldMateId)||0;
        u.ability=new AttackCycle(u);Object.assign(u,{z:0,vx:0,vy:0,vz:0,stun:0,down:0,hp:stats(u.tier,u.species).maxHp});
      }
      if(this.running){this.boss.active=true;this.boss.phase='chase';this.raidExpectedPlayers=['solo'];this.raidRosters=[{ownerId:'solo',troops:this.units.filter(u=>!u.isBattleOnlySummon).map(u=>({farmId:u.farmId,species:u.species,tier:u.tier,deployed:true})),abilitySnapshot:createAbilityRuntimeSnapshot(this.playerProgression),buffUntil:0,buffReadyAt:0}];this.raidDeploymentStarted=true}else{this.raidExpectedPlayers=['solo'];this.raidRosters=[];this.raidDeploymentStarted=false}
    }
    canBreedPair(a,b,requireContact=false){
      return a!==b&&!a.isBattleOnlySummon&&!b.isBattleOnlySummon&&a.breedingEligible!==false&&b.breedingEligible!==false&&a.hp>0&&b.hp>0&&a.species===b.species&&a.mature&&b.mature&&a.fed&&b.fed&&a.cooldown<=0&&b.cooldown<=0&&this.units.includes(a)&&this.units.includes(b)&&(!requireContact||Math.hypot(a.x-b.x,a.y-b.y)<=a.radius+b.radius+.2);
    }
    releaseMate(unit){
      const mate=this.units.find(candidate=>candidate.id===unit.mateId);unit.mateId=0;if(mate&&mate.mateId===unit.id)mate.mateId=0;
    }
    reconcileMateReservations(){
      for(const unit of this.units){
        if(!unit.mateId)continue;
        const mate=this.units.find(candidate=>candidate.id===unit.mateId);
        if(this.mode!=='breed'||!mate||mate.mateId!==unit.id||!this.canBreedPair(unit,mate))this.releaseMate(unit);
      }
    }
    findOrReserveMate(unit){
      if(this.mode!=='breed'||!unit.mature||!unit.fed||unit.cooldown>0||unit.hp<=0||this.senseEnemy(unit)){this.releaseMate(unit);return null}
      if(unit.mateId){const current=this.units.find(candidate=>candidate.id===unit.mateId);if(current&&current.mateId===unit.id&&this.canBreedPair(unit,current))return current;this.releaseMate(unit)}
      const candidates=this.units.filter(candidate=>candidate!==unit&&!candidate.mateId&&this.canBreedPair(unit,candidate)&&!this.senseEnemy(candidate));
      candidates.sort((a,b)=>(a.tier===unit.tier?0:1)-(b.tier===unit.tier?0:1)||Math.hypot(a.x-unit.x,a.y-unit.y)-Math.hypot(b.x-unit.x,b.y-unit.y));
      const mate=candidates[0];if(!mate)return null;unit.mateId=mate.id;mate.mateId=unit.id;return mate;
    }
    hasEligibleSameTierBreedPair(){
      if(this.mode!=="breed"||this.units.length>=this.capacity)return false;
      for(let i=0;i<this.units.length;i++)for(let j=i+1;j<this.units.length;j++){const a=this.units[i],b=this.units[j];if(a.tier===b.tier&&this.canBreedPair(a,b)&&(!a.mateId&&!b.mateId||a.mateId===b.id&&b.mateId===a.id))return true}
      return false;
    }
    canMergePair(a,b,{requireContact=false,requireNoEnemy=false}={}){
      if(!a||!b||a===b||a.isBattleOnlySummon||b.isBattleOnlySummon||a.mergeEligible===false||b.mergeEligible===false||a.species!==b.species||a.tier!==b.tier||a.tier>=CONFIG.maxTier||a.hp<=0||b.hp<=0||!a.mature||!b.mature||a.cooldown>0||b.cooldown>0||!this.units.includes(a)||!this.units.includes(b))return false;
      // A sleeping unit is still owned and counts toward species protection, but
      // canMergePair's health checks keep it out of actual merge candidates.
      const speciesCount=this.units.reduce((count,u)=>count+(!u.isBattleOnlySummon&&u.species===a.species?1:0),0);
      if(speciesCount<=2)return false;
      if(requireNoEnemy&&(this.senseEnemy(a)||this.senseEnemy(b)))return false;
      return !requireContact||Math.hypot(a.x-b.x,a.y-b.y)<=a.radius+b.radius+.2;
    }
    selectMergeTask(){
      if(this.mode!=="merge"||this.scene!=="farm"||this.mergeTask)return;
      const counts=new Map();
      for(const u of this.units)counts.set(u.species,(counts.get(u.species)||0)+1);
      const eligible=this.units.filter(u=>!u.isBattleOnlySummon&&u.mergeEligible!==false&&u.hp>0&&u.mature&&u.cooldown<=0&&u.tier<CONFIG.maxTier&&counts.get(u.species)>2&&!this.senseEnemy(u));
      let pair=null;
      for(let i=0;i<eligible.length;i++)for(let j=i+1;j<eligible.length;j++){
        const a=eligible[i],b=eligible[j];if(a.species!==b.species||a.tier!==b.tier)continue;
        const first=a.id<b.id?a:b,second=first===a?b:a;
        const candidate={tier:a.tier,distance:(a.x-b.x)**2+(a.y-b.y)**2,aId:first.id,bId:second.id};
        if(!pair||candidate.tier<pair.tier||candidate.tier===pair.tier&&(candidate.distance<pair.distance||candidate.distance===pair.distance&&(candidate.aId<pair.aId||candidate.aId===pair.aId&&candidate.bId<pair.bId)))pair=candidate;
      }
      if(pair)this.mergeTask={phase:"approach",aId:pair.aId,bId:pair.bId,elapsed:0,duration:CONFIG.mergeAnimationSeconds};
    }
    advanceMergeTask(dt){
      if(this.mode!=="merge"||this.scene!=="farm"){this.mergeTask=null;return}
      if(this.mergeTask?.phase==="animation"){
        this.mergeTask.elapsed=Math.min(this.mergeTask.duration,this.mergeTask.elapsed+dt);
        if(this.mergeTask.elapsed>=this.mergeTask.duration-1e-9)this.mergeTask=null;
        return;
      }
      if(this.mergeTask?.phase==="approach"){
        const a=this.units.find(u=>u.id===this.mergeTask.aId),b=this.units.find(u=>u.id===this.mergeTask.bId);
        // Combat pauses an otherwise valid pair; death, invalid tiers, or removed units cancel it.
        if(!this.canMergePair(a,b))this.mergeTask=null;
      }
      if(!this.mergeTask)this.selectMergeTask();
    }
    resolveMergeTaskAfterMovement(){
      const task=this.mergeTask;if(task?.phase!=="approach")return false;
      const a=this.units.find(u=>u.id===task.aId),b=this.units.find(u=>u.id===task.bId);
      if(!this.canMergePair(a,b,{requireContact:true,requireNoEnemy:true}))return false;
      return this.pair(a,b,true);
    }
    pair(a, b, priorityResolved=false) {
      if(a===b||a.hp<=0||b.hp<=0||a.down>0||b.down>0||a.species!==b.species||!a.mature||!b.mature||a.cooldown>0||b.cooldown>0||!this.units.includes(a)||!this.units.includes(b)||Math.hypot(a.x-b.x,a.y-b.y)>a.radius+b.radius+.2||this.senseEnemy(a)||this.senseEnemy(b))return false;
      if(a.isBattleOnlySummon||b.isBattleOnlySummon)return false;
      if (this.mode === "merge") {
        if (!this.canMergePair(a,b,{requireNoEnemy:true})) return false;
        const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
        this.releaseMate(a);this.releaseMate(b);
        this.units = this.units.filter((u2) => u2 !== a && u2 !== b);
        const u = this.spawn(a.species, a.tier + 1, x, y);
        u.meals = 1;
        u.growth = 3;
        u.growthDuration=this.breedGrowthDuration();
        u.growthElapsed=u.growthDuration;
        u.cooldown = 4 / this.progress.rate("merge");
        u.cooldownDuration = u.cooldown;
        this.mergeTask = {phase:"animation",aId:0,bId:0,elapsed:0,duration:CONFIG.mergeAnimationSeconds};
        this.metrics.merges++;
        this.emit("merge", x, y, 1);
      } else {
        if (!this.canBreedPair(a,b,true)||this.units.length>=this.capacity||a.mateId&&a.mateId!==b.id||b.mateId&&b.mateId!==a.id||!priorityResolved&&a.tier!==b.tier&&this.hasEligibleSameTierBreedPair()) return false;
        a.mateId=b.id;b.mateId=a.id;
        const child = this.spawn(a.species, 1, (a.x + b.x) / 2, (a.y + b.y) / 2);
        child.growthDuration=this.breedGrowthDuration();
        child.vz = 3;
        a.meals = b.meals = 0;
        a.cooldown = b.cooldown = this.breedCooldownDuration();
        a.cooldownDuration = b.cooldownDuration = a.cooldown;
        this.releaseMate(a);
        this.metrics.births++;
        this.emit("birth", child.x, child.y, 0.7);
      }
      return true;
    }
    step(dt) {

      this.time += dt;
      grantPendingBossAcquisitions(this);
      if(this.scene==='raid'&&this.running)this.encounter.elapsed+=dt;
      this.advanceMergeTask(dt);
      this.effects = this.effects.filter((e) => (e.life += dt) < (Number.isFinite(e.duration)?e.duration:1));
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
      this.reconcileMateReservations();
      for (const u of units) {
        if(u.hp<=0){
          if(!u.deathSplitHandled)this.handleUnitDeath(u);
          if(u.isBattleOnlySummon){u.down=0;continue}
          if(u.down<=0){u.down=CONFIG.corpseRecoverySeconds;u.ability.interrupt()}
          if(this.scene==='farm'){u.down=Math.max(0,u.down-dt);if(u.down<1e-9)u.down=0}
          const oldZ=u.z;u.integrate(dt);
          if(this.scene==='raid'&&this.running&&u.z===0&&u.vz===0)u.vx=u.vy=0;
          if(oldZ>0&&u.z===0){
            this.metrics.landings++;
            if(this.scene==='raid')this.combat('unit-land',{unit:u.id,x:u.x,y:u.y,z:0,strength:Math.min(1,Math.hypot(u.vx,u.vy)/8)});
            else if(Math.hypot(u.vx,u.vy)>1)this.emit('land',u.x,u.y);
          }
          if(this.scene==='farm'&&u.down===0){
            const maxHp=stats(u.tier,u.species).maxHp;this.releaseMate(u);Object.assign(u,{hp:maxHp,down:0,z:0,vx:0,vy:0,vz:0,stun:0,flash:0,bounce:0,angle:0,deathSplitHandled:false});u.ability=new AttackCycle(u);this.combat('unit-recover',{unit:u.id,x:u.x,y:u.y});
          }
          continue;
        }
        u.age += dt;
        const unitStats=stats(u.tier,u.species);
        if(u.hp>0&&unitStats.regen>0)applyHealing(u,unitStats.regen*dt,unitStats);
        if(!u.mature){u.growthElapsed=Math.min(u.growthDuration,u.growthElapsed+dt);u.growth=Math.min(CONFIG.matureMeals,Math.floor(CONFIG.matureMeals*u.growthElapsed/u.growthDuration+1e-9))}

        u.cooldown = Math.max(0, u.cooldown - dt);
        if(u.cooldown<1e-9){u.cooldown=0;u.cooldownDuration=0;}

        const enemy=this.senseEnemy(u);
        if(enemy)this.raidUnit(u,dt,enemy);
        else if(u.hp>0&&!u.isBattleOnlySummon){if(u.ability.phase!=='idle'){u.ability.interrupt();u.ability.update(this,dt)}this.farmUnit(u,dt)}
        else if(this.scene==='raid'&&this.running)this.raidUnit(u,dt,null);
        const oldZ = u.z,oldPosition={x:u.x,y:u.y,z:u.z};
        u.integrate(dt);
        if(this.scene==="raid"&&u.hp<=0&&u.z===0&&u.vz===0){u.vx=u.vy=0;}
        if(enemy)u.ability.afterMove(this,oldPosition);
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
        if(this.mode==="breed"){
          for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++)if(units[i].tier===units[j].tier)this.pair(units[i],units[j],true);
          if(!this.hasEligibleSameTierBreedPair())for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++)if(units[i].tier!==units[j].tier)this.pair(units[i],units[j],true);
        }else this.resolveMergeTaskAfterMovement();
      }
      if(this.scene==='farm'&&this.farmBossEvent.phase!=='idle'){
        if(this.boss.active)this.updateProjectiles(dt);
        this.updateBoss(dt);
        if(this.boss.active)for(const u of this.units)this.separateBoss(u);
      }else if(this.boss.active){this.updateProjectiles(dt);this.updateBoss(dt);for(const u of this.units)this.separateBoss(u)}
      this.units=this.units.filter(unit=>!unit.isBattleOnlySummon||unit.hp>0);
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
    avoidNearbyFood(u,dt){
      const radius=1.25;let pushX=0,pushY=0,strongest=0,nearest=null,nearestDistance=Infinity;
      for(const food of this.food){
        if(food.phase!=="grounded")continue;
        let dx=u.x-food.x,dy=u.y-food.y,distance=Math.hypot(dx,dy);
        if(distance>=radius)continue;
        const strength=1-distance/radius,weight=strength*strength;
        if(distance<nearestDistance){nearestDistance=distance;nearest=food}
        strongest=Math.max(strongest,strength);
        if(distance>1e-6){pushX+=dx/distance*weight;pushY+=dy/distance*weight}
      }
      if(!nearest)return false;
      let magnitude=Math.hypot(pushX,pushY);
      if(magnitude<1e-4){
        if(nearestDistance>1e-6){pushX=u.x-nearest.x;pushY=u.y-nearest.y;magnitude=nearestDistance}
        else{const angle=(u.seed+(nearest.seed||0))*2.3999632297;pushX=Math.cos(angle);pushY=Math.sin(angle);magnitude=1}
      }
      const awayX=pushX/magnitude,awayY=pushY/magnitude;
      let desiredX=Math.sin(this.time*.18+u.seed)*7.4-u.x;
      let desiredY=Math.cos(this.time*.16+u.seed)*5.3-u.y;
      const desiredLength=Math.hypot(desiredX,desiredY)||1;
      desiredX/=desiredLength;desiredY/=desiredLength;
      const towardFood=desiredX*awayX+desiredY*awayY;
      if(towardFood<0){desiredX-=towardFood*awayX;desiredY-=towardFood*awayY}
      let moveX=desiredX+awayX*(.5+1.5*strongest),moveY=desiredY+awayY*(.5+1.5*strongest),moveLength=Math.hypot(moveX,moveY);
      if(moveLength<1e-4){moveX=awayX;moveY=awayY;moveLength=1}
      this.steer(u,u.x+moveX/moveLength,u.y+moveY/moveLength,dt,scaleMoveSpeed(.75,u));
      return true;
    }
    farmUnit(u, dt) {
      if (u.stun > 0 || u.z > 0.1) return;
      if(!u.mature||u.cooldown>0){if(!this.avoidNearbyFood(u,dt))this.steer(u,Math.sin(this.time*.18+u.seed)*7.4,Math.cos(this.time*.16+u.seed)*5.3,dt,scaleMoveSpeed(.75,u));return}
      if(this.mode==="merge") {
        const task=this.mergeTask;
        if(task?.phase==="approach"&&(u.id===task.aId||u.id===task.bId)){const partner=this.units.find(candidate=>candidate.id===(u.id===task.aId?task.bId:task.aId));if(partner&&u.cooldown<=0)this.steer(u,partner.x,partner.y,dt,scaleMoveSpeed(2.2,u));return}
        this.steer(u,Math.sin(this.time*.18+u.seed)*7.4,Math.cos(this.time*.16+u.seed)*5.3,dt,scaleMoveSpeed(.75,u));return;
      }
      let target = null, best = Infinity;
      if (this.mode === "breed" && !u.fed) {
        for (const f of this.food) {
          const d = Math.hypot(f.x - u.x, f.y - u.y);
          if (f.phase === "grounded" && d < best) {
            best = d;
            target = f;
          }
        }
        if (target && best < 0.42) {
          this.food.splice(this.food.indexOf(target), 1);
          u.meals = 1;
          u.vz = 2;
          this.emit("eat", u.x, u.y, 0.5);
          target = null;
        }
      } else if (this.mode==="breed"&&u.cooldown===0) target=this.findOrReserveMate(u);
      else if (u.cooldown === 0) {
        const candidates=this.units.filter(p=>p!==u&&p.hp>0&&p.down<=0&&p.species===u.species&&p.mature&&p.cooldown<=0&&(this.mode!=="breed"||p.fed)&&(this.mode!=="merge"||p.tier===u.tier&&u.tier<CONFIG.maxTier));
        for (const p of candidates) {
          const d = Math.hypot(p.x - u.x, p.y - u.y);
          if (d < best) {
            best = d;
            target = p;
          }
        }
      }
      const hasDesignatedMate=this.mode==="breed"&&u.fed&&target&&this.units.includes(target);
      if(this.mode==="breed"&&u.fed&&!hasDesignatedMate&&this.avoidNearbyFood(u,dt))return;
      if (target) this.steer(u, target.x, target.y, dt, scaleMoveSpeed(2.2 * (target.phase === "grounded" ? this.progress.rate("growth") : 1),u));
      else this.steer(u, Math.sin(this.time * 0.18 + u.seed) * 7.4, Math.cos(this.time * 0.16 + u.seed) * 5.3, dt, scaleMoveSpeed(0.75,u));
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
      const inward=u.vx*nx+u.vy*ny;if(inward<0){u.vx-=inward*nx;u.vy-=inward*ny}this.boundBody(u,this.scene,u.radius);
    }
    combatEvent(kind,u,action){
      this.combatLog.push({kind,id:action?.id??0,unit:u.id,species:u.species,time:this.time,x:u.x,y:u.y,z:u.z});if(this.combatLog.length>240)this.combatLog.shift();
      if(kind==="launch"){
        this.combat("attack-launch",{species:u.species,unit:u.id,x:u.x,y:u.y,z:u.z,attackKind:abilityProfile(u.species).kind});
        if(u.species===3){const config=getChestnutSpikeConfig(this.abilityProgressionFor(u),u.tier);if(config)this.spawnChestnutSpikes(u,action,config)}
      }
    }
    damageBoss(u,action,point,{lifestealSource=u,attackMultiplier=null,attackKind=null}={}){
      if(action.hit||this.boss.hp<=0)return false;action.hit=true;
      const spec=abilityProfile(u.species),roster=this.raidRoster(u.ownerId),buffed=!!roster&&this.time<roster.buffUntil;
      const hpBefore=this.boss.hp,maxHp=this.boss.maxHp;
      const hpRatio=Number.isFinite(hpBefore)&&Number.isFinite(maxHp)&&maxHp>0?clamp(hpBefore/maxHp,0,1):1;
      const armor=(1-hpRatio)*100;
      const attackerStats=stats(u.tier,u.species);
      const damageMultiplier=Number.isFinite(attackMultiplier)?attackMultiplier:spec.skillMultiplier,kind=attackKind||spec.kind;
      const rawDamage=attackerStats.attackPower*damageMultiplier*(buffed?CONFIG.raid.buffDamage:1);
      const damage=applyDamageToTargets(lifestealSource,[this.boss],{rawDamage,armorForTarget:()=>armor,roll:()=>this.random()});
      this.boss.flash=.13;
      const dx=point.x-this.boss.x,dy=point.y-this.boss.y,d=Math.hypot(dx,dy)||1;
      this.combat('boss-hit',{unit:u.id,ownerId:u.ownerId,species:u.species,attackKind:kind,buffed,critical:damage.critical,x:this.boss.x+dx/d*this.boss.radius,y:this.boss.y+dy/d*this.boss.radius,z:clamp(point.z+.2,.2,this.boss.height),nx:dx/d,ny:dy/d,strength:damageMultiplier*(buffed?CONFIG.raid.buffDamage:1)*(damage.critical?attackerStats.critMultiplier:1)});
      this.combatEvent('damage',u,action);this.progress.record('hit');return true;
    }

    explodePopcorn(kernel){
      if(!kernel?.isPopcorn||kernel.exploded)return false;
      const queue=[kernel],queued=new Set();let triggered=false;
      while(queue.length){
        const current=queue.shift();if(!current?.isPopcorn||current.exploded||queued.has(current.id))continue;
        queued.add(current.id);current.exploded=true;current.explosionLife=0;current.hit=true;triggered=true;
        const config=current.popcornConfig,center={x:current.x,y:current.y,z:0},range=config.radius;
        this.effects.push({kind:'popcorn-explosion',x:current.x,y:current.y,z:0,life:0,duration:.5,radius:range,owner:current.owner});
        if(!current.damagedTargetIds.includes('boss')&&Math.hypot(current.x-this.boss.x,current.y-this.boss.y)<=range+this.boss.radius){
          const unit=this.units.find(candidate=>candidate.id===current.owner)||{id:current.owner,ownerId:current.ownerId||'',species:current.species,tier:current.tier,x:current.x,y:current.y,z:0};
          const action={id:current.id,hit:false,attackKind:'corn-popcorn-explosion'};
          this.damageBoss(unit,action,center,{attackMultiplier:config.damageMultiplier,attackKind:'corn-popcorn-explosion'});
          current.damagedTargetIds.push('boss');
        }
        for(const other of this.projectiles){if(other===current||!other.isPopcorn||other.exploded||!other.landed||queued.has(other.id))continue;if(Math.hypot(other.x-current.x,other.y-current.y)<=range+other.radius)queue.push(other)}
        this.combat('popcorn-explosion',{unit:current.owner,ownerId:current.ownerId||'',species:1,x:current.x,y:current.y,radius:range});
      }
      return triggered;
    }

    updateProjectiles(dt){
      for(const p of this.projectiles){
        if(p.isPopcorn&&p.landed){if(!p.exploded)p.fuseRemaining=Math.max(0,p.fuseRemaining-dt);else p.explosionLife=(p.explosionLife||0)+dt;continue}
        const old={x:p.x,y:p.y,z:p.z};p.elapsed+=dt;Object.assign(p,Ballistics.sample(p.path,p.elapsed/p.path.duration));
        const hit=ArenaGeometry.sweep(old,p,p.radius,p.height,this.boss);
        if(p.isPopcorn&&(hit||p.elapsed>=p.path.duration)){
          if(hit)Object.assign(p,{x:hit.x,y:hit.y,z:0});else p.z=0;
          p.landed=true;p.fuseRemaining=p.popcornConfig.fuseSeconds;
          this.effects.push({kind:'popcorn-kernel-impact',x:p.x,y:p.y,z:0,life:0,duration:.25,radius:p.radius,owner:p.owner});
        }else if(hit){Object.assign(p,{x:hit.x,y:hit.y,z:hit.z});const source=this.units.find(u=>u.id===p.owner),impactUnit=source||{id:p.owner,ownerId:p.ownerId||'',species:p.species,tier:p.tier,x:p.x,y:p.y,z:p.z};this.damageBoss(impactUnit,p,hit,{lifestealSource:source||impactUnit,attackMultiplier:p.attackMultiplier,attackKind:p.projectileKind||'lob'})}
        else if(p.elapsed>=p.path.duration){p.z=0;this.emit(p.projectileKind==='chestnut-spike'?'spike-land':'shell-land',p.x,p.y)}
      }
      for(const p of this.projectiles){
        if(!p.isPopcorn||!p.landed||p.exploded)continue;
        const touching=this.projectiles.some(other=>other!==p&&other.isPopcorn&&other.landed&&!other.exploded&&Math.hypot(other.x-p.x,other.y-p.y)<=other.radius+p.radius);
        if(p.fuseRemaining>0&&!touching)continue;
        this.explodePopcorn(p);
      }
      this.projectiles=this.projectiles.filter(p=>p.isPopcorn?!p.exploded||p.explosionLife<.5:!p.hit&&p.elapsed<p.path.duration);this.boss.flash=Math.max(0,(this.boss.flash||0)-dt);
    }

    raidUnit(u,dt,enemy=this.boss){
      if(!u.dropLanded)return;
      if(u.hp<=0){u.down=CONFIG.corpseRecoverySeconds;u.ability.interrupt();return}
      if(u.ability.update(this,dt)||u.stun>0||u.z>.1)return;
      if(!enemy||enemy!==this.boss)return;
      const b=enemy,spec=abilityProfile(u.species),dx=u.x-b.x,dy=u.y-b.y,n=Math.hypot(dx,dy)||1;
      // Hold the current firing bearing. Ranged troops retreat from a boss that closes in;
      // they never follow a rotating slot through its body to reach the opposite side.
      const stand=b.radius+spec.range+(u.tier-1)*.12,min=stand-.55,max=stand+.55;
      if(n>max||(spec.kind==='lob'&&n<min)){
        const slot=ArenaGeometry.clamp({x:b.x+dx/n*stand,y:b.y+dy/n*stand},this.scene,u.radius);
        this.steer(u,slot.x,slot.y,dt,scaleMoveSpeed(4.1,u));return;
      }
      u.vx=u.vy=0;
      const target=spec.kind==='lob'?{x:b.x,y:b.y}:{x:b.x+dx/n*(b.radius+u.radius-.16),y:b.y+dy/n*(b.radius+u.radius-.16)};
      u.ability.begin(this,target);
    }
    finish(outcome){
      if(!this.running)return;this.running=false;this.boss.active=false;this.encounter.outcome=outcome;this.projectiles=[];this.boss.phase='resting';
      for(const u of this.units)u.ability.interrupt();this.cleanupBattleSummons();this.combat(outcome,{x:this.boss.x,y:this.boss.y,z:0});
    }
    finishFarmBossEvent(outcome){
      if(this.scene!=='farm'||this.farmBossEvent.phase!=='fighting')return false;
      this.cleanupBattleSummons();
      this.boss.active=false;this.boss.phase='resting';this.boss.clock=0;this.projectiles=[];
      const encounterId=this.farmBossEvent.encounterId;
      this.farmBossEvent={phase:'celebrating',elapsed:0,outcome,encounterId,rewardStatus:'none',rewardChance:0,rewardRoll:0,rewardUnitId:0};
      for(const u of this.units)if(u.hp>0)u.ability.interrupt();
      if(outcome==='victory'){
        const settlement=settleBossKill(this,{encounterId,source:'farm',species:3,tier:1,x:this.boss.x,y:this.boss.y});
        const reward=settlement.receipt;
        this.combat('farm-boss-xp',{encounterId,xp:settlement.xpAwarded,levelsGained:settlement.levelsGained,pointsAwarded:settlement.pointsAwarded});
        this.combat('farm-boss-reward',{acquired:reward.status==='granted',pending:reward.status==='pending',species:reward.species,tier:reward.tier,chance:reward.chance,roll:reward.roll,encounterId});
      }
      this.combat(outcome==='victory'?'farm-boss-victory':'farm-boss-defeat',{x:this.boss.x,y:this.boss.y,z:0});
      return true;
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
      b.hit.add(u.id);const dx=u.x-b.x,dy=u.y-b.y,n=Math.hypot(dx,dy)||1;u.knock(dx/n,dy/n,heavy?13:8.5,heavy?10.2:7.2,b);applyDamageToTargets(null,[u],{rawDamage:heavy?10:8,sourceKind:'enemy'});if(u.hp===0){u.down=u.isBattleOnlySummon?0:CONFIG.corpseRecoverySeconds;this.handleUnitDeath(u)}
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
      if(this.scene==='farm'&&this.farmBossEvent.phase!=='idle'){
        const event=this.farmBossEvent;
        if(event.phase==='dropping'){
          event.elapsed+=dt;b.z=Math.max(0,CONFIG.raid.dropHeight-.5*CONFIG.gravity*event.elapsed*event.elapsed);
          if(b.z===0){event.phase='fighting';event.elapsed=0;b.phase='chase';this.combat('farm-boss-land',{x:b.x,y:b.y,z:0})}
          return;
        }
        if(event.phase==='fighting'){
          event.elapsed+=dt;
          if(b.hp<=0){this.finishFarmBossEvent('victory');return}
          if(!this.units.some(u=>u.hp>0&&u.dropLanded)){this.finishFarmBossEvent('defeat');return}
        }else if(event.phase==='celebrating'){
          event.elapsed+=dt;b.clock=event.elapsed;
          const duration=event.outcome==='defeat'?CONFIG.farmBossEvent.celebrationSeconds:CONFIG.farmBossEvent.fadeSeconds;
          if(event.elapsed>=duration){event.phase='fading';event.elapsed=0;b.clock=0}
          return;
        }else if(event.phase==='fading'){
          event.elapsed+=dt;b.clock=event.elapsed;
          if(event.elapsed>=CONFIG.farmBossEvent.fadeSeconds){this.farmBossEvent={phase:'idle',elapsed:0,outcome:'idle',encounterId:0,rewardStatus:'none',rewardChance:0,rewardRoll:0,rewardUnitId:0};this.boss=this.createBoss()}
          return;
        }
      }
      if(!b.active)return;
      if(b.hp<=0){if(this.running)this.finish('victory');else{b.active=false;b.phase='resting'}return}
      if(this.running&&this.raidRosters.length&&this.raidRosters.every(r=>r.troops.every(t=>t.deployed))&&!this.units.some(u=>u.hp>0)){this.finish('defeat');return}
      const living=this.units.filter(u=>u.hp>0&&u.dropLanded);if(!living.length)return;
      if(b.phase==='resting')b.phase='chase';
      b.clock+=dt;b.sweepClock+=dt;
      if(b.phase==='chase'){
        let target=living.find(u=>u.id===b.targetId);if(!target){target=living[(b.basicCount*7+b.swings*11)%living.length];b.targetId=target.id}
        const dx=target.x-b.x,dy=target.y-b.y,d=Math.hypot(dx,dy)||1;b.facing=Math.atan2(dy,dx);b.angle=b.facing;
        if(b.sweepClock>=c.sweepInterval){this.beginBossAttack('sweep',target);return}
        if(d<=c.basicReach+c.weaponRadius*.35&&target.z<1.6&&b.clock>.35){this.beginBossAttack('basic',target);return}
        if(d>b.radius+target.radius+.2){const old={x:b.x,y:b.y};b.x+=dx/d*c.chaseSpeed*dt;b.y+=dy/d*c.chaseSpeed*dt;this.boundBody(b,this.scene,b.radius+.25);b.travel+=Math.hypot(b.x-old.x,b.y-old.y)}
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
