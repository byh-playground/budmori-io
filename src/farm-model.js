import { bossMouthWorldPoint } from './boss-vector-sockets.js';
const { SeededPRNG: SEEDED_PRNG } = globalThis.BloomGamekitDeterministic;
import {
    baseUnitStatsFor,
    applyDamageToTargets,
    applyHealing,
    resolveStatusDuration,
    resolveKnockback,
    scaleMoveSpeed,
    scaleAttackRecovery,
    scaleAttackArea,
} from './unit-stats.js';
import {
    UNIT_ABILITY_PROFILES as ATTACK_TYPES,
    abilityProfile,
    unitCapabilityComposition,
    speciesWithCapability,
} from './unit-abilities.js';
import { bossAcquisitionChance, bossStageStats, settleBossKill, grantPendingBossAcquisitions } from './boss-rewards.js';
import { createFarmBossProgress } from './farm-boss-stages.js';
import { SPECIES_COUNT } from './species-catalog.js';
import { createPlayerProgressionState } from './player-progression.js';
import { purchaseAbilityNode, purchaseFarmUpgrade, resetAbilityProgression } from './ability-progression.js';
import { createAbilityRuntimeSnapshot, isValidAbilityRuntimeSnapshot } from './ability-state.js';
import {
    FARM_UPGRADE_NODES,
    farmUpgradeRate,
    getAutoTapSeconds,
    getBreedCooldownSeconds,
    getFarmCapacity,
    getMergeCooldownSeconds,
} from './farm-upgrades.js';
import {
    MAX_BEAN_SPLIT_CHILDREN,
    getChestnutSpikeFanAngles,
    getWalnutGuardConfig,
    effectiveBarleyArmor,
} from './species-abilities.js';
import { composeUnitAttackCycles } from './unit-attack-capabilities.js';
import { MAX_UNIT_TIER, MAX_GRADE_MATERIAL_COUNT, mergeMaterialCostForTier } from './unit-grades.js';
import {
    BOSS_PATTERN_IDS,
    BOSS_PATTERN_CONFIG,
    BOSS_AIM_TURN_RATE,
    createBossPatternRuntime,
    chooseBossPattern,
} from './boss-patterns.js';
import { FACTION_CONFIG, hasFaction, areOpposingFactions } from './factions.js';
import { FixedSpatialGrid } from './spatial-grid.js';
const PRESENTATION_CLOCKS = new WeakMap();
const PRESENTATION_EVENT_TIMES = new WeakMap();
export function presentationEventTimeMs(event) {
    return PRESENTATION_EVENT_TIMES.get(event) ?? (Number.isFinite(event?.time) ? event.time * 1000 : 0);
}
export function bindPresentationClock(world, clock) {
    if (clock) {
        PRESENTATION_CLOCKS.set(world, clock);
    } else {
        PRESENTATION_CLOCKS.delete(world);
    }
}
// sim.js
const BREED_COOLDOWN_SECONDS = 10;
const FARM_MAX_UNITS = 100,
    RAID_PLAYER_UNITS = 100,
    RAID_MAX_PLAYERS = 4,
    RAID_PLAYER_ID_STRIDE = 1000000,
    MAX_BOSS_SUMMONS = 10;
const RAID_MAX_UNITS = RAID_PLAYER_UNITS * RAID_MAX_PLAYERS;
const WORLD_ARENA = Object.freeze({
    radiusX: 23,
    radiusY: 17,
});
const UNIT_RADIUS_FOR_TIER = (tier) => 0.25 + 0.055 * tier;
// Runtime configuration is separate from saved world fields and their import
// migration. Only already-established capacity/growth relations are derived.
const CONFIG = Object.freeze({
    factions: FACTION_CONFIG,
    farm: Object.freeze({
        arena: WORLD_ARENA,
        capacity: Object.freeze({
            base: 50,
            max: FARM_MAX_UNITS,
            battleUnits: FARM_MAX_UNITS * (1 + MAX_BEAN_SPLIT_CHILDREN) + MAX_BOSS_SUMMONS,
        }),
        maxUnitId: 999999999,
        starterSeconds: 60,
        breeding: Object.freeze({
            cooldownSeconds: BREED_COOLDOWN_SECONDS,
            growthSeconds: BREED_COOLDOWN_SECONDS / 2,
            matureMeals: 3,
        }),
        merge: Object.freeze({
            animationSeconds: 0.85,
            maxMaterials: MAX_GRADE_MATERIAL_COUNT,
        }),
        bossEvent: Object.freeze({
            spawnChance: 0.01,
            fadeSeconds: 0.5,
            celebrationSeconds: 1,
        }),
    }),
    raid: Object.freeze({
        capacity: Object.freeze({
            playerUnits: RAID_PLAYER_UNITS,
            players: RAID_MAX_PLAYERS,
            units: RAID_MAX_UNITS,
            battleUnits: RAID_MAX_UNITS * (1 + MAX_BEAN_SPLIT_CHILDREN) + MAX_BOSS_SUMMONS,
            projectiles: RAID_MAX_UNITS * (1 + MAX_BEAN_SPLIT_CHILDREN) * 4 + 40,
        }),
        ids: Object.freeze({
            playerStride: RAID_PLAYER_ID_STRIDE,
            summonBase: RAID_MAX_PLAYERS * RAID_PLAYER_ID_STRIDE + RAID_PLAYER_UNITS + 1,
        }),
        arena: WORLD_ARENA,
        dropHeight: 3,
        buff: Object.freeze({
            duration: 3,
            cooldown: 12,
            damage: 1.25,
        }),
    }),
    scatter: Object.freeze({
        minRadius: UNIT_RADIUS_FOR_TIER(1) * 4,
        maxRadius: UNIT_RADIUS_FOR_TIER(1) * 10,
        bodyMargin: 0.08,
        hysteresis: 0.18,
    }),
    unit: Object.freeze({
        speciesCount: SPECIES_COUNT,
        maxTier: MAX_UNIT_TIER,
        maxRadius: UNIT_RADIUS_FOR_TIER(MAX_UNIT_TIER),
        perceptionRange: 18,
        corpseRecoverySeconds: 60,
    }),
    boss: Object.freeze({
        maxSummons: MAX_BOSS_SUMMONS,
        summonIdBase: 5000000,
        radius: 4.4,
        height: 5.2,
        basicReach: 6.2,
        sweepReach: 6.5,
        weaponRadius: 0.85,
        chaseSpeed: 2.65,
    }),
    physics: Object.freeze({
        gravity: 19,
        fixedStep: 1 / 120,
    }),
});
function bossAttackArea(boss, unitRadius = 0, scene = 'raid', area = {}) {
    const ACTION = boss.patternRuntime?.active,
        CONFIG_LOCAL = BOSS_PATTERN_CONFIG[ACTION?.id];
    if (!CONFIG_LOCAL) {
        return null;
    }
    const PHASE = ACTION.phase,
        PAD = Math.max(0, unitRadius),
        ELAPSED = Math.max(0, ACTION.phaseElapsed || 0);
    area.x = boss.x;
    area.y = boss.y;
    area.angle = ACTION.aim ?? boss.angle;
    area.patternId = ACTION.id;
    area.phase = PHASE;
    area.elapsed = ELAPSED;
    area.active = PHASE === 'active';
    area.locked = !!ACTION.locked;
    area.progress =
        PHASE === 'recover'
            ? 1
            : CLAMP(ELAPSED / (PHASE === 'windup' ? CONFIG_LOCAL.windup : CONFIG_LOCAL.active || 1), 0, 1);
    if (ACTION.id === 'attack.sweep-360') {
        // resolveBossCircle hits the whole disk, not a ring around the weapon tip.
        area.kind = 'sweep';
        area.reach = CONFIG_LOCAL.reach + PAD;
    } else if (ACTION.id === 'attack.front-slam') {
        area.kind = 'sector';
        area.reach = CONFIG_LOCAL.reach + PAD;
        area.sector = CONFIG_LOCAL.sector;
    } else if (ACTION.id === 'attack.charge') {
        area.kind = 'charge';
        area.width = boss.radius + PAD;
        const SX = ACTION.start?.x ?? boss.x,
            SY = ACTION.start?.y ?? boss.y,
            DX = Math.cos(area.angle),
            DY = Math.sin(area.angle);
        // The last physical substep is radially clamped, rather than clamping the
        // requested full reach (which can rotate and greatly overstate the lane).
        const RX = CONFIG[scene].arena.radiusX - boss.radius - 0.25,
            RY = CONFIG[scene].arena.radiusY - boss.radius - 0.25;
        const A_LOCAL = (DX * DX) / (RX * RX) + (DY * DY) / (RY * RY),
            B_LOCAL = 2 * ((SX * DX) / (RX * RX) + (SY * DY) / (RY * RY)),
            C_LOCAL = (SX * SX) / (RX * RX) + (SY * SY) / (RY * RY) - 1;
        const EXIT = Math.max(
                0,
                (-B_LOCAL + Math.sqrt(Math.max(0, B_LOCAL * B_LOCAL - 4 * A_LOCAL * C_LOCAL))) / (2 * A_LOCAL),
            ),
            STEP = CONFIG_LOCAL.speed * CONFIG.physics.fixedStep;
        const DISTANCE =
            EXIT < CONFIG_LOCAL.reach
                ? Math.min(CONFIG_LOCAL.reach, (Math.floor(EXIT / STEP + 1e-8) + 1) * STEP)
                : CONFIG_LOCAL.reach;
        const EX = SX + DX * DISTANCE,
            EY = SY + DY * DISTANCE,
            K = Math.max(1, Math.hypot(EX / RX, EY / RY));
        area.endX = PHASE === 'recover' ? boss.x : EX / K;
        area.endY = PHASE === 'recover' ? boss.y : EY / K;
        area.x = SX;
        area.y = SY;
    } else if (ACTION.id === 'attack.leap-slam') {
        area.kind = 'leap';
        area.width = boss.radius + PAD;
        area.reach = CONFIG_LOCAL.landingRadius + PAD;
        let x = ACTION.target?.x ?? boss.x;
        let y = ACTION.target?.y ?? boss.y;
        if (PHASE === 'windup') {
            const DX = x - boss.x,
                DY = y - boss.y,
                D_LOCAL = Math.hypot(DX, DY);
            if (D_LOCAL > CONFIG_LOCAL.reach) {
                x = boss.x + (DX / D_LOCAL) * CONFIG_LOCAL.reach;
                y = boss.y + (DY / D_LOCAL) * CONFIG_LOCAL.reach;
            }
            const RX = CONFIG[scene].arena.radiusX - boss.radius - 0.25,
                RY = CONFIG[scene].arena.radiusY - boss.radius - 0.25,
                K = Math.max(1, Math.hypot(x / RX, y / RY));
            x /= K;
            y /= K;
        }
        area.targetX = x;
        area.targetY = y;
        const SX = ACTION.start?.x ?? boss.x,
            SY = ACTION.start?.y ?? boss.y;
        area.x = SX;
        area.y = SY;
        if (PHASE === 'active' && ACTION.path) {
            area.progress = CLAMP(ELAPSED / ACTION.path.duration, 0, 1);
        }
    } else if (ACTION.id === 'attack.fan-sweep') {
        area.kind = 'fan';
        area.reach = CONFIG_LOCAL.reach;
        area.width = CONFIG_LOCAL.width + PAD;
        area.sector = CONFIG_LOCAL.sector;
    } else if (ACTION.id === 'summon.mouth-t1') {
        area.kind = 'summon';
    } else {
        return null;
    }
    return area;
}
const CLAMP = (x, a, b) => Math.max(a, Math.min(b, x));
const STATS = baseUnitStatsFor;
const MUTABLE_STATS = (tier, species) => ({
    ...STATS(tier, species),
});
const BODY = class Body {
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
            bounce: 0,
        });
    }
};
const KNOCKABLE = (baseLocal) =>
    class extends baseLocal {
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

// Simulation types are independent of the renderer skin mapping.
const ARENA_GEOMETRY = {
    bounds(scene = 'raid', margin = 0) {
        const ARENA = CONFIG[scene].arena;
        return {
            x: ARENA.radiusX - margin,
            y: ARENA.radiusY - margin,
        };
    },
    inside(p, scene = 'raid', margin = 0) {
        const R_LOCAL = this.bounds(scene, margin);
        return (p.x * p.x) / (R_LOCAL.x * R_LOCAL.x) + (p.y * p.y) / (R_LOCAL.y * R_LOCAL.y) <= 1;
    },
    clamp(p, scene = 'raid', margin = 0) {
        const R_LOCAL = this.bounds(scene, margin),
            K = Math.max(1, Math.hypot(p.x / R_LOCAL.x, p.y / R_LOCAL.y));
        return {
            x: p.x / K,
            y: p.y / K,
        };
    },
    segmentInsideCircle(x, y, tx, ty, cx, cy, radius) {
        const DX = tx - x,
            DY = ty - y,
            LENGTH = DX * DX + DY * DY,
            Q = LENGTH > 1e-12 ? CLAMP(((cx - x) * DX + (cy - y) * DY) / LENGTH, 0, 1) : 0;
        return (x + DX * Q - cx) ** 2 + (y + DY * Q - cy) ** 2 < radius * radius - 1e-10;
    },
    overlaps(a, b) {
        return (
            a.z <= b.z + b.height && a.z + a.height >= b.z && Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius
        );
    },
    // Swept XY cylinder versus finite Z interval; includes entity radii, never center-only.
    sweep(a, b, r, h, target) {
        const DX = b.x - a.x,
            DY = b.y - a.y,
            DZ = b.z - a.z,
            R = r + target.radius;
        let lo = 0;
        let hi = 1;
        const A = DX * DX + DY * DY,
            B = 2 * ((a.x - target.x) * DX + (a.y - target.y) * DY),
            C = (a.x - target.x) ** 2 + (a.y - target.y) ** 2 - R * R;
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
        const BOTTOM = target.z - h,
            TOP = target.z + target.height;
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
        const T = CLAMP(lo, 0, 1);
        return {
            x: a.x + DX * T,
            y: a.y + DY * T,
            z: a.z + DZ * T,
            t: T,
        };
    },
};
const BALLISTICS = {
    create(from, to, kind) {
        const DISTANCE = Math.hypot(to.x - from.x, to.y - from.y),
            MELEE = kind === 'ram' || kind === 'punch';
        return {
            from: {
                x: from.x,
                y: from.y,
                z: kind === 'lob' ? 0.45 : 0,
            },
            to: {
                ...to,
            },
            height: MELEE ? 0 : kind === 'lob' ? 2 : 2.7,
            duration: MELEE ? Math.max(0.12, DISTANCE / 10) : 0.65 + DISTANCE * 0.055,
        };
    },
    sample(path, q) {
        q = CLAMP(q, 0, 1);
        return {
            x: path.from.x + (path.to.x - path.from.x) * q,
            y: path.from.y + (path.to.y - path.from.y) * q,
            z: path.from.z * (1 - q) + 4 * path.height * q * (1 - q),
        };
    },
};
// The common cycle owns phase/elapsed/action identity only. Capability mixins
// own their action fields and behavior while preserving the saved wire shape.
class AttackCycle {
    constructor(owner) {
        this.owner = owner;
        this.phase = 'idle';
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
        if (this.phase !== 'idle' || U.down > 0 || U.stun > 0 || U.z > 0.1 || U.landingRecovery > 0) {
            return false;
        }
        this.phase = 'windup';
        this.elapsed = 0;
        this.action = {
            id: ++sim.attackSerial,
            target: {
                ...target,
            },
            targetId: target.id ?? 'boss',
            hit: false,
            path: null,
        };
        this.prepareAttack?.(sim);
        U.angle = Math.atan2(target.y - U.y, target.x - U.x);
        U.vx = U.vy = 0;
        sim.combatEvent('prepare', U, this.action);
        return true;
    }
    cancelForScatter() {
        // Keep resolved hit masks and already launched projectiles. Cancel only the
        // remaining motion/strikes; recovery is paid once, never reset by each hold.
        if (this.action?.pendingShots) {
            this.action.pendingShots.length = 0;
        }
        if (this.phase === 'windup' || this.phase === 'active') {
            this.phase = 'recover';
            this.elapsed = 0;
            this.owner.vx = this.owner.vy = 0;
        }
    }
    interrupt() {
        if (this.phase !== 'idle') {
            this.phase = 'recover';
            this.elapsed = 0;
            this.action = null;
        }
    }
    recover(sim, recoil = false) {
        this.phase = 'recover';
        this.elapsed = 0;
        const U = this.owner;
        if (recoil) {
            U.vx = -Math.cos(U.angle) * 2.2;
            U.vy = -Math.sin(U.angle) * 2.2;
        }
        sim.combatEvent('recover', U, this.action);
    }
    ready() {
        this.phase = 'idle';
        this.action = null;
        this.elapsed = 0;
    }
    update(sim, dt) {
        const U = this.owner;
        if (U.stun > 0 || U.down > 0) {
            this.interrupt();
            return true;
        }
        if (
            this.action &&
            (this.phase === 'windup' || this.phase === 'active') &&
            !(sim.attackTarget(U, this.action)?.hp > 0)
        ) {
            this.interrupt();
            return true;
        }
        if (this.phase === 'idle') {
            return false;
        }
        this.elapsed += dt;
        if (this.phase === 'windup') {
            U.vx *= Math.exp(-dt * 18);
            U.vy *= Math.exp(-dt * 18);
            if (this.elapsed >= this.spec.timing.windup) {
                this.elapsed = 0;
                this.phase = 'active';
                this.createAttackPath();
                sim.combatEvent('launch', U, this.action);
                this.launchAttack?.(sim);
            }
        } else if (this.phase === 'recover') {
            this.updateRecovery?.(sim);
            if (this.elapsed >= scaleAttackRecovery(this.spec.timing.recovery, U)) {
                this.ready();
            }
        }
        return true;
    }
}
const CREATE_UNIT_ATTACK_CYCLE = composeUnitAttackCycles(AttackCycle, {
    ArenaGeometry: ARENA_GEOMETRY,
    Ballistics: BALLISTICS,
    CONFIG,
});
const ATTACKING_BODY = (baseLocal) =>
    class extends baseLocal {
        constructor(...args) {
            super(...args);
            this.ability = null;
        } // Assigned after the unit profile is known.
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
const UNIT = class Unit extends ATTACKING_BODY(KNOCKABLE(BODY)) {
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
                y,
            },
            hp: STATS(tier, species).maxHp,
            down: 0,
            seed: id * 2.39996,
            ownerId: '',
            farmId: 0,
            dropLanded: true,
            isBattleOnlySummon: false,
            battleSummonKind: '',
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
            lifetime: '',
            chestnutBasicCycles: 0,
            landingRecovery: 0,
            walnutEmpoweredNextBasic: false,
            wheatCommandUntil: 0,
            wheatCommandCritBonus: 0,
            barleyArmorBreakUntil: 0,
            barleyArmorBreakReduction: 0,
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
        const GROWTH = this.mature
            ? 1
            : this.growthDuration > 0
              ? CLAMP(this.growthElapsed / this.growthDuration, 0, 1)
              : 1;
        return (0.55 + 0.1 * this.tier) * (0.5 + 0.5 * GROWTH);
    }
};
function contact(a, b) {
    const DX = b.x - a.x,
        DY = b.y - a.y,
        D_LOCAL = Math.hypot(DX, DY),
        R_LOCAL = a.radius + b.radius;
    if (Math.abs(a.z - b.z) > 0.65) {
        return false;
    }
    if (D_LOCAL >= R_LOCAL) {
        if (
            D_LOCAL < R_LOCAL + 0.22 &&
            a.z < 0.1 &&
            b.z < 0.1 &&
            a.ability.phase === 'idle' &&
            b.ability.phase === 'idle'
        ) {
            const K = ((R_LOCAL + 0.22 - D_LOCAL) * 0.035) / (D_LOCAL || 1);
            a.x -= DX * K;
            a.y -= DY * K;
            b.x += DX * K;
            b.y += DY * K;
        }
        return false;
    }
    const NX = D_LOCAL > 1e-6 ? DX / D_LOCAL : 1,
        NY = D_LOCAL > 1e-6 ? DY / D_LOCAL : 0,
        OVERLAP = R_LOCAL - D_LOCAL;
    a.x -= NX * OVERLAP * 0.5;
    a.y -= NY * OVERLAP * 0.5;
    b.x += NX * OVERLAP * 0.5;
    b.y += NY * OVERLAP * 0.5;
    const CLOSING = (a.vx - b.vx) * NX + (a.vy - b.vy) * NY;
    if (CLOSING > 0) {
        const IMPULSE = CLOSING * 0.57;
        const IMPULSE_A = resolveKnockback(IMPULSE, b, a),
            IMPULSE_B = resolveKnockback(IMPULSE, a, b);
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
const GARDEN = class Garden {
    constructor(seed = 731) {
        this.seed = seed;
        this.notices = [];
        this.eventSequence = 0;
        this.mergeTask = null;
        this.unitSpatial = new FixedSpatialGrid();
        this.foodSpatial = new FixedSpatialGrid();
        this._unitById = new Map();
        this._unitStepOrder = new Map();
        this._unitAliveState = new Map();
        this._liveFactionCounts = new Map();
        this._foodOrder = new Map();
        this._speciesGroups = Array.from(
            {
                length: CONFIG.unit.speciesCount,
            },
            () => [],
        );
        this._speciesTierGroups = Array.from(
            {
                length: CONFIG.unit.speciesCount * (CONFIG.unit.maxTier + 1),
            },
            () => [],
        );
        this._mergeEligibleGroups = Array.from(
            {
                length: CONFIG.unit.speciesCount * (CONFIG.unit.maxTier + 1),
            },
            () => [],
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
        for (const KEY of [
            'unitSpatial',
            'foodSpatial',
            '_unitById',
            '_unitStepOrder',
            '_unitAliveState',
            '_liveFactionCounts',
            '_foodOrder',
            '_speciesGroups',
            '_speciesTierGroups',
            '_mergeEligibleGroups',
            '_ownedSpeciesCounts',
            '_stepUnits',
            '_unitCandidates',
            '_foodCandidates',
            '_groundedFoods',
            '_groundedFoodCount',
            '_contactPending',
            '_contactExtra',
            '_contactQuery',
            '_contactSeen',
            '_contactGeneration',
            '_bossGridUnits',
            '_bossGroundUnits',
            '_bossQueryCandidates',
            '_bossHitCandidates',
            '_mergeNearestScratch',
            '_mergeMaterialsScratch',
            '_mergeIdScratch',
            '_spatialStepActive',
            '_spatialQueryDepth',
            '_unitSpatialDirty',
            '_foodSpatialDirty',
        ]) {
            Object.defineProperty(this, KEY, {
                enumerable: false,
            });
        }
        Object.defineProperties(this, {
            progressRevision: {
                value: 0,
                writable: true,
            },
            _progressTimerCheckpoint: {
                value: 0,
                writable: true,
            },
            localScatter: {
                value: {
                    active: false,
                    x: 0,
                    y: 0,
                    radius: CONFIG.scatter.minRadius,
                    handleX: 0,
                    handleY: 0,
                    generation: 0,
                },
            },
            _scatterStates: {
                value: new WeakMap(),
            },
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
            if (UNIT_LOCAL.hp > 0 && typeof UNIT_LOCAL.faction === 'string') {
                this._liveFactionCounts.set(
                    UNIT_LOCAL.faction,
                    (this._liveFactionCounts.get(UNIT_LOCAL.faction) || 0) + 1,
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
            if (FOOD.phase === 'grounded') {
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
        if (food.phase === 'grounded') {
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
        if (unit.hp > 0 && typeof unit.faction === 'string') {
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
        if (unit.hp > 0 && typeof unit.faction === 'string') {
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
            this._unitAliveState = new Map();
        }
        this._unitAliveState.set(unit, IS_ALIVE);
        if (typeof unit.faction === 'string') {
            this._adjustFactionCount(unit.faction, IS_ALIVE ? 1 : -1);
        }
    }
    _unitForId(id) {
        // Outside a controlled step/batch, public callers may have replaced units
        // or edited their IDs directly. Rebuild rather than trusting a dirty bit.
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
            this._contactQuery,
        );
        out.length = 0;
        for (const CANDIDATE of this._contactQuery) {
            const ORDER = this._unitStepOrder.get(CANDIDATE);
            if (ORDER !== undefined && ORDER >= minimumOrder && ORDER <= maximumOrder) {
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
        this._contactGeneration = (this._contactGeneration + 1) >>> 0;
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
            const MIDDLE = (low + high) >>> 1;
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
            if (
                this._unitIsActive(UNIT_LOCAL) &&
                hasFaction(UNIT_LOCAL, FACTION_CONFIG.PLAYER) &&
                UNIT_LOCAL.hp > 0 &&
                UNIT_LOCAL.dropLanded &&
                (!groundOnly || UNIT_LOCAL.z <= 0.1)
            ) {
                out[length++] = UNIT_LOCAL;
            }
        }
        out.length = length;
        out.sort((a, b) => a.id - b.id);
        return out;
    }
    static createRaidBattle(seed = 731, expectedPlayers = ['solo'], bossStage = null) {
        const W = new GARDEN(seed);
        W.units = [];
        W.food = [];
        W.scene = 'raid';
        W.running = false;
        W.boss = W.createBoss(bossStage?.species ?? W.randomBossSpecies());
        if (bossStage?.stage !== undefined) {
            W.configureBossStage(bossStage.stage, bossStage.species);
        }
        W.encounter = {
            outcome: 'idle',
            elapsed: 0,
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
            raid: 0,
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
            revision: 0,
        };
        this.projectiles = [];
        this.attackSerial = 0;
        this.projectileSerial = 0;
        this.raidSummonSerial = 0;
        this.bossSummonSerial = 0;
        this.combatLog = [];
        this.farmBossProgress = createFarmBossProgress(this.seed);
        this.mode = 'breed';
        this.scene = 'farm';
        this.running = false;
        this.encounter = {
            outcome: 'idle',
            elapsed: 0,
        };
        this.farmBossEvent = {
            phase: 'idle',
            elapsed: 0,
            outcome: 'idle',
            encounterId: 0,
            rewardStatus: 'none',
            rewardChance: 0,
            rewardRoll: 0,
            rewardUnitId: 0,
        };
        this.boss = this.createBoss();
        this.raidExpectedPlayers = ['solo'];
        this.raidRosters = [];
        this.raidDeploymentStarted = false;
        this.metrics = {
            births: 0,
            merges: 0,
            directHits: 0,
            contacts: 0,
            landings: 0,
            basicHits: 0,
            sweepHits: 0,
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
        if (this.scene === 'farm') {
            this.progressRevision++;
        }
    }
    hasProgressTimers() {
        return this.units.some(
            (unit) => !unit.isBattleOnlySummon && (unit.down > 0 || unit.cooldown > 0 || !unit.mature),
        );
    }
    get armyHealth() {
        return this.units
            .filter((u) => hasFaction(u, FACTION_CONFIG.PLAYER))
            .reduce(
                (sum, u) => {
                    const MAX_HP = STATS(u.tier, u.species).maxHp;
                    return {
                        current: sum.current + Math.max(0, Math.min(MAX_HP, u.hp)),
                        max: sum.max + MAX_HP,
                        living: sum.living + (u.hp > 0 ? 1 : 0),
                        total: sum.total + 1,
                    };
                },
                {
                    current: 0,
                    max: 0,
                    living: 0,
                    total: 0,
                },
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
        return this.scene === 'raid' ? this.raidRoster(unit?.ownerId)?.abilitySnapshot || null : this.playerProgression;
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
        const IN_COMBAT = this.running || this.farmBossEvent?.phase !== 'idle';
        const RESULT = purchaseAbilityNode(this.playerProgression, abilityId, nodeId, {
            location: this.scene,
            inCombat: IN_COMBAT,
            highestSpeciesTier: this.highestSpeciesTiers(),
        });
        if (RESULT.ok) {
            this.playerProgression = RESULT.state;
            this.markProgressChanged();
        }
        return RESULT;
    }
    investFarmUpgrade(nodeId) {
        const IN_COMBAT = this.running || this.farmBossEvent?.phase !== 'idle';
        const RESULT = purchaseFarmUpgrade(this.playerProgression, nodeId, {
            location: this.scene,
            inCombat: IN_COMBAT,
        });
        if (RESULT.ok) {
            this.playerProgression = RESULT.state;
            this.markProgressChanged();
        }
        return RESULT;
    }
    resetAbilityTree() {
        const IN_COMBAT = this.running || this.farmBossEvent?.phase !== 'idle';
        const RESULT = resetAbilityProgression(this.playerProgression, {
            location: this.scene,
            inCombat: IN_COMBAT,
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
        const PROJECTILE = {
            id: ID,
            owner: unit.id,
            targetId: action.targetId || 'boss',
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
            shotIndex: shot.shotIndex ?? 0,
        };
        if (popcornConfig) {
            Object.assign(PROJECTILE, {
                isPopcorn: true,
                popcornConfig: structuredClone(popcornConfig),
                landed: false,
                exploded: false,
                fuseRemaining: popcornConfig.fuseSeconds,
                damagedTargetIds: [],
            });
        }
        this.projectiles.push(PROJECTILE);
        return PROJECTILE;
    }
    speciesAbilityDamageMultiplier(unit) {
        return abilityProfile(unit.species).skillMultiplier;
    }
    spawnChestnutSpikes(unit, action, config) {
        if (this.projectiles.length + config.projectileCount > CONFIG.raid.capacity.projectiles) {
            return false;
        }
        const ANGLE = Math.atan2(action.target.y - unit.y, action.target.x - unit.x),
            ANGLES = getChestnutSpikeFanAngles(config, ANGLE),
            DISTANCE = Math.hypot(action.target.x - unit.x, action.target.y - unit.y),
            LENGTH = Math.max(abilityProfile(unit.species).range, DISTANCE) + this.boss.radius;
        for (let index = 0; index < ANGLES.length; index++) {
            const A_LOCAL = ANGLES[index],
                TARGET = {
                    x: unit.x + Math.cos(A_LOCAL) * LENGTH,
                    y: unit.y + Math.sin(A_LOCAL) * LENGTH,
                    z: 0,
                },
                PATH = BALLISTICS.create(
                    {
                        x: unit.x,
                        y: unit.y,
                        z: 0,
                    },
                    TARGET,
                    'punch',
                );
            PATH.height = 0.7;
            this.projectiles.push({
                id: ++this.projectileSerial,
                owner: unit.id,
                faction: unit.faction,
                ownerId: unit.ownerId,
                species: unit.species,
                tier: unit.tier,
                path: PATH,
                elapsed: 0,
                x: unit.x,
                y: unit.y,
                z: 0,
                radius: scaleAttackArea(0.08, unit),
                height: 0.22,
                hit: false,
                attackMultiplier: config.projectileAttackMultiplier,
                projectileKind: 'chestnut-spike',
                fanIndex: index,
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
            this.removeUnit(unit, {
                keepStepSnapshot: true,
            });
            return false;
        }
        const IN_BATTLE = this.scene === 'raid' ? this.running : this.farmBossEvent?.phase === 'fighting';
        const DESCRIPTORS = unit.ability.deathSplitDescriptors?.(this, IN_BATTLE) || [];
        if (!DESCRIPTORS.length) {
            return false;
        }
        if (
            this.units.length + DESCRIPTORS.length >
            (this.scene === 'raid' ? CONFIG.raid.capacity.battleUnits : CONFIG.farm.capacity.battleUnits)
        ) {
            return false;
        }
        unit.splitUsedThisBattle = true;
        unit.down = CONFIG.unit.corpseRecoverySeconds;
        for (let index = 0; index < DESCRIPTORS.length; index++) {
            const DESC = DESCRIPTORS[index],
                ANGLE = ((index + 0.5) * Math.PI * 2) / DESCRIPTORS.length,
                ID = this.scene === 'raid' ? CONFIG.raid.ids.summonBase + ++this.raidSummonSerial : this.nextId++;
            const X = unit.x + Math.cos(ANGLE) * 0.38,
                Y = unit.y + Math.sin(ANGLE) * 0.38,
                CHILD = new UNIT(ID, DESC.species, DESC.tier, X, Y);
            Object.assign(CHILD, DESC, {
                ownerId: unit.ownerId,
                farmId: unit.farmId,
                home: {
                    x: X,
                    y: Y,
                },
                hp: STATS(DESC.tier, DESC.species).maxHp,
                down: 0,
                growthElapsed: CHILD.growthDuration,
                growth: CONFIG.farm.breeding.matureMeals,
                meals: 1,
                dropLanded: true,
                deathSplitHandled: false,
            });
            this.units.push(CHILD);
            this._trackUnitAdded(CHILD);
        }
        this.combat('pea-split', {
            unit: unit.id,
            ownerId: unit.ownerId,
            species: unit.species,
            count: DESCRIPTORS.length,
            x: unit.x,
            y: unit.y,
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
        const RANGE = abilityProfile(unit.species).range * config.radiusMultiplier,
            POINT = {
                x: unit.x,
                y: unit.y,
                z: 0,
            },
            DISTANCE = Math.hypot(unit.x - this.boss.x, unit.y - this.boss.y);
        this.effects.push({
            kind: 'landing-shockwave',
            x: unit.x,
            y: unit.y,
            z: 0,
            life: 0,
            duration: 0.55,
            radius: RANGE,
            owner: unit.id,
        });
        if (this.boss.hp > 0 && DISTANCE <= RANGE + this.boss.radius) {
            const BLAST = {
                id: action.id,
                hit: false,
                attackKind: 'kidney-shockwave',
            };
            this.damageCombatTarget(unit, BLAST, this.boss, POINT, {
                attackMultiplier: config.damageMultiplier,
                attackKind: 'kidney-shockwave',
                area: true,
            });
        }
        this.combat('kidney-shockwave', {
            unit: unit.id,
            ownerId: unit.ownerId,
            species: unit.species,
            x: unit.x,
            y: unit.y,
            radius: RANGE,
            damageMultiplier: config.damageMultiplier,
        });
    }
    triggerWalnutSlam(unit, action, primaryTarget, point) {
        if (action.hit || !primaryTarget || primaryTarget.hp <= 0 || !areOpposingFactions(unit, primaryTarget)) {
            return false;
        }
        const CONFIG_LOCAL = getWalnutGuardConfig(this.abilityProgressionFor(unit), unit.tier);
        if (!CONFIG_LOCAL) {
            return false;
        }
        action.hit = true;
        const TARGETS = [primaryTarget];
        if (
            primaryTarget !== this.boss &&
            this.boss.hp > 0 &&
            areOpposingFactions(unit, this.boss) &&
            Math.hypot(this.boss.x - point.x, this.boss.y - point.y) <= CONFIG_LOCAL.radius + this.boss.radius
        ) {
            TARGETS.push(this.boss);
        }
        for (const TARGET of this.units) {
            if (
                TARGET !== primaryTarget &&
                TARGET.hp > 0 &&
                areOpposingFactions(unit, TARGET) &&
                Math.hypot(TARGET.x - point.x, TARGET.y - point.y) <= CONFIG_LOCAL.radius + TARGET.radius
            ) {
                TARGETS.push(TARGET);
            }
        }
        const ATTACK_CONTEXT = this.createAttackContext(unit, {
            attackMultiplier: CONFIG_LOCAL.damageMultiplier,
            attackKind: 'walnut-empowered-slam',
            area: true,
        });
        ATTACK_CONTEXT.criticalRoll = ATTACK_CONTEXT.sourceStatOverrides.critChance > 0 ? this.random() : 1;
        for (const TARGET of TARGETS) {
            this.damageCombatTarget(
                unit,
                {
                    id: action.id,
                    hit: false,
                },
                TARGET,
                point,
                {
                    attackContext: ATTACK_CONTEXT,
                },
            );
        }
        this.effects.push({
            kind: 'walnut-shockwave',
            x: point.x,
            y: point.y,
            z: 0,
            life: 0,
            duration: 0.5,
            radius: CONFIG_LOCAL.radius,
            owner: unit.id,
        });
        this.combat('walnut-slam', {
            unit: unit.id,
            attackId: action.id,
            x: point.x,
            y: point.y,
            z: 0,
            radius: CONFIG_LOCAL.radius,
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
        const BATTLE_ACTIVE =
            this.scene === 'farm'
                ? this.farmBossEvent?.phase === 'fighting'
                : this.running && this.raidDeploymentStarted;
        const BOSS_TARGET =
            BATTLE_ACTIVE && this.boss?.active && areOpposingFactions(unit, this.boss) ? this.boss : null;
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
            if (
                !target ||
                !Number.isFinite(target.x) ||
                !Number.isFinite(target.y) ||
                !Number.isFinite(target.radius)
            ) {
                return;
            }
            const DISTANCE = Math.hypot(unit.x - target.x, unit.y - target.y),
                ID = target.id || 0;
            if (
                DISTANCE <= unit.perceptionRange + target.radius + 1e-9 &&
                (DISTANCE < nearestDistance || (DISTANCE === nearestDistance && ID < nearestId))
            ) {
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
                this._unitCandidates,
            );
            for (const CANDIDATE of this._unitCandidates) {
                if (
                    CANDIDATE !== unit &&
                    this._unitIsActive(CANDIDATE) &&
                    CANDIDATE.hp > 0 &&
                    CANDIDATE.dropLanded &&
                    areOpposingFactions(unit, CANDIDATE)
                ) {
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
        if (
            this.scene !== 'raid' ||
            !Array.isArray(players) ||
            players.length < 1 ||
            players.length > CONFIG.raid.capacity.players ||
            players.some((p) => typeof p !== 'string' || !p) ||
            new Set(players).size !== players.length
        ) {
            return false;
        }
        const LIVE = [...players],
            ORDERED = this.raidDeploymentStarted
                ? [...this.raidExpectedPlayers, ...LIVE.filter((id) => !this.raidExpectedPlayers.includes(id))]
                : LIVE;
        if (ORDERED.length > CONFIG.raid.capacity.players) {
            return false;
        }
        this.raidExpectedPlayers = ORDERED;
        if (!this.raidDeploymentStarted) {
            this.raidRosters = this.raidRosters.filter((r) => LIVE.includes(r.ownerId));
        }
        this.raidRosters.sort(
            (a, b) => this.raidExpectedPlayers.indexOf(a.ownerId) - this.raidExpectedPlayers.indexOf(b.ownerId),
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
    registerRaidRoster(
        ownerId,
        entries,
        abilitySnapshot = createAbilityRuntimeSnapshot(createPlayerProgressionState()),
        settlement = null,
    ) {
        if (
            this.scene !== 'raid' ||
            !this.raidExpectedPlayers.includes(ownerId) ||
            this.raidRoster(ownerId) ||
            !Array.isArray(entries) ||
            entries.length > CONFIG.raid.capacity.playerUnits ||
            this.raidTotal() + entries.length > CONFIG.raid.capacity.units
        ) {
            return false;
        }
        if (!isValidAbilityRuntimeSnapshot(abilitySnapshot)) {
            return false;
        }
        const HAS_SETTLEMENT = settlement !== null;
        if (
            HAS_SETTLEMENT &&
            (!settlement ||
                typeof settlement !== 'object' ||
                typeof settlement.sessionId !== 'string' ||
                !settlement.sessionId.trim() ||
                settlement.sessionId.length > 128 ||
                !Number.isSafeInteger(settlement.runSequence) ||
                settlement.runSequence < 1 ||
                settlement.runSequence > 1e12 ||
                settlement.encounterId !== settlement.runSequence)
        ) {
            return false;
        }
        const IDS = new Set(),
            TROOPS = [];
        for (const E of entries) {
            if (
                !Array.isArray(E) ||
                E.length !== 3 ||
                !Number.isSafeInteger(E[0]) ||
                E[0] < 1 ||
                E[0] > CONFIG.farm.maxUnitId ||
                !Number.isInteger(E[1]) ||
                E[1] < 0 ||
                E[1] >= CONFIG.unit.speciesCount ||
                !Number.isInteger(E[2]) ||
                E[2] < 1 ||
                E[2] > CONFIG.unit.maxTier ||
                IDS.has(E[0])
            ) {
                return false;
            }
            IDS.add(E[0]);
            TROOPS.push({
                farmId: E[0],
                species: E[1],
                tier: E[2],
                deployed: false,
            });
        }
        const ORDER_KEY = (farmId) => {
            let h = (this.seed ^ Math.imul(farmId, 0x9e3779b9)) >>> 0;
            for (let i = 0; i < ownerId.length; i++) {
                h ^= ownerId.charCodeAt(i);
                h = Math.imul(h, 0x01000193);
            }
            h ^= h >>> 16;
            h = Math.imul(h, 0x7feb352d);
            h ^= h >>> 15;
            h = Math.imul(h, 0x846ca68b);
            h ^= h >>> 16;
            return h >>> 0;
        };
        TROOPS.sort((a, b) => a.tier - b.tier || ORDER_KEY(a.farmId) - ORDER_KEY(b.farmId) || a.farmId - b.farmId);
        this.raidRosters.push({
            ownerId,
            troops: TROOPS,
            abilitySnapshot: structuredClone(abilitySnapshot),
            settlementSessionId: HAS_SETTLEMENT ? settlement.sessionId : '',
            settlementRunSequence: HAS_SETTLEMENT ? settlement.runSequence : 0,
            settlementEncounterId: HAS_SETTLEMENT ? settlement.encounterId : 0,
            lastDeploySequence: 0,
            buffUntil: 0,
            buffReadyAt: 0,
        });
        this.raidRosters.sort(
            (a, b) => this.raidExpectedPlayers.indexOf(a.ownerId) - this.raidExpectedPlayers.indexOf(b.ownerId),
        );
        return true;
    }
    deployNextRaidUnit(ownerId, sequence) {
        if (
            this.scene !== 'raid' ||
            ['victory', 'defeat'].includes(this.encounter.outcome) ||
            !this.raidExpectedPlayers.every((id) => this.raidRoster(id)) ||
            this.units.length >= CONFIG.raid.capacity.battleUnits ||
            !Number.isSafeInteger(sequence)
        ) {
            return false;
        }
        const ROSTER = this.raidRoster(ownerId),
            TROOP = ROSTER?.troops.find((t) => !t.deployed);
        if (!ROSTER || sequence !== ROSTER.lastDeploySequence + 1 || !TROOP) {
            return false;
        }
        const FARM_ID = TROOP.farmId,
            SLOT = this.raidExpectedPlayers.indexOf(ownerId),
            TROOP_INDEX = ROSTER.troops.indexOf(TROOP),
            ID = (SLOT + 1) * CONFIG.raid.ids.playerStride + TROOP_INDEX + 1;
        if (this.units.some((u) => u.id === ID)) {
            return false;
        }
        // Uniform random bearing covers the entire outside ellipse. Inset by the
        // deployed body's radius, so every original falling animation lands on ground.
        const ANGLE = this.random() * Math.PI * 2,
            MARGIN = UNIT_RADIUS_FOR_TIER(TROOP.tier) + 0.05,
            BOUNDS = ARENA_GEOMETRY.bounds('raid', MARGIN),
            X = Math.cos(ANGLE) * BOUNDS.x,
            Y = Math.sin(ANGLE) * BOUNDS.y;
        const U = new UNIT(ID, TROOP.species, TROOP.tier, X, Y),
            GROWTH_DURATION = this.breedGrowthDuration();
        Object.assign(U, {
            ownerId,
            farmId: FARM_ID,
            z: CONFIG.raid.dropHeight,
            vz: 0,
            dropLanded: false,
            meals: 1,
            growth: CONFIG.farm.breeding.matureMeals,
            growthDuration: GROWTH_DURATION,
            growthElapsed: GROWTH_DURATION,
        });
        TROOP.deployed = true;
        ROSTER.lastDeploySequence = sequence;
        this.units.push(U);
        this._trackUnitAdded(U);
        if (!this.raidDeploymentStarted) {
            this.raidDeploymentStarted = true;
            this.running = true;
            this.encounter = {
                outcome: 'fighting',
                elapsed: 0,
            };
            this.boss.active = true;
            this.boss.encounterId = this.raidRosters[0]?.settlementRunSequence || this.nextRaidRunSequence || 1;
            this.boss.patternRuntime = createBossPatternRuntime();
        }
        this.combat('unit-drop', {
            unit: ID,
            ownerId,
            x: X,
            y: Y,
            z: U.z,
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
        this.combat('buff', {
            ownerId,
            until: R_LOCAL.buffUntil,
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
        if (this.units.length >= (this.scene === 'farm' ? this.capacity : CONFIG.raid.capacity.units)) {
            return null;
        }
        const U = new UNIT(this.nextId++, species, CLAMP(tier, 1, CONFIG.unit.maxTier), x, y);
        this.addUnit(U);
        return U;
    }
    addUnit(unit) {
        this.units.push(unit);
        this._trackUnitAdded(unit);
        if (!unit.isBattleOnlySummon) {
            this.markProgressChanged();
        }
    }
    removeUnit(unit, options = {}) {
        if (!this.units.includes(unit)) {
            return false;
        }
        this.releaseMate(unit);
        this._trackUnitRemoved(unit, options);
        this.units = this.units.filter((candidate) => candidate !== unit);
        if (!unit.isBattleOnlySummon) {
            this.markProgressChanged();
        }
        return true;
    }
    replaceUnitGroup(materials, result) {
        const CONSUMED = new Set(materials);
        // Replacement reduces an already-owned roster. Its admission must not
        // use the current spawn cap: migrated rosters may legitimately exceed it.
        // Validate every reference before releasing or removing any material.
        if (
            CONSUMED.size < 2 ||
            CONSUMED.size !== materials.length ||
            !materials.every((unit) => this.units.includes(unit)) ||
            !(result instanceof UNIT) ||
            this.units.some((unit) => unit === result || unit.id === result.id)
        ) {
            return false;
        }
        const REMAINING = this.units.filter((unit) => !CONSUMED.has(unit));
        REMAINING.push(result);
        for (const MATERIAL of CONSUMED) {
            this.releaseMate(MATERIAL);
            this._trackUnitRemoved(MATERIAL);
        }
        this.units = REMAINING;
        this._trackUnitAdded(result);
        this.markProgressChanged();
        return true;
    }
    notice(kind, detail = {}) {
        const EVENT = {
            sequence: ++this.eventSequence,
            kind,
            ...detail,
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
            ...effectOptions,
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
        if (
            (source !== 'auto' && source !== 'manual') ||
            (source === 'manual' && this.scene !== 'farm') ||
            this.food.length >= 140
        ) {
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
                1,
            );
            this.foodTaps.produced++;
        }
        this.notice('food-tap', {
            source,
            completed: COMPLETED,
            remainder: this.foodTaps.remainder,
        });
        this.markProgressChanged();
        return true;
    }
    advanceAutoTaps(elapsed) {
        // Real elapsed time, independent of demo speed. Do not replay hidden/stalled frames.
        if (!Number.isFinite(elapsed) || elapsed <= 0) {
            return;
        }
        this.foodTaps.autoClock += Math.min(elapsed, 0.1);
        const INTERVAL = getAutoTapSeconds(this.playerProgression?.farmUpgrades);
        while (this.foodTaps.autoClock + 1e-9 >= INTERVAL) {
            this.foodTaps.autoClock = Math.max(0, this.foodTaps.autoClock - INTERVAL);
            this.tapFood('auto');
        }
    }
    scatter(x, y, count = 1) {
        for (let i = 0; i < count && this.food.length < 140; i++) {
            const RADIUS_X = CONFIG.farm.arena.radiusX - 1.5,
                RADIUS_Y = CONFIG.farm.arena.radiusY - 1.1;
            let tx = CLAMP(x, -RADIUS_X, RADIUS_X);
            let ty = CLAMP(y, -RADIUS_Y, RADIUS_Y);
            const BOUNDARY = Math.hypot(tx / RADIUS_X, ty / RADIUS_Y);
            if (BOUNDARY > 1) {
                tx /= BOUNDARY;
                ty /= BOUNDARY;
            }
            if (this.tryStartFarmBossEvent(tx, ty)) {
                continue;
            }
            const ANGLE = this.random() * Math.PI * 2,
                SX = Math.cos(ANGLE) * (CONFIG.farm.arena.radiusX + 0.7),
                SY = Math.sin(ANGLE) * (CONFIG.farm.arena.radiusY + 0.2);
            const DURATION = 0.85 + this.random() * 0.25,
                Z = 0.3;
            const FOOD = {
                x: SX,
                y: SY,
                z: Z,
                vx: (tx - SX) / DURATION,
                vy: (ty - SY) / DURATION,
                vz: 6 * DURATION - Z / DURATION,
                seed: this.random(),
                phase: 'flight',
                tx,
                ty,
            };
            this.food.push(FOOD);
            this._trackFoodAdded(FOOD);
            this.emit('feed', tx, ty);
            this.markProgressChanged();
        }
    }
    tryStartFarmBossEvent(x, y) {
        if (
            this.scene !== 'farm' ||
            this.boss.active ||
            this.farmBossEvent.phase !== 'idle' ||
            this.random() >= CONFIG.farm.bossEvent.spawnChance
        ) {
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
            active: true,
        });
        this.farmBossEvent = {
            phase: 'dropping',
            elapsed: 0,
            outcome: 'fighting',
            encounterId: this.nextBossEncounterId++,
            rewardStatus: 'unresolved',
            rewardChance: 0,
            rewardRoll: 0,
            rewardUnitId: 0,
        };
        this.boss.encounterId = this.farmBossEvent.encounterId;
        this.boss.patternRuntime = createBossPatternRuntime();
        this.combat('farm-boss-drop', {
            x,
            y,
            z: this.boss.z,
        });
        this.markProgressChanged();
        return true;
    }
    getBossAcquisitionChance({ farmEvent = false } = {}) {
        return bossAcquisitionChance({
            farmEvent,
        });
    }
    createBoss(species = 3) {
        const HP = 2000;
        return {
            x: 0,
            y: 0,
            faction: FACTION_CONFIG.ENEMY,
            z: 0,
            radius: CONFIG.boss.radius,
            height: CONFIG.boss.height,
            hp: HP,
            maxHp: HP,
            species: CLAMP(species, 0, CONFIG.unit.speciesCount - 1),
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
                z: 0,
            },
        };
    }
    configureBossStage(stage, species = this.boss.species) {
        const STATS = bossStageStats(stage);
        this.boss.species = CLAMP(species, 0, CONFIG.unit.speciesCount - 1);
        this.boss.stage = STATS.stage;
        this.boss.hp = this.boss.maxHp = STATS.hp;
        this.boss.attackPower = STATS.attackPower;
        return this.boss;
    }
    setScene(scene) {
        if (scene === this.scene) {
            return;
        }
        this.mergeTask = null;
        this.projectiles = [];
        this.scene = scene;
        this.running = scene === 'raid';
        this.encounter = {
            outcome: this.running ? 'fighting' : 'idle',
            elapsed: 0,
        };
        this.farmBossEvent = {
            phase: 'idle',
            elapsed: 0,
            outcome: 'idle',
            encounterId: 0,
            rewardStatus: 'none',
            rewardChance: 0,
            rewardRoll: 0,
            rewardUnitId: 0,
        };
        this.boss = this.createBoss(this.running ? this.randomBossSpecies() : 3);
        const ID_MAP = new Map(
            this.units.map((u, index) => [u.id, scene === 'raid' ? 1000000 + index + 1 : u.farmId || u.id]),
        );
        for (let i = 0; i < this.units.length; i++) {
            const U = this.units[i],
                OLD_MATE_ID = U.mateId;
            if (scene === 'raid') {
                U.home = {
                    x: U.x,
                    y: U.y,
                };
                U.farmId = U.farmId || U.id;
                U.ownerId = 'solo';
                U.id = 1000000 + i + 1;
                U.dropLanded = true;
                const ANGLE = i * 2.3999632297,
                    RAD = 10.5 + (i % 3) * 0.9;
                Object.assign(U, {
                    x: Math.cos(ANGLE) * RAD,
                    y: Math.sin(ANGLE) * RAD * 0.84,
                });
            } else {
                U.id = U.farmId || U.id;
                U.ownerId = '';
                U.farmId = 0;
                U.dropLanded = true;
                Object.assign(U, U.home);
            }
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
                hp: STATS(U.tier, U.species).maxHp,
            });
        }
        if (this.running) {
            this.boss.active = true;
            this.boss.encounterId = this.activeRaidRunSequence || this.nextRaidRunSequence || 1;
            this.boss.patternRuntime = createBossPatternRuntime();
            this.raidExpectedPlayers = ['solo'];
            this.raidRosters = [
                {
                    ownerId: 'solo',
                    troops: this.units
                        .filter((u) => !u.isBattleOnlySummon)
                        .map((u) => ({
                            farmId: u.farmId,
                            species: u.species,
                            tier: u.tier,
                            deployed: true,
                        })),
                    abilitySnapshot: createAbilityRuntimeSnapshot(this.playerProgression),
                    buffUntil: 0,
                    buffReadyAt: 0,
                },
            ];
            this.raidDeploymentStarted = true;
        } else {
            this.raidExpectedPlayers = ['solo'];
            this.raidRosters = [];
            this.raidDeploymentStarted = false;
        }
        this._unitSpatialDirty = true;
    }
    canBreedPair(a, b, requireContact = false) {
        const BATCH = !this._spatialStepActive;
        if (BATCH) {
            this._beginSpatialQueryBatch();
        }
        try {
            return (
                a !== b &&
                !a.isBattleOnlySummon &&
                !b.isBattleOnlySummon &&
                a.breedingEligible !== false &&
                b.breedingEligible !== false &&
                a.hp > 0 &&
                b.hp > 0 &&
                a.species === b.species &&
                a.mature &&
                b.mature &&
                a.fed &&
                b.fed &&
                a.cooldown <= 0 &&
                b.cooldown <= 0 &&
                this._unitIsActive(a) &&
                this._unitIsActive(b) &&
                (!requireContact || Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius + 0.2)
            );
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
                if (
                    this.mode !== 'breed' ||
                    !MATE ||
                    MATE.mateId !== UNIT_LOCAL.id ||
                    !this.canBreedPair(UNIT_LOCAL, MATE)
                ) {
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
            if (
                this.mode !== 'breed' ||
                !unit.mature ||
                !unit.fed ||
                unit.cooldown > 0 ||
                unit.hp <= 0 ||
                this.senseEnemy(unit)
            ) {
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
                if (
                    CANDIDATE === unit ||
                    CANDIDATE.mateId ||
                    !this.canBreedPair(unit, CANDIDATE) ||
                    this.senseEnemy(CANDIDATE)
                ) {
                    continue;
                }
                const RANK = CANDIDATE.tier === unit.tier ? 0 : 1,
                    DISTANCE = Math.hypot(CANDIDATE.x - unit.x, CANDIDATE.y - unit.y);
                if (RANK < bestRank || (RANK === bestRank && DISTANCE < bestDistance)) {
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
        if (this.mode !== 'breed' || this.units.length >= this.capacity) {
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
                    if (
                        UNIT_LOCAL.isBattleOnlySummon ||
                        UNIT_LOCAL.breedingEligible === false ||
                        UNIT_LOCAL.hp <= 0 ||
                        !UNIT_LOCAL.mature ||
                        !UNIT_LOCAL.fed ||
                        UNIT_LOCAL.cooldown > 0 ||
                        !this._unitIsActive(UNIT_LOCAL)
                    ) {
                        continue;
                    }
                    if (!UNIT_LOCAL.mateId) {
                        if (++unreserved >= 2) {
                            return true;
                        }
                        continue;
                    }
                    const MATE = this._unitById.get(UNIT_LOCAL.mateId);
                    if (
                        MATE?.mateId === UNIT_LOCAL.id &&
                        MATE.species === UNIT_LOCAL.species &&
                        MATE.tier === UNIT_LOCAL.tier &&
                        MATE.hp > 0 &&
                        MATE.mature &&
                        MATE.fed &&
                        MATE.cooldown <= 0 &&
                        MATE.breedingEligible !== false &&
                        !MATE.isBattleOnlySummon
                    ) {
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
            const FIRST = materials[0],
                RESULT_TIER = FIRST?.tier + 1,
                MATERIAL_COUNT = mergeMaterialCostForTier(RESULT_TIER);
            if (MATERIAL_COUNT < 2 || materials.length !== MATERIAL_COUNT || FIRST.tier >= CONFIG.unit.maxTier) {
                return false;
            }
            const IDS = new Set();
            for (const UNIT_LOCAL of materials) {
                if (this.localScatter.active && this.scatterInside(UNIT_LOCAL)) {
                    return false;
                }
                if (
                    !UNIT_LOCAL ||
                    IDS.has(UNIT_LOCAL.id) ||
                    UNIT_LOCAL.isBattleOnlySummon ||
                    UNIT_LOCAL.mergeEligible === false ||
                    UNIT_LOCAL.species !== FIRST.species ||
                    UNIT_LOCAL.tier !== FIRST.tier ||
                    UNIT_LOCAL.hp <= 0 ||
                    UNIT_LOCAL.down > 0 ||
                    !UNIT_LOCAL.mature ||
                    UNIT_LOCAL.cooldown > 0 ||
                    !this._unitIsActive(UNIT_LOCAL)
                ) {
                    return false;
                }
                IDS.add(UNIT_LOCAL.id);
            }
            // Sleeping owned units count toward the minimum roster, but cannot be
            // consumed. The resulting same-species count must remain at least two.
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
                    if (
                        Math.hypot(ANCHOR.x - UNIT_LOCAL.x, ANCHOR.y - UNIT_LOCAL.y) >
                        ANCHOR.radius + UNIT_LOCAL.radius + 0.2
                    ) {
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
        if (this.mode !== 'merge' || this.scene !== 'farm' || this.mergeTask) {
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
                    if (
                        !UNIT_LOCAL.isBattleOnlySummon &&
                        UNIT_LOCAL.mergeEligible !== false &&
                        UNIT_LOCAL.hp > 0 &&
                        UNIT_LOCAL.down <= 0 &&
                        UNIT_LOCAL.mature &&
                        UNIT_LOCAL.cooldown <= 0 &&
                        UNIT_LOCAL.tier < CONFIG.unit.maxTier &&
                        !this.senseEnemy(UNIT_LOCAL)
                    ) {
                        this._mergeEligibleGroups[
                            UNIT_LOCAL.species * (CONFIG.unit.maxTier + 1) + UNIT_LOCAL.tier
                        ].push(UNIT_LOCAL);
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
            const NEAREST = this._mergeNearestScratch,
                MATERIALS = this._mergeMaterialsScratch,
                SORTED_IDS = this._mergeIdScratch;
            for (let tier = 1; tier < CONFIG.unit.maxTier; tier++) {
                const MATERIAL_COUNT = mergeMaterialCostForTier(tier + 1),
                    NEAREST_COUNT = MATERIAL_COUNT - 1;
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
                            for (let position = 0; position < NEAREST.length; position++) {
                                const CURRENT = NEAREST[position];
                                if (
                                    DISTANCE < CURRENT.distance ||
                                    (DISTANCE === CURRENT.distance && UNIT_LOCAL.id < CURRENT.unit.id)
                                ) {
                                    insertAt = position;
                                    break;
                                }
                            }
                            if (insertAt >= NEAREST_COUNT) {
                                continue;
                            }
                            NEAREST.splice(insertAt, 0, {
                                unit: UNIT_LOCAL,
                                distance: DISTANCE,
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
                        if (
                            !this.canMergeGroup(MATERIALS, {
                                requireNoEnemy: true,
                            })
                        ) {
                            continue;
                        }
                        let distance = 0;
                        for (let i = 0; i < MATERIALS.length; i++) {
                            for (let j = i + 1; j < MATERIALS.length; j++) {
                                distance +=
                                    (MATERIALS[i].x - MATERIALS[j].x) ** 2 + (MATERIALS[i].y - MATERIALS[j].y) ** 2;
                            }
                        }
                        if (tier > bestTier || (tier === bestTier && distance > bestDistance)) {
                            continue;
                        }
                        SORTED_IDS.length = 0;
                        for (const UNIT_LOCAL of MATERIALS) {
                            SORTED_IDS.push(UNIT_LOCAL.id);
                        }
                        SORTED_IDS.sort((a, b) => a - b);
                        const IDS_ORDER = bestSortedIds ? COMPARE_IDS(SORTED_IDS, bestSortedIds) : -1;
                        if (
                            bestMaterialIds &&
                            (tier > bestTier ||
                                (tier === bestTier &&
                                    (distance > bestDistance ||
                                        (distance === bestDistance &&
                                            (IDS_ORDER > 0 || (IDS_ORDER === 0 && ANCHOR.id >= bestAnchorId))))))
                        ) {
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
                    phase: 'approach',
                    aId: bestMaterialIds[0],
                    bId: bestMaterialIds[1],
                    materialIds: bestMaterialIds,
                    elapsed: 0,
                    duration: CONFIG.farm.merge.animationSeconds,
                };
            }
        } finally {
            if (BATCH) {
                this._endSpatialQueryBatch();
            }
        }
    }
    advanceMergeTask(dt) {
        if (this.mode !== 'merge' || this.scene !== 'farm') {
            this.mergeTask = null;
            return;
        }
        if (this.mergeTask?.phase === 'animation') {
            this.mergeTask.elapsed = Math.min(this.mergeTask.duration, this.mergeTask.elapsed + dt);
            if (this.mergeTask.elapsed >= this.mergeTask.duration - 1e-9) {
                this.mergeTask = null;
            }
            return;
        }
        if (this.mergeTask?.phase === 'approach') {
            const MATERIALS = (this.mergeTask.materialIds || [this.mergeTask.aId, this.mergeTask.bId]).map((id) =>
                this._unitById.get(id),
            );
            // Combat pauses an otherwise valid group; death, invalid tiers, or removed units cancel it.
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
        if (TASK?.phase !== 'approach') {
            return false;
        }
        const MATERIALS = (TASK.materialIds || [TASK.aId, TASK.bId]).map((id) => this._unitById.get(id));
        if (
            !this.canMergeGroup(MATERIALS, {
                requireContact: true,
                requireNoEnemy: true,
            })
        ) {
            return false;
        }
        return this.mergeGroup(MATERIALS, {
            priorityResolved: true,
        });
    }
    pair(a, b, priorityResolved = false) {
        if (this.mode === 'merge') {
            return this.mergeGroup([a, b], {
                priorityResolved,
            });
        }
        if (this.localScatter.active && (this.scatterInside(a) || this.scatterInside(b))) {
            return false;
        }
        if (
            !a ||
            !b ||
            a === b ||
            a.hp <= 0 ||
            b.hp <= 0 ||
            a.down > 0 ||
            b.down > 0 ||
            a.species !== b.species ||
            !a.mature ||
            !b.mature ||
            a.cooldown > 0 ||
            b.cooldown > 0 ||
            !this.units.includes(a) ||
            !this.units.includes(b) ||
            Math.hypot(a.x - b.x, a.y - b.y) > a.radius + b.radius + 0.2 ||
            this.senseEnemy(a) ||
            this.senseEnemy(b)
        ) {
            return false;
        }
        if (a.isBattleOnlySummon || b.isBattleOnlySummon) {
            return false;
        }
        {
            if (
                !this.canBreedPair(a, b, true) ||
                this.units.length >= this.capacity ||
                (a.mateId && a.mateId !== b.id) ||
                (b.mateId && b.mateId !== a.id) ||
                (!priorityResolved && a.tier !== b.tier && this.hasEligibleSameTierBreedPair())
            ) {
                return false;
            }
            a.mateId = b.id;
            b.mateId = a.id;
            const CHILD = this.spawn(a.species, 1, (a.x + b.x) / 2, (a.y + b.y) / 2);
            CHILD.growthDuration = this.breedGrowthDuration();
            CHILD.vz = 3;
            a.meals = b.meals = 0;
            a.cooldown = b.cooldown = this.breedCooldownDuration();
            a.cooldownDuration = b.cooldownDuration = a.cooldown;
            this.releaseMate(a);
            this.metrics.births++;
            this.emit('birth', CHILD.x, CHILD.y, 0.7);
        }
        return true;
    }
    mergeGroup(materials, { priorityResolved: _priorityResolved = false } = {}) {
        if (
            this.mode !== 'merge' ||
            this.scene !== 'farm' ||
            !this.canMergeGroup(materials, {
                requireContact: true,
                requireNoEnemy: true,
            })
        ) {
            return false;
        }
        const ORDERED = [...materials],
            FIRST = ORDERED[0],
            MATERIAL_IDS = ORDERED.map((unit) => unit.id),
            X = ORDERED.reduce((sum, unit) => sum + unit.x, 0) / ORDERED.length,
            Y = ORDERED.reduce((sum, unit) => sum + unit.y, 0) / ORDERED.length;
        // Prepare the complete result before the collection owner commits the
        // replacement. A failed preparation never consumes existing units.
        const RESULT = new UNIT(this.nextId, FIRST.species, FIRST.tier + 1, X, Y);
        RESULT.meals = 1;
        RESULT.growth = CONFIG.farm.breeding.matureMeals;
        RESULT.growthDuration = this.breedGrowthDuration();
        RESULT.growthElapsed = RESULT.growthDuration;
        RESULT.cooldown = getMergeCooldownSeconds(this.playerProgression?.farmUpgrades);
        RESULT.cooldownDuration = RESULT.cooldown;
        if (!this.replaceUnitGroup(ORDERED, RESULT)) {
            return false;
        }
        this.nextId++;
        this.mergeTask = {
            phase: 'animation',
            aId: 0,
            bId: 0,
            materialIds: MATERIAL_IDS,
            resultId: RESULT.id,
            sourceSpecies: FIRST.species,
            sourceTier: FIRST.tier,
            elapsed: 0,
            duration: CONFIG.farm.merge.animationSeconds,
        };
        const SEQUENCE_WINDOW = CONFIG.farm.merge.animationSeconds * 0.72,
            STEP = SEQUENCE_WINDOW / ORDERED.length;
        ORDERED.forEach((unit, index) =>
            this.effects.push({
                kind: 'merge-material',
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
                sequenceCount: ORDERED.length,
            }),
        );
        this.metrics.merges++;
        this.emit('merge', X, Y, 1, {
            delay: SEQUENCE_WINDOW,
            span: CONFIG.farm.merge.animationSeconds - SEQUENCE_WINDOW,
        });
        return true;
    }
    step(dt) {
        this._spatialStepActive = true;
        this._spatialQueryDepth = 0;
        this.time += dt;
        let progressTimersAdvanced = false;
        grantPendingBossAcquisitions(this);
        // Keep the original step membership/order; spawns join indexes now but
        // are first advanced by the next physics step, just like the prior copy.
        const UNITS = this._stepUnits;
        UNITS.length = 0;
        for (const UNIT_LOCAL of this.units) {
            UNITS.push(UNIT_LOCAL);
        }
        this._rebuildUnitSpatialIndex(UNITS);
        if (this.scene === 'raid' && this.running) {
            this.encounter.elapsed += dt;
        }
        this.advanceMergeTask(dt);
        this.effects = this.effects.filter((e) => (e.life += dt) < (Number.isFinite(e.duration) ? e.duration : 1));
        for (const F of this.food) {
            if (F.phase !== 'grounded') {
                F.x += F.vx * dt;
                F.y += F.vy * dt;
                F.z += F.vz * dt - 6 * dt * dt;
                F.vz -= 12 * dt;
                if (F.z <= 0) {
                    F.z = 0;
                    if (F.phase === 'flight') {
                        F.x = F.tx;
                        F.y = F.ty;
                        F.vx = F.vy = 0;
                        F.vz = 1.1;
                        F.phase = 'bounce';
                        this.emit('food-land', F.x, F.y);
                    } else {
                        F.vz = 0;
                        F.phase = 'grounded';
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
                if (this.scene === 'farm') {
                    progressTimersAdvanced = true;
                    U.down = Math.max(0, U.down - dt);
                    if (U.down < 1e-9) {
                        U.down = 0;
                    }
                }
                const OLD_Z = U.z;
                U.integrate(dt);
                if (this.scene === 'raid' && this.running && U.z === 0 && U.vz === 0) {
                    U.vx = U.vy = 0;
                }
                if (OLD_Z > 0 && U.z === 0) {
                    this.metrics.landings++;
                    if (this.scene === 'raid') {
                        this.combat('unit-land', {
                            unit: U.id,
                            x: U.x,
                            y: U.y,
                            z: 0,
                            strength: Math.min(1, Math.hypot(U.vx, U.vy) / 8),
                        });
                    } else if (Math.hypot(U.vx, U.vy) > 1) {
                        this.emit('land', U.x, U.y);
                    }
                }
                if (this.scene === 'farm' && U.down === 0) {
                    const MAX_HP = STATS(U.tier, U.species).maxHp;
                    this.releaseMate(U);
                    Object.assign(U, {
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
                        deathSplitHandled: false,
                    });
                    this._syncUnitAliveCount(U);
                    U.ability = CREATE_UNIT_ATTACK_CYCLE(U);
                    this.combat('unit-recover', {
                        unit: U.id,
                        x: U.x,
                        y: U.y,
                    });
                    this.markProgressChanged();
                }
                this.unitSpatial.update(U);
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
                    Math.floor((CONFIG.farm.breeding.matureMeals * U.growthElapsed) / U.growthDuration + 1e-9),
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
            const ENEMY_LOCAL =
                    this.senseEnemy(U) ||
                    (this.scene === 'raid' && this.running && hasFaction(U, FACTION_CONFIG.PLAYER) && this.boss.hp > 0
                        ? this.boss
                        : null),
                SCATTERING = this.updateLocalScatter(U, dt, ENEMY_LOCAL);
            if (SCATTERING) {
                /* Movement command has priority over attacks and Farm life. */
            } else if (ENEMY_LOCAL) {
                this.raidUnit(U, dt, ENEMY_LOCAL);
            } else if (U.hp > 0 && hasFaction(U, FACTION_CONFIG.PLAYER) && !U.isBattleOnlySummon) {
                if (U.ability.phase !== 'idle') {
                    if (U.ability.phase !== 'recover') {
                        U.ability.interrupt();
                    }
                    U.ability.update(this, dt);
                }
                this.farmUnit(U, dt);
            } else if (this.scene === 'raid' && this.running) {
                this.raidUnit(U, dt, null);
            }
            const OLD_Z = U.z,
                OLD_POSITION = {
                    x: U.x,
                    y: U.y,
                    z: U.z,
                };
            this.limitScatterVelocity(U, dt);
            U.integrate(dt);
            if (this.scene === 'raid' && U.hp <= 0 && U.z === 0 && U.vz === 0) {
                U.vx = U.vy = 0;
            }
            if (ENEMY_LOCAL) {
                U.ability.afterMove?.(this, OLD_POSITION);
            }
            if (OLD_Z > 0 && U.z === 0) {
                U.landingRecovery = 0.25;
                if (!U.dropLanded) {
                    U.dropLanded = true;
                    U.bounce = 0.16;
                    this.combat(this.scene === 'raid' ? 'drop-land' : 'boss-add-land', {
                        unit: U.id,
                        ownerId: U.ownerId,
                        x: U.x,
                        y: U.y,
                        z: 0,
                    });
                    this.effects.push({
                        kind: 'drop-dust',
                        x: U.x,
                        y: U.y,
                        z: 0,
                        life: 0,
                    });
                }
                this.metrics.landings++;
                if (this.scene === 'raid') {
                    this.combat('unit-land', {
                        unit: U.id,
                        x: U.x,
                        y: U.y,
                        z: 0,
                        strength: Math.min(1, Math.hypot(U.vx, U.vy) / 8),
                    });
                } else if (Math.hypot(U.vx, U.vy) > 1) {
                    this.emit('land', U.x, U.y);
                }
            }
            this.boundBody(U, this.scene, U.radius);
            this.unitSpatial.update(U);
        }
        // Timed growth/rest is real progress, but movement is not. Checkpoint
        // advancing timers at a coarse cadence, never once per physics tick.
        if (this.scene === 'farm' && progressTimersAdvanced) {
            this._progressTimerCheckpoint += dt;
            if (this._progressTimerCheckpoint >= 5) {
                this._progressTimerCheckpoint = 0;
                this.markProgressChanged();
            }
        }
        this.resolveContacts(UNITS);
        if (this.scene === 'farm') {
            if (this.mode === 'breed') {
                this.resolveFarmContactPairs(UNITS, true);
                if (!this.hasEligibleSameTierBreedPair()) {
                    this.resolveFarmContactPairs(UNITS, false);
                }
            } else {
                this.resolveMergeTaskAfterMovement();
            }
        }
        if (this.scene === 'farm' && this.farmBossEvent.phase !== 'idle') {
            if (this.boss.active) {
                this.updateProjectiles(dt);
            }
            this.updateBoss(dt);
            if (this.boss.active) {
                for (const U of this.units) {
                    this.separateBoss(U);
                    this.unitSpatial.update(U);
                }
            }
        } else if (this.boss.active) {
            this.updateProjectiles(dt);
            this.updateBoss(dt);
            for (const U of this.units) {
                this.separateBoss(U);
                this.unitSpatial.update(U);
            }
        }
        this.units = this.units.filter((unit) => !unit.isBattleOnlySummon || unit.hp > 0);
        UNITS.length = 0;
        this._spatialStepActive = false;
        this._unitSpatialDirty = true;
        this._foodSpatialDirty = true;
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
        C_LOCAL.radius = CLAMP(radius, CONFIG.scatter.minRadius, CONFIG.scatter.maxRadius);
        C_LOCAL.handleX = handleX;
        C_LOCAL.handleY = handleY;
        return true;
    }
    clearLocalScatter() {
        this.localScatter.active = false;
    }
    scatterApplies(u) {
        return (
            this.localScatter.active &&
            hasFaction(u, FACTION_CONFIG.PLAYER) &&
            u.hp > 0 &&
            u.down <= 0 &&
            u.dropLanded &&
            u.z <= 1e-9 &&
            u.vz <= 0
        );
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
            Math.max(0, Math.hypot(u.x - B_LOCAL.x, u.y - B_LOCAL.y) - 0.002),
        );
        return ARENA_GEOMETRY.segmentInsideCircle(u.x, u.y, x, y, B_LOCAL.x, B_LOCAL.y, RADIUS);
    }
    updateLocalScatter(u, dt, enemy) {
        if (!this.scatterApplies(u) || u.stun > 0 || u.landingRecovery > 0) {
            return false;
        }
        const C_LOCAL = this.localScatter,
            R_LOCAL = C_LOCAL.radius + u.radius + CONFIG.scatter.bodyMargin,
            D_LOCAL = Math.hypot(u.x - C_LOCAL.x, u.y - C_LOCAL.y);
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
                bossY: 0,
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
        // Contact attacks move their body through the path; ranged shots are safe
        // to keep firing from a stopped position outside the evacuation circle.
        const ATTACK_BLOCKED =
            unitCapabilityComposition(u.species).attack === 'contact' &&
            CYCLE.action &&
            (CYCLE.phase === 'windup' || CYCLE.phase === 'active') &&
            this.scatterSegmentBlocked(u.x, u.y, CYCLE.action.target.x, CYCLE.action.target.y, R_LOCAL);
        if (!state.escaping && !ATTACK_BLOCKED) {
            return false;
        }
        CYCLE.cancelForScatter();
        CYCLE.update(this, dt);
        if (!state.escaping) {
            return true;
        }
        if (
            state.radius !== R_LOCAL ||
            this.scatterBossBlocks(u, state.x, state.y) ||
            (state.waypoint &&
                (Math.hypot(state.x - u.x, state.y - u.y) < 0.14 ||
                    state.bossX !== this.boss.x ||
                    state.bossY !== this.boss.y))
        ) {
            state.radius = R_LOCAL;
            const GOAL_RADIUS = R_LOCAL + CONFIG.scatter.hysteresis + 0.12,
                BEARING = D_LOCAL > 1e-8 ? Math.atan2(u.y - C_LOCAL.y, u.x - C_LOCAL.x) : u.seed,
                BOUNDS = ARENA_GEOMETRY.bounds(this.scene, u.radius + 0.02);
            let best = Infinity;
            state.x = u.x;
            state.y = u.y;
            state.waypoint = false;
            state.bossX = this.boss.x;
            state.bossY = this.boss.y;
            // Usually the first radial exit is valid. At a boundary choose the
            // closest reachable tangent-side exit, with a stable tie break.
            for (let i = 0; i < 33; i++) {
                const ANGLE = BEARING + (i === 0 ? 0 : ((i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI) / 16),
                    X = C_LOCAL.x + Math.cos(ANGLE) * GOAL_RADIUS,
                    Y = C_LOCAL.y + Math.sin(ANGLE) * GOAL_RADIUS;
                if (
                    (X * X) / (BOUNDS.x * BOUNDS.x) + (Y * Y) / (BOUNDS.y * BOUNDS.y) > 1 ||
                    this.scatterBossBlocks(u, X, Y)
                ) {
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
                // A boss against the arena edge can leave only a curved crescent.
                // Take a short valid tangent step, then retry the normal radial exit.
                state.waypoint = true;
                let score = -Infinity;
                for (let step = 0.55; step > 0.1 && !Number.isFinite(score); step *= 0.5) {
                    for (let i = 0; i < 34; i++) {
                        // Exact boss tangents and shorter retries cover narrow edge gaps
                        // without making the exit depend on the unit's seeded angle grid.
                        const ANGLE =
                                i < 32
                                    ? BEARING + (i * Math.PI) / 16
                                    : Math.atan2(u.y - this.boss.y, u.x - this.boss.x) +
                                      ((i === 32 ? 1 : -1) * Math.PI) / 2,
                            X = u.x + Math.cos(ANGLE) * step,
                            Y = u.y + Math.sin(ANGLE) * step;
                        if (
                            (X * X) / (BOUNDS.x * BOUNDS.x) + (Y * Y) / (BOUNDS.y * BOUNDS.y) > 1 ||
                            this.scatterBossBlocks(u, X, Y)
                        ) {
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
        const DX = u.x - C_LOCAL.x,
            DY = u.y - C_LOCAL.y,
            RADIAL = D_LOCAL > 1e-8 ? (u.vx * DX + u.vy * DY) / D_LOCAL : 0;
        if (RADIAL < 0) {
            u.vx -= (RADIAL * DX) / D_LOCAL;
            u.vy -= (RADIAL * DY) / D_LOCAL;
        }
        this.steer(u, state.x, state.y, dt, scaleMoveSpeed(enemy ? 4.1 : 2.2, u));
        return true;
    }
    limitScatterVelocity(u, dt) {
        if (!this.scatterApplies(u) || u.stun > 0) {
            return;
        }
        const C_LOCAL = this.localScatter,
            R_LOCAL = C_LOCAL.radius + u.radius + CONFIG.scatter.bodyMargin,
            DX = u.x - C_LOCAL.x,
            DY = u.y - C_LOCAL.y,
            D_LOCAL = Math.hypot(DX, DY);
        if (D_LOCAL < R_LOCAL - 1e-8) {
            return;
        }
        const MX = u.vx * dt,
            MY = u.vy * dt,
            A_LOCAL = MX * MX + MY * MY,
            B_LOCAL = 2 * (DX * MX + DY * MY),
            OUTSIDE = DX * DX + DY * DY - R_LOCAL * R_LOCAL,
            DISC = B_LOCAL * B_LOCAL - 4 * A_LOCAL * OUTSIDE;
        if (A_LOCAL < 1e-14 || B_LOCAL >= 0 || DISC <= 0) {
            return;
        }
        const HIT = (-B_LOCAL - Math.sqrt(DISC)) / (2 * A_LOCAL);
        if (HIT < 0 || HIT > 1) {
            return;
        }
        // Trim this step before entry rather than projecting/teleporting the body.
        const FRACTION = Math.max(0, HIT - 0.001);
        u.vx *= FRACTION;
        u.vy *= FRACTION;
    }
    steer(u, x, y, dt, speed2) {
        if (this.scatterApplies(u) && !this.scatterInside(u)) {
            const C_LOCAL = this.localScatter,
                R_LOCAL = C_LOCAL.radius + u.radius + CONFIG.scatter.bodyMargin + 0.12;
            if (this.scatterSegmentBlocked(u.x, u.y, x, y, R_LOCAL)) {
                const DX = u.x - C_LOCAL.x,
                    DY = u.y - C_LOCAL.y,
                    D_LOCAL = Math.hypot(DX, DY),
                    BEARING = D_LOCAL > 1e-8 ? Math.atan2(DY, DX) : u.seed;
                const TX = x - C_LOCAL.x,
                    TY = y - C_LOCAL.y;
                if (Math.hypot(TX, TY) <= R_LOCAL) {
                    x = C_LOCAL.x + Math.cos(BEARING) * (R_LOCAL + 0.06);
                    y = C_LOCAL.y + Math.sin(BEARING) * (R_LOCAL + 0.06);
                } else {
                    const DELTA = Math.atan2(
                            Math.sin(Math.atan2(TY, TX) - BEARING),
                            Math.cos(Math.atan2(TY, TX) - BEARING),
                        ),
                        SIDE = DELTA === 0 ? (u.id % 2 ? 1 : -1) : Math.sign(DELTA);
                    const TURN = Math.min(
                            0.5,
                            Math.max(0.2, Math.acos(Math.min(1, R_LOCAL / Math.max(R_LOCAL, D_LOCAL))) * 0.8),
                        ),
                        DISTANCE = R_LOCAL / Math.cos(TURN) + 0.08;
                    const BOUNDS = ARENA_GEOMETRY.bounds(this.scene, u.radius);
                    let angle = BEARING + SIDE * TURN;
                    x = C_LOCAL.x + Math.cos(angle) * DISTANCE;
                    y = C_LOCAL.y + Math.sin(angle) * DISTANCE;
                    if ((x * x) / (BOUNDS.x * BOUNDS.x) + (y * y) / (BOUNDS.y * BOUNDS.y) > 1) {
                        angle = BEARING - SIDE * TURN;
                        x = C_LOCAL.x + Math.cos(angle) * DISTANCE;
                        y = C_LOCAL.y + Math.sin(angle) * DISTANCE;
                        if ((x * x) / (BOUNDS.x * BOUNDS.x) + (y * y) / (BOUNDS.y * BOUNDS.y) > 1) {
                            u.vx = u.vy = 0;
                            return;
                        }
                    }
                }
            }
        }
        const DX = x - u.x,
            DY = y - u.y,
            D_LOCAL = Math.hypot(DX, DY);
        if (D_LOCAL > 0.08) {
            const RATE = 1 - Math.exp(-dt * 3);
            u.vx += ((DX / D_LOCAL) * speed2 - u.vx) * RATE;
            u.vy += ((DY / D_LOCAL) * speed2 - u.vy) * RATE;
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
                const AX = OTHER.x,
                    AY = OTHER.y,
                    BX = UNIT_LOCAL.x,
                    BY = UNIT_LOCAL.y,
                    DID_CONTACT = contact(OTHER, UNIT_LOCAL);
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
        if (this.scene === 'raid') {
            this.raidContacts(units);
            return;
        }
        for (let i = 0; i < units.length; i++) {
            const UNIT_LOCAL = units[i],
                GENERATION = this._nextContactGeneration(units.length),
                PENDING = this._collectContactOrders(UNIT_LOCAL, i + 1, units.length - 1, this._contactPending);
            for (const ORDER of PENDING) {
                this._contactSeen[ORDER] = GENERATION;
            }
            let cursor = 0;
            while (cursor < PENDING.length) {
                const J = PENDING[cursor++],
                    OTHER = units[J],
                    AX = UNIT_LOCAL.x,
                    AY = UNIT_LOCAL.y,
                    BX = OTHER.x,
                    BY = OTHER.y,
                    DID_CONTACT = contact(UNIT_LOCAL, OTHER);
                if (DID_CONTACT) {
                    this.metrics.contacts++;
                }
                const UNIT_MOVED = AX !== UNIT_LOCAL.x || AY !== UNIT_LOCAL.y,
                    OTHER_MOVED = BX !== OTHER.x || BY !== OTHER.y;
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
            const UNIT_LOCAL = units[i],
                PENDING = this._collectContactOrders(UNIT_LOCAL, i + 1, units.length - 1, this._contactPending);
            for (const J of PENDING) {
                const OTHER = units[J];
                if ((UNIT_LOCAL.tier === OTHER.tier) !== sameTier) {
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
            (a, b) => (this._foodOrder.get(a) ?? Infinity) - (this._foodOrder.get(b) ?? Infinity),
        );
        for (const FOOD of this._foodCandidates) {
            if (FOOD.phase !== 'grounded') {
                continue;
            }
            const DX = u.x - FOOD.x,
                DY = u.y - FOOD.y,
                DISTANCE = Math.hypot(DX, DY);
            if (DISTANCE >= RADIUS) {
                continue;
            }
            const STRENGTH = 1 - DISTANCE / RADIUS,
                WEIGHT = STRENGTH * STRENGTH;
            if (DISTANCE < nearestDistance) {
                nearestDistance = DISTANCE;
                nearest = FOOD;
            }
            strongest = Math.max(strongest, STRENGTH);
            if (DISTANCE > 1e-6) {
                pushX += (DX / DISTANCE) * WEIGHT;
                pushY += (DY / DISTANCE) * WEIGHT;
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
        const AWAY_X = pushX / magnitude,
            AWAY_Y = pushY / magnitude;
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
        const GRID = this.foodSpatial,
            CX = GRID.cellX(x),
            CY = GRID.cellY(y);
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
                const DISTANCE = Math.hypot(FOOD.x - x, FOOD.y - y),
                    ORDER = this._foodOrder.get(FOOD) ?? Infinity;
                if (DISTANCE < nearestDistance || (DISTANCE === nearestDistance && ORDER < nearestOrder)) {
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
        if (u.stun > 0 || u.z > 0.1) {
            return;
        }
        if (!u.mature || u.cooldown > 0) {
            if (!this.avoidNearbyFood(u, dt)) {
                this.steer(
                    u,
                    Math.sin(this.time * 0.18 + u.seed) * (CONFIG.farm.arena.radiusX * 0.78),
                    Math.cos(this.time * 0.16 + u.seed) * (CONFIG.farm.arena.radiusY * 0.78),
                    dt,
                    scaleMoveSpeed(0.75, u),
                );
            }
            return;
        }
        if (this.mode === 'merge') {
            const TASK = this.mergeTask;
            if (TASK?.phase === 'approach' && TASK.materialIds?.includes(u.id)) {
                const ANCHOR = this._unitById.get(TASK.materialIds[0]);
                if (ANCHOR && u.cooldown <= 0) {
                    this.steer(
                        u,
                        u.id === ANCHOR.id ? u.x : ANCHOR.x,
                        u.id === ANCHOR.id ? u.y : ANCHOR.y,
                        dt,
                        scaleMoveSpeed(2.2, u),
                    );
                }
                return;
            }
            this.steer(
                u,
                Math.sin(this.time * 0.18 + u.seed) * (CONFIG.farm.arena.radiusX * 0.78),
                Math.cos(this.time * 0.16 + u.seed) * (CONFIG.farm.arena.radiusY * 0.78),
                dt,
                scaleMoveSpeed(0.75, u),
            );
            return;
        }
        let target = null;
        let best = Infinity;
        if (this.mode === 'breed' && !u.fed) {
            target = this.findNearestGroundFood(u.x, u.y);
            if (target) {
                best = Math.hypot(target.x - u.x, target.y - u.y);
            }
            if (target && best < 0.42) {
                this.food.splice(this.food.indexOf(target), 1);
                this.foodSpatial.remove(target);
                this._foodOrder.delete(target);
                this._removeGroupItem(this._groundedFoods, target);
                this._groundedFoodCount = Math.max(0, this._groundedFoodCount - 1);
                u.meals = 1;
                this.markProgressChanged();
                u.vz = 2;
                this.emit('eat', u.x, u.y, 0.5);
                target = null;
            }
        } else if (this.mode === 'breed' && u.cooldown === 0) {
            target = this.findOrReserveMate(u);
        } else if (u.cooldown === 0) {
            for (const P of this._speciesGroups[u.species] || []) {
                if (
                    P === u ||
                    P.hp <= 0 ||
                    P.down > 0 ||
                    !P.mature ||
                    P.cooldown > 0 ||
                    (this.mode === 'breed' && !P.fed) ||
                    (this.mode === 'merge' && !(P.tier === u.tier && u.tier < CONFIG.unit.maxTier))
                ) {
                    continue;
                }
                const D_LOCAL = Math.hypot(P.x - u.x, P.y - u.y);
                if (D_LOCAL < best) {
                    best = D_LOCAL;
                    target = P;
                }
            }
        }
        const HAS_DESIGNATED_MATE = this.mode === 'breed' && u.fed && target && this.units.includes(target);
        if (this.mode === 'breed' && u.fed && !HAS_DESIGNATED_MATE && this.avoidNearbyFood(u, dt)) {
            return;
        }
        if (target) {
            this.steer(
                u,
                target.x,
                target.y,
                dt,
                scaleMoveSpeed(
                    2.2 *
                        (target.phase === 'grounded'
                            ? farmUpgradeRate(this.playerProgression?.farmUpgrades, 'growth')
                            : 1),
                    u,
                ),
            );
        } else {
            this.steer(
                u,
                Math.sin(this.time * 0.18 + u.seed) * (CONFIG.farm.arena.radiusX * 0.78),
                Math.cos(this.time * 0.16 + u.seed) * (CONFIG.farm.arena.radiusY * 0.78),
                dt,
                scaleMoveSpeed(0.75, u),
            );
        }
    }
    combat(kind, detail) {
        const EVENT = this.notice(kind, {
                time: this.time,
                ...detail,
            }),
            TO_PRESENTATION_TIME = PRESENTATION_CLOCKS.get(this);
        if (TO_PRESENTATION_TIME) {
            PRESENTATION_EVENT_TIMES.set(EVENT, TO_PRESENTATION_TIME(this.time));
        }
    }
    boundBody(body, scene, margin) {
        const BEFORE = {
                x: body.x,
                y: body.y,
            },
            P = ARENA_GEOMETRY.clamp(BEFORE, scene, margin);
        body.x = P.x;
        body.y = P.y;
        if (BEFORE.x !== P.x || BEFORE.y !== P.y) {
            const R_LOCAL = ARENA_GEOMETRY.bounds(scene, margin),
                NX = P.x / (R_LOCAL.x * R_LOCAL.x),
                NY = P.y / (R_LOCAL.y * R_LOCAL.y),
                N = Math.hypot(NX, NY) || 1,
                OUT = ((body.vx || 0) * NX + (body.vy || 0) * NY) / N;
            if (OUT > 0) {
                body.vx -= (1.3 * OUT * NX) / N;
                body.vy -= (1.3 * OUT * NY) / N;
            }
        }
    }
    separateBoss(u) {
        const B_LOCAL = this.boss;
        if (!areOpposingFactions(u, B_LOCAL) || u.hp <= 0 || !u.dropLanded || u.z > B_LOCAL.height) {
            return;
        }
        const DX = u.x - B_LOCAL.x,
            DY = u.y - B_LOCAL.y,
            D_LOCAL = Math.hypot(DX, DY),
            R_LOCAL = B_LOCAL.radius + u.radius;
        if (D_LOCAL >= R_LOCAL) {
            return;
        }
        const A_LOCAL = D_LOCAL > 1e-6 ? Math.atan2(DY, DX) : u.seed,
            NX = Math.cos(A_LOCAL),
            NY = Math.sin(A_LOCAL);
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
            z: u.z,
        });
        if (this.combatLog.length > 240) {
            this.combatLog.shift();
        }
        if (kind === 'launch') {
            this.combat('attack-launch', {
                species: u.species,
                unit: u.id,
                x: u.x,
                y: u.y,
                z: u.z,
                attackKind: abilityProfile(u.species).kind,
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
        // Reuse only groups assigned the aura capability. Membership is compiled
        // once from the registry; buff lifetime and positions stay hit-time.
        for (const SPECIES of speciesWithCapability('commandAura')) {
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
                    Number.isFinite(SOURCE.wheatCommandCritBonus) ? SOURCE.wheatCommandCritBonus : 0,
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
        if (action?.targetId === 'boss' || !action?.targetId) {
            return areOpposingFactions(unit, this.boss) ? this.boss : null;
        }
        const TARGET = this._unitForId(action.targetId);
        return TARGET?.hp > 0 && areOpposingFactions(unit, TARGET) ? TARGET : null;
    }
    createAttackContext(
        u,
        { attackMultiplier = null, attackKind = null, strikeIndex = null, area = false, criticalRoll = null } = {},
    ) {
        const SPEC = abilityProfile(u.species),
            ROSTER = this.raidRoster(u.ownerId),
            ATTACKER_STATS = STATS(u.tier, u.species);
        return {
            source: u,
            sourceKind: hasFaction(u, FACTION_CONFIG.PLAYER) ? 'direct' : 'enemy',
            attackerStats: ATTACKER_STATS,
            damageMultiplier: Number.isFinite(attackMultiplier) ? attackMultiplier : SPEC.skillMultiplier,
            kind: attackKind || SPEC.kind,
            buffed: !!ROSTER && this.time < ROSTER.buffUntil,
            strikeIndex,
            area,
            criticalRoll,
            hitTargets: area ? new Set() : null,
            sourceStatOverrides: {
                critChance: CLAMP(ATTACKER_STATS.critChance + this.wheatCommandCritBonusFor(u), 0, 1),
            },
        };
    }
    combatTargetDefense(target) {
        if (target !== this.boss) {
            const TARGET_STATS = STATS(target.tier, target.species);
            return {
                maxHp: TARGET_STATS.maxHp,
                armor: effectiveBarleyArmor(target, TARGET_STATS.armor, this.time),
            };
        }
        const HP_RATIO =
            Number.isFinite(target.hp) && Number.isFinite(target.maxHp) && target.maxHp > 0
                ? CLAMP(target.hp / target.maxHp, 0, 1)
                : 1;
        return {
            maxHp: target.maxHp,
            armor: effectiveBarleyArmor(target, (1 - HP_RATIO) * 100, this.time),
        };
    }
    damageCombatTarget(u, action, target, point, options = {}) {
        const IS_BOSS = target === this.boss;
        if (
            !target ||
            target.hp <= 0 ||
            !areOpposingFactions(u, target) ||
            action.hit ||
            (IS_BOSS && !hasFaction(u, FACTION_CONFIG.PLAYER)) ||
            options.attackContext?.hitTargets?.has(target)
        ) {
            return false;
        }
        action.hit = true;
        const CONTEXT = options.attackContext || this.createAttackContext(u, options),
            {
                source: SOURCE,
                attackerStats: ATTACKER_STATS,
                damageMultiplier: DAMAGE_MULTIPLIER,
                kind: KIND,
                buffed: BUFFED,
            } = CONTEXT;
        CONTEXT.hitTargets?.add(target);
        const DEFENSE = this.combatTargetDefense(target),
            HARVEST_MULTIPLIER = this.riceHarvestMultiplier(SOURCE, target, KIND, target.hp, DEFENSE.maxHp);
        const GUARD = IS_BOSS ? null : target.ability.receiveGuard?.(this);
        const RAW_DAMAGE =
            ATTACKER_STATS.attackPower *
            DAMAGE_MULTIPLIER *
            (BUFFED ? CONFIG.raid.buff.damage : 1) *
            HARVEST_MULTIPLIER *
            (GUARD?.receivedDamageMultiplier ?? 1);
        // The context belongs to one attack, so a mixed boss/unit area hit shares
        // one lazy roll while each target retains its own armor and actual HP loss.
        const DAMAGE = applyDamageToTargets(SOURCE, [target], {
            rawDamage: RAW_DAMAGE,
            area: CONTEXT.area,
            sourceKind: CONTEXT.sourceKind,
            sourceStatOverrides: CONTEXT.sourceStatOverrides,
            armorForTarget: () => DEFENSE.armor,
            roll: () => CONTEXT.criticalRoll ?? (CONTEXT.criticalRoll = this.random()),
        });
        if (!IS_BOSS) {
            this._syncUnitAliveCount(target);
        }
        this.applyGrainOnBasicHit(SOURCE, target, KIND);
        const STRENGTH =
            DAMAGE_MULTIPLIER *
            (BUFFED ? CONFIG.raid.buff.damage : 1) *
            HARVEST_MULTIPLIER *
            (DAMAGE.critical ? ATTACKER_STATS.critMultiplier : 1);
        if (IS_BOSS) {
            this.finishBossHit(SOURCE, action, point, CONTEXT, DAMAGE, STRENGTH);
        } else {
            this.finishUnitHit(SOURCE, action, target, point, CONTEXT, DAMAGE, STRENGTH, GUARD);
        }
        return true;
    }
    finishBossHit(u, action, point, { kind, strikeIndex, buffed }, damage, strength) {
        this.boss.flash = 0.13;
        const DX = point.x - this.boss.x,
            DY = point.y - this.boss.y,
            D_LOCAL = Math.hypot(DX, DY) || 1;
        this.combat('boss-hit', {
            unit: u.id,
            ownerId: u.ownerId,
            species: u.species,
            attackId: action.id,
            strikeIndex,
            attackKind: kind,
            buffed,
            critical: damage.critical,
            x: this.boss.x + (DX / D_LOCAL) * this.boss.radius,
            y: this.boss.y + (DY / D_LOCAL) * this.boss.radius,
            z: CLAMP(point.z + 0.2, 0.2, this.boss.height),
            nx: DX / D_LOCAL,
            ny: DY / D_LOCAL,
            strength,
        });
        this.combatEvent('damage', u, action);
    }
    finishUnitHit(u, action, target, point, { kind, strikeIndex }, damage, strength, guard) {
        const DX = target.x - u.x,
            DY = target.y - u.y,
            N = Math.hypot(DX, DY) || 1;
        target.knock(
            DX / N,
            DY / N,
            5 * (guard?.receivedKnockbackMultiplier ?? 1),
            2.4 * (guard?.receivedKnockbackMultiplier ?? 1),
            u,
        );
        if (target.hp === 0) {
            target.down = target.isBattleOnlySummon ? 0 : CONFIG.unit.corpseRecoverySeconds;
            this.handleUnitDeath(target);
        }
        this.metrics.directHits++;
        this.metrics.basicHits++;
        this.combat('unit-hit', {
            attackKind: kind,
            attackId: action.id,
            strikeIndex,
            unit: target.id,
            sourceUnit: u.id,
            damage: damage?.damage || 0,
            x: point.x,
            y: point.y,
            z: Math.max(0.15, target.z + 0.25),
            nx: DX / N,
            ny: DY / N,
            strength,
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
            const QUEUE = [kernel],
                QUEUED = new Set();
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
                const CONFIG_LOCAL = CURRENT.popcornConfig,
                    CENTER = {
                        x: CURRENT.x,
                        y: CURRENT.y,
                        z: 0,
                    },
                    RANGE = CONFIG_LOCAL.radius;
                this.effects.push({
                    kind: 'popcorn-explosion',
                    x: CURRENT.x,
                    y: CURRENT.y,
                    z: 0,
                    life: 0,
                    duration: 0.5,
                    radius: RANGE,
                    owner: CURRENT.owner,
                });
                const OWNER = this._unitForId(CURRENT.owner) || {
                    id: CURRENT.owner,
                    ownerId: CURRENT.ownerId || '',
                    faction: CURRENT.faction,
                    species: CURRENT.species,
                    tier: CURRENT.tier,
                    x: CURRENT.x,
                    y: CURRENT.y,
                    z: 0,
                };
                const TARGETS = [];
                if (
                    areOpposingFactions(OWNER, this.boss) &&
                    !CURRENT.damagedTargetIds.includes('boss') &&
                    Math.hypot(CURRENT.x - this.boss.x, CURRENT.y - this.boss.y) <= RANGE + this.boss.radius
                ) {
                    TARGETS.push(this.boss);
                }
                for (const TARGET of this.units) {
                    if (
                        TARGET.hp > 0 &&
                        areOpposingFactions(OWNER, TARGET) &&
                        !CURRENT.damagedTargetIds.includes(TARGET.id) &&
                        Math.hypot(CURRENT.x - TARGET.x, CURRENT.y - TARGET.y) <= RANGE + TARGET.radius
                    ) {
                        TARGETS.push(TARGET);
                    }
                }
                const ATTACK_CONTEXT = this.createAttackContext(OWNER, {
                    attackMultiplier: CONFIG_LOCAL.damageMultiplier,
                    attackKind: 'corn-popcorn-explosion',
                    area: true,
                });
                for (const TARGET of TARGETS) {
                    const ACTION = {
                        id: CURRENT.id,
                        hit: false,
                        attackKind: 'corn-popcorn-explosion',
                    };
                    const APPLIED = this.damageCombatTarget(OWNER, ACTION, TARGET, CENTER, {
                        attackContext: ATTACK_CONTEXT,
                    });
                    if (APPLIED) {
                        CURRENT.damagedTargetIds.push(TARGET === this.boss ? 'boss' : TARGET.id);
                    }
                }
                for (const OTHER of this.projectiles) {
                    if (
                        OTHER === CURRENT ||
                        !OTHER.isPopcorn ||
                        OTHER.exploded ||
                        !OTHER.landed ||
                        QUEUED.has(OTHER.id)
                    ) {
                        continue;
                    }
                    if (Math.hypot(OTHER.x - CURRENT.x, OTHER.y - CURRENT.y) <= RANGE + OTHER.radius) {
                        QUEUE.push(OTHER);
                    }
                }
                this.combat('popcorn-explosion', {
                    unit: CURRENT.owner,
                    ownerId: CURRENT.ownerId || '',
                    species: CURRENT.species,
                    x: CURRENT.x,
                    y: CURRENT.y,
                    radius: RANGE,
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
            for (const P of this.projectiles) {
                if (P.isPopcorn && P.landed) {
                    if (!P.exploded) {
                        P.fuseRemaining = Math.max(0, P.fuseRemaining - dt);
                    } else {
                        P.explosionLife = (P.explosionLife || 0) + dt;
                    }
                    continue;
                }
                const OLD = {
                    x: P.x,
                    y: P.y,
                    z: P.z,
                };
                P.elapsed += dt;
                Object.assign(P, BALLISTICS.sample(P.path, P.elapsed / P.path.duration));
                const CANDIDATE = P.targetId && P.targetId !== 'boss' ? this._unitForId(P.targetId) : this.boss;
                const TARGET = CANDIDATE === this.boss || CANDIDATE?.hp > 0 ? CANDIDATE : null;
                const HIT = TARGET ? ARENA_GEOMETRY.sweep(OLD, P, P.radius, P.height, TARGET) : null;
                if (P.isPopcorn && (HIT || P.elapsed >= P.path.duration)) {
                    if (HIT) {
                        Object.assign(P, {
                            x: HIT.x,
                            y: HIT.y,
                            z: 0,
                        });
                    } else {
                        P.z = 0;
                    }
                    P.landed = true;
                    P.fuseRemaining = P.popcornConfig.fuseSeconds;
                    this.effects.push({
                        kind: 'popcorn-kernel-impact',
                        x: P.x,
                        y: P.y,
                        z: 0,
                        life: 0,
                        duration: 0.25,
                        radius: P.radius,
                        owner: P.owner,
                    });
                } else if (HIT) {
                    Object.assign(P, {
                        x: HIT.x,
                        y: HIT.y,
                        z: HIT.z,
                    });
                    const SOURCE = this._unitForId(P.owner),
                        IMPACT_UNIT = SOURCE || {
                            id: P.owner,
                            ownerId: P.ownerId || '',
                            faction: P.faction,
                            species: P.species,
                            tier: P.tier,
                            x: P.x,
                            y: P.y,
                            z: P.z,
                        };
                    this.damageCombatTarget(IMPACT_UNIT, P, TARGET, HIT, {
                        attackMultiplier: P.attackMultiplier,
                        attackKind: P.projectileKind || 'lob',
                    });
                } else if (P.elapsed >= P.path.duration) {
                    P.z = 0;
                    this.emit(P.projectileKind === 'chestnut-spike' ? 'spike-land' : 'shell-land', P.x, P.y);
                }
            }
            for (const P of this.projectiles) {
                if (!P.isPopcorn || !P.landed || P.exploded) {
                    continue;
                }
                const TOUCHING = this.projectiles.some(
                    (other) =>
                        other !== P &&
                        other.isPopcorn &&
                        other.landed &&
                        !other.exploded &&
                        Math.hypot(other.x - P.x, other.y - P.y) <= other.radius + P.radius,
                );
                if (P.fuseRemaining > 0 && !TOUCHING) {
                    continue;
                }
                this.explodePopcorn(P);
            }
            this.projectiles = this.projectiles.filter((p) =>
                p.isPopcorn ? !p.exploded || p.explosionLife < 0.5 : !p.hit && p.elapsed < p.path.duration,
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
        const B_LOCAL = enemy,
            SPEC = abilityProfile(u.species),
            DX = u.x - B_LOCAL.x,
            DY = u.y - B_LOCAL.y,
            N = Math.hypot(DX, DY) || 1,
            TARGET_ID = enemy === this.boss ? 'boss' : enemy.id;
        // Hold the current firing bearing. Ranged troops retreat from a boss that closes in;
        // they never follow a rotating slot through its body to reach the opposite side.
        const BEHAVIOR = unitCapabilityComposition(u.species),
            STAND = B_LOCAL.radius + SPEC.range + (u.tier - 1) * 0.12,
            MIN = STAND - 0.55,
            MAX = STAND + BEHAVIOR.outerRangeSlack;
        if (N > MAX || (BEHAVIOR.retreatWithinRange && N < MIN)) {
            const SLOT = ARENA_GEOMETRY.clamp(
                {
                    x: B_LOCAL.x + (DX / N) * STAND,
                    y: B_LOCAL.y + (DY / N) * STAND,
                },
                this.scene,
                u.radius,
            );
            this.steer(u, SLOT.x, SLOT.y, dt, scaleMoveSpeed(4.1, u));
            return;
        }
        u.vx = u.vy = 0;
        const TARGET = BEHAVIOR.aimAtCenter
            ? {
                  id: TARGET_ID,
                  x: B_LOCAL.x,
                  y: B_LOCAL.y,
              }
            : {
                  id: TARGET_ID,
                  x: B_LOCAL.x + (DX / N) * (B_LOCAL.radius + u.radius - 0.16),
                  y: B_LOCAL.y + (DY / N) * (B_LOCAL.radius + u.radius - 0.16),
              };
        if (
            this.scatterApplies(u) &&
            BEHAVIOR.attack === 'contact' &&
            this.scatterSegmentBlocked(
                u.x,
                u.y,
                TARGET.x,
                TARGET.y,
                this.localScatter.radius + u.radius + CONFIG.scatter.bodyMargin,
            )
        ) {
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
            bossPatternElapsed: BOSS_PATTERN_ELAPSED,
        });
    }
    finishFarmBossEvent(outcome) {
        if (this.scene !== 'farm' || this.farmBossEvent.phase !== 'fighting') {
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
            phase: 'celebrating',
            elapsed: 0,
            outcome,
            encounterId: ENCOUNTER_ID,
            rewardStatus: 'none',
            rewardChance: 0,
            rewardRoll: 0,
            rewardUnitId: 0,
        };
        for (const U of this.units) {
            if (U.hp > 0) {
                U.ability.interrupt();
            }
        }
        if (outcome === 'victory') {
            const SETTLEMENT = settleBossKill(this, {
                encounterId: ENCOUNTER_ID,
                source: 'farm',
                species: this.boss.species,
                tier: 1,
                x: this.boss.x,
                y: this.boss.y,
            });
            const REWARD = SETTLEMENT.receipt;
            this.combat('farm-boss-xp', {
                encounterId: ENCOUNTER_ID,
                xp: SETTLEMENT.xpAwarded,
                levelsGained: SETTLEMENT.levelsGained,
                pointsAwarded: SETTLEMENT.pointsAwarded,
            });
            this.combat('farm-boss-reward', {
                acquired: REWARD.status === 'granted',
                pending: REWARD.status === 'pending',
                species: REWARD.species,
                tier: REWARD.tier,
                chance: REWARD.chance,
                roll: REWARD.roll,
                encounterId: ENCOUNTER_ID,
            });
        }
        this.markProgressChanged();
        this.combat(outcome === 'victory' ? 'farm-boss-victory' : 'farm-boss-defeat', {
            x: this.boss.x,
            y: this.boss.y,
            z: 0,
        });
        return true;
    }
    bossAttackArea(unitRadius = 0) {
        return bossAttackArea(this.boss, unitRadius, this.scene);
    }
    bossWeaponPoint(q = 0) {
        const B_LOCAL = this.boss,
            A_LOCAL = B_LOCAL.patternRuntime?.active,
            CONFIG_LOCAL = BOSS_PATTERN_CONFIG[A_LOCAL?.id];
        if (A_LOCAL?.id === 'attack.fan-sweep') {
            const ANGLE = A_LOCAL.aim - CONFIG_LOCAL.sector / 2 + CONFIG_LOCAL.sector * CLAMP(q, 0, 1);
            return {
                x: B_LOCAL.x + Math.cos(ANGLE) * CONFIG_LOCAL.reach,
                y: B_LOCAL.y + Math.sin(ANGLE) * CONFIG_LOCAL.reach,
                z: B_LOCAL.z + 0.2,
            };
        }
        const REACH =
            B_LOCAL.radius -
            0.25 +
            (CONFIG.boss.sweepReach - B_LOCAL.radius + 0.25) * Math.sin(Math.PI * CLAMP(q, 0, 1));
        return {
            x: B_LOCAL.x + Math.cos(B_LOCAL.angle) * REACH,
            y: B_LOCAL.y + Math.sin(B_LOCAL.angle) * REACH,
            z: B_LOCAL.z + 0.2,
        };
    }
    livingBossTargets() {
        return this.units
            .filter((u) => hasFaction(u, FACTION_CONFIG.PLAYER) && u.hp > 0 && u.dropLanded)
            .sort((a, b) => a.id - b.id);
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
            if (NEXT < distance || (NEXT === distance && (!best || UNIT_LOCAL.id < best.id))) {
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
        const B_LOCAL = this.boss,
            RANGE = CONFIG.unit.perceptionRange,
            EXTENT = RANGE + CONFIG.unit.maxRadius,
            UNITS = this._bossGridUnits,
            GROUND_UNITS = this._bossGroundUnits;
        UNITS.length = 0;
        GROUND_UNITS.length = 0;
        this.unitSpatial.queryAABB(
            B_LOCAL.x - EXTENT,
            B_LOCAL.y - EXTENT,
            B_LOCAL.x + EXTENT,
            B_LOCAL.y + EXTENT,
            this._bossQueryCandidates,
        );
        for (const UNIT_LOCAL of this._bossQueryCandidates) {
            if (
                !this._unitIsActive(UNIT_LOCAL) ||
                !hasFaction(UNIT_LOCAL, FACTION_CONFIG.PLAYER) ||
                UNIT_LOCAL.hp <= 0 ||
                !UNIT_LOCAL.dropLanded ||
                Math.hypot(UNIT_LOCAL.x - B_LOCAL.x, UNIT_LOCAL.y - B_LOCAL.y) > RANGE + UNIT_LOCAL.radius
            ) {
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
            range: RANGE,
        };
    }
    eachBossGridUnit(grid, minX, minY, maxX, maxY, visit, groundOnly = false) {
        this.unitSpatial.queryAABB(minX, minY, maxX, maxY, this._bossQueryCandidates);
        const B_LOCAL = this.boss;
        for (const UNIT_LOCAL of this._bossQueryCandidates) {
            if (
                !this._unitIsActive(UNIT_LOCAL) ||
                !hasFaction(UNIT_LOCAL, FACTION_CONFIG.PLAYER) ||
                UNIT_LOCAL.hp <= 0 ||
                !UNIT_LOCAL.dropLanded ||
                (groundOnly && UNIT_LOCAL.z > 0.1) ||
                Math.hypot(UNIT_LOCAL.x - B_LOCAL.x, UNIT_LOCAL.y - B_LOCAL.y) > grid.range + UNIT_LOCAL.radius
            ) {
                continue;
            }
            visit(UNIT_LOCAL);
        }
    }
    chargeBossTarget(living, grid = this.bossTargetGrid(living)) {
        const B_LOCAL = this.boss,
            CONFIG_LOCAL = BOSS_PATTERN_CONFIG['attack.charge'];
        if (!grid.units.length) {
            return null;
        }
        // Candidate routes are angularly bucketed, then each route is scored only
        // against occupants of the spatial cells intersecting its swept envelope.
        const BINS = 72,
            CANDIDATES = new Map();
        for (const UNIT_LOCAL of grid.units) {
            const DX = UNIT_LOCAL.x - B_LOCAL.x,
                DY = UNIT_LOCAL.y - B_LOCAL.y,
                D_LOCAL = Math.hypot(DX, DY),
                ANGLE = Math.atan2(DY, DX),
                BIN = Math.floor(((ANGLE + Math.PI) / (Math.PI * 2)) * BINS) % BINS,
                CURRENT = CANDIDATES.get(BIN);
            if (
                !CURRENT ||
                D_LOCAL < CURRENT.distance - 1e-9 ||
                (Math.abs(D_LOCAL - CURRENT.distance) <= 1e-9 && UNIT_LOCAL.id < CURRENT.unit.id)
            ) {
                CANDIDATES.set(BIN, {
                    unit: UNIT_LOCAL,
                    distance: D_LOCAL,
                    angle: ANGLE,
                });
            }
        }
        let best = null;
        for (const CANDIDATE of CANDIDATES.values()) {
            const END = ARENA_GEOMETRY.clamp(
                    {
                        x: B_LOCAL.x + Math.cos(CANDIDATE.angle) * CONFIG_LOCAL.reach,
                        y: B_LOCAL.y + Math.sin(CANDIDATE.angle) * CONFIG_LOCAL.reach,
                    },
                    this.scene,
                    B_LOCAL.radius + 0.25,
                ),
                FROM = {
                    x: B_LOCAL.x,
                    y: B_LOCAL.y,
                    z: B_LOCAL.z,
                },
                TO = {
                    x: END.x,
                    y: END.y,
                    z: B_LOCAL.z,
                },
                EXTENT = B_LOCAL.radius + CONFIG.unit.maxRadius;
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
                },
            );
            if (
                score &&
                (!best ||
                    score > best.score ||
                    (score === best.score &&
                        (CANDIDATE.distance < best.distance - 1e-9 ||
                            (Math.abs(CANDIDATE.distance - best.distance) <= 1e-9 &&
                                CANDIDATE.unit.id < best.unit.id))))
            ) {
                best = {
                    ...CANDIDATE,
                    score,
                };
            }
        }
        return best?.unit || null;
    }
    leapBossTarget(living, grid = this.bossTargetGrid(living)) {
        const B_LOCAL = this.boss,
            CONFIG_LOCAL = BOSS_PATTERN_CONFIG['attack.leap-slam'];
        if (!grid.units.length) {
            return null;
        }
        // Leap candidates are clipped to the real maximum landing distance; score
        // the exact landing disk with a spatial-cell query, not a unit-pair pass.
        const CANDIDATES = new Map(),
            SIZE = grid.cellSize;
        for (const UNIT_LOCAL of grid.groundUnits) {
            let dx = UNIT_LOCAL.x - B_LOCAL.x;
            let dy = UNIT_LOCAL.y - B_LOCAL.y;
            const D_LOCAL = Math.hypot(dx, dy) || 1;
            if (D_LOCAL > CONFIG_LOCAL.reach) {
                dx *= CONFIG_LOCAL.reach / D_LOCAL;
                dy *= CONFIG_LOCAL.reach / D_LOCAL;
            }
            const POINT = ARENA_GEOMETRY.clamp(
                    {
                        x: B_LOCAL.x + dx,
                        y: B_LOCAL.y + dy,
                    },
                    this.scene,
                    B_LOCAL.radius + 0.25,
                ),
                CELL_X = Math.floor(POINT.x / SIZE),
                CELL_Y = Math.floor(POINT.y / SIZE),
                KEY = (CELL_Y + 64) * 128 + (CELL_X + 64),
                DISTANCE = Math.hypot(UNIT_LOCAL.x - B_LOCAL.x, UNIT_LOCAL.y - B_LOCAL.y),
                CURRENT = CANDIDATES.get(KEY);
            if (
                !CURRENT ||
                DISTANCE < CURRENT.distance - 1e-9 ||
                (Math.abs(DISTANCE - CURRENT.distance) <= 1e-9 && UNIT_LOCAL.id < CURRENT.unit.id)
            ) {
                CANDIDATES.set(KEY, {
                    unit: UNIT_LOCAL,
                    distance: DISTANCE,
                    point: POINT,
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
                    if (
                        Math.hypot(unit.x - CANDIDATE.point.x, unit.y - CANDIDATE.point.y) <=
                        CONFIG_LOCAL.landingRadius + unit.radius
                    ) {
                        score++;
                    }
                },
                true,
            );
            if (
                score &&
                (!best ||
                    score > best.score ||
                    (score === best.score &&
                        (CANDIDATE.distance < best.distance - 1e-9 ||
                            (Math.abs(CANDIDATE.distance - best.distance) <= 1e-9 &&
                                CANDIDATE.unit.id < best.unit.id))))
            ) {
                best = {
                    ...CANDIDATE,
                    score,
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
            leap: this.leapBossTarget(living, GRID),
        };
    }
    bossTargetForPattern(id, living) {
        if (id === 'attack.charge') {
            return this.chargeBossTarget(living);
        }
        if (id === 'attack.leap-slam') {
            return this.leapBossTarget(living);
        }
        return this.nearestBossTarget(living, true);
    }
    eligibleBossPatterns(living, targets = this.bossPatternTargets(living)) {
        const RUNTIME = this.boss.patternRuntime,
            ALIVE_ADDS = this.units.reduce((n, u) => n + (hasFaction(u, FACTION_CONFIG.ENEMY) && u.hp > 0 ? 1 : 0), 0),
            ELIGIBLE = [];
        for (const ID of BOSS_PATTERN_IDS) {
            if (RUNTIME.cooldowns[ID] > 1e-9) {
                continue;
            }
            if (ID === 'summon.mouth-t1') {
                if (
                    RUNTIME.encounterElapsed + 1e-9 >= BOSS_PATTERN_CONFIG[ID].firstEligible &&
                    ALIVE_ADDS < CONFIG.boss.maxSummons
                ) {
                    ELIGIBLE.push(ID);
                }
                continue;
            }
            const TARGET =
                ID === 'attack.charge' ? targets.charge : ID === 'attack.leap-slam' ? targets.leap : targets.nearest;
            if (!TARGET) {
                continue;
            }
            if (ID === 'attack.charge' || ID === 'attack.leap-slam') {
                ELIGIBLE.push(ID);
            } else if (
                Math.hypot(TARGET.x - this.boss.x, TARGET.y - this.boss.y) <=
                BOSS_PATTERN_CONFIG[ID].reach + TARGET.radius + 1e-9
            ) {
                ELIGIBLE.push(ID);
            }
        }
        return ELIGIBLE;
    }
    beginBossPattern(id, target) {
        const B_LOCAL = this.boss,
            RUNTIME = B_LOCAL.patternRuntime,
            CONFIG_LOCAL = BOSS_PATTERN_CONFIG[id];
        if (!CONFIG_LOCAL) {
            return false;
        }
        const TARGET_POINT = target
                ? {
                      x: target.x,
                      y: target.y,
                      z: target.z || 0,
                  }
                : null,
            AIM = TARGET_POINT ? Math.atan2(TARGET_POINT.y - B_LOCAL.y, TARGET_POINT.x - B_LOCAL.x) : B_LOCAL.angle;
        RUNTIME.active = {
            id,
            phase: 'windup',
            phaseElapsed: 0,
            targetId: target?.id ?? 0,
            target: TARGET_POINT,
            aim: AIM,
            locked: false,
            start: {
                x: B_LOCAL.x,
                y: B_LOCAL.y,
                z: B_LOCAL.z,
            },
            traveled: 0,
            hitIds: new Set(),
            volleyCount: 0,
            released: 0,
            nextRelease: 0,
            path: null,
        };
        B_LOCAL.angle = AIM;
        B_LOCAL.facing = AIM;
        this.combat('boss-pattern-prepare', {
            patternId: id,
            attackKind: id,
            x: B_LOCAL.x,
            y: B_LOCAL.y,
            z: B_LOCAL.z,
            angle: AIM,
            targetId: RUNTIME.active.targetId,
        });
        return true;
    }
    hitBossPatternUnit(unit, patternId, point, normal = null) {
        const B_LOCAL = this.boss,
            ACTION = B_LOCAL.patternRuntime.active,
            CONFIG_LOCAL = BOSS_PATTERN_CONFIG[patternId];
        if (
            !ACTION ||
            !CONFIG_LOCAL ||
            !hasFaction(unit, FACTION_CONFIG.PLAYER) ||
            !areOpposingFactions(B_LOCAL, unit) ||
            unit.hp <= 0 ||
            !unit.dropLanded ||
            ACTION.hitIds.has(unit.id)
        ) {
            return false;
        }
        if (CONFIG_LOCAL.groundOnly && unit.z > 0.1) {
            return false;
        }
        ACTION.hitIds.add(unit.id);
        const DX = normal?.x ?? unit.x - B_LOCAL.x,
            DY = normal?.y ?? unit.y - B_LOCAL.y,
            N = Math.hypot(DX, DY) || 1;
        const GUARD = unit.ability.receiveGuard?.(this),
            KNOCKBACK_MULTIPLIER = GUARD?.receivedKnockbackMultiplier ?? 1;
        unit.knock(
            DX / N,
            DY / N,
            CONFIG_LOCAL.knockback * KNOCKBACK_MULTIPLIER,
            CONFIG_LOCAL.lift * KNOCKBACK_MULTIPLIER,
            B_LOCAL,
        );
        if (!hasFaction(unit, FACTION_CONFIG.PLAYER) || !areOpposingFactions(B_LOCAL, unit)) {
            return false;
        }
        applyDamageToTargets(null, [unit], {
            rawDamage: B_LOCAL.attackPower * CONFIG_LOCAL.damageMultiplier * (GUARD?.receivedDamageMultiplier ?? 1),
            sourceKind: 'enemy',
        });
        this._syncUnitAliveCount(unit);
        if (unit.hp === 0) {
            unit.down = unit.isBattleOnlySummon ? 0 : CONFIG.unit.corpseRecoverySeconds;
            this.handleUnitDeath(unit);
        }
        const IS_SWEEP = patternId === 'attack.sweep-360' || patternId === 'attack.fan-sweep';
        this.metrics.directHits++;
        this.metrics[IS_SWEEP ? 'sweepHits' : 'basicHits']++;
        this.combat('unit-hit', {
            attackKind: patternId,
            attackId: B_LOCAL.attackId,
            unit: unit.id,
            x: point.x,
            y: point.y,
            z: Math.max(0.15, unit.z + 0.25),
            nx: DX / N,
            ny: DY / N,
            strength: CONFIG_LOCAL.damageMultiplier,
        });
        return true;
    }
    resolveBossSector(action, patternId, range, sector) {
        const B_LOCAL = this.boss,
            AIM = action.aim,
            HALF = sector / 2;
        let hits = 0;
        const EXTENT = range + CONFIG.unit.maxRadius;
        for (const UNIT_LOCAL of this._collectBossTargets(
            B_LOCAL.x - EXTENT,
            B_LOCAL.y - EXTENT,
            B_LOCAL.x + EXTENT,
            B_LOCAL.y + EXTENT,
            this._bossHitCandidates,
            true,
        )) {
            if (action.hitIds.has(UNIT_LOCAL.id) || UNIT_LOCAL.z > 0.1) {
                continue;
            }
            const DX = UNIT_LOCAL.x - B_LOCAL.x,
                DY = UNIT_LOCAL.y - B_LOCAL.y,
                D_LOCAL = Math.hypot(DX, DY);
            if (D_LOCAL > range + UNIT_LOCAL.radius) {
                continue;
            }
            const OFFSET = Math.atan2(Math.sin(Math.atan2(DY, DX) - AIM), Math.cos(Math.atan2(DY, DX) - AIM)),
                PAD =
                    D_LOCAL <= UNIT_LOCAL.radius
                        ? Math.PI
                        : Math.asin(Math.min(1, UNIT_LOCAL.radius / Math.max(D_LOCAL, 1e-6)));
            if (Math.abs(OFFSET) > HALF + PAD) {
                continue;
            }
            const N = D_LOCAL || 1;
            if (
                this.hitBossPatternUnit(
                    UNIT_LOCAL,
                    patternId,
                    {
                        x: UNIT_LOCAL.x,
                        y: UNIT_LOCAL.y,
                        z: 0,
                    },
                    {
                        x: DX / N,
                        y: DY / N,
                    },
                )
            ) {
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
            true,
        )) {
            if (action.hitIds.has(UNIT_LOCAL.id)) {
                continue;
            }
            const DX = UNIT_LOCAL.x - B_LOCAL.x,
                DY = UNIT_LOCAL.y - B_LOCAL.y,
                D_LOCAL = Math.hypot(DX, DY);
            if (D_LOCAL > range + UNIT_LOCAL.radius) {
                continue;
            }
            if (
                this.hitBossPatternUnit(
                    UNIT_LOCAL,
                    patternId,
                    {
                        x: B_LOCAL.x + (DX / (D_LOCAL || 1)) * Math.min(D_LOCAL, range),
                        y: B_LOCAL.y + (DY / (D_LOCAL || 1)) * Math.min(D_LOCAL, range),
                        z: 0,
                    },
                    {
                        x: DX / (D_LOCAL || 1),
                        y: DY / (D_LOCAL || 1),
                    },
                )
            ) {
                hits++;
            }
        }
        return hits;
    }
    sweepBossBody(old, patternId) {
        const B_LOCAL = this.boss,
            ACTION = B_LOCAL.patternRuntime.active,
            EXTENT = B_LOCAL.radius + CONFIG.unit.maxRadius;
        for (const UNIT_LOCAL of this._collectBossTargets(
            Math.min(old.x, B_LOCAL.x) - EXTENT,
            Math.min(old.y, B_LOCAL.y) - EXTENT,
            Math.max(old.x, B_LOCAL.x) + EXTENT,
            Math.max(old.y, B_LOCAL.y) + EXTENT,
            this._bossHitCandidates,
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
                    patternId === 'attack.charge'
                        ? {
                              x: Math.cos(B_LOCAL.patternRuntime.active.aim),
                              y: Math.sin(B_LOCAL.patternRuntime.active.aim),
                          }
                        : null,
                );
            }
        }
    }
    fanBossWeapon(action, q0, q1) {
        const CONFIG_LOCAL = BOSS_PATTERN_CONFIG[action.id],
            SPAN = CONFIG_LOCAL.sector,
            FROM_ANGLE = action.aim - SPAN / 2 + SPAN * CLAMP(q0, 0, 1),
            TO_ANGLE = action.aim - SPAN / 2 + SPAN * CLAMP(q1, 0, 1),
            B_LOCAL = this.boss;
        const FROM = {
                x: B_LOCAL.x + Math.cos(FROM_ANGLE) * CONFIG_LOCAL.reach,
                y: B_LOCAL.y + Math.sin(FROM_ANGLE) * CONFIG_LOCAL.reach,
                z: 0.2,
            },
            TO = {
                x: B_LOCAL.x + Math.cos(TO_ANGLE) * CONFIG_LOCAL.reach,
                y: B_LOCAL.y + Math.sin(TO_ANGLE) * CONFIG_LOCAL.reach,
                z: 0.2,
            };
        const EXTENT = CONFIG_LOCAL.reach + CONFIG_LOCAL.width + CONFIG.unit.maxRadius;
        for (const UNIT_LOCAL of this._collectBossTargets(
            B_LOCAL.x - EXTENT,
            B_LOCAL.y - EXTENT,
            B_LOCAL.x + EXTENT,
            B_LOCAL.y + EXTENT,
            this._bossHitCandidates,
            true,
        )) {
            if (action.hitIds.has(UNIT_LOCAL.id)) {
                continue;
            }
            const HIT = ARENA_GEOMETRY.sweep(FROM, TO, CONFIG_LOCAL.width, 1.4, UNIT_LOCAL);
            if (HIT) {
                const DX = UNIT_LOCAL.x - B_LOCAL.x,
                    DY = UNIT_LOCAL.y - B_LOCAL.y,
                    N = Math.hypot(DX, DY) || 1;
                this.hitBossPatternUnit(UNIT_LOCAL, action.id, HIT, {
                    x: DX / N,
                    y: DY / N,
                });
            }
        }
    }
    bossMouthPoint(released) {
        return bossMouthWorldPoint(this.boss, released);
    }
    bossSummonLanding(angle, action = null) {
        const B_LOCAL = this.boss,
            SCENE = this.scene,
            RADIUS = UNIT_RADIUS_FOR_TIER(1);
        for (let i = 0; i < 16; i++) {
            const OFFSET = i === 0 ? 0 : ((i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI) / 8,
                A_LOCAL = angle + OFFSET,
                CANDIDATE = {
                    x: B_LOCAL.x + Math.cos(A_LOCAL) * BOSS_PATTERN_CONFIG['summon.mouth-t1'].landingRadius,
                    y: B_LOCAL.y + Math.sin(A_LOCAL) * BOSS_PATTERN_CONFIG['summon.mouth-t1'].landingRadius,
                };
            if (!ARENA_GEOMETRY.inside(CANDIDATE, SCENE, RADIUS)) {
                continue;
            }
            const BLOCKED =
                this.units.some(
                    (unit) =>
                        unit.hp > 0 &&
                        Math.hypot(unit.x - CANDIDATE.x, unit.y - CANDIDATE.y) < RADIUS + unit.radius + 0.08,
                ) ||
                (action?.landingPoints || []).some(
                    (point) => Math.hypot(point.x - CANDIDATE.x, point.y - CANDIDATE.y) < RADIUS * 2 + 0.08,
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
        const B_LOCAL = this.boss,
            LANDING = this.bossSummonLanding(action.aim, action);
        if (!LANDING) {
            return false;
        }
        const MOUTH = this.bossMouthPoint(action.released + 1);
        const ID = CONFIG.boss.summonIdBase + ++this.bossSummonSerial,
            UNIT_LOCAL = new UNIT(ID, B_LOCAL.species, 1, MOUTH.x, MOUTH.y),
            ANGLE = Math.atan2(LANDING.y - MOUTH.y, LANDING.x - MOUTH.x),
            FLIGHT_SECONDS = Math.sqrt((2 * MOUTH.z) / CONFIG.physics.gravity),
            HORIZONTAL_DISTANCE = Math.hypot(LANDING.x - MOUTH.x, LANDING.y - MOUTH.y),
            DRAG = 0.8,
            SPEED = (HORIZONTAL_DISTANCE * DRAG) / (1 - Math.exp(-DRAG * FLIGHT_SECONDS));
        Object.assign(UNIT_LOCAL, {
            ownerId: 'boss',
            farmId: 0,
            faction: FACTION_CONFIG.ENEMY,
            home: {
                x: MOUTH.x,
                y: MOUTH.y,
            },
            hp: STATS(1, B_LOCAL.species).maxHp,
            down: 0,
            isBattleOnlySummon: true,
            battleSummonKind: 'boss-mouth-t1',
            battleSummonParentId: 0,
            battleSummonEncounterId: B_LOCAL.encounterId || 1,
            countsTowardPermanentRoster: false,
            eligibleForRaidDeployment: false,
            breedingEligible: false,
            mergeEligible: false,
            canSplit: false,
            usesPersistentSleep: false,
            lifetime: 'until-death-or-battle-end',
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
            seed: ID * 2.39996,
        });
        this.units.push(UNIT_LOCAL);
        this._trackUnitAdded(UNIT_LOCAL);
        action.released++;
        action.landingPoints ||= [];
        action.landingPoints.push(LANDING);
        this.boss.summonMouth = MOUTH;
        this.combat('boss-mouth-spit', {
            patternId: action.id,
            unit: ID,
            species: B_LOCAL.species,
            x: MOUTH.x,
            y: MOUTH.y,
            z: MOUTH.z,
            landingX: LANDING.x,
            landingY: LANDING.y,
            sequence: action.released,
        });
        return true;
    }
    activateBossPattern(action) {
        const B_LOCAL = this.boss,
            RUNTIME = B_LOCAL.patternRuntime,
            CONFIG_LOCAL = BOSS_PATTERN_CONFIG[action.id];
        action.phase = 'active';
        action.phaseElapsed = 0;
        B_LOCAL.attackId = ++this.attackSerial;
        action.hitIds.clear();
        RUNTIME.cooldowns[action.id] = CONFIG_LOCAL.cooldown;
        this.combat('boss-pattern-launch', {
            patternId: action.id,
            attackKind: action.id,
            attackId: B_LOCAL.attackId,
            x: B_LOCAL.x,
            y: B_LOCAL.y,
            z: B_LOCAL.z,
            angle: action.aim,
            targetId: action.targetId || 0,
        });
        if (action.id === 'attack.sweep-360') {
            this.resolveBossCircle(action, action.id, CONFIG_LOCAL.reach);
            this.enterBossPatternRecovery(action);
            return;
        }
        if (action.id === 'attack.front-slam') {
            this.resolveBossSector(action, action.id, CONFIG_LOCAL.reach, CONFIG_LOCAL.sector);
            this.enterBossPatternRecovery(action);
            return;
        }
        if (action.id === 'attack.charge') {
            action.start = {
                x: B_LOCAL.x,
                y: B_LOCAL.y,
                z: B_LOCAL.z,
            };
            action.traveled = 0;
            return;
        }
        if (action.id === 'attack.leap-slam') {
            let x = action.target?.x ?? B_LOCAL.x;
            let y = action.target?.y ?? B_LOCAL.y;
            const DX = x - B_LOCAL.x;
            const DY = y - B_LOCAL.y;
            const D_LOCAL = Math.hypot(DX, DY);
            if (D_LOCAL > CONFIG_LOCAL.reach) {
                x = B_LOCAL.x + (DX / D_LOCAL) * CONFIG_LOCAL.reach;
                y = B_LOCAL.y + (DY / D_LOCAL) * CONFIG_LOCAL.reach;
            }
            const LAND = ARENA_GEOMETRY.clamp(
                {
                    x,
                    y,
                },
                this.scene,
                B_LOCAL.radius + 0.25,
            );
            action.target = {
                x: LAND.x,
                y: LAND.y,
                z: 0,
            };
            action.path = BALLISTICS.create(
                {
                    x: B_LOCAL.x,
                    y: B_LOCAL.y,
                    z: 0,
                },
                action.target,
                'leap',
            );
            return;
        }
        if (action.id === 'summon.mouth-t1') {
            RUNTIME.cooldowns[action.id] = CONFIG_LOCAL.cooldown;
            const ALIVE = this.units.reduce((n, u) => n + (hasFaction(u, FACTION_CONFIG.ENEMY) && u.hp > 0 ? 1 : 0), 0);
            action.volleyCount = Math.min(CONFIG_LOCAL.volleyCount, Math.max(0, CONFIG.boss.maxSummons - ALIVE));
            action.nextRelease = 0;
            this.spawnBossMouthUnit(action);
            action.nextRelease = CONFIG_LOCAL.releaseInterval;
            return;
        }
    }
    enterBossPatternRecovery(action) {
        action.phase = 'recover';
        action.phaseElapsed = 0;
    }
    updateBossPattern(dt, living) {
        const B_LOCAL = this.boss,
            RUNTIME = B_LOCAL.patternRuntime;
        RUNTIME.encounterElapsed += dt;
        for (const ID of BOSS_PATTERN_IDS) {
            RUNTIME.cooldowns[ID] = Math.max(0, (RUNTIME.cooldowns[ID] || 0) - dt);
        }
        let action = RUNTIME.active;
        if (!action) {
            const TARGETS = this.bossPatternTargets(living),
                TARGET = TARGETS.nearest || this.nearestBossTarget(living),
                ELIGIBLE = this.eligibleBossPatterns(living, TARGETS),
                SELECTED = chooseBossPattern(RUNTIME, ELIGIBLE, () => this.random());
            if (SELECTED) {
                const PICK =
                    SELECTED === 'summon.mouth-t1'
                        ? TARGET
                        : SELECTED === 'attack.charge'
                          ? TARGETS.charge
                          : SELECTED === 'attack.leap-slam'
                            ? TARGETS.leap
                            : TARGETS.nearest;
                this.beginBossPattern(SELECTED, PICK);
                action = RUNTIME.active;
                if (SELECTED === 'summon.mouth-t1') {
                    RUNTIME.cooldowns[SELECTED] = BOSS_PATTERN_CONFIG[SELECTED].cooldown;
                }
            } else {
                if (TARGET) {
                    const DX = TARGET.x - B_LOCAL.x,
                        DY = TARGET.y - B_LOCAL.y,
                        D_LOCAL = Math.hypot(DX, DY) || 1;
                    B_LOCAL.angle = B_LOCAL.facing = Math.atan2(DY, DX);
                    const CONTACT = B_LOCAL.radius + TARGET.radius + 0.2;
                    if (D_LOCAL > CONTACT) {
                        const AMOUNT = Math.min(B_LOCAL.moveSpeed * dt, D_LOCAL - CONTACT),
                            NEXT = {
                                x: B_LOCAL.x + (DX / D_LOCAL) * AMOUNT,
                                y: B_LOCAL.y + (DY / D_LOCAL) * AMOUNT,
                            },
                            BOUNDED = ARENA_GEOMETRY.clamp(NEXT, this.scene, B_LOCAL.radius + 0.25),
                            OLD = {
                                x: B_LOCAL.x,
                                y: B_LOCAL.y,
                                z: B_LOCAL.z,
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
        if (action.phase === 'windup') {
            const CONFIG_LOCAL = BOSS_PATTERN_CONFIG[action.id],
                REMAINING = CONFIG_LOCAL.windup - action.phaseElapsed;
            if (!action.locked) {
                const TARGET = this.bossTargetForPattern(action.id, living);
                if (TARGET) {
                    action.targetId = TARGET.id;
                    action.target = {
                        x: TARGET.x,
                        y: TARGET.y,
                        z: TARGET.z || 0,
                    };
                    const DESIRED = Math.atan2(TARGET.y - B_LOCAL.y, TARGET.x - B_LOCAL.x),
                        DELTA = Math.atan2(Math.sin(DESIRED - action.aim), Math.cos(DESIRED - action.aim));
                    action.aim += CLAMP(DELTA, -BOSS_AIM_TURN_RATE * dt, BOSS_AIM_TURN_RATE * dt);
                    B_LOCAL.angle = B_LOCAL.facing = action.aim;
                }
                if (REMAINING <= 0.25 + 1e-9) {
                    action.locked = true;
                    this.combat('boss-pattern-lock', {
                        patternId: action.id,
                        attackId: B_LOCAL.attackId + 1,
                        targetId: action.targetId || 0,
                        x: action.target?.x ?? B_LOCAL.x,
                        y: action.target?.y ?? B_LOCAL.y,
                        angle: action.aim,
                    });
                }
            }
            if (action.phaseElapsed >= CONFIG_LOCAL.windup - 1e-9) {
                this.activateBossPattern(action);
            }
            return;
        }
        const CONFIG_LOCAL = BOSS_PATTERN_CONFIG[action.id];
        if (action.phase === 'active') {
            if (action.id === 'attack.charge') {
                const DIRECTION = {
                        x: Math.cos(action.aim),
                        y: Math.sin(action.aim),
                    },
                    REMAINING = Math.max(0, CONFIG_LOCAL.reach - action.traveled),
                    DISTANCE = Math.min(CONFIG_LOCAL.speed * dt, REMAINING),
                    OLD = {
                        x: B_LOCAL.x,
                        y: B_LOCAL.y,
                        z: B_LOCAL.z,
                    },
                    CANDIDATE = {
                        x: B_LOCAL.x + DIRECTION.x * DISTANCE,
                        y: B_LOCAL.y + DIRECTION.y * DISTANCE,
                    },
                    BOUNDED = ARENA_GEOMETRY.clamp(CANDIDATE, this.scene, B_LOCAL.radius + 0.25),
                    HIT_BOUNDARY = Math.hypot(CANDIDATE.x - BOUNDED.x, CANDIDATE.y - BOUNDED.y) > 1e-8;
                B_LOCAL.x = BOUNDED.x;
                B_LOCAL.y = BOUNDED.y;
                const MOVED = Math.hypot(B_LOCAL.x - OLD.x, B_LOCAL.y - OLD.y);
                action.traveled += MOVED;
                B_LOCAL.travel += MOVED;
                this.sweepBossBody(OLD, action.id);
                if (HIT_BOUNDARY || action.traveled >= CONFIG_LOCAL.reach - 1e-8 || MOVED < 1e-8) {
                    this.enterBossPatternRecovery(action);
                }
            } else if (action.id === 'attack.leap-slam') {
                const OLD = {
                        x: B_LOCAL.x,
                        y: B_LOCAL.y,
                        z: B_LOCAL.z,
                    },
                    P = BALLISTICS.sample(action.path, action.phaseElapsed / action.path.duration);
                B_LOCAL.x = P.x;
                B_LOCAL.y = P.y;
                B_LOCAL.z = P.z;
                this.sweepBossBody(OLD, action.id);
                if (action.phaseElapsed >= action.path.duration) {
                    B_LOCAL.x = action.path.to.x;
                    B_LOCAL.y = action.path.to.y;
                    B_LOCAL.z = 0;
                    const EXTENT = CONFIG_LOCAL.landingRadius + CONFIG.unit.maxRadius;
                    for (const UNIT_LOCAL of this._collectBossTargets(
                        B_LOCAL.x - EXTENT,
                        B_LOCAL.y - EXTENT,
                        B_LOCAL.x + EXTENT,
                        B_LOCAL.y + EXTENT,
                        this._bossHitCandidates,
                        true,
                    )) {
                        if (action.hitIds.has(UNIT_LOCAL.id)) {
                            continue;
                        }
                        const DX = UNIT_LOCAL.x - B_LOCAL.x,
                            DY = UNIT_LOCAL.y - B_LOCAL.y,
                            D_LOCAL = Math.hypot(DX, DY);
                        if (D_LOCAL <= CONFIG_LOCAL.landingRadius + UNIT_LOCAL.radius) {
                            this.hitBossPatternUnit(
                                UNIT_LOCAL,
                                action.id,
                                {
                                    x: UNIT_LOCAL.x,
                                    y: UNIT_LOCAL.y,
                                    z: 0,
                                },
                                {
                                    x: DX / (D_LOCAL || 1),
                                    y: DY / (D_LOCAL || 1),
                                },
                            );
                        }
                    }
                    this.combat('boss-pattern-land', {
                        patternId: action.id,
                        attackId: B_LOCAL.attackId,
                        x: B_LOCAL.x,
                        y: B_LOCAL.y,
                        z: 0,
                    });
                    this.enterBossPatternRecovery(action);
                }
            } else if (action.id === 'attack.fan-sweep') {
                const Q0 = Math.max(0, (action.phaseElapsed - dt) / CONFIG_LOCAL.active),
                    Q1 = Math.min(1, action.phaseElapsed / CONFIG_LOCAL.active);
                this.fanBossWeapon(action, Q0, Q1);
                if (action.phaseElapsed >= CONFIG_LOCAL.active) {
                    this.enterBossPatternRecovery(action);
                }
            } else if (action.id === 'summon.mouth-t1') {
                while (action.released < action.volleyCount && action.phaseElapsed + 1e-9 >= action.nextRelease) {
                    if (!this.spawnBossMouthUnit(action)) {
                        break;
                    }
                    action.nextRelease += CONFIG_LOCAL.releaseInterval;
                }
                if (action.phaseElapsed >= CONFIG_LOCAL.active) {
                    this.enterBossPatternRecovery(action);
                }
            }
            return;
        }
        if (action.phase === 'recover' && action.phaseElapsed >= CONFIG_LOCAL.recover) {
            RUNTIME.active = null;
        }
    }
    updateBoss(dt) {
        const B_LOCAL = this.boss;
        if (this.scene === 'farm' && this.farmBossEvent.phase !== 'idle') {
            const EVENT = this.farmBossEvent;
            if (EVENT.phase === 'dropping') {
                EVENT.elapsed += dt;
                B_LOCAL.z = Math.max(
                    0,
                    CONFIG.raid.dropHeight - 0.5 * CONFIG.physics.gravity * EVENT.elapsed * EVENT.elapsed,
                );
                if (B_LOCAL.z === 0) {
                    EVENT.phase = 'fighting';
                    EVENT.elapsed = 0;
                    this.combat('farm-boss-land', {
                        x: B_LOCAL.x,
                        y: B_LOCAL.y,
                        z: 0,
                    });
                }
                return;
            }
            if (EVENT.phase === 'fighting') {
                EVENT.elapsed += dt;
                if (B_LOCAL.hp <= 0) {
                    this.finishFarmBossEvent('victory');
                    return;
                }
                if (!this.units.some((u) => hasFaction(u, FACTION_CONFIG.PLAYER) && u.hp > 0 && u.dropLanded)) {
                    this.finishFarmBossEvent('defeat');
                    return;
                }
            } else if (EVENT.phase === 'celebrating') {
                EVENT.elapsed += dt;
                const DURATION =
                    EVENT.outcome === 'defeat'
                        ? CONFIG.farm.bossEvent.celebrationSeconds
                        : CONFIG.farm.bossEvent.fadeSeconds;
                if (EVENT.elapsed >= DURATION) {
                    EVENT.phase = 'fading';
                    EVENT.elapsed = 0;
                }
                return;
            } else if (EVENT.phase === 'fading') {
                EVENT.elapsed += dt;
                if (EVENT.elapsed >= CONFIG.farm.bossEvent.fadeSeconds) {
                    this.farmBossEvent = {
                        phase: 'idle',
                        elapsed: 0,
                        outcome: 'idle',
                        encounterId: 0,
                        rewardStatus: 'none',
                        rewardChance: 0,
                        rewardRoll: 0,
                        rewardUnitId: 0,
                    };
                    this.boss = this.createBoss();
                }
                return;
            }
        }
        if (!B_LOCAL.active) {
            return;
        }
        if (B_LOCAL.hp <= 0) {
            if (this.running) {
                this.finish('victory');
            } else {
                B_LOCAL.active = false;
                B_LOCAL.patternRuntime.active = null;
            }
            return;
        }
        if (
            this.running &&
            this.raidRosters.length &&
            this.raidRosters.every((r) => r.troops.every((t) => t.deployed)) &&
            !this.units.some((u) => hasFaction(u, FACTION_CONFIG.PLAYER) && u.hp > 0)
        ) {
            this.finish('defeat');
            return;
        }
        const LIVING = this.livingBossTargets();
        if (!LIVING.length) {
            return;
        }
        this.updateBossPattern(dt, LIVING);
    }
};
export {
    GARDEN as Garden,
    UNIT as Unit,
    AttackCycle,
    CREATE_UNIT_ATTACK_CYCLE as createUnitAttackCycle,
    FARM_UPGRADE_NODES,
    ATTACK_TYPES,
    ARENA_GEOMETRY as ArenaGeometry,
    BALLISTICS as Ballistics,
    CONFIG,
    CLAMP as clamp,
    MUTABLE_STATS as stats,
    bossAttackArea,
};
