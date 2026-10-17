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

  // src/features/scenes/model-base.js
  var SimulationScene;
  var init_model_base = __esm({
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
          const ADVANCED2 = this.advanceRest(world, unit, dt), OLD_Z = unit.z;
          unit.integrate(dt);
          this.afterDownedIntegration(world, unit);
          if (OLD_Z > 0 && unit.z === 0) {
            world.metrics.landings++;
            this.landUnit(world, unit);
          }
          this.restoreUnit(world, unit);
          world.unitSpatial.update(unit);
          return ADVANCED2;
        }
        separateBossUnits(world) {
          for (const UNIT3 of world.units) {
            world.separateBoss(UNIT3);
            world.unitSpatial.update(UNIT3);
          }
        }
        updateBattle(world, dt) {
          if (!world.boss.active) {
            return;
          }
          world.updateProjectiles(dt);
          world.updateBoss(dt);
          this.separateBossUnits(world);
        }
      };
    }
  });

  // src/features/scenes/farm/definition.js
  var FEATURE;
  var init_definition = __esm({
    "src/features/scenes/farm/definition.js"() {
      FEATURE = Object.freeze({ id: "farm" });
    }
  });

  // src/features/scenes/farm/model.js
  var FarmSimulationScene;
  var init_model = __esm({
    "src/features/scenes/farm/model.js"() {
      init_model_base();
      init_definition();
      FarmSimulationScene = class extends SimulationScene {
        constructor(dependencies) {
          const { CONFIG: CONFIG2 } = dependencies;
          super(dependencies);
          this.feature = FEATURE;
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
          const { STATS: STATS2, CREATE_UNIT_ATTACK_CYCLE: CREATE_UNIT_ATTACK_CYCLE2 } = this.dependencies;
          if (unit.down !== 0) {
            return;
          }
          const MAX_HP = STATS2(unit.tier, unit.species).maxHp;
          world.releaseMate(unit);
          Object.assign(unit, {
            hp: MAX_HP,
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
          world._syncUnitAliveCount(unit);
          unit.ability = CREATE_UNIT_ATTACK_CYCLE2(unit);
          world.combat("unit-recover", {
            unit: unit.id,
            x: unit.x,
            y: unit.y
          });
          world.markProgressChanged();
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
        resolveContacts(world, units) {
          world.resolveFarmContacts(units);
        }
        resolveLifeContacts(world, units) {
          const { FARM_MODES: FARM_MODES2 } = this.dependencies;
          FARM_MODES2[world.mode].resolveContacts(world, units);
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
          if (world.boss.active) {
            world.updateProjectiles(dt);
          }
          world.updateBoss(dt);
          if (world.boss.active) {
            this.separateBossUnits(world);
          }
        }
      };
    }
  });

  // src/features/scenes/raid/definition.js
  var FEATURE2;
  var init_definition2 = __esm({
    "src/features/scenes/raid/definition.js"() {
      FEATURE2 = Object.freeze({ id: "raid" });
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
          active: 0,
          recover: 1.05,
          cooldown: 10,
          reach: 6.5,
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

  // src/features/abilities/pea-death-split.js
  var PeaDeathSplitPresentation, PEA_DEATH_SPLIT_FEATURE;
  var init_pea_death_split = __esm({
    "src/features/abilities/pea-death-split.js"() {
      PeaDeathSplitPresentation = class {
        label(_definition, value) {
          return `전투 사망 시 같은 종 T1 ${value}마리 생성`;
        }
        title(value) {
          return `T1 ${value}마리 생성`;
        }
      };
      PEA_DEATH_SPLIT_FEATURE = Object.freeze({
        definition: Object.freeze({
          id: "pea-death-split",
          species: 0,
          name: "콩 분열",
          description: "전투에서 쓰러지면 같은 종의 T1 개체를 생성해 전투를 이어갑니다.",
          rootTier: 3,
          powerValues: Object.freeze([2, 3, 4]),
          gradeThresholds: Object.freeze([3, 2, 1])
        }),
        presentation: Object.freeze(new PeaDeathSplitPresentation())
      });
    }
  });

  // src/features/abilities/corn-burst-fire.js
  var CornBurstFirePresentation, CORN_BURST_FIRE_FEATURE;
  var init_corn_burst_fire = __esm({
    "src/features/abilities/corn-burst-fire.js"() {
      CornBurstFirePresentation = class {
        label(definition, value, _level, attackProfile2) {
          return `한 공격 주기 · 발사 ${value}발 · 발당 ATK ×${attackProfile2.skillMultiplier * definition.projectileAttackShare}`;
        }
        title(value) {
          return `${value}발 연사`;
        }
      };
      CORN_BURST_FIRE_FEATURE = Object.freeze({
        definition: Object.freeze({
          id: "corn-burst-fire",
          species: 1,
          name: "옥수수 알갱이 연사",
          description: "한 기본 곡사 공격 주기 안에 알갱이를 시간차로 발사합니다.",
          rootTier: 3,
          powerValues: Object.freeze([2, 3, 4]),
          projectileAttackShare: 0.5,
          gradeThresholds: Object.freeze([3, 2, 1])
        }),
        presentation: Object.freeze(new CornBurstFirePresentation())
      });
    }
  });

  // src/features/abilities/corn-popcorn-chain.js
  var CornPopcornChainPresentation, CORN_POPCORN_CHAIN_FEATURE;
  var init_corn_popcorn_chain = __esm({
    "src/features/abilities/corn-popcorn-chain.js"() {
      CornPopcornChainPresentation = class {
        label(definition, value, level) {
          const RADIUS_MULTIPLIER = definition.radiusMultipliers[level] || definition.radiusMultipliers[0];
          return `착탄 ${definition.fuseSeconds}초 후 · 팝콘 접촉 즉시 연쇄 · 피해 ATK ×${value} · 반경 기본 사거리 ×${definition.baseRangeFraction} ×${RADIUS_MULTIPLIER}`;
        }
        title(value) {
          return `ATK ×${value} 폭발`;
        }
      };
      CORN_POPCORN_CHAIN_FEATURE = Object.freeze({
        definition: Object.freeze({
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
        presentation: Object.freeze(new CornPopcornChainPresentation())
      });
    }
  });

  // src/features/abilities/chestnut-spike-fan.js
  var ChestnutSpikeFanPresentation, CHESTNUT_SPIKE_FAN_FEATURE;
  var init_chestnut_spike_fan = __esm({
    "src/features/abilities/chestnut-spike-fan.js"() {
      ChestnutSpikeFanPresentation = class {
        label(definition, value) {
          return `목표 방향 부채꼴 ${Math.round(definition.fanSpreadRadians * 180 / Math.PI)}° ${value}발 · 발당 ATK ×${definition.projectileAttackMultiplier} · 기본 공격 ${definition.intervalBasicCycles}주기마다`;
        }
        title(value) {
          return `가시 ${value}발`;
        }
      };
      CHESTNUT_SPIKE_FAN_FEATURE = Object.freeze({
        definition: Object.freeze({
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
        presentation: Object.freeze(new ChestnutSpikeFanPresentation())
      });
    }
  });

  // src/features/abilities/kidney-continuous-leap.js
  var KidneyContinuousLeapPresentation, KIDNEY_CONTINUOUS_LEAP_FEATURE;
  var init_kidney_continuous_leap = __esm({
    "src/features/abilities/kidney-continuous-leap.js"() {
      KidneyContinuousLeapPresentation = class {
        label(_definition, value) {
          return `착지 후 도약 쿨다운 초기화 ${Math.round(value * 100)}%`;
        }
        title(value) {
          return `초기화 ${Math.round(value * 100)}%`;
        }
      };
      KIDNEY_CONTINUOUS_LEAP_FEATURE = Object.freeze({
        definition: Object.freeze({
          id: "kidney-continuous-leap",
          species: 2,
          name: "연속 도약",
          description: "착지 후 확률적으로 도약 재사용 대기시간을 초기화합니다.",
          rootTier: 3,
          powerValues: Object.freeze([0.2, 0.35, 0.5, 0.65]),
          gradeThresholds: Object.freeze([3, 2, 1])
        }),
        presentation: Object.freeze(new KidneyContinuousLeapPresentation())
      });
    }
  });

  // src/features/abilities/kidney-landing-shockwave.js
  var KidneyLandingShockwavePresentation, KIDNEY_LANDING_SHOCKWAVE_FEATURE;
  var init_kidney_landing_shockwave = __esm({
    "src/features/abilities/kidney-landing-shockwave.js"() {
      KidneyLandingShockwavePresentation = class {
        label(_definition, value) {
          return `충격파 피해·반경 ${value}×`;
        }
        title(value) {
          return `충격파 ×${value}`;
        }
      };
      KIDNEY_LANDING_SHOCKWAVE_FEATURE = Object.freeze({
        definition: Object.freeze({
          id: "kidney-landing-shockwave",
          species: 2,
          name: "착지 충격파",
          description: "도약 착지 지점에서 기본 공격력과 사거리 기준의 충격파를 냅니다.",
          rootTier: 3,
          powerValues: Object.freeze([1, 1.5, 2]),
          gradeThresholds: Object.freeze([3, 2, 1])
        }),
        presentation: Object.freeze(new KidneyLandingShockwavePresentation())
      });
    }
  });

  // src/features/abilities/peanut-separated-assault.js
  var PeanutSeparatedAssaultPresentation, PEANUT_SEPARATED_ASSAULT_FEATURE;
  var init_peanut_separated_assault = __esm({
    "src/features/abilities/peanut-separated-assault.js"() {
      PeanutSeparatedAssaultPresentation = class {
        label(definition, value) {
          return `한 공격 주기 ${value}타 · 타격당 ATK ×${definition.strikeAttackMultiplier} · 넓은 협공 궤적`;
        }
        title(value) {
          return `협공 ${value}타`;
        }
      };
      PEANUT_SEPARATED_ASSAULT_FEATURE = Object.freeze({
        definition: Object.freeze({
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
        presentation: Object.freeze(new PeanutSeparatedAssaultPresentation())
      });
    }
  });

  // src/features/abilities/walnut-guard-slam.js
  var WalnutGuardSlamPresentation, WALNUT_GUARD_SLAM_FEATURE;
  var init_walnut_guard_slam = __esm({
    "src/features/abilities/walnut-guard-slam.js"() {
      WalnutGuardSlamPresentation = class {
        label(definition, value, level) {
          return `첫 방어 피격 피해 −${Math.round((1 - definition.receivedDamageMultiplier) * 100)}%·넉백 −${Math.round((1 - definition.receivedKnockbackMultiplier) * 100)}% · 다음 공격 ATK ×${value} · 충격파 반경 기본 사거리 ×${definition.radiusBaseRangeFraction * definition.radiusMultipliers[level]}`;
        }
        title(value) {
          return `반격 피해 ×${value}`;
        }
      };
      WALNUT_GUARD_SLAM_FEATURE = Object.freeze({
        definition: Object.freeze({
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
        presentation: Object.freeze(new WalnutGuardSlamPresentation())
      });
    }
  });

  // src/features/abilities/rice-low-health-harvest.js
  var RiceLowHealthHarvestPresentation, RICE_LOW_HEALTH_HARVEST_FEATURE;
  var init_rice_low_health_harvest = __esm({
    "src/features/abilities/rice-low-health-harvest.js"() {
      RiceLowHealthHarvestPresentation = class {
        label(definition, value) {
          return `HP ${Math.round(definition.targetHpThreshold * 100)}% 이하 대상에게 기본 피해 총 ${value}×`;
        }
        title(value) {
          return `수확 피해 ×${value}`;
        }
      };
      RICE_LOW_HEALTH_HARVEST_FEATURE = Object.freeze({
        definition: Object.freeze({
          id: "rice-low-health-harvest",
          species: 6,
          name: "수확 낫",
          description: "낫 기본 공격이 체력이 절반 이하인 적에게 더 큰 피해를 줍니다.",
          rootTier: 3,
          powerValues: Object.freeze([1.5, 1.75, 2]),
          targetHpThreshold: 0.5,
          gradeThresholds: Object.freeze([3, 2, 1])
        }),
        presentation: Object.freeze(new RiceLowHealthHarvestPresentation())
      });
    }
  });

  // src/features/abilities/wheat-command-crit.js
  var WheatCommandCritPresentation, WHEAT_COMMAND_CRIT_FEATURE;
  var init_wheat_command_crit = __esm({
    "src/features/abilities/wheat-command-crit.js"() {
      WheatCommandCritPresentation = class {
        label(definition, value) {
          return `기본 공격 적중 시 자신 포함 반경 기본 사거리 ×${definition.radiusRangeRatio} 안의 생존 아군 치명타 +${Math.round(value * 100)}%p · ${definition.durationSeconds}초`;
        }
        title(value) {
          return `치명타 +${Math.round(value * 100)}%p`;
        }
      };
      WHEAT_COMMAND_CRIT_FEATURE = Object.freeze({
        definition: Object.freeze({
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
        presentation: Object.freeze(new WheatCommandCritPresentation())
      });
    }
  });

  // src/features/abilities/barley-armor-break.js
  var BarleyArmorBreakPresentation, BARLEY_ARMOR_BREAK_FEATURE;
  var init_barley_armor_break = __esm({
    "src/features/abilities/barley-armor-break.js"() {
      BarleyArmorBreakPresentation = class {
        label(definition, value) {
          return `기본 공격 적중 시 방어도 ${Math.round(value * 100)}% 감소 · ${definition.durationSeconds}초`;
        }
        title(value) {
          return `방어도 ${Math.round(value * 100)}% 감소`;
        }
      };
      BARLEY_ARMOR_BREAK_FEATURE = Object.freeze({
        definition: Object.freeze({
          id: "barley-armor-break",
          species: 8,
          name: "도리깨 갑주 파쇄",
          description: "도리깨 기본 공격 적중 시 적의 방어도를 낮춰 5초 동안 피해를 더 받게 합니다.",
          rootTier: 3,
          powerValues: Object.freeze([0.25, 0.5, 0.75]),
          durationSeconds: 5,
          gradeThresholds: Object.freeze([3, 2, 1])
        }),
        presentation: Object.freeze(new BarleyArmorBreakPresentation())
      });
    }
  });

  // src/ability-catalog.js
  function abilityPresentationFor(abilityId) {
    return ABILITY_FEATURE_BY_ID.get(abilityId)?.presentation;
  }
  var ABILITY_FEATURES, SPECIES_ABILITY_DEFINITIONS, ABILITY_FEATURE_BY_ID;
  var init_ability_catalog = __esm({
    "src/ability-catalog.js"() {
      init_pea_death_split();
      init_corn_burst_fire();
      init_corn_popcorn_chain();
      init_chestnut_spike_fan();
      init_kidney_continuous_leap();
      init_kidney_landing_shockwave();
      init_peanut_separated_assault();
      init_walnut_guard_slam();
      init_rice_low_health_harvest();
      init_wheat_command_crit();
      init_barley_armor_break();
      ABILITY_FEATURES = Object.freeze([
        PEA_DEATH_SPLIT_FEATURE,
        CORN_BURST_FIRE_FEATURE,
        CORN_POPCORN_CHAIN_FEATURE,
        CHESTNUT_SPIKE_FAN_FEATURE,
        KIDNEY_CONTINUOUS_LEAP_FEATURE,
        KIDNEY_LANDING_SHOCKWAVE_FEATURE,
        PEANUT_SEPARATED_ASSAULT_FEATURE,
        WALNUT_GUARD_SLAM_FEATURE,
        RICE_LOW_HEALTH_HARVEST_FEATURE,
        WHEAT_COMMAND_CRIT_FEATURE,
        BARLEY_ARMOR_BREAK_FEATURE
      ]);
      SPECIES_ABILITY_DEFINITIONS = Object.freeze(ABILITY_FEATURES.map((feature) => feature.definition));
      ABILITY_FEATURE_BY_ID = new Map(ABILITY_FEATURES.map((feature) => [feature.definition.id, feature]));
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
        {
          id: "food",
          name: "자동 탭",
          icon: "◒",
          description: "자동 먹이 생성 간격을 단계마다 10% 줄입니다.",
          value: (level) => `${(0.5 / (1 + 0.1 * level)).toFixed(3)}초 / 탭`
        },
        {
          id: "growth",
          name: "먹이 찾기",
          icon: "❧",
          description: "먹이를 향해 움직일 때의 속도를 단계마다 10% 높입니다.",
          value: (level) => `${(2.2 * (1 + 0.1 * level)).toFixed(2)} 속도`
        },
        {
          id: "breed",
          name: "번식 회복",
          icon: "♡",
          description: "부모의 번식 대기시간을 단계마다 10% 줄입니다.",
          value: (level) => `${(10 / (1 + 0.1 * level)).toFixed(2)}초`
        },
        {
          id: "merge",
          name: "합체 회복",
          icon: "◇",
          description: "합체 후 대기시간을 단계마다 10% 줄입니다.",
          value: (level) => `${(4 / (1 + 0.1 * level)).toFixed(2)}초`
        },
        {
          id: "capacity",
          name: "정원 확장",
          icon: "＋",
          description: "정원 인원 상한을 단계마다 10명 늘립니다.",
          value: (level) => `${Math.min(100, 50 + 10 * level)}명`
        }
      ]);
      FARM_UPGRADE_IDS = Object.freeze(Object.keys(FARM_UPGRADE_MAX_LEVELS));
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
            rootUnlocked: false,
            powerLevel: 0,
            gradeLevel: 0
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
    for (const DEFINITION of SPECIES_ABILITY_DEFINITIONS) {
      const INVESTMENT = state.abilities[DEFINITION.id];
      if (!INVESTMENT || typeof INVESTMENT.rootUnlocked !== "boolean") {
        return false;
      }
      if (!isNonNegativeInteger(INVESTMENT.powerLevel) || INVESTMENT.powerLevel > DEFINITION.powerValues.length - 1) {
        return false;
      }
      if (!isNonNegativeInteger(INVESTMENT.gradeLevel) || INVESTMENT.gradeLevel > DEFINITION.gradeThresholds.length - 1) {
        return false;
      }
      if (!INVESTMENT.rootUnlocked && (INVESTMENT.powerLevel !== 0 || INVESTMENT.gradeLevel !== 0)) {
        return false;
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
      availablePoints: state.availablePoints,
      farmUpgrades: {
        ...state.farmUpgrades
      },
      abilities: Object.fromEntries(
        SPECIES_ABILITY_DEFINITIONS.map(({ id }) => [
          id,
          {
            ...state.abilities[id]
          }
        ])
      )
    };
  }
  function isValidAbilityRuntimeSnapshot(snapshot2) {
    if (!snapshot2 || typeof snapshot2 !== "object" || snapshot2.schemaVersion !== ABILITY_TREE_SCHEMA_VERSION || !Number.isSafeInteger(snapshot2.level) || snapshot2.level < 1) {
      return false;
    }
    const STATE = {
      schemaVersion: snapshot2.schemaVersion,
      level: snapshot2.level,
      experience: 0,
      availablePoints: snapshot2.availablePoints,
      farmUpgrades: snapshot2.farmUpgrades,
      abilities: snapshot2.abilities,
      processedBossKillReceipts: []
    };
    if (!isValidAbilityProgressionState(STATE)) {
      return false;
    }
    const INVESTED = Object.values(STATE.abilities).reduce(
      (total, investment) => total + Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel,
      0
    );
    return INVESTED + getFarmUpgradeInvestedCount(STATE.farmUpgrades) + STATE.availablePoints === STATE.level - 1;
  }
  function isValidPlayerLikeAbilityState(state) {
    const ABILITY_STATE = {
      schemaVersion: state?.schemaVersion,
      availablePoints: state?.availablePoints,
      farmUpgrades: state?.farmUpgrades,
      abilities: state?.abilities
    };
    if (!isValidAbilityProgressionState(ABILITY_STATE) || !Number.isSafeInteger(state?.level) || state.level < 1) {
      return false;
    }
    const INVESTED_POINTS = Object.values(state.abilities).reduce(
      (total, investment) => total + Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel,
      0
    );
    return INVESTED_POINTS + getFarmUpgradeInvestedCount(state.farmUpgrades) + state.availablePoints === state.level - 1;
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
      FACTION_CONFIG = Object.freeze({
        PLAYER: "player",
        ENEMY: "enemy"
      });
    }
  });

  // src/features/scenes/raid/model.js
  var RaidSimulationScene;
  var init_model2 = __esm({
    "src/features/scenes/raid/model.js"() {
      init_model_base();
      init_definition2();
      init_boss_patterns();
      init_ability_state();
      init_factions();
      RaidSimulationScene = class extends SimulationScene {
        constructor(dependencies) {
          const { CONFIG: CONFIG2 } = dependencies;
          super(dependencies);
          this.feature = FEATURE2;
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
        resolveContacts(world, units) {
          world.raidContacts(units);
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
      init_model();
      init_model2();
    }
  });

  // src/features/projectiles/model-base.js
  var BallisticProjectile;
  var init_model_base2 = __esm({
    "src/features/projectiles/model-base.js"() {
      BallisticProjectile = class {
        constructor(feature, dependencies) {
          this.feature = feature;
          this.dependencies = dependencies;
        }
        update(world, projectile, dt) {
          const { Ballistics: BALLISTICS2, ArenaGeometry: ARENA_GEOMETRY2 } = this.dependencies;
          const OLD = { x: projectile.x, y: projectile.y, z: projectile.z };
          projectile.elapsed += dt;
          Object.assign(projectile, BALLISTICS2.sample(projectile.path, projectile.elapsed / projectile.path.duration));
          const CANDIDATE = projectile.targetId && projectile.targetId !== "boss" ? world._unitForId(projectile.targetId) : world.boss;
          const TARGET = CANDIDATE === world.boss || CANDIDATE?.hp > 0 ? CANDIDATE : null;
          const HIT = TARGET ? ARENA_GEOMETRY2.sweep(OLD, projectile, projectile.radius, projectile.height, TARGET) : null;
          this.impact(world, projectile, TARGET, HIT);
        }
        updateChain(_world, _projectile) {
        }
      };
    }
  });

  // src/features/projectiles/damage-model.js
  var DamageProjectile;
  var init_damage_model = __esm({
    "src/features/projectiles/damage-model.js"() {
      init_model_base2();
      DamageProjectile = class extends BallisticProjectile {
        constructor(feature, dependencies) {
          super(feature, dependencies);
          this.landingEffect = feature.landingEffect;
        }
        impact(world, projectile, target, hit) {
          if (hit) {
            Object.assign(projectile, { x: hit.x, y: hit.y, z: hit.z });
            const SOURCE = world._unitForId(projectile.owner), IMPACT_UNIT = SOURCE || {
              id: projectile.owner,
              ownerId: projectile.ownerId || "",
              faction: projectile.faction,
              species: projectile.species,
              tier: projectile.tier,
              x: projectile.x,
              y: projectile.y,
              z: projectile.z
            };
            world.damageCombatTarget(IMPACT_UNIT, projectile, target, hit, {
              attackMultiplier: projectile.attackMultiplier,
              attackKind: projectile.projectileKind || "lob"
            });
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

  // src/features/projectiles/seed/definition.js
  var FEATURE3;
  var init_definition3 = __esm({
    "src/features/projectiles/seed/definition.js"() {
      FEATURE3 = Object.freeze({ id: "seed", landingEffect: "shell-land" });
    }
  });

  // src/features/projectiles/seed/model.js
  var SeedProjectile;
  var init_model3 = __esm({
    "src/features/projectiles/seed/model.js"() {
      init_damage_model();
      init_definition3();
      SeedProjectile = class extends DamageProjectile {
        constructor(dependencies) {
          super(FEATURE3, dependencies);
        }
      };
    }
  });

  // src/features/projectiles/spike/definition.js
  var FEATURE4;
  var init_definition4 = __esm({
    "src/features/projectiles/spike/definition.js"() {
      FEATURE4 = Object.freeze({ id: "spike", landingEffect: "spike-land" });
    }
  });

  // src/features/projectiles/spike/model.js
  var SpikeProjectile;
  var init_model4 = __esm({
    "src/features/projectiles/spike/model.js"() {
      init_damage_model();
      init_definition4();
      SpikeProjectile = class extends DamageProjectile {
        constructor(dependencies) {
          super(FEATURE4, dependencies);
        }
      };
    }
  });

  // src/features/projectiles/popcorn/definition.js
  var FEATURE5;
  var init_definition5 = __esm({
    "src/features/projectiles/popcorn/definition.js"() {
      FEATURE5 = Object.freeze({ id: "popcorn" });
    }
  });

  // src/features/projectiles/popcorn/model.js
  var PopcornProjectile;
  var init_model5 = __esm({
    "src/features/projectiles/popcorn/model.js"() {
      init_model_base2();
      init_definition5();
      PopcornProjectile = class extends BallisticProjectile {
        constructor(dependencies) {
          super(FEATURE5, dependencies);
        }
        update(world, projectile, dt) {
          if (!projectile.landed) {
            super.update(world, projectile, dt);
            return;
          }
          if (!projectile.exploded) {
            projectile.fuseRemaining = Math.max(0, projectile.fuseRemaining - dt);
          } else {
            projectile.explosionLife = (projectile.explosionLife || 0) + dt;
          }
        }
        impact(world, projectile, _target, hit) {
          if (!(hit || projectile.elapsed >= projectile.path.duration)) {
            return;
          }
          if (hit) {
            Object.assign(projectile, { x: hit.x, y: hit.y, z: 0 });
          } else {
            projectile.z = 0;
          }
          projectile.landed = true;
          projectile.fuseRemaining = projectile.popcornConfig.fuseSeconds;
          world.effects.push({
            kind: "popcorn-kernel-impact",
            x: projectile.x,
            y: projectile.y,
            z: 0,
            life: 0,
            duration: 0.25,
            radius: projectile.radius,
            owner: projectile.owner
          });
        }
        updateChain(world, projectile) {
          if (!projectile.landed || projectile.exploded) {
            return;
          }
          const TOUCHING = world.projectiles.some(
            (other) => other !== projectile && other.isPopcorn && other.landed && !other.exploded && Math.hypot(other.x - projectile.x, other.y - projectile.y) <= other.radius + projectile.radius
          );
          if (projectile.fuseRemaining > 0 && !TOUCHING) {
            return;
          }
          world.explodePopcorn(projectile);
        }
        isAlive(projectile) {
          return !projectile.exploded || projectile.explosionLife < 0.5;
        }
      };
    }
  });

  // src/features/projectiles/definition.js
  function projectileFeature(projectile) {
    if (projectile.isPopcorn) {
      return FEATURE5;
    }
    return projectileFlightFeature(projectile);
  }
  function projectileFlightFeature(projectile) {
    return projectile.projectileKind === "chestnut-spike" ? FEATURE4 : FEATURE3;
  }
  var init_definition6 = __esm({
    "src/features/projectiles/definition.js"() {
      init_definition3();
      init_definition4();
      init_definition5();
    }
  });

  // src/projectile-behaviors.js
  function createProjectileBehaviors(dependencies) {
    const BEHAVIORS = Object.freeze(
      Object.fromEntries(
        [
          new SeedProjectile(dependencies),
          new SpikeProjectile(dependencies),
          new PopcornProjectile(dependencies)
        ].map((behavior) => [behavior.feature.id, Object.freeze(behavior)])
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
      init_model3();
      init_model4();
      init_model5();
      init_definition6();
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
        const DURATION = world.farmBossEvent.outcome === "defeat" ? config.farm.bossEvent.celebrationSeconds : config.farm.bossEvent.fadeSeconds;
        if (world.farmBossEvent.elapsed >= DURATION) {
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
    return {
      ...baseUnitStatsFor(unit?.tier, unit?.species),
      ...overrides
    };
  }
  function combatStats(unit, overrides) {
    return overrides === void 0 ? baseUnitStatsFor(unit?.tier, unit?.species) : resolveUnitStats(unit, overrides);
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
    target.hp = Math.max(0, target.hp - ACTUAL_LOSS);
    return {
      ...RESOLVED,
      actualLoss: ACTUAL_LOSS
    };
  }
  function applyHealing(target, amount, receiverStats = combatStats(target)) {
    if (!target || !Number.isFinite(target.hp) || target.hp <= 0) {
      return 0;
    }
    const MAX_HP = Number.isFinite(receiverStats?.maxHp) ? receiverStats.maxHp : 0;
    const RECEIVED = Number.isFinite(receiverStats?.healingReceivedMultiplier) ? Math.max(0, receiverStats.healingReceivedMultiplier) : 1;
    const REQUESTED = Number.isFinite(amount) ? Math.max(0, amount) * RECEIVED : 0;
    const HEALED = Math.min(Math.max(0, MAX_HP - target.hp), REQUESTED);
    target.hp += HEALED;
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

  // src/features/farm-modes/model-base.js
  var FarmMode;
  var init_model_base3 = __esm({
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
  var FEATURE6;
  var init_definition7 = __esm({
    "src/features/farm-modes/breed/definition.js"() {
      FEATURE6 = Object.freeze({ id: "breed" });
    }
  });

  // src/features/farm-modes/breed/model.js
  var BreedFarmMode;
  var init_model6 = __esm({
    "src/features/farm-modes/breed/model.js"() {
      init_model_base3();
      init_definition7();
      init_unit_stats();
      init_farm_upgrades();
      BreedFarmMode = class extends FarmMode {
        constructor(config) {
          super(FEATURE6, config);
        }
        enter(world) {
          world.mergeTask = null;
        }
        changed(world) {
          return world.mode !== this.feature.id || world.mergeTask !== null;
        }
        updateReady(world, u, dt) {
          let target = null;
          if (!u.fed) {
            target = world.findNearestGroundFood(u.x, u.y);
            if (target && Math.hypot(target.x - u.x, target.y - u.y) < 0.42) {
              world.food.splice(world.food.indexOf(target), 1);
              world.foodSpatial.remove(target);
              world._foodOrder.delete(target);
              world._removeGroupItem(world._groundedFoods, target);
              world._groundedFoodCount = Math.max(0, world._groundedFoodCount - 1);
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
        }
        pair(world, a, b, priorityResolved) {
          if (world.localScatter.active && (world.scatterInside(a) || world.scatterInside(b))) {
            return false;
          }
          if (!a || !b || a === b || a.hp <= 0 || b.hp <= 0 || a.down > 0 || b.down > 0 || a.species !== b.species || !a.mature || !b.mature || a.cooldown > 0 || b.cooldown > 0 || !world.units.includes(a) || !world.units.includes(b) || Math.hypot(a.x - b.x, a.y - b.y) > a.radius + b.radius + 0.2 || world.senseEnemy(a) || world.senseEnemy(b)) {
            return false;
          }
          if (a.isBattleOnlySummon || b.isBattleOnlySummon) {
            return false;
          }
          {
            if (!world.canBreedPair(a, b, true) || world.units.length >= world.capacity || a.mateId && a.mateId !== b.id || b.mateId && b.mateId !== a.id || !priorityResolved && a.tier !== b.tier && world.hasEligibleSameTierBreedPair()) {
              return false;
            }
            a.mateId = b.id;
            b.mateId = a.id;
            const CHILD = world.spawn(a.species, 1, (a.x + b.x) / 2, (a.y + b.y) / 2);
            CHILD.growthDuration = world.breedGrowthDuration();
            CHILD.vz = 3;
            a.meals = b.meals = 0;
            a.cooldown = b.cooldown = world.breedCooldownDuration();
            a.cooldownDuration = b.cooldownDuration = a.cooldown;
            world.releaseMate(a);
            world.metrics.births++;
            world.emit("birth", CHILD.x, CHILD.y, 0.7);
          }
          return true;
        }
      };
    }
  });

  // src/features/farm-modes/merge/definition.js
  var FEATURE7;
  var init_definition8 = __esm({
    "src/features/farm-modes/merge/definition.js"() {
      FEATURE7 = Object.freeze({ id: "merge" });
    }
  });

  // src/features/farm-modes/merge/model.js
  var MergeFarmMode;
  var init_model7 = __esm({
    "src/features/farm-modes/merge/model.js"() {
      init_model_base3();
      init_definition8();
      init_unit_stats();
      MergeFarmMode = class extends FarmMode {
        constructor(config) {
          super(FEATURE7, config);
        }
        enter(_world) {
        }
        changed(world) {
          return world.mode !== this.feature.id;
        }
        updateReady(world, u, dt) {
          const TASK = world.mergeTask;
          if (TASK?.phase === "approach" && TASK.materialIds?.includes(u.id)) {
            const ANCHOR = world._unitById.get(TASK.materialIds[0]);
            if (ANCHOR && u.cooldown <= 0) {
              world.steer(
                u,
                u.id === ANCHOR.id ? u.x : ANCHOR.x,
                u.id === ANCHOR.id ? u.y : ANCHOR.y,
                dt,
                scaleMoveSpeed(2.2, u)
              );
            }
            return;
          }
          this.wander(world, u, dt);
          return;
        }
        resolveContacts(world, _units) {
          world.resolveMergeTaskAfterMovement();
        }
        pair(world, a, b, priorityResolved) {
          return world.mergeGroup([a, b], { priorityResolved });
        }
      };
    }
  });

  // src/farm-mode-behaviors.js
  function createFarmModeBehaviors(config) {
    return Object.freeze(
      Object.fromEntries(
        [new BreedFarmMode(config), new MergeFarmMode(config)].map((mode) => [
          mode.feature.id,
          Object.freeze(mode)
        ])
      )
    );
  }
  var init_farm_mode_behaviors = __esm({
    "src/farm-mode-behaviors.js"() {
      init_model6();
      init_model7();
    }
  });

  // src/features/boss-patterns/model-base.js
  var BossPattern;
  var init_model_base4 = __esm({
    "src/features/boss-patterns/model-base.js"() {
      BossPattern = class {
        constructor(feature, dependencies) {
          this.feature = feature;
          this.id = feature.id;
          this.config = feature.config;
          this.dependencies = dependencies;
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
  var init_definition9 = __esm({
    "src/features/boss-patterns/sweep-360/definition.js"() {
      init_boss_patterns();
      FEATURE8 = Object.freeze({ id: "attack.sweep-360", config: BOSS_PATTERN_CONFIG["attack.sweep-360"] });
    }
  });

  // src/features/boss-patterns/sweep-360/model.js
  var SweepBossPattern;
  var init_model8 = __esm({
    "src/features/boss-patterns/sweep-360/model.js"() {
      init_model_base4();
      init_definition9();
      SweepBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE8, dependencies);
        }
        writeArea(_boss, _action, _scene, pad, area) {
          area.kind = "sweep";
          area.reach = this.config.reach + pad;
        }
        activate(world, action) {
          world.resolveBossCircle(action, action.id, this.config.reach);
          world.enterBossPatternRecovery(action);
          return;
        }
        get hitMetric() {
          return "sweepHits";
        }
      };
    }
  });

  // src/features/boss-patterns/front-slam/definition.js
  var FEATURE9;
  var init_definition10 = __esm({
    "src/features/boss-patterns/front-slam/definition.js"() {
      init_boss_patterns();
      FEATURE9 = Object.freeze({ id: "attack.front-slam", config: BOSS_PATTERN_CONFIG["attack.front-slam"] });
    }
  });

  // src/features/boss-patterns/front-slam/model.js
  var SlamBossPattern;
  var init_model9 = __esm({
    "src/features/boss-patterns/front-slam/model.js"() {
      init_model_base4();
      init_definition10();
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
  var init_definition11 = __esm({
    "src/features/boss-patterns/charge/definition.js"() {
      init_boss_patterns();
      FEATURE10 = Object.freeze({ id: "attack.charge", config: BOSS_PATTERN_CONFIG["attack.charge"] });
    }
  });

  // src/features/boss-patterns/charge/model.js
  var ChargeBossPattern;
  var init_model10 = __esm({
    "src/features/boss-patterns/charge/model.js"() {
      init_model_base4();
      init_definition11();
      ChargeBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE10, dependencies);
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
          ), STEP = this.config.speed * CONFIG2.physics.fixedStep;
          const DISTANCE = EXIT < this.config.reach ? Math.min(this.config.reach, (Math.floor(EXIT / STEP + 1e-8) + 1) * STEP) : this.config.reach;
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
  var init_definition12 = __esm({
    "src/features/boss-patterns/leap-slam/definition.js"() {
      init_boss_patterns();
      FEATURE11 = Object.freeze({ id: "attack.leap-slam", config: BOSS_PATTERN_CONFIG["attack.leap-slam"] });
    }
  });

  // src/features/boss-patterns/leap-slam/model.js
  var LeapBossPattern;
  var init_model11 = __esm({
    "src/features/boss-patterns/leap-slam/model.js"() {
      init_model_base4();
      init_definition12();
      LeapBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE11, dependencies);
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
  var init_definition13 = __esm({
    "src/features/boss-patterns/fan-sweep/definition.js"() {
      init_boss_patterns();
      FEATURE12 = Object.freeze({ id: "attack.fan-sweep", config: BOSS_PATTERN_CONFIG["attack.fan-sweep"] });
    }
  });

  // src/features/boss-patterns/fan-sweep/model.js
  var FanBossPattern;
  var init_model12 = __esm({
    "src/features/boss-patterns/fan-sweep/model.js"() {
      init_model_base4();
      init_definition13();
      FanBossPattern = class extends BossPattern {
        constructor(dependencies) {
          super(FEATURE12, dependencies);
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
  var init_definition14 = __esm({
    "src/features/boss-patterns/mouth-summon/definition.js"() {
      init_boss_patterns();
      FEATURE13 = Object.freeze({ id: "summon.mouth-t1", config: BOSS_PATTERN_CONFIG["summon.mouth-t1"] });
    }
  });

  // src/features/boss-patterns/mouth-summon/model.js
  var MouthSummonBossPattern;
  var init_model13 = __esm({
    "src/features/boss-patterns/mouth-summon/model.js"() {
      init_model_base4();
      init_definition14();
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
      init_model_base4();
      init_model8();
      init_model9();
      init_model10();
      init_model11();
      init_model12();
      init_model13();
      init_boss_patterns();
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
      var WORLD_HEIGHT_PROJECTION2 = 0.785;
      var WORLD_DEPTH_PROJECTION3 = 0.62;
      function bossVectorScale3(radius) {
        return 2 * radius * BOSS_VECTOR_RADIUS_SCALE / BOSS_VECTOR_DIAMETER;
      }
      function socketWorldPoint2(boss, socket, ground) {
        const SCALE = bossVectorScale3(boss.radius);
        return {
          x: boss.x + (socket.x - ground.x) * SCALE,
          y: boss.y,
          z: (boss.z || 0) + (ground.y - socket.y) * SCALE / WORLD_HEIGHT_PROJECTION2
        };
      }
      module.exports = {
        readVectorSockets: readVectorSockets3,
        bossVectorScale: bossVectorScale3,
        socketWorldPoint: socketWorldPoint2,
        WORLD_HEIGHT_PROJECTION: WORLD_HEIGHT_PROJECTION2,
        WORLD_DEPTH_PROJECTION: WORLD_DEPTH_PROJECTION3
      };
    }
  });

  // src/boss-vector-sockets.js
  function bindBossSocketAsset(species, record) {
    const LABEL = `species ${species}, ${record.compiled.sourcePath || record.compiled.metadata.id}`;
    const ANCHORS = (0, import_vector_sockets.readVectorSockets)(record.compiled, LABEL);
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
      -import_vector_sockets.WORLD_DEPTH_PROJECTION * Math.sin(b.patternAim ?? b.angle),
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
    return (0, import_vector_sockets.socketWorldPoint)(boss, ENTRY.player.getSocket("mouth"), ANCHORS.ground);
  }
  var import_vector_sockets, CLAMP, BOSS_ASSETS;
  var init_boss_vector_sockets = __esm({
    "src/boss-vector-sockets.js"() {
      init_boss_patterns();
      import_vector_sockets = __toESM(require_vector_sockets(), 1);
      CLAMP = (x, a, b) => Math.max(a, Math.min(b, x));
      BOSS_ASSETS = /* @__PURE__ */ new Map();
    }
  });

  // src/features/unit-attacks/lob/definition.js
  var FEATURE14;
  var init_definition15 = __esm({
    "src/features/unit-attacks/lob/definition.js"() {
      FEATURE14 = Object.freeze({ id: "lob", modelKey: "projectile" });
    }
  });

  // src/features/unit-attacks/dual-strike/definition.js
  var FEATURE15;
  var init_definition16 = __esm({
    "src/features/unit-attacks/dual-strike/definition.js"() {
      FEATURE15 = Object.freeze({ id: "peanut-dual-strike", modelKey: "repeatedStrike" });
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
  function hasUnitCapability(species, capability) {
    const DEFINITION = UNIT_CAPABILITY_COMPOSITIONS[species];
    return !!DEFINITION && (DEFINITION.attack === capability || DEFINITION.traits.includes(capability));
  }
  function speciesWithCapability(capability) {
    return CAPABILITY_SPECIES.get(capability) || NO_SPECIES;
  }
  var ATTACK_DEFAULTS, UNIT_ABILITY_PROFILES, COMPOSITION, UNIT_CAPABILITY_COMPOSITIONS, CAPABILITY_SPECIES, NO_SPECIES;
  var init_unit_abilities = __esm({
    "src/unit-abilities.js"() {
      init_definition15();
      init_definition16();
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
        1: attackProfile(FEATURE14.id, {
          timing: {
            windup: 0.38,
            recovery: 1.25
          },
          range: 4.1,
          skillMultiplier: 1.6,
          projectileCount: 1
        }),
        2: attackProfile("leap", {
          timing: {
            windup: 0.32,
            recovery: 0.9
          },
          range: 2.5,
          skillMultiplier: 1.3
        }),
        3: attackProfile("punch"),
        // One Peanut remains one world unit; its two kernels are presentation-only
        // and the two deterministic strike slots share the same active window.
        4: attackProfile(FEATURE15.id, {
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
        ...options
      });
      UNIT_CAPABILITY_COMPOSITIONS = Object.freeze({
        0: COMPOSITION("contact", ["deathSplit"], {
          contactRecoil: true
        }),
        1: COMPOSITION(FEATURE14.modelKey, ["burstFire", "popcorn"], {
          retreatWithinRange: true,
          aimAtCenter: true
        }),
        2: COMPOSITION("contact", ["landing", "landingShockwave", "leapReset"]),
        3: COMPOSITION("contact", ["launchFan"], {
          contactRecoil: true
        }),
        4: COMPOSITION(FEATURE15.modelKey, ["assault"], {
          useActiveDuration: true,
          outerRangeSlack: 0
        }),
        5: COMPOSITION("contact", ["guard"], {
          useActiveDuration: true
        }),
        6: COMPOSITION("contact", ["harvest"], {
          contactRecoil: true
        }),
        7: COMPOSITION("contact", ["commandAura"], {
          contactRecoil: true
        }),
        8: COMPOSITION("contact", ["armorBreak"], {
          contactRecoil: true
        })
      });
      CAPABILITY_SPECIES = /* @__PURE__ */ new Map();
      for (const [SPECIES, DEFINITION] of Object.entries(UNIT_CAPABILITY_COMPOSITIONS)) {
        for (const CAPABILITY of /* @__PURE__ */ new Set([DEFINITION.attack, ...DEFINITION.traits])) {
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
    if (!isValidAbilityProgressionState(state) || !Number.isSafeInteger(state.level) || state.level < 1 || !Number.isFinite(state.experience) || state.experience < 0 || state.experience >= experienceForNextLevel(state.level) || !Array.isArray(state.processedBossKillReceipts) || !state.processedBossKillReceipts.every((key) => typeof key === "string" && key.length > 0) || new Set(state.processedBossKillReceipts).size !== state.processedBossKillReceipts.length) {
      return false;
    }
    const INVESTED_POINTS = Object.values(state.abilities).reduce(
      (total, investment) => total + Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel,
      0
    );
    return INVESTED_POINTS + getFarmUpgradeInvestedCount(state.farmUpgrades) + state.availablePoints === state.level - 1;
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
    if (!Number.isSafeInteger(stage) || stage < 1 || stage > BOSS_REWARD_SETTINGS.maxStage) {
      throw new RangeError(`Boss stage must be from 1 to ${BOSS_REWARD_SETTINGS.maxStage}`);
    }
    const EXPONENT = stage - 1;
    return {
      stage,
      hp: BOSS_REWARD_SETTINGS.stageHpBase * BOSS_REWARD_SETTINGS.stageHpMultiplier ** EXPONENT,
      attackPower: BOSS_REWARD_SETTINGS.stageAttackBase * BOSS_REWARD_SETTINGS.stageAttackMultiplier ** EXPONENT,
      xp: Math.round(BOSS_REWARD_SETTINGS.stageXpBase * BOSS_REWARD_SETTINGS.stageXpMultiplier ** EXPONENT),
      rolls: Math.floor(stage / 5)
    };
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
  function bossAcquisitionChance({ farmEvent = false, acquisitionMultiplier = 1 } = {}) {
    if (!Number.isFinite(acquisitionMultiplier) || acquisitionMultiplier < 0 || acquisitionMultiplier > 2) {
      throw new RangeError("Boss acquisition multiplier must be in [0, 2]");
    }
    const MULTIPLIER = farmEvent ? BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier : acquisitionMultiplier;
    return Math.min(1, Math.max(0, BOSS_REWARD_SETTINGS.acquisitionChance * MULTIPLIER));
  }
  function decideBossAcquisition({
    encounterId,
    source = "raid",
    random,
    species = 3,
    tier = 1,
    x = 0,
    y = 0,
    acquisitionMultiplier = 1,
    receiptKey = null
  } = {}) {
    if (!Number.isSafeInteger(encounterId) || encounterId < 1 || !["farm", "raid"].includes(source) || typeof random !== "function") {
      throw new TypeError("A boss encounter ID, source, and random roll are required");
    }
    if (receiptKey !== null && (typeof receiptKey !== "string" || !receiptKey.trim() || receiptKey.length > 255)) {
      throw new TypeError("Boss receipt key must be a non-empty string");
    }
    const CHANCE = bossAcquisitionChance({
      farmEvent: source === "farm",
      acquisitionMultiplier
    });
    const ROLL = random();
    if (!Number.isFinite(ROLL) || ROLL < 0 || ROLL >= 1) {
      throw new RangeError("Boss acquisition roll must be in [0, 1)");
    }
    return {
      encounterId,
      source,
      receiptKey: receiptKey || `${source}:${encounterId}`,
      acquisitionMultiplier: source === "farm" ? BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier : acquisitionMultiplier,
      species,
      tier,
      x,
      y,
      chance: CHANCE,
      roll: ROLL,
      status: ROLL < CHANCE ? "pending" : "missed",
      unitId: 0
    };
  }
  function grantPendingBossAcquisitions(world, { grantUnit = null } = {}) {
    const GRANTED = [];
    for (const REWARD2 of world.bossRewardReceipts || []) {
      if (REWARD2.status !== "pending") {
        continue;
      }
      const DROPS = Array.isArray(REWARD2.drops) ? REWARD2.drops : [
        {
          roll: REWARD2.roll,
          status: "pending",
          unitId: 0
        }
      ];
      for (const DROP2 of DROPS) {
        if (DROP2.status !== "pending") {
          continue;
        }
        const UNIT3 = grantUnit ? grantUnit({
          ...REWARD2,
          roll: DROP2.roll
        }) : world.units.length < world.capacity ? world.spawn(REWARD2.species, REWARD2.tier, REWARD2.x, REWARD2.y) : null;
        if (!UNIT3) {
          continue;
        }
        DROP2.status = "granted";
        DROP2.unitId = UNIT3.id;
        GRANTED.push({
          ...REWARD2,
          roll: DROP2.roll,
          unitId: UNIT3.id
        });
      }
      const PENDING = DROPS.some((drop) => drop.status === "pending");
      const SUCCESSFUL = DROPS.filter((drop) => drop.status === "granted");
      REWARD2.status = PENDING ? "pending" : SUCCESSFUL.length ? "granted" : "missed";
      REWARD2.unitId = PENDING ? 0 : SUCCESSFUL[0]?.unitId || 0;
      const EVENT = world.farmBossEvent;
      if (EVENT?.encounterId === REWARD2.encounterId) {
        EVENT.rewardStatus = REWARD2.status;
        EVENT.rewardUnitId = REWARD2.unitId;
      }
    }
    return GRANTED;
  }
  function resolveBossAcquisition(world, options) {
    const { encounterId: ENCOUNTER_ID, source: SOURCE = "raid" } = options || {};
    const REQUESTED_RECEIPT_KEY = options?.receiptKey;
    if (REQUESTED_RECEIPT_KEY !== void 0 && (typeof REQUESTED_RECEIPT_KEY !== "string" || !REQUESTED_RECEIPT_KEY.trim() || REQUESTED_RECEIPT_KEY.length > 255)) {
      throw new TypeError("Boss receipt key must be a non-empty string");
    }
    world.bossRewardReceipts ||= [];
    world.bossRewardWatermarks ||= {
      farm: 0,
      raid: 0
    };
    const PREVIOUS = world.bossRewardReceipts.find(
      (receipt) => REQUESTED_RECEIPT_KEY ? receipt.receiptKey === REQUESTED_RECEIPT_KEY : receipt.encounterId === ENCOUNTER_ID && receipt.source === SOURCE
    );
    if (PREVIOUS) {
      if (PREVIOUS.status === "pending") {
        grantPendingBossAcquisitions(world, {
          grantUnit: options?.grantUnit || null
        });
      }
      return PREVIOUS;
    }
    if (!["farm", "raid"].includes(SOURCE) || !Number.isSafeInteger(ENCOUNTER_ID) || ENCOUNTER_ID <= (world.bossRewardWatermarks[SOURCE] || 0)) {
      throw new RangeError("A settled or stale boss encounter cannot be rolled again");
    }
    const RANDOM = options?.random || (() => world.random());
    const ROLL_COUNT = options?.rollCount === void 0 ? 1 : options.rollCount;
    if (!Number.isSafeInteger(ROLL_COUNT) || ROLL_COUNT < 0 || ROLL_COUNT > BOSS_REWARD_SETTINGS.maxStage) {
      throw new RangeError("Boss drop roll count is out of range");
    }
    const DECISION = ROLL_COUNT > 0 ? decideBossAcquisition({
      ...options,
      random: RANDOM
    }) : {
      encounterId: ENCOUNTER_ID,
      source: SOURCE,
      receiptKey: options?.receiptKey || `${SOURCE}:${ENCOUNTER_ID}`,
      acquisitionMultiplier: SOURCE === "farm" ? BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier : options?.acquisitionMultiplier ?? 1,
      species: options?.species ?? 3,
      tier: options?.tier ?? 1,
      x: options?.x ?? 0,
      y: options?.y ?? 0,
      chance: bossAcquisitionChance({
        farmEvent: SOURCE === "farm",
        acquisitionMultiplier: options?.acquisitionMultiplier ?? 1
      }),
      roll: 0,
      status: "missed",
      unitId: 0
    };
    const DROPS = ROLL_COUNT > 0 ? [
      {
        roll: DECISION.roll,
        status: DECISION.roll < DECISION.chance ? "pending" : "missed",
        unitId: 0
      },
      ...Array.from(
        {
          length: ROLL_COUNT - 1
        },
        () => {
          const ROLL = RANDOM();
          if (!Number.isFinite(ROLL) || ROLL < 0 || ROLL >= 1) {
            throw new RangeError("Boss acquisition roll must be in [0, 1)");
          }
          return {
            roll: ROLL,
            status: ROLL < DECISION.chance ? "pending" : "missed",
            unitId: 0
          };
        }
      )
    ] : [];
    const RECEIPT = {
      ...DECISION,
      drops: DROPS,
      rollCount: ROLL_COUNT,
      roll: DROPS[0]?.roll ?? 0,
      status: DROPS.some((drop) => drop.status === "pending") ? "pending" : "missed",
      unitId: 0
    };
    world.bossRewardReceipts.push(RECEIPT);
    world.bossRewardWatermarks[SOURCE] = ENCOUNTER_ID;
    const SETTLED = world.bossRewardReceipts.filter((item) => item.status !== "pending");
    if (SETTLED.length > 128) {
      const REMOVE = new Set(SETTLED.slice(0, SETTLED.length - 128));
      world.bossRewardReceipts = world.bossRewardReceipts.filter((item) => !REMOVE.has(item));
    }
    const EVENT = world.farmBossEvent;
    if (EVENT?.encounterId === ENCOUNTER_ID) {
      EVENT.rewardStatus = RECEIPT.status;
      EVENT.rewardChance = RECEIPT.chance;
      EVENT.rewardRoll = RECEIPT.roll;
      EVENT.rewardUnitId = RECEIPT.unitId;
    }
    if (RECEIPT.status === "pending") {
      grantPendingBossAcquisitions(world, {
        grantUnit: options?.grantUnit || null
      });
    }
    return RECEIPT;
  }
  function settleBossKill(world, options) {
    const RECEIPT = resolveBossAcquisition(world, options);
    const PROGRESSION_OWNER = options?.progressionOwner || world;
    const WALLET = options?.playerProgression || PROGRESSION_OWNER.playerProgression;
    const RECEIPT_KEY = RECEIPT.xpReceiptKey || options?.receiptKey || RECEIPT.receiptKey || `${RECEIPT.source}:${RECEIPT.encounterId}`;
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
    const RESULT = awardBossKillXp(WALLET, RECEIPT_KEY, options?.xpAmount === void 0 ? void 0 : options.xpAmount);
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
    if (!progress || !Number.isSafeInteger(stage) || stage < 1 || stage > BOSS_REWARD_SETTINGS.maxStage) {
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
  function getAbilityGradeLevel(state, abilityId) {
    return abilityStateFor(state, abilityId)?.gradeLevel || 0;
  }
  function getMinimumApplicableTier(state, abilityId) {
    const DEFINITION = DEFINITION_BY_ID.get(abilityId);
    if (!DEFINITION) {
      return null;
    }
    const GRADE_LEVEL = getAbilityGradeLevel(state, abilityId);
    return DEFINITION.gradeThresholds[Math.min(GRADE_LEVEL, DEFINITION.gradeThresholds.length - 1)];
  }
  function isAbilityActive(state, abilityId, unitTier) {
    const INVESTMENT = abilityStateFor(state, abilityId);
    const MINIMUM_TIER = getMinimumApplicableTier(state, abilityId);
    return !!INVESTMENT?.rootUnlocked && Number.isInteger(unitTier) && unitTier >= MINIMUM_TIER;
  }
  function powerLevelFor(state, abilityId) {
    return getAbilityPowerLevel(state, abilityId);
  }
  function getInvestedPointCount(state) {
    if (!isValidAbilityProgressionState(state)) {
      return 0;
    }
    return Object.values(state.abilities).reduce(
      (total, investment) => total + Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel,
      0
    );
  }
  function canPurchaseAbilityNode(state, abilityId, nodeId, context = {}) {
    const DEFINITION = DEFINITION_BY_ID.get(abilityId);
    if (!DEFINITION) {
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
    if (!NODE) {
      return {
        allowed: false,
        reason: "unknown-node"
      };
    }
    if (NODE.kind === "root") {
      if (INVESTMENT.rootUnlocked) {
        return {
          allowed: false,
          reason: "already-invested"
        };
      }
      const HIGHEST_TIER = context.highestSpeciesTier?.[DEFINITION.species] ?? context.highestSpeciesTier ?? 0;
      if (!Number.isInteger(HIGHEST_TIER) || HIGHEST_TIER < DEFINITION.rootTier) {
        return {
          allowed: false,
          reason: "requires-rare-tier"
        };
      }
    } else {
      if (!INVESTMENT.rootUnlocked) {
        return {
          allowed: false,
          reason: "root-required"
        };
      }
      const CURRENT_LEVEL = NODE.kind === "power" ? INVESTMENT.powerLevel : INVESTMENT.gradeLevel;
      const MAX_LEVEL = NODE.kind === "power" ? DEFINITION.powerValues.length - 1 : DEFINITION.gradeThresholds.length - 1;
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
    if (NODE.kind === "root") {
      NEXT.abilities[abilityId].rootUnlocked = true;
    } else if (NODE.kind === "power") {
      NEXT.abilities[abilityId].powerLevel = NODE.level;
    } else {
      NEXT.abilities[abilityId].gradeLevel = NODE.level;
    }
    return {
      ok: true,
      reason: null,
      state: NEXT
    };
  }
  function canResetAbilityProgression(state, context = {}) {
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
    if (getInvestedPointCount(state) === 0) {
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
  function resetAbilityProgression(state, context = {}) {
    const CHECK = canResetAbilityProgression(state, context);
    if (!CHECK.allowed) {
      return {
        ok: false,
        reason: CHECK.reason,
        state
      };
    }
    const REFUNDED = getInvestedPointCount(state);
    const NEXT = cloneState(state);
    NEXT.availablePoints += REFUNDED;
    NEXT.abilities = Object.fromEntries(
      SPECIES_ABILITY_DEFINITIONS.map((definition) => [
        definition.id,
        {
          rootUnlocked: false,
          powerLevel: 0,
          gradeLevel: 0
        }
      ])
    );
    return {
      ok: true,
      reason: null,
      refunded: REFUNDED,
      state: NEXT
    };
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
    const INVESTMENT = state?.abilities?.[definition.id] || {
      rootUnlocked: false,
      powerLevel: 0,
      gradeLevel: 0
    };
    if (NODE.kind === "root" && INVESTMENT.rootUnlocked) {
      return {
        purchased: true,
        ready: false,
        reason: "already-invested"
      };
    }
    if (NODE.kind === "power" && NODE.level <= INVESTMENT.powerLevel) {
      return {
        purchased: true,
        ready: false,
        reason: "already-invested"
      };
    }
    if (NODE.kind === "grade" && NODE.level <= INVESTMENT.gradeLevel) {
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
    if (nodeId === "root") {
      return {
        kind: "root",
        level: 0
      };
    }
    const MATCH = /^(power|grade)-(\d+)$/.exec(String(nodeId || ""));
    if (!MATCH) {
      return null;
    }
    return {
      kind: MATCH[1],
      level: Number(MATCH[2])
    };
  }
  function cloneState(state) {
    return {
      ...state,
      farmUpgrades: {
        ...state.farmUpgrades
      },
      abilities: Object.fromEntries(
        Object.entries(state.abilities).map(([id, value]) => [
          id,
          {
            ...value
          }
        ])
      )
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
      init_ability_catalog();
      init_ability_state();
      init_player_progression();
      init_farm_upgrades();
      SHARED_ABILITY_POINT_COST = 1;
      DEFINITION_BY_ID = new Map(SPECIES_ABILITY_DEFINITIONS.map((definition) => [definition.id, definition]));
    }
  });

  // src/species-abilities.js
  function definitionFor(abilityId) {
    return DEFINITION_BY_ID2.get(abilityId) || null;
  }
  function getBeanSplitCount(progression, tier = 3) {
    const DEFINITION = definitionFor("pea-death-split");
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
      return 0;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return DEFINITION.powerValues[LEVEL] || DEFINITION.powerValues[0];
  }
  function getCornBurstConfig(progression, tier) {
    const DEFINITION = definitionFor("corn-burst-fire");
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
      return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return {
      species: 1,
      attackKind: "lob",
      projectileCount: DEFINITION.powerValues[LEVEL],
      perProjectileAttackMultiplier: abilityProfile(DEFINITION.species).skillMultiplier * DEFINITION.projectileAttackShare,
      skillMultiplierShare: DEFINITION.projectileAttackShare,
      oneBasicAttackCycle: true,
      timeSpaced: true
    };
  }
  function createCornBurstShotSchedule(config, { activeSeconds, recoverySeconds } = {}) {
    if (!config || !Number.isFinite(activeSeconds) || activeSeconds < 0 || !Number.isFinite(recoverySeconds) || recoverySeconds < 0) {
      return [];
    }
    const WINDOW_SECONDS = activeSeconds + recoverySeconds;
    if (!(WINDOW_SECONDS > 0) || !Number.isSafeInteger(config.projectileCount) || config.projectileCount < 1) {
      return [];
    }
    return Array.from(
      {
        length: config.projectileCount
      },
      (_, index) => ({
        shotIndex: index,
        delaySeconds: index * WINDOW_SECONDS / config.projectileCount,
        attackMultiplier: config.perProjectileAttackMultiplier
      })
    );
  }
  function getPopcornExplosionConfig(progression, tier) {
    const DEFINITION = definitionFor("corn-popcorn-chain");
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
      return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    const RADIUS_MULTIPLIER = DEFINITION.radiusMultipliers[LEVEL];
    return {
      species: DEFINITION.species,
      fuseSeconds: DEFINITION.fuseSeconds,
      chainOnPopcornContact: true,
      triggersOncePerProjectile: true,
      eachTargetAtMostOncePerProjectile: true,
      damageMultiplier: DEFINITION.powerValues[LEVEL],
      radiusBaseRangeFraction: DEFINITION.baseRangeFraction,
      radiusMultiplier: RADIUS_MULTIPLIER,
      radius: abilityProfile(DEFINITION.species).range * DEFINITION.baseRangeFraction * RADIUS_MULTIPLIER
    };
  }
  function getChestnutSpikeConfig(progression, tier) {
    const DEFINITION = definitionFor("chestnut-spike-fan");
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
      return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return {
      species: DEFINITION.species,
      targetPattern: "fan-toward-target",
      projectileCount: DEFINITION.powerValues[LEVEL],
      projectileAttackMultiplier: DEFINITION.projectileAttackMultiplier,
      fanSpreadRadians: DEFINITION.fanSpreadRadians,
      intervalBasicCycles: DEFINITION.intervalBasicCycles
    };
  }
  function getChestnutSpikeIntervalSeconds(config, basicAttackCycleSeconds) {
    if (!config || !Number.isFinite(basicAttackCycleSeconds) || basicAttackCycleSeconds <= 0) {
      return null;
    }
    return config.intervalBasicCycles * basicAttackCycleSeconds;
  }
  function getChestnutSpikeFanAngles(config, targetAngle) {
    if (!config || !Number.isSafeInteger(config.projectileCount) || config.projectileCount < 1 || !Number.isFinite(config.fanSpreadRadians) || config.fanSpreadRadians < 0 || !Number.isFinite(targetAngle)) {
      return [];
    }
    if (config.projectileCount === 1) {
      return [targetAngle];
    }
    const START = targetAngle - config.fanSpreadRadians / 2;
    const STEP = config.fanSpreadRadians / (config.projectileCount - 1);
    return Array.from(
      {
        length: config.projectileCount
      },
      (_, index) => START + STEP * index
    );
  }
  function createBeanSplitDescriptors({ unit, progression, inBattle = false } = {}) {
    if (!inBattle || !unit || !hasUnitCapability(unit.species, "deathSplit") || !Number.isFinite(unit.hp) || unit.hp > 0 || unit.isBattleOnlySummon || unit.battleOnlySummon || unit.canSplit === false || unit.splitUsedThisBattle === true) {
      return [];
    }
    const COUNT = getBeanSplitCount(progression, unit.tier);
    if (!COUNT) {
      return [];
    }
    return Array.from(
      {
        length: COUNT
      },
      () => ({
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
      })
    );
  }
  function getContinuousLeapConfig(progression, tier) {
    const DEFINITION = definitionFor("kidney-continuous-leap");
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
      return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return {
      cooldownResetChance: DEFINITION.powerValues[LEVEL],
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
    const DEFINITION = definitionFor("kidney-landing-shockwave");
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
      return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    const MULTIPLIER = DEFINITION.powerValues[LEVEL];
    return {
      damageMultiplier: MULTIPLIER,
      radiusMultiplier: MULTIPLIER,
      triggersOncePerLanding: true,
      // Repeated shockwaves happen only when the separate continuous-leap tree
      // causes another leap to occur; this module invents no timing or loop.
      repeatedAfterCooldownReset: isAbilityActive(progression, "kidney-continuous-leap", tier)
    };
  }
  function getRiceHarvestMultiplier(progression, tier, targetHp, targetMaxHp) {
    const DEFINITION = definitionFor("rice-low-health-harvest");
    if (!isAbilityActive(progression, DEFINITION.id, tier) || !Number.isFinite(targetHp) || !Number.isFinite(targetMaxHp) || targetMaxHp <= 0 || targetHp / targetMaxHp > DEFINITION.targetHpThreshold) {
      return 1;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return DEFINITION.powerValues[LEVEL] || DEFINITION.powerValues[0];
  }
  function getWheatCommandConfig(progression, tier) {
    const DEFINITION = definitionFor("wheat-command-crit");
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
      return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return {
      critBonus: DEFINITION.powerValues[LEVEL] || DEFINITION.powerValues[0],
      durationSeconds: DEFINITION.durationSeconds,
      radius: abilityProfile(DEFINITION.species).range * DEFINITION.radiusRangeRatio,
      radiusRangeRatio: DEFINITION.radiusRangeRatio
    };
  }
  function refreshWheatCommandBuff(source, config, now, durationSeconds = config?.durationSeconds) {
    if (!source || !config || !Number.isFinite(now) || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
      return false;
    }
    const CURRENT_UNTIL = Number.isFinite(source.wheatCommandUntil) ? source.wheatCommandUntil : 0;
    const CURRENT_BONUS = Number.isFinite(source.wheatCommandCritBonus) ? source.wheatCommandCritBonus : 0;
    source.wheatCommandUntil = now + durationSeconds;
    source.wheatCommandCritBonus = Math.max(CURRENT_UNTIL > now ? CURRENT_BONUS : 0, config.critBonus);
    return true;
  }
  function getBarleyArmorBreakConfig(progression, tier) {
    const DEFINITION = definitionFor("barley-armor-break");
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
      return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return {
      armorReduction: DEFINITION.powerValues[LEVEL] || DEFINITION.powerValues[0],
      durationSeconds: DEFINITION.durationSeconds
    };
  }
  function refreshBarleyArmorBreak(target, config, now, durationSeconds = config?.durationSeconds) {
    if (!target || !config || !Number.isFinite(now) || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
      return false;
    }
    const CURRENT_UNTIL = Number.isFinite(target.barleyArmorBreakUntil) ? target.barleyArmorBreakUntil : 0;
    const CURRENT_REDUCTION = Number.isFinite(target.barleyArmorBreakReduction) ? target.barleyArmorBreakReduction : 0;
    const ACTIVE_REDUCTION = CURRENT_UNTIL > now ? CURRENT_REDUCTION : 0;
    target.barleyArmorBreakUntil = now + durationSeconds;
    target.barleyArmorBreakReduction = Math.max(ACTIVE_REDUCTION, config.armorReduction);
    return true;
  }
  function effectiveBarleyArmor(target, baselineArmor, now) {
    const REDUCTION = target && Number.isFinite(target.barleyArmorBreakUntil) && target.barleyArmorBreakUntil > now && Number.isFinite(target.barleyArmorBreakReduction) ? Math.max(0, Math.min(1, target.barleyArmorBreakReduction)) : 0;
    return Math.max(0, Number.isFinite(baselineArmor) ? baselineArmor : 0) * (1 - REDUCTION);
  }
  function getPeanutAssaultConfig(progression, tier) {
    const DEFINITION = definitionFor("peanut-separated-assault");
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
      return null;
    }
    return {
      strikeCount: DEFINITION.powerValues[powerLevelFor(progression, DEFINITION.id)],
      attackMultiplier: DEFINITION.strikeAttackMultiplier,
      spreadRadians: DEFINITION.spreadRadians
    };
  }
  function getWalnutGuardConfig(progression, tier) {
    const DEFINITION = definitionFor("walnut-guard-slam");
    if (!isAbilityActive(progression, DEFINITION.id, tier)) {
      return null;
    }
    const LEVEL = powerLevelFor(progression, DEFINITION.id);
    return {
      damageMultiplier: DEFINITION.powerValues[LEVEL],
      receivedDamageMultiplier: DEFINITION.receivedDamageMultiplier,
      receivedKnockbackMultiplier: DEFINITION.receivedKnockbackMultiplier,
      guardRecoveryStartFraction: DEFINITION.guardRecoveryStartFraction,
      radius: abilityProfile(DEFINITION.species).range * DEFINITION.radiusBaseRangeFraction * DEFINITION.radiusMultipliers[LEVEL]
    };
  }
  function isWalnutGuardActive(unit, config, recoverySeconds) {
    return !!config && hasUnitCapability(unit?.species, "guard") && unit.hp > 0 && unit.down <= 0 && unit.stun <= 0 && unit.z <= 0.1 && unit.ability?.phase === "recover" && !!unit.ability.action && !unit.ability.action.walnutEmpowered && !unit.ability.action.walnutGuardUsed && unit.ability.elapsed >= recoverySeconds * config.guardRecoveryStartFraction && unit.ability.elapsed < recoverySeconds;
  }
  var DEFINITION_BY_ID2, MAX_BEAN_SPLIT_CHILDREN;
  var init_species_abilities = __esm({
    "src/species-abilities.js"() {
      init_ability_progression();
      init_ability_catalog();
      init_unit_abilities();
      DEFINITION_BY_ID2 = new Map(SPECIES_ABILITY_DEFINITIONS.map((definition) => [definition.id, definition]));
      MAX_BEAN_SPLIT_CHILDREN = Math.max(...DEFINITION_BY_ID2.get("pea-death-split").powerValues);
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
  var init_model14 = __esm({
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
        const U = this.owner, A = this.action, POPCORN_LOCAL = this.projectileEffect?.(sim) || null, SHOTS = this.projectileShots(sim);
        A.pendingShots = SHOTS.slice(1);
        A.projectileAbility = {
          popcorn: POPCORN_LOCAL
        };
        sim.spawnLobProjectile(U, A, SHOTS[0], POPCORN_LOCAL);
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
            this.action.projectileAbility?.popcorn || null
          );
        }
      }
    };
    return PROJECTILE_ATTACK;
  }
  var init_model15 = __esm({
    "src/features/unit-attacks/lob/model.js"() {
    }
  });

  // src/unit-attack-capabilities.js
  function composeUnitAttackCycles(cycle, { ArenaGeometry: arenaGeometry, Ballistics: ballistics, CONFIG: configLocal }) {
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
        const P = ballistics.sample(A.path, this.elapsed / A.path.duration);
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
        const AREA_RADIUS = scaleAttackArea(U.radius, U), HIT = !A.hit && arenaGeometry.sweep(old, U, AREA_RADIUS, 0.65, TARGET);
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
            height: 0.65
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
    const LANDING_SHOCKWAVE = (base) => class extends base {
      resolveLandingEffects(sim) {
        const RESET = super.resolveLandingEffects?.(sim), U = this.owner;
        const CONFIG_LOCAL = getLandingShockwaveConfig(sim.abilityProgressionFor(U), U.tier);
        if (CONFIG_LOCAL) {
          sim.triggerLandingShockwave(U, this.action, CONFIG_LOCAL);
        }
        return RESET;
      }
    };
    const LEAP_RESET = (base) => class extends base {
      resolveLandingEffects(sim) {
        if (super.resolveLandingEffects?.(sim)) {
          return true;
        }
        const U = this.owner, CONFIG_LOCAL = getContinuousLeapConfig(sim.abilityProgressionFor(U), U.tier);
        if (!CONFIG_LOCAL || !shouldResetLeapCooldown(CONFIG_LOCAL, sim.random())) {
          return false;
        }
        this.ready();
        sim.combat("leap-cooldown-reset", {
          unit: U.id,
          ownerId: U.ownerId,
          species: U.species
        });
        return true;
      }
    };
    const ASSAULT = (base) => class extends base {
      strikeConfig(sim) {
        return getPeanutAssaultConfig(sim.abilityProgressionFor(this.owner), this.owner.tier);
      }
    };
    const BURST_FIRE = (base) => class extends base {
      projectileShots(sim) {
        const U = this.owner, CONFIG_LOCAL = getCornBurstConfig(sim.abilityProgressionFor(U), U.tier);
        return CONFIG_LOCAL ? createCornBurstShotSchedule(CONFIG_LOCAL, {
          activeSeconds: 0,
          recoverySeconds: scaleAttackRecovery(this.spec.timing.recovery, U)
        }) : super.projectileShots(sim);
      }
    };
    const POPCORN2 = (base) => class extends base {
      projectileEffect(sim) {
        return getPopcornExplosionConfig(sim.abilityProgressionFor(this.owner), this.owner.tier);
      }
    };
    const GUARD = (base) => class extends base {
      resetCombatEffects() {
        super.resetCombatEffects?.();
        this.owner.walnutEmpoweredNextBasic = false;
      }
      prepareAttack(sim) {
        super.prepareAttack?.(sim);
        const U = this.owner, GUARD_LOCAL = getWalnutGuardConfig(sim.abilityProgressionFor(U), U.tier);
        Object.assign(this.action, {
          walnutEmpowered: !!GUARD_LOCAL && U.walnutEmpoweredNextBasic,
          walnutGuardUsed: false
        });
        U.walnutEmpoweredNextBasic = false;
      }
      guardConfig(sim) {
        const U = this.owner, CONFIG_LOCAL = getWalnutGuardConfig(sim.abilityProgressionFor(U), U.tier);
        return isWalnutGuardActive(U, CONFIG_LOCAL, scaleAttackRecovery(this.spec.timing.recovery, U)) ? CONFIG_LOCAL : null;
      }
      receiveGuard(sim) {
        const CONFIG_LOCAL = this.guardConfig(sim);
        if (!CONFIG_LOCAL) {
          return null;
        }
        this.action.walnutGuardUsed = true;
        this.owner.walnutEmpoweredNextBasic = true;
        const U = this.owner;
        sim.combat("walnut-guard", {
          unit: U.id,
          x: U.x,
          y: U.y,
          z: U.z
        });
        return CONFIG_LOCAL;
      }
      resolveAttackHit(sim, action, target, point2, options) {
        return action.walnutEmpowered ? sim.triggerWalnutSlam(this.owner, action, target, point2) : super.resolveAttackHit(sim, action, target, point2, options);
      }
    };
    const LAUNCH_FAN = (base) => class extends base {
      onLaunch(sim, action) {
        super.onLaunch?.(sim, action);
        const U = this.owner, CONFIG_LOCAL = getChestnutSpikeConfig(sim.abilityProgressionFor(U), U.tier);
        if (!CONFIG_LOCAL || sim.projectiles.length + CONFIG_LOCAL.projectileCount > configLocal.raid.capacity.projectiles) {
          return;
        }
        const CYCLE_SECONDS = this.spec.timing.windup + scaleAttackRecovery(this.spec.timing.recovery, U), INTERVAL = getChestnutSpikeIntervalSeconds(CONFIG_LOCAL, CYCLE_SECONDS);
        if (!Number.isFinite(INTERVAL) || INTERVAL <= 0) {
          return;
        }
        U.chestnutBasicCycles++;
        if (U.chestnutBasicCycles % CONFIG_LOCAL.intervalBasicCycles === 0) {
          sim.spawnChestnutSpikes(U, action, CONFIG_LOCAL);
        }
      }
    };
    const DEATH_SPLIT = (base) => class extends base {
      deathSplitDescriptors(sim, inBattle) {
        return createBeanSplitDescriptors({
          unit: this.owner,
          progression: sim.abilityProgressionFor(this.owner),
          inBattle
        });
      }
    };
    const HARVEST = (base) => class extends base {
      harvestMultiplier(sim, hp, maxHp) {
        return getRiceHarvestMultiplier(sim.abilityProgressionFor(this.owner), this.owner.tier, hp, maxHp);
      }
    };
    const COMMAND_AURA = (base) => class extends base {
      commandAuraConfig(sim) {
        return getWheatCommandConfig(sim.abilityProgressionFor(this.owner), this.owner.tier);
      }
      onBasicHit(sim, target) {
        super.onBasicHit?.(sim, target);
        const U = this.owner, CONFIG_LOCAL = this.commandAuraConfig(sim);
        if (CONFIG_LOCAL) {
          refreshWheatCommandBuff(
            U,
            CONFIG_LOCAL,
            sim.time,
            resolveStatusDuration(CONFIG_LOCAL.durationSeconds, U, null)
          );
        }
      }
    };
    const ARMOR_BREAK = (base) => class extends base {
      onBasicHit(sim, target) {
        super.onBasicHit?.(sim, target);
        const U = this.owner, CONFIG_LOCAL = getBarleyArmorBreakConfig(sim.abilityProgressionFor(U), U.tier);
        if (CONFIG_LOCAL) {
          refreshBarleyArmorBreak(
            target,
            CONFIG_LOCAL,
            sim.time,
            resolveStatusDuration(CONFIG_LOCAL.durationSeconds, U, target)
          );
        }
      }
    };
    const ATTACKS = {
      contact: CONTACT_ATTACK,
      [FEATURE14.modelKey]: PROJECTILE_ATTACK,
      [FEATURE15.modelKey]: REPEATED_STRIKE
    };
    const TRAITS = {
      landing: LANDING,
      landingShockwave: LANDING_SHOCKWAVE,
      leapReset: LEAP_RESET,
      assault: ASSAULT,
      burstFire: BURST_FIRE,
      popcorn: POPCORN2,
      guard: GUARD,
      launchFan: LAUNCH_FAN,
      deathSplit: DEATH_SPLIT,
      harvest: HARVEST,
      commandAura: COMMAND_AURA,
      armorBreak: ARMOR_BREAK
    };
    const MIXIN = (base, ...capabilities) => {
      for (const CAPABILITY of new Set(capabilities)) {
        base = CAPABILITY(base);
      }
      return base;
    };
    const CLASSES = /* @__PURE__ */ new Map();
    for (const DEFINITION of Object.values(UNIT_CAPABILITY_COMPOSITIONS)) {
      CLASSES.set(
        DEFINITION,
        MIXIN(cycle, ATTACKS[DEFINITION.attack], ...DEFINITION.traits.map((name) => TRAITS[name]))
      );
    }
    return (owner) => new (CLASSES.get(unitCapabilityComposition(owner.species)))(owner);
  }
  var init_unit_attack_capabilities = __esm({
    "src/unit-attack-capabilities.js"() {
      init_model14();
      init_definition16();
      init_model15();
      init_definition15();
      init_unit_abilities();
      init_unit_stats();
      init_species_abilities();
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
  function contact(a, b) {
    const DX = b.x - a.x, DY = b.y - a.y, D_LOCAL = Math.hypot(DX, DY), R_LOCAL = a.radius + b.radius;
    if (Math.abs(a.z - b.z) > 0.65) {
      return false;
    }
    if (D_LOCAL >= R_LOCAL) {
      if (D_LOCAL < R_LOCAL + 0.22 && a.z < 0.1 && b.z < 0.1 && a.ability.phase === "idle" && b.ability.phase === "idle") {
        const K = (R_LOCAL + 0.22 - D_LOCAL) * 0.035 / (D_LOCAL || 1);
        a.x -= DX * K;
        a.y -= DY * K;
        b.x += DX * K;
        b.y += DY * K;
      }
      return false;
    }
    const NX = D_LOCAL > 1e-6 ? DX / D_LOCAL : 1, NY = D_LOCAL > 1e-6 ? DY / D_LOCAL : 0, OVERLAP = R_LOCAL - D_LOCAL;
    a.x -= NX * OVERLAP * 0.5;
    a.y -= NY * OVERLAP * 0.5;
    b.x += NX * OVERLAP * 0.5;
    b.y += NY * OVERLAP * 0.5;
    const CLOSING = (a.vx - b.vx) * NX + (a.vy - b.vy) * NY;
    if (CLOSING > 0) {
      const IMPULSE = CLOSING * 0.57;
      const IMPULSE_A = resolveKnockback(IMPULSE, b, a), IMPULSE_B = resolveKnockback(IMPULSE, a, b);
      a.vx -= NX * IMPULSE_A;
      a.vy -= NY * IMPULSE_A;
      b.vx += NX * IMPULSE_B;
      b.vy += NY * IMPULSE_B;
      if (CLOSING > 2) {
        const RECEIVER = Math.hypot(a.vx, a.vy) > Math.hypot(b.vx, b.vy) ? a : b;
        RECEIVER.vz = Math.max(RECEIVER.vz, Math.min(4, CLOSING * 0.2));
        RECEIVER.stun = Math.max(RECEIVER.stun, resolveStatusDuration(0.3, RECEIVER === a ? b : a, RECEIVER));
        RECEIVER.flash = 0.1;
      }
    }
    return true;
  }
  var SEEDED_PRNG, PRESENTATION_CLOCKS, PRESENTATION_EVENT_TIMES, BREED_COOLDOWN_SECONDS, FARM_MAX_UNITS, RAID_PLAYER_UNITS, RAID_MAX_PLAYERS, RAID_PLAYER_ID_STRIDE, MAX_BOSS_SUMMONS, RAID_MAX_UNITS, WORLD_ARENA, UNIT_RADIUS_FOR_TIER, CONFIG, CLAMP2, STATS, BODY, KNOCKABLE, ARENA_GEOMETRY, BALLISTICS, FARM_BOSS_PHASES, PROJECTILE_BEHAVIORS, FARM_MODES, BOSS_BEHAVIORS, AttackCycle, CREATE_UNIT_ATTACK_CYCLE, SIMULATION_SCENES, ATTACKING_BODY, UNIT, GARDEN;
  var init_farm_model = __esm({
    "src/farm-model.js"() {
      init_simulation_scenes();
      init_projectile_behaviors();
      init_boss_event_phases();
      init_farm_mode_behaviors();
      init_boss_pattern_behaviors();
      init_boss_vector_sockets();
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
      init_unit_attack_capabilities();
      init_unit_grades();
      init_boss_patterns();
      init_factions();
      init_spatial_grid();
      ({ SeededPRNG: SEEDED_PRNG } = globalThis.BloomGamekitDeterministic);
      PRESENTATION_CLOCKS = /* @__PURE__ */ new WeakMap();
      PRESENTATION_EVENT_TIMES = /* @__PURE__ */ new WeakMap();
      BREED_COOLDOWN_SECONDS = 10;
      FARM_MAX_UNITS = 100;
      RAID_PLAYER_UNITS = 100;
      RAID_MAX_PLAYERS = 4;
      RAID_PLAYER_ID_STRIDE = 1e6;
      MAX_BOSS_SUMMONS = 10;
      RAID_MAX_UNITS = RAID_PLAYER_UNITS * RAID_MAX_PLAYERS;
      WORLD_ARENA = Object.freeze({
        radiusX: 23,
        radiusY: 17
      });
      UNIT_RADIUS_FOR_TIER = (tier) => 0.25 + 0.055 * tier;
      CONFIG = Object.freeze({
        factions: FACTION_CONFIG,
        farm: Object.freeze({
          arena: WORLD_ARENA,
          capacity: Object.freeze({
            base: 50,
            max: FARM_MAX_UNITS,
            battleUnits: FARM_MAX_UNITS * (1 + MAX_BEAN_SPLIT_CHILDREN) + MAX_BOSS_SUMMONS
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
            battleUnits: RAID_MAX_UNITS * (1 + MAX_BEAN_SPLIT_CHILDREN) + MAX_BOSS_SUMMONS,
            projectiles: RAID_MAX_UNITS * (1 + MAX_BEAN_SPLIT_CHILDREN) * 4 + 40
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
        scatter: Object.freeze({
          minRadius: UNIT_RADIUS_FOR_TIER(1) * 4,
          maxRadius: UNIT_RADIUS_FOR_TIER(1) * 10,
          bodyMargin: 0.08,
          hysteresis: 0.18
        }),
        unit: Object.freeze({
          speciesCount: SPECIES_COUNT,
          maxTier: MAX_UNIT_TIER,
          maxRadius: UNIT_RADIUS_FOR_TIER(MAX_UNIT_TIER),
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
          fixedStep: 1 / 120
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
        sample(path, q) {
          q = CLAMP2(q, 0, 1);
          return {
            x: path.from.x + (path.to.x - path.from.x) * q,
            y: path.from.y + (path.to.y - path.from.y) * q,
            z: path.from.z * (1 - q) + 4 * path.height * q * (1 - q)
          };
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
          this.phase = "idle";
          this.elapsed = 0;
          this.action = null;
        }
        get spec() {
          return abilityProfile(this.owner.species);
        }
        get composition() {
          return unitCapabilityComposition(this.owner.species);
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
            hit: false,
            path: null
          };
          this.prepareAttack?.(sim);
          U.angle = Math.atan2(target.y - U.y, target.x - U.x);
          U.vx = U.vy = 0;
          sim.combatEvent("prepare", U, this.action);
          return true;
        }
        cancelForScatter() {
          if (this.action?.pendingShots) {
            this.action.pendingShots.length = 0;
          }
          if (this.phase === "windup" || this.phase === "active") {
            this.phase = "recover";
            this.elapsed = 0;
            this.owner.vx = this.owner.vy = 0;
          }
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
          const U = this.owner;
          if (recoil) {
            U.vx = -Math.cos(U.angle) * 2.2;
            U.vy = -Math.sin(U.angle) * 2.2;
          }
          sim.combatEvent("recover", U, this.action);
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
          if (this.phase === "idle") {
            return false;
          }
          this.elapsed += dt;
          if (this.phase === "windup") {
            U.vx *= Math.exp(-dt * 18);
            U.vy *= Math.exp(-dt * 18);
            if (this.elapsed >= this.spec.timing.windup) {
              this.elapsed = 0;
              this.phase = "active";
              this.createAttackPath();
              sim.combatEvent("launch", U, this.action);
              this.launchAttack?.(sim);
            }
          } else if (this.phase === "recover") {
            this.updateRecovery?.(sim);
            if (this.elapsed >= scaleAttackRecovery(this.spec.timing.recovery, U)) {
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
          this.ability.interrupt();
          super.knock(...args);
        }
        integrate(dt) {
          if (!this.ability.integrate(dt)) {
            super.integrate(dt);
          }
        }
      };
      UNIT = class Unit extends ATTACKING_BODY(KNOCKABLE(BODY)) {
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
          this.ability = CREATE_UNIT_ATTACK_CYCLE(this);
        }
        get radius() {
          return UNIT_RADIUS_FOR_TIER(this.tier) * (this.mature ? 1 : 0.8);
        }
        get mature() {
          return this.growthElapsed >= this.growthDuration - 1e-9;
        }
        get fed() {
          return this.meals >= 1;
        }
        get size() {
          const GROWTH = this.mature ? 1 : this.growthDuration > 0 ? CLAMP2(this.growthElapsed / this.growthDuration, 0, 1) : 1;
          return (0.55 + 0.1 * this.tier) * (0.5 + 0.5 * GROWTH);
        }
      };
      GARDEN = class Garden {
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
            "_groundedFoodCount",
            "_contactPending",
            "_contactExtra",
            "_contactQuery",
            "_contactSeen",
            "_contactGeneration",
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
          Object.defineProperties(this, {
            progressRevision: {
              value: 0,
              writable: true
            },
            _progressTimerCheckpoint: {
              value: 0,
              writable: true
            },
            localScatter: {
              value: {
                active: false,
                x: 0,
                y: 0,
                radius: CONFIG.scatter.minRadius,
                handleX: 0,
                handleY: 0,
                generation: 0
              }
            },
            _scatterStates: {
              value: /* @__PURE__ */ new WeakMap()
            }
          });
          this.reset();
        }
        _rebuildUnitSpatialIndex(stepUnits = this.units) {
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
          for (let index = 0; index < stepUnits.length; index++) {
            this._unitStepOrder.set(stepUnits[index], index);
          }
          this._unitSpatialDirty = false;
        }
        _rebuildFoodSpatialIndex() {
          this.foodSpatial.clear();
          this._foodOrder.clear();
          let grounded = 0;
          this._groundedFoods.length = 0;
          for (let index = 0; index < this.food.length; index++) {
            const FOOD = this.food[index];
            this._foodOrder.set(FOOD, index);
            if (FOOD.phase === "grounded") {
              this.foodSpatial.insert(FOOD);
              this._groundedFoods.push(FOOD);
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
          if (unit.species >= 0 && unit.species < CONFIG.unit.speciesCount) {
            this._speciesGroups[unit.species].push(unit);
            this._ownedSpeciesCounts[unit.species] += unit.isBattleOnlySummon ? 0 : 1;
            const TIER = Math.max(0, Math.min(CONFIG.unit.maxTier, unit.tier | 0));
            this._speciesTierGroups[unit.species * (CONFIG.unit.maxTier + 1) + TIER].push(unit);
          }
          if (unit.hp > 0 && typeof unit.faction === "string") {
            this._liveFactionCounts.set(unit.faction, (this._liveFactionCounts.get(unit.faction) || 0) + 1);
          }
          this._unitAliveState.set(unit, unit.hp > 0);
        }
        _trackUnitRemoved(unit, { keepStepSnapshot = false } = {}) {
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
              this._ownedSpeciesCounts[unit.species] = Math.max(0, this._ownedSpeciesCounts[unit.species] - 1);
            }
          }
          if (!keepStepSnapshot || !this._unitStepOrder.has(unit) || this._unitStepOrder.get(unit) < 0) {
            this.unitSpatial.remove(unit);
            this._unitStepOrder.delete(unit);
          }
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
        _nextContactGeneration(length) {
          if (this._contactSeen.length < length) {
            this._contactSeen = new Uint32Array(Math.max(length, this._contactSeen.length * 2, 16));
          }
          this._contactGeneration = this._contactGeneration + 1 >>> 0;
          if (this._contactGeneration === 0) {
            this._contactSeen.fill(0);
            this._contactGeneration = 1;
          }
          return this._contactGeneration;
        }
        _insertContactOrder(order, lastOrder, pending, generation) {
          if (order <= lastOrder || this._contactSeen[order] === generation) {
            return;
          }
          this._contactSeen[order] = generation;
          let low = 0;
          let high = pending.length;
          while (low < high) {
            const MIDDLE = low + high >>> 1;
            if (pending[MIDDLE] < order) {
              low = MIDDLE + 1;
            } else {
              high = MIDDLE;
            }
          }
          pending.splice(low, 0, order);
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
          W.units = [];
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
          this.clearLocalScatter();
          this.progressRevision = 0;
          this._progressTimerCheckpoint = 0;
          this.mergeTask = null;
          this._stepUnits.length = 0;
          this.corpseRecoveryVersion = 1;
          this.rng = new SEEDED_PRNG(this.seed);
          this.units = [];
          this.food = [];
          this.effects = [];
          this.events = [];
          this.time = 0;
          this.nextId = 1;
          this.nextBossEncounterId = 1;
          this.bossRewardReceipts = [];
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
          this.attackSerial = 0;
          this.projectileSerial = 0;
          this.raidSummonSerial = 0;
          this.bossSummonSerial = 0;
          this.combatLog = [];
          this.farmBossProgress = createFarmBossProgress(this.seed);
          this.mode = "breed";
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
        markProgressChanged() {
          if (this.scene === "farm") {
            this.progressRevision++;
          }
        }
        hasProgressTimers() {
          return this.units.some(
            (unit) => !unit.isBattleOnlySummon && (unit.down > 0 || unit.cooldown > 0 || !unit.mature)
          );
        }
        get armyHealth() {
          return this.units.filter((u) => hasFaction(u, FACTION_CONFIG.PLAYER)).reduce(
            (sum, u) => {
              const MAX_HP = STATS(u.tier, u.species).maxHp;
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
        get capacity() {
          return getFarmCapacity(this.playerProgression?.farmUpgrades);
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
          for (const UNIT_LOCAL of this.units) {
            if (!UNIT_LOCAL.isBattleOnlySummon) {
              TIERS[UNIT_LOCAL.species] = Math.max(TIERS[UNIT_LOCAL.species], UNIT_LOCAL.tier);
            }
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
            this.markProgressChanged();
          }
          return RESULT;
        }
        resetAbilityTree() {
          const IN_COMBAT = this.running || this.farmBossEvent?.phase !== "idle";
          const RESULT = resetAbilityProgression(this.playerProgression, {
            location: this.scene,
            inCombat: IN_COMBAT
          });
          if (RESULT.ok) {
            this.playerProgression = RESULT.state;
            this.markProgressChanged();
          }
          return RESULT;
        }
        spawnLobProjectile(unit, action, shot, popcornConfig = null) {
          if (this.projectiles.length >= CONFIG.raid.capacity.projectiles) {
            return null;
          }
          const ID = ++this.projectileSerial;
          const PROJECTILE2 = {
            id: ID,
            owner: unit.id,
            targetId: action.targetId || "boss",
            faction: unit.faction,
            ownerId: unit.ownerId,
            species: unit.species,
            tier: unit.tier,
            path: structuredClone(action.path),
            elapsed: 0,
            x: unit.x,
            y: unit.y,
            z: 0.45,
            radius: scaleAttackArea(0.12, unit),
            height: 0.24,
            hit: false,
            attackMultiplier: shot.attackMultiplier ?? this.speciesAbilityDamageMultiplier(unit),
            shotIndex: shot.shotIndex ?? 0
          };
          if (popcornConfig) {
            Object.assign(PROJECTILE2, {
              isPopcorn: true,
              popcornConfig: structuredClone(popcornConfig),
              landed: false,
              exploded: false,
              fuseRemaining: popcornConfig.fuseSeconds,
              damagedTargetIds: []
            });
          }
          this.projectiles.push(PROJECTILE2);
          return PROJECTILE2;
        }
        speciesAbilityDamageMultiplier(unit) {
          return abilityProfile(unit.species).skillMultiplier;
        }
        spawnChestnutSpikes(unit, action, config) {
          if (this.projectiles.length + config.projectileCount > CONFIG.raid.capacity.projectiles) {
            return false;
          }
          const ANGLE = Math.atan2(action.target.y - unit.y, action.target.x - unit.x), ANGLES = getChestnutSpikeFanAngles(config, ANGLE), DISTANCE = Math.hypot(action.target.x - unit.x, action.target.y - unit.y), LENGTH = Math.max(abilityProfile(unit.species).range, DISTANCE) + this.boss.radius;
          for (let index = 0; index < ANGLES.length; index++) {
            const A_LOCAL = ANGLES[index], TARGET = {
              x: unit.x + Math.cos(A_LOCAL) * LENGTH,
              y: unit.y + Math.sin(A_LOCAL) * LENGTH,
              z: 0
            }, PATH2 = BALLISTICS.create(
              {
                x: unit.x,
                y: unit.y,
                z: 0
              },
              TARGET,
              "punch"
            );
            PATH2.height = 0.7;
            this.projectiles.push({
              id: ++this.projectileSerial,
              owner: unit.id,
              faction: unit.faction,
              ownerId: unit.ownerId,
              species: unit.species,
              tier: unit.tier,
              path: PATH2,
              elapsed: 0,
              x: unit.x,
              y: unit.y,
              z: 0,
              radius: scaleAttackArea(0.08, unit),
              height: 0.22,
              hit: false,
              attackMultiplier: config.projectileAttackMultiplier,
              projectileKind: "chestnut-spike",
              fanIndex: index
            });
          }
          return true;
        }
        handleUnitDeath(unit) {
          if (!unit) {
            return false;
          }
          unit.ability.resetCombatEffects?.();
          if (unit.deathSplitHandled) {
            return false;
          }
          this._syncUnitAliveCount(unit);
          unit.deathSplitHandled = true;
          if (!unit.isBattleOnlySummon) {
            this.markProgressChanged();
          }
          if (unit.isBattleOnlySummon) {
            unit.down = 0;
            this._trackUnitRemoved(unit, {
              keepStepSnapshot: true
            });
            this.units = this.units.filter((candidate) => candidate !== unit);
            return false;
          }
          const IN_BATTLE = SIMULATION_SCENES[this.scene].inBattle(this);
          const DESCRIPTORS = unit.ability.deathSplitDescriptors?.(this, IN_BATTLE) || [];
          if (!DESCRIPTORS.length) {
            return false;
          }
          if (this.units.length + DESCRIPTORS.length > SIMULATION_SCENES[this.scene].battleCapacity) {
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
              hp: STATS(DESC.tier, DESC.species).maxHp,
              down: 0,
              growthElapsed: CHILD.growthDuration,
              growth: CONFIG.farm.breeding.matureMeals,
              meals: 1,
              dropLanded: true,
              deathSplitHandled: false
            });
            this.units.push(CHILD);
            this._trackUnitAdded(CHILD);
          }
          this.combat("pea-split", {
            unit: unit.id,
            ownerId: unit.ownerId,
            species: unit.species,
            count: DESCRIPTORS.length,
            x: unit.x,
            y: unit.y
          });
          return true;
        }
        cleanupBattleSummons() {
          for (const UNIT_LOCAL of this.units) {
            UNIT_LOCAL.ability.resetCombatEffects?.();
          }
          for (const UNIT_LOCAL of this.units) {
            if (UNIT_LOCAL.isBattleOnlySummon) {
              this._trackUnitRemoved(UNIT_LOCAL);
            }
          }
          this.units = this.units.filter((unit) => !unit.isBattleOnlySummon);
          this.projectiles = [];
          return true;
        }
        triggerLandingShockwave(unit, action, config) {
          const RANGE = abilityProfile(unit.species).range * config.radiusMultiplier, POINT2 = {
            x: unit.x,
            y: unit.y,
            z: 0
          }, DISTANCE = Math.hypot(unit.x - this.boss.x, unit.y - this.boss.y);
          this.effects.push({
            kind: "landing-shockwave",
            x: unit.x,
            y: unit.y,
            z: 0,
            life: 0,
            duration: 0.55,
            radius: RANGE,
            owner: unit.id
          });
          if (this.boss.hp > 0 && DISTANCE <= RANGE + this.boss.radius) {
            const BLAST = {
              id: action.id,
              hit: false,
              attackKind: "kidney-shockwave"
            };
            this.damageCombatTarget(unit, BLAST, this.boss, POINT2, {
              attackMultiplier: config.damageMultiplier,
              attackKind: "kidney-shockwave",
              area: true
            });
          }
          this.combat("kidney-shockwave", {
            unit: unit.id,
            ownerId: unit.ownerId,
            species: unit.species,
            x: unit.x,
            y: unit.y,
            radius: RANGE,
            damageMultiplier: config.damageMultiplier
          });
        }
        triggerWalnutSlam(unit, action, primaryTarget, point2) {
          if (action.hit || !primaryTarget || primaryTarget.hp <= 0 || !areOpposingFactions(unit, primaryTarget)) {
            return false;
          }
          const CONFIG_LOCAL = getWalnutGuardConfig(this.abilityProgressionFor(unit), unit.tier);
          if (!CONFIG_LOCAL) {
            return false;
          }
          action.hit = true;
          const TARGETS = [primaryTarget];
          if (primaryTarget !== this.boss && this.boss.hp > 0 && areOpposingFactions(unit, this.boss) && Math.hypot(this.boss.x - point2.x, this.boss.y - point2.y) <= CONFIG_LOCAL.radius + this.boss.radius) {
            TARGETS.push(this.boss);
          }
          for (const TARGET of this.units) {
            if (TARGET !== primaryTarget && TARGET.hp > 0 && areOpposingFactions(unit, TARGET) && Math.hypot(TARGET.x - point2.x, TARGET.y - point2.y) <= CONFIG_LOCAL.radius + TARGET.radius) {
              TARGETS.push(TARGET);
            }
          }
          const ATTACK_CONTEXT = this.createAttackContext(unit, {
            attackMultiplier: CONFIG_LOCAL.damageMultiplier,
            attackKind: "walnut-empowered-slam",
            area: true
          });
          ATTACK_CONTEXT.criticalRoll = ATTACK_CONTEXT.sourceStatOverrides.critChance > 0 ? this.random() : 1;
          for (const TARGET of TARGETS) {
            this.damageCombatTarget(
              unit,
              {
                id: action.id,
                hit: false
              },
              TARGET,
              point2,
              {
                attackContext: ATTACK_CONTEXT
              }
            );
          }
          this.effects.push({
            kind: "walnut-shockwave",
            x: point2.x,
            y: point2.y,
            z: 0,
            life: 0,
            duration: 0.5,
            radius: CONFIG_LOCAL.radius,
            owner: unit.id
          });
          this.combat("walnut-slam", {
            unit: unit.id,
            attackId: action.id,
            x: point2.x,
            y: point2.y,
            z: 0,
            radius: CONFIG_LOCAL.radius
          });
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
        raidRemaining(ownerId) {
          const R_LOCAL = this.raidRoster(ownerId);
          return R_LOCAL ? R_LOCAL.troops.reduce((n, t) => n + (!t.deployed ? 1 : 0), 0) : 0;
        }
        registerRaidRoster(ownerId, entries, abilitySnapshot = createAbilityRuntimeSnapshot(createPlayerProgressionState()), settlement = null) {
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
          this.raidRosters.push({
            ownerId,
            troops: TROOPS,
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
        deployNextRaidUnit(ownerId, sequence) {
          if (this.scene !== "raid" || ["victory", "defeat"].includes(this.encounter.outcome) || !this.raidExpectedPlayers.every((id) => this.raidRoster(id)) || this.units.length >= CONFIG.raid.capacity.battleUnits || !Number.isSafeInteger(sequence)) {
            return false;
          }
          const ROSTER2 = this.raidRoster(ownerId), TROOP = ROSTER2?.troops.find((t) => !t.deployed);
          if (!ROSTER2 || sequence !== ROSTER2.lastDeploySequence + 1 || !TROOP) {
            return false;
          }
          const FARM_ID = TROOP.farmId, SLOT = this.raidExpectedPlayers.indexOf(ownerId), TROOP_INDEX = ROSTER2.troops.indexOf(TROOP), ID = (SLOT + 1) * CONFIG.raid.ids.playerStride + TROOP_INDEX + 1;
          if (this.units.some((u) => u.id === ID)) {
            return false;
          }
          const ANGLE = this.random() * Math.PI * 2, MARGIN = UNIT_RADIUS_FOR_TIER(TROOP.tier) + 0.05, BOUNDS = ARENA_GEOMETRY.bounds("raid", MARGIN), X = Math.cos(ANGLE) * BOUNDS.x, Y = Math.sin(ANGLE) * BOUNDS.y;
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
          this.units.push(U);
          this._trackUnitAdded(U);
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
        spawn(species, tier, x, y) {
          if (this.units.length >= SIMULATION_SCENES[this.scene].capacity(this)) {
            return null;
          }
          const U = new UNIT(this.nextId++, species, CLAMP2(tier, 1, CONFIG.unit.maxTier), x, y);
          this.units.push(U);
          this._trackUnitAdded(U);
          this.markProgressChanged();
          return U;
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
          return EVENT;
        }
        emit(kind, x, y, z = 0, effectOptions = {}) {
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
          if (source !== "auto" && source !== "manual" || source === "manual" && this.scene !== "farm" || this.food.length >= 140) {
            return false;
          }
          const COMPLETED = this.foodTaps.remainder === 4;
          this.foodTaps.remainder++;
          this.foodTaps.revision++;
          if (this.foodTaps.remainder >= 5) {
            this.foodTaps.remainder -= 5;
            this.scatter(
              (this.random() - 0.5) * CONFIG.farm.arena.radiusX * 1.5,
              (this.random() - 0.5) * CONFIG.farm.arena.radiusY * 1.35,
              1
            );
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
        scatter(x, y, count = 1) {
          for (let i = 0; i < count && this.food.length < 140; i++) {
            const RADIUS_X = CONFIG.farm.arena.radiusX - 1.5, RADIUS_Y = CONFIG.farm.arena.radiusY - 1.1;
            let tx = CLAMP2(x, -RADIUS_X, RADIUS_X);
            let ty = CLAMP2(y, -RADIUS_Y, RADIUS_Y);
            const BOUNDARY = Math.hypot(tx / RADIUS_X, ty / RADIUS_Y);
            if (BOUNDARY > 1) {
              tx /= BOUNDARY;
              ty /= BOUNDARY;
            }
            if (this.tryStartFarmBossEvent(tx, ty)) {
              continue;
            }
            const ANGLE = this.random() * Math.PI * 2, SX = Math.cos(ANGLE) * (CONFIG.farm.arena.radiusX + 0.7), SY = Math.sin(ANGLE) * (CONFIG.farm.arena.radiusY + 0.2);
            const DURATION = 0.85 + this.random() * 0.25, Z = 0.3;
            const FOOD = {
              x: SX,
              y: SY,
              z: Z,
              vx: (tx - SX) / DURATION,
              vy: (ty - SY) / DURATION,
              vz: 6 * DURATION - Z / DURATION,
              seed: this.random(),
              phase: "flight",
              tx,
              ty
            };
            this.food.push(FOOD);
            this._trackFoodAdded(FOOD);
            this.emit("feed", tx, ty);
            this.markProgressChanged();
          }
        }
        tryStartFarmBossEvent(x, y) {
          if (this.scene !== "farm" || this.boss.active || this.farmBossEvent.phase !== "idle" || this.random() >= CONFIG.farm.bossEvent.spawnChance) {
            return false;
          }
          for (const UNIT_LOCAL of this.units) {
            if (!UNIT_LOCAL.isBattleOnlySummon) {
              UNIT_LOCAL.splitUsedThisBattle = false;
              UNIT_LOCAL.deathSplitHandled = false;
              UNIT_LOCAL.chestnutBasicCycles = 0;
            }
          }
          this.boss = this.createBoss(this.randomBossSpecies());
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
            airborneRecovery: 0,
            barleyArmorBreakUntil: 0,
            barleyArmorBreakReduction: 0,
            summonMouth: {
              x: 0,
              y: 0,
              z: 0
            }
          };
        }
        configureBossStage(stage, species = this.boss.species) {
          const STATS2 = bossStageStats(stage);
          this.boss.species = CLAMP2(species, 0, CONFIG.unit.speciesCount - 1);
          this.boss.stage = STATS2.stage;
          this.boss.hp = this.boss.maxHp = STATS2.hp;
          this.boss.attackPower = STATS2.attackPower;
          return this.boss;
        }
        setScene(scene) {
          if (scene === this.scene) {
            return;
          }
          this.mergeTask = null;
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
            U.walnutEmpoweredNextBasic = false;
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
          SCENE.setupRoster(this);
          this._unitSpatialDirty = true;
        }
        canBreedPair(a, b, requireContact = false) {
          const BATCH = !this._spatialStepActive;
          if (BATCH) {
            this._beginSpatialQueryBatch();
          }
          try {
            return a !== b && !a.isBattleOnlySummon && !b.isBattleOnlySummon && a.breedingEligible !== false && b.breedingEligible !== false && a.hp > 0 && b.hp > 0 && a.species === b.species && a.mature && b.mature && a.fed && b.fed && a.cooldown <= 0 && b.cooldown <= 0 && this._unitIsActive(a) && this._unitIsActive(b) && (!requireContact || Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius + 0.2);
          } finally {
            if (BATCH) {
              this._endSpatialQueryBatch();
            }
          }
        }
        releaseMate(unit) {
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._rebuildUnitSpatialIndex(this.units);
          }
          const MATE = this._unitById.get(unit.mateId);
          unit.mateId = 0;
          if (MATE && MATE.mateId === unit.id) {
            MATE.mateId = 0;
          }
        }
        reconcileMateReservations() {
          const BATCH = !this._spatialStepActive;
          if (BATCH) {
            this._beginSpatialQueryBatch();
          }
          try {
            for (const UNIT_LOCAL of this.units) {
              if (!UNIT_LOCAL.mateId) {
                continue;
              }
              const MATE = this._unitById.get(UNIT_LOCAL.mateId);
              if (this.mode !== "breed" || !MATE || MATE.mateId !== UNIT_LOCAL.id || !this.canBreedPair(UNIT_LOCAL, MATE)) {
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
            if (this.mode !== "breed" || !unit.mature || !unit.fed || unit.cooldown > 0 || unit.hp <= 0 || this.senseEnemy(unit)) {
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
            let mate = null;
            let bestRank = Infinity;
            let bestDistance = Infinity;
            for (const CANDIDATE of this._speciesGroups[unit.species] || []) {
              if (CANDIDATE === unit || CANDIDATE.mateId || !this.canBreedPair(unit, CANDIDATE) || this.senseEnemy(CANDIDATE)) {
                continue;
              }
              const RANK = CANDIDATE.tier === unit.tier ? 0 : 1, DISTANCE = Math.hypot(CANDIDATE.x - unit.x, CANDIDATE.y - unit.y);
              if (RANK < bestRank || RANK === bestRank && DISTANCE < bestDistance) {
                mate = CANDIDATE;
                bestRank = RANK;
                bestDistance = DISTANCE;
              }
            }
            if (!mate) {
              return null;
            }
            unit.mateId = mate.id;
            mate.mateId = unit.id;
            return mate;
          } finally {
            if (BATCH) {
              this._endSpatialQueryBatch();
            }
          }
        }
        hasEligibleSameTierBreedPair() {
          if (this.mode !== "breed" || this.units.length >= this.capacity) {
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
                if (UNIT_LOCAL.isBattleOnlySummon || UNIT_LOCAL.breedingEligible === false || UNIT_LOCAL.hp <= 0 || !UNIT_LOCAL.mature || !UNIT_LOCAL.fed || UNIT_LOCAL.cooldown > 0 || !this._unitIsActive(UNIT_LOCAL)) {
                  continue;
                }
                if (!UNIT_LOCAL.mateId) {
                  if (++unreserved >= 2) {
                    return true;
                  }
                  continue;
                }
                const MATE = this._unitById.get(UNIT_LOCAL.mateId);
                if (MATE?.mateId === UNIT_LOCAL.id && MATE.species === UNIT_LOCAL.species && MATE.tier === UNIT_LOCAL.tier && MATE.hp > 0 && MATE.mature && MATE.fed && MATE.cooldown <= 0 && MATE.breedingEligible !== false && !MATE.isBattleOnlySummon) {
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
        canMergeGroup(materials, { requireContact = false, requireNoEnemy = false } = {}) {
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
              if (this.localScatter.active && this.scatterInside(UNIT_LOCAL)) {
                return false;
              }
              if (!UNIT_LOCAL || IDS.has(UNIT_LOCAL.id) || UNIT_LOCAL.isBattleOnlySummon || UNIT_LOCAL.mergeEligible === false || UNIT_LOCAL.species !== FIRST.species || UNIT_LOCAL.tier !== FIRST.tier || UNIT_LOCAL.hp <= 0 || UNIT_LOCAL.down > 0 || !UNIT_LOCAL.mature || UNIT_LOCAL.cooldown > 0 || !this._unitIsActive(UNIT_LOCAL)) {
                return false;
              }
              IDS.add(UNIT_LOCAL.id);
            }
            if (this._ownedSpeciesCounts[FIRST.species] - MATERIAL_COUNT + 1 < 2) {
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
        selectMergeTask() {
          if (this.mode !== "merge" || this.scene !== "farm" || this.mergeTask) {
            return;
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
                if (!UNIT_LOCAL.isBattleOnlySummon && UNIT_LOCAL.mergeEligible !== false && UNIT_LOCAL.hp > 0 && UNIT_LOCAL.down <= 0 && UNIT_LOCAL.mature && UNIT_LOCAL.cooldown <= 0 && UNIT_LOCAL.tier < CONFIG.unit.maxTier && !this.senseEnemy(UNIT_LOCAL)) {
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
                if (GROUP.length < MATERIAL_COUNT || this._ownedSpeciesCounts[species] - MATERIAL_COUNT + 1 < 2) {
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
            if (bestMaterialIds) {
              this.mergeTask = {
                phase: "approach",
                aId: bestMaterialIds[0],
                bId: bestMaterialIds[1],
                materialIds: bestMaterialIds,
                elapsed: 0,
                duration: CONFIG.farm.merge.animationSeconds
              };
            }
          } finally {
            if (BATCH) {
              this._endSpatialQueryBatch();
            }
          }
        }
        advanceMergeTask(dt) {
          if (this.mode !== "merge" || this.scene !== "farm") {
            this.mergeTask = null;
            return;
          }
          if (this.mergeTask?.phase === "animation") {
            this.mergeTask.elapsed = Math.min(this.mergeTask.duration, this.mergeTask.elapsed + dt);
            if (this.mergeTask.elapsed >= this.mergeTask.duration - 1e-9) {
              this.mergeTask = null;
            }
            return;
          }
          if (this.mergeTask?.phase === "approach") {
            const MATERIALS = (this.mergeTask.materialIds || [this.mergeTask.aId, this.mergeTask.bId]).map(
              (id) => this._unitById.get(id)
            );
            if (!this.canMergeGroup(MATERIALS)) {
              this.mergeTask = null;
            }
          }
          if (!this.mergeTask) {
            this.selectMergeTask();
          }
        }
        resolveMergeTaskAfterMovement() {
          const TASK = this.mergeTask;
          if (TASK?.phase !== "approach") {
            return false;
          }
          const MATERIALS = (TASK.materialIds || [TASK.aId, TASK.bId]).map((id) => this._unitById.get(id));
          if (!this.canMergeGroup(MATERIALS, {
            requireContact: true,
            requireNoEnemy: true
          })) {
            return false;
          }
          return this.mergeGroup(MATERIALS, {
            priorityResolved: true
          });
        }
        setFarmMode(value) {
          if (this.scene !== "farm" || typeof value !== "string" || !Object.hasOwn(FARM_MODES, value)) {
            return false;
          }
          const MODE = FARM_MODES[value], CHANGED = MODE.changed(this);
          MODE.enter(this);
          this.mode = value;
          if (CHANGED) {
            this.markProgressChanged();
          }
          return CHANGED;
        }
        pair(a, b, priorityResolved = false) {
          return FARM_MODES[this.mode].pair(this, a, b, priorityResolved);
        }
        mergeGroup(materials, { priorityResolved: _priorityResolved = false } = {}) {
          if (this.mode !== "merge" || this.scene !== "farm" || !this.canMergeGroup(materials, {
            requireContact: true,
            requireNoEnemy: true
          })) {
            return false;
          }
          const ORDERED = [...materials], FIRST = ORDERED[0], MATERIAL_IDS = ORDERED.map((unit) => unit.id), CONSUMED = new Set(MATERIAL_IDS), X = ORDERED.reduce((sum, unit) => sum + unit.x, 0) / ORDERED.length, Y = ORDERED.reduce((sum, unit) => sum + unit.y, 0) / ORDERED.length;
          for (const UNIT_LOCAL of ORDERED) {
            this.releaseMate(UNIT_LOCAL);
          }
          for (const UNIT_LOCAL of ORDERED) {
            this._trackUnitRemoved(UNIT_LOCAL);
          }
          this.units = this.units.filter((unit) => !CONSUMED.has(unit.id));
          const RESULT = this.spawn(FIRST.species, FIRST.tier + 1, X, Y);
          RESULT.meals = 1;
          RESULT.growth = CONFIG.farm.breeding.matureMeals;
          RESULT.growthDuration = this.breedGrowthDuration();
          RESULT.growthElapsed = RESULT.growthDuration;
          RESULT.cooldown = getMergeCooldownSeconds(this.playerProgression?.farmUpgrades);
          RESULT.cooldownDuration = RESULT.cooldown;
          this.mergeTask = {
            phase: "animation",
            aId: 0,
            bId: 0,
            materialIds: MATERIAL_IDS,
            resultId: RESULT.id,
            sourceSpecies: FIRST.species,
            sourceTier: FIRST.tier,
            elapsed: 0,
            duration: CONFIG.farm.merge.animationSeconds
          };
          const SEQUENCE_WINDOW = CONFIG.farm.merge.animationSeconds * 0.72, STEP = SEQUENCE_WINDOW / ORDERED.length;
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
          this.emit("merge", X, Y, 1, {
            delay: SEQUENCE_WINDOW,
            span: CONFIG.farm.merge.animationSeconds - SEQUENCE_WINDOW
          });
          return true;
        }
        step(dt) {
          this._spatialStepActive = true;
          this._spatialQueryDepth = 0;
          this.time += dt;
          let progressTimersAdvanced = false;
          grantPendingBossAcquisitions(this);
          const UNITS = this._stepUnits;
          UNITS.length = 0;
          for (const UNIT_LOCAL of this.units) {
            UNITS.push(UNIT_LOCAL);
          }
          this._rebuildUnitSpatialIndex(UNITS);
          const SCENE = SIMULATION_SCENES[this.scene];
          SCENE.advanceClock(this, dt);
          this.advanceMergeTask(dt);
          this.effects = this.effects.filter((e) => (e.life += dt) < (Number.isFinite(e.duration) ? e.duration : 1));
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
            }
          }
          this._rebuildFoodSpatialIndex();
          this.reconcileMateReservations();
          for (const U of UNITS) {
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
              }
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
            if (U.cooldown > 0 && U.cooldown <= dt + 1e-9) {
              this.markProgressChanged();
            }
            U.cooldown = Math.max(0, U.cooldown - dt);
            if (U.cooldown < 1e-9) {
              U.cooldown = 0;
              U.cooldownDuration = 0;
            }
            const ENEMY_LOCAL = this.senseEnemy(U) || SCENE.fallbackEnemy(this, U);
            this.updateUnitIntent(U, dt, ENEMY_LOCAL, SCENE);
            const OLD_Z = U.z, OLD_POSITION = {
              x: U.x,
              y: U.y,
              z: U.z
            };
            this.limitScatterVelocity(U, dt);
            U.integrate(dt);
            SCENE.afterLivingIntegration(this, U);
            if (ENEMY_LOCAL) {
              U.ability.afterMove?.(this, OLD_POSITION);
            }
            if (OLD_Z > 0 && U.z === 0) {
              U.landingRecovery = 0.25;
              if (!U.dropLanded) {
                U.dropLanded = true;
                U.bounce = 0.16;
                this.combat(SCENE.dropLandingEvent, {
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
              SCENE.landUnit(this, U);
            }
            this.boundBody(U, this.scene, U.radius);
            this.unitSpatial.update(U);
          }
          SCENE.checkpointProgress(this, dt, progressTimersAdvanced);
          this.resolveContacts(UNITS);
          SCENE.resolveLifeContacts(this, UNITS);
          SCENE.updateBattle(this, dt);
          this.units = this.units.filter((unit) => !unit.isBattleOnlySummon || unit.hp > 0);
          UNITS.length = 0;
          this._spatialStepActive = false;
          this._unitSpatialDirty = true;
          this._foodSpatialDirty = true;
        }
        updateUnitIntent(unit, dt, enemy, scene) {
          if (this.updateLocalScatter(unit, dt, enemy)) {
            return;
          }
          if (enemy) {
            this.raidUnit(unit, dt, enemy);
            return;
          }
          if (unit.hp > 0 && hasFaction(unit, FACTION_CONFIG.PLAYER) && !unit.isBattleOnlySummon) {
            if (unit.ability.phase !== "idle") {
              if (unit.ability.phase !== "recover") {
                unit.ability.interrupt();
              }
              unit.ability.update(this, dt);
            }
            this.farmUnit(unit, dt);
            return;
          }
          scene.updateUnoccupied(this, unit, dt);
        }
        setLocalScatter(x, y, radius = CONFIG.scatter.minRadius, handleX = x + radius, handleY = y) {
          if (![x, y, radius, handleX, handleY].every(Number.isFinite)) {
            return false;
          }
          const C_LOCAL = this.localScatter;
          if (!C_LOCAL.active || C_LOCAL.x !== x || C_LOCAL.y !== y) {
            C_LOCAL.generation++;
          }
          C_LOCAL.active = true;
          C_LOCAL.x = x;
          C_LOCAL.y = y;
          C_LOCAL.radius = CLAMP2(radius, CONFIG.scatter.minRadius, CONFIG.scatter.maxRadius);
          C_LOCAL.handleX = handleX;
          C_LOCAL.handleY = handleY;
          return true;
        }
        clearLocalScatter() {
          this.localScatter.active = false;
        }
        scatterApplies(u) {
          return this.localScatter.active && hasFaction(u, FACTION_CONFIG.PLAYER) && u.hp > 0 && u.down <= 0 && u.dropLanded && u.z <= 1e-9 && u.vz <= 0;
        }
        scatterInside(u) {
          if (!u) {
            return false;
          }
          const C_LOCAL = this.localScatter;
          return Math.hypot(u.x - C_LOCAL.x, u.y - C_LOCAL.y) < C_LOCAL.radius + u.radius + CONFIG.scatter.bodyMargin;
        }
        scatterSegmentBlocked(x, y, tx, ty, radius) {
          const C_LOCAL = this.localScatter;
          return ARENA_GEOMETRY.segmentInsideCircle(x, y, tx, ty, C_LOCAL.x, C_LOCAL.y, radius);
        }
        scatterBossBlocks(u, x, y) {
          const B_LOCAL = this.boss;
          if (!B_LOCAL.active || B_LOCAL.hp <= 0 || !areOpposingFactions(u, B_LOCAL) || B_LOCAL.z > u.z + 0.65) {
            return false;
          }
          const RADIUS = Math.min(
            B_LOCAL.radius + u.radius + 0.015,
            Math.max(0, Math.hypot(u.x - B_LOCAL.x, u.y - B_LOCAL.y) - 2e-3)
          );
          return ARENA_GEOMETRY.segmentInsideCircle(u.x, u.y, x, y, B_LOCAL.x, B_LOCAL.y, RADIUS);
        }
        updateLocalScatter(u, dt, enemy) {
          if (!this.scatterApplies(u) || u.stun > 0 || u.landingRecovery > 0) {
            return false;
          }
          const C_LOCAL = this.localScatter, R_LOCAL = C_LOCAL.radius + u.radius + CONFIG.scatter.bodyMargin, D_LOCAL = Math.hypot(u.x - C_LOCAL.x, u.y - C_LOCAL.y);
          let state = this._scatterStates.get(u);
          if (!state) {
            state = {
              generation: 0,
              escaping: false,
              radius: 0,
              x: 0,
              y: 0,
              waypoint: false,
              bossX: 0,
              bossY: 0
            };
            this._scatterStates.set(u, state);
          }
          if (state.generation !== C_LOCAL.generation) {
            state.generation = C_LOCAL.generation;
            state.escaping = false;
            state.radius = 0;
          }
          if (D_LOCAL < R_LOCAL) {
            state.escaping = true;
          }
          if (state.escaping && D_LOCAL >= R_LOCAL + CONFIG.scatter.hysteresis) {
            state.escaping = false;
            u.vx = u.vy = 0;
          }
          const CYCLE = u.ability;
          const ATTACK_BLOCKED = unitCapabilityComposition(u.species).attack === "contact" && CYCLE.action && (CYCLE.phase === "windup" || CYCLE.phase === "active") && this.scatterSegmentBlocked(u.x, u.y, CYCLE.action.target.x, CYCLE.action.target.y, R_LOCAL);
          if (!state.escaping && !ATTACK_BLOCKED) {
            return false;
          }
          CYCLE.cancelForScatter();
          CYCLE.update(this, dt);
          if (!state.escaping) {
            return true;
          }
          if (state.radius !== R_LOCAL || this.scatterBossBlocks(u, state.x, state.y) || state.waypoint && (Math.hypot(state.x - u.x, state.y - u.y) < 0.14 || state.bossX !== this.boss.x || state.bossY !== this.boss.y)) {
            state.radius = R_LOCAL;
            const GOAL_RADIUS = R_LOCAL + CONFIG.scatter.hysteresis + 0.12, BEARING = D_LOCAL > 1e-8 ? Math.atan2(u.y - C_LOCAL.y, u.x - C_LOCAL.x) : u.seed, BOUNDS = ARENA_GEOMETRY.bounds(this.scene, u.radius + 0.02);
            let best = Infinity;
            state.x = u.x;
            state.y = u.y;
            state.waypoint = false;
            state.bossX = this.boss.x;
            state.bossY = this.boss.y;
            for (let i = 0; i < 33; i++) {
              const ANGLE = BEARING + (i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 16), X = C_LOCAL.x + Math.cos(ANGLE) * GOAL_RADIUS, Y = C_LOCAL.y + Math.sin(ANGLE) * GOAL_RADIUS;
              if (X * X / (BOUNDS.x * BOUNDS.x) + Y * Y / (BOUNDS.y * BOUNDS.y) > 1 || this.scatterBossBlocks(u, X, Y)) {
                continue;
              }
              const DISTANCE = (X - u.x) ** 2 + (Y - u.y) ** 2;
              if (DISTANCE < best - 1e-9) {
                best = DISTANCE;
                state.x = X;
                state.y = Y;
                if (i === 0) {
                  break;
                }
              }
            }
            if (!Number.isFinite(best)) {
              state.waypoint = true;
              let score = -Infinity;
              for (let step = 0.55; step > 0.1 && !Number.isFinite(score); step *= 0.5) {
                for (let i = 0; i < 34; i++) {
                  const ANGLE = i < 32 ? BEARING + i * Math.PI / 16 : Math.atan2(u.y - this.boss.y, u.x - this.boss.x) + (i === 32 ? 1 : -1) * Math.PI / 2, X = u.x + Math.cos(ANGLE) * step, Y = u.y + Math.sin(ANGLE) * step;
                  if (X * X / (BOUNDS.x * BOUNDS.x) + Y * Y / (BOUNDS.y * BOUNDS.y) > 1 || this.scatterBossBlocks(u, X, Y)) {
                    continue;
                  }
                  const DISTANCE = (X - C_LOCAL.x) ** 2 + (Y - C_LOCAL.y) ** 2;
                  if (DISTANCE > score + 1e-9) {
                    score = DISTANCE;
                    state.x = X;
                    state.y = Y;
                  }
                }
              }
              if (!Number.isFinite(score)) {
                state.radius = 0;
              }
            }
          }
          const DX = u.x - C_LOCAL.x, DY = u.y - C_LOCAL.y, RADIAL = D_LOCAL > 1e-8 ? (u.vx * DX + u.vy * DY) / D_LOCAL : 0;
          if (RADIAL < 0) {
            u.vx -= RADIAL * DX / D_LOCAL;
            u.vy -= RADIAL * DY / D_LOCAL;
          }
          this.steer(u, state.x, state.y, dt, scaleMoveSpeed(enemy ? 4.1 : 2.2, u));
          return true;
        }
        limitScatterVelocity(u, dt) {
          if (!this.scatterApplies(u) || u.stun > 0) {
            return;
          }
          const C_LOCAL = this.localScatter, R_LOCAL = C_LOCAL.radius + u.radius + CONFIG.scatter.bodyMargin, DX = u.x - C_LOCAL.x, DY = u.y - C_LOCAL.y, D_LOCAL = Math.hypot(DX, DY);
          if (D_LOCAL < R_LOCAL - 1e-8) {
            return;
          }
          const MX = u.vx * dt, MY = u.vy * dt, A_LOCAL = MX * MX + MY * MY, B_LOCAL = 2 * (DX * MX + DY * MY), OUTSIDE = DX * DX + DY * DY - R_LOCAL * R_LOCAL, DISC = B_LOCAL * B_LOCAL - 4 * A_LOCAL * OUTSIDE;
          if (A_LOCAL < 1e-14 || B_LOCAL >= 0 || DISC <= 0) {
            return;
          }
          const HIT = (-B_LOCAL - Math.sqrt(DISC)) / (2 * A_LOCAL);
          if (HIT < 0 || HIT > 1) {
            return;
          }
          const FRACTION = Math.max(0, HIT - 1e-3);
          u.vx *= FRACTION;
          u.vy *= FRACTION;
        }
        steer(u, x, y, dt, speed2) {
          if (this.scatterApplies(u) && !this.scatterInside(u)) {
            const C_LOCAL = this.localScatter, R_LOCAL = C_LOCAL.radius + u.radius + CONFIG.scatter.bodyMargin + 0.12;
            if (this.scatterSegmentBlocked(u.x, u.y, x, y, R_LOCAL)) {
              const DX2 = u.x - C_LOCAL.x, DY2 = u.y - C_LOCAL.y, D_LOCAL2 = Math.hypot(DX2, DY2), BEARING = D_LOCAL2 > 1e-8 ? Math.atan2(DY2, DX2) : u.seed;
              const TX = x - C_LOCAL.x, TY = y - C_LOCAL.y;
              if (Math.hypot(TX, TY) <= R_LOCAL) {
                x = C_LOCAL.x + Math.cos(BEARING) * (R_LOCAL + 0.06);
                y = C_LOCAL.y + Math.sin(BEARING) * (R_LOCAL + 0.06);
              } else {
                const DELTA = Math.atan2(
                  Math.sin(Math.atan2(TY, TX) - BEARING),
                  Math.cos(Math.atan2(TY, TX) - BEARING)
                ), SIDE = DELTA === 0 ? u.id % 2 ? 1 : -1 : Math.sign(DELTA);
                const TURN = Math.min(
                  0.5,
                  Math.max(0.2, Math.acos(Math.min(1, R_LOCAL / Math.max(R_LOCAL, D_LOCAL2))) * 0.8)
                ), DISTANCE = R_LOCAL / Math.cos(TURN) + 0.08;
                const BOUNDS = ARENA_GEOMETRY.bounds(this.scene, u.radius);
                let angle = BEARING + SIDE * TURN;
                x = C_LOCAL.x + Math.cos(angle) * DISTANCE;
                y = C_LOCAL.y + Math.sin(angle) * DISTANCE;
                if (x * x / (BOUNDS.x * BOUNDS.x) + y * y / (BOUNDS.y * BOUNDS.y) > 1) {
                  angle = BEARING - SIDE * TURN;
                  x = C_LOCAL.x + Math.cos(angle) * DISTANCE;
                  y = C_LOCAL.y + Math.sin(angle) * DISTANCE;
                  if (x * x / (BOUNDS.x * BOUNDS.x) + y * y / (BOUNDS.y * BOUNDS.y) > 1) {
                    u.vx = u.vy = 0;
                    return;
                  }
                }
              }
            }
          }
          const DX = x - u.x, DY = y - u.y, D_LOCAL = Math.hypot(DX, DY);
          if (D_LOCAL > 0.08) {
            const RATE = 1 - Math.exp(-dt * 3);
            u.vx += (DX / D_LOCAL * speed2 - u.vx) * RATE;
            u.vy += (DY / D_LOCAL * speed2 - u.vy) * RATE;
            u.angle = Math.atan2(DY, DX);
          }
        }
        raidContacts(units) {
          for (let i = 0; i < units.length; i++) {
            const UNIT_LOCAL = units[i];
            if (UNIT_LOCAL.hp <= 0 || !UNIT_LOCAL.dropLanded) {
              continue;
            }
            const PENDING = this._collectContactOrders(UNIT_LOCAL, 0, i - 1, this._contactPending);
            for (const J of PENDING) {
              const OTHER = units[J];
              if (OTHER.hp <= 0 || !OTHER.dropLanded) {
                continue;
              }
              const AX = OTHER.x, AY = OTHER.y, BX = UNIT_LOCAL.x, BY = UNIT_LOCAL.y, DID_CONTACT = contact(OTHER, UNIT_LOCAL);
              if (DID_CONTACT) {
                this.metrics.contacts++;
              }
              if (AX !== OTHER.x || AY !== OTHER.y) {
                this.unitSpatial.update(OTHER);
              }
              if (BX !== UNIT_LOCAL.x || BY !== UNIT_LOCAL.y) {
                this.unitSpatial.update(UNIT_LOCAL);
              }
            }
          }
        }
        resolveContacts(units) {
          SIMULATION_SCENES[this.scene].resolveContacts(this, units);
        }
        resolveFarmContacts(units) {
          for (let i = 0; i < units.length; i++) {
            const UNIT_LOCAL = units[i], GENERATION = this._nextContactGeneration(units.length), PENDING = this._collectContactOrders(UNIT_LOCAL, i + 1, units.length - 1, this._contactPending);
            for (const ORDER of PENDING) {
              this._contactSeen[ORDER] = GENERATION;
            }
            let cursor = 0;
            while (cursor < PENDING.length) {
              const J = PENDING[cursor++], OTHER = units[J], AX = UNIT_LOCAL.x, AY = UNIT_LOCAL.y, BX = OTHER.x, BY = OTHER.y, DID_CONTACT = contact(UNIT_LOCAL, OTHER);
              if (DID_CONTACT) {
                this.metrics.contacts++;
              }
              const UNIT_MOVED = AX !== UNIT_LOCAL.x || AY !== UNIT_LOCAL.y, OTHER_MOVED = BX !== OTHER.x || BY !== OTHER.y;
              if (UNIT_MOVED) {
                this.unitSpatial.update(UNIT_LOCAL);
              }
              if (OTHER_MOVED) {
                this.unitSpatial.update(OTHER);
              }
              if (UNIT_MOVED) {
                const EXTRAS = this._collectContactOrders(UNIT_LOCAL, J + 1, units.length - 1, this._contactExtra);
                for (const ORDER of EXTRAS) {
                  this._insertContactOrder(ORDER, J, PENDING, GENERATION);
                }
              }
            }
          }
        }
        resolveFarmContactPairs(units, sameTier) {
          for (let i = 0; i < units.length; i++) {
            const UNIT_LOCAL = units[i], PENDING = this._collectContactOrders(UNIT_LOCAL, i + 1, units.length - 1, this._contactPending);
            for (const J of PENDING) {
              const OTHER = units[J];
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
              for (const FOOD of this._groundedFoods) {
                const DISTANCE = Math.hypot(FOOD.x - x, FOOD.y - y);
                if (DISTANCE < nearestDistance) {
                  nearest = FOOD;
                  nearestDistance = DISTANCE;
                }
              }
              break;
            }
          }
          return nearest;
        }
        farmUnit(u, dt) {
          FARM_MODES[this.mode].update(this, u, dt);
        }
        combat(kind, detail) {
          const EVENT = this.notice(kind, {
            time: this.time,
            ...detail
          }), TO_PRESENTATION_TIME = PRESENTATION_CLOCKS.get(this);
          if (TO_PRESENTATION_TIME) {
            PRESENTATION_EVENT_TIMES.set(EVENT, TO_PRESENTATION_TIME(this.time));
          }
        }
        boundBody(body, scene, margin) {
          const BEFORE = {
            x: body.x,
            y: body.y
          }, P = ARENA_GEOMETRY.clamp(BEFORE, scene, margin);
          body.x = P.x;
          body.y = P.y;
          if (BEFORE.x !== P.x || BEFORE.y !== P.y) {
            const R_LOCAL = ARENA_GEOMETRY.bounds(scene, margin), NX = P.x / (R_LOCAL.x * R_LOCAL.x), NY = P.y / (R_LOCAL.y * R_LOCAL.y), N = Math.hypot(NX, NY) || 1, OUT = ((body.vx || 0) * NX + (body.vy || 0) * NY) / N;
            if (OUT > 0) {
              body.vx -= 1.3 * OUT * NX / N;
              body.vy -= 1.3 * OUT * NY / N;
            }
          }
        }
        separateBoss(u) {
          const B_LOCAL = this.boss;
          if (!areOpposingFactions(u, B_LOCAL) || u.hp <= 0 || !u.dropLanded || u.z > B_LOCAL.height) {
            return;
          }
          const DX = u.x - B_LOCAL.x, DY = u.y - B_LOCAL.y, D_LOCAL = Math.hypot(DX, DY), R_LOCAL = B_LOCAL.radius + u.radius;
          if (D_LOCAL >= R_LOCAL) {
            return;
          }
          const A_LOCAL = D_LOCAL > 1e-6 ? Math.atan2(DY, DX) : u.seed, NX = Math.cos(A_LOCAL), NY = Math.sin(A_LOCAL);
          u.x = B_LOCAL.x + NX * R_LOCAL;
          u.y = B_LOCAL.y + NY * R_LOCAL;
          const INWARD = u.vx * NX + u.vy * NY;
          if (INWARD < 0) {
            u.vx -= INWARD * NX;
            u.vy -= INWARD * NY;
          }
          this.boundBody(u, this.scene, u.radius);
        }
        combatEvent(kind, u, action) {
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
              attackKind: abilityProfile(u.species).kind
            });
            u.ability.onLaunch?.(this, action);
          }
        }
        wheatCommandCritBonusFor(attacker) {
          if (!attacker || attacker.hp <= 0) {
            return 0;
          }
          let strongest = 0;
          if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._rebuildUnitSpatialIndex(this.units);
          }
          for (const SPECIES of speciesWithCapability("commandAura")) {
            for (const SOURCE of this._speciesGroups[SPECIES]) {
              if (SOURCE.hp <= 0 || !hasFaction(SOURCE, attacker.faction) || SOURCE.wheatCommandUntil <= this.time) {
                continue;
              }
              const CONFIG_LOCAL = SOURCE.ability.commandAuraConfig?.(this);
              if (!CONFIG_LOCAL || Math.hypot(SOURCE.x - attacker.x, SOURCE.y - attacker.y) > CONFIG_LOCAL.radius) {
                continue;
              }
              strongest = Math.max(
                strongest,
                Number.isFinite(SOURCE.wheatCommandCritBonus) ? SOURCE.wheatCommandCritBonus : 0
              );
            }
          }
          return Math.max(0, Math.min(1, strongest));
        }
        riceHarvestMultiplier(u, target, kind, hpBefore = target?.hp, maxHp = target?.maxHp) {
          if (kind !== abilityProfile(u.species).kind) {
            return 1;
          }
          return (u.ability || CREATE_UNIT_ATTACK_CYCLE(u)).harvestMultiplier?.(this, hpBefore, maxHp) ?? 1;
        }
        applyGrainOnBasicHit(u, target, kind) {
          if (!hasFaction(u, FACTION_CONFIG.PLAYER) || kind !== abilityProfile(u.species).kind) {
            return;
          }
          (u.ability || CREATE_UNIT_ATTACK_CYCLE(u)).onBasicHit?.(this, target);
        }
        attackTarget(unit, action) {
          if (action?.targetId === "boss" || !action?.targetId) {
            return areOpposingFactions(unit, this.boss) ? this.boss : null;
          }
          const TARGET = this._unitForId(action.targetId);
          return TARGET?.hp > 0 && areOpposingFactions(unit, TARGET) ? TARGET : null;
        }
        createAttackContext(u, { attackMultiplier = null, attackKind = null, strikeIndex = null, area = false, criticalRoll = null } = {}) {
          const SPEC = abilityProfile(u.species), ROSTER2 = this.raidRoster(u.ownerId), ATTACKER_STATS = STATS(u.tier, u.species);
          return {
            source: u,
            sourceKind: hasFaction(u, FACTION_CONFIG.PLAYER) ? "direct" : "enemy",
            attackerStats: ATTACKER_STATS,
            damageMultiplier: Number.isFinite(attackMultiplier) ? attackMultiplier : SPEC.skillMultiplier,
            kind: attackKind || SPEC.kind,
            buffed: !!ROSTER2 && this.time < ROSTER2.buffUntil,
            strikeIndex,
            area,
            criticalRoll,
            hitTargets: area ? /* @__PURE__ */ new Set() : null,
            sourceStatOverrides: {
              critChance: CLAMP2(ATTACKER_STATS.critChance + this.wheatCommandCritBonusFor(u), 0, 1)
            }
          };
        }
        combatTargetDefense(target) {
          if (target !== this.boss) {
            const TARGET_STATS = STATS(target.tier, target.species);
            return {
              maxHp: TARGET_STATS.maxHp,
              armor: effectiveBarleyArmor(target, TARGET_STATS.armor, this.time)
            };
          }
          const HP_RATIO = Number.isFinite(target.hp) && Number.isFinite(target.maxHp) && target.maxHp > 0 ? CLAMP2(target.hp / target.maxHp, 0, 1) : 1;
          return {
            maxHp: target.maxHp,
            armor: effectiveBarleyArmor(target, (1 - HP_RATIO) * 100, this.time)
          };
        }
        damageCombatTarget(u, action, target, point2, options = {}) {
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
          const DEFENSE = this.combatTargetDefense(target), HARVEST_MULTIPLIER = this.riceHarvestMultiplier(SOURCE, target, KIND, target.hp, DEFENSE.maxHp);
          const GUARD = IS_BOSS ? null : target.ability.receiveGuard?.(this);
          const RAW_DAMAGE = ATTACKER_STATS.attackPower * DAMAGE_MULTIPLIER * (BUFFED ? CONFIG.raid.buff.damage : 1) * HARVEST_MULTIPLIER * (GUARD?.receivedDamageMultiplier ?? 1);
          const DAMAGE = applyDamageToTargets(SOURCE, [target], {
            rawDamage: RAW_DAMAGE,
            area: CONTEXT.area,
            sourceKind: CONTEXT.sourceKind,
            sourceStatOverrides: CONTEXT.sourceStatOverrides,
            armorForTarget: () => DEFENSE.armor,
            roll: () => CONTEXT.criticalRoll ?? (CONTEXT.criticalRoll = this.random())
          });
          if (!IS_BOSS) {
            this._syncUnitAliveCount(target);
          }
          this.applyGrainOnBasicHit(SOURCE, target, KIND);
          const STRENGTH = DAMAGE_MULTIPLIER * (BUFFED ? CONFIG.raid.buff.damage : 1) * HARVEST_MULTIPLIER * (DAMAGE.critical ? ATTACKER_STATS.critMultiplier : 1);
          if (IS_BOSS) {
            this.finishBossHit(SOURCE, action, point2, CONTEXT, DAMAGE, STRENGTH);
          } else {
            this.finishUnitHit(SOURCE, action, target, point2, CONTEXT, DAMAGE, STRENGTH, GUARD);
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
        finishUnitHit(u, action, target, point2, { kind, strikeIndex }, damage, strength, guard) {
          const DX = target.x - u.x, DY = target.y - u.y, N = Math.hypot(DX, DY) || 1;
          target.knock(
            DX / N,
            DY / N,
            5 * (guard?.receivedKnockbackMultiplier ?? 1),
            2.4 * (guard?.receivedKnockbackMultiplier ?? 1),
            u
          );
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
            x: point2.x,
            y: point2.y,
            z: Math.max(0.15, target.z + 0.25),
            nx: DX / N,
            ny: DY / N,
            strength
          });
        }
        explodePopcorn(kernel) {
          if (!kernel?.isPopcorn || kernel.exploded) {
            return false;
          }
          const BATCH = !this._spatialStepActive;
          if (BATCH) {
            this._beginSpatialQueryBatch();
          }
          try {
            const QUEUE = [kernel], QUEUED = /* @__PURE__ */ new Set();
            let triggered = false;
            while (QUEUE.length) {
              const CURRENT = QUEUE.shift();
              if (!CURRENT?.isPopcorn || CURRENT.exploded || QUEUED.has(CURRENT.id)) {
                continue;
              }
              QUEUED.add(CURRENT.id);
              CURRENT.exploded = true;
              CURRENT.explosionLife = 0;
              CURRENT.hit = true;
              triggered = true;
              const CONFIG_LOCAL = CURRENT.popcornConfig, CENTER = {
                x: CURRENT.x,
                y: CURRENT.y,
                z: 0
              }, RANGE = CONFIG_LOCAL.radius;
              this.effects.push({
                kind: "popcorn-explosion",
                x: CURRENT.x,
                y: CURRENT.y,
                z: 0,
                life: 0,
                duration: 0.5,
                radius: RANGE,
                owner: CURRENT.owner
              });
              const OWNER = this._unitForId(CURRENT.owner) || {
                id: CURRENT.owner,
                ownerId: CURRENT.ownerId || "",
                faction: CURRENT.faction,
                species: CURRENT.species,
                tier: CURRENT.tier,
                x: CURRENT.x,
                y: CURRENT.y,
                z: 0
              };
              const TARGETS = [];
              if (areOpposingFactions(OWNER, this.boss) && !CURRENT.damagedTargetIds.includes("boss") && Math.hypot(CURRENT.x - this.boss.x, CURRENT.y - this.boss.y) <= RANGE + this.boss.radius) {
                TARGETS.push(this.boss);
              }
              for (const TARGET of this.units) {
                if (TARGET.hp > 0 && areOpposingFactions(OWNER, TARGET) && !CURRENT.damagedTargetIds.includes(TARGET.id) && Math.hypot(CURRENT.x - TARGET.x, CURRENT.y - TARGET.y) <= RANGE + TARGET.radius) {
                  TARGETS.push(TARGET);
                }
              }
              const ATTACK_CONTEXT = this.createAttackContext(OWNER, {
                attackMultiplier: CONFIG_LOCAL.damageMultiplier,
                attackKind: "corn-popcorn-explosion",
                area: true
              });
              for (const TARGET of TARGETS) {
                const ACTION = {
                  id: CURRENT.id,
                  hit: false,
                  attackKind: "corn-popcorn-explosion"
                };
                const APPLIED = this.damageCombatTarget(OWNER, ACTION, TARGET, CENTER, {
                  attackContext: ATTACK_CONTEXT
                });
                if (APPLIED) {
                  CURRENT.damagedTargetIds.push(TARGET === this.boss ? "boss" : TARGET.id);
                }
              }
              for (const OTHER of this.projectiles) {
                if (OTHER === CURRENT || !OTHER.isPopcorn || OTHER.exploded || !OTHER.landed || QUEUED.has(OTHER.id)) {
                  continue;
                }
                if (Math.hypot(OTHER.x - CURRENT.x, OTHER.y - CURRENT.y) <= RANGE + OTHER.radius) {
                  QUEUE.push(OTHER);
                }
              }
              this.combat("popcorn-explosion", {
                unit: CURRENT.owner,
                ownerId: CURRENT.ownerId || "",
                species: CURRENT.species,
                x: CURRENT.x,
                y: CURRENT.y,
                radius: RANGE
              });
            }
            return triggered;
          } finally {
            if (BATCH) {
              this._endSpatialQueryBatch();
            }
          }
        }
        updateProjectiles(dt) {
          const BATCH = !this._spatialStepActive;
          if (BATCH) {
            this._beginSpatialQueryBatch();
          }
          try {
            for (const PROJECTILE2 of this.projectiles) {
              PROJECTILE_BEHAVIORS.forProjectile(PROJECTILE2).update(this, PROJECTILE2, dt);
            }
            for (const PROJECTILE2 of this.projectiles) {
              PROJECTILE_BEHAVIORS.forProjectile(PROJECTILE2).updateChain(this, PROJECTILE2);
            }
            this.projectiles = this.projectiles.filter(
              (projectile) => PROJECTILE_BEHAVIORS.forProjectile(projectile).isAlive(projectile)
            );
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
            return;
          }
          if (u.ability.update(this, dt) || u.stun > 0 || u.z > 0.1 || u.landingRecovery > 0) {
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
            x: B_LOCAL.x,
            y: B_LOCAL.y
          } : {
            id: TARGET_ID,
            x: B_LOCAL.x + DX / N * (B_LOCAL.radius + u.radius - 0.16),
            y: B_LOCAL.y + DY / N * (B_LOCAL.radius + u.radius - 0.16)
          };
          if (this.scatterApplies(u) && BEHAVIOR.attack === "contact" && this.scatterSegmentBlocked(
            u.x,
            u.y,
            TARGET.x,
            TARGET.y,
            this.localScatter.radius + u.radius + CONFIG.scatter.bodyMargin
          )) {
            return;
          }
          u.ability.begin(this, TARGET);
        }
        finish(outcome) {
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
          }
          this.cleanupBattleSummons();
          this.combat(outcome, {
            x: this.boss.x,
            y: this.boss.y,
            z: 0,
            bossPatternElapsed: BOSS_PATTERN_ELAPSED
          });
        }
        finishFarmBossEvent(outcome) {
          if (this.scene !== "farm" || this.farmBossEvent.phase !== "fighting") {
            return false;
          }
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
            if (U.hp > 0) {
              U.ability.interrupt();
            }
          }
          if (outcome === "victory") {
            const SETTLEMENT2 = settleBossKill(this, {
              encounterId: ENCOUNTER_ID,
              source: "farm",
              species: this.boss.species,
              tier: 1,
              x: this.boss.x,
              y: this.boss.y
            });
            const REWARD2 = SETTLEMENT2.receipt;
            this.combat("farm-boss-xp", {
              encounterId: ENCOUNTER_ID,
              xp: SETTLEMENT2.xpAwarded,
              levelsGained: SETTLEMENT2.levelsGained,
              pointsAwarded: SETTLEMENT2.pointsAwarded
            });
            this.combat("farm-boss-reward", {
              acquired: REWARD2.status === "granted",
              pending: REWARD2.status === "pending",
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
          applyDamageToTargets(null, [unit], {
            rawDamage: B_LOCAL.attackPower * CONFIG_LOCAL.damageMultiplier * (GUARD?.receivedDamageMultiplier ?? 1),
            sourceKind: "enemy"
          });
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
        bossMouthPoint(released) {
          return bossMouthWorldPoint(this.boss, released);
        }
        bossSummonLanding(angle, action = null) {
          const B_LOCAL = this.boss, SCENE = this.scene, RADIUS = UNIT_RADIUS_FOR_TIER(1);
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
          this.units.push(UNIT_LOCAL);
          this._trackUnitAdded(UNIT_LOCAL);
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
                  const AMOUNT = Math.min(B_LOCAL.moveSpeed * dt, D_LOCAL - CONTACT), NEXT = {
                    x: B_LOCAL.x + DX / D_LOCAL * AMOUNT,
                    y: B_LOCAL.y + DY / D_LOCAL * AMOUNT
                  }, BOUNDED = ARENA_GEOMETRY.clamp(NEXT, this.scene, B_LOCAL.radius + 0.25), OLD = {
                    x: B_LOCAL.x,
                    y: B_LOCAL.y,
                    z: B_LOCAL.z
                  };
                  B_LOCAL.x = BOUNDED.x;
                  B_LOCAL.y = BOUNDED.y;
                  B_LOCAL.travel += Math.hypot(B_LOCAL.x - OLD.x, B_LOCAL.y - OLD.y);
                }
              }
              return;
            }
          }
          if (!action) {
            return;
          }
          action.phaseElapsed += dt;
          BOSS_BEHAVIORS.update(this, action, dt, living);
        }
        updateBoss(dt) {
          const B_LOCAL = this.boss;
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
      level: player.level,
      experience: player.experience,
      availablePoints: player.availablePoints,
      farmUpgrades: {
        ...player.farmUpgrades
      },
      abilities: Object.fromEntries(
        Object.entries(player.abilities).map(([id, build]) => [
          id,
          {
            rootUnlocked: build.rootUnlocked,
            powerLevel: build.powerLevel,
            gradeLevel: build.gradeLevel
          }
        ])
      ),
      processedBossKillReceipts: [...player.processedBossKillReceipts]
    };
  }
  function pendingReward(reward) {
    const ROLLS = reward.drops ? reward.drops.filter((drop) => drop.status === "pending").map((drop) => drop.roll) : [reward.roll];
    const RESULT = {
      encounterId: reward.encounterId,
      source: reward.source,
      receiptKey: reward.receiptKey || `${reward.source}:${reward.encounterId}`,
      species: reward.species,
      tier: reward.tier,
      chance: reward.chance,
      rolls: ROLLS
    };
    for (const KEY2 of REWARD_EXTRAS) {
      if (reward[KEY2] !== void 0) {
        RESULT[KEY2] = reward[KEY2];
      }
    }
    return RESULT;
  }
  function cohortValues(unit) {
    return [
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
    const GROUPS = /* @__PURE__ */ new Map();
    for (const UNIT3 of world.units) {
      if (UNIT3.isBattleOnlySummon || UNIT3.countsTowardPermanentRoster === false || UNIT3.faction !== "player") {
        continue;
      }
      const [SPECIES, TIER, FED, GROWTH, DURATION, COOLDOWN, COOLDOWN_DURATION, REST] = cohortValues(UNIT3);
      const KEY2 = [
        SPECIES,
        TIER,
        Number(FED),
        GROWTH,
        GROWTH ? DURATION : 0,
        COOLDOWN,
        COOLDOWN ? COOLDOWN_DURATION : 0,
        REST
      ].join(":");
      const PREVIOUS = GROUPS.get(KEY2);
      if (PREVIOUS) {
        PREVIOUS.count++;
        continue;
      }
      const ROW = {
        species: SPECIES,
        tier: TIER,
        count: 1
      };
      if (FED) {
        ROW.fed = true;
      }
      if (GROWTH > 0) {
        ROW.growth = {
          remaining: GROWTH,
          duration: DURATION
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
      mode: world.mode,
      player: copyPlayer(world.playerProgression),
      roster: ROSTER2,
      food: {
        count: world.food.length,
        remainder: world.foodTaps.remainder,
        produced: world.foodTaps.produced
      },
      totals: {
        births: world.metrics.births,
        merges: world.metrics.merges
      },
      bossStages: {
        currentStage: STAGE.currentStage,
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
          pendingRewards: world.bossRewardReceipts.filter((reward) => reward.status === "pending").map(pendingReward)
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
    keys(data, ["seed", "rngState", "mode", "player", "roster", "food", "totals", "bossStages", "ledger"]);
    ASSERT(
      INTEGER(data.seed, 0, 4294967295) && INTEGER(data.rngState, 0, 4294967295) && ["breed", "merge"].includes(data.mode)
    );
    const PLAYER = data.player, DEFAULTS = createPlayerProgressionState();
    keys(PLAYER, Object.keys(DEFAULTS));
    keys(PLAYER.farmUpgrades, Object.keys(DEFAULTS.farmUpgrades));
    keys(PLAYER.abilities, Object.keys(DEFAULTS.abilities));
    for (const BUILD of Object.values(PLAYER.abilities)) {
      keys(BUILD, ["rootUnlocked", "powerLevel", "gradeLevel"]);
    }
    ASSERT(
      isValidPlayerProgressionState(PLAYER) && INTEGER(PLAYER.level, 1) && NUMBER(PLAYER.experience) && Array.isArray(PLAYER.processedBossKillReceipts) && PLAYER.processedBossKillReceipts.length <= 1e5 && PLAYER.processedBossKillReceipts.every(STRING)
    );
    ASSERT(Array.isArray(data.roster) && data.roster.length <= CONFIG.farm.capacity.max);
    let count = 0;
    const COHORTS = /* @__PURE__ */ new Set();
    for (const ROW of data.roster) {
      keys(ROW, ["species", "tier", "count"], ["fed", "growth", "cooldown", "rest"]);
      ASSERT(
        INTEGER(ROW.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER(ROW.tier, 1, CONFIG.unit.maxTier) && INTEGER(ROW.count, 1, CONFIG.farm.capacity.max)
      );
      count += ROW.count;
      if (Object.hasOwn(ROW, "fed")) {
        ASSERT(ROW.fed === true);
      }
      for (const KEY2 of ["growth", "cooldown"]) {
        if (Object.hasOwn(ROW, KEY2)) {
          keys(ROW[KEY2], ["remaining", "duration"]);
          ASSERT(
            NUMBER(ROW[KEY2].remaining, Number.MIN_VALUE, 1e5) && NUMBER(ROW[KEY2].duration, ROW[KEY2].remaining, 1e5)
          );
        }
      }
      if (Object.hasOwn(ROW, "rest")) {
        ASSERT(NUMBER(ROW.rest, Number.MIN_VALUE, CONFIG.unit.corpseRecoverySeconds));
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
    ASSERT(count <= CONFIG.farm.capacity.max);
    keys(data.food, ["count", "remainder", "produced"]);
    ASSERT(INTEGER(data.food.count, 0, 140) && INTEGER(data.food.remainder, 0, 4) && INTEGER(data.food.produced));
    keys(data.totals, ["births", "merges"]);
    ASSERT(INTEGER(data.totals.births) && INTEGER(data.totals.merges));
    const STAGE = data.bossStages;
    keys(STAGE, ["currentStage", "encounterSeed", "encounterEpoch", "nextSelectionId", "selections"]);
    ASSERT(
      INTEGER(STAGE.currentStage, 1, BOSS_REWARD_SETTINGS.maxStage) && INTEGER(STAGE.encounterSeed, 0, 4294967295) && INTEGER(STAGE.encounterEpoch) && INTEGER(STAGE.nextSelectionId, 1) && Array.isArray(STAGE.selections) && STAGE.selections.length <= BOSS_REWARD_SETTINGS.maxStage
    );
    const STAGES = /* @__PURE__ */ new Set(), SELECTIONS = /* @__PURE__ */ new Set();
    for (const ENTRY of STAGE.selections) {
      keys(ENTRY, ["stage", "species", "selectionId"]);
      ASSERT(
        INTEGER(ENTRY.stage, 1, BOSS_REWARD_SETTINGS.maxStage) && INTEGER(ENTRY.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER(ENTRY.selectionId, 1, STAGE.nextSelectionId - 1) && !STAGES.has(ENTRY.stage) && !SELECTIONS.has(ENTRY.selectionId)
      );
      STAGES.add(ENTRY.stage);
      SELECTIONS.add(ENTRY.selectionId);
    }
    const LEDGER = data.ledger;
    keys(LEDGER, ["boss", "raid"]);
    const BOSS2 = LEDGER.boss, RAID = LEDGER.raid;
    keys(BOSS2, ["nextEncounterId", "settledThrough", "pendingRewards"]);
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
    ASSERT(Array.isArray(BOSS2.pendingRewards) && BOSS2.pendingRewards.length <= 1e5);
    const RECEIPTS = /* @__PURE__ */ new Set(), ENCOUNTERS = /* @__PURE__ */ new Set();
    for (const REWARD2 of BOSS2.pendingRewards) {
      keys(REWARD2, ["encounterId", "source", "receiptKey", "species", "tier", "chance", "rolls"], REWARD_EXTRAS);
      ASSERT(
        ["farm", "raid"].includes(REWARD2.source) && INTEGER(REWARD2.encounterId, 1, BOSS2.settledThrough[REWARD2.source]) && STRING(REWARD2.receiptKey) && !RECEIPTS.has(REWARD2.receiptKey) && INTEGER(REWARD2.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER(REWARD2.tier, 1, CONFIG.unit.maxTier) && NUMBER(REWARD2.chance, 0, 1)
      );
      RECEIPTS.add(REWARD2.receiptKey);
      const ENCOUNTER = `${REWARD2.source}:${REWARD2.encounterId}`;
      ASSERT(!ENCOUNTERS.has(ENCOUNTER));
      ENCOUNTERS.add(ENCOUNTER);
      ASSERT(
        Array.isArray(REWARD2.rolls) && REWARD2.rolls.length > 0 && REWARD2.rolls.length <= BOSS_REWARD_SETTINGS.maxStage && REWARD2.rolls.every((roll) => NUMBER(roll, 0, 1) && roll < REWARD2.chance)
      );
      if (REWARD2.acquisitionMultiplier !== void 0) {
        ASSERT(NUMBER(REWARD2.acquisitionMultiplier, 0, 2));
      }
      if (REWARD2.xpReceiptKey !== void 0) {
        ASSERT(STRING(REWARD2.xpReceiptKey));
      }
      if (REWARD2.xpStatus !== void 0) {
        ASSERT(["awarded", "already-awarded", "unsettled"].includes(REWARD2.xpStatus));
      }
      for (const KEY2 of ["xpAmount", "levelsGained", "pointsAwarded"]) {
        if (REWARD2[KEY2] !== void 0) {
          ASSERT(NUMBER(REWARD2[KEY2]));
        }
      }
    }
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
    WORLD.units = [];
    WORLD.food = [];
    WORLD.nextId = 1;
    WORLD.mode = data.mode;
    WORLD.playerProgression = copyPlayer(data.player);
    WORLD.farmBossProgress = structuredClone(data.bossStages);
    Object.assign(WORLD.metrics, data.totals);
    const COUNT = data.roster.reduce((total, row) => total + row.count, 0);
    for (const ROW of data.roster) {
      for (let i = 0; i < ROW.count; i++) {
        const POINT2 = position(WORLD.units.length, COUNT, data.seed, 0.7), UNIT3 = new UNIT(WORLD.nextId++, ROW.species, ROW.tier, POINT2.x, POINT2.y);
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
        WORLD.units.push(UNIT3);
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
    Object.assign(WORLD.foodTaps, {
      remainder: data.food.remainder,
      produced: data.food.produced
    });
    const { boss: BOSS2, raid: RAID } = data.ledger;
    Object.assign(WORLD, {
      nextBossEncounterId: BOSS2.nextEncounterId,
      bossRewardWatermarks: {
        ...BOSS2.settledThrough
      },
      nextRaidRunSequence: RAID.nextRunSequence,
      activeRaidRunSequence: RAID.activeRun?.sequence ?? null,
      activeRaidSessionId: RAID.activeRun?.sessionId ?? null,
      raidSettlementWatermark: RAID.settledThrough
    });
    WORLD.bossRewardReceipts = BOSS2.pendingRewards.map((reward) => {
      const { rolls: ROLLS, ...FIELDS2 } = reward;
      return {
        ...FIELDS2,
        x: 0,
        y: 0,
        roll: ROLLS[0],
        status: "pending",
        unitId: 0,
        rollCount: ROLLS.length,
        drops: ROLLS.map((roll) => ({
          roll,
          status: "pending",
          unitId: 0
        }))
      };
    });
    WORLD.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(data.rngState);
    WORLD.reconcileMateReservations();
    return WORLD;
  }
  var FAIL, ASSERT, INTEGER, NUMBER, STRING, REWARD_EXTRAS;
  var init_farm_progress = __esm({
    "src/farm-progress.js"() {
      init_farm_model();
      init_player_progression();
      init_boss_rewards();
      FAIL = () => {
        throw new TypeError("올바른 농장 진행 저장 데이터가 아닙니다.");
      };
      ASSERT = (value) => {
        if (!value) {
          FAIL();
        }
      };
      INTEGER = (value, min = 0, max = 1e12) => Number.isSafeInteger(value) && value >= min && value <= max;
      NUMBER = (value, min = 0, max = 1e12) => Number.isFinite(value) && value >= min && value <= max;
      STRING = (value) => typeof value === "string" && value.trim().length > 0 && value.length < 256;
      REWARD_EXTRAS = [
        "acquisitionMultiplier",
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
      PRODUCT_VERSION = "0.8.0";
      COMPATIBILITY = PRODUCT_VERSION.split(".").slice(0, 2).join(".");
    }
  });

  // src/farm-snapshot.js
  function shapeFields(shape2, nested = {}) {
    return Object.fromEntries(
      Object.entries(shape2).map(([key, value]) => [
        key,
        nested[key] ?? (Array.isArray(value) ? [true] : value && typeof value === "object" ? shapeFields(value) : true)
      ])
    );
  }
  function copyJsonPayload(value, depth = 0) {
    if (depth >= 18) {
      throw new TypeError("올바른 농장 저장 데이터가 아닙니다.");
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
      throw new TypeError("올바른 농장 저장 데이터가 아닙니다.");
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
      throw new TypeError("올바른 농장 저장 데이터가 아닙니다.");
    }
    if (Array.isArray(recipe)) {
      if (!Array.isArray(value) && !(value instanceof Set)) {
        throw new TypeError("올바른 농장 저장 데이터가 아닙니다.");
      }
      return Array.from(value, (item) => copyFields(item, recipe[0]));
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("올바른 농장 저장 데이터가 아닙니다.");
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
    return copyFields(world, SNAPSHOT_FIELDS);
  }
  var UNIT_SNAPSHOT_SHAPE, LEGACY_STARTER, PATTERN_VALUES, ABILITY_INVESTMENTS, FARM_SNAPSHOT_SHAPE, LEGACY_UNIT_DEFAULT_KEYS, FIELDS, POINT, PATH, POPCORN, ATTACK, UNIT2, BOSS_ACTION, BOSS, DROP, REWARD, JSON_PAYLOAD, SETTLEMENT, PROGRESSION, RUNTIME_PROGRESSION, ROSTER, PROJECTILE, SNAPSHOT_FIELDS;
  var init_farm_snapshot = __esm({
    "src/farm-snapshot.js"() {
      UNIT_SNAPSHOT_SHAPE = {
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
        id: 1,
        species: 0,
        tier: 1,
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
      };
      LEGACY_STARTER = (id, x, y) => ({
        ...UNIT_SNAPSHOT_SHAPE,
        id,
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
      PATTERN_VALUES = (value) => Object.fromEntries(
        [
          "attack.sweep-360",
          "attack.front-slam",
          "attack.charge",
          "attack.leap-slam",
          "attack.fan-sweep",
          "summon.mouth-t1"
        ].map((id) => [id, value])
      );
      ABILITY_INVESTMENTS = () => Object.fromEntries(
        [
          "pea-death-split",
          "corn-burst-fire",
          "corn-popcorn-chain",
          "chestnut-spike-fan",
          "kidney-continuous-leap",
          "kidney-landing-shockwave",
          "peanut-separated-assault",
          "walnut-guard-slam",
          "rice-low-health-harvest",
          "wheat-command-crit",
          "barley-armor-break"
        ].map((id) => [
          id,
          {
            rootUnlocked: false,
            powerLevel: 0,
            gradeLevel: 0
          }
        ])
      );
      FARM_SNAPSHOT_SHAPE = {
        seed: 731,
        notices: [],
        eventSequence: 0,
        mergeTask: null,
        corpseRecoveryVersion: 1,
        rng: {
          state: 3031296687
        },
        units: [
          LEGACY_STARTER(1, 1.7868577390909195, -0.7556014072615653),
          LEGACY_STARTER(2, -1.5288560669869184, -0.5486694728024304)
        ],
        food: [],
        effects: [],
        events: [],
        time: 0,
        nextId: 3,
        nextBossEncounterId: 1,
        bossRewardReceipts: [],
        bossRewardWatermarks: {
          farm: 0,
          raid: 0
        },
        nextRaidRunSequence: 0,
        activeRaidRunSequence: null,
        activeRaidSessionId: null,
        raidSettlementWatermark: 0,
        raidSettlementReceipts: [],
        playerProgression: {
          schemaVersion: 1,
          availablePoints: 0,
          farmUpgrades: {
            food: 0,
            growth: 0,
            breed: 0,
            merge: 0,
            capacity: 0
          },
          abilities: ABILITY_INVESTMENTS(),
          level: 1,
          experience: 0,
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
        attackSerial: 0,
        projectileSerial: 0,
        raidSummonSerial: 0,
        bossSummonSerial: 0,
        combatLog: [],
        farmBossProgress: {
          currentStage: 1,
          encounterSeed: 2738959287,
          encounterEpoch: 0,
          nextSelectionId: 1,
          selections: []
        },
        mode: "breed",
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
          airborneRecovery: 0,
          barleyArmorBreakUntil: 0,
          barleyArmorBreakReduction: 0,
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
      LEGACY_UNIT_DEFAULT_KEYS = Object.freeze([
        "walnutEmpoweredNextBasic",
        "wheatCommandUntil",
        "wheatCommandCritBonus",
        "barleyArmorBreakUntil",
        "barleyArmorBreakReduction",
        "isBattleOnlySummon",
        "battleSummonKind",
        "battleSummonParentId",
        "battleSummonEncounterId",
        "countsTowardPermanentRoster",
        "eligibleForRaidDeployment",
        "breedingEligible",
        "mergeEligible",
        "canSplit",
        "splitUsedThisBattle",
        "deathSplitHandled",
        "usesPersistentSleep",
        "lifetime",
        "chestnutBasicCycles",
        "landingRecovery",
        "growthDuration",
        "mateId",
        "perceptionRange",
        "ownerId",
        "farmId",
        "dropLanded"
      ]);
      FIELDS = (names, nested = {}) => ({
        ...Object.fromEntries(
          names.split(" ").filter(Boolean).map((key) => [key, true])
        ),
        ...nested
      });
      POINT = FIELDS("x y z id");
      PATH = FIELDS("height duration", {
        from: POINT,
        to: POINT
      });
      POPCORN = FIELDS(
        "species fuseSeconds chainOnPopcornContact triggersOncePerProjectile eachTargetAtMostOncePerProjectile damageMultiplier radiusBaseRangeFraction radiusMultiplier radius"
      );
      ATTACK = FIELDS(
        "id targetId hit resolvedMask hitMask peanutStrikeCount peanutAttackMultiplier peanutSpreadRadians walnutEmpowered walnutGuardUsed",
        {
          target: POINT,
          path: PATH,
          pendingShots: [FIELDS("shotIndex delaySeconds attackMultiplier")],
          projectileAbility: {
            popcorn: POPCORN
          }
        }
      );
      UNIT2 = shapeFields(UNIT_SNAPSHOT_SHAPE, {
        ability: {
          phase: true,
          elapsed: true,
          action: ATTACK
        }
      });
      BOSS_ACTION = FIELDS("id phase phaseElapsed targetId aim locked traveled volleyCount released nextRelease", {
        target: POINT,
        start: POINT,
        path: PATH,
        hitIds: [true],
        landingPoints: [POINT]
      });
      BOSS = shapeFields(FARM_SNAPSHOT_SHAPE.boss, {
        patternRuntime: shapeFields(FARM_SNAPSHOT_SHAPE.boss.patternRuntime, {
          active: BOSS_ACTION
        })
      });
      DROP = FIELDS("roll status unitId");
      REWARD = FIELDS(
        "encounterId source receiptKey acquisitionMultiplier species tier x y chance roll status unitId rollCount xpReceiptKey xpStatus xpAmount levelsGained pointsAwarded",
        {
          drops: [DROP]
        }
      );
      JSON_PAYLOAD = /* @__PURE__ */ Symbol("json-payload");
      SETTLEMENT = FIELDS(
        "key ownerId sessionId encounterId runSequence outcome status completedAtMs availableAtStart originalUnitsDeployed deploymentMultiplier",
        {
          sleptFarmUnitIds: [true],
          reward: JSON_PAYLOAD
        }
      );
      PROGRESSION = shapeFields(FARM_SNAPSHOT_SHAPE.playerProgression);
      RUNTIME_PROGRESSION = FIELDS("schemaVersion level availablePoints", {
        farmUpgrades: PROGRESSION.farmUpgrades,
        abilities: PROGRESSION.abilities
      });
      ROSTER = FIELDS(
        "ownerId settlementSessionId settlementRunSequence settlementEncounterId lastDeploySequence buffUntil buffReadyAt",
        {
          troops: [FIELDS("farmId species tier deployed")],
          abilitySnapshot: RUNTIME_PROGRESSION
        }
      );
      PROJECTILE = FIELDS(
        "id owner targetId faction ownerId species tier elapsed x y z radius height hit attackMultiplier shotIndex projectileKind fanIndex isPopcorn landed exploded fuseRemaining explosionLife",
        {
          path: PATH,
          popcornConfig: POPCORN,
          damagedTargetIds: [true]
        }
      );
      SNAPSHOT_FIELDS = shapeFields(FARM_SNAPSHOT_SHAPE, {
        units: [UNIT2],
        boss: BOSS,
        playerProgression: PROGRESSION,
        raidRosters: [ROSTER],
        projectiles: [PROJECTILE],
        bossRewardReceipts: [REWARD],
        raidSettlementReceipts: [SETTLEMENT],
        food: [FIELDS("x y z vx vy vz seed phase tx ty")],
        events: [JSON_PAYLOAD],
        effects: [JSON_PAYLOAD],
        notices: [JSON_PAYLOAD],
        combatLog: [JSON_PAYLOAD],
        farmBossProgress: shapeFields(FARM_SNAPSHOT_SHAPE.farmBossProgress, {
          selections: [FIELDS("stage species selectionId")]
        }),
        mergeTask: FIELDS("phase aId bId elapsed duration resultId sourceSpecies sourceTier", {
          materialIds: [true]
        })
      });
    }
  });

  // src/raid-settlement.js
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
        const VALID_SPLIT = hasFaction(UNIT3, FACTION_CONFIG.PLAYER) && UNIT3.isBattleOnlySummon === true && UNIT3.battleSummonKind === "pea-death-split" && Number.isSafeInteger(UNIT3.battleSummonParentId) && UNIT3.battleSummonParentId > 0 && PARENT && PARENT.ownerId === ownerId && !isBattleOnlySummon(PARENT) && PARENT.hp <= 0 && PARENT_TROOP?.deployed === true && PARENT.farmId === UNIT3.farmId && PARENT.species === 0 && UNIT3.species === 0 && UNIT3.tier === 1 && UNIT3.canSplit === false && UNIT3.countsTowardPermanentRoster === false && UNIT3.eligibleForRaidDeployment === false && UNIT3.breedingEligible === false && UNIT3.mergeEligible === false && UNIT3.usesPersistentSleep === false;
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
          deploymentMultiplier
        });
        if (!RESOLUTION || !RESOLUTION.farm || typeof RESOLUTION.farm !== "object" || Array.isArray(RESOLUTION.farm) || !Array.isArray(RESOLUTION.farm.units)) {
          FAIL2("The Raid victory resolver must return a private Farm snapshot and summary");
        }
        validateReturnedPrivateFarm(farm, RESOLUTION.farm, DEAD_FARM_UNIT_IDS);
        privateFarm = clone(RESOLUTION.farm);
        rewardSummary = RESOLUTION.summary ?? null;
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
  var RAID_SLEEP_SECONDS, RAID_SETTLEMENT_RECEIPT_LIMIT, FAIL2, IS_NON_EMPTY_STRING, IS_COUNT;
  var init_raid_settlement = __esm({
    "src/raid-settlement.js"() {
      init_unit_grades();
      init_factions();
      init_species_catalog();
      init_farm_boss_stages();
      RAID_SLEEP_SECONDS = 60;
      RAID_SETTLEMENT_RECEIPT_LIMIT = 128;
      FAIL2 = (message) => {
        throw new TypeError(message);
      };
      IS_NON_EMPTY_STRING = (value) => typeof value === "string" && value.trim().length > 0;
      IS_COUNT = (value) => Number.isSafeInteger(value) && value >= 0;
    }
  });

  // src/farm-snapshot-validation.js
  function assertSnapshot(ok) {
    if (!ok) {
      throw new TypeError("올바른 농장 저장 데이터가 아닙니다.");
    }
  }
  function finiteTree(v, depth = 0, key = "") {
    ASSERT2(depth < 18);
    if (typeof v === "number") {
      ASSERT2(Number.isFinite(v) && Math.abs(v) < 1e13);
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
  function shape(v, t) {
    ASSERT2(v !== null && typeof v === "object" && !Array.isArray(v));
    ASSERT2(Object.keys(v).length === Object.keys(t).length);
    for (const [K, X] of Object.entries(t)) {
      ASSERT2(Object.hasOwn(v, K));
      if (X === null) {
        continue;
      }
      if (Array.isArray(X)) {
        ASSERT2(Array.isArray(v[K]));
        continue;
      }
      if (typeof X === "object") {
        shape(v[K], X);
      } else {
        ASSERT2(typeof v[K] === typeof X);
      }
    }
  }
  function validateSnapshot(raw) {
    finiteTree(raw);
    shape(raw, FARM_SNAPSHOT_SHAPE);
    ASSERT2(INTEGER2(raw.seed, 0, 4294967295) && INTEGER2(raw.rng.state, 0, 4294967295));
    ASSERT2(["farm", "raid"].includes(raw.scene) && ["breed", "merge"].includes(raw.mode));
    if (raw.mergeTask !== null) {
      const T = raw.mergeTask;
      ASSERT2(
        raw.scene === "farm" && raw.mode === "merge" && T && ["approach", "animation"].includes(T.phase) && Number.isFinite(T.elapsed) && T.elapsed >= 0 && Number.isFinite(T.duration) && T.duration > 0 && T.duration <= CONFIG.farm.merge.animationSeconds + 1e-9 && Array.isArray(T.materialIds) && T.materialIds.length >= 2 && T.materialIds.length <= CONFIG.farm.merge.maxMaterials && new Set(T.materialIds).size === T.materialIds.length && T.materialIds.every((id) => INTEGER2(id, 1, CONFIG.farm.maxUnitId))
      );
      if (T.phase === "approach") {
        const MATERIALS = T.materialIds.map((id) => raw.units.find((u) => u.id === id)), FIRST = MATERIALS[0], COST = mergeMaterialCostForTier(FIRST?.tier + 1), SAME_SPECIES_COUNT = raw.units.filter(
          (u) => !u.isBattleOnlySummon && u.species === FIRST?.species
        ).length;
        ASSERT2(
          INTEGER2(T.aId, 1, CONFIG.farm.maxUnitId) && INTEGER2(T.bId, 1, CONFIG.farm.maxUnitId) && T.aId === T.materialIds[0] && T.bId === T.materialIds[1] && COST === MATERIALS.length && FIRST && MATERIALS.every((u) => u && u.tier === FIRST.tier && u.species === FIRST.species) && SAME_SPECIES_COUNT - MATERIALS.length + 1 >= 2
        );
      } else {
        const RESULT = raw.units.find((u) => u.id === T.resultId);
        ASSERT2(
          T.aId === 0 && T.bId === 0 && T.elapsed <= T.duration + 1e-9 && INTEGER2(T.resultId, 1, CONFIG.farm.maxUnitId) && RESULT && INTEGER2(T.sourceSpecies, 0, CONFIG.unit.speciesCount - 1) && INTEGER2(T.sourceTier, 1, CONFIG.unit.maxTier - 1) && RESULT.species === T.sourceSpecies && RESULT.tier === T.sourceTier + 1 && T.materialIds.length === mergeMaterialCostForTier(RESULT.tier)
        );
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
        FARM_EVENT.outcome === "victory" ? ["missed", "pending", "granted"].includes(FARM_EVENT.rewardStatus) : FARM_EVENT.rewardStatus === "none"
      );
    }
    ASSERT2(
      raw.bossRewardWatermarks && INTEGER2(raw.bossRewardWatermarks.farm, 0, 1e12) && INTEGER2(raw.bossRewardWatermarks.raid, 0, 1e12) && raw.nextBossEncounterId > raw.bossRewardWatermarks.farm
    );
    const REWARD_IDS = /* @__PURE__ */ new Set();
    for (const REWARD2 of raw.bossRewardReceipts) {
      ASSERT2(
        REWARD2 && INTEGER2(REWARD2.encounterId, 1, 1e12) && ["farm", "raid"].includes(REWARD2.source) && REWARD2.encounterId <= raw.bossRewardWatermarks[REWARD2.source] && INTEGER2(REWARD2.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER2(REWARD2.tier, 1, CONFIG.unit.maxTier) && Number.isFinite(REWARD2.x) && Number.isFinite(REWARD2.y) && Number.isFinite(REWARD2.chance) && REWARD2.chance >= 0 && REWARD2.chance <= 1 && Number.isFinite(REWARD2.roll) && REWARD2.roll >= 0 && REWARD2.roll < 1 && ["pending", "missed", "granted"].includes(REWARD2.status) && INTEGER2(REWARD2.unitId, 0, CONFIG.farm.maxUnitId)
      );
      const KEY2 = REWARD2.receiptKey || REWARD2.source + ":" + REWARD2.encounterId;
      ASSERT2(!REWARD_IDS.has(KEY2));
      REWARD_IDS.add(KEY2);
      ASSERT2(REWARD2.status === "granted" === REWARD2.unitId > 0);
      if (REWARD2.drops !== void 0) {
        ASSERT2(
          Array.isArray(REWARD2.drops) && REWARD2.drops.length <= BOSS_REWARD_SETTINGS.maxStage && INTEGER2(REWARD2.rollCount, 0, BOSS_REWARD_SETTINGS.maxStage) && REWARD2.drops.length === REWARD2.rollCount
        );
        for (const DROP2 of REWARD2.drops) {
          ASSERT2(
            DROP2 && Number.isFinite(DROP2.roll) && DROP2.roll >= 0 && DROP2.roll < 1 && ["pending", "missed", "granted"].includes(DROP2.status) && INTEGER2(DROP2.unitId, 0, CONFIG.farm.maxUnitId) && DROP2.status === "granted" === DROP2.unitId > 0
          );
        }
        ASSERT2(
          REWARD2.status === (REWARD2.drops.some((drop) => drop.status === "pending") ? "pending" : REWARD2.drops.some((drop) => drop.status === "granted") ? "granted" : "missed")
        );
      }
      if (REWARD2.receiptKey !== void 0) {
        ASSERT2(
          typeof REWARD2.receiptKey === "string" && REWARD2.receiptKey.length > 0 && REWARD2.receiptKey.length < 256
        );
      }
      if (REWARD2.acquisitionMultiplier !== void 0) {
        ASSERT2(
          Number.isFinite(REWARD2.acquisitionMultiplier) && REWARD2.acquisitionMultiplier >= 0 && REWARD2.acquisitionMultiplier <= 2
        );
      }
      if (REWARD2.source === "farm" && REWARD2.status === "granted") {
        ASSERT2(REWARD2.unitId < raw.nextId);
      }
    }
    const STAGE_PROGRESS = raw.farmBossProgress;
    ASSERT2(
      STAGE_PROGRESS && INTEGER2(STAGE_PROGRESS.currentStage, 1, BOSS_REWARD_SETTINGS.maxStage) && INTEGER2(STAGE_PROGRESS.encounterSeed, 0, 4294967295) && INTEGER2(STAGE_PROGRESS.encounterEpoch, 0, 1e12) && INTEGER2(STAGE_PROGRESS.nextSelectionId, 1, 1e12) && Array.isArray(STAGE_PROGRESS.selections) && STAGE_PROGRESS.selections.length <= BOSS_REWARD_SETTINGS.maxStage
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
        raw.raidExpectedPlayers.includes(R2.ownerId) && !ROSTER_OWNERS.has(R2.ownerId) && Array.isArray(R2.troops) && R2.troops.length <= CONFIG.raid.capacity.playerUnits && isValidAbilityRuntimeSnapshot(R2.abilitySnapshot)
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
        Number.isFinite(U.growthElapsed) && U.growthElapsed >= 0 && Number.isFinite(U.growthDuration) && U.growthDuration > 0 && U.growthElapsed <= U.growthDuration + 1e-9 && Number.isFinite(U.cooldown) && U.cooldown >= 0 && Number.isFinite(U.cooldownDuration) && U.cooldownDuration >= U.cooldown - 1e-9 && U.cooldownDuration <= 1e5 && INTEGER2(U.mateId, 0, MATE_ID_LIMIT) && Number.isFinite(U.perceptionRange) && U.perceptionRange > 0 && U.perceptionRange <= 100 && Number.isFinite(U.down) && U.down >= 0 && U.down <= CONFIG.unit.corpseRecoverySeconds && INTEGER2(U.battleSummonEncounterId, 0, 1e12) && Number.isFinite(U.landingRecovery) && U.landingRecovery >= 0 && U.landingRecovery <= 0.25 + 1e-9 && Number.isFinite(U.wheatCommandUntil) && U.wheatCommandUntil >= 0 && U.wheatCommandUntil <= 1e12 && Number.isFinite(U.wheatCommandCritBonus) && U.wheatCommandCritBonus >= 0 && U.wheatCommandCritBonus <= 0.5 && Number.isFinite(U.barleyArmorBreakUntil) && U.barleyArmorBreakUntil >= 0 && U.barleyArmorBreakUntil <= 1e12 && Number.isFinite(U.barleyArmorBreakReduction) && U.barleyArmorBreakReduction >= 0 && U.barleyArmorBreakReduction <= 0.75
      );
      ASSERT2(
        INTEGER2(U.species, 0, CONFIG.unit.speciesCount - 1) && INTEGER2(U.tier, 1, CONFIG.unit.maxTier) && ["idle", "windup", "active", "recover"].includes(U.ability.phase) && typeof U.ownerId === "string" && Number.isSafeInteger(U.farmId) && Object.values(FACTION_CONFIG).includes(U.faction) && typeof U.dropLanded === "boolean" && typeof U.isBattleOnlySummon === "boolean" && typeof U.splitUsedThisBattle === "boolean" && typeof U.deathSplitHandled === "boolean" && typeof U.walnutEmpoweredNextBasic === "boolean" && INTEGER2(U.chestnutBasicCycles, 0, 1e12)
      );
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
        if (hasFaction(U, FACTION_CONFIG.PLAYER) && U.battleSummonKind === "pea-death-split") {
          ASSERT2(
            ["farm", "raid"].includes(raw.scene) && INTEGER2(U.battleSummonParentId, 1, Number.MAX_SAFE_INTEGER) && U.battleSummonEncounterId === 0 && hasUnitCapability(U.species, "deathSplit") && U.tier === 1 && U.canSplit === false && U.countsTowardPermanentRoster === false && U.eligibleForRaidDeployment === false && U.breedingEligible === false && U.mergeEligible === false && U.usesPersistentSleep === false && U.lifetime === "until-death-or-battle-end" && U.deathSplitHandled === false && U.splitUsedThisBattle === true && U.hp > 0
          );
          const PARENT = UNITS_BY_ID.get(U.battleSummonParentId);
          ASSERT2(
            PARENT && hasFaction(PARENT, FACTION_CONFIG.PLAYER) && PARENT.isBattleOnlySummon === false && PARENT.hp <= 0 && hasUnitCapability(PARENT.species, "deathSplit") && PARENT.species === U.species && PARENT.splitUsedThisBattle && PARENT.ownerId === U.ownerId && PARENT.farmId === U.farmId
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
          INTEGER2(A.id, 1, raw.attackSerial) && typeof A.hit === "boolean" && A.target && Number.isFinite(A.target.x) && Number.isFinite(A.target.y)
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
        if (hasUnitCapability(U.species, "guard")) {
          ASSERT2(typeof A.walnutEmpowered === "boolean" && typeof A.walnutGuardUsed === "boolean");
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
          ASSERT2(A.projectileAbility && Object.hasOwn(A.projectileAbility, "popcorn"));
          if (A.projectileAbility.popcorn) {
            validatePopcornConfig(A.projectileAbility.popcorn);
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
      ASSERT2(CHILDREN.length <= MAX_BEAN_SPLIT_CHILDREN);
      const PARENT = UNITS_BY_ID.get(PARENT_ID);
      ASSERT2(PARENT && PARENT.ownerId === CHILDREN[0].ownerId && PARENT.farmId === CHILDREN[0].farmId);
    }
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
      if (P.isPopcorn) {
        ASSERT2(
          typeof P.landed === "boolean" && typeof P.exploded === "boolean" && Array.isArray(P.damagedTargetIds) && P.damagedTargetIds.length <= CONFIG.raid.capacity.battleUnits + 1 && P.damagedTargetIds.every((id) => id === "boss" || VALID_BATTLE_UNIT_ID(id, raw.bossSummonSerial)) && new Set(P.damagedTargetIds).size === P.damagedTargetIds.length && Number.isFinite(P.fuseRemaining) && P.fuseRemaining >= 0 && P.fuseRemaining <= 1.01
        );
        validatePopcornConfig(P.popcornConfig);
        if (P.exploded) {
          ASSERT2(Number.isFinite(P.explosionLife) && P.explosionLife >= 0 && P.explosionLife < 0.5 + 1e-9);
        }
      }
    }
    ASSERT2(
      INTEGER2(raw.projectileSerial, 0, 1e12) && INTEGER2(raw.raidSummonSerial, 0, CONFIG.raid.capacity.battleUnits) && INTEGER2(raw.bossSummonSerial, 0, 1e12)
    );
    ASSERT2(
      hasFaction(raw.boss, FACTION_CONFIG.ENEMY) && raw.boss.hp >= 0 && raw.boss.hp <= raw.boss.maxHp && INTEGER2(raw.boss.species, 0, CONFIG.unit.speciesCount - 1) && raw.boss.maxHp > 0 && INTEGER2(raw.boss.stage, 0, BOSS_REWARD_SETTINGS.maxStage) && Number.isFinite(raw.boss.attackPower) && raw.boss.attackPower >= 4 && Number.isFinite(raw.boss.moveSpeed) && raw.boss.moveSpeed > 0 && INTEGER2(raw.boss.encounterId, 0, 1e12) && raw.boss.radius === CONFIG.boss.radius && raw.boss.height === CONFIG.boss.height && Number.isFinite(raw.boss.barleyArmorBreakUntil) && raw.boss.barleyArmorBreakUntil >= 0 && raw.boss.barleyArmorBreakUntil <= 1e12 && Number.isFinite(raw.boss.barleyArmorBreakReduction) && raw.boss.barleyArmorBreakReduction >= 0 && raw.boss.barleyArmorBreakReduction <= 0.75
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
  function validatePopcornConfig(c) {
    ASSERT2(
      c && c.species === 1 && c.fuseSeconds === 1 && c.chainOnPopcornContact === true && c.triggersOncePerProjectile === true && c.eachTargetAtMostOncePerProjectile === true && Number.isFinite(c.damageMultiplier) && c.damageMultiplier >= 0.5 && c.damageMultiplier <= 1.5 && c.radiusBaseRangeFraction === 0.25 && Number.isFinite(c.radiusMultiplier) && c.radiusMultiplier >= 1 && c.radiusMultiplier <= 2 && Number.isFinite(c.radius) && c.radius > 0 && c.radius <= 10
    );
  }
  var INTEGER2, VALID_BATTLE_UNIT_ID, ASSERT2;
  var init_farm_snapshot_validation = __esm({
    "src/farm-snapshot-validation.js"() {
      init_farm_model();
      init_player_progression();
      init_ability_state();
      init_species_abilities();
      init_unit_abilities();
      init_raid_settlement();
      init_unit_grades();
      init_boss_patterns();
      init_boss_rewards();
      init_factions();
      init_farm_snapshot();
      INTEGER2 = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
      VALID_BATTLE_UNIT_ID = (id, bossSummonSerial) => INTEGER2(id, 1, CONFIG.farm.maxUnitId) || INTEGER2(id, CONFIG.boss.summonIdBase + 1, CONFIG.boss.summonIdBase + bossSummonSerial);
      ASSERT2 = assertSnapshot;
    }
  });

  // src/farm-snapshot-migrations.js
  function normalizeSnapshot(raw, { migrateLegacyRaid = false, clone: clone2 = true } = {}) {
    const RESET_LEGACY_CORPSE_TIMERS = !Object.hasOwn(raw, "corpseRecoveryVersion"), HAS_REWARD_WATERMARKS = Object.hasOwn(raw, "bossRewardWatermarks");
    if (clone2) {
      raw = structuredClone(raw);
    }
    delete raw.progress;
    if (raw.speed === 1 || raw.speed === 4) {
      delete raw.speed;
    }
    if (RESET_LEGACY_CORPSE_TIMERS) {
      raw.corpseRecoveryVersion = 1;
    }
    if (!Object.hasOwn(raw, "farmBossProgress")) {
      raw.farmBossProgress = createFarmBossProgress(raw.seed);
    }
    const BASE = FARM_SNAPSHOT_SHAPE, FILL = (v, d) => {
      for (const [K, X] of Object.entries(d)) {
        if (!Object.hasOwn(v, K)) {
          v[K] = structuredClone(X);
        } else if (v[K] && X && typeof v[K] === "object" && typeof X === "object" && !Array.isArray(v[K]) && !Array.isArray(X)) {
          FILL(v[K], X);
        }
      }
    };
    FILL(raw, BASE);
    if (raw.mergeTask && (!Array.isArray(raw.mergeTask.materialIds) || raw.mergeTask.phase === "animation" && !Number.isSafeInteger(raw.mergeTask.resultId))) {
      raw.mergeTask = null;
    }
    for (const R2 of raw.raidRosters || []) {
      if (!Object.hasOwn(R2, "abilitySnapshot")) {
        R2.abilitySnapshot = createAbilityRuntimeSnapshot(createPlayerProgressionState());
      } else if (!Object.hasOwn(R2.abilitySnapshot, "farmUpgrades")) {
        R2.abilitySnapshot.farmUpgrades = structuredClone(createPlayerProgressionState().farmUpgrades);
      }
      if (R2.abilitySnapshot?.abilities && typeof R2.abilitySnapshot.abilities === "object" && !Array.isArray(R2.abilitySnapshot.abilities)) {
        for (const [ID, VALUE] of Object.entries(BASE.playerProgression.abilities)) {
          if (!Object.hasOwn(R2.abilitySnapshot.abilities, ID)) {
            R2.abilitySnapshot.abilities[ID] = structuredClone(VALUE);
          }
        }
      }
      if (!Object.hasOwn(R2, "settlementSessionId")) {
        R2.settlementSessionId = "";
      }
      if (!Object.hasOwn(R2, "settlementRunSequence")) {
        R2.settlementRunSequence = 0;
      }
      if (!Object.hasOwn(R2, "settlementEncounterId")) {
        R2.settlementEncounterId = 0;
      }
    }
    for (const U of raw.units || []) {
      for (const KEY2 of LEGACY_UNIT_DEFAULT_KEYS) {
        if (!Object.hasOwn(U, KEY2)) {
          U[KEY2] = UNIT_SNAPSHOT_SHAPE[KEY2];
        }
      }
      if (!Object.hasOwn(U, "faction")) {
        U.faction = legacyUnitFaction(U);
      }
      const ACTION = U.ability?.action;
      if (ACTION && hasUnitCapability(U.species, "repeatedStrike")) {
        if (!Object.hasOwn(ACTION, "peanutStrikeCount")) {
          ACTION.peanutStrikeCount = 2;
        }
        if (!Object.hasOwn(ACTION, "peanutAttackMultiplier")) {
          ACTION.peanutAttackMultiplier = 0.5;
        }
        if (!Object.hasOwn(ACTION, "peanutSpreadRadians")) {
          ACTION.peanutSpreadRadians = Math.PI / 12;
        }
      }
      if (ACTION && hasUnitCapability(U.species, "guard")) {
        if (!Object.hasOwn(ACTION, "walnutEmpowered")) {
          ACTION.walnutEmpowered = false;
        }
        if (!Object.hasOwn(ACTION, "walnutGuardUsed")) {
          ACTION.walnutGuardUsed = false;
        }
      }
    }
    for (const P of raw.projectiles || []) {
      if (!Object.hasOwn(P, "attackMultiplier")) {
        P.attackMultiplier = abilityProfile(P.species).skillMultiplier;
      }
      if (!Object.hasOwn(P, "shotIndex")) {
        P.shotIndex = 0;
      }
      if (!Object.hasOwn(P, "ownerId")) {
        P.ownerId = raw.units.find((u) => u.id === P.owner)?.ownerId || "";
      }
      if (!Object.hasOwn(P, "faction")) {
        P.faction = P.ownerId === "boss" || P.owner >= CONFIG.boss.summonIdBase ? FACTION_CONFIG.ENEMY : FACTION_CONFIG.PLAYER;
      }
    }
    raw.projectileSerial = Math.max(
      Number.isSafeInteger(raw.projectileSerial) ? raw.projectileSerial : 0,
      ...(raw.projectiles || []).map((p) => Number.isSafeInteger(p?.id) ? p.id : 0)
    );
    raw.raidSummonSerial = Number.isSafeInteger(raw.raidSummonSerial) ? raw.raidSummonSerial : Math.max(
      0,
      ...(raw.units || []).map(
        (u) => Number.isSafeInteger(u?.id) && u.id >= CONFIG.raid.ids.summonBase ? u.id - CONFIG.raid.ids.summonBase + 1 : 0
      )
    );
    if (raw.farmBossEvent.phase !== "idle" && raw.farmBossEvent.encounterId === 0) {
      const ENCOUNTER_ID = raw.nextBossEncounterId++;
      raw.farmBossEvent.encounterId = ENCOUNTER_ID;
      raw.farmBossEvent.rewardStatus = raw.farmBossEvent.outcome === "victory" ? "missed" : raw.farmBossEvent.outcome === "defeat" ? "none" : "unresolved";
      raw.farmBossEvent.rewardChance = 0;
      raw.farmBossEvent.rewardRoll = 0;
      raw.farmBossEvent.rewardUnitId = 0;
      if (raw.farmBossEvent.outcome === "victory") {
        raw.bossRewardReceipts.push({
          encounterId: ENCOUNTER_ID,
          source: "farm",
          species: 3,
          tier: 1,
          x: raw.boss.x,
          y: raw.boss.y,
          chance: 0,
          roll: 0,
          status: "missed",
          unitId: 0
        });
      }
    }
    for (const R2 of raw.raidRosters || []) {
      if (!Object.hasOwn(R2, "lastDeploySequence")) {
        R2.lastDeploySequence = Array.isArray(R2.troops) ? R2.troops.filter((t) => t?.deployed).length : 0;
      }
    }
    if (!HAS_REWARD_WATERMARKS) {
      for (const SOURCE of ["farm", "raid"]) {
        raw.bossRewardWatermarks[SOURCE] = Math.max(
          0,
          ...raw.bossRewardReceipts.filter((reward) => reward?.source === SOURCE && Number.isSafeInteger(reward.encounterId)).map((reward) => reward.encounterId)
        );
      }
    }
    raw.bossSummonSerial = Number.isSafeInteger(raw.bossSummonSerial) ? raw.bossSummonSerial : Math.max(
      0,
      ...(raw.units || []).map(
        (u) => Number.isSafeInteger(u?.id) && u.id >= CONFIG.boss.summonIdBase ? u.id - CONFIG.boss.summonIdBase : 0
      )
    );
    if (raw.scene === "raid" && !raw.boss.active && Number.isFinite(raw.boss.clock)) {
      const ENDED = raw.notices.findLast((e) => e.kind === "victory" || e.kind === "defeat");
      if (ENDED && !Object.hasOwn(ENDED, "bossPatternElapsed")) {
        ENDED.bossPatternElapsed = raw.boss.clock;
      }
    }
    normalizeBossPatternSnapshot(raw.boss, BASE.boss.patternRuntime, raw.bossSummonSerial);
    raw.nextRaidRunSequence = Math.max(raw.nextRaidRunSequence || 0, raw.bossRewardWatermarks.raid || 0);
    raw.raidSettlementWatermark = Math.max(raw.raidSettlementWatermark || 0, raw.bossRewardWatermarks.raid || 0);
    for (const U of raw.units) {
      if (!Number.isFinite(U.cooldownDuration) || U.cooldownDuration < (Number.isFinite(U.cooldown) ? U.cooldown : 0)) {
        U.cooldownDuration = Math.max(0, Number.isFinite(U.cooldown) ? U.cooldown : 0);
      }
      if (!Object.hasOwn(U, "growthElapsed")) {
        const PROGRESS = Number.isFinite(U.growth) ? Math.max(0, Math.min(CONFIG.farm.breeding.matureMeals, U.growth)) : 0;
        U.growthElapsed = U.growthDuration * PROGRESS / CONFIG.farm.breeding.matureMeals;
      }
      if (U.hp <= 0) {
        if (RESET_LEGACY_CORPSE_TIMERS || !Number.isFinite(U.down) || U.down <= 0) {
          U.down = CONFIG.unit.corpseRecoverySeconds;
        } else {
          U.down = Math.min(CONFIG.unit.corpseRecoverySeconds, U.down);
        }
      } else {
        U.down = 0;
      }
    }
    if (migrateLegacyRaid && raw.scene === "raid") {
      raw.scene = "farm";
      raw.running = false;
      raw.encounter = {
        outcome: "idle",
        elapsed: 0
      };
      raw.raidExpectedPlayers = ["solo"];
      raw.raidRosters = [];
      raw.raidDeploymentStarted = false;
      raw.projectiles = [];
      raw.boss = structuredClone(BASE.boss);
      for (const U of raw.units) {
        U.x = U.home?.x ?? U.x;
        U.y = U.home?.y ?? U.y;
        Object.assign(U, {
          z: 0,
          vx: 0,
          vy: 0,
          vz: 0,
          stun: 0,
          down: 0,
          hp: resolveUnitStats(U).maxHp,
          dropLanded: true
        });
        U.ability = {
          phase: "idle",
          elapsed: 0,
          action: null
        };
      }
    }
    return raw;
  }
  function normalizeBossPatternSnapshot(boss, baseRuntime, bossSummonSerial) {
    if (Object.hasOwn(boss, "phase")) {
      assertSnapshot(
        [
          "chase",
          "windup",
          "active",
          "recover",
          "resting",
          "strike-windup",
          "strike",
          "sweep-windup",
          "sweep"
        ].includes(boss.phase)
      );
    }
    if (Object.hasOwn(boss, "clock")) {
      assertSnapshot(Number.isFinite(boss.clock));
    }
    if (Object.hasOwn(boss, "targetId")) {
      assertSnapshot(Number.isFinite(boss.targetId));
    }
    if (Object.hasOwn(boss, "attackKind")) {
      assertSnapshot(["basic", "sweep", ...BOSS_PATTERN_IDS].includes(boss.attackKind));
    }
    if (Object.hasOwn(boss, "hit")) {
      assertSnapshot(
        Array.isArray(boss.hit) && boss.hit.length <= CONFIG.raid.capacity.battleUnits && boss.hit.every((id) => VALID_BATTLE_UNIT_ID(id, bossSummonSerial)) && new Set(boss.hit).size === boss.hit.length
      );
    }
    if (!boss.patternRuntime || boss.patternRuntime.active === void 0) {
      boss.patternRuntime = structuredClone(baseRuntime);
    }
    if (["strike-windup", "strike", "sweep-windup", "sweep"].includes(boss.phase)) {
      boss.patternRuntime.active = null;
    }
    const ACTION = boss.patternRuntime.active;
    if (ACTION) {
      if (Object.hasOwn(boss, "hit")) {
        assertSnapshot(
          Array.isArray(ACTION.hitIds) && boss.hit.length === ACTION.hitIds.length && ACTION.hitIds.every((id) => boss.hit.includes(id))
        );
      }
    }
    for (const KEY2 of ["phase", "clock", "hit", "targetId", "attackKind"]) {
      delete boss[KEY2];
    }
  }
  var init_farm_snapshot_migrations = __esm({
    "src/farm-snapshot-migrations.js"() {
      init_farm_model();
      init_unit_stats();
      init_player_progression();
      init_ability_state();
      init_unit_abilities();
      init_farm_boss_stages();
      init_boss_patterns();
      init_factions();
      init_farm_snapshot();
      init_farm_snapshot_validation();
    }
  });

  // src/farm-state.js
  function restore(raw, { migrateLegacyRaid = false } = {}) {
    raw = normalizeSnapshot(raw, {
      migrateLegacyRaid
    });
    validateSnapshot(raw);
    const G = new GARDEN();
    Object.assign(G, structuredClone(raw));
    G.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(raw.rng.state);
    if (G.boss.patternRuntime.active) {
      G.boss.patternRuntime.active.hitIds = new Set(raw.boss.patternRuntime.active.hitIds);
    }
    G.units = raw.units.map((data) => {
      const U = Object.assign(new UNIT(data.id, data.species, data.tier, data.x, data.y), structuredClone(data));
      U.ability = Object.assign(CREATE_UNIT_ATTACK_CYCLE(U), structuredClone(data.ability));
      return U;
    });
    G.reconcileMateReservations();
    return G;
  }
  var init_farm_state = __esm({
    "src/farm-state.js"() {
      init_farm_model();
      init_farm_snapshot_migrations();
      init_farm_snapshot_validation();
      init_farm_snapshot();
    }
  });

  // src/farm-save-codec.js
  function readFarmSave(text) {
    if (typeof text !== "string" || text.length > MAX_BYTES) {
      throw Error("저장 파일이 너무 큽니다.");
    }
    const PARSED = JSON.parse(text), VERSION = COMPATIBILITY_LOCAL(PARSED?.productVersion), FIELD = VERSION === COMPATIBILITY ? "progress" : "world";
    if (PARSED?.schema !== "budmori-farm" || !IS_READABLE_COMPATIBILITY(PARSED.productVersion) || !PARSED[FIELD] || typeof PARSED[FIELD] !== "object" || Array.isArray(PARSED[FIELD]) || Object.keys(PARSED).some((key) => !["schema", "productVersion", FIELD].includes(key))) {
      throw Error(
        "이 저장은 현재 " + COMPATIBILITY + " 버전과 호환되지 않습니다. 원본을 내보내 보관한 뒤 새 정원을 시작해 주세요."
      );
    }
    return PARSED;
  }
  function decodeFarmSave(text) {
    const PARSED = readFarmSave(text);
    let progress = PARSED.progress;
    if (!progress) {
      if (!["seed", "rng", "units", "food", "time", "nextId", "mode", "scene", "metrics"].every(
        (key) => Object.hasOwn(PARSED.world, key)
      )) {
        throw Error("이전 저장의 필수 진행 데이터가 누락됐어요. 원본은 그대로 보존합니다.");
      }
      const WORLD = normalizeSnapshot(PARSED.world, {
        migrateLegacyRaid: true
      });
      validateSnapshot(WORLD);
      progress = captureFarmProgress(WORLD);
    }
    validateFarmProgress(progress);
    return progress;
  }
  function saveNeedsMigration(text) {
    try {
      return !!readFarmSave(text).world;
    } catch {
      return false;
    }
  }
  function saveHasLegacyFarmProgress(text) {
    try {
      const { world: WORLD } = readFarmSave(text);
      return !!WORLD && Object.hasOwn(WORLD, "progress");
    } catch {
      return false;
    }
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
      throw Error("저장 파일이 너무 큽니다.");
    }
    return {
      data,
      text: TEXT
    };
  }
  var MAX_BYTES, LEGACY_COMPATIBILITIES, COMPATIBILITY_LOCAL, IS_READABLE_COMPATIBILITY;
  var init_farm_save_codec = __esm({
    "src/farm-save-codec.js"() {
      init_version();
      init_farm_state();
      init_farm_progress();
      MAX_BYTES = 2 * 1024 * 1024;
      LEGACY_COMPATIBILITIES = /* @__PURE__ */ new Set(["0.7", "0.6", "0.5", "0.4"]);
      COMPATIBILITY_LOCAL = (version) => typeof version === "string" ? version.split(".").slice(0, 2).join(".") : "";
      IS_READABLE_COMPATIBILITY = (version) => COMPATIBILITY_LOCAL(version) === COMPATIBILITY || LEGACY_COMPATIBILITIES.has(COMPATIBILITY_LOCAL(version));
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
  function migrationNotice(text) {
    return saveHasLegacyFarmProgress(text) ? "이전 무료 강화가 종료됐어요. 경험치·유닛 진행은 이어지고 원본은 별도 백업했어요." : "진행도 중심 저장으로 바꿨어요. 경험치·유닛 수·성장·휴식은 이어지고, 위치와 전투 장면은 새로 만들어요. 이전 원본은 별도 백업했어요.";
  }
  function readLegacyBackup() {
    try {
      const PREFERRED = localStorage.getItem(BACKUP_LATEST);
      if (PREFERRED?.startsWith(BACKUP_PREFIX)) {
        const RAW = localStorage.getItem(PREFERRED);
        if (RAW) {
          return {
            key: PREFERRED,
            raw: RAW
          };
        }
      }
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const KEY_LOCAL = localStorage.key(i);
        if (KEY_LOCAL?.startsWith(BACKUP_PREFIX)) {
          const RAW = localStorage.getItem(KEY_LOCAL);
          if (RAW) {
            return {
              key: KEY_LOCAL,
              raw: RAW
            };
          }
        }
      }
    } catch {
    }
    return null;
  }
  function preserveLegacySave(text) {
    if (!saveNeedsMigration(text)) {
      return null;
    }
    const DIGEST = Array.from(text).reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
    let key = BACKUP_PREFIX + DIGEST.toString(16).padStart(8, "0");
    let suffix = 0;
    while (localStorage.getItem(key) !== null && localStorage.getItem(key) !== text) {
      key = BACKUP_PREFIX + DIGEST.toString(16).padStart(8, "0") + "-" + ++suffix;
    }
    localStorage.setItem(key, text);
    try {
      localStorage.setItem(BACKUP_LATEST, key);
    } catch {
    }
    return {
      key,
      raw: text
    };
  }
  var KEY, LEGACY_KEY, BACKUP_PREFIX, BACKUP_LATEST, FarmStorage;
  var init_farm_storage = __esm({
    "src/farm-storage.js"() {
      init_farm_progress();
      init_farm_save_codec();
      KEY = "bloom-weapon-cards-v4";
      LEGACY_KEY = "bloom-weapon-cards-v3";
      BACKUP_PREFIX = "bloom-weapon-cards-legacy-backup-";
      BACKUP_LATEST = "bloom-weapon-cards-legacy-backup-latest";
      FarmStorage = class {
        constructor() {
          this.raw = null;
          this._world = null;
          this.savedProgress = null;
          this.error = "";
          this.writable = false;
          this.legacyRaw = null;
          this.legacyCompatible = false;
          this.legacyBackupRequired = false;
          this.legacyBackup = readLegacyBackup();
          this.migrationNotice = "";
          this.migrationPending = false;
          try {
            this.raw = localStorage.getItem(KEY);
            this.legacyRaw = localStorage.getItem(LEGACY_KEY);
            if (this.raw) {
              if (!IS_READABLE_COMPATIBILITY(readFarmSave(this.raw).productVersion)) {
                throw Error("현재 저장은 호환되지 않는 버전입니다. 원본 키는 그대로 보존했어요.");
              }
              const DATA = decodeFarmSave(this.raw);
              this.migrationPending = saveNeedsMigration(this.raw);
              if (this.migrationPending) {
                this.legacyBackupRequired = true;
                try {
                  this.legacyBackup = preserveLegacySave(this.raw);
                  this.legacyBackupRequired = false;
                  this.migrationNotice = migrationNotice(this.raw);
                } catch {
                  throw Error(
                    "이전 저장 원본을 백업하지 못해 덮어쓰지 않았어요. 저장 공간을 비우거나 저장 파일을 내보낸 뒤 다시 시도해 주세요."
                  );
                }
              }
              this.savedProgress = DATA;
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
          if (!this._world && this.savedProgress) {
            this._world = restoreFarmProgress(this.savedProgress);
          }
          return this._world;
        }
        get hasWorld() {
          return !!(this._world || this.savedProgress);
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
          return encodeFarmSave(world, data);
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
              throw Error("농장 저장을 찾지 못했어요. 다른 탭에서 새 정원을 시작했을 수 있어요.");
            }
            const DATA = decodeFarmSave(TEXT), MIGRATION_PENDING = saveNeedsMigration(TEXT);
            if (MIGRATION_PENDING) {
              this.legacyBackupRequired = true;
              this.legacyBackup = preserveLegacySave(TEXT);
              this.legacyBackupRequired = false;
              this.migrationNotice = migrationNotice(TEXT);
            }
            this.raw = TEXT;
            this.savedProgress = DATA;
            this.migrationPending = MIGRATION_PENDING;
            this._world = null;
            this.error = "";
            return true;
          } catch (e) {
            this.error = this.legacyBackupRequired ? "이전 저장 원본을 백업하지 못해 덮어쓰지 않았어요. 저장 공간을 비우거나 저장 파일을 내보낸 뒤 다시 시도해 주세요." : e.message || "저장을 다시 읽지 못했어요.";
            return false;
          }
        }
        save(world) {
          if (!this.writable || this.legacyBackupRequired) {
            return false;
          }
          try {
            if (localStorage.getItem(KEY) !== this.raw) {
              this.error = "저장 내용이 다른 탭에서 바뀌었어요. 이 탭을 새로고침해 이어가 주세요.";
              return false;
            }
            const DATA = captureFarmProgress(world);
            if (!this.migrationPending && sameFarmProgress(DATA, this.savedProgress)) {
              this._world = world;
              this.error = "";
              return true;
            }
            const { text: TEXT } = this.serializeCheckpoint(world, DATA);
            localStorage.setItem(KEY, TEXT);
            this.raw = TEXT;
            this.savedProgress = DATA;
            this.migrationPending = false;
            this._world = world;
            this.error = "";
            return true;
          } catch {
            this.error = "저장 공간을 사용할 수 없어요. 기존 저장은 보존했어요. 저장 내보내기로 보관해 주세요.";
            return false;
          }
        }
        replace(world) {
          if (this.legacyBackupRequired) {
            return false;
          }
          const WRITABLE = this.writable;
          this.writable = true;
          const SAVED = this.save(world);
          if (!SAVED) {
            this.writable = WRITABLE;
          }
          return SAVED;
        }
        import(text) {
          if (this.legacyBackupRequired) {
            throw Error("이전 저장 원본을 백업하지 못해 불러오기를 취소했어요. 기존 저장은 그대로입니다.");
          }
          if (localStorage.getItem(KEY) !== this.raw) {
            throw Error("저장 내용이 다른 탭에서 바뀌었어요. 새로고침한 뒤 다시 불러와 주세요.");
          }
          validateSave(text);
          if (saveNeedsMigration(text)) {
            this.legacyBackupRequired = true;
            try {
              this.legacyBackup = preserveLegacySave(text);
              this.legacyBackupRequired = false;
            } catch {
              throw Error("이전 저장 원본을 백업하지 못해 불러오기를 취소했어요. 기존 저장은 그대로입니다.");
            }
            this.migrationNotice = migrationNotice(text);
          }
          const WORLD = parseSave(text), { data: DATA, text: NORMALIZED } = this.serializeCheckpoint(WORLD);
          localStorage.setItem(KEY, NORMALIZED);
          this.raw = NORMALIZED;
          this.savedProgress = DATA;
          this.migrationPending = false;
          this._world = WORLD;
          this.writable = true;
          this.error = "";
          return WORLD;
        }
      };
    }
  });

  // src/farm-app.js
  init_farm_model();

  // src/features/scenes/farm/presentation.js
  init_definition();

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
      const T = CLAMP2(Q, 0, 1), X = E.x + (E.targetX - E.x) * T, Y = E.y + (E.targetY - E.y) * T, Z = (E.z || 0) + Math.sin(Math.PI * T) * 0.55;
      const START = renderer.project(E.x, E.y, E.z || 0), POINT2 = renderer.project(X, Y, Z);
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

  // src/features/projectiles/popcorn/presentation.js
  init_farm_model();
  init_definition5();
  var PopcornProjectilePresentation = class {
    constructor(flightPresentation2) {
      this.id = FEATURE5.id;
      this.flightPresentation = flightPresentation2;
    }
    draw(renderer, projectile, point2, tail) {
      if (!projectile.landed) {
        this.flightPresentation(projectile).draw(renderer, projectile, point2, tail);
        return;
      }
      const F = projectile;
      const FUSE = Math.max(0, Math.min(1, F.fuseRemaining || 0));
      renderer.groundEllipse(F.x, F.y, 0.16, 0.12, F.exploded ? "#d86c3b55" : "#c78a4366");
      if (!F.exploded && F.popcornConfig?.radius > 0) {
        renderer.ring(F.x, F.y, F.popcornConfig.radius, "rgba(190,111,52,.18)", 0.035);
      }
      if (F.exploded) {
        const PROGRESS = Math.max(0, Math.min(1, (F.explosionLife || 0) / 0.5));
        renderer.ring(
          F.x,
          F.y,
          (F.popcornConfig?.radius || 0.3) * (0.25 + 0.75 * PROGRESS),
          `rgba(224,111,54,${0.68 * (1 - PROGRESS)})`,
          0.12
        );
      } else {
        renderer.ring(F.x, F.y, 0.2 + 0.2 * (1 - FUSE), `rgba(238,181,83,${0.45 + 0.4 * (1 - FUSE)})`, 0.045);
      }
      const KERNEL = renderer.project(F.x, F.y, 0.12);
      renderer.ellipse(
        KERNEL.x,
        KERNEL.y,
        renderer.scale * 0.13,
        renderer.scale * 0.08,
        F.exploded ? "#e37f42" : "#d4a347",
        0.2
      );
      renderer.ellipse(
        KERNEL.x - renderer.scale * 0.035,
        KERNEL.y - renderer.scale * 0.02,
        renderer.scale * 0.045,
        renderer.scale * 0.03,
        "#ffe0a0"
      );
    }
  };
  var PopcornExplosionEffect = class {
    draw(renderer, effect, progress) {
      const E = effect, Q = progress;
      const PROGRESS = CLAMP2(Q / (E.duration || 0.5), 0, 1), RADIUS = Math.max(0.08, E.radius) * (0.18 + 0.82 * PROGRESS);
      renderer.groundEllipse(E.x, E.y, RADIUS, RADIUS, `rgba(235,143,63,${0.18 * (1 - PROGRESS)})`);
      renderer.ring(E.x, E.y, RADIUS, `rgba(233,115,49,${0.88 * (1 - PROGRESS)})`, 0.1 * (1 - PROGRESS) + 0.025);
      renderer.ring(E.x, E.y, Math.max(0.05, RADIUS * 0.72), `rgba(255,206,101,${0.7 * (1 - PROGRESS)})`, 0.055);
      for (let i = 0; i < 5; i++) {
        const A = i * Math.PI * 2 / 5 + PROGRESS * 0.8, D = RADIUS * (0.55 + 0.3 * PROGRESS), P = renderer.project(E.x + Math.cos(A) * D, E.y + Math.sin(A) * D, 0.08 * (1 - PROGRESS));
        renderer.ellipse(
          P.x,
          P.y,
          renderer.scale * 0.045 * (1 - PROGRESS),
          renderer.scale * 0.03 * (1 - PROGRESS),
          `rgba(255,216,119,${1 - PROGRESS})`,
          A
        );
      }
    }
  };
  var PopcornImpactEffect = class {
    draw(renderer, effect, progress) {
      const E = effect, Q = progress;
      const PROGRESS = CLAMP2(Q / (E.duration || 0.25), 0, 1);
      renderer.ring(
        E.x,
        E.y,
        0.08 + PROGRESS * (E.radius || 0.1) * 1.6,
        `rgba(225,150,72,${0.65 * (1 - PROGRESS)})`,
        0.045
      );
    }
  };

  // src/farm-render-effects.js
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
  var EFFECT_PRESENTATIONS = /* @__PURE__ */ new Map([
    ["feed", new FeedEffect()],
    ["food-land", new FoodLandingEffect()],
    ["land", IMPACT],
    ["impact", IMPACT],
    ["landing-shockwave", SHOCKWAVE],
    ["walnut-shockwave", SHOCKWAVE],
    ["popcorn-explosion", new PopcornExplosionEffect()],
    ["popcorn-kernel-impact", new PopcornImpactEffect()],
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

  // src/features/scenes/farm/presentation.js
  var FarmScenePresentation = class {
    constructor() {
      this.id = FEATURE.id;
      this.groundColor = "#d1d8b8";
      this.surfaceColor = "#d9dfc2";
      this.minimumUnitPixels = 11;
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
    hiddenUnitId(world) {
      return world.mode === "merge" && world.mergeTask?.phase === "animation" ? world.mergeTask.resultId : 0;
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
  init_definition2();
  init_farm_model();
  var RaidScenePresentation = class {
    constructor() {
      this.id = FEATURE2.id;
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
  init_definition3();
  var SeedProjectilePresentation = class {
    constructor() {
      this.id = FEATURE3.id;
    }
    draw(renderer, _projectile, point2, tail) {
      const P = point2, TAIL = tail;
      renderer.line(renderer.project(TAIL.x, TAIL.y, TAIL.z), P, 0.07, "#ba964a80");
      renderer.ellipse(P.x, P.y, renderer.scale * 0.14, renderer.scale * 0.2, "#cfa957", 0.3);
      renderer.ellipse(
        P.x - renderer.scale * 0.03,
        P.y - renderer.scale * 0.05,
        renderer.scale * 0.05,
        renderer.scale * 0.08,
        "#fff0ae"
      );
    }
  };

  // src/features/projectiles/spike/presentation.js
  init_definition4();
  var SpikeProjectilePresentation = class {
    constructor() {
      this.id = FEATURE4.id;
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
  init_definition6();
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
  var SEED_PRESENTATION = new SeedProjectilePresentation();
  var SPIKE_PRESENTATION = new SpikeProjectilePresentation();
  function flightPresentation(projectile) {
    return PROJECTILE_PRESENTATIONS.get(projectileFlightFeature(projectile).id);
  }
  var PROJECTILE_PRESENTATIONS = new Map(
    [SEED_PRESENTATION, SPIKE_PRESENTATION, new PopcornProjectilePresentation(flightPresentation)].map(
      (presentation) => [presentation.id, presentation]
    )
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
      RENDERER2.groundEllipse(projectile.x, projectile.y, 0.14, 0.1, "#55452433");
      const PRESENTATION = PROJECTILE_PRESENTATIONS.get(projectileFeature(projectile).id);
      PRESENTATION.draw(RENDERER2, projectile, P, TAIL);
    }
  };

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
  init_definition15();
  var LobPresentation = class extends UnitAttackPresentation {
    constructor() {
      super();
      this.id = FEATURE14.id;
    }
    recoverMotion(unit) {
      return unit.ability?.action?.path && unit.ability.elapsed < 0.12 ? "fire" : "recover";
    }
  };

  // src/features/unit-attacks/dual-strike/presentation.js
  init_definition16();
  var DualStrikePresentation = class extends UnitAttackPresentation {
    constructor() {
      super();
      this.id = FEATURE15.id;
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
    const DURATION = unit.cooldownDuration || world.breedCooldownDuration?.() || defaultDuration;
    const REMAINING = Math.max(0, unit.cooldown);
    result.remaining = REMAINING;
    result.duration = DURATION;
    result.progress = Math.max(0, Math.min(1, 1 - REMAINING / DURATION));
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
      const EXPRESSION = unitExpression(u, sim, this.renderer.joyEffects, rest);
      if (EXPRESSION !== player.currentExpression) {
        player.setExpression(EXPRESSION);
      }
      player.seek(rest ? rest.elapsed * 1e3 : this.renderer.displayTimeMs);
      const [, , WIDTH, HEIGHT] = RECORD.compiled.viewBox, SCALE = 2 * r / Math.max(WIDTH, HEIGHT), CENTER_Y = p.y - r * 0.79;
      const MATRIX = [SCALE, 0, 0, SCALE, p.x - WIDTH * SCALE * 0.5, CENTER_Y - HEIGHT * SCALE * 0.5];
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
        for (const PART of RECORD.faceParts) {
          player.setPartVisible(PART, false);
        }
        player.draw({
          projection: this.renderer.ctx.vector.projection,
          matrix: OUTLINE_MATRIX,
          color: OUTLINE,
          forceColor: true
        });
        player.setExpression(EXPRESSION);
      }
      player.draw({
        projection: this.renderer.ctx.vector.projection,
        matrix: MATRIX
      });
      return true;
    }
    drawUnit(u, sim, rest) {
      const DEAD = u.hp <= 0, WALK = DEAD ? 0 : Math.min(1, Math.hypot(u.vx, u.vy)), BOB = u.z === 0 ? Math.abs(Math.sin(sim.time * 9 + u.seed)) * 0.1 * WALK : 0, P = this.renderer.project(u.x, u.y, u.z + BOB);
      const R2 = Math.max(
        u.size * this.renderer.scale * 0.78,
        this.renderer.scenePresentation.minimumUnitPixels * this.renderer.pixelRatio
      );
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
    }
  };

  // src/farm-renderer.js
  var import_vector_sockets3 = __toESM(require_vector_sockets(), 1);
  init_boss_vector_sockets();

  // src/farm-render-boss.js
  var import_vector_sockets2 = __toESM(require_vector_sockets(), 1);
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
    drawTelegraph(renderer, area) {
      renderer.drawBossDanger(area);
    }
  };

  // src/features/boss-patterns/front-slam/presentation.js
  init_definition10();
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
  init_definition9();
  init_farm_model();
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
      const Q = pose.recoverImpact ? 1 : CLAMP2(pose.elapsed / Math.max(this.config.active, 1e-3), 0, 1), SWEEP = 2 * Math.PI * Q;
      pose.body.rotation = 0.12 * Math.sin(SWEEP);
      pose.body.scaleX = 1.055;
      pose.body.scaleY = 0.94;
      pose.arm("arm-left", -0.78 - 0.55 * Math.sin(SWEEP));
      pose.arm("arm-right", 0.78 + 0.55 * Math.sin(SWEEP));
    }
    recover(boss, pose) {
      if (pose.recoverImpact) {
        this.active(boss, pose);
        return;
      }
      super.recover(boss, pose);
    }
  };

  // src/features/boss-patterns/charge/presentation.js
  init_definition11();
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
  init_definition12();
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
  init_definition13();
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
  init_definition14();
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
  var IDLE_PRESENTATION = new BossAttackPresentation();
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
      const S_LOCAL = this.renderer.scale * (0, import_vector_sockets2.bossVectorScale)(B.radius), GROUND = RECORD.anchors.ground, MATRIX = [S_LOCAL, 0, 0, S_LOCAL, P.x - GROUND.x * S_LOCAL, P.y - GROUND.y * S_LOCAL];
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
    }
  };

  // src/farm-renderer.js
  init_farm_model();

  // src/attack-telegraph.js
  var TAU = Math.PI * 2;
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
      return arc(out, 0, endX, endY, R2, 0, TAU);
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
      n = arc(out, n, x, y, r, ANGLE - SMALL, ANGLE + SMALL - TAU);
      n = arc(out, n, endX, endY, R2, ANGLE + LARGE, ANGLE - LARGE);
    }
    return n;
  }
  function bossDangerContour(area, out) {
    let n = 0;
    if (area.kind === "sweep") {
      return arc(out, 0, area.x, area.y, area.reach, 0, TAU);
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
        START + TAU
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
          anchors: (0, import_vector_sockets3.readVectorSockets)(COMPILED, `species ${SPECIES}, ${COMPILED.sourcePath}`),
          parts: new Set(COMPILED.metadata.parts.map((part) => part.id)),
          faceParts: COMPILED.metadata.parts.filter((part) => part.id.startsWith("face-")).map((part) => part.id)
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
        y: (this.view[1] - (import_vector_sockets3.WORLD_DEPTH_PROJECTION * y + import_vector_sockets3.WORLD_HEIGHT_PROJECTION * z + this.offset[1])) * this.scale
      };
    }
    screenToWorld(clientX, clientY) {
      const R2 = this.canvas.getBoundingClientRect(), PX = (clientX - R2.left) * this.pixelRatio, PY = (clientY - R2.top) * this.pixelRatio;
      return {
        x: PX / this.scale - this.offset[0] - this.view[0],
        y: (this.view[1] - PY / this.scale - this.offset[1]) / import_vector_sockets3.WORLD_DEPTH_PROJECTION
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
        bottom: -(RY + 1.3) * import_vector_sockets3.WORLD_DEPTH_PROJECTION,
        top: (RY + 1.3) * import_vector_sockets3.WORLD_DEPTH_PROJECTION
      };
      const BOSS_SCALE = (0, import_vector_sockets3.bossVectorScale)(CONFIG.boss.radius), BOSS_X = RX - CONFIG.boss.radius, BOSS_Y = (RY - CONFIG.boss.radius) * import_vector_sockets3.WORLD_DEPTH_PROJECTION;
      const INCLUDE_BOSS = (record) => {
        const [X, Y, W, H] = record.compiled.viewBox, G = record.anchors.ground;
        BOUNDS.left = Math.min(BOUNDS.left, -BOSS_X - (G.x - X) * BOSS_SCALE);
        BOUNDS.right = Math.max(BOUNDS.right, BOSS_X + (X + W - G.x) * BOSS_SCALE);
        BOUNDS.bottom = Math.min(BOUNDS.bottom, -BOSS_Y - (Y + H - G.y) * BOSS_SCALE);
        BOUNDS.top = Math.max(
          BOUNDS.top,
          BOSS_Y + (G.y - Y) * BOSS_SCALE + CONFIG.raid.dropHeight * import_vector_sockets3.WORLD_HEIGHT_PROJECTION
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
        const X = (POINTS[i * 2] + OX) * S, Y = (OY - import_vector_sockets3.WORLD_DEPTH_PROJECTION * POINTS[i * 2 + 1]) * S;
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
    drawLocalScatter(scatter) {
      if (!scatter?.active || !Number.isFinite(scatter.x) || !Number.isFinite(scatter.y) || !(scatter.radius > 0)) {
        return;
      }
      const C = this.ctx, S = this.scale, R2 = scatter.radius, P = this.project(scatter.x, scatter.y), RY = R2 * S * import_vector_sockets3.WORLD_DEPTH_PROJECTION;
      const SEGMENTS = Math.max(8, Math.min(24, Math.round(Math.PI * 2 * R2 * S / (10 * this.pixelRatio)))), STEP = Math.PI * 2 / SEGMENTS;
      C.beginPath();
      for (let i = 0; i < SEGMENTS; i++) {
        for (let j = 0; j <= 4; j++) {
          const A = i * STEP + j / 4 * STEP * 0.58, X = P.x + Math.cos(A) * R2 * S, Y = P.y - Math.sin(A) * RY;
          if (j === 0) {
            C.moveTo(X, Y);
          } else {
            C.lineTo(X, Y);
          }
        }
      }
      C.strokeStyle = "#145967";
      C.lineWidth = 3.4 * this.pixelRatio;
      C.lineCap = "round";
      C.stroke();
      C.strokeStyle = "#50e3ed";
      C.lineWidth = 1.7 * this.pixelRatio;
      C.stroke();
      C.beginPath();
      const ARROW = Math.max(0.25, 3.5 * this.pixelRatio / S), TIP = R2 + ARROW * 0.9;
      for (let i = 0; i < 4; i++) {
        const A = Math.PI / 4 + i * Math.PI / 2, DX = Math.cos(A), DY = Math.sin(A), TX = P.x + DX * TIP * S, TY = P.y - DY * TIP * S * import_vector_sockets3.WORLD_DEPTH_PROJECTION;
        C.moveTo(P.x + DX * (R2 - ARROW * 0.55) * S, P.y - DY * (R2 - ARROW * 0.55) * S * import_vector_sockets3.WORLD_DEPTH_PROJECTION);
        C.lineTo(TX, TY);
        C.moveTo(
          P.x + (DX * (TIP - ARROW) - DY * ARROW * 0.55) * S,
          P.y - (DY * (TIP - ARROW) + DX * ARROW * 0.55) * S * import_vector_sockets3.WORLD_DEPTH_PROJECTION
        );
        C.lineTo(TX, TY);
        C.lineTo(
          P.x + (DX * (TIP - ARROW) + DY * ARROW * 0.55) * S,
          P.y - (DY * (TIP - ARROW) - DX * ARROW * 0.55) * S * import_vector_sockets3.WORLD_DEPTH_PROJECTION
        );
      }
      const CENTER = 2.8 * this.pixelRatio;
      C.moveTo(P.x - CENTER, P.y);
      C.lineTo(P.x + CENTER, P.y);
      C.moveTo(P.x, P.y - CENTER);
      C.lineTo(P.x, P.y + CENTER);
      const HANDLE = this.project(
        Number.isFinite(scatter.handleX) ? scatter.handleX : scatter.x,
        Number.isFinite(scatter.handleY) ? scatter.handleY : scatter.y
      ), HR = 3.5 * this.pixelRatio;
      C.moveTo(HANDLE.x + HR, HANDLE.y);
      C.ellipse(HANDLE.x, HANDLE.y, HR, HR, 0, 0, Math.PI * 2);
      C.strokeStyle = "#145967";
      C.lineWidth = 3.5 * this.pixelRatio;
      C.stroke();
      C.strokeStyle = "#7df5fb";
      C.lineWidth = 1.7 * this.pixelRatio;
      C.stroke();
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
      const HIDDEN_MERGE_RESULT_ID = PRESENTATION.hiddenUnitId(sim2);
      const ACTORS = this.actors;
      ACTORS.length = 0;
      for (const U of sim2.units) {
        if (U.id !== HIDDEN_MERGE_RESULT_ID) {
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
      for (const E of sim2.effects) {
        drawEffect(this, E);
      }
      this.drawLocalScatter(sim2.localScatter);
      this.stats = C.endFrame();
    }
    dispose() {
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
      this.walnutGuarding = !!u.ability.guardConfig?.(world);
      this.cooldown = u.cooldown;
      this.cooldownDuration = u.cooldownDuration;
      this.meals = u.meals;
      this.species = u.species;
      this.tier = u.tier;
      this.seed = u.seed;
      this.size = u.size;
      this.radius = u.radius;
      this.maxHp = baseUnitStatsFor(u.tier, u.species).maxHp;
      this.fed = u.fed;
      this.ownerId = u.ownerId;
      this.faction = u.faction;
      this.farmId = u.farmId;
      this.dropLanded = u.dropLanded;
      this.buffed = world.time < (world.raidRoster(u.ownerId)?.buffUntil || 0);
      this.isBattleOnlySummon = u.isBattleOnlySummon;
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
      summonMouthZ: R.STEP
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
    constructor() {
      super();
      this.popcornConfig = {};
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
      this.isPopcorn = !!p.isPopcorn;
      this.landed = !!p.landed;
      this.exploded = !!p.exploded;
      this.fuseRemaining = p.fuseRemaining || 0;
      this.explosionLife = p.explosionLife || 0;
      this.shotIndex = p.shotIndex || 0;
      this.fanIndex = p.fanIndex || 0;
      this.popcornConfig.radius = p.popcornConfig?.radius || 0;
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
      sequenceIndex: R.STEP,
      sequenceCount: R.STEP
    });
    update(e) {
      super.update(e);
      this.targetX = e.targetX;
      this.targetY = e.targetY;
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
      this.localPlayerId = "solo";
      this.localDeploySequence = world.raidRoster(this.localPlayerId)?.lastDeploySequence || 0;
      this.presentationRevision = 0;
      this.presentationSequence = 0;
      this.pendingPresentationMode = null;
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
      this.loop = globalThis.BloomGamekitSimloop.createLoop({
        session: this,
        getInput: () => LOCAL_INPUT,
        onError,
        onBacklogDrop: () => {
          this.pendingPresentationMode = "reset";
        },
        onAdvance: (result) => {
          if (this.pendingPresentationMode) {
            this.capturePresentation(this.pendingPresentationMode);
          } else if (result.status === "advanced" && !this.paused) {
            this.capturePresentation("continuous");
          }
        }
      });
      this.capturePresentation("reset");
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
    deployNext() {
      const W = this.world, ROSTER2 = W.scene === "raid" && W.raidRoster(this.localPlayerId);
      if (!ROSTER2 || this.closed || this.paused || ["victory", "defeat"].includes(W.encounter.outcome)) {
        return false;
      }
      this.localDeploySequence = Math.max(this.localDeploySequence, ROSTER2.lastDeploySequence);
      if (this.localDeploySequence - ROSTER2.lastDeploySequence >= W.raidRemaining(this.localPlayerId)) {
        return false;
      }
      const SEQUENCE = this.localDeploySequence + 1;
      if (!this.queue("deploy", {
        sequence: SEQUENCE
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
      const COMMAND_CHANGED_WORLD = this.applyPendingCommands(32);
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
        W.advanceAutoTaps(0.05);
      }
      for (let i = 0; i < 6; i++) {
        W.step(CONFIG.physics.fixedStep);
      }
      this.tick++;
      this.presentationTick++;
      this.onWorldStep(W);
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
          return W.scene === "farm" && W.tapFood("manual");
        case "mode":
          return W.setFarmMode(c.value);
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
        case "ability-reset":
          return W.scene === "farm" && W.resetAbilityTree().ok;
        case "register-roster":
          return Array.isArray(c.entries) && W.registerRaidRoster(ownerId, c.entries, c.abilitySnapshot, c.settlement || null);
        case "deploy":
          return Number.isSafeInteger(c.sequence) && W.deployNextRaidUnit(ownerId, c.sequence);
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
      if (value) {
        this.world.clearLocalScatter();
      }
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
      if (mode !== "continuous" && this.presentationSequence > 0) {
        this.presentationRevision++;
      }
      const WORLD = this.world, RECEIPT_NOW_MS = this.captureClock(), TIME_MS = this.presentationOriginWallMs === null ? 0 : Math.max(this.latestCaptureTimeMs, RECEIPT_NOW_MS - this.presentationOriginWallMs), ENTITIES = this.captureEntities;
      ENTITIES.length = 0;
      if (this.presentationOriginWallMs === null) {
        this.presentationOriginWallMs = RECEIPT_NOW_MS;
      }
      for (const U of WORLD.units) {
        ENTITIES.push(this.presentationEntity("unit:" + U.id, U, UnitRender));
      }
      ENTITIES.push(this.presentationEntity("boss", WORLD.boss, BossRender));
      for (const F of WORLD.food) {
        ENTITIES.push(this.presentationEntity(this.presentationIdentity("food", F), F, FoodRender));
      }
      for (const P of WORLD.projectiles) {
        ENTITIES.push(this.presentationEntity("projectile:" + P.id, P, ProjectileRender));
      }
      for (const E of WORLD.effects) {
        const TYPE = E.kind === "merge-material" ? MergeMaterialRender : Number.isFinite(E.delay) && Number.isFinite(E.span) ? DelayedEffectRender : EffectRender;
        ENTITIES.push(this.presentationEntity(this.presentationIdentity("effect", E), E, TYPE));
      }
      this.clockEntity.source.gameTimeMs = WORLD.time * 1e3;
      ENTITIES.push(this.clockEntity);
      const CAPTURE_MODE = mode === "continuous" ? "continuous" : mode === "load" ? "load" : mode === "rollback" ? "rollback" : "reset";
      if (CAPTURE_MODE === "continuous") {
        this.previousCaptureTimeMs = this.latestCaptureTimeMs;
      } else {
        this.previousCaptureTimeMs = null;
      }
      const ACCEPTED = this.presentationRuntime.capture(
        {
          revision: this.presentationRevision,
          sequence: ++this.presentationSequence,
          timeMs: TIME_MS,
          mode: CAPTURE_MODE,
          entities: ENTITIES
        },
        RECEIPT_NOW_MS
      );
      if (ACCEPTED) {
        this.latestCaptureTimeMs = TIME_MS;
        this.lastCaptureClockMs = RECEIPT_NOW_MS;
        this.pendingPresentationMode = null;
      }
      return ACCEPTED;
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
        const VIEW2 = this.presentationView = Object.assign(Object.create(WORLD), {
          units: [],
          food: [],
          projectiles: [],
          effects: [],
          presentationDiagnostics: {}
        });
        this.collectPresentationModel = (model, id) => {
          if (id.startsWith("unit:")) {
            VIEW2.units.push(model);
          } else if (id.startsWith("food:")) {
            VIEW2.food.push(model);
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
      VIEW.projectiles.length = 0;
      VIEW.effects.length = 0;
      FRAME.forEach(this.collectPresentationModel);
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
      this.loop.pulse(now, {
        render: false
      });
    }
    dispose() {
      this.world.clearLocalScatter();
      this.closed = true;
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

  // src/farm-app.js
  init_farm_state();
  init_version();

  // src/food-feel.js
  var DOLLAR = (id) => document.getElementById(id);
  var FoodFeel = class {
    constructor(requestFeed2) {
      this.button = DOLLAR("feed");
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
      const POINTERS = /* @__PURE__ */ new Set();
      this.button.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) {
          return;
        }
        e.preventDefault();
        this.unlock();
        POINTERS.add(e.pointerId);
        this.button.setPointerCapture(e.pointerId);
        this.animate(
          this.button,
          [
            {
              transform: "scale(1)"
            },
            {
              transform: this.reduced ? "scale(1)" : "scale(1.035,.94)"
            }
          ],
          75
        );
      });
      this.button.addEventListener("pointerup", (e) => {
        if (!POINTERS.delete(e.pointerId)) {
          return;
        }
        e.preventDefault();
        const R2 = this.button.getBoundingClientRect();
        if (e.clientX >= R2.left && e.clientX <= R2.right && e.clientY >= R2.top && e.clientY <= R2.bottom) {
          requestFeed2();
        }
        if (this.button.hasPointerCapture(e.pointerId)) {
          this.button.releasePointerCapture(e.pointerId);
        }
      });
      const CANCEL = (e) => POINTERS.delete(e.pointerId);
      this.button.addEventListener("pointercancel", CANCEL);
      this.button.addEventListener("lostpointercapture", CANCEL);
      window.addEventListener("blur", () => {
        POINTERS.clear();
        this.silence();
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          POINTERS.clear();
          this.silence();
        }
      });
      window.addEventListener("pagehide", () => {
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
      }, [HZ, END, DURATION, GAIN] = DEFS[kind];
      const O = this.audio.createOscillator(), G = this.audio.createGain(), V = {
        o: O,
        g: G
      };
      O.type = kind === "land" ? "sine" : "triangle";
      O.frequency.setValueAtTime(HZ, NOW);
      O.frequency.exponentialRampToValueAtTime(END, NOW + DURATION);
      G.gain.setValueAtTime(0, NOW);
      G.gain.linearRampToValueAtTime(GAIN, NOW + 4e-3);
      G.gain.exponentialRampToValueAtTime(1e-4, NOW + DURATION);
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
      O.stop(NOW + DURATION + 0.01);
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
      const NOW = performance.now(), MANUAL = source === "manual";
      if (complete) {
        this.counts.complete++;
        this.completeUntil = NOW + (MANUAL ? 190 : 100);
      }
      if (MANUAL || NOW > this.pulseUntil) {
        this.pulseUntil = NOW + (MANUAL ? 150 : 55);
        this.button.dataset.impact = complete && MANUAL ? "complete" : MANUAL ? "manual" : "auto";
        this.animate(
          this.button,
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
    event(kind) {
      if (kind === "food-land" || kind === "eat") {
        const KEY2 = kind === "eat" ? "eat" : "land";
        this.counts[KEY2]++;
        this.sound(KEY2);
      }
    }
    frame(now) {
      this.frameId++;
      if (now > this.pulseUntil && this.button.dataset.impact !== "") {
        this.button.dataset.impact = "";
      }
    }
  };

  // src/combat-feel.js
  init_farm_model();
  var { ObjectPool: OBJECT_POOL } = globalThis.BloomGamekitObjectPool;
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
      feel.poses.set(event.unit, { at, until: at + 180, strength: event.strength });
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
    observe(world, displayTimeMs, revision = 0) {
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
      for (const E of world.notices) {
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
        squash: K * 0.035
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
    ["already-invested", "이미 투자한 노드입니다."],
    ["root-required", "먼저 능력 루트를 해금하세요."],
    ["prerequisite-required", "이전 단계에 먼저 투자하세요."],
    ["insufficient-points", "공용 포인트가 필요합니다."],
    ["combat-lock", "전투 중에는 투자할 수 없습니다."],
    ["farm-only", "농장에서만 투자할 수 있습니다."],
    ["max-level", "최대 강화 단계입니다."],
    ["invalid-state", "성장 데이터가 유효하지 않습니다."]
  ]);
  var NODE_REASON_LABELS = new Map([
    ...Array.from(INVESTMENT_REASON_LABELS, ([reason, text]) => [reason, () => text]),
    ["requires-rare-tier", (definition) => `이 종의 Rare (T${definition.rootTier}) 이상 개체가 필요합니다.`]
  ]);
  var RESET_REASON_LABELS = /* @__PURE__ */ new Map([
    ["nothing-invested", "투자한 포인트가 없습니다."],
    ["combat-lock", "전투 중에는 초기화할 수 없습니다."],
    ["farm-only", "농장에서만 초기화할 수 있습니다."],
    ["invalid-state", INVESTMENT_REASON_LABELS.get("invalid-state")]
  ]);
  var FARM_UPGRADE_REASON_LABELS = new Map([
    ...["combat-lock", "farm-only", "max-level", "invalid-state"].map((reason) => [
      reason,
      INVESTMENT_REASON_LABELS.get(reason)
    ]),
    ["insufficient-points", "공용 XP 포인트가 필요합니다."]
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
    return `<section class="farm-upgrade-tree" aria-label="일반 정원 강화"><p class="ability-tree__wallet" aria-live="polite"><strong>${state.availablePoints}</strong><span>공용 XP 포인트</span></p>${renderPlayerProgressMarkup(state)}<div class="farm-upgrade-tree__nodes">${NODES}</div></section>`;
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
    const INVESTED = getInvestedPointCount(state);
    const CONTEXT = {
      highestSpeciesTier,
      location: location2,
      inCombat
    };
    const RESET_CHECK = canResetAbilityProgression(state, CONTEXT);
    const VISIBLE_DEFINITIONS = Number.isInteger(selectedSpecies) ? SPECIES_ABILITY_DEFINITIONS.filter((definition) => definition.species === selectedSpecies) : SPECIES_ABILITY_DEFINITIONS;
    const CARDS = VISIBLE_DEFINITIONS.map((definition) => renderAbilityCard(state, definition, CONTEXT)).join("") || `<p class="ability-tree__note" role="status">이 병종은 기본 공격으로 전투에 참여해요. 전용 특수 능력 트리는 아직 추가되지 않았어요.</p>`;
    const LEVEL_MARKUP = renderPlayerProgressMarkup(state);
    return `<section class="ability-tree" aria-labelledby="ability-tree-title">
    <header class="ability-tree__header">
      <div><p class="ability-tree__eyebrow">정원 성장</p><h2 id="ability-tree-title">특수 능력</h2></div>
      <p class="ability-tree__wallet" aria-live="polite"><strong>${state.availablePoints}</strong><span>공용 포인트</span></p>
    </header>
    <p class="ability-tree__note">능력마다 Rare(T3)에서 해금할 수 있고, 강화와 적용 등급 완화에 같은 포인트를 씁니다. 사용하지 않은 포인트는 보존됩니다.</p>
    ${LEVEL_MARKUP}
    <div class="ability-tree__actions">
      <p class="ability-tree__lock-note" role="status">${inCombat ? "전투 중에는 투자와 초기화가 잠깁니다." : location2 !== "farm" ? "농장에서 투자하거나 초기화할 수 있습니다." : "농장에서 무료로 초기화할 수 있습니다."}</p>
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
    const GRADE_NODES = definition.gradeThresholds.slice(1).map((tier, index) => {
      const LEVEL = index + 1;
      const GRADE = tier === 2 ? "Uncommon (T2)" : "Common (T1)";
      return renderNode(state, definition, `grade-${LEVEL}`, `${GRADE}까지`, `최소 적용 등급 ${GRADE}`, context);
    }).join("");
    const MINIMUM_TIER = getMinimumApplicableTier(state, definition.id);
    const ROOT_STATUS = getAbilityNodeStatus(state, definition, "root", context);
    const SPECIES_NAME = speciesById(definition.species).name;
    return `<article class="ability-card" data-species="${definition.species}" data-ability="${definition.id}">
    <header class="ability-card__header"><div><p class="ability-card__species">${SPECIES_NAME}</p><h3>${definition.name}</h3></div><span class="ability-card__grade">${INVESTMENT.rootUnlocked ? `최소 T${MINIMUM_TIER}` : "Rare · T3 해금"}</span></header>
    <p class="ability-card__description">${definition.description}</p>
    <div class="ability-card__root">
      <span class="ability-node__branch-label">능력 루트</span>
      ${renderNode(state, definition, "root", "능력 해금", `Rare (T${definition.rootTier}) 개체 필요`, context, ROOT_STATUS)}
      <p class="ability-card__base-effect">기본 효과: ${powerLabel(definition, definition.powerValues[0], 0)}</p>
    </div>
    <div class="ability-card__branches">
      <section class="ability-branch" aria-label="능력 강화 경로"><h4>능력 강화</h4><div class="ability-branch__nodes">${POWER_NODES}</div></section>
      <section class="ability-branch" aria-label="적용 등급 완화 경로"><h4>적용 등급 완화</h4><div class="ability-branch__nodes">${GRADE_NODES}</div></section>
    </div>
  </article>`;
  }
  function renderNode(state, definition, nodeId, title, effect, context, knownStatus = null) {
    const STATUS = knownStatus || getAbilityNodeStatus(state, definition, nodeId, context);
    const HINT_ID = `ability-help-${definition.id}-${nodeId.replace(/[^a-z0-9-]/gi, "-")}`;
    const STATUS_TEXT = STATUS.purchased ? "투자 완료" : nodeReasonLabel(STATUS.reason, definition, context);
    const ATTR = nodeId === "root" ? `${definition.id}:root` : `${definition.id}:${nodeId.replace(/-(\d+)$/, ":$1")}`;
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
  function nodeReasonLabel(reason, definition, context) {
    return NODE_REASON_LABELS.get(reason)?.(definition) ?? (context.location === "farm" ? "사용할 수 없는 노드입니다." : "농장에서 사용할 수 있습니다.");
  }
  function resetReasonLabel(reason, invested) {
    return RESET_REASON_LABELS.get(reason) ?? `투자 ${invested}개를 무료로 돌려받습니다.`;
  }
  function farmUpgradeReasonLabel(reason) {
    return FARM_UPGRADE_REASON_LABELS.get(reason) ?? "사용할 수 없는 노드입니다.";
  }

  // src/farm-app.js
  init_raid_settlement();
  init_boss_rewards();
  init_farm_boss_stages();
  init_species_catalog();
  var DOLLAR2 = (id) => document.getElementById(id);
  var STORAGE = new FarmStorage();
  DOLLAR2("abilitySpeciesTabs").innerHTML = renderAbilitySpeciesTabsMarkup();
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
  var scatterPointer = null;
  var panPointer = null;
  var worldInputMode = "scatter";
  var scatterHintShown = false;
  var scatterHintUntil = 0;
  var bossEncounterOpen = false;
  var bossSwipe = null;
  var bossPauseBeforeOpen = null;
  var lastAutoSettledRunKey = null;
  var RENDERER = new DIORAMA(DOLLAR2("world"));
  var MEASURED_FRAMES = [];
  var lastFrameTimestamp = null;
  var frameCount = 0;
  function measureFrame(now) {
    if (lastFrameTimestamp !== null) {
      MEASURED_FRAMES.push(now - lastFrameTimestamp);
      if (MEASURED_FRAMES.length > 240) {
        MEASURED_FRAMES.shift();
      }
    }
    lastFrameTimestamp = now;
    frameCount++;
  }
  function frameRate() {
    const SORTED = [...MEASURED_FRAMES].sort((a, b) => a - b), SUM = MEASURED_FRAMES.reduce((a, b) => a + b, 0);
    return {
      frames: frameCount,
      fps: SUM ? MEASURED_FRAMES.length * 1e3 / SUM : 0,
      frametimeMs: {
        p50: SORTED[Math.floor((SORTED.length - 1) * 0.5)] || 0,
        p95: SORTED[Math.floor((SORTED.length - 1) * 0.95)] || 0,
        max: Math.max(0, ...MEASURED_FRAMES)
      }
    };
  }
  var FAIL3 = (error) => {
    DOLLAR2("error").hidden = false;
    DOLLAR2("error").textContent = "정원을 진행하지 못했어요. " + error.message;
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
  var OBSERVED_PROGRESS_REVISIONS = /* @__PURE__ */ new WeakMap();
  function markPersistentChange(world) {
    if (world !== personalGarden || OBSERVED_PROGRESS_REVISIONS.get(world) === world.progressRevision) {
      return;
    }
    OBSERVED_PROGRESS_REVISIONS.set(world, world.progressRevision);
    AUTOSAVE.markDirty();
  }
  function onWorldStep(world) {
    markPersistentChange(world);
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
    lastAutoSettledRunKey = RUN_KEY;
    try {
      persistRaidSettlement(localSettlementRoster(world, OWNER_ID, RUN), OWNER_ID);
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
    if (!home && active && !active.paused) {
      FOOD_FEEL.unlock();
      active.queue("feed");
    }
  }
  function install(world) {
    if (active) {
      stopWorldInput();
    }
    active?.dispose();
    RENDERER.resetPan();
    active = new FarmSession(world, {
      onError: FAIL3,
      onWorldStep
    });
    noticeSequence = world.eventSequence;
    observedWorld = world;
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
    const PROGRESS = personalGarden.farmBossProgress, WAS_SELECTED = PROGRESS.selections.some((entry) => entry.stage === stage), PREVIOUS_STAGE = PROGRESS.currentStage;
    const SELECTION = selectFarmBossStage(PROGRESS, stage);
    if (!WAS_SELECTED || PREVIOUS_STAGE !== stage) {
      personalGarden.markProgressChanged();
      saveImmediate(personalGarden);
    }
    const SPECIES = SELECTION.species, CATALOG_ENTRY = speciesById(SPECIES), REWARD_NAME = speciesRewardName(SPECIES), ENCOUNTER_NAME = giantSpeciesName(SPECIES), ROLLS = SELECTION.rolls;
    DOLLAR2("bossStageCounter").textContent = `${SELECTION.stage} / ${BOSS_REWARD_SETTINGS.maxStage}`;
    DOLLAR2("bossStageLabel").textContent = `STAGE ${SELECTION.stage}`;
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
      DETAILS.textContent = `${Math.round(BOSS_REWARD_SETTINGS.acquisitionChance * 100)}%씩 · ${ROLLS}회 개별 추첨 · 성공마다 T1 1마리`;
      LABEL.append(TITLE, DETAILS);
      DOLLAR2("bossStageDrop").append(ICON, LABEL);
      renderNeutralBossPreview(ICON, SPECIES, CATALOG_ENTRY.asset);
      DOLLAR2("bossStageNotice").textContent = "";
    } else {
      DOLLAR2("bossStageNotice").textContent = "종 보상은 없어요 · 5스테이지부터 1회 추첨";
    }
    DOLLAR2("bossEncounterChallenge").disabled = !hasRaidRosterEntries(personalGarden.units) || personalGarden.farmBossEvent?.phase !== "idle" || personalGarden.activeRaidRunSequence !== null;
    DOLLAR2("bossEncounterChallenge").title = DOLLAR2("bossEncounterChallenge").disabled ? "전투를 시작하려면 투입 가능한 병력과 정원 상태가 필요해요." : "";
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
    DOLLAR2("continueLegacyGame").disabled = !STORAGE.legacyCompatible;
    DOLLAR2("legacySaveNotice").hidden = !STORAGE.legacyCompatible;
    DOLLAR2("exportSave").disabled = !(STORAGE.raw || STORAGE.legacyRaw);
    DOLLAR2("exportLegacySave").hidden = !STORAGE.legacyBackup;
    DOLLAR2("exportLegacySave").disabled = !STORAGE.legacyBackup;
    DOLLAR2("saveNotice").textContent = [STORAGE.migrationNotice, STORAGE.error].filter(Boolean).join(" ");
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
    } else if (!scatterHintShown) {
      scatterHintShown = true;
      scatterHintUntil = performance.now() + 6e3;
    }
  }
  function start(world, push = true) {
    AUTOSAVE.reset();
    FOOD_FEEL.unlock();
    personalGarden = world;
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
      FAIL3(Error(STORAGE.error || "농장 원정 예약을 저장하지 못했어요."));
      return null;
    }
    personalGarden = STORAGE.world;
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
    const ENTRIES = raidRosterEntries(personalGarden.units, CONFIG.raid.capacity.playerUnits).map(
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
      settleVictory: ({ farm, receiptKey, deploymentMultiplier }) => {
        const GARDEN2 = restore(farm), STAGE = raidWorld.boss.stage || 0, STAGE_REWARD = STAGE ? bossStageStats(STAGE) : null, RESOLVED = settleBossKill(GARDEN2, {
          encounterId: FARM_RUN.runSequence,
          source: "raid",
          receiptKey,
          acquisitionMultiplier: deploymentMultiplier,
          rollCount: STAGE_REWARD?.rolls ?? 1,
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
              roll: REWARD2.roll,
              rollCount: REWARD2.rollCount,
              rolls: REWARD2.drops,
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
    personalGarden = STORAGE.world;
    return settled;
  }
  function beginRaid(push = true) {
    if (!personalGarden || active.world.scene === "raid" || personalGarden.activeRaidRunSequence !== null || personalGarden.farmBossEvent?.phase !== "idle" || !raidRosterEntries(personalGarden.units, 1).length) {
      return;
    }
    if (!persist()) {
      return;
    }
    const BOSS_STAGE = renderBossEncounterStage(personalGarden.farmBossProgress.currentStage);
    if (!BOSS_STAGE || !persist()) {
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
      entries: raidRosterEntries(personalGarden.units, CONFIG.raid.capacity.playerUnits),
      abilitySnapshot: createAbilityRuntimeSnapshot(personalGarden.playerProgression),
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
    const CURRENT = personalGarden?.farmBossProgress?.currentStage || 1, NEXT = DELTA < 0 ? Math.min(BOSS_REWARD_SETTINGS.maxStage, CURRENT + 1) : Math.max(1, CURRENT - 1);
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
      personalGarden = STORAGE.world;
      refreshStart();
      DOLLAR2("saveNotice").textContent = "이전 원정을 보상 없이 종료했어요. 병력과 성장 포인트는 그대로예요.";
    } catch (error) {
      FAIL3(error);
    }
  };
  DOLLAR2("newGame").onclick = () => {
    if ((STORAGE.raw || STORAGE.legacyRaw) && !DOLLAR2("newConfirm").hidden) {
      return;
    }
    if (STORAGE.raw || STORAGE.legacyRaw) {
      DOLLAR2("newConfirmText").textContent = STORAGE.raw ? "현재 정원을 새 정원으로 바꿀까요? 필요한 저장은 먼저 내보내 주세요." : "새 정원을 시작할까요? 기존 원본 저장은 별도 키에 그대로 남아요.";
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
    const RAW = STORAGE.raw || STORAGE.legacyRaw;
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
  DOLLAR2("exportLegacySave").onclick = () => {
    const RAW = STORAGE.legacyBackup?.raw;
    if (!RAW) {
      return;
    }
    const URL_LOCAL = URL.createObjectURL(
      new Blob([RAW], {
        type: "application/json"
      })
    ), A = document.createElement("a");
    A.href = URL_LOCAL;
    A.download = "budmori-legacy-save-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json";
    A.click();
    setTimeout(() => URL.revokeObjectURL(URL_LOCAL), 1e3);
  };
  DOLLAR2("importSave").onclick = () => DOLLAR2("saveFile").click();
  DOLLAR2("continueLegacyGame").onclick = async () => {
    if (!STORAGE.legacyRaw) {
      return;
    }
    try {
      const { validateSave: VALIDATE_SAVE } = await Promise.resolve().then(() => (init_farm_storage(), farm_storage_exports));
      VALIDATE_SAVE(STORAGE.legacyRaw);
      imported = STORAGE.legacyRaw;
      importedLegacy = true;
      DOLLAR2("importConfirmText").textContent = saveHasLegacyFarmProgress(STORAGE.legacyRaw) ? "이전 활동 기반 강화는 종료되고 경험치 포인트로 통합돼요. 기존 무료 강화는 초기화되고, 원본을 먼저 백업합니다. 이어갈까요?" : "0.4 원본 저장은 그대로 두고 새 저장 키에 복사해 이어갈까요?";
      DOLLAR2("confirmImport").textContent = "원본을 보존하고 이어가기";
      DOLLAR2("importConfirm").hidden = false;
    } catch (e) {
      DOLLAR2("saveNotice").textContent = e.message;
    }
  };
  DOLLAR2("saveFile").onchange = async () => {
    const FILE = DOLLAR2("saveFile").files[0];
    if (!FILE) {
      return;
    }
    try {
      if (FILE.size > 2 * 1024 * 1024) {
        throw Error("저장 파일이 너무 큽니다.");
      }
      const TEXT = await FILE.text();
      const { validateSave: VALIDATE_SAVE } = await Promise.resolve().then(() => (init_farm_storage(), farm_storage_exports));
      VALIDATE_SAVE(TEXT);
      imported = TEXT;
      importedLegacy = false;
      DOLLAR2("importConfirmText").textContent = saveHasLegacyFarmProgress(TEXT) ? "이전 활동 기반 강화는 종료되고 경험치 포인트로 통합돼요. 기존 무료 강화는 초기화됩니다. 원본을 먼저 백업한 뒤 이 저장을 불러올까요?" : "선택한 파일로 개인 저장을 바꿀까요?";
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
    importedLegacy = false;
    DOLLAR2("importConfirm").hidden = true;
  };
  DOLLAR2("confirmImport").onclick = () => {
    try {
      if (imported) {
        const LEGACY = importedLegacy, WORLD = STORAGE.import(imported);
        AUTOSAVE.reset();
        if (LEGACY) {
          start(WORLD);
        } else {
          personalGarden = WORLD;
          install(WORLD);
          active.paused = true;
        }
      }
      imported = null;
      importedLegacy = false;
      DOLLAR2("importConfirm").hidden = true;
      refreshStart();
    } catch (e) {
      DOLLAR2("saveNotice").textContent = e.message;
    }
  };
  DOLLAR2("farm").onclick = () => returnToFarm();
  DOLLAR2("raid").onclick = () => openBossEncounter();
  DOLLAR2("return").onclick = () => returnToFarm();
  for (const VALUE of ["breed", "merge"]) {
    DOLLAR2(VALUE).onclick = () => active.queue("mode", {
      value: VALUE
    });
  }
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
    const W = personalGarden || active.world, IN_COMBAT = W.running || W.farmBossEvent?.phase !== "idle";
    DOLLAR2("treeNodes").innerHTML = renderFarmUpgradeTreeMarkup(W.playerProgression, {
      location: W.scene,
      inCombat: IN_COMBAT
    });
  }
  function drawAbilityTree() {
    const W = personalGarden || active.world, IN_COMBAT = W.running || W.farmBossEvent?.phase !== "idle";
    const SELECTED_SPECIES = Number(DOLLAR2("abilityPanel").dataset.selectedSpecies || 0);
    DOLLAR2("abilityPoints").textContent = String(W.playerProgression.availablePoints);
    for (const BUTTON of DOLLAR2("abilitySpeciesTabs").querySelectorAll("[data-ability-species]")) {
      BUTTON.setAttribute("aria-pressed", String(Number(BUTTON.dataset.abilitySpecies) === SELECTED_SPECIES));
    }
    DOLLAR2("abilityNodes").innerHTML = renderAbilityTreeMarkup(W.playerProgression, {
      highestSpeciesTier: W.highestSpeciesTiers(),
      location: W.scene,
      inCombat: IN_COMBAT,
      selectedSpecies: SELECTED_SPECIES
    });
  }
  var MENU_ROUTES = {
    play: "#/menu",
    growth: "#/growth",
    abilities: "#/abilities",
    help: "#/help"
  };
  var ROUTE_MENU_TAB = (route2) => route2 === "#/growth" ? "growth" : route2 === "#/abilities" ? "abilities" : route2 === "#/help" ? "help" : "play";
  function applyMenuTab(tab) {
    menuTab = tab;
    for (const BUTTON of DOLLAR2("gameMenuTabs").querySelectorAll("[data-menu-tab]")) {
      const SELECTED = BUTTON.dataset.menuTab === tab;
      BUTTON.setAttribute("aria-selected", String(SELECTED));
      BUTTON.tabIndex = SELECTED ? 0 : -1;
    }
    for (const [NAME, ID] of [
      ["play", "menuPlayPanel"],
      ["growth", "treePanel"],
      ["abilities", "abilityPanel"],
      ["help", "helpPanel"]
    ]) {
      DOLLAR2(ID).hidden = NAME !== tab;
    }
    if (tab === "growth") {
      drawTree();
    } else if (tab === "abilities") {
      drawAbilityTree();
    }
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
    DOLLAR2("gameMenuTabs").querySelector(`[data-menu-tab="${tab}"]`)?.focus();
  }
  function switchMenuTab(tab, push = true) {
    if (!["play", "growth", "abilities", "help"].includes(tab)) {
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
    DOLLAR2("gameMenu").setAttribute("aria-expanded", "false");
    if (menuAutoPaused && !menuPauseChanged) {
      active.paused = menuWasPaused;
    }
    menuPauseChanged = false;
    menuAutoPaused = false;
    if (push) {
      history.pushState(null, "", active.world.scene === "raid" ? "#/raid" : "#/farm");
    }
    DOLLAR2("gameMenu").focus();
  }
  DOLLAR2("gameMenu").onclick = () => menuOpen ? closeMenu() : openMenu();
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
  GAME_MENU_OVERLAY.addEventListener("pointerdown", CLOSE_MENU_FROM_BACKDROP);
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
      active.queue("ability-reset");
    } else if (BUTTON.dataset.abilityNode) {
      const [ABILITY_ID, KIND, LEVEL] = BUTTON.dataset.abilityNode.split(":");
      const NODE_ID = KIND === "root" ? "root" : `${KIND}-${LEVEL}`;
      active.queue("progression-invest", {
        scope: "ability",
        abilityId: ABILITY_ID,
        nodeId: NODE_ID
      });
    }
    setTimeout(drawAbilityTree, 180);
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
    syncFlag(
      "deployTroops",
      "disabled",
      !ROSTER2 || REMAINING - QUEUED <= 0 || active.paused || ["victory", "defeat"].includes(W.encounter.outcome)
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
      const STAGE_REWARD = bossStageStats(STAGE), MULTIPLIER = raidDeploymentRewardMultiplier({
        availableAtStart: ROSTER2?.troops.length || 0,
        originalUnitsDeployed: deployed
      }), CHANCE = Math.round(
        bossAcquisitionChance({
          acquisitionMultiplier: MULTIPLIER
        }) * 100
      );
      syncText(
        "raidRewardChance",
        STAGE_REWARD.rolls ? `${speciesRewardName(W.boss.species)} · ${CHANCE}%씩 · ${STAGE_REWARD.rolls}회 개별 추첨` : "종 추첨 없음"
      );
    } else {
      syncText("raidRewardChance", "");
    }
  }
  function canUseWorldInput() {
    return !home && !menuOpen && !bossEncounterOpen && !active.paused;
  }
  function deployTroop() {
    if (!canUseWorldInput() || active.world.scene !== "raid") {
      return false;
    }
    return active.deployNext();
  }
  function stopDrop(e) {
    if (e && dropPointer !== null && e.pointerId !== dropPointer) {
      return;
    }
    const ID = dropPointer;
    dropPointer = null;
    if (dropTimer !== null) {
      clearInterval(dropTimer);
    }
    dropTimer = null;
    const BUTTON = DOLLAR2("deployTroops");
    BUTTON.setAttribute("aria-pressed", "false");
    if (typeof ID === "number" && BUTTON.hasPointerCapture?.(ID)) {
      BUTTON.releasePointerCapture(ID);
    }
  }
  function beginDrop(id) {
    if (dropPointer !== null || scatterPointer || panPointer || !deployTroop()) {
      return false;
    }
    dropPointer = id;
    DOLLAR2("deployTroops").setAttribute("aria-pressed", "true");
    dropTimer = setInterval(() => {
      if (dropPointer !== null && !deployTroop()) {
        stopDrop();
      }
    }, 100);
    return true;
  }
  DOLLAR2("deployTroops").addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !beginDrop(e.pointerId)) {
      return;
    }
    FOOD_FEEL.unlock();
    DOLLAR2("deployTroops").setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  DOLLAR2("deployTroops").addEventListener("lostpointercapture", stopDrop);
  DOLLAR2("deployTroops").addEventListener("keydown", (e) => {
    if (!["Enter", " "].includes(e.key)) {
      return;
    }
    e.preventDefault();
    if (!e.repeat) {
      beginDrop("keyboard");
    }
  });
  DOLLAR2("deployTroops").addEventListener("keyup", (e) => {
    if (["Enter", " "].includes(e.key)) {
      e.preventDefault();
      stopDrop();
    }
  });
  DOLLAR2("deployTroops").addEventListener("blur", () => stopDrop());
  function stopScatter(e) {
    if (e && scatterPointer && e.pointerId !== scatterPointer.id) {
      return;
    }
    const ID = scatterPointer?.id;
    scatterPointer = null;
    active?.world.clearLocalScatter();
    if (ID !== void 0 && CANVAS.hasPointerCapture?.(ID)) {
      CANVAS.releasePointerCapture(ID);
    }
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
    stopDrop(e);
    stopScatter(e);
    stopPan(e);
  }
  function selectWorldInputMode(mode) {
    stopWorldInput();
    worldInputMode = mode;
    DOLLAR2("scatterMode").setAttribute("aria-pressed", String(mode === "scatter"));
    DOLLAR2("panMode").setAttribute("aria-pressed", String(mode === "pan"));
    CANVAS.setAttribute(
      "aria-label",
      mode === "pan" ? "드래그해 정원 시야 이동" : "지면을 누르고 드래그해 아군 산개 범위 조절"
    );
  }
  DOLLAR2("scatterMode").onclick = () => selectWorldInputMode("scatter");
  DOLLAR2("panMode").onclick = () => selectWorldInputMode("pan");
  CANVAS.addEventListener("pointerdown", (e) => {
    FOOD_FEEL.unlock();
    if (e.button !== 0 || !canUseWorldInput() || scatterPointer || panPointer || dropPointer !== null) {
      return;
    }
    if (worldInputMode === "pan") {
      panPointer = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY
      };
      CANVAS.setPointerCapture?.(e.pointerId);
      e.preventDefault();
      return;
    }
    const P = RENDERER.screenToWorld(e.clientX, e.clientY);
    if (!ARENA_GEOMETRY.inside(P, active.world.scene)) {
      return;
    }
    scatterPointer = {
      id: e.pointerId,
      x: P.x,
      y: P.y
    };
    active.world.setLocalScatter(P.x, P.y);
    CANVAS.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  CANVAS.addEventListener("pointermove", (e) => {
    if (panPointer && e.pointerId === panPointer.id) {
      if (!canUseWorldInput()) {
        stopPan();
        return;
      }
      RENDERER.panByScreen(e.clientX - panPointer.x, e.clientY - panPointer.y);
      panPointer.x = e.clientX;
      panPointer.y = e.clientY;
      e.preventDefault();
      return;
    }
    if (!scatterPointer || e.pointerId !== scatterPointer.id) {
      return;
    }
    if (!canUseWorldInput()) {
      stopScatter();
      return;
    }
    const P = RENDERER.screenToWorld(e.clientX, e.clientY), DX = P.x - scatterPointer.x, DY = P.y - scatterPointer.y, D = Math.hypot(DX, DY), R2 = Math.max(CONFIG.scatter.minRadius, Math.min(CONFIG.scatter.maxRadius, D)), ANGLE = D > 1e-6 ? Math.atan2(DY, DX) : 0;
    active.world.setLocalScatter(
      scatterPointer.x,
      scatterPointer.y,
      R2,
      scatterPointer.x + Math.cos(ANGLE) * R2,
      scatterPointer.y + Math.sin(ANGLE) * R2
    );
    e.preventDefault();
  });
  CANVAS.addEventListener("lostpointercapture", (e) => {
    stopScatter(e);
    stopPan(e);
  });
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
      const CURRENT = personalGarden?.farmBossProgress?.currentStage || 1, NEXT = e.key === "ArrowUp" ? Math.min(BOSS_REWARD_SETTINGS.maxStage, CURRENT + 1) : Math.max(1, CURRENT - 1);
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
    if (R2 === "#/help" || R2 === "#/growth" || R2 === "#/abilities" || R2 === "#/menu") {
      const RAID = active.world.scene === "raid", FARM_EVENT_ACTIVE = !RAID && personalGarden?.farmBossEvent?.phase !== "idle";
      const RESTRICTED = R2 === "#/growth" && (RAID || FARM_EVENT_ACTIVE) || R2 === "#/abilities" && (RAID || !personalGarden);
      if (RESTRICTED) {
        if (menuOpen) {
          closeMenu(false);
        }
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
  function sync(display, now) {
    const W = active.world, RAID = display.scene === "raid", FARM_EVENT = display.farmBossEvent, FARM_EVENT_ACTIVE = !RAID && FARM_EVENT?.phase !== "idle", BATTLE_HUD = RAID || FARM_EVENT_ACTIVE, HAS_READY_TROOPS = personalGarden ? hasRaidRosterEntries(personalGarden.units) : false, REWARD_WORLD = personalGarden || W, PENDING_REWARD = REWARD_WORLD.bossRewardReceipts.find((reward) => reward.status === "pending");
    syncFlag("worldInputControls", "hidden", home || bossEncounterOpen);
    syncFlag("scatterHint", "hidden", home || menuOpen || bossEncounterOpen || now >= scatterHintUntil);
    if ((home || menuOpen || bossEncounterOpen || active.paused) && (dropPointer !== null || scatterPointer || panPointer)) {
      stopWorldInput();
    }
    syncAttribute("farm", "aria-pressed", !RAID && !bossEncounterOpen);
    syncAttribute("raid", "aria-pressed", RAID || bossEncounterOpen);
    syncAttribute("breed", "aria-pressed", W.mode === "breed");
    syncAttribute("merge", "aria-pressed", W.mode === "merge");
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
      RAID ? `${W.units.length} deployed in raid` : PENDING_REWARD ? `${speciesRewardName(PENDING_REWARD.species)} 보상 대기 · 공간이 생기면 합류해요` : !HAS_READY_TROOPS ? "모두 휴식 중 · 회복까지 기다려 주세요" : worldCount >= W.capacity ? "정원이 가득 찼어요" : "번식으로 식구를 늘려요"
    );
    syncWidth("allyHealth", (armyMax ? armyCurrent / armyMax * 100 : 0) + "%");
    syncText(
      "allyHealthText",
      Math.ceil(armyCurrent) + " / " + Math.ceil(armyMax) + " HP · " + armyLiving + "/" + armyTotal + " 생존"
    );
    const BOSS2 = display.boss, BATTLE_OUTCOME = RAID ? W.encounter.outcome : FARM_EVENT?.outcome, SETTLED_RUN_SEQUENCE = RAID ? personalGarden?.activeRaidRunSequence ?? W.boss.encounterId : null, SETTLED_REWARD = RAID && personalGarden?.raidSettlementReceipts?.find((receipt) => receipt.runSequence === SETTLED_RUN_SEQUENCE)?.reward, STAGE_NAME = RAID && BOSS2.stage ? `STAGE ${BOSS2.stage}` : "", REWARD_NAME = speciesRewardName(BOSS2.species), ENCOUNTER_NAME = giantSpeciesName(BOSS2.species);
    syncText("bossName", ENCOUNTER_NAME);
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
      RAID ? BATTLE_OUTCOME === "victory" ? `${STAGE_NAME} · ${ENCOUNTER_NAME} · 승리 · ${SETTLED_REWARD?.xp?.amount ?? bossStageStats(BOSS2.stage || 1).xp} XP${SETTLED_REWARD?.acquisition?.rollCount ? ` · ${REWARD_NAME} ${SETTLED_REWARD.acquisition.rolls?.filter((drop) => drop.status === "granted").length || 0}/${SETTLED_REWARD.acquisition.rollCount}회 성공` : SETTLED_REWARD ? " · 종 추첨 없음" : bossStageStats(BOSS2.stage || 1).rolls ? " · 정원 복귀 후 보상 정산" : " · 종 추첨 없음"} · 모두 정원으로 돌아갈 수 있어요` : BATTLE_OUTCOME === "defeat" ? `${STAGE_NAME} · ${ENCOUNTER_NAME} · 패배 · 휴식이 필요해요 · 정원에서 다시 준비해요` : "" : BATTLE_OUTCOME === "victory" ? FARM_EVENT.rewardStatus === "granted" ? `${ENCOUNTER_NAME} 격파 · ${REWARD_NAME} 획득 · 정원에 합류했어요` : FARM_EVENT.rewardStatus === "pending" ? `${ENCOUNTER_NAME} 격파 · ${REWARD_NAME} 획득 대기 · 공간이 생기면 합류해요` : `${ENCOUNTER_NAME} 격파` : BATTLE_OUTCOME === "defeat" ? `${ENCOUNTER_NAME} 도전 종료 · 동료들이 다시 일어날 때까지 기다려요` : ""
    );
    syncFlag(
      "battleOutcome",
      "hidden",
      home || !BATTLE_HUD || BATTLE_OUTCOME === "fighting" || BATTLE_OUTCOME === "idle"
    );
    syncFlag(
      "bossEncounterChallenge",
      "disabled",
      !personalGarden || !HAS_READY_TROOPS || FARM_EVENT_ACTIVE || personalGarden?.activeRaidRunSequence !== null
    );
    syncFlag("menuTabGrowth", "disabled", RAID || FARM_EVENT_ACTIVE || bossEncounterOpen);
    syncFlag("menuTabAbilities", "disabled", RAID || !personalGarden);
    syncFlag("raid", "disabled", RAID || FARM_EVENT_ACTIVE || !personalGarden);
    syncText("pause", active.paused ? "▶" : "Ⅱ");
    syncAttribute("feed", "aria-label", `먹이 탭, 5회 중 ${W.foodTaps.remainder}회`);
    syncData("feed", "state", W.food.length >= 140 ? "full" : "ready");
    syncData("feed", "produced", now < FOOD_FEEL.completeUntil);
    for (let i = 0; i < 5; i++) {
      const PIP = FOOD_FEEL.pips[i], FILLED = now < FOOD_FEEL.completeUntil || i < W.foodTaps.remainder;
      if (PIP.classList.contains("filled") !== FILLED) {
        PIP.classList.toggle("filled", FILLED);
      }
    }
    if (observedWorld !== W) {
      observedWorld = W;
      noticeSequence = W.eventSequence;
    }
    for (const E of W.notices) {
      if (E.sequence > noticeSequence) {
        if (E.kind === "food-tap") {
          FOOD_FEEL.tap(E.source, E.completed, E.remainder);
        } else {
          FOOD_FEEL.event(E.kind);
        }
      }
    }
    noticeSequence = W.eventSequence;
    FOOD_FEEL.frame(now);
    deploymentHud();
  }
  function frame(now) {
    try {
      measureFrame(now);
      if (!home && !document.hidden) {
        active.pulse(now);
      }
      const DISPLAY = active.presentation(now);
      COMBAT_FEEL.observe(active.world, DISPLAY.displayTimeMs, DISPLAY.presentationRevision);
      RENDERER.render(DISPLAY, COMBAT_FEEL, DISPLAY.displayTimeMs);
      sync(DISPLAY, now);
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
  DOLLAR2("startVersion").textContent = PRODUCT_VERSION + " · 여섯 등급과 합체 확장";
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
