import assert from 'node:assert/strict';
import {
  COMMON_UNIT_STAT_DEFAULTS,
  COMMON_UNIT_STAT_PROFILES,
  resolveUnitStats,
  resolveDamage,
  applyDamageToTargets,
  applyHealing,
  resolveStatusDuration,
  resolveKnockback,
  scaleMoveSpeed,
  scaleAttackRecovery,
  scaleAttackArea
} from '../src/unit-stats.js';
import {UNIT_ABILITY_PROFILES} from '../src/unit-abilities.js';
import {UNIT_GRADES,MAX_UNIT_TIER,mergeMaterialCostForTier,isValidUnitTier} from '../src/unit-grades.js';

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} ≈ ${expected}`);
}

for (const profile of COMMON_UNIT_STAT_PROFILES) assert.deepEqual(profile, COMMON_UNIT_STAT_DEFAULTS);
assert.deepEqual(UNIT_GRADES.map(({name})=>name),['Common','Uncommon','Rare','Epic','Legendary','Mythic']);
assert.equal(MAX_UNIT_TIER,6);
assert.deepEqual(UNIT_GRADES.slice(1).map(({materialCost})=>materialCost),[2,2,3,4,5]);
assert.deepEqual([2,3,4,5,6].map(mergeMaterialCostForTier),[2,2,3,4,5]);
assert.equal(mergeMaterialCostForTier(7),0);
assert(isValidUnitTier(6));assert(!isValidUnitTier(7));
const gradeStats=[
  [40,4],[60,4.8],[90,5.76],[202.5,10.368],[607.5,24.8832],[2278.125,74.6496]
];
for(let tier=1;tier<=MAX_UNIT_TIER;tier++){
  const resolved=resolveUnitStats({species:2,tier});
  close(resolved.maxHp,gradeStats[tier-1][0]);
  close(resolved.attackPower,gradeStats[tier-1][1]);
}
assert.deepEqual(resolveUnitStats({species:0,tier:1}), {maxHp:40,attackPower:4,...COMMON_UNIT_STAT_DEFAULTS});
assert.deepEqual(resolveUnitStats({species:3,tier:1}), {maxHp:40,attackPower:4,...COMMON_UNIT_STAT_DEFAULTS}, 'Chestnut troops use the normal shared T1 stats');
assert.deepEqual(UNIT_ABILITY_PROFILES.map(({kind,range,skillMultiplier,windup,recovery,projectileCount,bounces})=>({kind,range,skillMultiplier,windup,recovery,projectileCount,bounces})), [
  {kind:'ram',range:1.45,skillMultiplier:1,windup:.28,recovery:.65,projectileCount:0,bounces:0},
  {kind:'lob',range:4.1,skillMultiplier:1.6,windup:.38,recovery:1.25,projectileCount:1,bounces:0},
  {kind:'leap',range:2.5,skillMultiplier:1.3,windup:.32,recovery:.9,projectileCount:0,bounces:0},
  {kind:'punch',range:1.45,skillMultiplier:1,windup:.28,recovery:.65,projectileCount:0,bounces:0}
]);

const unit={id:1,species:0,tier:1,hp:20};
close(scaleMoveSpeed(2.2,unit,{moveSpeed:1.5}),3.3);
close(scaleAttackRecovery(1.25,unit,{attackSpeed:2}),.625);
close(scaleAttackArea(.12,unit,{attackArea:1.5}),.18);

const basic=resolveDamage(100,100,0);
close(basic.damage,50);
close(resolveDamage(100,100,.5).damage,100/1.5);
close(resolveDamage(10,0,0,true,2).damage,20);
const critTarget={hp:100};
const crit=applyDamageToTargets(unit,[critTarget],{rawDamage:10,sourceStatOverrides:{critChance:.25,critMultiplier:2},roll:()=>.1});
assert.equal(crit.critical,true);
close(critTarget.hp,80);

// Lifesteal reads HP actually removed after armor, then ignores overkill.
const directAttacker={species:0,tier:1,hp:20};
const nearlyDead={hp:1};
const direct=applyDamageToTargets(directAttacker,[nearlyDead],{rawDamage:100,sourceStatOverrides:{lifesteal:.5},armorForTarget:()=>100});
close(direct.totalActualLoss,1);
close(direct.healed,.5);
close(directAttacker.hp,20.5);

// AoE sums each target's actual loss and pays one third of the normal rate.
const areaAttacker={species:0,tier:1,hp:20};
const areaTargets=[{hp:5},{hp:20}];
const area=applyDamageToTargets(areaAttacker,areaTargets,{rawDamage:30,area:true,sourceStatOverrides:{lifesteal:.9},armorForTarget:()=>50});
close(area.totalActualLoss,25);
close(area.healed,7.5);
close(areaAttacker.hp,27.5);

// Direct healing is capped at max HP and passes through the common received-healing multiplier.
const capped={species:1,tier:1,hp:39};
const heal=applyDamageToTargets(capped,[{hp:100}],{rawDamage:10,sourceStatOverrides:{lifesteal:1}});
close(heal.healed,1);
close(capped.hp,40);
const amplified={species:1,tier:1,hp:20};
const amplifiedResult=applyDamageToTargets(amplified,[{hp:8}],{rawDamage:8,sourceStatOverrides:{lifesteal:.25,healingReceivedMultiplier:2}});
close(amplifiedResult.healed,4);
close(applyHealing({hp:20},2,{maxHp:40,healingReceivedMultiplier:1.5}),3);

// DoT/reflection do not lifesteal. A summoned attacker only heals itself.
for (const sourceKind of ['status','reflected']) {
  const source={species:0,tier:1,hp:20};
  applyDamageToTargets(source,[{hp:30}],{rawDamage:10,sourceKind,sourceStatOverrides:{lifesteal:.8}});
  close(source.hp,20);
}
const owner={species:1,tier:1,hp:10},summon={species:2,tier:1,hp:20};
const summonHit=applyDamageToTargets(summon,[{hp:4}],{rawDamage:4,sourceStatOverrides:{lifesteal:.5}});
close(summonHit.healed,2);
close(summon.hp,22);
close(owner.hp,10);

// Control values are source-scaled and target-mitigated; neutral values preserve old durations/impulses.
close(resolveStatusDuration(.5,{species:0},{species:1}),.5);
close(resolveStatusDuration(.5,{species:0},{species:1},{sourceStatOverrides:{statusDuration:2},targetStatOverrides:{statusResistance:.25}}),.75);
close(resolveKnockback(10,{species:0},{species:1}),10);
close(resolveKnockback(10,{species:0},{species:1},{sourceStatOverrides:{knockbackPower:1.5},targetStatOverrides:{knockbackResistance:.2}}),12);

console.log('common unit stat checks passed');
