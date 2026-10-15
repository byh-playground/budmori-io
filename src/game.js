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

  // src/farm-model.js
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
      a.vx -= nx * impulse;
      a.vy -= ny * impulse;
      b.vx += nx * impulse;
      b.vy += ny * impulse;
      if (closing > 2) {
        const receiver = Math.hypot(a.vx, a.vy) > Math.hypot(b.vx, b.vy) ? a : b;
        receiver.vz = Math.max(receiver.vz, Math.min(4, closing * 0.2));
        receiver.stun = Math.max(receiver.stun, 0.3);
        receiver.flash = 0.1;
      }
    }
    return true;
  }
  var SeededPRNG, CONFIG, clamp, stats, Body, Knockable, TREE_NODES, FarmProgress, ATTACK_TYPES, ArenaGeometry, Ballistics, AttackCycle, AttackingBody, Unit, Garden;
  var init_farm_model = __esm({
    "src/farm-model.js"() {
      ({ SeededPRNG } = globalThis.BloomGamekitDeterministic);
      CONFIG = Object.freeze({ cap: 72, maxTier: 4, starterSeconds: 60, matureMeals: 3, gravity: 19, fixedStep: 1 / 120, raid: Object.freeze({ radiusX: 23, radiusY: 17, bossRadius: 4.4, bossHeight: 5.2, basicReach: 6.2, sweepReach: 6.5, weaponRadius: 0.85, chaseSpeed: 2.65, basicWindup: 0.5, basicDuration: 0.24, basicRecover: 0.48, sweepWindup: 1.05, sweepDuration: 1.05, sweepRecover: 1.05, sweepInterval: 6.8 }) });
      clamp = (x, a, b) => Math.max(a, Math.min(b, x));
      stats = (tier) => ({ hp: 40 * 1.5 ** (tier - 1), atk: 4 * 1.2 ** (tier - 1) });
      Body = class {
        constructor(x, y) {
          Object.assign(this, { x, y, z: 0, vx: 0, vy: 0, vz: 0, angle: 0, stun: 0, flash: 0, bounce: 0 });
        }
      };
      Knockable = (Base) => class extends Base {
        knock(nx, ny, power, lift = 0) {
          this.vx += nx * power;
          this.vy += ny * power;
          this.vz = Math.max(this.vz, lift);
          this.stun = Math.max(this.stun, 0.5);
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
        { id: "production", name: "새싹 생산", icon: "♧", metric: "eat", goal: 8, parent: null, description: "새싹 생산 속도 +10%/단계", value: (l) => `${(60 / (1 + 0.1 * l)).toFixed(1)}초` },
        { id: "food", name: "자동 탭", icon: "◒", metric: "eat", goal: 12, parent: "production", description: "자동 탭 속도 +10%/단계 · 수동은 매 탭 +1", value: (l) => `${(0.5 / (1 + 0.1 * l)).toFixed(3)}초 / 탭` },
        { id: "growth", name: "먹이 찾기", icon: "❧", metric: "eat", goal: 10, parent: "production", description: "먹이를 향한 이동속도 +10%/단계 · 성체까지 3끼 유지", value: (l) => `${(2.2 * (1 + 0.1 * l)).toFixed(2)} 속도` },
        { id: "breed", name: "번식 회복", icon: "♡", metric: "birth", goal: 2, parent: "growth", description: "부모의 번식 대기 속도 +10%/단계", value: (l) => `${(5 / (1 + 0.1 * l)).toFixed(2)}초` },
        { id: "merge", name: "합체 회복", icon: "◇", metric: "merge", goal: 2, parent: "growth", description: "합체 후 대기 속도 +10%/단계 · 체력·공격 배율 유지", value: (l) => `${(4 / (1 + 0.1 * l)).toFixed(2)}초` }
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
          return this.levels[n.id] < 4 && (!n.parent || this.levels[n.parent] > 0) && this.records[n.metric] >= n.goal * (this.levels[n.id] + 1);
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
      ATTACK_TYPES = Object.freeze([
        { kind: "ram", windup: 0.28, recover: 0.65, stand: 1.45, damage: 1 },
        { kind: "lob", windup: 0.38, recover: 1.25, stand: 4.1, damage: 1.6 },
        { kind: "leap", windup: 0.32, recover: 0.9, stand: 2.5, damage: 1.3 }
      ]);
      ArenaGeometry = {
        bounds(scene2 = "raid", margin = 0) {
          return scene2 === "raid" ? { x: CONFIG.raid.radiusX - margin, y: CONFIG.raid.radiusY - margin } : { x: 9.5 - margin, y: 6.8 - margin };
        },
        inside(p, scene2 = "raid", margin = 0) {
          const r = this.bounds(scene2, margin);
          return p.x * p.x / (r.x * r.x) + p.y * p.y / (r.y * r.y) <= 1;
        },
        clamp(p, scene2 = "raid", margin = 0) {
          const r = this.bounds(scene2, margin), k = Math.max(1, Math.hypot(p.x / r.x, p.y / r.y));
          return { x: p.x / k, y: p.y / k };
        },
        overlaps(a, b) {
          return a.z <= b.z + b.height && a.z + a.height >= b.z && Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius;
        },
        // Swept XY cylinder versus finite Z interval; includes entity radii, never center-only.
        sweep(a, b, r, h, target) {
          const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, R = r + target.radius;
          let lo = 0, hi = 1;
          const A = dx * dx + dy * dy, B = 2 * ((a.x - target.x) * dx + (a.y - target.y) * dy), C = (a.x - target.x) ** 2 + (a.y - target.y) ** 2 - R * R;
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
          const t = clamp(lo, 0, 1);
          return { x: a.x + dx * t, y: a.y + dy * t, z: a.z + dz * t, t };
        }
      };
      Ballistics = {
        create(from, to, kind) {
          const distance = Math.hypot(to.x - from.x, to.y - from.y);
          return { from: { x: from.x, y: from.y, z: kind === "lob" ? 0.45 : 0 }, to: { ...to }, height: kind === "ram" ? 0 : kind === "lob" ? 2 : 2.7, duration: kind === "ram" ? Math.max(0.12, distance / 10) : 0.65 + distance * 0.055 };
        },
        sample(path, q) {
          q = clamp(q, 0, 1);
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
          return ATTACK_TYPES[this.owner.species];
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
                sim.projectiles.push({ id: a.id, owner: u.id, species: u.species, tier: u.tier, path: a.path, elapsed: 0, x: u.x, y: u.y, z: 0.45, radius: 0.12, height: 0.24, hit: false });
                this.recover(sim, true);
              }
            }
          } else if (this.phase === "recover" && this.elapsed >= this.spec.recover) {
            this.phase = "idle";
            this.action = null;
            this.elapsed = 0;
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
          const hit = !a.hit && ArenaGeometry.sweep(old, u, u.radius, 0.65, sim.boss);
          if (hit) {
            sim.damageBoss(u, a, hit);
            if (this.spec.kind === "ram") {
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
              if (!a.hit && ArenaGeometry.overlaps({ x: u.x, y: u.y, z: 0, radius: u.radius + 0.35, height: 0.65 }, sim.boss)) sim.damageBoss(u, a, u);
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
          Object.assign(this, { id, species, tier, meals: 0, growth: 0, age: 0, cooldown: 0, home: { x, y }, hp: stats(tier).hp, down: 0, seed: id * 2.39996 });
        }
        get radius() {
          return (0.25 + 0.055 * this.tier) * (this.mature ? 1 : 0.8);
        }
        get mature() {
          return this.growth >= CONFIG.matureMeals;
        }
        get fed() {
          return this.meals >= CONFIG.matureMeals;
        }
        get size() {
          return (0.55 + 0.1 * this.tier) * (this.mature ? 1 : 0.76);
        }
      };
      Garden = class {
        constructor(seed = 731) {
          this.seed = seed;
          this.progress = new FarmProgress();
          this.notices = [];
          this.eventSequence = 0;
          this.reset();
        }
        reset() {
          this.rng = new SeededPRNG(this.seed);
          this.units = [];
          this.food = [];
          this.effects = [];
          this.events = [];
          this.time = 0;
          this.nextId = 1;
          this.starter = 0;
          this.notices = [];
          this.eventSequence = 0;
          this.foodTaps = { remainder: 0, autoClock: 0, produced: 0, revision: 0 };
          this.projectiles = [];
          this.attackSerial = 0;
          this.combatLog = [];
          this.mode = "breed";
          this.scene = "farm";
          this.running = false;
          this.encounter = { outcome: "idle", elapsed: 0 };
          this.boss = this.createBoss();
          this.metrics = { births: 0, merges: 0, directHits: 0, contacts: 0, landings: 0, basicHits: 0, sweepHits: 0 };
          for (let i = 0; i < 36; i++) {
            const u = this.spawn(i % 3, 1, (this.random() - 0.5) * 15, (this.random() - 0.5) * 11);
            u.meals = i < 18 ? 3 : 0;
            u.growth = u.meals;
          }
        }
        random() {
          return this.rng.nextUint32() / 4294967296;
        }
        spawn(species, tier, x, y) {
          if (this.units.length >= CONFIG.cap) return null;
          const u = new Unit(this.nextId++, species, clamp(tier, 1, CONFIG.maxTier), x, y);
          this.units.push(u);
          return u;
        }
        notice(kind, detail = {}) {
          this.notices.push({ sequence: ++this.eventSequence, kind, ...detail });
          if (this.notices.length > 512) this.notices.shift();
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
            let tx = clamp(x, -8, 8), ty = clamp(y, -5.7, 5.7);
            const boundary = Math.hypot(tx / 8, ty / 5.7);
            if (boundary > 1) {
              tx /= boundary;
              ty /= boundary;
            }
            const angle = this.random() * Math.PI * 2, sx = Math.cos(angle) * 10.2, sy = Math.sin(angle) * 7;
            const duration = 0.85 + this.random() * 0.25, z = 0.3;
            this.food.push({ x: sx, y: sy, z, vx: (tx - sx) / duration, vy: (ty - sy) / duration, vz: 6 * duration - z / duration, seed: this.random(), phase: "flight", tx, ty });
            this.emit("feed", tx, ty);
          }
        }
        createBoss() {
          return { x: 0, y: 0, z: 0, radius: CONFIG.raid.bossRadius, height: CONFIG.raid.bossHeight, hp: 2400, maxHp: 2400, phase: "resting", clock: 0, angle: 0, facing: 0, flash: 0, hit: /* @__PURE__ */ new Set(), swings: 0, basicCount: 0, attackId: 0, targetId: 0, sweepClock: 0, attackKind: "basic", startAngle: 0, travel: 0 };
        }
        setScene(scene2) {
          if (scene2 === this.scene) return;
          this.projectiles = [];
          this.scene = scene2;
          this.running = scene2 === "raid";
          this.encounter = { outcome: this.running ? "fighting" : "idle", elapsed: 0 };
          this.boss = this.createBoss();
          for (let i = 0; i < this.units.length; i++) {
            const u = this.units[i];
            if (scene2 === "raid") {
              u.home = { x: u.x, y: u.y };
              const angle = i * 2.3999632297, rad = 10.5 + i % 3 * 0.9;
              Object.assign(u, { x: Math.cos(angle) * rad, y: Math.sin(angle) * rad * 0.84 });
            } else Object.assign(u, u.home);
            u.ability = new AttackCycle(u);
            Object.assign(u, { z: 0, vx: 0, vy: 0, vz: 0, stun: 0, down: 0, hp: stats(u.tier).hp });
          }
          if (this.running) this.boss.phase = "chase";
        }
        pair(a, b) {
          if (a === b || a.species !== b.species || !a.mature || !b.mature || a.cooldown > 0 || b.cooldown > 0 || !this.units.includes(a) || !this.units.includes(b) || Math.hypot(a.x - b.x, a.y - b.y) > a.radius + b.radius + 0.2) return false;
          if (this.mode === "merge") {
            if (a.tier !== b.tier || a.tier >= CONFIG.maxTier) return false;
            const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
            this.units = this.units.filter((u2) => u2 !== a && u2 !== b);
            const u = this.spawn(a.species, a.tier + 1, x, y);
            u.meals = 3;
            u.growth = 3;
            u.cooldown = 4 / this.progress.rate("merge");
            this.metrics.merges++;
            this.emit("merge", x, y, 1);
          } else {
            if (!a.fed || !b.fed || this.units.length >= CONFIG.cap) return false;
            const child = this.spawn(a.species, 1, (a.x + b.x) / 2, (a.y + b.y) / 2);
            child.vz = 3;
            a.meals = b.meals = 0;
            a.cooldown = b.cooldown = 5 / this.progress.rate("breed");
            this.metrics.births++;
            this.emit("birth", child.x, child.y, 0.7);
          }
          return true;
        }
        step(dt) {
          this.time += dt;
          if (this.scene === "raid" && this.running) this.encounter.elapsed += dt;
          this.starter += dt;
          while (this.starter >= CONFIG.starterSeconds / this.progress.rate("production")) {
            this.starter -= CONFIG.starterSeconds / this.progress.rate("production");
            const u = this.spawn(Math.floor(this.random() * 3), 1, -7, 0);
            if (u && this.scene === "raid") {
              u.home = { x: -7, y: 0 };
              const a = u.seed;
              Object.assign(u, ArenaGeometry.clamp({ x: this.boss.x + Math.cos(a) * 12, y: this.boss.y + Math.sin(a) * 12 }, "raid", u.radius));
            }
            if (u) this.emit("starter", u.x, u.y);
          }
          this.effects = this.effects.filter((e) => (e.life += dt) < 1);
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
          for (const u of units) {
            u.age += dt;
            u.cooldown = Math.max(0, u.cooldown - dt);
            if (this.scene === "farm") this.farmUnit(u, dt);
            else if (this.running) this.raidUnit(u, dt);
            const oldZ = u.z, oldPosition = { x: u.x, y: u.y, z: u.z };
            u.integrate(dt);
            if (this.scene === "raid" && this.running) u.ability.afterMove(this, oldPosition);
            if (oldZ > 0 && u.z === 0) {
              this.metrics.landings++;
              if (this.scene === "raid") this.combat("unit-land", { unit: u.id, x: u.x, y: u.y, z: 0, strength: Math.min(1, Math.hypot(u.vx, u.vy) / 8) });
              else if (Math.hypot(u.vx, u.vy) > 1) this.emit("land", u.x, u.y);
            }
            this.boundBody(u, this.scene, u.radius);
          }
          for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
            if (contact(units[i], units[j])) this.metrics.contacts++;
          }
          if (this.scene === "farm") {
            for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) this.pair(units[i], units[j]);
          } else if (this.running) {
            this.updateProjectiles(dt);
            this.updateBoss(dt);
            for (const u of this.units) this.separateBoss(u);
          }
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
        farmUnit(u, dt) {
          if (u.stun > 0 || u.z > 0.1) return;
          let target = null, best = Infinity;
          if (!u.mature || this.mode === "breed" && !u.fed) {
            for (const f of this.food) {
              const d = Math.hypot(f.x - u.x, f.y - u.y);
              if (f.phase === "grounded" && d < best) {
                best = d;
                target = f;
              }
            }
            if (target && best < 0.42) {
              this.food.splice(this.food.indexOf(target), 1);
              u.meals++;
              u.growth = Math.min(CONFIG.matureMeals, u.growth + 1);
              u.vz = 2;
              this.emit("eat", u.x, u.y, 0.5);
              target = null;
            }
          } else if (u.cooldown === 0) {
            for (const p of this.units) {
              if (p === u || p.species !== u.species || !p.mature || p.cooldown > 0 || this.mode === "breed" && !p.fed || this.mode === "merge" && (p.tier !== u.tier || u.tier >= CONFIG.maxTier)) continue;
              const d = Math.hypot(p.x - u.x, p.y - u.y);
              if (d < best) {
                best = d;
                target = p;
              }
            }
          }
          if (target) this.steer(u, target.x, target.y, dt, 2.2 * (target.phase === "grounded" ? this.progress.rate("growth") : 1));
          else this.steer(u, Math.sin(this.time * 0.18 + u.seed) * 7.4, Math.cos(this.time * 0.16 + u.seed) * 5.3, dt, 0.75);
        }
        combat(kind, detail) {
          this.notice(kind, { time: this.time, ...detail });
        }
        boundBody(body, scene2, margin) {
          const before = { x: body.x, y: body.y }, p = ArenaGeometry.clamp(before, scene2, margin);
          body.x = p.x;
          body.y = p.y;
          if (before.x !== p.x || before.y !== p.y) {
            const r = ArenaGeometry.bounds(scene2, margin), nx = p.x / (r.x * r.x), ny = p.y / (r.y * r.y), n = Math.hypot(nx, ny) || 1, out = ((body.vx || 0) * nx + (body.vy || 0) * ny) / n;
            if (out > 0) {
              body.vx -= 1.3 * out * nx / n;
              body.vy -= 1.3 * out * ny / n;
            }
          }
        }
        separateBoss(u) {
          const b = this.boss;
          if (u.z > b.height) return;
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
          this.boundBody(u, "raid", u.radius);
        }
        combatEvent(kind, u, action) {
          this.combatLog.push({ kind, id: action?.id ?? 0, unit: u.id, species: u.species, time: this.time, x: u.x, y: u.y, z: u.z });
          if (this.combatLog.length > 240) this.combatLog.shift();
          if (kind === "launch") this.combat("attack-launch", { species: u.species, unit: u.id, x: u.x, y: u.y, z: u.z, attackKind: ATTACK_TYPES[u.species].kind });
        }
        damageBoss(u, action, point) {
          if (action.hit || this.boss.hp <= 0) return false;
          action.hit = true;
          const spec = ATTACK_TYPES[u.species];
          this.boss.hp = Math.max(0, this.boss.hp - stats(u.tier).atk * spec.damage);
          this.boss.flash = 0.13;
          const dx = point.x - this.boss.x, dy = point.y - this.boss.y, d = Math.hypot(dx, dy) || 1;
          this.combat("boss-hit", { unit: u.id, species: u.species, attackKind: spec.kind, x: this.boss.x + dx / d * this.boss.radius, y: this.boss.y + dy / d * this.boss.radius, z: clamp(point.z + 0.2, 0.2, this.boss.height), nx: dx / d, ny: dy / d, strength: spec.damage });
          this.combatEvent("damage", u, action);
          this.progress.record("hit");
          return true;
        }
        updateProjectiles(dt) {
          for (const p of this.projectiles) {
            const old = { x: p.x, y: p.y, z: p.z };
            p.elapsed += dt;
            Object.assign(p, Ballistics.sample(p.path, p.elapsed / p.path.duration));
            const hit = ArenaGeometry.sweep(old, p, p.radius, p.height, this.boss);
            if (hit) {
              Object.assign(p, { x: hit.x, y: hit.y, z: hit.z });
              this.damageBoss({ id: p.owner, species: p.species, tier: p.tier, x: p.x, y: p.y, z: p.z }, p, hit);
            } else if (p.elapsed >= p.path.duration) {
              p.z = 0;
              this.emit("shell-land", p.x, p.y);
            }
          }
          this.projectiles = this.projectiles.filter((p) => !p.hit && p.elapsed < p.path.duration);
          this.boss.flash = Math.max(0, (this.boss.flash || 0) - dt);
        }
        raidUnit(u, dt) {
          if (u.hp <= 0) {
            u.down = 1;
            u.ability.interrupt();
            return;
          }
          if (u.ability.update(this, dt) || u.stun > 0 || u.z > 0.1) return;
          const b = this.boss, spec = ATTACK_TYPES[u.species], angle = u.seed + this.encounter.elapsed * 0.055, stand = b.radius + spec.stand + (u.tier - 1) * 0.12;
          const slot = ArenaGeometry.clamp({ x: b.x + Math.cos(angle) * stand, y: b.y + Math.sin(angle) * stand }, "raid", u.radius), d = Math.hypot(slot.x - u.x, slot.y - u.y);
          if (d > 0.45) {
            const dx2 = u.x - b.x, dy2 = u.y - b.y, rad = Math.hypot(dx2, dy2), delta = Math.atan2(Math.sin(angle - Math.atan2(dy2, dx2)), Math.cos(angle - Math.atan2(dy2, dx2)));
            if (rad < b.radius + u.radius + 1.1 && Math.abs(delta) > 0.3) {
              const tangent = Math.atan2(dy2, dx2) + Math.sign(delta) * 0.32;
              this.steer(u, b.x + Math.cos(tangent) * (b.radius + u.radius + 1.2), b.y + Math.sin(tangent) * (b.radius + u.radius + 1.2), dt, 4.1);
            } else this.steer(u, slot.x, slot.y, dt, 4.1);
            return;
          }
          const dx = u.x - b.x, dy = u.y - b.y, n = Math.hypot(dx, dy) || 1;
          const target = spec.kind === "lob" ? { x: b.x, y: b.y } : { x: b.x + dx / n * (b.radius + u.radius - 0.16), y: b.y + dy / n * (b.radius + u.radius - 0.16) };
          u.ability.begin(this, target);
        }
        finish(outcome) {
          if (!this.running) return;
          this.running = false;
          this.encounter.outcome = outcome;
          this.projectiles = [];
          this.boss.phase = "resting";
          for (const u of this.units) u.ability.interrupt();
          this.combat(outcome, { x: this.boss.x, y: this.boss.y, z: 0 });
        }
        bossWeaponPoint(phase = this.boss.phase, q = 0) {
          const b = this.boss, c = CONFIG.raid;
          if (phase === "sweep") {
            const a = b.startAngle + Math.PI * 2 * q;
            return { x: b.x + Math.cos(a) * c.sweepReach, y: b.y + Math.sin(a) * c.sweepReach, z: 0.2 };
          }
          const reach = b.radius - 0.25 + (c.basicReach - b.radius + 0.25) * Math.sin(Math.PI * clamp(q, 0, 1));
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
        hitBossWeapon(from, to, kind) {
          const b = this.boss, c = CONFIG.raid;
          for (const u of this.units) {
            if (u.hp <= 0 || b.hit.has(u.id)) continue;
            const p = ArenaGeometry.sweep(from, to, c.weaponRadius, 1.4, { x: u.x, y: u.y, z: u.z, radius: u.radius, height: 0.65 });
            if (!p) continue;
            b.hit.add(u.id);
            const dx = u.x - b.x, dy = u.y - b.y, n = Math.hypot(dx, dy) || 1, heavy = kind === "sweep";
            u.knock(dx / n, dy / n, heavy ? 13 : 8.5, heavy ? 10.2 : 7.2);
            u.hp = Math.max(0, u.hp - (heavy ? 10 : 8));
            if (u.hp === 0) u.down = 1;
            this.metrics.directHits++;
            this.metrics[heavy ? "sweepHits" : "basicHits"]++;
            this.combat("unit-hit", { attackKind: kind, attackId: b.attackId, unit: u.id, x: p.x, y: p.y, z: Math.max(0.15, u.z + 0.25), nx: dx / n, ny: dy / n, strength: heavy ? 1.8 : 1 });
          }
        }
        updateBoss(dt) {
          const b = this.boss, c = CONFIG.raid;
          if (b.hp <= 0) {
            this.finish("victory");
            return;
          }
          if (!this.units.some((u) => u.hp > 0)) {
            this.finish("defeat");
            return;
          }
          b.clock += dt;
          b.sweepClock += dt;
          if (b.phase === "chase") {
            let target = this.units.find((u) => u.id === b.targetId && u.hp > 0);
            if (!target) {
              const living = this.units.filter((u) => u.hp > 0);
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
              this.boundBody(b, "raid", b.radius + 0.25);
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
            this.hitBossWeapon(this.bossWeaponPoint(b.phase, previous), this.bossWeaponPoint(b.phase, q), heavy ? "sweep" : "basic");
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

  // src/farm-state.js
  function snapshot(g) {
    return JSON.parse(JSON.stringify(g, function(key, value) {
      return key === "owner" && this instanceof AttackCycle ? void 0 : value instanceof Set ? [...value] : value;
    }));
  }
  function assert(ok) {
    if (!ok) throw new TypeError("올바른 농장 저장 데이터가 아닙니다.");
  }
  function finiteTree(v, depth = 0) {
    assert(depth < 18);
    if (typeof v === "number") assert(Number.isFinite(v) && Math.abs(v) < 1e13);
    else if (Array.isArray(v)) {
      assert(v.length <= 1024);
      v.forEach((x) => finiteTree(x, depth + 1));
    } else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        assert(!["__proto__", "constructor", "prototype"].includes(k));
        finiteTree(x, depth + 1);
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
  function restore(raw) {
    finiteTree(raw);
    const g = new Garden();
    shape(raw, snapshot(g));
    assert(integer(raw.seed, 0, 4294967295) && integer(raw.rng.state, 0, 4294967295));
    assert(["farm", "raid"].includes(raw.scene) && ["breed", "merge"].includes(raw.mode));
    assert(raw.units.length <= CONFIG.cap && raw.food.length <= 140 && raw.projectiles.length <= CONFIG.cap);
    assert(integer(raw.nextId, 1, 1e9) && integer(raw.foodTaps.remainder, 0, 4) && raw.foodTaps.autoClock >= 0 && raw.foodTaps.autoClock < 0.51);
    const ids = /* @__PURE__ */ new Set();
    for (const u of raw.units) {
      shape(u, snapshot(new Unit(1, 0, 1, 0, 0)));
      assert(integer(u.id, 1, raw.nextId - 1) && !ids.has(u.id));
      ids.add(u.id);
      assert(integer(u.species, 0, 2) && integer(u.tier, 1, 4) && ["idle", "windup", "active", "recover"].includes(u.ability.phase));
      if (u.ability.action) {
        const a = u.ability.action;
        assert(integer(a.id, 1, raw.attackSerial) && typeof a.hit === "boolean" && a.target && Number.isFinite(a.target.x) && Number.isFinite(a.target.y));
        if (a.path) validatePath(a.path);
      }
      if (u.ability.phase === "active" || u.ability.phase === "windup") assert(u.ability.action !== null);
      if (u.ability.phase === "active") validatePath(u.ability.action.path);
    }
    for (const f of raw.food) {
      assert(["flight", "bounce", "grounded"].includes(f.phase));
      for (const k of ["x", "y", "z", "vx", "vy", "vz", "tx", "ty"]) assert(Number.isFinite(f[k]));
    }
    for (const p of raw.projectiles) {
      validatePath(p.path);
      assert(integer(p.owner, 1, raw.nextId - 1));
      assert(integer(p.species, 0, 2) && integer(p.tier, 1, 4) && typeof p.hit === "boolean");
    }
    for (const n of TREE_NODES) assert(integer(raw.progress.levels[n.id], 0, 4));
    for (const v of Object.values(raw.progress.records)) assert(integer(v, 0, 1e12));
    assert(["chase", "strike-windup", "strike", "sweep-windup", "sweep", "recover", "resting"].includes(raw.boss.phase) && raw.boss.hp >= 0 && raw.boss.hp <= raw.boss.maxHp);
    assert(["idle", "fighting", "victory", "defeat"].includes(raw.encounter.outcome) && raw.encounter.elapsed >= 0);
    assert(raw.running === (raw.encounter.outcome === "fighting"));
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
    return g;
  }
  function validatePath(p) {
    assert(p && p.from && p.to && p.duration > 0 && Number.isFinite(p.height));
    for (const k of ["x", "y"]) assert(Number.isFinite(p.from[k]) && Number.isFinite(p.to[k]));
    assert(Number.isFinite(p.from.z));
  }
  var integer;
  var init_farm_state = __esm({
    "src/farm-state.js"() {
      init_farm_model();
      integer = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
    }
  });

  // src/version.js
  var PRODUCT_VERSION, COMPATIBILITY;
  var init_version = __esm({
    "src/version.js"() {
      PRODUCT_VERSION = "0.4.0";
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
    if (data.schema !== "budmori-farm" || typeof data.productVersion !== "string" || data.productVersion.split(".").slice(0, 2).join(".") !== COMPATIBILITY) throw Error("이 저장은 현재 " + COMPATIBILITY + " 버전과 호환되지 않습니다. 원본을 내보내 보관한 뒤 새 정원을 시작해 주세요.");
    return restore(data.world);
  }
  var KEY, MAX_BYTES, FarmStorage;
  var init_farm_storage = __esm({
    "src/farm-storage.js"() {
      init_version();
      init_farm_state();
      KEY = "bloom-weapon-cards-v3";
      MAX_BYTES = 2 * 1024 * 1024;
      FarmStorage = class {
        constructor() {
          this.raw = null;
          this.world = null;
          this.error = "";
          this.writable = false;
          try {
            this.raw = localStorage.getItem(KEY);
            if (this.raw) this.world = parseSave(this.raw);
            this.writable = true;
          } catch (e) {
            this.error = e.message;
          }
        }
        encode(world) {
          const data = snapshot(world);
          return JSON.stringify({ schema: "budmori-farm", productVersion: PRODUCT_VERSION, world: data });
        }
        save(world) {
          if (!this.writable) return false;
          try {
            const text = this.encode(world);
            const verified = restore(JSON.parse(text).world);
            localStorage.setItem(KEY, text);
            this.raw = text;
            this.world = verified;
            this.error = "";
            return true;
          } catch {
            this.error = "저장 공간을 사용할 수 없어요. 저장 내보내기로 보관해 주세요.";
            return false;
          }
        }
        replace(world) {
          this.writable = true;
          this.world = world;
          return this.save(world);
        }
        import(text) {
          const world = parseSave(text);
          localStorage.setItem(KEY, text);
          this.raw = text;
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

  // src/unit-art.js
  (function(global) {
    "use strict";
    const RangeUtil = { clamp: (v, a, b) => Math.max(a, Math.min(b, v)) };
    class HashUtil {
      static hash(s) {
        s = String(s);
        let h = 2166136261 >>> 0;
        for (let i = 0; i < s.length; i++) {
          h ^= s.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return h >>> 0;
      }
    }
    const RALLY_ART_CONFIG = {
      provenance: {
        "commit": "f9d4c28289d7b452a51b70d818fcb657eb4f4d47",
        "sourceFile": "Rally Frontier index.html",
        "sourceSha256": "47c2007a95bc42f948de58a8474b6cdeac024d305eeba18d28481b5ecea3d244",
        "speciesFunctions": {
          "swordsman": {
            "start": 26499,
            "end": 26513,
            "sha256": "8454a5d50ae65126f54ea381f8a5aef45bd0ba4d31e10799e2bd683a2a22a823"
          },
          "archer": {
            "start": 26526,
            "end": 26540,
            "sha256": "9bcf8e09484d5c015b71f22ece1a89252598d3516c454645e1d45c2b27e16c05"
          },
          "dandelion": {
            "start": 26597,
            "end": 26605,
            "sha256": "a19e307073b8fdd436abae8494185d31a73c49b6ee527a9697e1bce9cabc790a"
          },
          "skirmisher": {
            "start": 26541,
            "end": 26556,
            "sha256": "978bf1db0e1ca39afe216e7764137a1656095884816c30e79dc0bcc35aa2e464"
          },
          "tank": {
            "start": 26615,
            "end": 26628,
            "sha256": "69bcfec6fe4f2709084fa3663e4584135b9cf054f00df61e4e57f98b218d612d"
          },
          "medic": {
            "start": 26678,
            "end": 26689,
            "sha256": "3d40268f620a48e8b9f7d34486edf666e5e2d825638bc25c7f651c5ed131376e"
          },
          "mage": {
            "start": 26645,
            "end": 26660,
            "sha256": "b34644c11a6a9a82fa15193e374e5ddd3b4ecb257edb5944cb8cd681125b539e"
          },
          "rogue": {
            "start": 26629,
            "end": 26644,
            "sha256": "2f5316d6d7f8ce0bfdb6373883b4603db7884daa62a7d11fd9f5d867f75a789b"
          },
          "guardshroom": {
            "start": 26746,
            "end": 26753,
            "sha256": "6b4116b8de79c16b513600ccd25c0f315e5bef65de85a4a25ad85f66c47a2fb7"
          },
          "siege": {
            "start": 26899,
            "end": 26936,
            "sha256": "d89886c87121ffcf915875e93e3124e4674618ff1130978a3aedb69c0b6fce48"
          },
          "shelltitan": {
            "start": 26781,
            "end": 26808,
            "sha256": "e33d0d586fa001af097d9755b14735dc4c454857cfe5179f450fd9bd889e7450"
          },
          "shellbug": {
            "start": 26575,
            "end": 26584,
            "sha256": "312b44f284ce755a6947da91e8cb8d5e06c4a16f2459fa5316a40d3248440a8e"
          },
          "pikeman": {
            "start": 26514,
            "end": 26525,
            "sha256": "1fb1c14877d09e52320f00f4d0ac8715fc61ffb0be494be52fdf7a08601ca5ee"
          },
          "stingbug": {
            "start": 26585,
            "end": 26596,
            "sha256": "8f85b4d76bc58147db54ba60208b50f369789e8b1f31b8415c37d0efbf4075da"
          },
          "fireant": {
            "start": 25900,
            "end": 25927,
            "sha256": "d2adc22497a1cfd45f0c65e6bfb18eff89bddeb408a31a6248fdbcd238e0dedd"
          },
          "kickhopper": {
            "start": 26557,
            "end": 26574,
            "sha256": "064dd7ee80df1d672d046b908cc02a969337fd32ec49a1ffebaa2385707f024d"
          },
          "rootstalker": {
            "start": 26730,
            "end": 26738,
            "sha256": "9f5c403986f4258051bfb4d2230c8cac9ff33de60f89134e523bd2fdfa27a747"
          },
          "pillbug": {
            "start": 26708,
            "end": 26729,
            "sha256": "4d763eeb446b5edc2e2d9b4a29a6e224897f6cf7d1c79c0865169eadf0971424"
          },
          "mantis": {
            "start": 26690,
            "end": 26707,
            "sha256": "6ab6be016b0a115689b8638a9b6502c06bd83b2154140dd152ab0d287c71d4bd"
          },
          "clawhunter": {
            "start": 26762,
            "end": 26773,
            "sha256": "2b4977b96e7b8212ad9f2efb28123a2dbbff9addf1faf8d934b9862c31760afe"
          },
          "chainflower": {
            "start": 26739,
            "end": 26745,
            "sha256": "528d257417bf0f740486d90c16ebc12c0f42e80573902bb97f00d92703087c57"
          },
          "rocket": {
            "start": 26937,
            "end": 26954,
            "sha256": "48970cc31f314d77c0769d594cf360b1a21937a27f1f296e6506c3c10cd231cb"
          },
          "flowerbee": {
            "start": 27036,
            "end": 27050,
            "sha256": "8122dccaf45496fdd28b12d0a3eb1115b2b5fc66aa211182c8015b1a589afdb0"
          },
          "sporemoth": {
            "start": 27085,
            "end": 27093,
            "sha256": "0b9b79abfe5cec3464e539774bd7aae13c780b7c32aca1dfa1b38a0a3b02d8ee"
          }
        },
        "definitions": "13661–13774",
        "primitiveGeometry": "28069–28134",
        "airComposition": "31163–31180",
        "commonBody": "31252–31259",
        "drawPipeline": "31312–31451"
      },
      types: ["swordsman", "archer", "dandelion", "skirmisher", "tank", "medic", "mage", "flowerbee", "rogue", "guardshroom", "siege", "shelltitan", "shellbug", "pikeman", "stingbug", "fireant", "kickhopper", "rootstalker", "pillbug", "sporemoth", "mantis", "clawhunter", "chainflower", "rocket"],
      palettes: {
        "friendly": {
          "body": [
            0.18,
            0.43,
            0.93,
            1
          ],
          "dark": [
            0.07,
            0.19,
            0.46,
            1
          ],
          "light": [
            0.48,
            0.68,
            1,
            1
          ],
          "ring": [
            0.32,
            0.58,
            1,
            0.58
          ]
        },
        "enemy": {
          "body": [
            0.89,
            0.28,
            0.28,
            1
          ],
          "dark": [
            0.48,
            0.08,
            0.1,
            1
          ],
          "light": [
            1,
            0.55,
            0.55,
            1
          ],
          "ring": [
            1,
            0.35,
            0.35,
            0.58
          ]
        },
        "neutral": {
          "body": [
            0.48,
            0.35,
            0.22,
            1
          ],
          "dark": [
            0.25,
            0.18,
            0.12,
            1
          ],
          "light": [
            0.72,
            0.57,
            0.34,
            1
          ],
          "ring": [
            0.76,
            0.61,
            0.28,
            0.46
          ]
        }
      },
      units: {
        "swordsman": {
          "family": "leafblade",
          "shape": "seed",
          "crest": "leaf",
          "weapon": "leafblade",
          "accent": [
            0.52,
            0.82,
            0.31,
            1
          ],
          "fx": "melee",
          "size": 15,
          "tier": 1,
          "name": "칼잎 전사",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "archer": {
          "family": "seedbow",
          "facing": "full",
          "shape": "bud",
          "crest": "leaf",
          "weapon": "seedbow",
          "accent": [
            0.42,
            0.76,
            0.34,
            1
          ],
          "fx": "pierce",
          "size": 15,
          "tier": 1,
          "name": "씨앗궁수",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "dandelion": {
          "family": "t1-runner",
          "shape": "vehicle",
          "crest": "tuft",
          "weapon": "body",
          "accent": [
            0.92,
            0.94,
            0.72,
            1
          ],
          "fx": "melee",
          "size": 10,
          "tier": 1,
          "name": "민들레 주자",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "skirmisher": {
          "family": "spore-gunner",
          "facing": "full",
          "shape": "pod",
          "crest": "coil",
          "weapon": "spore-pod",
          "accent": [
            0.32,
            0.86,
            0.72,
            1
          ],
          "fx": "bullet",
          "size": 10,
          "tier": 1,
          "name": "포자사수",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "tank": {
          "family": "shell-guardian",
          "shape": "shell",
          "crest": "shield",
          "weapon": "shell",
          "accent": [
            0.58,
            0.76,
            0.34,
            1
          ],
          "fx": "guard",
          "size": 20,
          "tier": 2,
          "name": "껍질수호자",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "medic": {
          "family": "dew-healer",
          "shape": "petal",
          "crest": "leaf",
          "weapon": "dew",
          "accent": [
            0.42,
            0.9,
            0.65,
            1
          ],
          "fx": "heal",
          "size": 10,
          "tier": 2,
          "name": "이슬치유사",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "mage": {
          "family": "burst-flower",
          "shape": "petal",
          "crest": "orb",
          "weapon": "pollen",
          "accent": [
            0.82,
            0.46,
            0.88,
            1
          ],
          "fx": "magic",
          "size": 15,
          "tier": 2,
          "name": "폭발꽃",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "flowerbee": {
          "family": "air-bee",
          "shape": "bug",
          "crest": "petal",
          "weapon": "sting",
          "accent": [
            0.96,
            0.72,
            0.24,
            1
          ],
          "fx": "air",
          "size": 10,
          "tier": 1,
          "name": "꽃벌",
          "layer": "AIR",
          "visualScale": 1.08
        },
        "lancer": { family: "stag-rider", facing: "full", shape: "beetle", crest: "horn", weapon: "mandible", accent: [0.94, 0.64, 0.24, 1], fx: "pierce", size: 15, tier: 2, name: "왕사슴 돌격대", layer: "GROUND", visualScale: 1.08 },
        "rogue": {
          "family": "shadow-flea",
          "facing": "full",
          "shape": "bug",
          "crest": "leaf",
          "weapon": "forelegs",
          "accent": [
            0.72,
            0.64,
            0.28,
            1
          ],
          "fx": "slash",
          "size": 10,
          "tier": 2,
          "name": "그림자벼룩",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "guardshroom": {
          "family": "support",
          "shape": "mushroom",
          "crest": "cap",
          "weapon": "aura",
          "accent": [
            0.72,
            0.48,
            0.92,
            1
          ],
          "fx": "guard",
          "size": 15,
          "tier": 2,
          "name": "수호버섯",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "siege": {
          "family": "seed-artillery",
          "facing": "full",
          "shape": "rooted-pod",
          "crest": "seed",
          "weapon": "seed-cannon",
          "accent": [
            0.88,
            0.7,
            0.28,
            1
          ],
          "fx": "heavy",
          "size": 20,
          "tier": 3,
          "name": "철갑씨앗포",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "shelltitan": {
          "family": "ancient-shell-colossus",
          "facing": "full",
          "shape": "massive-carapace",
          "crest": "small-head",
          "weapon": "body-slam",
          "accent": [
            0.78,
            0.64,
            0.34,
            1
          ],
          "fx": "heavy",
          "size": 35,
          "tier": 3,
          "name": "고대껍질 거신",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "shellbug": {
          "family": "t1-shell",
          "shape": "vehicle",
          "crest": "shell",
          "weapon": "body",
          "accent": [
            0.62,
            0.76,
            0.37,
            1
          ],
          "fx": "guard",
          "size": 15,
          "tier": 1,
          "name": "껍질딱정벌레",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "pikeman": {
          "family": "thorn-reed",
          "facing": "full",
          "shape": "sprout",
          "crest": "spear",
          "weapon": "thorn-stem",
          "accent": [
            0.72,
            0.88,
            0.42,
            1
          ],
          "fx": "pierce",
          "size": 15,
          "tier": 1,
          "name": "가시창풀",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "stingbug": {
          "family": "t1-sting",
          "shape": "vehicle",
          "crest": "stinger",
          "weapon": "stinger",
          "accent": [
            0.88,
            0.72,
            0.28,
            1
          ],
          "fx": "pierce",
          "size": 10,
          "tier": 1,
          "name": "침벌레",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "fireant": {
          "commonGroundBody": false,
          "family": "fire-ant",
          "facing": "full",
          "shape": "bug",
          "crest": "antenna",
          "weapon": "acid-gland",
          "accent": [
            0.88,
            0.3,
            0.12,
            1
          ],
          "fx": "pierce",
          "size": 10,
          "tier": 1,
          "name": "불개미",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "kickhopper": {
          "family": "t1-kickhopper",
          "shape": "bug",
          "crest": "hopper",
          "weapon": "hindlegs",
          "accent": [
            0.76,
            0.88,
            0.3,
            1
          ],
          "fx": "melee",
          "size": 10,
          "tier": 1,
          "name": "방아깨비",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "rootstalker": {
          "family": "controller",
          "shape": "bulb",
          "crest": "root",
          "weapon": "spikes",
          "accent": [
            0.66,
            0.43,
            0.2,
            1
          ],
          "fx": "pierce",
          "size": 15,
          "tier": 2,
          "name": "뿌리가시",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "pillbug": {
          "family": "controller",
          "shape": "round",
          "crest": "coil",
          "weapon": "bomb",
          "accent": [
            0.9,
            0.66,
            0.24,
            1
          ],
          "fx": "heavy",
          "size": 15,
          "tier": 2,
          "name": "폭낭 콩벌레",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "sporemoth": {
          "family": "air-bomber",
          "shape": "petal",
          "crest": "spore",
          "weapon": "bomb",
          "accent": [
            0.72,
            0.52,
            0.84,
            1
          ],
          "fx": "air",
          "size": 15,
          "tier": 2,
          "name": "포자나방",
          "layer": "AIR",
          "visualScale": 1.08
        },
        "mantis": {
          "family": "veil-mantis",
          "shape": "leaf",
          "crest": "mantis",
          "weapon": "scythes",
          "accent": [
            0.47,
            0.94,
            0.43,
            1
          ],
          "fx": "ambush",
          "size": 10,
          "tier": 2,
          "name": "베일 사마귀",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "clawhunter": {
          "family": "controller",
          "shape": "round",
          "crest": "claw",
          "weapon": "claw",
          "accent": [
            0.94,
            0.58,
            0.28,
            1
          ],
          "fx": "pull",
          "size": 15,
          "tier": 2,
          "name": "집게사냥꾼",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "chainflower": {
          "family": "caster",
          "shape": "petal",
          "crest": "arc",
          "weapon": "chain",
          "accent": [
            0.62,
            0.86,
            1,
            1
          ],
          "fx": "magic",
          "size": 15,
          "tier": 2,
          "name": "연쇄꽃",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "rocket": {
          "family": "firework-flower",
          "facing": "full",
          "shape": "flower-pod",
          "crest": "bloom",
          "weapon": "firework-seeds",
          "accent": [
            1,
            0.5,
            0.3,
            1
          ],
          "fx": "heavy",
          "size": 20,
          "tier": 3,
          "name": "다연발 봉선화",
          "layer": "GROUND",
          "visualScale": 1.08
        }
      },
      limits: { thumbnailCacheEntries: 96, meshCacheMeshes: 384, meshCacheBytes: 24 * 1024 * 1024 },
      commonBody: { ink: [0.07, 0.1, 0.13, 1], outerRadius: 0.78, outerY: 0.12, bodyRadius: 0.68, bodyY: 0.08, highlightRadius: 0.25, highlightX: -0.18, highlightY: -0.04 },
      deployment: { deployMs: 900, undeployMs: 450 }
    };
    const UNIT_VISUAL_RENDER_FNS = Object.freeze({
      "lancer": (rdr, ctx) => {
        const { sc, x, y, r, team, teamDark, accent, attack, dir } = ctx;
        {
          rdr.circle(x, y + r * 0.14, r * 0.8, [0.2, 0.16, 0.12, 1], 13);
          rdr.poly([[x - r * 0.66, y - r * 0.06], [x, y - r * 0.58], [x + r * 0.66, y - r * 0.06], [x + r * 0.52, y + r * 0.48], [x - r * 0.52, y + r * 0.48]], teamDark);
          rdr.circle(x, y - r * 0.5, r * 0.34, [0.31, 0.22, 0.12, 1], 10);
          const charge = attack ? r * 0.34 : 0;
          rdr.line(x - r * 0.18, y - r * 0.66, x - r * 0.58, y + dir * (r * 1.55 + charge), Math.max(2, 3.4 * sc), accent);
          rdr.line(x + r * 0.18, y - r * 0.66, x + r * 0.58, y + dir * (r * 1.55 + charge), Math.max(2, 3.4 * sc), accent);
          rdr.crestTriangle(x - r * 0.6, y + dir * (r * 1.62 + charge), r * 0.2, accent, dir < 0 ? -Math.PI / 2 : Math.PI / 2);
          rdr.crestTriangle(x + r * 0.6, y + dir * (r * 1.62 + charge), r * 0.2, accent, dir < 0 ? -Math.PI / 2 : Math.PI / 2);
          rdr.circle(x, y - r * 0.88, r * 0.22, team, 9);
        }
      },
      "swordsman": (rdr, ctx) => {
        const { sc, x, y, r, attack, dir } = ctx;
        {
          const slash = attack ? r * 0.32 : 0;
          rdr.petalRing(x - r * 0.48, y + r * 0.05, r * 0.26, 3, [0.38, 0.68, 0.28, 1], -0.3, 0.58);
          rdr.poly([
            [x + r * 0.28, y + r * 0.12],
            [x + r * 0.7, y + dir * r * 0.18],
            [x + r * 1.34, y + dir * (r * 0.82 + slash)],
            [x + r * 0.92, y + dir * (r * 0.95 + slash)],
            [x + r * 0.4, y + dir * r * 0.22]
          ], [0.48, 0.8, 0.32, 1]);
          rdr.line(x + r * 0.44, y + dir * r * 0.18, x + r * 1.14, y + dir * (r * 0.72 + slash), Math.max(1, 1.6 * sc), [0.24, 0.52, 0.2, 1]);
        }
      },
      "archer": (rdr, ctx) => {
        const { sc, x, y, r, attack, dir } = ctx;
        {
          rdr.poly([[x + r * 0.35, y - r * 0.68], [x + r * 0.83, y - r * 0.36], [x + r * 0.63, y - r * 0.06], [x + r * 0.28, y - r * 0.28]], [0.36, 0.66, 0.28, 1]);
          rdr.poly([[x + r * 0.35, y + r * 0.68], [x + r * 0.83, y + r * 0.36], [x + r * 0.63, y + r * 0.06], [x + r * 0.28, y + r * 0.28]], [0.36, 0.66, 0.28, 1]);
          rdr.line(x + r * 0.8, y - r * 0.34, x + r * 0.8, y + r * 0.34, Math.max(1, 1.4 * sc), [0.78, 0.84, 0.55, 1]);
          rdr.circle(x + r * 0.76, y, r * 0.1, [0.74, 0.58, 0.25, 1], 8);
          if (attack) {
            rdr.line(x + r * 0.78, y, x + r * 1.48, y + dir * r * 0.06, Math.max(1.1, 1.6 * sc), [0.53, 0.39, 0.18, 1]);
            rdr.circle(x + r * 1.52, y + dir * r * 0.06, r * 0.09, [0.82, 0.65, 0.3, 1], 8);
          }
        }
      },
      "dandelion": (rdr, ctx) => {
        const { sc, x, y, r, team, accent, motion } = ctx;
        {
          rdr.circle(x, y + r * 0.16, r * 0.4, team, 10);
          rdr.part("spokes", () => {
            for (let k = 0; k < 9; k++) {
              const a = k * Math.PI * 2 / 9;
              rdr.line(x, y - r * 0.3, x + Math.cos(a) * r * 0.72, y - r * 0.3 + Math.sin(a) * r * 0.72, Math.max(1, 1.3 * sc), [0.94, 0.95, 0.82, 0.9]);
            }
          }, motion.parts.spokes);
          rdr.circle(x, y - r * 0.3, r * 0.13, accent, 8);
        }
      },
      "skirmisher": (rdr, ctx) => {
        const { x, y, r, accent, attack, dir } = ctx;
        {
          rdr.circle(x - r * 0.38, y - r * 0.08, r * 0.38, [0.3, 0.64, 0.48, 1], 11);
          rdr.circle(x - r * 0.48, y - r * 0.2, r * 0.13, [0.68, 0.92, 0.6, 1], 8);
          rdr.circle(x - r * 0.28, y + r * 0.12, r * 0.11, [0.68, 0.92, 0.6, 1], 8);
          rdr.poly([[x + r * 0.25, y - r * 0.15], [x + r * 0.92, y - r * 0.22], [x + r * 1.18, y], [x + r * 0.92, y + r * 0.22], [x + r * 0.25, y + r * 0.15]], [0.28, 0.58, 0.42, 1]);
          rdr.circle(x + r * 1.2, y, r * 0.12, accent, 8);
          if (attack) {
            rdr.circle(x + r * 1.5, y + dir * r * 0.04, r * 0.14, [0.62, 1, 0.72, 0.5], 8);
            rdr.circle(x + r * 1.72, y + dir * r * 0.06, r * 0.07, [0.82, 1, 0.86, 0.7], 7);
          }
        }
      },
      "tank": (rdr, ctx) => {
        const { x, y, r, team, teamDark } = ctx;
        {
          rdr.circle(x, y + r * 0.06, r * 0.92, [0.24, 0.34, 0.18, 1], 14);
          for (let k = -2; k <= 2; k++) {
            const ox = k * r * 0.24;
            rdr.poly([[x + ox - r * 0.2, y - r * 0.66], [x + ox + r * 0.2, y - r * 0.66], [x + ox + r * 0.28, y + r * 0.46], [x + ox - r * 0.28, y + r * 0.46]], k % 2 ? teamDark : [0.48, 0.62, 0.3, 1]);
          }
          rdr.circle(x, y - r * 0.3, r * 0.28, team, 10);
          rdr.circle(x + r * 0.08, y - r * 0.35, r * 0.07, [0.9, 0.94, 0.66, 1], 7);
        }
      },
      "medic": (rdr, ctx) => {
        const { sc, x, y, r, team } = ctx;
        {
          rdr.petalRing(x, y + r * 0.04, r * 0.55, 6, [0.42, 0.76, 0.48, 1], Math.PI / 6, 0.7);
          rdr.circle(x, y - r * 0.34, r * 0.38, team, 11);
          rdr.circle(x + r * 0.56, y - r * 0.3, r * 0.25, [0.52, 0.96, 0.82, 0.62], 10);
          rdr.circle(x + r * 0.49, y - r * 0.39, r * 0.08, [0.9, 1, 0.96, 0.85], 8);
          rdr.line(x + r * 0.28, y - r * 0.12, x + r * 0.48, y - r * 0.26, Math.max(1.4, 2.1 * sc), [0.28, 0.62, 0.44, 1]);
        }
      },
      "mage": (rdr, ctx) => {
        const { x, y, r, team, attack, motion } = ctx;
        {
          rdr.petalRing(x, y - r * 0.08, r * 0.72, 8, [0.68, 0.35, 0.78, 1], Math.PI / 8, 0.76);
          rdr.circle(x, y - r * 0.08, r * 0.36, team, 12);
          const orb = r * (attack ? 0.34 : 0.22);
          rdr.circle(x, y - r * 0.12, orb, [0.92, 0.62, 1, 1], 10);
          rdr.circle(x, y - r * 0.12, orb * 1.9, [0.86, 0.46, 1, 0.14], 12);
          for (let k = 0; k < 4; k++) {
            rdr.part("orb-" + k, () => rdr.circle(x, y - r * 0.08, r * 0.07, [0.94, 0.78, 1, 0.6], 7), motion.parts["orb-" + k]);
          }
        }
      },
      "rogue": (rdr, ctx) => {
        const { sc, x, y, r, teamDark, accent, attack, dir } = ctx;
        {
          rdr.circle(x, y + r * 0.06, r * 0.5, teamDark, 11);
          rdr.circle(x, y - r * 0.4, r * 0.3, [0.24, 0.28, 0.18, 1], 9);
          rdr.line(x - r * 0.26, y + r * 0.22, x - r * 0.92, y + r * 0.74, Math.max(2, 3.2 * sc), teamDark);
          rdr.line(x + r * 0.26, y + r * 0.22, x + r * 0.92, y + r * 0.74, Math.max(2, 3.2 * sc), teamDark);
          const stab = attack ? r * 0.3 : 0;
          rdr.line(x - r * 0.2, y - r * 0.2, x - r * 0.9, y + dir * (r * 0.7 + stab), Math.max(1.5, 2.4 * sc), accent);
          rdr.line(x + r * 0.2, y - r * 0.2, x + r * 0.9, y + dir * (r * 0.7 + stab), Math.max(1.5, 2.4 * sc), accent);
          rdr.circle(x - r * 0.11, y - r * 0.44, r * 0.055, [0.9, 0.82, 0.28, 1], 6);
          rdr.circle(x + r * 0.11, y - r * 0.44, r * 0.055, [0.9, 0.82, 0.28, 1], 6);
        }
      },
      "guardshroom": (rdr, ctx) => {
        const { x, y, r, accent } = ctx;
        {
          rdr.circle(x, y + r * 0.28, r * 0.58, [0.72, 0.67, 0.54, 1], 12);
          rdr.circle(x, y - r * 0.34, r * 0.8, accent, 14);
          rdr.circle(x - r * 0.24, y - r * 0.42, r * 0.12, [1, 0.92, 0.78, 0.55], 8);
          rdr.circle(x + r * 0.18, y - r * 0.18, r * 0.1, [1, 0.92, 0.78, 0.45], 8);
        }
      },
      "siege": (rdr, ctx) => {
        const { sc, x, y, r, teamDark, accent, attack, motion } = ctx;
        const ease = motion.ease, drop = r * 0.3 * ease;
        const cannonAngle = -Math.PI / 2, anchorBase = cannonAngle + Math.PI / 3;
        for (let i = 0; i < 3; i++) {
          const a = anchorBase + i * Math.PI * 2 / 3, ca = Math.cos(a), sa = Math.sin(a), rootR = r * (0.42 + 0.08 * ease), footR = r * (0.68 + 0.82 * ease), sx = x + ca * rootR, sy = y - drop + sa * rootR * 0.72, ex = x + ca * footR, ey = y - drop + sa * footR * 0.72;
          rdr.part("hull-leg-" + i, () => {
            rdr.line(sx, sy, ex, ey, Math.max(2.8, 4.5 * sc), [0.25, 0.31, 0.15, 1]);
            rdr.circle(ex, ey, r * (0.12 + 0.17 * ease), [0.31, 0.22, 0.1, 1], 10);
          }, motion.parts["hull-leg-" + i]);
          rdr.part("hull-detail-" + i, () => {
            const tx = -sa, ty = ca * 0.72;
            rdr.line(ex, ey, ex + tx * r * 0.25, ey + ty * r * 0.25, Math.max(1.4, 2.2 * sc), [0.38, 0.25, 0.11, 0.88]);
            rdr.line(ex, ey, ex - tx * r * 0.25, ey - ty * r * 0.25, Math.max(1.4, 2.2 * sc), [0.38, 0.25, 0.11, 0.88]);
          }, motion.parts["hull-detail-" + i]);
        }
        rdr.part("hull-body", () => {
          rdr.circle(x, y + r * 0.08 - drop, r * (0.76 + 0.1 * ease), [0.32, 0.36, 0.2, 1], 14);
          rdr.circle(x, y - r * 0.05 - drop, r * 0.54, teamDark, 12);
        }, motion.parts["hull-body"]);
        const turretPivotX = x, turretPivotY = y - r * 0.08 - drop;
        rdr.part("turret", () => {
          const cx = turretPivotX, cy = turretPivotY;
          rdr.circle(cx, cy, r * 0.6, [0.46, 0.48, 0.22, 1], 14);
          rdr.circle(cx, cy, r * 0.34, [0.3, 0.34, 0.17, 1], 12);
          rdr.poly([[cx - r * 0.48, cy + r * 0.14], [cx - r * 0.34, cy - r * 0.4], [cx + r * 0.34, cy - r * 0.4], [cx + r * 0.48, cy + r * 0.14]], [0.39, 0.43, 0.2, 1]);
          rdr.circle(cx - r * 0.34, cy - r * 0.1, r * 0.15, [0.7, 0.58, 0.25, 1], 9);
          rdr.circle(cx + r * 0.34, cy - r * 0.1, r * 0.15, [0.7, 0.58, 0.25, 1], 9);
          rdr.poly([[cx - r * 0.32, cy + r * 0.16], [cx - r * 0.25, cy + r * 0.54], [cx + r * 0.25, cy + r * 0.54], [cx + r * 0.32, cy + r * 0.16]], [0.29, 0.34, 0.17, 1]);
          const kick = attack ? r * 0.22 : 0, barrelLen = r * (1.5 + 1.05 * ease) - kick;
          rdr.line(cx, cy - r * 0.12, cx, cy - barrelLen, Math.max(3.2, 5.6 * sc), [0.34, 0.54, 0.23, 1]);
          rdr.circle(cx, cy - r * (1.02 + 1.02 * ease), r * 0.22, [0.7, 0.58, 0.25, 1], 10);
          rdr.circle(cx, cy - barrelLen, r * 0.2, accent, 10);
        }, motion.parts.turret);
        rdr.part("deployment-halo", () => rdr.outlineCircle(x, y + r * 0.22, r * (0.7 + 0.78 * ease), Math.max(1.4, 2.2 * sc), [0.48, 0.32, 0.14, 0.48], 20, 1), motion.parts["deployment-halo"]);
      },
      "shelltitan": (rdr, ctx) => {
        const { sc, x, y, r, attack, motion } = ctx;
        {
          const shell = [0.47, 0.38, 0.23, 1], shellDark = [0.27, 0.25, 0.17, 1], ridge = [0.67, 0.55, 0.31, 1], head = [0.63, 0.51, 0.29, 1], antenna = [0.76, 0.63, 0.35, 1];
          rdr.circle(x, y + r * 0.1, r * 1.04, shellDark, 18);
          rdr.poly([[x, y - r * 0.86], [x - r * 0.48, y - r * 0.75], [x - r * 0.82, y - r * 0.43], [x - r * 0.96, y + r * 0.04], [x - r * 0.78, y + r * 0.55], [x - r * 0.36, y + r * 0.84], [x, y + r * 0.92], [x + r * 0.36, y + r * 0.84], [x + r * 0.78, y + r * 0.55], [x + r * 0.96, y + r * 0.04], [x + r * 0.82, y - r * 0.43], [x + r * 0.48, y - r * 0.75]], shell);
          rdr.line(x, y - r * 0.72, x, y + r * 0.72, Math.max(1.6, 2.6 * sc), shellDark);
          for (const [ox, oy, sz] of [[-0.4, -0.34, 0.085], [0.4, -0.34, 0.085], [-0.46, 0.02, 0.095], [0.46, 0.02, 0.095], [-0.36, 0.4, 0.075], [0.36, 0.4, 0.075]]) {
            rdr.circle(x + ox * r, y + oy * r, r * sz, ridge, 8);
          }
          rdr.poly([[x, y - r * 0.78], [x - r * 0.2, y - r * 0.72], [x - r * 0.25, y - r * 0.94], [x, y - r * 1.16], [x + r * 0.25, y - r * 0.94], [x + r * 0.2, y - r * 0.72]], head);
          rdr.line(x - r * 0.11, y - r * 1.02, x - r * 0.27, y - r * 1.24, Math.max(1.1, 1.7 * sc), antenna);
          rdr.line(x + r * 0.11, y - r * 1.02, x + r * 0.27, y - r * 1.24, Math.max(1.1, 1.7 * sc), antenna);
          rdr.circle(x - r * 0.28, y - r * 1.26, r * 0.05, antenna, 7);
          rdr.circle(x + r * 0.28, y - r * 1.26, r * 0.05, antenna, 7);
          if (attack) {
            rdr.part("attack-aura", () => rdr.circle(x, y + r * 0.08, r * (1.02 + 0.13 * motion.attackPhase), [1, 0.76, 0.3, 0.09], 20), motion.parts["attack-aura"]);
          }
        }
      },
      "shellbug": (rdr, ctx) => {
        const { sc, x, y, r, teamDark, accent } = ctx;
        {
          rdr.circle(x, y + r * 0.1, r * 0.82, [0.34, 0.45, 0.22, 1], 12);
          rdr.poly([[x - r * 0.72, y - r * 0.1], [x - r * 0.42, y - r * 0.62], [x, y - r * 0.78], [x + r * 0.42, y - r * 0.62], [x + r * 0.72, y - r * 0.1], [x + r * 0.52, y + r * 0.4], [x - r * 0.52, y + r * 0.4]], teamDark);
          rdr.line(x, y - r * 0.68, x, y + r * 0.3, Math.max(1.3, 2 * sc), accent);
        }
      },
      "pikeman": (rdr, ctx) => {
        const { sc, x, y, r, accent, attack, dir } = ctx;
        {
          const thrust = attack ? r * 0.38 : 0;
          rdr.line(x + r * 0.08, y + r * 0.12, x + r * 0.08, y + dir * (r * 2.18 + thrust), Math.max(2, 3.2 * sc), [0.3, 0.55, 0.22, 1]);
          rdr.poly([[x - r * 0.02, y + dir * r * 0.86], [x - r * 0.35, y + dir * r * 0.58], [x - r * 0.08, y + dir * r * 0.42]], accent);
          rdr.poly([[x + r * 0.18, y + dir * r * 1.28], [x + r * 0.48, y + dir * r * 1.02], [x + r * 0.18, y + dir * r * 0.9]], accent);
          rdr.crestTriangle(x + r * 0.08, y + dir * (r * 2.34 + thrust), r * 0.25, [0.78, 0.88, 0.55, 1], dir < 0 ? -Math.PI / 2 : Math.PI / 2);
        }
      },
      "stingbug": (rdr, ctx) => {
        const { sc, x, y, r, team, teamDark, accent, attack, dir } = ctx;
        {
          rdr.circle(x - r * 0.12, y + r * 0.1, r * 0.54, team, 11);
          rdr.circle(x + r * 0.44, y - r * 0.04, r * 0.32, teamDark, 9);
          rdr.line(x - r * 0.18, y + r * 0.3, x - r * 0.78, y + r * 0.62, Math.max(1.2, 1.8 * sc), teamDark);
          rdr.line(x + r * 0.14, y + r * 0.3, x + r * 0.74, y + r * 0.62, Math.max(1.2, 1.8 * sc), teamDark);
          const jab = attack ? r * 0.3 : 0;
          rdr.line(x + r * 0.58, y, x + r * 1.38 + jab, y + dir * r * 0.06, Math.max(1.5, 2.3 * sc), accent);
          rdr.crestTriangle(x + r * 1.46 + jab, y + dir * r * 0.06, r * 0.18, accent, 0);
        }
      },
      "fireant": (rdr, ctx) => {
        const { sc, x, y, r, ownStealthAlpha, teamDark, teamLight, dir } = ctx;
        {
          const antDark = [0.2, 0.055, 0.025, ownStealthAlpha], antBody = [0.66, 0.12, 0.045, ownStealthAlpha], antHot = [1, 0.34, 0.07, ownStealthAlpha], antGlow = [1, 0.72, 0.18, 0.72 * ownStealthAlpha];
          const facing = dir, headY = y + facing * r * 0.54, thoraxY = y, abdY = y - facing * r * 0.58;
          rdr.circle(x, abdY, r * 0.48, antDark, 11);
          rdr.circle(x, abdY, r * 0.39, antBody, 11);
          rdr.circle(x, thoraxY, r * 0.34, teamDark, 10);
          rdr.circle(x, thoraxY, r * 0.27, antBody, 10);
          rdr.circle(x, headY, r * 0.31, antDark, 10);
          rdr.circle(x, headY, r * 0.24, antBody, 10);
          for (const side of [-1, 1]) {
            rdr.line(x + side * r * 0.16, y + facing * r * 0.18, x + side * r * 0.72, y + facing * r * 0.42, Math.max(1, 1.45 * sc), antDark);
            rdr.line(x + side * r * 0.18, y, x + side * r * 0.78, y - facing * r * 0.02, Math.max(1, 1.45 * sc), antDark);
            rdr.line(x + side * r * 0.14, y - facing * r * 0.22, x + side * r * 0.68, y - facing * r * 0.48, Math.max(1, 1.45 * sc), antDark);
            rdr.line(x + side * r * 0.12, headY + facing * r * 0.12, x + side * r * 0.45, headY + facing * r * 0.55, Math.max(1, 1.15 * sc), antDark);
          }
          rdr.circle(x, abdY - facing * r * 0.08, r * 0.16, antHot, 8);
          rdr.circle(x, abdY - facing * r * 0.08, r * 0.08, antGlow, 7);
          rdr.outlineCircle(x, thoraxY, r * 0.39, Math.max(1, 1.5 * sc), teamLight, 12, 1);
        }
      },
      "kickhopper": (rdr, ctx) => {
        const { sc, x, y, r, teamLight, accent, attack, dir } = ctx;
        {
          rdr.circle(x, y + r * 0.02, r * 0.58, [0.46, 0.62, 0.2, 1], 12);
          rdr.circle(x, y - r * 0.42, r * 0.32, teamLight, 10);
          rdr.line(x - r * 0.2, y + r * 0.26, x - r * 0.72, y + r * 0.74, Math.max(2, 3.2 * sc), [0.38, 0.5, 0.16, 1]);
          rdr.line(x + r * 0.2, y + r * 0.26, x + r * 0.72, y + r * 0.74, Math.max(2, 3.2 * sc), [0.38, 0.5, 0.16, 1]);
          const kick = attack ? r * 0.52 : 0;
          rdr.line(x - r * 0.72, y + r * 0.74, x - r * 1.1, y + dir * (r * 0.58 + kick), Math.max(2.2, 3.8 * sc), accent);
          rdr.line(x + r * 0.72, y + r * 0.74, x + r * 1.1, y + dir * (r * 0.58 + kick), Math.max(2.2, 3.8 * sc), accent);
          rdr.circle(x - r * 1.12, y + dir * (r * 0.6 + kick), r * 0.11, [0.92, 0.96, 0.58, 1], 8);
          rdr.circle(x + r * 1.12, y + dir * (r * 0.6 + kick), r * 0.11, [0.92, 0.96, 0.58, 1], 8);
          rdr.line(x - r * 0.16, y - r * 0.58, x - r * 0.42, y - r * 0.88, Math.max(1, 1.5 * sc), [0.3, 0.4, 0.15, 1]);
          rdr.line(x + r * 0.16, y - r * 0.58, x + r * 0.42, y - r * 0.88, Math.max(1, 1.5 * sc), [0.3, 0.4, 0.15, 1]);
        }
      },
      "rootstalker": (rdr, ctx) => {
        const { sc, x, y, r, ownStealthAlpha, accent } = ctx;
        {
          rdr.circle(x, y + r * 0.14, r * 0.72, [0.43, 0.31, 0.18, 1], 12);
          for (let k = 0; k < 5; k++) {
            const a = -Math.PI * 0.85 + k * 0.42;
            rdr.line(x, y + r * 0.15, x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95, Math.max(1.5, 2.2 * sc), [0.36, 0.23, 0.12, 1]);
          }
          rdr.circle(x, y - r * 0.34, r * 0.32, [0.5, 0.34, 0.18, ownStealthAlpha], 10);
          rdr.crestTriangle(x, y - r * 0.82, r * 0.2, accent, -Math.PI / 2);
        }
      },
      "pillbug": (rdr, ctx) => {
        const { sc, x, y, r, team, teamDark, accent, attack, dir, motion } = ctx;
        {
          rdr.circle(x, y, r * 0.88, [0.13, 0.16, 0.18, 1], 14);
          rdr.circle(x, y, r * 0.76, team, 14);
          rdr.part("radial", () => {
            for (let k = 0; k < 6; k++) {
              const a = k * Math.PI / 3;
              rdr.line(
                x + Math.cos(a) * r * 0.18,
                y + Math.sin(a) * r * 0.18,
                x + Math.cos(a) * r * 0.72,
                y + Math.sin(a) * r * 0.72,
                Math.max(1.3, 2.2 * sc),
                teamDark
              );
            }
          }, motion.parts.radial);
          rdr.part("pulse", () => rdr.circle(x + r * 0.62, y + dir * r * 0.14, r * 0.26, accent, 10), motion.parts.pulse);
          rdr.circle(x + r * 0.68, y + dir * r * 0.1, r * 0.1, [1, 0.94, 0.72, 1], 8);
          if (attack) rdr.circle(x, y, r * 1.08, [1, 0.66, 0.22, 0.12], 16);
        }
      },
      "mantis": (rdr, ctx) => {
        const { own, sc, x, y, r, cloaked, accent, attack, dir } = ctx;
        {
          rdr.poly([
            [x - r * 0.88, y + r * 0.42],
            [x - r * 0.42, y - r * 0.38],
            [x, y - r * 0.78],
            [x + r * 0.42, y - r * 0.38],
            [x + r * 0.88, y + r * 0.42],
            [x, y + r * 0.7]
          ], [0.26, 0.58, 0.28, own && cloaked ? 0.24 : 1]);
          const cut = attack ? r * 0.34 : 0;
          rdr.line(x - r * 0.3, y - r * 0.02, x - r * 1.14, y + dir * (r * 0.7 + cut), Math.max(1.8, 2.8 * sc), accent);
          rdr.line(x + r * 0.3, y - r * 0.02, x + r * 1.14, y + dir * (r * 0.7 + cut), Math.max(1.8, 2.8 * sc), accent);
          rdr.crestTriangle(x - r * 1.2, y + dir * (r * 0.78 + cut), r * 0.18, accent, dir < 0 ? -Math.PI / 2 : Math.PI / 2);
          rdr.crestTriangle(x + r * 1.2, y + dir * (r * 0.78 + cut), r * 0.18, accent, dir < 0 ? -Math.PI / 2 : Math.PI / 2);
        }
      },
      "clawhunter": (rdr, ctx) => {
        const { sc, x, y, r, ownStealthAlpha, team, accent, attack, dir } = ctx;
        {
          rdr.circle(x, y + r * 0.08, r * 0.72, team, 12);
          rdr.circle(x, y - r * 0.38, r * 0.36, [0.48, 0.25, 0.12, ownStealthAlpha], 10);
          const reach = attack ? r * 0.32 : 0;
          rdr.line(x - r * 0.3, y, x - r * 1.15, y + dir * (r * 0.36 + reach), Math.max(2, 3.4 * sc), accent);
          rdr.line(x + r * 0.3, y, x + r * 1.15, y + dir * (r * 0.36 + reach), Math.max(2, 3.4 * sc), accent);
          rdr.crestTriangle(x - r * 1.2, y + dir * (r * 0.4 + reach), r * 0.24, accent, dir < 0 ? -Math.PI / 2 : Math.PI / 2);
          rdr.crestTriangle(x + r * 1.2, y + dir * (r * 0.4 + reach), r * 0.24, accent, dir < 0 ? -Math.PI / 2 : Math.PI / 2);
        }
      },
      "chainflower": (rdr, ctx) => {
        const { x, y, r, team, accent } = ctx;
        {
          rdr.petalRing(x, y, r * 0.58, 7, accent, Math.PI / 7, 0.72);
          rdr.circle(x, y - r * 0.12, r * 0.36, team, 12);
          rdr.circle(x, y - r * 0.12, r * 0.16, [0.86, 0.96, 1, 1], 10);
        }
      },
      "rocket": (rdr, ctx) => {
        const { sc, x, y, r, teamDark, attack } = ctx;
        rdr.petalRing(x, y + r * 0.16, r * 0.86, 7, [0.38, 0.48, 0.24, 1], Math.PI / 7, 0.72);
        rdr.circle(x, y + r * 0.12, r * 0.6, teamDark, 12);
        const pods = [[-0.48, -0.18], [0.48, -0.18], [-0.28, -0.72], [0.28, -0.72]];
        for (let i = 0; i < 4; i++) {
          const [ox, oy] = pods[i], px = x + ox * r, py = y + oy * r;
          const pulse = attack ? 0.06 + (i + 1) * 0.025 : 0;
          rdr.circle(px, py, r * (0.25 + pulse), [0.58, 0.66, 0.25, 1], 10);
          rdr.petalRing(px, py - r * 0.02, r * (0.18 + pulse), 4, [1, 0.48, 0.3, 1], Math.PI / 4, 0.48);
          rdr.circle(px, py - r * 0.08, r * 0.09, [1, 0.86, 0.38, 1], 8);
          rdr.line(px, py - r * 0.08, px, py - r * (0.42 + (attack ? 0.08 : 0)), Math.max(1.8, 2.7 * sc), [0.42, 0.58, 0.24, 1]);
        }
        if (attack) rdr.circle(x, y - r * 0.28, r * 1.08, [1, 0.52, 0.24, 0.08], 16);
      }
    });
    const AIR_UNIT_VISUAL_RENDER_FNS = Object.freeze({
      "flowerbee": (rdr, c) => {
        const { r, accent, attack, sc, pt, linePts, fastFlap, wingBright, wingSoft, body, bodyDark, motion } = c;
        const flap = 0.78 + 0.28 * fastFlap;
        rdr.part("wings", () => {
          for (const side of [-1, 1]) {
            const root = pt(0.02, side * 0.2), outer = pt(-0.08, side * 0.92 * flap), rear2 = pt(-0.42, side * 0.7 * flap);
            rdr.poly([root, outer, rear2, pt(-0.28, side * 0.18)], wingBright);
            rdr.poly([pt(0.15, side * 0.15), pt(0.32, side * 0.74 * flap), pt(0.02, side * 0.62 * flap), pt(-0.04, side * 0.13)], wingSoft);
          }
        }, motion.parts.wings);
        const rear = pt(-0.4, 0), mid = pt(0.02, 0), head = pt(0.43, 0), sting = pt(-0.86, 0);
        rdr.circle(rear[0], rear[1], r * 0.48, [0.78, 0.54, 0.16, 1], 11);
        rdr.circle(mid[0], mid[1], r * 0.46, body, 11);
        rdr.circle(head[0], head[1], r * 0.32, bodyDark, 9);
        for (const f of [-0.58, -0.38, -0.18]) {
          const a = pt(f, -0.31), b = pt(f, 0.31);
          linePts(a, b, Math.max(1.2, 1.9 * sc), [0.22, 0.16, 0.08, 0.92]);
        }
        linePts(pt(-0.62, 0), sting, Math.max(1.2, 1.8 * sc), accent);
        if (attack) {
          const a = pt(0.5, 0), b = pt(1.12, 0);
          linePts(a, b, Math.max(1.6, 2.5 * sc), [1, 0.86, 0.34, 0.88]);
          rdr.circle(b[0], b[1], r * 0.11, [1, 0.93, 0.54, 0.72], 7);
        }
      },
      "sporemoth": (rdr, c) => {
        const { r, attack, pt, slowFlap, wingSoft, body, bodyDark, motion } = c;
        const flap = 0.86 + 0.15 * slowFlap;
        rdr.part("wings", () => {
          for (const side of [-1, 1]) rdr.poly([pt(0.18, side * 0.12), pt(0.02, side * 0.98 * flap), pt(-0.54, side * 0.82 * flap), pt(-0.68, side * 0.28), pt(-0.2, side * 0.08)], wingSoft);
        }, motion.parts.wings);
        rdr.circle(...pt(-0.06, 0), r * 0.48, bodyDark, 11);
        rdr.circle(...pt(0.32, 0), r * 0.27, body, 9);
        const sac = pt(-0.48, 0);
        rdr.part("sac", () => {
          rdr.circle(sac[0], sac[1], r * 0.34, [0.67, 0.4, 0.82, 0.98], 11);
          rdr.circle(sac[0], sac[1], r * 0.17, [0.88, 0.72, 1, 0.86], 9);
        }, motion.parts.sac);
        if (attack) rdr.circle(sac[0], sac[1], r * 0.62, [0.72, 0.5, 0.92, 0.1], 14);
      }
    });
    const polygonTemplates = /* @__PURE__ */ new Map(), colorCache = /* @__PURE__ */ new Map();
    function css(c) {
      const key = c.join(",");
      if (colorCache.has(key)) return colorCache.get(key);
      const value = `rgba(${Math.round(RangeUtil.clamp(c[0], 0, 1) * 255)},${Math.round(RangeUtil.clamp(c[1], 0, 1) * 255)},${Math.round(RangeUtil.clamp(c[2], 0, 1) * 255)},${RangeUtil.clamp(c[3] ?? 1, 0, 1)})`;
      colorCache.set(key, value);
      return value;
    }
    function directions(n, rot = 0) {
      const key = n + "|" + rot;
      if (polygonTemplates.has(key)) return polygonTemplates.get(key);
      const pts = Array.from({ length: n }, (_, i) => [Math.cos(rot + i / n * Math.PI * 2), Math.sin(rot + i / n * Math.PI * 2)]);
      polygonTemplates.set(key, pts);
      return pts;
    }
    class UnitArtPainter extends globalThis.BloomGamekitRendering.PrimitivePainter {
      constructor(ctx) {
        super(ctx);
        this.ctx = ctx;
        this._partTransform = null;
        this._unitRenderAlphaMul = 1;
        this.alphaMultiplier = () => this._unitRenderAlphaMul;
      }
      point(x, y) {
        const m = this._partTransform;
        if (m) {
          const px = x;
          x = m[0] * px + m[2] * y + m[4];
          y = m[1] * px + m[3] * y + m[5];
        }
        return [x, y];
      }
      part(name, paint, options = {}) {
        if (options.visible === false) return;
        const previous = this._partTransform;
        this._partTransform = options.transform || null;
        try {
          return paint();
        } finally {
          this._partTransform = previous;
        }
      }
      outlineCircle(x, y, r, w, c, segments = 56, dashEvery = 0) {
        const pts = directions(segments);
        for (let i = 0; i < segments; i++) {
          if (dashEvery > 0 && i % dashEvery !== 0) continue;
          const j = (i + 1) % segments;
          this.line(x + pts[i][0] * r, y + pts[i][1] * r, x + pts[j][0] * r, y + pts[j][1] * r, w, c);
        }
      }
      petalRing(x, y, r, count, c, rot = 0, stretch = 0.62) {
        const dirs = directions(count, rot), ca = Math.cos(Math.PI * 0.48), sa = Math.sin(Math.PI * 0.48), rr = r * 0.42;
        for (let i = 0; i < count; i++) {
          const [dx, dy] = dirs[i], cx = x + dx * r, cy = y + dy * r;
          const ppx = dx * ca - dy * sa, ppy = dx * sa + dy * ca, pmx = dx * ca + dy * sa, pmy = -dx * sa + dy * ca;
          this.quad(cx + dx * rr, cy + dy * rr * stretch, cx + ppx * rr * 0.62, cy + ppy * rr * 0.62, cx - dx * rr * 0.72, cy - dy * rr * 0.72 * stretch, cx + pmx * rr * 0.62, cy + pmy * rr * 0.62, c);
        }
      }
      crestTriangle(x, y, r, c, angle = -Math.PI / 2) {
        this.tri(x + Math.cos(angle) * r, y + Math.sin(angle) * r, x + Math.cos(angle + 2.35) * r * 0.72, y + Math.sin(angle + 2.35) * r * 0.72, x + Math.cos(angle - 2.35) * r * 0.72, y + Math.sin(angle - 2.35) * r * 0.72, c);
      }
    }
    function normalizeTeam(team) {
      return team === "enemy" || team === 1 || team === "red" ? "enemy" : team === "neutral" ? "neutral" : "friendly";
    }
    function assertType(type) {
      if (!RALLY_ART_CONFIG.units[type]) throw new RangeError("Unknown Rally unit: " + type);
      return RALLY_ART_CONFIG.units[type];
    }
    function makeCanvas(w, h = w) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return c;
    }
    function attackValue(opts) {
      return opts.attack ? { progress: opts.attackProgress ?? 0.5 } : false;
    }
    function rotationAbout(angle, x, y) {
      const c = Math.cos(angle), s = Math.sin(angle);
      return [c, s, -s, c, x - c * x + s * y, y - s * x - c * y];
    }
    function scaleAbout(scale, x, y) {
      return [scale, 0, 0, scale, x * (1 - scale), y * (1 - scale)];
    }
    function rotationAboutInto(out, angle, x, y) {
      const c = Math.cos(angle), s = Math.sin(angle);
      out[0] = c;
      out[1] = s;
      out[2] = -s;
      out[3] = c;
      out[4] = x - c * x + s * y;
      out[5] = y - s * x - c * y;
      return out;
    }
    function scaleAboutInto(out, scale, x, y) {
      out[0] = scale;
      out[1] = 0;
      out[2] = 0;
      out[3] = scale;
      out[4] = x * (1 - scale);
      out[5] = y * (1 - scale);
      return out;
    }
    function motionPart(parts, name) {
      return parts[name] || (parts[name] = {});
    }
    function motionTransform(parts, name) {
      const part = motionPart(parts, name);
      return part.transform || (part.transform = new Array(6));
    }
    function motionMorph(parts, name, first, second = 0, visible) {
      const part = motionPart(parts, name), morph = part.morph || (part.morph = [0, 0]);
      morph[0] = first;
      morph[1] = second;
      if (visible !== void 0) part.visible = visible;
      return part;
    }
    function artMotion(type, x, y, r, timeMs, opts, target = null) {
      const parts = target?.parts || {}, pose = opts.meshPose, hash = artTypeHashes[type], seed = hash % 997 * 0.017, motion = target || { parts };
      motion.parts = parts;
      motion.fastFlap = pose ?? 0.5 + 0.5 * Math.sin(timeMs * 0.026 + seed);
      motion.slowFlap = pose ?? opts.slowFlap ?? 0.5 + 0.5 * Math.sin(timeMs * 0.01 + seed);
      if (type === "dandelion") rotationAboutInto(motionTransform(parts, "spokes"), timeMs * 5e-4, x, y - r * 0.3);
      else if (type === "mage") for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + timeMs * 15e-4, m = motionTransform(parts, "orb-" + k);
        m[0] = 1;
        m[1] = 0;
        m[2] = 0;
        m[3] = 1;
        m[4] = Math.cos(a) * r * 0.72;
        m[5] = Math.sin(a) * r * 0.72;
      }
      else if (type === "pillbug") {
        rotationAboutInto(motionTransform(parts, "radial"), timeMs * 0.012 + hash % 997 * 0.01, x, y);
        scaleAboutInto(motionTransform(parts, "pulse"), 0.82 + 0.18 * Math.sin(timeMs * 0.012 + hash % 17), x + r * 0.62, y - r * 0.14);
      } else if (type === "flowerbee") motionMorph(parts, "wings", motion.fastFlap);
      else if (type === "sporemoth") {
        motionMorph(parts, "wings", motion.slowFlap);
        scaleAboutInto(motionTransform(parts, "sac"), opts.attack ? 1.22 : 0.94 + 0.08 * Math.sin(timeMs * 7e-3 + seed), x, y + r * 0.48);
      } else if (type === "shelltitan") {
        motion.attackPhase = pose ?? Math.sin(Math.min(1, Number(opts.attackProgress) || 0.5) * Math.PI);
        motionMorph(parts, "attack-aura", motion.attackPhase);
      } else if (type === "siege") {
        const deploying = opts.deployProgress != null && opts.deployProgress < 1, q = deploying ? RangeUtil.clamp(opts.deployProgress, 0, 1) : opts.deployed ? 1 : 0;
        const ease = motion.ease = pose ?? q * q * (3 - 2 * q), hull = motion.hullTransform || (motion.hullTransform = new Array(6));
        rotationAboutInto(hull, (opts.hullFacing ?? -Math.PI / 2) + Math.PI / 2, x, y);
        const common = motionPart(parts, "common-body");
        common.transform = rotationAboutInto(motionTransform(parts, "common-body"), (opts.commonFacing ?? opts.hullFacing ?? -Math.PI / 2) + Math.PI / 2, x, y);
        parts.feedback = common;
        for (let i = 0; i < 3; i++) {
          motionMorph(parts, "hull-leg-" + i, ease).transform = hull;
          motionMorph(parts, "hull-detail-" + i, ease, 0, ease > 0.3).transform = hull;
        }
        motionMorph(parts, "hull-body", ease).transform = hull;
        rotationAboutInto(motionTransform(parts, "turret"), (opts.turretFacing ?? -Math.PI / 2) + Math.PI / 2, x, y - r * 0.08 - r * 0.3 * ease);
        motionMorph(parts, "turret", ease);
        motionMorph(parts, "deployment-halo", ease, 0, deploying && ease > 0);
      }
      return motion;
    }
    class MeshArtCompiler extends UnitArtPainter {
      constructor() {
        super(new globalThis.BloomGamekitRendering.MeshBuilder());
        this.parts = [];
        this.baseIndex = 0;
      }
      flushPart(name) {
        if (this.ctx.vertices.length) this.parts.push({ name, builder: this.ctx });
        this.ctx = new globalThis.BloomGamekitRendering.MeshBuilder();
        this.context = this.ctx;
      }
      part(name, paint) {
        this.flushPart("base-" + this.baseIndex++);
        paint();
        this.flushPart(name);
      }
      finish() {
        this.flushPart("base-" + this.baseIndex++);
        return this.parts;
      }
    }
    const meshArtCaches = /* @__PURE__ */ new WeakMap(), meshArtTotals = { meshes: 0, bytes: 0, hits: 0, misses: 0, evictions: 0 };
    const morphedUnitArt = /* @__PURE__ */ new Set(["flowerbee", "sporemoth", "siege", "shelltitan"]);
    const staticMeshPart = Object.freeze({});
    const artTypeHashes = Object.freeze(Object.fromEntries(Object.keys(RALLY_ART_CONFIG.units).map((type) => [type, HashUtil.hash(type)])));
    const artPaletteIds = /* @__PURE__ */ new WeakMap();
    let nextArtPaletteId = 1;
    function artPaletteId(palette) {
      if (!palette || typeof palette !== "object") return 0;
      let id = artPaletteIds.get(palette);
      if (!id) {
        id = nextArtPaletteId++;
        artPaletteIds.set(palette, id);
      }
      return id;
    }
    function dropMeshArt(ctx, cache, key) {
      const entry = cache.entries.get(key);
      if (!entry) return;
      ctx.deleteMesh(entry.mesh);
      cache.entries.delete(key);
      cache.meshes--;
      cache.bytes -= entry.bytes;
      meshArtTotals.meshes--;
      meshArtTotals.bytes -= entry.bytes;
    }
    function disposeMeshes(ctx) {
      const cache = meshArtCaches.get(ctx);
      if (!cache) return;
      for (const key of cache.entries.keys()) dropMeshArt(ctx, cache, key);
      meshArtCaches.delete(ctx);
    }
    function meshArtEntry(ctx, type, team, r, opts, fast = false, angle = 0, rotation = 0) {
      let cache = meshArtCaches.get(ctx);
      if (!cache) {
        cache = { entries: /* @__PURE__ */ new Map(), meshes: 0, bytes: 0, clock: 0 };
        meshArtCaches.set(ctx, cache);
      }
      const palette = opts.factionPalette || RALLY_ART_CONFIG.palettes[team];
      const key = type + "|" + team + "|" + r + "|" + artPaletteId(palette) + "|" + (Number(!!opts.attack) | Number(!!opts.hit) << 1 | Number(!!(fast ? false : opts.cloaked)) << 2);
      let entry = cache.entries.get(key);
      if (entry) {
        meshArtTotals.hits++;
        entry.lastUsed = ++cache.clock;
      } else {
        meshArtTotals.misses++;
        let buildOpts = opts;
        if (fast) {
          buildOpts = cache.buildOptions || (cache.buildOptions = {});
          for (const name of Object.keys(buildOpts)) delete buildOpts[name];
          Object.assign(buildOpts, opts);
          buildOpts.cloaked = false;
          if (type === "siege") {
            buildOpts.hullFacing = opts.hullFacing ?? angle;
            buildOpts.turretFacing = opts.turretFacing ?? angle;
            buildOpts.commonFacing = angle;
          }
          if (Number.isFinite(opts.hullFacing)) buildOpts.hullFacing = opts.hullFacing - rotation;
          if (Number.isFinite(opts.turretFacing)) buildOpts.turretFacing = opts.turretFacing - rotation;
        }
        const first = new MeshArtCompiler(buildOpts), needsMorph = morphedUnitArt.has(type), second = needsMorph ? new MeshArtCompiler(buildOpts) : null;
        composeRecipe(first, type, team, 0, 0, r, 0, { ...buildOpts, meshPose: 0 });
        if (second) composeRecipe(second, type, team, 0, 0, r, 0, { ...buildOpts, meshPose: 1 });
        const a = first.finish(), b = second ? second.finish() : a;
        if (a.length !== b.length) throw new Error("Rally mesh part topology differs: " + type);
        const data = a.map((part, i) => {
          if (part.name !== b[i].name) throw new Error("Rally mesh part order differs: " + type);
          return { name: part.name, geometry: part.builder.build({ morphs: needsMorph ? [b[i].builder] : [] }) };
        });
        const geometry = globalThis.BloomGamekitRendering.MeshBuilder.combine(data.map((part) => part.geometry));
        const bytes = geometry.vertices.byteLength, limits = RALLY_ART_CONFIG.limits;
        if (limits.meshCacheMeshes < 1 || bytes > limits.meshCacheBytes) throw new RangeError("Rally unit mesh exceeds retained cache budget");
        while (cache.entries.size && (cache.meshes + 1 > limits.meshCacheMeshes || cache.bytes + bytes > limits.meshCacheBytes)) {
          let oldestKey = null, oldestUse = Infinity;
          for (const [candidateKey, candidate] of cache.entries) if (candidate.lastUsed < oldestUse) {
            oldestKey = candidateKey;
            oldestUse = candidate.lastUsed;
          }
          if (oldestKey === null) throw new Error("Rally mesh cache eviction candidate missing");
          dropMeshArt(ctx, cache, oldestKey);
          meshArtTotals.evictions++;
        }
        entry = { mesh: ctx.createMesh(geometry), parts: data.map((part) => part.name), bytes, lastUsed: ++cache.clock };
        cache.entries.set(key, entry);
        cache.meshes++;
        cache.bytes += bytes;
        meshArtTotals.meshes++;
        meshArtTotals.bytes += bytes;
      }
      return entry;
    }
    function retainedArt(ctx, type, team, x, y, r, timeMs, opts) {
      const entry = opts.meshArtEntry || meshArtEntry(ctx, type, team, r, opts);
      const sample = opts.meshArtSample || meshArtSample(entry, artMotion(type, 0, 0, r, timeMs, opts));
      if (x || y) {
        ctx.save();
        ctx.translate(x, y);
      }
      try {
        ctx.drawMesh(entry.mesh, sample);
      } finally {
        if (x || y) ctx.restore();
      }
    }
    function meshArtSample(entry, motion) {
      let sample = entry.sample;
      if (!sample) sample = entry.sample = { parts: new Array(entry.parts.length) };
      for (let i = 0; i < entry.parts.length; i++) {
        const name = entry.parts[i];
        sample.parts[i] = motion.parts[name] || staticMeshPart;
      }
      return sample;
    }
    function drawRetainedFast(ctx, type, team, x, y, radius, facing, timeMs, opts) {
      assertType(type);
      team = normalizeTeam(team);
      timeMs = (Number(timeMs) || 0) + (Number(opts.phaseOffsetMs) || 0);
      const outerAlpha = ctx.globalAlpha ?? 1, stealth = team === "friendly" && opts.cloaked ? 0.3 : 1, alpha = outerAlpha * RangeUtil.clamp(opts.alpha ?? 1, 0, 1) * stealth;
      if (alpha <= 0) return;
      const angle = resolvedAngle(type, team, facing, opts), rotation = type === "siege" ? 0 : angle + Math.PI / 2, theta = rotation + (opts.poseTilt || 0), stretch = RangeUtil.clamp(opts.poseStretch || 1, 0.55, 1.65), sx = (opts.feedbackX || 1) * stretch, sy = (opts.feedbackY || 1) / stretch, c = Math.cos(theta), s = Math.sin(theta), a = c * sx, b = s * sx, cc = -s * sy, d = c * sy;
      const entry = meshArtEntry(ctx, type, team, radius, opts, true, angle, rotation), localOpts = entry.motionOptionsScratch || (entry.motionOptionsScratch = {});
      localOpts.meshPose = opts.meshPose;
      localOpts.slowFlap = opts.slowFlap;
      localOpts.attack = opts.attack;
      localOpts.attackProgress = opts.attackProgress;
      localOpts.deployProgress = opts.deployProgress;
      localOpts.deployed = opts.deployed;
      localOpts.cloaked = false;
      localOpts.hullFacing = type === "siege" ? opts.hullFacing ?? angle : Number.isFinite(opts.hullFacing) ? opts.hullFacing - rotation : void 0;
      localOpts.commonFacing = type === "siege" ? angle : void 0;
      localOpts.turretFacing = type === "siege" ? opts.turretFacing ?? angle : Number.isFinite(opts.turretFacing) ? opts.turretFacing - rotation : void 0;
      const motion = entry.motionScratch || (entry.motionScratch = { parts: {} }), sample = meshArtSample(entry, artMotion(type, 0, 0, radius, timeMs, localOpts, motion)), grouped = alpha < 0.999999;
      if (grouped) {
        ctx.beginGroup(alpha, ctx.groupBounds(x, y, radius * 4.4));
        ctx.globalAlpha = 1;
      }
      let saved = false;
      try {
        ctx.save();
        saved = true;
        if (opts.whiteFlash) ctx.filter = "brightness(0) invert(1)";
        ctx.transform(a, b, cc, d, x, y);
        if (opts.gradeOutline) ctx.drawMeshSilhouette(entry.mesh, { parts: sample.parts, color: opts.gradeOutline, width: Math.max(1, radius * 0.085), radius: 128 });
        else ctx.drawMesh(entry.mesh, { parts: sample.parts });
      } finally {
        if (saved) ctx.restore();
        if (grouped) {
          ctx.endGroup();
          ctx.globalAlpha = outerAlpha;
        }
      }
    }
    function composeOutlined(ctx, type, team, x, y, r, timeMs, opts) {
      if (ctx.isBloomWebGL) {
        const entry = opts.meshArtEntry || meshArtEntry(ctx, type, team, r, opts), sample = opts.meshArtSample || meshArtSample(entry, artMotion(type, 0, 0, r, timeMs, opts));
        return ctx.drawMeshSilhouette(entry.mesh, { parts: sample.parts, color: opts.gradeOutline, width: Math.max(1, r * 0.085), radius: 128 });
      }
      const size = Math.ceil(r * 6 + 12), half = size / 2, body = makeCanvas(size), b = body.getContext("2d");
      compose(b, type, team, half, half, r, timeMs, { ...opts, gradeOutline: null });
      const mask = makeCanvas(size), m = mask.getContext("2d");
      m.drawImage(body, 0, 0);
      m.globalCompositeOperation = "source-in";
      m.fillStyle = opts.gradeOutline;
      m.fillRect(0, 0, size, size);
      const width = Math.max(1, r * 0.085);
      ctx.save();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.drawImage(mask, x - half + Math.cos(a) * width, y - half + Math.sin(a) * width);
      }
      ctx.drawImage(body, x - half, y - half);
      ctx.restore();
    }
    function compose(ctx, type, team, x, y, r, timeMs, opts = {}) {
      if (opts.gradeOutline) return composeOutlined(ctx, type, team, x, y, r, timeMs, opts);
      if (ctx.isBloomWebGL) return retainedArt(ctx, type, team, x, y, r, timeMs, opts);
      return composeRecipe(new UnitArtPainter(ctx, opts), type, team, x, y, r, timeMs, opts);
    }
    function composeRecipe(rdr, type, team, x, y, r, timeMs, opts) {
      const d = assertType(type), own = team === "friendly", palette = opts.factionPalette || RALLY_ART_CONFIG.palettes[team];
      const ownStealthAlpha = own && opts.cloaked ? 0.3 : 1;
      const tint = (c2) => ownStealthAlpha < 1 ? [...c2.slice(0, 3), ownStealthAlpha] : c2;
      const body = tint(palette.body), teamDark = tint(palette.dark), teamLight = tint(palette.light);
      const accent = d.accent || teamLight, attack = attackValue(opts), sc = r / (d.size * 1.56 * d.visualScale);
      const u = { id: type, type, side: own ? 0 : 1 };
      rdr._unitRenderAlphaMul = ownStealthAlpha;
      const motion = artMotion(type, x, y, r, timeMs, opts);
      const c = { u, own, d, sc, neutral: team === "neutral", x, y, r, airUnit: d.layer === "AIR", ownStealthAlpha, cloaked: !!opts.cloaked, team: body, teamDark, teamLight, factionPalette: palette, accent, attack, hit: !!opts.hit, dir: -1, motion };
      if (d.layer === "AIR") {
        const fx = 0, fy = -1, sx = 1, sy = 0;
        const pt = (forward = 0, side = 0) => [x + fx * forward * r + sx * side * r, y + fy * forward * r + sy * side * r];
        const linePts = (a, b, w, color2) => rdr.line(a[0], a[1], b[0], b[1], w, color2);
        const now = timeMs, seed = HashUtil.hash(u.id) % 997 * 0.017;
        const { fastFlap, slowFlap } = motion;
        const wingBright = [Math.min(1, accent[0] + 0.18), Math.min(1, accent[1] + 0.18), Math.min(1, accent[2] + 0.18), 0.72];
        const wingSoft = [Math.min(1, accent[0] + 0.12), Math.min(1, accent[1] + 0.12), Math.min(1, accent[2] + 0.12), 0.42];
        AIR_UNIT_VISUAL_RENDER_FNS[type](rdr, { ...c, fx, fy, sx, sy, pt, linePts, now, seed, fastFlap, slowFlap, wingBright, wingSoft, body, bodyDark: teamDark, delta: { x: 0, y: 0 } });
      } else {
        if (d.commonGroundBody !== false) {
          const b = RALLY_ART_CONFIG.commonBody;
          const paintBody = () => {
            rdr.circle(x, y + r * b.outerY, r * b.outerRadius, b.ink, 12);
            rdr.circle(x, y + r * b.bodyY, r * b.bodyRadius, body, 12);
            rdr.circle(x + r * b.highlightX, y + r * b.highlightY, r * b.highlightRadius, teamLight, 10);
          };
          if (type === "siege") rdr.part("common-body", paintBody, motion.parts["common-body"]);
          else paintBody();
        }
        UNIT_VISUAL_RENDER_FNS[type](rdr, c);
      }
      const paintFeedback = () => {
        if (opts.hit) rdr.circle(x, y, r * 1.42, [1, 0.94, 0.75, 0.18], 12);
        if (attack) rdr.circle(x, y, r * 1.22, [1, 0.73, 0.22, 0.07], 10);
      };
      if (type === "siege") rdr.part("feedback", paintFeedback, motion.parts.feedback);
      else paintFeedback();
    }
    const thumbnails = /* @__PURE__ */ new Map();
    function clearCache() {
      thumbnails.clear();
    }
    function resolvedAngle(type, team, facing, opts) {
      const d = RALLY_ART_CONFIG.units[type];
      if (Number.isFinite(facing) && (!opts.respectOriginalFacing || d.facing === "full" || d.layer === "AIR")) return facing;
      return d.facing === "full" || d.layer === "AIR" ? team === "enemy" ? Math.PI / 2 : -Math.PI / 2 : -Math.PI / 2;
    }
    const visualExtentRadius = Object.freeze({ lancer: 2.1, swordsman: 1.8, archer: 1.7, dandelion: 1.3, skirmisher: 1.9, tank: 1.3, medic: 1.3, mage: 1.3, flowerbee: 1.5, rogue: 1.7, guardshroom: 1.3, siege: 3.5, shelltitan: 1.7, shellbug: 1.3, pikeman: 3.1, stingbug: 2.1, fireant: 1.5, kickhopper: 2.5, rootstalker: 1.4, pillbug: 1.3, sporemoth: 1.3, mantis: 2.1, clawhunter: 1.9, chainflower: 1.3, rocket: 1.8 });
    function visualExtent(type) {
      assertType(type);
      return visualExtentRadius[type];
    }
    function draw(ctx, type, team, x, y, radius, facing, timeMs = 0, opts = {}) {
      if (!ctx || !Number.isFinite(radius) || radius <= 0) return;
      if (ctx.isBloomWebGL && !opts.shadow && typeof ctx.transform === "function") return drawRetainedFast(ctx, type, team, x, y, radius, facing, timeMs, opts);
      assertType(type);
      team = normalizeTeam(team);
      timeMs = (Number(timeMs) || 0) + (Number(opts.phaseOffsetMs) || 0);
      const outerAlpha = ctx.globalAlpha ?? 1, stealth = team === "friendly" && opts.cloaked ? 0.3 : 1, alpha = outerAlpha * RangeUtil.clamp(opts.alpha ?? 1, 0, 1) * stealth;
      if (ctx.isBloomWebGL && alpha <= 0) return;
      if (ctx.isBloomWebGL && alpha < 0.999999) {
        ctx.beginGroup(alpha, ctx.groupBounds(x, y, radius * 4.4));
        ctx.globalAlpha = 1;
      }
      const angle = resolvedAngle(type, team, facing, opts), rotation = type === "siege" ? 0 : angle + Math.PI / 2;
      ctx.save();
      if (opts.whiteFlash) ctx.filter = "brightness(0) invert(1)";
      ctx.translate(x, y);
      ctx.rotate(rotation + (opts.poseTilt || 0));
      ctx.scale(opts.feedbackX || 1, opts.feedbackY || 1);
      if (!ctx.isBloomWebGL) ctx.globalAlpha *= RangeUtil.clamp(opts.alpha ?? 1, 0, 1);
      if (opts.shadow) {
        ctx.save();
        ctx.rotate(-rotation);
        ctx.fillStyle = "rgba(4,13,9,.24)";
        ctx.beginPath();
        ctx.ellipse(0, radius * 0.45, radius * 0.84, radius * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      const stretch = RangeUtil.clamp(opts.poseStretch || 1, 0.55, 1.65);
      ctx.scale(stretch, 1 / stretch);
      const localOpts = { ...opts };
      if (ctx.isBloomWebGL && opts.cloaked) localOpts.cloaked = false;
      if (type === "siege") {
        localOpts.hullFacing = opts.hullFacing ?? angle;
        localOpts.turretFacing = opts.turretFacing ?? angle;
        localOpts.commonFacing = angle;
      }
      if (Number.isFinite(opts.hullFacing)) localOpts.hullFacing = opts.hullFacing - rotation;
      if (Number.isFinite(opts.turretFacing)) localOpts.turretFacing = opts.turretFacing - rotation;
      if (ctx.isBloomWebGL) {
        localOpts.meshArtEntry = meshArtEntry(ctx, type, team, radius, localOpts);
        localOpts.meshArtSample = meshArtSample(localOpts.meshArtEntry, artMotion(type, 0, 0, radius, timeMs, localOpts));
      }
      compose(ctx, type, team, 0, 0, radius, timeMs, localOpts);
      ctx.restore();
      if (ctx.isBloomWebGL && alpha < 0.999999) {
        ctx.endGroup();
        ctx.globalAlpha = outerAlpha;
      }
    }
    function canvas2(type, team = "friendly", opts = {}) {
      const size = Math.max(16, Math.round(opts.size || 128)), c = makeCanvas(size), ctx = c.getContext("2d");
      if (opts.radius != null) {
        draw(ctx, type, team, size / 2, size / 2, opts.radius, opts.facing ?? -Math.PI / 2, opts.timeMs ?? 0, { ...opts, direct: true });
        return c;
      }
      const work = makeCanvas(256), wc = work.getContext("2d");
      draw(wc, type, team, 128, 128, 32, opts.facing ?? -Math.PI / 2, opts.timeMs ?? 0, { ...opts, direct: true });
      const pixels = wc.getImageData(0, 0, 256, 256).data;
      let left = 256, top = 256, right = -1, bottom = -1;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (pixels[(y * 256 + x) * 4 + 3] > 0) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
      if (right < left) return c;
      const w = right - left + 1, h = bottom - top + 1, pad = opts.padding ?? size * 0.085, scale = (size - pad * 2) / Math.max(w, h), dw = w * scale, dh = h * scale;
      ctx.drawImage(work, left, top, w, h, (size - dw) / 2, (size - dh) / 2, dw, dh);
      return c;
    }
    function thumbnail(type, team = "friendly", opts = {}) {
      const key = type + "|" + team + "|" + JSON.stringify(opts);
      if (thumbnails.has(key)) return thumbnails.get(key);
      const result = canvas2(type, team, opts).toDataURL("image/png");
      if (thumbnails.size >= RALLY_ART_CONFIG.limits.thumbnailCacheEntries) thumbnails.clear();
      thumbnails.set(key, result);
      return result;
    }
    function stats2() {
      return { backend: "retained-mesh", thumbnails: thumbnails.size, meshes: { ...meshArtTotals } };
    }
    RALLY_ART_CONFIG.renderers = { ground: UNIT_VISUAL_RENDER_FNS, air: AIR_UNIT_VISUAL_RENDER_FNS };
    global.RALLY_ART_CONFIG = RALLY_ART_CONFIG;
    global.RallyArt = { draw, visualExtent, thumbnail, canvas: canvas2, clearCache, disposeMeshes, stats: stats2, config: RALLY_ART_CONFIG, types: RALLY_ART_CONFIG.types };
  })(typeof window !== "undefined" ? window : globalThis);
  var BudmoriArt = globalThis.RallyArt;

  // src/farm-renderer.js
  var { WebGLDevice, VectorContext } = globalThis.BloomGamekitRendering;
  var TYPES = ["lancer", "siege", "rogue"];
  var COLORS = ["#bf8144", "#648b6b", "#8b719c"];
  var Diorama = class {
    constructor(canvas2) {
      this.canvas = canvas2;
      this.device = new WebGLDevice(canvas2, { alpha: false, depth: false, stencil: false, antialias: true });
      this.ctx = new VectorContext(this.device);
      this.ctx.isBloomWebGL = true;
      this.canvas.dataset.rendererBackend = "Budmori authored 2.5D vectors";
      this.resize();
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
    configure(scene2) {
      if (this.scene === scene2) return;
      this.scene = scene2;
      const a = this.aspect;
      if (scene2 === "raid") this.view = a > 1.2 ? [Math.max(26.5, 17 * a), 17] : [26.5, 26.5 / a];
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
    attackEffects(world) {
      for (const u of world.units) {
        const a = u.ability, s = ATTACK_TYPES[u.species];
        if (a.phase === "windup") this.ring(u.x, u.y, u.radius + 0.1, COLORS[u.species], 0.065, 0, Math.PI * 2 * Math.min(1, a.elapsed / s.windup));
      }
    }
    drawUnit(u, sim2) {
      u = this.feel ? this.feel.unit(u, this.now) : u;
      const c = this.ctx, walk = Math.min(1, Math.hypot(u.vx, u.vy)), bob = u.z === 0 ? Math.abs(Math.sin(sim2.time * 9 + u.seed)) * 0.14 * walk : 0, p = this.project(u.x + Math.sin(sim2.time * 9 + u.seed) * 0.065 * walk, u.y, u.z + bob);
      const r = Math.max(u.size * this.scale * 0.78, (sim2.scene === "raid" ? 2.8 : 11) * this.pixelRatio);
      const landing = u.bounce > 0 ? u.bounce : 0, airStretch = clamp(Math.abs(u.vz) * 0.014, 0, 0.12), squash = 1 + (this.feel?.squash(u.id, this.now) || 0) + landing * 0.8 - airStretch - (u.ability.phase === "windup" ? 0.12 : 0);
      BudmoriArt.draw(c, TYPES[u.species], "friendly", p.x, p.y - r * 0.35, r, Math.atan2(-Math.sin(u.angle) * 0.62, Math.cos(u.angle)), sim2.time * 1e3, { respectOriginalFacing: true, phaseOffsetMs: u.id * 37, poseStretch: squash, poseTilt: Math.sin(sim2.time * 9 + u.seed) * 0.045 * walk, whiteFlash: u.flash > 0.09, hit: u.flash > 0, attack: u.ability.phase === "active" || u.ability.phase === "recover" && u.ability.elapsed < 0.13, deployed: u.ability.phase !== "idle", turretFacing: Math.atan2(-Math.sin(u.angle) * 0.62, Math.cos(u.angle)), alpha: u.down > 0 ? 0.55 : 1 });
      const joy = sim2.effects.some((e) => (e.kind === "eat" || e.kind === "birth" || e.kind === "merge") && e.life < 0.85 && Math.hypot(e.x - u.x, e.y - u.y) < 1.2);
      const expression = u.z > 0.5 || u.stun > 0 || u.down > 0 ? "surprised" : joy ? "happy" : !u.fed ? "hungry" : "normal";
      if (sim2.scene === "farm") this.face(p.x, p.y - r * 0.35, r * 0.7, u.species, expression, squash, Math.sin(sim2.time * 9 + u.seed) * 0.045 * walk);
      if (u.tier > 1) {
        for (let k = 0; k < u.tier - 1; k++) {
          const x = p.x + (k - (u.tier - 2) / 2) * r * 0.34, y = p.y - r * 1.5;
          c.fillStyle = "#f1df9f";
          c.beginPath();
          c.moveTo(x, y - r * 0.11);
          c.lineTo(x + r * 0.1, y);
          c.lineTo(x, y + r * 0.11);
          c.lineTo(x - r * 0.1, y);
          c.closePath();
          c.fill();
        }
      }
    }
    face(x, y, r, species, expression, stretch = 1, tilt = 0) {
      const c = this.ctx, ink = "#263c39", cream = "#fff1ce";
      c.save();
      c.translate(x, y);
      c.rotate(tilt);
      c.scale(1 / stretch, stretch);
      const fy = species === 1 ? r * 0.48 : species === 0 ? r * 0.04 : r * 0.16;
      this.ellipse(0, fy, r * 0.46, r * 0.36, cream);
      c.strokeStyle = ink;
      c.lineWidth = Math.max(this.pixelRatio * 1.1, r * 0.075);
      for (const side of [-1, 1]) {
        const ex = side * r * 0.2, ey = fy - r * 0.075;
        if (expression === "happy") {
          c.beginPath();
          c.moveTo(ex - r * 0.08, ey + r * 0.025);
          c.lineTo(ex, ey - r * 0.055);
          c.lineTo(ex + r * 0.08, ey + r * 0.025);
          c.stroke();
        } else this.ellipse(ex, ey, r * (expression === "surprised" ? 0.085 : 0.065), r * (expression === "hungry" ? 0.065 : 0.1), ink);
      }
      if (expression === "surprised") this.ellipse(0, fy + r * 0.14, r * 0.09, r * 0.12, ink);
      else {
        c.beginPath();
        c.moveTo(-r * 0.13, fy + r * (expression === "hungry" ? 0.2 : 0.1));
        c.lineTo(0, fy + r * (expression === "hungry" ? 0.13 : 0.19));
        c.lineTo(r * 0.13, fy + r * (expression === "hungry" ? 0.2 : 0.1));
        c.stroke();
      }
      if (expression === "happy") for (const side of [-1, 1]) this.ellipse(side * r * 0.31, fy + r * 0.09, r * 0.075, r * 0.045, "#eaa09b");
      c.restore();
    }
    bossPose(world) {
      const b = world.boss, k = this.feel?.boss(this.now) || { x: 0, y: 0, squash: 0 };
      return { b, p: this.project(b.x + k.x, b.y + k.y, 0), r: this.scale * b.radius * 1.16, k };
    }
    drawBoss(world) {
      const { b, p, r, k } = this.bossPose(world), wind = b.phase.endsWith("windup"), active2 = b.phase === "strike" || b.phase === "sweep";
      BudmoriArt.draw(this.ctx, "guardshroom", "enemy", p.x, p.y - r * 0.34, r, void 0, world.time * 1e3, { respectOriginalFacing: true, poseStretch: (wind ? 1.06 : 1 + Math.sin(world.time * 2) * 0.012) + k.squash, poseTilt: wind ? -0.055 : active2 ? 0.035 : Math.sin(world.time * 5) * 0.012, attack: active2 });
    }
    drawBossFace(world) {
      const { b, p, r } = this.bossPose(world), wind = b.phase.endsWith("windup"), active2 = b.phase === "strike" || b.phase === "sweep";
      this.face(p.x, p.y - r * 0.34, r, 1, wind ? "surprised" : active2 ? "happy" : "normal", wind ? 1.06 : 1, wind ? -0.055 : active2 ? 0.035 : 0);
    }
    drawBossWeapon(world) {
      const b = world.boss, c = CONFIG.raid, heavy = b.phase === "sweep" || b.phase === "sweep-windup";
      let angle = heavy ? b.startAngle : b.angle, reach = b.radius + 0.15;
      if (b.phase === "sweep") {
        angle = b.startAngle + Math.PI * 2 * Math.min(1, b.clock / c.sweepDuration);
        reach = c.sweepReach;
      } else if (b.phase === "strike") reach = b.radius - 0.25 + (c.basicReach - b.radius + 0.25) * Math.sin(Math.PI * Math.min(1, b.clock / c.basicDuration));
      else if (b.phase.endsWith("windup")) reach = heavy ? c.sweepReach : b.radius - 0.25;
      const base = this.project(b.x + Math.cos(angle) * (b.radius * 0.65), b.y + Math.sin(angle) * (b.radius * 0.65), 0.35), tip = this.project(b.x + Math.cos(angle) * reach, b.y + Math.sin(angle) * reach, 0.35);
      this.line(base, tip, 0.4, "#314331");
      this.line(base, tip, 0.24, "#879866");
      this.ellipse(tip.x, tip.y, c.weaponRadius * this.scale, c.weaponRadius * this.scale * 0.62, b.phase.endsWith("windup") ? "#ba7752" : "#b5aa73", angle);
      if (b.phase === "sweep") {
        const back = angle - 0.18, tail = this.project(b.x + Math.cos(back) * reach, b.y + Math.sin(back) * reach, 0.35);
        this.line(tail, tip, 0.26, "#e6cf7b99");
      }
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
        const b = sim2.boss, wind = b.phase.endsWith("windup"), active2 = b.phase === "strike" || b.phase === "sweep", heavy = b.phase === "sweep-windup" || b.phase === "sweep";
        if (wind || active2) {
          const reach = heavy ? CONFIG.raid.sweepReach : CONFIG.raid.basicReach, color = heavy ? "#b46c45" : "#a98a52";
          if (heavy) {
            this.ring(b.x, b.y, reach + CONFIG.raid.weaponRadius, color, wind ? 0.09 : 0.05);
            this.ring(b.x, b.y, reach - CONFIG.raid.weaponRadius, "#c59b7288", 0.045);
            const progress = Math.min(1, b.clock / (wind ? CONFIG.raid.sweepWindup : CONFIG.raid.sweepDuration));
            this.ring(b.x, b.y, reach + CONFIG.raid.weaponRadius + 0.12, "#dfad65", 0.14, b.startAngle, b.startAngle + progress * Math.PI * 2);
          } else {
            const nx = Math.cos(b.angle), ny = Math.sin(b.angle), start2 = b.radius - 0.25, width = CONFIG.raid.weaponRadius;
            for (const side of [-1, 1]) this.line(this.project(b.x + nx * start2 - ny * width * side, b.y + ny * start2 + nx * width * side), this.project(b.x + nx * reach - ny * width * side, b.y + ny * reach + nx * width * side), 0.055, color);
            for (const distance of [start2, reach]) this.ring(b.x + nx * distance, b.y + ny * distance, width, color, 0.05);
          }
        }
      }
    }
    render(sim2, feel = null, now = performance.now()) {
      this.feel = feel;
      this.now = now;
      this.configure(sim2.scene);
      const c = this.ctx;
      c.beginFrame({ width: this.canvas.width, height: this.canvas.height, clearColor: [0.9, 0.92, 0.87, 1] });
      this.terrain(sim2);
      for (const u of sim2.units) {
        const a = clamp(0.24 - u.z * 0.035, 0.07, 0.24);
        this.groundEllipse(u.x, u.y, u.size * (0.65 + u.z * 0.035), u.size * 0.42, `rgba(42,61,35,${a})`);
        if (u.down > 0) this.ring(u.x, u.y, 0.45, "#aa9a60");
      }
      if (sim2.scene === "raid") {
        this.groundEllipse(sim2.boss.x, sim2.boss.y, sim2.boss.radius * 1.05, sim2.boss.radius * 0.75, "#38472c33");
        this.drawBossWeapon(sim2);
      }
      const actors = sim2.units.map((u) => ({ depth: 0.785 * u.y - 0.62 * u.z, id: u.id, draw: () => this.drawUnit(u, sim2) }));
      if (sim2.scene === "raid") actors.push({ depth: 0.785 * sim2.boss.y, id: 0, draw: () => this.drawBoss(sim2) });
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
      if (sim2.scene === "raid") for (const f of sim2.projectiles) actors.push({ depth: 0.785 * f.y - 0.62 * f.z, id: -f.id, draw: () => {
        const p = this.project(f.x, f.y, f.z), tail = Ballistics.sample(f.path, Math.max(0, (f.elapsed - 0.04) / f.path.duration));
        this.groundEllipse(f.x, f.y, 0.14, 0.1, "#55452433");
        this.line(this.project(tail.x, tail.y, tail.z), p, 0.07, "#ba964a80");
        this.ellipse(p.x, p.y, this.scale * 0.14, this.scale * 0.2, "#cfa957", 0.3);
        this.ellipse(p.x - this.scale * 0.03, p.y - this.scale * 0.05, this.scale * 0.05, this.scale * 0.08, "#fff0ae");
      } });
      actors.sort((a, b) => b.depth - a.depth || a.id - b.id);
      for (const actor of actors) actor.draw();
      this.attackEffects(sim2);
      feel?.draw(this, now);
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
        else if (e.kind === "birth" || e.kind === "merge") {
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
      if (sim2.scene === "raid") this.drawBossFace(sim2);
      this.stats = c.endFrame();
    }
  };

  // src/farm-session.js
  init_farm_model();
  init_farm_state();
  init_version();
  var { binaryCodec: codec } = globalThis.BloomGamekitDeterministic;
  var FarmSession = class {
    constructor(world = new Garden(), { room: room2 = null, onError = console.error, onEvent = () => {
    } } = {}) {
      this.world = world;
      this.previous = null;
      this.previousBoss = null;
      this.renderAt = 0;
      this.tick = 0;
      this.epoch = 0;
      this.players = [];
      this.speed = 1;
      this.paused = false;
      this.pending = [];
      this.room = room2;
      this.localPlayerId = room2?.localPlayerId || "solo";
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
      }, step: (ctx) => this.step(ctx) };
      this.session = globalThis.BloomGamekitRollback.createRoomSession({ adapter, players: room2?.players || ["solo"], localPlayerId: this.localPlayerId, sessionId: room2?.sessionId || "budmori-solo", simulationVersion: "budmori-farm-" + COMPATIBILITY, seed: world.seed, inputSize: 1, mode: room2 ? "online" : "local", room: room2 || void 0, profile: { ...globalThis.BloomGamekitRollback.profiles.action, mode: "lockstep", tickRate: 20, baseInputDelayTicks: room2 ? 2 : 0, minInputDelayTicks: room2 ? 2 : 0, maxInputDelayTicks: room2 ? 2 : 0, adaptiveInputDelay: false, pacingPolicy: "none", checksumInterval: 20, stateHistorySize: 32, maxSnapshotBytes: 8388608 }, membership: { maxPlayers: 5, transitionTimeoutMs: 3e4, reconnectGraceMs: 1e4, maxCatchupSteps: 4 }, onEvent });
      this.loop = globalThis.BloomGamekitSimloop.createLoop({ session: this.session, getInput: () => ({ input: new Uint8Array(1), commands: (this.session.ready ? this.pending.splice(0, 32) : []).map((payload) => ({ payload })), predict: false }), canAdvance: () => true, canObserveInput: () => !this.session.closed && !this.session.failure, onError });
    }
    capture() {
      return { tick: this.tick, epoch: this.epoch, players: this.players, speed: this.speed, world: snapshot(this.world) };
    }
    validate(s, ctx = {}) {
      if (!Number.isSafeInteger(s.tick) || s.tick < 0 || !Number.isSafeInteger(s.epoch) || s.epoch < 0 || !Array.isArray(s.players) || s.players.length > 5 || s.players.some((p) => typeof p !== "string") || ![1, 4].includes(s.speed) || ctx.tick !== void 0 && s.tick !== ctx.tick || ctx.membershipEpoch !== void 0 && s.epoch !== ctx.membershipEpoch) throw Error("Invalid farm snapshot");
      return restore(s.world);
    }
    load(s) {
      this.previous = null;
      this.world = this.validate(s);
      this.tick = s.tick;
      this.epoch = s.epoch;
      this.players = [...s.players];
      this.speed = s.speed;
    }
    queue(type, args = {}) {
      if (!this.session.ready || this.pending.length >= 64) return false;
      this.pending.push(codec.encode({ type, ...args }));
      return true;
    }
    step({ tick, inputs }) {
      for (const f of inputs) {
        if (!this.players.includes(f.playerId)) continue;
        for (const c of f.commands) {
          try {
            this.command(codec.decode(c.payload));
          } catch {
          }
        }
      }
      if (this.paused && !this.room) {
        this.tick = tick + 1;
        return;
      }
      const w = this.world;
      this.previous = new Map(w.units.map((u) => [u.id, { x: u.x, y: u.y, z: u.z, angle: u.angle }]));
      this.previousBoss = { x: w.boss.x, y: w.boss.y };
      this.renderAt = performance.now();
      w.advanceAutoTaps(0.05);
      for (let i = 0; i < 6 * this.speed; i++) w.step(CONFIG.fixedStep);
      this.tick = tick + 1;
    }
    command(c) {
      const w = this.world;
      switch (c.type) {
        case "feed":
          w.tapFood("manual");
          break;
        case "mode":
          if (["breed", "merge"].includes(c.value)) w.mode = c.value;
          break;
        case "scene":
          if (["farm", "raid"].includes(c.value)) w.setScene(c.value);
          break;
        case "speed":
          if ([1, 4].includes(c.value)) this.speed = c.value;
          break;
        case "invest":
          if (typeof c.id === "string") w.progress.invest(c.id);
          break;
      }
    }
    presentation(now) {
      const w = this.world;
      if (!this.previous || this.paused) return w;
      const alpha = Math.max(0, Math.min(1, (now - this.renderAt) / 50));
      const view = Object.create(w);
      if (this.previousBoss) view.boss = { ...w.boss, x: this.previousBoss.x + (w.boss.x - this.previousBoss.x) * alpha, y: this.previousBoss.y + (w.boss.y - this.previousBoss.y) * alpha };
      view.units = w.units.map((u) => {
        const p = this.previous.get(u.id);
        if (!p) return u;
        const shown = Object.create(Object.getPrototypeOf(u));
        Object.assign(shown, u, { x: p.x + (u.x - p.x) * alpha, y: p.y + (u.y - p.y) * alpha, z: p.z + (u.z - p.z) * alpha });
        return shown;
      });
      return view;
    }
    pulse(now) {
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
  var CombatFeel = class {
    constructor(audio) {
      this.audio = audio;
      this.world = null;
      this.sequence = 0;
      this.effects = [];
      this.poses = /* @__PURE__ */ new Map();
      this.bossHit = null;
      this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.counts = { hits: 0, landings: 0 };
    }
    observe(world, now) {
      if (this.world !== world) {
        this.world = world;
        this.sequence = world.eventSequence;
        this.effects = [];
        this.poses.clear();
        this.bossHit = null;
        return;
      }
      for (const e of world.notices) {
        if (e.sequence <= this.sequence) continue;
        if (["boss-hit", "unit-hit", "unit-land", "attack-launch", "boss-launch"].includes(e.kind)) {
          this.effects.push({ ...e, at: now });
          if (this.effects.length > 48) this.effects.shift();
          if (e.kind === "boss-hit") {
            this.counts.hits++;
            this.bossHit = { ...e, at: now };
            this.audio.sound("strike", e.species || 0);
          }
          if (e.kind === "unit-hit") {
            const u = world.units.find((u2) => u2.id === e.unit);
            if (u) this.poses.set(u.id, { at: now, until: now + 180, heldUntil: now + (this.reduced ? 0 : 35), x: u.x, y: u.y, z: u.z, strength: e.strength });
            this.counts.hits++;
            this.audio.sound(e.attackKind === "sweep" ? "heavy" : "strike");
          }
          if (e.kind === "unit-land") {
            this.counts.landings++;
            if (e.strength > 0.2) this.audio.sound("land");
          }
          if (e.kind === "boss-launch") this.audio.sound("launch");
        }
      }
      this.sequence = world.eventSequence;
      this.effects = this.effects.filter((e) => now - e.at < 430);
      for (const [id, p] of this.poses) if (now > p.until) this.poses.delete(id);
    }
    unit(u, now) {
      const p = this.poses.get(u.id);
      if (!p || now > p.heldUntil) return u;
      return Object.assign(Object.create(Object.getPrototypeOf(u)), u, { x: p.x, y: p.y, z: p.z });
    }
    squash(id, now) {
      const p = this.poses.get(id);
      return !p || this.reduced ? 0 : Math.sin(Math.min(1, (now - p.at) / 180) * Math.PI) * Math.min(0.2, p.strength * 0.12);
    }
    boss(now) {
      const e = this.bossHit;
      if (!e || this.reduced) return { x: 0, y: 0, squash: 0 };
      const q = Math.min(1, (now - e.at) / 160), k = Math.sin(q * Math.PI) * (1 - q);
      return { x: -e.nx * k * 0.1, y: -e.ny * k * 0.1, squash: k * 0.035 };
    }
    draw(r, now) {
      for (const e of this.effects) {
        const q = (now - e.at) / 430;
        if (q < 0 || q > 1) continue;
        const c = r.ctx, heavy = e.attackKind === "sweep", impact = e.kind === "unit-hit" || e.kind === "boss-hit", landing = e.kind === "unit-land";
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

  // src/farm-app.js
  var $2 = (id) => document.getElementById(id);
  var storage = new FarmStorage();
  var networkTimer = null;
  var observedWorld = null;
  var imported = null;
  var active = null;
  var home = true;
  var attempt = null;
  var room = null;
  var solo = null;
  var noticeSequence = 0;
  var lastSave = 0;
  var treePause = false;
  var renderer = new Diorama($2("world"));
  var fail = (error) => {
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
    active = new FarmSession(world, { ...options, onError: fail });
    noticeSequence = world.eventSequence;
    observedWorld = world;
    if (options.room) networkTimer = setInterval(() => active.pulse(performance.now()), 50);
    return active;
  }
  install(new Garden());
  active.paused = true;
  function persist() {
    if (active && !room && !home) {
      const ok = storage.save(active.world);
      $2("saveNotice").textContent = ok ? "" : storage.error;
      $2("treeStorage").hidden = ok;
    }
  }
  function refreshStart() {
    if (room || attempt) {
      $2("newConfirm").hidden = true;
      $2("importConfirm").hidden = true;
      imported = null;
    }
    $2("continueGame").disabled = !storage.world;
    $2("exportSave").disabled = !storage.raw;
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
    if (push) history.pushState(null, "", value ? "#/" : active.world.scene === "raid" ? "#/raid" : "#/farm");
    refreshStart();
    if (value) $2("continueGame").focus();
  }
  function start(world, push = true) {
    foodFeel.unlock();
    install(world);
    setHome(false, push);
  }
  $2("continueGame").onclick = () => {
    if (storage.world) start(restore(snapshot(storage.world)));
  };
  $2("newGame").onclick = () => {
    if (storage.raw && !$2("newConfirm").hidden) return;
    if (storage.raw) {
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
    if (!storage.raw) return;
    const url = URL.createObjectURL(new Blob([storage.raw], { type: "application/json" })), a = document.createElement("a");
    a.href = url;
    a.download = "budmori-save-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  };
  $2("importSave").onclick = () => $2("saveFile").click();
  $2("saveFile").onchange = async () => {
    const file = $2("saveFile").files[0];
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw Error("저장 파일이 너무 큽니다.");
      const text = await file.text();
      const { parseSave: parseSave2 } = await Promise.resolve().then(() => (init_farm_storage(), farm_storage_exports));
      parseSave2(text);
      imported = text;
      $2("importConfirm").hidden = false;
    } catch (e) {
      $2("saveNotice").textContent = e.message;
    } finally {
      $2("saveFile").value = "";
    }
  };
  $2("cancelImport").onclick = () => {
    imported = null;
    $2("importConfirm").hidden = true;
  };
  $2("confirmImport").onclick = () => {
    if (room || attempt) return;
    try {
      if (imported) storage.import(imported);
      imported = null;
      $2("importConfirm").hidden = true;
      refreshStart();
    } catch (e) {
      $2("saveNotice").textContent = e.message;
    }
  };
  $2("onlineGame").onclick = async () => {
    if (attempt || room) return;
    persist();
    solo = restore(snapshot(storage.world || active.world));
    const controller = attempt = new AbortController();
    refreshStart();
    $2("sessionNotice").textContent = "함께할 정원을 찾고 있어요…";
    try {
      const next = await BloomGamekitTransport.createNostrPublicRoom({ namespace: "budmori-public-v1", simulationVersion: "budmori-farm-" + COMPATIBILITY, maxPlayers: 5, discoveryMs: 1500, totalTimeoutMs: 6e4, peerTimeoutMs: 2e4, signal: controller.signal, onStatus: (e) => {
        if (attempt === controller) $2("sessionNotice").textContent = { discovering: "함께할 정원을 찾고 있어요…", hosting: "새 정원을 열고 있어요…", joining: "정원에 연결하고 있어요…" }[e.type] || "함께할 정원을 준비하고 있어요…";
      } });
      if (controller.signal.aborted) {
        next.close();
        return;
      }
      room = next;
      install(new Garden(BloomGamekitDeterministic.hashBytes(new TextEncoder().encode(next.sessionId))), { room: next });
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
    const leaving = room;
    $2("leaveOnline").disabled = true;
    try {
      await active.session.leave();
    } catch {
    } finally {
      active.dispose();
      leaving.close();
      room = null;
      install(solo || new Garden());
      solo = null;
      $2("sessionNotice").textContent = "개인 정원으로 돌아왔어요.";
      $2("leaveOnline").disabled = false;
      setHome(true);
    }
  };
  function scene(value, push = true) {
    foodFeel.unlock();
    active.queue("scene", { value });
    if (push) history.pushState(null, "", value === "raid" ? "#/raid" : "#/farm");
  }
  $2("farm").onclick = () => scene("farm");
  $2("raid").onclick = () => scene("raid");
  $2("return").onclick = () => scene("farm");
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
    const p = active.world.progress, labels = { eat: "식사", birth: "번식", merge: "합체", hit: "보스 타격" };
    $2("treeNodes").innerHTML = TREE_NODES.map((n) => {
      const l = p.levels[n.id], goal = n.goal * (l + 1), parent = TREE_NODES.find((v) => v.id === n.parent);
      return `<article class="tree-node" data-ready="${p.ready(n)}"><div class="node-heading"><span class="node-icon" aria-hidden="true">${n.icon}</span><h3>${n.name}</h3><span>${l}/4</span></div><p>${n.description}</p><div class="node-values">${n.value(l)}${l < 4 ? ` <span>→ ${n.value(l + 1)}</span>` : ""}</div><progress max="${goal}" value="${Math.min(goal, p.records[n.metric])}"></progress><small>${l === 4 ? "완료" : `${labels[n.metric]} ${p.records[n.metric]}/${goal}${parent && !p.levels[parent.id] ? ` · ${parent.name} 1 필요` : ""}`}</small><button data-invest="${n.id}" ${p.ready(n) ? "" : "disabled"}>${l === 4 ? "✓" : "+"}<span class="sr-only">${n.name} 투자</span></button></article>`;
    }).join("");
  }
  function panel(id, open, push = true) {
    if (open) {
      if ($2("treePanel").hidden && $2("helpPanel").hidden) treePause = active.paused;
      if (!room) active.paused = true;
      $2("treePanel").hidden = id !== "treePanel";
      $2("helpPanel").hidden = id !== "helpPanel";
      if (id === "treePanel") drawTree();
      $2(id).querySelector("button").focus();
    } else {
      $2(id).hidden = true;
      if (!room) active.paused = treePause;
      $2(id === "treePanel" ? "tree" : "help").focus();
    }
    $2("tree").setAttribute("aria-expanded", !$2("treePanel").hidden);
    $2("help").setAttribute("aria-expanded", !$2("helpPanel").hidden);
    if (push) history.pushState(null, "", open ? id === "treePanel" ? "#/growth" : "#/help" : active.world.scene === "raid" ? "#/raid" : "#/farm");
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
  $2("treePanel").onkeydown = (e) => {
    if (e.key === "Tab") {
      const f = [...$2("treePanel").querySelectorAll("button:not(:disabled)")], i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0 || !e.shiftKey && i === f.length - 1) {
        e.preventDefault();
        f[e.shiftKey ? f.length - 1 : 0].focus();
      }
    }
  };
  var canvas = $2("world");
  canvas.addEventListener("pointerdown", () => foodFeel.unlock());
  window.addEventListener("blur", persist);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      persist();
      active.loop.resetTiming();
    }
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$2("treePanel").hidden) panel("treePanel", false);
      else if (!$2("helpPanel").hidden) panel("helpPanel", false);
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
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    persist();
    fail(Error("그래픽 연결이 끊겼어요. 새로고침해 다시 이어가 주세요."));
  });
  function route() {
    const r = location.hash;
    if (r === "#/" || !r) {
      setHome(true, false);
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
      else {
        install(new Garden());
        home = false;
        document.body.dataset.home = "false";
        $2("startScreen").hidden = true;
      }
    }
    if (r === "#/help" || r === "#/growth") panel(r === "#/help" ? "helpPanel" : "treePanel", true, false);
    else {
      if (!$2("treePanel").hidden) panel("treePanel", false, false);
      if (!$2("helpPanel").hidden) panel("helpPanel", false, false);
      scene(r === "#/raid" ? "raid" : "farm", false);
    }
  }
  window.addEventListener("popstate", route);
  function sync(now) {
    const w = active.world, raid = w.scene === "raid";
    for (const [id, value] of [["farm", !raid], ["raid", raid], ["breed", w.mode === "breed"], ["merge", w.mode === "merge"]]) $2(id).setAttribute("aria-pressed", value);
    $2("farmControls").hidden = raid || home;
    $2("raidControls").hidden = !raid || home;
    $2("bossbar").hidden = !raid || home;
    $2("roles").hidden = !raid || home;
    $2("count").textContent = w.units.length;
    $2("starter").textContent = w.units.length >= CONFIG.cap ? "정원이 가득해요" : `새싹까지 ${Math.ceil(CONFIG.starterSeconds / w.progress.rate("production") - w.starter)}초`;
    $2("bossHealth").style.width = w.boss.hp / w.boss.maxHp * 100 + "%";
    $2("battleOutcome").textContent = w.encounter.outcome === "victory" ? "승리 · 모두 정원으로 돌아갈 수 있어요" : w.encounter.outcome === "defeat" ? "휴식이 필요해요 · 정원에서 다시 준비해요" : "";
    $2("battleOutcome").hidden = home || !raid || w.running;
    $2("speed").textContent = active.speed + "×";
    $2("pause").disabled = !!room;
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
    $2("connection").hidden = !room;
    $2("connection").textContent = room ? active.session.failure ? "연결이 끊겼어요 · 시작 화면에서 나갈 수 있어요" : `함께 ${active.players.length}명 · ${active.session.ready ? "연결됨" : "동기화 중"}` : "";
    if (now - lastSave > 3e3) {
      lastSave = now;
      persist();
    }
  }
  function frame(now) {
    if (room || !home && !document.hidden) active.pulse(now);
    combatFeel.observe(active.world, now);
    renderer.render(active.presentation(now), combatFeel, now);
    sync(now);
    requestAnimationFrame(frame);
  }
  $2("productVersion").textContent = PRODUCT_VERSION;
  $2("startVersion").textContent = PRODUCT_VERSION + " · 농장과 거대 보스";
  setHome(true, false);
  if (location.hash && location.hash !== "#/") route();
  requestAnimationFrame(frame);
  globalThis.BUDMORI = { get sim() {
    return active.world;
  }, get runtime() {
    return active;
  }, get room() {
    return room;
  }, renderer, storage, foodFeel, combatFeel, CONFIG, ATTACK_TYPES, Ballistics, ArenaGeometry, version: PRODUCT_VERSION };
})();
