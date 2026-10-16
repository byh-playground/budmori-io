import assert from 'node:assert/strict';

globalThis.BloomGamekitDeterministic = await import('../vendor/upstream/deterministic.js');
assert.equal(typeof globalThis.BloomGamekitDeterministic.SeededPRNG, 'function', 'use the pinned GameKit PRNG API');
const {Garden, Unit, CONFIG, TREE_NODES} = await import('../src/farm-model.js');
const {snapshot, restore} = await import('../src/farm-state.js');
const {parseSave} = await import('../src/farm-storage.js');

function ready(unit, {tier = unit.tier, meals = 1, x = 0, y = 0} = {}) {
  unit.tier = tier;
  unit.growth = CONFIG.matureMeals;
  unit.growthDuration = CONFIG.breedGrowthSeconds;
  unit.growthElapsed = unit.growthDuration;
  unit.meals = meals;
  unit.cooldown = 0;
  unit.x = x;
  unit.y = y;
  unit.vx = unit.vy = unit.vz = 0;
  unit.z = 0;
  return unit;
}

function addPea(world, tier = 1, x = 0, y = 0) {
  return ready(world.spawn(0, tier, x, y), {tier, x, y});
}

function advance(world, seconds, step = 0.1) {
  const count = Math.round(seconds / step);
  for (let i = 0; i < count; i++) world.step(step);
}

const adultSize = tier => (0.55 + 0.1 * tier);

// A new garden has two adult, hungry T1 peas; the old 60s unit timer is gone.
const start = new Garden(7);
assert.equal(start.units.length, 2);
assert.deepEqual(start.units.map(({species, tier, growthElapsed, growthDuration, meals, cooldown}) => ({species, tier, growthElapsed, growthDuration, meals, cooldown})), [
  {species: 0, tier: 1, growthElapsed: CONFIG.breedGrowthSeconds, growthDuration: CONFIG.breedGrowthSeconds, meals: 0, cooldown: 0},
  {species: 0, tier: 1, growthElapsed: CONFIG.breedGrowthSeconds, growthDuration: CONFIG.breedGrowthSeconds, meals: 0, cooldown: 0}
]);
start.step(CONFIG.starterSeconds + 1);
assert.equal(start.units.length, 2, 'automatic unit production stays removed after 60 seconds');

// Automatic food taps remain active independently of unit production.
const autoFood = new Garden(8);
for (let i = 0; i < 25; i++) autoFood.advanceAutoTaps(0.1);
assert.equal(autoFood.foodTaps.produced, 1, 'five automatic taps still produce food');
assert.equal(autoFood.units.length, 2);

// A single meal prepares an adult; both readiness flags trigger an immediate birth and are consumed.
const breeding = new Garden(9);
const [parentA, parentB] = breeding.units;
ready(parentA, {meals: 1, x: 0, y: 0});
ready(parentB, {meals: 0, x: 0.1, y: 0});
assert.equal(breeding.pair(parentA, parentB), false, 'both parents need one meal');
parentB.meals = 1;
assert.equal(breeding.pair(parentA, parentB), true);
assert.equal(breeding.units.length, 3);
assert.equal(breeding.metrics.births, 1);
assert.equal(parentA.meals + parentB.meals, 0, 'each parent must eat again after breeding');
assert.equal(parentA.cooldown, CONFIG.breedCooldownSeconds);
assert.equal(parentB.cooldown, CONFIG.breedCooldownSeconds);
assert.equal(parentA.cooldownDuration, CONFIG.breedCooldownSeconds, 'breeding stores the full cooldown duration for its foot arc');
assert.equal(restore(snapshot(breeding)).units[0].cooldownDuration, CONFIG.breedCooldownSeconds, 'cooldown arc duration survives save/load');
const child = breeding.units.find(unit => unit !== parentA && unit !== parentB);
assert.deepEqual({species: child.species, tier: child.tier, growthElapsed: child.growthElapsed, growthDuration: child.growthDuration, meals: child.meals, cooldown: child.cooldown},
  {species: 0, tier: 1, growthElapsed: 0, growthDuration: CONFIG.breedGrowthSeconds, meals: 0, cooldown: 0});
assert.equal(child.mature, false);
assert.equal(child.size, adultSize(1) * 0.5, 'offspring starts at half its tier base size');
advance(breeding, 2.5);
assert.equal(child.mature, false);
assert.ok(Math.abs(child.size - adultSize(1) * 0.75) < 1e-12, 'half of simulation growth time gives 75% size');
advance(breeding, 2.5);
assert.equal(child.mature, true, 'offspring reaches adulthood after five simulation seconds');
assert.equal(child.size, adultSize(1));
assert.ok(Math.abs(parentA.cooldown - 5) < 1e-12, 'cooldown counts down in simulation time');

// A parent can consume its next meal at the exact ten-second cooldown boundary.
const boundary = new Garden(24);
const [boundaryA, boundaryB] = boundary.units;
ready(boundaryA, {meals: 1, x: 0, y: 0});
ready(boundaryB, {meals: 1, x: 0.1, y: 0});
assert.equal(boundary.pair(boundaryA, boundaryB), true);
advance(boundary, 9.9);
assert.ok(boundaryA.cooldown > 0, 'cooldown remains active just before ten seconds');
assert.equal(boundaryA.meals, 0, 'parent has no readiness meal during cooldown');
boundaryA.x = 0; boundaryA.y = 0; boundaryA.vx = boundaryA.vy = 0;
boundary.food = [{phase: 'grounded', x: 0, y: 0, z: 0, seed: 5}];
boundary.step(0.1);
assert.equal(boundaryA.cooldown, 0, 'cooldown reaches zero at ten seconds');
assert.equal(boundaryA.meals, 1, 'adult consumes one meal exactly at the cooldown boundary');
assert.equal(boundary.food.length, 0);

// Immature and breeding-cooldown units avoid nearby grounded food without consuming it.
const avoidance = new Garden(10);
const avoidImmature = avoidance.units[0];
avoidance.units = [avoidImmature];
Object.assign(avoidImmature, {x: 0, y: 0, vx: 0, vy: 0, meals: 0, growthElapsed: 0, growthDuration: CONFIG.breedGrowthSeconds, cooldown: 0});
avoidance.food = [{phase: 'grounded', x: 0.3, y: 0, z: 0, seed: 1}];
avoidance.step(0.1);
assert.equal(avoidImmature.meals, 0);
assert.equal(avoidance.food.length, 1);
assert.ok(Math.hypot(avoidImmature.x - 0.3, avoidImmature.y) > 0.3, 'immature unit gently moves away from food');

const cooling = new Garden(11);
const coolingParent = cooling.units[0];
cooling.units = [coolingParent];
Object.assign(coolingParent, {x: 0, y: 0, vx: 0, vy: 0, meals: 0, cooldown: 10});
cooling.food = [{phase: 'grounded', x: 0.3, y: 0, z: 0, seed: 2}];
cooling.step(0.1);
assert.equal(coolingParent.cooldown, 9.9);
assert.equal(coolingParent.meals, 0);
assert.equal(cooling.food.length, 1);
assert.ok(Math.hypot(coolingParent.x - 0.3, coolingParent.y) > 0.3, 'cooling parent gently moves away from food');
coolingParent.cooldown = 0;
coolingParent.x = 0;
coolingParent.y = 0;
cooling.food[0].x = 0.3;
cooling.food[0].y = 0;
cooling.step(0.1);
assert.equal(coolingParent.meals, 1, 'an adult consumes exactly one food after cooldown');
assert.equal(cooling.food.length, 0);

// A fed adult with a designated mate prioritizes the mate over food avoidance and never eats again.
const fedPair = new Garden(19);
const [fedAdult, fedMate] = fedPair.units;
ready(fedAdult, {meals: 1, x: -2, y: 0});
ready(fedMate, {meals: 1, x: 2, y: 0});
fedPair.food = [{phase: 'grounded', x: 0, y: 0, z: 0, seed: 3}];
advance(fedPair, 3);
assert.equal(fedPair.metrics.births, 1, 'two prepared adults reach each other and breed across food');
assert.equal(fedAdult.meals, 0, 'breeding consumes readiness, not food');
assert.equal(fedMate.meals, 0);
assert.equal(fedPair.food.length, 1, 'prepared adults pass food without consuming it');

// Once no mate is available, a fed adult returns to gentle food avoidance.
const fedAvoidance = new Garden(20);
const [fedLone, fedRemovedMate] = fedAvoidance.units;
ready(fedLone, {meals: 1, x: 0, y: 0});
ready(fedRemovedMate, {meals: 1, x: 2, y: 0});
fedAvoidance.food = [{phase: 'grounded', x: 0.3, y: 0, z: 0, seed: 4}];
fedAvoidance.step(0.1);
assert.ok(fedLone.x > 0, 'a designated mate takes precedence while food lies ahead');
fedAvoidance.units = [fedLone];
advance(fedAvoidance, 1);
assert.equal(fedLone.mateId, 0, 'removing a partner safely releases the stale reservation');
assert.equal(fedLone.meals, 1, 'losing the mate does not clear readiness');
assert.equal(fedAvoidance.food.length, 1, 'an unpaired prepared adult does not consume food');
assert.ok(Math.hypot(fedLone.x - 0.3, fedLone.y) > Math.hypot(0 - 0.3, 0), 'without its mate, the adult avoids nearby food');

// Refeeding both parents after their cooldown allows one more birth, with no same-tick repeat.
parentA.meals = parentB.meals = 1;
parentA.cooldown = parentB.cooldown = 0;
parentA.x = 0; parentA.y = 0; parentB.x = 0.1; parentB.y = 0;
assert.equal(breeding.pair(parentA, parentB), true);
assert.equal(breeding.units.length, 4);
assert.equal(breeding.metrics.births, 2);
assert.equal(parentA.cooldown, CONFIG.breedCooldownSeconds);

// Map rules expose only active enemies, and each unit must sense one inside its own perception radius.
const perception = new Garden(21);
const scout = perception.units[0];
assert.equal(perception.senseEnemy(scout), null, 'an inactive farm boss is not a target');
perception.boss.active = true;
perception.boss.x = scout.x + scout.perceptionRange + perception.boss.radius;
perception.boss.y = scout.y;
assert.equal(perception.senseEnemy(scout), perception.boss, 'an active farm-map threat is sensed at the perception boundary');
perception.boss.x += 0.01;
assert.equal(perception.senseEnemy(scout), null, 'a farm threat outside perception is not a target');
perception.boss.active = false;
perception.scene = 'raid';
perception.running = true;
perception.raidDeploymentStarted = true;
perception.boss.active = true;
perception.boss.x = scout.x;
assert.equal(perception.senseEnemy(scout), perception.boss, 'raid-map rules expose an active encounter target');
perception.running = false;
assert.equal(perception.senseEnemy(scout), null, 'raid-map rules do not expose a boss after encounter shutdown');

// Active enemies reuse each unit's real attack cycle; once outside perception, farm behavior resumes.
const combatPriority = new Garden(29);
const combatAdult = ready(combatPriority.spawn(1, 1, 8.5, 0), {meals: 1, x: 8.5, y: 0});
combatPriority.units = [combatAdult];
combatAdult.hp = 1e6;
combatPriority.boss.active = true;
combatPriority.boss.hp = combatPriority.boss.maxHp = 1e6;
for (let i = 0; i < 1800; i++) combatPriority.step(1 / 120);
assert(combatPriority.combatLog.some(event => event.kind === 'launch'), 'a sensed enemy engages the existing combat action cycle');
assert(combatPriority.combatLog.some(event => event.kind === 'damage'), 'the existing combat action can damage a sensed enemy');
const foodDistance = 0.2;
combatPriority.boss.x = 100;
combatPriority.boss.y = 0;
combatAdult.vx = combatAdult.vy = 0;
combatPriority.food = [{phase: 'grounded', x: combatAdult.x + foodDistance, y: combatAdult.y, z: 0, seed: 7}];
assert.equal(combatPriority.senseEnemy(combatAdult), null, 'an enemy beyond perception is no longer a target');
for (let i = 0; i < 120; i++) combatPriority.step(1 / 120);
assert(Math.hypot(combatAdult.x - combatPriority.food[0].x, combatAdult.y - combatPriority.food[0].y) > foodDistance, 'farm food avoidance resumes after combat leaves perception');
assert.equal(combatAdult.meals, 1, 'resuming life preserves readiness instead of consuming a meal');

// A reserved breeding pair pauses for a sensed enemy, resumes after it clears, and breeds once.
const interruption = new Garden(22);
const [interruptedA, interruptedB] = interruption.units;
ready(interruptedA, {meals: 1, x: -2, y: 0});
ready(interruptedB, {meals: 1, x: 2, y: 0});
interruption.step(0.1);
assert.equal(interruptedA.mateId, interruptedB.id);
assert.equal(interruptedB.mateId, interruptedA.id);
interruption.boss.active = true;
interruption.boss.x = 8;
interruption.step(0.1);
assert.equal(interruption.senseEnemy(interruptedA), interruption.boss);
assert.equal(interruption.metrics.births, 0, 'combat priority pauses the reserved pair');
assert.equal(interruptedA.mateId, interruptedB.id, 'combat does not discard a valid mate reservation');
assert.equal(interruptedB.mateId, interruptedA.id);
assert.equal(interruptedA.meals + interruptedB.meals, 2, 'combat preserves both readiness meals');
interruption.boss.active = false;
advance(interruption, 3);
assert.equal(interruption.metrics.births, 1, 'the pair resumes and breeds after the threat disappears');
assert.equal(interruptedA.meals + interruptedB.meals, 0);
assert.equal(interruptedA.mateId + interruptedB.mateId, 0, 'successful birth releases both reservations');

// Same-tier pair wins; different tiers are allowed only when no same-tier partner is eligible.
const priority = new Garden(12);
const [lowA, lowB] = priority.units;
ready(lowA, {tier: 1, x: 0, y: 0});
ready(lowB, {tier: 2, x: 0.15, y: 0});
const lowMate = addPea(priority, 1, 0.1, 0);
assert.equal(priority.pair(lowA, lowB), false, 'cross-tier pair waits for the available same-tier pair');
assert.equal(priority.pair(lowA, lowMate), true);
const fallback = new Garden(13);
const [fallbackA, fallbackB] = fallback.units;
ready(fallbackA, {tier: 1, x: 0, y: 0});
ready(fallbackB, {tier: 2, x: 0.1, y: 0});
assert.equal(fallback.pair(fallbackA, fallbackB), true, 'cross-tier breeding is the fallback');
assert.equal(fallback.units.at(-1).tier, 1, 'offspring remains T1');
const speciesGuard = new Garden(25);
const speciesMismatch = ready(speciesGuard.spawn(1, 1, 0.1, 0), {meals: 1, x: 0.1, y: 0});
ready(speciesGuard.units[0], {meals: 1, x: 0, y: 0});
assert.equal(speciesGuard.pair(speciesGuard.units[0], speciesMismatch), false, 'different species never breed');

// Effective farm capacity, including the upgrade, controls breeding.
const baseCap = new Garden(14);
while (baseCap.units.length < CONFIG.cap) baseCap.spawn(1, 1, 8, 5);
ready(baseCap.units[0], {meals: 1, x: 0, y: 0});
ready(baseCap.units[1], {meals: 1, x: 0.1, y: 0});
assert.equal(baseCap.pair(baseCap.units[0], baseCap.units[1]), false);
assert.equal(baseCap.units.length, CONFIG.cap);
const expanded = new Garden(15);
expanded.progress.levels.capacity = 1;
while (expanded.units.length < CONFIG.cap) expanded.spawn(1, 1, 8, 5);
ready(expanded.units[0], {meals: 1, x: 0, y: 0});
ready(expanded.units[1], {meals: 1, x: 0.1, y: 0});
assert.equal(expanded.capacity, CONFIG.cap + 7);
assert.equal(expanded.pair(expanded.units[0], expanded.units[1]), true);
assert.equal(expanded.units.length, CONFIG.cap + 1);

// Merge selection is serialized: lowest tier first, then nearest pair, stable IDs on exact ties.
const sequential = new Garden(160);
sequential.mode = 'merge';
const [seqA, seqB] = sequential.units;
ready(seqA, {tier: 1, x: -8, y: 0});
ready(seqB, {tier: 1, x: -4, y: 0});
const seqC = addPea(sequential, 1, 3, 0);
const seqD = addPea(sequential, 1, 4.5, 0);
const seqE = addPea(sequential, 2, 9, 0);
const seqF = addPea(sequential, 2, 9.5, 0);
sequential.step(0.05);
assert.deepEqual([sequential.mergeTask.aId, sequential.mergeTask.bId], [seqC.id, seqD.id], 'closest same-tier T1 pair wins over farther T1 and closer T2 pair');
assert.equal(sequential.metrics.merges, 0, 'pair approaches before merging');
const approachingSave = restore(snapshot(sequential));
assert.deepEqual([approachingSave.mergeTask.aId, approachingSave.mergeTask.bId], [seqC.id, seqD.id], 'active sequential approach persists through save/load');
seqC.x = 0; seqC.y = 0; seqD.x = 0.1; seqD.y = 0;
sequential.step(0.05);
assert.equal(sequential.metrics.merges, 1, 'only the reserved pair merges on contact');
assert.equal(sequential.mergeTask.phase, 'animation', 'next pair waits for merge animation to finish');
assert.equal(sequential.units.filter(unit => unit.species === 0).length, 5, 'one merge consumes exactly one pair');
sequential.mode = 'breed';
sequential.step(0.05);
assert.equal(sequential.mergeTask, null, 'switching away from merge cancels the unconfirmed next pair');

// Combat takes precedence over the merge approach; the reserved pair remains pending.
const combatMerge = new Garden(162);
combatMerge.mode = 'merge';
const [combatA, combatB] = combatMerge.units;
ready(combatA, {tier: 1, x: 6, y: 0});
ready(combatB, {tier: 1, x: 8, y: 0});
addPea(combatMerge, 1, 14, 0);
combatMerge.step(0.01);
assert.deepEqual([combatMerge.mergeTask.aId, combatMerge.mergeTask.bId], [combatA.id, combatB.id]);
combatMerge.boss.active = true;
combatMerge.boss.x = 0; combatMerge.boss.y = 0;
combatMerge.step(0.01);
assert.equal(combatA.ability.phase, 'windup', 'combat starts for a reserved unit inside boss range');
assert.equal(combatMerge.metrics.merges, 0, 'combat prevents merging the reserved pair');
assert.equal(combatMerge.mergeTask.phase, 'approach', 'pair resumes after combat instead of advancing the sequence');

// Exact distance ties fall back to stable unit IDs.
const tiedMerge = new Garden(161);
tiedMerge.mode = 'merge';
const [tieA, tieB] = tiedMerge.units;
ready(tieA, {tier: 1, x: -8, y: 0});
ready(tieB, {tier: 1, x: -7, y: 0});
const tieC = addPea(tiedMerge, 1, 5, 0);
addPea(tiedMerge, 1, 6, 0);
tiedMerge.step(0.01);
assert.deepEqual([tiedMerge.mergeTask.aId, tiedMerge.mergeTask.bId], [tieA.id, tieB.id]);

// A species can never be merged below two units.
const merge = new Garden(16);
merge.mode = 'merge';
const [mergeA, mergeB] = merge.units;
ready(mergeA, {tier: 1, x: 0, y: 0});
ready(mergeB, {tier: 1, x: 0.1, y: 0});
assert.equal(merge.pair(mergeA, mergeB), false, 'the final pair is hard-blocked');
const mergeThird = addPea(merge, 1, 0.2, 0);
assert.equal(merge.pair(mergeA, mergeB), true, 'merging is allowed when a third species member remains');
assert.equal(merge.units.filter(unit => unit.species === 0).length, 2);
assert.equal(mergeThird.species, 0);

// Breed cooldown and child growth stay connected; the cooldown upgrade remains effective.
assert.equal(CONFIG.breedGrowthSeconds, CONFIG.breedCooldownSeconds / 2);
const breedUpgrade = TREE_NODES.find(node => node.id === 'breed');
const upgradeWorld = new Garden(17);
upgradeWorld.progress.levels.growth = 1;
upgradeWorld.progress.records.birth = 2;
assert.equal(breedUpgrade.value(0), '10.00초');
assert.equal(upgradeWorld.progress.ready(breedUpgrade), true);
assert.equal(upgradeWorld.progress.invest('breed'), true);
assert.ok(Math.abs(upgradeWorld.breedCooldownDuration() - 10 / 1.1) < 1e-9);
assert.ok(Math.abs(upgradeWorld.breedGrowthDuration() - 10 / 2.2) < 1e-9);

// Growth scale applies relatively to each tier's authored adult base size.
for (const tier of [1, 2, 3, 4]) {
  const unit = new Unit(500 + tier, 0, tier, 0, 0);
  assert.ok(Math.abs(unit.size - adultSize(tier) * 0.5) < 1e-12, `T${tier} starts at 50% of its existing adult scale`);
  unit.growthElapsed = unit.growthDuration / 2;
  assert.ok(Math.abs(unit.size - adultSize(tier) * 0.75) < 1e-12, `T${tier} interpolates its saved growth state`);
  unit.growthElapsed = unit.growthDuration;
  assert.ok(Math.abs(unit.size - adultSize(tier)) < 1e-12, `T${tier} reaches its existing adult scale`);
}
const sizePersistence = new Garden(171);
const persistedTierFour = sizePersistence.spawn(0, 4, 3, 2);
persistedTierFour.growthElapsed = persistedTierFour.growthDuration / 2;
const persistedSize = persistedTierFour.size;
assert.equal(restore(snapshot(sizePersistence)).units.find(unit => unit.id === persistedTierFour.id).size, persistedSize, 'tier and growth state restore the same body size');

// Current saves preserve reservations, growth time, and cooldown; invalid reservations clear safely.
const savedWorld = new Garden(26);
const [savedA, savedB] = savedWorld.units;
ready(savedA, {meals: 1, x: -2, y: 0});
ready(savedB, {meals: 1, x: 2, y: 0});
savedWorld.step(0.1);
assert.equal(savedA.mateId, savedB.id);
const savedChild = savedWorld.spawn(2, 1, 6, 6);
savedChild.growthElapsed = savedChild.growthDuration / 2;
const savedCooldown = ready(savedWorld.spawn(1, 1, 7, 6), {meals: 0});
savedCooldown.cooldown = 6.25;
const currentSave = JSON.stringify({productVersion: '0.4.6', schema: 'budmori-farm', world: snapshot(savedWorld)});
const resumed = parseSave(currentSave);
assert.equal(resumed.units[0].mateId, resumed.units[1].id, 'valid pair reservation resumes after save/load');
assert.equal(resumed.units[1].mateId, resumed.units[0].id);
assert.equal(resumed.units[2].growthElapsed, savedChild.growthDuration / 2, 'child growth time resumes unchanged');
assert.equal(resumed.units[3].cooldown, 6.25, 'parent cooldown resumes unchanged');
const brokenSave = JSON.parse(currentSave);
brokenSave.world.units[0].mateId = 999;
const repaired = parseSave(JSON.stringify(brokenSave));
assert.equal(repaired.units[0].mateId, 0, 'stale reservation clears during restore');
assert.equal(repaired.units[1].mateId, 0, 'both sides of a stale reservation clear');

// Existing high lifetime IDs stay valid across farm/raid/farm conversion with a reserved pair.
const highIds = new Garden(27);
const [highA, highB] = highIds.units;
ready(highA, {meals: 1});
ready(highB, {meals: 1});
highA.id = CONFIG.maxFarmUnitId - 1;
highB.id = CONFIG.maxFarmUnitId;
highA.mateId = highB.id;
highB.mateId = highA.id;
highIds.nextId = CONFIG.maxFarmUnitId + 1;
const highLoaded = parseSave(JSON.stringify({productVersion: '0.4.6', schema: 'budmori-farm', world: snapshot(highIds)}));
highLoaded.setScene('raid');
const raidLoaded = restore(snapshot(highLoaded));
assert.equal(raidLoaded.units[0].mateId, raidLoaded.units[1].id, 'raid transition remaps a high-ID mate reference');
raidLoaded.setScene('farm');
assert.equal(raidLoaded.units[0].id, CONFIG.maxFarmUnitId - 1, 'farm ID is preserved after raid return');
assert.equal(raidLoaded.units[0].mateId, CONFIG.maxFarmUnitId, 'mate reservation maps back to original farm IDs');

// An older 0.4.5 save retains its roster, readiness, and proportional partial growth.
const legacy = new Garden(18);
legacy.units = [];
legacy.nextId = 1;
for (let i = 0; i < 36; i++) {
  const unit = legacy.spawn(i % 3, 1, (i - 18) / 4, 0);
  unit.meals = i < 18 ? 3 : i < 24 ? 1 : 0;
  unit.growth = unit.meals;
  delete unit.growthElapsed;
  delete unit.growthDuration;
  delete unit.ownerId;
  delete unit.farmId;
  delete unit.dropLanded;
}
legacy.starter = 43;
legacy.progress.levels.production = 2;
legacy.progress.levels.breed = 1;
const previousWorld = snapshot(legacy);
const loaded = parseSave(JSON.stringify({productVersion: '0.4.5', schema: 'budmori-farm', world: previousWorld}));
assert.equal(loaded.units.length, 36);
assert.equal(loaded.progress.levels.production, 2);
assert.equal(loaded.starter, 43);
assert.equal(loaded.units[0].mature, true, 'old grown units remain grown');
assert.equal(loaded.units[18].growthElapsed, CONFIG.breedGrowthSeconds / CONFIG.matureMeals, 'old partial growth maps proportionally into the new timer');
assert.equal(loaded.units[35].growthElapsed, 0, 'old hungry units keep their zero growth progress');
assert.equal(loaded.units[35].mature, false, 'old immature units receive the new growth timer');
assert.ok(loaded.units.every(unit => typeof unit.ownerId === 'string' && Number.isSafeInteger(unit.farmId) && typeof unit.dropLanded === 'boolean'));

console.log('farm progression unit checks passed');
