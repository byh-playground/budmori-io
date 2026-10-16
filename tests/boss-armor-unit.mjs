import assert from 'node:assert/strict';

// farm-model.js receives the deterministic PRNG from the official GameKit bundle.
// These unit cases call the common boss-damage path directly and do not need a browser.
globalThis.BloomGamekitDeterministic={SeededPRNG:class SeededPRNG{}};
const {Garden,CONFIG}=await import('../src/farm-model.js');

function scenario({hp=2400,maxHp=2400,species=0,tier=1,buffed=false}={}){
  const events=[];
  const world=Object.create(Garden.prototype);
  Object.assign(world,{
    boss:{x:0,y:0,radius:4.4,height:5.2,hp,maxHp,flash:0},
    time:0,
    raidRoster:()=>buffed?{buffUntil:10}:null,
    combat:(type,event)=>events.push({type,event}),
    combatEvent:()=>{},
    progress:{record:()=>{}}
  });
  const unit={id:1,ownerId:'solo',species,tier};
  const action={hit:false};
  const applied=world.damageBoss(unit,action,{x:1,y:0,z:0});
  return {world,unit,action,events,applied};
}

function close(actual,expected,tolerance=1e-9){
  assert.ok(Math.abs(actual-expected)<=tolerance,`expected ${actual} ≈ ${expected}`);
}

// Full health has no armor; 50% health gives 50 armor and 1/1.5 received damage.
const full=scenario();
assert.equal(full.applied,true);
close(full.world.boss.hp,2396);
close(scenario({species:1}).world.boss.hp,2400-6.4);
close(scenario({species:2}).world.boss.hp,2400-5.2);
close(scenario({tier:4}).world.boss.hp,2400-10.368);
const half=scenario({hp:1200});
close(half.world.boss.hp,1200-4*100/150);

// Near-empty health approaches the 100-armor / half-damage limit without overkill.
const nearEmpty=scenario({hp:5});
close(nearEmpty.world.boss.hp,5-(4*100/(100+(1-5/2400)*100)));
close(5-nearEmpty.world.boss.hp,2.0020855,1e-6);

// Existing tier/species/buff damage is still calculated before armor.
const buffedHalf=scenario({hp:1200,buffed:true});
close(buffedHalf.world.boss.hp,1200-(4*CONFIG.raid.buffDamage)*100/150);

// Armor is derived from current HP each hit, so restoring health restores damage taken.
const recovering=scenario({hp:1200});
recovering.world.boss.hp=2400;
recovering.world.damageBoss({...recovering.unit,id:2},{hit:false},{x:1,y:0,z:0});
close(recovering.world.boss.hp,2396);

// Invalid zero max HP safely means no derived armor; a defeated boss remains guarded.
const noMax=scenario({hp:10,maxHp:0});
close(noMax.world.boss.hp,6);
const defeated=scenario({hp:0});
assert.equal(defeated.applied,false);
assert.equal(defeated.world.boss.hp,0);
assert.equal(defeated.action.hit,false);

console.log('boss armor unit checks passed');
