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
        get armyHealth() {
          return this.units.reduce((sum, u) => ({ current: sum.current + Math.max(0, Math.min(stats(u.tier).hp, u.hp)), max: sum.max + stats(u.tier).hp, living: sum.living + (u.hp > 0 ? 1 : 0), total: sum.total + 1 }), { current: 0, max: 0, living: 0, total: 0 });
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
            if (this.scene === "raid" && u.hp <= 0 && u.z === 0 && u.vz === 0) {
              u.vx = u.vy = 0;
            }
            if (this.scene === "raid" && this.running) u.ability.afterMove(this, oldPosition);
            if (oldZ > 0 && u.z === 0) {
              this.metrics.landings++;
              if (this.scene === "raid") this.combat("unit-land", { unit: u.id, x: u.x, y: u.y, z: 0, strength: Math.min(1, Math.hypot(u.vx, u.vy) / 8) });
              else if (Math.hypot(u.vx, u.vy) > 1) this.emit("land", u.x, u.y);
            }
            this.boundBody(u, this.scene, u.radius);
          }
          for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
            if (this.scene === "raid" && (units[i].hp <= 0 || units[j].hp <= 0)) continue;
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
          if (u.hp <= 0 || u.z > b.height) return;
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
          const b = this.boss, spec = ATTACK_TYPES[u.species], dx = u.x - b.x, dy = u.y - b.y, n = Math.hypot(dx, dy) || 1;
          const stand = b.radius + spec.stand + (u.tier - 1) * 0.12, min = stand - 0.55, max = stand + 0.55;
          if (n > max || spec.kind === "lob" && n < min) {
            const slot = ArenaGeometry.clamp({ x: b.x + dx / n * stand, y: b.y + dy / n * stand }, "raid", u.radius);
            this.steer(u, slot.x, slot.y, dt, 4.1);
            return;
          }
          u.vx = u.vy = 0;
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
      PRODUCT_VERSION = "0.4.1";
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

  // src/seed-art.js
  var SEED_STYLES = Object.freeze([
    { name: "돌격 완두콩", shell: "#8fac68", light: "#c7dc8d", shade: "#688851", edge: "#49684a", germ: "#48754b" },
    { name: "곡사 수수알", shell: "#dbb76b", light: "#f6d995", shade: "#b28c4c", edge: "#846b43", germ: "#84914d" },
    { name: "도약 콩알", shell: "#b58b9c", light: "#e5b4bd", shade: "#906d87", edge: "#6c556e", germ: "#87a35b" }
  ]);
  var ellipse = (c, x, y, rx, ry, color, a = 0) => {
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), a, 0, Math.PI * 2);
    c.fill();
  };
  var line = (c, points, color, width) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.stroke();
  };
  function pose(u, time, extra = 0) {
    const dead = u.hp <= 0 || u.down > 0, phase = u.ability?.phase || "idle", e = u.ability?.elapsed || 0, kind = u.species, walk = dead ? 0 : Math.min(1, Math.hypot(u.vx || 0, u.vy || 0));
    let sx = 1, sy = 1, tilt = Math.sin(time * 9 + (u.seed || 0)) * 0.04 * walk, open = 0;
    if (dead) {
      sx = 1.17;
      sy = u.z > 0.1 ? 0.76 : 0.57;
      tilt = u.z > 0.1 ? 0.48 : 0.2;
    } else if (phase === "windup") {
      const q = Math.min(1, e / [0.28, 0.38, 0.32][kind]);
      sy = 1 - q * [0.23, 0.1, 0.32][kind];
      sx = 1 / Math.sqrt(sy);
      tilt = -q * 0.1;
      if (kind === 1) open = q;
    } else if (phase === "active") {
      if (kind === 0) {
        sx = 1.25;
        sy = 0.8;
        tilt = Math.cos(u.angle || 0) * -0.12;
      }
      if (kind === 2) {
        sy = 1.2;
        sx = 0.88;
        tilt = Math.cos(u.angle || 0) * 0.12;
      }
    } else if (phase === "recover") {
      const q = Math.max(0, 1 - e / 0.3);
      sy = 1 - q * 0.12;
      sx = 1 / Math.sqrt(sy);
      if (kind === 1) open = q;
    }
    if (!dead) {
      sy = Math.max(0.55, sy - (u.bounce || 0) * 0.6 - extra);
      sx *= Math.sqrt(1 / Math.max(0.75, 1 - extra));
    }
    return { sx, sy, tilt, open, dead };
  }
  function face(c, r, expression, pixelRatio = 1) {
    const ink = "#293e36", ey = -r * 0.07, gap = r * 0.3, stroke = Math.max(pixelRatio * 0.65, r * 0.085);
    for (const side of [-1, 1]) {
      const x = side * gap;
      if (expression === "dead") {
        line(c, [[x - r * 0.1, ey - r * 0.11], [x + r * 0.1, ey + r * 0.11]], ink, stroke);
        line(c, [[x - r * 0.1, ey + r * 0.11], [x + r * 0.1, ey - r * 0.11]], ink, stroke);
      } else if (expression === "happy") line(c, [[x - r * 0.1, ey], [x, ey - r * 0.095], [x + r * 0.1, ey]], ink, stroke);
      else {
        ellipse(c, x, ey, r * 0.092, r * (expression === "surprised" ? 0.15 : 0.13), ink);
        if (r > 9 * pixelRatio) ellipse(c, x - r * 0.018, ey - r * 0.045, r * 0.025, r * 0.035, "#fffae7");
      }
    }
    if (expression === "surprised") ellipse(c, 0, r * 0.24, r * 0.1, r * 0.13, ink);
    else if (expression === "dead") line(c, [[-r * 0.12, r * 0.25], [r * 0.12, r * 0.25]], ink, stroke);
    else line(c, [[-r * 0.14, r * 0.18], [0, r * (expression === "hungry" ? 0.12 : 0.29)], [r * 0.14, r * 0.18]], ink, stroke);
    if (expression === "happy") for (const side of [-1, 1]) ellipse(c, side * r * 0.48, r * 0.17, r * 0.11, r * 0.055, "#e9a39c");
  }
  function draw(c, species, x, y, r, u, time, options = {}) {
    const style = options.boss ? { shell: "#ae7853", light: "#dfad79", shade: "#885d47", edge: "#614b3c", germ: "#77915a" } : SEED_STYLES[species];
    const p = pose(u, time, options.extra || 0), pixel = options.pixelRatio || 1;
    c.save();
    c.translate(x, y - r * 0.79);
    c.rotate(p.tilt);
    c.scale(p.sx, p.sy);
    c.globalAlpha = p.dead ? 0.84 : 1;
    const expression = p.dead ? "dead" : options.expression || "normal";
    if (options.faceOnly) {
      face(c, r, expression, pixel);
      c.restore();
      return;
    }
    if (species === 1 && !options.boss) {
      for (const side of [-1, 1]) {
        ellipse(c, side * r * (0.56 + p.open * 0.24), -r * (0.09 + p.open * 0.12), r * 0.4, r * (0.83 + p.open * 0.1), style.edge, side * (0.17 + p.open * 0.52));
        ellipse(c, side * r * (0.57 + p.open * 0.24), -r * (0.12 + p.open * 0.12), r * 0.32, r * 0.75, style.shade, side * (0.17 + p.open * 0.52));
      }
    }
    if (!p.dead) {
      const fold = species === 2 && u.ability?.phase === "windup" ? 0.65 : 0;
      line(c, [[0, -r * 0.7], [r * 0.06, -r * (1.12 - fold)]], style.germ, r * 0.095);
      const leaves = Math.max(1, Math.min(4, u.tier || 1));
      for (let k = 0; k < leaves; k++) {
        const side = k % 2 ? -1 : 1, yy = -r * (1.05 - fold) + k * r * 0.12;
        ellipse(c, side * r * (0.19 + k * 0.015), yy, r * (0.24 - k * 0.018), r * 0.1, style.germ, side * -0.48);
      }
    }
    ellipse(c, 0, 0, r, r * 0.87, style.edge);
    ellipse(c, 0, -r * 0.035, r * 0.93, r * 0.8, style.shade);
    ellipse(c, -r * 0.055, -r * 0.16, r * 0.88, r * 0.68, u.flash > 0.09 ? "#f4edc4" : style.shell);
    ellipse(c, -r * 0.25, -r * 0.43, r * 0.39, r * 0.18, style.light, -0.32);
    if (species === 2 && !options.boss) {
      ellipse(c, r * 0.66, r * 0.17, r * 0.18, r * 0.36, style.shade, -0.22);
      ellipse(c, r * 0.69, r * 0.15, r * 0.09, r * 0.24, "#e6d0a5", -0.22);
    } else if (options.boss) {
      c.fillStyle = style.shell;
      c.beginPath();
      c.moveTo(-r * 0.36, -r * 0.62);
      c.quadraticCurveTo(0, -r * 1.16, r * 0.27, -r * 0.69);
      c.closePath();
      c.fill();
      for (const side of [-1, 1]) line(c, [[side * r * 0.73, -r * 0.23], [side * r * 0.81, r * 0.1], [side * r * 0.64, r * 0.49]], style.light, r * 0.035);
    }
    for (let k = 0; k < (u.tier || 1) - 1; k++) for (const side of [-1, 1]) ellipse(c, side * r * (0.57 - k * 0.035), r * (0.28 + k * 0.14), r * 0.045, r * 0.065, style.light, side * -0.3);
    if (!options.hideFace) face(c, r, expression, pixel);
    c.restore();
  }
  var SeedArt = Object.freeze({ draw, pose, face, styles: SEED_STYLES });

  // src/farm-renderer.js
  init_farm_model();
  var { WebGLDevice, VectorContext } = globalThis.BloomGamekitRendering;
  var COLORS = SEED_STYLES.map((s) => s.shell);
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
    drawUnit(u, sim) {
      u = this.feel ? this.feel.unit(u, this.now) : u;
      const dead = u.hp <= 0, walk = dead ? 0 : Math.min(1, Math.hypot(u.vx, u.vy)), bob = u.z === 0 ? Math.abs(Math.sin(sim.time * 9 + u.seed)) * 0.1 * walk : 0, p = this.project(u.x, u.y, u.z + bob);
      const r = Math.max(u.size * this.scale * 0.78, (sim.scene === "raid" ? 4.5 : 11) * this.pixelRatio);
      const joy = sim.effects.some((e) => ["eat", "birth", "merge"].includes(e.kind) && e.life < 0.85 && Math.hypot(e.x - u.x, e.y - u.y) < 1.2);
      SeedArt.draw(this.ctx, u.species, p.x, p.y, r, u, sim.time, { pixelRatio: this.pixelRatio, extra: this.feel?.squash(u.id, this.now) || 0, expression: u.z > 0.5 || u.stun > 0 ? "surprised" : joy ? "happy" : !u.fed ? "hungry" : "normal" });
    }
    bossPose(world) {
      const b = world.boss, k = this.feel?.boss(this.now) || { x: 0, y: 0, squash: 0 };
      return { b, p: this.project(b.x + k.x, b.y + k.y, 0), r: this.scale * b.radius * 1.16, k };
    }
    bossSkin(world, faceOnly = false) {
      const { b, p, r, k } = this.bossPose(world), wind = b.phase.endsWith("windup"), active2 = b.phase === "strike" || b.phase === "sweep";
      const skin = { species: 0, tier: 4, hp: b.hp, down: 0, z: 0, vx: 0, vy: 0, seed: 0, flash: b.flash, bounce: 0, ability: { phase: wind ? "windup" : active2 ? "active" : "idle", elapsed: wind ? 0.24 : 0 } };
      SeedArt.draw(this.ctx, 0, p.x, p.y, r, skin, world.time, { pixelRatio: this.pixelRatio, boss: true, hideFace: !faceOnly, faceOnly, extra: k.squash, expression: b.hp <= 0 ? "dead" : wind ? "surprised" : active2 ? "happy" : "normal" });
    }
    drawBoss(world) {
      this.bossSkin(world);
    }
    drawBossFace(world) {
      this.bossSkin(world, true);
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
      this.session = globalThis.BloomGamekitRollback.createRoomSession({ adapter, players: room2?.players || ["solo"], localPlayerId: this.localPlayerId, sessionId: room2?.sessionId || "budmori-solo", simulationVersion: "budmori-farm-" + PRODUCT_VERSION, seed: world.seed, inputSize: 1, mode: room2 ? "online" : "local", room: room2 || void 0, profile: { ...globalThis.BloomGamekitRollback.profiles.action, mode: "lockstep", tickRate: 20, baseInputDelayTicks: room2 ? 2 : 0, minInputDelayTicks: room2 ? 2 : 0, maxInputDelayTicks: room2 ? 2 : 0, adaptiveInputDelay: false, pacingPolicy: "none", checksumInterval: 20, stateHistorySize: 32, maxSnapshotBytes: 8388608 }, membership: { maxPlayers: 5, transitionTimeoutMs: 3e4, reconnectGraceMs: 1e4, maxCatchupSteps: 4 }, onEvent });
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
      const next = await BloomGamekitTransport.createNostrPublicRoom({ namespace: "budmori-public-v1", simulationVersion: "budmori-farm-" + PRODUCT_VERSION, maxPlayers: 5, discoveryMs: 1500, totalTimeoutMs: 6e4, peerTimeoutMs: 2e4, signal: controller.signal, onStatus: (e) => {
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
    const army = w.armyHealth;
    $2("allyHealth").style.width = (army.max ? army.current / army.max * 100 : 0) + "%";
    $2("allyHealthText").textContent = Math.ceil(army.current) + " / " + Math.ceil(army.max) + " HP · " + army.living + "/" + army.total + " 생존";
    $2("bossHealthText").textContent = Math.ceil(w.boss.hp) + " / " + w.boss.maxHp + " HP";
    for (const [id, value, max] of [["allyHealth", army.current, army.max], ["bossHealth", w.boss.hp, w.boss.maxHp]]) {
      const el = $2(id);
      el.setAttribute("aria-valuenow", value);
      el.setAttribute("aria-valuemax", max);
    }
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
  globalThis.BUDMORI = { SeedArt, get sim() {
    return active.world;
  }, get runtime() {
    return active;
  }, get room() {
    return room;
  }, renderer, storage, foodFeel, combatFeel, CONFIG, ATTACK_TYPES, Ballistics, ArenaGeometry, version: PRODUCT_VERSION };
})();
