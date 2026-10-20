import { applyOffline } from './farm-offline.js';
import {
    assignWorkers,
    pilesOf,
    plotHasSite,
    sitesOf,
    resetWork,
    restoreSite,
    startSite,
    stepWork,
    workOrder,
} from './farm-work.js';
import { FormationSkills } from './formation-skills.js';
import { createFormationRuntime, createFormationSkillState } from './formation-skill-state.js';
import { RaidDeploymentCards } from './raid-deployment-cards.js';
import { isSpeciesId } from './raid-deployment-cards.js';
import { Signal } from './signal.js';
import {
    unitVisualSize,
    unitVectorScale,
    unitBodyRadius,
    unitBodyHeight,
    unitTorsoHeight,
    maximumUnitRadius,
} from './features/unit-body/definition.cjs';
import { seedProjectileDimensions } from './features/projectiles/seed/definition.js';
import { MutationNotifications } from './mutation-notifications.js';
import { UnitCollection } from './unit-collection.js';
import { FarmingRoster } from './farm-roster.js';
import { FACILITY_IDS, FACILITY_MAX_LEVEL, FarmPlot, INITIAL_FARM_PLOT_ID, RESERVE_PLOT_ID } from './farm-plot.js';
import { advanceExploration, createWorldMap } from './world-map.js';
import { createSimulationScenes } from './simulation-scenes.js';
import { createProjectileBehaviors } from './projectile-behaviors.js';
import { createFarmBossEventPhases } from './features/scenes/farm/boss-event-phases.js';
import { createFarmModeBehaviors } from './farm-mode-behaviors.js';
import { createBossPatternBehaviors } from './boss-pattern-behaviors.js';
import { bossMouthWorldPoint } from './boss-vector-sockets.js';
import { WheatCommandModel } from './features/abilities/wheat-command/model.js';
import { BarleyArmorShredModel } from './features/abilities/barley-shred/model.js';
import { CornAttachmentModel } from './features/abilities/corn-attachment/model.js';
const { SeededPRNG: SEEDED_PRNG } = globalThis.BloomGamekitDeterministic;
const { createBudgetedScheduler: CREATE_BUDGETED_SCHEDULER } = globalThis.BloomGamekitWorkScheduler;
const EMPTY_FOOD_SEARCH_BUCKET = Object.freeze([]);
import {
    baseUnitStatsFor,
    resolveUnitStats,
    applyDamageToTargets,
    applyHealing,
    resolveStatusDuration,
    resolveKnockback,
    scaleMoveSpeed,
    scaleAttackRecovery,
    scaleAttackArea,
} from './unit-stats.js';
import { UNIT_ABILITY_PROFILES as ATTACK_TYPES, abilityProfile, unitCapabilityComposition } from './unit-abilities.js';
import {
    BOSS_REWARD_SETTINGS,
    bossAcquisitionChance,
    bossStageStats,
    settleBossKill,
    grantPendingBossAcquisitions,
    advanceBossRewardCalculations,
    createBossRewardStreams,
} from './boss-rewards.js';
import { createFarmBossProgress } from './farm-boss-stages.js';
import { SPECIES_COUNT } from './species-catalog.js';
import { createPlayerProgressionState } from './player-progression.js';
import { purchaseAbilityNode, purchaseFarmUpgrade, resetPlayerProgression } from './ability-progression.js';
import { createAbilityRuntimeSnapshot, isValidAbilityRuntimeSnapshot } from './ability-state.js';
import {
    FARM_UPGRADE_NODES,
    farmUpgradeRate,
    getBreedCooldownSeconds,
    getMergeCooldownSeconds,
} from './farm-upgrades.js';
import { composeUnitAttackCycles } from './unit-attack-capabilities.js';
import { MAX_UNIT_TIER, MAX_GRADE_MATERIAL_COUNT, mergeMaterialCostForTier } from './unit-grades.js';
import { BOSS_PATTERN_IDS, BOSS_PATTERN_CONFIG, createBossPatternRuntime, chooseBossPattern } from './boss-patterns.js';
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
const BREED_RESERVATION_OWNER = (aId, bId) => `breed:${Math.min(aId, bId)}:${Math.max(aId, bId)}`;
const MERGE_RESERVATION_OWNER = (ids) => `merge:${[...ids].sort((a, b) => a - b).join(':')}`;
const FARM_MAX_UNITS = 200,
    RAID_PLAYER_UNITS = 100,
    RAID_MAX_PLAYERS = 4,
    RAID_PLAYER_ID_STRIDE = 1000000,
    MAX_PEANUT_SPLIT_CHILDREN = 2,
    MAX_BOSS_SUMMONS = 10;
const RAID_MAX_UNITS = RAID_PLAYER_UNITS * RAID_MAX_PLAYERS;
const WORLD_ARENA = Object.freeze({
    radiusX: 23,
    radiusY: 17,
});
// Runtime configuration is separate from saved world fields and their import
// migration. Only already-established capacity/growth relations are derived.
const CONFIG = Object.freeze({
    factions: FACTION_CONFIG,
    farm: Object.freeze({
        arena: WORLD_ARENA,
        capacity: Object.freeze({
            base: 50,
            max: FARM_MAX_UNITS,
            battleUnits: FARM_MAX_UNITS * (1 + MAX_PEANUT_SPLIT_CHILDREN) + MAX_BOSS_SUMMONS + 2000,
        }),
        maxUnitId: 999999999,
        starterSeconds: 60,
        work: Object.freeze({
            secondsPerFood: 8,
            warehouseLimit: 200,
            tierBonus: 0.5,
            minBreeders: 2,
            refreshTicks: 20,
            defaultBasisPoints: 4000,
            starterFood: 0,
            maxFood: 50,
            maxAttackers: 3,
            defaultResourceBasisPoints: 3000,
            defaultBuildBasisPoints: 1500,
            defaultExploreBasisPoints: 1000,
            facilityMaxLevel: FACILITY_MAX_LEVEL,
            levelCostStep: 0.75,
            levelHitsStep: 0.6,
            projects: Object.freeze({
                expand: Object.freeze({ name: '농장 확장', hits: 150, cost: Object.freeze({ wood: 20, stone: 10 }) }),
                plot: Object.freeze({ name: '새 농장', hits: 300, cost: Object.freeze({ wood: 40, stone: 40 }) }),
            }),
            levelEffectStep: 0.25,
            facilities: Object.freeze({
                windmill: Object.freeze({
                    name: '풍차',
                    hits: 120,
                    cost: Object.freeze({ wood: 12, stone: 6 }),
                    effect: '레벨마다 먹이 일꾼이 25% 빨라져요',
                }),
                granary: Object.freeze({
                    name: '곡식 광',
                    hits: 100,
                    cost: Object.freeze({ wood: 16, stone: 0 }),
                    effect: '레벨마다 더미 먹이 +4, 홀수 레벨마다 더미 +1',
                }),
                rack: Object.freeze({
                    name: '연장 걸이',
                    hits: 100,
                    cost: Object.freeze({ wood: 8, stone: 8 }),
                    effect: '레벨마다 자원 일꾼이 25% 빨라져요',
                }),
            }),
            pileKinds: Object.freeze({
                grain: Object.freeze({ count: 2, amount: 12 }),
                wood: Object.freeze({ count: 1, amount: 8 }),
                stone: Object.freeze({ count: 1, amount: 8 }),
            }),
            facilitySpacing: 7,
            facilityRowX: 2,
            facilityRowY: 7.6,
            pileGap: 6,
            pileRadiusX: 8,
            pileRadiusY: 6,
            pileRespawnSeconds: 3,
            starterUnits: 6,
        }),
        breeding: Object.freeze({
            cooldownSeconds: BREED_COOLDOWN_SECONDS,
            growthSeconds: BREED_COOLDOWN_SECONDS / 2,
            matureMeals: 3,
        }),
        offline: Object.freeze({
            capSeconds: 8 * 3600,
            minSeconds: 60,
            // Idle output is a share of what the workers would make while you watch.
            efficiency: 0.5,
        }),
        merge: Object.freeze({
            animationSeconds: 0.85,
            celebrationSeconds: 1,
            centerHeight: 1.8,
            resultFallVelocity: 0.2,
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
            battleUnits: RAID_MAX_UNITS * (1 + MAX_PEANUT_SPLIT_CHILDREN) + MAX_BOSS_SUMMONS + 2000,
            projectiles: RAID_MAX_UNITS * (1 + MAX_PEANUT_SPLIT_CHILDREN) * 4 + 40,
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
    unit: Object.freeze({
        speciesCount: SPECIES_COUNT,
        maxTier: MAX_UNIT_TIER,
        maxRadius: maximumUnitRadius(MAX_UNIT_TIER),
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
        separationIterations: 4,
        separationRelaxation: 0.8,
        // Raid battles only: allies may overlap by this fraction of their summed radii, solved on a
        // neighbor list built once per tick. Opposing sides still separate at full radius.
        raidSeparationIterations: 3,
        raidAllyOverlap: 0.2,
        raidNeighborMargin: 0.4,
        softSeparationRate: -Math.log(1 - 0.035) * 120,
    }),
});
if (Object.keys(CONFIG.farm.work.facilities).join() !== FACILITY_IDS.join()) {
    throw new Error('The farm facility catalog and the plot facility ids must list the same facilities.');
}
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
    BOSS_BEHAVIORS.forId(ACTION.id).writeArea(boss, ACTION, scene, PAD, area);
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
    sample(path, q, output = {}) {
        q = CLAMP(q, 0, 1);
        output.x = path.from.x + (path.to.x - path.from.x) * q;
        output.y = path.from.y + (path.to.y - path.from.y) * q;
        output.z = path.from.z * (1 - q) + 4 * path.height * q * (1 - q);
        return output;
    },
};
const FARM_BOSS_PHASES = createFarmBossEventPhases(CONFIG);
const PROJECTILE_BEHAVIORS = createProjectileBehaviors({ Ballistics: BALLISTICS, ArenaGeometry: ARENA_GEOMETRY });
const FARM_MODES = createFarmModeBehaviors(CONFIG);
const BOSS_BEHAVIORS = createBossPatternBehaviors({
    CONFIG,
    ArenaGeometry: ARENA_GEOMETRY,
    Ballistics: BALLISTICS,
    clamp: CLAMP,
});
// The common cycle owns phase/elapsed/action identity only. Capability mixins
// own their action fields and behavior while preserving the saved wire shape.
class AttackCycle {
    constructor(owner) {
        this.owner = owner;
        this.motionPoint = { x: 0, y: 0, z: 0 };
        this.phase = 'idle';
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
        const U = this.owner,
            BASE_ATTACK_SPEED = baseUnitStatsFor(U.tier, U.species).attackSpeed;
        return scaleAttackRecovery(this.spec.timing.recovery, U, {
            attackSpeed: BASE_ATTACK_SPEED * multiplier,
        });
    }
    attackRecoverySeconds(sim) {
        return this.attackRecoverySecondsFor(this.attackSpeedMultiplier(sim));
    }
    syncAttackSpeedMultiplier(tick) {
        const NEXT_MULTIPLIER = WheatCommandModel.attackSpeedMultiplier(this.owner, tick),
            PREVIOUS_MULTIPLIER = this._attackSpeedMultiplier;
        if (this.phase === 'recover' && NEXT_MULTIPLIER !== PREVIOUS_MULTIPLIER) {
            const PREVIOUS_RECOVERY = this.attackRecoverySecondsFor(PREVIOUS_MULTIPLIER),
                NEXT_RECOVERY = this.attackRecoverySecondsFor(NEXT_MULTIPLIER);
            if (PREVIOUS_RECOVERY > 0) {
                this.elapsed = Math.min(NEXT_RECOVERY, (this.elapsed * NEXT_RECOVERY) / PREVIOUS_RECOVERY);
            }
        }
        this._attackSpeedMultiplier = NEXT_MULTIPLIER;
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
            targetGeneration:
                target.generation ??
                (target.id === 'boss' ? sim.boss.generation : (sim._unitForId(target.id)?.generation ?? 0)),
            hit: false,
            path: null,
        };
        this.prepareAttack?.(sim);
        U.angle = Math.atan2(target.y - U.y, target.x - U.x);
        U.vx = U.vy = 0;
        sim.combatEvent('prepare', U, this.action, this);
        return true;
    }
    interrupt() {
        if (this.phase !== 'idle') {
            this.phase = 'recover';
            this.elapsed = 0;
            this.action = null;
        }
    }
    recover(sim, recoil = false) {
        this.syncAttackSpeedMultiplier(sim.simulationTick);
        this.phase = 'recover';
        this.elapsed = 0;
        const U = this.owner;
        if (recoil) {
            U.vx = -Math.cos(U.angle) * 2.2;
            U.vy = -Math.sin(U.angle) * 2.2;
        }
        sim.combatEvent('recover', U, this.action, this);
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
        if (this.phase === 'recover') {
            this.syncAttackSpeedMultiplier(sim.simulationTick);
        }
        if (this.phase === 'idle') {
            return false;
        }
        if (this.phase !== 'active') {
            this.elapsed += dt;
        }
        if (this.phase === 'windup') {
            U.vx *= Math.exp(-dt * 18);
            U.vy *= Math.exp(-dt * 18);
            if (this.elapsed >= this.spec.timing.windup) {
                this.action.motionDelay = Math.max(0, dt - (this.elapsed - this.spec.timing.windup));
                this.elapsed = 0;
                this.phase = 'active';
                this.createAttackPath();
                sim.combatEvent('launch', U, this.action, this);
                this.onLaunch?.(sim, this.action);
                this.launchAttack?.(sim);
            }
        } else if (this.phase === 'recover') {
            this.updateRecovery?.(sim);
            if (this.elapsed >= this.attackRecoverySeconds(sim)) {
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
export const CREATE_UNIT_SPECIAL_ABILITY = (owner) => CREATE_UNIT_ATTACK_CYCLE.createSpecial(owner);
const SIMULATION_SCENES = createSimulationScenes({
    config: CONFIG,
    stats: STATS,
    createUnitAttackCycle: CREATE_UNIT_ATTACK_CYCLE,
    farmModes: FARM_MODES,
    bossEventPhases: FARM_BOSS_PHASES,
});
const ATTACKING_BODY = (baseLocal) =>
    class extends baseLocal {
        constructor(...args) {
            super(...args);
            this.ability = null;
        } // Assigned after the unit profile is known.
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
            const ATTACK =
                this.specialAbility && this.specialAbility.phase !== 'idle' ? this.specialAbility : this.ability;
            if (!ATTACK.integrate(dt)) {
                super.integrate(dt);
            }
        }
    };
const UNIT = class Unit extends ATTACKING_BODY(KNOCKABLE(BODY)) {
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
                y,
            },
            hp: STATS(tier, species).maxHp,
            down: 0,
            seed: id * 2.39996,
            ownerId: '',
            farmId: 0,
            plotId: INITIAL_FARM_PLOT_ID,
            dropLanded: true,
            isBattleOnlySummon: false,
            battleSummonKind: '',
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
            lifetime: '',
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
            cloneBornAt: -10,
        });
        this.ability = CREATE_UNIT_ATTACK_CYCLE(this);
        this.specialAbility = CREATE_UNIT_ATTACK_CYCLE.createSpecial(this);
        Object.defineProperties(this, {
            onDied: { value: new Signal() },
            onRevived: { value: new Signal() },
            onHealthChanged: { value: new Signal() },
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
            deathSplitHandled: false,
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
        return unitBodyRadius(this) * this.giantScale;
    }
    get mature() {
        return this.growthElapsed >= this.growthDuration - 1e-9;
    }
    get fed() {
        return this.meals >= 1;
    }
    get size() {
        return unitVisualSize(this) * this.giantScale;
    }
    get bodyScale() {
        return unitVectorScale(this) * this.giantScale;
    }
    get height() {
        return unitBodyHeight(this) * this.giantScale;
    }
    get bodyHeight() {
        return unitTorsoHeight(this) * this.giantScale;
    }
};
function inverseBodyMass(body) {
    if (body.fixed === true) {
        return 0;
    }
    const MASS = Number.isFinite(body.mass) ? body.mass : 1;
    return MASS > 0 ? 1 / MASS : 0;
}
function contact(a, b) {
    const DX = b.x - a.x,
        DY = b.y - a.y,
        D_LOCAL = Math.hypot(DX, DY),
        R_LOCAL = a.radius + b.radius;
    if (a.z > b.z + b.height || b.z > a.z + a.height) {
        return false;
    }
    if (D_LOCAL >= R_LOCAL) {
        return false;
    }
    const NX = D_LOCAL > 1e-6 ? DX / D_LOCAL : 1,
        NY = D_LOCAL > 1e-6 ? DY / D_LOCAL : 0,
        INVERSE_MASS_A = inverseBodyMass(a),
        INVERSE_MASS_B = inverseBodyMass(b),
        INVERSE_MASS_SUM = INVERSE_MASS_A + INVERSE_MASS_B;
    const CLOSING = (a.vx - b.vx) * NX + (a.vy - b.vy) * NY;
    if (CLOSING > 0 && INVERSE_MASS_SUM > 0) {
        // Preserve the previous 0.57 velocity change per body at equal mass
        // while weighting the resulting impulse by inverse mass.
        const IMPULSE = (CLOSING * 1.14) / INVERSE_MASS_SUM;
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
            const RECEIVER =
                INVERSE_MASS_A === 0
                    ? b
                    : INVERSE_MASS_B === 0
                      ? a
                      : Math.hypot(a.vx, a.vy) > Math.hypot(b.vx, b.vy)
                        ? a
                        : b;
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
        this.mergeTasks = [];
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
        this._groundedFoodsScratch = [];
        this._groundedFoodCount = 0;
        this._groundedFoodRevision = 0;
        this._foodSearchSnapshot = { revision: 0, foods: this._groundedFoods, cells: new Map() };
        this._inactiveFoodClaims = new Map();
        this._foodSearchStates = new WeakMap();
        this._foodSearchJobSequence = 0;
        this._foodSearchScheduler = null;
        this._foodSearchWork = { candidateChecks: 0, cellVisits: 0 };
        this._lastFoodSearchSchedulerMetrics = null;
        this._contactPending = [];
        this._contactQuery = [];
        this._contactCorrectionX = new Float64Array(0);
        this._contactCorrectionY = new Float64Array(0);
        this._contactCorrectionCount = new Uint32Array(0);
        this._raidPairA = new Int32Array(0);
        this._raidPairB = new Int32Array(0);
        this._raidPairOpposing = new Uint8Array(0);
        this._raidPairCount = 0;
        this._raidMoved = new Uint8Array(0);
        this._raidRadius = new Float64Array(0);
        this._raidHeight = new Float64Array(0);
        this._raidInverseMass = new Float64Array(0);
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
            '_groundedFoodsScratch',
            '_groundedFoodCount',
            '_groundedFoodRevision',
            '_foodSearchSnapshot',
            '_foodSearchStates',
            '_foodSearchJobSequence',
            '_foodSearchScheduler',
            '_foodSearchWork',
            '_lastFoodSearchSchedulerMetrics',
            '_contactPending',
            '_contactQuery',
            '_contactCorrectionX',
            '_contactCorrectionY',
            '_contactCorrectionCount',
            '_raidPairA',
            '_raidPairB',
            '_raidPairOpposing',
            '_raidPairCount',
            '_raidMoved',
            '_raidRadius',
            '_raidHeight',
            '_raidInverseMass',
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
                get: () =>
                    this.scene === 'farm'
                        ? this.unitCollection.unitsInPlot(this.activePlotId)
                        : this.unitCollection.items,
                // Retain the public assignment API, with owner validation and
                // cleanup rather than replacing a borrowed array directly.
                set: (units) => {
                    this.resetUnits(units);
                },
            },
            progressRevision: {
                value: 0,
                writable: true,
            },
            _progressTimerCheckpoint: {
                value: 0,
                writable: true,
            },
            mergeTaskRevision: {
                value: 0,
                writable: true,
            },
            mergeAvailabilityRevision: {
                value: 0,
                writable: true,
            },
        });
        this.roster = new FarmingRoster(this.unitCollection);
        this.reset();
        Object.defineProperty(this, 'formationSkills', { value: new FormationSkills(this) });
        Object.defineProperty(this, 'raidDeploymentCards', { value: new RaidDeploymentCards(this) });
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
        return this.unitCollection.reservationOwner(unit)?.startsWith('merge:') || false;
    }
    _pendingMergeCost(species, excludedTask = null) {
        let cost = 0;
        for (const TASK of this.mergeTasks) {
            if (TASK !== excludedTask && TASK.phase === 'approach' && TASK.sourceSpecies === species) {
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
            if (UNIT_LOCAL.hp > 0 && typeof UNIT_LOCAL.faction === 'string') {
                this._liveFactionCounts.set(
                    UNIT_LOCAL.faction,
                    (this._liveFactionCounts.get(UNIT_LOCAL.faction) || 0) + 1,
                );
            }
            this._unitAliveState.set(UNIT_LOCAL, UNIT_LOCAL.hp > 0);
        }
        this._syncOwnedSpeciesCounts();
        for (let index = 0; index < stepUnits.length; index++) {
            this._unitStepOrder.set(stepUnits[index], index);
        }
        this._unitSpatialDirty = false;
        this.profiler?.end('spatial', SPATIAL_START);
    }
    _refreshFoodSearchSnapshot() {
        const CELLS = new Map();
        for (const KEY of this.foodSpatial.usedCells) {
            const BUCKET = this.foodSpatial.cells[KEY];
            if (BUCKET?.length) {
                CELLS.set(KEY, BUCKET.slice());
            }
        }
        this._foodSearchSnapshot = {
            revision: this._groundedFoodRevision,
            foods: this._groundedFoods,
            cells: CELLS,
        };
    }
    _rebuildFoodSpatialIndex() {
        const SPATIAL_START = this.profiler?.start(),
            PREVIOUS_FOODS = this._groundedFoods,
            NEXT_FOODS = this._groundedFoodsScratch;
        this.foodSpatial.clear();
        this._foodOrder.clear();
        NEXT_FOODS.length = 0;
        let grounded = 0;
        for (let index = 0; index < this.food.length; index++) {
            const FOOD = this.food[index];
            this._foodOrder.set(FOOD, index);
            if (FOOD.phase === 'grounded') {
                this.foodSpatial.insert(FOOD);
                NEXT_FOODS.push(FOOD);
                grounded++;
            }
        }
        const CHANGED =
            NEXT_FOODS.length !== PREVIOUS_FOODS.length ||
            NEXT_FOODS.some((food, index) => food !== PREVIOUS_FOODS[index]);
        this._groundedFoodCount = grounded;
        if (CHANGED) {
            this._groundedFoodRevision++;
            this._groundedFoods = NEXT_FOODS;
            // Search jobs retain the prior immutable snapshot until their result is discarded.
            this._groundedFoodsScratch = [];
        } else {
            NEXT_FOODS.length = 0;
        }
        if (this._foodSearchSnapshot.revision !== this._groundedFoodRevision) {
            this._refreshFoodSearchSnapshot();
        }
        this._foodSpatialDirty = false;
        this.profiler?.end('spatial', SPATIAL_START);
    }
    _trackFoodAdded(food) {
        if (!this._spatialStepActive) {
            this._foodSpatialDirty = true;
            if (food.phase === 'grounded') {
                this._groundedFoodRevision++;
            }
            return;
        }
        this._foodOrder.set(food, this.food.length - 1);
        if (food.phase === 'grounded') {
            this.foodSpatial.insert(food);
            this._groundedFoodCount = (this._groundedFoodCount || 0) + 1;
            this._groundedFoodRevision++;
        }
    }
    consumeGroundFood(food) {
        if (food?.phase !== 'grounded' || !this.foodSpatial.itemCells.has(food)) {
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
        if (unit.hp > 0 && typeof unit.faction === 'string') {
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
        if (unit.hp > 0 && typeof unit.faction === 'string') {
            this._adjustFactionCount(unit.faction, -1);
        }
        this._unitAliveState.set(unit, false);
        if (unit.species >= 0 && unit.species < CONFIG.unit.speciesCount) {
            this._removeGroupItem(this._speciesGroups[unit.species], unit);
            const TIER = Math.max(0, Math.min(CONFIG.unit.maxTier, unit.tier | 0));
            this._removeGroupItem(this._speciesTierGroups[unit.species * (CONFIG.unit.maxTier + 1) + TIER], unit);
            if (!unit.isBattleOnlySummon) {
                this._ownedSpeciesCounts[unit.species] =
                    this.unitCollection.residentCountsBySpecies.get(unit.species) || 0;
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
        W.resetUnits();
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
        return this.mutateUnits(this._reset);
    }
    _reset() {
        this._foodSearchScheduler?.dispose();
        this._foodSearchScheduler = CREATE_BUDGETED_SCHEDULER({ unitsPerTick: 24, quantumUnits: 1 });
        this._lastFoodSearchSchedulerMetrics = this._foodSearchScheduler.metrics;
        this._foodSearchStates = new WeakMap();
        this._foodSearchJobSequence = 0;
        this._foodSearchWork = { candidateChecks: 0, cellVisits: 0 };
        this._groundedFoods = [];
        this._groundedFoodsScratch = [];
        this._groundedFoodCount = 0;
        this._groundedFoodRevision = 0;
        this._foodSearchSnapshot = { revision: 0, foods: this._groundedFoods, cells: new Map() };
        this.formationSkills?.end();
        this.formationRuntime = createFormationRuntime();
        this.progressRevision = 0;
        this._progressTimerCheckpoint = 0;
        this.cancelMergeTasks();
        this.cancelBreedPlans();
        this._breedPlans = new Map();
        this._activeBreedReservations = new Map();
        this._breedPlotReservations = new Map();
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
            raid: 0,
        };
        this.nextRaidRunSequence = 0;
        this.activeRaidRunSequence = null;
        this.activeRaidSessionId = null;
        this.raidSettlementWatermark = 0;
        this.raidSettlementReceipts = [];
        this.playerProgression = createPlayerProgressionState();
        this.activePlotId = this.playerProgression.farmPlots.currentPlotId;
        this.farmPlots = new Map(
            this.playerProgression.farmPlots.plots.map((state) => [state.id, new FarmPlot(state)]),
        );
        this.food = this.activeFarmPlot.food;
        this.warehouseFood = CONFIG.farm.work.starterFood;
        this.workBasisPoints = CONFIG.farm.work.defaultBasisPoints;
        this.resourceBasisPoints = CONFIG.farm.work.defaultResourceBasisPoints;
        this.materials = { wood: 0, stone: 0 };
        this.buildBasisPoints = CONFIG.farm.work.defaultBuildBasisPoints;
        this.exploreBasisPoints = CONFIG.farm.work.defaultExploreBasisPoints;
        this.worldMap = createWorldMap(this.seed >>> 0, INITIAL_FARM_PLOT_ID);
        this.buildRush = false;
        this._workerKinds = new Map();
        this._workerIds = new Set();
        resetWork(this);
        this._workerRates = new Map();
        this._workerPlots = new Map();
        this._workRate = 0;
        this._workCount = 0;
        this._nextWorkerRefreshTick = 0;
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
        this.cornAttachments = CornAttachmentModel.createManager();
        this.attackSerial = 0;
        this.projectileSerial = 0;
        this.raidSummonSerial = 0;
        this.bossSummonSerial = 0;
        this.combatLog = [];
        this.farmBossProgress = createFarmBossProgress(this.seed);
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
            physicsSolverIterations: 0,
            landings: 0,
            basicHits: 0,
            sweepHits: 0,
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
        if (this.scene === 'farm') {
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
        return this.units
            .filter((u) => hasFaction(u, FACTION_CONFIG.PLAYER))
            .reduce(
                (sum, u) => {
                    const MAX_HP = u.isFormationClone ? 1 : STATS(u.tier, u.species).maxHp;
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
            0,
        );
    }
    get farmTargets() {
        return this.playerProgression.farmPlots.targetBasisPoints;
    }
    canFarmPopulationAdvance(speciesId, options) {
        const RESERVATIONS = [
            ...[...(this._breedPlans?.values() || [])].map((plan) => plan.reservation),
            ...[...(this._activeBreedReservations?.values() || [])].map((plan) => plan.reservation),
        ];
        return this.roster.canSpeciesAdvance(speciesId, this.farmTargets[speciesId] || 0, {
            includeReservations: RESERVATIONS,
            excludeReservation: options?.excludeReservation ?? null,
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
        let nearest = null,
            nearestDistance = Infinity;
        for (const FOOD of PLOT.food) {
            if (this._inactiveFoodClaims.has(FOOD) || FOOD.phase !== 'grounded') {
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
                scaleMoveSpeed(2.2 * farmUpgradeRate(this.playerProgression.farmUpgrades, 'growth'), unit),
            ),
            TICKS = Math.max(1, Math.ceil(nearestDistance / SPEED / Math.max(dt, 1e-9)));
        unit.inactiveForageAttempt = {
            plotId: PLOT.id,
            food: nearest,
            dueTick: this.simulationTick + TICKS,
        };
        this._inactiveFoodClaims.set(nearest, unit.id);
        return true;
    }
    farmPlotStatus(plotId) {
        const PLOT = this.farmPlots.get(plotId);
        let hungry = 0;
        if (PLOT) {
            for (const UNIT of this.unitCollection.unitsInPlot(plotId)) {
                if (UNIT.hp > 0 && UNIT.mature && !UNIT.fed && this.canFarmPopulationAdvance(UNIT.species)) {
                    hungry++;
                }
            }
        }
        return { food: PLOT?.food.length ?? 0, hungry };
    }
    advanceInactiveForage(unit, dt) {
        if (
            unit.hp <= 0 ||
            unit.fed ||
            unit.plotId === RESERVE_PLOT_ID ||
            unit.plotId === this.activePlotId ||
            !this.canFarmPopulationAdvance(unit.species)
        ) {
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
        const PLOT = this.farmPlots.get(attempt.plotId),
            FOOD_INDEX = PLOT?.food.indexOf(attempt.food) ?? -1;
        if (
            !PLOT ||
            unit.plotId !== PLOT.id ||
            FOOD_INDEX < 0 ||
            this._inactiveFoodClaims.get(attempt.food) !== unit.id ||
            !this.canFarmPopulationAdvance(unit.species)
        ) {
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
        const RESIDENTS = this.roster.residents(),
            MATCHING_PLOTS = new Set(RESIDENTS.filter((unit) => unit.species === species).map((unit) => unit.plotId)),
            OCCUPANCY = new Map(
                [...this.farmPlots.keys()].map((id) => [
                    id,
                    this.roster.placedPopulation(id) + (this._breedPlotReservations?.get(id) || 0),
                ]),
            ),
            PLOTS = [...this.farmPlots.values()];
        PLOTS.sort((a, b) => {
            const A_COUNT = OCCUPANCY.get(a.id),
                B_COUNT = OCCUPANCY.get(b.id),
                A_MATCH = MATCHING_PLOTS.has(a.id),
                B_MATCH = MATCHING_PLOTS.has(b.id);
            return (
                Number(B_MATCH) - Number(A_MATCH) ||
                Number(b.id === preferredPlotId) - Number(a.id === preferredPlotId) ||
                A_COUNT - B_COUNT ||
                a.id.localeCompare(b.id)
            );
        });
        return PLOTS.find((plot) => OCCUPANCY.get(plot.id) < plot.capacity) || null;
    }
    switchFarmPlot(plotId) {
        if (
            this.scene !== 'farm' ||
            this.running ||
            this.farmBossEvent?.phase !== 'idle' ||
            !this.farmPlots.has(plotId)
        ) {
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
        this._nextWorkerRefreshTick = 0;
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
    _addFarmPlot() {
        const STATE = this.playerProgression.farmPlots,
            ID = `plot-${STATE.nextPlotNumber}`,
            PLOT_STATE = { id: ID, capacityLevel: 0, facilities: [] };
        STATE.plots.push(PLOT_STATE);
        STATE.nextPlotNumber++;
        this.farmPlots.set(ID, new FarmPlot(PLOT_STATE));
        this.restoreReservePopulation();
        this.markProgressChanged();
        return ID;
    }
    restoreReservePopulation() {
        const RESERVE = this.roster.residents().filter((unit) => unit.plotId === RESERVE_PLOT_ID);
        if (!RESERVE.length) {
            return 0;
        }
        RESERVE.sort((a, b) => b.tier - a.tier || Number(b.mature) - Number(a.mature) || a.id - b.id);
        const OCCUPANCY = new Map(
                [...this.farmPlots.values()].map((plot) => [plot.id, this.roster.placedPopulation(plot.id)]),
            ),
            SPECIES_BY_PLOT = new Map(
                [...this.farmPlots.keys()].map((plotId) => [
                    plotId,
                    new Set(
                        this.roster
                            .residents()
                            .filter((unit) => unit.plotId === plotId)
                            .map((unit) => unit.species),
                    ),
                ]),
            ),
            ASSIGNMENTS = [];
        for (const UNIT_LOCAL of RESERVE) {
            const CANDIDATES = [...this.farmPlots.values()]
                .filter((plot) => (OCCUPANCY.get(plot.id) || 0) < plot.capacity)
                .sort(
                    (a, b) =>
                        Number(SPECIES_BY_PLOT.get(b.id).has(UNIT_LOCAL.species)) -
                            Number(SPECIES_BY_PLOT.get(a.id).has(UNIT_LOCAL.species)) ||
                        (OCCUPANCY.get(a.id) || 0) - (OCCUPANCY.get(b.id) || 0) ||
                        a.id.localeCompare(b.id),
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
        if (
            !Number.isSafeInteger(speciesId) ||
            speciesId < 0 ||
            speciesId >= CONFIG.unit.speciesCount ||
            !Number.isSafeInteger(basisPoints) ||
            basisPoints < 0 ||
            basisPoints > 10000
        ) {
            return false;
        }
        const CURRENT = new Map(this.farmTargets.map((value, index) => [index, value])),
            NEXT = FarmingRoster.normalizeTargetBasisPoints(
                CURRENT,
                Array.from({ length: CONFIG.unit.speciesCount }, (_, id) => id),
                speciesId,
                basisPoints,
            );
        if (!NEXT) {
            return false;
        }
        this.playerProgression.farmPlots.targetBasisPoints = Array.from(
            { length: CONFIG.unit.speciesCount },
            (_, id) => NEXT.get(id) || 0,
        );
        this.markProgressChanged();
        return true;
    }
    sortActiveFarm(order = 'mixed') {
        if (
            this.scene !== 'farm' ||
            this.running ||
            this.farmBossEvent?.phase !== 'idle' ||
            this._breedPlans.size > 0 ||
            !['species', 'tier-high', 'tier-low'].includes(order)
        ) {
            return false;
        }
        const UNITS = this.unitCollection.residentsInPlot(this.activePlotId);
        for (const UNIT_LOCAL of UNITS) {
            if (this.unitCollection.reservationOwner(UNIT_LOCAL)?.startsWith('merge:')) {
                return false;
            }
            if (UNIT_LOCAL.mateId) {
                this.releaseMate(UNIT_LOCAL);
            }
        }
        UNITS.sort((a, b) => {
            if (order === 'species') {
                return a.species - b.species || a.tier - b.tier || a.id - b.id;
            }
            if (order === 'tier-high') {
                return b.tier - a.tier || a.species - b.species || a.id - b.id;
            }
            if (order === 'tier-low') {
                return a.tier - b.tier || a.species - b.species || a.id - b.id;
            }
            return a.id - b.id;
        });
        if (
            !this.unitCollection.reorderWithinPlot(
                this.activePlotId,
                UNITS.map((unit) => unit.id),
            )
        ) {
            return false;
        }
        UNITS.forEach((unitLocal, index) => {
            const ANGLE = index * 2.399963229728653 + ((this.seed >>> 0) % 6283) / 1000,
                RADIUS = Math.sqrt((index + 0.5) / Math.max(1, UNITS.length)) * 0.7;
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
        const IN_COMBAT = this.running || this.farmBossEvent?.phase !== 'idle';
        const RESULT = purchaseAbilityNode(this.playerProgression, abilityId, nodeId, {
            location: this.scene,
            inCombat: IN_COMBAT,
            highestSpeciesTier: this.highestSpeciesTiers(),
        });
        if (RESULT.ok) {
            this.playerProgression = RESULT.state;
            this.bindFarmPlotProgressionStates();
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
            this.bindFarmPlotProgressionStates();
            this.markProgressChanged();
        }
        return RESULT;
    }
    resetProgression(scope) {
        const IN_COMBAT = this.running || this.farmBossEvent?.phase !== 'idle';
        const RESULT = resetPlayerProgression(this.playerProgression, scope, {
            location: this.scene,
            inCombat: IN_COMBAT,
        });
        if (RESULT.ok) {
            const RESET_FARMS = scope?.type === 'farm' || scope?.type === 'all' || scope === 'farm' || scope === 'all';
            if (RESET_FARMS) {
                const FIRST_FOOD = this.farmPlots.get(INITIAL_FARM_PLOT_ID)?.food || [],
                    RETURNED_FOOD = [...this.farmPlots.values()]
                        .filter((plot) => plot.id !== INITIAL_FARM_PLOT_ID)
                        .reduce((total, plot) => total + plot.food.length, 0);
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
                this.farmPlots = new Map([[FIRST_STATE.id, new FarmPlot(FIRST_STATE, FIRST_FOOD)]]);
                this.activePlotId = FIRST_STATE.id;
                this.playerProgression.farmPlots.currentPlotId = FIRST_STATE.id;
                this.food = FIRST_FOOD;
                const OLD_PLOT_ORDER = new Map(
                        [...this.unitCollection.items].map((unit) => [unit.id, unit.plotId || RESERVE_PLOT_ID]),
                    ),
                    RESIDENTS = this.roster
                        .residents()
                        .sort(
                            (a, b) =>
                                b.tier - a.tier ||
                                Number(b.mature) - Number(a.mature) ||
                                String(OLD_PLOT_ORDER.get(a.id)).localeCompare(String(OLD_PLOT_ORDER.get(b.id))) ||
                                a.id - b.id,
                        ),
                    FIRST_CAPACITY = this.farmPlots.get(FIRST_STATE.id).capacity,
                    ASSIGNMENTS = RESIDENTS.map((unit, index) => ({
                        unitId: unit.id,
                        plotId: index < FIRST_CAPACITY ? FIRST_STATE.id : RESERVE_PLOT_ID,
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
        return this.resetProgression({ type: 'abilities' });
    }
    spawnLobProjectile(unit, action, shot, projectileEffect = null) {
        if (this.projectiles.length >= CONFIG.raid.capacity.projectiles) {
            return null;
        }
        const ID = ++this.projectileSerial,
            ATTACK_CONTEXT = this.createAttackContext(unit, {
                attackMultiplier: shot.attackMultiplier ?? this.speciesAbilityDamageMultiplier(unit),
                attackKind: abilityProfile(unit.species).kind,
            });
        const PROJECTILE = {
            id: ID,
            owner: unit.id,
            ownerGeneration: unit.generation,
            targetId: action.targetId || 'boss',
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
                sourceStatOverrides: { ...ATTACK_CONTEXT.sourceStatOverrides },
            },
            ...(projectileEffect?.abilityId === 'corn-kernel-chain'
                ? {
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
                          buffed: ATTACK_CONTEXT.buffed,
                      },
                  }
                : {}),
            abilityEffect: projectileEffect ? structuredClone(projectileEffect) : null,
        };
        this.projectiles.push(PROJECTILE);
        return PROJECTILE;
    }
    speciesAbilityDamageMultiplier(unit) {
        return abilityProfile(unit.species).skillMultiplier;
    }
    spawnChestnutThorn(unit, action, config, shotIndex) {
        if (this.projectiles.length >= CONFIG.raid.capacity.projectiles) {
            return false;
        }
        const TARGET = action.thornTargetId === 'boss' ? this.boss : this._unitForId(action.thornTargetId);
        if (!TARGET || TARGET.hp <= 0) {
            return false;
        }
        if (TARGET.generation !== action.thornTargetGeneration) {
            return false;
        }
        const ATTACK_CONTEXT = this.createAttackContext(unit, {
                attackMultiplier: config.attackMultiplier,
                attackKind: 'chestnut-thorns',
            }),
            PATH = BALLISTICS.create(
                {
                    x: unit.x,
                    y: unit.y,
                    z: unit.z || 0,
                },
                action.target,
                'punch',
            );
        PATH.height = 0.7;
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
            path: PATH,
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
                sourceStatOverrides: { ...ATTACK_CONTEXT.sourceStatOverrides },
            },
            projectileKind: 'chestnut-spike',
            isFormationClone: unit.isFormationClone,
            fanIndex: shotIndex,
        });
        return true;
    }
    createFormationClone(original) {
        const ID = this.scene === 'raid' ? CONFIG.raid.ids.summonBase + ++this.raidSummonSerial : this.nextId++,
            CLONE = new UNIT(ID, original.species, original.tier, original.x + 0.3, original.y + 0.1);
        Object.assign(CLONE, {
            growthElapsed: original.growthElapsed,
            growthDuration: original.growthDuration,
            cloneBornAt: this.time,
            hp: 1,
            seed: original.seed,
            faction: 'player',
            ownerId: original.ownerId,
            farmId: original.farmId,
            isFormationClone: true,
            isBattleOnlySummon: true,
            battleSummonKind: 'formation-copy',
            battleSummonParentId: original.id,
            battleSummonParentGeneration: original.generation,
            countsTowardPermanentRoster: false,
            eligibleForRaidDeployment: false,
            breedingEligible: false,
            mergeEligible: false,
            canSplit: false,
            splitUsedThisBattle: true,
            usesPersistentSleep: false,
            lifetime: 'until-death-or-battle-end',
            growth: original.growth,
            meals: 1,
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
        const SPLIT_BEFORE = unit.splitUsedThisBattle,
            DIED = unit.die();
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
        this.onCombatResolved.emit({ allyDeaths: unit.faction === 'player' && !unit.isFormationClone ? 1 : 0 });
        this._syncUnitAliveCount(unit);
        if (!unit.isBattleOnlySummon) {
            this.markProgressChanged();
        }
        if (unit.isBattleOnlySummon) {
            if (unit.isFormationClone) {
                this.emit('formation-copy-death', unit.x, unit.y, unit.z, { duration: 0.6 });
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
            const DESC = DESCRIPTORS[index],
                ANGLE = ((index + 0.5) * Math.PI * 2) / DESCRIPTORS.length,
                ID = SIMULATION_SCENES[this.scene].summonId(this);
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
                down: 0,
                generation: ++this.entityGenerationSerial,
                growthElapsed: CHILD.growthDuration,
                growth: CONFIG.farm.breeding.matureMeals,
                meals: 1,
                dropLanded: true,
                deathSplitHandled: false,
            });
            CHILD.hp = resolveUnitStats(CHILD).maxHp;
            this.addUnit(CHILD, { markProgress: false });
        }
        const EFFECT_ID = ++this.eventSequence;
        this.effects.push({
            kind: 'peanut-split',
            eventId: EFFECT_ID,
            owner: unit.id,
            ownerGeneration: unit.generation,
            species: unit.species,
            x: unit.x,
            y: unit.y,
            z: 0,
            life: 0,
            duration: 0.7,
        });
        this.combat('peanut-split', {
            effectId: EFFECT_ID,
            unit: unit.id,
            ownerId: unit.ownerId,
            species: unit.species,
            count: DESCRIPTORS.length,
            x: unit.x,
            y: unit.y,
        });
        return true;
    }
    processUnitRevival(unit) {
        return this.mutateUnits(this._processUnitRevival, unit);
    }
    _processUnitRevival(unit) {
        this._syncUnitAliveCount(unit);
        this.combat('unit-recover', { unit: unit.id, x: unit.x, y: unit.y });
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
    raidRemaining(ownerId, speciesId = null) {
        const R_LOCAL = this.raidRoster(ownerId);
        return R_LOCAL
            ? R_LOCAL.troops.reduce(
                  (n, troop) => n + (!troop.deployed && (speciesId === null || troop.species === speciesId) ? 1 : 0),
                  0,
              )
            : 0;
    }
    registerRaidRoster(
        ownerId,
        entries,
        abilitySnapshot = createAbilityRuntimeSnapshot(createPlayerProgressionState()),
        settlement = null,
        deploymentCardSpecies = null,
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
        const CARD_SPECIES =
            deploymentCardSpecies === null
                ? [...new Set(TROOPS.map((troop) => troop.species))].slice(0, 4)
                : deploymentCardSpecies;
        if (
            !Array.isArray(CARD_SPECIES) ||
            CARD_SPECIES.length > 4 ||
            CARD_SPECIES.some((speciesId) => !isSpeciesId(speciesId)) ||
            new Set(CARD_SPECIES).size !== CARD_SPECIES.length
        ) {
            return false;
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
        this.formationSkills.includeBuild(ownerId, abilitySnapshot.formationSkills || createFormationSkillState());
        this.raidRosters.push({
            ownerId,
            troops: TROOPS,
            deploymentCardSpecies: [...CARD_SPECIES],
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
    deployNextRaidUnit(ownerId, sequence, speciesId) {
        return this.mutateUnits(this._deployNextRaidUnit, ownerId, sequence, speciesId);
    }
    _deployNextRaidUnit(ownerId, sequence, speciesId) {
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
            TROOP = ROSTER?.troops.find(
                (troop) => !troop.deployed && (speciesId === undefined || troop.species === speciesId),
            );
        if (
            !ROSTER ||
            sequence !== ROSTER.lastDeploySequence + 1 ||
            !TROOP ||
            (speciesId !== undefined && (!isSpeciesId(speciesId) || !ROSTER.deploymentCardSpecies.includes(speciesId)))
        ) {
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
            MARGIN =
                unitBodyRadius({ species: TROOP.species, tier: TROOP.tier, growthElapsed: 1, growthDuration: 1 }) +
                0.05,
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
        this.addUnit(U, { markProgress: false });
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
    spawn(species, tier, x, y, { birthReservationOwner = null } = {}) {
        const FARM_RESIDENT = this.scene === 'farm';
        let plot = null;
        if (FARM_RESIDENT) {
            const HAS_BIRTH_RESERVATION =
                birthReservationOwner &&
                (this._activeBreedReservations?.has(birthReservationOwner) ||
                    this._breedPlans?.has(birthReservationOwner));
            if (
                this.ownedPopulation + this.birthReservations - Number(!!HAS_BIRTH_RESERVATION) >=
                this.totalFarmCapacity
            ) {
                return null;
            }
            const BREED_RESERVATION = this._activeBreedReservations?.get(birthReservationOwner);
            plot = BREED_RESERVATION
                ? this.farmPlots.get(BREED_RESERVATION.plotId)
                : this.availableFarmPlotFor(species);
            if (!plot) {
                return null;
            }
        } else if (this.units.length >= SIMULATION_SCENES[this.scene].capacity(this)) {
            return null;
        }
        const U = new UNIT(this.nextId++, species, CLAMP(tier, 1, CONFIG.unit.maxTier), x, y);
        U.plotId = plot?.id || this.activePlotId || INITIAL_FARM_PLOT_ID;
        this.addUnit(U);
        return U;
    }
    addUnit(unit, options) {
        if (this.scene === 'farm' && this.unitCollection.isResident(unit) && !unit.plotId) {
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
            ...detail,
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
        return this.mutateUnits(this._tapFood, source);
    }
    // Food is no longer made by taps: workers fight grain piles instead (see farm-work.js).
    _tapFood() {
        return false;
    }
    scatterFoodAtRandomLocation() {
        if (this.scene !== 'farm' || this.warehouseFood <= 0 || this.food.length >= CONFIG.farm.work.maxFood) {
            return false;
        }
        const SCATTERED = this.scatterFood(
            (this.random() - 0.5) * CONFIG.farm.arena.radiusX * 1.5,
            (this.random() - 0.5) * CONFIG.farm.arena.radiusY * 1.35,
        );
        if (SCATTERED) {
            this.notice('manual-feed');
        }
        return SCATTERED;
    }
    scatterFood(x, y) {
        if (
            this.scene !== 'farm' ||
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            this.warehouseFood <= 0 ||
            this.food.length >= CONFIG.farm.work.maxFood
        ) {
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
    isWorker(unit) {
        return this._workerIds.has(unit.id);
    }
    get piles() {
        return this._piles;
    }
    // Piles, and the construction site among them, belong to the farm plot they stand in.
    get _piles() {
        return pilesOf(this, this.activePlotId);
    }
    // The facilities of the farm plot that is on screen.
    get facilities() {
        return this.activeFarmPlot?.state.facilities ?? [];
    }
    workSwingOf(id) {
        return this._swings.get(id) || null;
    }
    facilityLevel(id) {
        return this.activeFarmPlot?.facilityLevel(id) ?? 0;
    }
    facilityBuilt(id) {
        return this.facilityLevel(id) > 0;
    }
    // Base spec of a pile kind, with the granary's bonus applied.
    pileSpec(kind) {
        const BASE = CONFIG.farm.work.pileKinds[kind],
            LEVEL = kind === 'grain' ? this.facilityLevel('granary') : 0;
        return LEVEL > 0 ? { count: BASE.count + Math.ceil(LEVEL / 2), amount: BASE.amount + 4 * LEVEL } : BASE;
    }
    // The constructions going up in the farm plot on screen.
    get buildSites() {
        return sitesOf(this);
    }
    // Every construction in every farm plot.
    get allBuildSites() {
        const SITES = [];
        for (const PLOT_ID of this._pilesByPlot.keys()) {
            SITES.push(...sitesOf(this, PLOT_ID));
        }
        return SITES;
    }
    // The construction of a kind that is going up in a farm plot, if any.
    siteOf(kind, plotId = this.activePlotId) {
        return sitesOf(this, plotId).find((site) => site.facility === kind) || null;
    }
    // What the next construction of a kind is: facilities level up, a farm grows, or a new farm opens.
    projectInfo(kind) {
        const WORK = CONFIG.farm.work,
            FACILITY = WORK.facilities[kind],
            PROJECT = WORK.projects[kind];
        let level;
        if (FACILITY) {
            level = this.facilityLevel(kind) + 1;
            if (level > WORK.facilityMaxLevel) {
                return null;
            }
        } else if (kind === 'expand') {
            if (!this.activeFarmPlot?.canExpand()) {
                return null;
            }
            level = this.activeFarmPlot.capacityLevel + 1;
        } else if (kind === 'plot') {
            level = this.playerProgression.farmPlots.plots.length;
        } else {
            return null;
        }
        const SPEC = FACILITY || PROJECT,
            COST_FACTOR = 1 + WORK.levelCostStep * (level - 1),
            HITS_FACTOR = 1 + WORK.levelHitsStep * (level - 1);
        return {
            name: SPEC.name,
            level,
            cost: { wood: Math.ceil(SPEC.cost.wood * COST_FACTOR), stone: Math.ceil(SPEC.cost.stone * COST_FACTOR) },
            hits: Math.ceil(SPEC.hits * HITS_FACTOR),
        };
    }
    // Settles the time the player was away; returns a summary, or null when nothing applies.
    settleOffline(seconds) {
        return applyOffline(this, CONFIG, seconds);
    }
    restoreBuildSite(data) {
        restoreSite(this, data);
    }
    siteName(site) {
        const SPEC = CONFIG.farm.work.facilities[site.facility] || CONFIG.farm.work.projects[site.facility];
        return CONFIG.farm.work.facilities[site.facility] ? `${SPEC.name} Lv.${site.level}` : SPEC.name;
    }
    // Starts a construction. The materials are paid up front; the work itself is done by the units.
    startBuild(kind) {
        const INFO = this.projectInfo(kind);
        if (
            this.scene !== 'farm' ||
            !INFO ||
            this.siteOf(kind) ||
            this.running ||
            this.farmBossEvent?.phase !== 'idle' ||
            this.materials.wood < INFO.cost.wood ||
            this.materials.stone < INFO.cost.stone
        ) {
            return false;
        }
        this.materials.wood -= INFO.cost.wood;
        this.materials.stone -= INFO.cost.stone;
        startSite(this, CONFIG, kind, INFO.level, INFO.hits, this.activePlotId);
        this._nextWorkerRefreshTick = 0;
        this.refreshWorkers();
        this.markProgressChanged();
        return true;
    }
    completeFacility(site) {
        if (site.facility === 'expand') {
            this.farmPlots.get(site.plotId)?.expand();
            this.restoreReservePopulation();
        } else if (site.facility === 'plot') {
            this._addFarmPlot();
        } else {
            this.farmPlots.get(site.plotId)?.setFacilityLevel(site.facility, site.level);
        }
        if (this.allBuildSites.length === 0) {
            this.buildRush = false;
        }
        this._nextWorkerRefreshTick = 0;
        this.refreshWorkers();
        this.markProgressChanged();
    }
    // Everyone drops what they are doing and rushes the construction site.
    setBuildRush(on) {
        const WANT = !!on && this.allBuildSites.length > 0;
        if (WANT === this.buildRush) {
            return WANT === !!on;
        }
        this.buildRush = WANT;
        this._nextWorkerRefreshTick = 0;
        this.refreshWorkers();
        return true;
    }
    workKind(unit) {
        return this._workerKinds.get(unit.id) || 'food';
    }
    workOrder(unit) {
        return workOrder(this, unit);
    }
    canBreedNow(unit) {
        return unit.breedingEligible !== false && !this._workerIds.has(unit.id);
    }
    // workers share of the farm, and the share of those workers that gather materials instead of grain.
    setWorkBasisPoints(
        basisPoints,
        resourceBasisPoints = this.resourceBasisPoints,
        buildBasisPoints = this.buildBasisPoints,
        exploreBasisPoints = this.exploreBasisPoints,
    ) {
        const VALID = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 10000;
        if (
            !VALID(basisPoints) ||
            !VALID(resourceBasisPoints) ||
            !VALID(buildBasisPoints) ||
            !VALID(exploreBasisPoints) ||
            resourceBasisPoints + buildBasisPoints + exploreBasisPoints > 10000
        ) {
            return false;
        }
        if (
            basisPoints === this.workBasisPoints &&
            resourceBasisPoints === this.resourceBasisPoints &&
            buildBasisPoints === this.buildBasisPoints &&
            exploreBasisPoints === this.exploreBasisPoints
        ) {
            return true;
        }
        this.workBasisPoints = basisPoints;
        this.resourceBasisPoints = resourceBasisPoints;
        this.buildBasisPoints = buildBasisPoints;
        this.exploreBasisPoints = exploreBasisPoints;
        this._nextWorkerRefreshTick = 0;
        this.refreshWorkers();
        return true;
    }
    // Workers are chosen per farm and per species so every species keeps a breeding pair.
    // A worker does not eat or breed. Its output scales with its tier and the food upgrade.
    refreshWorkers() {
        const WORK = CONFIG.farm.work,
            RATIO = this.workBasisPoints / 10000,
            NEXT = new Set(),
            RATES = new Map(),
            UPGRADE_RATE = farmUpgradeRate(this.playerProgression?.farmUpgrades, 'food');
        const PLOT_WORKERS = new Map();
        if (this.scene === 'farm') {
            for (const PLOT_ID of this.farmPlots.keys()) {
                const BY_SPECIES = new Map(),
                    RUSHING = this.buildRush && plotHasSite(this, PLOT_ID);
                PLOT_WORKERS.set(PLOT_ID, []);
                for (const UNIT_LOCAL of this.unitCollection.residentsInPlot(PLOT_ID)) {
                    if (
                        !UNIT_LOCAL.mature ||
                        UNIT_LOCAL.hp <= 0 ||
                        UNIT_LOCAL.down > 0 ||
                        UNIT_LOCAL.isBattleOnlySummon ||
                        UNIT_LOCAL.isFormationClone ||
                        (!this._workerIds.has(UNIT_LOCAL.id) && this.unitCollection.reservationOwner(UNIT_LOCAL))
                    ) {
                        continue;
                    }
                    if (!BY_SPECIES.has(UNIT_LOCAL.species)) {
                        BY_SPECIES.set(UNIT_LOCAL.species, []);
                    }
                    BY_SPECIES.get(UNIT_LOCAL.species).push(UNIT_LOCAL);
                }
                for (const LIST of BY_SPECIES.values()) {
                    LIST.sort((a, b) => a.id - b.id);
                    const COUNT = RUSHING
                        ? LIST.length
                        : Math.min(Math.floor(RATIO * LIST.length + 1e-9), Math.max(0, LIST.length - WORK.minBreeders));
                    for (let index = 0; index < COUNT; index++) {
                        const WORKER = LIST[index];
                        NEXT.add(WORKER.id);
                        PLOT_WORKERS.get(PLOT_ID).push(WORKER.id);
                        const UNIT_RATE = (1 + WORK.tierBonus * (WORKER.tier - 1)) / WORK.secondsPerFood;
                        RATES.set(WORKER.id, UNIT_RATE * UPGRADE_RATE);
                    }
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
        // Every farm plot picks its own roles: lowest ids work the grain piles, then the material gatherers,
        // then the builders. Stable while the roster is. A plot's facilities speed up its own workers.
        this._workerKinds = new Map();
        this._workerPlots = new Map();
        let total = 0;
        for (const [PLOT_ID, IDS] of PLOT_WORKERS) {
            const SORTED_WORKERS = IDS.sort((a, b) => a - b),
                PLOT_TOTAL = SORTED_WORKERS.length,
                RUSHING = this.buildRush && plotHasSite(this, PLOT_ID),
                BUILDERS = RUSHING
                    ? PLOT_TOTAL
                    : Math.min(
                          PLOT_TOTAL,
                          Math.max(
                              plotHasSite(this, PLOT_ID) ? 1 : 0,
                              Math.round((PLOT_TOTAL * this.buildBasisPoints) / 10000),
                          ),
                      ),
                EXPLORERS = RUSHING
                    ? 0
                    : Math.min(PLOT_TOTAL - BUILDERS, Math.round((PLOT_TOTAL * this.exploreBasisPoints) / 10000)),
                GATHERERS = RUSHING
                    ? 0
                    : Math.min(
                          PLOT_TOTAL - BUILDERS - EXPLORERS,
                          Math.round((PLOT_TOTAL * this.resourceBasisPoints) / 10000),
                      ),
                PLOT = this.farmPlots.get(PLOT_ID),
                MULTIPLIER = {
                    food: 1 + WORK.levelEffectStep * PLOT.facilityLevel('windmill'),
                    resource: 1 + WORK.levelEffectStep * PLOT.facilityLevel('rack'),
                };
            SORTED_WORKERS.forEach((id, index) => {
                const KIND =
                    index >= PLOT_TOTAL - EXPLORERS
                        ? 'explore'
                        : index >= PLOT_TOTAL - EXPLORERS - BUILDERS
                          ? 'build'
                          : index >= PLOT_TOTAL - EXPLORERS - BUILDERS - GATHERERS
                            ? 'resource'
                            : 'food';
                this._workerKinds.set(id, KIND);
                this._workerPlots.set(id, PLOT_ID);
                const BOOSTED = this._workerRates.get(id) * (MULTIPLIER[KIND] || 1);
                this._workerRates.set(id, BOOSTED);
                total += BOOSTED;
            });
        }
        this._workCount = NEXT.size;
        this._workRate = total;
        assignWorkers(this, CONFIG);
    }
    get warehouseFull() {
        return this.food.length >= CONFIG.farm.work.maxFood;
    }
    get workerKindCounts() {
        let resource = 0,
            build = 0,
            explore = 0;
        for (const KIND of this._workerKinds.values()) {
            resource += KIND === 'resource' ? 1 : 0;
            build += KIND === 'build' ? 1 : 0;
            explore += KIND === 'explore' ? 1 : 0;
        }
        return { food: this._workerKinds.size - resource - build - explore, resource, build, explore };
    }
    get workerCount() {
        return this._workCount;
    }
    // Exploration points per second from the explorers of every farm; the whole map is worked on at once.
    get exploreRate() {
        let rate = 0;
        for (const [ID, KIND] of this._workerKinds) {
            if (KIND === 'explore') {
                rate += this._workerRates.get(ID) || 0;
            }
        }
        return rate;
    }
    // Food per minute produced by workers right now.
    get workFoodPerMinute() {
        return this._attackRate('food') * 60;
    }
    get workResourcePerMinute() {
        return this._attackRate('resource') * 60;
    }
    _attackRate(kind) {
        let rate = 0;
        for (const [ID, ASSIGN] of this._workAssign) {
            const WORKER_KIND = this._workerKinds.get(ID);
            if (ASSIGN.attacking && (WORKER_KIND === kind || (kind === 'resource' && WORKER_KIND === 'build'))) {
                rate += this._workerRates.get(ID) || 0;
            }
        }
        return rate;
    }
    advanceAutoTaps(elapsed) {
        // Real elapsed time, independent of demo speed. Do not replay hidden/stalled frames.
        if (!Number.isFinite(elapsed) || elapsed <= 0) {
            return;
        }
        if (this.simulationTick >= this._nextWorkerRefreshTick) {
            this._nextWorkerRefreshTick = this.simulationTick + CONFIG.farm.work.refreshTicks;
            this.refreshWorkers();
        }
        if (this.scene === 'farm') {
            stepWork(this, CONFIG, Math.min(elapsed, 0.1));
            if (advanceExploration(this.worldMap, this.exploreRate * Math.min(elapsed, 0.1)).length > 0) {
                this.markProgressChanged();
            }
        }
    }
    spawnFood(x, y, count = 1, { allowBossEvent = true, from = null } = {}) {
        let spawned = 0;
        for (let i = 0; i < count && this.food.length < CONFIG.farm.work.maxFood; i++) {
            const RADIUS_X = CONFIG.farm.arena.radiusX - 1.5,
                RADIUS_Y = CONFIG.farm.arena.radiusY - 1.1;
            let tx = CLAMP(x, -RADIUS_X, RADIUS_X);
            let ty = CLAMP(y, -RADIUS_Y, RADIUS_Y);
            const BOUNDARY = Math.hypot(tx / RADIUS_X, ty / RADIUS_Y);
            if (BOUNDARY > 1) {
                tx /= BOUNDARY;
                ty /= BOUNDARY;
            }
            if (allowBossEvent && this.tryStartFarmBossEvent(tx, ty)) {
                continue;
            }
            const ANGLE = this.random() * Math.PI * 2,
                SX = from ? from.x : Math.cos(ANGLE) * (CONFIG.farm.arena.radiusX + 0.7),
                SY = from ? from.y : Math.sin(ANGLE) * (CONFIG.farm.arena.radiusY + 0.2);
            const DURATION = 0.85 + this.random() * 0.25,
                Z = from ? from.z : 0.3;
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
            spawned++;
        }
        return spawned;
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
                UNIT_LOCAL.chestnutNextThornTick = 0;
            }
        }
        const SPECIES = this.randomBossSpecies(),
            EVENT_STAGE = this.playerProgression.farmBossEventStage;
        this.boss = this.createBoss(SPECIES);
        this.configureBossStage(EVENT_STAGE, SPECIES);
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
            generation: ++this.entityGenerationSerial,
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
                z: 0,
            },
        };
    }
    configureBossStage(stage, species = this.boss.species) {
        const STATS = bossStageStats(stage);
        this.boss.generation = ++this.entityGenerationSerial;
        this.boss.species = CLAMP(species, 0, CONFIG.unit.speciesCount - 1);
        this.boss.stage = STATS.stage;
        this.boss.hp = this.boss.maxHp = STATS.hp;
        this.boss.attackPower = STATS.attackPower;
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
        this._foodSearchStates = new WeakMap();
        for (const UNIT_LOCAL of this.units) {
            this.releaseMate(UNIT_LOCAL);
        }
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
        const SCENE = SIMULATION_SCENES[scene];
        const ID_MAP = new Map(this.units.map((u, index) => [u.id, SCENE.unitId(u, index)]));
        for (let i = 0; i < this.units.length; i++) {
            const U = this.units[i],
                OLD_MATE_ID = U.mateId;
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
                hp: STATS(U.tier, U.species).maxHp,
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
            const OWNER = this.breedingReservationOwner(a, b),
                BIRTH_RESERVATION = this._activeBreedReservations?.get(OWNER) || null,
                RESERVATIONS_AVAILABLE =
                    this.unitCollection.reservationOwner(a) === null ||
                    this.unitCollection.reservationOwner(a) === OWNER;
            return (
                this.scene === 'farm' &&
                a !== b &&
                !a.isBattleOnlySummon &&
                !b.isBattleOnlySummon &&
                this.canBreedNow(a) &&
                this.canBreedNow(b) &&
                a.hp > 0 &&
                b.hp > 0 &&
                a.species === b.species &&
                a.mature &&
                b.mature &&
                a.fed &&
                b.fed &&
                a.cooldown <= 0 &&
                b.cooldown <= 0 &&
                this.canFarmPopulationAdvance(a.species, {
                    excludeReservation: BIRTH_RESERVATION?.reservation || null,
                }) &&
                this.ownedPopulation + this.birthReservations - Number(!!BIRTH_RESERVATION) < this.totalFarmCapacity &&
                (BIRTH_RESERVATION
                    ? this.roster.placedPopulation(BIRTH_RESERVATION.plotId) +
                          (this._breedPlotReservations.get(BIRTH_RESERVATION.plotId) || 0) <=
                      this.farmPlots.get(BIRTH_RESERVATION.plotId)?.capacity
                    : !!this.availableFarmPlotFor(a.species)) &&
                this._unitIsActive(a) &&
                this._unitIsActive(b) &&
                RESERVATIONS_AVAILABLE &&
                (this.unitCollection.reservationOwner(b) === null ||
                    this.unitCollection.reservationOwner(b) === OWNER) &&
                (!requireContact || Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius + 0.2)
            );
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
        return [...(this._breedPlans?.values() || [])].find((plan) => plan.parentIds.includes(unit?.id)) || null;
    }
    canStartCrossPlotBreed(a, b, { allowSamePlot = false } = {}) {
        return !!(
            this.scene === 'farm' &&
            this.farmBossEvent?.phase === 'idle' &&
            a &&
            b &&
            a !== b &&
            (allowSamePlot || a.plotId !== b.plotId) &&
            a.plotId !== RESERVE_PLOT_ID &&
            b.plotId !== RESERVE_PLOT_ID &&
            a.species === b.species &&
            a.hp > 0 &&
            b.hp > 0 &&
            a.down <= 0 &&
            b.down <= 0 &&
            a.mature &&
            b.mature &&
            a.fed &&
            b.fed &&
            a.cooldown <= 0 &&
            b.cooldown <= 0 &&
            this.canBreedNow(a) &&
            this.canBreedNow(b) &&
            !this.senseEnemy(a) &&
            !this.senseEnemy(b) &&
            this.canFarmPopulationAdvance(a.species) &&
            this.ownedPopulation + this.birthReservations < this.totalFarmCapacity &&
            !this.unitCollection.reservationOwner(a) &&
            !this.unitCollection.reservationOwner(b)
        );
    }
    reserveCrossPlotBreed(a, b, { allowSamePlot = false, durationTicks = 10 } = {}) {
        if (
            !this.canStartCrossPlotBreed(a, b, { allowSamePlot }) ||
            !Number.isSafeInteger(durationTicks) ||
            durationTicks < 1
        ) {
            return false;
        }
        const PARENT_IDS = [a.id, b.id],
            PARENTS_BY_SOURCE = new Map();
        for (const PARENT of [a, b]) {
            PARENTS_BY_SOURCE.set(PARENT.plotId, (PARENTS_BY_SOURCE.get(PARENT.plotId) || 0) + 1);
        }
        const IDLE_RESIDENTS = this.roster
                .residents()
                .filter(
                    (unit) =>
                        unit.plotId !== RESERVE_PLOT_ID &&
                        unit.id !== a.id &&
                        unit.id !== b.id &&
                        !this.unitCollection.reservationOwner(unit) &&
                        !unit.mateId &&
                        unit.hp > 0 &&
                        unit.down <= 0 &&
                        unit.stun <= 0 &&
                        unit.ability?.phase === 'idle' &&
                        (!unit.specialAbility || unit.specialAbility.phase === 'idle') &&
                        !this.senseEnemy(unit),
                )
                .sort((left, right) => left.plotId.localeCompare(right.plotId) || left.id - right.id),
            CANDIDATES = [...this.farmPlots.values()]
                .map((plot) => {
                    const PARENTS_HERE = PARENT_IDS.filter(
                            (id) => this.unitCollection.unitById(id)?.plotId === plot.id,
                        ).length,
                        MOVED = 2 - PARENTS_HERE,
                        ADDED = MOVED + 1,
                        OCCUPANCY =
                            this.roster.placedPopulation(plot.id) + (this._breedPlotReservations.get(plot.id) || 0),
                        NEEDED_EXCHANGES = Math.max(0, OCCUPANCY + ADDED - plot.capacity),
                        EXCHANGES = [];
                    if (NEEDED_EXCHANGES > 2 || NEEDED_EXCHANGES > MOVED) {
                        return null;
                    }
                    for (const [SOURCE_PLOT_ID, PARENT_COUNT] of PARENTS_BY_SOURCE) {
                        if (SOURCE_PLOT_ID === plot.id) {
                            continue;
                        }
                        for (const RESIDENT of IDLE_RESIDENTS) {
                            if (
                                EXCHANGES.length >= NEEDED_EXCHANGES ||
                                EXCHANGES.some((exchange) => exchange.unitId === RESIDENT.id) ||
                                RESIDENT.plotId !== plot.id
                            ) {
                                continue;
                            }
                            const USED_AT_SOURCE = EXCHANGES.filter(
                                (exchange) => exchange.plotId === SOURCE_PLOT_ID,
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
                    const OCCUPANCY_DELTA = new Map([[plot.id, ADDED - EXCHANGES.length]]);
                    for (const [SOURCE_PLOT_ID, PARENT_COUNT] of PARENTS_BY_SOURCE) {
                        if (SOURCE_PLOT_ID !== plot.id) {
                            OCCUPANCY_DELTA.set(
                                SOURCE_PLOT_ID,
                                (OCCUPANCY_DELTA.get(SOURCE_PLOT_ID) || 0) -
                                    PARENT_COUNT +
                                    EXCHANGES.filter((exchange) => exchange.plotId === SOURCE_PLOT_ID).length,
                            );
                        }
                    }
                    const FINAL_OCCUPANCY_FITS = [...this.farmPlots.values()].every(
                        (candidatePlot) =>
                            this.roster.placedPopulation(candidatePlot.id) +
                                (this._breedPlotReservations.get(candidatePlot.id) || 0) +
                                Math.max(0, OCCUPANCY_DELTA.get(candidatePlot.id) || 0) <=
                            candidatePlot.capacity,
                    );
                    const PLOT_RESERVATION_DELTAS = new Map([...OCCUPANCY_DELTA].filter(([, delta]) => delta > 0));
                    return FINAL_OCCUPANCY_FITS
                        ? {
                              plot,
                              parentsHere: PARENTS_HERE,
                              moved: MOVED,
                              added: ADDED,
                              occupancy: OCCUPANCY,
                              exchanges: EXCHANGES,
                              occupancyDelta: OCCUPANCY_DELTA,
                              plotReservationDeltas: PLOT_RESERVATION_DELTAS,
                          }
                        : null;
                })
                .filter(Boolean)
                .sort(
                    (left, right) =>
                        right.parentsHere - left.parentsHere ||
                        left.moved - right.moved ||
                        left.occupancy - right.occupancy ||
                        left.plot.id.localeCompare(right.plot.id),
                ),
            DESTINATION = CANDIDATES[0];
        if (!DESTINATION) {
            return false;
        }
        const OWNER = this.breedingReservationOwner(a, b),
            RESERVATION = { species: a.species, owner: OWNER },
            ASSIGNMENTS = [
                { unitId: a.id, plotId: DESTINATION.plot.id },
                { unitId: b.id, plotId: DESTINATION.plot.id },
                ...DESTINATION.exchanges,
            ],
            ORIGINAL_ASSIGNMENTS = ASSIGNMENTS.map(({ unitId }) => ({
                unitId,
                plotId: this.unitCollection.unitById(unitId).plotId,
            }));
        if (
            !this.unitCollection.reserve(OWNER, [
                a,
                b,
                ...DESTINATION.exchanges.map(({ unitId }) => this.unitCollection.unitById(unitId)),
            ])
        ) {
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
                { x: b.x, y: b.y, vx: b.vx, vy: b.vy },
            ],
            assignments: ASSIGNMENTS,
            originalAssignments: ORIGINAL_ASSIGNMENTS,
            exchangeUnitIds: DESTINATION.exchanges.map(({ unitId }) => unitId),
            destinationPlotId: DESTINATION.plot.id,
            dueTick: this.simulationTick + durationTicks,
            expiresTick: this.simulationTick + 100,
            targetSnapshot: [...this.farmTargets],
            reservation: RESERVATION,
            plotReservationDeltas: Object.fromEntries(DESTINATION.plotReservationDeltas),
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
        for (const PLAN of [...(this._breedPlans?.values() || [])]) {
            this.cancelBreedPlan(PLAN);
        }
        for (const OWNER of [...(this._activeBreedReservations?.keys() || [])]) {
            this.releaseActiveBreedReservation(OWNER);
        }
        this._breedPlans?.clear();
        this._activeBreedReservations?.clear();
        this._breedPlotReservations?.clear();
    }
    reserveActiveBreedPair(a, b) {
        const OWNER = this.breedingReservationOwner(a, b),
            EXISTING = this._activeBreedReservations.get(OWNER);
        if (EXISTING) {
            return EXISTING.parentIds.includes(a.id) && EXISTING.parentIds.includes(b.id);
        }
        if (
            !a ||
            !b ||
            a.plotId !== b.plotId ||
            a.plotId === RESERVE_PLOT_ID ||
            !this.canBreedPair(a, b) ||
            a.down > 0 ||
            b.down > 0 ||
            (a.mateId && a.mateId !== b.id) ||
            (b.mateId && b.mateId !== a.id) ||
            this.roster.placedPopulation(a.plotId) + (this._breedPlotReservations.get(a.plotId) || 0) >=
                this.farmPlots.get(a.plotId)?.capacity
        ) {
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
            reservation: RESERVATION,
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
            (a, b) => a.dueTick - b.dueTick || a.owner.localeCompare(b.owner),
        )) {
            if (this.simulationTick > PLAN.expiresTick) {
                this.cancelBreedPlan(PLAN);
                continue;
            }
            const [A, B] = PLAN.parentIds.map((id) => this.unitCollection.unitById(id));
            if (
                this.scene !== 'farm' ||
                this.farmBossEvent?.phase !== 'idle' ||
                !A ||
                !B ||
                A.mateId !== B.id ||
                B.mateId !== A.id ||
                A.hp <= 0 ||
                B.hp <= 0 ||
                A.down > 0 ||
                B.down > 0 ||
                !A.mature ||
                !B.mature ||
                !A.fed ||
                !B.fed ||
                A.cooldown > 0 ||
                B.cooldown > 0 ||
                !this.canBreedNow(A) ||
                !this.canBreedNow(B) ||
                A.species !== B.species ||
                this.senseEnemy(A) ||
                this.senseEnemy(B) ||
                PLAN.targetSnapshot.some((value, index) => value !== this.farmTargets[index]) ||
                !this.canFarmPopulationAdvance(A.species, { excludeReservation: PLAN.reservation })
            ) {
                this.cancelBreedPlan(PLAN);
                continue;
            }
            if (this.simulationTick < PLAN.dueTick) {
                continue;
            }
            const DESTINATION = this.farmPlots.get(PLAN.destinationPlotId),
                ASSIGNMENTS_VALID = PLAN.assignments.every(({ unitId }) => {
                    const UNIT_ID = unitId;
                    const RESIDENT = this.unitCollection.unitById(UNIT_ID);
                    return (
                        RESIDENT &&
                        RESIDENT.plotId === PLAN.originalAssignments.find((row) => row.unitId === UNIT_ID)?.plotId
                    );
                });
            const FINAL_OCCUPANCY_FITS = [...this.farmPlots.values()].every((plot) => {
                return (
                    this.roster.placedPopulation(plot.id) + (this._breedPlotReservations.get(plot.id) || 0) <=
                    plot.capacity
                );
            });
            if (
                !DESTINATION ||
                !ASSIGNMENTS_VALID ||
                !FINAL_OCCUPANCY_FITS ||
                PLAN.assignments.some(({ unitId }) => {
                    const UNIT_ID = unitId;
                    const RESIDENT = this.unitCollection.unitById(UNIT_ID);
                    if (!RESIDENT || this.unitCollection.reservationOwner(RESIDENT) !== PLAN.owner) {
                        return true;
                    }
                    return (
                        PLAN.exchangeUnitIds.includes(UNIT_ID) &&
                        (RESIDENT.hp <= 0 ||
                            RESIDENT.down > 0 ||
                            RESIDENT.ability?.phase !== 'idle' ||
                            (RESIDENT.specialAbility && RESIDENT.specialAbility.phase !== 'idle') ||
                            this.senseEnemy(RESIDENT))
                    );
                }) ||
                this.ownedPopulation + this.birthReservations > this.totalFarmCapacity ||
                !this.canFarmPopulationAdvance(A.species, { excludeReservation: PLAN.reservation })
            ) {
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
            const COMMITTED =
                DESTINATION.id === this.activePlotId
                    ? FARM_MODES.breed.pair(this, A, B, true)
                    : this.commitInactiveBreedBirth(A, B, DESTINATION.id);
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
        if (
            this.scene !== 'farm' ||
            !a ||
            !b ||
            a === b ||
            a.plotId !== plotId ||
            b.plotId !== plotId ||
            a.hp <= 0 ||
            b.hp <= 0 ||
            a.down > 0 ||
            b.down > 0 ||
            !a.mature ||
            !b.mature ||
            !a.fed ||
            !b.fed ||
            a.cooldown > 0 ||
            b.cooldown > 0 ||
            a.species !== b.species ||
            !this.canFarmPopulationAdvance(a.species) ||
            this.ownedPopulation + this.birthReservations >= this.totalFarmCapacity ||
            !this.availableFarmPlot(plotId)
        ) {
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
        if (
            this.scene !== 'farm' ||
            unit.plotId === this.activePlotId ||
            unit.plotId === RESERVE_PLOT_ID ||
            this.simulationTick < (unit.nextMateSearchTick || 0) ||
            unit.mateId ||
            this.unitCollection.reservationOwner(unit) ||
            !unit.mature ||
            !unit.fed ||
            unit.cooldown > 0 ||
            unit.hp <= 0 ||
            !this.canFarmPopulationAdvance(unit.species) ||
            this.ownedPopulation + this.birthReservations >= this.totalFarmCapacity
        ) {
            return false;
        }
        const CANDIDATES = this.roster
            .residentsOfSpecies(unit.species)
            .filter(
                (candidate) =>
                    candidate !== unit &&
                    candidate.plotId !== this.activePlotId &&
                    candidate.plotId !== RESERVE_PLOT_ID &&
                    !candidate.mateId &&
                    !this.unitCollection.reservationOwner(candidate) &&
                    candidate.hp > 0 &&
                    candidate.down <= 0 &&
                    candidate.mature &&
                    candidate.fed &&
                    candidate.cooldown <= 0 &&
                    this.canBreedNow(candidate),
            )
            .sort(
                (a, b) =>
                    Number(a.plotId !== unit.plotId) - Number(b.plotId !== unit.plotId) ||
                    Number(a.tier !== unit.tier) - Number(b.tier !== unit.tier) ||
                    Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y) ||
                    a.id - b.id,
            );
        for (const MATE of CANDIDATES) {
            const DISTANCE = Math.hypot(MATE.x - unit.x, MATE.y - unit.y),
                SPEED = Math.max(
                    0.01,
                    scaleMoveSpeed(2.2 * farmUpgradeRate(this.playerProgression.farmUpgrades, 'growth'), unit),
                ),
                TICKS = Math.min(100, Math.max(1, Math.ceil(DISTANCE / SPEED / Math.max(dt, 1e-9))));
            if (this.reserveCrossPlotBreed(unit, MATE, { allowSamePlot: true, durationTicks: TICKS })) {
                unit.nextMateSearchTick = MATE.nextMateSearchTick = this.simulationTick + 10;
                return true;
            }
        }
        unit.nextMateSearchTick = this.simulationTick + 10;
        return false;
    }
    _isValidBreedReservation(unit, owner) {
        if (!owner?.startsWith('breed:')) {
            return false;
        }
        const MATE = this._unitById.get(unit.mateId);
        return !!(
            MATE &&
            MATE.mateId === unit.id &&
            this.unitCollection.reservationOwner(MATE) === owner &&
            this.breedingReservationOwner(unit, MATE) === owner &&
            this.canBreedPair(unit, MATE) &&
            !this.senseEnemy(unit) &&
            !this.senseEnemy(MATE)
        );
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
        if (
            unit.mateId &&
            this.releaseActiveBreedReservation(
                this.breedingReservationOwner(unit, this.unitCollection.unitById(unit.mateId)),
            )
        ) {
            return true;
        }
        unit.mateId = 0;
        if (MATE && MATE.mateId === unit.id) {
            MATE.mateId = 0;
        }
        const OWNER = this.unitCollection.reservationOwner(unit);
        if (OWNER?.startsWith('breed:')) {
            this.unitCollection.releaseReservations(OWNER);
        }
    }
    reconcileMateReservations() {
        const BATCH = !this._spatialStepActive;
        if (BATCH) {
            this._beginSpatialQueryBatch();
        }
        try {
            if (this.scene !== 'farm') {
                for (const UNIT_LOCAL of this.units) {
                    this.releaseMate(UNIT_LOCAL);
                }
                return;
            }
            for (const TASK of [...this.mergeTasks]) {
                if (TASK.phase !== 'approach') {
                    continue;
                }
                const MATERIALS = TASK.materialIds.map((id) => this._unitById.get(id)),
                    OWNER = MERGE_RESERVATION_OWNER(TASK.materialIds);
                if (
                    !this.canMergeGroup(MATERIALS, { reservationOwner: OWNER }) ||
                    !this.unitCollection.reserve(OWNER, MATERIALS)
                ) {
                    this.cancelMergeTask(TASK);
                }
            }
            for (const UNIT_LOCAL of this.units) {
                if (this.breedPlanFor(UNIT_LOCAL)) {
                    continue;
                }
                if (!UNIT_LOCAL.mateId) {
                    const OWNER = this.unitCollection.reservationOwner(UNIT_LOCAL);
                    if (OWNER?.startsWith('breed:')) {
                        this.unitCollection.releaseReservations(OWNER);
                    }
                    continue;
                }
                const MATE = this._unitById.get(UNIT_LOCAL.mateId);
                if (
                    !MATE ||
                    MATE.mateId !== UNIT_LOCAL.id ||
                    !this.canBreedPair(UNIT_LOCAL, MATE) ||
                    !this.unitCollection.reserve(this.breedingReservationOwner(UNIT_LOCAL, MATE), [UNIT_LOCAL, MATE])
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
            const ACTIVE_PLAN = this.breedPlanFor(unit);
            if (ACTIVE_PLAN) {
                return this.unitCollection.unitById(ACTIVE_PLAN.parentIds.find((id) => id !== unit.id)) || null;
            }
            if (
                this.scene !== 'farm' ||
                !unit.mature ||
                !unit.fed ||
                unit.cooldown > 0 ||
                unit.hp <= 0 ||
                this.senseEnemy(unit)
            ) {
                this.releaseMate(unit);
                return null;
            }
            if (
                !this.canFarmPopulationAdvance(unit.species) ||
                this.ownedPopulation + this.birthReservations >= this.totalFarmCapacity
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
            if (this.simulationTick < (unit.nextMateSearchTick || 0)) {
                return null;
            }
            const CANDIDATES = [];
            for (const CANDIDATE of this.roster.residentsOfSpecies(unit.species)) {
                if (
                    CANDIDATE === unit ||
                    CANDIDATE.mateId ||
                    CANDIDATE.plotId === RESERVE_PLOT_ID ||
                    CANDIDATE.hp <= 0 ||
                    CANDIDATE.down > 0 ||
                    !CANDIDATE.mature ||
                    !CANDIDATE.fed ||
                    CANDIDATE.cooldown > 0 ||
                    !this.canBreedNow(CANDIDATE) ||
                    this.unitCollection.reservationOwner(CANDIDATE) ||
                    (CANDIDATE.plotId === unit.plotId
                        ? !this.canBreedPair(unit, CANDIDATE)
                        : !this.canStartCrossPlotBreed(unit, CANDIDATE))
                ) {
                    continue;
                }
                CANDIDATES.push(CANDIDATE);
            }
            CANDIDATES.sort(
                (a, b) =>
                    Number(a.plotId !== unit.plotId) - Number(b.plotId !== unit.plotId) ||
                    Number(a.tier !== unit.tier) - Number(b.tier !== unit.tier) ||
                    Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y) ||
                    a.id - b.id,
            );
            for (const MATE of CANDIDATES) {
                if (MATE.plotId !== unit.plotId) {
                    const DISTANCE = Math.hypot(MATE.x - unit.x, MATE.y - unit.y),
                        SPEED = Math.max(
                            0.01,
                            scaleMoveSpeed(2.2 * farmUpgradeRate(this.playerProgression.farmUpgrades, 'growth'), unit),
                        ),
                        TICKS = Math.min(100, Math.max(1, Math.ceil(DISTANCE / SPEED / 0.05)));
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
        if (this.scene !== 'farm' || this.ownedPopulation + this.birthReservations >= this.totalFarmCapacity) {
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
                        !this.canBreedNow(UNIT_LOCAL) ||
                        UNIT_LOCAL.hp <= 0 ||
                        !UNIT_LOCAL.mature ||
                        !UNIT_LOCAL.fed ||
                        UNIT_LOCAL.cooldown > 0 ||
                        !this.canFarmPopulationAdvance(UNIT_LOCAL.species) ||
                        !this._unitIsActive(UNIT_LOCAL)
                    ) {
                        continue;
                    }
                    if (!UNIT_LOCAL.mateId && !this.unitCollection.reservationOwner(UNIT_LOCAL)) {
                        if (++unreserved >= 2) {
                            return true;
                        }
                        continue;
                    }
                    const MATE = this._unitById.get(UNIT_LOCAL.mateId);
                    if (
                        MATE?.mateId === UNIT_LOCAL.id &&
                        this.unitCollection.reservationOwner(UNIT_LOCAL) ===
                            this.breedingReservationOwner(UNIT_LOCAL, MATE) &&
                        MATE.species === UNIT_LOCAL.species &&
                        MATE.tier === UNIT_LOCAL.tier &&
                        MATE.hp > 0 &&
                        MATE.mature &&
                        MATE.fed &&
                        MATE.cooldown <= 0 &&
                        this.canBreedNow(MATE) &&
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
    canMergeGroup(materials, { requireContact = false, requireNoEnemy = false, reservationOwner = null } = {}) {
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
                    (this.unitCollection.reservationOwner(UNIT_LOCAL) &&
                        this.unitCollection.reservationOwner(UNIT_LOCAL) !== reservationOwner &&
                        (reservationOwner ||
                            !this._isValidBreedReservation(
                                UNIT_LOCAL,
                                this.unitCollection.reservationOwner(UNIT_LOCAL),
                            ))) ||
                    !this._unitIsActive(UNIT_LOCAL)
                ) {
                    return false;
                }
                IDS.add(UNIT_LOCAL.id);
            }
            // Sleeping owned units count toward the minimum roster, but cannot be
            // consumed. The resulting same-species count must remain at least two.
            const EXCLUDED_TASK = reservationOwner
                ? this.mergeTasks.find((task) => MERGE_RESERVATION_OWNER(task.materialIds || []) === reservationOwner)
                : null;
            if (
                this._ownedSpeciesCounts[FIRST.species] -
                    this._pendingMergeCost(FIRST.species, EXCLUDED_TASK) -
                    MATERIAL_COUNT +
                    1 <
                2
            ) {
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
    selectMergeMaterials() {
        if (this.scene !== 'farm') {
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
                    if (
                        !UNIT_LOCAL.isBattleOnlySummon &&
                        UNIT_LOCAL.mergeEligible !== false &&
                        UNIT_LOCAL.hp > 0 &&
                        UNIT_LOCAL.down <= 0 &&
                        UNIT_LOCAL.mature &&
                        UNIT_LOCAL.cooldown <= 0 &&
                        UNIT_LOCAL.tier < CONFIG.unit.maxTier &&
                        (!this.unitCollection.reservationOwner(UNIT_LOCAL) ||
                            this._isValidBreedReservation(
                                UNIT_LOCAL,
                                this.unitCollection.reservationOwner(UNIT_LOCAL),
                            )) &&
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
                    if (
                        GROUP.length < MATERIAL_COUNT ||
                        this._ownedSpeciesCounts[species] - this._pendingMergeCost(species) - MATERIAL_COUNT + 1 < 2
                    ) {
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
            return bestMaterialIds ? bestMaterialIds.map((id) => this._unitById.get(id)) : null;
        } finally {
            if (BATCH) {
                this._endSpatialQueryBatch();
            }
        }
    }
    mergeDecision() {
        if (this.scene !== 'farm') {
            return {
                available: false,
                code: 'wrong-scene',
                reason: '농장 화면에서만 합성할 수 있어요.',
            };
        }
        if (this.farmBossEvent?.phase !== 'idle') {
            return {
                available: false,
                code: 'boss-event',
                reason: '레이드 중에는 합성할 수 없어요.',
            };
        }
        const MATERIALS = this.selectMergeMaterials();
        if (!MATERIALS) {
            return {
                available: false,
                code: 'no-eligible-materials',
                reason: '합성할 수 있는 같은 병종이 부족해요.',
            };
        }
        return {
            available: true,
            code: 'ready',
            tier: MATERIALS[0].tier + 1,
            materialCount: MATERIALS.length,
            materials: MATERIALS,
            reason: 'T' + MATERIALS[0].tier + ' ' + MATERIALS.length + '마리 → T' + (MATERIALS[0].tier + 1) + ' 합성',
        };
    }
    mergeAvailability() {
        const DECISION = this.mergeDecision();
        return {
            available: DECISION.available,
            code: DECISION.code,
            reason: DECISION.reason,
            ...(DECISION.available
                ? {
                      tier: DECISION.tier,
                      materialCount: DECISION.materialCount,
                  }
                : {}),
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
        const MATERIAL_IDS = MATERIALS.map((unit) => unit.id),
            OWNER = MERGE_RESERVATION_OWNER(MATERIAL_IDS),
            CENTER_X = MATERIALS.reduce((sum, unit) => sum + unit.x, 0) / MATERIALS.length,
            CENTER_Y = MATERIALS.reduce((sum, unit) => sum + unit.y, 0) / MATERIALS.length,
            DURATION = CONFIG.farm.merge.animationSeconds,
            SEQUENCE_WINDOW = DURATION * 0.72,
            STEP = SEQUENCE_WINDOW / MATERIALS.length;
        const REPLACE_OWNERS = [
            ...new Set(
                MATERIALS.map((unit) => this.unitCollection.reservationOwner(unit)).filter((owner) =>
                    owner?.startsWith('breed:'),
                ),
            ),
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
            phase: 'approach',
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
            duration: DURATION,
        };
        this.mergeTasks.push(TASK);
        MATERIALS.forEach((unit, index) =>
            this.effects.push({
                kind: 'merge-material',
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
                sequenceCount: MATERIALS.length,
            }),
        );
        this._markMergeTasksChanged();
        return true;
    }
    cancelMergeTask(task = this.mergeTask) {
        const TASK = task,
            INDEX = this.mergeTasks.indexOf(TASK);
        if (INDEX < 0) {
            return false;
        }
        if (TASK.materialIds?.length) {
            const OWNER = MERGE_RESERVATION_OWNER(TASK.materialIds);
            if (TASK.phase === 'approach') {
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
        if (this.scene !== 'farm') {
            this.cancelMergeTasks();
            return;
        }
        if (this.farmBossEvent?.phase !== 'idle') {
            this.cancelMergeTasks();
            return;
        }
        for (const TASK of [...this.mergeTasks]) {
            if (TASK.phase === 'animation') {
                TASK.elapsed = Math.min(TASK.duration, TASK.elapsed + dt);
                if (TASK.elapsed >= TASK.duration - 1e-9) {
                    this.cancelMergeTask(TASK);
                }
                continue;
            }
            if (TASK.phase === 'approach') {
                const MATERIALS = TASK.materialIds.map((id) => this._unitById.get(id)),
                    OWNER = MERGE_RESERVATION_OWNER(TASK.materialIds);
                if (
                    !this.canMergeGroup(MATERIALS, {
                        requireNoEnemy: true,
                        reservationOwner: OWNER,
                    }) ||
                    !this.unitCollection.reserve(OWNER, MATERIALS)
                ) {
                    this.cancelMergeTask(TASK);
                    continue;
                }
                TASK.elapsed = Math.min(TASK.duration, TASK.elapsed + dt);
                const PROGRESS = CLAMP(TASK.elapsed / TASK.duration, 0, 1),
                    EASE_IN = PROGRESS ** 2.25,
                    MOVE_DT = Math.max(dt, 1e-6);
                for (const [INDEX, UNIT_LOCAL] of MATERIALS.entries()) {
                    const START = TASK.startPositions[INDEX],
                        OLD_X = UNIT_LOCAL.x,
                        OLD_Y = UNIT_LOCAL.y,
                        OLD_Z = UNIT_LOCAL.z,
                        NEXT_X = START.x + (TASK.centerX - START.x) * EASE_IN,
                        NEXT_Y = START.y + (TASK.centerY - START.y) * EASE_IN,
                        NEXT_Z = START.z + (TASK.centerZ - START.z) * EASE_IN;
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
            if (TASK.phase !== 'approach') {
                continue;
            }
            const MATERIALS = TASK.materialIds.map((id) => this._unitById.get(id)),
                OWNER = MERGE_RESERVATION_OWNER(TASK.materialIds);
            if (TASK.elapsed < TASK.duration - 1e-9) {
                continue;
            }
            if (
                this.canMergeGroup(MATERIALS, {
                    requireNoEnemy: true,
                    reservationOwner: OWNER,
                }) &&
                this.mergeGroup(MATERIALS, { task: TASK })
            ) {
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
        const TASK_INDEX = this.mergeTasks.indexOf(TASK),
            OWNER = TASK?.materialIds ? MERGE_RESERVATION_OWNER(TASK.materialIds) : null;
        if (
            TASK_INDEX < 0 ||
            TASK?.phase !== 'approach' ||
            this.scene !== 'farm' ||
            !OWNER ||
            TASK.materialIds.length !== materials.length ||
            !TASK.materialIds.every((id, index) => materials[index]?.id === id) ||
            TASK.elapsed < TASK.duration - 1e-9 ||
            !this.canMergeGroup(materials, {
                requireNoEnemy: true,
                reservationOwner: OWNER,
            })
        ) {
            return false;
        }
        const ORDERED = [...materials],
            FIRST = ORDERED[0],
            MATERIAL_IDS = ORDERED.map((unit) => unit.id),
            X = TASK.centerX,
            Y = TASK.centerY,
            Z = TASK.centerZ;
        // Prepare the complete result before the collection owner commits the
        // replacement. A failed preparation never consumes existing units.
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
        const SEQUENCE_WINDOW = CONFIG.farm.merge.animationSeconds * 0.72,
            STEP = SEQUENCE_WINDOW / ORDERED.length;
        if (
            !this.replaceUnitGroup(
                ORDERED,
                RESULT,
                () => {
                    this.nextId++;
                    TASK.phase = 'animation';
                    TASK.aId = 0;
                    TASK.bId = 0;
                    TASK.materialIds = MATERIAL_IDS;
                    TASK.resultId = RESULT.id;
                    TASK.sourceSpecies = FIRST.species;
                    TASK.sourceTier = FIRST.tier;
                    TASK.elapsed = 0;
                    TASK.duration = CONFIG.farm.merge.animationSeconds;
                    this._markMergeTasksChanged();
                    ORDERED.forEach((unit, index) =>
                        this.effects.push({
                            kind: 'merge-material',
                            x: unit.x,
                            y: unit.y,
                            z: 0.2,
                            targetX: X,
                            targetY: Y,
                            targetZ: Z,
                            life: 0,
                            delay: index * STEP,
                            span: STEP,
                            duration: (index + 1) * STEP,
                            sequenceIndex: index,
                            sequenceCount: ORDERED.length,
                        }),
                    );
                    this.metrics.merges++;
                },
                TASK,
            )
        ) {
            return false;
        }
        this.emit('merge', X, Y, 1, {
            delay: SEQUENCE_WINDOW,
            span: CONFIG.farm.merge.celebrationSeconds,
            tier: RESULT.tier,
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
            this.profiler?.end('mutationDispatch', MUTATION_START);
            this.profiler?.end('worldStep', STEP_START);
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
        // Keep the original step membership/order; spawns join indexes now but
        // are first advanced by the next logical tick.
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
        this.profiler?.end('mergeTask', MERGE_TASK_START);
        let effectWrite = 0;
        for (const EFFECT of this.effects) {
            EFFECT.life += dt;
            if (EFFECT.life < (Number.isFinite(EFFECT.duration) ? EFFECT.duration : 1)) {
                this.effects[effectWrite++] = EFFECT;
            }
        }
        this.effects.length = effectWrite;
        for (const PROJECTILE of this.projectiles) {
            PROJECTILE_BEHAVIORS.forProjectile(PROJECTILE).advanceLifecycle(this, PROJECTILE, dt);
        }
        this._rebuildFoodSpatialIndex();
        const WORK_START = this.profiler?.start(),
            PREVIOUS_WORK = this._lastFoodSearchSchedulerMetrics,
            CANDIDATES_BEFORE = this._foodSearchWork.candidateChecks,
            CELLS_BEFORE = this._foodSearchWork.cellVisits,
            WORK_UNITS = this._foodSearchScheduler.tick((this.metrics.logicTicks || 0) + 1),
            CURRENT_WORK = this._foodSearchScheduler.metrics;
        this._lastFoodSearchSchedulerMetrics = CURRENT_WORK;
        if (this.profiler) {
            this.profiler.count('workSchedulerTicks');
            this.profiler.count('workSchedulerUnits', WORK_UNITS);
            this.profiler.count('foodSearchCandidateChecks', this._foodSearchWork.candidateChecks - CANDIDATES_BEFORE);
            this.profiler.count('foodSearchCellVisits', this._foodSearchWork.cellVisits - CELLS_BEFORE);
            this.profiler.count('workSchedulerQueueDepth', CURRENT_WORK.queueDepth);
            this.profiler.count('workSchedulerJobsQueued', CURRENT_WORK.jobsQueued - (PREVIOUS_WORK?.jobsQueued || 0));
            this.profiler.count(
                'workSchedulerJobsCompleted',
                CURRENT_WORK.jobsCompleted - (PREVIOUS_WORK?.jobsCompleted || 0),
            );
            this.profiler.count(
                'workSchedulerJobsCancelled',
                CURRENT_WORK.jobsCancelled - (PREVIOUS_WORK?.jobsCancelled || 0),
            );
            this.profiler.count('workSchedulerWaitedJobs', CURRENT_WORK.lastTickWaitedJobs);
            this.profiler.count('workSchedulerWaitingTicks', CURRENT_WORK.lastTickWaitingTicks);
            this.profiler.maximum('workSchedulerMaxWaitTicks', CURRENT_WORK.lastTickMaxWaitTicks);
            this.profiler.count('workSchedulerBudgetExhaustions', Number(CURRENT_WORK.lastTickBudgetExhausted));
        }
        this.profiler?.end('workScheduler', WORK_START);
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
                    Math.floor((CONFIG.farm.breeding.matureMeals * U.growthElapsed) / U.growthDuration + 1e-9),
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
            this.profiler?.end('ai', AI_START);
        }
        // Inactive plots keep only persistent lifecycle timers. They do not
        // enter AI, spatial queries, contacts, or physics.
        if (this.scene === 'farm') {
            for (const U of this.unitCollection.items) {
                if (
                    !this.unitCollection.isResident(U) ||
                    ACTIVE_UNIT_SET.has(U) ||
                    U.plotId === this.activePlotId ||
                    U.spawnedAtSimulationTick === this.simulationTick
                ) {
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
                        Math.floor((CONFIG.farm.breeding.matureMeals * U.growthElapsed) / U.growthDuration + 1e-9),
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
                if (this.isWorker(U)) {
                    continue;
                }
                if (this.advanceInactiveForage(U, dt)) {
                    progressTimersAdvanced = true;
                }
                this.planInactiveBreed(U, dt);
            }
        }
        // Timed growth/rest is real progress, but movement is not. Checkpoint
        // advancing timers at a coarse cadence, never once per physics tick.
        SCENE.checkpointProgress(this, dt, progressTimersAdvanced);
        SCENE.updateBattle(this, dt);
        this.metrics.logicTicks = (this.metrics.logicTicks || 0) + 1;
        this.profiler?.count('logicTicks');
        this.profiler?.end('logic', LOGIC_START);
        const PHYSICS_START = this.profiler?.start();
        this.advancePhysics(dt, UNITS, SCENE);
        this.profiler?.end('physics', PHYSICS_START);
        CornAttachmentModel.advance(this);
        const POST_STEP_START = this.profiler?.start();
        SCENE.resolveLifeContacts(this, UNITS);
        this.resolvePeaRecoveryBoosts(UNITS);
        let projectileWrite = 0;
        for (const PROJECTILE of this.projectiles) {
            if (PROJECTILE_BEHAVIORS.forProjectile(PROJECTILE).isAlive(PROJECTILE)) {
                this.projectiles[projectileWrite++] = PROJECTILE;
            }
        }
        this.projectiles.length = projectileWrite;
        this.unitCollection.removeWhere((unit) => unit.isBattleOnlySummon && unit.hp <= 0);
        UNITS.length = 0;
        this.unitCollection.releaseStepReferences();
        this._spatialStepActive = false;
        this._unitSpatialDirty = true;
        this._foodSpatialDirty = true;
        this.profiler?.end('worldPostStep', POST_STEP_START);
    }
    updateUnitSpatial(unit) {
        const START = this.profiler?.start();
        this.unitSpatial.update(unit);
        this.profiler?.end('spatial', START);
    }
    updateFoodSpatial(food) {
        const START = this.profiler?.start();
        this.foodSpatial.update(food);
        this.profiler?.end('spatial', START);
    }
    advancePhysics(dt, units, scene) {
        this.metrics.physicsSteps = (this.metrics.physicsSteps || 0) + 1;
        this.profiler?.count('physicsSteps');
        this._oldStepPosition ||= { x: 0, y: 0, z: 0 };
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
            const OLD_Z = U.z,
                OLD_POSITION = this._oldStepPosition;
            OLD_POSITION.x = U.x;
            OLD_POSITION.y = U.y;
            OLD_POSITION.z = U.z;
            if (U.stun > 0 && U.ability.phase !== 'idle') {
                U.ability.interrupt();
            }
            if (U.stun > 0 && U.specialAbility && U.specialAbility.phase !== 'idle') {
                U.specialAbility.interrupt();
            }
            U.integrate(dt);
            scene.afterLivingIntegration(this, U);
            const ACTIVE_ATTACK = U.specialAbility && U.specialAbility.phase !== 'idle' ? U.specialAbility : U.ability;
            if (ACTIVE_ATTACK.phase === 'active') {
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
        this.profiler?.end('collision', COLLISION_START);
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
            const ACTIVE_ATTACK =
                unit.specialAbility && unit.specialAbility.phase !== 'idle' ? unit.specialAbility : unit.ability;
            if (ACTIVE_ATTACK.phase !== 'idle') {
                if (ACTIVE_ATTACK.phase !== 'recover') {
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
            if (
                !UNIT_LOCAL.peaRecoveryPending ||
                UNIT_LOCAL.down > 0 ||
                UNIT_LOCAL.stun > 0 ||
                UNIT_LOCAL.z > 0.1 ||
                UNIT_LOCAL.landingRecovery > 0 ||
                !UNIT_LOCAL.dropLanded ||
                UNIT_LOCAL.ability.phase !== 'idle' ||
                (UNIT_LOCAL.specialAbility && UNIT_LOCAL.specialAbility.phase !== 'idle')
            ) {
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
        const DX = x - u.x,
            DY = y - u.y,
            D_LOCAL = Math.hypot(DX, DY);
        if (D_LOCAL > 0.08) {
            u.moveControlActive = true;
            const RECOVERY_HASTE =
                u.peaRecoveryBoostExpiresAtTick > 0 && u.peaRecoveryBoostExpiresAtTick >= this.simulationTick
                    ? u.peaRecoveryBoostMultiplier
                    : 1;
            u.moveControlVx = (DX / D_LOCAL) * speed2 * RECOVERY_HASTE;
            u.moveControlVy = (DY / D_LOCAL) * speed2 * RECOVERY_HASTE;
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
        const CORRECTION_X = this._contactCorrectionX,
            CORRECTION_Y = this._contactCorrectionY,
            CORRECTION_COUNT = this._contactCorrectionCount,
            ITERATIONS = CONFIG.physics.separationIterations,
            SOFT_FACTOR = 1 - Math.exp((-CONFIG.physics.softSeparationRate * dt) / ITERATIONS);
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
                    const DX = OTHER.x - UNIT_LOCAL.x,
                        DY = OTHER.y - UNIT_LOCAL.y,
                        DISTANCE = Math.hypot(DX, DY),
                        RADIUS = UNIT_LOCAL.radius + OTHER.radius,
                        INVERSE_MASS_B = inverseBodyMass(OTHER),
                        INVERSE_MASS_SUM = INVERSE_MASS_A + INVERSE_MASS_B;
                    if (INVERSE_MASS_SUM <= 0) {
                        continue;
                    }
                    const SOFT =
                            DISTANCE >= RADIUS &&
                            DISTANCE < RADIUS + 0.22 &&
                            UNIT_LOCAL.z < 0.1 &&
                            OTHER.z < 0.1 &&
                            UNIT_LOCAL.ability.phase === 'idle' &&
                            OTHER.ability.phase === 'idle',
                        TARGET_DISTANCE = SOFT ? RADIUS + 0.22 : RADIUS;
                    if (DISTANCE >= TARGET_DISTANCE) {
                        continue;
                    }
                    const ANGLE =
                            ((Math.min(UNIT_LOCAL.id, OTHER.id) * 0.61803398875 +
                                Math.max(UNIT_LOCAL.id, OTHER.id) * 0.38196601125) %
                                1) *
                            Math.PI *
                            2,
                        NORMAL_SIGN = UNIT_LOCAL.id < OTHER.id ? 1 : -1,
                        NORMAL_X = DISTANCE > 1e-6 ? DX / DISTANCE : Math.cos(ANGLE) * NORMAL_SIGN,
                        NORMAL_Y = DISTANCE > 1e-6 ? DY / DISTANCE : Math.sin(ANGLE) * NORMAL_SIGN,
                        RELAXATION = SOFT ? SOFT_FACTOR : CONFIG.physics.separationRelaxation,
                        PENETRATION = (TARGET_DISTANCE - DISTANCE) * RELAXATION,
                        SHARE_A = INVERSE_MASS_A / INVERSE_MASS_SUM,
                        SHARE_B = INVERSE_MASS_B / INVERSE_MASS_SUM;
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
                const UNIT_LOCAL = units[i],
                    COUNT = CORRECTION_COUNT[i];
                if (!COUNT) {
                    continue;
                }
                let deltaX = CORRECTION_X[i] / COUNT,
                    deltaY = CORRECTION_Y[i] / COUNT;
                const LENGTH = Math.hypot(deltaX, deltaY),
                    MAX_CORRECTION = Math.max(0.05, UNIT_LOCAL.radius * 1.25);
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
            this.profiler?.count('physicsSolverIterations');
        }
    }
    separateBossUnitsJacobi(units) {
        const BOSS = this.boss;
        if (!BOSS.active || !units.length) {
            return;
        }
        this._ensureContactSolverBuffers(units.length);
        const CORRECTION_X = this._contactCorrectionX,
            CORRECTION_Y = this._contactCorrectionY,
            CORRECTION_COUNT = this._contactCorrectionCount;
        CORRECTION_X.fill(0, 0, units.length);
        CORRECTION_Y.fill(0, 0, units.length);
        CORRECTION_COUNT.fill(0, 0, units.length);
        let correctionCount = 0;
        for (let i = 0; i < units.length; i++) {
            const UNIT_LOCAL = units[i];
            if (
                !areOpposingFactions(UNIT_LOCAL, BOSS) ||
                UNIT_LOCAL.hp <= 0 ||
                !UNIT_LOCAL.dropLanded ||
                UNIT_LOCAL.z > BOSS.height ||
                inverseBodyMass(UNIT_LOCAL) <= 0
            ) {
                continue;
            }
            const DX = UNIT_LOCAL.x - BOSS.x,
                DY = UNIT_LOCAL.y - BOSS.y,
                DISTANCE = Math.hypot(DX, DY),
                RADIUS = BOSS.radius + UNIT_LOCAL.radius;
            if (DISTANCE >= RADIUS) {
                continue;
            }
            const ANGLE = DISTANCE > 1e-6 ? 0 : UNIT_LOCAL.seed,
                NORMAL_X = DISTANCE > 1e-6 ? DX / DISTANCE : Math.cos(ANGLE),
                NORMAL_Y = DISTANCE > 1e-6 ? DY / DISTANCE : Math.sin(ANGLE),
                INDEX = this._unitStepOrder.get(UNIT_LOCAL),
                OVERLAP = RADIUS - DISTANCE,
                INWARD = UNIT_LOCAL.vx * NORMAL_X + UNIT_LOCAL.vy * NORMAL_Y;
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
            const UNIT_LOCAL = units[i],
                COUNT = CORRECTION_COUNT[i];
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
        this.profiler?.count('physicsSolverIterations');
    }
    _pushRaidPair(first, second, opposing) {
        const COUNT = this._raidPairCount;
        if (COUNT >= this._raidPairA.length) {
            const CAPACITY = Math.max(256, this._raidPairA.length * 2),
                A = new Int32Array(CAPACITY),
                B = new Int32Array(CAPACITY),
                O = new Uint8Array(CAPACITY);
            A.set(this._raidPairA);
            B.set(this._raidPairB);
            O.set(this._raidPairOpposing);
            this._raidPairA = A;
            this._raidPairB = B;
            this._raidPairOpposing = O;
        }
        this._raidPairA[COUNT] = first;
        this._raidPairB[COUNT] = second;
        this._raidPairOpposing[COUNT] = opposing ? 1 : 0;
        this._raidPairCount = COUNT + 1;
    }
    // One spatial pass per tick. The pair list is ordered by (first, second) step order, so the
    // accumulation order below is deterministic and identical on every peer.
    // Radius, height and mass are derived getters; read them once per tick instead of per pair.
    _cacheRaidBodies(units) {
        if (this._raidRadius.length < units.length) {
            const CAPACITY = Math.max(units.length, this._raidRadius.length * 2, 16);
            this._raidRadius = new Float64Array(CAPACITY);
            this._raidHeight = new Float64Array(CAPACITY);
            this._raidInverseMass = new Float64Array(CAPACITY);
        }
        for (let i = 0; i < units.length; i++) {
            const UNIT_LOCAL = units[i];
            this._raidRadius[i] = UNIT_LOCAL.radius;
            this._raidHeight[i] = UNIT_LOCAL.height;
            this._raidInverseMass[i] = inverseBodyMass(UNIT_LOCAL);
        }
    }
    _collectRaidPairs(units) {
        this._raidPairCount = 0;
        this._cacheRaidBodies(units);
        const RADIUS = this._raidRadius,
            HEIGHT = this._raidHeight;
        const MARGIN = CONFIG.physics.raidNeighborMargin,
            RESERVED = this.unitCollection.reservations.size > 0;
        for (let i = 0; i < units.length; i++) {
            const UNIT_LOCAL = units[i];
            if (UNIT_LOCAL.hp <= 0 || !UNIT_LOCAL.dropLanded || (RESERVED && this.isMergeTaskMaterial(UNIT_LOCAL))) {
                continue;
            }
            const QUERY_RADIUS = RADIUS[i] + CONFIG.unit.maxRadius + MARGIN,
                PENDING = this._contactPending;
            this.unitSpatial.queryAABB(
                UNIT_LOCAL.x - QUERY_RADIUS,
                UNIT_LOCAL.y - QUERY_RADIUS,
                UNIT_LOCAL.x + QUERY_RADIUS,
                UNIT_LOCAL.y + QUERY_RADIUS,
                this._contactQuery,
            );
            PENDING.length = 0;
            // Filter before sorting: only real neighbors are ordered, not every grid candidate.
            for (const OTHER of this._contactQuery) {
                const J = this._unitStepOrder.get(OTHER);
                if (
                    J === undefined ||
                    J <= i ||
                    OTHER.hp <= 0 ||
                    !OTHER.dropLanded ||
                    (RESERVED && this.isMergeTaskMaterial(OTHER))
                ) {
                    continue;
                }
                if (UNIT_LOCAL.z > OTHER.z + HEIGHT[J] || OTHER.z > UNIT_LOCAL.z + HEIGHT[i]) {
                    continue;
                }
                const REACH = RADIUS[i] + RADIUS[J] + MARGIN,
                    DX = OTHER.x - UNIT_LOCAL.x,
                    DY = OTHER.y - UNIT_LOCAL.y;
                if (DX * DX + DY * DY < REACH * REACH) {
                    PENDING.push(J);
                }
            }
            PENDING.sort((a, b) => a - b);
            for (const J of PENDING) {
                this._pushRaidPair(i, J, areOpposingFactions(UNIT_LOCAL, units[J]));
            }
        }
    }
    raidContacts(units) {
        this._collectRaidPairs(units);
        // Bump impulses and stuns only apply between opposing sides. Allies just separate.
        for (let p = 0; p < this._raidPairCount; p++) {
            if (this._raidPairOpposing[p] && contact(units[this._raidPairA[p]], units[this._raidPairB[p]])) {
                this.metrics.contacts++;
            }
        }
        this.solveRaidSeparations(units);
    }
    solveRaidSeparations(units) {
        const COUNT = this._raidPairCount;
        if (!COUNT) {
            return;
        }
        this._ensureContactSolverBuffers(units.length);
        if (this._raidMoved.length < units.length) {
            this._raidMoved = new Uint8Array(this._contactCorrectionX.length);
        }
        const CORRECTION_X = this._contactCorrectionX,
            CORRECTION_Y = this._contactCorrectionY,
            CORRECTION_COUNT = this._contactCorrectionCount,
            MOVED = this._raidMoved,
            PAIR_A = this._raidPairA,
            PAIR_B = this._raidPairB,
            PAIR_OPPOSING = this._raidPairOpposing,
            RADIUS = this._raidRadius,
            INVERSE_MASS = this._raidInverseMass,
            ITERATIONS = CONFIG.physics.raidSeparationIterations,
            RELAXATION = CONFIG.physics.separationRelaxation,
            ALLY_SCALE = 1 - CONFIG.physics.raidAllyOverlap;
        MOVED.fill(0, 0, units.length);
        for (let iteration = 0; iteration < ITERATIONS; iteration++) {
            CORRECTION_X.fill(0, 0, units.length);
            CORRECTION_Y.fill(0, 0, units.length);
            CORRECTION_COUNT.fill(0, 0, units.length);
            let correctionCount = 0;
            for (let p = 0; p < COUNT; p++) {
                const I = PAIR_A[p],
                    J = PAIR_B[p],
                    UNIT_LOCAL = units[I],
                    OTHER = units[J],
                    INVERSE_MASS_A = INVERSE_MASS[I],
                    INVERSE_MASS_B = INVERSE_MASS[J],
                    INVERSE_MASS_SUM = INVERSE_MASS_A + INVERSE_MASS_B;
                if (INVERSE_MASS_SUM <= 0) {
                    continue;
                }
                const DX = OTHER.x - UNIT_LOCAL.x,
                    DY = OTHER.y - UNIT_LOCAL.y,
                    DISTANCE = Math.hypot(DX, DY),
                    TARGET_DISTANCE = (RADIUS[I] + RADIUS[J]) * (PAIR_OPPOSING[p] ? 1 : ALLY_SCALE);
                if (DISTANCE >= TARGET_DISTANCE) {
                    continue;
                }
                const ANGLE =
                        ((Math.min(UNIT_LOCAL.id, OTHER.id) * 0.61803398875 +
                            Math.max(UNIT_LOCAL.id, OTHER.id) * 0.38196601125) %
                            1) *
                        Math.PI *
                        2,
                    NORMAL_SIGN = UNIT_LOCAL.id < OTHER.id ? 1 : -1,
                    NORMAL_X = DISTANCE > 1e-6 ? DX / DISTANCE : Math.cos(ANGLE) * NORMAL_SIGN,
                    NORMAL_Y = DISTANCE > 1e-6 ? DY / DISTANCE : Math.sin(ANGLE) * NORMAL_SIGN,
                    PENETRATION = (TARGET_DISTANCE - DISTANCE) * RELAXATION,
                    SHARE_A = INVERSE_MASS_A / INVERSE_MASS_SUM,
                    SHARE_B = INVERSE_MASS_B / INVERSE_MASS_SUM;
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
                const UNIT_LOCAL = units[i],
                    COUNT_LOCAL = CORRECTION_COUNT[i];
                if (!COUNT_LOCAL) {
                    continue;
                }
                let deltaX = CORRECTION_X[i] / COUNT_LOCAL,
                    deltaY = CORRECTION_Y[i] / COUNT_LOCAL;
                const LENGTH = Math.hypot(deltaX, deltaY),
                    MAX_CORRECTION = Math.max(0.05, RADIUS[i] * 1.25);
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
            this.profiler?.count('physicsSolverIterations');
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
            const UNIT_LOCAL = units[i],
                PENDING = this._collectContactOrders(UNIT_LOCAL, i + 1, units.length - 1, this._contactPending);
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
            const UNIT_LOCAL = units[i],
                PENDING = this._collectContactOrders(UNIT_LOCAL, i + 1, units.length - 1, this._contactPending);
            if (this.isMergeTaskMaterial(UNIT_LOCAL)) {
                continue;
            }
            for (const J of PENDING) {
                const OTHER = units[J];
                if (this.isMergeTaskMaterial(OTHER)) {
                    continue;
                }
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
        this.steer(u, u.x + moveX / moveLength, u.y + moveY / moveLength, dt, scaleMoveSpeed(1.3, u));
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
                if (!this._isCurrentGroundedFood(FOOD)) {
                    continue;
                }
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
                nearestOrder = Infinity;
                for (const FOOD of this._groundedFoods) {
                    if (!this._isCurrentGroundedFood(FOOD)) {
                        continue;
                    }
                    const DISTANCE = Math.hypot(FOOD.x - x, FOOD.y - y),
                        ORDER = this._foodOrder.get(FOOD) ?? Infinity;
                    if (DISTANCE < nearestDistance || (DISTANCE === nearestDistance && ORDER < nearestOrder)) {
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
        return !!food && food.phase === 'grounded' && this.foodSpatial.itemCells.has(food);
    }
    _startFoodTargetSearch(unit) {
        const GRID = this.foodSpatial,
            CX = GRID.cellX(unit.x),
            CY = GRID.cellY(unit.y);
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
            phase: 'rings',
            fallbackIndex: 0,
            nearest: null,
            nearestDistance: Infinity,
            nearestOrder: Infinity,
            status: 'searching',
            target: null,
        };
        this._foodSearchStates.set(unit, STATE);
        this._foodSearchScheduler.enqueue({
            key: STATE.key,
            owner: this,
            priority: 1,
            isValid: () =>
                this.scene === 'farm' &&
                this._foodSearchStates.get(unit) === STATE &&
                this._unitById.get(unit.id) === unit &&
                unit.hp > 0 &&
                !unit.fed,
            step: ({ maxUnits }) => this._stepFoodTargetSearch(STATE, maxUnits),
            onComplete: ({ result }) => {
                if (this._foodSearchStates.get(unit) !== STATE) {
                    return;
                }
                if (result && this._isCurrentGroundedFood(result)) {
                    // Candidate selection is advisory until the authoritative tick validates it.
                    STATE.target = result;
                    STATE.status = 'ready';
                    return;
                }
                if (STATE.revision !== this._groundedFoodRevision) {
                    this._foodSearchStates.delete(unit);
                    if (this.scene === 'farm' && this._unitById.get(unit.id) === unit && unit.hp > 0 && !unit.fed) {
                        this._startFoodTargetSearch(unit);
                    }
                    return;
                }
                STATE.status = 'empty';
            },
        });
        return null;
    }
    _stepFoodTargetSearch(state, maxUnits) {
        const GRID = this.foodSpatial,
            SNAPSHOT = state.snapshot;
        let unitsUsed = 0;
        while (true) {
            if (state.phase === 'fallback' && state.fallbackIndex >= SNAPSHOT.foods.length) {
                return { done: true, unitsUsed, result: state.nearest };
            }
            if (state.phase === 'rings') {
                const RING_CELLS = state.ring === 0 ? 1 : 8 * state.ring,
                    RING_COMPLETE = state.ringCellIndex >= RING_CELLS && state.bucketIndex >= state.bucket.length;
                if (RING_COMPLETE) {
                    if (
                        state.nearest &&
                        state.nearestDistance <
                            GRID.distanceToOutsideRing(state.x, state.y, state.centerX, state.centerY, state.ring)
                    ) {
                        return { done: true, unitsUsed, result: state.nearest };
                    }
                    if ((2 * state.ring + 1) ** 2 > this._groundedFoodCount) {
                        state.phase = 'fallback';
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
            if (state.phase === 'fallback') {
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
            const RING = state.ring,
                INDEX = state.ringCellIndex++,
                EDGE_COUNT = RING === 0 ? 1 : 2 * (2 * RING + 1);
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
            const CELL_KEY =
                cellX >= 0 && cellY >= 0 && cellX < GRID.cellCount && cellY < GRID.cellCount
                    ? cellY * GRID.cellCount + cellX
                    : -1;
            state.bucket =
                CELL_KEY < 0 ? EMPTY_FOOD_SEARCH_BUCKET : SNAPSHOT.cells.get(CELL_KEY) || EMPTY_FOOD_SEARCH_BUCKET;
            state.bucketIndex = 0;
            this._foodSearchWork.cellVisits++;
            unitsUsed++;
        }
    }
    _considerFoodTarget(state, food) {
        const DISTANCE = Math.hypot(food.x - state.x, food.y - state.y),
            ORDER = this._foodOrder.get(food) ?? Infinity;
        if (DISTANCE < state.nearestDistance || (DISTANCE === state.nearestDistance && ORDER < state.nearestOrder)) {
            state.nearest = food;
            state.nearestDistance = DISTANCE;
            state.nearestOrder = ORDER;
        }
    }
    requestGroundFoodTarget(unit) {
        if (!this._spatialStepActive) {
            this._rebuildFoodSpatialIndex();
        }
        if (
            !unit ||
            this.scene !== 'farm' ||
            unit.hp <= 0 ||
            unit.fed ||
            !this.canFarmPopulationAdvance(unit.species) ||
            !this._groundedFoodCount
        ) {
            this._cancelFoodTargetSearch(unit);
            return null;
        }
        const STATE = this._foodSearchStates.get(unit);
        if (STATE?.status === 'ready' && this._isCurrentGroundedFood(STATE.target)) {
            return STATE.target;
        }
        if (STATE?.status === 'searching') {
            return null;
        }
        if (STATE?.status === 'empty' && STATE.revision === this._foodSearchSnapshot.revision) {
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
        const ARENA = CONFIG[scene].arena,
            RX = ARENA.radiusX - margin,
            RY = ARENA.radiusY - margin,
            K = Math.max(1, Math.hypot(body.x / RX, body.y / RY));
        if (K === 1) {
            return;
        }
        body.x /= K;
        body.y /= K;
        const NX = body.x / (RX * RX),
            NY = body.y / (RY * RY),
            LENGTH = Math.hypot(NX, NY) || 1,
            OUTWARD = ((body.vx || 0) * NX + (body.vy || 0) * NY) / LENGTH;
        if (OUTWARD > 0) {
            body.vx -= (NX / LENGTH) * OUTWARD * 1.3;
            body.vy -= (NY / LENGTH) * OUTWARD * 1.3;
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
                attackKind: cycle?.spec?.kind || abilityProfile(u.species).kind,
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
        if (action?.targetId === 'boss' || !action?.targetId) {
            return this.boss.generation === action?.targetGeneration && areOpposingFactions(unit, this.boss)
                ? this.boss
                : null;
        }
        const TARGET = this._unitForId(action.targetId);
        return TARGET?.generation === action.targetGeneration && TARGET.hp > 0 && areOpposingFactions(unit, TARGET)
            ? TARGET
            : null;
    }
    createAttackContext(
        u,
        { attackMultiplier = null, attackKind = null, strikeIndex = null, area = false, criticalRoll = null } = {},
    ) {
        const SPEC = abilityProfile(u.species),
            ROSTER = this.raidRoster(u.ownerId),
            ATTACKER_STATS = resolveUnitStats(u);
        return {
            source: u,
            sourceKind: hasFaction(u, FACTION_CONFIG.PLAYER) ? 'direct' : 'enemy',
            attackerStats: ATTACKER_STATS,
            damageMultiplier: Number.isFinite(attackMultiplier) ? attackMultiplier : SPEC.skillMultiplier,
            kind: attackKind || SPEC.kind,
            buffed: !!ROSTER && this.time < ROSTER.buffUntil,
            attackPowerMultiplier: u.giantUntil > this.time ? 3 : 1,
            strikeIndex,
            area,
            criticalRoll,
            hitTargets: area ? new Set() : null,
            sourceStatOverrides: {
                critChance: ATTACKER_STATS.critChance,
            },
        };
    }
    unitStatsFor(unit) {
        return resolveUnitStats(unit);
    }
    combatTargetDefense(target) {
        if (target !== this.boss) {
            const TARGET_STATS = resolveUnitStats(target),
                ABILITY_ARMOR = target.ability?.armorModifier?.(this, this.simulationTick) || 0;
            return {
                maxHp: TARGET_STATS.maxHp,
                armor: BarleyArmorShredModel.effectiveArmor(
                    target,
                    TARGET_STATS.armor,
                    (target.giantUntil > this.time ? 100 : 0) + ABILITY_ARMOR,
                    this.simulationTick,
                ),
            };
        }
        const HP_RATIO =
            Number.isFinite(target.hp) && Number.isFinite(target.maxHp) && target.maxHp > 0
                ? CLAMP(target.hp / target.maxHp, 0, 1)
                : 1;
        return {
            maxHp: target.maxHp,
            armor: BarleyArmorShredModel.effectiveArmor(target, (1 - HP_RATIO) * 100, 0, this.simulationTick),
        };
    }
    damageCombatTarget(u, action, target, point, options = {}) {
        return this.mutateUnits(this._damageCombatTarget, u, action, target, point, options);
    }
    _damageCombatTarget(u, action, target, point, options = {}) {
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
            CRITICAL_BONUS =
                KIND === abilityProfile(SOURCE.species).kind
                    ? this.riceCriticalChanceBonus(SOURCE, target.hp, DEFENSE.maxHp)
                    : 0,
            SOURCE_STAT_OVERRIDES = {
                ...CONTEXT.sourceStatOverrides,
                critChance: CLAMP(ATTACKER_STATS.critChance + CRITICAL_BONUS, 0, 1),
            };
        const RAW_BASE_DAMAGE =
                ATTACKER_STATS.attackPower *
                (CONTEXT.attackPowerMultiplier ?? (SOURCE.giantUntil > this.time ? 3 : 1)) *
                DAMAGE_MULTIPLIER *
                (BUFFED ? CONFIG.raid.buff.damage : 1),
            RAW_DAMAGE = RAW_BASE_DAMAGE + (SOURCE.ability?.rawDamageBonus?.(this, action, KIND) || 0);
        // The context belongs to one attack, so a mixed boss/unit area hit shares
        // one lazy roll while each target retains its own armor and actual HP loss.
        const DAMAGE = applyDamageToTargets(SOURCE, [target], {
            rawDamage: RAW_DAMAGE,
            area: CONTEXT.area,
            sourceKind: CONTEXT.sourceKind,
            sourceStatOverrides: SOURCE_STAT_OVERRIDES,
            armorForTarget: () => DEFENSE.armor,
            roll: () => CONTEXT.criticalRoll ?? (CONTEXT.criticalRoll = this.random()),
        });
        if (!IS_BOSS) {
            const CRITICAL_RAW_DAMAGE =
                RAW_DAMAGE *
                (DAMAGE.critical ? (SOURCE_STAT_OVERRIDES.critMultiplier ?? ATTACKER_STATS.critMultiplier ?? 1) : 1);
            target.ability?.receiveRawDamage?.(this, CRITICAL_RAW_DAMAGE, SOURCE, action);
        }
        if (!IS_BOSS) {
            this._syncUnitAliveCount(target);
        }
        this.onCombatResolved.emit({
            excluded: SOURCE.isFormationClone,
            damageDealt:
                SOURCE.faction === 'player'
                    ? DAMAGE.totalActualLoss /
                      ((SOURCE.giantUntil > this.time ? 3 : 1) * (BUFFED ? CONFIG.raid.buff.damage : 1))
                    : 0,
            damageTaken: target.faction === 'player' && !target.isFormationClone ? DAMAGE.totalActualLoss : 0,
            hits: SOURCE.faction === 'player' ? 1 : 0,
            critHits: SOURCE.faction === 'player' && DAMAGE.critical ? 1 : 0,
        });
        this.applyGrainOnBasicHit(SOURCE, target, KIND);
        SOURCE.ability?.afterSuccessfulAttack?.(this, action, target, DAMAGE);
        const STRENGTH =
            DAMAGE_MULTIPLIER *
            (BUFFED ? CONFIG.raid.buff.damage : 1) *
            (DAMAGE.critical ? ATTACKER_STATS.critMultiplier : 1);
        if (IS_BOSS) {
            this.finishBossHit(SOURCE, action, point, CONTEXT, DAMAGE, STRENGTH);
        } else {
            this.finishUnitHit(SOURCE, action, target, point, CONTEXT, DAMAGE, STRENGTH);
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
    finishUnitHit(u, action, target, point, { kind, strikeIndex }, damage, strength) {
        const DX = target.x - u.x,
            DY = target.y - u.y,
            N = Math.hypot(DX, DY) || 1;
        target.knock(DX / N, DY / N, 5, 2.4, u);
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
            critical: !!damage?.critical,
            x: point.x,
            y: point.y,
            z: Math.max(0.15, target.z + 0.25),
            nx: DX / N,
            ny: DY / N,
            strength,
        });
    }
    updateProjectiles(dt) {
        const BATCH = !this._spatialStepActive;
        if (BATCH) {
            this._beginSpatialQueryBatch();
        }
        try {
            for (const PROJECTILE of this.projectiles) {
                const BEHAVIOR = PROJECTILE_BEHAVIORS.forProjectile(PROJECTILE);
                if (!this._spatialStepActive) {
                    BEHAVIOR.advanceLifecycle(this, PROJECTILE, dt);
                }
                if (BEHAVIOR.isAlive(PROJECTILE)) {
                    BEHAVIOR.update(this, PROJECTILE, dt);
                }
            }
            // Preserve the second-pass chain ordering after every flight update.
            for (const PROJECTILE of this.projectiles) {
                PROJECTILE_BEHAVIORS.forProjectile(PROJECTILE).updateChain(this, PROJECTILE);
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
        const ACTIVE_ATTACK = u.specialAbility && u.specialAbility.phase !== 'idle' ? u.specialAbility : u.ability;
        if (ACTIVE_ATTACK.update(this, dt) || u.stun > 0 || u.z > 0.1 || u.landingRecovery > 0) {
            return;
        }
        if (u.ability.isGuarding?.(this.simulationTick)) {
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
                  generation: B_LOCAL.generation,
                  x: B_LOCAL.x,
                  y: B_LOCAL.y,
              }
            : {
                  id: TARGET_ID,
                  generation: B_LOCAL.generation,
                  x: B_LOCAL.x + (DX / N) * (B_LOCAL.radius + u.radius - 0.16),
                  y: B_LOCAL.y + (DY / N) * (B_LOCAL.radius + u.radius - 0.16),
              };
        const SPECIAL_ABILITY = u.specialAbility;
        if (
            SPECIAL_ABILITY?.canBegin?.(this) &&
            N <= B_LOCAL.radius + SPECIAL_ABILITY.spec.range + (u.tier - 1) * 0.12
        ) {
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
            bossPatternElapsed: BOSS_PATTERN_ELAPSED,
        });
    }
    finishFarmBossEvent(outcome) {
        return this.mutateUnits(this._finishFarmBossEvent, outcome);
    }
    _finishFarmBossEvent(outcome) {
        if (this.scene !== 'farm' || this.farmBossEvent.phase !== 'fighting') {
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
            U.specialAbility?.interrupt();
            this.clearPeaRecoveryBoost(U);
            if (U.hp > 0) {
                U.ability.interrupt();
            }
        }
        if (outcome === 'victory') {
            const EVENT_STAGE = this.boss.stage,
                STAGE_STATS = bossStageStats(EVENT_STAGE);
            const SETTLEMENT = settleBossKill(this, {
                encounterId: ENCOUNTER_ID,
                source: 'farm',
                stage: EVENT_STAGE,
                species: this.boss.species,
                tier: 1,
                x: this.boss.x,
                y: this.boss.y,
                rollBudget: STAGE_STATS.rollBudget,
                xpAmount: STAGE_STATS.xp,
            });
            this.playerProgression.farmBossEventStage = Math.min(EVENT_STAGE + 1, BOSS_REWARD_SETTINGS.maxStage);
            const REWARD = SETTLEMENT.receipt;
            this.combat('farm-boss-xp', {
                encounterId: ENCOUNTER_ID,
                xp: SETTLEMENT.xpAwarded,
                levelsGained: SETTLEMENT.levelsGained,
                pointsAwarded: SETTLEMENT.pointsAwarded,
            });
            this.combat('farm-boss-reward', {
                acquired: REWARD.grantedCount > 0,
                pending: REWARD.status === 'pending',
                successCount: REWARD.successCount,
                grantedCount: REWARD.grantedCount,
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
        return BOSS_BEHAVIORS.weaponPoint(this.boss, q);
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
        const BEHAVIOR = BOSS_BEHAVIORS.forId(id);
        return BEHAVIOR ? BEHAVIOR.target(this, living) : this.nearestBossTarget(living, true);
    }
    eligibleBossPatterns(living, targets = this.bossPatternTargets(living)) {
        const RUNTIME = this.boss.patternRuntime,
            ALIVE_ADDS = this.units.reduce((n, u) => n + (hasFaction(u, FACTION_CONFIG.ENEMY) && u.hp > 0 ? 1 : 0), 0),
            ELIGIBLE = [];
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
        return this.mutateUnits(this._hitBossPatternUnit, unit, patternId, point, normal);
    }
    _hitBossPatternUnit(unit, patternId, point, normal = null) {
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
        const RECEIVED = applyDamageToTargets(null, [unit], {
            armorForTarget: () => this.combatTargetDefense(unit).armor,
            rawDamage: B_LOCAL.attackPower * CONFIG_LOCAL.damageMultiplier * (GUARD?.receivedDamageMultiplier ?? 1),
            sourceKind: 'enemy',
        });
        this.onCombatResolved.emit({ damageTaken: RECEIVED.totalActualLoss, excluded: unit.isFormationClone });
        this._syncUnitAliveCount(unit);
        if (unit.hp === 0) {
            unit.down = unit.isBattleOnlySummon ? 0 : CONFIG.unit.corpseRecoverySeconds;
            this.handleUnitDeath(unit);
        }
        this.metrics.directHits++;
        this.metrics[BOSS_BEHAVIORS.forId(patternId).hitMetric]++;
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
                    BOSS_BEHAVIORS.forId(patternId).sweepNormal(B_LOCAL),
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
    sweepBossWeapon(action, q0, q1) {
        const CONFIG_LOCAL = BOSS_PATTERN_CONFIG[action.id],
            START_ANGLE = action.startAngle ?? action.aim - Math.PI / 2,
            FROM_ANGLE = START_ANGLE + Math.PI * 2 * CLAMP(q0, 0, 1),
            TO_ANGLE = START_ANGLE + Math.PI * 2 * CLAMP(q1, 0, 1),
            B_LOCAL = this.boss,
            FROM = {
                x: B_LOCAL.x + Math.cos(FROM_ANGLE) * CONFIG_LOCAL.reach,
                y: B_LOCAL.y + Math.sin(FROM_ANGLE) * CONFIG_LOCAL.reach,
                z: 0.2,
            },
            TO = {
                x: B_LOCAL.x + Math.cos(TO_ANGLE) * CONFIG_LOCAL.reach,
                y: B_LOCAL.y + Math.sin(TO_ANGLE) * CONFIG_LOCAL.reach,
                z: 0.2,
            },
            EXTENT = CONFIG_LOCAL.reach + CONFIG_LOCAL.width + CONFIG.unit.maxRadius;
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
            if (!HIT) {
                continue;
            }
            const DX = UNIT_LOCAL.x - B_LOCAL.x,
                DY = UNIT_LOCAL.y - B_LOCAL.y,
                N = Math.hypot(DX, DY) || 1;
            this.hitBossPatternUnit(UNIT_LOCAL, action.id, HIT, {
                x: DX / N,
                y: DY / N,
            });
        }
    }
    bossMouthPoint(released) {
        return bossMouthWorldPoint(this.boss, released);
    }
    bossSummonLanding(angle, action = null) {
        const B_LOCAL = this.boss,
            SCENE = this.scene,
            RADIUS = unitBodyRadius({ species: B_LOCAL.species, tier: 1, growthElapsed: 1, growthDuration: 1 });
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
        return this.mutateUnits(this._spawnBossMouthUnit, action);
    }
    _spawnBossMouthUnit(action) {
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
            battleSummonParentGeneration: 0,
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
        this.addUnit(UNIT_LOCAL, { markProgress: false });
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
        BOSS_BEHAVIORS.forId(action.id).activate(this, action);
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
                const BEHAVIOR = BOSS_BEHAVIORS.forId(SELECTED),
                    PICK = BEHAVIOR.selectedTarget(this, TARGETS, TARGET);
                this.beginBossPattern(SELECTED, PICK);
                action = RUNTIME.active;
                BEHAVIOR.selected(this);
            } else {
                if (TARGET) {
                    const DX = TARGET.x - B_LOCAL.x,
                        DY = TARGET.y - B_LOCAL.y,
                        D_LOCAL = Math.hypot(DX, DY) || 1;
                    B_LOCAL.angle = B_LOCAL.facing = Math.atan2(DY, DX);
                    const CONTACT = B_LOCAL.radius + TARGET.radius + 0.2;
                    if (D_LOCAL > CONTACT) {
                        const SPEED = Math.min(B_LOCAL.moveSpeed, (D_LOCAL - CONTACT) / dt);
                        B_LOCAL.chaseVx = (DX / D_LOCAL) * SPEED;
                        B_LOCAL.chaseVy = (DY / D_LOCAL) * SPEED;
                    }
                }
                return;
            }
        }
        if (!action) {
            return;
        }
        if (action.phase === 'active' && BOSS_BEHAVIORS.forId(action.id).physicalActive) {
            return;
        }
        action.phaseElapsed += dt;
        BOSS_BEHAVIORS.update(this, action, dt, living);
    }
    integrateBossKnockback(dt) {
        const BOSS = this.boss;
        if (Math.hypot(BOSS.knockVx, BOSS.knockVy) < 1e-6) {
            return;
        }
        BOSS.x += BOSS.knockVx * dt;
        BOSS.y += BOSS.knockVy * dt;
        const RX = CONFIG.raid.arena.radiusX - BOSS.radius,
            RY = CONFIG.raid.arena.radiusY - BOSS.radius,
            EDGE = Math.hypot(BOSS.x / RX, BOSS.y / RY);
        if (EDGE > 1) {
            BOSS.x /= EDGE;
            BOSS.y /= EDGE;
        }
        BOSS.knockVx *= Math.exp(-dt * 6);
        BOSS.knockVy *= Math.exp(-dt * 6);
    }
    integrateBossMotion(dt) {
        const BOSS = this.boss;
        if (!BOSS.active) {
            return;
        }
        this.integrateBossKnockback(dt);
        if (BOSS.stun > 0) {
            return;
        }
        const ACTION = BOSS.patternRuntime.active;
        if (ACTION?.phase === 'active' && BOSS_BEHAVIORS.forId(ACTION.id).physicalActive) {
            const DELAY = Math.min(dt, ACTION.motionDelay || 0);
            ACTION.motionDelay = Math.max(0, (ACTION.motionDelay || 0) - DELAY);
            const ACTIVE_DT = dt - DELAY;
            if (ACTIVE_DT > 0) {
                ACTION.phaseElapsed += ACTIVE_DT;
                BOSS_BEHAVIORS.forId(ACTION.id).updateActive(this, ACTION, ACTIVE_DT);
            }
        } else if (!ACTION) {
            const X = BOSS.x,
                Y = BOSS.y;
            BOSS.x += (BOSS.chaseVx || 0) * dt;
            BOSS.y += (BOSS.chaseVy || 0) * dt;
            this.boundBody(BOSS, this.scene, BOSS.radius + 0.25);
            BOSS.travel += Math.hypot(BOSS.x - X, BOSS.y - Y);
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
