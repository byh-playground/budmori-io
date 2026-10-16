import assert from 'node:assert/strict';
import {farmBreedingCooldown,farmSleepSeconds,splitArcProgress} from '../src/farm-indicators.js';
globalThis.BloomGamekitDeterministic=await import('../vendor/upstream/deterministic.js');
const {CONFIG,Garden}=await import('../src/farm-model.js');
const {restore,snapshot}=await import('../src/farm-state.js');

function ready(unit,{meals=1,x=0,y=0}={}){
  Object.assign(unit,{meals,growth:CONFIG.matureMeals,growthElapsed:CONFIG.breedGrowthSeconds,growthDuration:CONFIG.breedGrowthSeconds,x,y,vx:0,vy:0,vz:0,z:0,cooldown:0,down:0});
  return unit;
}

const breeding=new Garden(701),[parentA,parentB]=breeding.units;
ready(parentA,{x:0,y:0});ready(parentB,{x:.1,y:0});
assert.equal(breeding.pair(parentA,parentB),true);
assert.equal(parentA.meals,0,'breeding consumes the parent readiness meal');
assert.equal(farmBreedingCooldown(parentA,breeding,CONFIG.breedCooldownSeconds).progress,0,'the newly started breeding ring begins empty');
breeding.step(CONFIG.breedCooldownSeconds/2);
assert.equal(farmBreedingCooldown(parentA,breeding,CONFIG.breedCooldownSeconds).progress,.5,'the breeding ring fills as its simulation cooldown elapses');
const loadedBreeder=restore(snapshot(breeding)).units.find(unit=>unit.id===parentA.id);
assert.equal(farmBreedingCooldown(loadedBreeder,{scene:'farm'},CONFIG.breedCooldownSeconds).progress,.5,'saved breeding state keeps the same cooldown kind and progress');

// Older 0.4.x saves lack cooldownDuration. Restore fills it from the still-authoritative
// cooldown; the existing meals invariant still distinguishes a breeding parent.
const legacyBreeding=snapshot(breeding);
delete legacyBreeding.units.find(unit=>unit.id===parentA.id).cooldownDuration;
const legacyBreeder=restore(legacyBreeding).units.find(unit=>unit.id===parentA.id);
assert.equal(farmBreedingCooldown(legacyBreeder,{scene:'farm'},CONFIG.breedCooldownSeconds)?.remaining,legacyBreeder.cooldown);

const merging=new Garden(702);merging.mode='merge';
const [mergeA,mergeB]=merging.units;
ready(mergeA,{x:0,y:0});ready(mergeB,{x:.1,y:0});
const mergeThird=merging.spawn(0,1,.2,0);
assert.equal(merging.pair(mergeA,mergeB),true);
const offspring=merging.units.find(unit=>unit!==mergeThird);
assert.equal(offspring.meals,1,'merge offspring retains the meal assigned by merge rules');
assert.equal(offspring.cooldown>0,true);
assert.equal(farmBreedingCooldown(offspring,merging,CONFIG.breedCooldownSeconds),null,'merge-rest cooldown does not masquerade as a breeding ring');
const loadedOffspring=restore(snapshot(merging)).units.find(unit=>unit.id===offspring.id);
assert.equal(farmBreedingCooldown(loadedOffspring,{scene:'farm'},CONFIG.breedCooldownSeconds),null,'the no-ring merge state survives save/load');
const legacyMerge=snapshot(merging);
delete legacyMerge.units.find(unit=>unit.id===offspring.id).cooldownDuration;
const oldLoadedOffspring=restore(legacyMerge).units.find(unit=>unit.id===offspring.id);
assert.equal(farmBreedingCooldown(oldLoadedOffspring,{scene:'farm'},CONFIG.breedCooldownSeconds),null,'legacy merge cooldown remains distinct without adding a persisted cooldown-kind field');

const attackTick={hp:10,down:0,meals:1,cooldown:0,ability:{phase:'recover'}};
assert.equal(farmBreedingCooldown(attackTick,{scene:'farm'},CONFIG.breedCooldownSeconds),null,'an attack recovery phase is not a Farm cooldown ring');
assert.equal(farmBreedingCooldown({...attackTick,meals:0,cooldown:4},{scene:'raid'},CONFIG.breedCooldownSeconds),null,'Farm breeding rings are hidden in Raid');

const sleeper={hp:0,down:60};
assert.equal(farmSleepSeconds(sleeper,'farm'),60);
sleeper.down=30;
assert.equal(farmSleepSeconds(sleeper,'farm'),30);
sleeper.down=0;
assert.equal(farmSleepSeconds(sleeper,'farm'),0,'the badge disappears when recovery reaches zero');
sleeper.down=30;
assert.equal(farmSleepSeconds(sleeper,'raid'),0,'Raid does not display persistent Farm recovery');

assert.deepEqual(splitArcProgress(.25),{rear:[0,Math.PI/2],front:null});
assert.deepEqual(splitArcProgress(.75),{rear:[0,Math.PI],front:[Math.PI,Math.PI*1.5]},'the ring is split into rear and front ground halves');
assert.deepEqual(splitArcProgress(0),{rear:null,front:null});
console.log('Farm recovery indicator unit checks passed');
