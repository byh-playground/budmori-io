import {UNIT_CAPABILITY_COMPOSITIONS,unitCapabilityComposition} from './unit-abilities.js';
import {scaleAttackRecovery,scaleAttackArea,resolveStatusDuration} from './unit-stats.js';
import {createPeanutStrikeSchedule,resolveStrikeMask,PEANUT_BASE_STRIKE} from './unit-combat-patterns.js';
import {
  createBeanSplitDescriptors,getCornBurstConfig,createCornBurstShotSchedule,getPopcornExplosionConfig,
  getChestnutSpikeConfig,getChestnutSpikeIntervalSeconds,getContinuousLeapConfig,shouldResetLeapCooldown,
  getLandingShockwaveConfig,getPeanutAssaultConfig,getWalnutGuardConfig,isWalnutGuardActive,
  getRiceHarvestMultiplier,getWheatCommandConfig,refreshWheatCommandBuff,
  getBarleyArmorBreakConfig,refreshBarleyArmorBreak
} from './species-abilities.js';

// One-time subclass composition exposes flat cycle methods. Each capability
// owns its state transitions; the historical action/unit field names are the
// save contract, not a second copy or another component hierarchy.
export function composeUnitAttackCycles(Cycle,{ArenaGeometry,Ballistics,CONFIG}) {
  const PathMotion=Base=>class extends Base {
    resolveAttackHit(sim,action,target,point,options){return sim.damageCombatTarget(this.owner,action,target,point,options)}
    createAttackPath(){
      const u=this.owner,a=this.action;
      a.path=Ballistics.create(u,a.target,this.spec.kind);
      if(this.composition.useActiveDuration)a.path.duration=this.spec.active??a.path.duration;
    }
    integrate(dt){
      const u=this.owner,a=this.action;
      if(this.phase!=='active'||!a?.path||u.stun>0||u.down>0||u.landingRecovery>0||u.z>.1&&!(a.path.height>0))return false;
      const p=Ballistics.sample(a.path,this.elapsed/a.path.duration);
      u.vx=(p.x-u.x)/dt;u.vy=(p.y-u.y)/dt;u.vz=(p.z-u.z)/dt;
      u.x=p.x;u.y=p.y;u.z=p.z;u.flash=Math.max(0,u.flash-dt);u.bounce=Math.max(0,u.bounce-dt);return true;
    }
  };
  const ContactAttack=Base=>class extends PathMotion(Base) {
    afterMove(sim,old){
      const a=this.action,u=this.owner,target=sim.attackTarget(u,a);
      if(this.phase!=='active'||!a?.path)return;
      if(!target||target.hp<=0){this.interrupt();return}
      const areaRadius=scaleAttackArea(u.radius,u),hit=!a.hit&&ArenaGeometry.sweep(old,u,areaRadius,.65,target);
      if(hit){
        this.resolveAttackHit(sim,a,target,hit,{attackMultiplier:this.spec.skillMultiplier,attackKind:this.spec.kind});
        if(this.composition.contactRecoil){u.x=hit.x;u.y=hit.y;u.z=hit.z;this.recover(sim,true);return}
      }
      if(this.elapsed>=a.path.duration){
        u.z=0;u.vz=0;u.vx=u.vy=0;
        if(this.landAttack?.(sim,target))return;
        this.recover(sim,true);
      }
    }
  };
  const RepeatedStrike=Base=>class extends PathMotion(Base) {
    get strikeDuration(){return this.spec.active??PEANUT_BASE_STRIKE.activeSeconds}
    prepareAttack(sim){
      super.prepareAttack?.(sim);
      const assault=this.strikeConfig?.(sim);
      Object.assign(this.action,{resolvedMask:0,hitMask:0,peanutStrikeCount:assault?.strikeCount||PEANUT_BASE_STRIKE.count,peanutAttackMultiplier:assault?.attackMultiplier??PEANUT_BASE_STRIKE.attackMultiplier,peanutSpreadRadians:assault?.spreadRadians??PEANUT_BASE_STRIKE.spreadRadians});
    }
    createAttackPath(){
      const u=this.owner;
      this.action.path={from:{x:u.x,y:u.y,z:0},to:{x:u.x,y:u.y,z:0},height:0,duration:this.strikeDuration};
    }
    afterMove(sim){
      const a=this.action,u=this.owner;
      if(this.phase!=='active'||!a?.path)return;
      const schedule=createPeanutStrikeSchedule({strikeCount:a.peanutStrikeCount||2,attackMultiplier:a.peanutAttackMultiplier??PEANUT_BASE_STRIKE.attackMultiplier,spreadRadians:a.peanutSpreadRadians??Math.PI/12,activeSeconds:this.strikeDuration});
      for(const slot of schedule){
        if(this.elapsed+1e-9<slot.dueSeconds||((a.resolvedMask||0)&(1<<slot.strikeIndex))!==0)continue;
        const target=sim.attackTarget(u,a);let hit=null;
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
        const didHit=!!hit&&this.resolveAttackHit(sim,strikeAction,target,hit,{attackMultiplier:slot.attackMultiplier,attackKind:this.spec.kind,strikeIndex:slot.strikeIndex});
        const masks=resolveStrikeMask(a,slot.strikeIndex,didHit);if(masks)Object.assign(a,masks);
      }
      if(this.elapsed>=this.strikeDuration-1e-9){u.z=0;u.vz=0;this.recover(sim,false)}
    }
  };
  const ProjectileAttack=Base=>class extends PathMotion(Base) {
    projectileShots(){return [{shotIndex:0,delaySeconds:0,attackMultiplier:this.spec.skillMultiplier}]}
    launchAttack(sim){
      super.launchAttack?.(sim);
      const u=this.owner,a=this.action,popcorn=this.projectileEffect?.(sim)||null,shots=this.projectileShots(sim);
      a.pendingShots=shots.slice(1);a.projectileAbility={popcorn};
      sim.spawnLobProjectile(u,a,shots[0],popcorn);this.recover(sim,true);
    }
    updateRecovery(sim){
      super.updateRecovery?.(sim);
      const pending=this.action?.pendingShots||[];
      while(pending.length&&pending[0].delaySeconds<=this.elapsed+1e-9){
        const shot=pending.shift();sim.spawnLobProjectile(this.owner,this.action,shot,this.action.projectileAbility?.popcorn||null);
      }
    }
  };
  const Landing=Base=>class extends Base {
    landAttack(sim,target){
      if(super.landAttack?.(sim,target))return true;
      const u=this.owner,a=this.action;
      u.bounce=.2;sim.combatEvent('land-attack',u,a);
      if(!a.hit&&ArenaGeometry.overlaps({x:u.x,y:u.y,z:0,radius:scaleAttackArea(u.radius+.35,u),height:.65},target))this.resolveAttackHit(sim,a,target,u,{attackMultiplier:this.spec.skillMultiplier,attackKind:this.spec.kind});
      return this.resolveLandingEffects?.(sim)||false;
    }
  };
  const LandingShockwave=Base=>class extends Base {
    resolveLandingEffects(sim){
      const reset=super.resolveLandingEffects?.(sim),u=this.owner;
      const config=getLandingShockwaveConfig(sim.abilityProgressionFor(u),u.tier);
      if(config)sim.triggerLandingShockwave(u,this.action,config);
      return reset;
    }
  };
  const LeapReset=Base=>class extends Base {
    resolveLandingEffects(sim){
      if(super.resolveLandingEffects?.(sim))return true;
      const u=this.owner,config=getContinuousLeapConfig(sim.abilityProgressionFor(u),u.tier);
      if(!config||!shouldResetLeapCooldown(config,sim.random()))return false;
      this.ready();sim.combat('leap-cooldown-reset',{unit:u.id,ownerId:u.ownerId,species:u.species});return true;
    }
  };
  const Assault=Base=>class extends Base {
    strikeConfig(sim){return getPeanutAssaultConfig(sim.abilityProgressionFor(this.owner),this.owner.tier)}
  };
  const BurstFire=Base=>class extends Base {
    projectileShots(sim){
      const u=this.owner,config=getCornBurstConfig(sim.abilityProgressionFor(u),u.tier);
      return config?createCornBurstShotSchedule(config,{activeSeconds:0,recoverySeconds:scaleAttackRecovery(this.spec.recovery,u)}):super.projectileShots(sim);
    }
  };
  const Popcorn=Base=>class extends Base {
    projectileEffect(sim){return getPopcornExplosionConfig(sim.abilityProgressionFor(this.owner),this.owner.tier)}
  };
  const Guard=Base=>class extends Base {
    resetCombatEffects(){super.resetCombatEffects?.();this.owner.walnutEmpoweredNextBasic=false}
    prepareAttack(sim){
      super.prepareAttack?.(sim);
      const u=this.owner,guard=getWalnutGuardConfig(sim.abilityProgressionFor(u),u.tier);
      Object.assign(this.action,{walnutEmpowered:!!guard&&u.walnutEmpoweredNextBasic,walnutGuardUsed:false});
      u.walnutEmpoweredNextBasic=false;
    }
    guardConfig(sim){
      const u=this.owner,config=getWalnutGuardConfig(sim.abilityProgressionFor(u),u.tier);
      return isWalnutGuardActive(u,config,scaleAttackRecovery(this.spec.recovery,u))?config:null;
    }
    receiveGuard(sim){
      const config=this.guardConfig(sim);if(!config)return null;
      this.action.walnutGuardUsed=true;this.owner.walnutEmpoweredNextBasic=true;
      const u=this.owner;sim.combat('walnut-guard',{unit:u.id,x:u.x,y:u.y,z:u.z});return config;
    }
    resolveAttackHit(sim,action,target,point,options){
      return action.walnutEmpowered?sim.triggerWalnutSlam(this.owner,action,target,point):super.resolveAttackHit(sim,action,target,point,options);
    }
  };
  const LaunchFan=Base=>class extends Base {
    onLaunch(sim,action){
      super.onLaunch?.(sim,action);
      const u=this.owner,config=getChestnutSpikeConfig(sim.abilityProgressionFor(u),u.tier);
      if(!config||sim.projectiles.length+config.projectileCount>CONFIG.maxRaidProjectiles)return;
      const cycleSeconds=this.spec.windup+scaleAttackRecovery(this.spec.recovery,u),interval=getChestnutSpikeIntervalSeconds(config,cycleSeconds);
      if(!Number.isFinite(interval)||interval<=0)return;
      u.chestnutBasicCycles++;
      if(u.chestnutBasicCycles%config.intervalBasicCycles===0)sim.spawnChestnutSpikes(u,action,config);
    }
  };
  const DeathSplit=Base=>class extends Base {
    deathSplitDescriptors(sim,inBattle){return createBeanSplitDescriptors({unit:this.owner,progression:sim.abilityProgressionFor(this.owner),inBattle})}
  };
  const Harvest=Base=>class extends Base {
    harvestMultiplier(sim,hp,maxHp){return getRiceHarvestMultiplier(sim.abilityProgressionFor(this.owner),this.owner.tier,hp,maxHp)}
  };
  const CommandAura=Base=>class extends Base {
    commandAuraConfig(sim){return getWheatCommandConfig(sim.abilityProgressionFor(this.owner),this.owner.tier)}
    onBasicHit(sim,target){
      super.onBasicHit?.(sim,target);
      const u=this.owner,config=this.commandAuraConfig(sim);
      if(config)refreshWheatCommandBuff(u,config,sim.time,resolveStatusDuration(config.durationSeconds,u,null));
    }
  };
  const ArmorBreak=Base=>class extends Base {
    onBasicHit(sim,target){
      super.onBasicHit?.(sim,target);
      const u=this.owner,config=getBarleyArmorBreakConfig(sim.abilityProgressionFor(u),u.tier);
      if(config)refreshBarleyArmorBreak(target,config,sim.time,resolveStatusDuration(config.durationSeconds,u,target));
    }
  };

  const attacks={contact:ContactAttack,projectile:ProjectileAttack,repeatedStrike:RepeatedStrike};
  const traits={landing:Landing,landingShockwave:LandingShockwave,leapReset:LeapReset,assault:Assault,burstFire:BurstFire,popcorn:Popcorn,guard:Guard,launchFan:LaunchFan,deathSplit:DeathSplit,harvest:Harvest,commandAura:CommandAura,armorBreak:ArmorBreak};
  const mixin=(Base,...capabilities)=>{
    for(const capability of new Set(capabilities))Base=capability(Base);
    return Base;
  };
  const classes=new Map();
  for(const definition of Object.values(UNIT_CAPABILITY_COMPOSITIONS)){
    // Function identity dedupes selected traits at class construction only.
    classes.set(definition,mixin(Cycle,attacks[definition.attack],...definition.traits.map(name=>traits[name])));
  }
  return owner=>new (classes.get(unitCapabilityComposition(owner.species)))(owner);
}
