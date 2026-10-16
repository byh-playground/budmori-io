(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/unit-stats.js
  function resolveUnitStats(unit, overrides = {}) {
    const tier = Math.max(1, Math.min(4, Number.isInteger(unit?.tier) ? unit.tier : 1));
    const speciesProfile = COMMON_UNIT_STAT_PROFILES[unit?.species] || COMMON_UNIT_STAT_DEFAULTS;
    return {
      maxHp: TIER_HP * TIER_HP_SCALE ** (tier - 1),
      attackPower: TIER_ATTACK * TIER_ATTACK_SCALE ** (tier - 1),
      ...COMMON_UNIT_STAT_DEFAULTS,
      ...speciesProfile,
      ...overrides
    };
  }
  function resolveDamage(rawDamage, armor = 0, armorPenetration = 0, critical = false, critMultiplier = 1) {
    const raw = Number.isFinite(rawDamage) ? Math.max(0, rawDamage) : 0;
    const penetration = clamp(Number.isFinite(armorPenetration) ? armorPenetration : 0, 0, 1);
    const effectiveArmor = Math.max(0, Number.isFinite(armor) ? armor : 0) * (1 - penetration);
    const crit = critical ? Math.max(1, Number.isFinite(critMultiplier) ? critMultiplier : 1) : 1;
    const mitigated = raw * crit * ARMOR_SCALE / (ARMOR_SCALE + effectiveArmor);
    return { rawDamage: raw, effectiveArmor, critical, damage: mitigated };
  }
  function resolveCritical(stats2, roll = 1) {
    const chance = clamp(Number.isFinite(stats2?.critChance) ? stats2.critChance : 0, 0, 1);
    return chance > 0 && roll < chance;
  }
  function scaleMoveSpeed(baseSpeed, unit, overrides = {}) {
    return Math.max(0, Number.isFinite(baseSpeed) ? baseSpeed : 0) * Math.max(0, resolveUnitStats(unit, overrides).moveSpeed);
  }
  function scaleAttackRecovery(baseRecovery, unit, overrides = {}) {
    return Math.max(0, Number.isFinite(baseRecovery) ? baseRecovery : 0) / Math.max(0.05, resolveUnitStats(unit, overrides).attackSpeed);
  }
  function scaleAttackArea(baseArea, unit, overrides = {}) {
    return Math.max(0, Number.isFinite(baseArea) ? baseArea : 0) * Math.max(0, resolveUnitStats(unit, overrides).attackArea);
  }
  function applyDamage(target, rawDamage, { armor = 0, armorPenetration = 0, critical = false, critMultiplier = 1 } = {}) {
    if (!target || !Number.isFinite(target.hp)) return { actualLoss: 0, ...resolveDamage(rawDamage, armor, armorPenetration, critical, critMultiplier) };
    const resolved = resolveDamage(rawDamage, armor, armorPenetration, critical, critMultiplier);
    const actualLoss = Math.min(Math.max(0, target.hp), resolved.damage);
    target.hp = Math.max(0, target.hp - actualLoss);
    return { ...resolved, actualLoss };
  }
  function applyHealing(target, amount, receiverStats = resolveUnitStats(target)) {
    if (!target || !Number.isFinite(target.hp) || target.hp <= 0) return 0;
    const maxHp = Number.isFinite(receiverStats?.maxHp) ? receiverStats.maxHp : 0;
    const received = Number.isFinite(receiverStats?.healingReceivedMultiplier) ? Math.max(0, receiverStats.healingReceivedMultiplier) : 1;
    const requested = Number.isFinite(amount) ? Math.max(0, amount) * received : 0;
    const healed = Math.min(Math.max(0, maxHp - target.hp), requested);
    target.hp += healed;
    return healed;
  }
  function applyDamageToTargets(source, targets, {
    rawDamage,
    area = false,
    sourceKind = "direct",
    sourceStatOverrides = {},
    armorForTarget = (target) => resolveUnitStats(target).armor,
    roll = () => 1
  } = {}) {
    const sourceStats = source ? resolveUnitStats(source, sourceStatOverrides) : null;
    const critical = !!sourceStats && sourceStats.critChance > 0 && resolveCritical(sourceStats, roll());
    const hits = [];
    let totalActualLoss = 0;
    for (const target of targets || []) {
      const result = applyDamage(target, rawDamage, {
        armor: armorForTarget(target),
        armorPenetration: sourceStats?.armorPenetration || 0,
        critical,
        critMultiplier: sourceStats?.critMultiplier || 1
      });
      hits.push(result);
      totalActualLoss += result.actualLoss;
    }
    const baseRate = sourceKind === "direct" ? sourceStats?.lifesteal || 0 : 0;
    const healRate = area ? baseRate / 3 : baseRate;
    const healed = source && healRate > 0 ? applyHealing(source, totalActualLoss * healRate, sourceStats) : 0;
    return { hits, totalActualLoss, healed, critical };
  }
  function resolveStatusDuration(baseDuration, source, target, { sourceStatOverrides = {}, targetStatOverrides = {} } = {}) {
    const sourceStats = source ? resolveUnitStats(source, sourceStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const targetStats = target ? resolveUnitStats(target, targetStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const durationScale = Number.isFinite(sourceStats.statusDuration) ? Math.max(0, sourceStats.statusDuration) : 1;
    const resistance = clamp(Number.isFinite(targetStats.statusResistance) ? targetStats.statusResistance : 0, 0, 1);
    return Math.max(0, Number.isFinite(baseDuration) ? baseDuration : 0) * durationScale * (1 - resistance);
  }
  function resolveKnockback(basePower, source, target, { sourceStatOverrides = {}, targetStatOverrides = {} } = {}) {
    const sourceStats = source ? resolveUnitStats(source, sourceStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const targetStats = target ? resolveUnitStats(target, targetStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const power = Number.isFinite(sourceStats.knockbackPower) ? Math.max(0, sourceStats.knockbackPower) : 1;
    const resistance = clamp(Number.isFinite(targetStats.knockbackResistance) ? targetStats.knockbackResistance : 0, 0, 1);
    return Math.max(0, Number.isFinite(basePower) ? basePower : 0) * power * (1 - resistance);
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  var TIER_HP, TIER_HP_SCALE, TIER_ATTACK, TIER_ATTACK_SCALE, ARMOR_SCALE, COMMON_UNIT_STAT_DEFAULTS, COMMON_UNIT_STAT_PROFILES;
  var init_unit_stats = __esm({
    "src/unit-stats.js"() {
      TIER_HP = 40;
      TIER_HP_SCALE = 1.5;
      TIER_ATTACK = 4;
      TIER_ATTACK_SCALE = 1.2;
      ARMOR_SCALE = 100;
      COMMON_UNIT_STAT_DEFAULTS = Object.freeze({
        armor: 0,
        moveSpeed: 1,
        attackSpeed: 1,
        critChance: 0,
        critMultiplier: 1,
        armorPenetration: 0,
        attackArea: 1,
        lifesteal: 0,
        regen: 0,
        healingReceivedMultiplier: 1,
        knockbackPower: 1,
        knockbackResistance: 0,
        statusDuration: 1,
        statusResistance: 0
      });
      COMMON_UNIT_STAT_PROFILES = Object.freeze([0, 1, 2, 3].map(() => Object.freeze({ ...COMMON_UNIT_STAT_DEFAULTS })));
    }
  });

  // src/unit-abilities.js
  function abilityProfile(species) {
    return UNIT_ABILITY_PROFILES[species] || UNIT_ABILITY_PROFILES[0];
  }
  var UNIT_ABILITY_PROFILES;
  var init_unit_abilities = __esm({
    "src/unit-abilities.js"() {
      UNIT_ABILITY_PROFILES = Object.freeze([
        Object.freeze({ kind: "ram", windup: 0.28, recovery: 0.65, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 }),
        Object.freeze({ kind: "lob", windup: 0.38, recovery: 1.25, range: 4.1, skillMultiplier: 1.6, projectileCount: 1, bounces: 0 }),
        Object.freeze({ kind: "leap", windup: 0.32, recovery: 0.9, range: 2.5, skillMultiplier: 1.3, projectileCount: 0, bounces: 0 }),
        Object.freeze({ kind: "punch", windup: 0.28, recovery: 0.65, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 })
      ]);
    }
  });

  // src/ability-catalog.js
  var SPECIES_ABILITY_DEFINITIONS;
  var init_ability_catalog = __esm({
    "src/ability-catalog.js"() {
      SPECIES_ABILITY_DEFINITIONS = Object.freeze([
        Object.freeze({
          id: "pea-death-split",
          species: 0,
          name: "콩 분열",
          description: "전투에서 쓰러지면 같은 종의 T1 개체를 생성해 전투를 이어갑니다.",
          rootTier: 3,
          powerValues: Object.freeze([2, 3, 4]),
          gradeThresholds: Object.freeze([3, 2, 1])
        }),
        Object.freeze({
          id: "corn-burst-fire",
          species: 1,
          name: "옥수수 알갱이 연사",
          description: "한 기본 곡사 공격 주기 안에 알갱이를 시간차로 발사합니다.",
          rootTier: 3,
          powerValues: Object.freeze([2, 3, 4]),
          projectileAttackShare: 0.5,
          gradeThresholds: Object.freeze([3, 2, 1])
        }),
        Object.freeze({
          id: "corn-popcorn-chain",
          species: 1,
          name: "팝콘 연쇄 폭발",
          description: "착탄한 알갱이가 1초 뒤 폭발하고, 주변 팝콘과 닿으면 즉시 연쇄 폭발합니다.",
          rootTier: 3,
          powerValues: Object.freeze([0.5, 1, 1.5]),
          radiusMultipliers: Object.freeze([1, 1.5, 2]),
          fuseSeconds: 1,
          baseRangeFraction: 0.25,
          gradeThresholds: Object.freeze([3, 2, 1])
        }),
        Object.freeze({
          id: "chestnut-spike-fan",
          species: 3,
          name: "밤톨 가시 부채",
          description: "목표를 향해 부채꼴 가시를 발사합니다.",
          rootTier: 3,
          powerValues: Object.freeze([3, 5, 7]),
          projectileAttackMultiplier: 0.5,
          fanSpreadRadians: Math.PI / 2,
          intervalBasicCycles: 4,
          gradeThresholds: Object.freeze([3, 2, 1])
        }),
        Object.freeze({
          id: "kidney-continuous-leap",
          species: 2,
          name: "연속 도약",
          description: "착지 후 확률적으로 도약 재사용 대기시간을 초기화합니다.",
          rootTier: 3,
          powerValues: Object.freeze([0.2, 0.35, 0.5, 0.65]),
          gradeThresholds: Object.freeze([3, 2, 1])
        }),
        Object.freeze({
          id: "kidney-landing-shockwave",
          species: 2,
          name: "착지 충격파",
          description: "도약 착지 지점에서 기본 공격력과 사거리 기준의 충격파를 냅니다.",
          rootTier: 3,
          powerValues: Object.freeze([1, 1.5, 2]),
          gradeThresholds: Object.freeze([3, 2, 1])
        })
      ]);
    }
  });

  // src/ability-state.js
  function createAbilityProgressionState({ availablePoints = 0 } = {}) {
    if (!isNonNegativeInteger(availablePoints)) throw new TypeError("availablePoints must be a non-negative integer");
    return {
      schemaVersion: ABILITY_TREE_SCHEMA_VERSION,
      availablePoints,
      abilities: Object.fromEntries(SPECIES_ABILITY_DEFINITIONS.map((definition) => [definition.id, {
        rootUnlocked: false,
        powerLevel: 0,
        gradeLevel: 0
      }]))
    };
  }
  function isValidAbilityProgressionState(state) {
    if (!state || typeof state !== "object" || state.schemaVersion !== ABILITY_TREE_SCHEMA_VERSION) return false;
    if (!isNonNegativeInteger(state.availablePoints) || !state.abilities || typeof state.abilities !== "object") return false;
    if (Object.keys(state.abilities).length !== SPECIES_ABILITY_DEFINITIONS.length) return false;
    for (const definition of SPECIES_ABILITY_DEFINITIONS) {
      const investment = state.abilities[definition.id];
      if (!investment || typeof investment.rootUnlocked !== "boolean") return false;
      if (!isNonNegativeInteger(investment.powerLevel) || investment.powerLevel > definition.powerValues.length - 1) return false;
      if (!isNonNegativeInteger(investment.gradeLevel) || investment.gradeLevel > definition.gradeThresholds.length - 1) return false;
      if (!investment.rootUnlocked && (investment.powerLevel !== 0 || investment.gradeLevel !== 0)) return false;
    }
    return Object.keys(state.abilities).every((abilityId) => SPECIES_ABILITY_DEFINITIONS.some((definition) => definition.id === abilityId));
  }
  function createAbilityRuntimeSnapshot(state) {
    if (!isValidPlayerLikeAbilityState(state)) throw new TypeError("Cannot snapshot invalid ability progression state");
    return {
      schemaVersion: ABILITY_TREE_SCHEMA_VERSION,
      level: state.level,
      availablePoints: state.availablePoints,
      abilities: Object.fromEntries(SPECIES_ABILITY_DEFINITIONS.map(({ id }) => [id, { ...state.abilities[id] }]))
    };
  }
  function isValidAbilityRuntimeSnapshot(snapshot2) {
    if (!snapshot2 || typeof snapshot2 !== "object" || snapshot2.schemaVersion !== ABILITY_TREE_SCHEMA_VERSION || !Number.isSafeInteger(snapshot2.level) || snapshot2.level < 1) return false;
    const state = {
      schemaVersion: snapshot2.schemaVersion,
      level: snapshot2.level,
      experience: 0,
      availablePoints: snapshot2.availablePoints,
      abilities: snapshot2.abilities,
      processedBossKillReceipts: []
    };
    if (!isValidAbilityProgressionState(state)) return false;
    const invested = Object.values(state.abilities).reduce((total, investment) => total + Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel, 0);
    return invested + state.availablePoints === state.level - 1;
  }
  function isValidPlayerLikeAbilityState(state) {
    const abilityState = {
      schemaVersion: state?.schemaVersion,
      availablePoints: state?.availablePoints,
      abilities: state?.abilities
    };
    if (!isValidAbilityProgressionState(abilityState) || !Number.isSafeInteger(state?.level) || state.level < 1) return false;
    const investedPoints = Object.values(state.abilities).reduce((total, investment) => total + Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel, 0);
    return investedPoints + state.availablePoints === state.level - 1;
  }
  function isNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }
  var ABILITY_TREE_SCHEMA_VERSION;
  var init_ability_state = __esm({
    "src/ability-state.js"() {
      init_ability_catalog();
      ABILITY_TREE_SCHEMA_VERSION = 1;
    }
  });

  // src/player-progression.js
  function createPlayerProgressionState() {
    return {
      ...createAbilityProgressionState(),
      level: 1,
      experience: 0,
      processedBossKillReceipts: []
    };
  }
  function awardBossKillXp(state, receiptKey) {
    if (!isValidPlayerProgressionState(state)) {
      return { state, awarded: false, reason: "invalid-state", xpAwarded: 0, levelsGained: 0, pointsAwarded: 0 };
    }
    if (typeof receiptKey !== "string" || receiptKey.trim().length === 0) {
      return { state, awarded: false, reason: "invalid-receipt", xpAwarded: 0, levelsGained: 0, pointsAwarded: 0 };
    }
    if (state.processedBossKillReceipts.includes(receiptKey)) {
      return { state, awarded: false, reason: "duplicate-receipt", xpAwarded: 0, levelsGained: 0, pointsAwarded: 0 };
    }
    let level = state.level;
    let experience = state.experience + BOSS_KILL_XP;
    let levelsGained = 0;
    while (experience >= experienceForNextLevel(level)) {
      experience -= experienceForNextLevel(level);
      level += 1;
      levelsGained += 1;
    }
    const pointsAwarded = levelsGained * SHARED_POINTS_PER_LEVEL;
    const nextState = {
      ...state,
      level,
      experience,
      availablePoints: state.availablePoints + pointsAwarded,
      abilities: Object.fromEntries(Object.entries(state.abilities).map(([id, value]) => [id, { ...value }])),
      processedBossKillReceipts: [...state.processedBossKillReceipts, receiptKey]
    };
    return { state: nextState, awarded: true, reason: null, xpAwarded: BOSS_KILL_XP, levelsGained, pointsAwarded };
  }
  function experienceForNextLevel(level) {
    if (!Number.isSafeInteger(level) || level < 1) throw new RangeError("level must be a positive integer");
    return FIRST_LEVEL_XP * LEVEL_XP_MULTIPLIER ** (level - 1);
  }
  function formatXpForDisplay(experience) {
    const value = Number.isFinite(experience) ? Math.max(0, experience) : 0;
    return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(value);
  }
  function isValidPlayerProgressionState(state) {
    if (!isValidAbilityProgressionState(state) || !Number.isSafeInteger(state.level) || state.level < 1 || !Number.isFinite(state.experience) || state.experience < 0 || state.experience >= experienceForNextLevel(state.level) || !Array.isArray(state.processedBossKillReceipts) || !state.processedBossKillReceipts.every((key) => typeof key === "string" && key.length > 0) || new Set(state.processedBossKillReceipts).size !== state.processedBossKillReceipts.length) return false;
    const investedPoints = Object.values(state.abilities).reduce((total, investment) => total + Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel, 0);
    return investedPoints + state.availablePoints === state.level - 1;
  }
  var PLAYER_PROGRESS_BASE_XP, BOSS_KILL_XP, FIRST_LEVEL_XP, LEVEL_XP_MULTIPLIER, SHARED_POINTS_PER_LEVEL;
  var init_player_progression = __esm({
    "src/player-progression.js"() {
      init_ability_state();
      PLAYER_PROGRESS_BASE_XP = 100;
      BOSS_KILL_XP = PLAYER_PROGRESS_BASE_XP;
      FIRST_LEVEL_XP = PLAYER_PROGRESS_BASE_XP;
      LEVEL_XP_MULTIPLIER = 1.2;
      SHARED_POINTS_PER_LEVEL = 1;
    }
  });

  // src/boss-rewards.js
  function bossAcquisitionChance({ farmEvent = false, acquisitionMultiplier = 1 } = {}) {
    if (!Number.isFinite(acquisitionMultiplier) || acquisitionMultiplier < 0 || acquisitionMultiplier > 2) {
      throw new RangeError("Boss acquisition multiplier must be in [0, 2]");
    }
    const multiplier = farmEvent ? BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier : acquisitionMultiplier;
    return Math.min(1, Math.max(0, BOSS_REWARD_SETTINGS.acquisitionChance * multiplier));
  }
  function decideBossAcquisition({ encounterId, source = "raid", random, species = 3, tier = 1, x = 0, y = 0, acquisitionMultiplier = 1, receiptKey = null } = {}) {
    if (!Number.isSafeInteger(encounterId) || encounterId < 1 || !["farm", "raid"].includes(source) || typeof random !== "function") {
      throw new TypeError("A boss encounter ID, source, and random roll are required");
    }
    if (receiptKey !== null && (typeof receiptKey !== "string" || !receiptKey.trim() || receiptKey.length > 255)) throw new TypeError("Boss receipt key must be a non-empty string");
    const chance = bossAcquisitionChance({ farmEvent: source === "farm", acquisitionMultiplier });
    const roll = random();
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new RangeError("Boss acquisition roll must be in [0, 1)");
    return { encounterId, source, receiptKey: receiptKey || `${source}:${encounterId}`, acquisitionMultiplier: source === "farm" ? BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier : acquisitionMultiplier, species, tier, x, y, chance, roll, status: roll < chance ? "pending" : "missed", unitId: 0 };
  }
  function grantPendingBossAcquisitions(world, { grantUnit = null } = {}) {
    const granted = [];
    for (const reward of world.bossRewardReceipts || []) {
      if (reward.status !== "pending") continue;
      const unit = grantUnit ? grantUnit(reward) : world.units.length < world.capacity ? world.spawn(reward.species, reward.tier, reward.x, reward.y) : null;
      if (!unit) continue;
      reward.status = "granted";
      reward.unitId = unit.id;
      granted.push(reward);
      const event = world.farmBossEvent;
      if (event?.encounterId === reward.encounterId) {
        event.rewardStatus = "granted";
        event.rewardUnitId = unit.id;
      }
    }
    return granted;
  }
  function resolveBossAcquisition(world, options) {
    const { encounterId, source = "raid" } = options || {};
    const requestedReceiptKey = options?.receiptKey;
    if (requestedReceiptKey !== void 0 && (typeof requestedReceiptKey !== "string" || !requestedReceiptKey.trim() || requestedReceiptKey.length > 255)) throw new TypeError("Boss receipt key must be a non-empty string");
    world.bossRewardReceipts ||= [];
    world.bossRewardWatermarks ||= { farm: 0, raid: 0 };
    const previous = world.bossRewardReceipts.find((receipt2) => requestedReceiptKey ? receipt2.receiptKey === requestedReceiptKey : receipt2.encounterId === encounterId && receipt2.source === source);
    if (previous) return previous;
    if (!["farm", "raid"].includes(source) || !Number.isSafeInteger(encounterId) || encounterId <= (world.bossRewardWatermarks[source] || 0)) {
      throw new RangeError("A settled or stale boss encounter cannot be rolled again");
    }
    const receipt = decideBossAcquisition({ ...options, random: options?.random || (() => world.random()) });
    world.bossRewardReceipts.push(receipt);
    world.bossRewardWatermarks[source] = encounterId;
    let settled = world.bossRewardReceipts.filter((item) => item.status !== "pending");
    if (settled.length > 128) {
      const remove = new Set(settled.slice(0, settled.length - 128));
      world.bossRewardReceipts = world.bossRewardReceipts.filter((item) => !remove.has(item));
    }
    const event = world.farmBossEvent;
    if (event?.encounterId === encounterId) {
      event.rewardStatus = receipt.status;
      event.rewardChance = receipt.chance;
      event.rewardRoll = receipt.roll;
      event.rewardUnitId = receipt.unitId;
    }
    if (receipt.status === "pending") grantPendingBossAcquisitions(world, { grantUnit: options?.grantUnit || null });
    return receipt;
  }
  function settleBossKill(world, options) {
    const receipt = resolveBossAcquisition(world, options);
    const progressionOwner = options?.progressionOwner || world;
    const wallet = options?.playerProgression || progressionOwner.playerProgression;
    const receiptKey = options?.receiptKey || receipt.receiptKey || `${receipt.source}:${receipt.encounterId}`;
    const result = awardBossKillXp(wallet, receiptKey);
    if (result.awarded) {
      progressionOwner.playerProgression = result.state;
    }
    receipt.xpReceiptKey = receiptKey;
    receipt.xpStatus = result.awarded ? "awarded" : result.reason === "duplicate-receipt" ? "already-awarded" : "unsettled";
    receipt.xpAmount = result.awarded ? result.xpAwarded : 0;
    receipt.levelsGained = result.levelsGained;
    receipt.pointsAwarded = result.pointsAwarded;
    return {
      receipt,
      progression: result.state,
      awarded: result.awarded,
      reason: result.reason,
      xpAwarded: result.xpAwarded,
      levelsGained: result.levelsGained,
      pointsAwarded: result.pointsAwarded
    };
  }
  var BOSS_REWARD_SETTINGS;
  var init_boss_rewards = __esm({
    "src/boss-rewards.js"() {
      init_player_progression();
      BOSS_REWARD_SETTINGS = Object.freeze({
        acquisitionChance: 0.2,
        farmEventAcquisitionMultiplier: 2
      });
    }
  });

  // src/ability-tree.js
  function abilityStateFor(state, abilityId) {
    if (!definitionById.has(abilityId) || !state?.abilities?.[abilityId]) return null;
    return state.abilities[abilityId];
  }
  function getAbilityPowerLevel(state, abilityId) {
    return abilityStateFor(state, abilityId)?.powerLevel || 0;
  }
  function getAbilityGradeLevel(state, abilityId) {
    return abilityStateFor(state, abilityId)?.gradeLevel || 0;
  }
  function getMinimumApplicableTier(state, abilityId) {
    const definition = definitionById.get(abilityId);
    if (!definition) return null;
    const gradeLevel = getAbilityGradeLevel(state, abilityId);
    return definition.gradeThresholds[Math.min(gradeLevel, definition.gradeThresholds.length - 1)];
  }
  function isAbilityActive(state, abilityId, unitTier) {
    const investment = abilityStateFor(state, abilityId);
    const minimumTier = getMinimumApplicableTier(state, abilityId);
    return !!investment?.rootUnlocked && Number.isInteger(unitTier) && unitTier >= minimumTier;
  }
  function powerLevelFor(state, abilityId) {
    return getAbilityPowerLevel(state, abilityId);
  }
  function getInvestedPointCount(state) {
    if (!isValidAbilityProgressionState(state)) return 0;
    return Object.values(state.abilities).reduce((total, investment) => total + Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel, 0);
  }
  function canPurchaseAbilityNode(state, abilityId, nodeId, context = {}) {
    const definition = definitionById.get(abilityId);
    if (!definition) return { allowed: false, reason: "unknown-ability" };
    if (!isValidAbilityProgressionState(state)) return { allowed: false, reason: "invalid-state" };
    if (context.location !== "farm" || context.inCombat === true) return { allowed: false, reason: context.inCombat ? "combat-lock" : "farm-only" };
    const investment = state.abilities[abilityId];
    const node = parseNodeId(nodeId);
    if (!node) return { allowed: false, reason: "unknown-node" };
    if (node.kind === "root") {
      if (investment.rootUnlocked) return { allowed: false, reason: "already-invested" };
      const highestTier = context.highestSpeciesTier?.[definition.species] ?? context.highestSpeciesTier ?? 0;
      if (!Number.isInteger(highestTier) || highestTier < definition.rootTier) return { allowed: false, reason: "requires-rare-tier" };
    } else {
      if (!investment.rootUnlocked) return { allowed: false, reason: "root-required" };
      const currentLevel = node.kind === "power" ? investment.powerLevel : investment.gradeLevel;
      const maxLevel = node.kind === "power" ? definition.powerValues.length - 1 : definition.gradeThresholds.length - 1;
      if (node.level <= currentLevel) return { allowed: false, reason: "already-invested" };
      if (node.level !== currentLevel + 1) return { allowed: false, reason: "prerequisite-required" };
      if (node.level > maxLevel) return { allowed: false, reason: "max-level" };
    }
    if (state.availablePoints < SHARED_ABILITY_POINT_COST) return { allowed: false, reason: "insufficient-points" };
    return { allowed: true, reason: null };
  }
  function purchaseAbilityNode(state, abilityId, nodeId, context = {}) {
    const check = canPurchaseAbilityNode(state, abilityId, nodeId, context);
    if (!check.allowed) return { ok: false, reason: check.reason, state };
    const node = parseNodeId(nodeId);
    const next = cloneState(state);
    next.availablePoints -= SHARED_ABILITY_POINT_COST;
    if (node.kind === "root") next.abilities[abilityId].rootUnlocked = true;
    else if (node.kind === "power") next.abilities[abilityId].powerLevel = node.level;
    else next.abilities[abilityId].gradeLevel = node.level;
    return { ok: true, reason: null, state: next };
  }
  function canResetAbilityProgression(state, context = {}) {
    if (!isValidAbilityProgressionState(state)) return { allowed: false, reason: "invalid-state" };
    if (context.location !== "farm" || context.inCombat === true) return { allowed: false, reason: context.inCombat ? "combat-lock" : "farm-only" };
    if (getInvestedPointCount(state) === 0) return { allowed: false, reason: "nothing-invested" };
    return { allowed: true, reason: null };
  }
  function resetAbilityProgression(state, context = {}) {
    const check = canResetAbilityProgression(state, context);
    if (!check.allowed) return { ok: false, reason: check.reason, state };
    const refunded = getInvestedPointCount(state);
    const next = cloneState(state);
    next.availablePoints += refunded;
    next.abilities = Object.fromEntries(SPECIES_ABILITY_DEFINITIONS.map((definition) => [definition.id, {
      rootUnlocked: false,
      powerLevel: 0,
      gradeLevel: 0
    }]));
    return { ok: true, reason: null, refunded, state: next };
  }
  function getAbilityNodeStatus(state, definition, nodeId, context = {}) {
    const node = parseNodeId(nodeId);
    if (!node) return { purchased: false, ready: false, reason: "unknown-node" };
    const investment = state?.abilities?.[definition.id] || { rootUnlocked: false, powerLevel: 0, gradeLevel: 0 };
    if (node.kind === "root" && investment.rootUnlocked) return { purchased: true, ready: false, reason: "already-invested" };
    if (node.kind === "power" && node.level <= investment.powerLevel) return { purchased: true, ready: false, reason: "already-invested" };
    if (node.kind === "grade" && node.level <= investment.gradeLevel) return { purchased: true, ready: false, reason: "already-invested" };
    const result = canPurchaseAbilityNode(state, definition.id, nodeId, context);
    return { purchased: false, ready: result.allowed, reason: result.reason };
  }
  function renderAbilityTreeMarkup(state, {
    highestSpeciesTier = {},
    location: location2 = "farm",
    inCombat = false,
    selectedSpecies = null
  } = {}) {
    if (!isValidAbilityProgressionState(state)) throw new TypeError("Cannot render invalid ability progression state");
    const invested = getInvestedPointCount(state);
    const context = { highestSpeciesTier, location: location2, inCombat };
    const resetCheck = canResetAbilityProgression(state, context);
    const visibleDefinitions = Number.isInteger(selectedSpecies) ? SPECIES_ABILITY_DEFINITIONS.filter((definition) => definition.species === selectedSpecies) : SPECIES_ABILITY_DEFINITIONS;
    const cards = visibleDefinitions.map((definition) => renderAbilityCard(state, definition, context)).join("");
    const levelMarkup = renderPlayerProgressMarkup(state);
    return `<section class="ability-tree" aria-labelledby="ability-tree-title">
    <header class="ability-tree__header">
      <div><p class="ability-tree__eyebrow">정원 성장</p><h2 id="ability-tree-title">특수 능력</h2></div>
      <p class="ability-tree__wallet" aria-live="polite"><strong>${state.availablePoints}</strong><span>공용 포인트</span></p>
    </header>
    <p class="ability-tree__note">능력마다 Rare(T3)에서 해금할 수 있고, 강화와 적용 등급 완화에 같은 포인트를 씁니다. 사용하지 않은 포인트는 보존됩니다.</p>
    ${levelMarkup}
    <div class="ability-tree__actions">
      <p class="ability-tree__lock-note" role="status">${inCombat ? "전투 중에는 투자와 초기화가 잠깁니다." : location2 !== "farm" ? "농장에서 투자하거나 초기화할 수 있습니다." : "농장에서 무료로 초기화할 수 있습니다."}</p>
      <button type="button" class="ability-tree__reset" data-ability-action="reset" aria-describedby="ability-tree-reset-help" aria-disabled="${!resetCheck.allowed}">무료 초기화</button>
      <span class="ability-tree__action-help" id="ability-tree-reset-help">${resetReasonLabel(resetCheck.reason, invested)}</span>
    </div>
    <div class="ability-tree__cards">${cards}</div>
  </section>`;
  }
  function renderPlayerProgressMarkup(state) {
    if (!Number.isSafeInteger(state.level) || state.level < 1 || !Number.isFinite(state.experience) || state.experience < 0) return "";
    const nextLevelXp = experienceForNextLevel(state.level);
    if (!Number.isFinite(nextLevelXp) || state.experience >= nextLevelXp) return "";
    const label = `플레이어 레벨 ${state.level} 경험치`;
    return `<div class="ability-tree__progress" aria-live="polite">
    <div><strong>플레이어 Lv. ${state.level}</strong><span>${formatXpForDisplay(state.experience)} / ${formatXpForDisplay(nextLevelXp)} XP</span></div>
    <progress max="${nextLevelXp}" value="${state.experience}" aria-label="${label}"></progress>
  </div>`;
  }
  function renderAbilityCard(state, definition, context) {
    const investment = state.abilities[definition.id];
    const powerNodes = definition.powerValues.slice(1).map((value, index) => {
      const level = index + 1;
      const label = powerLabel(definition.id, value, level);
      return renderNode(state, definition, `power-${level}`, powerTitle(definition.id, value), label, context);
    }).join("");
    const gradeNodes = definition.gradeThresholds.slice(1).map((tier, index) => {
      const level = index + 1;
      const grade = tier === 2 ? "Uncommon (T2)" : "Common (T1)";
      return renderNode(state, definition, `grade-${level}`, `${grade}까지`, `최소 적용 등급 ${grade}`, context);
    }).join("");
    const minimumTier = getMinimumApplicableTier(state, definition.id);
    const rootStatus = getAbilityNodeStatus(state, definition, "root", context);
    const speciesName = speciesNames.get(definition.species) || `종 ${definition.species}`;
    return `<article class="ability-card" data-species="${definition.species}" data-ability="${definition.id}">
    <header class="ability-card__header"><div><p class="ability-card__species">${speciesName}</p><h3>${definition.name}</h3></div><span class="ability-card__grade">${investment.rootUnlocked ? `최소 T${minimumTier}` : "Rare · T3 해금"}</span></header>
    <p class="ability-card__description">${definition.description}</p>
    <div class="ability-card__root">
      <span class="ability-node__branch-label">능력 루트</span>
      ${renderNode(state, definition, "root", "능력 해금", `Rare (T${definition.rootTier}) 개체 필요`, context, rootStatus)}
      <p class="ability-card__base-effect">기본 효과: ${powerLabel(definition.id, definition.powerValues[0], 0)}</p>
    </div>
    <div class="ability-card__branches">
      <section class="ability-branch" aria-label="능력 강화 경로"><h4>능력 강화</h4><div class="ability-branch__nodes">${powerNodes}</div></section>
      <section class="ability-branch" aria-label="적용 등급 완화 경로"><h4>적용 등급 완화</h4><div class="ability-branch__nodes">${gradeNodes}</div></section>
    </div>
  </article>`;
  }
  function renderNode(state, definition, nodeId, title, effect, context, knownStatus = null) {
    const status = knownStatus || getAbilityNodeStatus(state, definition, nodeId, context);
    const hintId = `ability-help-${definition.id}-${nodeId.replace(/[^a-z0-9-]/gi, "-")}`;
    const statusText = status.purchased ? "투자 완료" : nodeReasonLabel(status.reason, definition, context);
    const attr = nodeId === "root" ? `${definition.id}:root` : `${definition.id}:${nodeId.replace(/-(\d+)$/, ":$1")}`;
    return `<div class="ability-node ${status.purchased ? "is-purchased" : ""} ${status.ready ? "is-ready" : "is-locked"}">
    <button type="button" class="ability-node__button" data-ability-node="${attr}" aria-describedby="${hintId}" aria-disabled="${!status.ready}">
      <span class="ability-node__title">${title}</span><span class="ability-node__effect">${effect}</span><span class="ability-node__cost">${status.purchased ? "완료" : "1 포인트"}</span>
    </button>
    <span class="ability-node__status" id="${hintId}">${statusText}</span>
  </div>`;
  }
  function powerLabel(abilityId, value, level) {
    if (abilityId === "pea-death-split") return `전투 사망 시 같은 종 T1 ${value}마리 생성`;
    if (abilityId === "corn-burst-fire") {
      const share = definitionById.get(abilityId).projectileAttackShare;
      return `한 공격 주기 · 발사 ${value}발 · 발당 ATK ×${abilityProfile(1).skillMultiplier * share}`;
    }
    if (abilityId === "corn-popcorn-chain") {
      const definition = definitionById.get(abilityId);
      const radiusMultiplier = definition.radiusMultipliers[level] || definition.radiusMultipliers[0];
      return `착탄 ${definition.fuseSeconds}초 후 · 팝콘 접촉 즉시 연쇄 · 피해 ATK ×${value} · 반경 기본 사거리 ×${definition.baseRangeFraction} ×${radiusMultiplier}`;
    }
    if (abilityId === "chestnut-spike-fan") {
      const definition = definitionById.get(abilityId);
      return `목표 방향 부채꼴 90° ${value}발 · 발당 ATK ×${definition.projectileAttackMultiplier} · 기본 공격 ${definition.intervalBasicCycles}주기마다`;
    }
    if (abilityId === "kidney-continuous-leap") return `착지 후 도약 쿨다운 초기화 ${Math.round(value * 100)}%`;
    if (abilityId === "kidney-landing-shockwave") return `충격파 피해·반경 ${value}×`;
    return `강화 ${level}`;
  }
  function powerTitle(abilityId, value) {
    if (abilityId === "pea-death-split") return `T1 ${value}마리 생성`;
    if (abilityId === "corn-burst-fire") return `${value}발 연사`;
    if (abilityId === "corn-popcorn-chain") return `ATK ×${value} 폭발`;
    if (abilityId === "chestnut-spike-fan") return `가시 ${value}발`;
    if (abilityId === "kidney-continuous-leap") return `초기화 ${Math.round(value * 100)}%`;
    if (abilityId === "kidney-landing-shockwave") return `충격파 ×${value}`;
    return "능력 강화";
  }
  function nodeReasonLabel(reason, definition, context) {
    switch (reason) {
      case "already-invested":
        return "이미 투자한 노드입니다.";
      case "root-required":
        return "먼저 능력 루트를 해금하세요.";
      case "prerequisite-required":
        return "이전 단계에 먼저 투자하세요.";
      case "insufficient-points":
        return "공용 포인트가 필요합니다.";
      case "requires-rare-tier":
        return `이 종의 Rare (T${definition.rootTier}) 이상 개체가 필요합니다.`;
      case "combat-lock":
        return "전투 중에는 투자할 수 없습니다.";
      case "farm-only":
        return "농장에서만 투자할 수 있습니다.";
      case "max-level":
        return "최대 강화 단계입니다.";
      case "invalid-state":
        return "성장 데이터가 유효하지 않습니다.";
      default:
        return context.location === "farm" ? "사용할 수 없는 노드입니다." : "농장에서 사용할 수 있습니다.";
    }
  }
  function resetReasonLabel(reason, invested) {
    if (reason === "nothing-invested") return "투자한 포인트가 없습니다.";
    if (reason === "combat-lock") return "전투 중에는 초기화할 수 없습니다.";
    if (reason === "farm-only") return "농장에서만 초기화할 수 있습니다.";
    if (reason === "invalid-state") return "성장 데이터가 유효하지 않습니다.";
    return `투자 ${invested}개를 무료로 돌려받습니다.`;
  }
  function parseNodeId(nodeId) {
    if (nodeId === "root") return { kind: "root", level: 0 };
    const match = /^(power|grade)-(\d+)$/.exec(String(nodeId || ""));
    if (!match) return null;
    return { kind: match[1], level: Number(match[2]) };
  }
  function cloneState(state) {
    return {
      ...state,
      abilities: Object.fromEntries(Object.entries(state.abilities).map(([id, value]) => [id, { ...value }]))
    };
  }
  var SHARED_ABILITY_POINT_COST, definitionById, speciesNames;
  var init_ability_tree = __esm({
    "src/ability-tree.js"() {
      init_ability_catalog();
      init_ability_state();
      init_unit_abilities();
      init_player_progression();
      init_ability_state();
      SHARED_ABILITY_POINT_COST = 1;
      definitionById = new Map(SPECIES_ABILITY_DEFINITIONS.map((definition) => [definition.id, definition]));
      speciesNames = /* @__PURE__ */ new Map([[0, "완두콩"], [1, "옥수수"], [2, "팥"], [3, "밤톨"]]);
    }
  });

  // src/species-abilities.js
  function definitionFor(abilityId) {
    return definitionById2.get(abilityId) || null;
  }
  function getBeanSplitCount(progression, tier = 3) {
    const definition = definitionFor("pea-death-split");
    if (!isAbilityActive(progression, definition.id, tier)) return 0;
    const level = powerLevelFor(progression, definition.id);
    return definition.powerValues[level] || definition.powerValues[0];
  }
  function getCornBurstConfig(progression, tier) {
    const definition = definitionFor("corn-burst-fire");
    if (!isAbilityActive(progression, definition.id, tier)) return null;
    const level = powerLevelFor(progression, definition.id);
    return {
      species: 1,
      attackKind: "lob",
      projectileCount: definition.powerValues[level],
      perProjectileAttackMultiplier: abilityProfile(definition.species).skillMultiplier * definition.projectileAttackShare,
      skillMultiplierShare: definition.projectileAttackShare,
      oneBasicAttackCycle: true,
      timeSpaced: true
    };
  }
  function createCornBurstShotSchedule(config, { activeSeconds, recoverySeconds } = {}) {
    if (!config || !Number.isFinite(activeSeconds) || activeSeconds < 0 || !Number.isFinite(recoverySeconds) || recoverySeconds < 0) return [];
    const windowSeconds = activeSeconds + recoverySeconds;
    if (!(windowSeconds > 0) || !Number.isSafeInteger(config.projectileCount) || config.projectileCount < 1) return [];
    return Array.from({ length: config.projectileCount }, (_, index) => ({
      shotIndex: index,
      delaySeconds: index * windowSeconds / config.projectileCount,
      attackMultiplier: config.perProjectileAttackMultiplier
    }));
  }
  function getPopcornExplosionConfig(progression, tier) {
    const definition = definitionFor("corn-popcorn-chain");
    if (!isAbilityActive(progression, definition.id, tier)) return null;
    const level = powerLevelFor(progression, definition.id);
    const radiusMultiplier = definition.radiusMultipliers[level];
    return {
      species: definition.species,
      fuseSeconds: definition.fuseSeconds,
      chainOnPopcornContact: true,
      triggersOncePerProjectile: true,
      eachTargetAtMostOncePerProjectile: true,
      damageMultiplier: definition.powerValues[level],
      radiusBaseRangeFraction: definition.baseRangeFraction,
      radiusMultiplier,
      radius: abilityProfile(definition.species).range * definition.baseRangeFraction * radiusMultiplier
    };
  }
  function getChestnutSpikeConfig(progression, tier) {
    const definition = definitionFor("chestnut-spike-fan");
    if (!isAbilityActive(progression, definition.id, tier)) return null;
    const level = powerLevelFor(progression, definition.id);
    return {
      species: definition.species,
      targetPattern: "fan-toward-target",
      projectileCount: definition.powerValues[level],
      projectileAttackMultiplier: definition.projectileAttackMultiplier,
      fanSpreadRadians: definition.fanSpreadRadians,
      intervalBasicCycles: definition.intervalBasicCycles
    };
  }
  function getChestnutSpikeIntervalSeconds(config, basicAttackCycleSeconds) {
    if (!config || !Number.isFinite(basicAttackCycleSeconds) || basicAttackCycleSeconds <= 0) return null;
    return config.intervalBasicCycles * basicAttackCycleSeconds;
  }
  function getChestnutSpikeFanAngles(config, targetAngle) {
    if (!config || !Number.isSafeInteger(config.projectileCount) || config.projectileCount < 1 || !Number.isFinite(config.fanSpreadRadians) || config.fanSpreadRadians < 0 || !Number.isFinite(targetAngle)) return [];
    if (config.projectileCount === 1) return [targetAngle];
    const start2 = targetAngle - config.fanSpreadRadians / 2;
    const step = config.fanSpreadRadians / (config.projectileCount - 1);
    return Array.from({ length: config.projectileCount }, (_, index) => start2 + step * index);
  }
  function createBeanSplitDescriptors({ unit, progression, inBattle = false } = {}) {
    if (!inBattle || !unit || unit.species !== 0 || !Number.isFinite(unit.hp) || unit.hp > 0 || unit.isBattleOnlySummon || unit.battleOnlySummon || unit.canSplit === false || unit.splitUsedThisBattle === true) return [];
    const count = getBeanSplitCount(progression, unit.tier);
    if (!count) return [];
    return Array.from({ length: count }, () => ({
      species: unit.species,
      tier: 1,
      isBattleOnlySummon: true,
      battleSummonKind: "pea-death-split",
      battleSummonParentId: unit.id,
      ownerId: unit.ownerId || "",
      farmId: unit.farmId || 0,
      countsTowardPermanentRoster: false,
      eligibleForRaidDeployment: false,
      breedingEligible: false,
      mergeEligible: false,
      canSplit: false,
      splitUsedThisBattle: true,
      usesPersistentSleep: false,
      lifetime: "until-death-or-battle-end"
    }));
  }
  function getContinuousLeapConfig(progression, tier) {
    const definition = definitionFor("kidney-continuous-leap");
    if (!isAbilityActive(progression, definition.id, tier)) return null;
    const level = powerLevelFor(progression, definition.id);
    return {
      cooldownResetChance: definition.powerValues[level],
      resetCooldownOnSuccessfulRoll: true,
      usesExistingAttackReadiness: true,
      leapAtCloseRangeWhenReady: true,
      avoidsGroundSweepWhileAirborne: true
    };
  }
  function shouldResetLeapCooldown(config, roll) {
    return !!config && Number.isFinite(roll) && roll >= 0 && roll < config.cooldownResetChance;
  }
  function getLandingShockwaveConfig(progression, tier) {
    const definition = definitionFor("kidney-landing-shockwave");
    if (!isAbilityActive(progression, definition.id, tier)) return null;
    const level = powerLevelFor(progression, definition.id);
    const multiplier = definition.powerValues[level];
    return {
      damageMultiplier: multiplier,
      radiusMultiplier: multiplier,
      triggersOncePerLanding: true,
      // Repeated shockwaves happen only when the separate continuous-leap tree
      // causes another leap to occur; this module invents no timing or loop.
      repeatedAfterCooldownReset: isAbilityActive(progression, "kidney-continuous-leap", tier)
    };
  }
  var definitionById2, MAX_BEAN_SPLIT_CHILDREN;
  var init_species_abilities = __esm({
    "src/species-abilities.js"() {
      init_ability_tree();
      init_ability_catalog();
      init_unit_abilities();
      definitionById2 = new Map(SPECIES_ABILITY_DEFINITIONS.map((definition) => [definition.id, definition]));
      MAX_BEAN_SPLIT_CHILDREN = Math.max(
        ...definitionById2.get("pea-death-split").powerValues
      );
    }
  });

  // src/farm-model.js
  function presentationEventTimeMs(event) {
    return presentationEventTimes.get(event) ?? (Number.isFinite(event?.time) ? event.time * 1e3 : 0);
  }
  function bindPresentationClock(world, clock) {
    if (clock) presentationClocks.set(world, clock);
    else presentationClocks.delete(world);
  }
  function bossAttackArea(boss, unitRadius = 0) {
    const c = CONFIG.raid, phase = boss.phase, heavy = phase === "sweep-windup" || phase === "sweep", wind = phase === "sweep-windup" || phase === "strike-windup";
    if (!heavy && phase !== "strike-windup" && phase !== "strike") return null;
    const width = c.weaponRadius + Math.max(0, unitRadius), duration = heavy ? wind ? c.sweepWindup : c.sweepDuration : wind ? c.basicWindup : c.basicDuration;
    return heavy ? { kind: "sweep", x: boss.x, y: boss.y, width, sweepRadius: c.sweepReach, outerRadius: c.sweepReach + width, startAngle: (boss.startAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2), progress: clamp2(boss.clock / duration, 0, 1), active: phase === "sweep" } : { kind: "basic", x: boss.x, y: boss.y, width, startRadius: Math.max(0, boss.radius - 0.25), endRadius: c.basicReach, angle: boss.angle, progress: clamp2(boss.clock / duration, 0, 1), active: phase === "strike" };
  }
  function contact(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), r = a.radius + b.radius;
    if (Math.abs(a.z - b.z) > 0.65) return false;
    if (d >= r) {
      if (d < r + 0.22 && a.z < 0.1 && b.z < 0.1 && a.ability.phase === "idle" && b.ability.phase === "idle") {
        const k = (r + 0.22 - d) * 0.035 / (d || 1);
        a.x -= dx * k;
        a.y -= dy * k;
        b.x += dx * k;
        b.y += dy * k;
      }
      return false;
    }
    const nx = d > 1e-6 ? dx / d : 1, ny = d > 1e-6 ? dy / d : 0, overlap = r - d;
    a.x -= nx * overlap * 0.5;
    a.y -= ny * overlap * 0.5;
    b.x += nx * overlap * 0.5;
    b.y += ny * overlap * 0.5;
    const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (closing > 0) {
      const impulse = closing * 0.57;
      const impulseA = resolveKnockback(impulse, b, a), impulseB = resolveKnockback(impulse, a, b);
      a.vx -= nx * impulseA;
      a.vy -= ny * impulseA;
      b.vx += nx * impulseB;
      b.vy += ny * impulseB;
      if (closing > 2) {
        const receiver = Math.hypot(a.vx, a.vy) > Math.hypot(b.vx, b.vy) ? a : b;
        receiver.vz = Math.max(receiver.vz, Math.min(4, closing * 0.2));
        receiver.stun = Math.max(receiver.stun, resolveStatusDuration(0.3, receiver === a ? b : a, receiver));
        receiver.flash = 0.1;
      }
    }
    return true;
  }
  var SeededPRNG, presentationClocks, presentationEventTimes, BREED_COOLDOWN_SECONDS, CONFIG, MAP_ENEMY_TARGETS, clamp2, stats, Body, Knockable, TREE_NODES, FarmProgress, ArenaGeometry, Ballistics, AttackCycle, AttackingBody, Unit, Garden;
  var init_farm_model = __esm({
    "src/farm-model.js"() {
      init_unit_stats();
      init_unit_abilities();
      init_boss_rewards();
      init_player_progression();
      init_ability_tree();
      init_ability_state();
      init_species_abilities();
      init_species_abilities();
      ({ SeededPRNG } = globalThis.BloomGamekitDeterministic);
      presentationClocks = /* @__PURE__ */ new WeakMap();
      presentationEventTimes = /* @__PURE__ */ new WeakMap();
      BREED_COOLDOWN_SECONDS = 10;
      CONFIG = Object.freeze({ cap: 72, maxFarmCap: 100, maxFarmBattleUnits: 100 * (1 + MAX_BEAN_SPLIT_CHILDREN), maxFarmUnitId: 999999999, maxRaidPlayerUnits: 100, maxRaidPlayers: 4, raidPlayerIdStride: 1e6, maxRaidUnits: 400, maxRaidBattleUnits: 400 * (1 + MAX_BEAN_SPLIT_CHILDREN), maxRaidProjectiles: 400 * (1 + MAX_BEAN_SPLIT_CHILDREN) * 4, raidSummonIdBase: 4e6 + 100 + 1, maxSpecies: 4, maxUnitRadius: 0.47, maxTier: 4, starterSeconds: 60, breedCooldownSeconds: BREED_COOLDOWN_SECONDS, breedGrowthSeconds: BREED_COOLDOWN_SECONDS / 2, mergeAnimationSeconds: 0.85, matureMeals: 3, corpseRecoverySeconds: 60, farmBossEvent: Object.freeze({ spawnChance: 0.01, fadeSeconds: 0.5, celebrationSeconds: 1 }), gravity: 19, fixedStep: 1 / 120, raid: Object.freeze({ radiusX: 23, radiusY: 17, perceptionRange: 18, bossRadius: 4.4, bossHeight: 5.2, basicReach: 6.2, sweepReach: 6.5, weaponRadius: 0.85, chaseSpeed: 2.65, basicWindup: 0.5, basicDuration: 0.24, basicRecover: 0.48, sweepWindup: 1.05, sweepDuration: 1.05, sweepRecover: 1.05, sweepInterval: 6.8, dropHeight: 3, buffDuration: 3, buffCooldown: 12, buffDamage: 1.25 }) });
      MAP_ENEMY_TARGETS = { farm: (world) => world.farmBossEvent?.phase === "fighting" && world.boss?.active ? [world.boss] : [], raid: (world) => world.running && world.raidDeploymentStarted && world.boss?.active ? [world.boss] : [] };
      clamp2 = (x, a, b) => Math.max(a, Math.min(b, x));
      stats = (tier, species) => resolveUnitStats({ tier, species });
      Body = class {
        constructor(x, y) {
          Object.assign(this, { x, y, z: 0, vx: 0, vy: 0, vz: 0, angle: 0, stun: 0, flash: 0, bounce: 0 });
        }
      };
      Knockable = (Base) => class extends Base {
        knock(nx, ny, power, lift = 0, source = null) {
          const appliedPower = resolveKnockback(power, source, this);
          this.vx += nx * appliedPower;
          this.vy += ny * appliedPower;
          this.vz = Math.max(this.vz, lift * (power > 0 ? appliedPower / power : 0));
          this.stun = Math.max(this.stun, resolveStatusDuration(0.5, source, this));
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
      TREE_NODES = [
        { id: "production", name: "새싹 생산", icon: "♧", metric: "eat", goal: 8, parent: null, description: "이전 저장 호환용 · 새싹 자동 생산은 종료", value: (l) => `${(60 / (1 + 0.1 * l)).toFixed(1)}초`, hidden: true },
        { id: "food", name: "자동 탭", icon: "◒", metric: "eat", goal: 12, parent: null, description: "자동 탭 속도 +10%/단계 · 수동은 매 탭 +1", value: (l) => `${(0.5 / (1 + 0.1 * l)).toFixed(3)}초 / 탭` },
        { id: "growth", name: "먹이 찾기", icon: "❧", metric: "eat", goal: 10, parent: null, description: "먹이를 향한 이동속도 +10%/단계", value: (l) => `${(2.2 * (1 + 0.1 * l)).toFixed(2)} 속도` },
        { id: "breed", name: "번식 회복", icon: "♡", metric: "birth", goal: 2, parent: "growth", description: "부모 대기시간 감소 · 새끼 성장시간은 대기시간의 절반", value: (l) => `${(CONFIG.breedCooldownSeconds / (1 + 0.1 * l)).toFixed(2)}초` },
        { id: "merge", name: "합체 회복", icon: "◇", metric: "merge", goal: 2, parent: "growth", description: "합체 후 대기 속도 +10%/단계 · 체력·공격 배율 유지", value: (l) => `${(4 / (1 + 0.1 * l)).toFixed(2)}초` },
        { id: "capacity", name: "Garden expansion", icon: "＋", metric: "birth", goal: 3, parent: "growth", description: "Expand farm capacity by 7 per level, up to 100.", value: (l) => `${Math.min(100, 72 + 7 * l)} troops` }
      ];
      FarmProgress = class {
        constructor() {
          this.levels = Object.fromEntries(TREE_NODES.map((n) => [n.id, 0]));
          this.records = { eat: 0, birth: 0, merge: 0, hit: 0 };
        }
        record(kind) {
          if (kind in this.records) this.records[kind]++;
        }
        ready(n) {
          return !n.hidden && this.levels[n.id] < 4 && (!n.parent || this.levels[n.parent] > 0) && this.records[n.metric] >= n.goal * (this.levels[n.id] + 1);
        }
        invest(id) {
          const n = TREE_NODES.find((n2) => n2.id === id);
          if (!n || !this.ready(n)) return false;
          this.levels[id]++;
          return true;
        }
        rate(id) {
          return 1 + 0.1 * this.levels[id];
        }
        get autoTapSeconds() {
          return 0.5 / this.rate("food");
        }
      };
      ArenaGeometry = {
        bounds(scene = "raid", margin = 0) {
          return scene === "raid" ? { x: CONFIG.raid.radiusX - margin, y: CONFIG.raid.radiusY - margin } : { x: 9.5 - margin, y: 6.8 - margin };
        },
        inside(p, scene = "raid", margin = 0) {
          const r = this.bounds(scene, margin);
          return p.x * p.x / (r.x * r.x) + p.y * p.y / (r.y * r.y) <= 1;
        },
        clamp(p, scene = "raid", margin = 0) {
          const r = this.bounds(scene, margin), k = Math.max(1, Math.hypot(p.x / r.x, p.y / r.y));
          return { x: p.x / k, y: p.y / k };
        },
        overlaps(a, b) {
          return a.z <= b.z + b.height && a.z + a.height >= b.z && Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius;
        },
        // Swept XY cylinder versus finite Z interval; includes entity radii, never center-only.
        sweep(a, b, r, h, target) {
          const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, R2 = r + target.radius;
          let lo = 0, hi = 1;
          const A = dx * dx + dy * dy, B = 2 * ((a.x - target.x) * dx + (a.y - target.y) * dy), C = (a.x - target.x) ** 2 + (a.y - target.y) ** 2 - R2 * R2;
          if (A < 1e-12) {
            if (C > 0) return null;
          } else {
            const D = B * B - 4 * A * C;
            if (D < 0) return null;
            lo = Math.max(lo, (-B - Math.sqrt(D)) / (2 * A));
            hi = Math.min(hi, (-B + Math.sqrt(D)) / (2 * A));
          }
          const bottom = target.z - h, top = target.z + target.height;
          if (Math.abs(dz) < 1e-12) {
            if (a.z < bottom || a.z > top) return null;
          } else {
            let x = (bottom - a.z) / dz, y = (top - a.z) / dz;
            if (x > y) [x, y] = [y, x];
            lo = Math.max(lo, x);
            hi = Math.min(hi, y);
          }
          if (lo > hi || hi < 0 || lo > 1) return null;
          const t = clamp2(lo, 0, 1);
          return { x: a.x + dx * t, y: a.y + dy * t, z: a.z + dz * t, t };
        }
      };
      Ballistics = {
        create(from, to, kind) {
          const distance = Math.hypot(to.x - from.x, to.y - from.y), melee = kind === "ram" || kind === "punch";
          return { from: { x: from.x, y: from.y, z: kind === "lob" ? 0.45 : 0 }, to: { ...to }, height: melee ? 0 : kind === "lob" ? 2 : 2.7, duration: melee ? Math.max(0.12, distance / 10) : 0.65 + distance * 0.055 };
        },
        sample(path, q) {
          q = clamp2(q, 0, 1);
          return { x: path.from.x + (path.to.x - path.from.x) * q, y: path.from.y + (path.to.y - path.from.y) * q, z: path.from.z * (1 - q) + 4 * path.height * q * (1 - q) };
        }
      };
      AttackCycle = class {
        constructor(owner) {
          this.owner = owner;
          this.phase = "idle";
          this.elapsed = 0;
          this.action = null;
        }
        get spec() {
          return abilityProfile(this.owner.species);
        }
        begin(sim, target) {
          const u = this.owner;
          if (this.phase !== "idle" || u.down > 0 || u.stun > 0 || u.z > 0.1) return false;
          this.phase = "windup";
          this.elapsed = 0;
          this.action = { id: ++sim.attackSerial, target: { ...target }, hit: false, path: null };
          u.angle = Math.atan2(target.y - u.y, target.x - u.x);
          u.vx = u.vy = 0;
          sim.combatEvent("prepare", u, this.action);
          return true;
        }
        interrupt() {
          if (this.phase !== "idle") {
            this.phase = "recover";
            this.elapsed = 0;
            this.action = null;
          }
        }
        recover(sim, recoil = false) {
          this.phase = "recover";
          this.elapsed = 0;
          const u = this.owner;
          if (recoil) {
            u.vx = -Math.cos(u.angle) * 2.2;
            u.vy = -Math.sin(u.angle) * 2.2;
          }
          sim.combatEvent("recover", u, this.action);
        }
        update(sim, dt) {
          const u = this.owner;
          if (u.stun > 0 || u.down > 0) {
            this.interrupt();
            return true;
          }
          if (this.phase === "idle") return false;
          this.elapsed += dt;
          if (this.phase === "windup") {
            u.vx *= Math.exp(-dt * 18);
            u.vy *= Math.exp(-dt * 18);
            if (this.elapsed >= this.spec.windup) {
              this.elapsed = 0;
              this.phase = "active";
              const a = this.action;
              a.path = Ballistics.create(u, a.target, this.spec.kind);
              sim.combatEvent("launch", u, a);
              if (this.spec.kind === "lob") {
                const burst = getCornBurstConfig(sim.abilityProgressionFor(u), u.tier);
                const popcorn = getPopcornExplosionConfig(sim.abilityProgressionFor(u), u.tier);
                const recovery = scaleAttackRecovery(this.spec.recovery, u);
                const shots = burst ? createCornBurstShotSchedule(burst, { activeSeconds: 0, recoverySeconds: recovery }) : [{ shotIndex: 0, delaySeconds: 0, attackMultiplier: this.spec.skillMultiplier }];
                a.pendingShots = shots.slice(1);
                a.projectileAbility = { popcorn };
                sim.spawnLobProjectile(u, a, shots[0], popcorn);
                this.recover(sim, true);
              }
            }
          } else if (this.phase === "recover") {
            const pending = this.action?.pendingShots || [];
            while (pending.length && pending[0].delaySeconds <= this.elapsed + 1e-9) {
              const shot = pending.shift();
              sim.spawnLobProjectile(u, this.action, shot, this.action.projectileAbility?.popcorn || null);
            }
            if (this.elapsed >= scaleAttackRecovery(this.spec.recovery, u)) {
              this.phase = "idle";
              this.action = null;
              this.elapsed = 0;
            }
          }
          return true;
        }
        integrate(dt) {
          const u = this.owner, a = this.action;
          if (this.phase !== "active" || !a?.path || u.stun > 0 || u.down > 0) return false;
          const p = Ballistics.sample(a.path, this.elapsed / a.path.duration);
          u.vx = (p.x - u.x) / dt;
          u.vy = (p.y - u.y) / dt;
          u.vz = (p.z - u.z) / dt;
          u.x = p.x;
          u.y = p.y;
          u.z = p.z;
          u.flash = Math.max(0, u.flash - dt);
          u.bounce = Math.max(0, u.bounce - dt);
          return true;
        }
        afterMove(sim, old) {
          const a = this.action, u = this.owner;
          if (this.phase !== "active" || !a?.path) return;
          const areaRadius = scaleAttackArea(u.radius, u);
          const hit = !a.hit && ArenaGeometry.sweep(old, u, areaRadius, 0.65, sim.boss);
          if (hit) {
            sim.damageBoss(u, a, hit);
            if (this.spec.kind === "ram" || this.spec.kind === "punch") {
              u.x = hit.x;
              u.y = hit.y;
              u.z = hit.z;
              this.recover(sim, true);
              return;
            }
          }
          if (this.elapsed >= a.path.duration) {
            u.z = 0;
            u.vz = 0;
            u.vx = u.vy = 0;
            if (this.spec.kind === "leap") {
              u.bounce = 0.2;
              sim.combatEvent("land-attack", u, a);
              if (!a.hit && ArenaGeometry.overlaps({ x: u.x, y: u.y, z: 0, radius: scaleAttackArea(u.radius + 0.35, u), height: 0.65 }, sim.boss)) sim.damageBoss(u, a, u);
              const progression = sim.abilityProgressionFor(u), leap = getContinuousLeapConfig(progression, u.tier), shockwave = getLandingShockwaveConfig(progression, u.tier);
              if (shockwave) sim.triggerLandingShockwave(u, a, shockwave);
              if (leap && shouldResetLeapCooldown(leap, sim.random())) {
                this.phase = "idle";
                this.elapsed = 0;
                this.action = null;
                sim.combat("leap-cooldown-reset", { unit: u.id, ownerId: u.ownerId, species: u.species });
                return;
              }
            }
            this.recover(sim, true);
          }
        }
      };
      AttackingBody = (Base) => class extends Base {
        constructor(...args) {
          super(...args);
          this.ability = new AttackCycle(this);
        }
        knock(...args) {
          this.ability.interrupt();
          super.knock(...args);
        }
        integrate(dt) {
          if (!this.ability.integrate(dt)) super.integrate(dt);
        }
      };
      Unit = class extends AttackingBody(Knockable(Body)) {
        constructor(id, species, tier, x, y) {
          super(x, y);
          Object.assign(this, {
            id,
            species,
            tier,
            meals: 0,
            growth: 0,
            growthElapsed: 0,
            growthDuration: CONFIG.breedGrowthSeconds,
            age: 0,
            cooldown: 0,
            cooldownDuration: 0,
            mateId: 0,
            perceptionRange: CONFIG.raid.perceptionRange,
            home: { x, y },
            hp: stats(tier, species).maxHp,
            down: 0,
            seed: id * 2.39996,
            ownerId: "",
            farmId: 0,
            dropLanded: true,
            isBattleOnlySummon: false,
            battleSummonKind: "",
            battleSummonParentId: 0,
            countsTowardPermanentRoster: true,
            eligibleForRaidDeployment: true,
            breedingEligible: true,
            mergeEligible: true,
            canSplit: true,
            splitUsedThisBattle: false,
            deathSplitHandled: false,
            usesPersistentSleep: true,
            lifetime: "",
            chestnutBasicCycles: 0
          });
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
          const growth = this.mature ? 1 : this.growthDuration > 0 ? clamp2(this.growthElapsed / this.growthDuration, 0, 1) : 1;
          return (0.55 + 0.1 * this.tier) * (0.5 + 0.5 * growth);
        }
      };
      Garden = class {
        constructor(seed = 731) {
          this.seed = seed;
          this.progress = new FarmProgress();
          this.notices = [];
          this.eventSequence = 0;
          this.mergeTask = null;
          this.reset();
        }
        static createRaidBattle(seed = 731, expectedPlayers = ["solo"]) {
          const w = new Garden(seed);
          w.units = [];
          w.food = [];
          w.scene = "raid";
          w.running = false;
          w.boss = w.createBoss();
          w.boss.phase = "resting";
          w.encounter = { outcome: "idle", elapsed: 0 };
          w.raidExpectedPlayers = [...expectedPlayers];
          w.raidRosters = [];
          w.raidDeploymentStarted = false;
          w.nextId = 1;
          w.starter = 0;
          return w;
        }
        reset() {
          this.mergeTask = null;
          this.corpseRecoveryVersion = 1;
          this.rng = new SeededPRNG(this.seed);
          this.units = [];
          this.food = [];
          this.effects = [];
          this.events = [];
          this.time = 0;
          this.nextId = 1;
          this.nextBossEncounterId = 1;
          this.bossRewardReceipts = [];
          this.bossRewardWatermarks = { farm: 0, raid: 0 };
          this.nextRaidRunSequence = 0;
          this.activeRaidRunSequence = null;
          this.activeRaidSessionId = null;
          this.raidSettlementWatermark = 0;
          this.raidSettlementReceipts = [];
          this.playerProgression = createPlayerProgressionState();
          this.starter = 0;
          this.notices = [];
          this.eventSequence = 0;
          this.foodTaps = { remainder: 0, autoClock: 0, produced: 0, revision: 0 };
          this.projectiles = [];
          this.attackSerial = 0;
          this.projectileSerial = 0;
          this.raidSummonSerial = 0;
          this.combatLog = [];
          this.mode = "breed";
          this.scene = "farm";
          this.running = false;
          this.encounter = { outcome: "idle", elapsed: 0 };
          this.farmBossEvent = { phase: "idle", elapsed: 0, outcome: "idle", encounterId: 0, rewardStatus: "none", rewardChance: 0, rewardRoll: 0, rewardUnitId: 0 };
          this.boss = this.createBoss();
          this.raidExpectedPlayers = ["solo"];
          this.raidRosters = [];
          this.raidDeploymentStarted = false;
          this.metrics = { births: 0, merges: 0, directHits: 0, contacts: 0, landings: 0, basicHits: 0, sweepHits: 0 };
          for (let i = 0; i < 2; i++) {
            const u = this.spawn(0, 1, (this.random() - 0.5) * 4, (this.random() - 0.5) * 3);
            u.meals = 0;
            u.growth = CONFIG.matureMeals;
            u.growthDuration = this.breedGrowthDuration();
            u.growthElapsed = u.growthDuration;
          }
        }
        get armyHealth() {
          return this.units.reduce((sum, u) => {
            const maxHp = stats(u.tier, u.species).maxHp;
            return { current: sum.current + Math.max(0, Math.min(maxHp, u.hp)), max: sum.max + maxHp, living: sum.living + (u.hp > 0 ? 1 : 0), total: sum.total + 1 };
          }, { current: 0, max: 0, living: 0, total: 0 });
        }
        get capacity() {
          return Math.min(CONFIG.maxFarmCap, CONFIG.cap + 7 * (this.progress?.levels?.capacity || 0));
        }
        breedCooldownDuration() {
          return CONFIG.breedCooldownSeconds / this.progress.rate("breed");
        }
        breedGrowthDuration() {
          return this.breedCooldownDuration() / 2;
        }
        abilityProgressionFor(unit) {
          return this.scene === "raid" ? this.raidRoster(unit?.ownerId)?.abilitySnapshot || null : this.playerProgression;
        }
        highestSpeciesTiers() {
          const tiers = Array(CONFIG.maxSpecies).fill(0);
          for (const unit of this.units) if (!unit.isBattleOnlySummon) tiers[unit.species] = Math.max(tiers[unit.species], unit.tier);
          return tiers;
        }
        investAbilityNode(abilityId, nodeId) {
          const inCombat = this.running || this.farmBossEvent?.phase !== "idle";
          const result = purchaseAbilityNode(this.playerProgression, abilityId, nodeId, { location: this.scene, inCombat, highestSpeciesTier: this.highestSpeciesTiers() });
          if (result.ok) this.playerProgression = result.state;
          return result;
        }
        resetAbilityTree() {
          const inCombat = this.running || this.farmBossEvent?.phase !== "idle";
          const result = resetAbilityProgression(this.playerProgression, { location: this.scene, inCombat });
          if (result.ok) this.playerProgression = result.state;
          return result;
        }
        spawnLobProjectile(unit, action, shot, popcornConfig = null) {
          if (this.projectiles.length >= CONFIG.maxRaidProjectiles) return null;
          const id = ++this.projectileSerial;
          const projectile = { id, owner: unit.id, species: unit.species, tier: unit.tier, path: structuredClone(action.path), elapsed: 0, x: unit.x, y: unit.y, z: 0.45, radius: scaleAttackArea(0.12, unit), height: 0.24, hit: false, attackMultiplier: shot.attackMultiplier ?? this.speciesAbilityDamageMultiplier(unit), shotIndex: shot.shotIndex ?? 0 };
          if (popcornConfig) Object.assign(projectile, { isPopcorn: true, popcornConfig: structuredClone(popcornConfig), landed: false, exploded: false, fuseRemaining: popcornConfig.fuseSeconds, damagedTargetIds: [] });
          this.projectiles.push(projectile);
          return projectile;
        }
        speciesAbilityDamageMultiplier(unit) {
          return abilityProfile(unit.species).skillMultiplier;
        }
        spawnChestnutSpikes(unit, action, config) {
          if (this.projectiles.length + config.projectileCount > CONFIG.maxRaidProjectiles) return false;
          const cycleSeconds = abilityProfile(unit.species).windup + scaleAttackRecovery(abilityProfile(unit.species).recovery, unit), interval = getChestnutSpikeIntervalSeconds(config, cycleSeconds);
          if (!Number.isFinite(interval) || interval <= 0) return false;
          unit.chestnutBasicCycles++;
          if (unit.chestnutBasicCycles % config.intervalBasicCycles !== 0) return false;
          const angle = Math.atan2(action.target.y - unit.y, action.target.x - unit.x), angles = getChestnutSpikeFanAngles(config, angle), distance = Math.hypot(action.target.x - unit.x, action.target.y - unit.y), length = Math.max(abilityProfile(unit.species).range, distance) + this.boss.radius;
          for (let index = 0; index < angles.length; index++) {
            const a = angles[index], target = { x: unit.x + Math.cos(a) * length, y: unit.y + Math.sin(a) * length, z: 0 }, path = Ballistics.create({ x: unit.x, y: unit.y, z: 0 }, target, "punch");
            path.height = 0.7;
            this.projectiles.push({ id: ++this.projectileSerial, owner: unit.id, species: unit.species, tier: unit.tier, path, elapsed: 0, x: unit.x, y: unit.y, z: 0, radius: scaleAttackArea(0.08, unit), height: 0.22, hit: false, attackMultiplier: config.projectileAttackMultiplier, projectileKind: "chestnut-spike", fanIndex: index });
          }
          return true;
        }
        handleUnitDeath(unit) {
          if (!unit || unit.deathSplitHandled) return false;
          unit.deathSplitHandled = true;
          if (unit.isBattleOnlySummon) {
            unit.down = 0;
            this.units = this.units.filter((candidate) => candidate !== unit);
            return false;
          }
          const inBattle = this.scene === "raid" ? this.running : this.farmBossEvent?.phase === "fighting";
          const descriptors = createBeanSplitDescriptors({ unit, progression: this.abilityProgressionFor(unit), inBattle });
          if (!descriptors.length) return false;
          if (this.units.length + descriptors.length > (this.scene === "raid" ? CONFIG.maxRaidBattleUnits : CONFIG.maxFarmBattleUnits)) return false;
          unit.splitUsedThisBattle = true;
          unit.down = CONFIG.corpseRecoverySeconds;
          for (let index = 0; index < descriptors.length; index++) {
            const desc = descriptors[index], angle = (index + 0.5) * Math.PI * 2 / descriptors.length, id = this.scene === "raid" ? CONFIG.raidSummonIdBase + ++this.raidSummonSerial : this.nextId++;
            const x = unit.x + Math.cos(angle) * 0.38, y = unit.y + Math.sin(angle) * 0.38, child = new Unit(id, desc.species, desc.tier, x, y);
            Object.assign(child, desc, { ownerId: unit.ownerId, farmId: unit.farmId, home: { x, y }, hp: stats(desc.tier, desc.species).maxHp, down: 0, growthElapsed: child.growthDuration, growth: CONFIG.matureMeals, meals: 1, dropLanded: true, deathSplitHandled: false });
            this.units.push(child);
          }
          this.combat("pea-split", { unit: unit.id, ownerId: unit.ownerId, species: 0, count: descriptors.length, x: unit.x, y: unit.y });
          return true;
        }
        cleanupBattleSummons() {
          this.units = this.units.filter((unit) => !unit.isBattleOnlySummon);
          this.projectiles = [];
          return true;
        }
        triggerLandingShockwave(unit, action, config) {
          const range = abilityProfile(unit.species).range * config.radiusMultiplier, point = { x: unit.x, y: unit.y, z: 0 }, distance = Math.hypot(unit.x - this.boss.x, unit.y - this.boss.y);
          this.effects.push({ kind: "landing-shockwave", x: unit.x, y: unit.y, z: 0, life: 0, duration: 0.55, radius: range, owner: unit.id });
          if (this.boss.hp > 0 && distance <= range + this.boss.radius) {
            const blast = { id: action.id, hit: false, attackKind: "kidney-shockwave" };
            this.damageBoss(unit, blast, point, { attackMultiplier: config.damageMultiplier, attackKind: "kidney-shockwave" });
          }
          this.combat("kidney-shockwave", { unit: unit.id, ownerId: unit.ownerId, species: 2, x: unit.x, y: unit.y, radius: range, damageMultiplier: config.damageMultiplier });
        }
        senseEnemy(unit) {
          if (unit.hp <= 0 || !unit.dropLanded) return null;
          const targets = MAP_ENEMY_TARGETS[this.scene]?.(this) || [];
          for (const target of targets) if (target && target.hp > 0 && Number.isFinite(target.x) && Number.isFinite(target.y) && Number.isFinite(target.radius) && Math.hypot(unit.x - target.x, unit.y - target.y) <= unit.perceptionRange + target.radius + 1e-9) return target;
          return null;
        }
        raidRoster(ownerId) {
          return this.raidRosters.find((r) => r.ownerId === ownerId) || null;
        }
        setRaidPlayers(players) {
          if (this.scene !== "raid" || !Array.isArray(players) || players.length < 1 || players.length > CONFIG.maxRaidPlayers || players.some((p) => typeof p !== "string" || !p) || new Set(players).size !== players.length) return false;
          const live = [...players], ordered = this.raidDeploymentStarted ? [...this.raidExpectedPlayers, ...live.filter((id) => !this.raidExpectedPlayers.includes(id))] : live;
          if (ordered.length > CONFIG.maxRaidPlayers) return false;
          this.raidExpectedPlayers = ordered;
          if (!this.raidDeploymentStarted) this.raidRosters = this.raidRosters.filter((r) => live.includes(r.ownerId));
          this.raidRosters.sort((a, b) => this.raidExpectedPlayers.indexOf(a.ownerId) - this.raidExpectedPlayers.indexOf(b.ownerId));
          return true;
        }
        raidTotal() {
          return this.raidRosters.reduce((n, r) => n + r.troops.length, 0);
        }
        raidRemaining(ownerId) {
          const r = this.raidRoster(ownerId);
          return r ? r.troops.reduce((n, t) => n + (!t.deployed ? 1 : 0), 0) : 0;
        }
        registerRaidRoster(ownerId, entries, abilitySnapshot = createAbilityRuntimeSnapshot(createPlayerProgressionState()), settlement = null) {
          if (this.scene !== "raid" || !this.raidExpectedPlayers.includes(ownerId) || this.raidRoster(ownerId) || !Array.isArray(entries) || entries.length > CONFIG.maxRaidPlayerUnits || this.raidTotal() + entries.length > CONFIG.maxRaidUnits) return false;
          if (!isValidAbilityRuntimeSnapshot(abilitySnapshot)) return false;
          const hasSettlement = settlement !== null;
          if (hasSettlement && (!settlement || typeof settlement !== "object" || typeof settlement.sessionId !== "string" || !settlement.sessionId.trim() || settlement.sessionId.length > 128 || !Number.isSafeInteger(settlement.runSequence) || settlement.runSequence < 1 || settlement.runSequence > 1e12 || settlement.encounterId !== settlement.runSequence)) return false;
          const ids = /* @__PURE__ */ new Set(), troops = [];
          for (const e of entries) {
            if (!Array.isArray(e) || e.length !== 3 || !Number.isSafeInteger(e[0]) || e[0] < 1 || e[0] > CONFIG.maxFarmUnitId || !Number.isInteger(e[1]) || e[1] < 0 || e[1] >= CONFIG.maxSpecies || !Number.isInteger(e[2]) || e[2] < 1 || e[2] > 4 || ids.has(e[0])) return false;
            ids.add(e[0]);
            troops.push({ farmId: e[0], species: e[1], tier: e[2], deployed: false });
          }
          const orderKey = (farmId) => {
            let h = (this.seed ^ Math.imul(farmId, 2654435769)) >>> 0;
            for (let i = 0; i < ownerId.length; i++) {
              h ^= ownerId.charCodeAt(i);
              h = Math.imul(h, 16777619);
            }
            h ^= h >>> 16;
            h = Math.imul(h, 2146121005);
            h ^= h >>> 15;
            h = Math.imul(h, 2221713035);
            h ^= h >>> 16;
            return h >>> 0;
          };
          troops.sort((a, b) => orderKey(a.farmId) - orderKey(b.farmId) || a.farmId - b.farmId);
          this.raidRosters.push({ ownerId, troops, abilitySnapshot: structuredClone(abilitySnapshot), settlementSessionId: hasSettlement ? settlement.sessionId : "", settlementRunSequence: hasSettlement ? settlement.runSequence : 0, settlementEncounterId: hasSettlement ? settlement.encounterId : 0, lastDeploySequence: 0, buffUntil: 0, buffReadyAt: 0 });
          this.raidRosters.sort((a, b) => this.raidExpectedPlayers.indexOf(a.ownerId) - this.raidExpectedPlayers.indexOf(b.ownerId));
          return true;
        }
        deployNextRaidUnit(ownerId, sequence, x, y) {
          if (this.scene !== "raid" || !this.raidExpectedPlayers.every((id2) => this.raidRoster(id2)) || this.units.length >= CONFIG.maxRaidBattleUnits || !Number.isSafeInteger(sequence) || !Number.isFinite(x) || !Number.isFinite(y)) return false;
          const roster = this.raidRoster(ownerId), troop = roster?.troops.find((t) => !t.deployed);
          if (!roster || sequence !== roster.lastDeploySequence + 1 || !troop || !ArenaGeometry.inside({ x, y }, "raid", 0.5)) return false;
          const farmId = troop.farmId, slot = this.raidExpectedPlayers.indexOf(ownerId), troopIndex = roster.troops.indexOf(troop), id = (slot + 1) * CONFIG.raidPlayerIdStride + troopIndex + 1;
          if (this.units.some((u2) => u2.id === id)) return false;
          const u = new Unit(id, troop.species, troop.tier, x, y), growthDuration = this.breedGrowthDuration();
          Object.assign(u, { ownerId, farmId, z: CONFIG.raid.dropHeight, vz: 0, dropLanded: false, meals: 1, growth: CONFIG.matureMeals, growthDuration, growthElapsed: growthDuration });
          troop.deployed = true;
          roster.lastDeploySequence = sequence;
          this.units.push(u);
          if (!this.raidDeploymentStarted) {
            this.raidDeploymentStarted = true;
            this.running = true;
            this.encounter = { outcome: "fighting", elapsed: 0 };
            this.boss.active = true;
            this.boss.phase = "chase";
          }
          this.combat("unit-drop", { unit: id, ownerId, x, y, z: u.z });
          return true;
        }
        useRaidBuff(ownerId) {
          const r = this.raidRoster(ownerId);
          if (!this.running || !r || this.time < r.buffReadyAt) return false;
          r.buffUntil = this.time + CONFIG.raid.buffDuration;
          r.buffReadyAt = this.time + CONFIG.raid.buffCooldown;
          this.combat("buff", { ownerId, until: r.buffUntil });
          return true;
        }
        random() {
          return this.rng.nextUint32() / 4294967296;
        }
        spawn(species, tier, x, y) {
          if (this.units.length >= (this.scene === "farm" ? this.capacity : CONFIG.maxRaidUnits)) return null;
          const u = new Unit(this.nextId++, species, clamp2(tier, 1, CONFIG.maxTier), x, y);
          this.units.push(u);
          return u;
        }
        notice(kind, detail = {}) {
          const event = { sequence: ++this.eventSequence, kind, ...detail };
          this.notices.push(event);
          if (this.notices.length > 512) this.notices.shift();
          return event;
        }
        emit(kind, x, y, z = 0) {
          this.progress.record(kind);
          this.notice(kind);
          this.effects.push({ kind, x, y, z, life: 0 });
          if (this.effects.length > 100) this.effects.shift();
          this.events.push(kind);
          if (this.events.length > 20) this.events.shift();
        }
        tapFood(source) {
          if (source !== "auto" && source !== "manual" || source === "manual" && this.scene !== "farm" || this.food.length >= 140) return false;
          const completed = this.foodTaps.remainder === 4;
          this.foodTaps.remainder++;
          this.foodTaps.revision++;
          if (this.foodTaps.remainder >= 5) {
            this.foodTaps.remainder -= 5;
            this.scatter((this.random() - 0.5) * 14, (this.random() - 0.5) * 9, 1);
            this.foodTaps.produced++;
          }
          this.notice("food-tap", { source, completed, remainder: this.foodTaps.remainder });
          return true;
        }
        advanceAutoTaps(elapsed) {
          if (!Number.isFinite(elapsed) || elapsed <= 0) return;
          this.foodTaps.autoClock += Math.min(elapsed, 0.1);
          const interval = this.progress.autoTapSeconds;
          while (this.foodTaps.autoClock + 1e-9 >= interval) {
            this.foodTaps.autoClock = Math.max(0, this.foodTaps.autoClock - interval);
            this.tapFood("auto");
          }
        }
        scatter(x, y, count = 1) {
          for (let i = 0; i < count && this.food.length < 140; i++) {
            let tx = clamp2(x, -8, 8), ty = clamp2(y, -5.7, 5.7);
            const boundary = Math.hypot(tx / 8, ty / 5.7);
            if (boundary > 1) {
              tx /= boundary;
              ty /= boundary;
            }
            if (this.tryStartFarmBossEvent(tx, ty)) continue;
            const angle = this.random() * Math.PI * 2, sx = Math.cos(angle) * 10.2, sy = Math.sin(angle) * 7;
            const duration = 0.85 + this.random() * 0.25, z = 0.3;
            this.food.push({ x: sx, y: sy, z, vx: (tx - sx) / duration, vy: (ty - sy) / duration, vz: 6 * duration - z / duration, seed: this.random(), phase: "flight", tx, ty });
            this.emit("feed", tx, ty);
          }
        }
        tryStartFarmBossEvent(x, y) {
          if (this.scene !== "farm" || this.boss.active || this.farmBossEvent.phase !== "idle" || this.random() >= CONFIG.farmBossEvent.spawnChance) return false;
          for (const unit of this.units) if (!unit.isBattleOnlySummon) {
            unit.splitUsedThisBattle = false;
            unit.deathSplitHandled = false;
            unit.chestnutBasicCycles = 0;
          }
          this.boss = this.createBoss();
          Object.assign(this.boss, { x, y, z: CONFIG.raid.dropHeight, active: true });
          this.farmBossEvent = { phase: "dropping", elapsed: 0, outcome: "fighting", encounterId: this.nextBossEncounterId++, rewardStatus: "unresolved", rewardChance: 0, rewardRoll: 0, rewardUnitId: 0 };
          this.combat("farm-boss-drop", { x, y, z: this.boss.z });
          return true;
        }
        getBossAcquisitionChance({ farmEvent = false } = {}) {
          return bossAcquisitionChance({ farmEvent });
        }
        createBoss() {
          return { x: 0, y: 0, z: 0, radius: CONFIG.raid.bossRadius, height: CONFIG.raid.bossHeight, hp: 2400, maxHp: 2400, active: false, phase: "resting", clock: 0, angle: 0, facing: 0, flash: 0, hit: /* @__PURE__ */ new Set(), swings: 0, basicCount: 0, attackId: 0, targetId: 0, sweepClock: 0, attackKind: "basic", startAngle: 0, travel: 0 };
        }
        setScene(scene) {
          if (scene === this.scene) return;
          this.projectiles = [];
          this.scene = scene;
          this.running = scene === "raid";
          this.encounter = { outcome: this.running ? "fighting" : "idle", elapsed: 0 };
          this.farmBossEvent = { phase: "idle", elapsed: 0, outcome: "idle", encounterId: 0, rewardStatus: "none", rewardChance: 0, rewardRoll: 0, rewardUnitId: 0 };
          this.boss = this.createBoss();
          const idMap = new Map(this.units.map((u, index) => [u.id, scene === "raid" ? 1e6 + index + 1 : u.farmId || u.id]));
          for (let i = 0; i < this.units.length; i++) {
            const u = this.units[i], oldMateId = u.mateId;
            if (scene === "raid") {
              u.home = { x: u.x, y: u.y };
              u.farmId = u.farmId || u.id;
              u.ownerId = "solo";
              u.id = 1e6 + i + 1;
              u.dropLanded = true;
              const angle = i * 2.3999632297, rad = 10.5 + i % 3 * 0.9;
              Object.assign(u, { x: Math.cos(angle) * rad, y: Math.sin(angle) * rad * 0.84 });
            } else {
              u.id = u.farmId || u.id;
              u.ownerId = "";
              u.farmId = 0;
              u.dropLanded = true;
              Object.assign(u, u.home);
            }
            u.mateId = idMap.get(oldMateId) || 0;
            u.ability = new AttackCycle(u);
            Object.assign(u, { z: 0, vx: 0, vy: 0, vz: 0, stun: 0, down: 0, hp: stats(u.tier, u.species).maxHp });
          }
          if (this.running) {
            this.boss.active = true;
            this.boss.phase = "chase";
            this.raidExpectedPlayers = ["solo"];
            this.raidRosters = [{ ownerId: "solo", troops: this.units.filter((u) => !u.isBattleOnlySummon).map((u) => ({ farmId: u.farmId, species: u.species, tier: u.tier, deployed: true })), abilitySnapshot: createAbilityRuntimeSnapshot(this.playerProgression), buffUntil: 0, buffReadyAt: 0 }];
            this.raidDeploymentStarted = true;
          } else {
            this.raidExpectedPlayers = ["solo"];
            this.raidRosters = [];
            this.raidDeploymentStarted = false;
          }
        }
        canBreedPair(a, b, requireContact = false) {
          return a !== b && !a.isBattleOnlySummon && !b.isBattleOnlySummon && a.breedingEligible !== false && b.breedingEligible !== false && a.hp > 0 && b.hp > 0 && a.species === b.species && a.mature && b.mature && a.fed && b.fed && a.cooldown <= 0 && b.cooldown <= 0 && this.units.includes(a) && this.units.includes(b) && (!requireContact || Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius + 0.2);
        }
        releaseMate(unit) {
          const mate = this.units.find((candidate) => candidate.id === unit.mateId);
          unit.mateId = 0;
          if (mate && mate.mateId === unit.id) mate.mateId = 0;
        }
        reconcileMateReservations() {
          for (const unit of this.units) {
            if (!unit.mateId) continue;
            const mate = this.units.find((candidate) => candidate.id === unit.mateId);
            if (this.mode !== "breed" || !mate || mate.mateId !== unit.id || !this.canBreedPair(unit, mate)) this.releaseMate(unit);
          }
        }
        findOrReserveMate(unit) {
          if (this.mode !== "breed" || !unit.mature || !unit.fed || unit.cooldown > 0 || unit.hp <= 0 || this.senseEnemy(unit)) {
            this.releaseMate(unit);
            return null;
          }
          if (unit.mateId) {
            const current = this.units.find((candidate) => candidate.id === unit.mateId);
            if (current && current.mateId === unit.id && this.canBreedPair(unit, current)) return current;
            this.releaseMate(unit);
          }
          const candidates = this.units.filter((candidate) => candidate !== unit && !candidate.mateId && this.canBreedPair(unit, candidate) && !this.senseEnemy(candidate));
          candidates.sort((a, b) => (a.tier === unit.tier ? 0 : 1) - (b.tier === unit.tier ? 0 : 1) || Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y));
          const mate = candidates[0];
          if (!mate) return null;
          unit.mateId = mate.id;
          mate.mateId = unit.id;
          return mate;
        }
        hasEligibleSameTierBreedPair() {
          if (this.mode !== "breed" || this.units.length >= this.capacity) return false;
          for (let i = 0; i < this.units.length; i++) for (let j = i + 1; j < this.units.length; j++) {
            const a = this.units[i], b = this.units[j];
            if (a.tier === b.tier && this.canBreedPair(a, b) && (!a.mateId && !b.mateId || a.mateId === b.id && b.mateId === a.id)) return true;
          }
          return false;
        }
        canMergePair(a, b, { requireContact = false, requireNoEnemy = false } = {}) {
          if (!a || !b || a === b || a.isBattleOnlySummon || b.isBattleOnlySummon || a.mergeEligible === false || b.mergeEligible === false || a.species !== b.species || a.tier !== b.tier || a.tier >= CONFIG.maxTier || a.hp <= 0 || b.hp <= 0 || !a.mature || !b.mature || a.cooldown > 0 || b.cooldown > 0 || !this.units.includes(a) || !this.units.includes(b)) return false;
          const speciesCount = this.units.reduce((count, u) => count + (!u.isBattleOnlySummon && u.species === a.species ? 1 : 0), 0);
          if (speciesCount <= 2) return false;
          if (requireNoEnemy && (this.senseEnemy(a) || this.senseEnemy(b))) return false;
          return !requireContact || Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius + 0.2;
        }
        selectMergeTask() {
          if (this.mode !== "merge" || this.scene !== "farm" || this.mergeTask) return;
          const counts = /* @__PURE__ */ new Map();
          for (const u of this.units) counts.set(u.species, (counts.get(u.species) || 0) + 1);
          const eligible = this.units.filter((u) => !u.isBattleOnlySummon && u.mergeEligible !== false && u.hp > 0 && u.mature && u.cooldown <= 0 && u.tier < CONFIG.maxTier && counts.get(u.species) > 2 && !this.senseEnemy(u));
          let pair = null;
          for (let i = 0; i < eligible.length; i++) for (let j = i + 1; j < eligible.length; j++) {
            const a = eligible[i], b = eligible[j];
            if (a.species !== b.species || a.tier !== b.tier) continue;
            const first = a.id < b.id ? a : b, second = first === a ? b : a;
            const candidate = { tier: a.tier, distance: (a.x - b.x) ** 2 + (a.y - b.y) ** 2, aId: first.id, bId: second.id };
            if (!pair || candidate.tier < pair.tier || candidate.tier === pair.tier && (candidate.distance < pair.distance || candidate.distance === pair.distance && (candidate.aId < pair.aId || candidate.aId === pair.aId && candidate.bId < pair.bId))) pair = candidate;
          }
          if (pair) this.mergeTask = { phase: "approach", aId: pair.aId, bId: pair.bId, elapsed: 0, duration: CONFIG.mergeAnimationSeconds };
        }
        advanceMergeTask(dt) {
          if (this.mode !== "merge" || this.scene !== "farm") {
            this.mergeTask = null;
            return;
          }
          if (this.mergeTask?.phase === "animation") {
            this.mergeTask.elapsed = Math.min(this.mergeTask.duration, this.mergeTask.elapsed + dt);
            if (this.mergeTask.elapsed >= this.mergeTask.duration - 1e-9) this.mergeTask = null;
            return;
          }
          if (this.mergeTask?.phase === "approach") {
            const a = this.units.find((u) => u.id === this.mergeTask.aId), b = this.units.find((u) => u.id === this.mergeTask.bId);
            if (!this.canMergePair(a, b)) this.mergeTask = null;
          }
          if (!this.mergeTask) this.selectMergeTask();
        }
        resolveMergeTaskAfterMovement() {
          const task = this.mergeTask;
          if (task?.phase !== "approach") return false;
          const a = this.units.find((u) => u.id === task.aId), b = this.units.find((u) => u.id === task.bId);
          if (!this.canMergePair(a, b, { requireContact: true, requireNoEnemy: true })) return false;
          return this.pair(a, b, true);
        }
        pair(a, b, priorityResolved = false) {
          if (a === b || a.hp <= 0 || b.hp <= 0 || a.down > 0 || b.down > 0 || a.species !== b.species || !a.mature || !b.mature || a.cooldown > 0 || b.cooldown > 0 || !this.units.includes(a) || !this.units.includes(b) || Math.hypot(a.x - b.x, a.y - b.y) > a.radius + b.radius + 0.2 || this.senseEnemy(a) || this.senseEnemy(b)) return false;
          if (a.isBattleOnlySummon || b.isBattleOnlySummon) return false;
          if (this.mode === "merge") {
            if (!this.canMergePair(a, b, { requireNoEnemy: true })) return false;
            const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
            this.releaseMate(a);
            this.releaseMate(b);
            this.units = this.units.filter((u2) => u2 !== a && u2 !== b);
            const u = this.spawn(a.species, a.tier + 1, x, y);
            u.meals = 1;
            u.growth = 3;
            u.growthDuration = this.breedGrowthDuration();
            u.growthElapsed = u.growthDuration;
            u.cooldown = 4 / this.progress.rate("merge");
            u.cooldownDuration = u.cooldown;
            this.mergeTask = { phase: "animation", aId: 0, bId: 0, elapsed: 0, duration: CONFIG.mergeAnimationSeconds };
            this.metrics.merges++;
            this.emit("merge", x, y, 1);
          } else {
            if (!this.canBreedPair(a, b, true) || this.units.length >= this.capacity || a.mateId && a.mateId !== b.id || b.mateId && b.mateId !== a.id || !priorityResolved && a.tier !== b.tier && this.hasEligibleSameTierBreedPair()) return false;
            a.mateId = b.id;
            b.mateId = a.id;
            const child = this.spawn(a.species, 1, (a.x + b.x) / 2, (a.y + b.y) / 2);
            child.growthDuration = this.breedGrowthDuration();
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
          if (this.scene === "raid" && this.running) this.encounter.elapsed += dt;
          this.advanceMergeTask(dt);
          this.effects = this.effects.filter((e) => (e.life += dt) < (Number.isFinite(e.duration) ? e.duration : 1));
          for (const f of this.food) {
            if (f.phase !== "grounded") {
              f.x += f.vx * dt;
              f.y += f.vy * dt;
              f.z += f.vz * dt - 6 * dt * dt;
              f.vz -= 12 * dt;
              if (f.z <= 0) {
                f.z = 0;
                if (f.phase === "flight") {
                  f.x = f.tx;
                  f.y = f.ty;
                  f.vx = f.vy = 0;
                  f.vz = 1.1;
                  f.phase = "bounce";
                  this.emit("food-land", f.x, f.y);
                } else {
                  f.vz = 0;
                  f.phase = "grounded";
                }
              }
            }
          }
          const units = [...this.units];
          this.reconcileMateReservations();
          for (const u of units) {
            if (u.hp <= 0) {
              if (!u.deathSplitHandled) this.handleUnitDeath(u);
              if (u.isBattleOnlySummon) {
                u.down = 0;
                continue;
              }
              if (u.down <= 0) {
                u.down = CONFIG.corpseRecoverySeconds;
                u.ability.interrupt();
              }
              if (this.scene === "farm") {
                u.down = Math.max(0, u.down - dt);
                if (u.down < 1e-9) u.down = 0;
              }
              const oldZ2 = u.z;
              u.integrate(dt);
              if (this.scene === "raid" && this.running && u.z === 0 && u.vz === 0) u.vx = u.vy = 0;
              if (oldZ2 > 0 && u.z === 0) {
                this.metrics.landings++;
                if (this.scene === "raid") this.combat("unit-land", { unit: u.id, x: u.x, y: u.y, z: 0, strength: Math.min(1, Math.hypot(u.vx, u.vy) / 8) });
                else if (Math.hypot(u.vx, u.vy) > 1) this.emit("land", u.x, u.y);
              }
              if (this.scene === "farm" && u.down === 0) {
                const maxHp = stats(u.tier, u.species).maxHp;
                this.releaseMate(u);
                Object.assign(u, { hp: maxHp, down: 0, z: 0, vx: 0, vy: 0, vz: 0, stun: 0, flash: 0, bounce: 0, angle: 0, deathSplitHandled: false });
                u.ability = new AttackCycle(u);
                this.combat("unit-recover", { unit: u.id, x: u.x, y: u.y });
              }
              continue;
            }
            u.age += dt;
            const unitStats = stats(u.tier, u.species);
            if (u.hp > 0 && unitStats.regen > 0) applyHealing(u, unitStats.regen * dt, unitStats);
            if (!u.mature) {
              u.growthElapsed = Math.min(u.growthDuration, u.growthElapsed + dt);
              u.growth = Math.min(CONFIG.matureMeals, Math.floor(CONFIG.matureMeals * u.growthElapsed / u.growthDuration + 1e-9));
            }
            u.cooldown = Math.max(0, u.cooldown - dt);
            if (u.cooldown < 1e-9) {
              u.cooldown = 0;
              u.cooldownDuration = 0;
            }
            const enemy = this.senseEnemy(u);
            if (enemy) this.raidUnit(u, dt, enemy);
            else if (u.hp > 0 && !u.isBattleOnlySummon) {
              if (u.ability.phase !== "idle") {
                u.ability.interrupt();
                u.ability.update(this, dt);
              }
              this.farmUnit(u, dt);
            } else if (this.scene === "raid" && this.running) this.raidUnit(u, dt, null);
            const oldZ = u.z, oldPosition = { x: u.x, y: u.y, z: u.z };
            u.integrate(dt);
            if (this.scene === "raid" && u.hp <= 0 && u.z === 0 && u.vz === 0) {
              u.vx = u.vy = 0;
            }
            if (enemy) u.ability.afterMove(this, oldPosition);
            if (oldZ > 0 && u.z === 0) {
              if (this.scene === "raid" && !u.dropLanded) {
                u.dropLanded = true;
                u.bounce = 0.16;
                this.combat("drop-land", { unit: u.id, ownerId: u.ownerId, x: u.x, y: u.y, z: 0 });
                this.effects.push({ kind: "drop-dust", x: u.x, y: u.y, z: 0, life: 0 });
              }
              this.metrics.landings++;
              if (this.scene === "raid") this.combat("unit-land", { unit: u.id, x: u.x, y: u.y, z: 0, strength: Math.min(1, Math.hypot(u.vx, u.vy) / 8) });
              else if (Math.hypot(u.vx, u.vy) > 1) this.emit("land", u.x, u.y);
            }
            this.boundBody(u, this.scene, u.radius);
          }
          if (this.scene === "raid") this.raidContacts(units);
          else for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) if (contact(units[i], units[j])) this.metrics.contacts++;
          if (this.scene === "farm") {
            if (this.mode === "breed") {
              for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) if (units[i].tier === units[j].tier) this.pair(units[i], units[j], true);
              if (!this.hasEligibleSameTierBreedPair()) {
                for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) if (units[i].tier !== units[j].tier) this.pair(units[i], units[j], true);
              }
            } else this.resolveMergeTaskAfterMovement();
          }
          if (this.scene === "farm" && this.farmBossEvent.phase !== "idle") {
            if (this.boss.active) this.updateProjectiles(dt);
            this.updateBoss(dt);
            if (this.boss.active) for (const u of this.units) this.separateBoss(u);
          } else if (this.boss.active) {
            this.updateProjectiles(dt);
            this.updateBoss(dt);
            for (const u of this.units) this.separateBoss(u);
          }
          this.units = this.units.filter((unit) => !unit.isBattleOnlySummon || unit.hp > 0);
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
        raidContacts(units) {
          const size = 1.5, cells = /* @__PURE__ */ new Map(), key = (x, y) => `${x},${y}`;
          for (let i = 0; i < units.length; i++) {
            const u = units[i];
            if (u.hp <= 0 || !u.dropLanded) continue;
            const cx = Math.floor(u.x / size), cy = Math.floor(u.y / size), near = [];
            for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) near.push(...cells.get(key(cx + dx, cy + dy)) || []);
            near.sort((a, b) => a - b);
            for (const j of near) {
              const other = units[j];
              if (other.hp > 0 && other.dropLanded && contact(other, u)) this.metrics.contacts++;
            }
            const k = key(cx, cy);
            if (!cells.has(k)) cells.set(k, []);
            cells.get(k).push(i);
          }
        }
        avoidNearbyFood(u, dt) {
          const radius = 1.25;
          let pushX = 0, pushY = 0, strongest = 0, nearest = null, nearestDistance = Infinity;
          for (const food of this.food) {
            if (food.phase !== "grounded") continue;
            let dx = u.x - food.x, dy = u.y - food.y, distance = Math.hypot(dx, dy);
            if (distance >= radius) continue;
            const strength = 1 - distance / radius, weight = strength * strength;
            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearest = food;
            }
            strongest = Math.max(strongest, strength);
            if (distance > 1e-6) {
              pushX += dx / distance * weight;
              pushY += dy / distance * weight;
            }
          }
          if (!nearest) return false;
          let magnitude = Math.hypot(pushX, pushY);
          if (magnitude < 1e-4) {
            if (nearestDistance > 1e-6) {
              pushX = u.x - nearest.x;
              pushY = u.y - nearest.y;
              magnitude = nearestDistance;
            } else {
              const angle = (u.seed + (nearest.seed || 0)) * 2.3999632297;
              pushX = Math.cos(angle);
              pushY = Math.sin(angle);
              magnitude = 1;
            }
          }
          const awayX = pushX / magnitude, awayY = pushY / magnitude;
          let desiredX = Math.sin(this.time * 0.18 + u.seed) * 7.4 - u.x;
          let desiredY = Math.cos(this.time * 0.16 + u.seed) * 5.3 - u.y;
          const desiredLength = Math.hypot(desiredX, desiredY) || 1;
          desiredX /= desiredLength;
          desiredY /= desiredLength;
          const towardFood = desiredX * awayX + desiredY * awayY;
          if (towardFood < 0) {
            desiredX -= towardFood * awayX;
            desiredY -= towardFood * awayY;
          }
          let moveX = desiredX + awayX * (0.5 + 1.5 * strongest), moveY = desiredY + awayY * (0.5 + 1.5 * strongest), moveLength = Math.hypot(moveX, moveY);
          if (moveLength < 1e-4) {
            moveX = awayX;
            moveY = awayY;
            moveLength = 1;
          }
          this.steer(u, u.x + moveX / moveLength, u.y + moveY / moveLength, dt, scaleMoveSpeed(0.75, u));
          return true;
        }
        farmUnit(u, dt) {
          if (u.stun > 0 || u.z > 0.1) return;
          if (!u.mature || u.cooldown > 0) {
            if (!this.avoidNearbyFood(u, dt)) this.steer(u, Math.sin(this.time * 0.18 + u.seed) * 7.4, Math.cos(this.time * 0.16 + u.seed) * 5.3, dt, scaleMoveSpeed(0.75, u));
            return;
          }
          if (this.mode === "merge") {
            const task = this.mergeTask;
            if (task?.phase === "approach" && (u.id === task.aId || u.id === task.bId)) {
              const partner = this.units.find((candidate) => candidate.id === (u.id === task.aId ? task.bId : task.aId));
              if (partner && u.cooldown <= 0) this.steer(u, partner.x, partner.y, dt, scaleMoveSpeed(2.2, u));
              return;
            }
            this.steer(u, Math.sin(this.time * 0.18 + u.seed) * 7.4, Math.cos(this.time * 0.16 + u.seed) * 5.3, dt, scaleMoveSpeed(0.75, u));
            return;
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
          } else if (this.mode === "breed" && u.cooldown === 0) target = this.findOrReserveMate(u);
          else if (u.cooldown === 0) {
            const candidates = this.units.filter((p) => p !== u && p.hp > 0 && p.down <= 0 && p.species === u.species && p.mature && p.cooldown <= 0 && (this.mode !== "breed" || p.fed) && (this.mode !== "merge" || p.tier === u.tier && u.tier < CONFIG.maxTier));
            for (const p of candidates) {
              const d = Math.hypot(p.x - u.x, p.y - u.y);
              if (d < best) {
                best = d;
                target = p;
              }
            }
          }
          const hasDesignatedMate = this.mode === "breed" && u.fed && target && this.units.includes(target);
          if (this.mode === "breed" && u.fed && !hasDesignatedMate && this.avoidNearbyFood(u, dt)) return;
          if (target) this.steer(u, target.x, target.y, dt, scaleMoveSpeed(2.2 * (target.phase === "grounded" ? this.progress.rate("growth") : 1), u));
          else this.steer(u, Math.sin(this.time * 0.18 + u.seed) * 7.4, Math.cos(this.time * 0.16 + u.seed) * 5.3, dt, scaleMoveSpeed(0.75, u));
        }
        combat(kind, detail) {
          const event = this.notice(kind, { time: this.time, ...detail }), toPresentationTime = presentationClocks.get(this);
          if (toPresentationTime) presentationEventTimes.set(event, toPresentationTime(this.time));
        }
        boundBody(body, scene, margin) {
          const before = { x: body.x, y: body.y }, p = ArenaGeometry.clamp(before, scene, margin);
          body.x = p.x;
          body.y = p.y;
          if (before.x !== p.x || before.y !== p.y) {
            const r = ArenaGeometry.bounds(scene, margin), nx = p.x / (r.x * r.x), ny = p.y / (r.y * r.y), n = Math.hypot(nx, ny) || 1, out = ((body.vx || 0) * nx + (body.vy || 0) * ny) / n;
            if (out > 0) {
              body.vx -= 1.3 * out * nx / n;
              body.vy -= 1.3 * out * ny / n;
            }
          }
        }
        separateBoss(u) {
          const b = this.boss;
          if (u.hp <= 0 || !u.dropLanded || u.z > b.height) return;
          const dx = u.x - b.x, dy = u.y - b.y, d = Math.hypot(dx, dy), r = b.radius + u.radius;
          if (d >= r) return;
          const a = d > 1e-6 ? Math.atan2(dy, dx) : u.seed, nx = Math.cos(a), ny = Math.sin(a);
          u.x = b.x + nx * r;
          u.y = b.y + ny * r;
          const inward = u.vx * nx + u.vy * ny;
          if (inward < 0) {
            u.vx -= inward * nx;
            u.vy -= inward * ny;
          }
          this.boundBody(u, this.scene, u.radius);
        }
        combatEvent(kind, u, action) {
          this.combatLog.push({ kind, id: action?.id ?? 0, unit: u.id, species: u.species, time: this.time, x: u.x, y: u.y, z: u.z });
          if (this.combatLog.length > 240) this.combatLog.shift();
          if (kind === "launch") {
            this.combat("attack-launch", { species: u.species, unit: u.id, x: u.x, y: u.y, z: u.z, attackKind: abilityProfile(u.species).kind });
            if (u.species === 3) {
              const config = getChestnutSpikeConfig(this.abilityProgressionFor(u), u.tier);
              if (config) this.spawnChestnutSpikes(u, action, config);
            }
          }
        }
        damageBoss(u, action, point, { lifestealSource = u, attackMultiplier = null, attackKind = null } = {}) {
          if (action.hit || this.boss.hp <= 0) return false;
          action.hit = true;
          const spec = abilityProfile(u.species), roster = this.raidRoster(u.ownerId), buffed = !!roster && this.time < roster.buffUntil;
          const hpBefore = this.boss.hp, maxHp = this.boss.maxHp;
          const hpRatio = Number.isFinite(hpBefore) && Number.isFinite(maxHp) && maxHp > 0 ? clamp2(hpBefore / maxHp, 0, 1) : 1;
          const armor = (1 - hpRatio) * 100;
          const attackerStats = stats(u.tier, u.species);
          const damageMultiplier = Number.isFinite(attackMultiplier) ? attackMultiplier : spec.skillMultiplier, kind = attackKind || spec.kind;
          const rawDamage = attackerStats.attackPower * damageMultiplier * (buffed ? CONFIG.raid.buffDamage : 1);
          const damage = applyDamageToTargets(lifestealSource, [this.boss], { rawDamage, armorForTarget: () => armor, roll: () => this.random() });
          this.boss.flash = 0.13;
          const dx = point.x - this.boss.x, dy = point.y - this.boss.y, d = Math.hypot(dx, dy) || 1;
          this.combat("boss-hit", { unit: u.id, ownerId: u.ownerId, species: u.species, attackKind: kind, buffed, critical: damage.critical, x: this.boss.x + dx / d * this.boss.radius, y: this.boss.y + dy / d * this.boss.radius, z: clamp2(point.z + 0.2, 0.2, this.boss.height), nx: dx / d, ny: dy / d, strength: damageMultiplier * (buffed ? CONFIG.raid.buffDamage : 1) * (damage.critical ? attackerStats.critMultiplier : 1) });
          this.combatEvent("damage", u, action);
          this.progress.record("hit");
          return true;
        }
        explodePopcorn(kernel) {
          if (!kernel?.isPopcorn || kernel.exploded) return false;
          const queue = [kernel], queued = /* @__PURE__ */ new Set();
          let triggered = false;
          while (queue.length) {
            const current = queue.shift();
            if (!current?.isPopcorn || current.exploded || queued.has(current.id)) continue;
            queued.add(current.id);
            current.exploded = true;
            current.explosionLife = 0;
            current.hit = true;
            triggered = true;
            const config = current.popcornConfig, center = { x: current.x, y: current.y, z: 0 }, range = config.radius;
            this.effects.push({ kind: "popcorn-explosion", x: current.x, y: current.y, z: 0, life: 0, duration: 0.5, radius: range, owner: current.owner });
            if (!current.damagedTargetIds.includes("boss") && Math.hypot(current.x - this.boss.x, current.y - this.boss.y) <= range + this.boss.radius) {
              const unit = this.units.find((candidate) => candidate.id === current.owner) || { id: current.owner, ownerId: current.ownerId || "", species: current.species, tier: current.tier, x: current.x, y: current.y, z: 0 };
              const action = { id: current.id, hit: false, attackKind: "corn-popcorn-explosion" };
              this.damageBoss(unit, action, center, { attackMultiplier: config.damageMultiplier, attackKind: "corn-popcorn-explosion" });
              current.damagedTargetIds.push("boss");
            }
            for (const other of this.projectiles) {
              if (other === current || !other.isPopcorn || other.exploded || !other.landed || queued.has(other.id)) continue;
              if (Math.hypot(other.x - current.x, other.y - current.y) <= range + other.radius) queue.push(other);
            }
            this.combat("popcorn-explosion", { unit: current.owner, ownerId: current.ownerId || "", species: 1, x: current.x, y: current.y, radius: range });
          }
          return triggered;
        }
        updateProjectiles(dt) {
          for (const p of this.projectiles) {
            if (p.isPopcorn && p.landed) {
              if (!p.exploded) p.fuseRemaining = Math.max(0, p.fuseRemaining - dt);
              else p.explosionLife = (p.explosionLife || 0) + dt;
              continue;
            }
            const old = { x: p.x, y: p.y, z: p.z };
            p.elapsed += dt;
            Object.assign(p, Ballistics.sample(p.path, p.elapsed / p.path.duration));
            const hit = ArenaGeometry.sweep(old, p, p.radius, p.height, this.boss);
            if (p.isPopcorn && (hit || p.elapsed >= p.path.duration)) {
              if (hit) Object.assign(p, { x: hit.x, y: hit.y, z: 0 });
              else p.z = 0;
              p.landed = true;
              p.fuseRemaining = p.popcornConfig.fuseSeconds;
              this.effects.push({ kind: "popcorn-kernel-impact", x: p.x, y: p.y, z: 0, life: 0, duration: 0.25, radius: p.radius, owner: p.owner });
            } else if (hit) {
              Object.assign(p, { x: hit.x, y: hit.y, z: hit.z });
              const source = this.units.find((u) => u.id === p.owner), impactUnit = source || { id: p.owner, ownerId: p.ownerId || "", species: p.species, tier: p.tier, x: p.x, y: p.y, z: p.z };
              this.damageBoss(impactUnit, p, hit, { lifestealSource: source || impactUnit, attackMultiplier: p.attackMultiplier, attackKind: p.projectileKind || "lob" });
            } else if (p.elapsed >= p.path.duration) {
              p.z = 0;
              this.emit(p.projectileKind === "chestnut-spike" ? "spike-land" : "shell-land", p.x, p.y);
            }
          }
          for (const p of this.projectiles) {
            if (!p.isPopcorn || !p.landed || p.exploded) continue;
            const touching = this.projectiles.some((other) => other !== p && other.isPopcorn && other.landed && !other.exploded && Math.hypot(other.x - p.x, other.y - p.y) <= other.radius + p.radius);
            if (p.fuseRemaining > 0 && !touching) continue;
            this.explodePopcorn(p);
          }
          this.projectiles = this.projectiles.filter((p) => p.isPopcorn ? !p.exploded || p.explosionLife < 0.5 : !p.hit && p.elapsed < p.path.duration);
          this.boss.flash = Math.max(0, (this.boss.flash || 0) - dt);
        }
        raidUnit(u, dt, enemy = this.boss) {
          if (!u.dropLanded) return;
          if (u.hp <= 0) {
            u.down = CONFIG.corpseRecoverySeconds;
            u.ability.interrupt();
            return;
          }
          if (u.ability.update(this, dt) || u.stun > 0 || u.z > 0.1) return;
          if (!enemy || enemy !== this.boss) return;
          const b = enemy, spec = abilityProfile(u.species), dx = u.x - b.x, dy = u.y - b.y, n = Math.hypot(dx, dy) || 1;
          const stand = b.radius + spec.range + (u.tier - 1) * 0.12, min = stand - 0.55, max = stand + 0.55;
          if (n > max || spec.kind === "lob" && n < min) {
            const slot = ArenaGeometry.clamp({ x: b.x + dx / n * stand, y: b.y + dy / n * stand }, this.scene, u.radius);
            this.steer(u, slot.x, slot.y, dt, scaleMoveSpeed(4.1, u));
            return;
          }
          u.vx = u.vy = 0;
          const target = spec.kind === "lob" ? { x: b.x, y: b.y } : { x: b.x + dx / n * (b.radius + u.radius - 0.16), y: b.y + dy / n * (b.radius + u.radius - 0.16) };
          u.ability.begin(this, target);
        }
        finish(outcome) {
          if (!this.running) return;
          this.running = false;
          this.boss.active = false;
          this.encounter.outcome = outcome;
          this.projectiles = [];
          this.boss.phase = "resting";
          for (const u of this.units) u.ability.interrupt();
          this.cleanupBattleSummons();
          this.combat(outcome, { x: this.boss.x, y: this.boss.y, z: 0 });
        }
        finishFarmBossEvent(outcome) {
          if (this.scene !== "farm" || this.farmBossEvent.phase !== "fighting") return false;
          this.cleanupBattleSummons();
          this.boss.active = false;
          this.boss.phase = "resting";
          this.boss.clock = 0;
          this.projectiles = [];
          const encounterId = this.farmBossEvent.encounterId;
          this.farmBossEvent = { phase: "celebrating", elapsed: 0, outcome, encounterId, rewardStatus: "none", rewardChance: 0, rewardRoll: 0, rewardUnitId: 0 };
          for (const u of this.units) if (u.hp > 0) u.ability.interrupt();
          if (outcome === "victory") {
            const settlement = settleBossKill(this, { encounterId, source: "farm", species: 3, tier: 1, x: this.boss.x, y: this.boss.y });
            const reward = settlement.receipt;
            this.combat("farm-boss-xp", { encounterId, xp: settlement.xpAwarded, levelsGained: settlement.levelsGained, pointsAwarded: settlement.pointsAwarded });
            this.combat("farm-boss-reward", { acquired: reward.status === "granted", pending: reward.status === "pending", species: reward.species, tier: reward.tier, chance: reward.chance, roll: reward.roll, encounterId });
          }
          this.combat(outcome === "victory" ? "farm-boss-victory" : "farm-boss-defeat", { x: this.boss.x, y: this.boss.y, z: 0 });
          return true;
        }
        bossAttackArea(unitRadius = 0) {
          return bossAttackArea(this.boss, unitRadius);
        }
        bossWeaponPoint(phase = this.boss.phase, q = 0) {
          const b = this.boss, c = CONFIG.raid;
          if (phase === "sweep") {
            const a = b.startAngle + Math.PI * 2 * q;
            return { x: b.x + Math.cos(a) * c.sweepReach, y: b.y + Math.sin(a) * c.sweepReach, z: 0.2 };
          }
          const reach = b.radius - 0.25 + (c.basicReach - b.radius + 0.25) * Math.sin(Math.PI * clamp2(q, 0, 1));
          return { x: b.x + Math.cos(b.angle) * reach, y: b.y + Math.sin(b.angle) * reach, z: 0.2 };
        }
        beginBossAttack(kind, target) {
          const b = this.boss;
          b.attackKind = kind;
          b.clock = 0;
          b.phase = kind === "basic" ? "strike-windup" : "sweep-windup";
          b.angle = Math.atan2(target.y - b.y, target.x - b.x);
          b.startAngle = b.angle - Math.PI / 2;
          b.hit.clear();
          this.combat("boss-prepare", { attackKind: kind, x: b.x, y: b.y, z: 0, angle: b.angle });
        }
        hitBossUnit(u, kind, p) {
          const b = this.boss, heavy = kind === "sweep";
          if (u.hp <= 0 || !u.dropLanded || b.hit.has(u.id)) return false;
          b.hit.add(u.id);
          const dx = u.x - b.x, dy = u.y - b.y, n = Math.hypot(dx, dy) || 1;
          u.knock(dx / n, dy / n, heavy ? 13 : 8.5, heavy ? 10.2 : 7.2, b);
          applyDamageToTargets(null, [u], { rawDamage: heavy ? 10 : 8, sourceKind: "enemy" });
          if (u.hp === 0) {
            u.down = u.isBattleOnlySummon ? 0 : CONFIG.corpseRecoverySeconds;
            this.handleUnitDeath(u);
          }
          this.metrics.directHits++;
          this.metrics[heavy ? "sweepHits" : "basicHits"]++;
          this.combat("unit-hit", { attackKind: kind, attackId: b.attackId, unit: u.id, x: p.x, y: p.y, z: Math.max(0.15, u.z + 0.25), nx: dx / n, ny: dy / n, strength: heavy ? 1.8 : 1 });
          return true;
        }
        hitBossWeapon(from, to, kind) {
          const c = CONFIG.raid;
          for (const u of this.units) {
            if (u.hp <= 0 || !u.dropLanded || this.boss.hit.has(u.id)) continue;
            const p = ArenaGeometry.sweep(from, to, c.weaponRadius, 1.4, { x: u.x, y: u.y, z: u.z, radius: u.radius, height: 0.65 });
            if (p) this.hitBossUnit(u, kind, p);
          }
        }
        hitBossSweep(q0, q1) {
          const b = this.boss, arc = Math.max(0, Math.min(1, q1) - Math.max(0, q0)) * Math.PI * 2;
          let hits = 0;
          for (const u of this.units) {
            if (u.hp <= 0 || !u.dropLanded || b.hit.has(u.id)) continue;
            const area = bossAttackArea(b, u.radius), dx = u.x - b.x, dy = u.y - b.y, d = Math.hypot(dx, dy), blade = area.width;
            if (d > area.sweepRadius + blade || 0.2 < u.z - 1.4 || 0.2 > u.z + 0.65) continue;
            const pad = d <= blade ? Math.PI : Math.asin(Math.min(1, blade / d)), unitAngle = Math.atan2(dy, dx), scanStart = area.startAngle + Math.PI * 2 * Math.max(0, Math.min(1, q0)), offset = ((unitAngle - scanStart) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
            if (offset > arc + pad && offset < Math.PI * 2 - pad) continue;
            const radius = Math.min(d, area.sweepRadius), p = { x: b.x + Math.cos(unitAngle) * radius, y: b.y + Math.sin(unitAngle) * radius, z: 0.2 };
            if (this.hitBossUnit(u, "sweep", p)) hits++;
          }
          return hits;
        }
        updateBoss(dt) {
          const b = this.boss, c = CONFIG.raid;
          if (this.scene === "farm" && this.farmBossEvent.phase !== "idle") {
            const event = this.farmBossEvent;
            if (event.phase === "dropping") {
              event.elapsed += dt;
              b.z = Math.max(0, CONFIG.raid.dropHeight - 0.5 * CONFIG.gravity * event.elapsed * event.elapsed);
              if (b.z === 0) {
                event.phase = "fighting";
                event.elapsed = 0;
                b.phase = "chase";
                this.combat("farm-boss-land", { x: b.x, y: b.y, z: 0 });
              }
              return;
            }
            if (event.phase === "fighting") {
              event.elapsed += dt;
              if (b.hp <= 0) {
                this.finishFarmBossEvent("victory");
                return;
              }
              if (!this.units.some((u) => u.hp > 0 && u.dropLanded)) {
                this.finishFarmBossEvent("defeat");
                return;
              }
            } else if (event.phase === "celebrating") {
              event.elapsed += dt;
              b.clock = event.elapsed;
              const duration = event.outcome === "defeat" ? CONFIG.farmBossEvent.celebrationSeconds : CONFIG.farmBossEvent.fadeSeconds;
              if (event.elapsed >= duration) {
                event.phase = "fading";
                event.elapsed = 0;
                b.clock = 0;
              }
              return;
            } else if (event.phase === "fading") {
              event.elapsed += dt;
              b.clock = event.elapsed;
              if (event.elapsed >= CONFIG.farmBossEvent.fadeSeconds) {
                this.farmBossEvent = { phase: "idle", elapsed: 0, outcome: "idle", encounterId: 0, rewardStatus: "none", rewardChance: 0, rewardRoll: 0, rewardUnitId: 0 };
                this.boss = this.createBoss();
              }
              return;
            }
          }
          if (!b.active) return;
          if (b.hp <= 0) {
            if (this.running) this.finish("victory");
            else {
              b.active = false;
              b.phase = "resting";
            }
            return;
          }
          if (this.running && this.raidRosters.length && this.raidRosters.every((r) => r.troops.every((t) => t.deployed)) && !this.units.some((u) => u.hp > 0)) {
            this.finish("defeat");
            return;
          }
          const living = this.units.filter((u) => u.hp > 0 && u.dropLanded);
          if (!living.length) return;
          if (b.phase === "resting") b.phase = "chase";
          b.clock += dt;
          b.sweepClock += dt;
          if (b.phase === "chase") {
            let target = living.find((u) => u.id === b.targetId);
            if (!target) {
              target = living[(b.basicCount * 7 + b.swings * 11) % living.length];
              b.targetId = target.id;
            }
            const dx = target.x - b.x, dy = target.y - b.y, d = Math.hypot(dx, dy) || 1;
            b.facing = Math.atan2(dy, dx);
            b.angle = b.facing;
            if (b.sweepClock >= c.sweepInterval) {
              this.beginBossAttack("sweep", target);
              return;
            }
            if (d <= c.basicReach + c.weaponRadius * 0.35 && target.z < 1.6 && b.clock > 0.35) {
              this.beginBossAttack("basic", target);
              return;
            }
            if (d > b.radius + target.radius + 0.2) {
              const old = { x: b.x, y: b.y };
              b.x += dx / d * c.chaseSpeed * dt;
              b.y += dy / d * c.chaseSpeed * dt;
              this.boundBody(b, this.scene, b.radius + 0.25);
              b.travel += Math.hypot(b.x - old.x, b.y - old.y);
            }
          } else if (b.phase === "strike-windup" || b.phase === "sweep-windup") {
            const heavy = b.phase === "sweep-windup";
            if (b.clock >= (heavy ? c.sweepWindup : c.basicWindup)) {
              b.phase = heavy ? "sweep" : "strike";
              b.clock = 0;
              b.attackId = ++this.attackSerial;
              if (heavy) {
                b.swings++;
                b.sweepClock = 0;
              } else b.basicCount++;
              this.combat("boss-launch", { attackKind: heavy ? "sweep" : "basic", attackId: b.attackId, x: b.x, y: b.y, z: 0.2 });
            }
          } else if (b.phase === "strike" || b.phase === "sweep") {
            const heavy = b.phase === "sweep", duration = heavy ? c.sweepDuration : c.basicDuration, previous = Math.max(0, (b.clock - dt) / duration), q = Math.min(1, b.clock / duration);
            if (heavy) this.hitBossSweep(previous, q);
            else this.hitBossWeapon(this.bossWeaponPoint(b.phase, previous), this.bossWeaponPoint(b.phase, q), "basic");
            if (heavy) b.angle = b.startAngle + Math.PI * 2 * q;
            if (b.clock >= duration) {
              b.phase = "recover";
              b.clock = 0;
            }
          } else if (b.phase === "recover" && b.clock >= (b.attackKind === "sweep" ? c.sweepRecover : c.basicRecover)) {
            b.phase = "chase";
            b.clock = 0;
            b.targetId = 0;
          }
        }
      };
    }
  });

  // src/raid-settlement.js
  function ledgerState(farm) {
    const nextSequence = farm.nextRaidRunSequence ?? 0;
    const watermark = farm.raidSettlementWatermark ?? 0;
    const activeSequence = farm.activeRaidRunSequence ?? null;
    const activeSessionId = farm.activeRaidSessionId ?? null;
    const receipts = farm.raidSettlementReceipts ?? [];
    if (!isCount(nextSequence) || !isCount(watermark) || watermark > nextSequence || activeSequence !== null && (!Number.isSafeInteger(activeSequence) || activeSequence < 1) || activeSessionId !== null && !isNonEmptyString(activeSessionId) || !Array.isArray(receipts) || activeSequence === null !== (activeSessionId === null)) {
      fail("Private Farm Raid settlement ledger is invalid");
    }
    if (activeSequence === null && nextSequence !== watermark || activeSequence !== null && (activeSequence !== nextSequence || activeSequence !== watermark + 1)) {
      fail("Private Farm Raid run sequence is inconsistent");
    }
    return { nextSequence, watermark, activeSequence, activeSessionId, receipts };
  }
  function ownerRoster(raidWorld, ownerId) {
    if (!raidWorld || typeof raidWorld !== "object" || !Array.isArray(raidWorld.raidRosters) || !Array.isArray(raidWorld.units) || !isNonEmptyString(ownerId)) {
      fail("A Raid world, roster array, unit array, and owner ID are required");
    }
    const ownerRosters = raidWorld.raidRosters.filter((roster) => roster?.ownerId === ownerId);
    if (ownerRosters.length !== 1 || !Array.isArray(ownerRosters[0].troops)) {
      fail("The Raid must contain exactly one roster for this owner");
    }
    return ownerRosters[0];
  }
  function raidSettlementKey({ ownerId, sessionId, encounterId } = {}) {
    if (!isNonEmptyString(ownerId) || !isNonEmptyString(sessionId) || !(isNonEmptyString(encounterId) || Number.isSafeInteger(encounterId) && encounterId > 0)) {
      fail("A Raid owner, stable session ID, and encounter ID are required");
    }
    return `raid:${JSON.stringify([ownerId, sessionId, encounterId])}`;
  }
  function isBattleOnlySummon(unit) {
    return unit?.isBattleOnlySummon === true || unit?.battleSummonKind !== void 0 && unit.battleSummonKind !== "" || unit?.battleSummonParentId !== void 0 && unit.battleSummonParentId !== 0;
  }
  function raidOwnerManifest(raidWorld, ownerId) {
    const roster = ownerRoster(raidWorld, ownerId);
    const manifest = /* @__PURE__ */ new Map();
    for (const troop of roster.troops) {
      if (!troop || !Number.isSafeInteger(troop.farmId) || troop.farmId < 1 || !Number.isInteger(troop.species) || troop.species < 0 || troop.species > 3 || !Number.isInteger(troop.tier) || troop.tier < 1 || troop.tier > 4 || typeof troop.deployed !== "boolean" || manifest.has(troop.farmId)) {
        fail("The owner Raid roster must have unique Farm IDs and valid deployed entries");
      }
      manifest.set(troop.farmId, troop);
    }
    const ownerUnits = raidWorld.units.filter((unit) => unit?.ownerId === ownerId);
    const ownerUnitsById = /* @__PURE__ */ new Map();
    for (const unit of ownerUnits) {
      if (!Number.isSafeInteger(unit.id) || unit.id < 1 || ownerUnitsById.has(unit.id) || !Number.isFinite(unit.hp) || unit.hp < 0) {
        fail("The owner Raid units must have unique IDs and valid health");
      }
      ownerUnitsById.set(unit.id, unit);
    }
    const originalUnitsByFarmId = /* @__PURE__ */ new Map();
    const deadFarmUnitIds = [];
    for (const unit of ownerUnits) {
      if (isBattleOnlySummon(unit)) {
        const parent = ownerUnitsById.get(unit.battleSummonParentId);
        const parentTroop = parent && manifest.get(parent.farmId);
        const validSplit = unit.isBattleOnlySummon === true && unit.battleSummonKind === "pea-death-split" && Number.isSafeInteger(unit.battleSummonParentId) && unit.battleSummonParentId > 0 && parent && parent.ownerId === ownerId && !isBattleOnlySummon(parent) && parent.hp <= 0 && parentTroop?.deployed === true && parent.farmId === unit.farmId && parent.species === 0 && unit.species === 0 && unit.tier === 1 && unit.canSplit === false && unit.countsTowardPermanentRoster === false && unit.eligibleForRaidDeployment === false && unit.breedingEligible === false && unit.mergeEligible === false && unit.usesPersistentSleep === false;
        if (!validSplit) fail("A battle-only Raid split is missing its validated origin marker");
        continue;
      }
      const troop = manifest.get(unit.farmId);
      if (!troop || !troop.deployed || troop.species !== unit.species || troop.tier !== unit.tier || originalUnitsByFarmId.has(unit.farmId)) {
        fail("A Raid unit does not match this owner’s deployed roster");
      }
      originalUnitsByFarmId.set(unit.farmId, unit);
      if (unit.hp <= 0) deadFarmUnitIds.push(unit.farmId);
    }
    for (const [farmId, troop] of manifest) {
      if (troop.deployed && !originalUnitsByFarmId.has(farmId)) {
        fail("A deployed original Farm unit is missing from this owner’s Raid world");
      }
    }
    return {
      roster,
      manifest,
      deadFarmUnitIds: deadFarmUnitIds.sort((a, b) => a - b),
      availableAtStart: roster.troops.length,
      originalUnitsDeployed: roster.troops.filter((troop) => troop.deployed).length
    };
  }
  function raidDeploymentRewardMultiplier({ availableAtStart, originalUnitsDeployed } = {}) {
    if (!isCount(availableAtStart) || !isCount(originalUnitsDeployed) || originalUnitsDeployed > availableAtStart) {
      fail("Raid deployment counts must be non-negative integers and original deployed cannot exceed the starting roster");
    }
    if (availableAtStart === 0 || originalUnitsDeployed === 0) return 0;
    return Math.min(2, Math.max(1, 1 + (availableAtStart - originalUnitsDeployed) / availableAtStart));
  }
  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }
  function validateReturnedPrivateFarm(sourceFarm, resultFarm, sleptFarmUnitIds) {
    if (sourceFarm.ownerId !== void 0 && resultFarm.ownerId !== sourceFarm.ownerId) {
      fail("The Raid victory resolver returned a different owner Farm");
    }
    const originalUnits = new Map(sourceFarm.units.map((unit) => [unit.id, unit]));
    const resultUnits = /* @__PURE__ */ new Map();
    for (const unit of resultFarm.units) {
      if (!unit || !Number.isSafeInteger(unit.id) || unit.id < 1 || resultUnits.has(unit.id)) {
        fail("The Raid victory resolver returned invalid or duplicate private Farm units");
      }
      resultUnits.set(unit.id, unit);
    }
    for (const [unitId, original] of originalUnits) {
      const result = resultUnits.get(unitId);
      if (!result || result.species !== original.species || result.tier !== original.tier) {
        fail("The Raid victory resolver did not preserve the owner’s Farm roster");
      }
    }
    for (const unitId of sleptFarmUnitIds) {
      const unit = resultUnits.get(unitId);
      if (!unit || unit.hp !== 0 || unit.down !== RAID_SLEEP_SECONDS) {
        fail("The Raid victory resolver must preserve the owner Farm’s casualty sleep");
      }
    }
  }
  function reserveRaidRun(farm, { sessionId = null } = {}) {
    if (!farm || typeof farm !== "object" || Array.isArray(farm) || !Array.isArray(farm.units)) {
      fail("A private Farm snapshot with a units array is required");
    }
    const ledger = ledgerState(farm);
    if (ledger.activeSequence !== null) {
      if (sessionId !== null && sessionId !== ledger.activeSessionId) {
        fail("This Farm already has a different active Raid; reconnect to it or settle it first");
      }
      return { farm, runSequence: ledger.activeSequence, sessionId: ledger.activeSessionId, resumed: true };
    }
    if (sessionId !== null && !isNonEmptyString(sessionId)) fail("Raid session ID must be a non-empty string");
    const runSequence = ledger.nextSequence + 1;
    const stableSessionId = sessionId ?? `farm-raid-${runSequence}`;
    const nextFarm = clone(farm);
    nextFarm.nextRaidRunSequence = runSequence;
    nextFarm.activeRaidRunSequence = runSequence;
    nextFarm.activeRaidSessionId = stableSessionId;
    nextFarm.raidSettlementWatermark = ledger.watermark;
    nextFarm.raidSettlementReceipts = [...ledger.receipts];
    return { farm: nextFarm, runSequence, sessionId: stableSessionId, resumed: false };
  }
  function abortReservedRaidRun(farm, { completedAtMs = null } = {}) {
    if (!farm || typeof farm !== "object" || Array.isArray(farm) || !Array.isArray(farm.units)) {
      fail("A private Farm snapshot with a units array is required");
    }
    if (completedAtMs !== null && (!Number.isFinite(completedAtMs) || completedAtMs < 0)) {
      fail("Settlement timestamp must be a non-negative finite number");
    }
    const ledger = ledgerState(farm);
    if (ledger.activeSequence === null) return { farm, receipt: null, applied: false };
    const ownerId = "recovery-abort";
    const { activeSequence: runSequence, activeSessionId: sessionId } = ledger;
    const receipt = {
      key: raidSettlementKey({ ownerId, sessionId, encounterId: runSequence }),
      ownerId,
      sessionId,
      encounterId: runSequence,
      runSequence,
      outcome: "aborted",
      status: "settled",
      completedAtMs,
      sleptFarmUnitIds: [],
      availableAtStart: 0,
      originalUnitsDeployed: 0,
      deploymentMultiplier: 0,
      reward: null
    };
    const nextFarm = clone(farm);
    nextFarm.activeRaidRunSequence = null;
    nextFarm.activeRaidSessionId = null;
    nextFarm.raidSettlementWatermark = runSequence;
    nextFarm.raidSettlementReceipts = [...ledger.receipts, receipt].slice(-RAID_SETTLEMENT_RECEIPT_LIMIT);
    return { farm: nextFarm, receipt: clone(receipt), applied: true };
  }
  function settleRaidOwnerFarm(farm, {
    ownerId,
    sessionId,
    encounterId,
    runSequence,
    outcome,
    raidWorld,
    completedAtMs,
    settleVictory = null
  } = {}) {
    if (!farm || typeof farm !== "object" || Array.isArray(farm) || !Array.isArray(farm.units)) {
      fail("A private Farm snapshot with a units array is required");
    }
    const key = raidSettlementKey({ ownerId, sessionId, encounterId });
    if (!["victory", "defeat", "aborted"].includes(outcome)) fail("Raid outcome must be victory, defeat, or aborted");
    if (!Number.isSafeInteger(runSequence) || runSequence < 1) fail("A positive Farm-local Raid run sequence is required");
    if (settleVictory !== null && typeof settleVictory !== "function") fail("settleVictory must be a function");
    if (completedAtMs !== void 0 && (!Number.isFinite(completedAtMs) || completedAtMs < 0)) {
      fail("Settlement timestamp must be a non-negative finite number");
    }
    const ledger = ledgerState(farm);
    if (runSequence <= ledger.watermark) {
      const previous = ledger.receipts.find((receipt2) => receipt2?.key === key);
      return {
        farm,
        receipt: clone(previous || {
          key,
          ownerId,
          sessionId,
          encounterId,
          runSequence,
          outcome: "already-settled",
          status: "compacted",
          sleptFarmUnitIds: [],
          availableAtStart: 0,
          originalUnitsDeployed: 0,
          deploymentMultiplier: 0,
          reward: null
        }),
        applied: false
      };
    }
    if (runSequence !== ledger.watermark + 1 || ledger.activeSequence !== runSequence || ledger.activeSessionId !== sessionId) {
      fail("Raid settlement does not match the active Farm-local run");
    }
    const raidOwner = raidOwnerManifest(raidWorld, ownerId);
    const { manifest, deadFarmUnitIds, availableAtStart, originalUnitsDeployed } = raidOwner;
    const unitsByFarmId = /* @__PURE__ */ new Map();
    for (const unit of farm.units) {
      if (!unit || !Number.isSafeInteger(unit.id) || unit.id < 1 || unitsByFarmId.has(unit.id)) {
        fail("Private Farm units must have unique positive IDs");
      }
      unitsByFarmId.set(unit.id, unit);
    }
    for (const [farmUnitId, troop] of manifest) {
      const farmUnit = unitsByFarmId.get(farmUnitId);
      if (!farmUnit || farmUnit.species !== troop.species || farmUnit.tier !== troop.tier) {
        fail("The Raid roster no longer matches this owner’s private Farm units");
      }
    }
    for (const farmUnitId of deadFarmUnitIds) {
      if (!unitsByFarmId.has(farmUnitId)) fail("A dead Raid unit does not belong to this owner Farm");
    }
    let privateFarm = clone(farm);
    privateFarm.raidSettlementReceipts = Array.isArray(privateFarm.raidSettlementReceipts) ? privateFarm.raidSettlementReceipts : [];
    const deadSet = new Set(deadFarmUnitIds);
    for (const unit of privateFarm.units) {
      if (!deadSet.has(unit.id)) continue;
      unit.hp = 0;
      unit.down = RAID_SLEEP_SECONDS;
    }
    let rewardSummary = null;
    let deploymentMultiplier = 0;
    if (outcome === "victory") {
      deploymentMultiplier = raidDeploymentRewardMultiplier({ availableAtStart, originalUnitsDeployed });
      if (deploymentMultiplier > 0) {
        if (settleVictory === null) fail("A reward-capable Raid victory needs the common reward/progression resolver");
        const resolution = settleVictory({
          farm: privateFarm,
          ownerId,
          sessionId,
          encounterId,
          receiptKey: key,
          source: "raid",
          deploymentMultiplier
        });
        if (!resolution || !resolution.farm || typeof resolution.farm !== "object" || Array.isArray(resolution.farm) || !Array.isArray(resolution.farm.units)) {
          fail("The Raid victory resolver must return a private Farm snapshot and summary");
        }
        validateReturnedPrivateFarm(farm, resolution.farm, deadFarmUnitIds);
        privateFarm = clone(resolution.farm);
        rewardSummary = resolution.summary ?? null;
      }
    }
    const receipt = {
      key,
      ownerId,
      sessionId,
      encounterId,
      runSequence,
      outcome,
      status: "settled",
      completedAtMs: completedAtMs ?? null,
      sleptFarmUnitIds: [...deadFarmUnitIds].sort((a, b) => a - b),
      availableAtStart,
      originalUnitsDeployed,
      deploymentMultiplier,
      reward: rewardSummary === null ? null : clone(rewardSummary)
    };
    privateFarm.nextRaidRunSequence = ledger.nextSequence;
    privateFarm.activeRaidRunSequence = null;
    privateFarm.activeRaidSessionId = null;
    privateFarm.raidSettlementWatermark = runSequence;
    privateFarm.raidSettlementReceipts = [...ledger.receipts, receipt].slice(-RAID_SETTLEMENT_RECEIPT_LIMIT);
    return { farm: privateFarm, receipt: clone(receipt), applied: true };
  }
  var RAID_SLEEP_SECONDS, RAID_SETTLEMENT_RECEIPT_LIMIT, fail, isNonEmptyString, isCount;
  var init_raid_settlement = __esm({
    "src/raid-settlement.js"() {
      RAID_SLEEP_SECONDS = 60;
      RAID_SETTLEMENT_RECEIPT_LIMIT = 128;
      fail = (message) => {
        throw new TypeError(message);
      };
      isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
      isCount = (value) => Number.isSafeInteger(value) && value >= 0;
    }
  });

  // src/farm-state.js
  function snapshot(g) {
    return JSON.parse(JSON.stringify(g, function(key, value) {
      return key === "owner" && this instanceof AttackCycle ? void 0 : value instanceof Set ? [...value] : value;
    }));
  }
  function normalize(raw, migrateLegacyRaid = false) {
    const resetLegacyCorpseTimers = !Object.hasOwn(raw, "corpseRecoveryVersion"), hasRewardWatermarks = Object.hasOwn(raw, "bossRewardWatermarks");
    raw = structuredClone(raw);
    if (resetLegacyCorpseTimers) raw.corpseRecoveryVersion = 1;
    for (const u of raw.units || []) if (!Object.hasOwn(u, "cooldownDuration")) u.cooldownDuration = Math.max(0, Number.isFinite(u.cooldown) ? u.cooldown : 0);
    const base = snapshot(new Garden()), fill = (v, d) => {
      for (const [k, x] of Object.entries(d)) {
        if (!Object.hasOwn(v, k)) v[k] = structuredClone(x);
        else if (v[k] && x && typeof v[k] === "object" && typeof x === "object" && !Array.isArray(v[k]) && !Array.isArray(x)) fill(v[k], x);
      }
    };
    fill(raw, base);
    raw.progress.levels.capacity = Number.isInteger(raw.progress.levels.capacity) ? raw.progress.levels.capacity : 0;
    for (const r of raw.raidRosters || []) {
      if (!Object.hasOwn(r, "abilitySnapshot")) r.abilitySnapshot = createAbilityRuntimeSnapshot(createPlayerProgressionState());
      if (!Object.hasOwn(r, "settlementSessionId")) r.settlementSessionId = "";
      if (!Object.hasOwn(r, "settlementRunSequence")) r.settlementRunSequence = 0;
      if (!Object.hasOwn(r, "settlementEncounterId")) r.settlementEncounterId = 0;
    }
    const unitDefaults = { isBattleOnlySummon: false, battleSummonKind: "", battleSummonParentId: 0, countsTowardPermanentRoster: true, eligibleForRaidDeployment: true, breedingEligible: true, mergeEligible: true, canSplit: true, splitUsedThisBattle: false, deathSplitHandled: false, usesPersistentSleep: true, lifetime: "", chestnutBasicCycles: 0 };
    for (const u of raw.units || []) for (const [key, value] of Object.entries(unitDefaults)) if (!Object.hasOwn(u, key)) u[key] = value;
    for (const p of raw.projectiles || []) {
      if (!Object.hasOwn(p, "attackMultiplier")) p.attackMultiplier = abilityProfile(p.species).skillMultiplier;
      if (!Object.hasOwn(p, "shotIndex")) p.shotIndex = 0;
    }
    raw.projectileSerial = Math.max(Number.isSafeInteger(raw.projectileSerial) ? raw.projectileSerial : 0, ...(raw.projectiles || []).map((p) => Number.isSafeInteger(p?.id) ? p.id : 0));
    raw.raidSummonSerial = Number.isSafeInteger(raw.raidSummonSerial) ? raw.raidSummonSerial : Math.max(0, ...(raw.units || []).map((u) => Number.isSafeInteger(u?.id) && u.id >= CONFIG.raidSummonIdBase ? u.id - CONFIG.raidSummonIdBase + 1 : 0));
    if (raw.farmBossEvent.phase !== "idle" && raw.farmBossEvent.encounterId === 0) {
      const encounterId = raw.nextBossEncounterId++;
      raw.farmBossEvent.encounterId = encounterId;
      raw.farmBossEvent.rewardStatus = raw.farmBossEvent.outcome === "victory" ? "missed" : raw.farmBossEvent.outcome === "defeat" ? "none" : "unresolved";
      raw.farmBossEvent.rewardChance = 0;
      raw.farmBossEvent.rewardRoll = 0;
      raw.farmBossEvent.rewardUnitId = 0;
      if (raw.farmBossEvent.outcome === "victory") raw.bossRewardReceipts.push({ encounterId, source: "farm", species: 3, tier: 1, x: raw.boss.x, y: raw.boss.y, chance: 0, roll: 0, status: "missed", unitId: 0 });
    }
    for (const r of raw.raidRosters || []) if (!Object.hasOwn(r, "lastDeploySequence")) r.lastDeploySequence = Array.isArray(r.troops) ? r.troops.filter((t) => t?.deployed).length : 0;
    if (!hasRewardWatermarks) for (const source of ["farm", "raid"]) raw.bossRewardWatermarks[source] = Math.max(0, ...raw.bossRewardReceipts.filter((reward) => reward?.source === source && Number.isSafeInteger(reward.encounterId)).map((reward) => reward.encounterId));
    raw.nextRaidRunSequence = Math.max(raw.nextRaidRunSequence || 0, raw.bossRewardWatermarks.raid || 0);
    raw.raidSettlementWatermark = Math.max(raw.raidSettlementWatermark || 0, raw.bossRewardWatermarks.raid || 0);
    for (const u of raw.units) {
      if (!Number.isFinite(u.cooldownDuration) || u.cooldownDuration < (Number.isFinite(u.cooldown) ? u.cooldown : 0)) u.cooldownDuration = Math.max(0, Number.isFinite(u.cooldown) ? u.cooldown : 0);
      if (!Object.hasOwn(u, "growthDuration")) u.growthDuration = CONFIG.breedGrowthSeconds;
      if (!Object.hasOwn(u, "growthElapsed")) {
        const progress = Number.isFinite(u.growth) ? Math.max(0, Math.min(CONFIG.matureMeals, u.growth)) : 0;
        u.growthElapsed = u.growthDuration * progress / CONFIG.matureMeals;
      }
      if (!Object.hasOwn(u, "mateId")) u.mateId = 0;
      if (!Object.hasOwn(u, "perceptionRange")) u.perceptionRange = CONFIG.raid.perceptionRange;
      if (!Object.hasOwn(u, "ownerId")) u.ownerId = "";
      if (!Object.hasOwn(u, "farmId")) u.farmId = 0;
      if (!Object.hasOwn(u, "dropLanded")) u.dropLanded = true;
      if (u.hp <= 0) {
        if (resetLegacyCorpseTimers || !Number.isFinite(u.down) || u.down <= 0) u.down = CONFIG.corpseRecoverySeconds;
        else u.down = Math.min(CONFIG.corpseRecoverySeconds, u.down);
      } else u.down = 0;
    }
    if (migrateLegacyRaid && raw.scene === "raid") {
      raw.scene = "farm";
      raw.running = false;
      raw.encounter = { outcome: "idle", elapsed: 0 };
      raw.raidExpectedPlayers = ["solo"];
      raw.raidRosters = [];
      raw.raidDeploymentStarted = false;
      raw.projectiles = [];
      raw.boss = base.boss;
      for (const u of raw.units) {
        u.x = u.home?.x ?? u.x;
        u.y = u.home?.y ?? u.y;
        Object.assign(u, { z: 0, vx: 0, vy: 0, vz: 0, stun: 0, down: 0, hp: resolveUnitStats(u).maxHp, dropLanded: true });
        u.ability = { phase: "idle", elapsed: 0, action: null };
      }
    }
    return raw;
  }
  function assert(ok) {
    if (!ok) throw new TypeError("올바른 농장 저장 데이터가 아닙니다.");
  }
  function finiteTree(v, depth = 0, key = "") {
    assert(depth < 18);
    if (typeof v === "number") assert(Number.isFinite(v) && Math.abs(v) < 1e13);
    else if (Array.isArray(v)) {
      const max = key === "units" ? CONFIG.maxRaidBattleUnits : key === "projectiles" ? CONFIG.maxRaidProjectiles : key === "bossRewardReceipts" || key === "processedBossKillReceipts" ? 1e5 : key === "raidSettlementReceipts" ? 128 : 1024;
      assert(v.length <= max);
      v.forEach((x) => finiteTree(x, depth + 1));
    } else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        assert(!["__proto__", "constructor", "prototype"].includes(k));
        finiteTree(x, depth + 1, k);
      }
    } else assert(v === null || typeof v === "boolean" || typeof v === "string" && v.length < 256);
  }
  function shape(v, t) {
    assert(v !== null && typeof v === "object" && !Array.isArray(v));
    assert(Object.keys(v).length === Object.keys(t).length);
    for (const [k, x] of Object.entries(t)) {
      assert(Object.hasOwn(v, k));
      if (x === null) continue;
      if (Array.isArray(x)) {
        assert(Array.isArray(v[k]));
        continue;
      }
      if (typeof x === "object") shape(v[k], x);
      else assert(typeof v[k] === typeof x);
    }
  }
  function restore(raw, { migrateLegacyRaid = false } = {}) {
    raw = normalize(raw, migrateLegacyRaid);
    finiteTree(raw);
    const g = new Garden();
    shape(raw, snapshot(g));
    assert(integer(raw.seed, 0, 4294967295) && integer(raw.rng.state, 0, 4294967295));
    assert(["farm", "raid"].includes(raw.scene) && ["breed", "merge"].includes(raw.mode));
    if (raw.mergeTask !== null) {
      const t = raw.mergeTask;
      assert(raw.scene === "farm" && raw.mode === "merge" && t && ["approach", "animation"].includes(t.phase) && Number.isFinite(t.elapsed) && t.elapsed >= 0 && Number.isFinite(t.duration) && t.duration > 0 && t.duration <= CONFIG.mergeAnimationSeconds + 1e-9);
      if (t.phase === "approach") {
        assert(integer(t.aId, 1, CONFIG.maxFarmUnitId) && integer(t.bId, 1, CONFIG.maxFarmUnitId) && t.aId !== t.bId && raw.units.some((u) => u.id === t.aId) && raw.units.some((u) => u.id === t.bId));
      } else assert(t.aId === 0 && t.bId === 0 && t.elapsed <= t.duration + 1e-9);
    }
    const farmCap = Math.min(CONFIG.maxFarmCap, CONFIG.cap + 7 * (raw.progress.levels.capacity || 0));
    assert(raw.units.length <= (raw.scene === "farm" ? raw.farmBossEvent?.phase === "idle" ? farmCap : CONFIG.maxFarmBattleUnits : CONFIG.maxRaidBattleUnits) && raw.food.length <= 140 && raw.projectiles.length <= CONFIG.maxRaidProjectiles);
    assert(raw.farmBossEvent && ["idle", "dropping", "fighting", "celebrating", "fading"].includes(raw.farmBossEvent.phase) && ["idle", "fighting", "victory", "defeat"].includes(raw.farmBossEvent.outcome) && Number.isFinite(raw.farmBossEvent.elapsed) && raw.farmBossEvent.elapsed >= 0);
    assert(integer(raw.nextBossEncounterId, 1, 1e12) && Array.isArray(raw.bossRewardReceipts));
    assert(isValidPlayerProgressionState(raw.playerProgression));
    const farmEvent = raw.farmBossEvent;
    if (farmEvent.phase === "idle") {
      assert(farmEvent.outcome === "idle" && farmEvent.elapsed === 0 && farmEvent.encounterId === 0 && farmEvent.rewardStatus === "none" && farmEvent.rewardChance === 0 && farmEvent.rewardRoll === 0 && farmEvent.rewardUnitId === 0);
      if (raw.scene === "farm") assert(!raw.boss.active);
    } else if (farmEvent.phase === "dropping" || farmEvent.phase === "fighting") assert(raw.scene === "farm" && farmEvent.outcome === "fighting" && raw.boss.active && integer(farmEvent.encounterId, 1, raw.nextBossEncounterId - 1) && farmEvent.rewardStatus === "unresolved" && farmEvent.rewardChance === 0 && farmEvent.rewardRoll === 0 && farmEvent.rewardUnitId === 0);
    else {
      assert(raw.scene === "farm" && ["victory", "defeat"].includes(farmEvent.outcome) && !raw.boss.active && integer(farmEvent.encounterId, 1, raw.nextBossEncounterId - 1));
      assert(farmEvent.outcome === "victory" ? raw.boss.hp === 0 : raw.boss.hp > 0);
      assert(farmEvent.outcome === "victory" ? ["missed", "pending", "granted"].includes(farmEvent.rewardStatus) : farmEvent.rewardStatus === "none");
    }
    assert(raw.bossRewardWatermarks && integer(raw.bossRewardWatermarks.farm, 0, 1e12) && integer(raw.bossRewardWatermarks.raid, 0, 1e12) && raw.nextBossEncounterId > raw.bossRewardWatermarks.farm);
    const rewardIds = /* @__PURE__ */ new Set();
    for (const reward of raw.bossRewardReceipts) {
      assert(reward && integer(reward.encounterId, 1, 1e12) && ["farm", "raid"].includes(reward.source) && reward.encounterId <= raw.bossRewardWatermarks[reward.source] && integer(reward.species, 0, CONFIG.maxSpecies - 1) && integer(reward.tier, 1, 4) && Number.isFinite(reward.x) && Number.isFinite(reward.y) && Number.isFinite(reward.chance) && reward.chance >= 0 && reward.chance <= 1 && Number.isFinite(reward.roll) && reward.roll >= 0 && reward.roll < 1 && ["pending", "missed", "granted"].includes(reward.status) && integer(reward.unitId, 0, CONFIG.maxFarmUnitId));
      const key = reward.receiptKey || reward.source + ":" + reward.encounterId;
      assert(!rewardIds.has(key));
      rewardIds.add(key);
      assert(reward.status === "granted" === reward.unitId > 0);
      if (reward.receiptKey !== void 0) assert(typeof reward.receiptKey === "string" && reward.receiptKey.length > 0 && reward.receiptKey.length < 256);
      if (reward.acquisitionMultiplier !== void 0) assert(Number.isFinite(reward.acquisitionMultiplier) && reward.acquisitionMultiplier >= 0 && reward.acquisitionMultiplier <= 2);
      if (reward.source === "farm" && reward.status === "granted") assert(reward.unitId < raw.nextId);
    }
    assert(integer(raw.nextRaidRunSequence, 0, 1e12) && integer(raw.raidSettlementWatermark, 0, raw.nextRaidRunSequence) && raw.nextRaidRunSequence >= raw.bossRewardWatermarks.raid && raw.raidSettlementWatermark >= raw.bossRewardWatermarks.raid && Array.isArray(raw.raidSettlementReceipts));
    const activeRaid = raw.activeRaidRunSequence, activeSession = raw.activeRaidSessionId;
    assert(activeRaid === null === (activeSession === null));
    if (activeRaid === null) assert(raw.nextRaidRunSequence === raw.raidSettlementWatermark);
    else assert(integer(activeRaid, 1, 1e12) && activeRaid === raw.nextRaidRunSequence && activeRaid === raw.raidSettlementWatermark + 1 && typeof activeSession === "string" && activeSession.trim().length > 0 && activeSession.length <= 128);
    const raidReceiptKeys = /* @__PURE__ */ new Set();
    for (const receipt of raw.raidSettlementReceipts) {
      assert(receipt && typeof receipt.ownerId === "string" && receipt.ownerId.length > 0 && typeof receipt.sessionId === "string" && receipt.sessionId.length > 0 && integer(receipt.encounterId, 1, 1e12) && integer(receipt.runSequence, 1, raw.raidSettlementWatermark) && ["victory", "defeat", "aborted"].includes(receipt.outcome));
      assert(receipt.status === "settled" && receipt.key === raidSettlementKey({ ownerId: receipt.ownerId, sessionId: receipt.sessionId, encounterId: receipt.encounterId }) && !raidReceiptKeys.has(receipt.key) && receipt.runSequence <= raw.raidSettlementWatermark && Array.isArray(receipt.sleptFarmUnitIds) && receipt.sleptFarmUnitIds.every((id) => integer(id, 1, CONFIG.maxFarmUnitId)) && new Set(receipt.sleptFarmUnitIds).size === receipt.sleptFarmUnitIds.length && integer(receipt.availableAtStart, 0, CONFIG.maxRaidPlayerUnits) && integer(receipt.originalUnitsDeployed, 0, receipt.availableAtStart) && Number.isFinite(receipt.deploymentMultiplier) && receipt.deploymentMultiplier >= 0 && receipt.deploymentMultiplier <= 2 && (receipt.completedAtMs === null || Number.isFinite(receipt.completedAtMs) && receipt.completedAtMs >= 0) && (receipt.reward === null || receipt.reward && typeof receipt.reward === "object" && !Array.isArray(receipt.reward)));
      raidReceiptKeys.add(receipt.key);
    }
    if (farmEvent.outcome === "victory" && farmEvent.phase !== "idle") {
      const receipt = raw.bossRewardReceipts.find((reward) => reward.source === "farm" && reward.encounterId === farmEvent.encounterId);
      assert(receipt && receipt.status === farmEvent.rewardStatus && receipt.chance === farmEvent.rewardChance && receipt.roll === farmEvent.rewardRoll && receipt.unitId === farmEvent.rewardUnitId);
    }
    assert(raw.corpseRecoveryVersion === 1 && integer(raw.nextId, 1, 1e9) && integer(raw.foodTaps.remainder, 0, 4) && raw.foodTaps.autoClock >= 0 && raw.foodTaps.autoClock < 0.51);
    assert(Array.isArray(raw.raidExpectedPlayers) && raw.raidExpectedPlayers.length >= 1 && raw.raidExpectedPlayers.length <= CONFIG.maxRaidPlayers && raw.raidExpectedPlayers.every((p) => typeof p === "string" && p.length > 0) && new Set(raw.raidExpectedPlayers).size === raw.raidExpectedPlayers.length && Array.isArray(raw.raidRosters));
    const rosterOwners = /* @__PURE__ */ new Set(), manifest = /* @__PURE__ */ new Set();
    for (const r of raw.raidRosters) {
      assert(raw.raidExpectedPlayers.includes(r.ownerId) && !rosterOwners.has(r.ownerId) && Array.isArray(r.troops) && r.troops.length <= CONFIG.maxRaidPlayerUnits && isValidAbilityRuntimeSnapshot(r.abilitySnapshot));
      assert(typeof r.settlementSessionId === "string" && r.settlementSessionId.length <= 128 && integer(r.settlementRunSequence, 0, 1e12) && integer(r.settlementEncounterId, 0, 1e12));
      assert(r.settlementRunSequence === 0 ? r.settlementSessionId === "" && r.settlementEncounterId === 0 : r.settlementSessionId.trim().length > 0 && r.settlementEncounterId === r.settlementRunSequence);
      rosterOwners.add(r.ownerId);
      const ids2 = /* @__PURE__ */ new Set();
      for (const t of r.troops) {
        assert(integer(t.farmId, 1, CONFIG.maxFarmUnitId) && integer(t.species, 0, CONFIG.maxSpecies - 1) && integer(t.tier, 1, 4) && typeof t.deployed === "boolean" && !ids2.has(t.farmId));
        ids2.add(t.farmId);
        manifest.add(r.ownerId + ":" + t.farmId);
      }
      assert(integer(r.lastDeploySequence, 0, r.troops.length) && r.lastDeploySequence === r.troops.filter((t) => t.deployed).length && Number.isFinite(r.buffUntil) && Number.isFinite(r.buffReadyAt) && r.buffUntil >= 0 && r.buffReadyAt >= 0);
    }
    assert(manifest.size <= CONFIG.maxRaidUnits);
    const ids = /* @__PURE__ */ new Set(), deployed = /* @__PURE__ */ new Set(), mateIdLimit = raw.scene === "raid" ? CONFIG.maxRaidPlayers * CONFIG.raidPlayerIdStride + CONFIG.maxRaidPlayerUnits : CONFIG.maxFarmUnitId;
    const unitsById = /* @__PURE__ */ new Map(), summonsByParent = /* @__PURE__ */ new Map();
    for (const u of raw.units) {
      shape(u, snapshot(new Unit(1, 0, 1, 0, 0)));
      assert(Number.isFinite(u.growthElapsed) && u.growthElapsed >= 0 && Number.isFinite(u.growthDuration) && u.growthDuration > 0 && u.growthElapsed <= u.growthDuration + 1e-9 && Number.isFinite(u.cooldown) && u.cooldown >= 0 && Number.isFinite(u.cooldownDuration) && u.cooldownDuration >= u.cooldown - 1e-9 && u.cooldownDuration <= 1e5 && integer(u.mateId, 0, mateIdLimit) && Number.isFinite(u.perceptionRange) && u.perceptionRange > 0 && u.perceptionRange <= 100 && Number.isFinite(u.down) && u.down >= 0 && u.down <= CONFIG.corpseRecoverySeconds);
      assert(integer(u.species, 0, CONFIG.maxSpecies - 1) && integer(u.tier, 1, 4) && ["idle", "windup", "active", "recover"].includes(u.ability.phase) && typeof u.ownerId === "string" && Number.isSafeInteger(u.farmId) && typeof u.dropLanded === "boolean" && typeof u.isBattleOnlySummon === "boolean" && typeof u.splitUsedThisBattle === "boolean" && typeof u.deathSplitHandled === "boolean" && integer(u.chestnutBasicCycles, 0, 1e12));
      if (u.hp <= 0) assert(u.down > 0 && !u.isBattleOnlySummon);
      else assert(u.down === 0);
      assert(!ids.has(u.id));
      ids.add(u.id);
      unitsById.set(u.id, u);
      if (u.isBattleOnlySummon) {
        assert(["farm", "raid"].includes(raw.scene) && u.battleSummonKind === "pea-death-split" && integer(u.battleSummonParentId, 1, Number.MAX_SAFE_INTEGER) && u.species === 0 && u.tier === 1 && u.canSplit === false && u.countsTowardPermanentRoster === false && u.eligibleForRaidDeployment === false && u.breedingEligible === false && u.mergeEligible === false && u.usesPersistentSleep === false && u.lifetime === "until-death-or-battle-end" && u.deathSplitHandled === false && u.splitUsedThisBattle === true && u.hp > 0);
        const parent = unitsById.get(u.battleSummonParentId);
        assert(parent && parent.isBattleOnlySummon === false && parent.hp <= 0 && parent.species === 0 && parent.splitUsedThisBattle && parent.ownerId === u.ownerId && parent.farmId === u.farmId);
        const list = summonsByParent.get(parent.id) || [];
        list.push(u);
        summonsByParent.set(parent.id, list);
        if (raw.scene === "raid") assert(u.id >= CONFIG.raidSummonIdBase && u.id < CONFIG.raidSummonIdBase + CONFIG.maxRaidBattleUnits && raw.raidExpectedPlayers.includes(u.ownerId) && integer(u.farmId, 1, CONFIG.maxFarmUnitId));
        else assert(integer(u.id, 1, raw.nextId - 1) && raw.farmBossEvent.phase !== "idle");
      } else {
        assert(u.battleSummonKind === "" && u.battleSummonParentId === 0 && u.countsTowardPermanentRoster === true && u.eligibleForRaidDeployment === true && u.breedingEligible === true && u.mergeEligible === true && u.canSplit === true && u.usesPersistentSleep === true && u.lifetime === "");
        if (raw.scene === "raid") {
          const roster = raw.raidRosters.find((r) => r.ownerId === u.ownerId), troopIndex = roster?.troops.findIndex((t) => t.farmId === u.farmId) ?? -1, slot = raw.raidExpectedPlayers.indexOf(u.ownerId), currentId = (slot + 1) * CONFIG.raidPlayerIdStride + troopIndex + 1, legacyId = (slot + 1) * CONFIG.raidPlayerIdStride + u.farmId;
          assert(raw.raidExpectedPlayers.includes(u.ownerId) && integer(u.farmId, 1, CONFIG.maxFarmUnitId) && manifest.has(u.ownerId + ":" + u.farmId) && !deployed.has(u.ownerId + ":" + u.farmId) && (u.id === currentId || u.farmId <= CONFIG.maxFarmCap && u.id === legacyId));
          deployed.add(u.ownerId + ":" + u.farmId);
        } else assert(integer(u.id, 1, raw.nextId - 1));
      }
      if (u.ability.action) {
        const a = u.ability.action;
        assert(integer(a.id, 1, raw.attackSerial) && typeof a.hit === "boolean" && a.target && Number.isFinite(a.target.x) && Number.isFinite(a.target.y));
        if (a.path) validatePath(a.path);
        if (a.pendingShots !== void 0) {
          assert(Array.isArray(a.pendingShots) && a.pendingShots.length <= 3 && a.pendingShots.every((shot) => integer(shot.shotIndex, 1, 4) && Number.isFinite(shot.delaySeconds) && shot.delaySeconds >= 0 && Number.isFinite(shot.attackMultiplier) && shot.attackMultiplier > 0 && shot.attackMultiplier <= 10));
        }
        if (a.projectileAbility !== void 0) {
          assert(a.projectileAbility && Object.hasOwn(a.projectileAbility, "popcorn"));
          if (a.projectileAbility.popcorn) validatePopcornConfig(a.projectileAbility.popcorn);
        }
      }
      if (u.ability.phase === "active" || u.ability.phase === "windup") assert(u.ability.action !== null);
      if (u.ability.phase === "active") validatePath(u.ability.action.path);
    }
    for (const [parentId, children] of summonsByParent) {
      assert(children.length <= MAX_BEAN_SPLIT_CHILDREN);
      const parent = unitsById.get(parentId);
      assert(parent && parent.ownerId === children[0].ownerId && parent.farmId === children[0].farmId);
    }
    for (const f of raw.food) {
      assert(["flight", "bounce", "grounded"].includes(f.phase));
      for (const k of ["x", "y", "z", "vx", "vy", "vz", "tx", "ty"]) assert(Number.isFinite(f[k]));
    }
    const projectileIds = /* @__PURE__ */ new Set();
    for (const p of raw.projectiles) {
      validatePath(p.path);
      assert(integer(p.id, 1, raw.projectileSerial) && !projectileIds.has(p.id));
      projectileIds.add(p.id);
      assert(integer(p.owner, 1, raw.scene === "raid" ? CONFIG.raidSummonIdBase + CONFIG.maxRaidBattleUnits - 1 : raw.nextId - 1));
      assert(integer(p.species, 0, CONFIG.maxSpecies - 1) && integer(p.tier, 1, 4) && typeof p.hit === "boolean" && Number.isFinite(p.attackMultiplier) && p.attackMultiplier > 0 && p.attackMultiplier <= 10 && integer(p.shotIndex, 0, 4));
      if (p.isPopcorn) {
        assert(typeof p.landed === "boolean" && typeof p.exploded === "boolean" && Array.isArray(p.damagedTargetIds) && p.damagedTargetIds.every((id) => id === "boss") && Number.isFinite(p.fuseRemaining) && p.fuseRemaining >= 0 && p.fuseRemaining <= 1.01);
        validatePopcornConfig(p.popcornConfig);
        if (p.exploded) assert(Number.isFinite(p.explosionLife) && p.explosionLife >= 0 && p.explosionLife < 0.5 + 1e-9);
      }
    }
    assert(integer(raw.projectileSerial, 0, 1e12) && integer(raw.raidSummonSerial, 0, CONFIG.maxRaidBattleUnits));
    for (const n of TREE_NODES) assert(integer(raw.progress.levels[n.id], 0, 4));
    for (const v of Object.values(raw.progress.records)) assert(integer(v, 0, 1e12));
    assert(["chase", "strike-windup", "strike", "sweep-windup", "sweep", "recover", "resting"].includes(raw.boss.phase) && raw.boss.hp >= 0 && raw.boss.hp <= raw.boss.maxHp);
    assert(["idle", "fighting", "victory", "defeat"].includes(raw.encounter.outcome) && raw.encounter.elapsed >= 0);
    assert(raw.running === (raw.encounter.outcome === "fighting"));
    assert(typeof raw.raidDeploymentStarted === "boolean" && (!raw.raidDeploymentStarted || raw.raidRosters.length === raw.raidExpectedPlayers.length));
    assert(raw.boss.radius === CONFIG.raid.bossRadius && raw.boss.height === CONFIG.raid.bossHeight && ["basic", "sweep"].includes(raw.boss.attackKind));
    Object.assign(g, structuredClone(raw));
    g.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(raw.rng.state);
    g.progress = Object.assign(new FarmProgress(), structuredClone(raw.progress));
    g.boss.hit = new Set(raw.boss.hit);
    g.units = raw.units.map((data) => {
      const u = Object.assign(new Unit(data.id, data.species, data.tier, data.x, data.y), structuredClone(data));
      u.ability = Object.assign(new AttackCycle(u), structuredClone(data.ability));
      return u;
    });
    g.reconcileMateReservations();
    return g;
  }
  function validatePath(p) {
    assert(p && p.from && p.to && p.duration > 0 && Number.isFinite(p.height));
    for (const k of ["x", "y"]) assert(Number.isFinite(p.from[k]) && Number.isFinite(p.to[k]));
    assert(Number.isFinite(p.from.z));
  }
  function validatePopcornConfig(c) {
    assert(c && c.species === 1 && c.fuseSeconds === 1 && c.chainOnPopcornContact === true && c.triggersOncePerProjectile === true && c.eachTargetAtMostOncePerProjectile === true && Number.isFinite(c.damageMultiplier) && c.damageMultiplier >= 0.5 && c.damageMultiplier <= 1.5 && c.radiusBaseRangeFraction === 0.25 && Number.isFinite(c.radiusMultiplier) && c.radiusMultiplier >= 1 && c.radiusMultiplier <= 2 && Number.isFinite(c.radius) && c.radius > 0 && c.radius <= 10);
  }
  var integer;
  var init_farm_state = __esm({
    "src/farm-state.js"() {
      init_farm_model();
      init_unit_stats();
      init_player_progression();
      init_player_progression();
      init_ability_state();
      init_species_abilities();
      init_unit_abilities();
      init_raid_settlement();
      integer = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
    }
  });

  // src/version.js
  var PRODUCT_VERSION, COMPATIBILITY;
  var init_version = __esm({
    "src/version.js"() {
      PRODUCT_VERSION = "0.5.5";
      COMPATIBILITY = PRODUCT_VERSION.split(".").slice(0, 2).join(".");
    }
  });

  // src/farm-storage.js
  var farm_storage_exports = {};
  __export(farm_storage_exports, {
    FarmStorage: () => FarmStorage,
    parseSave: () => parseSave
  });
  function parseSave(text) {
    if (typeof text !== "string" || text.length > MAX_BYTES) throw Error("저장 파일이 너무 큽니다.");
    const data = JSON.parse(text);
    if (data.schema !== "budmori-farm" || !READ_COMPATIBILITIES.has(legacyCompatibility(data.productVersion))) throw Error("이 저장은 현재 " + COMPATIBILITY + " 버전과 호환되지 않습니다. 원본을 내보내 보관한 뒤 새 정원을 시작해 주세요.");
    return restore(data.world, { migrateLegacyRaid: true });
  }
  var KEY, LEGACY_KEY, MAX_BYTES, READ_COMPATIBILITIES, legacyCompatibility, FarmStorage;
  var init_farm_storage = __esm({
    "src/farm-storage.js"() {
      init_version();
      init_farm_state();
      KEY = "bloom-weapon-cards-v4";
      LEGACY_KEY = "bloom-weapon-cards-v3";
      MAX_BYTES = 2 * 1024 * 1024;
      READ_COMPATIBILITIES = /* @__PURE__ */ new Set([COMPATIBILITY, "0.4"]);
      legacyCompatibility = (version) => typeof version === "string" ? version.split(".").slice(0, 2).join(".") : "";
      FarmStorage = class {
        constructor() {
          this.raw = null;
          this.world = null;
          this.error = "";
          this.writable = false;
          this.legacyRaw = null;
          this.legacyCompatible = false;
          try {
            this.raw = localStorage.getItem(KEY);
            this.legacyRaw = localStorage.getItem(LEGACY_KEY);
            if (this.raw) {
              if (legacyCompatibility(JSON.parse(this.raw).productVersion) !== COMPATIBILITY) throw Error("현재 저장은 다른 0.5 버전과 호환되지 않습니다. 원본 키는 그대로 보존했어요.");
              this.world = parseSave(this.raw);
            } else if (this.legacyRaw) {
              try {
                parseSave(this.legacyRaw);
                this.legacyCompatible = true;
              } catch (e) {
                this.error = e.message;
              }
            }
            this.writable = true;
          } catch (e) {
            this.error = e.message;
          }
        }
        encode(world) {
          const data = snapshot(world);
          return JSON.stringify({ schema: "budmori-farm", productVersion: PRODUCT_VERSION, world: data });
        }
        refresh() {
          if (!this.writable) return false;
          try {
            const text = localStorage.getItem(KEY);
            if (text === this.raw) return true;
            if (!text) throw Error("농장 저장을 찾지 못했어요. 다른 탭에서 새 정원을 시작했을 수 있어요.");
            const world = parseSave(text);
            this.raw = text;
            this.world = world;
            this.error = "";
            return true;
          } catch (e) {
            this.error = e.message || "저장을 다시 읽지 못했어요.";
            return false;
          }
        }
        save(world) {
          if (!this.writable) return false;
          try {
            if (localStorage.getItem(KEY) !== this.raw) {
              this.error = "저장 내용이 다른 탭에서 바뀌었어요. 이 탭을 새로고침해 이어가 주세요.";
              return false;
            }
            const text = this.encode(world);
            const verified = restore(JSON.parse(text).world);
            localStorage.setItem(KEY, text);
            this.raw = text;
            this.world = verified;
            this.error = "";
            return true;
          } catch {
            this.error = "저장 공간을 사용할 수 없어요. 기존 저장은 보존했어요. 저장 내보내기로 보관해 주세요.";
            return false;
          }
        }
        replace(world) {
          this.writable = true;
          this.world = world;
          return this.save(world);
        }
        import(text) {
          if (localStorage.getItem(KEY) !== this.raw) throw Error("저장 내용이 다른 탭에서 바뀌었어요. 새로고침한 뒤 다시 불러와 주세요.");
          const world = parseSave(text), normalized = this.encode(world);
          restore(JSON.parse(normalized).world);
          localStorage.setItem(KEY, normalized);
          this.raw = normalized;
          this.world = world;
          this.writable = true;
          this.error = "";
          return world;
        }
      };
    }
  });

  // src/farm-app.js
  init_farm_model();

  // src/farm-renderer.js
  init_farm_model();

  // src/farm-indicators.js
  function farmBreedingCooldown(unit, world, defaultDuration = 10) {
    if (world?.scene !== "farm" || unit?.hp <= 0 || unit?.down > 0 || unit?.cooldown <= 0 || unit?.meals !== 0) return null;
    const duration = unit.cooldownDuration || world.breedCooldownDuration?.() || defaultDuration;
    const remaining = Math.max(0, unit.cooldown);
    return { remaining, duration, progress: Math.max(0, Math.min(1, 1 - remaining / duration)) };
  }
  function farmSleepSeconds(unit, scene) {
    if (scene !== "farm" || unit?.hp > 0 || !Number.isFinite(unit?.down) || unit.down <= 0) return 0;
    return Math.ceil(unit.down);
  }
  function splitArcProgress(progress) {
    const sweep = Math.PI * 2 * Math.max(0, Math.min(1, Number(progress) || 0));
    return {
      rear: sweep > 0 ? [0, Math.min(Math.PI, sweep)] : null,
      front: sweep > Math.PI ? [Math.PI, sweep] : null
    };
  }
  function sevenSegmentDigitLines(digit, x, y, size) {
    const segments = {
      0: "abcdef",
      1: "bc",
      2: "abged",
      3: "abgcd",
      4: "fgbc",
      5: "afgcd",
      6: "afgecd",
      7: "abc",
      8: "abcdefg",
      9: "abfgcd"
    }[digit] || "";
    const h = size * 2.6, w = size * 1.75, points = {
      a: [{ x: x - w / 2, y: y - h }, { x: x + w / 2, y: y - h }],
      b: [{ x: x + w / 2, y: y - h }, { x: x + w / 2, y }],
      c: [{ x: x + w / 2, y }, { x: x + w / 2, y: y + h }],
      d: [{ x: x - w / 2, y: y + h }, { x: x + w / 2, y: y + h }],
      e: [{ x: x - w / 2, y }, { x: x - w / 2, y: y + h }],
      f: [{ x: x - w / 2, y: y - h }, { x: x - w / 2, y }],
      g: [{ x: x - w / 2, y }, { x: x + w / 2, y }]
    };
    return Array.from(segments, (segment) => points[segment]);
  }

  // src/farm-renderer.js
  var { bosses: BOSS_VECTOR_ASSETS, troops: TROOP_VECTOR_ASSETS } = globalThis.BudmoriVectorResources;
  var { WebGLDevice, VectorContext, MeshRenderer } = globalThis.BloomGamekitRendering;
  var { createVectorAsset } = globalThis.BloomGamekitVectorAssets;
  var TIER_OUTLINE_COLORS = [
    [216 / 255, 212 / 255, 189 / 255, 1],
    [131 / 255, 206 / 255, 118 / 255, 1],
    [120 / 255, 185 / 255, 255 / 255, 1],
    [189 / 255, 140 / 255, 255 / 255, 1]
  ];
  function unitMotion(u, sim) {
    const dead = u.hp <= 0 || u.down > 0, airborne = !u.dropLanded || u.z > 0.1, phase = u.ability?.phase || "idle";
    const moving = Math.hypot(u.vx || 0, u.vy || 0) > 0.18, kind = UNIT_ABILITY_PROFILES[u.species]?.kind;
    if (dead) return "death";
    if (sim.scene === "raid" && sim.encounter?.outcome === "victory") return "victory";
    if (airborne) return "airborne";
    if (u.stun > 0) return "hit";
    if (u.bounce > 0.04) return "landing";
    if (phase === "windup") return "windup";
    if (phase === "active") return "fire";
    if (phase === "recover") return kind === "lob" && u.ability?.action?.path && u.ability.elapsed < 0.12 ? "fire" : "recover";
    return moving ? "walk" : "idle";
  }
  function motionElapsedMs(u, name, clip) {
    if (name === "idle" || name === "walk" || name === "airborne") return (u.seed || 0) * 80 % clip.durationMs;
    if (name === "windup" || name === "fire" || name === "recover") return clamp2((u.ability?.elapsed || 0) * 1e3, 0, clip.durationMs);
    if (name === "hit") return clip.durationMs * (1 - clamp2((u.stun || 0) / 0.5, 0, 1));
    if (name === "landing") return clip.durationMs * (1 - clamp2((u.bounce || 0) / 0.22, 0, 1));
    if (name === "victory") return Math.abs(u.seed || 0) * 97.531 % clip.durationMs;
    return clip.durationMs;
  }
  function unitExpression(u, sim) {
    const dead = u.hp <= 0 || u.down > 0, airborne = !u.dropLanded || u.z > 0.5;
    const joy = sim.scene === "farm" && sim.effects.some((e) => ["eat", "birth", "merge"].includes(e.kind) && e.life < 0.85 && Math.hypot(e.x - u.x, e.y - u.y) < 1.2);
    const phase = u.ability?.phase;
    const restingCooldown = sim.scene === "farm" && u.cooldown > 0 && phase === "idle";
    return dead ? "dead" : sim.scene === "raid" && sim.encounter?.outcome === "victory" ? "happy" : u.stun > 0 ? "hurt" : airborne ? "surprised" : phase === "windup" ? "focused" : phase === "active" ? "attack" : restingCooldown ? "neutral" : joy ? "happy" : sim.scene === "farm" && !u.fed ? "hungry" : "neutral";
  }
  var ATTACK_ACCENTS = ["#8fac68", "#dbb76b", "#b58b9c", "#9a6947"];
  var Diorama = class {
    constructor(canvas2) {
      this.canvas = canvas2;
      this.device = new WebGLDevice(canvas2, { alpha: false, depth: false, stencil: false, antialias: true });
      this.ctx = new VectorContext(this.device);
      this.vectorAssets = /* @__PURE__ */ new Map();
      this.vectorPlayers = /* @__PURE__ */ new Map();
      const entries = Object.entries(TROOP_VECTOR_ASSETS);
      if (entries.length !== 4 || typeof createVectorAsset !== "function") throw new Error("All pinned GameKit troop and vector-assets sources are required");
      this.meshes = new MeshRenderer(this.device);
      this.ctx.meshRenderer = this.meshes;
      for (const [species, compiled] of entries) this.vectorAssets.set(Number(species), { compiled, asset: createVectorAsset(this.meshes, compiled) });
      this.bossAssets = new Map(Object.entries(BOSS_VECTOR_ASSETS).map(([id, compiled]) => [id, { compiled, asset: createVectorAsset(this.meshes, compiled) }]));
      this.bossPlayer = null;
      this.bossPlayerAsset = null;
      this.assetsReady = false;
      this.prewarmStats = null;
      this.prewarmDurationMs = 0;
      this.bossTelegraph = null;
      this.ctx.isBloomWebGL = true;
      this.canvas.dataset.rendererBackend = "Budmori authored 2.5D vectors";
      this.resize();
      const boss = this.bossAssets.get("chestnut");
      if (!boss) throw new Error("Pinned chestnut boss vector asset is required");
      const prewarmAt = performance.now();
      this.bossPlayer = boss.asset.createPlayer({ clip: "idle", startedAtMs: 0 });
      this.bossPlayerAsset = boss;
      this.ctx.beginFrame({ width: this.canvas.width, height: this.canvas.height, clearColor: [0.9, 0.92, 0.87, 1] });
      this.bossPlayer.draw({ projection: this.ctx.vector.projection, matrix: [1e-3, 0, 0, 1e-3, 100, 100] });
      this.prewarmStats = this.ctx.endFrame();
      this.prewarmDurationMs = performance.now() - prewarmAt;
      this.assetsReady = true;
    }
    resize() {
      const r = this.canvas.getBoundingClientRect(), d = Math.min(globalThis.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(r.width * d);
      this.pixelRatio = d;
      this.canvas.height = Math.round(r.height * d);
      const aspect = r.width / r.height;
      this.aspect = aspect;
      this.scene = null;
      this.view = aspect > 1.2 ? [Math.max(12, 9 * aspect), 9] : [11.7, 11.7 / aspect];
      this.offset = [0, aspect < 0.8 ? 1.1 : -0.3];
      this.scale = this.canvas.width / (2 * this.view[0]);
    }
    project(x, y, z = 0) {
      return { x: (x + this.offset[0] + this.view[0]) * this.scale, y: (this.view[1] - (0.62 * y + 0.785 * z + this.offset[1])) * this.scale };
    }
    screenToWorld(clientX, clientY) {
      const r = this.canvas.getBoundingClientRect(), px = (clientX - r.left) * this.pixelRatio, py = (clientY - r.top) * this.pixelRatio;
      return { x: px / this.scale - this.offset[0] - this.view[0], y: (this.view[1] - py / this.scale - this.offset[1]) / 0.62 };
    }
    configure(scene) {
      if (this.scene === scene) return;
      this.scene = scene;
      const a = this.aspect;
      if (scene === "raid") this.view = a > 1.2 ? [Math.max(26.5, 17 * a), 17] : [26.5, 26.5 / a];
      else this.view = a > 1.2 ? [Math.max(12, 9 * a), 9] : [11.7, 11.7 / a];
      this.offset = [0, a < 0.8 ? 1.1 : -0.3];
      this.scale = this.canvas.width / (2 * this.view[0]);
    }
    ellipse(x, y, rx, ry, color2, angle = 0) {
      const c = this.ctx;
      c.fillStyle = color2;
      c.beginPath();
      c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), angle, 0, Math.PI * 2);
      c.fill();
    }
    groundEllipse(x, y, rx, ry, color2, z = 0) {
      const p = this.project(x, y, z);
      this.ellipse(p.x, p.y, rx * this.scale, ry * this.scale * 0.62, color2);
    }
    strokeGroundEllipse(x, y, rx, ry, color2, width = 0.08) {
      const c = this.ctx, p = this.project(x, y);
      c.strokeStyle = color2;
      c.lineWidth = width * this.scale;
      c.beginPath();
      c.ellipse(p.x, p.y, rx * this.scale, ry * this.scale * 0.62, 0, 0, Math.PI * 2);
      c.stroke();
    }
    ring(x, y, r, color2, width = 0.045, start2 = 0, end = Math.PI * 2) {
      const c = this.ctx, p = this.project(x, y);
      c.strokeStyle = color2;
      c.lineWidth = width * this.scale;
      c.beginPath();
      c.ellipse(p.x, p.y, r * this.scale, r * this.scale * 0.62, 0, -end, -start2);
      c.stroke();
    }
    line(a, b, width, color2) {
      const c = this.ctx;
      c.strokeStyle = color2;
      c.lineWidth = width * this.scale;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
    }
    pixelLine(a, b, width, color2) {
      const c = this.ctx;
      c.strokeStyle = color2;
      c.lineWidth = width;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
    }
    unitRingEffects(u, world) {
      const effects = [], a = u.ability, s = UNIT_ABILITY_PROFILES[u.species];
      if (u.buffed && u.hp > 0) effects.push({ radius: u.radius + 0.16, color: "#eacb72", width: 0.055, progress: 1 });
      if (a.phase === "windup" && s) effects.push({ radius: u.radius + 0.1, color: ATTACK_ACCENTS[u.species], width: 0.065, progress: Math.min(1, a.elapsed / s.windup) });
      const breeding = farmBreedingCooldown(u, world, CONFIG.breedCooldownSeconds);
      if (breeding && breeding.progress > 0) effects.push({ radius: u.radius + 0.085, color: "#8fac68", width: 0.035, progress: breeding.progress });
      return effects;
    }
    drawUnitRingLayer(u, effects, side) {
      for (const effect of effects) {
        const arc = splitArcProgress(effect.progress)[side];
        if (arc) this.ring(u.x, u.y, effect.radius, effect.color, effect.width, arc[0], arc[1]);
      }
    }
    drawSevenSegmentDigit(digit, x, y, size, color) {
      for (const [from, to] of sevenSegmentDigitLines(digit, x, y, size)) this.pixelLine(from, to, size * 0.7, color);
    }
    drawSleepZ(x, y, size, color) {
      const stroke = size * 0.32;
      this.pixelLine({ x, y: y - size }, { x: x + size, y: y - size }, stroke, color);
      this.pixelLine({ x: x + size, y: y - size }, { x, y: y + size }, stroke, color);
      this.pixelLine({ x, y: y + size }, { x: x + size, y: y + size }, stroke, color);
    }
    drawSleepBadge(u, sim, pose) {
      const seconds = farmSleepSeconds(u, sim.scene);
      if (!seconds) return;
      const d = this.pixelRatio, scale = 1.75 * d, w = 43 * d, h = 16 * d, x = pose.p.x - w / 2, y = pose.p.y - pose.r * 1.92 - h / 2;
      const c = this.ctx;
      c.fillStyle = "#35473df0";
      c.beginPath();
      c.roundRect(x, y, w, h, h / 2);
      c.fill();
      c.strokeStyle = "#f3edcf";
      c.lineWidth = d;
      c.beginPath();
      c.roundRect(x, y, w, h, h / 2);
      c.stroke();
      this.drawSleepZ(x + 5.8 * d, y + 8 * d, 2.3 * d, "#f3edcf");
      this.drawSleepZ(x + 10.4 * d, y + 5.2 * d, 1.75 * d, "#f3edcf");
      const label = String(Math.min(99, seconds)).padStart(2, "0");
      this.drawSevenSegmentDigit(Number(label[0]), x + 24 * d, y + 8 * d, scale, "#fff7db");
      this.drawSevenSegmentDigit(Number(label[1]), x + 34 * d, y + 8 * d, scale, "#fff7db");
    }
    drawVectorUnit(u, sim, p, r) {
      const record = this.vectorAssets.get(u.species);
      if (!record) throw new Error("Missing required troop vector asset for species " + u.species);
      let player = this.vectorPlayers.get(u.id);
      const metadata = record.compiled.metadata, motionName = unitMotion(u, sim), clip = metadata.clips[motionName] || metadata.clips.idle;
      const clipStartAtMs = this.displayTimeMs - motionElapsedMs(u, motionName, clip);
      if (!player) {
        player = record.asset.createPlayer({ clip: motionName, startedAtMs: clipStartAtMs });
        this.vectorPlayers.set(u.id, player);
      } else if (player.currentClip !== motionName) player.play(motionName, clipStartAtMs);
      const expression = unitExpression(u, sim);
      if (expression !== player.currentExpression) player.setExpression(expression);
      player.seek(this.displayTimeMs);
      const [, , width, height] = record.compiled.viewBox, scale = 2 * r / Math.max(width, height), centerY = p.y - r * 0.79;
      const matrix = [scale, 0, 0, scale, p.x - width * scale * 0.5, centerY - height * scale * 0.5];
      const outline = TIER_OUTLINE_COLORS[u.tier - 1];
      if (outline) {
        const border = 1.5 * this.pixelRatio, factor = 1 + border / Math.max(r, 1);
        const outlineMatrix = [scale * factor, 0, 0, scale * factor, p.x - width * scale * factor * 0.5, centerY - height * scale * factor * 0.5];
        player.draw({ projection: this.ctx.vector.projection, matrix: outlineMatrix, color: outline, forceColor: true });
      }
      player.draw({ projection: this.ctx.vector.projection, matrix });
      return true;
    }
    drawUnit(u, sim) {
      const dead = u.hp <= 0, walk = dead ? 0 : Math.min(1, Math.hypot(u.vx, u.vy)), bob = u.z === 0 ? Math.abs(Math.sin(sim.time * 9 + u.seed)) * 0.1 * walk : 0, p = this.project(u.x, u.y, u.z + bob);
      const r = Math.max(u.size * this.scale * 0.78, (sim.scene === "raid" ? 4.5 : 11) * this.pixelRatio);
      this.drawVectorUnit(u, sim, p, r);
      return { p, r };
    }
    drawFarmUnitActor(u, sim) {
      const effects = this.unitRingEffects(u, sim);
      this.drawUnitRingLayer(u, effects, "rear");
      const pose = this.drawUnit(u, sim);
      this.drawUnitRingLayer(u, effects, "front");
      this.drawSleepBadge(u, sim, pose);
    }
    bossPose(world) {
      const b = world.boss, k = this.feel?.boss(this.displayTimeMs) || { x: 0, y: 0, squash: 0 }, ground = this.project(b.x + k.x, b.y + k.y, 0), p = this.project(b.x + k.x, b.y + k.y, b.z || 0), r = this.scale * b.radius * 1.16;
      return { b, p, ground, r, k };
    }
    bossMotion(b, world) {
      const event = world.farmBossEvent;
      if (event?.phase === "celebrating" && event.outcome === "defeat") return "idle";
      if (b.hp <= 0) return "death";
      if (b.flash > 0.09 && b.phase === "chase") return "hit";
      if (b.phase === "strike-windup" || b.phase === "sweep-windup") return "windup";
      if (b.phase === "strike") return "strike";
      if (b.phase === "sweep") return "sweep";
      if (b.phase === "recover") return "recover";
      return b.phase === "chase" ? "walk" : "idle";
    }
    drawBoss(world) {
      const record = this.bossAssets.get("chestnut");
      if (!record || !this.bossPlayer || this.bossPlayerAsset !== record) throw new Error("Prewarmed chestnut boss player is required");
      const { b, p, r, k } = this.bossPose(world), event = world.farmBossEvent, metadata = record.compiled.metadata, name = this.bossMotion(b, world), clip = metadata.clips[name] || metadata.clips.idle;
      const timed = ["windup", "strike", "sweep", "recover", "hit", "death"].includes(name), clipStartAtMs = timed ? this.displayTimeMs - Math.min(clip.durationMs, Math.max(0, b.clock || 0) * 1e3) : name === "walk" ? this.displayTimeMs - Math.max(0, b.travel || 0) * 110 : this.displayTimeMs - (b.travel || 0) * 37 % clip.durationMs;
      if (this.bossPlayer.currentClip !== name) this.bossPlayer.transitionTo(name, clipStartAtMs, 70);
      const expression = b.hp <= 0 ? "dead" : event?.phase === "celebrating" && event.outcome === "defeat" ? "happy" : name === "windup" ? "focused" : name === "strike" || name === "sweep" ? "attack" : b.flash > 0.07 ? "hurt" : "neutral";
      if (this.bossPlayer.currentExpression !== expression) this.bossPlayer.setExpression(expression);
      this.bossPlayer.seek(this.displayTimeMs);
      const [, , width] = record.compiled.viewBox, s = 2 * r / 220, anchorX = 160, anchorY = 261, matrix = [s, 0, 0, s, p.x - anchorX * s, p.y - anchorY * s];
      const defeatBounce = event?.phase === "celebrating" && event.outcome === "defeat" ? Math.max(0, Math.sin(event.elapsed * Math.PI * 2 / CONFIG.farmBossEvent.celebrationSeconds * 2)) : 0;
      const fade = event?.phase === "fading" ? clamp2(1 - event.elapsed / CONFIG.farmBossEvent.fadeSeconds, 0, 1) : 1;
      this.bossPlayer.setBasePose("body", { y: -18 * defeatBounce, scaleX: (1 + (k.squash || 0)) * (1 - 0.04 * defeatBounce), scaleY: (1 - (k.squash || 0)) * (1 + 0.06 * defeatBounce), opacity: fade });
      const aiming = ["strike-windup", "sweep-windup", "strike", "sweep"].includes(b.phase);
      if (aiming) {
        const target = Math.atan2(-0.62 * Math.sin(b.angle), Math.cos(b.angle));
        this.bossPlayer.setBasePose("arm-right", { rotation: target - 0.504 });
        this.bossPlayer.setBasePose("arm-left", { rotation: target + Math.PI - 2.637 });
      } else {
        this.bossPlayer.setBasePose("arm-right", { rotation: 0 });
        this.bossPlayer.setBasePose("arm-left", { rotation: 0 });
      }
      this.bossPlayer.draw({ projection: this.ctx.vector.projection, matrix });
    }
    terrain(sim2) {
      const c = this.ctx, S = this.scale, raid = sim2.scene === "raid", rx = raid ? CONFIG.raid.radiusX : 9.5, ry = raid ? CONFIG.raid.radiusY : 6.8;
      this.groundEllipse(0, -0.2, rx + 1.3, ry + 1.1, "#bcc7a6");
      this.groundEllipse(0, 0, rx + 1.2, ry + 1.1, sim2.scene === "farm" ? "#d1d8b8" : "#cecfb3");
      this.groundEllipse(0, 0.15, rx + 0.3, ry + 0.3, sim2.scene === "farm" ? "#d9dfc2" : "#d7d8bf");
      for (let i = 0; i < 92; i++) {
        const a = i * 2.39996, rad = Math.sqrt((i + 0.5) / 92), x = Math.cos(a) * (rx + 0.3) * rad, y = Math.sin(a) * (ry + 0.3) * rad, p = this.project(x, y);
        this.ellipse(p.x, p.y, S * 0.026, S * 0.02, "#a7b58b80");
      }
      for (let i = 0; i < 24; i++) {
        const a = i * 2.39996, x = Math.cos(a) * (rx + 0.55), y = Math.sin(a) * (ry + 0.55), p = this.project(x, y);
        this.ellipse(p.x, p.y, 0.25 * S, 0.11 * S, "#94a577", a);
        this.ellipse(p.x + 0.1 * S, p.y - 0.09 * S, 0.19 * S, 0.075 * S, "#a8b78a", a + 0.7);
      }
      if (raid) {
        this.strokeGroundEllipse(0, 0, CONFIG.raid.radiusX - 0.5, CONFIG.raid.radiusY - 0.5, "#728e61a8", 0.075);
        if (this.dropTarget) {
          const t = this.dropTarget;
          this.groundEllipse(t.x, t.y, 0.32, 0.22, t.valid ? "#f3d58a55" : "#b56d6266");
          this.strokeGroundEllipse(t.x, t.y, 0.36, 0.25, t.valid ? "#f4e0a0" : "#b36359", 0.055);
        }
        const b = sim2.boss, event = sim2.farmBossEvent, area = raid || event?.phase === "fighting" ? bossAttackArea(b, CONFIG.maxUnitRadius) : null;
        this.bossTelegraph = area;
        if (area) {
          const heavy = area.kind === "sweep", color = heavy ? "#b46c45" : "#a35c48";
          if (heavy) {
            const fill = this.project(area.x, area.y);
            this.ellipse(fill.x, fill.y, area.outerRadius * this.scale, area.outerRadius * this.scale * 0.62, "#b46c4522");
            this.strokeGroundEllipse(area.x, area.y, area.outerRadius, area.outerRadius, color, area.active ? 0.075 : 0.12);
            const progress = area.active ? area.progress : 1;
            this.ring(area.x, area.y, area.outerRadius + 0.13, "#dfad65", 0.16, area.startAngle, area.startAngle + progress * Math.PI * 2);
          } else {
            const nx = Math.cos(area.angle), ny = Math.sin(area.angle), width = area.width, start2 = area.startRadius, end = area.endRadius;
            for (const side of [-1, 1]) this.line(this.project(area.x + nx * start2 - ny * width * side, area.y + ny * start2 + nx * width * side), this.project(area.x + nx * end - ny * width * side, area.y + ny * end + nx * width * side), 0.08, color);
            for (const distance of [start2, end]) this.ring(area.x + nx * distance, area.y + ny * distance, width, color, 0.06);
          }
        }
      }
    }
    render(sim2, feel = null, now = performance.now()) {
      this.feel = feel;
      this.displayTimeMs = now;
      this.configure(sim2.scene);
      const c = this.ctx;
      c.beginFrame({ width: this.canvas.width, height: this.canvas.height, clearColor: [0.9, 0.92, 0.87, 1] });
      this.terrain(sim2);
      for (const u of sim2.units) {
        const a = clamp2(0.22 / (1 + u.z * 0.3), 0.045, 0.22), shadow = u.size * 0.66 / (1 + u.z * 0.65);
        this.groundEllipse(u.x, u.y, shadow, shadow * 0.62, `rgba(42,61,35,${a})`);
        if (u.down > 0) this.ring(u.x, u.y, 0.45, "#aa9a60");
      }
      const farmBossVisible = sim2.scene === "farm" && sim2.farmBossEvent?.phase !== "idle";
      if (sim2.scene === "raid" || farmBossVisible) {
        this.groundEllipse(sim2.boss.x, sim2.boss.y, sim2.boss.radius * 1.05, sim2.boss.radius * 0.75, "#38472c33");
      }
      const actors = sim2.units.map((u) => ({ depth: 0.785 * u.y - 0.62 * u.z, id: u.id, vector: this.vectorAssets.has(u.species), draw: () => this.drawFarmUnitActor(u, sim2) }));
      if (sim2.scene === "raid" || farmBossVisible) actors.push({ depth: 0.785 * sim2.boss.y - 0.62 * (sim2.boss.z || 0), id: 0, vector: true, draw: () => this.drawBoss(sim2) });
      if (sim2.scene === "farm") for (const f of sim2.food) actors.push({ depth: 0.785 * f.y - 0.62 * f.z, id: -1, draw: () => {
        this.groundEllipse(f.x, f.y, 0.1, 0.07, "#55452433");
        if (f.phase === "flight") {
          const tail = this.project(f.x - f.vx * 0.045, f.y - f.vy * 0.045, Math.max(0, f.z - f.vz * 0.045) + 0.1), head = this.project(f.x, f.y, f.z + 0.1);
          this.line(tail, head, 0.055, "#e6bd7480");
        }
        const p = this.project(f.x, f.y, f.z + 0.1);
        this.ellipse(p.x, p.y, this.scale * 0.09, this.scale * 0.12, "#c78a43", 0.4);
        this.ellipse(p.x - 0.025 * this.scale, p.y - 0.08 * this.scale, this.scale * 0.036, this.scale * 0.05, "#e7bf72");
      } });
      if (sim2.scene === "raid" || farmBossVisible) for (const f of sim2.projectiles) actors.push({ depth: 0.785 * f.y - 0.62 * f.z, id: -f.id, draw: () => {
        const p = this.project(f.x, f.y, f.z), tail = Ballistics.sample(f.path, Math.max(0, (f.elapsed - 0.04) / f.path.duration));
        this.groundEllipse(f.x, f.y, 0.14, 0.1, "#55452433");
        if (f.isPopcorn && f.landed) {
          const fuse = Math.max(0, Math.min(1, f.fuseRemaining || 0));
          this.groundEllipse(f.x, f.y, 0.16, 0.12, f.exploded ? "#d86c3b55" : "#c78a4366");
          if (!f.exploded && f.popcornConfig?.radius > 0) this.ring(f.x, f.y, f.popcornConfig.radius, "rgba(190,111,52,.18)", 0.035);
          if (f.exploded) {
            const progress = Math.max(0, Math.min(1, (f.explosionLife || 0) / 0.5));
            this.ring(f.x, f.y, (f.popcornConfig?.radius || 0.3) * (0.25 + 0.75 * progress), `rgba(224,111,54,${0.68 * (1 - progress)})`, 0.12);
          } else this.ring(f.x, f.y, 0.2 + 0.2 * (1 - fuse), `rgba(238,181,83,${0.45 + 0.4 * (1 - fuse)})`, 0.045);
          const kernel = this.project(f.x, f.y, 0.12);
          this.ellipse(kernel.x, kernel.y, this.scale * 0.13, this.scale * 0.08, f.exploded ? "#e37f42" : "#d4a347", 0.2);
          this.ellipse(kernel.x - this.scale * 0.035, kernel.y - this.scale * 0.02, this.scale * 0.045, this.scale * 0.03, "#ffe0a0");
        } else if (f.projectileKind === "chestnut-spike") {
          const angle = Math.atan2(f.path.to.y - f.path.from.y, f.path.to.x - f.path.from.x), tip = { x: p.x + Math.cos(angle) * this.scale * 0.22, y: p.y - 0.62 * Math.sin(angle) * this.scale * 0.22 };
          this.line(this.project(tail.x, tail.y, tail.z), p, 0.055, "#778f4c88");
          this.line(p, tip, 0.105, "#79964e");
          this.ellipse(tip.x, tip.y, this.scale * 0.045, this.scale * 0.035, "#d5df9d", angle);
        } else {
          this.line(this.project(tail.x, tail.y, tail.z), p, 0.07, "#ba964a80");
          this.ellipse(p.x, p.y, this.scale * 0.14, this.scale * 0.2, "#cfa957", 0.3);
          this.ellipse(p.x - this.scale * 0.03, p.y - this.scale * 0.05, this.scale * 0.05, this.scale * 0.08, "#fff0ae");
        }
      } });
      actors.sort((a, b) => b.depth - a.depth || a.id - b.id);
      let vectorRun = false;
      for (const actor of actors) {
        if (actor.vector && !vectorRun) {
          c.flush();
          vectorRun = true;
        } else if (!actor.vector && vectorRun) {
          c.flush();
          vectorRun = false;
        }
        actor.draw();
      }
      if (vectorRun) c.flush();
      const liveUnitIds = new Set(sim2.units.map((unit) => unit.id));
      for (const [id, player] of this.vectorPlayers) if (!liveUnitIds.has(id)) {
        player.dispose();
        this.vectorPlayers.delete(id);
      }
      feel?.draw(this, this.displayTimeMs);
      for (const e of sim2.effects) {
        const q = e.life;
        if (e.kind === "feed") this.ring(e.x, e.y, 0.15 + q * 0.35, `rgba(166,121,59,${(1 - q) * 0.6})`, 0.035);
        else if (e.kind === "food-land") {
          const t = Math.min(1, q / 0.35);
          this.ring(e.x, e.y, 0.1 + t * 0.42, `rgba(194,145,62,${(1 - t) * 0.85})`, 0.055);
          for (let i = 0; i < 3 && t < 1; i++) {
            const a = i * Math.PI * 2 / 3, p = this.project(e.x + Math.cos(a) * t * 0.4, e.y + Math.sin(a) * t * 0.4, 0.08 + Math.sin(t * Math.PI) * 0.2);
            this.ellipse(p.x, p.y, this.scale * 0.045, this.scale * 0.035, `rgba(245,213,133,${1 - t})`);
          }
        } else if (e.kind === "land" || e.kind === "impact") this.ring(e.x, e.y, 0.1 + q * 0.8, `rgba(146,131,78,${(1 - q) * 0.65})`);
        else if (e.kind === "landing-shockwave") {
          const progress = clamp2(q / (e.duration || 0.55), 0, 1), radius = Math.max(0.08, e.radius) * (0.2 + 0.8 * progress);
          this.groundEllipse(e.x, e.y, radius, radius, `rgba(225,190,103,${0.12 * (1 - progress)})`);
          this.ring(e.x, e.y, radius, `rgba(234,194,104,${0.82 * (1 - progress)})`, 0.12 * (1 - progress) + 0.025);
          this.ring(e.x, e.y, Math.max(0.05, radius - 0.12), `rgba(250,225,158,${0.55 * (1 - progress)})`, 0.045);
        } else if (e.kind === "popcorn-explosion") {
          const progress = clamp2(q / (e.duration || 0.5), 0, 1), radius = Math.max(0.08, e.radius) * (0.18 + 0.82 * progress);
          this.groundEllipse(e.x, e.y, radius, radius, `rgba(235,143,63,${0.18 * (1 - progress)})`);
          this.ring(e.x, e.y, radius, `rgba(233,115,49,${0.88 * (1 - progress)})`, 0.1 * (1 - progress) + 0.025);
          this.ring(e.x, e.y, Math.max(0.05, radius * 0.72), `rgba(255,206,101,${0.7 * (1 - progress)})`, 0.055);
          for (let i = 0; i < 5; i++) {
            const a = i * Math.PI * 2 / 5 + progress * 0.8, d = radius * (0.55 + 0.3 * progress), p = this.project(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 0.08 * (1 - progress));
            this.ellipse(p.x, p.y, this.scale * 0.045 * (1 - progress), this.scale * 0.03 * (1 - progress), `rgba(255,216,119,${1 - progress})`, a);
          }
        } else if (e.kind === "popcorn-kernel-impact") {
          const progress = clamp2(q / (e.duration || 0.25), 0, 1);
          this.ring(e.x, e.y, 0.08 + progress * (e.radius || 0.1) * 1.6, `rgba(225,150,72,${0.65 * (1 - progress)})`, 0.045);
        } else if (e.kind === "drop-dust") {
          const t = Math.min(1, q / 0.28);
          this.ring(e.x, e.y, 0.12 + t * 0.4, `rgba(126,126,99,${(1 - t) * 0.42})`, 0.045);
          for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2 + t * 0.35, p = this.project(e.x + Math.cos(a) * t * 0.33, e.y + Math.sin(a) * t * 0.22, 0.025 + Math.sin(t * Math.PI) * 0.1);
            this.ellipse(p.x, p.y, this.scale * 0.045, this.scale * 0.03, `rgba(179,169,137,${1 - t})`);
          }
        } else if (e.kind === "birth" || e.kind === "merge") {
          const birth = e.kind === "birth", color = birth ? "#df87a4" : "#58b9bb";
          this.ring(e.x, e.y, birth ? 0.35 + q * 1.5 : 1.8 * (1 - q) + 0.15, color, 0.07);
          for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3 + q * (birth ? 0.3 : 2), spread = birth ? 0.4 + q * 1.3 : 1.8 * (1 - q);
            const p = this.project(e.x + Math.cos(a) * spread, e.y + Math.sin(a) * spread, e.z + q * 0.9);
            const r = this.scale * 0.14;
            c.fillStyle = color;
            if (birth) {
              this.ellipse(p.x - r * 0.44, p.y - r * 0.25, r * 0.6, r * 0.6, color);
              this.ellipse(p.x + r * 0.44, p.y - r * 0.25, r * 0.6, r * 0.6, color);
              c.beginPath();
              c.moveTo(p.x - r, p.y);
              c.lineTo(p.x, p.y + r);
              c.lineTo(p.x + r, p.y);
              c.closePath();
              c.fill();
            } else {
              c.beginPath();
              c.moveTo(p.x, p.y - r * 1.5);
              c.lineTo(p.x + r, p.y);
              c.lineTo(p.x, p.y + r * 1.5);
              c.lineTo(p.x - r, p.y);
              c.closePath();
              c.fill();
            }
          }
        } else if (e.kind === "eat") {
          for (let i = 0; i < 3; i++) {
            const a = i * Math.PI * 2 / 3, t = Math.min(1, q / 0.45), p = this.project(e.x + Math.cos(a) * t * 0.35, e.y + Math.sin(a) * t * 0.35, e.z + t * 0.6);
            this.ellipse(p.x, p.y, this.scale * 0.05, this.scale * 0.075, `rgba(255,235,160,${Math.max(0, 1 - q / 0.45)})`, a);
          }
        }
      }
      this.stats = c.endFrame();
    }
    dispose() {
      for (const player of this.vectorPlayers.values()) player.dispose();
      this.vectorPlayers.clear();
      for (const record of this.vectorAssets.values()) record.asset.dispose();
      this.vectorAssets.clear();
      this.bossPlayer?.dispose();
      this.bossPlayer = null;
      for (const record of this.bossAssets?.values() || []) record.asset.dispose();
      this.bossAssets?.clear();
      this.ctx.dispose();
      this.device.dispose();
    }
  };

  // src/farm-session.js
  init_farm_model();
  init_unit_stats();
  init_farm_state();
  init_version();
  var { binaryCodec: codec } = globalThis.BloomGamekitDeterministic;
  var { PresentationRuntime, RenderObject } = globalThis.BloomGamekitInterpolation;
  var R = RenderObject;
  var PRESENTATION_STEP_MS = 50;
  var UnitRender = class extends RenderObject {
    static renderSchema = Object.freeze({
      x: R.POSITION_X,
      y: R.POSITION_Y,
      z: R.POSITION_Z,
      angle: R.ANGLE,
      vx: R.LINEAR,
      vy: R.LINEAR,
      hp: R.LINEAR,
      down: R.LINEAR,
      stun: R.LINEAR,
      flash: R.LINEAR,
      bounce: R.LINEAR,
      "ability.phase": R.STATE_KEY,
      "ability.elapsed": R.LINEAR,
      cooldown: R.LINEAR,
      cooldownDuration: R.STEP,
      meals: R.STEP,
      species: R.STEP,
      tier: R.STEP,
      seed: R.STEP,
      size: R.LINEAR,
      radius: R.LINEAR,
      maxHp: R.STEP,
      fed: R.STEP,
      ownerId: R.STATE_KEY,
      farmId: R.STEP,
      dropLanded: R.STEP,
      buffed: R.STEP,
      isBattleOnlySummon: R.STEP
    });
    constructor(u, world) {
      super();
      Object.assign(this, {
        x: u.x,
        y: u.y,
        z: u.z,
        angle: u.angle,
        vx: u.vx,
        vy: u.vy,
        hp: u.hp,
        down: u.down,
        stun: u.stun,
        flash: u.flash,
        bounce: u.bounce,
        ability: { phase: u.ability.phase, elapsed: u.ability.elapsed },
        cooldown: u.cooldown,
        cooldownDuration: u.cooldownDuration,
        meals: u.meals,
        species: u.species,
        tier: u.tier,
        seed: u.seed,
        size: u.size,
        radius: u.radius,
        maxHp: resolveUnitStats(u).maxHp,
        fed: u.fed,
        ownerId: u.ownerId,
        farmId: u.farmId,
        dropLanded: u.dropLanded,
        buffed: world.time < (world.raidRoster(u.ownerId)?.buffUntil || 0),
        isBattleOnlySummon: u.isBattleOnlySummon
      });
    }
  };
  var BossRender = class extends RenderObject {
    static renderSchema = Object.freeze({
      x: R.POSITION_X,
      y: R.POSITION_Y,
      z: R.POSITION_Z,
      angle: R.ANGLE,
      startAngle: R.ANGLE,
      phase: R.STATE_KEY,
      clock: R.LINEAR,
      travel: R.LINEAR,
      hp: R.LINEAR,
      maxHp: R.STEP,
      radius: R.STEP,
      height: R.STEP,
      flash: R.LINEAR
    });
    constructor(b) {
      super();
      Object.assign(this, { x: b.x, y: b.y, z: b.z, angle: b.angle, startAngle: b.startAngle, phase: b.phase, clock: b.clock, travel: b.travel || 0, hp: b.hp, maxHp: b.maxHp, radius: b.radius, height: b.height, flash: b.flash });
    }
  };
  var FoodRender = class extends RenderObject {
    static renderSchema = Object.freeze({
      x: R.POSITION_X,
      y: R.POSITION_Y,
      z: R.POSITION_Z,
      vx: R.LINEAR,
      vy: R.LINEAR,
      vz: R.LINEAR,
      phase: R.STATE_KEY,
      tx: R.STEP,
      ty: R.STEP,
      seed: R.STEP
    });
    constructor(f) {
      super();
      Object.assign(this, { x: f.x, y: f.y, z: f.z, vx: f.vx, vy: f.vy, vz: f.vz, phase: f.phase, tx: f.tx ?? 0, ty: f.ty ?? 0, seed: f.seed ?? 0 });
    }
  };
  var ProjectileRender = class extends RenderObject {
    static renderSchema = Object.freeze({
      x: R.POSITION_X,
      y: R.POSITION_Y,
      z: R.POSITION_Z,
      elapsed: R.LINEAR,
      owner: R.STEP,
      species: R.STEP,
      tier: R.STEP,
      radius: R.STEP,
      height: R.STEP,
      projectileKind: R.STATE_KEY,
      isPopcorn: R.STEP,
      landed: R.STEP,
      exploded: R.STEP,
      fuseRemaining: R.LINEAR,
      explosionLife: R.LINEAR,
      shotIndex: R.STEP,
      fanIndex: R.STEP,
      "popcornConfig.radius": R.STEP,
      "path.from.x": R.STEP,
      "path.from.y": R.STEP,
      "path.from.z": R.STEP,
      "path.to.x": R.STEP,
      "path.to.y": R.STEP,
      "path.to.z": R.STEP,
      "path.height": R.STEP,
      "path.duration": R.STEP
    });
    constructor(p) {
      super();
      Object.assign(this, {
        x: p.x,
        y: p.y,
        z: p.z,
        elapsed: p.elapsed,
        owner: p.owner,
        species: p.species,
        tier: p.tier,
        radius: p.radius,
        height: p.height,
        projectileKind: p.projectileKind || "",
        isPopcorn: !!p.isPopcorn,
        landed: !!p.landed,
        exploded: !!p.exploded,
        fuseRemaining: p.fuseRemaining || 0,
        explosionLife: p.explosionLife || 0,
        shotIndex: p.shotIndex || 0,
        fanIndex: p.fanIndex || 0,
        popcornConfig: { radius: p.popcornConfig?.radius || 0 },
        path: { from: { ...p.path.from }, to: { ...p.path.to }, height: p.path.height, duration: p.path.duration }
      });
    }
  };
  var EffectRender = class extends RenderObject {
    static renderSchema = Object.freeze({ x: R.POSITION_X, y: R.POSITION_Y, z: R.POSITION_Z, life: R.LINEAR, kind: R.STATE_KEY, radius: R.STEP, duration: R.STEP, owner: R.STEP });
    constructor(e) {
      super();
      Object.assign(this, { x: e.x, y: e.y, z: e.z, life: e.life, kind: e.kind, radius: e.radius || 0, duration: e.duration || 0, owner: e.owner || 0 });
    }
  };
  var GameClockRender = class extends RenderObject {
    static renderSchema = Object.freeze({ gameTimeMs: R.LINEAR });
    constructor(gameTimeMs) {
      super();
      this.gameTimeMs = gameTimeMs;
    }
  };
  var FarmSession = class {
    constructor(world = new Garden(), { room: room2 = null, onError = console.error, onEvent = () => {
    } } = {}) {
      this.world = world;
      this.tick = 0;
      this.presentationTick = 0;
      this.epoch = 0;
      this.players = [...room2?.players || ["solo"]];
      this.speed = 1;
      this._paused = false;
      this.pauseStartedAt = null;
      this.pausedDurationMs = 0;
      this.pending = [];
      this.room = room2;
      this.localPlayerId = room2?.localPlayerId || "solo";
      this.localDeploySequence = world.raidRoster(this.localPlayerId)?.lastDeploySequence || 0;
      this.presentationRevision = 0;
      this.presentationSequence = 0;
      this.pendingPresentationMode = null;
      this.presentationRuntime = new PresentationRuntime({ stepMs: PRESENTATION_STEP_MS, delayMs: PRESENTATION_STEP_MS, snapDistance: 12 });
      this.presentationIds = /* @__PURE__ */ new WeakMap();
      this.nextPresentationId = 1;
      this.previousCaptureTimeMs = null;
      this.latestCaptureTimeMs = 0;
      this.presentationOriginWallMs = null;
      this.lastFrameClockMs = null;
      this.lastCaptureClockMs = 0;
      this.pulseTimestamp = null;
      const adapter = { save: () => codec.encode(this.capture()), load: (bytes) => this.load(codec.decode(bytes)), validateSnapshot: (bytes, context = {}) => {
        try {
          this.validate(codec.decode(bytes), context);
          return true;
        } catch {
          return false;
        }
      }, applyMembership: (change) => {
        this.epoch = change.epoch;
        this.players = [...change.players];
        if (this.world.scene === "raid") this.world.setRaidPlayers(this.players);
        this.pendingPresentationMode = "reset";
      }, step: (ctx) => this.step(ctx) };
      const emitEvent = (event) => {
        if (event.type === "rollback" || event.type === "reconciled") this.pendingPresentationMode = "rollback";
        else if (event.type === "membership-committed") this.pendingPresentationMode = "reset";
        else if (event.type === "recovered") {
          this.pendingPresentationMode = "load";
          this.capturePresentation("load");
        }
        onEvent(event);
      };
      this.session = globalThis.BloomGamekitRollback.createRoomSession({ adapter, players: room2?.players || ["solo"], localPlayerId: this.localPlayerId, sessionId: room2?.sessionId || "budmori-solo", simulationVersion: "budmori-farm-" + PRODUCT_VERSION, seed: world.seed, inputSize: 1, mode: room2 ? "online" : "local", room: room2 || void 0, profile: { ...globalThis.BloomGamekitRollback.profiles.action, mode: "lockstep", tickRate: 20, baseInputDelayTicks: room2 ? 2 : 0, minInputDelayTicks: room2 ? 2 : 0, maxInputDelayTicks: room2 ? 2 : 0, adaptiveInputDelay: false, pacingPolicy: "none", checksumInterval: 20, stateHistorySize: 32, maxSnapshotBytes: 8388608 }, membership: { maxPlayers: CONFIG.maxRaidPlayers, transitionTimeoutMs: 3e4, reconnectGraceMs: 1e4, maxCatchupSteps: 4 }, onEvent: emitEvent });
      this.loop = globalThis.BloomGamekitSimloop.createLoop({
        session: this.session,
        getInput: () => ({ input: new Uint8Array(1), commands: (this.session.ready ? this.pending.splice(0, 32) : []).map((payload) => ({ payload })), predict: false }),
        canAdvance: () => true,
        canObserveInput: () => !this.session.closed && !this.session.failure,
        onError,
        onBacklogDrop: () => {
          this.pendingPresentationMode = "reset";
        },
        onAdvance: (result) => {
          if (this.session.resimulating) return;
          if (this.pendingPresentationMode) this.capturePresentation(this.pendingPresentationMode);
          else if (result.status === "advanced" && !this.paused) this.capturePresentation("continuous");
        }
      });
      this.capturePresentation("reset");
    }
    capture() {
      return { tick: this.tick, epoch: this.epoch, players: this.players, speed: this.speed, world: snapshot(this.world) };
    }
    validate(s, ctx = {}) {
      if (!Number.isSafeInteger(s.tick) || s.tick < 0 || !Number.isSafeInteger(s.epoch) || s.epoch < 0 || !Array.isArray(s.players) || s.players.length > CONFIG.maxRaidPlayers || s.players.some((p) => typeof p !== "string") || ![1, 4].includes(s.speed) || ctx.tick !== void 0 && s.tick !== ctx.tick || ctx.membershipEpoch !== void 0 && s.epoch !== ctx.membershipEpoch) throw Error("Invalid farm snapshot");
      return restore(s.world);
    }
    load(s) {
      this.world = this.validate(s);
      this.tick = s.tick;
      this.epoch = s.epoch;
      this.players = [...s.players];
      this.speed = s.speed;
      this.presentationIds = /* @__PURE__ */ new WeakMap();
      this.nextPresentationId = 1;
      bindPresentationClock(this.world, null);
      this.pendingPresentationMode = "load";
    }
    queue(type, args = {}) {
      if (this.session.closed || this.pending.length >= 64) return false;
      this.pending.push(codec.encode({ type, ...args }));
      return true;
    }
    deployNext(x, y) {
      const w = this.world, roster = w.scene === "raid" && w.raidRoster(this.localPlayerId);
      if (!roster || !Number.isFinite(x) || !Number.isFinite(y)) return false;
      this.localDeploySequence = Math.max(this.localDeploySequence, roster.lastDeploySequence);
      if (this.localDeploySequence - roster.lastDeploySequence >= w.raidRemaining(this.localPlayerId)) return false;
      const sequence = this.localDeploySequence + 1;
      if (!this.queue("deploy", { sequence, x, y })) return false;
      this.localDeploySequence = sequence;
      return true;
    }
    step({ tick, inputs }) {
      for (const f of inputs) {
        if (!this.players.includes(f.playerId)) continue;
        for (const c of f.commands) {
          try {
            this.command(codec.decode(c.payload), f.playerId);
          } catch {
          }
        }
      }
      if (this.paused && !this.room) {
        this.tick = tick + 1;
        return;
      }
      const w = this.world, startTime = w.time, speed = this.speed, loopStart = this.loop?.simulationTimeMs, startClock = this.adjustedWallTime(Number.isFinite(loopStart) ? loopStart : this.pulseTimestamp ?? globalThis.performance.now()), presentationStartMs = Math.max(0, startClock - (this.presentationOriginWallMs ?? startClock));
      bindPresentationClock(w, (time) => (presentationStartMs + (time - startTime) * 1e3 / speed) / 1e3);
      if (w.scene === "farm") w.advanceAutoTaps(0.05);
      for (let i = 0; i < 6 * speed; i++) w.step(CONFIG.fixedStep);
      this.tick = tick + 1;
      if (!this.session.resimulating) this.presentationTick++;
    }
    command(c, ownerId = this.localPlayerId) {
      const w = this.world;
      switch (c.type) {
        case "feed":
          if (w.scene === "farm") w.tapFood("manual");
          break;
        case "mode":
          if (w.scene === "farm" && ["breed", "merge"].includes(c.value)) {
            if (c.value !== "merge") w.mergeTask = null;
            w.mode = c.value;
          }
          break;
        case "speed":
          if ([1, 4].includes(c.value)) this.speed = c.value;
          break;
        case "invest":
          if (typeof c.id === "string" && w.scene === "farm") w.progress.invest(c.id);
          break;
        case "ability-invest":
          if (w.scene === "farm" && typeof c.abilityId === "string" && typeof c.nodeId === "string" && c.abilityId.length < 64 && c.nodeId.length < 32) w.investAbilityNode(c.abilityId, c.nodeId);
          break;
        case "ability-reset":
          if (w.scene === "farm") w.resetAbilityTree();
          break;
        case "register-roster":
          if (Array.isArray(c.entries)) w.registerRaidRoster(ownerId, c.entries, c.abilitySnapshot, c.settlement || null);
          break;
        case "deploy":
          if (Number.isSafeInteger(c.sequence) && Number.isFinite(c.x) && Number.isFinite(c.y)) w.deployNextRaidUnit(ownerId, c.sequence, c.x, c.y);
          break;
        case "buff":
          w.useRaidBuff(ownerId);
          break;
      }
    }
    presentationIdentity(kind, source) {
      let id = this.presentationIds.get(source);
      if (!id) {
        id = this.nextPresentationId++;
        this.presentationIds.set(source, id);
      }
      return kind + ":" + id;
    }
    get paused() {
      return this._paused;
    }
    set paused(value) {
      value = !!value;
      if (value === this._paused) return;
      const now = globalThis.performance.now();
      if (value) this.pauseStartedAt = now;
      else if (this.pauseStartedAt !== null) {
        this.pausedDurationMs += now - this.pauseStartedAt;
        this.pauseStartedAt = null;
      }
      this._paused = value;
    }
    adjustedWallTime(now) {
      return now - this.pausedDurationMs - (this._paused && !this.room && this.pauseStartedAt !== null ? now - this.pauseStartedAt : 0);
    }
    capturePresentation(mode = "continuous") {
      if (mode !== "continuous" && this.presentationSequence > 0) this.presentationRevision++;
      const world = this.world, receiptNowMs = this.captureClock(), timeMs = this.presentationOriginWallMs === null ? 0 : Math.max(this.latestCaptureTimeMs, receiptNowMs - this.presentationOriginWallMs), entities = [];
      if (this.presentationOriginWallMs === null) this.presentationOriginWallMs = receiptNowMs;
      for (const u of world.units) entities.push({ id: "unit:" + u.id, generation: 0, source: new UnitRender(u, world) });
      entities.push({ id: "boss", generation: 0, source: new BossRender(world.boss) });
      for (const f of world.food) entities.push({ id: this.presentationIdentity("food", f), generation: 0, source: new FoodRender(f) });
      for (const p of world.projectiles) entities.push({ id: "projectile:" + p.id, generation: 0, source: new ProjectileRender(p) });
      for (const e of world.effects) entities.push({ id: this.presentationIdentity("effect", e), generation: 0, source: new EffectRender(e) });
      entities.push({ id: "clock", generation: 0, source: new GameClockRender(world.time * 1e3) });
      const captureMode = mode === "continuous" ? "continuous" : mode === "load" ? "load" : mode === "rollback" ? "rollback" : "reset";
      if (captureMode === "continuous") this.previousCaptureTimeMs = this.latestCaptureTimeMs;
      else this.previousCaptureTimeMs = null;
      const accepted = this.presentationRuntime.capture({ revision: this.presentationRevision, sequence: ++this.presentationSequence, timeMs, mode: captureMode, entities }, receiptNowMs);
      if (accepted) {
        this.latestCaptureTimeMs = timeMs;
        this.lastCaptureClockMs = receiptNowMs;
        this.pendingPresentationMode = null;
      }
      return accepted;
    }
    captureClock() {
      const now = this.pulseTimestamp ?? globalThis.performance.now(), boundary = this.loop?.simulationTimeMs;
      const candidate = this.adjustedWallTime(Number.isFinite(boundary) ? boundary : now);
      const receipt = Math.max(candidate, this.lastCaptureClockMs, this.lastFrameClockMs ?? 0);
      this.lastCaptureClockMs = receipt;
      return receipt;
    }
    frameClock(now) {
      const clock = Math.max(this.lastFrameClockMs ?? 0, this.lastCaptureClockMs, this.adjustedWallTime(now));
      this.lastFrameClockMs = clock;
      return clock;
    }
    presentation(now) {
      const frame2 = this.presentationRuntime.frame(this.frameClock(now)), world = this.world, view = Object.create(world), units = [], food = [], projectiles = [], effects = [];
      frame2.forEach((model, id) => {
        if (id.startsWith("unit:")) units.push(Object.assign({ id: Number(id.slice(5)) }, model));
        else if (id.startsWith("food:")) food.push(model);
        else if (id.startsWith("projectile:")) projectiles.push(Object.assign({ id: Number(id.slice(11)) }, model));
        else if (id.startsWith("effect:")) effects.push(model);
      });
      view.time = (frame2.sample("clock", 0)?.gameTimeMs ?? world.time * 1e3) / 1e3;
      view.units = units;
      view.boss = frame2.sample("boss", 0) || new BossRender(world.boss);
      view.food = food;
      view.projectiles = projectiles;
      view.effects = effects;
      view.displayTimeMs = frame2.timeMs;
      view.presentationRevision = this.presentationRevision;
      const previous = this.previousCaptureTimeMs, latest = this.latestCaptureTimeMs, span = latest - previous;
      view.presentationDiagnostics = {
        timeMs: frame2.timeMs,
        latestSnapshotTimeMs: latest,
        previousSnapshotTimeMs: previous,
        intervalMs: span,
        sampleAgeMs: latest - frame2.timeMs,
        renderFraction: previous === null || span <= 0 ? null : Math.max(0, Math.min(1, (frame2.timeMs - previous) / span)),
        captureSequence: this.presentationSequence,
        revision: this.presentationRevision
      };
      this.latestPresentationDiagnostics = view.presentationDiagnostics;
      return view;
    }
    pulse(now) {
      this.pulseTimestamp = now;
      this.loop.pulse(now, { render: false });
    }
    dispose() {
      this.loop.stop();
      this.session.close();
      this.pending = [];
    }
  };

  // src/farm-app.js
  init_farm_storage();
  init_farm_state();
  init_version();

  // src/food-feel.js
  var $ = (id) => document.getElementById(id);
  var FoodFeel = class {
    constructor(requestFeed2) {
      this.button = $("feed");
      this.pips = [...this.button.querySelectorAll(".tap-pip")];
      this.completeUntil = 0;
      this.pulseUntil = 0;
      this.animations = /* @__PURE__ */ new Map();
      this.voices = /* @__PURE__ */ new Set();
      this.lastSound = {};
      this.frameId = 0;
      this.soundFrame = {};
      this.muted = false;
      this.peakVoices = 0;
      this.counts = { manual: 0, auto: 0, complete: 0, land: 0, eat: 0 };
      this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      try {
        this.muted = localStorage.getItem("budmori.food.muted") === "true";
      } catch {
      }
      this.updateSoundButton();
      $("sound").onclick = () => {
        this.muted = !this.muted;
        this.unlock();
        this.silence();
        try {
          localStorage.setItem("budmori.food.muted", String(this.muted));
        } catch {
        }
        this.updateSoundButton();
      };
      const pointers = /* @__PURE__ */ new Set();
      this.button.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        this.unlock();
        pointers.add(e.pointerId);
        this.button.setPointerCapture(e.pointerId);
        this.animate(this.button, [{ transform: "scale(1)" }, { transform: this.reduced ? "scale(1)" : "scale(1.035,.94)" }], 75);
      });
      this.button.addEventListener("pointerup", (e) => {
        if (!pointers.delete(e.pointerId)) return;
        e.preventDefault();
        const r = this.button.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) requestFeed2();
        if (this.button.hasPointerCapture(e.pointerId)) this.button.releasePointerCapture(e.pointerId);
      });
      const cancel = (e) => pointers.delete(e.pointerId);
      this.button.addEventListener("pointercancel", cancel);
      this.button.addEventListener("lostpointercapture", cancel);
      window.addEventListener("blur", () => {
        pointers.clear();
        this.silence();
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          pointers.clear();
          this.silence();
        }
      });
      window.addEventListener("pagehide", () => {
        this.silence();
        for (const a of this.animations.values()) a.cancel();
        this.animations.clear();
        this.audio?.close().catch(() => {
        });
      });
    }
    updateSoundButton() {
      const b = $("sound");
      b.textContent = this.muted ? "♪̸" : "♪";
      b.setAttribute("aria-pressed", !this.muted);
      b.setAttribute("aria-label", this.muted ? "소리 켜기" : "소리 끄기");
    }
    unlock() {
      if (this.muted) return;
      try {
        if (!this.audio) {
          this.audio = new AudioContext();
          this.master = this.audio.createGain();
          this.master.gain.value = 0.22;
          this.master.connect(this.audio.destination);
        }
        if (this.audio.state === "suspended") this.audio.resume().catch(() => {
        });
      } catch {
      }
    }
    silence() {
      for (const v of this.voices) {
        try {
          v.o.stop();
        } catch {
        }
      }
    }
    sound(kind, step = 0) {
      if (this.muted || !this.audio || this.audio.state !== "running" || document.hidden) return;
      const now = this.audio.currentTime, gap = kind === "tap" ? 0.025 : kind === "complete" ? 0.055 : 0.09;
      if (this.soundFrame[kind] === this.frameId || now - (this.lastSound[kind] ?? -99) < gap || this.voices.size >= 4) return;
      this.soundFrame[kind] = this.frameId;
      this.lastSound[kind] = now;
      const defs = { tap: [340 + step * 65, 420 + step * 65, 0.055, 0.14], complete: [520, 1040, 0.12, 0.2], land: [240, 150, 0.065, 0.1], eat: [740, 990, 0.09, 0.09], strike: [180, 80, 0.075, 0.16], heavy: [95, 42, 0.16, 0.22], launch: [290, 145, 0.06, 0.07] }, [hz, end, duration, gain] = defs[kind];
      const o = this.audio.createOscillator(), g = this.audio.createGain(), v = { o, g };
      o.type = kind === "land" ? "sine" : "triangle";
      o.frequency.setValueAtTime(hz, now);
      o.frequency.exponentialRampToValueAtTime(end, now + duration);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gain, now + 4e-3);
      g.gain.exponentialRampToValueAtTime(1e-4, now + duration);
      o.connect(g);
      g.connect(this.master);
      this.voices.add(v);
      this.peakVoices = Math.max(this.peakVoices, this.voices.size);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
        this.voices.delete(v);
      };
      o.start(now);
      o.stop(now + duration + 0.01);
    }
    animate(el, frames, duration) {
      this.animations.get(el)?.cancel();
      const a = el.animate(frames, { duration, easing: "ease-out" });
      this.animations.set(el, a);
      a.onfinish = () => {
        if (this.animations.get(el) === a) this.animations.delete(el);
      };
    }
    tap(source, complete, remainder) {
      this.counts[source]++;
      const now = performance.now(), manual = source === "manual";
      if (complete) {
        this.counts.complete++;
        this.completeUntil = now + (manual ? 190 : 100);
      }
      if (manual || now > this.pulseUntil) {
        this.pulseUntil = now + (manual ? 150 : 55);
        this.button.dataset.impact = complete && manual ? "complete" : manual ? "manual" : "auto";
        this.animate(this.button, [{ transform: this.reduced || !manual ? "scale(1)" : complete ? "translateY(3px) scale(1.06,.90)" : "scale(1.025,.95)", filter: manual ? "brightness(1.16)" : "brightness(1.035)" }, { transform: "translateY(0) scale(1)", filter: "brightness(1)" }], manual ? complete ? 210 : 125 : 70);
      }
      const pip = this.pips[complete ? 4 : remainder - 1];
      this.animate(pip, [{ transform: this.reduced ? "scale(1)" : "scaleY(1.8)", background: "#fffbea" }, { transform: "scaleY(1)", background: complete ? "#fff1b9" : "#fff1b9" }], manual ? 160 : 70);
      for (let i = 0; i < 5; i++) this.pips[i].classList.toggle("filled", complete || i < remainder);
      if (manual) this.sound(complete ? "complete" : "tap", remainder);
    }
    event(kind) {
      if (kind === "food-land" || kind === "eat") {
        const key = kind === "eat" ? "eat" : "land";
        this.counts[key]++;
        this.sound(key);
      }
    }
    frame(now) {
      this.frameId++;
      if (now > this.pulseUntil) this.button.dataset.impact = "";
    }
  };

  // src/combat-feel.js
  init_farm_model();
  var CombatFeel = class {
    constructor(audio) {
      this.audio = audio;
      this.world = null;
      this.revision = null;
      this.sequence = 0;
      this.effects = [];
      this.poses = /* @__PURE__ */ new Map();
      this.bossHit = null;
      this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.counts = { hits: 0, landings: 0 };
    }
    observe(world, displayTimeMs, revision = 0) {
      if (this.world !== world || this.revision !== revision) {
        this.world = world;
        this.revision = revision;
        this.sequence = world.eventSequence;
        this.effects = [];
        this.poses.clear();
        this.bossHit = null;
        return;
      }
      for (const e of world.notices) {
        if (e.sequence <= this.sequence) continue;
        if (["boss-hit", "unit-hit", "unit-land", "attack-launch", "boss-launch"].includes(e.kind)) {
          const at = presentationEventTimeMs(e), event = { ...e, at, heard: false };
          this.effects.push(event);
          if (this.effects.length > 48) this.effects.shift();
          if (e.kind === "boss-hit") {
            this.counts.hits++;
            this.bossHit = event;
          }
          if (e.kind === "unit-hit") {
            this.poses.set(e.unit, { at, until: at + 180, strength: e.strength });
            this.counts.hits++;
          }
          if (e.kind === "unit-land") this.counts.landings++;
        }
      }
      this.sequence = world.eventSequence;
      this.effects = this.effects.filter((e) => displayTimeMs - e.at < 430);
      for (const [id, p] of this.poses) if (displayTimeMs > p.until) this.poses.delete(id);
    }
    squash(id, displayTimeMs) {
      const p = this.poses.get(id);
      return !p || this.reduced ? 0 : Math.sin(Math.min(1, (displayTimeMs - p.at) / 180) * Math.PI) * Math.min(0.2, p.strength * 0.12);
    }
    boss(displayTimeMs) {
      const e = this.bossHit;
      if (!e || this.reduced) return { x: 0, y: 0, squash: 0 };
      const q = Math.max(0, Math.min(1, (displayTimeMs - e.at) / 160)), k = Math.sin(q * Math.PI) * (1 - q);
      return { x: -e.nx * k * 0.1, y: -e.ny * k * 0.1, squash: k * 0.035 };
    }
    sound(event) {
      if (event.kind === "boss-hit") this.audio.sound("strike", event.species || 0);
      else if (event.kind === "unit-hit") this.audio.sound(event.attackKind === "sweep" ? "heavy" : "strike");
      else if (event.kind === "unit-land" && event.strength > 0.2) this.audio.sound("land");
      else if (event.kind === "boss-launch") this.audio.sound("launch");
    }
    draw(r, displayTimeMs) {
      for (const e of this.effects) {
        const age = displayTimeMs - e.at;
        if (age < 0 || age > 430) continue;
        if (!e.heard) {
          e.heard = true;
          this.sound(e);
        }
        const q = age / 430, heavy = e.attackKind === "sweep", impact = e.kind === "unit-hit" || e.kind === "boss-hit", landing = e.kind === "unit-land";
        if (e.kind === "attack-launch") {
          const t2 = Math.min(1, q / 0.35), p = r.project(e.x, e.y, e.z + 0.2);
          if (t2 < 1) r.ellipse(p.x, p.y, r.scale * 0.12 * (1 - t2), r.scale * 0.2 * (1 - t2), "#ffe7a6");
          continue;
        }
        if (!impact && !landing) continue;
        const t = Math.min(1, q / (landing ? 0.9 : 0.7)), alpha = 1 - t;
        if (alpha <= 0) continue;
        const size = landing ? 0.7 : heavy ? 1.15 : 0.6, color = landing ? "157,142,107" : e.kind === "boss-hit" ? "245,199,102" : "231,147,83";
        r.ring(e.x, e.y, 0.15 + t * size, `rgba(${color},${alpha * 0.8})`, landing ? 0.045 : 0.075);
        const center = r.project(e.x, e.y, e.z || 0.1), n = landing ? 5 : 6;
        for (let i = 0; i < n; i++) {
          const a = i * Math.PI * 2 / n + e.sequence % 11 * 0.19, d = (0.12 + t * size) * (landing ? 1.2 : 1), p = r.project(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, (e.z || 0.1) + (landing ? 0.12 : Math.sin(t * Math.PI) * 0.5));
          if (landing) r.ellipse(p.x, p.y, r.scale * 0.09 * (1 - t), r.scale * 0.045 * (1 - t), `rgba(${color},${alpha * 0.65})`, a);
          else {
            const inner = { x: center.x + (p.x - center.x) * 0.55, y: center.y + (p.y - center.y) * 0.55 };
            r.line(inner, p, 0.055, `rgba(255,242,190,${alpha})`);
          }
        }
        if (impact && t < 0.28) r.ellipse(center.x, center.y, r.scale * 0.18 * (1 - t), r.scale * 0.12 * (1 - t), "#fff4d6");
      }
    }
  };

  // src/raid-roster.js
  function raidRosterEntries(units, limit = 100) {
    if (!Array.isArray(units) || !Number.isSafeInteger(limit) || limit < 0) return [];
    return units.filter((unit) => unit?.hp > 0 && unit.down <= 0 && !unit.isBattleOnlySummon && unit.countsTowardPermanentRoster !== false && unit.eligibleForRaidDeployment !== false).slice(0, limit).map((unit) => [unit.id, unit.species, unit.tier]);
  }

  // src/farm-app.js
  init_ability_state();
  init_ability_tree();
  init_raid_settlement();
  init_boss_rewards();
  var $2 = (id) => document.getElementById(id);
  var storage = new FarmStorage();
  var networkTimer = null;
  var observedWorld = null;
  var imported = null;
  var importedLegacy = false;
  var active = null;
  var home = true;
  var attempt = null;
  var room = null;
  var solo = null;
  var personalGarden = null;
  var noticeSequence = 0;
  var lastSave = 0;
  var treePause = false;
  var abilityPause = false;
  var dropPointer = null;
  var dropTimer = null;
  var renderer = new Diorama($2("world"));
  var measuredFrames = [];
  var lastFrameTimestamp = null;
  var frameCount = 0;
  function measureFrame(now) {
    if (lastFrameTimestamp !== null) {
      measuredFrames.push(now - lastFrameTimestamp);
      if (measuredFrames.length > 240) measuredFrames.shift();
    }
    lastFrameTimestamp = now;
    frameCount++;
  }
  function frameRate() {
    const sorted = [...measuredFrames].sort((a, b) => a - b), sum = measuredFrames.reduce((a, b) => a + b, 0);
    return { frames: frameCount, fps: sum ? measuredFrames.length * 1e3 / sum : 0, frametimeMs: { p50: sorted[Math.floor((sorted.length - 1) * 0.5)] || 0, p95: sorted[Math.floor((sorted.length - 1) * 0.95)] || 0, max: Math.max(0, ...measuredFrames) } };
  }
  var fail2 = (error) => {
    $2("error").hidden = false;
    $2("error").textContent = "정원을 진행하지 못했어요. " + error.message;
    console.error(error);
    if (active && !room) active.paused = true;
  };
  var foodFeel = new FoodFeel(requestFeed);
  var combatFeel = new CombatFeel(foodFeel);
  function requestFeed() {
    if (!home && active && !active.paused) {
      foodFeel.unlock();
      active.queue("feed");
    }
  }
  function install(world, options = {}) {
    clearInterval(networkTimer);
    active?.dispose();
    active = new FarmSession(world, { ...options, onError: fail2 });
    noticeSequence = world.eventSequence;
    observedWorld = world;
    if (options.room) networkTimer = setInterval(() => active.pulse(performance.now()), 50);
    return active;
  }
  install(new Garden());
  active.paused = true;
  function persist() {
    if (!personalGarden) return false;
    const ok = storage.save(personalGarden);
    $2("saveNotice").textContent = ok ? "" : storage.error;
    $2("treeStorage").hidden = ok;
    return ok;
  }
  function refreshStart() {
    if (room || attempt) {
      $2("newConfirm").hidden = true;
      $2("importConfirm").hidden = true;
      imported = null;
    }
    const hasReservedRaid = storage.world?.activeRaidRunSequence !== null && storage.world?.activeRaidRunSequence !== void 0, liveRaid = active?.world?.scene === "raid" || !!room, staleRaid = hasReservedRaid && !liveRaid;
    $2("continueGame").disabled = !storage.world || staleRaid;
    $2("staleRaidNotice").hidden = !staleRaid || !!attempt;
    $2("onlineGame").disabled = hasReservedRaid;
    $2("continueLegacyGame").disabled = !!room || !!attempt || !storage.legacyCompatible;
    $2("legacySaveNotice").hidden = !storage.legacyCompatible;
    $2("exportSave").disabled = !(storage.raw || storage.legacyRaw);
    $2("saveNotice").textContent = storage.error;
    $2("newGame").hidden = !!room;
    $2("continueGame").hidden = !!room;
    $2("onlineGame").hidden = !!room || !!attempt;
    $2("cancelOnline").hidden = !attempt;
    $2("leaveOnline").hidden = !room;
    $2("importSave").disabled = !!room || !!attempt;
    $2("newGame").disabled = !!attempt;
  }
  function setHome(value, push = true) {
    if (value) persist();
    home = value;
    document.body.dataset.home = String(value);
    $2("startScreen").hidden = !value;
    if (!room) active.paused = value;
    $2("treePanel").hidden = true;
    $2("helpPanel").hidden = true;
    $2("abilityPanel").hidden = true;
    if (push) history.pushState(null, "", value ? "#/" : active.world.scene === "raid" ? "#/raid" : "#/farm");
    refreshStart();
    if (value) $2("continueGame").focus();
  }
  function start(world, push = true) {
    foodFeel.unlock();
    personalGarden = world;
    install(world);
    setHome(false, push);
  }
  function reservePersonalRaidRun(sessionId = null) {
    let reserved;
    try {
      reserved = reserveRaidRun(snapshot(personalGarden), { sessionId });
    } catch (error) {
      fail2(error);
      return null;
    }
    const candidate = restore(reserved.farm);
    if (!storage.save(candidate)) {
      fail2(Error(storage.error || "농장 원정 예약을 저장하지 못했어요."));
      return null;
    }
    personalGarden = storage.world;
    return reserved;
  }
  function localSettlementRoster(world, ownerId, run) {
    const current = world.raidRosters?.find((roster) => roster.ownerId === ownerId);
    if (current) {
      if (current.settlementRunSequence !== run.runSequence || current.settlementSessionId !== run.sessionId || current.settlementEncounterId !== run.runSequence) throw Error("레이드 명단의 정산 예약이 개인 농장 저장과 일치하지 않아요.");
      return world;
    }
    const entries = raidRosterEntries(personalGarden.units, CONFIG.maxRaidPlayerUnits).map(([farmId, species, tier]) => ({ farmId, species, tier, deployed: false }));
    const view = snapshot(world);
    view.raidExpectedPlayers = [.../* @__PURE__ */ new Set([...view.raidExpectedPlayers, ownerId])];
    view.raidRosters.push({ ownerId, troops: entries, abilitySnapshot: createAbilityRuntimeSnapshot(personalGarden.playerProgression), settlementSessionId: run.sessionId, settlementRunSequence: run.runSequence, settlementEncounterId: run.runSequence, lastDeploySequence: 0, buffUntil: 0, buffReadyAt: 0 });
    return view;
  }
  function persistRaidSettlement(raidWorld, ownerId) {
    const farmRun = { sessionId: personalGarden.activeRaidSessionId, runSequence: personalGarden.activeRaidRunSequence };
    if (!farmRun.sessionId || !farmRun.runSequence) return false;
    const outcome = ["victory", "defeat"].includes(raidWorld.encounter?.outcome) ? raidWorld.encounter.outcome : "aborted";
    const prepare = (base) => settleRaidOwnerFarm(snapshot(base), { ownerId, sessionId: farmRun.sessionId, encounterId: farmRun.runSequence, runSequence: farmRun.runSequence, outcome, raidWorld, completedAtMs: Date.now(), settleVictory: ({ farm, receiptKey, deploymentMultiplier }) => {
      const garden = restore(farm), resolved = settleBossKill(garden, { encounterId: farmRun.runSequence, source: "raid", receiptKey, acquisitionMultiplier: deploymentMultiplier, species: 3, tier: 1, x: raidWorld.boss.x, y: raidWorld.boss.y });
      const reward = resolved.receipt;
      return { farm: snapshot(garden), summary: { acquisition: { status: reward.status, chance: reward.chance, roll: reward.roll, unitId: reward.unitId, receiptKey: reward.receiptKey }, xp: { status: reward.xpStatus, amount: reward.xpAmount, levelsGained: reward.levelsGained, pointsAwarded: reward.pointsAwarded, receiptKey: reward.xpReceiptKey } } };
    } });
    let settled = prepare(personalGarden), candidate = restore(settled.farm);
    if (!storage.save(candidate)) {
      if (!storage.refresh()) throw Error(storage.error || "최신 농장 저장을 다시 읽지 못했어요.");
      settled = prepare(storage.world);
      candidate = restore(settled.farm);
      if (!storage.save(candidate)) throw Error(storage.error || "전투 결과 저장에 실패했어요.");
    }
    personalGarden = storage.world;
    return settled;
  }
  function beginRaid(push = true) {
    if (room || !personalGarden || active.world.scene === "raid" || personalGarden.activeRaidRunSequence !== null || personalGarden.farmBossEvent?.phase !== "idle" || !raidRosterEntries(personalGarden.units, 1).length) return;
    if (!persist()) return;
    const reserved = reservePersonalRaidRun();
    if (!reserved) return;
    renderer.dropTarget = null;
    const battle = Garden.createRaidBattle(personalGarden.seed + Math.floor(performance.now()) >>> 0, ["solo"]);
    install(battle);
    active.queue("register-roster", { entries: raidRosterEntries(personalGarden.units, CONFIG.maxRaidPlayerUnits), abilitySnapshot: createAbilityRuntimeSnapshot(personalGarden.playerProgression), settlement: { sessionId: reserved.sessionId, runSequence: reserved.runSequence, encounterId: reserved.runSequence } });
    setHome(false, push);
  }
  async function returnToFarm(push = true) {
    stopDrop();
    if (!personalGarden) return;
    const raidWorld = active?.world?.scene === "raid" ? snapshot(active.world) : null;
    if (raidWorld && personalGarden.activeRaidRunSequence !== null) {
      const ownerId = active.localPlayerId, run = { sessionId: personalGarden.activeRaidSessionId, runSequence: personalGarden.activeRaidRunSequence };
      try {
        persistRaidSettlement(localSettlementRoster(raidWorld, ownerId, run), ownerId);
      } catch (error) {
        fail2(error);
        return false;
      }
    }
    if (room) {
      const leaving = room;
      try {
        await active.session.leave();
      } catch {
      }
      active.dispose();
      leaving.close();
      room = null;
      solo = null;
    }
    renderer.dropTarget = null;
    install(personalGarden);
    setHome(false, push);
    return true;
  }
  $2("continueGame").onclick = () => {
    if (room || active?.world?.scene === "raid") {
      setHome(false);
      return;
    }
    if (storage.world && storage.world.activeRaidRunSequence === null) start(restore(snapshot(storage.world)));
  };
  $2("abortRaidRun").onclick = () => {
    if (room || active?.world?.scene === "raid") return;
    const world = storage.world;
    if (!world || world.activeRaidRunSequence === null) return refreshStart();
    try {
      const result = abortReservedRaidRun(snapshot(world), { completedAtMs: Date.now() });
      if (!result.applied) return refreshStart();
      if (!storage.save(restore(result.farm))) {
        $2("saveNotice").textContent = storage.error;
        return;
      }
      personalGarden = storage.world;
      refreshStart();
      $2("saveNotice").textContent = "이전 원정을 보상 없이 종료했어요. 병력과 성장 포인트는 그대로예요.";
    } catch (error) {
      fail2(error);
    }
  };
  $2("newGame").onclick = () => {
    if ((storage.raw || storage.legacyRaw) && !$2("newConfirm").hidden) return;
    if (storage.raw || storage.legacyRaw) {
      $2("newConfirmText").textContent = storage.raw ? "현재 0.5 정원을 새 정원으로 바꿀까요? 필요한 저장은 먼저 내보내 주세요." : "새 0.5 정원을 시작할까요? 기존 원본 저장은 별도 키에 그대로 남아요.";
      $2("newConfirm").hidden = false;
      return;
    }
    const world = new Garden();
    storage.replace(world);
    start(world);
  };
  $2("confirmNew").onclick = () => {
    if (room || attempt) return;
    const world = new Garden();
    if (storage.replace(world)) {
      $2("newConfirm").hidden = true;
      start(world);
    } else refreshStart();
  };
  $2("cancelNew").onclick = () => {
    $2("newConfirm").hidden = true;
  };
  $2("home").onclick = () => setHome(true);
  $2("exportSave").onclick = () => {
    const raw = storage.raw || storage.legacyRaw;
    if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" })), a = document.createElement("a");
    a.href = url;
    a.download = "budmori-save-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  };
  $2("importSave").onclick = () => $2("saveFile").click();
  $2("continueLegacyGame").onclick = async () => {
    if (room || attempt || !storage.legacyRaw) return;
    try {
      const { parseSave: parseSave2 } = await Promise.resolve().then(() => (init_farm_storage(), farm_storage_exports));
      parseSave2(storage.legacyRaw);
      imported = storage.legacyRaw;
      importedLegacy = true;
      $2("importConfirmText").textContent = "0.4 원본 저장은 그대로 두고, 새 0.5 저장 키에 복사해 이어갈까요?";
      $2("confirmImport").textContent = "원본을 보존하고 이어가기";
      $2("importConfirm").hidden = false;
    } catch (e) {
      $2("saveNotice").textContent = e.message;
    }
  };
  $2("saveFile").onchange = async () => {
    const file = $2("saveFile").files[0];
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw Error("저장 파일이 너무 큽니다.");
      const text = await file.text();
      const { parseSave: parseSave2 } = await Promise.resolve().then(() => (init_farm_storage(), farm_storage_exports));
      parseSave2(text);
      imported = text;
      importedLegacy = false;
      $2("importConfirmText").textContent = "선택한 파일로 개인 저장을 바꿀까요?";
      $2("confirmImport").textContent = "이 저장 불러오기";
      $2("importConfirm").hidden = false;
    } catch (e) {
      $2("saveNotice").textContent = e.message;
    } finally {
      $2("saveFile").value = "";
    }
  };
  $2("cancelImport").onclick = () => {
    imported = null;
    importedLegacy = false;
    $2("importConfirm").hidden = true;
  };
  $2("confirmImport").onclick = () => {
    if (room || attempt) return;
    try {
      if (imported) {
        const legacy = importedLegacy, world = storage.import(imported);
        if (legacy) start(world);
      }
      imported = null;
      importedLegacy = false;
      $2("importConfirm").hidden = true;
      refreshStart();
    } catch (e) {
      $2("saveNotice").textContent = e.message;
    }
  };
  $2("onlineGame").onclick = async () => {
    if (attempt || room) return;
    personalGarden = restore(snapshot(storage.world || personalGarden || active.world));
    if (personalGarden.activeRaidRunSequence !== null) {
      $2("sessionNotice").textContent = "이전 원정 기록을 먼저 종료하고 다시 연결해 주세요.";
      return;
    }
    if (!persist()) return;
    solo = restore(snapshot(personalGarden));
    const controller = attempt = new AbortController();
    refreshStart();
    $2("sessionNotice").textContent = "함께할 정원을 찾고 있어요…";
    try {
      const next = await BloomGamekitTransport.createNostrPublicRoom({ namespace: "budmori-public-v1", simulationVersion: "budmori-farm-" + PRODUCT_VERSION, maxPlayers: CONFIG.maxRaidPlayers, discoveryMs: 1500, totalTimeoutMs: 6e4, peerTimeoutMs: 2e4, signal: controller.signal, onStatus: (e) => {
        if (attempt === controller) $2("sessionNotice").textContent = { discovering: "함께할 정원을 찾고 있어요…", hosting: "새 정원을 열고 있어요…", joining: "정원에 연결하고 있어요…" }[e.type] || "함께할 정원을 준비하고 있어요…";
      } });
      if (controller.signal.aborted) {
        next.close();
        return;
      }
      const reserved = reservePersonalRaidRun(next.sessionId);
      if (!reserved) {
        next.close();
        return;
      }
      room = next;
      const battle = Garden.createRaidBattle(BloomGamekitDeterministic.hashBytes(new TextEncoder().encode(next.sessionId)), next.players);
      install(battle, { room: next });
      active.queue("register-roster", { entries: raidRosterEntries(personalGarden.units), abilitySnapshot: createAbilityRuntimeSnapshot(personalGarden.playerProgression), settlement: { sessionId: reserved.sessionId, runSequence: reserved.runSequence, encounterId: reserved.runSequence } });
      $2("sessionNotice").textContent = "함께 가꾸는 정원 · 개인 저장은 보존됩니다.";
      setHome(false);
    } catch (e) {
      if (!controller.signal.aborted) $2("sessionNotice").textContent = "연결하지 못했어요. " + e.message;
    } finally {
      if (attempt === controller) attempt = null;
      refreshStart();
    }
  };
  $2("cancelOnline").onclick = () => {
    attempt?.abort();
    attempt = null;
    $2("sessionNotice").textContent = "연결을 취소했어요.";
    refreshStart();
  };
  $2("leaveOnline").onclick = async () => {
    if (!room) return;
    $2("leaveOnline").disabled = true;
    try {
      if (await returnToFarm(false)) setHome(true);
    } finally {
      $2("leaveOnline").disabled = false;
    }
  };
  $2("farm").onclick = () => returnToFarm();
  $2("raid").onclick = () => beginRaid();
  $2("return").onclick = () => returnToFarm();
  for (const value of ["breed", "merge"]) $2(value).onclick = () => active.queue("mode", { value });
  $2("feed").addEventListener("keydown", (e) => {
    if (e.repeat && ["Enter", " "].includes(e.key)) e.preventDefault();
  });
  $2("feed").onclick = (e) => {
    if (e.detail === 0 && !e.pointerType) requestFeed();
  };
  $2("speed").onclick = () => active.queue("speed", { value: active.speed === 1 ? 4 : 1 });
  $2("pause").onclick = () => {
    if (room) return;
    active.paused = !active.paused;
  };
  function drawTree() {
    const p = (personalGarden || active.world).progress, labels = { eat: "식사", birth: "번식", merge: "합체", hit: "보스 타격" };
    $2("treeNodes").innerHTML = TREE_NODES.filter((n) => !n.hidden).map((n) => {
      const l = p.levels[n.id], goal = n.goal * (l + 1), parent = TREE_NODES.find((v) => v.id === n.parent);
      return `<article class="tree-node" data-ready="${p.ready(n)}"><div class="node-heading"><span class="node-icon" aria-hidden="true">${n.icon}</span><h3>${n.name}</h3><span>${l}/4</span></div><p>${n.description}</p><div class="node-values">${n.value(l)}${l < 4 ? ` <span>→ ${n.value(l + 1)}</span>` : ""}</div><progress max="${goal}" value="${Math.min(goal, p.records[n.metric])}"></progress><small>${l === 4 ? "완료" : `${labels[n.metric]} ${p.records[n.metric]}/${goal}${parent && !p.levels[parent.id] ? ` · ${parent.name} 1 필요` : ""}`}</small><button data-invest="${n.id}" ${p.ready(n) ? "" : "disabled"}>${l === 4 ? "✓" : "+"}<span class="sr-only">${n.name} 투자</span></button></article>`;
    }).join("");
  }
  function drawAbilityTree() {
    const w = personalGarden || active.world, inCombat = w.running || w.farmBossEvent?.phase !== "idle";
    const selectedSpecies = Number($2("abilityPanel").dataset.selectedSpecies || 0);
    $2("abilityPoints").textContent = String(w.playerProgression.availablePoints);
    for (const button of $2("abilitySpeciesTabs").querySelectorAll("[data-ability-species]")) button.setAttribute("aria-pressed", String(Number(button.dataset.abilitySpecies) === selectedSpecies));
    $2("abilityNodes").innerHTML = renderAbilityTreeMarkup(w.playerProgression, { highestSpeciesTier: w.highestSpeciesTiers(), location: w.scene, inCombat, selectedSpecies });
  }
  function panel(id, open, push = true) {
    if (open) {
      if ($2("treePanel").hidden && $2("helpPanel").hidden && $2("abilityPanel").hidden) treePause = active.paused;
      if (!room) active.paused = true;
      $2("treePanel").hidden = id !== "treePanel";
      $2("helpPanel").hidden = id !== "helpPanel";
      $2("abilityPanel").hidden = true;
      if (id === "treePanel") drawTree();
      $2(id).querySelector("button").focus();
    } else {
      $2(id).hidden = true;
      if (!room && $2("treePanel").hidden && $2("helpPanel").hidden && $2("abilityPanel").hidden) active.paused = treePause;
      $2(id === "treePanel" ? "tree" : "help").focus();
    }
    $2("tree").setAttribute("aria-expanded", !$2("treePanel").hidden);
    $2("help").setAttribute("aria-expanded", !$2("helpPanel").hidden);
    $2("abilities").setAttribute("aria-expanded", !$2("abilityPanel").hidden);
    if (push) history.pushState(null, "", open ? id === "treePanel" ? "#/growth" : "#/help" : active.world.scene === "raid" ? "#/raid" : "#/farm");
  }
  function showAbilityPanel(open, push = true) {
    if (open) {
      if (active.world.scene === "raid") return;
      if ($2("treePanel").hidden && $2("helpPanel").hidden && $2("abilityPanel").hidden) abilityPause = active.paused;
      if (!room) active.paused = true;
      $2("treePanel").hidden = true;
      $2("helpPanel").hidden = true;
      $2("abilityPanel").hidden = false;
      drawAbilityTree();
      $2("abilityClose").focus();
    } else {
      $2("abilityPanel").hidden = true;
      if (!room) active.paused = abilityPause;
      $2("abilities").focus();
    }
    $2("abilities").setAttribute("aria-expanded", !$2("abilityPanel").hidden);
    $2("tree").setAttribute("aria-expanded", !$2("treePanel").hidden);
    $2("help").setAttribute("aria-expanded", !$2("helpPanel").hidden);
    if (push) history.pushState(null, "", open ? "#/abilities" : active.world.scene === "raid" ? "#/raid" : "#/farm");
  }
  $2("tree").onclick = () => panel("treePanel", true);
  $2("treeClose").onclick = () => panel("treePanel", false);
  $2("help").onclick = () => panel("helpPanel", $2("helpPanel").hidden);
  $2("closeHelp").onclick = () => panel("helpPanel", false);
  $2("treeNodes").onclick = (e) => {
    const b = e.target.closest("[data-invest]");
    if (b) {
      active.queue("invest", { id: b.dataset.invest });
      setTimeout(drawTree, 180);
    }
  };
  $2("abilities").onclick = () => showAbilityPanel(true);
  $2("abilityClose").onclick = () => showAbilityPanel(false);
  $2("abilitySpeciesTabs").onclick = (e) => {
    const button = e.target.closest("[data-ability-species]");
    if (!button) return;
    $2("abilityPanel").dataset.selectedSpecies = button.dataset.abilitySpecies;
    drawAbilityTree();
  };
  $2("abilityNodes").onclick = (e) => {
    const button = e.target.closest("button[data-ability-action],button[data-ability-node]");
    if (!button || button.getAttribute("aria-disabled") === "true") return;
    if (button.dataset.abilityAction === "reset") active.queue("ability-reset");
    else if (button.dataset.abilityNode) {
      const [abilityId, kind, level] = button.dataset.abilityNode.split(":");
      const nodeId = kind === "root" ? "root" : `${kind}-${level}`;
      active.queue("ability-invest", { abilityId, nodeId });
    }
    setTimeout(drawAbilityTree, 180);
  };
  $2("treePanel").onkeydown = (e) => {
    if (e.key === "Tab") {
      const f = [...$2("treePanel").querySelectorAll("button:not(:disabled)")], i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0 || !e.shiftKey && i === f.length - 1) {
        e.preventDefault();
        f[e.shiftKey ? f.length - 1 : 0].focus();
      }
    }
  };
  $2("abilityPanel").onkeydown = (e) => {
    if (e.key === "Tab") {
      const f = [...$2("abilityPanel").querySelectorAll('button:not([aria-disabled="true"])')], i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0 || !e.shiftKey && i === f.length - 1) {
        e.preventDefault();
        f[e.shiftKey ? f.length - 1 : 0].focus();
      }
    }
  };
  var canvas = $2("world");
  function deploymentHud() {
    const w = active.world, raid = w.scene === "raid", roster = w.raidRoster(active.localPlayerId), registered = w.raidRosters.length, expected = w.raidExpectedPlayers.length, remaining = roster ? w.raidRemaining(active.localPlayerId) : personalGarden?.units.length || 0, queued = roster ? Math.max(0, active.localDeploySequence - roster.lastDeploySequence) : 0;
    $2("raidRemaining").textContent = room && active.players.length < 2 ? "동료가 들어오기를 기다리는 중…" : !roster || registered < expected ? `병력 명단 동기화 중 · ${registered}/${expected}명` : `남은 병력 ${Math.max(0, remaining - queued)} · 전장을 탭해 투입 · 누르고 있으면 100ms마다 한 마리`;
    const own = w.raidRoster(active.localPlayerId), cooldown = own ? Math.max(0, own.buffReadyAt - w.time) : 0;
    $2("buff").disabled = !raid || !w.running || !own || cooldown > 0;
    $2("buff").textContent = cooldown > 0 ? `강화 ${cooldown.toFixed(1)}초` : "팀 강화";
  }
  function deployAt(p) {
    if (home || active.world.scene !== "raid" || room && active.players.length < 2 || !active.world.raidExpectedPlayers.every((id) => active.world.raidRoster(id))) return false;
    const valid = ArenaGeometry.inside(p, "raid", 0.5);
    renderer.dropTarget = { ...p, valid };
    return valid && active.deployNext(Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100);
  }
  function updateDropPointer(e) {
    if (!dropPointer || e.pointerId !== dropPointer.id) return;
    const p = renderer.screenToWorld(e.clientX, e.clientY);
    dropPointer.x = Math.round(p.x * 100) / 100;
    dropPointer.y = Math.round(p.y * 100) / 100;
    renderer.dropTarget = { x: dropPointer.x, y: dropPointer.y, valid: ArenaGeometry.inside(p, "raid", 0.5) };
  }
  function stopDrop(e) {
    if (e && dropPointer && e.pointerId !== dropPointer.id) return;
    const id = dropPointer?.id;
    dropPointer = null;
    if (dropTimer !== null) clearInterval(dropTimer);
    dropTimer = null;
    if (id !== void 0 && canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
  }
  canvas.addEventListener("pointerdown", (e) => {
    foodFeel.unlock();
    if (home || active.world.scene !== "raid" || dropPointer) return;
    const p = renderer.screenToWorld(e.clientX, e.clientY);
    if (!ArenaGeometry.inside(p, "raid", 0.5)) {
      renderer.dropTarget = { ...p, valid: false };
      return;
    }
    canvas.setPointerCapture?.(e.pointerId);
    dropPointer = { id: e.pointerId, x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 };
    deployAt(dropPointer);
    dropTimer = setInterval(() => {
      if (dropPointer) deployAt(dropPointer);
    }, 100);
    e.preventDefault();
  });
  canvas.addEventListener("pointermove", updateDropPointer);
  canvas.addEventListener("pointerup", (e) => stopDrop(e));
  canvas.addEventListener("pointercancel", (e) => stopDrop(e));
  canvas.addEventListener("lostpointercapture", (e) => stopDrop(e));
  window.addEventListener("pointerup", (e) => stopDrop(e), true);
  window.addEventListener("pointercancel", (e) => stopDrop(e), true);
  $2("buff").onclick = () => active.queue("buff");
  window.addEventListener("blur", () => {
    stopDrop();
    persist();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopDrop();
      persist();
      active.loop.resetTiming();
    }
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$2("treePanel").hidden) panel("treePanel", false);
      else if (!$2("helpPanel").hidden) panel("helpPanel", false);
      else if (!$2("abilityPanel").hidden) showAbilityPanel(false);
    }
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) location.reload();
  });
  window.addEventListener("resize", () => renderer.resize());
  window.addEventListener("pagehide", () => {
    persist();
    clearInterval(networkTimer);
    attempt?.abort();
    room?.close();
    active.dispose();
    renderer.dispose();
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    persist();
    fail2(Error("그래픽 연결이 끊겼어요. 새로고침해 다시 이어가 주세요."));
  });
  function route() {
    const r = location.hash;
    if (r === "#/" || !r) {
      setHome(true, false);
      return;
    }
    if (!room && storage.world?.activeRaidRunSequence !== null && storage.world?.activeRaidRunSequence !== void 0) {
      setHome(true, false);
      history.replaceState(null, "", "#/");
      return;
    }
    if (home) {
      if (!room && storage.error && !storage.world) {
        setHome(true, false);
        history.replaceState(null, "", "#/");
        return;
      }
      if (room) setHome(false, false);
      else if (storage.world) start(restore(snapshot(storage.world)), false);
      else start(new Garden(), false);
    }
    if (r === "#/help" || r === "#/growth") panel(r === "#/help" ? "helpPanel" : "treePanel", true, false);
    else if (r === "#/abilities") showAbilityPanel(true, false);
    else {
      if (!$2("treePanel").hidden) panel("treePanel", false, false);
      if (!$2("helpPanel").hidden) panel("helpPanel", false, false);
      if (!$2("abilityPanel").hidden) {
        $2("abilityPanel").hidden = true;
        if (!room) active.paused = abilityPause;
      }
      $2("abilities").setAttribute("aria-expanded", "false");
      if (r === "#/raid") {
        if (!room && personalGarden?.farmBossEvent?.phase !== "idle") {
          history.replaceState(null, "", "#/farm");
        } else if (!room) beginRaid(false);
      } else if (r === "#/farm" && active.world.scene === "raid" && !room) returnToFarm(false);
    }
  }
  window.addEventListener("popstate", route);
  function sync(display, now) {
    const w = active.world, raid = display.scene === "raid", farmEvent = display.farmBossEvent, farmEventActive = !raid && farmEvent?.phase !== "idle", battleHud = raid || farmEventActive, readyTroops = personalGarden ? raidRosterEntries(personalGarden.units, CONFIG.maxFarmCap).length : 0, rewardWorld = personalGarden || w, pendingRewardCount = rewardWorld.bossRewardReceipts.filter((reward) => reward.status === "pending").length;
    for (const [id, value] of [["farm", !raid], ["raid", raid], ["breed", w.mode === "breed"], ["merge", w.mode === "merge"]]) $2(id).setAttribute("aria-pressed", value);
    $2("farmControls").hidden = raid || farmEventActive || home;
    $2("raidControls").hidden = !raid || home;
    $2("bossbar").hidden = !battleHud || home;
    $2("roles").hidden = !battleHud || home;
    $2("raid").disabled = farmEventActive;
    $2("count").textContent = raid ? w.raidRoster(active.localPlayerId)?.troops.length ?? personalGarden?.units.length ?? 0 : display.units.filter((unit) => !unit.isBattleOnlySummon).length;
    $2("capacity").textContent = personalGarden?.capacity ?? CONFIG.cap;
    $2("starter").textContent = raid ? `${w.units.length} deployed in raid` : pendingRewardCount ? "밤톨 보상 대기 · 공간이 생기면 합류해요" : readyTroops === 0 ? "모두 휴식 중 · 회복까지 기다려 주세요" : w.units.filter((unit) => !unit.isBattleOnlySummon).length >= w.capacity ? "정원이 가득 찼어요" : "번식으로 식구를 늘려요";
    const army = display.units.reduce((sum, u) => ({ current: sum.current + Math.max(0, Math.min(u.maxHp, u.hp)), max: sum.max + u.maxHp, living: sum.living + (u.hp > 0 ? 1 : 0), total: sum.total + 1 }), { current: 0, max: 0, living: 0, total: 0 });
    $2("allyHealth").style.width = (army.max ? army.current / army.max * 100 : 0) + "%";
    $2("allyHealthText").textContent = Math.ceil(army.current) + " / " + Math.ceil(army.max) + " HP · " + army.living + "/" + army.total + " 생존";
    const boss = display.boss, battleOutcome = raid ? w.encounter.outcome : farmEvent?.outcome;
    $2("bossHealthText").textContent = Math.ceil(boss.hp) + " / " + boss.maxHp + " HP";
    $2("bossHealthNote").textContent = farmEventActive ? "보스 능력치 고정" : "전사자 포함 최대 HP · 증원 시 함께 증가";
    for (const [id, value, max] of [["allyHealth", army.current, army.max], ["bossHealth", boss.hp, boss.maxHp]]) {
      const el = $2(id);
      el.setAttribute("aria-valuenow", value);
      el.setAttribute("aria-valuemax", max);
    }
    $2("bossHealth").style.width = boss.maxHp ? boss.hp / boss.maxHp * 100 + "%" : "0%";
    $2("battleOutcome").textContent = raid ? battleOutcome === "victory" ? "승리 · 모두 정원으로 돌아갈 수 있어요" : battleOutcome === "defeat" ? "휴식이 필요해요 · 정원에서 다시 준비해요" : "" : battleOutcome === "victory" ? farmEvent.rewardStatus === "granted" ? "보스가 쓰러졌어요 · 밤톨이 합류했어요" : farmEvent.rewardStatus === "pending" ? "밤톨 획득 대기 · 공간이 생기면 합류해요" : "보스가 쓰러졌어요" : battleOutcome === "defeat" ? "동료들이 다시 일어날 때까지 기다려요" : "";
    $2("battleOutcome").hidden = home || !battleHud || battleOutcome === "fighting" || battleOutcome === "idle";
    $2("speed").textContent = active.speed + "×";
    $2("pause").disabled = !!room;
    $2("tree").disabled = raid || farmEventActive;
    $2("abilities").disabled = raid || !personalGarden;
    $2("raid").disabled = farmEventActive || !raid && readyTroops === 0;
    $2("pause").textContent = active.paused ? "▶" : "Ⅱ";
    $2("feed").setAttribute("aria-label", `먹이 탭, 5회 중 ${w.foodTaps.remainder}회`);
    $2("feed").dataset.state = w.food.length >= 140 ? "full" : "ready";
    $2("feed").dataset.produced = now < foodFeel.completeUntil;
    for (let i = 0; i < 5; i++) foodFeel.pips[i].classList.toggle("filled", now < foodFeel.completeUntil || i < w.foodTaps.remainder);
    if (observedWorld !== w) {
      observedWorld = w;
      noticeSequence = w.eventSequence;
    }
    for (const e of w.notices) if (e.sequence > noticeSequence) {
      if (e.kind === "food-tap") foodFeel.tap(e.source, e.completed, e.remainder);
      else foodFeel.event(e.kind);
    }
    noticeSequence = w.eventSequence;
    foodFeel.frame(now);
    deploymentHud();
    $2("connection").hidden = !room;
    $2("connection").textContent = room ? active.session.failure ? "연결이 끊겼어요 · 시작 화면에서 나갈 수 있어요" : `함께 ${active.players.length}명 · ${active.session.ready ? "연결됨" : "동기화 중"}` : "";
    if (now - lastSave > 3e3) {
      lastSave = now;
      persist();
    }
  }
  function frame(now) {
    measureFrame(now);
    if (room || !home && !document.hidden) active.pulse(now);
    const display = active.presentation(now);
    combatFeel.observe(active.world, display.displayTimeMs, display.presentationRevision);
    renderer.render(display, combatFeel, display.displayTimeMs);
    sync(display, now);
    requestAnimationFrame(frame);
  }
  $2("productVersion").textContent = PRODUCT_VERSION;
  $2("startVersion").textContent = PRODUCT_VERSION + " · 특수 능력과 레이드 성장";
  setHome(true, false);
  if (location.hash && location.hash !== "#/") route();
  requestAnimationFrame(frame);
  globalThis.BUDMORI = { get sim() {
    return active.world;
  }, get runtime() {
    return active;
  }, get room() {
    return room;
  }, get renderMetrics() {
    return frameRate();
  }, get presentationDiagnostics() {
    return active.latestPresentationDiagnostics;
  }, renderer, storage, foodFeel, combatFeel, CONFIG, ATTACK_TYPES: UNIT_ABILITY_PROFILES, Ballistics, ArenaGeometry, version: PRODUCT_VERSION };
})();
