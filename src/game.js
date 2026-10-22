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

  // src/tower-run.js
  function freshTowerRun() {
    return {
      doors: [],
      nextKind: "",
      cards: [],
      passives: {},
      relics: /* @__PURE__ */ new Map(),
      since: { battle: 0, power: 1, event: 1 },
      // This fight's: allies fallen so far and the units whose undying card is already spent.
      fallen: 0,
      undyingUsed: /* @__PURE__ */ new Set()
    };
  }
  function passiveCard(id) {
    return PASSIVE_CARDS.find((card) => card.id === id);
  }
  function passiveTotals(cards) {
    const TOTALS = {};
    for (const TAKEN of cards) {
      const CARD = passiveCard(TAKEN.id);
      if (CARD) {
        TOTALS[CARD.id] = (TOTALS[CARD.id] || 0) + CARD.values[TAKEN.rarity];
      }
    }
    return TOTALS;
  }
  function statCardText(card, rarity) {
    const VALUE = card.values[rarity];
    if (card.stat === "critChance" || card.stat === "lifesteal") {
      return `+${Math.round(VALUE * 1e3) / 10}%p`;
    }
    if (card.stat === "regen" && card.mode === "pct") {
      return `+${Math.round(VALUE * 1e4) / 100}% 체력/초`;
    }
    if (card.stat === "regen") {
      return `+${VALUE}/초`;
    }
    return card.mode === "pct" ? `+${Math.round(VALUE * 100)}%` : `+${VALUE}`;
  }
  function statCard(id) {
    return STAT_CARDS.find((card) => card.id === id);
  }
  function runStatModifiers(cards) {
    const MODS = {};
    for (const TAKEN of cards) {
      const CARD = statCard(TAKEN.id);
      if (CARD) {
        MODS[CARD.stat] ??= { flat: 0, pct: 0 };
        MODS[CARD.stat][CARD.mode] += CARD.values[TAKEN.rarity];
      }
    }
    return MODS;
  }
  function cardStacks(cards, id) {
    return cards.reduce((sum, card) => sum + (card.id === id ? 1 : 0), 0);
  }
  function weightedIndex(weights, random) {
    const TOTAL = weights.reduce((sum, weight) => sum + weight, 0);
    let rest = random() * TOTAL;
    for (let index = 0; index < weights.length; index++) {
      rest -= weights[index];
      if (rest < 0 && weights[index] > 0) {
        return index;
      }
    }
    return weights.findLastIndex((weight) => weight > 0);
  }
  function rollFloorKind({ floor, since, random, midBossEvery, topFloor }) {
    const SETTINGS = TOWER_RUN_SETTINGS;
    if (floor % midBossEvery === 0) {
      return "mid";
    }
    if (floor >= topFloor || since.battle >= SETTINGS.battleMaxGap) {
      return "battle";
    }
    const KINDS = Object.keys(SETTINGS.floorBase);
    return KINDS[weightedIndex(
      KINDS.map(
        (kind) => kind === "event" && !TOWER_EVENTS.length ? 0 : SETTINGS.floorBase[kind] * (1 + SETTINGS.gain * since[kind])
      ),
      random
    )];
  }
  function advanceSince(since, kind) {
    const CAME = kind === "mid" ? "battle" : kind;
    return Object.fromEntries(Object.entries(since).map(([key, value]) => [key, key === CAME ? 0 : value + 1]));
  }
  function rollRarity(floor, random) {
    const SETTINGS = TOWER_RUN_SETTINGS;
    return weightedIndex(
      SETTINGS.rarityBase.map(
        (base, index) => Math.min(SETTINGS.rarityMax[index], base + SETTINGS.rarityPerFloor[index] * floor)
      ),
      random
    );
  }
  function rollCardOffers({ floor, cards, relics, skillIds, passiveIds, relicSlots, relicMaxLevel, random }) {
    const POOLS = {
      stat: STAT_CARDS.filter((card) => cardStacks(cards, card.id) < TOWER_RUN_SETTINGS.cardCap).map(
        (card) => card.id
      ),
      skill: skillIds.filter((id) => {
        const LEVEL = relics.get(id) || 0;
        return LEVEL ? LEVEL < relicMaxLevel : relics.size < relicSlots;
      }),
      passive: passiveIds.filter((id) => cardStacks(cards, id) < TOWER_RUN_SETTINGS.cardCap)
    };
    const OFFERS = [];
    while (OFFERS.length < TOWER_RUN_SETTINGS.cardsPerFloor) {
      const TYPES = Object.keys(POOLS).filter((type) => POOLS[type].length);
      if (!TYPES.length) {
        break;
      }
      const TYPE = TYPES[weightedIndex(
        TYPES.map((type) => TOWER_RUN_SETTINGS.kindWeights[type]),
        random
      )], ID = POOLS[TYPE].splice(Math.floor(random() * POOLS[TYPE].length), 1)[0];
      OFFERS.push(
        TYPE === "skill" ? { type: TYPE, id: ID } : { type: TYPE, id: ID, rarity: rollRarity(floor, random) }
      );
    }
    return OFFERS;
  }
  function rollEventOffers({ world, random }) {
    const POOL = TOWER_EVENTS.filter((event) => event.available(world)), OFFERS = [];
    while (OFFERS.length < 3 && POOL.length) {
      OFFERS.push({ type: "event", id: POOL.splice(Math.floor(random() * POOL.length), 1)[0].id });
    }
    return OFFERS;
  }
  var TOWER_RUN_SETTINGS, TOWER_EVENTS, PASSIVE_SETTINGS, PERCENT, PASSIVE_CARDS, RARITY_NAMES, STAT_CARDS;
  var init_tower_run = __esm({
    "src/tower-run.js"() {
      TOWER_RUN_SETTINGS = Object.freeze({
        // A floor kind's weight is `base * (1 + gain * floors since it last came)`, so one that stays away becomes likelier.
        // Events weigh nothing while none are registered (TOWER_EVENTS below).
        floorBase: Object.freeze({ battle: 1.5, power: 8, event: 1 }),
        gain: 0.5,
        // A fight is forced once this many floors have passed without one; the fixed mid boss counts as a fight.
        battleMaxGap: 4,
        // A card can be taken this many times in one climb, whatever its rarity.
        cardCap: 10,
        // Rarity weights at floor 0 and how much each floor adds, capped. Order: common, rare, epic.
        // Three cards a strengthening floor, and how likely each kind is to fill a slot: stat 8, passive 1, skill 1.
        cardsPerFloor: 3,
        kindWeights: Object.freeze({ stat: 8, passive: 1, skill: 1 }),
        rarityBase: Object.freeze([70, 25, 5]),
        rarityPerFloor: Object.freeze([0, 0.25, 0.1]),
        rarityMax: Object.freeze([70, 40, 15])
      });
      TOWER_EVENTS = Object.freeze([]);
      PASSIVE_SETTINGS = Object.freeze({
        lastStandBelow: 0.5,
        resolveBelow: 0.3,
        openingSeconds: 10,
        // A fallen ally adds to vengeance this many times at most.
        vengeanceMaxFallen: 10,
        // Healing of a fallen ally's neighbours reaches this far.
        helperRadius: 7,
        resolveMaxReduction: 0.8,
        undyingMaxRestore: 0.9
      });
      PERCENT = (value) => `${Math.round(value * 1e3) / 10}%`;
      PASSIVE_CARDS = Object.freeze([
        {
          id: "last-stand",
          name: "배수진",
          values: [0.15, 0.24, 0.38],
          text: (value) => `체력 50% 이하일 때 공격 +${PERCENT(value)}`
        },
        {
          id: "resolve",
          name: "불굴",
          values: [0.15, 0.22, 0.32],
          text: (value) => `체력 30% 이하일 때 받는 피해 -${PERCENT(value)}`
        },
        {
          id: "vengeance",
          name: "복수",
          values: [0.03, 0.045, 0.07],
          text: (value) => `아군이 쓰러질 때마다 공격 +${PERCENT(value)} (전투 동안, 최대 10회)`
        },
        {
          id: "opening",
          name: "선제 공격",
          values: [0.4, 0.6, 0.9],
          text: (value) => `전투 시작 후 ${PASSIVE_SETTINGS.openingSeconds}초간 공격 +${PERCENT(value)}`
        },
        {
          id: "helper",
          name: "도우미",
          values: [0.05, 0.08, 0.12],
          text: (value) => `아군이 쓰러지면 주변 아군을 최대 체력의 ${PERCENT(value)}만큼 회복`
        },
        {
          id: "undying",
          name: "불사",
          values: [0.05, 0.15, 0.3],
          text: (value) => `유닛마다 전투에 한 번, 쓰러질 피해를 견디고 체력 ${PERCENT(value)}로 남음`
        }
      ]);
      RARITY_NAMES = Object.freeze(["일반", "희귀", "영웅"]);
      STAT_CARDS = Object.freeze([
        { id: "attack-pct", stat: "attackPower", mode: "pct", name: "공격력", values: [0.1, 0.16, 0.25] },
        { id: "attack-flat", stat: "attackPower", mode: "flat", name: "공격력", values: [2, 3, 5] },
        { id: "hp-pct", stat: "maxHp", mode: "pct", name: "체력", values: [0.12, 0.19, 0.3] },
        { id: "hp-flat", stat: "maxHp", mode: "flat", name: "체력", values: [20, 32, 50] },
        { id: "regen-pct", stat: "regen", mode: "pct", name: "재생", values: [5e-3, 8e-3, 0.0125] },
        { id: "regen-flat", stat: "regen", mode: "flat", name: "재생", values: [1, 1.6, 2.5] },
        { id: "armor-flat", stat: "armor", mode: "flat", name: "방어력", values: [10, 16, 25] },
        { id: "attack-speed-pct", stat: "attackSpeed", mode: "pct", name: "공격 속도", values: [0.06, 0.1, 0.15] },
        { id: "move-speed-pct", stat: "moveSpeed", mode: "pct", name: "이동 속도", values: [0.06, 0.1, 0.15] },
        { id: "crit-chance-flat", stat: "critChance", mode: "flat", name: "치명타 확률", values: [0.05, 0.08, 0.12] },
        { id: "crit-multiplier-flat", stat: "critMultiplier", mode: "flat", name: "치명타 피해", values: [0.2, 0.32, 0.5] },
        { id: "lifesteal-flat", stat: "lifesteal", mode: "flat", name: "흡혈", values: [0.03, 0.05, 0.075] }
      ]);
    }
  });

  // src/farm-offline.js
  function applyOffline(world, config, rawSeconds) {
    const OFFLINE = config.farm.offline, BREEDING = config.farm.breeding;
    if (world.scene !== "farm" || world.farmBossEvent?.phase !== "idle") {
      return null;
    }
    const AWAY = Math.min(rawSeconds, OFFLINE.capSeconds);
    if (!(AWAY >= OFFLINE.minSeconds)) {
      return null;
    }
    const SECONDS = AWAY * OFFLINE.efficiency;
    world.refreshWorkers();
    const SUMMARY = { seconds: AWAY, food: 0, births: 0 };
    let foodRate = 0;
    for (const ID of world._workerIds) {
      foodRate += world._workerRates.get(ID) || 0;
    }
    let pool = Math.floor(foodRate * SECONDS);
    SUMMARY.food = pool;
    const RESIDENTS = world.roster.residents();
    for (const UNIT3 of RESIDENTS) {
      UNIT3.cooldown = 0;
      if (UNIT3.down > 0) {
        UNIT3.down = Math.min(UNIT3.down, 0.05);
      }
      if (!UNIT3.mature) {
        UNIT3.growthElapsed = UNIT3.growthDuration;
      }
    }
    const COST = 2, ROUND_SECONDS = BREEDING.cooldownSeconds + BREEDING.growthSeconds, ROUNDS = Math.floor(SECONDS / ROUND_SECONDS), CAPACITY = world.capacity, SPECIES_COUNT2 = config.unit.speciesCount, ADULTS = new Array(SPECIES_COUNT2).fill(0);
    for (const UNIT3 of world.roster.residents()) {
      if (UNIT3.isBattleOnlySummon) {
        continue;
      }
      if (UNIT3.mature && UNIT3.hp > 0 && !world._workerIds.has(UNIT3.id)) {
        ADULTS[UNIT3.species]++;
      }
    }
    for (let round = 0; round < ROUNDS && pool >= COST; round++) {
      let progressed = false;
      for (let species = 0; species < SPECIES_COUNT2; species++) {
        const ROOM = CAPACITY - world.ownedPopulation - world.birthReservations;
        let births = Math.min(Math.floor(ADULTS[species] / 2), ROOM, Math.floor(pool / COST));
        while (births-- > 0) {
          const CHILD = world.spawn(species, 1, (world.random() - 0.5) * 10, (world.random() - 0.5) * 6);
          if (!CHILD) {
            break;
          }
          CHILD.growthElapsed = CHILD.growthDuration;
          pool -= COST;
          SUMMARY.births++;
          progressed = true;
        }
      }
      if (!progressed) {
        break;
      }
    }
    world.metrics.births += SUMMARY.births;
    world._nextWorkerRefreshTick = 0;
    world.refreshWorkers();
    world.markProgressChanged();
    return SUMMARY;
  }
  var init_farm_offline = __esm({
    "src/farm-offline.js"() {
    }
  });

  // src/farm-work.js
  function pilePosition(world, config) {
    const WORK = config.farm.work;
    let best = null, bestGap = -1;
    for (let attempt = 0; attempt < 14; attempt++) {
      const ANGLE = world.random() * Math.PI * 2, REACH = Math.sqrt(world.random()), X = Math.cos(ANGLE) * REACH * WORK.pileRadiusX, Y = Math.sin(ANGLE) * REACH * WORK.pileRadiusY;
      let gap = Infinity;
      for (const PILE of world.piles) {
        gap = Math.min(gap, Math.hypot(PILE.x - X, PILE.y - Y));
      }
      if (gap >= WORK.pileGap) {
        return { x: X, y: Y };
      }
      if (gap > bestGap) {
        bestGap = gap;
        best = { x: X, y: Y };
      }
    }
    return best || { x: 0, y: 0 };
  }
  function spawnPile(world, config) {
    const POSITION = pilePosition(world, config), AMOUNT = config.farm.work.pileKind.amount;
    world.piles.push({
      id: ++world._pileId,
      x: POSITION.x,
      y: POSITION.y,
      food: AMOUNT,
      maxFood: AMOUNT,
      stack: 0,
      hitRev: 0,
      big: false
    });
    world.emit("drop-dust", POSITION.x, POSITION.y);
  }
  function pileRadius(pile) {
    return 0.85 * (0.95 + 0.5 * (pile.food / pile.maxFood));
  }
  function workersBySpecies(lengths, ratio, weights) {
    const WORKERS = /* @__PURE__ */ new Map();
    if (!weights) {
      for (const [SPECIES, LENGTH] of lengths) {
        WORKERS.set(SPECIES, Math.floor(ratio * LENGTH + 1e-9));
      }
      return WORKERS;
    }
    let total = 0;
    for (const LENGTH of lengths.values()) {
      total += LENGTH;
    }
    const ALLOC = new Map([...lengths.keys()].map((species) => [species, 0]));
    let remaining = total - Math.floor(ratio * total + 1e-9), active2 = [...lengths.keys()].filter((species) => (weights[species] || 0) > 0 && lengths.get(species) > 0);
    while (remaining > 0 && active2.length) {
      const WEIGHT = active2.reduce((sum, species) => sum + weights[species], 0), FULL = active2.filter(
        (species) => remaining * weights[species] / WEIGHT >= lengths.get(species) - ALLOC.get(species) - 1e-9
      );
      if (FULL.length) {
        for (const FULL_SPECIES of FULL) {
          const ROOM = lengths.get(FULL_SPECIES) - ALLOC.get(FULL_SPECIES);
          ALLOC.set(FULL_SPECIES, lengths.get(FULL_SPECIES));
          remaining -= ROOM;
        }
        active2 = active2.filter((species) => !FULL.includes(species));
        continue;
      }
      const SHARES = active2.map((species) => ({ species, exact: remaining * weights[species] / WEIGHT }));
      let given = 0;
      for (const SHARE of SHARES) {
        const BASE = Math.floor(SHARE.exact + 1e-9);
        ALLOC.set(SHARE.species, ALLOC.get(SHARE.species) + BASE);
        given += BASE;
        SHARE.rest = SHARE.exact - BASE;
      }
      SHARES.sort((a, b) => b.rest - a.rest || a.species - b.species);
      for (let i = 0; given < remaining && i < SHARES.length; i++, given++) {
        ALLOC.set(SHARES[i].species, ALLOC.get(SHARES[i].species) + 1);
      }
      remaining = 0;
    }
    for (const [SPECIES, LENGTH] of lengths) {
      WORKERS.set(SPECIES, LENGTH - ALLOC.get(SPECIES));
    }
    return WORKERS;
  }
  function resetWork(world) {
    world._piles = [];
    world._pileId = 0;
    world._pileRespawn = 0;
    world._workAssign = /* @__PURE__ */ new Map();
    world._swings = /* @__PURE__ */ new Map();
  }
  function assignWorkers(world, _config) {
    const WORKERS = world.units.filter((u) => world.isWorker(u) && u.hp > 0 && u.down <= 0 && u.mature), PREVIOUS = world._workAssign, ASSIGN = /* @__PURE__ */ new Map(), COUNTS = new Map(world.piles.map((pile) => [pile, 0]));
    if (!world.piles.length) {
      world._workAssign = ASSIGN;
      world._swings.clear();
      return;
    }
    const FREE = [];
    for (const UNIT3 of WORKERS) {
      const OLD = PREVIOUS.get(UNIT3.id);
      if (OLD && COUNTS.has(OLD.pile)) {
        ASSIGN.set(UNIT3.id, { pile: OLD.pile });
        COUNTS.set(OLD.pile, COUNTS.get(OLD.pile) + 1);
      } else {
        FREE.push(UNIT3);
      }
    }
    for (const UNIT3 of FREE) {
      let best = null, bestCount = Infinity, bestDistance = Infinity;
      for (const PILE of world.piles) {
        const COUNT = COUNTS.get(PILE), D = Math.hypot(UNIT3.x - PILE.x, UNIT3.y - PILE.y);
        if (COUNT < bestCount || COUNT === bestCount && D < bestDistance) {
          best = PILE;
          bestCount = COUNT;
          bestDistance = D;
        }
      }
      ASSIGN.set(UNIT3.id, { pile: best });
      COUNTS.set(best, bestCount + 1);
    }
    for (let guard = WORKERS.length; guard > 0; guard--) {
      let most = null, least = null;
      for (const PILE of world.piles) {
        most = !most || COUNTS.get(PILE) > COUNTS.get(most) ? PILE : most;
        least = !least || COUNTS.get(PILE) < COUNTS.get(least) ? PILE : least;
      }
      if (COUNTS.get(most) - COUNTS.get(least) <= 1) {
        break;
      }
      let mover = null, moverDistance = Infinity;
      for (const UNIT3 of WORKERS) {
        if (ASSIGN.get(UNIT3.id).pile !== most) {
          continue;
        }
        const D = Math.hypot(UNIT3.x - least.x, UNIT3.y - least.y);
        if (D < moverDistance) {
          mover = UNIT3;
          moverDistance = D;
        }
      }
      ASSIGN.set(mover.id, { pile: least });
      COUNTS.set(most, COUNTS.get(most) - 1);
      COUNTS.set(least, COUNTS.get(least) + 1);
    }
    world._workAssign = ASSIGN;
    for (const ID of [...world._swings.keys()]) {
      if (!ASSIGN.has(ID)) {
        world._swings.delete(ID);
      }
    }
  }
  function impact(world, config, pile) {
    pile.stack++;
    pile.hitRev++;
    const COMPLETE = pile.stack >= STACKS_PER_FOOD;
    world.emit("thresh", pile.x, pile.y, 0, { big: COMPLETE, duration: COMPLETE ? 0.9 : 0.55 });
    if (!COMPLETE) {
      return;
    }
    pile.stack = 0;
    pile.food--;
    world.foodTaps.revision++;
    world.foodTaps.produced++;
    const ANGLE = world.random() * Math.PI * 2, REACH = FOOD_DROP_MIN + world.random() * (FOOD_DROP_MAX - FOOD_DROP_MIN);
    world.spawnFood(pile.x + Math.cos(ANGLE) * REACH, pile.y + Math.sin(ANGLE) * REACH * 0.8, 1, {
      from: { x: pile.x, y: pile.y, z: 0.9 }
    });
    world.markProgressChanged();
    if (pile.food <= 0) {
      world.piles.splice(world.piles.indexOf(pile), 1);
      world.emit("landing-shockwave", pile.x, pile.y);
      assignWorkers(world, config);
    }
  }
  function workOrder(world, unit2) {
    const ASSIGN = world._workAssign.get(unit2.id);
    if (!ASSIGN) {
      return null;
    }
    const PILE = ASSIGN.pile, SWING = world._swings.get(unit2.id), DISTANCE = Math.hypot(unit2.x - PILE.x, unit2.y - PILE.y), ORDER = { x: PILE.x, y: PILE.y, fx: PILE.x, fy: PILE.y, speed: 9, hold: false, face: false };
    if (!SWING || SWING.phase === "idle") {
      ORDER.hold = DISTANCE <= NEAR_PILE;
      ORDER.face = ORDER.hold;
    } else if (SWING.phase === "fire") {
      ORDER.speed = CHARGE_SPEED;
    } else if (SWING.phase === "windup") {
      ORDER.hold = true;
      ORDER.face = true;
    } else {
      ORDER.hold = true;
    }
    return ORDER;
  }
  function pushOutOfPiles(world) {
    for (const PILE of world.piles) {
      const R2 = pileRadius(PILE);
      for (const UNIT3 of world.units) {
        const DX = UNIT3.x - PILE.x, DY = UNIT3.y - PILE.y, MIN = R2 + UNIT3.radius * 0.6, D = Math.hypot(DX, DY);
        if (D >= MIN) {
          continue;
        }
        const NX = D > 1e-6 ? DX / D : 1, NY = D > 1e-6 ? DY / D : 0;
        UNIT3.x = PILE.x + NX * MIN;
        UNIT3.y = PILE.y + NY * MIN;
        const INWARD = UNIT3.vx * NX + UNIT3.vy * NY;
        if (INWARD < 0) {
          UNIT3.vx -= NX * INWARD;
          UNIT3.vy -= NY * INWARD;
        }
      }
    }
  }
  function stepWork(world, config, dt) {
    const WORK = config.farm.work;
    pushOutOfPiles(world);
    if (world.piles.length < WORK.pileKind.count) {
      world._pileRespawn += dt;
      if (world.piles.length === 0 || world._pileRespawn >= WORK.pileRespawnSeconds) {
        spawnPile(world, config);
        world._pileRespawn = 0;
        assignWorkers(world, config);
      }
    }
    const FOOD_FULL = world.food.length >= WORK.maxFood;
    for (const [ID, ASSIGN] of world._workAssign) {
      if (!world.piles.includes(ASSIGN.pile)) {
        continue;
      }
      const UNIT3 = world._unitById.get(ID);
      if (!UNIT3 || UNIT3.hp <= 0) {
        world._swings.delete(ID);
        continue;
      }
      const PILE = ASSIGN.pile;
      let swing = world._swings.get(ID);
      if (!swing) {
        swing = { phase: "idle", elapsed: 0, wait: UNIT3.seed * 7 % 0.8 };
        world._swings.set(ID, swing);
      }
      const NEAR = Math.hypot(PILE.x - UNIT3.x, PILE.y - UNIT3.y) <= NEAR_PILE;
      if (swing.phase === "idle") {
        if (!NEAR) {
          continue;
        }
        swing.wait -= dt;
        if (swing.wait <= 0 && !FOOD_FULL) {
          swing.phase = "windup";
          swing.elapsed = 0;
        }
        continue;
      }
      swing.elapsed += dt;
      if (swing.phase === "windup" && swing.elapsed >= SWING_WINDUP) {
        swing.phase = "fire";
        swing.elapsed = 0;
      } else if (swing.phase === "fire") {
        const DX = UNIT3.x - PILE.x, DY = UNIT3.y - PILE.y, D = Math.hypot(DX, DY);
        if (D <= pileRadius(PILE) + UNIT3.radius * 0.6 + 0.12) {
          impact(world, config, PILE);
          const NX = D > 1e-6 ? DX / D : 1, NY = D > 1e-6 ? DY / D : 0;
          UNIT3.vx = NX * RECOIL_SPEED;
          UNIT3.vy = NY * RECOIL_SPEED;
          swing.phase = "recover";
          swing.elapsed = 0;
        } else if (swing.elapsed >= CHARGE_TIMEOUT) {
          swing.phase = "recover";
          swing.elapsed = 0;
        }
      } else if (swing.phase === "recover" && swing.elapsed >= SWING_RECOVER) {
        const RATE = world._workerRates.get(ID) || 0.1, INTERVAL = 1 / (RATE * STACKS_PER_FOOD);
        swing.phase = "idle";
        swing.elapsed = 0;
        swing.wait = Math.max(0, INTERVAL - SWING_WINDUP - SWING_RECOVER - 0.5);
      }
    }
  }
  var SWING_WINDUP, SWING_RECOVER, FOOD_DROP_MIN, FOOD_DROP_MAX, NEAR_PILE, CHARGE_SPEED, CHARGE_TIMEOUT, RECOIL_SPEED, STACKS_PER_FOOD;
  var init_farm_work = __esm({
    "src/farm-work.js"() {
      SWING_WINDUP = 0.28;
      SWING_RECOVER = 0.36;
      FOOD_DROP_MIN = 1.5;
      FOOD_DROP_MAX = 3.5;
      NEAR_PILE = 4.4;
      CHARGE_SPEED = 18;
      CHARGE_TIMEOUT = 1.6;
      RECOIL_SPEED = 5.5;
      STACKS_PER_FOOD = 5;
    }
  });

  // src/unit-grades.js
  function mergeMaterialCostForTier(resultTier) {
    if (!Number.isInteger(resultTier) || resultTier < 2 || resultTier > MAX_UNIT_TIER) {
      return 0;
    }
    return UNIT_GRADES[resultTier - 1].materialCost;
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
          // The colours of the floating hands a boss of this species swings: fill and outline.
          limbFill: "#83ad47",
          limbOutline: "#4a1c16",
          bossWeight: 1
        }),
        Object.freeze({
          id: 1,
          name: "옥수수",
          asset: "corn-kernel.svg",
          // The colours of the floating hands a boss of this species swings: fill and outline.
          limbFill: "#f7cd36",
          limbOutline: "#4a1c16",
          bossWeight: 1
        }),
        Object.freeze({
          id: 2,
          name: "팥",
          asset: "kidney-bean.svg",
          // The colours of the floating hands a boss of this species swings: fill and outline.
          limbFill: "#d06a8f",
          limbOutline: "#4b1a20",
          bossWeight: 1
        }),
        Object.freeze({
          id: 3,
          name: "밤톨",
          asset: "chestnut.svg",
          // The colours of the floating hands a boss of this species swings: fill and outline.
          limbFill: "#84472f",
          limbOutline: "#2c201c",
          bossWeight: 1
        }),
        Object.freeze({
          id: 4,
          name: "땅콩",
          asset: "peanut.svg",
          // The colours of the floating hands a boss of this species swings: fill and outline.
          limbFill: "#c89d67",
          limbOutline: "#3b241e",
          bossWeight: 1
        }),
        Object.freeze({
          id: 5,
          name: "호두",
          asset: "walnut.svg",
          // The colours of the floating hands a boss of this species swings: fill and outline.
          limbFill: "#a96c18",
          limbOutline: "#431811",
          // The weapon this species' boss holds: it goes wherever that floating hand goes.
          heldItem: Object.freeze({ part: "hammer", hand: "arm-right" }),
          bossWeight: 1
        }),
        Object.freeze({
          id: 6,
          name: "쌀",
          asset: "rice.svg",
          // The colours of the floating hands a boss of this species swings: fill and outline.
          limbFill: "#f3efe4",
          limbOutline: "#4b211b",
          // The weapon this species' boss holds: it goes wherever that floating hand goes.
          heldItem: Object.freeze({ part: "sickle", hand: "arm-right" }),
          bossWeight: 1
        }),
        Object.freeze({
          id: 7,
          name: "밀",
          asset: "wheat.svg",
          // The colours of the floating hands a boss of this species swings: fill and outline.
          limbFill: "#e4b247",
          limbOutline: "#34271f",
          // The weapon this species' boss holds: it goes wherever that floating hand goes.
          heldItem: Object.freeze({ part: "command-baton", hand: "arm-right" }),
          bossWeight: 1
        }),
        Object.freeze({
          id: 8,
          name: "보리",
          asset: "barley.svg",
          // The colours of the floating hands a boss of this species swings: fill and outline.
          limbFill: "#ddaa43",
          limbOutline: "#4b211b",
          bossWeight: 1
        })
      ]);
      SPECIES_COUNT = SPECIES_CATALOG.length;
      BOSS_SPECIES_WEIGHTS = Object.freeze(SPECIES_CATALOG.map((species) => species.bossWeight));
    }
  });

  // src/unit-stats.js
  function withRunMods(stats) {
    const OUT = { ...stats };
    for (const [STAT, MOD] of Object.entries(RUN_MODS)) {
      if (STAT !== "regen") {
        OUT[STAT] = (OUT[STAT] + MOD.flat) * (1 + MOD.pct);
      }
    }
    OUT.maxHp = Math.round(OUT.maxHp);
    if (RUN_MODS.regen) {
      OUT.regen += RUN_MODS.regen.flat + OUT.maxHp * RUN_MODS.regen.pct;
    }
    return OUT;
  }
  function createBaseStats(tier, speciesProfile) {
    let maxHp = TIER_HP;
    let attackPower = TIER_ATTACK;
    for (let resultTier = 2; resultTier <= tier; resultTier++) {
      const TRANSITION_MULTIPLIER = UNIT_GRADES[resultTier - 1].materialCost / 2;
      maxHp *= TIER_HP_SCALE * TRANSITION_MULTIPLIER;
      attackPower *= TIER_ATTACK_SCALE * TRANSITION_MULTIPLIER;
    }
    return Object.freeze(
      withRunMods({
        maxHp,
        attackPower,
        ...COMMON_UNIT_STAT_DEFAULTS,
        ...speciesProfile
      })
    );
  }
  function fillBaseStats() {
    BASE_STATS_BY_PROFILE.clear();
    for (const PROFILE of [COMMON_UNIT_STAT_DEFAULTS, ...COMMON_UNIT_STAT_PROFILES]) {
      BASE_STATS_BY_PROFILE.set(
        PROFILE,
        Array.from(
          {
            length: MAX_UNIT_TIER
          },
          (_, index) => createBaseStats(index + 1, PROFILE)
        )
      );
    }
  }
  function setRunStatMods(mods) {
    for (const STAT of Object.keys(RUN_MODS)) {
      delete RUN_MODS[STAT];
    }
    Object.assign(RUN_MODS, mods);
    fillBaseStats();
  }
  function baseUnitStatsFor(tier, species) {
    tier = Math.max(1, Math.min(MAX_UNIT_TIER, Number.isInteger(tier) ? tier : 1));
    const PROFILE = COMMON_UNIT_STAT_PROFILES[species] || COMMON_UNIT_STAT_DEFAULTS;
    return BASE_STATS_BY_PROFILE.get(PROFILE)?.[tier - 1] || createBaseStats(tier, PROFILE);
  }
  function resolveUnitStats(unit2, overrides) {
    const BASE = baseUnitStatsFor(unit2?.tier, unit2?.species), MULTIPLIER = Number.isFinite(unit2?.permanentStatMultiplier) ? Math.max(0, unit2.permanentStatMultiplier) : 1;
    return {
      ...BASE,
      maxHp: BASE.maxHp * MULTIPLIER,
      attackPower: BASE.attackPower * MULTIPLIER,
      ...unit2?.isFormationClone ? { maxHp: 1 } : {},
      ...overrides
    };
  }
  function combatStats(unit2, overrides) {
    return overrides === void 0 && !unit2?.isFormationClone ? baseUnitStatsFor(unit2?.tier, unit2?.species) : resolveUnitStats(unit2, overrides);
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
  function scaleMoveSpeed(baseSpeed, unit2, overrides) {
    return Math.max(0, Number.isFinite(baseSpeed) ? baseSpeed : 0) * Math.max(0, combatStats(unit2, overrides).moveSpeed);
  }
  function scaleAttackRecovery(baseRecovery, unit2, overrides) {
    return Math.max(0, Number.isFinite(baseRecovery) ? baseRecovery : 0) / Math.max(0.05, combatStats(unit2, overrides).attackSpeed);
  }
  function scaleAttackArea(baseArea, unit2, overrides) {
    return Math.max(0, Number.isFinite(baseArea) ? baseArea : 0) * Math.max(0, combatStats(unit2, overrides).attackArea);
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
  var TIER_HP, TIER_HP_SCALE, TIER_ATTACK, TIER_ATTACK_SCALE, ARMOR_SCALE, COMMON_UNIT_STAT_DEFAULTS, COMMON_UNIT_STAT_PROFILES, RUN_MODS, BASE_STATS_BY_PROFILE;
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
      RUN_MODS = {};
      BASE_STATS_BY_PROFILE = /* @__PURE__ */ new Map();
      fillBaseStats();
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
        const FAIL3 = (message) => {
          throw new Error(`Vector socket contract (${label}): ${message}`);
        };
        if (!Array.isArray(viewBox) || viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0 || viewBox[3] <= 0) {
          FAIL3("a finite SVG viewBox is required");
        }
        const PARTS = new Map((metadata?.parts || []).map((part) => [part.id, part]));
        const ANCHORS = {};
        for (const NAME of ["mouth", "ground"]) {
          const SOCKET = metadata?.sockets?.[NAME];
          if (!SOCKET || !PARTS.has(SOCKET.part)) {
            FAIL3(`${NAME} must name an authored part`);
          }
          if (!Array.isArray(SOCKET.point) || SOCKET.point.length !== 2 || !SOCKET.point.every(Number.isFinite)) {
            FAIL3(`${NAME} must contain two finite canvas coordinates`);
          }
          const [X, Y] = SOCKET.point;
          if (X < viewBox[0] || X > viewBox[0] + viewBox[2] || Y < viewBox[1] || Y > viewBox[1] + viewBox[3]) {
            FAIL3(`${NAME} lies outside the SVG canvas`);
          }
          ANCHORS[NAME] = Object.freeze({
            part: SOCKET.part,
            x: X,
            y: Y
          });
        }
        if (ANCHORS.ground.part !== "body") {
          FAIL3("ground must belong to body");
        }
        if (ANCHORS.mouth.y >= ANCHORS.ground.y) {
          FAIL3("mouth must be above the authored ground baseline");
        }
        return Object.freeze(ANCHORS);
      }
      var BOSS_VECTOR_DIAMETER = 220;
      var BOSS_VECTOR_RADIUS_SCALE = 1.16;
      var WORLD_HEIGHT_PROJECTION6 = 0.785;
      var WORLD_DEPTH_PROJECTION5 = 0.62;
      var BOSS_ART_RADIUS2 = 4.4;
      function bossVectorScale4() {
        return 2 * BOSS_ART_RADIUS2 * BOSS_VECTOR_RADIUS_SCALE / BOSS_VECTOR_DIAMETER;
      }
      function socketWorldPoint2(boss, socket, ground) {
        const SCALE = bossVectorScale4();
        return {
          x: boss.x + (socket.x - ground.x) * SCALE,
          y: boss.y,
          z: (boss.z || 0) + (ground.y - socket.y) * SCALE / WORLD_HEIGHT_PROJECTION6
        };
      }
      module.exports = {
        readVectorSockets: readVectorSockets3,
        BOSS_ART_RADIUS: BOSS_ART_RADIUS2,
        bossVectorScale: bossVectorScale4,
        socketWorldPoint: socketWorldPoint2,
        WORLD_HEIGHT_PROJECTION: WORLD_HEIGHT_PROJECTION6,
        WORLD_DEPTH_PROJECTION: WORLD_DEPTH_PROJECTION5
      };
    }
  });

  // src/features/unit-body/definition.cjs
  var require_definition = __commonJS({
    "src/features/unit-body/definition.cjs"(exports, module) {
      "use strict";
      var { WORLD_HEIGHT_PROJECTION: WORLD_HEIGHT_PROJECTION6, bossVectorScale: BOSS_VECTOR_SCALE } = require_vector_sockets();
      var AUTHORED_BODIES = [
        {
          species: 0,
          asset: "assets/troops/pea.svg",
          shapeId: "body-outline",
          sourceSha256: "4d4d6311b69aafb79bf271deea9c0898a2de81c46137503df23041ea843b0365",
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
          sourceSha256: "ffa82f15e14bef8e9d450a5f105bb66d66cbe18022c948c8a27740eaaf065790",
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
          sourceSha256: "201e77f6097da10d06b5aea94437b146a213e59a50cf3b81ddc57fe3157f713e",
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
          sourceSha256: "a35483cf970c33886b311346d2032df16275cb7382d80f91581b35bb36248ee1",
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
          sourceSha256: "79c2dc3bdb2f576662fd620b8b1be8795a33399fdfe42e527e8e8eeaae782c84",
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
          sourceSha256: "6f3f16d7548daa981439764dd2646817349dfd644f6d8e8f4beb1defe9342c57",
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
          sourceSha256: "5aef9bd138b053edc1f87908dffb623139d981c401aa21e6b59e401edd484de2",
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
          sourceSha256: "4bcb07c0d461f030e9fb54d0709cc162d3ef33514f21b5c691574fecf6628697",
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
          sourceSha256: "b91f433fd962b33dca843436712f12658565a0818161442f9674ffdc8ea3fb8d",
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
      function unitVisualSize2(unit2) {
        const MATURE = unit2.growthElapsed >= unit2.growthDuration - 1e-9, GROWTH = MATURE || !(unit2.growthDuration > 0) ? 1 : Math.max(0, Math.min(1, unit2.growthElapsed / unit2.growthDuration));
        return (UNIT_BODY_CONFIG.baseSize + UNIT_BODY_CONFIG.sizePerTier * unit2.tier) * (UNIT_BODY_CONFIG.birthScale + (1 - UNIT_BODY_CONFIG.birthScale) * GROWTH);
      }
      function unitVectorScale2(unit2) {
        const BODY2 = unitBodyDefinition3(unit2.species);
        return unitVisualSize2(unit2) * 2 * UNIT_BODY_CONFIG.vectorRadiusScale / Math.max(BODY2.viewBox[2], BODY2.viewBox[3]);
      }
      function bodyRadiusAtScale(body, scale) {
        return Math.max(body.ground.x - body.bounds.left, body.bounds.right - body.ground.x) * scale;
      }
      function unitBodyRadius3(unit2) {
        return bodyRadiusAtScale(unitBodyDefinition3(unit2.species), unitVectorScale2(unit2));
      }
      function unitBodyHeight2(unit2) {
        const BODY2 = unitBodyDefinition3(unit2.species);
        return (BODY2.ground.y - BODY2.bounds.top) * unitVectorScale2(unit2) / WORLD_HEIGHT_PROJECTION6;
      }
      function bossBodyHeight2(boss) {
        const BODY2 = unitBodyDefinition3(boss.species);
        return (BODY2.ground.y - BODY2.bounds.top) * BOSS_VECTOR_SCALE() / WORLD_HEIGHT_PROJECTION6;
      }
      function bossBodyRadius2(boss) {
        return bodyRadiusAtScale(unitBodyDefinition3(boss.species), BOSS_VECTOR_SCALE());
      }
      function unitTorsoHeight2(unit2) {
        const BODY2 = unitBodyDefinition3(unit2.species);
        return (BODY2.bounds.bottom - BODY2.bounds.top) * unitVectorScale2(unit2) / WORLD_HEIGHT_PROJECTION6;
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
        bossBodyHeight: bossBodyHeight2,
        bossBodyRadius: bossBodyRadius2,
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
          const CANDIDATES = owner.allies().filter((unit2) => unit2.giantUntil <= owner.world.time);
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
          const ORIGINALS = owner.allies().filter((unit2) => !unit2.isBattleOnlySummon), RADIUS = this.power(slot.level, T1_DIAMETER * this.definition.upgradeBase);
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
  var HAMMER_IMPACT_TIME, HammerSkill;
  var init_model7 = __esm({
    "src/features/formation-skills/hammer/model.js"() {
      init_definition7();
      init_model_base();
      HAMMER_IMPACT_TIME = 0.55;
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
            targetId: owner.targetId(TARGET),
            damage: this.power(slot.level, this.definition.upgradeBase),
            impacted: false,
            duration: 1.2
          });
          return true;
        }
        update(owner, effect, dt) {
          effect.age += dt;
          const TARGET = owner.target(effect.targetId);
          if (TARGET && !effect.impacted) {
            const BODY2 = targetBodyDimensions(TARGET);
            effect.x = TARGET.x;
            effect.y = TARGET.y;
            effect.z = BODY2.z;
            effect.bodyHeight = BODY2.bodyHeight;
            effect.bodyRadius = BODY2.bodyRadius;
          }
          if (!effect.impacted && effect.age + 1e-9 >= HAMMER_IMPACT_TIME) {
            effect.impacted = true;
            if (TARGET) {
              owner.damage(TARGET, effect.damage);
              TARGET.stun = Math.max(TARGET.stun || 0, 1);
            }
          }
          return effect.age < effect.duration;
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
        trackHealth(unit2) {
          const MAX_HP = unit2.isFormationClone ? 1 : baseUnitStatsFor(unit2.tier, unit2.species).maxHp;
          if (unit2.faction === "player" && unit2.hp > 0 && unit2.hp < MAX_HP) {
            this.injured.add(unit2);
          } else {
            this.injured.delete(unit2);
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
          return this.world.farmBossEvent?.phase === "fighting";
        }
        synchronize() {
          if (this.active && !this.runtime.active) {
            const SERIAL = this.runtime.serial;
            this.world.formationRuntime = createFormationRuntime();
            this.runtime.serial = SERIAL;
            this.rebuildInjured();
            this.runtime.active = true;
            for (const [ID, LEVEL] of this.world.tower.active ? this.world.tower.relics : []) {
              this.slots.push({ id: ID, ownerId: "", level: LEVEL, charge: 0, cooldown: 0 });
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
          this.world.unitCollection.removeWhere((unit2) => unit2.isFormationClone, { markProgress: false });
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
          return [...this.members].filter((unit2) => unit2.faction === "player" && unit2.hp > 0);
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
          target.flash = 0.3;
          const IS_BOSS = target === this.world.boss, MAX = Math.max(1, target.maxHp || target.hp || 1), STRENGTH = Math.min(3, 1 + amount / MAX * 8);
          this.world.combat(IS_BOSS ? "boss-hit" : "unit-hit", {
            unit: IS_BOSS ? 0 : target.id,
            ownerId: 0,
            species: 0,
            sourceUnit: 0,
            attackId: 0,
            strikeIndex: 0,
            attackKind: "skill",
            buffed: false,
            critical: false,
            damage: amount,
            x: target.x,
            y: target.y,
            z: Math.max(0.2, (target.z || 0) + (target.height || 0.6) * 0.6),
            nx: 0,
            ny: 1,
            strength: STRENGTH
          });
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
            (unit2) => unit2.faction === "enemy" && unit2.hp > 0 && unit2.z <= 0.5 && Math.hypot(unit2.x - x, unit2.y - y) <= unit2.radius + 0.12
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
  function seedProjectileDimensions(unit2) {
    const HEIGHT = unit2.bodyHeight * FEATURE.bodyHeightFraction, RADII = seedEllipseRadii({ height: HEIGHT });
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
          this.residentCountsBySpecies = /* @__PURE__ */ new Map();
          this.residentIdsBySpecies = /* @__PURE__ */ new Map();
          this.residentCount = 0;
          this.revision = 0;
          this.subscriptions = /* @__PURE__ */ new Map();
          this.reservations = /* @__PURE__ */ new Map();
          this.retiredDuringStep = [];
          this.onAdded = new Signal(notifications);
          this.onRemoved = new Signal(notifications);
          this.onReplaced = new Signal(notifications);
          this.onReset = new Signal(notifications);
          this.onHealthChanged = new Signal(notifications, true);
        }
        has(unit2) {
          return this.items.includes(unit2);
        }
        unitById(id) {
          return this.byId.get(id) || null;
        }
        _rebuildIndexes() {
          this.revision++;
          this.byId.clear();
          this.residentCountsBySpecies.clear();
          this.residentIdsBySpecies.clear();
          this.residentCount = 0;
          for (const UNIT3 of this.items) {
            this._indexUnit(UNIT3);
          }
          this.world._syncOwnedSpeciesCounts?.();
        }
        refreshIndexes() {
          this._rebuildIndexes();
        }
        _indexUnit(unit2) {
          this.revision++;
          this.byId.set(unit2.id, unit2);
          if (this.isResident(unit2)) {
            this.residentCount++;
            this.residentCountsBySpecies.set(unit2.species, (this.residentCountsBySpecies.get(unit2.species) || 0) + 1);
            let ids = this.residentIdsBySpecies.get(unit2.species);
            if (!ids) {
              ids = /* @__PURE__ */ new Set();
              this.residentIdsBySpecies.set(unit2.species, ids);
            }
            ids.add(unit2.id);
          }
        }
        _unindexUnit(unit2) {
          this.revision++;
          this.byId.delete(unit2.id);
          if (this.isResident(unit2)) {
            this.residentCount = Math.max(0, this.residentCount - 1);
            const COUNT = (this.residentCountsBySpecies.get(unit2.species) || 0) - 1;
            if (COUNT > 0) {
              this.residentCountsBySpecies.set(unit2.species, COUNT);
            } else {
              this.residentCountsBySpecies.delete(unit2.species);
            }
            const IDS = this.residentIdsBySpecies.get(unit2.species);
            IDS?.delete(unit2.id);
            if (IDS?.size === 0) {
              this.residentIdsBySpecies.delete(unit2.species);
            }
          }
          this.world._syncOwnedSpeciesCounts?.();
        }
        // Puts the farm's residents in the given order; everything else keeps its place.
        reorder(orderedIds) {
          const RESIDENTS = this.items.filter((unit2) => this.isResident(unit2));
          if (!Array.isArray(orderedIds) || orderedIds.length !== RESIDENTS.length || new Set(orderedIds).size !== orderedIds.length || orderedIds.some((id) => !this.isResident(this.byId.get(id)))) {
            return false;
          }
          const ORDERED = orderedIds.map((id) => this.byId.get(id));
          let index = 0;
          this.items = this.items.map((unit2) => this.isResident(unit2) ? ORDERED[index++] : unit2);
          this._rebuildIndexes();
          this.world._unitSpatialDirty = true;
          return true;
        }
        isResident(unit2) {
          return !!(unit2 && unit2.faction === "player" && unit2.isBattleOnlySummon !== true && unit2.isFormationClone !== true && unit2.countsTowardPermanentRoster !== false);
        }
        reservationOwner(unitOrId) {
          return this.reservations.get(typeof unitOrId === "object" ? unitOrId?.id : unitOrId) || null;
        }
        reserve(owner, units, { replaceOwners = [] } = {}) {
          if (typeof owner !== "string" || !owner || !Array.isArray(units) || units.length < 2 || !Array.isArray(replaceOwners)) {
            return false;
          }
          const IDS = /* @__PURE__ */ new Set(), ALLOWED_OWNERS = new Set(replaceOwners), REPLACED_OWNERS = /* @__PURE__ */ new Set();
          if (units.some((unit2) => {
            if (!this.has(unit2) || IDS.has(unit2.id)) {
              return true;
            }
            const CURRENT_OWNER = this.reservationOwner(unit2.id);
            if (CURRENT_OWNER && CURRENT_OWNER !== owner) {
              if (!ALLOWED_OWNERS.has(CURRENT_OWNER)) {
                return true;
              }
              REPLACED_OWNERS.add(CURRENT_OWNER);
            }
            IDS.add(unit2.id);
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
        attach(unit2) {
          Object.defineProperty(unit2, "_world", {
            value: this.world,
            writable: true,
            configurable: true
          });
          for (const SIGNAL of [unit2.onDied, unit2.onRevived, unit2.onHealthChanged]) {
            SIGNAL.scope = this.world.mutationNotifications;
            SIGNAL.immediate = true;
          }
          const OFF_DIED = unit2.onDied.on(() => {
            if (this.has(unit2)) {
              this.world.processUnitDeath(unit2);
            }
          }), OFF_REVIVED = unit2.onRevived.on(() => {
            if (this.has(unit2)) {
              this.world.processUnitRevival(unit2);
            }
          });
          const OFF_HEALTH = unit2.onHealthChanged.on((event) => {
            if (this.has(unit2)) {
              this.world._syncUnitAliveCount(unit2);
              this.onHealthChanged.emit(event);
            }
          });
          this.subscriptions.set(unit2, [OFF_DIED, OFF_REVIVED, OFF_HEALTH]);
        }
        retire(unit2, options, preserveMergeTask = null) {
          this.world.releaseMate(unit2);
          for (const TASK of [...this.world.mergeTasks]) {
            if (TASK !== preserveMergeTask && (TASK.materialIds?.includes(unit2.id) || TASK.resultId === unit2.id)) {
              this.world.cancelMergeTask(TASK);
            }
          }
          this.releaseUnitReservation(unit2.id);
          for (const OFF of this.subscriptions.get(unit2) || []) {
            OFF();
          }
          this.subscriptions.delete(unit2);
          this.world._trackUnitRemoved(unit2, options);
          unit2.dispose();
          if (this.world._spatialStepActive) {
            this.retiredDuringStep.push(unit2);
          } else {
            this.releaseReferences(unit2);
            this.clearBorrowedReferences();
          }
        }
        releaseReferences(unit2) {
          this.world.unitSpatial.remove(unit2);
          this.world._unitStepOrder.delete(unit2);
          this.world._unitAliveState.delete(unit2);
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
        add(unit2, { markProgress = true } = {}) {
          if (!(unit2 instanceof this.unitType) || this.items.some((owned) => owned === unit2 || owned.id === unit2.id)) {
            return false;
          }
          this.world._beginSpatialQueryBatch();
          try {
            unit2.spawnedAtSimulationTick = this.world.simulationTick;
            this.items.push(unit2);
            this._indexUnit(unit2);
            this.attach(unit2);
            this.world._trackUnitAdded(unit2);
          } finally {
            this.world._endSpatialQueryBatch();
          }
          this.world._markMergeAvailabilityChanged();
          this.publishChange(this.onAdded, { unitId: unit2.id }, markProgress && !unit2.isBattleOnlySummon);
          return true;
        }
        remove(unit2, { markProgress = true, ...options } = {}) {
          if (!this.has(unit2)) {
            return false;
          }
          const REMAINING = this.items.filter((owned) => owned !== unit2);
          this.world._beginSpatialQueryBatch();
          try {
            this.retire(unit2, options);
            this._unindexUnit(unit2);
            this.items = REMAINING;
          } finally {
            this.world._endSpatialQueryBatch();
          }
          this.world._markMergeAvailabilityChanged();
          this.publishChange(this.onRemoved, { unitId: unit2.id }, markProgress && !unit2.isBattleOnlySummon);
          return true;
        }
        replace(materials, result, complete, preserveMergeTask = null) {
          const CONSUMED = new Set(materials);
          if (CONSUMED.size < 2 || CONSUMED.size !== materials.length || !materials.every((unit2) => this.has(unit2)) || !(result instanceof this.unitType) || this.items.some((unit2) => unit2 === result || unit2.id === result.id)) {
            return false;
          }
          const REMAINING = this.items.filter((unit2) => !CONSUMED.has(unit2));
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
            { materialIds: materials.map((unit2) => unit2.id), resultId: result.id },
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
          this.onReset.emit({ unitIds: NEXT.map((unit2) => unit2.id) });
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

  // src/farm-roster.js
  function isResident(unit2) {
    return !!unit2 && unit2.faction === "player" && unit2.isBattleOnlySummon !== true && unit2.isFormationClone !== true && unit2.countsTowardPermanentRoster !== false;
  }
  var FarmingRoster;
  var init_farm_roster = __esm({
    "src/farm-roster.js"() {
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
          return this.collection.items.find((unit2) => isResident(unit2) && unit2.id === id) || null;
        }
        ownedPopulation() {
          return this.collection.residentCount;
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
        advanceDownedUnit(world, unit2, dt) {
          const ADVANCED2 = this.advanceRest(world, unit2, dt);
          this.restoreUnit(world, unit2);
          return ADVANCED2;
        }
        advanceDownedPhysics(world, unit2, dt) {
          const OLD_Z = unit2.z;
          unit2.integrate(dt);
          this.afterDownedIntegration(world, unit2);
          if (OLD_Z > 0 && unit2.z === 0) {
            world.metrics.landings++;
            this.landUnit(world, unit2);
          }
          world.updateUnitSpatial(unit2);
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
        unitId(unit2, _index) {
          return unit2.farmId || unit2.id;
        }
        enterUnit(_world, unit2, _index) {
          unit2.id = unit2.farmId || unit2.id;
          unit2.ownerId = "";
          unit2.farmId = 0;
          unit2.dropLanded = true;
          Object.assign(unit2, unit2.home);
        }
        setupRoster(_world) {
        }
        advanceRest(world, unit2, dt) {
          if (world.tower.active) {
            return true;
          }
          unit2.down = Math.max(0, unit2.down - dt);
          if (unit2.down < 1e-9) {
            unit2.down = 0;
          }
          return true;
        }
        restoreUnit(world, unit2) {
          const { STATS: STATS2 } = this.dependencies;
          if (unit2.down !== 0) {
            return;
          }
          const MAX_HP = STATS2(unit2.tier, unit2.species).maxHp;
          world.releaseMate(unit2);
          unit2.revive(MAX_HP);
        }
        landUnit(world, unit2) {
          if (Math.hypot(unit2.vx, unit2.vy) > 1) {
            world.emit("land", unit2.x, unit2.y);
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
        [new FarmSimulationScene(DEPENDENCIES)].map((scene) => [scene.feature.id, Object.freeze(scene)])
      )
    );
  }
  var init_simulation_scenes = __esm({
    "src/simulation-scenes.js"() {
      init_model10();
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
          description: "적 공격으로 강제 이동이 끝나면 2초 동안 이동 속도가 증가해요.",
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
  var init_definition12 = __esm({
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
  var init_definition13 = __esm({
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
  var init_definition14 = __esm({
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
  var init_definition15 = __esm({
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
      init_definition12();
      init_definition13();
      init_definition14();
      init_definition15();
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
  function masteryXpForNextLevel(level) {
    if (!Number.isSafeInteger(level) || level < 1) {
      throw new RangeError("mastery level must be a positive integer");
    }
    return MASTERY_FIRST_LEVEL_XP * MASTERY_LEVEL_XP_MULTIPLIER ** (level - 1);
  }
  function investedPointsOf(investment) {
    return investment.powerLevel + Object.values(investment.branchLevels || {}).reduce((total, level) => total + level, 0);
  }
  function masteryPointsLeft(investment) {
    return investment.masteryLevel - 1 - investedPointsOf(investment);
  }
  function createAbilityProgressionState() {
    return {
      schemaVersion: ABILITY_TREE_SCHEMA_VERSION,
      abilities: Object.fromEntries(
        SPECIES_ABILITY_DEFINITIONS.map((definition) => [
          definition.id,
          {
            powerLevel: 0,
            ...definition.branches ? {
              branchLevels: Object.fromEntries(
                Object.keys(definition.branches).map((branchId) => [branchId, 0])
              )
            } : {},
            masteryLevel: 1,
            masteryXp: 0
          }
        ])
      )
    };
  }
  function isValidAbilityProgressionState(state) {
    if (!state || typeof state !== "object" || state.schemaVersion !== ABILITY_TREE_SCHEMA_VERSION) {
      return false;
    }
    if (!state.abilities || typeof state.abilities !== "object") {
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
      if (!Number.isSafeInteger(INVESTMENT.masteryLevel) || INVESTMENT.masteryLevel < 1 || !Number.isFinite(INVESTMENT.masteryXp) || INVESTMENT.masteryXp < 0 || INVESTMENT.masteryXp >= masteryXpForNextLevel(INVESTMENT.masteryLevel)) {
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
    if (SPECIES_ABILITY_DEFINITIONS.some((definition) => masteryPointsLeft(state.abilities[definition.id]) < 0)) {
      return false;
    }
    return Object.keys(state.abilities).every(
      (abilityId) => SPECIES_ABILITY_DEFINITIONS.some((definition) => definition.id === abilityId)
    );
  }
  function isNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }
  var ABILITY_TREE_SCHEMA_VERSION, MASTERY_FIRST_LEVEL_XP, MASTERY_LEVEL_XP_MULTIPLIER;
  var init_ability_state = __esm({
    "src/ability-state.js"() {
      init_ability_definitions();
      ABILITY_TREE_SCHEMA_VERSION = 3;
      MASTERY_FIRST_LEVEL_XP = 100;
      MASTERY_LEVEL_XP_MULTIPLIER = 1.2;
    }
  });

  // src/player-progression.js
  function createPlayerProgressionState() {
    return {
      ...createAbilityProgressionState(),
      towerBest: 0,
      processedBossKillReceipts: []
    };
  }
  function awardMasteryXp(state, receiptKey, species, xpAmount = BOSS_KILL_XP) {
    const REJECT = (reason) => ({
      state,
      awarded: false,
      reason,
      xpAwarded: 0,
      levelsGained: 0,
      pointsAwarded: 0
    });
    if (!isValidPlayerProgressionState(state)) {
      return REJECT("invalid-state");
    }
    if (typeof receiptKey !== "string" || receiptKey.trim().length === 0) {
      return REJECT("invalid-receipt");
    }
    if (!Number.isFinite(xpAmount) || xpAmount < 0 || xpAmount >= 1e13) {
      return REJECT("invalid-xp");
    }
    const DEFINITION13 = SPECIES_ABILITY_DEFINITIONS.find((definition) => definition.species === species);
    if (!DEFINITION13) {
      return REJECT("unknown-species");
    }
    if (state.processedBossKillReceipts.includes(receiptKey)) {
      return REJECT("duplicate-receipt");
    }
    const MASTERY = state.abilities[DEFINITION13.id];
    let level = MASTERY.masteryLevel;
    let experience = MASTERY.masteryXp + xpAmount;
    let levelsGained = 0;
    while (experience >= masteryXpForNextLevel(level)) {
      experience -= masteryXpForNextLevel(level);
      level += 1;
      levelsGained += 1;
    }
    const NEXT_STATE = {
      ...state,
      abilities: Object.fromEntries(
        Object.entries(state.abilities).map(([id, value]) => [
          id,
          id === DEFINITION13.id ? { ...value, masteryLevel: level, masteryXp: experience } : { ...value }
        ])
      ),
      // Only a retry of a recent kill needs the duplicate guard, so the list stays short.
      processedBossKillReceipts: [...state.processedBossKillReceipts, receiptKey].slice(-RECEIPT_MEMORY)
    };
    return {
      state: NEXT_STATE,
      awarded: true,
      reason: null,
      xpAwarded: xpAmount,
      levelsGained,
      pointsAwarded: levelsGained
    };
  }
  function formatXpForDisplay(experience) {
    const VALUE = Number.isFinite(experience) ? Math.max(0, experience) : 0;
    return new Intl.NumberFormat("ko-KR", {
      maximumFractionDigits: 1
    }).format(VALUE);
  }
  function isValidPlayerProgressionState(state) {
    return isValidAbilityProgressionState(state) && Number.isSafeInteger(state.towerBest) && state.towerBest >= 0 && state.towerBest <= FARM_BOSS_EVENT_MAX_STAGE && Array.isArray(state.processedBossKillReceipts) && state.processedBossKillReceipts.every((key) => typeof key === "string" && key.length > 0) && new Set(state.processedBossKillReceipts).size === state.processedBossKillReceipts.length;
  }
  var BOSS_KILL_XP, FARM_BOSS_EVENT_MAX_STAGE, RECEIPT_MEMORY;
  var init_player_progression = __esm({
    "src/player-progression.js"() {
      init_ability_state();
      init_ability_definitions();
      BOSS_KILL_XP = 20;
      FARM_BOSS_EVENT_MAX_STAGE = 61;
      RECEIPT_MEMORY = 500;
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
  function getAbilityPointsLeft(state, abilityId) {
    const INVESTMENT = abilityStateFor(state, abilityId);
    return INVESTMENT ? masteryPointsLeft(INVESTMENT) : 0;
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
    if (masteryPointsLeft(INVESTMENT) < ABILITY_POINT_COST) {
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
    if (TYPE === "all" || TYPE === "abilities") {
      for (const DEFINITION13 of SPECIES_ABILITY_DEFINITIONS) {
        if (TYPE === "all" || NORMALIZED_SCOPE.speciesId === void 0 || DEFINITION13.species === NORMALIZED_SCOPE.speciesId) {
          NEXT.abilities[DEFINITION13.id] = emptyAbilityInvestment(DEFINITION13, NEXT.abilities[DEFINITION13.id]);
        }
      }
    }
    return { ok: true, reason: null, refunded: CHECK.refunded, state: NEXT };
  }
  function progressionResetInvestment(state, scope) {
    switch (scope.type) {
      case "all":
        return getInvestedPointCount(state);
      case "abilities":
        return getInvestedAbilityPointCount(state, scope.speciesId ?? null);
      default:
        return 0;
    }
  }
  function normalizeResetScope(scope) {
    const NORMALIZED = typeof scope === "string" ? { type: scope } : scope;
    if (!NORMALIZED || typeof NORMALIZED !== "object" || Array.isArray(NORMALIZED)) {
      return null;
    }
    if (NORMALIZED.type === "all") {
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
      )
    };
  }
  function emptyAbilityInvestment(definition, previous) {
    return {
      masteryLevel: previous.masteryLevel,
      masteryXp: previous.masteryXp,
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
  var ABILITY_POINT_COST, DEFINITION_BY_ID;
  var init_ability_progression = __esm({
    "src/ability-progression.js"() {
      init_ability_definitions();
      init_ability_state();
      init_player_progression();
      ABILITY_POINT_COST = 1;
      DEFINITION_BY_ID = new Map(SPECIES_ABILITY_DEFINITIONS.map((definition) => [definition.id, definition]));
    }
  });

  // src/features/abilities/pea-recovery-boost/model.js
  var ABILITY_ID, PeaRecoveryBoostModel;
  var init_model11 = __esm({
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
  var init_model12 = __esm({
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
  var init_model13 = __esm({
    "src/features/abilities/chestnut-thorns/model.js"() {
      init_ability_progression();
      init_definition12();
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
  var init_model14 = __esm({
    "src/features/abilities/peanut-death-split/model.js"() {
      init_ability_progression();
      init_definition13();
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
        static descriptors({ unit: unit2, progression, inBattle = false } = {}) {
          if (!inBattle || !unit2 || unit2.hp > 0 || unit2.isBattleOnlySummon || unit2.canSplit === false || unit2.splitUsedThisBattle === true) {
            return [];
          }
          const CONFIG2 = this.config(progression, unit2.tier);
          if (!CONFIG2) {
            return [];
          }
          return Array.from({ length: CONFIG2.childCount }, () => ({
            species: unit2.species,
            tier: 1,
            isBattleOnlySummon: true,
            battleSummonKind: "peanut-death-split",
            battleSummonParentId: unit2.id,
            battleSummonParentGeneration: unit2.generation,
            ownerId: unit2.ownerId || "",
            farmId: unit2.farmId || 0,
            faction: unit2.faction,
            countsTowardPermanentRoster: false,
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
  var init_model15 = __esm({
    "src/features/abilities/walnut-raw-guard/model.js"() {
      init_ability_progression();
      init_definition14();
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
        static canStart(unit2, tick, config) {
          return !!(config && unit2?.hp > 0 && Number.isSafeInteger(tick) && tick >= (unit2.walnutNextGuardTick || 0) && !(unit2.walnutStoredRawDamage > 0));
        }
        static start(unit2, tick, config) {
          if (!this.canStart(unit2, tick, config)) {
            return false;
          }
          unit2.walnutNextGuardTick = tick + config.cooldownTicks;
          unit2.walnutGuardUntilTick = tick + config.durationTicks;
          return true;
        }
        static isGuarding(unit2, tick) {
          return !!(unit2?.hp > 0 && unit2.walnutGuardUntilTick > tick);
        }
        static armorBonus(unit2, tick, config) {
          return config && this.isGuarding(unit2, tick) ? config.armorBonus : 0;
        }
        static accumulate(unit2, rawDamage, tick, config) {
          if (!config || !this.isGuarding(unit2, tick) || !Number.isFinite(rawDamage) || rawDamage <= 0) {
            return false;
          }
          unit2.walnutStoredRawDamage = (unit2.walnutStoredRawDamage || 0) + rawDamage;
          return true;
        }
        static nextHammerBonus(unit2, attackPower, config) {
          if (!config || !Number.isFinite(unit2?.walnutStoredRawDamage) || unit2.walnutStoredRawDamage <= 0) {
            return 0;
          }
          return Math.min(
            unit2.walnutStoredRawDamage * config.rawDamageMultiplier,
            attackPower * config.maxBonusAttackMultiples
          );
        }
        static consume(unit2) {
          const CONSUMED = Number.isFinite(unit2?.walnutStoredRawDamage) && unit2.walnutStoredRawDamage > 0;
          if (unit2) {
            unit2.walnutStoredRawDamage = 0;
          }
          return CONSUMED;
        }
        static clear(unit2) {
          unit2.walnutGuardUntilTick = 0;
          unit2.walnutStoredRawDamage = 0;
        }
      };
    }
  });

  // src/features/abilities/corn-attachment/model.js
  var DEFINITION11, CornAttachmentModel;
  var init_model16 = __esm({
    "src/features/abilities/corn-attachment/model.js"() {
      init_ability_progression();
      init_definition15();
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
  var init_model17 = __esm({
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
  var FEATURE3;
  var init_definition16 = __esm({
    "src/features/unit-attacks/lob/definition.js"() {
      FEATURE3 = Object.freeze({ id: "lob", modelKey: "projectile" });
    }
  });

  // src/features/unit-attacks/dual-strike/definition.js
  var FEATURE4;
  var init_definition17 = __esm({
    "src/features/unit-attacks/dual-strike/definition.js"() {
      FEATURE4 = Object.freeze({ id: "peanut-dual-strike", modelKey: "repeatedStrike" });
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
      init_definition16();
      init_definition17();
      init_kidney_continuous_leap();
      init_definition12();
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
        1: attackProfile(FEATURE3.id, {
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
        4: attackProfile(FEATURE4.id, {
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
        1: COMPOSITION(FEATURE3.modelKey, ["cornAttachment"], {
          retreatWithinRange: true,
          aimAtCenter: true
        }),
        2: COMPOSITION("contact", [], { specialAbility: "kidneyLeap" }),
        3: COMPOSITION("contact", [], {
          contactRecoil: true,
          specialAbility: "chestnutThorns"
        }),
        4: COMPOSITION(FEATURE4.modelKey, ["deathSplit"], {
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
  var init_model18 = __esm({
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
        static refreshBuff(unit2, level, tick) {
          if (!unit2 || !Number.isSafeInteger(level) || level < 0 || level > 2 || !Number.isSafeInteger(tick) || tick < 0) {
            return false;
          }
          const BUFFS = Array.isArray(unit2.wheatCommandBuffs) ? unit2.wheatCommandBuffs.filter((buff) => buff.expiresAtTick > tick) : [];
          unit2.wheatCommandBuffs = BUFFS;
          const EXISTING = BUFFS.find((buff) => buff.level === level), EXPIRES_AT_TICK = tick + DEFINITION12.durationTicks;
          if (EXISTING) {
            EXISTING.expiresAtTick = Math.max(EXISTING.expiresAtTick, EXPIRES_AT_TICK);
          } else {
            BUFFS.push({ level, expiresAtTick: EXPIRES_AT_TICK });
            BUFFS.sort((a, b) => a.level - b.level);
          }
          unit2.ability?.syncAttackSpeedMultiplier?.(tick);
          return true;
        }
        static activeBuff(unit2, tick) {
          const BUFFS = Array.isArray(unit2?.wheatCommandBuffs) ? unit2.wheatCommandBuffs : [];
          let strongest = null;
          for (const BUFF of BUFFS) {
            if (BUFF.expiresAtTick > tick && (!strongest || BUFF.level > strongest.level)) {
              strongest = BUFF;
            }
          }
          return strongest;
        }
        static attackSpeedMultiplier(unit2, tick) {
          const ACTIVE = this.activeBuff(unit2, tick);
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
  var init_model19 = __esm({
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
        // Share of the shred lifetime the newest stack still has, 0 when nothing is shredded.
        static remaining(target, tick) {
          let latest = 0;
          for (const BUCKET of target?.barleyArmorShredBuckets || []) {
            latest = Math.max(latest, BUCKET.expiresAtTick - tick);
          }
          return Math.max(0, Math.min(1, latest / BARLEY_ARMOR_SHRED_BUCKETS));
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
  var DEFAULT_BODY, POP_RING, CornAttachmentPresentation;
  var init_presentation6 = __esm({
    "src/features/abilities/corn-attachment/presentation.js"() {
      DEFAULT_BODY = Object.freeze({ radius: 0.3, height: 1, scale: 1, shiftX: 0, shiftY: 0 });
      POP_RING = 0.5;
      CornAttachmentPresentation = class {
        label(_definition, value) {
          return `부착 1초 후 연쇄 폭발 · 알갱이마다 공격력 ${Math.round(value * 100)}%`;
        }
        title(value) {
          return `알갱이 ${Math.round(value * 100)}%`;
        }
        // Spreads the model's small offsets over the visible front of the target's body, so the kernels sit on it
        // (a boss is far bigger than the 0.18 the offsets were made for) and follow its hit recoil.
        anchor(attachment, group, body) {
          const SPREAD = body.radius / 0.18, FACE = body.radius * 0.55;
          return {
            x: group.targetX + attachment.offsetX * SPREAD + body.shiftX,
            y: group.targetY - FACE + body.shiftY,
            z: group.targetZ + body.height * (0.5 + attachment.offsetY / 0.12 * 0.3)
          };
        }
        // A waiting kernel breathes faster as its fuse runs out and turns hot at the end; a popping one flares and shrinks.
        drawAttachment(renderer, attachment, group, { tick, body = DEFAULT_BODY }) {
          const AT = this.anchor(attachment, group, body), P = renderer.project(AT.x, AT.y, AT.z), FUSE = Math.min(
            1,
            Math.max(0, (tick - group.firstAttachTick) / Math.max(1, group.closeAtTick - group.firstAttachTick))
          ), BASE = renderer.scale * 0.055 * body.scale;
          if (attachment.status === "fading") {
            const POP = 1 - attachment.fadeTicks / 6;
            renderer.ring(AT.x, AT.y, POP_RING * body.scale * POP, `rgba(255,214,102,${1 - POP})`, 0.06);
            renderer.ellipse(P.x, P.y, BASE * (1.8 - POP), BASE * (1.8 - POP), `rgba(255,246,200,${1 - POP})`);
            return;
          }
          const RATE = 4 + 14 * FUSE * FUSE, BREATH = 1 + 0.18 * Math.sin(renderer.displayTimeMs / 1e3 * RATE * Math.PI), HOT = FUSE > 0.7 ? (FUSE - 0.7) / 0.3 : 0, SIZE = BASE * BREATH;
          renderer.ellipse(
            P.x,
            P.y,
            SIZE,
            SIZE * 1.2,
            `rgba(${238 + 17 * HOT},${192 - 70 * HOT},${75 - 30 * HOT},1)`,
            attachment.angle
          );
          renderer.ellipse(P.x - SIZE * 0.2, P.y - SIZE * 0.35, SIZE * 0.2, SIZE * 0.25, "rgba(255,238,147,1)");
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
          return `잃은 체력 비율에 따라 치명타 확률 최대 +${Math.round(value * 100)}%p · 치명타 피해 ×${COMMON_UNIT_STAT_DEFAULTS.critMultiplier}`;
        }
        title(value) {
          return `치명타 최대 +${Math.round(value * 100)}%p`;
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

  // src/damage-numbers.js
  function formatDamage(amount) {
    const VALUE = Math.max(1, Math.round(amount));
    if (VALUE >= 1e6) {
      return `${(VALUE / 1e6).toFixed(VALUE < 1e7 ? 1 : 0)}M`;
    }
    if (VALUE >= 1e4) {
      return `${(VALUE / 1e3).toFixed(VALUE < 1e5 ? 1 : 0)}K`;
    }
    return String(VALUE);
  }
  function textWidth(text) {
    let width = 0;
    for (const CHAR of text) {
      width += ADVANCE[CHAR] ?? ADVANCE_DEFAULT;
    }
    return width - 0.2;
  }
  function drawGlyphText(renderer, text, x, y, height, fill, outline) {
    let cursor = x - textWidth(text) * height / 2;
    for (const CHAR of text) {
      for (const STROKE of GLYPHS[CHAR]) {
        const POINTS = STROKE.map(([gx, gy]) => ({ x: cursor + gx * height, y: y - gy * height }));
        for (const [WIDTH, COLOR] of [
          [OUTLINE_WIDTH, outline],
          [FILL_WIDTH, fill]
        ]) {
          for (let index = 1; index < POINTS.length; index++) {
            renderer.pixelLine(POINTS[index - 1], POINTS[index], height * WIDTH, COLOR);
          }
        }
      }
      cursor += (ADVANCE[CHAR] ?? ADVANCE_DEFAULT) * height;
    }
  }
  var DAMAGE_NUMBER, GLYPH_WIDTH, FLIP, SIX, GLYPHS, ADVANCE, ADVANCE_DEFAULT, STYLES, OUTLINE_WIDTH, FILL_WIDTH, DamageNumberPresentation;
  var init_damage_numbers = __esm({
    "src/damage-numbers.js"() {
      DAMAGE_NUMBER = Object.freeze({
        lifeMs: 800,
        // World units: the digit height of a normal hit and the factor a critical hit adds.
        height: 0.7,
        criticalScale: 1.7,
        rise: 1.1,
        // How far apart simultaneous numbers drift, so a volley stays readable.
        spread: 0.09,
        popFraction: 0.14,
        fadeFraction: 0.35
      });
      GLYPH_WIDTH = 0.6;
      FLIP = (strokes) => strokes.map((stroke2) => stroke2.map(([x, y]) => [GLYPH_WIDTH - x, 1 - y]));
      SIX = [
        [
          [0.5, 1],
          [0.15, 0.85],
          [0, 0.5],
          [0, 0.2],
          [0.2, 0],
          [0.45, 0],
          [0.6, 0.2],
          [0.6, 0.4],
          [0.4, 0.55],
          [0.15, 0.5],
          [0, 0.35]
        ]
      ];
      GLYPHS = Object.freeze({
        0: [
          [
            [0, 0.2],
            [0.1, 0.05],
            [0.3, 0],
            [0.5, 0.05],
            [0.6, 0.2],
            [0.6, 0.8],
            [0.5, 0.95],
            [0.3, 1],
            [0.1, 0.95],
            [0, 0.8],
            [0, 0.2]
          ]
        ],
        1: [
          [
            [0.1, 0.8],
            [0.32, 1],
            [0.32, 0]
          ]
        ],
        2: [
          [
            [0, 0.8],
            [0.1, 0.95],
            [0.3, 1],
            [0.5, 0.95],
            [0.6, 0.8],
            [0.55, 0.6],
            [0, 0],
            [0.6, 0]
          ]
        ],
        3: [
          [
            [0, 0.9],
            [0.3, 1],
            [0.55, 0.9],
            [0.55, 0.62],
            [0.25, 0.5],
            [0.55, 0.38],
            [0.55, 0.1],
            [0.3, 0],
            [0, 0.1]
          ]
        ],
        4: [
          [
            [0.45, 0],
            [0.45, 1],
            [0, 0.3],
            [0.6, 0.3]
          ]
        ],
        5: [
          [
            [0.55, 1],
            [0.05, 1],
            [0, 0.55],
            [0.3, 0.62],
            [0.55, 0.5],
            [0.6, 0.2],
            [0.4, 0],
            [0.05, 0.05]
          ]
        ],
        6: SIX,
        7: [
          [
            [0, 1],
            [0.6, 1],
            [0.2, 0]
          ]
        ],
        8: [
          [
            [0.3, 0.5],
            [0.05, 0.65],
            [0.05, 0.9],
            [0.3, 1],
            [0.55, 0.9],
            [0.55, 0.65],
            [0.3, 0.5],
            [0, 0.35],
            [0, 0.1],
            [0.3, 0],
            [0.6, 0.1],
            [0.6, 0.35],
            [0.3, 0.5]
          ]
        ],
        9: FLIP(SIX),
        "-": [
          [
            [0, 0.5],
            [0.4, 0.5]
          ]
        ],
        "!": [
          [
            [0.1, 1],
            [0.1, 0.3]
          ],
          [
            [0.1, 0],
            [0.1, 0.02]
          ]
        ],
        ".": [
          [
            [0.1, 0],
            [0.1, 0.02]
          ]
        ],
        K: [
          [
            [0, 0],
            [0, 1]
          ],
          [
            [0.6, 1],
            [0, 0.45],
            [0.6, 0]
          ]
        ],
        M: [
          [
            [0, 0],
            [0, 1],
            [0.3, 0.45],
            [0.6, 1],
            [0.6, 0]
          ]
        ]
      });
      ADVANCE = Object.freeze({ "!": 0.35, ".": 0.35, "-": 0.55 });
      ADVANCE_DEFAULT = 0.8;
      STYLES = Object.freeze({
        dealt: Object.freeze({ fill: [255, 244, 214], outline: [54, 38, 24], prefix: "", suffix: "" }),
        critical: Object.freeze({ fill: [255, 207, 74], outline: [122, 59, 0], prefix: "", suffix: "!" }),
        taken: Object.freeze({ fill: [255, 154, 120], outline: [84, 30, 20], prefix: "-", suffix: "" })
      });
      OUTLINE_WIDTH = 0.3;
      FILL_WIDTH = 0.14;
      DamageNumberPresentation = class {
        lifeMs = DAMAGE_NUMBER.lifeMs;
        // `reduced` keeps the number but drops the pop and the rise: the information stays, the motion goes.
        draw(renderer, event, progress, feel) {
          const STYLE = STYLES[event.critical ? "critical" : event.role], REDUCED = feel?.reduced === true, POP = Math.min(1, progress / DAMAGE_NUMBER.popFraction), ALPHA = Math.min(1, (1 - progress) / DAMAGE_NUMBER.fadeFraction), SCALE = (event.critical ? DAMAGE_NUMBER.criticalScale : 1) * (REDUCED ? 1 : 0.65 + 0.45 * Math.sin(POP * Math.PI * 0.5)), LIFT = REDUCED ? 0 : DAMAGE_NUMBER.rise * (1 - (1 - progress) ** 2), DRIFT = (event.sequence * 7919 % 11 - 5) * DAMAGE_NUMBER.spread, POINT2 = renderer.project(event.x + DRIFT, event.y, event.z + 0.5 + LIFT), TEXT = `${STYLE.prefix}${formatDamage(event.amount)}${STYLE.suffix}`, HEIGHT = DAMAGE_NUMBER.height * SCALE * renderer.scale;
          if (ALPHA <= 0) {
            return;
          }
          const OUTLINE = `rgba(${STYLE.outline},${ALPHA * 0.9})`, FILL = `rgba(${STYLE.fill},${ALPHA})`;
          drawGlyphText(renderer, TEXT, POINT2.x, POINT2.y, HEIGHT, FILL, OUTLINE);
        }
      };
    }
  });

  // src/features/abilities/barley-shred/presentation.js
  var STATUS, SHIELD_STROKES, BarleyArmorShredPresentation;
  var init_presentation9 = __esm({
    "src/features/abilities/barley-shred/presentation.js"() {
      init_damage_numbers();
      STATUS = Object.freeze({ minHeight: 11, maxHeight: 34, bodyShare: 0.16 });
      SHIELD_STROKES = Object.freeze([
        [
          [-0.5, 0.78],
          [0, 1],
          [0.5, 0.78],
          [0.5, 0.42],
          [0, 0],
          [-0.5, 0.42],
          [-0.5, 0.78]
        ],
        [
          [0, 1],
          [-0.12, 0.7],
          [0.14, 0.5],
          [-0.04, 0.24]
        ]
      ]);
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
            renderer.line(FROM, TO, 0.055, `rgba(229,242,229,${ALPHA})`);
          }
        }
        // A cracked shield and "-N" over the head of whatever is shredded, placed and sized from its drawn body
        // (`height`, `radius`), the same numbers every skill effect uses.
        drawStatus(renderer, target) {
          const AMOUNT = target.barleyArmorShredTotal || 0;
          if (target.hp <= 0 || AMOUNT <= 0) {
            return;
          }
          const PIXEL = renderer.pixelRatio, HEAD = renderer.project(target.x, target.y, (target.z || 0) + target.height), BODY_WIDTH = 2 * target.radius * renderer.scale, HEIGHT = Math.max(
            STATUS.minHeight * PIXEL,
            Math.min(STATUS.maxHeight * PIXEL, BODY_WIDTH * STATUS.bodyShare)
          ), TEXT = `-${formatDamage(AMOUNT)}`, TEXT_WIDTH = textWidth(TEXT) * HEIGHT, GAP = HEIGHT * 0.25, SHIELD_WIDTH = HEIGHT * 0.9, LEFT = HEAD.x - (SHIELD_WIDTH + GAP + TEXT_WIDTH) / 2, BASE = HEAD.y - HEIGHT * 0.5, CX = LEFT + SHIELD_WIDTH / 2, LEFT_FRACTION = target.barleyArmorShredLeft ?? 1, FILL = "#d8e5d7", OUTLINE = "rgba(46,58,48,0.9)";
          const AT = ([x, y]) => ({ x: CX + x * SHIELD_WIDTH, y: BASE - y * HEIGHT });
          for (const STROKE of SHIELD_STROKES) {
            const POINTS = STROKE.map(AT);
            for (const [WIDTH, COLOR] of [
              [HEIGHT * 0.26, OUTLINE],
              [HEIGHT * 0.12, FILL]
            ]) {
              for (let index = 1; index < POINTS.length; index++) {
                renderer.pixelLine(POINTS[index - 1], POINTS[index], WIDTH, COLOR);
              }
            }
          }
          const BAR_Y = BASE + HEIGHT * 0.16, BAR_HALF = SHIELD_WIDTH * 0.5;
          renderer.pixelLine({ x: CX - BAR_HALF, y: BAR_Y }, { x: CX + BAR_HALF, y: BAR_Y }, HEIGHT * 0.2, OUTLINE);
          renderer.pixelLine(
            { x: CX - BAR_HALF, y: BAR_Y },
            { x: CX - BAR_HALF + 2 * BAR_HALF * LEFT_FRACTION, y: BAR_Y },
            HEIGHT * 0.1,
            FILL
          );
          drawGlyphText(renderer, TEXT, LEFT + SHIELD_WIDTH + GAP + TEXT_WIDTH / 2, BASE, HEIGHT * 0.82, FILL, OUTLINE);
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
      init_model11();
      init_kidney_continuous_leap();
      init_model12();
      init_definition12();
      init_model13();
      init_definition13();
      init_model14();
      init_definition14();
      init_model15();
      init_definition15();
      init_model16();
      init_rice_low_health_harvest();
      init_model17();
      init_wheat_command_crit();
      init_model18();
      init_barley_armor_break();
      init_model19();
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
  var init_model20 = __esm({
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
  var FEATURE5;
  var init_definition18 = __esm({
    "src/features/projectiles/spike/definition.js"() {
      FEATURE5 = Object.freeze({ id: "spike", landingEffect: "spike-land" });
    }
  });

  // src/features/projectiles/spike/model.js
  var SpikeProjectile;
  var init_model21 = __esm({
    "src/features/projectiles/spike/model.js"() {
      init_damage_model();
      init_definition18();
      SpikeProjectile = class extends DamageProjectile {
        constructor(dependencies) {
          super(FEATURE5, dependencies);
        }
      };
    }
  });

  // src/features/projectiles/definition.js
  function projectileFeature(projectile) {
    return projectileFlightFeature(projectile);
  }
  function projectileFlightFeature(projectile) {
    return projectile.projectileKind === "chestnut-spike" ? FEATURE5 : FEATURE;
  }
  var init_definition19 = __esm({
    "src/features/projectiles/definition.js"() {
      init_definition10();
      init_definition18();
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
      init_model20();
      init_model21();
      init_definition19();
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

  // src/features/scenes/farm/boss-event-phases.js
  function createFarmBossEventPhases(config) {
    class FarmBossEventPhase {
      update(_world, _dt) {
        return false;
      }
    }
    class MarchingFarmBossEventPhase extends FarmBossEventPhase {
      update(world, dt) {
        const TOWER = config.farm.tower, GATE = world.towerGate;
        world.farmBossEvent.elapsed += dt;
        let outside = 0;
        for (const UNIT3 of [...world.units]) {
          if (UNIT3.isBattleOnlySummon || UNIT3.hp <= 0) {
            continue;
          }
          if (Math.hypot(UNIT3.x - GATE.x, UNIT3.y - GATE.y) <= TOWER.gateRadius) {
            world.benchUnit(UNIT3);
          } else {
            outside++;
          }
        }
        if (outside === 0 || world.farmBossEvent.elapsed >= TOWER.marchSeconds) {
          world.finishMarch();
        }
        return true;
      }
    }
    class DroppingFarmBossEventPhase extends FarmBossEventPhase {
      update(world, dt) {
        world.farmBossEvent.elapsed += dt;
        world.boss.z = Math.max(
          0,
          config.battle.dropHeight - 0.5 * config.physics.gravity * world.farmBossEvent.elapsed * world.farmBossEvent.elapsed
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
        if (!world.handCounts.size && !world.units.some((u) => hasFaction(u, FACTION_CONFIG.PLAYER) && u.hp > 0)) {
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
          world.markProgressChanged();
          world.afterFloor();
        }
        return true;
      }
    }
    return Object.freeze({
      idle: Object.freeze(new FarmBossEventPhase()),
      marching: Object.freeze(new MarchingFarmBossEventPhase()),
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
  function wanderUnit(seed, salt) {
    let h = Math.imul(Math.floor(seed * 1e3) | 0, 2654435761) ^ Math.imul(salt | 0, 2246822507);
    h = Math.imul(h ^ h >>> 15, 739982445);
    h = Math.imul(h ^ h >>> 12, 695872825);
    return ((h ^ h >>> 15) >>> 0) / 4294967296;
  }
  function restingSpot(unit2, time, arena) {
    const PERIOD = WANDER_SECONDS_MIN + WANDER_SECONDS_SPREAD * wanderUnit(unit2.seed, 7), EPOCH = Math.floor(time / PERIOD + wanderUnit(unit2.seed, 3)), X = wanderUnit(unit2.seed, EPOCH * 2 + 11) * 2 - 1, Y = wanderUnit(unit2.seed, EPOCH * 2 + 12) * 2 - 1;
    return { x: X * WANDER_EXTENT * arena.radiusX, y: Y * WANDER_EXTENT * arena.radiusY };
  }
  var WANDER_SECONDS_MIN, WANDER_SECONDS_SPREAD, WANDER_EXTENT, WANDER_ARRIVE, FarmMode;
  var init_model_base4 = __esm({
    "src/features/farm-modes/model-base.js"() {
      init_unit_stats();
      WANDER_SECONDS_MIN = 16;
      WANDER_SECONDS_SPREAD = 16;
      WANDER_EXTENT = 0.86;
      WANDER_ARRIVE = 0.5;
      FarmMode = class {
        constructor(feature, config) {
          this.feature = feature;
          this.config = config;
        }
        // A resting unit walks to a spot of its own and stays there a while before picking the next one.
        wander(world, unit2, dt) {
          const SPOT = restingSpot(unit2, world.time, this.config.farm.arena);
          if (Math.hypot(SPOT.x - unit2.x, SPOT.y - unit2.y) < WANDER_ARRIVE) {
            return;
          }
          world.steer(unit2, SPOT.x, SPOT.y, dt, scaleMoveSpeed(1.3, unit2));
        }
        update(world, unit2, dt) {
          if (unit2.stun > 0 || unit2.z > 0.1) {
            return;
          }
          if (world.isWorker(unit2)) {
            const ORDER = world.workOrder(unit2);
            if (!ORDER) {
              this.wander(world, unit2, dt);
            } else if (ORDER.hold) {
              if (ORDER.face) {
                unit2.angle = Math.atan2(ORDER.fy - unit2.y, ORDER.fx - unit2.x);
              }
            } else {
              world.steer(unit2, ORDER.x, ORDER.y, dt, scaleMoveSpeed(ORDER.speed, unit2));
              if (Math.hypot(ORDER.x - unit2.x, ORDER.y - unit2.y) < 0.4) {
                unit2.angle = Math.atan2(ORDER.fy - unit2.y, ORDER.fx - unit2.x);
              }
            }
            return;
          }
          if (!unit2.mature || unit2.cooldown > 0) {
            if (!world.avoidNearbyFood(unit2, dt)) {
              this.wander(world, unit2, dt);
            }
            return;
          }
          this.updateReady(world, unit2, dt);
        }
      };
    }
  });

  // src/features/farm-modes/breed/definition.js
  var FEATURE6;
  var init_definition20 = __esm({
    "src/features/farm-modes/breed/definition.js"() {
      FEATURE6 = Object.freeze({ id: "breed" });
    }
  });

  // src/features/farm-modes/breed/model.js
  var BreedFarmMode;
  var init_model22 = __esm({
    "src/features/farm-modes/breed/model.js"() {
      init_model_base4();
      init_definition20();
      init_unit_stats();
      BreedFarmMode = class extends FarmMode {
        constructor(config) {
          super(FEATURE6, config);
        }
        updateReady(world, u, dt) {
          let target = null;
          if (!u.fed) {
            target = world.requestGroundFoodTarget(u);
            if (target && Math.hypot(target.x - u.x, target.y - u.y) < 0.42 && world.consumeGroundFood(target)) {
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
          world.steer(u, target.x, target.y, dt, scaleMoveSpeed(3.6, u));
        }
        resolveContacts(world, units) {
          world.resolveFarmContactPairs(units);
          world.resolveMergeTaskAfterMovement();
        }
        pair(world, a, b) {
          if (!a || !b || a === b || a.hp <= 0 || b.hp <= 0 || a.down > 0 || b.down > 0 || a.species !== b.species || !a.mature || !b.mature || a.cooldown > 0 || b.cooldown > 0 || !world.units.includes(a) || !world.units.includes(b) || Math.hypot(a.x - b.x, a.y - b.y) > a.radius + b.radius + 0.2 || world.senseEnemy(a) || world.senseEnemy(b)) {
            return false;
          }
          if (a.isBattleOnlySummon || b.isBattleOnlySummon) {
            return false;
          }
          const OWNER = world.breedingReservationOwner(a, b);
          if (!world.canBreedPair(a, b, true) || world.ownedPopulation >= world.capacity || a.mateId && a.mateId !== b.id || b.mateId && b.mateId !== a.id || !world.reserveActiveBreedPair(a, b)) {
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
      init_model22();
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
        // How many units this attack would hit right now; null for an attack that does no damage.
        expectedHits(_world, _targets) {
          return null;
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
      };
    }
  });

  // src/boss-patterns.js
  function bossAttackTotal(multiplier, hits) {
    return multiplier * (BOSS_HIT_SPLIT.everyone * hits + (1 - BOSS_HIT_SPLIT.everyone));
  }
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
    const AREA = ELIGIBLE.filter((id) => id !== BOSS_BASIC_ID);
    if (ELIGIBLE.includes(BOSS_BASIC_ID) && (!AREA.length || random() < BOSS_BASIC_SHARE)) {
      return BOSS_BASIC_ID;
    }
    const TOTAL = AREA.reduce((sum, id) => sum + Math.max(0, runtime.weights[id] || 0), 0);
    if (!(TOTAL > 0)) {
      return null;
    }
    let roll = random() * TOTAL;
    let chosen = AREA.at(-1);
    for (const ID of AREA) {
      roll -= Math.max(0, runtime.weights[ID] || 0);
      if (roll < 0) {
        chosen = ID;
        break;
      }
    }
    for (const ID of AREA) {
      runtime.weights[ID] = ID === chosen ? BOSS_PATTERN_WEIGHT_DEFAULTS.base : Math.min(
        BOSS_PATTERN_WEIGHT_DEFAULTS.cap,
        Math.max(0, runtime.weights[ID] || 0) + BOSS_PATTERN_WEIGHT_DEFAULTS.eligibleBonus
      );
    }
    return chosen;
  }
  var BOSS_PATTERN_IDS, BOSS_HIT_SPLIT, BOSS_BASIC_ID, BOSS_PATTERN_CONFIG, BOSS_BASIC_SHARE, BOSS_PATTERN_WEIGHT_DEFAULTS, BOSS_ENRAGE, BOSS_PHASE_THRESHOLDS, BOSS_AIM_TURN_RATE;
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
      BOSS_HIT_SPLIT = Object.freeze({ everyone: 0.35 });
      BOSS_BASIC_ID = "attack.front-slam";
      BOSS_PATTERN_CONFIG = Object.freeze({
        "attack.sweep-360": Object.freeze({
          kind: "sweep-360",
          unlockHp: 0.4,
          windup: 1.05,
          active: 1.05,
          recover: 1.05,
          cooldown: 16,
          reach: 7.35,
          damageMultiplier: 2.5,
          knockback: 13,
          lift: 10.2,
          groundOnly: true
        }),
        "attack.front-slam": Object.freeze({
          kind: "front-slam",
          unlockHp: 1,
          windup: 0.75,
          active: 0,
          recover: 0.75,
          cooldown: 5,
          reach: 5.5,
          sector: Math.PI / 3,
          damageMultiplier: 4,
          knockback: 13,
          lift: 10.2,
          groundOnly: true
        }),
        "attack.charge": Object.freeze({
          kind: "charge",
          unlockHp: 1,
          windup: 0.5,
          active: 6.6 / 5.3,
          recover: 0.75,
          cooldown: 12,
          reach: 6.6,
          speed: 5.3,
          damageMultiplier: 2,
          knockback: 13,
          lift: 10.2,
          groundOnly: false
        }),
        "attack.leap-slam": Object.freeze({
          kind: "leap-slam",
          unlockHp: 0.6,
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
          unlockHp: 0.75,
          windup: 1,
          active: 0.8,
          recover: 1,
          cooldown: 5,
          reach: 7.35,
          sector: Math.PI * 2 / 3,
          damageMultiplier: 2,
          knockback: 13,
          lift: 10.2,
          groundOnly: true
        }),
        "summon.mouth-t1": Object.freeze({
          kind: "mouth-t1",
          unlockHp: 0.5,
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
      BOSS_BASIC_SHARE = 0.5;
      BOSS_PATTERN_WEIGHT_DEFAULTS = Object.freeze({
        base: 1,
        eligibleBonus: 0.5,
        cap: 3
      });
      BOSS_ENRAGE = Object.freeze({ damageMultiplier: 2, cooldownMultiplier: 0.5 });
      BOSS_PHASE_THRESHOLDS = Object.freeze(
        [...new Set(BOSS_PATTERN_IDS.map((id) => BOSS_PATTERN_CONFIG[id].unlockHp).filter((t) => t < 1))].sort(
          (a, b) => b - a
        )
      );
      BOSS_AIM_TURN_RATE = 5.5;
    }
  });

  // src/features/boss-patterns/sweep-360/definition.js
  var FEATURE7;
  var init_definition21 = __esm({
    "src/features/boss-patterns/sweep-360/definition.js"() {
      init_boss_patterns();
      FEATURE7 = Object.freeze({ id: "attack.sweep-360", config: BOSS_PATTERN_CONFIG["attack.sweep-360"] });
    }
  });

  // src/features/boss-patterns/sweep-360/model.js
  var SWEEP_HAND_STARTS, SweepBossPattern;
  var init_model23 = __esm({
    "src/features/boss-patterns/sweep-360/model.js"() {
      init_model_base5();
      init_definition21();
      SWEEP_HAND_STARTS = Object.freeze({ "arm-left": Math.PI, "arm-right": 0 });
      SweepBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE7, dependencies);
          this.physicalActive = true;
        }
        writeArea(_boss, _action, _scene, pad, area) {
          area.kind = "sweep";
          area.reach = this.config.reach + pad;
          area.angle = 0;
        }
        expectedHits(world, _targets) {
          return world.bossGroundUnitsNear(world.boss.x, world.boss.y, this.config.reach).length;
        }
        updateActive(world, action, dt) {
          const Q0 = Math.max(0, (action.phaseElapsed - dt) / this.config.active), Q1 = Math.min(1, action.phaseElapsed / this.config.active);
          for (const ARM_START of Object.values(SWEEP_HAND_STARTS)) {
            world.resolveBossWedge(
              action,
              action.id,
              this.config.reach,
              ARM_START + Math.PI * Q0,
              ARM_START + Math.PI * Q1
            );
          }
          if (action.phaseElapsed >= this.config.active - 1e-9) {
            world.enterBossPatternRecovery(action);
          }
        }
        get hitMetric() {
          return "sweepHits";
        }
      };
    }
  });

  // src/features/boss-patterns/front-slam/definition.js
  var FEATURE8;
  var init_definition22 = __esm({
    "src/features/boss-patterns/front-slam/definition.js"() {
      init_boss_patterns();
      FEATURE8 = Object.freeze({ id: "attack.front-slam", config: BOSS_PATTERN_CONFIG["attack.front-slam"] });
    }
  });

  // src/features/boss-patterns/front-slam/model.js
  var SlamBossPattern;
  var init_model24 = __esm({
    "src/features/boss-patterns/front-slam/model.js"() {
      init_model_base5();
      init_definition22();
      SlamBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE8, dependencies);
        }
        writeArea(_boss, _action, _scene, pad, area) {
          area.kind = "sector";
          area.reach = this.config.reach + pad;
          area.sector = this.config.sector;
        }
        activate(world, action) {
          world.resolveBossWedge(
            action,
            action.id,
            this.config.reach,
            action.aim - this.config.sector / 2,
            action.aim + this.config.sector / 2,
            1
          );
          world.enterBossPatternRecovery(action);
          return;
        }
      };
    }
  });

  // src/features/boss-patterns/charge/definition.js
  var FEATURE9;
  var init_definition23 = __esm({
    "src/features/boss-patterns/charge/definition.js"() {
      init_boss_patterns();
      FEATURE9 = Object.freeze({ id: "attack.charge", config: BOSS_PATTERN_CONFIG["attack.charge"] });
    }
  });

  // src/features/boss-patterns/charge/model.js
  var ChargeBossPattern;
  var init_model25 = __esm({
    "src/features/boss-patterns/charge/model.js"() {
      init_model_base5();
      init_definition23();
      ChargeBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE9, dependencies);
          this.physicalActive = true;
        }
        writeArea(boss, action, scene, pad, area) {
          const { CONFIG: CONFIG2 } = this.dependencies;
          area.kind = "charge";
          area.width = boss.radius + pad;
          const SX = action.start?.x ?? boss.x, SY = action.start?.y ?? boss.y, DX = Math.cos(area.angle), DY = Math.sin(area.angle);
          const RX2 = CONFIG2[scene].arena.radiusX - boss.radius - 0.25, RY2 = CONFIG2[scene].arena.radiusY - boss.radius - 0.25;
          const A_LOCAL = DX * DX / (RX2 * RX2) + DY * DY / (RY2 * RY2), B_LOCAL = 2 * (SX * DX / (RX2 * RX2) + SY * DY / (RY2 * RY2)), C_LOCAL = SX * SX / (RX2 * RX2) + SY * SY / (RY2 * RY2) - 1;
          const EXIT = Math.max(
            0,
            (-B_LOCAL + Math.sqrt(Math.max(0, B_LOCAL * B_LOCAL - 4 * A_LOCAL * C_LOCAL))) / (2 * A_LOCAL)
          );
          const DISTANCE = Math.min(this.config.reach, EXIT);
          const EX = SX + DX * DISTANCE, EY = SY + DY * DISTANCE, K = Math.max(1, Math.hypot(EX / RX2, EY / RY2));
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
        // The units in the lane the boss runs along, as wide as its body.
        expectedHits(world, targets) {
          const TARGET = this.selectedTarget(world, targets), BOSS2 = world.boss, AIM = Math.atan2(TARGET.y - BOSS2.y, TARGET.x - BOSS2.x), DX = Math.cos(AIM), DY = Math.sin(AIM);
          return world.bossGroundUnitsNear(BOSS2.x, BOSS2.y, this.config.reach).filter((unit2) => {
            const AHEAD = (unit2.x - BOSS2.x) * DX + (unit2.y - BOSS2.y) * DY, SIDE = Math.abs((unit2.x - BOSS2.x) * DY - (unit2.y - BOSS2.y) * DX);
            return AHEAD >= 0 && SIDE <= BOSS2.radius + unit2.radius;
          }).length;
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
  var FEATURE10;
  var init_definition24 = __esm({
    "src/features/boss-patterns/leap-slam/definition.js"() {
      init_boss_patterns();
      FEATURE10 = Object.freeze({ id: "attack.leap-slam", config: BOSS_PATTERN_CONFIG["attack.leap-slam"] });
    }
  });

  // src/features/boss-patterns/leap-slam/model.js
  var LeapBossPattern;
  var init_model26 = __esm({
    "src/features/boss-patterns/leap-slam/model.js"() {
      init_model_base5();
      init_definition24();
      LeapBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE10, dependencies);
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
            const RX2 = CONFIG2[scene].arena.radiusX - boss.radius - 0.25, RY2 = CONFIG2[scene].arena.radiusY - boss.radius - 0.25, K = Math.max(1, Math.hypot(x / RX2, y / RY2));
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
        expectedHits(world, targets) {
          const TARGET = this.selectedTarget(world, targets);
          return world.bossGroundUnitsNear(TARGET.x, TARGET.y, this.config.landingRadius).length;
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
  var FEATURE11;
  var init_definition25 = __esm({
    "src/features/boss-patterns/fan-sweep/definition.js"() {
      init_boss_patterns();
      FEATURE11 = Object.freeze({ id: "attack.fan-sweep", config: BOSS_PATTERN_CONFIG["attack.fan-sweep"] });
    }
  });

  // src/features/boss-patterns/fan-sweep/model.js
  var FanBossPattern;
  var init_model27 = __esm({
    "src/features/boss-patterns/fan-sweep/model.js"() {
      init_model_base5();
      init_definition25();
      FanBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE11, dependencies);
          this.physicalActive = true;
        }
        writeArea(_boss, _action, _scene, pad, area) {
          area.kind = "sector";
          area.reach = this.config.reach + pad;
          area.sector = this.config.sector;
        }
        expectedHits(world, targets) {
          const TARGET = this.selectedTarget(world, targets), AIM = Math.atan2(TARGET.y - world.boss.y, TARGET.x - world.boss.x);
          return world.bossGroundUnitsNear(world.boss.x, world.boss.y, this.config.reach).filter((unit2) => world.bossWedgeContains(unit2, this.config.reach, AIM, this.config.sector / 2)).length;
        }
        updateActive(world, action, dt) {
          const Q0 = Math.max(0, (action.phaseElapsed - dt) / this.config.active), Q1 = Math.min(1, action.phaseElapsed / this.config.active), START = action.aim - this.config.sector / 2;
          world.resolveBossWedge(
            action,
            action.id,
            this.config.reach,
            START + this.config.sector * Q0,
            START + this.config.sector * Q1
          );
          if (action.phaseElapsed >= this.config.active) {
            world.enterBossPatternRecovery(action);
          }
        }
        get hitMetric() {
          return "sweepHits";
        }
      };
    }
  });

  // src/features/boss-patterns/mouth-summon/definition.js
  var FEATURE12;
  var init_definition26 = __esm({
    "src/features/boss-patterns/mouth-summon/definition.js"() {
      init_boss_patterns();
      FEATURE12 = Object.freeze({ id: "summon.mouth-t1", config: BOSS_PATTERN_CONFIG["summon.mouth-t1"] });
    }
  });

  // src/features/boss-patterns/mouth-summon/model.js
  var MouthSummonBossPattern;
  var init_model28 = __esm({
    "src/features/boss-patterns/mouth-summon/model.js"() {
      init_model_base5();
      init_definition26();
      init_factions();
      MouthSummonBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE12, dependencies);
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
      init_model23();
      init_model24();
      init_model25();
      init_model26();
      init_model27();
      init_model28();
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
  function bossHandRig(compiled) {
    const SOCKETS = compiled.metadata.sockets, SCALE = (0, import_vector_sockets2.bossVectorScale)(), POINT2 = (name) => {
      const POINT3 = SOCKETS[name]?.point;
      if (!POINT3) {
        throw new Error(`Vector socket contract (${compiled.metadata.id}): the boss needs a ${name} socket`);
      }
      return POINT3;
    }, CENTRE = POINT2("hand-centre"), REST = (name) => {
      const AT = POINT2(name);
      return { x: (AT[0] - CENTRE[0]) * SCALE, y: (AT[1] - CENTRE[1]) * SCALE };
    };
    return Object.freeze({
      radius: (POINT2("hand-edge")[0] - POINT2("hand-left")[0]) * SCALE,
      rest: Object.freeze({ "arm-left": REST("hand-left"), "arm-right": REST("hand-right") })
    });
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
    }, HANDS = {
      "arm-left": { x: 0, y: 0 },
      "arm-right": { x: 0, y: 0 }
    }, R2 = b.radius || 0;
    let releasePulse = 0;
    if (PHASE === "windup") {
      const WIND = CLAMP(ELAPSED / CONFIG2.windup, 0, 1), EASE2 = WIND * WIND * (3 - 2 * WIND);
      BODY2.y = 2 * EASE2;
      BODY2.scaleX = 1 + 0.025 * EASE2;
      BODY2.scaleY = 1 - 0.035 * EASE2;
      Object.assign(HANDS["arm-left"], { x: -0.4 * R2 * EASE2, y: -0.5 * R2 * EASE2 });
      Object.assign(HANDS["arm-right"], { x: 0.4 * R2 * EASE2, y: -0.5 * R2 * EASE2 });
    } else if (PHASE === "active" || PHASE === "recover") {
      const LAST = (b.patternReleased || 0) - 1, AGE = LAST < 0 ? 1 : PHASE === "active" ? Math.max(0, ELAPSED - LAST * CONFIG2.releaseInterval) : ELAPSED;
      releasePulse = CLAMP(1 - AGE / 0.16, 0, 1);
      BODY2.scaleX = 1 + 0.025 * releasePulse;
      BODY2.scaleY = 1 - 0.018 * releasePulse;
      BODY2.rotation = AIM * 0.02;
      Object.assign(HANDS["arm-left"], { x: -0.45 * R2, y: -0.55 * R2 });
      Object.assign(HANDS["arm-right"], { x: 0.45 * R2, y: -0.55 * R2 });
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
      hands: HANDS,
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
  function streamFor(source) {
    return STREAM_SOURCE[source];
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
    const FLOORS = stage - 1, LINEAR = 1 + BOSS_REWARD_SETTINGS.stageStep * FLOORS, GROWTH = Math.min(BOSS_REWARD_SETTINGS.stageGrowthCap, BOSS_REWARD_SETTINGS.stageGrowth ** FLOORS), TOTAL = 1 + BOSS_REWARD_SETTINGS.stageRollStep * FLOORS, PAYOUTS = bossRewardBoxPayouts(TOTAL);
    return {
      stage,
      hp: Math.round(BOSS_REWARD_SETTINGS.stageHpBase * LINEAR * GROWTH),
      attackPower: BOSS_REWARD_SETTINGS.stageAttackBase * LINEAR * GROWTH,
      xp: Math.round(BOSS_REWARD_SETTINGS.stageXpBase * LINEAR),
      rollBudget: TOTAL,
      rolls: PAYOUTS.length,
      boxCount: PAYOUTS.length,
      boxPayouts: PAYOUTS,
      bonusRollChance: 0
    };
  }
  function bossAcquisitionChance({ farmEvent = false, firstClear = false, acquisitionMultiplier = 1 } = {}) {
    if (!Number.isFinite(acquisitionMultiplier) || acquisitionMultiplier < 0 || acquisitionMultiplier > 2) {
      throw new RangeError("Boss acquisition multiplier must be in [0, 2]");
    }
    const BASE = firstClear ? BOSS_REWARD_SETTINGS.firstClearAcquisitionChance : BOSS_REWARD_SETTINGS.acquisitionChance;
    if (farmEvent) {
      return Math.min(1, BASE * BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier);
    }
    return Math.min(1, BASE * acquisitionMultiplier);
  }
  function bossSpeciesOwned(world, species) {
    return (world.unitCollection?.items ?? world.units).some(
      (unit2) => unit2.species === species && !unit2.isBattleOnlySummon
    ) || (world.bossRewardInventory || []).some((entry) => entry.species === species && entry.count > 0);
  }
  function ensureWorldRewardState(world) {
    world.bossRewardReceipts ||= [];
    world.bossRewardWatermarks ||= { farm: 0 };
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
  function bossRewardQueueBySpecies(world) {
    const COUNTS = /* @__PURE__ */ new Map();
    for (const ENTRY of world.bossRewardInventory || []) {
      COUNTS.set(ENTRY.species, (COUNTS.get(ENTRY.species) || 0) + ENTRY.count);
    }
    return [...COUNTS].filter(([, count]) => count > 0);
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
    let capacity = Math.max(0, world.freeRoom());
    for (const GROUP of world.bossRewardInventory) {
      if (capacity <= 0) {
        break;
      }
      const COUNT = Math.min(capacity, GROUP.count), NEW_SPECIES = !(world.unitCollection?.items ?? world.units).some(
        (unit2) => unit2.species === GROUP.species && !unit2.isBattleOnlySummon
      );
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
        if (NEW_SPECIES && placed === 1 && capacity - placed > 0) {
          const PARTNER = world.spawn(GROUP.species, GROUP.tier, Math.cos(placed) * 0.6, Math.sin(placed) * 0.6);
          if (PARTNER) {
            GRANTED.push(PARTNER);
            capacity -= 1;
          }
        }
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
    const ENCOUNTER_ID = options.encounterId, SOURCE = options.source || "farm", REQUESTED_KEY = options.receiptKey;
    if (SOURCE !== "farm" || !Number.isSafeInteger(ENCOUNTER_ID) || ENCOUNTER_ID < 1 || REQUESTED_KEY !== void 0 && (typeof REQUESTED_KEY !== "string" || !REQUESTED_KEY.trim() || REQUESTED_KEY.length > 255)) {
      throw new TypeError("A boss encounter ID, source, and valid receipt key are required");
    }
    const RECEIPT_KEY = REQUESTED_KEY || `${SOURCE}:${ENCOUNTER_ID}`, PREVIOUS = findExistingReceipt(world, REQUESTED_KEY, ENCOUNTER_ID, SOURCE);
    if (PREVIOUS) {
      return PREVIOUS;
    }
    if (ENCOUNTER_ID <= (world.bossRewardWatermarks[SOURCE] || 0)) {
      throw new RangeError("A settled or stale boss encounter cannot be rolled again");
    }
    const FIRST_CLEAR = options.firstClear === true, TOTAL = FIRST_CLEAR ? 1 : options.rollBudget ?? options.rollCount ?? 1;
    if (!Number.isSafeInteger(TOTAL) || TOTAL < 1 || TOTAL > BOSS_REWARD_SETTINGS.maxRollCount) {
      throw new RangeError("Boss reward quantity is outside the safe integer range");
    }
    const SPECIES = options.species ?? 3;
    if (!Number.isSafeInteger(SPECIES) || SPECIES < 0 || SPECIES >= BOSS_REWARD_SETTINGS.speciesWeights.length) {
      throw new RangeError("Boss reward species is invalid");
    }
    const STREAM_KIND = streamFor(SOURCE, FIRST_CLEAR), STREAM = world.bossRewardStreams[STREAM_KIND], CHANCE = bossAcquisitionChance({
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
    for (const SOURCE of ["farm"]) {
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
    const RESULT = awardMasteryXp(
      WALLET,
      RECEIPT_KEY,
      RECEIPT.species,
      options.xpAmount === void 0 ? void 0 : options.xpAmount
    );
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
  var FORMAT_PERCENT, FORMAT_COUNT, PRD_UNITS_PER_TICK, STREAM_DOMAINS, STREAM_SOURCE, MAX_KIND_REWARD, RECORD_MULTIPLIER, BOSS_REWARD_SETTINGS;
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
      STREAM_SOURCE = Object.freeze({ farm: "event" });
      MAX_KIND_REWARD = 3;
      RECORD_MULTIPLIER = 2;
      BOSS_REWARD_SETTINGS = Object.freeze({
        acquisitionChance: 0.05,
        firstClearAcquisitionChance: 1,
        farmEventAcquisitionMultiplier: 2,
        // Every stage stat is its stage-1 base, plus `stageStep` of that base for each floor above 1 (linear), so a floor is
        // a fixed step up rather than a wall. Boss hp and attack also climb by `stageGrowth` per floor, up to `stageGrowthCap`
        // in all: a short, capped compounding that makes each floor feel heavier without outrunning the player late.
        stageHpBase: 200,
        stageAttackBase: 4,
        stageXpBase: 20,
        stageStep: 0.5,
        stageGrowth: 1.03,
        stageGrowthCap: 2,
        // Reward draws per stage: one more draw for each floor. A floor kind may multiply them by up to `maxKindReward`.
        stageRollStep: 1,
        maxKindReward: MAX_KIND_REWARD,
        // A win on a floor higher than any before pays this many times over.
        recordMultiplier: RECORD_MULTIPLIER,
        maxStage: FARM_BOSS_EVENT_MAX_STAGE,
        maxRollCount: FARM_BOSS_EVENT_MAX_STAGE * MAX_KIND_REWARD * RECORD_MULTIPLIER,
        maxBoxCount: 100,
        prdUnitsPerTick: PRD_UNITS_PER_TICK,
        speciesWeights: BOSS_SPECIES_WEIGHTS
      });
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
  var init_model29 = __esm({
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
  var init_model30 = __esm({
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
      [FEATURE3.modelKey]: PROJECTILE_ATTACK,
      [FEATURE4.modelKey]: REPEATED_STRIKE
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
      init_model29();
      init_definition17();
      init_model30();
      init_definition16();
      init_unit_abilities();
      init_unit_stats();
      init_model17();
      init_model18();
      init_model19();
      init_model11();
      init_model12();
      init_model13();
      init_model14();
      init_model15();
      init_model16();
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
  function bossAttackArea(boss, unitRadius = 0, scene = "battle", area = {}) {
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
  var import_definition50, SEEDED_PRNG, CREATE_BUDGETED_SCHEDULER, EMPTY_FOOD_SEARCH_BUCKET, PRESENTATION_CLOCKS, PRESENTATION_EVENT_TIMES, BREED_COOLDOWN_SECONDS, BREED_RESERVATION_OWNER, MERGE_RESERVATION_OWNER, FARM_MAX_UNITS, BATTLE_MAX_UNITS, MAX_PEANUT_SPLIT_CHILDREN, MAX_BOSS_SUMMONS, WORLD_ARENA, FARM_ARENA, CONFIG, CLAMP2, STATS, BODY, KNOCKABLE, ARENA_GEOMETRY, BALLISTICS, FARM_BOSS_PHASES, PROJECTILE_BEHAVIORS, FARM_MODES, BOSS_BEHAVIORS, AttackCycle, CREATE_UNIT_ATTACK_CYCLE, CREATE_UNIT_SPECIAL_ABILITY, SIMULATION_SCENES, ATTACKING_BODY, UNIT, GARDEN;
  var init_farm_model = __esm({
    "src/farm-model.js"() {
      init_farm_offline();
      init_farm_work();
      init_formation_skills();
      init_formation_skill_state();
      init_signal();
      import_definition50 = __toESM(require_definition(), 1);
      init_definition10();
      init_mutation_notifications();
      init_unit_collection();
      init_farm_roster();
      init_simulation_scenes();
      init_projectile_behaviors();
      init_boss_event_phases();
      init_farm_mode_behaviors();
      init_boss_pattern_behaviors();
      init_boss_vector_sockets();
      init_model18();
      init_model19();
      init_model16();
      init_unit_stats();
      init_unit_abilities();
      init_boss_rewards();
      init_tower_run();
      init_species_catalog();
      init_player_progression();
      init_ability_progression();
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
      BATTLE_MAX_UNITS = 400;
      MAX_PEANUT_SPLIT_CHILDREN = 2;
      MAX_BOSS_SUMMONS = 10;
      WORLD_ARENA = Object.freeze({
        radiusX: 23,
        radiusY: 17
      });
      FARM_ARENA = Object.freeze({ radiusX: 23, radiusY: 17, shape: "rect" });
      CONFIG = Object.freeze({
        factions: FACTION_CONFIG,
        farm: Object.freeze({
          arena: FARM_ARENA,
          capacity: Object.freeze({
            max: FARM_MAX_UNITS,
            battleUnits: FARM_MAX_UNITS * (1 + MAX_PEANUT_SPLIT_CHILDREN) + MAX_BOSS_SUMMONS + 2e3
          }),
          maxUnitId: 999999999,
          work: Object.freeze({
            secondsPerFood: 8,
            tierBonus: 0.5,
            refreshTicks: 20,
            defaultBasisPoints: 4e3,
            maxFood: 50,
            pileKind: Object.freeze({ count: 2, amount: 12 }),
            pileGap: 6,
            pileRadiusX: 8,
            pileRadiusY: 6,
            pileRespawnSeconds: 3,
            starterUnits: 6
          }),
          breeding: Object.freeze({
            cooldownSeconds: BREED_COOLDOWN_SECONDS,
            growthSeconds: BREED_COOLDOWN_SECONDS / 2,
            matureMeals: 3
          }),
          offline: Object.freeze({
            capSeconds: 1800,
            minSeconds: 60,
            // Idle output is a share of what the workers would make while you watch.
            efficiency: 0.1
          }),
          merge: Object.freeze({
            cooldownSeconds: 4,
            animationSeconds: 0.85,
            celebrationSeconds: 1,
            centerHeight: 1.8,
            resultFallVelocity: 0.2,
            maxMaterials: MAX_GRADE_MATERIAL_COUNT
          }),
          // Draft numbers: one unit every 0.2 s, at most 200 (the whole farm) on the field at once.
          deploy: Object.freeze({ cooldownSeconds: 0.1, fieldCap: 200 }),
          // Draft numbers for the tower: every 5th floor is a mid-boss; fallen units sleep tier (max 3) floors.
          tower: Object.freeze({
            midBossEvery: 5,
            sleepMax: 3,
            topFloor: 61,
            relicSlots: 3,
            relicMaxLevel: 5,
            // The troops walk to the tower door at the back of the farm and go in; the door is where the fence opens.
            marchSeconds: 4.5,
            marchSpeed: 7,
            gateRadius: 1.8,
            // Coming back from the tower, the troops drop out of the door one after another (ejectSeconds in all), each in a
            // short arc (flightSeconds) from ejectHeight onto a spot of its own anywhere on the farm.
            ejectSeconds: 1.3,
            flightSeconds: 1.1,
            ejectHeight: 7,
            battle: Object.freeze({ hp: 1, attack: 1, edge: 0, reward: 1 }),
            elite: Object.freeze({ hp: 1.6, attack: 1.25, edge: 0.25, reward: 2 }),
            mid: Object.freeze({ hp: 2.2, attack: 1.4, edge: 0.5, reward: BOSS_REWARD_SETTINGS.maxKindReward })
          }),
          bossEvent: Object.freeze({
            fadeSeconds: 0.5,
            celebrationSeconds: 1
          })
        }),
        battle: Object.freeze({
          capacity: Object.freeze({
            battleUnits: BATTLE_MAX_UNITS * (1 + MAX_PEANUT_SPLIT_CHILDREN) + MAX_BOSS_SUMMONS + 2e3,
            projectiles: BATTLE_MAX_UNITS * (1 + MAX_PEANUT_SPLIT_CHILDREN) * 4 + 40
          }),
          arena: WORLD_ARENA,
          dropHeight: 3
        }),
        unit: Object.freeze({
          speciesCount: SPECIES_COUNT,
          maxTier: MAX_UNIT_TIER,
          maxRadius: (0, import_definition50.maximumUnitRadius)(MAX_UNIT_TIER),
          perceptionRange: 18,
          corpseRecoverySeconds: 60
        }),
        boss: Object.freeze({
          maxSummons: MAX_BOSS_SUMMONS,
          summonIdBase: 5e6,
          basicReach: 6.2,
          sweepReach: 6.5,
          weaponRadius: 0.85,
          chaseSpeed: 2.65
        }),
        physics: Object.freeze({
          gravity: 19,
          separationIterations: 4,
          separationRelaxation: 0.8,
          // Raid battles only: allies may overlap by this fraction of their summed radii, solved on a
          // neighbor list built once per tick. Opposing sides still separate at full radius.
          battleSeparationIterations: 3,
          battleAllyOverlap: 0.2,
          battleNeighborMargin: 0.4,
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
        // How fast a free (knocked or falling) body loses speed, per second.
        dragRate() {
          return this.z > 0.04 ? 0.8 : 5;
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
          const DRAG = Math.exp(-this.dragRate() * dt);
          this.vx *= DRAG;
          this.vy *= DRAG;
          this.stun = Math.max(0, this.stun - dt);
          this.flash = Math.max(0, this.flash - dt);
          this.bounce = Math.max(0, this.bounce - dt);
        }
      };
      ARENA_GEOMETRY = {
        bounds(scene = "battle", margin = 0) {
          const ARENA = CONFIG[scene].arena;
          return {
            x: ARENA.radiusX - margin,
            y: ARENA.radiusY - margin
          };
        },
        inside(p, scene = "battle", margin = 0) {
          const R_LOCAL = this.bounds(scene, margin);
          if (CONFIG[scene].arena.shape === "rect") {
            return Math.abs(p.x) <= R_LOCAL.x && Math.abs(p.y) <= R_LOCAL.y;
          }
          return p.x * p.x / (R_LOCAL.x * R_LOCAL.x) + p.y * p.y / (R_LOCAL.y * R_LOCAL.y) <= 1;
        },
        clamp(p, scene = "battle", margin = 0) {
          const R_LOCAL = this.bounds(scene, margin);
          if (CONFIG[scene].arena.shape === "rect") {
            return { x: CLAMP2(p.x, -R_LOCAL.x, R_LOCAL.x), y: CLAMP2(p.y, -R_LOCAL.y, R_LOCAL.y) };
          }
          const K = Math.max(1, Math.hypot(p.x / R_LOCAL.x, p.y / R_LOCAL.y));
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
        // A unit that is walking to a place keeps the speed it was told to walk at: drag is for bodies that are thrown.
        dragRate() {
          return this.moveControlActive && this.stun <= 0 && this.down <= 0 && this.z <= 0.04 ? 0 : super.dragRate();
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
            dropLanded: true,
            isBattleOnlySummon: false,
            battleSummonKind: "",
            battleSummonParentId: 0,
            battleSummonParentGeneration: 0,
            battleSummonEncounterId: 0,
            countsTowardPermanentRoster: true,
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
          return (0, import_definition50.unitBodyRadius)(this) * this.giantScale;
        }
        get mature() {
          return this.growthElapsed >= this.growthDuration - 1e-9;
        }
        get fed() {
          return this.meals >= 1;
        }
        get size() {
          return (0, import_definition50.unitVisualSize)(this) * this.giantScale;
        }
        get bodyScale() {
          return (0, import_definition50.unitVectorScale)(this) * this.giantScale;
        }
        get height() {
          return (0, import_definition50.unitBodyHeight)(this) * this.giantScale;
        }
        get bodyHeight() {
          return (0, import_definition50.unitTorsoHeight)(this) * this.giantScale;
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
          this._battlePairA = new Int32Array(0);
          this._battlePairB = new Int32Array(0);
          this._battlePairOpposing = new Uint8Array(0);
          this._battlePairCount = 0;
          this._battleMoved = new Uint8Array(0);
          this._battleRadius = new Float64Array(0);
          this._battleHeight = new Float64Array(0);
          this._battleInverseMass = new Float64Array(0);
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
            "_battlePairA",
            "_battlePairB",
            "_battlePairOpposing",
            "_battlePairCount",
            "_battleMoved",
            "_battleRadius",
            "_battleHeight",
            "_battleInverseMass",
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
              get: () => this._benched?.size ? this._fieldUnits() : this.unitCollection.items,
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
        isMergeTaskMaterial(unit2) {
          return this.unitCollection.reservationOwner(unit2)?.startsWith("merge:") || false;
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
            const FOOD2 = this.food[index];
            this._foodOrder.set(FOOD2, index);
            if (FOOD2.phase === "grounded") {
              this.foodSpatial.insert(FOOD2);
              NEXT_FOODS.push(FOOD2);
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
        _trackUnitAdded(unit2) {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._unitSpatialDirty = true;
            return;
          }
          this.unitSpatial.insert(unit2);
          this._unitById.set(unit2.id, unit2);
          this._unitStepOrder.set(unit2, -1);
          if (unit2.species >= 0 && unit2.species < CONFIG.unit.speciesCount) {
            this._speciesGroups[unit2.species].push(unit2);
            this._ownedSpeciesCounts[unit2.species] = this.unitCollection.residentCountsBySpecies.get(unit2.species) || 0;
            const TIER = Math.max(0, Math.min(CONFIG.unit.maxTier, unit2.tier | 0));
            this._speciesTierGroups[unit2.species * (CONFIG.unit.maxTier + 1) + TIER].push(unit2);
          }
          if (unit2.hp > 0 && typeof unit2.faction === "string") {
            this._liveFactionCounts.set(unit2.faction, (this._liveFactionCounts.get(unit2.faction) || 0) + 1);
          }
          this._unitAliveState.set(unit2, unit2.hp > 0);
        }
        _trackUnitRemoved(unit2, { keepStepSnapshot = false } = {}) {
          this._cancelFoodTargetSearch(unit2);
          this.clearPeaRecoveryBoost(unit2);
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._unitSpatialDirty = true;
            return;
          }
          this._unitById.delete(unit2.id);
          this._syncUnitAliveCount(unit2);
          if (unit2.hp > 0 && typeof unit2.faction === "string") {
            this._adjustFactionCount(unit2.faction, -1);
          }
          this._unitAliveState.set(unit2, false);
          if (unit2.species >= 0 && unit2.species < CONFIG.unit.speciesCount) {
            this._removeGroupItem(this._speciesGroups[unit2.species], unit2);
            const TIER = Math.max(0, Math.min(CONFIG.unit.maxTier, unit2.tier | 0));
            this._removeGroupItem(this._speciesTierGroups[unit2.species * (CONFIG.unit.maxTier + 1) + TIER], unit2);
            if (!unit2.isBattleOnlySummon) {
              this._ownedSpeciesCounts[unit2.species] = this.unitCollection.residentCountsBySpecies.get(unit2.species) || 0;
            }
          }
          if (!keepStepSnapshot || !this._unitStepOrder.has(unit2) || this._unitStepOrder.get(unit2) < 0) {
            this.unitSpatial.remove(unit2);
            this._unitStepOrder.delete(unit2);
          }
        }
        _cancelFoodTargetSearch(unit2) {
          const STATE = this._foodSearchStates?.get(unit2);
          if (!STATE) {
            return false;
          }
          this._foodSearchStates.delete(unit2);
          return this._foodSearchScheduler?.cancel(STATE.key) ?? false;
        }
        clearFoodTargetSearch(unit2) {
          this._cancelFoodTargetSearch(unit2);
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
        _syncUnitAliveCount(unit2) {
          const WAS_ALIVE = this._unitAliveState?.get(unit2);
          const IS_ALIVE = unit2.hp > 0;
          if (WAS_ALIVE === IS_ALIVE) {
            return;
          }
          if (!this._unitAliveState) {
            this._unitAliveState = /* @__PURE__ */ new Map();
          }
          this._unitAliveState.set(unit2, IS_ALIVE);
          if (typeof unit2.faction === "string") {
            this._adjustFactionCount(unit2.faction, IS_ALIVE ? 1 : -1);
          }
        }
        _unitForId(id) {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._rebuildUnitSpatialIndex(this.units);
          }
          return this._unitById.get(id);
        }
        _unitIsActive(unit2) {
          return this._unitById.get(unit2?.id) === unit2;
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
        _collectContactOrders(unit2, minimumOrder, maximumOrder, out) {
          const RADIUS = unit2.radius + CONFIG.unit.maxRadius + 0.22;
          this.unitSpatial.queryAABB(
            unit2.x - RADIUS,
            unit2.y - RADIUS,
            unit2.x + RADIUS,
            unit2.y + RADIUS,
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
          this._activeBreedReservations = /* @__PURE__ */ new Map();
          this._benched = /* @__PURE__ */ new Set();
          this._ejectQueue = [];
          this._bossHitBatch = [];
          this._benchRevision = 0;
          this._fieldCache = { revision: -1, bench: -1, list: [] };
          this._deployReadyTime = 0;
          this.insideTower = false;
          this.tower = {
            active: false,
            floor: 0,
            kind: "battle",
            ...freshTowerRun(),
            sleepUntil: /* @__PURE__ */ new Map(),
            record: false
          };
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
            farm: 0
          };
          this.playerProgression = createPlayerProgressionState();
          this.workBasisPoints = CONFIG.farm.work.defaultBasisPoints;
          this.breedWeights = null;
          this.deployOrder = Array.from({ length: CONFIG.unit.speciesCount }, (_, species) => species);
          this._deployCount = 0;
          this._workerIds = /* @__PURE__ */ new Set();
          resetWork(this);
          this._workerRates = /* @__PURE__ */ new Map();
          this._workRate = 0;
          this._workCount = 0;
          this._nextWorkerRefreshTick = 0;
          this.starter = 0;
          this.notices = [];
          this.eventSequence = 0;
          this.foodTaps = {
            produced: 0,
            revision: 0
          };
          this.projectiles = [];
          this.cornAttachments = CornAttachmentModel.createManager();
          this.attackSerial = 0;
          this.projectileSerial = 0;
          this.bossSummonSerial = 0;
          this.combatLog = [];
          this.scene = "farm";
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
          for (let i = 0; i < CONFIG.farm.work.starterUnits; i++) {
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
          return this.roster.residents().some((unit2) => unit2.down > 0 || unit2.cooldown > 0 || !unit2.mature);
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
          return CONFIG.farm.capacity.max;
        }
        get ownedPopulation() {
          return this.roster.ownedPopulation();
        }
        // The one answer to "may another unit join the farm?": a placed unit and a reserved birth each take one slot.
        // A birth that already holds a reservation passes its own slot back by naming itself as `reservationOwner`.
        freeRoom(reservationOwner = null) {
          const OWN = reservationOwner && this._activeBreedReservations?.has(reservationOwner) ? 1 : 0;
          return this.capacity - this.ownedPopulation - this.birthReservations + OWN;
        }
        get birthReservations() {
          return this._activeBreedReservations?.size || 0;
        }
        get pendingRewardPopulation() {
          return (this.bossRewardReceipts || []).reduce(
            (total, receipt) => total + (Number.isSafeInteger(receipt.queuedCount) ? receipt.queuedCount : 0),
            0
          );
        }
        sortActiveFarm(order = "mixed") {
          if (this.scene !== "farm" || this.farmBossEvent?.phase !== "idle" || !["species", "tier-high", "tier-low"].includes(order)) {
            return false;
          }
          const UNITS = this.roster.residents();
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
          if (!this.unitCollection.reorder(UNITS.map((unit2) => unit2.id))) {
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
          return CONFIG.farm.breeding.cooldownSeconds;
        }
        breedGrowthDuration() {
          return this.breedCooldownDuration() / 2;
        }
        abilityProgressionFor(unit2) {
          if (hasFaction(unit2, FACTION_CONFIG.ENEMY)) {
            return null;
          }
          return SIMULATION_SCENES[this.scene].progressionFor(this, unit2);
        }
        highestSpeciesTiers() {
          const TIERS2 = Array(CONFIG.unit.speciesCount).fill(0);
          for (const UNIT_LOCAL of this.roster.residents()) {
            TIERS2[UNIT_LOCAL.species] = Math.max(TIERS2[UNIT_LOCAL.species], UNIT_LOCAL.tier);
          }
          return TIERS2;
        }
        investAbilityNode(abilityId, nodeId) {
          const IN_COMBAT = this.farmBossEvent?.phase !== "idle";
          const RESULT = purchaseAbilityNode(this.playerProgression, abilityId, nodeId, {
            location: this.scene,
            inCombat: IN_COMBAT,
            highestSpeciesTier: this.highestSpeciesTiers()
          });
          if (RESULT.ok) {
            this.playerProgression = RESULT.state;
            this.markProgressChanged();
          }
          return RESULT;
        }
        resetProgression(scope) {
          const IN_COMBAT = this.farmBossEvent?.phase !== "idle";
          const RESULT = resetPlayerProgression(this.playerProgression, scope, {
            location: this.scene,
            inCombat: IN_COMBAT
          });
          if (RESULT.ok) {
            this.playerProgression = RESULT.state;
            this.markProgressChanged();
          }
          return RESULT;
        }
        resetAbilityTree() {
          return this.resetProgression({ type: "abilities" });
        }
        spawnLobProjectile(unit2, action, shot, projectileEffect = null) {
          if (this.projectiles.length >= CONFIG.battle.capacity.projectiles) {
            return null;
          }
          const ID = ++this.projectileSerial, ATTACK_CONTEXT = this.createAttackContext(unit2, {
            attackMultiplier: shot.attackMultiplier ?? this.speciesAbilityDamageMultiplier(unit2),
            attackKind: abilityProfile(unit2.species).kind
          });
          const PROJECTILE2 = {
            id: ID,
            owner: unit2.id,
            ownerGeneration: unit2.generation,
            targetId: action.targetId || "boss",
            targetGeneration: action.targetGeneration || 0,
            faction: unit2.faction,
            isFormationClone: unit2.isFormationClone,
            ownerId: unit2.ownerId,
            species: unit2.species,
            tier: unit2.tier,
            path: structuredClone(action.path),
            elapsed: 0,
            x: unit2.x,
            y: unit2.y,
            z: 0.45,
            ...seedProjectileDimensions(unit2),
            hit: false,
            attackMultiplier: shot.attackMultiplier ?? this.speciesAbilityDamageMultiplier(unit2),
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
                ownerId: unit2.ownerId,
                faction: unit2.faction,
                isFormationClone: unit2.isFormationClone,
                species: unit2.species,
                tier: unit2.tier,
                x: unit2.x,
                y: unit2.y,
                z: unit2.z || 0,
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
        speciesAbilityDamageMultiplier(unit2) {
          return abilityProfile(unit2.species).skillMultiplier;
        }
        spawnChestnutThorn(unit2, action, config, shotIndex) {
          if (this.projectiles.length >= CONFIG.battle.capacity.projectiles) {
            return false;
          }
          const TARGET = action.thornTargetId === "boss" ? this.boss : this._unitForId(action.thornTargetId);
          if (!TARGET || TARGET.hp <= 0) {
            return false;
          }
          if (TARGET.generation !== action.thornTargetGeneration) {
            return false;
          }
          const ATTACK_CONTEXT = this.createAttackContext(unit2, {
            attackMultiplier: config.attackMultiplier,
            attackKind: "chestnut-thorns"
          }), PATH2 = BALLISTICS.create(
            {
              x: unit2.x,
              y: unit2.y,
              z: unit2.z || 0
            },
            action.target,
            "punch"
          );
          PATH2.height = 0.7;
          this.projectiles.push({
            id: ++this.projectileSerial,
            owner: unit2.id,
            ownerGeneration: unit2.generation,
            targetId: action.thornTargetId,
            targetGeneration: action.thornTargetGeneration,
            faction: unit2.faction,
            ownerId: unit2.ownerId,
            species: unit2.species,
            tier: unit2.tier,
            path: PATH2,
            elapsed: 0,
            x: unit2.x,
            y: unit2.y,
            z: unit2.z || 0,
            radius: scaleAttackArea(0.08, unit2),
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
            isFormationClone: unit2.isFormationClone,
            fanIndex: shotIndex
          });
          return true;
        }
        createFormationClone(original) {
          const ID = this.nextId++, CLONE = new UNIT(ID, original.species, original.tier, original.x + 0.3, original.y + 0.1);
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
        handleUnitDeath(unit2) {
          return this.mutateUnits(this._handleUnitDeath, unit2);
        }
        _handleUnitDeath(unit2) {
          if (!this.unitCollection.has(unit2)) {
            return false;
          }
          const SPLIT_BEFORE = unit2.splitUsedThisBattle, DIED = unit2.die();
          return DIED && !SPLIT_BEFORE && unit2.splitUsedThisBattle;
        }
        processUnitDeath(unit2) {
          return this.mutateUnits(this._processUnitDeath, unit2);
        }
        // The run's passive cards in a fight. A hit gains from the attacker's low health, the fight's first seconds and the
        // allies fallen so far; a unit hurt while low takes less. All of it is zero outside a tower climb.
        passiveDamageScale(source, sourceMaxHp, target, targetMaxHp) {
          const TOWER = this.tower;
          if (!TOWER.active) {
            return 1;
          }
          const TOTALS = TOWER.passives, SETTINGS = PASSIVE_SETTINGS;
          let scale = 1;
          if (hasFaction(source, FACTION_CONFIG.PLAYER)) {
            scale += (source.hp <= sourceMaxHp * SETTINGS.lastStandBelow ? TOTALS["last-stand"] || 0 : 0) + (this.farmBossEvent.elapsed <= SETTINGS.openingSeconds ? TOTALS.opening || 0 : 0) + (TOTALS.vengeance || 0) * Math.min(TOWER.fallen, SETTINGS.vengeanceMaxFallen);
          }
          return scale * (target === this.boss ? 1 : this.passiveReceivedScale(target, targetMaxHp));
        }
        passiveReceivedScale(unit2, maxHp = STATS(unit2.tier, unit2.species).maxHp) {
          const TOWER = this.tower;
          if (!TOWER.active || !hasFaction(unit2, FACTION_CONFIG.PLAYER) || unit2.hp > maxHp * PASSIVE_SETTINGS.resolveBelow) {
            return 1;
          }
          return 1 - Math.min(PASSIVE_SETTINGS.resolveMaxReduction, TOWER.passives.resolve || 0);
        }
        // A unit that took a killing blow holds on once per fight, at the card's share of its health.
        passiveUndying(unit2) {
          const TOWER = this.tower, RESTORE = TOWER.passives.undying;
          if (!TOWER.active || !RESTORE || unit2.hp > 0 || !hasFaction(unit2, FACTION_CONFIG.PLAYER) || unit2.isBattleOnlySummon || TOWER.undyingUsed.has(unit2.id)) {
            return;
          }
          TOWER.undyingUsed.add(unit2.id);
          unit2.hp = Math.max(
            1,
            STATS(unit2.tier, unit2.species).maxHp * Math.min(PASSIVE_SETTINGS.undyingMaxRestore, RESTORE)
          );
          this.combat("passive-undying", {
            unit: unit2.id,
            x: unit2.x,
            y: unit2.y,
            z: unit2.z,
            radius: unit2.radius,
            height: unit2.height
          });
        }
        // An ally falls: vengeance counts it and the helper card heals the ones standing near.
        passiveAllyFell(unit2) {
          const TOWER = this.tower;
          if (!TOWER.active || unit2.isBattleOnlySummon || !hasFaction(unit2, FACTION_CONFIG.PLAYER)) {
            return;
          }
          TOWER.fallen++;
          const HEAL = TOWER.passives.helper || 0, VENGEANCE = TOWER.passives.vengeance || 0;
          if (!HEAL && !VENGEANCE) {
            return;
          }
          const NEAR = this.unitCollection.items.filter(
            (other) => other !== unit2 && other.hp > 0 && !other.isBattleOnlySummon && hasFaction(other, FACTION_CONFIG.PLAYER) && Math.hypot(other.x - unit2.x, other.y - unit2.y) <= PASSIVE_SETTINGS.helperRadius
          ).sort(
            (a, b) => Math.hypot(a.x - unit2.x, a.y - unit2.y) - Math.hypot(b.x - unit2.x, b.y - unit2.y) || a.id - b.id
          );
          if (HEAL) {
            for (const OTHER of NEAR) {
              applyHealing(OTHER, STATS(OTHER.tier, OTHER.species).maxHp * HEAL);
            }
          }
          const TARGETS = NEAR.slice(0, 6).map((other) => ({ x: other.x, y: other.y, z: other.z, height: other.height }));
          for (const KIND of [HEAL && "passive-helper", VENGEANCE && "passive-vengeance"]) {
            if (KIND) {
              this.combat(KIND, { x: unit2.x, y: unit2.y, z: unit2.z, height: unit2.height, targets: TARGETS });
            }
          }
        }
        _processUnitDeath(unit2) {
          this.passiveAllyFell(unit2);
          unit2.ability.interrupt();
          unit2.specialAbility?.interrupt();
          unit2.ability.resetCombatEffects?.();
          this.clearPeaRecoveryBoost(unit2);
          this.onCombatResolved.emit({ allyDeaths: unit2.faction === "player" && !unit2.isFormationClone ? 1 : 0 });
          this._syncUnitAliveCount(unit2);
          if (!unit2.isBattleOnlySummon) {
            this.markProgressChanged();
          }
          if (unit2.isBattleOnlySummon) {
            if (unit2.isFormationClone) {
              this.emit("formation-copy-death", unit2.x, unit2.y, unit2.z, { duration: 0.6 });
            }
            unit2.down = 0;
            this.removeUnit(unit2, { keepStepSnapshot: true });
            return false;
          }
          const IN_BATTLE = SIMULATION_SCENES[this.scene].inBattle(this);
          const DESCRIPTORS = unit2.ability.deathSplitDescriptors?.(this, IN_BATTLE) || [];
          if (!DESCRIPTORS.length) {
            return false;
          }
          unit2.splitUsedThisBattle = true;
          unit2.down = CONFIG.unit.corpseRecoverySeconds;
          for (let index = 0; index < DESCRIPTORS.length; index++) {
            const DESC = DESCRIPTORS[index], ANGLE = (index + 0.5) * Math.PI * 2 / DESCRIPTORS.length, ID = SIMULATION_SCENES[this.scene].summonId(this);
            const X = unit2.x + Math.cos(ANGLE) * 0.38, Y = unit2.y + Math.sin(ANGLE) * 0.38, CHILD = new UNIT(ID, DESC.species, DESC.tier, X, Y);
            Object.assign(CHILD, DESC, {
              ownerId: unit2.ownerId,
              farmId: unit2.farmId,
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
            owner: unit2.id,
            ownerGeneration: unit2.generation,
            species: unit2.species,
            x: unit2.x,
            y: unit2.y,
            z: 0,
            life: 0,
            duration: 0.7
          });
          this.combat("peanut-split", {
            effectId: EFFECT_ID,
            unit: unit2.id,
            ownerId: unit2.ownerId,
            species: unit2.species,
            count: DESCRIPTORS.length,
            x: unit2.x,
            y: unit2.y
          });
          return true;
        }
        processUnitRevival(unit2) {
          return this.mutateUnits(this._processUnitRevival, unit2);
        }
        _processUnitRevival(unit2) {
          this._syncUnitAliveCount(unit2);
          this.combat("unit-recover", { unit: unit2.id, x: unit2.x, y: unit2.y });
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
          this.unitCollection.removeWhere((unit2) => unit2.isBattleOnlySummon);
          this.projectiles = [];
          this.cornAttachments = CornAttachmentModel.createManager();
          return true;
        }
        senseEnemy(unit2) {
          if (unit2.hp <= 0 || !unit2.dropLanded) {
            return null;
          }
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._rebuildUnitSpatialIndex(this.units);
          }
          const BATTLE_ACTIVE = SIMULATION_SCENES[this.scene].canSenseBoss(this);
          const BOSS_TARGET = BATTLE_ACTIVE && this.boss?.active && areOpposingFactions(unit2, this.boss) ? this.boss : null;
          let hasUnitEnemy = false;
          for (const [FACTION, COUNT] of this._liveFactionCounts) {
            if (FACTION !== unit2.faction && COUNT > 0) {
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
            const DISTANCE = Math.hypot(unit2.x - target.x, unit2.y - target.y), ID = target.id || 0;
            if (DISTANCE <= unit2.perceptionRange + target.radius + 1e-9 && (DISTANCE < nearestDistance || DISTANCE === nearestDistance && ID < nearestId)) {
              nearest = target;
              nearestDistance = DISTANCE;
              nearestId = ID;
            }
          };
          CONSIDER(BOSS_TARGET);
          if (hasUnitEnemy) {
            const EXTENT = Math.max(0, unit2.perceptionRange + CONFIG.unit.maxRadius + 1e-9);
            this.unitSpatial.queryAABB(
              unit2.x - EXTENT,
              unit2.y - EXTENT,
              unit2.x + EXTENT,
              unit2.y + EXTENT,
              this._unitCandidates
            );
            for (const CANDIDATE of this._unitCandidates) {
              if (CANDIDATE !== unit2 && this._unitIsActive(CANDIDATE) && CANDIDATE.hp > 0 && CANDIDATE.dropLanded && areOpposingFactions(unit2, CANDIDATE)) {
                CONSIDER(CANDIDATE);
              }
            }
          }
          return nearest;
        }
        random() {
          return this.rng.nextUint32() / 4294967296;
        }
        randomBossSpecies() {
          return Math.min(CONFIG.unit.speciesCount - 1, Math.floor(this.random() * CONFIG.unit.speciesCount));
        }
        spawn(species, tier, x, y, { birthReservationOwner = null } = {}) {
          if (this.scene === "farm") {
            if (this.freeRoom(birthReservationOwner) <= 0) {
              return null;
            }
          } else if (this.units.length >= SIMULATION_SCENES[this.scene].capacity(this)) {
            return null;
          }
          const U = new UNIT(this.nextId++, species, CLAMP2(tier, 1, CONFIG.unit.maxTier), x, y);
          this.addUnit(U);
          return U;
        }
        addUnit(unit2, options) {
          if (!Number.isSafeInteger(unit2.generation) || unit2.generation <= 0) {
            unit2.generation = ++this.entityGenerationSerial;
          } else {
            this.entityGenerationSerial = Math.max(this.entityGenerationSerial, unit2.generation);
          }
          return this.unitCollection.add(unit2, options);
        }
        removeUnit(unit2, options) {
          return this.unitCollection.remove(unit2, options);
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
        isWorker(unit2) {
          return this._workerIds.has(unit2.id);
        }
        // The grain piles of the farm plot on screen.
        get piles() {
          return this._piles;
        }
        workSwingOf(id) {
          return this._swings.get(id) || null;
        }
        // Settles the time the player was away; returns a summary, or null when nothing applies.
        settleOffline(seconds) {
          return applyOffline(this, CONFIG, seconds);
        }
        workOrder(unit2) {
          return workOrder(this, unit2);
        }
        canBreedNow(unit2) {
          return unit2.breedingEligible !== false && !this._workerIds.has(unit2.id);
        }
        // The share of the farm that makes food instead of breeding, in basis points.
        setWorkBasisPoints(basisPoints) {
          if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 1e4) {
            return false;
          }
          this.workBasisPoints = basisPoints;
          this._nextWorkerRefreshTick = 0;
          this.refreshWorkers();
          return true;
        }
        // Who gets the breeding: one weight per species (null: even by headcount).
        setBreedWeights(weights) {
          if (weights !== null && !(Array.isArray(weights) && weights.length <= CONFIG.unit.speciesCount && weights.every((weight) => Number.isSafeInteger(weight) && weight >= 0) && weights.some((weight) => weight > 0))) {
            return false;
          }
          this.breedWeights = weights;
          this._nextWorkerRefreshTick = 0;
          this.refreshWorkers();
          return true;
        }
        // The slider's share of each species' adults work; the rest breed. A worker does not eat or breed, and its
        // output scales with its tier. A full field only pauses the food they make; who works never depends on it.
        refreshWorkers() {
          const WORK = CONFIG.farm.work, RATIO = this.workBasisPoints / 1e4, NEXT = /* @__PURE__ */ new Set(), RATES = /* @__PURE__ */ new Map();
          let total = 0;
          if (this.scene === "farm") {
            const BY_SPECIES = /* @__PURE__ */ new Map();
            for (const UNIT_LOCAL of this.roster.residents()) {
              if (!UNIT_LOCAL.mature || UNIT_LOCAL.hp <= 0 || UNIT_LOCAL.down > 0 || UNIT_LOCAL.isBattleOnlySummon || UNIT_LOCAL.isFormationClone || !this._workerIds.has(UNIT_LOCAL.id) && this.unitCollection.reservationOwner(UNIT_LOCAL)) {
                continue;
              }
              if (!BY_SPECIES.has(UNIT_LOCAL.species)) {
                BY_SPECIES.set(UNIT_LOCAL.species, []);
              }
              BY_SPECIES.get(UNIT_LOCAL.species).push(UNIT_LOCAL);
            }
            const WORKERS = workersBySpecies(
              new Map([...BY_SPECIES].map(([species, list]) => [species, list.length])),
              RATIO,
              this.breedWeights
            );
            for (const [SPECIES, LIST] of BY_SPECIES) {
              LIST.sort((a, b) => a.id - b.id);
              const COUNT = WORKERS.get(SPECIES);
              for (let index = 0; index < COUNT; index++) {
                const WORKER = LIST[index], RATE = (1 + WORK.tierBonus * (WORKER.tier - 1)) / WORK.secondsPerFood;
                NEXT.add(WORKER.id);
                RATES.set(WORKER.id, RATE);
                total += RATE;
              }
            }
          }
          for (const ID of NEXT) {
            if (!this._workerIds.has(ID)) {
              const UNIT_LOCAL = this._unitById.get(ID);
              if (UNIT_LOCAL) {
                this.releaseMate(UNIT_LOCAL);
                this.clearFoodTargetSearch(UNIT_LOCAL);
              }
            }
          }
          this._workerIds = NEXT;
          this._workerRates = RATES;
          this._workCount = NEXT.size;
          this._workRate = total;
          assignWorkers(this, CONFIG);
        }
        get warehouseFull() {
          return this.food.length >= CONFIG.farm.work.maxFood;
        }
        get workerCount() {
          return this._workCount;
        }
        // Food per minute produced by workers right now.
        get workFoodPerMinute() {
          let rate = 0;
          for (const [ID] of this._workAssign) {
            rate += this._workerRates.get(ID) || 0;
          }
          return rate * 60;
        }
        advanceWork(elapsed) {
          if (!Number.isFinite(elapsed) || elapsed <= 0) {
            return;
          }
          if (this.simulationTick >= this._nextWorkerRefreshTick) {
            this._nextWorkerRefreshTick = this.simulationTick + CONFIG.farm.work.refreshTicks;
            this.refreshWorkers();
          }
          if (this.scene === "farm") {
            stepWork(this, CONFIG, Math.min(elapsed, 0.1));
          }
        }
        spawnFood(x, y, count = 1, { from = null } = {}) {
          let spawned = 0;
          for (let i = 0; i < count && this.food.length < CONFIG.farm.work.maxFood; i++) {
            const RADIUS_X = CONFIG.farm.arena.radiusX - 1.5, RADIUS_Y = CONFIG.farm.arena.radiusY - 1.1;
            let tx = CLAMP2(x, -RADIUS_X, RADIUS_X);
            let ty = CLAMP2(y, -RADIUS_Y, RADIUS_Y);
            const BOUNDARY = Math.hypot(tx / RADIUS_X, ty / RADIUS_Y);
            if (BOUNDARY > 1) {
              tx /= BOUNDARY;
              ty /= BOUNDARY;
            }
            const ANGLE = this.random() * Math.PI * 2, SX = from ? from.x : Math.cos(ANGLE) * (CONFIG.farm.arena.radiusX + 0.7), SY = from ? from.y : Math.sin(ANGLE) * (CONFIG.farm.arena.radiusY + 0.2);
            const DURATION3 = 0.85 + this.random() * 0.25, Z = from ? from.z : 0.3;
            const FOOD2 = {
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
            this.food.push(FOOD2);
            this._trackFoodAdded(FOOD2);
            this.emit("feed", tx, ty);
            this.markProgressChanged();
            spawned++;
          }
          return spawned;
        }
        // Start a climb: the farm's units go up the tower floor by floor, from any floor up to the best one so far.
        startTower(startFloor = 1) {
          this._flushEjected();
          if (this.scene !== "farm" || this.boss.active || this.farmBossEvent.phase !== "idle" || this.tower.active || !this.units.some((u) => !u.isBattleOnlySummon && u.hp > 0)) {
            return false;
          }
          const FLOOR = Math.min(Math.max(1, Math.floor(startFloor) || 1), Math.max(1, this.playerProgression.towerBest)), KIND = FLOOR % CONFIG.farm.tower.midBossEvery === 0 ? "mid" : "battle";
          const SLEEP = new Map(this.units.filter((u) => !u.isBattleOnlySummon && u.hp <= 0).map((u) => [u.id, FLOOR]));
          this.tower = {
            pendingKind: KIND,
            active: true,
            floor: FLOOR,
            kind: KIND,
            ...freshTowerRun(),
            sleepUntil: SLEEP,
            record: false
          };
          this.farmBossEvent = { ...this.farmBossEvent, phase: "marching", elapsed: 0, outcome: "fighting" };
          this.markProgressChanged();
          return true;
        }
        // One unit's walk to the tower door while the march lasts.
        _marchUnit(unit2) {
          if (unit2.hp <= 0 || unit2.isBattleOnlySummon) {
            return;
          }
          const GATE = this.towerGate, SPREAD = unit2.id * 7 % 11 - 5;
          this.steer(unit2, GATE.x + SPREAD * 0.25, GATE.y, 0, CONFIG.farm.tower.marchSpeed);
        }
        // Where the tower door is: the middle of the back edge of the farm.
        get towerGate() {
          return { x: 0, y: CONFIG.farm.arena.radiusY };
        }
        benchUnit(unit2) {
          this._benched.add(unit2);
          this._benchRevision++;
          this._unitSpatialDirty = true;
        }
        // The march is over: whoever got to the door is inside, and the first floor starts.
        finishMarch() {
          this.insideTower = true;
          return this._beginFloor(this.tower.pendingKind);
        }
        // Back out on the farm: the troops drop out of the tower door one after another and scatter over the whole farm. Each
        // one is already resting on its landing spot (so a save taken now is sound) but stays in hand until its turn.
        _leaveTowerView() {
          this.insideTower = false;
          const SETTINGS = CONFIG.farm.tower, ARENA = CONFIG.farm.arena, UNITS = this.unitCollection.items.filter((unit2) => !unit2.isBattleOnlySummon);
          for (let index = UNITS.length - 1; index > 0; index--) {
            const OTHER = Math.floor(this.random() * (index + 1));
            [UNITS[index], UNITS[OTHER]] = [UNITS[OTHER], UNITS[index]];
          }
          this._ejectQueue = UNITS.map((unit2, index) => {
            const AT = ARENA_GEOMETRY.clamp(
              { x: (this.random() * 2 - 1) * (ARENA.radiusX - 2), y: (this.random() * 2 - 1) * (ARENA.radiusY - 2) },
              "farm",
              1
            );
            Object.assign(unit2, { x: AT.x, y: AT.y, z: 0, vx: 0, vy: 0, vz: 0 });
            return { unit: unit2, at: this.time + index / UNITS.length * SETTINGS.ejectSeconds, target: AT };
          });
          this._benched = new Set(UNITS);
          this._benchRevision++;
          this._unitSpatialDirty = true;
        }
        // The next troop whose turn has come leaves the door in an arc that lands on its spot.
        _releaseEjected() {
          const SETTINGS = CONFIG.farm.tower, GATE = this.towerGate;
          while (this._ejectQueue.length && this._ejectQueue[0].at <= this.time) {
            const NEXT = this._ejectQueue.shift(), UNIT_LOCAL = NEXT.unit, TARGET = NEXT.target;
            this._benched.delete(UNIT_LOCAL);
            this._benchRevision++;
            if (this.unitCollection.has(UNIT_LOCAL)) {
              const X = GATE.x + (this.random() - 0.5) * 3, Y = GATE.y - 0.8, T = SETTINGS.flightSeconds;
              Object.assign(UNIT_LOCAL, {
                x: X,
                y: Y,
                z: SETTINGS.ejectHeight,
                vx: (TARGET.x - X) / T,
                vy: (TARGET.y - Y) / T,
                vz: (0.5 * CONFIG.physics.gravity * T * T - SETTINGS.ejectHeight) / T,
                // A sleeping unit has no drop landing of its own: it just falls.
                dropLanded: UNIT_LOCAL.hp <= 0
              });
            }
            this._unitSpatialDirty = true;
          }
        }
        // Whoever is still in the door when something else begins is set down on its spot at once.
        _flushEjected() {
          for (const NEXT of this._ejectQueue) {
            this._benched.delete(NEXT.unit);
          }
          this._ejectQueue.length = 0;
          this._benchRevision++;
          this._unitSpatialDirty = true;
        }
        // The next floor: its kind is drawn (tower-run.js) and its doors are what that kind offers. A fight offers its bosses,
        // a strengthening floor offers cards, an event floor offers events.
        _rollDoors() {
          const T = this.tower, FLOOR = T.floor + 1;
          T.nextKind = rollFloorKind({
            floor: FLOOR,
            since: T.since,
            random: () => this.random(),
            midBossEvery: CONFIG.farm.tower.midBossEvery,
            topFloor: CONFIG.farm.tower.topFloor
          });
          if (T.nextKind === "mid") {
            return [{ type: "fight", kind: "mid" }];
          }
          if (T.nextKind === "battle") {
            return [
              { type: "fight", kind: "battle" },
              { type: "fight", kind: "elite" }
            ];
          }
          if (T.nextKind === "event") {
            return rollEventOffers({ world: this, random: () => this.random() });
          }
          return rollCardOffers({
            floor: FLOOR,
            cards: T.cards,
            relics: T.relics,
            skillIds: FORMATION_SKILL_DEFINITIONS.map(({ id }) => id),
            passiveIds: PASSIVE_CARDS.map((card) => card.id),
            relicSlots: CONFIG.farm.tower.relicSlots,
            relicMaxLevel: CONFIG.farm.tower.relicMaxLevel,
            random: () => this.random()
          });
        }
        // Between floors everybody waits in the hand; the fallen start sleeping for tier (max 3) floors.
        afterFloor() {
          const T = this.tower;
          if (!T.active) {
            if (this.insideTower) {
              this._leaveTowerView();
            }
            return;
          }
          for (const U of this.unitCollection.items) {
            if (!U.isBattleOnlySummon && U.hp <= 0 && !T.sleepUntil.has(U.id)) {
              T.sleepUntil.set(U.id, T.floor + Math.min(CONFIG.farm.tower.sleepMax, U.tier));
            }
          }
          this._benched = new Set(this.unitCollection.items.filter((u) => !u.isBattleOnlySummon));
          this._benchRevision++;
          this._unitSpatialDirty = true;
          T.doors = this._rollDoors();
          this.markProgressChanged();
        }
        _wakeUnit(unit2) {
          unit2.revive(STATS(unit2.tier, unit2.species).maxHp);
          this.tower.sleepUntil.delete(unit2.id);
        }
        chooseDoor(index) {
          const T = this.tower, DOOR = T.doors[index];
          if (!T.active || this.farmBossEvent.phase !== "idle" || !DOOR) {
            return false;
          }
          T.floor++;
          T.since = advanceSince(T.since, T.nextKind);
          T.doors = [];
          if (DOOR.type === "fight") {
            return this._beginFloor(DOOR.kind);
          }
          if (DOOR.type === "skill") {
            T.relics.set(DOOR.id, (T.relics.get(DOOR.id) || 0) + 1);
          } else if (DOOR.type === "stat" || DOOR.type === "passive") {
            T.cards.push({ id: DOOR.id, rarity: DOOR.rarity });
            this._applyRunStats();
          } else {
            TOWER_EVENTS.find((event) => event.id === DOOR.id).apply(this);
          }
          this.playerProgression.towerBest = Math.max(this.playerProgression.towerBest, T.floor);
          T.kind = T.nextKind;
          T.doors = this._rollDoors();
          this.combat("tower-card", { floor: T.floor });
          this.markProgressChanged();
          return true;
        }
        _clearRunStats() {
          this.tower.cards = [];
          this._applyRunStats();
        }
        // The run's stat cards change every unit's stats; hit points never stay above the new top.
        _applyRunStats() {
          setRunStatMods(runStatModifiers(this.tower.cards));
          this.tower.passives = passiveTotals(this.tower.cards);
          for (const UNIT_LOCAL of this.unitCollection.items) {
            if (UNIT_LOCAL.hp > 0 && !UNIT_LOCAL.isFormationClone) {
              UNIT_LOCAL.hp = Math.min(UNIT_LOCAL.hp, STATS(UNIT_LOCAL.tier, UNIT_LOCAL.species).maxHp);
            }
          }
        }
        // Stopping after a cleared floor keeps everything that was won.
        leaveTower() {
          if (!this.tower.active || this.farmBossEvent.phase !== "idle") {
            return false;
          }
          this._endTower();
          return true;
        }
        _endTower() {
          this._clearRunStats();
          this.tower.active = false;
          this.tower.doors = [];
          this._benched.clear();
          this._benchRevision++;
          this._leaveTowerView();
          this.markProgressChanged();
        }
        _beginFloor(kind) {
          const T = this.tower;
          T.kind = kind;
          for (const UNIT_LOCAL of this.unitCollection.items) {
            if (UNIT_LOCAL.isBattleOnlySummon) {
              continue;
            }
            if (UNIT_LOCAL.hp <= 0 && T.sleepUntil.has(UNIT_LOCAL.id) && T.sleepUntil.get(UNIT_LOCAL.id) < T.floor) {
              this._wakeUnit(UNIT_LOCAL);
            } else if (UNIT_LOCAL.hp > 0) {
              UNIT_LOCAL.hp = STATS(UNIT_LOCAL.tier, UNIT_LOCAL.species).maxHp;
            }
          }
          T.fallen = 0;
          T.undyingUsed = /* @__PURE__ */ new Set();
          for (const UNIT_LOCAL of this.units) {
            if (!UNIT_LOCAL.isBattleOnlySummon) {
              UNIT_LOCAL.splitUsedThisBattle = false;
              UNIT_LOCAL.deathSplitHandled = false;
              UNIT_LOCAL.chestnutNextThornTick = 0;
            }
          }
          const SPECIES = this.randomBossSpecies();
          this.boss = this.createBoss(SPECIES);
          this.configureBossStage(T.floor, SPECIES);
          const KIND = CONFIG.farm.tower[kind];
          this.boss.maxHp = this.boss.hp = Math.round(this.boss.hp * KIND.hp);
          this.boss.attackPower *= KIND.attack;
          Object.assign(this.boss, { x: 0, y: 0, z: CONFIG.battle.dropHeight, active: true });
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
          this._benched = new Set(this.unitCollection.items.filter((u) => !u.isBattleOnlySummon));
          this._benchRevision++;
          this._deployReadyTime = this.time;
          this._deployCount = 0;
          this._unitSpatialDirty = true;
          this.markProgressChanged();
          return true;
        }
        // The units that are on the field: everything but the ones still waiting in the hand.
        _fieldUnits() {
          const CACHE = this._fieldCache;
          if (CACHE.revision !== this.unitCollection.revision || CACHE.bench !== this._benchRevision) {
            CACHE.list = this.unitCollection.items.filter((unit2) => !this._benched.has(unit2));
            CACHE.revision = this.unitCollection.revision;
            CACHE.bench = this._benchRevision;
          }
          return CACHE.list;
        }
        get handCounts() {
          const COUNTS = /* @__PURE__ */ new Map();
          for (const UNIT_LOCAL of this._benched) {
            if (UNIT_LOCAL.hp > 0) {
              COUNTS.set(UNIT_LOCAL.species, (COUNTS.get(UNIT_LOCAL.species) || 0) + 1);
            }
          }
          return COUNTS;
        }
        get fieldFighterCount() {
          let count = 0;
          for (const UNIT_LOCAL of this.units) {
            if (UNIT_LOCAL.faction === "player" && !UNIT_LOCAL.isBattleOnlySummon && UNIT_LOCAL.hp > 0) {
              count++;
            }
          }
          return count;
        }
        get deployCooldownLeft() {
          return Math.max(0, this._deployReadyTime - this.time);
        }
        // The whole order at once: it must list every species exactly once.
        setDeployOrder(order) {
          const COUNT = CONFIG.unit.speciesCount;
          if (!Array.isArray(order) || order.length !== COUNT || new Set(order).size !== COUNT || !order.every((species) => Number.isSafeInteger(species) && species >= 0 && species < COUNT)) {
            return false;
          }
          this.deployOrder = [...order];
          return true;
        }
        // A fight sends everyone in by itself: one unit every 0.1 s from all around the hall's edge, the species at the
        // front of the order first, until nobody is left waiting.
        _autoDeploy() {
          if (this.scene !== "farm" || !["dropping", "fighting"].includes(this.farmBossEvent.phase) || this._benched.size === 0) {
            return;
          }
          const ARENA = CONFIG.farm.arena, ANGLE = this._deployCount * 2.399963229728653, X = Math.cos(ANGLE) * (ARENA.radiusX - 1), Y = Math.sin(ANGLE) * (ARENA.radiusY - 1);
          for (const SPECIES of this.deployOrder) {
            if (this.deployUnit(SPECIES, X, Y)) {
              this._deployCount++;
              return;
            }
          }
        }
        // Drops one waiting unit of the species (the strongest first) onto the spot.
        deployUnit(species, x, y) {
          const DEPLOY = CONFIG.farm.deploy;
          if (this.scene !== "farm" || !["dropping", "fighting"].includes(this.farmBossEvent.phase) || this.deployCooldownLeft > 0 || this.fieldFighterCount >= DEPLOY.fieldCap || !Number.isFinite(x) || !Number.isFinite(y)) {
            return false;
          }
          let pick = null;
          for (const UNIT_LOCAL of this._benched) {
            if (UNIT_LOCAL.species === species && UNIT_LOCAL.hp > 0 && (!pick || UNIT_LOCAL.tier > pick.tier || UNIT_LOCAL.tier === pick.tier && UNIT_LOCAL.id < pick.id)) {
              pick = UNIT_LOCAL;
            }
          }
          if (!pick) {
            return false;
          }
          const AT = ARENA_GEOMETRY.clamp({ x, y }, "farm", 1);
          this._benched.delete(pick);
          this._benchRevision++;
          Object.assign(pick, { x: AT.x, y: AT.y, z: CONFIG.battle.dropHeight, vx: 0, vy: 0, vz: 0, dropLanded: false });
          this._deployReadyTime = this.time + DEPLOY.cooldownSeconds;
          this._unitSpatialDirty = true;
          return true;
        }
        // Leaving a fight that is going on is a defeat.
        retreatFromFight() {
          if (this.farmBossEvent.phase === "dropping") {
            this.farmBossEvent.phase = "fighting";
            this.farmBossEvent.elapsed = 0;
          }
          return this.finishFarmBossEvent("defeat");
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
            // The hit volume is the drawn body of the species, exactly as for a unit.
            get radius() {
              return (0, import_definition50.bossBodyRadius)(this);
            },
            get height() {
              return (0, import_definition50.bossBodyHeight)(this);
            },
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
        // Past the time limit the boss enrages instead of ending the fight; only a wipe or a retreat loses.
        get bossEnraged() {
          return this.farmBossEvent?.phase === "fighting" && this.farmBossEvent.elapsed >= this.battleTimeLimit();
        }
        // 1-based boss phase from remaining HP: each unlockHp threshold crossed opens a phase.
        get bossPhase() {
          return 1 + BOSS_PHASE_THRESHOLDS.filter((t) => this.bossHpRatio <= t).length;
        }
        // Remaining HP as the patterns see it: elites and mid-bosses start further along, so they know their skills early.
        get bossHpRatio() {
          const EDGE = this.tower.active ? CONFIG.farm.tower[this.tower.kind]?.edge || 0 : 0;
          return (this.boss.maxHp ? this.boss.hp / this.boss.maxHp : 1) - EDGE;
        }
        // A boss fight lasts 90 seconds at stage 1 and 10 seconds longer for every stage after it.
        battleTimeLimit() {
          return 90 + 10 * Math.max(0, (this.boss.stage ?? 1) - 1);
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
        canBreedPair(a, b, requireContact = false) {
          const BATCH = !this._spatialStepActive;
          if (BATCH) {
            this._beginSpatialQueryBatch();
          }
          try {
            const OWNER = this.breedingReservationOwner(a, b), BIRTH_RESERVATION = this._activeBreedReservations?.get(OWNER) || null, RESERVATIONS_AVAILABLE = this.unitCollection.reservationOwner(a) === null || this.unitCollection.reservationOwner(a) === OWNER;
            return this.scene === "farm" && a !== b && !a.isBattleOnlySummon && !b.isBattleOnlySummon && this.canBreedNow(a) && this.canBreedNow(b) && a.hp > 0 && b.hp > 0 && a.species === b.species && a.mature && b.mature && a.fed && b.fed && a.cooldown <= 0 && b.cooldown <= 0 && this.freeRoom(BIRTH_RESERVATION ? OWNER : null) > 0 && this._unitIsActive(a) && this._unitIsActive(b) && RESERVATIONS_AVAILABLE && (this.unitCollection.reservationOwner(b) === null || this.unitCollection.reservationOwner(b) === OWNER) && (!requireContact || Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius + 0.2);
          } finally {
            if (BATCH) {
              this._endSpatialQueryBatch();
            }
          }
        }
        breedingReservationOwner(a, b) {
          return BREED_RESERVATION_OWNER(a.id, b.id);
        }
        cancelBreedPlans() {
          for (const OWNER of [...this._activeBreedReservations?.keys() || []]) {
            this.releaseActiveBreedReservation(OWNER);
          }
          this._activeBreedReservations?.clear();
        }
        reserveActiveBreedPair(a, b) {
          const OWNER = this.breedingReservationOwner(a, b), EXISTING = this._activeBreedReservations.get(OWNER);
          if (EXISTING) {
            return EXISTING.parentIds.includes(a.id) && EXISTING.parentIds.includes(b.id);
          }
          if (!a || !b || !this.canBreedPair(a, b) || a.down > 0 || b.down > 0 || a.mateId && a.mateId !== b.id || b.mateId && b.mateId !== a.id) {
            return false;
          }
          const RESERVATION = { species: a.species, owner: OWNER };
          if (!this.unitCollection.reserve(OWNER, [a, b])) {
            return false;
          }
          this._activeBreedReservations.set(OWNER, {
            owner: OWNER,
            parentIds: [a.id, b.id],
            reservation: RESERVATION
          });
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
          this.unitCollection.releaseReservations(owner);
          for (const ID of RESERVATION.parentIds) {
            const UNIT_LOCAL = this.unitCollection.unitById(ID);
            if (UNIT_LOCAL?.mateId === RESERVATION.parentIds.find((otherId) => otherId !== ID)) {
              UNIT_LOCAL.mateId = 0;
            }
          }
          return true;
        }
        _isValidBreedReservation(unit2, owner) {
          if (!owner?.startsWith("breed:")) {
            return false;
          }
          const MATE = this._unitById.get(unit2.mateId);
          return !!(MATE && MATE.mateId === unit2.id && this.unitCollection.reservationOwner(MATE) === owner && this.breedingReservationOwner(unit2, MATE) === owner && this.canBreedPair(unit2, MATE) && !this.senseEnemy(unit2) && !this.senseEnemy(MATE));
        }
        releaseMate(unit2) {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._rebuildUnitSpatialIndex(this.units);
          }
          const MATE = this._unitById.get(unit2.mateId);
          if (unit2.mateId && this.releaseActiveBreedReservation(
            this.breedingReservationOwner(unit2, this.unitCollection.unitById(unit2.mateId))
          )) {
            return true;
          }
          unit2.mateId = 0;
          if (MATE && MATE.mateId === unit2.id) {
            MATE.mateId = 0;
          }
          const OWNER = this.unitCollection.reservationOwner(unit2);
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
        findOrReserveMate(unit2) {
          const BATCH = !this._spatialStepActive;
          if (BATCH) {
            this._beginSpatialQueryBatch();
          }
          try {
            if (this.scene !== "farm" || !unit2.mature || !unit2.fed || unit2.cooldown > 0 || unit2.hp <= 0 || this.senseEnemy(unit2)) {
              this.releaseMate(unit2);
              return null;
            }
            if (this.freeRoom() <= 0) {
              this.releaseMate(unit2);
              return null;
            }
            if (unit2.mateId) {
              const CURRENT = this._unitById.get(unit2.mateId);
              if (CURRENT && CURRENT.mateId === unit2.id && this.canBreedPair(unit2, CURRENT)) {
                return CURRENT;
              }
              this.releaseMate(unit2);
            }
            if (this.simulationTick < (unit2.nextMateSearchTick || 0)) {
              return null;
            }
            const CANDIDATES = [];
            for (const CANDIDATE of this.roster.residentsOfSpecies(unit2.species)) {
              if (CANDIDATE === unit2 || CANDIDATE.mateId || CANDIDATE.hp <= 0 || CANDIDATE.down > 0 || !CANDIDATE.mature || !CANDIDATE.fed || CANDIDATE.cooldown > 0 || !this.canBreedNow(CANDIDATE) || this.unitCollection.reservationOwner(CANDIDATE) || !this.canBreedPair(unit2, CANDIDATE)) {
                continue;
              }
              CANDIDATES.push(CANDIDATE);
            }
            CANDIDATES.sort(
              (a, b) => Math.hypot(a.x - unit2.x, a.y - unit2.y) - Math.hypot(b.x - unit2.x, b.y - unit2.y) || a.id - b.id
            );
            for (const MATE of CANDIDATES) {
              if (!this.reserveActiveBreedPair(unit2, MATE)) {
                continue;
              }
              unit2.nextMateSearchTick = this.simulationTick + 10;
              return MATE;
            }
            unit2.nextMateSearchTick = this.simulationTick + 10;
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
            if (requireNoEnemy && materials.some((unit2) => this.senseEnemy(unit2))) {
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
                  bestMaterialIds = MATERIALS.map((unit2) => unit2.id);
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
              reason: "레이드 중에는 합성할 수 없어요."
            };
          }
          const MATERIALS = this.selectMergeMaterials();
          if (!MATERIALS) {
            return {
              available: false,
              code: "no-eligible-materials",
              reason: "합성할 수 있는 같은 병종이 부족해요."
            };
          }
          return {
            available: true,
            code: "ready",
            tier: MATERIALS[0].tier + 1,
            materialCount: MATERIALS.length,
            materials: MATERIALS,
            reason: "T" + MATERIALS[0].tier + " " + MATERIALS.length + "마리 → T" + (MATERIALS[0].tier + 1) + " 합성"
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
          const MATERIAL_IDS = MATERIALS.map((unit2) => unit2.id), OWNER = MERGE_RESERVATION_OWNER(MATERIAL_IDS), CENTER_X = MATERIALS.reduce((sum, unit2) => sum + unit2.x, 0) / MATERIALS.length, CENTER_Y = MATERIALS.reduce((sum, unit2) => sum + unit2.y, 0) / MATERIALS.length, DURATION3 = CONFIG.farm.merge.animationSeconds, SEQUENCE_WINDOW = DURATION3 * 0.72, STEP = SEQUENCE_WINDOW / MATERIALS.length;
          const REPLACE_OWNERS = [
            ...new Set(
              MATERIALS.map((unit2) => this.unitCollection.reservationOwner(unit2)).filter(
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
            (unit2, index) => this.effects.push({
              kind: "merge-material",
              taskKey: OWNER,
              x: unit2.x,
              y: unit2.y,
              z: unit2.z,
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
        pair(a, b) {
          return this.mutateUnits(this._pair, a, b);
        }
        _pair(a, b) {
          return FARM_MODES.breed.pair(this, a, b);
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
          const ORDERED = [...materials], FIRST = ORDERED[0], MATERIAL_IDS = ORDERED.map((unit2) => unit2.id), X = TASK.centerX, Y = TASK.centerY, Z = TASK.centerZ;
          const RESULT = new UNIT(this.nextId, FIRST.species, FIRST.tier + 1, X, Y);
          RESULT.dropLanded = false;
          RESULT.meals = 1;
          RESULT.growth = CONFIG.farm.breeding.matureMeals;
          RESULT.growthDuration = this.breedGrowthDuration();
          RESULT.growthElapsed = RESULT.growthDuration;
          RESULT.z = Math.max(0, Z - RESULT.height * 0.85);
          RESULT.vz = -CONFIG.farm.merge.resultFallVelocity;
          RESULT.cooldown = CONFIG.farm.merge.cooldownSeconds;
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
                (unit2, index) => this.effects.push({
                  kind: "merge-material",
                  x: unit2.x,
                  y: unit2.y,
                  z: 0.2,
                  targetX: X,
                  targetY: Y,
                  targetZ: Z,
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
            span: CONFIG.farm.merge.celebrationSeconds,
            tier: RESULT.tier
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
          const UNITS = this._stepUnits;
          UNITS.length = 0;
          for (const UNIT_LOCAL of this.units) {
            if (UNIT_LOCAL.spawnedAtSimulationTick !== this.simulationTick) {
              UNITS.push(UNIT_LOCAL);
            }
          }
          this._rebuildUnitSpatialIndex(UNITS);
          this._releaseEjected();
          this.formationSkills.update(dt);
          const SCENE = SIMULATION_SCENES[this.scene];
          SCENE.advanceClock(this, dt);
          this._autoDeploy();
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
          this.unitCollection.removeWhere((unit2) => unit2.isBattleOnlySummon && unit2.hp <= 0);
          UNITS.length = 0;
          this.unitCollection.releaseStepReferences();
          this._spatialStepActive = false;
          this._unitSpatialDirty = true;
          this._foodSpatialDirty = true;
          this.profiler?.end("worldPostStep", POST_STEP_START);
        }
        updateUnitSpatial(unit2) {
          const START = this.profiler?.start();
          this.unitSpatial.update(unit2);
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
        updateUnitIntent(unit2, dt, enemy, scene) {
          if (this.farmBossEvent.phase === "marching") {
            this._marchUnit(unit2);
            return;
          }
          if (this.isMergeTaskMaterial(unit2)) {
            return;
          }
          if (enemy) {
            this.battleUnit(unit2, dt, enemy);
            return;
          }
          if (unit2.hp > 0 && hasFaction(unit2, FACTION_CONFIG.PLAYER) && !unit2.isBattleOnlySummon) {
            const ACTIVE_ATTACK = unit2.specialAbility && unit2.specialAbility.phase !== "idle" ? unit2.specialAbility : unit2.ability;
            if (ACTIVE_ATTACK.phase !== "idle") {
              if (ACTIVE_ATTACK.phase !== "recover") {
                ACTIVE_ATTACK.interrupt();
              }
              ACTIVE_ATTACK.update(this, dt);
            }
            this.farmUnit(unit2, dt);
            return;
          }
          scene.updateUnoccupied(this, unit2, dt);
        }
        clearPeaRecoveryBoost(unit2) {
          unit2.peaRecoveryPending = false;
          unit2.peaRecoveryBoostExpiresAtTick = 0;
          unit2.peaRecoveryBoostMultiplier = 0;
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
        solveContactSeparations(units, dt) {
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
              const INVERSE_MASS_A = inverseBodyMass(UNIT_LOCAL);
              const PENDING = this._collectContactOrders(UNIT_LOCAL, i + 1, units.length - 1, this._contactPending);
              for (const J of PENDING) {
                const OTHER = units[J];
                if (this.isMergeTaskMaterial(OTHER)) {
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
        _pushBattlePair(first, second, opposing) {
          const COUNT = this._battlePairCount;
          if (COUNT >= this._battlePairA.length) {
            const CAPACITY = Math.max(256, this._battlePairA.length * 2), A = new Int32Array(CAPACITY), B = new Int32Array(CAPACITY), O = new Uint8Array(CAPACITY);
            A.set(this._battlePairA);
            B.set(this._battlePairB);
            O.set(this._battlePairOpposing);
            this._battlePairA = A;
            this._battlePairB = B;
            this._battlePairOpposing = O;
          }
          this._battlePairA[COUNT] = first;
          this._battlePairB[COUNT] = second;
          this._battlePairOpposing[COUNT] = opposing ? 1 : 0;
          this._battlePairCount = COUNT + 1;
        }
        // One spatial pass per tick. The pair list is ordered by (first, second) step order, so the
        // accumulation order below is deterministic and identical on every peer.
        // Radius, height and mass are derived getters; read them once per tick instead of per pair.
        _cacheBattleBodies(units) {
          if (this._battleRadius.length < units.length) {
            const CAPACITY = Math.max(units.length, this._battleRadius.length * 2, 16);
            this._battleRadius = new Float64Array(CAPACITY);
            this._battleHeight = new Float64Array(CAPACITY);
            this._battleInverseMass = new Float64Array(CAPACITY);
          }
          for (let i = 0; i < units.length; i++) {
            const UNIT_LOCAL = units[i];
            this._battleRadius[i] = UNIT_LOCAL.radius;
            this._battleHeight[i] = UNIT_LOCAL.height;
            this._battleInverseMass[i] = inverseBodyMass(UNIT_LOCAL);
          }
        }
        _collectBattlePairs(units) {
          this._battlePairCount = 0;
          this._cacheBattleBodies(units);
          const RADIUS = this._battleRadius, HEIGHT = this._battleHeight;
          const MARGIN = CONFIG.physics.battleNeighborMargin, RESERVED = this.unitCollection.reservations.size > 0;
          for (let i = 0; i < units.length; i++) {
            const UNIT_LOCAL = units[i];
            if (UNIT_LOCAL.hp <= 0 || !UNIT_LOCAL.dropLanded || RESERVED && this.isMergeTaskMaterial(UNIT_LOCAL)) {
              continue;
            }
            const QUERY_RADIUS = RADIUS[i] + CONFIG.unit.maxRadius + MARGIN, PENDING = this._contactPending;
            this.unitSpatial.queryAABB(
              UNIT_LOCAL.x - QUERY_RADIUS,
              UNIT_LOCAL.y - QUERY_RADIUS,
              UNIT_LOCAL.x + QUERY_RADIUS,
              UNIT_LOCAL.y + QUERY_RADIUS,
              this._contactQuery
            );
            PENDING.length = 0;
            for (const OTHER of this._contactQuery) {
              const J = this._unitStepOrder.get(OTHER);
              if (J === void 0 || J <= i || OTHER.hp <= 0 || !OTHER.dropLanded || RESERVED && this.isMergeTaskMaterial(OTHER)) {
                continue;
              }
              if (UNIT_LOCAL.z > OTHER.z + HEIGHT[J] || OTHER.z > UNIT_LOCAL.z + HEIGHT[i]) {
                continue;
              }
              const REACH = RADIUS[i] + RADIUS[J] + MARGIN, DX = OTHER.x - UNIT_LOCAL.x, DY = OTHER.y - UNIT_LOCAL.y;
              if (DX * DX + DY * DY < REACH * REACH) {
                PENDING.push(J);
              }
            }
            PENDING.sort((a, b) => a - b);
            for (const J of PENDING) {
              this._pushBattlePair(i, J, areOpposingFactions(UNIT_LOCAL, units[J]));
            }
          }
        }
        battleContacts(units) {
          this._collectBattlePairs(units);
          for (let p = 0; p < this._battlePairCount; p++) {
            if (this._battlePairOpposing[p] && contact(units[this._battlePairA[p]], units[this._battlePairB[p]])) {
              this.metrics.contacts++;
            }
          }
          this.solveBattleSeparations(units);
        }
        solveBattleSeparations(units) {
          const COUNT = this._battlePairCount;
          if (!COUNT) {
            return;
          }
          this._ensureContactSolverBuffers(units.length);
          if (this._battleMoved.length < units.length) {
            this._battleMoved = new Uint8Array(this._contactCorrectionX.length);
          }
          const CORRECTION_X = this._contactCorrectionX, CORRECTION_Y = this._contactCorrectionY, CORRECTION_COUNT = this._contactCorrectionCount, MOVED = this._battleMoved, PAIR_A = this._battlePairA, PAIR_B = this._battlePairB, PAIR_OPPOSING = this._battlePairOpposing, RADIUS = this._battleRadius, INVERSE_MASS = this._battleInverseMass, ITERATIONS = CONFIG.physics.battleSeparationIterations, RELAXATION = CONFIG.physics.separationRelaxation, ALLY_SCALE = 1 - CONFIG.physics.battleAllyOverlap;
          MOVED.fill(0, 0, units.length);
          for (let iteration = 0; iteration < ITERATIONS; iteration++) {
            CORRECTION_X.fill(0, 0, units.length);
            CORRECTION_Y.fill(0, 0, units.length);
            CORRECTION_COUNT.fill(0, 0, units.length);
            let correctionCount = 0;
            for (let p = 0; p < COUNT; p++) {
              const I = PAIR_A[p], J = PAIR_B[p], UNIT_LOCAL = units[I], OTHER = units[J], INVERSE_MASS_A = INVERSE_MASS[I], INVERSE_MASS_B = INVERSE_MASS[J], INVERSE_MASS_SUM = INVERSE_MASS_A + INVERSE_MASS_B;
              if (INVERSE_MASS_SUM <= 0) {
                continue;
              }
              const DX = OTHER.x - UNIT_LOCAL.x, DY = OTHER.y - UNIT_LOCAL.y, DISTANCE = Math.hypot(DX, DY), TARGET_DISTANCE = (RADIUS[I] + RADIUS[J]) * (PAIR_OPPOSING[p] ? 1 : ALLY_SCALE);
              if (DISTANCE >= TARGET_DISTANCE) {
                continue;
              }
              const ANGLE = (Math.min(UNIT_LOCAL.id, OTHER.id) * 0.61803398875 + Math.max(UNIT_LOCAL.id, OTHER.id) * 0.38196601125) % 1 * Math.PI * 2, NORMAL_SIGN = UNIT_LOCAL.id < OTHER.id ? 1 : -1, NORMAL_X = DISTANCE > 1e-6 ? DX / DISTANCE : Math.cos(ANGLE) * NORMAL_SIGN, NORMAL_Y = DISTANCE > 1e-6 ? DY / DISTANCE : Math.sin(ANGLE) * NORMAL_SIGN, PENETRATION = (TARGET_DISTANCE - DISTANCE) * RELAXATION, SHARE_A = INVERSE_MASS_A / INVERSE_MASS_SUM, SHARE_B = INVERSE_MASS_B / INVERSE_MASS_SUM;
              CORRECTION_X[I] -= NORMAL_X * PENETRATION * SHARE_A;
              CORRECTION_Y[I] -= NORMAL_Y * PENETRATION * SHARE_A;
              CORRECTION_COUNT[I] += SHARE_A > 0 ? 1 : 0;
              CORRECTION_X[J] += NORMAL_X * PENETRATION * SHARE_B;
              CORRECTION_Y[J] += NORMAL_Y * PENETRATION * SHARE_B;
              CORRECTION_COUNT[J] += SHARE_B > 0 ? 1 : 0;
              correctionCount++;
            }
            if (!correctionCount) {
              break;
            }
            for (let i = 0; i < units.length; i++) {
              const UNIT_LOCAL = units[i], COUNT_LOCAL = CORRECTION_COUNT[i];
              if (!COUNT_LOCAL) {
                continue;
              }
              let deltaX = CORRECTION_X[i] / COUNT_LOCAL, deltaY = CORRECTION_Y[i] / COUNT_LOCAL;
              const LENGTH = Math.hypot(deltaX, deltaY), MAX_CORRECTION = Math.max(0.05, RADIUS[i] * 1.25);
              if (LENGTH > MAX_CORRECTION) {
                const SCALE = MAX_CORRECTION / LENGTH;
                deltaX *= SCALE;
                deltaY *= SCALE;
              }
              UNIT_LOCAL.x += deltaX;
              UNIT_LOCAL.y += deltaY;
              this.boundBody(UNIT_LOCAL, this.scene, RADIUS[i]);
              MOVED[i] = 1;
            }
            this.metrics.physicsSolverIterations++;
            this.profiler?.count("physicsSolverIterations");
          }
          for (let i = 0; i < units.length; i++) {
            if (MOVED[i]) {
              this.updateUnitSpatial(units[i]);
            }
          }
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
        resolveFarmContactPairs(units) {
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
              this.pair(UNIT_LOCAL, OTHER);
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
          for (const FOOD2 of this._foodCandidates) {
            if (FOOD2.phase !== "grounded") {
              continue;
            }
            const DX = u.x - FOOD2.x, DY = u.y - FOOD2.y, DISTANCE = Math.hypot(DX, DY);
            if (DISTANCE >= RADIUS) {
              continue;
            }
            const STRENGTH = 1 - DISTANCE / RADIUS, WEIGHT = STRENGTH * STRENGTH;
            if (DISTANCE < nearestDistance) {
              nearestDistance = DISTANCE;
              nearest = FOOD2;
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
          this.steer(u, u.x + moveX / moveLength, u.y + moveY / moveLength, dt, scaleMoveSpeed(2, u));
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
            for (const FOOD2 of this._foodCandidates) {
              if (!this._isCurrentGroundedFood(FOOD2)) {
                continue;
              }
              const DISTANCE = Math.hypot(FOOD2.x - x, FOOD2.y - y), ORDER = this._foodOrder.get(FOOD2) ?? Infinity;
              if (DISTANCE < nearestDistance || DISTANCE === nearestDistance && ORDER < nearestOrder) {
                nearest = FOOD2;
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
              for (const FOOD2 of this._groundedFoods) {
                if (!this._isCurrentGroundedFood(FOOD2)) {
                  continue;
                }
                const DISTANCE = Math.hypot(FOOD2.x - x, FOOD2.y - y), ORDER = this._foodOrder.get(FOOD2) ?? Infinity;
                if (DISTANCE < nearestDistance || DISTANCE === nearestDistance && ORDER < nearestOrder) {
                  nearest = FOOD2;
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
        _startFoodTargetSearch(unit2) {
          const GRID = this.foodSpatial, CX = GRID.cellX(unit2.x), CY = GRID.cellY(unit2.y);
          if (CX < 0 || CY < 0 || CX >= GRID.cellCount || CY >= GRID.cellCount) {
            return null;
          }
          const STATE = {
            key: `food-target:${unit2.id}:${++this._foodSearchJobSequence}`,
            unit: unit2,
            snapshot: this._foodSearchSnapshot,
            revision: this._foodSearchSnapshot.revision,
            x: unit2.x,
            y: unit2.y,
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
          this._foodSearchStates.set(unit2, STATE);
          this._foodSearchScheduler.enqueue({
            key: STATE.key,
            owner: this,
            priority: 1,
            isValid: () => this.scene === "farm" && this._foodSearchStates.get(unit2) === STATE && this._unitById.get(unit2.id) === unit2 && unit2.hp > 0 && !unit2.fed,
            step: ({ maxUnits }) => this._stepFoodTargetSearch(STATE, maxUnits),
            onComplete: ({ result }) => {
              if (this._foodSearchStates.get(unit2) !== STATE) {
                return;
              }
              if (result && this._isCurrentGroundedFood(result)) {
                STATE.target = result;
                STATE.status = "ready";
                return;
              }
              if (STATE.revision !== this._groundedFoodRevision) {
                this._foodSearchStates.delete(unit2);
                if (this.scene === "farm" && this._unitById.get(unit2.id) === unit2 && unit2.hp > 0 && !unit2.fed) {
                  this._startFoodTargetSearch(unit2);
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
              const FOOD2 = SNAPSHOT.foods[state.fallbackIndex++];
              if (this._isCurrentGroundedFood(FOOD2)) {
                this._considerFoodTarget(state, FOOD2);
              }
              this._foodSearchWork.candidateChecks++;
              unitsUsed++;
              continue;
            }
            if (state.bucketIndex < state.bucket.length) {
              const FOOD2 = state.bucket[state.bucketIndex++];
              if (this._isCurrentGroundedFood(FOOD2)) {
                this._considerFoodTarget(state, FOOD2);
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
        requestGroundFoodTarget(unit2) {
          if (!this._spatialStepActive) {
            this._rebuildFoodSpatialIndex();
          }
          if (!unit2 || this.scene !== "farm" || unit2.hp <= 0 || unit2.fed || !this._groundedFoodCount) {
            this._cancelFoodTargetSearch(unit2);
            return null;
          }
          const STATE = this._foodSearchStates.get(unit2);
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
            this._cancelFoodTargetSearch(unit2);
          }
          return this._startFoodTargetSearch(unit2);
        }
        farmUnit(u, dt) {
          FARM_MODES.breed.update(this, u, dt);
        }
        combat(kind, detail) {
          this.notice(kind, { time: this.time, ...detail });
        }
        outsideFarm(x, y) {
          return !ARENA_GEOMETRY.inside({ x, y }, "farm");
        }
        boundBody(body, scene, margin) {
          const ARENA = CONFIG[scene].arena, RX2 = ARENA.radiusX - margin, RY2 = ARENA.radiusY - margin;
          if (body.workOut) {
            if (Math.abs(body.x) <= RX2 && Math.abs(body.y) <= RY2) {
              body.workOut = false;
            } else {
              return;
            }
          }
          if (ARENA.shape === "rect") {
            const X = CLAMP2(body.x, -RX2, RX2), Y = CLAMP2(body.y, -RY2, RY2);
            if (X !== body.x && (body.vx || 0) * body.x > 0) {
              body.vx = 0;
            }
            if (Y !== body.y && (body.vy || 0) * body.y > 0) {
              body.vy = 0;
            }
            body.x = X;
            body.y = Y;
            return;
          }
          const K = Math.max(1, Math.hypot(body.x / RX2, body.y / RY2));
          if (K === 1) {
            return;
          }
          body.x /= K;
          body.y /= K;
          const NX = body.x / (RX2 * RX2), NY = body.y / (RY2 * RY2), LENGTH = Math.hypot(NX, NY) || 1, OUTWARD = ((body.vx || 0) * NX + (body.vy || 0) * NY) / LENGTH;
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
        attackTarget(unit2, action) {
          if (action?.targetId === "boss" || !action?.targetId) {
            return this.boss.generation === action?.targetGeneration && areOpposingFactions(unit2, this.boss) ? this.boss : null;
          }
          const TARGET = this._unitForId(action.targetId);
          return TARGET?.generation === action.targetGeneration && TARGET.hp > 0 && areOpposingFactions(unit2, TARGET) ? TARGET : null;
        }
        createAttackContext(u, { attackMultiplier = null, attackKind = null, strikeIndex = null, area = false, criticalRoll = null } = {}) {
          const SPEC = abilityProfile(u.species), ATTACKER_STATS = resolveUnitStats(u);
          return {
            source: u,
            sourceKind: hasFaction(u, FACTION_CONFIG.PLAYER) ? "direct" : "enemy",
            attackerStats: ATTACKER_STATS,
            damageMultiplier: Number.isFinite(attackMultiplier) ? attackMultiplier : SPEC.skillMultiplier,
            kind: attackKind || SPEC.kind,
            buffed: false,
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
        unitStatsFor(unit2) {
          return resolveUnitStats(unit2);
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
            kind: KIND
          } = CONTEXT;
          CONTEXT.hitTargets?.add(target);
          const DEFENSE = this.combatTargetDefense(target), CRITICAL_BONUS = KIND === abilityProfile(SOURCE.species).kind ? this.riceCriticalChanceBonus(SOURCE, target.hp, DEFENSE.maxHp) : 0, SOURCE_STAT_OVERRIDES = {
            ...CONTEXT.sourceStatOverrides,
            critChance: CLAMP2(ATTACKER_STATS.critChance + CRITICAL_BONUS, 0, 1)
          };
          const RAW_BASE_DAMAGE = ATTACKER_STATS.attackPower * (CONTEXT.attackPowerMultiplier ?? (SOURCE.giantUntil > this.time ? 3 : 1)) * DAMAGE_MULTIPLIER, RAW_DAMAGE = (RAW_BASE_DAMAGE + (SOURCE.ability?.rawDamageBonus?.(this, action, KIND) || 0)) * this.passiveDamageScale(SOURCE, ATTACKER_STATS.maxHp, target, DEFENSE.maxHp);
          const DAMAGE = applyDamageToTargets(SOURCE, [target], {
            rawDamage: RAW_DAMAGE,
            area: CONTEXT.area,
            sourceKind: CONTEXT.sourceKind,
            sourceStatOverrides: SOURCE_STAT_OVERRIDES,
            armorForTarget: () => DEFENSE.armor,
            roll: () => CONTEXT.criticalRoll ?? (CONTEXT.criticalRoll = this.random())
          });
          if (!IS_BOSS) {
            this.passiveUndying(target);
            const CRITICAL_RAW_DAMAGE = RAW_DAMAGE * (DAMAGE.critical ? SOURCE_STAT_OVERRIDES.critMultiplier ?? ATTACKER_STATS.critMultiplier ?? 1 : 1);
            target.ability?.receiveRawDamage?.(this, CRITICAL_RAW_DAMAGE, SOURCE, action);
          }
          if (!IS_BOSS) {
            this._syncUnitAliveCount(target);
          }
          this.onCombatResolved.emit({
            excluded: SOURCE.isFormationClone,
            damageDealt: SOURCE.faction === "player" ? DAMAGE.totalActualLoss / (SOURCE.giantUntil > this.time ? 3 : 1) : 0,
            damageTaken: target.faction === "player" && !target.isFormationClone ? DAMAGE.totalActualLoss : 0,
            hits: SOURCE.faction === "player" ? 1 : 0,
            critHits: SOURCE.faction === "player" && DAMAGE.critical ? 1 : 0
          });
          this.applyGrainOnBasicHit(SOURCE, target, KIND);
          SOURCE.ability?.afterSuccessfulAttack?.(this, action, target, DAMAGE);
          const STRENGTH = DAMAGE_MULTIPLIER * (DAMAGE.critical ? ATTACKER_STATS.critMultiplier : 1);
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
            damage: damage.totalActualLoss,
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
            damage: damage.totalActualLoss,
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
        battleUnit(u, dt, enemy = this.boss) {
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
        finishFarmBossEvent(outcome) {
          return this.mutateUnits(this._finishFarmBossEvent, outcome);
        }
        _finishFarmBossEvent(outcome) {
          if (this.scene !== "farm" || this.farmBossEvent.phase !== "fighting") {
            return false;
          }
          this.formationSkills.end();
          this.cleanupBattleSummons();
          const CLIMBING = outcome === "victory" && this.tower.active && this.tower.floor < CONFIG.farm.tower.topFloor;
          if (!CLIMBING) {
            this._clearRunStats();
            this.tower.active = false;
            this.tower.doors = [];
            this._benched.clear();
            this._benchRevision++;
            this._unitSpatialDirty = true;
          }
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
            const EVENT_STAGE = this.boss.stage, STAGE_STATS = bossStageStats(EVENT_STAGE), BEST = this.playerProgression.towerBest, KIND = CONFIG.farm.tower[this.tower.floor ? this.tower.kind : "battle"];
            this.tower.record = EVENT_STAGE > BEST;
            if (this.tower.record) {
              this.playerProgression.towerBest = EVENT_STAGE;
            }
            const REWARD_SCALE = KIND.reward * (this.tower.record ? BOSS_REWARD_SETTINGS.recordMultiplier : 1), FIRST_CLEAR = !bossSpeciesOwned(this, this.boss.species), SETTLEMENT = settleBossKill(this, {
              encounterId: ENCOUNTER_ID,
              source: "farm",
              stage: EVENT_STAGE,
              species: this.boss.species,
              tier: 1,
              x: this.boss.x,
              y: this.boss.y,
              firstClear: FIRST_CLEAR,
              rollBudget: STAGE_STATS.rollBudget * REWARD_SCALE,
              xpAmount: STAGE_STATS.xp * REWARD_SCALE
            });
            const REWARD2 = SETTLEMENT.receipt;
            this.combat("farm-boss-xp", {
              encounterId: ENCOUNTER_ID,
              species: this.boss.species,
              xp: SETTLEMENT.xpAwarded,
              levelsGained: SETTLEMENT.levelsGained,
              pointsAwarded: SETTLEMENT.pointsAwarded
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
              (unit2) => {
                if (ARENA_GEOMETRY.sweep(FROM, TO, B_LOCAL.radius, B_LOCAL.height, unit2)) {
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
              (unit2) => {
                if (Math.hypot(unit2.x - CANDIDATE.point.x, unit2.y - CANDIDATE.point.y) <= CONFIG_LOCAL.landingRadius + unit2.radius) {
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
            if (RUNTIME.cooldowns[ID] > 1e-9 || this.bossHpRatio > BOSS_PATTERN_CONFIG[ID].unlockHp) {
              continue;
            }
            const BEHAVIOR = BOSS_BEHAVIORS.forId(ID);
            if (BEHAVIOR.eligible(this, targets, ALIVE_ADDS) && this.bossAttackWorthIt(BEHAVIOR, targets)) {
              ELIGIBLE.push(ID);
            }
          }
          return ELIGIBLE;
        }
        // An area attack is used only when it deals more in total than the basic attack's one strong hit.
        bossAttackWorthIt(behavior, targets) {
          if (behavior.id === BOSS_BASIC_ID) {
            return true;
          }
          const HITS = behavior.expectedHits(this, targets);
          return HITS === null || bossAttackTotal(behavior.config.damageMultiplier, HITS) > bossAttackTotal(BOSS_PATTERN_CONFIG[BOSS_BASIC_ID].damageMultiplier, 1);
        }
        // Whether the unit's body touches the wedge from the boss out to `range` around bearing `aim`, `half` to each side.
        bossWedgeContains(unit2, range, aim, half) {
          const DX = unit2.x - this.boss.x, DY = unit2.y - this.boss.y, D_LOCAL = Math.hypot(DX, DY);
          if (D_LOCAL > range + unit2.radius) {
            return false;
          }
          const BEARING = Math.atan2(DY, DX), OFFSET = Math.atan2(Math.sin(BEARING - aim), Math.cos(BEARING - aim)), PAD = D_LOCAL <= unit2.radius ? Math.PI : Math.asin(Math.min(1, unit2.radius / Math.max(D_LOCAL, 1e-6)));
          return Math.abs(OFFSET) <= half + PAD;
        }
        // The units on the ground within `range` of a point (their bodies counted), nearest the boss first.
        bossGroundUnitsNear(x, y, range) {
          const EXTENT = range + CONFIG.unit.maxRadius;
          return this._nearestBossFirst(
            this._collectBossTargets(x - EXTENT, y - EXTENT, x + EXTENT, y + EXTENT, this._bossHitCandidates, true)
          ).filter((unit2) => Math.hypot(unit2.x - x, unit2.y - y) <= range + unit2.radius);
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
        hitBossPatternUnit(unit2, patternId, point2, normal = null) {
          return this.mutateUnits(this._hitBossPatternUnit, unit2, patternId, point2, normal);
        }
        // A hit knocks the unit back at once and queues its damage: the damage is shared among everyone hit in the same
        // moment, which is only known once the attack has looked at all of them (_settleBossHits).
        _hitBossPatternUnit(unit2, patternId, point2, normal = null) {
          const B_LOCAL = this.boss, ACTION = B_LOCAL.patternRuntime.active, CONFIG_LOCAL = BOSS_PATTERN_CONFIG[patternId];
          if (!ACTION || !CONFIG_LOCAL || !hasFaction(unit2, FACTION_CONFIG.PLAYER) || !areOpposingFactions(B_LOCAL, unit2) || unit2.hp <= 0 || !unit2.dropLanded || ACTION.hitIds.has(unit2.id)) {
            return false;
          }
          if (CONFIG_LOCAL.groundOnly && unit2.z > 0.1) {
            return false;
          }
          ACTION.hitIds.add(unit2.id);
          const DX = normal?.x ?? unit2.x - B_LOCAL.x, DY = normal?.y ?? unit2.y - B_LOCAL.y, N = Math.hypot(DX, DY) || 1;
          const GUARD = unit2.ability.receiveGuard?.(this), KNOCKBACK_MULTIPLIER = GUARD?.receivedKnockbackMultiplier ?? 1;
          unit2.knock(
            DX / N,
            DY / N,
            CONFIG_LOCAL.knockback * KNOCKBACK_MULTIPLIER,
            CONFIG_LOCAL.lift * KNOCKBACK_MULTIPLIER,
            B_LOCAL
          );
          this._bossHitBatch.push({
            unit: unit2,
            patternId,
            point: { x: point2.x, y: point2.y },
            nx: DX / N,
            ny: DY / N,
            guard: GUARD
          });
          return true;
        }
        // The damage of the hits queued since the last call: each unit takes 35% of the attack plus its share of the other 65%.
        _settleBossHits() {
          const BATCH = this._bossHitBatch, B_LOCAL = this.boss;
          if (!BATCH.length) {
            return;
          }
          const SHARE = BOSS_HIT_SPLIT.everyone + (1 - BOSS_HIT_SPLIT.everyone) / BATCH.length;
          for (const HIT of BATCH) {
            const UNIT_LOCAL = HIT.unit, CONFIG_LOCAL = BOSS_PATTERN_CONFIG[HIT.patternId];
            const RECEIVED = applyDamageToTargets(null, [UNIT_LOCAL], {
              armorForTarget: () => this.combatTargetDefense(UNIT_LOCAL).armor,
              rawDamage: B_LOCAL.attackPower * CONFIG_LOCAL.damageMultiplier * SHARE * (this.bossEnraged ? BOSS_ENRAGE.damageMultiplier : 1) * (HIT.guard?.receivedDamageMultiplier ?? 1) * this.passiveReceivedScale(UNIT_LOCAL),
              sourceKind: "enemy"
            });
            this.passiveUndying(UNIT_LOCAL);
            this.onCombatResolved.emit({
              damageTaken: RECEIVED.totalActualLoss,
              excluded: UNIT_LOCAL.isFormationClone
            });
            this._syncUnitAliveCount(UNIT_LOCAL);
            if (UNIT_LOCAL.hp === 0) {
              UNIT_LOCAL.down = UNIT_LOCAL.isBattleOnlySummon ? 0 : CONFIG.unit.corpseRecoverySeconds;
              this.handleUnitDeath(UNIT_LOCAL);
            }
            this.metrics.directHits++;
            this.metrics[BOSS_BEHAVIORS.forId(HIT.patternId).hitMetric]++;
            this.combat("unit-hit", {
              attackKind: HIT.patternId,
              attackId: B_LOCAL.attackId,
              unit: UNIT_LOCAL.id,
              x: HIT.point.x,
              y: HIT.point.y,
              z: Math.max(0.15, UNIT_LOCAL.z + 0.25),
              nx: HIT.nx,
              ny: HIT.ny,
              strength: CONFIG_LOCAL.damageMultiplier
            });
          }
          BATCH.length = 0;
        }
        _nearestBossFirst(candidates) {
          const B_LOCAL = this.boss;
          return candidates.sort(
            (a, b) => Math.hypot(a.x - B_LOCAL.x, a.y - B_LOCAL.y) - Math.hypot(b.x - B_LOCAL.x, b.y - B_LOCAL.y)
          );
        }
        // Everyone within `range` of the boss's middle (so from its body outwards, no gap) whose bearing lies in the wedge
        // from..to, widened by the unit's own size. A sweep calls it each tick with the wedge its arm crossed since the last.
        resolveBossWedge(action, patternId, range, from, to, limit = Infinity) {
          const B_LOCAL = this.boss, AIM = (from + to) / 2, HALF = (to - from) / 2;
          let hits = 0;
          const EXTENT = range + CONFIG.unit.maxRadius;
          for (const UNIT_LOCAL of this._nearestBossFirst(
            this._collectBossTargets(
              B_LOCAL.x - EXTENT,
              B_LOCAL.y - EXTENT,
              B_LOCAL.x + EXTENT,
              B_LOCAL.y + EXTENT,
              this._bossHitCandidates,
              true
            )
          )) {
            if (hits >= limit) {
              break;
            }
            if (action.hitIds.has(UNIT_LOCAL.id) || UNIT_LOCAL.z > 0.1) {
              continue;
            }
            if (!this.bossWedgeContains(UNIT_LOCAL, range, AIM, HALF)) {
              continue;
            }
            const DX = UNIT_LOCAL.x - B_LOCAL.x, DY = UNIT_LOCAL.y - B_LOCAL.y, N = Math.hypot(DX, DY) || 1;
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
        bossMouthPoint(released) {
          return bossMouthWorldPoint(this.boss, released);
        }
        bossSummonLanding(angle, action = null) {
          const B_LOCAL = this.boss, SCENE = this.scene, RADIUS = (0, import_definition50.unitBodyRadius)({ species: B_LOCAL.species, tier: 1, growthElapsed: 1, growthDuration: 1 });
          for (let i = 0; i < 16; i++) {
            const OFFSET = i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 8, A_LOCAL = angle + OFFSET, CANDIDATE = {
              x: B_LOCAL.x + Math.cos(A_LOCAL) * BOSS_PATTERN_CONFIG["summon.mouth-t1"].landingRadius,
              y: B_LOCAL.y + Math.sin(A_LOCAL) * BOSS_PATTERN_CONFIG["summon.mouth-t1"].landingRadius
            };
            if (!ARENA_GEOMETRY.inside(CANDIDATE, SCENE, RADIUS)) {
              continue;
            }
            const BLOCKED = this.units.some(
              (unit2) => unit2.hp > 0 && Math.hypot(unit2.x - CANDIDATE.x, unit2.y - CANDIDATE.y) < RADIUS + unit2.radius + 0.08
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
          RUNTIME.cooldowns[action.id] = CONFIG_LOCAL.cooldown * (this.bossEnraged ? BOSS_ENRAGE.cooldownMultiplier : 1);
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
          const RX2 = CONFIG.battle.arena.radiusX - BOSS2.radius, RY2 = CONFIG.battle.arena.radiusY - BOSS2.radius, EDGE = Math.hypot(BOSS2.x / RX2, BOSS2.y / RY2);
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
            B_LOCAL.active = false;
            B_LOCAL.patternRuntime.active = null;
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
          this._settleBossHits();
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
      towerBest: player.towerBest,
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
  function cohortValues(unit2) {
    return [
      unit2.species,
      unit2.tier,
      unit2.meals >= 1,
      Math.max(0, unit2.growthDuration - unit2.growthElapsed),
      unit2.growthDuration,
      unit2.cooldown,
      unit2.cooldownDuration,
      unit2.hp <= 0 ? unit2.down : 0
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
      const [SPECIES, TIER, FED, GROWTH, DURATION3, COOLDOWN, COOLDOWN_DURATION, REST] = cohortValues(UNIT3);
      const KEY2 = [
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
    const ROSTER = [...GROUPS.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row);
    return {
      seed: world.seed,
      rngState: world.rng.state,
      nextId: world.nextId,
      player: copyPlayer(world.playerProgression),
      roster: ROSTER,
      food: {
        produced: world.foodTaps.produced,
        count: world.food.length
      },
      totals: {
        births: world.metrics.births,
        merges: world.metrics.merges
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
        }
      }
    };
  }
  function validateFarmProgress(data) {
    keys(data, ["seed", "rngState", "nextId", "player", "roster", "food", "totals", "ledger"], ["mode"]);
    ASSERT(
      INTEGER(data.seed, 0, 4294967295) && INTEGER(data.rngState, 0, 4294967295) && INTEGER(data.nextId, 1, CONFIG.farm.maxUnitId + 1) && (data.mode === void 0 || ["breed", "merge"].includes(data.mode))
    );
    const PLAYER = data.player, DEFAULTS = createPlayerProgressionState();
    keys(PLAYER, Object.keys(DEFAULTS));
    keys(PLAYER.abilities, Object.keys(DEFAULTS.abilities));
    for (const [ABILITY_ID8, BUILD] of Object.entries(PLAYER.abilities)) {
      const BRANCH_KEYS = Object.keys(DEFAULTS.abilities[ABILITY_ID8].branchLevels || {});
      keys(BUILD, ["powerLevel", "masteryLevel", "masteryXp"], BRANCH_KEYS.length ? ["branchLevels"] : []);
      if (Object.hasOwn(BUILD, "branchLevels")) {
        keys(BUILD.branchLevels, BRANCH_KEYS);
      }
    }
    ASSERT(
      isValidPlayerProgressionState(PLAYER) && Array.isArray(PLAYER.processedBossKillReceipts) && PLAYER.processedBossKillReceipts.length <= 1e5 && PLAYER.processedBossKillReceipts.every(STRING)
    );
    ASSERT(Array.isArray(data.roster));
    const COHORTS = /* @__PURE__ */ new Set(), RESIDENT_IDS = /* @__PURE__ */ new Set();
    let maxResidentId = 0;
    for (const ROW of data.roster) {
      keys(ROW, ["species", "tier", "residentIds"], ["fed", "growth", "cooldown", "rest"]);
      ASSERT(
        INTEGER(ROW.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER(ROW.tier, 1, CONFIG.unit.maxTier) && Array.isArray(ROW.residentIds) && ROW.residentIds.length > 0
      );
      for (const ID of ROW.residentIds) {
        ASSERT(INTEGER(ID, 1, data.nextId - 1) && !RESIDENT_IDS.has(ID));
        RESIDENT_IDS.add(ID);
        maxResidentId = Math.max(maxResidentId, ID);
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
    ASSERT(RESIDENT_IDS.size <= CONFIG.farm.capacity.max);
    ASSERT(data.nextId > maxResidentId);
    keys(data.food, ["produced", "count"]);
    ASSERT(INTEGER(data.food.produced) && INTEGER(data.food.count, 0, 140));
    keys(data.totals, ["births", "merges"]);
    ASSERT(INTEGER(data.totals.births) && INTEGER(data.totals.merges));
    const LEDGER = data.ledger;
    keys(LEDGER, ["boss"]);
    const BOSS2 = LEDGER.boss;
    keys(BOSS2, ["nextEncounterId", "settledThrough", "pendingRewards", "rewardStreams", "queuedRewards"]);
    keys(BOSS2.settledThrough, ["farm"]);
    ASSERT(INTEGER(BOSS2.settledThrough.farm) && INTEGER(BOSS2.nextEncounterId, BOSS2.settledThrough.farm + 1));
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
        REWARD2.source === "farm" && INTEGER(REWARD2.encounterId, 1, BOSS2.settledThrough[REWARD2.source]) && STRING(REWARD2.receiptKey) && !RECEIPTS.has(REWARD2.receiptKey) && INTEGER(REWARD2.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER(REWARD2.tier, 1, CONFIG.unit.maxTier) && NUMBER3(REWARD2.chance, 0, 1) && typeof REWARD2.firstClear === "boolean"
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
    Object.assign(WORLD.metrics, data.totals);
    const RESIDENT_TOTAL = data.roster.reduce((total, row) => total + row.residentIds.length, 0);
    let placed = 0;
    for (const ROW of data.roster) {
      for (const ID of ROW.residentIds) {
        const POINT2 = position(placed++, RESIDENT_TOTAL, data.seed, 0.7), UNIT3 = new UNIT(ID, ROW.species, ROW.tier, POINT2.x, POINT2.y);
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
    }
    for (let i = 0; i < data.food.count; i++) {
      const POINT2 = position(i, data.food.count, data.seed + 103, 0.8);
      WORLD.food.push({
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
    WORLD.foodTaps.produced = data.food.produced;
    WORLD.nextId = data.nextId;
    const { boss: BOSS2 } = data.ledger;
    Object.assign(WORLD, {
      nextBossEncounterId: BOSS2.nextEncounterId,
      bossRewardWatermarks: {
        ...BOSS2.settledThrough
      },
      bossRewardStreams: structuredClone(BOSS2.rewardStreams),
      bossRewardInventory: BOSS2.queuedRewards.map(({ species, tier, count }) => ({ species, tier, count }))
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
      PRODUCT_VERSION = "0.30.41";
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

  // src/relic-dock.js
  init_formation_skill_state();
  var CONDITION_LABELS = Object.freeze({
    damageDealt: "준 피해",
    damageTaken: "받은 피해",
    hits: "공격 적중",
    critHits: "치명타",
    allyDeaths: "아군 쓰러짐",
    time: "전투 시간"
  });
  var RELIC_ICONS = Object.freeze({
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
  var RelicDock = class {
    constructor() {
      this.key = "";
      this.root = document.createElement("section");
      this.root.className = "formation-dock";
      this.root.setAttribute("aria-label", "유물");
      this.root.innerHTML = '<div class="formation-slots"></div>';
      document.querySelector("#gameplayDock").prepend(this.root);
      this.slotHost = this.root.querySelector(".formation-slots");
    }
    update(world, display, visible) {
      this.root.hidden = !visible;
      if (!visible) {
        return;
      }
      const RELICS = [...world.tower.relics], KEY2 = JSON.stringify(RELICS);
      if (KEY2 !== this.key) {
        this.key = KEY2;
        this.slotHost.innerHTML = RELICS.map(([id, level]) => {
          const DEFINITION13 = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === id);
          return `<div class="formation-slot" data-formation-slot="${ESCAPE(id)}" data-empty="false">
                    <div class="formation-icon" title="${ESCAPE(DEFINITION13.name)} Lv.${level}" aria-label="${ESCAPE(DEFINITION13.name)} Lv.${level}">
                    <span>${RELIC_ICONS[id]}</span><i class="formation-clock"></i><em class="formation-lv">${level}</em></div>
                    <div class="formation-charge"><i></i></div></div>`;
        }).join("");
      }
      const RELICS_LEVEL = new Map(RELICS), SLOTS = display.formationSlots || world.formationSkills?.slots || [];
      for (const ELEMENT of this.slotHost.children) {
        const ID = ELEMENT.dataset.formationSlot, DEFINITION13 = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === ID), RUNTIME = SLOTS.find((item) => item.id === ID), REQUIRED = DEFINITION13.required || 1, CHARGE = Math.min(REQUIRED, RUNTIME?.charge || 0), COOLDOWN = Math.max(0, RUNTIME?.cooldown || 0);
        ELEMENT.querySelector(".formation-clock").style.setProperty(
          "--cooldown",
          `${COOLDOWN / FORMATION_COOLDOWN_SECONDS * 360}deg`
        );
        ELEMENT.querySelector(".formation-charge i").style.width = `${CHARGE / REQUIRED * 100}%`;
        ELEMENT.querySelector(".formation-icon").title = `${DEFINITION13.name} Lv.${RELICS_LEVEL.get(ID)} · ${CONDITION_LABELS[DEFINITION13.condition] || ""} ${NUMBER2(CHARGE)}/${NUMBER2(REQUIRED)}`;
        ELEMENT.dataset.ready = String(CHARGE >= REQUIRED && COOLDOWN === 0);
      }
    }
  };

  // src/farm-app.js
  init_formation_skill_state();
  init_tower_run();
  init_farm_model();

  // src/features/formation-skills/presentation-base.js
  init_model_base();
  var REFERENCE_RADIUS = T1_DIAMETER / 2;
  var SCALE_EXPONENT = 0.7;
  function bodyScale(radius) {
    return Math.max(1, (Number.isFinite(radius) ? radius : REFERENCE_RADIUS) / REFERENCE_RADIUS) ** SCALE_EXPONENT;
  }
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
    const BODY_SCALE = bodyScale(radius);
    const POINTS = [];
    for (let i = 0; i <= 9; i++) {
      POINTS.push([
        x + (i === 9 ? 0 : Math.sin(i * 13.17 + seed) * 0.32 * BODY_SCALE),
        y + (i === 9 ? 0 : Math.cos(i * 5.7 + seed) * 0.12 * BODY_SCALE),
        z + height * (1 - i / 9)
      ]);
    }
    if (age < 0.12) {
      stroke(renderer, POINTS, `rgba(51,121,255,${FADE * 0.3})`, 0.9 * BODY_SCALE);
      stroke(renderer, POINTS, `rgba(99,181,255,${FADE * 0.8})`, 0.34 * BODY_SCALE);
      stroke(renderer, POINTS, `rgba(236,251,255,${FADE})`, 0.17 * BODY_SCALE);
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
    renderer.ring(
      x,
      y,
      radius + age * radius * 10,
      `rgba(157,212,255,${FADE * 0.8})`,
      0.09 * BODY_SCALE,
      0,
      Math.PI * 2,
      z
    );
    if (age < 0.09) {
      const P = renderer.project(x, y, z + 0.15);
      renderer.ellipse(P.x, P.y, renderer.scale * radius * 2.17, renderer.scale * radius * 1.4, "#effcffdd");
    }
  }
  function groundShadow(renderer, x, y, radius, alpha, fade = 1) {
    const P = renderer.project(x, y, 0);
    renderer.ellipse(
      P.x,
      P.y,
      renderer.scale * radius,
      renderer.scale * radius * 0.62,
      `rgba(20,12,8,${alpha * fade})`
    );
  }
  function burst(renderer, x, y, z, radius, age, seed = 0, rgb2 = "255,224,130") {
    const FADE = Math.max(0, 1 - age / 0.55);
    if (FADE <= 0) {
      return;
    }
    for (let i = 0; i < 10; i++) {
      const A = i * 2.399 + seed, SPEED = radius * (3 + i % 3), PX = x + Math.cos(A) * SPEED * age, PY = y + Math.sin(A) * SPEED * age * 0.6, PZ = z + (2.2 + i % 4 * 0.7) * radius * age - 6 * radius * age * age, P = renderer.project(PX, PY, PZ);
      renderer.ellipse(
        P.x,
        P.y,
        renderer.scale * radius * 0.16,
        renderer.scale * radius * 0.16,
        `rgba(${rgb2},${FADE})`
      );
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
        `rgba(98,128,157,${alpha * 0.85})`
      );
    }
    for (let i = 0; i < 4; i++) {
      const P = renderer.project(x + (i - 1.5) * 0.25 * size, y, z + size * 0.14 + Math.sin(i * 2.1) * 0.1 * size);
      renderer.ellipse(
        P.x,
        P.y,
        renderer.scale * size * 0.26,
        renderer.scale * size * 0.18,
        `rgba(168,190,212,${alpha * 0.8})`
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
      const PULSE = 0.85 + Math.sin(effect.age * 5) * 0.15, RADIUS = Math.max(0.3, effect.radius || 0.3), SCALE = bodyScale(effect.radius);
      renderer.ring(effect.x, effect.y, RADIUS * 1.15 * PULSE, "#b3d875cc", 0.14 * SCALE);
      renderer.ring(effect.x, effect.y, RADIUS * 1.42 * PULSE, "#e6f3b366", 0.08 * SCALE);
      for (let i = 0; i < 5; i++) {
        const A = i * Math.PI * 2 / 5 + effect.age, P = renderer.project(
          effect.x + Math.cos(A) * RADIUS * 1.25,
          effect.y + Math.sin(A) * RADIUS * 1.25,
          (effect.age * 1.3 + i * 0.4) % 2 * Math.max(1, RADIUS)
        );
        renderer.ellipse(P.x, P.y, renderer.scale * 0.06 * SCALE, renderer.scale * 0.11 * SCALE, "#e2f7a9aa");
      }
    }
  };

  // src/features/formation-skills/lightning/presentation.js
  var LightningPresentation = class extends FormationPresentation {
    draw(renderer, effect) {
      const BODY_HEIGHT = Math.max(0.5, effect.bodyHeight || 0.7), BODY_RADIUS = Math.max(0.2, effect.bodyRadius || 0.3), RISE = Math.min(BODY_HEIGHT * 3.4, BODY_HEIGHT * 0.5 + 2.4);
      bolt(renderer, effect.x, effect.y, effect.z + BODY_HEIGHT, RISE, effect.age, effect.id, BODY_RADIUS);
      if (effect.age < 0.5) {
        burst(
          renderer,
          effect.x,
          effect.y,
          effect.z + BODY_HEIGHT,
          BODY_RADIUS,
          effect.age,
          effect.id,
          "190,225,255"
        );
      }
      if (effect.age < 0.12) {
        const SKY = renderer.project(effect.x, effect.y, effect.z + BODY_HEIGHT + RISE), TOP = renderer.project(effect.x, effect.y, effect.z + BODY_HEIGHT);
        renderer.ellipse(
          TOP.x,
          TOP.y,
          renderer.scale * BODY_RADIUS * 2.6,
          renderer.scale * BODY_RADIUS * 2,
          `rgba(220,240,255,${0.55 * (1 - effect.age / 0.12)})`
        );
        renderer.ellipse(
          SKY.x,
          SKY.y,
          renderer.scale * BODY_RADIUS * 1.4,
          renderer.scale * BODY_RADIUS * 0.8,
          `rgba(200,225,255,${0.5 * (1 - effect.age / 0.12)})`
        );
      }
    }
  };

  // src/features/formation-skills/meteor/presentation.js
  var FALL_SECONDS = 0.75;
  var BLAST_SECONDS = 0.5;
  var METEOR = Object.freeze({
    // Fall: starts this many radii up and this many radii to the side, then accelerates onto the target.
    fallHeight: 5.5,
    fallSideways: 1.7,
    rock: 0.42,
    glow: 0.85,
    trailSteps: 9,
    trailSpan: 0.22,
    // Blast.
    flash: 0.22,
    scorch: 0.8,
    plumes: 4,
    debris: 10,
    smoke: 4
  });
  var TRAIL_COLORS = Object.freeze(["255,244,200", "255,196,92", "255,128,48", "176,56,28"]);
  function unit(index, salt) {
    const VALUE = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
    return VALUE - Math.floor(VALUE);
  }
  function fallPosition(effect, progress) {
    const REMAINING = 1 - progress * progress, R2 = effect.radius;
    return { x: effect.x - R2 * METEOR.fallSideways * REMAINING, z: R2 * METEOR.fallHeight * REMAINING };
  }
  var MeteorPresentation = class extends FormationPresentation {
    draw(renderer, effect) {
      const AGE = effect.age - effect.delay;
      if (AGE < 0) {
        return;
      }
      if (AGE < FALL_SECONDS) {
        this.drawFall(renderer, effect, AGE / FALL_SECONDS);
      } else {
        this.drawBlast(renderer, effect, Math.min(1, (AGE - FALL_SECONDS) / BLAST_SECONDS));
      }
    }
    // The ground mark shows the real damage radius and closes in as the rock comes down.
    drawTelegraph(renderer, effect, progress) {
      const R2 = effect.radius;
      renderer.groundEllipse(effect.x, effect.y, R2, R2, `rgba(255,120,60,${0.08 + progress * 0.2})`);
      renderer.ring(effect.x, effect.y, R2, `rgba(255,150,80,${0.4 + progress * 0.5})`, R2 * 0.06);
      renderer.ring(
        effect.x,
        effect.y,
        R2 * (1.7 - progress * 1.2),
        `rgba(255,214,150,${0.5 - progress * 0.3})`,
        R2 * 0.03
      );
    }
    drawFall(renderer, effect, progress) {
      const R2 = effect.radius, S = renderer.scale;
      this.drawTelegraph(renderer, effect, progress);
      for (let step = METEOR.trailSteps; step >= 1; step--) {
        const BEHIND = step / METEOR.trailSteps, AT2 = fallPosition(effect, Math.max(0, progress - BEHIND * METEOR.trailSpan)), POINT2 = renderer.project(AT2.x, effect.y, AT2.z), COLOR = TRAIL_COLORS[Math.min(TRAIL_COLORS.length - 1, Math.floor(BEHIND * TRAIL_COLORS.length))], SIZE = R2 * METEOR.rock * (1 - BEHIND * 0.7);
        renderer.ellipse(POINT2.x, POINT2.y, S * SIZE, S * SIZE * 1.1, `rgba(${COLOR},${0.7 * (1 - BEHIND)})`);
      }
      const AT = fallPosition(effect, progress), P = renderer.project(AT.x, effect.y, AT.z), ROCK = R2 * METEOR.rock * S;
      renderer.ellipse(P.x, P.y, ROCK * METEOR.glow * 2.6, ROCK * METEOR.glow * 2.6, "rgba(255,150,60,0.22)");
      renderer.ellipse(P.x, P.y, ROCK * 1.6, ROCK * 1.6, "rgba(255,190,90,0.4)");
      renderer.ellipse(P.x, P.y, ROCK, ROCK * 1.1, "#5a3426", progress * 6);
      renderer.ellipse(P.x - ROCK * 0.22, P.y - ROCK * 0.2, ROCK * 0.62, ROCK * 0.6, "#c2602c", progress * 6);
      renderer.ellipse(P.x - ROCK * 0.34, P.y - ROCK * 0.32, ROCK * 0.3, ROCK * 0.28, "#ffd98a");
      renderer.groundEllipse(effect.x, effect.y, R2 * 0.35 * progress, R2 * 0.35 * progress, "rgba(20,12,8,0.25)");
    }
    drawBlast(renderer, effect, progress) {
      const R2 = effect.radius, S = renderer.scale, OUT = 1 - (1 - progress) ** 3, FADE = 1 - progress, HOLD = 1 - progress * progress;
      renderer.groundEllipse(
        effect.x,
        effect.y,
        R2 * METEOR.scorch,
        R2 * METEOR.scorch,
        `rgba(28,16,10,${0.42 * (1 - progress * 0.5)})`
      );
      renderer.groundEllipse(
        effect.x,
        effect.y,
        R2 * (0.4 + OUT * 0.6),
        R2 * (0.4 + OUT * 0.6),
        `rgba(239,157,72,${FADE * 0.3})`
      );
      renderer.ring(effect.x, effect.y, R2 * OUT, `rgba(255,215,138,${FADE})`, R2 * (0.24 * FADE + 0.02));
      renderer.ring(effect.x, effect.y, R2 * OUT * 0.62, `rgba(255,255,255,${FADE})`, R2 * 0.07 * FADE);
      if (progress < METEOR.flash) {
        const T = 1 - progress / METEOR.flash, F = renderer.project(effect.x, effect.y, R2 * 0.35);
        renderer.ellipse(F.x, F.y, S * R2 * 1.5, S * R2 * 1.05, `rgba(255,240,200,${0.8 * T})`);
        renderer.ellipse(F.x, F.y, S * R2 * 0.8, S * R2 * 0.55, `rgba(255,255,255,${T})`);
      }
      for (let i = 0; i < METEOR.plumes; i++) {
        const A = i / METEOR.plumes * Math.PI * 2 + unit(i, effect.id), REACH = R2 * 0.45 * OUT, P = renderer.project(
          effect.x + Math.cos(A) * REACH,
          effect.y + Math.sin(A) * REACH * 0.6,
          R2 * (0.2 + progress * 1.1)
        );
        renderer.ellipse(P.x, P.y, S * R2 * 0.5 * HOLD, S * R2 * 0.75 * HOLD, `rgba(255,140,50,${HOLD * 0.85})`);
        renderer.ellipse(P.x, P.y, S * R2 * 0.28 * HOLD, S * R2 * 0.46 * HOLD, `rgba(255,232,160,${HOLD * 0.95})`);
      }
      for (let i = 0; i < METEOR.smoke; i++) {
        const A = i / METEOR.smoke * Math.PI * 2 + 0.7 + unit(i, effect.id + 3), P = renderer.project(
          effect.x + Math.cos(A) * R2 * 0.5 * OUT,
          effect.y + Math.sin(A) * R2 * 0.3 * OUT,
          R2 * (0.3 + progress * 1.4)
        );
        renderer.ellipse(
          P.x,
          P.y,
          S * R2 * (0.2 + progress * 0.3),
          S * R2 * (0.16 + progress * 0.24),
          `rgba(70,62,58,${FADE * 0.4})`
        );
      }
      for (let i = 0; i < METEOR.debris; i++) {
        const A = i * 2.39996 + effect.id, REACH = R2 * OUT * (0.35 + 0.65 * unit(i, effect.id)), LIFT = R2 * 1.5 * (0.4 + unit(i, effect.id + 1)) * Math.sin(progress * Math.PI), P = renderer.project(effect.x + Math.cos(A) * REACH, effect.y + Math.sin(A) * REACH * 0.7, LIFT);
        renderer.ellipse(P.x, P.y, S * R2 * 0.11 * FADE, S * R2 * 0.085 * FADE, `rgba(120,80,52,${FADE})`, A);
      }
    }
  };

  // src/features/formation-skills/meteor-shower/presentation.js
  var MeteorShowerPresentation = class extends MeteorPresentation {
  };

  // src/features/formation-skills/copy/presentation.js
  var CopyPresentation = class extends FormationPresentation {
    draw(renderer, effect) {
      const Q = Math.min(1, effect.age / effect.duration);
      renderer.ring(effect.x, effect.y, effect.radius, "#84c6e8dd", 0.12 * bodyScale(effect.radius));
      renderer.groundEllipse(effect.x, effect.y, effect.radius, effect.radius, `rgba(120,196,235,${(1 - Q) * 0.3})`);
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
        const SCALE = bodyScale(UNIT3.radius);
        cloud(renderer, UNIT3.x, UNIT3.y, UNIT3.height + 1.6 * SCALE, 1.3 * SCALE, FADE * 0.7);
        for (let i = 0; i < 4; i++) {
          const Z = ((i * 0.6 - effect.age * 2) % 1.8 + 1.8) % 1.8;
          stroke(
            renderer,
            [
              [UNIT3.x + (i - 1.5) * 0.18, UNIT3.y, Z + 0.45],
              [UNIT3.x + (i - 1.5) * 0.18, UNIT3.y, Z]
            ],
            `rgba(136,216,188,${FADE * 0.8})`,
            0.07 * SCALE
          );
        }
      }
    }
  };

  // src/features/formation-skills/hammer/presentation.js
  init_model7();
  var HammerPresentation = class extends FormationPresentation {
    draw(renderer, effect) {
      const R2 = Math.max(0.2, (effect.bodyRadius || 0.3) * 0.55), H = Math.max(R2 * 2, effect.bodyHeight || R2 * 2), AGE = effect.age, RISE_END = 0.2, TOP = effect.z + H, HIGH = TOP + R2 * 3.4, AIM_Z = TOP + R2 * 0.15, S = renderer.scale, C = renderer.ctx;
      let headZ;
      if (AGE < RISE_END) {
        headZ = HIGH + R2 * 0.5 * (1 - AGE / RISE_END);
      } else if (AGE < HAMMER_IMPACT_TIME) {
        const T = (AGE - RISE_END) / (HAMMER_IMPACT_TIME - RISE_END);
        headZ = HIGH + (AIM_Z - HIGH) * T ** 2.4;
      } else {
        headZ = AIM_Z + Math.min(0.5, (AGE - HAMMER_IMPACT_TIME) * 3) * 0;
      }
      const FADE = AGE < HAMMER_IMPACT_TIME + 0.25 ? 1 : Math.max(0, 1 - (AGE - HAMMER_IMPACT_TIME - 0.25) / 0.35);
      if (FADE <= 0) {
        return;
      }
      const WARN = Math.min(1, AGE / HAMMER_IMPACT_TIME);
      groundShadow(renderer, effect.x, effect.y, R2 * (1.6 + WARN * 0.6), 0.18 + WARN * 0.3, FADE);
      renderer.ring(effect.x, effect.y, R2 * (2.6 - WARN * 1.2), `rgba(255,214,120,${FADE * 0.7})`, R2 * 0.12);
      if (AGE >= RISE_END && AGE < HAMMER_IMPACT_TIME) {
        for (let i = -1; i <= 1; i++) {
          stroke(
            renderer,
            [
              [effect.x + i * R2 * 1.5, effect.y, headZ + R2 * 4],
              [effect.x + i * R2 * 1.5, effect.y, headZ + R2 * 1.2]
            ],
            `rgba(255,255,255,0.35)`,
            R2 * 0.16
          );
        }
      }
      stroke(
        renderer,
        [
          [effect.x, effect.y, headZ + R2 * 0.6],
          [effect.x, effect.y, headZ + R2 * 5]
        ],
        `rgba(76,48,30,${FADE})`,
        R2 * 1.05
      );
      stroke(
        renderer,
        [
          [effect.x, effect.y, headZ + R2 * 0.6],
          [effect.x, effect.y, headZ + R2 * 5]
        ],
        `rgba(160,106,64,${FADE})`,
        R2 * 0.7
      );
      const P = renderer.project(effect.x, effect.y, headZ + R2 * 0.9), W = S * R2 * 3.4, HH = S * R2 * 1.9;
      C.beginPath();
      C.roundRect(P.x - W / 2, P.y - HH / 2, W, HH, S * R2 * 0.35);
      C.fillStyle = `rgba(58,70,86,${FADE})`;
      C.fill();
      C.beginPath();
      C.roundRect(P.x - W / 2 + S * R2 * 0.18, P.y - HH / 2 + S * R2 * 0.14, W - S * R2 * 0.36, HH * 0.42, S * R2 * 0.25);
      C.fillStyle = `rgba(178,196,214,${FADE})`;
      C.fill();
      C.beginPath();
      C.roundRect(P.x - W / 2, P.y - HH / 2, W, HH, S * R2 * 0.35);
      C.strokeStyle = `rgba(28,34,44,${FADE})`;
      C.lineWidth = Math.max(1, S * R2 * 0.14);
      C.stroke();
      if (AGE >= HAMMER_IMPACT_TIME) {
        const T = AGE - HAMMER_IMPACT_TIME;
        burst(renderer, effect.x, effect.y, AIM_Z, R2, T, effect.id, "255,224,130");
        renderer.ring(
          effect.x,
          effect.y,
          R2 * (1 + T * 7),
          `rgba(255,224,130,${Math.max(0, 1 - T / 0.5)})`,
          R2 * 0.3,
          0,
          Math.PI * 2,
          AIM_Z
        );
        renderer.ring(
          effect.x,
          effect.y,
          R2 * (0.6 + T * 4.5),
          `rgba(255,255,255,${Math.max(0, 1 - T / 0.35)})`,
          R2 * 0.16,
          0,
          Math.PI * 2,
          AIM_Z
        );
        if (T < 0.1) {
          const F = renderer.project(effect.x, effect.y, AIM_Z);
          renderer.ellipse(F.x, F.y, S * R2 * 2, S * R2 * 1, `rgba(255,248,210,${0.6 * (1 - T / 0.1)})`);
        }
        if (T < 1) {
          for (let i = 0; i < 3; i++) {
            const A = T * 6 + i * Math.PI * 2 / 3, SP = renderer.project(
              effect.x + Math.cos(A) * R2 * 1.3,
              effect.y + Math.sin(A) * R2 * 0.5,
              AIM_Z + R2 * 0.9
            );
            renderer.ellipse(SP.x, SP.y, S * R2 * 0.28, S * R2 * 0.28, `rgba(255,236,120,${FADE})`);
          }
        }
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
        const BEAM = bodyScale(effect.bodyRadius);
        stroke(renderer, POINTS, "#74f5db44", 0.33 * BEAM);
        stroke(renderer, POINTS, "#afffe6cc", 0.11 * BEAM);
        stroke(renderer, POINTS, "#f4fff3", 0.035 * BEAM);
        if (PULSE_ACTIVE) {
          renderer.ring(effect.x, effect.y, 0.25 + PULSE_AGE * 2, "#bfffd7aa", 0.04);
        }
      }
      C.globalAlpha = 1;
    }
  };

  // src/features/formation-skills/storm-cloud/presentation.js
  var import_vector_sockets3 = __toESM(require_vector_sockets(), 1);
  var POINT_BUFFERS = /* @__PURE__ */ new WeakMap();
  var CLOUD_SPREAD_DEPTH = 0.35;
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
  function cloudGeometry(effect) {
    const RADIUS = Math.max(0.2, (effect.bodyRadius || 0.3) * 0.55);
    return { radius: RADIUS, size: RADIUS * 2.6, z: Math.max(effect.z, effect.targetZ + 2) + RADIUS * 1.9 };
  }
  var StormCloudPresentation = class extends FormationPresentation {
    includeBounds(effect, bounds) {
      const { size: SIZE, z: Z } = cloudGeometry(effect);
      bounds.left = Math.min(bounds.left, effect.x - SIZE * 1.84 - 1);
      bounds.right = Math.max(bounds.right, effect.x + SIZE * 1.84 + 1);
      bounds.top = Math.max(
        bounds.top,
        (effect.y + SIZE * CLOUD_SPREAD_DEPTH) * import_vector_sockets3.WORLD_DEPTH_PROJECTION + (Z + 0.1 + SIZE * 0.24) * import_vector_sockets3.WORLD_HEIGHT_PROJECTION + SIZE * 0.26 + 1
      );
    }
    draw(renderer, effect) {
      const { radius: BODY_RADIUS, size: CLOUD_SIZE, z: CLOUD_Z } = cloudGeometry(effect), BODY_SCALE = bodyScale(effect.bodyRadius), ENTER = Math.min(1, effect.age / 0.5), EXIT = Math.max(0, effect.age - 0.5 - effect.duration) / 0.5, Z = CLOUD_Z + Math.sin(effect.age * 3) * Math.min(0.1, BODY_RADIUS * 0.12), ARC_Z = Z - CLOUD_SIZE * 0.25, SPREAD = (1 - ENTER + EXIT) * BODY_RADIUS * 2.6;
      for (let index = 0; index < 3; index++) {
        const ANGLE = index * Math.PI * 2 / 3;
        cloud(
          renderer,
          effect.x + Math.cos(ANGLE) * SPREAD,
          effect.y + Math.sin(ANGLE) * SPREAD * CLOUD_SPREAD_DEPTH,
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
            POINT2[2] = ARC_Z + (effect.targetZ - ARC_Z) * T + CURVE * (0.18 + BEND * 0.16);
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
  function includeFormationEffectBounds(world, bounds) {
    for (const EFFECT of world.formationEffects || []) {
      PRESENTATIONS.get(EFFECT.kind)?.includeBounds?.(EFFECT, bounds);
    }
  }

  // src/features/scenes/farm/presentation.js
  init_definition11();

  // src/features/farm-modes/vfx-kit.js
  init_unit_grades();
  var TAU = Math.PI * 2;
  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }
  function easeOut(t) {
    return 1 - (1 - clamp01(t)) ** 3;
  }
  function pop(t) {
    const T = clamp01(t);
    return T < 0.6 ? Math.sin(T / 0.6 * Math.PI * 0.5) * 1.18 : 1.18 - 0.18 * ((T - 0.6) / 0.4);
  }
  function rgba(hex, alpha) {
    const MATCH = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!MATCH) {
      return hex;
    }
    return `rgba(${parseInt(MATCH[1], 16)},${parseInt(MATCH[2], 16)},${parseInt(MATCH[3], 16)},${clamp01(alpha).toFixed(3)})`;
  }
  function gradeColor(tier, fallback = "#58b9bb") {
    return UNIT_GRADES[tier - 1]?.outlineColor || fallback;
  }
  function strokeArc(renderer, point2, rx, ry, start2, end, color, width) {
    const C = renderer.ctx;
    C.strokeStyle = color;
    C.lineWidth = Math.max(0.5, width);
    C.lineCap = "round";
    C.beginPath();
    C.ellipse(point2.x, point2.y, Math.max(0.01, rx), Math.max(0.01, ry), 0, start2, end);
    C.stroke();
  }
  function drawSparkle(renderer, point2, radius, color, rotation = 0) {
    const C = renderer.ctx, INNER = radius * 0.28, COS = Math.cos(rotation), SIN = Math.sin(rotation);
    C.fillStyle = color;
    C.beginPath();
    for (let i = 0; i < 8; i++) {
      const R2 = i % 2 === 0 ? radius : INNER, A = i * Math.PI / 4, X = Math.cos(A) * R2, Y = Math.sin(A) * R2;
      const PX = point2.x + X * COS - Y * SIN, PY = point2.y + X * SIN + Y * COS;
      if (i === 0) {
        C.moveTo(PX, PY);
      } else {
        C.lineTo(PX, PY);
      }
    }
    C.closePath();
    C.fill();
  }
  function drawRay(renderer, from, to, halfWidth, color) {
    const C = renderer.ctx, DX = to.x - from.x, DY = to.y - from.y, LENGTH = Math.hypot(DX, DY) || 1, NX = -DY / LENGTH * halfWidth, NY = DX / LENGTH * halfWidth;
    C.fillStyle = color;
    C.beginPath();
    C.moveTo(from.x + NX, from.y + NY);
    C.lineTo(to.x, to.y);
    C.lineTo(from.x - NX, from.y - NY);
    C.closePath();
    C.fill();
  }

  // src/features/farm-modes/breed/presentation.js
  var HEART = "#e5809f";
  var HEART_LIGHT = "#fbd3df";
  var HEART_COUNT = 5;
  var BURST_COUNT = 6;
  function drawHeart(renderer, point2, radius, color) {
    const C = renderer.ctx;
    renderer.ellipse(point2.x - radius * 0.44, point2.y - radius * 0.25, radius * 0.6, radius * 0.6, color);
    renderer.ellipse(point2.x + radius * 0.44, point2.y - radius * 0.25, radius * 0.6, radius * 0.6, color);
    C.fillStyle = color;
    C.beginPath();
    C.moveTo(point2.x - radius, point2.y);
    C.lineTo(point2.x, point2.y + radius);
    C.lineTo(point2.x + radius, point2.y);
    C.closePath();
    C.fill();
  }
  var BirthEffect = class {
    draw(renderer, effect, progress) {
      const P = clamp01(progress), X = effect.x, Y = effect.y, Z = effect.z || 0.7;
      renderer.ring(X, Y, 0.25 + easeOut(P) * 1.3, rgba(HEART, 0.75 * (1 - P)), 0.05 * (1 - P) + 0.012);
      if (P > 0.16) {
        const Q = clamp01((P - 0.16) / 0.84);
        renderer.ring(X, Y, 0.15 + easeOut(Q) * 0.9, rgba(HEART_LIGHT, 0.8 * (1 - Q)), 0.035 * (1 - Q) + 0.01);
      }
      if (P < 0.4) {
        const T = P / 0.4;
        for (let index = 0; index < BURST_COUNT; index++) {
          const ANGLE = index * TAU / BURST_COUNT + 0.4, POINT2 = renderer.project(
            X + Math.cos(ANGLE) * easeOut(T) * 0.85,
            Y + Math.sin(ANGLE) * easeOut(T) * 0.7,
            Z * 0.5 + easeOut(T) * 0.35
          );
          drawSparkle(
            renderer,
            POINT2,
            renderer.scale * 0.085 * (1 - T),
            rgba(index % 2 ? HEART_LIGHT : HEART, 1 - T),
            T * 2
          );
        }
      }
      for (let index = 0; index < HEART_COUNT; index++) {
        const T = clamp01((P - index * 0.05) / 0.82);
        if (T <= 0 || T >= 1) {
          continue;
        }
        const ANGLE = index * TAU / HEART_COUNT + 0.4, SWAY = Math.sin(T * TAU * 1.2 + index * 1.3) * 0.09, POINT2 = renderer.project(
          X + Math.cos(ANGLE) * 0.42 * easeOut(T) + SWAY,
          Y + Math.sin(ANGLE) * 0.3 * easeOut(T),
          Z + easeOut(T) * 1.25
        ), SIZE = renderer.scale * 0.15 * pop(T * 1.8), ALPHA = T < 0.6 ? 1 : 1 - (T - 0.6) / 0.4;
        drawHeart(renderer, POINT2, SIZE, rgba(HEART, ALPHA));
        renderer.ellipse(
          POINT2.x - SIZE * 0.5,
          POINT2.y - SIZE * 0.42,
          SIZE * 0.16,
          SIZE * 0.12,
          rgba(HEART_LIGHT, ALPHA * 0.9)
        );
      }
    }
  };

  // src/features/farm-modes/merge/presentation.js
  init_farm_model();
  var HOLE_PURPLE = "#7b58bd";
  var HOLE_LIGHT = "#d9c4ff";
  var HOLE_RIM = "#e9dcff";
  var CREAM = "#fffbee";
  var ORBIT_COUNT = 6;
  var TRAIL_STEPS = 3;
  function mergeHoleState(renderer, task) {
    const APPROACH = task.phase === "approach", PROGRESS = APPROACH ? CLAMP2(task.elapsed / task.duration, 0, 1) : 1, PULSE = 0.5 + 0.5 * Math.sin(renderer.displayTimeMs * 6e-3 + (task.materialIds?.[0] || 0) * 0.17), OPEN = APPROACH ? easeOut(PROGRESS / 0.25) : 1;
    let bump = 0;
    if (!APPROACH && task.materialIds?.length) {
      const STEP = task.duration * 0.72 / task.materialIds.length;
      for (let index = 0; index < task.materialIds.length; index++) {
        const AGE = task.elapsed - (index + 1) * STEP;
        if (AGE >= 0) {
          bump = Math.max(bump, Math.exp(-AGE * 16));
        }
      }
    }
    const RADIUS = renderer.scale * (0.26 + PROGRESS * 0.07 + PULSE * 0.025 + bump * 0.07) * OPEN;
    return { progress: PROGRESS, pulse: PULSE, bump, open: OPEN, radius: RADIUS };
  }
  function drawOrbit(renderer, task, state, front) {
    const TIME = renderer.displayTimeMs * 42e-4, Z = task.centerZ + (front ? 0.32 : -0.16);
    for (let index = 0; index < ORBIT_COUNT; index++) {
      const DIRECTION = index % 2 ? -1 : 1, BASE = TIME * DIRECTION + index * TAU / ORBIT_COUNT, SPREAD = 0.46 + 0.1 * Math.sin(index * 1.7) + state.bump * 0.12;
      for (let trail = TRAIL_STEPS; trail >= 0; trail--) {
        const ANGLE = BASE - trail * 0.2 * DIRECTION, IS_FRONT = Math.sin(ANGLE) >= 0;
        if (IS_FRONT !== front) {
          continue;
        }
        const POINT2 = renderer.project(
          task.centerX + Math.cos(ANGLE) * SPREAD,
          task.centerY + Math.sin(ANGLE) * SPREAD * 0.74,
          Z
        ), SIZE = renderer.scale * (0.04 - trail * 7e-3) * state.open * (1 + state.bump * 0.4);
        renderer.ellipse(
          POINT2.x,
          POINT2.y,
          SIZE,
          SIZE * 0.78,
          rgba(trail ? HOLE_LIGHT : CREAM, (1 - trail / (TRAIL_STEPS + 1)) * 0.95)
        );
      }
    }
  }
  function drawMergeBlackHoleBack(renderer, task) {
    const STATE = mergeHoleState(renderer, task), CENTER = renderer.project(task.centerX, task.centerY, task.centerZ - 0.16), R2 = STATE.radius;
    renderer.ellipse(CENTER.x, CENTER.y, R2 * 3.3, R2 * 1.95, rgba(HOLE_PURPLE, 0.18 * STATE.open));
    renderer.ellipse(CENTER.x, CENTER.y, R2 * 2.3, R2 * 1.38, rgba(HOLE_PURPLE, 0.5 * STATE.open));
    drawOrbit(renderer, task, STATE, false);
  }
  function drawMergeBlackHoleFront(renderer, task) {
    const STATE = mergeHoleState(renderer, task), CENTER = renderer.project(task.centerX, task.centerY, task.centerZ + 0.32), R2 = STATE.radius;
    renderer.ellipse(CENTER.x, CENTER.y, R2 * 1.6, R2 * 0.98, "#21182e");
    renderer.ellipse(CENTER.x, CENTER.y, R2 * 1.2, R2 * 0.72, "#0f0b17");
    strokeArc(
      renderer,
      CENTER,
      R2 * 1.62,
      R2 * 0.99,
      0,
      TAU,
      rgba(HOLE_RIM, 0.55 + 0.35 * STATE.bump),
      renderer.scale * 0.028
    );
    if (STATE.bump > 0.05) {
      strokeArc(
        renderer,
        CENTER,
        R2 * (1.7 + (1 - STATE.bump) * 1.1),
        R2 * (1.04 + (1 - STATE.bump) * 0.7),
        0,
        TAU,
        rgba(CREAM, STATE.bump * 0.7),
        renderer.scale * 0.02
      );
    }
    drawOrbit(renderer, task, STATE, true);
  }
  function drawMergeBlackHoles(renderer, world) {
    for (const TASK of world.mergeTasks) {
      if (!Number.isFinite(TASK.centerX) || !Number.isFinite(TASK.centerY) || !Number.isFinite(TASK.centerZ)) {
        continue;
      }
      const STATE = mergeHoleState(renderer, TASK), ID = Number.isFinite(TASK.materialIds?.[0]) ? TASK.materialIds[0] : 0, DEPTH = 0.785 * TASK.centerY - 0.62 * TASK.centerZ, TIME = renderer.displayTimeMs * 16e-4;
      renderer.groundEllipse(
        TASK.centerX,
        TASK.centerY,
        0.62 * STATE.open,
        0.62 * STATE.open,
        rgba(HOLE_PURPLE, 0.16)
      );
      renderer.strokeGroundEllipse(
        TASK.centerX,
        TASK.centerY,
        (0.56 + STATE.pulse * 0.05) * STATE.open,
        (0.56 + STATE.pulse * 0.05) * STATE.open,
        rgba("#8a63c9", 0.7),
        0.04
      );
      renderer.strokeGroundEllipse(
        TASK.centerX,
        TASK.centerY,
        0.38 * STATE.open,
        0.38 * STATE.open,
        rgba(HOLE_LIGHT, 0.5),
        0.025
      );
      for (let index = 0; index < 8; index++) {
        const ANGLE = TIME + index * TAU / 8, POINT2 = renderer.project(
          TASK.centerX + Math.cos(ANGLE) * 0.56 * STATE.open,
          TASK.centerY + Math.sin(ANGLE) * 0.56 * STATE.open,
          0
        );
        renderer.ellipse(POINT2.x, POINT2.y, renderer.scale * 0.032, renderer.scale * 0.02, rgba(HOLE_LIGHT, 0.9));
      }
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
  var MergeEffect = class {
    draw(renderer, effect, progress) {
      const P = clamp01(progress), COLOR = gradeColor(effect.tier), X = effect.x, Y = effect.y, Z = effect.z || 1, CENTER = renderer.project(X, Y, Z);
      if (P < 0.32) {
        const T = P / 0.32, R2 = renderer.scale * (0.18 + easeOut(T) * 1.05);
        renderer.ellipse(CENTER.x, CENTER.y, R2, R2 * 0.8, rgba(CREAM, 0.9 * (1 - T) ** 2));
      }
      const RING_A = easeOut(P);
      renderer.ring(X, Y, 0.3 + RING_A * 1.9, rgba(COLOR, 0.95 * (1 - P)), 0.12 * (1 - P) + 0.02);
      if (P > 0.12) {
        const Q = clamp01((P - 0.12) / 0.88);
        renderer.ring(X, Y, 0.2 + easeOut(Q) * 1.35, rgba(CREAM, 0.8 * (1 - Q)), 0.05 * (1 - Q) + 0.012);
      }
      const BEAM = clamp01(1 - P / 0.6);
      if (BEAM > 0) {
        const BOTTOM = renderer.project(X, Y, 0), TOP = renderer.project(X, Y, 2.4), WIDTH = renderer.scale * 0.34 * (0.4 + 0.6 * BEAM), C = renderer.ctx;
        C.fillStyle = rgba(COLOR, 0.3 * BEAM);
        C.beginPath();
        C.moveTo(BOTTOM.x - WIDTH, BOTTOM.y);
        C.lineTo(TOP.x - WIDTH * 0.35, TOP.y);
        C.lineTo(TOP.x + WIDTH * 0.35, TOP.y);
        C.lineTo(BOTTOM.x + WIDTH, BOTTOM.y);
        C.closePath();
        C.fill();
      }
      const RAYS = 8, REACH = easeOut(P) * 1.5;
      for (let index = 0; index < RAYS; index++) {
        const ANGLE = index * TAU / RAYS + P * 0.5, FROM = renderer.project(X + Math.cos(ANGLE) * REACH * 0.4, Y + Math.sin(ANGLE) * REACH * 0.4, Z - 0.5), TO = renderer.project(X + Math.cos(ANGLE) * REACH, Y + Math.sin(ANGLE) * REACH, Z - 0.5);
        drawRay(
          renderer,
          FROM,
          TO,
          renderer.scale * 0.05 * (1 - P),
          rgba(index % 2 ? CREAM : COLOR, (1 - P) ** 1.4)
        );
      }
      const SPARKLES = 6 + (effect.tier || 2) * 2;
      for (let index = 0; index < SPARKLES; index++) {
        const SEED = Math.sin(index * 12.9898 + 4.1) * 43758.5453, JITTER = SEED - Math.floor(SEED), ANGLE = index * TAU / SPARKLES + JITTER * 0.8, DISTANCE = (0.35 + JITTER * 0.9) * easeOut(P), RISE = easeOut(P) * (0.5 + JITTER * 0.8) - P * P * 0.4, POINT2 = renderer.project(
          X + Math.cos(ANGLE) * DISTANCE,
          Y + Math.sin(ANGLE) * DISTANCE * 0.8,
          Z - 0.3 + RISE
        ), SIZE = renderer.scale * (0.07 + JITTER * 0.07) * pop(P * 2.2) * (1 - P * 0.6);
        drawSparkle(renderer, POINT2, SIZE, rgba(index % 2 ? CREAM : COLOR, clamp01(1.4 - P * 1.3)), P * 3 + index);
      }
    }
  };
  var MergeMaterialEffect = class {
    draw(renderer, effect, progress) {
      const T = CLAMP2(progress, 0, 1), SIDE = (effect.sequenceIndex || 0) % 2 ? 1 : -1, DX = effect.targetX - effect.x, DY = effect.targetY - effect.y, LENGTH = Math.hypot(DX, DY) || 1, NORMAL_X = -DY / LENGTH, NORMAL_Y = DX / LENGTH, AT = (u) => {
        const V = CLAMP2(u, 0, 1), POSITION = mergeMaterialPosition(effect, V), ARC = Math.sin(V * Math.PI) * 0.45 * SIDE * Math.min(1, LENGTH / 1.2);
        return renderer.project(
          POSITION.x + NORMAL_X * ARC,
          POSITION.y + NORMAL_Y * ARC,
          POSITION.z + Math.sin(V * Math.PI) * 0.25
        );
      };
      for (let step = 5; step >= 1; step--) {
        const U = T - step * 0.07;
        if (U < 0) {
          continue;
        }
        const POINT2 = AT(U), FADE = 1 - step / 6;
        renderer.ellipse(
          POINT2.x,
          POINT2.y,
          renderer.scale * 0.08 * FADE * (1 - 0.4 * T),
          renderer.scale * 0.06 * FADE * (1 - 0.4 * T),
          rgba("#58b9bb", 0.55 * FADE)
        );
      }
      const HEAD = AT(T), SIZE = renderer.scale * 0.13 * (1 - 0.45 * T);
      renderer.ellipse(HEAD.x, HEAD.y, SIZE, SIZE * 0.78, rgba("#58b9bb", 0.95));
      renderer.ellipse(HEAD.x, HEAD.y, SIZE * 0.5, SIZE * 0.4, rgba(CREAM, 0.95));
    }
  };

  // src/farm-render-effects.js
  init_presentation4();

  // src/features/farm-modes/basic-presentation.js
  var GOLD = "#e1be67";
  var GOLD_LIGHT = "#fae19e";
  var FOOD = "#c2913e";
  var DUST = "#b3a989";
  var DUST_DARK = "#7e7e63";
  var CREAM2 = "#fff4cf";
  function groundTicks(renderer, x, y, inner, outer, count, color, width, offset = 0) {
    const C = renderer.ctx;
    C.strokeStyle = color;
    C.lineWidth = Math.max(0.5, width);
    C.lineCap = "round";
    for (let index = 0; index < count; index++) {
      const ANGLE = offset + index * TAU / count, FROM = renderer.project(x + Math.cos(ANGLE) * inner, y + Math.sin(ANGLE) * inner, 0.02), TO = renderer.project(x + Math.cos(ANGLE) * outer, y + Math.sin(ANGLE) * outer, 0.02);
      C.beginPath();
      C.moveTo(FROM.x, FROM.y);
      C.lineTo(TO.x, TO.y);
      C.stroke();
    }
  }
  function puff(renderer, x, y, z, radius, color, alpha) {
    const POINT2 = renderer.project(x, y, z);
    renderer.ellipse(POINT2.x, POINT2.y, renderer.scale * radius, renderer.scale * radius * 0.78, rgba(color, alpha));
  }
  var FeedEffect = class {
    draw(renderer, effect, progress) {
      const P = clamp01(progress);
      renderer.ring(effect.x, effect.y, 0.2 + easeOut(P) * 0.6, rgba(FOOD, 0.9 * (1 - P)), 0.06 * (1 - P) + 0.012);
      for (let index = 0; index < 3; index++) {
        const T = clamp01((P - index * 0.08) / 0.7);
        if (T <= 0 || T >= 1) {
          continue;
        }
        const ANGLE = index * TAU / 3 + 0.5, POINT2 = renderer.project(
          effect.x + Math.cos(ANGLE) * 0.18 * T,
          effect.y + Math.sin(ANGLE) * 0.14 * T,
          0.15 + easeOut(T) * 0.7
        );
        drawSparkle(
          renderer,
          POINT2,
          renderer.scale * 0.07 * pop(T * 2) * (1 - T * 0.5),
          rgba(GOLD_LIGHT, 1 - T),
          T * 2
        );
      }
    }
  };
  var FoodLandingEffect = class {
    draw(renderer, effect, progress) {
      const T = clamp01(progress / 0.45);
      if (T >= 1) {
        return;
      }
      renderer.groundEllipse(
        effect.x,
        effect.y,
        0.1 + easeOut(T) * 0.4,
        0.1 + easeOut(T) * 0.4,
        rgba(GOLD, 0.35 * (1 - T))
      );
      renderer.ring(effect.x, effect.y, 0.1 + easeOut(T) * 0.5, rgba(FOOD, 0.85 * (1 - T)), 0.055 * (1 - T) + 0.01);
      for (let index = 0; index < 5; index++) {
        const ANGLE = index * TAU / 5 + 0.3, REACH = easeOut(T) * (0.34 + index % 2 * 0.14), POINT2 = renderer.project(
          effect.x + Math.cos(ANGLE) * REACH,
          effect.y + Math.sin(ANGLE) * REACH * 0.8,
          0.06 + Math.sin(T * Math.PI) * (0.22 + index % 2 * 0.1)
        );
        renderer.ellipse(
          POINT2.x,
          POINT2.y,
          renderer.scale * 0.065,
          renderer.scale * 0.05,
          rgba(index % 2 ? GOLD_LIGHT : GOLD, 1 - T * T)
        );
      }
    }
  };
  var ImpactEffect = class {
    draw(renderer, effect, progress) {
      const P = clamp01(progress);
      renderer.groundEllipse(
        effect.x,
        effect.y,
        0.2 + easeOut(P) * 0.7,
        0.2 + easeOut(P) * 0.7,
        rgba(DUST, 0.3 * (1 - P))
      );
      renderer.ring(
        effect.x,
        effect.y,
        0.1 + easeOut(P) * 0.85,
        rgba(DUST_DARK, 0.85 * (1 - P)),
        0.06 * (1 - P) + 0.01
      );
      groundTicks(
        renderer,
        effect.x,
        effect.y,
        0.2 + easeOut(P) * 0.6,
        0.32 + easeOut(P) * 0.85,
        6,
        rgba(DUST_DARK, 0.5 * (1 - P)),
        3
      );
    }
  };
  var ShockwaveEffect = class {
    draw(renderer, effect, progress) {
      const P = clamp01(progress / (effect.duration || 0.55)), RADIUS = Math.max(0.08, effect.radius) * (0.2 + 0.8 * easeOut(P)), FADE = 1 - P;
      renderer.groundEllipse(effect.x, effect.y, RADIUS, RADIUS, rgba(GOLD, 0.16 * FADE));
      renderer.ring(effect.x, effect.y, RADIUS, rgba(GOLD, 0.9 * FADE), 0.12 * FADE + 0.025);
      renderer.ring(
        effect.x,
        effect.y,
        Math.max(0.05, RADIUS - 0.14),
        rgba(GOLD_LIGHT, 0.6 * FADE),
        0.045 * FADE + 0.01
      );
      groundTicks(renderer, effect.x, effect.y, RADIUS * 0.72, RADIUS * 0.94, 12, rgba(CREAM2, 0.7 * FADE), 3, P);
    }
  };
  var DropDustEffect = class {
    draw(renderer, effect, progress) {
      const P = clamp01(progress / 0.5);
      if (P >= 1) {
        return;
      }
      renderer.ring(
        effect.x,
        effect.y,
        0.12 + easeOut(P) * 0.5,
        rgba(DUST_DARK, 0.45 * (1 - P)),
        0.045 * (1 - P) + 0.01
      );
      for (let index = 0; index < 6; index++) {
        const ANGLE = index * TAU / 6 + 0.4, REACH = easeOut(P) * 0.42;
        puff(
          renderer,
          effect.x + Math.cos(ANGLE) * REACH,
          effect.y + Math.sin(ANGLE) * REACH * 0.7,
          0.05 + P * 0.22,
          0.08 + P * 0.09,
          index % 2 ? "#c9bf9c" : DUST,
          0.95 * (1 - P)
        );
      }
    }
  };
  var EatingEffect = class {
    draw(renderer, effect, progress) {
      const P = clamp01(progress), Z = effect.z || 0.5;
      renderer.ring(
        effect.x,
        effect.y,
        0.15 + easeOut(P) * 0.5,
        rgba(GOLD_LIGHT, 0.6 * (1 - P)),
        0.035 * (1 - P) + 0.01
      );
      for (let index = 0; index < 4; index++) {
        const T = clamp01(P / 0.7), ANGLE = index * TAU / 4 + 0.6, POINT2 = renderer.project(
          effect.x + Math.cos(ANGLE) * easeOut(T) * 0.38,
          effect.y + Math.sin(ANGLE) * easeOut(T) * 0.3,
          Z + easeOut(T) * 0.65 - T * T * 0.2
        );
        if (T < 1) {
          drawSparkle(
            renderer,
            POINT2,
            renderer.scale * 0.12 * pop(T * 2) * (1 - T * 0.6),
            rgba(index % 2 ? CREAM2 : GOLD, 1 - T),
            T * 3
          );
        }
      }
    }
  };
  var ThreshEffect = class {
    draw(renderer, effect, progress) {
      const BIG = effect.big === true, DURATION3 = BIG ? 0.9 : 0.55, P = clamp01(progress / DURATION3);
      if (P >= 1) {
        return;
      }
      const C = renderer.ctx, COUNT = BIG ? 14 : 7;
      if (BIG) {
        renderer.ring(
          effect.x,
          effect.y,
          0.4 + easeOut(P) * 1.3,
          rgba(GOLD, 0.8 * (1 - P)),
          0.08 * (1 - P) + 0.012
        );
      }
      C.lineCap = "round";
      for (let index = 0; index < COUNT; index++) {
        const ANGLE = index * TAU / COUNT + index % 2 * 0.35, REACH = (BIG ? 2.1 : 1.3) * (0.55 + index % 3 * 0.22) * easeOut(P), LIFT = Math.sin(P * Math.PI) * (BIG ? 1.8 : 1.2) * (0.6 + index % 4 * 0.15), FROM = renderer.project(
          effect.x + Math.cos(ANGLE) * REACH,
          effect.y + Math.sin(ANGLE) * REACH * 0.7,
          0.5 + LIFT
        ), SPIN = ANGLE + P * 7;
        C.strokeStyle = rgba(index % 2 ? "#e9cf84" : "#c99f4a", 1 - P * P);
        C.lineWidth = Math.max(1, renderer.scale * 0.06);
        C.beginPath();
        C.moveTo(FROM.x - Math.cos(SPIN) * renderer.scale * 0.1, FROM.y - Math.sin(SPIN) * renderer.scale * 0.05);
        C.lineTo(FROM.x + Math.cos(SPIN) * renderer.scale * 0.1, FROM.y + Math.sin(SPIN) * renderer.scale * 0.05);
        C.stroke();
      }
      for (let index = 0; index < (BIG ? 6 : 3); index++) {
        const ANGLE = index * 2.1 + 0.7, REACH = (0.4 + easeOut(P) * 0.9) * (BIG ? 1.2 : 0.8), POINT2 = renderer.project(
          effect.x + Math.cos(ANGLE) * REACH,
          effect.y + Math.sin(ANGLE) * REACH * 0.7,
          0.45 + Math.sin(P * Math.PI) * 1
        );
        renderer.ellipse(POINT2.x, POINT2.y, renderer.scale * 0.05, renderer.scale * 0.07, rgba(FOOD, 1 - P));
      }
      puff(renderer, effect.x, effect.y + 0.05, 0.3 + P * 0.4, 0.3 + P * 0.35, DUST, 0.5 * (1 - P));
    }
  };

  // src/farm-render-effects.js
  init_farm_model();
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
    ["thresh", new ThreshEffect()],
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
      return world.farmBossEvent?.phase !== "idle" && world.farmBossEvent?.phase !== "marching";
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
    unitMood(unit2, joyEffects) {
      if (unit2.cooldown > 0 && unit2.ability?.phase === "idle") {
        return "neutral";
      }
      for (const EFFECT of joyEffects) {
        if (Math.hypot(EFFECT.x - unit2.x, EFFECT.y - unit2.y) < 1.2) {
          return "happy";
        }
      }
      return unit2.fed ? "neutral" : "hungry";
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
      for (const FOOD2 of world.food) {
        renderer.addActor(renderer.foodPresentation, FOOD2, 0.785 * FOOD2.y - 0.62 * FOOD2.z, -1);
      }
    }
    drawBoundary() {
    }
  };

  // src/farm-render-scenes.js
  var SCENE_PRESENTATIONS = new Map(
    [new FarmScenePresentation()].map((presentation) => [presentation.id, presentation])
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
  var import_definition54 = __toESM(require_definition(), 1);
  var import_vector_sockets4 = __toESM(require_vector_sockets(), 1);
  function seedDisplayMultiplier(renderer, projectile) {
    const BODY2 = (0, import_definition54.unitBodyDefinition)(projectile.species), OWNER_VECTOR_SCALE = projectile.height * import_vector_sockets4.WORLD_HEIGHT_PROJECTION / (FEATURE.bodyHeightFraction * (BODY2.bounds.bottom - BODY2.bounds.top)), DISPLAY_SCALE = (0, import_definition54.unitDisplayScale)(BODY2, OWNER_VECTOR_SCALE, renderer.scale, renderer.minimumUnitPixels());
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
      const RADII = seedEllipseRadii(projectile), SCALE = seedDisplayMultiplier(renderer, projectile), HEIGHT = projectile.height * import_vector_sockets4.WORLD_HEIGHT_PROJECTION * SCALE, P = { x: point2.x, y: point2.y - HEIGHT * 0.5 }, TAIL = renderer.project(tail.x, tail.y, tail.z), X = RADII.x * SCALE, Y = RADII.y * SCALE;
      TAIL.y -= HEIGHT * 0.5;
      renderer.line(TAIL, P, RADII.y * 0.35 * SCALE / renderer.scale, "#ba964a80");
      renderer.ellipse(P.x, P.y, X, Y, "#cfa957", FEATURE.rotation);
      renderer.ellipse(P.x - Y * 0.15, P.y - Y * 0.25, Y * 0.25, Y * 0.4, "#fff0ae");
    }
  };

  // src/features/projectiles/spike/presentation.js
  init_definition18();
  var SpikeProjectilePresentation = class {
    constructor() {
      this.id = FEATURE5.id;
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
  init_definition19();
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
  var import_definition59 = __toESM(require_definition(), 1);
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
  init_definition16();
  var LobPresentation = class extends UnitAttackPresentation {
    constructor() {
      super();
      this.id = FEATURE3.id;
    }
    recoverMotion(unit2) {
      return unit2.ability?.action?.path && unit2.ability.elapsed < 0.12 ? "fire" : "recover";
    }
  };

  // src/features/unit-attacks/dual-strike/presentation.js
  init_definition17();
  var DualStrikePresentation = class extends UnitAttackPresentation {
    constructor() {
      super();
      this.id = FEATURE4.id;
    }
    activeMotion(unit2) {
      return unit2.ability.peanutStrikeCount > 2 ? `fire-${unit2.ability.peanutStrikeCount}` : "fire";
    }
  };

  // src/farm-render-units.js
  init_farm_model();

  // src/farm-indicators.js
  init_factions();
  function farmBreedingCooldown(unit2, world, defaultDuration = 10, result = {}) {
    if (world?.scene !== "farm" || unit2?.hp <= 0 || unit2?.down > 0 || unit2?.cooldown <= 0 || unit2?.meals !== 0) {
      return null;
    }
    const DURATION3 = unit2.cooldownDuration || world.breedCooldownDuration?.() || defaultDuration;
    const REMAINING = Math.max(0, unit2.cooldown);
    result.remaining = REMAINING;
    result.duration = DURATION3;
    result.progress = Math.max(0, Math.min(1, 1 - REMAINING / DURATION3));
    return result;
  }
  function unitRestPresentation(unit2, world, duration, result) {
    if (unit2.faction !== FACTION_CONFIG.PLAYER || unit2.isBattleOnlySummon || unit2.hp > 0) {
      return null;
    }
    const RECOVERING = world.scene === "farm" && unit2.down > 0;
    let elapsed = RECOVERING ? Math.max(0, duration - unit2.down) : Infinity;
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
        if (EVENT.kind === "unit-hit" && EVENT.unit === unit2.id && AGE >= 0) {
          elapsed = AGE;
          break;
        }
      }
    }
    result.phase = elapsed < 0.5 ? "defeat" : RECOVERING && unit2.down <= 0.5 ? "wake" : "sleep";
    result.elapsed = result.phase === "defeat" ? elapsed : result.phase === "wake" ? 0.5 - unit2.down : RECOVERING ? elapsed - 0.5 : world.time;
    result.progress = RECOVERING ? Math.max(0, Math.min(1, 1 - unit2.down / duration)) : -1;
    return result;
  }

  // src/tower-passive-presentations.js
  var FULL_TURN = Math.PI * 2;
  var EASE_OUT = (t) => 1 - (1 - t) ** 2;
  var PassiveMarksPresentation = class {
    drawUnit(renderer, u, time) {
      if (u.hp <= 0) {
        return;
      }
      if (u.lastStandOn) {
        this.drawEmbers(renderer, u, time);
      }
      if (u.resolveOn) {
        renderer.ring(
          u.x,
          u.y,
          u.radius * 1.25,
          `rgba(255,214,102,${0.55 + 0.3 * Math.sin(time * 5 + u.seed)})`,
          0.045,
          0,
          FULL_TURN,
          u.height * 0.45
        );
      }
      if (u.vengeanceStacks > 0) {
        renderer.ring(
          u.x,
          u.y,
          u.radius * 1.4,
          `rgba(226,70,70,${0.22 + 0.06 * u.vengeanceStacks})`,
          0.03 + 6e-3 * u.vengeanceStacks
        );
      }
      if (u.openingLeft > 0) {
        this.drawStreaks(renderer, u);
      }
    }
    drawEmbers(renderer, u, time) {
      for (let index = 0; index < 3; index++) {
        const PHASE = (time * 0.9 + u.seed * 0.37 + index / 3) % 1, SIDE = Math.sin(u.seed * 1.7 + index * 2.1) * u.radius * 0.7, POINT2 = renderer.project(u.x + SIDE, u.y, u.z + PHASE * u.height * 0.9);
        renderer.ellipse(
          POINT2.x,
          POINT2.y,
          renderer.scale * 0.05 * (1 - PHASE * 0.5),
          renderer.scale * 0.05 * (1 - PHASE * 0.5),
          `rgba(255,110,60,${(1 - PHASE) * 0.9})`
        );
      }
    }
    drawStreaks(renderer, u) {
      const SPEED = Math.hypot(u.vx || 0, u.vy || 0), DX = SPEED > 0.2 ? u.vx / SPEED : Math.cos(u.angle), DY = SPEED > 0.2 ? u.vy / SPEED : Math.sin(u.angle), ALPHA = Math.min(1, u.openingLeft) * 0.6;
      for (let index = 0; index < 3; index++) {
        const LIFT = u.height * (0.25 + index * 0.22), NEAR = u.radius * (0.9 + index * 0.1), FAR = NEAR + u.radius * (1.4 + index * 0.3);
        renderer.line(
          renderer.project(u.x - DX * NEAR, u.y - DY * NEAR, u.z + LIFT),
          renderer.project(u.x - DX * FAR, u.y - DY * FAR, u.z + LIFT),
          0.04,
          `rgba(255,240,170,${ALPHA})`
        );
      }
    }
  };
  var UndyingPresentation = class {
    lifeMs = 750;
    draw(renderer, event, progress) {
      const T = Math.min(1, progress), ALPHA = 1 - T, MID = (event.z || 0) + event.height * 0.5, CENTER = renderer.project(event.x, event.y, MID);
      renderer.ring(
        event.x,
        event.y,
        event.radius * (1 + 0.7 * EASE_OUT(T)),
        `rgba(255,214,102,${ALPHA})`,
        0.06,
        0,
        FULL_TURN,
        event.height * 0.5
      );
      for (let index = 0; index < 8; index++) {
        const ANGLE = index * FULL_TURN / 8 + 0.3, REACH = renderer.scale * (event.radius * (0.9 + 1.2 * EASE_OUT(T))), START = REACH * 0.7;
        renderer.line(
          { x: CENTER.x + Math.cos(ANGLE) * START, y: CENTER.y + Math.sin(ANGLE) * START * 0.7 },
          { x: CENTER.x + Math.cos(ANGLE) * REACH, y: CENTER.y + Math.sin(ANGLE) * REACH * 0.7 },
          0.05,
          `rgba(255,236,170,${ALPHA})`
        );
      }
      if (T < 0.25) {
        renderer.ellipse(
          CENTER.x,
          CENTER.y,
          renderer.scale * event.radius * 1.1 * (1 - T * 3),
          renderer.scale * event.radius * 0.8 * (1 - T * 3),
          `rgba(255,255,255,${0.7 * (1 - T * 4)})`
        );
      }
    }
  };
  var MotesPresentation = class {
    lifeMs = 850;
    draw(renderer, event, progress) {
      const T = Math.min(1, progress);
      for (const TARGET of event.targets) {
        const E = EASE_OUT(T), X = event.x + (TARGET.x - event.x) * E, Y = event.y + (TARGET.y - event.y) * E, START_Z = (event.z || 0) + event.height * 0.5, END_Z = (TARGET.z || 0) + TARGET.height * 0.5, Z = START_Z + (END_Z - START_Z) * E + Math.sin(T * Math.PI) * 0.8, POINT2 = renderer.project(X, Y, Z);
        renderer.ellipse(
          POINT2.x,
          POINT2.y,
          renderer.scale * 0.1 * (1 - T * 0.4),
          renderer.scale * 0.06 * (1 - T * 0.4),
          this.color(1 - T * 0.5),
          T * 9
        );
        if (T > 0.8) {
          renderer.ring(
            TARGET.x,
            TARGET.y,
            0.15 + (T - 0.8) * 2.5,
            this.color((1 - T) * 4),
            0.04,
            0,
            FULL_TURN,
            TARGET.height * 0.5
          );
        }
      }
    }
  };
  var HelperPresentation = class extends MotesPresentation {
    color(alpha) {
      return `rgba(120,220,140,${alpha})`;
    }
  };
  var VengeancePresentation = class extends MotesPresentation {
    color(alpha) {
      return `rgba(235,70,70,${alpha})`;
    }
  };
  var PASSIVE_PRESENTATION_EVENTS = Object.freeze([
    ["passive-undying", new UndyingPresentation()],
    ["passive-helper", new HelperPresentation()],
    ["passive-vengeance", new VengeancePresentation()]
  ]);

  // src/farm-render-units.js
  var DEFAULT_ATTACK = new UnitAttackPresentation();
  var BARLEY_SHRED_PRESENTATION = new BarleyArmorShredPresentation();
  var PASSIVE_MARKS = new PassiveMarksPresentation();
  var ATTACK_PRESENTATIONS = new Map(
    [new DualStrikePresentation(), new LobPresentation()].map((presentation) => [presentation.id, presentation])
  );
  function unitAttackPresentation(unit2) {
    return ATTACK_PRESENTATIONS.get(UNIT_ABILITY_PROFILES[unit2.species]?.kind) || DEFAULT_ATTACK;
  }
  function workSwing(u, sim) {
    const SWING = sim.workSwingOf?.(u.id);
    if (!SWING || SWING.phase === "idle" || u.hp <= 0) {
      return null;
    }
    const ELAPSED = SWING.elapsed * 1e3;
    if (SWING.phase === "windup") {
      return { name: "windup", elapsed: Math.min(279, ELAPSED) };
    }
    return SWING.phase === "fire" ? { name: unitAttackPresentation(u).activeMotion(u), elapsed: Math.min(ELAPSED, 399) } : { name: "recover", elapsed: ELAPSED };
  }
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
      this.unitRingPool = [{}, {}, {}, {}];
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
      if (world.isWorker?.(u)) {
        this.addUnitRing(u.radius + 0.08, "#c2913e", 0.04, 1);
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
        if (SWEEP >= Math.PI * 2) {
          if (side === "rear") {
            this.renderer.ring(u.x, u.y, EFFECT.radius, EFFECT.color, EFFECT.width);
          }
        } else if (side === "rear" && SWEEP > 0) {
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
      const METADATA = RECORD.compiled.metadata, SWING = rest ? null : workSwing(u, sim), MOTION_NAME = SWING?.name || unitMotion(u, sim, rest), CLIP = METADATA.clips[MOTION_NAME] || METADATA.clips.idle;
      const CLIP_START_AT_MS = rest ? 0 : this.renderer.displayTimeMs - (SWING ? SWING.elapsed : motionElapsedMs(u, MOTION_NAME, CLIP));
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
      const ORIGINAL = u.isFormationClone && sim.time - u.cloneBornAt < 0.5 ? sim.units.find((unit2) => unit2.id === u.cloneParentId) : null, EXPRESSION = unitExpression(ORIGINAL || u, sim, this.renderer.joyEffects, rest);
      if (EXPRESSION !== player.currentExpression) {
        player.setExpression(EXPRESSION);
      }
      player.seek(rest ? rest.elapsed * 1e3 : this.renderer.displayTimeMs);
      const [, , WIDTH, HEIGHT] = RECORD.compiled.viewBox, GROUND = (0, import_definition59.unitBodyDefinition)(u.species).ground, SCALE = 2 * r / Math.max(WIDTH, HEIGHT);
      const MATRIX = [SCALE, 0, 0, SCALE, p.x - GROUND.x * SCALE, p.y - GROUND.y * SCALE];
      this.renderer.ctx.vector.flush();
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
      const BODY2 = (0, import_definition59.unitBodyDefinition)(u.species), GIANT_SCALE = u.giantUntil > sim.time ? 3 : 1, SCALE = (0, import_definition59.unitDisplayScale)(
        BODY2,
        u.bodyScale,
        this.renderer.scale,
        this.renderer.minimumUnitPixels() * GIANT_SCALE
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
      PASSIVE_MARKS.drawUnit(this.renderer, u, sim.time);
      BARLEY_SHRED_PRESENTATION.drawStatus(this.renderer, u);
    }
  };

  // src/farm-renderer.js
  init_unit_grades();
  init_presentation6();
  var import_vector_sockets8 = __toESM(require_vector_sockets(), 1);
  init_boss_vector_sockets();

  // src/farm-render-boss.js
  var import_vector_sockets6 = __toESM(require_vector_sockets(), 1);
  init_species_catalog();
  init_farm_model();

  // src/features/boss-patterns/presentation-base.js
  init_farm_model();
  var EXTRA_PARTS = ["foot-left", "foot-right", "leaf", "kernel-mark", "hilum"];
  var POSE_PHASE_METHODS = { windup: "windup", active: "active", recover: "recover" };
  var BossAttackPose = class {
    reset(boss, parts, config, recoveryImpactSeconds, rig) {
      this.parts = parts;
      this.config = config;
      this.elapsed = Math.max(0, boss.patternPhaseElapsed || 0);
      this.aim = Math.atan2(-0.62 * Math.sin(boss.patternAim ?? boss.angle), Math.cos(boss.patternAim ?? boss.angle));
      this.body = { y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
      this.rig = rig;
      this.radius = boss.radius;
      this.hands = {
        "arm-left": { x: 0, y: 0 },
        "arm-right": { x: 0, y: 0 }
      };
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
    }
    side(key) {
      return key === "arm-left" ? -1 : 1;
    }
    hand(key, x, y) {
      Object.assign(this.hands[key], { x, y });
    }
    // The same, but placed from the middle of the body instead of from the resting spot.
    handAt(key, x, y) {
      const REST = this.rig.rest[key];
      this.hand(key, x - REST.x, y - REST.y);
    }
    // Where the lead hand goes in a strike: out toward the target. The other one hangs out to its own side.
    strikeHands(amount) {
      const R2 = this.radius;
      this.hand(this.lead, Math.cos(this.aim) * 1.1 * R2 * amount, Math.sin(this.aim) * 1.1 * R2 * amount);
      this.hand(this.trail, this.side(this.trail) * 0.4 * R2 * amount, -0.1 * R2 * amount);
    }
    windup() {
      this.body.y = 4 * this.windEase;
      this.body.scaleX = 1 - 0.035 * this.windEase;
      this.body.scaleY = 1 + 0.06 * this.windEase;
      this.body.rotation = this.aim * 0.045 * this.windEase;
      const R2 = this.radius;
      this.hand(this.lead, this.side(this.lead) * 0.3 * R2 * this.windEase, -0.95 * R2 * this.windEase);
      this.hand(this.trail, this.side(this.trail) * 0.5 * R2 * this.windEase, -0.35 * R2 * this.windEase);
    }
    settle() {
      this.body.y = 3 * (1 - this.recoverEase);
      this.body.scaleX = 1 + 0.045 * (1 - this.recoverEase);
      this.body.scaleY = 1 - 0.065 * (1 - this.recoverEase);
      this.body.rotation = this.aim * 0.025 * (1 - this.recoverEase);
      this.strikeHands(1 - this.recoverEase);
    }
    strike() {
      this.body.y = -3;
      this.body.scaleX = 1.075;
      this.body.scaleY = 0.91;
      this.body.rotation = this.aim * 0.09;
      this.strikeHands(1);
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
    pose(boss, parts, scratch, rig) {
      scratch.reset(boss, parts, this.config, this.recoveryImpactSeconds, rig);
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
    drawTelegraph(renderer, area) {
      renderer.drawBossDanger(area);
    }
  };

  // src/features/boss-patterns/front-slam/presentation.js
  init_definition22();
  var FrontSlamPresentation = class extends BossAttackPresentation {
    constructor() {
      super(FEATURE8, "strike", 0.18, 0.14);
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
  init_definition21();
  init_model23();
  init_farm_model();
  var import_vector_sockets5 = __toESM(require_vector_sockets(), 1);
  var HALF_TURN = Math.PI;
  var EASE = (t) => t * t * (3 - 2 * t);
  var HAND_FOLD_SECONDS = 0.4;
  var CircleSweepPresentation = class extends BossAttackPresentation {
    constructor() {
      super(FEATURE7, "sweep", 0.14, 0.14);
    }
    // Where a hand is after the given share of its half turn: on the ellipse the reach circle makes on screen.
    orbit(pose, key, turn) {
      const ANGLE = SWEEP_HAND_STARTS[key] + HALF_TURN * turn, R2 = this.config.reach - pose.rig.radius, DEPTH = import_vector_sockets5.WORLD_DEPTH_PROJECTION;
      return {
        x: R2 * Math.cos(ANGLE),
        y: -DEPTH * R2 * Math.sin(ANGLE)
      };
    }
    // The hands go from where they rest to (amount 1) the given point of their turn, and back.
    place(pose, turn, amount) {
      for (const KEY2 of Object.keys(SWEEP_HAND_STARTS)) {
        const AT = this.orbit(pose, KEY2, turn), REST = pose.rig.rest[KEY2];
        pose.handAt(KEY2, REST.x + (AT.x - REST.x) * amount, REST.y + (AT.y - REST.y) * amount);
      }
    }
    windup(boss, pose) {
      super.windup(boss, pose);
      this.place(pose, 0, pose.windEase);
    }
    // Both hands swing together, each across its own half of the circle.
    active(_boss, pose) {
      const Q = pose.recoverImpact ? 1 : CLAMP2(pose.elapsed / Math.max(this.config.active, 1e-3), 0, 1);
      pose.body.rotation = 0.06 * Math.sin(HALF_TURN * Q);
      this.place(pose, Q, 1);
    }
    recover(boss, pose) {
      if (pose.recoverImpact) {
        this.active(boss, pose);
        return;
      }
      super.recover(boss, pose);
      this.place(pose, 1, 1 - EASE(CLAMP2(pose.elapsed / HAND_FOLD_SECONDS, 0, 1)));
    }
    // The whole disc is the danger; the two bright arcs are the halves the hands have swept so far.
    drawTelegraph(renderer, area) {
      const FADE = area.phase === "recover" ? Math.max(0, 1 - area.elapsed / 0.14) : 1;
      if (!FADE) {
        return;
      }
      super.drawTelegraph(renderer, area);
      const CTX = renderer.ctx, ALPHA = CTX.globalAlpha, SWEPT = HALF_TURN * CLAMP2(area.progress, 0, 1);
      CTX.globalAlpha = ALPHA * FADE;
      for (const START of [area.angle, area.angle + HALF_TURN]) {
        renderer.ring(area.x, area.y, area.reach, "#dfad65", 0.14, START, START + SWEPT);
      }
      CTX.globalAlpha = ALPHA;
    }
  };

  // src/features/boss-patterns/charge/presentation.js
  init_definition23();
  var ChargePresentation = class extends BossAttackPresentation {
    constructor() {
      super(FEATURE9, "walk");
    }
    active(boss, pose) {
      const STRIDE = Math.sin((boss.patternTraveled || 0) * 3.1), LIFT = Math.max(0, STRIDE);
      pose.body.y = -1.5 - Math.abs(STRIDE) * 1.2;
      pose.body.scaleX = 1.055;
      pose.body.scaleY = 0.965;
      pose.body.rotation = pose.aim * 0.11;
      pose.hand(pose.lead, pose.side(pose.lead) * 0.35 * pose.radius, STRIDE * 0.3 * pose.radius);
      pose.hand(pose.trail, pose.side(pose.trail) * 0.35 * pose.radius, -STRIDE * 0.3 * pose.radius);
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
  init_definition24();
  init_farm_model();
  var LeapSlamPresentation = class extends BossAttackPresentation {
    constructor() {
      super(FEATURE10, "strike", 0.18, 0.18);
    }
    // Both hands go up and out to the sides, as high as the given share of the body radius.
    handsUp(pose, height) {
      for (const KEY2 of ["arm-left", "arm-right"]) {
        pose.hand(KEY2, pose.side(KEY2) * 0.55 * pose.radius, -height * pose.radius);
      }
    }
    activeMotion(boss) {
      return boss.z > 0.1 ? "airborne" : "strike";
    }
    windup(boss, pose) {
      super.windup(boss, pose);
      pose.body.y = 5 * pose.windEase;
      pose.body.scaleX = 1 - 0.05 * pose.windEase;
      pose.body.scaleY = 1 + 0.09 * pose.windEase;
      this.handsUp(pose, 0.9 * pose.windEase);
    }
    active(boss, pose) {
      const LIFT = CLAMP2((boss.z || 0) / Math.max(1, boss.height || 1), 0, 1);
      pose.body.rotation = pose.aim * 0.06;
      pose.body.scaleX = 1 + 0.045 * LIFT;
      pose.body.scaleY = 1 - 0.035 * LIFT;
      this.handsUp(pose, 0.7);
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
      for (const KEY2 of ["arm-left", "arm-right"]) {
        pose.hand(KEY2, pose.side(KEY2) * 0.7 * pose.radius, 0.25 * pose.radius);
      }
      pose.extras["foot-left"] = { x: -5, y: 2, rotation: -0.14 };
      pose.extras["foot-right"] = { x: 5, y: 2, rotation: 0.14 };
    }
  };

  // src/features/boss-patterns/fan-sweep/presentation.js
  init_definition25();
  init_farm_model();
  var FanSweepPresentation = class extends BossAttackPresentation {
    constructor() {
      super(FEATURE11, "sweep", 0.12);
    }
    active(_boss, pose) {
      const Q = CLAMP2(pose.elapsed / this.config.active, 0, 1), ARC = pose.aim - this.config.sector / 2 + this.config.sector * Q, PROJECTED = Math.atan2(-0.62 * Math.sin(ARC), Math.cos(ARC));
      pose.body.rotation = 0.1 * Math.sin(PROJECTED - pose.aim);
      pose.body.scaleX = 1.035;
      pose.body.scaleY = 0.97;
      this.hands(pose, PROJECTED);
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
      this.hands(pose, PROJECTED);
    }
    // The lead hand follows the sweep, out along the angle it has reached; the other hangs at its side.
    hands(pose, angle) {
      pose.hand(pose.lead, Math.cos(angle) * 1.15 * pose.radius, Math.sin(angle) * 1.15 * pose.radius);
      pose.hand(pose.trail, pose.side(pose.trail) * 0.45 * pose.radius, -0.15 * pose.radius);
    }
  };

  // src/features/boss-patterns/mouth-summon/presentation.js
  init_definition26();
  init_boss_vector_sockets();
  var MouthSummonPresentation = class extends BossAttackPresentation {
    constructor() {
      super(FEATURE12, "fire");
      this.summoning = true;
    }
    pose(boss, parts, scratch, rig) {
      if (!parts.has("body")) {
        return super.pose(boss, parts, scratch, rig);
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
    bossPose(world, boss = world.boss) {
      const B = boss, K = bossAttackPresentation(B).summoning ? {
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
      const EVENT = b === world.boss ? world.farmBossEvent : null;
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
    draw(source, world) {
      const BOSS2 = source && source.radius ? source : world.boss, { b: B, p: P, k: K } = this.bossPose(world, BOSS2), EVENT = BOSS2 === world.boss ? world.farmBossEvent : null, SPECIES = B.species, PRESENTATION = bossAttackPresentation(B);
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
      const S_LOCAL = this.renderer.scale * (0, import_vector_sockets6.bossVectorScale)(), GROUND = RECORD.anchors.ground, MATRIX = [S_LOCAL, 0, 0, S_LOCAL, P.x - GROUND.x * S_LOCAL, P.y - GROUND.y * S_LOCAL];
      const DEFEAT_BOUNCE = EVENT?.phase === "celebrating" && EVENT.outcome === "defeat" ? Math.max(0, Math.sin(EVENT.elapsed * Math.PI * 2 / CONFIG.farm.bossEvent.celebrationSeconds * 2)) : 0;
      const FADE = EVENT?.phase === "fading" ? CLAMP2(1 - EVENT.elapsed / CONFIG.farm.bossEvent.fadeSeconds, 0, 1) : 1;
      const PARTS = RECORD.parts, POSE = PRESENTATION.pose(B, PARTS, this.bossAttackPose, RECORD.hands);
      PLAYER.setBasePose("body", {
        x: 0,
        y: POSE.body.y - 18 * DEFEAT_BOUNCE,
        rotation: POSE.body.rotation,
        scaleX: POSE.body.scaleX * (1 + (K.squash || 0)) * (1 - 0.04 * DEFEAT_BOUNCE),
        scaleY: POSE.body.scaleY * (1 - (K.squash || 0)) * (1 + 0.06 * DEFEAT_BOUNCE),
        opacity: FADE
      });
      const TO_SVG = 1 / (0, import_vector_sockets6.bossVectorScale)(), HELD = speciesById(SPECIES).heldItem;
      for (const [PART, HAND] of Object.entries(POSE.hands)) {
        const AT = { x: HAND.x * TO_SVG, y: HAND.y * TO_SVG + POSE.body.y };
        PLAYER.setBasePose(PART, AT);
        if (HELD?.hand === PART && PARTS.has(HELD.part)) {
          PLAYER.setBasePose(HELD.part, AT);
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
      BARLEY_SHRED_PRESENTATION2.drawStatus(this.renderer, B);
    }
  };

  // src/farm-renderer.js
  init_farm_model();

  // src/attack-telegraph.js
  var TAU2 = Math.PI * 2;
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
      return arc(out, 0, endX, endY, R2, 0, TAU2);
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
      n = arc(out, n, x, y, r, ANGLE - SMALL, ANGLE + SMALL - TAU2);
      n = arc(out, n, endX, endY, R2, ANGLE + LARGE, ANGLE - LARGE);
    }
    return n;
  }
  function bossDangerContour(area, out) {
    let n = 0;
    if (area.kind === "sweep") {
      return arc(out, 0, area.x, area.y, area.reach, 0, TAU2);
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
    return 0;
  }

  // src/farm-scenery.js
  var import_vector_sockets7 = __toESM(require_vector_sockets(), 1);
  init_farm_model();
  var { radiusX: RX, radiusY: RY } = CONFIG.farm.arena;
  var TAU3 = Math.PI * 2;
  var TIERS = [
    { r: 6.6, h: 7.5 },
    { r: 5.5, h: 7 },
    { r: 4.5, h: 6.5 },
    { r: 3.6, h: 6 },
    { r: 2.7, h: 4.5 }
  ];
  var TOWER_Y = RY + TIERS[0].r - 0.4;
  var HALL_WALL_HEIGHT = 9;
  function seeded(seed) {
    let state = seed >>> 0;
    return () => {
      state = state + 1831565813 >>> 0;
      let t = state;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function mix(a, b, t) {
    return a.map((v, i) => Math.round(v + (b[i] - v) * t));
  }
  function rgb(c, alpha = 1) {
    return alpha === 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
  }
  var RANDOM = seeded(20241);
  var PATCHES = Array.from({ length: 34 }, (_, i) => ({
    x: (RANDOM() * 2 - 1) * RX,
    y: (RANDOM() * 2 - 1) * RY,
    rx: 2.5 + RANDOM() * 5,
    ry: 1.5 + RANDOM() * 3,
    color: i % 3 === 0 ? "rgba(160,184,112,0.35)" : i % 3 === 1 ? "rgba(226,235,172,0.38)" : "rgba(132,166,104,0.22)"
  }));
  var TUFTS = Array.from({ length: 190 }, () => ({
    x: (RANDOM() * 2 - 1) * (RX - 0.6),
    y: (RANDOM() * 2 - 1) * (RY - 0.6),
    s: 0.7 + RANDOM() * 0.6
  }));
  var FLOWER_COLORS = ["#f6f1ec", "#f4d35e", "#ee8fa6", "#b9a2e6"];
  var FLOWERS = Array.from({ length: 70 }, () => ({
    x: (RANDOM() * 2 - 1) * (RX - 1),
    y: (RANDOM() * 2 - 1) * (RY - 1),
    color: FLOWER_COLORS[Math.floor(RANDOM() * FLOWER_COLORS.length)]
  }));
  var STONES = Array.from({ length: 16 }, () => ({
    x: (RANDOM() * 2 - 1) * (RX - 1),
    y: (RANDOM() * 2 - 1) * (RY - 1),
    s: 0.25 + RANDOM() * 0.3
  }));
  var TREES = [];
  for (let tries = 0; tries < 900 && TREES.length < 64; tries++) {
    const X = (RANDOM() * 2 - 1) * (RX + 11), Y = (RANDOM() * 2 - 1) * (RY + 10) + 2;
    const INSIDE = Math.abs(X) < RX + 2 && Math.abs(Y) < RY + 2, DOOR = Math.abs(X) < 11 && Y > RY - 2, CROWDED = TREES.some((t) => Math.hypot(t.x - X, t.y - Y) < 3.2);
    if (!INSIDE && !DOOR && !CROWDED) {
      TREES.push({ x: X, y: Y, s: 0.85 + RANDOM() * 0.55, shade: RANDOM() });
    }
  }
  TREES.sort((a, b) => b.y - a.y);
  var BUSHES = Array.from({ length: 26 }, () => ({
    x: (RANDOM() * 2 - 1) * (RX + 3),
    y: (RANDOM() * 2 - 1) * (RY + 3),
    s: 0.6 + RANDOM() * 0.5
  }));
  var SKY_STOPS = [
    { at: 0, top: [118, 190, 232], bottom: [190, 226, 242] },
    { at: 0.45, top: [226, 134, 110], bottom: [250, 200, 138] },
    { at: 1, top: [16, 22, 58], bottom: [52, 52, 108] }
  ];
  function skyAt(floor) {
    const T = Math.min(1, Math.max(0, (floor - 1) / 50));
    const B = T <= SKY_STOPS[1].at ? 1 : 2, A = B - 1, K = (T - SKY_STOPS[A].at) / (SKY_STOPS[B].at - SKY_STOPS[A].at);
    return {
      top: mix(SKY_STOPS[A].top, SKY_STOPS[B].top, K),
      bottom: mix(SKY_STOPS[A].bottom, SKY_STOPS[B].bottom, K),
      night: T
    };
  }
  var HALL_TINTS = {
    battle: { floor: [96, 92, 112], wall: [52, 48, 70], accent: [255, 176, 96] },
    elite: { floor: [116, 82, 92], wall: [70, 46, 56], accent: [255, 122, 96] },
    mid: { floor: [90, 76, 124], wall: [54, 44, 84], accent: [190, 150, 255] },
    rest: { floor: [112, 104, 88], wall: [66, 58, 46], accent: [255, 214, 130] },
    relic: { floor: [112, 104, 88], wall: [66, 58, 46], accent: [150, 230, 200] }
  };
  var Painter = class {
    constructor(renderer) {
      this.r = renderer;
      this.c = renderer.ctx;
      this.s = renderer.scale;
    }
    p(x, y, z = 0) {
      return this.r.project(x, y, z);
    }
    poly(points, fill, stroke2 = null, width = 1) {
      const C = this.c;
      C.beginPath();
      points.forEach((q, i) => i ? C.lineTo(q.x, q.y) : C.moveTo(q.x, q.y));
      C.closePath();
      if (fill) {
        C.fillStyle = fill;
        C.fill();
      }
      if (stroke2) {
        C.strokeStyle = stroke2;
        C.lineWidth = width;
        C.stroke();
      }
    }
    // A band around a standing cylinder: from the bottom ring up to the top ring, between two positions on its front.
    band(cx, cy, r, z0, z1, t0, t1, fill, taper = 0.96) {
      const N = 14, PTS = [];
      for (let i = 0; i <= N; i++) {
        const T = t0 + (t1 - t0) * i / N;
        PTS.push(this.p(cx + T * r, cy - r * Math.sqrt(Math.max(0, 1 - T * T)), z0));
      }
      for (let i = N; i >= 0; i--) {
        const T = t0 + (t1 - t0) * i / N, R2 = r * taper;
        PTS.push(this.p(cx + T * R2, cy - R2 * Math.sqrt(Math.max(0, 1 - T * T)), z1));
      }
      this.poly(PTS, fill);
    }
    groundRect(x0, y0, x1, y1, fill) {
      const A = this.p(x0, y1), B = this.p(x1, y0), C = this.c;
      C.fillStyle = fill;
      C.fillRect(Math.floor(A.x), Math.floor(A.y), Math.ceil(B.x - A.x) + 1, Math.ceil(B.y - A.y) + 1);
    }
    visible(point2, margin = 80) {
      const R2 = this.r.canvas;
      return point2.x > -margin && point2.x < R2.width + margin && point2.y > -margin * 6 && point2.y < R2.height + margin;
    }
  };
  function drawTree(paint, tree) {
    const B = paint.p(tree.x, tree.y);
    if (!paint.visible(B, 140)) {
      return;
    }
    const S = paint.s * tree.s, C = paint.c;
    paint.r.ellipse(B.x + 0.2 * S, B.y + 0.05 * S, 1.5 * S, 0.5 * S, "rgba(48,66,40,0.28)");
    C.strokeStyle = "#7d5c3d";
    C.lineWidth = 0.42 * S;
    C.lineCap = "round";
    C.beginPath();
    C.moveTo(B.x, B.y);
    C.lineTo(B.x, B.y - 1.9 * S * import_vector_sockets7.WORLD_HEIGHT_PROJECTION * 1.3);
    C.stroke();
    const TOP = B.y - 2.9 * S * import_vector_sockets7.WORLD_HEIGHT_PROJECTION * 1.3, DARK = tree.shade > 0.5 ? "#5f8c58" : "#67955c", LIGHT = tree.shade > 0.5 ? "#86b36d" : "#8dbb72";
    paint.r.ellipse(B.x, TOP + 0.35 * S, 1.65 * S, 1.25 * S, DARK);
    paint.r.ellipse(B.x - 0.55 * S, TOP + 0.05 * S, 1.15 * S, 0.95 * S, DARK);
    paint.r.ellipse(B.x + 0.6 * S, TOP + 0.1 * S, 1.1 * S, 0.9 * S, DARK);
    paint.r.ellipse(B.x - 0.25 * S, TOP - 0.25 * S, 1.05 * S, 0.8 * S, LIGHT);
  }
  function drawBush(paint, bush) {
    const B = paint.p(bush.x, bush.y);
    if (!paint.visible(B, 60)) {
      return;
    }
    const S = paint.s * bush.s;
    paint.r.ellipse(B.x, B.y - 0.15 * S, 1.1 * S, 0.7 * S, "#6c9a5a");
    paint.r.ellipse(B.x - 0.4 * S, B.y - 0.3 * S, 0.7 * S, 0.5 * S, "#86b06a");
  }
  function drawTower(paint, glow) {
    const C = paint.c, S = paint.s;
    let z = 0;
    for (let i = 0; i < TIERS.length; i++) {
      const TIER_R = TIERS[i].r, TIER_H = TIERS[i].h, TOP_Z = z + TIER_H;
      paint.band(0, TOWER_Y, TIER_R, z, TOP_Z, -1, 1, "#c9c2b0");
      paint.band(0, TOWER_Y, TIER_R, z, TOP_Z, 0.25, 1, "#a49d8d");
      paint.band(0, TOWER_Y, TIER_R, z, TOP_Z, 0.72, 1, "#8c8575");
      C.strokeStyle = "rgba(88,80,70,0.22)";
      C.lineWidth = Math.max(1, 0.05 * S);
      C.beginPath();
      for (let zz = z + 1.1; zz < TOP_Z - 0.3; zz += 1.1) {
        for (let k = 0; k <= 12; k++) {
          const T = -1 + 2 * k / 12, Q = paint.p(T * TIER_R, TOWER_Y - TIER_R * Math.sqrt(Math.max(0, 1 - T * T)), zz);
          if (k) {
            C.lineTo(Q.x, Q.y);
          } else {
            C.moveTo(Q.x, Q.y);
          }
        }
      }
      C.stroke();
      const TC = paint.p(0, TOWER_Y, TOP_Z), LEDGE = TIER_R + 0.45;
      paint.r.ellipse(TC.x, TC.y, LEDGE * S, LEDGE * S * 0.62, "#b8b19f");
      paint.r.ellipse(TC.x, TC.y - 0.05 * S, (TIER_R - 0.1) * S, (TIER_R - 0.1) * S * 0.62, "#d8d2bf");
      for (let k = 0; k < 15; k++) {
        const A = Math.PI + Math.PI * (k + 0.5) / 15;
        const M = paint.p(Math.cos(A) * LEDGE * 0.97, TOWER_Y + Math.sin(A) * LEDGE * 0.97 * -1, TOP_Z);
        paint.r.ellipse(M.x, M.y - 0.15 * S, 0.2 * S, 0.17 * S, "#9d9684");
      }
      if (i > 0) {
        for (const T of [-0.55, 0, 0.55]) {
          const WX = T * TIER_R * 0.98, WY = TOWER_Y - TIER_R * Math.sqrt(1 - T * T) * 0.98, BASE = paint.p(WX, WY, z + TIER_H * 0.32), WW = 0.42 * S * Math.sqrt(1 - T * T) + 1, WH = TIER_H * 0.4 * import_vector_sockets7.WORLD_HEIGHT_PROJECTION * S;
          C.fillStyle = "#4b4358";
          C.fillRect(BASE.x - WW - 1, BASE.y - WH - WW, WW * 2 + 2, WH + WW);
          C.fillStyle = glow > 0 ? "#ffe3a1" : "#f3cf86";
          C.fillRect(BASE.x - WW, BASE.y - WH - WW + 1, WW * 2, WH + WW - 1);
          paint.r.ellipse(BASE.x, BASE.y - WH - WW + 1, WW, WW * 0.8, glow > 0 ? "#ffe3a1" : "#f3cf86");
        }
      }
      z = TOP_Z;
    }
    const SPIRE_BASE = paint.p(0, TOWER_Y, z), SPIRE_TOP = paint.p(0, TOWER_Y, z + 6), R2 = TIERS[TIERS.length - 1].r;
    paint.poly(
      [
        { x: SPIRE_BASE.x - R2 * S * 0.95, y: SPIRE_BASE.y },
        { x: SPIRE_TOP.x, y: SPIRE_TOP.y },
        { x: SPIRE_BASE.x + R2 * S * 0.95, y: SPIRE_BASE.y }
      ],
      "#6f7f9d"
    );
    paint.poly(
      [
        { x: SPIRE_BASE.x + R2 * S * 0.2, y: SPIRE_BASE.y },
        { x: SPIRE_TOP.x, y: SPIRE_TOP.y },
        { x: SPIRE_BASE.x + R2 * S * 0.95, y: SPIRE_BASE.y }
      ],
      "#5b6a88"
    );
    C.strokeStyle = "#5a4a3a";
    C.lineWidth = 0.1 * S;
    C.beginPath();
    C.moveTo(SPIRE_TOP.x, SPIRE_TOP.y);
    C.lineTo(SPIRE_TOP.x, SPIRE_TOP.y - 2 * S);
    C.stroke();
    paint.poly(
      [
        { x: SPIRE_TOP.x, y: SPIRE_TOP.y - 2 * S },
        { x: SPIRE_TOP.x + 1.5 * S, y: SPIRE_TOP.y - 1.6 * S },
        { x: SPIRE_TOP.x, y: SPIRE_TOP.y - 1.2 * S }
      ],
      "#d5584b"
    );
    drawDoor(paint, glow);
  }
  function drawDoor(paint, glow) {
    const S = paint.s, C = paint.c, BASE = paint.p(0, RY + 0.05, 0), W = 1.7 * S, H = 3.6 * import_vector_sockets7.WORLD_HEIGHT_PROJECTION * S;
    paint.r.ellipse(BASE.x, BASE.y + 0.1 * S, 2.6 * S, 0.9 * S, "#b3ab97");
    paint.r.ellipse(BASE.x, BASE.y, 2.1 * S, 0.7 * S, "#c4bda9");
    C.fillStyle = "#5a4f6c";
    C.fillRect(BASE.x - W - 0.25 * S, BASE.y - H - W - 0.25 * S, (W + 0.25 * S) * 2, H + W + 0.25 * S);
    paint.r.ellipse(BASE.x, BASE.y - H - W + 0.1 * S, W + 0.25 * S, W * 0.95, "#5a4f6c");
    C.fillStyle = "#2b2236";
    C.fillRect(BASE.x - W, BASE.y - H - W, W * 2, H + W);
    paint.r.ellipse(BASE.x, BASE.y - H - W + 0.1 * S, W, W * 0.9, "#2b2236");
    const LIGHT = 0.35 + glow * 0.45;
    C.fillStyle = `rgba(255,186,98,${LIGHT})`;
    C.fillRect(BASE.x - W * 0.7, BASE.y - H * 0.8, W * 1.4, H * 0.8);
    paint.r.ellipse(BASE.x, BASE.y - H * 0.8, W * 0.7, W * 0.6, `rgba(255,186,98,${LIGHT})`);
    if (glow > 0) {
      paint.r.ellipse(BASE.x, BASE.y - H * 0.4, 5 * S, 2.2 * S, `rgba(255,200,120,${0.12 * glow})`);
    }
    for (const SIDE of [-1, 1]) {
      const X = BASE.x + SIDE * (W + 0.9 * S);
      C.strokeStyle = "#4a3b30";
      C.lineWidth = 0.14 * S;
      C.beginPath();
      C.moveTo(X, BASE.y);
      C.lineTo(X, BASE.y - H * 0.7);
      C.stroke();
      paint.r.ellipse(X, BASE.y - H * 0.75, 0.32 * S, 0.4 * S, "#ffd88a");
      paint.r.ellipse(X, BASE.y - H * 0.75, 0.9 * S, 1 * S, "rgba(255,214,130,0.18)");
    }
  }
  function drawFence(paint) {
    const S = paint.s, C = paint.c;
    const POST_Z = 1.15, GAP = CONFIG.farm.tower.gateRadius + 0.6;
    const SIDES = [
      // [x0, y0, x1, y1] walking the border, the back edge broken at the door
      [-RX, RY, -GAP, RY],
      [GAP, RY, RX, RY],
      [RX, RY, RX, -RY],
      [RX, -RY, -RX, -RY],
      [-RX, -RY, -RX, RY]
    ];
    const POSTS = [];
    for (const [X0, Y0, X1, Y1] of SIDES) {
      const LEN = Math.hypot(X1 - X0, Y1 - Y0), COUNT = Math.max(1, Math.round(LEN / 2.4));
      const RUN = [];
      for (let k = 0; k <= COUNT; k++) {
        RUN.push(paint.p(X0 + (X1 - X0) * k / COUNT, Y0 + (Y1 - Y0) * k / COUNT));
      }
      POSTS.push(RUN);
    }
    C.lineCap = "round";
    for (const [PASS, COLOR, WIDTH] of [
      [0, "#8a6a46", 0.1],
      [1, "#b08a5c", 0.1]
    ]) {
      C.strokeStyle = COLOR;
      C.lineWidth = Math.max(1.2, WIDTH * S);
      C.beginPath();
      for (const RUN of POSTS) {
        for (let k = 0; k < RUN.length - 1; k++) {
          const A = RUN[k], B = RUN[k + 1];
          if (!paint.visible(A, 200) && !paint.visible(B, 200)) {
            continue;
          }
          for (const RZ of [0.45, 0.9]) {
            const DZ = RZ * import_vector_sockets7.WORLD_HEIGHT_PROJECTION * S - PASS * 0.05 * S;
            C.moveTo(A.x, A.y - DZ);
            C.lineTo(B.x, B.y - DZ);
          }
        }
      }
      C.stroke();
    }
    for (const [PASS, COLOR] of [
      [0, "#7a5a38"],
      [1, "#a67f52"]
    ]) {
      C.strokeStyle = COLOR;
      C.lineWidth = Math.max(2, 0.22 * S - PASS * 0.08 * S);
      C.beginPath();
      for (const RUN of POSTS) {
        for (const A of RUN) {
          if (!paint.visible(A, 100)) {
            continue;
          }
          C.moveTo(A.x + PASS * -0.03 * S, A.y);
          C.lineTo(A.x + PASS * -0.03 * S, A.y - POST_Z * import_vector_sockets7.WORLD_HEIGHT_PROJECTION * S);
        }
      }
      C.stroke();
    }
    for (const SIDE of [-1, 1]) {
      const A = paint.p(SIDE * GAP, RY);
      C.strokeStyle = "#6e4f31";
      C.lineWidth = 0.38 * S;
      C.beginPath();
      C.moveTo(A.x, A.y);
      C.lineTo(A.x, A.y - 1.8 * import_vector_sockets7.WORLD_HEIGHT_PROJECTION * S);
      C.stroke();
      paint.r.ellipse(A.x, A.y - 1.8 * import_vector_sockets7.WORLD_HEIGHT_PROJECTION * S, 0.3 * S, 0.22 * S, "#8f6c45");
    }
  }
  function drawFarmGrounds(renderer, world) {
    const P = new Painter(renderer), S = P.s, C = P.c, W = renderer.canvas.width, H = renderer.canvas.height, GLOW = world.farmBossEvent?.phase === "marching" ? 1 : 0;
    const HORIZON = P.p(0, RY + 11).y;
    C.fillStyle = "#a8bd84";
    C.fillRect(0, 0, W, H);
    if (HORIZON > 0) {
      const BANDS = ["#cfe4ea", "#dbeaea", "#e6f0e4"];
      BANDS.forEach((color, i) => {
        C.fillStyle = color;
        C.fillRect(0, HORIZON * i / BANDS.length, W, HORIZON / BANDS.length + 1);
      });
      for (const [X, RXH, RYH, COLOR] of [
        [-14, 15, 4.2, "#b5cba4"],
        [11, 17, 3.4, "#a6bf93"],
        [-2, 22, 2.4, "#9fb88d"]
      ]) {
        renderer.ellipse(P.p(X, RY + 11).x, HORIZON, RXH * S, RYH * S, COLOR);
      }
      C.fillStyle = "#a8bd84";
      C.fillRect(0, HORIZON, W, H - HORIZON + 1);
    }
    for (const TREE of TREES) {
      if (TREE.y > RY + 3) {
        drawTree(P, TREE);
      }
    }
    drawTower(P, GLOW);
    P.groundRect(-RX - 0.6, -RY - 0.6, RX + 0.6, RY + 0.4, "#b8c88c");
    P.groundRect(-RX, -RY, RX, RY, "#c9d79f");
    for (const PATCH of PATCHES) {
      renderer.groundEllipse(PATCH.x, PATCH.y, PATCH.rx, PATCH.ry, PATCH.color);
    }
    for (let y = RY - 0.5, i = 0; y > 3; y -= 1.3, i++) {
      const X = Math.sin(i * 1.7) * 0.7;
      renderer.groundEllipse(X, y, 2 + 0.1 * (i % 3), 1.1, "#d9c796");
      renderer.groundEllipse(X, y, 1.4, 0.8, "#e3d3a6");
    }
    C.strokeStyle = "#8fa96a";
    C.lineWidth = Math.max(1, 0.06 * S);
    C.lineCap = "round";
    C.beginPath();
    for (const T of TUFTS) {
      const B = P.p(T.x, T.y);
      if (!P.visible(B, 20)) {
        continue;
      }
      const U = 0.34 * S * T.s;
      C.moveTo(B.x, B.y);
      C.lineTo(B.x - U * 0.5, B.y - U);
      C.moveTo(B.x, B.y);
      C.lineTo(B.x + U * 0.1, B.y - U * 1.25);
      C.moveTo(B.x, B.y);
      C.lineTo(B.x + U * 0.55, B.y - U * 0.9);
    }
    C.stroke();
    for (const F of FLOWERS) {
      const B = P.p(F.x, F.y);
      if (P.visible(B, 20)) {
        const D = Math.max(2, 0.13 * S);
        C.fillStyle = F.color;
        C.fillRect(B.x - D / 2, B.y - D, D, D);
      }
    }
    for (const STONE of STONES) {
      renderer.groundEllipse(STONE.x, STONE.y, STONE.s * 1.2, STONE.s * 0.9, "#aeb2a0");
      renderer.groundEllipse(STONE.x - 0.05, STONE.y + 0.05, STONE.s * 0.8, STONE.s * 0.55, "#c6c9b8");
    }
    drawFence(P);
    for (const BUSH of BUSHES) {
      if (Math.abs(BUSH.x) > RX + 0.8 || Math.abs(BUSH.y) > RY + 0.8) {
        drawBush(P, BUSH);
      }
    }
    for (const TREE of TREES) {
      if (TREE.y <= RY + 3) {
        drawTree(P, TREE);
      }
    }
  }
  function drawHallWall(paint, tint, sky, now) {
    const S = paint.s, C = paint.c, Z = HALL_WALL_HEIGHT, X0 = -RX - 2, X1 = RX + 2;
    const A = paint.p(X0, RY, 0), B = paint.p(X1, RY, 0), TOP = Z * import_vector_sockets7.WORLD_HEIGHT_PROJECTION * S;
    C.fillStyle = rgb(tint.wall);
    C.fillRect(A.x, A.y - TOP, B.x - A.x, TOP);
    C.strokeStyle = "rgba(0,0,0,0.16)";
    C.lineWidth = Math.max(1, 0.04 * S);
    C.beginPath();
    for (let z = 1; z < Z; z++) {
      const Y = A.y - z * import_vector_sockets7.WORLD_HEIGHT_PROJECTION * S;
      C.moveTo(A.x, Y);
      C.lineTo(B.x, Y);
    }
    C.stroke();
    const ACCENT = rgb(tint.accent);
    for (let x = -RX; x <= RX; x += 8) {
      const BASE = paint.p(x, RY, 0), FLICKER = 0.85 + 0.15 * Math.sin(now * 0.011 + x * 1.3);
      if (!paint.visible(BASE, 160)) {
        continue;
      }
      const WW = 1.5 * S, WB = BASE.y - 2.6 * import_vector_sockets7.WORLD_HEIGHT_PROJECTION * S, WT = BASE.y - 7 * import_vector_sockets7.WORLD_HEIGHT_PROJECTION * S;
      C.fillStyle = rgb(tint.floor, 0.9);
      C.fillRect(BASE.x - WW - 0.25 * S, WT - WW, WW * 2 + 0.5 * S, WB - WT + WW);
      paint.r.ellipse(BASE.x, WT, WW + 0.25 * S, WW + 0.2 * S, rgb(tint.floor, 0.9));
      C.fillStyle = rgb(sky.top);
      C.fillRect(BASE.x - WW, WT - WW, WW * 2, (WB - WT + WW) * 0.55);
      C.fillStyle = rgb(sky.bottom);
      C.fillRect(BASE.x - WW, WT - WW + (WB - WT + WW) * 0.55, WW * 2, (WB - WT + WW) * 0.45);
      paint.r.ellipse(BASE.x, WT, WW, WW, rgb(sky.top));
      if (sky.night > 0.7) {
        for (let k = 0; k < 6; k++) {
          C.fillStyle = "rgba(255,255,240,0.85)";
          C.fillRect(
            BASE.x - WW + k * 37 % 100 * 0.0285 * WW * 0.97,
            WT - WW * 0.8 + k * 53 % 100 * 0.01 * (WB - WT + WW) * 0.9,
            2,
            2
          );
        }
      } else {
        paint.r.ellipse(
          BASE.x - WW * 0.3 + (now * 2e-5 * S + x) % 1 * 0,
          WT + WW * 0.9,
          WW * 0.55,
          WW * 0.22,
          "rgba(255,255,255,0.55)"
        );
      }
      for (const SIDE of [-1, 1]) {
        const TX = BASE.x + SIDE * 4 * S;
        C.fillStyle = rgb(mix(tint.wall, [0, 0, 0], 0.25));
        C.fillRect(
          TX - 0.35 * S,
          BASE.y - 6 * import_vector_sockets7.WORLD_HEIGHT_PROJECTION * S,
          0.7 * S,
          6 * import_vector_sockets7.WORLD_HEIGHT_PROJECTION * S
        );
        const TY = BASE.y - 3.6 * import_vector_sockets7.WORLD_HEIGHT_PROJECTION * S;
        paint.r.ellipse(
          TX,
          TY,
          1.7 * S * FLICKER,
          1.9 * S * FLICKER,
          `rgba(${tint.accent[0]},${tint.accent[1]},${tint.accent[2]},0.09)`
        );
        paint.r.ellipse(TX, TY, 0.28 * S, 0.5 * S * FLICKER, ACCENT);
        paint.r.ellipse(TX, TY + 0.1 * S, 0.14 * S, 0.28 * S, "#fff1c4");
      }
    }
    C.fillStyle = rgb(mix(tint.wall, [255, 255, 255], 0.14));
    C.fillRect(A.x, A.y - TOP - 0.35 * S, B.x - A.x, 0.35 * S);
    C.fillStyle = "rgba(0,0,0,0.3)";
    C.fillRect(A.x, A.y - 0.2 * S, B.x - A.x, 0.2 * S);
  }
  function drawTowerHall(renderer, world, now) {
    const P = new Painter(renderer), S = P.s, C = P.c, W = renderer.canvas.width, H = renderer.canvas.height, KIND = world.tower?.kind || "battle", TINT = HALL_TINTS[KIND] || HALL_TINTS.battle, SKY = skyAt(world.tower?.floor || 1);
    C.fillStyle = "#15111d";
    C.fillRect(0, 0, W, H);
    drawHallWall(P, TINT, SKY, now);
    P.groundRect(-RX, -RY, RX, RY, rgb(TINT.floor));
    const ROW = 3, SLAB = 5;
    const RAND = seeded(7 + (world.tower?.floor || 1));
    for (let y = -RY, row = 0; y < RY; y += ROW, row++) {
      for (let x = -RX - (row % 2 ? SLAB / 2 : 0); x < RX; x += SLAB) {
        const X0 = Math.max(-RX, x), X1 = Math.min(RX, x + SLAB), Y1 = Math.min(RY, y + ROW), T = RAND();
        if (X1 > X0) {
          P.groundRect(
            X0,
            y,
            X1,
            Y1,
            T < 0.33 ? "rgba(255,255,255,0.05)" : T < 0.66 ? "rgba(0,0,0,0.07)" : "rgba(0,0,0,0)"
          );
        }
      }
    }
    C.strokeStyle = "rgba(0,0,0,0.3)";
    C.lineWidth = Math.max(1, 0.05 * S);
    C.beginPath();
    for (let y = -RY, row = 0; y <= RY; y += ROW, row++) {
      const A = P.p(-RX, y), B = P.p(RX, y);
      C.moveTo(A.x, A.y);
      C.lineTo(B.x, B.y);
      if (y < RY) {
        for (let x = -RX - (row % 2 ? SLAB / 2 : 0); x < RX; x += SLAB) {
          if (x > -RX) {
            const V0 = P.p(x, y), V1 = P.p(x, Math.min(RY, y + ROW));
            C.moveTo(V0.x, V0.y);
            C.lineTo(V1.x, V1.y);
          }
        }
      }
    }
    C.stroke();
    for (const [R3, ALPHA, WIDTH] of [
      [8, 0.3, 0.14],
      [7.2, 0.18, 0.06],
      [3.2, 0.22, 0.08]
    ]) {
      renderer.strokeGroundEllipse(
        0,
        0,
        R3,
        R3,
        `rgba(${TINT.accent[0]},${TINT.accent[1]},${TINT.accent[2]},${ALPHA})`,
        WIDTH
      );
    }
    for (let k = 0; k < 8; k++) {
      const A = k * TAU3 / 8, P0 = P.p(Math.cos(A) * 3.6, Math.sin(A) * 3.6), P1 = P.p(Math.cos(A) * 7, Math.sin(A) * 7);
      C.strokeStyle = `rgba(${TINT.accent[0]},${TINT.accent[1]},${TINT.accent[2]},0.15)`;
      C.lineWidth = Math.max(1, 0.06 * S);
      C.beginPath();
      C.moveTo(P0.x, P0.y);
      C.lineTo(P1.x, P1.y);
      C.stroke();
    }
    const EDGE = rgb(mix(TINT.wall, [255, 255, 255], 0.1));
    const L = P.p(-RX, -RY), R2 = P.p(RX, -RY);
    C.fillStyle = EDGE;
    C.fillRect(L.x, L.y, R2.x - L.x, 0.5 * S);
    for (const SIDE of [-1, 1]) {
      const T = P.p(SIDE * RX, RY), B = P.p(SIDE * RX, -RY);
      C.fillRect(Math.min(T.x, T.x + SIDE * 0.9 * S), T.y, 0.9 * S, B.y - T.y);
    }
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
  var GRADE_RING_COLORS = UNIT_GRADES.map(({ outlineColor }) => outlineColor);
  var GRADE_RING_WIDTHS = UNIT_GRADES.map(({ tier }) => 0.05 + 0.012 * (tier - 2));
  var CORN_ATTACHMENT_PRESENTATION = new CornAttachmentPresentation();
  var ZOOM_MIN = 0.06;
  var ZOOM_MAX = 1.8;
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
        this.vectorAssets.set(Number(SPECIES), {
          compiled: COMPILED,
          asset: CREATE_VECTOR_ASSET(this.meshes, COMPILED),
          anchors: (0, import_vector_sockets8.readVectorSockets)(COMPILED, `species ${SPECIES}, ${COMPILED.sourcePath}`),
          parts: new Set(COMPILED.metadata.parts.map((part) => part.id))
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
        const RECORD = this.bossAssets.get(`species-${SPECIES}`);
        if (!RECORD) {
          throw new Error("Missing required boss vector asset for species " + SPECIES);
        }
        RECORD.anchors = bindBossSocketAsset(SPECIES, RECORD);
        RECORD.hands = bossHandRig(RECORD.compiled);
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
      const BOSS2 = this.bossAssets.get("species-3");
      if (!BOSS2) {
        throw new Error("Pinned species-3 boss vector asset is required");
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
        x: (x + this.offset[0] + this.view[0] + (this.shakeX || 0)) * this.scale,
        y: (this.view[1] - (import_vector_sockets8.WORLD_DEPTH_PROJECTION * y + import_vector_sockets8.WORLD_HEIGHT_PROJECTION * z + this.offset[1])) * this.scale
      };
    }
    screenToWorld(clientX, clientY) {
      const R2 = this.canvas.getBoundingClientRect(), PX = (clientX - R2.left) * this.pixelRatio, PY = (clientY - R2.top) * this.pixelRatio;
      return {
        x: PX / this.scale - this.offset[0] - this.view[0],
        y: (this.view[1] - PY / this.scale - this.offset[1]) / import_vector_sockets8.WORLD_DEPTH_PROJECTION
      };
    }
    // The smallest a unit is drawn, in pixels. Zoomed out it shrinks with the view instead of staying full size.
    minimumUnitPixels() {
      const BASE = this.scenePresentation.minimumUnitPixels * this.pixelRatio;
      return this.scene === "farm" && this.zoom < 1 ? Math.max(3 * this.pixelRatio, BASE * this.zoom) : BASE;
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
        this.zoom = this.homeZoom();
      }
      this.scene = scene;
      this.scenePresentation = scenePresentation(scene);
      const A = this.aspect;
      this.zoom ??= this.homeZoom();
      this.baseView = this.scenePresentation.cameraView(A);
      const ZOOM = scene === "farm" ? this.zoom : 1;
      this.view = [this.baseView[0] / ZOOM, this.baseView[1] / ZOOM];
      this.scale = this.canvas.width / (2 * this.view[0]);
      const { radiusX: RX2, radiusY: RY2 } = CONFIG[scene].arena;
      const BOUNDS = {
        left: -RX2 - 1.3,
        right: RX2 + 1.3,
        bottom: -(RY2 + 1.3) * import_vector_sockets8.WORLD_DEPTH_PROJECTION,
        top: (RY2 + 1.3) * import_vector_sockets8.WORLD_DEPTH_PROJECTION
      };
      const BOSS_SCALE = (0, import_vector_sockets8.bossVectorScale)(), BOSS_X = RX2 - import_vector_sockets8.BOSS_ART_RADIUS, BOSS_Y = (RY2 - import_vector_sockets8.BOSS_ART_RADIUS) * import_vector_sockets8.WORLD_DEPTH_PROJECTION;
      const INCLUDE_BOSS = (record) => {
        const [X, Y, W, H] = record.compiled.viewBox, G = record.anchors.ground;
        BOUNDS.left = Math.min(BOUNDS.left, -BOSS_X - (G.x - X) * BOSS_SCALE);
        BOUNDS.right = Math.max(BOUNDS.right, BOSS_X + (X + W - G.x) * BOSS_SCALE);
        BOUNDS.bottom = Math.min(BOUNDS.bottom, -BOSS_Y - (Y + H - G.y) * BOSS_SCALE);
        BOUNDS.top = Math.max(
          BOUNDS.top,
          BOSS_Y + (G.y - Y) * BOSS_SCALE + CONFIG.battle.dropHeight * import_vector_sockets8.WORLD_HEIGHT_PROJECTION
        );
      };
      for (const RECORD of this.bossAssets.values()) {
        INCLUDE_BOSS(RECORD);
      }
      const BASE_Y = this.baseY(), TOP = this.view[1] - BASE_Y, BOTTOM = TOP - this.canvas.height / this.scale;
      this.panLimits = {
        minX: Math.min(0, this.view[0] - BOUNDS.right),
        maxX: Math.max(0, -this.view[0] - BOUNDS.left),
        minY: Math.min(0, TOP - BOUNDS.top),
        maxY: Math.max(0, BOTTOM - BOUNDS.bottom)
      };
      if (scene === "farm" && ZOOM !== 1) {
        this.panLimits.minX = Math.min(this.panLimits.minX, -BOUNDS.right);
        this.panLimits.maxX = Math.max(this.panLimits.maxX, -BOUNDS.left);
        this.panLimits.minY = Math.min(this.panLimits.minY, -BOUNDS.top - BASE_Y);
        this.panLimits.maxY = Math.max(this.panLimits.maxY, -BOUNDS.bottom - BASE_Y);
      }
      this.pan.x = CLAMP2(this.pan.x, this.panLimits.minX, this.panLimits.maxX);
      this.pan.y = CLAMP2(this.pan.y, this.panLimits.minY, this.panLimits.maxY);
      this.offset = [this.pan.x, BASE_Y + this.pan.y];
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
      this.offset[1] = this.baseY() + NEXT_Y;
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
    // Zoom keeps the ground under the pointer where it is. factor > 1 closes in.
    zoomAt(factor, clientX = null, clientY = null) {
      if (this.scene !== "farm" || !(factor > 0)) {
        return false;
      }
      const NEXT = CLAMP2(this.zoom * factor, ZOOM_MIN, ZOOM_MAX);
      if (NEXT === this.zoom) {
        return false;
      }
      const R2 = this.canvas.getBoundingClientRect(), PX = (clientX === null ? R2.width / 2 : clientX - R2.left) * this.pixelRatio, PY = (clientY === null ? R2.height / 2 : clientY - R2.top) * this.pixelRatio, WX = PX / this.scale - this.offset[0] - this.view[0], WY = this.view[1] - PY / this.scale - this.offset[1];
      this.zoom = NEXT;
      this.configure(this.scene, true);
      const BASE_Y = this.offset[1] - this.pan.y;
      this.setPan(PX / this.scale - this.view[0] - WX, this.view[1] - PY / this.scale - WY - BASE_Y);
      return true;
    }
    // A wide screen sits a little further back and higher up, so the tower behind the farm shows.
    homeZoom() {
      return this.aspect > 1.2 ? 0.72 : 1;
    }
    baseY() {
      return this.aspect < 0.8 ? 1.1 : this.aspect > 1.2 ? -3.3 : -0.3;
    }
    resetZoom() {
      this.zoom = this.homeZoom();
      this.configure(this.scene, true);
      return this.resetPan();
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
        const X = (POINTS[i * 2] + OX) * S, Y = (OY - import_vector_sockets8.WORLD_DEPTH_PROJECTION * POINTS[i * 2 + 1]) * S;
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
    // In a fight every body stands on a side ring: ally blue, enemy red. A fallen one turns grey with a cross.
    drawSideMarker(u, shadow) {
      if (u.hp <= 0 || u.down > 0) {
        this.groundEllipse(u.x, u.y, shadow * 1.05, shadow * 0.7, "rgba(30,30,36,0.35)");
        this.ring(u.x, u.y, shadow * 1.05, "rgba(120,124,134,0.9)", 0.05);
        const C = this.ctx, ARM = shadow * 0.8, A = this.project(u.x - ARM, u.y - ARM * 0.6, 0), B = this.project(u.x + ARM, u.y + ARM * 0.6, 0), D = this.project(u.x - ARM, u.y + ARM * 0.6, 0), E = this.project(u.x + ARM, u.y - ARM * 0.6, 0);
        C.beginPath();
        C.moveTo(A.x, A.y);
        C.lineTo(B.x, B.y);
        C.moveTo(D.x, D.y);
        C.lineTo(E.x, E.y);
        C.strokeStyle = "rgba(232,90,80,0.95)";
        C.lineWidth = Math.max(2 * this.pixelRatio, this.scale * 0.12);
        C.lineCap = "round";
        C.stroke();
        return;
      }
      const ALLY = u.faction === "player";
      this.groundEllipse(
        u.x,
        u.y,
        shadow * 1.05,
        shadow * 0.7,
        ALLY ? "rgba(70,170,240,0.22)" : "rgba(240,70,60,0.26)"
      );
      this.ring(u.x, u.y, shadow * 1.05, ALLY ? "#4fb8f2" : "#f0463c", 0.08);
    }
    // `z` lifts the ring off the floor for marks that belong at a body's height, such as a hit on a boss's head.
    ring(x, y, r, color2, width = 0.045, start2 = 0, end = Math.PI * 2, z = 0) {
      const C = this.ctx, P = this.project(x, y, z);
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
    terrain(sim2, now) {
      if (sim2.insideTower) {
        drawTowerHall(this, sim2, now);
        return;
      }
      drawFarmGrounds(this, sim2);
      this.scenePresentation.drawBoundary(this);
      this.drawWorkShadows(sim2);
    }
    // The camera follows the climb: on the march it pulls back to show the tower and its door, and
    // it stays there a moment when the troops come back out; inside, it rests on the hall.
    directCamera(sim2, now) {
      const INSIDE = !!sim2.insideTower, KEY2 = INSIDE ? `in${sim2.tower?.floor}` : "out", MARCHING = sim2.farmBossEvent?.phase === "marching";
      if (this.sceneKey === void 0) {
        this.sceneKey = KEY2;
        this.sceneChangedAt = -1e9;
        this.towerShotUntil = 0;
      } else if (KEY2 !== this.sceneKey) {
        const WAS_INSIDE = this.sceneKey !== "out";
        this.sceneKey = KEY2;
        this.sceneChangedAt = now;
        if (INSIDE && !WAS_INSIDE) {
          this.fitHall(sim2);
        } else if (!INSIDE) {
          this.hallFramingKey = null;
          this.towerShotUntil = now + 2600;
        }
      }
      if (MARCHING || now < this.towerShotUntil) {
        const ZOOM_TARGET = this.aspect > 1.2 ? 0.55 : 0.8;
        this.zoom += (ZOOM_TARGET - this.zoom) * 0.07;
        this.configure(this.scene, true);
        const BASE_Y = this.baseY(), TARGET_Y = -0.2 * this.view[1] - import_vector_sockets8.WORLD_DEPTH_PROJECTION * CONFIG.farm.arena.radiusY - BASE_Y;
        this.setPan(this.pan.x * 0.9, this.pan.y + (TARGET_Y - this.pan.y) * 0.07);
        this.cameraReturning = true;
      } else if (this.cameraReturning && !INSIDE) {
        this.zoom += (this.homeZoom() - this.zoom) * 0.1;
        this.configure(this.scene, true);
        this.setPan(this.pan.x * 0.9, this.pan.y * 0.9);
        if (Math.abs(this.zoom - this.homeZoom()) < 0.01 && Math.abs(this.pan.y) < 0.05) {
          this.resetZoom();
          this.cameraReturning = false;
        }
      } else if (INSIDE) {
        this.cameraReturning = false;
        this.fitHall(sim2);
      }
    }
    // Inside the tower the whole hall is always in view: no panning or zooming, so tapping anywhere deploys.
    fitHall(world) {
      const { radiusX: RX2, radiusY: RY2 } = CONFIG.farm.arena, BASE = this.scenePresentation.cameraView(this.aspect), HALL_FIT = Math.min(BASE[0] / (RX2 + 1), BASE[1] / (RY2 * import_vector_sockets8.WORLD_DEPTH_PROJECTION + 3.5)), HALF_X = BASE[0] / HALL_FIT, HALL_SCALE = this.canvas.width / (2 * HALF_X), TOP = BASE[1] / HALL_FIT - this.baseY(), BOTTOM = TOP - this.canvas.height / HALL_SCALE;
      if (this.hallFramingKey !== this.sceneKey) {
        this.hallFramingKey = this.sceneKey;
        this.hallEffectBounds = { left: Infinity, right: -Infinity, top: -Infinity };
      }
      const BOUNDS = this.hallEffectBounds;
      includeFormationEffectBounds(world, BOUNDS);
      const LEFT = Math.min(-HALF_X, BOUNDS.left), RIGHT = Math.max(HALF_X, BOUNDS.right), FRAME_TOP = Math.max(TOP, BOUNDS.top), SCALE = Math.min(this.canvas.width / (RIGHT - LEFT), this.canvas.height / (FRAME_TOP - BOTTOM)), FIT = 2 * BASE[0] * SCALE / this.canvas.width;
      if (Math.abs(this.zoom - FIT) > 1e-6) {
        this.zoom = FIT;
        this.configure(this.scene, true);
      }
      const PAN_X = -(LEFT + RIGHT) / 2, PAN_Y = this.view[1] - this.baseY() - this.canvas.height / (2 * this.scale) - (FRAME_TOP + BOTTOM) / 2;
      this.panLimits.minX = Math.min(this.panLimits.minX, PAN_X);
      this.panLimits.maxX = Math.max(this.panLimits.maxX, PAN_X);
      this.panLimits.minY = Math.min(this.panLimits.minY, PAN_Y);
      this.panLimits.maxY = Math.max(this.panLimits.maxY, PAN_Y);
      this.setPan(PAN_X, PAN_Y);
    }
    // Going through the door fades out and each new place fades in, so the climb reads as a cut, not a pop.
    drawSceneFade(sim2, now) {
      const EVENT = sim2.farmBossEvent, MARCH = EVENT?.phase === "marching" ? EVENT.elapsed / CONFIG.farm.tower.marchSeconds : 0, OUT = MARCH > 0.82 ? (MARCH - 0.82) / 0.18 : 0, IN_MS = sim2.insideTower ? 700 : 500, IN = CLAMP2(1 - (now - this.sceneChangedAt) / IN_MS, 0, 1), DARK = Math.max(CLAMP2(OUT, 0, 1), IN);
      if (DARK > 0.01) {
        const C = this.ctx;
        C.fillStyle = `rgba(14,10,22,${DARK})`;
        C.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
    drawDanger(sim2) {
      const PRESENTATION = this.scenePresentation;
      const AREA = PRESENTATION.dangerVisible(sim2) ? renderedBossAttackArea(sim2.boss, sim2.scene, this.telegraphBoss, this.dangerArea) : null;
      this.bossTelegraph = AREA;
      if (AREA) {
        this.drawBossTelegraph(AREA);
      }
    }
    drawWorkShadows(sim2) {
      for (const PILE of sim2.piles || []) {
        this.groundEllipse(PILE.x, PILE.y, 1.5, 1, "#54452433");
      }
    }
    // Piles, construction sites and facilities stand among the units, so they are sorted with them by depth.
    addWorkActors(sim2) {
      const OBJECTS = this.workObjects || (this.workObjects = { draw: (source) => this.drawWorkObject(source) });
      for (const PILE of sim2.piles || []) {
        this.addActor(OBJECTS, { pile: PILE, sim: sim2 }, 0.785 * PILE.y, -2e6 - PILE.id);
      }
      const SEEN = this.pileHits;
      if (SEEN && SEEN.size > 12) {
        const LIVE = new Set((sim2.piles || []).map((pile) => pile.id));
        for (const ID of SEEN.keys()) {
          if (!LIVE.has(ID)) {
            SEEN.delete(ID);
          }
        }
      }
    }
    drawWorkObject(source) {
      this.drawPile(source.pile, this.displayTimeMs);
    }
    drawPile(pile, now) {
      const PILE = pile;
      const SEEN = this.pileHits || (this.pileHits = /* @__PURE__ */ new Map());
      {
        const S = this.scale * (0.95 + 0.5 * (PILE.food / PILE.maxFood));
        let seen = SEEN.get(PILE.id);
        if (!seen) {
          seen = { rev: PILE.hitRev, at: -1e9 };
          SEEN.set(PILE.id, seen);
        }
        if (seen.rev !== PILE.hitRev) {
          seen.rev = PILE.hitRev;
          seen.at = now;
        }
        const HIT = CLAMP2(1 - (now - seen.at) / 220, 0, 1), BASE = this.project(PILE.x, PILE.y, 0), X = BASE.x + Math.sin(now * 0.07) * HIT * 0.05 * S, SQUASH = 1 + HIT * 0.14, LIFT = 1 - HIT * 0.16;
        {
          this.ellipse(X, BASE.y - 0.16 * S * LIFT, 0.86 * S * SQUASH, 0.4 * S * LIFT, "#c99f4a");
          this.ellipse(X, BASE.y - 0.34 * S * LIFT, 0.72 * S * SQUASH, 0.44 * S * LIFT, "#dcb85f");
          this.ellipse(X, BASE.y - 0.56 * S * LIFT, 0.5 * S * SQUASH, 0.34 * S * LIFT, "#e6c773");
          this.ellipse(X - 0.1 * S, BASE.y - 0.72 * S * LIFT, 0.2 * S, 0.12 * S, "#f1dc9a");
          this.ellipse(X, BASE.y - 0.4 * S * LIFT, 0.74 * S * SQUASH, 0.08 * S, "#a9793b");
          for (let index = -2; index <= 2; index++) {
            this.ellipse(
              X + index * 0.15 * S,
              BASE.y - 0.24 * S * LIFT,
              0.025 * S,
              0.1 * S,
              "#b98e45",
              index * 0.25
            );
          }
        }
        for (let index = 0; index < 5; index++) {
          const SLOT_X = BASE.x + (index - 2) * 0.27 * S, SLOT_Y = BASE.y + 0.14 * S;
          this.ellipse(SLOT_X, SLOT_Y, 0.115 * S, 0.1 * S, "#6b522a99");
          this.ellipse(SLOT_X, SLOT_Y, 0.085 * S, 0.072 * S, index < PILE.stack ? "#f6d36b" : "#efe3bf");
        }
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
      this.shakeX = this.feel?.shake(now) || 0;
      this.configure(sim2.scene);
      this.directCamera(sim2, now);
      const C = this.ctx, PRESENTATION = this.scenePresentation;
      PRESENTATION.collectJoy(sim2, this.joyEffects);
      C.beginFrame({
        width: this.canvas.width,
        height: this.canvas.height,
        clearColor: [0.9, 0.92, 0.87, 1]
      });
      this.terrain(sim2, now);
      const SIDES = sim2.insideTower || sim2.scene !== "farm";
      for (const U of sim2.units) {
        const A = CLAMP2(0.22 / (1 + U.z * 0.3), 0.045, 0.22), SHADOW = U.size * 0.66 / (1 + U.z * 0.65);
        this.groundEllipse(U.x, U.y, SHADOW, SHADOW * 0.62, `rgba(42,61,35,${A})`);
        if (U.tier > 1 && !U.isFormationClone) {
          this.ring(U.x, U.y, SHADOW * 1.12, GRADE_RING_COLORS[U.tier - 1], GRADE_RING_WIDTHS[U.tier - 1]);
        }
        if (SIDES) {
          this.drawSideMarker(U, SHADOW);
        }
      }
      this.drawDanger(sim2);
      feel?.drawGround(this, this.displayTimeMs);
      const BOSS_VISIBLE = PRESENTATION.bossVisible(sim2);
      if (BOSS_VISIBLE) {
        this.groundEllipse(sim2.boss.x, sim2.boss.y, sim2.boss.radius * 1.05, sim2.boss.radius * 0.75, "#38472c33");
        if (SIDES) {
          this.ring(sim2.boss.x, sim2.boss.y, sim2.boss.radius * 1.05, "#f0463c", 0.12);
        }
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
      if (!sim2.insideTower) {
        PRESENTATION.collectFood(this, sim2);
      }
      if (sim2.scene === "farm" && !sim2.insideTower) {
        this.addWorkActors(sim2);
      }
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
        const BODY2 = this.attachmentBody(sim2, GROUP, feel);
        for (const ATTACHMENT of GROUP.attachments) {
          if (ATTACHMENT.status === "attached" || ATTACHMENT.status === "fading") {
            CORN_ATTACHMENT_PRESENTATION.drawAttachment(this, ATTACHMENT, GROUP, {
              tick: sim2.simulationTick,
              body: BODY2
            });
          }
        }
      }
      for (const E of sim2.effects) {
        if (E.kind !== "merge-material") {
          drawEffect(this, E);
        }
      }
      drawFormationEffects(this, sim2);
      this.drawSceneFade(sim2, now);
      this.stats = C.endFrame();
    }
    // The body a stuck kernel sits on: the boss is big and recoils when hit, a unit is small.
    attachmentBody(sim2, group, feel) {
      if (group.targetId !== "boss") {
        return void 0;
      }
      const RECOIL = feel?.boss(this.displayTimeMs);
      return {
        radius: sim2.boss.radius,
        height: sim2.boss.height,
        scale: 3.4,
        shiftX: RECOIL?.x || 0,
        shiftY: RECOIL?.y || 0
      };
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
  init_tower_run();
  init_model19();
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
      barleyArmorShredTotal: R.STEP,
      barleyArmorShredLeft: R.STEP,
      lastStandOn: R.STEP,
      resolveOn: R.STEP,
      vengeanceStacks: R.STEP,
      openingLeft: R.LINEAR
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
      this.buffed = false;
      this.isBattleOnlySummon = u.isBattleOnlySummon;
      this.isFormationClone = u.isFormationClone;
      this.giantUntil = u.giantUntil;
      this.giantEndedAt = u.giantEndedAt;
      this.cloneParentId = u.battleSummonParentId;
      this.cloneBornAt = u.cloneBornAt;
      this.barleyArmorShredTotal = BarleyArmorShredModel.total(u, world.simulationTick);
      this.barleyArmorShredLeft = BarleyArmorShredModel.remaining(u, world.simulationTick);
      this.updatePassiveMarks(u, world);
    }
    // The tower's passive cards as flags the marks draw from: which condition each card is in for this unit right now.
    updatePassiveMarks(u, world) {
      const TOWER = world.tower, TOTALS = TOWER.passives, LIVE = TOWER.active && u.hp > 0 && !u.isBattleOnlySummon;
      this.lastStandOn = LIVE && !!TOTALS["last-stand"] && u.hp <= this.maxHp * PASSIVE_SETTINGS.lastStandBelow;
      this.resolveOn = LIVE && !!TOTALS.resolve && u.hp <= this.maxHp * PASSIVE_SETTINGS.resolveBelow;
      this.vengeanceStacks = LIVE && TOTALS.vengeance ? Math.min(TOWER.fallen, PASSIVE_SETTINGS.vengeanceMaxFallen) : 0;
      this.openingLeft = LIVE && TOTALS.opening && world.farmBossEvent.phase === "fighting" ? Math.max(0, PASSIVE_SETTINGS.openingSeconds - world.farmBossEvent.elapsed) : 0;
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
      barleyArmorShredTotal: R.STEP,
      barleyArmorShredLeft: R.STEP
    });
    update(b, world) {
      const ACTION = b.patternRuntime.active, EVENT = world.farmBossEvent, TARGET = ACTION?.target || null, START = ACTION?.start || null, MOUTH = b.summonMouth || {};
      this.x = b.x;
      this.y = b.y;
      this.z = b.z;
      this.angle = b.angle;
      this.startAngle = b.startAngle;
      this.phase = ACTION?.phase || (!b.active || EVENT?.phase === "dropping" ? "resting" : "chase");
      this.clock = ACTION?.phaseElapsed ?? (EVENT.phase === "celebrating" || EVENT.phase === "fading" ? EVENT.elapsed : 0);
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
      this.barleyArmorShredLeft = BarleyArmorShredModel.remaining(b, world.simulationTick);
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
      beamTargetZ: R.LINEAR,
      bodyRadius: R.STEP,
      bodyHeight: R.STEP
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
    constructor(world = new GARDEN(), { onError = console.error } = {}) {
      this.world = world;
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
    advance() {
      if (this.closed) {
        return CLOSED;
      }
      const COMMAND_START = this.profiler?.start();
      this.applyPendingCommands(32);
      this.profiler?.end("commandQueue", COMMAND_START);
      if (this.paused) {
        this.tick++;
        return ADVANCED;
      }
      const W = this.world, START_TIME = W.time, LOOP_START = this.loop?.simulationTimeMs, START_CLOCK = this.adjustedWallTime(
        Number.isFinite(LOOP_START) ? LOOP_START : this.pulseTimestamp ?? globalThis.performance.now()
      ), PRESENTATION_START_MS = Math.max(0, START_CLOCK - (this.presentationOriginWallMs ?? START_CLOCK));
      bindPresentationClock(W, (time) => PRESENTATION_START_MS + (time - START_TIME) * 1e3);
      if (W.scene === "farm") {
        const AUTO_TAPS_START = this.profiler?.start();
        try {
          W.advanceWork(1 / LOCAL_PROFILE.tickRate);
        } finally {
          this.profiler?.end("autoTaps", AUTO_TAPS_START);
        }
      }
      W.step(1 / LOCAL_PROFILE.tickRate);
      this.tick++;
      this.presentationTick++;
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
      return this.applyPendingCommands(this.pending.length);
    }
    command(c) {
      const W = this.world;
      switch (c.type) {
        case "farm-work":
          return W.scene === "farm" && W.setWorkBasisPoints(c.basisPoints);
        case "farm-breed-weights":
          return W.scene === "farm" && W.setBreedWeights(c.weights);
        case "deploy-order":
          return W.scene === "farm" && W.setDeployOrder(c.order);
        case "tower-start":
          return W.scene === "farm" && W.startTower(c.floor);
        case "tower-door":
          return W.scene === "farm" && W.chooseDoor(c.index);
        case "tower-leave":
          return W.scene === "farm" && W.leaveTower();
        case "farm-sort":
          return W.scene === "farm" && W.sortActiveFarm(c.order);
        case "merge":
          return W.scene === "farm" && W.startManualMerge();
        case "progression-invest":
          if (W.scene === "farm" && typeof c.nodeId === "string" && c.nodeId.length < 64) {
            if (c.scope === "ability" && typeof c.abilityId === "string" && c.abilityId.length < 64) {
              return W.investAbilityNode(c.abilityId, c.nodeId).ok;
            }
          }
          return false;
        case "progression-reset":
          return W.scene === "farm" && W.resetProgression(c.scope).ok;
        case "ability-reset":
          return W.scene === "farm" && W.resetAbilityTree().ok;
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
      for (const FOOD2 of WORLD.food) {
        if (FOOD2.phase === "grounded") {
          const ID = this.presentationIdentity("food", FOOD2);
          if (!VIEW.presentationFoodIds.has(ID)) {
            VIEW.food.push(FOOD2);
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
  init_unit_abilities();
  init_unit_grades();
  init_boss_patterns();
  init_boss_rewards();
  init_factions();

  // src/farm-snapshot.js
  init_formation_skill_state();
  init_ability_state();
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
    dropLanded: true,
    isBattleOnlySummon: false,
    battleSummonKind: "",
    battleSummonParentId: 0,
    battleSummonParentGeneration: 0,
    battleSummonEncounterId: 0,
    countsTowardPermanentRoster: true,
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
      farm: 0
    },
    formationRuntime: createFormationRuntime(),
    playerProgression: {
      schemaVersion: 3,
      abilities: ABILITY_INVESTMENTS(),
      towerBest: 0,
      processedBossKillReceipts: []
    },
    starter: 0,
    foodTaps: {
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
    bossSummonSerial: 0,
    combatLog: [],
    scene: "farm",
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
  var PROGRESSION = shapeFields(FARM_SNAPSHOT_SHAPE.playerProgression, {});
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
    food: [FIELDS("x y z vx vy vz seed phase tx ty")],
    formationRuntime: JSON_PAYLOAD,
    units: [UNIT2],
    boss: BOSS,
    playerProgression: PROGRESSION,
    projectiles: [PROJECTILE],
    cornAttachments: FIELDS("nextGroupId nextAttachmentId", { groups: [CORN_GROUP] }),
    bossRewardReceipts: [REWARD],
    bossRewardStreams: JSON_PAYLOAD,
    bossRewardInventory: [FIELDS("species tier count")],
    events: [JSON_PAYLOAD],
    effects: [JSON_PAYLOAD],
    notices: [JSON_PAYLOAD],
    combatLog: [JSON_PAYLOAD],
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
    const SOURCE = world?.unitCollection && world.scene === "farm" ? { ...world, units: world.unitCollection.items } : world;
    return copyFields(SOURCE, SNAPSHOT_FIELDS);
  }

  // src/farm-snapshot-validation.js
  init_definition15();
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
      const MAX = key === "units" ? CONFIG.battle.capacity.battleUnits : key === "projectiles" ? CONFIG.battle.capacity.projectiles : key === "bossRewardReceipts" || key === "processedBossKillReceipts" ? 1e5 : 1024;
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
      if (typeof X === "object" && Object.keys(X).length === 0) {
        if (v[K] === null || typeof v[K] !== "object" || Array.isArray(v[K])) {
          throw new TypeError(`Invalid farm snapshot map: ${path}.${K}.`);
        }
      } else if (typeof X === "object") {
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
    ASSERT2(raw.scene === "farm");
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
      raw.units.length <= (raw.scene === "farm" ? raw.farmBossEvent?.phase === "idle" ? CONFIG.farm.capacity.max : CONFIG.farm.capacity.battleUnits : 0) && raw.food.length <= 140 && raw.projectiles.length <= CONFIG.battle.capacity.projectiles
    );
    ASSERT2(
      raw.farmBossEvent && ["idle", "dropping", "fighting", "celebrating", "fading"].includes(raw.farmBossEvent.phase) && ["idle", "fighting", "victory", "defeat"].includes(raw.farmBossEvent.outcome) && Number.isFinite(raw.farmBossEvent.elapsed) && raw.farmBossEvent.elapsed >= 0
    );
    ASSERT2(INTEGER2(raw.nextBossEncounterId, 1, 1e12) && Array.isArray(raw.bossRewardReceipts));
    ASSERT2(isValidPlayerProgressionState(raw.playerProgression));
    ASSERT2(Array.isArray(raw.food) && raw.food.length <= 140);
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
      raw.bossRewardWatermarks && INTEGER2(raw.bossRewardWatermarks.farm, 0, 1e12) && raw.nextBossEncounterId > raw.bossRewardWatermarks.farm
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
        REWARD2 && INTEGER2(REWARD2.encounterId, 1, 1e12) && REWARD2.source === "farm" && REWARD2.encounterId <= raw.bossRewardWatermarks[REWARD2.source] && INTEGER2(REWARD2.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER2(REWARD2.tier, 1, CONFIG.unit.maxTier) && Number.isFinite(REWARD2.x) && Number.isFinite(REWARD2.y) && Number.isFinite(REWARD2.chance) && REWARD2.chance >= 0 && REWARD2.chance <= 1 && typeof REWARD2.firstClear === "boolean"
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
    if (FARM_EVENT.outcome === "victory" && FARM_EVENT.phase !== "idle") {
      const RECEIPT = raw.bossRewardReceipts.find(
        (reward) => reward.source === "farm" && reward.encounterId === FARM_EVENT.encounterId
      );
      ASSERT2(
        RECEIPT && RECEIPT.status === FARM_EVENT.rewardStatus && RECEIPT.chance === FARM_EVENT.rewardChance && RECEIPT.roll === FARM_EVENT.rewardRoll && RECEIPT.unitId === FARM_EVENT.rewardUnitId
      );
    }
    ASSERT2(
      raw.corpseRecoveryVersion === 1 && INTEGER2(raw.nextId, 1, 1e9) && INTEGER2(raw.bossSummonSerial, 0, 1e12) && INTEGER2(raw.foodTaps.produced, 0, 1e12)
    );
    const IDS = /* @__PURE__ */ new Set(), MATE_ID_LIMIT = CONFIG.farm.maxUnitId;
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
            U.battleSummonKind === "formation-copy" && U.faction === "player" && U.hp > 0 && U.hp <= 1 && U.canSplit === false && U.countsTowardPermanentRoster === false && U.breedingEligible === false && U.mergeEligible === false && U.usesPersistentSleep === false && U.lifetime === "until-death-or-battle-end" && INTEGER2(U.battleSummonParentId, 1, 1e12)
          );
          ASSERT2(raw.farmBossEvent.phase === "fighting");
        } else if (U.battleSummonKind === "peanut-death-split") {
          ASSERT2(
            raw.scene === "farm" && INTEGER2(U.battleSummonParentId, 1, Number.MAX_SAFE_INTEGER) && INTEGER2(U.battleSummonParentGeneration, 1, 1e12) && U.battleSummonEncounterId === 0 && U.species === 4 && hasUnitCapability(U.species, "deathSplit") && U.tier === 1 && U.permanentStatMultiplier <= 2.25 && U.canSplit === false && U.countsTowardPermanentRoster === false && U.breedingEligible === false && U.mergeEligible === false && U.usesPersistentSleep === false && U.lifetime === "until-death-or-battle-end" && U.deathSplitHandled === false && U.splitUsedThisBattle === true && U.hp > 0
          );
          const PARENT = UNITS_BY_ID.get(U.battleSummonParentId);
          ASSERT2(
            PARENT && hasFaction(PARENT, FACTION_CONFIG.PLAYER) && PARENT.isBattleOnlySummon === false && PARENT.hp <= 0 && PARENT.generation === U.battleSummonParentGeneration && hasUnitCapability(PARENT.species, "deathSplit") && PARENT.species === 4 && PARENT.splitUsedThisBattle && PARENT.faction === U.faction && PARENT.ownerId === U.ownerId && PARENT.farmId === U.farmId
          );
          const LIST = SUMMONS_BY_PARENT.get(PARENT.id) || [];
          LIST.push(U);
          SUMMONS_BY_PARENT.set(PARENT.id, LIST);
          ASSERT2(INTEGER2(U.id, 1, raw.nextId - 1) && raw.farmBossEvent.phase !== "idle");
        } else {
          ASSERT2(
            U.battleSummonKind === "boss-mouth-t1" && U.battleSummonParentId === 0 && INTEGER2(U.battleSummonEncounterId, 1, 1e12) && U.battleSummonEncounterId === raw.boss.encounterId && U.species === raw.boss.species && U.tier === 1 && U.ownerId === "boss" && U.farmId === 0 && U.canSplit === false && U.countsTowardPermanentRoster === false && U.breedingEligible === false && U.mergeEligible === false && U.usesPersistentSleep === false && U.lifetime === "until-death-or-battle-end" && U.deathSplitHandled === false && U.splitUsedThisBattle === true && U.hp > 0 && U.battleSummonEncounterId > 0 && U.id >= CONFIG.boss.summonIdBase && U.id <= CONFIG.boss.summonIdBase + raw.bossSummonSerial
          );
          ASSERT2(raw.farmBossEvent.phase === "fighting");
        }
      } else {
        ASSERT2(
          U.battleSummonKind === "" && U.battleSummonParentId === 0 && U.battleSummonEncounterId === 0 && U.countsTowardPermanentRoster === true && U.breedingEligible === true && U.mergeEligible === true && U.canSplit === true && U.usesPersistentSleep === true && U.lifetime === ""
        );
        ASSERT2(INTEGER2(U.id, 1, raw.nextId - 1));
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
      INTEGER2(raw.entityGenerationSerial, 1, 1e12) && raw.entityGenerationSerial >= raw.boss.generation && raw.units.every((unit2) => unit2.generation <= raw.entityGenerationSerial)
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
        INTEGER2(P.owner, 1, raw.nextId - 1) || INTEGER2(P.owner, CONFIG.boss.summonIdBase + 1, CONFIG.boss.summonIdBase + raw.bossSummonSerial)
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
      INTEGER2(raw.cornAttachments.nextGroupId, 1, 1e12) && INTEGER2(raw.cornAttachments.nextAttachmentId, 1, 1e12) && Array.isArray(raw.cornAttachments.groups) && raw.cornAttachments.groups.length <= CONFIG.battle.capacity.projectiles
    );
    for (const GROUP of raw.cornAttachments.groups) {
      ASSERT2(
        INTEGER2(GROUP.id, 1, raw.cornAttachments.nextGroupId - 1) && INTEGER2(GROUP.targetGeneration, 1, 1e12) && (GROUP.targetId === "boss" || VALID_BATTLE_UNIT_ID(GROUP.targetId, raw.bossSummonSerial)) && ["collecting", "exploding", "complete", "cancelled"].includes(GROUP.status) && Number.isFinite(GROUP.targetX) && Number.isFinite(GROUP.targetY) && Number.isFinite(GROUP.targetZ) && INTEGER2(GROUP.firstAttachTick, 0, raw.simulationTick) && GROUP.closeAtTick === GROUP.firstAttachTick + CORN_DEFINITION.attachDelayTicks && (GROUP.nextExplosionTick === null || INTEGER2(GROUP.nextExplosionTick, 0, 1e12)) && Array.isArray(GROUP.attachments) && GROUP.attachments.length > 0 && GROUP.attachments.length <= CONFIG.battle.capacity.projectiles
      );
      for (const ATTACHMENT of GROUP.attachments) {
        ASSERT2(
          INTEGER2(ATTACHMENT.id, 1, raw.cornAttachments.nextAttachmentId - 1) && !ATTACHMENTS.has(ATTACHMENT.id) && ATTACHMENT.groupId === GROUP.id && ATTACHMENT.targetId === GROUP.targetId && ATTACHMENT.targetGeneration === GROUP.targetGeneration && INTEGER2(ATTACHMENT.ownerId, 1, 1e12) && INTEGER2(ATTACHMENT.ownerGeneration, 1, 1e12) && Number.isFinite(ATTACHMENT.damageMultiplier) && ATTACHMENT.damageMultiplier >= 0.5 && ATTACHMENT.damageMultiplier <= 1 && ["attached", "fading", "removed"].includes(ATTACHMENT.status) && INTEGER2(ATTACHMENT.fadeTicks, 0, CORN_DEFINITION.fadeTicks) && Number.isFinite(ATTACHMENT.angle) && Number.isFinite(ATTACHMENT.offsetX) && Number.isFinite(ATTACHMENT.offsetY) && ATTACHMENT.payload && Number.isFinite(ATTACHMENT.payload.attackerStats?.attackPower) && Number.isFinite(ATTACHMENT.payload.attackPowerMultiplier) && typeof ATTACHMENT.payload.ownerId === "string" && Object.values(FACTION_CONFIG).includes(ATTACHMENT.payload.faction)
        );
        ATTACHMENTS.add(ATTACHMENT.id);
      }
    }
    ASSERT2(INTEGER2(raw.projectileSerial, 0, 1e12) && INTEGER2(raw.bossSummonSerial, 0, 1e12));
    ASSERT2(
      hasFaction(raw.boss, FACTION_CONFIG.ENEMY) && INTEGER2(raw.boss.generation, 1, 1e12) && raw.boss.hp >= 0 && raw.boss.hp <= raw.boss.maxHp && INTEGER2(raw.boss.species, 0, CONFIG.unit.speciesCount - 1) && raw.boss.maxHp > 0 && INTEGER2(raw.boss.stage, 0, BOSS_REWARD_SETTINGS.maxStage) && Number.isFinite(raw.boss.attackPower) && raw.boss.attackPower >= 4 && Number.isFinite(raw.boss.moveSpeed) && raw.boss.moveSpeed > 0 && INTEGER2(raw.boss.encounterId, 0, 1e12) && Number.isFinite(raw.boss.barleyArmorBreakUntil) && raw.boss.barleyArmorBreakUntil >= 0 && raw.boss.barleyArmorBreakUntil <= 1e12 && Number.isFinite(raw.boss.barleyArmorBreakReduction) && raw.boss.barleyArmorBreakReduction >= 0 && raw.boss.barleyArmorBreakReduction <= 0.75 && validBarleyArmorShredBuckets(raw.boss.barleyArmorShredBuckets)
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
        BOSS_PATTERN_IDS.includes(A.id) && ["windup", "active", "recover"].includes(A.phase) && Number.isFinite(A.phaseElapsed) && A.phaseElapsed >= 0 && Number.isFinite(A.aim) && (A.targetId === 0 || VALID_BATTLE_UNIT_ID(A.targetId, raw.bossSummonSerial)) && typeof A.locked === "boolean" && Array.isArray(A.hitIds) && A.hitIds.length <= CONFIG.battle.capacity.battleUnits && A.hitIds.every((id) => VALID_BATTLE_UNIT_ID(id, raw.bossSummonSerial)) && new Set(A.hitIds).size === A.hitIds.length && INTEGER2(A.released, 0, 4) && INTEGER2(A.volleyCount, 0, 4)
      );
      if (A.target) {
        ASSERT2(Number.isFinite(A.target.x) && Number.isFinite(A.target.y) && Number.isFinite(A.target.z));
      }
      if (A.path) {
        validatePath(A.path);
      }
    }
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
  function normalizeSnapshot(raw, { clone = true } = {}) {
    const SNAPSHOT = clone ? structuredClone(raw) : raw;
    validateSnapshot(SNAPSHOT);
    return SNAPSHOT;
  }

  // src/farm-state.js
  function restore(raw) {
    raw = normalizeSnapshot(raw);
    validateSnapshot(raw);
    const G = new GARDEN();
    const { units: UNIT_DATA, ...WORLD_DATA } = structuredClone(raw);
    G.resetUnits();
    Object.assign(G, WORLD_DATA);
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
    constructor() {
      this.voices = /* @__PURE__ */ new Set();
      this.lastSound = {};
      this.frameId = 0;
      this.soundFrame = {};
      this.muted = false;
      this.peakVoices = 0;
      this.counts = {
        land: 0,
        eat: 0
      };
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
      window.addEventListener("blur", () => {
        this.silence();
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this.silence();
        }
      });
      window.addEventListener("pagehide", () => {
        this.silence();
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
        crit: [620, 240, 0.11, 0.2],
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
    event(kind) {
      if (kind === "food-land" || kind === "eat") {
        const KEY2 = kind === "eat" ? "eat" : "land";
        this.counts[KEY2]++;
        this.sound(KEY2);
      }
    }
    frame() {
      this.frameId++;
    }
  };

  // src/combat-feel.js
  init_farm_model();
  init_damage_numbers();
  init_presentation9();
  var { ObjectPool: OBJECT_POOL } = globalThis.BloomGamekitObjectPool;
  var EMPTY_NOTICES = Object.freeze([]);
  var COMBAT_FEEL_CONFIG = Object.freeze({
    lifeMs: 430,
    maxEffects: 96,
    denseHits: 12,
    denseParticles: 2
  });
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
    // The ring lies on the floor, so it is drawn under every actor; on top of a tall body it read as a stray circle.
    drawGround(renderer, event, progress) {
      const T = Math.min(1, progress / this.durationFraction), ALPHA = 1 - T;
      if (ALPHA > 0) {
        renderer.ring(
          event.x,
          event.y,
          0.15 + T * this.size(event),
          `rgba(${this.color},${ALPHA * 0.8})`,
          this.ringWidth
        );
      }
    }
    draw(renderer, event, progress, feel) {
      const T = Math.min(1, progress / this.durationFraction), ALPHA = 1 - T;
      if (ALPHA <= 0) {
        return;
      }
      const SIZE = this.size(event), COLOR = this.color;
      const CENTER = renderer.project(event.x, event.y, event.z || 0.1), N = feel?.dense ? Math.min(this.particleCount, COMBAT_FEEL_CONFIG.denseParticles) : this.particleCount;
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
    draw(renderer, event, progress, feel) {
      super.draw(renderer, event, progress, feel);
      if (event.critical) {
        this.drawCritical(renderer, event, progress);
      }
    }
    // A critical hit reads by shape, not only by colour: a wide orange ring and a star of thick rays, where a normal
    // hit has a thin cream ring and short sparks.
    drawCritical(renderer, event, progress) {
      const T = Math.min(1, progress / 0.58), ALPHA = 1 - T, CENTER = renderer.project(event.x, event.y, (event.z || 0) + 0.22);
      if (ALPHA <= 0) {
        return;
      }
      renderer.ring(event.x, event.y, 0.3 + T * 0.62, `rgba(255,150,40,${ALPHA * 0.95})`, 0.11);
      for (let index = 0; index < 6; index++) {
        const ANGLE = index * Math.PI / 3 + event.sequence % 7 * 0.08, REACH = renderer.scale * (0.16 + T * 0.3), START = REACH * 0.45;
        renderer.line(
          { x: CENTER.x + Math.cos(ANGLE) * START, y: CENTER.y + Math.sin(ANGLE) * START },
          { x: CENTER.x + Math.cos(ANGLE) * REACH, y: CENTER.y + Math.sin(ANGLE) * REACH },
          0.075,
          `rgba(255,214,102,${ALPHA})`
        );
      }
    }
    // Every confirmed hit that did damage gets its own number; a blocked hit has none.
    spawnNumber(feel, event, at, role) {
      if (!(event.damage > 0)) {
        return;
      }
      feel.counts.numbers++;
      feel.push({
        kind: "damage-number",
        sequence: event.sequence,
        x: event.x,
        y: event.y,
        z: event.z,
        amount: event.damage,
        critical: event.critical,
        role,
        at,
        heard: true
      });
    }
    size(event) {
      const BASE = event.attackKind === "sweep" ? 1.15 : 0.6;
      return BASE * (0.75 + 0.3 * Math.min(3, event.strength || 1));
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
    observe(feel, event, displayEvent) {
      feel.counts.hits++;
      feel.bossHit = displayEvent;
      feel.kick(event.strength, displayEvent.at);
      this.spawnNumber(feel, event, displayEvent.at, "dealt");
    }
    sound(audio, event) {
      audio.sound(event.critical ? "crit" : "strike", event.species || 0);
    }
  };
  var UnitHitPresentation = class extends HitPresentation {
    color = "231,147,83";
    observe(feel, event, _displayEvent, at) {
      this.spawnNumber(feel, event, at, "taken");
      feel.poses.set(event.unit, {
        at,
        until: at + 180,
        strength: event.strength * (event.critical ? 1.4 : 1)
      });
      feel.counts.hits++;
    }
    sound(audio, event) {
      audio.sound(event.critical ? "crit" : event.attackKind === "sweep" ? "heavy" : "strike");
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
  var COMBAT_EFFECT_PRESENTATIONS = new Map([
    ["damage-number", Object.freeze(new DamageNumberPresentation())],
    ["boss-hit", Object.freeze(new BossHitPresentation())],
    ["unit-hit", Object.freeze(new UnitHitPresentation())],
    ["barley-shred", Object.freeze(BARLEY_SHRED_PRESENTATION3)],
    ["unit-land", Object.freeze(new UnitLandingPresentation())],
    ["attack-launch", Object.freeze(new AttackLaunchPresentation())],
    ["boss-launch", Object.freeze(new BossLaunchPresentation())],
    ...PASSIVE_PRESENTATION_EVENTS
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
      this.shakeAt = -1e9;
      this.shakePower = 0;
      this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.counts = {
        hits: 0,
        landings: 0,
        numbers: 0
      };
      this.dense = false;
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
    push(event) {
      this.effects.push(event);
      if (this.effects.length > COMBAT_FEEL_CONFIG.maxEffects) {
        this.releaseEffect(this.effects.shift());
      }
    }
    // How long an effect stays: the effect decides, the shared budget is only the default.
    lifeMs(event) {
      return COMBAT_EFFECT_PRESENTATIONS.get(event.kind)?.lifeMs ?? COMBAT_FEEL_CONFIG.lifeMs;
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
        this.push(EVENT);
        PRESENTATION.observe?.(this, E, EVENT, AT);
      }
      this.sequence = world.eventSequence;
      let retained = 0;
      for (const E of this.effects) {
        if (displayTimeMs - E.at < this.lifeMs(E)) {
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
      const POWER = Math.min(3, E.strength || 1), Q = Math.max(0, Math.min(1, (displayTimeMs - E.at) / 240)), K = Math.sin(Math.min(1, Q * 2) * Math.PI * 0.5) * (1 - Q) ** 2, JITTER = Math.sin(Q * 38) * (1 - Q) * 0.05 * POWER;
      return {
        x: -E.nx * K * (0.12 + 0.2 * POWER) + JITTER,
        y: -E.ny * K * (0.12 + 0.2 * POWER),
        squash: K * (0.035 + 0.04 * POWER) * (E.critical ? 1.4 : 1)
      };
    }
    kick(strength, at) {
      this.shakeAt = at;
      this.shakePower = Math.max(0, Math.min(3, strength || 1) - 0.8);
    }
    // World-unit camera offset: a short rattle after strong hits.
    shake(displayTimeMs) {
      const Q = (displayTimeMs - (this.shakeAt || -1e9)) / 220;
      if (this.reduced || Q < 0 || Q >= 1) {
        return 0;
      }
      return Math.sin(Q * 52) * (1 - Q) * 0.09 * (this.shakePower || 0);
    }
    sound(event) {
      COMBAT_EFFECT_PRESENTATIONS.get(event.kind)?.sound?.(this.audio, event);
    }
    drawGround(r, displayTimeMs) {
      for (const E of this.effects) {
        const AGE = displayTimeMs - E.at, LIFE = this.lifeMs(E);
        if (AGE >= 0 && AGE <= LIFE) {
          COMBAT_EFFECT_PRESENTATIONS.get(E.kind)?.drawGround?.(r, E, AGE / LIFE);
        }
      }
    }
    draw(r, displayTimeMs) {
      let hits = 0;
      for (const E of this.effects) {
        if (E.kind === "boss-hit" || E.kind === "unit-hit") {
          hits++;
        }
      }
      this.dense = hits > COMBAT_FEEL_CONFIG.denseHits;
      for (const E of this.effects) {
        const AGE = displayTimeMs - E.at, LIFE = this.lifeMs(E);
        if (AGE < 0 || AGE > LIFE) {
          continue;
        }
        if (!E.heard) {
          E.heard = true;
          this.sound(E);
        }
        COMBAT_EFFECT_PRESENTATIONS.get(E.kind)?.draw?.(r, E, AGE / LIFE, this);
      }
    }
  };

  // src/ability-tree.js
  init_ability_catalog();
  init_species_catalog();
  init_ability_state();
  init_unit_abilities();
  init_player_progression();
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
    ["prerequisite-required", "이전 단계에 먼저 투자해야 해요."],
    ["insufficient-points", "이 종의 숙련 포인트가 필요해요. 이 종 보스를 잡으면 쌓여요."],
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
    const FOCUS = Number.isInteger(selectedSpecies) ? SPECIES_ABILITY_DEFINITIONS.find((definition) => definition.species === selectedSpecies) : null, POINTS = FOCUS ? getAbilityPointsLeft(state, FOCUS.id) : SPECIES_ABILITY_DEFINITIONS.reduce(
      (total, definition) => total + getAbilityPointsLeft(state, definition.id),
      0
    ), LEVEL_MARKUP = FOCUS ? renderMasteryMarkup(state.abilities[FOCUS.id], speciesById(FOCUS.species).name) : "", DEFAULTS_NOTE = "모든 일반 병종의 대표 능력은 Common(T1)부터 무료로 적용돼요. 이 종의 보스를 잡을수록 숙련이 올라 능력을 강화할 포인트가 생겨요.";
    return `<section class="ability-tree" aria-labelledby="ability-tree-title">
    <header class="ability-tree__header">
      <div><p class="ability-tree__eyebrow">농장 성장</p><h2 id="ability-tree-title">병종 특성</h2></div>
      <p class="ability-tree__wallet" aria-live="polite"><strong>${POINTS}</strong><span>숙련 포인트</span></p>
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
  function renderMasteryMarkup(mastery, speciesName) {
    const NEXT_LEVEL_XP = masteryXpForNextLevel(mastery.masteryLevel), LABEL = `${speciesName} 숙련 ${mastery.masteryLevel} 경험치`;
    return `<div class="ability-tree__progress" aria-live="polite">
    <div><strong>${speciesName} 숙련 Lv. ${mastery.masteryLevel}</strong><span>${formatXpForDisplay(mastery.masteryXp)} / ${formatXpForDisplay(NEXT_LEVEL_XP)} XP</span></div>
    <progress max="${NEXT_LEVEL_XP}" value="${mastery.masteryXp}" aria-label="${LABEL}"></progress>
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
    const STATUS2 = knownStatus || getAbilityNodeStatus(state, definition, nodeId, context);
    const HINT_ID = `ability-help-${definition.id}-${nodeId.replace(/[^a-z0-9-]/gi, "-")}`;
    const STATUS_TEXT = STATUS2.purchased ? "투자 완료" : nodeReasonLabel(STATUS2.reason, definition, context);
    const ATTR = `${definition.id}:${nodeId.replace(/-(\d+)$/, ":$1")}`;
    return `<div class="ability-node ${STATUS2.purchased ? "is-purchased" : ""} ${STATUS2.ready ? "is-ready" : "is-locked"}">
    <button type="button" class="ability-node__button" data-ability-node="${ATTR}" aria-describedby="${HINT_ID}" aria-disabled="${!STATUS2.ready}">
      <span class="ability-node__title">${title}</span><span class="ability-node__effect">${effect}</span><span class="ability-node__cost">${STATUS2.purchased ? "완료" : "1 포인트"}</span>
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

  // src/farm-app.js
  init_ability_progression();
  init_ability_catalog();
  init_boss_rewards();
  init_farm_work();

  // src/breed-allocation.js
  function apportionBreedShares(weights, total = 100) {
    if (!weights.length) {
      return [];
    }
    const SUM = weights.reduce((sum, weight) => sum + weight, 0), EXACT = weights.map((weight) => SUM > 0 ? weight / SUM * total : total / weights.length), SHARES = EXACT.map(Math.floor), ORDER = EXACT.map((value, index) => ({ index, rest: value - SHARES[index] })).sort(
      (a, b) => b.rest - a.rest || a.index - b.index
    );
    const REMAINING = total - SHARES.reduce((sum, share) => sum + share, 0);
    for (let index = 0; index < REMAINING; index++) {
      SHARES[ORDER[index].index]++;
    }
    return SHARES;
  }
  function adjustBreedShare(weights, selectedIndex, value) {
    if (weights.length <= 1) {
      return weights.map(() => 100);
    }
    const SELECTED = Math.max(0, Math.min(100, Math.round(value))), OTHER_SHARES = apportionBreedShares(
      weights.filter((_, index) => index !== selectedIndex),
      100 - SELECTED
    );
    OTHER_SHARES.splice(selectedIndex, 0, SELECTED);
    return OTHER_SHARES;
  }

  // src/farm-app.js
  init_species_catalog();

  // src/help-scenes.js
  var HELP_PLAYBACK_RATE = 0.5;
  var HELP_MAX_FRAME_MS = 40;
  var HELP_SCENES = Object.freeze([
    Object.freeze({
      id: "breed",
      title: "먹이와 번식",
      rule: "일꾼이 곡식 더미를 쳐서 낟알을 만들고, 성체 두 마리가 하나씩 먹으면 새끼가 태어나요. 슬라이더로 번식과 먹이 일꾼의 비율을 정해요.",
      seed: 731,
      rate: 4,
      durationMs: 2e4,
      setup(world) {
        world.setWorkBasisPoints(5e3);
        world.setBreedWeights(null);
      },
      timeline: [],
      step(world) {
        if (world.units.length > 6) {
          return "born";
        }
        return world.food.length > 0 ? "food" : "work";
      },
      steps: {
        work: "일꾼 3마리가 곡식 더미를 쳐요",
        food: "낟알이 떨어졌어요. 번식 3마리가 먹어요",
        born: "먹은 두 마리가 번식해 새끼가 태어났어요"
      }
    }),
    Object.freeze({
      id: "merge",
      title: "합성",
      rule: "합성 버튼을 누를 때마다 가장 낮은 등급의 같은 병종부터 한 번 합쳐요. 재료는 T2 = T1 2마리, T3 = T2 2마리, T4 = T3 3마리, T5 = T4 4마리, T6 = T5 5마리예요.",
      seed: 4102,
      rate: 1,
      durationMs: 5e3,
      setup(world) {
        world.setWorkBasisPoints(0);
      },
      timeline: [
        { atMs: 500, cmd: "merge" },
        { atMs: 1e3, cmd: "merge" },
        { atMs: 1500, cmd: "merge" }
      ],
      step(world) {
        if (world.units.some((unit2) => unit2.tier >= 2)) {
          return "done";
        }
        return world.mergeTask ? "merging" : "start";
      },
      steps: {
        start: "같은 병종 성체가 여럿 있어요",
        merging: "합성을 누르면 두 마리가 모여요",
        done: "한 등급 위가 됐어요. 체력과 공격력이 커져요"
      }
    }),
    Object.freeze({
      id: "tower",
      title: "보스와 탑",
      rule: "탑 오르기를 누르면 보스가 떨어져요. 병력이 사방에서 자동으로 투입돼 싸우고, 이기면 다음 층의 선택지가 나와요. 강화 층에서 카드를 고르면 이번 도전 동안 병력이 강해져요. 이긴 보스 종의 숙련이 쌓여 능력 포인트가 돼요.",
      seed: 4104,
      rate: 4,
      durationMs: 6e4,
      setup(world) {
        world.setWorkBasisPoints(0);
        for (let index = 0; index < 50; index++) {
          const ANGLE = index * 2.399963229728653;
          world.spawn(
            index % 6,
            1 + index % 4,
            Math.cos(ANGLE) * (20 + index),
            Math.sin(ANGLE) * (14 + index * 0.6)
          );
        }
      },
      timeline: [{ atMs: 100, cmd: "tower-start", args: { floor: 1 } }],
      // The army drops in by itself; once the real win opens the doors, the demo picks the first one after a beat,
      // then ends.
      auto(world, timeMs, memo) {
        if (world.tower.floor > 1) {
          memo.doneAt ??= timeMs;
          return { complete: timeMs - memo.doneAt > 1200 };
        }
        if (world.tower.doors?.length) {
          memo.doorsAt ??= timeMs;
          if (timeMs - memo.doorsAt > 1200 && !memo.picked) {
            memo.picked = true;
            return { pick: 0 };
          }
        }
        return null;
      },
      step(world) {
        if (world.tower.floor > 1) {
          return "next";
        }
        const PHASE = world.farmBossEvent.phase;
        if (PHASE === "marching") {
          return "march";
        }
        if (PHASE === "dropping") {
          return "drop";
        }
        if (world.tower.doors?.length) {
          return "doors";
        }
        if (PHASE === "fighting") {
          return world.fieldFighterCount > 0 ? "fight" : "drop";
        }
        return PHASE === "idle" && world.tower.floor === 0 ? "start" : "win";
      },
      steps: {
        start: "탑 오르기를 누르면 병력이 탑으로 향해요",
        march: "병력이 탑으로 올라가요",
        drop: "보스가 떨어져요. 병력이 사방에서 들어와요",
        fight: "수십 마리가 자동으로 보스와 싸워요",
        win: "보스를 쓰러뜨렸어요",
        doors: "이겼어요. 다음 층의 선택지를 골라요",
        next: "고른 대로 다음 층이 이어져요. 강화 카드는 도전이 끝날 때까지 유지돼요"
      }
    })
  ]);
  function helpSceneById(id) {
    return HELP_SCENES.find((scene) => scene.id === id) ?? null;
  }

  // src/help-panel.js
  var LOAD_TIMEOUT_MS = 15e3;
  var MAX_HEIGHT_SHARE = 0.5;
  var LOOP_PAUSE_MS = 1500;
  function readSnapshot(frame2) {
    try {
      return frame2.contentWindow?.__budmoriHelp?.snapshot() ?? null;
    } catch {
      return null;
    }
  }
  function createHelpPanel(dollar) {
    const DEMO = dollar("helpDemo"), CAPTION = dollar("helpCaption"), TITLE = dollar("helpTitle"), RULE = dollar("helpRule"), DOTS = dollar("helpDots"), PREV = dollar("helpPrev"), NEXT = dollar("helpNext");
    let index = 0, frame2 = null, watch = 0, visible = false, startedAt = 0, endedAt = 0;
    function unmount() {
      cancelAnimationFrame(watch);
      watch = 0;
      frame2?.remove();
      frame2 = null;
    }
    function observe() {
      if (!frame2) {
        return;
      }
      const SNAPSHOT = readSnapshot(frame2);
      if (SNAPSHOT) {
        CAPTION.textContent = HELP_SCENES[index].steps[SNAPSHOT.step] ?? "";
        if (SNAPSHOT.state !== "ended") {
          endedAt = 0;
        } else if (endedAt === 0) {
          endedAt = performance.now();
        } else if (performance.now() - endedAt > LOOP_PAUSE_MS) {
          mount();
          return;
        }
      } else if (performance.now() - startedAt > LOAD_TIMEOUT_MS) {
        CAPTION.textContent = "데모를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요";
        return;
      }
      watch = requestAnimationFrame(observe);
    }
    function fit() {
      const PANEL = dollar("helpPanel"), WIDTH = window.innerWidth, HEIGHT = window.innerHeight, AVAILABLE_WIDTH = Math.max(120, PANEL.clientWidth - 2 * parseFloat(getComputedStyle(PANEL).paddingLeft)), SCALE = Math.min(1, AVAILABLE_WIDTH / WIDTH, HEIGHT * MAX_HEIGHT_SHARE / HEIGHT);
      DEMO.style.width = `${Math.round(WIDTH * SCALE)}px`;
      DEMO.style.height = `${Math.round(HEIGHT * SCALE)}px`;
      if (frame2) {
        frame2.style.width = `${WIDTH}px`;
        frame2.style.height = `${HEIGHT}px`;
        frame2.style.transform = `scale(${SCALE})`;
      }
    }
    function mount() {
      unmount();
      if (!visible) {
        return;
      }
      const SCENE = HELP_SCENES[index];
      CAPTION.textContent = "불러오는 중이에요";
      endedAt = 0;
      startedAt = performance.now();
      frame2 = document.createElement("iframe");
      frame2.title = `${SCENE.title} 데모`;
      frame2.tabIndex = -1;
      frame2.src = new URL(`?help=${SCENE.id}`, location.href).href;
      DEMO.replaceChildren(frame2);
      fit();
      watch = requestAnimationFrame(observe);
    }
    function paintCard() {
      const SCENE = HELP_SCENES[index];
      TITLE.textContent = `${index + 1}/${HELP_SCENES.length} · ${SCENE.title}`;
      RULE.textContent = SCENE.rule;
      PREV.disabled = index === 0;
      NEXT.disabled = index === HELP_SCENES.length - 1;
      for (const DOT of DOTS.children) {
        DOT.setAttribute("aria-current", String(Number(DOT.dataset.card) === index));
      }
    }
    function show(next) {
      index = Math.max(0, Math.min(HELP_SCENES.length - 1, next));
      paintCard();
      mount();
    }
    DOTS.replaceChildren(
      ...HELP_SCENES.map((scene, cardIndex) => {
        const DOT = document.createElement("button");
        DOT.type = "button";
        DOT.dataset.card = String(cardIndex);
        DOT.setAttribute("aria-label", scene.title);
        DOT.onclick = () => show(cardIndex);
        return DOT;
      })
    );
    PREV.onclick = () => show(index - 1);
    NEXT.onclick = () => show(index + 1);
    window.addEventListener("resize", () => visible && fit());
    new ResizeObserver(() => visible && fit()).observe(dollar("helpPanel"));
    paintCard();
    return {
      setVisible(value) {
        if (visible === value) {
          return;
        }
        visible = value;
        if (visible) {
          mount();
        } else {
          unmount();
        }
      }
    };
  }

  // src/farm-app.js
  var DOLLAR2 = (id) => document.getElementById(id);
  var STORAGE = new FarmStorage();
  STORAGE.initializeIncompatible(new GARDEN());
  var HELP_PANEL = createHelpPanel(DOLLAR2);
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
  var handKey = "";
  var farmSortTransition = null;
  var farmPanelRevision = -1;
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
  var RELIC_DOCK = new RelicDock();
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
  var BOSS_REWARD_CHEST_TIERS = ["wood", "iron", "gold", "magic", "jade"];
  function bossRewardChestTier(receipt) {
    if (!receipt.stage) {
      return "wood";
    }
    return BOSS_REWARD_CHEST_TIERS[(receipt.stage - 1) % BOSS_REWARD_CHEST_TIERS.length];
  }
  function bossRewardMasteryLine(receipt) {
    if (!receipt.xpAmount || !receipt.species) {
      return "";
    }
    const LEVEL_UP = receipt.pointsAwarded > 0 ? " · 숙련 포인트 +" + receipt.pointsAwarded : "";
    return speciesById(receipt.species).name + " 숙련 +" + receipt.xpAmount + " XP" + LEVEL_UP;
  }
  function renderBossRewardBoxes(receipt) {
    DOLLAR2("bossRewardChest").dataset.tier = bossRewardChestTier(receipt);
    const COUNT = receipt.boxCount || 0, REVEALED = receipt.revealedCount || 0, BOXES = receipt.boxes || [], HAS_PRESENTATION = BOXES.length === COUNT, PAYOUTS = receipt.calculation?.payouts || BOXES.map((box) => box.payout), MIN = PAYOUTS.length ? Math.min(...PAYOUTS) : 0, MAX = PAYOUTS.length ? Math.max(...PAYOUTS) : 0, FIRST_CLEAR = receipt.firstClear === true, NOMINAL_CHANCE = receipt.baselineChance ?? 0.1, CUMULATIVE = BOXES.slice(0, REVEALED).reduce((sum, box) => sum + (box.hit ? box.payout : 0), 0), PROCESSED = receipt.calculation?.jobState?.processedTrials ?? 0;
    DOLLAR2("bossRewardStage").textContent = receipt.stage ? `보스 격파 · ${receipt.stage}층` : "보스 격파";
    DOLLAR2("bossRewardRibbon").hidden = !FIRST_CLEAR;
    DOLLAR2("bossRewardTitle").textContent = receipt.status === "calculating" ? "보상 준비 중" : "승리 보상";
    DOLLAR2("bossRewardSummary").textContent = receipt.status === "calculating" ? "상자 " + COUNT + "개의 보상을 준비하고 있어요." : FIRST_CLEAR ? "처음 만난 종이에요 · 동료로 합류해요" : HAS_PRESENTATION ? COUNT + "회 추첨 · 상자당 " + MIN + (MIN === MAX ? "" : "–" + MAX) + "마리 · 재도전 " + Math.round(NOMINAL_CHANCE * 100) + "% (편성 반영 " + Math.round(receipt.chance * 100) + "%)" : "이미 확정된 보상 합계";
    DOLLAR2("bossRewardTotals").textContent = receipt.status === "calculating" ? "추첨 계산 " + PROCESSED + "/" + COUNT : [bossRewardMasteryLine(receipt), "현재 합계 " + CUMULATIVE + "마리 · " + bossRewardSummary(receipt)].filter(Boolean).join("\n");
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
  function syncBossRewardDialog(world, { receiptKey = null } = {}) {
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
    if (RECEIPT.status === "ready" && RECEIPT.revealedCount < RECEIPT.boxCount && !AUTO_OPENED_BOSS_REWARDS.has(RECEIPT.receiptKey)) {
      showBossRewardDialog(RECEIPT, { auto: true });
    } else if (!DIALOG.hidden && bossRewardDialogReceiptKey === RECEIPT.receiptKey) {
      renderBossRewardBoxes(RECEIPT);
    }
    stopBossRewardCalculation();
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
  var FAIL2 = (error) => {
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
    return OK;
  }
  var AUTOSAVE = new FarmAutosave(() => writeCheckpoint());
  function replacePersonalGarden(world) {
    unsubscribeProgress?.();
    personalGarden = world;
    unsubscribeProgress = world?.onProgressChanged.on(() => AUTOSAVE.markDirty()) ?? null;
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
  var FOOD_FEEL = new FoodFeel();
  var COMBAT_FEEL = new CombatFeel(FOOD_FEEL);
  var WORK_STORAGE_KEY = "budmori.work.basisPoints";
  function loadWorkSetting(fallback) {
    try {
      const RAW = localStorage.getItem(WORK_STORAGE_KEY), VALUE = Number(RAW);
      return RAW !== null && Number.isSafeInteger(VALUE) && VALUE >= 0 && VALUE <= 1e4 ? VALUE : fallback;
    } catch {
      return fallback;
    }
  }
  var BREED_WEIGHTS_KEY = "budmori.breed.weights";
  function loadBreedWeights(world) {
    try {
      world.setBreedWeights(JSON.parse(localStorage.getItem(BREED_WEIGHTS_KEY) || "null"));
    } catch {
    }
  }
  function saveBreedWeights(world) {
    try {
      localStorage.setItem(BREED_WEIGHTS_KEY, JSON.stringify(world.breedWeights));
    } catch {
    }
  }
  function saveWorkSetting(value) {
    try {
      localStorage.setItem(WORK_STORAGE_KEY, String(value));
    } catch {
    }
  }
  function plannedWorkers(world) {
    const COUNTS = /* @__PURE__ */ new Map();
    let total = 0;
    for (const UNIT3 of world.units) {
      if (!UNIT3.isBattleOnlySummon && !UNIT3.isFormationClone) {
        COUNTS.set(UNIT3.species, (COUNTS.get(UNIT3.species) || 0) + 1);
        total++;
      }
    }
    let workers = 0;
    for (const COUNT of workersBySpecies(COUNTS, world.workBasisPoints / 1e4, world.breedWeights).values()) {
      workers += COUNT;
    }
    return { total, workers };
  }
  function workCut(world) {
    return Math.round((100 - world.workBasisPoints / 100) / 5) * 5;
  }
  function install(world) {
    if (active) {
      stopWorldInput();
      cancelFarmSortTransition();
    }
    active?.dispose();
    RENDERER.resetPan();
    active = new FarmSession(world, {
      onError: FAIL2
    });
    world.setWorkBasisPoints(loadWorkSetting(world.workBasisPoints));
    loadBreedWeights(world);
    loadDeployOrder(world);
    return active;
  }
  install(new GARDEN());
  active.paused = true;
  function raidStartBlockReason() {
    if (!personalGarden) {
      return "내 정원에서만 보스에 도전할 수 있어요.";
    }
    if (personalGarden.farmBossEvent?.phase !== "idle") {
      return "이미 전투 중이에요.";
    }
    if (!personalGarden.units.some((unit2) => !unit2.isBattleOnlySummon && unit2.hp > 0)) {
      return "싸울 유닛이 없어요. 유닛을 먼저 키워 주세요.";
    }
    return "";
  }
  function say(text) {
    const NOTICE = DOLLAR2("farmNotice");
    NOTICE.textContent = text;
    NOTICE.hidden = false;
    clearTimeout(say.timer);
    say.timer = setTimeout(() => {
      NOTICE.hidden = true;
    }, 4e3);
  }
  function refreshStart() {
    DOLLAR2("continueGame").disabled = !STORAGE.hasWorld;
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
    }
    home = value;
    document.body.dataset.home = String(value);
    DOLLAR2("startScreen").hidden = !value;
    active.paused = value;
    if (push) {
      history.pushState(null, "", value ? "#/" : "#/farm");
    }
    refreshStart();
    if (value) {
      DOLLAR2("continueGame").focus();
    }
  }
  var SEEN_KEY = "budmori.lastSeen";
  function markSeen() {
    try {
      localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {
    }
  }
  function readSeen() {
    try {
      const VALUE = Number(localStorage.getItem(SEEN_KEY));
      return Number.isFinite(VALUE) && VALUE > 0 ? VALUE : 0;
    } catch {
      return 0;
    }
  }
  function offlineText(summary) {
    const MINUTES = Math.floor(summary.seconds / 60), TIME = MINUTES >= 60 ? `${Math.floor(MINUTES / 60)}시간 ${MINUTES % 60}분` : `${MINUTES}분`, PARTS = [];
    if (summary.births) {
      PARTS.push(`새 식구 ${summary.births}마리`);
    }
    if (summary.food) {
      PARTS.push(`먹이 ${summary.food}`);
    }
    return `${TIME} 동안 자리를 비웠어요${PARTS.length ? " · " + PARTS.join(" · ") : ""}`;
  }
  function settleOffline() {
    const SEEN = readSeen();
    markSeen();
    const WORLD = personalGarden;
    if (!SEEN || !WORLD || WORLD.scene !== "farm") {
      return;
    }
    const SUMMARY = WORLD.settleOffline((Date.now() - SEEN) / 1e3);
    if (SUMMARY) {
      const NOTICE = DOLLAR2("offlineNotice");
      NOTICE.textContent = offlineText(SUMMARY);
      NOTICE.hidden = false;
      clearTimeout(settleOffline.timer);
      settleOffline.timer = setTimeout(() => {
        NOTICE.hidden = true;
      }, 9e3);
    }
  }
  setInterval(() => {
    if (!document.hidden && !home) {
      markSeen();
    }
  }, 5e3);
  function start(world, push = true, settle = false) {
    AUTOSAVE.reset();
    FOOD_FEEL.unlock();
    replacePersonalGarden(world);
    install(world);
    setHome(false, push);
    if (settle) {
      settleOffline();
    } else {
      markSeen();
    }
  }
  function beginChallenge() {
    const REASON = raidStartBlockReason();
    if (REASON !== "") {
      say(REASON);
      return;
    }
    if (ownedCounts(personalGarden).size < 2) {
      climb();
      return;
    }
    openDeck();
  }
  function climb() {
    if (personalGarden.startTower(startFloorValue(personalGarden))) {
      active.paused = false;
      active.loop.resetTiming();
    }
  }
  var deckOrder = [];
  var deckPicked = -1;
  function paintDeck() {
    const COUNTS = ownedCounts(personalGarden), OWNED = deckOrder.filter((id) => COUNTS.has(id));
    DOLLAR2("deckCards").innerHTML = OWNED.map((id, slot) => deckCardHtml(id, COUNTS.get(id), slot + 1)).join("");
    for (const BUTTON of DOLLAR2("deckCards").children) {
      BUTTON.setAttribute("aria-pressed", String(Number(BUTTON.dataset.deploy) === deckPicked));
    }
  }
  function openDeck() {
    deckOrder = [...personalGarden.deployOrder];
    deckPicked = -1;
    paintDeck();
    DOLLAR2("deckDialog").hidden = false;
  }
  DOLLAR2("deckClose").onclick = () => {
    DOLLAR2("deckDialog").hidden = true;
  };
  DOLLAR2("deckGo").onclick = () => {
    DOLLAR2("deckDialog").hidden = true;
    personalGarden.setDeployOrder(deckOrder);
    saveDeployOrder(deckOrder);
    climb();
  };
  DOLLAR2("deckCards").addEventListener("click", (e) => {
    const BUTTON = e.target.closest("[data-deploy]");
    if (!BUTTON) {
      return;
    }
    const ID = Number(BUTTON.dataset.deploy);
    if (deckPicked < 0 || deckPicked === ID) {
      deckPicked = deckPicked === ID ? -1 : ID;
    } else {
      const FROM = deckOrder.indexOf(deckPicked), TO = deckOrder.indexOf(ID);
      [deckOrder[FROM], deckOrder[TO]] = [deckOrder[TO], deckOrder[FROM]];
      deckPicked = -1;
    }
    paintDeck();
  });
  DOLLAR2("continueGame").onclick = () => {
    if (STORAGE.world) {
      start(restore(snapshot(STORAGE.world)), true, true);
    }
  };
  DOLLAR2("fightRetreat").onclick = () => {
    personalGarden?.retreatFromFight();
  };
  DOLLAR2("bossChallenge").onclick = beginChallenge;
  var startFloorChoice = 0;
  function startFloorValue(garden) {
    const BEST = Math.max(1, garden.playerProgression.towerBest);
    return startFloorChoice >= 1 && startFloorChoice <= BEST ? startFloorChoice : BEST;
  }
  DOLLAR2("startFloor").oninput = (e) => {
    startFloorChoice = Number(e.target.value);
    paintRange(e.target);
  };
  DOLLAR2("doorCards").addEventListener("click", (e) => {
    const BUTTON = e.target.closest("[data-door]");
    if (BUTTON) {
      personalGarden?.chooseDoor(Number(BUTTON.dataset.door));
    }
  });
  DOLLAR2("towerLeave").onclick = () => {
    personalGarden?.leaveTower();
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
  var mergeHold = null;
  function stopMergeHold() {
    if (mergeHold) {
      clearTimeout(mergeHold.delay);
      clearInterval(mergeHold.repeat);
      mergeHold = null;
    }
  }
  DOLLAR2("merge").addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || DOLLAR2("merge").disabled) {
      return;
    }
    stopMergeHold();
    active?.queue("merge");
    const HOLD = mergeHold = { delay: 0, repeat: 0 };
    HOLD.delay = setTimeout(() => {
      HOLD.repeat = setInterval(() => active?.queue("merge"), 100);
    }, 350);
  });
  for (const EVENT of ["pointerup", "pointercancel", "pointerleave"]) {
    DOLLAR2("merge").addEventListener(EVENT, stopMergeHold);
  }
  window.addEventListener("blur", stopMergeHold);
  DOLLAR2("merge").onclick = (e) => {
    if (e.detail === 0) {
      active?.queue("merge");
    }
  };
  DOLLAR2("merge").addEventListener("keydown", (e) => {
    if (e.repeat && ["Enter", " "].includes(e.key)) {
      e.preventDefault();
    }
  });
  var BREED_CONTROL = { selected: null, idsKey: "", world: null, sourceKey: "", basis: [] };
  function speciesCounts(world) {
    const COUNTS = /* @__PURE__ */ new Map();
    for (const UNIT3 of world.units) {
      if (!UNIT3.isBattleOnlySummon && !UNIT3.isFormationClone) {
        COUNTS.set(UNIT3.species, (COUNTS.get(UNIT3.species) || 0) + 1);
      }
    }
    return COUNTS;
  }
  function breedControlState(world) {
    const COUNTS = speciesCounts(world), IDS = [...COUNTS.keys()].sort((x, y) => x - y), WEIGHTS = IDS.map((id) => world.breedWeights ? world.breedWeights[id] || 0 : COUNTS.get(id)), SOURCE_KEY = WEIGHTS.join(","), IDS_KEY = IDS.join(",");
    if (BREED_CONTROL.world !== world || BREED_CONTROL.idsKey !== IDS_KEY || BREED_CONTROL.sourceKey !== SOURCE_KEY) {
      BREED_CONTROL.world = world;
      BREED_CONTROL.basis = WEIGHTS;
      BREED_CONTROL.sourceKey = SOURCE_KEY;
    }
    if (!IDS.includes(BREED_CONTROL.selected)) {
      BREED_CONTROL.selected = IDS[0] ?? null;
    }
    return { counts: COUNTS, ids: IDS, weights: WEIGHTS, shares: apportionBreedShares(WEIGHTS), idsKey: IDS_KEY };
  }
  function drawSpeciesRoles(world) {
    const STATE = breedControlState(world), HOST = DOLLAR2("speciesRoles");
    if (BREED_CONTROL.idsKey !== STATE.idsKey) {
      BREED_CONTROL.idsKey = STATE.idsKey;
      HOST.innerHTML = STATE.ids.map((id) => {
        const SPECIES = speciesById(id);
        return `<button type="button" class="breed-chip" data-breed-species="${id}" aria-pressed="false"><img src="./assets/troops/${SPECIES.asset}" alt="" width="36" height="36"><span>${SPECIES.name}</span><b data-breed-percent></b></button>`;
      }).join("");
    }
    STATE.ids.forEach((id, index) => {
      const CHIP = HOST.querySelector(`[data-breed-species="${id}"]`), SELECTED = id === BREED_CONTROL.selected;
      CHIP.setAttribute("aria-pressed", String(SELECTED));
      CHIP.querySelector("[data-breed-percent]").textContent = `${STATE.shares[index]}%`;
    });
    const INDEX = STATE.ids.indexOf(BREED_CONTROL.selected), SHARE = STATE.shares[INDEX] ?? 0, RANGE = DOLLAR2("speciesBreedShare"), DISABLED = STATE.ids.length < 2;
    DOLLAR2("speciesBreedLabel").textContent = INDEX < 0 ? "병종이 없어요" : `${speciesById(BREED_CONTROL.selected).name} 번식 몫`;
    DOLLAR2("speciesBreedValue").textContent = `${SHARE}%`;
    RANGE.value = String(SHARE);
    RANGE.disabled = DISABLED;
    RANGE.setAttribute("aria-valuetext", `${SHARE}%`);
    paintRange(RANGE);
    DOLLAR2("speciesBreedLess").disabled = DISABLED || SHARE === 0;
    DOLLAR2("speciesBreedMore").disabled = DISABLED || SHARE === 100;
    DOLLAR2("speciesBreedEqual").disabled = STATE.ids.length === 0;
    const WORKERS = workersBySpecies(STATE.counts, world.workBasisPoints / 1e4, world.breedWeights);
    DOLLAR2("speciesBreedPlan").textContent = INDEX < 0 ? "" : `배분 계획 · 번식 ${STATE.counts.get(BREED_CONTROL.selected) - WORKERS.get(BREED_CONTROL.selected)} · 먹이 ${WORKERS.get(BREED_CONTROL.selected)}`;
  }
  function applyBreedShares(world, ids, shares) {
    const WEIGHTS = new Array(Math.max(...ids) + 1).fill(0);
    ids.forEach((id, index) => {
      WEIGHTS[id] = shares[index];
    });
    if (!world.setBreedWeights(WEIGHTS)) {
      return;
    }
    BREED_CONTROL.sourceKey = shares.join(",");
    saveBreedWeights(world);
    active.queue("farm-breed-weights", { weights: WEIGHTS });
    drawSpeciesRoles(world);
  }
  function changeBreedShare(value) {
    const WORLD = personalGarden || active?.world;
    if (!WORLD) {
      return;
    }
    const STATE = breedControlState(WORLD), INDEX = STATE.ids.indexOf(BREED_CONTROL.selected);
    if (STATE.ids.length < 2 || Number(value) === STATE.shares[INDEX]) {
      return;
    }
    applyBreedShares(WORLD, STATE.ids, adjustBreedShare(BREED_CONTROL.basis, INDEX, Number(value)));
  }
  DOLLAR2("speciesRoles").addEventListener("click", (event) => {
    const CHIP = event.target.closest("[data-breed-species]"), WORLD = personalGarden || active?.world;
    if (!CHIP || !WORLD || Number(CHIP.dataset.breedSpecies) === BREED_CONTROL.selected) {
      return;
    }
    const STATE = breedControlState(WORLD);
    BREED_CONTROL.selected = Number(CHIP.dataset.breedSpecies);
    BREED_CONTROL.basis = STATE.weights;
    drawSpeciesRoles(WORLD);
  });
  DOLLAR2("speciesBreedShare").addEventListener("input", (event) => changeBreedShare(event.target.value));
  DOLLAR2("speciesBreedLess").addEventListener(
    "click",
    () => changeBreedShare(Number(DOLLAR2("speciesBreedShare").value) - 1)
  );
  DOLLAR2("speciesBreedMore").addEventListener(
    "click",
    () => changeBreedShare(Number(DOLLAR2("speciesBreedShare").value) + 1)
  );
  DOLLAR2("speciesBreedEqual").addEventListener("click", () => {
    const WORLD = personalGarden || active?.world;
    if (!WORLD) {
      return;
    }
    const STATE = breedControlState(WORLD);
    if (!STATE.ids.length) {
      return;
    }
    BREED_CONTROL.basis = STATE.ids.map(() => 1);
    applyBreedShares(WORLD, STATE.ids, apportionBreedShares(BREED_CONTROL.basis));
  });
  function drawRewardQueue(world) {
    const QUEUE = bossRewardQueueBySpecies(world), BOX = DOLLAR2("farmQueue"), HTML = QUEUE.map(
      ([species, count]) => `<span class="farm-queue__chip"><img src="./assets/troops/${speciesById(species).asset}" alt="${speciesById(species).name}" width="20" height="20"><b>${count}</b></span>`
    ).join("");
    BOX.hidden = QUEUE.length === 0;
    if (BOX.innerHTML !== HTML) {
      BOX.innerHTML = HTML;
    }
  }
  function drawFarmPanel() {
    const W = personalGarden || active?.world;
    if (!W || farmPanelRevision === W.progressRevision) {
      return;
    }
    farmPanelRevision = W.progressRevision;
    const LOCKED = !!farmSortTransition || active?.world?.scene !== "farm" || W.farmBossEvent?.phase !== "idle";
    DOLLAR2("farmStatPlaced").textContent = String(W.ownedPopulation);
    DOLLAR2("farmStatCapacity").textContent = `/ ${W.capacity}`;
    DOLLAR2("farmStatPending").textContent = String(W.pendingRewardPopulation);
    drawRewardQueue(W);
    syncFlag("farmLockNote", "hidden", !LOCKED || !!farmSortTransition);
    drawSpeciesRoles(W);
    for (const BUTTON of DOLLAR2("farmPlotActions").querySelectorAll("[data-farm-sort]")) {
      BUTTON.disabled = LOCKED;
    }
  }
  function drawAbilityTree() {
    const W = personalGarden || active.world, IN_COMBAT = W.farmBossEvent?.phase !== "idle";
    const SELECTED_SPECIES = Number(DOLLAR2("abilityPanel").dataset.selectedSpecies || 0);
    const MASTERY_DEFINITION = SPECIES_ABILITY_DEFINITIONS.find(
      (definition) => definition.species === SELECTED_SPECIES
    );
    DOLLAR2("abilityPoints").textContent = String(
      MASTERY_DEFINITION ? getAbilityPointsLeft(W.playerProgression, MASTERY_DEFINITION.id) : 0
    );
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
    if (menuTab === "abilities") {
      return { type: "abilities", speciesId: Number(DOLLAR2("abilityPanel").dataset.selectedSpecies || 0) };
    }
    return null;
  }
  function renderProgressionResetActions() {
    const HOST = DOLLAR2("progressionResetActions"), CURRENT = DOLLAR2("progressionResetCurrent"), ALL = DOLLAR2("progressionResetAll");
    if (!active || !menuOpen || menuTab !== "abilities") {
      HOST.hidden = true;
      return;
    }
    const W = personalGarden || active.world, IN_COMBAT = W.farmBossEvent?.phase !== "idle", CONTEXT = { location: active.world.scene, inCombat: IN_COMBAT }, SCOPE = currentProgressionResetScope(), CURRENT_CHECK = canResetPlayerProgression(W.playerProgression, SCOPE, CONTEXT), ALL_CHECK = canResetPlayerProgression(W.playerProgression, { type: "all" }, CONTEXT), LABEL = "이 종 특성 초기화";
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
    abilities: "#/abilities",
    help: "#/help"
  };
  var ROUTE_MENU_TAB = (route2) => Object.keys(MENU_ROUTES).find((tab) => MENU_ROUTES[tab] === route2) || "play";
  function applyMenuTab(tab) {
    menuTab = tab;
    const UPGRADES = ["farms", "abilities"].includes(tab);
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
    HELP_PANEL.setVisible(menuOpen && tab === "help");
    for (const [NAME, ID] of [
      ["play", "menuPlayPanel"],
      ["farms", "farmPanel"],
      ["abilities", "abilityPanel"],
      ["help", "helpPanel"]
    ]) {
      DOLLAR2(ID).hidden = NAME !== tab;
    }
    if (tab === "farms") {
      farmPanelRevision = -1;
      drawFarmPanel();
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
    HELP_PANEL.setVisible(false);
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
      history.pushState(null, "", "#/farm");
    }
    DOLLAR2(
      ["farms", "abilities"].includes(menuTab) ? "upgradeMenu" : menuTab === "help" ? "helpMenu" : "gameMenu"
    ).focus();
  }
  DOLLAR2("gameMenu").onclick = () => menuOpen && menuTab === "play" ? closeMenu() : openMenu();
  DOLLAR2("upgradeMenu").onclick = () => openMenu("abilities");
  DOLLAR2("helpMenu").onclick = () => openMenu("help");
  DOLLAR2("gameMenuClose").onclick = () => closeMenu();
  DOLLAR2("gameMenuTabs").onclick = (e) => {
    const BUTTON = e.target.closest("[data-menu-tab]");
    if (BUTTON && !BUTTON.disabled) {
      switchMenuTab(BUTTON.dataset.menuTab);
    }
  };
  DOLLAR2("farmPlotActions").addEventListener("click", (e) => {
    const BUTTON = e.target.closest("[data-farm-sort]");
    if (BUTTON) {
      beginFarmSortTransition(BUTTON.dataset.farmSort);
    }
  });
  function paintRange(node) {
    const RANGE = Number(node.max) - Number(node.min) || 1;
    node.style.setProperty("--fill", `${(Number(node.value) - Number(node.min)) / RANGE * 100}%`);
  }
  var workSliderHeld = false;
  DOLLAR2("workCutA").addEventListener("pointerdown", () => {
    workSliderHeld = true;
  });
  for (const EVENT of ["pointerup", "pointercancel"]) {
    window.addEventListener(EVENT, () => {
      workSliderHeld = false;
    });
  }
  DOLLAR2("workCutA").addEventListener("input", () => {
    paintRange(DOLLAR2("workCutA"));
    const CUT = Number(DOLLAR2("workCutA").value), POINTS = (100 - CUT) * 100;
    saveWorkSetting(POINTS);
    (personalGarden || active.world).setWorkBasisPoints(POINTS);
    active.queue("farm-work", { basisPoints: POINTS });
    farmPanelRevision = -1;
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
  document.addEventListener("contextmenu", (event) => {
    if (!event.target.closest?.("input, textarea")) {
      event.preventDefault();
    }
  });
  var FLOOR_KIND = { battle: "전투", elite: "정예", mid: "중간 보스", power: "강화", event: "이벤트" };
  var DOOR_TEXT = {
    battle: "보스 한 마리",
    elite: "더 세지만 보상 ×2",
    mid: "피할 수 없어요 · 보상 ×3"
  };
  var NEXT_FLOOR_TEXT = {
    battle: "전투 준비 · 싸울 상대를 고르세요",
    mid: "중간 보스 · 피할 수 없어요",
    power: "강화 · 카드 한 장을 고르세요",
    event: "이벤트"
  };
  function statDoorCard(door, cards, index) {
    const CARD = statCard(door.id);
    return `<button type="button" class="door door--stat door--rarity-${door.rarity}" data-door="${index}"><b>${CARD.name} ${statCardText(CARD, door.rarity)}</b><small>${RARITY_NAMES[door.rarity]} · 모든 유닛 · ${cardStacks(cards, door.id)}/${TOWER_RUN_SETTINGS.cardCap}장</small></button>`;
  }
  function passiveDoorCard(door, cards, index) {
    const CARD = passiveCard(door.id);
    return `<button type="button" class="door door--passive door--rarity-${door.rarity}" data-door="${index}"><b>${CARD.name}</b><small>${RARITY_NAMES[door.rarity]} · ${CARD.text(CARD.values[door.rarity])} · ${cardStacks(cards, door.id)}/${TOWER_RUN_SETTINGS.cardCap}장</small></button>`;
  }
  function skillDoorCard(tower, door, index) {
    const DEFINITION13 = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === door.id), LEVEL = tower.relics.get(door.id) || 0, VALUE = Math.round(formationUpgradeValue(DEFINITION13, LEVEL + 1) * 10) / 10, GAIN = LEVEL ? `Lv.${LEVEL} → ${LEVEL + 1}` : "새 스킬";
    return `<button type="button" class="door door--skill" data-door="${index}"><b>${RELIC_ICONS[door.id]} ${DEFINITION13.name}</b><small>${GAIN} · ${DEFINITION13.description || ""}${LEVEL ? ` (→ ${VALUE}${DEFINITION13.upgradeUnit})` : ""}</small></button>`;
  }
  function eventDoorCard(door, index) {
    const EVENT = TOWER_EVENTS.find((item) => item.id === door.id);
    return `<button type="button" class="door door--event" data-door="${index}"><b>${EVENT.name}</b><small>${EVENT.text}</small></button>`;
  }
  function doorCard(tower, door, index) {
    if (door.type === "fight") {
      return `<button type="button" class="door door--${door.kind}" data-door="${index}"><b>${FLOOR_KIND[door.kind]}</b><small>${DOOR_TEXT[door.kind]}</small></button>`;
    }
    if (door.type === "stat") {
      return statDoorCard(door, tower.cards, index);
    }
    if (door.type === "passive") {
      return passiveDoorCard(door, tower.cards, index);
    }
    return door.type === "skill" ? skillDoorCard(tower, door, index) : eventDoorCard(door, index);
  }
  var bannerKey = "";
  var bannerTimer = 0;
  var doorKey = "";
  var tintFloor = -1;
  function syncTower(garden, home2, event) {
    const T = garden.tower, CLIMBING = T.active && !home2, BEST = garden.playerProgression.towerBest;
    const TINT = DOLLAR2("towerTint");
    if (TINT.dataset.on !== String(CLIMBING)) {
      TINT.dataset.on = String(CLIMBING);
    }
    if (CLIMBING && tintFloor !== T.floor) {
      tintFloor = T.floor;
      TINT.style.setProperty("--floor", String(T.floor));
    }
    const SLEEPERS = T.sleepUntil.size;
    syncFlag("floorChip", "hidden", !CLIMBING);
    if (CLIMBING) {
      syncText("floorNow", `${T.floor}층 · ${FLOOR_KIND[T.kind]}`);
    }
    const NEXT_BANNER = !CLIMBING ? "" : (T.kind === "power" || T.kind === "event") && T.doors.length ? `r${T.floor}` : event?.phase === "dropping" ? `e${event.encounterId}` : "";
    if (NEXT_BANNER && NEXT_BANNER !== bannerKey) {
      DOLLAR2("floorBannerNum").textContent = `${T.floor}층`;
      DOLLAR2("floorBannerKind").textContent = FLOOR_KIND[T.kind];
      const BANNER = DOLLAR2("floorBanner");
      BANNER.hidden = false;
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => {
        BANNER.hidden = true;
      }, 1500);
    }
    if (NEXT_BANNER !== "" || !CLIMBING) {
      bannerKey = NEXT_BANNER;
    }
    const DOORS = CLIMBING && event?.phase === "idle" && T.doors.length > 0;
    syncFlag("towerDoors", "hidden", !DOORS);
    if (DOORS) {
      const KEY2 = `${JSON.stringify(T.doors)}|${T.floor}|${SLEEPERS}|${T.cards.length}|${T.relics.size}`;
      if (KEY2 !== doorKey) {
        doorKey = KEY2;
        DOLLAR2("doorCards").innerHTML = T.doors.map((door, i) => doorCard(T, door, i)).join("");
      }
      syncText("doorsTitle", `${T.floor + 1}층 ${NEXT_FLOOR_TEXT[T.nextKind]}`);
      syncText("doorsNote", `${T.floor}층 돌파 · 잠든 병력 ${SLEEPERS}마리 · 강화 카드 ${T.cards.length}장`);
    } else {
      doorKey = "";
    }
    const RESULT = !T.active && T.floor > 0 && !home2 && event?.phase === "idle";
    syncFlag("towerResult", "hidden", !RESULT);
    syncText("towerResult", `지난 도전 ${T.floor}층${T.record ? " · 새 기록!" : ""} · 최고 ${BEST}층`);
  }
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
  function fightActive() {
    return ["dropping", "fighting"].includes(active?.world.farmBossEvent?.phase);
  }
  var DEPLOY_ORDER_KEY = "budmori.deploy.order";
  function loadDeployOrder(world) {
    try {
      world.setDeployOrder(JSON.parse(localStorage.getItem(DEPLOY_ORDER_KEY) || "null"));
    } catch {
    }
  }
  function saveDeployOrder(order) {
    try {
      localStorage.setItem(DEPLOY_ORDER_KEY, JSON.stringify(order));
    } catch {
    }
  }
  function deckCardHtml(id, count, slot) {
    const SPECIES = speciesById(id);
    return `<button type="button" class="deck-card" data-deploy="${id}" aria-label="${slot}번 ${SPECIES.name}"><i>${slot}</i><img src="./assets/troops/${SPECIES.asset}" alt="" width="40" height="40" draggable="false"><b>×${count}</b></button>`;
  }
  function ownedCounts(garden) {
    const COUNTS = /* @__PURE__ */ new Map();
    for (const UNIT3 of garden.units) {
      if (UNIT3.faction === "player" && !UNIT3.isBattleOnlySummon && UNIT3.hp > 0) {
        COUNTS.set(UNIT3.species, (COUNTS.get(UNIT3.species) || 0) + 1);
      }
    }
    return COUNTS;
  }
  function syncHand(garden, visible) {
    const COUNTS = visible ? garden.handCounts : /* @__PURE__ */ new Map(), IDS = garden.deployOrder.filter((id) => COUNTS.has(id)), KEY2 = IDS.map((id) => `${id}x${COUNTS.get(id)}`).join(",");
    syncFlag("hand", "hidden", !visible || IDS.length < 2);
    if (KEY2 !== handKey) {
      handKey = KEY2;
      DOLLAR2("handCards").innerHTML = IDS.map((id, slot) => deckCardHtml(id, COUNTS.get(id), slot + 1)).join("");
    }
  }
  DOLLAR2("handCards").addEventListener("click", (e) => {
    const BUTTON = e.target.closest("[data-deploy]");
    if (BUTTON) {
      const FIRST = Number(BUTTON.dataset.deploy), ORDER = [FIRST, ...personalGarden.deployOrder.filter((id) => id !== FIRST)];
      saveDeployOrder(ORDER);
      active.queue("deploy-order", { order: ORDER });
    }
  });
  function canUseWorldInput() {
    return !home && !menuOpen && !active.paused && !farmSortTransition;
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
    if (farmSortTransition || active.world.scene !== "farm" || active.world.farmBossEvent?.phase !== "idle") {
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
  function stopWorldInput(e) {
    if (e) {
      PINCH_POINTERS.delete(e.pointerId);
    } else {
      PINCH_POINTERS.clear();
    }
    pinchDistance = 0;
    stopPan(e);
  }
  var PINCH_POINTERS = /* @__PURE__ */ new Map();
  var pinchDistance = 0;
  function pinchSpan() {
    const [A, B] = [...PINCH_POINTERS.values()];
    return { distance: Math.hypot(A.x - B.x, A.y - B.y), x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  }
  CANVAS.addEventListener(
    "wheel",
    (e) => {
      if (!canUseWorldInput() || active?.world.scene !== "farm" || active.world.insideTower) {
        return;
      }
      const LINE = e.deltaMode === 1 ? 16 : 1;
      RENDERER.zoomAt(Math.exp(-e.deltaY * LINE * 16e-4), e.clientX, e.clientY);
      e.preventDefault();
    },
    { passive: false }
  );
  CANVAS.addEventListener("pointerdown", (e) => {
    FOOD_FEEL.unlock();
    if (e.pointerType === "touch" && canUseWorldInput() && active?.world.scene === "farm" && !active.world.insideTower) {
      PINCH_POINTERS.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (PINCH_POINTERS.size === 2) {
        if (panPointer) {
          panPointer.mode = "pinch";
        }
        pinchDistance = pinchSpan().distance;
        CANVAS.setPointerCapture?.(e.pointerId);
        e.preventDefault();
        return;
      }
    }
    if (e.button !== 0 || !canUseWorldInput() || panPointer) {
      return;
    }
    panPointer = {
      id: e.pointerId,
      // Inside the tower nothing moves. On the farm the land can be dragged.
      mode: active.world.insideTower ? "still" : "pan",
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY
    };
    CANVAS.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  CANVAS.addEventListener("pointermove", (e) => {
    if (PINCH_POINTERS.has(e.pointerId)) {
      PINCH_POINTERS.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (PINCH_POINTERS.size === 2 && pinchDistance > 0) {
        const SPAN = pinchSpan();
        RENDERER.zoomAt(SPAN.distance / pinchDistance, SPAN.x, SPAN.y);
        pinchDistance = SPAN.distance;
        e.preventDefault();
        return;
      }
    }
    if (!panPointer || e.pointerId !== panPointer.id) {
      return;
    }
    if (!canUseWorldInput()) {
      stopWorldInput(e);
      return;
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
      if (!home) {
        markSeen();
      }
    } else if (!home) {
      settleOffline();
    }
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuOpen) {
      e.preventDefault();
      closeMenu();
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
    if (!home) {
      markSeen();
    }
    active.dispose();
    unsubscribeProgress?.();
    unsubscribeProgress = null;
    RENDERER.dispose();
  });
  CANVAS.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    stopWorldInput();
    persist();
    FAIL2(Error("그래픽 연결이 끊겼어요. 새로고침해 다시 이어가 주세요."));
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
    if (R2 === "#/help" || R2 === "#/farms" || R2 === "#/abilities" || R2 === "#/menu") {
      const FARM_EVENT_ACTIVE = personalGarden?.farmBossEvent?.phase !== "idle";
      const RESTRICTED = R2 === "#/farms" && FARM_EVENT_ACTIVE || R2 === "#/abilities" && !personalGarden;
      if (RESTRICTED) {
        closeMenu(false);
        history.replaceState(null, "", "#/farm");
        return;
      }
      openMenu(ROUTE_MENU_TAB(R2), false);
      return;
    }
    if (menuOpen) {
      closeMenu(false);
    }
  }
  window.addEventListener("popstate", route);
  function sync(display, now, notices) {
    const W = active.world, FARM_EVENT = display.farmBossEvent, FARM_EVENT_ACTIVE = FARM_EVENT?.phase !== "idle", BATTLE_OUTCOME = FARM_EVENT?.outcome, HAS_READY_TROOPS = personalGarden ? personalGarden.units.some((unit2) => unit2.hp > 0 && unit2.down <= 0) : false, REWARD_WORLD = personalGarden || W, PENDING_REWARD = REWARD_WORLD.bossRewardReceipts.find(
      (reward) => ["calculating", "ready"].includes(reward.status) || reward.queuedCount > 0
    ), MERGE_STATUS = mergeAvailability(W, now);
    syncBossRewardDialog(REWARD_WORLD);
    if ((home || menuOpen || active.paused) && panPointer) {
      stopWorldInput();
    }
    syncFlag("merge", "disabled", home || FARM_EVENT_ACTIVE || !MERGE_STATUS.available);
    syncData("merge", "availability", MERGE_STATUS.code || "unavailable");
    syncFlag("mergeNotice", "hidden", home || FARM_EVENT_ACTIVE);
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
    for (const UNIT3 of W.units) {
      if (!UNIT3.isBattleOnlySummon) {
        worldCount++;
      }
    }
    syncFlag("farmControls", "hidden", FARM_EVENT_ACTIVE || home || W.tower.active);
    syncFlag("workHud", "hidden", FARM_EVENT_ACTIVE || home || W.tower.active);
    syncTower(W, home, FARM_EVENT);
    syncFlag("bossbar", "hidden", !FARM_EVENT_ACTIVE || home || FARM_EVENT.phase === "marching");
    syncHand(W, !home && fightActive());
    syncText("count", displayedCount);
    syncText("capacity", personalGarden?.capacity ?? CONFIG.farm.capacity.max);
    syncText(
      "starter",
      PENDING_REWARD ? `${speciesRewardName(PENDING_REWARD.species)} 보상 대기 · 공간이 생기면 합류해요` : !HAS_READY_TROOPS ? "모두 잠자는 중 · 회복을 기다려요" : worldCount >= W.capacity ? "농장이 가득 찼어요" : "번식으로 식구를 늘려요"
    );
    syncWidth("allyHealth", (armyMax ? armyCurrent / armyMax * 100 : 0) + "%");
    syncText(
      "allyHealthText",
      Math.ceil(armyCurrent) + "/" + Math.ceil(armyMax) + " · " + armyLiving + "/" + armyTotal + "마리"
    );
    const BOSS2 = display.boss, FARM_REWARD = FARM_EVENT?.outcome === "victory" ? W.bossRewardReceipts.find(
      (reward) => reward.source === "farm" && reward.encounterId === FARM_EVENT.encounterId
    ) : null, REWARD_NAME = speciesRewardName(BOSS2.species), ENCOUNTER_NAME = giantSpeciesName(BOSS2.species), FIRST_MEETING = FARM_EVENT_ACTIVE && !bossSpeciesOwned(W, BOSS2.species) ? " · 첫 조우" : "";
    syncText(
      "bossName",
      (BOSS2.stage ? `${BOSS2.stage}층 · ${W.tower.kind === "battle" ? "" : FLOOR_KIND[W.tower.kind] + " "}${ENCOUNTER_NAME}` : ENCOUNTER_NAME) + FIRST_MEETING
    );
    syncAttribute("bossHealth", "aria-label", `${ENCOUNTER_NAME} 체력`);
    syncText("bossHealthText", Math.ceil(BOSS2.hp) + "/" + Math.round(BOSS2.maxHp));
    syncText(
      "bossHealthNote",
      FARM_EVENT_ACTIVE && FARM_EVENT.phase === "dropping" ? "보스가 있는 칸으로 가는 중이에요" : FARM_EVENT_ACTIVE && FARM_EVENT.phase === "fighting" ? W.bossEnraged ? "격노! 피해 2배, 공격이 빨라져요" : `${W.bossPhase}페이즈 · 격노까지 ${Math.max(0, Math.ceil(W.battleTimeLimit() - FARM_EVENT.elapsed))}초` : FARM_EVENT_ACTIVE ? "" : "쓰러진 병력 포함 최대 체력"
    );
    syncFlag("fightRetreat", "hidden", !(FARM_EVENT_ACTIVE && ["dropping", "fighting"].includes(FARM_EVENT.phase)));
    syncAttribute("allyHealth", "aria-valuenow", armyCurrent);
    syncAttribute("allyHealth", "aria-valuemax", armyMax);
    syncAttribute("bossHealth", "aria-valuenow", BOSS2.hp);
    syncAttribute("bossHealth", "aria-valuemax", BOSS2.maxHp);
    syncWidth("bossHealth", BOSS2.maxHp ? BOSS2.hp / BOSS2.maxHp * 100 + "%" : "0%");
    syncText(
      "battleOutcome",
      BATTLE_OUTCOME === "victory" ? FARM_EVENT.rewardStatus === "granted" ? `${BOSS2.stage}층 돌파 · 새 기록! ${REWARD_NAME} ${rewardReceiptSummary(FARM_REWARD)} · 농장에 합류했어요` : FARM_EVENT.rewardStatus === "pending" ? `${BOSS2.stage}층 돌파 · 새 기록! ${REWARD_NAME} ${rewardReceiptSummary(FARM_REWARD)} · 공간이 생기면 합류해요` : W.tower.record ? `${BOSS2.stage}층 돌파 · 새 기록!` : `${BOSS2.stage}층 돌파 · 이미 오른 층이라 보상은 없어요` : BATTLE_OUTCOME === "defeat" ? `${BOSS2.stage}층에서 쓰러졌어요 · 최고 ${W.playerProgression.towerBest}층 · 쓰러진 병력은 농장에서 쉬어요` : ""
    );
    syncFlag(
      "battleOutcome",
      "hidden",
      home || !FARM_EVENT_ACTIVE || BATTLE_OUTCOME === "fighting" || BATTLE_OUTCOME === "idle"
    );
    const BEST_FLOOR = W.playerProgression.towerBest, START_FLOOR = startFloorValue(W);
    syncFlag("startFloorBox", "hidden", BEST_FLOOR < 2 || FARM_EVENT_ACTIVE || home);
    syncAttribute("startFloor", "max", Math.max(1, BEST_FLOOR));
    if (document.activeElement !== DOLLAR2("startFloor") && DOLLAR2("startFloor").value !== String(START_FLOOR)) {
      DOLLAR2("startFloor").value = String(START_FLOOR);
    }
    paintRange(DOLLAR2("startFloor"));
    syncText("startFloorValue", `시작 ${START_FLOOR} / ${BEST_FLOOR}층`);
    syncText("bossChallenge", "탑 오르기");
    syncFlag("bossChallenge", "hidden", FARM_EVENT_ACTIVE || home);
    syncAttribute("bossChallenge", "aria-disabled", String(raidStartBlockReason() !== ""));
    syncFlag("menuTabFarms", "disabled", FARM_EVENT_ACTIVE);
    syncFlag("menuTabAbilities", "disabled", !personalGarden);
    const WORK_WORLD = personalGarden || W, WORKERS = WORK_WORLD.workerCount, CUT = workCut(WORK_WORLD), PLAN = plannedWorkers(WORK_WORLD), BREEDERS = PLAN.total - PLAN.workers;
    let note = `일꾼 ${WORKERS}마리 · 먹이 ${WORK_WORLD.workFoodPerMinute.toFixed(1)}/분`, warn = false;
    if (WORK_WORLD.warehouseFull) {
      note = "농장에 먹이가 가득해요 · 일꾼은 쉬는 중이에요";
      warn = true;
    } else if (WORKERS === 0) {
      note = "일꾼이 없어서 먹이가 안 만들어져요";
      warn = true;
    }
    DOLLAR2("workCutA").disabled = !!farmSortTransition;
    if (document.activeElement !== DOLLAR2("workCutA") && !workSliderHeld) {
      DOLLAR2("workCutA").value = String(CUT);
    }
    syncText("workHudNote", note);
    syncText("workHudBreed", `번식 ${BREEDERS}`);
    syncText("workHudFood", `먹이 ${PLAN.workers}`);
    syncData("workHud", "warn", warn);
    paintRange(DOLLAR2("workCutA"));
    if (menuOpen && menuTab === "farms") {
      drawFarmPanel();
    }
    for (const E of notices) {
      FOOD_FEEL.event(E.kind);
    }
    FOOD_FEEL.frame();
  }
  function frame(now) {
    try {
      PERFORMANCE_DIAGNOSTICS.beginFrame(now);
      active.profiler = PERFORMANCE_DIAGNOSTICS;
      active.world.profiler = PERFORMANCE_DIAGNOSTICS;
      const SIMULATION_START = PERFORMANCE_DIAGNOSTICS.start();
      const CLOCK = HELP.scene ? HELP.clock(now) : now;
      if (!home && !document.hidden) {
        active.pulse(CLOCK);
        HELP.scenario?.pulse(CLOCK);
      }
      PERFORMANCE_DIAGNOSTICS.end("simulation", SIMULATION_START);
      const PRESENTATION_START = PERFORMANCE_DIAGNOSTICS.start();
      const DISPLAY = active.presentation(CLOCK), NOTICES = active.takePresentationNotices();
      COMBAT_FEEL.observe(active.world, DISPLAY.displayTimeMs, DISPLAY.presentationRevision, NOTICES);
      PERFORMANCE_DIAGNOSTICS.end("presentation", PRESENTATION_START);
      const RENDER_START = PERFORMANCE_DIAGNOSTICS.start();
      RENDERER.render(DISPLAY, COMBAT_FEEL, DISPLAY.displayTimeMs);
      PERFORMANCE_DIAGNOSTICS.end("render", RENDER_START);
      const UI_START = PERFORMANCE_DIAGNOSTICS.start();
      sync(DISPLAY, now, NOTICES);
      RELIC_DOCK.update(
        active.world,
        DISPLAY,
        !home && active.world.tower.active && active.world.farmBossEvent?.phase !== "idle"
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
  DOLLAR2("settingsVersion").textContent = `v${PRODUCT_VERSION}`;
  setHome(true, false);
  if (location.hash && location.hash !== "#/") {
    route();
  }
  var HELP = {
    scene: helpSceneById(new URLSearchParams(location.search).get("help")),
    scenario: null,
    memo: {},
    complete: false,
    scaled: 0,
    last: null,
    clock(now) {
      this.scaled = this.last === null ? now : this.scaled + Math.min(now - this.last, HELP_MAX_FRAME_MS) * (this.scene.rate ?? HELP_PLAYBACK_RATE);
      this.last = now;
      return this.scaled;
    },
    run(event) {
      if (event.cmd) {
        active.queue(event.cmd, event.args);
      } else if (event.pick !== void 0) {
        active.queue("tower-door", { index: event.pick });
      } else if (event.finish) {
        active.world.finishFarmBossEvent(event.finish);
      }
    }
  };
  if (HELP.scene) {
    const SCENE = HELP.scene, WORLD = new GARDEN(SCENE.seed);
    SCENE.setup(WORLD);
    start(WORLD, false);
    active.paused = false;
    HELP.scenario = globalThis.BloomGamekitScenario.createScenario({
      definition: {
        seed: SCENE.seed,
        tickRate: LOCAL_PROFILE.tickRate,
        endTick: Math.ceil(SCENE.durationMs * LOCAL_PROFILE.tickRate / 1e3),
        timeline: SCENE.timeline
      },
      createRun: () => ({
        step: (frame2) => {
          frame2.events.forEach((event) => HELP.run(event));
          const REACTION = SCENE.auto?.(active.world, frame2.timeMs, HELP.memo);
          if (REACTION?.door || REACTION?.cmd) {
            HELP.run(REACTION);
          }
          HELP.complete ||= REACTION?.complete === true;
        },
        isComplete: () => HELP.complete,
        dispose() {
        }
      }),
      onEnd: () => {
        active.paused = true;
      }
    });
    HELP.scenario.play({ automatic: false });
    globalThis.__budmoriHelp = {
      snapshot: () => ({ ...HELP.scenario.snapshot(), step: SCENE.step(active.world) })
    };
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
