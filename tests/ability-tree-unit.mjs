import assert from "node:assert/strict";
import { abilityProfile } from "../src/unit-abilities.js";
import {
  canPurchaseAbilityNode,
  canResetAbilityProgression,
  createAbilityProgressionState,
  getAbilityEffects,
  getInvestedPointCount,
  getMinimumApplicableTier,
  isAbilityActive,
  isValidAbilityProgressionState,
  mountAbilityTreePanel,
  purchaseAbilityNode,
  renderAbilityTreeMarkup,
  resetAbilityProgression,
  SHARED_ABILITY_POINT_COST
} from "../src/ability-tree.js";
import {
  createBeanSplitDescriptors,
  createCornBurstShotSchedule,
  getCornBurstConfig,
  getBeanSplitCount,
  getContinuousLeapConfig,
  getLandingShockwaveConfig,
  getPopcornExplosionConfig,
  createPopcornExplosionState,
  triggerPopcornExplosion,
  canDamageTargetFromPopcornExplosion,
  markPopcornTargetDamaged,
  getChestnutSpikeConfig,
  getChestnutSpikeIntervalSeconds,
  getChestnutSpikeFanAngles,
  resolveKidneyLandingEffects,
  shouldResetLeapCooldown
} from "../src/species-abilities.js";
import {
  awardBossKillXp,
  BOSS_KILL_XP,
  createPlayerProgressionState,
  experienceForNextLevel,
  FIRST_LEVEL_XP,
  formatXpForDisplay,
  isValidPlayerProgressionState,
  LEVEL_XP_MULTIPLIER,
  PLAYER_PROGRESS_BASE_XP,
  SHARED_POINTS_PER_LEVEL
} from "../src/player-progression.js";

const farm = { location: "farm", inCombat: false };
const atRare = { ...farm, highestSpeciesTier: { 0: 3, 2: 3 } };

function buy(state, abilityId, nodeId, context = atRare) {
  const result = purchaseAbilityNode(state, abilityId, nodeId, context);
  assert.equal(result.ok, true, `${abilityId}.${nodeId} should be purchasable (${result.reason})`);
  return result.state;
}

function testSharedPointTreeAndRarityPaths() {
  const empty = createAbilityProgressionState();
  assert.equal(empty.availablePoints, 0);
  assert.equal(isValidAbilityProgressionState(empty), true);
  assert.equal(isValidAbilityProgressionState({ ...empty, abilities: { ...empty.abilities, "unknown-ability": {} } }), false);
  assert.equal(SHARED_ABILITY_POINT_COST, 1);
  assert.equal(canPurchaseAbilityNode({ ...empty, availablePoints: 3 }, "pea-death-split", "root", { ...farm, highestSpeciesTier: { 0: 2 } }).reason, "requires-rare-tier");
  assert.equal(canPurchaseAbilityNode(empty, "pea-death-split", "root", { ...farm, highestSpeciesTier: { 0: 3 } }).reason, "insufficient-points");
  assert.equal(canPurchaseAbilityNode({ ...empty, availablePoints: 3 }, "pea-death-split", "root", { ...farm, inCombat: true, highestSpeciesTier: { 0: 3 } }).reason, "combat-lock");
  assert.equal(canPurchaseAbilityNode({ ...empty, availablePoints: 3 }, "pea-death-split", "root", { location: "raid", inCombat: false, highestSpeciesTier: { 0: 3 } }).reason, "farm-only");

  let state = createAbilityProgressionState({ availablePoints: 10 });
  state = buy(state, "pea-death-split", "root");
  assert.equal(state.availablePoints, 9);
  assert.equal(getMinimumApplicableTier(state, "pea-death-split"), 3);
  assert.equal(isAbilityActive(state, "pea-death-split", 3), true);
  assert.equal(isAbilityActive(state, "pea-death-split", 2), false);

  // The strength and grade-easing branches are independent and may both be
  // purchased. Every root and branch node costs exactly one shared point.
  state = buy(state, "pea-death-split", "power-1");
  state = buy(state, "pea-death-split", "grade-1");
  state = buy(state, "pea-death-split", "power-2");
  state = buy(state, "pea-death-split", "grade-2");
  assert.equal(state.availablePoints, 5);
  assert.equal(getMinimumApplicableTier(state, "pea-death-split"), 1);
  assert.equal(isAbilityActive(state, "pea-death-split", 1), true);
  assert.deepEqual(getAbilityEffects(state, "pea-death-split", 1), {
    abilityId: "pea-death-split", species: 0, unitTier: 1, powerLevel: 2, value: 4
  });
  assert.equal(canResetAbilityProgression(state, { location: "raid", inCombat: false }).reason, "farm-only");
  assert.equal(canResetAbilityProgression(state, { ...farm, inCombat: true }).reason, "combat-lock");
  assert.equal(canResetAbilityProgression(state, farm).allowed, true);
  const invested = getInvestedPointCount(state);
  const reset = resetAbilityProgression(state, farm);
  assert.equal(reset.ok, true);
  assert.equal(reset.refunded, invested);
  assert.equal(reset.state.availablePoints, 10);
  assert.equal(reset.state.abilities["pea-death-split"].rootUnlocked, false);
  assert.equal(reset.state.abilities["pea-death-split"].powerLevel, 0);
  assert.equal(reset.state.abilities["pea-death-split"].gradeLevel, 0);
  const blockedReset = resetAbilityProgression(state, { ...farm, inCombat: true });
  assert.equal(blockedReset.ok, false);
  assert.equal(blockedReset.state, state);
}

function testPeaDeathSplitContract() {
  let state = createAbilityProgressionState({ availablePoints: 8 });
  state = buy(state, "pea-death-split", "root");
  const deadPea = { id: 1, species: 0, tier: 3, hp: 0, x: 2, y: 1 };
  assert.equal(getBeanSplitCount(state, 3), 2);
  assert.equal(createBeanSplitDescriptors({ unit: deadPea, progression: state, inBattle: false }).length, 0);
  assert.equal(createBeanSplitDescriptors({ unit: { ...deadPea, hp: 10 }, progression: state, inBattle: true }).length, 0);
  assert.equal(createBeanSplitDescriptors({ unit: { ...deadPea, species: 2 }, progression: state, inBattle: true }).length, 0);
  let children = createBeanSplitDescriptors({ unit: deadPea, progression: state, inBattle: true });
  assert.equal(children.length, 2);
  assert.ok(children.every(child => child.species === deadPea.species && child.tier === 1));
  assert.ok(children.every(child => child.isBattleOnlySummon && !child.countsTowardPermanentRoster));
  assert.ok(children.every(child => !child.breedingEligible && !child.mergeEligible && !child.canSplit));
  assert.ok(children.every(child => child.lifetime === "until-death-or-battle-end"));
  assert.equal("timeLimitSeconds" in children[0], false);
  assert.equal(createBeanSplitDescriptors({ unit: { ...deadPea, isBattleOnlySummon: true }, progression: state, inBattle: true }).length, 0);

  state = buy(state, "pea-death-split", "power-1");
  children = createBeanSplitDescriptors({ unit: deadPea, progression: state, inBattle: true });
  assert.equal(children.length, 3);
  state = buy(state, "pea-death-split", "power-2");
  assert.equal(createBeanSplitDescriptors({ unit: deadPea, progression: state, inBattle: true }).length, 4);
  const eased = buy(state, "pea-death-split", "grade-1");
  assert.equal(createBeanSplitDescriptors({ unit: { ...deadPea, tier: 2 }, progression: eased, inBattle: true }).length, 4);
}

function testCornBurstFireCycle() {
  const baseAttack = abilityProfile(1);
  const attackCycle = { activeSeconds: 0, recoverySeconds: baseAttack.recovery };
  const cycleWindow = attackCycle.activeSeconds + attackCycle.recoverySeconds;
  let state = createAbilityProgressionState({ availablePoints: 8 });
  state = buy(state, "corn-burst-fire", "root", { ...farm, highestSpeciesTier: { 1: 3 } });
  let config = getCornBurstConfig(state, 3);
  assert.equal(config.species, 1);
  assert.equal(config.attackKind, "lob");
  assert.equal(config.projectileCount, 2);
  assert.equal(config.perProjectileAttackMultiplier, 0.8, "each kernel is half of the existing 1.6× lob attack");
  assert.equal(config.skillMultiplierShare, 0.5);
  assert.equal(config.oneBasicAttackCycle, true);
  assert.equal(config.timeSpaced, true);
  assert.equal(state.abilities["corn-popcorn-chain"].rootUnlocked, false,
    "the same species' popcorn ability has an independent root");
  const schedule = createCornBurstShotSchedule(config, attackCycle);
  assert.deepEqual(schedule.map(shot => shot.delaySeconds), [0, cycleWindow / 2]);
  assert.ok(schedule.at(-1).delaySeconds < attackCycle.recoverySeconds,
    "every follow-up shot is scheduled before the existing recovery ends and a new attack can start");
  assert.ok(schedule.every(shot => shot.attackMultiplier === 0.8));
  assert.equal(getCornBurstConfig(state, 2), null);

  state = buy(state, "corn-burst-fire", "power-1", { ...farm, highestSpeciesTier: { 1: 3 } });
  config = getCornBurstConfig(state, 3);
  assert.equal(config.projectileCount, 3);
  assert.deepEqual(createCornBurstShotSchedule(config, attackCycle).map(shot => shot.delaySeconds), [0, cycleWindow / 3, cycleWindow * 2 / 3]);
  state = buy(state, "corn-burst-fire", "power-2", { ...farm, highestSpeciesTier: { 1: 3 } });
  config = getCornBurstConfig(state, 3);
  assert.equal(config.projectileCount, 4);
  const fourShots = createCornBurstShotSchedule(config, attackCycle);
  assert.deepEqual(fourShots.map(shot => shot.delaySeconds), [0, cycleWindow / 4, cycleWindow / 2, cycleWindow * 3 / 4]);
  assert.ok(fourShots.at(-1).delaySeconds < attackCycle.recoverySeconds);
  assert.ok(fourShots.slice(1).every((shot, index) => shot.delaySeconds > fourShots[index].delaySeconds),
    "the 2/3/4-shot schedule uses distinct ascending delays");

  assert.deepEqual(createCornBurstShotSchedule(config, { activeSeconds: 0, recoverySeconds: 0 }), []);
  assert.deepEqual(createCornBurstShotSchedule(config, { activeSeconds: -1, recoverySeconds: 1 }), []);
  assert.deepEqual(createCornBurstShotSchedule({ ...config, projectileCount: 0 }, { activeSeconds: 1, recoverySeconds: 1 }), []);
}

function testPopcornFuseChainAndExplosionLedger() {
  let state = createAbilityProgressionState({ availablePoints: 8 });
  state = buy(state, "corn-popcorn-chain", "root", { ...farm, highestSpeciesTier: { 1: 3 } });
  assert.equal(state.abilities["corn-burst-fire"].rootUnlocked, false,
    "the same species' burst ability has an independent root");
  let config = getPopcornExplosionConfig(state, 3);
  assert.equal(config.fuseSeconds, 1);
  assert.equal(config.damageMultiplier, 0.5);
  assert.equal(config.radiusBaseRangeFraction, 0.25);
  assert.equal(config.radiusMultiplier, 1);
  assert.equal(config.radius, 4.1 * 0.25);
  assert.equal(config.chainOnPopcornContact, true);
  assert.equal(config.triggersOncePerProjectile, true);
  assert.equal(config.eachTargetAtMostOncePerProjectile, true);
  assert.equal(getPopcornExplosionConfig(state, 2), null);

  let oneKernel = createPopcornExplosionState("kernel-a");
  const first = triggerPopcornExplosion(config, oneKernel, "impact");
  assert.equal(first.triggered, true);
  oneKernel = first.state;
  assert.equal(triggerPopcornExplosion(config, oneKernel, "popcorn-contact").triggered, false,
    "each kernel can explode only once even if it later touches another popcorn");
  assert.equal(canDamageTargetFromPopcornExplosion(oneKernel, "boss"), true);
  oneKernel = markPopcornTargetDamaged(oneKernel, "boss");
  assert.equal(canDamageTargetFromPopcornExplosion(oneKernel, "boss"), false,
    "one kernel explosion damages a target at most once");

  const chainKernel = createPopcornExplosionState("kernel-b");
  const chained = triggerPopcornExplosion(config, chainKernel, "popcorn-contact");
  assert.equal(chained.triggered, true, "touching popcorn triggers an immediate chain explosion");
  assert.equal(canDamageTargetFromPopcornExplosion(chained.state, "boss"), true,
    "a different kernel may damage the same target");
  assert.equal(triggerPopcornExplosion(config, createPopcornExplosionState("kernel-c"), "timeout").triggered, false);

  state = buy(state, "corn-popcorn-chain", "power-1", { ...farm, highestSpeciesTier: { 1: 3 } });
  config = getPopcornExplosionConfig(state, 3);
  assert.equal(config.damageMultiplier, 1);
  assert.equal(config.radiusMultiplier, 1.5);
  assert.equal(config.radius, 4.1 * 0.25 * 1.5);
  state = buy(state, "corn-popcorn-chain", "power-2", { ...farm, highestSpeciesTier: { 1: 3 } });
  config = getPopcornExplosionConfig(state, 3);
  assert.equal(config.damageMultiplier, 1.5);
  assert.equal(config.radiusMultiplier, 2);
  assert.equal(config.radius, 4.1 * 0.25 * 2);
}

function testChestnutSpikeFan() {
  let state = createAbilityProgressionState({ availablePoints: 8 });
  state = buy(state, "chestnut-spike-fan", "root", { ...farm, highestSpeciesTier: { 3: 3 } });
  let config = getChestnutSpikeConfig(state, 3);
  const chestnutProfile = abilityProfile(3);
  assert.deepEqual(config, {
    species: 3,
    targetPattern: "fan-toward-target",
    projectileCount: 3,
    projectileAttackMultiplier: 0.5,
    fanSpreadRadians: Math.PI / 2,
    intervalBasicCycles: 4
  });
  assert.deepEqual(getChestnutSpikeFanAngles(config, 0), [-Math.PI / 4, 0, Math.PI / 4]);
  assert.deepEqual(getChestnutSpikeFanAngles(config, Math.PI / 2), [Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4]);
  assert.equal(getChestnutSpikeIntervalSeconds(config, chestnutProfile.windup + chestnutProfile.recovery), 4 * (chestnutProfile.windup + chestnutProfile.recovery));
  assert.equal(getChestnutSpikeIntervalSeconds(config, 0), null);
  assert.equal(getChestnutSpikeConfig(state, 2), null);
  state = buy(state, "chestnut-spike-fan", "power-1", { ...farm, highestSpeciesTier: { 3: 3 } });
  config = getChestnutSpikeConfig(state, 3);
  assert.equal(config.projectileCount, 5);
  state = buy(state, "chestnut-spike-fan", "power-2", { ...farm, highestSpeciesTier: { 3: 3 } });
  config = getChestnutSpikeConfig(state, 3);
  assert.equal(config.projectileCount, 7);
  assert.equal(config.intervalBasicCycles, 4, "the interval is derived from four existing basic attack cycles");
  state = buy(state, "chestnut-spike-fan", "grade-1", { ...farm, highestSpeciesTier: { 3: 3 } });
  assert.equal(getChestnutSpikeConfig(state, 2).projectileCount, 7);
}

function testKidneyContinuousLeapAndShockwaveRoots() {
  let state = createAbilityProgressionState({ availablePoints: 20 });
  state = buy(state, "kidney-continuous-leap", "root");
  let leap = getContinuousLeapConfig(state, 3);
  assert.equal(leap.cooldownResetChance, 0.2);
  assert.equal(leap.usesExistingAttackReadiness, true);
  assert.equal(leap.leapAtCloseRangeWhenReady, true);
  assert.equal(leap.avoidsGroundSweepWhileAirborne, true);
  assert.equal(shouldResetLeapCooldown(leap, 0.199999), true);
  assert.equal(shouldResetLeapCooldown(leap, 0.2), false);

  state = buy(state, "kidney-continuous-leap", "power-1");
  assert.equal(getContinuousLeapConfig(state, 3).cooldownResetChance, 0.35);
  state = buy(state, "kidney-continuous-leap", "power-2");
  assert.equal(getContinuousLeapConfig(state, 3).cooldownResetChance, 0.5);
  state = buy(state, "kidney-continuous-leap", "power-3");
  assert.equal(getContinuousLeapConfig(state, 3).cooldownResetChance, 0.65);
  assert.equal(getContinuousLeapConfig(state, 2), null);

  let shockwaveOnly = buy(createAbilityProgressionState({ availablePoints: 3 }), "kidney-landing-shockwave", "root");
  assert.equal(getLandingShockwaveConfig(shockwaveOnly, 3).repeatedAfterCooldownReset, false);
  state = buy(state, "kidney-landing-shockwave", "root");
  let shockwave = getLandingShockwaveConfig(state, 3);
  assert.equal(shockwave.damageMultiplier, 1);
  assert.equal(shockwave.radiusMultiplier, 1);
  assert.equal(shockwave.triggersOncePerLanding, true);
  assert.equal(shockwave.repeatedAfterCooldownReset, true);
  assert.equal(resolveKidneyLandingEffects(state, 3, 0.64).repeatableShockwave, true);
  assert.equal(resolveKidneyLandingEffects(state, 3, 0.65).resetCooldown, false);
  state = buy(state, "kidney-landing-shockwave", "power-1");
  shockwave = getLandingShockwaveConfig(state, 3);
  assert.equal(shockwave.damageMultiplier, 1.5);
  assert.equal(shockwave.radiusMultiplier, 1.5);
  state = buy(state, "kidney-landing-shockwave", "power-2");
  shockwave = getLandingShockwaveConfig(state, 3);
  assert.equal(shockwave.damageMultiplier, 2);
  assert.equal(shockwave.radiusMultiplier, 2);
  assert.equal(getLandingShockwaveConfig(state, 2), null);

  // The two independent Rare roots have separate power levels, while both can
  // be active together to repeat the shockwave after a reset-driven new leap.
  assert.equal(state.abilities["kidney-continuous-leap"].powerLevel, 3);
  assert.equal(state.abilities["kidney-landing-shockwave"].powerLevel, 2);
  assert.equal(getLandingShockwaveConfig(state, 3).repeatedAfterCooldownReset, true);
}

function testAccessibleTreeMarkup() {
  const state = createAbilityProgressionState({ availablePoints: 5 });
  const markup = renderAbilityTreeMarkup(state, { highestSpeciesTier: { 0: 2, 2: 1 }, location: "farm" });
  assert.match(markup, /공용 포인트/);
  assert.match(markup, /Rare \(T3\)/);
  assert.match(markup, /1 포인트/);
  assert.match(markup, /능력 해금/);
  assert.match(markup, /3발 연사/);
  assert.match(markup, /전투 사망 시 같은 종 T1 2마리 생성/);
  assert.match(markup, /착지 후 도약 쿨다운 초기화 20%/);
  assert.match(markup, /충격파 피해·반경 1×/);
  assert.match(markup, /한 공격 주기 · 발사 2발 · 발당 ATK ×0.8/);
  assert.match(markup, /착탄 1초 후 · 팝콘 접촉 즉시 연쇄 · 피해 ATK ×0.5/);
  assert.match(markup, /data-ability="pea-death-split"/);
  assert.match(markup, /data-ability="kidney-continuous-leap"/);
  assert.match(markup, /data-ability="kidney-landing-shockwave"/);
  assert.match(markup, /data-ability="corn-popcorn-chain"/);
  assert.match(markup, /목표 방향 부채꼴 90° 3발 · 발당 ATK ×0.5 · 기본 공격 4주기마다/);
  assert.match(markup, /data-ability="chestnut-spike-fan"/);
  assert.match(markup, /aria-describedby="ability-help-pea-death-split-root" aria-disabled="true"/);
  assert.match(markup, /이 종의 Rare \(T3\) 이상 개체가 필요합니다/);
  const combatMarkup = renderAbilityTreeMarkup(state, { highestSpeciesTier: { 0: 3, 2: 3 }, location: "farm", inCombat: true });
  assert.match(combatMarkup, /전투 중에는 투자와 초기화가 잠깁니다/);
  assert.match(combatMarkup, /전투 중에는 초기화할 수 없습니다/);

  const cornMarkup = renderAbilityTreeMarkup(state, { selectedSpecies: 1, highestSpeciesTier: { 1: 3 }, location: "farm" });
  assert.equal((cornMarkup.match(/<article class="ability-card"/g) || []).length, 2,
    "the species selector shows only Corn's two abilities");
  assert.match(cornMarkup, /옥수수 알갱이 연사/);
  assert.match(cornMarkup, /팝콘 연쇄 폭발/);
  assert.doesNotMatch(cornMarkup, /data-ability="pea-death-split"/);
  assert.doesNotMatch(cornMarkup, /data-ability="kidney-continuous-leap"/);
}

function testAbilityTreeMountInteractions() {
  const listeners = new Map();
  const host = {
    innerHTML: "",
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); }
  };
  let state = createAbilityProgressionState({ availablePoints: 2 });
  let context = { location: "farm", inCombat: false, highestSpeciesTier: { 0: 3 } };
  let changes = 0;
  const panel = mountAbilityTreePanel(host, {
    getState: () => state,
    getContext: () => context,
    onStateChange(nextState) { state = nextState; changes += 1; }
  });
  assert.match(host.innerHTML, /data-ability="pea-death-split"/);
  assert.equal(listeners.has("click"), true);

  const click = dataset => listeners.get("click")({ target: { closest: () => ({
    dataset,
    getAttribute: name => name === "aria-disabled" ? "false" : null
  }) } });
  click({ abilityNode: "pea-death-split:root" });
  assert.equal(state.availablePoints, 1);
  assert.equal(state.abilities["pea-death-split"].rootUnlocked, true);
  assert.match(host.innerHTML, /투자 완료/);
  click({ abilityAction: "reset" });
  assert.equal(state.availablePoints, 2);
  assert.equal(state.abilities["pea-death-split"].rootUnlocked, false);
  assert.equal(changes, 2);

  context = { ...context, inCombat: true };
  panel.render();
  const blocked = { dataset: { abilityNode: "pea-death-split:root" }, getAttribute: () => "true" };
  listeners.get("click")({ target: { closest: () => blocked } });
  assert.equal(state.availablePoints, 2);
  assert.equal(state.abilities["pea-death-split"].rootUnlocked, false);
  assert.equal(changes, 2);
  panel.dispose();
  assert.equal(listeners.has("click"), false);
}

function testBossXpAndSharedWallet() {
  assert.equal(PLAYER_PROGRESS_BASE_XP, 100);
  assert.equal(BOSS_KILL_XP, 100);
  assert.equal(FIRST_LEVEL_XP, 100);
  assert.equal(LEVEL_XP_MULTIPLIER, 1.2);
  assert.equal(SHARED_POINTS_PER_LEVEL, 1);
  assert.equal(experienceForNextLevel(1), 100);
  assert.equal(experienceForNextLevel(2), 120);
  assert.equal(experienceForNextLevel(3), 144);
  assert.ok(Math.abs(experienceForNextLevel(4) - 172.8) < 1e-10);
  assert.throws(() => experienceForNextLevel(0), RangeError);

  let state = createPlayerProgressionState();
  assert.equal(state.level, 1);
  assert.equal(state.experience, 0);
  assert.equal(state.availablePoints, 0);
  assert.equal(isValidPlayerProgressionState(state), true);

  const first = awardBossKillXp(state, "farm:receipt-1");
  assert.equal(first.awarded, true);
  assert.equal(first.xpAwarded, 100);
  assert.equal(first.levelsGained, 1);
  assert.equal(first.pointsAwarded, 1);
  assert.equal(first.state.level, 2);
  assert.equal(first.state.experience, 0);
  assert.equal(first.state.availablePoints, 1);
  assert.equal(state.level, 1, "award function returns a new state instead of mutating its input");
  const playerPanel = renderAbilityTreeMarkup(first.state, { highestSpeciesTier: {}, location: "farm" });
  assert.match(playerPanel, /플레이어 Lv\. 2/);
  assert.match(playerPanel, /0 \/ 120 XP/);
  assert.match(playerPanel, /<progress max="120" value="0" aria-label="플레이어 레벨 2 경험치"><\/progress>/);
  const duplicate = awardBossKillXp(first.state, "farm:receipt-1");
  assert.equal(duplicate.awarded, false);
  assert.equal(duplicate.reason, "duplicate-receipt");
  assert.equal(duplicate.state, first.state);

  // The same wallet accepts farm and raid receipts. XP threshold/carry uses
  // the same full-precision formula used by the public threshold function.
  const second = awardBossKillXp(first.state, "raid:receipt-2");
  assert.equal(second.state.experience, 100);
  assert.equal(second.state.level, 2);
  assert.equal(second.state.availablePoints, 1);
  const third = awardBossKillXp(second.state, "farm:receipt-3");
  assert.equal(third.state.level, 3);
  assert.ok(Math.abs(third.state.experience - 80) < 1e-10);
  assert.equal(third.state.availablePoints, 2);
  const fourth = awardBossKillXp(third.state, "raid:receipt-4");
  assert.equal(fourth.state.level, 4);
  assert.ok(Math.abs(fourth.state.experience - 36) < 1e-10);
  assert.equal(fourth.state.availablePoints, 3);
  assert.equal(isValidPlayerProgressionState(fourth.state), true);
  assert.equal(formatXpForDisplay(63.234), "63.2");
  assert.equal(formatXpForDisplay(80), "80");
  assert.equal(awardBossKillXp(fourth.state, "   ").reason, "invalid-receipt");

  const spent = buy(fourth.state, "kidney-continuous-leap", "root");
  assert.equal(spent.availablePoints, 2);
  assert.equal(spent.level, fourth.state.level);
  assert.equal(spent.experience, fourth.state.experience);
}

testSharedPointTreeAndRarityPaths();
testPeaDeathSplitContract();
testCornBurstFireCycle();
testPopcornFuseChainAndExplosionLedger();
testChestnutSpikeFan();
testKidneyContinuousLeapAndShockwaveRoots();
testAccessibleTreeMarkup();
testAbilityTreeMountInteractions();
testBossXpAndSharedWallet();
console.log("Ability-tree, species ability, and progression unit checks passed.");
