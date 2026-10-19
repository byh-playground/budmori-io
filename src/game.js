(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/features/formation-skills/giant/definition.js
  var DEFINITION;
  var init_definition = __esm({
    "src/features/formation-skills/giant/definition.js"() {
      DEFINITION = Object.freeze({
        id: "giant",
        name: "거대화",
        condition: "damageDealt",
        required: 200,
        description: "아군 몸집 3배 · 20초 지속 · 공격력 3배 · 방어력 +100.",
        upgradeAxis: "대상 수 3 → 5 → 8 (4레벨부터 8명)",
        upgradeValues: Object.freeze([3, 5, 8]),
        durationSeconds: 20
      });
    }
  });

  // src/features/formation-skills/lightning/definition.js
  var DEFINITION2;
  var init_definition2 = __esm({
    "src/features/formation-skills/lightning/definition.js"() {
      DEFINITION2 = Object.freeze({
        id: "lightning",
        name: "낙뢰",
        condition: "hits",
        required: 50,
        description: "하나의 적에게 굵은 낙뢰를 내려 피해 75.",
        upgradeAxis: "피해 ×1.5",
        upgradeBase: 75,
        upgradeFactor: 1.5,
        upgradeStep: 0,
        upgradeUnit: " 피해"
      });
    }
  });

  // src/features/formation-skills/meteor/definition.js
  var DEFINITION3;
  var init_definition3 = __esm({
    "src/features/formation-skills/meteor/definition.js"() {
      DEFINITION3 = Object.freeze({
        id: "meteor",
        name: "운석 낙하",
        condition: "damageDealt",
        required: 250,
        description: "고정 지점에 큰 운석이 떨어져 범위 피해 150과 바깥 넉백.",
        upgradeAxis: "피해 ×1.5",
        upgradeBase: 150,
        upgradeFactor: 1.5,
        upgradeStep: 0,
        upgradeUnit: " 피해"
      });
    }
  });

  // src/features/formation-skills/meteor-shower/definition.js
  var DEFINITION4;
  var init_definition4 = __esm({
    "src/features/formation-skills/meteor-shower/definition.js"() {
      DEFINITION4 = Object.freeze({
        id: "meteor-shower",
        name: "유성우",
        condition: "hits",
        required: 100,
        description: "0.25초 간격으로 유성 5개. 각 범위 피해 25. 빗나갈 수 있어요.",
        upgradeAxis: "운석 +1개",
        upgradeBase: 5,
        upgradeFactor: 1,
        upgradeStep: 1,
        upgradeUnit: "개"
      });
    }
  });

  // src/features/formation-skills/copy/definition.js
  var DEFINITION5;
  var init_definition5 = __esm({
    "src/features/formation-skills/copy/definition.js"() {
      DEFINITION5 = Object.freeze({
        id: "copy",
        name: "복사",
        condition: "hits",
        required: 100,
        description: "가장 밀집한 원본 아군을 복사. 복사체 체력은 1이며 전투 종료까지 생존.",
        upgradeAxis: "반경 ×1.5",
        upgradeBase: 3,
        upgradeFactor: 1.5,
        upgradeStep: 0,
        upgradeUnit: " × T1 몸통 지름"
      });
    }
  });

  // src/features/formation-skills/healing-rain/definition.js
  var DEFINITION6;
  var init_definition6 = __esm({
    "src/features/formation-skills/healing-rain/definition.js"() {
      DEFINITION6 = Object.freeze({
        id: "healing-rain",
        name: "치유의 비",
        condition: "damageTaken",
        required: 200,
        description: "3초 동안 총 100을 부상한 아군에게 동시에 균등 배분.",
        upgradeAxis: "총 회복량 ×1.5",
        upgradeBase: 100,
        upgradeFactor: 1.5,
        upgradeStep: 0,
        upgradeUnit: " 회복"
      });
    }
  });

  // src/features/formation-skills/hammer/definition.js
  var DEFINITION7;
  var init_definition7 = __esm({
    "src/features/formation-skills/hammer/definition.js"() {
      DEFINITION7 = Object.freeze({
        id: "hammer",
        name: "거대 망치",
        condition: "allyDeaths",
        required: 3,
        description: "거대 적 우선, 단일 피해 50과 1초 기절.",
        upgradeAxis: "피해 ×1.5",
        upgradeBase: 50,
        upgradeFactor: 1.5,
        upgradeStep: 0,
        upgradeUnit: " 피해"
      });
    }
  });

  // src/features/formation-skills/ufo/definition.js
  var DURATION, PULSE_INTERVAL, PULSE_DAMAGE, DEFINITION8;
  var init_definition8 = __esm({
    "src/features/formation-skills/ufo/definition.js"() {
      DURATION = 5;
      PULSE_INTERVAL = 0.2;
      PULSE_DAMAGE = 4;
      DEFINITION8 = Object.freeze({
        id: "ufo",
        name: "우주선",
        condition: "critHits",
        required: 10,
        description: `${DURATION}초 동안 ${PULSE_INTERVAL}초마다 수직 레이저 ${PULSE_DAMAGE} 피해 (${DURATION / PULSE_INTERVAL * PULSE_DAMAGE} 피해).`,
        upgradeAxis: "지속시간 +1초",
        pulseInterval: PULSE_INTERVAL,
        pulseDamage: PULSE_DAMAGE,
        upgradeBase: DURATION,
        upgradeFactor: 1,
        upgradeStep: 1,
        upgradeUnit: "초"
      });
    }
  });

  // src/features/formation-skills/storm-cloud/definition.js
  var DURATION2, PULSE_INTERVAL2, PULSE_DAMAGE2, DEFINITION9;
  var init_definition9 = __esm({
    "src/features/formation-skills/storm-cloud/definition.js"() {
      DURATION2 = 5;
      PULSE_INTERVAL2 = 0.2;
      PULSE_DAMAGE2 = 3;
      DEFINITION9 = Object.freeze({
        id: "storm-cloud",
        name: "뇌운",
        condition: "hits",
        required: 75,
        description: `${DURATION2}초 동안 ${PULSE_INTERVAL2}초마다 전기 아크 ${PULSE_DAMAGE2} 피해 (${DURATION2 / PULSE_INTERVAL2 * PULSE_DAMAGE2} 피해).`,
        upgradeAxis: "지속시간 +1초",
        pulseInterval: PULSE_INTERVAL2,
        pulseDamage: PULSE_DAMAGE2,
        upgradeBase: DURATION2,
        upgradeFactor: 1,
        upgradeStep: 1,
        upgradeUnit: "초"
      });
    }
  });

  // src/formation-skill-state.js
  function formationUpgradeValue(definition, level) {
    const LEVEL = Math.max(1, level);
    if (Array.isArray(definition.upgradeValues) && definition.upgradeValues.length) {
      return definition.upgradeValues[Math.min(LEVEL - 1, definition.upgradeValues.length - 1)];
    }
    return definition.upgradeBase * definition.upgradeFactor ** (LEVEL - 1) + definition.upgradeStep * (LEVEL - 1);
  }
  function createFormationSkillState() {
    return { slots: 1, levels: Object.fromEntries(FORMATION_SKILL_DEFINITIONS.map(({ id }) => [id, 0])), equipped: [] };
  }
  function isValidFormationSkillState(state) {
    if (!state || !Number.isInteger(state.slots) || state.slots < 1 || state.slots > 3 || !state.levels || typeof state.levels !== "object" || !Array.isArray(state.equipped) || Object.keys(state).length !== 3 || Object.keys(state.levels).length !== FORMATION_SKILL_DEFINITIONS.length || state.equipped.length > state.slots) {
      return false;
    }
    if (!FORMATION_SKILL_DEFINITIONS.every(
      ({ id }) => Number.isInteger(state.levels[id]) && state.levels[id] >= 0 && state.levels[id] <= FORMATION_MAX_LEVEL
    )) {
      return false;
    }
    const IDS = state.equipped.filter((id) => id !== null);
    return IDS.length === new Set(IDS).size && IDS.every((id) => typeof id === "string" && state.levels[id] > 0);
  }
  function formationInvestedPoints(state) {
    return state ? state.slots - 1 + Object.values(state.levels).reduce((sum, level) => sum + level, 0) : 0;
  }
  function isValidFormationRuntime(runtime) {
    if (!runtime || typeof runtime.active !== "boolean" || !Number.isSafeInteger(runtime.serial) || runtime.serial < 0 || !Array.isArray(runtime.slots) || runtime.slots.length > 12 || !Array.isArray(runtime.effects) || runtime.effects.length > 1024) {
      return false;
    }
    const IDS = /* @__PURE__ */ new Set();
    for (const SLOT of runtime.slots) {
      const DEFINITION13 = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === SLOT.id);
      if (!DEFINITION13 || !Number.isInteger(SLOT.level) || SLOT.level < 1 || SLOT.level > FORMATION_MAX_LEVEL || !Number.isFinite(SLOT.charge) || SLOT.charge < 0 || SLOT.charge > DEFINITION13.required || !Number.isFinite(SLOT.cooldown) || SLOT.cooldown < 0 || SLOT.cooldown > FORMATION_COOLDOWN_SECONDS || typeof SLOT.ownerId !== "string") {
        return false;
      }
    }
    for (const EFFECT of runtime.effects) {
      if (!FORMATION_SKILL_DEFINITIONS.some(({ id }) => id === EFFECT.kind) || !Number.isSafeInteger(EFFECT.id) || EFFECT.id < 1 || EFFECT.id > runtime.serial || IDS.has(EFFECT.id) || !Number.isFinite(EFFECT.age) || EFFECT.age < 0 || !Number.isFinite(EFFECT.duration) || EFFECT.duration <= 0 || ![EFFECT.x, EFFECT.y, EFFECT.z].every(Number.isFinite)) {
        return false;
      }
      IDS.add(EFFECT.id);
    }
    return runtime.active || runtime.slots.length === 0 && runtime.effects.length === 0;
  }
  function createFormationRuntime() {
    return { active: false, serial: 0, slots: [], effects: [] };
  }
  var FORMATION_SKILL_DEFINITIONS, FORMATION_MAX_LEVEL, FORMATION_COOLDOWN_SECONDS;
  var init_formation_skill_state = __esm({
    "src/formation-skill-state.js"() {
      init_definition();
      init_definition2();
      init_definition3();
      init_definition4();
      init_definition5();
      init_definition6();
      init_definition7();
      init_definition8();
      init_definition9();
      FORMATION_SKILL_DEFINITIONS = Object.freeze([
        DEFINITION,
        DEFINITION2,
        DEFINITION3,
        DEFINITION4,
        DEFINITION5,
        DEFINITION6,
        DEFINITION7,
        DEFINITION8,
        DEFINITION9
      ]);
      FORMATION_MAX_LEVEL = 10;
      FORMATION_COOLDOWN_SECONDS = 5;
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
        Object.freeze({
          id: 0,
          name: "콩",
          asset: "pea.svg",
          bossWeight: 1
        }),
        Object.freeze({
          id: 1,
          name: "옥수수",
          asset: "corn-kernel.svg",
          bossWeight: 1
        }),
        Object.freeze({
          id: 2,
          name: "팥",
          asset: "kidney-bean.svg",
          bossWeight: 1
        }),
        Object.freeze({
          id: 3,
          name: "밤톨",
          asset: "chestnut.svg",
          bossWeight: 1
        }),
        Object.freeze({
          id: 4,
          name: "땅콩",
          asset: "peanut.svg",
          bossWeight: 1
        }),
        Object.freeze({
          id: 5,
          name: "호두",
          asset: "walnut.svg",
          bossWeight: 1
        }),
        Object.freeze({
          id: 6,
          name: "쌀",
          asset: "rice.svg",
          bossWeight: 1
        }),
        Object.freeze({
          id: 7,
          name: "밀",
          asset: "wheat.svg",
          bossWeight: 1
        }),
        Object.freeze({
          id: 8,
          name: "보리",
          asset: "barley.svg",
          bossWeight: 1
        })
      ]);
      SPECIES_COUNT = SPECIES_CATALOG.length;
      BOSS_SPECIES_WEIGHTS = Object.freeze(SPECIES_CATALOG.map((species) => species.bossWeight));
    }
  });

  // src/raid-deployment-cards.js
  function createRaidDeploymentCardsState({ firstSpecies = 0 } = {}) {
    if (firstSpecies !== null && !isSpeciesId(firstSpecies)) {
      throw new TypeError("firstSpecies must be an owned catalog species or null");
    }
    return {
      schemaVersion: RAID_DEPLOYMENT_CARD_SCHEMA_VERSION,
      unlockedSlots: 1,
      speciesBySlot: [firstSpecies, null, null, null]
    };
  }
  function isValidRaidDeploymentCardsState(state) {
    if (!state || typeof state !== "object" || state.schemaVersion !== RAID_DEPLOYMENT_CARD_SCHEMA_VERSION || !Number.isSafeInteger(state.unlockedSlots) || state.unlockedSlots < 1 || state.unlockedSlots > RAID_DEPLOYMENT_CARD_LIMIT || !Array.isArray(state.speciesBySlot) || state.speciesBySlot.length !== RAID_DEPLOYMENT_CARD_LIMIT || state.speciesBySlot.some(
      (speciesId, index) => index >= state.unlockedSlots ? speciesId !== null : speciesId !== null && !isSpeciesId(speciesId)
    )) {
      return false;
    }
    const SELECTED = state.speciesBySlot.filter((speciesId) => speciesId !== null);
    return new Set(SELECTED).size === SELECTED.length;
  }
  function raidDeploymentCardsInvestedPoints(state) {
    return isValidRaidDeploymentCardsState(state) ? state.unlockedSlots - 1 : 0;
  }
  function resetRaidDeploymentCardsState(state) {
    if (!isValidRaidDeploymentCardsState(state)) {
      return null;
    }
    return {
      schemaVersion: RAID_DEPLOYMENT_CARD_SCHEMA_VERSION,
      unlockedSlots: 1,
      speciesBySlot: [state.speciesBySlot[0], null, null, null]
    };
  }
  function raidDeploymentCardSpecies(state) {
    return isValidRaidDeploymentCardsState(state) ? state.speciesBySlot.slice(0, state.unlockedSlots).filter((speciesId) => speciesId !== null) : [];
  }
  function isSpeciesId(value) {
    return Number.isSafeInteger(value) && SPECIES_CATALOG.some((species) => species.id === value);
  }
  var RAID_DEPLOYMENT_CARD_LIMIT, RAID_DEPLOYMENT_CARD_SLOT_COST, RAID_DEPLOYMENT_CARD_SCHEMA_VERSION, RaidDeploymentCards;
  var init_raid_deployment_cards = __esm({
    "src/raid-deployment-cards.js"() {
      init_species_catalog();
      RAID_DEPLOYMENT_CARD_LIMIT = 4;
      RAID_DEPLOYMENT_CARD_SLOT_COST = 1;
      RAID_DEPLOYMENT_CARD_SCHEMA_VERSION = 1;
      RaidDeploymentCards = class {
        constructor(world) {
          this.world = world;
        }
        editable() {
          return this.world.scene === "farm" && !this.world.running && this.world.farmBossEvent?.phase === "idle";
        }
        buySlot() {
          return this.world.mutationNotifications.run(() => {
            const PLAYER = this.world.playerProgression, STATE = PLAYER.raidDeploymentCards;
            if (!this.editable() || !isValidRaidDeploymentCardsState(STATE) || STATE.unlockedSlots >= RAID_DEPLOYMENT_CARD_LIMIT || PLAYER.availablePoints < RAID_DEPLOYMENT_CARD_SLOT_COST) {
              return false;
            }
            STATE.unlockedSlots++;
            PLAYER.availablePoints -= RAID_DEPLOYMENT_CARD_SLOT_COST;
            this.world.markProgressChanged();
            return true;
          });
        }
        select(slot, speciesId) {
          return this.world.mutationNotifications.run(() => {
            const STATE = this.world.playerProgression.raidDeploymentCards, OWNED = new Set(
              this.world.units.filter((unit) => unit.countsTowardPermanentRoster !== false).map((unit) => unit.species)
            );
            if (!this.editable() || !isValidRaidDeploymentCardsState(STATE) || !Number.isSafeInteger(slot) || slot < 0 || slot >= STATE.unlockedSlots || speciesId !== null && (!isSpeciesId(speciesId) || !OWNED.has(speciesId) || STATE.speciesBySlot.includes(speciesId))) {
              return false;
            }
            STATE.speciesBySlot[slot] = speciesId;
            this.world.markProgressChanged();
            return true;
          });
        }
        reset() {
          return this.world.mutationNotifications.run(() => {
            const PLAYER = this.world.playerProgression, STATE = PLAYER.raidDeploymentCards, REFUNDED = raidDeploymentCardsInvestedPoints(STATE), NEXT = resetRaidDeploymentCardsState(STATE);
            if (!this.editable() || !NEXT || REFUNDED === 0) {
              return false;
            }
            PLAYER.availablePoints += REFUNDED;
            PLAYER.raidDeploymentCards = NEXT;
            this.world.markProgressChanged();
            return true;
          });
        }
      };
    }
  });

  // src/unit-grades.js
  function mergeMaterialCostForTier(resultTier) {
    if (!Number.isInteger(resultTier) || resultTier < 2 || resultTier > MAX_UNIT_TIER) {
      return 0;
    }
    return UNIT_GRADES[resultTier - 1].materialCost;
  }
  function isValidUnitTier(tier) {
    return Number.isInteger(tier) && tier >= 1 && tier <= MAX_UNIT_TIER;
  }
  var UNIT_GRADES, MAX_UNIT_TIER, MAX_GRADE_MATERIAL_COUNT;
  var init_unit_grades = __esm({
    "src/unit-grades.js"() {
      UNIT_GRADES = Object.freeze([
        Object.freeze({
          tier: 1,
          name: "Common",
          materialCost: 0,
          outlineColor: "#d8d4bd"
        }),
        Object.freeze({
          tier: 2,
          name: "Uncommon",
          materialCost: 2,
          outlineColor: "#83ce76"
        }),
        Object.freeze({
          tier: 3,
          name: "Rare",
          materialCost: 2,
          outlineColor: "#78b9ff"
        }),
        Object.freeze({
          tier: 4,
          name: "Epic",
          materialCost: 3,
          outlineColor: "#bd8cff"
        }),
        Object.freeze({
          tier: 5,
          name: "Legendary",
          materialCost: 4,
          outlineColor: "#ffb354"
        }),
        Object.freeze({
          tier: 6,
          name: "Mythic",
          materialCost: 5,
          outlineColor: "#ff7086"
        })
      ]);
      MAX_UNIT_TIER = UNIT_GRADES.length;
      MAX_GRADE_MATERIAL_COUNT = Math.max(...UNIT_GRADES.map((grade) => grade.materialCost));
    }
  });

  // src/unit-stats.js
  function createBaseStats(tier, speciesProfile) {
    let maxHp = TIER_HP;
    let attackPower = TIER_ATTACK;
    for (let resultTier = 2; resultTier <= tier; resultTier++) {
      const TRANSITION_MULTIPLIER = UNIT_GRADES[resultTier - 1].materialCost / 2;
      maxHp *= TIER_HP_SCALE * TRANSITION_MULTIPLIER;
      attackPower *= TIER_ATTACK_SCALE * TRANSITION_MULTIPLIER;
    }
    return Object.freeze({
      maxHp,
      attackPower,
      ...COMMON_UNIT_STAT_DEFAULTS,
      ...speciesProfile
    });
  }
  function baseUnitStatsFor(tier, species) {
    tier = Math.max(1, Math.min(MAX_UNIT_TIER, Number.isInteger(tier) ? tier : 1));
    const PROFILE = COMMON_UNIT_STAT_PROFILES[species] || COMMON_UNIT_STAT_DEFAULTS;
    return BASE_STATS_BY_PROFILE.get(PROFILE)?.[tier - 1] || createBaseStats(tier, PROFILE);
  }
  function resolveUnitStats(unit, overrides) {
    const BASE = baseUnitStatsFor(unit?.tier, unit?.species), MULTIPLIER = Number.isFinite(unit?.permanentStatMultiplier) ? Math.max(0, unit.permanentStatMultiplier) : 1;
    return {
      ...BASE,
      maxHp: BASE.maxHp * MULTIPLIER,
      attackPower: BASE.attackPower * MULTIPLIER,
      ...unit?.isFormationClone ? { maxHp: 1 } : {},
      ...overrides
    };
  }
  function combatStats(unit, overrides) {
    return overrides === void 0 && !unit?.isFormationClone ? baseUnitStatsFor(unit?.tier, unit?.species) : resolveUnitStats(unit, overrides);
  }
  function resolveDamage(rawDamage, armor = 0, armorPenetration = 0, critical = false, critMultiplier = COMMON_UNIT_STAT_DEFAULTS.critMultiplier) {
    const RAW = Number.isFinite(rawDamage) ? Math.max(0, rawDamage) : 0;
    const PENETRATION = clamp(Number.isFinite(armorPenetration) ? armorPenetration : 0, 0, 1);
    const EFFECTIVE_ARMOR = Math.max(0, Number.isFinite(armor) ? armor : 0) * (1 - PENETRATION);
    const CRIT = critical ? Math.max(1, Number.isFinite(critMultiplier) ? critMultiplier : 1) : 1;
    const MITIGATED = RAW * CRIT * ARMOR_SCALE / (ARMOR_SCALE + EFFECTIVE_ARMOR);
    return {
      rawDamage: RAW,
      effectiveArmor: EFFECTIVE_ARMOR,
      critical,
      damage: MITIGATED
    };
  }
  function resolveCritical(stats, roll = 1) {
    const CHANCE = clamp(Number.isFinite(stats?.critChance) ? stats.critChance : 0, 0, 1);
    return CHANCE > 0 && roll < CHANCE;
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
  function applyDamage(target, rawDamage, {
    armor = 0,
    armorPenetration = 0,
    critical = false,
    critMultiplier = COMMON_UNIT_STAT_DEFAULTS.critMultiplier
  } = {}) {
    if (!target || !Number.isFinite(target.hp)) {
      return {
        actualLoss: 0,
        ...resolveDamage(rawDamage, armor, armorPenetration, critical, critMultiplier)
      };
    }
    const RESOLVED = resolveDamage(rawDamage, armor, armorPenetration, critical, critMultiplier);
    const ACTUAL_LOSS = Math.min(Math.max(0, target.hp), RESOLVED.damage);
    setHealth(target, Math.max(0, target.hp - ACTUAL_LOSS));
    return {
      ...RESOLVED,
      actualLoss: ACTUAL_LOSS
    };
  }
  function applyHealing(target, amount, receiverStats = combatStats(target)) {
    if (!target || !Number.isFinite(target.hp) || target.hp <= 0) {
      return 0;
    }
    const MAX_HP = target.isFormationClone ? 1 : Number.isFinite(receiverStats?.maxHp) ? receiverStats.maxHp : 0;
    const RECEIVED = Number.isFinite(receiverStats?.healingReceivedMultiplier) ? Math.max(0, receiverStats.healingReceivedMultiplier) : 1;
    const REQUESTED = Number.isFinite(amount) ? Math.max(0, amount) * RECEIVED : 0;
    const HEALED = Math.min(Math.max(0, MAX_HP - target.hp), REQUESTED);
    setHealth(target, target.hp + HEALED);
    return HEALED;
  }
  function applyDamageToTargets(source, targets, {
    rawDamage,
    area = false,
    sourceKind = "direct",
    sourceStatOverrides,
    armorForTarget = (target) => combatStats(target).armor,
    roll = () => 1
  } = {}) {
    const SOURCE_STATS = source ? combatStats(source, sourceStatOverrides) : null;
    const CRITICAL = !!SOURCE_STATS && SOURCE_STATS.critChance > 0 && resolveCritical(SOURCE_STATS, roll());
    const HITS = [];
    let totalActualLoss = 0;
    for (const TARGET of targets || []) {
      const RESULT = applyDamage(TARGET, rawDamage, {
        armor: armorForTarget(TARGET),
        armorPenetration: SOURCE_STATS?.armorPenetration || 0,
        critical: CRITICAL,
        critMultiplier: SOURCE_STATS?.critMultiplier ?? COMMON_UNIT_STAT_DEFAULTS.critMultiplier
      });
      HITS.push(RESULT);
      totalActualLoss += RESULT.actualLoss;
    }
    const BASE_RATE = sourceKind === "direct" ? SOURCE_STATS?.lifesteal || 0 : 0;
    const HEAL_RATE = area ? BASE_RATE / 3 : BASE_RATE;
    const HEALED = source && HEAL_RATE > 0 ? applyHealing(source, totalActualLoss * HEAL_RATE, SOURCE_STATS) : 0;
    return {
      hits: HITS,
      totalActualLoss,
      healed: HEALED,
      critical: CRITICAL
    };
  }
  function resolveStatusDuration(baseDuration, source, target, { sourceStatOverrides, targetStatOverrides } = {}) {
    const SOURCE_STATS = source ? combatStats(source, sourceStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const TARGET_STATS = target ? combatStats(target, targetStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const DURATION_SCALE = Number.isFinite(SOURCE_STATS.statusDuration) ? Math.max(0, SOURCE_STATS.statusDuration) : 1;
    const RESISTANCE = clamp(Number.isFinite(TARGET_STATS.statusResistance) ? TARGET_STATS.statusResistance : 0, 0, 1);
    return Math.max(0, Number.isFinite(baseDuration) ? baseDuration : 0) * DURATION_SCALE * (1 - RESISTANCE);
  }
  function resolveKnockback(basePower, source, target, { sourceStatOverrides, targetStatOverrides } = {}) {
    const SOURCE_STATS = source ? combatStats(source, sourceStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const TARGET_STATS = target ? combatStats(target, targetStatOverrides) : COMMON_UNIT_STAT_DEFAULTS;
    const POWER = Number.isFinite(SOURCE_STATS.knockbackPower) ? Math.max(0, SOURCE_STATS.knockbackPower) : 1;
    const RESISTANCE = clamp(
      Number.isFinite(TARGET_STATS.knockbackResistance) ? TARGET_STATS.knockbackResistance : 0,
      0,
      1
    );
    return Math.max(0, Number.isFinite(basePower) ? basePower : 0) * POWER * (1 - RESISTANCE);
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function setHealth(target, value) {
    if (typeof target.setHealth === "function") {
      target.setHealth(value);
    } else {
      target.hp = value;
    }
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
      COMMON_UNIT_STAT_PROFILES = Object.freeze(
        Array.from(
          {
            length: SPECIES_COUNT
          },
          () => Object.freeze({
            ...COMMON_UNIT_STAT_DEFAULTS
          })
        )
      );
      BASE_STATS_BY_PROFILE = new Map(
        [COMMON_UNIT_STAT_DEFAULTS, ...COMMON_UNIT_STAT_PROFILES].map((profile) => [
          profile,
          Array.from(
            {
              length: MAX_UNIT_TIER
            },
            (_, index) => createBaseStats(index + 1, profile)
          )
        ])
      );
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
          for (const KEY2 of this.usedCells) {
            this.cells[KEY2].length = 0;
            this.touched[KEY2] = 0;
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
          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return -1;
          }
          const CX = this.cellX(x), CY = this.cellY(y);
          return CX < 0 || CY < 0 || CX >= CELL_COUNT || CY >= CELL_COUNT ? -1 : CY * CELL_COUNT + CX;
        }
        insert(item, x = item?.x, y = item?.y) {
          if (!item) {
            return false;
          }
          const PREVIOUS = this.itemCells.get(item);
          if (PREVIOUS !== void 0) {
            if (PREVIOUS >= 0) {
              this._removeFromCell(item, PREVIOUS);
            } else {
              this._removeOverflow(item);
            }
          }
          const KEY2 = this._cellKey(x, y);
          this.itemCells.set(item, KEY2);
          if (KEY2 < 0) {
            this.overflowItems.push(item);
            return false;
          }
          let bucket = this.cells[KEY2];
          if (!bucket) {
            bucket = this.cells[KEY2] = [];
          }
          if (!this.touched[KEY2]) {
            this.touched[KEY2] = 1;
            this.usedCells.push(KEY2);
          }
          bucket.push(item);
          return true;
        }
        update(item, x = item?.x, y = item?.y) {
          if (!item) {
            return false;
          }
          const PREVIOUS = this.itemCells.get(item);
          const NEXT = this._cellKey(x, y);
          if (PREVIOUS === NEXT) {
            return NEXT >= 0;
          }
          if (PREVIOUS !== void 0) {
            if (PREVIOUS >= 0) {
              this._removeFromCell(item, PREVIOUS);
            } else {
              this._removeOverflow(item);
            }
          }
          this.itemCells.set(item, NEXT);
          if (NEXT < 0) {
            this.overflowItems.push(item);
            return false;
          }
          let bucket = this.cells[NEXT];
          if (!bucket) {
            bucket = this.cells[NEXT] = [];
          }
          if (!this.touched[NEXT]) {
            this.touched[NEXT] = 1;
            this.usedCells.push(NEXT);
          }
          bucket.push(item);
          return true;
        }
        remove(item) {
          const KEY2 = this.itemCells.get(item);
          if (KEY2 === void 0) {
            return false;
          }
          if (KEY2 >= 0) {
            this._removeFromCell(item, KEY2);
          } else {
            this._removeOverflow(item);
          }
          this.itemCells.delete(item);
          return true;
        }
        _removeOverflow(item) {
          const INDEX = this.overflowItems.indexOf(item);
          if (INDEX < 0) {
            return;
          }
          const LAST = this.overflowItems.pop();
          if (INDEX < this.overflowItems.length) {
            this.overflowItems[INDEX] = LAST;
          }
        }
        _removeFromCell(item, key) {
          const BUCKET = this.cells[key];
          if (!BUCKET) {
            return;
          }
          const INDEX = BUCKET.indexOf(item);
          if (INDEX < 0) {
            return;
          }
          const LAST = BUCKET.pop();
          if (INDEX < BUCKET.length) {
            BUCKET[INDEX] = LAST;
          }
        }
        queryAABB(minX, minY, maxX, maxY, out) {
          out.length = 0;
          if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
            return out;
          }
          if (maxX >= WORLD_MIN && maxY >= WORLD_MIN && minX < WORLD_MAX && minY < WORLD_MAX) {
            const X0 = Math.max(0, this.cellX(minX)), Y0 = Math.max(0, this.cellY(minY));
            const X1 = Math.min(CELL_COUNT - 1, this.cellX(maxX)), Y1 = Math.min(CELL_COUNT - 1, this.cellY(maxY));
            for (let y = Y0; y <= Y1; y++) {
              const ROW = y * CELL_COUNT;
              for (let x = X0; x <= X1; x++) {
                const BUCKET = this.cells[ROW + x];
                if (BUCKET) {
                  for (let i = 0; i < BUCKET.length; i++) {
                    out.push(BUCKET[i]);
                  }
                }
              }
            }
          }
          for (const ITEM of this.overflowItems) {
            if (ITEM.x >= minX && ITEM.x <= maxX && ITEM.y >= minY && ITEM.y <= maxY) {
              out.push(ITEM);
            }
          }
          return out;
        }
        queryCellRing(centerX, centerY, radius, out) {
          out.length = 0;
          const X0 = centerX - radius, X1 = centerX + radius;
          const Y0 = centerY - radius, Y1 = centerY + radius;
          if (radius === 0) {
            this._appendCell(centerX, centerY, out);
            return out;
          }
          for (let x = X0; x <= X1; x++) {
            this._appendCell(x, Y0, out);
            this._appendCell(x, Y1, out);
          }
          for (let y = Y0 + 1; y < Y1; y++) {
            this._appendCell(X0, y, out);
            this._appendCell(X1, y, out);
          }
          return out;
        }
        _appendCell(x, y, out) {
          if (x < 0 || y < 0 || x >= CELL_COUNT || y >= CELL_COUNT) {
            return;
          }
          const BUCKET = this.cells[y * CELL_COUNT + x];
          if (BUCKET) {
            for (let i = 0; i < BUCKET.length; i++) {
              out.push(BUCKET[i]);
            }
          }
        }
        distanceToOutsideRing(x, y, centerX, centerY, radius) {
          const LEFT = Math.max(0, centerX - radius), RIGHT = Math.min(CELL_COUNT - 1, centerX + radius);
          const BOTTOM = Math.max(0, centerY - radius), TOP = Math.min(CELL_COUNT - 1, centerY + radius);
          let nearest = Infinity;
          if (LEFT > 0) {
            nearest = Math.min(nearest, x - (WORLD_MIN + LEFT * CELL_SIZE));
          }
          if (RIGHT < CELL_COUNT - 1) {
            nearest = Math.min(nearest, WORLD_MIN + (RIGHT + 1) * CELL_SIZE - x);
          }
          if (BOTTOM > 0) {
            nearest = Math.min(nearest, y - (WORLD_MIN + BOTTOM * CELL_SIZE));
          }
          if (TOP < CELL_COUNT - 1) {
            nearest = Math.min(nearest, WORLD_MIN + (TOP + 1) * CELL_SIZE - y);
          }
          return Math.max(0, nearest);
        }
      };
    }
  });

  // src/vector-sockets.cjs
  var require_vector_sockets = __commonJS({
    "src/vector-sockets.cjs"(exports, module) {
      "use strict";
      function readVectorSockets3({ metadata, viewBox, sourcePath }, label = sourcePath || metadata?.id || "unknown asset") {
        const FAIL4 = (message) => {
          throw new Error(`Vector socket contract (${label}): ${message}`);
        };
        if (!Array.isArray(viewBox) || viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0 || viewBox[3] <= 0) {
          FAIL4("a finite SVG viewBox is required");
        }
        const PARTS = new Map((metadata?.parts || []).map((part) => [part.id, part]));
        const ANCHORS = {};
        for (const NAME of ["mouth", "ground"]) {
          const SOCKET = metadata?.sockets?.[NAME];
          if (!SOCKET || !PARTS.has(SOCKET.part)) {
            FAIL4(`${NAME} must name an authored part`);
          }
          if (!Array.isArray(SOCKET.point) || SOCKET.point.length !== 2 || !SOCKET.point.every(Number.isFinite)) {
            FAIL4(`${NAME} must contain two finite canvas coordinates`);
          }
          const [X, Y] = SOCKET.point;
          if (X < viewBox[0] || X > viewBox[0] + viewBox[2] || Y < viewBox[1] || Y > viewBox[1] + viewBox[3]) {
            FAIL4(`${NAME} lies outside the SVG canvas`);
          }
          ANCHORS[NAME] = Object.freeze({
            part: SOCKET.part,
            x: X,
            y: Y
          });
        }
        if (ANCHORS.ground.part !== "body") {
          FAIL4("ground must belong to body");
        }
        if (ANCHORS.mouth.y >= ANCHORS.ground.y) {
          FAIL4("mouth must be above the authored ground baseline");
        }
        return Object.freeze(ANCHORS);
      }
      var BOSS_VECTOR_DIAMETER = 220;
      var BOSS_VECTOR_RADIUS_SCALE = 1.16;
      var WORLD_HEIGHT_PROJECTION4 = 0.785;
      var WORLD_DEPTH_PROJECTION3 = 0.62;
      function bossVectorScale3(radius) {
        return 2 * radius * BOSS_VECTOR_RADIUS_SCALE / BOSS_VECTOR_DIAMETER;
      }
      function socketWorldPoint2(boss, socket, ground) {
        const SCALE = bossVectorScale3(boss.radius);
        return {
          x: boss.x + (socket.x - ground.x) * SCALE,
          y: boss.y,
          z: (boss.z || 0) + (ground.y - socket.y) * SCALE / WORLD_HEIGHT_PROJECTION4
        };
      }
      module.exports = {
        readVectorSockets: readVectorSockets3,
        bossVectorScale: bossVectorScale3,
        socketWorldPoint: socketWorldPoint2,
        WORLD_HEIGHT_PROJECTION: WORLD_HEIGHT_PROJECTION4,
        WORLD_DEPTH_PROJECTION: WORLD_DEPTH_PROJECTION3
      };
    }
  });

  // src/features/unit-body/definition.cjs
  var require_definition = __commonJS({
    "src/features/unit-body/definition.cjs"(exports, module) {
      "use strict";
      var { WORLD_HEIGHT_PROJECTION: WORLD_HEIGHT_PROJECTION4 } = require_vector_sockets();
      var AUTHORED_BODIES = [
        {
          species: 0,
          asset: "assets/troops/pea.svg",
          shapeId: "body-outline",
          sourceSha256: "ff9dbc01524d084635102cd5935928f54ba8507364e393552bf4e131caedab40",
          viewBox: [0, 0, 320, 350],
          bounds: {
            left: 57.00453577435779,
            top: 103.16243270259355,
            right: 278.93153243769814,
            bottom: 312.75
          },
          ground: {
            x: 160,
            y: 350
          },
          mouth: {
            x: 176,
            y: 211.76175
          }
        },
        {
          species: 1,
          asset: "assets/troops/corn-kernel.svg",
          shapeId: "corn-body-outline",
          sourceSha256: "ff9a4a17a517e4626b76fa9ffea9b9736a46f8206608e404feba5376f79da98f",
          viewBox: [0, 0, 285, 295],
          bounds: {
            left: 23.038415422304524,
            top: 7.394271983516546,
            right: 258.5,
            bottom: 243.25
          },
          ground: {
            x: 142.5,
            y: 295
          },
          mouth: {
            x: 140,
            y: 113.6965
          }
        },
        {
          species: 2,
          asset: "assets/troops/kidney-bean.svg",
          shapeId: "bean-body-outline",
          sourceSha256: "2be6109c4f7bde4a956665dba42b81eeff5b548533e155bebdcccde37ac18684",
          viewBox: [0, 0, 260, 320],
          bounds: {
            left: 35.860000000000014,
            top: 12.298798725449615,
            right: 223.18548295320454,
            bottom: 279.2683248982993
          },
          ground: {
            x: 130,
            y: 320
          },
          mouth: {
            x: 119,
            y: 110.4355
          }
        },
        {
          species: 3,
          asset: "assets/troops/chestnut.svg",
          shapeId: "chestnut-shell",
          sourceSha256: "b427702d13ab21faf9d974c5acf54a308cb54f97918385290b7a18abc29e4f1a",
          viewBox: [0, 0, 320, 300],
          bounds: {
            left: 38.666666666666664,
            top: 19,
            right: 281.3333333333333,
            bottom: 233
          },
          ground: {
            x: 160,
            y: 261
          },
          mouth: {
            x: 160,
            y: 140
          }
        },
        {
          species: 4,
          asset: "assets/troops/peanut.svg",
          shapeId: "peanut-pod-outline",
          sourceSha256: "8ae8527f9bd3c642b6b062fdb8b02669dc9043c9e7010a1a5957024ea41f1c15",
          viewBox: [0, 0, 320, 300],
          bounds: {
            left: 101.3125,
            top: 63.5,
            right: 215.25,
            bottom: 252.4375
          },
          ground: {
            x: 160,
            y: 269
          },
          mouth: {
            x: 160,
            y: 139.42
          }
        },
        {
          species: 5,
          asset: "assets/troops/walnut.svg",
          shapeId: "walnut-body-outline",
          sourceSha256: "01dff507e05f1c18dc83632520d0e478ad106be8c1783e4f7a11965209e5f5df",
          viewBox: [0, 0, 320, 300],
          bounds: {
            left: 83.5,
            top: 71,
            right: 247.75,
            bottom: 252.75
          },
          ground: {
            x: 160,
            y: 273
          },
          mouth: {
            x: 160,
            y: 161
          }
        },
        {
          species: 6,
          asset: "assets/troops/rice.svg",
          shapeId: "rice-body-outline",
          sourceSha256: "7a15bbc24b562a1274e832f3c04d46201717292c391e636d5ac51b4318056a71",
          viewBox: [0, 0, 320, 350],
          bounds: {
            left: 70.60885389809643,
            top: 80.465,
            right: 244.56002549222026,
            bottom: 308.5244145408352
          },
          ground: {
            x: 160,
            y: 320
          },
          mouth: {
            x: 159,
            y: 181
          }
        },
        {
          species: 7,
          asset: "assets/troops/wheat.svg",
          shapeId: "wheat-grain-outline",
          sourceSha256: "758990ed670561d7e3a889d28f7304574617f198cd2eedce4a61a72aec8daa49",
          viewBox: [0, 0, 320, 350],
          bounds: {
            left: 85.19999999999996,
            top: 41.26666666666667,
            right: 221.6,
            bottom: 303.6
          },
          ground: {
            x: 160,
            y: 320
          },
          mouth: {
            x: 153,
            y: 173
          }
        },
        {
          species: 8,
          asset: "assets/troops/barley.svg",
          shapeId: "barley-seed-outline",
          sourceSha256: "bbe22d2af91c1236d7e6cb05a9ed9a442bfe0771663f646b07f97f717612d23e",
          viewBox: [0, 0, 320, 350],
          bounds: {
            left: 69.30899999999998,
            top: 101.629,
            right: 252.47099999999998,
            bottom: 297.4735
          },
          ground: {
            x: 160,
            y: 320
          },
          mouth: {
            x: 160,
            y: 171.85
          }
        }
      ];
      var UNIT_BODIES = Object.freeze(
        AUTHORED_BODIES.map(
          (body) => Object.freeze({
            ...body,
            viewBox: Object.freeze(body.viewBox),
            bounds: Object.freeze(body.bounds),
            ground: Object.freeze(body.ground),
            mouth: Object.freeze(body.mouth)
          })
        )
      );
      var UNIT_BODY_CONFIG = Object.freeze({
        baseSize: 0.55,
        sizePerTier: 0.1,
        birthScale: 0.5,
        vectorRadiusScale: 0.78
      });
      function unitBodyDefinition3(species) {
        const BODY2 = UNIT_BODIES[species];
        if (!BODY2) {
          throw new RangeError("Missing authored unit body for species " + species);
        }
        return BODY2;
      }
      function unitVisualSize2(unit) {
        const MATURE = unit.growthElapsed >= unit.growthDuration - 1e-9, GROWTH = MATURE || !(unit.growthDuration > 0) ? 1 : Math.max(0, Math.min(1, unit.growthElapsed / unit.growthDuration));
        return (UNIT_BODY_CONFIG.baseSize + UNIT_BODY_CONFIG.sizePerTier * unit.tier) * (UNIT_BODY_CONFIG.birthScale + (1 - UNIT_BODY_CONFIG.birthScale) * GROWTH);
      }
      function unitVectorScale2(unit) {
        const BODY2 = unitBodyDefinition3(unit.species);
        return unitVisualSize2(unit) * 2 * UNIT_BODY_CONFIG.vectorRadiusScale / Math.max(BODY2.viewBox[2], BODY2.viewBox[3]);
      }
      function bodyRadiusAtScale(body, scale) {
        return Math.max(body.ground.x - body.bounds.left, body.bounds.right - body.ground.x) * scale;
      }
      function unitBodyRadius3(unit) {
        return bodyRadiusAtScale(unitBodyDefinition3(unit.species), unitVectorScale2(unit));
      }
      function unitBodyHeight2(unit) {
        const BODY2 = unitBodyDefinition3(unit.species);
        return (BODY2.ground.y - BODY2.bounds.top) * unitVectorScale2(unit) / WORLD_HEIGHT_PROJECTION4;
      }
      function unitTorsoHeight2(unit) {
        const BODY2 = unitBodyDefinition3(unit.species);
        return (BODY2.bounds.bottom - BODY2.bounds.top) * unitVectorScale2(unit) / WORLD_HEIGHT_PROJECTION4;
      }
      function maximumUnitRadius2(tier) {
        return Math.max(
          ...UNIT_BODIES.map(
            (body) => unitBodyRadius3({
              species: body.species,
              tier,
              growthElapsed: 1,
              growthDuration: 1
            })
          )
        );
      }
      function unitDisplayScale3(body, vectorScale, pixelsPerWorldUnit, minimumRadiusPixels) {
        return Math.max(
          vectorScale * pixelsPerWorldUnit,
          2 * minimumRadiusPixels / Math.max(body.viewBox[2], body.viewBox[3])
        );
      }
      function validateUnitBodySource(species, source) {
        const BODY2 = unitBodyDefinition3(species);
        if (source.sha256 !== BODY2.sourceSha256 || source.file !== BODY2.asset) {
          throw new Error("Authored unit body must be remeasured after SVG changes: " + BODY2.asset);
        }
      }
      module.exports = {
        UNIT_BODIES,
        UNIT_BODY_CONFIG,
        unitBodyDefinition: unitBodyDefinition3,
        unitVisualSize: unitVisualSize2,
        unitVectorScale: unitVectorScale2,
        unitBodyRadius: unitBodyRadius3,
        unitBodyHeight: unitBodyHeight2,
        unitTorsoHeight: unitTorsoHeight2,
        maximumUnitRadius: maximumUnitRadius2,
        unitDisplayScale: unitDisplayScale3,
        validateUnitBodySource
      };
    }
  });

  // src/features/formation-skills/model-base.js
  function targetBodyDimensions(target) {
    const BODY_HEIGHT = Number.isFinite(target?.height) ? Math.max(0, target.height) : T1_DIAMETER * 1.7, BODY_RADIUS = Number.isFinite(target?.radius) ? Math.max(0, target.radius) : T1_DIAMETER * 0.5, BASE_Z = Number.isFinite(target?.z) ? target.z : 0;
    return {
      z: BASE_Z,
      bodyHeight: BODY_HEIGHT,
      bodyRadius: BODY_RADIUS,
      topZ: BASE_Z + BODY_HEIGHT
    };
  }
  function targetTop(_owner, target) {
    const BODY2 = targetBodyDimensions(target), MARGIN = Math.max(T1_DIAMETER * 0.12, BODY2.bodyHeight * 0.06);
    return BODY2.topZ + MARGIN;
  }
  var import_definition10, T1_DIAMETER, FormationSkill, MeteorSkill, FlyingSkill;
  var init_model_base = __esm({
    "src/features/formation-skills/model-base.js"() {
      import_definition10 = __toESM(require_definition(), 1);
      T1_DIAMETER = (0, import_definition10.unitBodyRadius)({ species: 0, tier: 1, growthElapsed: 1, growthDuration: 1 }) * 2;
      FormationSkill = class {
        constructor(definition) {
          this.definition = definition;
        }
        power(level, base) {
          return base * (this.definition.upgradeFactor ?? 1.5) ** (level - 1);
        }
        cast(_owner, _slot) {
          return false;
        }
        update(_owner, effect, dt) {
          effect.age += dt;
          return effect.age <= effect.duration;
        }
      };
      MeteorSkill = class extends FormationSkill {
        launch(owner, slot, index = 0) {
          const TARGET = owner.enemy();
          if (!TARGET) {
            return false;
          }
          const ANGLE = owner.world.random() * Math.PI * 2, DISTANCE = Math.sqrt(owner.world.random()) * (TARGET.radius + T1_DIAMETER * 3);
          owner.addEffect(this.definition.id, {
            x: TARGET.x + Math.cos(ANGLE) * DISTANCE,
            y: TARGET.y + Math.sin(ANGLE) * DISTANCE,
            z: 12,
            delay: index * 0.25,
            duration: index * 0.25 + 1.25,
            radius: T1_DIAMETER * 3,
            damage: this.power(slot.level, this.definition.upgradeBase),
            impacted: false
          });
          return true;
        }
        cast(owner, slot) {
          return this.launch(owner, slot);
        }
        update(owner, effect, dt) {
          effect.age += dt;
          if (!effect.impacted && effect.age + 1e-9 >= effect.delay + 0.75) {
            effect.impacted = true;
            owner.areaDamage(effect.x, effect.y, effect.radius, effect.damage, this.knockback === true);
          }
          return effect.age < effect.duration;
        }
      };
      FlyingSkill = class extends FormationSkill {
        cast(owner, slot) {
          const TARGET = owner.enemy();
          if (!TARGET) {
            return false;
          }
          const ANGLE = owner.world.random() * Math.PI * 2, STATE = this.effectState(owner, TARGET, slot, ANGLE);
          owner.addEffect(this.definition.id, STATE);
          return true;
        }
        effectState(owner, target, slot, angle) {
          const BODY2 = targetBodyDimensions(target), TARGET_Z = targetTop(owner, target);
          return {
            x: target.x + Math.cos(angle) * 0.6,
            y: target.y + Math.sin(angle) * 0.6,
            z: TARGET_Z + 2,
            bodyHeight: BODY2.bodyHeight,
            bodyRadius: BODY2.bodyRadius,
            targetId: owner.targetId(target),
            duration: this.definition.upgradeBase + this.definition.upgradeStep * (slot.level - 1),
            pulse: 0,
            lastPulse: -10,
            targetX: target.x,
            targetY: target.y,
            targetZ: TARGET_Z
          };
        }
        onPulse(_owner, _effect, _target) {
        }
        strike(_owner, _effect, _target) {
        }
        update(owner, effect, dt) {
          effect.age += dt;
          const TARGET = owner.target(effect.targetId) || owner.enemy(effect);
          if (TARGET) {
            const BODY2 = targetBodyDimensions(TARGET);
            effect.targetId = owner.targetId(TARGET);
            const DX = TARGET.x - effect.x, DY = TARGET.y - effect.y, TARGET_Z = targetTop(owner, TARGET), RATE = 1 - Math.exp(-dt * 6);
            effect.x += DX * RATE;
            effect.y += DY * RATE;
            effect.z += (TARGET_Z + 2 - effect.z) * RATE;
            effect.targetX = TARGET.x;
            effect.targetY = TARGET.y;
            effect.targetZ = TARGET_Z;
            effect.bodyHeight = BODY2.bodyHeight;
            effect.bodyRadius = BODY2.bodyRadius;
          }
          owner.separateAir(effect, dt);
          const ACTIVE_AGE = effect.age - 0.5;
          const INTERVAL = this.definition.pulseInterval;
          if (ACTIVE_AGE >= 0 && effect.pulse < Math.floor((effect.duration + 1e-9) / INTERVAL)) {
            const DUE = Math.min(
              Math.floor((Math.min(ACTIVE_AGE, effect.duration) + 1e-9) / INTERVAL),
              Math.floor((effect.duration + 1e-9) / INTERVAL)
            );
            while (effect.pulse < DUE) {
              effect.pulse++;
              effect.lastPulse = effect.age;
              this.onPulse(owner, effect, TARGET);
              if (TARGET && Math.hypot(TARGET.x - effect.x, TARGET.y - effect.y) <= 18) {
                this.strike(owner, effect, TARGET);
              }
            }
          }
          return effect.age < effect.duration + 1;
        }
      };
    }
  });

  // src/features/formation-skills/giant/model.js
  var GiantSkill;
  var init_model = __esm({
    "src/features/formation-skills/giant/model.js"() {
      init_definition();
      init_model_base();
      init_formation_skill_state();
      GiantSkill = class extends FormationSkill {
        constructor() {
          super(DEFINITION);
        }
        cast(owner, slot) {
          const CANDIDATES = owner.allies().filter((unit) => unit.giantUntil <= owner.world.time);
          if (!CANDIDATES.length) {
            return false;
          }
          const TARGET_COUNT = Math.min(CANDIDATES.length, formationUpgradeValue(this.definition, slot.level));
          for (let i = 0; i < TARGET_COUNT; i++) {
            const J = i + Math.floor(owner.world.random() * (CANDIDATES.length - i)), UNIT3 = CANDIDATES[J];
            CANDIDATES[J] = CANDIDATES[i];
            CANDIDATES[i] = UNIT3;
            UNIT3.giantUntil = owner.world.time + this.definition.durationSeconds;
            owner.addEffect(DEFINITION.id, {
              x: UNIT3.x,
              y: UNIT3.y,
              radius: UNIT3.radius,
              unitId: UNIT3.id,
              duration: this.definition.durationSeconds
            });
          }
          return true;
        }
        update(owner, effect, dt) {
          effect.age += dt;
          const UNIT3 = owner.world._unitForId(effect.unitId);
          if (!UNIT3 || UNIT3.hp <= 0) {
            return false;
          }
          effect.x = UNIT3.x;
          effect.y = UNIT3.y;
          effect.radius = UNIT3.radius;
          if (effect.age >= effect.duration) {
            UNIT3.giantUntil = 0;
            UNIT3.giantEndedAt = owner.world.time;
            return false;
          }
          return true;
        }
      };
    }
  });

  // src/features/formation-skills/lightning/model.js
  var LightningSkill;
  var init_model2 = __esm({
    "src/features/formation-skills/lightning/model.js"() {
      init_definition2();
      init_model_base();
      LightningSkill = class extends FormationSkill {
        constructor() {
          super(DEFINITION2);
        }
        cast(owner, slot) {
          const TARGET = owner.enemy();
          if (!TARGET) {
            return false;
          }
          const BODY2 = targetBodyDimensions(TARGET);
          owner.addEffect(DEFINITION2.id, {
            x: TARGET.x,
            y: TARGET.y,
            z: BODY2.z,
            bodyHeight: BODY2.bodyHeight,
            bodyRadius: BODY2.bodyRadius,
            duration: 0.65
          });
          owner.damage(TARGET, this.power(slot.level, this.definition.upgradeBase));
          return true;
        }
      };
    }
  });

  // src/features/formation-skills/meteor/model.js
  var LargeMeteorSkill;
  var init_model3 = __esm({
    "src/features/formation-skills/meteor/model.js"() {
      init_definition3();
      init_model_base();
      LargeMeteorSkill = class extends MeteorSkill {
        constructor() {
          super(DEFINITION3);
          this.knockback = true;
        }
      };
    }
  });

  // src/features/formation-skills/meteor-shower/model.js
  var MeteorShowerSkill;
  var init_model4 = __esm({
    "src/features/formation-skills/meteor-shower/model.js"() {
      init_definition4();
      init_model_base();
      MeteorShowerSkill = class extends MeteorSkill {
        constructor() {
          super(DEFINITION4);
        }
        cast(owner, slot) {
          if (!owner.enemy()) {
            return false;
          }
          for (let i = 0; i < this.definition.upgradeBase + slot.level - 1; i++) {
            this.launch(owner, slot, i);
            const EFFECT = owner.effects[owner.effects.length - 1];
            EFFECT.radius = T1_DIAMETER;
            EFFECT.damage = 25;
          }
          return true;
        }
      };
    }
  });

  // src/features/formation-skills/copy/model.js
  var CopySkill;
  var init_model5 = __esm({
    "src/features/formation-skills/copy/model.js"() {
      init_definition5();
      init_model_base();
      CopySkill = class extends FormationSkill {
        constructor() {
          super(DEFINITION5);
        }
        cast(owner, slot) {
          const ORIGINALS = owner.allies().filter((unit) => !unit.isBattleOnlySummon), RADIUS = this.power(slot.level, T1_DIAMETER * this.definition.upgradeBase);
          let center = null;
          let targets = [];
          for (const UNIT3 of ORIGINALS) {
            const NEAR = owner.nearby(UNIT3.x, UNIT3.y, RADIUS).filter(
              (candidate) => candidate.faction === "player" && !candidate.isBattleOnlySummon && candidate.hp > 0 && Math.hypot(candidate.x - UNIT3.x, candidate.y - UNIT3.y) <= RADIUS
            );
            if (NEAR.length > targets.length) {
              center = UNIT3;
              targets = NEAR;
            }
          }
          if (!center || !targets.length || !owner.canClone(targets.length)) {
            return false;
          }
          owner.addEffect(DEFINITION5.id, { x: center.x, y: center.y, radius: RADIUS, duration: 0.7 });
          for (const UNIT3 of targets) {
            owner.world.createFormationClone(UNIT3);
          }
          return true;
        }
      };
    }
  });

  // src/features/formation-skills/healing-rain/model.js
  var HealingRainSkill;
  var init_model6 = __esm({
    "src/features/formation-skills/healing-rain/model.js"() {
      init_definition6();
      init_model_base();
      init_unit_stats();
      HealingRainSkill = class extends FormationSkill {
        constructor() {
          super(DEFINITION6);
          this.injuredScratch = [];
        }
        cast(owner, slot) {
          if (owner.injuredAllies().length === 0) {
            return false;
          }
          owner.addEffect(DEFINITION6.id, {
            x: 0,
            y: 0,
            duration: 3,
            total: this.power(slot.level, this.definition.upgradeBase)
          });
          return true;
        }
        update(owner, effect, dt) {
          const SPAN = Math.min(dt, Math.max(0, effect.duration - effect.age));
          effect.age += dt;
          let amount = effect.total * SPAN / effect.duration;
          const INJURED = owner.injuredAllies(this.injuredScratch);
          let injuredCount = INJURED.length;
          while (amount > 1e-9 && injuredCount) {
            const SHARE = amount / injuredCount;
            let spent = 0;
            for (let i = 0; i < injuredCount; i++) {
              const UNIT3 = INJURED[i];
              spent += applyHealing(UNIT3, SHARE, { ...resolveUnitStats(UNIT3), healingReceivedMultiplier: 1 });
            }
            amount -= spent;
            let remaining = 0;
            for (let i = 0; i < injuredCount; i++) {
              const UNIT3 = INJURED[i];
              if (UNIT3.hp < resolveUnitStats(UNIT3).maxHp - 1e-9) {
                INJURED[remaining++] = UNIT3;
              }
            }
            injuredCount = remaining;
            if (spent < 1e-9) {
              break;
            }
          }
          return effect.age < effect.duration;
        }
      };
    }
  });

  // src/features/formation-skills/hammer/model.js
  var HammerSkill;
  var init_model7 = __esm({
    "src/features/formation-skills/hammer/model.js"() {
      init_definition7();
      init_model_base();
      HammerSkill = class extends FormationSkill {
        constructor() {
          super(DEFINITION7);
        }
        cast(owner, slot) {
          const TARGET = owner.enemy();
          if (!TARGET) {
            return false;
          }
          const BODY2 = targetBodyDimensions(TARGET);
          owner.addEffect(DEFINITION7.id, {
            x: TARGET.x,
            y: TARGET.y,
            z: BODY2.z,
            bodyHeight: BODY2.bodyHeight,
            bodyRadius: BODY2.bodyRadius,
            duration: 0.7
          });
          owner.damage(TARGET, this.power(slot.level, this.definition.upgradeBase));
          TARGET.stun = Math.max(TARGET.stun || 0, 1);
          return true;
        }
      };
    }
  });

  // src/features/formation-skills/ufo/model.js
  var UfoSkill;
  var init_model8 = __esm({
    "src/features/formation-skills/ufo/model.js"() {
      init_definition8();
      init_model_base();
      UfoSkill = class extends FlyingSkill {
        constructor() {
          super(DEFINITION8);
        }
        onPulse(owner, effect) {
          const TARGET = owner.verticalTarget(effect.x, effect.y);
          if (TARGET) {
            owner.damage(TARGET, this.definition.pulseDamage);
          }
          effect.beamTargetZ = TARGET ? targetBodyDimensions(TARGET).topZ : 0;
        }
        update(owner, effect, dt) {
          const ALIVE = super.update(owner, effect, dt), TARGET = owner.verticalTarget(effect.x, effect.y);
          effect.beamTarget = !!TARGET;
          effect.beamTargetZ = TARGET ? targetBodyDimensions(TARGET).topZ : 0;
          return ALIVE;
        }
      };
    }
  });

  // src/features/formation-skills/storm-cloud/model.js
  var StormCloudSkill;
  var init_model9 = __esm({
    "src/features/formation-skills/storm-cloud/model.js"() {
      init_definition9();
      init_model_base();
      StormCloudSkill = class extends FlyingSkill {
        constructor() {
          super(DEFINITION9);
        }
        strike(owner, _effect, target) {
          owner.damage(target, this.definition.pulseDamage);
        }
      };
    }
  });

  // src/formation-skills.js
  var MODELS, FormationSkills;
  var init_formation_skills = __esm({
    "src/formation-skills.js"() {
      init_formation_skill_state();
      init_unit_stats();
      init_spatial_grid();
      init_model();
      init_model2();
      init_model3();
      init_model4();
      init_model5();
      init_model6();
      init_model7();
      init_model8();
      init_model9();
      MODELS = new Map(
        [
          new GiantSkill(),
          new LightningSkill(),
          new LargeMeteorSkill(),
          new MeteorShowerSkill(),
          new CopySkill(),
          new HealingRainSkill(),
          new HammerSkill(),
          new UfoSkill(),
          new StormCloudSkill()
        ].map((model) => [model.definition.id, model])
      );
      FormationSkills = class {
        constructor(world) {
          this.world = world;
          this.members = new Set(world.units);
          this.injured = /* @__PURE__ */ new Set();
          this.rebuildInjured();
          this.scratch = [];
          this.air = new FixedSpatialGrid();
          this.airScratch = [];
          this.subscriptions = [
            world.unitCollection.onAdded.on(({ unitId }) => {
              const UNIT3 = world._unitForId(unitId);
              if (UNIT3) {
                this.members.add(UNIT3);
                this.trackHealth(UNIT3);
              }
            }),
            world.unitCollection.onRemoved.on(({ unitId }) => {
              for (const UNIT3 of this.members) {
                if (UNIT3.id === unitId) {
                  this.members.delete(UNIT3);
                  this.injured.delete(UNIT3);
                }
              }
            }),
            world.unitCollection.onReset.on(() => {
              this.members = new Set(world.units);
              this.rebuildInjured();
            }),
            world.unitCollection.onReplaced.on(() => {
              this.members = new Set(world.units);
              this.rebuildInjured();
            }),
            world.unitCollection.onHealthChanged.on(({ unitId }) => {
              const UNIT3 = world._unitForId(unitId);
              if (UNIT3) {
                this.trackHealth(UNIT3);
              }
            }),
            world.onCombatResolved.on((event) => this.contribute(event))
          ];
        }
        trackHealth(unit) {
          const MAX_HP = unit.isFormationClone ? 1 : baseUnitStatsFor(unit.tier, unit.species).maxHp;
          if (unit.faction === "player" && unit.hp > 0 && unit.hp < MAX_HP) {
            this.injured.add(unit);
          } else {
            this.injured.delete(unit);
          }
        }
        rebuildInjured() {
          this.injured.clear();
          for (const UNIT3 of this.members) {
            this.trackHealth(UNIT3);
          }
        }
        injuredAllies(out = []) {
          out.length = 0;
          for (const UNIT3 of this.injured) {
            out.push(UNIT3);
          }
          return out;
        }
        includeBuild(ownerId, state) {
          if (!this.runtime.active || this.slots.some((slot) => slot.ownerId === ownerId)) {
            return;
          }
          for (const ID of state.equipped) {
            if (ID) {
              this.slots.push({ id: ID, ownerId, level: state.levels[ID], charge: 0, cooldown: 0 });
            }
          }
        }
        get runtime() {
          return this.world.formationRuntime;
        }
        get slots() {
          return this.runtime.slots;
        }
        get effects() {
          return this.runtime.effects;
        }
        get active() {
          return this.world.scene === "raid" ? this.world.running : this.world.farmBossEvent?.phase === "fighting";
        }
        editable() {
          return this.world.scene === "farm" && !this.world.running && this.world.farmBossEvent?.phase === "idle";
        }
        purchase(id) {
          return this.world.mutationNotifications.run(() => {
            const PLAYER = this.world.playerProgression, STATE = PLAYER.formationSkills;
            if (!this.editable() || !isValidFormationSkillState(STATE) || typeof id !== "string" || !Object.hasOwn(STATE.levels, id) || STATE.levels[id] >= FORMATION_MAX_LEVEL || PLAYER.availablePoints < 1) {
              return false;
            }
            STATE.levels[id]++;
            PLAYER.availablePoints--;
            this.world.markProgressChanged();
            return true;
          });
        }
        buySlot() {
          return this.world.mutationNotifications.run(() => {
            const PLAYER = this.world.playerProgression;
            if (!this.editable() || PLAYER.formationSkills.slots >= 3 || PLAYER.availablePoints < 1) {
              return false;
            }
            PLAYER.formationSkills.slots++;
            PLAYER.availablePoints--;
            this.world.markProgressChanged();
            return true;
          });
        }
        equip(slot, id) {
          return this.world.mutationNotifications.run(() => {
            const STATE = this.world.playerProgression.formationSkills;
            if (!this.editable() || !Number.isInteger(slot) || slot < 0 || slot >= STATE.slots || id !== null && (typeof id !== "string" || !Object.hasOwn(STATE.levels, id) || !STATE.levels[id] || STATE.equipped.includes(id))) {
              return false;
            }
            while (STATE.equipped.length <= slot) {
              STATE.equipped.push(null);
            }
            STATE.equipped[slot] = id;
            this.world.markProgressChanged();
            return true;
          });
        }
        synchronize() {
          if (this.active && !this.runtime.active) {
            const SERIAL = this.runtime.serial;
            this.world.formationRuntime = createFormationRuntime();
            this.runtime.serial = SERIAL;
            this.rebuildInjured();
            this.runtime.active = true;
            const BUILDS = this.world.scene === "raid" && this.world.raidRosters.length ? this.world.raidRosters.map((roster) => ({
              ownerId: roster.ownerId,
              state: roster.abilitySnapshot.formationSkills || createFormationSkillState()
            })) : [{ ownerId: "", state: this.world.playerProgression.formationSkills }];
            for (const BUILD of BUILDS) {
              for (const ID of BUILD.state.equipped) {
                if (ID) {
                  this.slots.push({
                    id: ID,
                    ownerId: BUILD.ownerId,
                    level: BUILD.state.levels[ID],
                    charge: 0,
                    cooldown: 0
                  });
                }
              }
            }
          } else if (!this.active && this.runtime.active) {
            this.end();
          }
        }
        end() {
          for (const UNIT3 of this.members) {
            UNIT3.giantUntil = 0;
            UNIT3.giantEndedAt = -10;
          }
          this.world.unitCollection.removeWhere((unit) => unit.isFormationClone, { markProgress: false });
          const SERIAL = this.runtime.serial;
          this.world.formationRuntime = createFormationRuntime();
          this.runtime.serial = SERIAL;
          this.air.clear();
        }
        contribute(event) {
          this.synchronize();
          if (!this.runtime.active || event.excluded) {
            return;
          }
          for (const SLOT of this.slots) {
            const DEFINITION13 = MODELS.get(SLOT.id).definition;
            SLOT.charge = Math.min(DEFINITION13.required, SLOT.charge + Math.max(0, event[DEFINITION13.condition] || 0));
          }
        }
        update(dt) {
          this.synchronize();
          if (!this.runtime.active) {
            return;
          }
          this.contribute({ time: dt });
          this.air.clear();
          for (const EFFECT of this.effects) {
            if (EFFECT.kind === "ufo" || EFFECT.kind === "storm-cloud") {
              this.air.insert(EFFECT);
            }
          }
          let write = 0;
          const COUNT = this.effects.length;
          for (let i = 0; i < COUNT; i++) {
            const EFFECT = this.effects[i];
            if (MODELS.get(EFFECT.kind).update(this, EFFECT, dt)) {
              this.effects[write++] = EFFECT;
            }
          }
          this.effects.length = write;
          for (const SLOT of this.slots) {
            SLOT.cooldown = Math.max(0, SLOT.cooldown - dt);
            const MODEL = MODELS.get(SLOT.id);
            if (SLOT.cooldown < 1e-9 && SLOT.charge >= MODEL.definition.required && MODEL.cast(this, SLOT)) {
              SLOT.charge = 0;
              SLOT.cooldown = FORMATION_COOLDOWN_SECONDS;
              this.world.combat("formation-cast", { skillId: SLOT.id, x: 0, y: 0, z: 0 });
            }
          }
        }
        addEffect(kind, data) {
          const EFFECT = { id: ++this.runtime.serial, kind, age: 0, x: 0, y: 0, z: 0, ...data };
          this.effects.push(EFFECT);
          return EFFECT;
        }
        allies() {
          return [...this.members].filter((unit) => unit.faction === "player" && unit.hp > 0);
        }
        targetId(target) {
          return target === this.world.boss ? "boss" : target.id;
        }
        target(id) {
          const TARGET = id === "boss" ? this.world.boss : this.world._unitForId(id);
          return TARGET?.hp > 0 && TARGET.faction === "enemy" ? TARGET : null;
        }
        enemy(origin = null) {
          const BOSS2 = this.world.boss;
          if (BOSS2.active && BOSS2.hp > 0 && (!origin || Math.hypot(origin.x - BOSS2.x, origin.y - BOSS2.y) <= 18)) {
            return BOSS2;
          }
          for (const UNIT3 of this.members) {
            if (UNIT3.faction === "enemy" && UNIT3.hp > 0 && (!origin || Math.hypot(origin.x - UNIT3.x, origin.y - UNIT3.y) <= 18)) {
              return UNIT3;
            }
          }
          return null;
        }
        nearby(x, y, radius) {
          this.world._beginSpatialQueryBatch();
          try {
            return this.world.unitSpatial.queryAABB(x - radius, y - radius, x + radius, y + radius, this.scratch);
          } finally {
            this.world._endSpatialQueryBatch();
          }
        }
        damage(target, amount) {
          if (!target || target.hp <= 0) {
            return;
          }
          applyDamage(target, amount, { armor: this.world.combatTargetDefense(target).armor });
          target.flash = 0.15;
          if (target !== this.world.boss) {
            this.world._syncUnitAliveCount(target);
            if (target.hp <= 0) {
              this.world.handleUnitDeath(target);
            }
          }
        }
        verticalTarget(x, y) {
          const BOSS2 = this.world.boss;
          if (BOSS2.active && BOSS2.hp > 0 && BOSS2.z <= 0.5 && Math.hypot(BOSS2.x - x, BOSS2.y - y) <= BOSS2.radius + 0.12) {
            return BOSS2;
          }
          return this.nearby(x, y, 6).find(
            (unit) => unit.faction === "enemy" && unit.hp > 0 && unit.z <= 0.5 && Math.hypot(unit.x - x, unit.y - y) <= unit.radius + 0.12
          ) || null;
        }
        areaDamage(x, y, radius, amount, knock = false, vertical = false) {
          const TARGETS = [...this.nearby(x, y, radius + 6)];
          if (this.world.boss.active) {
            TARGETS.push(this.world.boss);
          }
          for (const TARGET of TARGETS) {
            if (TARGET.faction !== "enemy" || TARGET.hp <= 0 || Math.hypot(TARGET.x - x, TARGET.y - y) > radius + TARGET.radius || vertical && TARGET.z > 0.5) {
              continue;
            }
            this.damage(TARGET, amount);
            if (knock) {
              const DX = TARGET.x - x, DY = TARGET.y - y, N = Math.hypot(DX, DY) || 1;
              if (TARGET.knock) {
                TARGET.knock(DX / N, DY / N, 5, 2);
              } else {
                const POWER = resolveKnockback(5, null, TARGET);
                TARGET.knockVx += DX / N * POWER;
                TARGET.knockVy += DY / N * POWER;
              }
            }
          }
        }
        canClone(count) {
          return this.world.units.length + count <= this.world.battleCapacity;
        }
        separateAir(effect, dt) {
          for (const OTHER of this.air.queryAABB(
            effect.x - 1.4,
            effect.y - 1.4,
            effect.x + 1.4,
            effect.y + 1.4,
            this.airScratch
          )) {
            if (OTHER === effect) {
              continue;
            }
            const DX = effect.x - OTHER.x, DY = effect.y - OTHER.y, DISTANCE = Math.hypot(DX, DY), ANGLE = effect.id * 2.39996, FORCE = Math.max(0, 1.4 - DISTANCE) * Math.min(dt * 3, 0.25);
            effect.x += (DISTANCE ? DX / DISTANCE : Math.cos(ANGLE)) * FORCE;
            effect.y += (DISTANCE ? DY / DISTANCE : Math.sin(ANGLE)) * FORCE;
          }
          this.air.update(effect);
        }
        dispose() {
          for (const OFF of this.subscriptions) {
            OFF();
          }
          this.air.clear();
          this.members.clear();
          this.injured.clear();
        }
      };
    }
  });

  // src/signal.js
  var Signal;
  var init_signal = __esm({
    "src/signal.js"() {
      Signal = class {
        constructor(scope = null, immediate = false) {
          this.listeners = /* @__PURE__ */ new Set();
          this.scope = scope;
          this.immediate = immediate;
        }
        on(listener) {
          if (typeof listener !== "function") {
            throw new TypeError("A signal listener must be a function.");
          }
          this.listeners.add(listener);
          return () => this.off(listener);
        }
        off(listener) {
          return this.listeners.delete(listener);
        }
        emit(event) {
          if (this.scope) {
            this.scope.publish(this, event, this.immediate);
          } else {
            this.raise(this.deliver(event));
          }
        }
        deliver(event) {
          const ERRORS = [];
          for (const LISTENER of [...this.listeners]) {
            try {
              LISTENER(event);
            } catch (error) {
              ERRORS.push(error);
            }
          }
          return ERRORS;
        }
        raise(errors) {
          if (errors.length) {
            throw errors.length === 1 ? errors[0] : new AggregateError(errors, "Signal subscribers failed.");
          }
        }
        clear() {
          this.listeners.clear();
        }
      };
    }
  });

  // src/features/projectiles/seed/definition.js
  function seedEllipseRadii(projectile) {
    const Y = projectile.height * import_vector_sockets.WORLD_HEIGHT_PROJECTION * 0.5 / VERTICAL_EXTENT;
    return { x: Y * FEATURE.widthToHeight, y: Y };
  }
  function seedProjectileDimensions(unit) {
    const HEIGHT = unit.bodyHeight * FEATURE.bodyHeightFraction, RADII = seedEllipseRadii({ height: HEIGHT });
    return { radius: RADII.y * HORIZONTAL_EXTENT, height: HEIGHT };
  }
  var import_vector_sockets, FEATURE, VERTICAL_EXTENT, HORIZONTAL_EXTENT;
  var init_definition10 = __esm({
    "src/features/projectiles/seed/definition.js"() {
      import_vector_sockets = __toESM(require_vector_sockets(), 1);
      FEATURE = Object.freeze({
        id: "seed",
        landingEffect: "shell-land",
        bodyHeightFraction: 0.2,
        widthToHeight: 0.7,
        rotation: 0.3
      });
      VERTICAL_EXTENT = Math.hypot(FEATURE.widthToHeight * Math.sin(FEATURE.rotation), Math.cos(FEATURE.rotation));
      HORIZONTAL_EXTENT = Math.hypot(FEATURE.widthToHeight * Math.cos(FEATURE.rotation), Math.sin(FEATURE.rotation));
    }
  });

  // src/mutation-notifications.js
  var MutationNotifications;
  var init_mutation_notifications = __esm({
    "src/mutation-notifications.js"() {
      MutationNotifications = class {
        constructor() {
          this.depth = 0;
          this.flushing = false;
          this.pending = [];
          this.errors = [];
        }
        begin() {
          this.depth++;
        }
        end(failure = null) {
          this.depth--;
          if (failure && (this.depth > 0 || this.flushing)) {
            throw failure;
          }
          if (failure) {
            this.errors.push(failure);
          }
          if (this.depth === 0 && !this.flushing) {
            this.flush();
          }
        }
        run(action, owner = null, a, b, c, d, e) {
          this.begin();
          let result;
          let failure = null;
          try {
            result = action.call(owner, a, b, c, d, e);
          } catch (error) {
            failure = error;
          }
          this.end(failure);
          return result;
        }
        publish(signal, event, immediate) {
          if (!immediate) {
            this.pending.push({ signal, event });
            if (this.depth === 0 && !this.flushing) {
              this.flush();
            }
            return;
          }
          const ERRORS = signal.deliver(event);
          if (this.depth > 0 || this.flushing) {
            this.errors.push(...ERRORS);
          } else {
            signal.raise(ERRORS);
          }
        }
        flush() {
          if (!this.pending.length && !this.errors.length) {
            return;
          }
          this.flushing = true;
          try {
            for (let index = 0; index < this.pending.length; index++) {
              const { signal: SIGNAL, event: EVENT } = this.pending[index];
              this.errors.push(...SIGNAL.deliver(EVENT));
            }
          } finally {
            this.pending.length = 0;
            this.flushing = false;
          }
          if (this.errors.length) {
            const ERRORS = this.errors;
            this.errors = [];
            throw ERRORS.length === 1 ? ERRORS[0] : new AggregateError(ERRORS, "Mutation observers failed.");
          }
        }
      };
    }
  });

  // src/unit-collection.js
  var UnitCollection;
  var init_unit_collection = __esm({
    "src/unit-collection.js"() {
      init_signal();
      UnitCollection = class {
        constructor(world, unitType, notifications) {
          this.world = world;
          this.unitType = unitType;
          this.items = [];
          this.byId = /* @__PURE__ */ new Map();
          this.unitIdsByPlot = /* @__PURE__ */ new Map();
          this.residentCountsBySpecies = /* @__PURE__ */ new Map();
          this.residentIdsBySpecies = /* @__PURE__ */ new Map();
          this.residentCountsByPlot = /* @__PURE__ */ new Map();
          this.residentCount = 0;
          this.subscriptions = /* @__PURE__ */ new Map();
          this.reservations = /* @__PURE__ */ new Map();
          this.retiredDuringStep = [];
          this.onAdded = new Signal(notifications);
          this.onRemoved = new Signal(notifications);
          this.onReplaced = new Signal(notifications);
          this.onPlacementChanged = new Signal(notifications);
          this.onReset = new Signal(notifications);
          this.onHealthChanged = new Signal(notifications, true);
        }
        has(unit) {
          return this.items.includes(unit);
        }
        unitById(id) {
          return this.byId.get(id) || null;
        }
        unitsInPlot(plotId, out = []) {
          out.length = 0;
          for (const ID of this.unitIdsByPlot.get(plotId) || []) {
            const UNIT3 = this.byId.get(ID);
            if (UNIT3) {
              out.push(UNIT3);
            }
          }
          return out;
        }
        residentsInPlot(plotId, out = []) {
          this.unitsInPlot(plotId, out);
          let write = 0;
          for (const UNIT3 of out) {
            if (UNIT3.faction === "player" && UNIT3.isBattleOnlySummon !== true && UNIT3.isFormationClone !== true && UNIT3.countsTowardPermanentRoster !== false) {
              out[write++] = UNIT3;
            }
          }
          out.length = write;
          return out;
        }
        _rebuildIndexes() {
          this.byId.clear();
          this.unitIdsByPlot.clear();
          this.residentCountsBySpecies.clear();
          this.residentIdsBySpecies.clear();
          this.residentCountsByPlot.clear();
          this.residentCount = 0;
          for (const UNIT3 of this.items) {
            this._indexUnit(UNIT3);
          }
          this.world._syncOwnedSpeciesCounts?.();
        }
        refreshIndexes() {
          this._rebuildIndexes();
        }
        _indexUnit(unit) {
          this.byId.set(unit.id, unit);
          if (typeof unit.plotId === "string" && unit.plotId) {
            let ids = this.unitIdsByPlot.get(unit.plotId);
            if (!ids) {
              ids = /* @__PURE__ */ new Set();
              this.unitIdsByPlot.set(unit.plotId, ids);
            }
            ids.add(unit.id);
          }
          if (this.isResident(unit)) {
            this.residentCount++;
            this.residentCountsBySpecies.set(unit.species, (this.residentCountsBySpecies.get(unit.species) || 0) + 1);
            this.residentCountsByPlot.set(unit.plotId, (this.residentCountsByPlot.get(unit.plotId) || 0) + 1);
            let ids = this.residentIdsBySpecies.get(unit.species);
            if (!ids) {
              ids = /* @__PURE__ */ new Set();
              this.residentIdsBySpecies.set(unit.species, ids);
            }
            ids.add(unit.id);
          }
        }
        _unindexUnit(unit) {
          this.byId.delete(unit.id);
          const IDS = this.unitIdsByPlot.get(unit.plotId);
          IDS?.delete(unit.id);
          if (IDS?.size === 0) {
            this.unitIdsByPlot.delete(unit.plotId);
          }
          if (this.isResident(unit)) {
            this.residentCount = Math.max(0, this.residentCount - 1);
            const COUNT = (this.residentCountsBySpecies.get(unit.species) || 0) - 1;
            if (COUNT > 0) {
              this.residentCountsBySpecies.set(unit.species, COUNT);
            } else {
              this.residentCountsBySpecies.delete(unit.species);
            }
            const PLOT_COUNT = (this.residentCountsByPlot.get(unit.plotId) || 0) - 1;
            if (PLOT_COUNT > 0) {
              this.residentCountsByPlot.set(unit.plotId, PLOT_COUNT);
            } else {
              this.residentCountsByPlot.delete(unit.plotId);
            }
            const IDS2 = this.residentIdsBySpecies.get(unit.species);
            IDS2?.delete(unit.id);
            if (IDS2?.size === 0) {
              this.residentIdsBySpecies.delete(unit.species);
            }
          }
          this.world._syncOwnedSpeciesCounts?.();
        }
        moveUnitsToPlots(assignments) {
          if (!Array.isArray(assignments) || !assignments.length) {
            return false;
          }
          const SEEN = /* @__PURE__ */ new Set();
          const MOVES = assignments.map(({ unitId, plotId }) => {
            const UNIT3 = this.byId.get(unitId);
            if (!UNIT3 || !this.isResident(UNIT3) || typeof plotId !== "string" || !plotId || SEEN.has(unitId) || this.reservationOwner(unitId)) {
              return null;
            }
            SEEN.add(unitId);
            return { unit: UNIT3, plotId };
          });
          if (MOVES.some((move) => !move)) {
            return false;
          }
          const CHANGED = MOVES.filter((move) => move.unit.plotId !== move.plotId);
          if (!CHANGED.length) {
            return true;
          }
          for (const MOVE of CHANGED) {
            MOVE.unit.plotId = MOVE.plotId;
          }
          this._rebuildIndexes();
          this.world._unitSpatialDirty = true;
          this.publishChange(
            this.onPlacementChanged,
            { unitIds: CHANGED.map((move) => move.unit.id), plotIds: CHANGED.map((move) => move.plotId) },
            true
          );
          return true;
        }
        reorderWithinPlot(plotId, orderedIds) {
          const CURRENT = this.unitIdsByPlot.get(plotId);
          if (!(CURRENT instanceof Set) || !Array.isArray(orderedIds) || orderedIds.length !== CURRENT.size || new Set(orderedIds).size !== orderedIds.length || orderedIds.some((id) => !CURRENT.has(id))) {
            return false;
          }
          const ORDERED = orderedIds.map((id) => this.byId.get(id));
          let index = 0;
          this.items = this.items.map((unit) => unit.plotId === plotId ? ORDERED[index++] : unit);
          this._rebuildIndexes();
          this.world._unitSpatialDirty = true;
          this.publishChange(this.onPlacementChanged, { plotId, unitIds: orderedIds }, true);
          return true;
        }
        isResident(unit) {
          return !!(unit && unit.faction === "player" && unit.isBattleOnlySummon !== true && unit.isFormationClone !== true && unit.countsTowardPermanentRoster !== false);
        }
        reservationOwner(unitOrId) {
          return this.reservations.get(typeof unitOrId === "object" ? unitOrId?.id : unitOrId) || null;
        }
        reserve(owner, units, { replaceOwners = [] } = {}) {
          if (typeof owner !== "string" || !owner || !Array.isArray(units) || units.length < 2 || !Array.isArray(replaceOwners)) {
            return false;
          }
          const IDS = /* @__PURE__ */ new Set(), ALLOWED_OWNERS = new Set(replaceOwners), REPLACED_OWNERS = /* @__PURE__ */ new Set();
          if (units.some((unit) => {
            if (!this.has(unit) || IDS.has(unit.id)) {
              return true;
            }
            const CURRENT_OWNER = this.reservationOwner(unit.id);
            if (CURRENT_OWNER && CURRENT_OWNER !== owner) {
              if (!ALLOWED_OWNERS.has(CURRENT_OWNER)) {
                return true;
              }
              REPLACED_OWNERS.add(CURRENT_OWNER);
            }
            IDS.add(unit.id);
            return false;
          })) {
            return false;
          }
          for (const REPLACED_OWNER of REPLACED_OWNERS) {
            this.releaseReservations(REPLACED_OWNER);
          }
          for (const ID of IDS) {
            this.reservations.set(ID, owner);
          }
          return true;
        }
        releaseReservations(owner) {
          let released = 0;
          for (const [ID, CURRENT_OWNER] of this.reservations) {
            if (CURRENT_OWNER === owner) {
              this.reservations.delete(ID);
              released++;
            }
          }
          return released;
        }
        releaseUnitReservation(unitOrId) {
          return this.reservations.delete(typeof unitOrId === "object" ? unitOrId?.id : unitOrId);
        }
        attach(unit) {
          Object.defineProperty(unit, "_world", {
            value: this.world,
            writable: true,
            configurable: true
          });
          for (const SIGNAL of [unit.onDied, unit.onRevived, unit.onHealthChanged]) {
            SIGNAL.scope = this.world.mutationNotifications;
            SIGNAL.immediate = true;
          }
          const OFF_DIED = unit.onDied.on(() => {
            if (this.has(unit)) {
              this.world.processUnitDeath(unit);
            }
          }), OFF_REVIVED = unit.onRevived.on(() => {
            if (this.has(unit)) {
              this.world.processUnitRevival(unit);
            }
          });
          const OFF_HEALTH = unit.onHealthChanged.on((event) => {
            if (this.has(unit)) {
              this.world._syncUnitAliveCount(unit);
              this.onHealthChanged.emit(event);
            }
          });
          this.subscriptions.set(unit, [OFF_DIED, OFF_REVIVED, OFF_HEALTH]);
        }
        retire(unit, options, preserveMergeTask = null) {
          this.world.releaseMate(unit);
          for (const TASK of [...this.world.mergeTasks]) {
            if (TASK !== preserveMergeTask && (TASK.materialIds?.includes(unit.id) || TASK.resultId === unit.id)) {
              this.world.cancelMergeTask(TASK);
            }
          }
          this.releaseUnitReservation(unit.id);
          for (const OFF of this.subscriptions.get(unit) || []) {
            OFF();
          }
          this.subscriptions.delete(unit);
          this.world._trackUnitRemoved(unit, options);
          unit.dispose();
          if (this.world._spatialStepActive) {
            this.retiredDuringStep.push(unit);
          } else {
            this.releaseReferences(unit);
            this.clearBorrowedReferences();
          }
        }
        releaseReferences(unit) {
          this.world.unitSpatial.remove(unit);
          this.world._unitStepOrder.delete(unit);
          this.world._unitAliveState.delete(unit);
        }
        clearBorrowedReferences() {
          for (const GROUP of this.world._mergeEligibleGroups) {
            GROUP.length = 0;
          }
          for (const KEY2 of [
            "_stepUnits",
            "_unitCandidates",
            "_contactQuery",
            "_bossGridUnits",
            "_bossGroundUnits",
            "_bossQueryCandidates",
            "_bossHitCandidates",
            "_mergeNearestScratch",
            "_mergeMaterialsScratch"
          ]) {
            if (this.world._spatialStepActive) {
              this.world[KEY2].length = 0;
            } else {
              this.world[KEY2] = [];
            }
          }
        }
        releaseStepReferences() {
          if (!this.retiredDuringStep.length) {
            return;
          }
          for (const UNIT3 of this.retiredDuringStep) {
            this.releaseReferences(UNIT3);
          }
          this.retiredDuringStep.length = 0;
          this.clearBorrowedReferences();
        }
        add(unit, { markProgress = true } = {}) {
          if (!(unit instanceof this.unitType) || this.items.some((owned) => owned === unit || owned.id === unit.id)) {
            return false;
          }
          this.world._beginSpatialQueryBatch();
          try {
            unit.spawnedAtSimulationTick = this.world.simulationTick;
            this.items.push(unit);
            this._indexUnit(unit);
            this.attach(unit);
            this.world._trackUnitAdded(unit);
          } finally {
            this.world._endSpatialQueryBatch();
          }
          this.world._markMergeAvailabilityChanged();
          this.publishChange(this.onAdded, { unitId: unit.id }, markProgress && !unit.isBattleOnlySummon);
          return true;
        }
        remove(unit, { markProgress = true, ...options } = {}) {
          if (!this.has(unit)) {
            return false;
          }
          const REMAINING = this.items.filter((owned) => owned !== unit);
          this.world._beginSpatialQueryBatch();
          try {
            this.retire(unit, options);
            this._unindexUnit(unit);
            this.items = REMAINING;
          } finally {
            this.world._endSpatialQueryBatch();
          }
          this.world._markMergeAvailabilityChanged();
          this.publishChange(this.onRemoved, { unitId: unit.id }, markProgress && !unit.isBattleOnlySummon);
          return true;
        }
        replace(materials, result, complete, preserveMergeTask = null) {
          const CONSUMED = new Set(materials);
          if (CONSUMED.size < 2 || CONSUMED.size !== materials.length || !materials.every((unit) => this.has(unit)) || !(result instanceof this.unitType) || this.items.some((unit) => unit === result || unit.id === result.id)) {
            return false;
          }
          const REMAINING = this.items.filter((unit) => !CONSUMED.has(unit));
          REMAINING.push(result);
          this.world._beginSpatialQueryBatch();
          try {
            for (const UNIT3 of CONSUMED) {
              this.retire(UNIT3, void 0, preserveMergeTask);
            }
            this.items = REMAINING;
            this._rebuildIndexes();
            this.attach(result);
            this.world._trackUnitAdded(result);
            complete?.();
          } finally {
            this.world._endSpatialQueryBatch();
          }
          this.world._markMergeAvailabilityChanged();
          this.publishChange(
            this.onReplaced,
            { materialIds: materials.map((unit) => unit.id), resultId: result.id },
            true
          );
          return true;
        }
        publishChange(signal, event, markProgress) {
          return this.world.mutationNotifications.run(this._publishChange, this, signal, event, markProgress);
        }
        _publishChange(signal, event, markProgress) {
          const ERRORS = [];
          if (markProgress) {
            try {
              this.world.markProgressChanged();
            } catch (error) {
              ERRORS.push(error);
            }
          }
          try {
            signal.emit(event);
          } catch (error) {
            ERRORS.push(error);
          }
          if (ERRORS.length) {
            throw ERRORS.length === 1 ? ERRORS[0] : new AggregateError(ERRORS, "Unit collection observers failed.");
          }
        }
        reset(units = []) {
          const NEXT = [...units], IDS = /* @__PURE__ */ new Set();
          for (const UNIT3 of NEXT) {
            if (!(UNIT3 instanceof this.unitType) || IDS.has(UNIT3.id)) {
              throw new TypeError("A roster requires distinct owned Unit instances.");
            }
            IDS.add(UNIT3.id);
          }
          const RETAINED = new Set(NEXT);
          this.world._beginSpatialQueryBatch();
          try {
            for (const UNIT3 of this.items) {
              if (!RETAINED.has(UNIT3)) {
                this.retire(UNIT3);
              }
            }
            this.items = NEXT;
            this._rebuildIndexes();
            this.reservations.clear();
            for (const UNIT3 of NEXT) {
              if (!this.subscriptions.has(UNIT3)) {
                this.attach(UNIT3);
              }
            }
            this.world._rebuildUnitSpatialIndex();
          } finally {
            this.world._endSpatialQueryBatch();
          }
          this.world._markMergeAvailabilityChanged();
          this.onReset.emit({ unitIds: NEXT.map((unit) => unit.id) });
        }
        removeWhere(predicate, options) {
          let index = 0;
          while (index < this.items.length) {
            const UNIT3 = this.items[index];
            if (predicate(UNIT3)) {
              this.remove(UNIT3, options);
            } else {
              index++;
            }
          }
        }
        dispose() {
          try {
            this.reset();
          } finally {
            this.onAdded.clear();
            this.onRemoved.clear();
            this.onReplaced.clear();
            this.onPlacementChanged.clear();
            this.onReset.clear();
            this.onHealthChanged.clear();
          }
        }
      };
    }
  });

  // src/farm-upgrades.js
  function createFarmUpgradeState() {
    return Object.fromEntries(FARM_UPGRADE_IDS.map((id) => [id, 0]));
  }
  function isValidFarmUpgradeState(state) {
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      return false;
    }
    if (Object.keys(state).length !== FARM_UPGRADE_IDS.length) {
      return false;
    }
    return FARM_UPGRADE_IDS.every(
      (id) => Object.hasOwn(state, id) && Number.isSafeInteger(state[id]) && state[id] >= 0 && state[id] <= FARM_UPGRADE_MAX_LEVELS[id]
    );
  }
  function getFarmUpgradeLevel(state, id) {
    return Number.isSafeInteger(state?.[id]) ? state[id] : 0;
  }
  function getFarmUpgradeInvestedCount(state) {
    if (!isValidFarmUpgradeState(state)) {
      return 0;
    }
    return FARM_UPGRADE_IDS.reduce((total, id) => total + state[id], 0);
  }
  function farmUpgradeRate(state, id) {
    return 1 + 0.1 * getFarmUpgradeLevel(state, id);
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
  var FARM_UPGRADE_MAX_LEVELS, FARM_CAPACITY_STEPS, FARM_UPGRADE_NODES, FARM_UPGRADE_IDS;
  var init_farm_upgrades = __esm({
    "src/farm-upgrades.js"() {
      FARM_UPGRADE_MAX_LEVELS = Object.freeze({
        food: 4,
        growth: 4,
        breed: 4,
        merge: 4
      });
      FARM_CAPACITY_STEPS = Object.freeze([50, 75, 100, 150, 200]);
      FARM_UPGRADE_NODES = Object.freeze([
        {
          id: "food",
          name: "자동 탭",
          icon: "◒",
          description: "자동 먹이 생성 간격을 단계마다 10% 줄여요.",
          value: (level) => `${(0.5 / (1 + 0.1 * level)).toFixed(3)}초 / 탭`
        },
        {
          id: "growth",
          name: "먹이 찾기",
          icon: "❧",
          description: "먹이를 향해 움직일 때의 속도를 단계마다 10% 높여요.",
          value: (level) => `${(2.2 * (1 + 0.1 * level)).toFixed(2)} 속도`
        },
        {
          id: "breed",
          name: "번식 회복",
          icon: "♡",
          description: "부모의 번식 대기시간을 단계마다 10% 줄여요.",
          value: (level) => `${(10 / (1 + 0.1 * level)).toFixed(2)}초`
        },
        {
          id: "merge",
          name: "합체 회복",
          icon: "◇",
          description: "합체 후 대기시간을 단계마다 10% 줄여요.",
          value: (level) => `${(4 / (1 + 0.1 * level)).toFixed(2)}초`
        }
      ]);
      FARM_UPGRADE_IDS = Object.freeze(Object.keys(FARM_UPGRADE_MAX_LEVELS));
    }
  });

  // src/farm-plot.js
  function createFarmPlotsProgression() {
    return {
      plots: [{ id: INITIAL_FARM_PLOT_ID, capacityLevel: 0 }],
      currentPlotId: INITIAL_FARM_PLOT_ID,
      nextPlotNumber: 2,
      targetBasisPoints: Array.from({ length: SPECIES_COUNT }, (_, speciesId) => Number(speciesId === 0) * 1e4)
    };
  }
  function getFarmPlotInvestedCount(state) {
    if (!isValidFarmPlotsProgression(state)) {
      return 0;
    }
    return (state.plots.length - 1) * 2 + state.plots.reduce((total, plot) => total + plot.capacityLevel, 0);
  }
  function isValidFarmPlotsProgression(state) {
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      return false;
    }
    const KEYS = Object.keys(state).sort();
    if (KEYS.join(",") !== "currentPlotId,nextPlotNumber,plots,targetBasisPoints") {
      return false;
    }
    if (!Array.isArray(state.plots) || state.plots.length === 0 || !Number.isSafeInteger(state.nextPlotNumber) || state.nextPlotNumber !== state.plots.length + 1 || !Array.isArray(state.targetBasisPoints) || state.targetBasisPoints.length !== SPECIES_COUNT || !state.targetBasisPoints.every((value) => Number.isSafeInteger(value) && value >= 0 && value <= 1e4) || state.targetBasisPoints.reduce((total, value) => total + value, 0) !== 1e4) {
      return false;
    }
    const IDS = /* @__PURE__ */ new Set();
    for (let index = 0; index < state.plots.length; index++) {
      const PLOT = state.plots[index];
      if (!PLOT || typeof PLOT !== "object" || Array.isArray(PLOT) || Object.keys(PLOT).sort().join(",") !== "capacityLevel,id" || PLOT.id !== `plot-${index + 1}` || !Number.isSafeInteger(PLOT.capacityLevel) || PLOT.capacityLevel < 0 || PLOT.capacityLevel >= FARM_CAPACITY_STEPS.length || IDS.has(PLOT.id)) {
        return false;
      }
      IDS.add(PLOT.id);
    }
    return IDS.has(state.currentPlotId);
  }
  var INITIAL_FARM_PLOT_ID, RESERVE_PLOT_ID, MAX_FARM_FOOD, FarmPlot;
  var init_farm_plot = __esm({
    "src/farm-plot.js"() {
      init_farm_upgrades();
      init_species_catalog();
      INITIAL_FARM_PLOT_ID = "plot-1";
      RESERVE_PLOT_ID = "reserve";
      MAX_FARM_FOOD = 140;
      FarmPlot = class _FarmPlot {
        constructor(state, food = []) {
          const { id: ID, capacityLevel: CAPACITY_LEVEL } = state || {};
          if (typeof ID !== "string" || !/^plot-[1-9]\d*$/.test(ID)) {
            throw new TypeError("A farm plot requires a stable plot id.");
          }
          if (!Number.isSafeInteger(CAPACITY_LEVEL) || CAPACITY_LEVEL < 0 || CAPACITY_LEVEL >= FARM_CAPACITY_STEPS.length) {
            throw new RangeError("A farm plot capacity level is invalid.");
          }
          if (!Array.isArray(food) || food.length > MAX_FARM_FOOD) {
            throw new RangeError("A farm plot food list is invalid.");
          }
          this.id = ID;
          this.state = state;
          this.food = food;
        }
        get capacityLevel() {
          return this.state.capacityLevel;
        }
        get capacity() {
          return FARM_CAPACITY_STEPS[this.capacityLevel];
        }
        get foodCount() {
          return this.food.length;
        }
        canExpand() {
          return this.capacityLevel < FARM_CAPACITY_STEPS.length - 1;
        }
        expand() {
          if (!this.canExpand()) {
            return false;
          }
          this.state.capacityLevel++;
          return true;
        }
        static fromSave(data, food = []) {
          if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new TypeError("A farm plot save is invalid.");
          }
          const KEYS = Object.keys(data).sort().join(",");
          if (KEYS !== "capacityLevel,id") {
            throw new TypeError("A farm plot save has an unexpected shape.");
          }
          return new _FarmPlot(data, food);
        }
      };
    }
  });

  // src/farm-roster.js
  function isResident(unit) {
    return !!unit && unit.faction === "player" && unit.isBattleOnlySummon !== true && unit.isFormationClone !== true && unit.countsTowardPermanentRoster !== false;
  }
  function compareSpeciesId(a, b) {
    return typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
  }
  function largestRemainder(weights, total) {
    const ENTRIES = [...weights].map(([speciesId, weight]) => ({ speciesId, weight: BigInt(weight) }));
    if (!ENTRIES.length || !Number.isSafeInteger(total) || total < 0) {
      return /* @__PURE__ */ new Map();
    }
    const DENOMINATOR = ENTRIES.reduce((sum, entry) => sum + entry.weight, 0n);
    if (DENOMINATOR <= 0n) {
      return /* @__PURE__ */ new Map();
    }
    let assigned = 0;
    for (const ENTRY of ENTRIES) {
      const NUMERATOR = BigInt(total) * ENTRY.weight;
      ENTRY.value = Number(NUMERATOR / DENOMINATOR);
      ENTRY.remainder = NUMERATOR % DENOMINATOR;
      assigned += ENTRY.value;
    }
    ENTRIES.sort(
      (a, b) => a.remainder === b.remainder ? compareSpeciesId(a.speciesId, b.speciesId) : a.remainder > b.remainder ? -1 : 1
    );
    for (let i = 0; i < total - assigned; i++) {
      ENTRIES[i % ENTRIES.length].value++;
    }
    return new Map(ENTRIES.map((entry) => [entry.speciesId, entry.value]));
  }
  var BASIS_POINT_TOTAL, FarmingRoster;
  var init_farm_roster = __esm({
    "src/farm-roster.js"() {
      init_farm_plot();
      BASIS_POINT_TOTAL = 1e4;
      FarmingRoster = class {
        constructor(unitCollection) {
          if (!unitCollection || !Array.isArray(unitCollection.items)) {
            throw new TypeError("FarmingRoster requires a UnitCollection.");
          }
          this.collection = unitCollection;
        }
        residents() {
          return this.collection.items.filter(isResident);
        }
        residentsOfSpecies(speciesId) {
          return [...this.collection.residentIdsBySpecies.get(speciesId) || []].map((id) => this.collection.unitById(id)).filter(isResident);
        }
        residentById(id) {
          return this.collection.items.find((unit) => isResident(unit) && unit.id === id) || null;
        }
        ownedPopulation() {
          return this.collection.residentCount;
        }
        placedPopulation(plotId) {
          return this.collection.residentCountsByPlot.get(plotId) || 0;
        }
        residentIds(plotId = void 0) {
          const UNITS = plotId === void 0 ? this.collection.items : this.collection.unitsInPlot(plotId);
          return UNITS.filter(isResident).map((unit) => unit.id);
        }
        countsBySpecies({ includeReservations = [] } = {}) {
          const COUNTS = new Map(this.collection.residentCountsBySpecies);
          for (const RESERVATION of includeReservations) {
            if (Number.isSafeInteger(RESERVATION?.species)) {
              COUNTS.set(RESERVATION.species, (COUNTS.get(RESERVATION.species) || 0) + 1);
            }
          }
          return COUNTS;
        }
        canSpeciesAdvance(speciesId, targetBasisPoints, { includeReservations = [], excludeReservation = null } = {}) {
          if (!Number.isSafeInteger(targetBasisPoints) || targetBasisPoints <= 0 || targetBasisPoints > BASIS_POINT_TOTAL) {
            return false;
          }
          const RESERVATIONS = excludeReservation === null ? includeReservations : includeReservations.filter((reservation) => reservation !== excludeReservation);
          const COUNTS = this.countsBySpecies({ includeReservations: RESERVATIONS });
          let total = 0;
          for (const COUNT of COUNTS.values()) {
            total += COUNT;
          }
          const OWN = COUNTS.get(speciesId) || 0;
          return BigInt(targetBasisPoints) * BigInt(total) >= BigInt(OWN) * BigInt(BASIS_POINT_TOTAL);
        }
        static normalizeTargetBasisPoints(current, speciesIds, selectedSpeciesId, selectedValue) {
          const ORDERED = [...new Set(speciesIds)].sort(compareSpeciesId);
          if (!ORDERED.length || !ORDERED.includes(selectedSpeciesId) || !Number.isSafeInteger(selectedValue)) {
            return null;
          }
          if (ORDERED.length === 1) {
            return /* @__PURE__ */ new Map([[ORDERED[0], BASIS_POINT_TOTAL]]);
          }
          const FIXED = Math.max(0, Math.min(BASIS_POINT_TOTAL, selectedValue));
          const OTHER_IDS = ORDERED.filter((id) => id !== selectedSpeciesId);
          let weights = new Map(
            OTHER_IDS.map((id) => [id, Math.max(0, Number.isSafeInteger(current?.get?.(id)) ? current.get(id) : 0)])
          );
          if ([...weights.values()].every((weight) => weight === 0)) {
            weights = new Map(OTHER_IDS.map((id) => [id, 1]));
          }
          const RESULT = largestRemainder(weights, BASIS_POINT_TOTAL - FIXED);
          RESULT.set(selectedSpeciesId, FIXED);
          return new Map(ORDERED.map((id) => [id, RESULT.get(id) || 0]));
        }
        static allocateTargetCounts(targetBasisPoints, slotCount, speciesIds) {
          const IDS = [...new Set(speciesIds)].sort(compareSpeciesId);
          const WEIGHTS = IDS.map((id) => [
            id,
            Math.max(0, Number.isSafeInteger(targetBasisPoints?.get?.(id)) ? targetBasisPoints.get(id) : 0)
          ]);
          return largestRemainder(WEIGHTS, slotCount);
        }
      };
    }
  });

  // src/features/scenes/model-base.js
  var SimulationScene;
  var init_model_base2 = __esm({
    "src/features/scenes/model-base.js"() {
      SimulationScene = class {
        constructor(dependencies) {
          this.dependencies = dependencies;
        }
        advanceClock(_world, _dt) {
        }
        advanceRest(_world, _unit, _dt) {
          return false;
        }
        restoreUnit(_world, _unit) {
        }
        afterDownedIntegration(_world, _unit) {
        }
        afterLivingIntegration(_world, _unit) {
        }
        fallbackEnemy(_world, _unit) {
          return null;
        }
        updateUnoccupied(_world, _unit, _dt) {
        }
        checkpointProgress(_world, _dt, _advanced) {
        }
        resolveLifeContacts(_world, _units) {
        }
        updateBossPhase(_world, _dt) {
          return false;
        }
        advanceDownedUnit(world, unit, dt) {
          const ADVANCED2 = this.advanceRest(world, unit, dt);
          this.restoreUnit(world, unit);
          return ADVANCED2;
        }
        advanceDownedPhysics(world, unit, dt) {
          const OLD_Z = unit.z;
          unit.integrate(dt);
          this.afterDownedIntegration(world, unit);
          if (OLD_Z > 0 && unit.z === 0) {
            world.metrics.landings++;
            this.landUnit(world, unit);
          }
          world.updateUnitSpatial(unit);
        }
        separateBossUnits(world, units) {
          world.separateBossUnitsJacobi(units);
        }
        updateBattle(world, dt) {
          if (!world.boss.active) {
            return;
          }
          world.updateBoss(dt);
        }
      };
    }
  });

  // src/features/scenes/farm/definition.js
  var FEATURE2;
  var init_definition11 = __esm({
    "src/features/scenes/farm/definition.js"() {
      FEATURE2 = Object.freeze({ id: "farm" });
    }
  });

  // src/features/scenes/farm/model.js
  var FarmSimulationScene;
  var init_model10 = __esm({
    "src/features/scenes/farm/model.js"() {
      init_model_base2();
      init_definition11();
      FarmSimulationScene = class extends SimulationScene {
        constructor(dependencies) {
          const { CONFIG: CONFIG2 } = dependencies;
          super(dependencies);
          this.feature = FEATURE2;
          this.dropLandingEvent = "boss-add-land";
          this.battleCapacity = CONFIG2.farm.capacity.battleUnits;
        }
        progressionFor(world, _unit) {
          return world.playerProgression;
        }
        inBattle(world) {
          return world.farmBossEvent?.phase === "fighting";
        }
        canSenseBoss(world) {
          return this.inBattle(world);
        }
        summonId(world) {
          return world.nextId++;
        }
        capacity(world) {
          return world.capacity;
        }
        unitId(unit, _index) {
          return unit.farmId || unit.id;
        }
        enterUnit(_world, unit, _index) {
          unit.id = unit.farmId || unit.id;
          unit.ownerId = "";
          unit.farmId = 0;
          unit.dropLanded = true;
          Object.assign(unit, unit.home);
        }
        setupRoster(world) {
          world.raidExpectedPlayers = ["solo"];
          world.raidRosters = [];
          world.raidDeploymentStarted = false;
        }
        advanceRest(_world, unit, dt) {
          unit.down = Math.max(0, unit.down - dt);
          if (unit.down < 1e-9) {
            unit.down = 0;
          }
          return true;
        }
        restoreUnit(world, unit) {
          const { STATS: STATS2 } = this.dependencies;
          if (unit.down !== 0) {
            return;
          }
          const MAX_HP = STATS2(unit.tier, unit.species).maxHp;
          world.releaseMate(unit);
          unit.revive(MAX_HP);
        }
        landUnit(world, unit) {
          if (Math.hypot(unit.vx, unit.vy) > 1) {
            world.emit("land", unit.x, unit.y);
          }
        }
        checkpointProgress(world, dt, advanced) {
          if (!advanced) {
            return;
          }
          world._progressTimerCheckpoint += dt;
          if (world._progressTimerCheckpoint >= 5) {
            world._progressTimerCheckpoint = 0;
            world.markProgressChanged();
          }
        }
        resolveContacts(world, units, dt) {
          world.resolveFarmContacts(units, dt);
        }
        resolveLifeContacts(world, units) {
          const { FARM_MODES: FARM_MODES2 } = this.dependencies;
          FARM_MODES2.breed.resolveContacts(world, units);
        }
        updateBossPhase(world, dt) {
          const { BOSS_EVENT_PHASES } = this.dependencies;
          return BOSS_EVENT_PHASES[world.farmBossEvent.phase].update(world, dt);
        }
        updateBattle(world, dt) {
          if (world.farmBossEvent.phase === "idle") {
            super.updateBattle(world, dt);
            return;
          }
          world.updateBoss(dt);
        }
      };
    }
  });

  // src/features/scenes/raid/definition.js
  var FEATURE3;
  var init_definition12 = __esm({
    "src/features/scenes/raid/definition.js"() {
      FEATURE3 = Object.freeze({ id: "raid" });
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
    if (!runtime || !runtime.weights || !Array.isArray(eligibleIds) || typeof random !== "function") {
      throw new TypeError("Boss pattern selection requires runtime, eligible patterns, and a seeded random source");
    }
    const ELIGIBLE = [...new Set(eligibleIds)].filter((id) => BOSS_PATTERN_IDS.includes(id)).sort((a, b) => BOSS_PATTERN_IDS.indexOf(a) - BOSS_PATTERN_IDS.indexOf(b));
    if (!ELIGIBLE.length) {
      return null;
    }
    const TOTAL = ELIGIBLE.reduce((sum, id) => sum + Math.max(0, runtime.weights[id] || 0), 0);
    if (!(TOTAL > 0)) {
      return null;
    }
    let roll = random() * TOTAL;
    let chosen = ELIGIBLE.at(-1);
    for (const ID of ELIGIBLE) {
      roll -= Math.max(0, runtime.weights[ID] || 0);
      if (roll < 0) {
        chosen = ID;
        break;
      }
    }
    for (const ID of ELIGIBLE) {
      runtime.weights[ID] = ID === chosen ? BOSS_PATTERN_WEIGHT_DEFAULTS.base : Math.min(
        BOSS_PATTERN_WEIGHT_DEFAULTS.cap,
        Math.max(0, runtime.weights[ID] || 0) + BOSS_PATTERN_WEIGHT_DEFAULTS.eligibleBonus
      );
    }
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
        "attack.sweep-360": Object.freeze({
          kind: "sweep-360",
          windup: 1.05,
          active: 1.05,
          recover: 1.05,
          cooldown: 10,
          reach: 6.5,
          width: 0.85,
          damageMultiplier: 2.5,
          knockback: 13,
          lift: 10.2,
          groundOnly: true
        }),
        "attack.front-slam": Object.freeze({
          kind: "front-slam",
          windup: 0.75,
          active: 0,
          recover: 0.75,
          cooldown: 5,
          reach: 5.5,
          sector: Math.PI / 2,
          damageMultiplier: 2.5,
          knockback: 13,
          lift: 10.2,
          groundOnly: true
        }),
        "attack.charge": Object.freeze({
          kind: "charge",
          windup: 0.5,
          active: 6.6 / 5.3,
          recover: 0.75,
          cooldown: 5,
          reach: 6.6,
          speed: 5.3,
          damageMultiplier: 2,
          knockback: 13,
          lift: 10.2,
          groundOnly: false
        }),
        "attack.leap-slam": Object.freeze({
          kind: "leap-slam",
          windup: 0.5,
          active: 1.013,
          recover: 0.75,
          cooldown: 5,
          reach: 6.6,
          landingRadius: 5.5,
          damageMultiplier: 2,
          knockback: 10,
          lift: 7.2,
          groundOnly: false
        }),
        "attack.fan-sweep": Object.freeze({
          kind: "fan-sweep",
          windup: 1,
          active: 0.8,
          recover: 1,
          cooldown: 5,
          reach: 6.5,
          width: 0.85,
          sector: Math.PI * 2 / 3,
          damageMultiplier: 2,
          knockback: 13,
          lift: 10.2,
          groundOnly: true
        }),
        "summon.mouth-t1": Object.freeze({
          kind: "mouth-t1",
          windup: 0.5,
          active: 0.75,
          recover: 0.5,
          cooldown: 10,
          firstEligible: 10,
          volleyCount: 4,
          releaseInterval: 0.25,
          maxAlive: 10,
          dropHeight: 3,
          landingSeconds: 0.56,
          landingRadius: 4.8
        })
      });
      BOSS_PATTERN_WEIGHT_DEFAULTS = Object.freeze({
        base: 1,
        eligibleBonus: 0.5,
        cap: 3
      });
      BOSS_AIM_TURN_RATE = 5.5;
    }
  });

  // src/features/abilities/pea-recovery-boost.js
  var PEA_RECOVERY_BOOST_FEATURE;
  var init_pea_recovery_boost = __esm({
    "src/features/abilities/pea-recovery-boost.js"() {
      PEA_RECOVERY_BOOST_FEATURE = Object.freeze({
        definition: Object.freeze({
          id: "pea-recovery-boost",
          species: 0,
          availableByDefault: true,
          minimumTier: 1,
          name: "회복 기동",
          description: "적 공격으로 강제 이동이 끝나면 2초 동안 이동 속도가 증가합니다.",
          powerValues: Object.freeze([0.25, 0.35, 0.55])
        }),
        model: Object.freeze({
          durationTicks: 40,
          multiplierForBonus(bonus) {
            return 1 + bonus;
          }
        })
      });
    }
  });

  // src/features/abilities/kidney-continuous-leap.js
  var KIDNEY_CONTINUOUS_LEAP_FEATURE;
  var init_kidney_continuous_leap = __esm({
    "src/features/abilities/kidney-continuous-leap.js"() {
      KIDNEY_CONTINUOUS_LEAP_FEATURE = Object.freeze({
        definition: Object.freeze({
          id: "kidney-continuous-leap",
          species: 2,
          availableByDefault: true,
          minimumTier: 1,
          name: "연속 도약",
          description: "가까운 적에게도 준비되면 도약해요. 공중에서는 지면 휩쓸기를 피하고, 착지 시 확률적으로 재사용 대기를 초기화해요.",
          powerValues: Object.freeze([0.2, 0.35, 0.5, 0.65])
        }),
        model: Object.freeze({
          specialAttackProfile: Object.freeze({
            kind: "leap",
            timing: Object.freeze({ windup: 0.32, recovery: 0.9 }),
            range: 2.5,
            skillMultiplier: 1.3,
            projectileCount: 0,
            bounces: 0
          }),
          cooldownTicks: 60
        })
      });
    }
  });

  // src/features/abilities/chestnut-thorns/definition.js
  var CHESTNUT_THORNS_FEATURE;
  var init_definition13 = __esm({
    "src/features/abilities/chestnut-thorns/definition.js"() {
      CHESTNUT_THORNS_FEATURE = Object.freeze({
        definition: Object.freeze({
          id: "chestnut-target-thorns",
          species: 3,
          availableByDefault: true,
          minimumTier: 1,
          name: "대상 가시 연사",
          description: "현재 공격 대상을 향해 3초마다 가시를 발사해요. 가시는 0.1초 간격으로 나가며 각각 공격력 100% 피해를 줘요.",
          powerValues: Object.freeze([1, 2, 3]),
          cooldownTicks: 60,
          spacingTicks: 2,
          attackProfile: Object.freeze({
            kind: "chestnut-thorns",
            timing: Object.freeze({ windup: 0, recovery: 0.2 }),
            range: 1.45,
            skillMultiplier: 1,
            projectileCount: 0,
            bounces: 0
          })
        })
      });
    }
  });

  // src/features/abilities/peanut-death-split/definition.js
  var PEANUT_DEATH_SPLIT_FEATURE;
  var init_definition14 = __esm({
    "src/features/abilities/peanut-death-split/definition.js"() {
      PEANUT_DEATH_SPLIT_FEATURE = Object.freeze({
        definition: Object.freeze({
          id: "peanut-death-split",
          species: 4,
          availableByDefault: true,
          minimumTier: 1,
          name: "사망 분열",
          description: "전투 중 사망하면 T1 분열체 2마리를 남겨요. 강화마다 분열체의 체력과 공격력이 각각 1.5배가 돼요.",
          powerValues: Object.freeze([1, 1.5, 2.25]),
          childCount: 2
        })
      });
    }
  });

  // src/features/abilities/walnut-raw-guard/definition.js
  var WALNUT_RAW_GUARD_FEATURE;
  var init_definition15 = __esm({
    "src/features/abilities/walnut-raw-guard/definition.js"() {
      WALNUT_RAW_GUARD_FEATURE = Object.freeze({
        definition: Object.freeze({
          id: "walnut-raw-guard",
          species: 5,
          availableByDefault: true,
          minimumTier: 1,
          name: "방어와 반격",
          description: "5초마다 2초간 방어력 50을 얻어요. 방어 중 받은 RAW 피해를 모아 다음 망치에 100/150/225% 추가하며 공격력의 3배까지 적용해요.",
          powerValues: Object.freeze([1, 1.5, 2.25]),
          cooldownTicks: 100,
          durationTicks: 40,
          armorBonus: 50,
          maxBonusAttackMultiples: 3
        })
      });
    }
  });

  // src/features/abilities/corn-attachment/definition.js
  var CORN_ATTACHMENT_FEATURE;
  var init_definition16 = __esm({
    "src/features/abilities/corn-attachment/definition.js"() {
      CORN_ATTACHMENT_FEATURE = Object.freeze({
        definition: Object.freeze({
          id: "corn-kernel-chain",
          species: 1,
          availableByDefault: true,
          minimumTier: 1,
          name: "부착 알갱이 연쇄 폭발",
          description: "기본 공격 뒤 알갱이가 대상에 붙어요. 첫 부착 1초 후부터 부착 순서대로 0.1초 간격 폭발하며 알갱이마다 발사자 공격력의 50/75/100% 피해를 줘요.",
          powerValues: Object.freeze([0.5, 0.75, 1]),
          attachDelayTicks: 20,
          explosionSpacingTicks: 2,
          fadeTicks: 6
        })
      });
    }
  });

  // src/features/abilities/rice-low-health-harvest.js
  var RICE_LOW_HEALTH_HARVEST_FEATURE;
  var init_rice_low_health_harvest = __esm({
    "src/features/abilities/rice-low-health-harvest.js"() {
      RICE_LOW_HEALTH_HARVEST_FEATURE = Object.freeze({
        definition: Object.freeze({
          id: "rice-low-health-harvest",
          species: 6,
          availableByDefault: true,
          minimumTier: 1,
          name: "수확 낫",
          description: "적이 체력을 잃을수록 쌀의 치명타 확률이 높아져요. 치명타 피해 배율은 공통 2배예요.",
          rootTier: 1,
          powerValues: Object.freeze([0.35, 0.55, 0.75])
        })
      });
    }
  });

  // src/features/abilities/wheat-command-crit.js
  var WHEAT_COMMAND_CRIT_FEATURE;
  var init_wheat_command_crit = __esm({
    "src/features/abilities/wheat-command-crit.js"() {
      WHEAT_COMMAND_CRIT_FEATURE = Object.freeze({
        definition: Object.freeze({
          id: "wheat-command-crit",
          species: 7,
          availableByDefault: true,
          minimumTier: 1,
          name: "밀의 전투 지휘",
          description: "기본 공격을 발사할 때 35% 확률로 밀을 중심으로 범위 내 살아 있는 아군에게 3초 동안 공격 속도 효과를 줘요. 효과는 밀이나 오라 범위를 벗어나도 유지돼요.",
          powerValues: Object.freeze([0.5, 0.75, 1.125]),
          durationTicks: 60,
          triggerChance: 0.35,
          branches: Object.freeze({
            range: Object.freeze({
              name: "명령 반경",
              values: Object.freeze([2, 3, 4.5])
            })
          })
        })
      });
    }
  });

  // src/features/abilities/barley-armor-break.js
  var BARLEY_ARMOR_BREAK_FEATURE;
  var init_barley_armor_break = __esm({
    "src/features/abilities/barley-armor-break.js"() {
      BARLEY_ARMOR_BREAK_FEATURE = Object.freeze({
        definition: Object.freeze({
          id: "barley-armor-break",
          species: 8,
          availableByDefault: true,
          minimumTier: 1,
          name: "도리깨 갑주 파쇄",
          description: "도리깨 기본 공격이 적중하면 방어도를 고정 수치만큼 낮춰요. 각 적중의 감소가 따로 만료돼요.",
          rootTier: 1,
          powerValues: Object.freeze([1, 2, 3]),
          durationTicks: 60
        })
      });
    }
  });

  // src/ability-definitions.js
  var SPECIES_ABILITY_DEFINITIONS;
  var init_ability_definitions = __esm({
    "src/ability-definitions.js"() {
      init_pea_recovery_boost();
      init_kidney_continuous_leap();
      init_definition13();
      init_definition14();
      init_definition15();
      init_definition16();
      init_rice_low_health_harvest();
      init_wheat_command_crit();
      init_barley_armor_break();
      SPECIES_ABILITY_DEFINITIONS = Object.freeze([
        PEA_RECOVERY_BOOST_FEATURE.definition,
        KIDNEY_CONTINUOUS_LEAP_FEATURE.definition,
        CHESTNUT_THORNS_FEATURE.definition,
        PEANUT_DEATH_SPLIT_FEATURE.definition,
        WALNUT_RAW_GUARD_FEATURE.definition,
        CORN_ATTACHMENT_FEATURE.definition,
        RICE_LOW_HEALTH_HARVEST_FEATURE.definition,
        WHEAT_COMMAND_CRIT_FEATURE.definition,
        BARLEY_ARMOR_BREAK_FEATURE.definition
      ]);
    }
  });

  // src/ability-state.js
  function createAbilityProgressionState({ availablePoints = 0 } = {}) {
    if (!isNonNegativeInteger(availablePoints)) {
      throw new TypeError("availablePoints must be a non-negative integer");
    }
    return {
      schemaVersion: ABILITY_TREE_SCHEMA_VERSION,
      availablePoints,
      farmUpgrades: createFarmUpgradeState(),
      abilities: Object.fromEntries(
        SPECIES_ABILITY_DEFINITIONS.map((definition) => [
          definition.id,
          {
            powerLevel: 0,
            ...definition.branches ? {
              branchLevels: Object.fromEntries(
                Object.keys(definition.branches).map((branchId) => [branchId, 0])
              )
            } : {}
          }
        ])
      )
    };
  }
  function isValidAbilityProgressionState(state) {
    if (!state || typeof state !== "object" || state.schemaVersion !== ABILITY_TREE_SCHEMA_VERSION) {
      return false;
    }
    if (!isNonNegativeInteger(state.availablePoints) || !isValidFarmUpgradeState(state.farmUpgrades) || !state.abilities || typeof state.abilities !== "object") {
      return false;
    }
    if (Object.keys(state.abilities).length !== SPECIES_ABILITY_DEFINITIONS.length) {
      return false;
    }
    for (const DEFINITION13 of SPECIES_ABILITY_DEFINITIONS) {
      const INVESTMENT = state.abilities[DEFINITION13.id];
      if (!INVESTMENT || !isNonNegativeInteger(INVESTMENT.powerLevel)) {
        return false;
      }
      if (INVESTMENT.powerLevel > DEFINITION13.powerValues.length - 1) {
        return false;
      }
      const BRANCHES = DEFINITION13.branches || {}, BRANCH_LEVELS = INVESTMENT.branchLevels || {};
      if (Object.keys(BRANCHES).length === 0 && Object.hasOwn(INVESTMENT, "branchLevels") || Object.hasOwn(INVESTMENT, "branchLevels") && (Object.keys(BRANCH_LEVELS).length !== Object.keys(BRANCHES).length || Object.keys(BRANCH_LEVELS).some((branchId) => !Object.hasOwn(BRANCHES, branchId)))) {
        return false;
      }
      for (const [BRANCH_ID, BRANCH] of Object.entries(BRANCHES)) {
        const LEVEL = BRANCH_LEVELS[BRANCH_ID] ?? 0;
        if (!isNonNegativeInteger(LEVEL) || LEVEL > BRANCH.values.length - 1) {
          return false;
        }
      }
    }
    return Object.keys(state.abilities).every(
      (abilityId) => SPECIES_ABILITY_DEFINITIONS.some((definition) => definition.id === abilityId)
    );
  }
  function createAbilityRuntimeSnapshot(state) {
    if (!isValidPlayerLikeAbilityState(state)) {
      throw new TypeError("Cannot snapshot invalid ability progression state");
    }
    return {
      schemaVersion: ABILITY_TREE_SCHEMA_VERSION,
      level: state.level,
      farmPlotInvestedPoints: getFarmPlotInvestedCount(state.farmPlots),
      formationSkills: structuredClone(state.formationSkills || createFormationSkillState()),
      raidDeploymentCards: structuredClone(state.raidDeploymentCards || createRaidDeploymentCardsState()),
      availablePoints: state.availablePoints,
      farmUpgrades: {
        ...state.farmUpgrades
      },
      abilities: Object.fromEntries(
        SPECIES_ABILITY_DEFINITIONS.map((definition) => [
          definition.id,
          {
            ...state.abilities[definition.id],
            ...definition.branches ? {
              branchLevels: Object.fromEntries(
                Object.keys(definition.branches).map((branchId) => [
                  branchId,
                  state.abilities[definition.id].branchLevels?.[branchId] || 0
                ])
              )
            } : {}
          }
        ])
      )
    };
  }
  function isValidAbilityRuntimeSnapshot(snapshot2) {
    if (!snapshot2 || typeof snapshot2 !== "object" || snapshot2.schemaVersion !== ABILITY_TREE_SCHEMA_VERSION || !Number.isSafeInteger(snapshot2.level) || snapshot2.level < 1 || !isNonNegativeInteger(snapshot2.farmPlotInvestedPoints)) {
      return false;
    }
    const STATE = {
      schemaVersion: snapshot2.schemaVersion,
      formationSkills: snapshot2.formationSkills,
      raidDeploymentCards: snapshot2.raidDeploymentCards || createRaidDeploymentCardsState(),
      level: snapshot2.level,
      experience: 0,
      availablePoints: snapshot2.availablePoints,
      farmUpgrades: snapshot2.farmUpgrades,
      abilities: snapshot2.abilities,
      processedBossKillReceipts: []
    };
    if (!isValidAbilityProgressionState(STATE) || STATE.formationSkills !== void 0 && !isValidFormationSkillState(STATE.formationSkills) || !isValidRaidDeploymentCardsState(STATE.raidDeploymentCards)) {
      return false;
    }
    const INVESTED = Object.entries(STATE.abilities).reduce(
      (total, [abilityId, investment]) => total + investedAbilityPoints(
        investment,
        SPECIES_ABILITY_DEFINITIONS.find((item) => item.id === abilityId)
      ),
      0
    );
    return INVESTED + formationInvestedPoints(STATE.formationSkills) + raidDeploymentCardsInvestedPoints(STATE.raidDeploymentCards) + getFarmUpgradeInvestedCount(STATE.farmUpgrades) + snapshot2.farmPlotInvestedPoints + STATE.availablePoints === STATE.level - 1;
  }
  function isValidPlayerLikeAbilityState(state) {
    const ABILITY_STATE = {
      schemaVersion: state?.schemaVersion,
      availablePoints: state?.availablePoints,
      farmUpgrades: state?.farmUpgrades,
      abilities: state?.abilities
    };
    if (!isValidAbilityProgressionState(ABILITY_STATE) || !Number.isSafeInteger(state?.level) || state.level < 1 || !isValidRaidDeploymentCardsState(state?.raidDeploymentCards)) {
      return false;
    }
    const INVESTED_POINTS = Object.entries(state.abilities).reduce(
      (total, [abilityId, investment]) => total + investedAbilityPoints(
        investment,
        SPECIES_ABILITY_DEFINITIONS.find((item) => item.id === abilityId)
      ),
      0
    );
    return INVESTED_POINTS + formationInvestedPoints(state.formationSkills) + raidDeploymentCardsInvestedPoints(state.raidDeploymentCards) + getFarmUpgradeInvestedCount(state.farmUpgrades) + getFarmPlotInvestedCount(state.farmPlots) + state.availablePoints === state.level - 1;
  }
  function isNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }
  function investedAbilityPoints(investment) {
    return investment.powerLevel + Object.values(investment.branchLevels || {}).reduce((total, level) => total + level, 0);
  }
  var ABILITY_TREE_SCHEMA_VERSION;
  var init_ability_state = __esm({
    "src/ability-state.js"() {
      init_formation_skill_state();
      init_ability_definitions();
      init_farm_upgrades();
      init_farm_plot();
      init_raid_deployment_cards();
      ABILITY_TREE_SCHEMA_VERSION = 2;
    }
  });

  // src/factions.js
  function hasFaction(actor, faction) {
    return actor?.faction === faction;
  }
  function areOpposingFactions(a, b) {
    return !!a && !!b && typeof a.faction === "string" && typeof b.faction === "string" && a.faction !== b.faction;
  }
  var FACTION_CONFIG;
  var init_factions = __esm({
    "src/factions.js"() {
      FACTION_CONFIG = Object.freeze({
        PLAYER: "player",
        ENEMY: "enemy"
      });
    }
  });

  // src/features/scenes/raid/model.js
  var RaidSimulationScene;
  var init_model11 = __esm({
    "src/features/scenes/raid/model.js"() {
      init_model_base2();
      init_definition12();
      init_boss_patterns();
      init_ability_state();
      init_raid_deployment_cards();
      init_factions();
      RaidSimulationScene = class extends SimulationScene {
        constructor(dependencies) {
          const { CONFIG: CONFIG2 } = dependencies;
          super(dependencies);
          this.feature = FEATURE3;
          this.dropLandingEvent = "drop-land";
          this.battleCapacity = CONFIG2.raid.capacity.battleUnits;
        }
        progressionFor(world, unit) {
          return world.raidRoster(unit?.ownerId)?.abilitySnapshot || null;
        }
        inBattle(world) {
          return world.running;
        }
        canSenseBoss(world) {
          return world.running && world.raidDeploymentStarted;
        }
        summonId(world) {
          const { CONFIG: CONFIG2 } = this.dependencies;
          return CONFIG2.raid.ids.summonBase + ++world.raidSummonSerial;
        }
        capacity(_world) {
          const { CONFIG: CONFIG2 } = this.dependencies;
          return CONFIG2.raid.capacity.units;
        }
        unitId(_unit, index) {
          return 1e6 + index + 1;
        }
        enterUnit(_world, unit, index) {
          unit.home = {
            x: unit.x,
            y: unit.y
          };
          unit.farmId = unit.farmId || unit.id;
          unit.ownerId = "solo";
          unit.id = 1e6 + index + 1;
          unit.dropLanded = true;
          const ANGLE = index * 2.3999632297, RAD = 10.5 + index % 3 * 0.9;
          Object.assign(unit, {
            x: Math.cos(ANGLE) * RAD,
            y: Math.sin(ANGLE) * RAD * 0.84
          });
        }
        setupRoster(world) {
          world.boss.active = true;
          world.boss.encounterId = world.activeRaidRunSequence || world.nextRaidRunSequence || 1;
          world.boss.patternRuntime = createBossPatternRuntime();
          world.raidExpectedPlayers = ["solo"];
          world.raidRosters = [
            {
              ownerId: "solo",
              deploymentCardSpecies: raidDeploymentCardSpecies(world.playerProgression.raidDeploymentCards),
              troops: world.units.filter((u) => !u.isBattleOnlySummon).map((u) => ({
                farmId: u.farmId,
                species: u.species,
                tier: u.tier,
                deployed: true
              })),
              abilitySnapshot: createAbilityRuntimeSnapshot(world.playerProgression),
              buffUntil: 0,
              buffReadyAt: 0
            }
          ];
          world.raidDeploymentStarted = true;
        }
        advanceClock(world, dt) {
          if (world.running) {
            world.encounter.elapsed += dt;
          }
        }
        afterDownedIntegration(world, unit) {
          if (world.running && unit.z === 0 && unit.vz === 0) {
            unit.vx = unit.vy = 0;
          }
        }
        afterLivingIntegration(_world, unit) {
          if (unit.hp <= 0 && unit.z === 0 && unit.vz === 0) {
            unit.vx = unit.vy = 0;
          }
        }
        fallbackEnemy(world, unit) {
          return world.running && hasFaction(unit, FACTION_CONFIG.PLAYER) && world.boss.hp > 0 ? world.boss : null;
        }
        updateUnoccupied(world, unit, dt) {
          if (world.running) {
            world.raidUnit(unit, dt, null);
          }
        }
        landUnit(world, unit) {
          world.combat("unit-land", {
            unit: unit.id,
            x: unit.x,
            y: unit.y,
            z: 0,
            strength: Math.min(1, Math.hypot(unit.vx, unit.vy) / 8)
          });
        }
        resolveContacts(world, units, dt) {
          world.raidContacts(units, dt);
        }
      };
    }
  });

  // src/simulation-scenes.js
  function createSimulationScenes(dependencies) {
    const {
      config: CONFIG2,
      stats: STATS2,
      createUnitAttackCycle: CREATE_UNIT_ATTACK_CYCLE2,
      farmModes: FARM_MODES2,
      bossEventPhases: BOSS_EVENT_PHASES
    } = dependencies;
    const DEPENDENCIES = Object.freeze({ CONFIG: CONFIG2, STATS: STATS2, CREATE_UNIT_ATTACK_CYCLE: CREATE_UNIT_ATTACK_CYCLE2, FARM_MODES: FARM_MODES2, BOSS_EVENT_PHASES });
    return Object.freeze(
      Object.fromEntries(
        [new FarmSimulationScene(DEPENDENCIES), new RaidSimulationScene(DEPENDENCIES)].map((scene) => [
          scene.feature.id,
          Object.freeze(scene)
        ])
      )
    );
  }
  var init_simulation_scenes = __esm({
    "src/simulation-scenes.js"() {
      init_model10();
      init_model11();
    }
  });

  // src/features/projectiles/model-base.js
  var BallisticProjectile;
  var init_model_base3 = __esm({
    "src/features/projectiles/model-base.js"() {
      BallisticProjectile = class {
        constructor(feature, dependencies) {
          this.feature = feature;
          this.dependencies = dependencies;
          this.oldPoint = { x: 0, y: 0, z: 0 };
          this.motionPoint = { x: 0, y: 0, z: 0 };
        }
        advanceLifecycle(_world, _projectile, _dt) {
        }
        update(world, projectile, dt) {
          const { Ballistics: BALLISTICS2, ArenaGeometry: ARENA_GEOMETRY2 } = this.dependencies;
          const OLD = this.oldPoint;
          OLD.x = projectile.x;
          OLD.y = projectile.y;
          OLD.z = projectile.z;
          projectile.elapsed += dt;
          Object.assign(
            projectile,
            BALLISTICS2.sample(projectile.path, projectile.elapsed / projectile.path.duration, this.motionPoint)
          );
          const CANDIDATE = projectile.targetId && projectile.targetId !== "boss" ? world._unitForId(projectile.targetId) : world.boss;
          const TARGET = CANDIDATE && CANDIDATE.generation === projectile.targetGeneration && (CANDIDATE === world.boss || CANDIDATE.hp > 0) ? CANDIDATE : null;
          const HIT = TARGET ? ARENA_GEOMETRY2.sweep(OLD, projectile, projectile.radius, projectile.height, TARGET) : null;
          this.impact(world, projectile, TARGET, HIT);
        }
        updateChain(_world, _projectile) {
        }
      };
    }
  });

  // src/player-progression.js
  function createPlayerProgressionState() {
    return {
      ...createAbilityProgressionState(),
      formationSkills: createFormationSkillState(),
      raidDeploymentCards: createRaidDeploymentCardsState(),
      farmPlots: createFarmPlotsProgression(),
      level: 1,
      experience: 0,
      farmBossEventStage: 1,
      processedBossKillReceipts: []
    };
  }
  function awardBossKillXp(state, receiptKey, xpAmount = BOSS_KILL_XP) {
    if (!isValidPlayerProgressionState(state)) {
      return {
        state,
        awarded: false,
        reason: "invalid-state",
        xpAwarded: 0,
        levelsGained: 0,
        pointsAwarded: 0
      };
    }
    if (typeof receiptKey !== "string" || receiptKey.trim().length === 0) {
      return {
        state,
        awarded: false,
        reason: "invalid-receipt",
        xpAwarded: 0,
        levelsGained: 0,
        pointsAwarded: 0
      };
    }
    if (!Number.isFinite(xpAmount) || xpAmount < 0 || xpAmount >= 1e13) {
      return {
        state,
        awarded: false,
        reason: "invalid-xp",
        xpAwarded: 0,
        levelsGained: 0,
        pointsAwarded: 0
      };
    }
    if (state.processedBossKillReceipts.includes(receiptKey)) {
      return {
        state,
        awarded: false,
        reason: "duplicate-receipt",
        xpAwarded: 0,
        levelsGained: 0,
        pointsAwarded: 0
      };
    }
    let level = state.level;
    let experience = state.experience + xpAmount;
    let levelsGained = 0;
    while (experience >= experienceForNextLevel(level)) {
      experience -= experienceForNextLevel(level);
      level += 1;
      levelsGained += 1;
    }
    const POINTS_AWARDED = levelsGained * SHARED_POINTS_PER_LEVEL;
    const NEXT_STATE = {
      ...state,
      level,
      experience,
      availablePoints: state.availablePoints + POINTS_AWARDED,
      abilities: Object.fromEntries(
        Object.entries(state.abilities).map(([id, value]) => [
          id,
          {
            ...value
          }
        ])
      ),
      processedBossKillReceipts: [...state.processedBossKillReceipts, receiptKey]
    };
    return {
      state: NEXT_STATE,
      awarded: true,
      reason: null,
      xpAwarded: xpAmount,
      levelsGained,
      pointsAwarded: POINTS_AWARDED
    };
  }
  function experienceForNextLevel(level) {
    if (!Number.isSafeInteger(level) || level < 1) {
      throw new RangeError("level must be a positive integer");
    }
    return FIRST_LEVEL_XP * LEVEL_XP_MULTIPLIER ** (level - 1);
  }
  function formatXpForDisplay(experience) {
    const VALUE = Number.isFinite(experience) ? Math.max(0, experience) : 0;
    return new Intl.NumberFormat("ko-KR", {
      maximumFractionDigits: 1
    }).format(VALUE);
  }
  function isValidPlayerProgressionState(state) {
    if (!isValidAbilityProgressionState(state) || state.formationSkills !== void 0 && !isValidFormationSkillState(state.formationSkills) || !isValidRaidDeploymentCardsState(state.raidDeploymentCards) || !isValidFarmPlotsProgression(state.farmPlots) || !Number.isSafeInteger(state.level) || state.level < 1 || !Number.isSafeInteger(state.farmBossEventStage) || state.farmBossEventStage < 1 || state.farmBossEventStage > FARM_BOSS_EVENT_MAX_STAGE || !Number.isFinite(state.experience) || state.experience < 0 || state.experience >= experienceForNextLevel(state.level) || !Array.isArray(state.processedBossKillReceipts) || !state.processedBossKillReceipts.every((key) => typeof key === "string" && key.length > 0) || new Set(state.processedBossKillReceipts).size !== state.processedBossKillReceipts.length) {
      return false;
    }
    const INVESTED_POINTS = Object.entries(state.abilities).reduce(
      (total, [, investment]) => total + investment.powerLevel + Object.values(investment.branchLevels || {}).reduce((branchTotal, level) => branchTotal + level, 0),
      0
    );
    return INVESTED_POINTS + getFarmUpgradeInvestedCount(state.farmUpgrades) + getFarmPlotInvestedCount(state.farmPlots) + formationInvestedPoints(state.formationSkills) + raidDeploymentCardsInvestedPoints(state.raidDeploymentCards) + state.availablePoints === state.level - 1;
  }
  var PLAYER_PROGRESS_BASE_XP, BOSS_KILL_XP, FIRST_LEVEL_XP, LEVEL_XP_MULTIPLIER, SHARED_POINTS_PER_LEVEL, FARM_BOSS_EVENT_MAX_STAGE;
  var init_player_progression = __esm({
    "src/player-progression.js"() {
      init_ability_state();
      init_formation_skill_state();
      init_farm_upgrades();
      init_farm_plot();
      init_raid_deployment_cards();
      PLAYER_PROGRESS_BASE_XP = 100;
      BOSS_KILL_XP = 20;
      FIRST_LEVEL_XP = PLAYER_PROGRESS_BASE_XP;
      LEVEL_XP_MULTIPLIER = 1.2;
      SHARED_POINTS_PER_LEVEL = 1;
      FARM_BOSS_EVENT_MAX_STAGE = 61;
    }
  });

  // src/ability-progression.js
  function abilityStateFor(state, abilityId) {
    if (!DEFINITION_BY_ID.has(abilityId) || !state?.abilities?.[abilityId]) {
      return null;
    }
    return state.abilities[abilityId];
  }
  function getAbilityPowerLevel(state, abilityId) {
    return abilityStateFor(state, abilityId)?.powerLevel || 0;
  }
  function getAbilityBranchLevel(state, abilityId, branchId) {
    return abilityStateFor(state, abilityId)?.branchLevels?.[branchId] || 0;
  }
  function getMinimumApplicableTier(_state, abilityId) {
    const DEFINITION13 = DEFINITION_BY_ID.get(abilityId);
    if (!DEFINITION13) {
      return null;
    }
    return DEFINITION13.minimumTier || 1;
  }
  function isAbilityActive(state, abilityId, unitTier) {
    const DEFINITION13 = DEFINITION_BY_ID.get(abilityId), MINIMUM_TIER = getMinimumApplicableTier(state, abilityId);
    return DEFINITION13?.availableByDefault === true && Number.isInteger(unitTier) && unitTier >= MINIMUM_TIER;
  }
  function getAbilityEffects(state, abilityId, unitTier) {
    const DEFINITION13 = DEFINITION_BY_ID.get(abilityId);
    if (!DEFINITION13 || !isAbilityActive(state, abilityId, unitTier)) {
      return null;
    }
    const LEVEL = getAbilityPowerLevel(state, abilityId);
    return {
      abilityId,
      species: DEFINITION13.species,
      unitTier,
      powerLevel: LEVEL,
      value: DEFINITION13.powerValues[LEVEL],
      branchLevels: Object.fromEntries(
        Object.keys(DEFINITION13.branches || {}).map((branchId) => [
          branchId,
          getAbilityBranchLevel(state, abilityId, branchId)
        ])
      )
    };
  }
  function getInvestedPointCount(state) {
    return getInvestedAbilityPointCount(state);
  }
  function getInvestedAbilityPointCount(state, speciesId = null) {
    if (!isValidAbilityProgressionState(state)) {
      return 0;
    }
    const DEFINITIONS = speciesId === null ? SPECIES_ABILITY_DEFINITIONS : SPECIES_ABILITY_DEFINITIONS.filter((definition) => definition.species === speciesId);
    return DEFINITIONS.reduce((total, definition) => {
      const INVESTMENT = state.abilities[definition.id];
      return total + INVESTMENT.powerLevel + Object.values(INVESTMENT.branchLevels || {}).reduce((branchTotal, level) => branchTotal + level, 0);
    }, 0);
  }
  function canPurchaseAbilityNode(state, abilityId, nodeId, context = {}) {
    const DEFINITION13 = DEFINITION_BY_ID.get(abilityId);
    if (!DEFINITION13) {
      return {
        allowed: false,
        reason: "unknown-ability"
      };
    }
    if (!isValidAbilityProgressionState(state)) {
      return {
        allowed: false,
        reason: "invalid-state"
      };
    }
    const LOCK_REASON = progressionLockReason(context);
    if (LOCK_REASON) {
      return {
        allowed: false,
        reason: LOCK_REASON
      };
    }
    const INVESTMENT = state.abilities[abilityId];
    const NODE = parseNodeId(nodeId);
    if (!NODE || !["power", "branch"].includes(NODE.kind)) {
      return {
        allowed: false,
        reason: "unknown-node"
      };
    }
    if (NODE.kind === "branch" && !DEFINITION13.branches?.[NODE.branch]) {
      return {
        allowed: false,
        reason: "unknown-node"
      };
    }
    const CURRENT_LEVEL = NODE.kind === "power" ? INVESTMENT.powerLevel : INVESTMENT.branchLevels?.[NODE.branch] || 0, MAX_LEVEL = NODE.kind === "power" ? DEFINITION13.powerValues.length - 1 : DEFINITION13.branches[NODE.branch].values.length - 1;
    if (NODE.level <= CURRENT_LEVEL) {
      return {
        allowed: false,
        reason: "already-invested"
      };
    }
    if (NODE.level !== CURRENT_LEVEL + 1) {
      return {
        allowed: false,
        reason: "prerequisite-required"
      };
    }
    if (NODE.level > MAX_LEVEL) {
      return {
        allowed: false,
        reason: "max-level"
      };
    }
    if (state.availablePoints < SHARED_ABILITY_POINT_COST) {
      return {
        allowed: false,
        reason: "insufficient-points"
      };
    }
    return {
      allowed: true,
      reason: null
    };
  }
  function purchaseAbilityNode(state, abilityId, nodeId, context = {}) {
    const CHECK = canPurchaseAbilityNode(state, abilityId, nodeId, context);
    if (!CHECK.allowed) {
      return {
        ok: false,
        reason: CHECK.reason,
        state
      };
    }
    const NODE = parseNodeId(nodeId);
    const NEXT = cloneState(state);
    NEXT.availablePoints -= SHARED_ABILITY_POINT_COST;
    if (NODE.kind === "power") {
      NEXT.abilities[abilityId].powerLevel = NODE.level;
    } else {
      NEXT.abilities[abilityId].branchLevels[NODE.branch] = NODE.level;
    }
    return {
      ok: true,
      reason: null,
      state: NEXT
    };
  }
  function canResetAbilityProgression(state, context = {}, speciesId = null) {
    if (!isValidAbilityProgressionState(state)) {
      return {
        allowed: false,
        reason: "invalid-state"
      };
    }
    if (speciesId !== null && !SPECIES_ABILITY_DEFINITIONS.some((definition) => definition.species === speciesId)) {
      return {
        allowed: false,
        reason: "invalid-scope"
      };
    }
    const LOCK_REASON = progressionLockReason(context);
    if (LOCK_REASON) {
      return {
        allowed: false,
        reason: LOCK_REASON
      };
    }
    if (getInvestedAbilityPointCount(state, speciesId) === 0) {
      return {
        allowed: false,
        reason: "nothing-invested"
      };
    }
    return {
      allowed: true,
      reason: null
    };
  }
  function canResetPlayerProgression(state, scope = { type: "all" }, context = {}) {
    if (!isValidPlayerProgressionState(state)) {
      return { allowed: false, reason: "invalid-state", refunded: 0 };
    }
    const NORMALIZED_SCOPE = normalizeResetScope(scope);
    if (!NORMALIZED_SCOPE) {
      return { allowed: false, reason: "invalid-scope", refunded: 0 };
    }
    const REFUNDED = progressionResetInvestment(state, NORMALIZED_SCOPE);
    const LOCK_REASON = progressionLockReason(context);
    if (LOCK_REASON) {
      return { allowed: false, reason: LOCK_REASON, refunded: REFUNDED };
    }
    if (REFUNDED === 0) {
      return { allowed: false, reason: "nothing-invested", refunded: 0 };
    }
    return { allowed: true, reason: null, refunded: REFUNDED };
  }
  function resetPlayerProgression(state, scope = { type: "all" }, context = {}) {
    const NORMALIZED_SCOPE = normalizeResetScope(scope), CHECK = canResetPlayerProgression(state, NORMALIZED_SCOPE || scope, context);
    if (!CHECK.allowed) {
      return { ok: false, reason: CHECK.reason, refunded: CHECK.refunded, state };
    }
    const NEXT = cloneState(state), TYPE = NORMALIZED_SCOPE.type;
    NEXT.availablePoints += CHECK.refunded;
    if (TYPE === "all" || TYPE === "farm") {
      NEXT.farmUpgrades = createFarmUpgradeState();
      NEXT.farmPlots = createFarmPlotsProgression();
    }
    if (TYPE === "all" || TYPE === "abilities") {
      for (const DEFINITION13 of SPECIES_ABILITY_DEFINITIONS) {
        if (TYPE === "all" || NORMALIZED_SCOPE.speciesId === void 0 || DEFINITION13.species === NORMALIZED_SCOPE.speciesId) {
          NEXT.abilities[DEFINITION13.id] = {
            ...emptyAbilityInvestment(DEFINITION13)
          };
        }
      }
    }
    if (TYPE === "all" || TYPE === "formation") {
      NEXT.formationSkills = createFormationSkillState();
    }
    if (TYPE === "all" || TYPE === "deployment-cards") {
      NEXT.raidDeploymentCards = resetRaidDeploymentCardsState(NEXT.raidDeploymentCards);
    }
    return { ok: true, reason: null, refunded: CHECK.refunded, state: NEXT };
  }
  function progressionResetInvestment(state, scope) {
    switch (scope.type) {
      case "all":
        return getInvestedPointCount(state) + getFarmUpgradeInvestedCount(state.farmUpgrades) + getFarmPlotInvestedCount(state.farmPlots) + formationInvestedPoints(state.formationSkills) + raidDeploymentCardsInvestedPoints(state.raidDeploymentCards);
      case "farm":
        return getFarmUpgradeInvestedCount(state.farmUpgrades) + getFarmPlotInvestedCount(state.farmPlots);
      case "abilities":
        return getInvestedAbilityPointCount(state, scope.speciesId ?? null);
      case "formation":
        return formationInvestedPoints(state.formationSkills);
      case "deployment-cards":
        return raidDeploymentCardsInvestedPoints(state.raidDeploymentCards);
      default:
        return 0;
    }
  }
  function normalizeResetScope(scope) {
    const NORMALIZED = typeof scope === "string" ? { type: scope } : scope;
    if (!NORMALIZED || typeof NORMALIZED !== "object" || Array.isArray(NORMALIZED)) {
      return null;
    }
    if (NORMALIZED.type === "all" || NORMALIZED.type === "farm" || NORMALIZED.type === "formation" || NORMALIZED.type === "deployment-cards") {
      return NORMALIZED;
    }
    if (NORMALIZED.type === "abilities") {
      const SPECIES_ID = NORMALIZED.speciesId;
      if (SPECIES_ID === void 0 || Number.isInteger(SPECIES_ID) && SPECIES_ABILITY_DEFINITIONS.some((definition) => definition.species === SPECIES_ID)) {
        return NORMALIZED;
      }
    }
    return null;
  }
  function canPurchaseFarmUpgrade(state, nodeId, context = {}) {
    const NODE = FARM_UPGRADE_NODES.find((candidate) => candidate.id === nodeId);
    if (!NODE) {
      return {
        allowed: false,
        reason: "unknown-node"
      };
    }
    if (!isValidPlayerProgressionState(state)) {
      return {
        allowed: false,
        reason: "invalid-state"
      };
    }
    const LOCK_REASON = progressionLockReason(context);
    if (LOCK_REASON) {
      return {
        allowed: false,
        reason: LOCK_REASON
      };
    }
    if (state.farmUpgrades[nodeId] >= FARM_UPGRADE_MAX_LEVELS[nodeId]) {
      return {
        allowed: false,
        reason: "max-level"
      };
    }
    if (state.availablePoints < SHARED_ABILITY_POINT_COST) {
      return {
        allowed: false,
        reason: "insufficient-points"
      };
    }
    return {
      allowed: true,
      reason: null
    };
  }
  function purchaseFarmUpgrade(state, nodeId, context = {}) {
    const CHECK = canPurchaseFarmUpgrade(state, nodeId, context);
    if (!CHECK.allowed) {
      return {
        ok: false,
        reason: CHECK.reason,
        state
      };
    }
    const NEXT = cloneState(state);
    NEXT.availablePoints -= SHARED_ABILITY_POINT_COST;
    NEXT.farmUpgrades[nodeId] += 1;
    return {
      ok: true,
      reason: null,
      state: NEXT
    };
  }
  function getAbilityNodeStatus(state, definition, nodeId, context = {}) {
    const NODE = parseNodeId(nodeId);
    if (!NODE) {
      return {
        purchased: false,
        ready: false,
        reason: "unknown-node"
      };
    }
    const INVESTMENT = state?.abilities?.[definition.id] || { powerLevel: 0 };
    if (NODE.kind === "power" && NODE.level <= INVESTMENT.powerLevel) {
      return {
        purchased: true,
        ready: false,
        reason: "already-invested"
      };
    }
    if (NODE.kind === "branch" && NODE.level <= (INVESTMENT.branchLevels?.[NODE.branch] || 0)) {
      return {
        purchased: true,
        ready: false,
        reason: "already-invested"
      };
    }
    const RESULT = canPurchaseAbilityNode(state, definition.id, nodeId, context);
    return {
      purchased: false,
      ready: RESULT.allowed,
      reason: RESULT.reason
    };
  }
  function parseNodeId(nodeId) {
    const MATCH = /^(power|branch-[a-z0-9-]+)-(\d+)$/.exec(String(nodeId || ""));
    if (!MATCH) {
      return null;
    }
    return {
      kind: MATCH[1].startsWith("branch-") ? "branch" : MATCH[1],
      branch: MATCH[1].startsWith("branch-") ? MATCH[1].slice("branch-".length) : null,
      level: Number(MATCH[2])
    };
  }
  function cloneState(state) {
    return {
      ...state,
      farmUpgrades: {
        ...state.farmUpgrades
      },
      farmPlots: {
        ...state.farmPlots,
        plots: state.farmPlots.plots.map((plot) => ({ ...plot })),
        targetBasisPoints: [...state.farmPlots.targetBasisPoints]
      },
      abilities: Object.fromEntries(
        Object.entries(state.abilities).map(([id, value]) => [
          id,
          {
            ...value,
            ...DEFINITION_BY_ID.get(id)?.branches ? {
              branchLevels: Object.fromEntries(
                Object.keys(DEFINITION_BY_ID.get(id).branches).map((branchId) => [
                  branchId,
                  value.branchLevels?.[branchId] || 0
                ])
              )
            } : {}
          }
        ])
      ),
      ...state.formationSkills ? {
        formationSkills: {
          ...state.formationSkills,
          levels: { ...state.formationSkills.levels },
          equipped: [...state.formationSkills.equipped]
        }
      } : {},
      ...state.raidDeploymentCards ? {
        raidDeploymentCards: {
          ...state.raidDeploymentCards,
          speciesBySlot: [...state.raidDeploymentCards.speciesBySlot]
        }
      } : {}
    };
  }
  function emptyAbilityInvestment(definition) {
    return {
      powerLevel: 0,
      ...definition.branches ? {
        branchLevels: Object.fromEntries(Object.keys(definition.branches).map((branchId) => [branchId, 0]))
      } : {}
    };
  }
  function progressionLockReason(context) {
    if (context.location !== "farm" || context.inCombat === true) {
      return context.inCombat ? "combat-lock" : "farm-only";
    }
    return null;
  }
  var SHARED_ABILITY_POINT_COST, DEFINITION_BY_ID;
  var init_ability_progression = __esm({
    "src/ability-progression.js"() {
      init_ability_definitions();
      init_ability_state();
      init_player_progression();
      init_formation_skill_state();
      init_raid_deployment_cards();
      init_farm_upgrades();
      init_farm_plot();
      SHARED_ABILITY_POINT_COST = 1;
      DEFINITION_BY_ID = new Map(SPECIES_ABILITY_DEFINITIONS.map((definition) => [definition.id, definition]));
    }
  });

  // src/features/abilities/pea-recovery-boost/model.js
  var ABILITY_ID, PeaRecoveryBoostModel;
  var init_model12 = __esm({
    "src/features/abilities/pea-recovery-boost/model.js"() {
      init_ability_progression();
      init_pea_recovery_boost();
      ABILITY_ID = PEA_RECOVERY_BOOST_FEATURE.definition.id;
      PeaRecoveryBoostModel = class {
        static config(progression, tier) {
          const EFFECT = getAbilityEffects(progression, ABILITY_ID, tier);
          if (!EFFECT) {
            return null;
          }
          return {
            durationTicks: PEA_RECOVERY_BOOST_FEATURE.model.durationTicks,
            speedMultiplier: PEA_RECOVERY_BOOST_FEATURE.model.multiplierForBonus(EFFECT.value)
          };
        }
      };
    }
  });

  // src/features/abilities/kidney-leap/model.js
  var ABILITY_ID2, KidneyLeapModel;
  var init_model13 = __esm({
    "src/features/abilities/kidney-leap/model.js"() {
      init_ability_progression();
      init_kidney_continuous_leap();
      ABILITY_ID2 = KIDNEY_CONTINUOUS_LEAP_FEATURE.definition.id;
      KidneyLeapModel = class {
        static config(progression, tier) {
          const EFFECT = getAbilityEffects(progression, ABILITY_ID2, tier);
          if (!EFFECT) {
            return null;
          }
          return {
            cooldownResetChance: EFFECT.value,
            cooldownTicks: KIDNEY_CONTINUOUS_LEAP_FEATURE.model.cooldownTicks
          };
        }
        static shouldResetCooldown(config, roll) {
          return !!config && Number.isFinite(roll) && roll >= 0 && roll < config.cooldownResetChance;
        }
      };
    }
  });

  // src/features/abilities/chestnut-thorns/model.js
  var ABILITY_ID3, ChestnutThornsModel;
  var init_model14 = __esm({
    "src/features/abilities/chestnut-thorns/model.js"() {
      init_ability_progression();
      init_definition13();
      ABILITY_ID3 = CHESTNUT_THORNS_FEATURE.definition.id;
      ChestnutThornsModel = class {
        static config(progression, tier) {
          const EFFECT = getAbilityEffects(progression, ABILITY_ID3, tier);
          if (!EFFECT) {
            return null;
          }
          return {
            projectileCount: EFFECT.value,
            cooldownTicks: CHESTNUT_THORNS_FEATURE.definition.cooldownTicks,
            spacingTicks: CHESTNUT_THORNS_FEATURE.definition.spacingTicks,
            attackMultiplier: 1
          };
        }
        static resolveTarget(world, targetId, generation) {
          if (targetId === "boss") {
            return world.boss?.generation === generation ? world.boss : null;
          }
          const TARGET = world._unitForId(targetId);
          return TARGET?.generation === generation ? TARGET : null;
        }
      };
    }
  });

  // src/features/abilities/peanut-death-split/model.js
  var ABILITY_ID4, PeanutDeathSplitModel;
  var init_model15 = __esm({
    "src/features/abilities/peanut-death-split/model.js"() {
      init_ability_progression();
      init_definition14();
      ABILITY_ID4 = PEANUT_DEATH_SPLIT_FEATURE.definition.id;
      PeanutDeathSplitModel = class {
        static config(progression, tier) {
          const EFFECT = getAbilityEffects(progression, ABILITY_ID4, tier);
          if (!EFFECT) {
            return null;
          }
          return {
            childCount: PEANUT_DEATH_SPLIT_FEATURE.definition.childCount,
            statMultiplier: EFFECT.value
          };
        }
        static descriptors({ unit, progression, inBattle = false } = {}) {
          if (!inBattle || !unit || unit.hp > 0 || unit.isBattleOnlySummon || unit.canSplit === false || unit.splitUsedThisBattle === true) {
            return [];
          }
          const CONFIG2 = this.config(progression, unit.tier);
          if (!CONFIG2) {
            return [];
          }
          return Array.from({ length: CONFIG2.childCount }, () => ({
            species: unit.species,
            tier: 1,
            isBattleOnlySummon: true,
            battleSummonKind: "peanut-death-split",
            battleSummonParentId: unit.id,
            battleSummonParentGeneration: unit.generation,
            ownerId: unit.ownerId || "",
            farmId: unit.farmId || 0,
            faction: unit.faction,
            countsTowardPermanentRoster: false,
            eligibleForRaidDeployment: false,
            breedingEligible: false,
            mergeEligible: false,
            canSplit: false,
            splitUsedThisBattle: true,
            usesPersistentSleep: false,
            lifetime: "until-death-or-battle-end",
            permanentStatMultiplier: CONFIG2.statMultiplier
          }));
        }
      };
    }
  });

  // src/features/abilities/walnut-raw-guard/model.js
  var DEFINITION10, WalnutRawGuardModel;
  var init_model16 = __esm({
    "src/features/abilities/walnut-raw-guard/model.js"() {
      init_ability_progression();
      init_definition15();
      DEFINITION10 = WALNUT_RAW_GUARD_FEATURE.definition;
      WalnutRawGuardModel = class {
        static config(progression, tier) {
          const EFFECT = getAbilityEffects(progression, DEFINITION10.id, tier);
          if (!EFFECT) {
            return null;
          }
          return {
            rawDamageMultiplier: EFFECT.value,
            cooldownTicks: DEFINITION10.cooldownTicks,
            durationTicks: DEFINITION10.durationTicks,
            armorBonus: DEFINITION10.armorBonus,
            maxBonusAttackMultiples: DEFINITION10.maxBonusAttackMultiples
          };
        }
        static canStart(unit, tick, config) {
          return !!(config && unit?.hp > 0 && Number.isSafeInteger(tick) && tick >= (unit.walnutNextGuardTick || 0) && !(unit.walnutStoredRawDamage > 0));
        }
        static start(unit, tick, config) {
          if (!this.canStart(unit, tick, config)) {
            return false;
          }
          unit.walnutNextGuardTick = tick + config.cooldownTicks;
          unit.walnutGuardUntilTick = tick + config.durationTicks;
          return true;
        }
        static isGuarding(unit, tick) {
          return !!(unit?.hp > 0 && unit.walnutGuardUntilTick > tick);
        }
        static armorBonus(unit, tick, config) {
          return config && this.isGuarding(unit, tick) ? config.armorBonus : 0;
        }
        static accumulate(unit, rawDamage, tick, config) {
          if (!config || !this.isGuarding(unit, tick) || !Number.isFinite(rawDamage) || rawDamage <= 0) {
            return false;
          }
          unit.walnutStoredRawDamage = (unit.walnutStoredRawDamage || 0) + rawDamage;
          return true;
        }
        static nextHammerBonus(unit, attackPower, config) {
          if (!config || !Number.isFinite(unit?.walnutStoredRawDamage) || unit.walnutStoredRawDamage <= 0) {
            return 0;
          }
          return Math.min(
            unit.walnutStoredRawDamage * config.rawDamageMultiplier,
            attackPower * config.maxBonusAttackMultiples
          );
        }
        static consume(unit) {
          const CONSUMED = Number.isFinite(unit?.walnutStoredRawDamage) && unit.walnutStoredRawDamage > 0;
          if (unit) {
            unit.walnutStoredRawDamage = 0;
          }
          return CONSUMED;
        }
        static clear(unit) {
          unit.walnutGuardUntilTick = 0;
          unit.walnutStoredRawDamage = 0;
        }
      };
    }
  });

  // src/features/abilities/corn-attachment/model.js
  var DEFINITION11, CornAttachmentModel;
  var init_model17 = __esm({
    "src/features/abilities/corn-attachment/model.js"() {
      init_ability_progression();
      init_definition16();
      DEFINITION11 = CORN_ATTACHMENT_FEATURE.definition;
      CornAttachmentModel = class {
        static projectileEffect(progression, tier) {
          const CONFIG_LOCAL = this.config(progression, tier);
          return CONFIG_LOCAL ? { abilityId: DEFINITION11.id, config: CONFIG_LOCAL } : null;
        }
        static config(progression, tier) {
          const EFFECT = getAbilityEffects(progression, DEFINITION11.id, tier);
          if (!EFFECT) {
            return null;
          }
          return {
            damageMultiplier: EFFECT.value,
            attachDelayTicks: DEFINITION11.attachDelayTicks,
            explosionSpacingTicks: DEFINITION11.explosionSpacingTicks,
            fadeTicks: DEFINITION11.fadeTicks
          };
        }
        static createManager() {
          return {
            nextGroupId: 1,
            nextAttachmentId: 1,
            groups: []
          };
        }
        static attach(world, target, projectile, config) {
          if (!world || !target || target.hp <= 0 || !projectile?.cornPayload || !config) {
            return null;
          }
          const TICK = world.simulationTick, TARGET_ID = target === world.boss ? "boss" : target.id, TARGET_GENERATION = target.generation, MANAGER = world.cornAttachments || (world.cornAttachments = this.createManager());
          let group = [...MANAGER.groups].reverse().find(
            (group2) => group2.targetId === TARGET_ID && group2.targetGeneration === TARGET_GENERATION && group2.status === "collecting" && TICK < group2.closeAtTick
          );
          if (!group) {
            group = {
              id: MANAGER.nextGroupId++,
              targetId: TARGET_ID,
              targetGeneration: TARGET_GENERATION,
              targetX: target.x,
              targetY: target.y,
              targetZ: target.z || 0,
              firstAttachTick: TICK,
              closeAtTick: TICK + config.attachDelayTicks,
              nextExplosionTick: null,
              status: "collecting",
              attachments: []
            };
            MANAGER.groups.push(group);
          }
          const ANGLE = (group.attachments.length + 1) * 2.399963229728653 % (Math.PI * 2), ATTACHMENT = {
            id: MANAGER.nextAttachmentId++,
            groupId: group.id,
            targetId: TARGET_ID,
            targetGeneration: TARGET_GENERATION,
            ownerId: projectile.owner,
            ownerGeneration: projectile.ownerGeneration,
            payload: structuredClone(projectile.cornPayload),
            damageMultiplier: config.damageMultiplier,
            status: "attached",
            fadeTicks: config.fadeTicks,
            angle: ANGLE,
            offsetX: Math.cos(ANGLE) * 0.18,
            offsetY: Math.sin(ANGLE) * 0.12
          };
          group.attachments.push(ATTACHMENT);
          return ATTACHMENT;
        }
        static onProjectileHit(world, target, projectile, config) {
          if (!target || target.hp <= 0) {
            return null;
          }
          return this.attach(world, target, projectile, config);
        }
        static advance(world) {
          const MANAGER = world?.cornAttachments;
          if (!MANAGER) {
            return;
          }
          const TICK = world.simulationTick;
          for (const GROUP of MANAGER.groups) {
            const TARGET = this.resolveTarget(world, GROUP.targetId, GROUP.targetGeneration);
            if (TARGET) {
              GROUP.targetX = TARGET.x;
              GROUP.targetY = TARGET.y;
              GROUP.targetZ = TARGET.z || 0;
            }
            if (!TARGET || TARGET.hp <= 0) {
              for (const ATTACHMENT of GROUP.attachments) {
                if (ATTACHMENT.status === "attached") {
                  ATTACHMENT.status = "fading";
                }
              }
              GROUP.status = "cancelled";
            } else if (GROUP.status === "collecting" && TICK >= GROUP.closeAtTick) {
              GROUP.status = "exploding";
              GROUP.nextExplosionTick = GROUP.closeAtTick;
            }
            if (GROUP.status === "exploding" && TICK >= GROUP.nextExplosionTick) {
              const ATTACHMENT = GROUP.attachments.find((entry) => entry.status === "attached");
              if (ATTACHMENT) {
                this.explode(world, TARGET, ATTACHMENT);
                ATTACHMENT.status = "fading";
                GROUP.nextExplosionTick += DEFINITION11.explosionSpacingTicks;
              } else {
                GROUP.status = "complete";
              }
            }
            for (const ATTACHMENT of GROUP.attachments) {
              if (ATTACHMENT.status === "fading") {
                ATTACHMENT.fadeTicks -= 1;
                if (ATTACHMENT.fadeTicks <= 0) {
                  ATTACHMENT.status = "removed";
                }
              }
            }
          }
          MANAGER.groups = MANAGER.groups.filter(
            (group) => group.attachments.some((entry) => entry.status !== "removed")
          );
        }
        static resolveTarget(world, targetId, generation) {
          if (targetId === "boss") {
            return world.boss?.generation === generation ? world.boss : null;
          }
          const TARGET = world._unitForId(targetId);
          return TARGET?.generation === generation ? TARGET : null;
        }
        static explode(world, target, attachment) {
          const PAYLOAD = attachment.payload;
          let source = world._unitForId(attachment.ownerId);
          if (source?.generation !== attachment.ownerGeneration) {
            source = null;
          }
          const ATTACKER = source || {
            id: attachment.ownerId,
            generation: attachment.ownerGeneration,
            ownerId: PAYLOAD.ownerId,
            faction: PAYLOAD.faction,
            isFormationClone: !!PAYLOAD.isFormationClone,
            species: PAYLOAD.species,
            tier: PAYLOAD.tier,
            hp: 0,
            x: PAYLOAD.x,
            y: PAYLOAD.y,
            z: PAYLOAD.z
          }, ACTION = { id: ++world.attackSerial, hit: false };
          world.damageCombatTarget(
            ATTACKER,
            ACTION,
            target,
            { x: target.x, y: target.y, z: target.z || 0 },
            {
              attackContext: {
                source: ATTACKER,
                sourceKind: "direct",
                attackerStats: PAYLOAD.attackerStats,
                damageMultiplier: attachment.damageMultiplier,
                attackPowerMultiplier: PAYLOAD.attackPowerMultiplier,
                kind: "corn-attachment-explosion",
                buffed: PAYLOAD.buffed,
                area: false,
                criticalRoll: 1,
                sourceStatOverrides: { ...PAYLOAD.attackerStats, critChance: 0 },
                hitTargets: null
              },
              disableGrainEffects: true
            }
          );
          world.combat("corn-attachment-explosion", {
            sourceUnit: ATTACKER.id,
            targetUnit: target === world.boss ? "boss" : target.id,
            x: target.x,
            y: target.y,
            multiplier: attachment.damageMultiplier
          });
        }
      };
    }
  });

  // src/features/abilities/rice-critical/model.js
  var ABILITY_ID5, RiceCriticalModel;
  var init_model18 = __esm({
    "src/features/abilities/rice-critical/model.js"() {
      init_ability_progression();
      ABILITY_ID5 = "rice-low-health-harvest";
      RiceCriticalModel = class {
        static chanceBonus(progression, tier, currentHp, maxHp) {
          if (!Number.isFinite(currentHp) || currentHp <= 0 || !Number.isFinite(maxHp) || maxHp <= 0) {
            return 0;
          }
          const EFFECT = getAbilityEffects(progression, ABILITY_ID5, tier);
          if (!EFFECT) {
            return 0;
          }
          const MISSING_HP_RATIO = Math.max(0, Math.min(1, 1 - currentHp / maxHp));
          return MISSING_HP_RATIO * EFFECT.value;
        }
      };
    }
  });

  // src/features/unit-attacks/lob/definition.js
  var FEATURE4;
  var init_definition17 = __esm({
    "src/features/unit-attacks/lob/definition.js"() {
      FEATURE4 = Object.freeze({ id: "lob", modelKey: "projectile" });
    }
  });

  // src/features/unit-attacks/dual-strike/definition.js
  var FEATURE5;
  var init_definition18 = __esm({
    "src/features/unit-attacks/dual-strike/definition.js"() {
      FEATURE5 = Object.freeze({ id: "peanut-dual-strike", modelKey: "repeatedStrike" });
    }
  });

  // src/unit-abilities.js
  function attackProfile(kind, { timing, ...overrides } = {}) {
    return Object.freeze({
      kind,
      ...ATTACK_DEFAULTS,
      ...overrides,
      timing: timing ? Object.freeze({
        ...ATTACK_DEFAULTS.timing,
        ...timing
      }) : ATTACK_DEFAULTS.timing
    });
  }
  function abilityProfile(species) {
    return UNIT_ABILITY_PROFILES[species] || UNIT_ABILITY_PROFILES[0];
  }
  function unitCapabilityComposition(species) {
    return UNIT_CAPABILITY_COMPOSITIONS[species] || UNIT_CAPABILITY_COMPOSITIONS[0];
  }
  function specialAbilityCompositionFor(species) {
    const NAME = unitCapabilityComposition(species).specialAbility;
    return NAME ? UNIT_SPECIAL_ABILITY_COMPOSITIONS[NAME] || null : null;
  }
  function hasUnitCapability(species, capability) {
    const DEFINITION13 = UNIT_CAPABILITY_COMPOSITIONS[species];
    return !!DEFINITION13 && (DEFINITION13.attack === capability || DEFINITION13.traits.includes(capability) || DEFINITION13.specialAbility === capability);
  }
  var ATTACK_DEFAULTS, UNIT_ABILITY_PROFILES, COMPOSITION, UNIT_CAPABILITY_COMPOSITIONS, UNIT_SPECIAL_ABILITY_COMPOSITIONS, CAPABILITY_SPECIES, NO_SPECIES;
  var init_unit_abilities = __esm({
    "src/unit-abilities.js"() {
      init_definition17();
      init_definition18();
      init_kidney_continuous_leap();
      init_definition13();
      ATTACK_DEFAULTS = Object.freeze({
        timing: Object.freeze({
          windup: 0.28,
          recovery: 0.65
        }),
        range: 1.45,
        skillMultiplier: 1,
        projectileCount: 0,
        bounces: 0
      });
      UNIT_ABILITY_PROFILES = Object.freeze({
        0: attackProfile("ram"),
        1: attackProfile(FEATURE4.id, {
          timing: {
            windup: 0.38,
            recovery: 1.25
          },
          range: 4.1,
          skillMultiplier: 1.6,
          projectileCount: 1
        }),
        2: attackProfile("ram"),
        3: attackProfile("punch"),
        // One Peanut remains one world unit; its two kernels are presentation-only
        // and the two deterministic strike slots share the same active window.
        4: attackProfile(FEATURE5.id, {
          timing: {
            windup: 0.25,
            active: 0.5,
            recovery: 1
          }
        }),
        // Walnut's base hammer is a single hit; the separate guard trait empowers
        // one subsequent basic cycle without adding an attack queue or timer.
        5: attackProfile("walnut-hammer", {
          timing: {
            windup: 0.5,
            active: 0.25,
            recovery: 1
          }
        }),
        6: attackProfile("ram"),
        7: attackProfile("punch"),
        8: attackProfile("ram")
      });
      COMPOSITION = (attack, traits = [], options = {}) => Object.freeze({
        attack,
        traits: Object.freeze(traits),
        contactRecoil: false,
        useActiveDuration: false,
        retreatWithinRange: false,
        aimAtCenter: false,
        outerRangeSlack: 0.55,
        specialAbility: null,
        ...options
      });
      UNIT_CAPABILITY_COMPOSITIONS = Object.freeze({
        0: COMPOSITION("contact", ["recoveryHaste"], {
          contactRecoil: true
        }),
        1: COMPOSITION(FEATURE4.modelKey, ["cornAttachment"], {
          retreatWithinRange: true,
          aimAtCenter: true
        }),
        2: COMPOSITION("contact", [], { specialAbility: "kidneyLeap" }),
        3: COMPOSITION("contact", [], {
          contactRecoil: true,
          specialAbility: "chestnutThorns"
        }),
        4: COMPOSITION(FEATURE5.modelKey, ["deathSplit"], {
          useActiveDuration: true,
          outerRangeSlack: 0
        }),
        5: COMPOSITION("contact", ["guard"], {
          useActiveDuration: true
        }),
        6: COMPOSITION("contact", ["riceCritical"], {
          contactRecoil: true
        }),
        7: COMPOSITION("contact", ["commandAura"], {
          contactRecoil: true
        }),
        8: COMPOSITION("contact", ["armorBreak"], {
          contactRecoil: true
        })
      });
      UNIT_SPECIAL_ABILITY_COMPOSITIONS = Object.freeze({
        chestnutThorns: Object.freeze({
          definition: CHESTNUT_THORNS_FEATURE.definition,
          profile: CHESTNUT_THORNS_FEATURE.definition.attackProfile,
          cooldownTicks: CHESTNUT_THORNS_FEATURE.definition.cooldownTicks,
          attack: "contact",
          traits: Object.freeze(["chestnutThorns"]),
          composition: Object.freeze({
            attack: "contact",
            traits: Object.freeze(["chestnutThorns"]),
            contactRecoil: false,
            useActiveDuration: false,
            retreatWithinRange: false,
            aimAtCenter: false,
            outerRangeSlack: 0.55,
            specialAbility: null
          })
        }),
        kidneyLeap: Object.freeze({
          definition: KIDNEY_CONTINUOUS_LEAP_FEATURE.definition,
          profile: KIDNEY_CONTINUOUS_LEAP_FEATURE.model.specialAttackProfile,
          cooldownTicks: KIDNEY_CONTINUOUS_LEAP_FEATURE.model.cooldownTicks,
          attack: "contact",
          traits: Object.freeze(["landing", "leapReset", "kidneyLeap"]),
          composition: Object.freeze({
            attack: "contact",
            traits: Object.freeze(["landing", "leapReset", "kidneyLeap"]),
            contactRecoil: false,
            useActiveDuration: false,
            retreatWithinRange: false,
            aimAtCenter: false,
            outerRangeSlack: 0.55,
            specialAbility: null
          })
        })
      });
      CAPABILITY_SPECIES = /* @__PURE__ */ new Map();
      for (const [SPECIES, DEFINITION13] of Object.entries(UNIT_CAPABILITY_COMPOSITIONS)) {
        for (const CAPABILITY of /* @__PURE__ */ new Set([
          DEFINITION13.attack,
          ...DEFINITION13.traits,
          ...DEFINITION13.specialAbility ? [DEFINITION13.specialAbility] : []
        ])) {
          if (!CAPABILITY_SPECIES.has(CAPABILITY)) {
            CAPABILITY_SPECIES.set(CAPABILITY, []);
          }
          CAPABILITY_SPECIES.get(CAPABILITY).push(Number(SPECIES));
        }
      }
      for (const SPECIES of CAPABILITY_SPECIES.values()) {
        Object.freeze(SPECIES);
      }
      NO_SPECIES = Object.freeze([]);
    }
  });

  // src/features/abilities/wheat-command/model.js
  var DEFINITION12, ABILITY_ID6, WheatCommandModel;
  var init_model19 = __esm({
    "src/features/abilities/wheat-command/model.js"() {
      init_ability_progression();
      init_unit_abilities();
      init_wheat_command_crit();
      DEFINITION12 = WHEAT_COMMAND_CRIT_FEATURE.definition;
      ABILITY_ID6 = DEFINITION12.id;
      WheatCommandModel = class {
        static config(progression, tier) {
          const EFFECT = getAbilityEffects(progression, ABILITY_ID6, tier);
          if (!EFFECT) {
            return null;
          }
          const RANGE_LEVEL = EFFECT.branchLevels.range || 0, RANGE_MULTIPLIER = DEFINITION12.branches.range.values[RANGE_LEVEL];
          return {
            level: EFFECT.powerLevel,
            speedValue: EFFECT.value,
            rangeMultiplier: RANGE_MULTIPLIER,
            radius: abilityProfile(7).range * RANGE_MULTIPLIER
          };
        }
        static trigger(sim, source, action, config) {
          if (!sim || !source || !action || !config || action.wheatCommandResolved || !Number.isFinite(config.radius) || typeof sim.random !== "function") {
            return false;
          }
          action.wheatCommandResolved = true;
          if (sim.random() >= DEFINITION12.triggerChance) {
            return false;
          }
          const RADIUS_SQUARED = config.radius * config.radius, TICK = sim.simulationTick;
          let affected = 0;
          for (const UNIT3 of sim.units || []) {
            const DX = UNIT3.x - source.x, DY = UNIT3.y - source.y;
            if (UNIT3.hp > 0 && UNIT3.faction === source.faction && DX * DX + DY * DY <= RADIUS_SQUARED) {
              this.refreshBuff(UNIT3, config.level, TICK);
              affected++;
            }
          }
          if (affected > 0) {
            sim.combat?.("wheat-command", {
              unit: source.id,
              x: source.x,
              y: source.y,
              z: source.z || 0,
              radius: config.radius,
              level: config.level,
              affected
            });
          }
          return affected > 0;
        }
        static refreshBuff(unit, level, tick) {
          if (!unit || !Number.isSafeInteger(level) || level < 0 || level > 2 || !Number.isSafeInteger(tick) || tick < 0) {
            return false;
          }
          const BUFFS = Array.isArray(unit.wheatCommandBuffs) ? unit.wheatCommandBuffs.filter((buff) => buff.expiresAtTick > tick) : [];
          unit.wheatCommandBuffs = BUFFS;
          const EXISTING = BUFFS.find((buff) => buff.level === level), EXPIRES_AT_TICK = tick + DEFINITION12.durationTicks;
          if (EXISTING) {
            EXISTING.expiresAtTick = Math.max(EXISTING.expiresAtTick, EXPIRES_AT_TICK);
          } else {
            BUFFS.push({ level, expiresAtTick: EXPIRES_AT_TICK });
            BUFFS.sort((a, b) => a.level - b.level);
          }
          unit.ability?.syncAttackSpeedMultiplier?.(tick);
          return true;
        }
        static activeBuff(unit, tick) {
          const BUFFS = Array.isArray(unit?.wheatCommandBuffs) ? unit.wheatCommandBuffs : [];
          let strongest = null;
          for (const BUFF of BUFFS) {
            if (BUFF.expiresAtTick > tick && (!strongest || BUFF.level > strongest.level)) {
              strongest = BUFF;
            }
          }
          return strongest;
        }
        static attackSpeedMultiplier(unit, tick) {
          const ACTIVE = this.activeBuff(unit, tick);
          return ACTIVE ? 1 + DEFINITION12.powerValues[ACTIVE.level] : 1;
        }
      };
    }
  });

  // src/features/abilities/barley-shred/model.js
  function createBarleyArmorShredBuckets() {
    return Array.from({ length: BARLEY_ARMOR_SHRED_BUCKETS }, () => ({ expiresAtTick: 0, amount: 0 }));
  }
  var BARLEY_ARMOR_SHRED_BUCKETS, ABILITY_ID7, BarleyArmorShredModel;
  var init_model20 = __esm({
    "src/features/abilities/barley-shred/model.js"() {
      init_ability_progression();
      BARLEY_ARMOR_SHRED_BUCKETS = 60;
      ABILITY_ID7 = "barley-armor-break";
      BarleyArmorShredModel = class {
        static config(progression, tier) {
          const EFFECT = getAbilityEffects(progression, ABILITY_ID7, tier);
          if (!EFFECT) {
            return null;
          }
          return {
            amount: EFFECT.value
          };
        }
        static applyHit(target, amount, tick) {
          if (!target || target.hp <= 0 || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(tick) || tick < 0) {
            return null;
          }
          const BUCKETS = Array.isArray(target.barleyArmorShredBuckets) && target.barleyArmorShredBuckets.length === BARLEY_ARMOR_SHRED_BUCKETS ? target.barleyArmorShredBuckets : target.barleyArmorShredBuckets = createBarleyArmorShredBuckets();
          this.prune(target, tick);
          const INDEX = tick % BARLEY_ARMOR_SHRED_BUCKETS, BUCKET = BUCKETS[INDEX], EXPIRES_AT_TICK = tick + BARLEY_ARMOR_SHRED_BUCKETS;
          if (BUCKET.expiresAtTick === EXPIRES_AT_TICK) {
            BUCKET.amount += amount;
          } else {
            BUCKET.expiresAtTick = EXPIRES_AT_TICK;
            BUCKET.amount = amount;
          }
          return {
            amount,
            expiresAtTick: EXPIRES_AT_TICK,
            total: this.total(target, tick)
          };
        }
        static prune(target, tick) {
          const BUCKETS = target?.barleyArmorShredBuckets;
          if (!Array.isArray(BUCKETS)) {
            return;
          }
          for (const BUCKET of BUCKETS) {
            if (BUCKET.expiresAtTick <= tick) {
              BUCKET.expiresAtTick = 0;
              BUCKET.amount = 0;
            }
          }
        }
        static total(target, tick) {
          let total = 0;
          for (const BUCKET of target?.barleyArmorShredBuckets || []) {
            if (BUCKET.expiresAtTick > tick) {
              total += BUCKET.amount;
            }
          }
          return total;
        }
        static effectiveArmor(target, baseArmor, armorBonus, tick) {
          const BASE_ARMOR = Number.isFinite(baseArmor) ? baseArmor : 0, ARMOR_BONUS = Number.isFinite(armorBonus) ? armorBonus : 0;
          return Math.max(0, BASE_ARMOR + ARMOR_BONUS - this.total(target, tick));
        }
        static hasActiveShred(target, tick) {
          return this.total(target, tick) > 0;
        }
      };
    }
  });

  // src/features/abilities/pea-recovery-boost/presentation.js
  var PeaRecoveryBoostPresentation;
  var init_presentation = __esm({
    "src/features/abilities/pea-recovery-boost/presentation.js"() {
      PeaRecoveryBoostPresentation = class {
        label(_definition, value) {
          return `강제 이동 후 2초 이동 속도 +${Math.round(value * 100)}%`;
        }
        title(value) {
          return `회복 기동 +${Math.round(value * 100)}%`;
        }
      };
    }
  });

  // src/features/abilities/kidney-leap/presentation.js
  var KidneyLeapPresentation;
  var init_presentation2 = __esm({
    "src/features/abilities/kidney-leap/presentation.js"() {
      KidneyLeapPresentation = class {
        label(_definition, value) {
          return `가까운 적에게 도약 · 착지 후 도약 재사용 ${Math.round(value * 100)}% 확률`;
        }
        title(value) {
          return `재사용 ${Math.round(value * 100)}%`;
        }
      };
    }
  });

  // src/features/abilities/chestnut-thorns/presentation.js
  var ChestnutThornsPresentation;
  var init_presentation3 = __esm({
    "src/features/abilities/chestnut-thorns/presentation.js"() {
      ChestnutThornsPresentation = class {
        label(_definition, value) {
          return `3초마다 가시 ${value}발 · 발당 공격력 100% · 0.1초 간격`;
        }
        title(value) {
          return `가시 ${value}발`;
        }
      };
    }
  });

  // src/features/abilities/peanut-death-split/presentation.js
  var PEANUT_PLAYERS_BY_RENDERER, PeanutDeathSplitPresentation;
  var init_presentation4 = __esm({
    "src/features/abilities/peanut-death-split/presentation.js"() {
      PEANUT_PLAYERS_BY_RENDERER = /* @__PURE__ */ new WeakMap();
      PeanutDeathSplitPresentation = class {
        dispose(renderer) {
          const PLAYERS = PEANUT_PLAYERS_BY_RENDERER.get(renderer);
          if (!PLAYERS) {
            return;
          }
          for (const PLAYER of PLAYERS.values()) {
            PLAYER.dispose();
          }
          PLAYERS.clear();
          PEANUT_PLAYERS_BY_RENDERER.delete(renderer);
        }
        label(_definition, value) {
          return `사망 시 T1 분열체 2마리 · 체력/공격력 ×${value}`;
        }
        title(value) {
          return `분열체 ×${value}`;
        }
        draw(renderer, effect, progress) {
          this.drawSplit(renderer, effect, progress);
        }
        drawSplit(renderer, effect, progress) {
          const RECORD = renderer.vectorAssets.get(effect.species);
          if (!RECORD) {
            return;
          }
          let players = PEANUT_PLAYERS_BY_RENDERER.get(renderer);
          if (!players) {
            players = /* @__PURE__ */ new Map();
            PEANUT_PLAYERS_BY_RENDERER.set(renderer, players);
          }
          let player = players.get(effect.eventId);
          if (!player) {
            player = RECORD.asset.createPlayer({ clip: "fire", startedAtMs: 0 });
            players.set(effect.eventId, player);
          }
          const CLIP = RECORD.compiled.metadata.clips.fire, ELAPSED_MS = Math.max(0, Math.min(CLIP.durationMs, progress * 1e3)), [, , WIDTH, HEIGHT] = RECORD.compiled.viewBox, GROUND = RECORD.anchors.ground, POSITION = renderer.project(effect.x, effect.y, effect.z || 0), RADIUS = renderer.scale * 0.72, SCALE = 2 * RADIUS / Math.max(WIDTH, HEIGHT), CENTER_Y = POSITION.y + (HEIGHT * 0.5 - GROUND.y) * SCALE, MATRIX = [SCALE, 0, 0, SCALE, POSITION.x - GROUND.x * SCALE, CENTER_Y - GROUND.y * SCALE];
          player.play("fire", 0);
          player.setExpression("surprised");
          player.seek(ELAPSED_MS);
          renderer.ctx.vector.flush();
          player.draw({
            projection: renderer.ctx.vector.projection,
            matrix: MATRIX,
            alpha: Math.max(0, 1 - progress / 0.7)
          });
          if (ELAPSED_MS >= CLIP.durationMs) {
            player.dispose();
            players.delete(effect.eventId);
          }
        }
      };
    }
  });

  // src/features/abilities/walnut-raw-guard/presentation.js
  var WalnutRawGuardPresentation;
  var init_presentation5 = __esm({
    "src/features/abilities/walnut-raw-guard/presentation.js"() {
      WalnutRawGuardPresentation = class {
        label(_definition, value) {
          return `5초마다 2초 방어 · 방어력 +50 · 저장 RAW의 ${Math.round(value * 100)}% 추가 반격`;
        }
        title(value) {
          return `추가 피해 ${Math.round(value * 100)}%`;
        }
        drawGuard(renderer, effect, progress) {
          const T = Math.min(1, progress / 0.3), ALPHA = 1 - progress, RADIUS = 0.42 + T * 0.18;
          if (ALPHA <= 0) {
            return;
          }
          renderer.ring(effect.x, effect.y, RADIUS, `rgba(180,194,150,${ALPHA * 0.9})`, 0.08);
          renderer.groundEllipse(effect.x, effect.y, RADIUS * 0.72, RADIUS * 0.72, `rgba(199,213,162,${ALPHA * 0.18})`);
        }
      };
    }
  });

  // src/features/abilities/corn-attachment/presentation.js
  var CornAttachmentPresentation;
  var init_presentation6 = __esm({
    "src/features/abilities/corn-attachment/presentation.js"() {
      CornAttachmentPresentation = class {
        label(_definition, value) {
          return `부착 1초 후 연쇄 폭발 · 알갱이마다 공격력 ${Math.round(value * 100)}%`;
        }
        title(value) {
          return `알갱이 ${Math.round(value * 100)}%`;
        }
        drawAttachment(renderer, attachment, group) {
          const P = renderer.project(
            group.targetX + attachment.offsetX,
            group.targetY + attachment.offsetY,
            group.targetZ + 0.5
          ), SIZE = renderer.scale * 0.055, ALPHA = attachment.status === "fading" ? attachment.fadeTicks / 6 : 1;
          renderer.ellipse(P.x, P.y, SIZE, SIZE * 1.2, `rgba(238,192,75,${ALPHA})`, attachment.angle);
          renderer.ellipse(P.x - SIZE * 0.2, P.y - SIZE * 0.35, SIZE * 0.2, SIZE * 0.25, `rgba(255,238,147,${ALPHA})`);
        }
      };
    }
  });

  // src/features/abilities/rice-critical/presentation.js
  var RiceCriticalPresentation;
  var init_presentation7 = __esm({
    "src/features/abilities/rice-critical/presentation.js"() {
      init_unit_stats();
      RiceCriticalPresentation = class {
        label(_definition, value) {
          return `잃은 HP 비율에 따라 치명타 확률 최대 +${Math.round(value * 100)}%p · 치명타 피해 ×${COMMON_UNIT_STAT_DEFAULTS.critMultiplier}`;
        }
        title(value) {
          return `치명타 최대 +${Math.round(value * 100)}%p`;
        }
        drawCriticalHit(renderer, event, progress) {
          const T = Math.min(1, progress / 0.58), ALPHA = 1 - T, CENTER = renderer.project(event.x, event.y, (event.z || 0) + 0.22);
          if (ALPHA <= 0) {
            return;
          }
          renderer.ring(event.x, event.y, 0.3 + T * 0.62, `rgba(255,211,92,${ALPHA * 0.95})`, 0.11);
          for (let index = 0; index < 3; index++) {
            const ANGLE = -Math.PI / 2 + (index - 1) * 0.42 + event.sequence % 7 * 0.08, DISTANCE = renderer.scale * (0.19 + T * 0.22), FROM = {
              x: CENTER.x - Math.cos(ANGLE) * DISTANCE,
              y: CENTER.y - Math.sin(ANGLE) * DISTANCE
            }, TO = {
              x: CENTER.x + Math.cos(ANGLE) * DISTANCE,
              y: CENTER.y + Math.sin(ANGLE) * DISTANCE
            };
            renderer.line(FROM, TO, renderer.scale * 0.07, `rgba(255,242,184,${ALPHA})`);
          }
        }
      };
    }
  });

  // src/features/abilities/wheat-command/presentation.js
  var WheatCommandPresentation;
  var init_presentation8 = __esm({
    "src/features/abilities/wheat-command/presentation.js"() {
      WheatCommandPresentation = class {
        label(_definition, value) {
          const BONUS = value * 100, BONUS_LABEL = Number.isInteger(BONUS) ? BONUS : BONUS.toFixed(1);
          return `공격 속도 보너스 +${BONUS_LABEL}%`;
        }
        title(value) {
          const BONUS = value * 100, BONUS_LABEL = Number.isInteger(BONUS) ? BONUS : BONUS.toFixed(1);
          return `공격 속도 보너스 +${BONUS_LABEL}%`;
        }
        branchLabel(_definition, branchId, value) {
          return branchId === "range" ? `주변 기본 공격 사거리 ×${value}` : `${branchId} ${value}`;
        }
        branchTitle(_definition, branchId, value) {
          return branchId === "range" ? `범위 ×${value}` : `${branchId} ${value}`;
        }
      };
    }
  });

  // src/features/abilities/barley-shred/presentation.js
  var BarleyArmorShredPresentation;
  var init_presentation9 = __esm({
    "src/features/abilities/barley-shred/presentation.js"() {
      BarleyArmorShredPresentation = class {
        label(_definition, value) {
          return `기본 공격 적중 후 방어도 ${value} 감소 · 감소마다 3초 · 방어도 최저 0`;
        }
        title(value) {
          return `방어도 −${value}`;
        }
        draw(renderer, event, progress) {
          const T = Math.min(1, progress / 0.72), ALPHA = 1 - T, CENTER = renderer.project(event.x, event.y, (event.z || 0) + 0.18);
          if (ALPHA <= 0) {
            return;
          }
          renderer.ring(event.x, event.y, 0.22 + T * 0.48, `rgba(191,209,196,${ALPHA * 0.72})`, 0.065);
          for (let index = 0; index < 4; index++) {
            const ANGLE = Math.PI / 4 + index * Math.PI / 2 + event.sequence % 5 * 0.12, FROM = {
              x: CENTER.x + Math.cos(ANGLE) * renderer.scale * 0.08,
              y: CENTER.y + Math.sin(ANGLE) * renderer.scale * 0.08
            }, TO = {
              x: CENTER.x + Math.cos(ANGLE) * renderer.scale * (0.22 + T * 0.18),
              y: CENTER.y + Math.sin(ANGLE) * renderer.scale * (0.22 + T * 0.18)
            };
            renderer.line(FROM, TO, renderer.scale * 0.055, `rgba(229,242,229,${ALPHA})`);
          }
        }
        drawStatus(renderer, target, amount) {
          if (target.hp <= 0 || amount <= 0) {
            return;
          }
          const CENTER = renderer.project(target.x, target.y, (target.z || 0) + (target.height || 0) + 0.16), SIZE = renderer.scale * 0.11;
          for (let index = -1; index <= 1; index++) {
            const OFFSET = index * SIZE * 0.8, FROM = {
              x: CENTER.x + OFFSET - SIZE * 0.28,
              y: CENTER.y + SIZE * 0.42
            }, TO = {
              x: CENTER.x + OFFSET + SIZE * 0.28,
              y: CENTER.y - SIZE * 0.42
            };
            renderer.line(FROM, TO, Math.max(1, renderer.pixelRatio * 1.4), "#d8e5d7");
          }
        }
      };
    }
  });

  // src/ability-presentations.js
  var ABILITY_PRESENTATION_OVERRIDES;
  var init_ability_presentations = __esm({
    "src/ability-presentations.js"() {
      init_presentation();
      init_presentation2();
      init_presentation3();
      init_presentation4();
      init_presentation5();
      init_presentation6();
      init_presentation7();
      init_presentation8();
      init_presentation9();
      ABILITY_PRESENTATION_OVERRIDES = /* @__PURE__ */ new Map([
        ["pea-recovery-boost", Object.freeze(new PeaRecoveryBoostPresentation())],
        ["kidney-continuous-leap", Object.freeze(new KidneyLeapPresentation())],
        ["chestnut-target-thorns", Object.freeze(new ChestnutThornsPresentation())],
        ["peanut-death-split", Object.freeze(new PeanutDeathSplitPresentation())],
        ["walnut-raw-guard", Object.freeze(new WalnutRawGuardPresentation())],
        ["corn-kernel-chain", Object.freeze(new CornAttachmentPresentation())],
        ["rice-low-health-harvest", Object.freeze(new RiceCriticalPresentation())],
        ["wheat-command-crit", Object.freeze(new WheatCommandPresentation())],
        ["barley-armor-break", Object.freeze(new BarleyArmorShredPresentation())]
      ]);
    }
  });

  // src/ability-catalog.js
  function abilityFeatureFor(abilityId) {
    return ABILITY_FEATURE_BY_ID.get(abilityId) || null;
  }
  function abilityPresentationFor(abilityId) {
    return ABILITY_PRESENTATION_BY_ID.get(abilityId);
  }
  var ABILITY_MODELS, ABILITY_FEATURES, ABILITY_FEATURE_BY_ID, ABILITY_PRESENTATION_BY_ID;
  var init_ability_catalog = __esm({
    "src/ability-catalog.js"() {
      init_ability_definitions();
      init_pea_recovery_boost();
      init_model12();
      init_kidney_continuous_leap();
      init_model13();
      init_definition13();
      init_model14();
      init_definition14();
      init_model15();
      init_definition15();
      init_model16();
      init_definition16();
      init_model17();
      init_rice_low_health_harvest();
      init_model18();
      init_wheat_command_crit();
      init_model19();
      init_barley_armor_break();
      init_model20();
      init_ability_presentations();
      ABILITY_MODELS = Object.freeze([
        [PEA_RECOVERY_BOOST_FEATURE, PeaRecoveryBoostModel],
        [KIDNEY_CONTINUOUS_LEAP_FEATURE, KidneyLeapModel],
        [CHESTNUT_THORNS_FEATURE, ChestnutThornsModel],
        [PEANUT_DEATH_SPLIT_FEATURE, PeanutDeathSplitModel],
        [WALNUT_RAW_GUARD_FEATURE, WalnutRawGuardModel],
        [CORN_ATTACHMENT_FEATURE, CornAttachmentModel],
        [RICE_LOW_HEALTH_HARVEST_FEATURE, RiceCriticalModel],
        [WHEAT_COMMAND_CRIT_FEATURE, WheatCommandModel],
        [BARLEY_ARMOR_BREAK_FEATURE, BarleyArmorShredModel]
      ]);
      ABILITY_FEATURES = Object.freeze(
        SPECIES_ABILITY_DEFINITIONS.map(
          (definition, index) => Object.freeze({ definition, model: ABILITY_MODELS[index][1] })
        )
      );
      ABILITY_FEATURE_BY_ID = new Map(ABILITY_FEATURES.map((feature) => [feature.definition.id, feature]));
      ABILITY_PRESENTATION_BY_ID = new Map(
        ABILITY_FEATURES.map((feature) => [
          feature.definition.id,
          ABILITY_PRESENTATION_OVERRIDES.get(feature.definition.id)
        ])
      );
    }
  });

  // src/features/projectiles/damage-model.js
  var DamageProjectile;
  var init_damage_model = __esm({
    "src/features/projectiles/damage-model.js"() {
      init_model_base3();
      init_ability_catalog();
      DamageProjectile = class extends BallisticProjectile {
        constructor(feature, dependencies) {
          super(feature, dependencies);
          this.landingEffect = feature.landingEffect;
        }
        impact(world, projectile, target, hit) {
          if (hit) {
            Object.assign(projectile, { x: hit.x, y: hit.y, z: hit.z });
            const SOURCE = world._unitForId(projectile.owner), LIVE_OWNER = SOURCE?.generation === projectile.ownerGeneration ? SOURCE : null, IMPACT_UNIT = LIVE_OWNER || {
              id: projectile.owner,
              generation: projectile.ownerGeneration || 0,
              ownerId: projectile.ownerId || "",
              faction: projectile.faction,
              isFormationClone: !!projectile.isFormationClone,
              species: projectile.species,
              tier: projectile.tier,
              x: projectile.x,
              y: projectile.y,
              z: projectile.z
            };
            const ATTACK_CONTEXT = projectile.attackPayload ? {
              ...structuredClone(projectile.attackPayload),
              source: IMPACT_UNIT,
              criticalRoll: null,
              area: false,
              hitTargets: null
            } : null, DID_HIT = world.damageCombatTarget(IMPACT_UNIT, projectile, target, hit, {
              attackMultiplier: projectile.attackMultiplier,
              attackKind: projectile.projectileKind || "lob",
              attackContext: ATTACK_CONTEXT
            });
            if (DID_HIT && target.hp > 0 && projectile.abilityEffect?.abilityId) {
              abilityFeatureFor(projectile.abilityEffect.abilityId)?.model?.onProjectileHit?.(
                world,
                target,
                projectile,
                projectile.abilityEffect.config
              );
            }
            return;
          }
          if (projectile.elapsed >= projectile.path.duration) {
            projectile.z = 0;
            world.emit(this.landingEffect, projectile.x, projectile.y);
          }
        }
        isAlive(projectile) {
          return !projectile.hit && projectile.elapsed < projectile.path.duration;
        }
      };
    }
  });

  // src/features/projectiles/seed/model.js
  var SeedProjectile;
  var init_model21 = __esm({
    "src/features/projectiles/seed/model.js"() {
      init_damage_model();
      init_definition10();
      SeedProjectile = class extends DamageProjectile {
        constructor(dependencies) {
          super(FEATURE, dependencies);
        }
      };
    }
  });

  // src/features/projectiles/spike/definition.js
  var FEATURE6;
  var init_definition19 = __esm({
    "src/features/projectiles/spike/definition.js"() {
      FEATURE6 = Object.freeze({ id: "spike", landingEffect: "spike-land" });
    }
  });

  // src/features/projectiles/spike/model.js
  var SpikeProjectile;
  var init_model22 = __esm({
    "src/features/projectiles/spike/model.js"() {
      init_damage_model();
      init_definition19();
      SpikeProjectile = class extends DamageProjectile {
        constructor(dependencies) {
          super(FEATURE6, dependencies);
        }
      };
    }
  });

  // src/features/projectiles/definition.js
  function projectileFeature(projectile) {
    return projectileFlightFeature(projectile);
  }
  function projectileFlightFeature(projectile) {
    return projectile.projectileKind === "chestnut-spike" ? FEATURE6 : FEATURE;
  }
  var init_definition20 = __esm({
    "src/features/projectiles/definition.js"() {
      init_definition10();
      init_definition19();
    }
  });

  // src/projectile-behaviors.js
  function createProjectileBehaviors(dependencies) {
    const BEHAVIORS = Object.freeze(
      Object.fromEntries(
        [new SeedProjectile(dependencies), new SpikeProjectile(dependencies)].map((behavior) => [
          behavior.feature.id,
          Object.freeze(behavior)
        ])
      )
    );
    return Object.freeze({
      forProjectile(projectile) {
        return BEHAVIORS[projectileFeature(projectile).id];
      }
    });
  }
  var init_projectile_behaviors = __esm({
    "src/projectile-behaviors.js"() {
      init_model21();
      init_model22();
      init_definition20();
    }
  });

  // src/features/scenes/farm/boss-event-phases.js
  function createFarmBossEventPhases(config) {
    class FarmBossEventPhase {
      update(_world, _dt) {
        return false;
      }
    }
    class DroppingFarmBossEventPhase extends FarmBossEventPhase {
      update(world, dt) {
        world.farmBossEvent.elapsed += dt;
        world.boss.z = Math.max(
          0,
          config.raid.dropHeight - 0.5 * config.physics.gravity * world.farmBossEvent.elapsed * world.farmBossEvent.elapsed
        );
        if (world.boss.z === 0) {
          world.farmBossEvent.phase = "fighting";
          world.farmBossEvent.elapsed = 0;
          world.combat("farm-boss-land", {
            x: world.boss.x,
            y: world.boss.y,
            z: 0
          });
        }
        return true;
      }
    }
    class FightingFarmBossEventPhase extends FarmBossEventPhase {
      update(world, dt) {
        world.farmBossEvent.elapsed += dt;
        if (world.boss.hp <= 0) {
          world.finishFarmBossEvent("victory");
          return true;
        }
        if (!world.units.some((u) => hasFaction(u, FACTION_CONFIG.PLAYER) && u.hp > 0 && u.dropLanded)) {
          world.finishFarmBossEvent("defeat");
          return true;
        }
        return false;
      }
    }
    class CelebratingFarmBossEventPhase extends FarmBossEventPhase {
      update(world, dt) {
        world.farmBossEvent.elapsed += dt;
        const DURATION3 = world.farmBossEvent.outcome === "defeat" ? config.farm.bossEvent.celebrationSeconds : config.farm.bossEvent.fadeSeconds;
        if (world.farmBossEvent.elapsed >= DURATION3) {
          world.farmBossEvent.phase = "fading";
          world.farmBossEvent.elapsed = 0;
        }
        return true;
      }
    }
    class FadingFarmBossEventPhase extends FarmBossEventPhase {
      update(world, dt) {
        world.farmBossEvent.elapsed += dt;
        if (world.farmBossEvent.elapsed >= config.farm.bossEvent.fadeSeconds) {
          world.farmBossEvent = {
            phase: "idle",
            elapsed: 0,
            outcome: "idle",
            encounterId: 0,
            rewardStatus: "none",
            rewardChance: 0,
            rewardRoll: 0,
            rewardUnitId: 0
          };
          world.boss = world.createBoss();
        }
        return true;
      }
    }
    return Object.freeze({
      idle: Object.freeze(new FarmBossEventPhase()),
      dropping: Object.freeze(new DroppingFarmBossEventPhase()),
      fighting: Object.freeze(new FightingFarmBossEventPhase()),
      celebrating: Object.freeze(new CelebratingFarmBossEventPhase()),
      fading: Object.freeze(new FadingFarmBossEventPhase())
    });
  }
  var init_boss_event_phases = __esm({
    "src/features/scenes/farm/boss-event-phases.js"() {
      init_factions();
    }
  });

  // src/features/farm-modes/model-base.js
  var FarmMode;
  var init_model_base4 = __esm({
    "src/features/farm-modes/model-base.js"() {
      init_unit_stats();
      FarmMode = class {
        constructor(feature, config) {
          this.feature = feature;
          this.config = config;
        }
        wander(world, unit, dt) {
          world.steer(
            unit,
            Math.sin(world.time * 0.18 + unit.seed) * (this.config.farm.arena.radiusX * 0.78),
            Math.cos(world.time * 0.16 + unit.seed) * (this.config.farm.arena.radiusY * 0.78),
            dt,
            scaleMoveSpeed(0.75, unit)
          );
        }
        update(world, unit, dt) {
          if (unit.stun > 0 || unit.z > 0.1) {
            return;
          }
          if (!unit.mature || unit.cooldown > 0) {
            if (!world.avoidNearbyFood(unit, dt)) {
              this.wander(world, unit, dt);
            }
            return;
          }
          this.updateReady(world, unit, dt);
        }
      };
    }
  });

  // src/features/farm-modes/breed/definition.js
  var FEATURE7;
  var init_definition21 = __esm({
    "src/features/farm-modes/breed/definition.js"() {
      FEATURE7 = Object.freeze({ id: "breed" });
    }
  });

  // src/features/farm-modes/breed/model.js
  var BreedFarmMode;
  var init_model23 = __esm({
    "src/features/farm-modes/breed/model.js"() {
      init_model_base4();
      init_definition21();
      init_unit_stats();
      init_farm_upgrades();
      BreedFarmMode = class extends FarmMode {
        constructor(config) {
          super(FEATURE7, config);
        }
        updateReady(world, u, dt) {
          let target = null;
          if (!u.fed) {
            target = world.requestGroundFoodTarget(u);
            if (target && world.canFarmPopulationAdvance(u.species) && Math.hypot(target.x - u.x, target.y - u.y) < 0.42 && world.consumeGroundFood(target)) {
              world.clearFoodTargetSearch(u);
              u.meals = 1;
              world.markProgressChanged();
              u.vz = 2;
              world.emit("eat", u.x, u.y, 0.5);
              target = null;
            }
          } else if (u.cooldown === 0) {
            target = world.findOrReserveMate(u);
          }
          const HAS_DESIGNATED_MATE = u.fed && target && world.units.includes(target);
          if (u.fed && !HAS_DESIGNATED_MATE && world.avoidNearbyFood(u, dt)) {
            return;
          }
          if (!target) {
            this.wander(world, u, dt);
            return;
          }
          world.steer(
            u,
            target.x,
            target.y,
            dt,
            scaleMoveSpeed(
              2.2 * (target.phase === "grounded" ? farmUpgradeRate(world.playerProgression?.farmUpgrades, "growth") : 1),
              u
            )
          );
        }
        resolveContacts(world, units) {
          world.resolveFarmContactPairs(units, true);
          if (!world.hasEligibleSameTierBreedPair()) {
            world.resolveFarmContactPairs(units, false);
          }
          world.resolveMergeTaskAfterMovement();
        }
        pair(world, a, b, priorityResolved) {
          if (!a || !b || a === b || a.hp <= 0 || b.hp <= 0 || a.down > 0 || b.down > 0 || a.species !== b.species || !a.mature || !b.mature || a.cooldown > 0 || b.cooldown > 0 || !world.units.includes(a) || !world.units.includes(b) || Math.hypot(a.x - b.x, a.y - b.y) > a.radius + b.radius + 0.2 || world.senseEnemy(a) || world.senseEnemy(b)) {
            return false;
          }
          if (a.isBattleOnlySummon || b.isBattleOnlySummon) {
            return false;
          }
          const OWNER = world.breedingReservationOwner(a, b);
          if (!world.canBreedPair(a, b, true) || world.ownedPopulation >= world.totalFarmCapacity || a.mateId && a.mateId !== b.id || b.mateId && b.mateId !== a.id || !priorityResolved && a.tier !== b.tier && world.hasEligibleSameTierBreedPair() || !world.reserveActiveBreedPair(a, b)) {
            return false;
          }
          {
            a.mateId = b.id;
            b.mateId = a.id;
            const CHILD = world.spawn(a.species, 1, (a.x + b.x) / 2, (a.y + b.y) / 2, {
              birthReservationOwner: OWNER
            });
            if (!CHILD) {
              world.releaseMate(a);
              return false;
            }
            CHILD.growthDuration = world.breedGrowthDuration();
            CHILD.vz = 3;
            a.meals = b.meals = 0;
            a.cooldown = b.cooldown = world.breedCooldownDuration();
            a.cooldownDuration = b.cooldownDuration = a.cooldown;
            a.cooldownSetAtTick = b.cooldownSetAtTick = world.simulationTick;
            world.releaseMate(a);
            world.metrics.births++;
            world.emit("birth", CHILD.x, CHILD.y, 0.7);
          }
          return true;
        }
      };
    }
  });

  // src/farm-mode-behaviors.js
  function createFarmModeBehaviors(config) {
    return Object.freeze({ breed: Object.freeze(new BreedFarmMode(config)) });
  }
  var init_farm_mode_behaviors = __esm({
    "src/farm-mode-behaviors.js"() {
      init_model23();
    }
  });

  // src/features/boss-patterns/model-base.js
  var BossPattern;
  var init_model_base5 = __esm({
    "src/features/boss-patterns/model-base.js"() {
      BossPattern = class {
        constructor(feature, dependencies) {
          this.feature = feature;
          this.id = feature.id;
          this.config = feature.config;
          this.dependencies = dependencies;
          this.physicalActive = false;
        }
        target(world, living) {
          return world.nearestBossTarget(living, true);
        }
        selectedTarget(_world, targets, _fallback) {
          return targets.nearest;
        }
        eligible(world, targets, _aliveAdds) {
          const TARGET = this.selectedTarget(world, targets);
          return !!TARGET && Math.hypot(TARGET.x - world.boss.x, TARGET.y - world.boss.y) <= this.config.reach + TARGET.radius + 1e-9;
        }
        selected(_world) {
        }
        activate(_world, _action) {
        }
        updateActive(_world, _action, _dt) {
        }
        get hitMetric() {
          return "basicHits";
        }
        sweepNormal(_boss) {
          return null;
        }
        weaponPoint(boss, q) {
          const { CONFIG: CONFIG2, CLAMP: CLAMP3 } = this.dependencies;
          const REACH = boss.radius - 0.25 + (CONFIG2.boss.sweepReach - boss.radius + 0.25) * Math.sin(Math.PI * CLAMP3(q, 0, 1));
          return { x: boss.x + Math.cos(boss.angle) * REACH, y: boss.y + Math.sin(boss.angle) * REACH, z: boss.z + 0.2 };
        }
      };
    }
  });

  // src/features/boss-patterns/sweep-360/definition.js
  var FEATURE8;
  var init_definition22 = __esm({
    "src/features/boss-patterns/sweep-360/definition.js"() {
      init_boss_patterns();
      FEATURE8 = Object.freeze({ id: "attack.sweep-360", config: BOSS_PATTERN_CONFIG["attack.sweep-360"] });
    }
  });

  // src/features/boss-patterns/sweep-360/model.js
  var TAU, SweepBossPattern;
  var init_model24 = __esm({
    "src/features/boss-patterns/sweep-360/model.js"() {
      init_model_base5();
      init_definition22();
      TAU = Math.PI * 2;
      SweepBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE8, dependencies);
          this.physicalActive = true;
        }
        writeArea(_boss, action, _scene, pad, area) {
          area.kind = "sweep";
          area.reach = this.config.reach;
          area.width = this.config.width + pad;
          area.angle = action.startAngle ?? action.aim - Math.PI / 2;
        }
        activate(_world, action) {
          action.startAngle = action.aim - Math.PI / 2;
        }
        updateActive(world, action, dt) {
          const Q0 = Math.max(0, (action.phaseElapsed - dt) / this.config.active), Q1 = Math.min(1, action.phaseElapsed / this.config.active);
          world.sweepBossWeapon(action, Q0, Q1);
          if (action.phaseElapsed >= this.config.active - 1e-9) {
            world.enterBossPatternRecovery(action);
          }
        }
        weaponPoint(boss, q) {
          const { CLAMP: CLAMP3 } = this.dependencies, ACTION = boss.patternRuntime?.active, AIM = ACTION?.aim ?? boss.patternAim ?? boss.angle, START_ANGLE = ACTION?.startAngle ?? AIM - Math.PI / 2, ANGLE = START_ANGLE + TAU * CLAMP3(q, 0, 1);
          return {
            x: boss.x + Math.cos(ANGLE) * this.config.reach,
            y: boss.y + Math.sin(ANGLE) * this.config.reach,
            z: (boss.z || 0) + 0.2
          };
        }
        get hitMetric() {
          return "sweepHits";
        }
      };
    }
  });

  // src/features/boss-patterns/front-slam/definition.js
  var FEATURE9;
  var init_definition23 = __esm({
    "src/features/boss-patterns/front-slam/definition.js"() {
      init_boss_patterns();
      FEATURE9 = Object.freeze({ id: "attack.front-slam", config: BOSS_PATTERN_CONFIG["attack.front-slam"] });
    }
  });

  // src/features/boss-patterns/front-slam/model.js
  var SlamBossPattern;
  var init_model25 = __esm({
    "src/features/boss-patterns/front-slam/model.js"() {
      init_model_base5();
      init_definition23();
      SlamBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE9, dependencies);
        }
        writeArea(_boss, _action, _scene, pad, area) {
          area.kind = "sector";
          area.reach = this.config.reach + pad;
          area.sector = this.config.sector;
        }
        activate(world, action) {
          world.resolveBossSector(action, action.id, this.config.reach, this.config.sector);
          world.enterBossPatternRecovery(action);
          return;
        }
      };
    }
  });

  // src/features/boss-patterns/charge/definition.js
  var FEATURE10;
  var init_definition24 = __esm({
    "src/features/boss-patterns/charge/definition.js"() {
      init_boss_patterns();
      FEATURE10 = Object.freeze({ id: "attack.charge", config: BOSS_PATTERN_CONFIG["attack.charge"] });
    }
  });

  // src/features/boss-patterns/charge/model.js
  var ChargeBossPattern;
  var init_model26 = __esm({
    "src/features/boss-patterns/charge/model.js"() {
      init_model_base5();
      init_definition24();
      ChargeBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE10, dependencies);
          this.physicalActive = true;
        }
        writeArea(boss, action, scene, pad, area) {
          const { CONFIG: CONFIG2 } = this.dependencies;
          area.kind = "charge";
          area.width = boss.radius + pad;
          const SX = action.start?.x ?? boss.x, SY = action.start?.y ?? boss.y, DX = Math.cos(area.angle), DY = Math.sin(area.angle);
          const RX = CONFIG2[scene].arena.radiusX - boss.radius - 0.25, RY = CONFIG2[scene].arena.radiusY - boss.radius - 0.25;
          const A_LOCAL = DX * DX / (RX * RX) + DY * DY / (RY * RY), B_LOCAL = 2 * (SX * DX / (RX * RX) + SY * DY / (RY * RY)), C_LOCAL = SX * SX / (RX * RX) + SY * SY / (RY * RY) - 1;
          const EXIT = Math.max(
            0,
            (-B_LOCAL + Math.sqrt(Math.max(0, B_LOCAL * B_LOCAL - 4 * A_LOCAL * C_LOCAL))) / (2 * A_LOCAL)
          );
          const DISTANCE = Math.min(this.config.reach, EXIT);
          const EX = SX + DX * DISTANCE, EY = SY + DY * DISTANCE, K = Math.max(1, Math.hypot(EX / RX, EY / RY));
          area.endX = action.phase === "recover" ? boss.x : EX / K;
          area.endY = action.phase === "recover" ? boss.y : EY / K;
          area.x = SX;
          area.y = SY;
        }
        activate(world, action) {
          action.start = {
            x: world.boss.x,
            y: world.boss.y,
            z: world.boss.z
          };
          action.traveled = 0;
          return;
        }
        updateActive(world, action, dt) {
          const { ARENA_GEOMETRY: ARENA_GEOMETRY2 } = this.dependencies;
          const DIRECTION = {
            x: Math.cos(action.aim),
            y: Math.sin(action.aim)
          }, REMAINING = Math.max(0, this.config.reach - action.traveled), DISTANCE = Math.min(this.config.speed * dt, REMAINING), OLD = {
            x: world.boss.x,
            y: world.boss.y,
            z: world.boss.z
          }, CANDIDATE = {
            x: world.boss.x + DIRECTION.x * DISTANCE,
            y: world.boss.y + DIRECTION.y * DISTANCE
          }, BOUNDED = ARENA_GEOMETRY2.clamp(CANDIDATE, world.scene, world.boss.radius + 0.25), HIT_BOUNDARY = Math.hypot(CANDIDATE.x - BOUNDED.x, CANDIDATE.y - BOUNDED.y) > 1e-8;
          world.boss.x = BOUNDED.x;
          world.boss.y = BOUNDED.y;
          const MOVED = Math.hypot(world.boss.x - OLD.x, world.boss.y - OLD.y);
          action.traveled += MOVED;
          world.boss.travel += MOVED;
          world.sweepBossBody(OLD, action.id);
          if (HIT_BOUNDARY || action.traveled >= this.config.reach - 1e-8 || MOVED < 1e-8) {
            world.enterBossPatternRecovery(action);
          }
        }
        target(world, living) {
          return world.chargeBossTarget(living);
        }
        selectedTarget(_world, targets, _fallback) {
          return targets.charge;
        }
        eligible(world, targets, _aliveAdds) {
          return !!this.selectedTarget(world, targets);
        }
        sweepNormal(boss) {
          return { x: Math.cos(boss.patternRuntime.active.aim), y: Math.sin(boss.patternRuntime.active.aim) };
        }
      };
    }
  });

  // src/features/boss-patterns/leap-slam/definition.js
  var FEATURE11;
  var init_definition25 = __esm({
    "src/features/boss-patterns/leap-slam/definition.js"() {
      init_boss_patterns();
      FEATURE11 = Object.freeze({ id: "attack.leap-slam", config: BOSS_PATTERN_CONFIG["attack.leap-slam"] });
    }
  });

  // src/features/boss-patterns/leap-slam/model.js
  var LeapBossPattern;
  var init_model27 = __esm({
    "src/features/boss-patterns/leap-slam/model.js"() {
      init_model_base5();
      init_definition25();
      LeapBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE11, dependencies);
          this.physicalActive = true;
        }
        writeArea(boss, action, scene, pad, area) {
          const { CONFIG: CONFIG2, CLAMP: CLAMP3 } = this.dependencies;
          area.kind = "leap";
          area.width = boss.radius + pad;
          area.reach = this.config.landingRadius + pad;
          let x = action.target?.x ?? boss.x;
          let y = action.target?.y ?? boss.y;
          if (action.phase === "windup") {
            const DX = x - boss.x, DY = y - boss.y, D_LOCAL = Math.hypot(DX, DY);
            if (D_LOCAL > this.config.reach) {
              x = boss.x + DX / D_LOCAL * this.config.reach;
              y = boss.y + DY / D_LOCAL * this.config.reach;
            }
            const RX = CONFIG2[scene].arena.radiusX - boss.radius - 0.25, RY = CONFIG2[scene].arena.radiusY - boss.radius - 0.25, K = Math.max(1, Math.hypot(x / RX, y / RY));
            x /= K;
            y /= K;
          }
          area.targetX = x;
          area.targetY = y;
          const SX = action.start?.x ?? boss.x, SY = action.start?.y ?? boss.y;
          area.x = SX;
          area.y = SY;
          if (action.phase === "active" && action.path) {
            area.progress = CLAMP3(Math.max(0, action.phaseElapsed || 0) / action.path.duration, 0, 1);
          }
        }
        activate(world, action) {
          const { ARENA_GEOMETRY: ARENA_GEOMETRY2, BALLISTICS: BALLISTICS2 } = this.dependencies;
          let x = action.target?.x ?? world.boss.x;
          let y = action.target?.y ?? world.boss.y;
          const DX = x - world.boss.x;
          const DY = y - world.boss.y;
          const D_LOCAL = Math.hypot(DX, DY);
          if (D_LOCAL > this.config.reach) {
            x = world.boss.x + DX / D_LOCAL * this.config.reach;
            y = world.boss.y + DY / D_LOCAL * this.config.reach;
          }
          const LAND = ARENA_GEOMETRY2.clamp(
            {
              x,
              y
            },
            world.scene,
            world.boss.radius + 0.25
          );
          action.target = {
            x: LAND.x,
            y: LAND.y,
            z: 0
          };
          action.path = BALLISTICS2.create(
            {
              x: world.boss.x,
              y: world.boss.y,
              z: 0
            },
            action.target,
            "leap"
          );
          return;
        }
        updateActive(world, action, _dt) {
          const { CONFIG: CONFIG2, BALLISTICS: BALLISTICS2 } = this.dependencies;
          const OLD = {
            x: world.boss.x,
            y: world.boss.y,
            z: world.boss.z
          }, P = BALLISTICS2.sample(action.path, action.phaseElapsed / action.path.duration);
          world.boss.x = P.x;
          world.boss.y = P.y;
          world.boss.z = P.z;
          world.sweepBossBody(OLD, action.id);
          if (action.phaseElapsed >= action.path.duration) {
            world.boss.x = action.path.to.x;
            world.boss.y = action.path.to.y;
            world.boss.z = 0;
            const EXTENT = this.config.landingRadius + CONFIG2.unit.maxRadius;
            for (const UNIT_LOCAL of world._collectBossTargets(
              world.boss.x - EXTENT,
              world.boss.y - EXTENT,
              world.boss.x + EXTENT,
              world.boss.y + EXTENT,
              world._bossHitCandidates,
              true
            )) {
              if (action.hitIds.has(UNIT_LOCAL.id)) {
                continue;
              }
              const DX = UNIT_LOCAL.x - world.boss.x, DY = UNIT_LOCAL.y - world.boss.y, D_LOCAL = Math.hypot(DX, DY);
              if (D_LOCAL <= this.config.landingRadius + UNIT_LOCAL.radius) {
                world.hitBossPatternUnit(
                  UNIT_LOCAL,
                  action.id,
                  {
                    x: UNIT_LOCAL.x,
                    y: UNIT_LOCAL.y,
                    z: 0
                  },
                  {
                    x: DX / (D_LOCAL || 1),
                    y: DY / (D_LOCAL || 1)
                  }
                );
              }
            }
            world.combat("boss-pattern-land", {
              patternId: action.id,
              attackId: world.boss.attackId,
              x: world.boss.x,
              y: world.boss.y,
              z: 0
            });
            world.enterBossPatternRecovery(action);
          }
        }
        target(world, living) {
          return world.leapBossTarget(living);
        }
        selectedTarget(_world, targets, _fallback) {
          return targets.leap;
        }
        eligible(world, targets, _aliveAdds) {
          return !!this.selectedTarget(world, targets);
        }
      };
    }
  });

  // src/features/boss-patterns/fan-sweep/definition.js
  var FEATURE12;
  var init_definition26 = __esm({
    "src/features/boss-patterns/fan-sweep/definition.js"() {
      init_boss_patterns();
      FEATURE12 = Object.freeze({ id: "attack.fan-sweep", config: BOSS_PATTERN_CONFIG["attack.fan-sweep"] });
    }
  });

  // src/features/boss-patterns/fan-sweep/model.js
  var FanBossPattern;
  var init_model28 = __esm({
    "src/features/boss-patterns/fan-sweep/model.js"() {
      init_model_base5();
      init_definition26();
      FanBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE12, dependencies);
          this.physicalActive = true;
        }
        writeArea(_boss, _action, _scene, pad, area) {
          area.kind = "fan";
          area.reach = this.config.reach;
          area.width = this.config.width + pad;
          area.sector = this.config.sector;
        }
        updateActive(world, action, dt) {
          const Q0 = Math.max(0, (action.phaseElapsed - dt) / this.config.active), Q1 = Math.min(1, action.phaseElapsed / this.config.active);
          world.fanBossWeapon(action, Q0, Q1);
          if (action.phaseElapsed >= this.config.active) {
            world.enterBossPatternRecovery(action);
          }
        }
        get hitMetric() {
          return "sweepHits";
        }
        weaponPoint(boss, q) {
          const { CLAMP: CLAMP3 } = this.dependencies;
          const ACTION = boss.patternRuntime.active;
          const ANGLE = ACTION.aim - this.config.sector / 2 + this.config.sector * CLAMP3(q, 0, 1);
          return {
            x: boss.x + Math.cos(ANGLE) * this.config.reach,
            y: boss.y + Math.sin(ANGLE) * this.config.reach,
            z: boss.z + 0.2
          };
        }
      };
    }
  });

  // src/features/boss-patterns/mouth-summon/definition.js
  var FEATURE13;
  var init_definition27 = __esm({
    "src/features/boss-patterns/mouth-summon/definition.js"() {
      init_boss_patterns();
      FEATURE13 = Object.freeze({ id: "summon.mouth-t1", config: BOSS_PATTERN_CONFIG["summon.mouth-t1"] });
    }
  });

  // src/features/boss-patterns/mouth-summon/model.js
  var MouthSummonBossPattern;
  var init_model29 = __esm({
    "src/features/boss-patterns/mouth-summon/model.js"() {
      init_model_base5();
      init_definition27();
      init_factions();
      MouthSummonBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE13, dependencies);
        }
        writeArea(_boss, _action, _scene, _pad, area) {
          area.kind = "summon";
        }
        activate(world, action) {
          const { CONFIG: CONFIG2 } = this.dependencies;
          world.boss.patternRuntime.cooldowns[action.id] = this.config.cooldown;
          const ALIVE = world.units.reduce((n, u) => n + (hasFaction(u, FACTION_CONFIG.ENEMY) && u.hp > 0 ? 1 : 0), 0);
          action.volleyCount = Math.min(this.config.volleyCount, Math.max(0, CONFIG2.boss.maxSummons - ALIVE));
          action.nextRelease = 0;
          world.spawnBossMouthUnit(action);
          action.nextRelease = this.config.releaseInterval;
          return;
        }
        updateActive(world, action, _dt) {
          while (action.released < action.volleyCount && action.phaseElapsed + 1e-9 >= action.nextRelease) {
            if (!world.spawnBossMouthUnit(action)) {
              break;
            }
            action.nextRelease += this.config.releaseInterval;
          }
          if (action.phaseElapsed >= this.config.active) {
            world.enterBossPatternRecovery(action);
          }
        }
        selectedTarget(_world, _targets, fallback) {
          return fallback;
        }
        eligible(world, _targets, aliveAdds) {
          const { CONFIG: CONFIG2 } = this.dependencies;
          return world.boss.patternRuntime.encounterElapsed + 1e-9 >= this.config.firstEligible && aliveAdds < CONFIG2.boss.maxSummons;
        }
        selected(world) {
          world.boss.patternRuntime.cooldowns[this.id] = this.config.cooldown;
        }
      };
    }
  });

  // src/boss-pattern-behaviors.js
  function createBossPatternBehaviors(dependencies) {
    const { CONFIG: CONFIG2, ArenaGeometry: ARENA_GEOMETRY2, Ballistics: BALLISTICS2, clamp: CLAMP3 } = dependencies;
    const DEPENDENCIES = Object.freeze({ CONFIG: CONFIG2, ARENA_GEOMETRY: ARENA_GEOMETRY2, BALLISTICS: BALLISTICS2, CLAMP: CLAMP3 });
    const PATTERNS = Object.freeze(
      Object.fromEntries(
        [
          new SweepBossPattern(DEPENDENCIES),
          new SlamBossPattern(DEPENDENCIES),
          new ChargeBossPattern(DEPENDENCIES),
          new LeapBossPattern(DEPENDENCIES),
          new FanBossPattern(DEPENDENCIES),
          new MouthSummonBossPattern(DEPENDENCIES)
        ].map((pattern) => [pattern.feature.id, Object.freeze(pattern)])
      )
    );
    const DEFAULT_PATTERN = Object.freeze(new BossPattern({ id: "", config: null }, DEPENDENCIES));
    class BossPatternPhase {
      update(_world, _action, _dt, _living) {
      }
    }
    class WindupBossPatternPhase extends BossPatternPhase {
      update(world, action, dt, living) {
        const CONFIG_LOCAL = BOSS_PATTERN_CONFIG[action.id], REMAINING = CONFIG_LOCAL.windup - action.phaseElapsed;
        if (!action.locked) {
          const TARGET = world.bossTargetForPattern(action.id, living);
          if (TARGET) {
            action.targetId = TARGET.id;
            action.target = {
              x: TARGET.x,
              y: TARGET.y,
              z: TARGET.z || 0
            };
            const DESIRED = Math.atan2(TARGET.y - world.boss.y, TARGET.x - world.boss.x), DELTA = Math.atan2(Math.sin(DESIRED - action.aim), Math.cos(DESIRED - action.aim));
            action.aim += CLAMP3(DELTA, -BOSS_AIM_TURN_RATE * dt, BOSS_AIM_TURN_RATE * dt);
            world.boss.angle = world.boss.facing = action.aim;
          }
          if (REMAINING <= 0.25 + 1e-9) {
            action.locked = true;
            world.combat("boss-pattern-lock", {
              patternId: action.id,
              attackId: world.boss.attackId + 1,
              targetId: action.targetId || 0,
              x: action.target?.x ?? world.boss.x,
              y: action.target?.y ?? world.boss.y,
              angle: action.aim
            });
          }
        }
        if (action.phaseElapsed >= CONFIG_LOCAL.windup - 1e-9) {
          action.motionDelay = Math.max(0, dt + REMAINING);
          world.activateBossPattern(action);
        }
        return;
      }
    }
    class ActiveBossPatternPhase extends BossPatternPhase {
      update(world, action, dt, _living) {
        PATTERNS[action.id].updateActive(world, action, dt);
      }
    }
    class RecoverBossPatternPhase extends BossPatternPhase {
      update(world, action, _dt, _living) {
        if (action.phaseElapsed >= BOSS_PATTERN_CONFIG[action.id].recover) {
          world.boss.patternRuntime.active = null;
        }
      }
    }
    const PHASES = Object.freeze({
      windup: new WindupBossPatternPhase(),
      active: new ActiveBossPatternPhase(),
      recover: new RecoverBossPatternPhase()
    });
    const UNKNOWN_PHASE = new BossPatternPhase();
    return Object.freeze({
      weaponPoint(boss, q) {
        return (PATTERNS[boss.patternRuntime?.active?.id] || DEFAULT_PATTERN).weaponPoint(boss, q);
      },
      forId(id) {
        return PATTERNS[id];
      },
      update(world, action, dt, living) {
        (PHASES[action.phase] || UNKNOWN_PHASE).update(world, action, dt, living);
      }
    });
  }
  var init_boss_pattern_behaviors = __esm({
    "src/boss-pattern-behaviors.js"() {
      init_model_base5();
      init_model24();
      init_model25();
      init_model26();
      init_model27();
      init_model28();
      init_model29();
      init_boss_patterns();
    }
  });

  // src/boss-vector-sockets.js
  function bindBossSocketAsset(species, record) {
    const LABEL = `species ${species}, ${record.compiled.sourcePath || record.compiled.metadata.id}`;
    const ANCHORS = (0, import_vector_sockets2.readVectorSockets)(record.compiled, LABEL);
    BOSS_ASSETS.get(species)?.player?.dispose();
    BOSS_ASSETS.set(species, {
      record,
      anchors: ANCHORS,
      player: null
    });
    return ANCHORS;
  }
  function unbindBossSocketAsset(species, record) {
    const ENTRY = BOSS_ASSETS.get(species);
    if (ENTRY?.record !== record) {
      return;
    }
    ENTRY.player?.dispose();
    BOSS_ASSETS.delete(species);
  }
  function bossSummonPose(b, parts = /* @__PURE__ */ new Set()) {
    const CONFIG2 = BOSS_PATTERN_CONFIG["summon.mouth-t1"], PHASE = b.patternPhase, ELAPSED = Math.max(0, b.patternPhaseElapsed || 0);
    const AIM = Math.atan2(
      -import_vector_sockets2.WORLD_DEPTH_PROJECTION * Math.sin(b.patternAim ?? b.angle),
      Math.cos(b.patternAim ?? b.angle)
    );
    const BODY2 = {
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1
    }, ARMS = {
      "arm-left": 0,
      "arm-right": 0
    };
    let releasePulse = 0;
    if (PHASE === "windup") {
      const WIND = CLAMP(ELAPSED / CONFIG2.windup, 0, 1), EASE = WIND * WIND * (3 - 2 * WIND);
      BODY2.y = 2 * EASE;
      BODY2.scaleX = 1 + 0.025 * EASE;
      BODY2.scaleY = 1 - 0.035 * EASE;
      ARMS["arm-left"] = -0.34 * EASE;
      ARMS["arm-right"] = 0.34 * EASE;
    } else if (PHASE === "active" || PHASE === "recover") {
      const LAST = (b.patternReleased || 0) - 1, AGE = LAST < 0 ? 1 : PHASE === "active" ? Math.max(0, ELAPSED - LAST * CONFIG2.releaseInterval) : ELAPSED;
      releasePulse = CLAMP(1 - AGE / 0.16, 0, 1);
      BODY2.scaleX = 1 + 0.025 * releasePulse;
      BODY2.scaleY = 1 - 0.018 * releasePulse;
      BODY2.rotation = AIM * 0.02;
      ARMS["arm-left"] = -0.3;
      ARMS["arm-right"] = 0.3;
    }
    const EXTRAS = {};
    for (const PART of ["foot-left", "foot-right", "leaf", "kernel-mark", "hilum"]) {
      if (parts.has(PART)) {
        EXTRAS[PART] = {
          x: 0,
          y: 0,
          rotation: PART === "leaf" ? 0.08 * releasePulse : 0
        };
      }
    }
    return {
      body: BODY2,
      arms: ARMS,
      extras: EXTRAS,
      impact: false,
      releasePulse
    };
  }
  function sampleBossSummon(player, metadata, b) {
    const NAME = b.patternPhase === "windup" ? "windup" : b.patternPhase === "recover" ? "recover" : "fire";
    const CLIP_NAME = metadata.clips[NAME] ? NAME : "idle", CLIP = metadata.clips[CLIP_NAME];
    if (!CLIP) {
      throw new Error(`Vector socket contract (${metadata.id}): summon clip ${NAME} or idle is required`);
    }
    player.play(CLIP_NAME, 0);
    player.seek(Math.min(CLIP.durationMs, Math.max(0, b.patternPhaseElapsed || 0) * 1e3));
    const POSE = bossSummonPose(b);
    player.setBasePose("body", POSE.body);
    return POSE;
  }
  function bossMouthWorldPoint(boss, released) {
    const ENTRY = BOSS_ASSETS.get(boss.species);
    if (!ENTRY) {
      throw new Error(`Vector socket contract (species ${boss.species}): startup boss asset binding is missing`);
    }
    const { record: RECORD, anchors: ANCHORS } = ENTRY, ACTION = boss.patternRuntime?.active;
    if (ACTION?.id !== "summon.mouth-t1") {
      throw new Error(
        `Vector socket contract (species ${boss.species}): mouth spawn requires the active summon pattern`
      );
    }
    ENTRY.player ||= RECORD.asset.createPlayer({
      clip: "idle",
      startedAtMs: 0
    });
    sampleBossSummon(ENTRY.player, RECORD.compiled.metadata, {
      angle: boss.angle,
      patternAim: ACTION.aim,
      patternPhase: ACTION.phase,
      patternPhaseElapsed: ACTION.phaseElapsed,
      patternReleased: released ?? ACTION.released
    });
    return (0, import_vector_sockets2.socketWorldPoint)(boss, ENTRY.player.getSocket("mouth"), ANCHORS.ground);
  }
  var import_vector_sockets2, CLAMP, BOSS_ASSETS;
  var init_boss_vector_sockets = __esm({
    "src/boss-vector-sockets.js"() {
      init_boss_patterns();
      import_vector_sockets2 = __toESM(require_vector_sockets(), 1);
      CLAMP = (x, a, b) => Math.max(a, Math.min(b, x));
      BOSS_ASSETS = /* @__PURE__ */ new Map();
    }
  });

  // src/boss-rewards.js
  function requireSdk() {
    const SDK = globalThis.BloomGamekitDeterministic;
    if (!SDK?.SeededPRNG || !SDK?.PseudoRandomDistribution) {
      throw new Error("GameKit 0.12.2 deterministic PRD API is required");
    }
    return SDK;
  }
  function mixedSeed(seed, domain) {
    let value = (seed ^ domain) >>> 0;
    value = Math.imul(value ^ value >>> 16, 2146121005);
    value = Math.imul(value ^ value >>> 15, 2221713035);
    return (value ^ value >>> 16) >>> 0;
  }
  function streamFor(source, firstClear = false) {
    return source === "raid" && firstClear ? "firstClear" : STREAM_SOURCE[source];
  }
  function streamSeed(seed, kind, field) {
    const DOMAIN = STREAM_DOMAINS[kind]?.[field];
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 4294967295 || DOMAIN === void 0) {
      throw new RangeError("Invalid boss reward stream seed");
    }
    return mixedSeed(seed, DOMAIN);
  }
  function createStream(seed, kind) {
    return {
      rngState: streamSeed(seed, kind, "prd"),
      distributionState: null,
      payoutRngState: streamSeed(seed, kind, "boxes")
    };
  }
  function createBossRewardStreams(seed) {
    return {
      normal: createStream(seed, "normal"),
      event: createStream(seed, "event"),
      firstClear: createStream(seed, "firstClear")
    };
  }
  function bossRewardBoxPayouts(total) {
    if (!Number.isSafeInteger(total) || total < 1) {
      throw new RangeError("Boss reward quantity must be a positive safe integer");
    }
    const BOX_COUNT = Math.min(total, BOSS_REWARD_SETTINGS.maxBoxCount), BASE = Math.floor(total / BOX_COUNT), EXTRA = total % BOX_COUNT;
    const PAYOUTS = Array.from({ length: BOX_COUNT }, (_, index) => BASE + (index < EXTRA ? 1 : 0));
    if (PAYOUTS.some((amount) => !Number.isSafeInteger(amount) || amount < 1)) {
      throw new RangeError("Boss reward box payout is outside the safe integer range");
    }
    return PAYOUTS;
  }
  function bossStageStats(stage) {
    if (!Number.isSafeInteger(stage) || stage < 1 || stage > BOSS_REWARD_SETTINGS.maxStage) {
      throw new RangeError(`Boss stage must be from 1 to ${BOSS_REWARD_SETTINGS.maxStage}`);
    }
    const EXPONENT = stage - 1, TOTAL = Math.floor(BOSS_REWARD_SETTINGS.stageRollMultiplier ** EXPONENT), PAYOUTS = bossRewardBoxPayouts(TOTAL);
    return {
      stage,
      hp: BOSS_REWARD_SETTINGS.stageHpBase * BOSS_REWARD_SETTINGS.stageHpMultiplier ** EXPONENT,
      attackPower: BOSS_REWARD_SETTINGS.stageAttackBase * BOSS_REWARD_SETTINGS.stageAttackMultiplier ** EXPONENT,
      xp: Math.round(BOSS_REWARD_SETTINGS.stageXpBase * BOSS_REWARD_SETTINGS.stageXpMultiplier ** EXPONENT),
      rollBudget: TOTAL,
      rolls: PAYOUTS.length,
      boxCount: PAYOUTS.length,
      boxPayouts: PAYOUTS,
      bonusRollChance: 0
    };
  }
  function bossRewardRollDescription(stage, { farmEvent = false, firstClear = false, acquisitionMultiplier = 1 } = {}) {
    const STATS2 = bossStageStats(stage), NOMINAL_CHANCE = bossAcquisitionChance({ farmEvent, firstClear, acquisitionMultiplier: 1 }) * 100, CHANCE = bossAcquisitionChance({ farmEvent, firstClear, acquisitionMultiplier }) * 100, PAYOUTS = STATS2.boxPayouts, MIN = Math.min(...PAYOUTS), MAX = Math.max(...PAYOUTS), RANGE = MIN === MAX ? FORMAT_COUNT.format(MIN) : `${FORMAT_COUNT.format(MIN)}–${FORMAT_COUNT.format(MAX)}`;
    return `${FORMAT_COUNT.format(STATS2.boxCount)}회 추첨 · 상자당 ${RANGE}마리 · ${firstClear ? "첫 클리어" : "재도전"} 기본 확률 ${FORMAT_PERCENT.format(NOMINAL_CHANCE)}% · 편성 반영 ${FORMAT_PERCENT.format(CHANCE)}%`;
  }
  function chooseBossSpecies(random, weights = BOSS_REWARD_SETTINGS.speciesWeights) {
    if (typeof random !== "function" || !Array.isArray(weights) || weights.length !== BOSS_REWARD_SETTINGS.speciesWeights.length || weights.some((weight) => !Number.isFinite(weight) || weight <= 0)) {
      throw new TypeError("Boss species weights and random source are required");
    }
    const TOTAL = weights.reduce((sum, weight) => sum + weight, 0);
    let remaining = random() * TOTAL;
    if (!Number.isFinite(remaining) || remaining < 0 || remaining >= TOTAL) {
      throw new RangeError("Boss species roll must be in [0, 1)");
    }
    for (let index = 0; index < weights.length; index += 1) {
      remaining -= weights[index];
      if (remaining < 0) {
        return index;
      }
    }
    return weights.length - 1;
  }
  function bossAcquisitionChance({ farmEvent = false, firstClear = false, acquisitionMultiplier = 1 } = {}) {
    if (!Number.isFinite(acquisitionMultiplier) || acquisitionMultiplier < 0 || acquisitionMultiplier > 2) {
      throw new RangeError("Boss acquisition multiplier must be in [0, 2]");
    }
    if (farmEvent) {
      return BOSS_REWARD_SETTINGS.acquisitionChance * BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier;
    }
    const BASE = firstClear ? BOSS_REWARD_SETTINGS.firstClearAcquisitionChance : BOSS_REWARD_SETTINGS.acquisitionChance;
    return Math.min(1, BASE * acquisitionMultiplier);
  }
  function ensureWorldRewardState(world) {
    world.bossRewardReceipts ||= [];
    world.bossRewardWatermarks ||= { farm: 0, raid: 0 };
    world.bossRewardStreams ||= createBossRewardStreams(world.seed >>> 0);
    world.bossRewardInventory ||= [];
    return world;
  }
  function shufflePayouts(payouts, seed) {
    const { SeededPRNG: SEEDED_PRNG2 } = requireSdk();
    const RNG = new SEEDED_PRNG2(seed);
    for (let index = payouts.length - 1; index > 0; index -= 1) {
      const OTHER = RNG.nextInt(index + 1);
      [payouts[index], payouts[OTHER]] = [payouts[OTHER], payouts[index]];
    }
    return { payouts, rngState: RNG.state };
  }
  function allocatePlacedRewards(world, species, tier, quantity) {
    let remaining = quantity;
    for (const RECEIPT of world.bossRewardReceipts) {
      if (remaining === 0 || RECEIPT.species !== species || RECEIPT.tier !== tier || !Number.isSafeInteger(RECEIPT.queuedCount) || RECEIPT.queuedCount <= 0) {
        continue;
      }
      const PLACED = Math.min(remaining, RECEIPT.queuedCount);
      RECEIPT.queuedCount -= PLACED;
      RECEIPT.placedCount += PLACED;
      RECEIPT.grantedCount = RECEIPT.placedCount;
      remaining -= PLACED;
    }
    if (remaining !== 0) {
      throw new Error("Boss reward queue and receipt counts diverged");
    }
  }
  function grantPendingBossAcquisitions(world) {
    return typeof world.mutateUnits === "function" ? world.mutateUnits(grantPendingBossAcquisitionsCommitted, world) : grantPendingBossAcquisitionsCommitted(world);
  }
  function grantPendingBossAcquisitionsCommitted(world) {
    ensureWorldRewardState(world);
    if (world.scene !== "farm" || !Array.isArray(world.units) || !world.bossRewardInventory.length) {
      return [];
    }
    const GRANTED = [];
    let capacity = Math.max(
      0,
      (Number.isSafeInteger(world.totalFarmCapacity) ? world.totalFarmCapacity : world.capacity) - (Number.isSafeInteger(world.ownedPopulation) ? world.ownedPopulation : world.units.length)
    );
    for (const GROUP of world.bossRewardInventory) {
      if (capacity <= 0) {
        break;
      }
      const COUNT = Math.min(capacity, GROUP.count);
      let placed = 0;
      while (placed < COUNT) {
        const INDEX = world.units.length, ANGLE = INDEX * 2.399963229728653 + (world.seed >>> 0) % 6283 / 1e3, RADIUS = Math.sqrt(INDEX + 0.5) * 0.35, UNIT3 = world.spawn(GROUP.species, GROUP.tier, Math.cos(ANGLE) * RADIUS, Math.sin(ANGLE) * RADIUS);
        if (!UNIT3) {
          break;
        }
        GRANTED.push(UNIT3);
        placed += 1;
      }
      if (placed > 0) {
        GROUP.count -= placed;
        capacity -= placed;
        allocatePlacedRewards(world, GROUP.species, GROUP.tier, placed);
      }
    }
    world.bossRewardInventory = world.bossRewardInventory.filter((entry) => entry.count > 0);
    if (GRANTED.length) {
      world.markProgressChanged?.();
    }
    return GRANTED;
  }
  function findExistingReceipt(world, receiptKey, encounterId, source) {
    return world.bossRewardReceipts.find(
      (receipt) => receiptKey && receipt.receiptKey === receiptKey || receipt.encounterId === encounterId && receipt.source === source
    );
  }
  function shuffleForNewReceipt(world, source, total, firstClear = false) {
    const KIND = streamFor(source, firstClear), STREAM = world.bossRewardStreams[KIND], PAYOUTS = bossRewardBoxPayouts(total), SHUFFLED = shufflePayouts(PAYOUTS, STREAM.payoutRngState);
    return {
      payouts: SHUFFLED.payouts,
      payoutRngStateAfter: SHUFFLED.rngState
    };
  }
  function resolveBossAcquisitionCommitted(world, options = {}) {
    ensureWorldRewardState(world);
    const ENCOUNTER_ID = options.encounterId, SOURCE = options.source || "raid", REQUESTED_KEY = options.receiptKey;
    if (!["farm", "raid"].includes(SOURCE) || !Number.isSafeInteger(ENCOUNTER_ID) || ENCOUNTER_ID < 1 || REQUESTED_KEY !== void 0 && (typeof REQUESTED_KEY !== "string" || !REQUESTED_KEY.trim() || REQUESTED_KEY.length > 255)) {
      throw new TypeError("A boss encounter ID, source, and valid receipt key are required");
    }
    const RECEIPT_KEY = REQUESTED_KEY || `${SOURCE}:${ENCOUNTER_ID}`, PREVIOUS = findExistingReceipt(world, REQUESTED_KEY, ENCOUNTER_ID, SOURCE);
    if (PREVIOUS) {
      return PREVIOUS;
    }
    if (ENCOUNTER_ID <= (world.bossRewardWatermarks[SOURCE] || 0)) {
      throw new RangeError("A settled or stale boss encounter cannot be rolled again");
    }
    const TOTAL = options.rollBudget ?? options.rollCount ?? 1;
    if (!Number.isSafeInteger(TOTAL) || TOTAL < 1 || TOTAL > BOSS_REWARD_SETTINGS.maxRollCount) {
      throw new RangeError("Boss reward quantity is outside the safe integer range");
    }
    const SPECIES = options.species ?? 3;
    if (!Number.isSafeInteger(SPECIES) || SPECIES < 0 || SPECIES >= BOSS_REWARD_SETTINGS.speciesWeights.length) {
      throw new RangeError("Boss reward species is invalid");
    }
    const FIRST_CLEAR = SOURCE === "raid" && options.firstClear === true, STREAM_KIND = streamFor(SOURCE, FIRST_CLEAR), STREAM = world.bossRewardStreams[STREAM_KIND], CHANCE = bossAcquisitionChance({
      farmEvent: SOURCE === "farm",
      firstClear: FIRST_CLEAR,
      acquisitionMultiplier: options.acquisitionMultiplier ?? 1
    }), SHUFFLED = shuffleForNewReceipt(world, SOURCE, TOTAL, FIRST_CLEAR), BOX_COUNT = SHUFFLED.payouts.length, RECEIPT = {
      encounterId: ENCOUNTER_ID,
      source: SOURCE,
      receiptKey: RECEIPT_KEY,
      acquisitionMultiplier: SOURCE === "farm" ? BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier : options.acquisitionMultiplier ?? 1,
      stage: Number.isSafeInteger(options.stage) ? options.stage : 0,
      species: SPECIES,
      tier: 1,
      x: Number.isFinite(options.x) ? options.x : 0,
      y: Number.isFinite(options.y) ? options.y : 0,
      firstClear: FIRST_CLEAR,
      chance: CHANCE,
      baselineChance: FIRST_CLEAR ? BOSS_REWARD_SETTINGS.firstClearAcquisitionChance : BOSS_REWARD_SETTINGS.acquisitionChance,
      rollBudget: TOTAL,
      rollCount: BOX_COUNT,
      boxCount: BOX_COUNT,
      successCount: 0,
      acquiredCount: 0,
      grantedCount: 0,
      placedCount: 0,
      queuedCount: 0,
      unitId: 0,
      revealedCount: 0,
      boxes: [],
      calculation: {
        version: 1,
        payouts: SHUFFLED.payouts,
        hits: [],
        payoutRngStateAfter: SHUFFLED.payoutRngStateAfter,
        jobState: null
      },
      status: "calculating"
    };
    if (streamFor(SOURCE, FIRST_CLEAR) !== STREAM_KIND || !Number.isSafeInteger(STREAM.rngState)) {
      throw new TypeError("Boss reward streams are not initialized");
    }
    world.bossRewardReceipts.push(RECEIPT);
    world.bossRewardWatermarks[SOURCE] = ENCOUNTER_ID;
    trimRewardReceipts(world);
    if (SOURCE === "farm" && world.farmBossEvent?.encounterId === ENCOUNTER_ID) {
      world.farmBossEvent.rewardStatus = "calculating";
      world.farmBossEvent.rewardChance = CHANCE;
      world.farmBossEvent.rewardRoll = 0;
      world.farmBossEvent.rewardUnitId = 0;
    }
    world.markProgressChanged?.();
    return RECEIPT;
  }
  function copyInventory(world) {
    return (world.bossRewardInventory || []).map((entry) => ({ ...entry }));
  }
  function completeRewardCalculation(world, receipt, jobState) {
    const CALC = receipt.calculation, HIT_SET = new Set(CALC.hits), BOXES = CALC.payouts.map((payout, index) => ({ payout, hit: HIT_SET.has(index) }));
    let acquired = 0;
    for (const BOX of BOXES) {
      if (BOX.hit) {
        acquired += BOX.payout;
        if (!Number.isSafeInteger(acquired)) {
          throw new RangeError("Owned boss reward quantity exceeds the safe integer range");
        }
      }
    }
    const KIND = streamFor(receipt.source, receipt.firstClear === true), NEXT_INVENTORY = copyInventory(world), GROUP = NEXT_INVENTORY.find((entry) => entry.species === receipt.species && entry.tier === receipt.tier);
    if (acquired > 0) {
      const CURRENT = GROUP?.count || 0, NEXT = CURRENT + acquired;
      if (!Number.isSafeInteger(NEXT)) {
        throw new RangeError("Owned boss reward quantity exceeds the safe integer range");
      }
      if (GROUP) {
        GROUP.count = NEXT;
      } else {
        NEXT_INVENTORY.push({ species: receipt.species, tier: receipt.tier, count: acquired });
      }
    }
    const NEXT_STREAM = {
      rngState: jobState.rngState,
      distributionState: jobState.distributionState,
      payoutRngState: CALC.payoutRngStateAfter
    };
    world.bossRewardStreams[KIND] = NEXT_STREAM;
    world.bossRewardInventory = NEXT_INVENTORY;
    receipt.boxes = BOXES;
    receipt.successCount = CALC.hits.length;
    receipt.acquiredCount = acquired;
    receipt.placedCount = 0;
    receipt.queuedCount = acquired;
    receipt.grantedCount = 0;
    receipt.revealedCount = 0;
    receipt.calculation = null;
    receipt.status = "ready";
    if (receipt.source === "farm" && world.farmBossEvent?.encounterId === receipt.encounterId) {
      world.farmBossEvent.rewardStatus = "ready";
    }
  }
  function trimRewardReceipts(world) {
    const KEEP = /* @__PURE__ */ new Set();
    let completed = 0;
    for (let index = world.bossRewardReceipts.length - 1; index >= 0; index -= 1) {
      const RECEIPT = world.bossRewardReceipts[index], NEEDS_PRESENTATION = RECEIPT.status === "calculating" || Number.isSafeInteger(RECEIPT.queuedCount) && RECEIPT.queuedCount > 0;
      if (NEEDS_PRESENTATION || RECEIPT.status === "ready" && completed < 8) {
        KEEP.add(RECEIPT);
        if (RECEIPT.status === "ready") {
          completed += 1;
        }
      }
    }
    world.bossRewardReceipts = world.bossRewardReceipts.filter((receipt) => KEEP.has(receipt));
  }
  function advanceBossRewardCalculations(world, { maxUnitsPerReward = PRD_UNITS_PER_TICK } = {}) {
    if (!Number.isSafeInteger(maxUnitsPerReward) || maxUnitsPerReward < 1 || maxUnitsPerReward > PRD_UNITS_PER_TICK) {
      throw new RangeError("Boss reward work must be from 1 to 10 units per logical tick");
    }
    ensureWorldRewardState(world);
    if (world.scene !== "farm") {
      return false;
    }
    let changed = false;
    for (const SOURCE of ["raid", "farm"]) {
      const RECEIPT = world.bossRewardReceipts.find(
        (entry) => entry.source === SOURCE && entry.status === "calculating"
      ), CALC = RECEIPT?.calculation;
      if (!RECEIPT || !CALC) {
        continue;
      }
      const STREAM_KIND = streamFor(SOURCE, RECEIPT.firstClear === true), STREAM = world.bossRewardStreams[STREAM_KIND], { SeededPRNG: SEEDED_PRNG2, PseudoRandomDistribution: PSEUDO_RANDOM_DISTRIBUTION } = requireSdk(), RNG = new SEEDED_PRNG2(STREAM.rngState), PRD = new PSEUDO_RANDOM_DISTRIBUTION({ probability: RECEIPT.chance, rng: RNG });
      let job = null;
      try {
        if (CALC.jobState) {
          job = PRD.restoreRollJob(CALC.jobState);
        } else {
          if (STREAM.distributionState) {
            PRD.restore(STREAM.distributionState);
          }
          if (PRD.probability !== RECEIPT.chance) {
            PRD.setProbability(RECEIPT.chance);
          }
          job = PRD.createRollJob(RECEIPT.boxCount);
        }
        if (RECEIPT.chance === 1 && CALC.hits.length === 0) {
          CALC.hits = Array.from({ length: RECEIPT.boxCount }, (_, index) => index);
        }
        let units = 0;
        while (!job.done && units < maxUnitsPerReward) {
          const PRIOR_SUCCESSES = job.successes, STEP = job.step(1);
          units += STEP.unitsUsed;
          if (RECEIPT.chance !== 1 && STEP.successes > PRIOR_SUCCESSES) {
            if (STEP.successes !== PRIOR_SUCCESSES + 1) {
              throw new Error("A single PRD interval returned multiple reward successes");
            }
            CALC.hits.push(STEP.processedTrials - 1);
          }
          if (STEP.unitsUsed === 0 && !STEP.done) {
            throw new Error("The resumable boss reward job did not advance");
          }
        }
        CALC.jobState = job.capture();
        changed = true;
        if (job.done) {
          completeRewardCalculation(world, RECEIPT, CALC.jobState);
          trimRewardReceipts(world);
        }
      } finally {
        job?.dispose();
        PRD.dispose();
      }
    }
    if (changed) {
      world.markProgressChanged?.();
    }
    return changed;
  }
  function advanceBossRewardReveal(world, receiptKey, maxBoxes = 10) {
    if (!Number.isSafeInteger(maxBoxes) || maxBoxes < 1 || maxBoxes > 10) {
      throw new RangeError("Boss reward reveal must be from 1 to 10 boxes");
    }
    ensureWorldRewardState(world);
    const RECEIPT = world.bossRewardReceipts.find((entry) => entry.receiptKey === receiptKey);
    if (!RECEIPT || RECEIPT.status !== "ready") {
      return null;
    }
    if (RECEIPT.revealedCount >= RECEIPT.boxCount) {
      return RECEIPT;
    }
    RECEIPT.revealedCount = Math.min(RECEIPT.boxCount, RECEIPT.revealedCount + maxBoxes);
    return RECEIPT;
  }
  function openAllBossRewardBoxes(world, receiptKey) {
    ensureWorldRewardState(world);
    const RECEIPT = world.bossRewardReceipts.find((entry) => entry.receiptKey === receiptKey);
    if (!RECEIPT || RECEIPT.status !== "ready") {
      return null;
    }
    RECEIPT.revealedCount = RECEIPT.boxCount;
    return RECEIPT;
  }
  function settleBossKill(world, options) {
    return typeof world.mutateUnits === "function" ? world.mutateUnits(settleBossKillCommitted, world, options) : settleBossKillCommitted(world, options);
  }
  function settleBossKillCommitted(world, options = {}) {
    const RECEIPT = resolveBossAcquisitionCommitted(world, options), PROGRESSION_OWNER = options.progressionOwner || world, WALLET = options.playerProgression || PROGRESSION_OWNER.playerProgression, RECEIPT_KEY = RECEIPT.xpReceiptKey || options.receiptKey || RECEIPT.receiptKey;
    if (RECEIPT.xpReceiptKey && ["awarded", "already-awarded"].includes(RECEIPT.xpStatus)) {
      return {
        receipt: RECEIPT,
        progression: WALLET,
        awarded: false,
        reason: "duplicate-receipt",
        xpAwarded: RECEIPT.xpAmount ?? 0,
        levelsGained: RECEIPT.levelsGained ?? 0,
        pointsAwarded: RECEIPT.pointsAwarded ?? 0
      };
    }
    const RESULT = awardBossKillXp(WALLET, RECEIPT_KEY, options.xpAmount === void 0 ? void 0 : options.xpAmount);
    if (RESULT.awarded) {
      PROGRESSION_OWNER.playerProgression = RESULT.state;
    }
    if (RESULT.awarded || RESULT.reason === "duplicate-receipt") {
      RECEIPT.xpReceiptKey = RECEIPT_KEY;
      RECEIPT.xpStatus = RESULT.awarded ? "awarded" : "already-awarded";
      RECEIPT.xpAmount = RESULT.awarded ? RESULT.xpAwarded : 0;
      RECEIPT.levelsGained = RESULT.levelsGained;
      RECEIPT.pointsAwarded = RESULT.pointsAwarded;
    } else {
      RECEIPT.xpStatus = "unsettled";
    }
    world.markProgressChanged?.();
    return {
      receipt: RECEIPT,
      progression: RESULT.state,
      awarded: RESULT.awarded,
      reason: RESULT.reason,
      xpAwarded: RESULT.xpAwarded,
      levelsGained: RESULT.levelsGained,
      pointsAwarded: RESULT.pointsAwarded
    };
  }
  var FORMAT_PERCENT, FORMAT_COUNT, PRD_UNITS_PER_TICK, STREAM_DOMAINS, STREAM_SOURCE, BOSS_REWARD_SETTINGS;
  var init_boss_rewards = __esm({
    "src/boss-rewards.js"() {
      init_player_progression();
      init_species_catalog();
      FORMAT_PERCENT = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });
      FORMAT_COUNT = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
      PRD_UNITS_PER_TICK = 10;
      STREAM_DOMAINS = Object.freeze({
        normal: Object.freeze({ prd: 795749149, boxes: 1547342359 }),
        event: Object.freeze({ prd: 1939685861, boxes: 462181795 }),
        firstClear: Object.freeze({ prd: 1247922131, boxes: 767049617 })
      });
      STREAM_SOURCE = Object.freeze({ raid: "normal", farm: "event" });
      BOSS_REWARD_SETTINGS = Object.freeze({
        acquisitionChance: 0.05,
        firstClearAcquisitionChance: 0.15,
        farmEventAcquisitionMultiplier: 2,
        stageHpBase: 200,
        stageHpMultiplier: 1.5,
        stageAttackBase: 4,
        stageAttackMultiplier: 1.2,
        stageXpBase: 20,
        stageXpMultiplier: 1.5,
        stageRollMultiplier: 1.5,
        maxStage: FARM_BOSS_EVENT_MAX_STAGE,
        maxRollCount: Math.floor(1.5 ** (FARM_BOSS_EVENT_MAX_STAGE - 1)),
        maxBoxCount: 100,
        prdUnitsPerTick: PRD_UNITS_PER_TICK,
        speciesWeights: BOSS_SPECIES_WEIGHTS
      });
    }
  });

  // src/farm-boss-stages.js
  function createFarmBossProgress(seed = 731) {
    return {
      currentStage: 1,
      highestClearedRaidStage: 0,
      encounterSeed: (CLAMP_UINT32(seed) ^ 2738958700) >>> 0,
      encounterEpoch: 0,
      nextSelectionId: 1,
      selections: []
    };
  }
  function selectionRandom(seed, selectionId, stage, encounterEpoch = 0) {
    const EPOCH_SALT = Math.imul(encounterEpoch >>> 0, 668265261);
    let state = (seed ^ Math.imul(selectionId, 2654435769) ^ Math.imul(stage, 2246822507) ^ EPOCH_SALT) >>> 0;
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
    if (!progress || !Number.isSafeInteger(progress.highestClearedRaidStage) || progress.highestClearedRaidStage < 0 || progress.highestClearedRaidStage > BOSS_REWARD_SETTINGS.maxStage || !Number.isSafeInteger(stage) || stage < 1 || stage > Math.min(BOSS_REWARD_SETTINGS.maxStage, progress.highestClearedRaidStage + 2)) {
      throw new RangeError("Boss stage is outside the supported range");
    }
    let selection = progress.selections.find((entry) => entry.stage === stage);
    if (!selection) {
      const SELECTION_ID = progress.nextSelectionId;
      const RANDOM = selectionRandom(progress.encounterSeed, SELECTION_ID, stage, progress.encounterEpoch ?? 0);
      selection = {
        stage,
        species: chooseBossSpecies(RANDOM),
        selectionId: SELECTION_ID
      };
      progress.selections.push(selection);
      progress.nextSelectionId += 1;
    }
    progress.currentStage = stage;
    const STATS2 = bossStageStats(stage);
    return {
      ...selection,
      ...STATS2
    };
  }
  var CLAMP_UINT32;
  var init_farm_boss_stages = __esm({
    "src/farm-boss-stages.js"() {
      init_boss_rewards();
      CLAMP_UINT32 = (value) => Number.isSafeInteger(value) ? value >>> 0 : 0;
    }
  });

  // src/unit-combat-patterns.js
  function createPeanutStrikeSchedule({
    strikeCount = PEANUT_BASE_STRIKE.count,
    activeSeconds = PEANUT_BASE_STRIKE.activeSeconds,
    attackMultiplier = PEANUT_BASE_STRIKE.attackMultiplier,
    spreadRadians = PEANUT_BASE_STRIKE.spreadRadians
  } = {}) {
    if (!Number.isSafeInteger(strikeCount) || strikeCount < 1 || strikeCount > MASK_BITS || !Number.isFinite(activeSeconds) || activeSeconds <= 0 || !Number.isFinite(attackMultiplier) || attackMultiplier <= 0 || !Number.isFinite(spreadRadians) || spreadRadians < 0 || spreadRadians > Math.PI) {
      return [];
    }
    return Array.from(
      {
        length: strikeCount
      },
      (_, strikeIndex) => {
        const SIDE = strikeIndex % 2 === 0 ? -1 : 1;
        return Object.freeze({
          strikeIndex,
          kernelIndex: strikeIndex % 2,
          side: SIDE,
          angleOffsetRadians: SIDE * spreadRadians,
          dueSeconds: (strikeIndex + 0.5) / strikeCount * activeSeconds,
          attackMultiplier
        });
      }
    );
  }
  function resolveStrikeMask({ resolvedMask = 0, hitMask = 0 } = {}, strikeIndex, didHit) {
    if (!Number.isSafeInteger(resolvedMask) || resolvedMask < 0 || !Number.isSafeInteger(hitMask) || hitMask < 0 || !Number.isSafeInteger(strikeIndex) || strikeIndex < 0 || strikeIndex >= MASK_BITS || typeof didHit !== "boolean") {
      return null;
    }
    const BIT = 1 << strikeIndex;
    if ((resolvedMask & BIT) !== 0) {
      return null;
    }
    return {
      resolvedMask: resolvedMask | BIT,
      hitMask: didHit ? hitMask | BIT : hitMask
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

  // src/features/unit-attacks/dual-strike/model.js
  function createDualStrikeMixin(pathMotion, arenaGeometry) {
    const PATH_MOTION = pathMotion;
    const REPEATED_STRIKE = (base) => class extends PATH_MOTION(base) {
      get strikeDuration() {
        return this.spec.timing.active ?? PEANUT_BASE_STRIKE.activeSeconds;
      }
      prepareAttack(sim) {
        super.prepareAttack?.(sim);
        const ASSAULT_LOCAL = this.strikeConfig?.(sim);
        Object.assign(this.action, {
          resolvedMask: 0,
          hitMask: 0,
          peanutStrikeCount: ASSAULT_LOCAL?.strikeCount || PEANUT_BASE_STRIKE.count,
          peanutAttackMultiplier: ASSAULT_LOCAL?.attackMultiplier ?? PEANUT_BASE_STRIKE.attackMultiplier,
          peanutSpreadRadians: ASSAULT_LOCAL?.spreadRadians ?? PEANUT_BASE_STRIKE.spreadRadians
        });
      }
      createAttackPath() {
        const U = this.owner;
        this.action.path = {
          from: {
            x: U.x,
            y: U.y,
            z: 0
          },
          to: {
            x: U.x,
            y: U.y,
            z: 0
          },
          height: 0,
          duration: this.strikeDuration
        };
      }
      afterMove(sim) {
        const A = this.action, U = this.owner;
        if (this.phase !== "active" || !A?.path) {
          return;
        }
        const SCHEDULE = createPeanutStrikeSchedule({
          strikeCount: A.peanutStrikeCount || 2,
          attackMultiplier: A.peanutAttackMultiplier ?? PEANUT_BASE_STRIKE.attackMultiplier,
          spreadRadians: A.peanutSpreadRadians ?? Math.PI / 12,
          activeSeconds: this.strikeDuration
        });
        for (const SLOT of SCHEDULE) {
          if (this.elapsed + 1e-9 < SLOT.dueSeconds || ((A.resolvedMask || 0) & 1 << SLOT.strikeIndex) !== 0) {
            continue;
          }
          const TARGET = sim.attackTarget(U, A);
          let hit = null;
          if (TARGET && TARGET.hp > 0) {
            const DISTANCE = Math.hypot(TARGET.x - U.x, TARGET.y - U.y), REACH = TARGET.radius + U.radius + this.spec.range;
            if (DISTANCE <= REACH) {
              const AIM = Math.atan2(TARGET.y - U.y, TARGET.x - U.x), SIDE = SLOT.angleOffsetRadians;
              const FROM = {
                x: U.x + Math.cos(AIM + SIDE) * U.radius * 0.45,
                y: U.y + Math.sin(AIM + SIDE) * U.radius * 0.45,
                z: 0
              };
              const TO = {
                x: TARGET.x - Math.cos(AIM) * TARGET.radius * 0.9,
                y: TARGET.y - Math.sin(AIM) * TARGET.radius * 0.9,
                z: 0
              };
              hit = arenaGeometry.sweep(FROM, TO, Math.max(0.06, U.radius * 0.2), 0.24, TARGET);
            }
          }
          const STRIKE_ACTION = {
            ...A,
            hit: false,
            strikeIndex: SLOT.strikeIndex
          };
          const DID_HIT = !!hit && this.resolveAttackHit(sim, STRIKE_ACTION, TARGET, hit, {
            attackMultiplier: SLOT.attackMultiplier,
            attackKind: this.spec.kind,
            strikeIndex: SLOT.strikeIndex
          });
          const MASKS = resolveStrikeMask(A, SLOT.strikeIndex, DID_HIT);
          if (MASKS) {
            Object.assign(A, MASKS);
          }
        }
        if (this.elapsed >= this.strikeDuration - 1e-9) {
          U.z = 0;
          U.vz = 0;
          this.recover(sim, false);
        }
      }
    };
    return REPEATED_STRIKE;
  }
  var init_model30 = __esm({
    "src/features/unit-attacks/dual-strike/model.js"() {
      init_unit_combat_patterns();
    }
  });

  // src/features/unit-attacks/lob/model.js
  function createLobAttackMixin(pathMotion) {
    const PATH_MOTION = pathMotion;
    const PROJECTILE_ATTACK = (base) => class extends PATH_MOTION(base) {
      projectileShots() {
        return [
          {
            shotIndex: 0,
            delaySeconds: 0,
            attackMultiplier: this.spec.skillMultiplier
          }
        ];
      }
      launchAttack(sim) {
        super.launchAttack?.(sim);
        const U = this.owner, A = this.action, PROJECTILE_EFFECT = this.projectileEffect?.(sim) || null, SHOTS = this.projectileShots(sim);
        A.pendingShots = SHOTS.slice(1);
        A.projectileAbility = {
          effect: PROJECTILE_EFFECT
        };
        sim.spawnLobProjectile(U, A, SHOTS[0], PROJECTILE_EFFECT);
        this.recover(sim, true);
      }
      updateRecovery(sim) {
        super.updateRecovery?.(sim);
        const PENDING = this.action?.pendingShots || [];
        while (PENDING.length && PENDING[0].delaySeconds <= this.elapsed + 1e-9) {
          const SHOT = PENDING.shift();
          sim.spawnLobProjectile(
            this.owner,
            this.action,
            SHOT,
            this.action.projectileAbility?.effect || null
          );
        }
      }
    };
    return PROJECTILE_ATTACK;
  }
  var init_model31 = __esm({
    "src/features/unit-attacks/lob/model.js"() {
    }
  });

  // src/unit-attack-capabilities.js
  function composeUnitAttackCycles(cycle, { ArenaGeometry: arenaGeometry, Ballistics: ballistics }) {
    const PATH_MOTION = (base) => class extends base {
      resolveAttackHit(sim, action, target, point2, options) {
        return sim.damageCombatTarget(this.owner, action, target, point2, options);
      }
      createAttackPath() {
        const U = this.owner, A = this.action;
        A.path = ballistics.create(U, A.target, this.spec.kind);
        if (this.composition.useActiveDuration) {
          A.path.duration = this.spec.timing.active ?? A.path.duration;
        }
      }
      integrate(dt) {
        const U = this.owner, A = this.action;
        if (this.phase !== "active" || !A?.path || U.stun > 0 || U.down > 0 || U.landingRecovery > 0 || U.z > 0.1 && !(A.path.height > 0)) {
          return false;
        }
        const DELAY = Math.min(dt, A.motionDelay || 0);
        A.motionDelay = Math.max(0, (A.motionDelay || 0) - DELAY);
        this.elapsed += dt - DELAY;
        const P = ballistics.sample(A.path, this.elapsed / A.path.duration, this.motionPoint);
        U.vx = (P.x - U.x) / dt;
        U.vy = (P.y - U.y) / dt;
        U.vz = (P.z - U.z) / dt;
        U.x = P.x;
        U.y = P.y;
        U.z = P.z;
        U.flash = Math.max(0, U.flash - dt);
        U.bounce = Math.max(0, U.bounce - dt);
        return true;
      }
    };
    const CONTACT_ATTACK = (base) => class extends PATH_MOTION(base) {
      afterMove(sim, old) {
        const A = this.action, U = this.owner, TARGET = sim.attackTarget(U, A);
        if (this.phase !== "active" || !A?.path) {
          return;
        }
        if (!TARGET || TARGET.hp <= 0) {
          this.interrupt();
          return;
        }
        const AREA_RADIUS = scaleAttackArea(U.radius, U), HIT = !A.hit && arenaGeometry.sweep(old, U, AREA_RADIUS, U.height, TARGET);
        if (HIT) {
          this.resolveAttackHit(sim, A, TARGET, HIT, {
            attackMultiplier: this.spec.skillMultiplier,
            attackKind: this.spec.kind
          });
          if (this.composition.contactRecoil) {
            U.x = HIT.x;
            U.y = HIT.y;
            U.z = HIT.z;
            this.recover(sim, true);
            return;
          }
        }
        if (this.elapsed >= A.path.duration) {
          U.z = 0;
          U.vz = 0;
          U.vx = U.vy = 0;
          if (this.landAttack?.(sim, TARGET)) {
            return;
          }
          this.recover(sim, true);
        }
      }
    };
    const REPEATED_STRIKE = createDualStrikeMixin(PATH_MOTION, arenaGeometry);
    const PROJECTILE_ATTACK = createLobAttackMixin(PATH_MOTION);
    const LANDING = (base) => class extends base {
      landAttack(sim, target) {
        if (super.landAttack?.(sim, target)) {
          return true;
        }
        const U = this.owner, A = this.action;
        U.bounce = 0.2;
        sim.combatEvent("land-attack", U, A);
        if (!A.hit && arenaGeometry.overlaps(
          {
            x: U.x,
            y: U.y,
            z: 0,
            radius: scaleAttackArea(U.radius + 0.35, U),
            height: U.height
          },
          target
        )) {
          this.resolveAttackHit(sim, A, target, U, {
            attackMultiplier: this.spec.skillMultiplier,
            attackKind: this.spec.kind
          });
        }
        return this.resolveLandingEffects?.(sim) || false;
      }
    };
    const LEAP_RESET = (base) => class extends base {
      resolveLandingEffects(sim) {
        if (super.resolveLandingEffects?.(sim)) {
          return true;
        }
        const U = this.owner, CONFIG_LOCAL = KidneyLeapModel.config(sim.abilityProgressionFor(U), U.tier);
        if (!CONFIG_LOCAL || this.action.leapCooldownResetApplied || !KidneyLeapModel.shouldResetCooldown(CONFIG_LOCAL, sim.random())) {
          return false;
        }
        this.action.leapCooldownResetApplied = true;
        this.ready();
        U.kidneyLeapReadyTick = sim.simulationTick;
        U.kidneyLeapLastUseTick = sim.simulationTick;
        sim.combat("leap-cooldown-reset", {
          unit: U.id,
          ownerId: U.ownerId,
          species: U.species
        });
        return true;
      }
    };
    const KIDNEY_LEAP = (base) => class extends base {
      get spec() {
        return specialAbilityCompositionFor(this.owner.species).profile;
      }
      get composition() {
        return specialAbilityCompositionFor(this.owner.species).composition;
      }
      canBegin(sim) {
        return !!KidneyLeapModel.config(sim.abilityProgressionFor(this.owner), this.owner.tier) && sim.simulationTick >= this.owner.kidneyLeapReadyTick && this.owner.kidneyLeapLastUseTick !== sim.simulationTick;
      }
      onLaunch(sim, action) {
        super.onLaunch?.(sim, action);
        if (action.leapDepartureCommitted) {
          return;
        }
        action.leapDepartureCommitted = true;
        this.owner.kidneyLeapReadyTick = sim.simulationTick + specialAbilityCompositionFor(this.owner.species).cooldownTicks;
        this.owner.kidneyLeapLastUseTick = sim.simulationTick;
      }
      interrupt() {
        if (this.phase === "windup" && !this.action?.leapDepartureCommitted) {
          this.ready();
          return;
        }
        super.interrupt();
      }
    };
    const CORN_ATTACHMENT2 = (base) => class extends base {
      projectileEffect(sim) {
        return CornAttachmentModel.projectileEffect(sim.abilityProgressionFor(this.owner), this.owner.tier);
      }
    };
    const GUARD = (base) => class extends base {
      resetCombatEffects() {
        super.resetCombatEffects?.();
        WalnutRawGuardModel.clear(this.owner);
      }
      tryStartGuard(sim) {
        const U = this.owner, CONFIG_LOCAL = WalnutRawGuardModel.config(sim.abilityProgressionFor(U), U.tier);
        if (!WalnutRawGuardModel.start(U, sim.simulationTick, CONFIG_LOCAL)) {
          return false;
        }
        sim.combat("walnut-guard-start", {
          unit: U.id,
          x: U.x,
          y: U.y,
          z: U.z || 0,
          endsAtTick: U.walnutGuardUntilTick
        });
        return true;
      }
      isGuarding(simulationTick) {
        return WalnutRawGuardModel.isGuarding(this.owner, simulationTick);
      }
      armorModifier(sim, simulationTick) {
        const U = this.owner, CONFIG_LOCAL = WalnutRawGuardModel.config(sim.abilityProgressionFor(U), U.tier);
        return WalnutRawGuardModel.armorBonus(U, simulationTick, CONFIG_LOCAL);
      }
      rawDamageBonus(sim, action, kind) {
        if (action !== this.action || kind !== this.spec.kind) {
          return 0;
        }
        const U = this.owner, CONFIG_LOCAL = WalnutRawGuardModel.config(sim.abilityProgressionFor(U), U.tier);
        return WalnutRawGuardModel.nextHammerBonus(U, sim.unitStatsFor(U).attackPower, CONFIG_LOCAL);
      }
      afterSuccessfulAttack(_sim, action) {
        if (action === this.action) {
          WalnutRawGuardModel.consume(this.owner);
        }
      }
      receiveRawDamage(sim, rawDamage) {
        const U = this.owner, CONFIG_LOCAL = WalnutRawGuardModel.config(sim.abilityProgressionFor(U), U.tier);
        WalnutRawGuardModel.accumulate(U, rawDamage, sim.simulationTick, CONFIG_LOCAL);
      }
    };
    const CHESTNUT_THORNS = (base) => class extends base {
      get spec() {
        return specialAbilityCompositionFor(this.owner.species).profile;
      }
      canBegin(sim) {
        const U = this.owner, CONFIG_LOCAL = ChestnutThornsModel.config(sim.abilityProgressionFor(U), U.tier);
        return !!CONFIG_LOCAL && sim.simulationTick >= (U.chestnutNextThornTick || 0);
      }
      createAttackPath() {
        this.action.path = null;
      }
      onLaunch(sim, action) {
        if (action.thornShotsRemaining !== void 0) {
          return;
        }
        const U = this.owner, CONFIG_LOCAL = ChestnutThornsModel.config(sim.abilityProgressionFor(U), U.tier), TARGET = sim.attackTarget(U, action);
        if (!CONFIG_LOCAL || !TARGET || TARGET.hp <= 0) {
          return;
        }
        Object.assign(action, {
          thornTargetId: action.targetId,
          thornTargetGeneration: TARGET.generation,
          thornConfig: CONFIG_LOCAL,
          thornShotsRemaining: CONFIG_LOCAL.projectileCount - 1,
          thornNextShotTick: sim.simulationTick + CONFIG_LOCAL.spacingTicks,
          thornShotIndex: 0
        });
        if (sim.spawnChestnutThorn(U, action, CONFIG_LOCAL, action.thornShotIndex)) {
          U.chestnutNextThornTick = sim.simulationTick + CONFIG_LOCAL.cooldownTicks;
        } else {
          action.thornShotsRemaining = 0;
        }
      }
      launchAttack(sim) {
        super.launchAttack?.(sim);
        this.recover(sim, false);
      }
      updateRecovery(sim) {
        const ACTION = this.action;
        if (!ACTION || ACTION.thornShotsRemaining <= 0 || sim.simulationTick < ACTION.thornNextShotTick) {
          return;
        }
        const TARGET = ChestnutThornsModel.resolveTarget(
          sim,
          ACTION.thornTargetId,
          ACTION.thornTargetGeneration
        );
        if (!TARGET || TARGET.hp <= 0) {
          ACTION.thornShotsRemaining = 0;
          return;
        }
        ACTION.thornShotIndex += 1;
        if (sim.spawnChestnutThorn(this.owner, ACTION, ACTION.thornConfig, ACTION.thornShotIndex)) {
          ACTION.thornShotsRemaining -= 1;
        } else {
          ACTION.thornShotsRemaining = 0;
        }
        ACTION.thornNextShotTick += ACTION.thornConfig.spacingTicks;
      }
    };
    const DEATH_SPLIT = (base) => class extends base {
      deathSplitDescriptors(sim, inBattle) {
        return PeanutDeathSplitModel.descriptors({
          unit: this.owner,
          progression: sim.abilityProgressionFor(this.owner),
          inBattle
        });
      }
    };
    const RECOVERY_HASTE = (base) => class extends base {
      recoveryHasteConfig(sim) {
        const U = this.owner;
        return PeaRecoveryBoostModel.config(sim.abilityProgressionFor(U), U.tier);
      }
    };
    const RICE_CRITICAL = (base) => class extends base {
      criticalChanceBonus(sim, hp, maxHp) {
        return RiceCriticalModel.chanceBonus(sim.abilityProgressionFor(this.owner), this.owner.tier, hp, maxHp);
      }
    };
    const COMMAND_AURA = (base) => class extends base {
      commandAuraConfig(sim) {
        return WheatCommandModel.config(sim.abilityProgressionFor(this.owner), this.owner.tier);
      }
      onLaunch(sim, action) {
        super.onLaunch?.(sim, action);
        const CONFIG_LOCAL = this.commandAuraConfig(sim);
        if (CONFIG_LOCAL && !action.wheatCommandResolved) {
          WheatCommandModel.trigger(sim, this.owner, action, CONFIG_LOCAL);
        }
      }
    };
    const ARMOR_BREAK = (base) => class extends base {
      onBasicHit(sim, target) {
        super.onBasicHit?.(sim, target);
        const U = this.owner, CONFIG_LOCAL = BarleyArmorShredModel.config(sim.abilityProgressionFor(U), U.tier);
        if (CONFIG_LOCAL && target.hp > 0) {
          const RESULT = BarleyArmorShredModel.applyHit(target, CONFIG_LOCAL.amount, sim.simulationTick);
          if (RESULT) {
            sim.combat("barley-shred", {
              sourceUnit: U.id,
              unit: target === sim.boss ? "boss" : target.id,
              amount: RESULT.amount,
              x: target.x,
              y: target.y,
              z: target.z || 0
            });
          }
        }
      }
    };
    const ATTACKS = {
      contact: CONTACT_ATTACK,
      [FEATURE4.modelKey]: PROJECTILE_ATTACK,
      [FEATURE5.modelKey]: REPEATED_STRIKE
    };
    const TRAITS = {
      landing: LANDING,
      leapReset: LEAP_RESET,
      guard: GUARD,
      chestnutThorns: CHESTNUT_THORNS,
      cornAttachment: CORN_ATTACHMENT2,
      deathSplit: DEATH_SPLIT,
      riceCritical: RICE_CRITICAL,
      commandAura: COMMAND_AURA,
      armorBreak: ARMOR_BREAK,
      recoveryHaste: RECOVERY_HASTE,
      kidneyLeap: KIDNEY_LEAP
    };
    const MIXIN = (base, ...capabilities) => {
      for (const CAPABILITY of new Set(capabilities)) {
        base = CAPABILITY(base);
      }
      return base;
    };
    const CLASSES = /* @__PURE__ */ new Map();
    for (const DEFINITION13 of Object.values(UNIT_CAPABILITY_COMPOSITIONS)) {
      CLASSES.set(
        DEFINITION13,
        MIXIN(cycle, ATTACKS[DEFINITION13.attack], ...DEFINITION13.traits.map((name) => TRAITS[name]))
      );
    }
    const CREATE = (owner) => new (CLASSES.get(unitCapabilityComposition(owner.species)))(owner), SPECIAL_CLASSES = /* @__PURE__ */ new Map();
    CREATE.createSpecial = (owner) => {
      const DEFINITION13 = specialAbilityCompositionFor(owner.species);
      if (!DEFINITION13) {
        return null;
      }
      let specialClass = SPECIAL_CLASSES.get(DEFINITION13);
      if (!specialClass) {
        specialClass = MIXIN(cycle, ATTACKS[DEFINITION13.attack], ...DEFINITION13.traits.map((name) => TRAITS[name]));
        SPECIAL_CLASSES.set(DEFINITION13, specialClass);
      }
      return new specialClass(owner);
    };
    return CREATE;
  }
  var init_unit_attack_capabilities = __esm({
    "src/unit-attack-capabilities.js"() {
      init_model30();
      init_definition18();
      init_model31();
      init_definition17();
      init_unit_abilities();
      init_unit_stats();
      init_model18();
      init_model19();
      init_model20();
      init_model12();
      init_model13();
      init_model14();
      init_model15();
      init_model16();
      init_model17();
    }
  });

  // src/farm-model.js
  function presentationEventTimeMs(event) {
    return PRESENTATION_EVENT_TIMES.get(event) ?? (Number.isFinite(event?.time) ? event.time * 1e3 : 0);
  }
  function bindPresentationClock(world, clock) {
    if (clock) {
      PRESENTATION_CLOCKS.set(world, clock);
    } else {
      PRESENTATION_CLOCKS.delete(world);
    }
  }
  function bossAttackArea(boss, unitRadius = 0, scene = "raid", area = {}) {
    const ACTION = boss.patternRuntime?.active, CONFIG_LOCAL = BOSS_PATTERN_CONFIG[ACTION?.id];
    if (!CONFIG_LOCAL) {
      return null;
    }
    const PHASE = ACTION.phase, PAD = Math.max(0, unitRadius), ELAPSED = Math.max(0, ACTION.phaseElapsed || 0);
    area.x = boss.x;
    area.y = boss.y;
    area.angle = ACTION.aim ?? boss.angle;
    area.patternId = ACTION.id;
    area.phase = PHASE;
    area.elapsed = ELAPSED;
    area.active = PHASE === "active";
    area.locked = !!ACTION.locked;
    area.progress = PHASE === "recover" ? 1 : CLAMP2(ELAPSED / (PHASE === "windup" ? CONFIG_LOCAL.windup : CONFIG_LOCAL.active || 1), 0, 1);
    BOSS_BEHAVIORS.forId(ACTION.id).writeArea(boss, ACTION, scene, PAD, area);
    return area;
  }
  function inverseBodyMass(body) {
    if (body.fixed === true) {
      return 0;
    }
    const MASS = Number.isFinite(body.mass) ? body.mass : 1;
    return MASS > 0 ? 1 / MASS : 0;
  }
  function contact(a, b) {
    const DX = b.x - a.x, DY = b.y - a.y, D_LOCAL = Math.hypot(DX, DY), R_LOCAL = a.radius + b.radius;
    if (a.z > b.z + b.height || b.z > a.z + a.height) {
      return false;
    }
    if (D_LOCAL >= R_LOCAL) {
      return false;
    }
    const NX = D_LOCAL > 1e-6 ? DX / D_LOCAL : 1, NY = D_LOCAL > 1e-6 ? DY / D_LOCAL : 0, INVERSE_MASS_A = inverseBodyMass(a), INVERSE_MASS_B = inverseBodyMass(b), INVERSE_MASS_SUM = INVERSE_MASS_A + INVERSE_MASS_B;
    const CLOSING = (a.vx - b.vx) * NX + (a.vy - b.vy) * NY;
    if (CLOSING > 0 && INVERSE_MASS_SUM > 0) {
      const IMPULSE = CLOSING * 1.14 / INVERSE_MASS_SUM;
      if (INVERSE_MASS_A > 0) {
        const IMPULSE_A = resolveKnockback(IMPULSE, b, a) * INVERSE_MASS_A;
        a.vx -= NX * IMPULSE_A;
        a.vy -= NY * IMPULSE_A;
      }
      if (INVERSE_MASS_B > 0) {
        const IMPULSE_B = resolveKnockback(IMPULSE, a, b) * INVERSE_MASS_B;
        b.vx += NX * IMPULSE_B;
        b.vy += NY * IMPULSE_B;
      }
      if (CLOSING > 2) {
        const RECEIVER = INVERSE_MASS_A === 0 ? b : INVERSE_MASS_B === 0 ? a : Math.hypot(a.vx, a.vy) > Math.hypot(b.vx, b.vy) ? a : b;
        RECEIVER.vz = Math.max(RECEIVER.vz, Math.min(4, CLOSING * 0.2));
        RECEIVER.stun = Math.max(RECEIVER.stun, resolveStatusDuration(0.3, RECEIVER === a ? b : a, RECEIVER));
        RECEIVER.flash = 0.1;
      }
    }
    return true;
  }
  var import_definition51, SEEDED_PRNG, CREATE_BUDGETED_SCHEDULER, EMPTY_FOOD_SEARCH_BUCKET, PRESENTATION_CLOCKS, PRESENTATION_EVENT_TIMES, BREED_COOLDOWN_SECONDS, BREED_RESERVATION_OWNER, MERGE_RESERVATION_OWNER, FARM_MAX_UNITS, RAID_PLAYER_UNITS, RAID_MAX_PLAYERS, RAID_PLAYER_ID_STRIDE, MAX_PEANUT_SPLIT_CHILDREN, MAX_BOSS_SUMMONS, RAID_MAX_UNITS, WORLD_ARENA, CONFIG, CLAMP2, STATS, BODY, KNOCKABLE, ARENA_GEOMETRY, BALLISTICS, FARM_BOSS_PHASES, PROJECTILE_BEHAVIORS, FARM_MODES, BOSS_BEHAVIORS, AttackCycle, CREATE_UNIT_ATTACK_CYCLE, CREATE_UNIT_SPECIAL_ABILITY, SIMULATION_SCENES, ATTACKING_BODY, UNIT, GARDEN;
  var init_farm_model = __esm({
    "src/farm-model.js"() {
      init_formation_skills();
      init_formation_skill_state();
      init_raid_deployment_cards();
      init_raid_deployment_cards();
      init_signal();
      import_definition51 = __toESM(require_definition(), 1);
      init_definition10();
      init_mutation_notifications();
      init_unit_collection();
      init_farm_roster();
      init_farm_plot();
      init_simulation_scenes();
      init_projectile_behaviors();
      init_boss_event_phases();
      init_farm_mode_behaviors();
      init_boss_pattern_behaviors();
      init_boss_vector_sockets();
      init_model19();
      init_model20();
      init_model17();
      init_unit_stats();
      init_unit_abilities();
      init_boss_rewards();
      init_farm_boss_stages();
      init_species_catalog();
      init_player_progression();
      init_ability_progression();
      init_ability_state();
      init_farm_upgrades();
      init_unit_attack_capabilities();
      init_unit_grades();
      init_boss_patterns();
      init_factions();
      init_spatial_grid();
      ({ SeededPRNG: SEEDED_PRNG } = globalThis.BloomGamekitDeterministic);
      ({ createBudgetedScheduler: CREATE_BUDGETED_SCHEDULER } = globalThis.BloomGamekitWorkScheduler);
      EMPTY_FOOD_SEARCH_BUCKET = Object.freeze([]);
      PRESENTATION_CLOCKS = /* @__PURE__ */ new WeakMap();
      PRESENTATION_EVENT_TIMES = /* @__PURE__ */ new WeakMap();
      BREED_COOLDOWN_SECONDS = 10;
      BREED_RESERVATION_OWNER = (aId, bId) => `breed:${Math.min(aId, bId)}:${Math.max(aId, bId)}`;
      MERGE_RESERVATION_OWNER = (ids) => `merge:${[...ids].sort((a, b) => a - b).join(":")}`;
      FARM_MAX_UNITS = 200;
      RAID_PLAYER_UNITS = 100;
      RAID_MAX_PLAYERS = 4;
      RAID_PLAYER_ID_STRIDE = 1e6;
      MAX_PEANUT_SPLIT_CHILDREN = 2;
      MAX_BOSS_SUMMONS = 10;
      RAID_MAX_UNITS = RAID_PLAYER_UNITS * RAID_MAX_PLAYERS;
      WORLD_ARENA = Object.freeze({
        radiusX: 23,
        radiusY: 17
      });
      CONFIG = Object.freeze({
        factions: FACTION_CONFIG,
        farm: Object.freeze({
          arena: WORLD_ARENA,
          capacity: Object.freeze({
            base: 50,
            max: FARM_MAX_UNITS,
            battleUnits: FARM_MAX_UNITS * (1 + MAX_PEANUT_SPLIT_CHILDREN) + MAX_BOSS_SUMMONS + 2e3
          }),
          maxUnitId: 999999999,
          starterSeconds: 60,
          breeding: Object.freeze({
            cooldownSeconds: BREED_COOLDOWN_SECONDS,
            growthSeconds: BREED_COOLDOWN_SECONDS / 2,
            matureMeals: 3
          }),
          merge: Object.freeze({
            animationSeconds: 0.85,
            centerHeight: 1.8,
            resultFallVelocity: 0.2,
            maxMaterials: MAX_GRADE_MATERIAL_COUNT
          }),
          bossEvent: Object.freeze({
            spawnChance: 0.01,
            fadeSeconds: 0.5,
            celebrationSeconds: 1
          })
        }),
        raid: Object.freeze({
          capacity: Object.freeze({
            playerUnits: RAID_PLAYER_UNITS,
            players: RAID_MAX_PLAYERS,
            units: RAID_MAX_UNITS,
            battleUnits: RAID_MAX_UNITS * (1 + MAX_PEANUT_SPLIT_CHILDREN) + MAX_BOSS_SUMMONS + 2e3,
            projectiles: RAID_MAX_UNITS * (1 + MAX_PEANUT_SPLIT_CHILDREN) * 4 + 40
          }),
          ids: Object.freeze({
            playerStride: RAID_PLAYER_ID_STRIDE,
            summonBase: RAID_MAX_PLAYERS * RAID_PLAYER_ID_STRIDE + RAID_PLAYER_UNITS + 1
          }),
          arena: WORLD_ARENA,
          dropHeight: 3,
          buff: Object.freeze({
            duration: 3,
            cooldown: 12,
            damage: 1.25
          })
        }),
        unit: Object.freeze({
          speciesCount: SPECIES_COUNT,
          maxTier: MAX_UNIT_TIER,
          maxRadius: (0, import_definition51.maximumUnitRadius)(MAX_UNIT_TIER),
          perceptionRange: 18,
          corpseRecoverySeconds: 60
        }),
        boss: Object.freeze({
          maxSummons: MAX_BOSS_SUMMONS,
          summonIdBase: 5e6,
          radius: 4.4,
          height: 5.2,
          basicReach: 6.2,
          sweepReach: 6.5,
          weaponRadius: 0.85,
          chaseSpeed: 2.65
        }),
        physics: Object.freeze({
          gravity: 19,
          separationIterations: 4,
          separationRelaxation: 0.8,
          softSeparationRate: -Math.log(1 - 0.035) * 120
        })
      });
      CLAMP2 = (x, a, b) => Math.max(a, Math.min(b, x));
      STATS = baseUnitStatsFor;
      BODY = class Body {
        constructor(x, y) {
          Object.assign(this, {
            x,
            y,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            angle: 0,
            stun: 0,
            flash: 0,
            bounce: 0
          });
        }
      };
      KNOCKABLE = (baseLocal) => class extends baseLocal {
        knock(nx, ny, power, lift = 0, source = null) {
          const APPLIED_POWER = resolveKnockback(power, source, this);
          this.vx += nx * APPLIED_POWER;
          this.vy += ny * APPLIED_POWER;
          this.vz = Math.max(this.vz, lift * (power > 0 ? APPLIED_POWER / power : 0));
          this.stun = Math.max(this.stun, resolveStatusDuration(0.5, source, this));
          this.flash = 0.18;
        }
        integrate(dt) {
          this.x += this.vx * dt;
          this.y += this.vy * dt;
          if (this.z > 0 || this.vz > 0) {
            this.vz -= CONFIG.physics.gravity * dt;
            this.z += this.vz * dt;
            if (this.z < 0) {
              this.z = 0;
              if (this.vz < -3) {
                this.vz = -this.vz * 0.24;
                this.bounce = 0.22;
              } else {
                this.vz = 0;
              }
            }
          }
          const DRAG = Math.exp(-(this.z > 0.04 ? 0.8 : 5) * dt);
          this.vx *= DRAG;
          this.vy *= DRAG;
          this.stun = Math.max(0, this.stun - dt);
          this.flash = Math.max(0, this.flash - dt);
          this.bounce = Math.max(0, this.bounce - dt);
        }
      };
      ARENA_GEOMETRY = {
        bounds(scene = "raid", margin = 0) {
          const ARENA = CONFIG[scene].arena;
          return {
            x: ARENA.radiusX - margin,
            y: ARENA.radiusY - margin
          };
        },
        inside(p, scene = "raid", margin = 0) {
          const R_LOCAL = this.bounds(scene, margin);
          return p.x * p.x / (R_LOCAL.x * R_LOCAL.x) + p.y * p.y / (R_LOCAL.y * R_LOCAL.y) <= 1;
        },
        clamp(p, scene = "raid", margin = 0) {
          const R_LOCAL = this.bounds(scene, margin), K = Math.max(1, Math.hypot(p.x / R_LOCAL.x, p.y / R_LOCAL.y));
          return {
            x: p.x / K,
            y: p.y / K
          };
        },
        segmentInsideCircle(x, y, tx, ty, cx, cy, radius) {
          const DX = tx - x, DY = ty - y, LENGTH = DX * DX + DY * DY, Q = LENGTH > 1e-12 ? CLAMP2(((cx - x) * DX + (cy - y) * DY) / LENGTH, 0, 1) : 0;
          return (x + DX * Q - cx) ** 2 + (y + DY * Q - cy) ** 2 < radius * radius - 1e-10;
        },
        overlaps(a, b) {
          return a.z <= b.z + b.height && a.z + a.height >= b.z && Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius;
        },
        // Swept XY cylinder versus finite Z interval; includes entity radii, never center-only.
        sweep(a, b, r, h, target) {
          const DX = b.x - a.x, DY = b.y - a.y, DZ = b.z - a.z, R2 = r + target.radius;
          let lo = 0;
          let hi = 1;
          const A = DX * DX + DY * DY, B = 2 * ((a.x - target.x) * DX + (a.y - target.y) * DY), C = (a.x - target.x) ** 2 + (a.y - target.y) ** 2 - R2 * R2;
          if (A < 1e-12) {
            if (C > 0) {
              return null;
            }
          } else {
            const D = B * B - 4 * A * C;
            if (D < 0) {
              return null;
            }
            lo = Math.max(lo, (-B - Math.sqrt(D)) / (2 * A));
            hi = Math.min(hi, (-B + Math.sqrt(D)) / (2 * A));
          }
          const BOTTOM = target.z - h, TOP = target.z + target.height;
          if (Math.abs(DZ) < 1e-12) {
            if (a.z < BOTTOM || a.z > TOP) {
              return null;
            }
          } else {
            let x = (BOTTOM - a.z) / DZ;
            let y = (TOP - a.z) / DZ;
            if (x > y) {
              [x, y] = [y, x];
            }
            lo = Math.max(lo, x);
            hi = Math.min(hi, y);
          }
          if (lo > hi || hi < 0 || lo > 1) {
            return null;
          }
          const T = CLAMP2(lo, 0, 1);
          return {
            x: a.x + DX * T,
            y: a.y + DY * T,
            z: a.z + DZ * T,
            t: T
          };
        }
      };
      BALLISTICS = {
        create(from, to, kind) {
          const DISTANCE = Math.hypot(to.x - from.x, to.y - from.y), MELEE = kind === "ram" || kind === "punch";
          return {
            from: {
              x: from.x,
              y: from.y,
              z: kind === "lob" ? 0.45 : 0
            },
            to: {
              ...to
            },
            height: MELEE ? 0 : kind === "lob" ? 2 : 2.7,
            duration: MELEE ? Math.max(0.12, DISTANCE / 10) : 0.65 + DISTANCE * 0.055
          };
        },
        sample(path, q, output = {}) {
          q = CLAMP2(q, 0, 1);
          output.x = path.from.x + (path.to.x - path.from.x) * q;
          output.y = path.from.y + (path.to.y - path.from.y) * q;
          output.z = path.from.z * (1 - q) + 4 * path.height * q * (1 - q);
          return output;
        }
      };
      FARM_BOSS_PHASES = createFarmBossEventPhases(CONFIG);
      PROJECTILE_BEHAVIORS = createProjectileBehaviors({ Ballistics: BALLISTICS, ArenaGeometry: ARENA_GEOMETRY });
      FARM_MODES = createFarmModeBehaviors(CONFIG);
      BOSS_BEHAVIORS = createBossPatternBehaviors({
        CONFIG,
        ArenaGeometry: ARENA_GEOMETRY,
        Ballistics: BALLISTICS,
        clamp: CLAMP2
      });
      AttackCycle = class {
        constructor(owner) {
          this.owner = owner;
          this.motionPoint = { x: 0, y: 0, z: 0 };
          this.phase = "idle";
          this.elapsed = 0;
          this.action = null;
          this._attackSpeedMultiplier = 1;
        }
        get spec() {
          return abilityProfile(this.owner.species);
        }
        get composition() {
          return unitCapabilityComposition(this.owner.species);
        }
        attackSpeedMultiplier(sim) {
          return WheatCommandModel.attackSpeedMultiplier(this.owner, sim.simulationTick);
        }
        attackRecoverySecondsFor(multiplier) {
          const U = this.owner, BASE_ATTACK_SPEED = baseUnitStatsFor(U.tier, U.species).attackSpeed;
          return scaleAttackRecovery(this.spec.timing.recovery, U, {
            attackSpeed: BASE_ATTACK_SPEED * multiplier
          });
        }
        attackRecoverySeconds(sim) {
          return this.attackRecoverySecondsFor(this.attackSpeedMultiplier(sim));
        }
        syncAttackSpeedMultiplier(tick) {
          const NEXT_MULTIPLIER = WheatCommandModel.attackSpeedMultiplier(this.owner, tick), PREVIOUS_MULTIPLIER = this._attackSpeedMultiplier;
          if (this.phase === "recover" && NEXT_MULTIPLIER !== PREVIOUS_MULTIPLIER) {
            const PREVIOUS_RECOVERY = this.attackRecoverySecondsFor(PREVIOUS_MULTIPLIER), NEXT_RECOVERY = this.attackRecoverySecondsFor(NEXT_MULTIPLIER);
            if (PREVIOUS_RECOVERY > 0) {
              this.elapsed = Math.min(NEXT_RECOVERY, this.elapsed * NEXT_RECOVERY / PREVIOUS_RECOVERY);
            }
          }
          this._attackSpeedMultiplier = NEXT_MULTIPLIER;
        }
        begin(sim, target) {
          const U = this.owner;
          if (this.phase !== "idle" || U.down > 0 || U.stun > 0 || U.z > 0.1 || U.landingRecovery > 0) {
            return false;
          }
          this.phase = "windup";
          this.elapsed = 0;
          this.action = {
            id: ++sim.attackSerial,
            target: {
              ...target
            },
            targetId: target.id ?? "boss",
            targetGeneration: target.generation ?? (target.id === "boss" ? sim.boss.generation : sim._unitForId(target.id)?.generation ?? 0),
            hit: false,
            path: null
          };
          this.prepareAttack?.(sim);
          U.angle = Math.atan2(target.y - U.y, target.x - U.x);
          U.vx = U.vy = 0;
          sim.combatEvent("prepare", U, this.action, this);
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
          this.syncAttackSpeedMultiplier(sim.simulationTick);
          this.phase = "recover";
          this.elapsed = 0;
          const U = this.owner;
          if (recoil) {
            U.vx = -Math.cos(U.angle) * 2.2;
            U.vy = -Math.sin(U.angle) * 2.2;
          }
          sim.combatEvent("recover", U, this.action, this);
        }
        ready() {
          this.phase = "idle";
          this.action = null;
          this.elapsed = 0;
        }
        update(sim, dt) {
          const U = this.owner;
          if (U.stun > 0 || U.down > 0) {
            this.interrupt();
            return true;
          }
          if (this.action && (this.phase === "windup" || this.phase === "active") && !(sim.attackTarget(U, this.action)?.hp > 0)) {
            this.interrupt();
            return true;
          }
          if (this.phase === "recover") {
            this.syncAttackSpeedMultiplier(sim.simulationTick);
          }
          if (this.phase === "idle") {
            return false;
          }
          if (this.phase !== "active") {
            this.elapsed += dt;
          }
          if (this.phase === "windup") {
            U.vx *= Math.exp(-dt * 18);
            U.vy *= Math.exp(-dt * 18);
            if (this.elapsed >= this.spec.timing.windup) {
              this.action.motionDelay = Math.max(0, dt - (this.elapsed - this.spec.timing.windup));
              this.elapsed = 0;
              this.phase = "active";
              this.createAttackPath();
              sim.combatEvent("launch", U, this.action, this);
              this.onLaunch?.(sim, this.action);
              this.launchAttack?.(sim);
            }
          } else if (this.phase === "recover") {
            this.updateRecovery?.(sim);
            if (this.elapsed >= this.attackRecoverySeconds(sim)) {
              this.ready();
            }
          }
          return true;
        }
      };
      CREATE_UNIT_ATTACK_CYCLE = composeUnitAttackCycles(AttackCycle, {
        ArenaGeometry: ARENA_GEOMETRY,
        Ballistics: BALLISTICS,
        CONFIG
      });
      CREATE_UNIT_SPECIAL_ABILITY = (owner) => CREATE_UNIT_ATTACK_CYCLE.createSpecial(owner);
      SIMULATION_SCENES = createSimulationScenes({
        config: CONFIG,
        stats: STATS,
        createUnitAttackCycle: CREATE_UNIT_ATTACK_CYCLE,
        farmModes: FARM_MODES,
        bossEventPhases: FARM_BOSS_PHASES
      });
      ATTACKING_BODY = (baseLocal) => class extends baseLocal {
        constructor(...args) {
          super(...args);
          this.ability = null;
        }
        // Assigned after the unit profile is known.
        knock(...args) {
          const SOURCE = args[4] || null;
          this.ability.interrupt();
          this.specialAbility?.interrupt();
          super.knock(...args);
          if (SOURCE && areOpposingFactions(SOURCE, this) && hasFaction(SOURCE, FACTION_CONFIG.ENEMY)) {
            this.peaRecoveryPending = true;
          }
        }
        integrate(dt) {
          if (this.moveControlActive && this.stun <= 0 && this.down <= 0) {
            const RATE = 1 - Math.exp(-dt * 3);
            this.vx += (this.moveControlVx - this.vx) * RATE;
            this.vy += (this.moveControlVy - this.vy) * RATE;
          }
          const ATTACK2 = this.specialAbility && this.specialAbility.phase !== "idle" ? this.specialAbility : this.ability;
          if (!ATTACK2.integrate(dt)) {
            super.integrate(dt);
          }
        }
      };
      UNIT = class Unit extends ATTACKING_BODY(KNOCKABLE(BODY)) {
        constructor(id, species, tier, x, y) {
          super(x, y);
          Object.assign(this, {
            id,
            generation: 0,
            species,
            tier,
            permanentStatMultiplier: 1,
            faction: FACTION_CONFIG.PLAYER,
            meals: 0,
            growth: 0,
            growthElapsed: 0,
            growthDuration: CONFIG.farm.breeding.growthSeconds,
            age: 0,
            cooldown: 0,
            cooldownDuration: 0,
            mateId: 0,
            perceptionRange: CONFIG.unit.perceptionRange,
            home: {
              x,
              y
            },
            hp: STATS(tier, species).maxHp,
            down: 0,
            seed: id * 2.39996,
            ownerId: "",
            farmId: 0,
            plotId: INITIAL_FARM_PLOT_ID,
            dropLanded: true,
            isBattleOnlySummon: false,
            battleSummonKind: "",
            battleSummonParentId: 0,
            battleSummonParentGeneration: 0,
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
            chestnutNextThornTick: 0,
            landingRecovery: 0,
            specialAbility: null,
            kidneyLeapReadyTick: 0,
            kidneyLeapLastUseTick: 0,
            peaRecoveryPending: false,
            peaRecoveryBoostExpiresAtTick: 0,
            peaRecoveryBoostMultiplier: 0,
            walnutNextGuardTick: 0,
            walnutGuardUntilTick: 0,
            walnutStoredRawDamage: 0,
            wheatCommandUntil: 0,
            wheatCommandCritBonus: 0,
            wheatCommandBuffs: [],
            barleyArmorBreakUntil: 0,
            barleyArmorBreakReduction: 0,
            barleyArmorShredBuckets: Array.from({ length: 60 }, () => ({ expiresAtTick: 0, amount: 0 })),
            giantUntil: 0,
            giantEndedAt: -10,
            isFormationClone: false,
            cloneBornAt: -10
          });
          this.ability = CREATE_UNIT_ATTACK_CYCLE(this);
          this.specialAbility = CREATE_UNIT_ATTACK_CYCLE.createSpecial(this);
          Object.defineProperties(this, {
            onDied: { value: new Signal() },
            onRevived: { value: new Signal() },
            onHealthChanged: { value: new Signal() }
          });
        }
        setHealth(value) {
          const PREVIOUS = this.hp;
          this.hp = value;
          if (PREVIOUS !== value) {
            this.onHealthChanged.emit({ unitId: this.id, previousHp: PREVIOUS, hp: value });
          }
        }
        die() {
          this.ability.resetCombatEffects?.();
          if (this.deathSplitHandled) {
            return false;
          }
          this.deathSplitHandled = true;
          this.onDied.emit({ unitId: this.id, x: this.x, y: this.y, z: this.z });
          return true;
        }
        revive(maxHp) {
          Object.assign(this, {
            hp: maxHp,
            down: 0,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            stun: 0,
            flash: 0,
            bounce: 0,
            angle: 0,
            deathSplitHandled: false
          });
          this.ability = CREATE_UNIT_ATTACK_CYCLE(this);
          this.specialAbility = CREATE_UNIT_ATTACK_CYCLE.createSpecial(this);
          this.peaRecoveryPending = false;
          this.peaRecoveryBoostExpiresAtTick = 0;
          this.peaRecoveryBoostMultiplier = 0;
          this.onRevived.emit({ unitId: this.id, x: this.x, y: this.y, hp: this.hp });
        }
        dispose() {
          this.ability.resetCombatEffects?.();
          this.onDied.clear();
          this.onRevived.clear();
          this.onHealthChanged.clear();
          this.onDied.scope = this.onRevived.scope = this.onHealthChanged.scope = null;
        }
        get giantScale() {
          return this.giantUntil > (this._world?.time ?? 0) ? 3 : 1;
        }
        get radius() {
          return (0, import_definition51.unitBodyRadius)(this) * this.giantScale;
        }
        get mature() {
          return this.growthElapsed >= this.growthDuration - 1e-9;
        }
        get fed() {
          return this.meals >= 1;
        }
        get size() {
          return (0, import_definition51.unitVisualSize)(this) * this.giantScale;
        }
        get bodyScale() {
          return (0, import_definition51.unitVectorScale)(this) * this.giantScale;
        }
        get height() {
          return (0, import_definition51.unitBodyHeight)(this) * this.giantScale;
        }
        get bodyHeight() {
          return (0, import_definition51.unitTorsoHeight)(this) * this.giantScale;
        }
      };
      GARDEN = class Garden {
        constructor(seed = 731) {
          this.seed = seed;
          this.notices = [];
          this.eventSequence = 0;
          this.mergeTasks = [];
          this.unitSpatial = new FixedSpatialGrid();
          this.foodSpatial = new FixedSpatialGrid();
          this._unitById = /* @__PURE__ */ new Map();
          this._unitStepOrder = /* @__PURE__ */ new Map();
          this._unitAliveState = /* @__PURE__ */ new Map();
          this._liveFactionCounts = /* @__PURE__ */ new Map();
          this._foodOrder = /* @__PURE__ */ new Map();
          this._speciesGroups = Array.from(
            {
              length: CONFIG.unit.speciesCount
            },
            () => []
          );
          this._speciesTierGroups = Array.from(
            {
              length: CONFIG.unit.speciesCount * (CONFIG.unit.maxTier + 1)
            },
            () => []
          );
          this._mergeEligibleGroups = Array.from(
            {
              length: CONFIG.unit.speciesCount * (CONFIG.unit.maxTier + 1)
            },
            () => []
          );
          this._ownedSpeciesCounts = new Int32Array(CONFIG.unit.speciesCount);
          this._stepUnits = [];
          this._unitCandidates = [];
          this._foodCandidates = [];
          this._groundedFoods = [];
          this._groundedFoodsScratch = [];
          this._groundedFoodCount = 0;
          this._groundedFoodRevision = 0;
          this._foodSearchSnapshot = { revision: 0, foods: this._groundedFoods, cells: /* @__PURE__ */ new Map() };
          this._inactiveFoodClaims = /* @__PURE__ */ new Map();
          this._foodSearchStates = /* @__PURE__ */ new WeakMap();
          this._foodSearchJobSequence = 0;
          this._foodSearchScheduler = null;
          this._foodSearchWork = { candidateChecks: 0, cellVisits: 0 };
          this._lastFoodSearchSchedulerMetrics = null;
          this._contactPending = [];
          this._contactQuery = [];
          this._contactCorrectionX = new Float64Array(0);
          this._contactCorrectionY = new Float64Array(0);
          this._contactCorrectionCount = new Uint32Array(0);
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
          for (const KEY2 of [
            "unitSpatial",
            "foodSpatial",
            "_unitById",
            "_unitStepOrder",
            "_unitAliveState",
            "_liveFactionCounts",
            "_foodOrder",
            "_speciesGroups",
            "_speciesTierGroups",
            "_mergeEligibleGroups",
            "_ownedSpeciesCounts",
            "_stepUnits",
            "_unitCandidates",
            "_foodCandidates",
            "_groundedFoods",
            "_groundedFoodsScratch",
            "_groundedFoodCount",
            "_groundedFoodRevision",
            "_foodSearchSnapshot",
            "_foodSearchStates",
            "_foodSearchJobSequence",
            "_foodSearchScheduler",
            "_foodSearchWork",
            "_lastFoodSearchSchedulerMetrics",
            "_contactPending",
            "_contactQuery",
            "_contactCorrectionX",
            "_contactCorrectionY",
            "_contactCorrectionCount",
            "_bossGridUnits",
            "_bossGroundUnits",
            "_bossQueryCandidates",
            "_bossHitCandidates",
            "_mergeNearestScratch",
            "_mergeMaterialsScratch",
            "_mergeIdScratch",
            "_spatialStepActive",
            "_spatialQueryDepth",
            "_unitSpatialDirty",
            "_foodSpatialDirty"
          ]) {
            Object.defineProperty(this, KEY2, {
              enumerable: false
            });
          }
          const NOTIFICATIONS = new MutationNotifications();
          Object.defineProperties(this, {
            mutationNotifications: { value: NOTIFICATIONS },
            unitCollection: { value: new UnitCollection(this, UNIT, NOTIFICATIONS) },
            roster: { value: null, writable: true },
            onProgressChanged: { value: new Signal(NOTIFICATIONS) },
            onNotice: { value: new Signal(NOTIFICATIONS) },
            onCombatResolved: { value: new Signal(NOTIFICATIONS, true) },
            units: {
              enumerable: true,
              get: () => this.scene === "farm" ? this.unitCollection.unitsInPlot(this.activePlotId) : this.unitCollection.items,
              // Retain the public assignment API, with owner validation and
              // cleanup rather than replacing a borrowed array directly.
              set: (units) => {
                this.resetUnits(units);
              }
            },
            progressRevision: {
              value: 0,
              writable: true
            },
            _progressTimerCheckpoint: {
              value: 0,
              writable: true
            },
            mergeTaskRevision: {
              value: 0,
              writable: true
            },
            mergeAvailabilityRevision: {
              value: 0,
              writable: true
            }
          });
          this.roster = new FarmingRoster(this.unitCollection);
          this.reset();
          Object.defineProperty(this, "formationSkills", { value: new FormationSkills(this) });
          Object.defineProperty(this, "raidDeploymentCards", { value: new RaidDeploymentCards(this) });
        }
        get mergeTask() {
          return this.mergeTasks[0] || null;
        }
        _markMergeTasksChanged() {
          this.mergeTaskRevision++;
          this._markMergeAvailabilityChanged();
        }
        _markMergeAvailabilityChanged() {
          this.mergeAvailabilityRevision++;
        }
        isMergeTaskMaterial(unit) {
          return this.unitCollection.reservationOwner(unit)?.startsWith("merge:") || false;
        }
        _pendingMergeCost(species, excludedTask = null) {
          let cost = 0;
          for (const TASK of this.mergeTasks) {
            if (TASK !== excludedTask && TASK.phase === "approach" && TASK.sourceSpecies === species) {
              cost += TASK.materialIds.length - 1;
            }
          }
          return cost;
        }
        _rebuildUnitSpatialIndex(stepUnits = this.units) {
          const SPATIAL_START = this.profiler?.start();
          const GRID = this.unitSpatial;
          GRID.clear();
          this._unitById.clear();
          this._unitStepOrder.clear();
          this._unitAliveState.clear();
          this._liveFactionCounts.clear();
          this._ownedSpeciesCounts.fill(0);
          for (const GROUP of this._speciesGroups) {
            GROUP.length = 0;
          }
          for (const GROUP of this._speciesTierGroups) {
            GROUP.length = 0;
          }
          for (const UNIT_LOCAL of this.units) {
            GRID.insert(UNIT_LOCAL);
            this._unitById.set(UNIT_LOCAL.id, UNIT_LOCAL);
            if (UNIT_LOCAL.species >= 0 && UNIT_LOCAL.species < CONFIG.unit.speciesCount) {
              this._speciesGroups[UNIT_LOCAL.species].push(UNIT_LOCAL);
              this._ownedSpeciesCounts[UNIT_LOCAL.species] += UNIT_LOCAL.isBattleOnlySummon ? 0 : 1;
              const TIER = Math.max(0, Math.min(CONFIG.unit.maxTier, UNIT_LOCAL.tier | 0));
              this._speciesTierGroups[UNIT_LOCAL.species * (CONFIG.unit.maxTier + 1) + TIER].push(UNIT_LOCAL);
            }
            if (UNIT_LOCAL.hp > 0 && typeof UNIT_LOCAL.faction === "string") {
              this._liveFactionCounts.set(
                UNIT_LOCAL.faction,
                (this._liveFactionCounts.get(UNIT_LOCAL.faction) || 0) + 1
              );
            }
            this._unitAliveState.set(UNIT_LOCAL, UNIT_LOCAL.hp > 0);
          }
          this._syncOwnedSpeciesCounts();
          for (let index = 0; index < stepUnits.length; index++) {
            this._unitStepOrder.set(stepUnits[index], index);
          }
          this._unitSpatialDirty = false;
          this.profiler?.end("spatial", SPATIAL_START);
        }
        _refreshFoodSearchSnapshot() {
          const CELLS = /* @__PURE__ */ new Map();
          for (const KEY2 of this.foodSpatial.usedCells) {
            const BUCKET = this.foodSpatial.cells[KEY2];
            if (BUCKET?.length) {
              CELLS.set(KEY2, BUCKET.slice());
            }
          }
          this._foodSearchSnapshot = {
            revision: this._groundedFoodRevision,
            foods: this._groundedFoods,
            cells: CELLS
          };
        }
        _rebuildFoodSpatialIndex() {
          const SPATIAL_START = this.profiler?.start(), PREVIOUS_FOODS = this._groundedFoods, NEXT_FOODS = this._groundedFoodsScratch;
          this.foodSpatial.clear();
          this._foodOrder.clear();
          NEXT_FOODS.length = 0;
          let grounded = 0;
          for (let index = 0; index < this.food.length; index++) {
            const FOOD = this.food[index];
            this._foodOrder.set(FOOD, index);
            if (FOOD.phase === "grounded") {
              this.foodSpatial.insert(FOOD);
              NEXT_FOODS.push(FOOD);
              grounded++;
            }
          }
          const CHANGED = NEXT_FOODS.length !== PREVIOUS_FOODS.length || NEXT_FOODS.some((food, index) => food !== PREVIOUS_FOODS[index]);
          this._groundedFoodCount = grounded;
          if (CHANGED) {
            this._groundedFoodRevision++;
            this._groundedFoods = NEXT_FOODS;
            this._groundedFoodsScratch = [];
          } else {
            NEXT_FOODS.length = 0;
          }
          if (this._foodSearchSnapshot.revision !== this._groundedFoodRevision) {
            this._refreshFoodSearchSnapshot();
          }
          this._foodSpatialDirty = false;
          this.profiler?.end("spatial", SPATIAL_START);
        }
        _trackFoodAdded(food) {
          if (!this._spatialStepActive) {
            this._foodSpatialDirty = true;
            if (food.phase === "grounded") {
              this._groundedFoodRevision++;
            }
            return;
          }
          this._foodOrder.set(food, this.food.length - 1);
          if (food.phase === "grounded") {
            this.foodSpatial.insert(food);
            this._groundedFoodCount = (this._groundedFoodCount || 0) + 1;
            this._groundedFoodRevision++;
          }
        }
        consumeGroundFood(food) {
          if (food?.phase !== "grounded" || !this.foodSpatial.itemCells.has(food)) {
            return false;
          }
          const INDEX = this.food.indexOf(food);
          if (INDEX < 0) {
            return false;
          }
          this.food.splice(INDEX, 1);
          this.foodSpatial.remove(food);
          this._foodOrder.delete(food);
          this._groundedFoodCount = Math.max(0, this._groundedFoodCount - 1);
          this._groundedFoodRevision++;
          return true;
        }
        _trackUnitAdded(unit) {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._unitSpatialDirty = true;
            return;
          }
          this.unitSpatial.insert(unit);
          this._unitById.set(unit.id, unit);
          this._unitStepOrder.set(unit, -1);
          if (unit.species >= 0 && unit.species < CONFIG.unit.speciesCount) {
            this._speciesGroups[unit.species].push(unit);
            this._ownedSpeciesCounts[unit.species] = this.unitCollection.residentCountsBySpecies.get(unit.species) || 0;
            const TIER = Math.max(0, Math.min(CONFIG.unit.maxTier, unit.tier | 0));
            this._speciesTierGroups[unit.species * (CONFIG.unit.maxTier + 1) + TIER].push(unit);
          }
          if (unit.hp > 0 && typeof unit.faction === "string") {
            this._liveFactionCounts.set(unit.faction, (this._liveFactionCounts.get(unit.faction) || 0) + 1);
          }
          this._unitAliveState.set(unit, unit.hp > 0);
        }
        _trackUnitRemoved(unit, { keepStepSnapshot = false } = {}) {
          this._cancelFoodTargetSearch(unit);
          this.clearPeaRecoveryBoost(unit);
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._unitSpatialDirty = true;
            return;
          }
          this._unitById.delete(unit.id);
          this._syncUnitAliveCount(unit);
          if (unit.hp > 0 && typeof unit.faction === "string") {
            this._adjustFactionCount(unit.faction, -1);
          }
          this._unitAliveState.set(unit, false);
          if (unit.species >= 0 && unit.species < CONFIG.unit.speciesCount) {
            this._removeGroupItem(this._speciesGroups[unit.species], unit);
            const TIER = Math.max(0, Math.min(CONFIG.unit.maxTier, unit.tier | 0));
            this._removeGroupItem(this._speciesTierGroups[unit.species * (CONFIG.unit.maxTier + 1) + TIER], unit);
            if (!unit.isBattleOnlySummon) {
              this._ownedSpeciesCounts[unit.species] = this.unitCollection.residentCountsBySpecies.get(unit.species) || 0;
            }
          }
          if (!keepStepSnapshot || !this._unitStepOrder.has(unit) || this._unitStepOrder.get(unit) < 0) {
            this.unitSpatial.remove(unit);
            this._unitStepOrder.delete(unit);
          }
        }
        _cancelFoodTargetSearch(unit) {
          const STATE = this._foodSearchStates?.get(unit);
          if (!STATE) {
            return false;
          }
          this._foodSearchStates.delete(unit);
          return this._foodSearchScheduler?.cancel(STATE.key) ?? false;
        }
        clearFoodTargetSearch(unit) {
          this._cancelFoodTargetSearch(unit);
        }
        _removeGroupItem(group, item) {
          const INDEX = group.indexOf(item);
          if (INDEX >= 0) {
            group.splice(INDEX, 1);
          }
        }
        _adjustFactionCount(faction, delta) {
          const NEXT = (this._liveFactionCounts.get(faction) || 0) + delta;
          if (NEXT > 0) {
            this._liveFactionCounts.set(faction, NEXT);
          } else {
            this._liveFactionCounts.delete(faction);
          }
        }
        _syncUnitAliveCount(unit) {
          const WAS_ALIVE = this._unitAliveState?.get(unit);
          const IS_ALIVE = unit.hp > 0;
          if (WAS_ALIVE === IS_ALIVE) {
            return;
          }
          if (!this._unitAliveState) {
            this._unitAliveState = /* @__PURE__ */ new Map();
          }
          this._unitAliveState.set(unit, IS_ALIVE);
          if (typeof unit.faction === "string") {
            this._adjustFactionCount(unit.faction, IS_ALIVE ? 1 : -1);
          }
        }
        _unitForId(id) {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._rebuildUnitSpatialIndex(this.units);
          }
          return this._unitById.get(id);
        }
        _unitIsActive(unit) {
          return this._unitById.get(unit?.id) === unit;
        }
        _beginSpatialQueryBatch() {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._rebuildUnitSpatialIndex(this.units);
          }
          this._spatialQueryDepth++;
        }
        _endSpatialQueryBatch() {
          this._spatialQueryDepth = Math.max(0, this._spatialQueryDepth - 1);
        }
        _collectContactOrders(unit, minimumOrder, maximumOrder, out) {
          const RADIUS = unit.radius + CONFIG.unit.maxRadius + 0.22;
          this.unitSpatial.queryAABB(
            unit.x - RADIUS,
            unit.y - RADIUS,
            unit.x + RADIUS,
            unit.y + RADIUS,
            this._contactQuery
          );
          out.length = 0;
          for (const CANDIDATE of this._contactQuery) {
            const ORDER = this._unitStepOrder.get(CANDIDATE);
            if (ORDER !== void 0 && ORDER >= minimumOrder && ORDER <= maximumOrder) {
              out.push(ORDER);
            }
          }
          out.sort((a, b) => a - b);
          return out;
        }
        _collectBossTargets(minX, minY, maxX, maxY, out, groundOnly = false) {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._rebuildUnitSpatialIndex(this.units);
          }
          this.unitSpatial.queryAABB(minX, minY, maxX, maxY, out);
          let length = 0;
          for (let index = 0; index < out.length; index++) {
            const UNIT_LOCAL = out[index];
            if (this._unitIsActive(UNIT_LOCAL) && hasFaction(UNIT_LOCAL, FACTION_CONFIG.PLAYER) && UNIT_LOCAL.hp > 0 && UNIT_LOCAL.dropLanded && (!groundOnly || UNIT_LOCAL.z <= 0.1)) {
              out[length++] = UNIT_LOCAL;
            }
          }
          out.length = length;
          out.sort((a, b) => a.id - b.id);
          return out;
        }
        static createRaidBattle(seed = 731, expectedPlayers = ["solo"], bossStage = null) {
          const W = new GARDEN(seed);
          W.resetUnits();
          W.food = [];
          W.scene = "raid";
          W.running = false;
          W.boss = W.createBoss(bossStage?.species ?? W.randomBossSpecies());
          if (bossStage?.stage !== void 0) {
            W.configureBossStage(bossStage.stage, bossStage.species);
          }
          W.encounter = {
            outcome: "idle",
            elapsed: 0
          };
          W.raidExpectedPlayers = [...expectedPlayers];
          W.raidRosters = [];
          W.raidDeploymentStarted = false;
          W.nextId = 1;
          W.starter = 0;
          return W;
        }
        reset() {
          return this.mutateUnits(this._reset);
        }
        _reset() {
          this._foodSearchScheduler?.dispose();
          this._foodSearchScheduler = CREATE_BUDGETED_SCHEDULER({ unitsPerTick: 24, quantumUnits: 1 });
          this._lastFoodSearchSchedulerMetrics = this._foodSearchScheduler.metrics;
          this._foodSearchStates = /* @__PURE__ */ new WeakMap();
          this._foodSearchJobSequence = 0;
          this._foodSearchWork = { candidateChecks: 0, cellVisits: 0 };
          this._groundedFoods = [];
          this._groundedFoodsScratch = [];
          this._groundedFoodCount = 0;
          this._groundedFoodRevision = 0;
          this._foodSearchSnapshot = { revision: 0, foods: this._groundedFoods, cells: /* @__PURE__ */ new Map() };
          this.formationSkills?.end();
          this.formationRuntime = createFormationRuntime();
          this.progressRevision = 0;
          this._progressTimerCheckpoint = 0;
          this.cancelMergeTasks();
          this.cancelBreedPlans();
          this._breedPlans = /* @__PURE__ */ new Map();
          this._activeBreedReservations = /* @__PURE__ */ new Map();
          this._breedPlotReservations = /* @__PURE__ */ new Map();
          this._stepUnits.length = 0;
          this.corpseRecoveryVersion = 1;
          this.rng = new SEEDED_PRNG(this.seed);
          this.resetUnits();
          this.food = [];
          this.effects = [];
          this.events = [];
          this.time = 0;
          this.simulationTick = 0;
          this.nextId = 1;
          this.entityGenerationSerial = 0;
          this.nextBossEncounterId = 1;
          this.bossRewardReceipts = [];
          this.bossRewardStreams = createBossRewardStreams(this.seed >>> 0);
          this.bossRewardInventory = [];
          this.bossRewardWatermarks = {
            farm: 0,
            raid: 0
          };
          this.nextRaidRunSequence = 0;
          this.activeRaidRunSequence = null;
          this.activeRaidSessionId = null;
          this.raidSettlementWatermark = 0;
          this.raidSettlementReceipts = [];
          this.playerProgression = createPlayerProgressionState();
          this.activePlotId = this.playerProgression.farmPlots.currentPlotId;
          this.farmPlots = new Map(
            this.playerProgression.farmPlots.plots.map((state) => [state.id, new FarmPlot(state)])
          );
          this.food = this.activeFarmPlot.food;
          this.warehouseFood = 0;
          this.starter = 0;
          this.notices = [];
          this.eventSequence = 0;
          this.foodTaps = {
            remainder: 0,
            autoClock: 0,
            produced: 0,
            revision: 0
          };
          this.projectiles = [];
          this.cornAttachments = CornAttachmentModel.createManager();
          this.attackSerial = 0;
          this.projectileSerial = 0;
          this.raidSummonSerial = 0;
          this.bossSummonSerial = 0;
          this.combatLog = [];
          this.farmBossProgress = createFarmBossProgress(this.seed);
          this.scene = "farm";
          this.running = false;
          this.encounter = {
            outcome: "idle",
            elapsed: 0
          };
          this.farmBossEvent = {
            phase: "idle",
            elapsed: 0,
            outcome: "idle",
            encounterId: 0,
            rewardStatus: "none",
            rewardChance: 0,
            rewardRoll: 0,
            rewardUnitId: 0
          };
          this.boss = this.createBoss();
          this.raidExpectedPlayers = ["solo"];
          this.raidRosters = [];
          this.raidDeploymentStarted = false;
          this.metrics = {
            births: 0,
            merges: 0,
            directHits: 0,
            contacts: 0,
            physicsSolverIterations: 0,
            landings: 0,
            basicHits: 0,
            sweepHits: 0
          };
          for (let i = 0; i < 2; i++) {
            const U = this.spawn(0, 1, (this.random() - 0.5) * 4, (this.random() - 0.5) * 3);
            U.meals = 0;
            U.growth = CONFIG.farm.breeding.matureMeals;
            U.growthDuration = this.breedGrowthDuration();
            U.growthElapsed = U.growthDuration;
          }
        }
        mutateUnits(action, a, b, c, d, e) {
          return this.mutationNotifications.run(action, this, a, b, c, d, e);
        }
        markProgressChanged() {
          if (this.scene === "farm") {
            this.progressRevision++;
            this.onProgressChanged.emit({ revision: this.progressRevision });
          }
        }
        hasProgressTimers() {
          return this.roster.residents().some((unit) => unit.down > 0 || unit.cooldown > 0 || !unit.mature);
        }
        _syncOwnedSpeciesCounts() {
          this._ownedSpeciesCounts.fill(0);
          for (const [SPECIES_ID, COUNT] of this.unitCollection.residentCountsBySpecies) {
            if (Number.isSafeInteger(SPECIES_ID) && SPECIES_ID >= 0 && SPECIES_ID < this._ownedSpeciesCounts.length) {
              this._ownedSpeciesCounts[SPECIES_ID] = COUNT;
            }
          }
        }
        get armyHealth() {
          return this.units.filter((u) => hasFaction(u, FACTION_CONFIG.PLAYER)).reduce(
            (sum, u) => {
              const MAX_HP = u.isFormationClone ? 1 : STATS(u.tier, u.species).maxHp;
              return {
                current: sum.current + Math.max(0, Math.min(MAX_HP, u.hp)),
                max: sum.max + MAX_HP,
                living: sum.living + (u.hp > 0 ? 1 : 0),
                total: sum.total + 1
              };
            },
            {
              current: 0,
              max: 0,
              living: 0,
              total: 0
            }
          );
        }
        get battleCapacity() {
          return SIMULATION_SCENES[this.scene].battleCapacity;
        }
        get capacity() {
          return this.activeFarmPlot?.capacity ?? CONFIG.farm.capacity.base;
        }
        get activeFarmPlot() {
          return this.farmPlots?.get(this.activePlotId) || null;
        }
        get ownedPopulation() {
          return this.roster.ownedPopulation();
        }
        get birthReservations() {
          return (this._breedPlans?.size || 0) + (this._activeBreedReservations?.size || 0);
        }
        get totalFarmCapacity() {
          let capacity = 0;
          for (const PLOT of this.farmPlots.values()) {
            capacity += PLOT.capacity;
          }
          return capacity;
        }
        get placedPopulation() {
          return this.roster.placedPopulation(this.activePlotId);
        }
        bindFarmPlotProgressionStates() {
          for (const PLOT of this.farmPlots.values()) {
            const STATE = this.playerProgression.farmPlots.plots.find((plot) => plot.id === PLOT.id);
            if (STATE) {
              PLOT.state = STATE;
            }
          }
        }
        get reservedPopulation() {
          return this.roster.placedPopulation(RESERVE_PLOT_ID);
        }
        get pendingRewardPopulation() {
          return (this.bossRewardReceipts || []).reduce(
            (total, receipt) => total + (Number.isSafeInteger(receipt.queuedCount) ? receipt.queuedCount : 0),
            0
          );
        }
        get farmTargets() {
          return this.playerProgression.farmPlots.targetBasisPoints;
        }
        canFarmPopulationAdvance(speciesId, options) {
          const RESERVATIONS = [
            ...[...this._breedPlans?.values() || []].map((plan) => plan.reservation),
            ...[...this._activeBreedReservations?.values() || []].map((plan) => plan.reservation)
          ];
          return this.roster.canSpeciesAdvance(speciesId, this.farmTargets[speciesId] || 0, {
            includeReservations: RESERVATIONS,
            excludeReservation: options?.excludeReservation ?? null
          });
        }
        clearInactiveForageAttempt(unit) {
          const ATTEMPT = unit?.inactiveForageAttempt;
          if (!ATTEMPT) {
            return false;
          }
          if (this._inactiveFoodClaims.get(ATTEMPT.food) === unit.id) {
            this._inactiveFoodClaims.delete(ATTEMPT.food);
          }
          unit.inactiveForageAttempt = null;
          return true;
        }
        startInactiveForageAttempt(unit, dt) {
          const PLOT = this.farmPlots.get(unit.plotId);
          if (!PLOT || PLOT.food.length === 0 || !this.canFarmPopulationAdvance(unit.species)) {
            return false;
          }
          let nearest = null, nearestDistance = Infinity;
          for (const FOOD of PLOT.food) {
            if (this._inactiveFoodClaims.has(FOOD) || FOOD.phase !== "grounded") {
              continue;
            }
            const DISTANCE = Math.hypot(FOOD.x - unit.x, FOOD.y - unit.y);
            if (DISTANCE < nearestDistance) {
              nearest = FOOD;
              nearestDistance = DISTANCE;
            }
          }
          if (!nearest) {
            return false;
          }
          const SPEED = Math.max(
            0.01,
            scaleMoveSpeed(2.2 * farmUpgradeRate(this.playerProgression.farmUpgrades, "growth"), unit)
          ), TICKS = Math.max(1, Math.ceil(nearestDistance / SPEED / Math.max(dt, 1e-9)));
          unit.inactiveForageAttempt = {
            plotId: PLOT.id,
            food: nearest,
            dueTick: this.simulationTick + TICKS
          };
          this._inactiveFoodClaims.set(nearest, unit.id);
          return true;
        }
        advanceInactiveForage(unit, dt) {
          if (unit.hp <= 0 || unit.fed || unit.plotId === RESERVE_PLOT_ID || unit.plotId === this.activePlotId || !this.canFarmPopulationAdvance(unit.species)) {
            this.clearInactiveForageAttempt(unit);
            return false;
          }
          let attempt = unit.inactiveForageAttempt;
          if (!attempt) {
            this.startInactiveForageAttempt(unit, dt);
            attempt = unit.inactiveForageAttempt;
          }
          if (!attempt || this.simulationTick < attempt.dueTick) {
            return false;
          }
          const PLOT = this.farmPlots.get(attempt.plotId), FOOD_INDEX = PLOT?.food.indexOf(attempt.food) ?? -1;
          if (!PLOT || unit.plotId !== PLOT.id || FOOD_INDEX < 0 || this._inactiveFoodClaims.get(attempt.food) !== unit.id || !this.canFarmPopulationAdvance(unit.species)) {
            this.clearInactiveForageAttempt(unit);
            return false;
          }
          PLOT.food.splice(FOOD_INDEX, 1);
          this.clearInactiveForageAttempt(unit);
          unit.meals = 1;
          this.markProgressChanged();
          return true;
        }
        availableFarmPlot(plotId = this.activePlotId) {
          const PLOT = this.farmPlots.get(plotId);
          return !!PLOT && this.roster.placedPopulation(plotId) < PLOT.capacity;
        }
        availableFarmPlotFor(species, preferredPlotId = this.activePlotId) {
          const RESIDENTS = this.roster.residents(), MATCHING_PLOTS = new Set(RESIDENTS.filter((unit) => unit.species === species).map((unit) => unit.plotId)), OCCUPANCY = new Map(
            [...this.farmPlots.keys()].map((id) => [
              id,
              this.roster.placedPopulation(id) + (this._breedPlotReservations?.get(id) || 0)
            ])
          ), PLOTS = [...this.farmPlots.values()];
          PLOTS.sort((a, b) => {
            const A_COUNT = OCCUPANCY.get(a.id), B_COUNT = OCCUPANCY.get(b.id), A_MATCH = MATCHING_PLOTS.has(a.id), B_MATCH = MATCHING_PLOTS.has(b.id);
            return Number(B_MATCH) - Number(A_MATCH) || Number(b.id === preferredPlotId) - Number(a.id === preferredPlotId) || A_COUNT - B_COUNT || a.id.localeCompare(b.id);
          });
          return PLOTS.find((plot) => OCCUPANCY.get(plot.id) < plot.capacity) || null;
        }
        switchFarmPlot(plotId) {
          if (this.scene !== "farm" || this.running || this.farmBossEvent?.phase !== "idle" || !this.farmPlots.has(plotId)) {
            return false;
          }
          if (plotId === this.activePlotId) {
            return true;
          }
          for (const UNIT_LOCAL of this.unitCollection.unitsInPlot(this.activePlotId)) {
            if (UNIT_LOCAL.mateId && !this.breedPlanFor(UNIT_LOCAL)) {
              this.releaseMate(UNIT_LOCAL);
            }
            this.clearFoodTargetSearch(UNIT_LOCAL);
          }
          this.activePlotId = plotId;
          for (const UNIT_LOCAL of this.unitCollection.unitsInPlot(plotId)) {
            this.clearInactiveForageAttempt(UNIT_LOCAL);
          }
          this.playerProgression.farmPlots.currentPlotId = plotId;
          this.food = this.activeFarmPlot.food;
          this._unitSpatialDirty = true;
          this._foodSpatialDirty = true;
          this._rebuildUnitSpatialIndex(this.units);
          this.markProgressChanged();
          return true;
        }
        unlockFarmPlot() {
          if (this.scene !== "farm" || this.running || this.farmBossEvent?.phase !== "idle" || this.playerProgression.availablePoints < 2) {
            return { ok: false, reason: this.playerProgression.availablePoints < 2 ? "insufficient-points" : "locked" };
          }
          const STATE = this.playerProgression.farmPlots, ID = `plot-${STATE.nextPlotNumber}`, PLOT_STATE = { id: ID, capacityLevel: 0 };
          STATE.plots.push(PLOT_STATE);
          STATE.nextPlotNumber++;
          this.playerProgression.availablePoints -= 2;
          this.farmPlots.set(ID, new FarmPlot(PLOT_STATE));
          this.restoreReservePopulation();
          this.markProgressChanged();
          return { ok: true, plotId: ID };
        }
        expandFarmPlot(plotId = this.activePlotId) {
          const PLOT = this.farmPlots.get(plotId);
          if (this.scene !== "farm" || this.running || this.farmBossEvent?.phase !== "idle" || !PLOT || !PLOT.canExpand() || this.playerProgression.availablePoints < 1) {
            return { ok: false, reason: !PLOT?.canExpand() ? "max-level" : "locked" };
          }
          PLOT.expand();
          this.playerProgression.availablePoints--;
          this.restoreReservePopulation();
          this.markProgressChanged();
          return { ok: true, capacity: PLOT.capacity };
        }
        restoreReservePopulation() {
          const RESERVE = this.roster.residents().filter((unit) => unit.plotId === RESERVE_PLOT_ID);
          if (!RESERVE.length) {
            return 0;
          }
          RESERVE.sort((a, b) => b.tier - a.tier || Number(b.mature) - Number(a.mature) || a.id - b.id);
          const OCCUPANCY = new Map(
            [...this.farmPlots.values()].map((plot) => [plot.id, this.roster.placedPopulation(plot.id)])
          ), SPECIES_BY_PLOT = new Map(
            [...this.farmPlots.keys()].map((plotId) => [
              plotId,
              new Set(
                this.roster.residents().filter((unit) => unit.plotId === plotId).map((unit) => unit.species)
              )
            ])
          ), ASSIGNMENTS = [];
          for (const UNIT_LOCAL of RESERVE) {
            const CANDIDATES = [...this.farmPlots.values()].filter((plot) => (OCCUPANCY.get(plot.id) || 0) < plot.capacity).sort(
              (a, b) => Number(SPECIES_BY_PLOT.get(b.id).has(UNIT_LOCAL.species)) - Number(SPECIES_BY_PLOT.get(a.id).has(UNIT_LOCAL.species)) || (OCCUPANCY.get(a.id) || 0) - (OCCUPANCY.get(b.id) || 0) || a.id.localeCompare(b.id)
            );
            const PLOT = CANDIDATES[0];
            if (!PLOT) {
              break;
            }
            ASSIGNMENTS.push({ unitId: UNIT_LOCAL.id, plotId: PLOT.id });
            OCCUPANCY.set(PLOT.id, OCCUPANCY.get(PLOT.id) + 1);
            SPECIES_BY_PLOT.get(PLOT.id).add(UNIT_LOCAL.species);
          }
          return this.unitCollection.moveUnitsToPlots(ASSIGNMENTS) ? ASSIGNMENTS.length : 0;
        }
        setSpeciesTarget(speciesId, basisPoints) {
          if (!Number.isSafeInteger(speciesId) || speciesId < 0 || speciesId >= CONFIG.unit.speciesCount || !Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 1e4) {
            return false;
          }
          const CURRENT = new Map(this.farmTargets.map((value, index) => [index, value])), NEXT = FarmingRoster.normalizeTargetBasisPoints(
            CURRENT,
            Array.from({ length: CONFIG.unit.speciesCount }, (_, id) => id),
            speciesId,
            basisPoints
          );
          if (!NEXT) {
            return false;
          }
          this.playerProgression.farmPlots.targetBasisPoints = Array.from(
            { length: CONFIG.unit.speciesCount },
            (_, id) => NEXT.get(id) || 0
          );
          this.markProgressChanged();
          return true;
        }
        sortActiveFarm(order = "mixed") {
          if (this.scene !== "farm" || this.running || this.farmBossEvent?.phase !== "idle" || this._breedPlans.size > 0 || !["species", "tier-high", "tier-low"].includes(order)) {
            return false;
          }
          const UNITS = this.unitCollection.residentsInPlot(this.activePlotId);
          for (const UNIT_LOCAL of UNITS) {
            if (this.unitCollection.reservationOwner(UNIT_LOCAL)?.startsWith("merge:")) {
              return false;
            }
            if (UNIT_LOCAL.mateId) {
              this.releaseMate(UNIT_LOCAL);
            }
          }
          UNITS.sort((a, b) => {
            if (order === "species") {
              return a.species - b.species || a.tier - b.tier || a.id - b.id;
            }
            if (order === "tier-high") {
              return b.tier - a.tier || a.species - b.species || a.id - b.id;
            }
            if (order === "tier-low") {
              return a.tier - b.tier || a.species - b.species || a.id - b.id;
            }
            return a.id - b.id;
          });
          if (!this.unitCollection.reorderWithinPlot(
            this.activePlotId,
            UNITS.map((unit) => unit.id)
          )) {
            return false;
          }
          UNITS.forEach((unitLocal, index) => {
            const ANGLE = index * 2.399963229728653 + (this.seed >>> 0) % 6283 / 1e3, RADIUS = Math.sqrt((index + 0.5) / Math.max(1, UNITS.length)) * 0.7;
            unitLocal.x = Math.cos(ANGLE) * CONFIG.farm.arena.radiusX * RADIUS;
            unitLocal.y = Math.sin(ANGLE) * CONFIG.farm.arena.radiusY * RADIUS;
            unitLocal.vx = unitLocal.vy = 0;
          });
          this._rebuildUnitSpatialIndex(this.units);
          return true;
        }
        breedCooldownDuration() {
          return getBreedCooldownSeconds(this.playerProgression?.farmUpgrades, CONFIG.farm.breeding.cooldownSeconds);
        }
        breedGrowthDuration() {
          return this.breedCooldownDuration() / 2;
        }
        abilityProgressionFor(unit) {
          if (hasFaction(unit, FACTION_CONFIG.ENEMY)) {
            return null;
          }
          return SIMULATION_SCENES[this.scene].progressionFor(this, unit);
        }
        highestSpeciesTiers() {
          const TIERS = Array(CONFIG.unit.speciesCount).fill(0);
          for (const UNIT_LOCAL of this.roster.residents()) {
            TIERS[UNIT_LOCAL.species] = Math.max(TIERS[UNIT_LOCAL.species], UNIT_LOCAL.tier);
          }
          return TIERS;
        }
        investAbilityNode(abilityId, nodeId) {
          const IN_COMBAT = this.running || this.farmBossEvent?.phase !== "idle";
          const RESULT = purchaseAbilityNode(this.playerProgression, abilityId, nodeId, {
            location: this.scene,
            inCombat: IN_COMBAT,
            highestSpeciesTier: this.highestSpeciesTiers()
          });
          if (RESULT.ok) {
            this.playerProgression = RESULT.state;
            this.bindFarmPlotProgressionStates();
            this.markProgressChanged();
          }
          return RESULT;
        }
        investFarmUpgrade(nodeId) {
          const IN_COMBAT = this.running || this.farmBossEvent?.phase !== "idle";
          const RESULT = purchaseFarmUpgrade(this.playerProgression, nodeId, {
            location: this.scene,
            inCombat: IN_COMBAT
          });
          if (RESULT.ok) {
            this.playerProgression = RESULT.state;
            this.bindFarmPlotProgressionStates();
            this.markProgressChanged();
          }
          return RESULT;
        }
        resetProgression(scope) {
          const IN_COMBAT = this.running || this.farmBossEvent?.phase !== "idle";
          const RESULT = resetPlayerProgression(this.playerProgression, scope, {
            location: this.scene,
            inCombat: IN_COMBAT
          });
          if (RESULT.ok) {
            const RESET_FARMS = scope?.type === "farm" || scope?.type === "all" || scope === "farm" || scope === "all";
            if (RESET_FARMS) {
              const FIRST_FOOD = this.farmPlots.get(INITIAL_FARM_PLOT_ID)?.food || [], RETURNED_FOOD = [...this.farmPlots.values()].filter((plot) => plot.id !== INITIAL_FARM_PLOT_ID).reduce((total, plot) => total + plot.food.length, 0);
              this.warehouseFood = Math.min(Number.MAX_SAFE_INTEGER, this.warehouseFood + RETURNED_FOOD);
              this.cancelMergeTasks();
              for (const UNIT_LOCAL of this.unitCollection.items) {
                this.clearInactiveForageAttempt(UNIT_LOCAL);
                if (UNIT_LOCAL.mateId) {
                  this.releaseMate(UNIT_LOCAL);
                }
              }
              this.playerProgression = RESULT.state;
              const FIRST_STATE = this.playerProgression.farmPlots.plots[0];
              this.farmPlots = /* @__PURE__ */ new Map([[FIRST_STATE.id, new FarmPlot(FIRST_STATE, FIRST_FOOD)]]);
              this.activePlotId = FIRST_STATE.id;
              this.playerProgression.farmPlots.currentPlotId = FIRST_STATE.id;
              this.food = FIRST_FOOD;
              const OLD_PLOT_ORDER = new Map(
                [...this.unitCollection.items].map((unit) => [unit.id, unit.plotId || RESERVE_PLOT_ID])
              ), RESIDENTS = this.roster.residents().sort(
                (a, b) => b.tier - a.tier || Number(b.mature) - Number(a.mature) || String(OLD_PLOT_ORDER.get(a.id)).localeCompare(String(OLD_PLOT_ORDER.get(b.id))) || a.id - b.id
              ), FIRST_CAPACITY = this.farmPlots.get(FIRST_STATE.id).capacity, ASSIGNMENTS = RESIDENTS.map((unit, index) => ({
                unitId: unit.id,
                plotId: index < FIRST_CAPACITY ? FIRST_STATE.id : RESERVE_PLOT_ID
              }));
              this.unitCollection.moveUnitsToPlots(ASSIGNMENTS);
              this._rebuildUnitSpatialIndex(this.units);
              this._unitSpatialDirty = true;
              this._foodSpatialDirty = true;
            } else {
              this.playerProgression = RESULT.state;
              this.bindFarmPlotProgressionStates();
            }
            this.markProgressChanged();
          }
          return RESULT;
        }
        resetAbilityTree() {
          return this.resetProgression({ type: "abilities" });
        }
        spawnLobProjectile(unit, action, shot, projectileEffect = null) {
          if (this.projectiles.length >= CONFIG.raid.capacity.projectiles) {
            return null;
          }
          const ID = ++this.projectileSerial, ATTACK_CONTEXT = this.createAttackContext(unit, {
            attackMultiplier: shot.attackMultiplier ?? this.speciesAbilityDamageMultiplier(unit),
            attackKind: abilityProfile(unit.species).kind
          });
          const PROJECTILE2 = {
            id: ID,
            owner: unit.id,
            ownerGeneration: unit.generation,
            targetId: action.targetId || "boss",
            targetGeneration: action.targetGeneration || 0,
            faction: unit.faction,
            isFormationClone: unit.isFormationClone,
            ownerId: unit.ownerId,
            species: unit.species,
            tier: unit.tier,
            path: structuredClone(action.path),
            elapsed: 0,
            x: unit.x,
            y: unit.y,
            z: 0.45,
            ...seedProjectileDimensions(unit),
            hit: false,
            attackMultiplier: shot.attackMultiplier ?? this.speciesAbilityDamageMultiplier(unit),
            shotIndex: shot.shotIndex ?? 0,
            attackPayload: {
              sourceKind: ATTACK_CONTEXT.sourceKind,
              attackerStats: structuredClone(ATTACK_CONTEXT.attackerStats),
              damageMultiplier: ATTACK_CONTEXT.damageMultiplier,
              attackPowerMultiplier: ATTACK_CONTEXT.attackPowerMultiplier,
              kind: ATTACK_CONTEXT.kind,
              buffed: ATTACK_CONTEXT.buffed,
              sourceStatOverrides: { ...ATTACK_CONTEXT.sourceStatOverrides }
            },
            ...projectileEffect?.abilityId === "corn-kernel-chain" ? {
              cornPayload: {
                ownerId: unit.ownerId,
                faction: unit.faction,
                isFormationClone: unit.isFormationClone,
                species: unit.species,
                tier: unit.tier,
                x: unit.x,
                y: unit.y,
                z: unit.z || 0,
                attackerStats: structuredClone(ATTACK_CONTEXT.attackerStats),
                attackPowerMultiplier: ATTACK_CONTEXT.attackPowerMultiplier,
                buffed: ATTACK_CONTEXT.buffed
              }
            } : {},
            abilityEffect: projectileEffect ? structuredClone(projectileEffect) : null
          };
          this.projectiles.push(PROJECTILE2);
          return PROJECTILE2;
        }
        speciesAbilityDamageMultiplier(unit) {
          return abilityProfile(unit.species).skillMultiplier;
        }
        spawnChestnutThorn(unit, action, config, shotIndex) {
          if (this.projectiles.length >= CONFIG.raid.capacity.projectiles) {
            return false;
          }
          const TARGET = action.thornTargetId === "boss" ? this.boss : this._unitForId(action.thornTargetId);
          if (!TARGET || TARGET.hp <= 0) {
            return false;
          }
          if (TARGET.generation !== action.thornTargetGeneration) {
            return false;
          }
          const ATTACK_CONTEXT = this.createAttackContext(unit, {
            attackMultiplier: config.attackMultiplier,
            attackKind: "chestnut-thorns"
          }), PATH2 = BALLISTICS.create(
            {
              x: unit.x,
              y: unit.y,
              z: unit.z || 0
            },
            action.target,
            "punch"
          );
          PATH2.height = 0.7;
          this.projectiles.push({
            id: ++this.projectileSerial,
            owner: unit.id,
            ownerGeneration: unit.generation,
            targetId: action.thornTargetId,
            targetGeneration: action.thornTargetGeneration,
            faction: unit.faction,
            ownerId: unit.ownerId,
            species: unit.species,
            tier: unit.tier,
            path: PATH2,
            elapsed: 0,
            x: unit.x,
            y: unit.y,
            z: unit.z || 0,
            radius: scaleAttackArea(0.08, unit),
            height: 0.22,
            hit: false,
            attackMultiplier: config.attackMultiplier,
            attackPayload: {
              sourceKind: ATTACK_CONTEXT.sourceKind,
              attackerStats: structuredClone(ATTACK_CONTEXT.attackerStats),
              damageMultiplier: ATTACK_CONTEXT.damageMultiplier,
              attackPowerMultiplier: ATTACK_CONTEXT.attackPowerMultiplier,
              kind: ATTACK_CONTEXT.kind,
              buffed: ATTACK_CONTEXT.buffed,
              sourceStatOverrides: { ...ATTACK_CONTEXT.sourceStatOverrides }
            },
            projectileKind: "chestnut-spike",
            isFormationClone: unit.isFormationClone,
            fanIndex: shotIndex
          });
          return true;
        }
        createFormationClone(original) {
          const ID = this.scene === "raid" ? CONFIG.raid.ids.summonBase + ++this.raidSummonSerial : this.nextId++, CLONE = new UNIT(ID, original.species, original.tier, original.x + 0.3, original.y + 0.1);
          Object.assign(CLONE, {
            growthElapsed: original.growthElapsed,
            growthDuration: original.growthDuration,
            cloneBornAt: this.time,
            hp: 1,
            seed: original.seed,
            faction: "player",
            ownerId: original.ownerId,
            farmId: original.farmId,
            isFormationClone: true,
            isBattleOnlySummon: true,
            battleSummonKind: "formation-copy",
            battleSummonParentId: original.id,
            battleSummonParentGeneration: original.generation,
            countsTowardPermanentRoster: false,
            eligibleForRaidDeployment: false,
            breedingEligible: false,
            mergeEligible: false,
            canSplit: false,
            splitUsedThisBattle: true,
            usesPersistentSleep: false,
            lifetime: "until-death-or-battle-end",
            growth: original.growth,
            meals: 1
          });
          this.addUnit(CLONE, { markProgress: false });
          return CLONE;
        }
        handleUnitDeath(unit) {
          return this.mutateUnits(this._handleUnitDeath, unit);
        }
        _handleUnitDeath(unit) {
          if (!this.unitCollection.has(unit)) {
            return false;
          }
          this.clearInactiveForageAttempt(unit);
          const SPLIT_BEFORE = unit.splitUsedThisBattle, DIED = unit.die();
          return DIED && !SPLIT_BEFORE && unit.splitUsedThisBattle;
        }
        processUnitDeath(unit) {
          return this.mutateUnits(this._processUnitDeath, unit);
        }
        _processUnitDeath(unit) {
          unit.ability.interrupt();
          unit.specialAbility?.interrupt();
          unit.ability.resetCombatEffects?.();
          this.clearPeaRecoveryBoost(unit);
          this.onCombatResolved.emit({ allyDeaths: unit.faction === "player" && !unit.isFormationClone ? 1 : 0 });
          this._syncUnitAliveCount(unit);
          if (!unit.isBattleOnlySummon) {
            this.markProgressChanged();
          }
          if (unit.isBattleOnlySummon) {
            if (unit.isFormationClone) {
              this.emit("formation-copy-death", unit.x, unit.y, unit.z, { duration: 0.6 });
            }
            unit.down = 0;
            this.removeUnit(unit, { keepStepSnapshot: true });
            return false;
          }
          const IN_BATTLE = SIMULATION_SCENES[this.scene].inBattle(this);
          const DESCRIPTORS = unit.ability.deathSplitDescriptors?.(this, IN_BATTLE) || [];
          if (!DESCRIPTORS.length) {
            return false;
          }
          unit.splitUsedThisBattle = true;
          unit.down = CONFIG.unit.corpseRecoverySeconds;
          for (let index = 0; index < DESCRIPTORS.length; index++) {
            const DESC = DESCRIPTORS[index], ANGLE = (index + 0.5) * Math.PI * 2 / DESCRIPTORS.length, ID = SIMULATION_SCENES[this.scene].summonId(this);
            const X = unit.x + Math.cos(ANGLE) * 0.38, Y = unit.y + Math.sin(ANGLE) * 0.38, CHILD = new UNIT(ID, DESC.species, DESC.tier, X, Y);
            Object.assign(CHILD, DESC, {
              ownerId: unit.ownerId,
              farmId: unit.farmId,
              home: {
                x: X,
                y: Y
              },
              down: 0,
              generation: ++this.entityGenerationSerial,
              growthElapsed: CHILD.growthDuration,
              growth: CONFIG.farm.breeding.matureMeals,
              meals: 1,
              dropLanded: true,
              deathSplitHandled: false
            });
            CHILD.hp = resolveUnitStats(CHILD).maxHp;
            this.addUnit(CHILD, { markProgress: false });
          }
          const EFFECT_ID = ++this.eventSequence;
          this.effects.push({
            kind: "peanut-split",
            eventId: EFFECT_ID,
            owner: unit.id,
            ownerGeneration: unit.generation,
            species: unit.species,
            x: unit.x,
            y: unit.y,
            z: 0,
            life: 0,
            duration: 0.7
          });
          this.combat("peanut-split", {
            effectId: EFFECT_ID,
            unit: unit.id,
            ownerId: unit.ownerId,
            species: unit.species,
            count: DESCRIPTORS.length,
            x: unit.x,
            y: unit.y
          });
          return true;
        }
        processUnitRevival(unit) {
          return this.mutateUnits(this._processUnitRevival, unit);
        }
        _processUnitRevival(unit) {
          this._syncUnitAliveCount(unit);
          this.combat("unit-recover", { unit: unit.id, x: unit.x, y: unit.y });
          this.markProgressChanged();
        }
        cleanupBattleSummons() {
          return this.mutateUnits(this._cleanupBattleSummons);
        }
        _cleanupBattleSummons() {
          for (const UNIT_LOCAL of this.units) {
            if (!UNIT_LOCAL.isBattleOnlySummon) {
              UNIT_LOCAL.ability.resetCombatEffects?.();
            }
          }
          this.unitCollection.removeWhere((unit) => unit.isBattleOnlySummon);
          this.projectiles = [];
          this.cornAttachments = CornAttachmentModel.createManager();
          return true;
        }
        senseEnemy(unit) {
          if (unit.hp <= 0 || !unit.dropLanded) {
            return null;
          }
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._rebuildUnitSpatialIndex(this.units);
          }
          const BATTLE_ACTIVE = SIMULATION_SCENES[this.scene].canSenseBoss(this);
          const BOSS_TARGET = BATTLE_ACTIVE && this.boss?.active && areOpposingFactions(unit, this.boss) ? this.boss : null;
          let hasUnitEnemy = false;
          for (const [FACTION, COUNT] of this._liveFactionCounts) {
            if (FACTION !== unit.faction && COUNT > 0) {
              hasUnitEnemy = true;
              break;
            }
          }
          if (!hasUnitEnemy && !BOSS_TARGET) {
            return null;
          }
          let nearest = null;
          let nearestDistance = Infinity;
          let nearestId = Infinity;
          const CONSIDER = (target) => {
            if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y) || !Number.isFinite(target.radius)) {
              return;
            }
            const DISTANCE = Math.hypot(unit.x - target.x, unit.y - target.y), ID = target.id || 0;
            if (DISTANCE <= unit.perceptionRange + target.radius + 1e-9 && (DISTANCE < nearestDistance || DISTANCE === nearestDistance && ID < nearestId)) {
              nearest = target;
              nearestDistance = DISTANCE;
              nearestId = ID;
            }
          };
          CONSIDER(BOSS_TARGET);
          if (hasUnitEnemy) {
            const EXTENT = Math.max(0, unit.perceptionRange + CONFIG.unit.maxRadius + 1e-9);
            this.unitSpatial.queryAABB(
              unit.x - EXTENT,
              unit.y - EXTENT,
              unit.x + EXTENT,
              unit.y + EXTENT,
              this._unitCandidates
            );
            for (const CANDIDATE of this._unitCandidates) {
              if (CANDIDATE !== unit && this._unitIsActive(CANDIDATE) && CANDIDATE.hp > 0 && CANDIDATE.dropLanded && areOpposingFactions(unit, CANDIDATE)) {
                CONSIDER(CANDIDATE);
              }
            }
          }
          return nearest;
        }
        raidRoster(ownerId) {
          return this.raidRosters.find((r) => r.ownerId === ownerId) || null;
        }
        setRaidPlayers(players) {
          if (this.scene !== "raid" || !Array.isArray(players) || players.length < 1 || players.length > CONFIG.raid.capacity.players || players.some((p) => typeof p !== "string" || !p) || new Set(players).size !== players.length) {
            return false;
          }
          const LIVE = [...players], ORDERED = this.raidDeploymentStarted ? [...this.raidExpectedPlayers, ...LIVE.filter((id) => !this.raidExpectedPlayers.includes(id))] : LIVE;
          if (ORDERED.length > CONFIG.raid.capacity.players) {
            return false;
          }
          this.raidExpectedPlayers = ORDERED;
          if (!this.raidDeploymentStarted) {
            this.raidRosters = this.raidRosters.filter((r) => LIVE.includes(r.ownerId));
          }
          this.raidRosters.sort(
            (a, b) => this.raidExpectedPlayers.indexOf(a.ownerId) - this.raidExpectedPlayers.indexOf(b.ownerId)
          );
          return true;
        }
        raidTotal() {
          return this.raidRosters.reduce((n, r) => n + r.troops.length, 0);
        }
        raidRemaining(ownerId, speciesId = null) {
          const R_LOCAL = this.raidRoster(ownerId);
          return R_LOCAL ? R_LOCAL.troops.reduce(
            (n, troop) => n + (!troop.deployed && (speciesId === null || troop.species === speciesId) ? 1 : 0),
            0
          ) : 0;
        }
        registerRaidRoster(ownerId, entries, abilitySnapshot = createAbilityRuntimeSnapshot(createPlayerProgressionState()), settlement = null, deploymentCardSpecies = null) {
          if (this.scene !== "raid" || !this.raidExpectedPlayers.includes(ownerId) || this.raidRoster(ownerId) || !Array.isArray(entries) || entries.length > CONFIG.raid.capacity.playerUnits || this.raidTotal() + entries.length > CONFIG.raid.capacity.units) {
            return false;
          }
          if (!isValidAbilityRuntimeSnapshot(abilitySnapshot)) {
            return false;
          }
          const HAS_SETTLEMENT = settlement !== null;
          if (HAS_SETTLEMENT && (!settlement || typeof settlement !== "object" || typeof settlement.sessionId !== "string" || !settlement.sessionId.trim() || settlement.sessionId.length > 128 || !Number.isSafeInteger(settlement.runSequence) || settlement.runSequence < 1 || settlement.runSequence > 1e12 || settlement.encounterId !== settlement.runSequence)) {
            return false;
          }
          const IDS = /* @__PURE__ */ new Set(), TROOPS = [];
          for (const E of entries) {
            if (!Array.isArray(E) || E.length !== 3 || !Number.isSafeInteger(E[0]) || E[0] < 1 || E[0] > CONFIG.farm.maxUnitId || !Number.isInteger(E[1]) || E[1] < 0 || E[1] >= CONFIG.unit.speciesCount || !Number.isInteger(E[2]) || E[2] < 1 || E[2] > CONFIG.unit.maxTier || IDS.has(E[0])) {
              return false;
            }
            IDS.add(E[0]);
            TROOPS.push({
              farmId: E[0],
              species: E[1],
              tier: E[2],
              deployed: false
            });
          }
          const CARD_SPECIES = deploymentCardSpecies === null ? [...new Set(TROOPS.map((troop) => troop.species))].slice(0, 4) : deploymentCardSpecies;
          if (!Array.isArray(CARD_SPECIES) || CARD_SPECIES.length > 4 || CARD_SPECIES.some((speciesId) => !isSpeciesId(speciesId)) || new Set(CARD_SPECIES).size !== CARD_SPECIES.length) {
            return false;
          }
          const ORDER_KEY = (farmId) => {
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
          TROOPS.sort((a, b) => a.tier - b.tier || ORDER_KEY(a.farmId) - ORDER_KEY(b.farmId) || a.farmId - b.farmId);
          this.formationSkills.includeBuild(ownerId, abilitySnapshot.formationSkills || createFormationSkillState());
          this.raidRosters.push({
            ownerId,
            troops: TROOPS,
            deploymentCardSpecies: [...CARD_SPECIES],
            abilitySnapshot: structuredClone(abilitySnapshot),
            settlementSessionId: HAS_SETTLEMENT ? settlement.sessionId : "",
            settlementRunSequence: HAS_SETTLEMENT ? settlement.runSequence : 0,
            settlementEncounterId: HAS_SETTLEMENT ? settlement.encounterId : 0,
            lastDeploySequence: 0,
            buffUntil: 0,
            buffReadyAt: 0
          });
          this.raidRosters.sort(
            (a, b) => this.raidExpectedPlayers.indexOf(a.ownerId) - this.raidExpectedPlayers.indexOf(b.ownerId)
          );
          return true;
        }
        deployNextRaidUnit(ownerId, sequence, speciesId) {
          return this.mutateUnits(this._deployNextRaidUnit, ownerId, sequence, speciesId);
        }
        _deployNextRaidUnit(ownerId, sequence, speciesId) {
          if (this.scene !== "raid" || ["victory", "defeat"].includes(this.encounter.outcome) || !this.raidExpectedPlayers.every((id) => this.raidRoster(id)) || this.units.length >= CONFIG.raid.capacity.battleUnits || !Number.isSafeInteger(sequence)) {
            return false;
          }
          const ROSTER2 = this.raidRoster(ownerId), TROOP = ROSTER2?.troops.find(
            (troop) => !troop.deployed && (speciesId === void 0 || troop.species === speciesId)
          );
          if (!ROSTER2 || sequence !== ROSTER2.lastDeploySequence + 1 || !TROOP || speciesId !== void 0 && (!isSpeciesId(speciesId) || !ROSTER2.deploymentCardSpecies.includes(speciesId))) {
            return false;
          }
          const FARM_ID = TROOP.farmId, SLOT = this.raidExpectedPlayers.indexOf(ownerId), TROOP_INDEX = ROSTER2.troops.indexOf(TROOP), ID = (SLOT + 1) * CONFIG.raid.ids.playerStride + TROOP_INDEX + 1;
          if (this.units.some((u) => u.id === ID)) {
            return false;
          }
          const ANGLE = this.random() * Math.PI * 2, MARGIN = (0, import_definition51.unitBodyRadius)({ species: TROOP.species, tier: TROOP.tier, growthElapsed: 1, growthDuration: 1 }) + 0.05, BOUNDS = ARENA_GEOMETRY.bounds("raid", MARGIN), X = Math.cos(ANGLE) * BOUNDS.x, Y = Math.sin(ANGLE) * BOUNDS.y;
          const U = new UNIT(ID, TROOP.species, TROOP.tier, X, Y), GROWTH_DURATION = this.breedGrowthDuration();
          Object.assign(U, {
            ownerId,
            farmId: FARM_ID,
            z: CONFIG.raid.dropHeight,
            vz: 0,
            dropLanded: false,
            meals: 1,
            growth: CONFIG.farm.breeding.matureMeals,
            growthDuration: GROWTH_DURATION,
            growthElapsed: GROWTH_DURATION
          });
          TROOP.deployed = true;
          ROSTER2.lastDeploySequence = sequence;
          this.addUnit(U, { markProgress: false });
          if (!this.raidDeploymentStarted) {
            this.raidDeploymentStarted = true;
            this.running = true;
            this.encounter = {
              outcome: "fighting",
              elapsed: 0
            };
            this.boss.active = true;
            this.boss.encounterId = this.raidRosters[0]?.settlementRunSequence || this.nextRaidRunSequence || 1;
            this.boss.patternRuntime = createBossPatternRuntime();
          }
          this.combat("unit-drop", {
            unit: ID,
            ownerId,
            x: X,
            y: Y,
            z: U.z
          });
          return true;
        }
        useRaidBuff(ownerId) {
          const R_LOCAL = this.raidRoster(ownerId);
          if (!this.running || !R_LOCAL || this.time < R_LOCAL.buffReadyAt) {
            return false;
          }
          R_LOCAL.buffUntil = this.time + CONFIG.raid.buff.duration;
          R_LOCAL.buffReadyAt = this.time + CONFIG.raid.buff.cooldown;
          this.combat("buff", {
            ownerId,
            until: R_LOCAL.buffUntil
          });
          return true;
        }
        random() {
          return this.rng.nextUint32() / 4294967296;
        }
        randomBossSpecies() {
          return Math.min(CONFIG.unit.speciesCount - 1, Math.floor(this.random() * CONFIG.unit.speciesCount));
        }
        spawn(species, tier, x, y, { birthReservationOwner = null } = {}) {
          const FARM_RESIDENT = this.scene === "farm";
          let plot = null;
          if (FARM_RESIDENT) {
            const HAS_BIRTH_RESERVATION = birthReservationOwner && (this._activeBreedReservations?.has(birthReservationOwner) || this._breedPlans?.has(birthReservationOwner));
            if (this.ownedPopulation + this.birthReservations - Number(!!HAS_BIRTH_RESERVATION) >= this.totalFarmCapacity) {
              return null;
            }
            const BREED_RESERVATION = this._activeBreedReservations?.get(birthReservationOwner);
            plot = BREED_RESERVATION ? this.farmPlots.get(BREED_RESERVATION.plotId) : this.availableFarmPlotFor(species);
            if (!plot) {
              return null;
            }
          } else if (this.units.length >= SIMULATION_SCENES[this.scene].capacity(this)) {
            return null;
          }
          const U = new UNIT(this.nextId++, species, CLAMP2(tier, 1, CONFIG.unit.maxTier), x, y);
          U.plotId = plot?.id || this.activePlotId || INITIAL_FARM_PLOT_ID;
          this.addUnit(U);
          return U;
        }
        addUnit(unit, options) {
          if (this.scene === "farm" && this.unitCollection.isResident(unit) && !unit.plotId) {
            unit.plotId = this.activePlotId;
          }
          if (!Number.isSafeInteger(unit.generation) || unit.generation <= 0) {
            unit.generation = ++this.entityGenerationSerial;
          } else {
            this.entityGenerationSerial = Math.max(this.entityGenerationSerial, unit.generation);
          }
          return this.unitCollection.add(unit, options);
        }
        removeUnit(unit, options) {
          this.clearInactiveForageAttempt(unit);
          return this.unitCollection.remove(unit, options);
        }
        replaceUnitGroup(materials, result, complete, preserveMergeTask = null) {
          if (!Number.isSafeInteger(result.generation) || result.generation <= 0) {
            result.generation = ++this.entityGenerationSerial;
          } else {
            this.entityGenerationSerial = Math.max(this.entityGenerationSerial, result.generation);
          }
          return this.unitCollection.replace(materials, result, complete, preserveMergeTask);
        }
        resetUnits(units = []) {
          for (const UNIT_LOCAL of units) {
            if (!Number.isSafeInteger(UNIT_LOCAL.generation) || UNIT_LOCAL.generation <= 0) {
              UNIT_LOCAL.generation = ++this.entityGenerationSerial;
            } else {
              this.entityGenerationSerial = Math.max(this.entityGenerationSerial, UNIT_LOCAL.generation);
            }
          }
          this.unitCollection.reset(units);
        }
        notice(kind, detail = {}) {
          const EVENT = {
            sequence: ++this.eventSequence,
            kind,
            ...detail
          };
          this.notices.push(EVENT);
          if (this.notices.length > 512) {
            this.notices.shift();
          }
          const TO_PRESENTATION_TIME = PRESENTATION_CLOCKS.get(this);
          if (TO_PRESENTATION_TIME && Number.isFinite(EVENT.time)) {
            PRESENTATION_EVENT_TIMES.set(EVENT, TO_PRESENTATION_TIME(EVENT.time));
          }
          this.onNotice.emit(EVENT);
          return EVENT;
        }
        emit(kind, x, y, z = 0, effectOptions = {}) {
          return this.mutateUnits(this._emit, kind, x, y, z, effectOptions);
        }
        _emit(kind, x, y, z = 0, effectOptions = {}) {
          this.notice(kind);
          const EFFECT = {
            kind,
            x,
            y,
            z,
            life: 0,
            ...effectOptions
          };
          if (Number.isFinite(EFFECT.delay) && Number.isFinite(EFFECT.span)) {
            EFFECT.duration = EFFECT.delay + EFFECT.span;
          }
          this.effects.push(EFFECT);
          if (this.effects.length > 100) {
            this.effects.shift();
          }
          this.events.push(kind);
          if (this.events.length > 20) {
            this.events.shift();
          }
        }
        tapFood(source) {
          return this.mutateUnits(this._tapFood, source);
        }
        _tapFood(source) {
          if (source !== "auto" || this.warehouseFood >= Number.MAX_SAFE_INTEGER) {
            return false;
          }
          const COMPLETED = this.foodTaps.remainder === 4;
          this.foodTaps.remainder++;
          this.foodTaps.revision++;
          if (this.foodTaps.remainder >= 5) {
            this.foodTaps.remainder -= 5;
            this.warehouseFood++;
            this.foodTaps.produced++;
          }
          this.notice("food-tap", {
            source,
            completed: COMPLETED,
            remainder: this.foodTaps.remainder
          });
          this.markProgressChanged();
          return true;
        }
        scatterFoodAtRandomLocation() {
          if (this.scene !== "farm" || this.warehouseFood <= 0 || this.food.length >= 140) {
            return false;
          }
          const SCATTERED = this.scatterFood(
            (this.random() - 0.5) * CONFIG.farm.arena.radiusX * 1.5,
            (this.random() - 0.5) * CONFIG.farm.arena.radiusY * 1.35
          );
          if (SCATTERED) {
            this.notice("manual-feed");
          }
          return SCATTERED;
        }
        scatterFood(x, y) {
          if (this.scene !== "farm" || !Number.isFinite(x) || !Number.isFinite(y) || this.warehouseFood <= 0 || this.food.length >= 140) {
            return false;
          }
          this.warehouseFood--;
          const EVENT = this.tryStartFarmBossEvent(x, y);
          if (!EVENT) {
            this.spawnFood(x, y, 1, { allowBossEvent: false });
          }
          this.markProgressChanged();
          return true;
        }
        advanceAutoTaps(elapsed) {
          if (!Number.isFinite(elapsed) || elapsed <= 0) {
            return;
          }
          this.foodTaps.autoClock += Math.min(elapsed, 0.1);
          const INTERVAL = getAutoTapSeconds(this.playerProgression?.farmUpgrades);
          while (this.foodTaps.autoClock + 1e-9 >= INTERVAL) {
            this.foodTaps.autoClock = Math.max(0, this.foodTaps.autoClock - INTERVAL);
            this.tapFood("auto");
          }
        }
        spawnFood(x, y, count = 1, { allowBossEvent = true } = {}) {
          let spawned = 0;
          for (let i = 0; i < count && this.food.length < 140; i++) {
            const RADIUS_X = CONFIG.farm.arena.radiusX - 1.5, RADIUS_Y = CONFIG.farm.arena.radiusY - 1.1;
            let tx = CLAMP2(x, -RADIUS_X, RADIUS_X);
            let ty = CLAMP2(y, -RADIUS_Y, RADIUS_Y);
            const BOUNDARY = Math.hypot(tx / RADIUS_X, ty / RADIUS_Y);
            if (BOUNDARY > 1) {
              tx /= BOUNDARY;
              ty /= BOUNDARY;
            }
            if (allowBossEvent && this.tryStartFarmBossEvent(tx, ty)) {
              continue;
            }
            const ANGLE = this.random() * Math.PI * 2, SX = Math.cos(ANGLE) * (CONFIG.farm.arena.radiusX + 0.7), SY = Math.sin(ANGLE) * (CONFIG.farm.arena.radiusY + 0.2);
            const DURATION3 = 0.85 + this.random() * 0.25, Z = 0.3;
            const FOOD = {
              x: SX,
              y: SY,
              z: Z,
              vx: (tx - SX) / DURATION3,
              vy: (ty - SY) / DURATION3,
              vz: 6 * DURATION3 - Z / DURATION3,
              seed: this.random(),
              phase: "flight",
              tx,
              ty
            };
            this.food.push(FOOD);
            this._trackFoodAdded(FOOD);
            this.emit("feed", tx, ty);
            this.markProgressChanged();
            spawned++;
          }
          return spawned;
        }
        tryStartFarmBossEvent(x, y) {
          if (this.scene !== "farm" || this.boss.active || this.farmBossEvent.phase !== "idle" || this.random() >= CONFIG.farm.bossEvent.spawnChance) {
            return false;
          }
          for (const UNIT_LOCAL of this.units) {
            if (!UNIT_LOCAL.isBattleOnlySummon) {
              UNIT_LOCAL.splitUsedThisBattle = false;
              UNIT_LOCAL.deathSplitHandled = false;
              UNIT_LOCAL.chestnutNextThornTick = 0;
            }
          }
          const SPECIES = this.randomBossSpecies(), EVENT_STAGE = this.playerProgression.farmBossEventStage;
          this.boss = this.createBoss(SPECIES);
          this.configureBossStage(EVENT_STAGE, SPECIES);
          Object.assign(this.boss, {
            x,
            y,
            z: CONFIG.raid.dropHeight,
            active: true
          });
          this.farmBossEvent = {
            phase: "dropping",
            elapsed: 0,
            outcome: "fighting",
            encounterId: this.nextBossEncounterId++,
            rewardStatus: "unresolved",
            rewardChance: 0,
            rewardRoll: 0,
            rewardUnitId: 0
          };
          this.boss.encounterId = this.farmBossEvent.encounterId;
          this.boss.patternRuntime = createBossPatternRuntime();
          this.combat("farm-boss-drop", {
            x,
            y,
            z: this.boss.z
          });
          this.markProgressChanged();
          return true;
        }
        getBossAcquisitionChance({ farmEvent = false } = {}) {
          return bossAcquisitionChance({
            farmEvent
          });
        }
        createBoss(species = 3) {
          const HP = 2e3;
          return {
            x: 0,
            y: 0,
            faction: FACTION_CONFIG.ENEMY,
            z: 0,
            generation: ++this.entityGenerationSerial,
            radius: CONFIG.boss.radius,
            height: CONFIG.boss.height,
            hp: HP,
            maxHp: HP,
            species: CLAMP2(species, 0, CONFIG.unit.speciesCount - 1),
            attackPower: 4,
            stage: 0,
            moveSpeed: CONFIG.boss.chaseSpeed,
            encounterId: 0,
            active: false,
            angle: 0,
            facing: 0,
            flash: 0,
            swings: 0,
            basicCount: 0,
            attackId: 0,
            sweepClock: 0,
            startAngle: 0,
            travel: 0,
            patternRuntime: createBossPatternRuntime(),
            stun: 0,
            knockVx: 0,
            knockVy: 0,
            airborneRecovery: 0,
            barleyArmorBreakUntil: 0,
            barleyArmorBreakReduction: 0,
            barleyArmorShredBuckets: Array.from({ length: 60 }, () => ({ expiresAtTick: 0, amount: 0 })),
            summonMouth: {
              x: 0,
              y: 0,
              z: 0
            }
          };
        }
        configureBossStage(stage, species = this.boss.species) {
          const STATS2 = bossStageStats(stage);
          this.boss.generation = ++this.entityGenerationSerial;
          this.boss.species = CLAMP2(species, 0, CONFIG.unit.speciesCount - 1);
          this.boss.stage = STATS2.stage;
          this.boss.hp = this.boss.maxHp = STATS2.hp;
          this.boss.attackPower = STATS2.attackPower;
          return this.boss;
        }
        setScene(scene) {
          return this.mutateUnits(this._setScene, scene);
        }
        _setScene(scene) {
          if (scene === this.scene) {
            return;
          }
          this.formationSkills.end();
          this.cancelMergeTasks();
          this._foodSearchScheduler.cancelOwner(this);
          this._foodSearchStates = /* @__PURE__ */ new WeakMap();
          for (const UNIT_LOCAL of this.units) {
            this.releaseMate(UNIT_LOCAL);
          }
          this.projectiles = [];
          this.scene = scene;
          this.running = scene === "raid";
          this.encounter = {
            outcome: this.running ? "fighting" : "idle",
            elapsed: 0
          };
          this.farmBossEvent = {
            phase: "idle",
            elapsed: 0,
            outcome: "idle",
            encounterId: 0,
            rewardStatus: "none",
            rewardChance: 0,
            rewardRoll: 0,
            rewardUnitId: 0
          };
          this.boss = this.createBoss(this.running ? this.randomBossSpecies() : 3);
          const SCENE = SIMULATION_SCENES[scene];
          const ID_MAP = new Map(this.units.map((u, index) => [u.id, SCENE.unitId(u, index)]));
          for (let i = 0; i < this.units.length; i++) {
            const U = this.units[i], OLD_MATE_ID = U.mateId;
            SCENE.enterUnit(this, U, i);
            U.mateId = ID_MAP.get(OLD_MATE_ID) || 0;
            U.ability = CREATE_UNIT_ATTACK_CYCLE(U);
            U.specialAbility = CREATE_UNIT_ATTACK_CYCLE.createSpecial(U);
            U.ability.resetCombatEffects?.();
            Object.assign(U, {
              z: 0,
              vx: 0,
              vy: 0,
              vz: 0,
              stun: 0,
              down: 0,
              hp: STATS(U.tier, U.species).maxHp
            });
          }
          this.unitCollection.refreshIndexes();
          SCENE.setupRoster(this);
          this._unitSpatialDirty = true;
        }
        canBreedPair(a, b, requireContact = false) {
          const BATCH = !this._spatialStepActive;
          if (BATCH) {
            this._beginSpatialQueryBatch();
          }
          try {
            const OWNER = this.breedingReservationOwner(a, b), BIRTH_RESERVATION = this._activeBreedReservations?.get(OWNER) || null, RESERVATIONS_AVAILABLE = this.unitCollection.reservationOwner(a) === null || this.unitCollection.reservationOwner(a) === OWNER;
            return this.scene === "farm" && a !== b && !a.isBattleOnlySummon && !b.isBattleOnlySummon && a.breedingEligible !== false && b.breedingEligible !== false && a.hp > 0 && b.hp > 0 && a.species === b.species && a.mature && b.mature && a.fed && b.fed && a.cooldown <= 0 && b.cooldown <= 0 && this.canFarmPopulationAdvance(a.species, {
              excludeReservation: BIRTH_RESERVATION?.reservation || null
            }) && this.ownedPopulation + this.birthReservations - Number(!!BIRTH_RESERVATION) < this.totalFarmCapacity && (BIRTH_RESERVATION ? this.roster.placedPopulation(BIRTH_RESERVATION.plotId) + (this._breedPlotReservations.get(BIRTH_RESERVATION.plotId) || 0) <= this.farmPlots.get(BIRTH_RESERVATION.plotId)?.capacity : !!this.availableFarmPlotFor(a.species)) && this._unitIsActive(a) && this._unitIsActive(b) && RESERVATIONS_AVAILABLE && (this.unitCollection.reservationOwner(b) === null || this.unitCollection.reservationOwner(b) === OWNER) && (!requireContact || Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius + 0.2);
          } finally {
            if (BATCH) {
              this._endSpatialQueryBatch();
            }
          }
        }
        breedingReservationOwner(a, b) {
          return BREED_RESERVATION_OWNER(a.id, b.id);
        }
        breedPlanFor(unit) {
          return [...this._breedPlans?.values() || []].find((plan) => plan.parentIds.includes(unit?.id)) || null;
        }
        canStartCrossPlotBreed(a, b, { allowSamePlot = false } = {}) {
          return !!(this.scene === "farm" && this.farmBossEvent?.phase === "idle" && a && b && a !== b && (allowSamePlot || a.plotId !== b.plotId) && a.plotId !== RESERVE_PLOT_ID && b.plotId !== RESERVE_PLOT_ID && a.species === b.species && a.hp > 0 && b.hp > 0 && a.down <= 0 && b.down <= 0 && a.mature && b.mature && a.fed && b.fed && a.cooldown <= 0 && b.cooldown <= 0 && a.breedingEligible !== false && b.breedingEligible !== false && !this.senseEnemy(a) && !this.senseEnemy(b) && this.canFarmPopulationAdvance(a.species) && this.ownedPopulation + this.birthReservations < this.totalFarmCapacity && !this.unitCollection.reservationOwner(a) && !this.unitCollection.reservationOwner(b));
        }
        reserveCrossPlotBreed(a, b, { allowSamePlot = false, durationTicks = 10 } = {}) {
          if (!this.canStartCrossPlotBreed(a, b, { allowSamePlot }) || !Number.isSafeInteger(durationTicks) || durationTicks < 1) {
            return false;
          }
          const PARENT_IDS = [a.id, b.id], PARENTS_BY_SOURCE = /* @__PURE__ */ new Map();
          for (const PARENT of [a, b]) {
            PARENTS_BY_SOURCE.set(PARENT.plotId, (PARENTS_BY_SOURCE.get(PARENT.plotId) || 0) + 1);
          }
          const IDLE_RESIDENTS = this.roster.residents().filter(
            (unit) => unit.plotId !== RESERVE_PLOT_ID && unit.id !== a.id && unit.id !== b.id && !this.unitCollection.reservationOwner(unit) && !unit.mateId && unit.hp > 0 && unit.down <= 0 && unit.stun <= 0 && unit.ability?.phase === "idle" && (!unit.specialAbility || unit.specialAbility.phase === "idle") && !this.senseEnemy(unit)
          ).sort((left, right) => left.plotId.localeCompare(right.plotId) || left.id - right.id), CANDIDATES = [...this.farmPlots.values()].map((plot) => {
            const PARENTS_HERE = PARENT_IDS.filter(
              (id) => this.unitCollection.unitById(id)?.plotId === plot.id
            ).length, MOVED = 2 - PARENTS_HERE, ADDED = MOVED + 1, OCCUPANCY = this.roster.placedPopulation(plot.id) + (this._breedPlotReservations.get(plot.id) || 0), NEEDED_EXCHANGES = Math.max(0, OCCUPANCY + ADDED - plot.capacity), EXCHANGES = [];
            if (NEEDED_EXCHANGES > 2 || NEEDED_EXCHANGES > MOVED) {
              return null;
            }
            for (const [SOURCE_PLOT_ID, PARENT_COUNT] of PARENTS_BY_SOURCE) {
              if (SOURCE_PLOT_ID === plot.id) {
                continue;
              }
              for (const RESIDENT of IDLE_RESIDENTS) {
                if (EXCHANGES.length >= NEEDED_EXCHANGES || EXCHANGES.some((exchange) => exchange.unitId === RESIDENT.id) || RESIDENT.plotId !== plot.id) {
                  continue;
                }
                const USED_AT_SOURCE = EXCHANGES.filter(
                  (exchange) => exchange.plotId === SOURCE_PLOT_ID
                ).length;
                if (USED_AT_SOURCE < PARENT_COUNT) {
                  EXCHANGES.push({ unitId: RESIDENT.id, plotId: SOURCE_PLOT_ID });
                  break;
                }
              }
            }
            if (EXCHANGES.length !== NEEDED_EXCHANGES) {
              return null;
            }
            const OCCUPANCY_DELTA = /* @__PURE__ */ new Map([[plot.id, ADDED - EXCHANGES.length]]);
            for (const [SOURCE_PLOT_ID, PARENT_COUNT] of PARENTS_BY_SOURCE) {
              if (SOURCE_PLOT_ID !== plot.id) {
                OCCUPANCY_DELTA.set(
                  SOURCE_PLOT_ID,
                  (OCCUPANCY_DELTA.get(SOURCE_PLOT_ID) || 0) - PARENT_COUNT + EXCHANGES.filter((exchange) => exchange.plotId === SOURCE_PLOT_ID).length
                );
              }
            }
            const FINAL_OCCUPANCY_FITS = [...this.farmPlots.values()].every(
              (candidatePlot) => this.roster.placedPopulation(candidatePlot.id) + (this._breedPlotReservations.get(candidatePlot.id) || 0) + Math.max(0, OCCUPANCY_DELTA.get(candidatePlot.id) || 0) <= candidatePlot.capacity
            );
            const PLOT_RESERVATION_DELTAS = new Map([...OCCUPANCY_DELTA].filter(([, delta]) => delta > 0));
            return FINAL_OCCUPANCY_FITS ? {
              plot,
              parentsHere: PARENTS_HERE,
              moved: MOVED,
              added: ADDED,
              occupancy: OCCUPANCY,
              exchanges: EXCHANGES,
              occupancyDelta: OCCUPANCY_DELTA,
              plotReservationDeltas: PLOT_RESERVATION_DELTAS
            } : null;
          }).filter(Boolean).sort(
            (left, right) => right.parentsHere - left.parentsHere || left.moved - right.moved || left.occupancy - right.occupancy || left.plot.id.localeCompare(right.plot.id)
          ), DESTINATION = CANDIDATES[0];
          if (!DESTINATION) {
            return false;
          }
          const OWNER = this.breedingReservationOwner(a, b), RESERVATION = { species: a.species, owner: OWNER }, ASSIGNMENTS = [
            { unitId: a.id, plotId: DESTINATION.plot.id },
            { unitId: b.id, plotId: DESTINATION.plot.id },
            ...DESTINATION.exchanges
          ], ORIGINAL_ASSIGNMENTS = ASSIGNMENTS.map(({ unitId }) => ({
            unitId,
            plotId: this.unitCollection.unitById(unitId).plotId
          }));
          if (!this.unitCollection.reserve(OWNER, [
            a,
            b,
            ...DESTINATION.exchanges.map(({ unitId }) => this.unitCollection.unitById(unitId))
          ])) {
            return false;
          }
          a.mateId = b.id;
          b.mateId = a.id;
          this._breedPlans.set(OWNER, {
            owner: OWNER,
            parentIds: PARENT_IDS,
            originalPlotIds: [a.plotId, b.plotId],
            originalPositions: [
              { x: a.x, y: a.y, vx: a.vx, vy: a.vy },
              { x: b.x, y: b.y, vx: b.vx, vy: b.vy }
            ],
            assignments: ASSIGNMENTS,
            originalAssignments: ORIGINAL_ASSIGNMENTS,
            exchangeUnitIds: DESTINATION.exchanges.map(({ unitId }) => unitId),
            destinationPlotId: DESTINATION.plot.id,
            dueTick: this.simulationTick + durationTicks,
            expiresTick: this.simulationTick + 100,
            targetSnapshot: [...this.farmTargets],
            reservation: RESERVATION,
            plotReservationDeltas: Object.fromEntries(DESTINATION.plotReservationDeltas)
          });
          for (const [PLOT_ID, DELTA] of DESTINATION.plotReservationDeltas) {
            this._breedPlotReservations.set(PLOT_ID, (this._breedPlotReservations.get(PLOT_ID) || 0) + DELTA);
          }
          return true;
        }
        cancelBreedPlan(plan) {
          if (!plan || this._breedPlans?.get(plan.owner) !== plan) {
            return false;
          }
          this._breedPlans.delete(plan.owner);
          this.releaseBreedPlotReservations(plan);
          this.unitCollection.releaseReservations(plan.owner);
          for (const ID of plan.parentIds) {
            const UNIT_LOCAL = this.unitCollection.unitById(ID);
            if (UNIT_LOCAL?.mateId === plan.parentIds.find((otherId) => otherId !== ID)) {
              UNIT_LOCAL.mateId = 0;
            }
          }
          return true;
        }
        releaseBreedPlotReservations(plan) {
          for (const [PLOT_ID, DELTA] of Object.entries(plan?.plotReservationDeltas || {})) {
            const RESERVED = (this._breedPlotReservations.get(PLOT_ID) || 0) - DELTA;
            if (RESERVED) {
              this._breedPlotReservations.set(PLOT_ID, RESERVED);
            } else {
              this._breedPlotReservations.delete(PLOT_ID);
            }
          }
        }
        cancelBreedPlans() {
          for (const PLAN of [...this._breedPlans?.values() || []]) {
            this.cancelBreedPlan(PLAN);
          }
          for (const OWNER of [...this._activeBreedReservations?.keys() || []]) {
            this.releaseActiveBreedReservation(OWNER);
          }
          this._breedPlans?.clear();
          this._activeBreedReservations?.clear();
          this._breedPlotReservations?.clear();
        }
        reserveActiveBreedPair(a, b) {
          const OWNER = this.breedingReservationOwner(a, b), EXISTING = this._activeBreedReservations.get(OWNER);
          if (EXISTING) {
            return EXISTING.parentIds.includes(a.id) && EXISTING.parentIds.includes(b.id);
          }
          if (!a || !b || a.plotId !== b.plotId || a.plotId === RESERVE_PLOT_ID || !this.canBreedPair(a, b) || a.down > 0 || b.down > 0 || a.mateId && a.mateId !== b.id || b.mateId && b.mateId !== a.id || this.roster.placedPopulation(a.plotId) + (this._breedPlotReservations.get(a.plotId) || 0) >= this.farmPlots.get(a.plotId)?.capacity) {
            return false;
          }
          const RESERVATION = { species: a.species, owner: OWNER };
          if (!this.unitCollection.reserve(OWNER, [a, b])) {
            return false;
          }
          this._activeBreedReservations.set(OWNER, {
            owner: OWNER,
            parentIds: [a.id, b.id],
            plotId: a.plotId,
            reservation: RESERVATION
          });
          this._breedPlotReservations.set(a.plotId, (this._breedPlotReservations.get(a.plotId) || 0) + 1);
          a.mateId = b.id;
          b.mateId = a.id;
          return true;
        }
        releaseActiveBreedReservation(owner) {
          const RESERVATION = this._activeBreedReservations?.get(owner);
          if (!RESERVATION) {
            return false;
          }
          this._activeBreedReservations.delete(owner);
          const RESERVED = Math.max(0, (this._breedPlotReservations.get(RESERVATION.plotId) || 0) - 1);
          if (RESERVED) {
            this._breedPlotReservations.set(RESERVATION.plotId, RESERVED);
          } else {
            this._breedPlotReservations.delete(RESERVATION.plotId);
          }
          this.unitCollection.releaseReservations(owner);
          for (const ID of RESERVATION.parentIds) {
            const UNIT_LOCAL = this.unitCollection.unitById(ID);
            if (UNIT_LOCAL?.mateId === RESERVATION.parentIds.find((otherId) => otherId !== ID)) {
              UNIT_LOCAL.mateId = 0;
            }
          }
          return true;
        }
        advanceBreedPlans() {
          for (const PLAN of [...this._breedPlans.values()].sort(
            (a, b) => a.dueTick - b.dueTick || a.owner.localeCompare(b.owner)
          )) {
            if (this.simulationTick > PLAN.expiresTick) {
              this.cancelBreedPlan(PLAN);
              continue;
            }
            const [A, B] = PLAN.parentIds.map((id) => this.unitCollection.unitById(id));
            if (this.scene !== "farm" || this.farmBossEvent?.phase !== "idle" || !A || !B || A.mateId !== B.id || B.mateId !== A.id || A.hp <= 0 || B.hp <= 0 || A.down > 0 || B.down > 0 || !A.mature || !B.mature || !A.fed || !B.fed || A.cooldown > 0 || B.cooldown > 0 || A.breedingEligible === false || B.breedingEligible === false || A.species !== B.species || this.senseEnemy(A) || this.senseEnemy(B) || PLAN.targetSnapshot.some((value, index) => value !== this.farmTargets[index]) || !this.canFarmPopulationAdvance(A.species, { excludeReservation: PLAN.reservation })) {
              this.cancelBreedPlan(PLAN);
              continue;
            }
            if (this.simulationTick < PLAN.dueTick) {
              continue;
            }
            const DESTINATION = this.farmPlots.get(PLAN.destinationPlotId), ASSIGNMENTS_VALID = PLAN.assignments.every(({ unitId }) => {
              const UNIT_ID = unitId;
              const RESIDENT = this.unitCollection.unitById(UNIT_ID);
              return RESIDENT && RESIDENT.plotId === PLAN.originalAssignments.find((row) => row.unitId === UNIT_ID)?.plotId;
            });
            const FINAL_OCCUPANCY_FITS = [...this.farmPlots.values()].every((plot) => {
              return this.roster.placedPopulation(plot.id) + (this._breedPlotReservations.get(plot.id) || 0) <= plot.capacity;
            });
            if (!DESTINATION || !ASSIGNMENTS_VALID || !FINAL_OCCUPANCY_FITS || PLAN.assignments.some(({ unitId }) => {
              const UNIT_ID = unitId;
              const RESIDENT = this.unitCollection.unitById(UNIT_ID);
              if (!RESIDENT || this.unitCollection.reservationOwner(RESIDENT) !== PLAN.owner) {
                return true;
              }
              return PLAN.exchangeUnitIds.includes(UNIT_ID) && (RESIDENT.hp <= 0 || RESIDENT.down > 0 || RESIDENT.ability?.phase !== "idle" || RESIDENT.specialAbility && RESIDENT.specialAbility.phase !== "idle" || this.senseEnemy(RESIDENT));
            }) || this.ownedPopulation + this.birthReservations > this.totalFarmCapacity || !this.canFarmPopulationAdvance(A.species, { excludeReservation: PLAN.reservation })) {
              this.cancelBreedPlan(PLAN);
              continue;
            }
            this.unitCollection.releaseReservations(PLAN.owner);
            A.mateId = 0;
            B.mateId = 0;
            for (const UNIT_ID of PLAN.exchangeUnitIds) {
              this.clearInactiveForageAttempt(this.unitCollection.unitById(UNIT_ID));
            }
            if (!this.unitCollection.moveUnitsToPlots(PLAN.assignments)) {
              this.cancelBreedPlan(PLAN);
              continue;
            }
            this._breedPlans.delete(PLAN.owner);
            this.releaseBreedPlotReservations(PLAN);
            A.x = -0.22;
            A.y = 0;
            A.vx = A.vy = 0;
            B.x = 0.22;
            B.y = 0;
            B.vx = B.vy = 0;
            this._rebuildUnitSpatialIndex(this.units);
            const COMMITTED = DESTINATION.id === this.activePlotId ? FARM_MODES.breed.pair(this, A, B, true) : this.commitInactiveBreedBirth(A, B, DESTINATION.id);
            if (!COMMITTED) {
              this.unitCollection.moveUnitsToPlots(PLAN.originalAssignments);
              [A, B].forEach((unit, index) => Object.assign(unit, PLAN.originalPositions[index]));
              for (const UNIT_ID of PLAN.exchangeUnitIds) {
                const RESIDENT = this.unitCollection.unitById(UNIT_ID);
                RESIDENT && (RESIDENT.mateId = 0);
              }
              this._rebuildUnitSpatialIndex(this.units);
            }
          }
        }
        commitInactiveBreedBirth(a, b, plotId) {
          if (this.scene !== "farm" || !a || !b || a === b || a.plotId !== plotId || b.plotId !== plotId || a.hp <= 0 || b.hp <= 0 || a.down > 0 || b.down > 0 || !a.mature || !b.mature || !a.fed || !b.fed || a.cooldown > 0 || b.cooldown > 0 || a.species !== b.species || !this.canFarmPopulationAdvance(a.species) || this.ownedPopulation + this.birthReservations >= this.totalFarmCapacity || !this.availableFarmPlot(plotId)) {
            return false;
          }
          const OWNER = this.breedingReservationOwner(a, b);
          if (!this.unitCollection.reserve(OWNER, [a, b])) {
            return false;
          }
          a.mateId = b.id;
          b.mateId = a.id;
          const CHILD = new UNIT(this.nextId++, a.species, 1, (a.x + b.x) / 2, (a.y + b.y) / 2);
          CHILD.plotId = plotId;
          CHILD.growthDuration = this.breedGrowthDuration();
          if (!this.unitCollection.add(CHILD)) {
            this.releaseMate(a);
            return false;
          }
          a.meals = b.meals = 0;
          a.cooldown = b.cooldown = this.breedCooldownDuration();
          a.cooldownDuration = b.cooldownDuration = a.cooldown;
          a.cooldownSetAtTick = b.cooldownSetAtTick = this.simulationTick;
          this.releaseMate(a);
          this.metrics.births++;
          this.markProgressChanged();
          return true;
        }
        planInactiveBreed(unit, dt) {
          if (this.scene !== "farm" || unit.plotId === this.activePlotId || unit.plotId === RESERVE_PLOT_ID || this.simulationTick < (unit.nextMateSearchTick || 0) || unit.mateId || this.unitCollection.reservationOwner(unit) || !unit.mature || !unit.fed || unit.cooldown > 0 || unit.hp <= 0 || !this.canFarmPopulationAdvance(unit.species) || this.ownedPopulation + this.birthReservations >= this.totalFarmCapacity) {
            return false;
          }
          const CANDIDATES = this.roster.residentsOfSpecies(unit.species).filter(
            (candidate) => candidate !== unit && candidate.plotId !== this.activePlotId && candidate.plotId !== RESERVE_PLOT_ID && !candidate.mateId && !this.unitCollection.reservationOwner(candidate) && candidate.hp > 0 && candidate.down <= 0 && candidate.mature && candidate.fed && candidate.cooldown <= 0 && candidate.breedingEligible !== false
          ).sort(
            (a, b) => Number(a.plotId !== unit.plotId) - Number(b.plotId !== unit.plotId) || Number(a.tier !== unit.tier) - Number(b.tier !== unit.tier) || Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y) || a.id - b.id
          );
          for (const MATE of CANDIDATES) {
            const DISTANCE = Math.hypot(MATE.x - unit.x, MATE.y - unit.y), SPEED = Math.max(
              0.01,
              scaleMoveSpeed(2.2 * farmUpgradeRate(this.playerProgression.farmUpgrades, "growth"), unit)
            ), TICKS = Math.min(100, Math.max(1, Math.ceil(DISTANCE / SPEED / Math.max(dt, 1e-9))));
            if (this.reserveCrossPlotBreed(unit, MATE, { allowSamePlot: true, durationTicks: TICKS })) {
              unit.nextMateSearchTick = MATE.nextMateSearchTick = this.simulationTick + 10;
              return true;
            }
          }
          unit.nextMateSearchTick = this.simulationTick + 10;
          return false;
        }
        _isValidBreedReservation(unit, owner) {
          if (!owner?.startsWith("breed:")) {
            return false;
          }
          const MATE = this._unitById.get(unit.mateId);
          return !!(MATE && MATE.mateId === unit.id && this.unitCollection.reservationOwner(MATE) === owner && this.breedingReservationOwner(unit, MATE) === owner && this.canBreedPair(unit, MATE) && !this.senseEnemy(unit) && !this.senseEnemy(MATE));
        }
        releaseMate(unit) {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._rebuildUnitSpatialIndex(this.units);
          }
          const MATE = this._unitById.get(unit.mateId);
          const PLAN = this.breedPlanFor(unit);
          if (PLAN) {
            return this.cancelBreedPlan(PLAN);
          }
          if (unit.mateId && this.releaseActiveBreedReservation(
            this.breedingReservationOwner(unit, this.unitCollection.unitById(unit.mateId))
          )) {
            return true;
          }
          unit.mateId = 0;
          if (MATE && MATE.mateId === unit.id) {
            MATE.mateId = 0;
          }
          const OWNER = this.unitCollection.reservationOwner(unit);
          if (OWNER?.startsWith("breed:")) {
            this.unitCollection.releaseReservations(OWNER);
          }
        }
        reconcileMateReservations() {
          const BATCH = !this._spatialStepActive;
          if (BATCH) {
            this._beginSpatialQueryBatch();
          }
          try {
            if (this.scene !== "farm") {
              for (const UNIT_LOCAL of this.units) {
                this.releaseMate(UNIT_LOCAL);
              }
              return;
            }
            for (const TASK of [...this.mergeTasks]) {
              if (TASK.phase !== "approach") {
                continue;
              }
              const MATERIALS = TASK.materialIds.map((id) => this._unitById.get(id)), OWNER = MERGE_RESERVATION_OWNER(TASK.materialIds);
              if (!this.canMergeGroup(MATERIALS, { reservationOwner: OWNER }) || !this.unitCollection.reserve(OWNER, MATERIALS)) {
                this.cancelMergeTask(TASK);
              }
            }
            for (const UNIT_LOCAL of this.units) {
              if (this.breedPlanFor(UNIT_LOCAL)) {
                continue;
              }
              if (!UNIT_LOCAL.mateId) {
                const OWNER = this.unitCollection.reservationOwner(UNIT_LOCAL);
                if (OWNER?.startsWith("breed:")) {
                  this.unitCollection.releaseReservations(OWNER);
                }
                continue;
              }
              const MATE = this._unitById.get(UNIT_LOCAL.mateId);
              if (!MATE || MATE.mateId !== UNIT_LOCAL.id || !this.canBreedPair(UNIT_LOCAL, MATE) || !this.unitCollection.reserve(this.breedingReservationOwner(UNIT_LOCAL, MATE), [UNIT_LOCAL, MATE])) {
                this.releaseMate(UNIT_LOCAL);
              }
            }
          } finally {
            if (BATCH) {
              this._endSpatialQueryBatch();
            }
          }
        }
        findOrReserveMate(unit) {
          const BATCH = !this._spatialStepActive;
          if (BATCH) {
            this._beginSpatialQueryBatch();
          }
          try {
            const ACTIVE_PLAN = this.breedPlanFor(unit);
            if (ACTIVE_PLAN) {
              return this.unitCollection.unitById(ACTIVE_PLAN.parentIds.find((id) => id !== unit.id)) || null;
            }
            if (this.scene !== "farm" || !unit.mature || !unit.fed || unit.cooldown > 0 || unit.hp <= 0 || this.senseEnemy(unit)) {
              this.releaseMate(unit);
              return null;
            }
            if (!this.canFarmPopulationAdvance(unit.species) || this.ownedPopulation + this.birthReservations >= this.totalFarmCapacity) {
              this.releaseMate(unit);
              return null;
            }
            if (unit.mateId) {
              const CURRENT = this._unitById.get(unit.mateId);
              if (CURRENT && CURRENT.mateId === unit.id && this.canBreedPair(unit, CURRENT)) {
                return CURRENT;
              }
              this.releaseMate(unit);
            }
            if (this.simulationTick < (unit.nextMateSearchTick || 0)) {
              return null;
            }
            const CANDIDATES = [];
            for (const CANDIDATE of this.roster.residentsOfSpecies(unit.species)) {
              if (CANDIDATE === unit || CANDIDATE.mateId || CANDIDATE.plotId === RESERVE_PLOT_ID || CANDIDATE.hp <= 0 || CANDIDATE.down > 0 || !CANDIDATE.mature || !CANDIDATE.fed || CANDIDATE.cooldown > 0 || CANDIDATE.breedingEligible === false || this.unitCollection.reservationOwner(CANDIDATE) || (CANDIDATE.plotId === unit.plotId ? !this.canBreedPair(unit, CANDIDATE) : !this.canStartCrossPlotBreed(unit, CANDIDATE))) {
                continue;
              }
              CANDIDATES.push(CANDIDATE);
            }
            CANDIDATES.sort(
              (a, b) => Number(a.plotId !== unit.plotId) - Number(b.plotId !== unit.plotId) || Number(a.tier !== unit.tier) - Number(b.tier !== unit.tier) || Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y) || a.id - b.id
            );
            for (const MATE of CANDIDATES) {
              if (MATE.plotId !== unit.plotId) {
                const DISTANCE = Math.hypot(MATE.x - unit.x, MATE.y - unit.y), SPEED = Math.max(
                  0.01,
                  scaleMoveSpeed(2.2 * farmUpgradeRate(this.playerProgression.farmUpgrades, "growth"), unit)
                ), TICKS = Math.min(100, Math.max(1, Math.ceil(DISTANCE / SPEED / 0.05)));
                if (this.reserveCrossPlotBreed(unit, MATE, { durationTicks: TICKS })) {
                  unit.nextMateSearchTick = this.simulationTick + 10;
                  return MATE;
                }
                continue;
              }
              if (!this.reserveActiveBreedPair(unit, MATE)) {
                continue;
              }
              unit.nextMateSearchTick = this.simulationTick + 10;
              return MATE;
            }
            unit.nextMateSearchTick = this.simulationTick + 10;
            if (!CANDIDATES.length) {
              return null;
            }
            return null;
          } finally {
            if (BATCH) {
              this._endSpatialQueryBatch();
            }
          }
        }
        hasEligibleSameTierBreedPair() {
          if (this.scene !== "farm" || this.ownedPopulation + this.birthReservations >= this.totalFarmCapacity) {
            return false;
          }
          const BATCH = !this._spatialStepActive;
          if (BATCH) {
            this._beginSpatialQueryBatch();
          }
          try {
            for (const GROUP of this._speciesTierGroups) {
              let unreserved = 0;
              for (const UNIT_LOCAL of GROUP) {
                if (UNIT_LOCAL.isBattleOnlySummon || UNIT_LOCAL.breedingEligible === false || UNIT_LOCAL.hp <= 0 || !UNIT_LOCAL.mature || !UNIT_LOCAL.fed || UNIT_LOCAL.cooldown > 0 || !this.canFarmPopulationAdvance(UNIT_LOCAL.species) || !this._unitIsActive(UNIT_LOCAL)) {
                  continue;
                }
                if (!UNIT_LOCAL.mateId && !this.unitCollection.reservationOwner(UNIT_LOCAL)) {
                  if (++unreserved >= 2) {
                    return true;
                  }
                  continue;
                }
                const MATE = this._unitById.get(UNIT_LOCAL.mateId);
                if (MATE?.mateId === UNIT_LOCAL.id && this.unitCollection.reservationOwner(UNIT_LOCAL) === this.breedingReservationOwner(UNIT_LOCAL, MATE) && MATE.species === UNIT_LOCAL.species && MATE.tier === UNIT_LOCAL.tier && MATE.hp > 0 && MATE.mature && MATE.fed && MATE.cooldown <= 0 && MATE.breedingEligible !== false && !MATE.isBattleOnlySummon) {
                  return true;
                }
              }
            }
          } finally {
            if (BATCH) {
              this._endSpatialQueryBatch();
            }
          }
          return false;
        }
        canMergeGroup(materials, { requireContact = false, requireNoEnemy = false, reservationOwner = null } = {}) {
          const BATCH = !this._spatialStepActive;
          if (BATCH) {
            this._beginSpatialQueryBatch();
          }
          try {
            if (!Array.isArray(materials) || materials.length < 2) {
              return false;
            }
            const FIRST = materials[0], RESULT_TIER = FIRST?.tier + 1, MATERIAL_COUNT = mergeMaterialCostForTier(RESULT_TIER);
            if (MATERIAL_COUNT < 2 || materials.length !== MATERIAL_COUNT || FIRST.tier >= CONFIG.unit.maxTier) {
              return false;
            }
            const IDS = /* @__PURE__ */ new Set();
            for (const UNIT_LOCAL of materials) {
              if (!UNIT_LOCAL || IDS.has(UNIT_LOCAL.id) || UNIT_LOCAL.isBattleOnlySummon || UNIT_LOCAL.mergeEligible === false || UNIT_LOCAL.species !== FIRST.species || UNIT_LOCAL.tier !== FIRST.tier || UNIT_LOCAL.hp <= 0 || UNIT_LOCAL.down > 0 || !UNIT_LOCAL.mature || UNIT_LOCAL.cooldown > 0 || this.unitCollection.reservationOwner(UNIT_LOCAL) && this.unitCollection.reservationOwner(UNIT_LOCAL) !== reservationOwner && (reservationOwner || !this._isValidBreedReservation(
                UNIT_LOCAL,
                this.unitCollection.reservationOwner(UNIT_LOCAL)
              )) || !this._unitIsActive(UNIT_LOCAL)) {
                return false;
              }
              IDS.add(UNIT_LOCAL.id);
            }
            const EXCLUDED_TASK = reservationOwner ? this.mergeTasks.find((task) => MERGE_RESERVATION_OWNER(task.materialIds || []) === reservationOwner) : null;
            if (this._ownedSpeciesCounts[FIRST.species] - this._pendingMergeCost(FIRST.species, EXCLUDED_TASK) - MATERIAL_COUNT + 1 < 2) {
              return false;
            }
            if (requireNoEnemy && materials.some((unit) => this.senseEnemy(unit))) {
              return false;
            }
            if (requireContact) {
              const ANCHOR = materials[0];
              for (let index = 1; index < materials.length; index++) {
                const UNIT_LOCAL = materials[index];
                if (Math.hypot(ANCHOR.x - UNIT_LOCAL.x, ANCHOR.y - UNIT_LOCAL.y) > ANCHOR.radius + UNIT_LOCAL.radius + 0.2) {
                  return false;
                }
              }
            }
            return true;
          } finally {
            if (BATCH) {
              this._endSpatialQueryBatch();
            }
          }
        }
        canMergePair(a, b, options = {}) {
          return this.canMergeGroup([a, b], options);
        }
        selectMergeMaterials() {
          if (this.scene !== "farm") {
            return null;
          }
          const BATCH = !this._spatialStepActive;
          if (BATCH) {
            this._beginSpatialQueryBatch();
          }
          try {
            for (const GROUP of this._mergeEligibleGroups) {
              GROUP.length = 0;
            }
            for (const GROUP of this._speciesTierGroups) {
              for (const UNIT_LOCAL of GROUP) {
                if (!UNIT_LOCAL.isBattleOnlySummon && UNIT_LOCAL.mergeEligible !== false && UNIT_LOCAL.hp > 0 && UNIT_LOCAL.down <= 0 && UNIT_LOCAL.mature && UNIT_LOCAL.cooldown <= 0 && UNIT_LOCAL.tier < CONFIG.unit.maxTier && (!this.unitCollection.reservationOwner(UNIT_LOCAL) || this._isValidBreedReservation(
                  UNIT_LOCAL,
                  this.unitCollection.reservationOwner(UNIT_LOCAL)
                )) && !this.senseEnemy(UNIT_LOCAL)) {
                  this._mergeEligibleGroups[UNIT_LOCAL.species * (CONFIG.unit.maxTier + 1) + UNIT_LOCAL.tier].push(UNIT_LOCAL);
                }
              }
            }
            const COMPARE_IDS = (left, right) => {
              for (let index = 0; index < left.length; index++) {
                if (left[index] !== right[index]) {
                  return left[index] - right[index];
                }
              }
              return 0;
            };
            let bestTier = Infinity;
            let bestDistance = Infinity;
            let bestAnchorId = Infinity;
            let bestMaterialIds = null;
            let bestSortedIds = null;
            const NEAREST = this._mergeNearestScratch, MATERIALS = this._mergeMaterialsScratch, SORTED_IDS = this._mergeIdScratch;
            for (let tier = 1; tier < CONFIG.unit.maxTier; tier++) {
              const MATERIAL_COUNT = mergeMaterialCostForTier(tier + 1), NEAREST_COUNT = MATERIAL_COUNT - 1;
              if (MATERIAL_COUNT < 2) {
                continue;
              }
              for (let species = 0; species < CONFIG.unit.speciesCount; species++) {
                const GROUP = this._mergeEligibleGroups[species * (CONFIG.unit.maxTier + 1) + tier];
                if (GROUP.length < MATERIAL_COUNT || this._ownedSpeciesCounts[species] - this._pendingMergeCost(species) - MATERIAL_COUNT + 1 < 2) {
                  continue;
                }
                for (const ANCHOR of GROUP) {
                  NEAREST.length = 0;
                  for (const UNIT_LOCAL of GROUP) {
                    if (UNIT_LOCAL === ANCHOR) {
                      continue;
                    }
                    const DISTANCE = (UNIT_LOCAL.x - ANCHOR.x) ** 2 + (UNIT_LOCAL.y - ANCHOR.y) ** 2;
                    let insertAt = NEAREST.length;
                    for (let position2 = 0; position2 < NEAREST.length; position2++) {
                      const CURRENT = NEAREST[position2];
                      if (DISTANCE < CURRENT.distance || DISTANCE === CURRENT.distance && UNIT_LOCAL.id < CURRENT.unit.id) {
                        insertAt = position2;
                        break;
                      }
                    }
                    if (insertAt >= NEAREST_COUNT) {
                      continue;
                    }
                    NEAREST.splice(insertAt, 0, {
                      unit: UNIT_LOCAL,
                      distance: DISTANCE
                    });
                    if (NEAREST.length > NEAREST_COUNT) {
                      NEAREST.length = NEAREST_COUNT;
                    }
                  }
                  if (NEAREST.length !== NEAREST_COUNT) {
                    continue;
                  }
                  MATERIALS.length = 0;
                  MATERIALS.push(ANCHOR);
                  for (const ENTRY of NEAREST) {
                    MATERIALS.push(ENTRY.unit);
                  }
                  if (!this.canMergeGroup(MATERIALS, {
                    requireNoEnemy: true
                  })) {
                    continue;
                  }
                  let distance = 0;
                  for (let i = 0; i < MATERIALS.length; i++) {
                    for (let j = i + 1; j < MATERIALS.length; j++) {
                      distance += (MATERIALS[i].x - MATERIALS[j].x) ** 2 + (MATERIALS[i].y - MATERIALS[j].y) ** 2;
                    }
                  }
                  if (tier > bestTier || tier === bestTier && distance > bestDistance) {
                    continue;
                  }
                  SORTED_IDS.length = 0;
                  for (const UNIT_LOCAL of MATERIALS) {
                    SORTED_IDS.push(UNIT_LOCAL.id);
                  }
                  SORTED_IDS.sort((a, b) => a - b);
                  const IDS_ORDER = bestSortedIds ? COMPARE_IDS(SORTED_IDS, bestSortedIds) : -1;
                  if (bestMaterialIds && (tier > bestTier || tier === bestTier && (distance > bestDistance || distance === bestDistance && (IDS_ORDER > 0 || IDS_ORDER === 0 && ANCHOR.id >= bestAnchorId)))) {
                    continue;
                  }
                  bestTier = tier;
                  bestDistance = distance;
                  bestAnchorId = ANCHOR.id;
                  bestMaterialIds = MATERIALS.map((unit) => unit.id);
                  bestSortedIds = [...SORTED_IDS];
                }
              }
            }
            return bestMaterialIds ? bestMaterialIds.map((id) => this._unitById.get(id)) : null;
          } finally {
            if (BATCH) {
              this._endSpatialQueryBatch();
            }
          }
        }
        mergeDecision() {
          if (this.scene !== "farm") {
            return {
              available: false,
              code: "wrong-scene",
              reason: "농장 화면에서만 합성할 수 있어요."
            };
          }
          if (this.farmBossEvent?.phase !== "idle") {
            return {
              available: false,
              code: "boss-event",
              reason: "보스 이벤트 중에는 합성할 수 없어요."
            };
          }
          const MATERIALS = this.selectMergeMaterials();
          if (!MATERIALS) {
            return {
              available: false,
              code: "no-eligible-materials",
              reason: "합성 가능한 동종 개체가 부족해요."
            };
          }
          return {
            available: true,
            code: "ready",
            tier: MATERIALS[0].tier + 1,
            materialCount: MATERIALS.length,
            materials: MATERIALS,
            reason: "T" + (MATERIALS[0].tier + 1) + " 합성 " + MATERIALS.length + "개"
          };
        }
        mergeAvailability() {
          const DECISION = this.mergeDecision();
          return {
            available: DECISION.available,
            code: DECISION.code,
            reason: DECISION.reason,
            ...DECISION.available ? {
              tier: DECISION.tier,
              materialCount: DECISION.materialCount
            } : {}
          };
        }
        startManualMerge() {
          return this.mutateUnits(this._startManualMerge);
        }
        _startManualMerge() {
          const DECISION = this.mergeDecision();
          if (!DECISION.available) {
            return false;
          }
          const MATERIALS = DECISION.materials;
          const MATERIAL_IDS = MATERIALS.map((unit) => unit.id), OWNER = MERGE_RESERVATION_OWNER(MATERIAL_IDS), CENTER_X = MATERIALS.reduce((sum, unit) => sum + unit.x, 0) / MATERIALS.length, CENTER_Y = MATERIALS.reduce((sum, unit) => sum + unit.y, 0) / MATERIALS.length, DURATION3 = CONFIG.farm.merge.animationSeconds, SEQUENCE_WINDOW = DURATION3 * 0.72, STEP = SEQUENCE_WINDOW / MATERIALS.length;
          const REPLACE_OWNERS = [
            ...new Set(
              MATERIALS.map((unit) => this.unitCollection.reservationOwner(unit)).filter(
                (owner) => owner?.startsWith("breed:")
              )
            )
          ];
          if (!this.unitCollection.reserve(OWNER, MATERIALS, { replaceOwners: REPLACE_OWNERS })) {
            return false;
          }
          for (const UNIT_LOCAL of MATERIALS) {
            const MATE = this._unitById.get(UNIT_LOCAL.mateId);
            UNIT_LOCAL.mateId = 0;
            if (MATE?.mateId === UNIT_LOCAL.id) {
              MATE.mateId = 0;
            }
          }
          const TASK = {
            phase: "approach",
            aId: MATERIAL_IDS[0],
            bId: MATERIAL_IDS[1],
            materialIds: MATERIAL_IDS,
            startPositions: MATERIALS.map(({ id, x, y, z }) => ({ id, x, y, z })),
            centerX: CENTER_X,
            centerY: CENTER_Y,
            centerZ: CONFIG.farm.merge.centerHeight,
            sourceSpecies: MATERIALS[0].species,
            sourceTier: MATERIALS[0].tier,
            elapsed: 0,
            duration: DURATION3
          };
          this.mergeTasks.push(TASK);
          MATERIALS.forEach(
            (unit, index) => this.effects.push({
              kind: "merge-material",
              taskKey: OWNER,
              x: unit.x,
              y: unit.y,
              z: unit.z,
              targetX: CENTER_X,
              targetY: CENTER_Y,
              targetZ: TASK.centerZ,
              life: 0,
              delay: index * STEP,
              span: STEP,
              duration: (index + 1) * STEP,
              sequenceIndex: index,
              sequenceCount: MATERIALS.length
            })
          );
          this._markMergeTasksChanged();
          return true;
        }
        cancelMergeTask(task = this.mergeTask) {
          const TASK = task, INDEX = this.mergeTasks.indexOf(TASK);
          if (INDEX < 0) {
            return false;
          }
          if (TASK.materialIds?.length) {
            const OWNER = MERGE_RESERVATION_OWNER(TASK.materialIds);
            if (TASK.phase === "approach") {
              for (const ID of TASK.materialIds) {
                const UNIT_LOCAL = this._unitById.get(ID);
                if (UNIT_LOCAL && this.unitCollection.has(UNIT_LOCAL) && UNIT_LOCAL.hp > 0) {
                  UNIT_LOCAL.z = 0;
                  UNIT_LOCAL.vx = UNIT_LOCAL.vy = UNIT_LOCAL.vz = 0;
                  UNIT_LOCAL.moveControlActive = false;
                  UNIT_LOCAL.dropLanded = true;
                  this.updateUnitSpatial(UNIT_LOCAL);
                }
              }
              for (let index = this.effects.length - 1; index >= 0; index--) {
                if (this.effects[index].taskKey === OWNER) {
                  this.effects.splice(index, 1);
                }
              }
            }
            this.unitCollection.releaseReservations(OWNER);
          }
          this.mergeTasks.splice(INDEX, 1);
          this._markMergeTasksChanged();
          return true;
        }
        cancelMergeTasks() {
          const TASKS = [...this.mergeTasks];
          for (const TASK of TASKS) {
            this.cancelMergeTask(TASK);
          }
          return TASKS.length > 0;
        }
        advanceMergeTask(dt) {
          if (this.scene !== "farm") {
            this.cancelMergeTasks();
            return;
          }
          if (this.farmBossEvent?.phase !== "idle") {
            this.cancelMergeTasks();
            return;
          }
          for (const TASK of [...this.mergeTasks]) {
            if (TASK.phase === "animation") {
              TASK.elapsed = Math.min(TASK.duration, TASK.elapsed + dt);
              if (TASK.elapsed >= TASK.duration - 1e-9) {
                this.cancelMergeTask(TASK);
              }
              continue;
            }
            if (TASK.phase === "approach") {
              const MATERIALS = TASK.materialIds.map((id) => this._unitById.get(id)), OWNER = MERGE_RESERVATION_OWNER(TASK.materialIds);
              if (!this.canMergeGroup(MATERIALS, {
                requireNoEnemy: true,
                reservationOwner: OWNER
              }) || !this.unitCollection.reserve(OWNER, MATERIALS)) {
                this.cancelMergeTask(TASK);
                continue;
              }
              TASK.elapsed = Math.min(TASK.duration, TASK.elapsed + dt);
              const PROGRESS = CLAMP2(TASK.elapsed / TASK.duration, 0, 1), EASE_IN = PROGRESS ** 2.25, MOVE_DT = Math.max(dt, 1e-6);
              for (const [INDEX, UNIT_LOCAL] of MATERIALS.entries()) {
                const START = TASK.startPositions[INDEX], OLD_X = UNIT_LOCAL.x, OLD_Y = UNIT_LOCAL.y, OLD_Z = UNIT_LOCAL.z, NEXT_X = START.x + (TASK.centerX - START.x) * EASE_IN, NEXT_Y = START.y + (TASK.centerY - START.y) * EASE_IN, NEXT_Z = START.z + (TASK.centerZ - START.z) * EASE_IN;
                UNIT_LOCAL.x = NEXT_X;
                UNIT_LOCAL.y = NEXT_Y;
                UNIT_LOCAL.z = NEXT_Z;
                UNIT_LOCAL.vx = (NEXT_X - OLD_X) / MOVE_DT;
                UNIT_LOCAL.vy = (NEXT_Y - OLD_Y) / MOVE_DT;
                UNIT_LOCAL.vz = (NEXT_Z - OLD_Z) / MOVE_DT;
                UNIT_LOCAL.moveControlActive = false;
                UNIT_LOCAL.angle = Math.atan2(TASK.centerY - NEXT_Y, TASK.centerX - NEXT_X);
                this.updateUnitSpatial(UNIT_LOCAL);
              }
            }
          }
        }
        resolveMergeTaskAfterMovement() {
          let resolved = false;
          for (const TASK of [...this.mergeTasks]) {
            if (TASK.phase !== "approach") {
              continue;
            }
            const MATERIALS = TASK.materialIds.map((id) => this._unitById.get(id)), OWNER = MERGE_RESERVATION_OWNER(TASK.materialIds);
            if (TASK.elapsed < TASK.duration - 1e-9) {
              continue;
            }
            if (this.canMergeGroup(MATERIALS, {
              requireNoEnemy: true,
              reservationOwner: OWNER
            }) && this.mergeGroup(MATERIALS, { task: TASK })) {
              resolved = true;
            } else {
              this.cancelMergeTask(TASK);
            }
          }
          return resolved;
        }
        pair(a, b, priorityResolved = false) {
          return this.mutateUnits(this._pair, a, b, priorityResolved);
        }
        _pair(a, b, priorityResolved = false) {
          return FARM_MODES.breed.pair(this, a, b, priorityResolved);
        }
        mergeGroup(materials, options) {
          return this.mutateUnits(this._mergeGroup, materials, options);
        }
        _mergeGroup(materials, { task: taskParam } = {}) {
          const TASK = taskParam;
          const TASK_INDEX = this.mergeTasks.indexOf(TASK), OWNER = TASK?.materialIds ? MERGE_RESERVATION_OWNER(TASK.materialIds) : null;
          if (TASK_INDEX < 0 || TASK?.phase !== "approach" || this.scene !== "farm" || !OWNER || TASK.materialIds.length !== materials.length || !TASK.materialIds.every((id, index) => materials[index]?.id === id) || TASK.elapsed < TASK.duration - 1e-9 || !this.canMergeGroup(materials, {
            requireNoEnemy: true,
            reservationOwner: OWNER
          })) {
            return false;
          }
          const ORDERED = [...materials], FIRST = ORDERED[0], MATERIAL_IDS = ORDERED.map((unit) => unit.id), X = TASK.centerX, Y = TASK.centerY, Z = TASK.centerZ;
          const RESULT = new UNIT(this.nextId, FIRST.species, FIRST.tier + 1, X, Y);
          RESULT.dropLanded = false;
          RESULT.meals = 1;
          RESULT.growth = CONFIG.farm.breeding.matureMeals;
          RESULT.growthDuration = this.breedGrowthDuration();
          RESULT.growthElapsed = RESULT.growthDuration;
          RESULT.z = Math.max(0, Z - RESULT.height * 0.85);
          RESULT.vz = -CONFIG.farm.merge.resultFallVelocity;
          RESULT.cooldown = getMergeCooldownSeconds(this.playerProgression?.farmUpgrades);
          RESULT.cooldownDuration = RESULT.cooldown;
          const SEQUENCE_WINDOW = CONFIG.farm.merge.animationSeconds * 0.72, STEP = SEQUENCE_WINDOW / ORDERED.length;
          if (!this.replaceUnitGroup(
            ORDERED,
            RESULT,
            () => {
              this.nextId++;
              TASK.phase = "animation";
              TASK.aId = 0;
              TASK.bId = 0;
              TASK.materialIds = MATERIAL_IDS;
              TASK.resultId = RESULT.id;
              TASK.sourceSpecies = FIRST.species;
              TASK.sourceTier = FIRST.tier;
              TASK.elapsed = 0;
              TASK.duration = CONFIG.farm.merge.animationSeconds;
              this._markMergeTasksChanged();
              ORDERED.forEach(
                (unit, index) => this.effects.push({
                  kind: "merge-material",
                  x: unit.x,
                  y: unit.y,
                  z: 0.2,
                  targetX: X,
                  targetY: Y,
                  life: 0,
                  delay: index * STEP,
                  span: STEP,
                  duration: (index + 1) * STEP,
                  sequenceIndex: index,
                  sequenceCount: ORDERED.length
                })
              );
              this.metrics.merges++;
            },
            TASK
          )) {
            return false;
          }
          this.emit("merge", X, Y, 1, {
            delay: SEQUENCE_WINDOW,
            span: CONFIG.farm.merge.animationSeconds - SEQUENCE_WINDOW
          });
          return true;
        }
        step(dt) {
          const STEP_START = this.profiler?.start();
          this.mutationNotifications.begin();
          let failure = null;
          try {
            this._step(dt);
          } catch (error) {
            failure = error;
          }
          const MUTATION_START = this.profiler?.start();
          try {
            this.mutationNotifications.end(failure);
          } finally {
            this.profiler?.end("mutationDispatch", MUTATION_START);
            this.profiler?.end("worldStep", STEP_START);
          }
        }
        _step(dt) {
          const LOGIC_START = this.profiler?.start();
          this.simulationTick = (this.simulationTick || 0) + 1;
          this._spatialStepActive = true;
          this._spatialQueryDepth = 0;
          this.time += dt;
          let progressTimersAdvanced = false;
          advanceBossRewardCalculations(this);
          grantPendingBossAcquisitions(this);
          this.advanceBreedPlans();
          const UNITS = this._stepUnits;
          UNITS.length = 0;
          for (const UNIT_LOCAL of this.units) {
            if (UNIT_LOCAL.spawnedAtSimulationTick !== this.simulationTick) {
              UNITS.push(UNIT_LOCAL);
            }
          }
          this._rebuildUnitSpatialIndex(UNITS);
          this.formationSkills.update(dt);
          const SCENE = SIMULATION_SCENES[this.scene];
          SCENE.advanceClock(this, dt);
          const MERGE_TASK_START = this.profiler?.start();
          this.advanceMergeTask(dt);
          this.profiler?.end("mergeTask", MERGE_TASK_START);
          let effectWrite = 0;
          for (const EFFECT of this.effects) {
            EFFECT.life += dt;
            if (EFFECT.life < (Number.isFinite(EFFECT.duration) ? EFFECT.duration : 1)) {
              this.effects[effectWrite++] = EFFECT;
            }
          }
          this.effects.length = effectWrite;
          for (const PROJECTILE2 of this.projectiles) {
            PROJECTILE_BEHAVIORS.forProjectile(PROJECTILE2).advanceLifecycle(this, PROJECTILE2, dt);
          }
          this._rebuildFoodSpatialIndex();
          const WORK_START = this.profiler?.start(), PREVIOUS_WORK = this._lastFoodSearchSchedulerMetrics, CANDIDATES_BEFORE = this._foodSearchWork.candidateChecks, CELLS_BEFORE = this._foodSearchWork.cellVisits, WORK_UNITS = this._foodSearchScheduler.tick((this.metrics.logicTicks || 0) + 1), CURRENT_WORK = this._foodSearchScheduler.metrics;
          this._lastFoodSearchSchedulerMetrics = CURRENT_WORK;
          if (this.profiler) {
            this.profiler.count("workSchedulerTicks");
            this.profiler.count("workSchedulerUnits", WORK_UNITS);
            this.profiler.count("foodSearchCandidateChecks", this._foodSearchWork.candidateChecks - CANDIDATES_BEFORE);
            this.profiler.count("foodSearchCellVisits", this._foodSearchWork.cellVisits - CELLS_BEFORE);
            this.profiler.count("workSchedulerQueueDepth", CURRENT_WORK.queueDepth);
            this.profiler.count("workSchedulerJobsQueued", CURRENT_WORK.jobsQueued - (PREVIOUS_WORK?.jobsQueued || 0));
            this.profiler.count(
              "workSchedulerJobsCompleted",
              CURRENT_WORK.jobsCompleted - (PREVIOUS_WORK?.jobsCompleted || 0)
            );
            this.profiler.count(
              "workSchedulerJobsCancelled",
              CURRENT_WORK.jobsCancelled - (PREVIOUS_WORK?.jobsCancelled || 0)
            );
            this.profiler.count("workSchedulerWaitedJobs", CURRENT_WORK.lastTickWaitedJobs);
            this.profiler.count("workSchedulerWaitingTicks", CURRENT_WORK.lastTickWaitingTicks);
            this.profiler.maximum("workSchedulerMaxWaitTicks", CURRENT_WORK.lastTickMaxWaitTicks);
            this.profiler.count("workSchedulerBudgetExhaustions", Number(CURRENT_WORK.lastTickBudgetExhausted));
          }
          this.profiler?.end("workScheduler", WORK_START);
          this.reconcileMateReservations();
          const ACTIVE_UNIT_SET = new Set(UNITS);
          for (const U of UNITS) {
            U.moveControlActive = false;
            U.landingRecovery = Math.max(0, (U.landingRecovery || 0) - dt);
            if (U.hp <= 0) {
              if (!U.deathSplitHandled) {
                this.handleUnitDeath(U);
              }
              if (U.isBattleOnlySummon) {
                U.down = 0;
                continue;
              }
              if (U.down <= 0) {
                U.down = CONFIG.unit.corpseRecoverySeconds;
                U.ability.interrupt();
                U.specialAbility?.interrupt();
              }
              this.clearPeaRecoveryBoost(U);
              progressTimersAdvanced = SCENE.advanceDownedUnit(this, U, dt) || progressTimersAdvanced;
              continue;
            }
            U.age += dt;
            const UNIT_STATS = STATS(U.tier, U.species);
            if (U.hp > 0 && UNIT_STATS.regen > 0) {
              applyHealing(U, UNIT_STATS.regen * dt, UNIT_STATS);
            }
            if (!U.mature) {
              progressTimersAdvanced = true;
              U.growthElapsed = Math.min(U.growthDuration, U.growthElapsed + dt);
              U.growth = Math.min(
                CONFIG.farm.breeding.matureMeals,
                Math.floor(CONFIG.farm.breeding.matureMeals * U.growthElapsed / U.growthDuration + 1e-9)
              );
              if (U.mature) {
                this.markProgressChanged();
              }
            }
            if (U.cooldown > 0) {
              progressTimersAdvanced = true;
            }
            if (U.cooldown > 0 && U.cooldownSetAtTick !== this.simulationTick && U.cooldown <= dt + 1e-9) {
              this.markProgressChanged();
              this._markMergeAvailabilityChanged();
            }
            if (U.cooldownSetAtTick !== this.simulationTick) {
              U.cooldown = Math.max(0, U.cooldown - dt);
              if (U.cooldown < 1e-9) {
                U.cooldown = 0;
                U.cooldownDuration = 0;
              }
            }
            const AI_START = this.profiler?.start();
            const ENEMY_LOCAL = this.senseEnemy(U) || SCENE.fallbackEnemy(this, U);
            this.updateUnitIntent(U, dt, ENEMY_LOCAL, SCENE);
            this.profiler?.end("ai", AI_START);
          }
          if (this.scene === "farm") {
            for (const U of this.unitCollection.items) {
              if (!this.unitCollection.isResident(U) || ACTIVE_UNIT_SET.has(U) || U.plotId === this.activePlotId || U.spawnedAtSimulationTick === this.simulationTick) {
                continue;
              }
              U.landingRecovery = Math.max(0, (U.landingRecovery || 0) - dt);
              if (U.hp <= 0) {
                if (!U.deathSplitHandled) {
                  this.handleUnitDeath(U);
                }
                if (U.down <= 0) {
                  U.down = CONFIG.unit.corpseRecoverySeconds;
                  U.ability.interrupt();
                  U.specialAbility?.interrupt();
                }
                this.clearPeaRecoveryBoost(U);
                progressTimersAdvanced = SCENE.advanceDownedUnit(this, U, dt) || progressTimersAdvanced;
                continue;
              }
              U.age += dt;
              const UNIT_STATS = STATS(U.tier, U.species);
              if (UNIT_STATS.regen > 0) {
                applyHealing(U, UNIT_STATS.regen * dt, UNIT_STATS);
              }
              if (!U.mature) {
                progressTimersAdvanced = true;
                U.growthElapsed = Math.min(U.growthDuration, U.growthElapsed + dt);
                U.growth = Math.min(
                  CONFIG.farm.breeding.matureMeals,
                  Math.floor(CONFIG.farm.breeding.matureMeals * U.growthElapsed / U.growthDuration + 1e-9)
                );
              }
              if (U.cooldown > 0) {
                progressTimersAdvanced = true;
              }
              if (U.cooldown > 0 && U.cooldownSetAtTick !== this.simulationTick) {
                if (U.cooldown <= dt + 1e-9) {
                  this._markMergeAvailabilityChanged();
                }
                U.cooldown = Math.max(0, U.cooldown - dt);
                if (U.cooldown < 1e-9) {
                  U.cooldown = 0;
                  U.cooldownDuration = 0;
                }
              }
              if (this.advanceInactiveForage(U, dt)) {
                progressTimersAdvanced = true;
              }
              this.planInactiveBreed(U, dt);
            }
          }
          SCENE.checkpointProgress(this, dt, progressTimersAdvanced);
          SCENE.updateBattle(this, dt);
          this.metrics.logicTicks = (this.metrics.logicTicks || 0) + 1;
          this.profiler?.count("logicTicks");
          this.profiler?.end("logic", LOGIC_START);
          const PHYSICS_START = this.profiler?.start();
          this.advancePhysics(dt, UNITS, SCENE);
          this.profiler?.end("physics", PHYSICS_START);
          CornAttachmentModel.advance(this);
          const POST_STEP_START = this.profiler?.start();
          SCENE.resolveLifeContacts(this, UNITS);
          this.resolvePeaRecoveryBoosts(UNITS);
          let projectileWrite = 0;
          for (const PROJECTILE2 of this.projectiles) {
            if (PROJECTILE_BEHAVIORS.forProjectile(PROJECTILE2).isAlive(PROJECTILE2)) {
              this.projectiles[projectileWrite++] = PROJECTILE2;
            }
          }
          this.projectiles.length = projectileWrite;
          this.unitCollection.removeWhere((unit) => unit.isBattleOnlySummon && unit.hp <= 0);
          UNITS.length = 0;
          this.unitCollection.releaseStepReferences();
          this._spatialStepActive = false;
          this._unitSpatialDirty = true;
          this._foodSpatialDirty = true;
          this.profiler?.end("worldPostStep", POST_STEP_START);
        }
        updateUnitSpatial(unit) {
          const START = this.profiler?.start();
          this.unitSpatial.update(unit);
          this.profiler?.end("spatial", START);
        }
        updateFoodSpatial(food) {
          const START = this.profiler?.start();
          this.foodSpatial.update(food);
          this.profiler?.end("spatial", START);
        }
        advancePhysics(dt, units, scene) {
          this.metrics.physicsSteps = (this.metrics.physicsSteps || 0) + 1;
          this.profiler?.count("physicsSteps");
          this._oldStepPosition ||= { x: 0, y: 0, z: 0 };
          for (const F of this.food) {
            if (F.phase !== "grounded") {
              F.x += F.vx * dt;
              F.y += F.vy * dt;
              F.z += F.vz * dt - 6 * dt * dt;
              F.vz -= 12 * dt;
              if (F.z <= 0) {
                F.z = 0;
                if (F.phase === "flight") {
                  F.x = F.tx;
                  F.y = F.ty;
                  F.vx = F.vy = 0;
                  F.vz = 1.1;
                  F.phase = "bounce";
                  this.emit("food-land", F.x, F.y);
                } else {
                  F.vz = 0;
                  F.phase = "grounded";
                }
              }
              this.updateFoodSpatial(F);
            }
          }
          for (const U of units) {
            if (U.hp <= 0) {
              if (!U.isBattleOnlySummon) {
                scene.advanceDownedPhysics(this, U, dt);
              }
              continue;
            }
            if (this.isMergeTaskMaterial(U)) {
              this.updateUnitSpatial(U);
              continue;
            }
            const OLD_Z = U.z, OLD_POSITION = this._oldStepPosition;
            OLD_POSITION.x = U.x;
            OLD_POSITION.y = U.y;
            OLD_POSITION.z = U.z;
            if (U.stun > 0 && U.ability.phase !== "idle") {
              U.ability.interrupt();
            }
            if (U.stun > 0 && U.specialAbility && U.specialAbility.phase !== "idle") {
              U.specialAbility.interrupt();
            }
            U.integrate(dt);
            scene.afterLivingIntegration(this, U);
            const ACTIVE_ATTACK = U.specialAbility && U.specialAbility.phase !== "idle" ? U.specialAbility : U.ability;
            if (ACTIVE_ATTACK.phase === "active") {
              ACTIVE_ATTACK.afterMove?.(this, OLD_POSITION);
            }
            if (OLD_Z > 0 && U.z === 0) {
              U.landingRecovery = 0.25;
              if (!U.dropLanded) {
                U.dropLanded = true;
                U.bounce = 0.16;
                this.combat(scene.dropLandingEvent, {
                  unit: U.id,
                  ownerId: U.ownerId,
                  x: U.x,
                  y: U.y,
                  z: 0
                });
                this.effects.push({
                  kind: "drop-dust",
                  x: U.x,
                  y: U.y,
                  z: 0,
                  life: 0
                });
              }
              this.metrics.landings++;
              scene.landUnit(this, U);
            }
            this.boundBody(U, this.scene, U.radius);
            this.updateUnitSpatial(U);
          }
          this.integrateBossMotion(dt);
          if (this.boss.active) {
            this.updateProjectiles(dt);
            scene.separateBossUnits(this, units);
          }
          const COLLISION_START = this.profiler?.start();
          this.resolveContacts(units, dt);
          this.profiler?.end("collision", COLLISION_START);
        }
        updateUnitIntent(unit, dt, enemy, scene) {
          if (this.isMergeTaskMaterial(unit)) {
            return;
          }
          if (enemy) {
            this.raidUnit(unit, dt, enemy);
            return;
          }
          if (unit.hp > 0 && hasFaction(unit, FACTION_CONFIG.PLAYER) && !unit.isBattleOnlySummon) {
            const ACTIVE_ATTACK = unit.specialAbility && unit.specialAbility.phase !== "idle" ? unit.specialAbility : unit.ability;
            if (ACTIVE_ATTACK.phase !== "idle") {
              if (ACTIVE_ATTACK.phase !== "recover") {
                ACTIVE_ATTACK.interrupt();
              }
              ACTIVE_ATTACK.update(this, dt);
            }
            this.farmUnit(unit, dt);
            return;
          }
          scene.updateUnoccupied(this, unit, dt);
        }
        clearPeaRecoveryBoost(unit) {
          unit.peaRecoveryPending = false;
          unit.peaRecoveryBoostExpiresAtTick = 0;
          unit.peaRecoveryBoostMultiplier = 0;
        }
        resolvePeaRecoveryBoosts(units) {
          for (const UNIT_LOCAL of units) {
            if (UNIT_LOCAL.hp <= 0) {
              this.clearPeaRecoveryBoost(UNIT_LOCAL);
              continue;
            }
            if (UNIT_LOCAL.peaRecoveryBoostExpiresAtTick < this.simulationTick) {
              UNIT_LOCAL.peaRecoveryBoostExpiresAtTick = 0;
              UNIT_LOCAL.peaRecoveryBoostMultiplier = 0;
            }
            if (!UNIT_LOCAL.peaRecoveryPending || UNIT_LOCAL.down > 0 || UNIT_LOCAL.stun > 0 || UNIT_LOCAL.z > 0.1 || UNIT_LOCAL.landingRecovery > 0 || !UNIT_LOCAL.dropLanded || UNIT_LOCAL.ability.phase !== "idle" || UNIT_LOCAL.specialAbility && UNIT_LOCAL.specialAbility.phase !== "idle") {
              continue;
            }
            UNIT_LOCAL.peaRecoveryPending = false;
            const CONFIG_LOCAL = UNIT_LOCAL.ability.recoveryHasteConfig?.(this);
            if (CONFIG_LOCAL) {
              UNIT_LOCAL.peaRecoveryBoostExpiresAtTick = this.simulationTick + CONFIG_LOCAL.durationTicks;
              UNIT_LOCAL.peaRecoveryBoostMultiplier = CONFIG_LOCAL.speedMultiplier;
            }
          }
        }
        steer(u, x, y, _dt, speed2) {
          const DX = x - u.x, DY = y - u.y, D_LOCAL = Math.hypot(DX, DY);
          if (D_LOCAL > 0.08) {
            u.moveControlActive = true;
            const RECOVERY_HASTE = u.peaRecoveryBoostExpiresAtTick > 0 && u.peaRecoveryBoostExpiresAtTick >= this.simulationTick ? u.peaRecoveryBoostMultiplier : 1;
            u.moveControlVx = DX / D_LOCAL * speed2 * RECOVERY_HASTE;
            u.moveControlVy = DY / D_LOCAL * speed2 * RECOVERY_HASTE;
            u.angle = Math.atan2(DY, DX);
          }
        }
        _ensureContactSolverBuffers(length) {
          if (this._contactCorrectionX.length >= length) {
            return;
          }
          const CAPACITY = Math.max(length, this._contactCorrectionX.length * 2, 16);
          this._contactCorrectionX = new Float64Array(CAPACITY);
          this._contactCorrectionY = new Float64Array(CAPACITY);
          this._contactCorrectionCount = new Uint32Array(CAPACITY);
        }
        solveContactSeparations(units, dt, raidOnly = false) {
          this._ensureContactSolverBuffers(units.length);
          const CORRECTION_X = this._contactCorrectionX, CORRECTION_Y = this._contactCorrectionY, CORRECTION_COUNT = this._contactCorrectionCount, ITERATIONS = CONFIG.physics.separationIterations, SOFT_FACTOR = 1 - Math.exp(-CONFIG.physics.softSeparationRate * dt / ITERATIONS);
          for (let iteration = 0; iteration < ITERATIONS; iteration++) {
            CORRECTION_X.fill(0, 0, units.length);
            CORRECTION_Y.fill(0, 0, units.length);
            CORRECTION_COUNT.fill(0, 0, units.length);
            let correctionCount = 0;
            for (let i = 0; i < units.length; i++) {
              const UNIT_LOCAL = units[i];
              if (this.isMergeTaskMaterial(UNIT_LOCAL)) {
                continue;
              }
              if (raidOnly && (UNIT_LOCAL.hp <= 0 || !UNIT_LOCAL.dropLanded)) {
                continue;
              }
              const INVERSE_MASS_A = inverseBodyMass(UNIT_LOCAL);
              const PENDING = this._collectContactOrders(UNIT_LOCAL, i + 1, units.length - 1, this._contactPending);
              for (const J of PENDING) {
                const OTHER = units[J];
                if (this.isMergeTaskMaterial(OTHER)) {
                  continue;
                }
                if (raidOnly && (OTHER.hp <= 0 || !OTHER.dropLanded)) {
                  continue;
                }
                if (UNIT_LOCAL.z > OTHER.z + OTHER.height || OTHER.z > UNIT_LOCAL.z + UNIT_LOCAL.height) {
                  continue;
                }
                const DX = OTHER.x - UNIT_LOCAL.x, DY = OTHER.y - UNIT_LOCAL.y, DISTANCE = Math.hypot(DX, DY), RADIUS = UNIT_LOCAL.radius + OTHER.radius, INVERSE_MASS_B = inverseBodyMass(OTHER), INVERSE_MASS_SUM = INVERSE_MASS_A + INVERSE_MASS_B;
                if (INVERSE_MASS_SUM <= 0) {
                  continue;
                }
                const SOFT = DISTANCE >= RADIUS && DISTANCE < RADIUS + 0.22 && UNIT_LOCAL.z < 0.1 && OTHER.z < 0.1 && UNIT_LOCAL.ability.phase === "idle" && OTHER.ability.phase === "idle", TARGET_DISTANCE = SOFT ? RADIUS + 0.22 : RADIUS;
                if (DISTANCE >= TARGET_DISTANCE) {
                  continue;
                }
                const ANGLE = (Math.min(UNIT_LOCAL.id, OTHER.id) * 0.61803398875 + Math.max(UNIT_LOCAL.id, OTHER.id) * 0.38196601125) % 1 * Math.PI * 2, NORMAL_SIGN = UNIT_LOCAL.id < OTHER.id ? 1 : -1, NORMAL_X = DISTANCE > 1e-6 ? DX / DISTANCE : Math.cos(ANGLE) * NORMAL_SIGN, NORMAL_Y = DISTANCE > 1e-6 ? DY / DISTANCE : Math.sin(ANGLE) * NORMAL_SIGN, RELAXATION = SOFT ? SOFT_FACTOR : CONFIG.physics.separationRelaxation, PENETRATION = (TARGET_DISTANCE - DISTANCE) * RELAXATION, SHARE_A = INVERSE_MASS_A / INVERSE_MASS_SUM, SHARE_B = INVERSE_MASS_B / INVERSE_MASS_SUM;
                CORRECTION_X[i] -= NORMAL_X * PENETRATION * SHARE_A;
                CORRECTION_Y[i] -= NORMAL_Y * PENETRATION * SHARE_A;
                CORRECTION_COUNT[i] += SHARE_A > 0 ? 1 : 0;
                CORRECTION_X[J] += NORMAL_X * PENETRATION * SHARE_B;
                CORRECTION_Y[J] += NORMAL_Y * PENETRATION * SHARE_B;
                CORRECTION_COUNT[J] += SHARE_B > 0 ? 1 : 0;
                correctionCount++;
              }
            }
            if (!correctionCount) {
              break;
            }
            for (let i = 0; i < units.length; i++) {
              const UNIT_LOCAL = units[i], COUNT = CORRECTION_COUNT[i];
              if (!COUNT) {
                continue;
              }
              let deltaX = CORRECTION_X[i] / COUNT, deltaY = CORRECTION_Y[i] / COUNT;
              const LENGTH = Math.hypot(deltaX, deltaY), MAX_CORRECTION = Math.max(0.05, UNIT_LOCAL.radius * 1.25);
              if (LENGTH > MAX_CORRECTION) {
                const SCALE = MAX_CORRECTION / LENGTH;
                deltaX *= SCALE;
                deltaY *= SCALE;
              }
              UNIT_LOCAL.x += deltaX;
              UNIT_LOCAL.y += deltaY;
              this.boundBody(UNIT_LOCAL, this.scene, UNIT_LOCAL.radius);
            }
            for (const UNIT_LOCAL of units) {
              if (CORRECTION_COUNT[this._unitStepOrder.get(UNIT_LOCAL)] > 0) {
                this.updateUnitSpatial(UNIT_LOCAL);
              }
            }
            this.metrics.physicsSolverIterations++;
            this.profiler?.count("physicsSolverIterations");
          }
        }
        separateBossUnitsJacobi(units) {
          const BOSS2 = this.boss;
          if (!BOSS2.active || !units.length) {
            return;
          }
          this._ensureContactSolverBuffers(units.length);
          const CORRECTION_X = this._contactCorrectionX, CORRECTION_Y = this._contactCorrectionY, CORRECTION_COUNT = this._contactCorrectionCount;
          CORRECTION_X.fill(0, 0, units.length);
          CORRECTION_Y.fill(0, 0, units.length);
          CORRECTION_COUNT.fill(0, 0, units.length);
          let correctionCount = 0;
          for (let i = 0; i < units.length; i++) {
            const UNIT_LOCAL = units[i];
            if (!areOpposingFactions(UNIT_LOCAL, BOSS2) || UNIT_LOCAL.hp <= 0 || !UNIT_LOCAL.dropLanded || UNIT_LOCAL.z > BOSS2.height || inverseBodyMass(UNIT_LOCAL) <= 0) {
              continue;
            }
            const DX = UNIT_LOCAL.x - BOSS2.x, DY = UNIT_LOCAL.y - BOSS2.y, DISTANCE = Math.hypot(DX, DY), RADIUS = BOSS2.radius + UNIT_LOCAL.radius;
            if (DISTANCE >= RADIUS) {
              continue;
            }
            const ANGLE = DISTANCE > 1e-6 ? 0 : UNIT_LOCAL.seed, NORMAL_X = DISTANCE > 1e-6 ? DX / DISTANCE : Math.cos(ANGLE), NORMAL_Y = DISTANCE > 1e-6 ? DY / DISTANCE : Math.sin(ANGLE), INDEX = this._unitStepOrder.get(UNIT_LOCAL), OVERLAP = RADIUS - DISTANCE, INWARD = UNIT_LOCAL.vx * NORMAL_X + UNIT_LOCAL.vy * NORMAL_Y;
            CORRECTION_X[INDEX] += NORMAL_X * OVERLAP;
            CORRECTION_Y[INDEX] += NORMAL_Y * OVERLAP;
            CORRECTION_COUNT[INDEX]++;
            correctionCount++;
            if (INWARD < 0) {
              UNIT_LOCAL.vx -= INWARD * NORMAL_X;
              UNIT_LOCAL.vy -= INWARD * NORMAL_Y;
            }
          }
          if (!correctionCount) {
            return;
          }
          for (let i = 0; i < units.length; i++) {
            const UNIT_LOCAL = units[i], COUNT = CORRECTION_COUNT[i];
            if (!COUNT) {
              continue;
            }
            UNIT_LOCAL.x += CORRECTION_X[i] / COUNT;
            UNIT_LOCAL.y += CORRECTION_Y[i] / COUNT;
            this.boundBody(UNIT_LOCAL, this.scene, UNIT_LOCAL.radius);
          }
          for (const UNIT_LOCAL of units) {
            if (CORRECTION_COUNT[this._unitStepOrder.get(UNIT_LOCAL)] > 0) {
              this.updateUnitSpatial(UNIT_LOCAL);
            }
          }
          this.metrics.physicsSolverIterations++;
          this.profiler?.count("physicsSolverIterations");
        }
        raidContacts(units, dt = 1 / 20) {
          for (let i = 0; i < units.length; i++) {
            const UNIT_LOCAL = units[i];
            if (UNIT_LOCAL.hp <= 0 || !UNIT_LOCAL.dropLanded) {
              continue;
            }
            const PENDING = this._collectContactOrders(UNIT_LOCAL, i + 1, units.length - 1, this._contactPending);
            for (const J of PENDING) {
              const OTHER = units[J];
              if (OTHER.hp > 0 && OTHER.dropLanded && contact(UNIT_LOCAL, OTHER)) {
                this.metrics.contacts++;
              }
            }
          }
          this.solveContactSeparations(units, dt, true);
        }
        resolveContacts(units, dt = 1 / 20) {
          SIMULATION_SCENES[this.scene].resolveContacts(this, units, dt);
        }
        resolveFarmContacts(units, dt = 1 / 20) {
          for (let i = 0; i < units.length; i++) {
            const UNIT_LOCAL = units[i], PENDING = this._collectContactOrders(UNIT_LOCAL, i + 1, units.length - 1, this._contactPending);
            if (this.isMergeTaskMaterial(UNIT_LOCAL)) {
              continue;
            }
            for (const J of PENDING) {
              if (this.isMergeTaskMaterial(units[J])) {
                continue;
              }
              if (contact(UNIT_LOCAL, units[J])) {
                this.metrics.contacts++;
              }
            }
          }
          this.solveContactSeparations(units, dt);
        }
        resolveFarmContactPairs(units, sameTier) {
          for (let i = 0; i < units.length; i++) {
            const UNIT_LOCAL = units[i], PENDING = this._collectContactOrders(UNIT_LOCAL, i + 1, units.length - 1, this._contactPending);
            if (this.isMergeTaskMaterial(UNIT_LOCAL)) {
              continue;
            }
            for (const J of PENDING) {
              const OTHER = units[J];
              if (this.isMergeTaskMaterial(OTHER)) {
                continue;
              }
              if (UNIT_LOCAL.tier === OTHER.tier !== sameTier) {
                continue;
              }
              this.pair(UNIT_LOCAL, OTHER, true);
            }
          }
        }
        avoidNearbyFood(u, dt) {
          const RADIUS = 1.25;
          let pushX = 0;
          let pushY = 0;
          let strongest = 0;
          let nearest = null;
          let nearestDistance = Infinity;
          if (!this._spatialStepActive) {
            this._rebuildFoodSpatialIndex();
          }
          this.foodSpatial.queryAABB(u.x - RADIUS, u.y - RADIUS, u.x + RADIUS, u.y + RADIUS, this._foodCandidates);
          this._foodCandidates.sort(
            (a, b) => (this._foodOrder.get(a) ?? Infinity) - (this._foodOrder.get(b) ?? Infinity)
          );
          for (const FOOD of this._foodCandidates) {
            if (FOOD.phase !== "grounded") {
              continue;
            }
            const DX = u.x - FOOD.x, DY = u.y - FOOD.y, DISTANCE = Math.hypot(DX, DY);
            if (DISTANCE >= RADIUS) {
              continue;
            }
            const STRENGTH = 1 - DISTANCE / RADIUS, WEIGHT = STRENGTH * STRENGTH;
            if (DISTANCE < nearestDistance) {
              nearestDistance = DISTANCE;
              nearest = FOOD;
            }
            strongest = Math.max(strongest, STRENGTH);
            if (DISTANCE > 1e-6) {
              pushX += DX / DISTANCE * WEIGHT;
              pushY += DY / DISTANCE * WEIGHT;
            }
          }
          if (!nearest) {
            return false;
          }
          let magnitude = Math.hypot(pushX, pushY);
          if (magnitude < 1e-4) {
            if (nearestDistance > 1e-6) {
              pushX = u.x - nearest.x;
              pushY = u.y - nearest.y;
              magnitude = nearestDistance;
            } else {
              const ANGLE = (u.seed + (nearest.seed || 0)) * 2.3999632297;
              pushX = Math.cos(ANGLE);
              pushY = Math.sin(ANGLE);
              magnitude = 1;
            }
          }
          const AWAY_X = pushX / magnitude, AWAY_Y = pushY / magnitude;
          let desiredX = Math.sin(this.time * 0.18 + u.seed) * (CONFIG.farm.arena.radiusX * 0.78) - u.x;
          let desiredY = Math.cos(this.time * 0.16 + u.seed) * (CONFIG.farm.arena.radiusY * 0.78) - u.y;
          const DESIRED_LENGTH = Math.hypot(desiredX, desiredY) || 1;
          desiredX /= DESIRED_LENGTH;
          desiredY /= DESIRED_LENGTH;
          const TOWARD_FOOD = desiredX * AWAY_X + desiredY * AWAY_Y;
          if (TOWARD_FOOD < 0) {
            desiredX -= TOWARD_FOOD * AWAY_X;
            desiredY -= TOWARD_FOOD * AWAY_Y;
          }
          let moveX = desiredX + AWAY_X * (0.5 + 1.5 * strongest);
          let moveY = desiredY + AWAY_Y * (0.5 + 1.5 * strongest);
          let moveLength = Math.hypot(moveX, moveY);
          if (moveLength < 1e-4) {
            moveX = AWAY_X;
            moveY = AWAY_Y;
            moveLength = 1;
          }
          this.steer(u, u.x + moveX / moveLength, u.y + moveY / moveLength, dt, scaleMoveSpeed(0.75, u));
          return true;
        }
        findNearestGroundFood(x, y) {
          if (!this._spatialStepActive) {
            this._rebuildFoodSpatialIndex();
          }
          if (!this._groundedFoodCount) {
            return null;
          }
          const GRID = this.foodSpatial, CX = GRID.cellX(x), CY = GRID.cellY(y);
          if (CX < 0 || CY < 0 || CX >= GRID.cellCount || CY >= GRID.cellCount) {
            return null;
          }
          let nearest = null;
          let nearestDistance = Infinity;
          let nearestOrder = Infinity;
          const MAX_RING = Math.max(CX, CY, GRID.cellCount - 1 - CX, GRID.cellCount - 1 - CY);
          for (let ring = 0; ring <= MAX_RING; ring++) {
            GRID.queryCellRing(CX, CY, ring, this._foodCandidates);
            for (const FOOD of this._foodCandidates) {
              if (!this._isCurrentGroundedFood(FOOD)) {
                continue;
              }
              const DISTANCE = Math.hypot(FOOD.x - x, FOOD.y - y), ORDER = this._foodOrder.get(FOOD) ?? Infinity;
              if (DISTANCE < nearestDistance || DISTANCE === nearestDistance && ORDER < nearestOrder) {
                nearest = FOOD;
                nearestDistance = DISTANCE;
                nearestOrder = ORDER;
              }
            }
            if (nearest && nearestDistance < GRID.distanceToOutsideRing(x, y, CX, CY, ring)) {
              break;
            }
            if ((2 * ring + 1) * (2 * ring + 1) > this._groundedFoodCount) {
              nearest = null;
              nearestDistance = Infinity;
              nearestOrder = Infinity;
              for (const FOOD of this._groundedFoods) {
                if (!this._isCurrentGroundedFood(FOOD)) {
                  continue;
                }
                const DISTANCE = Math.hypot(FOOD.x - x, FOOD.y - y), ORDER = this._foodOrder.get(FOOD) ?? Infinity;
                if (DISTANCE < nearestDistance || DISTANCE === nearestDistance && ORDER < nearestOrder) {
                  nearest = FOOD;
                  nearestDistance = DISTANCE;
                  nearestOrder = ORDER;
                }
              }
              break;
            }
          }
          return nearest;
        }
        _isCurrentGroundedFood(food) {
          return !!food && food.phase === "grounded" && this.foodSpatial.itemCells.has(food);
        }
        _startFoodTargetSearch(unit) {
          const GRID = this.foodSpatial, CX = GRID.cellX(unit.x), CY = GRID.cellY(unit.y);
          if (CX < 0 || CY < 0 || CX >= GRID.cellCount || CY >= GRID.cellCount) {
            return null;
          }
          const STATE = {
            key: `food-target:${unit.id}:${++this._foodSearchJobSequence}`,
            unit,
            snapshot: this._foodSearchSnapshot,
            revision: this._foodSearchSnapshot.revision,
            x: unit.x,
            y: unit.y,
            centerX: CX,
            centerY: CY,
            maxRing: Math.max(CX, CY, GRID.cellCount - 1 - CX, GRID.cellCount - 1 - CY),
            ring: 0,
            ringCellIndex: 0,
            bucket: EMPTY_FOOD_SEARCH_BUCKET,
            bucketIndex: 0,
            phase: "rings",
            fallbackIndex: 0,
            nearest: null,
            nearestDistance: Infinity,
            nearestOrder: Infinity,
            status: "searching",
            target: null
          };
          this._foodSearchStates.set(unit, STATE);
          this._foodSearchScheduler.enqueue({
            key: STATE.key,
            owner: this,
            priority: 1,
            isValid: () => this.scene === "farm" && this._foodSearchStates.get(unit) === STATE && this._unitById.get(unit.id) === unit && unit.hp > 0 && !unit.fed,
            step: ({ maxUnits }) => this._stepFoodTargetSearch(STATE, maxUnits),
            onComplete: ({ result }) => {
              if (this._foodSearchStates.get(unit) !== STATE) {
                return;
              }
              if (result && this._isCurrentGroundedFood(result)) {
                STATE.target = result;
                STATE.status = "ready";
                return;
              }
              if (STATE.revision !== this._groundedFoodRevision) {
                this._foodSearchStates.delete(unit);
                if (this.scene === "farm" && this._unitById.get(unit.id) === unit && unit.hp > 0 && !unit.fed) {
                  this._startFoodTargetSearch(unit);
                }
                return;
              }
              STATE.status = "empty";
            }
          });
          return null;
        }
        _stepFoodTargetSearch(state, maxUnits) {
          const GRID = this.foodSpatial, SNAPSHOT = state.snapshot;
          let unitsUsed = 0;
          while (true) {
            if (state.phase === "fallback" && state.fallbackIndex >= SNAPSHOT.foods.length) {
              return { done: true, unitsUsed, result: state.nearest };
            }
            if (state.phase === "rings") {
              const RING_CELLS = state.ring === 0 ? 1 : 8 * state.ring, RING_COMPLETE = state.ringCellIndex >= RING_CELLS && state.bucketIndex >= state.bucket.length;
              if (RING_COMPLETE) {
                if (state.nearest && state.nearestDistance < GRID.distanceToOutsideRing(state.x, state.y, state.centerX, state.centerY, state.ring)) {
                  return { done: true, unitsUsed, result: state.nearest };
                }
                if ((2 * state.ring + 1) ** 2 > this._groundedFoodCount) {
                  state.phase = "fallback";
                  state.fallbackIndex = 0;
                  state.nearest = null;
                  state.nearestDistance = Infinity;
                  state.nearestOrder = Infinity;
                  continue;
                }
                state.ring++;
                state.ringCellIndex = 0;
                state.bucket = EMPTY_FOOD_SEARCH_BUCKET;
                state.bucketIndex = 0;
              }
            }
            if (unitsUsed >= maxUnits) {
              return { done: false, unitsUsed };
            }
            if (state.phase === "fallback") {
              const FOOD = SNAPSHOT.foods[state.fallbackIndex++];
              if (this._isCurrentGroundedFood(FOOD)) {
                this._considerFoodTarget(state, FOOD);
              }
              this._foodSearchWork.candidateChecks++;
              unitsUsed++;
              continue;
            }
            if (state.bucketIndex < state.bucket.length) {
              const FOOD = state.bucket[state.bucketIndex++];
              if (this._isCurrentGroundedFood(FOOD)) {
                this._considerFoodTarget(state, FOOD);
              }
              this._foodSearchWork.candidateChecks++;
              unitsUsed++;
              continue;
            }
            const RING = state.ring, INDEX = state.ringCellIndex++, EDGE_COUNT = RING === 0 ? 1 : 2 * (2 * RING + 1);
            let cellX, cellY;
            if (RING === 0) {
              cellX = state.centerX;
              cellY = state.centerY;
            } else if (INDEX < EDGE_COUNT) {
              cellX = state.centerX - RING + Math.floor(INDEX / 2);
              cellY = INDEX % 2 === 0 ? state.centerY - RING : state.centerY + RING;
            } else {
              const INNER_INDEX = INDEX - EDGE_COUNT;
              cellX = INNER_INDEX % 2 === 0 ? state.centerX - RING : state.centerX + RING;
              cellY = state.centerY - RING + 1 + Math.floor(INNER_INDEX / 2);
            }
            const CELL_KEY = cellX >= 0 && cellY >= 0 && cellX < GRID.cellCount && cellY < GRID.cellCount ? cellY * GRID.cellCount + cellX : -1;
            state.bucket = CELL_KEY < 0 ? EMPTY_FOOD_SEARCH_BUCKET : SNAPSHOT.cells.get(CELL_KEY) || EMPTY_FOOD_SEARCH_BUCKET;
            state.bucketIndex = 0;
            this._foodSearchWork.cellVisits++;
            unitsUsed++;
          }
        }
        _considerFoodTarget(state, food) {
          const DISTANCE = Math.hypot(food.x - state.x, food.y - state.y), ORDER = this._foodOrder.get(food) ?? Infinity;
          if (DISTANCE < state.nearestDistance || DISTANCE === state.nearestDistance && ORDER < state.nearestOrder) {
            state.nearest = food;
            state.nearestDistance = DISTANCE;
            state.nearestOrder = ORDER;
          }
        }
        requestGroundFoodTarget(unit) {
          if (!this._spatialStepActive) {
            this._rebuildFoodSpatialIndex();
          }
          if (!unit || this.scene !== "farm" || unit.hp <= 0 || unit.fed || !this.canFarmPopulationAdvance(unit.species) || !this._groundedFoodCount) {
            this._cancelFoodTargetSearch(unit);
            return null;
          }
          const STATE = this._foodSearchStates.get(unit);
          if (STATE?.status === "ready" && this._isCurrentGroundedFood(STATE.target)) {
            return STATE.target;
          }
          if (STATE?.status === "searching") {
            return null;
          }
          if (STATE?.status === "empty" && STATE.revision === this._foodSearchSnapshot.revision) {
            return null;
          }
          if (STATE) {
            this._cancelFoodTargetSearch(unit);
          }
          return this._startFoodTargetSearch(unit);
        }
        farmUnit(u, dt) {
          FARM_MODES.breed.update(this, u, dt);
        }
        combat(kind, detail) {
          this.notice(kind, { time: this.time, ...detail });
        }
        boundBody(body, scene, margin) {
          const ARENA = CONFIG[scene].arena, RX = ARENA.radiusX - margin, RY = ARENA.radiusY - margin, K = Math.max(1, Math.hypot(body.x / RX, body.y / RY));
          if (K === 1) {
            return;
          }
          body.x /= K;
          body.y /= K;
          const NX = body.x / (RX * RX), NY = body.y / (RY * RY), LENGTH = Math.hypot(NX, NY) || 1, OUTWARD = ((body.vx || 0) * NX + (body.vy || 0) * NY) / LENGTH;
          if (OUTWARD > 0) {
            body.vx -= NX / LENGTH * OUTWARD * 1.3;
            body.vy -= NY / LENGTH * OUTWARD * 1.3;
          }
        }
        combatEvent(kind, u, action, cycle = u.ability) {
          this.combatLog.push({
            kind,
            id: action?.id ?? 0,
            unit: u.id,
            species: u.species,
            time: this.time,
            x: u.x,
            y: u.y,
            z: u.z
          });
          if (this.combatLog.length > 240) {
            this.combatLog.shift();
          }
          if (kind === "launch") {
            this.combat("attack-launch", {
              species: u.species,
              unit: u.id,
              x: u.x,
              y: u.y,
              z: u.z,
              attackKind: cycle?.spec?.kind || abilityProfile(u.species).kind
            });
            cycle?.onLaunch?.(this, action);
          }
        }
        riceCriticalChanceBonus(u, hpBefore, maxHp) {
          return (u.ability || CREATE_UNIT_ATTACK_CYCLE(u)).criticalChanceBonus?.(this, hpBefore, maxHp) ?? 0;
        }
        applyGrainOnBasicHit(u, target, kind) {
          if (!hasFaction(u, FACTION_CONFIG.PLAYER) || kind !== abilityProfile(u.species).kind) {
            return;
          }
          (u.ability || CREATE_UNIT_ATTACK_CYCLE(u)).onBasicHit?.(this, target);
        }
        attackTarget(unit, action) {
          if (action?.targetId === "boss" || !action?.targetId) {
            return this.boss.generation === action?.targetGeneration && areOpposingFactions(unit, this.boss) ? this.boss : null;
          }
          const TARGET = this._unitForId(action.targetId);
          return TARGET?.generation === action.targetGeneration && TARGET.hp > 0 && areOpposingFactions(unit, TARGET) ? TARGET : null;
        }
        createAttackContext(u, { attackMultiplier = null, attackKind = null, strikeIndex = null, area = false, criticalRoll = null } = {}) {
          const SPEC = abilityProfile(u.species), ROSTER2 = this.raidRoster(u.ownerId), ATTACKER_STATS = resolveUnitStats(u);
          return {
            source: u,
            sourceKind: hasFaction(u, FACTION_CONFIG.PLAYER) ? "direct" : "enemy",
            attackerStats: ATTACKER_STATS,
            damageMultiplier: Number.isFinite(attackMultiplier) ? attackMultiplier : SPEC.skillMultiplier,
            kind: attackKind || SPEC.kind,
            buffed: !!ROSTER2 && this.time < ROSTER2.buffUntil,
            attackPowerMultiplier: u.giantUntil > this.time ? 3 : 1,
            strikeIndex,
            area,
            criticalRoll,
            hitTargets: area ? /* @__PURE__ */ new Set() : null,
            sourceStatOverrides: {
              critChance: ATTACKER_STATS.critChance
            }
          };
        }
        unitStatsFor(unit) {
          return resolveUnitStats(unit);
        }
        combatTargetDefense(target) {
          if (target !== this.boss) {
            const TARGET_STATS = resolveUnitStats(target), ABILITY_ARMOR = target.ability?.armorModifier?.(this, this.simulationTick) || 0;
            return {
              maxHp: TARGET_STATS.maxHp,
              armor: BarleyArmorShredModel.effectiveArmor(
                target,
                TARGET_STATS.armor,
                (target.giantUntil > this.time ? 100 : 0) + ABILITY_ARMOR,
                this.simulationTick
              )
            };
          }
          const HP_RATIO = Number.isFinite(target.hp) && Number.isFinite(target.maxHp) && target.maxHp > 0 ? CLAMP2(target.hp / target.maxHp, 0, 1) : 1;
          return {
            maxHp: target.maxHp,
            armor: BarleyArmorShredModel.effectiveArmor(target, (1 - HP_RATIO) * 100, 0, this.simulationTick)
          };
        }
        damageCombatTarget(u, action, target, point2, options = {}) {
          return this.mutateUnits(this._damageCombatTarget, u, action, target, point2, options);
        }
        _damageCombatTarget(u, action, target, point2, options = {}) {
          const IS_BOSS = target === this.boss;
          if (!target || target.hp <= 0 || !areOpposingFactions(u, target) || action.hit || IS_BOSS && !hasFaction(u, FACTION_CONFIG.PLAYER) || options.attackContext?.hitTargets?.has(target)) {
            return false;
          }
          action.hit = true;
          const CONTEXT = options.attackContext || this.createAttackContext(u, options), {
            source: SOURCE,
            attackerStats: ATTACKER_STATS,
            damageMultiplier: DAMAGE_MULTIPLIER,
            kind: KIND,
            buffed: BUFFED
          } = CONTEXT;
          CONTEXT.hitTargets?.add(target);
          const DEFENSE = this.combatTargetDefense(target), CRITICAL_BONUS = KIND === abilityProfile(SOURCE.species).kind ? this.riceCriticalChanceBonus(SOURCE, target.hp, DEFENSE.maxHp) : 0, SOURCE_STAT_OVERRIDES = {
            ...CONTEXT.sourceStatOverrides,
            critChance: CLAMP2(ATTACKER_STATS.critChance + CRITICAL_BONUS, 0, 1)
          };
          const RAW_BASE_DAMAGE = ATTACKER_STATS.attackPower * (CONTEXT.attackPowerMultiplier ?? (SOURCE.giantUntil > this.time ? 3 : 1)) * DAMAGE_MULTIPLIER * (BUFFED ? CONFIG.raid.buff.damage : 1), RAW_DAMAGE = RAW_BASE_DAMAGE + (SOURCE.ability?.rawDamageBonus?.(this, action, KIND) || 0);
          const DAMAGE = applyDamageToTargets(SOURCE, [target], {
            rawDamage: RAW_DAMAGE,
            area: CONTEXT.area,
            sourceKind: CONTEXT.sourceKind,
            sourceStatOverrides: SOURCE_STAT_OVERRIDES,
            armorForTarget: () => DEFENSE.armor,
            roll: () => CONTEXT.criticalRoll ?? (CONTEXT.criticalRoll = this.random())
          });
          if (!IS_BOSS) {
            const CRITICAL_RAW_DAMAGE = RAW_DAMAGE * (DAMAGE.critical ? SOURCE_STAT_OVERRIDES.critMultiplier ?? ATTACKER_STATS.critMultiplier ?? 1 : 1);
            target.ability?.receiveRawDamage?.(this, CRITICAL_RAW_DAMAGE, SOURCE, action);
          }
          if (!IS_BOSS) {
            this._syncUnitAliveCount(target);
          }
          this.onCombatResolved.emit({
            excluded: SOURCE.isFormationClone,
            damageDealt: SOURCE.faction === "player" ? DAMAGE.totalActualLoss / ((SOURCE.giantUntil > this.time ? 3 : 1) * (BUFFED ? CONFIG.raid.buff.damage : 1)) : 0,
            damageTaken: target.faction === "player" && !target.isFormationClone ? DAMAGE.totalActualLoss : 0,
            hits: SOURCE.faction === "player" ? 1 : 0,
            critHits: SOURCE.faction === "player" && DAMAGE.critical ? 1 : 0
          });
          this.applyGrainOnBasicHit(SOURCE, target, KIND);
          SOURCE.ability?.afterSuccessfulAttack?.(this, action, target, DAMAGE);
          const STRENGTH = DAMAGE_MULTIPLIER * (BUFFED ? CONFIG.raid.buff.damage : 1) * (DAMAGE.critical ? ATTACKER_STATS.critMultiplier : 1);
          if (IS_BOSS) {
            this.finishBossHit(SOURCE, action, point2, CONTEXT, DAMAGE, STRENGTH);
          } else {
            this.finishUnitHit(SOURCE, action, target, point2, CONTEXT, DAMAGE, STRENGTH);
          }
          return true;
        }
        finishBossHit(u, action, point2, { kind, strikeIndex, buffed }, damage, strength) {
          this.boss.flash = 0.13;
          const DX = point2.x - this.boss.x, DY = point2.y - this.boss.y, D_LOCAL = Math.hypot(DX, DY) || 1;
          this.combat("boss-hit", {
            unit: u.id,
            ownerId: u.ownerId,
            species: u.species,
            attackId: action.id,
            strikeIndex,
            attackKind: kind,
            buffed,
            critical: damage.critical,
            x: this.boss.x + DX / D_LOCAL * this.boss.radius,
            y: this.boss.y + DY / D_LOCAL * this.boss.radius,
            z: CLAMP2(point2.z + 0.2, 0.2, this.boss.height),
            nx: DX / D_LOCAL,
            ny: DY / D_LOCAL,
            strength
          });
          this.combatEvent("damage", u, action);
        }
        finishUnitHit(u, action, target, point2, { kind, strikeIndex }, damage, strength) {
          const DX = target.x - u.x, DY = target.y - u.y, N = Math.hypot(DX, DY) || 1;
          target.knock(DX / N, DY / N, 5, 2.4, u);
          if (target.hp === 0) {
            target.down = target.isBattleOnlySummon ? 0 : CONFIG.unit.corpseRecoverySeconds;
            this.handleUnitDeath(target);
          }
          this.metrics.directHits++;
          this.metrics.basicHits++;
          this.combat("unit-hit", {
            attackKind: kind,
            attackId: action.id,
            strikeIndex,
            unit: target.id,
            sourceUnit: u.id,
            damage: damage?.damage || 0,
            critical: !!damage?.critical,
            x: point2.x,
            y: point2.y,
            z: Math.max(0.15, target.z + 0.25),
            nx: DX / N,
            ny: DY / N,
            strength
          });
        }
        updateProjectiles(dt) {
          const BATCH = !this._spatialStepActive;
          if (BATCH) {
            this._beginSpatialQueryBatch();
          }
          try {
            for (const PROJECTILE2 of this.projectiles) {
              const BEHAVIOR = PROJECTILE_BEHAVIORS.forProjectile(PROJECTILE2);
              if (!this._spatialStepActive) {
                BEHAVIOR.advanceLifecycle(this, PROJECTILE2, dt);
              }
              if (BEHAVIOR.isAlive(PROJECTILE2)) {
                BEHAVIOR.update(this, PROJECTILE2, dt);
              }
            }
            for (const PROJECTILE2 of this.projectiles) {
              PROJECTILE_BEHAVIORS.forProjectile(PROJECTILE2).updateChain(this, PROJECTILE2);
            }
            this.boss.flash = Math.max(0, (this.boss.flash || 0) - dt);
          } finally {
            if (BATCH) {
              this._endSpatialQueryBatch();
            }
          }
        }
        raidUnit(u, dt, enemy = this.boss) {
          if (!u.dropLanded || !areOpposingFactions(u, enemy)) {
            return;
          }
          if (u.hp <= 0) {
            u.down = CONFIG.unit.corpseRecoverySeconds;
            u.ability.interrupt();
            u.specialAbility?.interrupt();
            this.clearPeaRecoveryBoost(u);
            return;
          }
          const ACTIVE_ATTACK = u.specialAbility && u.specialAbility.phase !== "idle" ? u.specialAbility : u.ability;
          if (ACTIVE_ATTACK.update(this, dt) || u.stun > 0 || u.z > 0.1 || u.landingRecovery > 0) {
            return;
          }
          if (u.ability.isGuarding?.(this.simulationTick)) {
            return;
          }
          if (!enemy) {
            return;
          }
          const B_LOCAL = enemy, SPEC = abilityProfile(u.species), DX = u.x - B_LOCAL.x, DY = u.y - B_LOCAL.y, N = Math.hypot(DX, DY) || 1, TARGET_ID = enemy === this.boss ? "boss" : enemy.id;
          const BEHAVIOR = unitCapabilityComposition(u.species), STAND = B_LOCAL.radius + SPEC.range + (u.tier - 1) * 0.12, MIN = STAND - 0.55, MAX = STAND + BEHAVIOR.outerRangeSlack;
          if (N > MAX || BEHAVIOR.retreatWithinRange && N < MIN) {
            const SLOT = ARENA_GEOMETRY.clamp(
              {
                x: B_LOCAL.x + DX / N * STAND,
                y: B_LOCAL.y + DY / N * STAND
              },
              this.scene,
              u.radius
            );
            this.steer(u, SLOT.x, SLOT.y, dt, scaleMoveSpeed(4.1, u));
            return;
          }
          u.vx = u.vy = 0;
          const TARGET = BEHAVIOR.aimAtCenter ? {
            id: TARGET_ID,
            generation: B_LOCAL.generation,
            x: B_LOCAL.x,
            y: B_LOCAL.y
          } : {
            id: TARGET_ID,
            generation: B_LOCAL.generation,
            x: B_LOCAL.x + DX / N * (B_LOCAL.radius + u.radius - 0.16),
            y: B_LOCAL.y + DY / N * (B_LOCAL.radius + u.radius - 0.16)
          };
          const SPECIAL_ABILITY = u.specialAbility;
          if (SPECIAL_ABILITY?.canBegin?.(this) && N <= B_LOCAL.radius + SPECIAL_ABILITY.spec.range + (u.tier - 1) * 0.12) {
            SPECIAL_ABILITY.begin(this, TARGET);
            return;
          }
          if (u.ability.tryStartGuard?.(this, TARGET)) {
            return;
          }
          u.ability.begin(this, TARGET);
        }
        finish(outcome) {
          return this.mutateUnits(this._finish, outcome);
        }
        _finish(outcome) {
          if (!this.running) {
            return;
          }
          const BOSS_PATTERN_ELAPSED = this.boss.patternRuntime.active?.phaseElapsed || 0;
          this.running = false;
          this.boss.active = false;
          this.encounter.outcome = outcome;
          this.projectiles = [];
          this.boss.patternRuntime.active = null;
          for (const U of this.units) {
            U.ability.interrupt();
            U.specialAbility?.interrupt();
            this.clearPeaRecoveryBoost(U);
          }
          this.formationSkills.end();
          this.cleanupBattleSummons();
          this.combat(outcome, {
            x: this.boss.x,
            y: this.boss.y,
            z: 0,
            bossPatternElapsed: BOSS_PATTERN_ELAPSED
          });
        }
        finishFarmBossEvent(outcome) {
          return this.mutateUnits(this._finishFarmBossEvent, outcome);
        }
        _finishFarmBossEvent(outcome) {
          if (this.scene !== "farm" || this.farmBossEvent.phase !== "fighting") {
            return false;
          }
          this.formationSkills.end();
          this.cleanupBattleSummons();
          this.boss.active = false;
          if (this.boss.patternRuntime) {
            this.boss.patternRuntime.active = null;
          }
          this.projectiles = [];
          const ENCOUNTER_ID = this.farmBossEvent.encounterId;
          this.farmBossEvent = {
            phase: "celebrating",
            elapsed: 0,
            outcome,
            encounterId: ENCOUNTER_ID,
            rewardStatus: "none",
            rewardChance: 0,
            rewardRoll: 0,
            rewardUnitId: 0
          };
          for (const U of this.units) {
            U.specialAbility?.interrupt();
            this.clearPeaRecoveryBoost(U);
            if (U.hp > 0) {
              U.ability.interrupt();
            }
          }
          if (outcome === "victory") {
            const EVENT_STAGE = this.boss.stage, STAGE_STATS = bossStageStats(EVENT_STAGE);
            const SETTLEMENT2 = settleBossKill(this, {
              encounterId: ENCOUNTER_ID,
              source: "farm",
              stage: EVENT_STAGE,
              species: this.boss.species,
              tier: 1,
              x: this.boss.x,
              y: this.boss.y,
              rollBudget: STAGE_STATS.rollBudget,
              xpAmount: STAGE_STATS.xp
            });
            this.playerProgression.farmBossEventStage = Math.min(EVENT_STAGE + 1, BOSS_REWARD_SETTINGS.maxStage);
            const REWARD2 = SETTLEMENT2.receipt;
            this.combat("farm-boss-xp", {
              encounterId: ENCOUNTER_ID,
              xp: SETTLEMENT2.xpAwarded,
              levelsGained: SETTLEMENT2.levelsGained,
              pointsAwarded: SETTLEMENT2.pointsAwarded
            });
            this.combat("farm-boss-reward", {
              acquired: REWARD2.grantedCount > 0,
              pending: REWARD2.status === "pending",
              successCount: REWARD2.successCount,
              grantedCount: REWARD2.grantedCount,
              species: REWARD2.species,
              tier: REWARD2.tier,
              chance: REWARD2.chance,
              roll: REWARD2.roll,
              encounterId: ENCOUNTER_ID
            });
          }
          this.markProgressChanged();
          this.combat(outcome === "victory" ? "farm-boss-victory" : "farm-boss-defeat", {
            x: this.boss.x,
            y: this.boss.y,
            z: 0
          });
          return true;
        }
        bossAttackArea(unitRadius = 0) {
          return bossAttackArea(this.boss, unitRadius, this.scene);
        }
        bossWeaponPoint(q = 0) {
          return BOSS_BEHAVIORS.weaponPoint(this.boss, q);
        }
        livingBossTargets() {
          return this.units.filter((u) => hasFaction(u, FACTION_CONFIG.PLAYER) && u.hp > 0 && u.dropLanded).sort((a, b) => a.id - b.id);
        }
        nearestBossTarget(living, groundOnly = false) {
          const B_LOCAL = this.boss;
          let best = null;
          let distance = Infinity;
          for (const UNIT_LOCAL of living) {
            if (groundOnly && UNIT_LOCAL.z > 0.1) {
              continue;
            }
            const NEXT = Math.hypot(UNIT_LOCAL.x - B_LOCAL.x, UNIT_LOCAL.y - B_LOCAL.y);
            if (NEXT < distance || NEXT === distance && (!best || UNIT_LOCAL.id < best.id)) {
              best = UNIT_LOCAL;
              distance = NEXT;
            }
          }
          return best;
        }
        bossTargetGrid(_living) {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._rebuildUnitSpatialIndex(this.units);
          }
          const B_LOCAL = this.boss, RANGE = CONFIG.unit.perceptionRange, EXTENT = RANGE + CONFIG.unit.maxRadius, UNITS = this._bossGridUnits, GROUND_UNITS = this._bossGroundUnits;
          UNITS.length = 0;
          GROUND_UNITS.length = 0;
          this.unitSpatial.queryAABB(
            B_LOCAL.x - EXTENT,
            B_LOCAL.y - EXTENT,
            B_LOCAL.x + EXTENT,
            B_LOCAL.y + EXTENT,
            this._bossQueryCandidates
          );
          for (const UNIT_LOCAL of this._bossQueryCandidates) {
            if (!this._unitIsActive(UNIT_LOCAL) || !hasFaction(UNIT_LOCAL, FACTION_CONFIG.PLAYER) || UNIT_LOCAL.hp <= 0 || !UNIT_LOCAL.dropLanded || Math.hypot(UNIT_LOCAL.x - B_LOCAL.x, UNIT_LOCAL.y - B_LOCAL.y) > RANGE + UNIT_LOCAL.radius) {
              continue;
            }
            UNITS.push(UNIT_LOCAL);
            if (UNIT_LOCAL.z <= 0.1) {
              GROUND_UNITS.push(UNIT_LOCAL);
            }
          }
          UNITS.sort((a, c) => a.id - c.id);
          GROUND_UNITS.sort((a, c) => a.id - c.id);
          return {
            units: UNITS,
            groundUnits: GROUND_UNITS,
            cellSize: 3,
            range: RANGE
          };
        }
        eachBossGridUnit(grid, minX, minY, maxX, maxY, visit, groundOnly = false) {
          this.unitSpatial.queryAABB(minX, minY, maxX, maxY, this._bossQueryCandidates);
          const B_LOCAL = this.boss;
          for (const UNIT_LOCAL of this._bossQueryCandidates) {
            if (!this._unitIsActive(UNIT_LOCAL) || !hasFaction(UNIT_LOCAL, FACTION_CONFIG.PLAYER) || UNIT_LOCAL.hp <= 0 || !UNIT_LOCAL.dropLanded || groundOnly && UNIT_LOCAL.z > 0.1 || Math.hypot(UNIT_LOCAL.x - B_LOCAL.x, UNIT_LOCAL.y - B_LOCAL.y) > grid.range + UNIT_LOCAL.radius) {
              continue;
            }
            visit(UNIT_LOCAL);
          }
        }
        chargeBossTarget(living, grid = this.bossTargetGrid(living)) {
          const B_LOCAL = this.boss, CONFIG_LOCAL = BOSS_PATTERN_CONFIG["attack.charge"];
          if (!grid.units.length) {
            return null;
          }
          const BINS = 72, CANDIDATES = /* @__PURE__ */ new Map();
          for (const UNIT_LOCAL of grid.units) {
            const DX = UNIT_LOCAL.x - B_LOCAL.x, DY = UNIT_LOCAL.y - B_LOCAL.y, D_LOCAL = Math.hypot(DX, DY), ANGLE = Math.atan2(DY, DX), BIN = Math.floor((ANGLE + Math.PI) / (Math.PI * 2) * BINS) % BINS, CURRENT = CANDIDATES.get(BIN);
            if (!CURRENT || D_LOCAL < CURRENT.distance - 1e-9 || Math.abs(D_LOCAL - CURRENT.distance) <= 1e-9 && UNIT_LOCAL.id < CURRENT.unit.id) {
              CANDIDATES.set(BIN, {
                unit: UNIT_LOCAL,
                distance: D_LOCAL,
                angle: ANGLE
              });
            }
          }
          let best = null;
          for (const CANDIDATE of CANDIDATES.values()) {
            const END = ARENA_GEOMETRY.clamp(
              {
                x: B_LOCAL.x + Math.cos(CANDIDATE.angle) * CONFIG_LOCAL.reach,
                y: B_LOCAL.y + Math.sin(CANDIDATE.angle) * CONFIG_LOCAL.reach
              },
              this.scene,
              B_LOCAL.radius + 0.25
            ), FROM = {
              x: B_LOCAL.x,
              y: B_LOCAL.y,
              z: B_LOCAL.z
            }, TO = {
              x: END.x,
              y: END.y,
              z: B_LOCAL.z
            }, EXTENT = B_LOCAL.radius + CONFIG.unit.maxRadius;
            let score = 0;
            this.eachBossGridUnit(
              grid,
              Math.min(FROM.x, TO.x) - EXTENT,
              Math.min(FROM.y, TO.y) - EXTENT,
              Math.max(FROM.x, TO.x) + EXTENT,
              Math.max(FROM.y, TO.y) + EXTENT,
              (unit) => {
                if (ARENA_GEOMETRY.sweep(FROM, TO, B_LOCAL.radius, B_LOCAL.height, unit)) {
                  score++;
                }
              }
            );
            if (score && (!best || score > best.score || score === best.score && (CANDIDATE.distance < best.distance - 1e-9 || Math.abs(CANDIDATE.distance - best.distance) <= 1e-9 && CANDIDATE.unit.id < best.unit.id))) {
              best = {
                ...CANDIDATE,
                score
              };
            }
          }
          return best?.unit || null;
        }
        leapBossTarget(living, grid = this.bossTargetGrid(living)) {
          const B_LOCAL = this.boss, CONFIG_LOCAL = BOSS_PATTERN_CONFIG["attack.leap-slam"];
          if (!grid.units.length) {
            return null;
          }
          const CANDIDATES = /* @__PURE__ */ new Map(), SIZE = grid.cellSize;
          for (const UNIT_LOCAL of grid.groundUnits) {
            let dx = UNIT_LOCAL.x - B_LOCAL.x;
            let dy = UNIT_LOCAL.y - B_LOCAL.y;
            const D_LOCAL = Math.hypot(dx, dy) || 1;
            if (D_LOCAL > CONFIG_LOCAL.reach) {
              dx *= CONFIG_LOCAL.reach / D_LOCAL;
              dy *= CONFIG_LOCAL.reach / D_LOCAL;
            }
            const POINT2 = ARENA_GEOMETRY.clamp(
              {
                x: B_LOCAL.x + dx,
                y: B_LOCAL.y + dy
              },
              this.scene,
              B_LOCAL.radius + 0.25
            ), CELL_X = Math.floor(POINT2.x / SIZE), CELL_Y = Math.floor(POINT2.y / SIZE), KEY2 = (CELL_Y + 64) * 128 + (CELL_X + 64), DISTANCE = Math.hypot(UNIT_LOCAL.x - B_LOCAL.x, UNIT_LOCAL.y - B_LOCAL.y), CURRENT = CANDIDATES.get(KEY2);
            if (!CURRENT || DISTANCE < CURRENT.distance - 1e-9 || Math.abs(DISTANCE - CURRENT.distance) <= 1e-9 && UNIT_LOCAL.id < CURRENT.unit.id) {
              CANDIDATES.set(KEY2, {
                unit: UNIT_LOCAL,
                distance: DISTANCE,
                point: POINT2
              });
            }
          }
          let best = null;
          for (const CANDIDATE of CANDIDATES.values()) {
            let score = 0;
            const EXTENT = CONFIG_LOCAL.landingRadius + CONFIG.unit.maxRadius;
            this.eachBossGridUnit(
              grid,
              CANDIDATE.point.x - EXTENT,
              CANDIDATE.point.y - EXTENT,
              CANDIDATE.point.x + EXTENT,
              CANDIDATE.point.y + EXTENT,
              (unit) => {
                if (Math.hypot(unit.x - CANDIDATE.point.x, unit.y - CANDIDATE.point.y) <= CONFIG_LOCAL.landingRadius + unit.radius) {
                  score++;
                }
              },
              true
            );
            if (score && (!best || score > best.score || score === best.score && (CANDIDATE.distance < best.distance - 1e-9 || Math.abs(CANDIDATE.distance - best.distance) <= 1e-9 && CANDIDATE.unit.id < best.unit.id))) {
              best = {
                ...CANDIDATE,
                score
              };
            }
          }
          return best?.unit || null;
        }
        bossPatternTargets(living) {
          const GRID = this.bossTargetGrid(living);
          return {
            nearest: this.nearestBossTarget(living, true),
            charge: this.chargeBossTarget(living, GRID),
            leap: this.leapBossTarget(living, GRID)
          };
        }
        bossTargetForPattern(id, living) {
          const BEHAVIOR = BOSS_BEHAVIORS.forId(id);
          return BEHAVIOR ? BEHAVIOR.target(this, living) : this.nearestBossTarget(living, true);
        }
        eligibleBossPatterns(living, targets = this.bossPatternTargets(living)) {
          const RUNTIME = this.boss.patternRuntime, ALIVE_ADDS = this.units.reduce((n, u) => n + (hasFaction(u, FACTION_CONFIG.ENEMY) && u.hp > 0 ? 1 : 0), 0), ELIGIBLE = [];
          for (const ID of BOSS_PATTERN_IDS) {
            if (RUNTIME.cooldowns[ID] > 1e-9) {
              continue;
            }
            if (BOSS_BEHAVIORS.forId(ID).eligible(this, targets, ALIVE_ADDS)) {
              ELIGIBLE.push(ID);
            }
          }
          return ELIGIBLE;
        }
        beginBossPattern(id, target) {
          const B_LOCAL = this.boss, RUNTIME = B_LOCAL.patternRuntime, CONFIG_LOCAL = BOSS_PATTERN_CONFIG[id];
          if (!CONFIG_LOCAL) {
            return false;
          }
          const TARGET_POINT = target ? {
            x: target.x,
            y: target.y,
            z: target.z || 0
          } : null, AIM = TARGET_POINT ? Math.atan2(TARGET_POINT.y - B_LOCAL.y, TARGET_POINT.x - B_LOCAL.x) : B_LOCAL.angle;
          RUNTIME.active = {
            id,
            phase: "windup",
            phaseElapsed: 0,
            targetId: target?.id ?? 0,
            target: TARGET_POINT,
            aim: AIM,
            locked: false,
            start: {
              x: B_LOCAL.x,
              y: B_LOCAL.y,
              z: B_LOCAL.z
            },
            traveled: 0,
            hitIds: /* @__PURE__ */ new Set(),
            volleyCount: 0,
            released: 0,
            nextRelease: 0,
            path: null
          };
          B_LOCAL.angle = AIM;
          B_LOCAL.facing = AIM;
          this.combat("boss-pattern-prepare", {
            patternId: id,
            attackKind: id,
            x: B_LOCAL.x,
            y: B_LOCAL.y,
            z: B_LOCAL.z,
            angle: AIM,
            targetId: RUNTIME.active.targetId
          });
          return true;
        }
        hitBossPatternUnit(unit, patternId, point2, normal = null) {
          return this.mutateUnits(this._hitBossPatternUnit, unit, patternId, point2, normal);
        }
        _hitBossPatternUnit(unit, patternId, point2, normal = null) {
          const B_LOCAL = this.boss, ACTION = B_LOCAL.patternRuntime.active, CONFIG_LOCAL = BOSS_PATTERN_CONFIG[patternId];
          if (!ACTION || !CONFIG_LOCAL || !hasFaction(unit, FACTION_CONFIG.PLAYER) || !areOpposingFactions(B_LOCAL, unit) || unit.hp <= 0 || !unit.dropLanded || ACTION.hitIds.has(unit.id)) {
            return false;
          }
          if (CONFIG_LOCAL.groundOnly && unit.z > 0.1) {
            return false;
          }
          ACTION.hitIds.add(unit.id);
          const DX = normal?.x ?? unit.x - B_LOCAL.x, DY = normal?.y ?? unit.y - B_LOCAL.y, N = Math.hypot(DX, DY) || 1;
          const GUARD = unit.ability.receiveGuard?.(this), KNOCKBACK_MULTIPLIER = GUARD?.receivedKnockbackMultiplier ?? 1;
          unit.knock(
            DX / N,
            DY / N,
            CONFIG_LOCAL.knockback * KNOCKBACK_MULTIPLIER,
            CONFIG_LOCAL.lift * KNOCKBACK_MULTIPLIER,
            B_LOCAL
          );
          if (!hasFaction(unit, FACTION_CONFIG.PLAYER) || !areOpposingFactions(B_LOCAL, unit)) {
            return false;
          }
          const RECEIVED = applyDamageToTargets(null, [unit], {
            armorForTarget: () => this.combatTargetDefense(unit).armor,
            rawDamage: B_LOCAL.attackPower * CONFIG_LOCAL.damageMultiplier * (GUARD?.receivedDamageMultiplier ?? 1),
            sourceKind: "enemy"
          });
          this.onCombatResolved.emit({ damageTaken: RECEIVED.totalActualLoss, excluded: unit.isFormationClone });
          this._syncUnitAliveCount(unit);
          if (unit.hp === 0) {
            unit.down = unit.isBattleOnlySummon ? 0 : CONFIG.unit.corpseRecoverySeconds;
            this.handleUnitDeath(unit);
          }
          this.metrics.directHits++;
          this.metrics[BOSS_BEHAVIORS.forId(patternId).hitMetric]++;
          this.combat("unit-hit", {
            attackKind: patternId,
            attackId: B_LOCAL.attackId,
            unit: unit.id,
            x: point2.x,
            y: point2.y,
            z: Math.max(0.15, unit.z + 0.25),
            nx: DX / N,
            ny: DY / N,
            strength: CONFIG_LOCAL.damageMultiplier
          });
          return true;
        }
        resolveBossSector(action, patternId, range, sector) {
          const B_LOCAL = this.boss, AIM = action.aim, HALF = sector / 2;
          let hits = 0;
          const EXTENT = range + CONFIG.unit.maxRadius;
          for (const UNIT_LOCAL of this._collectBossTargets(
            B_LOCAL.x - EXTENT,
            B_LOCAL.y - EXTENT,
            B_LOCAL.x + EXTENT,
            B_LOCAL.y + EXTENT,
            this._bossHitCandidates,
            true
          )) {
            if (action.hitIds.has(UNIT_LOCAL.id) || UNIT_LOCAL.z > 0.1) {
              continue;
            }
            const DX = UNIT_LOCAL.x - B_LOCAL.x, DY = UNIT_LOCAL.y - B_LOCAL.y, D_LOCAL = Math.hypot(DX, DY);
            if (D_LOCAL > range + UNIT_LOCAL.radius) {
              continue;
            }
            const OFFSET = Math.atan2(Math.sin(Math.atan2(DY, DX) - AIM), Math.cos(Math.atan2(DY, DX) - AIM)), PAD = D_LOCAL <= UNIT_LOCAL.radius ? Math.PI : Math.asin(Math.min(1, UNIT_LOCAL.radius / Math.max(D_LOCAL, 1e-6)));
            if (Math.abs(OFFSET) > HALF + PAD) {
              continue;
            }
            const N = D_LOCAL || 1;
            if (this.hitBossPatternUnit(
              UNIT_LOCAL,
              patternId,
              {
                x: UNIT_LOCAL.x,
                y: UNIT_LOCAL.y,
                z: 0
              },
              {
                x: DX / N,
                y: DY / N
              }
            )) {
              hits++;
            }
          }
          return hits;
        }
        resolveBossCircle(action, patternId, range) {
          const B_LOCAL = this.boss;
          let hits = 0;
          const EXTENT = range + CONFIG.unit.maxRadius;
          for (const UNIT_LOCAL of this._collectBossTargets(
            B_LOCAL.x - EXTENT,
            B_LOCAL.y - EXTENT,
            B_LOCAL.x + EXTENT,
            B_LOCAL.y + EXTENT,
            this._bossHitCandidates,
            true
          )) {
            if (action.hitIds.has(UNIT_LOCAL.id)) {
              continue;
            }
            const DX = UNIT_LOCAL.x - B_LOCAL.x, DY = UNIT_LOCAL.y - B_LOCAL.y, D_LOCAL = Math.hypot(DX, DY);
            if (D_LOCAL > range + UNIT_LOCAL.radius) {
              continue;
            }
            if (this.hitBossPatternUnit(
              UNIT_LOCAL,
              patternId,
              {
                x: B_LOCAL.x + DX / (D_LOCAL || 1) * Math.min(D_LOCAL, range),
                y: B_LOCAL.y + DY / (D_LOCAL || 1) * Math.min(D_LOCAL, range),
                z: 0
              },
              {
                x: DX / (D_LOCAL || 1),
                y: DY / (D_LOCAL || 1)
              }
            )) {
              hits++;
            }
          }
          return hits;
        }
        sweepBossBody(old, patternId) {
          const B_LOCAL = this.boss, ACTION = B_LOCAL.patternRuntime.active, EXTENT = B_LOCAL.radius + CONFIG.unit.maxRadius;
          for (const UNIT_LOCAL of this._collectBossTargets(
            Math.min(old.x, B_LOCAL.x) - EXTENT,
            Math.min(old.y, B_LOCAL.y) - EXTENT,
            Math.max(old.x, B_LOCAL.x) + EXTENT,
            Math.max(old.y, B_LOCAL.y) + EXTENT,
            this._bossHitCandidates
          )) {
            if (ACTION.hitIds.has(UNIT_LOCAL.id)) {
              continue;
            }
            const HIT = ARENA_GEOMETRY.sweep(old, B_LOCAL, B_LOCAL.radius, B_LOCAL.height, UNIT_LOCAL);
            if (HIT) {
              this.hitBossPatternUnit(
                UNIT_LOCAL,
                patternId,
                HIT,
                BOSS_BEHAVIORS.forId(patternId).sweepNormal(B_LOCAL)
              );
            }
          }
        }
        fanBossWeapon(action, q0, q1) {
          const CONFIG_LOCAL = BOSS_PATTERN_CONFIG[action.id], SPAN = CONFIG_LOCAL.sector, FROM_ANGLE = action.aim - SPAN / 2 + SPAN * CLAMP2(q0, 0, 1), TO_ANGLE = action.aim - SPAN / 2 + SPAN * CLAMP2(q1, 0, 1), B_LOCAL = this.boss;
          const FROM = {
            x: B_LOCAL.x + Math.cos(FROM_ANGLE) * CONFIG_LOCAL.reach,
            y: B_LOCAL.y + Math.sin(FROM_ANGLE) * CONFIG_LOCAL.reach,
            z: 0.2
          }, TO = {
            x: B_LOCAL.x + Math.cos(TO_ANGLE) * CONFIG_LOCAL.reach,
            y: B_LOCAL.y + Math.sin(TO_ANGLE) * CONFIG_LOCAL.reach,
            z: 0.2
          };
          const EXTENT = CONFIG_LOCAL.reach + CONFIG_LOCAL.width + CONFIG.unit.maxRadius;
          for (const UNIT_LOCAL of this._collectBossTargets(
            B_LOCAL.x - EXTENT,
            B_LOCAL.y - EXTENT,
            B_LOCAL.x + EXTENT,
            B_LOCAL.y + EXTENT,
            this._bossHitCandidates,
            true
          )) {
            if (action.hitIds.has(UNIT_LOCAL.id)) {
              continue;
            }
            const HIT = ARENA_GEOMETRY.sweep(FROM, TO, CONFIG_LOCAL.width, 1.4, UNIT_LOCAL);
            if (HIT) {
              const DX = UNIT_LOCAL.x - B_LOCAL.x, DY = UNIT_LOCAL.y - B_LOCAL.y, N = Math.hypot(DX, DY) || 1;
              this.hitBossPatternUnit(UNIT_LOCAL, action.id, HIT, {
                x: DX / N,
                y: DY / N
              });
            }
          }
        }
        sweepBossWeapon(action, q0, q1) {
          const CONFIG_LOCAL = BOSS_PATTERN_CONFIG[action.id], START_ANGLE = action.startAngle ?? action.aim - Math.PI / 2, FROM_ANGLE = START_ANGLE + Math.PI * 2 * CLAMP2(q0, 0, 1), TO_ANGLE = START_ANGLE + Math.PI * 2 * CLAMP2(q1, 0, 1), B_LOCAL = this.boss, FROM = {
            x: B_LOCAL.x + Math.cos(FROM_ANGLE) * CONFIG_LOCAL.reach,
            y: B_LOCAL.y + Math.sin(FROM_ANGLE) * CONFIG_LOCAL.reach,
            z: 0.2
          }, TO = {
            x: B_LOCAL.x + Math.cos(TO_ANGLE) * CONFIG_LOCAL.reach,
            y: B_LOCAL.y + Math.sin(TO_ANGLE) * CONFIG_LOCAL.reach,
            z: 0.2
          }, EXTENT = CONFIG_LOCAL.reach + CONFIG_LOCAL.width + CONFIG.unit.maxRadius;
          for (const UNIT_LOCAL of this._collectBossTargets(
            B_LOCAL.x - EXTENT,
            B_LOCAL.y - EXTENT,
            B_LOCAL.x + EXTENT,
            B_LOCAL.y + EXTENT,
            this._bossHitCandidates,
            true
          )) {
            if (action.hitIds.has(UNIT_LOCAL.id)) {
              continue;
            }
            const HIT = ARENA_GEOMETRY.sweep(FROM, TO, CONFIG_LOCAL.width, 1.4, UNIT_LOCAL);
            if (!HIT) {
              continue;
            }
            const DX = UNIT_LOCAL.x - B_LOCAL.x, DY = UNIT_LOCAL.y - B_LOCAL.y, N = Math.hypot(DX, DY) || 1;
            this.hitBossPatternUnit(UNIT_LOCAL, action.id, HIT, {
              x: DX / N,
              y: DY / N
            });
          }
        }
        bossMouthPoint(released) {
          return bossMouthWorldPoint(this.boss, released);
        }
        bossSummonLanding(angle, action = null) {
          const B_LOCAL = this.boss, SCENE = this.scene, RADIUS = (0, import_definition51.unitBodyRadius)({ species: B_LOCAL.species, tier: 1, growthElapsed: 1, growthDuration: 1 });
          for (let i = 0; i < 16; i++) {
            const OFFSET = i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 8, A_LOCAL = angle + OFFSET, CANDIDATE = {
              x: B_LOCAL.x + Math.cos(A_LOCAL) * BOSS_PATTERN_CONFIG["summon.mouth-t1"].landingRadius,
              y: B_LOCAL.y + Math.sin(A_LOCAL) * BOSS_PATTERN_CONFIG["summon.mouth-t1"].landingRadius
            };
            if (!ARENA_GEOMETRY.inside(CANDIDATE, SCENE, RADIUS)) {
              continue;
            }
            const BLOCKED = this.units.some(
              (unit) => unit.hp > 0 && Math.hypot(unit.x - CANDIDATE.x, unit.y - CANDIDATE.y) < RADIUS + unit.radius + 0.08
            ) || (action?.landingPoints || []).some(
              (point2) => Math.hypot(point2.x - CANDIDATE.x, point2.y - CANDIDATE.y) < RADIUS * 2 + 0.08
            );
            if (!BLOCKED) {
              return CANDIDATE;
            }
          }
          return null;
        }
        spawnBossMouthUnit(action) {
          return this.mutateUnits(this._spawnBossMouthUnit, action);
        }
        _spawnBossMouthUnit(action) {
          if (action.released >= action.volleyCount) {
            return false;
          }
          const B_LOCAL = this.boss, LANDING = this.bossSummonLanding(action.aim, action);
          if (!LANDING) {
            return false;
          }
          const MOUTH = this.bossMouthPoint(action.released + 1);
          const ID = CONFIG.boss.summonIdBase + ++this.bossSummonSerial, UNIT_LOCAL = new UNIT(ID, B_LOCAL.species, 1, MOUTH.x, MOUTH.y), ANGLE = Math.atan2(LANDING.y - MOUTH.y, LANDING.x - MOUTH.x), FLIGHT_SECONDS = Math.sqrt(2 * MOUTH.z / CONFIG.physics.gravity), HORIZONTAL_DISTANCE = Math.hypot(LANDING.x - MOUTH.x, LANDING.y - MOUTH.y), DRAG = 0.8, SPEED = HORIZONTAL_DISTANCE * DRAG / (1 - Math.exp(-DRAG * FLIGHT_SECONDS));
          Object.assign(UNIT_LOCAL, {
            ownerId: "boss",
            farmId: 0,
            faction: FACTION_CONFIG.ENEMY,
            home: {
              x: MOUTH.x,
              y: MOUTH.y
            },
            hp: STATS(1, B_LOCAL.species).maxHp,
            down: 0,
            isBattleOnlySummon: true,
            battleSummonKind: "boss-mouth-t1",
            battleSummonParentId: 0,
            battleSummonParentGeneration: 0,
            battleSummonEncounterId: B_LOCAL.encounterId || 1,
            countsTowardPermanentRoster: false,
            eligibleForRaidDeployment: false,
            breedingEligible: false,
            mergeEligible: false,
            canSplit: false,
            usesPersistentSleep: false,
            lifetime: "until-death-or-battle-end",
            growthElapsed: UNIT_LOCAL.growthDuration,
            growth: CONFIG.farm.breeding.matureMeals,
            meals: 1,
            deathSplitHandled: false,
            splitUsedThisBattle: true,
            dropLanded: false,
            z: MOUTH.z,
            vx: Math.cos(ANGLE) * SPEED,
            vy: Math.sin(ANGLE) * SPEED,
            vz: 0,
            landingRecovery: 0,
            seed: ID * 2.39996
          });
          this.addUnit(UNIT_LOCAL, { markProgress: false });
          action.released++;
          action.landingPoints ||= [];
          action.landingPoints.push(LANDING);
          this.boss.summonMouth = MOUTH;
          this.combat("boss-mouth-spit", {
            patternId: action.id,
            unit: ID,
            species: B_LOCAL.species,
            x: MOUTH.x,
            y: MOUTH.y,
            z: MOUTH.z,
            landingX: LANDING.x,
            landingY: LANDING.y,
            sequence: action.released
          });
          return true;
        }
        activateBossPattern(action) {
          const B_LOCAL = this.boss, RUNTIME = B_LOCAL.patternRuntime, CONFIG_LOCAL = BOSS_PATTERN_CONFIG[action.id];
          action.phase = "active";
          action.phaseElapsed = 0;
          B_LOCAL.attackId = ++this.attackSerial;
          action.hitIds.clear();
          RUNTIME.cooldowns[action.id] = CONFIG_LOCAL.cooldown;
          this.combat("boss-pattern-launch", {
            patternId: action.id,
            attackKind: action.id,
            attackId: B_LOCAL.attackId,
            x: B_LOCAL.x,
            y: B_LOCAL.y,
            z: B_LOCAL.z,
            angle: action.aim,
            targetId: action.targetId || 0
          });
          BOSS_BEHAVIORS.forId(action.id).activate(this, action);
        }
        enterBossPatternRecovery(action) {
          action.phase = "recover";
          action.phaseElapsed = 0;
        }
        updateBossPattern(dt, living) {
          const B_LOCAL = this.boss, RUNTIME = B_LOCAL.patternRuntime;
          RUNTIME.encounterElapsed += dt;
          for (const ID of BOSS_PATTERN_IDS) {
            RUNTIME.cooldowns[ID] = Math.max(0, (RUNTIME.cooldowns[ID] || 0) - dt);
          }
          let action = RUNTIME.active;
          if (!action) {
            const TARGETS = this.bossPatternTargets(living), TARGET = TARGETS.nearest || this.nearestBossTarget(living), ELIGIBLE = this.eligibleBossPatterns(living, TARGETS), SELECTED = chooseBossPattern(RUNTIME, ELIGIBLE, () => this.random());
            if (SELECTED) {
              const BEHAVIOR = BOSS_BEHAVIORS.forId(SELECTED), PICK = BEHAVIOR.selectedTarget(this, TARGETS, TARGET);
              this.beginBossPattern(SELECTED, PICK);
              action = RUNTIME.active;
              BEHAVIOR.selected(this);
            } else {
              if (TARGET) {
                const DX = TARGET.x - B_LOCAL.x, DY = TARGET.y - B_LOCAL.y, D_LOCAL = Math.hypot(DX, DY) || 1;
                B_LOCAL.angle = B_LOCAL.facing = Math.atan2(DY, DX);
                const CONTACT = B_LOCAL.radius + TARGET.radius + 0.2;
                if (D_LOCAL > CONTACT) {
                  const SPEED = Math.min(B_LOCAL.moveSpeed, (D_LOCAL - CONTACT) / dt);
                  B_LOCAL.chaseVx = DX / D_LOCAL * SPEED;
                  B_LOCAL.chaseVy = DY / D_LOCAL * SPEED;
                }
              }
              return;
            }
          }
          if (!action) {
            return;
          }
          if (action.phase === "active" && BOSS_BEHAVIORS.forId(action.id).physicalActive) {
            return;
          }
          action.phaseElapsed += dt;
          BOSS_BEHAVIORS.update(this, action, dt, living);
        }
        integrateBossKnockback(dt) {
          const BOSS2 = this.boss;
          if (Math.hypot(BOSS2.knockVx, BOSS2.knockVy) < 1e-6) {
            return;
          }
          BOSS2.x += BOSS2.knockVx * dt;
          BOSS2.y += BOSS2.knockVy * dt;
          const RX = CONFIG.raid.arena.radiusX - BOSS2.radius, RY = CONFIG.raid.arena.radiusY - BOSS2.radius, EDGE = Math.hypot(BOSS2.x / RX, BOSS2.y / RY);
          if (EDGE > 1) {
            BOSS2.x /= EDGE;
            BOSS2.y /= EDGE;
          }
          BOSS2.knockVx *= Math.exp(-dt * 6);
          BOSS2.knockVy *= Math.exp(-dt * 6);
        }
        integrateBossMotion(dt) {
          const BOSS2 = this.boss;
          if (!BOSS2.active) {
            return;
          }
          this.integrateBossKnockback(dt);
          if (BOSS2.stun > 0) {
            return;
          }
          const ACTION = BOSS2.patternRuntime.active;
          if (ACTION?.phase === "active" && BOSS_BEHAVIORS.forId(ACTION.id).physicalActive) {
            const DELAY = Math.min(dt, ACTION.motionDelay || 0);
            ACTION.motionDelay = Math.max(0, (ACTION.motionDelay || 0) - DELAY);
            const ACTIVE_DT = dt - DELAY;
            if (ACTIVE_DT > 0) {
              ACTION.phaseElapsed += ACTIVE_DT;
              BOSS_BEHAVIORS.forId(ACTION.id).updateActive(this, ACTION, ACTIVE_DT);
            }
          } else if (!ACTION) {
            const X = BOSS2.x, Y = BOSS2.y;
            BOSS2.x += (BOSS2.chaseVx || 0) * dt;
            BOSS2.y += (BOSS2.chaseVy || 0) * dt;
            this.boundBody(BOSS2, this.scene, BOSS2.radius + 0.25);
            BOSS2.travel += Math.hypot(BOSS2.x - X, BOSS2.y - Y);
          }
        }
        updateBoss(dt) {
          const B_LOCAL = this.boss;
          B_LOCAL.chaseVx = B_LOCAL.chaseVy = 0;
          if (SIMULATION_SCENES[this.scene].updateBossPhase(this, dt)) {
            return;
          }
          if (!B_LOCAL.active) {
            return;
          }
          if (B_LOCAL.hp <= 0) {
            if (this.running) {
              this.finish("victory");
            } else {
              B_LOCAL.active = false;
              B_LOCAL.patternRuntime.active = null;
            }
            return;
          }
          if (this.running && this.raidRosters.length && this.raidRosters.every((r) => r.troops.every((t) => t.deployed)) && !this.units.some((u) => hasFaction(u, FACTION_CONFIG.PLAYER) && u.hp > 0)) {
            this.finish("defeat");
            return;
          }
          if (B_LOCAL.stun > 0) {
            B_LOCAL.stun = Math.max(0, B_LOCAL.stun - dt);
            return;
          }
          const LIVING = this.livingBossTargets();
          if (!LIVING.length) {
            return;
          }
          this.updateBossPattern(dt, LIVING);
        }
      };
    }
  });

  // src/farm-progress.js
  function keys(value, required, optional = []) {
    ASSERT(value && typeof value === "object" && !Array.isArray(value));
    ASSERT(required.every((key) => Object.hasOwn(value, key)));
    ASSERT(Object.keys(value).every((key) => required.includes(key) || optional.includes(key)));
  }
  function copyPlayer(player) {
    return {
      schemaVersion: player.schemaVersion,
      formationSkills: structuredClone(player.formationSkills),
      raidDeploymentCards: structuredClone(player.raidDeploymentCards),
      level: player.level,
      experience: player.experience,
      farmBossEventStage: player.farmBossEventStage,
      availablePoints: player.availablePoints,
      farmUpgrades: {
        ...player.farmUpgrades
      },
      farmPlots: structuredClone(player.farmPlots),
      abilities: Object.fromEntries(
        Object.entries(player.abilities).map(([id, build]) => [
          id,
          {
            ...build,
            ...build.branchLevels ? { branchLevels: { ...build.branchLevels } } : {}
          }
        ])
      ),
      processedBossKillReceipts: [...player.processedBossKillReceipts]
    };
  }
  function pendingReward(reward) {
    const RESULT = {};
    for (const [KEY2, VALUE] of Object.entries(reward)) {
      if (KEY2 === "boxes" || KEY2 === "revealedCount") {
        continue;
      }
      RESULT[KEY2] = structuredClone(VALUE);
    }
    return RESULT;
  }
  function cohortValues(unit) {
    return [
      unit.plotId || RESERVE_PLOT_ID,
      unit.species,
      unit.tier,
      unit.meals >= 1,
      Math.max(0, unit.growthDuration - unit.growthElapsed),
      unit.growthDuration,
      unit.cooldown,
      unit.cooldownDuration,
      unit.hp <= 0 ? unit.down : 0
    ];
  }
  function captureFarmProgress(world) {
    ASSERT(world.scene === "farm");
    const GROUPS = /* @__PURE__ */ new Map(), RECENTLY_SETTLED = new Set(
      (world.bossRewardReceipts || []).filter((reward) => reward.status === "ready").slice(-8)
    );
    for (const UNIT3 of world.roster.residents()) {
      if (UNIT3.isBattleOnlySummon || UNIT3.countsTowardPermanentRoster === false || UNIT3.faction !== "player") {
        continue;
      }
      const [PLOT_ID, SPECIES, TIER, FED, GROWTH, DURATION3, COOLDOWN, COOLDOWN_DURATION, REST] = cohortValues(UNIT3);
      const KEY2 = [
        PLOT_ID,
        SPECIES,
        TIER,
        Number(FED),
        GROWTH,
        GROWTH ? DURATION3 : 0,
        COOLDOWN,
        COOLDOWN ? COOLDOWN_DURATION : 0,
        REST
      ].join(":");
      const PREVIOUS = GROUPS.get(KEY2);
      if (PREVIOUS) {
        PREVIOUS.residentIds.push(UNIT3.id);
        continue;
      }
      const ROW = {
        plotId: PLOT_ID,
        species: SPECIES,
        tier: TIER,
        residentIds: [UNIT3.id]
      };
      if (FED) {
        ROW.fed = true;
      }
      if (GROWTH > 0) {
        ROW.growth = {
          remaining: GROWTH,
          duration: DURATION3
        };
      }
      if (COOLDOWN > 0) {
        ROW.cooldown = {
          remaining: COOLDOWN,
          duration: COOLDOWN_DURATION
        };
      }
      if (REST > 0) {
        ROW.rest = REST;
      }
      GROUPS.set(KEY2, ROW);
    }
    const ROSTER2 = [...GROUPS.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row), STAGE = world.farmBossProgress;
    return {
      seed: world.seed,
      rngState: world.rng.state,
      nextId: world.nextId,
      player: copyPlayer(world.playerProgression),
      roster: ROSTER2,
      food: {
        warehouse: world.warehouseFood,
        autoClock: world.foodTaps.autoClock,
        remainder: world.foodTaps.remainder,
        produced: world.foodTaps.produced,
        plots: [...world.farmPlots.values()].map((plot) => ({ id: plot.id, count: plot.food.length }))
      },
      totals: {
        births: world.metrics.births,
        merges: world.metrics.merges
      },
      bossStages: {
        currentStage: STAGE.currentStage,
        highestClearedRaidStage: STAGE.highestClearedRaidStage,
        encounterSeed: STAGE.encounterSeed,
        encounterEpoch: STAGE.encounterEpoch,
        nextSelectionId: STAGE.nextSelectionId,
        selections: STAGE.selections.map(({ stage, species, selectionId }) => ({
          stage,
          species,
          selectionId
        }))
      },
      ledger: {
        boss: {
          nextEncounterId: world.nextBossEncounterId,
          settledThrough: {
            ...world.bossRewardWatermarks
          },
          pendingRewards: world.bossRewardReceipts.filter(
            (reward) => reward.status === "calculating" || Number.isSafeInteger(reward.queuedCount) && reward.queuedCount > 0 || RECENTLY_SETTLED.has(reward)
          ).map(pendingReward),
          rewardStreams: structuredClone(world.bossRewardStreams),
          queuedRewards: world.bossRewardInventory.filter((entry) => entry.count > 0).map(({ species, tier, count }) => ({ species, tier, count }))
        },
        raid: {
          nextRunSequence: world.nextRaidRunSequence,
          activeRun: world.activeRaidRunSequence === null ? null : {
            sequence: world.activeRaidRunSequence,
            sessionId: world.activeRaidSessionId
          },
          settledThrough: world.raidSettlementWatermark
        }
      }
    };
  }
  function validateFarmProgress(data) {
    keys(data, ["seed", "rngState", "nextId", "player", "roster", "food", "totals", "bossStages", "ledger"], ["mode"]);
    ASSERT(
      INTEGER(data.seed, 0, 4294967295) && INTEGER(data.rngState, 0, 4294967295) && INTEGER(data.nextId, 1, CONFIG.farm.maxUnitId + 1) && (data.mode === void 0 || ["breed", "merge"].includes(data.mode))
    );
    const PLAYER = data.player, DEFAULTS = createPlayerProgressionState();
    keys(PLAYER, Object.keys(DEFAULTS));
    keys(PLAYER.farmUpgrades, Object.keys(DEFAULTS.farmUpgrades));
    keys(PLAYER.abilities, Object.keys(DEFAULTS.abilities));
    for (const [ABILITY_ID8, BUILD] of Object.entries(PLAYER.abilities)) {
      const BRANCH_KEYS = Object.keys(DEFAULTS.abilities[ABILITY_ID8].branchLevels || {});
      keys(BUILD, ["powerLevel"], BRANCH_KEYS.length ? ["branchLevels"] : []);
      if (Object.hasOwn(BUILD, "branchLevels")) {
        keys(BUILD.branchLevels, BRANCH_KEYS);
      }
    }
    ASSERT(
      isValidPlayerProgressionState(PLAYER) && INTEGER(PLAYER.level, 1) && NUMBER3(PLAYER.experience) && Array.isArray(PLAYER.processedBossKillReceipts) && PLAYER.processedBossKillReceipts.length <= 1e5 && PLAYER.processedBossKillReceipts.every(STRING)
    );
    ASSERT(Array.isArray(data.roster));
    const COHORTS = /* @__PURE__ */ new Set(), RESIDENT_IDS = /* @__PURE__ */ new Set(), PLOT_CAPACITY = new Map(
      PLAYER.farmPlots.plots.map((plot) => [plot.id, FARM_CAPACITY_STEPS[plot.capacityLevel]])
    ), PLACED_COUNTS = /* @__PURE__ */ new Map();
    let maxResidentId = 0;
    for (const ROW of data.roster) {
      keys(ROW, ["plotId", "species", "tier", "residentIds"], ["fed", "growth", "cooldown", "rest"]);
      ASSERT(
        (ROW.plotId === RESERVE_PLOT_ID || PLOT_CAPACITY.has(ROW.plotId)) && INTEGER(ROW.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER(ROW.tier, 1, CONFIG.unit.maxTier) && Array.isArray(ROW.residentIds) && ROW.residentIds.length > 0
      );
      for (const ID of ROW.residentIds) {
        ASSERT(INTEGER(ID, 1, data.nextId - 1) && !RESIDENT_IDS.has(ID));
        RESIDENT_IDS.add(ID);
        maxResidentId = Math.max(maxResidentId, ID);
      }
      if (ROW.plotId !== RESERVE_PLOT_ID) {
        PLACED_COUNTS.set(ROW.plotId, (PLACED_COUNTS.get(ROW.plotId) || 0) + ROW.residentIds.length);
      }
      if (Object.hasOwn(ROW, "fed")) {
        ASSERT(ROW.fed === true);
      }
      for (const KEY2 of ["growth", "cooldown"]) {
        if (Object.hasOwn(ROW, KEY2)) {
          keys(ROW[KEY2], ["remaining", "duration"]);
          ASSERT(
            NUMBER3(ROW[KEY2].remaining, Number.MIN_VALUE, 1e5) && NUMBER3(ROW[KEY2].duration, ROW[KEY2].remaining, 1e5)
          );
        }
      }
      if (Object.hasOwn(ROW, "rest")) {
        ASSERT(NUMBER3(ROW.rest, Number.MIN_VALUE, CONFIG.unit.corpseRecoverySeconds));
      }
      const SIGNATURE = [
        ROW.plotId,
        ROW.species,
        ROW.tier,
        Number(!!ROW.fed),
        ROW.growth?.remaining || 0,
        ROW.growth?.duration || 0,
        ROW.cooldown?.remaining || 0,
        ROW.cooldown?.duration || 0,
        ROW.rest || 0
      ].join(":");
      ASSERT(!COHORTS.has(SIGNATURE));
      COHORTS.add(SIGNATURE);
    }
    ASSERT([...PLACED_COUNTS].every(([plotId, count]) => count <= PLOT_CAPACITY.get(plotId)));
    ASSERT(data.nextId > maxResidentId);
    keys(data.food, ["warehouse", "autoClock", "remainder", "produced", "plots"]);
    ASSERT(
      SAFE_INTEGER(data.food.warehouse) && NUMBER3(data.food.autoClock, 0, 0.51) && data.food.autoClock < 0.51 && INTEGER(data.food.remainder, 0, 4) && INTEGER(data.food.produced) && Array.isArray(data.food.plots) && data.food.plots.length === PLAYER.farmPlots.plots.length
    );
    for (let index = 0; index < data.food.plots.length; index++) {
      const FOOD = data.food.plots[index];
      keys(FOOD, ["id", "count"]);
      ASSERT(FOOD.id === PLAYER.farmPlots.plots[index].id && INTEGER(FOOD.count, 0, 140));
    }
    keys(data.totals, ["births", "merges"]);
    ASSERT(INTEGER(data.totals.births) && INTEGER(data.totals.merges));
    const STAGE = data.bossStages;
    keys(STAGE, [
      "currentStage",
      "highestClearedRaidStage",
      "encounterSeed",
      "encounterEpoch",
      "nextSelectionId",
      "selections"
    ]);
    ASSERT(
      INTEGER(STAGE.currentStage, 1, BOSS_REWARD_SETTINGS.maxStage) && INTEGER(STAGE.highestClearedRaidStage, 0, BOSS_REWARD_SETTINGS.maxStage) && INTEGER(STAGE.encounterSeed, 0, 4294967295) && INTEGER(STAGE.encounterEpoch) && INTEGER(STAGE.nextSelectionId, 1) && Array.isArray(STAGE.selections) && STAGE.selections.length <= BOSS_REWARD_SETTINGS.maxStage
    );
    const STAGES2 = /* @__PURE__ */ new Set(), SELECTIONS = /* @__PURE__ */ new Set();
    for (const ENTRY of STAGE.selections) {
      keys(ENTRY, ["stage", "species", "selectionId"]);
      ASSERT(
        INTEGER(ENTRY.stage, 1, BOSS_REWARD_SETTINGS.maxStage) && INTEGER(ENTRY.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER(ENTRY.selectionId, 1, STAGE.nextSelectionId - 1) && !STAGES2.has(ENTRY.stage) && !SELECTIONS.has(ENTRY.selectionId)
      );
      STAGES2.add(ENTRY.stage);
      SELECTIONS.add(ENTRY.selectionId);
    }
    const LEDGER = data.ledger;
    keys(LEDGER, ["boss", "raid"]);
    const BOSS2 = LEDGER.boss, RAID = LEDGER.raid;
    keys(BOSS2, ["nextEncounterId", "settledThrough", "pendingRewards", "rewardStreams", "queuedRewards"]);
    keys(BOSS2.settledThrough, ["farm", "raid"]);
    keys(RAID, ["nextRunSequence", "activeRun", "settledThrough"]);
    ASSERT(
      INTEGER(BOSS2.settledThrough.farm) && INTEGER(BOSS2.settledThrough.raid) && INTEGER(BOSS2.nextEncounterId, BOSS2.settledThrough.farm + 1) && INTEGER(RAID.nextRunSequence) && INTEGER(RAID.settledThrough, BOSS2.settledThrough.raid, RAID.nextRunSequence)
    );
    if (RAID.activeRun === null) {
      ASSERT(RAID.nextRunSequence === RAID.settledThrough);
    } else {
      keys(RAID.activeRun, ["sequence", "sessionId"]);
      ASSERT(
        INTEGER(RAID.activeRun.sequence, 1) && RAID.activeRun.sequence === RAID.nextRunSequence && RAID.activeRun.sequence === RAID.settledThrough + 1 && STRING(RAID.activeRun.sessionId) && RAID.activeRun.sessionId.length <= 128
      );
    }
    const STREAMS = BOSS2.rewardStreams;
    keys(STREAMS, ["normal", "event", "firstClear"]);
    for (const STREAM of Object.values(STREAMS)) {
      keys(STREAM, ["rngState", "distributionState", "payoutRngState"]);
      ASSERT(
        INTEGER(STREAM.rngState, 0, 4294967295) && INTEGER(STREAM.payoutRngState, 0, 4294967295) && (STREAM.distributionState === null || (() => {
          keys(STREAM.distributionState, [
            "version",
            "probability",
            "consecutiveFailures",
            "pendingTrials"
          ]);
          return STREAM.distributionState.version === 1 && NUMBER3(STREAM.distributionState.probability, 0, 1) && SAFE_INTEGER(STREAM.distributionState.consecutiveFailures) && SAFE_INTEGER(STREAM.distributionState.pendingTrials);
        })())
      );
    }
    ASSERT(
      Array.isArray(BOSS2.queuedRewards) && BOSS2.queuedRewards.length <= CONFIG.unit.speciesCount && Array.isArray(BOSS2.pendingRewards) && BOSS2.pendingRewards.length <= 1e5
    );
    const INVENTORY = /* @__PURE__ */ new Map();
    for (const GROUP of BOSS2.queuedRewards) {
      keys(GROUP, ["species", "tier", "count"]);
      const GROUP_KEY = `${GROUP.species}:${GROUP.tier}`;
      ASSERT(
        INTEGER(GROUP.species, 0, CONFIG.unit.speciesCount - 1) && GROUP.tier === 1 && SAFE_INTEGER(GROUP.count, 1) && !INVENTORY.has(GROUP_KEY)
      );
      INVENTORY.set(GROUP_KEY, GROUP.count);
    }
    const RECEIPTS = /* @__PURE__ */ new Set(), ENCOUNTERS = /* @__PURE__ */ new Set(), QUEUED_BY_GROUP = /* @__PURE__ */ new Map(), DISTRIBUTION_KEYS = ["version", "probability", "consecutiveFailures", "pendingTrials"], VALID_DISTRIBUTION = (state) => {
      keys(state, DISTRIBUTION_KEYS);
      return state.version === 1 && NUMBER3(state.probability, 0, 1) && SAFE_INTEGER(state.consecutiveFailures) && SAFE_INTEGER(state.pendingTrials);
    }, VALID_JOB = (state, boxCount) => {
      keys(state, [
        "version",
        "totalTrials",
        "processedTrials",
        "remainingTrials",
        "successes",
        "distributionState",
        "rngState"
      ]);
      return state.version === 1 && state.totalTrials === boxCount && INTEGER(state.processedTrials, 0, boxCount) && INTEGER(state.remainingTrials, 0, boxCount) && state.processedTrials + state.remainingTrials === boxCount && INTEGER(state.successes, 0, state.processedTrials) && INTEGER(state.rngState, 0, 4294967295) && VALID_DISTRIBUTION(state.distributionState);
    };
    for (const REWARD2 of BOSS2.pendingRewards) {
      const BASE_KEYS = ["encounterId", "source", "receiptKey", "species", "tier", "chance", "firstClear"];
      keys(REWARD2, BASE_KEYS, [...REWARD_EXTRAS, "rolls"]);
      ASSERT(
        ["farm", "raid"].includes(REWARD2.source) && INTEGER(REWARD2.encounterId, 1, BOSS2.settledThrough[REWARD2.source]) && STRING(REWARD2.receiptKey) && !RECEIPTS.has(REWARD2.receiptKey) && INTEGER(REWARD2.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER(REWARD2.tier, 1, CONFIG.unit.maxTier) && NUMBER3(REWARD2.chance, 0, 1) && typeof REWARD2.firstClear === "boolean" && (REWARD2.source === "raid" || !REWARD2.firstClear)
      );
      RECEIPTS.add(REWARD2.receiptKey);
      const ENCOUNTER = `${REWARD2.source}:${REWARD2.encounterId}`;
      ASSERT(!ENCOUNTERS.has(ENCOUNTER));
      ENCOUNTERS.add(ENCOUNTER);
      if (["calculating", "ready"].includes(REWARD2.status)) {
        ASSERT(
          REWARD2.tier === 1 && SAFE_INTEGER(REWARD2.acquiredCount) && SAFE_INTEGER(REWARD2.placedCount) && SAFE_INTEGER(REWARD2.queuedCount) && REWARD2.placedCount + REWARD2.queuedCount === REWARD2.acquiredCount && REWARD2.grantedCount === REWARD2.placedCount
        );
        if (REWARD2.queuedCount > 0) {
          const GROUP_KEY = `${REWARD2.species}:${REWARD2.tier}`, QUEUED = (QUEUED_BY_GROUP.get(GROUP_KEY) || 0) + REWARD2.queuedCount;
          ASSERT(Number.isSafeInteger(QUEUED));
          QUEUED_BY_GROUP.set(GROUP_KEY, QUEUED);
        }
        ASSERT(
          REWARD2.baselineChance === (REWARD2.firstClear ? BOSS_REWARD_SETTINGS.firstClearAcquisitionChance : BOSS_REWARD_SETTINGS.acquisitionChance) && REWARD2.chance === Math.min(1, REWARD2.baselineChance * (REWARD2.acquisitionMultiplier ?? 1)) && SAFE_INTEGER(REWARD2.rollBudget, 1, BOSS_REWARD_SETTINGS.maxRollCount) && INTEGER(REWARD2.boxCount, 1, BOSS_REWARD_SETTINGS.maxBoxCount) && REWARD2.boxCount === Math.min(REWARD2.rollBudget, BOSS_REWARD_SETTINGS.maxBoxCount) && REWARD2.rollCount === REWARD2.boxCount && INTEGER(REWARD2.successCount, 0, REWARD2.boxCount)
        );
        if (REWARD2.status === "calculating") {
          const CALC = REWARD2.calculation;
          keys(CALC, ["version", "payouts", "hits", "payoutRngStateAfter", "jobState"]);
          ASSERT(
            CALC.version === 1 && Array.isArray(CALC.payouts) && CALC.payouts.length === REWARD2.boxCount && Array.isArray(CALC.hits) && CALC.hits.length <= REWARD2.boxCount && CALC.hits.every(
              (index, i) => INTEGER(index, 0, REWARD2.boxCount - 1) && (i === 0 || CALC.hits[i - 1] < index)
            ) && INTEGER(CALC.payoutRngStateAfter, 0, 4294967295) && (CALC.jobState === null || VALID_JOB(CALC.jobState, REWARD2.boxCount)) && REWARD2.successCount === 0 && REWARD2.acquiredCount === 0 && REWARD2.queuedCount === 0
          );
          const BASE = Math.floor(REWARD2.rollBudget / REWARD2.boxCount), EXTRA = REWARD2.rollBudget % REWARD2.boxCount;
          ASSERT(
            CALC.payouts.every((payout) => INTEGER(payout, BASE, BASE + (EXTRA > 0 ? 1 : 0))) && CALC.payouts.reduce((sum, payout) => sum + payout, 0) === REWARD2.rollBudget && CALC.payouts.filter((payout) => payout === BASE + 1).length === EXTRA
          );
          if (CALC.jobState) {
            ASSERT(
              CALC.hits.every((index) => index < CALC.jobState.processedTrials) && CALC.jobState.successes === CALC.hits.length
            );
          }
        } else {
          ASSERT(
            REWARD2.calculation === null && SAFE_INTEGER(REWARD2.acquiredCount, 0, REWARD2.rollBudget) && REWARD2.successCount <= REWARD2.acquiredCount && REWARD2.successCount === 0 === (REWARD2.acquiredCount === 0)
          );
        }
      } else {
        FAIL();
      }
      if (REWARD2.acquisitionMultiplier !== void 0) {
        ASSERT(NUMBER3(REWARD2.acquisitionMultiplier, 0, 2));
      }
      if (REWARD2.xpReceiptKey !== void 0) {
        ASSERT(STRING(REWARD2.xpReceiptKey));
      }
      if (REWARD2.xpStatus !== void 0) {
        ASSERT(["awarded", "already-awarded", "unsettled"].includes(REWARD2.xpStatus));
      }
      for (const KEY2 of ["xpAmount", "levelsGained", "pointsAwarded"]) {
        if (REWARD2[KEY2] !== void 0) {
          ASSERT(NUMBER3(REWARD2[KEY2]));
        }
      }
    }
    ASSERT(
      INVENTORY.size === QUEUED_BY_GROUP.size && [...INVENTORY].every(([key, quantity]) => QUEUED_BY_GROUP.get(key) === quantity)
    );
    return true;
  }
  function sameFarmProgress(a, b) {
    if (a === b) {
      return true;
    }
    if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) {
      return false;
    }
    const KEYS_A = Object.keys(a), KEYS_B = Object.keys(b);
    return KEYS_A.length === KEYS_B.length && KEYS_A.every((key) => Object.hasOwn(b, key) && sameFarmProgress(a[key], b[key]));
  }
  function position(index, count, seed, scale) {
    const ANGLE = index * 2.399963229728653 + seed % 6283 / 1e3, RADIUS = Math.sqrt((index + 0.5) / Math.max(1, count)) * scale;
    return {
      x: Math.cos(ANGLE) * CONFIG.farm.arena.radiusX * RADIUS,
      y: Math.sin(ANGLE) * CONFIG.farm.arena.radiusY * RADIUS
    };
  }
  function restoreFarmProgress(data) {
    validateFarmProgress(data);
    const WORLD = new GARDEN(data.seed);
    WORLD.resetUnits();
    WORLD.food = [];
    WORLD.nextId = 1;
    WORLD.playerProgression = copyPlayer(data.player);
    WORLD.activePlotId = WORLD.playerProgression.farmPlots.currentPlotId;
    WORLD.farmPlots = new Map(WORLD.playerProgression.farmPlots.plots.map((plot) => [plot.id, new FarmPlot(plot)]));
    WORLD.warehouseFood = data.food.warehouse;
    WORLD.farmBossProgress = structuredClone(data.bossStages);
    Object.assign(WORLD.metrics, data.totals);
    const PLOT_COUNTS = /* @__PURE__ */ new Map();
    for (const ROW of data.roster) {
      if (ROW.plotId !== RESERVE_PLOT_ID) {
        PLOT_COUNTS.set(ROW.plotId, (PLOT_COUNTS.get(ROW.plotId) || 0) + ROW.residentIds.length);
      }
    }
    const PLOT_OFFSETS = /* @__PURE__ */ new Map();
    for (const ROW of data.roster) {
      const PLOT_INDEX = ROW.plotId === RESERVE_PLOT_ID ? 0 : WORLD.playerProgression.farmPlots.plots.findIndex((plot) => plot.id === ROW.plotId), PLOT_SEED = data.seed + PLOT_INDEX * 7919, PLOT_OFFSET = PLOT_OFFSETS.get(ROW.plotId) || 0;
      for (let index = 0; index < ROW.residentIds.length; index++) {
        const ID = ROW.residentIds[index];
        const COUNT = PLOT_COUNTS.get(ROW.plotId) || ROW.residentIds.length, POINT2 = position(PLOT_OFFSET + index, COUNT, PLOT_SEED, 0.7), UNIT3 = new UNIT(ID, ROW.species, ROW.tier, POINT2.x, POINT2.y);
        UNIT3.plotId = ROW.plotId;
        UNIT3.meals = ROW.fed ? 1 : 0;
        UNIT3.growthDuration = ROW.growth?.duration || WORLD.breedGrowthDuration();
        UNIT3.growthElapsed = ROW.growth ? ROW.growth.duration - ROW.growth.remaining : UNIT3.growthDuration;
        UNIT3.growth = Math.floor(
          CONFIG.farm.breeding.matureMeals * UNIT3.growthElapsed / UNIT3.growthDuration + 1e-9
        );
        UNIT3.cooldown = ROW.cooldown?.remaining || 0;
        UNIT3.cooldownDuration = ROW.cooldown?.duration || 0;
        if (ROW.rest) {
          UNIT3.hp = 0;
          UNIT3.down = ROW.rest;
          UNIT3.deathSplitHandled = true;
        }
        WORLD.addUnit(UNIT3, { markProgress: false });
      }
      PLOT_OFFSETS.set(ROW.plotId, PLOT_OFFSET + ROW.residentIds.length);
    }
    for (let plotIndex = 0; plotIndex < data.food.plots.length; plotIndex++) {
      const SAVED_FOOD = data.food.plots[plotIndex], PLOT = WORLD.farmPlots.get(SAVED_FOOD.id);
      for (let i = 0; i < SAVED_FOOD.count; i++) {
        const POINT2 = position(i, SAVED_FOOD.count, data.seed + 103 + plotIndex * 7919, 0.8);
        PLOT.food.push({
          ...POINT2,
          z: 0,
          vx: 0,
          vy: 0,
          vz: 0,
          seed: i * 0.61803398875 % 1,
          phase: "grounded",
          tx: POINT2.x,
          ty: POINT2.y
        });
      }
    }
    WORLD.food = WORLD.activeFarmPlot.food;
    Object.assign(WORLD.foodTaps, {
      remainder: data.food.remainder,
      produced: data.food.produced,
      autoClock: data.food.autoClock
    });
    WORLD.nextId = data.nextId;
    const { boss: BOSS2, raid: RAID } = data.ledger;
    Object.assign(WORLD, {
      nextBossEncounterId: BOSS2.nextEncounterId,
      bossRewardWatermarks: {
        ...BOSS2.settledThrough
      },
      bossRewardStreams: structuredClone(BOSS2.rewardStreams),
      bossRewardInventory: BOSS2.queuedRewards.map(({ species, tier, count }) => ({ species, tier, count })),
      nextRaidRunSequence: RAID.nextRunSequence,
      activeRaidRunSequence: RAID.activeRun?.sequence ?? null,
      activeRaidSessionId: RAID.activeRun?.sessionId ?? null,
      raidSettlementWatermark: RAID.settledThrough
    });
    WORLD.bossRewardReceipts = BOSS2.pendingRewards.map((reward) => ({
      ...reward,
      x: Number.isFinite(reward.x) ? reward.x : 0,
      y: Number.isFinite(reward.y) ? reward.y : 0,
      boxes: [],
      revealedCount: reward.status === "ready" ? reward.boxCount : 0
    }));
    WORLD.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(data.rngState);
    WORLD.reconcileMateReservations();
    return WORLD;
  }
  var FAIL, ASSERT, INTEGER, SAFE_INTEGER, NUMBER3, STRING, REWARD_EXTRAS;
  var init_farm_progress = __esm({
    "src/farm-progress.js"() {
      init_farm_model();
      init_player_progression();
      init_boss_rewards();
      init_farm_plot();
      init_farm_upgrades();
      FAIL = () => {
        throw new TypeError("올바른 농장 진행 저장 데이터가 아니에요.");
      };
      ASSERT = (value) => {
        if (!value) {
          FAIL();
        }
      };
      INTEGER = (value, min = 0, max = 1e12) => Number.isSafeInteger(value) && value >= min && value <= max;
      SAFE_INTEGER = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= min && value <= max;
      NUMBER3 = (value, min = 0, max = 1e12) => Number.isFinite(value) && value >= min && value <= max;
      STRING = (value) => typeof value === "string" && value.trim().length > 0 && value.length < 256;
      REWARD_EXTRAS = [
        "x",
        "y",
        "acquisitionMultiplier",
        "baselineChance",
        "stage",
        "firstClear",
        "rollBudget",
        "bonusRollChance",
        "rollCount",
        "boxCount",
        "successCount",
        "acquiredCount",
        "grantedCount",
        "placedCount",
        "queuedCount",
        "status",
        "calculation",
        "unitId",
        "xpReceiptKey",
        "xpStatus",
        "xpAmount",
        "levelsGained",
        "pointsAwarded"
      ];
    }
  });

  // src/version.js
  var PRODUCT_VERSION, COMPATIBILITY;
  var init_version = __esm({
    "src/version.js"() {
      PRODUCT_VERSION = "0.10.3";
      COMPATIBILITY = PRODUCT_VERSION.split(".").slice(0, 2).join(".");
    }
  });

  // src/farm-save-codec.js
  function readFarmSave(text) {
    if (typeof text !== "string" || text.length > MAX_BYTES) {
      throw Error("Save data is too large. The original data was left unchanged.");
    }
    const PARSED = JSON.parse(text);
    if (PARSED?.schema !== "budmori-farm" || !IS_READABLE_COMPATIBILITY(PARSED.productVersion) || !PARSED.progress || typeof PARSED.progress !== "object" || Array.isArray(PARSED.progress) || Object.keys(PARSED).some((key) => !["schema", "productVersion", "progress"].includes(key))) {
      throw Error(
        "This save does not match the current Farm schema. Export the original save before importing a compatible save."
      );
    }
    return PARSED;
  }
  function decodeFarmSave(text) {
    const PARSED = readFarmSave(text);
    validateFarmProgress(PARSED.progress);
    return PARSED.progress;
  }
  function validateSave(text) {
    decodeFarmSave(text);
    return true;
  }
  function parseSave(text) {
    return restoreFarmProgress(decodeFarmSave(text));
  }
  function encodeFarmSave(world, data = captureFarmProgress(world)) {
    validateFarmProgress(data);
    const TEXT = JSON.stringify({
      schema: "budmori-farm",
      productVersion: PRODUCT_VERSION,
      progress: data
    });
    if (TEXT.length > MAX_BYTES) {
      throw Error("Save data is too large. The original data was left unchanged.");
    }
    return {
      data,
      text: TEXT
    };
  }
  var MAX_BYTES, COMPATIBILITY_LOCAL, IS_READABLE_COMPATIBILITY;
  var init_farm_save_codec = __esm({
    "src/farm-save-codec.js"() {
      init_version();
      init_farm_progress();
      MAX_BYTES = 2 * 1024 * 1024;
      COMPATIBILITY_LOCAL = (version) => typeof version === "string" ? version.split(".").slice(0, 2).join(".") : "";
      IS_READABLE_COMPATIBILITY = (version) => COMPATIBILITY_LOCAL(version) === COMPATIBILITY;
    }
  });

  // src/farm-storage.js
  var farm_storage_exports = {};
  __export(farm_storage_exports, {
    FarmStorage: () => FarmStorage,
    parseSave: () => parseSave,
    validateSave: () => validateSave
  });
  function reportSaveFailure(error, operation) {
    try {
      globalThis.BloomDiagnostics?.report?.(error, "farm-save-failure", {
        origin: "farm-storage",
        source: "farm-storage.js",
        operation
      });
    } catch (diagnosticError) {
      console.error("Unable to record Farm save failure diagnostics", diagnosticError);
    }
  }
  function saveFailureMessage(error, operation) {
    if (operation === "storage-write" && error?.name === "QuotaExceededError") {
      return "브라우저 저장 공간이 부족해 저장하지 못했어요. 기존 저장은 보존했어요. 저장 내보내기로 보관해 주세요.";
    }
    const LABEL = SAVE_FAILURE_LABELS[operation] || "저장 처리";
    return `${LABEL} 단계에서 오류가 발생했어요. 기존 저장은 보존했어요. 저장 내보내기로 보관한 뒤 진단 정보를 복사해 주세요.`;
  }
  var KEY, SAVE_FAILURE_LABELS, FarmStorage;
  var init_farm_storage = __esm({
    "src/farm-storage.js"() {
      init_farm_progress();
      init_farm_save_codec();
      KEY = "bloom-weapon-cards-v4";
      SAVE_FAILURE_LABELS = Object.freeze({
        "storage-read": "브라우저 저장소 읽기",
        "progress-capture": "농장 진행 데이터 수집",
        "progress-compare": "농장 진행 데이터 비교",
        "progress-validate-encode": "저장 데이터 검증·인코딩",
        "storage-write": "브라우저 저장소 쓰기"
      });
      FarmStorage = class {
        constructor() {
          this.raw = null;
          this._world = null;
          this.savedProgress = null;
          this.error = "";
          this.notice = "";
          this.writable = false;
          this.incompatible = false;
          try {
            this.raw = localStorage.getItem(KEY);
            if (this.raw) {
              try {
                this.savedProgress = decodeFarmSave(this.raw);
              } catch (error) {
                this.incompatible = true;
                this.error = error.message;
              }
            }
            this.writable = true;
          } catch (error) {
            this.error = error.message;
          }
        }
        get world() {
          if (!this._world && this.savedProgress) {
            this._world = restoreFarmProgress(this.savedProgress);
          }
          return this._world;
        }
        get hasWorld() {
          return !!(this._world || this.savedProgress);
        }
        initializeIncompatible(world) {
          if (!this.incompatible || !world) {
            return false;
          }
          try {
            if (localStorage.getItem(KEY) !== this.raw) {
              if (this.refresh() && this.hasWorld) {
                return true;
              }
              throw Error("The saved farm changed in another tab. Refresh before starting a new farm.");
            }
            const { data: DATA, text: TEXT } = this.serializeCheckpoint(world);
            localStorage.setItem(KEY, TEXT);
            this.raw = TEXT;
            this.savedProgress = DATA;
            this._world = world;
            this.incompatible = false;
            this.error = "";
            this.notice = "An incompatible prelaunch save was reset to the current farm format.";
            this.writable = true;
            return true;
          } catch (error) {
            this._world = world;
            this.savedProgress = null;
            this.error = error.message || "Could not save the fresh farm.";
            this.notice = "A fresh farm is available in memory, but browser storage is not writable.";
            this.writable = false;
            return false;
          }
        }
        get hasReservedRaid() {
          const RUN = this._world?.activeRaidRunSequence ?? this.savedProgress?.ledger.raid.activeRun?.sequence;
          return RUN !== null && RUN !== void 0;
        }
        set world(value) {
          this._world = value;
          this.savedProgress = null;
        }
        serializeCheckpoint(world, data) {
          const START = this.profiler?.start();
          try {
            return encodeFarmSave(world, data);
          } finally {
            this.profiler?.end("saveEncode", START);
          }
        }
        encode(world) {
          return this.serializeCheckpoint(world).text;
        }
        refresh() {
          if (!this.writable) {
            return false;
          }
          try {
            const TEXT = localStorage.getItem(KEY);
            if (TEXT === this.raw) {
              return true;
            }
            if (!TEXT) {
              throw Error("농장 저장을 찾지 못했어요. 다른 탭에서 새 농장을 시작했을 수 있어요.");
            }
            const DATA = decodeFarmSave(TEXT);
            this.raw = TEXT;
            this.savedProgress = DATA;
            this._world = null;
            this.incompatible = false;
            this.error = "";
            this.notice = "";
            return true;
          } catch (e) {
            this.error = e.message || "저장을 다시 읽지 못했어요.";
            return false;
          }
        }
        save(world) {
          const START = this.profiler?.start();
          this.profiler?.count("saveCalls");
          try {
            return this.saveCheckpoint(world);
          } finally {
            this.profiler?.end("save", START);
          }
        }
        saveCheckpoint(world) {
          if (!this.writable) {
            return false;
          }
          let operation = "storage-read";
          try {
            if (localStorage.getItem(KEY) !== this.raw) {
              this.error = "저장 내용이 다른 탭에서 바뀌었어요. 이 탭을 새로고침해 이어가 주세요.";
              return false;
            }
            operation = "progress-capture";
            const CAPTURE_START = this.profiler?.start();
            let data;
            try {
              data = captureFarmProgress(world);
            } finally {
              this.profiler?.end("saveCapture", CAPTURE_START);
            }
            operation = "progress-compare";
            if (sameFarmProgress(data, this.savedProgress)) {
              this._world = world;
              this.error = "";
              this.notice = "";
              return true;
            }
            operation = "progress-validate-encode";
            const { text: TEXT } = this.serializeCheckpoint(world, data);
            operation = "storage-write";
            const IO_START = this.profiler?.start();
            try {
              localStorage.setItem(KEY, TEXT);
            } finally {
              this.profiler?.end("saveIO", IO_START);
            }
            this.raw = TEXT;
            this.savedProgress = data;
            this._world = world;
            this.incompatible = false;
            this.error = "";
            this.notice = "";
            return true;
          } catch (error) {
            reportSaveFailure(error, operation);
            this.error = saveFailureMessage(error, operation);
            return false;
          }
        }
        replace(world) {
          const WRITABLE = this.writable;
          this.writable = true;
          const SAVED = this.save(world);
          if (!SAVED) {
            this.writable = WRITABLE;
          }
          return SAVED;
        }
        import(text) {
          if (localStorage.getItem(KEY) !== this.raw) {
            throw Error("저장 내용이 다른 탭에서 바뀌었어요. 새로고침한 뒤 다시 불러와 주세요.");
          }
          validateSave(text);
          const WORLD = parseSave(text), { data: DATA, text: NORMALIZED } = this.serializeCheckpoint(WORLD);
          localStorage.setItem(KEY, NORMALIZED);
          this.raw = NORMALIZED;
          this.savedProgress = DATA;
          this._world = WORLD;
          this.incompatible = false;
          this.writable = true;
          this.error = "";
          this.notice = "";
          return WORLD;
        }
      };
    }
  });

  // src/performance-diagnostics.js
  var STAGES = Object.freeze([
    "simulation",
    "stepLoop",
    "commandQueue",
    "autoTaps",
    "onAdvance",
    "pulseCapture",
    "logic",
    "mergeTask",
    "ai",
    "spatial",
    "physics",
    "collision",
    "worldStep",
    "worldPostStep",
    "mutationDispatch",
    "worldStepFollowup",
    "workScheduler",
    "presentationCapture",
    "presentationSnapshot",
    "runtimeCapture",
    "presentation",
    "render",
    "ui",
    "save",
    "saveCapture",
    "saveEncode",
    "saveIO",
    "instrumentation"
  ]);
  var COUNTERS = Object.freeze([
    "logicTicks",
    "workSchedulerTicks",
    "workSchedulerUnits",
    "foodSearchCandidateChecks",
    "foodSearchCellVisits",
    "workSchedulerQueueDepth",
    "workSchedulerJobsQueued",
    "workSchedulerJobsCompleted",
    "workSchedulerJobsCancelled",
    "workSchedulerWaitedJobs",
    "workSchedulerWaitingTicks",
    "workSchedulerMaxWaitTicks",
    "workSchedulerBudgetExhaustions",
    "physicsSteps",
    "physicsSolverIterations",
    "catchupTicks",
    "backlogDrops",
    "backlogDroppedMs",
    "backlogCappedFrames",
    "backlogClippedMs",
    "inputDtClampEvents",
    "inputDtClampedMs",
    "backlogOverflowEvents",
    "backlogOverflowMs",
    "clockGapDrops",
    "clockGapDroppedMs",
    "dropPolicyDrops",
    "dropPolicyDroppedMs",
    "presentationCaptures",
    "presentationEntities",
    "saveCalls",
    "drawCalls",
    "vectorFlushCalls",
    "vectorSubmissions",
    "pathTessellations",
    "pathStrokeBuilds",
    "meshCreates",
    "bufferUploads",
    "bufferBytes"
  ]);
  var FRAME_MAX_COUNTERS = Object.freeze(["workSchedulerMaxWaitTicks"]);
  var NUMBER = (value, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : "미측정";
  var PerformanceDiagnostics = class {
    constructor() {
      this.meter = new globalThis.BloomGamekitDebugTools.FrameMetrics({
        capacity: 240,
        stages: STAGES,
        counters: COUNTERS
      });
      this.detailed = false;
      this.frameMaximums = /* @__PURE__ */ Object.create(null);
    }
    setDetailed(enabled) {
      this.detailed = !!enabled;
      this.frameMaximums = /* @__PURE__ */ Object.create(null);
      this.meter.clear();
    }
    start() {
      return this.detailed ? performance.now() : 0;
    }
    end(name, startedAtMs) {
      if (!this.detailed) {
        return;
      }
      const END = performance.now();
      this.meter.stage(name, Math.max(0, END - startedAtMs));
      this.meter.stage("instrumentation", Math.max(0, performance.now() - END));
    }
    count(name, amount = 1) {
      this.meter.count(name, amount);
    }
    maximum(name, amount = 0) {
      if (!Number.isFinite(amount) || amount < 0) {
        return;
      }
      this.frameMaximums[name] = Math.max(this.frameMaximums[name] || 0, amount);
    }
    beginFrame(now) {
      this.frameMaximums = /* @__PURE__ */ Object.create(null);
      this.meter.beginFrame(now);
    }
    endFrame(renderer) {
      for (const NAME of COUNTERS) {
        if (NAME in renderer.device.stats) {
          this.count(NAME, renderer.device.stats[NAME]);
        }
      }
      for (const NAME of FRAME_MAX_COUNTERS) {
        this.count(NAME, this.frameMaximums[NAME] || 0);
      }
      this.frameMaximums = /* @__PURE__ */ Object.create(null);
      this.meter.endFrame();
    }
    snapshot(limit = 0) {
      return {
        ...this.meter.snapshot({ limit, slowLimit: 2 }),
        detailed: this.detailed,
        gpuMs: null,
        units: "milliseconds and counts; no GPU completion timing",
        timingHierarchy: "callback CPU contains simulation/presentation/render/ui; simulation contains stepLoop and pulseCapture; stepLoop contains FarmSession.advance, onAdvance callbacks and any presentation captures requested there; Garden.step contains logic/physics/worldPostStep/mutationDispatch; logic contains AI/spatial/workScheduler/mergeTask; presentationCapture contains snapshot preparation and runtimeCapture (SDK schema plans are cached by render type); save contains capture/encode/IO. Stage durations sum repeated calls within one RAF. Do not sum parents and children. Outside-callback events belong to the preceding RAF interval, not callback CPU."
      };
    }
    frameRate() {
      const SNAPSHOT = this.meter.snapshot();
      return {
        frames: this.meter.sequence,
        fps: SNAPSHOT.fps || 0,
        frametimeMs: {
          p50: SNAPSHOT.intervalMs.p50,
          p95: SNAPSHOT.intervalMs.p95,
          max: SNAPSHOT.intervalMs.max
        }
      };
    }
    summary(world, paused) {
      const SAMPLE = this.snapshot(), COUNT = (name) => SAMPLE.counts[name]?.total || 0, FRAME_COUNT = Math.max(1, SAMPLE.retainedFrames), PER_FRAME = (name) => NUMBER(COUNT(name) / FRAME_COUNT), PER_LOGIC_TICK = (name) => NUMBER(COUNT(name) / Math.max(1, COUNT("logicTicks"))), AVG_SEARCH_WAIT = NUMBER(
        COUNT("workSchedulerWaitingTicks") / Math.max(1, COUNT("workSchedulerWaitedJobs"))
      ), MAX_SEARCH_WAIT = NUMBER(SAMPLE.counts.workSchedulerMaxWaitTicks?.max || 0, 0), TIME = (name) => {
        const VALUE = SAMPLE.stagesMs[name];
        return this.detailed && SAMPLE.retainedFrames > 1 ? `${NUMBER(VALUE.mean)}/${NUMBER(VALUE.p95)}/${NUMBER(VALUE.max)}` : "미측정";
      };
      const LINES = [
        `work scheduler (food-target scans only): ${TIME("workScheduler")} / ${PER_LOGIC_TICK("workSchedulerUnits")} of 24 deterministic candidate/cell units per logic tick / ${PER_LOGIC_TICK("foodSearchCandidateChecks")} candidates and ${PER_LOGIC_TICK("foodSearchCellVisits")} cell visits / ${COUNT("workSchedulerJobsCompleted")} complete / queue ${PER_LOGIC_TICK("workSchedulerQueueDepth")} / first-service wait ${AVG_SEARCH_WAIT} ticks/job, max ${MAX_SEARCH_WAIT} ticks/RAF`,
        `SDK loss ms: clock-gap ${NUMBER(COUNT("clockGapDroppedMs"), 0)} / input clamp ${NUMBER(COUNT("inputDtClampedMs"), 0)} / backlog overflow ${NUMBER(COUNT("backlogOverflowMs"), 0)} / drop-policy ${NUMBER(COUNT("dropPolicyDroppedMs"), 0)}`,
        `상태 ${world.scene} ${paused ? "정지" : "실행"} · 병력 ${world.units.length} · 먹이 ${world.food.length}`,
        `창 ${NUMBER(SAMPLE.windowMs / 1e3, 2)}s/${SAMPLE.retainedFrames}프레임 · 상세 ${this.detailed ? "켜짐" : "꺼짐"} · ${SAMPLE.retainedFrames > 1 ? "유효" : "표본 부족"}`,
        `RAF FPS ${NUMBER(SAMPLE.fps)} · 간격 평균/p95/최대 ${NUMBER(SAMPLE.intervalMs.mean)}/${NUMBER(SAMPLE.intervalMs.p95)}/${NUMBER(SAMPLE.intervalMs.max)}ms · CPU ${NUMBER(SAMPLE.cpuMs.mean)}/${NUMBER(SAMPLE.cpuMs.p95)}/${NUMBER(SAMPLE.cpuMs.max)}ms`,
        `창 합계: 논리 ${COUNT("logicTicks")} (${PER_FRAME("logicTicks")}/RAF) · advancePhysics 호출 ${COUNT("physicsSteps")} (${PER_FRAME("physicsSteps")}/RAF) · solver 반복 ${COUNT("physicsSolverIterations")} · 추가 catchup ${COUNT("catchupTicks")} · backlog drop ${COUNT("backlogDrops")}회/${NUMBER(COUNT("backlogDroppedMs"), 0)}ms · cap ${COUNT("backlogCappedFrames")}프레임/${NUMBER(COUNT("backlogClippedMs"), 0)}ms`,
        `CPU 평균/p95/최대(부모·자식 합산 금지): ${TIME("simulation")} · loop ${TIME("stepLoop")} · 명령 ${TIME("commandQueue")} · 자동 먹이 ${TIME("autoTaps")} · 논리 ${TIME("logic")} (합성 접근 ${TIME("mergeTask")}) · 물리 ${TIME("physics")}`,
        `CPU post-step ${TIME("worldPostStep")} · event dispatch ${TIME("mutationDispatch")} · world-step follow-up ${TIME("worldStepFollowup")} · capture ${TIME("presentationCapture")} (snapshot prep ${TIME("presentationSnapshot")} / SDK ${TIME("runtimeCapture")})`,
        `프레임 평균: 프레젠테이션 캡처 ${PER_FRAME("presentationCaptures")}회 / 엔티티 ${PER_FRAME("presentationEntities")} · solver 반복 ${PER_FRAME("physicsSolverIterations")}`,
        `CPU AI ${TIME("ai")} · 인덱스 재구축/갱신 ${TIME("spatial")} · 충돌 ${TIME("collision")}`,
        `CPU 보간 ${TIME("presentation")} · WebGL 제출 ${TIME("render")} · UI ${TIME("ui")}`,
        `저장 ${COUNT("saveCalls")}회 · CPU 전체 ${TIME("save")} / 캡처 ${TIME("saveCapture")} / 인코딩 ${TIME("saveEncode")} / IO ${TIME("saveIO")}`,
        `프레임 평균: draw ${PER_FRAME("drawCalls")} · vector flush ${PER_FRAME("vectorFlushCalls")} · submit ${PER_FRAME("vectorSubmissions")} · fill 재테셀 ${PER_FRAME("pathTessellations")} · stroke 생성 ${PER_FRAME("pathStrokeBuilds")}`,
        `프레임 평균: retained mesh 생성 ${PER_FRAME("meshCreates")} · upload ${PER_FRAME("bufferUploads")}회/${NUMBER(COUNT("bufferBytes") / FRAME_COUNT / 1024)}KiB · 계측 기록 비용 ${TIME("instrumentation")}`,
        "GPU 시간 미측정 · CPU=콜백 작업, RAF=다음 콜백까지 간격. 외부 이벤트·대기 시간은 CPU에 합산하지 않음."
      ];
      for (const FRAME of SAMPLE.slowFrames.slice(0, 1)) {
        LINES.push(
          `느린 구간 #${FRAME.sequence} RAF ${NUMBER(FRAME.intervalMs)}ms/콜백 CPU ${NUMBER(FRAME.cpuMs)}ms · sim ${NUMBER(FRAME.stagesMs.simulation)} render ${NUMBER(FRAME.stagesMs.render)} save ${NUMBER(FRAME.stagesMs.save)} · tick/solver ${FRAME.counts.logicTicks}/${FRAME.counts.physicsSolverIterations} draw ${FRAME.counts.drawCalls}${this.detailed ? "" : " · 상세 시간 미측정"}`
        );
      }
      return LINES;
    }
  };

  // src/formation-skills-ui.js
  init_formation_skill_state();
  var CONDITION_LABELS = Object.freeze({
    damageDealt: "준 피해",
    damageTaken: "받은 피해",
    hits: "공격 적중",
    critHits: "치명타",
    allyDeaths: "아군 쓰러짐",
    time: "전투 시간"
  });
  var ICONS = Object.freeze({
    giant: "🌱",
    lightning: "ϟ",
    meteor: "☄",
    "meteor-shower": "✦",
    copy: "◈",
    "healing-rain": "☂",
    hammer: "⚒",
    ufo: "🛸",
    "storm-cloud": "☁"
  });
  var ESCAPE = (value) => String(value).replace(
    /[&<>"']/g,
    (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]
  );
  var NUMBER2 = (value) => new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(value || 0);
  var FormationSkillsUI = class {
    constructor(command) {
      this.command = command;
      this.fingerprint = "";
      this.dockKey = "";
      this.root = document.createElement("section");
      this.root.className = "formation-dock";
      this.root.setAttribute("aria-label", "편성 스킬");
      this.root.innerHTML = '<div class="formation-slots"></div>';
      document.querySelector("#gameplayDock").prepend(this.root);
      this.content = document.querySelector("#formationContent");
      this.slotHost = this.root.querySelector(".formation-slots");
      this.content.onclick = (event) => this.click(event);
    }
    click(event) {
      const BUTTON = event.target.closest("button");
      if (!BUTTON || BUTTON.disabled) {
        return;
      }
      if (BUTTON.hasAttribute("data-formation-buy-slot")) {
        this.command("formation-slot", {});
      } else if (BUTTON.dataset.formationPurchase) {
        this.command("formation-purchase", { id: BUTTON.dataset.formationPurchase });
      } else if (BUTTON.dataset.formationEquip) {
        this.command("formation-equip", {
          slot: Number(BUTTON.dataset.slot),
          id: BUTTON.dataset.formationEquip
        });
      } else if (BUTTON.dataset.formationUnequip !== void 0) {
        this.command("formation-equip", { slot: Number(BUTTON.dataset.formationUnequip), id: null });
      }
    }
    update(world, display, visible, ownerId = "") {
      this.root.hidden = !visible;
      const PLAYER = world.scene === "raid" ? world.raidRoster(ownerId)?.abilitySnapshot : world.playerProgression, STATE = PLAYER?.formationSkills;
      if (!STATE) {
        return;
      }
      const LOCKED = world.scene !== "farm" || world.running || world.farmBossEvent?.phase !== "idle", POINTS = PLAYER.availablePoints, KEY2 = JSON.stringify([STATE, POINTS, LOCKED]);
      if (KEY2 !== this.fingerprint) {
        this.fingerprint = KEY2;
        this.drawEditor(STATE, POINTS, LOCKED);
      }
      const DOCK_KEY = JSON.stringify([STATE.slots, STATE.equipped]);
      if (DOCK_KEY !== this.dockKey) {
        this.dockKey = DOCK_KEY;
        this.slotHost.innerHTML = Array.from({ length: STATE.slots }, (_, slot) => {
          const DEFINITION13 = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === STATE.equipped[slot]);
          return `<div class="formation-slot" data-formation-slot="${slot}">
                    <div class="formation-icon" title="${ESCAPE(DEFINITION13?.name || "빈 슬롯")}">
                    <span>${ICONS[DEFINITION13?.id] || "+"}</span><i class="formation-clock"></i></div>
                    <div class="formation-readout"><strong>${ESCAPE(DEFINITION13?.name || "빈 슬롯")}</strong>
                    <div class="formation-charge"><i></i></div><small><b></b><span></span></small></div></div>`;
        }).join("");
      }
      const SLOTS = display.formationSlots || world.formationSkills?.slots || [];
      for (const ELEMENT of this.slotHost.children) {
        const INDEX = Number(ELEMENT.dataset.formationSlot), ID = STATE.equipped[INDEX], DEFINITION13 = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === ID), RUNTIME = SLOTS.find((item) => item.id === ID && (!item.ownerId || item.ownerId === ownerId)), REQUIRED = DEFINITION13?.required || 1, CHARGE = Math.min(REQUIRED, RUNTIME?.charge || 0), COOLDOWN = Math.max(0, RUNTIME?.cooldown || 0), READY = !!ID && CHARGE >= REQUIRED && COOLDOWN === 0;
        ELEMENT.querySelector(".formation-clock").style.setProperty(
          "--cooldown",
          `${COOLDOWN / FORMATION_COOLDOWN_SECONDS * 360}deg`
        );
        ELEMENT.querySelector(".formation-charge i").style.width = `${CHARGE / REQUIRED * 100}%`;
        ELEMENT.querySelector("small b").textContent = DEFINITION13 ? `${NUMBER2(CHARGE)}/${NUMBER2(REQUIRED)}` : "";
        ELEMENT.querySelector("small span").textContent = DEFINITION13 ? CONDITION_LABELS[DEFINITION13.condition] || "" : "장착 가능";
        ELEMENT.dataset.ready = String(READY);
        ELEMENT.querySelector(".formation-icon").setAttribute(
          "aria-label",
          `${DEFINITION13?.name || "빈 슬롯"}, 재사용 ${NUMBER2(COOLDOWN)}초`
        );
      }
    }
    drawEditor(state, points, locked) {
      const EMPTY = Array.from({ length: state.slots }, (_, index) => index).find((index) => !state.equipped[index]);
      const SLOT_CARDS = Array.from({ length: state.slots }, (_, index) => {
        const ID = state.equipped[index], NAME = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === ID)?.name || "빈 슬롯";
        return `<div class="formation-equipped"><b>${index + 1}</b><span>${ESCAPE(NAME)}</span>
                <button type="button" data-formation-unequip="${index}" ${locked || !ID ? "disabled" : ""}>
                해제</button></div>`;
      }).join("");
      const CARDS = FORMATION_SKILL_DEFINITIONS.map((definition) => {
        const LEVEL = state.levels[definition.id] || 0, EQUIPPED = state.equipped.includes(definition.id), BUY_DISABLED = locked || points < 1 || LEVEL >= FORMATION_MAX_LEVEL, EQUIP_DISABLED = locked || !LEVEL || EQUIPPED || EMPTY === void 0;
        return `<article class="formation-card" data-skill="${definition.id}">
                <div class="formation-card-heading"><span class="formation-card-icon">${ICONS[definition.id]}</span>
                <h3>${ESCAPE(definition.name)}</h3><small>${LEVEL ? `Lv.${LEVEL}` : "미습득"}</small></div>
                <p>${ESCAPE(definition.description || "")}</p>
                <div class="formation-rule">${CONDITION_LABELS[definition.condition] || ""} ${definition.required}
                <span>재사용 ${FORMATION_COOLDOWN_SECONDS}초</span></div>
                <small class="formation-axis">강화: ${ESCAPE(definition.upgradeAxis || "")}<br>${NUMBER2(formationUpgradeValue(definition, LEVEL))}${ESCAPE(definition.upgradeUnit)}${LEVEL > 0 && LEVEL < FORMATION_MAX_LEVEL ? " → " + NUMBER2(formationUpgradeValue(definition, LEVEL + 1)) + ESCAPE(definition.upgradeUnit) : ""}</small>
                <div class="formation-card-actions"><button type="button" data-formation-purchase="${definition.id}"
                ${BUY_DISABLED ? "disabled" : ""}>${LEVEL ? "강화" : "습득"} · 1 포인트</button>
                <button type="button" data-formation-equip="${definition.id}" data-slot="${EMPTY ?? 0}"
                ${EQUIP_DISABLED ? "disabled" : ""}>${EQUIPPED ? "장착 중" : "장착"}</button></div></article>`;
      }).join("");
      this.content.innerHTML = `<p class="formation-intro">종별 패시브와 별도로, 조건과 재사용 시간이 준비되면 자동 발동해요.</p>
            <p class="formation-wallet"><strong>${points}</strong> 공용 포인트
            <span>${locked ? "전투 중 편성 고정" : "농장에서 무료 장착·해제"}</span></p>
            <div class="formation-equipment">${SLOT_CARDS}</div>
            <button class="formation-add-slot" type="button" data-formation-buy-slot
            ${locked || state.slots >= 3 || points < 1 ? "disabled" : ""}>
            ${state.slots >= 3 ? "슬롯 3칸 개방 완료" : "슬롯 추가 · 1 포인트"}</button>
            <div class="formation-catalog">${CARDS}</div>`;
    }
  };

  // src/raid-deployment-cards-ui.js
  init_species_catalog();
  init_raid_deployment_cards();
  var ESCAPE2 = (value) => String(value).replace(
    /[&<>"']/g,
    (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]
  );
  var RaidDeploymentCardsUI = class {
    constructor({ command, deploy, canDeploy }) {
      this.command = command;
      this.deploy = deploy;
      this.canDeploy = canDeploy;
      this.editorFingerprint = "";
      this.raidFingerprint = "";
      this.hold = null;
      this.timer = null;
      this.root = document.querySelector("#deploymentCards");
      this.row = this.root.querySelector(".deployment-card-row");
      this.content = document.querySelector("#deploymentCardContent");
      this.content.addEventListener("change", (event) => this.change(event));
      this.content.addEventListener("click", (event) => this.click(event));
      this.row.addEventListener("pointerdown", (event) => this.pointerDown(event));
      this.row.addEventListener("pointerup", (event) => this.stopHold(event));
      this.row.addEventListener("pointercancel", (event) => this.stopHold(event));
      this.row.addEventListener("lostpointercapture", (event) => this.stopHold(event));
      this.row.addEventListener("click", (event) => event.preventDefault());
      this.row.addEventListener("keydown", (event) => this.keyDown(event));
      this.row.addEventListener("keyup", (event) => this.keyUp(event));
      this.row.addEventListener("blur", () => this.stopHold(), true);
      window.addEventListener("blur", () => this.stopHold());
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this.stopHold();
        }
      });
    }
    change(event) {
      const SELECT = event.target.closest("select[data-deployment-slot]");
      if (!SELECT || SELECT.disabled) {
        return;
      }
      const VALUE = SELECT.value === "" ? null : Number(SELECT.value);
      this.command("deployment-card-select", { slot: Number(SELECT.dataset.deploymentSlot), speciesId: VALUE });
    }
    click(event) {
      const BUTTON = event.target.closest("button[data-deployment-buy-slot]");
      if (BUTTON && !BUTTON.disabled) {
        this.command("deployment-card-buy-slot", {});
      }
    }
    pointerDown(event) {
      const BUTTON = event.target.closest("button[data-deploy-species]");
      if (!BUTTON || event.button !== 0 || BUTTON.disabled || !this.canDeploy() || this.hold) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (!this.beginHold(BUTTON.dataset.deploySpecies, event.pointerId)) {
        return;
      }
      BUTTON.setPointerCapture?.(event.pointerId);
    }
    keyDown(event) {
      const BUTTON = event.target.closest("button[data-deploy-species]");
      if (!BUTTON || !["Enter", " "].includes(event.key)) {
        return;
      }
      event.preventDefault();
      if (!event.repeat && !this.hold && !BUTTON.disabled && this.canDeploy()) {
        this.beginHold(BUTTON.dataset.deploySpecies, "keyboard");
      }
    }
    keyUp(event) {
      if (["Enter", " "].includes(event.key)) {
        event.preventDefault();
        this.stopHold();
      }
    }
    beginHold(speciesId, pointerId) {
      if (!this.deploy(Number(speciesId))) {
        return false;
      }
      this.hold = { speciesId, pointerId };
      this.row.querySelector(`[data-deploy-species="${speciesId}"]`)?.setAttribute("aria-pressed", "true");
      this.timer = setInterval(() => {
        if (!this.hold || !this.canDeploy() || !this.deploy(Number(this.hold.speciesId))) {
          this.stopHold();
        }
      }, 100);
      return true;
    }
    stopHold(event) {
      if (event && this.hold?.pointerId !== event.pointerId) {
        return;
      }
      const HOLD = this.hold;
      this.hold = null;
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.row.querySelector(`[data-deploy-species="${HOLD?.speciesId}"]`)?.setAttribute("aria-pressed", "false");
      if (typeof HOLD?.pointerId === "number") {
        const BUTTON = [...this.row.querySelectorAll("[data-deploy-species]")].find(
          (button) => button.dataset.deploySpecies === HOLD.speciesId
        );
        if (BUTTON?.hasPointerCapture?.(HOLD.pointerId)) {
          BUTTON.releasePointerCapture(HOLD.pointerId);
        }
      }
    }
    update(world, sourceWorld, visible, ownerId = "", canEditLoadout = world.scene === "farm") {
      const ROSTER2 = world.scene === "raid" && world.raidRoster(ownerId), SHOW_RAID = !!visible && !!ROSTER2;
      this.root.hidden = !SHOW_RAID;
      if (!SHOW_RAID) {
        this.stopHold();
        this.raidFingerprint = "";
      } else {
        if (!this.canDeploy() || ["victory", "defeat"].includes(world.encounter.outcome)) {
          this.stopHold();
        }
        const KEY3 = JSON.stringify(ROSTER2.deploymentCardSpecies);
        if (KEY3 !== this.raidFingerprint) {
          this.raidFingerprint = KEY3;
          this.drawRaidCards(ROSTER2);
        }
        this.updateRaidCounts(ROSTER2);
      }
      const PLAYER = sourceWorld?.playerProgression, STATE = PLAYER?.raidDeploymentCards;
      if (!STATE || !isValidRaidDeploymentCardsState(STATE)) {
        this.content.replaceChildren();
        this.editorFingerprint = "";
        return;
      }
      const LOCKED = !canEditLoadout || world.scene !== "farm" || sourceWorld.running || sourceWorld.farmBossEvent?.phase !== "idle", OWNED = sourceWorld.units.filter((unit) => unit.countsTowardPermanentRoster !== false).reduce((map, unit) => map.set(unit.species, (map.get(unit.species) || 0) + 1), /* @__PURE__ */ new Map()), KEY2 = JSON.stringify([STATE, PLAYER.availablePoints, LOCKED, [...OWNED]]);
      if (KEY2 !== this.editorFingerprint) {
        this.editorFingerprint = KEY2;
        this.drawEditor(STATE, PLAYER.availablePoints, LOCKED, OWNED);
      }
    }
    drawRaidCards(roster) {
      const SPECIES = roster.deploymentCardSpecies || [], AVAILABLE = (speciesId) => roster.troops.filter((troop) => troop.species === speciesId && !troop.deployed).length, ACTIVE = (speciesId) => SPECIES.some((candidate) => candidate === speciesId);
      this.row.innerHTML = SPECIES.map((speciesId, index) => {
        const SPECIES_INFO = speciesById(speciesId), REMAINING = AVAILABLE(speciesId);
        return `<button class="deployment-card" type="button" data-deploy-species="${speciesId}"
                aria-label="${ESCAPE2(SPECIES_INFO.name)} 병력 배치, 남은 ${REMAINING}마리"
                aria-pressed="false" ${REMAINING === 0 || !ACTIVE(speciesId) ? "disabled" : ""}>
                <span class="deployment-card__number">${index + 1}</span>
                <strong>${ESCAPE2(SPECIES_INFO.name)}</strong><small>${REMAINING} 남음</small></button>`;
      }).join("");
    }
    updateRaidCounts(roster) {
      for (const BUTTON of this.row.querySelectorAll("button[data-deploy-species]")) {
        const SPECIES_ID = Number(BUTTON.dataset.deploySpecies), REMAINING = roster.troops.filter((troop) => troop.species === SPECIES_ID && !troop.deployed).length;
        BUTTON.disabled = REMAINING === 0;
        BUTTON.querySelector("small").textContent = `${REMAINING} 남음`;
        BUTTON.setAttribute(
          "aria-label",
          `${speciesById(SPECIES_ID).name} 병력 배치, 남은 ${REMAINING}마리`
        );
      }
    }
    drawEditor(state, points, locked, owned) {
      const UNLOCKED = Array.from({ length: state.unlockedSlots }, (_, slot) => {
        const CURRENT = state.speciesBySlot[slot], OPTIONS = SPECIES_CATALOG.filter(({ id }) => owned.has(id));
        return `<article class="deployment-editor-slot">
                <label for="deploymentSpecies${slot}">슬롯 ${slot + 1}${slot === 0 ? " · 무료" : ""}</label>
                <select id="deploymentSpecies${slot}" data-deployment-slot="${slot}" ${locked ? "disabled" : ""}>
                    <option value="">선택 안 함</option>
                    ${OPTIONS.map(
          ({ id, name }) => `<option value="${id}" ${CURRENT === id ? "selected" : ""}
                        ${state.speciesBySlot.some((selected, index) => index !== slot && selected === id) ? "disabled" : ""}>
                        ${ESCAPE2(name)} (${owned.get(id)})</option>`
        ).join("")}
                </select></article>`;
      }).join("");
      const LOCKED = Array.from(
        { length: RAID_DEPLOYMENT_CARD_LIMIT - state.unlockedSlots },
        (_, index) => state.unlockedSlots + index
      ).map(
        (slot) => `<button class="deployment-card-buy" type="button" data-deployment-buy-slot
            ${locked || points < RAID_DEPLOYMENT_CARD_SLOT_COST ? "disabled" : ""}>
            슬롯 ${slot + 1} 잠김 · ${RAID_DEPLOYMENT_CARD_SLOT_COST} 포인트로 해금</button>`
      ).join("");
      this.content.innerHTML = `<p class="deployment-card-intro">보유한 병종을 최대 4개 편성하고, 카드를 누르거나 길게 눌러 한 마리씩 배치해요. 편성은 농장에서만 바꿀 수 있어요.</p>
            <p class="deployment-card-wallet"><strong>${points}</strong> 공용 포인트</p>
            <div class="deployment-editor-slots">${UNLOCKED}${LOCKED}</div>`;
    }
  };

  // src/farm-app.js
  init_raid_deployment_cards();
  init_farm_model();

  // src/features/formation-skills/presentation-base.js
  function stroke(renderer, points, color, width) {
    const C = renderer.ctx;
    C.beginPath();
    for (let i = 0; i < points.length; i++) {
      const P = renderer.project(...points[i]);
      if (i === 0) {
        C.moveTo(P.x, P.y);
      } else {
        C.lineTo(P.x, P.y);
      }
    }
    C.strokeStyle = color;
    C.lineWidth = Math.max(renderer.pixelRatio, renderer.scale * width);
    C.lineCap = "round";
    C.lineJoin = "round";
    C.stroke();
  }
  function bolt(renderer, x, y, z, height, age, seed = 0, radius = 0.3) {
    const FADE = Math.max(0, 1 - age / 0.65);
    if (FADE <= 0) {
      return;
    }
    const BODY_SCALE = Math.max(0.6, radius / 0.3);
    const POINTS = [];
    for (let i = 0; i <= 9; i++) {
      POINTS.push([
        x + (i === 9 ? 0 : Math.sin(i * 13.17 + seed) * 0.32 * BODY_SCALE),
        y + (i === 9 ? 0 : Math.cos(i * 5.7 + seed) * 0.12 * BODY_SCALE),
        z + height * (1 - i / 9)
      ]);
    }
    if (age < 0.12) {
      stroke(renderer, POINTS, `rgba(51,121,255,${FADE * 0.2})`, 0.5 * BODY_SCALE);
      stroke(renderer, POINTS, `rgba(99,181,255,${FADE * 0.65})`, 0.19 * BODY_SCALE);
      stroke(renderer, POINTS, `rgba(236,251,255,${FADE})`, 0.11 * BODY_SCALE);
    } else {
      for (let i = 0; i < POINTS.length - 1; i++) {
        const FRAGMENT = Math.max(0, 1 - (age - 0.12 - i % 3 * 0.035) / 0.35);
        if (i % 3 === Math.floor(age * 9) % 3) {
          continue;
        }
        const SEGMENT = POINTS.slice(i, i + 2);
        stroke(renderer, SEGMENT, `rgba(84,169,255,${FRAGMENT * 0.55})`, 0.16 * BODY_SCALE);
        stroke(renderer, SEGMENT, `rgba(216,247,255,${FRAGMENT})`, 0.035 * BODY_SCALE);
      }
    }
    renderer.ring(x, y, radius + age * radius * 10, `rgba(157,212,255,${FADE * 0.8})`, 0.09 * BODY_SCALE);
    if (age < 0.09) {
      const P = renderer.project(x, y, z + 0.15);
      renderer.ellipse(P.x, P.y, renderer.scale * radius * 2.17, renderer.scale * radius * 1.4, "#effcffdd");
    }
  }
  function cloud(renderer, x, y, z, size, alpha = 1) {
    for (let i = 0; i < 5; i++) {
      const P = renderer.project(x + (i - 2) * 0.25 * size, y, z + Math.sin(i * 1.4) * 0.14 * size);
      renderer.ellipse(
        P.x,
        P.y,
        renderer.scale * size * 0.34,
        renderer.scale * size * 0.26,
        `rgba(98,128,157,${alpha})`
      );
    }
  }
  var FormationPresentation = class {
    draw(_renderer, _effect, _world) {
    }
  };

  // src/features/formation-skills/giant/presentation.js
  var GiantPresentation = class extends FormationPresentation {
    draw(renderer, effect) {
      const PULSE = 0.85 + Math.sin(effect.age * 5) * 0.15, RADIUS = Math.max(0.3, effect.radius || 0.3);
      renderer.ring(effect.x, effect.y, RADIUS * 1.15 * PULSE, "#b3d875aa", 0.07);
      renderer.ring(effect.x, effect.y, RADIUS * 1.42 * PULSE, "#e6f3b344", 0.04);
      for (let i = 0; i < 5; i++) {
        const A = i * Math.PI * 2 / 5 + effect.age, P = renderer.project(
          effect.x + Math.cos(A) * RADIUS * 1.25,
          effect.y + Math.sin(A) * RADIUS * 1.25,
          (effect.age * 1.3 + i * 0.4) % 2
        );
        renderer.ellipse(P.x, P.y, renderer.scale * 0.025, renderer.scale * 0.055, "#e2f7a9aa");
      }
    }
  };

  // src/features/formation-skills/lightning/presentation.js
  var LightningPresentation = class extends FormationPresentation {
    draw(renderer, effect) {
      const BODY_HEIGHT = Math.max(0.5, effect.bodyHeight || 0.7), BODY_RADIUS = Math.max(0.2, effect.bodyRadius || 0.3);
      bolt(
        renderer,
        effect.x,
        effect.y,
        effect.z + BODY_HEIGHT,
        BODY_HEIGHT * 2.4,
        effect.age,
        effect.id,
        BODY_RADIUS
      );
    }
  };

  // src/features/formation-skills/meteor/presentation.js
  var MeteorPresentation = class extends FormationPresentation {
    constructor() {
      super();
      this.bodySize = 0.8;
      this.tailWidth = 1.2;
    }
    draw(renderer, effect) {
      const AGE = effect.age - effect.delay;
      if (AGE < 0) {
        return;
      }
      const S = renderer.scale, R2 = effect.radius;
      if (AGE < 0.75) {
        const Q = AGE / 0.75, Z = 12 * (1 - Q * Q), P = renderer.project(effect.x, effect.y, Z), T = renderer.project(effect.x - 0.9, effect.y, Z + 2.8);
        renderer.ring(effect.x, effect.y, R2, "#dc905b88", 0.04);
        stroke(
          renderer,
          [
            [effect.x - 0.9, effect.y, Z + 2.8],
            [effect.x, effect.y, Z]
          ],
          "#ffb458aa",
          this.tailWidth
        );
        renderer.ellipse(P.x, P.y, S * this.bodySize, S * this.bodySize * 1.2, "#824c3d", -0.25);
        renderer.ellipse(P.x - S * 0.09, P.y - S * 0.08, S * 0.21, S * 0.24, "#efbc76", -0.25);
        renderer.ellipse(T.x, T.y, S * 0.13, S * 0.2, "#ffe4a455");
      } else {
        const Q = Math.min(1, (AGE - 0.75) / 0.5);
        renderer.groundEllipse(
          effect.x,
          effect.y,
          R2 * (0.45 + Q * 0.55),
          R2 * (0.45 + Q * 0.55),
          `rgba(239,157,72,${(1 - Q) * 0.26})`
        );
        renderer.ring(effect.x, effect.y, R2 * Q, `rgba(255,215,138,${1 - Q})`, 0.15 * (1 - Q) + 0.02);
        for (let i = 0; i < 9; i++) {
          const A = i * 2.39996, P = renderer.project(
            effect.x + Math.cos(A) * R2 * Q,
            effect.y + Math.sin(A) * R2 * Q,
            Math.sin(Q * Math.PI) * 0.8
          );
          renderer.ellipse(P.x, P.y, S * 0.07 * (1 - Q), S * 0.05 * (1 - Q), `rgba(150,112,77,${1 - Q})`);
        }
      }
    }
  };

  // src/features/formation-skills/meteor-shower/presentation.js
  var MeteorShowerPresentation = class extends MeteorPresentation {
    constructor() {
      super();
      this.bodySize = 0.25;
      this.tailWidth = 0.35;
    }
  };

  // src/features/formation-skills/copy/presentation.js
  var CopyPresentation = class extends FormationPresentation {
    draw(renderer, effect) {
      const Q = Math.min(1, effect.age / effect.duration);
      renderer.ring(effect.x, effect.y, effect.radius, "#84c6e8aa", 0.04);
      renderer.groundEllipse(effect.x, effect.y, effect.radius, effect.radius, `rgba(120,196,235,${(1 - Q) * 0.15})`);
    }
  };
  var CopyDissolvePresentation = class {
    draw(renderer, effect, age) {
      const Q = Math.min(1, age / 0.6);
      for (let i = 0; i < 9; i++) {
        const A = i * 2.39996, X = effect.x + Math.cos(A) * Q, Y = effect.y + Math.sin(A) * Q, Z = effect.z + Q * 1.3;
        stroke(
          renderer,
          [
            [X, Y, Z],
            [X + 0.07, Y, Z + 0.13]
          ],
          `rgba(161,218,255,${1 - Q})`,
          0.06 * (1 - Q)
        );
      }
    }
  };

  // src/features/formation-skills/healing-rain/presentation.js
  var HealingRainPresentation = class extends FormationPresentation {
    draw(renderer, effect, world) {
      const FADE = Math.min(1, effect.age * 3, (effect.duration - effect.age) * 3);
      for (const UNIT3 of world.units) {
        if (UNIT3.hp <= 0 || UNIT3.faction !== "player" || UNIT3.hp >= UNIT3.maxHp) {
          continue;
        }
        cloud(renderer, UNIT3.x, UNIT3.y, UNIT3.height + 1.5, 0.7, FADE * 0.45);
        for (let i = 0; i < 4; i++) {
          const Z = ((i * 0.6 - effect.age * 2) % 1.8 + 1.8) % 1.8;
          stroke(
            renderer,
            [
              [UNIT3.x + (i - 1.5) * 0.18, UNIT3.y, Z + 0.2],
              [UNIT3.x + (i - 1.5) * 0.18, UNIT3.y, Z]
            ],
            `rgba(136,216,188,${FADE * 0.8})`,
            0.025
          );
        }
      }
    }
  };

  // src/features/formation-skills/hammer/presentation.js
  var HammerPresentation = class extends FormationPresentation {
    draw(renderer, effect) {
      const BODY_RADIUS = Math.max(0.2, effect.bodyRadius || 0.3), BODY_HEIGHT = Math.max(BODY_RADIUS * 2, effect.bodyHeight || BODY_RADIUS * 2), TELEGRAPH_END = 0.14, IMPACT_TIME = 0.42, DROP = Math.max(0, Math.min(1, (effect.age - TELEGRAPH_END) / (IMPACT_TIME - TELEGRAPH_END))), FALL = DROP ** 2.2, START_Z = effect.z + BODY_HEIGHT + BODY_RADIUS * 3.2, IMPACT_Z = effect.z + BODY_HEIGHT * 0.55, Z = START_Z + (IMPACT_Z - START_Z) * FALL, HEAD_WIDTH = BODY_RADIUS * 6, HEAD_HEIGHT = BODY_RADIUS * 1.8, P = renderer.project(effect.x, effect.y, Z), S = renderer.scale, C = renderer.ctx, FADE = Math.max(0, 1 - Math.max(0, effect.age - IMPACT_TIME) / 0.28);
      if (effect.age < TELEGRAPH_END) {
        const TELEGRAPH = 1 - effect.age / TELEGRAPH_END, AIM = renderer.project(effect.x, effect.y, IMPACT_Z);
        renderer.ellipse(
          AIM.x,
          AIM.y,
          S * BODY_RADIUS * (1.8 + (1 - TELEGRAPH) * 0.8),
          S * BODY_RADIUS * 0.52,
          `rgba(233,218,146,${0.32 + TELEGRAPH * 0.42})`
        );
      }
      stroke(
        renderer,
        [
          [effect.x, effect.y, Z + HEAD_HEIGHT * 0.9],
          [effect.x, effect.y, Z]
        ],
        `rgba(130,90,65,${FADE})`,
        BODY_RADIUS * 0.7
      );
      C.fillStyle = `rgba(132,153,172,${FADE})`;
      C.beginPath();
      C.roundRect(
        P.x - S * HEAD_WIDTH / 2,
        P.y - S * HEAD_HEIGHT / 2,
        S * HEAD_WIDTH,
        S * HEAD_HEIGHT,
        S * BODY_RADIUS * 0.3
      );
      C.fill();
      C.fillStyle = `rgba(216,229,234,${FADE})`;
      C.beginPath();
      C.roundRect(
        P.x - S * HEAD_WIDTH / 2.1,
        P.y - S * HEAD_HEIGHT / 2,
        S * HEAD_WIDTH / 1.05,
        S * HEAD_HEIGHT * 0.16,
        S * BODY_RADIUS * 0.1
      );
      C.fill();
      if (effect.age > IMPACT_TIME) {
        renderer.ring(
          effect.x,
          effect.y,
          BODY_RADIUS * (1.1 + (effect.age - IMPACT_TIME) * 5),
          `rgba(233,218,146,${FADE})`,
          BODY_RADIUS * 0.3
        );
      }
    }
  };

  // src/features/formation-skills/ufo/presentation.js
  var BEAM_POINTS = /* @__PURE__ */ new WeakMap();
  function beamPointsFor(effect) {
    let points = BEAM_POINTS.get(effect);
    if (!points) {
      points = [
        [0, 0, 0],
        [0, 0, 0]
      ];
      BEAM_POINTS.set(effect, points);
    }
    return points;
  }
  var UfoPresentation = class extends FormationPresentation {
    draw(renderer, effect) {
      const ENTER = Math.min(1, effect.age / 0.5), EXIT = Math.max(0, effect.age - 0.5 - effect.duration) / 0.5, Z = effect.z + (1 - ENTER) * (1 - ENTER) * 4 + EXIT * 4 + Math.sin(effect.age * 5) * 0.08, P = renderer.project(effect.x, effect.y, Z), BODY_RADIUS = Math.max(0.2, effect.bodyRadius || 0.3), BODY_SCALE = Math.max(1, BODY_RADIUS * 2.6), S = renderer.scale * BODY_SCALE * Math.max(0.08, ENTER) * (1 - Math.min(1, EXIT)), C = renderer.ctx;
      renderer.ellipse(P.x, P.y, S * 0.72, S * 0.19, "#718695");
      renderer.ellipse(P.x, P.y - S * 0.13, S * 0.34, S * 0.25, "#b9e6e2bb");
      renderer.ellipse(P.x, P.y + S * 0.12, S * 0.26, S * 0.065, "#a0f8e4");
      for (let i = 0; i < 5; i++) {
        renderer.ellipse(P.x + (i - 2) * S * 0.23, P.y + S * 0.04, S * 0.035, S * 0.025, "#e9f8b4");
      }
      const PULSE_AGE = effect.age - effect.lastPulse, CHARGING = effect.age > 0.3 && ENTER < 1;
      if (CHARGING || effect.age >= 0.5 && EXIT === 0) {
        renderer.ellipse(P.x, P.y + S * 0.15, S * (0.1 + 0.05 * Math.sin(effect.age * 12)), S * 0.07, "#afffeb88");
      }
      const BEAM_ACTIVE = effect.beamTarget === true && effect.age > 0.5 && EXIT === 0, PULSE_ACTIVE = PULSE_AGE >= 0 && PULSE_AGE < 0.13;
      if (BEAM_ACTIVE) {
        const POINTS = beamPointsFor(effect);
        POINTS[0][0] = effect.x;
        POINTS[0][1] = effect.y;
        POINTS[0][2] = Z - 0.15;
        POINTS[1][0] = effect.x;
        POINTS[1][1] = effect.y;
        POINTS[1][2] = effect.beamTargetZ;
        stroke(renderer, POINTS, "#74f5db44", 0.33);
        stroke(renderer, POINTS, "#afffe6cc", 0.11);
        stroke(renderer, POINTS, "#f4fff3", 0.035);
        if (PULSE_ACTIVE) {
          renderer.ring(effect.x, effect.y, 0.25 + PULSE_AGE * 2, "#bfffd7aa", 0.04);
        }
      }
      C.globalAlpha = 1;
    }
  };

  // src/features/formation-skills/storm-cloud/presentation.js
  var POINT_BUFFERS = /* @__PURE__ */ new WeakMap();
  function pointBuffersFor(effect) {
    let buffers = POINT_BUFFERS.get(effect);
    if (!buffers) {
      const POINT2 = () => [0, 0, 0];
      buffers = {
        arcs: Array.from({ length: 3 }, () => Array.from({ length: 13 }, POINT2)),
        intro: Array.from({ length: 4 }, POINT2),
        branches: Array.from({ length: 3 }, () => Array.from({ length: 3 }, POINT2))
      };
      POINT_BUFFERS.set(effect, buffers);
    }
    return buffers;
  }
  function visualOffset(effect, index, salt) {
    const VALUE = Math.sin(effect.id * 127.1 + effect.pulse * 311.7 + index * 74.7 + salt * 41.3) * 43758.5453;
    return (VALUE - Math.floor(VALUE)) * 2 - 1;
  }
  var StormCloudPresentation = class extends FormationPresentation {
    draw(renderer, effect) {
      const BODY_RADIUS = Math.max(0.2, effect.bodyRadius || 0.3), BODY_SCALE = Math.min(3.5, Math.max(1, BODY_RADIUS / 0.3)), CLOUD_SIZE = BODY_RADIUS * 4, ENTER = Math.min(1, effect.age / 0.5), EXIT = Math.max(0, effect.age - 0.5 - effect.duration) / 0.5, Z = effect.z + Math.sin(effect.age * 3) * Math.min(0.1, BODY_RADIUS * 0.12), SPREAD = (1 - ENTER + EXIT) * BODY_RADIUS * 2.6;
      for (let index = 0; index < 3; index++) {
        const ANGLE = index * Math.PI * 2 / 3;
        cloud(
          renderer,
          effect.x + Math.cos(ANGLE) * SPREAD,
          effect.y + Math.sin(ANGLE) * SPREAD,
          Z,
          CLOUD_SIZE,
          Math.max(0, 1 - EXIT) * Math.min(1, effect.age * 8)
        );
      }
      if (ENTER < 1 && effect.age > 0.15) {
        const INTRO_POINTS = pointBuffersFor(effect).intro;
        INTRO_POINTS[0][0] = effect.x - 0.3;
        INTRO_POINTS[0][1] = effect.y;
        INTRO_POINTS[0][2] = Z;
        INTRO_POINTS[1][0] = effect.x + 0.1;
        INTRO_POINTS[1][1] = effect.y;
        INTRO_POINTS[1][2] = Z + 0.1;
        INTRO_POINTS[2][0] = effect.x - 0.05;
        INTRO_POINTS[2][1] = effect.y;
        INTRO_POINTS[2][2] = Z - 0.1;
        INTRO_POINTS[3][0] = effect.x + 0.3;
        INTRO_POINTS[3][1] = effect.y;
        INTRO_POINTS[3][2] = Z;
        stroke(renderer, INTRO_POINTS, "#b7e8f0aa", 0.035);
      }
      if (effect.pulse > 0 && effect.age > 0.5 && EXIT === 0) {
        const BUFFERS = pointBuffersFor(effect), ARCS = BUFFERS.arcs, BRANCHES = BUFFERS.branches;
        for (let arcIndex = 0; arcIndex < ARCS.length; arcIndex++) {
          const POINTS = ARCS[arcIndex];
          for (let index = 0; index < POINTS.length; index++) {
            const T = index / (POINTS.length - 1), CURVE = Math.sin(T * Math.PI), SEED = arcIndex * 17, BEND = visualOffset(effect, index, SEED) * CURVE, SIDE = (arcIndex - 1) * BODY_RADIUS * 0.34 * CURVE, POINT2 = POINTS[index];
            POINT2[0] = effect.x + (effect.targetX - effect.x) * T + BEND * 0.55 + SIDE;
            POINT2[1] = effect.y + (effect.targetY - effect.y) * T + BEND * 0.22 - SIDE * 0.42;
            POINT2[2] = Z + (effect.targetZ - Z) * T + CURVE * (0.18 + BEND * 0.16);
          }
          const BRANCH = BRANCHES[arcIndex], ROOT_T = 0.3 + arcIndex * 0.18 + visualOffset(effect, arcIndex, 1) * 0.08, ROOT = POINTS[Math.round(ROOT_T * (POINTS.length - 1))], DX = visualOffset(effect, arcIndex, 2) * BODY_RADIUS * 2.4, DY = visualOffset(effect, arcIndex, 3) * BODY_RADIUS * 1.9;
          BRANCH[0][0] = ROOT[0];
          BRANCH[0][1] = ROOT[1];
          BRANCH[0][2] = ROOT[2];
          BRANCH[1][0] = ROOT[0] + DX * 0.55;
          BRANCH[1][1] = ROOT[1] + DY * 0.55;
          BRANCH[1][2] = ROOT[2] + BODY_RADIUS * 0.45;
          BRANCH[2][0] = ROOT[0] + DX;
          BRANCH[2][1] = ROOT[1] + DY;
          BRANCH[2][2] = ROOT[2] + BODY_RADIUS * 0.2;
          stroke(renderer, POINTS, "#408bff99", 0.3 * BODY_SCALE);
          stroke(renderer, POINTS, "#8bd4ff", 0.13 * BODY_SCALE);
          stroke(renderer, POINTS, "#f3fdff", 0.045 * BODY_SCALE);
          stroke(renderer, BRANCH, "#408bff88", 0.18 * BODY_SCALE);
          stroke(renderer, BRANCH, "#d9f5ff", 0.045 * BODY_SCALE);
        }
      }
    }
  };

  // src/formation-skill-presentations.js
  var PRESENTATIONS = /* @__PURE__ */ new Map([
    ["giant", new GiantPresentation()],
    ["lightning", new LightningPresentation()],
    ["meteor", new MeteorPresentation()],
    ["meteor-shower", new MeteorShowerPresentation()],
    ["copy", new CopyPresentation()],
    ["healing-rain", new HealingRainPresentation()],
    ["hammer", new HammerPresentation()],
    ["ufo", new UfoPresentation()],
    ["storm-cloud", new StormCloudPresentation()]
  ]);
  function drawFormationEffects(renderer, world) {
    for (const EFFECT of world.formationEffects || []) {
      PRESENTATIONS.get(EFFECT.kind)?.draw(renderer, EFFECT, world);
    }
  }

  // src/features/scenes/farm/presentation.js
  init_definition11();

  // src/features/farm-modes/presentation-base.js
  var CelebrationEffect = class {
    draw(renderer, effect, progress) {
      const COLOR = this.color;
      renderer.ring(effect.x, effect.y, this.radius(progress), COLOR, 0.07);
      for (let i = 0; i < 6; i++) {
        const A = i * Math.PI / 3 + progress * this.rotationSpeed, SPREAD = this.spread(progress), P = renderer.project(
          effect.x + Math.cos(A) * SPREAD,
          effect.y + Math.sin(A) * SPREAD,
          effect.z + progress * 0.9
        ), R2 = renderer.scale * 0.14;
        renderer.ctx.fillStyle = COLOR;
        this.drawParticle(renderer, P, R2);
      }
    }
  };

  // src/features/farm-modes/breed/presentation.js
  var BirthEffect = class extends CelebrationEffect {
    constructor() {
      super();
      this.color = "#df87a4";
      this.rotationSpeed = 0.3;
    }
    radius(progress) {
      return 0.35 + progress * 1.5;
    }
    spread(progress) {
      return 0.4 + progress * 1.3;
    }
    drawParticle(renderer, point2, radius) {
      const C = renderer.ctx, COLOR = this.color;
      renderer.ellipse(point2.x - radius * 0.44, point2.y - radius * 0.25, radius * 0.6, radius * 0.6, COLOR);
      renderer.ellipse(point2.x + radius * 0.44, point2.y - radius * 0.25, radius * 0.6, radius * 0.6, COLOR);
      C.beginPath();
      C.moveTo(point2.x - radius, point2.y);
      C.lineTo(point2.x, point2.y + radius);
      C.lineTo(point2.x + radius, point2.y);
      C.closePath();
      C.fill();
    }
  };

  // src/features/farm-modes/merge/presentation.js
  init_farm_model();
  function mergeHolePulse(renderer, task) {
    const PROGRESS = task.phase === "approach" ? CLAMP2(task.elapsed / task.duration, 0, 1) : 1, PULSE = 0.5 + 0.5 * Math.sin(renderer.displayTimeMs * 6e-3 + task.materialIds[0] * 0.17);
    return { progress: PROGRESS, pulse: PULSE, radius: renderer.scale * (0.2 + PULSE * 0.035 + PROGRESS * 0.055) };
  }
  function drawMergeBlackHoleBack(renderer, task) {
    const { pulse: PULSE, radius: RADIUS } = mergeHolePulse(renderer, task), CENTER = renderer.project(task.centerX, task.centerY, task.centerZ - 0.16);
    renderer.ellipse(CENTER.x, CENTER.y, RADIUS * 3.1, RADIUS * 1.8, "#9274d944");
    renderer.ellipse(CENTER.x, CENTER.y, RADIUS * 2.25, RADIUS * 1.35, "#7b58bd88");
    for (let index = 0; index < 2; index++) {
      const ANGLE = renderer.displayTimeMs * 4e-3 * (index ? -1 : 1) + index * Math.PI, POINT2 = renderer.project(
        task.centerX + Math.cos(ANGLE) * 0.43,
        task.centerY + Math.sin(ANGLE) * 0.32,
        task.centerZ - 0.12
      ), PARTICLE_RADIUS = renderer.scale * (0.035 + PULSE * 0.012);
      renderer.ellipse(POINT2.x, POINT2.y, PARTICLE_RADIUS, PARTICLE_RADIUS * 0.72, "#e0c4ff99");
    }
  }
  function drawMergeBlackHoleFront(renderer, task) {
    const { pulse: PULSE, radius: RADIUS } = mergeHolePulse(renderer, task), Z = task.centerZ + 0.32, CENTER = renderer.project(task.centerX, task.centerY, Z);
    renderer.ellipse(CENTER.x, CENTER.y, RADIUS * 1.55, RADIUS * 0.95, "#21182e");
    renderer.ellipse(CENTER.x, CENTER.y, RADIUS * 1.18, RADIUS * 0.7, "#100d18");
    for (let index = 0; index < 2; index++) {
      const ANGLE = renderer.displayTimeMs * 4e-3 * (index ? 1 : -1) + (index + 2) * Math.PI / 2, POINT2 = renderer.project(
        task.centerX + Math.cos(ANGLE) * 0.43,
        task.centerY + Math.sin(ANGLE) * 0.32,
        Z + 0.04
      ), PARTICLE_RADIUS = renderer.scale * (0.035 + PULSE * 0.012);
      renderer.ellipse(POINT2.x, POINT2.y, PARTICLE_RADIUS, PARTICLE_RADIUS * 0.72, "#e0c4ff");
    }
  }
  function drawMergeBlackHoles(renderer, world) {
    for (const TASK of world.mergeTasks) {
      if (!Number.isFinite(TASK.centerX) || !Number.isFinite(TASK.centerY) || !Number.isFinite(TASK.centerZ)) {
        continue;
      }
      const { pulse: PULSE } = mergeHolePulse(renderer, TASK), ID = Number.isFinite(TASK.materialIds?.[0]) ? TASK.materialIds[0] : 0, DEPTH = 0.785 * TASK.centerY - 0.62 * TASK.centerZ;
      renderer.strokeGroundEllipse(
        TASK.centerX,
        TASK.centerY,
        0.52 + PULSE * 0.08,
        0.4 + PULSE * 0.06,
        "#7650a888",
        0.04
      );
      renderer.addActor(renderer.mergeHoleBackPresentation, TASK, DEPTH + 0.62 * 0.16, -2e9 + ID);
      renderer.addActor(renderer.mergeHoleFrontPresentation, TASK, DEPTH - 0.62 * 0.32, 2e9 + ID);
    }
  }
  function mergeMaterialProgress(effect) {
    const DELAY = Number.isFinite(effect.delay) ? effect.delay : 0, SPAN = Number.isFinite(effect.span) ? effect.span : 1;
    if (effect.life < DELAY) {
      return null;
    }
    return Number.isFinite(effect.span) ? CLAMP2((effect.life - DELAY) / SPAN, 0, 1) : effect.life;
  }
  function mergeMaterialPosition(effect, progress) {
    const T = CLAMP2(progress, 0, 1);
    return {
      x: effect.x + (effect.targetX - effect.x) * T,
      y: effect.y + (effect.targetY - effect.y) * T,
      z: (effect.z || 0) + ((effect.targetZ ?? effect.z ?? 0) - (effect.z || 0)) * T
    };
  }
  var MergeEffect = class extends CelebrationEffect {
    constructor() {
      super();
      this.color = "#58b9bb";
      this.rotationSpeed = 2;
    }
    radius(progress) {
      return 1.8 * (1 - progress) + 0.15;
    }
    spread(progress) {
      return 1.8 * (1 - progress);
    }
    drawParticle(renderer, point2, radius) {
      const C = renderer.ctx;
      C.beginPath();
      C.moveTo(point2.x, point2.y - radius * 1.5);
      C.lineTo(point2.x + radius, point2.y);
      C.lineTo(point2.x, point2.y + radius * 1.5);
      C.lineTo(point2.x - radius, point2.y);
      C.closePath();
      C.fill();
    }
  };
  var MergeMaterialEffect = class {
    draw(renderer, effect, progress) {
      const E = effect, Q = progress;
      const T = CLAMP2(Q, 0, 1), POINT_POSITION = mergeMaterialPosition(E, T), START = renderer.project(E.x, E.y, E.z || 0), POINT2 = renderer.project(POINT_POSITION.x, POINT_POSITION.y, POINT_POSITION.z);
      renderer.line(START, POINT2, 0.045, `rgba(88,185,187,${0.2 + 0.65 * (1 - T)})`);
      renderer.ellipse(
        POINT2.x,
        POINT2.y,
        renderer.scale * 0.12 * (1 - 0.4 * T),
        renderer.scale * 0.09 * (1 - 0.4 * T),
        `rgba(88,185,187,${1 - 0.35 * T})`,
        T * Math.PI
      );
    }
  };

  // src/farm-render-effects.js
  init_presentation4();
  init_farm_model();
  var FeedEffect = class {
    draw(renderer, effect, progress) {
      const E = effect, Q = progress;
      renderer.ring(E.x, E.y, 0.15 + Q * 0.35, `rgba(166,121,59,${(1 - Q) * 0.6})`, 0.035);
    }
  };
  var FoodLandingEffect = class {
    draw(renderer, effect, progress) {
      const E = effect, Q = progress;
      const T = Math.min(1, Q / 0.35);
      renderer.ring(E.x, E.y, 0.1 + T * 0.42, `rgba(194,145,62,${(1 - T) * 0.85})`, 0.055);
      for (let i = 0; i < 3 && T < 1; i++) {
        const A = i * Math.PI * 2 / 3, P = renderer.project(
          E.x + Math.cos(A) * T * 0.4,
          E.y + Math.sin(A) * T * 0.4,
          0.08 + Math.sin(T * Math.PI) * 0.2
        );
        renderer.ellipse(P.x, P.y, renderer.scale * 0.045, renderer.scale * 0.035, `rgba(245,213,133,${1 - T})`);
      }
    }
  };
  var ImpactEffect = class {
    draw(renderer, effect, progress) {
      const E = effect, Q = progress;
      renderer.ring(E.x, E.y, 0.1 + Q * 0.8, `rgba(146,131,78,${(1 - Q) * 0.65})`);
    }
  };
  var ShockwaveEffect = class {
    draw(renderer, effect, progress) {
      const E = effect, Q = progress;
      const PROGRESS = CLAMP2(Q / (E.duration || 0.55), 0, 1), RADIUS = Math.max(0.08, E.radius) * (0.2 + 0.8 * PROGRESS);
      renderer.groundEllipse(E.x, E.y, RADIUS, RADIUS, `rgba(225,190,103,${0.12 * (1 - PROGRESS)})`);
      renderer.ring(E.x, E.y, RADIUS, `rgba(234,194,104,${0.82 * (1 - PROGRESS)})`, 0.12 * (1 - PROGRESS) + 0.025);
      renderer.ring(E.x, E.y, Math.max(0.05, RADIUS - 0.12), `rgba(250,225,158,${0.55 * (1 - PROGRESS)})`, 0.045);
    }
  };
  var DropDustEffect = class {
    draw(renderer, effect, progress) {
      const E = effect, Q = progress;
      const T = Math.min(1, Q / 0.28);
      renderer.ring(E.x, E.y, 0.12 + T * 0.4, `rgba(126,126,99,${(1 - T) * 0.42})`, 0.045);
      for (let i = 0; i < 4; i++) {
        const A = i * Math.PI / 2 + T * 0.35, P = renderer.project(
          E.x + Math.cos(A) * T * 0.33,
          E.y + Math.sin(A) * T * 0.22,
          0.025 + Math.sin(T * Math.PI) * 0.1
        );
        renderer.ellipse(P.x, P.y, renderer.scale * 0.045, renderer.scale * 0.03, `rgba(179,169,137,${1 - T})`);
      }
    }
  };
  var EatingEffect = class {
    draw(renderer, effect, progress) {
      const E = effect, Q = progress;
      for (let i = 0; i < 3; i++) {
        const A = i * Math.PI * 2 / 3, T = Math.min(1, Q / 0.45), P = renderer.project(E.x + Math.cos(A) * T * 0.35, E.y + Math.sin(A) * T * 0.35, E.z + T * 0.6);
        renderer.ellipse(
          P.x,
          P.y,
          renderer.scale * 0.05,
          renderer.scale * 0.075,
          `rgba(255,235,160,${Math.max(0, 1 - Q / 0.45)})`,
          A
        );
      }
    }
  };
  var IMPACT = new ImpactEffect();
  var SHOCKWAVE = new ShockwaveEffect();
  var PEANUT_SPLIT = new PeanutDeathSplitPresentation();
  var EFFECT_PRESENTATIONS = /* @__PURE__ */ new Map([
    ["formation-copy-death", new CopyDissolvePresentation()],
    ["feed", new FeedEffect()],
    ["food-land", new FoodLandingEffect()],
    ["land", IMPACT],
    ["impact", IMPACT],
    ["landing-shockwave", SHOCKWAVE],
    ["walnut-shockwave", SHOCKWAVE],
    ["peanut-split", PEANUT_SPLIT],
    ["drop-dust", new DropDustEffect()],
    ["merge-material", new MergeMaterialEffect()],
    ["birth", new BirthEffect()],
    ["merge", new MergeEffect()],
    ["eat", new EatingEffect()]
  ]);
  var JOY_EFFECTS = /* @__PURE__ */ new Set(["eat", "birth", "merge"]);
  function isJoyEffect(effect) {
    return effect.life < 0.85 && JOY_EFFECTS.has(effect.kind);
  }
  function drawEffect(renderer, effect) {
    const PRESENTATION = EFFECT_PRESENTATIONS.get(effect.kind);
    if (!PRESENTATION) {
      return;
    }
    const DELAY = Number.isFinite(effect.delay) ? effect.delay : 0, SPAN = Number.isFinite(effect.span) ? effect.span : 1;
    if (effect.life < DELAY) {
      return;
    }
    const PROGRESS = Number.isFinite(effect.span) ? CLAMP2((effect.life - DELAY) / SPAN, 0, 1) : effect.life;
    PRESENTATION.draw(renderer, effect, PROGRESS);
  }
  function disposeEffectPresentations(renderer) {
    for (const PRESENTATION of EFFECT_PRESENTATIONS.values()) {
      PRESENTATION.dispose?.(renderer);
    }
  }

  // src/features/scenes/farm/presentation.js
  var FarmScenePresentation = class {
    constructor() {
      this.id = FEATURE2.id;
      this.groundColor = "#d1d8b8";
      this.surfaceColor = "#d9dfc2";
      this.minimumUnitPixels = 11;
      this.hiddenMergeUnitIds = /* @__PURE__ */ new Set();
    }
    cameraView(aspect) {
      return aspect > 1.2 ? [Math.max(12, 9 * aspect), 9] : [11.7, 11.7 / aspect];
    }
    bossVisible(world) {
      return world.farmBossEvent?.phase !== "idle";
    }
    dangerVisible(world) {
      return world.farmBossEvent?.phase === "fighting";
    }
    drawMergeBlackHoles(renderer, world) {
      drawMergeBlackHoles(renderer, world);
    }
    hiddenUnitIds(world) {
      const IDS = this.hiddenMergeUnitIds;
      IDS.clear();
      for (const TASK of world.mergeTasks || []) {
        if (TASK.phase !== "approach" || !(TASK.duration > 0) || TASK.elapsed / TASK.duration < 0.82) {
          continue;
        }
        for (const UNIT3 of world.units) {
          if (!TASK.materialIds.includes(UNIT3.id)) {
            continue;
          }
          const BODY_HEIGHT = Number.isFinite(UNIT3.height) ? UNIT3.height : 0, BODY_RADIUS = Number.isFinite(UNIT3.radius) ? UNIT3.radius : 0, IN_APERTURE = Math.hypot(UNIT3.x - TASK.centerX, UNIT3.y - TASK.centerY) <= Math.max(0.55, BODY_RADIUS * 0.48), INSIDE_DEPTH = UNIT3.z >= TASK.centerZ - BODY_HEIGHT * 0.68 && UNIT3.z + BODY_HEIGHT >= TASK.centerZ + 0.12;
          if (IN_APERTURE && INSIDE_DEPTH) {
            IDS.add(UNIT3.id);
          }
        }
      }
      return IDS;
    }
    victorious() {
      return false;
    }
    unitMood(unit, joyEffects) {
      if (unit.cooldown > 0 && unit.ability?.phase === "idle") {
        return "neutral";
      }
      for (const EFFECT of joyEffects) {
        if (Math.hypot(EFFECT.x - unit.x, EFFECT.y - unit.y) < 1.2) {
          return "happy";
        }
      }
      return unit.fed ? "neutral" : "hungry";
    }
    collectJoy(world, joyEffects) {
      joyEffects.length = 0;
      for (const EFFECT of world.effects) {
        if (isJoyEffect(EFFECT)) {
          joyEffects.push(EFFECT);
        }
      }
    }
    collectFood(renderer, world) {
      for (const FOOD of world.food) {
        renderer.addActor(renderer.foodPresentation, FOOD, 0.785 * FOOD.y - 0.62 * FOOD.z, -1);
      }
    }
    drawBoundary() {
    }
  };

  // src/features/scenes/raid/presentation.js
  init_definition12();
  init_farm_model();
  var RaidScenePresentation = class {
    constructor() {
      this.id = FEATURE3.id;
      this.groundColor = "#cecfb3";
      this.surfaceColor = "#d7d8bf";
      this.minimumUnitPixels = 4.5;
    }
    cameraView(aspect) {
      return aspect > 1.2 ? [Math.max(26.5, 17 * aspect), 17] : [26.5, 26.5 / aspect];
    }
    bossVisible() {
      return true;
    }
    dangerVisible() {
      return true;
    }
    hiddenUnitId() {
      return 0;
    }
    victorious(world) {
      return world.encounter?.outcome === "victory";
    }
    unitMood() {
      return "neutral";
    }
    collectJoy(_world, joyEffects) {
      joyEffects.length = 0;
    }
    collectFood() {
    }
    drawBoundary(renderer) {
      renderer.strokeGroundEllipse(
        0,
        0,
        CONFIG.raid.arena.radiusX - 0.5,
        CONFIG.raid.arena.radiusY - 0.5,
        "#728e61a8",
        0.075
      );
    }
  };

  // src/farm-render-scenes.js
  var SCENE_PRESENTATIONS = new Map(
    [new FarmScenePresentation(), new RaidScenePresentation()].map((presentation) => [presentation.id, presentation])
  );
  function scenePresentation(scene) {
    const PRESENTATION = SCENE_PRESENTATIONS.get(scene);
    if (!PRESENTATION) {
      throw new Error("Missing scene presentation for " + scene);
    }
    return PRESENTATION;
  }

  // src/features/projectiles/seed/presentation.js
  init_definition10();
  var import_definition56 = __toESM(require_definition(), 1);
  var import_vector_sockets3 = __toESM(require_vector_sockets(), 1);
  function seedDisplayMultiplier(renderer, projectile) {
    const BODY2 = (0, import_definition56.unitBodyDefinition)(projectile.species), OWNER_VECTOR_SCALE = projectile.height * import_vector_sockets3.WORLD_HEIGHT_PROJECTION / (FEATURE.bodyHeightFraction * (BODY2.bounds.bottom - BODY2.bounds.top)), DISPLAY_SCALE = (0, import_definition56.unitDisplayScale)(
      BODY2,
      OWNER_VECTOR_SCALE,
      renderer.scale,
      renderer.scenePresentation.minimumUnitPixels * renderer.pixelRatio
    );
    return DISPLAY_SCALE / OWNER_VECTOR_SCALE;
  }
  var SeedProjectilePresentation = class {
    constructor() {
      this.id = FEATURE.id;
    }
    drawShadow(renderer, projectile) {
      const RADIUS = projectile.radius * seedDisplayMultiplier(renderer, projectile) / renderer.scale;
      renderer.groundEllipse(projectile.x, projectile.y, RADIUS, RADIUS * 5 / 7, "#55452433");
    }
    draw(renderer, projectile, point2, tail) {
      const RADII = seedEllipseRadii(projectile), SCALE = seedDisplayMultiplier(renderer, projectile), HEIGHT = projectile.height * import_vector_sockets3.WORLD_HEIGHT_PROJECTION * SCALE, P = { x: point2.x, y: point2.y - HEIGHT * 0.5 }, TAIL = renderer.project(tail.x, tail.y, tail.z), X = RADII.x * SCALE, Y = RADII.y * SCALE;
      TAIL.y -= HEIGHT * 0.5;
      renderer.line(TAIL, P, RADII.y * 0.35 * SCALE / renderer.scale, "#ba964a80");
      renderer.ellipse(P.x, P.y, X, Y, "#cfa957", FEATURE.rotation);
      renderer.ellipse(P.x - Y * 0.15, P.y - Y * 0.25, Y * 0.25, Y * 0.4, "#fff0ae");
    }
  };

  // src/features/projectiles/spike/presentation.js
  init_definition19();
  var SpikeProjectilePresentation = class {
    constructor() {
      this.id = FEATURE6.id;
    }
    drawShadow(renderer, projectile) {
      renderer.groundEllipse(projectile.x, projectile.y, 0.14, 0.1, "#55452433");
    }
    draw(renderer, projectile, point2, tail) {
      const F = projectile, P = point2, TAIL = tail;
      const ANGLE = Math.atan2(F.path.to.y - F.path.from.y, F.path.to.x - F.path.from.x), TIP = {
        x: P.x + Math.cos(ANGLE) * renderer.scale * 0.22,
        y: P.y - 0.62 * Math.sin(ANGLE) * renderer.scale * 0.22
      };
      renderer.line(renderer.project(TAIL.x, TAIL.y, TAIL.z), P, 0.055, "#778f4c88");
      renderer.line(P, TIP, 0.105, "#79964e");
      renderer.ellipse(TIP.x, TIP.y, renderer.scale * 0.045, renderer.scale * 0.035, "#d5df9d", ANGLE);
    }
  };

  // src/farm-render-items.js
  init_definition20();
  init_farm_model();
  var FoodPresentation = class {
    constructor(renderer) {
      this.renderer = renderer;
    }
    draw(f) {
      this.renderer.groundEllipse(f.x, f.y, 0.1, 0.07, "#55452433");
      if (f.phase === "flight") {
        const TAIL = this.renderer.project(
          f.x - f.vx * 0.045,
          f.y - f.vy * 0.045,
          Math.max(0, f.z - f.vz * 0.045) + 0.1
        ), HEAD = this.renderer.project(f.x, f.y, f.z + 0.1);
        this.renderer.line(TAIL, HEAD, 0.055, "#e6bd7480");
      }
      const P = this.renderer.project(f.x, f.y, f.z + 0.1);
      this.renderer.ellipse(P.x, P.y, this.renderer.scale * 0.09, this.renderer.scale * 0.12, "#c78a43", 0.4);
      this.renderer.ellipse(
        P.x - 0.025 * this.renderer.scale,
        P.y - 0.08 * this.renderer.scale,
        this.renderer.scale * 0.036,
        this.renderer.scale * 0.05,
        "#e7bf72"
      );
    }
  };
  var PROJECTILE_PRESENTATIONS = new Map(
    [new SeedProjectilePresentation(), new SpikeProjectilePresentation()].map((presentation) => [
      presentation.id,
      presentation
    ])
  );
  var ProjectilePresentation = class {
    constructor(renderer) {
      this.renderer = renderer;
    }
    draw(projectile) {
      const RENDERER2 = this.renderer, P = RENDERER2.project(projectile.x, projectile.y, projectile.z), TAIL = BALLISTICS.sample(
        projectile.path,
        Math.max(0, (projectile.elapsed - 0.04) / projectile.path.duration)
      );
      const PRESENTATION = PROJECTILE_PRESENTATIONS.get(projectileFeature(projectile).id);
      PRESENTATION.drawShadow(RENDERER2, projectile);
      PRESENTATION.draw(RENDERER2, projectile, P, TAIL);
    }
  };

  // src/farm-render-units.js
  var import_definition61 = __toESM(require_definition(), 1);
  init_presentation9();

  // src/features/unit-attacks/presentation-base.js
  var UnitAttackPresentation = class {
    activeMotion() {
      return "fire";
    }
    recoverMotion() {
      return "recover";
    }
  };

  // src/features/unit-attacks/lob/presentation.js
  init_definition17();
  var LobPresentation = class extends UnitAttackPresentation {
    constructor() {
      super();
      this.id = FEATURE4.id;
    }
    recoverMotion(unit) {
      return unit.ability?.action?.path && unit.ability.elapsed < 0.12 ? "fire" : "recover";
    }
  };

  // src/features/unit-attacks/dual-strike/presentation.js
  init_definition18();
  var DualStrikePresentation = class extends UnitAttackPresentation {
    constructor() {
      super();
      this.id = FEATURE5.id;
    }
    activeMotion(unit) {
      return unit.ability.peanutStrikeCount > 2 ? `fire-${unit.ability.peanutStrikeCount}` : "fire";
    }
  };

  // src/farm-render-units.js
  init_farm_model();

  // src/farm-indicators.js
  init_factions();
  function farmBreedingCooldown(unit, world, defaultDuration = 10, result = {}) {
    if (world?.scene !== "farm" || unit?.hp <= 0 || unit?.down > 0 || unit?.cooldown <= 0 || unit?.meals !== 0) {
      return null;
    }
    const DURATION3 = unit.cooldownDuration || world.breedCooldownDuration?.() || defaultDuration;
    const REMAINING = Math.max(0, unit.cooldown);
    result.remaining = REMAINING;
    result.duration = DURATION3;
    result.progress = Math.max(0, Math.min(1, 1 - REMAINING / DURATION3));
    return result;
  }
  function unitRestPresentation(unit, world, duration, result) {
    if (unit.faction !== FACTION_CONFIG.PLAYER || unit.isBattleOnlySummon || unit.hp > 0) {
      return null;
    }
    const RECOVERING = world.scene === "farm" && unit.down > 0;
    let elapsed = RECOVERING ? Math.max(0, duration - unit.down) : Infinity;
    if (!RECOVERING) {
      for (let i = world.notices.length - 1; i >= 0; i--) {
        const EVENT = world.notices[i];
        if (!Number.isFinite(EVENT.time)) {
          continue;
        }
        const AGE = world.time - EVENT.time;
        if (AGE >= 0.5) {
          break;
        }
        if (EVENT.kind === "unit-hit" && EVENT.unit === unit.id && AGE >= 0) {
          elapsed = AGE;
          break;
        }
      }
    }
    result.phase = elapsed < 0.5 ? "defeat" : RECOVERING && unit.down <= 0.5 ? "wake" : "sleep";
    result.elapsed = result.phase === "defeat" ? elapsed : result.phase === "wake" ? 0.5 - unit.down : RECOVERING ? elapsed - 0.5 : world.time;
    result.progress = RECOVERING ? Math.max(0, Math.min(1, 1 - unit.down / duration)) : -1;
    return result;
  }

  // src/farm-render-units.js
  init_unit_grades();
  var DEFAULT_ATTACK = new UnitAttackPresentation();
  var BARLEY_SHRED_PRESENTATION = new BarleyArmorShredPresentation();
  var ATTACK_PRESENTATIONS = new Map(
    [new DualStrikePresentation(), new LobPresentation()].map((presentation) => [presentation.id, presentation])
  );
  function unitAttackPresentation(unit) {
    return ATTACK_PRESENTATIONS.get(UNIT_ABILITY_PROFILES[unit.species]?.kind) || DEFAULT_ATTACK;
  }
  var TIER_OUTLINE_COLORS = UNIT_GRADES.map(({ outlineColor }) => {
    const RGB = outlineColor.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i).slice(1).map((value) => parseInt(value, 16) / 255);
    return [...RGB, 1];
  });
  function unitMotion(u, sim, rest) {
    const DEAD = u.hp <= 0 || u.down > 0, AIRBORNE = !u.dropLanded || u.z > 0.1, PHASE = u.ability?.phase || "idle";
    const MOVING = Math.hypot(u.vx || 0, u.vy || 0) > 0.18;
    if (rest) {
      return rest.phase;
    }
    if (DEAD) {
      return "death";
    }
    if (scenePresentation(sim.scene).victorious(sim)) {
      return "victory";
    }
    if (AIRBORNE) {
      return "airborne";
    }
    if (u.stun > 0) {
      return "hit";
    }
    if (u.bounce > 0.04) {
      return "landing";
    }
    if (PHASE === "windup") {
      return "windup";
    }
    if (PHASE === "active") {
      return unitAttackPresentation(u).activeMotion(u);
    }
    if (PHASE === "recover") {
      return unitAttackPresentation(u).recoverMotion(u);
    }
    return MOVING ? "walk" : "idle";
  }
  function motionElapsedMs(u, name, clip) {
    if (name === "idle" || name === "walk" || name === "airborne") {
      return (u.seed || 0) * 80 % clip.durationMs;
    }
    if (name === "windup" || name === "fire" || name.startsWith("fire-") || name === "recover") {
      return CLAMP2((u.ability?.elapsed || 0) * 1e3, 0, clip.durationMs);
    }
    if (name === "hit") {
      return clip.durationMs * (1 - CLAMP2((u.stun || 0) / 0.5, 0, 1));
    }
    if (name === "landing") {
      return clip.durationMs * (1 - CLAMP2((u.bounce || 0) / 0.22, 0, 1));
    }
    if (name === "victory") {
      return Math.abs(u.seed || 0) * 97.531 % clip.durationMs;
    }
    return clip.durationMs;
  }
  function unitExpression(u, sim, joyEffects, rest) {
    const DEAD = u.hp <= 0 || u.down > 0, AIRBORNE = !u.dropLanded || u.z > 0.5;
    const PHASE = u.ability?.phase;
    if (rest) {
      return rest.phase === "defeat" ? "dead" : rest.phase === "wake" ? "neutral" : "sleep";
    }
    if (DEAD) {
      return "dead";
    }
    if (scenePresentation(sim.scene).victorious(sim)) {
      return "happy";
    }
    if (u.stun > 0) {
      return "hurt";
    }
    if (AIRBORNE) {
      return "surprised";
    }
    if (u.walnutGuarding) {
      return "guard";
    }
    if (PHASE === "windup") {
      return "focused";
    }
    if (PHASE === "active") {
      return "attack";
    }
    return scenePresentation(sim.scene).unitMood(u, joyEffects);
  }
  var ATTACK_ACCENTS = ["#8fac68", "#dbb76b", "#b58b9c", "#9a6947", "#d7914f", "#a86b32"];
  var UnitPresentation = class {
    constructor(renderer) {
      this.renderer = renderer;
      this.unitRings = [];
      this.unitRingPool = [{}, {}, {}];
      this.breedingIndicator = {};
      this.restIndicator = {};
    }
    addUnitRing(radius, color, width, progress) {
      const EFFECT = this.unitRingPool[this.unitRings.length];
      EFFECT.radius = radius;
      EFFECT.color = color;
      EFFECT.width = width;
      EFFECT.progress = progress;
      this.unitRings.push(EFFECT);
    }
    unitRingEffects(u, world) {
      const EFFECTS = this.unitRings, A = u.ability, S_LOCAL = UNIT_ABILITY_PROFILES[u.species];
      EFFECTS.length = 0;
      if (u.buffed && u.hp > 0) {
        this.addUnitRing(u.radius + 0.16, "#eacb72", 0.055, 1);
      }
      if (A.phase === "windup" && S_LOCAL) {
        this.addUnitRing(
          u.radius + 0.1,
          ATTACK_ACCENTS[u.species] || ATTACK_ACCENTS[0],
          0.065,
          Math.min(1, A.elapsed / S_LOCAL.timing.windup)
        );
      }
      const BREEDING = farmBreedingCooldown(u, world, CONFIG.farm.breeding.cooldownSeconds, this.breedingIndicator);
      if (BREEDING && BREEDING.progress > 0) {
        this.addUnitRing(u.radius + 0.085, "#8fac68", 0.035, BREEDING.progress);
      }
      return EFFECTS;
    }
    drawUnitRingLayer(u, effects, side) {
      for (const EFFECT of effects) {
        const SWEEP = Math.PI * 2 * Math.max(0, Math.min(1, Number(EFFECT.progress) || 0));
        if (side === "rear" && SWEEP > 0) {
          this.renderer.ring(u.x, u.y, EFFECT.radius, EFFECT.color, EFFECT.width, 0, Math.min(Math.PI, SWEEP));
        } else if (side === "front" && SWEEP > Math.PI) {
          this.renderer.ring(u.x, u.y, EFFECT.radius, EFFECT.color, EFFECT.width, Math.PI, SWEEP);
        }
      }
    }
    drawSleepIndicator(rest, pose) {
      if (!rest || rest.phase === "defeat") {
        return;
      }
      const C = this.renderer.ctx, D = this.renderer.pixelRatio, P = pose.p, R2 = pose.r;
      if (rest.progress >= 0) {
        const W = Math.max(18 * D, Math.min(30 * D, R2 * 1.6)), H = 3 * D, X = P.x - W / 2, Y = P.y + R2 * 0.35 + 3 * D;
        C.fillStyle = "#494257";
        C.beginPath();
        C.roundRect(X - D, Y - D, W + 2 * D, H + 2 * D, 2.5 * D);
        C.fill();
        C.fillStyle = "#c2b2e8";
        C.beginPath();
        C.roundRect(X, Y, W * rest.progress, H, 1.5 * D);
        C.fill();
      }
      if (rest.phase === "sleep") {
        const SIZE = 2.4 * D, X = P.x + R2 * 0.9, Y = P.y - R2 * 0.9;
        C.strokeStyle = "#494257";
        C.lineWidth = 2.2 * D;
        C.lineCap = "round";
        C.beginPath();
        C.moveTo(X, Y - SIZE);
        C.lineTo(X + SIZE * 1.5, Y - SIZE);
        C.lineTo(X, Y + SIZE);
        C.lineTo(X + SIZE * 1.5, Y + SIZE);
        C.stroke();
        C.strokeStyle = "#ded3f5";
        C.lineWidth = D;
        C.stroke();
      }
    }
    drawVectorUnit(u, sim, p, r, rest) {
      const RECORD = this.renderer.vectorAssets.get(u.species);
      if (!RECORD) {
        throw new Error("Missing required troop vector asset for species " + u.species);
      }
      let player = this.renderer.vectorPlayers.get(u.id);
      if (player && this.renderer.vectorPlayerAssets.get(player) !== RECORD) {
        player.dispose();
        this.renderer.vectorPlayers.delete(u.id);
        player = null;
      }
      const METADATA = RECORD.compiled.metadata, MOTION_NAME = unitMotion(u, sim, rest), CLIP = METADATA.clips[MOTION_NAME] || METADATA.clips.idle;
      const CLIP_START_AT_MS = rest ? 0 : this.renderer.displayTimeMs - motionElapsedMs(u, MOTION_NAME, CLIP);
      if (!player) {
        player = RECORD.asset.createPlayer({
          clip: MOTION_NAME,
          startedAtMs: CLIP_START_AT_MS
        });
        this.renderer.vectorPlayers.set(u.id, player);
        this.renderer.vectorPlayerAssets.set(player, RECORD);
      } else if (player.currentClip !== MOTION_NAME) {
        player.play(MOTION_NAME, CLIP_START_AT_MS);
      }
      const ORIGINAL = u.isFormationClone && sim.time - u.cloneBornAt < 0.5 ? sim.units.find((unit) => unit.id === u.cloneParentId) : null, EXPRESSION = unitExpression(ORIGINAL || u, sim, this.renderer.joyEffects, rest);
      if (EXPRESSION !== player.currentExpression) {
        player.setExpression(EXPRESSION);
      }
      player.seek(rest ? rest.elapsed * 1e3 : this.renderer.displayTimeMs);
      const [, , WIDTH, HEIGHT] = RECORD.compiled.viewBox, GROUND = (0, import_definition61.unitBodyDefinition)(u.species).ground, SCALE = 2 * r / Math.max(WIDTH, HEIGHT), CENTER_Y = p.y + (HEIGHT * 0.5 - GROUND.y) * SCALE;
      const MATRIX = [SCALE, 0, 0, SCALE, p.x - GROUND.x * SCALE, p.y - GROUND.y * SCALE];
      this.renderer.ctx.vector.flush();
      const OUTLINE = TIER_OUTLINE_COLORS[u.tier - 1];
      if (OUTLINE) {
        const BORDER = 1.5 * this.renderer.pixelRatio, FACTOR = 1 + BORDER / Math.max(r, 1);
        const OUTLINE_MATRIX = [
          SCALE * FACTOR,
          0,
          0,
          SCALE * FACTOR,
          p.x - WIDTH * SCALE * FACTOR * 0.5,
          CENTER_Y - HEIGHT * SCALE * FACTOR * 0.5
        ];
        player.draw({
          projection: this.renderer.ctx.vector.projection,
          matrix: OUTLINE_MATRIX,
          color: u.isFormationClone ? [0.45, 0.75, 1, 0.35] : OUTLINE,
          forceColor: true,
          excludeParts: RECORD.faceParts
        });
      }
      player.draw({
        projection: this.renderer.ctx.vector.projection,
        matrix: MATRIX,
        alpha: u.isFormationClone ? 0.52 : 1,
        color: u.isFormationClone ? [0.55, 0.82, 1, 1] : [1, 1, 1, 1]
      });
      return true;
    }
    drawUnit(u, sim, rest) {
      const DEAD = u.hp <= 0, WALK = DEAD ? 0 : Math.min(1, Math.hypot(u.vx, u.vy)), BOB = u.z === 0 ? Math.abs(Math.sin(sim.time * 9 + u.seed)) * 0.1 * WALK : 0, P = this.renderer.project(
        u.x + (u.isFormationClone ? Math.min(1, (sim.time - u.cloneBornAt) / 0.5) * 0.35 : 0),
        u.y,
        u.z + BOB
      );
      const BODY2 = (0, import_definition61.unitBodyDefinition)(u.species), GIANT_SCALE = u.giantUntil > sim.time ? 3 : 1, SCALE = (0, import_definition61.unitDisplayScale)(
        BODY2,
        u.bodyScale,
        this.renderer.scale,
        this.renderer.scenePresentation.minimumUnitPixels * this.renderer.pixelRatio * GIANT_SCALE
      ), R2 = SCALE * Math.max(BODY2.viewBox[2], BODY2.viewBox[3]) * 0.5 * (1 + Math.sin((sim.time - u.giantEndedAt) * 30) * 0.12 * Math.max(0, 1 - (sim.time - u.giantEndedAt) / 0.35));
      this.drawVectorUnit(u, sim, P, R2, rest);
      return {
        p: P,
        r: R2
      };
    }
    draw(u, sim) {
      const EFFECTS = this.unitRingEffects(u, sim);
      this.drawUnitRingLayer(u, EFFECTS, "rear");
      const REST = unitRestPresentation(u, sim, CONFIG.unit.corpseRecoverySeconds, this.restIndicator);
      const POSE = this.drawUnit(u, sim, REST);
      this.drawUnitRingLayer(u, EFFECTS, "front");
      this.drawSleepIndicator(REST, POSE);
      BARLEY_SHRED_PRESENTATION.drawStatus(this.renderer, u, u.barleyArmorShredTotal || 0);
    }
  };

  // src/farm-renderer.js
  init_presentation6();
  var import_vector_sockets5 = __toESM(require_vector_sockets(), 1);
  init_boss_vector_sockets();

  // src/farm-render-boss.js
  var import_vector_sockets4 = __toESM(require_vector_sockets(), 1);
  init_farm_model();

  // src/features/boss-patterns/presentation-base.js
  init_farm_model();
  var EXTRA_PARTS = ["foot-left", "foot-right", "leaf", "kernel-mark", "hilum"];
  var POSE_PHASE_METHODS = { windup: "windup", active: "active", recover: "recover" };
  var BossAttackPose = class {
    reset(boss, parts, config, recoveryImpactSeconds) {
      this.parts = parts;
      this.config = config;
      this.elapsed = Math.max(0, boss.patternPhaseElapsed || 0);
      this.aim = Math.atan2(-0.62 * Math.sin(boss.patternAim ?? boss.angle), Math.cos(boss.patternAim ?? boss.angle));
      this.body = { y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
      this.arms = { "arm-left": 0, "arm-right": 0 };
      this.extras = {};
      for (const PART of EXTRA_PARTS) {
        if (parts.has(PART)) {
          this.extras[PART] = { x: 0, y: 0, rotation: 0 };
        }
      }
      this.active = boss.patternPhase === "active";
      this.recoverImpact = boss.patternPhase === "recover" && this.elapsed < recoveryImpactSeconds;
      this.impact = !!config && parts.has("body") && (this.active || this.recoverImpact);
      this.releasePulse = 0;
      const WIND = boss.patternPhase === "windup" && config ? CLAMP2(this.elapsed / config.windup, 0, 1) : 0, RECOVER = boss.patternPhase === "recover" && config ? CLAMP2(this.elapsed / config.recover, 0, 1) : 0;
      this.windEase = WIND * WIND * (3 - 2 * WIND);
      this.recoverEase = RECOVER * RECOVER * (3 - 2 * RECOVER);
      this.lead = Math.cos(this.aim) >= 0 ? "arm-right" : "arm-left";
      this.trail = this.lead === "arm-right" ? "arm-left" : "arm-right";
      this.strikeAngle = CLAMP2(this.aim, -1.2, 1.2);
    }
    arm(key, value) {
      if (this.parts.has(key)) {
        this.arms[key] = value;
      }
    }
    windup() {
      this.body.y = 4 * this.windEase;
      this.body.scaleX = 1 - 0.035 * this.windEase;
      this.body.scaleY = 1 + 0.06 * this.windEase;
      this.body.rotation = this.aim * 0.045 * this.windEase;
      this.arm(this.lead, -0.72 + this.strikeAngle * 0.22);
      this.arm(this.trail, 0.28 - this.strikeAngle * 0.12);
    }
    settle() {
      this.body.y = 3 * (1 - this.recoverEase);
      this.body.scaleX = 1 + 0.045 * (1 - this.recoverEase);
      this.body.scaleY = 1 - 0.065 * (1 - this.recoverEase);
      this.body.rotation = this.aim * 0.025 * (1 - this.recoverEase);
      this.arm(this.lead, 0.35 * (1 - this.recoverEase) + this.strikeAngle * 0.16);
      this.arm(this.trail, -0.12 * (1 - this.recoverEase));
    }
    strike() {
      this.body.y = -3;
      this.body.scaleX = 1.075;
      this.body.scaleY = 0.91;
      this.body.rotation = this.aim * 0.09;
      this.arm(this.lead, 0.95 + this.strikeAngle * 0.55);
      this.arm(this.trail, -0.42 - this.strikeAngle * 0.18);
    }
  };
  var BossAttackPresentation = class {
    constructor(feature, activeClip = "strike", recoveryClipSeconds = 0, recoveryImpactSeconds = 0) {
      this.id = feature?.id;
      this.config = feature?.config;
      this.activeClip = activeClip;
      this.recoveryClipSeconds = recoveryClipSeconds;
      this.recoveryImpactSeconds = recoveryImpactSeconds;
      this.summoning = false;
    }
    pose(boss, parts, scratch) {
      scratch.reset(boss, parts, this.config, this.recoveryImpactSeconds);
      if (this.config && parts.has("body")) {
        this[POSE_PHASE_METHODS[boss.patternPhase]]?.(boss, scratch);
      }
      return scratch;
    }
    windup(_boss, pose) {
      pose.windup();
    }
    active(_boss, pose) {
      pose.strike();
    }
    recover(_boss, pose) {
      pose.settle();
    }
    activeMotion() {
      return this.activeClip;
    }
    recoverMotion(boss) {
      return (boss.patternPhaseElapsed || 0) < this.recoveryClipSeconds ? this.activeClip : "recover";
    }
    play(instance, _metadata, _boss, clipName, startedAtMs) {
      if (instance.summoning || instance.player.currentClip !== clipName) {
        instance.player.transitionTo(clipName, startedAtMs, 70);
      }
      instance.summoning = false;
    }
    seek(player, displayTimeMs) {
      player.seek(displayTimeMs);
    }
    mouthOpen() {
      return false;
    }
    drawRelease() {
    }
    drawWeapon() {
    }
    drawTelegraph(renderer, area) {
      renderer.drawBossDanger(area);
    }
  };

  // src/features/boss-patterns/front-slam/presentation.js
  init_definition23();
  var FrontSlamPresentation = class extends BossAttackPresentation {
    constructor() {
      super(FEATURE9, "strike", 0.18, 0.14);
    }
    recover(boss, pose) {
      if (pose.recoverImpact) {
        this.active(boss, pose);
        return;
      }
      super.recover(boss, pose);
    }
  };

  // src/features/boss-patterns/sweep-360/presentation.js
  init_definition22();
  init_farm_model();
  var TAU2 = Math.PI * 2;
  var CircleSweepPresentation = class extends BossAttackPresentation {
    constructor() {
      super(FEATURE8, "sweep", 0.14, 0.14);
    }
    windup(boss, pose) {
      super.windup(boss, pose);
      pose.arm("arm-left", -0.72);
      pose.arm("arm-right", 0.72);
    }
    active(_boss, pose) {
      const Q = pose.recoverImpact ? 1 : CLAMP2(pose.elapsed / Math.max(this.config.active, 1e-3), 0, 1), SWEEP = TAU2 * Q, ARM_SWAY = Math.sin(SWEEP) * 0.48;
      pose.body.rotation = 0.06 * Math.sin(SWEEP);
      pose.arm("arm-left", -0.72 - ARM_SWAY);
      pose.arm("arm-right", 0.72 + ARM_SWAY);
    }
    recover(boss, pose) {
      if (pose.recoverImpact) {
        this.active(boss, pose);
        return;
      }
      super.recover(boss, pose);
    }
    drawTelegraph(renderer, area) {
      const CTX = renderer.ctx, ALPHA = CTX.globalAlpha, FADE = area.phase === "recover" ? Math.max(0, 1 - area.elapsed / 0.14) : 1, START = area.angle, END = START + Math.PI * 2 * CLAMP2(area.progress, 0, 1);
      if (!FADE) {
        return;
      }
      CTX.globalAlpha = ALPHA * FADE;
      renderer.ring(area.x, area.y, area.reach + area.width, "#b46c45", area.active ? 0.05 : 0.09);
      renderer.ring(area.x, area.y, area.reach - area.width, "#c59b7288", 0.045);
      renderer.ring(area.x, area.y, area.reach + area.width + 0.12, "#dfad65", 0.14, START, END);
      CTX.globalAlpha = ALPHA;
    }
    drawWeapon(renderer, boss, _player, _matrix, _pose) {
      if (boss.patternPhase !== "active") {
        return;
      }
      const Q = CLAMP2((boss.patternPhaseElapsed || 0) / Math.max(this.config.active, 1e-3), 0, 1), ANGLE = (boss.patternAim ?? boss.angle) - Math.PI / 2 + TAU2 * Q, TANGENT_X = -Math.sin(ANGLE) * this.config.width * 0.7, TANGENT_Y = Math.cos(ANGLE) * this.config.width * 0.7, RADIUS_X = Math.cos(ANGLE) * this.config.reach, RADIUS_Y = Math.sin(ANGLE) * this.config.reach, FROM = renderer.project(boss.x + RADIUS_X - TANGENT_X, boss.y + RADIUS_Y - TANGENT_Y, (boss.z || 0) + 0.2), TO = renderer.project(boss.x + RADIUS_X + TANGENT_X, boss.y + RADIUS_Y + TANGENT_Y, (boss.z || 0) + 0.2);
      renderer.ctx.flush();
      renderer.line(FROM, TO, 0.2, "#68463299");
      renderer.line(FROM, TO, 0.085, "#f0c77c");
    }
  };

  // src/features/boss-patterns/charge/presentation.js
  init_definition24();
  var ChargePresentation = class extends BossAttackPresentation {
    constructor() {
      super(FEATURE10, "walk");
    }
    active(boss, pose) {
      const STRIDE = Math.sin((boss.patternTraveled || 0) * 3.1), LIFT = Math.max(0, STRIDE);
      pose.body.y = -1.5 - Math.abs(STRIDE) * 1.2;
      pose.body.scaleX = 1.055;
      pose.body.scaleY = 0.965;
      pose.body.rotation = pose.aim * 0.11;
      pose.arm(pose.lead, -0.72 + pose.strikeAngle * 0.3 + STRIDE * 0.12);
      pose.arm(pose.trail, 0.46 - STRIDE * 0.18);
      pose.extras["foot-left"] = { x: -STRIDE * 4, y: -LIFT * 5, rotation: -STRIDE * 0.12 };
      pose.extras["foot-right"] = { x: STRIDE * 4, y: -Math.max(0, -STRIDE) * 5, rotation: STRIDE * 0.12 };
      if (pose.parts.has("leaf")) {
        pose.extras.leaf = { rotation: STRIDE * 0.14 };
      }
    }
    pose(boss, parts, scratch) {
      const POSE = super.pose(boss, parts, scratch);
      if (this.config && parts.has("body")) {
        const ROTATION = POSE.active ? 0.08 * Math.sin((boss.patternTraveled || 0) * 3.1) : 0;
        for (const PART of ["kernel-mark", "hilum"]) {
          if (parts.has(PART)) {
            POSE.extras[PART] = { rotation: ROTATION };
          }
        }
      }
      return POSE;
    }
  };

  // src/features/boss-patterns/leap-slam/presentation.js
  init_definition25();
  init_farm_model();
  var LeapSlamPresentation = class extends BossAttackPresentation {
    constructor() {
      super(FEATURE11, "strike", 0.18, 0.18);
    }
    activeMotion(boss) {
      return boss.z > 0.1 ? "airborne" : "strike";
    }
    windup(boss, pose) {
      super.windup(boss, pose);
      pose.body.y = 5 * pose.windEase;
      pose.body.scaleX = 1 - 0.05 * pose.windEase;
      pose.body.scaleY = 1 + 0.09 * pose.windEase;
      pose.arm(pose.lead, -0.9);
      pose.arm(pose.trail, -0.45);
    }
    active(boss, pose) {
      const LIFT = CLAMP2((boss.z || 0) / Math.max(1, boss.height || 1), 0, 1);
      pose.body.rotation = pose.aim * 0.06;
      pose.body.scaleX = 1 + 0.045 * LIFT;
      pose.body.scaleY = 1 - 0.035 * LIFT;
      pose.arm("arm-left", -0.28);
      pose.arm("arm-right", 0.28);
      pose.extras["foot-left"] = { y: -4 * LIFT, rotation: -0.08 * LIFT };
      pose.extras["foot-right"] = { y: -4 * LIFT, rotation: 0.08 * LIFT };
      if (pose.parts.has("leaf")) {
        pose.extras.leaf = { rotation: -0.12 * LIFT };
      }
    }
    recover(boss, pose) {
      if (!pose.recoverImpact) {
        super.recover(boss, pose);
        return;
      }
      pose.body.y = 5;
      pose.body.scaleX = 1.12;
      pose.body.scaleY = 0.8;
      pose.body.rotation = pose.aim * 0.08;
      pose.arm("arm-left", -0.65);
      pose.arm("arm-right", 0.65);
      pose.extras["foot-left"] = { x: -5, y: 2, rotation: -0.14 };
      pose.extras["foot-right"] = { x: 5, y: 2, rotation: 0.14 };
    }
  };

  // src/features/boss-patterns/fan-sweep/presentation.js
  init_definition26();
  init_farm_model();
  var FanSweepPresentation = class extends BossAttackPresentation {
    constructor() {
      super(FEATURE12, "sweep", 0.12);
    }
    active(_boss, pose) {
      const Q = CLAMP2(pose.elapsed / this.config.active, 0, 1), ARC = pose.aim - this.config.sector / 2 + this.config.sector * Q, PROJECTED = Math.atan2(-0.62 * Math.sin(ARC), Math.cos(ARC));
      pose.body.rotation = 0.1 * Math.sin(PROJECTED - pose.aim);
      pose.body.scaleX = 1.035;
      pose.body.scaleY = 0.97;
      pose.arm(pose.lead, 0.4 + CLAMP2(PROJECTED, -1.1, 1.1) * 0.58);
      pose.arm(pose.trail, -0.3 - CLAMP2(PROJECTED, -1.1, 1.1) * 0.2);
      if (pose.parts.has("leaf")) {
        pose.extras.leaf = { rotation: 0.12 * Math.sin(Q * Math.PI) };
      }
    }
    recover(boss, pose) {
      if (pose.elapsed >= 0.12) {
        super.recover(boss, pose);
        return;
      }
      const ARC = pose.aim + this.config.sector / 2, PROJECTED = Math.atan2(-0.62 * Math.sin(ARC), Math.cos(ARC));
      pose.body.rotation = 0.08 * Math.sin(PROJECTED - pose.aim);
      pose.body.scaleX = 1.05;
      pose.arm(pose.lead, 0.4 + PROJECTED * 0.5);
    }
  };

  // src/features/boss-patterns/mouth-summon/presentation.js
  init_definition27();
  init_boss_vector_sockets();
  var MouthSummonPresentation = class extends BossAttackPresentation {
    constructor() {
      super(FEATURE13, "fire");
      this.summoning = true;
    }
    pose(boss, parts, scratch) {
      if (!parts.has("body")) {
        return super.pose(boss, parts, scratch);
      }
      return bossSummonPose(boss, parts);
    }
    play(instance, metadata, boss) {
      sampleBossSummon(instance.player, metadata, boss);
      instance.summoning = true;
    }
    seek() {
    }
    mouthOpen(boss) {
      return boss.patternPhase === "active" || boss.patternPhase === "windup" && boss.patternPhaseElapsed >= this.config.windup * 0.5;
    }
    drawRelease(renderer, boss, pose, mouth) {
      if (!(boss.patternReleased > 0 && pose.releasePulse > 0 && mouth)) {
        return;
      }
      renderer.ctx.flush();
      const PULSE = 0.55 + 0.45 * pose.releasePulse, TARGET = Math.atan2(-0.62 * Math.sin(boss.patternAim), Math.cos(boss.patternAim));
      renderer.ellipse(
        mouth.x,
        mouth.y,
        renderer.scale * 0.18 * PULSE,
        renderer.scale * 0.12 * PULSE,
        "rgba(255,210,113,.72)"
      );
      renderer.ellipse(
        mouth.x + Math.cos(TARGET) * renderer.scale * 0.16,
        mouth.y + Math.sin(TARGET) * renderer.scale * 0.1,
        renderer.scale * 0.065,
        renderer.scale * 0.08,
        "#fff1ad"
      );
    }
    drawTelegraph(renderer, area) {
      const REACH = this.config.landingRadius, X = area.x + Math.cos(area.angle) * REACH, Y = area.y + Math.sin(area.angle) * REACH;
      renderer.strokeGroundEllipse(X, Y, 0.65, 0.48, "#bd915d", 0.085);
      renderer.ring(X, Y, 0.28, "#f1d391", 0.045, 0, Math.PI * 1.8);
    }
  };

  // src/farm-render-boss.js
  init_presentation9();
  var IDLE_PRESENTATION = new BossAttackPresentation();
  var BARLEY_SHRED_PRESENTATION2 = new BarleyArmorShredPresentation();
  var BOSS_PRESENTATIONS = new Map(
    [
      new FrontSlamPresentation(),
      new CircleSweepPresentation(),
      new ChargePresentation(),
      new LeapSlamPresentation(),
      new FanSweepPresentation(),
      new MouthSummonPresentation()
    ].map((presentation) => [presentation.id, presentation])
  );
  function bossAttackPresentation(boss) {
    return BOSS_PRESENTATIONS.get(boss.patternId) || IDLE_PRESENTATION;
  }
  var BossPresentation = class {
    constructor(renderer) {
      this.renderer = renderer;
      this.bossAttackPose = new BossAttackPose();
    }
    bossPose(world) {
      const B = world.boss, K = bossAttackPresentation(B).summoning ? {
        x: 0,
        y: 0,
        squash: 0
      } : this.renderer.feel?.boss(this.renderer.displayTimeMs) || {
        x: 0,
        y: 0,
        squash: 0
      }, GROUND = this.renderer.project(B.x + K.x, B.y + K.y, 0), P = this.renderer.project(B.x + K.x, B.y + K.y, B.z || 0), R2 = this.renderer.scale * B.radius * 1.16;
      return {
        b: B,
        p: P,
        ground: GROUND,
        r: R2,
        k: K
      };
    }
    bossMotion(b, world) {
      const EVENT = world.farmBossEvent;
      if (EVENT?.phase === "celebrating" && EVENT.outcome === "defeat") {
        return "idle";
      }
      if (b.hp <= 0) {
        return "death";
      }
      if (b.flash > 0.09 && b.patternPhase === "idle") {
        return "hit";
      }
      if (b.patternPhase === "windup") {
        return "windup";
      }
      const PRESENTATION = bossAttackPresentation(b);
      if (b.patternPhase === "active") {
        return PRESENTATION.activeMotion(b);
      }
      if (b.patternPhase === "recover") {
        return PRESENTATION.recoverMotion(b);
      }
      return b.phase === "chase" ? "walk" : "idle";
    }
    draw(_source, world) {
      const { b: B, p: P, k: K } = this.bossPose(world), EVENT = world.farmBossEvent, SPECIES = B.species, PRESENTATION = bossAttackPresentation(B);
      const RECORD = this.renderer.bossSpeciesAssets.get(SPECIES);
      if (!RECORD) {
        throw new Error("Missing required boss vector asset for species " + SPECIES);
      }
      let instance = this.renderer.bossPlayers.get(SPECIES);
      if (!instance) {
        const PLAYER2 = RECORD.asset.createPlayer({
          clip: "idle",
          startedAtMs: this.renderer.displayTimeMs
        });
        instance = {
          record: RECORD,
          player: PLAYER2
        };
        this.renderer.bossPlayers.set(SPECIES, instance);
      }
      const PLAYER = instance.player;
      this.renderer.bossPlayer = PLAYER;
      this.renderer.bossPlayerAsset = RECORD;
      const METADATA = RECORD.compiled.metadata, NAME = this.bossMotion(B, world), FALLBACK_CLIP = NAME === "airborne" ? METADATA.clips.strike ? "strike" : METADATA.clips.fire ? "fire" : "idle" : ["strike", "sweep", "fire"].includes(NAME) && !METADATA.clips[NAME] ? METADATA.clips.fire ? "fire" : "idle" : "idle", CLIP_NAME = METADATA.clips[NAME] ? NAME : FALLBACK_CLIP, CLIP = METADATA.clips[CLIP_NAME];
      const TIMED = ["windup", "strike", "sweep", "recover", "hit", "death", "fire", "airborne"].includes(NAME), ELAPSED = B.patternId ? B.patternPhaseElapsed : B.clock;
      const CLIP_START_AT_MS = TIMED ? this.renderer.displayTimeMs - Math.min(CLIP.durationMs, Math.max(0, ELAPSED || 0) * 1e3) : NAME === "walk" ? this.renderer.displayTimeMs - Math.max(0, B.travel || 0) * 110 : this.renderer.displayTimeMs - (B.travel || 0) * 37 % CLIP.durationMs;
      PRESENTATION.play(instance, METADATA, B, CLIP_NAME, CLIP_START_AT_MS);
      const SUMMON_OPEN = PRESENTATION.mouthOpen(B);
      const EXPRESSION = B.hp <= 0 ? "dead" : EVENT?.phase === "celebrating" && EVENT.outcome === "defeat" ? "happy" : SUMMON_OPEN ? "attack" : B.patternPhase === "windup" ? "focused" : B.patternPhase === "active" ? "attack" : B.flash > 0.07 ? "hurt" : "neutral";
      if (!METADATA.expressions?.[EXPRESSION] && !METADATA.expressions?.neutral) {
        throw new Error("Boss asset is missing a supported expression");
      }
      const SAFE_EXPRESSION = METADATA.expressions?.[EXPRESSION] ? EXPRESSION : "neutral";
      if (PLAYER.currentExpression !== SAFE_EXPRESSION) {
        PLAYER.setExpression(SAFE_EXPRESSION);
      }
      PRESENTATION.seek(PLAYER, this.renderer.displayTimeMs);
      const S_LOCAL = this.renderer.scale * (0, import_vector_sockets4.bossVectorScale)(B.radius), GROUND = RECORD.anchors.ground, MATRIX = [S_LOCAL, 0, 0, S_LOCAL, P.x - GROUND.x * S_LOCAL, P.y - GROUND.y * S_LOCAL];
      const DEFEAT_BOUNCE = EVENT?.phase === "celebrating" && EVENT.outcome === "defeat" ? Math.max(0, Math.sin(EVENT.elapsed * Math.PI * 2 / CONFIG.farm.bossEvent.celebrationSeconds * 2)) : 0;
      const FADE = EVENT?.phase === "fading" ? CLAMP2(1 - EVENT.elapsed / CONFIG.farm.bossEvent.fadeSeconds, 0, 1) : 1;
      const PARTS = RECORD.parts, POSE = PRESENTATION.pose(B, PARTS, this.bossAttackPose);
      PLAYER.setBasePose("body", {
        x: 0,
        y: POSE.body.y - 18 * DEFEAT_BOUNCE,
        rotation: POSE.body.rotation,
        scaleX: POSE.body.scaleX * (1 + (K.squash || 0)) * (1 - 0.04 * DEFEAT_BOUNCE),
        scaleY: POSE.body.scaleY * (1 - (K.squash || 0)) * (1 + 0.06 * DEFEAT_BOUNCE),
        opacity: FADE
      });
      for (const [PART, ROTATION] of Object.entries(POSE.arms)) {
        if (PARTS.has(PART)) {
          PLAYER.setBasePose(PART, {
            rotation: ROTATION
          });
        }
      }
      for (const [PART, PART_POSE] of Object.entries(POSE.extras)) {
        if (PARTS.has(PART)) {
          PLAYER.setBasePose(PART, PART_POSE);
        }
      }
      const MOUTH_SOCKET = PLAYER.getSocket("mouth"), MOUTH_SCREEN = {
        x: MOUTH_SOCKET.x * S_LOCAL + MATRIX[4],
        y: MOUTH_SOCKET.y * S_LOCAL + MATRIX[5]
      };
      this.renderer.ctx.vector.flush();
      PLAYER.draw({
        projection: this.renderer.ctx.vector.projection,
        matrix: MATRIX
      });
      PRESENTATION.drawRelease(this.renderer, B, POSE, MOUTH_SCREEN);
      PRESENTATION.drawWeapon(this.renderer, B, PLAYER, MATRIX, POSE, RECORD);
      BARLEY_SHRED_PRESENTATION2.drawStatus(this.renderer, B, B.barleyArmorShredTotal || 0);
    }
  };

  // src/farm-renderer.js
  init_farm_model();

  // src/attack-telegraph.js
  var TAU3 = Math.PI * 2;
  var ARC_STEP = Math.PI / 36;
  function point(out, count, x, y) {
    out[count * 2] = x;
    out[count * 2 + 1] = y;
    return count + 1;
  }
  function arc(out, count, x, y, r, start2, end) {
    const SEGMENTS = Math.max(1, Math.ceil(Math.abs(end - start2) / ARC_STEP));
    for (let i = 0; i <= SEGMENTS; i++) {
      const A = start2 + (end - start2) * i / SEGMENTS;
      count = point(out, count, x + Math.cos(A) * r, y + Math.sin(A) * r);
    }
    return count;
  }
  function bodyLandingContour(out, x, y, endX, endY, r, landingRadius) {
    const DX = endX - x, DY = endY - y, D = Math.hypot(DX, DY), ANGLE = Math.atan2(DY, DX), R2 = Math.max(r, landingRadius);
    if (D <= R2 - r + 1e-9) {
      return arc(out, 0, endX, endY, R2, 0, TAU3);
    }
    const JOIN = Math.sqrt(Math.max(0, R2 * R2 - r * r));
    let n = 0;
    if (D >= JOIN) {
      const A = Math.acos(-JOIN / R2);
      n = arc(out, n, x, y, r, ANGLE - Math.PI / 2, ANGLE - Math.PI * 1.5);
      n = arc(out, n, endX, endY, R2, ANGLE + A, ANGLE - A);
    } else {
      const CROSS = (r * r - R2 * R2 + D * D) / (2 * D), HEIGHT = Math.sqrt(Math.max(0, r * r - CROSS * CROSS));
      const SMALL = Math.atan2(HEIGHT, CROSS), LARGE = Math.atan2(HEIGHT, CROSS - D);
      n = arc(out, n, x, y, r, ANGLE - SMALL, ANGLE + SMALL - TAU3);
      n = arc(out, n, endX, endY, R2, ANGLE + LARGE, ANGLE - LARGE);
    }
    return n;
  }
  function bossDangerContour(area, out) {
    let n = 0;
    if (area.kind === "sweep") {
      const OUTER = area.reach + area.width, INNER = Math.max(0, area.reach - area.width);
      n = arc(out, 0, area.x, area.y, OUTER, 0, TAU3);
      return arc(out, n, area.x, area.y, INNER, TAU3, 0);
    }
    if (area.kind === "sector") {
      n = point(out, n, area.x, area.y);
      return arc(out, n, area.x, area.y, area.reach, area.angle - area.sector / 2, area.angle + area.sector / 2);
    }
    if (area.kind === "charge") {
      return bodyLandingContour(out, area.x, area.y, area.endX, area.endY, area.width, area.width);
    }
    if (area.kind === "leap") {
      return bodyLandingContour(out, area.x, area.y, area.targetX, area.targetY, area.width, area.reach);
    }
    if (area.kind === "fan") {
      const START = area.angle - area.sector / 2, END = area.angle + area.sector / 2, R_LOCAL = area.reach, W = area.width;
      n = arc(out, n, area.x, area.y, R_LOCAL + W, START, END);
      n = arc(out, n, area.x + Math.cos(END) * R_LOCAL, area.y + Math.sin(END) * R_LOCAL, W, END, END + Math.PI);
      n = arc(out, n, area.x, area.y, Math.max(0, R_LOCAL - W), END, START);
      return arc(
        out,
        n,
        area.x + Math.cos(START) * R_LOCAL,
        area.y + Math.sin(START) * R_LOCAL,
        W,
        START + Math.PI,
        START + TAU3
      );
    }
    return 0;
  }

  // src/farm-renderer.js
  var { bosses: BOSS_VECTOR_ASSETS, troops: TROOP_VECTOR_ASSETS } = globalThis.BudmoriVectorResources;
  var {
    WebGLDevice: WEB_GL_DEVICE,
    VectorContext: VECTOR_CONTEXT,
    MeshRenderer: MESH_RENDERER
  } = globalThis.BloomGamekitRendering;
  var { createVectorAsset: CREATE_VECTOR_ASSET } = globalThis.BloomGamekitVectorAssets;
  function renderedBossAttackArea(boss, scene, scratch, area) {
    if (!boss?.patternId || boss.hp <= 0 || boss.patternPhase === "recover" && (boss.patternPhaseElapsed || 0) >= 0.14) {
      return null;
    }
    const ACTION = scratch.patternRuntime.active;
    scratch.x = boss.x;
    scratch.y = boss.y;
    scratch.z = boss.z;
    scratch.angle = boss.angle;
    scratch.radius = boss.radius;
    scratch.height = boss.height;
    ACTION.id = boss.patternId;
    ACTION.phase = boss.patternPhase;
    ACTION.phaseElapsed = boss.patternPhaseElapsed;
    ACTION.aim = boss.patternAim;
    ACTION.locked = boss.patternLocked;
    ACTION.start.x = boss.patternStartX;
    ACTION.start.y = boss.patternStartY;
    ACTION.start.z = boss.patternStartZ;
    ACTION.target.x = boss.patternTargetX;
    ACTION.target.y = boss.patternTargetY;
    ACTION.target.z = boss.patternTargetZ;
    return bossAttackArea(scratch, 0, scene, area);
  }
  var COMPARE_ACTORS = (a, b) => b.depth - a.depth || a.id - b.id;
  var EMPTY_UNIT_IDS = /* @__PURE__ */ new Set();
  var CORN_ATTACHMENT_PRESENTATION = new CornAttachmentPresentation();
  var DIORAMA = class Diorama {
    constructor(canvas) {
      this.canvas = canvas;
      this.device = new WEB_GL_DEVICE(canvas, {
        alpha: false,
        depth: false,
        stencil: false,
        antialias: true
      });
      this.ctx = new VECTOR_CONTEXT(this.device);
      this.vectorAssets = /* @__PURE__ */ new Map();
      this.vectorPlayers = /* @__PURE__ */ new Map();
      this.vectorPlayerAssets = /* @__PURE__ */ new WeakMap();
      this.actors = [];
      this.actorPool = [];
      this.liveUnitIds = /* @__PURE__ */ new Set();
      this.joyEffects = [];
      this.unitPresentation = new UnitPresentation(this);
      this.mergeHoleBackPresentation = { draw: (task) => drawMergeBlackHoleBack(this, task) };
      this.mergeHoleFrontPresentation = { draw: (task) => drawMergeBlackHoleFront(this, task) };
      this.mergeMaterialPresentation = { draw: (effect) => drawEffect(this, effect) };
      this.foodPresentation = new FoodPresentation(this);
      this.projectilePresentation = new ProjectilePresentation(this);
      this.dangerContour = new Float64Array(512);
      this.dangerArea = {};
      this.telegraphBoss = {
        patternRuntime: {
          active: {
            start: {},
            target: {}
          }
        }
      };
      const ENTRIES = Object.entries(TROOP_VECTOR_ASSETS);
      if (ENTRIES.length !== CONFIG.unit.speciesCount || ENTRIES.some(([species], index) => Number(species) !== index) || typeof CREATE_VECTOR_ASSET !== "function") {
        throw new Error("All pinned GameKit troop and vector-assets sources are required");
      }
      this.meshes = new MESH_RENDERER(this.device);
      this.ctx.meshRenderer = this.meshes;
      for (const [SPECIES, COMPILED] of ENTRIES) {
        const FACE_PARTS = new Set(
          COMPILED.metadata.parts.filter((part) => part.id.startsWith("face-")).map((part) => part.id)
        );
        this.vectorAssets.set(Number(SPECIES), {
          compiled: COMPILED,
          asset: CREATE_VECTOR_ASSET(this.meshes, COMPILED),
          anchors: (0, import_vector_sockets5.readVectorSockets)(COMPILED, `species ${SPECIES}, ${COMPILED.sourcePath}`),
          parts: new Set(COMPILED.metadata.parts.map((part) => part.id)),
          faceParts: FACE_PARTS
        });
      }
      this.bossAssets = new Map(
        Object.entries(BOSS_VECTOR_ASSETS).map(([id, compiled]) => [
          id,
          {
            compiled,
            asset: CREATE_VECTOR_ASSET(this.meshes, compiled),
            parts: new Set(compiled.metadata.parts.map((part) => part.id))
          }
        ])
      );
      this.bossSpeciesAssets = /* @__PURE__ */ new Map();
      for (const SPECIES of this.vectorAssets.keys()) {
        const RECORD = this.bossAssets.get(SPECIES === 3 ? "chestnut" : `species-${SPECIES}`);
        if (!RECORD) {
          throw new Error("Missing required boss vector asset for species " + SPECIES);
        }
        RECORD.anchors = bindBossSocketAsset(SPECIES, RECORD);
        this.bossSpeciesAssets.set(SPECIES, RECORD);
      }
      this.bossPlayer = null;
      this.bossPlayerAsset = null;
      this.bossPlayers = /* @__PURE__ */ new Map();
      this.assetsReady = false;
      this.prewarmStats = null;
      this.prewarmDurationMs = 0;
      this.bossTelegraph = null;
      this.bossPresentation = new BossPresentation(this);
      this.ctx.isBloomWebGL = true;
      this.canvas.dataset.rendererBackend = "Budmori authored 2.5D vectors";
      this.resize();
      const BOSS2 = this.bossAssets.get("chestnut");
      if (!BOSS2) {
        throw new Error("Pinned chestnut boss vector asset is required");
      }
      const PREWARM_AT = performance.now();
      this.bossPlayer = BOSS2.asset.createPlayer({
        clip: "idle",
        startedAtMs: 0
      });
      this.bossPlayerAsset = BOSS2;
      this.bossPlayers.set(3, {
        record: BOSS2,
        player: this.bossPlayer
      });
      this.ctx.beginFrame({
        width: this.canvas.width,
        height: this.canvas.height,
        clearColor: [0.9, 0.92, 0.87, 1]
      });
      this.bossPlayer.draw({
        projection: this.ctx.vector.projection,
        matrix: [1e-3, 0, 0, 1e-3, 100, 100]
      });
      this.prewarmStats = this.ctx.endFrame();
      this.prewarmDurationMs = performance.now() - PREWARM_AT;
      this.assetsReady = true;
    }
    resize() {
      const R2 = this.canvas.getBoundingClientRect(), D = Math.min(globalThis.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(R2.width * D);
      this.pixelRatio = D;
      this.canvas.height = Math.round(R2.height * D);
      this.aspect = R2.width / R2.height;
      this.configure(this.scene || "farm", true);
    }
    project(x, y, z = 0) {
      return {
        x: (x + this.offset[0] + this.view[0]) * this.scale,
        y: (this.view[1] - (import_vector_sockets5.WORLD_DEPTH_PROJECTION * y + import_vector_sockets5.WORLD_HEIGHT_PROJECTION * z + this.offset[1])) * this.scale
      };
    }
    screenToWorld(clientX, clientY) {
      const R2 = this.canvas.getBoundingClientRect(), PX = (clientX - R2.left) * this.pixelRatio, PY = (clientY - R2.top) * this.pixelRatio;
      return {
        x: PX / this.scale - this.offset[0] - this.view[0],
        y: (this.view[1] - PY / this.scale - this.offset[1]) / import_vector_sockets5.WORLD_DEPTH_PROJECTION
      };
    }
    configure(scene, force = false) {
      if (this.scene === scene && !force) {
        return;
      }
      if (this.scene !== scene) {
        this.pan = {
          x: 0,
          y: 0
        };
      }
      this.scene = scene;
      this.scenePresentation = scenePresentation(scene);
      const A = this.aspect;
      this.view = this.scenePresentation.cameraView(A);
      this.scale = this.canvas.width / (2 * this.view[0]);
      const { radiusX: RX, radiusY: RY } = CONFIG[scene].arena;
      const BOUNDS = {
        left: -RX - 1.3,
        right: RX + 1.3,
        bottom: -(RY + 1.3) * import_vector_sockets5.WORLD_DEPTH_PROJECTION,
        top: (RY + 1.3) * import_vector_sockets5.WORLD_DEPTH_PROJECTION
      };
      const BOSS_SCALE = (0, import_vector_sockets5.bossVectorScale)(CONFIG.boss.radius), BOSS_X = RX - CONFIG.boss.radius, BOSS_Y = (RY - CONFIG.boss.radius) * import_vector_sockets5.WORLD_DEPTH_PROJECTION;
      const INCLUDE_BOSS = (record) => {
        const [X, Y, W, H] = record.compiled.viewBox, G = record.anchors.ground;
        BOUNDS.left = Math.min(BOUNDS.left, -BOSS_X - (G.x - X) * BOSS_SCALE);
        BOUNDS.right = Math.max(BOUNDS.right, BOSS_X + (X + W - G.x) * BOSS_SCALE);
        BOUNDS.bottom = Math.min(BOUNDS.bottom, -BOSS_Y - (Y + H - G.y) * BOSS_SCALE);
        BOUNDS.top = Math.max(
          BOUNDS.top,
          BOSS_Y + (G.y - Y) * BOSS_SCALE + CONFIG.raid.dropHeight * import_vector_sockets5.WORLD_HEIGHT_PROJECTION
        );
      };
      for (const RECORD of this.bossAssets.values()) {
        INCLUDE_BOSS(RECORD);
      }
      const BASE_Y = A < 0.8 ? 1.1 : -0.3, TOP = this.view[1] - BASE_Y, BOTTOM = TOP - this.canvas.height / this.scale;
      this.panLimits = {
        minX: Math.min(0, this.view[0] - BOUNDS.right),
        maxX: Math.max(0, -this.view[0] - BOUNDS.left),
        minY: Math.min(0, TOP - BOUNDS.top),
        maxY: Math.max(0, BOTTOM - BOUNDS.bottom)
      };
      this.pan.x = CLAMP2(this.pan.x, this.panLimits.minX, this.panLimits.maxX);
      this.pan.y = CLAMP2(this.pan.y, this.panLimits.minY, this.panLimits.maxY);
      this.offset = [this.pan.x, BASE_Y + this.pan.y];
      this.terrainDots = Array.from(
        {
          length: 92
        },
        (_, i) => {
          const ANGLE = i * 2.39996, RAD = Math.sqrt((i + 0.5) / 92);
          return this.project(Math.cos(ANGLE) * (RX + 0.3) * RAD, Math.sin(ANGLE) * (RY + 0.3) * RAD);
        }
      );
      this.terrainLeaves = Array.from(
        {
          length: 24
        },
        (_, i) => {
          const ANGLE = i * 2.39996;
          return {
            ...this.project(Math.cos(ANGLE) * (RX + 0.55), Math.sin(ANGLE) * (RY + 0.55)),
            angle: ANGLE
          };
        }
      );
    }
    get cameraPan() {
      return {
        x: this.pan.x,
        y: this.pan.y
      };
    }
    setPan(x, y) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return false;
      }
      const B = this.panLimits, NEXT_X = CLAMP2(x, B.minX, B.maxX), NEXT_Y = CLAMP2(y, B.minY, B.maxY), DX = NEXT_X - this.pan.x, DY = NEXT_Y - this.pan.y;
      if (DX === 0 && DY === 0) {
        return false;
      }
      this.pan.x = NEXT_X;
      this.pan.y = NEXT_Y;
      this.offset[0] = NEXT_X;
      this.offset[1] = (this.aspect < 0.8 ? 1.1 : -0.3) + NEXT_Y;
      for (const POINTS of [this.terrainDots, this.terrainLeaves]) {
        for (const POINT2 of POINTS) {
          POINT2.x += DX * this.scale;
          POINT2.y -= DY * this.scale;
        }
      }
      return true;
    }
    panByScreen(dx, dy) {
      return this.setPan(
        this.pan.x + dx * this.pixelRatio / this.scale,
        this.pan.y - dy * this.pixelRatio / this.scale
      );
    }
    resetPan() {
      return this.setPan(0, 0);
    }
    ellipse(x, y, rx, ry, color2, angle = 0) {
      const C = this.ctx;
      C.fillStyle = color2;
      C.beginPath();
      C.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), angle, 0, Math.PI * 2);
      C.fill();
    }
    groundEllipse(x, y, rx, ry, color2, z = 0) {
      const P = this.project(x, y, z);
      this.ellipse(P.x, P.y, rx * this.scale, ry * this.scale * 0.62, color2);
    }
    strokeGroundEllipse(x, y, rx, ry, color2, width = 0.08) {
      const C = this.ctx, P = this.project(x, y);
      C.strokeStyle = color2;
      C.lineWidth = width * this.scale;
      C.beginPath();
      C.ellipse(P.x, P.y, rx * this.scale, ry * this.scale * 0.62, 0, 0, Math.PI * 2);
      C.stroke();
    }
    drawBossTelegraph(area) {
      bossAttackPresentation(area).drawTelegraph(this, area);
    }
    drawBossDanger(area) {
      const C = this.ctx, POINTS = this.dangerContour, COUNT = bossDangerContour(area, POINTS);
      if (!COUNT) {
        return;
      }
      const S = this.scale, OX = this.offset[0] + this.view[0], OY = this.view[1] - this.offset[1], ALPHA = C.globalAlpha;
      C.beginPath();
      for (let i = 0; i < COUNT; i++) {
        const X = (POINTS[i * 2] + OX) * S, Y = (OY - import_vector_sockets5.WORLD_DEPTH_PROJECTION * POINTS[i * 2 + 1]) * S;
        if (i === 0) {
          C.moveTo(X, Y);
        } else {
          C.lineTo(X, Y);
        }
      }
      C.closePath();
      const FLASH = area.phase === "recover", FADE = FLASH ? Math.max(0, 1 - area.elapsed / 0.14) : 1, PROGRESS = CLAMP2(area.progress, 0, 1);
      C.fillStyle = "#e63744";
      C.globalAlpha = ALPHA * (FLASH ? 0.38 * FADE : area.active ? 0.25 : 0.08 + 0.18 * PROGRESS * PROGRESS);
      C.fill();
      C.strokeStyle = FLASH ? "#ff7377" : area.locked || area.active ? "#e43d49" : "#c93240";
      C.lineWidth = Math.max(1.6 * this.pixelRatio, (FLASH ? 0.13 : 0.095) * S);
      C.globalAlpha = ALPHA * (FLASH ? FADE : 0.9);
      C.lineJoin = "round";
      C.stroke();
      C.globalAlpha = ALPHA;
    }
    ring(x, y, r, color2, width = 0.045, start2 = 0, end = Math.PI * 2) {
      const C = this.ctx, P = this.project(x, y);
      C.strokeStyle = color2;
      C.lineWidth = width * this.scale;
      C.beginPath();
      C.ellipse(P.x, P.y, r * this.scale, r * this.scale * 0.62, 0, -end, -start2);
      C.stroke();
    }
    line(a, b, width, color2) {
      const C = this.ctx;
      C.strokeStyle = color2;
      C.lineWidth = width * this.scale;
      C.lineCap = "round";
      C.beginPath();
      C.moveTo(a.x, a.y);
      C.lineTo(b.x, b.y);
      C.stroke();
    }
    pixelLine(a, b, width, color2) {
      const C = this.ctx;
      C.strokeStyle = color2;
      C.lineWidth = width;
      C.lineCap = "round";
      C.beginPath();
      C.moveTo(a.x, a.y);
      C.lineTo(b.x, b.y);
      C.stroke();
    }
    terrain(sim2) {
      const S = this.scale, PRESENTATION = this.scenePresentation, { radiusX: RX, radiusY: RY } = CONFIG[sim2.scene].arena;
      this.groundEllipse(0, -0.2, RX + 1.3, RY + 1.1, "#bcc7a6");
      this.groundEllipse(0, 0, RX + 1.2, RY + 1.1, PRESENTATION.groundColor);
      this.groundEllipse(0, 0.15, RX + 0.3, RY + 0.3, PRESENTATION.surfaceColor);
      for (const P of this.terrainDots) {
        this.ellipse(P.x, P.y, S * 0.026, S * 0.02, "#a7b58b80");
      }
      for (const P of this.terrainLeaves) {
        this.ellipse(P.x, P.y, 0.25 * S, 0.11 * S, "#94a577", P.angle);
        this.ellipse(P.x + 0.1 * S, P.y - 0.09 * S, 0.19 * S, 0.075 * S, "#a8b78a", P.angle + 0.7);
      }
      PRESENTATION.drawBoundary(this);
      const AREA = PRESENTATION.dangerVisible(sim2) ? renderedBossAttackArea(sim2.boss, sim2.scene, this.telegraphBoss, this.dangerArea) : null;
      this.bossTelegraph = AREA;
      if (AREA) {
        this.drawBossTelegraph(AREA);
      }
    }
    addActor(presentation, source, depth, id, vector = false) {
      const INDEX = this.actors.length, ACTOR = this.actorPool[INDEX] || (this.actorPool[INDEX] = {});
      ACTOR.presentation = presentation;
      ACTOR.source = source;
      ACTOR.depth = depth;
      ACTOR.id = id;
      ACTOR.vector = vector;
      this.actors.push(ACTOR);
    }
    render(sim2, feel = null, now = performance.now()) {
      this.feel = feel;
      this.displayTimeMs = now;
      this.configure(sim2.scene);
      const C = this.ctx, PRESENTATION = this.scenePresentation;
      PRESENTATION.collectJoy(sim2, this.joyEffects);
      C.beginFrame({
        width: this.canvas.width,
        height: this.canvas.height,
        clearColor: [0.9, 0.92, 0.87, 1]
      });
      this.terrain(sim2);
      for (const U of sim2.units) {
        const A = CLAMP2(0.22 / (1 + U.z * 0.3), 0.045, 0.22), SHADOW = U.size * 0.66 / (1 + U.z * 0.65);
        this.groundEllipse(U.x, U.y, SHADOW, SHADOW * 0.62, `rgba(42,61,35,${A})`);
      }
      const BOSS_VISIBLE = PRESENTATION.bossVisible(sim2);
      if (BOSS_VISIBLE) {
        this.groundEllipse(sim2.boss.x, sim2.boss.y, sim2.boss.radius * 1.05, sim2.boss.radius * 0.75, "#38472c33");
      }
      const HIDDEN_MERGE_RESULT_IDS = PRESENTATION.hiddenUnitIds?.(sim2) || EMPTY_UNIT_IDS, ACTORS = this.actors;
      ACTORS.length = 0;
      PRESENTATION.drawMergeBlackHoles?.(this, sim2);
      for (const U of sim2.units) {
        if (!HIDDEN_MERGE_RESULT_IDS.has(U.id)) {
          this.addActor(
            this.unitPresentation,
            U,
            0.785 * U.y - 0.62 * U.z,
            U.id,
            this.vectorAssets.has(U.species)
          );
        }
      }
      if (BOSS_VISIBLE) {
        this.addActor(this.bossPresentation, sim2.boss, 0.785 * sim2.boss.y - 0.62 * (sim2.boss.z || 0), 0, true);
      }
      PRESENTATION.collectFood(this, sim2);
      if (BOSS_VISIBLE) {
        for (const F of sim2.projectiles) {
          this.addActor(this.projectilePresentation, F, 0.785 * F.y - 0.62 * F.z, -F.id);
        }
      }
      for (let index = 0; index < sim2.effects.length; index++) {
        const EFFECT = sim2.effects[index];
        if (EFFECT.kind !== "merge-material") {
          continue;
        }
        const PROGRESS = mergeMaterialProgress(EFFECT);
        if (PROGRESS === null) {
          continue;
        }
        const POSITION = mergeMaterialPosition(EFFECT, PROGRESS);
        this.addActor(
          this.mergeMaterialPresentation,
          EFFECT,
          0.785 * POSITION.y - 0.62 * POSITION.z,
          -1e6 - index
        );
      }
      ACTORS.sort(COMPARE_ACTORS);
      let vectorRun = false;
      for (const ACTOR of ACTORS) {
        if (ACTOR.vector && !vectorRun) {
          C.flush();
          vectorRun = true;
        } else if (!ACTOR.vector && vectorRun) {
          C.flush();
          vectorRun = false;
        }
        ACTOR.presentation.draw(ACTOR.source, sim2);
        ACTOR.source = null;
      }
      if (vectorRun) {
        C.flush();
      }
      const LIVE_UNIT_IDS = this.liveUnitIds;
      LIVE_UNIT_IDS.clear();
      for (const U of sim2.units) {
        LIVE_UNIT_IDS.add(U.id);
      }
      for (const [ID, PLAYER] of this.vectorPlayers) {
        if (!LIVE_UNIT_IDS.has(ID)) {
          PLAYER.dispose();
          this.vectorPlayers.delete(ID);
        }
      }
      feel?.draw(this, this.displayTimeMs);
      for (const GROUP of sim2.cornAttachments?.groups || []) {
        for (const ATTACHMENT of GROUP.attachments) {
          if (ATTACHMENT.status === "attached" || ATTACHMENT.status === "fading") {
            CORN_ATTACHMENT_PRESENTATION.drawAttachment(this, ATTACHMENT, GROUP);
          }
        }
      }
      for (const E of sim2.effects) {
        if (E.kind !== "merge-material") {
          drawEffect(this, E);
        }
      }
      drawFormationEffects(this, sim2);
      this.stats = C.endFrame();
    }
    dispose() {
      disposeEffectPresentations(this);
      for (const SPECIES of this.vectorAssets.keys()) {
        unbindBossSocketAsset(SPECIES, this.bossSpeciesAssets.get(SPECIES));
      }
      for (const PLAYER of this.vectorPlayers.values()) {
        PLAYER.dispose();
      }
      this.vectorPlayers.clear();
      for (const RECORD of this.vectorAssets.values()) {
        RECORD.asset.dispose();
      }
      this.vectorAssets.clear();
      for (const { player: PLAYER } of this.bossPlayers.values()) {
        PLAYER.dispose();
      }
      this.bossPlayers.clear();
      this.bossPlayer = null;
      for (const RECORD of this.bossAssets?.values() || []) {
        RECORD.asset.dispose();
      }
      this.bossAssets?.clear();
      this.bossSpeciesAssets.clear();
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
  init_model20();
  var { PresentationRuntime: PRESENTATION_RUNTIME, RenderObject: RENDER_OBJECT } = globalThis.BloomGamekitInterpolation;
  var R = RENDER_OBJECT;
  var PRESENTATION_STEP_MS = 50;
  var LOCAL_PROFILE = Object.freeze({
    tickRate: 20,
    maxCatchupSteps: 4
  });
  var LOCAL_INPUT = new Uint8Array(0);
  var ADVANCED = Object.freeze({
    status: "advanced"
  });
  var CLOSED = Object.freeze({
    status: "closed"
  });
  var UnitRender = class extends RENDER_OBJECT {
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
      isDowned: R.STATE_KEY,
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
      bodyScale: R.LINEAR,
      height: R.LINEAR,
      radius: R.LINEAR,
      maxHp: R.STEP,
      fed: R.STEP,
      ownerId: R.STATE_KEY,
      faction: R.STEP,
      farmId: R.STEP,
      dropLanded: R.STEP,
      buffed: R.STEP,
      isBattleOnlySummon: R.STEP,
      isFormationClone: R.STEP,
      giantUntil: R.STEP,
      giantEndedAt: R.STEP,
      cloneParentId: R.STEP,
      cloneBornAt: R.STEP,
      barleyArmorShredTotal: R.STEP
    });
    constructor() {
      super();
      this.ability = {};
    }
    update(u, world) {
      this.id = u.id;
      this.x = u.x;
      this.y = u.y;
      this.z = u.z;
      this.angle = u.angle;
      this.vx = u.vx;
      this.vy = u.vy;
      this.hp = u.hp;
      this.down = u.down;
      this.isDowned = u.hp <= 0;
      this.stun = u.stun;
      this.flash = u.flash;
      this.bounce = u.bounce;
      this.ability.phase = u.ability.phase;
      this.ability.elapsed = u.ability.elapsed;
      this.ability.peanutStrikeCount = u.ability.action?.peanutStrikeCount || 2;
      this.walnutGuarding = !!u.ability.isGuarding?.(world.simulationTick);
      this.cooldown = u.cooldown;
      this.cooldownDuration = u.cooldownDuration;
      this.meals = u.meals;
      this.species = u.species;
      this.tier = u.tier;
      this.seed = u.seed;
      this.size = u.size;
      this.bodyScale = u.bodyScale;
      this.height = u.height;
      this.radius = u.radius;
      this.maxHp = u.isFormationClone ? 1 : baseUnitStatsFor(u.tier, u.species).maxHp;
      this.fed = u.fed;
      this.ownerId = u.ownerId;
      this.faction = u.faction;
      this.farmId = u.farmId;
      this.dropLanded = u.dropLanded;
      this.buffed = world.time < (world.raidRoster(u.ownerId)?.buffUntil || 0);
      this.isBattleOnlySummon = u.isBattleOnlySummon;
      this.isFormationClone = u.isFormationClone;
      this.giantUntil = u.giantUntil;
      this.giantEndedAt = u.giantEndedAt;
      this.cloneParentId = u.battleSummonParentId;
      this.cloneBornAt = u.cloneBornAt;
      this.barleyArmorShredTotal = BarleyArmorShredModel.total(u, world.simulationTick);
    }
  };
  var BossRender = class extends RENDER_OBJECT {
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
      summonMouthZ: R.STEP,
      barleyArmorShredTotal: R.STEP
    });
    update(b, world) {
      const ACTION = b.patternRuntime.active, EVENT = world.farmBossEvent, TARGET = ACTION?.target || null, START = ACTION?.start || null, MOUTH = b.summonMouth || {}, ENDED = world.scene === "raid" && !b.active ? world.notices.findLast((e) => e.kind === "victory" || e.kind === "defeat") : null;
      this.x = b.x;
      this.y = b.y;
      this.z = b.z;
      this.angle = b.angle;
      this.startAngle = b.startAngle;
      this.phase = ACTION?.phase || (!b.active || EVENT?.phase === "dropping" ? "resting" : "chase");
      this.clock = ACTION?.phaseElapsed ?? (EVENT.phase === "celebrating" || EVENT.phase === "fading" ? EVENT.elapsed : ENDED?.bossPatternElapsed || 0);
      this.travel = b.travel || 0;
      this.hp = b.hp;
      this.maxHp = b.maxHp;
      this.radius = b.radius;
      this.height = b.height;
      this.flash = b.flash;
      this.species = b.species ?? 3;
      this.stage = b.stage ?? 0;
      this.patternId = ACTION?.id || "";
      this.patternPhase = ACTION?.phase || "idle";
      this.patternPhaseElapsed = ACTION?.phaseElapsed || 0;
      this.patternAim = ACTION?.aim ?? b.angle;
      this.patternLocked = !!ACTION?.locked;
      this.patternTargetId = ACTION?.targetId || 0;
      this.patternTargetX = TARGET?.x ?? b.x;
      this.patternTargetY = TARGET?.y ?? b.y;
      this.patternTargetZ = TARGET?.z ?? 0;
      this.patternStartX = START?.x ?? b.x;
      this.patternStartY = START?.y ?? b.y;
      this.patternStartZ = START?.z ?? b.z;
      this.patternVolleyCount = ACTION?.volleyCount || 0;
      this.patternReleased = ACTION?.released || 0;
      this.patternTraveled = ACTION?.traveled || 0;
      this.summonMouthX = MOUTH.x ?? b.x;
      this.summonMouthY = MOUTH.y ?? b.y;
      this.summonMouthZ = MOUTH.z ?? b.z;
      this.barleyArmorShredTotal = BarleyArmorShredModel.total(b, world.simulationTick);
    }
  };
  var FoodRender = class extends RENDER_OBJECT {
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
    update(f) {
      this.x = f.x;
      this.y = f.y;
      this.z = f.z;
      this.vx = f.vx;
      this.vy = f.vy;
      this.vz = f.vz;
      this.phase = f.phase;
      this.tx = f.tx ?? 0;
      this.ty = f.ty ?? 0;
      this.seed = f.seed ?? 0;
    }
  };
  var ProjectileRender = class extends RENDER_OBJECT {
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
      shotIndex: R.STEP,
      fanIndex: R.STEP,
      "path.from.x": R.STEP,
      "path.from.y": R.STEP,
      "path.from.z": R.STEP,
      "path.to.x": R.STEP,
      "path.to.y": R.STEP,
      "path.to.z": R.STEP,
      "path.height": R.STEP,
      "path.duration": R.STEP
    });
    constructor() {
      super();
      this.path = {
        from: {},
        to: {}
      };
    }
    update(p) {
      this.id = p.id;
      this.x = p.x;
      this.y = p.y;
      this.z = p.z;
      this.elapsed = p.elapsed;
      this.owner = p.owner;
      this.species = p.species;
      this.tier = p.tier;
      this.radius = p.radius;
      this.height = p.height;
      this.projectileKind = p.projectileKind || "";
      this.shotIndex = p.shotIndex || 0;
      this.fanIndex = p.fanIndex || 0;
      this.path.from.x = p.path.from.x;
      this.path.from.y = p.path.from.y;
      this.path.from.z = p.path.from.z;
      this.path.to.x = p.path.to.x;
      this.path.to.y = p.path.to.y;
      this.path.to.z = p.path.to.z;
      this.path.height = p.path.height;
      this.path.duration = p.path.duration;
    }
  };
  var EffectRender = class extends RENDER_OBJECT {
    static renderSchema = Object.freeze({
      x: R.POSITION_X,
      y: R.POSITION_Y,
      z: R.POSITION_Z,
      life: R.LINEAR,
      kind: R.STATE_KEY,
      radius: R.STEP,
      duration: R.STEP,
      owner: R.STEP
    });
    update(e) {
      this.x = e.x;
      this.y = e.y;
      this.z = e.z;
      this.life = e.life;
      this.kind = e.kind;
      this.radius = e.radius || 0;
      this.duration = e.duration || 0;
      this.owner = e.owner || 0;
    }
  };
  var FormationEffectRender = class _FormationEffectRender extends RENDER_OBJECT {
    static renderSchema = Object.freeze({
      id: R.STEP,
      kind: R.STATE_KEY,
      x: R.POSITION_X,
      y: R.POSITION_Y,
      z: R.POSITION_Z,
      age: R.LINEAR,
      duration: R.STEP,
      delay: R.STEP,
      radius: R.STEP,
      unitId: R.STEP,
      targetX: R.LINEAR,
      targetY: R.LINEAR,
      targetZ: R.LINEAR,
      lastPulse: R.STEP,
      pulse: R.STEP,
      beamTarget: R.STATE_KEY,
      beamTargetZ: R.LINEAR
    });
    update(effect) {
      for (const KEY2 of Object.keys(_FormationEffectRender.renderSchema)) {
        this[KEY2] = effect[KEY2] ?? (KEY2 === "kind" ? "" : 0);
      }
    }
  };
  var DelayedEffectRender = class extends EffectRender {
    static renderSchema = Object.freeze({
      ...EffectRender.renderSchema,
      delay: R.STEP,
      span: R.STEP
    });
    update(e) {
      super.update(e);
      this.delay = e.delay;
      this.span = e.span;
    }
  };
  var MergeMaterialRender = class extends DelayedEffectRender {
    static renderSchema = Object.freeze({
      ...DelayedEffectRender.renderSchema,
      targetX: R.STEP,
      targetY: R.STEP,
      targetZ: R.STEP,
      sequenceIndex: R.STEP,
      sequenceCount: R.STEP
    });
    update(e) {
      super.update(e);
      this.targetX = e.targetX;
      this.targetY = e.targetY;
      this.targetZ = e.targetZ;
      this.sequenceIndex = e.sequenceIndex;
      this.sequenceCount = e.sequenceCount;
    }
  };
  var GameClockRender = class extends RENDER_OBJECT {
    static renderSchema = Object.freeze({
      gameTimeMs: R.LINEAR
    });
    constructor(gameTimeMs) {
      super();
      this.gameTimeMs = gameTimeMs;
    }
  };
  var FarmSession = class {
    constructor(world = new GARDEN(), { onError = console.error, onWorldStep: onWorldStep2 = () => {
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
      this.pendingNotices = [];
      this.presentationNotices = [];
      this.unsubscribeNotices = null;
      this.noticeWorld = null;
      this.localPlayerId = "solo";
      this.localDeploySequence = world.raidRoster(this.localPlayerId)?.lastDeploySequence || 0;
      this.presentationRevision = 0;
      this.presentationSequence = 0;
      this.pendingPresentationMode = null;
      this.pendingPulsePresentationMode = null;
      this.presentationRuntime = new PRESENTATION_RUNTIME({
        stepMs: PRESENTATION_STEP_MS,
        delayMs: PRESENTATION_STEP_MS,
        snapDistance: 12
      });
      this.presentationAdapters = /* @__PURE__ */ new WeakMap();
      this.captureEntities = [];
      this.clockEntity = {
        id: "clock",
        generation: 0,
        source: new GameClockRender(0)
      };
      this.presentationIds = /* @__PURE__ */ new WeakMap();
      this.nextPresentationId = 1;
      this.previousCaptureTimeMs = null;
      this.latestCaptureTimeMs = 0;
      this.presentationOriginWallMs = null;
      this.lastFrameClockMs = null;
      this.lastCaptureClockMs = 0;
      this.pulseTimestamp = null;
      this.currentPulseCapped = false;
      this.loop = globalThis.BloomGamekitSimloop.createLoop({
        session: this,
        getInput: () => LOCAL_INPUT,
        onError,
        onBacklogDrop: (details) => {
          const REASON = details?.reason, DROPPED_MS = Math.max(0, Number.isFinite(details?.droppedMs) ? details.droppedMs : 0);
          if (REASON === "input-dt-clamp" || REASON === "backlog-overflow") {
            const IS_INPUT_CLAMP = REASON === "input-dt-clamp";
            this.profiler?.count(IS_INPUT_CLAMP ? "inputDtClampEvents" : "backlogOverflowEvents");
            this.profiler?.count(IS_INPUT_CLAMP ? "inputDtClampedMs" : "backlogOverflowMs", DROPPED_MS);
            if (!this.currentPulseCapped) {
              this.profiler?.count("backlogCappedFrames");
              this.currentPulseCapped = true;
            }
            this.profiler?.count("backlogClippedMs", DROPPED_MS);
            return;
          }
          this.profiler?.count("backlogDrops");
          this.profiler?.count("backlogDroppedMs", DROPPED_MS);
          if (REASON === "clock-gap") {
            this.profiler?.count("clockGapDrops");
            this.profiler?.count("clockGapDroppedMs", DROPPED_MS);
          } else if (REASON === "drop-policy") {
            this.profiler?.count("dropPolicyDrops");
            this.profiler?.count("dropPolicyDroppedMs", DROPPED_MS);
          }
          this.pendingPresentationMode = "reset";
        },
        onAdvance: (result) => {
          const ON_ADVANCE_START = this.profiler?.start();
          try {
            if (this.pendingPresentationMode) {
              this.pendingPulsePresentationMode = "reset";
            } else if (result.status === "advanced" && !this.paused) {
              this.pendingPulsePresentationMode ||= "continuous";
              const REMAINING_MS = this.pulseTimestamp - this.loop.simulationTimeMs, STEP_MS = 1e3 / LOCAL_PROFILE.tickRate * this.pace, EPSILON_MS = 1e-7, HAS_NEXT_STEP = REMAINING_MS + EPSILON_MS >= STEP_MS, HAS_STEP_AFTER_NEXT = REMAINING_MS - STEP_MS + EPSILON_MS >= STEP_MS;
              if (HAS_NEXT_STEP && !HAS_STEP_AFTER_NEXT) {
                this.capturePresentation("continuous");
              }
            }
          } finally {
            this.profiler?.end("onAdvance", ON_ADVANCE_START);
          }
        }
      });
      this.bindNoticeJournal();
      this.capturePresentation("reset");
    }
    bindNoticeJournal() {
      this.unsubscribeNotices?.();
      this.unsubscribeNotices = null;
      if (this.noticeWorld !== this.world) {
        this.pendingNotices.length = 0;
        this.presentationNotices.length = 0;
      }
      this.noticeWorld = this.world;
      if (this.closed) {
        return;
      }
      this.unsubscribeNotices = this.world.onNotice.on((notice) => {
        this.pendingNotices.push(notice);
        if (this.pendingNotices.length > 512) {
          this.pendingNotices.shift();
        }
      });
    }
    takePresentationNotices() {
      const EMPTY = this.presentationNotices;
      EMPTY.length = 0;
      this.presentationNotices = this.pendingNotices;
      this.pendingNotices = EMPTY;
      return this.presentationNotices;
    }
    // Required by the shared loop; a local session has no incoming work to poll.
    poll() {
    }
    queue(type, args = {}) {
      if (this.closed || this.pending.length >= 64) {
        return false;
      }
      this.pending.push(
        structuredClone({
          type,
          ...args
        })
      );
      return true;
    }
    deployNext(speciesId) {
      const W = this.world, ROSTER2 = W.scene === "raid" && W.raidRoster(this.localPlayerId);
      if (!ROSTER2 || this.closed || this.paused || ["victory", "defeat"].includes(W.encounter.outcome)) {
        return false;
      }
      if (speciesId !== void 0 && (!ROSTER2.deploymentCardSpecies.includes(speciesId) || W.raidRemaining(this.localPlayerId, speciesId) <= 0)) {
        return false;
      }
      this.localDeploySequence = Math.max(this.localDeploySequence, ROSTER2.lastDeploySequence);
      if (this.localDeploySequence - ROSTER2.lastDeploySequence >= W.raidRemaining(this.localPlayerId)) {
        return false;
      }
      const QUEUED_FOR_SPECIES = this.pending.filter(
        (command) => command.type === "deploy" && command.speciesId === speciesId
      ).length;
      if (speciesId !== void 0 && QUEUED_FOR_SPECIES >= W.raidRemaining(this.localPlayerId, speciesId)) {
        return false;
      }
      const SEQUENCE = this.localDeploySequence + 1;
      if (!this.queue("deploy", {
        sequence: SEQUENCE,
        ...speciesId === void 0 ? {} : { speciesId }
      })) {
        return false;
      }
      this.localDeploySequence = SEQUENCE;
      return true;
    }
    advance() {
      if (this.closed) {
        return CLOSED;
      }
      const COMMAND_START = this.profiler?.start();
      const COMMAND_CHANGED_WORLD = this.applyPendingCommands(32);
      this.profiler?.end("commandQueue", COMMAND_START);
      if (this.paused) {
        this.tick++;
        if (COMMAND_CHANGED_WORLD) {
          this.onWorldStep(this.world);
        }
        return ADVANCED;
      }
      const W = this.world, START_TIME = W.time, LOOP_START = this.loop?.simulationTimeMs, START_CLOCK = this.adjustedWallTime(
        Number.isFinite(LOOP_START) ? LOOP_START : this.pulseTimestamp ?? globalThis.performance.now()
      ), PRESENTATION_START_MS = Math.max(0, START_CLOCK - (this.presentationOriginWallMs ?? START_CLOCK));
      bindPresentationClock(W, (time) => (PRESENTATION_START_MS + (time - START_TIME) * 1e3) / 1e3);
      if (W.scene === "farm") {
        const AUTO_TAPS_START = this.profiler?.start();
        try {
          W.advanceAutoTaps(1 / LOCAL_PROFILE.tickRate);
        } finally {
          this.profiler?.end("autoTaps", AUTO_TAPS_START);
        }
      }
      W.step(1 / LOCAL_PROFILE.tickRate);
      this.tick++;
      this.presentationTick++;
      const WORLD_STEP_FOLLOWUP_START = this.profiler?.start();
      try {
        this.onWorldStep(W);
      } finally {
        this.profiler?.end("worldStepFollowup", WORLD_STEP_FOLLOWUP_START);
      }
      return ADVANCED;
    }
    applyPendingCommands(limit) {
      if (!this.pending.length) {
        return false;
      }
      let changed = false;
      for (const COMMAND of this.pending.splice(0, limit)) {
        try {
          changed = this.command(COMMAND) || changed;
        } catch {
        }
      }
      return changed;
    }
    flushQueuedCommands() {
      if (this.closed || this.world.scene !== "farm") {
        return false;
      }
      const CHANGED = this.applyPendingCommands(this.pending.length);
      if (CHANGED) {
        this.onWorldStep(this.world);
      }
      return CHANGED;
    }
    command(c, ownerId = this.localPlayerId) {
      const W = this.world;
      switch (c.type) {
        case "feed":
          return W.scene === "farm" && W.scatterFoodAtRandomLocation();
        case "scatter-food":
          return W.scene === "farm" && W.scatterFood(c.x, c.y);
        case "farm-plot-switch":
          return W.scene === "farm" && W.switchFarmPlot(c.plotId);
        case "farm-plot-unlock":
          return W.scene === "farm" && W.unlockFarmPlot().ok;
        case "farm-plot-expand":
          return W.scene === "farm" && W.expandFarmPlot(c.plotId).ok;
        case "farm-target":
          return W.scene === "farm" && W.setSpeciesTarget(c.speciesId, c.basisPoints);
        case "farm-sort":
          return W.scene === "farm" && W.sortActiveFarm(c.order);
        case "merge":
          return W.scene === "farm" && W.startManualMerge();
        case "progression-invest":
          if (W.scene === "farm" && typeof c.nodeId === "string" && c.nodeId.length < 64) {
            if (c.scope === "farm") {
              return W.investFarmUpgrade(c.nodeId).ok;
            }
            if (c.scope === "ability" && typeof c.abilityId === "string" && c.abilityId.length < 64) {
              return W.investAbilityNode(c.abilityId, c.nodeId).ok;
            }
          }
          return false;
        case "formation-purchase":
          return W.formationSkills.purchase(c.id);
        case "formation-slot":
          return W.formationSkills.buySlot();
        case "formation-equip":
          return W.formationSkills.equip(c.slot, c.id);
        case "deployment-card-buy-slot":
          return W.raidDeploymentCards.buySlot();
        case "deployment-card-select":
          return W.raidDeploymentCards.select(c.slot, c.speciesId);
        case "progression-reset":
          return W.scene === "farm" && W.resetProgression(c.scope).ok;
        case "ability-reset":
          return W.scene === "farm" && W.resetAbilityTree().ok;
        case "register-roster":
          return Array.isArray(c.entries) && W.registerRaidRoster(
            ownerId,
            c.entries,
            c.abilitySnapshot,
            c.settlement || null,
            Array.isArray(c.deploymentCardSpecies) ? c.deploymentCardSpecies : null
          );
        case "deploy":
          return Number.isSafeInteger(c.sequence) && W.deployNextRaidUnit(ownerId, c.sequence, c.speciesId);
        case "buff":
          return W.useRaidBuff(ownerId);
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
    // GameKit capture copies declared fields synchronously. Reuse only its input
    // adapters, keyed weakly by the live actor; captured history stays SDK-owned.
    presentationEntity(id, source, typeLocal) {
      let entity = this.presentationAdapters.get(source);
      if (!entity || entity.source.constructor !== typeLocal) {
        entity = {
          id,
          generation: 0,
          source: new typeLocal()
        };
        this.presentationAdapters.set(source, entity);
      }
      entity.id = id;
      entity.source.update(source, this.world);
      return entity;
    }
    get paused() {
      return this._paused;
    }
    set paused(value) {
      value = !!value;
      if (value === this._paused) {
        return;
      }
      const NOW = globalThis.performance.now();
      if (value) {
        this.pauseStartedAt = NOW;
      } else if (this.pauseStartedAt !== null) {
        this.pausedDurationMs += NOW - this.pauseStartedAt;
        this.pauseStartedAt = null;
      }
      this._paused = value;
    }
    adjustedWallTime(now) {
      return now - this.pausedDurationMs - (this._paused && this.pauseStartedAt !== null ? now - this.pauseStartedAt : 0);
    }
    capturePresentation(mode = "continuous") {
      const START = this.profiler?.start();
      this.profiler?.count("presentationCaptures");
      try {
        return this.capturePresentationSnapshot(mode);
      } finally {
        this.profiler?.end("presentationCapture", START);
      }
    }
    capturePresentationSnapshot(mode) {
      if (mode !== "continuous" && this.presentationSequence > 0) {
        this.presentationRevision++;
        this.bindNoticeJournal();
      }
      const WORLD = this.world, SNAPSHOT_START = this.profiler?.start(), RECEIPT_NOW_MS = this.captureClock(), TIME_MS = this.presentationOriginWallMs === null ? 0 : Math.max(this.latestCaptureTimeMs, RECEIPT_NOW_MS - this.presentationOriginWallMs), ENTITIES = this.captureEntities;
      ENTITIES.length = 0;
      if (this.presentationOriginWallMs === null) {
        this.presentationOriginWallMs = RECEIPT_NOW_MS;
      }
      for (const U of WORLD.units) {
        ENTITIES.push(this.presentationEntity("unit:" + U.id, U, UnitRender));
      }
      ENTITIES.push(this.presentationEntity("boss", WORLD.boss, BossRender));
      for (const F of WORLD.food) {
        if (mode === "continuous" && F.phase === "grounded") {
          continue;
        }
        ENTITIES.push(this.presentationEntity(this.presentationIdentity("food", F), F, FoodRender));
      }
      for (const P of WORLD.projectiles) {
        ENTITIES.push(this.presentationEntity("projectile:" + P.id, P, ProjectileRender));
      }
      for (const E of WORLD.effects) {
        const TYPE = E.kind === "merge-material" ? MergeMaterialRender : Number.isFinite(E.delay) && Number.isFinite(E.span) ? DelayedEffectRender : EffectRender;
        ENTITIES.push(this.presentationEntity(this.presentationIdentity("effect", E), E, TYPE));
      }
      for (const EFFECT of WORLD.formationRuntime.effects) {
        ENTITIES.push(this.presentationEntity("formation:" + EFFECT.id, EFFECT, FormationEffectRender));
      }
      this.clockEntity.source.gameTimeMs = WORLD.time * 1e3;
      ENTITIES.push(this.clockEntity);
      this.profiler?.count("presentationEntities", ENTITIES.length);
      this.profiler?.end("presentationSnapshot", SNAPSHOT_START);
      const CAPTURE_MODE = mode === "continuous" ? "continuous" : mode === "load" ? "load" : mode === "rollback" ? "rollback" : "reset";
      if (CAPTURE_MODE === "continuous") {
        this.previousCaptureTimeMs = this.latestCaptureTimeMs;
      } else {
        this.previousCaptureTimeMs = null;
      }
      const RUNTIME_START = this.profiler?.start();
      let accepted;
      try {
        accepted = this.presentationRuntime.capture(
          {
            revision: this.presentationRevision,
            sequence: ++this.presentationSequence,
            timeMs: TIME_MS,
            mode: CAPTURE_MODE,
            entities: ENTITIES
          },
          RECEIPT_NOW_MS
        );
      } finally {
        this.profiler?.end("runtimeCapture", RUNTIME_START);
      }
      if (accepted) {
        this.latestCaptureTimeMs = TIME_MS;
        this.lastCaptureClockMs = RECEIPT_NOW_MS;
        this.pendingPresentationMode = null;
      }
      return accepted;
    }
    captureClock() {
      const NOW = this.pulseTimestamp ?? globalThis.performance.now(), BOUNDARY = this.loop?.simulationTimeMs;
      const CANDIDATE = this.adjustedWallTime(Number.isFinite(BOUNDARY) ? BOUNDARY : NOW);
      const RECEIPT = Math.max(CANDIDATE, this.lastCaptureClockMs, this.lastFrameClockMs ?? 0);
      this.lastCaptureClockMs = RECEIPT;
      return RECEIPT;
    }
    frameClock(now) {
      const CLOCK = Math.max(this.lastFrameClockMs ?? 0, this.lastCaptureClockMs, this.adjustedWallTime(now));
      this.lastFrameClockMs = CLOCK;
      return CLOCK;
    }
    presentation(now) {
      const FRAME = this.presentationRuntime.frame(this.frameClock(now)), WORLD = this.world;
      if (!this.presentationView || Object.getPrototypeOf(this.presentationView) !== WORLD) {
        const VIEW2 = this.presentationView = Object.assign(
          Object.create(WORLD, {
            // Shadow the model's collection accessor without invoking
            // its setter: presentation owns only this borrowed buffer.
            units: { value: [], writable: true, enumerable: true, configurable: true }
          }),
          {
            food: [],
            presentationFoodIds: /* @__PURE__ */ new Set(),
            projectiles: [],
            effects: [],
            formationEffects: [],
            presentationDiagnostics: {}
          }
        );
        this.collectPresentationModel = (model, id) => {
          if (id.startsWith("formation:")) {
            VIEW2.formationEffects.push(model);
          } else if (id.startsWith("unit:")) {
            VIEW2.units.push(model);
          } else if (id.startsWith("food:")) {
            VIEW2.food.push(model);
            VIEW2.presentationFoodIds.add(id);
          } else if (id.startsWith("projectile:")) {
            VIEW2.projectiles.push(model);
          } else if (id.startsWith("effect:")) {
            VIEW2.effects.push(model);
          }
        };
      }
      const VIEW = this.presentationView;
      VIEW.units.length = 0;
      VIEW.food.length = 0;
      VIEW.presentationFoodIds.clear();
      VIEW.projectiles.length = 0;
      VIEW.effects.length = 0;
      VIEW.formationEffects.length = 0;
      VIEW.formationSlots = WORLD.formationRuntime.slots;
      FRAME.forEach(this.collectPresentationModel);
      for (const FOOD of WORLD.food) {
        if (FOOD.phase === "grounded") {
          const ID = this.presentationIdentity("food", FOOD);
          if (!VIEW.presentationFoodIds.has(ID)) {
            VIEW.food.push(FOOD);
          }
        }
      }
      VIEW.time = (FRAME.sample("clock", 0)?.gameTimeMs ?? WORLD.time * 1e3) / 1e3;
      VIEW.boss = FRAME.sample("boss", 0) || this.presentationEntity("boss", WORLD.boss, BossRender).source;
      VIEW.displayTimeMs = FRAME.timeMs;
      VIEW.presentationRevision = this.presentationRevision;
      const PREVIOUS = this.previousCaptureTimeMs, LATEST = this.latestCaptureTimeMs, SPAN = LATEST - PREVIOUS, DIAGNOSTICS = VIEW.presentationDiagnostics;
      DIAGNOSTICS.timeMs = FRAME.timeMs;
      DIAGNOSTICS.latestSnapshotTimeMs = LATEST;
      DIAGNOSTICS.previousSnapshotTimeMs = PREVIOUS;
      DIAGNOSTICS.intervalMs = SPAN;
      DIAGNOSTICS.sampleAgeMs = LATEST - FRAME.timeMs;
      DIAGNOSTICS.renderFraction = PREVIOUS === null || SPAN <= 0 ? null : Math.max(0, Math.min(1, (FRAME.timeMs - PREVIOUS) / SPAN));
      DIAGNOSTICS.captureSequence = this.presentationSequence;
      DIAGNOSTICS.revision = this.presentationRevision;
      this.latestPresentationDiagnostics = DIAGNOSTICS;
      return VIEW;
    }
    pulse(now) {
      this.pulseTimestamp = now;
      this.currentPulseCapped = false;
      this.pendingPulsePresentationMode = null;
      const PREVIOUS_TICK = this.tick, STEP_LOOP_START = this.profiler?.start();
      try {
        this.loop.pulse(now, {
          render: false
        });
      } finally {
        this.profiler?.end("stepLoop", STEP_LOOP_START);
      }
      this.currentPulseCapped = false;
      const CAPTURE_MODE = this.pendingPulsePresentationMode;
      this.pendingPulsePresentationMode = null;
      if (CAPTURE_MODE) {
        const PULSE_CAPTURE_START = this.profiler?.start();
        try {
          this.capturePresentation(CAPTURE_MODE);
        } finally {
          this.profiler?.end("pulseCapture", PULSE_CAPTURE_START);
        }
      }
      this.profiler?.count("catchupTicks", Math.max(0, this.tick - PREVIOUS_TICK - 1));
    }
    dispose() {
      this.closed = true;
      this.unsubscribeNotices?.();
      this.unsubscribeNotices = null;
      this.noticeWorld = null;
      this.pendingNotices.length = 0;
      this.presentationNotices.length = 0;
      this.loop.stop();
      this.pending.length = 0;
      this.captureEntities.length = 0;
      this.presentationAdapters = /* @__PURE__ */ new WeakMap();
    }
  };

  // src/farm-app.js
  init_farm_storage();

  // src/farm-autosave.js
  var FARM_AUTOSAVE_DEBOUNCE_MS = 1e3;
  var FARM_AUTOSAVE_MAX_WAIT_MS = 1e4;
  var FarmAutosave = class {
    constructor(save, {
      debounceMs = FARM_AUTOSAVE_DEBOUNCE_MS,
      maxWaitMs = FARM_AUTOSAVE_MAX_WAIT_MS,
      now = () => globalThis.performance.now(),
      setTimer = (fn, delay) => globalThis.setTimeout(fn, delay),
      clearTimer = (id) => globalThis.clearTimeout(id)
    } = {}) {
      this.save = save;
      this.debounceMs = debounceMs;
      this.maxWaitMs = maxWaitMs;
      this.now = now;
      this.setTimer = setTimer;
      this.clearTimer = clearTimer;
      this.timer = null;
      this.dirty = false;
      this.dirtySince = 0;
      this.deadline = 0;
      this.timerDeadline = 0;
      this.onTimer = () => {
        this.timer = null;
        const REMAINING = this.deadline - this.now();
        if (REMAINING > 0) {
          this.schedule(REMAINING);
        } else {
          this.flush();
        }
      };
    }
    markDirty() {
      const NOW = this.now();
      if (!this.dirty) {
        this.dirty = true;
        this.dirtySince = NOW;
      }
      const REMAINING = Math.max(0, this.maxWaitMs - (NOW - this.dirtySince));
      this.deadline = NOW + Math.min(this.debounceMs, REMAINING);
      if (this.timer === null || this.deadline < this.timerDeadline) {
        this.cancelTimer();
        this.schedule(Math.max(0, this.deadline - NOW));
      }
    }
    flush() {
      this.cancelTimer();
      if (!this.dirty) {
        return true;
      }
      let saved;
      try {
        saved = this.save() !== false;
      } catch {
        saved = false;
      }
      if (saved) {
        this.reset();
      } else {
        this.dirtySince = this.now();
      }
      return saved;
    }
    schedule(delay) {
      this.timerDeadline = this.now() + delay;
      this.timer = this.setTimer(this.onTimer, delay);
    }
    reset() {
      this.cancelTimer();
      this.dirty = false;
      this.dirtySince = 0;
      this.deadline = 0;
      this.timerDeadline = 0;
    }
    cancelTimer() {
      if (this.timer !== null) {
        this.clearTimer(this.timer);
        this.timer = null;
      }
    }
  };

  // src/farm-state.js
  init_farm_model();

  // src/farm-snapshot-validation.js
  init_formation_skill_state();
  init_farm_model();
  init_player_progression();
  init_ability_state();
  init_unit_abilities();

  // src/raid-settlement.js
  init_unit_grades();
  init_factions();
  init_species_catalog();
  init_farm_boss_stages();
  init_boss_rewards();
  var RAID_SLEEP_SECONDS = 60;
  var RAID_SETTLEMENT_RECEIPT_LIMIT = 128;
  var FAIL2 = (message) => {
    throw new TypeError(message);
  };
  var IS_NON_EMPTY_STRING = (value) => typeof value === "string" && value.trim().length > 0;
  var IS_COUNT = (value) => Number.isSafeInteger(value) && value >= 0;
  function ledgerState(farm) {
    const NEXT_SEQUENCE = farm.nextRaidRunSequence ?? 0;
    const WATERMARK = farm.raidSettlementWatermark ?? 0;
    const ACTIVE_SEQUENCE = farm.activeRaidRunSequence ?? null;
    const ACTIVE_SESSION_ID = farm.activeRaidSessionId ?? null;
    const RECEIPTS = farm.raidSettlementReceipts ?? [];
    if (!IS_COUNT(NEXT_SEQUENCE) || !IS_COUNT(WATERMARK) || WATERMARK > NEXT_SEQUENCE || ACTIVE_SEQUENCE !== null && (!Number.isSafeInteger(ACTIVE_SEQUENCE) || ACTIVE_SEQUENCE < 1) || ACTIVE_SESSION_ID !== null && !IS_NON_EMPTY_STRING(ACTIVE_SESSION_ID) || !Array.isArray(RECEIPTS) || ACTIVE_SEQUENCE === null !== (ACTIVE_SESSION_ID === null)) {
      FAIL2("Private Farm Raid settlement ledger is invalid");
    }
    if (ACTIVE_SEQUENCE === null && NEXT_SEQUENCE !== WATERMARK || ACTIVE_SEQUENCE !== null && (ACTIVE_SEQUENCE !== NEXT_SEQUENCE || ACTIVE_SEQUENCE !== WATERMARK + 1)) {
      FAIL2("Private Farm Raid run sequence is inconsistent");
    }
    return {
      nextSequence: NEXT_SEQUENCE,
      watermark: WATERMARK,
      activeSequence: ACTIVE_SEQUENCE,
      activeSessionId: ACTIVE_SESSION_ID,
      receipts: RECEIPTS
    };
  }
  function ownerRoster(raidWorld, ownerId) {
    if (!raidWorld || typeof raidWorld !== "object" || !Array.isArray(raidWorld.raidRosters) || !Array.isArray(raidWorld.units) || !IS_NON_EMPTY_STRING(ownerId)) {
      FAIL2("A Raid world, roster array, unit array, and owner ID are required");
    }
    const OWNER_ROSTERS = raidWorld.raidRosters.filter((roster) => roster?.ownerId === ownerId);
    if (OWNER_ROSTERS.length !== 1 || !Array.isArray(OWNER_ROSTERS[0].troops)) {
      FAIL2("The Raid must contain exactly one roster for this owner");
    }
    return OWNER_ROSTERS[0];
  }
  function raidSettlementKey({ ownerId, sessionId, encounterId } = {}) {
    if (!IS_NON_EMPTY_STRING(ownerId) || !IS_NON_EMPTY_STRING(sessionId) || !(IS_NON_EMPTY_STRING(encounterId) || Number.isSafeInteger(encounterId) && encounterId > 0)) {
      FAIL2("A Raid owner, stable session ID, and encounter ID are required");
    }
    return `raid:${JSON.stringify([ownerId, sessionId, encounterId])}`;
  }
  function isBattleOnlySummon(unit) {
    return unit?.isBattleOnlySummon === true || unit?.battleSummonKind !== void 0 && unit.battleSummonKind !== "" || unit?.battleSummonParentId !== void 0 && unit.battleSummonParentId !== 0;
  }
  function raidOwnerManifest(raidWorld, ownerId) {
    const ROSTER2 = ownerRoster(raidWorld, ownerId);
    const MANIFEST = /* @__PURE__ */ new Map();
    for (const TROOP of ROSTER2.troops) {
      if (!TROOP || !Number.isSafeInteger(TROOP.farmId) || TROOP.farmId < 1 || !Number.isInteger(TROOP.species) || TROOP.species < 0 || TROOP.species >= SPECIES_COUNT || !isValidUnitTier(TROOP.tier) || typeof TROOP.deployed !== "boolean" || MANIFEST.has(TROOP.farmId)) {
        FAIL2("The owner Raid roster must have unique Farm IDs and valid deployed entries");
      }
      MANIFEST.set(TROOP.farmId, TROOP);
    }
    const OWNER_UNITS = raidWorld.units.filter((unit) => unit?.ownerId === ownerId);
    if (OWNER_UNITS.some((unit) => !hasFaction(unit, FACTION_CONFIG.PLAYER))) {
      FAIL2("An enemy-faction actor cannot enter an owner’s Farm settlement");
    }
    const OWNER_UNITS_BY_ID = /* @__PURE__ */ new Map();
    for (const UNIT3 of OWNER_UNITS) {
      if (!Number.isSafeInteger(UNIT3.id) || UNIT3.id < 1 || OWNER_UNITS_BY_ID.has(UNIT3.id) || !Number.isFinite(UNIT3.hp) || UNIT3.hp < 0) {
        FAIL2("The owner Raid units must have unique IDs and valid health");
      }
      OWNER_UNITS_BY_ID.set(UNIT3.id, UNIT3);
    }
    const ORIGINAL_UNITS_BY_FARM_ID = /* @__PURE__ */ new Map();
    const DEAD_FARM_UNIT_IDS = [];
    for (const UNIT3 of OWNER_UNITS) {
      if (isBattleOnlySummon(UNIT3)) {
        const PARENT = OWNER_UNITS_BY_ID.get(UNIT3.battleSummonParentId);
        const PARENT_TROOP = PARENT && MANIFEST.get(PARENT.farmId);
        const VALID_SPLIT = hasFaction(UNIT3, FACTION_CONFIG.PLAYER) && UNIT3.isBattleOnlySummon === true && UNIT3.battleSummonKind === "peanut-death-split" && Number.isSafeInteger(UNIT3.battleSummonParentId) && UNIT3.battleSummonParentId > 0 && Number.isSafeInteger(UNIT3.battleSummonParentGeneration) && UNIT3.battleSummonParentGeneration > 0 && PARENT && PARENT.ownerId === ownerId && !isBattleOnlySummon(PARENT) && PARENT.hp <= 0 && PARENT_TROOP?.deployed === true && PARENT.farmId === UNIT3.farmId && PARENT.generation === UNIT3.battleSummonParentGeneration && PARENT.species === 4 && UNIT3.species === 4 && UNIT3.tier === 1 && UNIT3.canSplit === false && UNIT3.countsTowardPermanentRoster === false && UNIT3.eligibleForRaidDeployment === false && UNIT3.breedingEligible === false && UNIT3.mergeEligible === false && UNIT3.usesPersistentSleep === false;
        if (!VALID_SPLIT) {
          FAIL2("A battle-only Raid split is missing its validated origin marker");
        }
        continue;
      }
      const TROOP = MANIFEST.get(UNIT3.farmId);
      if (!TROOP || !TROOP.deployed || TROOP.species !== UNIT3.species || TROOP.tier !== UNIT3.tier || ORIGINAL_UNITS_BY_FARM_ID.has(UNIT3.farmId)) {
        FAIL2("A Raid unit does not match this owner’s deployed roster");
      }
      ORIGINAL_UNITS_BY_FARM_ID.set(UNIT3.farmId, UNIT3);
      if (UNIT3.hp <= 0) {
        DEAD_FARM_UNIT_IDS.push(UNIT3.farmId);
      }
    }
    for (const [FARM_ID, TROOP] of MANIFEST) {
      if (TROOP.deployed && !ORIGINAL_UNITS_BY_FARM_ID.has(FARM_ID)) {
        FAIL2("A deployed original Farm unit is missing from this owner’s Raid world");
      }
    }
    return {
      roster: ROSTER2,
      manifest: MANIFEST,
      deadFarmUnitIds: DEAD_FARM_UNIT_IDS.sort((a, b) => a - b),
      availableAtStart: ROSTER2.troops.length,
      originalUnitsDeployed: ROSTER2.troops.filter((troop) => troop.deployed).length
    };
  }
  function raidDeploymentRewardMultiplier({ availableAtStart, originalUnitsDeployed } = {}) {
    if (!IS_COUNT(availableAtStart) || !IS_COUNT(originalUnitsDeployed) || originalUnitsDeployed > availableAtStart) {
      FAIL2(
        "Raid deployment counts must be non-negative integers and original deployed cannot exceed the starting roster"
      );
    }
    if (availableAtStart === 0 || originalUnitsDeployed === 0) {
      return 0;
    }
    return Math.min(2, Math.max(1, 1 + (availableAtStart - originalUnitsDeployed) / availableAtStart));
  }
  function clone(value) {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  }
  function validateReturnedPrivateFarm(sourceFarm, resultFarm, sleptFarmUnitIds) {
    if (sourceFarm.ownerId !== void 0 && resultFarm.ownerId !== sourceFarm.ownerId) {
      FAIL2("The Raid victory resolver returned a different owner Farm");
    }
    const ORIGINAL_UNITS = new Map(sourceFarm.units.map((unit) => [unit.id, unit]));
    const RESULT_UNITS = /* @__PURE__ */ new Map();
    for (const UNIT3 of resultFarm.units) {
      if (!UNIT3 || !Number.isSafeInteger(UNIT3.id) || UNIT3.id < 1 || RESULT_UNITS.has(UNIT3.id)) {
        FAIL2("The Raid victory resolver returned invalid or duplicate private Farm units");
      }
      RESULT_UNITS.set(UNIT3.id, UNIT3);
    }
    for (const [UNIT_ID, ORIGINAL] of ORIGINAL_UNITS) {
      const RESULT = RESULT_UNITS.get(UNIT_ID);
      if (!RESULT || RESULT.species !== ORIGINAL.species || RESULT.tier !== ORIGINAL.tier) {
        FAIL2("The Raid victory resolver did not preserve the owner’s Farm roster");
      }
    }
    for (const UNIT_ID of sleptFarmUnitIds) {
      const UNIT3 = RESULT_UNITS.get(UNIT_ID);
      if (!UNIT3 || UNIT3.hp !== 0 || UNIT3.down !== RAID_SLEEP_SECONDS) {
        FAIL2("The Raid victory resolver must preserve the owner Farm’s casualty sleep");
      }
    }
  }
  function reserveRaidRun(farm, { sessionId = null } = {}) {
    if (!farm || typeof farm !== "object" || Array.isArray(farm) || !Array.isArray(farm.units)) {
      FAIL2("A private Farm snapshot with a units array is required");
    }
    const LEDGER = ledgerState(farm);
    if (LEDGER.activeSequence !== null) {
      if (sessionId !== null && sessionId !== LEDGER.activeSessionId) {
        FAIL2("This Farm already has a different active Raid; reconnect to it or settle it first");
      }
      return {
        farm,
        runSequence: LEDGER.activeSequence,
        sessionId: LEDGER.activeSessionId,
        resumed: true
      };
    }
    if (sessionId !== null && !IS_NON_EMPTY_STRING(sessionId)) {
      FAIL2("Raid session ID must be a non-empty string");
    }
    const RUN_SEQUENCE = LEDGER.nextSequence + 1;
    const STABLE_SESSION_ID = sessionId ?? `farm-raid-${RUN_SEQUENCE}`;
    const NEXT_FARM = clone(farm);
    NEXT_FARM.nextRaidRunSequence = RUN_SEQUENCE;
    NEXT_FARM.activeRaidRunSequence = RUN_SEQUENCE;
    NEXT_FARM.activeRaidSessionId = STABLE_SESSION_ID;
    NEXT_FARM.raidSettlementWatermark = LEDGER.watermark;
    NEXT_FARM.raidSettlementReceipts = [...LEDGER.receipts];
    return {
      farm: NEXT_FARM,
      runSequence: RUN_SEQUENCE,
      sessionId: STABLE_SESSION_ID,
      resumed: false
    };
  }
  function abortReservedRaidRun(farm, { completedAtMs = null } = {}) {
    if (!farm || typeof farm !== "object" || Array.isArray(farm) || !Array.isArray(farm.units)) {
      FAIL2("A private Farm snapshot with a units array is required");
    }
    if (completedAtMs !== null && (!Number.isFinite(completedAtMs) || completedAtMs < 0)) {
      FAIL2("Settlement timestamp must be a non-negative finite number");
    }
    const LEDGER = ledgerState(farm);
    if (LEDGER.activeSequence === null) {
      return {
        farm,
        receipt: null,
        applied: false
      };
    }
    const OWNER_ID = "recovery-abort";
    const { activeSequence: RUN_SEQUENCE, activeSessionId: SESSION_ID } = LEDGER;
    const RECEIPT = {
      key: raidSettlementKey({
        ownerId: OWNER_ID,
        sessionId: SESSION_ID,
        encounterId: RUN_SEQUENCE
      }),
      ownerId: OWNER_ID,
      sessionId: SESSION_ID,
      encounterId: RUN_SEQUENCE,
      runSequence: RUN_SEQUENCE,
      outcome: "aborted",
      status: "settled",
      completedAtMs,
      sleptFarmUnitIds: [],
      availableAtStart: 0,
      originalUnitsDeployed: 0,
      deploymentMultiplier: 0,
      reward: null
    };
    const NEXT_FARM = clone(farm);
    NEXT_FARM.activeRaidRunSequence = null;
    NEXT_FARM.activeRaidSessionId = null;
    NEXT_FARM.raidSettlementWatermark = RUN_SEQUENCE;
    NEXT_FARM.raidSettlementReceipts = [...LEDGER.receipts, RECEIPT].slice(-RAID_SETTLEMENT_RECEIPT_LIMIT);
    return {
      farm: NEXT_FARM,
      receipt: clone(RECEIPT),
      applied: true
    };
  }
  function settleRaidOwnerFarm(farm, { ownerId, sessionId, encounterId, runSequence, outcome, raidWorld, completedAtMs, settleVictory = null } = {}) {
    if (!farm || typeof farm !== "object" || Array.isArray(farm) || !Array.isArray(farm.units)) {
      FAIL2("A private Farm snapshot with a units array is required");
    }
    const KEY2 = raidSettlementKey({
      ownerId,
      sessionId,
      encounterId
    });
    if (!["victory", "defeat", "aborted"].includes(outcome)) {
      FAIL2("Raid outcome must be victory, defeat, or aborted");
    }
    if (!Number.isSafeInteger(runSequence) || runSequence < 1) {
      FAIL2("A positive Farm-local Raid run sequence is required");
    }
    if (settleVictory !== null && typeof settleVictory !== "function") {
      FAIL2("settleVictory must be a function");
    }
    if (completedAtMs !== void 0 && (!Number.isFinite(completedAtMs) || completedAtMs < 0)) {
      FAIL2("Settlement timestamp must be a non-negative finite number");
    }
    const LEDGER = ledgerState(farm);
    if (runSequence <= LEDGER.watermark) {
      const PREVIOUS = LEDGER.receipts.find((receipt) => receipt?.key === KEY2);
      return {
        farm,
        receipt: clone(
          PREVIOUS || {
            key: KEY2,
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
          }
        ),
        applied: false
      };
    }
    if (runSequence !== LEDGER.watermark + 1 || LEDGER.activeSequence !== runSequence || LEDGER.activeSessionId !== sessionId) {
      FAIL2("Raid settlement does not match the active Farm-local run");
    }
    const RAID_STAGE = raidWorld?.boss?.stage, HIGHEST_CLEARED_STAGE = farm.farmBossProgress?.highestClearedRaidStage;
    if (!Number.isSafeInteger(HIGHEST_CLEARED_STAGE) || HIGHEST_CLEARED_STAGE < 0 || HIGHEST_CLEARED_STAGE > BOSS_REWARD_SETTINGS.maxStage || (outcome !== "aborted" || RAID_STAGE !== void 0) && (!Number.isSafeInteger(RAID_STAGE) || RAID_STAGE < 1 || RAID_STAGE > BOSS_REWARD_SETTINGS.maxStage) || Number.isSafeInteger(RAID_STAGE) && RAID_STAGE > HIGHEST_CLEARED_STAGE + 1) {
      FAIL2("Raid stage is locked or the private stage progress is invalid");
    }
    const FIRST_CLEAR = outcome === "victory" && RAID_STAGE > HIGHEST_CLEARED_STAGE;
    const RAID_OWNER = raidOwnerManifest(raidWorld, ownerId);
    const {
      manifest: MANIFEST,
      deadFarmUnitIds: DEAD_FARM_UNIT_IDS,
      availableAtStart: AVAILABLE_AT_START,
      originalUnitsDeployed: ORIGINAL_UNITS_DEPLOYED
    } = RAID_OWNER;
    const UNITS_BY_FARM_ID = /* @__PURE__ */ new Map();
    for (const UNIT3 of farm.units) {
      if (!UNIT3 || !Number.isSafeInteger(UNIT3.id) || UNIT3.id < 1 || UNITS_BY_FARM_ID.has(UNIT3.id)) {
        FAIL2("Private Farm units must have unique positive IDs");
      }
      UNITS_BY_FARM_ID.set(UNIT3.id, UNIT3);
    }
    for (const [FARM_UNIT_ID, TROOP] of MANIFEST) {
      const FARM_UNIT = UNITS_BY_FARM_ID.get(FARM_UNIT_ID);
      if (!FARM_UNIT || FARM_UNIT.species !== TROOP.species || FARM_UNIT.tier !== TROOP.tier) {
        FAIL2("The Raid roster no longer matches this owner’s private Farm units");
      }
    }
    for (const FARM_UNIT_ID of DEAD_FARM_UNIT_IDS) {
      if (!UNITS_BY_FARM_ID.has(FARM_UNIT_ID)) {
        FAIL2("A dead Raid unit does not belong to this owner Farm");
      }
    }
    let privateFarm = clone(farm);
    privateFarm.raidSettlementReceipts = Array.isArray(privateFarm.raidSettlementReceipts) ? privateFarm.raidSettlementReceipts : [];
    const DEAD_SET = new Set(DEAD_FARM_UNIT_IDS);
    for (const UNIT3 of privateFarm.units) {
      if (!DEAD_SET.has(UNIT3.id)) {
        continue;
      }
      UNIT3.hp = 0;
      UNIT3.down = RAID_SLEEP_SECONDS;
    }
    let rewardSummary = null;
    let deploymentMultiplier = 0;
    if (outcome === "victory") {
      deploymentMultiplier = raidDeploymentRewardMultiplier({
        availableAtStart: AVAILABLE_AT_START,
        originalUnitsDeployed: ORIGINAL_UNITS_DEPLOYED
      });
      if (deploymentMultiplier > 0) {
        if (settleVictory === null) {
          FAIL2("A reward-capable Raid victory needs the common reward/progression resolver");
        }
        const RESOLUTION = settleVictory({
          farm: privateFarm,
          ownerId,
          sessionId,
          encounterId,
          receiptKey: KEY2,
          source: "raid",
          stage: RAID_STAGE,
          firstClear: FIRST_CLEAR,
          deploymentMultiplier
        });
        if (!RESOLUTION || !RESOLUTION.farm || typeof RESOLUTION.farm !== "object" || Array.isArray(RESOLUTION.farm) || !Array.isArray(RESOLUTION.farm.units)) {
          FAIL2("The Raid victory resolver must return a private Farm snapshot and summary");
        }
        validateReturnedPrivateFarm(farm, RESOLUTION.farm, DEAD_FARM_UNIT_IDS);
        privateFarm = clone(RESOLUTION.farm);
        rewardSummary = RESOLUTION.summary ?? null;
      }
      if (RAID_STAGE > privateFarm.farmBossProgress.highestClearedRaidStage) {
        privateFarm.farmBossProgress.highestClearedRaidStage = RAID_STAGE;
        privateFarm.farmBossProgress.currentStage = Math.min(RAID_STAGE + 1, BOSS_REWARD_SETTINGS.maxStage);
      }
    }
    if (outcome === "victory" || outcome === "defeat") {
      advanceFarmBossEncounterEpoch(privateFarm.farmBossProgress);
    }
    const RECEIPT = {
      key: KEY2,
      ownerId,
      sessionId,
      encounterId,
      runSequence,
      outcome,
      status: "settled",
      completedAtMs: completedAtMs ?? null,
      sleptFarmUnitIds: [...DEAD_FARM_UNIT_IDS].sort((a, b) => a - b),
      availableAtStart: AVAILABLE_AT_START,
      originalUnitsDeployed: ORIGINAL_UNITS_DEPLOYED,
      deploymentMultiplier,
      reward: rewardSummary === null ? null : clone(rewardSummary)
    };
    privateFarm.nextRaidRunSequence = LEDGER.nextSequence;
    privateFarm.activeRaidRunSequence = null;
    privateFarm.activeRaidSessionId = null;
    privateFarm.raidSettlementWatermark = runSequence;
    privateFarm.raidSettlementReceipts = [...LEDGER.receipts, RECEIPT].slice(-RAID_SETTLEMENT_RECEIPT_LIMIT);
    return {
      farm: privateFarm,
      receipt: clone(RECEIPT),
      applied: true
    };
  }

  // src/farm-snapshot-validation.js
  init_unit_grades();
  init_boss_patterns();
  init_boss_rewards();
  init_factions();

  // src/farm-snapshot.js
  init_formation_skill_state();
  init_ability_state();
  init_raid_deployment_cards();
  init_farm_plot();
  var UNIT_SNAPSHOT_SHAPE = {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    angle: 0,
    stun: 0,
    flash: 0,
    bounce: 0,
    ability: {
      phase: "idle",
      elapsed: 0,
      action: null
    },
    specialAbility: null,
    kidneyLeapReadyTick: 0,
    kidneyLeapLastUseTick: 0,
    peaRecoveryPending: false,
    peaRecoveryBoostExpiresAtTick: 0,
    peaRecoveryBoostMultiplier: 0,
    id: 1,
    generation: 1,
    species: 0,
    tier: 1,
    permanentStatMultiplier: 1,
    faction: "player",
    meals: 0,
    growth: 0,
    growthElapsed: 0,
    growthDuration: 5,
    age: 0,
    cooldown: 0,
    cooldownDuration: 0,
    mateId: 0,
    perceptionRange: 18,
    home: {
      x: 0,
      y: 0
    },
    hp: 40,
    down: 0,
    seed: 2.39996,
    ownerId: "",
    farmId: 0,
    plotId: INITIAL_FARM_PLOT_ID,
    dropLanded: true,
    isBattleOnlySummon: false,
    battleSummonKind: "",
    battleSummonParentId: 0,
    battleSummonParentGeneration: 0,
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
    chestnutNextThornTick: 0,
    landingRecovery: 0,
    walnutNextGuardTick: 0,
    walnutGuardUntilTick: 0,
    walnutStoredRawDamage: 0,
    wheatCommandUntil: 0,
    wheatCommandCritBonus: 0,
    wheatCommandBuffs: [],
    barleyArmorBreakUntil: 0,
    barleyArmorBreakReduction: 0,
    barleyArmorShredBuckets: Array.from({ length: 60 }, () => ({ expiresAtTick: 0, amount: 0 })),
    giantUntil: 0,
    giantEndedAt: -10,
    isFormationClone: false,
    cloneBornAt: -10
  };
  var STARTER_UNIT = (id, x, y) => ({
    ...UNIT_SNAPSHOT_SHAPE,
    id,
    generation: id,
    x,
    y,
    home: {
      x,
      y
    },
    seed: id * 2.39996,
    growth: 3,
    growthElapsed: 5,
    ability: {
      phase: "idle",
      elapsed: 0,
      action: null
    }
  });
  var PATTERN_VALUES = (value) => Object.fromEntries(
    [
      "attack.sweep-360",
      "attack.front-slam",
      "attack.charge",
      "attack.leap-slam",
      "attack.fan-sweep",
      "summon.mouth-t1"
    ].map((id) => [id, value])
  );
  var ABILITY_INVESTMENTS = () => createAbilityProgressionState().abilities;
  var FARM_SNAPSHOT_SHAPE = {
    seed: 731,
    notices: [],
    eventSequence: 0,
    mergeTasks: [],
    corpseRecoveryVersion: 1,
    rng: {
      state: 3031296687
    },
    units: [
      STARTER_UNIT(1, 1.7868577390909195, -0.7556014072615653),
      STARTER_UNIT(2, -1.5288560669869184, -0.5486694728024304)
    ],
    food: [],
    farmPlots: [{ id: INITIAL_FARM_PLOT_ID, food: [] }],
    effects: [],
    events: [],
    time: 0,
    simulationTick: 0,
    nextId: 3,
    nextBossEncounterId: 1,
    bossRewardReceipts: [],
    bossRewardStreams: {
      normal: { rngState: 0, distributionState: null, payoutRngState: 0 },
      event: { rngState: 0, distributionState: null, payoutRngState: 0 },
      firstClear: { rngState: 0, distributionState: null, payoutRngState: 0 }
    },
    bossRewardInventory: [],
    bossRewardWatermarks: {
      farm: 0,
      raid: 0
    },
    nextRaidRunSequence: 0,
    activeRaidRunSequence: null,
    activeRaidSessionId: null,
    raidSettlementWatermark: 0,
    raidSettlementReceipts: [],
    formationRuntime: createFormationRuntime(),
    playerProgression: {
      formationSkills: createFormationSkillState(),
      raidDeploymentCards: createRaidDeploymentCardsState({ firstSpecies: null }),
      schemaVersion: 2,
      availablePoints: 0,
      farmUpgrades: {
        food: 0,
        growth: 0,
        breed: 0,
        merge: 0
      },
      farmPlots: createFarmPlotsProgression(),
      abilities: ABILITY_INVESTMENTS(),
      level: 1,
      experience: 0,
      farmBossEventStage: 1,
      processedBossKillReceipts: []
    },
    starter: 0,
    foodTaps: {
      remainder: 0,
      autoClock: 0,
      produced: 0,
      revision: 0
    },
    projectiles: [],
    entityGenerationSerial: 2,
    cornAttachments: {
      nextGroupId: 1,
      nextAttachmentId: 1,
      groups: []
    },
    attackSerial: 0,
    projectileSerial: 0,
    raidSummonSerial: 0,
    bossSummonSerial: 0,
    combatLog: [],
    farmBossProgress: {
      currentStage: 1,
      highestClearedRaidStage: 0,
      encounterSeed: 2738959287,
      encounterEpoch: 0,
      nextSelectionId: 1,
      selections: []
    },
    scene: "farm",
    running: false,
    encounter: {
      outcome: "idle",
      elapsed: 0
    },
    farmBossEvent: {
      phase: "idle",
      elapsed: 0,
      outcome: "idle",
      encounterId: 0,
      rewardStatus: "none",
      rewardChance: 0,
      rewardRoll: 0,
      rewardUnitId: 0
    },
    boss: {
      x: 0,
      y: 0,
      faction: "enemy",
      z: 0,
      generation: 3,
      radius: 4.4,
      height: 5.2,
      hp: 2e3,
      maxHp: 2e3,
      species: 3,
      attackPower: 4,
      stage: 0,
      moveSpeed: 2.65,
      encounterId: 0,
      active: false,
      angle: 0,
      facing: 0,
      flash: 0,
      swings: 0,
      basicCount: 0,
      attackId: 0,
      sweepClock: 0,
      startAngle: 0,
      travel: 0,
      patternRuntime: {
        weights: PATTERN_VALUES(1),
        cooldowns: PATTERN_VALUES(0),
        active: null,
        encounterElapsed: 0
      },
      stun: 0,
      knockVx: 0,
      knockVy: 0,
      airborneRecovery: 0,
      barleyArmorBreakUntil: 0,
      barleyArmorBreakReduction: 0,
      barleyArmorShredBuckets: Array.from({ length: 60 }, () => ({ expiresAtTick: 0, amount: 0 })),
      summonMouth: {
        x: 0,
        y: 0,
        z: 0
      }
    },
    raidExpectedPlayers: ["solo"],
    raidRosters: [],
    raidDeploymentStarted: false,
    metrics: {
      births: 0,
      merges: 0,
      directHits: 0,
      contacts: 0,
      landings: 0,
      basicHits: 0,
      sweepHits: 0
    }
  };
  var FIELDS = (names, nested = {}) => ({
    ...Object.fromEntries(
      names.split(" ").filter(Boolean).map((key) => [key, true])
    ),
    ...nested
  });
  function shapeFields(shape2, nested = {}) {
    return Object.fromEntries(
      Object.entries(shape2).map(([key, value]) => [
        key,
        nested[key] ?? (Array.isArray(value) ? [true] : value && typeof value === "object" ? shapeFields(value) : true)
      ])
    );
  }
  var POINT = FIELDS("x y z id generation");
  var PATH = FIELDS("height duration", {
    from: POINT,
    to: POINT
  });
  var JSON_PAYLOAD = /* @__PURE__ */ Symbol("json-payload");
  var ATTACK = FIELDS(
    "id targetId targetGeneration hit resolvedMask hitMask peanutStrikeCount peanutAttackMultiplier peanutSpreadRadians leapDepartureCommitted leapCooldownResetApplied thornTargetId thornTargetGeneration thornShotsRemaining thornNextShotTick thornShotIndex",
    {
      target: POINT,
      path: PATH,
      pendingShots: [FIELDS("shotIndex delaySeconds attackMultiplier")],
      projectileAbility: {
        effect: FIELDS("abilityId", { config: JSON_PAYLOAD })
      },
      thornConfig: JSON_PAYLOAD
    }
  );
  var UNIT2 = shapeFields(UNIT_SNAPSHOT_SHAPE, {
    ability: {
      phase: true,
      elapsed: true,
      action: ATTACK
    },
    specialAbility: {
      phase: true,
      elapsed: true,
      action: ATTACK
    },
    wheatCommandBuffs: [FIELDS("level expiresAtTick")],
    barleyArmorShredBuckets: [FIELDS("expiresAtTick amount")]
  });
  var BOSS_ACTION = FIELDS("id phase phaseElapsed targetId aim locked traveled volleyCount released nextRelease", {
    target: POINT,
    start: POINT,
    path: PATH,
    hitIds: [true],
    landingPoints: [POINT]
  });
  var BOSS = shapeFields(FARM_SNAPSHOT_SHAPE.boss, {
    patternRuntime: shapeFields(FARM_SNAPSHOT_SHAPE.boss.patternRuntime, {
      active: BOSS_ACTION
    }),
    barleyArmorShredBuckets: [FIELDS("expiresAtTick amount")]
  });
  var REWARD = FIELDS(
    "encounterId source receiptKey acquisitionMultiplier stage species tier x y firstClear chance baselineChance roll unitId rollBudget bonusRollChance rollCount boxCount successCount acquiredCount grantedCount placedCount queuedCount status xpReceiptKey xpStatus xpAmount levelsGained pointsAwarded",
    {
      calculation: JSON_PAYLOAD
    }
  );
  var SETTLEMENT = FIELDS(
    "key ownerId sessionId encounterId runSequence outcome status completedAtMs availableAtStart originalUnitsDeployed deploymentMultiplier",
    {
      sleptFarmUnitIds: [true],
      reward: JSON_PAYLOAD
    }
  );
  var PROGRESSION = shapeFields(FARM_SNAPSHOT_SHAPE.playerProgression, {
    farmPlots: {
      plots: [FIELDS("id capacityLevel")],
      currentPlotId: true,
      nextPlotNumber: true,
      targetBasisPoints: [true]
    }
  });
  var RUNTIME_PROGRESSION = FIELDS("schemaVersion level availablePoints", {
    farmUpgrades: PROGRESSION.farmUpgrades,
    abilities: PROGRESSION.abilities,
    formationSkills: PROGRESSION.formationSkills,
    raidDeploymentCards: PROGRESSION.raidDeploymentCards
  });
  var ROSTER = FIELDS(
    "ownerId settlementSessionId settlementRunSequence settlementEncounterId lastDeploySequence buffUntil buffReadyAt",
    {
      troops: [FIELDS("farmId species tier deployed")],
      deploymentCardSpecies: [true],
      abilitySnapshot: RUNTIME_PROGRESSION
    }
  );
  var PROJECTILE = FIELDS(
    "isFormationClone id owner ownerGeneration targetId targetGeneration faction ownerId species tier elapsed x y z radius height hit attackMultiplier shotIndex projectileKind fanIndex",
    {
      path: PATH,
      attackPayload: JSON_PAYLOAD,
      cornPayload: JSON_PAYLOAD,
      abilityEffect: JSON_PAYLOAD
    }
  );
  var CORN_ATTACHMENT = FIELDS(
    "id groupId targetId targetGeneration ownerId ownerGeneration damageMultiplier status fadeTicks angle offsetX offsetY",
    { payload: JSON_PAYLOAD }
  );
  var CORN_GROUP = FIELDS(
    "id targetId targetGeneration targetX targetY targetZ firstAttachTick closeAtTick nextExplosionTick status",
    { attachments: [CORN_ATTACHMENT] }
  );
  var SNAPSHOT_FIELDS = shapeFields(FARM_SNAPSHOT_SHAPE, {
    farmPlots: [FIELDS("id", { food: [FIELDS("x y z vx vy vz seed phase tx ty")] })],
    formationRuntime: JSON_PAYLOAD,
    units: [UNIT2],
    boss: BOSS,
    playerProgression: PROGRESSION,
    raidRosters: [ROSTER],
    projectiles: [PROJECTILE],
    cornAttachments: FIELDS("nextGroupId nextAttachmentId", { groups: [CORN_GROUP] }),
    bossRewardReceipts: [REWARD],
    bossRewardStreams: JSON_PAYLOAD,
    bossRewardInventory: [FIELDS("species tier count")],
    raidSettlementReceipts: [SETTLEMENT],
    food: [FIELDS("x y z vx vy vz seed phase tx ty")],
    events: [JSON_PAYLOAD],
    effects: [JSON_PAYLOAD],
    notices: [JSON_PAYLOAD],
    combatLog: [JSON_PAYLOAD],
    farmBossProgress: shapeFields(FARM_SNAPSHOT_SHAPE.farmBossProgress, {
      selections: [FIELDS("stage species selectionId")]
    }),
    mergeTasks: [
      FIELDS("phase aId bId elapsed duration resultId sourceSpecies sourceTier centerX centerY centerZ", {
        materialIds: [true],
        startPositions: [FIELDS("id x y z")]
      })
    ]
  });
  function copyJsonPayload(value, depth = 0) {
    if (depth >= 18) {
      throw new TypeError("올바른 농장 저장 데이터가 아니에요.");
    }
    if (value === null || typeof value === "string" || typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? value === 0 ? 0 : value : null;
    }
    if (Array.isArray(value)) {
      return Array.from(value, (item) => item === void 0 ? null : copyJsonPayload(item, depth + 1));
    }
    if (!value || typeof value !== "object" || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
      throw new TypeError("올바른 농장 저장 데이터가 아니에요.");
    }
    return Object.fromEntries(
      Object.entries(value).filter(([, item]) => item !== void 0).map(([key, item]) => [key, copyJsonPayload(item, depth + 1)])
    );
  }
  function copyFields(value, recipe) {
    if (value === null) {
      return null;
    }
    if (recipe === JSON_PAYLOAD) {
      return copyJsonPayload(value);
    }
    if (recipe === true) {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value === 0 ? 0 : value : null;
      }
      if (typeof value === "string" || typeof value === "boolean") {
        return value;
      }
      throw new TypeError("올바른 농장 저장 데이터가 아니에요.");
    }
    if (Array.isArray(recipe)) {
      if (!Array.isArray(value) && !(value instanceof Set)) {
        throw new TypeError("올바른 농장 저장 데이터가 아니에요.");
      }
      return Array.from(value, (item) => copyFields(item, recipe[0]));
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("올바른 농장 저장 데이터가 아니에요.");
    }
    const RESULT = {};
    for (const [KEY2, CHILD] of Object.entries(recipe)) {
      if (Object.hasOwn(value, KEY2) && value[KEY2] !== void 0) {
        RESULT[KEY2] = copyFields(value[KEY2], CHILD);
      }
    }
    return RESULT;
  }
  function snapshot(world) {
    const SOURCE = world?.farmPlots instanceof Map ? {
      ...world,
      farmPlots: [...world.farmPlots.values()].map((plot) => ({ id: plot.id, food: plot.food })),
      ...world.scene === "farm" && world.unitCollection ? { units: world.unitCollection.items } : {}
    } : world;
    return copyFields(SOURCE, SNAPSHOT_FIELDS);
  }

  // src/farm-snapshot-validation.js
  init_definition16();
  var INTEGER2 = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= min && v <= max;
  var VALID_BATTLE_UNIT_ID = (id, bossSummonSerial) => INTEGER2(id, 1, CONFIG.farm.maxUnitId) || INTEGER2(id, CONFIG.boss.summonIdBase + 1, CONFIG.boss.summonIdBase + bossSummonSerial);
  function assertSnapshot(ok) {
    if (!ok) {
      throw new TypeError("올바른 농장 저장 데이터가 아니에요.");
    }
  }
  var ASSERT2 = assertSnapshot;
  var MAX_PEANUT_SPLIT_CHILDREN2 = 2;
  function finiteTree(v, depth = 0, key = "") {
    ASSERT2(depth < 18);
    if (typeof v === "number") {
      const SAFE_COUNTERS = /* @__PURE__ */ new Set([
        "count",
        "queuedCount",
        "acquiredCount",
        "placedCount",
        "rollBudget",
        "rngState",
        "payoutRngState",
        "totalTrials",
        "processedTrials",
        "remainingTrials",
        "successes",
        "consecutiveFailures",
        "pendingTrials"
      ]);
      ASSERT2(
        SAFE_COUNTERS.has(key) ? Number.isSafeInteger(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER : Number.isFinite(v) && Math.abs(v) < 1e13
      );
    } else if (Array.isArray(v)) {
      const MAX = key === "units" ? CONFIG.raid.capacity.battleUnits : key === "projectiles" ? CONFIG.raid.capacity.projectiles : key === "bossRewardReceipts" || key === "processedBossKillReceipts" ? 1e5 : key === "raidSettlementReceipts" ? 128 : 1024;
      ASSERT2(v.length <= MAX);
      v.forEach((x) => finiteTree(x, depth + 1));
    } else if (v && typeof v === "object") {
      for (const [K, X] of Object.entries(v)) {
        ASSERT2(!["__proto__", "constructor", "prototype"].includes(K));
        finiteTree(X, depth + 1, K);
      }
    } else {
      ASSERT2(v === null || typeof v === "boolean" || typeof v === "string" && v.length < 256);
    }
  }
  function shape(v, t, path = "snapshot") {
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
      throw new TypeError(`Invalid farm snapshot object at ${path}.`);
    }
    if (Object.keys(v).length !== Object.keys(t).length) {
      const EXPECTED = Object.keys(t), RECEIVED = Object.keys(v);
      throw new TypeError(
        `Invalid farm snapshot fields at ${path}: expected [${EXPECTED.join(", ")}], received [${RECEIVED.join(", ")}].`
      );
    }
    for (const [K, X] of Object.entries(t)) {
      if (!Object.hasOwn(v, K)) {
        throw new TypeError(`Missing farm snapshot field: ${path}.${K}.`);
      }
      if (X === null) {
        continue;
      }
      if (Array.isArray(X)) {
        if (!Array.isArray(v[K])) {
          throw new TypeError(`Invalid farm snapshot list: ${path}.${K}.`);
        }
        continue;
      }
      if (typeof X === "object") {
        shape(v[K], X, `${path}.${K}`);
      } else {
        if (typeof v[K] !== typeof X) {
          throw new TypeError(`Invalid farm snapshot field: ${path}.${K}.`);
        }
      }
    }
  }
  function validWheatCommandBuffs(buffs) {
    return Array.isArray(buffs) && buffs.length <= 3 && buffs.every(
      (buff) => buff && Number.isSafeInteger(buff.level) && buff.level >= 0 && buff.level <= 2 && INTEGER2(buff.expiresAtTick, 1, 1e12)
    ) && new Set(buffs.map((buff) => buff.level)).size === buffs.length;
  }
  function validBarleyArmorShredBuckets(buckets) {
    return Array.isArray(buckets) && buckets.length === 60 && buckets.every(
      (bucket, index) => bucket && INTEGER2(bucket.expiresAtTick, 0, 1e12) && Number.isFinite(bucket.amount) && bucket.amount >= 0 && (bucket.expiresAtTick === 0 ? bucket.amount === 0 : bucket.amount > 0 && bucket.expiresAtTick % 60 === index)
    );
  }
  function validateSnapshot(raw) {
    finiteTree(raw);
    shape(raw, FARM_SNAPSHOT_SHAPE);
    ASSERT2(isValidFormationRuntime(raw.formationRuntime));
    ASSERT2(
      INTEGER2(raw.seed, 0, 4294967295) && INTEGER2(raw.rng.state, 0, 4294967295) && INTEGER2(raw.simulationTick, 0, 1e12)
    );
    ASSERT2(["farm", "raid"].includes(raw.scene));
    ASSERT2(Array.isArray(raw.mergeTasks) && raw.mergeTasks.length <= CONFIG.farm.capacity.battleUnits);
    const MERGE_TASK_UNIT_IDS = /* @__PURE__ */ new Set(), PENDING_MERGE_COST = new Int32Array(CONFIG.unit.speciesCount);
    for (const T of raw.mergeTasks) {
      ASSERT2(
        raw.scene === "farm" && T && ["approach", "animation"].includes(T.phase) && Number.isFinite(T.elapsed) && T.elapsed >= 0 && Number.isFinite(T.duration) && T.duration > 0 && T.duration <= CONFIG.farm.merge.animationSeconds + 1e-9 && T.elapsed <= T.duration + 1e-9 && Array.isArray(T.materialIds) && T.materialIds.length >= 2 && T.materialIds.length <= CONFIG.farm.merge.maxMaterials && new Set(T.materialIds).size === T.materialIds.length && T.materialIds.every((id) => INTEGER2(id, 1, CONFIG.farm.maxUnitId) && !MERGE_TASK_UNIT_IDS.has(id)) && Number.isFinite(T.centerX) && Number.isFinite(T.centerY) && Number.isFinite(T.centerZ) && T.centerZ >= 0 && Array.isArray(T.startPositions)
      );
      for (const ID of T.materialIds) {
        MERGE_TASK_UNIT_IDS.add(ID);
      }
      if (T.phase === "approach") {
        const MATERIALS = T.materialIds.map((id) => raw.units.find((u) => u.id === id)), FIRST = MATERIALS[0], COST = mergeMaterialCostForTier(FIRST?.tier + 1);
        ASSERT2(
          INTEGER2(T.aId, 1, CONFIG.farm.maxUnitId) && INTEGER2(T.bId, 1, CONFIG.farm.maxUnitId) && T.aId === T.materialIds[0] && T.bId === T.materialIds[1] && COST === MATERIALS.length && FIRST && INTEGER2(T.sourceSpecies, 0, CONFIG.unit.speciesCount - 1) && INTEGER2(T.sourceTier, 1, CONFIG.unit.maxTier - 1) && T.sourceSpecies === FIRST.species && T.sourceTier === FIRST.tier && MATERIALS.every((u) => u && u.tier === FIRST.tier && u.species === FIRST.species) && T.startPositions.length === MATERIALS.length && T.startPositions.every(
            (position2, index) => position2?.id === MATERIALS[index].id && Number.isFinite(position2.x) && Number.isFinite(position2.y) && Number.isFinite(position2.z) && position2.z >= 0
          )
        );
        PENDING_MERGE_COST[FIRST.species] += MATERIALS.length - 1;
      } else {
        const RESULT = raw.units.find((u) => u.id === T.resultId);
        ASSERT2(
          T.aId === 0 && T.bId === 0 && INTEGER2(T.resultId, 1, CONFIG.farm.maxUnitId) && !MERGE_TASK_UNIT_IDS.has(T.resultId) && RESULT && INTEGER2(T.sourceSpecies, 0, CONFIG.unit.speciesCount - 1) && INTEGER2(T.sourceTier, 1, CONFIG.unit.maxTier - 1) && RESULT.species === T.sourceSpecies && RESULT.tier === T.sourceTier + 1 && T.materialIds.length === mergeMaterialCostForTier(RESULT.tier)
        );
        MERGE_TASK_UNIT_IDS.add(T.resultId);
      }
    }
    for (let species = 0; species < CONFIG.unit.speciesCount; species++) {
      if (PENDING_MERGE_COST[species] > 0) {
        const OWNED_COUNT = raw.units.filter((u) => !u.isBattleOnlySummon && u.species === species).length;
        ASSERT2(OWNED_COUNT - PENDING_MERGE_COST[species] >= 2);
      }
    }
    ASSERT2(
      raw.units.length <= (raw.scene === "farm" ? raw.farmBossEvent?.phase === "idle" ? CONFIG.farm.capacity.max : CONFIG.farm.capacity.battleUnits : CONFIG.raid.capacity.battleUnits) && raw.food.length <= 140 && raw.projectiles.length <= CONFIG.raid.capacity.projectiles
    );
    ASSERT2(
      raw.farmBossEvent && ["idle", "dropping", "fighting", "celebrating", "fading"].includes(raw.farmBossEvent.phase) && ["idle", "fighting", "victory", "defeat"].includes(raw.farmBossEvent.outcome) && Number.isFinite(raw.farmBossEvent.elapsed) && raw.farmBossEvent.elapsed >= 0
    );
    ASSERT2(INTEGER2(raw.nextBossEncounterId, 1, 1e12) && Array.isArray(raw.bossRewardReceipts));
    ASSERT2(isValidPlayerProgressionState(raw.playerProgression));
    const PLOT_STATES = raw.playerProgression.farmPlots.plots;
    ASSERT2(
      Array.isArray(raw.farmPlots) && raw.farmPlots.length === PLOT_STATES.length && raw.farmPlots.every(
        (plot, index) => plot && typeof plot === "object" && !Array.isArray(plot) && Object.keys(plot).length === 2 && plot.id === PLOT_STATES[index].id && Array.isArray(plot.food) && plot.food.length <= 140
      )
    );
    const ACTIVE_PLOT_FOOD = raw.farmPlots.find(
      (plot) => plot.id === raw.playerProgression.farmPlots.currentPlotId
    )?.food;
    ASSERT2(ACTIVE_PLOT_FOOD && JSON.stringify(ACTIVE_PLOT_FOOD) === JSON.stringify(raw.food));
    const FARM_EVENT = raw.farmBossEvent;
    if (FARM_EVENT.phase === "idle") {
      ASSERT2(
        FARM_EVENT.outcome === "idle" && FARM_EVENT.elapsed === 0 && FARM_EVENT.encounterId === 0 && FARM_EVENT.rewardStatus === "none" && FARM_EVENT.rewardChance === 0 && FARM_EVENT.rewardRoll === 0 && FARM_EVENT.rewardUnitId === 0
      );
      if (raw.scene === "farm") {
        ASSERT2(!raw.boss.active);
      }
    } else if (FARM_EVENT.phase === "dropping" || FARM_EVENT.phase === "fighting") {
      ASSERT2(
        raw.scene === "farm" && FARM_EVENT.outcome === "fighting" && raw.boss.active && INTEGER2(FARM_EVENT.encounterId, 1, raw.nextBossEncounterId - 1) && FARM_EVENT.rewardStatus === "unresolved" && FARM_EVENT.rewardChance === 0 && FARM_EVENT.rewardRoll === 0 && FARM_EVENT.rewardUnitId === 0
      );
    } else {
      ASSERT2(
        raw.scene === "farm" && ["victory", "defeat"].includes(FARM_EVENT.outcome) && !raw.boss.active && INTEGER2(FARM_EVENT.encounterId, 1, raw.nextBossEncounterId - 1)
      );
      ASSERT2(FARM_EVENT.outcome === "victory" ? raw.boss.hp === 0 : raw.boss.hp > 0);
      ASSERT2(
        FARM_EVENT.outcome === "victory" ? ["calculating", "ready"].includes(FARM_EVENT.rewardStatus) : FARM_EVENT.rewardStatus === "none"
      );
    }
    ASSERT2(
      raw.bossRewardWatermarks && INTEGER2(raw.bossRewardWatermarks.farm, 0, 1e12) && INTEGER2(raw.bossRewardWatermarks.raid, 0, 1e12) && raw.nextBossEncounterId > raw.bossRewardWatermarks.farm
    );
    ASSERT2(
      raw.bossRewardStreams && typeof raw.bossRewardStreams === "object" && Object.keys(raw.bossRewardStreams).length === 3 && ["normal", "event", "firstClear"].every((key) => Object.hasOwn(raw.bossRewardStreams, key))
    );
    const VALID_DISTRIBUTION = (state) => state && typeof state === "object" && !Array.isArray(state) && Object.keys(state).length === 4 && state.version === 1 && Number.isFinite(state.probability) && state.probability >= 0 && state.probability <= 1 && INTEGER2(state.consecutiveFailures) && INTEGER2(state.pendingTrials), VALID_JOB = (state, count) => state && typeof state === "object" && !Array.isArray(state) && Object.keys(state).length === 7 && state.version === 1 && state.totalTrials === count && INTEGER2(state.processedTrials, 0, count) && INTEGER2(state.remainingTrials, 0, count) && state.processedTrials + state.remainingTrials === count && INTEGER2(state.successes, 0, state.processedTrials) && INTEGER2(state.rngState, 0, 4294967295) && VALID_DISTRIBUTION(state.distributionState);
    for (const STREAM of Object.values(raw.bossRewardStreams)) {
      ASSERT2(
        STREAM && INTEGER2(STREAM.rngState, 0, 4294967295) && INTEGER2(STREAM.payoutRngState, 0, 4294967295) && (STREAM.distributionState === null || VALID_DISTRIBUTION(STREAM.distributionState))
      );
    }
    ASSERT2(Array.isArray(raw.bossRewardInventory) && raw.bossRewardInventory.length <= CONFIG.unit.speciesCount);
    const INVENTORY = /* @__PURE__ */ new Map();
    for (const GROUP of raw.bossRewardInventory) {
      ASSERT2(
        GROUP && INTEGER2(GROUP.species, 0, CONFIG.unit.speciesCount - 1) && GROUP.tier === 1 && INTEGER2(GROUP.count, 1) && !INVENTORY.has(`${GROUP.species}:${GROUP.tier}`)
      );
      INVENTORY.set(`${GROUP.species}:${GROUP.tier}`, GROUP.count);
    }
    const REWARD_IDS = /* @__PURE__ */ new Set(), QUEUED_BY_GROUP = /* @__PURE__ */ new Map();
    for (const REWARD2 of raw.bossRewardReceipts) {
      ASSERT2(
        REWARD2 && INTEGER2(REWARD2.encounterId, 1, 1e12) && ["farm", "raid"].includes(REWARD2.source) && REWARD2.encounterId <= raw.bossRewardWatermarks[REWARD2.source] && INTEGER2(REWARD2.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER2(REWARD2.tier, 1, CONFIG.unit.maxTier) && Number.isFinite(REWARD2.x) && Number.isFinite(REWARD2.y) && Number.isFinite(REWARD2.chance) && REWARD2.chance >= 0 && REWARD2.chance <= 1 && typeof REWARD2.firstClear === "boolean" && (REWARD2.source === "raid" || !REWARD2.firstClear)
      );
      const KEY2 = REWARD2.receiptKey || REWARD2.source + ":" + REWARD2.encounterId;
      ASSERT2(!REWARD_IDS.has(KEY2));
      REWARD_IDS.add(KEY2);
      if (["calculating", "ready"].includes(REWARD2.status)) {
        ASSERT2(
          REWARD2.tier === 1 && REWARD2.baselineChance === (REWARD2.firstClear ? BOSS_REWARD_SETTINGS.firstClearAcquisitionChance : BOSS_REWARD_SETTINGS.acquisitionChance) && REWARD2.chance === Math.min(1, REWARD2.baselineChance * (REWARD2.acquisitionMultiplier ?? 1)) && Number.isSafeInteger(REWARD2.acquiredCount) && REWARD2.acquiredCount >= 0 && Number.isSafeInteger(REWARD2.placedCount) && REWARD2.placedCount >= 0 && Number.isSafeInteger(REWARD2.queuedCount) && REWARD2.queuedCount >= 0 && REWARD2.placedCount + REWARD2.queuedCount === REWARD2.acquiredCount && REWARD2.grantedCount === REWARD2.placedCount
        );
        if (REWARD2.queuedCount > 0) {
          const GROUP_KEY = `${REWARD2.species}:${REWARD2.tier}`, QUEUED = (QUEUED_BY_GROUP.get(GROUP_KEY) || 0) + REWARD2.queuedCount;
          ASSERT2(Number.isSafeInteger(QUEUED));
          QUEUED_BY_GROUP.set(GROUP_KEY, QUEUED);
        }
        ASSERT2(
          INTEGER2(REWARD2.rollBudget, 1, BOSS_REWARD_SETTINGS.maxRollCount) && INTEGER2(REWARD2.boxCount, 1, BOSS_REWARD_SETTINGS.maxBoxCount) && REWARD2.boxCount === Math.min(REWARD2.rollBudget, BOSS_REWARD_SETTINGS.maxBoxCount) && REWARD2.rollCount === REWARD2.boxCount && INTEGER2(REWARD2.successCount, 0, REWARD2.boxCount)
        );
        if (REWARD2.status === "calculating") {
          const CALC = REWARD2.calculation;
          ASSERT2(
            CALC && CALC.version === 1 && Array.isArray(CALC.payouts) && CALC.payouts.length === REWARD2.boxCount && Array.isArray(CALC.hits) && CALC.hits.length <= REWARD2.boxCount && CALC.hits.every(
              (index, i) => INTEGER2(index, 0, REWARD2.boxCount - 1) && (i === 0 || CALC.hits[i - 1] < index)
            ) && INTEGER2(CALC.payoutRngStateAfter, 0, 4294967295) && (CALC.jobState === null || VALID_JOB(CALC.jobState, REWARD2.boxCount)) && REWARD2.successCount === 0 && REWARD2.acquiredCount === 0 && REWARD2.queuedCount === 0
          );
          const BASE = Math.floor(REWARD2.rollBudget / REWARD2.boxCount), EXTRA = REWARD2.rollBudget % REWARD2.boxCount;
          ASSERT2(
            CALC.payouts.every(
              (payout) => Number.isSafeInteger(payout) && payout >= BASE && payout <= BASE + (EXTRA ? 1 : 0)
            ) && CALC.payouts.reduce((sum, payout) => sum + payout, 0) === REWARD2.rollBudget && CALC.payouts.filter((payout) => payout === BASE + 1).length === EXTRA
          );
          if (CALC.jobState) {
            ASSERT2(
              CALC.jobState.successes === CALC.hits.length && CALC.hits.every((index) => index < CALC.jobState.processedTrials)
            );
          }
        } else {
          ASSERT2(
            REWARD2.calculation === null && Number.isSafeInteger(REWARD2.acquiredCount) && REWARD2.acquiredCount >= 0 && REWARD2.acquiredCount <= REWARD2.rollBudget && REWARD2.successCount <= REWARD2.acquiredCount && REWARD2.successCount === 0 === (REWARD2.acquiredCount === 0)
          );
        }
      } else {
        ASSERT2(false);
      }
      if (REWARD2.acquisitionMultiplier !== void 0) {
        ASSERT2(
          Number.isFinite(REWARD2.acquisitionMultiplier) && REWARD2.acquisitionMultiplier >= 0 && REWARD2.acquisitionMultiplier <= 2
        );
      }
    }
    ASSERT2(
      INVENTORY.size === QUEUED_BY_GROUP.size && [...INVENTORY].every(([key, quantity]) => QUEUED_BY_GROUP.get(key) === quantity)
    );
    const STAGE_PROGRESS = raw.farmBossProgress;
    ASSERT2(
      STAGE_PROGRESS && INTEGER2(STAGE_PROGRESS.currentStage, 1, BOSS_REWARD_SETTINGS.maxStage) && INTEGER2(STAGE_PROGRESS.highestClearedRaidStage, 0, BOSS_REWARD_SETTINGS.maxStage) && INTEGER2(STAGE_PROGRESS.encounterSeed, 0, 4294967295) && INTEGER2(STAGE_PROGRESS.encounterEpoch, 0, 1e12) && INTEGER2(STAGE_PROGRESS.nextSelectionId, 1, 1e12) && Array.isArray(STAGE_PROGRESS.selections) && STAGE_PROGRESS.selections.length <= BOSS_REWARD_SETTINGS.maxStage
    );
    const STAGE_IDS = /* @__PURE__ */ new Set(), SELECTION_IDS = /* @__PURE__ */ new Set();
    for (const SELECTION of STAGE_PROGRESS.selections) {
      ASSERT2(
        SELECTION && INTEGER2(SELECTION.stage, 1, BOSS_REWARD_SETTINGS.maxStage) && INTEGER2(SELECTION.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER2(SELECTION.selectionId, 1, STAGE_PROGRESS.nextSelectionId - 1) && !STAGE_IDS.has(SELECTION.stage) && !SELECTION_IDS.has(SELECTION.selectionId)
      );
      STAGE_IDS.add(SELECTION.stage);
      SELECTION_IDS.add(SELECTION.selectionId);
    }
    ASSERT2(
      INTEGER2(raw.nextRaidRunSequence, 0, 1e12) && INTEGER2(raw.raidSettlementWatermark, 0, raw.nextRaidRunSequence) && raw.nextRaidRunSequence >= raw.bossRewardWatermarks.raid && raw.raidSettlementWatermark >= raw.bossRewardWatermarks.raid && Array.isArray(raw.raidSettlementReceipts)
    );
    const ACTIVE_RAID = raw.activeRaidRunSequence, ACTIVE_SESSION = raw.activeRaidSessionId;
    ASSERT2(ACTIVE_RAID === null === (ACTIVE_SESSION === null));
    if (ACTIVE_RAID === null) {
      ASSERT2(raw.nextRaidRunSequence === raw.raidSettlementWatermark);
    } else {
      ASSERT2(
        INTEGER2(ACTIVE_RAID, 1, 1e12) && ACTIVE_RAID === raw.nextRaidRunSequence && ACTIVE_RAID === raw.raidSettlementWatermark + 1 && typeof ACTIVE_SESSION === "string" && ACTIVE_SESSION.trim().length > 0 && ACTIVE_SESSION.length <= 128
      );
    }
    const RAID_RECEIPT_KEYS = /* @__PURE__ */ new Set();
    for (const RECEIPT of raw.raidSettlementReceipts) {
      ASSERT2(
        RECEIPT && typeof RECEIPT.ownerId === "string" && RECEIPT.ownerId.length > 0 && typeof RECEIPT.sessionId === "string" && RECEIPT.sessionId.length > 0 && INTEGER2(RECEIPT.encounterId, 1, 1e12) && INTEGER2(RECEIPT.runSequence, 1, raw.raidSettlementWatermark) && ["victory", "defeat", "aborted"].includes(RECEIPT.outcome)
      );
      ASSERT2(
        RECEIPT.status === "settled" && RECEIPT.key === raidSettlementKey({
          ownerId: RECEIPT.ownerId,
          sessionId: RECEIPT.sessionId,
          encounterId: RECEIPT.encounterId
        }) && !RAID_RECEIPT_KEYS.has(RECEIPT.key) && RECEIPT.runSequence <= raw.raidSettlementWatermark && Array.isArray(RECEIPT.sleptFarmUnitIds) && RECEIPT.sleptFarmUnitIds.every((id) => INTEGER2(id, 1, CONFIG.farm.maxUnitId)) && new Set(RECEIPT.sleptFarmUnitIds).size === RECEIPT.sleptFarmUnitIds.length && INTEGER2(RECEIPT.availableAtStart, 0, CONFIG.raid.capacity.playerUnits) && INTEGER2(RECEIPT.originalUnitsDeployed, 0, RECEIPT.availableAtStart) && Number.isFinite(RECEIPT.deploymentMultiplier) && RECEIPT.deploymentMultiplier >= 0 && RECEIPT.deploymentMultiplier <= 2 && (RECEIPT.completedAtMs === null || Number.isFinite(RECEIPT.completedAtMs) && RECEIPT.completedAtMs >= 0) && (RECEIPT.reward === null || RECEIPT.reward && typeof RECEIPT.reward === "object" && !Array.isArray(RECEIPT.reward))
      );
      RAID_RECEIPT_KEYS.add(RECEIPT.key);
    }
    if (FARM_EVENT.outcome === "victory" && FARM_EVENT.phase !== "idle") {
      const RECEIPT = raw.bossRewardReceipts.find(
        (reward) => reward.source === "farm" && reward.encounterId === FARM_EVENT.encounterId
      );
      ASSERT2(
        RECEIPT && RECEIPT.status === FARM_EVENT.rewardStatus && RECEIPT.chance === FARM_EVENT.rewardChance && RECEIPT.roll === FARM_EVENT.rewardRoll && RECEIPT.unitId === FARM_EVENT.rewardUnitId
      );
    }
    ASSERT2(
      raw.corpseRecoveryVersion === 1 && INTEGER2(raw.nextId, 1, 1e9) && INTEGER2(raw.bossSummonSerial, 0, 1e12) && INTEGER2(raw.foodTaps.remainder, 0, 4) && raw.foodTaps.autoClock >= 0 && raw.foodTaps.autoClock < 0.51
    );
    ASSERT2(
      Array.isArray(raw.raidExpectedPlayers) && raw.raidExpectedPlayers.length >= 1 && raw.raidExpectedPlayers.length <= CONFIG.raid.capacity.players && raw.raidExpectedPlayers.every((p) => typeof p === "string" && p.length > 0) && new Set(raw.raidExpectedPlayers).size === raw.raidExpectedPlayers.length && Array.isArray(raw.raidRosters)
    );
    const ROSTER_OWNERS = /* @__PURE__ */ new Set(), MANIFEST = /* @__PURE__ */ new Set();
    for (const R2 of raw.raidRosters) {
      ASSERT2(
        raw.raidExpectedPlayers.includes(R2.ownerId) && !ROSTER_OWNERS.has(R2.ownerId) && Array.isArray(R2.troops) && R2.troops.length <= CONFIG.raid.capacity.playerUnits && Array.isArray(R2.deploymentCardSpecies) && R2.deploymentCardSpecies.length <= 4 && R2.deploymentCardSpecies.every((speciesId) => INTEGER2(speciesId, 0, CONFIG.unit.speciesCount - 1)) && new Set(R2.deploymentCardSpecies).size === R2.deploymentCardSpecies.length && isValidAbilityRuntimeSnapshot(R2.abilitySnapshot)
      );
      ASSERT2(
        typeof R2.settlementSessionId === "string" && R2.settlementSessionId.length <= 128 && INTEGER2(R2.settlementRunSequence, 0, 1e12) && INTEGER2(R2.settlementEncounterId, 0, 1e12)
      );
      ASSERT2(
        R2.settlementRunSequence === 0 ? R2.settlementSessionId === "" && R2.settlementEncounterId === 0 : R2.settlementSessionId.trim().length > 0 && R2.settlementEncounterId === R2.settlementRunSequence
      );
      ROSTER_OWNERS.add(R2.ownerId);
      const IDS2 = /* @__PURE__ */ new Set();
      for (const T of R2.troops) {
        ASSERT2(
          INTEGER2(T.farmId, 1, CONFIG.farm.maxUnitId) && INTEGER2(T.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER2(T.tier, 1, CONFIG.unit.maxTier) && typeof T.deployed === "boolean" && !IDS2.has(T.farmId)
        );
        IDS2.add(T.farmId);
        MANIFEST.add(R2.ownerId + ":" + T.farmId);
      }
      ASSERT2(
        INTEGER2(R2.lastDeploySequence, 0, R2.troops.length) && R2.lastDeploySequence === R2.troops.filter((t) => t.deployed).length && Number.isFinite(R2.buffUntil) && Number.isFinite(R2.buffReadyAt) && R2.buffUntil >= 0 && R2.buffReadyAt >= 0
      );
    }
    ASSERT2(MANIFEST.size <= CONFIG.raid.capacity.units);
    const IDS = /* @__PURE__ */ new Set(), DEPLOYED = /* @__PURE__ */ new Set(), MATE_ID_LIMIT = raw.scene === "raid" ? CONFIG.raid.capacity.players * CONFIG.raid.ids.playerStride + CONFIG.raid.capacity.playerUnits : CONFIG.farm.maxUnitId;
    const UNITS_BY_ID = /* @__PURE__ */ new Map(), SUMMONS_BY_PARENT = /* @__PURE__ */ new Map();
    for (const U of raw.units) {
      shape(U, UNIT_SNAPSHOT_SHAPE);
      ASSERT2(
        Number.isFinite(U.growthElapsed) && U.growthElapsed >= 0 && Number.isFinite(U.growthDuration) && U.growthDuration > 0 && U.growthElapsed <= U.growthDuration + 1e-9 && Number.isFinite(U.cooldown) && U.cooldown >= 0 && Number.isFinite(U.cooldownDuration) && U.cooldownDuration >= U.cooldown - 1e-9 && U.cooldownDuration <= 1e5 && INTEGER2(U.mateId, 0, MATE_ID_LIMIT) && Number.isFinite(U.perceptionRange) && U.perceptionRange > 0 && U.perceptionRange <= 100 && Number.isFinite(U.down) && U.down >= 0 && U.down <= CONFIG.unit.corpseRecoverySeconds && INTEGER2(U.battleSummonEncounterId, 0, 1e12) && Number.isFinite(U.landingRecovery) && U.landingRecovery >= 0 && U.landingRecovery <= 0.25 + 1e-9 && INTEGER2(U.generation, 1, 1e12) && Number.isFinite(U.permanentStatMultiplier) && U.permanentStatMultiplier >= 1 && U.permanentStatMultiplier <= 2.25 && INTEGER2(U.walnutNextGuardTick, 0, 1e12) && INTEGER2(U.walnutGuardUntilTick, 0, 1e12) && Number.isFinite(U.walnutStoredRawDamage) && U.walnutStoredRawDamage >= 0 && Number.isFinite(U.wheatCommandUntil) && U.wheatCommandUntil >= 0 && U.wheatCommandUntil <= 1e12 && Number.isFinite(U.wheatCommandCritBonus) && U.wheatCommandCritBonus >= 0 && U.wheatCommandCritBonus <= 0.5 && Number.isFinite(U.barleyArmorBreakUntil) && U.barleyArmorBreakUntil >= 0 && U.barleyArmorBreakUntil <= 1e12 && Number.isFinite(U.barleyArmorBreakReduction) && U.barleyArmorBreakReduction >= 0 && U.barleyArmorBreakReduction <= 0.75 && INTEGER2(U.kidneyLeapReadyTick, 0, 1e12) && INTEGER2(U.kidneyLeapLastUseTick, 0, 1e12) && typeof U.peaRecoveryPending === "boolean" && INTEGER2(U.peaRecoveryBoostExpiresAtTick, 0, 1e12) && Number.isFinite(U.peaRecoveryBoostMultiplier) && U.peaRecoveryBoostMultiplier >= 0 && U.peaRecoveryBoostMultiplier <= 2 && validWheatCommandBuffs(U.wheatCommandBuffs) && validBarleyArmorShredBuckets(U.barleyArmorShredBuckets)
      );
      ASSERT2(
        INTEGER2(U.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER2(U.tier, 1, CONFIG.unit.maxTier) && ["idle", "windup", "active", "recover"].includes(U.ability.phase) && typeof U.ownerId === "string" && Number.isSafeInteger(U.farmId) && Object.values(FACTION_CONFIG).includes(U.faction) && typeof U.dropLanded === "boolean" && typeof U.isBattleOnlySummon === "boolean" && typeof U.splitUsedThisBattle === "boolean" && typeof U.deathSplitHandled === "boolean" && INTEGER2(U.battleSummonParentGeneration, 0, 1e12) && INTEGER2(U.chestnutNextThornTick, 0, 1e12)
      );
      ASSERT2(!!specialAbilityCompositionFor(U.species) === (U.specialAbility !== null));
      if (U.specialAbility) {
        ASSERT2(
          ["idle", "windup", "active", "recover"].includes(U.specialAbility.phase) && Number.isFinite(U.specialAbility.elapsed) && U.specialAbility.elapsed >= 0
        );
        if (U.specialAbility.action) {
          ASSERT2(
            INTEGER2(U.specialAbility.action.id, 1, raw.attackSerial) && typeof U.specialAbility.action.hit === "boolean" && U.specialAbility.action.target && Number.isFinite(U.specialAbility.action.target.x) && Number.isFinite(U.specialAbility.action.target.y)
          );
          if (U.specialAbility.action.leapDepartureCommitted !== void 0) {
            ASSERT2(typeof U.specialAbility.action.leapDepartureCommitted === "boolean");
          }
          if (U.specialAbility.action.leapCooldownResetApplied !== void 0) {
            ASSERT2(typeof U.specialAbility.action.leapCooldownResetApplied === "boolean");
          }
          if (U.specialAbility.action.path) {
            validatePath(U.specialAbility.action.path);
          }
        }
        if (["active", "windup"].includes(U.specialAbility.phase)) {
          ASSERT2(U.specialAbility.action !== null);
        }
        if (U.specialAbility.phase === "active") {
          validatePath(U.specialAbility.action.path);
        }
      }
      if (U.hp <= 0) {
        ASSERT2(U.down > 0 && !U.isBattleOnlySummon);
      } else {
        ASSERT2(U.down === 0);
      }
      if (hasFaction(U, FACTION_CONFIG.ENEMY)) {
        ASSERT2(
          U.isBattleOnlySummon && U.battleSummonKind === "boss-mouth-t1" && U.ownerId === "boss" && U.farmId === 0
        );
      } else {
        ASSERT2(U.battleSummonKind !== "boss-mouth-t1" && U.ownerId !== "boss");
      }
      ASSERT2(!IDS.has(U.id));
      IDS.add(U.id);
      UNITS_BY_ID.set(U.id, U);
      if (U.isBattleOnlySummon) {
        if (U.isFormationClone) {
          ASSERT2(
            U.battleSummonKind === "formation-copy" && U.faction === "player" && U.hp > 0 && U.hp <= 1 && U.canSplit === false && U.countsTowardPermanentRoster === false && U.eligibleForRaidDeployment === false && U.breedingEligible === false && U.mergeEligible === false && U.usesPersistentSleep === false && U.lifetime === "until-death-or-battle-end" && INTEGER2(U.battleSummonParentId, 1, 1e12)
          );
          ASSERT2(raw.scene === "raid" ? raw.running : raw.farmBossEvent.phase === "fighting");
        } else if (U.battleSummonKind === "peanut-death-split") {
          ASSERT2(
            ["farm", "raid"].includes(raw.scene) && INTEGER2(U.battleSummonParentId, 1, Number.MAX_SAFE_INTEGER) && INTEGER2(U.battleSummonParentGeneration, 1, 1e12) && U.battleSummonEncounterId === 0 && U.species === 4 && hasUnitCapability(U.species, "deathSplit") && U.tier === 1 && U.permanentStatMultiplier <= 2.25 && U.canSplit === false && U.countsTowardPermanentRoster === false && U.eligibleForRaidDeployment === false && U.breedingEligible === false && U.mergeEligible === false && U.usesPersistentSleep === false && U.lifetime === "until-death-or-battle-end" && U.deathSplitHandled === false && U.splitUsedThisBattle === true && U.hp > 0
          );
          const PARENT = UNITS_BY_ID.get(U.battleSummonParentId);
          ASSERT2(
            PARENT && hasFaction(PARENT, FACTION_CONFIG.PLAYER) && PARENT.isBattleOnlySummon === false && PARENT.hp <= 0 && PARENT.generation === U.battleSummonParentGeneration && hasUnitCapability(PARENT.species, "deathSplit") && PARENT.species === 4 && PARENT.splitUsedThisBattle && PARENT.faction === U.faction && PARENT.ownerId === U.ownerId && PARENT.farmId === U.farmId
          );
          const LIST = SUMMONS_BY_PARENT.get(PARENT.id) || [];
          LIST.push(U);
          SUMMONS_BY_PARENT.set(PARENT.id, LIST);
          if (raw.scene === "raid") {
            ASSERT2(
              U.id >= CONFIG.raid.ids.summonBase && U.id < CONFIG.raid.ids.summonBase + CONFIG.raid.capacity.battleUnits && raw.raidExpectedPlayers.includes(U.ownerId) && INTEGER2(U.farmId, 1, CONFIG.farm.maxUnitId)
            );
          } else {
            ASSERT2(INTEGER2(U.id, 1, raw.nextId - 1) && raw.farmBossEvent.phase !== "idle");
          }
        } else {
          ASSERT2(
            U.battleSummonKind === "boss-mouth-t1" && U.battleSummonParentId === 0 && INTEGER2(U.battleSummonEncounterId, 1, 1e12) && U.battleSummonEncounterId === raw.boss.encounterId && U.species === raw.boss.species && U.tier === 1 && U.ownerId === "boss" && U.farmId === 0 && U.canSplit === false && U.countsTowardPermanentRoster === false && U.eligibleForRaidDeployment === false && U.breedingEligible === false && U.mergeEligible === false && U.usesPersistentSleep === false && U.lifetime === "until-death-or-battle-end" && U.deathSplitHandled === false && U.splitUsedThisBattle === true && U.hp > 0 && U.battleSummonEncounterId > 0 && U.id >= CONFIG.boss.summonIdBase && U.id <= CONFIG.boss.summonIdBase + raw.bossSummonSerial
          );
          ASSERT2(raw.scene === "raid" ? raw.running && raw.boss.active : raw.farmBossEvent.phase === "fighting");
        }
      } else {
        ASSERT2(
          U.battleSummonKind === "" && U.battleSummonParentId === 0 && U.battleSummonEncounterId === 0 && U.countsTowardPermanentRoster === true && U.eligibleForRaidDeployment === true && U.breedingEligible === true && U.mergeEligible === true && U.canSplit === true && U.usesPersistentSleep === true && U.lifetime === ""
        );
        if (raw.scene === "raid") {
          const ROSTER2 = raw.raidRosters.find((r) => r.ownerId === U.ownerId), TROOP_INDEX = ROSTER2?.troops.findIndex((t) => t.farmId === U.farmId) ?? -1, SLOT = raw.raidExpectedPlayers.indexOf(U.ownerId), CURRENT_ID = (SLOT + 1) * CONFIG.raid.ids.playerStride + TROOP_INDEX + 1, LEGACY_ID = (SLOT + 1) * CONFIG.raid.ids.playerStride + U.farmId;
          ASSERT2(
            raw.raidExpectedPlayers.includes(U.ownerId) && INTEGER2(U.farmId, 1, CONFIG.farm.maxUnitId) && MANIFEST.has(U.ownerId + ":" + U.farmId) && !DEPLOYED.has(U.ownerId + ":" + U.farmId) && (U.id === CURRENT_ID || U.farmId <= CONFIG.farm.capacity.max && U.id === LEGACY_ID)
          );
          DEPLOYED.add(U.ownerId + ":" + U.farmId);
        } else {
          ASSERT2(INTEGER2(U.id, 1, raw.nextId - 1));
        }
      }
      if (U.ability.action) {
        const A = U.ability.action;
        ASSERT2(
          INTEGER2(A.id, 1, raw.attackSerial) && INTEGER2(A.targetGeneration, 1, 1e12) && typeof A.hit === "boolean" && A.target && Number.isFinite(A.target.x) && Number.isFinite(A.target.y)
        );
        if (hasUnitCapability(U.species, "repeatedStrike")) {
          ASSERT2(
            INTEGER2(A.peanutStrikeCount, 2, 5) && Number.isFinite(A.peanutAttackMultiplier) && A.peanutAttackMultiplier > 0 && A.peanutAttackMultiplier <= 10 && Number.isFinite(A.peanutSpreadRadians) && A.peanutSpreadRadians >= 0 && A.peanutSpreadRadians <= Math.PI / 6
          );
          const MASK = (1 << A.peanutStrikeCount) - 1;
          ASSERT2(
            INTEGER2(A.resolvedMask, 0, MASK) && INTEGER2(A.hitMask, 0, MASK) && (A.hitMask & ~A.resolvedMask) === 0
          );
        }
        if (U.species === 3 && A.thornShotsRemaining !== void 0) {
          ASSERT2(
            INTEGER2(A.thornTargetGeneration, 1, 1e12) && (A.thornTargetId === "boss" || VALID_BATTLE_UNIT_ID(A.thornTargetId, raw.bossSummonSerial)) && INTEGER2(A.thornShotsRemaining, 0, 2) && INTEGER2(A.thornNextShotTick, 0, 1e12) && INTEGER2(A.thornShotIndex, 0, 2) && A.thornConfig?.projectileCount >= 1 && A.thornConfig.projectileCount <= 3
          );
        }
        if (A.path) {
          validatePath(A.path);
        }
        if (A.pendingShots !== void 0) {
          ASSERT2(
            Array.isArray(A.pendingShots) && A.pendingShots.length <= 3 && A.pendingShots.every(
              (shot) => INTEGER2(shot.shotIndex, 1, 4) && Number.isFinite(shot.delaySeconds) && shot.delaySeconds >= 0 && Number.isFinite(shot.attackMultiplier) && shot.attackMultiplier > 0 && shot.attackMultiplier <= 10
            )
          );
        }
        if (A.projectileAbility !== void 0) {
          ASSERT2(A.projectileAbility && Object.hasOwn(A.projectileAbility, "effect"));
          if (A.projectileAbility.effect) {
            ASSERT2(
              A.projectileAbility.effect.abilityId === "corn-kernel-chain" && Number.isFinite(A.projectileAbility.effect.config.damageMultiplier) && A.projectileAbility.effect.config.damageMultiplier >= 0.5 && A.projectileAbility.effect.config.damageMultiplier <= 1
            );
          }
        }
      }
      if (U.ability.phase === "active" || U.ability.phase === "windup") {
        ASSERT2(U.ability.action !== null);
      }
      if (U.ability.phase === "active") {
        validatePath(U.ability.action.path);
      }
    }
    for (const [PARENT_ID, CHILDREN] of SUMMONS_BY_PARENT) {
      ASSERT2(CHILDREN.length <= MAX_PEANUT_SPLIT_CHILDREN2);
      const PARENT = UNITS_BY_ID.get(PARENT_ID);
      ASSERT2(PARENT && PARENT.ownerId === CHILDREN[0].ownerId && PARENT.farmId === CHILDREN[0].farmId);
    }
    const GENERATIONS = /* @__PURE__ */ new Set();
    for (const U of raw.units) {
      ASSERT2(!GENERATIONS.has(U.generation));
      GENERATIONS.add(U.generation);
    }
    ASSERT2(
      INTEGER2(raw.entityGenerationSerial, 1, 1e12) && raw.entityGenerationSerial >= raw.boss.generation && raw.units.every((unit) => unit.generation <= raw.entityGenerationSerial)
    );
    for (const F of raw.food) {
      ASSERT2(["flight", "bounce", "grounded"].includes(F.phase));
      for (const K of ["x", "y", "z", "vx", "vy", "vz", "tx", "ty"]) {
        ASSERT2(Number.isFinite(F[K]));
      }
    }
    const PROJECTILE_IDS = /* @__PURE__ */ new Set();
    for (const P of raw.projectiles) {
      validatePath(P.path);
      ASSERT2(INTEGER2(P.id, 1, raw.projectileSerial) && !PROJECTILE_IDS.has(P.id));
      PROJECTILE_IDS.add(P.id);
      ASSERT2(
        INTEGER2(
          P.owner,
          1,
          raw.scene === "raid" ? CONFIG.raid.ids.summonBase + CONFIG.raid.capacity.battleUnits - 1 : raw.nextId - 1
        ) || INTEGER2(P.owner, CONFIG.boss.summonIdBase + 1, CONFIG.boss.summonIdBase + raw.bossSummonSerial)
      );
      ASSERT2(
        P.targetId === void 0 || P.targetId === "boss" || VALID_BATTLE_UNIT_ID(P.targetId, raw.bossSummonSerial)
      );
      ASSERT2(
        Object.values(FACTION_CONFIG).includes(P.faction) && typeof P.ownerId === "string" && INTEGER2(P.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER2(P.tier, 1, CONFIG.unit.maxTier) && typeof P.hit === "boolean" && Number.isFinite(P.attackMultiplier) && P.attackMultiplier > 0 && P.attackMultiplier <= 10 && INTEGER2(P.shotIndex, 0, 4)
      );
      ASSERT2(
        INTEGER2(P.ownerGeneration, 1, 1e12) && INTEGER2(P.targetGeneration, 1, 1e12) && P.attackPayload && Number.isFinite(P.attackPayload.attackerStats?.attackPower) && Number.isFinite(P.attackPayload.damageMultiplier) && P.attackPayload.damageMultiplier > 0 && P.attackPayload.damageMultiplier <= 10
      );
      if (P.cornPayload) {
        ASSERT2(
          P.species === 1 && Number.isFinite(P.cornPayload.attackerStats?.attackPower) && Number.isFinite(P.cornPayload.attackPowerMultiplier) && typeof P.cornPayload.ownerId === "string" && Object.values(FACTION_CONFIG).includes(P.cornPayload.faction)
        );
      }
    }
    const ATTACHMENTS = /* @__PURE__ */ new Set(), CORN_DEFINITION = CORN_ATTACHMENT_FEATURE.definition;
    ASSERT2(
      INTEGER2(raw.cornAttachments.nextGroupId, 1, 1e12) && INTEGER2(raw.cornAttachments.nextAttachmentId, 1, 1e12) && Array.isArray(raw.cornAttachments.groups) && raw.cornAttachments.groups.length <= CONFIG.raid.capacity.projectiles
    );
    for (const GROUP of raw.cornAttachments.groups) {
      ASSERT2(
        INTEGER2(GROUP.id, 1, raw.cornAttachments.nextGroupId - 1) && INTEGER2(GROUP.targetGeneration, 1, 1e12) && (GROUP.targetId === "boss" || VALID_BATTLE_UNIT_ID(GROUP.targetId, raw.bossSummonSerial)) && ["collecting", "exploding", "complete", "cancelled"].includes(GROUP.status) && Number.isFinite(GROUP.targetX) && Number.isFinite(GROUP.targetY) && Number.isFinite(GROUP.targetZ) && INTEGER2(GROUP.firstAttachTick, 0, raw.simulationTick) && GROUP.closeAtTick === GROUP.firstAttachTick + CORN_DEFINITION.attachDelayTicks && (GROUP.nextExplosionTick === null || INTEGER2(GROUP.nextExplosionTick, 0, 1e12)) && Array.isArray(GROUP.attachments) && GROUP.attachments.length > 0 && GROUP.attachments.length <= CONFIG.raid.capacity.projectiles
      );
      for (const ATTACHMENT of GROUP.attachments) {
        ASSERT2(
          INTEGER2(ATTACHMENT.id, 1, raw.cornAttachments.nextAttachmentId - 1) && !ATTACHMENTS.has(ATTACHMENT.id) && ATTACHMENT.groupId === GROUP.id && ATTACHMENT.targetId === GROUP.targetId && ATTACHMENT.targetGeneration === GROUP.targetGeneration && INTEGER2(ATTACHMENT.ownerId, 1, 1e12) && INTEGER2(ATTACHMENT.ownerGeneration, 1, 1e12) && Number.isFinite(ATTACHMENT.damageMultiplier) && ATTACHMENT.damageMultiplier >= 0.5 && ATTACHMENT.damageMultiplier <= 1 && ["attached", "fading", "removed"].includes(ATTACHMENT.status) && INTEGER2(ATTACHMENT.fadeTicks, 0, CORN_DEFINITION.fadeTicks) && Number.isFinite(ATTACHMENT.angle) && Number.isFinite(ATTACHMENT.offsetX) && Number.isFinite(ATTACHMENT.offsetY) && ATTACHMENT.payload && Number.isFinite(ATTACHMENT.payload.attackerStats?.attackPower) && Number.isFinite(ATTACHMENT.payload.attackPowerMultiplier) && typeof ATTACHMENT.payload.ownerId === "string" && Object.values(FACTION_CONFIG).includes(ATTACHMENT.payload.faction)
        );
        ATTACHMENTS.add(ATTACHMENT.id);
      }
    }
    ASSERT2(
      INTEGER2(raw.projectileSerial, 0, 1e12) && INTEGER2(raw.raidSummonSerial, 0, CONFIG.raid.capacity.battleUnits) && INTEGER2(raw.bossSummonSerial, 0, 1e12)
    );
    ASSERT2(
      hasFaction(raw.boss, FACTION_CONFIG.ENEMY) && INTEGER2(raw.boss.generation, 1, 1e12) && raw.boss.hp >= 0 && raw.boss.hp <= raw.boss.maxHp && INTEGER2(raw.boss.species, 0, CONFIG.unit.speciesCount - 1) && raw.boss.maxHp > 0 && INTEGER2(raw.boss.stage, 0, BOSS_REWARD_SETTINGS.maxStage) && Number.isFinite(raw.boss.attackPower) && raw.boss.attackPower >= 4 && Number.isFinite(raw.boss.moveSpeed) && raw.boss.moveSpeed > 0 && INTEGER2(raw.boss.encounterId, 0, 1e12) && raw.boss.radius === CONFIG.boss.radius && raw.boss.height === CONFIG.boss.height && Number.isFinite(raw.boss.barleyArmorBreakUntil) && raw.boss.barleyArmorBreakUntil >= 0 && raw.boss.barleyArmorBreakUntil <= 1e12 && Number.isFinite(raw.boss.barleyArmorBreakReduction) && raw.boss.barleyArmorBreakReduction >= 0 && raw.boss.barleyArmorBreakReduction <= 0.75 && validBarleyArmorShredBuckets(raw.boss.barleyArmorShredBuckets)
    );
    if (raw.boss.stage === 0) {
      ASSERT2(raw.boss.attackPower === 4);
    } else {
      const STAGE_STATS = bossStageStats(raw.boss.stage);
      ASSERT2(raw.boss.maxHp === STAGE_STATS.hp && raw.boss.attackPower === STAGE_STATS.attackPower);
    }
    const RUNTIME = raw.boss.patternRuntime;
    ASSERT2(
      RUNTIME && Number.isFinite(RUNTIME.encounterElapsed) && RUNTIME.encounterElapsed >= 0 && RUNTIME.weights && RUNTIME.cooldowns
    );
    for (const ID of BOSS_PATTERN_IDS) {
      ASSERT2(
        Number.isFinite(RUNTIME.weights[ID]) && RUNTIME.weights[ID] >= 0 && RUNTIME.weights[ID] <= 3 && Number.isFinite(RUNTIME.cooldowns[ID]) && RUNTIME.cooldowns[ID] >= 0 && RUNTIME.cooldowns[ID] <= 10
      );
    }
    ASSERT2(
      Object.keys(RUNTIME.weights).length === BOSS_PATTERN_IDS.length && Object.keys(RUNTIME.cooldowns).length === BOSS_PATTERN_IDS.length
    );
    if (RUNTIME.active) {
      const A = RUNTIME.active;
      ASSERT2(
        BOSS_PATTERN_IDS.includes(A.id) && ["windup", "active", "recover"].includes(A.phase) && Number.isFinite(A.phaseElapsed) && A.phaseElapsed >= 0 && Number.isFinite(A.aim) && (A.targetId === 0 || VALID_BATTLE_UNIT_ID(A.targetId, raw.bossSummonSerial)) && typeof A.locked === "boolean" && Array.isArray(A.hitIds) && A.hitIds.length <= CONFIG.raid.capacity.battleUnits && A.hitIds.every((id) => VALID_BATTLE_UNIT_ID(id, raw.bossSummonSerial)) && new Set(A.hitIds).size === A.hitIds.length && INTEGER2(A.released, 0, 4) && INTEGER2(A.volleyCount, 0, 4)
      );
      if (A.target) {
        ASSERT2(Number.isFinite(A.target.x) && Number.isFinite(A.target.y) && Number.isFinite(A.target.z));
      }
      if (A.path) {
        validatePath(A.path);
      }
    }
    ASSERT2(["idle", "fighting", "victory", "defeat"].includes(raw.encounter.outcome) && raw.encounter.elapsed >= 0);
    ASSERT2(raw.running === (raw.encounter.outcome === "fighting"));
    ASSERT2(
      typeof raw.raidDeploymentStarted === "boolean" && (!raw.raidDeploymentStarted || raw.raidRosters.length === raw.raidExpectedPlayers.length)
    );
    return true;
  }
  function validatePath(p) {
    ASSERT2(p && p.from && p.to && p.duration > 0 && Number.isFinite(p.height));
    for (const K of ["x", "y"]) {
      ASSERT2(Number.isFinite(p.from[K]) && Number.isFinite(p.to[K]));
    }
    ASSERT2(Number.isFinite(p.from.z));
  }

  // src/farm-snapshot-migrations.js
  function normalizeSnapshot(raw, { clone: clone2 = true } = {}) {
    const SNAPSHOT = clone2 ? structuredClone(raw) : raw;
    validateSnapshot(SNAPSHOT);
    return SNAPSHOT;
  }

  // src/farm-state.js
  init_farm_plot();
  function restore(raw) {
    raw = normalizeSnapshot(raw);
    validateSnapshot(raw);
    const G = new GARDEN();
    const { units: UNIT_DATA, farmPlots: PLOT_FOODS, ...WORLD_DATA } = structuredClone(raw);
    G.resetUnits();
    Object.assign(G, WORLD_DATA);
    G.farmPlots = new Map(
      G.playerProgression.farmPlots.plots.map((plot) => [
        plot.id,
        new FarmPlot(plot, PLOT_FOODS.find((saved) => saved.id === plot.id)?.food || [])
      ])
    );
    G.activePlotId = G.playerProgression.farmPlots.currentPlotId;
    G.food = G.activeFarmPlot?.food || [];
    G.bindFarmPlotProgressionStates();
    G.bossRewardReceipts = G.bossRewardReceipts.map((reward) => ({
      ...reward,
      boxes: [],
      revealedCount: reward.status === "ready" ? reward.boxCount : 0
    }));
    G.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(raw.rng.state);
    if (G.boss.patternRuntime.active) {
      G.boss.patternRuntime.active.hitIds = new Set(raw.boss.patternRuntime.active.hitIds);
    }
    G.resetUnits(
      UNIT_DATA.map((data) => {
        const U = Object.assign(new UNIT(data.id, data.species, data.tier, data.x, data.y), structuredClone(data));
        U.ability = Object.assign(CREATE_UNIT_ATTACK_CYCLE(U), structuredClone(data.ability));
        const SPECIAL = CREATE_UNIT_SPECIAL_ABILITY(U);
        U.specialAbility = SPECIAL ? Object.assign(SPECIAL, structuredClone(data.specialAbility || {})) : null;
        return U;
      })
    );
    G.reconcileMateReservations();
    return G;
  }

  // src/farm-app.js
  init_version();

  // src/food-feel.js
  var DOLLAR = (id) => document.getElementById(id);
  var FoodFeel = class {
    constructor(requestFeed2) {
      this.button = DOLLAR("feed");
      this.progress = DOLLAR("warehouseProgress");
      this.pips = [...this.progress.querySelectorAll(".tap-pip")];
      this.completeUntil = 0;
      this.pulseUntil = 0;
      this.animations = /* @__PURE__ */ new Map();
      this.voices = /* @__PURE__ */ new Set();
      this.lastSound = {};
      this.frameId = 0;
      this.soundFrame = {};
      this.muted = false;
      this.peakVoices = 0;
      this.counts = {
        manual: 0,
        auto: 0,
        complete: 0,
        land: 0,
        eat: 0
      };
      this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      try {
        this.muted = localStorage.getItem("budmori.food.muted") === "true";
      } catch {
      }
      this.updateSoundButton();
      DOLLAR("sound").onclick = () => {
        this.muted = !this.muted;
        this.unlock();
        this.silence();
        try {
          localStorage.setItem("budmori.food.muted", String(this.muted));
        } catch {
        }
        this.updateSoundButton();
      };
      const POINTERS = /* @__PURE__ */ new Map();
      const STOP_POINTER = (id, activate = false) => {
        const POINTER = POINTERS.get(id);
        if (!POINTER) {
          return;
        }
        clearTimeout(POINTER.timeout);
        clearInterval(POINTER.interval);
        POINTERS.delete(id);
        if (activate && !POINTER.started) {
          requestFeed2();
        }
        if (this.button.hasPointerCapture(id)) {
          this.button.releasePointerCapture(id);
        }
      };
      this.button.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || !e.isPrimary || this.button.disabled) {
          return;
        }
        e.preventDefault();
        this.unlock();
        const POINTER = { started: false, timeout: 0, interval: 0 };
        POINTERS.set(e.pointerId, POINTER);
        this.button.setPointerCapture(e.pointerId);
        this.animate(
          this.button,
          [{ transform: "scale(1)" }, { transform: this.reduced ? "scale(1)" : "scale(1.035,.94)" }],
          75
        );
        POINTER.timeout = setTimeout(() => {
          if (!POINTERS.has(e.pointerId)) {
            return;
          }
          POINTER.started = true;
          if (!requestFeed2()) {
            return;
          }
          POINTER.interval = setInterval(() => {
            if (!requestFeed2()) {
              clearInterval(POINTER.interval);
              POINTER.interval = 0;
            }
          }, 100);
        }, 100);
      });
      this.button.addEventListener("pointerup", (e) => {
        if (!POINTERS.has(e.pointerId)) {
          return;
        }
        e.preventDefault();
        const R2 = this.button.getBoundingClientRect();
        STOP_POINTER(
          e.pointerId,
          e.clientX >= R2.left && e.clientX <= R2.right && e.clientY >= R2.top && e.clientY <= R2.bottom
        );
      });
      const CANCEL = (e) => STOP_POINTER(e.pointerId);
      this.button.addEventListener("pointercancel", CANCEL);
      this.button.addEventListener("lostpointercapture", CANCEL);
      const CANCEL_ALL = () => {
        for (const ID of [...POINTERS.keys()]) {
          STOP_POINTER(ID);
        }
      };
      window.addEventListener("blur", () => {
        CANCEL_ALL();
        this.silence();
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          CANCEL_ALL();
          this.silence();
        }
      });
      window.addEventListener("pagehide", () => {
        CANCEL_ALL();
        this.silence();
        for (const A of this.animations.values()) {
          A.cancel();
        }
        this.animations.clear();
        this.audio?.close().catch(() => {
        });
      });
    }
    updateSoundButton() {
      const B = DOLLAR("sound");
      DOLLAR("soundState").textContent = this.muted ? "꺼짐" : "켜짐";
      B.setAttribute("aria-pressed", String(!this.muted));
      B.setAttribute("aria-label", this.muted ? "효과음 켜기" : "효과음 끄기");
    }
    unlock() {
      if (this.muted) {
        return;
      }
      try {
        if (!this.audio) {
          this.audio = new AudioContext();
          this.master = this.audio.createGain();
          this.master.gain.value = 0.22;
          this.master.connect(this.audio.destination);
        }
        if (this.audio.state === "suspended") {
          this.audio.resume().catch(() => {
          });
        }
      } catch {
      }
    }
    silence() {
      for (const V of this.voices) {
        try {
          V.o.stop();
        } catch {
        }
      }
    }
    sound(kind, step = 0) {
      if (this.muted || !this.audio || this.audio.state !== "running" || document.hidden) {
        return;
      }
      const NOW = this.audio.currentTime, GAP = kind === "tap" ? 0.025 : kind === "complete" ? 0.055 : 0.09;
      if (this.soundFrame[kind] === this.frameId || NOW - (this.lastSound[kind] ?? -99) < GAP || this.voices.size >= 4) {
        return;
      }
      this.soundFrame[kind] = this.frameId;
      this.lastSound[kind] = NOW;
      const DEFS = {
        tap: [340 + step * 65, 420 + step * 65, 0.055, 0.14],
        complete: [520, 1040, 0.12, 0.2],
        land: [240, 150, 0.065, 0.1],
        eat: [740, 990, 0.09, 0.09],
        strike: [180, 80, 0.075, 0.16],
        heavy: [95, 42, 0.16, 0.22],
        launch: [290, 145, 0.06, 0.07]
      }, [HZ, END, DURATION3, GAIN] = DEFS[kind];
      const O = this.audio.createOscillator(), G = this.audio.createGain(), V = {
        o: O,
        g: G
      };
      O.type = kind === "land" ? "sine" : "triangle";
      O.frequency.setValueAtTime(HZ, NOW);
      O.frequency.exponentialRampToValueAtTime(END, NOW + DURATION3);
      G.gain.setValueAtTime(0, NOW);
      G.gain.linearRampToValueAtTime(GAIN, NOW + 4e-3);
      G.gain.exponentialRampToValueAtTime(1e-4, NOW + DURATION3);
      O.connect(G);
      G.connect(this.master);
      this.voices.add(V);
      this.peakVoices = Math.max(this.peakVoices, this.voices.size);
      O.onended = () => {
        O.disconnect();
        G.disconnect();
        this.voices.delete(V);
      };
      O.start(NOW);
      O.stop(NOW + DURATION3 + 0.01);
    }
    animate(el, frames, duration) {
      this.animations.get(el)?.cancel();
      const A = el.animate(frames, {
        duration,
        easing: "ease-out"
      });
      this.animations.set(el, A);
      A.onfinish = () => {
        if (this.animations.get(el) === A) {
          this.animations.delete(el);
        }
      };
    }
    tap(source, complete, remainder) {
      this.counts[source]++;
      const NOW = performance.now(), MANUAL = source === "manual", TARGET = MANUAL ? this.button : this.progress;
      this.impactTarget = TARGET;
      if (complete) {
        this.counts.complete++;
        this.completeUntil = NOW + (MANUAL ? 190 : 100);
      }
      if (MANUAL || NOW > this.pulseUntil) {
        this.pulseUntil = NOW + (MANUAL ? 150 : 55);
        TARGET.dataset.impact = complete && MANUAL ? "complete" : MANUAL ? "manual" : "auto";
        this.animate(
          TARGET,
          [
            {
              transform: this.reduced || !MANUAL ? "scale(1)" : complete ? "translateY(3px) scale(1.06,.90)" : "scale(1.025,.95)",
              filter: MANUAL ? "brightness(1.16)" : "brightness(1.035)"
            },
            {
              transform: "translateY(0) scale(1)",
              filter: "brightness(1)"
            }
          ],
          MANUAL ? complete ? 210 : 125 : 70
        );
      }
      const PIP = this.pips[complete ? 4 : remainder - 1];
      this.animate(
        PIP,
        [
          {
            transform: this.reduced ? "scale(1)" : "scaleY(1.8)",
            background: "#fffbea"
          },
          {
            transform: "scaleY(1)",
            background: complete ? "#fff1b9" : "#fff1b9"
          }
        ],
        MANUAL ? 160 : 70
      );
      for (let i = 0; i < 5; i++) {
        this.pips[i].classList.toggle("filled", complete || i < remainder);
      }
      if (MANUAL) {
        this.sound(complete ? "complete" : "tap", remainder);
      }
    }
    manualScatter() {
      this.counts.manual++;
      this.pulseUntil = performance.now() + 150;
      this.impactTarget = this.button;
      this.button.dataset.impact = "manual";
      this.animate(
        this.button,
        [
          { transform: this.reduced ? "scale(1)" : "scale(1.025,.95)", filter: "brightness(1.16)" },
          { transform: "translateY(0) scale(1)", filter: "brightness(1)" }
        ],
        125
      );
      this.sound("tap", 0);
    }
    event(kind) {
      if (kind === "food-land" || kind === "eat") {
        const KEY2 = kind === "eat" ? "eat" : "land";
        this.counts[KEY2]++;
        this.sound(KEY2);
      }
    }
    frame(now) {
      this.frameId++;
      if (now > this.pulseUntil && this.impactTarget) {
        this.impactTarget.dataset.impact = "";
        this.impactTarget = null;
      }
    }
  };

  // src/combat-feel.js
  init_farm_model();
  init_presentation7();
  init_presentation9();
  var { ObjectPool: OBJECT_POOL } = globalThis.BloomGamekitObjectPool;
  var EMPTY_NOTICES = Object.freeze([]);
  var RICE_CRITICAL_PRESENTATION = new RiceCriticalPresentation();
  var BARLEY_SHRED_PRESENTATION3 = new BarleyArmorShredPresentation();
  var CREATE_LANDING_EFFECT = () => ({
    sequence: 0,
    kind: "unit-land",
    time: 0,
    unit: null,
    x: 0,
    y: 0,
    z: 0,
    strength: 0,
    at: 0,
    heard: false
  });
  function resetLandingEffect(e) {
    e.sequence = e.time = e.x = e.y = e.z = e.strength = e.at = 0;
    e.unit = null;
    e.heard = false;
  }
  var BurstPresentation = class {
    draw(renderer, event, progress) {
      const T = Math.min(1, progress / this.durationFraction), ALPHA = 1 - T;
      if (ALPHA <= 0) {
        return;
      }
      const SIZE = this.size(event), COLOR = this.color;
      renderer.ring(event.x, event.y, 0.15 + T * SIZE, `rgba(${COLOR},${ALPHA * 0.8})`, this.ringWidth);
      const CENTER = renderer.project(event.x, event.y, event.z || 0.1), N = this.particleCount;
      for (let i = 0; i < N; i++) {
        const ANGLE = i * Math.PI * 2 / N + event.sequence % 11 * 0.19, DISTANCE = (0.12 + T * SIZE) * this.distanceMultiplier, POINT2 = renderer.project(
          event.x + Math.cos(ANGLE) * DISTANCE,
          event.y + Math.sin(ANGLE) * DISTANCE,
          (event.z || 0.1) + this.elevation(T)
        );
        this.drawParticle(renderer, POINT2, CENTER, ANGLE, ALPHA, COLOR, T);
      }
      this.drawFlash?.(renderer, CENTER, T);
    }
  };
  var HitPresentation = class extends BurstPresentation {
    durationFraction = 0.7;
    ringWidth = 0.075;
    particleCount = 6;
    distanceMultiplier = 1;
    draw(renderer, event, progress) {
      super.draw(renderer, event, progress);
      if (event.critical) {
        RICE_CRITICAL_PRESENTATION.drawCriticalHit(renderer, event, progress);
      }
    }
    size(event) {
      return event.attackKind === "sweep" ? 1.15 : 0.6;
    }
    elevation(progress) {
      return Math.sin(progress * Math.PI) * 0.5;
    }
    drawParticle(renderer, point2, center, _angle, alpha) {
      const INNER = {
        x: center.x + (point2.x - center.x) * 0.55,
        y: center.y + (point2.y - center.y) * 0.55
      };
      renderer.line(INNER, point2, 0.055, `rgba(255,242,190,${alpha})`);
    }
    drawFlash(renderer, center, progress) {
      if (progress < 0.28) {
        renderer.ellipse(
          center.x,
          center.y,
          renderer.scale * 0.18 * (1 - progress),
          renderer.scale * 0.12 * (1 - progress),
          "#fff4d6"
        );
      }
    }
  };
  var BossHitPresentation = class extends HitPresentation {
    color = "245,199,102";
    observe(feel, _event, displayEvent) {
      feel.counts.hits++;
      feel.bossHit = displayEvent;
    }
    sound(audio, event) {
      audio.sound("strike", event.species || 0);
    }
  };
  var UnitHitPresentation = class extends HitPresentation {
    color = "231,147,83";
    observe(feel, event, _displayEvent, at) {
      feel.poses.set(event.unit, {
        at,
        until: at + 180,
        strength: event.strength * (event.critical ? 1.4 : 1)
      });
      feel.counts.hits++;
    }
    sound(audio, event) {
      audio.sound(event.attackKind === "sweep" ? "heavy" : "strike");
    }
  };
  var UnitLandingPresentation = class extends BurstPresentation {
    durationFraction = 0.9;
    color = "157,142,107";
    ringWidth = 0.045;
    particleCount = 5;
    distanceMultiplier = 1.2;
    acquire(feel, event, at) {
      return feel.acquireLandingEffect(event, at);
    }
    release(feel, event) {
      feel.landingPool.release(event);
    }
    observe(feel) {
      feel.counts.landings++;
    }
    sound(audio, event) {
      if (event.strength > 0.2) {
        audio.sound("land");
      }
    }
    size() {
      return 0.7;
    }
    elevation() {
      return 0.12;
    }
    drawParticle(renderer, point2, _center, angle, alpha, color, progress) {
      renderer.ellipse(
        point2.x,
        point2.y,
        renderer.scale * 0.09 * (1 - progress),
        renderer.scale * 0.045 * (1 - progress),
        `rgba(${color},${alpha * 0.65})`,
        angle
      );
    }
  };
  var AttackLaunchPresentation = class {
    draw(renderer, event, progress) {
      const T = Math.min(1, progress / 0.35), P = renderer.project(event.x, event.y, event.z + 0.2);
      if (T < 1) {
        renderer.ellipse(P.x, P.y, renderer.scale * 0.12 * (1 - T), renderer.scale * 0.2 * (1 - T), "#ffe7a6");
      }
    }
  };
  var BossLaunchPresentation = class {
    sound(audio) {
      audio.sound("launch");
    }
  };
  var COMBAT_EFFECT_PRESENTATIONS = /* @__PURE__ */ new Map([
    ["boss-hit", Object.freeze(new BossHitPresentation())],
    ["unit-hit", Object.freeze(new UnitHitPresentation())],
    ["barley-shred", Object.freeze(BARLEY_SHRED_PRESENTATION3)],
    ["unit-land", Object.freeze(new UnitLandingPresentation())],
    ["attack-launch", Object.freeze(new AttackLaunchPresentation())],
    ["boss-launch", Object.freeze(new BossLaunchPresentation())]
  ]);
  var CombatFeel = class {
    constructor(audio) {
      this.audio = audio;
      this.world = null;
      this.revision = null;
      this.sequence = 0;
      this.effects = [];
      this.landingPool = new OBJECT_POOL(CREATE_LANDING_EFFECT, resetLandingEffect, 48);
      this.poses = /* @__PURE__ */ new Map();
      this.bossHit = null;
      this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.counts = {
        hits: 0,
        landings: 0
      };
    }
    acquireLandingEffect(e, at) {
      const EVENT = this.landingPool.acquire();
      EVENT.sequence = e.sequence;
      EVENT.time = e.time;
      EVENT.unit = e.unit;
      EVENT.x = e.x;
      EVENT.y = e.y;
      EVENT.z = e.z;
      EVENT.strength = e.strength;
      EVENT.at = at;
      EVENT.heard = false;
      return EVENT;
    }
    releaseEffect(event) {
      COMBAT_EFFECT_PRESENTATIONS.get(event.kind)?.release?.(this, event);
    }
    observe(world, displayTimeMs, revision = 0, notices = EMPTY_NOTICES) {
      if (this.world !== world || this.revision !== revision) {
        this.world = world;
        this.revision = revision;
        this.sequence = world.eventSequence;
        for (const E of this.effects) {
          this.releaseEffect(E);
        }
        this.effects.length = 0;
        this.poses.clear();
        this.bossHit = null;
        return;
      }
      for (const E of notices) {
        if (E.sequence <= this.sequence) {
          continue;
        }
        const PRESENTATION = COMBAT_EFFECT_PRESENTATIONS.get(E.kind);
        if (!PRESENTATION) {
          continue;
        }
        const AT = presentationEventTimeMs(E), EVENT = PRESENTATION.acquire?.(this, E, AT) ?? { ...E, at: AT, heard: false };
        this.effects.push(EVENT);
        if (this.effects.length > 48) {
          this.releaseEffect(this.effects.shift());
        }
        PRESENTATION.observe?.(this, E, EVENT, AT);
      }
      this.sequence = world.eventSequence;
      let retained = 0;
      for (const E of this.effects) {
        if (displayTimeMs - E.at < 430) {
          this.effects[retained++] = E;
        } else {
          this.releaseEffect(E);
        }
      }
      this.effects.length = retained;
      for (const [ID, P] of this.poses) {
        if (displayTimeMs > P.until) {
          this.poses.delete(ID);
        }
      }
    }
    squash(id, displayTimeMs) {
      const P = this.poses.get(id);
      return !P || this.reduced ? 0 : Math.sin(Math.min(1, (displayTimeMs - P.at) / 180) * Math.PI) * Math.min(0.2, P.strength * 0.12);
    }
    boss(displayTimeMs) {
      const E = this.bossHit;
      if (!E || this.reduced) {
        return {
          x: 0,
          y: 0,
          squash: 0
        };
      }
      const Q = Math.max(0, Math.min(1, (displayTimeMs - E.at) / 160)), K = Math.sin(Q * Math.PI) * (1 - Q);
      return {
        x: -E.nx * K * 0.1,
        y: -E.ny * K * 0.1,
        squash: K * 0.035 * (E.critical ? 1.4 : 1)
      };
    }
    sound(event) {
      COMBAT_EFFECT_PRESENTATIONS.get(event.kind)?.sound?.(this.audio, event);
    }
    draw(r, displayTimeMs) {
      for (const E of this.effects) {
        const AGE = displayTimeMs - E.at;
        if (AGE < 0 || AGE > 430) {
          continue;
        }
        if (!E.heard) {
          E.heard = true;
          this.sound(E);
        }
        const PRESENTATION = COMBAT_EFFECT_PRESENTATIONS.get(E.kind);
        PRESENTATION?.draw?.(r, E, AGE / 430);
      }
    }
  };

  // src/raid-roster.js
  init_factions();
  function raidRosterEntries(units, limit = 100) {
    if (!Array.isArray(units) || !Number.isSafeInteger(limit) || limit < 0) {
      return [];
    }
    return units.filter(
      (unit) => unit?.hp > 0 && unit.down <= 0 && hasFaction(unit, FACTION_CONFIG.PLAYER) && !unit.isBattleOnlySummon && unit.countsTowardPermanentRoster !== false && unit.eligibleForRaidDeployment !== false
    ).slice(0, limit).map((unit) => [unit.id, unit.species, unit.tier]);
  }
  function hasRaidRosterEntries(units) {
    return Array.isArray(units) && units.some(
      (unit) => unit?.hp > 0 && unit.down <= 0 && hasFaction(unit, FACTION_CONFIG.PLAYER) && !unit.isBattleOnlySummon && unit.countsTowardPermanentRoster !== false && unit.eligibleForRaidDeployment !== false
    );
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
  var DEFAULT_ABILITY_PRESENTATION = {
    label(_definition, _value, level) {
      return `강화 ${level}`;
    },
    title() {
      return "능력 강화";
    }
  };
  var INVESTMENT_REASON_LABELS = /* @__PURE__ */ new Map([
    ["already-invested", "이미 투자한 노드예요."],
    ["prerequisite-required", "이전 단계에 먼저 투자하세요."],
    ["insufficient-points", "공용 포인트가 필요해요."],
    ["combat-lock", "전투 중에는 투자할 수 없어요."],
    ["farm-only", "농장에서만 투자할 수 있어요."],
    ["max-level", "최대 강화 단계예요."],
    ["invalid-state", "성장 데이터가 유효하지 않아요."]
  ]);
  var NODE_REASON_LABELS = new Map([...Array.from(INVESTMENT_REASON_LABELS, ([reason, text]) => [reason, () => text])]);
  var RESET_REASON_LABELS = /* @__PURE__ */ new Map([
    ["nothing-invested", "투자한 포인트가 없어요."],
    ["combat-lock", "전투 중에는 초기화할 수 없어요."],
    ["farm-only", "농장에서만 초기화할 수 있어요."],
    ["invalid-state", INVESTMENT_REASON_LABELS.get("invalid-state")]
  ]);
  var FARM_UPGRADE_REASON_LABELS = new Map([
    ...["combat-lock", "farm-only", "max-level", "invalid-state"].map((reason) => [
      reason,
      INVESTMENT_REASON_LABELS.get(reason)
    ]),
    ["insufficient-points", "공용 포인트가 필요해요."]
  ]);
  function renderFarmUpgradeTreeMarkup(state, { location: location2 = "farm", inCombat = false } = {}) {
    if (!isValidPlayerProgressionState(state)) {
      throw new TypeError("Cannot render invalid player progression state");
    }
    const NODES = FARM_UPGRADE_NODES.map((node) => {
      const LEVEL = state.farmUpgrades[node.id];
      const CHECK = canPurchaseFarmUpgrade(state, node.id, {
        location: location2,
        inCombat
      });
      return `<article class="tree-node" data-ready="${CHECK.allowed}"><div class="node-heading"><span class="node-icon" aria-hidden="true">${node.icon}</span><h3>${node.name}</h3><span>${LEVEL}/${FARM_UPGRADE_MAX_LEVELS[node.id]}</span></div><p>${node.description}</p><div class="node-values">${node.value(LEVEL)}${LEVEL < FARM_UPGRADE_MAX_LEVELS[node.id] ? ` <span>→ ${node.value(LEVEL + 1)}</span>` : ""}</div><small>${LEVEL === FARM_UPGRADE_MAX_LEVELS[node.id] ? "완료" : CHECK.reason ? farmUpgradeReasonLabel(CHECK.reason) : "공용 포인트 1개"}</small><button type="button" data-progression-farm-node="${node.id}" aria-disabled="${!CHECK.allowed}" ${CHECK.allowed ? "" : "disabled"}>${LEVEL === FARM_UPGRADE_MAX_LEVELS[node.id] ? "✓" : "+"}<span class="sr-only">${node.name} 투자</span></button></article>`;
    }).join("");
    return `<section class="farm-upgrade-tree" aria-label="공통 스탯"><p class="ability-tree__wallet" aria-live="polite"><strong>${state.availablePoints}</strong><span>공용 포인트</span></p>${renderPlayerProgressMarkup(state)}<div class="farm-upgrade-tree__nodes">${NODES}</div></section>`;
  }
  function renderAbilitySpeciesTabsMarkup(selectedSpecies = 0) {
    return SPECIES_CATALOG.map(
      (species) => `<button type="button" data-ability-species="${species.id}" aria-pressed="${species.id === selectedSpecies}">${species.name}</button>`
    ).join("");
  }
  function renderAbilityTreeMarkup(state, { highestSpeciesTier = {}, location: location2 = "farm", inCombat = false, selectedSpecies = null } = {}) {
    if (!isValidAbilityProgressionState(state)) {
      throw new TypeError("Cannot render invalid ability progression state");
    }
    const INVESTED = getInvestedAbilityPointCount(state, Number.isInteger(selectedSpecies) ? selectedSpecies : null);
    const CONTEXT = {
      highestSpeciesTier,
      location: location2,
      inCombat
    };
    const RESET_CHECK = canResetAbilityProgression(
      state,
      CONTEXT,
      Number.isInteger(selectedSpecies) ? selectedSpecies : null
    );
    const VISIBLE_DEFINITIONS = Number.isInteger(selectedSpecies) ? SPECIES_ABILITY_DEFINITIONS.filter((definition) => definition.species === selectedSpecies) : SPECIES_ABILITY_DEFINITIONS;
    const CARDS = VISIBLE_DEFINITIONS.map((definition) => renderAbilityCard(state, definition, CONTEXT)).join("") || `<p class="ability-tree__note" role="status">이 병종은 기본 공격으로 전투에 참여해요. 전용 특수 능력 트리는 아직 추가되지 않았어요.</p>`;
    const LEVEL_MARKUP = renderPlayerProgressMarkup(state), DEFAULTS_NOTE = "모든 일반 병종의 대표 능력은 Common(T1)부터 무료로 적용됩니다. 공용 포인트로 능력 효과를 강화할 수 있어요.";
    return `<section class="ability-tree" aria-labelledby="ability-tree-title">
    <header class="ability-tree__header">
      <div><p class="ability-tree__eyebrow">농장 성장</p><h2 id="ability-tree-title">병종 특성</h2></div>
      <p class="ability-tree__wallet" aria-live="polite"><strong>${state.availablePoints}</strong><span>공용 포인트</span></p>
    </header>
    <p class="ability-tree__note">${DEFAULTS_NOTE}</p>
    ${LEVEL_MARKUP}
    <div class="ability-tree__actions">
      <p class="ability-tree__lock-note" role="status">${inCombat ? "전투 중에는 투자와 초기화가 잠겨요." : location2 !== "farm" ? "농장에서 투자하거나 초기화할 수 있어요." : "농장에서 무료로 초기화할 수 있어요."}</p>
      <button type="button" class="ability-tree__reset" data-ability-action="reset" aria-describedby="ability-tree-reset-help" aria-disabled="${!RESET_CHECK.allowed}">무료 초기화</button>
      <span class="ability-tree__action-help" id="ability-tree-reset-help">${resetReasonLabel(RESET_CHECK.reason, INVESTED)}</span>
    </div>
    <div class="ability-tree__cards">${CARDS}</div>
  </section>`;
  }
  function renderPlayerProgressMarkup(state) {
    if (!Number.isSafeInteger(state.level) || state.level < 1 || !Number.isFinite(state.experience) || state.experience < 0) {
      return "";
    }
    const NEXT_LEVEL_XP = experienceForNextLevel(state.level);
    if (!Number.isFinite(NEXT_LEVEL_XP) || state.experience >= NEXT_LEVEL_XP) {
      return "";
    }
    const LABEL = `플레이어 레벨 ${state.level} 경험치`;
    return `<div class="ability-tree__progress" aria-live="polite">
    <div><strong>플레이어 Lv. ${state.level}</strong><span>${formatXpForDisplay(state.experience)} / ${formatXpForDisplay(NEXT_LEVEL_XP)} XP</span></div>
    <progress max="${NEXT_LEVEL_XP}" value="${state.experience}" aria-label="${LABEL}"></progress>
  </div>`;
  }
  function renderAbilityCard(state, definition, context) {
    const INVESTMENT = state.abilities[definition.id];
    const POWER_NODES = definition.powerValues.slice(1).map((value, index) => {
      const LEVEL = index + 1;
      const LABEL = powerLabel(definition, value, LEVEL);
      return renderNode(state, definition, `power-${LEVEL}`, powerTitle(definition, value), LABEL, context);
    }).join("");
    const BRANCH_SECTIONS = Object.entries(definition.branches || {}).map(([branchId, branch]) => {
      const NODES = branch.values.slice(1).map((value, index) => {
        const LEVEL = index + 1;
        return renderNode(
          state,
          definition,
          `branch-${branchId}-${LEVEL}`,
          branchTitle(definition, branchId, value, LEVEL),
          branchLabel(definition, branchId, value, LEVEL),
          context
        );
      }).join("");
      return `<section class="ability-branch" aria-label="${branch.name}"><h4>${branch.name}</h4><div class="ability-branch__nodes">${NODES}</div></section>`;
    }).join("");
    const CURRENT_EFFECT = [
      powerLabel(definition, definition.powerValues[INVESTMENT.powerLevel], INVESTMENT.powerLevel),
      ...Object.entries(definition.branches || {}).map(
        ([branchId, branch]) => branchLabel(
          definition,
          branchId,
          branch.values[INVESTMENT.branchLevels?.[branchId] || 0],
          INVESTMENT.branchLevels?.[branchId] || 0
        )
      )
    ].join(" · ");
    const BASE_EFFECT = [
      powerLabel(definition, definition.powerValues[0], 0),
      ...Object.entries(definition.branches || {}).map(
        ([branchId, branch]) => branchLabel(definition, branchId, branch.values[0], 0)
      )
    ].join(" · ");
    const SPECIES_NAME = speciesById(definition.species).name, CURRENT_LABEL = "현재 효과";
    return `<article class="ability-card" data-species="${definition.species}" data-ability="${definition.id}">
    <header class="ability-card__header"><div><p class="ability-card__species">${SPECIES_NAME}</p><h3>${definition.name}</h3></div><span class="ability-card__grade">Common(T1)</span></header>
    <p class="ability-card__description">${definition.description}</p>
    <p class="ability-card__current-effect">${CURRENT_LABEL}: ${CURRENT_EFFECT}</p>
    <div class="ability-card__root"><p class="ability-card__base-effect">Common: ${BASE_EFFECT}</p></div>
    <div class="ability-card__branches">
      <section class="ability-branch" aria-label="능력 강화 경로"><h4>능력 강화</h4><div class="ability-branch__nodes">${POWER_NODES}</div></section>
      ${BRANCH_SECTIONS}
    </div>
  </article>`;
  }
  function renderNode(state, definition, nodeId, title, effect, context, knownStatus = null) {
    const STATUS = knownStatus || getAbilityNodeStatus(state, definition, nodeId, context);
    const HINT_ID = `ability-help-${definition.id}-${nodeId.replace(/[^a-z0-9-]/gi, "-")}`;
    const STATUS_TEXT = STATUS.purchased ? "투자 완료" : nodeReasonLabel(STATUS.reason, definition, context);
    const ATTR = `${definition.id}:${nodeId.replace(/-(\d+)$/, ":$1")}`;
    return `<div class="ability-node ${STATUS.purchased ? "is-purchased" : ""} ${STATUS.ready ? "is-ready" : "is-locked"}">
    <button type="button" class="ability-node__button" data-ability-node="${ATTR}" aria-describedby="${HINT_ID}" aria-disabled="${!STATUS.ready}">
      <span class="ability-node__title">${title}</span><span class="ability-node__effect">${effect}</span><span class="ability-node__cost">${STATUS.purchased ? "완료" : "1 포인트"}</span>
    </button>
    <span class="ability-node__status" id="${HINT_ID}">${STATUS_TEXT}</span>
  </div>`;
  }
  function powerLabel(definition, value, level) {
    return (abilityPresentationFor(definition.id) || DEFAULT_ABILITY_PRESENTATION).label(
      definition,
      value,
      level,
      abilityProfile(definition.species)
    );
  }
  function powerTitle(definition, value) {
    return (abilityPresentationFor(definition.id) || DEFAULT_ABILITY_PRESENTATION).title(value);
  }
  function branchLabel(definition, branchId, value, level) {
    return abilityPresentationFor(definition.id)?.branchLabel?.(
      definition,
      branchId,
      value,
      level,
      abilityProfile(definition.species)
    ) ?? `${definition.branches[branchId].name} ${value}`;
  }
  function branchTitle(definition, branchId, value, level) {
    return abilityPresentationFor(definition.id)?.branchTitle?.(
      definition,
      branchId,
      value,
      level,
      abilityProfile(definition.species)
    ) ?? `${definition.branches[branchId].name} ${value}`;
  }
  function nodeReasonLabel(reason, definition, context) {
    return NODE_REASON_LABELS.get(reason)?.(definition) ?? (context.location === "farm" ? "사용할 수 없는 노드예요." : "농장에서 사용할 수 있어요.");
  }
  function resetReasonLabel(reason, invested) {
    return RESET_REASON_LABELS.get(reason) ?? `투자 ${invested}개를 무료로 돌려받아요.`;
  }
  function farmUpgradeReasonLabel(reason) {
    return FARM_UPGRADE_REASON_LABELS.get(reason) ?? "사용할 수 없는 노드예요.";
  }

  // src/farm-app.js
  init_ability_progression();
  init_boss_rewards();
  init_farm_boss_stages();
  init_species_catalog();
  var DOLLAR2 = (id) => document.getElementById(id);
  var STORAGE = new FarmStorage();
  STORAGE.initializeIncompatible(new GARDEN());
  DOLLAR2("abilitySpeciesTabs").innerHTML = renderAbilitySpeciesTabsMarkup();
  var imported = null;
  var active = null;
  var home = true;
  var personalGarden = null;
  var unsubscribeProgress = null;
  var menuOpen = false;
  var menuTab = "play";
  var menuWasPaused = true;
  var menuPauseChanged = false;
  var menuAutoPaused = false;
  var panPointer = null;
  var foodHold = null;
  var farmSortTransition = null;
  var farmPanelRevision = -1;
  var bossEncounterOpen = false;
  var bossSwipe = null;
  var bossPauseBeforeOpen = null;
  var lastAutoSettledRunKey = null;
  var bossRewardRevealTimer = null;
  var bossRewardCalculationTimer = null;
  var bossRewardDialogReceiptKey = null;
  var bossRewardAnimationSerial = 0;
  var bossRewardPortraitReceiptKey = "";
  var BOSS_REWARD_CYCLE_TIMERS = /* @__PURE__ */ new Set();
  var AUTO_OPENED_BOSS_REWARDS = /* @__PURE__ */ new Set();
  var mergeStatusCache = {
    world: null,
    revision: -1,
    updatedAt: -Infinity,
    value: null
  };
  var RENDERER = new DIORAMA(DOLLAR2("world"));
  var FORMATION_UI = new FormationSkillsUI((kind, payload) => {
    const QUEUED = active?.queue(kind, payload) ?? false;
    setTimeout(renderProgressionResetActions, 180);
    return QUEUED;
  });
  var RAID_DEPLOYMENT_UI = new RaidDeploymentCardsUI({
    command: (kind, payload) => {
      const QUEUED = active?.queue(kind, payload) ?? false;
      setTimeout(renderProgressionResetActions, 180);
      return QUEUED;
    },
    deploy: (speciesId) => active?.deployNext(speciesId) ?? false,
    canDeploy: () => canUseWorldInput() && active?.world.scene === "raid" && !panPointer
  });
  var PERFORMANCE_DIAGNOSTICS = new PerformanceDiagnostics();
  STORAGE.profiler = PERFORMANCE_DIAGNOSTICS;
  function frameRate() {
    return PERFORMANCE_DIAGNOSTICS.frameRate();
  }
  function mergeAvailability(world, now) {
    if (mergeStatusCache.world !== world || mergeStatusCache.revision !== world.mergeAvailabilityRevision || now - mergeStatusCache.updatedAt >= 250) {
      mergeStatusCache = {
        world,
        revision: world.mergeAvailabilityRevision,
        updatedAt: now,
        value: world.mergeAvailability()
      };
    }
    return mergeStatusCache.value;
  }
  function rewardReceiptSummary(reward) {
    if (!reward) {
      return "보상 없음";
    }
    if (reward.status === "calculating") {
      const DONE = reward.calculation?.jobState?.processedTrials ?? 0;
      return "보상 상자 계산 중 (" + DONE + "/" + reward.boxCount + ")";
    }
    const ACQUIRED = reward.acquiredCount ?? reward.successCount ?? 0, PLACED = reward.placedCount ?? reward.grantedCount ?? 0, QUEUED = reward.queuedCount ?? Math.max(0, ACQUIRED - PLACED);
    if (ACQUIRED === 0) {
      return "이번에는 획득한 모리가 없어요";
    }
    return ACQUIRED + "마리 획득 · " + PLACED + "마리 배치" + (QUEUED ? " · " + QUEUED + "마리 자리 대기" : "");
  }
  function latestBossReward(world) {
    return [...world?.bossRewardReceipts || []].reverse().find((reward) => ["calculating", "ready"].includes(reward.status));
  }
  function bossRewardSummary(reward) {
    if (!reward) {
      return "보상 내역 없음";
    }
    if (reward.status === "calculating") {
      const DONE = reward.calculation?.jobState?.processedTrials ?? 0;
      return "보상 상자 계산 중 (" + DONE + "/" + reward.boxCount + ")";
    }
    const ACQUIRED = reward.acquiredCount ?? reward.successCount ?? 0, PLACED = reward.placedCount ?? reward.grantedCount ?? 0, QUEUED = reward.queuedCount ?? Math.max(0, ACQUIRED - PLACED);
    return ACQUIRED + "개 획득 · " + PLACED + "개 배치" + (QUEUED ? " · 공간 대기 " + QUEUED + "개" : "");
  }
  function persistBossRewardSettlement(world) {
    if (!saveImmediate(world)) {
      DOLLAR2("bossRewardSummary").textContent = "보상 진행 상황을 저장하지 못했어요: " + STORAGE.error;
      return false;
    }
    return true;
  }
  function renderBossRewardBoxes(receipt) {
    const COUNT = receipt.boxCount || 0, REVEALED = receipt.revealedCount || 0, BOXES = receipt.boxes || [], HAS_PRESENTATION = BOXES.length === COUNT, PAYOUTS = receipt.calculation?.payouts || BOXES.map((box) => box.payout), MIN = PAYOUTS.length ? Math.min(...PAYOUTS) : 0, MAX = PAYOUTS.length ? Math.max(...PAYOUTS) : 0, FIRST_CLEAR = receipt.firstClear === true, NOMINAL_CHANCE = receipt.baselineChance ?? (receipt.source === "farm" ? 0.1 : FIRST_CLEAR ? 0.15 : 0.05), CUMULATIVE = BOXES.slice(0, REVEALED).reduce((sum, box) => sum + (box.hit ? box.payout : 0), 0), PROCESSED = receipt.calculation?.jobState?.processedTrials ?? 0;
    DOLLAR2("bossRewardStage").textContent = receipt.stage ? (receipt.source === "raid" ? "승리 · " : "농장 보스 · ") + receipt.stage + "단계" : receipt.source === "farm" ? "농장 보스 승리" : "레이드 보스 승리";
    DOLLAR2("bossRewardRibbon").hidden = !FIRST_CLEAR;
    DOLLAR2("bossRewardTitle").textContent = receipt.status === "calculating" ? "보상 준비 중" : "승리 보상";
    DOLLAR2("bossRewardSummary").textContent = receipt.status === "calculating" ? "상자 " + COUNT + "개의 보상을 준비하고 있어요." : HAS_PRESENTATION ? COUNT + "회 추첨 · 상자당 " + MIN + (MIN === MAX ? "" : "–" + MAX) + "마리 · " + (FIRST_CLEAR ? "첫 클리어 " : "재도전 ") + Math.round(NOMINAL_CHANCE * 100) + "% (편성 반영 " + Math.round(receipt.chance * 100) + "%)" : "이미 확정된 보상 합계";
    DOLLAR2("bossRewardTotals").textContent = receipt.status === "calculating" ? "추첨 계산 " + PROCESSED + "/" + COUNT : "현재 합계 " + CUMULATIVE + "마리 · " + bossRewardSummary(receipt);
    DOLLAR2("bossRewardRevealCount").textContent = receipt.status === "calculating" ? "추첨 " + PROCESSED + "/" + COUNT : REVEALED + "/" + COUNT + " 상자 공개";
    const SCENE = DOLLAR2("bossRewardChestScene");
    if (receipt.status === "ready" && receipt.acquiredCount > 0 && bossRewardPortraitReceiptKey !== receipt.receiptKey) {
      const ENTRY = speciesById(receipt.species);
      if (ENTRY) {
        bossRewardPortraitReceiptKey = receipt.receiptKey;
        renderNeutralBossPreview(
          DOLLAR2("bossRewardPortrait"),
          receipt.species,
          ENTRY.asset,
          speciesRewardName(receipt.species)
        );
      }
    }
    DOLLAR2("bossRewardOpenAll").disabled = receipt.status !== "ready" || !HAS_PRESENTATION || REVEALED >= COUNT;
    DOLLAR2("bossRewardOpenAll").hidden = receipt.status !== "ready" || REVEALED >= COUNT;
    DOLLAR2("bossRewardClose").hidden = receipt.status !== "ready" || REVEALED < COUNT;
    if (!HAS_PRESENTATION && receipt.status === "ready") {
      SCENE.classList.add("is-settled");
    } else {
      SCENE.classList.remove("is-settled");
    }
  }
  function scheduleBossRewardCycle(callback, delay, serial) {
    const TIMER = setTimeout(() => {
      BOSS_REWARD_CYCLE_TIMERS.delete(TIMER);
      if (serial === bossRewardAnimationSerial) {
        callback();
      }
    }, delay);
    BOSS_REWARD_CYCLE_TIMERS.add(TIMER);
  }
  function cancelBossRewardCycle() {
    bossRewardAnimationSerial += 1;
    for (const TIMER of BOSS_REWARD_CYCLE_TIMERS) {
      clearTimeout(TIMER);
    }
    BOSS_REWARD_CYCLE_TIMERS.clear();
    const SCENE = DOLLAR2("bossRewardChestScene");
    SCENE?.classList.remove("is-compressing", "is-lid-open", "is-reward", "is-empty");
    if (SCENE) {
      SCENE.dataset.cycle = "";
    }
    const PRIZE = DOLLAR2("bossRewardPrize"), EMPTY = DOLLAR2("bossRewardEmpty");
    if (PRIZE) {
      PRIZE.hidden = true;
    }
    if (EMPTY) {
      EMPTY.hidden = true;
    }
  }
  function revealBossRewardBatch() {
    const WORLD = personalGarden || active?.world, RECEIPT = WORLD?.bossRewardReceipts.find((reward) => reward.receiptKey === bossRewardDialogReceiptKey);
    if (!WORLD || !RECEIPT || RECEIPT.status !== "ready") {
      clearInterval(bossRewardRevealTimer);
      bossRewardRevealTimer = null;
      cancelBossRewardCycle();
      return;
    }
    const FROM = RECEIPT.revealedCount || 0, TO = Math.min(RECEIPT.boxCount, FROM + 10), BATCH = RECEIPT.boxes.slice(FROM, TO), AMOUNT = BATCH.reduce((sum, box) => sum + (box.hit ? box.payout : 0), 0), SERIAL = ++bossRewardAnimationSerial, SCENE = DOLLAR2("bossRewardChestScene");
    if (FROM >= RECEIPT.boxCount || !BATCH.length) {
      clearInterval(bossRewardRevealTimer);
      bossRewardRevealTimer = null;
      renderBossRewardBoxes(RECEIPT);
      return;
    }
    SCENE.classList.remove("is-compressing", "is-lid-open", "is-reward", "is-empty");
    void SCENE.offsetWidth;
    SCENE.dataset.cycle = AMOUNT > 0 ? "hit" : "miss";
    SCENE.classList.add("is-compressing");
    DOLLAR2("bossRewardOutcome").textContent = "";
    DOLLAR2("bossRewardPopAmount").textContent = AMOUNT > 0 ? "+" + AMOUNT : "";
    DOLLAR2("bossRewardEmpty").hidden = true;
    DOLLAR2("bossRewardPrize").hidden = true;
    DOLLAR2("bossRewardRevealCount").textContent = "상자 " + TO + "/" + RECEIPT.boxCount + " · 보상 공개 중";
    scheduleBossRewardCycle(
      () => {
        SCENE.classList.remove("is-compressing");
        SCENE.classList.add("is-lid-open");
        if (AMOUNT > 0) {
          SCENE.classList.add("is-reward");
        }
      },
      100,
      SERIAL
    );
    scheduleBossRewardCycle(
      () => {
        if (AMOUNT > 0) {
          DOLLAR2("bossRewardPrize").hidden = false;
        } else {
          SCENE.classList.add("is-empty");
          DOLLAR2("bossRewardEmpty").hidden = false;
          DOLLAR2("bossRewardOutcome").textContent = "빈 상자";
        }
      },
      220,
      SERIAL
    );
    scheduleBossRewardCycle(
      () => {
        advanceBossRewardReveal(WORLD, RECEIPT.receiptKey, BATCH.length);
        renderBossRewardBoxes(RECEIPT);
      },
      420,
      SERIAL
    );
    scheduleBossRewardCycle(
      () => {
        SCENE.classList.remove("is-compressing", "is-lid-open", "is-reward", "is-empty");
        if (RECEIPT.revealedCount >= RECEIPT.boxCount) {
          clearInterval(bossRewardRevealTimer);
          bossRewardRevealTimer = null;
          renderBossRewardBoxes(RECEIPT);
        }
      },
      500,
      SERIAL
    );
  }
  function stopBossRewardCalculation() {
    clearInterval(bossRewardCalculationTimer);
    bossRewardCalculationTimer = null;
  }
  function advanceRaidRewardCalculation() {
    const WORLD = personalGarden, RECEIPT = WORLD?.bossRewardReceipts.find((reward) => reward.receiptKey === bossRewardDialogReceiptKey);
    if (!WORLD || !RECEIPT || RECEIPT.source !== "raid" || RECEIPT.status !== "calculating") {
      stopBossRewardCalculation();
      return;
    }
    advanceBossRewardCalculations(WORLD);
    if (RECEIPT.status !== "calculating") {
      stopBossRewardCalculation();
      persistBossRewardSettlement(WORLD);
    }
    if (!DOLLAR2("bossRewardDialog").hidden) {
      renderBossRewardBoxes(RECEIPT);
    }
  }
  function showBossRewardDialog(receipt, { auto = false } = {}) {
    if (!receipt || !["calculating", "ready"].includes(receipt.status)) {
      return;
    }
    const DIALOG = DOLLAR2("bossRewardDialog");
    clearInterval(bossRewardRevealTimer);
    bossRewardRevealTimer = null;
    cancelBossRewardCycle();
    if (bossRewardDialogReceiptKey !== receipt.receiptKey) {
      bossRewardPortraitReceiptKey = "";
    }
    bossRewardDialogReceiptKey = receipt.receiptKey;
    DIALOG.hidden = false;
    DOLLAR2("bossRewardOpen").hidden = true;
    renderBossRewardBoxes(receipt);
    if (auto && receipt.status === "ready" && !AUTO_OPENED_BOSS_REWARDS.has(receipt.receiptKey)) {
      AUTO_OPENED_BOSS_REWARDS.add(receipt.receiptKey);
    }
    if (receipt.status === "ready" && receipt.boxes?.length === receipt.boxCount && receipt.revealedCount < receipt.boxCount) {
      bossRewardRevealTimer = setInterval(revealBossRewardBatch, 500);
    }
  }
  function syncBossRewardDialog(world, { receiptKey = null, raidVictory = false } = {}) {
    const RECEIPT = receiptKey ? world?.bossRewardReceipts.find((reward) => reward.receiptKey === receiptKey) : latestBossReward(world), BUTTON = DOLLAR2("bossRewardOpen"), DIALOG = DOLLAR2("bossRewardDialog");
    if (home) {
      DIALOG.hidden = true;
      BUTTON.hidden = true;
      clearInterval(bossRewardRevealTimer);
      bossRewardRevealTimer = null;
      cancelBossRewardCycle();
      stopBossRewardCalculation();
      return;
    }
    BUTTON.hidden = !RECEIPT || RECEIPT.status === "ready" && RECEIPT.revealedCount >= RECEIPT.boxCount || !DIALOG.hidden;
    BUTTON.disabled = RECEIPT?.status === "calculating";
    if (!RECEIPT) {
      stopBossRewardCalculation();
      return;
    }
    BUTTON.textContent = RECEIPT.status === "calculating" ? "보상 계산 중…" : "보상 상자 열기";
    if (raidVictory && RECEIPT.status === "calculating" && (DIALOG.hidden || bossRewardDialogReceiptKey !== RECEIPT.receiptKey)) {
      showBossRewardDialog(RECEIPT);
    }
    if (RECEIPT.status === "ready" && !AUTO_OPENED_BOSS_REWARDS.has(RECEIPT.receiptKey)) {
      showBossRewardDialog(RECEIPT, { auto: true });
    } else if (!DIALOG.hidden && bossRewardDialogReceiptKey === RECEIPT.receiptKey) {
      renderBossRewardBoxes(RECEIPT);
    }
    if (raidVictory && RECEIPT.status === "calculating") {
      if (!bossRewardCalculationTimer) {
        bossRewardCalculationTimer = setInterval(advanceRaidRewardCalculation, 50);
      }
    } else {
      stopBossRewardCalculation();
    }
  }
  function closeBossRewardDialog() {
    const WORLD = personalGarden || active?.world, RECEIPT = WORLD?.bossRewardReceipts.find((reward) => reward.receiptKey === bossRewardDialogReceiptKey);
    if (RECEIPT?.status !== "ready" || RECEIPT.revealedCount < RECEIPT.boxCount) {
      return;
    }
    DOLLAR2("bossRewardDialog").hidden = true;
    DOLLAR2("bossRewardOpen").hidden = true;
    clearInterval(bossRewardRevealTimer);
    bossRewardRevealTimer = null;
    cancelBossRewardCycle();
  }
  function attachBossRewardHandlers() {
    DOLLAR2("bossRewardOpen").addEventListener("click", () => {
      showBossRewardDialog(latestBossReward(personalGarden || active?.world));
    });
    DOLLAR2("bossRewardClose").addEventListener("click", closeBossRewardDialog);
    DOLLAR2("bossRewardDialog").addEventListener("click", (event) => {
      if (event.target === event.currentTarget) {
        closeBossRewardDialog();
      }
    });
    DOLLAR2("bossRewardDialog").addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeBossRewardDialog();
      }
    });
    DOLLAR2("bossRewardOpenAll").addEventListener("click", () => {
      const WORLD = personalGarden || active?.world, RECEIPT = WORLD?.bossRewardReceipts.find((reward) => reward.receiptKey === bossRewardDialogReceiptKey);
      if (!WORLD || !RECEIPT) {
        return;
      }
      clearInterval(bossRewardRevealTimer);
      bossRewardRevealTimer = null;
      cancelBossRewardCycle();
      openAllBossRewardBoxes(WORLD, RECEIPT.receiptKey);
      renderBossRewardBoxes(RECEIPT);
    });
  }
  attachBossRewardHandlers();
  globalThis.BudmoriPerformanceDiagnostics = {
    summary: () => active ? PERFORMANCE_DIAGNOSTICS.summary(active.world, active.paused) : [],
    snapshot: () => PERFORMANCE_DIAGNOSTICS.snapshot(30)
  };
  DOLLAR2("diagnosticDetail").onchange = (event) => PERFORMANCE_DIAGNOSTICS.setDetailed(event.target.checked);
  DOLLAR2("copyDiagnostics").onclick = async () => {
    const RESULT = await globalThis.BloomDiagnostics.copy({ textarea: DOLLAR2("settingsDiagnosticText") });
    DOLLAR2("settingsDiagnosticText").hidden = RESULT.copied;
    DOLLAR2("diagnosticStatus").textContent = RESULT.copied ? "진단 요약을 복사했어요. 채팅에 붙여 넣어 주세요." : "아래 진단 요약을 선택해 복사해 주세요.";
  };
  DOLLAR2("exportDiagnostics").onclick = () => {
    const TEXT = DOLLAR2("settingsDiagnosticText");
    TEXT.value = globalThis.BloomDiagnostics.detail();
    TEXT.hidden = false;
    TEXT.focus();
    TEXT.select();
    DOLLAR2("diagnosticStatus").textContent = "명시적으로 요청한 상세 JSON이에요. 저장 데이터는 포함하지 않아요.";
  };
  var FAIL3 = (error) => {
    DOLLAR2("error").hidden = false;
    DOLLAR2("error").textContent = "농장을 진행하지 못했어요. " + error.message;
    console.error(error);
    if (active) {
      active.paused = true;
    }
  };
  var BOSS_PREVIEW_SOURCES = /* @__PURE__ */ new Map();
  var BOSS_PREVIEW_VERSIONS = /* @__PURE__ */ new WeakMap();
  function bossPreviewSource(asset) {
    if (BOSS_PREVIEW_SOURCES.has(asset)) {
      const CACHED = BOSS_PREVIEW_SOURCES.get(asset);
      BOSS_PREVIEW_SOURCES.delete(asset);
      BOSS_PREVIEW_SOURCES.set(asset, CACHED);
      return CACHED;
    }
    const SOURCE = fetch(new URL(asset, document.baseURI), {
      credentials: "same-origin"
    }).then((response) => {
      if (!response.ok) {
        throw Error(`Boss preview source failed: ${response.status}`);
      }
      return response.text();
    });
    BOSS_PREVIEW_SOURCES.set(asset, SOURCE);
    if (BOSS_PREVIEW_SOURCES.size > 16) {
      BOSS_PREVIEW_SOURCES.delete(BOSS_PREVIEW_SOURCES.keys().next().value);
    }
    SOURCE.catch(() => {
      if (BOSS_PREVIEW_SOURCES.get(asset) === SOURCE) {
        BOSS_PREVIEW_SOURCES.delete(asset);
      }
    });
    return SOURCE;
  }
  async function createNeutralBossPreview(species, asset) {
    const COMPILED = globalThis.BudmoriVectorResources?.troops?.[species], EXPRESSIONS = COMPILED?.metadata?.expressions, NEUTRAL = EXPRESSIONS?.neutral;
    if (!NEUTRAL) {
      throw Error(`Species ${species} is missing the neutral GameKit expression`);
    }
    const DOCUMENT_SVG = new DOMParser().parseFromString(
      await bossPreviewSource(`./assets/troops/${asset}`),
      "image/svg+xml"
    );
    if (DOCUMENT_SVG.getElementsByTagName("parsererror").length || DOCUMENT_SVG.documentElement.localName !== "svg") {
      throw Error(`Invalid SVG preview source: ${asset}`);
    }
    const SVG = DOCUMENT_SVG.documentElement, NODES_BY_ID = new Map([...SVG.querySelectorAll("[id]")].map((node) => [node.getAttribute("id"), node]));
    const EXPRESSION_PARTS = new Set(
      Object.values(EXPRESSIONS).flatMap((variant) => [...variant.show, ...variant.hide])
    ), VISIBLE = new Set(NEUTRAL.show);
    for (const ID of NEUTRAL.hide) {
      VISIBLE.delete(ID);
    }
    for (const ID of EXPRESSION_PARTS) {
      const NODE = NODES_BY_ID.get(ID);
      if (!NODE) {
        throw Error(`SVG preview is missing GameKit expression part: ${ID}`);
      }
      NODE.style.setProperty("display", VISIBLE.has(ID) ? "inline" : "none");
    }
    const IDLE_POSE = COMPILED.metadata.clips.idle.keyframes[0].parts;
    for (const [ID, POSE] of Object.entries(IDLE_POSE)) {
      if (POSE.opacity !== void 0) {
        const NODE = NODES_BY_ID.get(ID);
        if (!NODE) {
          throw Error(`SVG preview is missing idle part: ${ID}`);
        }
        NODE.style.setProperty("opacity", String(POSE.opacity));
      }
    }
    return document.importNode(SVG, true);
  }
  async function renderNeutralBossPreview(target, species, asset, label = "") {
    const VERSION = (BOSS_PREVIEW_VERSIONS.get(target) || 0) + 1;
    BOSS_PREVIEW_VERSIONS.set(target, VERSION);
    target.setAttribute("aria-busy", "true");
    try {
      const SVG = await createNeutralBossPreview(species, asset);
      if (BOSS_PREVIEW_VERSIONS.get(target) !== VERSION || !target.isConnected) {
        return;
      }
      SVG.id = target.id;
      SVG.setAttribute("class", target.getAttribute("class") || "");
      SVG.removeAttribute("hidden");
      SVG.setAttribute("aria-busy", "false");
      if (label) {
        SVG.setAttribute("role", "img");
        SVG.setAttribute("aria-label", label);
      } else {
        SVG.setAttribute("aria-hidden", "true");
        SVG.removeAttribute("role");
        SVG.removeAttribute("aria-label");
      }
      target.replaceWith(SVG);
      BOSS_PREVIEW_VERSIONS.set(SVG, VERSION);
    } catch (error) {
      if (BOSS_PREVIEW_VERSIONS.get(target) !== VERSION) {
        return;
      }
      target.hidden = true;
      target.setAttribute("aria-busy", "false");
      console.error("Unable to render neutral boss preview", error);
    }
  }
  function writeCheckpoint(world = personalGarden) {
    if (!world) {
      return false;
    }
    const OK = STORAGE.save(world);
    DOLLAR2("saveNotice").textContent = OK ? "" : STORAGE.error;
    DOLLAR2("treeStorage").hidden = OK;
    return OK;
  }
  var AUTOSAVE = new FarmAutosave(() => writeCheckpoint());
  function saveImmediate(world = personalGarden) {
    const OK = writeCheckpoint(world);
    if (OK) {
      AUTOSAVE.reset();
    }
    return OK;
  }
  function replacePersonalGarden(world) {
    unsubscribeProgress?.();
    personalGarden = world;
    unsubscribeProgress = world?.onProgressChanged.on(() => AUTOSAVE.markDirty()) ?? null;
  }
  function onWorldStep(world) {
    if (world?.scene !== "raid" || !["victory", "defeat"].includes(world.encounter?.outcome) || !personalGarden || personalGarden.activeRaidRunSequence === null) {
      return;
    }
    const OWNER_ID = active?.localPlayerId, RUN = {
      sessionId: personalGarden.activeRaidSessionId,
      runSequence: personalGarden.activeRaidRunSequence
    };
    if (!OWNER_ID || !RUN.sessionId || !RUN.runSequence) {
      return;
    }
    const RUN_KEY = `${RUN.sessionId}:${RUN.runSequence}`;
    if (lastAutoSettledRunKey === RUN_KEY) {
      return;
    }
    try {
      persistRaidSettlement(localSettlementRoster(world, OWNER_ID, RUN), OWNER_ID);
      lastAutoSettledRunKey = RUN_KEY;
    } catch (error) {
      FAIL3(error);
    }
  }
  function persist() {
    if (active?.world === personalGarden) {
      active.flushQueuedCommands();
    }
    if (personalGarden?.hasProgressTimers()) {
      AUTOSAVE.markDirty();
    }
    return AUTOSAVE.flush();
  }
  var FOOD_FEEL = new FoodFeel(requestFeed);
  var COMBAT_FEEL = new CombatFeel(FOOD_FEEL);
  function requestFeed() {
    if (!home && active && !active.paused && active.world.scene === "farm" && active.world.warehouseFood > 0 && active.world.food.length < 140) {
      FOOD_FEEL.unlock();
      active.queue("feed");
      return true;
    }
    return false;
  }
  function install(world) {
    if (active) {
      stopWorldInput();
      cancelFarmSortTransition();
    }
    active?.dispose();
    RENDERER.resetPan();
    active = new FarmSession(world, {
      onError: FAIL3,
      onWorldStep
    });
    return active;
  }
  install(new GARDEN());
  active.paused = true;
  function showBossEncounterMessage(text) {
    const MESSAGE = DOLLAR2("bossEncounterMessage");
    MESSAGE.textContent = text;
    MESSAGE.hidden = !text;
    if (text) {
      clearTimeout(showBossEncounterMessage.timer);
      showBossEncounterMessage.timer = setTimeout(() => {
        MESSAGE.hidden = true;
      }, 1800);
    }
  }
  function renderBossEncounterStage(stage) {
    if (!personalGarden || active?.world?.scene === "raid") {
      return null;
    }
    const PROGRESS = personalGarden.farmBossProgress, WAS_SELECTED = PROGRESS.selections.some((entry) => entry.stage === stage), PREVIOUS_STAGE = PROGRESS.currentStage, FIRST_CLEAR = stage > PROGRESS.highestClearedRaidStage, STAGE_LOCKED = stage > PROGRESS.highestClearedRaidStage + 1;
    const SELECTION = selectFarmBossStage(PROGRESS, stage);
    if (!WAS_SELECTED || PREVIOUS_STAGE !== stage) {
      personalGarden.markProgressChanged();
      saveImmediate(personalGarden);
    }
    const SPECIES = SELECTION.species, CATALOG_ENTRY = speciesById(SPECIES), REWARD_NAME = speciesRewardName(SPECIES), ENCOUNTER_NAME = giantSpeciesName(SPECIES), ROLLS = SELECTION.rolls;
    DOLLAR2("bossStageCounter").textContent = `${SELECTION.stage} / ${BOSS_REWARD_SETTINGS.maxStage}`;
    DOLLAR2("bossStageLabel").textContent = `${SELECTION.stage}단계`;
    renderNeutralBossPreview(DOLLAR2("bossPreview"), SPECIES, CATALOG_ENTRY.asset, `${ENCOUNTER_NAME} 미리보기`);
    DOLLAR2("bossStageName").textContent = ENCOUNTER_NAME;
    DOLLAR2("bossStageHp").textContent = `HP ${Math.round(SELECTION.hp).toLocaleString("ko-KR")}`;
    DOLLAR2("bossStageAttack").textContent = `공격력 ${Number(SELECTION.attackPower.toPrecision(3)).toLocaleString("ko-KR")}`;
    DOLLAR2("bossStageXp").textContent = `+${SELECTION.xp.toLocaleString("ko-KR")} XP`;
    DOLLAR2("bossStageDrop").hidden = ROLLS === 0;
    DOLLAR2("bossStageDrop").replaceChildren();
    if (ROLLS > 0) {
      const ICON = document.createElement("img");
      ICON.draggable = false;
      const LABEL = document.createElement("span"), TITLE = document.createElement("strong"), DETAILS = document.createElement("small");
      TITLE.textContent = REWARD_NAME;
      DETAILS.textContent = bossRewardRollDescription(SELECTION.stage, { firstClear: FIRST_CLEAR });
      LABEL.append(TITLE, DETAILS);
      DOLLAR2("bossStageDrop").append(ICON, LABEL);
      renderNeutralBossPreview(ICON, SPECIES, CATALOG_ENTRY.asset);
      DOLLAR2("bossStageNotice").textContent = "";
    } else {
      DOLLAR2("bossStageNotice").textContent = "";
    }
    DOLLAR2("bossEncounterChallenge").disabled = !hasRaidRosterEntries(personalGarden.roster.residents()) || personalGarden.farmBossEvent?.phase !== "idle" || personalGarden.activeRaidRunSequence !== null || STAGE_LOCKED;
    DOLLAR2("bossEncounterChallenge").title = DOLLAR2("bossEncounterChallenge").disabled ? "전투를 시작하려면 투입 가능한 병력과 농장 상태가 필요해요." : "";
    return SELECTION;
  }
  function openBossEncounter(push = true) {
    stopWorldInput();
    if (active?.world?.scene === "raid") {
      return false;
    }
    if (!personalGarden) {
      if (STORAGE.world && STORAGE.world.activeRaidRunSequence === null) {
        start(restore(snapshot(STORAGE.world)), false);
      } else {
        return false;
      }
    }
    if (personalGarden.farmBossEvent?.phase !== "idle" || personalGarden.activeRaidRunSequence !== null) {
      return false;
    }
    if (!persist()) {
      return false;
    }
    if (menuOpen) {
      closeMenu(false);
    }
    bossPauseBeforeOpen = active?.paused ?? true;
    if (active && !bossPauseBeforeOpen) {
      active.paused = true;
      active.loop.resetTiming();
    }
    bossEncounterOpen = true;
    document.body.dataset.bossScreen = "true";
    DOLLAR2("bossEncounterScreen").hidden = false;
    renderBossEncounterStage(personalGarden.farmBossProgress.currentStage);
    if (push) {
      history.pushState(null, "", "#/boss");
    }
    DOLLAR2("bossEncounterBack").focus();
    return true;
  }
  function closeBossEncounter(push = true) {
    if (!bossEncounterOpen) {
      return;
    }
    bossEncounterOpen = false;
    document.body.dataset.bossScreen = "false";
    DOLLAR2("bossEncounterScreen").hidden = true;
    bossSwipe = null;
    for (const ID of ["bossPreview"]) {
      const PREVIEW = DOLLAR2(ID);
      if (PREVIEW) {
        BOSS_PREVIEW_VERSIONS.set(PREVIEW, (BOSS_PREVIEW_VERSIONS.get(PREVIEW) || 0) + 1);
        PREVIEW.hidden = true;
      }
    }
    if (active && bossPauseBeforeOpen !== null) {
      active.paused = bossPauseBeforeOpen;
      bossPauseBeforeOpen = null;
      active.loop.resetTiming();
    }
    if (push) {
      history.pushState(null, "", "#/farm");
    }
  }
  function refreshStart() {
    const HAS_RESERVED_RAID = STORAGE.hasReservedRaid, LIVE_RAID = active?.world?.scene === "raid", STALE_RAID = HAS_RESERVED_RAID && !LIVE_RAID;
    DOLLAR2("continueGame").disabled = !STORAGE.hasWorld || STALE_RAID;
    DOLLAR2("startBossEncounter").disabled = !STORAGE.hasWorld || STALE_RAID;
    DOLLAR2("staleRaidNotice").hidden = !STALE_RAID;
    DOLLAR2("exportSave").disabled = !STORAGE.raw;
    DOLLAR2("saveNotice").textContent = STORAGE.error || STORAGE.notice;
  }
  function setHome(value, push = true) {
    stopWorldInput();
    if (value) {
      persist();
      if (menuOpen) {
        closeMenu(false);
      }
      if (bossEncounterOpen) {
        closeBossEncounter(false);
      }
    }
    home = value;
    document.body.dataset.home = String(value);
    DOLLAR2("startScreen").hidden = !value;
    active.paused = value;
    if (push) {
      history.pushState(null, "", value ? "#/" : active.world.scene === "raid" ? "#/raid" : "#/farm");
    }
    refreshStart();
    if (value) {
      DOLLAR2("continueGame").focus();
    }
  }
  function start(world, push = true) {
    AUTOSAVE.reset();
    FOOD_FEEL.unlock();
    replacePersonalGarden(world);
    install(world);
    setHome(false, push);
  }
  function reservePersonalRaidRun(sessionId = null) {
    let reserved;
    try {
      reserved = reserveRaidRun(snapshot(personalGarden), {
        sessionId
      });
    } catch (error) {
      FAIL3(error);
      return null;
    }
    const CANDIDATE = restore(reserved.farm);
    if (!saveImmediate(CANDIDATE)) {
      FAIL3(Error(STORAGE.error || "농장 도전 예약을 저장하지 못했어요."));
      return null;
    }
    replacePersonalGarden(STORAGE.world);
    return reserved;
  }
  function localSettlementRoster(world, ownerId, run) {
    const CURRENT = world.raidRosters?.find((roster) => roster.ownerId === ownerId);
    if (CURRENT) {
      if (CURRENT.settlementRunSequence !== run.runSequence || CURRENT.settlementSessionId !== run.sessionId || CURRENT.settlementEncounterId !== run.runSequence) {
        throw Error("레이드 명단의 정산 예약이 개인 농장 저장과 일치하지 않아요.");
      }
      return world;
    }
    const ENTRIES = raidRosterEntries(personalGarden.roster.residents(), CONFIG.raid.capacity.playerUnits).map(
      ([farmId, species, tier]) => ({
        farmId,
        species,
        tier,
        deployed: false
      })
    );
    const VIEW = snapshot(world);
    VIEW.raidExpectedPlayers = [.../* @__PURE__ */ new Set([...VIEW.raidExpectedPlayers, ownerId])];
    VIEW.raidRosters.push({
      ownerId,
      troops: ENTRIES,
      abilitySnapshot: createAbilityRuntimeSnapshot(personalGarden.playerProgression),
      settlementSessionId: run.sessionId,
      settlementRunSequence: run.runSequence,
      settlementEncounterId: run.runSequence,
      lastDeploySequence: 0,
      buffUntil: 0,
      buffReadyAt: 0
    });
    return VIEW;
  }
  function persistRaidSettlement(raidWorld, ownerId) {
    const FARM_RUN = {
      sessionId: personalGarden.activeRaidSessionId,
      runSequence: personalGarden.activeRaidRunSequence
    };
    if (!FARM_RUN.sessionId || !FARM_RUN.runSequence) {
      return false;
    }
    const OUTCOME = ["victory", "defeat"].includes(raidWorld.encounter?.outcome) ? raidWorld.encounter.outcome : "aborted";
    const PREPARE = (base) => settleRaidOwnerFarm(snapshot(base), {
      ownerId,
      sessionId: FARM_RUN.sessionId,
      encounterId: FARM_RUN.runSequence,
      runSequence: FARM_RUN.runSequence,
      outcome: OUTCOME,
      raidWorld,
      completedAtMs: Date.now(),
      settleVictory: ({ farm, receiptKey, deploymentMultiplier, firstClear }) => {
        const GARDEN2 = restore(farm), STAGE = raidWorld.boss.stage || 0, STAGE_REWARD = STAGE ? bossStageStats(STAGE) : null, RESOLVED = settleBossKill(GARDEN2, {
          encounterId: FARM_RUN.runSequence,
          source: "raid",
          stage: STAGE,
          firstClear,
          receiptKey,
          acquisitionMultiplier: deploymentMultiplier,
          rollBudget: STAGE_REWARD?.rollBudget ?? 1,
          xpAmount: STAGE_REWARD?.xp,
          species: raidWorld.boss.species ?? 3,
          tier: 1,
          x: raidWorld.boss.x,
          y: raidWorld.boss.y
        });
        const REWARD2 = RESOLVED.receipt;
        return {
          farm: snapshot(GARDEN2),
          summary: {
            stage: STAGE,
            acquisition: {
              status: REWARD2.status,
              chance: REWARD2.chance,
              rollCount: REWARD2.rollCount,
              rollBudget: REWARD2.rollBudget,
              successCount: REWARD2.successCount,
              grantedCount: REWARD2.grantedCount,
              rolls: REWARD2.drops || [],
              unitId: REWARD2.unitId,
              receiptKey: REWARD2.receiptKey
            },
            xp: {
              status: REWARD2.xpStatus,
              amount: REWARD2.xpAmount,
              levelsGained: REWARD2.levelsGained,
              pointsAwarded: REWARD2.pointsAwarded,
              receiptKey: REWARD2.xpReceiptKey
            }
          }
        };
      }
    });
    let settled = PREPARE(personalGarden);
    let candidate = restore(settled.farm);
    if (!saveImmediate(candidate)) {
      if (!STORAGE.refresh()) {
        throw Error(STORAGE.error || "최신 농장 저장을 다시 읽지 못했어요.");
      }
      settled = PREPARE(STORAGE.world);
      candidate = restore(settled.farm);
      if (!saveImmediate(candidate)) {
        throw Error(STORAGE.error || "전투 결과 저장에 실패했어요.");
      }
    }
    replacePersonalGarden(STORAGE.world);
    return settled;
  }
  function beginRaid(push = true) {
    if (!personalGarden || active.world.scene === "raid" || personalGarden.activeRaidRunSequence !== null || personalGarden.farmBossEvent?.phase !== "idle" || !raidRosterEntries(personalGarden.roster.residents(), 1).length) {
      return;
    }
    if (!persist()) {
      return;
    }
    const CURRENT_STAGE = personalGarden.farmBossProgress.currentStage, HIGHEST_CLEARED_STAGE = personalGarden.farmBossProgress.highestClearedRaidStage, BOSS_STAGE = renderBossEncounterStage(CURRENT_STAGE);
    if (!BOSS_STAGE || CURRENT_STAGE > HIGHEST_CLEARED_STAGE + 1 || !persist()) {
      return;
    }
    const RESERVED = reservePersonalRaidRun();
    if (!RESERVED) {
      return;
    }
    closeBossEncounter(false);
    const BATTLE = GARDEN.createRaidBattle(
      personalGarden.seed + Math.floor(performance.now()) >>> 0,
      ["solo"],
      BOSS_STAGE
    );
    install(BATTLE);
    active.queue("register-roster", {
      entries: raidRosterEntries(personalGarden.roster.residents(), CONFIG.raid.capacity.playerUnits),
      abilitySnapshot: createAbilityRuntimeSnapshot(personalGarden.playerProgression),
      deploymentCardSpecies: raidDeploymentCardSpecies(personalGarden.playerProgression.raidDeploymentCards),
      settlement: {
        sessionId: RESERVED.sessionId,
        runSequence: RESERVED.runSequence,
        encounterId: RESERVED.runSequence
      }
    });
    setHome(false, push);
  }
  async function returnToFarm(push = true) {
    stopWorldInput();
    if (bossEncounterOpen) {
      closeBossEncounter(false);
    }
    if (!personalGarden) {
      return;
    }
    const RAID_WORLD = active?.world?.scene === "raid" ? snapshot(active.world) : null;
    if (RAID_WORLD && personalGarden.activeRaidRunSequence !== null) {
      const OWNER_ID = active.localPlayerId, RUN = {
        sessionId: personalGarden.activeRaidSessionId,
        runSequence: personalGarden.activeRaidRunSequence
      };
      try {
        persistRaidSettlement(localSettlementRoster(RAID_WORLD, OWNER_ID, RUN), OWNER_ID);
      } catch (error) {
        FAIL3(error);
        return false;
      }
    }
    install(personalGarden);
    setHome(false, push);
    return true;
  }
  DOLLAR2("continueGame").onclick = () => {
    if (active?.world?.scene === "raid") {
      setHome(false);
      return;
    }
    if (STORAGE.world && STORAGE.world.activeRaidRunSequence === null) {
      start(restore(snapshot(STORAGE.world)));
    }
  };
  DOLLAR2("startBossEncounter").onclick = () => {
    if (!STORAGE.world || STORAGE.world.activeRaidRunSequence !== null) {
      return;
    }
    start(restore(snapshot(STORAGE.world)), false);
    openBossEncounter();
  };
  DOLLAR2("menuBossEncounter").onclick = () => {
    closeMenu(false);
    openBossEncounter();
  };
  DOLLAR2("bossEncounterBack").onclick = () => closeBossEncounter();
  DOLLAR2("bossEncounterChallenge").onclick = () => {
    if (DOLLAR2("bossEncounterChallenge").disabled) {
      return;
    }
    closeBossEncounter(false);
    beginRaid(true);
  };
  DOLLAR2("bossEncounterScreen").addEventListener("pointerdown", (e) => {
    if (!bossEncounterOpen || e.button > 0 || e.target.closest("button")) {
      return;
    }
    const VIEWPORT = DOLLAR2("bossEncounterViewport"), CARD = DOLLAR2("bossEncounterCard");
    bossSwipe = {
      pointerId: e.pointerId,
      y: e.clientY
    };
    CARD.style.transition = "none";
    VIEWPORT.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  DOLLAR2("bossEncounterScreen").addEventListener("pointermove", (e) => {
    if (!bossSwipe || e.pointerId !== bossSwipe.pointerId) {
      return;
    }
    const DELTA = Math.max(-120, Math.min(120, e.clientY - bossSwipe.y));
    DOLLAR2("bossEncounterCard").style.transform = `translateY(${DELTA * 0.55}px)`;
    e.preventDefault();
  });
  DOLLAR2("bossEncounterScreen").addEventListener("pointerup", (e) => {
    if (!bossSwipe || e.pointerId !== bossSwipe.pointerId) {
      return;
    }
    const DELTA = e.clientY - bossSwipe.y, CARD = DOLLAR2("bossEncounterCard");
    bossSwipe = null;
    if (Math.abs(DELTA) < 42) {
      CARD.style.transition = "transform .18s ease-out";
      CARD.style.transform = "translateY(0)";
      setTimeout(() => {
        CARD.style.transition = "";
        CARD.style.transform = "";
      }, 200);
      return;
    }
    const CURRENT = personalGarden?.farmBossProgress?.currentStage || 1, HIGHEST_CLEARED = personalGarden?.farmBossProgress?.highestClearedRaidStage || 0, NEXT = DELTA < 0 ? Math.min(BOSS_REWARD_SETTINGS.maxStage, HIGHEST_CLEARED + 2, CURRENT + 1) : Math.max(1, CURRENT - 1);
    if (NEXT === CURRENT) {
      showBossEncounterMessage(
        DELTA < 0 ? `현재 스테이지 상한 ${BOSS_REWARD_SETTINGS.maxStage}예요` : "첫 스테이지예요"
      );
      return;
    }
    CARD.style.transform = "";
    CARD.style.transition = "";
    CARD.style.animation = "none";
    void CARD.offsetWidth;
    CARD.style.animation = "";
    renderBossEncounterStage(NEXT);
  });
  DOLLAR2("bossEncounterScreen").addEventListener("pointercancel", (e) => {
    if (bossSwipe?.pointerId === e.pointerId) {
      bossSwipe = null;
      const CARD = DOLLAR2("bossEncounterCard");
      CARD.style.transition = "transform .18s ease-out";
      CARD.style.transform = "translateY(0)";
      setTimeout(() => {
        CARD.style.transition = "";
        CARD.style.transform = "";
      }, 200);
    }
  });
  DOLLAR2("abortRaidRun").onclick = () => {
    if (active?.world?.scene === "raid") {
      return;
    }
    const WORLD = STORAGE.world;
    if (!WORLD || WORLD.activeRaidRunSequence === null) {
      return refreshStart();
    }
    try {
      const RESULT = abortReservedRaidRun(snapshot(WORLD), {
        completedAtMs: Date.now()
      });
      if (!RESULT.applied) {
        return refreshStart();
      }
      if (!saveImmediate(restore(RESULT.farm))) {
        DOLLAR2("saveNotice").textContent = STORAGE.error;
        return;
      }
      replacePersonalGarden(STORAGE.world);
      refreshStart();
      DOLLAR2("saveNotice").textContent = "이전 도전을 보상 없이 끝냈어요. 병력과 포인트는 그대로예요.";
    } catch (error) {
      FAIL3(error);
    }
  };
  DOLLAR2("newGame").onclick = () => {
    if (STORAGE.raw && !DOLLAR2("newConfirm").hidden) {
      return;
    }
    if (STORAGE.raw) {
      DOLLAR2("newConfirmText").textContent = "현재 농장을 새 농장으로 바꿀까요? 필요한 저장은 먼저 내보내 주세요.";
      DOLLAR2("newConfirm").hidden = false;
      return;
    }
    const WORLD = new GARDEN();
    if (STORAGE.replace(WORLD)) {
      AUTOSAVE.reset();
      start(WORLD);
    } else {
      refreshStart();
    }
  };
  DOLLAR2("confirmNew").onclick = () => {
    const WORLD = new GARDEN();
    if (STORAGE.replace(WORLD)) {
      AUTOSAVE.reset();
      DOLLAR2("newConfirm").hidden = true;
      start(WORLD);
    } else {
      refreshStart();
    }
  };
  DOLLAR2("cancelNew").onclick = () => {
    DOLLAR2("newConfirm").hidden = true;
  };
  DOLLAR2("exportSave").onclick = () => {
    const RAW = STORAGE.raw;
    if (!RAW) {
      return;
    }
    const URL_LOCAL = URL.createObjectURL(
      new Blob([RAW], {
        type: "application/json"
      })
    ), A = document.createElement("a");
    A.href = URL_LOCAL;
    A.download = "budmori-save-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json";
    A.click();
    setTimeout(() => URL.revokeObjectURL(URL_LOCAL), 1e3);
  };
  DOLLAR2("importSave").onclick = () => DOLLAR2("saveFile").click();
  DOLLAR2("saveFile").onchange = async () => {
    const FILE = DOLLAR2("saveFile").files[0];
    if (!FILE) {
      return;
    }
    try {
      if (FILE.size > 2 * 1024 * 1024) {
        throw Error("저장 파일이 너무 커요.");
      }
      const TEXT = await FILE.text();
      const { validateSave: VALIDATE_SAVE } = await Promise.resolve().then(() => (init_farm_storage(), farm_storage_exports));
      VALIDATE_SAVE(TEXT);
      imported = TEXT;
      DOLLAR2("importConfirmText").textContent = "현재 형식의 저장 데이터로 진행 상태를 바꿀까요?";
      DOLLAR2("confirmImport").textContent = "이 저장 불러오기";
      DOLLAR2("importConfirm").hidden = false;
    } catch (e) {
      DOLLAR2("saveNotice").textContent = e.message;
    } finally {
      DOLLAR2("saveFile").value = "";
    }
  };
  DOLLAR2("cancelImport").onclick = () => {
    imported = null;
    DOLLAR2("importConfirm").hidden = true;
  };
  DOLLAR2("confirmImport").onclick = () => {
    try {
      if (imported) {
        const WORLD = STORAGE.import(imported);
        AUTOSAVE.reset();
        replacePersonalGarden(WORLD);
        install(WORLD);
        active.paused = true;
      }
      imported = null;
      DOLLAR2("importConfirm").hidden = true;
      refreshStart();
    } catch (e) {
      DOLLAR2("saveNotice").textContent = e.message;
    }
  };
  DOLLAR2("farm").onclick = () => returnToFarm();
  DOLLAR2("raid").onclick = () => openBossEncounter();
  DOLLAR2("return").onclick = () => returnToFarm();
  DOLLAR2("merge").onclick = () => active?.queue("merge");
  DOLLAR2("merge").addEventListener("keydown", (e) => {
    if (e.repeat && ["Enter", " "].includes(e.key)) {
      e.preventDefault();
    }
  });
  DOLLAR2("feed").addEventListener("keydown", (e) => {
    if (e.repeat && ["Enter", " "].includes(e.key)) {
      e.preventDefault();
    }
  });
  DOLLAR2("feed").onclick = (e) => {
    if (e.detail === 0 && !e.pointerType) {
      requestFeed();
    }
  };
  DOLLAR2("pause").onclick = () => {
    menuPauseChanged = true;
    active.paused = !active.paused;
    if (active.paused) {
      persist();
    } else if (menuOpen) {
      closeMenu();
    }
  };
  function drawTree() {
    const W = personalGarden || active.world, IN_COMBAT = active.world.scene === "raid" || W.running || W.farmBossEvent?.phase !== "idle";
    DOLLAR2("treeNodes").innerHTML = renderFarmUpgradeTreeMarkup(W.playerProgression, {
      location: active.world.scene,
      inCombat: IN_COMBAT
    });
    renderProgressionResetActions();
  }
  function farmPlotDisplayName(plotId) {
    return `농장 ${String(plotId).match(/^plot-(\d+)$/)?.[1] || plotId}`;
  }
  function drawFarmPanel() {
    const W = personalGarden || active?.world;
    if (!W || farmPanelRevision === W.progressRevision) {
      return;
    }
    farmPanelRevision = W.progressRevision;
    const LOCKED = !!farmSortTransition || active?.world?.scene !== "farm" || W.running || W.farmBossEvent?.phase !== "idle";
    DOLLAR2("farmStatPlaced").textContent = String(W.placedPopulation);
    DOLLAR2("farmStatCapacity").textContent = `/ ${W.totalFarmCapacity}`;
    DOLLAR2("farmStatReserved").textContent = String(W.reservedPopulation);
    DOLLAR2("farmStatPending").textContent = String(W.pendingRewardPopulation);
    DOLLAR2("farmStatFood").textContent = String(W.warehouseFood);
    syncFlag("farmLockNote", "hidden", !LOCKED || !!farmSortTransition);
    DOLLAR2("farmPlotList").innerHTML = [...W.farmPlots.values()].map((plot) => {
      const COUNT = W.roster.placedPopulation(plot.id);
      return `<button type="button" data-farm-plot="${plot.id}" aria-label="${farmPlotDisplayName(plot.id)} · ${COUNT}명 / ${plot.capacity}명" aria-pressed="${plot.id === W.activePlotId}"${LOCKED ? " disabled" : ""}><b>${farmPlotDisplayName(plot.id)}</b><small>${COUNT} / ${plot.capacity}</small></button>`;
    }).join("");
    const ACTIVE = W.activeFarmPlot, POINTS = W.playerProgression.availablePoints, NEXT_CAPACITY = ACTIVE.canExpand() ? [50, 75, 100, 150, 200][ACTIVE.capacityLevel + 1] : ACTIVE.capacity;
    DOLLAR2("farmExpand").innerHTML = ACTIVE.canExpand() ? `<b>농장 확장</b><small>${ACTIVE.capacity} → ${NEXT_CAPACITY}명 · 포인트 1개</small>` : "<b>농장 확장</b><small>최대 크기예요</small>";
    DOLLAR2("farmExpand").disabled = LOCKED || !ACTIVE.canExpand() || POINTS < 1;
    DOLLAR2("farmUnlock").innerHTML = `<b>새 농장 열기</b><small>포인트 ${POINTS} / 2개${POINTS < 2 ? " · 부족해요" : ""}</small>`;
    DOLLAR2("farmUnlock").disabled = LOCKED || POINTS < 2;
    for (const BUTTON of DOLLAR2("farmPlotActions").querySelectorAll("[data-farm-sort]")) {
      BUTTON.disabled = LOCKED;
    }
    const COUNTS = W.roster.countsBySpecies(), TOTAL = [...COUNTS.values()].reduce((sum, count) => sum + count, 0);
    DOLLAR2("farmRatioList").innerHTML = W.farmTargets.map((value, speciesId) => {
      const SPECIES = speciesById(speciesId), COUNT = COUNTS.get(speciesId) || 0, CURRENT = TOTAL ? (COUNT / TOTAL * 100).toFixed(0) : "0";
      return `<label class="farm-ratio"><img src="./assets/troops/${SPECIES.asset}" alt="" width="40" height="40" draggable="false"><span class="farm-ratio__name"><b>${SPECIES.name}</b><small>${COUNT}마리 · 현재 ${CURRENT}%</small></span><output>목표 ${+(value / 100).toFixed(1)}%</output><input type="range" min="0" max="10000" step="50" value="${value}" aria-label="${SPECIES.name} 목표 비율" data-farm-target="${SPECIES.id}"${LOCKED ? " disabled" : ""}></label>`;
    }).join("");
  }
  function drawAbilityTree() {
    const W = personalGarden || active.world, IN_COMBAT = active.world.scene === "raid" || W.running || W.farmBossEvent?.phase !== "idle";
    const SELECTED_SPECIES = Number(DOLLAR2("abilityPanel").dataset.selectedSpecies || 0);
    DOLLAR2("abilityPoints").textContent = String(W.playerProgression.availablePoints);
    for (const BUTTON of DOLLAR2("abilitySpeciesTabs").querySelectorAll("[data-ability-species]")) {
      BUTTON.setAttribute("aria-pressed", String(Number(BUTTON.dataset.abilitySpecies) === SELECTED_SPECIES));
    }
    DOLLAR2("abilityNodes").innerHTML = renderAbilityTreeMarkup(W.playerProgression, {
      highestSpeciesTier: W.highestSpeciesTiers(),
      location: active.world.scene,
      inCombat: IN_COMBAT,
      selectedSpecies: SELECTED_SPECIES
    });
    renderProgressionResetActions();
  }
  function currentProgressionResetScope() {
    if (menuTab === "growth") {
      return { type: "farm" };
    }
    if (menuTab === "abilities") {
      return { type: "abilities", speciesId: Number(DOLLAR2("abilityPanel").dataset.selectedSpecies || 0) };
    }
    if (menuTab === "formation") {
      return { type: "formation" };
    }
    if (menuTab === "deployment") {
      return { type: "deployment-cards" };
    }
    return null;
  }
  function renderProgressionResetActions() {
    const HOST = DOLLAR2("progressionResetActions"), CURRENT = DOLLAR2("progressionResetCurrent"), ALL = DOLLAR2("progressionResetAll");
    if (!active || !menuOpen || !["growth", "abilities", "formation", "deployment"].includes(menuTab)) {
      HOST.hidden = true;
      return;
    }
    const W = personalGarden || active.world, IN_COMBAT = active.world.scene === "raid" || W.running || W.farmBossEvent?.phase !== "idle", CONTEXT = { location: active.world.scene, inCombat: IN_COMBAT }, SCOPE = currentProgressionResetScope(), CURRENT_CHECK = canResetPlayerProgression(W.playerProgression, SCOPE, CONTEXT), ALL_CHECK = canResetPlayerProgression(W.playerProgression, { type: "all" }, CONTEXT), LABEL = menuTab === "growth" ? "성장 항목 초기화" : menuTab === "formation" ? "형성 능력 초기화" : menuTab === "deployment" ? "병력 편성 초기화" : "이 종 특성 초기화";
    HOST.hidden = false;
    CURRENT.hidden = menuTab === "abilities";
    CURRENT.disabled = !CURRENT_CHECK.allowed;
    CURRENT.textContent = `${LABEL} · ${CURRENT_CHECK.refunded}P`;
    ALL.disabled = !ALL_CHECK.allowed;
    ALL.textContent = `전체 초기화 · ${ALL_CHECK.refunded}P`;
  }
  var MENU_ROUTES = {
    play: "#/menu",
    farms: "#/farms",
    growth: "#/growth",
    abilities: "#/abilities",
    help: "#/help",
    formation: "#/formation",
    deployment: "#/deployment"
  };
  var ROUTE_MENU_TAB = (route2) => Object.keys(MENU_ROUTES).find((tab) => MENU_ROUTES[tab] === route2) || "play";
  function applyMenuTab(tab) {
    menuTab = tab;
    const UPGRADES = ["farms", "growth", "abilities", "formation", "deployment"].includes(tab);
    DOLLAR2("gameMenuTabs").hidden = !UPGRADES;
    DOLLAR2("gameMenuTitle").textContent = UPGRADES ? "업그레이드" : tab === "help" ? "도움말" : "설정";
    DOLLAR2("gameMenuClose").setAttribute("aria-label", `${DOLLAR2("gameMenuTitle").textContent} 닫기`);
    for (const [ID, SELECTED] of [
      ["gameMenu", tab === "play"],
      ["upgradeMenu", UPGRADES],
      ["helpMenu", tab === "help"]
    ]) {
      DOLLAR2(ID).setAttribute("aria-expanded", String(menuOpen && SELECTED));
    }
    for (const BUTTON of DOLLAR2("gameMenuTabs").querySelectorAll("[data-menu-tab]")) {
      const SELECTED = BUTTON.dataset.menuTab === tab;
      BUTTON.setAttribute("aria-selected", String(SELECTED));
      BUTTON.tabIndex = SELECTED ? 0 : -1;
    }
    for (const [NAME, ID] of [
      ["play", "menuPlayPanel"],
      ["farms", "farmPanel"],
      ["growth", "treePanel"],
      ["abilities", "abilityPanel"],
      ["help", "helpPanel"],
      ["formation", "formationPanel"],
      ["deployment", "deploymentCardPanel"]
    ]) {
      DOLLAR2(ID).hidden = NAME !== tab;
    }
    if (tab === "farms") {
      farmPanelRevision = -1;
      drawFarmPanel();
    } else if (tab === "growth") {
      drawTree();
    } else if (tab === "abilities") {
      drawAbilityTree();
    }
    renderProgressionResetActions();
  }
  function syncMenuPause(tab) {
    if (tab === "play") {
      if (menuAutoPaused && !menuPauseChanged) {
        active.paused = menuWasPaused;
      }
      menuAutoPaused = false;
      return;
    }
    if (!menuAutoPaused) {
      menuWasPaused = active.paused;
    }
    menuAutoPaused = true;
    if (!active.paused) {
      active.paused = true;
      persist();
    }
  }
  function openMenu(tab = "play", push = true) {
    stopWorldInput();
    if (!menuOpen) {
      menuWasPaused = active.paused;
      menuPauseChanged = false;
      menuAutoPaused = false;
      menuOpen = true;
      DOLLAR2("gameMenuOverlay").hidden = false;
      DOLLAR2("gameMenu").setAttribute("aria-expanded", "true");
    }
    syncMenuPause(tab);
    applyMenuTab(tab);
    if (push) {
      history.pushState(null, "", MENU_ROUTES[tab] || MENU_ROUTES.play);
    }
    (DOLLAR2("gameMenuTabs").querySelector(`[data-menu-tab="${tab}"]`) || DOLLAR2("gameMenuClose")).focus();
  }
  function switchMenuTab(tab, push = true) {
    if (!Object.hasOwn(MENU_ROUTES, tab)) {
      return;
    }
    if (!menuOpen) {
      openMenu(tab, push);
      return;
    }
    if (menuTab === tab) {
      return;
    }
    syncMenuPause(tab);
    applyMenuTab(tab);
    if (push) {
      history.pushState(null, "", MENU_ROUTES[tab]);
    }
  }
  function closeMenu(push = true) {
    if (!menuOpen) {
      return;
    }
    menuOpen = false;
    DOLLAR2("gameMenuOverlay").hidden = true;
    for (const ID of ["gameMenu", "upgradeMenu", "helpMenu"]) {
      DOLLAR2(ID).setAttribute("aria-expanded", "false");
    }
    if (menuAutoPaused && !menuPauseChanged) {
      active.paused = menuWasPaused;
    }
    menuPauseChanged = false;
    menuAutoPaused = false;
    if (push) {
      history.pushState(null, "", active.world.scene === "raid" ? "#/raid" : "#/farm");
    }
    DOLLAR2(
      ["farms", "growth", "abilities", "formation", "deployment"].includes(menuTab) ? "upgradeMenu" : menuTab === "help" ? "helpMenu" : "gameMenu"
    ).focus();
  }
  DOLLAR2("gameMenu").onclick = () => menuOpen && menuTab === "play" ? closeMenu() : openMenu();
  DOLLAR2("upgradeMenu").onclick = () => openMenu(active.world.scene === "raid" || personalGarden?.farmBossEvent?.phase !== "idle" ? "formation" : "growth");
  DOLLAR2("helpMenu").onclick = () => openMenu("help");
  DOLLAR2("gameMenuClose").onclick = () => closeMenu();
  DOLLAR2("menuHome").onclick = () => {
    closeMenu(false);
    setHome(true);
  };
  DOLLAR2("gameMenuTabs").onclick = (e) => {
    const BUTTON = e.target.closest("[data-menu-tab]");
    if (BUTTON && !BUTTON.disabled) {
      switchMenuTab(BUTTON.dataset.menuTab);
    }
  };
  DOLLAR2("farmPlotList").onclick = (e) => {
    const BUTTON = e.target.closest("[data-farm-plot]");
    if (BUTTON && !BUTTON.disabled) {
      active.queue("farm-plot-switch", { plotId: BUTTON.dataset.farmPlot });
    }
  };
  function switchAdjacentFarmPlot(step) {
    const WORLD = personalGarden || active.world, IDS = [...WORLD.farmPlots.keys()], INDEX = IDS.indexOf(WORLD.activePlotId);
    if (IDS.length > 1 && INDEX >= 0) {
      active.queue("farm-plot-switch", { plotId: IDS[(INDEX + step + IDS.length) % IDS.length] });
    }
  }
  DOLLAR2("plotPrev").onclick = () => switchAdjacentFarmPlot(-1);
  DOLLAR2("plotNext").onclick = () => switchAdjacentFarmPlot(1);
  DOLLAR2("farmExpand").onclick = () => {
    active.queue("farm-plot-expand", { plotId: (personalGarden || active.world).activePlotId });
  };
  DOLLAR2("farmUnlock").onclick = () => active.queue("farm-plot-unlock");
  DOLLAR2("farmPlotActions").addEventListener("click", (e) => {
    const BUTTON = e.target.closest("[data-farm-sort]");
    if (BUTTON) {
      beginFarmSortTransition(BUTTON.dataset.farmSort);
    }
  });
  DOLLAR2("farmRatioList").addEventListener("input", (e) => {
    const INPUT = e.target.closest("[data-farm-target]");
    if (INPUT) {
      INPUT.parentElement.querySelector("output").textContent = `목표 ${+(Number(INPUT.value) / 100).toFixed(1)}%`;
    }
  });
  DOLLAR2("farmRatioList").addEventListener("change", (e) => {
    const INPUT = e.target.closest("[data-farm-target]");
    if (INPUT) {
      active.queue("farm-target", {
        speciesId: Number(INPUT.dataset.farmTarget),
        basisPoints: Number(INPUT.value)
      });
    }
  });
  DOLLAR2("progressionResetActions").onclick = (event) => {
    const BUTTON = event.target.closest("button[data-progression-reset]");
    if (!BUTTON || BUTTON.disabled) {
      return;
    }
    const SCOPE = BUTTON.dataset.progressionReset === "all" ? { type: "all" } : currentProgressionResetScope();
    if (SCOPE) {
      active.queue("progression-reset", { scope: SCOPE });
      setTimeout(() => {
        drawTree();
        drawAbilityTree();
        renderProgressionResetActions();
      }, 180);
    }
  };
  DOLLAR2("gameMenuTabs").onkeydown = (e) => {
    const BUTTONS = [...DOLLAR2("gameMenuTabs").querySelectorAll('[role="tab"]:not(:disabled)')], INDEX = BUTTONS.indexOf(document.activeElement);
    let next;
    if (e.key === "ArrowRight") {
      next = (INDEX + 1) % BUTTONS.length;
    } else if (e.key === "ArrowLeft") {
      next = (INDEX - 1 + BUTTONS.length) % BUTTONS.length;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = BUTTONS.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    BUTTONS[next]?.focus();
    if (BUTTONS[next]) {
      switchMenuTab(BUTTONS[next].dataset.menuTab);
    }
  };
  var GAME_MENU_OVERLAY = DOLLAR2("gameMenuOverlay");
  var CLOSE_MENU_FROM_BACKDROP = (e) => {
    if (e.target === GAME_MENU_OVERLAY) {
      closeMenu();
    }
  };
  GAME_MENU_OVERLAY.addEventListener("click", CLOSE_MENU_FROM_BACKDROP);
  DOLLAR2("treeNodes").onclick = (e) => {
    const B = e.target.closest("[data-progression-farm-node]");
    if (B) {
      active.queue("progression-invest", {
        scope: "farm",
        nodeId: B.dataset.progressionFarmNode
      });
      setTimeout(drawTree, 180);
    }
  };
  DOLLAR2("abilitySpeciesTabs").onclick = (e) => {
    const BUTTON = e.target.closest("[data-ability-species]");
    if (!BUTTON) {
      return;
    }
    DOLLAR2("abilityPanel").dataset.selectedSpecies = BUTTON.dataset.abilitySpecies;
    drawAbilityTree();
  };
  DOLLAR2("abilityNodes").onclick = (e) => {
    const BUTTON = e.target.closest("button[data-ability-action],button[data-ability-node]");
    if (!BUTTON || BUTTON.getAttribute("aria-disabled") === "true") {
      return;
    }
    if (BUTTON.dataset.abilityAction === "reset") {
      active.queue("progression-reset", {
        scope: {
          type: "abilities",
          speciesId: Number(DOLLAR2("abilityPanel").dataset.selectedSpecies || 0)
        }
      });
    } else if (BUTTON.dataset.abilityNode) {
      const [ABILITY_ID8, KIND, LEVEL] = BUTTON.dataset.abilityNode.split(":");
      const NODE_ID = KIND === "root" ? "root" : `${KIND}-${LEVEL}`;
      active.queue("progression-invest", {
        scope: "ability",
        abilityId: ABILITY_ID8,
        nodeId: NODE_ID
      });
    }
    setTimeout(() => {
      drawAbilityTree();
      renderProgressionResetActions();
    }, 180);
  };
  function focusableMenuButtons() {
    return [...DOLLAR2("gameMenuPanel").querySelectorAll('button:not(:disabled):not([aria-disabled="true"])')].filter(
      (button) => button.getClientRects().length > 0
    );
  }
  DOLLAR2("gameMenuPanel").onkeydown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key !== "Tab") {
      return;
    }
    const BUTTONS = focusableMenuButtons();
    if (!BUTTONS.length) {
      return;
    }
    const FIRST = BUTTONS[0], LAST = BUTTONS.at(-1);
    if (e.shiftKey && document.activeElement === FIRST) {
      e.preventDefault();
      LAST.focus();
    } else if (!e.shiftKey && document.activeElement === LAST) {
      e.preventDefault();
      FIRST.focus();
    }
  };
  var CANVAS = DOLLAR2("world");
  function syncText(id, value) {
    const NODE = DOLLAR2(id), TEXT = String(value);
    if (NODE.textContent !== TEXT) {
      NODE.textContent = TEXT;
    }
  }
  function syncFlag(id, key, value) {
    const NODE = DOLLAR2(id), FLAG = !!value;
    if (NODE[key] !== FLAG) {
      NODE[key] = FLAG;
    }
  }
  function syncAttribute(id, key, value) {
    const NODE = DOLLAR2(id), TEXT = String(value);
    if (NODE.getAttribute(key) !== TEXT) {
      NODE.setAttribute(key, TEXT);
    }
  }
  var HUD_WIDTHS = /* @__PURE__ */ new Map();
  function syncWidth(id, value) {
    const NODE = DOLLAR2(id);
    let previous = HUD_WIDTHS.get(id);
    if (previous?.value === value && previous.applied === NODE.style.width) {
      return;
    }
    if (NODE.style.width !== value) {
      NODE.style.width = value;
    }
    if (!previous) {
      previous = {};
      HUD_WIDTHS.set(id, previous);
    }
    previous.value = value;
    previous.applied = NODE.style.width;
  }
  function syncData(id, key, value) {
    const NODE = DOLLAR2(id), TEXT = String(value);
    if (NODE.dataset[key] !== TEXT) {
      NODE.dataset[key] = TEXT;
    }
  }
  function deploymentHud() {
    const W = active.world, ROSTER2 = W.raidRoster(active.localPlayerId), REMAINING = ROSTER2 ? W.raidRemaining(active.localPlayerId) : personalGarden?.units.length || 0, QUEUED = ROSTER2 ? Math.max(0, active.localDeploySequence - ROSTER2.lastDeploySequence) : 0;
    syncText(
      "raidRemaining",
      !ROSTER2 ? "출전 병력을 준비하고 있어요…" : `남은 병력 ${Math.max(0, REMAINING - QUEUED)} · 약한 병력부터 · 맵 가장자리 전방위 투입`
    );
    let deployed = 0;
    if (ROSTER2) {
      for (const TROOP of ROSTER2.troops) {
        if (TROOP.deployed) {
          deployed++;
        }
      }
    }
    const STAGE = W.boss.stage || 0;
    if (STAGE) {
      const MULTIPLIER = raidDeploymentRewardMultiplier({
        availableAtStart: ROSTER2?.troops.length || 0,
        originalUnitsDeployed: deployed
      });
      syncText(
        "raidRewardChance",
        `${speciesRewardName(W.boss.species)} · ${bossRewardRollDescription(STAGE, { acquisitionMultiplier: MULTIPLIER, firstClear: STAGE > (personalGarden?.farmBossProgress?.highestClearedRaidStage ?? 0) })}`
      );
    } else {
      syncText("raidRewardChance", "");
    }
  }
  function canUseWorldInput() {
    return !home && !menuOpen && !bossEncounterOpen && !active.paused && !farmSortTransition;
  }
  function cancelFarmSortTransition() {
    if (!farmSortTransition) {
      return false;
    }
    clearTimeout(farmSortTransition.commitTimer);
    clearTimeout(farmSortTransition.finishTimer);
    farmSortTransition = null;
    CANVAS.style.transition = "";
    CANVAS.style.opacity = "";
    CANVAS.style.transform = "";
    farmPanelRevision = -1;
    if (menuOpen && menuTab === "farms" && personalGarden) {
      drawFarmPanel();
    }
    return true;
  }
  function beginFarmSortTransition(order) {
    if (farmSortTransition || active.world.scene !== "farm" || active.world.running || active.world.farmBossEvent?.phase !== "idle") {
      return false;
    }
    [...document.querySelectorAll("#farmPlotActions button, #farmPlotList button, #farmRatioList input")].forEach(
      (button) => button.disabled = true
    );
    farmSortTransition = { commitTimer: null, finishTimer: null };
    CANVAS.style.transition = "opacity 250ms ease, transform 250ms ease";
    CANVAS.style.opacity = "0";
    CANVAS.style.transform = "scale(0.96)";
    farmSortTransition.commitTimer = setTimeout(() => {
      if (!farmSortTransition || active.world.scene !== "farm") {
        cancelFarmSortTransition();
        return;
      }
      if (!active.queue("farm-sort", { order })) {
        cancelFarmSortTransition();
        return;
      }
      CANVAS.style.opacity = "1";
      CANVAS.style.transform = "scale(1)";
      farmSortTransition.finishTimer = setTimeout(cancelFarmSortTransition, 250);
    }, 250);
    return true;
  }
  function stopPan(e) {
    if (e && panPointer && e.pointerId !== panPointer.id) {
      return;
    }
    const ID = panPointer?.id;
    panPointer = null;
    if (ID !== void 0 && CANVAS.hasPointerCapture?.(ID)) {
      CANVAS.releasePointerCapture(ID);
    }
  }
  function stopFoodHold(e) {
    if (e && foodHold && e.pointerId !== foodHold.pointerId) {
      return;
    }
    if (foodHold) {
      clearTimeout(foodHold.initialTimer);
      clearInterval(foodHold.repeatTimer);
      foodHold = null;
    }
  }
  function stopWorldInput(e) {
    stopFoodHold(e);
    RAID_DEPLOYMENT_UI.stopHold(e);
    stopPan(e);
  }
  CANVAS.addEventListener("pointerdown", (e) => {
    FOOD_FEEL.unlock();
    if (e.button !== 0 || !canUseWorldInput() || panPointer || RAID_DEPLOYMENT_UI.hold) {
      return;
    }
    const POINT2 = RENDERER.screenToWorld(e.clientX, e.clientY);
    panPointer = {
      id: e.pointerId,
      mode: active.world.scene === "farm" ? "pending" : "pan",
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY
    };
    if (panPointer.mode === "pending") {
      foodHold = {
        pointerId: e.pointerId,
        point: { x: POINT2.x, y: POINT2.y },
        initialTimer: setTimeout(() => {
          if (foodHold?.pointerId !== e.pointerId || panPointer?.mode !== "pending") {
            return;
          }
          panPointer.mode = "feed";
          active.queue("scatter-food", foodHold.point);
          foodHold.repeatTimer = setInterval(() => {
            if (foodHold?.pointerId === e.pointerId && canUseWorldInput() && panPointer?.mode === "feed") {
              active.queue("scatter-food", foodHold.point);
            }
          }, 100);
        }, 100),
        repeatTimer: null
      };
    }
    CANVAS.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  CANVAS.addEventListener("pointermove", (e) => {
    if (!panPointer || e.pointerId !== panPointer.id) {
      return;
    }
    if (!canUseWorldInput()) {
      stopWorldInput(e);
      return;
    }
    const DISTANCE = Math.hypot(e.clientX - panPointer.startX, e.clientY - panPointer.startY);
    if (panPointer.mode === "pending" && DISTANCE >= 8) {
      stopFoodHold(e);
      panPointer.mode = "pan";
    } else if (panPointer.mode === "feed" && DISTANCE >= 8) {
      stopFoodHold(e);
      panPointer.mode = "pan";
    }
    if (panPointer.mode === "pan") {
      RENDERER.panByScreen(e.clientX - panPointer.x, e.clientY - panPointer.y);
      panPointer.x = e.clientX;
      panPointer.y = e.clientY;
    }
    e.preventDefault();
  });
  CANVAS.addEventListener("lostpointercapture", stopWorldInput);
  window.addEventListener("pointerup", stopWorldInput, true);
  window.addEventListener("pointercancel", stopWorldInput, true);
  window.addEventListener("blur", () => {
    stopWorldInput();
    persist();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopWorldInput();
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
      const CURRENT = personalGarden?.farmBossProgress?.currentStage || 1, HIGHEST_CLEARED = personalGarden?.farmBossProgress?.highestClearedRaidStage || 0, NEXT = e.key === "ArrowUp" ? Math.min(BOSS_REWARD_SETTINGS.maxStage, HIGHEST_CLEARED + 2, CURRENT + 1) : Math.max(1, CURRENT - 1);
      renderBossEncounterStage(NEXT);
    }
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      location.reload();
    }
  });
  window.addEventListener("resize", () => {
    stopWorldInput();
    RENDERER.resize();
  });
  window.addEventListener("pagehide", () => {
    stopWorldInput();
    persist();
    active.dispose();
    unsubscribeProgress?.();
    unsubscribeProgress = null;
    RENDERER.dispose();
  });
  CANVAS.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    stopWorldInput();
    persist();
    FAIL3(Error("그래픽 연결이 끊겼어요. 새로고침해 다시 이어가 주세요."));
  });
  function route() {
    stopWorldInput();
    const R2 = location.hash;
    if (R2 === "#/" || !R2) {
      if (menuOpen) {
        closeMenu(false);
      }
      setHome(true, false);
      return;
    }
    if (STORAGE.hasReservedRaid && active.world.scene !== "raid") {
      if (menuOpen) {
        closeMenu(false);
      }
      setHome(true, false);
      history.replaceState(null, "", "#/");
      return;
    }
    if (home) {
      if (STORAGE.error && !STORAGE.hasWorld) {
        setHome(true, false);
        history.replaceState(null, "", "#/");
        return;
      }
      if (STORAGE.hasWorld) {
        start(restore(snapshot(STORAGE.world)), false);
      } else {
        start(new GARDEN(), false);
      }
    }
    if (R2 === "#/boss") {
      if (!openBossEncounter(false)) {
        history.replaceState(null, "", "#/farm");
      }
      return;
    }
    if (R2 === "#/help" || R2 === "#/farms" || R2 === "#/growth" || R2 === "#/abilities" || R2 === "#/formation" || R2 === "#/menu") {
      const RAID = active.world.scene === "raid", FARM_EVENT_ACTIVE = !RAID && personalGarden?.farmBossEvent?.phase !== "idle";
      const RESTRICTED = (R2 === "#/farms" || R2 === "#/growth") && (RAID || FARM_EVENT_ACTIVE) || R2 === "#/abilities" && (RAID || !personalGarden);
      if (RESTRICTED) {
        closeMenu(false);
        history.replaceState(null, "", RAID ? "#/raid" : "#/farm");
        return;
      }
      openMenu(ROUTE_MENU_TAB(R2), false);
      return;
    }
    if (menuOpen) {
      closeMenu(false);
    }
    if (bossEncounterOpen && R2 !== "#/boss") {
      closeBossEncounter(false);
    }
    if (R2 === "#/raid") {
      if (personalGarden?.farmBossEvent?.phase !== "idle") {
        history.replaceState(null, "", "#/farm");
      } else {
        openBossEncounter(false);
      }
    } else if (R2 === "#/farm" && active.world.scene === "raid") {
      returnToFarm(false);
    }
  }
  window.addEventListener("popstate", route);
  function sync(display, now, notices) {
    const W = active.world, RAID = display.scene === "raid", FARM_EVENT = display.farmBossEvent, FARM_EVENT_ACTIVE = !RAID && FARM_EVENT?.phase !== "idle", BATTLE_HUD = RAID || FARM_EVENT_ACTIVE, BATTLE_OUTCOME = RAID ? W.encounter.outcome : FARM_EVENT?.outcome, HAS_READY_TROOPS = personalGarden ? hasRaidRosterEntries(personalGarden.roster.residents()) : false, REWARD_WORLD = personalGarden || W, SETTLED_RUN_SEQUENCE = RAID ? personalGarden?.activeRaidRunSequence ?? W.boss.encounterId : null, SETTLED_REWARD = RAID ? personalGarden?.raidSettlementReceipts?.find((receipt) => receipt.runSequence === SETTLED_RUN_SEQUENCE)?.reward : null, SETTLED_REWARD_RECEIPT = SETTLED_REWARD?.acquisition?.receiptKey ? REWARD_WORLD.bossRewardReceipts.find(
      (reward) => reward.receiptKey === SETTLED_REWARD.acquisition.receiptKey
    ) : null, PENDING_REWARD = REWARD_WORLD.bossRewardReceipts.find(
      (reward) => ["calculating", "ready"].includes(reward.status) || reward.queuedCount > 0
    ), MERGE_STATUS = mergeAvailability(W, now);
    syncBossRewardDialog(REWARD_WORLD, {
      receiptKey: BATTLE_OUTCOME === "victory" ? SETTLED_REWARD_RECEIPT?.receiptKey || null : null,
      raidVictory: RAID && BATTLE_OUTCOME === "victory"
    });
    if ((home || menuOpen || bossEncounterOpen || active.paused) && (RAID_DEPLOYMENT_UI.hold || panPointer)) {
      stopWorldInput();
    }
    syncAttribute("farm", "aria-pressed", !RAID && !bossEncounterOpen);
    syncAttribute("raid", "aria-pressed", RAID || bossEncounterOpen);
    syncFlag("merge", "disabled", home || RAID || FARM_EVENT_ACTIVE || bossEncounterOpen || !MERGE_STATUS.available);
    syncData("merge", "availability", MERGE_STATUS.code || "unavailable");
    syncFlag("mergeNotice", "hidden", home || RAID || FARM_EVENT_ACTIVE || bossEncounterOpen);
    const PLOT_WORLD = personalGarden || W, PLOT_IDS = PLOT_WORLD.farmPlots ? [...PLOT_WORLD.farmPlots.keys()] : [];
    syncFlag("plotBar", "hidden", home || RAID || FARM_EVENT_ACTIVE || bossEncounterOpen || PLOT_IDS.length < 2);
    if (PLOT_IDS.length > 1) {
      syncText("plotBarName", farmPlotDisplayName(PLOT_WORLD.activePlotId));
      syncText(
        "plotBarCount",
        `${PLOT_WORLD.roster.placedPopulation(PLOT_WORLD.activePlotId)} / ${PLOT_WORLD.activeFarmPlot.capacity}`
      );
      syncFlag("plotPrev", "disabled", !!farmSortTransition || W.running);
      syncFlag("plotNext", "disabled", !!farmSortTransition || W.running);
    }
    syncAttribute("merge", "aria-label", `합성${MERGE_STATUS.available ? "" : " 불가"} · ${MERGE_STATUS.reason}`);
    syncText("mergeNotice", MERGE_STATUS.reason);
    let displayedCount = 0;
    let worldCount = 0;
    let armyCurrent = 0;
    let armyMax = 0;
    let armyLiving = 0;
    let armyTotal = 0;
    for (const UNIT3 of display.units) {
      if (!UNIT3.isBattleOnlySummon) {
        displayedCount++;
      }
      if (UNIT3.faction === CONFIG.factions.PLAYER) {
        armyCurrent += Math.max(0, Math.min(UNIT3.maxHp, UNIT3.hp));
        armyMax += UNIT3.maxHp;
        armyLiving += UNIT3.hp > 0 ? 1 : 0;
        armyTotal++;
      }
    }
    if (!RAID) {
      for (const UNIT3 of W.units) {
        if (!UNIT3.isBattleOnlySummon) {
          worldCount++;
        }
      }
    }
    syncFlag("bossEncounterScreen", "hidden", home || !bossEncounterOpen);
    syncFlag("farmControls", "hidden", RAID || FARM_EVENT_ACTIVE || home || bossEncounterOpen);
    syncFlag("raidControls", "hidden", !RAID || home);
    syncFlag("bossbar", "hidden", !BATTLE_HUD || home);
    syncText(
      "count",
      RAID ? W.raidRoster(active.localPlayerId)?.troops.length ?? personalGarden?.units.length ?? 0 : displayedCount
    );
    syncText("capacity", personalGarden?.capacity ?? CONFIG.farm.capacity.base);
    syncText(
      "starter",
      RAID ? `${W.units.length}마리 출전 중` : PENDING_REWARD ? `${speciesRewardName(PENDING_REWARD.species)} 보상 대기 · 공간이 생기면 합류해요` : !HAS_READY_TROOPS ? "모두 휴식 중 · 회복을 기다려요" : worldCount >= W.capacity ? "농장이 가득 찼어요" : "번식으로 식구를 늘려요"
    );
    syncWidth("allyHealth", (armyMax ? armyCurrent / armyMax * 100 : 0) + "%");
    syncText(
      "allyHealthText",
      Math.ceil(armyCurrent) + " / " + Math.ceil(armyMax) + " HP · " + armyLiving + "/" + armyTotal + " 생존"
    );
    const BOSS2 = display.boss, FARM_REWARD = !RAID && FARM_EVENT?.outcome === "victory" ? W.bossRewardReceipts.find(
      (reward) => reward.source === "farm" && reward.encounterId === FARM_EVENT.encounterId
    ) : null, STAGE_NAME = RAID && BOSS2.stage ? `${BOSS2.stage}단계` : "", REWARD_NAME = speciesRewardName(BOSS2.species), ENCOUNTER_NAME = giantSpeciesName(BOSS2.species);
    syncText("bossName", !RAID && BOSS2.stage ? `${ENCOUNTER_NAME} · 이벤트 ${BOSS2.stage}단계` : ENCOUNTER_NAME);
    syncAttribute("bossHealth", "aria-label", `${ENCOUNTER_NAME} 체력`);
    syncText("bossHealthText", Math.ceil(BOSS2.hp) + " / " + BOSS2.maxHp + " HP");
    syncText("bossHealthNote", FARM_EVENT_ACTIVE ? "상대 능력치 고정" : "전사자 포함 최대 HP");
    syncAttribute("allyHealth", "aria-valuenow", armyCurrent);
    syncAttribute("allyHealth", "aria-valuemax", armyMax);
    syncAttribute("bossHealth", "aria-valuenow", BOSS2.hp);
    syncAttribute("bossHealth", "aria-valuemax", BOSS2.maxHp);
    syncWidth("bossHealth", BOSS2.maxHp ? BOSS2.hp / BOSS2.maxHp * 100 + "%" : "0%");
    syncText(
      "battleOutcome",
      RAID ? BATTLE_OUTCOME === "victory" ? `${STAGE_NAME} · ${ENCOUNTER_NAME} 승리 · +${SETTLED_REWARD?.xp?.amount ?? bossStageStats(BOSS2.stage || 1).xp} XP · ${SETTLED_REWARD ? rewardReceiptSummary(SETTLED_REWARD_RECEIPT || SETTLED_REWARD.acquisition) : "농장으로 돌아가면 보상을 받아요"}` : BATTLE_OUTCOME === "defeat" ? `${STAGE_NAME} · ${ENCOUNTER_NAME} 패배 · 농장에서 다시 준비해요` : "" : BATTLE_OUTCOME === "victory" ? FARM_EVENT.rewardStatus === "granted" ? `${ENCOUNTER_NAME} 격파 · ${REWARD_NAME} ${rewardReceiptSummary(FARM_REWARD)} · 농장에 합류했어요` : FARM_EVENT.rewardStatus === "pending" ? `${ENCOUNTER_NAME} 격파 · ${REWARD_NAME} ${rewardReceiptSummary(FARM_REWARD)} · 공간이 생기면 합류해요` : `${ENCOUNTER_NAME} 격파` : BATTLE_OUTCOME === "defeat" ? `${ENCOUNTER_NAME} 도전 종료 · 병력이 회복될 때까지 기다려요` : ""
    );
    syncFlag(
      "battleOutcome",
      "hidden",
      home || !BATTLE_HUD || BATTLE_OUTCOME === "fighting" || BATTLE_OUTCOME === "idle"
    );
    syncFlag(
      "bossEncounterChallenge",
      "disabled",
      !personalGarden || !HAS_READY_TROOPS || FARM_EVENT_ACTIVE || personalGarden?.activeRaidRunSequence !== null || personalGarden.farmBossProgress.currentStage > personalGarden.farmBossProgress.highestClearedRaidStage + 1
    );
    syncFlag("menuTabFarms", "disabled", RAID || FARM_EVENT_ACTIVE || bossEncounterOpen);
    syncFlag("menuTabGrowth", "disabled", RAID || FARM_EVENT_ACTIVE || bossEncounterOpen);
    syncFlag("menuTabAbilities", "disabled", RAID || !personalGarden);
    syncFlag("raid", "disabled", RAID || FARM_EVENT_ACTIVE || !personalGarden);
    syncText("pause", active.paused ? "▶" : "Ⅱ");
    syncAttribute("pause", "aria-label", active.paused ? "계속하기" : "일시정지");
    syncAttribute("pause", "title", active.paused ? "계속하기" : "일시정지");
    syncAttribute("feed", "aria-label", "현재 농장에 먹이 1개 살포");
    syncAttribute("feed", "title", "현재 농장에 먹이 1개 살포");
    syncData("feed", "state", W.warehouseFood <= 0 || W.food.length >= 140 ? "unavailable" : "ready");
    syncFlag(
      "feed",
      "disabled",
      home || active.paused || W.scene !== "farm" || W.warehouseFood <= 0 || W.food.length >= 140
    );
    syncText("warehouseStock", String(W.warehouseFood));
    syncText("warehouseProgressLabel", `자동 생산 ${W.foodTaps.remainder}/5`);
    syncAttribute("warehouseProgress", "aria-valuenow", String(W.foodTaps.remainder));
    syncAttribute("warehouseProgress", "aria-valuetext", `자동 생산 ${W.foodTaps.remainder}/5`);
    if (menuOpen && menuTab === "farms") {
      drawFarmPanel();
    }
    syncData("warehouseProgress", "produced", now < FOOD_FEEL.completeUntil);
    for (let i = 0; i < 5; i++) {
      const PIP = FOOD_FEEL.pips[i], FILLED = now < FOOD_FEEL.completeUntil || i < W.foodTaps.remainder;
      if (PIP.classList.contains("filled") !== FILLED) {
        PIP.classList.toggle("filled", FILLED);
      }
    }
    for (const E of notices) {
      if (E.kind === "food-tap") {
        FOOD_FEEL.tap(E.source, E.completed, E.remainder);
      } else if (E.kind === "manual-feed") {
        FOOD_FEEL.manualScatter();
      } else {
        FOOD_FEEL.event(E.kind);
      }
    }
    FOOD_FEEL.frame(now);
    deploymentHud();
  }
  function frame(now) {
    try {
      PERFORMANCE_DIAGNOSTICS.beginFrame(now);
      active.profiler = PERFORMANCE_DIAGNOSTICS;
      active.world.profiler = PERFORMANCE_DIAGNOSTICS;
      const SIMULATION_START = PERFORMANCE_DIAGNOSTICS.start();
      if (!home && !document.hidden) {
        active.pulse(now);
      }
      PERFORMANCE_DIAGNOSTICS.end("simulation", SIMULATION_START);
      const PRESENTATION_START = PERFORMANCE_DIAGNOSTICS.start();
      const DISPLAY = active.presentation(now), NOTICES = active.takePresentationNotices();
      COMBAT_FEEL.observe(active.world, DISPLAY.displayTimeMs, DISPLAY.presentationRevision, NOTICES);
      PERFORMANCE_DIAGNOSTICS.end("presentation", PRESENTATION_START);
      const RENDER_START = PERFORMANCE_DIAGNOSTICS.start();
      RENDERER.render(DISPLAY, COMBAT_FEEL, DISPLAY.displayTimeMs);
      PERFORMANCE_DIAGNOSTICS.end("render", RENDER_START);
      const UI_START = PERFORMANCE_DIAGNOSTICS.start();
      sync(DISPLAY, now, NOTICES);
      FORMATION_UI.update(active.world, DISPLAY, !home, active.localPlayerId);
      RAID_DEPLOYMENT_UI.update(
        active.world,
        personalGarden || active.world,
        !home,
        active.localPlayerId,
        active.world.scene === "farm" && !active.world.running && active.world.farmBossEvent?.phase === "idle"
      );
      PERFORMANCE_DIAGNOSTICS.end("ui", UI_START);
      PERFORMANCE_DIAGNOSTICS.endFrame(RENDERER);
      requestAnimationFrame(frame);
    } catch (error) {
      if (typeof globalThis.BloomReportRuntimeFatal === "function") {
        globalThis.BloomReportRuntimeFatal(error);
      } else {
        console.error("Farm render loop stopped", error);
      }
    }
  }
  DOLLAR2("productVersion").textContent = PRODUCT_VERSION;
  DOLLAR2("startVersion").textContent = PRODUCT_VERSION;
  setHome(true, false);
  if (location.hash && location.hash !== "#/") {
    route();
  }
  requestAnimationFrame(frame);
  globalThis.BUDMORI = {
    get sim() {
      return active.world;
    },
    get runtime() {
      return active;
    },
    get renderMetrics() {
      return frameRate();
    },
    get presentationDiagnostics() {
      return active.latestPresentationDiagnostics;
    },
    renderer: RENDERER,
    storage: STORAGE,
    foodFeel: FOOD_FEEL,
    combatFeel: COMBAT_FEEL,
    CONFIG,
    ATTACK_TYPES: UNIT_ABILITY_PROFILES,
    Ballistics: BALLISTICS,
    ArenaGeometry: ARENA_GEOMETRY,
    version: PRODUCT_VERSION
  };
})();
