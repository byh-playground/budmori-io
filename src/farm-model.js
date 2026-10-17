const {SeededPRNG}=globalThis.BloomGamekitDeterministic;
import {resolveUnitStats,applyDamageToTargets,applyHealing,resolveStatusDuration,resolveKnockback,scaleMoveSpeed,scaleAttackRecovery,scaleAttackArea} from './unit-stats.js';
import {UNIT_ABILITY_PROFILES as ATTACK_TYPES,abilityProfile} from './unit-abilities.js';
import {bossAcquisitionChance, bossStageStats, settleBossKill, grantPendingBossAcquisitions} from './boss-rewards.js';
import {createFarmBossProgress} from './farm-boss-stages.js';
import {SPECIES_COUNT} from './species-catalog.js';
import {createPlayerProgressionState} from './player-progression.js';
import {purchaseAbilityNode, purchaseFarmUpgrade, resetAbilityProgression} from './ability-tree.js';
import {createAbilityRuntimeSnapshot, isValidAbilityRuntimeSnapshot} from './ability-state.js';
import {FARM_UPGRADE_NODES, farmUpgradeRate, getAutoTapSeconds, getBreedCooldownSeconds, getFarmCapacity, getMergeCooldownSeconds} from './farm-upgrades.js';
import {createBeanSplitDescriptors, getCornBurstConfig, createCornBurstShotSchedule, getPopcornExplosionConfig, getChestnutSpikeConfig, getChestnutSpikeFanAngles, getChestnutSpikeIntervalSeconds, getContinuousLeapConfig, shouldResetLeapCooldown, getLandingShockwaveConfig, getRiceHarvestMultiplier, getWheatCommandConfig, refreshWheatCommandBuff, getBarleyArmorBreakConfig, refreshBarleyArmorBreak, effectiveBarleyArmor} from './species-abilities.js';
import {MAX_BEAN_SPLIT_CHILDREN,getPeanutAssaultConfig,getWalnutGuardConfig,isWalnutGuardActive} from './species-abilities.js';
import {createPeanutStrikeSchedule,resolveStrikeMask,PEANUT_BASE_STRIKE} from './unit-combat-patterns.js';
import {MAX_UNIT_TIER, MAX_GRADE_MATERIAL_COUNT, mergeMaterialCostForTier} from './unit-grades.js';
import {BOSS_PATTERN_IDS,BOSS_PATTERN_CONFIG,BOSS_AIM_TURN_RATE,createBossPatternRuntime,chooseBossPattern} from './boss-patterns.js';
import {FACTION_CONFIG,hasFaction,areOpposingFactions} from './factions.js';
import {FixedSpatialGrid} from './spatial-grid.js';
const presentationClocks=new WeakMap();
const presentationEventTimes=new WeakMap();
export function presentationEventTimeMs(event){return presentationEventTimes.get(event)??(Number.isFinite(event?.time)?event.time*1000:0)}
export function bindPresentationClock(world,clock){if(clock)presentationClocks.set(world,clock);else presentationClocks.delete(world)}
  // sim.js
  const BREED_COOLDOWN_SECONDS=10;
  const unitRadiusForTier=tier=>.25+.055*tier;
  var CONFIG = Object.freeze({ factions:FACTION_CONFIG, cap: 50, maxFarmCap:100, maxFarmBattleUnits:100*(1+MAX_BEAN_SPLIT_CHILDREN)+10, maxFarmUnitId:999999999, maxRaidPlayerUnits:100, maxRaidPlayers:4, raidPlayerIdStride:1000000, maxRaidUnits:400, maxRaidBattleUnits:400*(1+MAX_BEAN_SPLIT_CHILDREN)+10, maxRaidProjectiles:400*(1+MAX_BEAN_SPLIT_CHILDREN)*4+40, raidSummonIdBase:4000000+100+1, bossSummonIdBase:5000000, maxSpecies:SPECIES_COUNT, maxBossSummons:10, maxUnitRadius:unitRadiusForTier(MAX_UNIT_TIER), maxTier: MAX_UNIT_TIER, maxMergeMaterials:MAX_GRADE_MATERIAL_COUNT, starterSeconds: 60, breedCooldownSeconds: BREED_COOLDOWN_SECONDS, breedGrowthSeconds: BREED_COOLDOWN_SECONDS/2, mergeAnimationSeconds:.85, matureMeals: 3, corpseRecoverySeconds:60, farmBossEvent:Object.freeze({spawnChance:.01,fadeSeconds:.5,celebrationSeconds:1}), gravity: 19, fixedStep: 1 / 120, raid:Object.freeze({radiusX:23,radiusY:17,perceptionRange:18,bossRadius:4.4,bossHeight:5.2,basicReach:6.2,sweepReach:6.5,weaponRadius:.85,chaseSpeed:2.65,dropHeight:3,buffDuration:3,buffCooldown:12,buffDamage:1.25}) });
function bossAttackArea(boss,unitRadius=0){
  const action=boss.patternRuntime?.active;if(!action)return null;
  const config=BOSS_PATTERN_CONFIG[action.id];if(!config)return null;
  const progress=clamp(action.phaseElapsed/(action.phase==='windup'?config.windup:config.active||1),0,1),locked=!!action.locked;
  if(action.id==='attack.sweep-360')return {kind:'sweep',x:boss.x,y:boss.y,width:CONFIG.raid.weaponRadius+Math.max(0,unitRadius),sweepRadius:config.reach,outerRadius:config.reach+CONFIG.raid.weaponRadius,startAngle:0,progress:action.phase==='windup'?1:1,active:action.phase==='active',patternId:action.id,locked};
  if(action.id==='attack.front-slam')return {kind:'sector',x:boss.x,y:boss.y,angle:action.aim??boss.angle,reach:config.reach,sector:config.sector,progress,active:action.phase==='active',patternId:action.id,locked};
  if(action.id==='attack.charge')return {kind:'charge',x:action.start?.x??boss.x,y:action.start?.y??boss.y,endX:boss.x,endY:boss.y,angle:action.aim??boss.angle,reach:config.reach,width:boss.radius,progress,active:action.phase==='active',patternId:action.id,locked};
  if(action.id==='attack.leap-slam')return {kind:'leap',x:boss.x,y:boss.y,targetX:action.target?.x??boss.x,targetY:action.target?.y??boss.y,reach:config.landingRadius,progress,active:action.phase==='active',patternId:action.id,locked};
  if(action.id==='attack.fan-sweep')return {kind:'fan',x:boss.x,y:boss.y,angle:action.aim??boss.angle,reach:config.reach,width:config.width,sector:config.sector,progress,active:action.phase==='active',patternId:action.id,locked};
  return action.id==='summon.mouth-t1'?{kind:'summon',x:boss.x,y:boss.y,angle:action.aim??boss.angle,progress,active:action.phase==='active',patternId:action.id,locked}:null;
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
    const u=this.owner;if(this.phase!=="idle"||u.down>0||u.stun>0||u.z>.1||u.landingRecovery>0)return false;
    this.phase="windup";this.elapsed=0;this.action={id:++sim.attackSerial,target:{...target},targetId:target.id??'boss',hit:false,path:null};
    if(this.spec.kind==='peanut-dual-strike'){
      const assault=getPeanutAssaultConfig(sim.abilityProgressionFor(u),u.tier);
      Object.assign(this.action,{resolvedMask:0,hitMask:0,peanutStrikeCount:assault?.strikeCount||PEANUT_BASE_STRIKE.count,peanutAttackMultiplier:assault?.attackMultiplier??PEANUT_BASE_STRIKE.attackMultiplier,peanutSpreadRadians:assault?.spreadRadians??PEANUT_BASE_STRIKE.spreadRadians});
    }
    if(this.spec.kind==='walnut-hammer'){
      const guard=getWalnutGuardConfig(sim.abilityProgressionFor(u),u.tier);
      Object.assign(this.action,{walnutEmpowered:!!guard&&u.walnutEmpoweredNextBasic,walnutGuardUsed:false});
      u.walnutEmpoweredNextBasic=false;
    }
    u.angle=Math.atan2(target.y-u.y,target.x-u.x);u.vx=u.vy=0;
    sim.combatEvent("prepare",u,this.action);return true;
  }
  interrupt(){if(this.phase!=="idle"){this.phase="recover";this.elapsed=0;this.action=null}}
  recover(sim,recoil=false){this.phase="recover";this.elapsed=0;const u=this.owner;if(recoil){u.vx=-Math.cos(u.angle)*2.2;u.vy=-Math.sin(u.angle)*2.2}sim.combatEvent("recover",u,this.action)}
  update(sim,dt){
    const u=this.owner;
    if(u.stun>0||u.down>0){this.interrupt();return true}
    if(this.action&&(this.phase==="windup"||this.phase==="active")&&!(sim.attackTarget(u,this.action)?.hp>0)){this.interrupt();return true}
    if(this.phase==="idle")return false;
    this.elapsed+=dt;
    if(this.phase==="windup"){
      u.vx*=Math.exp(-dt*18);u.vy*=Math.exp(-dt*18);
      if(this.elapsed>=this.spec.windup){
        this.elapsed=0;this.phase="active";const a=this.action;
        if(this.spec.kind==='peanut-dual-strike'){
          a.path={from:{x:u.x,y:u.y,z:0},to:{x:u.x,y:u.y,z:0},height:0,duration:this.spec.active};
        }else{
          a.path=Ballistics.create(u,a.target,this.spec.kind);
          if(this.spec.kind==='walnut-hammer')a.path.duration=this.spec.active;
        }
        sim.combatEvent("launch",u,a);
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
    const u=this.owner,a=this.action;if(this.phase!=="active"||!a?.path||u.stun>0||u.down>0||u.landingRecovery>0||u.z>.1&&!(a.path.height>0))return false;
    const p=Ballistics.sample(a.path,this.elapsed/a.path.duration);u.vx=(p.x-u.x)/dt;u.vy=(p.y-u.y)/dt;u.vz=(p.z-u.z)/dt;u.x=p.x;u.y=p.y;u.z=p.z;u.flash=Math.max(0,u.flash-dt);u.bounce=Math.max(0,u.bounce-dt);return true;
  }
  afterMove(sim,old){
    const a=this.action,u=this.owner;
    if(this.spec.kind==='peanut-dual-strike'){
      if(this.phase!=='active'||!a?.path)return;
      const schedule=createPeanutStrikeSchedule({strikeCount:a.peanutStrikeCount||2,attackMultiplier:a.peanutAttackMultiplier??PEANUT_BASE_STRIKE.attackMultiplier,spreadRadians:a.peanutSpreadRadians??Math.PI/12,activeSeconds:this.spec.active});
      for(const slot of schedule){
        if(this.elapsed+1e-9<slot.dueSeconds||((a.resolvedMask||0)&(1<<slot.strikeIndex))!==0)continue;
        const target=sim.attackTarget(u,a);
        let hit=null;
        if(target&&target.hp>0){
          const distance=Math.hypot(target.x-u.x,target.y-u.y),reach=target.radius+u.radius+this.spec.range;
          if(distance<=reach){
            const aim=Math.atan2(target.y-u.y,target.x-u.x),side=slot.angleOffsetRadians;
            const from={x:u.x+Math.cos(aim+side)*u.radius*.45,y:u.y+Math.sin(aim+side)*u.radius*.45,z:0};
            const to={x:target.x-Math.cos(aim)*target.radius*.9,y:target.y-Math.sin(aim)*target.radius*.9,z:0};
            hit=ArenaGeometry.sweep(from,to,Math.max(.06,u.radius*.2),.24,target);
          }
        }
        const strikeAction={...a,hit:false,strikeIndex:slot.strikeIndex};
        const didHit=!!hit&&sim.damageCombatTarget(u,strikeAction,target,hit,{attackMultiplier:slot.attackMultiplier,attackKind:this.spec.kind,strikeIndex:slot.strikeIndex});
        const masks=resolveStrikeMask(a,slot.strikeIndex,didHit);if(masks)Object.assign(a,masks);
      }
      if(this.elapsed>=this.spec.active-1e-9){u.z=0;u.vz=0;this.recover(sim,false)}
      return;
    }
    const target=sim.attackTarget(u,a);if(this.phase!=="active"||!a?.path)return;if(!target||target.hp<=0){this.interrupt();return}
    const areaRadius=scaleAttackArea(u.radius,u);
    const hit=!a.hit&&ArenaGeometry.sweep(old,u,areaRadius,.65,target);
    if(hit){
      if(a.walnutEmpowered)sim.triggerWalnutSlam(u,a,target,hit);
      else sim.damageCombatTarget(u,a,target,hit,{attackMultiplier:this.spec.skillMultiplier,attackKind:this.spec.kind});if(this.spec.kind==="ram"||this.spec.kind==="punch"){u.x=hit.x;u.y=hit.y;u.z=hit.z;this.recover(sim,true);return}}
    if(this.elapsed>=a.path.duration){u.z=0;u.vz=0;u.vx=u.vy=0;if(this.spec.kind==="leap"){
      u.bounce=.2;sim.combatEvent("land-attack",u,a);
      if(!a.hit&&ArenaGeometry.overlaps({x:u.x,y:u.y,z:0,radius:scaleAttackArea(u.radius+.35,u),height:.65},target))sim.damageCombatTarget(u,a,target,u,{attackMultiplier:this.spec.skillMultiplier,attackKind:this.spec.kind});
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
      Object.assign(this, { id, species, tier, faction:FACTION_CONFIG.PLAYER, meals: 0, growth: 0, growthElapsed: 0, growthDuration: CONFIG.breedGrowthSeconds, age: 0, cooldown: 0, cooldownDuration:0, mateId:0, perceptionRange:CONFIG.raid.perceptionRange, home: { x, y }, hp: stats(tier,species).maxHp, down: 0, seed: id * 2.39996,ownerId:'',farmId:0,dropLanded:true,
        isBattleOnlySummon:false,battleSummonKind:'',battleSummonParentId:0,battleSummonEncounterId:0,countsTowardPermanentRoster:true,eligibleForRaidDeployment:true,breedingEligible:true,mergeEligible:true,canSplit:true,splitUsedThisBattle:false,deathSplitHandled:false,usesPersistentSleep:true,lifetime:'',chestnutBasicCycles:0,landingRecovery:0,walnutEmpoweredNextBasic:false,wheatCommandUntil:0,wheatCommandCritBonus:0,barleyArmorBreakUntil:0,barleyArmorBreakReduction:0 });
    }
    get radius() {
      return unitRadiusForTier(this.tier) * (this.mature ? 1 : 0.8);
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
      this.seed = seed;this.notices=[];this.eventSequence=0;this.mergeTask=null;
      this.unitSpatial=new FixedSpatialGrid();this.foodSpatial=new FixedSpatialGrid();
      this._unitById=new Map();this._unitStepOrder=new Map();this._unitAliveState=new Map();this._liveFactionCounts=new Map();this._foodOrder=new Map();
      this._speciesGroups=Array.from({length:CONFIG.maxSpecies},()=>[]);
      this._speciesTierGroups=Array.from({length:CONFIG.maxSpecies*(CONFIG.maxTier+1)},()=>[]);
      this._mergeEligibleGroups=Array.from({length:CONFIG.maxSpecies*(CONFIG.maxTier+1)},()=>[]);
      this._ownedSpeciesCounts=new Int32Array(CONFIG.maxSpecies);
      this._unitCandidates=[];this._foodCandidates=[];this._groundedFoods=[];this._groundedFoodCount=0;this._contactPending=[];this._contactExtra=[];this._contactQuery=[];this._contactSeen=new Uint32Array(0);this._contactGeneration=0;
      this._bossGridUnits=[];this._bossGroundUnits=[];this._bossQueryCandidates=[];this._bossHitCandidates=[];
      this._mergeNearestScratch=[];this._mergeMaterialsScratch=[];this._mergeIdScratch=[];this._spatialStepActive=false;this._spatialQueryDepth=0;this._unitSpatialDirty=true;this._foodSpatialDirty=true;
      for(const key of ['unitSpatial','foodSpatial','_unitById','_unitStepOrder','_unitAliveState','_liveFactionCounts','_foodOrder','_speciesGroups','_speciesTierGroups','_mergeEligibleGroups','_ownedSpeciesCounts','_unitCandidates','_foodCandidates','_groundedFoods','_groundedFoodCount','_contactPending','_contactExtra','_contactQuery','_contactSeen','_contactGeneration','_bossGridUnits','_bossGroundUnits','_bossQueryCandidates','_bossHitCandidates','_mergeNearestScratch','_mergeMaterialsScratch','_mergeIdScratch','_spatialStepActive','_spatialQueryDepth','_unitSpatialDirty','_foodSpatialDirty'])Object.defineProperty(this,key,{enumerable:false});
      this.reset();
    }
    _rebuildUnitSpatialIndex(stepUnits=this.units){
      const grid=this.unitSpatial;grid.clear();this._unitById.clear();this._unitStepOrder.clear();this._unitAliveState.clear();this._liveFactionCounts.clear();this._ownedSpeciesCounts.fill(0);
      for(const group of this._speciesGroups)group.length=0;
      for(const group of this._speciesTierGroups)group.length=0;
      for(const unit of this.units){
        grid.insert(unit);this._unitById.set(unit.id,unit);
        if(unit.species>=0&&unit.species<CONFIG.maxSpecies){this._speciesGroups[unit.species].push(unit);this._ownedSpeciesCounts[unit.species]+=unit.isBattleOnlySummon?0:1;
          const tier=Math.max(0,Math.min(CONFIG.maxTier,unit.tier|0));this._speciesTierGroups[unit.species*(CONFIG.maxTier+1)+tier].push(unit)}
        if(unit.hp>0&&typeof unit.faction==='string')this._liveFactionCounts.set(unit.faction,(this._liveFactionCounts.get(unit.faction)||0)+1);
        this._unitAliveState.set(unit,unit.hp>0);
      }
      for(let index=0;index<stepUnits.length;index++)this._unitStepOrder.set(stepUnits[index],index);
      this._unitSpatialDirty=false;
    }
    _rebuildFoodSpatialIndex(){
      this.foodSpatial.clear();this._foodOrder.clear();let grounded=0;
      this._groundedFoods.length=0;for(let index=0;index<this.food.length;index++){const food=this.food[index];this._foodOrder.set(food,index);if(food.phase==='grounded'){this.foodSpatial.insert(food);this._groundedFoods.push(food);grounded++}}
      this._groundedFoodCount=grounded;this._foodSpatialDirty=false;
    }
    _trackFoodAdded(food){
      if(!this._spatialStepActive){this._foodSpatialDirty=true;return}
      this._foodOrder.set(food,this.food.length-1);
      if(food.phase==='grounded'){this.foodSpatial.insert(food);this._groundedFoods.push(food);this._groundedFoodCount=(this._groundedFoodCount||0)+1}
    }
    _trackUnitAdded(unit){
      if(!this._spatialStepActive){this._unitSpatialDirty=true;return}
      this.unitSpatial.insert(unit);this._unitById.set(unit.id,unit);this._unitStepOrder.set(unit,-1);
      if(unit.species>=0&&unit.species<CONFIG.maxSpecies){this._speciesGroups[unit.species].push(unit);this._ownedSpeciesCounts[unit.species]+=unit.isBattleOnlySummon?0:1;
        const tier=Math.max(0,Math.min(CONFIG.maxTier,unit.tier|0));this._speciesTierGroups[unit.species*(CONFIG.maxTier+1)+tier].push(unit)}
      if(unit.hp>0&&typeof unit.faction==='string')this._liveFactionCounts.set(unit.faction,(this._liveFactionCounts.get(unit.faction)||0)+1);
      this._unitAliveState.set(unit,unit.hp>0);
    }
    _trackUnitRemoved(unit,{keepStepSnapshot=false}={}){
      if(!this._spatialStepActive){this._unitSpatialDirty=true;return}
      this._unitById.delete(unit.id);
      this._syncUnitAliveCount(unit);if(unit.hp>0&&typeof unit.faction==='string')this._adjustFactionCount(unit.faction,-1);
      this._unitAliveState.set(unit,false);
      if(unit.species>=0&&unit.species<CONFIG.maxSpecies){this._removeGroupItem(this._speciesGroups[unit.species],unit);
        const tier=Math.max(0,Math.min(CONFIG.maxTier,unit.tier|0));this._removeGroupItem(this._speciesTierGroups[unit.species*(CONFIG.maxTier+1)+tier],unit);
        if(!unit.isBattleOnlySummon)this._ownedSpeciesCounts[unit.species]=Math.max(0,this._ownedSpeciesCounts[unit.species]-1)}
      if(!keepStepSnapshot||!this._unitStepOrder.has(unit)||this._unitStepOrder.get(unit)<0){this.unitSpatial.remove(unit);this._unitStepOrder.delete(unit)}
    }
    _removeGroupItem(group,item){const index=group.indexOf(item);if(index>=0)group.splice(index,1)}
    _adjustFactionCount(faction,delta){const next=(this._liveFactionCounts.get(faction)||0)+delta;if(next>0)this._liveFactionCounts.set(faction,next);else this._liveFactionCounts.delete(faction)}
    _syncUnitAliveCount(unit){
      const wasAlive=this._unitAliveState?.get(unit);const isAlive=unit.hp>0;if(wasAlive===isAlive)return;
      if(!this._unitAliveState)this._unitAliveState=new Map();this._unitAliveState.set(unit,isAlive);
      if(typeof unit.faction==='string')this._adjustFactionCount(unit.faction,isAlive?1:-1);
    }
    _unitIsActive(unit){return this._unitById.get(unit?.id)===unit}
    _beginSpatialQueryBatch(){if(!this._spatialStepActive&&this._spatialQueryDepth===0)this._rebuildUnitSpatialIndex(this.units);this._spatialQueryDepth++}
    _endSpatialQueryBatch(){this._spatialQueryDepth=Math.max(0,this._spatialQueryDepth-1)}
    _collectContactOrders(unit,minimumOrder,maximumOrder,out){
      const radius=unit.radius+CONFIG.maxUnitRadius+.22;
      this.unitSpatial.queryAABB(unit.x-radius,unit.y-radius,unit.x+radius,unit.y+radius,this._contactQuery);
      out.length=0;
      for(const candidate of this._contactQuery){const order=this._unitStepOrder.get(candidate);if(order!==undefined&&order>=minimumOrder&&order<=maximumOrder)out.push(order)}
      out.sort((a,b)=>a-b);return out;
    }
    _nextContactGeneration(length){
      if(this._contactSeen.length<length)this._contactSeen=new Uint32Array(Math.max(length,this._contactSeen.length*2,16));
      this._contactGeneration=(this._contactGeneration+1)>>>0;if(this._contactGeneration===0){this._contactSeen.fill(0);this._contactGeneration=1}return this._contactGeneration;
    }
    _insertContactOrder(order,lastOrder,pending,generation){
      if(order<=lastOrder||this._contactSeen[order]===generation)return;
      this._contactSeen[order]=generation;
      let low=0,high=pending.length;while(low<high){const middle=(low+high)>>>1;if(pending[middle]<order)low=middle+1;else high=middle}
      pending.splice(low,0,order);
    }
    _collectBossTargets(minX,minY,maxX,maxY,out,groundOnly=false){
      if(!this._spatialStepActive&&this._spatialQueryDepth===0)this._rebuildUnitSpatialIndex(this.units);
      this.unitSpatial.queryAABB(minX,minY,maxX,maxY,out);
      let length=0;for(let index=0;index<out.length;index++){const unit=out[index];if(this._unitIsActive(unit)&&hasFaction(unit,FACTION_CONFIG.PLAYER)&&unit.hp>0&&unit.dropLanded&&(!groundOnly||unit.z<=.1))out[length++]=unit}
      out.length=length;out.sort((a,b)=>a.id-b.id);return out;
    }
    static createRaidBattle(seed=731,expectedPlayers=['solo'],bossStage=null){
      const w=new Garden(seed);w.units=[];w.food=[];w.scene='raid';w.running=false;w.boss=w.createBoss(bossStage?.species??w.randomBossSpecies());w.boss.phase='resting';
      if(bossStage?.stage!==undefined)w.configureBossStage(bossStage.stage,bossStage.species);
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
      this.projectiles=[];this.attackSerial=0;this.projectileSerial=0;this.raidSummonSerial=0;this.bossSummonSerial=0;this.combatLog=[];
      this.farmBossProgress=createFarmBossProgress(this.seed);
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
    get armyHealth(){return this.units.filter(u=>hasFaction(u,FACTION_CONFIG.PLAYER)).reduce((sum,u)=>{const maxHp=stats(u.tier,u.species).maxHp;return {current:sum.current+Math.max(0,Math.min(maxHp,u.hp)),max:sum.max+maxHp,living:sum.living+(u.hp>0?1:0),total:sum.total+1}},{current:0,max:0,living:0,total:0})}
    get capacity(){return getFarmCapacity(this.playerProgression?.farmUpgrades)}
    breedCooldownDuration(){return getBreedCooldownSeconds(this.playerProgression?.farmUpgrades,CONFIG.breedCooldownSeconds)}
    breedGrowthDuration(){return this.breedCooldownDuration()/2}
  abilityProgressionFor(unit){if(hasFaction(unit,FACTION_CONFIG.ENEMY))return null;return this.scene==='raid'?this.raidRoster(unit?.ownerId)?.abilitySnapshot||null:this.playerProgression}
    highestSpeciesTiers(){const tiers=Array(CONFIG.maxSpecies).fill(0);for(const unit of this.units)if(!unit.isBattleOnlySummon)tiers[unit.species]=Math.max(tiers[unit.species],unit.tier);return tiers}
    investAbilityNode(abilityId,nodeId){const inCombat=this.running||this.farmBossEvent?.phase!=='idle';const result=purchaseAbilityNode(this.playerProgression,abilityId,nodeId,{location:this.scene,inCombat,highestSpeciesTier:this.highestSpeciesTiers()});if(result.ok)this.playerProgression=result.state;return result}
    investFarmUpgrade(nodeId){const inCombat=this.running||this.farmBossEvent?.phase!=='idle';const result=purchaseFarmUpgrade(this.playerProgression,nodeId,{location:this.scene,inCombat});if(result.ok)this.playerProgression=result.state;return result}
    resetAbilityTree(){const inCombat=this.running||this.farmBossEvent?.phase!=='idle';const result=resetAbilityProgression(this.playerProgression,{location:this.scene,inCombat});if(result.ok)this.playerProgression=result.state;return result}
    spawnLobProjectile(unit,action,shot,popcornConfig=null){
      if(this.projectiles.length>=CONFIG.maxRaidProjectiles)return null;
      const id=++this.projectileSerial;
      const projectile={id,owner:unit.id,targetId:action.targetId||'boss',faction:unit.faction,ownerId:unit.ownerId,species:unit.species,tier:unit.tier,path:structuredClone(action.path),elapsed:0,x:unit.x,y:unit.y,z:.45,radius:scaleAttackArea(.12,unit),height:.24,hit:false,attackMultiplier:shot.attackMultiplier??this.speciesAbilityDamageMultiplier(unit),shotIndex:shot.shotIndex??0};
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
        this.projectiles.push({id:++this.projectileSerial,owner:unit.id,faction:unit.faction,ownerId:unit.ownerId,species:unit.species,tier:unit.tier,path,elapsed:0,x:unit.x,y:unit.y,z:0,radius:scaleAttackArea(.08,unit),height:.22,hit:false,attackMultiplier:config.projectileAttackMultiplier,projectileKind:'chestnut-spike',fanIndex:index});
      }
      return true;
    }
    handleUnitDeath(unit){
      if(!unit)return false;unit.walnutEmpoweredNextBasic=false;if(unit.deathSplitHandled)return false;
      this._syncUnitAliveCount(unit);
      unit.deathSplitHandled=true;
      if(unit.isBattleOnlySummon){unit.down=0;this._trackUnitRemoved(unit,{keepStepSnapshot:true});this.units=this.units.filter(candidate=>candidate!==unit);return false}
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
        this._trackUnitAdded(child);
      }
      this.combat('pea-split',{unit:unit.id,ownerId:unit.ownerId,species:0,count:descriptors.length,x:unit.x,y:unit.y});
      return true;
    }
    cleanupBattleSummons(){for(const unit of this.units)unit.walnutEmpoweredNextBasic=false;for(const unit of this.units)if(unit.isBattleOnlySummon)this._trackUnitRemoved(unit);this.units=this.units.filter(unit=>!unit.isBattleOnlySummon);this.projectiles=[];return true}
    triggerLandingShockwave(unit,action,config){
      const range=abilityProfile(unit.species).range*config.radiusMultiplier,point={x:unit.x,y:unit.y,z:0},distance=Math.hypot(unit.x-this.boss.x,unit.y-this.boss.y);
      this.effects.push({kind:'landing-shockwave',x:unit.x,y:unit.y,z:0,life:0,duration:.55,radius:range,owner:unit.id});
      if(this.boss.hp>0&&distance<=range+this.boss.radius){const blast={id:action.id,hit:false,attackKind:'kidney-shockwave'};this.damageBoss(unit,blast,point,{attackMultiplier:config.damageMultiplier,attackKind:'kidney-shockwave',area:true});}
      this.combat('kidney-shockwave',{unit:unit.id,ownerId:unit.ownerId,species:2,x:unit.x,y:unit.y,radius:range,damageMultiplier:config.damageMultiplier});
    }
    walnutGuardConfigFor(unit){
      if(unit.species!==5)return null;const config=getWalnutGuardConfig(this.abilityProgressionFor(unit),unit.tier);
      return isWalnutGuardActive(unit,config,scaleAttackRecovery(abilityProfile(unit.species).recovery,unit))?config:null;
    }
    receiveWalnutGuard(unit){
      const config=this.walnutGuardConfigFor(unit);if(!config)return null;
      unit.ability.action.walnutGuardUsed=true;unit.walnutEmpoweredNextBasic=true;
      this.combat('walnut-guard',{unit:unit.id,x:unit.x,y:unit.y,z:unit.z});return config;
    }
    triggerWalnutSlam(unit,action,primaryTarget,point){
      if(action.hit||!primaryTarget||primaryTarget.hp<=0||!areOpposingFactions(unit,primaryTarget))return false;const config=getWalnutGuardConfig(this.abilityProgressionFor(unit),unit.tier);if(!config)return false;
      action.hit=true;
      const targets=[primaryTarget];
      if(primaryTarget!==this.boss&&this.boss.hp>0&&areOpposingFactions(unit,this.boss)&&Math.hypot(this.boss.x-point.x,this.boss.y-point.y)<=config.radius+this.boss.radius)targets.push(this.boss);
      for(const target of this.units)if(target!==primaryTarget&&target.hp>0&&areOpposingFactions(unit,target)&&Math.hypot(target.x-point.x,target.y-point.y)<=config.radius+target.radius)targets.push(target);
      const criticalRoll=stats(unit.tier,unit.species).critChance+this.wheatCommandCritBonusFor(unit)>0?this.random():1;
      for(const target of targets)this.damageCombatTarget(unit,{id:action.id,hit:false},target,point,{attackMultiplier:config.damageMultiplier,attackKind:'walnut-empowered-slam',area:true,criticalRoll});
      this.effects.push({kind:'walnut-shockwave',x:point.x,y:point.y,z:0,life:0,duration:.5,radius:config.radius,owner:unit.id});
      this.combat('walnut-slam',{unit:unit.id,attackId:action.id,x:point.x,y:point.y,z:0,radius:config.radius});return true;
    }
    senseEnemy(unit){
      if(unit.hp<=0||!unit.dropLanded)return null;
      if(!this._spatialStepActive&&this._spatialQueryDepth===0)this._rebuildUnitSpatialIndex(this.units);
      const battleActive=this.scene==='farm'?this.farmBossEvent?.phase==='fighting':this.running&&this.raidDeploymentStarted;
      const bossTarget=battleActive&&this.boss?.active&&areOpposingFactions(unit,this.boss)?this.boss:null;
      let hasUnitEnemy=false;for(const [faction,count] of this._liveFactionCounts)if(faction!==unit.faction&&count>0){hasUnitEnemy=true;break}
      if(!hasUnitEnemy&&!bossTarget)return null;
      let nearest=null,nearestDistance=Infinity,nearestId=Infinity;
      const consider=target=>{
        if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.y)||!Number.isFinite(target.radius))return;
        const distance=Math.hypot(unit.x-target.x,unit.y-target.y),id=target.id||0;
        if(distance<=unit.perceptionRange+target.radius+1e-9&&(distance<nearestDistance||distance===nearestDistance&&id<nearestId)){nearest=target;nearestDistance=distance;nearestId=id}
      };
      consider(bossTarget);
      if(hasUnitEnemy){const extent=Math.max(0,unit.perceptionRange+CONFIG.maxUnitRadius+1e-9);
        this.unitSpatial.queryAABB(unit.x-extent,unit.y-extent,unit.x+extent,unit.y+extent,this._unitCandidates);
        for(const candidate of this._unitCandidates)if(candidate!==unit&&this._unitIsActive(candidate)&&candidate.hp>0&&candidate.dropLanded&&areOpposingFactions(unit,candidate))consider(candidate);
      }
      return nearest;
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
      const ids=new Set(),troops=[];for(const e of entries){if(!Array.isArray(e)||e.length!==3||!Number.isSafeInteger(e[0])||e[0]<1||e[0]>CONFIG.maxFarmUnitId||!Number.isInteger(e[1])||e[1]<0||e[1]>=CONFIG.maxSpecies||!Number.isInteger(e[2])||e[2]<1||e[2]>CONFIG.maxTier||ids.has(e[0]))return false;ids.add(e[0]);troops.push({farmId:e[0],species:e[1],tier:e[2],deployed:false})}
      const orderKey=farmId=>{let h=(this.seed^Math.imul(farmId,0x9e3779b9))>>>0;for(let i=0;i<ownerId.length;i++){h^=ownerId.charCodeAt(i);h=Math.imul(h,0x01000193)}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return h>>>0};
      troops.sort((a,b)=>orderKey(a.farmId)-orderKey(b.farmId)||a.farmId-b.farmId);
      this.raidRosters.push({ownerId,troops,abilitySnapshot:structuredClone(abilitySnapshot),settlementSessionId:hasSettlement?settlement.sessionId:'',settlementRunSequence:hasSettlement?settlement.runSequence:0,settlementEncounterId:hasSettlement?settlement.encounterId:0,lastDeploySequence:0,buffUntil:0,buffReadyAt:0});this.raidRosters.sort((a,b)=>this.raidExpectedPlayers.indexOf(a.ownerId)-this.raidExpectedPlayers.indexOf(b.ownerId));return true;
    }
    deployNextRaidUnit(ownerId,sequence,x,y){
      if(this.scene!=='raid'||!this.raidExpectedPlayers.every(id=>this.raidRoster(id))||this.units.length>=CONFIG.maxRaidBattleUnits||!Number.isSafeInteger(sequence)||!Number.isFinite(x)||!Number.isFinite(y))return false;
      const roster=this.raidRoster(ownerId),troop=roster?.troops.find(t=>!t.deployed);if(!roster||sequence!==roster.lastDeploySequence+1||!troop||!ArenaGeometry.inside({x,y},'raid',.5))return false;
      const farmId=troop.farmId,slot=this.raidExpectedPlayers.indexOf(ownerId),troopIndex=roster.troops.indexOf(troop),id=(slot+1)*CONFIG.raidPlayerIdStride+troopIndex+1;if(this.units.some(u=>u.id===id))return false;
      const u=new Unit(id,troop.species,troop.tier,x,y),growthDuration=this.breedGrowthDuration();Object.assign(u,{ownerId,farmId,z:CONFIG.raid.dropHeight,vz:0,dropLanded:false,meals:1,growth:CONFIG.matureMeals,growthDuration,growthElapsed:growthDuration});troop.deployed=true;roster.lastDeploySequence=sequence;this.units.push(u);this._trackUnitAdded(u);
      if(!this.raidDeploymentStarted){this.raidDeploymentStarted=true;this.running=true;this.encounter={outcome:'fighting',elapsed:0};this.boss.active=true;this.boss.encounterId=this.raidRosters[0]?.settlementRunSequence||this.nextRaidRunSequence||1;this.boss.patternRuntime=createBossPatternRuntime();this.boss.phase='chase'}
      this.combat('unit-drop',{unit:id,ownerId,x,y,z:u.z});return true;
    }
    useRaidBuff(ownerId){const r=this.raidRoster(ownerId);if(!this.running||!r||this.time<r.buffReadyAt)return false;r.buffUntil=this.time+CONFIG.raid.buffDuration;r.buffReadyAt=this.time+CONFIG.raid.buffCooldown;this.combat('buff',{ownerId,until:r.buffUntil});return true}
    random() {
      return this.rng.nextUint32() / 4294967296;
    }
    randomBossSpecies(){return Math.min(CONFIG.maxSpecies-1,Math.floor(this.random()*CONFIG.maxSpecies))}
    spawn(species, tier, x, y) {
      if (this.units.length >= (this.scene==='farm'?this.capacity:CONFIG.maxRaidUnits)) return null;
      const u = new Unit(this.nextId++, species, clamp(tier, 1, CONFIG.maxTier), x, y);
      this.units.push(u);this._trackUnitAdded(u);
      return u;
    }
    notice(kind,detail={}){const event={sequence:++this.eventSequence,kind,...detail};this.notices.push(event);if(this.notices.length>512)this.notices.shift();return event}
    emit(kind, x, y, z = 0, effectOptions = {}) {
      this.notice(kind);
      const effect={kind, x, y, z, life: 0, ...effectOptions};
      if(Number.isFinite(effect.delay)&&Number.isFinite(effect.span))effect.duration=effect.delay+effect.span;
      this.effects.push(effect);
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
      const interval = getAutoTapSeconds(this.playerProgression?.farmUpgrades);
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
      const food={x:sx,y:sy,z,vx:(tx-sx)/duration,vy:(ty-sy)/duration,vz:6*duration-z/duration,seed:this.random(),phase:"flight",tx,ty};this.food.push(food);this._trackFoodAdded(food);
        this.emit("feed",tx,ty);
      }
    }
    tryStartFarmBossEvent(x,y){
      if(this.scene!=='farm'||this.boss.active||this.farmBossEvent.phase!=='idle'||this.random()>=CONFIG.farmBossEvent.spawnChance)return false;
      for(const unit of this.units)if(!unit.isBattleOnlySummon){unit.splitUsedThisBattle=false;unit.deathSplitHandled=false;unit.chestnutBasicCycles=0}
      this.boss=this.createBoss(this.randomBossSpecies());Object.assign(this.boss,{x,y,z:CONFIG.raid.dropHeight,active:true});
      this.farmBossEvent={phase:'dropping',elapsed:0,outcome:'fighting',encounterId:this.nextBossEncounterId++,rewardStatus:'unresolved',rewardChance:0,rewardRoll:0,rewardUnitId:0};this.boss.encounterId=this.farmBossEvent.encounterId;this.boss.patternRuntime=createBossPatternRuntime();
      this.combat('farm-boss-drop',{x,y,z:this.boss.z});
      return true;
    }
    getBossAcquisitionChance({farmEvent=false}={}){return bossAcquisitionChance({farmEvent})}
    createBoss(species=3){const hp=2000;return {x:0,y:0,faction:FACTION_CONFIG.ENEMY,z:0,radius:CONFIG.raid.bossRadius,height:CONFIG.raid.bossHeight,hp,maxHp:hp,species:clamp(species,0,CONFIG.maxSpecies-1),attackPower:4,stage:0,moveSpeed:CONFIG.raid.chaseSpeed,encounterId:0,active:false,phase:'resting',clock:0,angle:0,facing:0,flash:0,hit:new Set(),swings:0,basicCount:0,attackId:0,targetId:0,sweepClock:0,attackKind:'attack.sweep-360',startAngle:0,travel:0,patternRuntime:createBossPatternRuntime(),airborneRecovery:0,barleyArmorBreakUntil:0,barleyArmorBreakReduction:0,summonMouth:{x:0,y:0,z:0}}}
    configureBossStage(stage,species=this.boss.species){const stats=bossStageStats(stage);this.boss.species=clamp(species,0,CONFIG.maxSpecies-1);this.boss.stage=stats.stage;this.boss.hp=this.boss.maxHp=stats.hp;this.boss.attackPower=stats.attackPower;return this.boss}
    setScene(scene){
      if(scene===this.scene)return;
      this.mergeTask=null;this.projectiles=[];this.scene=scene;this.running=scene==='raid';this.encounter={outcome:this.running?'fighting':'idle',elapsed:0};this.farmBossEvent={phase:'idle',elapsed:0,outcome:'idle',encounterId:0,rewardStatus:'none',rewardChance:0,rewardRoll:0,rewardUnitId:0};this.boss=this.createBoss(this.running?this.randomBossSpecies():3);
      const idMap=new Map(this.units.map((u,index)=>[u.id,scene==='raid'?1000000+index+1:(u.farmId||u.id)]));
      for(let i=0;i<this.units.length;i++){
        const u=this.units[i],oldMateId=u.mateId;if(scene==='raid'){u.home={x:u.x,y:u.y};u.farmId=u.farmId||u.id;u.ownerId='solo';u.id=1000000+i+1;u.dropLanded=true;const angle=i*2.3999632297,rad=10.5+(i%3)*.9;Object.assign(u,{x:Math.cos(angle)*rad,y:Math.sin(angle)*rad*.84})}else{u.id=u.farmId||u.id;u.ownerId='';u.farmId=0;u.dropLanded=true;Object.assign(u,u.home)}u.mateId=idMap.get(oldMateId)||0;
        u.ability=new AttackCycle(u);u.walnutEmpoweredNextBasic=false;Object.assign(u,{z:0,vx:0,vy:0,vz:0,stun:0,down:0,hp:stats(u.tier,u.species).maxHp});
      }
      if(this.running){this.boss.active=true;this.boss.phase='chase';this.boss.encounterId=this.activeRaidRunSequence||this.nextRaidRunSequence||1;this.boss.patternRuntime=createBossPatternRuntime();this.raidExpectedPlayers=['solo'];this.raidRosters=[{ownerId:'solo',troops:this.units.filter(u=>!u.isBattleOnlySummon).map(u=>({farmId:u.farmId,species:u.species,tier:u.tier,deployed:true})),abilitySnapshot:createAbilityRuntimeSnapshot(this.playerProgression),buffUntil:0,buffReadyAt:0}];this.raidDeploymentStarted=true}else{this.raidExpectedPlayers=['solo'];this.raidRosters=[];this.raidDeploymentStarted=false}
      this._unitSpatialDirty=true;
    }
    canBreedPair(a,b,requireContact=false){
      const batch=!this._spatialStepActive; if(batch)this._beginSpatialQueryBatch();
      try{return a!==b&&!a.isBattleOnlySummon&&!b.isBattleOnlySummon&&a.breedingEligible!==false&&b.breedingEligible!==false&&a.hp>0&&b.hp>0&&a.species===b.species&&a.mature&&b.mature&&a.fed&&b.fed&&a.cooldown<=0&&b.cooldown<=0&&this._unitIsActive(a)&&this._unitIsActive(b)&&(!requireContact||Math.hypot(a.x-b.x,a.y-b.y)<=a.radius+b.radius+.2)}
      finally{if(batch)this._endSpatialQueryBatch()}
    }
    releaseMate(unit){
      if(!this._spatialStepActive&&this._spatialQueryDepth===0)this._rebuildUnitSpatialIndex(this.units);
      const mate=this._unitById.get(unit.mateId);unit.mateId=0;if(mate&&mate.mateId===unit.id)mate.mateId=0;
    }
    reconcileMateReservations(){
      const batch=!this._spatialStepActive;if(batch)this._beginSpatialQueryBatch();
      try{for(const unit of this.units){
          if(!unit.mateId)continue;
          const mate=this._unitById.get(unit.mateId);
          if(this.mode!=='breed'||!mate||mate.mateId!==unit.id||!this.canBreedPair(unit,mate))this.releaseMate(unit);
        }}finally{if(batch)this._endSpatialQueryBatch()}
    }
    findOrReserveMate(unit){
      const batch=!this._spatialStepActive;if(batch)this._beginSpatialQueryBatch();
      try{
        if(this.mode!=='breed'||!unit.mature||!unit.fed||unit.cooldown>0||unit.hp<=0||this.senseEnemy(unit)){this.releaseMate(unit);return null}
        if(unit.mateId){const current=this._unitById.get(unit.mateId);if(current&&current.mateId===unit.id&&this.canBreedPair(unit,current))return current;this.releaseMate(unit)}
        let mate=null,bestRank=Infinity,bestDistance=Infinity;
        for(const candidate of this._speciesGroups[unit.species]||[]){
          if(candidate===unit||candidate.mateId||!this.canBreedPair(unit,candidate)||this.senseEnemy(candidate))continue;
          const rank=candidate.tier===unit.tier?0:1,distance=Math.hypot(candidate.x-unit.x,candidate.y-unit.y);
          if(rank<bestRank||rank===bestRank&&distance<bestDistance){mate=candidate;bestRank=rank;bestDistance=distance}
        }
        if(!mate)return null;unit.mateId=mate.id;mate.mateId=unit.id;return mate;
      }finally{if(batch)this._endSpatialQueryBatch()}
    }
    hasEligibleSameTierBreedPair(){
      if(this.mode!=="breed"||this.units.length>=this.capacity)return false;
      const batch=!this._spatialStepActive;if(batch)this._beginSpatialQueryBatch();
      try{
        for(const group of this._speciesTierGroups){let unreserved=0;
          for(const unit of group){if(unit.isBattleOnlySummon||unit.breedingEligible===false||unit.hp<=0||!unit.mature||!unit.fed||unit.cooldown>0||!this._unitIsActive(unit))continue;
            if(!unit.mateId){if(++unreserved>=2)return true;continue}
            const mate=this._unitById.get(unit.mateId);if(mate?.mateId===unit.id&&mate.species===unit.species&&mate.tier===unit.tier&&mate.hp>0&&mate.mature&&mate.fed&&mate.cooldown<=0&&mate.breedingEligible!==false&&!mate.isBattleOnlySummon)return true;
          }
        }
      }finally{if(batch)this._endSpatialQueryBatch()}
      return false;
    }
    canMergeGroup(materials,{requireContact=false,requireNoEnemy=false}={}){
      const batch=!this._spatialStepActive;if(batch)this._beginSpatialQueryBatch();
      try{
        if(!Array.isArray(materials)||materials.length<2)return false;
        const first=materials[0],resultTier=first?.tier+1,materialCount=mergeMaterialCostForTier(resultTier);
        if(materialCount<2||materials.length!==materialCount||first.tier>=CONFIG.maxTier)return false;
        const ids=new Set();
        for(const unit of materials){
          if(!unit||ids.has(unit.id)||unit.isBattleOnlySummon||unit.mergeEligible===false||unit.species!==first.species||unit.tier!==first.tier||unit.hp<=0||unit.down>0||!unit.mature||unit.cooldown>0||!this._unitIsActive(unit))return false;
          ids.add(unit.id);
        }
        // Sleeping owned units count toward the minimum roster, but cannot be
        // consumed. The resulting same-species count must remain at least two.
        if(this._ownedSpeciesCounts[first.species]-materialCount+1<2)return false;
        if(requireNoEnemy&&materials.some(unit=>this.senseEnemy(unit)))return false;
        if(requireContact){const anchor=materials[0];for(let index=1;index<materials.length;index++){const unit=materials[index];if(Math.hypot(anchor.x-unit.x,anchor.y-unit.y)>anchor.radius+unit.radius+.2)return false}}
        return true;
      }finally{if(batch)this._endSpatialQueryBatch()}
    }
    canMergePair(a,b,options={}){return this.canMergeGroup([a,b],options)}
    selectMergeTask(){
      if(this.mode!=="merge"||this.scene!=="farm"||this.mergeTask)return;
      const batch=!this._spatialStepActive;if(batch)this._beginSpatialQueryBatch();
      try{
        for(const group of this._mergeEligibleGroups)group.length=0;
        for(const group of this._speciesTierGroups){for(const unit of group)if(!unit.isBattleOnlySummon&&unit.mergeEligible!==false&&unit.hp>0&&unit.down<=0&&unit.mature&&unit.cooldown<=0&&unit.tier<CONFIG.maxTier&&!this.senseEnemy(unit))this._mergeEligibleGroups[unit.species*(CONFIG.maxTier+1)+unit.tier].push(unit)}
        const compareIds=(left,right)=>{for(let index=0;index<left.length;index++)if(left[index]!==right[index])return left[index]-right[index];return 0};
        let bestTier=Infinity,bestDistance=Infinity,bestAnchorId=Infinity,bestMaterialIds=null,bestSortedIds=null;
        const nearest=this._mergeNearestScratch,materials=this._mergeMaterialsScratch,sortedIds=this._mergeIdScratch;
        for(let tier=1;tier<CONFIG.maxTier;tier++){
          const materialCount=mergeMaterialCostForTier(tier+1),nearestCount=materialCount-1;
          if(materialCount<2)continue;
          for(let species=0;species<CONFIG.maxSpecies;species++){
            const group=this._mergeEligibleGroups[species*(CONFIG.maxTier+1)+tier];
            if(group.length<materialCount||this._ownedSpeciesCounts[species]-materialCount+1<2)continue;
            for(const anchor of group){
              nearest.length=0;
              for(const unit of group){if(unit===anchor)continue;const distance=(unit.x-anchor.x)**2+(unit.y-anchor.y)**2;let insertAt=nearest.length;
                for(let position=0;position<nearest.length;position++){const current=nearest[position];if(distance<current.distance||distance===current.distance&&unit.id<current.unit.id){insertAt=position;break}}
                if(insertAt>=nearestCount)continue;nearest.splice(insertAt,0,{unit,distance});if(nearest.length>nearestCount)nearest.length=nearestCount;
              }
              if(nearest.length!==nearestCount)continue;
              materials.length=0;materials.push(anchor);for(const entry of nearest)materials.push(entry.unit);
              if(!this.canMergeGroup(materials,{requireNoEnemy:true}))continue;
              let distance=0;for(let i=0;i<materials.length;i++)for(let j=i+1;j<materials.length;j++)distance+=(materials[i].x-materials[j].x)**2+(materials[i].y-materials[j].y)**2;
              if(tier>bestTier||tier===bestTier&&distance>bestDistance)continue;
              sortedIds.length=0;for(const unit of materials)sortedIds.push(unit.id);sortedIds.sort((a,b)=>a-b);
              const idsOrder=bestSortedIds?compareIds(sortedIds,bestSortedIds):-1;
              if(bestMaterialIds&&(tier>bestTier||tier===bestTier&&(distance>bestDistance||distance===bestDistance&&(idsOrder>0||idsOrder===0&&anchor.id>=bestAnchorId))))continue;
              bestTier=tier;bestDistance=distance;bestAnchorId=anchor.id;bestMaterialIds=materials.map(unit=>unit.id);bestSortedIds=[...sortedIds];
            }
          }
        }
        if(bestMaterialIds)this.mergeTask={phase:"approach",aId:bestMaterialIds[0],bId:bestMaterialIds[1],materialIds:bestMaterialIds,elapsed:0,duration:CONFIG.mergeAnimationSeconds};
      }finally{if(batch)this._endSpatialQueryBatch()}
    }
    advanceMergeTask(dt){
      if(this.mode!=="merge"||this.scene!=="farm"){this.mergeTask=null;return}
      if(this.mergeTask?.phase==="animation"){
        this.mergeTask.elapsed=Math.min(this.mergeTask.duration,this.mergeTask.elapsed+dt);
        if(this.mergeTask.elapsed>=this.mergeTask.duration-1e-9)this.mergeTask=null;
        return;
      }
      if(this.mergeTask?.phase==="approach"){
        const materials=(this.mergeTask.materialIds||[this.mergeTask.aId,this.mergeTask.bId]).map(id=>this._unitById.get(id));
        // Combat pauses an otherwise valid group; death, invalid tiers, or removed units cancel it.
        if(!this.canMergeGroup(materials))this.mergeTask=null;
      }
      if(!this.mergeTask)this.selectMergeTask();
    }
    resolveMergeTaskAfterMovement(){
      const task=this.mergeTask;if(task?.phase!=="approach")return false;
      const materials=(task.materialIds||[task.aId,task.bId]).map(id=>this._unitById.get(id));
      if(!this.canMergeGroup(materials,{requireContact:true,requireNoEnemy:true}))return false;
      return this.mergeGroup(materials,{priorityResolved:true});
    }
    pair(a, b, priorityResolved=false) {
      if (this.mode === "merge") {
        return this.mergeGroup([a,b],{priorityResolved});
      }
      if(!a||!b||a===b||a.hp<=0||b.hp<=0||a.down>0||b.down>0||a.species!==b.species||!a.mature||!b.mature||a.cooldown>0||b.cooldown>0||!this.units.includes(a)||!this.units.includes(b)||Math.hypot(a.x-b.x,a.y-b.y)>a.radius+b.radius+.2||this.senseEnemy(a)||this.senseEnemy(b))return false;
      if(a.isBattleOnlySummon||b.isBattleOnlySummon)return false;
      {
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
    mergeGroup(materials,{priorityResolved=false}={}) {
      if(this.mode!=="merge"||this.scene!=="farm"||!this.canMergeGroup(materials,{requireContact:true,requireNoEnemy:true}))return false;
      const ordered=[...materials],first=ordered[0],materialIds=ordered.map(unit=>unit.id),consumed=new Set(materialIds),x=ordered.reduce((sum,unit)=>sum+unit.x,0)/ordered.length,y=ordered.reduce((sum,unit)=>sum+unit.y,0)/ordered.length;
      for(const unit of ordered)this.releaseMate(unit);
      for(const unit of ordered)this._trackUnitRemoved(unit);
      this.units=this.units.filter(unit=>!consumed.has(unit.id));
      const result=this.spawn(first.species,first.tier+1,x,y);
      result.meals=1;result.growth=CONFIG.matureMeals;result.growthDuration=this.breedGrowthDuration();result.growthElapsed=result.growthDuration;result.cooldown=getMergeCooldownSeconds(this.playerProgression?.farmUpgrades);result.cooldownDuration=result.cooldown;
      this.mergeTask={phase:"animation",aId:0,bId:0,materialIds,resultId:result.id,sourceSpecies:first.species,sourceTier:first.tier,elapsed:0,duration:CONFIG.mergeAnimationSeconds};
      const sequenceWindow=CONFIG.mergeAnimationSeconds*.72,step=sequenceWindow/ordered.length;
      ordered.forEach((unit,index)=>this.effects.push({kind:"merge-material",x:unit.x,y:unit.y,z:.2,targetX:x,targetY:y,life:0,delay:index*step,span:step, duration:(index+1)*step,sequenceIndex:index,sequenceCount:ordered.length}));
      this.metrics.merges++;this.emit("merge",x,y,1,{delay:sequenceWindow,span:CONFIG.mergeAnimationSeconds-sequenceWindow});
      return true;
    }
    step(dt) {
      this._spatialStepActive=true;this._spatialQueryDepth=0;
      this.time += dt;
      grantPendingBossAcquisitions(this);
      const units=[...this.units];this._rebuildUnitSpatialIndex(units);
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
      this._rebuildFoodSpatialIndex();
      this.reconcileMateReservations();
      for (const u of units) {
        u.landingRecovery=Math.max(0,(u.landingRecovery||0)-dt);
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
            const maxHp=stats(u.tier,u.species).maxHp;this.releaseMate(u);Object.assign(u,{hp:maxHp,down:0,z:0,vx:0,vy:0,vz:0,stun:0,flash:0,bounce:0,angle:0,deathSplitHandled:false});this._syncUnitAliveCount(u);u.ability=new AttackCycle(u);this.combat('unit-recover',{unit:u.id,x:u.x,y:u.y});
          }
          this.unitSpatial.update(u);
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
        else if(u.hp>0&&hasFaction(u,FACTION_CONFIG.PLAYER)&&!u.isBattleOnlySummon){if(u.ability.phase!=='idle'){u.ability.interrupt();u.ability.update(this,dt)}this.farmUnit(u,dt)}
        else if(this.scene==='raid'&&this.running)this.raidUnit(u,dt,null);
        const oldZ = u.z,oldPosition={x:u.x,y:u.y,z:u.z};
        u.integrate(dt);
        if(this.scene==="raid"&&u.hp<=0&&u.z===0&&u.vz===0){u.vx=u.vy=0;}
        if(enemy)u.ability.afterMove(this,oldPosition);
        if (oldZ > 0 && u.z === 0) {
          u.landingRecovery=.25;
          if(!u.dropLanded){u.dropLanded=true;u.bounce=.16;this.combat(this.scene==='raid'?'drop-land':'boss-add-land',{unit:u.id,ownerId:u.ownerId,x:u.x,y:u.y,z:0});this.effects.push({kind:'drop-dust',x:u.x,y:u.y,z:0,life:0})}
          this.metrics.landings++;
          if(this.scene==='raid')this.combat('unit-land',{unit:u.id,x:u.x,y:u.y,z:0,strength:Math.min(1,Math.hypot(u.vx,u.vy)/8)});
          else if (Math.hypot(u.vx, u.vy) > 1) this.emit("land", u.x, u.y);
        }
        this.boundBody(u,this.scene,u.radius);
        this.unitSpatial.update(u);

      }
      this.resolveContacts(units);
      if (this.scene === "farm") {
        if(this.mode==="breed"){
          this.resolveFarmContactPairs(units,true);
          if(!this.hasEligibleSameTierBreedPair())this.resolveFarmContactPairs(units,false);
        }else this.resolveMergeTaskAfterMovement();
      }
      if(this.scene==='farm'&&this.farmBossEvent.phase!=='idle'){
        if(this.boss.active)this.updateProjectiles(dt);
        this.updateBoss(dt);
        if(this.boss.active)for(const u of this.units){this.separateBoss(u);this.unitSpatial.update(u)}
      }else if(this.boss.active){this.updateProjectiles(dt);this.updateBoss(dt);for(const u of this.units){this.separateBoss(u);this.unitSpatial.update(u)}}
      this.units=this.units.filter(unit=>!unit.isBattleOnlySummon||unit.hp>0);
      this._spatialStepActive=false;this._unitSpatialDirty=true;this._foodSpatialDirty=true;
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
      for(let i=0;i<units.length;i++){
        const unit=units[i];if(unit.hp<=0||!unit.dropLanded)continue;
        const pending=this._collectContactOrders(unit,0,i-1,this._contactPending);
        for(const j of pending){const other=units[j];if(other.hp<=0||!other.dropLanded)continue;
          const ax=other.x,ay=other.y,bx=unit.x,by=unit.y,didContact=contact(other,unit);
          if(didContact)this.metrics.contacts++;
          if(ax!==other.x||ay!==other.y)this.unitSpatial.update(other);
          if(bx!==unit.x||by!==unit.y)this.unitSpatial.update(unit);
        }
      }
    }
    resolveContacts(units){
      if(this.scene==='raid'){this.raidContacts(units);return}
      for(let i=0;i<units.length;i++){
        const unit=units[i],generation=this._nextContactGeneration(units.length),pending=this._collectContactOrders(unit,i+1,units.length-1,this._contactPending);
        for(const order of pending)this._contactSeen[order]=generation;
        let cursor=0;
        while(cursor<pending.length){
          const j=pending[cursor++],other=units[j],ax=unit.x,ay=unit.y,bx=other.x,by=other.y,didContact=contact(unit,other);
          if(didContact)this.metrics.contacts++;
          const unitMoved=ax!==unit.x||ay!==unit.y,otherMoved=bx!==other.x||by!==other.y;
          if(unitMoved)this.unitSpatial.update(unit);if(otherMoved)this.unitSpatial.update(other);
          if(unitMoved){
            const extras=this._collectContactOrders(unit,j+1,units.length-1,this._contactExtra);
            for(const order of extras)this._insertContactOrder(order,j,pending,generation);
          }
        }
      }
    }
    resolveFarmContactPairs(units,sameTier){
      for(let i=0;i<units.length;i++){
        const unit=units[i],pending=this._collectContactOrders(unit,i+1,units.length-1,this._contactPending);
        for(const j of pending){const other=units[j];if((unit.tier===other.tier)!==sameTier)continue;this.pair(unit,other,true)}
      }
    }
    avoidNearbyFood(u,dt){
      const radius=1.25;let pushX=0,pushY=0,strongest=0,nearest=null,nearestDistance=Infinity;
      if(!this._spatialStepActive)this._rebuildFoodSpatialIndex();
      this.foodSpatial.queryAABB(u.x-radius,u.y-radius,u.x+radius,u.y+radius,this._foodCandidates);
      this._foodCandidates.sort((a,b)=>(this._foodOrder.get(a)??Infinity)-(this._foodOrder.get(b)??Infinity));
      for(const food of this._foodCandidates){
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
    findNearestGroundFood(x,y){
      if(!this._spatialStepActive)this._rebuildFoodSpatialIndex();
      if(!this._groundedFoodCount)return null;
      const grid=this.foodSpatial,cx=grid.cellX(x),cy=grid.cellY(y);
      if(cx<0||cy<0||cx>=grid.cellCount||cy>=grid.cellCount)return null;
      let nearest=null,nearestDistance=Infinity,nearestOrder=Infinity;
      const maxRing=Math.max(cx,cy,grid.cellCount-1-cx,grid.cellCount-1-cy);
      for(let ring=0;ring<=maxRing;ring++){
        grid.queryCellRing(cx,cy,ring,this._foodCandidates);
        for(const food of this._foodCandidates){const distance=Math.hypot(food.x-x,food.y-y),order=this._foodOrder.get(food)??Infinity;
          if(distance<nearestDistance||distance===nearestDistance&&order<nearestOrder){nearest=food;nearestDistance=distance;nearestOrder=order}}
        if(nearest&&nearestDistance<grid.distanceToOutsideRing(x,y,cx,cy,ring))break;
        if((2*ring+1)*(2*ring+1)>this._groundedFoodCount){nearest=null;nearestDistance=Infinity;nearestOrder=Infinity;for(const food of this._groundedFoods){const distance=Math.hypot(food.x-x,food.y-y);if(distance<nearestDistance){nearest=food;nearestDistance=distance}}break}
      }
      return nearest;
    }
    farmUnit(u, dt) {
      if (u.stun > 0 || u.z > 0.1) return;
      if(!u.mature||u.cooldown>0){if(!this.avoidNearbyFood(u,dt))this.steer(u,Math.sin(this.time*.18+u.seed)*7.4,Math.cos(this.time*.16+u.seed)*5.3,dt,scaleMoveSpeed(.75,u));return}
      if(this.mode==="merge") {
        const task=this.mergeTask;
        if(task?.phase==="approach"&&task.materialIds?.includes(u.id)){const anchor=this._unitById.get(task.materialIds[0]);if(anchor&&u.cooldown<=0)this.steer(u,u.id===anchor.id?u.x:anchor.x,u.id===anchor.id?u.y:anchor.y,dt,scaleMoveSpeed(2.2,u));return}
        this.steer(u,Math.sin(this.time*.18+u.seed)*7.4,Math.cos(this.time*.16+u.seed)*5.3,dt,scaleMoveSpeed(.75,u));return;
      }
      let target = null, best = Infinity;
      if (this.mode === "breed" && !u.fed) {
        target=this.findNearestGroundFood(u.x,u.y);if(target)best=Math.hypot(target.x-u.x,target.y-u.y);
        if (target && best < 0.42) {
          this.food.splice(this.food.indexOf(target), 1);this.foodSpatial.remove(target);this._foodOrder.delete(target);this._removeGroupItem(this._groundedFoods,target);this._groundedFoodCount=Math.max(0,this._groundedFoodCount-1);
          u.meals = 1;
          u.vz = 2;
          this.emit("eat", u.x, u.y, 0.5);
          target = null;
        }
      } else if (this.mode==="breed"&&u.cooldown===0) target=this.findOrReserveMate(u);
      else if (u.cooldown === 0) {
        for (const p of this._speciesGroups[u.species]||[]) {
          if(p===u||p.hp<=0||p.down>0||!p.mature||p.cooldown>0||(this.mode==="breed"&&!p.fed)||(this.mode==="merge"&&!(p.tier===u.tier&&u.tier<CONFIG.maxTier)))continue;
          const d = Math.hypot(p.x - u.x, p.y - u.y);
          if (d < best) {
            best = d;
            target = p;
          }
        }
      }
      const hasDesignatedMate=this.mode==="breed"&&u.fed&&target&&this.units.includes(target);
      if(this.mode==="breed"&&u.fed&&!hasDesignatedMate&&this.avoidNearbyFood(u,dt))return;
      if (target) this.steer(u, target.x, target.y, dt, scaleMoveSpeed(2.2 * (target.phase === "grounded" ? farmUpgradeRate(this.playerProgression?.farmUpgrades,"growth") : 1),u));
      else this.steer(u, Math.sin(this.time * 0.18 + u.seed) * 7.4, Math.cos(this.time * 0.16 + u.seed) * 5.3, dt, scaleMoveSpeed(0.75,u));
    }
    combat(kind,detail){const event=this.notice(kind,{time:this.time,...detail}),toPresentationTime=presentationClocks.get(this);if(toPresentationTime)presentationEventTimes.set(event,toPresentationTime(this.time))}
    boundBody(body,scene,margin){
      const before={x:body.x,y:body.y},p=ArenaGeometry.clamp(before,scene,margin);body.x=p.x;body.y=p.y;
      if(before.x!==p.x||before.y!==p.y){const r=ArenaGeometry.bounds(scene,margin),nx=p.x/(r.x*r.x),ny=p.y/(r.y*r.y),n=Math.hypot(nx,ny)||1,out=((body.vx||0)*nx+(body.vy||0)*ny)/n;
        if(out>0){body.vx-=1.3*out*nx/n;body.vy-=1.3*out*ny/n}}
    }
    separateBoss(u){
      const b=this.boss;if(!areOpposingFactions(u,b)||u.hp<=0||!u.dropLanded||u.z>b.height)return;const dx=u.x-b.x,dy=u.y-b.y,d=Math.hypot(dx,dy),r=b.radius+u.radius;
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
    wheatCommandCritBonusFor(attacker){
      if(!attacker||attacker.hp<=0)return 0;let strongest=0;
      for(const source of this.units){
        if(source.species!==7||source.hp<=0||!hasFaction(source,attacker.faction)||source.wheatCommandUntil<=this.time)continue;
        const config=getWheatCommandConfig(this.abilityProgressionFor(source),source.tier);
        if(!config||Math.hypot(source.x-attacker.x,source.y-attacker.y)>config.radius)continue;
        strongest=Math.max(strongest,Number.isFinite(source.wheatCommandCritBonus)?source.wheatCommandCritBonus:0);
      }
      return Math.max(0,Math.min(1,strongest));
    }
    riceHarvestMultiplier(u,target,kind,hpBefore=target?.hp,maxHp=target?.maxHp){
      if(u.species!==6||kind!==abilityProfile(u.species).kind)return 1;
      const progression=this.abilityProgressionFor(u);
      return getRiceHarvestMultiplier(progression,u.tier,hpBefore,maxHp);
    }
    applyGrainOnBasicHit(u,target,kind){
      if(!hasFaction(u,FACTION_CONFIG.PLAYER)||kind!==abilityProfile(u.species).kind)return;
      const progression=this.abilityProgressionFor(u);
      if(u.species===7){
        const config=getWheatCommandConfig(progression,u.tier);
        if(config)refreshWheatCommandBuff(u,config,this.time,resolveStatusDuration(config.durationSeconds,u,null));
      }else if(u.species===8){
        const config=getBarleyArmorBreakConfig(progression,u.tier);
        if(config)refreshBarleyArmorBreak(target,config,this.time,resolveStatusDuration(config.durationSeconds,u,target));
      }
    }
    damageBoss(u,action,point,{lifestealSource=u,attackMultiplier=null,attackKind=null,strikeIndex=null,area=false,criticalRoll=null}={}){
      if(!hasFaction(u,FACTION_CONFIG.PLAYER)||!areOpposingFactions(u,this.boss)||action.hit||this.boss.hp<=0)return false;action.hit=true;
      const spec=abilityProfile(u.species),roster=this.raidRoster(u.ownerId),buffed=!!roster&&this.time<roster.buffUntil;
      const hpBefore=this.boss.hp,maxHp=this.boss.maxHp;
      const hpRatio=Number.isFinite(hpBefore)&&Number.isFinite(maxHp)&&maxHp>0?clamp(hpBefore/maxHp,0,1):1;
      const baselineArmor=(1-hpRatio)*100,armor=effectiveBarleyArmor(this.boss,baselineArmor,this.time);
      const attackerStats=stats(u.tier,u.species);
      const damageMultiplier=Number.isFinite(attackMultiplier)?attackMultiplier:spec.skillMultiplier,kind=attackKind||spec.kind;
      const harvestMultiplier=this.riceHarvestMultiplier(u,this.boss,kind,hpBefore,maxHp);
      const rawDamage=attackerStats.attackPower*damageMultiplier*(buffed?CONFIG.raid.buffDamage:1)*harvestMultiplier;
      const sourceStatOverrides={critChance:clamp(attackerStats.critChance+this.wheatCommandCritBonusFor(u),0,1)};
      const damage=applyDamageToTargets(lifestealSource,[this.boss],{rawDamage,area,sourceStatOverrides,armorForTarget:()=>armor,roll:()=>criticalRoll??this.random()});
      this.applyGrainOnBasicHit(u,this.boss,kind);
      this.boss.flash=.13;
      const dx=point.x-this.boss.x,dy=point.y-this.boss.y,d=Math.hypot(dx,dy)||1;
      this.combat('boss-hit',{unit:u.id,ownerId:u.ownerId,species:u.species,attackId:action.id,strikeIndex,attackKind:kind,buffed,critical:damage.critical,x:this.boss.x+dx/d*this.boss.radius,y:this.boss.y+dy/d*this.boss.radius,z:clamp(point.z+.2,.2,this.boss.height),nx:dx/d,ny:dy/d,strength:damageMultiplier*(buffed?CONFIG.raid.buffDamage:1)*harvestMultiplier*(damage.critical?attackerStats.critMultiplier:1)});
      this.combatEvent('damage',u,action);return true;
    }
    attackTarget(unit,action){
      if(action?.targetId==='boss'||!action?.targetId)return areOpposingFactions(unit,this.boss)?this.boss:null;
      return this.units.find(candidate=>candidate.id===action.targetId&&candidate.hp>0&&areOpposingFactions(unit,candidate))||null;
    }
    damageUnitTarget(u,action,target,point,{attackMultiplier=null,attackKind=null,strikeIndex=null,area=false,criticalRoll=null}={}){
      if(!target||target.hp<=0||!areOpposingFactions(u,target)||action.hit)return false;action.hit=true;
      const spec=abilityProfile(u.species),roster=this.raidRoster(u.ownerId),buffed=!!roster&&this.time<roster.buffUntil,attackerStats=stats(u.tier,u.species),damageMultiplier=Number.isFinite(attackMultiplier)?attackMultiplier:spec.skillMultiplier,kind=attackKind||spec.kind;
      const targetMaxHp=stats(target.tier,target.species).maxHp,harvestMultiplier=this.riceHarvestMultiplier(u,target,kind,target.hp,targetMaxHp);
      const baselineArmor=stats(target.tier,target.species).armor,armor=effectiveBarleyArmor(target,baselineArmor,this.time),guard=this.receiveWalnutGuard(target);
      const sourceStatOverrides={critChance:clamp(attackerStats.critChance+this.wheatCommandCritBonusFor(u),0,1)};
      const damage=applyDamageToTargets(u,[target],{rawDamage:attackerStats.attackPower*damageMultiplier*(buffed?CONFIG.raid.buffDamage:1)*harvestMultiplier*(guard?.receivedDamageMultiplier??1),area,sourceKind:hasFaction(u,FACTION_CONFIG.PLAYER)?'direct':'enemy',sourceStatOverrides,armorForTarget:()=>armor,roll:()=>criticalRoll??this.random()});this._syncUnitAliveCount(target);
      this.applyGrainOnBasicHit(u,target,kind);
      const dx=target.x-u.x,dy=target.y-u.y,n=Math.hypot(dx,dy)||1;target.knock(dx/n,dy/n,5*(guard?.receivedKnockbackMultiplier??1),2.4*(guard?.receivedKnockbackMultiplier??1),u);
      if(target.hp===0){target.down=target.isBattleOnlySummon?0:CONFIG.corpseRecoverySeconds;this.handleUnitDeath(target)}
      this.metrics.directHits++;this.metrics.basicHits++;
      this.combat('unit-hit',{attackKind:kind,attackId:action.id,strikeIndex,unit:target.id,sourceUnit:u.id,damage:damage?.damage||0,x:point.x,y:point.y,z:Math.max(.15,target.z+.25),nx:dx/n,ny:dy/n,strength:damageMultiplier*(buffed?CONFIG.raid.buffDamage:1)*harvestMultiplier*(damage?.critical?attackerStats.critMultiplier:1)});
      return true;
    }
    damageCombatTarget(u,action,target,point,options={}){return target===this.boss?this.damageBoss(u,action,point,options):this.damageUnitTarget(u,action,target,point,options)}

    explodePopcorn(kernel){
      if(!kernel?.isPopcorn||kernel.exploded)return false;
      const queue=[kernel],queued=new Set();let triggered=false;
      while(queue.length){
        const current=queue.shift();if(!current?.isPopcorn||current.exploded||queued.has(current.id))continue;
        queued.add(current.id);current.exploded=true;current.explosionLife=0;current.hit=true;triggered=true;
        const config=current.popcornConfig,center={x:current.x,y:current.y,z:0},range=config.radius;
        this.effects.push({kind:'popcorn-explosion',x:current.x,y:current.y,z:0,life:0,duration:.5,radius:range,owner:current.owner});
        const owner=this.units.find(candidate=>candidate.id===current.owner)||{id:current.owner,ownerId:current.ownerId||'',faction:current.faction,species:current.species,tier:current.tier,x:current.x,y:current.y,z:0};
        const targets=[];
        if(areOpposingFactions(owner,this.boss)&&!current.damagedTargetIds.includes('boss')&&Math.hypot(current.x-this.boss.x,current.y-this.boss.y)<=range+this.boss.radius)targets.push(this.boss);
        for(const target of this.units)if(target.hp>0&&areOpposingFactions(owner,target)&&!current.damagedTargetIds.includes(target.id)&&Math.hypot(current.x-target.x,current.y-target.y)<=range+target.radius)targets.push(target);
        for(const target of targets){
          const action={id:current.id,hit:false,attackKind:'corn-popcorn-explosion'};
          const applied=target===this.boss?this.damageBoss(owner,action,center,{attackMultiplier:config.damageMultiplier,attackKind:action.attackKind,area:true}):this.damageUnitTarget(owner,action,target,center,{attackMultiplier:config.damageMultiplier,attackKind:action.attackKind,area:true});
          if(applied)current.damagedTargetIds.push(target===this.boss?'boss':target.id);
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
        const target=p.targetId&&p.targetId!=='boss'?this.units.find(u=>u.id===p.targetId&&u.hp>0):this.boss;
        const hit=target?ArenaGeometry.sweep(old,p,p.radius,p.height,target):null;
        if(p.isPopcorn&&(hit||p.elapsed>=p.path.duration)){
          if(hit)Object.assign(p,{x:hit.x,y:hit.y,z:0});else p.z=0;
          p.landed=true;p.fuseRemaining=p.popcornConfig.fuseSeconds;
          this.effects.push({kind:'popcorn-kernel-impact',x:p.x,y:p.y,z:0,life:0,duration:.25,radius:p.radius,owner:p.owner});
        }else if(hit){Object.assign(p,{x:hit.x,y:hit.y,z:hit.z});const source=this.units.find(u=>u.id===p.owner),impactUnit=source||{id:p.owner,ownerId:p.ownerId||'',faction:p.faction,species:p.species,tier:p.tier,x:p.x,y:p.y,z:p.z};if(target===this.boss)this.damageBoss(impactUnit,p,hit,{lifestealSource:source||impactUnit,attackMultiplier:p.attackMultiplier,attackKind:p.projectileKind||'lob'});else this.damageUnitTarget(impactUnit,p,target,hit,{attackMultiplier:p.attackMultiplier,attackKind:p.projectileKind||'lob'})}
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
      if(!u.dropLanded||!areOpposingFactions(u,enemy))return;
      if(u.hp<=0){u.down=CONFIG.corpseRecoverySeconds;u.ability.interrupt();return}
      if(u.ability.update(this,dt)||u.stun>0||u.z>.1||u.landingRecovery>0)return;
      if(!enemy)return;
      const b=enemy,spec=abilityProfile(u.species),dx=u.x-b.x,dy=u.y-b.y,n=Math.hypot(dx,dy)||1,targetId=enemy===this.boss?'boss':enemy.id;
      // Hold the current firing bearing. Ranged troops retreat from a boss that closes in;
      // they never follow a rotating slot through its body to reach the opposite side.
      const stand=b.radius+spec.range+(u.tier-1)*.12,min=stand-.55,max=stand+(spec.kind==='peanut-dual-strike'?0:.55);
      if(n>max||(spec.kind==='lob'&&n<min)){
        const slot=ArenaGeometry.clamp({x:b.x+dx/n*stand,y:b.y+dy/n*stand},this.scene,u.radius);
        this.steer(u,slot.x,slot.y,dt,scaleMoveSpeed(4.1,u));return;
      }
      u.vx=u.vy=0;
      const target=spec.kind==='lob'?{id:targetId,x:b.x,y:b.y}:{id:targetId,x:b.x+dx/n*(b.radius+u.radius-.16),y:b.y+dy/n*(b.radius+u.radius-.16)};
      u.ability.begin(this,target);
    }
    finish(outcome){
      if(!this.running)return;this.running=false;this.boss.active=false;this.encounter.outcome=outcome;this.projectiles=[];this.boss.phase='resting';if(this.boss.patternRuntime)this.boss.patternRuntime.active=null;
      for(const u of this.units)u.ability.interrupt();this.cleanupBattleSummons();this.combat(outcome,{x:this.boss.x,y:this.boss.y,z:0});
    }
    finishFarmBossEvent(outcome){
      if(this.scene!=='farm'||this.farmBossEvent.phase!=='fighting')return false;
      this.cleanupBattleSummons();
      this.boss.active=false;this.boss.phase='resting';this.boss.clock=0;if(this.boss.patternRuntime)this.boss.patternRuntime.active=null;this.projectiles=[];
      const encounterId=this.farmBossEvent.encounterId;
      this.farmBossEvent={phase:'celebrating',elapsed:0,outcome,encounterId,rewardStatus:'none',rewardChance:0,rewardRoll:0,rewardUnitId:0};
      for(const u of this.units)if(u.hp>0)u.ability.interrupt();
      if(outcome==='victory'){
        const settlement=settleBossKill(this,{encounterId,source:'farm',species:this.boss.species,tier:1,x:this.boss.x,y:this.boss.y});
        const reward=settlement.receipt;
        this.combat('farm-boss-xp',{encounterId,xp:settlement.xpAwarded,levelsGained:settlement.levelsGained,pointsAwarded:settlement.pointsAwarded});
        this.combat('farm-boss-reward',{acquired:reward.status==='granted',pending:reward.status==='pending',species:reward.species,tier:reward.tier,chance:reward.chance,roll:reward.roll,encounterId});
      }
      this.combat(outcome==='victory'?'farm-boss-victory':'farm-boss-defeat',{x:this.boss.x,y:this.boss.y,z:0});
      return true;
    }
    bossAttackArea(unitRadius=0){return bossAttackArea(this.boss,unitRadius)}
    bossWeaponPoint(phase=this.boss.phase,q=0){
      const b=this.boss,a=b.patternRuntime?.active,config=BOSS_PATTERN_CONFIG[a?.id];
      if(a?.id==='attack.fan-sweep'){const angle=a.aim-config.sector/2+config.sector*clamp(q,0,1);return{x:b.x+Math.cos(angle)*config.reach,y:b.y+Math.sin(angle)*config.reach,z:b.z+.2}}
      const reach=b.radius-.25+(CONFIG.raid.sweepReach-b.radius+.25)*Math.sin(Math.PI*clamp(q,0,1));return {x:b.x+Math.cos(b.angle)*reach,y:b.y+Math.sin(b.angle)*reach,z:b.z+.2};
    }
    livingBossTargets(){return this.units.filter(u=>hasFaction(u,FACTION_CONFIG.PLAYER)&&u.hp>0&&u.dropLanded).sort((a,b)=>a.id-b.id)}
    nearestBossTarget(living,groundOnly=false){const b=this.boss;let best=null,distance=Infinity;for(const unit of living){if(groundOnly&&unit.z>.1)continue;const next=Math.hypot(unit.x-b.x,unit.y-b.y);if(next<distance||next===distance&&(!best||unit.id<best.id)){best=unit;distance=next}}return best}
    bossTargetGrid(living){
      if(!this._spatialStepActive&&this._spatialQueryDepth===0)this._rebuildUnitSpatialIndex(this.units);
      const b=this.boss,range=CONFIG.raid.perceptionRange,extent=range+CONFIG.maxUnitRadius,units=this._bossGridUnits,groundUnits=this._bossGroundUnits;
      units.length=0;groundUnits.length=0;
      this.unitSpatial.queryAABB(b.x-extent,b.y-extent,b.x+extent,b.y+extent,this._bossQueryCandidates);
      for(const unit of this._bossQueryCandidates){if(!this._unitIsActive(unit)||!hasFaction(unit,FACTION_CONFIG.PLAYER)||unit.hp<=0||!unit.dropLanded||Math.hypot(unit.x-b.x,unit.y-b.y)>range+unit.radius)continue;units.push(unit);if(unit.z<=.1)groundUnits.push(unit)}
      units.sort((a,c)=>a.id-c.id);groundUnits.sort((a,c)=>a.id-c.id);
      return {units,groundUnits,cellSize:3,range};
    }
    eachBossGridUnit(grid,minX,minY,maxX,maxY,visit,groundOnly=false){
      this.unitSpatial.queryAABB(minX,minY,maxX,maxY,this._bossQueryCandidates);
      const b=this.boss;for(const unit of this._bossQueryCandidates){if(!this._unitIsActive(unit)||!hasFaction(unit,FACTION_CONFIG.PLAYER)||unit.hp<=0||!unit.dropLanded||groundOnly&&unit.z>.1||Math.hypot(unit.x-b.x,unit.y-b.y)>grid.range+unit.radius)continue;visit(unit)}
    }
    chargeBossTarget(living,grid=this.bossTargetGrid(living)){
      const b=this.boss,config=BOSS_PATTERN_CONFIG['attack.charge'];if(!grid.units.length)return null;
      // Candidate routes are angularly bucketed, then each route is scored only
      // against occupants of the spatial cells intersecting its swept envelope.
      const bins=72,candidates=new Map();
      for(const unit of grid.units){const dx=unit.x-b.x,dy=unit.y-b.y,d=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),bin=Math.floor((angle+Math.PI)/(Math.PI*2)*bins)%bins,current=candidates.get(bin);if(!current||d<current.distance-1e-9||Math.abs(d-current.distance)<=1e-9&&unit.id<current.unit.id)candidates.set(bin,{unit,distance:d,angle})}
      let best=null;
      for(const candidate of candidates.values()){
        const end=ArenaGeometry.clamp({x:b.x+Math.cos(candidate.angle)*config.reach,y:b.y+Math.sin(candidate.angle)*config.reach},this.scene,b.radius+.25),from={x:b.x,y:b.y,z:b.z},to={x:end.x,y:end.y,z:b.z},extent=b.radius+CONFIG.maxUnitRadius;let score=0;
        this.eachBossGridUnit(grid,Math.min(from.x,to.x)-extent,Math.min(from.y,to.y)-extent,Math.max(from.x,to.x)+extent,Math.max(from.y,to.y)+extent,unit=>{if(ArenaGeometry.sweep(from,to,b.radius,b.height,unit))score++});
        if(score&&(!best||score>best.score||score===best.score&&(candidate.distance<best.distance-1e-9||Math.abs(candidate.distance-best.distance)<=1e-9&&candidate.unit.id<best.unit.id)))best={...candidate,score};
      }
      return best?.unit||null;
    }
    leapBossTarget(living,grid=this.bossTargetGrid(living)){
      const b=this.boss,config=BOSS_PATTERN_CONFIG['attack.leap-slam'];if(!grid.units.length)return null;
      // Leap candidates are clipped to the real maximum landing distance; score
      // the exact landing disk with a spatial-cell query, not a unit-pair pass.
      const candidates=new Map(),size=grid.cellSize;
      for(const unit of grid.groundUnits){let dx=unit.x-b.x,dy=unit.y-b.y,d=Math.hypot(dx,dy)||1;if(d>config.reach){dx*=config.reach/d;dy*=config.reach/d}
        const point=ArenaGeometry.clamp({x:b.x+dx,y:b.y+dy},this.scene,b.radius+.25),cellX=Math.floor(point.x/size),cellY=Math.floor(point.y/size),key=(cellY+64)*128+(cellX+64),distance=Math.hypot(unit.x-b.x,unit.y-b.y),current=candidates.get(key);
        if(!current||distance<current.distance-1e-9||Math.abs(distance-current.distance)<=1e-9&&unit.id<current.unit.id)candidates.set(key,{unit,distance,point});
      }
      let best=null;
      for(const candidate of candidates.values()){
        let score=0;const extent=config.landingRadius+CONFIG.maxUnitRadius;
        this.eachBossGridUnit(grid,candidate.point.x-extent,candidate.point.y-extent,candidate.point.x+extent,candidate.point.y+extent,unit=>{if(Math.hypot(unit.x-candidate.point.x,unit.y-candidate.point.y)<=config.landingRadius+unit.radius)score++},true);
        if(score&&(!best||score>best.score||score===best.score&&(candidate.distance<best.distance-1e-9||Math.abs(candidate.distance-best.distance)<=1e-9&&candidate.unit.id<best.unit.id)))best={...candidate,score};
      }
      return best?.unit||null;
    }
    bossPatternTargets(living){const grid=this.bossTargetGrid(living);return {nearest:this.nearestBossTarget(living,true),charge:this.chargeBossTarget(living,grid),leap:this.leapBossTarget(living,grid)}}
    bossTargetForPattern(id,living){if(id==='attack.charge')return this.chargeBossTarget(living);if(id==='attack.leap-slam')return this.leapBossTarget(living);return this.nearestBossTarget(living,true)}
    eligibleBossPatterns(living,targets=this.bossPatternTargets(living)){
      const runtime=this.boss.patternRuntime,aliveAdds=this.units.reduce((n,u)=>n+(hasFaction(u,FACTION_CONFIG.ENEMY)&&u.hp>0?1:0),0),eligible=[];
      for(const id of BOSS_PATTERN_IDS){if(runtime.cooldowns[id]>1e-9)continue;if(id==='summon.mouth-t1'){if(runtime.encounterElapsed+1e-9>=BOSS_PATTERN_CONFIG[id].firstEligible&&aliveAdds<CONFIG.maxBossSummons)eligible.push(id);continue}
        const target=id==='attack.charge'?targets.charge:id==='attack.leap-slam'?targets.leap:targets.nearest;
        if(!target)continue;
        if(id==='attack.charge'||id==='attack.leap-slam')eligible.push(id);
        else if(Math.hypot(target.x-this.boss.x,target.y-this.boss.y)<=BOSS_PATTERN_CONFIG[id].reach+target.radius+1e-9)eligible.push(id);
      }
      return eligible;
    }
    beginBossPattern(id,target){
      const b=this.boss,runtime=b.patternRuntime,config=BOSS_PATTERN_CONFIG[id];if(!config)return false;
      const targetPoint=target?{x:target.x,y:target.y,z:target.z||0}:null,aim=targetPoint?Math.atan2(targetPoint.y-b.y,targetPoint.x-b.x):b.angle;
      runtime.active={id,phase:'windup',phaseElapsed:0,targetId:target?.id??0,target:targetPoint,aim,locked:false,start:{x:b.x,y:b.y,z:b.z},traveled:0,hitIds:[],volleyCount:0,released:0,nextRelease:0,path:null};
      b.phase='windup';b.clock=0;b.attackKind=id;b.angle=aim;b.facing=aim;b.targetId=target?.id??0;b.hit.clear();
      this.combat('boss-pattern-prepare',{patternId:id,attackKind:id,x:b.x,y:b.y,z:b.z,angle:aim,targetId:b.targetId||0});return true;
    }
    hitBossPatternUnit(unit,patternId,point,normal=null){
      const b=this.boss,action=b.patternRuntime.active,config=BOSS_PATTERN_CONFIG[patternId];if(!action||!config||!hasFaction(unit,FACTION_CONFIG.PLAYER)||!areOpposingFactions(b,unit)||unit.hp<=0||!unit.dropLanded||b.hit.has(unit.id))return false;
      if(config.groundOnly&&unit.z>.1)return false;
      b.hit.add(unit.id);action.hitIds.push(unit.id);
      const dx=normal?.x??unit.x-b.x,dy=normal?.y??unit.y-b.y,n=Math.hypot(dx,dy)||1;
      const guard=this.receiveWalnutGuard(unit),knockbackMultiplier=guard?.receivedKnockbackMultiplier??1;
      unit.knock(dx/n,dy/n,config.knockback*knockbackMultiplier,config.lift*knockbackMultiplier,b);
      if(!hasFaction(unit,FACTION_CONFIG.PLAYER)||!areOpposingFactions(b,unit))return false;
      applyDamageToTargets(null,[unit],{rawDamage:b.attackPower*config.damageMultiplier*(guard?.receivedDamageMultiplier??1),sourceKind:'enemy'});this._syncUnitAliveCount(unit);
      if(unit.hp===0){unit.down=unit.isBattleOnlySummon?0:CONFIG.corpseRecoverySeconds;this.handleUnitDeath(unit)}
      const isSweep=patternId==='attack.sweep-360'||patternId==='attack.fan-sweep';this.metrics.directHits++;this.metrics[isSweep?'sweepHits':'basicHits']++;
      this.combat('unit-hit',{attackKind:patternId,attackId:b.attackId,unit:unit.id,x:point.x,y:point.y,z:Math.max(.15,unit.z+.25),nx:dx/n,ny:dy/n,strength:config.damageMultiplier});return true;
    }
    resolveBossSector(action,patternId,range,sector){
      const b=this.boss,aim=action.aim,half=sector/2;let hits=0;
      const extent=range+CONFIG.maxUnitRadius;for(const unit of this._collectBossTargets(b.x-extent,b.y-extent,b.x+extent,b.y+extent,this._bossHitCandidates,true)){
        if(b.hit.has(unit.id)||unit.z>.1)continue;const dx=unit.x-b.x,dy=unit.y-b.y,d=Math.hypot(dx,dy);if(d>range+unit.radius)continue;
        const offset=Math.atan2(Math.sin(Math.atan2(dy,dx)-aim),Math.cos(Math.atan2(dy,dx)-aim)),pad=d<=unit.radius?Math.PI:Math.asin(Math.min(1,unit.radius/Math.max(d,1e-6)));if(Math.abs(offset)>half+pad)continue;
        const n=d||1;if(this.hitBossPatternUnit(unit,patternId,{x:unit.x,y:unit.y,z:0},{x:dx/n,y:dy/n}))hits++;
      }return hits;
    }
    resolveBossCircle(action,patternId,range){
      const b=this.boss;let hits=0;const extent=range+CONFIG.maxUnitRadius;for(const unit of this._collectBossTargets(b.x-extent,b.y-extent,b.x+extent,b.y+extent,this._bossHitCandidates,true)){if(b.hit.has(unit.id))continue;const dx=unit.x-b.x,dy=unit.y-b.y,d=Math.hypot(dx,dy);if(d>range+unit.radius)continue;if(this.hitBossPatternUnit(unit,patternId,{x:b.x+dx/(d||1)*Math.min(d,range),y:b.y+dy/(d||1)*Math.min(d,range),z:0},{x:dx/(d||1),y:dy/(d||1)}))hits++}return hits;
    }
    sweepBossBody(old,patternId){
      const b=this.boss,extent=b.radius+CONFIG.maxUnitRadius;for(const unit of this._collectBossTargets(Math.min(old.x,b.x)-extent,Math.min(old.y,b.y)-extent,Math.max(old.x,b.x)+extent,Math.max(old.y,b.y)+extent,this._bossHitCandidates)){if(b.hit.has(unit.id))continue;const hit=ArenaGeometry.sweep(old,b,b.radius,b.height,unit);if(hit)this.hitBossPatternUnit(unit,patternId,hit,patternId==='attack.charge'?{x:Math.cos(b.patternRuntime.active.aim),y:Math.sin(b.patternRuntime.active.aim)}:null)}
    }
    fanBossWeapon(action,q0,q1){
      const config=BOSS_PATTERN_CONFIG[action.id],span=config.sector,fromAngle=action.aim-span/2+span*clamp(q0,0,1),toAngle=action.aim-span/2+span*clamp(q1,0,1),b=this.boss;
      const from={x:b.x+Math.cos(fromAngle)*config.reach,y:b.y+Math.sin(fromAngle)*config.reach,z:.2},to={x:b.x+Math.cos(toAngle)*config.reach,y:b.y+Math.sin(toAngle)*config.reach,z:.2};
      const extent=config.reach+config.width+CONFIG.maxUnitRadius;for(const unit of this._collectBossTargets(b.x-extent,b.y-extent,b.x+extent,b.y+extent,this._bossHitCandidates,true)){if(b.hit.has(unit.id))continue;const hit=ArenaGeometry.sweep(from,to,config.width,1.4,unit);if(hit){const dx=unit.x-b.x,dy=unit.y-b.y,n=Math.hypot(dx,dy)||1;this.hitBossPatternUnit(unit,action.id,hit,{x:dx/n,y:dy/n})}}
    }
    bossMouthPoint(){
      // Local coordinates are taken from each troop SVG's authored mouth socket;
      // Chestnut uses the dedicated boss SVG socket instead. Map the socket's
      // local horizontal displacement along the boss's facing plane and its
      // vertical displacement onto the existing 2.5D height axis.
      const anchors=[[176,210,160,350],[140,112,142.5,295],[119,109,130,320],[160,145,160,261],[160,164,160,267],[160,165,160,266]][this.boss.species]||[160,165,160,266],b=this.boss,scale=2*b.radius*1.16/220,forward=(anchors[0]-anchors[2])*scale,vertical=Math.max(0,(anchors[3]-anchors[1])*scale/.785);
      return{x:b.x+Math.cos(b.angle)*forward,y:b.y+Math.sin(b.angle)*forward,z:vertical};
    }
    bossSummonLanding(angle,action=null){
      const b=this.boss,scene=this.scene,radius=unitRadiusForTier(1);
      for(let i=0;i<16;i++){const offset=i===0?0:(i%2?1:-1)*Math.ceil(i/2)*Math.PI/8,a=angle+offset,candidate={x:b.x+Math.cos(a)*BOSS_PATTERN_CONFIG['summon.mouth-t1'].landingRadius,y:b.y+Math.sin(a)*BOSS_PATTERN_CONFIG['summon.mouth-t1'].landingRadius};if(!ArenaGeometry.inside(candidate,scene,radius))continue;const blocked=this.units.some(unit=>unit.hp>0&&Math.hypot(unit.x-candidate.x,unit.y-candidate.y)<radius+unit.radius+.08)||(action?.landingPoints||[]).some(point=>Math.hypot(point.x-candidate.x,point.y-candidate.y)<radius*2+.08);if(!blocked)return candidate}
      return null;
    }
    spawnBossMouthUnit(action){
      if(action.released>=action.volleyCount)return false;
      const b=this.boss,landing=this.bossSummonLanding(action.aim,action),mouth=this.bossMouthPoint();if(!landing)return false;
      const id=CONFIG.bossSummonIdBase+ ++this.bossSummonSerial,unit=new Unit(id,b.species,1,mouth.x,mouth.y),angle=Math.atan2(landing.y-mouth.y,landing.x-mouth.x),flightSeconds=Math.sqrt(2*mouth.z/CONFIG.gravity),horizontalDistance=Math.hypot(landing.x-mouth.x,landing.y-mouth.y),drag=.8,speed=horizontalDistance*drag/(1-Math.exp(-drag*flightSeconds));
      Object.assign(unit,{ownerId:'boss',farmId:0,faction:FACTION_CONFIG.ENEMY,home:{x:mouth.x,y:mouth.y},hp:stats(1,b.species).maxHp,down:0,isBattleOnlySummon:true,battleSummonKind:'boss-mouth-t1',battleSummonParentId:0,battleSummonEncounterId:b.encounterId||1,countsTowardPermanentRoster:false,eligibleForRaidDeployment:false,breedingEligible:false,mergeEligible:false,canSplit:false,usesPersistentSleep:false,lifetime:'until-death-or-battle-end',growthElapsed:unit.growthDuration,growth:CONFIG.matureMeals,meals:1,deathSplitHandled:false,splitUsedThisBattle:true,dropLanded:false,z:mouth.z,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,vz:0,landingRecovery:0,seed:id*2.39996});
      this.units.push(unit);this._trackUnitAdded(unit);action.released++;action.landingPoints||=[];action.landingPoints.push(landing);this.boss.summonMouth=mouth;
      this.combat('boss-mouth-spit',{patternId:action.id,unit:id,species:b.species,x:mouth.x,y:mouth.y,z:mouth.z,landingX:landing.x,landingY:landing.y,sequence:action.released});return true;
    }
    activateBossPattern(action){
      const b=this.boss,runtime=b.patternRuntime,config=BOSS_PATTERN_CONFIG[action.id];action.phase='active';action.phaseElapsed=0;b.phase='active';b.clock=0;b.attackId=++this.attackSerial;b.hit.clear();runtime.cooldowns[action.id]=config.cooldown;
      this.combat('boss-pattern-launch',{patternId:action.id,attackKind:action.id,attackId:b.attackId,x:b.x,y:b.y,z:b.z,angle:action.aim,targetId:action.targetId||0});
      if(action.id==='attack.sweep-360'){this.resolveBossCircle(action,action.id,config.reach);this.enterBossPatternRecovery(action);return}
      if(action.id==='attack.front-slam'){this.resolveBossSector(action,action.id,config.reach,config.sector);this.enterBossPatternRecovery(action);return}
      if(action.id==='attack.charge'){action.start={x:b.x,y:b.y,z:b.z};action.traveled=0;return}
      if(action.id==='attack.leap-slam'){
        let x=action.target?.x??b.x,y=action.target?.y??b.y,dx=x-b.x,dy=y-b.y,d=Math.hypot(dx,dy);if(d>config.reach){x=b.x+dx/d*config.reach;y=b.y+dy/d*config.reach}const land=ArenaGeometry.clamp({x,y},this.scene,b.radius+.25);action.target={x:land.x,y:land.y,z:0};action.path=Ballistics.create({x:b.x,y:b.y,z:0},action.target,'leap');return;
      }
      if(action.id==='summon.mouth-t1'){
        runtime.cooldowns[action.id]=config.cooldown;const alive=this.units.reduce((n,u)=>n+(hasFaction(u,FACTION_CONFIG.ENEMY)&&u.hp>0?1:0),0);action.volleyCount=Math.min(config.volleyCount,Math.max(0,CONFIG.maxBossSummons-alive));action.nextRelease=0;this.spawnBossMouthUnit(action);action.nextRelease=config.releaseInterval;return;
      }
    }
    enterBossPatternRecovery(action){action.phase='recover';action.phaseElapsed=0;this.boss.phase='recover';this.boss.clock=0}
    updateBossPattern(dt,living){
      const b=this.boss,runtime=b.patternRuntime;runtime.encounterElapsed+=dt;for(const id of BOSS_PATTERN_IDS)runtime.cooldowns[id]=Math.max(0,(runtime.cooldowns[id]||0)-dt);
      let action=runtime.active;
      if(!action){const targets=this.bossPatternTargets(living),target=targets.nearest||this.nearestBossTarget(living),eligible=this.eligibleBossPatterns(living,targets),selected=chooseBossPattern(runtime,eligible,()=>this.random());if(selected){const pick=selected==='summon.mouth-t1'?target:selected==='attack.charge'?targets.charge:selected==='attack.leap-slam'?targets.leap:targets.nearest;this.beginBossPattern(selected,pick);action=runtime.active;if(selected==='summon.mouth-t1')runtime.cooldowns[selected]=BOSS_PATTERN_CONFIG[selected].cooldown}else{if(target){const dx=target.x-b.x,dy=target.y-b.y,d=Math.hypot(dx,dy)||1;b.angle=b.facing=Math.atan2(dy,dx);const contact=b.radius+target.radius+.2;if(d>contact){const amount=Math.min(b.moveSpeed*dt,d-contact),next={x:b.x+dx/d*amount,y:b.y+dy/d*amount},bounded=ArenaGeometry.clamp(next,this.scene,b.radius+.25),old={x:b.x,y:b.y,z:b.z};b.x=bounded.x;b.y=bounded.y;b.travel+=Math.hypot(b.x-old.x,b.y-old.y)}}return}}
      if(!action)return;
      action.phaseElapsed+=dt;b.clock=action.phaseElapsed;b.phase=action.phase;
      if(action.phase==='windup'){
        const config=BOSS_PATTERN_CONFIG[action.id],remaining=config.windup-action.phaseElapsed;
        if(!action.locked){const target=this.bossTargetForPattern(action.id,living);if(target){action.targetId=target.id;action.target={x:target.x,y:target.y,z:target.z||0};const desired=Math.atan2(target.y-b.y,target.x-b.x),delta=Math.atan2(Math.sin(desired-action.aim),Math.cos(desired-action.aim));action.aim+=clamp(delta,-BOSS_AIM_TURN_RATE*dt,BOSS_AIM_TURN_RATE*dt);b.angle=b.facing=action.aim;b.targetId=target.id}
          if(remaining<=.25+1e-9){action.locked=true;this.combat('boss-pattern-lock',{patternId:action.id,attackId:b.attackId+1,targetId:action.targetId||0,x:action.target?.x??b.x,y:action.target?.y??b.y,angle:action.aim})}}
        if(action.phaseElapsed>=config.windup-1e-9)this.activateBossPattern(action);return;
      }
      const config=BOSS_PATTERN_CONFIG[action.id];
      if(action.phase==='active'){
        if(action.id==='attack.charge'){
          const direction={x:Math.cos(action.aim),y:Math.sin(action.aim)},remaining=Math.max(0,config.reach-action.traveled),distance=Math.min(config.speed*dt,remaining),old={x:b.x,y:b.y,z:b.z},candidate={x:b.x+direction.x*distance,y:b.y+direction.y*distance},bounded=ArenaGeometry.clamp(candidate,this.scene,b.radius+.25),hitBoundary=Math.hypot(candidate.x-bounded.x,candidate.y-bounded.y)>1e-8;b.x=bounded.x;b.y=bounded.y;const moved=Math.hypot(b.x-old.x,b.y-old.y);action.traveled+=moved;b.travel+=moved;this.sweepBossBody(old,action.id);if(hitBoundary||action.traveled>=config.reach-1e-8||moved<1e-8)this.enterBossPatternRecovery(action);
        }else if(action.id==='attack.leap-slam'){
          const old={x:b.x,y:b.y,z:b.z},p=Ballistics.sample(action.path,action.phaseElapsed/action.path.duration);b.x=p.x;b.y=p.y;b.z=p.z;this.sweepBossBody(old,action.id);
          if(action.phaseElapsed>=action.path.duration){b.x=action.path.to.x;b.y=action.path.to.y;b.z=0;const extent=config.landingRadius+CONFIG.maxUnitRadius;for(const unit of this._collectBossTargets(b.x-extent,b.y-extent,b.x+extent,b.y+extent,this._bossHitCandidates,true)){if(b.hit.has(unit.id))continue;const dx=unit.x-b.x,dy=unit.y-b.y,d=Math.hypot(dx,dy);if(d<=config.landingRadius+unit.radius)this.hitBossPatternUnit(unit,action.id,{x:unit.x,y:unit.y,z:0},{x:dx/(d||1),y:dy/(d||1)})}this.combat('boss-pattern-land',{patternId:action.id,attackId:b.attackId,x:b.x,y:b.y,z:0});this.enterBossPatternRecovery(action)}
        }else if(action.id==='attack.fan-sweep'){
          const q0=Math.max(0,(action.phaseElapsed-dt)/config.active),q1=Math.min(1,action.phaseElapsed/config.active);this.fanBossWeapon(action,q0,q1);if(action.phaseElapsed>=config.active)this.enterBossPatternRecovery(action);
        }else if(action.id==='summon.mouth-t1'){
          while(action.released<action.volleyCount&&action.phaseElapsed+1e-9>=action.nextRelease){if(!this.spawnBossMouthUnit(action))break;action.nextRelease+=config.releaseInterval}if(action.phaseElapsed>=config.active)this.enterBossPatternRecovery(action);
        }return;
      }
      if(action.phase==='recover'&&action.phaseElapsed>=config.recover){runtime.active=null;b.phase='chase';b.clock=0;b.targetId=0}
    }
    updateBoss(dt){
      const b=this.boss;
      if(this.scene==='farm'&&this.farmBossEvent.phase!=='idle'){
        const event=this.farmBossEvent;
        if(event.phase==='dropping'){event.elapsed+=dt;b.z=Math.max(0,CONFIG.raid.dropHeight-.5*CONFIG.gravity*event.elapsed*event.elapsed);if(b.z===0){event.phase='fighting';event.elapsed=0;b.phase='chase';this.combat('farm-boss-land',{x:b.x,y:b.y,z:0})}return}
        if(event.phase==='fighting'){event.elapsed+=dt;if(b.hp<=0){this.finishFarmBossEvent('victory');return}if(!this.units.some(u=>hasFaction(u,FACTION_CONFIG.PLAYER)&&u.hp>0&&u.dropLanded)){this.finishFarmBossEvent('defeat');return}}
        else if(event.phase==='celebrating'){event.elapsed+=dt;b.clock=event.elapsed;const duration=event.outcome==='defeat'?CONFIG.farmBossEvent.celebrationSeconds:CONFIG.farmBossEvent.fadeSeconds;if(event.elapsed>=duration){event.phase='fading';event.elapsed=0;b.clock=0}return}
        else if(event.phase==='fading'){event.elapsed+=dt;b.clock=event.elapsed;if(event.elapsed>=CONFIG.farmBossEvent.fadeSeconds){this.farmBossEvent={phase:'idle',elapsed:0,outcome:'idle',encounterId:0,rewardStatus:'none',rewardChance:0,rewardRoll:0,rewardUnitId:0};this.boss=this.createBoss()}return}
      }
      if(!b.active)return;if(b.hp<=0){if(this.running)this.finish('victory');else{b.active=false;b.phase='resting'}return}
      if(this.running&&this.raidRosters.length&&this.raidRosters.every(r=>r.troops.every(t=>t.deployed))&&!this.units.some(u=>hasFaction(u,FACTION_CONFIG.PLAYER)&&u.hp>0)){this.finish('defeat');return}
      const living=this.livingBossTargets();if(!living.length)return;if(b.phase==='resting')b.phase='chase';this.updateBossPattern(dt,living);
    }

  };


export {Garden,Unit,AttackCycle,FARM_UPGRADE_NODES,ATTACK_TYPES,ArenaGeometry,Ballistics,CONFIG,clamp,stats,bossAttackArea};
