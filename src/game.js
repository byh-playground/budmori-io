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

  // src/unit-grades.js
  function mergeMaterialCostForTier(resultTier) {
    if (!Number.isInteger(resultTier) || resultTier < 2 || resultTier > MAX_UNIT_TIER) return 0;
    return UNIT_GRADES[resultTier - 1].materialCost;
  }
  function isValidUnitTier(tier) {
    return Number.isInteger(tier) && tier >= 1 && tier <= MAX_UNIT_TIER;
  }
  var UNIT_GRADES, MAX_UNIT_TIER, MAX_GRADE_MATERIAL_COUNT;
  var init_unit_grades = __esm({
    "src/unit-grades.js"() {
      UNIT_GRADES = Object.freeze([
        Object.freeze({ tier: 1, name: "Common", materialCost: 0, outlineColor: "#d8d4bd" }),
        Object.freeze({ tier: 2, name: "Uncommon", materialCost: 2, outlineColor: "#83ce76" }),
        Object.freeze({ tier: 3, name: "Rare", materialCost: 2, outlineColor: "#78b9ff" }),
        Object.freeze({ tier: 4, name: "Epic", materialCost: 3, outlineColor: "#bd8cff" }),
        Object.freeze({ tier: 5, name: "Legendary", materialCost: 4, outlineColor: "#ffb354" }),
        Object.freeze({ tier: 6, name: "Mythic", materialCost: 5, outlineColor: "#ff7086" })
      ]);
      MAX_UNIT_TIER = UNIT_GRADES.length;
      MAX_GRADE_MATERIAL_COUNT = Math.max(...UNIT_GRADES.map((grade) => grade.materialCost));
    }
  });

  // src/species-catalog.js
  function speciesById(id) {
    return SPECIES_CATALOG.find((species) => species.id === id) || SPECIES_CATALOG[SPECIES_CATALOG.length - 1];
  }
  function giantSpeciesName(id) {
    return `거대 ${speciesById(id).name}`;
  }
  function speciesRewardName(id) {
    return `${speciesById(id).name} 종`;
  }
  var SPECIES_CATALOG, SPECIES_COUNT, BOSS_SPECIES_WEIGHTS;
  var init_species_catalog = __esm({
    "src/species-catalog.js"() {
      SPECIES_CATALOG = Object.freeze([
        Object.freeze({ id: 0, name: "콩", asset: "pea.svg", bossWeight: 1 }),
        Object.freeze({ id: 1, name: "옥수수", asset: "corn-kernel.svg", bossWeight: 1 }),
        Object.freeze({ id: 2, name: "팥", asset: "kidney-bean.svg", bossWeight: 1 }),
        Object.freeze({ id: 3, name: "밤톨", asset: "chestnut.svg", bossWeight: 1 }),
        Object.freeze({ id: 4, name: "땅콩", asset: "peanut.svg", bossWeight: 1 }),
        Object.freeze({ id: 5, name: "호두", asset: "walnut.svg", bossWeight: 1 }),
        Object.freeze({ id: 6, name: "쌀", asset: "rice.svg", bossWeight: 1 }),
        Object.freeze({ id: 7, name: "밀", asset: "wheat.svg", bossWeight: 1 }),
        Object.freeze({ id: 8, name: "보리", asset: "barley.svg", bossWeight: 1 })
      ]);
      SPECIES_COUNT = SPECIES_CATALOG.length;
      BOSS_SPECIES_WEIGHTS = Object.freeze(SPECIES_CATALOG.map((species) => species.bossWeight));
    }
  });

  // src/unit-stats.js
  function createBaseStats(tier, speciesProfile) {
    let maxHp = TIER_HP;
    let attackPower = TIER_ATTACK;
    for (let resultTier = 2; resultTier <= tier; resultTier++) {
      const transitionMultiplier = UNIT_GRADES[resultTier - 1].materialCost / 2;
      maxHp *= TIER_HP_SCALE * transitionMultiplier;
      attackPower *= TIER_ATTACK_SCALE * transitionMultiplier;
    }
    return Object.freeze({ maxHp, attackPower, ...COMMON_UNIT_STAT_DEFAULTS, ...speciesProfile });
  }
  function baseUnitStatsFor(tier, species) {
    tier = Math.max(1, Math.min(MAX_UNIT_TIER, Number.isInteger(tier) ? tier : 1));
    const profile = COMMON_UNIT_STAT_PROFILES[species] || COMMON_UNIT_STAT_DEFAULTS;
    return BASE_STATS_BY_PROFILE.get(profile)?.[tier - 1] || createBaseStats(tier, profile);
  }
  function resolveUnitStats(unit, overrides) {
    return { ...baseUnitStatsFor(unit?.tier, unit?.species), ...overrides };
  }
  function combatStats(unit, overrides) {
    return overrides === void 0 ? baseUnitStatsFor(unit?.tier, unit?.species) : resolveUnitStats(unit, overrides);
  }
  function resolveDamage(rawDamage, armor = 0, armorPenetration = 0, critical = false, critMultiplier = COMMON_UNIT_STAT_DEFAULTS.critMultiplier) {
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
  function scaleMoveSpeed(baseSpeed, unit, overrides) {
    return Math.max(0, Number.isFinite(baseSpeed) ? baseSpeed : 0) * Math.max(0, combatStats(unit, overrides).moveSpeed);
  }
  function scaleAttackRecovery(baseRecovery, unit, overrides) {
    return Math.max(0, Number.isFinite(baseRecovery) ? baseRecovery : 0) / Math.max(0.05, combatStats(unit, overrides).attackSpeed);
  }
  function scaleAttackArea(baseArea, unit, overrides) {
    return Math.max(0, Number.isFinite(baseArea) ? baseArea : 0) * Math.max(0, combatStats(unit, overrides).attackArea);
  }
  function applyDamage(target, rawDamage, { armor = 0, armorPenetration = 0, critical = false, critMultiplier = COMMON_UNIT_STAT_DEFAULTS.critMultiplier } = {}) {
    if (!target || !Number.isFinite(target.hp)) return { actualLoss: 0, ...resolveDamage(rawDamage, armor, armorPenetration, critical, critMultiplier) };
    const resolved = resolveDamage(rawDamage, armor, armorPenetration, critical, critMultiplier);
    const actualLoss = Math.min(Math.max(0, target.hp), resolved.damage);
    target.hp = Math.max(0, target.hp - actualLoss);
    return { ...resolved, actualLoss };
  }
  function applyHealing(target, amount, receiverStats = combatStats(target)) {
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
    sourceStatOverrides,
    armorForTarget = (target) => combatStats(target).armor,
    roll = () => 1
  } = {}) {
    const sourceStats = source ? combatStats(source, sourceStatOverrides) : null;
    const critical = !!sourceStats && sourceStats.critChance > 0 && resolveCritical(sourceStats, roll());
    const hits = [];
    let totalActualLoss = 0;
    for (const target of targets || []) {
      const result = applyDamage(target, rawDamage, {
        armor: armorForTarget(target),
        armorPenetration: sourceStats?.armorPenetration || 0,
        critical,
        critMultiplier: sourceStats?.critMultiplier ?? COMMON_UNIT_STAT_DEFAULTS.critMultiplier
      });
      hits.push(result);
      totalActualLoss += result.actualLoss;
    }
    const baseRate = sourceKind === "direct" ? sourceStats?.lifesteal || 0 : 0;
    const healRate = area ? baseRate / 3 : baseRate;
    const healed = source && healRate > 0 ? applyHealing(source, totalActualLoss * healRate, sourceStats) : 0;
    return { hits, totalActualLoss, healed, critical };
  }
  function resolveStatusDuration(baseDuration, source, target, { sourceStatOverrides, targetStatOverrides } = {}) {
    const sourceStats = source ? combatStats(source, sourceStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const targetStats = target ? combatStats(target, targetStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const durationScale = Number.isFinite(sourceStats.statusDuration) ? Math.max(0, sourceStats.statusDuration) : 1;
    const resistance = clamp(Number.isFinite(targetStats.statusResistance) ? targetStats.statusResistance : 0, 0, 1);
    return Math.max(0, Number.isFinite(baseDuration) ? baseDuration : 0) * durationScale * (1 - resistance);
  }
  function resolveKnockback(basePower, source, target, { sourceStatOverrides, targetStatOverrides } = {}) {
    const sourceStats = source ? combatStats(source, sourceStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const targetStats = target ? combatStats(target, targetStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const power = Number.isFinite(sourceStats.knockbackPower) ? Math.max(0, sourceStats.knockbackPower) : 1;
    const resistance = clamp(Number.isFinite(targetStats.knockbackResistance) ? targetStats.knockbackResistance : 0, 0, 1);
    return Math.max(0, Number.isFinite(basePower) ? basePower : 0) * power * (1 - resistance);
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  var TIER_HP, TIER_HP_SCALE, TIER_ATTACK, TIER_ATTACK_SCALE, ARMOR_SCALE, COMMON_UNIT_STAT_DEFAULTS, COMMON_UNIT_STAT_PROFILES, BASE_STATS_BY_PROFILE;
  var init_unit_stats = __esm({
    "src/unit-stats.js"() {
      init_unit_grades();
      init_species_catalog();
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
        critMultiplier: 2,
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
      COMMON_UNIT_STAT_PROFILES = Object.freeze(Array.from({ length: SPECIES_COUNT }, () => Object.freeze({ ...COMMON_UNIT_STAT_DEFAULTS })));
      BASE_STATS_BY_PROFILE = new Map([COMMON_UNIT_STAT_DEFAULTS, ...COMMON_UNIT_STAT_PROFILES].map((profile) => [
        profile,
        Array.from({ length: MAX_UNIT_TIER }, (_, index) => createBaseStats(index + 1, profile))
      ]));
    }
  });

  // src/unit-abilities.js
  function abilityProfile(species) {
    return UNIT_ABILITY_PROFILES[species] || UNIT_ABILITY_PROFILES[0];
  }
  var UNIT_ABILITY_PROFILES;
  var init_unit_abilities = __esm({
    "src/unit-abilities.js"() {
      UNIT_ABILITY_PROFILES = Object.freeze({
        0: Object.freeze({ kind: "ram", windup: 0.28, recovery: 0.65, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 }),
        1: Object.freeze({ kind: "lob", windup: 0.38, recovery: 1.25, range: 4.1, skillMultiplier: 1.6, projectileCount: 1, bounces: 0 }),
        2: Object.freeze({ kind: "leap", windup: 0.32, recovery: 0.9, range: 2.5, skillMultiplier: 1.3, projectileCount: 0, bounces: 0 }),
        3: Object.freeze({ kind: "punch", windup: 0.28, recovery: 0.65, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 }),
        // One Peanut remains one world unit; its two kernels are presentation-only
        // and the two deterministic strike slots share the same active window.
        4: Object.freeze({ kind: "peanut-dual-strike", windup: 0.25, active: 0.5, recovery: 1, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 }),
        // Walnut's base hammer is a single hit; the separate guard trait empowers
        // one subsequent basic cycle without adding an attack queue or timer.
        5: Object.freeze({ kind: "walnut-hammer", windup: 0.5, active: 0.25, recovery: 1, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 }),
        6: Object.freeze({ kind: "ram", windup: 0.28, recovery: 0.65, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 }),
        7: Object.freeze({ kind: "punch", windup: 0.28, recovery: 0.65, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 }),
        8: Object.freeze({ kind: "ram", windup: 0.28, recovery: 0.65, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 })
      });
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
        }),
        // Initial implementation values from the Peanut/Walnut design draft.
        // These are adjustable balance defaults, not final user-approved numbers.
        Object.freeze({
          id: "peanut-separated-assault",
          species: 4,
          name: "분리 협공",
          description: "한 땅콩의 두 알이 넓게 벌어져 번갈아 공격합니다. 수치는 초기 밸런스 초안입니다.",
          rootTier: 3,
          powerValues: Object.freeze([3, 4, 5]),
          strikeAttackMultiplier: 0.5,
          spreadRadians: Math.PI / 6,
          gradeThresholds: Object.freeze([3, 2, 1])
        }),
        Object.freeze({
          id: "walnut-guard-slam",
          species: 5,
          name: "웅크리기 반격",
          description: "일반 공격 회복 후반에 웅크려 첫 피격을 줄이고, 다음 망치 공격을 충격파로 강화합니다. 수치는 초기 밸런스 초안입니다.",
          rootTier: 3,
          powerValues: Object.freeze([1.5, 1.75, 2]),
          receivedDamageMultiplier: 0.75,
          receivedKnockbackMultiplier: 0.5,
          guardRecoveryStartFraction: 0.5,
          radiusBaseRangeFraction: 0.5,
          radiusMultipliers: Object.freeze([1, 1.25, 1.5]),
          gradeThresholds: Object.freeze([3, 2, 1])
        }),
        Object.freeze({
          id: "rice-low-health-harvest",
          species: 6,
          name: "수확 낫",
          description: "낫 기본 공격이 체력이 절반 이하인 적에게 더 큰 피해를 줍니다.",
          rootTier: 3,
          powerValues: Object.freeze([1.5, 1.75, 2]),
          targetHpThreshold: 0.5,
          gradeThresholds: Object.freeze([3, 2, 1])
        }),
        Object.freeze({
          id: "wheat-command-crit",
          species: 7,
          name: "로마 군단장의 지휘",
          description: "기본 공격 적중 시 자신과 가까운 생존 아군의 치명타 확률을 5초 동안 높입니다.",
          rootTier: 3,
          powerValues: Object.freeze([0.1, 0.25, 0.5]),
          durationSeconds: 5,
          radiusRangeRatio: 2,
          gradeThresholds: Object.freeze([3, 2, 1])
        }),
        Object.freeze({
          id: "barley-armor-break",
          species: 8,
          name: "도리깨 갑주 파쇄",
          description: "도리깨 기본 공격 적중 시 적의 방어도를 낮춰 5초 동안 피해를 더 받게 합니다.",
          rootTier: 3,
          powerValues: Object.freeze([0.25, 0.5, 0.75]),
          durationSeconds: 5,
          gradeThresholds: Object.freeze([3, 2, 1])
        })
      ]);
    }
  });

  // src/farm-upgrades.js
  function createFarmUpgradeState() {
    return Object.fromEntries(FARM_UPGRADE_IDS.map((id) => [id, 0]));
  }
  function isValidFarmUpgradeState(state) {
    if (!state || typeof state !== "object" || Array.isArray(state)) return false;
    if (Object.keys(state).length !== FARM_UPGRADE_IDS.length) return false;
    return FARM_UPGRADE_IDS.every((id) => Object.hasOwn(state, id) && Number.isSafeInteger(state[id]) && state[id] >= 0 && state[id] <= FARM_UPGRADE_MAX_LEVELS[id]);
  }
  function getFarmUpgradeLevel(state, id) {
    return Number.isSafeInteger(state?.[id]) ? state[id] : 0;
  }
  function getFarmUpgradeInvestedCount(state) {
    if (!isValidFarmUpgradeState(state)) return 0;
    return FARM_UPGRADE_IDS.reduce((total, id) => total + state[id], 0);
  }
  function farmUpgradeRate(state, id) {
    return 1 + 0.1 * getFarmUpgradeLevel(state, id);
  }
  function getFarmCapacity(state) {
    return Math.min(100, 50 + 10 * getFarmUpgradeLevel(state, "capacity"));
  }
  function getAutoTapSeconds(state) {
    return 0.5 / farmUpgradeRate(state, "food");
  }
  function getBreedCooldownSeconds(state, baseSeconds = 10) {
    return baseSeconds / farmUpgradeRate(state, "breed");
  }
  function getMergeCooldownSeconds(state, baseSeconds = 4) {
    return baseSeconds / farmUpgradeRate(state, "merge");
  }
  var FARM_UPGRADE_MAX_LEVELS, FARM_UPGRADE_NODES, FARM_UPGRADE_IDS;
  var init_farm_upgrades = __esm({
    "src/farm-upgrades.js"() {
      FARM_UPGRADE_MAX_LEVELS = Object.freeze({
        food: 4,
        growth: 4,
        breed: 4,
        merge: 4,
        capacity: 5
      });
      FARM_UPGRADE_NODES = Object.freeze([
        { id: "food", name: "자동 탭", icon: "◒", description: "자동 먹이 생성 간격을 단계마다 10% 줄입니다.", value: (level) => `${(0.5 / (1 + 0.1 * level)).toFixed(3)}초 / 탭` },
        { id: "growth", name: "먹이 찾기", icon: "❧", description: "먹이를 향해 움직일 때의 속도를 단계마다 10% 높입니다.", value: (level) => `${(2.2 * (1 + 0.1 * level)).toFixed(2)} 속도` },
        { id: "breed", name: "번식 회복", icon: "♡", description: "부모의 번식 대기시간을 단계마다 10% 줄입니다.", value: (level) => `${(10 / (1 + 0.1 * level)).toFixed(2)}초` },
        { id: "merge", name: "합체 회복", icon: "◇", description: "합체 후 대기시간을 단계마다 10% 줄입니다.", value: (level) => `${(4 / (1 + 0.1 * level)).toFixed(2)}초` },
        { id: "capacity", name: "정원 확장", icon: "＋", description: "정원 인원 상한을 단계마다 10명 늘립니다.", value: (level) => `${Math.min(100, 50 + 10 * level)}명` }
      ]);
      FARM_UPGRADE_IDS = Object.freeze(Object.keys(FARM_UPGRADE_MAX_LEVELS));
    }
  });

  // src/ability-state.js
  function createAbilityProgressionState({ availablePoints = 0 } = {}) {
    if (!isNonNegativeInteger(availablePoints)) throw new TypeError("availablePoints must be a non-negative integer");
    return {
      schemaVersion: ABILITY_TREE_SCHEMA_VERSION,
      availablePoints,
      farmUpgrades: createFarmUpgradeState(),
      abilities: Object.fromEntries(SPECIES_ABILITY_DEFINITIONS.map((definition) => [definition.id, {
        rootUnlocked: false,
        powerLevel: 0,
        gradeLevel: 0
      }]))
    };
  }
  function isValidAbilityProgressionState(state) {
    if (!state || typeof state !== "object" || state.schemaVersion !== ABILITY_TREE_SCHEMA_VERSION) return false;
    if (!isNonNegativeInteger(state.availablePoints) || !isValidFarmUpgradeState(state.farmUpgrades) || !state.abilities || typeof state.abilities !== "object") return false;
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
      farmUpgrades: { ...state.farmUpgrades },
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
      farmUpgrades: snapshot2.farmUpgrades,
      abilities: snapshot2.abilities,
      processedBossKillReceipts: []
    };
    if (!isValidAbilityProgressionState(state)) return false;
    const invested = Object.values(state.abilities).reduce((total, investment) => total + Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel, 0);
    return invested + getFarmUpgradeInvestedCount(state.farmUpgrades) + state.availablePoints === state.level - 1;
  }
  function isValidPlayerLikeAbilityState(state) {
    const abilityState = {
      schemaVersion: state?.schemaVersion,
      availablePoints: state?.availablePoints,
      farmUpgrades: state?.farmUpgrades,
      abilities: state?.abilities
    };
    if (!isValidAbilityProgressionState(abilityState) || !Number.isSafeInteger(state?.level) || state.level < 1) return false;
    const investedPoints = Object.values(state.abilities).reduce((total, investment) => total + Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel, 0);
    return investedPoints + getFarmUpgradeInvestedCount(state.farmUpgrades) + state.availablePoints === state.level - 1;
  }
  function isNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }
  var ABILITY_TREE_SCHEMA_VERSION;
  var init_ability_state = __esm({
    "src/ability-state.js"() {
      init_ability_catalog();
      init_farm_upgrades();
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
  function awardBossKillXp(state, receiptKey, xpAmount = BOSS_KILL_XP) {
    if (!isValidPlayerProgressionState(state)) {
      return { state, awarded: false, reason: "invalid-state", xpAwarded: 0, levelsGained: 0, pointsAwarded: 0 };
    }
    if (typeof receiptKey !== "string" || receiptKey.trim().length === 0) {
      return { state, awarded: false, reason: "invalid-receipt", xpAwarded: 0, levelsGained: 0, pointsAwarded: 0 };
    }
    if (!Number.isFinite(xpAmount) || xpAmount < 0 || xpAmount >= 1e13) {
      return { state, awarded: false, reason: "invalid-xp", xpAwarded: 0, levelsGained: 0, pointsAwarded: 0 };
    }
    if (state.processedBossKillReceipts.includes(receiptKey)) {
      return { state, awarded: false, reason: "duplicate-receipt", xpAwarded: 0, levelsGained: 0, pointsAwarded: 0 };
    }
    let level = state.level;
    let experience = state.experience + xpAmount;
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
    return { state: nextState, awarded: true, reason: null, xpAwarded: xpAmount, levelsGained, pointsAwarded };
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
    return investedPoints + getFarmUpgradeInvestedCount(state.farmUpgrades) + state.availablePoints === state.level - 1;
  }
  var PLAYER_PROGRESS_BASE_XP, BOSS_KILL_XP, FIRST_LEVEL_XP, LEVEL_XP_MULTIPLIER, SHARED_POINTS_PER_LEVEL;
  var init_player_progression = __esm({
    "src/player-progression.js"() {
      init_ability_state();
      init_farm_upgrades();
      PLAYER_PROGRESS_BASE_XP = 100;
      BOSS_KILL_XP = PLAYER_PROGRESS_BASE_XP;
      FIRST_LEVEL_XP = PLAYER_PROGRESS_BASE_XP;
      LEVEL_XP_MULTIPLIER = 1.2;
      SHARED_POINTS_PER_LEVEL = 1;
    }
  });

  // src/boss-rewards.js
  function bossStageStats(stage) {
    if (!Number.isSafeInteger(stage) || stage < 1 || stage > BOSS_REWARD_SETTINGS.maxStage) throw new RangeError(`Boss stage must be from 1 to ${BOSS_REWARD_SETTINGS.maxStage}`);
    const exponent = stage - 1;
    return {
      stage,
      hp: BOSS_REWARD_SETTINGS.stageHpBase * BOSS_REWARD_SETTINGS.stageHpMultiplier ** exponent,
      attackPower: BOSS_REWARD_SETTINGS.stageAttackBase * BOSS_REWARD_SETTINGS.stageAttackMultiplier ** exponent,
      xp: Math.round(BOSS_REWARD_SETTINGS.stageXpBase * BOSS_REWARD_SETTINGS.stageXpMultiplier ** exponent),
      rolls: Math.floor(stage / 5)
    };
  }
  function chooseBossSpecies(random, weights = BOSS_REWARD_SETTINGS.speciesWeights) {
    if (typeof random !== "function" || !Array.isArray(weights) || weights.length !== BOSS_REWARD_SETTINGS.speciesWeights.length || weights.some((weight) => !Number.isFinite(weight) || weight <= 0)) throw new TypeError("Boss species weights and random source are required");
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let remaining = random() * total;
    if (!Number.isFinite(remaining) || remaining < 0 || remaining >= total) throw new RangeError("Boss species roll must be in [0, 1)");
    for (let index = 0; index < weights.length; index += 1) {
      remaining -= weights[index];
      if (remaining < 0) return index;
    }
    return weights.length - 1;
  }
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
      const drops = Array.isArray(reward.drops) ? reward.drops : [{ roll: reward.roll, status: "pending", unitId: 0 }];
      for (const drop of drops) {
        if (drop.status !== "pending") continue;
        const unit = grantUnit ? grantUnit({ ...reward, roll: drop.roll }) : world.units.length < world.capacity ? world.spawn(reward.species, reward.tier, reward.x, reward.y) : null;
        if (!unit) continue;
        drop.status = "granted";
        drop.unitId = unit.id;
        granted.push({ ...reward, roll: drop.roll, unitId: unit.id });
      }
      const pending = drops.some((drop) => drop.status === "pending");
      const successful = drops.filter((drop) => drop.status === "granted");
      reward.status = pending ? "pending" : successful.length ? "granted" : "missed";
      reward.unitId = pending ? 0 : successful[0]?.unitId || 0;
      const event = world.farmBossEvent;
      if (event?.encounterId === reward.encounterId) {
        event.rewardStatus = reward.status;
        event.rewardUnitId = reward.unitId;
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
    if (previous) {
      if (previous.status === "pending") grantPendingBossAcquisitions(world, { grantUnit: options?.grantUnit || null });
      return previous;
    }
    if (!["farm", "raid"].includes(source) || !Number.isSafeInteger(encounterId) || encounterId <= (world.bossRewardWatermarks[source] || 0)) {
      throw new RangeError("A settled or stale boss encounter cannot be rolled again");
    }
    const random = options?.random || (() => world.random());
    const rollCount = options?.rollCount === void 0 ? 1 : options.rollCount;
    if (!Number.isSafeInteger(rollCount) || rollCount < 0 || rollCount > BOSS_REWARD_SETTINGS.maxStage) throw new RangeError("Boss drop roll count is out of range");
    const decision = rollCount > 0 ? decideBossAcquisition({ ...options, random }) : {
      encounterId,
      source,
      receiptKey: options?.receiptKey || `${source}:${encounterId}`,
      acquisitionMultiplier: source === "farm" ? BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier : options?.acquisitionMultiplier ?? 1,
      species: options?.species ?? 3,
      tier: options?.tier ?? 1,
      x: options?.x ?? 0,
      y: options?.y ?? 0,
      chance: bossAcquisitionChance({ farmEvent: source === "farm", acquisitionMultiplier: options?.acquisitionMultiplier ?? 1 }),
      roll: 0,
      status: "missed",
      unitId: 0
    };
    const drops = rollCount > 0 ? [{ roll: decision.roll, status: decision.roll < decision.chance ? "pending" : "missed", unitId: 0 }, ...Array.from({ length: rollCount - 1 }, () => {
      const roll = random();
      if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new RangeError("Boss acquisition roll must be in [0, 1)");
      return { roll, status: roll < decision.chance ? "pending" : "missed", unitId: 0 };
    })] : [];
    const receipt = { ...decision, drops, rollCount, roll: drops[0]?.roll ?? 0, status: drops.some((drop) => drop.status === "pending") ? "pending" : "missed", unitId: 0 };
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
    const receiptKey = receipt.xpReceiptKey || options?.receiptKey || receipt.receiptKey || `${receipt.source}:${receipt.encounterId}`;
    if (receipt.xpReceiptKey && ["awarded", "already-awarded"].includes(receipt.xpStatus)) {
      return {
        receipt,
        progression: wallet,
        awarded: false,
        reason: "duplicate-receipt",
        xpAwarded: receipt.xpAmount ?? 0,
        levelsGained: receipt.levelsGained ?? 0,
        pointsAwarded: receipt.pointsAwarded ?? 0
      };
    }
    const result = awardBossKillXp(wallet, receiptKey, options?.xpAmount === void 0 ? void 0 : options.xpAmount);
    if (result.awarded) progressionOwner.playerProgression = result.state;
    if (result.awarded || result.reason === "duplicate-receipt") {
      receipt.xpReceiptKey = receiptKey;
      receipt.xpStatus = result.awarded ? "awarded" : "already-awarded";
      receipt.xpAmount = result.awarded ? result.xpAwarded : 0;
      receipt.levelsGained = result.levelsGained;
      receipt.pointsAwarded = result.pointsAwarded;
    } else {
      receipt.xpStatus = "unsettled";
    }
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
      init_species_catalog();
      BOSS_REWARD_SETTINGS = Object.freeze({
        acquisitionChance: 0.2,
        farmEventAcquisitionMultiplier: 2,
        stageHpBase: 200,
        stageHpMultiplier: 1.5,
        stageAttackBase: 4,
        stageAttackMultiplier: 1.2,
        stageXpBase: 20,
        stageXpMultiplier: 1.2,
        maxStage: 61,
        speciesWeights: BOSS_SPECIES_WEIGHTS
      });
    }
  });

  // src/farm-boss-stages.js
  function createFarmBossProgress(seed = 731) {
    return {
      currentStage: 1,
      encounterSeed: (clampUint32(seed) ^ 2738958700) >>> 0,
      encounterEpoch: 0,
      nextSelectionId: 1,
      selections: []
    };
  }
  function selectionRandom(seed, selectionId, stage, encounterEpoch = 0) {
    const epochSalt = Math.imul(encounterEpoch >>> 0, 668265261);
    let state = (seed ^ Math.imul(selectionId, 2654435769) ^ Math.imul(stage, 2246822507) ^ epochSalt) >>> 0;
    return () => {
      state = state + 1831565813 >>> 0;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }
  function advanceFarmBossEncounterEpoch(progress) {
    if (!progress || typeof progress !== "object" || Array.isArray(progress) || !Number.isSafeInteger(progress.encounterEpoch ?? 0) || (progress.encounterEpoch ?? 0) < 0 || (progress.encounterEpoch ?? 0) >= 1e12 || !Array.isArray(progress.selections)) {
      throw new TypeError("Farm boss encounter progress is invalid");
    }
    progress.encounterEpoch = (progress.encounterEpoch ?? 0) + 1;
    progress.selections = [];
    return progress.encounterEpoch;
  }
  function selectFarmBossStage(progress, stage) {
    if (!progress || !Number.isSafeInteger(stage) || stage < 1 || stage > BOSS_REWARD_SETTINGS.maxStage) throw new RangeError("Boss stage is outside the supported range");
    let selection = progress.selections.find((entry) => entry.stage === stage);
    if (!selection) {
      const selectionId = progress.nextSelectionId;
      const random = selectionRandom(progress.encounterSeed, selectionId, stage, progress.encounterEpoch ?? 0);
      selection = { stage, species: chooseBossSpecies(random), selectionId };
      progress.selections.push(selection);
      progress.nextSelectionId += 1;
    }
    progress.currentStage = stage;
    const stats2 = bossStageStats(stage);
    return { ...selection, ...stats2 };
  }
  var clampUint32;
  var init_farm_boss_stages = __esm({
    "src/farm-boss-stages.js"() {
      init_boss_rewards();
      clampUint32 = (value) => Number.isSafeInteger(value) ? value >>> 0 : 0;
    }
  });

  // src/ability-progression.js
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
    const lockReason = progressionLockReason(context);
    if (lockReason) return { allowed: false, reason: lockReason };
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
    const lockReason = progressionLockReason(context);
    if (lockReason) return { allowed: false, reason: lockReason };
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
  function canPurchaseFarmUpgrade(state, nodeId, context = {}) {
    const node = FARM_UPGRADE_NODES.find((candidate) => candidate.id === nodeId);
    if (!node) return { allowed: false, reason: "unknown-node" };
    if (!isValidPlayerProgressionState(state)) return { allowed: false, reason: "invalid-state" };
    const lockReason = progressionLockReason(context);
    if (lockReason) return { allowed: false, reason: lockReason };
    if (state.farmUpgrades[nodeId] >= FARM_UPGRADE_MAX_LEVELS[nodeId]) return { allowed: false, reason: "max-level" };
    if (state.availablePoints < SHARED_ABILITY_POINT_COST) return { allowed: false, reason: "insufficient-points" };
    return { allowed: true, reason: null };
  }
  function purchaseFarmUpgrade(state, nodeId, context = {}) {
    const check = canPurchaseFarmUpgrade(state, nodeId, context);
    if (!check.allowed) return { ok: false, reason: check.reason, state };
    const next = cloneState(state);
    next.availablePoints -= SHARED_ABILITY_POINT_COST;
    next.farmUpgrades[nodeId] += 1;
    return { ok: true, reason: null, state: next };
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
  function parseNodeId(nodeId) {
    if (nodeId === "root") return { kind: "root", level: 0 };
    const match = /^(power|grade)-(\d+)$/.exec(String(nodeId || ""));
    if (!match) return null;
    return { kind: match[1], level: Number(match[2]) };
  }
  function cloneState(state) {
    return {
      ...state,
      farmUpgrades: { ...state.farmUpgrades },
      abilities: Object.fromEntries(Object.entries(state.abilities).map(([id, value]) => [id, { ...value }]))
    };
  }
  function progressionLockReason(context) {
    if (context.location !== "farm" || context.inCombat === true) return context.inCombat ? "combat-lock" : "farm-only";
    return null;
  }
  var SHARED_ABILITY_POINT_COST, definitionById;
  var init_ability_progression = __esm({
    "src/ability-progression.js"() {
      init_ability_catalog();
      init_ability_state();
      init_player_progression();
      init_farm_upgrades();
      SHARED_ABILITY_POINT_COST = 1;
      definitionById = new Map(SPECIES_ABILITY_DEFINITIONS.map((definition) => [definition.id, definition]));
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
  function getRiceHarvestMultiplier(progression, tier, targetHp, targetMaxHp) {
    const definition = definitionFor("rice-low-health-harvest");
    if (!isAbilityActive(progression, definition.id, tier) || !Number.isFinite(targetHp) || !Number.isFinite(targetMaxHp) || targetMaxHp <= 0 || targetHp / targetMaxHp > definition.targetHpThreshold) return 1;
    const level = powerLevelFor(progression, definition.id);
    return definition.powerValues[level] || definition.powerValues[0];
  }
  function getWheatCommandConfig(progression, tier) {
    const definition = definitionFor("wheat-command-crit");
    if (!isAbilityActive(progression, definition.id, tier)) return null;
    const level = powerLevelFor(progression, definition.id);
    return {
      critBonus: definition.powerValues[level] || definition.powerValues[0],
      durationSeconds: definition.durationSeconds,
      radius: abilityProfile(definition.species).range * definition.radiusRangeRatio,
      radiusRangeRatio: definition.radiusRangeRatio
    };
  }
  function refreshWheatCommandBuff(source, config, now, durationSeconds = config?.durationSeconds) {
    if (!source || !config || !Number.isFinite(now) || !Number.isFinite(durationSeconds) || durationSeconds < 0) return false;
    const currentUntil = Number.isFinite(source.wheatCommandUntil) ? source.wheatCommandUntil : 0;
    const currentBonus = Number.isFinite(source.wheatCommandCritBonus) ? source.wheatCommandCritBonus : 0;
    source.wheatCommandUntil = now + durationSeconds;
    source.wheatCommandCritBonus = Math.max(currentUntil > now ? currentBonus : 0, config.critBonus);
    return true;
  }
  function getBarleyArmorBreakConfig(progression, tier) {
    const definition = definitionFor("barley-armor-break");
    if (!isAbilityActive(progression, definition.id, tier)) return null;
    const level = powerLevelFor(progression, definition.id);
    return {
      armorReduction: definition.powerValues[level] || definition.powerValues[0],
      durationSeconds: definition.durationSeconds
    };
  }
  function refreshBarleyArmorBreak(target, config, now, durationSeconds = config?.durationSeconds) {
    if (!target || !config || !Number.isFinite(now) || !Number.isFinite(durationSeconds) || durationSeconds < 0) return false;
    const currentUntil = Number.isFinite(target.barleyArmorBreakUntil) ? target.barleyArmorBreakUntil : 0;
    const currentReduction = Number.isFinite(target.barleyArmorBreakReduction) ? target.barleyArmorBreakReduction : 0;
    const activeReduction = currentUntil > now ? currentReduction : 0;
    target.barleyArmorBreakUntil = now + durationSeconds;
    target.barleyArmorBreakReduction = Math.max(activeReduction, config.armorReduction);
    return true;
  }
  function effectiveBarleyArmor(target, baselineArmor, now) {
    const reduction = target && Number.isFinite(target.barleyArmorBreakUntil) && target.barleyArmorBreakUntil > now && Number.isFinite(target.barleyArmorBreakReduction) ? Math.max(0, Math.min(1, target.barleyArmorBreakReduction)) : 0;
    return Math.max(0, Number.isFinite(baselineArmor) ? baselineArmor : 0) * (1 - reduction);
  }
  function getPeanutAssaultConfig(progression, tier) {
    const definition = definitionFor("peanut-separated-assault");
    if (!isAbilityActive(progression, definition.id, tier)) return null;
    return {
      strikeCount: definition.powerValues[powerLevelFor(progression, definition.id)],
      attackMultiplier: definition.strikeAttackMultiplier,
      spreadRadians: definition.spreadRadians
    };
  }
  function getWalnutGuardConfig(progression, tier) {
    const definition = definitionFor("walnut-guard-slam");
    if (!isAbilityActive(progression, definition.id, tier)) return null;
    const level = powerLevelFor(progression, definition.id);
    return {
      damageMultiplier: definition.powerValues[level],
      receivedDamageMultiplier: definition.receivedDamageMultiplier,
      receivedKnockbackMultiplier: definition.receivedKnockbackMultiplier,
      guardRecoveryStartFraction: definition.guardRecoveryStartFraction,
      radius: abilityProfile(definition.species).range * definition.radiusBaseRangeFraction * definition.radiusMultipliers[level]
    };
  }
  function isWalnutGuardActive(unit, config, recoverySeconds) {
    return !!config && unit?.species === 5 && unit.hp > 0 && unit.down <= 0 && unit.stun <= 0 && unit.z <= 0.1 && unit.ability?.phase === "recover" && !!unit.ability.action && !unit.ability.action.walnutEmpowered && !unit.ability.action.walnutGuardUsed && unit.ability.elapsed >= recoverySeconds * config.guardRecoveryStartFraction && unit.ability.elapsed < recoverySeconds;
  }
  var definitionById2, MAX_BEAN_SPLIT_CHILDREN;
  var init_species_abilities = __esm({
    "src/species-abilities.js"() {
      init_ability_progression();
      init_ability_catalog();
      init_unit_abilities();
      definitionById2 = new Map(SPECIES_ABILITY_DEFINITIONS.map((definition) => [definition.id, definition]));
      MAX_BEAN_SPLIT_CHILDREN = Math.max(
        ...definitionById2.get("pea-death-split").powerValues
      );
    }
  });

  // src/unit-combat-patterns.js
  function createPeanutStrikeSchedule({
    strikeCount = PEANUT_BASE_STRIKE.count,
    activeSeconds = PEANUT_BASE_STRIKE.activeSeconds,
    attackMultiplier = PEANUT_BASE_STRIKE.attackMultiplier,
    spreadRadians = PEANUT_BASE_STRIKE.spreadRadians
  } = {}) {
    if (!Number.isSafeInteger(strikeCount) || strikeCount < 1 || strikeCount > MASK_BITS || !Number.isFinite(activeSeconds) || activeSeconds <= 0 || !Number.isFinite(attackMultiplier) || attackMultiplier <= 0 || !Number.isFinite(spreadRadians) || spreadRadians < 0 || spreadRadians > Math.PI) return [];
    return Array.from({ length: strikeCount }, (_, strikeIndex) => {
      const side = strikeIndex % 2 === 0 ? -1 : 1;
      return Object.freeze({
        strikeIndex,
        kernelIndex: strikeIndex % 2,
        side,
        angleOffsetRadians: side * spreadRadians,
        dueSeconds: (strikeIndex + 0.5) / strikeCount * activeSeconds,
        attackMultiplier
      });
    });
  }
  function resolveStrikeMask({ resolvedMask = 0, hitMask = 0 } = {}, strikeIndex, didHit) {
    if (!Number.isSafeInteger(resolvedMask) || resolvedMask < 0 || !Number.isSafeInteger(hitMask) || hitMask < 0 || !Number.isSafeInteger(strikeIndex) || strikeIndex < 0 || strikeIndex >= MASK_BITS || typeof didHit !== "boolean") return null;
    const bit = 1 << strikeIndex;
    if ((resolvedMask & bit) !== 0) return null;
    return {
      resolvedMask: resolvedMask | bit,
      hitMask: didHit ? hitMask | bit : hitMask
    };
  }
  var PEANUT_BASE_STRIKE, MASK_BITS;
  var init_unit_combat_patterns = __esm({
    "src/unit-combat-patterns.js"() {
      PEANUT_BASE_STRIKE = Object.freeze({
        count: 2,
        attackMultiplier: 0.5,
        activeSeconds: 0.5,
        spreadRadians: Math.PI / 12
      });
      MASK_BITS = 30;
    }
  });

  // src/boss-patterns.js
  function createBossPatternRuntime() {
    return {
      weights: Object.fromEntries(BOSS_PATTERN_IDS.map((id) => [id, BOSS_PATTERN_WEIGHT_DEFAULTS.base])),
      cooldowns: Object.fromEntries(BOSS_PATTERN_IDS.map((id) => [id, 0])),
      active: null,
      encounterElapsed: 0
    };
  }
  function chooseBossPattern(runtime, eligibleIds, random) {
    if (!runtime || !runtime.weights || !Array.isArray(eligibleIds) || typeof random !== "function") throw new TypeError("Boss pattern selection requires runtime, eligible patterns, and a seeded random source");
    const eligible = [...new Set(eligibleIds)].filter((id) => BOSS_PATTERN_IDS.includes(id)).sort((a, b) => BOSS_PATTERN_IDS.indexOf(a) - BOSS_PATTERN_IDS.indexOf(b));
    if (!eligible.length) return null;
    const total = eligible.reduce((sum, id) => sum + Math.max(0, runtime.weights[id] || 0), 0);
    if (!(total > 0)) return null;
    let roll = random() * total, chosen = eligible.at(-1);
    for (const id of eligible) {
      roll -= Math.max(0, runtime.weights[id] || 0);
      if (roll < 0) {
        chosen = id;
        break;
      }
    }
    for (const id of eligible) runtime.weights[id] = id === chosen ? BOSS_PATTERN_WEIGHT_DEFAULTS.base : Math.min(BOSS_PATTERN_WEIGHT_DEFAULTS.cap, Math.max(0, runtime.weights[id] || 0) + BOSS_PATTERN_WEIGHT_DEFAULTS.eligibleBonus);
    return chosen;
  }
  var BOSS_PATTERN_IDS, BOSS_PATTERN_CONFIG, BOSS_PATTERN_WEIGHT_DEFAULTS, BOSS_AIM_TURN_RATE;
  var init_boss_patterns = __esm({
    "src/boss-patterns.js"() {
      BOSS_PATTERN_IDS = Object.freeze([
        "attack.sweep-360",
        "attack.front-slam",
        "attack.charge",
        "attack.leap-slam",
        "attack.fan-sweep",
        "summon.mouth-t1"
      ]);
      BOSS_PATTERN_CONFIG = Object.freeze({
        "attack.sweep-360": Object.freeze({ kind: "sweep-360", windup: 1.05, active: 0, recover: 1.05, cooldown: 10, reach: 6.5, damageMultiplier: 2.5, knockback: 13, lift: 10.2, groundOnly: true }),
        "attack.front-slam": Object.freeze({ kind: "front-slam", windup: 0.75, active: 0, recover: 0.75, cooldown: 5, reach: 5.5, sector: Math.PI / 2, damageMultiplier: 2.5, knockback: 13, lift: 10.2, groundOnly: true }),
        "attack.charge": Object.freeze({ kind: "charge", windup: 0.5, active: 6.6 / 5.3, recover: 0.75, cooldown: 5, reach: 6.6, speed: 5.3, damageMultiplier: 2, knockback: 13, lift: 10.2, groundOnly: false }),
        "attack.leap-slam": Object.freeze({ kind: "leap-slam", windup: 0.5, active: 1.013, recover: 0.75, cooldown: 5, reach: 6.6, landingRadius: 5.5, damageMultiplier: 2, knockback: 10, lift: 7.2, groundOnly: false }),
        "attack.fan-sweep": Object.freeze({ kind: "fan-sweep", windup: 1, active: 0.8, recover: 1, cooldown: 5, reach: 6.5, width: 0.85, sector: Math.PI * 2 / 3, damageMultiplier: 2, knockback: 13, lift: 10.2, groundOnly: true }),
        "summon.mouth-t1": Object.freeze({ kind: "mouth-t1", windup: 0.5, active: 0.75, recover: 0.5, cooldown: 10, firstEligible: 10, volleyCount: 4, releaseInterval: 0.25, maxAlive: 10, dropHeight: 3, landingSeconds: 0.56, landingRadius: 4.8 })
      });
      BOSS_PATTERN_WEIGHT_DEFAULTS = Object.freeze({ base: 1, eligibleBonus: 0.5, cap: 3 });
      BOSS_AIM_TURN_RATE = 5.5;
    }
  });

  // src/factions.js
  function hasFaction(actor, faction) {
    return actor?.faction === faction;
  }
  function areOpposingFactions(a, b) {
    return !!a && !!b && typeof a.faction === "string" && typeof b.faction === "string" && a.faction !== b.faction;
  }
  function legacyUnitFaction(unit) {
    return unit?.battleSummonKind === "boss-mouth-t1" ? FACTION_CONFIG.ENEMY : FACTION_CONFIG.PLAYER;
  }
  var FACTION_CONFIG;
  var init_factions = __esm({
    "src/factions.js"() {
      FACTION_CONFIG = Object.freeze({ PLAYER: "player", ENEMY: "enemy" });
    }
  });

  // src/spatial-grid.js
  var CELL_SIZE, WORLD_MIN, WORLD_SIZE, CELL_COUNT, WORLD_MAX, CELL_TOTAL, FixedSpatialGrid;
  var init_spatial_grid = __esm({
    "src/spatial-grid.js"() {
      CELL_SIZE = 1.5;
      WORLD_MIN = -64;
      WORLD_SIZE = 128;
      CELL_COUNT = Math.ceil(WORLD_SIZE / CELL_SIZE);
      WORLD_MAX = WORLD_MIN + CELL_COUNT * CELL_SIZE;
      CELL_TOTAL = CELL_COUNT * CELL_COUNT;
      FixedSpatialGrid = class {
        constructor() {
          this.cellSize = CELL_SIZE;
          this.cellCount = CELL_COUNT;
          this.cells = new Array(CELL_TOTAL);
          this.usedCells = [];
          this.touched = new Uint8Array(CELL_TOTAL);
          this.itemCells = /* @__PURE__ */ new Map();
          this.overflowItems = [];
        }
        clear() {
          for (const key of this.usedCells) {
            this.cells[key].length = 0;
            this.touched[key] = 0;
          }
          this.usedCells.length = 0;
          this.itemCells.clear();
          this.overflowItems.length = 0;
        }
        cellX(x) {
          return Math.floor((x - WORLD_MIN) / CELL_SIZE);
        }
        cellY(y) {
          return Math.floor((y - WORLD_MIN) / CELL_SIZE);
        }
        _cellKey(x, y) {
          if (!Number.isFinite(x) || !Number.isFinite(y)) return -1;
          const cx = this.cellX(x), cy = this.cellY(y);
          return cx < 0 || cy < 0 || cx >= CELL_COUNT || cy >= CELL_COUNT ? -1 : cy * CELL_COUNT + cx;
        }
        insert(item, x = item?.x, y = item?.y) {
          if (!item) return false;
          const previous = this.itemCells.get(item);
          if (previous !== void 0) {
            if (previous >= 0) this._removeFromCell(item, previous);
            else this._removeOverflow(item);
          }
          const key = this._cellKey(x, y);
          this.itemCells.set(item, key);
          if (key < 0) {
            this.overflowItems.push(item);
            return false;
          }
          let bucket = this.cells[key];
          if (!bucket) bucket = this.cells[key] = [];
          if (!this.touched[key]) {
            this.touched[key] = 1;
            this.usedCells.push(key);
          }
          bucket.push(item);
          return true;
        }
        update(item, x = item?.x, y = item?.y) {
          if (!item) return false;
          const previous = this.itemCells.get(item);
          const next = this._cellKey(x, y);
          if (previous === next) return next >= 0;
          if (previous !== void 0) {
            if (previous >= 0) this._removeFromCell(item, previous);
            else this._removeOverflow(item);
          }
          this.itemCells.set(item, next);
          if (next < 0) {
            this.overflowItems.push(item);
            return false;
          }
          let bucket = this.cells[next];
          if (!bucket) bucket = this.cells[next] = [];
          if (!this.touched[next]) {
            this.touched[next] = 1;
            this.usedCells.push(next);
          }
          bucket.push(item);
          return true;
        }
        remove(item) {
          const key = this.itemCells.get(item);
          if (key === void 0) return false;
          if (key >= 0) this._removeFromCell(item, key);
          else this._removeOverflow(item);
          this.itemCells.delete(item);
          return true;
        }
        _removeOverflow(item) {
          const index = this.overflowItems.indexOf(item);
          if (index < 0) return;
          const last = this.overflowItems.pop();
          if (index < this.overflowItems.length) this.overflowItems[index] = last;
        }
        _removeFromCell(item, key) {
          const bucket = this.cells[key];
          if (!bucket) return;
          const index = bucket.indexOf(item);
          if (index < 0) return;
          const last = bucket.pop();
          if (index < bucket.length) bucket[index] = last;
        }
        queryAABB(minX, minY, maxX, maxY, out) {
          out.length = 0;
          if (![minX, minY, maxX, maxY].every(Number.isFinite)) return out;
          if (maxX >= WORLD_MIN && maxY >= WORLD_MIN && minX < WORLD_MAX && minY < WORLD_MAX) {
            const x0 = Math.max(0, this.cellX(minX)), y0 = Math.max(0, this.cellY(minY));
            const x1 = Math.min(CELL_COUNT - 1, this.cellX(maxX)), y1 = Math.min(CELL_COUNT - 1, this.cellY(maxY));
            for (let y = y0; y <= y1; y++) {
              const row = y * CELL_COUNT;
              for (let x = x0; x <= x1; x++) {
                const bucket = this.cells[row + x];
                if (bucket) for (let i = 0; i < bucket.length; i++) out.push(bucket[i]);
              }
            }
          }
          for (const item of this.overflowItems) {
            if (item.x >= minX && item.x <= maxX && item.y >= minY && item.y <= maxY) out.push(item);
          }
          return out;
        }
        queryCellRing(centerX, centerY, radius, out) {
          out.length = 0;
          const x0 = centerX - radius, x1 = centerX + radius;
          const y0 = centerY - radius, y1 = centerY + radius;
          if (radius === 0) {
            this._appendCell(centerX, centerY, out);
            return out;
          }
          for (let x = x0; x <= x1; x++) {
            this._appendCell(x, y0, out);
            this._appendCell(x, y1, out);
          }
          for (let y = y0 + 1; y < y1; y++) {
            this._appendCell(x0, y, out);
            this._appendCell(x1, y, out);
          }
          return out;
        }
        _appendCell(x, y, out) {
          if (x < 0 || y < 0 || x >= CELL_COUNT || y >= CELL_COUNT) return;
          const bucket = this.cells[y * CELL_COUNT + x];
          if (bucket) for (let i = 0; i < bucket.length; i++) out.push(bucket[i]);
        }
        distanceToOutsideRing(x, y, centerX, centerY, radius) {
          const left = Math.max(0, centerX - radius), right = Math.min(CELL_COUNT - 1, centerX + radius);
          const bottom = Math.max(0, centerY - radius), top = Math.min(CELL_COUNT - 1, centerY + radius);
          let nearest = Infinity;
          if (left > 0) nearest = Math.min(nearest, x - (WORLD_MIN + left * CELL_SIZE));
          if (right < CELL_COUNT - 1) nearest = Math.min(nearest, WORLD_MIN + (right + 1) * CELL_SIZE - x);
          if (bottom > 0) nearest = Math.min(nearest, y - (WORLD_MIN + bottom * CELL_SIZE));
          if (top < CELL_COUNT - 1) nearest = Math.min(nearest, WORLD_MIN + (top + 1) * CELL_SIZE - y);
          return Math.max(0, nearest);
        }
      };
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
    const action = boss.patternRuntime?.active;
    if (!action) return null;
    const config = BOSS_PATTERN_CONFIG[action.id];
    if (!config) return null;
    const progress = clamp2(action.phaseElapsed / (action.phase === "windup" ? config.windup : config.active || 1), 0, 1), locked = !!action.locked;
    if (action.id === "attack.sweep-360") return { kind: "sweep", x: boss.x, y: boss.y, width: CONFIG.raid.weaponRadius + Math.max(0, unitRadius), sweepRadius: config.reach, outerRadius: config.reach + CONFIG.raid.weaponRadius, startAngle: 0, progress: action.phase === "windup" ? 1 : 1, active: action.phase === "active", patternId: action.id, locked };
    if (action.id === "attack.front-slam") return { kind: "sector", x: boss.x, y: boss.y, angle: action.aim ?? boss.angle, reach: config.reach, sector: config.sector, progress, active: action.phase === "active", patternId: action.id, locked };
    if (action.id === "attack.charge") return { kind: "charge", x: action.start?.x ?? boss.x, y: action.start?.y ?? boss.y, endX: boss.x, endY: boss.y, angle: action.aim ?? boss.angle, reach: config.reach, width: boss.radius, progress, active: action.phase === "active", patternId: action.id, locked };
    if (action.id === "attack.leap-slam") return { kind: "leap", x: boss.x, y: boss.y, targetX: action.target?.x ?? boss.x, targetY: action.target?.y ?? boss.y, reach: config.landingRadius, progress, active: action.phase === "active", patternId: action.id, locked };
    if (action.id === "attack.fan-sweep") return { kind: "fan", x: boss.x, y: boss.y, angle: action.aim ?? boss.angle, reach: config.reach, width: config.width, sector: config.sector, progress, active: action.phase === "active", patternId: action.id, locked };
    return action.id === "summon.mouth-t1" ? { kind: "summon", x: boss.x, y: boss.y, angle: action.aim ?? boss.angle, progress, active: action.phase === "active", patternId: action.id, locked } : null;
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
  var SeededPRNG, presentationClocks, presentationEventTimes, BREED_COOLDOWN_SECONDS, unitRadiusForTier, CONFIG, clamp2, stats, Body, Knockable, ArenaGeometry, Ballistics, AttackCycle, AttackingBody, Unit, Garden;
  var init_farm_model = __esm({
    "src/farm-model.js"() {
      init_unit_stats();
      init_unit_abilities();
      init_boss_rewards();
      init_farm_boss_stages();
      init_species_catalog();
      init_player_progression();
      init_ability_progression();
      init_ability_state();
      init_farm_upgrades();
      init_species_abilities();
      init_species_abilities();
      init_unit_combat_patterns();
      init_unit_grades();
      init_boss_patterns();
      init_factions();
      init_spatial_grid();
      ({ SeededPRNG } = globalThis.BloomGamekitDeterministic);
      presentationClocks = /* @__PURE__ */ new WeakMap();
      presentationEventTimes = /* @__PURE__ */ new WeakMap();
      BREED_COOLDOWN_SECONDS = 10;
      unitRadiusForTier = (tier) => 0.25 + 0.055 * tier;
      CONFIG = Object.freeze({ factions: FACTION_CONFIG, cap: 50, maxFarmCap: 100, maxFarmBattleUnits: 100 * (1 + MAX_BEAN_SPLIT_CHILDREN) + 10, maxFarmUnitId: 999999999, maxRaidPlayerUnits: 100, maxRaidPlayers: 4, raidPlayerIdStride: 1e6, maxRaidUnits: 400, maxRaidBattleUnits: 400 * (1 + MAX_BEAN_SPLIT_CHILDREN) + 10, maxRaidProjectiles: 400 * (1 + MAX_BEAN_SPLIT_CHILDREN) * 4 + 40, raidSummonIdBase: 4e6 + 100 + 1, bossSummonIdBase: 5e6, maxSpecies: SPECIES_COUNT, maxBossSummons: 10, maxUnitRadius: unitRadiusForTier(MAX_UNIT_TIER), maxTier: MAX_UNIT_TIER, maxMergeMaterials: MAX_GRADE_MATERIAL_COUNT, starterSeconds: 60, breedCooldownSeconds: BREED_COOLDOWN_SECONDS, breedGrowthSeconds: BREED_COOLDOWN_SECONDS / 2, mergeAnimationSeconds: 0.85, matureMeals: 3, corpseRecoverySeconds: 60, farmBossEvent: Object.freeze({ spawnChance: 0.01, fadeSeconds: 0.5, celebrationSeconds: 1 }), gravity: 19, fixedStep: 1 / 120, raid: Object.freeze({ radiusX: 23, radiusY: 17, perceptionRange: 18, bossRadius: 4.4, bossHeight: 5.2, basicReach: 6.2, sweepReach: 6.5, weaponRadius: 0.85, chaseSpeed: 2.65, dropHeight: 3, buffDuration: 3, buffCooldown: 12, buffDamage: 1.25 }) });
      clamp2 = (x, a, b) => Math.max(a, Math.min(b, x));
      stats = baseUnitStatsFor;
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
          if (this.phase !== "idle" || u.down > 0 || u.stun > 0 || u.z > 0.1 || u.landingRecovery > 0) return false;
          this.phase = "windup";
          this.elapsed = 0;
          this.action = { id: ++sim.attackSerial, target: { ...target }, targetId: target.id ?? "boss", hit: false, path: null };
          if (this.spec.kind === "peanut-dual-strike") {
            const assault = getPeanutAssaultConfig(sim.abilityProgressionFor(u), u.tier);
            Object.assign(this.action, { resolvedMask: 0, hitMask: 0, peanutStrikeCount: assault?.strikeCount || PEANUT_BASE_STRIKE.count, peanutAttackMultiplier: assault?.attackMultiplier ?? PEANUT_BASE_STRIKE.attackMultiplier, peanutSpreadRadians: assault?.spreadRadians ?? PEANUT_BASE_STRIKE.spreadRadians });
          }
          if (this.spec.kind === "walnut-hammer") {
            const guard = getWalnutGuardConfig(sim.abilityProgressionFor(u), u.tier);
            Object.assign(this.action, { walnutEmpowered: !!guard && u.walnutEmpoweredNextBasic, walnutGuardUsed: false });
            u.walnutEmpoweredNextBasic = false;
          }
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
          if (this.action && (this.phase === "windup" || this.phase === "active") && !(sim.attackTarget(u, this.action)?.hp > 0)) {
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
              if (this.spec.kind === "peanut-dual-strike") {
                a.path = { from: { x: u.x, y: u.y, z: 0 }, to: { x: u.x, y: u.y, z: 0 }, height: 0, duration: this.spec.active };
              } else {
                a.path = Ballistics.create(u, a.target, this.spec.kind);
                if (this.spec.kind === "walnut-hammer") a.path.duration = this.spec.active;
              }
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
          if (this.phase !== "active" || !a?.path || u.stun > 0 || u.down > 0 || u.landingRecovery > 0 || u.z > 0.1 && !(a.path.height > 0)) return false;
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
          if (this.spec.kind === "peanut-dual-strike") {
            if (this.phase !== "active" || !a?.path) return;
            const schedule = createPeanutStrikeSchedule({ strikeCount: a.peanutStrikeCount || 2, attackMultiplier: a.peanutAttackMultiplier ?? PEANUT_BASE_STRIKE.attackMultiplier, spreadRadians: a.peanutSpreadRadians ?? Math.PI / 12, activeSeconds: this.spec.active });
            for (const slot of schedule) {
              if (this.elapsed + 1e-9 < slot.dueSeconds || ((a.resolvedMask || 0) & 1 << slot.strikeIndex) !== 0) continue;
              const target2 = sim.attackTarget(u, a);
              let hit2 = null;
              if (target2 && target2.hp > 0) {
                const distance = Math.hypot(target2.x - u.x, target2.y - u.y), reach = target2.radius + u.radius + this.spec.range;
                if (distance <= reach) {
                  const aim = Math.atan2(target2.y - u.y, target2.x - u.x), side = slot.angleOffsetRadians;
                  const from = { x: u.x + Math.cos(aim + side) * u.radius * 0.45, y: u.y + Math.sin(aim + side) * u.radius * 0.45, z: 0 };
                  const to = { x: target2.x - Math.cos(aim) * target2.radius * 0.9, y: target2.y - Math.sin(aim) * target2.radius * 0.9, z: 0 };
                  hit2 = ArenaGeometry.sweep(from, to, Math.max(0.06, u.radius * 0.2), 0.24, target2);
                }
              }
              const strikeAction = { ...a, hit: false, strikeIndex: slot.strikeIndex };
              const didHit = !!hit2 && sim.damageCombatTarget(u, strikeAction, target2, hit2, { attackMultiplier: slot.attackMultiplier, attackKind: this.spec.kind, strikeIndex: slot.strikeIndex });
              const masks = resolveStrikeMask(a, slot.strikeIndex, didHit);
              if (masks) Object.assign(a, masks);
            }
            if (this.elapsed >= this.spec.active - 1e-9) {
              u.z = 0;
              u.vz = 0;
              this.recover(sim, false);
            }
            return;
          }
          const target = sim.attackTarget(u, a);
          if (this.phase !== "active" || !a?.path) return;
          if (!target || target.hp <= 0) {
            this.interrupt();
            return;
          }
          const areaRadius = scaleAttackArea(u.radius, u);
          const hit = !a.hit && ArenaGeometry.sweep(old, u, areaRadius, 0.65, target);
          if (hit) {
            if (a.walnutEmpowered) sim.triggerWalnutSlam(u, a, target, hit);
            else sim.damageCombatTarget(u, a, target, hit, { attackMultiplier: this.spec.skillMultiplier, attackKind: this.spec.kind });
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
              if (!a.hit && ArenaGeometry.overlaps({ x: u.x, y: u.y, z: 0, radius: scaleAttackArea(u.radius + 0.35, u), height: 0.65 }, target)) sim.damageCombatTarget(u, a, target, u, { attackMultiplier: this.spec.skillMultiplier, attackKind: this.spec.kind });
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
            faction: FACTION_CONFIG.PLAYER,
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
            battleSummonEncounterId: 0,
            countsTowardPermanentRoster: true,
            eligibleForRaidDeployment: true,
            breedingEligible: true,
            mergeEligible: true,
            canSplit: true,
            splitUsedThisBattle: false,
            deathSplitHandled: false,
            usesPersistentSleep: true,
            lifetime: "",
            chestnutBasicCycles: 0,
            landingRecovery: 0,
            walnutEmpoweredNextBasic: false,
            wheatCommandUntil: 0,
            wheatCommandCritBonus: 0,
            barleyArmorBreakUntil: 0,
            barleyArmorBreakReduction: 0
          });
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
          const growth = this.mature ? 1 : this.growthDuration > 0 ? clamp2(this.growthElapsed / this.growthDuration, 0, 1) : 1;
          return (0.55 + 0.1 * this.tier) * (0.5 + 0.5 * growth);
        }
      };
      Garden = class {
        constructor(seed = 731) {
          this.seed = seed;
          this.notices = [];
          this.eventSequence = 0;
          this.mergeTask = null;
          this.unitSpatial = new FixedSpatialGrid();
          this.foodSpatial = new FixedSpatialGrid();
          this._unitById = /* @__PURE__ */ new Map();
          this._unitStepOrder = /* @__PURE__ */ new Map();
          this._unitAliveState = /* @__PURE__ */ new Map();
          this._liveFactionCounts = /* @__PURE__ */ new Map();
          this._foodOrder = /* @__PURE__ */ new Map();
          this._speciesGroups = Array.from({ length: CONFIG.maxSpecies }, () => []);
          this._speciesTierGroups = Array.from({ length: CONFIG.maxSpecies * (CONFIG.maxTier + 1) }, () => []);
          this._mergeEligibleGroups = Array.from({ length: CONFIG.maxSpecies * (CONFIG.maxTier + 1) }, () => []);
          this._ownedSpeciesCounts = new Int32Array(CONFIG.maxSpecies);
          this._unitCandidates = [];
          this._foodCandidates = [];
          this._groundedFoods = [];
          this._groundedFoodCount = 0;
          this._contactPending = [];
          this._contactExtra = [];
          this._contactQuery = [];
          this._contactSeen = new Uint32Array(0);
          this._contactGeneration = 0;
          this._bossGridUnits = [];
          this._bossGroundUnits = [];
          this._bossQueryCandidates = [];
          this._bossHitCandidates = [];
          this._mergeNearestScratch = [];
          this._mergeMaterialsScratch = [];
          this._mergeIdScratch = [];
          this._spatialStepActive = false;
          this._spatialQueryDepth = 0;
          this._unitSpatialDirty = true;
          this._foodSpatialDirty = true;
          for (const key of ["unitSpatial", "foodSpatial", "_unitById", "_unitStepOrder", "_unitAliveState", "_liveFactionCounts", "_foodOrder", "_speciesGroups", "_speciesTierGroups", "_mergeEligibleGroups", "_ownedSpeciesCounts", "_unitCandidates", "_foodCandidates", "_groundedFoods", "_groundedFoodCount", "_contactPending", "_contactExtra", "_contactQuery", "_contactSeen", "_contactGeneration", "_bossGridUnits", "_bossGroundUnits", "_bossQueryCandidates", "_bossHitCandidates", "_mergeNearestScratch", "_mergeMaterialsScratch", "_mergeIdScratch", "_spatialStepActive", "_spatialQueryDepth", "_unitSpatialDirty", "_foodSpatialDirty"]) Object.defineProperty(this, key, { enumerable: false });
          this.reset();
        }
        _rebuildUnitSpatialIndex(stepUnits = this.units) {
          const grid = this.unitSpatial;
          grid.clear();
          this._unitById.clear();
          this._unitStepOrder.clear();
          this._unitAliveState.clear();
          this._liveFactionCounts.clear();
          this._ownedSpeciesCounts.fill(0);
          for (const group of this._speciesGroups) group.length = 0;
          for (const group of this._speciesTierGroups) group.length = 0;
          for (const unit of this.units) {
            grid.insert(unit);
            this._unitById.set(unit.id, unit);
            if (unit.species >= 0 && unit.species < CONFIG.maxSpecies) {
              this._speciesGroups[unit.species].push(unit);
              this._ownedSpeciesCounts[unit.species] += unit.isBattleOnlySummon ? 0 : 1;
              const tier = Math.max(0, Math.min(CONFIG.maxTier, unit.tier | 0));
              this._speciesTierGroups[unit.species * (CONFIG.maxTier + 1) + tier].push(unit);
            }
            if (unit.hp > 0 && typeof unit.faction === "string") this._liveFactionCounts.set(unit.faction, (this._liveFactionCounts.get(unit.faction) || 0) + 1);
            this._unitAliveState.set(unit, unit.hp > 0);
          }
          for (let index = 0; index < stepUnits.length; index++) this._unitStepOrder.set(stepUnits[index], index);
          this._unitSpatialDirty = false;
        }
        _rebuildFoodSpatialIndex() {
          this.foodSpatial.clear();
          this._foodOrder.clear();
          let grounded = 0;
          this._groundedFoods.length = 0;
          for (let index = 0; index < this.food.length; index++) {
            const food = this.food[index];
            this._foodOrder.set(food, index);
            if (food.phase === "grounded") {
              this.foodSpatial.insert(food);
              this._groundedFoods.push(food);
              grounded++;
            }
          }
          this._groundedFoodCount = grounded;
          this._foodSpatialDirty = false;
        }
        _trackFoodAdded(food) {
          if (!this._spatialStepActive) {
            this._foodSpatialDirty = true;
            return;
          }
          this._foodOrder.set(food, this.food.length - 1);
          if (food.phase === "grounded") {
            this.foodSpatial.insert(food);
            this._groundedFoods.push(food);
            this._groundedFoodCount = (this._groundedFoodCount || 0) + 1;
          }
        }
        _trackUnitAdded(unit) {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._unitSpatialDirty = true;
            return;
          }
          this.unitSpatial.insert(unit);
          this._unitById.set(unit.id, unit);
          this._unitStepOrder.set(unit, -1);
          if (unit.species >= 0 && unit.species < CONFIG.maxSpecies) {
            this._speciesGroups[unit.species].push(unit);
            this._ownedSpeciesCounts[unit.species] += unit.isBattleOnlySummon ? 0 : 1;
            const tier = Math.max(0, Math.min(CONFIG.maxTier, unit.tier | 0));
            this._speciesTierGroups[unit.species * (CONFIG.maxTier + 1) + tier].push(unit);
          }
          if (unit.hp > 0 && typeof unit.faction === "string") this._liveFactionCounts.set(unit.faction, (this._liveFactionCounts.get(unit.faction) || 0) + 1);
          this._unitAliveState.set(unit, unit.hp > 0);
        }
        _trackUnitRemoved(unit, { keepStepSnapshot = false } = {}) {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._unitSpatialDirty = true;
            return;
          }
          this._unitById.delete(unit.id);
          this._syncUnitAliveCount(unit);
          if (unit.hp > 0 && typeof unit.faction === "string") this._adjustFactionCount(unit.faction, -1);
          this._unitAliveState.set(unit, false);
          if (unit.species >= 0 && unit.species < CONFIG.maxSpecies) {
            this._removeGroupItem(this._speciesGroups[unit.species], unit);
            const tier = Math.max(0, Math.min(CONFIG.maxTier, unit.tier | 0));
            this._removeGroupItem(this._speciesTierGroups[unit.species * (CONFIG.maxTier + 1) + tier], unit);
            if (!unit.isBattleOnlySummon) this._ownedSpeciesCounts[unit.species] = Math.max(0, this._ownedSpeciesCounts[unit.species] - 1);
          }
          if (!keepStepSnapshot || !this._unitStepOrder.has(unit) || this._unitStepOrder.get(unit) < 0) {
            this.unitSpatial.remove(unit);
            this._unitStepOrder.delete(unit);
          }
        }
        _removeGroupItem(group, item) {
          const index = group.indexOf(item);
          if (index >= 0) group.splice(index, 1);
        }
        _adjustFactionCount(faction, delta) {
          const next = (this._liveFactionCounts.get(faction) || 0) + delta;
          if (next > 0) this._liveFactionCounts.set(faction, next);
          else this._liveFactionCounts.delete(faction);
        }
        _syncUnitAliveCount(unit) {
          const wasAlive = this._unitAliveState?.get(unit);
          const isAlive = unit.hp > 0;
          if (wasAlive === isAlive) return;
          if (!this._unitAliveState) this._unitAliveState = /* @__PURE__ */ new Map();
          this._unitAliveState.set(unit, isAlive);
          if (typeof unit.faction === "string") this._adjustFactionCount(unit.faction, isAlive ? 1 : -1);
        }
        _unitForId(id) {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) this._rebuildUnitSpatialIndex(this.units);
          return this._unitById.get(id);
        }
        _unitIsActive(unit) {
          return this._unitById.get(unit?.id) === unit;
        }
        _beginSpatialQueryBatch() {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) this._rebuildUnitSpatialIndex(this.units);
          this._spatialQueryDepth++;
        }
        _endSpatialQueryBatch() {
          this._spatialQueryDepth = Math.max(0, this._spatialQueryDepth - 1);
        }
        _collectContactOrders(unit, minimumOrder, maximumOrder, out) {
          const radius = unit.radius + CONFIG.maxUnitRadius + 0.22;
          this.unitSpatial.queryAABB(unit.x - radius, unit.y - radius, unit.x + radius, unit.y + radius, this._contactQuery);
          out.length = 0;
          for (const candidate of this._contactQuery) {
            const order = this._unitStepOrder.get(candidate);
            if (order !== void 0 && order >= minimumOrder && order <= maximumOrder) out.push(order);
          }
          out.sort((a, b) => a - b);
          return out;
        }
        _nextContactGeneration(length) {
          if (this._contactSeen.length < length) this._contactSeen = new Uint32Array(Math.max(length, this._contactSeen.length * 2, 16));
          this._contactGeneration = this._contactGeneration + 1 >>> 0;
          if (this._contactGeneration === 0) {
            this._contactSeen.fill(0);
            this._contactGeneration = 1;
          }
          return this._contactGeneration;
        }
        _insertContactOrder(order, lastOrder, pending, generation) {
          if (order <= lastOrder || this._contactSeen[order] === generation) return;
          this._contactSeen[order] = generation;
          let low = 0, high = pending.length;
          while (low < high) {
            const middle = low + high >>> 1;
            if (pending[middle] < order) low = middle + 1;
            else high = middle;
          }
          pending.splice(low, 0, order);
        }
        _collectBossTargets(minX, minY, maxX, maxY, out, groundOnly = false) {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) this._rebuildUnitSpatialIndex(this.units);
          this.unitSpatial.queryAABB(minX, minY, maxX, maxY, out);
          let length = 0;
          for (let index = 0; index < out.length; index++) {
            const unit = out[index];
            if (this._unitIsActive(unit) && hasFaction(unit, FACTION_CONFIG.PLAYER) && unit.hp > 0 && unit.dropLanded && (!groundOnly || unit.z <= 0.1)) out[length++] = unit;
          }
          out.length = length;
          out.sort((a, b) => a.id - b.id);
          return out;
        }
        static createRaidBattle(seed = 731, expectedPlayers = ["solo"], bossStage = null) {
          const w = new Garden(seed);
          w.units = [];
          w.food = [];
          w.scene = "raid";
          w.running = false;
          w.boss = w.createBoss(bossStage?.species ?? w.randomBossSpecies());
          if (bossStage?.stage !== void 0) w.configureBossStage(bossStage.stage, bossStage.species);
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
          this.bossSummonSerial = 0;
          this.combatLog = [];
          this.farmBossProgress = createFarmBossProgress(this.seed);
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
          return this.units.filter((u) => hasFaction(u, FACTION_CONFIG.PLAYER)).reduce((sum, u) => {
            const maxHp = stats(u.tier, u.species).maxHp;
            return { current: sum.current + Math.max(0, Math.min(maxHp, u.hp)), max: sum.max + maxHp, living: sum.living + (u.hp > 0 ? 1 : 0), total: sum.total + 1 };
          }, { current: 0, max: 0, living: 0, total: 0 });
        }
        get capacity() {
          return getFarmCapacity(this.playerProgression?.farmUpgrades);
        }
        breedCooldownDuration() {
          return getBreedCooldownSeconds(this.playerProgression?.farmUpgrades, CONFIG.breedCooldownSeconds);
        }
        breedGrowthDuration() {
          return this.breedCooldownDuration() / 2;
        }
        abilityProgressionFor(unit) {
          if (hasFaction(unit, FACTION_CONFIG.ENEMY)) return null;
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
        investFarmUpgrade(nodeId) {
          const inCombat = this.running || this.farmBossEvent?.phase !== "idle";
          const result = purchaseFarmUpgrade(this.playerProgression, nodeId, { location: this.scene, inCombat });
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
          const projectile = { id, owner: unit.id, targetId: action.targetId || "boss", faction: unit.faction, ownerId: unit.ownerId, species: unit.species, tier: unit.tier, path: structuredClone(action.path), elapsed: 0, x: unit.x, y: unit.y, z: 0.45, radius: scaleAttackArea(0.12, unit), height: 0.24, hit: false, attackMultiplier: shot.attackMultiplier ?? this.speciesAbilityDamageMultiplier(unit), shotIndex: shot.shotIndex ?? 0 };
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
            this.projectiles.push({ id: ++this.projectileSerial, owner: unit.id, faction: unit.faction, ownerId: unit.ownerId, species: unit.species, tier: unit.tier, path, elapsed: 0, x: unit.x, y: unit.y, z: 0, radius: scaleAttackArea(0.08, unit), height: 0.22, hit: false, attackMultiplier: config.projectileAttackMultiplier, projectileKind: "chestnut-spike", fanIndex: index });
          }
          return true;
        }
        handleUnitDeath(unit) {
          if (!unit) return false;
          unit.walnutEmpoweredNextBasic = false;
          if (unit.deathSplitHandled) return false;
          this._syncUnitAliveCount(unit);
          unit.deathSplitHandled = true;
          if (unit.isBattleOnlySummon) {
            unit.down = 0;
            this._trackUnitRemoved(unit, { keepStepSnapshot: true });
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
            this._trackUnitAdded(child);
          }
          this.combat("pea-split", { unit: unit.id, ownerId: unit.ownerId, species: 0, count: descriptors.length, x: unit.x, y: unit.y });
          return true;
        }
        cleanupBattleSummons() {
          for (const unit of this.units) unit.walnutEmpoweredNextBasic = false;
          for (const unit of this.units) if (unit.isBattleOnlySummon) this._trackUnitRemoved(unit);
          this.units = this.units.filter((unit) => !unit.isBattleOnlySummon);
          this.projectiles = [];
          return true;
        }
        triggerLandingShockwave(unit, action, config) {
          const range = abilityProfile(unit.species).range * config.radiusMultiplier, point = { x: unit.x, y: unit.y, z: 0 }, distance = Math.hypot(unit.x - this.boss.x, unit.y - this.boss.y);
          this.effects.push({ kind: "landing-shockwave", x: unit.x, y: unit.y, z: 0, life: 0, duration: 0.55, radius: range, owner: unit.id });
          if (this.boss.hp > 0 && distance <= range + this.boss.radius) {
            const blast = { id: action.id, hit: false, attackKind: "kidney-shockwave" };
            this.damageCombatTarget(unit, blast, this.boss, point, { attackMultiplier: config.damageMultiplier, attackKind: "kidney-shockwave", area: true });
          }
          this.combat("kidney-shockwave", { unit: unit.id, ownerId: unit.ownerId, species: 2, x: unit.x, y: unit.y, radius: range, damageMultiplier: config.damageMultiplier });
        }
        walnutGuardConfigFor(unit) {
          if (unit.species !== 5) return null;
          const config = getWalnutGuardConfig(this.abilityProgressionFor(unit), unit.tier);
          return isWalnutGuardActive(unit, config, scaleAttackRecovery(abilityProfile(unit.species).recovery, unit)) ? config : null;
        }
        receiveWalnutGuard(unit) {
          const config = this.walnutGuardConfigFor(unit);
          if (!config) return null;
          unit.ability.action.walnutGuardUsed = true;
          unit.walnutEmpoweredNextBasic = true;
          this.combat("walnut-guard", { unit: unit.id, x: unit.x, y: unit.y, z: unit.z });
          return config;
        }
        triggerWalnutSlam(unit, action, primaryTarget, point) {
          if (action.hit || !primaryTarget || primaryTarget.hp <= 0 || !areOpposingFactions(unit, primaryTarget)) return false;
          const config = getWalnutGuardConfig(this.abilityProgressionFor(unit), unit.tier);
          if (!config) return false;
          action.hit = true;
          const targets = [primaryTarget];
          if (primaryTarget !== this.boss && this.boss.hp > 0 && areOpposingFactions(unit, this.boss) && Math.hypot(this.boss.x - point.x, this.boss.y - point.y) <= config.radius + this.boss.radius) targets.push(this.boss);
          for (const target of this.units) if (target !== primaryTarget && target.hp > 0 && areOpposingFactions(unit, target) && Math.hypot(target.x - point.x, target.y - point.y) <= config.radius + target.radius) targets.push(target);
          const attackContext = this.createAttackContext(unit, { attackMultiplier: config.damageMultiplier, attackKind: "walnut-empowered-slam", area: true });
          attackContext.criticalRoll = attackContext.sourceStatOverrides.critChance > 0 ? this.random() : 1;
          for (const target of targets) this.damageCombatTarget(unit, { id: action.id, hit: false }, target, point, { attackContext });
          this.effects.push({ kind: "walnut-shockwave", x: point.x, y: point.y, z: 0, life: 0, duration: 0.5, radius: config.radius, owner: unit.id });
          this.combat("walnut-slam", { unit: unit.id, attackId: action.id, x: point.x, y: point.y, z: 0, radius: config.radius });
          return true;
        }
        senseEnemy(unit) {
          if (unit.hp <= 0 || !unit.dropLanded) return null;
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) this._rebuildUnitSpatialIndex(this.units);
          const battleActive = this.scene === "farm" ? this.farmBossEvent?.phase === "fighting" : this.running && this.raidDeploymentStarted;
          const bossTarget = battleActive && this.boss?.active && areOpposingFactions(unit, this.boss) ? this.boss : null;
          let hasUnitEnemy = false;
          for (const [faction, count] of this._liveFactionCounts) if (faction !== unit.faction && count > 0) {
            hasUnitEnemy = true;
            break;
          }
          if (!hasUnitEnemy && !bossTarget) return null;
          let nearest = null, nearestDistance = Infinity, nearestId = Infinity;
          const consider = (target) => {
            if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y) || !Number.isFinite(target.radius)) return;
            const distance = Math.hypot(unit.x - target.x, unit.y - target.y), id = target.id || 0;
            if (distance <= unit.perceptionRange + target.radius + 1e-9 && (distance < nearestDistance || distance === nearestDistance && id < nearestId)) {
              nearest = target;
              nearestDistance = distance;
              nearestId = id;
            }
          };
          consider(bossTarget);
          if (hasUnitEnemy) {
            const extent = Math.max(0, unit.perceptionRange + CONFIG.maxUnitRadius + 1e-9);
            this.unitSpatial.queryAABB(unit.x - extent, unit.y - extent, unit.x + extent, unit.y + extent, this._unitCandidates);
            for (const candidate of this._unitCandidates) if (candidate !== unit && this._unitIsActive(candidate) && candidate.hp > 0 && candidate.dropLanded && areOpposingFactions(unit, candidate)) consider(candidate);
          }
          return nearest;
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
            if (!Array.isArray(e) || e.length !== 3 || !Number.isSafeInteger(e[0]) || e[0] < 1 || e[0] > CONFIG.maxFarmUnitId || !Number.isInteger(e[1]) || e[1] < 0 || e[1] >= CONFIG.maxSpecies || !Number.isInteger(e[2]) || e[2] < 1 || e[2] > CONFIG.maxTier || ids.has(e[0])) return false;
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
          this._trackUnitAdded(u);
          if (!this.raidDeploymentStarted) {
            this.raidDeploymentStarted = true;
            this.running = true;
            this.encounter = { outcome: "fighting", elapsed: 0 };
            this.boss.active = true;
            this.boss.encounterId = this.raidRosters[0]?.settlementRunSequence || this.nextRaidRunSequence || 1;
            this.boss.patternRuntime = createBossPatternRuntime();
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
        randomBossSpecies() {
          return Math.min(CONFIG.maxSpecies - 1, Math.floor(this.random() * CONFIG.maxSpecies));
        }
        spawn(species, tier, x, y) {
          if (this.units.length >= (this.scene === "farm" ? this.capacity : CONFIG.maxRaidUnits)) return null;
          const u = new Unit(this.nextId++, species, clamp2(tier, 1, CONFIG.maxTier), x, y);
          this.units.push(u);
          this._trackUnitAdded(u);
          return u;
        }
        notice(kind, detail = {}) {
          const event = { sequence: ++this.eventSequence, kind, ...detail };
          this.notices.push(event);
          if (this.notices.length > 512) this.notices.shift();
          return event;
        }
        emit(kind, x, y, z = 0, effectOptions = {}) {
          this.notice(kind);
          const effect = { kind, x, y, z, life: 0, ...effectOptions };
          if (Number.isFinite(effect.delay) && Number.isFinite(effect.span)) effect.duration = effect.delay + effect.span;
          this.effects.push(effect);
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
          const interval = getAutoTapSeconds(this.playerProgression?.farmUpgrades);
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
            const food = { x: sx, y: sy, z, vx: (tx - sx) / duration, vy: (ty - sy) / duration, vz: 6 * duration - z / duration, seed: this.random(), phase: "flight", tx, ty };
            this.food.push(food);
            this._trackFoodAdded(food);
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
          this.boss = this.createBoss(this.randomBossSpecies());
          Object.assign(this.boss, { x, y, z: CONFIG.raid.dropHeight, active: true });
          this.farmBossEvent = { phase: "dropping", elapsed: 0, outcome: "fighting", encounterId: this.nextBossEncounterId++, rewardStatus: "unresolved", rewardChance: 0, rewardRoll: 0, rewardUnitId: 0 };
          this.boss.encounterId = this.farmBossEvent.encounterId;
          this.boss.patternRuntime = createBossPatternRuntime();
          this.combat("farm-boss-drop", { x, y, z: this.boss.z });
          return true;
        }
        getBossAcquisitionChance({ farmEvent = false } = {}) {
          return bossAcquisitionChance({ farmEvent });
        }
        createBoss(species = 3) {
          const hp = 2e3;
          return { x: 0, y: 0, faction: FACTION_CONFIG.ENEMY, z: 0, radius: CONFIG.raid.bossRadius, height: CONFIG.raid.bossHeight, hp, maxHp: hp, species: clamp2(species, 0, CONFIG.maxSpecies - 1), attackPower: 4, stage: 0, moveSpeed: CONFIG.raid.chaseSpeed, encounterId: 0, active: false, angle: 0, facing: 0, flash: 0, swings: 0, basicCount: 0, attackId: 0, sweepClock: 0, startAngle: 0, travel: 0, patternRuntime: createBossPatternRuntime(), airborneRecovery: 0, barleyArmorBreakUntil: 0, barleyArmorBreakReduction: 0, summonMouth: { x: 0, y: 0, z: 0 } };
        }
        configureBossStage(stage, species = this.boss.species) {
          const stats2 = bossStageStats(stage);
          this.boss.species = clamp2(species, 0, CONFIG.maxSpecies - 1);
          this.boss.stage = stats2.stage;
          this.boss.hp = this.boss.maxHp = stats2.hp;
          this.boss.attackPower = stats2.attackPower;
          return this.boss;
        }
        setScene(scene) {
          if (scene === this.scene) return;
          this.mergeTask = null;
          this.projectiles = [];
          this.scene = scene;
          this.running = scene === "raid";
          this.encounter = { outcome: this.running ? "fighting" : "idle", elapsed: 0 };
          this.farmBossEvent = { phase: "idle", elapsed: 0, outcome: "idle", encounterId: 0, rewardStatus: "none", rewardChance: 0, rewardRoll: 0, rewardUnitId: 0 };
          this.boss = this.createBoss(this.running ? this.randomBossSpecies() : 3);
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
            u.walnutEmpoweredNextBasic = false;
            Object.assign(u, { z: 0, vx: 0, vy: 0, vz: 0, stun: 0, down: 0, hp: stats(u.tier, u.species).maxHp });
          }
          if (this.running) {
            this.boss.active = true;
            this.boss.encounterId = this.activeRaidRunSequence || this.nextRaidRunSequence || 1;
            this.boss.patternRuntime = createBossPatternRuntime();
            this.raidExpectedPlayers = ["solo"];
            this.raidRosters = [{ ownerId: "solo", troops: this.units.filter((u) => !u.isBattleOnlySummon).map((u) => ({ farmId: u.farmId, species: u.species, tier: u.tier, deployed: true })), abilitySnapshot: createAbilityRuntimeSnapshot(this.playerProgression), buffUntil: 0, buffReadyAt: 0 }];
            this.raidDeploymentStarted = true;
          } else {
            this.raidExpectedPlayers = ["solo"];
            this.raidRosters = [];
            this.raidDeploymentStarted = false;
          }
          this._unitSpatialDirty = true;
        }
        canBreedPair(a, b, requireContact = false) {
          const batch = !this._spatialStepActive;
          if (batch) this._beginSpatialQueryBatch();
          try {
            return a !== b && !a.isBattleOnlySummon && !b.isBattleOnlySummon && a.breedingEligible !== false && b.breedingEligible !== false && a.hp > 0 && b.hp > 0 && a.species === b.species && a.mature && b.mature && a.fed && b.fed && a.cooldown <= 0 && b.cooldown <= 0 && this._unitIsActive(a) && this._unitIsActive(b) && (!requireContact || Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius + 0.2);
          } finally {
            if (batch) this._endSpatialQueryBatch();
          }
        }
        releaseMate(unit) {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) this._rebuildUnitSpatialIndex(this.units);
          const mate = this._unitById.get(unit.mateId);
          unit.mateId = 0;
          if (mate && mate.mateId === unit.id) mate.mateId = 0;
        }
        reconcileMateReservations() {
          const batch = !this._spatialStepActive;
          if (batch) this._beginSpatialQueryBatch();
          try {
            for (const unit of this.units) {
              if (!unit.mateId) continue;
              const mate = this._unitById.get(unit.mateId);
              if (this.mode !== "breed" || !mate || mate.mateId !== unit.id || !this.canBreedPair(unit, mate)) this.releaseMate(unit);
            }
          } finally {
            if (batch) this._endSpatialQueryBatch();
          }
        }
        findOrReserveMate(unit) {
          const batch = !this._spatialStepActive;
          if (batch) this._beginSpatialQueryBatch();
          try {
            if (this.mode !== "breed" || !unit.mature || !unit.fed || unit.cooldown > 0 || unit.hp <= 0 || this.senseEnemy(unit)) {
              this.releaseMate(unit);
              return null;
            }
            if (unit.mateId) {
              const current = this._unitById.get(unit.mateId);
              if (current && current.mateId === unit.id && this.canBreedPair(unit, current)) return current;
              this.releaseMate(unit);
            }
            let mate = null, bestRank = Infinity, bestDistance = Infinity;
            for (const candidate of this._speciesGroups[unit.species] || []) {
              if (candidate === unit || candidate.mateId || !this.canBreedPair(unit, candidate) || this.senseEnemy(candidate)) continue;
              const rank = candidate.tier === unit.tier ? 0 : 1, distance = Math.hypot(candidate.x - unit.x, candidate.y - unit.y);
              if (rank < bestRank || rank === bestRank && distance < bestDistance) {
                mate = candidate;
                bestRank = rank;
                bestDistance = distance;
              }
            }
            if (!mate) return null;
            unit.mateId = mate.id;
            mate.mateId = unit.id;
            return mate;
          } finally {
            if (batch) this._endSpatialQueryBatch();
          }
        }
        hasEligibleSameTierBreedPair() {
          if (this.mode !== "breed" || this.units.length >= this.capacity) return false;
          const batch = !this._spatialStepActive;
          if (batch) this._beginSpatialQueryBatch();
          try {
            for (const group of this._speciesTierGroups) {
              let unreserved = 0;
              for (const unit of group) {
                if (unit.isBattleOnlySummon || unit.breedingEligible === false || unit.hp <= 0 || !unit.mature || !unit.fed || unit.cooldown > 0 || !this._unitIsActive(unit)) continue;
                if (!unit.mateId) {
                  if (++unreserved >= 2) return true;
                  continue;
                }
                const mate = this._unitById.get(unit.mateId);
                if (mate?.mateId === unit.id && mate.species === unit.species && mate.tier === unit.tier && mate.hp > 0 && mate.mature && mate.fed && mate.cooldown <= 0 && mate.breedingEligible !== false && !mate.isBattleOnlySummon) return true;
              }
            }
          } finally {
            if (batch) this._endSpatialQueryBatch();
          }
          return false;
        }
        canMergeGroup(materials, { requireContact = false, requireNoEnemy = false } = {}) {
          const batch = !this._spatialStepActive;
          if (batch) this._beginSpatialQueryBatch();
          try {
            if (!Array.isArray(materials) || materials.length < 2) return false;
            const first = materials[0], resultTier = first?.tier + 1, materialCount = mergeMaterialCostForTier(resultTier);
            if (materialCount < 2 || materials.length !== materialCount || first.tier >= CONFIG.maxTier) return false;
            const ids = /* @__PURE__ */ new Set();
            for (const unit of materials) {
              if (!unit || ids.has(unit.id) || unit.isBattleOnlySummon || unit.mergeEligible === false || unit.species !== first.species || unit.tier !== first.tier || unit.hp <= 0 || unit.down > 0 || !unit.mature || unit.cooldown > 0 || !this._unitIsActive(unit)) return false;
              ids.add(unit.id);
            }
            if (this._ownedSpeciesCounts[first.species] - materialCount + 1 < 2) return false;
            if (requireNoEnemy && materials.some((unit) => this.senseEnemy(unit))) return false;
            if (requireContact) {
              const anchor = materials[0];
              for (let index = 1; index < materials.length; index++) {
                const unit = materials[index];
                if (Math.hypot(anchor.x - unit.x, anchor.y - unit.y) > anchor.radius + unit.radius + 0.2) return false;
              }
            }
            return true;
          } finally {
            if (batch) this._endSpatialQueryBatch();
          }
        }
        canMergePair(a, b, options = {}) {
          return this.canMergeGroup([a, b], options);
        }
        selectMergeTask() {
          if (this.mode !== "merge" || this.scene !== "farm" || this.mergeTask) return;
          const batch = !this._spatialStepActive;
          if (batch) this._beginSpatialQueryBatch();
          try {
            for (const group of this._mergeEligibleGroups) group.length = 0;
            for (const group of this._speciesTierGroups) {
              for (const unit of group) if (!unit.isBattleOnlySummon && unit.mergeEligible !== false && unit.hp > 0 && unit.down <= 0 && unit.mature && unit.cooldown <= 0 && unit.tier < CONFIG.maxTier && !this.senseEnemy(unit)) this._mergeEligibleGroups[unit.species * (CONFIG.maxTier + 1) + unit.tier].push(unit);
            }
            const compareIds = (left, right) => {
              for (let index = 0; index < left.length; index++) if (left[index] !== right[index]) return left[index] - right[index];
              return 0;
            };
            let bestTier = Infinity, bestDistance = Infinity, bestAnchorId = Infinity, bestMaterialIds = null, bestSortedIds = null;
            const nearest = this._mergeNearestScratch, materials = this._mergeMaterialsScratch, sortedIds = this._mergeIdScratch;
            for (let tier = 1; tier < CONFIG.maxTier; tier++) {
              const materialCount = mergeMaterialCostForTier(tier + 1), nearestCount = materialCount - 1;
              if (materialCount < 2) continue;
              for (let species = 0; species < CONFIG.maxSpecies; species++) {
                const group = this._mergeEligibleGroups[species * (CONFIG.maxTier + 1) + tier];
                if (group.length < materialCount || this._ownedSpeciesCounts[species] - materialCount + 1 < 2) continue;
                for (const anchor of group) {
                  nearest.length = 0;
                  for (const unit of group) {
                    if (unit === anchor) continue;
                    const distance2 = (unit.x - anchor.x) ** 2 + (unit.y - anchor.y) ** 2;
                    let insertAt = nearest.length;
                    for (let position = 0; position < nearest.length; position++) {
                      const current = nearest[position];
                      if (distance2 < current.distance || distance2 === current.distance && unit.id < current.unit.id) {
                        insertAt = position;
                        break;
                      }
                    }
                    if (insertAt >= nearestCount) continue;
                    nearest.splice(insertAt, 0, { unit, distance: distance2 });
                    if (nearest.length > nearestCount) nearest.length = nearestCount;
                  }
                  if (nearest.length !== nearestCount) continue;
                  materials.length = 0;
                  materials.push(anchor);
                  for (const entry of nearest) materials.push(entry.unit);
                  if (!this.canMergeGroup(materials, { requireNoEnemy: true })) continue;
                  let distance = 0;
                  for (let i = 0; i < materials.length; i++) for (let j = i + 1; j < materials.length; j++) distance += (materials[i].x - materials[j].x) ** 2 + (materials[i].y - materials[j].y) ** 2;
                  if (tier > bestTier || tier === bestTier && distance > bestDistance) continue;
                  sortedIds.length = 0;
                  for (const unit of materials) sortedIds.push(unit.id);
                  sortedIds.sort((a, b) => a - b);
                  const idsOrder = bestSortedIds ? compareIds(sortedIds, bestSortedIds) : -1;
                  if (bestMaterialIds && (tier > bestTier || tier === bestTier && (distance > bestDistance || distance === bestDistance && (idsOrder > 0 || idsOrder === 0 && anchor.id >= bestAnchorId)))) continue;
                  bestTier = tier;
                  bestDistance = distance;
                  bestAnchorId = anchor.id;
                  bestMaterialIds = materials.map((unit) => unit.id);
                  bestSortedIds = [...sortedIds];
                }
              }
            }
            if (bestMaterialIds) this.mergeTask = { phase: "approach", aId: bestMaterialIds[0], bId: bestMaterialIds[1], materialIds: bestMaterialIds, elapsed: 0, duration: CONFIG.mergeAnimationSeconds };
          } finally {
            if (batch) this._endSpatialQueryBatch();
          }
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
            const materials = (this.mergeTask.materialIds || [this.mergeTask.aId, this.mergeTask.bId]).map((id) => this._unitById.get(id));
            if (!this.canMergeGroup(materials)) this.mergeTask = null;
          }
          if (!this.mergeTask) this.selectMergeTask();
        }
        resolveMergeTaskAfterMovement() {
          const task = this.mergeTask;
          if (task?.phase !== "approach") return false;
          const materials = (task.materialIds || [task.aId, task.bId]).map((id) => this._unitById.get(id));
          if (!this.canMergeGroup(materials, { requireContact: true, requireNoEnemy: true })) return false;
          return this.mergeGroup(materials, { priorityResolved: true });
        }
        pair(a, b, priorityResolved = false) {
          if (this.mode === "merge") {
            return this.mergeGroup([a, b], { priorityResolved });
          }
          if (!a || !b || a === b || a.hp <= 0 || b.hp <= 0 || a.down > 0 || b.down > 0 || a.species !== b.species || !a.mature || !b.mature || a.cooldown > 0 || b.cooldown > 0 || !this.units.includes(a) || !this.units.includes(b) || Math.hypot(a.x - b.x, a.y - b.y) > a.radius + b.radius + 0.2 || this.senseEnemy(a) || this.senseEnemy(b)) return false;
          if (a.isBattleOnlySummon || b.isBattleOnlySummon) return false;
          {
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
        mergeGroup(materials, { priorityResolved = false } = {}) {
          if (this.mode !== "merge" || this.scene !== "farm" || !this.canMergeGroup(materials, { requireContact: true, requireNoEnemy: true })) return false;
          const ordered = [...materials], first = ordered[0], materialIds = ordered.map((unit) => unit.id), consumed = new Set(materialIds), x = ordered.reduce((sum, unit) => sum + unit.x, 0) / ordered.length, y = ordered.reduce((sum, unit) => sum + unit.y, 0) / ordered.length;
          for (const unit of ordered) this.releaseMate(unit);
          for (const unit of ordered) this._trackUnitRemoved(unit);
          this.units = this.units.filter((unit) => !consumed.has(unit.id));
          const result = this.spawn(first.species, first.tier + 1, x, y);
          result.meals = 1;
          result.growth = CONFIG.matureMeals;
          result.growthDuration = this.breedGrowthDuration();
          result.growthElapsed = result.growthDuration;
          result.cooldown = getMergeCooldownSeconds(this.playerProgression?.farmUpgrades);
          result.cooldownDuration = result.cooldown;
          this.mergeTask = { phase: "animation", aId: 0, bId: 0, materialIds, resultId: result.id, sourceSpecies: first.species, sourceTier: first.tier, elapsed: 0, duration: CONFIG.mergeAnimationSeconds };
          const sequenceWindow = CONFIG.mergeAnimationSeconds * 0.72, step = sequenceWindow / ordered.length;
          ordered.forEach((unit, index) => this.effects.push({ kind: "merge-material", x: unit.x, y: unit.y, z: 0.2, targetX: x, targetY: y, life: 0, delay: index * step, span: step, duration: (index + 1) * step, sequenceIndex: index, sequenceCount: ordered.length }));
          this.metrics.merges++;
          this.emit("merge", x, y, 1, { delay: sequenceWindow, span: CONFIG.mergeAnimationSeconds - sequenceWindow });
          return true;
        }
        step(dt) {
          this._spatialStepActive = true;
          this._spatialQueryDepth = 0;
          this.time += dt;
          grantPendingBossAcquisitions(this);
          const units = [...this.units];
          this._rebuildUnitSpatialIndex(units);
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
          this._rebuildFoodSpatialIndex();
          this.reconcileMateReservations();
          for (const u of units) {
            u.landingRecovery = Math.max(0, (u.landingRecovery || 0) - dt);
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
                this._syncUnitAliveCount(u);
                u.ability = new AttackCycle(u);
                this.combat("unit-recover", { unit: u.id, x: u.x, y: u.y });
              }
              this.unitSpatial.update(u);
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
            else if (u.hp > 0 && hasFaction(u, FACTION_CONFIG.PLAYER) && !u.isBattleOnlySummon) {
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
              u.landingRecovery = 0.25;
              if (!u.dropLanded) {
                u.dropLanded = true;
                u.bounce = 0.16;
                this.combat(this.scene === "raid" ? "drop-land" : "boss-add-land", { unit: u.id, ownerId: u.ownerId, x: u.x, y: u.y, z: 0 });
                this.effects.push({ kind: "drop-dust", x: u.x, y: u.y, z: 0, life: 0 });
              }
              this.metrics.landings++;
              if (this.scene === "raid") this.combat("unit-land", { unit: u.id, x: u.x, y: u.y, z: 0, strength: Math.min(1, Math.hypot(u.vx, u.vy) / 8) });
              else if (Math.hypot(u.vx, u.vy) > 1) this.emit("land", u.x, u.y);
            }
            this.boundBody(u, this.scene, u.radius);
            this.unitSpatial.update(u);
          }
          this.resolveContacts(units);
          if (this.scene === "farm") {
            if (this.mode === "breed") {
              this.resolveFarmContactPairs(units, true);
              if (!this.hasEligibleSameTierBreedPair()) this.resolveFarmContactPairs(units, false);
            } else this.resolveMergeTaskAfterMovement();
          }
          if (this.scene === "farm" && this.farmBossEvent.phase !== "idle") {
            if (this.boss.active) this.updateProjectiles(dt);
            this.updateBoss(dt);
            if (this.boss.active) for (const u of this.units) {
              this.separateBoss(u);
              this.unitSpatial.update(u);
            }
          } else if (this.boss.active) {
            this.updateProjectiles(dt);
            this.updateBoss(dt);
            for (const u of this.units) {
              this.separateBoss(u);
              this.unitSpatial.update(u);
            }
          }
          this.units = this.units.filter((unit) => !unit.isBattleOnlySummon || unit.hp > 0);
          this._spatialStepActive = false;
          this._unitSpatialDirty = true;
          this._foodSpatialDirty = true;
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
          for (let i = 0; i < units.length; i++) {
            const unit = units[i];
            if (unit.hp <= 0 || !unit.dropLanded) continue;
            const pending = this._collectContactOrders(unit, 0, i - 1, this._contactPending);
            for (const j of pending) {
              const other = units[j];
              if (other.hp <= 0 || !other.dropLanded) continue;
              const ax = other.x, ay = other.y, bx = unit.x, by = unit.y, didContact = contact(other, unit);
              if (didContact) this.metrics.contacts++;
              if (ax !== other.x || ay !== other.y) this.unitSpatial.update(other);
              if (bx !== unit.x || by !== unit.y) this.unitSpatial.update(unit);
            }
          }
        }
        resolveContacts(units) {
          if (this.scene === "raid") {
            this.raidContacts(units);
            return;
          }
          for (let i = 0; i < units.length; i++) {
            const unit = units[i], generation = this._nextContactGeneration(units.length), pending = this._collectContactOrders(unit, i + 1, units.length - 1, this._contactPending);
            for (const order of pending) this._contactSeen[order] = generation;
            let cursor = 0;
            while (cursor < pending.length) {
              const j = pending[cursor++], other = units[j], ax = unit.x, ay = unit.y, bx = other.x, by = other.y, didContact = contact(unit, other);
              if (didContact) this.metrics.contacts++;
              const unitMoved = ax !== unit.x || ay !== unit.y, otherMoved = bx !== other.x || by !== other.y;
              if (unitMoved) this.unitSpatial.update(unit);
              if (otherMoved) this.unitSpatial.update(other);
              if (unitMoved) {
                const extras = this._collectContactOrders(unit, j + 1, units.length - 1, this._contactExtra);
                for (const order of extras) this._insertContactOrder(order, j, pending, generation);
              }
            }
          }
        }
        resolveFarmContactPairs(units, sameTier) {
          for (let i = 0; i < units.length; i++) {
            const unit = units[i], pending = this._collectContactOrders(unit, i + 1, units.length - 1, this._contactPending);
            for (const j of pending) {
              const other = units[j];
              if (unit.tier === other.tier !== sameTier) continue;
              this.pair(unit, other, true);
            }
          }
        }
        avoidNearbyFood(u, dt) {
          const radius = 1.25;
          let pushX = 0, pushY = 0, strongest = 0, nearest = null, nearestDistance = Infinity;
          if (!this._spatialStepActive) this._rebuildFoodSpatialIndex();
          this.foodSpatial.queryAABB(u.x - radius, u.y - radius, u.x + radius, u.y + radius, this._foodCandidates);
          this._foodCandidates.sort((a, b) => (this._foodOrder.get(a) ?? Infinity) - (this._foodOrder.get(b) ?? Infinity));
          for (const food of this._foodCandidates) {
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
        findNearestGroundFood(x, y) {
          if (!this._spatialStepActive) this._rebuildFoodSpatialIndex();
          if (!this._groundedFoodCount) return null;
          const grid = this.foodSpatial, cx = grid.cellX(x), cy = grid.cellY(y);
          if (cx < 0 || cy < 0 || cx >= grid.cellCount || cy >= grid.cellCount) return null;
          let nearest = null, nearestDistance = Infinity, nearestOrder = Infinity;
          const maxRing = Math.max(cx, cy, grid.cellCount - 1 - cx, grid.cellCount - 1 - cy);
          for (let ring = 0; ring <= maxRing; ring++) {
            grid.queryCellRing(cx, cy, ring, this._foodCandidates);
            for (const food of this._foodCandidates) {
              const distance = Math.hypot(food.x - x, food.y - y), order = this._foodOrder.get(food) ?? Infinity;
              if (distance < nearestDistance || distance === nearestDistance && order < nearestOrder) {
                nearest = food;
                nearestDistance = distance;
                nearestOrder = order;
              }
            }
            if (nearest && nearestDistance < grid.distanceToOutsideRing(x, y, cx, cy, ring)) break;
            if ((2 * ring + 1) * (2 * ring + 1) > this._groundedFoodCount) {
              nearest = null;
              nearestDistance = Infinity;
              nearestOrder = Infinity;
              for (const food of this._groundedFoods) {
                const distance = Math.hypot(food.x - x, food.y - y);
                if (distance < nearestDistance) {
                  nearest = food;
                  nearestDistance = distance;
                }
              }
              break;
            }
          }
          return nearest;
        }
        farmUnit(u, dt) {
          if (u.stun > 0 || u.z > 0.1) return;
          if (!u.mature || u.cooldown > 0) {
            if (!this.avoidNearbyFood(u, dt)) this.steer(u, Math.sin(this.time * 0.18 + u.seed) * 7.4, Math.cos(this.time * 0.16 + u.seed) * 5.3, dt, scaleMoveSpeed(0.75, u));
            return;
          }
          if (this.mode === "merge") {
            const task = this.mergeTask;
            if (task?.phase === "approach" && task.materialIds?.includes(u.id)) {
              const anchor = this._unitById.get(task.materialIds[0]);
              if (anchor && u.cooldown <= 0) this.steer(u, u.id === anchor.id ? u.x : anchor.x, u.id === anchor.id ? u.y : anchor.y, dt, scaleMoveSpeed(2.2, u));
              return;
            }
            this.steer(u, Math.sin(this.time * 0.18 + u.seed) * 7.4, Math.cos(this.time * 0.16 + u.seed) * 5.3, dt, scaleMoveSpeed(0.75, u));
            return;
          }
          let target = null, best = Infinity;
          if (this.mode === "breed" && !u.fed) {
            target = this.findNearestGroundFood(u.x, u.y);
            if (target) best = Math.hypot(target.x - u.x, target.y - u.y);
            if (target && best < 0.42) {
              this.food.splice(this.food.indexOf(target), 1);
              this.foodSpatial.remove(target);
              this._foodOrder.delete(target);
              this._removeGroupItem(this._groundedFoods, target);
              this._groundedFoodCount = Math.max(0, this._groundedFoodCount - 1);
              u.meals = 1;
              u.vz = 2;
              this.emit("eat", u.x, u.y, 0.5);
              target = null;
            }
          } else if (this.mode === "breed" && u.cooldown === 0) target = this.findOrReserveMate(u);
          else if (u.cooldown === 0) {
            for (const p of this._speciesGroups[u.species] || []) {
              if (p === u || p.hp <= 0 || p.down > 0 || !p.mature || p.cooldown > 0 || this.mode === "breed" && !p.fed || this.mode === "merge" && !(p.tier === u.tier && u.tier < CONFIG.maxTier)) continue;
              const d = Math.hypot(p.x - u.x, p.y - u.y);
              if (d < best) {
                best = d;
                target = p;
              }
            }
          }
          const hasDesignatedMate = this.mode === "breed" && u.fed && target && this.units.includes(target);
          if (this.mode === "breed" && u.fed && !hasDesignatedMate && this.avoidNearbyFood(u, dt)) return;
          if (target) this.steer(u, target.x, target.y, dt, scaleMoveSpeed(2.2 * (target.phase === "grounded" ? farmUpgradeRate(this.playerProgression?.farmUpgrades, "growth") : 1), u));
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
          if (!areOpposingFactions(u, b) || u.hp <= 0 || !u.dropLanded || u.z > b.height) return;
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
        wheatCommandCritBonusFor(attacker) {
          if (!attacker || attacker.hp <= 0) return 0;
          let strongest = 0;
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) this._rebuildUnitSpatialIndex(this.units);
          for (const source of this._speciesGroups[7]) {
            if (source.species !== 7 || source.hp <= 0 || !hasFaction(source, attacker.faction) || source.wheatCommandUntil <= this.time) continue;
            const config = getWheatCommandConfig(this.abilityProgressionFor(source), source.tier);
            if (!config || Math.hypot(source.x - attacker.x, source.y - attacker.y) > config.radius) continue;
            strongest = Math.max(strongest, Number.isFinite(source.wheatCommandCritBonus) ? source.wheatCommandCritBonus : 0);
          }
          return Math.max(0, Math.min(1, strongest));
        }
        riceHarvestMultiplier(u, target, kind, hpBefore = target?.hp, maxHp = target?.maxHp) {
          if (u.species !== 6 || kind !== abilityProfile(u.species).kind) return 1;
          const progression = this.abilityProgressionFor(u);
          return getRiceHarvestMultiplier(progression, u.tier, hpBefore, maxHp);
        }
        applyGrainOnBasicHit(u, target, kind) {
          if (!hasFaction(u, FACTION_CONFIG.PLAYER) || kind !== abilityProfile(u.species).kind) return;
          const progression = this.abilityProgressionFor(u);
          if (u.species === 7) {
            const config = getWheatCommandConfig(progression, u.tier);
            if (config) refreshWheatCommandBuff(u, config, this.time, resolveStatusDuration(config.durationSeconds, u, null));
          } else if (u.species === 8) {
            const config = getBarleyArmorBreakConfig(progression, u.tier);
            if (config) refreshBarleyArmorBreak(target, config, this.time, resolveStatusDuration(config.durationSeconds, u, target));
          }
        }
        attackTarget(unit, action) {
          if (action?.targetId === "boss" || !action?.targetId) return areOpposingFactions(unit, this.boss) ? this.boss : null;
          const target = this._unitForId(action.targetId);
          return target?.hp > 0 && areOpposingFactions(unit, target) ? target : null;
        }
        createAttackContext(u, { attackMultiplier = null, attackKind = null, strikeIndex = null, area = false, criticalRoll = null } = {}) {
          const spec = abilityProfile(u.species), roster = this.raidRoster(u.ownerId), attackerStats = stats(u.tier, u.species);
          return {
            source: u,
            sourceKind: hasFaction(u, FACTION_CONFIG.PLAYER) ? "direct" : "enemy",
            attackerStats,
            damageMultiplier: Number.isFinite(attackMultiplier) ? attackMultiplier : spec.skillMultiplier,
            kind: attackKind || spec.kind,
            buffed: !!roster && this.time < roster.buffUntil,
            strikeIndex,
            area,
            criticalRoll,
            hitTargets: area ? /* @__PURE__ */ new Set() : null,
            sourceStatOverrides: { critChance: clamp2(attackerStats.critChance + this.wheatCommandCritBonusFor(u), 0, 1) }
          };
        }
        combatTargetDefense(target) {
          if (target !== this.boss) {
            const targetStats = stats(target.tier, target.species);
            return { maxHp: targetStats.maxHp, armor: effectiveBarleyArmor(target, targetStats.armor, this.time) };
          }
          const hpRatio = Number.isFinite(target.hp) && Number.isFinite(target.maxHp) && target.maxHp > 0 ? clamp2(target.hp / target.maxHp, 0, 1) : 1;
          return { maxHp: target.maxHp, armor: effectiveBarleyArmor(target, (1 - hpRatio) * 100, this.time) };
        }
        damageCombatTarget(u, action, target, point, options = {}) {
          const isBoss = target === this.boss;
          if (!target || target.hp <= 0 || !areOpposingFactions(u, target) || action.hit || isBoss && !hasFaction(u, FACTION_CONFIG.PLAYER) || options.attackContext?.hitTargets?.has(target)) return false;
          action.hit = true;
          const context = options.attackContext || this.createAttackContext(u, options), { source, attackerStats, damageMultiplier, kind, buffed } = context;
          context.hitTargets?.add(target);
          const defense = this.combatTargetDefense(target), harvestMultiplier = this.riceHarvestMultiplier(source, target, kind, target.hp, defense.maxHp);
          const guard = isBoss ? null : this.receiveWalnutGuard(target);
          const rawDamage = attackerStats.attackPower * damageMultiplier * (buffed ? CONFIG.raid.buffDamage : 1) * harvestMultiplier * (guard?.receivedDamageMultiplier ?? 1);
          const damage = applyDamageToTargets(source, [target], { rawDamage, area: context.area, sourceKind: context.sourceKind, sourceStatOverrides: context.sourceStatOverrides, armorForTarget: () => defense.armor, roll: () => context.criticalRoll ?? (context.criticalRoll = this.random()) });
          if (!isBoss) this._syncUnitAliveCount(target);
          this.applyGrainOnBasicHit(source, target, kind);
          const strength = damageMultiplier * (buffed ? CONFIG.raid.buffDamage : 1) * harvestMultiplier * (damage.critical ? attackerStats.critMultiplier : 1);
          if (isBoss) this.finishBossHit(source, action, point, context, damage, strength);
          else this.finishUnitHit(source, action, target, point, context, damage, strength, guard);
          return true;
        }
        finishBossHit(u, action, point, { kind, strikeIndex, buffed }, damage, strength) {
          this.boss.flash = 0.13;
          const dx = point.x - this.boss.x, dy = point.y - this.boss.y, d = Math.hypot(dx, dy) || 1;
          this.combat("boss-hit", { unit: u.id, ownerId: u.ownerId, species: u.species, attackId: action.id, strikeIndex, attackKind: kind, buffed, critical: damage.critical, x: this.boss.x + dx / d * this.boss.radius, y: this.boss.y + dy / d * this.boss.radius, z: clamp2(point.z + 0.2, 0.2, this.boss.height), nx: dx / d, ny: dy / d, strength });
          this.combatEvent("damage", u, action);
        }
        finishUnitHit(u, action, target, point, { kind, strikeIndex }, damage, strength, guard) {
          const dx = target.x - u.x, dy = target.y - u.y, n = Math.hypot(dx, dy) || 1;
          target.knock(dx / n, dy / n, 5 * (guard?.receivedKnockbackMultiplier ?? 1), 2.4 * (guard?.receivedKnockbackMultiplier ?? 1), u);
          if (target.hp === 0) {
            target.down = target.isBattleOnlySummon ? 0 : CONFIG.corpseRecoverySeconds;
            this.handleUnitDeath(target);
          }
          this.metrics.directHits++;
          this.metrics.basicHits++;
          this.combat("unit-hit", { attackKind: kind, attackId: action.id, strikeIndex, unit: target.id, sourceUnit: u.id, damage: damage?.damage || 0, x: point.x, y: point.y, z: Math.max(0.15, target.z + 0.25), nx: dx / n, ny: dy / n, strength });
        }
        explodePopcorn(kernel) {
          if (!kernel?.isPopcorn || kernel.exploded) return false;
          const batch = !this._spatialStepActive;
          if (batch) this._beginSpatialQueryBatch();
          try {
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
              const owner = this._unitForId(current.owner) || { id: current.owner, ownerId: current.ownerId || "", faction: current.faction, species: current.species, tier: current.tier, x: current.x, y: current.y, z: 0 };
              const targets = [];
              if (areOpposingFactions(owner, this.boss) && !current.damagedTargetIds.includes("boss") && Math.hypot(current.x - this.boss.x, current.y - this.boss.y) <= range + this.boss.radius) targets.push(this.boss);
              for (const target of this.units) if (target.hp > 0 && areOpposingFactions(owner, target) && !current.damagedTargetIds.includes(target.id) && Math.hypot(current.x - target.x, current.y - target.y) <= range + target.radius) targets.push(target);
              const attackContext = this.createAttackContext(owner, { attackMultiplier: config.damageMultiplier, attackKind: "corn-popcorn-explosion", area: true });
              for (const target of targets) {
                const action = { id: current.id, hit: false, attackKind: "corn-popcorn-explosion" };
                const applied = this.damageCombatTarget(owner, action, target, center, { attackContext });
                if (applied) current.damagedTargetIds.push(target === this.boss ? "boss" : target.id);
              }
              for (const other of this.projectiles) {
                if (other === current || !other.isPopcorn || other.exploded || !other.landed || queued.has(other.id)) continue;
                if (Math.hypot(other.x - current.x, other.y - current.y) <= range + other.radius) queue.push(other);
              }
              this.combat("popcorn-explosion", { unit: current.owner, ownerId: current.ownerId || "", species: 1, x: current.x, y: current.y, radius: range });
            }
            return triggered;
          } finally {
            if (batch) this._endSpatialQueryBatch();
          }
        }
        updateProjectiles(dt) {
          const batch = !this._spatialStepActive;
          if (batch) this._beginSpatialQueryBatch();
          try {
            for (const p of this.projectiles) {
              if (p.isPopcorn && p.landed) {
                if (!p.exploded) p.fuseRemaining = Math.max(0, p.fuseRemaining - dt);
                else p.explosionLife = (p.explosionLife || 0) + dt;
                continue;
              }
              const old = { x: p.x, y: p.y, z: p.z };
              p.elapsed += dt;
              Object.assign(p, Ballistics.sample(p.path, p.elapsed / p.path.duration));
              const candidate = p.targetId && p.targetId !== "boss" ? this._unitForId(p.targetId) : this.boss;
              const target = candidate === this.boss || candidate?.hp > 0 ? candidate : null;
              const hit = target ? ArenaGeometry.sweep(old, p, p.radius, p.height, target) : null;
              if (p.isPopcorn && (hit || p.elapsed >= p.path.duration)) {
                if (hit) Object.assign(p, { x: hit.x, y: hit.y, z: 0 });
                else p.z = 0;
                p.landed = true;
                p.fuseRemaining = p.popcornConfig.fuseSeconds;
                this.effects.push({ kind: "popcorn-kernel-impact", x: p.x, y: p.y, z: 0, life: 0, duration: 0.25, radius: p.radius, owner: p.owner });
              } else if (hit) {
                Object.assign(p, { x: hit.x, y: hit.y, z: hit.z });
                const source = this._unitForId(p.owner), impactUnit = source || { id: p.owner, ownerId: p.ownerId || "", faction: p.faction, species: p.species, tier: p.tier, x: p.x, y: p.y, z: p.z };
                this.damageCombatTarget(impactUnit, p, target, hit, { attackMultiplier: p.attackMultiplier, attackKind: p.projectileKind || "lob" });
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
          } finally {
            if (batch) this._endSpatialQueryBatch();
          }
        }
        raidUnit(u, dt, enemy = this.boss) {
          if (!u.dropLanded || !areOpposingFactions(u, enemy)) return;
          if (u.hp <= 0) {
            u.down = CONFIG.corpseRecoverySeconds;
            u.ability.interrupt();
            return;
          }
          if (u.ability.update(this, dt) || u.stun > 0 || u.z > 0.1 || u.landingRecovery > 0) return;
          if (!enemy) return;
          const b = enemy, spec = abilityProfile(u.species), dx = u.x - b.x, dy = u.y - b.y, n = Math.hypot(dx, dy) || 1, targetId = enemy === this.boss ? "boss" : enemy.id;
          const stand = b.radius + spec.range + (u.tier - 1) * 0.12, min = stand - 0.55, max = stand + (spec.kind === "peanut-dual-strike" ? 0 : 0.55);
          if (n > max || spec.kind === "lob" && n < min) {
            const slot = ArenaGeometry.clamp({ x: b.x + dx / n * stand, y: b.y + dy / n * stand }, this.scene, u.radius);
            this.steer(u, slot.x, slot.y, dt, scaleMoveSpeed(4.1, u));
            return;
          }
          u.vx = u.vy = 0;
          const target = spec.kind === "lob" ? { id: targetId, x: b.x, y: b.y } : { id: targetId, x: b.x + dx / n * (b.radius + u.radius - 0.16), y: b.y + dy / n * (b.radius + u.radius - 0.16) };
          u.ability.begin(this, target);
        }
        finish(outcome) {
          if (!this.running) return;
          const bossPatternElapsed = this.boss.patternRuntime.active?.phaseElapsed || 0;
          this.running = false;
          this.boss.active = false;
          this.encounter.outcome = outcome;
          this.projectiles = [];
          this.boss.patternRuntime.active = null;
          for (const u of this.units) u.ability.interrupt();
          this.cleanupBattleSummons();
          this.combat(outcome, { x: this.boss.x, y: this.boss.y, z: 0, bossPatternElapsed });
        }
        finishFarmBossEvent(outcome) {
          if (this.scene !== "farm" || this.farmBossEvent.phase !== "fighting") return false;
          this.cleanupBattleSummons();
          this.boss.active = false;
          if (this.boss.patternRuntime) this.boss.patternRuntime.active = null;
          this.projectiles = [];
          const encounterId = this.farmBossEvent.encounterId;
          this.farmBossEvent = { phase: "celebrating", elapsed: 0, outcome, encounterId, rewardStatus: "none", rewardChance: 0, rewardRoll: 0, rewardUnitId: 0 };
          for (const u of this.units) if (u.hp > 0) u.ability.interrupt();
          if (outcome === "victory") {
            const settlement = settleBossKill(this, { encounterId, source: "farm", species: this.boss.species, tier: 1, x: this.boss.x, y: this.boss.y });
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
        bossWeaponPoint(q = 0) {
          const b = this.boss, a = b.patternRuntime?.active, config = BOSS_PATTERN_CONFIG[a?.id];
          if (a?.id === "attack.fan-sweep") {
            const angle = a.aim - config.sector / 2 + config.sector * clamp2(q, 0, 1);
            return { x: b.x + Math.cos(angle) * config.reach, y: b.y + Math.sin(angle) * config.reach, z: b.z + 0.2 };
          }
          const reach = b.radius - 0.25 + (CONFIG.raid.sweepReach - b.radius + 0.25) * Math.sin(Math.PI * clamp2(q, 0, 1));
          return { x: b.x + Math.cos(b.angle) * reach, y: b.y + Math.sin(b.angle) * reach, z: b.z + 0.2 };
        }
        livingBossTargets() {
          return this.units.filter((u) => hasFaction(u, FACTION_CONFIG.PLAYER) && u.hp > 0 && u.dropLanded).sort((a, b) => a.id - b.id);
        }
        nearestBossTarget(living, groundOnly = false) {
          const b = this.boss;
          let best = null, distance = Infinity;
          for (const unit of living) {
            if (groundOnly && unit.z > 0.1) continue;
            const next = Math.hypot(unit.x - b.x, unit.y - b.y);
            if (next < distance || next === distance && (!best || unit.id < best.id)) {
              best = unit;
              distance = next;
            }
          }
          return best;
        }
        bossTargetGrid(living) {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) this._rebuildUnitSpatialIndex(this.units);
          const b = this.boss, range = CONFIG.raid.perceptionRange, extent = range + CONFIG.maxUnitRadius, units = this._bossGridUnits, groundUnits = this._bossGroundUnits;
          units.length = 0;
          groundUnits.length = 0;
          this.unitSpatial.queryAABB(b.x - extent, b.y - extent, b.x + extent, b.y + extent, this._bossQueryCandidates);
          for (const unit of this._bossQueryCandidates) {
            if (!this._unitIsActive(unit) || !hasFaction(unit, FACTION_CONFIG.PLAYER) || unit.hp <= 0 || !unit.dropLanded || Math.hypot(unit.x - b.x, unit.y - b.y) > range + unit.radius) continue;
            units.push(unit);
            if (unit.z <= 0.1) groundUnits.push(unit);
          }
          units.sort((a, c) => a.id - c.id);
          groundUnits.sort((a, c) => a.id - c.id);
          return { units, groundUnits, cellSize: 3, range };
        }
        eachBossGridUnit(grid, minX, minY, maxX, maxY, visit, groundOnly = false) {
          this.unitSpatial.queryAABB(minX, minY, maxX, maxY, this._bossQueryCandidates);
          const b = this.boss;
          for (const unit of this._bossQueryCandidates) {
            if (!this._unitIsActive(unit) || !hasFaction(unit, FACTION_CONFIG.PLAYER) || unit.hp <= 0 || !unit.dropLanded || groundOnly && unit.z > 0.1 || Math.hypot(unit.x - b.x, unit.y - b.y) > grid.range + unit.radius) continue;
            visit(unit);
          }
        }
        chargeBossTarget(living, grid = this.bossTargetGrid(living)) {
          const b = this.boss, config = BOSS_PATTERN_CONFIG["attack.charge"];
          if (!grid.units.length) return null;
          const bins = 72, candidates = /* @__PURE__ */ new Map();
          for (const unit of grid.units) {
            const dx = unit.x - b.x, dy = unit.y - b.y, d = Math.hypot(dx, dy), angle = Math.atan2(dy, dx), bin = Math.floor((angle + Math.PI) / (Math.PI * 2) * bins) % bins, current = candidates.get(bin);
            if (!current || d < current.distance - 1e-9 || Math.abs(d - current.distance) <= 1e-9 && unit.id < current.unit.id) candidates.set(bin, { unit, distance: d, angle });
          }
          let best = null;
          for (const candidate of candidates.values()) {
            const end = ArenaGeometry.clamp({ x: b.x + Math.cos(candidate.angle) * config.reach, y: b.y + Math.sin(candidate.angle) * config.reach }, this.scene, b.radius + 0.25), from = { x: b.x, y: b.y, z: b.z }, to = { x: end.x, y: end.y, z: b.z }, extent = b.radius + CONFIG.maxUnitRadius;
            let score = 0;
            this.eachBossGridUnit(grid, Math.min(from.x, to.x) - extent, Math.min(from.y, to.y) - extent, Math.max(from.x, to.x) + extent, Math.max(from.y, to.y) + extent, (unit) => {
              if (ArenaGeometry.sweep(from, to, b.radius, b.height, unit)) score++;
            });
            if (score && (!best || score > best.score || score === best.score && (candidate.distance < best.distance - 1e-9 || Math.abs(candidate.distance - best.distance) <= 1e-9 && candidate.unit.id < best.unit.id))) best = { ...candidate, score };
          }
          return best?.unit || null;
        }
        leapBossTarget(living, grid = this.bossTargetGrid(living)) {
          const b = this.boss, config = BOSS_PATTERN_CONFIG["attack.leap-slam"];
          if (!grid.units.length) return null;
          const candidates = /* @__PURE__ */ new Map(), size = grid.cellSize;
          for (const unit of grid.groundUnits) {
            let dx = unit.x - b.x, dy = unit.y - b.y, d = Math.hypot(dx, dy) || 1;
            if (d > config.reach) {
              dx *= config.reach / d;
              dy *= config.reach / d;
            }
            const point = ArenaGeometry.clamp({ x: b.x + dx, y: b.y + dy }, this.scene, b.radius + 0.25), cellX = Math.floor(point.x / size), cellY = Math.floor(point.y / size), key = (cellY + 64) * 128 + (cellX + 64), distance = Math.hypot(unit.x - b.x, unit.y - b.y), current = candidates.get(key);
            if (!current || distance < current.distance - 1e-9 || Math.abs(distance - current.distance) <= 1e-9 && unit.id < current.unit.id) candidates.set(key, { unit, distance, point });
          }
          let best = null;
          for (const candidate of candidates.values()) {
            let score = 0;
            const extent = config.landingRadius + CONFIG.maxUnitRadius;
            this.eachBossGridUnit(grid, candidate.point.x - extent, candidate.point.y - extent, candidate.point.x + extent, candidate.point.y + extent, (unit) => {
              if (Math.hypot(unit.x - candidate.point.x, unit.y - candidate.point.y) <= config.landingRadius + unit.radius) score++;
            }, true);
            if (score && (!best || score > best.score || score === best.score && (candidate.distance < best.distance - 1e-9 || Math.abs(candidate.distance - best.distance) <= 1e-9 && candidate.unit.id < best.unit.id))) best = { ...candidate, score };
          }
          return best?.unit || null;
        }
        bossPatternTargets(living) {
          const grid = this.bossTargetGrid(living);
          return { nearest: this.nearestBossTarget(living, true), charge: this.chargeBossTarget(living, grid), leap: this.leapBossTarget(living, grid) };
        }
        bossTargetForPattern(id, living) {
          if (id === "attack.charge") return this.chargeBossTarget(living);
          if (id === "attack.leap-slam") return this.leapBossTarget(living);
          return this.nearestBossTarget(living, true);
        }
        eligibleBossPatterns(living, targets = this.bossPatternTargets(living)) {
          const runtime = this.boss.patternRuntime, aliveAdds = this.units.reduce((n, u) => n + (hasFaction(u, FACTION_CONFIG.ENEMY) && u.hp > 0 ? 1 : 0), 0), eligible = [];
          for (const id of BOSS_PATTERN_IDS) {
            if (runtime.cooldowns[id] > 1e-9) continue;
            if (id === "summon.mouth-t1") {
              if (runtime.encounterElapsed + 1e-9 >= BOSS_PATTERN_CONFIG[id].firstEligible && aliveAdds < CONFIG.maxBossSummons) eligible.push(id);
              continue;
            }
            const target = id === "attack.charge" ? targets.charge : id === "attack.leap-slam" ? targets.leap : targets.nearest;
            if (!target) continue;
            if (id === "attack.charge" || id === "attack.leap-slam") eligible.push(id);
            else if (Math.hypot(target.x - this.boss.x, target.y - this.boss.y) <= BOSS_PATTERN_CONFIG[id].reach + target.radius + 1e-9) eligible.push(id);
          }
          return eligible;
        }
        beginBossPattern(id, target) {
          const b = this.boss, runtime = b.patternRuntime, config = BOSS_PATTERN_CONFIG[id];
          if (!config) return false;
          const targetPoint = target ? { x: target.x, y: target.y, z: target.z || 0 } : null, aim = targetPoint ? Math.atan2(targetPoint.y - b.y, targetPoint.x - b.x) : b.angle;
          runtime.active = { id, phase: "windup", phaseElapsed: 0, targetId: target?.id ?? 0, target: targetPoint, aim, locked: false, start: { x: b.x, y: b.y, z: b.z }, traveled: 0, hitIds: /* @__PURE__ */ new Set(), volleyCount: 0, released: 0, nextRelease: 0, path: null };
          b.angle = aim;
          b.facing = aim;
          this.combat("boss-pattern-prepare", { patternId: id, attackKind: id, x: b.x, y: b.y, z: b.z, angle: aim, targetId: runtime.active.targetId });
          return true;
        }
        hitBossPatternUnit(unit, patternId, point, normal = null) {
          const b = this.boss, action = b.patternRuntime.active, config = BOSS_PATTERN_CONFIG[patternId];
          if (!action || !config || !hasFaction(unit, FACTION_CONFIG.PLAYER) || !areOpposingFactions(b, unit) || unit.hp <= 0 || !unit.dropLanded || action.hitIds.has(unit.id)) return false;
          if (config.groundOnly && unit.z > 0.1) return false;
          action.hitIds.add(unit.id);
          const dx = normal?.x ?? unit.x - b.x, dy = normal?.y ?? unit.y - b.y, n = Math.hypot(dx, dy) || 1;
          const guard = this.receiveWalnutGuard(unit), knockbackMultiplier = guard?.receivedKnockbackMultiplier ?? 1;
          unit.knock(dx / n, dy / n, config.knockback * knockbackMultiplier, config.lift * knockbackMultiplier, b);
          if (!hasFaction(unit, FACTION_CONFIG.PLAYER) || !areOpposingFactions(b, unit)) return false;
          applyDamageToTargets(null, [unit], { rawDamage: b.attackPower * config.damageMultiplier * (guard?.receivedDamageMultiplier ?? 1), sourceKind: "enemy" });
          this._syncUnitAliveCount(unit);
          if (unit.hp === 0) {
            unit.down = unit.isBattleOnlySummon ? 0 : CONFIG.corpseRecoverySeconds;
            this.handleUnitDeath(unit);
          }
          const isSweep = patternId === "attack.sweep-360" || patternId === "attack.fan-sweep";
          this.metrics.directHits++;
          this.metrics[isSweep ? "sweepHits" : "basicHits"]++;
          this.combat("unit-hit", { attackKind: patternId, attackId: b.attackId, unit: unit.id, x: point.x, y: point.y, z: Math.max(0.15, unit.z + 0.25), nx: dx / n, ny: dy / n, strength: config.damageMultiplier });
          return true;
        }
        resolveBossSector(action, patternId, range, sector) {
          const b = this.boss, aim = action.aim, half = sector / 2;
          let hits = 0;
          const extent = range + CONFIG.maxUnitRadius;
          for (const unit of this._collectBossTargets(b.x - extent, b.y - extent, b.x + extent, b.y + extent, this._bossHitCandidates, true)) {
            if (action.hitIds.has(unit.id) || unit.z > 0.1) continue;
            const dx = unit.x - b.x, dy = unit.y - b.y, d = Math.hypot(dx, dy);
            if (d > range + unit.radius) continue;
            const offset = Math.atan2(Math.sin(Math.atan2(dy, dx) - aim), Math.cos(Math.atan2(dy, dx) - aim)), pad = d <= unit.radius ? Math.PI : Math.asin(Math.min(1, unit.radius / Math.max(d, 1e-6)));
            if (Math.abs(offset) > half + pad) continue;
            const n = d || 1;
            if (this.hitBossPatternUnit(unit, patternId, { x: unit.x, y: unit.y, z: 0 }, { x: dx / n, y: dy / n })) hits++;
          }
          return hits;
        }
        resolveBossCircle(action, patternId, range) {
          const b = this.boss;
          let hits = 0;
          const extent = range + CONFIG.maxUnitRadius;
          for (const unit of this._collectBossTargets(b.x - extent, b.y - extent, b.x + extent, b.y + extent, this._bossHitCandidates, true)) {
            if (action.hitIds.has(unit.id)) continue;
            const dx = unit.x - b.x, dy = unit.y - b.y, d = Math.hypot(dx, dy);
            if (d > range + unit.radius) continue;
            if (this.hitBossPatternUnit(unit, patternId, { x: b.x + dx / (d || 1) * Math.min(d, range), y: b.y + dy / (d || 1) * Math.min(d, range), z: 0 }, { x: dx / (d || 1), y: dy / (d || 1) })) hits++;
          }
          return hits;
        }
        sweepBossBody(old, patternId) {
          const b = this.boss, action = b.patternRuntime.active, extent = b.radius + CONFIG.maxUnitRadius;
          for (const unit of this._collectBossTargets(Math.min(old.x, b.x) - extent, Math.min(old.y, b.y) - extent, Math.max(old.x, b.x) + extent, Math.max(old.y, b.y) + extent, this._bossHitCandidates)) {
            if (action.hitIds.has(unit.id)) continue;
            const hit = ArenaGeometry.sweep(old, b, b.radius, b.height, unit);
            if (hit) this.hitBossPatternUnit(unit, patternId, hit, patternId === "attack.charge" ? { x: Math.cos(b.patternRuntime.active.aim), y: Math.sin(b.patternRuntime.active.aim) } : null);
          }
        }
        fanBossWeapon(action, q0, q1) {
          const config = BOSS_PATTERN_CONFIG[action.id], span = config.sector, fromAngle = action.aim - span / 2 + span * clamp2(q0, 0, 1), toAngle = action.aim - span / 2 + span * clamp2(q1, 0, 1), b = this.boss;
          const from = { x: b.x + Math.cos(fromAngle) * config.reach, y: b.y + Math.sin(fromAngle) * config.reach, z: 0.2 }, to = { x: b.x + Math.cos(toAngle) * config.reach, y: b.y + Math.sin(toAngle) * config.reach, z: 0.2 };
          const extent = config.reach + config.width + CONFIG.maxUnitRadius;
          for (const unit of this._collectBossTargets(b.x - extent, b.y - extent, b.x + extent, b.y + extent, this._bossHitCandidates, true)) {
            if (action.hitIds.has(unit.id)) continue;
            const hit = ArenaGeometry.sweep(from, to, config.width, 1.4, unit);
            if (hit) {
              const dx = unit.x - b.x, dy = unit.y - b.y, n = Math.hypot(dx, dy) || 1;
              this.hitBossPatternUnit(unit, action.id, hit, { x: dx / n, y: dy / n });
            }
          }
        }
        bossMouthPoint() {
          const anchors = [[176, 210, 160, 350], [140, 112, 142.5, 295], [119, 109, 130, 320], [160, 145, 160, 261], [160, 164, 160, 267], [160, 165, 160, 266]][this.boss.species] || [160, 165, 160, 266], b = this.boss, scale = 2 * b.radius * 1.16 / 220, forward = (anchors[0] - anchors[2]) * scale, vertical = Math.max(0, (anchors[3] - anchors[1]) * scale / 0.785);
          return { x: b.x + Math.cos(b.angle) * forward, y: b.y + Math.sin(b.angle) * forward, z: vertical };
        }
        bossSummonLanding(angle, action = null) {
          const b = this.boss, scene = this.scene, radius = unitRadiusForTier(1);
          for (let i = 0; i < 16; i++) {
            const offset = i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 8, a = angle + offset, candidate = { x: b.x + Math.cos(a) * BOSS_PATTERN_CONFIG["summon.mouth-t1"].landingRadius, y: b.y + Math.sin(a) * BOSS_PATTERN_CONFIG["summon.mouth-t1"].landingRadius };
            if (!ArenaGeometry.inside(candidate, scene, radius)) continue;
            const blocked = this.units.some((unit) => unit.hp > 0 && Math.hypot(unit.x - candidate.x, unit.y - candidate.y) < radius + unit.radius + 0.08) || (action?.landingPoints || []).some((point) => Math.hypot(point.x - candidate.x, point.y - candidate.y) < radius * 2 + 0.08);
            if (!blocked) return candidate;
          }
          return null;
        }
        spawnBossMouthUnit(action) {
          if (action.released >= action.volleyCount) return false;
          const b = this.boss, landing = this.bossSummonLanding(action.aim, action), mouth = this.bossMouthPoint();
          if (!landing) return false;
          const id = CONFIG.bossSummonIdBase + ++this.bossSummonSerial, unit = new Unit(id, b.species, 1, mouth.x, mouth.y), angle = Math.atan2(landing.y - mouth.y, landing.x - mouth.x), flightSeconds = Math.sqrt(2 * mouth.z / CONFIG.gravity), horizontalDistance = Math.hypot(landing.x - mouth.x, landing.y - mouth.y), drag = 0.8, speed = horizontalDistance * drag / (1 - Math.exp(-drag * flightSeconds));
          Object.assign(unit, { ownerId: "boss", farmId: 0, faction: FACTION_CONFIG.ENEMY, home: { x: mouth.x, y: mouth.y }, hp: stats(1, b.species).maxHp, down: 0, isBattleOnlySummon: true, battleSummonKind: "boss-mouth-t1", battleSummonParentId: 0, battleSummonEncounterId: b.encounterId || 1, countsTowardPermanentRoster: false, eligibleForRaidDeployment: false, breedingEligible: false, mergeEligible: false, canSplit: false, usesPersistentSleep: false, lifetime: "until-death-or-battle-end", growthElapsed: unit.growthDuration, growth: CONFIG.matureMeals, meals: 1, deathSplitHandled: false, splitUsedThisBattle: true, dropLanded: false, z: mouth.z, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, vz: 0, landingRecovery: 0, seed: id * 2.39996 });
          this.units.push(unit);
          this._trackUnitAdded(unit);
          action.released++;
          action.landingPoints ||= [];
          action.landingPoints.push(landing);
          this.boss.summonMouth = mouth;
          this.combat("boss-mouth-spit", { patternId: action.id, unit: id, species: b.species, x: mouth.x, y: mouth.y, z: mouth.z, landingX: landing.x, landingY: landing.y, sequence: action.released });
          return true;
        }
        activateBossPattern(action) {
          const b = this.boss, runtime = b.patternRuntime, config = BOSS_PATTERN_CONFIG[action.id];
          action.phase = "active";
          action.phaseElapsed = 0;
          b.attackId = ++this.attackSerial;
          action.hitIds.clear();
          runtime.cooldowns[action.id] = config.cooldown;
          this.combat("boss-pattern-launch", { patternId: action.id, attackKind: action.id, attackId: b.attackId, x: b.x, y: b.y, z: b.z, angle: action.aim, targetId: action.targetId || 0 });
          if (action.id === "attack.sweep-360") {
            this.resolveBossCircle(action, action.id, config.reach);
            this.enterBossPatternRecovery(action);
            return;
          }
          if (action.id === "attack.front-slam") {
            this.resolveBossSector(action, action.id, config.reach, config.sector);
            this.enterBossPatternRecovery(action);
            return;
          }
          if (action.id === "attack.charge") {
            action.start = { x: b.x, y: b.y, z: b.z };
            action.traveled = 0;
            return;
          }
          if (action.id === "attack.leap-slam") {
            let x = action.target?.x ?? b.x, y = action.target?.y ?? b.y, dx = x - b.x, dy = y - b.y, d = Math.hypot(dx, dy);
            if (d > config.reach) {
              x = b.x + dx / d * config.reach;
              y = b.y + dy / d * config.reach;
            }
            const land = ArenaGeometry.clamp({ x, y }, this.scene, b.radius + 0.25);
            action.target = { x: land.x, y: land.y, z: 0 };
            action.path = Ballistics.create({ x: b.x, y: b.y, z: 0 }, action.target, "leap");
            return;
          }
          if (action.id === "summon.mouth-t1") {
            runtime.cooldowns[action.id] = config.cooldown;
            const alive = this.units.reduce((n, u) => n + (hasFaction(u, FACTION_CONFIG.ENEMY) && u.hp > 0 ? 1 : 0), 0);
            action.volleyCount = Math.min(config.volleyCount, Math.max(0, CONFIG.maxBossSummons - alive));
            action.nextRelease = 0;
            this.spawnBossMouthUnit(action);
            action.nextRelease = config.releaseInterval;
            return;
          }
        }
        enterBossPatternRecovery(action) {
          action.phase = "recover";
          action.phaseElapsed = 0;
        }
        updateBossPattern(dt, living) {
          const b = this.boss, runtime = b.patternRuntime;
          runtime.encounterElapsed += dt;
          for (const id of BOSS_PATTERN_IDS) runtime.cooldowns[id] = Math.max(0, (runtime.cooldowns[id] || 0) - dt);
          let action = runtime.active;
          if (!action) {
            const targets = this.bossPatternTargets(living), target = targets.nearest || this.nearestBossTarget(living), eligible = this.eligibleBossPatterns(living, targets), selected = chooseBossPattern(runtime, eligible, () => this.random());
            if (selected) {
              const pick = selected === "summon.mouth-t1" ? target : selected === "attack.charge" ? targets.charge : selected === "attack.leap-slam" ? targets.leap : targets.nearest;
              this.beginBossPattern(selected, pick);
              action = runtime.active;
              if (selected === "summon.mouth-t1") runtime.cooldowns[selected] = BOSS_PATTERN_CONFIG[selected].cooldown;
            } else {
              if (target) {
                const dx = target.x - b.x, dy = target.y - b.y, d = Math.hypot(dx, dy) || 1;
                b.angle = b.facing = Math.atan2(dy, dx);
                const contact2 = b.radius + target.radius + 0.2;
                if (d > contact2) {
                  const amount = Math.min(b.moveSpeed * dt, d - contact2), next = { x: b.x + dx / d * amount, y: b.y + dy / d * amount }, bounded = ArenaGeometry.clamp(next, this.scene, b.radius + 0.25), old = { x: b.x, y: b.y, z: b.z };
                  b.x = bounded.x;
                  b.y = bounded.y;
                  b.travel += Math.hypot(b.x - old.x, b.y - old.y);
                }
              }
              return;
            }
          }
          if (!action) return;
          action.phaseElapsed += dt;
          if (action.phase === "windup") {
            const config2 = BOSS_PATTERN_CONFIG[action.id], remaining = config2.windup - action.phaseElapsed;
            if (!action.locked) {
              const target = this.bossTargetForPattern(action.id, living);
              if (target) {
                action.targetId = target.id;
                action.target = { x: target.x, y: target.y, z: target.z || 0 };
                const desired = Math.atan2(target.y - b.y, target.x - b.x), delta = Math.atan2(Math.sin(desired - action.aim), Math.cos(desired - action.aim));
                action.aim += clamp2(delta, -BOSS_AIM_TURN_RATE * dt, BOSS_AIM_TURN_RATE * dt);
                b.angle = b.facing = action.aim;
              }
              if (remaining <= 0.25 + 1e-9) {
                action.locked = true;
                this.combat("boss-pattern-lock", { patternId: action.id, attackId: b.attackId + 1, targetId: action.targetId || 0, x: action.target?.x ?? b.x, y: action.target?.y ?? b.y, angle: action.aim });
              }
            }
            if (action.phaseElapsed >= config2.windup - 1e-9) this.activateBossPattern(action);
            return;
          }
          const config = BOSS_PATTERN_CONFIG[action.id];
          if (action.phase === "active") {
            if (action.id === "attack.charge") {
              const direction = { x: Math.cos(action.aim), y: Math.sin(action.aim) }, remaining = Math.max(0, config.reach - action.traveled), distance = Math.min(config.speed * dt, remaining), old = { x: b.x, y: b.y, z: b.z }, candidate = { x: b.x + direction.x * distance, y: b.y + direction.y * distance }, bounded = ArenaGeometry.clamp(candidate, this.scene, b.radius + 0.25), hitBoundary = Math.hypot(candidate.x - bounded.x, candidate.y - bounded.y) > 1e-8;
              b.x = bounded.x;
              b.y = bounded.y;
              const moved = Math.hypot(b.x - old.x, b.y - old.y);
              action.traveled += moved;
              b.travel += moved;
              this.sweepBossBody(old, action.id);
              if (hitBoundary || action.traveled >= config.reach - 1e-8 || moved < 1e-8) this.enterBossPatternRecovery(action);
            } else if (action.id === "attack.leap-slam") {
              const old = { x: b.x, y: b.y, z: b.z }, p = Ballistics.sample(action.path, action.phaseElapsed / action.path.duration);
              b.x = p.x;
              b.y = p.y;
              b.z = p.z;
              this.sweepBossBody(old, action.id);
              if (action.phaseElapsed >= action.path.duration) {
                b.x = action.path.to.x;
                b.y = action.path.to.y;
                b.z = 0;
                const extent = config.landingRadius + CONFIG.maxUnitRadius;
                for (const unit of this._collectBossTargets(b.x - extent, b.y - extent, b.x + extent, b.y + extent, this._bossHitCandidates, true)) {
                  if (action.hitIds.has(unit.id)) continue;
                  const dx = unit.x - b.x, dy = unit.y - b.y, d = Math.hypot(dx, dy);
                  if (d <= config.landingRadius + unit.radius) this.hitBossPatternUnit(unit, action.id, { x: unit.x, y: unit.y, z: 0 }, { x: dx / (d || 1), y: dy / (d || 1) });
                }
                this.combat("boss-pattern-land", { patternId: action.id, attackId: b.attackId, x: b.x, y: b.y, z: 0 });
                this.enterBossPatternRecovery(action);
              }
            } else if (action.id === "attack.fan-sweep") {
              const q0 = Math.max(0, (action.phaseElapsed - dt) / config.active), q1 = Math.min(1, action.phaseElapsed / config.active);
              this.fanBossWeapon(action, q0, q1);
              if (action.phaseElapsed >= config.active) this.enterBossPatternRecovery(action);
            } else if (action.id === "summon.mouth-t1") {
              while (action.released < action.volleyCount && action.phaseElapsed + 1e-9 >= action.nextRelease) {
                if (!this.spawnBossMouthUnit(action)) break;
                action.nextRelease += config.releaseInterval;
              }
              if (action.phaseElapsed >= config.active) this.enterBossPatternRecovery(action);
            }
            return;
          }
          if (action.phase === "recover" && action.phaseElapsed >= config.recover) runtime.active = null;
        }
        updateBoss(dt) {
          const b = this.boss;
          if (this.scene === "farm" && this.farmBossEvent.phase !== "idle") {
            const event = this.farmBossEvent;
            if (event.phase === "dropping") {
              event.elapsed += dt;
              b.z = Math.max(0, CONFIG.raid.dropHeight - 0.5 * CONFIG.gravity * event.elapsed * event.elapsed);
              if (b.z === 0) {
                event.phase = "fighting";
                event.elapsed = 0;
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
              if (!this.units.some((u) => hasFaction(u, FACTION_CONFIG.PLAYER) && u.hp > 0 && u.dropLanded)) {
                this.finishFarmBossEvent("defeat");
                return;
              }
            } else if (event.phase === "celebrating") {
              event.elapsed += dt;
              const duration = event.outcome === "defeat" ? CONFIG.farmBossEvent.celebrationSeconds : CONFIG.farmBossEvent.fadeSeconds;
              if (event.elapsed >= duration) {
                event.phase = "fading";
                event.elapsed = 0;
              }
              return;
            } else if (event.phase === "fading") {
              event.elapsed += dt;
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
              b.patternRuntime.active = null;
            }
            return;
          }
          if (this.running && this.raidRosters.length && this.raidRosters.every((r) => r.troops.every((t) => t.deployed)) && !this.units.some((u) => hasFaction(u, FACTION_CONFIG.PLAYER) && u.hp > 0)) {
            this.finish("defeat");
            return;
          }
          const living = this.livingBossTargets();
          if (!living.length) return;
          this.updateBossPattern(dt, living);
        }
      };
    }
  });

  // src/version.js
  var PRODUCT_VERSION, COMPATIBILITY;
  var init_version = __esm({
    "src/version.js"() {
      PRODUCT_VERSION = "0.7.25";
      COMPATIBILITY = PRODUCT_VERSION.split(".").slice(0, 2).join(".");
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
      if (!troop || !Number.isSafeInteger(troop.farmId) || troop.farmId < 1 || !Number.isInteger(troop.species) || troop.species < 0 || troop.species >= SPECIES_COUNT || !isValidUnitTier(troop.tier) || typeof troop.deployed !== "boolean" || manifest.has(troop.farmId)) {
        fail("The owner Raid roster must have unique Farm IDs and valid deployed entries");
      }
      manifest.set(troop.farmId, troop);
    }
    const ownerUnits = raidWorld.units.filter((unit) => unit?.ownerId === ownerId);
    if (ownerUnits.some((unit) => !hasFaction(unit, FACTION_CONFIG.PLAYER))) fail("An enemy-faction actor cannot enter an owner’s Farm settlement");
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
        const validSplit = hasFaction(unit, FACTION_CONFIG.PLAYER) && unit.isBattleOnlySummon === true && unit.battleSummonKind === "pea-death-split" && Number.isSafeInteger(unit.battleSummonParentId) && unit.battleSummonParentId > 0 && parent && parent.ownerId === ownerId && !isBattleOnlySummon(parent) && parent.hp <= 0 && parentTroop?.deployed === true && parent.farmId === unit.farmId && parent.species === 0 && unit.species === 0 && unit.tier === 1 && unit.canSplit === false && unit.countsTowardPermanentRoster === false && unit.eligibleForRaidDeployment === false && unit.breedingEligible === false && unit.mergeEligible === false && unit.usesPersistentSleep === false;
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
    if (outcome === "victory" || outcome === "defeat") {
      advanceFarmBossEncounterEpoch(privateFarm.farmBossProgress);
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
      init_unit_grades();
      init_factions();
      init_species_catalog();
      init_farm_boss_stages();
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
  function normalizeSnapshot(raw, { migrateLegacyRaid = false, clone: clone2 = true } = {}) {
    const resetLegacyCorpseTimers = !Object.hasOwn(raw, "corpseRecoveryVersion"), hasRewardWatermarks = Object.hasOwn(raw, "bossRewardWatermarks");
    if (clone2) raw = structuredClone(raw);
    delete raw.progress;
    if (raw.speed === 1 || raw.speed === 4) delete raw.speed;
    if (resetLegacyCorpseTimers) raw.corpseRecoveryVersion = 1;
    if (!Object.hasOwn(raw, "farmBossProgress")) raw.farmBossProgress = createFarmBossProgress(raw.seed);
    for (const u of raw.units || []) if (!Object.hasOwn(u, "cooldownDuration")) u.cooldownDuration = Math.max(0, Number.isFinite(u.cooldown) ? u.cooldown : 0);
    const base = GARDEN_SHAPE, fill = (v, d) => {
      for (const [k, x] of Object.entries(d)) {
        if (!Object.hasOwn(v, k)) v[k] = structuredClone(x);
        else if (v[k] && x && typeof v[k] === "object" && typeof x === "object" && !Array.isArray(v[k]) && !Array.isArray(x)) fill(v[k], x);
      }
    };
    fill(raw, base);
    if (raw.mergeTask && (!Array.isArray(raw.mergeTask.materialIds) || raw.mergeTask.phase === "animation" && !Number.isSafeInteger(raw.mergeTask.resultId))) raw.mergeTask = null;
    for (const r of raw.raidRosters || []) {
      if (!Object.hasOwn(r, "abilitySnapshot")) r.abilitySnapshot = createAbilityRuntimeSnapshot(createPlayerProgressionState());
      else if (!Object.hasOwn(r.abilitySnapshot, "farmUpgrades")) r.abilitySnapshot.farmUpgrades = structuredClone(createPlayerProgressionState().farmUpgrades);
      if (r.abilitySnapshot?.abilities && typeof r.abilitySnapshot.abilities === "object" && !Array.isArray(r.abilitySnapshot.abilities)) {
        for (const [id, value] of Object.entries(base.playerProgression.abilities)) if (!Object.hasOwn(r.abilitySnapshot.abilities, id)) r.abilitySnapshot.abilities[id] = structuredClone(value);
      }
      if (!Object.hasOwn(r, "settlementSessionId")) r.settlementSessionId = "";
      if (!Object.hasOwn(r, "settlementRunSequence")) r.settlementRunSequence = 0;
      if (!Object.hasOwn(r, "settlementEncounterId")) r.settlementEncounterId = 0;
    }
    const unitDefaults = { walnutEmpoweredNextBasic: false, wheatCommandUntil: 0, wheatCommandCritBonus: 0, barleyArmorBreakUntil: 0, barleyArmorBreakReduction: 0, isBattleOnlySummon: false, battleSummonKind: "", battleSummonParentId: 0, battleSummonEncounterId: 0, countsTowardPermanentRoster: true, eligibleForRaidDeployment: true, breedingEligible: true, mergeEligible: true, canSplit: true, splitUsedThisBattle: false, deathSplitHandled: false, usesPersistentSleep: true, lifetime: "", chestnutBasicCycles: 0, landingRecovery: 0 };
    for (const u of raw.units || []) {
      for (const [key, value] of Object.entries(unitDefaults)) if (!Object.hasOwn(u, key)) u[key] = value;
      if (!Object.hasOwn(u, "faction")) u.faction = legacyUnitFaction(u);
      const action = u.ability?.action;
      if (action && u.species === 4) {
        if (!Object.hasOwn(action, "peanutStrikeCount")) action.peanutStrikeCount = 2;
        if (!Object.hasOwn(action, "peanutAttackMultiplier")) action.peanutAttackMultiplier = 0.5;
        if (!Object.hasOwn(action, "peanutSpreadRadians")) action.peanutSpreadRadians = Math.PI / 12;
      }
      if (action && u.species === 5) {
        if (!Object.hasOwn(action, "walnutEmpowered")) action.walnutEmpowered = false;
        if (!Object.hasOwn(action, "walnutGuardUsed")) action.walnutGuardUsed = false;
      }
    }
    if (!Object.hasOwn(raw.boss, "faction")) raw.boss.faction = FACTION_CONFIG.ENEMY;
    if (!Object.hasOwn(raw.boss, "barleyArmorBreakUntil")) raw.boss.barleyArmorBreakUntil = 0;
    if (!Object.hasOwn(raw.boss, "barleyArmorBreakReduction")) raw.boss.barleyArmorBreakReduction = 0;
    for (const p of raw.projectiles || []) {
      if (!Object.hasOwn(p, "attackMultiplier")) p.attackMultiplier = abilityProfile(p.species).skillMultiplier;
      if (!Object.hasOwn(p, "shotIndex")) p.shotIndex = 0;
      if (!Object.hasOwn(p, "ownerId")) p.ownerId = raw.units.find((u) => u.id === p.owner)?.ownerId || "";
      if (!Object.hasOwn(p, "faction")) p.faction = p.ownerId === "boss" || p.owner >= CONFIG.bossSummonIdBase ? FACTION_CONFIG.ENEMY : FACTION_CONFIG.PLAYER;
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
    if (!Object.hasOwn(raw.boss, "species")) raw.boss.species = 3;
    if (!Object.hasOwn(raw.boss, "encounterId")) raw.boss.encounterId = raw.scene === "raid" && raw.running ? 1 : raw.farmBossEvent?.encounterId || 0;
    if (!Object.hasOwn(raw.boss, "attackPower")) raw.boss.attackPower = 4;
    if (!Object.hasOwn(raw.boss, "moveSpeed")) raw.boss.moveSpeed = CONFIG.raid.chaseSpeed;
    raw.bossSummonSerial = Number.isSafeInteger(raw.bossSummonSerial) ? raw.bossSummonSerial : Math.max(0, ...(raw.units || []).map((u) => Number.isSafeInteger(u?.id) && u.id >= CONFIG.bossSummonIdBase ? u.id - CONFIG.bossSummonIdBase : 0));
    if (raw.scene === "raid" && !raw.boss.active && Number.isFinite(raw.boss.clock)) {
      const ended = raw.notices.findLast((e) => e.kind === "victory" || e.kind === "defeat");
      if (ended && !Object.hasOwn(ended, "bossPatternElapsed")) ended.bossPatternElapsed = raw.boss.clock;
    }
    normalizeBossPatternSnapshot(raw.boss, base.boss.patternRuntime, raw.bossSummonSerial);
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
      raw.boss = structuredClone(base.boss);
      for (const u of raw.units) {
        u.x = u.home?.x ?? u.x;
        u.y = u.home?.y ?? u.y;
        Object.assign(u, { z: 0, vx: 0, vy: 0, vz: 0, stun: 0, down: 0, hp: resolveUnitStats(u).maxHp, dropLanded: true });
        u.ability = { phase: "idle", elapsed: 0, action: null };
      }
    }
    return raw;
  }
  function normalizeBossPatternSnapshot(boss, baseRuntime, bossSummonSerial) {
    if (Object.hasOwn(boss, "phase")) assert(["chase", "windup", "active", "recover", "resting", "strike-windup", "strike", "sweep-windup", "sweep"].includes(boss.phase));
    if (Object.hasOwn(boss, "clock")) assert(Number.isFinite(boss.clock));
    if (Object.hasOwn(boss, "targetId")) assert(Number.isFinite(boss.targetId));
    if (Object.hasOwn(boss, "attackKind")) assert(["basic", "sweep", ...BOSS_PATTERN_IDS].includes(boss.attackKind));
    if (Object.hasOwn(boss, "hit")) assert(Array.isArray(boss.hit) && boss.hit.length <= CONFIG.maxRaidBattleUnits && boss.hit.every((id) => validBattleUnitId(id, bossSummonSerial)) && new Set(boss.hit).size === boss.hit.length);
    if (!boss.patternRuntime || boss.patternRuntime.active === void 0) boss.patternRuntime = structuredClone(baseRuntime);
    if (["strike-windup", "strike", "sweep-windup", "sweep"].includes(boss.phase)) boss.patternRuntime.active = null;
    const action = boss.patternRuntime.active;
    if (action) {
      if (Object.hasOwn(boss, "hit")) assert(Array.isArray(action.hitIds) && boss.hit.length === action.hitIds.length && action.hitIds.every((id) => boss.hit.includes(id)));
    }
    for (const key of ["phase", "clock", "hit", "targetId", "attackKind"]) delete boss[key];
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
    raw = normalizeSnapshot(raw, { migrateLegacyRaid });
    validateSnapshot(raw);
    const g = new Garden();
    Object.assign(g, structuredClone(raw));
    g.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(raw.rng.state);
    if (g.boss.patternRuntime.active) g.boss.patternRuntime.active.hitIds = new Set(raw.boss.patternRuntime.active.hitIds);
    g.units = raw.units.map((data) => {
      const u = Object.assign(new Unit(data.id, data.species, data.tier, data.x, data.y), structuredClone(data));
      u.ability = Object.assign(new AttackCycle(u), structuredClone(data.ability));
      return u;
    });
    g.reconcileMateReservations();
    return g;
  }
  function validateSnapshot(raw) {
    finiteTree(raw);
    shape(raw, GARDEN_SHAPE);
    assert(integer(raw.seed, 0, 4294967295) && integer(raw.rng.state, 0, 4294967295));
    assert(["farm", "raid"].includes(raw.scene) && ["breed", "merge"].includes(raw.mode));
    if (raw.mergeTask !== null) {
      const t = raw.mergeTask;
      assert(raw.scene === "farm" && raw.mode === "merge" && t && ["approach", "animation"].includes(t.phase) && Number.isFinite(t.elapsed) && t.elapsed >= 0 && Number.isFinite(t.duration) && t.duration > 0 && t.duration <= CONFIG.mergeAnimationSeconds + 1e-9 && Array.isArray(t.materialIds) && t.materialIds.length >= 2 && t.materialIds.length <= CONFIG.maxMergeMaterials && new Set(t.materialIds).size === t.materialIds.length && t.materialIds.every((id) => integer(id, 1, CONFIG.maxFarmUnitId)));
      if (t.phase === "approach") {
        const materials = t.materialIds.map((id) => raw.units.find((u) => u.id === id)), first = materials[0], cost = mergeMaterialCostForTier(first?.tier + 1), sameSpeciesCount = raw.units.filter((u) => !u.isBattleOnlySummon && u.species === first?.species).length;
        assert(integer(t.aId, 1, CONFIG.maxFarmUnitId) && integer(t.bId, 1, CONFIG.maxFarmUnitId) && t.aId === t.materialIds[0] && t.bId === t.materialIds[1] && cost === materials.length && first && materials.every((u) => u && u.tier === first.tier && u.species === first.species) && sameSpeciesCount - materials.length + 1 >= 2);
      } else {
        const result = raw.units.find((u) => u.id === t.resultId);
        assert(t.aId === 0 && t.bId === 0 && t.elapsed <= t.duration + 1e-9 && integer(t.resultId, 1, CONFIG.maxFarmUnitId) && result && integer(t.sourceSpecies, 0, CONFIG.maxSpecies - 1) && integer(t.sourceTier, 1, CONFIG.maxTier - 1) && result.species === t.sourceSpecies && result.tier === t.sourceTier + 1 && t.materialIds.length === mergeMaterialCostForTier(result.tier));
      }
    }
    assert(raw.units.length <= (raw.scene === "farm" ? raw.farmBossEvent?.phase === "idle" ? CONFIG.maxFarmCap : CONFIG.maxFarmBattleUnits : CONFIG.maxRaidBattleUnits) && raw.food.length <= 140 && raw.projectiles.length <= CONFIG.maxRaidProjectiles);
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
      assert(reward && integer(reward.encounterId, 1, 1e12) && ["farm", "raid"].includes(reward.source) && reward.encounterId <= raw.bossRewardWatermarks[reward.source] && integer(reward.species, 0, CONFIG.maxSpecies - 1) && integer(reward.tier, 1, CONFIG.maxTier) && Number.isFinite(reward.x) && Number.isFinite(reward.y) && Number.isFinite(reward.chance) && reward.chance >= 0 && reward.chance <= 1 && Number.isFinite(reward.roll) && reward.roll >= 0 && reward.roll < 1 && ["pending", "missed", "granted"].includes(reward.status) && integer(reward.unitId, 0, CONFIG.maxFarmUnitId));
      const key = reward.receiptKey || reward.source + ":" + reward.encounterId;
      assert(!rewardIds.has(key));
      rewardIds.add(key);
      assert(reward.status === "granted" === reward.unitId > 0);
      if (reward.drops !== void 0) {
        assert(Array.isArray(reward.drops) && reward.drops.length <= BOSS_REWARD_SETTINGS.maxStage && integer(reward.rollCount, 0, BOSS_REWARD_SETTINGS.maxStage) && reward.drops.length === reward.rollCount);
        for (const drop of reward.drops) assert(drop && Number.isFinite(drop.roll) && drop.roll >= 0 && drop.roll < 1 && ["pending", "missed", "granted"].includes(drop.status) && integer(drop.unitId, 0, CONFIG.maxFarmUnitId) && drop.status === "granted" === drop.unitId > 0);
        assert(reward.status === (reward.drops.some((drop) => drop.status === "pending") ? "pending" : reward.drops.some((drop) => drop.status === "granted") ? "granted" : "missed"));
      }
      if (reward.receiptKey !== void 0) assert(typeof reward.receiptKey === "string" && reward.receiptKey.length > 0 && reward.receiptKey.length < 256);
      if (reward.acquisitionMultiplier !== void 0) assert(Number.isFinite(reward.acquisitionMultiplier) && reward.acquisitionMultiplier >= 0 && reward.acquisitionMultiplier <= 2);
      if (reward.source === "farm" && reward.status === "granted") assert(reward.unitId < raw.nextId);
    }
    const stageProgress = raw.farmBossProgress;
    assert(stageProgress && integer(stageProgress.currentStage, 1, BOSS_REWARD_SETTINGS.maxStage) && integer(stageProgress.encounterSeed, 0, 4294967295) && integer(stageProgress.encounterEpoch, 0, 1e12) && integer(stageProgress.nextSelectionId, 1, 1e12) && Array.isArray(stageProgress.selections) && stageProgress.selections.length <= BOSS_REWARD_SETTINGS.maxStage);
    const stageIds = /* @__PURE__ */ new Set(), selectionIds = /* @__PURE__ */ new Set();
    for (const selection of stageProgress.selections) {
      assert(selection && integer(selection.stage, 1, BOSS_REWARD_SETTINGS.maxStage) && integer(selection.species, 0, CONFIG.maxSpecies - 1) && integer(selection.selectionId, 1, stageProgress.nextSelectionId - 1) && !stageIds.has(selection.stage) && !selectionIds.has(selection.selectionId));
      stageIds.add(selection.stage);
      selectionIds.add(selection.selectionId);
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
    assert(raw.corpseRecoveryVersion === 1 && integer(raw.nextId, 1, 1e9) && integer(raw.bossSummonSerial, 0, 1e12) && integer(raw.foodTaps.remainder, 0, 4) && raw.foodTaps.autoClock >= 0 && raw.foodTaps.autoClock < 0.51);
    assert(Array.isArray(raw.raidExpectedPlayers) && raw.raidExpectedPlayers.length >= 1 && raw.raidExpectedPlayers.length <= CONFIG.maxRaidPlayers && raw.raidExpectedPlayers.every((p) => typeof p === "string" && p.length > 0) && new Set(raw.raidExpectedPlayers).size === raw.raidExpectedPlayers.length && Array.isArray(raw.raidRosters));
    const rosterOwners = /* @__PURE__ */ new Set(), manifest = /* @__PURE__ */ new Set();
    for (const r of raw.raidRosters) {
      assert(raw.raidExpectedPlayers.includes(r.ownerId) && !rosterOwners.has(r.ownerId) && Array.isArray(r.troops) && r.troops.length <= CONFIG.maxRaidPlayerUnits && isValidAbilityRuntimeSnapshot(r.abilitySnapshot));
      assert(typeof r.settlementSessionId === "string" && r.settlementSessionId.length <= 128 && integer(r.settlementRunSequence, 0, 1e12) && integer(r.settlementEncounterId, 0, 1e12));
      assert(r.settlementRunSequence === 0 ? r.settlementSessionId === "" && r.settlementEncounterId === 0 : r.settlementSessionId.trim().length > 0 && r.settlementEncounterId === r.settlementRunSequence);
      rosterOwners.add(r.ownerId);
      const ids2 = /* @__PURE__ */ new Set();
      for (const t of r.troops) {
        assert(integer(t.farmId, 1, CONFIG.maxFarmUnitId) && integer(t.species, 0, CONFIG.maxSpecies - 1) && integer(t.tier, 1, CONFIG.maxTier) && typeof t.deployed === "boolean" && !ids2.has(t.farmId));
        ids2.add(t.farmId);
        manifest.add(r.ownerId + ":" + t.farmId);
      }
      assert(integer(r.lastDeploySequence, 0, r.troops.length) && r.lastDeploySequence === r.troops.filter((t) => t.deployed).length && Number.isFinite(r.buffUntil) && Number.isFinite(r.buffReadyAt) && r.buffUntil >= 0 && r.buffReadyAt >= 0);
    }
    assert(manifest.size <= CONFIG.maxRaidUnits);
    const ids = /* @__PURE__ */ new Set(), deployed = /* @__PURE__ */ new Set(), mateIdLimit = raw.scene === "raid" ? CONFIG.maxRaidPlayers * CONFIG.raidPlayerIdStride + CONFIG.maxRaidPlayerUnits : CONFIG.maxFarmUnitId;
    const unitsById = /* @__PURE__ */ new Map(), summonsByParent = /* @__PURE__ */ new Map();
    for (const u of raw.units) {
      shape(u, UNIT_SHAPE);
      assert(Number.isFinite(u.growthElapsed) && u.growthElapsed >= 0 && Number.isFinite(u.growthDuration) && u.growthDuration > 0 && u.growthElapsed <= u.growthDuration + 1e-9 && Number.isFinite(u.cooldown) && u.cooldown >= 0 && Number.isFinite(u.cooldownDuration) && u.cooldownDuration >= u.cooldown - 1e-9 && u.cooldownDuration <= 1e5 && integer(u.mateId, 0, mateIdLimit) && Number.isFinite(u.perceptionRange) && u.perceptionRange > 0 && u.perceptionRange <= 100 && Number.isFinite(u.down) && u.down >= 0 && u.down <= CONFIG.corpseRecoverySeconds && integer(u.battleSummonEncounterId, 0, 1e12) && Number.isFinite(u.landingRecovery) && u.landingRecovery >= 0 && u.landingRecovery <= 0.25 + 1e-9 && Number.isFinite(u.wheatCommandUntil) && u.wheatCommandUntil >= 0 && u.wheatCommandUntil <= 1e12 && Number.isFinite(u.wheatCommandCritBonus) && u.wheatCommandCritBonus >= 0 && u.wheatCommandCritBonus <= 0.5 && Number.isFinite(u.barleyArmorBreakUntil) && u.barleyArmorBreakUntil >= 0 && u.barleyArmorBreakUntil <= 1e12 && Number.isFinite(u.barleyArmorBreakReduction) && u.barleyArmorBreakReduction >= 0 && u.barleyArmorBreakReduction <= 0.75);
      assert(integer(u.species, 0, CONFIG.maxSpecies - 1) && integer(u.tier, 1, CONFIG.maxTier) && ["idle", "windup", "active", "recover"].includes(u.ability.phase) && typeof u.ownerId === "string" && Number.isSafeInteger(u.farmId) && Object.values(FACTION_CONFIG).includes(u.faction) && typeof u.dropLanded === "boolean" && typeof u.isBattleOnlySummon === "boolean" && typeof u.splitUsedThisBattle === "boolean" && typeof u.deathSplitHandled === "boolean" && typeof u.walnutEmpoweredNextBasic === "boolean" && integer(u.chestnutBasicCycles, 0, 1e12));
      if (u.hp <= 0) assert(u.down > 0 && !u.isBattleOnlySummon);
      else assert(u.down === 0);
      if (hasFaction(u, FACTION_CONFIG.ENEMY)) assert(u.isBattleOnlySummon && u.battleSummonKind === "boss-mouth-t1" && u.ownerId === "boss" && u.farmId === 0);
      else assert(u.battleSummonKind !== "boss-mouth-t1" && u.ownerId !== "boss");
      assert(!ids.has(u.id));
      ids.add(u.id);
      unitsById.set(u.id, u);
      if (u.isBattleOnlySummon) {
        if (hasFaction(u, FACTION_CONFIG.PLAYER) && u.battleSummonKind === "pea-death-split") {
          assert(["farm", "raid"].includes(raw.scene) && integer(u.battleSummonParentId, 1, Number.MAX_SAFE_INTEGER) && u.battleSummonEncounterId === 0 && u.species === 0 && u.tier === 1 && u.canSplit === false && u.countsTowardPermanentRoster === false && u.eligibleForRaidDeployment === false && u.breedingEligible === false && u.mergeEligible === false && u.usesPersistentSleep === false && u.lifetime === "until-death-or-battle-end" && u.deathSplitHandled === false && u.splitUsedThisBattle === true && u.hp > 0);
          const parent = unitsById.get(u.battleSummonParentId);
          assert(parent && hasFaction(parent, FACTION_CONFIG.PLAYER) && parent.isBattleOnlySummon === false && parent.hp <= 0 && parent.species === 0 && parent.splitUsedThisBattle && parent.ownerId === u.ownerId && parent.farmId === u.farmId);
          const list = summonsByParent.get(parent.id) || [];
          list.push(u);
          summonsByParent.set(parent.id, list);
          if (raw.scene === "raid") assert(u.id >= CONFIG.raidSummonIdBase && u.id < CONFIG.raidSummonIdBase + CONFIG.maxRaidBattleUnits && raw.raidExpectedPlayers.includes(u.ownerId) && integer(u.farmId, 1, CONFIG.maxFarmUnitId));
          else assert(integer(u.id, 1, raw.nextId - 1) && raw.farmBossEvent.phase !== "idle");
        } else {
          assert(u.battleSummonKind === "boss-mouth-t1" && u.battleSummonParentId === 0 && integer(u.battleSummonEncounterId, 1, 1e12) && u.battleSummonEncounterId === raw.boss.encounterId && u.species === raw.boss.species && u.tier === 1 && u.ownerId === "boss" && u.farmId === 0 && u.canSplit === false && u.countsTowardPermanentRoster === false && u.eligibleForRaidDeployment === false && u.breedingEligible === false && u.mergeEligible === false && u.usesPersistentSleep === false && u.lifetime === "until-death-or-battle-end" && u.deathSplitHandled === false && u.splitUsedThisBattle === true && u.hp > 0 && u.battleSummonEncounterId > 0 && u.id >= CONFIG.bossSummonIdBase && u.id <= CONFIG.bossSummonIdBase + raw.bossSummonSerial);
          assert(raw.scene === "raid" ? raw.running && raw.boss.active : raw.farmBossEvent.phase === "fighting");
        }
      } else {
        assert(u.battleSummonKind === "" && u.battleSummonParentId === 0 && u.battleSummonEncounterId === 0 && u.countsTowardPermanentRoster === true && u.eligibleForRaidDeployment === true && u.breedingEligible === true && u.mergeEligible === true && u.canSplit === true && u.usesPersistentSleep === true && u.lifetime === "");
        if (raw.scene === "raid") {
          const roster = raw.raidRosters.find((r) => r.ownerId === u.ownerId), troopIndex = roster?.troops.findIndex((t) => t.farmId === u.farmId) ?? -1, slot = raw.raidExpectedPlayers.indexOf(u.ownerId), currentId = (slot + 1) * CONFIG.raidPlayerIdStride + troopIndex + 1, legacyId = (slot + 1) * CONFIG.raidPlayerIdStride + u.farmId;
          assert(raw.raidExpectedPlayers.includes(u.ownerId) && integer(u.farmId, 1, CONFIG.maxFarmUnitId) && manifest.has(u.ownerId + ":" + u.farmId) && !deployed.has(u.ownerId + ":" + u.farmId) && (u.id === currentId || u.farmId <= CONFIG.maxFarmCap && u.id === legacyId));
          deployed.add(u.ownerId + ":" + u.farmId);
        } else assert(integer(u.id, 1, raw.nextId - 1));
      }
      if (u.ability.action) {
        const a = u.ability.action;
        assert(integer(a.id, 1, raw.attackSerial) && typeof a.hit === "boolean" && a.target && Number.isFinite(a.target.x) && Number.isFinite(a.target.y));
        if (u.species === 4) {
          assert(integer(a.peanutStrikeCount, 2, 5) && Number.isFinite(a.peanutAttackMultiplier) && a.peanutAttackMultiplier > 0 && a.peanutAttackMultiplier <= 10 && Number.isFinite(a.peanutSpreadRadians) && a.peanutSpreadRadians >= 0 && a.peanutSpreadRadians <= Math.PI / 6);
          const mask = (1 << a.peanutStrikeCount) - 1;
          assert(integer(a.resolvedMask, 0, mask) && integer(a.hitMask, 0, mask) && (a.hitMask & ~a.resolvedMask) === 0);
        }
        if (u.species === 5) assert(typeof a.walnutEmpowered === "boolean" && typeof a.walnutGuardUsed === "boolean");
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
      assert(integer(p.owner, 1, raw.scene === "raid" ? CONFIG.raidSummonIdBase + CONFIG.maxRaidBattleUnits - 1 : raw.nextId - 1) || integer(p.owner, CONFIG.bossSummonIdBase + 1, CONFIG.bossSummonIdBase + raw.bossSummonSerial));
      assert(p.targetId === void 0 || p.targetId === "boss" || validBattleUnitId(p.targetId, raw.bossSummonSerial));
      assert(Object.values(FACTION_CONFIG).includes(p.faction) && typeof p.ownerId === "string" && integer(p.species, 0, CONFIG.maxSpecies - 1) && integer(p.tier, 1, CONFIG.maxTier) && typeof p.hit === "boolean" && Number.isFinite(p.attackMultiplier) && p.attackMultiplier > 0 && p.attackMultiplier <= 10 && integer(p.shotIndex, 0, 4));
      if (p.isPopcorn) {
        assert(typeof p.landed === "boolean" && typeof p.exploded === "boolean" && Array.isArray(p.damagedTargetIds) && p.damagedTargetIds.length <= CONFIG.maxRaidBattleUnits + 1 && p.damagedTargetIds.every((id) => id === "boss" || validBattleUnitId(id, raw.bossSummonSerial)) && new Set(p.damagedTargetIds).size === p.damagedTargetIds.length && Number.isFinite(p.fuseRemaining) && p.fuseRemaining >= 0 && p.fuseRemaining <= 1.01);
        validatePopcornConfig(p.popcornConfig);
        if (p.exploded) assert(Number.isFinite(p.explosionLife) && p.explosionLife >= 0 && p.explosionLife < 0.5 + 1e-9);
      }
    }
    assert(integer(raw.projectileSerial, 0, 1e12) && integer(raw.raidSummonSerial, 0, CONFIG.maxRaidBattleUnits) && integer(raw.bossSummonSerial, 0, 1e12));
    assert(hasFaction(raw.boss, FACTION_CONFIG.ENEMY) && raw.boss.hp >= 0 && raw.boss.hp <= raw.boss.maxHp && integer(raw.boss.species, 0, CONFIG.maxSpecies - 1) && raw.boss.maxHp > 0 && integer(raw.boss.stage, 0, BOSS_REWARD_SETTINGS.maxStage) && Number.isFinite(raw.boss.attackPower) && raw.boss.attackPower >= 4 && Number.isFinite(raw.boss.moveSpeed) && raw.boss.moveSpeed > 0 && integer(raw.boss.encounterId, 0, 1e12) && raw.boss.radius === CONFIG.raid.bossRadius && raw.boss.height === CONFIG.raid.bossHeight && Number.isFinite(raw.boss.barleyArmorBreakUntil) && raw.boss.barleyArmorBreakUntil >= 0 && raw.boss.barleyArmorBreakUntil <= 1e12 && Number.isFinite(raw.boss.barleyArmorBreakReduction) && raw.boss.barleyArmorBreakReduction >= 0 && raw.boss.barleyArmorBreakReduction <= 0.75);
    if (raw.boss.stage === 0) assert(raw.boss.attackPower === 4);
    else {
      const stageStats = bossStageStats(raw.boss.stage);
      assert(raw.boss.maxHp === stageStats.hp && raw.boss.attackPower === stageStats.attackPower);
    }
    const runtime = raw.boss.patternRuntime;
    assert(runtime && Number.isFinite(runtime.encounterElapsed) && runtime.encounterElapsed >= 0 && runtime.weights && runtime.cooldowns);
    for (const id of BOSS_PATTERN_IDS) {
      assert(Number.isFinite(runtime.weights[id]) && runtime.weights[id] >= 0 && runtime.weights[id] <= 3 && Number.isFinite(runtime.cooldowns[id]) && runtime.cooldowns[id] >= 0 && runtime.cooldowns[id] <= 10);
    }
    assert(Object.keys(runtime.weights).length === BOSS_PATTERN_IDS.length && Object.keys(runtime.cooldowns).length === BOSS_PATTERN_IDS.length);
    if (runtime.active) {
      const a = runtime.active;
      assert(BOSS_PATTERN_IDS.includes(a.id) && ["windup", "active", "recover"].includes(a.phase) && Number.isFinite(a.phaseElapsed) && a.phaseElapsed >= 0 && Number.isFinite(a.aim) && (a.targetId === 0 || validBattleUnitId(a.targetId, raw.bossSummonSerial)) && typeof a.locked === "boolean" && Array.isArray(a.hitIds) && a.hitIds.length <= CONFIG.maxRaidBattleUnits && a.hitIds.every((id) => validBattleUnitId(id, raw.bossSummonSerial)) && new Set(a.hitIds).size === a.hitIds.length && integer(a.released, 0, 4) && integer(a.volleyCount, 0, 4));
      if (a.target) assert(Number.isFinite(a.target.x) && Number.isFinite(a.target.y) && Number.isFinite(a.target.z));
      if (a.path) validatePath(a.path);
    }
    assert(["idle", "fighting", "victory", "defeat"].includes(raw.encounter.outcome) && raw.encounter.elapsed >= 0);
    assert(raw.running === (raw.encounter.outcome === "fighting"));
    assert(typeof raw.raidDeploymentStarted === "boolean" && (!raw.raidDeploymentStarted || raw.raidRosters.length === raw.raidExpectedPlayers.length));
    return true;
  }
  function validatePath(p) {
    assert(p && p.from && p.to && p.duration > 0 && Number.isFinite(p.height));
    for (const k of ["x", "y"]) assert(Number.isFinite(p.from[k]) && Number.isFinite(p.to[k]));
    assert(Number.isFinite(p.from.z));
  }
  function validatePopcornConfig(c) {
    assert(c && c.species === 1 && c.fuseSeconds === 1 && c.chainOnPopcornContact === true && c.triggersOncePerProjectile === true && c.eachTargetAtMostOncePerProjectile === true && Number.isFinite(c.damageMultiplier) && c.damageMultiplier >= 0.5 && c.damageMultiplier <= 1.5 && c.radiusBaseRangeFraction === 0.25 && Number.isFinite(c.radiusMultiplier) && c.radiusMultiplier >= 1 && c.radiusMultiplier <= 2 && Number.isFinite(c.radius) && c.radius > 0 && c.radius <= 10);
  }
  var GARDEN_SHAPE, UNIT_SHAPE, integer, validBattleUnitId;
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
      init_unit_grades();
      init_boss_patterns();
      init_boss_rewards();
      init_farm_boss_stages();
      init_factions();
      GARDEN_SHAPE = snapshot(new Garden());
      UNIT_SHAPE = snapshot(new Unit(1, 0, 1, 0, 0));
      integer = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
      validBattleUnitId = (id, bossSummonSerial) => integer(id, 1, CONFIG.maxFarmUnitId) || integer(id, CONFIG.bossSummonIdBase + 1, CONFIG.bossSummonIdBase + bossSummonSerial);
    }
  });

  // src/farm-storage.js
  var farm_storage_exports = {};
  __export(farm_storage_exports, {
    FarmStorage: () => FarmStorage,
    parseSave: () => parseSave,
    saveHasLegacyFarmProgress: () => saveHasLegacyFarmProgress,
    validateSave: () => validateSave
  });
  function saveData(text) {
    if (typeof text !== "string" || text.length > MAX_BYTES) throw Error("저장 파일이 너무 큽니다.");
    const parsed = JSON.parse(text);
    if (parsed.schema !== "budmori-farm" || !isReadableCompatibility(parsed.productVersion) || !parsed.world || typeof parsed.world !== "object" || Array.isArray(parsed.world)) throw Error("이 저장은 현재 " + COMPATIBILITY + " 버전과 호환되지 않습니다. 원본을 내보내 보관한 뒤 새 정원을 시작해 주세요.");
    return parsed;
  }
  function normalizedSaveData(text) {
    const parsed = saveData(text), world = normalizeSnapshot(parsed.world, { migrateLegacyRaid: true });
    validateSnapshot(world);
    return world;
  }
  function saveHasLegacyFarmProgress(text) {
    try {
      return Object.hasOwn(saveData(text).world, "progress");
    } catch {
      return false;
    }
  }
  function validateSave(text) {
    normalizedSaveData(text);
    return true;
  }
  function parseSave(text) {
    return restore(saveData(text).world, { migrateLegacyRaid: true });
  }
  function readLegacyBackup() {
    try {
      const preferred = localStorage.getItem(BACKUP_LATEST);
      if (preferred?.startsWith(BACKUP_PREFIX)) {
        const raw = localStorage.getItem(preferred);
        if (raw) return { key: preferred, raw };
      }
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(BACKUP_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) return { key, raw };
        }
      }
    } catch {
    }
    return null;
  }
  function preserveLegacySave(text) {
    if (!saveHasLegacyFarmProgress(text)) return null;
    const digest = Array.from(text).reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
    let key = BACKUP_PREFIX + digest.toString(16).padStart(8, "0"), suffix = 0;
    while (localStorage.getItem(key) !== null && localStorage.getItem(key) !== text) key = BACKUP_PREFIX + digest.toString(16).padStart(8, "0") + "-" + ++suffix;
    localStorage.setItem(key, text);
    try {
      localStorage.setItem(BACKUP_LATEST, key);
    } catch {
    }
    return { key, raw: text };
  }
  var KEY, LEGACY_KEY, MAX_BYTES, BACKUP_PREFIX, BACKUP_LATEST, READ_COMPATIBILITIES, legacyCompatibility, isReadableCompatibility, FarmStorage;
  var init_farm_storage = __esm({
    "src/farm-storage.js"() {
      init_version();
      init_farm_state();
      KEY = "bloom-weapon-cards-v4";
      LEGACY_KEY = "bloom-weapon-cards-v3";
      MAX_BYTES = 2 * 1024 * 1024;
      BACKUP_PREFIX = "bloom-weapon-cards-legacy-backup-";
      BACKUP_LATEST = "bloom-weapon-cards-legacy-backup-latest";
      READ_COMPATIBILITIES = /* @__PURE__ */ new Set([COMPATIBILITY, "0.6", "0.5", "0.4"]);
      legacyCompatibility = (version) => typeof version === "string" ? version.split(".").slice(0, 2).join(".") : "";
      isReadableCompatibility = (version) => READ_COMPATIBILITIES.has(legacyCompatibility(version));
      FarmStorage = class {
        constructor() {
          this.raw = null;
          this._world = null;
          this.savedSnapshot = null;
          this.error = "";
          this.writable = false;
          this.legacyRaw = null;
          this.legacyCompatible = false;
          this.legacyBackupRequired = false;
          this.legacyBackup = readLegacyBackup();
          this.migrationNotice = "";
          try {
            this.raw = localStorage.getItem(KEY);
            this.legacyRaw = localStorage.getItem(LEGACY_KEY);
            if (this.raw) {
              if (!isReadableCompatibility(saveData(this.raw).productVersion)) throw Error("현재 저장은 호환되지 않는 버전입니다. 원본 키는 그대로 보존했어요.");
              if (saveHasLegacyFarmProgress(this.raw)) {
                this.legacyBackupRequired = true;
                try {
                  this.legacyBackup = preserveLegacySave(this.raw);
                  this.legacyBackupRequired = false;
                  this.migrationNotice = "이전 활동 기반 강화가 종료되고 경험치 포인트로 통합됐어요. 기존 무료 강화는 초기화되며, 원본 저장은 별도 백업했어요.";
                } catch {
                  throw Error("이전 저장 원본을 백업하지 못해 덮어쓰지 않았어요. 저장 공간을 비우거나 저장 파일을 내보낸 뒤 다시 시도해 주세요.");
                }
              }
              this.savedSnapshot = normalizedSaveData(this.raw);
            } else if (this.legacyRaw) {
              try {
                validateSave(this.legacyRaw);
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
        get world() {
          if (!this._world && this.savedSnapshot) this._world = restore(this.savedSnapshot);
          return this._world;
        }
        get hasWorld() {
          return !!(this._world || this.savedSnapshot);
        }
        get hasReservedRaid() {
          const world = this._world || this.savedSnapshot;
          return world?.activeRaidRunSequence !== null && world?.activeRaidRunSequence !== void 0;
        }
        set world(value) {
          this._world = value;
          this.savedSnapshot = null;
        }
        serializeCheckpoint(world) {
          const data = normalizeSnapshot(snapshot(world), { clone: false });
          validateSnapshot(data);
          const text = JSON.stringify({ schema: "budmori-farm", productVersion: PRODUCT_VERSION, world: data });
          if (text.length > MAX_BYTES) throw Error("저장 파일이 너무 큽니다.");
          return { data, text };
        }
        encode(world) {
          return this.serializeCheckpoint(world).text;
        }
        refresh() {
          if (!this.writable) return false;
          try {
            const text = localStorage.getItem(KEY);
            if (text === this.raw) return true;
            if (!text) throw Error("농장 저장을 찾지 못했어요. 다른 탭에서 새 정원을 시작했을 수 있어요.");
            if (saveHasLegacyFarmProgress(text)) {
              this.legacyBackupRequired = true;
              this.legacyBackup = preserveLegacySave(text);
              this.legacyBackupRequired = false;
              this.migrationNotice = "이전 활동 기반 강화가 종료되고 경험치 포인트로 통합됐어요. 기존 무료 강화는 초기화되며, 원본 저장은 별도 백업했어요.";
            }
            const data = normalizedSaveData(text);
            this.raw = text;
            this.savedSnapshot = data;
            this._world = null;
            this.error = "";
            return true;
          } catch (e) {
            this.error = this.legacyBackupRequired ? "이전 저장 원본을 백업하지 못해 덮어쓰지 않았어요. 저장 공간을 비우거나 저장 파일을 내보낸 뒤 다시 시도해 주세요." : e.message || "저장을 다시 읽지 못했어요.";
            return false;
          }
        }
        save(world) {
          if (!this.writable || this.legacyBackupRequired) return false;
          try {
            if (localStorage.getItem(KEY) !== this.raw) {
              this.error = "저장 내용이 다른 탭에서 바뀌었어요. 이 탭을 새로고침해 이어가 주세요.";
              return false;
            }
            const { data, text } = this.serializeCheckpoint(world);
            localStorage.setItem(KEY, text);
            this.raw = text;
            this.savedSnapshot = data;
            this._world = null;
            this.error = "";
            return true;
          } catch {
            this.error = "저장 공간을 사용할 수 없어요. 기존 저장은 보존했어요. 저장 내보내기로 보관해 주세요.";
            return false;
          }
        }
        replace(world) {
          if (this.legacyBackupRequired) return false;
          this.writable = true;
          this.world = world;
          return this.save(world);
        }
        import(text) {
          if (this.legacyBackupRequired) throw Error("이전 저장 원본을 백업하지 못해 불러오기를 취소했어요. 기존 저장은 그대로입니다.");
          if (localStorage.getItem(KEY) !== this.raw) throw Error("저장 내용이 다른 탭에서 바뀌었어요. 새로고침한 뒤 다시 불러와 주세요.");
          validateSave(text);
          if (saveHasLegacyFarmProgress(text)) {
            this.legacyBackupRequired = true;
            try {
              this.legacyBackup = preserveLegacySave(text);
              this.legacyBackupRequired = false;
            } catch {
              throw Error("이전 저장 원본을 백업하지 못해 불러오기를 취소했어요. 기존 저장은 그대로입니다.");
            }
            this.migrationNotice = "이전 활동 기반 강화가 종료되고 경험치 포인트로 통합됐어요. 기존 무료 강화는 초기화되며, 원본 저장은 별도 백업했어요.";
          }
          const world = parseSave(text), { data, text: normalized } = this.serializeCheckpoint(world);
          localStorage.setItem(KEY, normalized);
          this.raw = normalized;
          this.savedSnapshot = data;
          this._world = world;
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
  function farmBreedingCooldown(unit, world, defaultDuration = 10, result = {}) {
    if (world?.scene !== "farm" || unit?.hp <= 0 || unit?.down > 0 || unit?.cooldown <= 0 || unit?.meals !== 0) return null;
    const duration = unit.cooldownDuration || world.breedCooldownDuration?.() || defaultDuration;
    const remaining = Math.max(0, unit.cooldown);
    result.remaining = remaining;
    result.duration = duration;
    result.progress = Math.max(0, Math.min(1, 1 - remaining / duration));
    return result;
  }
  function farmSleepSeconds(unit, scene) {
    if (scene !== "farm" || unit?.hp > 0 || !Number.isFinite(unit?.down) || unit.down <= 0) return 0;
    return Math.ceil(unit.down);
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
  init_unit_grades();

  // src/attack-telegraph.js
  function capsuleContourPoints(area, segments = 12) {
    const { x, y, width, startRadius, endRadius, angle } = area || {};
    if (![x, y, width, startRadius, endRadius, angle].every(Number.isFinite) || width <= 0 || startRadius < 0 || endRadius < startRadius) {
      throw new TypeError("A finite capsule attack area is required");
    }
    if (!Number.isSafeInteger(segments) || segments < 4 || segments > 64) {
      throw new RangeError("Capsule arc segments must be an integer from 4 through 64");
    }
    const forward = { x: Math.cos(angle), y: Math.sin(angle) };
    const side = { x: -forward.y, y: forward.x };
    const start2 = { x: x + forward.x * startRadius, y: y + forward.y * startRadius };
    const end = { x: x + forward.x * endRadius, y: y + forward.y * endRadius };
    const arcPoint = (center, theta) => ({
      x: center.x + width * (forward.x * Math.cos(theta) + side.x * Math.sin(theta)),
      y: center.y + width * (forward.y * Math.cos(theta) + side.y * Math.sin(theta))
    });
    const points = [arcPoint(start2, Math.PI / 2), arcPoint(end, Math.PI / 2)];
    for (let i = 1; i <= segments; i++) points.push(arcPoint(end, Math.PI / 2 - Math.PI * i / segments));
    points.push(arcPoint(start2, -Math.PI / 2));
    for (let i = 1; i < segments; i++) points.push(arcPoint(start2, -Math.PI / 2 - Math.PI * i / segments));
    return points;
  }

  // src/farm-renderer.js
  init_boss_patterns();
  var { bosses: BOSS_VECTOR_ASSETS, troops: TROOP_VECTOR_ASSETS } = globalThis.BudmoriVectorResources;
  var { WebGLDevice, VectorContext, MeshRenderer } = globalThis.BloomGamekitRendering;
  var { createVectorAsset } = globalThis.BloomGamekitVectorAssets;
  var TIER_OUTLINE_COLORS = UNIT_GRADES.map(({ outlineColor }) => {
    const rgb = outlineColor.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i).slice(1).map((value) => parseInt(value, 16) / 255);
    return [...rgb, 1];
  });
  function unitMotion(u, sim) {
    const dead = u.hp <= 0 || u.down > 0, airborne = !u.dropLanded || u.z > 0.1, phase = u.ability?.phase || "idle";
    const moving = Math.hypot(u.vx || 0, u.vy || 0) > 0.18, kind = UNIT_ABILITY_PROFILES[u.species]?.kind;
    if (dead) return "death";
    if (sim.scene === "raid" && sim.encounter?.outcome === "victory") return "victory";
    if (airborne) return "airborne";
    if (u.stun > 0) return "hit";
    if (u.bounce > 0.04) return "landing";
    if (phase === "windup") return "windup";
    if (phase === "active") return kind === "peanut-dual-strike" && u.ability.peanutStrikeCount > 2 ? `fire-${u.ability.peanutStrikeCount}` : "fire";
    if (phase === "recover") return kind === "lob" && u.ability?.action?.path && u.ability.elapsed < 0.12 ? "fire" : "recover";
    return moving ? "walk" : "idle";
  }
  function motionElapsedMs(u, name, clip) {
    if (name === "idle" || name === "walk" || name === "airborne") return (u.seed || 0) * 80 % clip.durationMs;
    if (name === "windup" || name === "fire" || name.startsWith("fire-") || name === "recover") return clamp2((u.ability?.elapsed || 0) * 1e3, 0, clip.durationMs);
    if (name === "hit") return clip.durationMs * (1 - clamp2((u.stun || 0) / 0.5, 0, 1));
    if (name === "landing") return clip.durationMs * (1 - clamp2((u.bounce || 0) / 0.22, 0, 1));
    if (name === "victory") return Math.abs(u.seed || 0) * 97.531 % clip.durationMs;
    return clip.durationMs;
  }
  function unitExpression(u, sim, joyEffects) {
    const dead = u.hp <= 0 || u.down > 0, airborne = !u.dropLanded || u.z > 0.5;
    const phase = u.ability?.phase;
    const restingCooldown = sim.scene === "farm" && u.cooldown > 0 && phase === "idle";
    if (dead) return "dead";
    if (sim.scene === "raid" && sim.encounter?.outcome === "victory") return "happy";
    if (u.stun > 0) return "hurt";
    if (airborne) return "surprised";
    if (u.walnutGuarding) return "guard";
    if (phase === "windup") return "focused";
    if (phase === "active") return "attack";
    if (restingCooldown) return "neutral";
    if (sim.scene === "farm") {
      for (const e of joyEffects) if (Math.hypot(e.x - u.x, e.y - u.y) < 1.2) return "happy";
      if (!u.fed) return "hungry";
    }
    return "neutral";
  }
  function renderedBossAttackArea(boss, unitRadius = 0) {
    if (!boss?.patternId || boss.patternPhase === "recover") return null;
    return bossAttackArea({ ...boss, patternRuntime: { active: {
      id: boss.patternId,
      phase: boss.patternPhase,
      phaseElapsed: boss.patternPhaseElapsed,
      aim: boss.patternAim,
      locked: boss.patternLocked,
      start: { x: boss.patternStartX, y: boss.patternStartY, z: boss.patternStartZ },
      target: { x: boss.patternTargetX, y: boss.patternTargetY, z: boss.patternTargetZ }
    } } }, unitRadius);
  }
  function bossAttackPose(b, parts) {
    const id = b.patternId, config = BOSS_PATTERN_CONFIG[id], phase = b.patternPhase, elapsed = Math.max(0, b.patternPhaseElapsed || 0), aim = Math.atan2(-0.62 * Math.sin(b.patternAim ?? b.angle), Math.cos(b.patternAim ?? b.angle));
    const body = { y: 0, rotation: 0, scaleX: 1, scaleY: 1 }, arms = { "arm-left": 0, "arm-right": 0 }, extras = {};
    for (const part of ["foot-left", "foot-right", "leaf", "kernel-mark", "hilum"]) if (parts.has(part)) extras[part] = { x: 0, y: 0, rotation: 0 };
    if (!config || !parts.has("body")) return { body, arms, extras, impact: false, releasePulse: 0 };
    const wind = phase === "windup" ? clamp2(elapsed / config.windup, 0, 1) : 0, windEase = wind * wind * (3 - 2 * wind);
    const recovering = phase === "recover", recover = recovering ? clamp2(elapsed / config.recover, 0, 1) : 0, recoverEase = recover * recover * (3 - 2 * recover);
    const instantImpact = recovering && ["attack.sweep-360", "attack.front-slam"].includes(id) && elapsed < 0.14;
    const leapImpact = recovering && id === "attack.leap-slam" && elapsed < 0.18;
    const active2 = phase === "active", recoverImpact = instantImpact || leapImpact;
    const impact = active2 || recoverImpact;
    const lead = Math.cos(aim) >= 0 ? "arm-right" : "arm-left", trail = lead === "arm-right" ? "arm-left" : "arm-right";
    const strikeAngle = clamp2(aim, -1.2, 1.2);
    const arm = (key, value) => {
      if (parts.has(key)) arms[key] = value;
    };
    const windup = () => {
      body.y = 4 * windEase;
      body.scaleX = 1 - 0.035 * windEase;
      body.scaleY = 1 + 0.06 * windEase;
      body.rotation = aim * 0.045 * windEase;
      arm(lead, -0.72 + strikeAngle * 0.22);
      arm(trail, 0.28 - strikeAngle * 0.12);
    };
    const settle = () => {
      body.y = 3 * (1 - recoverEase);
      body.scaleX = 1 + 0.045 * (1 - recoverEase);
      body.scaleY = 1 - 0.065 * (1 - recoverEase);
      body.rotation = aim * 0.025 * (1 - recoverEase);
      arm(lead, 0.35 * (1 - recoverEase) + strikeAngle * 0.16);
      arm(trail, -0.12 * (1 - recoverEase));
    };
    const strike = () => {
      body.y = -3;
      body.scaleX = 1.075;
      body.scaleY = 0.91;
      body.rotation = aim * 0.09;
      arm(lead, 0.95 + strikeAngle * 0.55);
      arm(trail, -0.42 - strikeAngle * 0.18);
    };
    switch (id) {
      case "attack.front-slam":
        if (phase === "windup") windup();
        else if (impact) strike();
        else if (recovering) settle();
        break;
      case "attack.sweep-360": {
        if (phase === "windup") {
          windup();
          arm("arm-left", -0.72);
          arm("arm-right", 0.72);
        } else if (impact) {
          const q = instantImpact ? 1 : clamp2(elapsed / Math.max(config.active, 1e-3), 0, 1), sweep = 2 * Math.PI * q;
          body.rotation = 0.12 * Math.sin(sweep);
          body.scaleX = 1.055;
          body.scaleY = 0.94;
          arm("arm-left", -0.78 - 0.55 * Math.sin(sweep));
          arm("arm-right", 0.78 + 0.55 * Math.sin(sweep));
        } else if (recovering) settle();
        break;
      }
      case "attack.charge":
        if (phase === "windup") windup();
        else if (active2) {
          const stride = Math.sin((b.patternTraveled || 0) * 3.1), lift = Math.max(0, stride);
          body.y = -1.5 - Math.abs(stride) * 1.2;
          body.scaleX = 1.055;
          body.scaleY = 0.965;
          body.rotation = aim * 0.11;
          arm(lead, -0.72 + strikeAngle * 0.3 + stride * 0.12);
          arm(trail, 0.46 - stride * 0.18);
          extras["foot-left"] = { x: -stride * 4, y: -lift * 5, rotation: -stride * 0.12 };
          extras["foot-right"] = { x: stride * 4, y: -Math.max(0, -stride) * 5, rotation: stride * 0.12 };
          if (parts.has("leaf")) extras.leaf = { rotation: stride * 0.14 };
        } else if (recovering) settle();
        break;
      case "attack.leap-slam":
        if (phase === "windup") {
          windup();
          body.y = 5 * windEase;
          body.scaleX = 1 - 0.05 * windEase;
          body.scaleY = 1 + 0.09 * windEase;
          arm(lead, -0.9);
          arm(trail, -0.45);
        } else if (active2) {
          const lift = clamp2((b.z || 0) / Math.max(1, b.height || 1), 0, 1);
          body.rotation = aim * 0.06;
          body.scaleX = 1 + 0.045 * lift;
          body.scaleY = 1 - 0.035 * lift;
          arm("arm-left", -0.28);
          arm("arm-right", 0.28);
          extras["foot-left"] = { y: -4 * lift, rotation: -0.08 * lift };
          extras["foot-right"] = { y: -4 * lift, rotation: 0.08 * lift };
          if (parts.has("leaf")) extras.leaf = { rotation: -0.12 * lift };
        } else if (leapImpact) {
          body.y = 5;
          body.scaleX = 1.12;
          body.scaleY = 0.8;
          body.rotation = aim * 0.08;
          arm("arm-left", -0.65);
          arm("arm-right", 0.65);
          extras["foot-left"] = { x: -5, y: 2, rotation: -0.14 };
          extras["foot-right"] = { x: 5, y: 2, rotation: 0.14 };
        } else if (recovering) settle();
        break;
      case "attack.fan-sweep":
        if (phase === "windup") windup();
        else if (active2) {
          const q = clamp2(elapsed / config.active, 0, 1), arc = aim - config.sector / 2 + config.sector * q, projected = Math.atan2(-0.62 * Math.sin(arc), Math.cos(arc));
          body.rotation = 0.1 * Math.sin(projected - aim);
          body.scaleX = 1.035;
          body.scaleY = 0.97;
          arm(lead, 0.4 + clamp2(projected, -1.1, 1.1) * 0.58);
          arm(trail, -0.3 - clamp2(projected, -1.1, 1.1) * 0.2);
          if (parts.has("leaf")) extras.leaf = { rotation: 0.12 * Math.sin(q * Math.PI) };
        } else if (recovering && elapsed < 0.12) {
          const arc = aim + config.sector / 2, projected = Math.atan2(-0.62 * Math.sin(arc), Math.cos(arc));
          body.rotation = 0.08 * Math.sin(projected - aim);
          body.scaleX = 1.05;
          arm(lead, 0.4 + projected * 0.5);
        } else if (recovering) settle();
        break;
      case "summon.mouth-t1": {
        if (phase === "windup") {
          body.y = 2 * windEase;
          body.scaleX = 1 + 0.025 * windEase;
          body.scaleY = 1 - 0.035 * windEase;
          arm("arm-left", -0.34 * windEase);
          arm("arm-right", 0.34 * windEase);
        } else if (active2 || recovering) {
          const interval = config.releaseInterval || 0.25, last = (b.patternReleased || 0) - 1, age = last < 0 ? 1 : active2 ? Math.max(0, elapsed - last * interval) : elapsed;
          const pulse = clamp2(1 - age / 0.16, 0, 1);
          body.scaleX = 1 + 0.025 * pulse;
          body.scaleY = 1 - 0.018 * pulse;
          body.rotation = aim * 0.02;
          arm("arm-left", -0.3);
          arm("arm-right", 0.3);
          if (parts.has("leaf")) extras.leaf = { rotation: 0.08 * pulse };
          return { body, arms, extras, impact: false, releasePulse: pulse };
        }
        break;
      }
    }
    if (recovering && !recoverImpact && !["attack.front-slam", "attack.sweep-360", "attack.charge", "attack.leap-slam", "attack.fan-sweep"].includes(id)) settle();
    if (parts.has("kernel-mark") && id === "attack.charge") extras["kernel-mark"] = { rotation: active2 ? 0.08 * Math.sin((b.patternTraveled || 0) * 3.1) : 0 };
    if (parts.has("hilum") && id === "attack.charge") extras.hilum = { rotation: active2 ? 0.08 * Math.sin((b.patternTraveled || 0) * 3.1) : 0 };
    return { body, arms, extras, impact, releasePulse: 0 };
  }
  var compareActors = (a, b) => b.depth - a.depth || a.id - b.id;
  var ATTACK_ACCENTS = ["#8fac68", "#dbb76b", "#b58b9c", "#9a6947", "#d7914f", "#a86b32"];
  var Diorama = class {
    constructor(canvas2) {
      this.canvas = canvas2;
      this.device = new WebGLDevice(canvas2, { alpha: false, depth: false, stencil: false, antialias: true });
      this.ctx = new VectorContext(this.device);
      this.vectorAssets = /* @__PURE__ */ new Map();
      this.vectorPlayers = /* @__PURE__ */ new Map();
      this.vectorPlayerAssets = /* @__PURE__ */ new WeakMap();
      this.actors = [];
      this.actorPool = [];
      this.liveUnitIds = /* @__PURE__ */ new Set();
      this.joyEffects = [];
      this.unitRings = [];
      this.unitRingPool = [{}, {}, {}];
      this.breedingIndicator = {};
      const entries = Object.entries(TROOP_VECTOR_ASSETS);
      if (entries.length !== CONFIG.maxSpecies || entries.some(([species], index) => Number(species) !== index) || typeof createVectorAsset !== "function") throw new Error("All pinned GameKit troop and vector-assets sources are required");
      this.meshes = new MeshRenderer(this.device);
      this.ctx.meshRenderer = this.meshes;
      for (const [species, compiled] of entries) this.vectorAssets.set(Number(species), { compiled, asset: createVectorAsset(this.meshes, compiled), parts: new Set(compiled.metadata.parts.map((part) => part.id)), faceParts: compiled.metadata.parts.filter((part) => part.id.startsWith("face-")).map((part) => part.id) });
      this.bossAssets = new Map(Object.entries(BOSS_VECTOR_ASSETS).map(([id, compiled]) => [id, { compiled, asset: createVectorAsset(this.meshes, compiled), parts: new Set(compiled.metadata.parts.map((part) => part.id)) }]));
      this.bossPlayer = null;
      this.bossPlayerAsset = null;
      this.bossPlayers = /* @__PURE__ */ new Map();
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
      this.bossPlayers.set(3, { record: boss, player: this.bossPlayer });
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
      const rx = scene === "raid" ? CONFIG.raid.radiusX : 9.5, ry = scene === "raid" ? CONFIG.raid.radiusY : 6.8;
      this.terrainDots = Array.from({ length: 92 }, (_, i) => {
        const angle = i * 2.39996, rad = Math.sqrt((i + 0.5) / 92);
        return this.project(Math.cos(angle) * (rx + 0.3) * rad, Math.sin(angle) * (ry + 0.3) * rad);
      });
      this.terrainLeaves = Array.from({ length: 24 }, (_, i) => {
        const angle = i * 2.39996;
        return { ...this.project(Math.cos(angle) * (rx + 0.55), Math.sin(angle) * (ry + 0.55)), angle };
      });
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
    strokeGroundCapsule(area, color2, width = 0.08) {
      const c = this.ctx, points = capsuleContourPoints(area).map((point) => this.project(point.x, point.y));
      c.strokeStyle = color2;
      c.lineWidth = width * this.scale;
      c.beginPath();
      c.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) c.lineTo(point.x, point.y);
      c.closePath();
      c.stroke();
    }
    groundPolygon(points, fill, stroke = null, width = 0.055) {
      if (!points.length) return;
      const c = this.ctx, projected = points.map((point) => this.project(point.x, point.y));
      c.beginPath();
      c.moveTo(projected[0].x, projected[0].y);
      for (const point of projected.slice(1)) c.lineTo(point.x, point.y);
      c.closePath();
      if (fill) {
        c.fillStyle = fill;
        c.fill();
      }
      if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = width * this.scale;
        c.stroke();
      }
    }
    groundSector(x, y, angle, sector, outerRadius, innerRadius = 0, fill = "#b46c4530", stroke = "#b46c45") {
      const points = [], segments = Math.max(12, Math.ceil(sector / (Math.PI / 48))), start2 = angle - sector / 2, end = angle + sector / 2;
      if (innerRadius <= 0) points.push({ x, y });
      for (let i = 0; i <= segments; i++) {
        const a = start2 + (end - start2) * i / segments;
        points.push({ x: x + Math.cos(a) * outerRadius, y: y + Math.sin(a) * outerRadius });
      }
      if (innerRadius > 0) for (let i = segments; i >= 0; i--) {
        const a = start2 + (end - start2) * i / segments;
        points.push({ x: x + Math.cos(a) * innerRadius, y: y + Math.sin(a) * innerRadius });
      }
      this.groundPolygon(points, fill, stroke, 0.045);
      if (innerRadius <= 0) {
        const c = this.ctx, center = this.project(x, y), left = this.project(x + Math.cos(start2) * outerRadius, y + Math.sin(start2) * outerRadius), right = this.project(x + Math.cos(end) * outerRadius, y + Math.sin(end) * outerRadius);
        this.line(center, left, 0.035, stroke);
        this.line(center, right, 0.035, stroke);
      }
    }
    drawBossTelegraph(area) {
      const color = area.active ? "#bd6648" : area.locked ? "#d09852" : "#a8755c", soft = area.active ? "rgba(195,91,62,.2)" : "rgba(199,147,77,.15)";
      if (area.kind === "sweep") {
        this.strokeGroundEllipse(area.x, area.y, Math.max(0, area.sweepRadius - area.width), Math.max(0, area.sweepRadius - area.width), color, area.active ? 0.075 : 0.12);
        const progress = area.active ? area.progress : 1;
        this.ring(area.x, area.y, area.outerRadius, color, 0.1, area.startAngle, area.startAngle + progress * Math.PI * 2);
        this.ring(area.x, area.y, area.sweepRadius, "rgba(216,159,84,.25)", 0.045);
      } else if (area.kind === "sector") {
        this.groundSector(area.x, area.y, area.angle, area.sector, area.reach, 0, soft, color);
      } else if (area.kind === "fan") {
        const inner = Math.max(0, area.reach - area.width), outer = area.reach + area.width;
        this.groundSector(area.x, area.y, area.angle, area.sector, outer, inner, soft, color);
        const q = area.active ? clamp2(area.progress, 0, 1) : 0, a = area.angle - area.sector / 2 + q * area.sector;
        const from = this.project(area.x + Math.cos(a) * inner, area.y + Math.sin(a) * inner), to = this.project(area.x + Math.cos(a) * outer, area.y + Math.sin(a) * outer);
        this.line(from, to, 0.12, area.active ? "#f0c27b" : "#d8ae70");
      } else if (area.kind === "charge") {
        const endRadius = area.active ? Math.hypot(area.endX - area.x, area.endY - area.y) : area.reach;
        this.strokeGroundCapsule({ x: area.x, y: area.y, angle: area.angle, width: area.width, startRadius: 0, endRadius: Math.max(0.04, endRadius) }, soft);
        const end = this.project(area.x + Math.cos(area.angle) * endRadius, area.y + Math.sin(area.angle) * endRadius), start2 = this.project(area.x, area.y);
        this.line(start2, end, 0.045, color);
      } else if (area.kind === "leap") {
        const radius = area.reach, progress = area.progress || 0, x = area.targetX, y = area.targetY;
        this.groundEllipse(x, y, radius, radius, soft);
        this.strokeGroundEllipse(x, y, radius, radius, color, area.active ? 0.09 : 0.12);
        this.strokeGroundEllipse(x, y, 0.46, 0.46, "#ead59b", 0.06);
        const from = this.project(area.x, area.y), to = this.project(x, y);
        this.line(from, to, 0.055, "rgba(184,110,69,.58)");
        const head = this.project(x - Math.cos(Math.atan2(y - area.y, x - area.x)) * 0.56, y - Math.sin(Math.atan2(y - area.y, x - area.x)) * 0.56);
        this.line(head, to, 0.1, color);
        if (area.active) {
          const r = radius * (1 - 0.2 * progress);
          this.strokeGroundEllipse(x, y, r, r, "rgba(247,207,128,.7)", 0.045);
        }
      } else if (area.kind === "summon") {
        const config = BOSS_PATTERN_CONFIG[area.patternId], reach = config?.landingRadius || 4.8, angle = area.angle, target = { x: area.x + Math.cos(angle) * reach, y: area.y + Math.sin(angle) * reach };
        this.groundSector(area.x, area.y, angle, Math.PI / 7, reach, 0.25, "rgba(183,125,73,.11)", "rgba(178,129,76,.55)");
        this.line(this.project(area.x, area.y), this.project(target.x, target.y), 0.05, "rgba(167,123,74,.62)");
        this.groundEllipse(target.x, target.y, 0.65, 0.48, soft);
        this.strokeGroundEllipse(target.x, target.y, 0.65, 0.48, color, 0.085);
        this.ring(target.x, target.y, 0.28, "#f1d391", 0.045, 0, Math.PI * 1.8);
      }
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
    addUnitRing(radius, color, width, progress) {
      const effect = this.unitRingPool[this.unitRings.length];
      effect.radius = radius;
      effect.color = color;
      effect.width = width;
      effect.progress = progress;
      this.unitRings.push(effect);
    }
    unitRingEffects(u, world) {
      const effects = this.unitRings, a = u.ability, s = UNIT_ABILITY_PROFILES[u.species];
      effects.length = 0;
      if (u.buffed && u.hp > 0) this.addUnitRing(u.radius + 0.16, "#eacb72", 0.055, 1);
      if (a.phase === "windup" && s) this.addUnitRing(u.radius + 0.1, ATTACK_ACCENTS[u.species] || ATTACK_ACCENTS[0], 0.065, Math.min(1, a.elapsed / s.windup));
      const breeding = farmBreedingCooldown(u, world, CONFIG.breedCooldownSeconds, this.breedingIndicator);
      if (breeding && breeding.progress > 0) this.addUnitRing(u.radius + 0.085, "#8fac68", 0.035, breeding.progress);
      return effects;
    }
    drawUnitRingLayer(u, effects, side) {
      for (const effect of effects) {
        const sweep = Math.PI * 2 * Math.max(0, Math.min(1, Number(effect.progress) || 0));
        if (side === "rear" && sweep > 0) this.ring(u.x, u.y, effect.radius, effect.color, effect.width, 0, Math.min(Math.PI, sweep));
        else if (side === "front" && sweep > Math.PI) this.ring(u.x, u.y, effect.radius, effect.color, effect.width, Math.PI, sweep);
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
      if (player && this.vectorPlayerAssets.get(player) !== record) {
        player.dispose();
        this.vectorPlayers.delete(u.id);
        player = null;
      }
      const metadata = record.compiled.metadata, motionName = unitMotion(u, sim), clip = metadata.clips[motionName] || metadata.clips.idle;
      const clipStartAtMs = this.displayTimeMs - motionElapsedMs(u, motionName, clip);
      if (!player) {
        player = record.asset.createPlayer({ clip: motionName, startedAtMs: clipStartAtMs });
        this.vectorPlayers.set(u.id, player);
        this.vectorPlayerAssets.set(player, record);
      } else if (player.currentClip !== motionName) player.play(motionName, clipStartAtMs);
      const expression = unitExpression(u, sim, this.joyEffects);
      if (expression !== player.currentExpression) player.setExpression(expression);
      player.seek(this.displayTimeMs);
      const [, , width, height] = record.compiled.viewBox, scale = 2 * r / Math.max(width, height), centerY = p.y - r * 0.79;
      const matrix = [scale, 0, 0, scale, p.x - width * scale * 0.5, centerY - height * scale * 0.5];
      this.ctx.vector.flush();
      const outline = TIER_OUTLINE_COLORS[u.tier - 1];
      if (outline) {
        const border = 1.5 * this.pixelRatio, factor = 1 + border / Math.max(r, 1);
        const outlineMatrix = [scale * factor, 0, 0, scale * factor, p.x - width * scale * factor * 0.5, centerY - height * scale * factor * 0.5];
        for (const part of record.faceParts) player.setPartVisible(part, false);
        player.draw({ projection: this.ctx.vector.projection, matrix: outlineMatrix, color: outline, forceColor: true });
        player.setExpression(expression);
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
      if (b.flash > 0.09 && b.patternPhase === "idle") return "hit";
      if (b.patternPhase === "windup") return "windup";
      if (b.patternPhase === "active") {
        if (b.patternId === "attack.sweep-360" || b.patternId === "attack.fan-sweep") return "sweep";
        if (b.patternId === "attack.charge") return "walk";
        if (b.patternId === "attack.leap-slam") return b.z > 0.1 ? "airborne" : "strike";
        if (b.patternId === "summon.mouth-t1") return "fire";
        return "strike";
      }
      if (b.patternPhase === "recover") {
        if (b.patternId === "attack.sweep-360" && (b.patternPhaseElapsed || 0) < 0.14) return "sweep";
        if (["attack.front-slam", "attack.leap-slam"].includes(b.patternId) && (b.patternPhaseElapsed || 0) < 0.18) return "strike";
        if (b.patternId === "attack.fan-sweep" && (b.patternPhaseElapsed || 0) < 0.12) return "sweep";
        return "recover";
      }
      return b.phase === "chase" ? "walk" : "idle";
    }
    drawBoss(world) {
      const { b, p, r, k } = this.bossPose(world), event = world.farmBossEvent, species = Number.isInteger(b.species) ? b.species : 3;
      const record = species === 3 ? this.bossAssets.get("chestnut") : this.vectorAssets.get(species);
      if (!record) throw new Error("Missing required boss vector asset for species " + species);
      let instance = this.bossPlayers.get(species);
      if (!instance) {
        const player2 = record.asset.createPlayer({ clip: "idle", startedAtMs: this.displayTimeMs });
        instance = { record, player: player2 };
        this.bossPlayers.set(species, instance);
      }
      const player = instance.player;
      this.bossPlayer = player;
      this.bossPlayerAsset = record;
      const metadata = record.compiled.metadata, name = this.bossMotion(b, world), fallbackClip = name === "airborne" ? metadata.clips.strike ? "strike" : metadata.clips.fire ? "fire" : "idle" : ["strike", "sweep", "fire"].includes(name) && !metadata.clips[name] ? metadata.clips.fire ? "fire" : "idle" : "idle", clipName = metadata.clips[name] ? name : fallbackClip, clip = metadata.clips[clipName];
      const timed = ["windup", "strike", "sweep", "recover", "hit", "death", "fire", "airborne"].includes(name), elapsed = b.patternId ? b.patternPhaseElapsed : b.clock;
      const clipStartAtMs = timed ? this.displayTimeMs - Math.min(clip.durationMs, Math.max(0, elapsed || 0) * 1e3) : name === "walk" ? this.displayTimeMs - Math.max(0, b.travel || 0) * 110 : this.displayTimeMs - (b.travel || 0) * 37 % clip.durationMs;
      if (player.currentClip !== clipName) player.transitionTo(clipName, clipStartAtMs, 70);
      const summonOpen = b.patternId === "summon.mouth-t1" && (b.patternPhase === "active" || b.patternPhase === "windup" && b.patternPhaseElapsed >= BOSS_PATTERN_CONFIG["summon.mouth-t1"].windup * 0.5);
      const expression = b.hp <= 0 ? "dead" : event?.phase === "celebrating" && event.outcome === "defeat" ? "happy" : summonOpen ? "attack" : b.patternPhase === "windup" ? "focused" : b.patternPhase === "active" ? "attack" : b.flash > 0.07 ? "hurt" : "neutral";
      if (!metadata.expressions?.[expression] && !metadata.expressions?.neutral) throw new Error("Boss asset is missing a supported expression");
      const safeExpression = metadata.expressions?.[expression] ? expression : "neutral";
      if (player.currentExpression !== safeExpression) player.setExpression(safeExpression);
      player.seek(this.displayTimeMs);
      const [, , width, height] = record.compiled.viewBox, s = 2 * r / 220, ground = metadata.sockets?.ground?.point || [width / 2, height], anchorX = ground[0], anchorY = ground[1], matrix = [s, 0, 0, s, p.x - anchorX * s, p.y - anchorY * s];
      const defeatBounce = event?.phase === "celebrating" && event.outcome === "defeat" ? Math.max(0, Math.sin(event.elapsed * Math.PI * 2 / CONFIG.farmBossEvent.celebrationSeconds * 2)) : 0;
      const fade = event?.phase === "fading" ? clamp2(1 - event.elapsed / CONFIG.farmBossEvent.fadeSeconds, 0, 1) : 1;
      const parts = record.parts, pose = bossAttackPose(b, parts);
      player.setBasePose("body", { x: 0, y: pose.body.y - 18 * defeatBounce, rotation: pose.body.rotation, scaleX: pose.body.scaleX * (1 + (k.squash || 0)) * (1 - 0.04 * defeatBounce), scaleY: pose.body.scaleY * (1 - (k.squash || 0)) * (1 + 0.06 * defeatBounce), opacity: fade });
      for (const [part, rotation] of Object.entries(pose.arms)) if (parts.has(part)) player.setBasePose(part, { rotation });
      for (const [part, partPose] of Object.entries(pose.extras)) if (parts.has(part)) player.setBasePose(part, partPose);
      const mouthSocket = metadata.sockets?.mouth ? player.getSocket("mouth") : null, mouthScreen = mouthSocket ? { x: mouthSocket.x * s + matrix[4], y: mouthSocket.y * s + matrix[5] } : null;
      this.ctx.vector.flush();
      player.draw({ projection: this.ctx.vector.projection, matrix });
      if (b.patternId === "summon.mouth-t1" && b.patternReleased > 0 && pose.releasePulse > 0 && mouthScreen) {
        this.ctx.flush();
        const mouth = mouthScreen, pulse = 0.55 + 0.45 * pose.releasePulse, target = Math.atan2(-0.62 * Math.sin(b.patternAim), Math.cos(b.patternAim));
        this.ellipse(mouth.x, mouth.y, this.scale * 0.18 * pulse, this.scale * 0.12 * pulse, "rgba(255,210,113,.72)");
        this.ellipse(mouth.x + Math.cos(target) * this.scale * 0.16, mouth.y + Math.sin(target) * this.scale * 0.1, this.scale * 0.065, this.scale * 0.08, "#fff1ad");
      }
    }
    terrain(sim2) {
      const c = this.ctx, S = this.scale, raid = sim2.scene === "raid", rx = raid ? CONFIG.raid.radiusX : 9.5, ry = raid ? CONFIG.raid.radiusY : 6.8;
      this.groundEllipse(0, -0.2, rx + 1.3, ry + 1.1, "#bcc7a6");
      this.groundEllipse(0, 0, rx + 1.2, ry + 1.1, sim2.scene === "farm" ? "#d1d8b8" : "#cecfb3");
      this.groundEllipse(0, 0.15, rx + 0.3, ry + 0.3, sim2.scene === "farm" ? "#d9dfc2" : "#d7d8bf");
      for (const p of this.terrainDots) this.ellipse(p.x, p.y, S * 0.026, S * 0.02, "#a7b58b80");
      for (const p of this.terrainLeaves) {
        this.ellipse(p.x, p.y, 0.25 * S, 0.11 * S, "#94a577", p.angle);
        this.ellipse(p.x + 0.1 * S, p.y - 0.09 * S, 0.19 * S, 0.075 * S, "#a8b78a", p.angle + 0.7);
      }
      if (raid) {
        this.strokeGroundEllipse(0, 0, CONFIG.raid.radiusX - 0.5, CONFIG.raid.radiusY - 0.5, "#728e61a8", 0.075);
        if (this.dropTarget) {
          const t = this.dropTarget;
          this.groundEllipse(t.x, t.y, 0.32, 0.22, t.valid ? "#f3d58a55" : "#b56d6266");
          this.strokeGroundEllipse(t.x, t.y, 0.36, 0.25, t.valid ? "#f4e0a0" : "#b36359", 0.055);
        }
      }
      const event = sim2.farmBossEvent, area = raid || sim2.scene === "farm" && event?.phase === "fighting" ? renderedBossAttackArea(sim2.boss, CONFIG.maxUnitRadius) : null;
      this.bossTelegraph = area;
      if (area) this.drawBossTelegraph(area);
    }
    addActor(kind, source, depth, id, vector = false) {
      const index = this.actors.length, actor = this.actorPool[index] || (this.actorPool[index] = {});
      actor.kind = kind;
      actor.source = source;
      actor.depth = depth;
      actor.id = id;
      actor.vector = vector;
      this.actors.push(actor);
    }
    drawFood(f) {
      this.groundEllipse(f.x, f.y, 0.1, 0.07, "#55452433");
      if (f.phase === "flight") {
        const tail = this.project(f.x - f.vx * 0.045, f.y - f.vy * 0.045, Math.max(0, f.z - f.vz * 0.045) + 0.1), head = this.project(f.x, f.y, f.z + 0.1);
        this.line(tail, head, 0.055, "#e6bd7480");
      }
      const p = this.project(f.x, f.y, f.z + 0.1);
      this.ellipse(p.x, p.y, this.scale * 0.09, this.scale * 0.12, "#c78a43", 0.4);
      this.ellipse(p.x - 0.025 * this.scale, p.y - 0.08 * this.scale, this.scale * 0.036, this.scale * 0.05, "#e7bf72");
    }
    drawProjectile(f) {
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
    }
    render(sim2, feel = null, now = performance.now()) {
      this.feel = feel;
      this.displayTimeMs = now;
      this.configure(sim2.scene);
      const c = this.ctx, joyEffects = this.joyEffects;
      joyEffects.length = 0;
      if (sim2.scene === "farm") {
        for (const e of sim2.effects) if (e.life < 0.85 && (e.kind === "eat" || e.kind === "birth" || e.kind === "merge")) joyEffects.push(e);
      }
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
      const hiddenMergeResultId = sim2.scene === "farm" && sim2.mode === "merge" && sim2.mergeTask?.phase === "animation" ? sim2.mergeTask.resultId : 0;
      const actors = this.actors;
      actors.length = 0;
      for (const u of sim2.units) if (u.id !== hiddenMergeResultId) this.addActor("unit", u, 0.785 * u.y - 0.62 * u.z, u.id, this.vectorAssets.has(u.species));
      if (sim2.scene === "raid" || farmBossVisible) this.addActor("boss", sim2.boss, 0.785 * sim2.boss.y - 0.62 * (sim2.boss.z || 0), 0, true);
      if (sim2.scene === "farm") for (const f of sim2.food) this.addActor("food", f, 0.785 * f.y - 0.62 * f.z, -1);
      if (sim2.scene === "raid" || farmBossVisible) for (const f of sim2.projectiles) this.addActor("projectile", f, 0.785 * f.y - 0.62 * f.z, -f.id);
      actors.sort(compareActors);
      let vectorRun = false;
      for (const actor of actors) {
        if (actor.vector && !vectorRun) {
          c.flush();
          vectorRun = true;
        } else if (!actor.vector && vectorRun) {
          c.flush();
          vectorRun = false;
        }
        if (actor.kind === "unit") this.drawFarmUnitActor(actor.source, sim2);
        else if (actor.kind === "boss") this.drawBoss(sim2);
        else if (actor.kind === "food") this.drawFood(actor.source);
        else this.drawProjectile(actor.source);
        actor.source = null;
      }
      if (vectorRun) c.flush();
      const liveUnitIds = this.liveUnitIds;
      liveUnitIds.clear();
      for (const u of sim2.units) liveUnitIds.add(u.id);
      for (const [id, player] of this.vectorPlayers) if (!liveUnitIds.has(id)) {
        player.dispose();
        this.vectorPlayers.delete(id);
      }
      feel?.draw(this, this.displayTimeMs);
      for (const e of sim2.effects) {
        const delay = Number.isFinite(e.delay) ? e.delay : 0, span = Number.isFinite(e.span) ? e.span : 1;
        if (e.life < delay) continue;
        const q = Number.isFinite(e.span) ? clamp2((e.life - delay) / span, 0, 1) : e.life;
        if (e.kind === "feed") this.ring(e.x, e.y, 0.15 + q * 0.35, `rgba(166,121,59,${(1 - q) * 0.6})`, 0.035);
        else if (e.kind === "food-land") {
          const t = Math.min(1, q / 0.35);
          this.ring(e.x, e.y, 0.1 + t * 0.42, `rgba(194,145,62,${(1 - t) * 0.85})`, 0.055);
          for (let i = 0; i < 3 && t < 1; i++) {
            const a = i * Math.PI * 2 / 3, p = this.project(e.x + Math.cos(a) * t * 0.4, e.y + Math.sin(a) * t * 0.4, 0.08 + Math.sin(t * Math.PI) * 0.2);
            this.ellipse(p.x, p.y, this.scale * 0.045, this.scale * 0.035, `rgba(245,213,133,${1 - t})`);
          }
        } else if (e.kind === "land" || e.kind === "impact") this.ring(e.x, e.y, 0.1 + q * 0.8, `rgba(146,131,78,${(1 - q) * 0.65})`);
        else if (e.kind === "landing-shockwave" || e.kind === "walnut-shockwave") {
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
        } else if (e.kind === "merge-material") {
          const t = clamp2(q, 0, 1), x = e.x + (e.targetX - e.x) * t, y = e.y + (e.targetY - e.y) * t, z = (e.z || 0) + Math.sin(Math.PI * t) * 0.55;
          const start2 = this.project(e.x, e.y, e.z || 0), point = this.project(x, y, z);
          this.line(start2, point, 0.045, `rgba(88,185,187,${0.2 + 0.65 * (1 - t)})`);
          this.ellipse(point.x, point.y, this.scale * 0.12 * (1 - 0.4 * t), this.scale * 0.09 * (1 - 0.4 * t), `rgba(88,185,187,${1 - 0.35 * t})`, t * Math.PI);
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
      for (const { player } of this.bossPlayers.values()) player.dispose();
      this.bossPlayers.clear();
      this.bossPlayer = null;
      for (const record of this.bossAssets?.values() || []) record.asset.dispose();
      this.bossAssets?.clear();
      this.actors.length = 0;
      this.actorPool.length = 0;
      this.liveUnitIds.clear();
      this.joyEffects.length = 0;
      this.ctx.dispose();
      this.device.dispose();
    }
  };

  // src/farm-session.js
  init_farm_model();
  init_unit_stats();
  var { PresentationRuntime, RenderObject } = globalThis.BloomGamekitInterpolation;
  var R = RenderObject;
  var PRESENTATION_STEP_MS = 50;
  var LOCAL_PROFILE = Object.freeze({ tickRate: 20, maxCatchupSteps: 4 });
  var LOCAL_INPUT = new Uint8Array(0);
  var ADVANCED = Object.freeze({ status: "advanced" });
  var CLOSED = Object.freeze({ status: "closed" });
  var UnitRender = class extends RenderObject {
    static renderSchema = Object.freeze({
      id: R.STEP,
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
      "ability.peanutStrikeCount": R.STEP,
      walnutGuarding: R.STEP,
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
      faction: R.STEP,
      farmId: R.STEP,
      dropLanded: R.STEP,
      buffed: R.STEP,
      isBattleOnlySummon: R.STEP
    });
    constructor(u, world) {
      super();
      Object.assign(this, {
        id: u.id,
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
        ability: { phase: u.ability.phase, elapsed: u.ability.elapsed, peanutStrikeCount: u.ability.action?.peanutStrikeCount || 2 },
        walnutGuarding: !!world.walnutGuardConfigFor(u),
        cooldown: u.cooldown,
        cooldownDuration: u.cooldownDuration,
        meals: u.meals,
        species: u.species,
        tier: u.tier,
        seed: u.seed,
        size: u.size,
        radius: u.radius,
        maxHp: baseUnitStatsFor(u.tier, u.species).maxHp,
        fed: u.fed,
        ownerId: u.ownerId,
        faction: u.faction,
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
      flash: R.LINEAR,
      species: R.STEP,
      patternId: R.STATE_KEY,
      patternPhase: R.STATE_KEY,
      patternPhaseElapsed: R.LINEAR,
      patternAim: R.ANGLE,
      patternLocked: R.STEP,
      patternTargetId: R.STEP,
      patternTargetX: R.STEP,
      patternTargetY: R.STEP,
      patternTargetZ: R.STEP,
      stage: R.STEP,
      patternStartX: R.STEP,
      patternStartY: R.STEP,
      patternStartZ: R.STEP,
      patternVolleyCount: R.STEP,
      patternReleased: R.STEP,
      patternTraveled: R.LINEAR,
      summonMouthX: R.STEP,
      summonMouthY: R.STEP,
      summonMouthZ: R.STEP
    });
    constructor(b, world) {
      super();
      const action = b.patternRuntime.active, event = world.farmBossEvent, target = action?.target || null, start2 = action?.start || null, mouth = b.summonMouth || {}, ended = world.scene === "raid" && !b.active ? world.notices.findLast((e) => e.kind === "victory" || e.kind === "defeat") : null;
      Object.assign(this, {
        x: b.x,
        y: b.y,
        z: b.z,
        angle: b.angle,
        startAngle: b.startAngle,
        phase: action?.phase || (!b.active || event?.phase === "dropping" ? "resting" : "chase"),
        clock: action?.phaseElapsed ?? (event.phase === "celebrating" || event.phase === "fading" ? event.elapsed : ended?.bossPatternElapsed || 0),
        travel: b.travel || 0,
        hp: b.hp,
        maxHp: b.maxHp,
        radius: b.radius,
        height: b.height,
        flash: b.flash,
        species: b.species ?? 3,
        stage: b.stage ?? 0,
        patternId: action?.id || "",
        patternPhase: action?.phase || "idle",
        patternPhaseElapsed: action?.phaseElapsed || 0,
        patternAim: action?.aim ?? b.angle,
        patternLocked: !!action?.locked,
        patternTargetId: action?.targetId || 0,
        patternTargetX: target?.x ?? b.x,
        patternTargetY: target?.y ?? b.y,
        patternTargetZ: target?.z ?? 0,
        patternStartX: start2?.x ?? b.x,
        patternStartY: start2?.y ?? b.y,
        patternStartZ: start2?.z ?? b.z,
        patternVolleyCount: action?.volleyCount || 0,
        patternReleased: action?.released || 0,
        patternTraveled: action?.traveled || 0,
        summonMouthX: mouth.x ?? b.x,
        summonMouthY: mouth.y ?? b.y,
        summonMouthZ: mouth.z ?? b.z
      });
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
      id: R.STEP,
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
        id: p.id,
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
  var DelayedEffectRender = class extends EffectRender {
    static renderSchema = Object.freeze({ ...EffectRender.renderSchema, delay: R.STEP, span: R.STEP });
    constructor(e) {
      super(e);
      Object.assign(this, { delay: e.delay, span: e.span });
    }
  };
  var MergeMaterialRender = class extends DelayedEffectRender {
    static renderSchema = Object.freeze({ ...DelayedEffectRender.renderSchema, targetX: R.STEP, targetY: R.STEP, sequenceIndex: R.STEP, sequenceCount: R.STEP });
    constructor(e) {
      super(e);
      Object.assign(this, { targetX: e.targetX, targetY: e.targetY, sequenceIndex: e.sequenceIndex, sequenceCount: e.sequenceCount });
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
    constructor(world = new Garden(), { onError = console.error, onWorldStep: onWorldStep2 = () => {
    } } = {}) {
      this.world = world;
      this.onWorldStep = onWorldStep2;
      this.tick = 0;
      this.presentationTick = 0;
      this.profile = LOCAL_PROFILE;
      this.pace = 1;
      this.closed = false;
      this._paused = false;
      this.pauseStartedAt = null;
      this.pausedDurationMs = 0;
      this.pending = [];
      this.localPlayerId = "solo";
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
      this.loop = globalThis.BloomGamekitSimloop.createLoop({
        session: this,
        getInput: () => LOCAL_INPUT,
        onError,
        onBacklogDrop: () => {
          this.pendingPresentationMode = "reset";
        },
        onAdvance: (result) => {
          if (this.pendingPresentationMode) this.capturePresentation(this.pendingPresentationMode);
          else if (result.status === "advanced" && !this.paused) this.capturePresentation("continuous");
        }
      });
      this.capturePresentation("reset");
    }
    // Required by the shared loop; a local session has no incoming work to poll.
    poll() {
    }
    queue(type, args = {}) {
      if (this.closed || this.pending.length >= 64) return false;
      this.pending.push(structuredClone({ type, ...args }));
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
    advance() {
      if (this.closed) return CLOSED;
      const commandChangedWorld = this.applyPendingCommands(32);
      if (this.paused) {
        this.tick++;
        if (commandChangedWorld) this.onWorldStep(this.world);
        return ADVANCED;
      }
      const w = this.world, startTime = w.time, loopStart = this.loop?.simulationTimeMs, startClock = this.adjustedWallTime(Number.isFinite(loopStart) ? loopStart : this.pulseTimestamp ?? globalThis.performance.now()), presentationStartMs = Math.max(0, startClock - (this.presentationOriginWallMs ?? startClock));
      bindPresentationClock(w, (time) => (presentationStartMs + (time - startTime) * 1e3) / 1e3);
      if (w.scene === "farm") w.advanceAutoTaps(0.05);
      for (let i = 0; i < 6; i++) w.step(CONFIG.fixedStep);
      this.tick++;
      this.presentationTick++;
      this.onWorldStep(w);
      return ADVANCED;
    }
    applyPendingCommands(limit) {
      if (!this.pending.length) return false;
      let changed = false;
      for (const command of this.pending.splice(0, limit)) {
        try {
          changed = this.command(command) || changed;
        } catch {
        }
      }
      return changed;
    }
    flushQueuedCommands() {
      if (this.closed || this.world.scene !== "farm") return false;
      const changed = this.applyPendingCommands(this.pending.length);
      if (changed) this.onWorldStep(this.world);
      return changed;
    }
    command(c, ownerId = this.localPlayerId) {
      const w = this.world;
      switch (c.type) {
        case "feed":
          return w.scene === "farm" && w.tapFood("manual");
        case "mode":
          if (w.scene === "farm" && ["breed", "merge"].includes(c.value)) {
            const changed = w.mode !== c.value || c.value !== "merge" && w.mergeTask !== null;
            if (c.value !== "merge") w.mergeTask = null;
            w.mode = c.value;
            return changed;
          }
          return false;
        case "progression-invest":
          if (w.scene === "farm" && typeof c.nodeId === "string" && c.nodeId.length < 64) {
            if (c.scope === "farm") return w.investFarmUpgrade(c.nodeId).ok;
            if (c.scope === "ability" && typeof c.abilityId === "string" && c.abilityId.length < 64) return w.investAbilityNode(c.abilityId, c.nodeId).ok;
          }
          return false;
        case "ability-reset":
          return w.scene === "farm" && w.resetAbilityTree().ok;
        case "register-roster":
          return Array.isArray(c.entries) && w.registerRaidRoster(ownerId, c.entries, c.abilitySnapshot, c.settlement || null);
        case "deploy":
          return Number.isSafeInteger(c.sequence) && Number.isFinite(c.x) && Number.isFinite(c.y) && w.deployNextRaidUnit(ownerId, c.sequence, c.x, c.y);
        case "buff":
          return w.useRaidBuff(ownerId);
      }
      return false;
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
      return now - this.pausedDurationMs - (this._paused && this.pauseStartedAt !== null ? now - this.pauseStartedAt : 0);
    }
    capturePresentation(mode = "continuous") {
      if (mode !== "continuous" && this.presentationSequence > 0) this.presentationRevision++;
      const world = this.world, receiptNowMs = this.captureClock(), timeMs = this.presentationOriginWallMs === null ? 0 : Math.max(this.latestCaptureTimeMs, receiptNowMs - this.presentationOriginWallMs), entities = [];
      if (this.presentationOriginWallMs === null) this.presentationOriginWallMs = receiptNowMs;
      for (const u of world.units) entities.push({ id: "unit:" + u.id, generation: 0, source: new UnitRender(u, world) });
      entities.push({ id: "boss", generation: 0, source: new BossRender(world.boss, world) });
      for (const f of world.food) entities.push({ id: this.presentationIdentity("food", f), generation: 0, source: new FoodRender(f) });
      for (const p of world.projectiles) entities.push({ id: "projectile:" + p.id, generation: 0, source: new ProjectileRender(p) });
      for (const e of world.effects) {
        const source = e.kind === "merge-material" ? new MergeMaterialRender(e) : Number.isFinite(e.delay) && Number.isFinite(e.span) ? new DelayedEffectRender(e) : new EffectRender(e);
        entities.push({ id: this.presentationIdentity("effect", e), generation: 0, source });
      }
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
      const frame2 = this.presentationRuntime.frame(this.frameClock(now)), world = this.world;
      if (!this.presentationView || Object.getPrototypeOf(this.presentationView) !== world) {
        const view2 = this.presentationView = Object.assign(Object.create(world), { units: [], food: [], projectiles: [], effects: [], presentationDiagnostics: {} });
        this.collectPresentationModel = (model, id) => {
          if (id.startsWith("unit:")) view2.units.push(model);
          else if (id.startsWith("food:")) view2.food.push(model);
          else if (id.startsWith("projectile:")) view2.projectiles.push(model);
          else if (id.startsWith("effect:")) view2.effects.push(model);
        };
      }
      const view = this.presentationView;
      view.units.length = 0;
      view.food.length = 0;
      view.projectiles.length = 0;
      view.effects.length = 0;
      frame2.forEach(this.collectPresentationModel);
      view.time = (frame2.sample("clock", 0)?.gameTimeMs ?? world.time * 1e3) / 1e3;
      view.boss = frame2.sample("boss", 0) || new BossRender(world.boss, world);
      view.displayTimeMs = frame2.timeMs;
      view.presentationRevision = this.presentationRevision;
      const previous = this.previousCaptureTimeMs, latest = this.latestCaptureTimeMs, span = latest - previous, diagnostics = view.presentationDiagnostics;
      diagnostics.timeMs = frame2.timeMs;
      diagnostics.latestSnapshotTimeMs = latest;
      diagnostics.previousSnapshotTimeMs = previous;
      diagnostics.intervalMs = span;
      diagnostics.sampleAgeMs = latest - frame2.timeMs;
      diagnostics.renderFraction = previous === null || span <= 0 ? null : Math.max(0, Math.min(1, (frame2.timeMs - previous) / span));
      diagnostics.captureSequence = this.presentationSequence;
      diagnostics.revision = this.presentationRevision;
      this.latestPresentationDiagnostics = diagnostics;
      return view;
    }
    pulse(now) {
      this.pulseTimestamp = now;
      this.loop.pulse(now, { render: false });
    }
    dispose() {
      this.closed = true;
      this.loop.stop();
      this.pending.length = 0;
    }
  };

  // src/farm-app.js
  init_farm_storage();

  // src/farm-autosave.js
  var FARM_AUTOSAVE_DEBOUNCE_MS = 1e3;
  var FARM_AUTOSAVE_MAX_WAIT_MS = 1e4;
  var FarmAutosave = class {
    constructor(save, { debounceMs = FARM_AUTOSAVE_DEBOUNCE_MS, maxWaitMs = FARM_AUTOSAVE_MAX_WAIT_MS, now = () => globalThis.performance.now(), setTimer = (fn, delay) => globalThis.setTimeout(fn, delay), clearTimer = (id) => globalThis.clearTimeout(id) } = {}) {
      this.save = save;
      this.debounceMs = debounceMs;
      this.maxWaitMs = maxWaitMs;
      this.now = now;
      this.setTimer = setTimer;
      this.clearTimer = clearTimer;
      this.timer = null;
      this.dirty = false;
      this.dirtySince = 0;
    }
    markDirty() {
      const now = this.now();
      if (!this.dirty) {
        this.dirty = true;
        this.dirtySince = now;
      }
      if (this.timer !== null) this.clearTimer(this.timer);
      const remaining = Math.max(0, this.maxWaitMs - (now - this.dirtySince));
      this.timer = this.setTimer(() => {
        this.timer = null;
        this.flush();
      }, Math.min(this.debounceMs, remaining));
    }
    flush() {
      this.cancelTimer();
      if (!this.dirty) return true;
      let saved = false;
      try {
        saved = this.save() !== false;
      } catch {
        saved = false;
      }
      if (saved) this.reset();
      else this.dirtySince = this.now();
      return saved;
    }
    reset() {
      this.cancelTimer();
      this.dirty = false;
      this.dirtySince = 0;
    }
    cancelTimer() {
      if (this.timer !== null) {
        this.clearTimer(this.timer);
        this.timer = null;
      }
    }
  };

  // src/farm-app.js
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
      $("soundState").textContent = this.muted ? "꺼짐" : "켜짐";
      b.setAttribute("aria-pressed", String(!this.muted));
      b.setAttribute("aria-label", this.muted ? "효과음 켜기" : "효과음 끄기");
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
      if (now > this.pulseUntil && this.button.dataset.impact !== "") this.button.dataset.impact = "";
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
      let retained = 0;
      for (const e of this.effects) if (displayTimeMs - e.at < 430) this.effects[retained++] = e;
      this.effects.length = retained;
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
  init_factions();
  function raidRosterEntries(units, limit = 100) {
    if (!Array.isArray(units) || !Number.isSafeInteger(limit) || limit < 0) return [];
    return units.filter((unit) => unit?.hp > 0 && unit.down <= 0 && hasFaction(unit, FACTION_CONFIG.PLAYER) && !unit.isBattleOnlySummon && unit.countsTowardPermanentRoster !== false && unit.eligibleForRaidDeployment !== false).slice(0, limit).map((unit) => [unit.id, unit.species, unit.tier]);
  }
  function hasRaidRosterEntries(units) {
    return Array.isArray(units) && units.some((unit) => unit?.hp > 0 && unit.down <= 0 && hasFaction(unit, FACTION_CONFIG.PLAYER) && !unit.isBattleOnlySummon && unit.countsTowardPermanentRoster !== false && unit.eligibleForRaidDeployment !== false);
  }

  // src/farm-app.js
  init_ability_state();

  // src/ability-tree.js
  init_ability_catalog();
  init_species_catalog();
  init_ability_state();
  init_unit_abilities();
  init_player_progression();
  init_farm_upgrades();
  init_ability_progression();
  var definitionById3 = new Map(SPECIES_ABILITY_DEFINITIONS.map((definition) => [definition.id, definition]));
  function renderFarmUpgradeTreeMarkup(state, { location: location2 = "farm", inCombat = false } = {}) {
    if (!isValidPlayerProgressionState(state)) throw new TypeError("Cannot render invalid player progression state");
    const nodes = FARM_UPGRADE_NODES.map((node) => {
      const level = state.farmUpgrades[node.id];
      const check = canPurchaseFarmUpgrade(state, node.id, { location: location2, inCombat });
      return `<article class="tree-node" data-ready="${check.allowed}"><div class="node-heading"><span class="node-icon" aria-hidden="true">${node.icon}</span><h3>${node.name}</h3><span>${level}/${FARM_UPGRADE_MAX_LEVELS[node.id]}</span></div><p>${node.description}</p><div class="node-values">${node.value(level)}${level < FARM_UPGRADE_MAX_LEVELS[node.id] ? ` <span>→ ${node.value(level + 1)}</span>` : ""}</div><small>${level === FARM_UPGRADE_MAX_LEVELS[node.id] ? "완료" : check.reason ? farmUpgradeReasonLabel(check.reason) : "공용 포인트 1개"}</small><button type="button" data-progression-farm-node="${node.id}" aria-disabled="${!check.allowed}" ${check.allowed ? "" : "disabled"}>${level === FARM_UPGRADE_MAX_LEVELS[node.id] ? "✓" : "+"}<span class="sr-only">${node.name} 투자</span></button></article>`;
    }).join("");
    return `<section class="farm-upgrade-tree" aria-label="일반 정원 강화"><p class="ability-tree__wallet" aria-live="polite"><strong>${state.availablePoints}</strong><span>공용 XP 포인트</span></p>${renderPlayerProgressMarkup(state)}<div class="farm-upgrade-tree__nodes">${nodes}</div></section>`;
  }
  function renderAbilitySpeciesTabsMarkup(selectedSpecies = 0) {
    return SPECIES_CATALOG.map((species) => `<button type="button" data-ability-species="${species.id}" aria-pressed="${species.id === selectedSpecies}">${species.name}</button>`).join("");
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
    const cards = visibleDefinitions.map((definition) => renderAbilityCard(state, definition, context)).join("") || `<p class="ability-tree__note" role="status">이 병종은 기본 공격으로 전투에 참여해요. 전용 특수 능력 트리는 아직 추가되지 않았어요.</p>`;
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
    const speciesName = speciesById(definition.species).name;
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
      const share = definitionById3.get(abilityId).projectileAttackShare;
      return `한 공격 주기 · 발사 ${value}발 · 발당 ATK ×${abilityProfile(1).skillMultiplier * share}`;
    }
    if (abilityId === "corn-popcorn-chain") {
      const definition = definitionById3.get(abilityId);
      const radiusMultiplier = definition.radiusMultipliers[level] || definition.radiusMultipliers[0];
      return `착탄 ${definition.fuseSeconds}초 후 · 팝콘 접촉 즉시 연쇄 · 피해 ATK ×${value} · 반경 기본 사거리 ×${definition.baseRangeFraction} ×${radiusMultiplier}`;
    }
    if (abilityId === "chestnut-spike-fan") {
      const definition = definitionById3.get(abilityId);
      return `목표 방향 부채꼴 90° ${value}발 · 발당 ATK ×${definition.projectileAttackMultiplier} · 기본 공격 ${definition.intervalBasicCycles}주기마다`;
    }
    if (abilityId === "kidney-continuous-leap") return `착지 후 도약 쿨다운 초기화 ${Math.round(value * 100)}%`;
    if (abilityId === "kidney-landing-shockwave") return `충격파 피해·반경 ${value}×`;
    if (abilityId === "peanut-separated-assault") return `한 공격 주기 ${value}타 · 타격당 ATK ×${definitionById3.get(abilityId).strikeAttackMultiplier} · 넓은 협공 궤적`;
    if (abilityId === "walnut-guard-slam") {
      const definition = definitionById3.get(abilityId);
      return `첫 방어 피격 피해 −${Math.round((1 - definition.receivedDamageMultiplier) * 100)}%·넉백 −${Math.round((1 - definition.receivedKnockbackMultiplier) * 100)}% · 다음 공격 ATK ×${value} · 충격파 반경 기본 사거리 ×${definition.radiusBaseRangeFraction * definition.radiusMultipliers[level]}`;
    }
    if (abilityId === "rice-low-health-harvest") return `HP ${Math.round(definitionById3.get(abilityId).targetHpThreshold * 100)}% 이하 대상에게 기본 피해 총 ${value}×`;
    if (abilityId === "wheat-command-crit") {
      const definition = definitionById3.get(abilityId);
      return `기본 공격 적중 시 자신 포함 반경 기본 사거리 ×${definition.radiusRangeRatio} 안의 생존 아군 치명타 +${Math.round(value * 100)}%p · ${definition.durationSeconds}초`;
    }
    if (abilityId === "barley-armor-break") return `기본 공격 적중 시 방어도 ${Math.round(value * 100)}% 감소 · 5초`;
    return `강화 ${level}`;
  }
  function powerTitle(abilityId, value) {
    if (abilityId === "pea-death-split") return `T1 ${value}마리 생성`;
    if (abilityId === "corn-burst-fire") return `${value}발 연사`;
    if (abilityId === "corn-popcorn-chain") return `ATK ×${value} 폭발`;
    if (abilityId === "chestnut-spike-fan") return `가시 ${value}발`;
    if (abilityId === "kidney-continuous-leap") return `초기화 ${Math.round(value * 100)}%`;
    if (abilityId === "kidney-landing-shockwave") return `충격파 ×${value}`;
    if (abilityId === "peanut-separated-assault") return `협공 ${value}타`;
    if (abilityId === "walnut-guard-slam") return `반격 피해 ×${value}`;
    if (abilityId === "rice-low-health-harvest") return `수확 피해 ×${value}`;
    if (abilityId === "wheat-command-crit") return `치명타 +${Math.round(value * 100)}%p`;
    if (abilityId === "barley-armor-break") return `방어도 ${Math.round(value * 100)}% 감소`;
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
  function farmUpgradeReasonLabel(reason) {
    switch (reason) {
      case "insufficient-points":
        return "공용 XP 포인트가 필요합니다.";
      case "combat-lock":
        return "전투 중에는 투자할 수 없습니다.";
      case "farm-only":
        return "농장에서만 투자할 수 있습니다.";
      case "max-level":
        return "최대 강화 단계입니다.";
      case "invalid-state":
        return "성장 데이터가 유효하지 않습니다.";
      default:
        return "사용할 수 없는 노드입니다.";
    }
  }

  // src/farm-app.js
  init_raid_settlement();
  init_boss_rewards();
  init_farm_boss_stages();
  init_species_catalog();
  var $2 = (id) => document.getElementById(id);
  var storage = new FarmStorage();
  $2("abilitySpeciesTabs").innerHTML = renderAbilitySpeciesTabsMarkup();
  var observedWorld = null;
  var imported = null;
  var importedLegacy = false;
  var active = null;
  var home = true;
  var personalGarden = null;
  var noticeSequence = 0;
  var menuOpen = false;
  var menuTab = "play";
  var menuWasPaused = true;
  var menuPauseChanged = false;
  var menuAutoPaused = false;
  var dropPointer = null;
  var dropTimer = null;
  var bossEncounterOpen = false;
  var bossSwipe = null;
  var bossPauseBeforeOpen = null;
  var lastAutoSettledRunKey = null;
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
    if (active) active.paused = true;
  };
  var bossPreviewSources = /* @__PURE__ */ new Map();
  var bossPreviewVersions = /* @__PURE__ */ new WeakMap();
  function bossPreviewSource(asset) {
    if (bossPreviewSources.has(asset)) {
      const cached = bossPreviewSources.get(asset);
      bossPreviewSources.delete(asset);
      bossPreviewSources.set(asset, cached);
      return cached;
    }
    const source = fetch(new URL(asset, document.baseURI), { credentials: "same-origin" }).then((response) => {
      if (!response.ok) throw Error(`Boss preview source failed: ${response.status}`);
      return response.text();
    });
    bossPreviewSources.set(asset, source);
    if (bossPreviewSources.size > 16) bossPreviewSources.delete(bossPreviewSources.keys().next().value);
    source.catch(() => {
      if (bossPreviewSources.get(asset) === source) bossPreviewSources.delete(asset);
    });
    return source;
  }
  async function createNeutralBossPreview(species, asset) {
    const compiled = globalThis.BudmoriVectorResources?.troops?.[species], expressions = compiled?.metadata?.expressions, neutral = expressions?.neutral;
    if (!neutral) throw Error(`Species ${species} is missing the neutral GameKit expression`);
    const documentSvg = new DOMParser().parseFromString(await bossPreviewSource(`./assets/troops/${asset}`), "image/svg+xml");
    if (documentSvg.getElementsByTagName("parsererror").length || documentSvg.documentElement.localName !== "svg") throw Error(`Invalid SVG preview source: ${asset}`);
    const svg = documentSvg.documentElement, nodesById = new Map([...svg.querySelectorAll("[id]")].map((node) => [node.getAttribute("id"), node]));
    const expressionParts = new Set(Object.values(expressions).flatMap((variant) => [...variant.show, ...variant.hide])), visible = new Set(neutral.show);
    for (const id of neutral.hide) visible.delete(id);
    for (const id of expressionParts) {
      const node = nodesById.get(id);
      if (!node) throw Error(`SVG preview is missing GameKit expression part: ${id}`);
      node.style.setProperty("display", visible.has(id) ? "inline" : "none");
    }
    const idlePose = compiled.metadata.clips.idle.keyframes[0].parts;
    for (const [id, pose] of Object.entries(idlePose)) if (pose.opacity !== void 0) {
      const node = nodesById.get(id);
      if (!node) throw Error(`SVG preview is missing idle part: ${id}`);
      node.style.setProperty("opacity", String(pose.opacity));
    }
    return document.importNode(svg, true);
  }
  async function renderNeutralBossPreview(target, species, asset, label = "") {
    const version = (bossPreviewVersions.get(target) || 0) + 1;
    bossPreviewVersions.set(target, version);
    target.setAttribute("aria-busy", "true");
    try {
      const svg = await createNeutralBossPreview(species, asset);
      if (bossPreviewVersions.get(target) !== version || !target.isConnected) return;
      svg.id = target.id;
      svg.setAttribute("class", target.getAttribute("class") || "");
      svg.removeAttribute("hidden");
      svg.setAttribute("aria-busy", "false");
      if (label) {
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", label);
      } else {
        svg.setAttribute("aria-hidden", "true");
        svg.removeAttribute("role");
        svg.removeAttribute("aria-label");
      }
      target.replaceWith(svg);
      bossPreviewVersions.set(svg, version);
    } catch (error) {
      if (bossPreviewVersions.get(target) !== version) return;
      target.hidden = true;
      target.setAttribute("aria-busy", "false");
      console.error("Unable to render neutral boss preview", error);
    }
  }
  function writeCheckpoint(world = personalGarden) {
    if (!world) return false;
    const ok = storage.save(world);
    $2("saveNotice").textContent = ok ? "" : storage.error;
    $2("treeStorage").hidden = ok;
    return ok;
  }
  var autosave = new FarmAutosave(() => writeCheckpoint());
  function saveImmediate(world = personalGarden) {
    const ok = writeCheckpoint(world);
    if (ok) autosave.reset();
    return ok;
  }
  function markPersistentChange(world) {
    if (world === personalGarden) autosave.markDirty();
  }
  function onWorldStep(world) {
    markPersistentChange(world);
    if (world?.scene !== "raid" || !["victory", "defeat"].includes(world.encounter?.outcome) || !personalGarden || personalGarden.activeRaidRunSequence === null) return;
    const ownerId = active?.localPlayerId, run = { sessionId: personalGarden.activeRaidSessionId, runSequence: personalGarden.activeRaidRunSequence };
    if (!ownerId || !run.sessionId || !run.runSequence) return;
    const runKey = `${run.sessionId}:${run.runSequence}`;
    if (lastAutoSettledRunKey === runKey) return;
    lastAutoSettledRunKey = runKey;
    try {
      persistRaidSettlement(localSettlementRoster(world, ownerId, run), ownerId);
    } catch (error) {
      fail2(error);
    }
  }
  function persist() {
    if (active?.world === personalGarden) active.flushQueuedCommands();
    return autosave.flush();
  }
  var foodFeel = new FoodFeel(requestFeed);
  var combatFeel = new CombatFeel(foodFeel);
  function requestFeed() {
    if (!home && active && !active.paused) {
      foodFeel.unlock();
      active.queue("feed");
    }
  }
  function install(world) {
    active?.dispose();
    active = new FarmSession(world, { onError: fail2, onWorldStep });
    noticeSequence = world.eventSequence;
    observedWorld = world;
    return active;
  }
  install(new Garden());
  active.paused = true;
  function showBossEncounterMessage(text) {
    const message = $2("bossEncounterMessage");
    message.textContent = text;
    message.hidden = !text;
    if (text) {
      clearTimeout(showBossEncounterMessage.timer);
      showBossEncounterMessage.timer = setTimeout(() => {
        message.hidden = true;
      }, 1800);
    }
  }
  function renderBossEncounterStage(stage) {
    if (!personalGarden || active?.world?.scene === "raid") return null;
    const progress = personalGarden.farmBossProgress, wasSelected = progress.selections.some((entry) => entry.stage === stage), previousStage = progress.currentStage;
    const selection = selectFarmBossStage(progress, stage);
    if (!wasSelected || previousStage !== stage) saveImmediate(personalGarden);
    const species = selection.species, catalogEntry = speciesById(species), rewardName = speciesRewardName(species), encounterName = giantSpeciesName(species), rolls = selection.rolls;
    $2("bossStageCounter").textContent = `${selection.stage} / ${BOSS_REWARD_SETTINGS.maxStage}`;
    $2("bossStageLabel").textContent = `STAGE ${selection.stage}`;
    renderNeutralBossPreview($2("bossPreview"), species, catalogEntry.asset, `${encounterName} 미리보기`);
    $2("bossStageName").textContent = encounterName;
    $2("bossStageHp").textContent = `HP ${Math.round(selection.hp).toLocaleString("ko-KR")}`;
    $2("bossStageAttack").textContent = `공격력 ${Number(selection.attackPower.toPrecision(3)).toLocaleString("ko-KR")}`;
    $2("bossStageXp").textContent = `+${selection.xp.toLocaleString("ko-KR")} XP`;
    $2("bossStageDrop").hidden = rolls === 0;
    $2("bossStageDrop").replaceChildren();
    if (rolls > 0) {
      const icon = document.createElement("img");
      icon.draggable = false;
      const label = document.createElement("span"), title = document.createElement("strong"), details = document.createElement("small");
      title.textContent = rewardName;
      details.textContent = `${Math.round(BOSS_REWARD_SETTINGS.acquisitionChance * 100)}%씩 · ${rolls}회 개별 추첨 · 성공마다 T1 1마리`;
      label.append(title, details);
      $2("bossStageDrop").append(icon, label);
      renderNeutralBossPreview(icon, species, catalogEntry.asset);
      $2("bossStageNotice").textContent = "";
    } else $2("bossStageNotice").textContent = "종 보상은 없어요 · 5스테이지부터 1회 추첨";
    $2("bossEncounterChallenge").disabled = !hasRaidRosterEntries(personalGarden.units) || personalGarden.farmBossEvent?.phase !== "idle" || personalGarden.activeRaidRunSequence !== null;
    $2("bossEncounterChallenge").title = $2("bossEncounterChallenge").disabled ? "전투를 시작하려면 투입 가능한 병력과 정원 상태가 필요해요." : "";
    return selection;
  }
  function openBossEncounter(push = true) {
    if (active?.world?.scene === "raid") return false;
    if (!personalGarden) {
      if (storage.world && storage.world.activeRaidRunSequence === null) start(restore(snapshot(storage.world)), false);
      else return false;
    }
    if (personalGarden.farmBossEvent?.phase !== "idle" || personalGarden.activeRaidRunSequence !== null) return false;
    if (!persist()) return false;
    if (menuOpen) closeMenu(false);
    bossPauseBeforeOpen = active?.paused ?? true;
    if (active && !bossPauseBeforeOpen) {
      active.paused = true;
      active.loop.resetTiming();
    }
    bossEncounterOpen = true;
    document.body.dataset.bossScreen = "true";
    $2("bossEncounterScreen").hidden = false;
    renderBossEncounterStage(personalGarden.farmBossProgress.currentStage);
    if (push) history.pushState(null, "", "#/boss");
    $2("bossEncounterBack").focus();
    return true;
  }
  function closeBossEncounter(push = true) {
    if (!bossEncounterOpen) return;
    bossEncounterOpen = false;
    document.body.dataset.bossScreen = "false";
    $2("bossEncounterScreen").hidden = true;
    bossSwipe = null;
    for (const id of ["bossPreview"]) {
      const preview = $2(id);
      if (preview) {
        bossPreviewVersions.set(preview, (bossPreviewVersions.get(preview) || 0) + 1);
        preview.hidden = true;
      }
    }
    if (active && bossPauseBeforeOpen !== null) {
      active.paused = bossPauseBeforeOpen;
      bossPauseBeforeOpen = null;
      active.loop.resetTiming();
    }
    if (push) history.pushState(null, "", "#/farm");
  }
  function refreshStart() {
    const hasReservedRaid = storage.hasReservedRaid, liveRaid = active?.world?.scene === "raid", staleRaid = hasReservedRaid && !liveRaid;
    $2("continueGame").disabled = !storage.hasWorld || staleRaid;
    $2("startBossEncounter").disabled = !storage.hasWorld || staleRaid;
    $2("staleRaidNotice").hidden = !staleRaid;
    $2("continueLegacyGame").disabled = !storage.legacyCompatible;
    $2("legacySaveNotice").hidden = !storage.legacyCompatible;
    $2("exportSave").disabled = !(storage.raw || storage.legacyRaw);
    $2("exportLegacySave").hidden = !storage.legacyBackup;
    $2("exportLegacySave").disabled = !storage.legacyBackup;
    $2("saveNotice").textContent = [storage.migrationNotice, storage.error].filter(Boolean).join(" ");
  }
  function setHome(value, push = true) {
    if (value) {
      persist();
      if (menuOpen) closeMenu(false);
      if (bossEncounterOpen) closeBossEncounter(false);
    }
    home = value;
    document.body.dataset.home = String(value);
    $2("startScreen").hidden = !value;
    active.paused = value;
    if (push) history.pushState(null, "", value ? "#/" : active.world.scene === "raid" ? "#/raid" : "#/farm");
    refreshStart();
    if (value) $2("continueGame").focus();
  }
  function start(world, push = true) {
    autosave.reset();
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
    if (!saveImmediate(candidate)) {
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
      const garden = restore(farm), stage = raidWorld.boss.stage || 0, stageReward = stage ? bossStageStats(stage) : null, resolved = settleBossKill(garden, { encounterId: farmRun.runSequence, source: "raid", receiptKey, acquisitionMultiplier: deploymentMultiplier, rollCount: stageReward?.rolls ?? 1, xpAmount: stageReward?.xp, species: raidWorld.boss.species ?? 3, tier: 1, x: raidWorld.boss.x, y: raidWorld.boss.y });
      const reward = resolved.receipt;
      return { farm: snapshot(garden), summary: { stage, acquisition: { status: reward.status, chance: reward.chance, roll: reward.roll, rollCount: reward.rollCount, rolls: reward.drops, unitId: reward.unitId, receiptKey: reward.receiptKey }, xp: { status: reward.xpStatus, amount: reward.xpAmount, levelsGained: reward.levelsGained, pointsAwarded: reward.pointsAwarded, receiptKey: reward.xpReceiptKey } } };
    } });
    let settled = prepare(personalGarden), candidate = restore(settled.farm);
    if (!saveImmediate(candidate)) {
      if (!storage.refresh()) throw Error(storage.error || "최신 농장 저장을 다시 읽지 못했어요.");
      settled = prepare(storage.world);
      candidate = restore(settled.farm);
      if (!saveImmediate(candidate)) throw Error(storage.error || "전투 결과 저장에 실패했어요.");
    }
    personalGarden = storage.world;
    return settled;
  }
  function beginRaid(push = true) {
    if (!personalGarden || active.world.scene === "raid" || personalGarden.activeRaidRunSequence !== null || personalGarden.farmBossEvent?.phase !== "idle" || !raidRosterEntries(personalGarden.units, 1).length) return;
    if (!persist()) return;
    const bossStage = renderBossEncounterStage(personalGarden.farmBossProgress.currentStage);
    if (!bossStage || !persist()) return;
    const reserved = reservePersonalRaidRun();
    if (!reserved) return;
    renderer.dropTarget = null;
    closeBossEncounter(false);
    const battle = Garden.createRaidBattle(personalGarden.seed + Math.floor(performance.now()) >>> 0, ["solo"], bossStage);
    install(battle);
    active.queue("register-roster", { entries: raidRosterEntries(personalGarden.units, CONFIG.maxRaidPlayerUnits), abilitySnapshot: createAbilityRuntimeSnapshot(personalGarden.playerProgression), settlement: { sessionId: reserved.sessionId, runSequence: reserved.runSequence, encounterId: reserved.runSequence } });
    setHome(false, push);
  }
  async function returnToFarm(push = true) {
    stopDrop();
    if (bossEncounterOpen) closeBossEncounter(false);
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
    renderer.dropTarget = null;
    install(personalGarden);
    setHome(false, push);
    return true;
  }
  $2("continueGame").onclick = () => {
    if (active?.world?.scene === "raid") {
      setHome(false);
      return;
    }
    if (storage.world && storage.world.activeRaidRunSequence === null) start(restore(snapshot(storage.world)));
  };
  $2("startBossEncounter").onclick = () => {
    if (!storage.world || storage.world.activeRaidRunSequence !== null) return;
    start(restore(snapshot(storage.world)), false);
    openBossEncounter();
  };
  $2("menuBossEncounter").onclick = () => {
    closeMenu(false);
    openBossEncounter();
  };
  $2("bossEncounterBack").onclick = () => closeBossEncounter();
  $2("bossEncounterChallenge").onclick = () => {
    if ($2("bossEncounterChallenge").disabled) return;
    closeBossEncounter(false);
    beginRaid(true);
  };
  $2("bossEncounterScreen").addEventListener("pointerdown", (e) => {
    if (!bossEncounterOpen || e.button > 0 || e.target.closest("button")) return;
    const viewport = $2("bossEncounterViewport"), card = $2("bossEncounterCard");
    bossSwipe = { pointerId: e.pointerId, y: e.clientY };
    card.style.transition = "none";
    viewport.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  $2("bossEncounterScreen").addEventListener("pointermove", (e) => {
    if (!bossSwipe || e.pointerId !== bossSwipe.pointerId) return;
    const delta = Math.max(-120, Math.min(120, e.clientY - bossSwipe.y));
    $2("bossEncounterCard").style.transform = `translateY(${delta * 0.55}px)`;
    e.preventDefault();
  });
  $2("bossEncounterScreen").addEventListener("pointerup", (e) => {
    if (!bossSwipe || e.pointerId !== bossSwipe.pointerId) return;
    const delta = e.clientY - bossSwipe.y, card = $2("bossEncounterCard");
    bossSwipe = null;
    if (Math.abs(delta) < 42) {
      card.style.transition = "transform .18s ease-out";
      card.style.transform = "translateY(0)";
      setTimeout(() => {
        card.style.transition = "";
        card.style.transform = "";
      }, 200);
      return;
    }
    const current = personalGarden?.farmBossProgress?.currentStage || 1, next = delta < 0 ? Math.min(BOSS_REWARD_SETTINGS.maxStage, current + 1) : Math.max(1, current - 1);
    if (next === current) {
      showBossEncounterMessage(delta < 0 ? `현재 스테이지 상한 ${BOSS_REWARD_SETTINGS.maxStage}예요` : "첫 스테이지예요");
      return;
    }
    card.style.transform = "";
    card.style.transition = "";
    card.style.animation = "none";
    void card.offsetWidth;
    card.style.animation = "";
    renderBossEncounterStage(next);
  });
  $2("bossEncounterScreen").addEventListener("pointercancel", (e) => {
    if (bossSwipe?.pointerId === e.pointerId) {
      bossSwipe = null;
      const card = $2("bossEncounterCard");
      card.style.transition = "transform .18s ease-out";
      card.style.transform = "translateY(0)";
      setTimeout(() => {
        card.style.transition = "";
        card.style.transform = "";
      }, 200);
    }
  });
  $2("abortRaidRun").onclick = () => {
    if (active?.world?.scene === "raid") return;
    const world = storage.world;
    if (!world || world.activeRaidRunSequence === null) return refreshStart();
    try {
      const result = abortReservedRaidRun(snapshot(world), { completedAtMs: Date.now() });
      if (!result.applied) return refreshStart();
      if (!saveImmediate(restore(result.farm))) {
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
    if (storage.replace(world)) {
      autosave.reset();
      start(world);
    } else refreshStart();
  };
  $2("confirmNew").onclick = () => {
    const world = new Garden();
    if (storage.replace(world)) {
      autosave.reset();
      $2("newConfirm").hidden = true;
      start(world);
    } else refreshStart();
  };
  $2("cancelNew").onclick = () => {
    $2("newConfirm").hidden = true;
  };
  $2("exportSave").onclick = () => {
    const raw = storage.raw || storage.legacyRaw;
    if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" })), a = document.createElement("a");
    a.href = url;
    a.download = "budmori-save-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  };
  $2("exportLegacySave").onclick = () => {
    const raw = storage.legacyBackup?.raw;
    if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" })), a = document.createElement("a");
    a.href = url;
    a.download = "budmori-legacy-save-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  };
  $2("importSave").onclick = () => $2("saveFile").click();
  $2("continueLegacyGame").onclick = async () => {
    if (!storage.legacyRaw) return;
    try {
      const { validateSave: validateSave2 } = await Promise.resolve().then(() => (init_farm_storage(), farm_storage_exports));
      validateSave2(storage.legacyRaw);
      imported = storage.legacyRaw;
      importedLegacy = true;
      $2("importConfirmText").textContent = saveHasLegacyFarmProgress(storage.legacyRaw) ? "이전 활동 기반 강화는 종료되고 경험치 포인트로 통합돼요. 기존 무료 강화는 초기화되고, 원본을 먼저 백업합니다. 이어갈까요?" : "0.4 원본 저장은 그대로 두고 새 저장 키에 복사해 이어갈까요?";
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
      const { validateSave: validateSave2 } = await Promise.resolve().then(() => (init_farm_storage(), farm_storage_exports));
      validateSave2(text);
      imported = text;
      importedLegacy = false;
      $2("importConfirmText").textContent = saveHasLegacyFarmProgress(text) ? "이전 활동 기반 강화는 종료되고 경험치 포인트로 통합돼요. 기존 무료 강화는 초기화됩니다. 원본을 먼저 백업한 뒤 이 저장을 불러올까요?" : "선택한 파일로 개인 저장을 바꿀까요?";
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
    try {
      if (imported) {
        const legacy = importedLegacy, world = storage.import(imported);
        autosave.reset();
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
  $2("farm").onclick = () => returnToFarm();
  $2("raid").onclick = () => openBossEncounter();
  $2("return").onclick = () => returnToFarm();
  for (const value of ["breed", "merge"]) $2(value).onclick = () => active.queue("mode", { value });
  $2("feed").addEventListener("keydown", (e) => {
    if (e.repeat && ["Enter", " "].includes(e.key)) e.preventDefault();
  });
  $2("feed").onclick = (e) => {
    if (e.detail === 0 && !e.pointerType) requestFeed();
  };
  $2("pause").onclick = () => {
    menuPauseChanged = true;
    active.paused = !active.paused;
    if (active.paused) persist();
    else if (menuOpen) closeMenu();
  };
  function drawTree() {
    const w = personalGarden || active.world, inCombat = w.running || w.farmBossEvent?.phase !== "idle";
    $2("treeNodes").innerHTML = renderFarmUpgradeTreeMarkup(w.playerProgression, { location: w.scene, inCombat });
  }
  function drawAbilityTree() {
    const w = personalGarden || active.world, inCombat = w.running || w.farmBossEvent?.phase !== "idle";
    const selectedSpecies = Number($2("abilityPanel").dataset.selectedSpecies || 0);
    $2("abilityPoints").textContent = String(w.playerProgression.availablePoints);
    for (const button of $2("abilitySpeciesTabs").querySelectorAll("[data-ability-species]")) button.setAttribute("aria-pressed", String(Number(button.dataset.abilitySpecies) === selectedSpecies));
    $2("abilityNodes").innerHTML = renderAbilityTreeMarkup(w.playerProgression, { highestSpeciesTier: w.highestSpeciesTiers(), location: w.scene, inCombat, selectedSpecies });
  }
  var menuRoutes = { play: "#/menu", growth: "#/growth", abilities: "#/abilities", help: "#/help" };
  var routeMenuTab = (route2) => route2 === "#/growth" ? "growth" : route2 === "#/abilities" ? "abilities" : route2 === "#/help" ? "help" : "play";
  function applyMenuTab(tab) {
    menuTab = tab;
    for (const button of $2("gameMenuTabs").querySelectorAll("[data-menu-tab]")) {
      const selected = button.dataset.menuTab === tab;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    for (const [name, id] of [["play", "menuPlayPanel"], ["growth", "treePanel"], ["abilities", "abilityPanel"], ["help", "helpPanel"]]) $2(id).hidden = name !== tab;
    if (tab === "growth") drawTree();
    else if (tab === "abilities") drawAbilityTree();
  }
  function syncMenuPause(tab) {
    if (tab === "play") {
      if (menuAutoPaused && !menuPauseChanged) active.paused = menuWasPaused;
      menuAutoPaused = false;
      return;
    }
    if (!menuAutoPaused) menuWasPaused = active.paused;
    menuAutoPaused = true;
    if (!active.paused) {
      active.paused = true;
      persist();
    }
  }
  function openMenu(tab = "play", push = true) {
    if (!menuOpen) {
      menuWasPaused = active.paused;
      menuPauseChanged = false;
      menuAutoPaused = false;
      menuOpen = true;
      $2("gameMenuOverlay").hidden = false;
      $2("gameMenu").setAttribute("aria-expanded", "true");
    }
    syncMenuPause(tab);
    applyMenuTab(tab);
    if (push) history.pushState(null, "", menuRoutes[tab] || menuRoutes.play);
    $2("gameMenuTabs").querySelector(`[data-menu-tab="${tab}"]`)?.focus();
  }
  function switchMenuTab(tab, push = true) {
    if (!["play", "growth", "abilities", "help"].includes(tab)) return;
    if (!menuOpen) {
      openMenu(tab, push);
      return;
    }
    if (menuTab === tab) return;
    syncMenuPause(tab);
    applyMenuTab(tab);
    if (push) history.pushState(null, "", menuRoutes[tab]);
  }
  function closeMenu(push = true) {
    if (!menuOpen) return;
    menuOpen = false;
    $2("gameMenuOverlay").hidden = true;
    $2("gameMenu").setAttribute("aria-expanded", "false");
    if (menuAutoPaused && !menuPauseChanged) active.paused = menuWasPaused;
    menuPauseChanged = false;
    menuAutoPaused = false;
    if (push) history.pushState(null, "", active.world.scene === "raid" ? "#/raid" : "#/farm");
    $2("gameMenu").focus();
  }
  $2("gameMenu").onclick = () => menuOpen ? closeMenu() : openMenu();
  $2("gameMenuClose").onclick = () => closeMenu();
  $2("menuHome").onclick = () => {
    closeMenu(false);
    setHome(true);
  };
  $2("gameMenuTabs").onclick = (e) => {
    const button = e.target.closest("[data-menu-tab]");
    if (button && !button.disabled) switchMenuTab(button.dataset.menuTab);
  };
  $2("gameMenuTabs").onkeydown = (e) => {
    const buttons = [...$2("gameMenuTabs").querySelectorAll('[role="tab"]:not(:disabled)')], index = buttons.indexOf(document.activeElement);
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % buttons.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = buttons.length - 1;
    else return;
    e.preventDefault();
    buttons[next]?.focus();
    if (buttons[next]) switchMenuTab(buttons[next].dataset.menuTab);
  };
  var gameMenuOverlay = $2("gameMenuOverlay");
  var closeMenuFromBackdrop = (e) => {
    if (e.target === gameMenuOverlay) closeMenu();
  };
  gameMenuOverlay.addEventListener("pointerdown", closeMenuFromBackdrop);
  gameMenuOverlay.addEventListener("click", closeMenuFromBackdrop);
  $2("treeNodes").onclick = (e) => {
    const b = e.target.closest("[data-progression-farm-node]");
    if (b) {
      active.queue("progression-invest", { scope: "farm", nodeId: b.dataset.progressionFarmNode });
      setTimeout(drawTree, 180);
    }
  };
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
      active.queue("progression-invest", { scope: "ability", abilityId, nodeId });
    }
    setTimeout(drawAbilityTree, 180);
  };
  function focusableMenuButtons() {
    return [...$2("gameMenuPanel").querySelectorAll('button:not(:disabled):not([aria-disabled="true"])')].filter((button) => button.getClientRects().length > 0);
  }
  $2("gameMenuPanel").onkeydown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key !== "Tab") return;
    const buttons = focusableMenuButtons();
    if (!buttons.length) return;
    const first = buttons[0], last = buttons.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  var canvas = $2("world");
  function syncText(id, value) {
    const node = $2(id), text = String(value);
    if (node.textContent !== text) node.textContent = text;
  }
  function syncFlag(id, key, value) {
    const node = $2(id), flag = !!value;
    if (node[key] !== flag) node[key] = flag;
  }
  function syncAttribute(id, key, value) {
    const node = $2(id), text = String(value);
    if (node.getAttribute(key) !== text) node.setAttribute(key, text);
  }
  var hudWidths = /* @__PURE__ */ new Map();
  function syncWidth(id, value) {
    const node = $2(id);
    let previous = hudWidths.get(id);
    if (previous?.value === value && previous.applied === node.style.width) return;
    if (node.style.width !== value) node.style.width = value;
    if (!previous) {
      previous = {};
      hudWidths.set(id, previous);
    }
    previous.value = value;
    previous.applied = node.style.width;
  }
  function syncData(id, key, value) {
    const node = $2(id), text = String(value);
    if (node.dataset[key] !== text) node.dataset[key] = text;
  }
  function deploymentHud() {
    const w = active.world, raid = w.scene === "raid", roster = w.raidRoster(active.localPlayerId), remaining = roster ? w.raidRemaining(active.localPlayerId) : personalGarden?.units.length || 0, queued = roster ? Math.max(0, active.localDeploySequence - roster.lastDeploySequence) : 0;
    syncText("raidRemaining", !roster ? "출전 병력을 준비하고 있어요…" : `남은 병력 ${Math.max(0, remaining - queued)} · 전장을 탭해 투입 · 누르고 있으면 100ms마다 한 마리`);
    const own = w.raidRoster(active.localPlayerId), cooldown = own ? Math.max(0, own.buffReadyAt - w.time) : 0;
    syncFlag("buff", "disabled", !raid || !w.running || !own || cooldown > 0);
    syncText("buff", cooldown > 0 ? `강화 ${cooldown.toFixed(1)}초` : "팀 강화");
    let deployed = 0;
    if (own) {
      for (const troop of own.troops) if (troop.deployed) deployed++;
    }
    const stage = w.boss.stage || 0;
    if (stage) {
      const stageReward = bossStageStats(stage), multiplier = raidDeploymentRewardMultiplier({ availableAtStart: own?.troops.length || 0, originalUnitsDeployed: deployed }), chance = Math.round(bossAcquisitionChance({ acquisitionMultiplier: multiplier }) * 100);
      syncText("raidRewardChance", stageReward.rolls ? `${speciesRewardName(w.boss.species)} · ${chance}%씩 · ${stageReward.rolls}회 개별 추첨` : "종 추첨 없음");
    } else syncText("raidRewardChance", "");
  }
  function deployAt(p) {
    if (home || active.world.scene !== "raid" || !active.world.raidExpectedPlayers.every((id) => active.world.raidRoster(id))) return false;
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
    if (e.key === "Escape" && bossEncounterOpen) {
      e.preventDefault();
      closeBossEncounter();
    } else if (e.key === "Escape" && menuOpen) {
      e.preventDefault();
      closeMenu();
    } else if (bossEncounterOpen && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      const current = personalGarden?.farmBossProgress?.currentStage || 1, next = e.key === "ArrowUp" ? Math.min(BOSS_REWARD_SETTINGS.maxStage, current + 1) : Math.max(1, current - 1);
      renderBossEncounterStage(next);
    }
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) location.reload();
  });
  window.addEventListener("resize", () => renderer.resize());
  window.addEventListener("pagehide", () => {
    persist();
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
      if (menuOpen) closeMenu(false);
      setHome(true, false);
      return;
    }
    if (storage.hasReservedRaid && active.world.scene !== "raid") {
      if (menuOpen) closeMenu(false);
      setHome(true, false);
      history.replaceState(null, "", "#/");
      return;
    }
    if (home) {
      if (storage.error && !storage.hasWorld) {
        setHome(true, false);
        history.replaceState(null, "", "#/");
        return;
      }
      if (storage.hasWorld) start(restore(snapshot(storage.world)), false);
      else start(new Garden(), false);
    }
    if (r === "#/boss") {
      if (!openBossEncounter(false)) history.replaceState(null, "", "#/farm");
      return;
    }
    if (r === "#/help" || r === "#/growth" || r === "#/abilities" || r === "#/menu") {
      const raid = active.world.scene === "raid", farmEventActive = !raid && personalGarden?.farmBossEvent?.phase !== "idle";
      const restricted = r === "#/growth" && (raid || farmEventActive) || r === "#/abilities" && (raid || !personalGarden);
      if (restricted) {
        if (menuOpen) closeMenu(false);
        history.replaceState(null, "", raid ? "#/raid" : "#/farm");
        return;
      }
      openMenu(routeMenuTab(r), false);
      return;
    }
    if (menuOpen) closeMenu(false);
    if (bossEncounterOpen && r !== "#/boss") closeBossEncounter(false);
    if (r === "#/raid") {
      if (personalGarden?.farmBossEvent?.phase !== "idle") {
        history.replaceState(null, "", "#/farm");
      } else openBossEncounter(false);
    } else if (r === "#/farm" && active.world.scene === "raid") returnToFarm(false);
  }
  window.addEventListener("popstate", route);
  function sync(display, now) {
    const w = active.world, raid = display.scene === "raid", farmEvent = display.farmBossEvent, farmEventActive = !raid && farmEvent?.phase !== "idle", battleHud = raid || farmEventActive, hasReadyTroops = personalGarden ? hasRaidRosterEntries(personalGarden.units) : false, rewardWorld = personalGarden || w, pendingReward = rewardWorld.bossRewardReceipts.find((reward) => reward.status === "pending");
    syncAttribute("farm", "aria-pressed", !raid && !bossEncounterOpen);
    syncAttribute("raid", "aria-pressed", raid || bossEncounterOpen);
    syncAttribute("breed", "aria-pressed", w.mode === "breed");
    syncAttribute("merge", "aria-pressed", w.mode === "merge");
    let displayedCount = 0, worldCount = 0, armyCurrent = 0, armyMax = 0, armyLiving = 0, armyTotal = 0;
    for (const unit of display.units) {
      if (!unit.isBattleOnlySummon) displayedCount++;
      if (unit.faction === CONFIG.factions.PLAYER) {
        armyCurrent += Math.max(0, Math.min(unit.maxHp, unit.hp));
        armyMax += unit.maxHp;
        armyLiving += unit.hp > 0 ? 1 : 0;
        armyTotal++;
      }
    }
    if (!raid) {
      for (const unit of w.units) if (!unit.isBattleOnlySummon) worldCount++;
    }
    syncFlag("bossEncounterScreen", "hidden", home || !bossEncounterOpen);
    syncFlag("farmControls", "hidden", raid || farmEventActive || home || bossEncounterOpen);
    syncFlag("raidControls", "hidden", !raid || home);
    syncFlag("bossbar", "hidden", !battleHud || home);
    syncText("count", raid ? w.raidRoster(active.localPlayerId)?.troops.length ?? personalGarden?.units.length ?? 0 : displayedCount);
    syncText("capacity", personalGarden?.capacity ?? CONFIG.cap);
    syncText("starter", raid ? `${w.units.length} deployed in raid` : pendingReward ? `${speciesRewardName(pendingReward.species)} 보상 대기 · 공간이 생기면 합류해요` : !hasReadyTroops ? "모두 휴식 중 · 회복까지 기다려 주세요" : worldCount >= w.capacity ? "정원이 가득 찼어요" : "번식으로 식구를 늘려요");
    syncWidth("allyHealth", (armyMax ? armyCurrent / armyMax * 100 : 0) + "%");
    syncText("allyHealthText", Math.ceil(armyCurrent) + " / " + Math.ceil(armyMax) + " HP · " + armyLiving + "/" + armyTotal + " 생존");
    const boss = display.boss, battleOutcome = raid ? w.encounter.outcome : farmEvent?.outcome, settledRunSequence = raid ? personalGarden?.activeRaidRunSequence ?? w.boss.encounterId : null, settledReward = raid && personalGarden?.raidSettlementReceipts?.find((receipt) => receipt.runSequence === settledRunSequence)?.reward, stageName = raid && boss.stage ? `STAGE ${boss.stage}` : "", rewardName = speciesRewardName(boss.species), encounterName = giantSpeciesName(boss.species);
    syncText("bossName", encounterName);
    syncAttribute("bossHealth", "aria-label", `${encounterName} 체력`);
    syncText("bossHealthText", Math.ceil(boss.hp) + " / " + boss.maxHp + " HP");
    syncText("bossHealthNote", farmEventActive ? "상대 능력치 고정" : "전사자 포함 최대 HP");
    syncAttribute("allyHealth", "aria-valuenow", armyCurrent);
    syncAttribute("allyHealth", "aria-valuemax", armyMax);
    syncAttribute("bossHealth", "aria-valuenow", boss.hp);
    syncAttribute("bossHealth", "aria-valuemax", boss.maxHp);
    syncWidth("bossHealth", boss.maxHp ? boss.hp / boss.maxHp * 100 + "%" : "0%");
    syncText("battleOutcome", raid ? battleOutcome === "victory" ? `${stageName} · ${encounterName} · 승리 · ${settledReward?.xp?.amount ?? bossStageStats(boss.stage || 1).xp} XP${settledReward?.acquisition?.rollCount ? ` · ${rewardName} ${settledReward.acquisition.rolls?.filter((drop) => drop.status === "granted").length || 0}/${settledReward.acquisition.rollCount}회 성공` : settledReward ? " · 종 추첨 없음" : bossStageStats(boss.stage || 1).rolls ? " · 정원 복귀 후 보상 정산" : " · 종 추첨 없음"} · 모두 정원으로 돌아갈 수 있어요` : battleOutcome === "defeat" ? `${stageName} · ${encounterName} · 패배 · 휴식이 필요해요 · 정원에서 다시 준비해요` : "" : battleOutcome === "victory" ? farmEvent.rewardStatus === "granted" ? `${encounterName} 격파 · ${rewardName} 획득 · 정원에 합류했어요` : farmEvent.rewardStatus === "pending" ? `${encounterName} 격파 · ${rewardName} 획득 대기 · 공간이 생기면 합류해요` : `${encounterName} 격파` : battleOutcome === "defeat" ? `${encounterName} 도전 종료 · 동료들이 다시 일어날 때까지 기다려요` : "");
    syncFlag("battleOutcome", "hidden", home || !battleHud || battleOutcome === "fighting" || battleOutcome === "idle");
    syncFlag("bossEncounterChallenge", "disabled", !personalGarden || !hasReadyTroops || farmEventActive || personalGarden?.activeRaidRunSequence !== null);
    syncFlag("menuTabGrowth", "disabled", raid || farmEventActive || bossEncounterOpen);
    syncFlag("menuTabAbilities", "disabled", raid || !personalGarden);
    syncFlag("raid", "disabled", raid || farmEventActive || !personalGarden);
    syncText("pause", active.paused ? "▶" : "Ⅱ");
    syncAttribute("feed", "aria-label", `먹이 탭, 5회 중 ${w.foodTaps.remainder}회`);
    syncData("feed", "state", w.food.length >= 140 ? "full" : "ready");
    syncData("feed", "produced", now < foodFeel.completeUntil);
    for (let i = 0; i < 5; i++) {
      const pip = foodFeel.pips[i], filled = now < foodFeel.completeUntil || i < w.foodTaps.remainder;
      if (pip.classList.contains("filled") !== filled) pip.classList.toggle("filled", filled);
    }
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
  }
  function frame(now) {
    try {
      measureFrame(now);
      if (!home && !document.hidden) active.pulse(now);
      const display = active.presentation(now);
      combatFeel.observe(active.world, display.displayTimeMs, display.presentationRevision);
      renderer.render(display, combatFeel, display.displayTimeMs);
      sync(display, now);
      requestAnimationFrame(frame);
    } catch (error) {
      if (typeof globalThis.BloomReportRuntimeFatal === "function") globalThis.BloomReportRuntimeFatal(error);
      else console.error("Farm render loop stopped", error);
    }
  }
  $2("productVersion").textContent = PRODUCT_VERSION;
  $2("startVersion").textContent = PRODUCT_VERSION + " · 여섯 등급과 합체 확장";
  setHome(true, false);
  if (location.hash && location.hash !== "#/") route();
  requestAnimationFrame(frame);
  globalThis.BUDMORI = { get sim() {
    return active.world;
  }, get runtime() {
    return active;
  }, get renderMetrics() {
    return frameRate();
  }, get presentationDiagnostics() {
    return active.latestPresentationDiagnostics;
  }, renderer, storage, foodFeel, combatFeel, CONFIG, ATTACK_TYPES: UNIT_ABILITY_PROFILES, Ballistics, ArenaGeometry, version: PRODUCT_VERSION };
})();
