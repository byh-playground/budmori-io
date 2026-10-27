import { advanceChestnutAttacks } from '../features/species-growth/chestnut-attack.js';
import { applyOffline } from '../save/farm-offline.js';
import { assignWorkers, resetWork, stepWork, workOrder, workersBySpecies } from './farm-work.js';
import { FormationSkills } from '../formation/formation-skills.js';
import { createFormationRuntime, FORMATION_SKILL_DEFINITIONS } from '../formation/formation-skill-state.js';
import { Signal } from '../core/signal.js';
import {
    unitVisualSize,
    unitVectorScale,
    unitBodyRadius,
    unitBodyHeight,
    bossBodyHeight,
    bossBodyRadius,
    bossTorsoHeight,
    unitTorsoHeight,
} from '../features/unit-body/definition.js';
import { seedProjectileDimensions } from '../features/projectiles/seed/definition.js';
import { MutationNotifications } from '../core/mutation-notifications.js';
import { UnitCollection } from './unit-collection.js';
import { FarmingRoster } from './farm-roster.js';
import {
    SEED_FEEDS,
    SEED_FEED_COOLDOWN_SECONDS,
    SEED_SPECIES,
    RECIPES,
    inheritGenes,
    inheritTemperament,
    lineageRandom,
    TEMPERAMENT_PASSIVE_IDS,
    elementDamageTaken,
    elementHitScale,
    elementMultiplier,
    TEMPERAMENT_TILTS,
    rollSeedGenes,
    recipeFor,
    rollTemperament,
    elementOf,
    ELEMENT_COUNT,
    TEMPERAMENT_COUNT,
} from './lineage.js';
import { createSimulationScenes } from './simulation-scenes.js';
import { createProjectileBehaviors } from './projectile-behaviors.js';
import { createFarmBossEventPhases } from '../features/scenes/farm/boss-event-phases.js';
import { createFarmModeBehaviors } from './farm-mode-behaviors.js';
import { bossMouthWorldPoint } from '../render/boss-vector-sockets.js';
import { BarleyArmorShredModel, createBarleyArmorShredBuckets } from '../features/abilities/barley-shred/model.js';
import { CornAttachmentModel } from '../features/abilities/corn-attachment/model.js';
const { SeededPRNG: SEEDED_PRNG } = globalThis.BloomGamekitDeterministic;
const { createBudgetedScheduler: CREATE_BUDGETED_SCHEDULER } = globalThis.BloomGamekitWorkScheduler;
const EMPTY_FOOD_SEARCH_BUCKET = Object.freeze([]);
import {
    baseUnitStatsFor,
    resolveUnitStats,
    applyRunGrowthHealth,
    unitMaxHpFor,
    setRunStatMods,
    applyDamageToTargets,
    applyHealing,
    resolveStatusDuration,
    resolveKnockback,
    resolveCritical,
    scaleMoveSpeed,
    scaleAttackArea,
} from '../units/unit-stats.js';
import {
    UNIT_ABILITY_PROFILES as ATTACK_TYPES,
    abilityProfile,
    unitCapabilityComposition,
} from '../units/unit-abilities.js';
import {
    BOSS_REWARD_SETTINGS,
    bossAcquisitionChance,
    bossStageStats,
    settleBossKill,
    bossSpeciesOwned,
    grantPendingBossAcquisitions,
    advanceBossRewardCalculations,
    createBossRewardStreams,
} from '../boss/boss-rewards.js';
import {
    PASSIVE_CARDS,
    passiveCard,
    PASSIVE_SETTINGS,
    TOWER_EVENTS,
    advanceSince,
    freshTowerRun,
    rollCardOffers,
    rollEventOffers,
    passiveTotals,
    rollFloorKind,
    runStatModifiers,
    drawBossCard,
    applyTowerCard,
} from '../tower/tower-run.js';
import {
    createPlayerProgressionState,
    farmCapacityForProgression,
    highestTowerStartFloor,
    beginTowerRewardRun,
    awardTowerFloorXp,
} from './player-progression.js';
import { towerElement } from '../tower/tower-theme.js';
import { BOSS_SPECIES } from '../units/species-catalog.js';
import { createTowerEncounter, encounterBudget, TOWER_ENCOUNTER_SETTINGS } from '../tower/tower-encounter.js';
import { createAbilityProgressionState } from '../abilities/ability-state.js';
import { bossVectorScale } from '../vector-sockets.js';
import { purchaseAbilityNode, resetPlayerProgression } from '../abilities/ability-progression.js';
import { mergeMaterialCostForTier } from '../units/unit-grades.js';
import {
    BOSS_PATTERN_IDS,
    BOSS_HIT_SPLIT,
    BOSS_PATTERN_CONFIG,
    createBossPatternRuntime,
    bossAttackTotal,
    BOSS_BASIC_ID,
    BOSS_ENRAGE,
    BOSS_PHASE_THRESHOLDS,
} from '../boss/boss-patterns.js';
import { FACTION_CONFIG, hasFaction, areOpposingFactions } from '../core/factions.js';
import { FixedSpatialGrid } from '../core/spatial-grid.js';
import { scatterDestination } from './army-scatter.js';
import {
    BREED_RESERVATION_OWNER,
    MERGE_RESERVATION_OWNER,
    CONFIG,
    CLAMP,
    STATS,
    MUTABLE_STATS,
} from './farm-config.js';
import { bossAttackArea, BOSS_BEHAVIORS } from '../boss/boss-behaviors.js';
import { ARENA_GEOMETRY, BALLISTICS } from './arena-geometry.js';
import { AttackCycle, CREATE_UNIT_ATTACK_CYCLE } from '../units/attack-cycle.js';
import { BossController } from '../boss/boss-controller.js';
// Bosses reuse the neutral, tier-one species kit, never the player's investments.
const BOSS_ATTACK_PROGRESSION = createAbilityProgressionState();
for (const BUILD of Object.values(BOSS_ATTACK_PROGRESSION.abilities)) {
    Object.freeze(BUILD.nodeRanks);
    Object.freeze(BUILD.branchLevels);
    Object.freeze(BUILD);
}
Object.freeze(BOSS_ATTACK_PROGRESSION.abilities);
Object.freeze(BOSS_ATTACK_PROGRESSION);
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

const FARM_BOSS_PHASES = createFarmBossEventPhases(CONFIG);
const PROJECTILE_BEHAVIORS = createProjectileBehaviors({ Ballistics: BALLISTICS, ArenaGeometry: ARENA_GEOMETRY });
const FARM_MODES = createFarmModeBehaviors(CONFIG);

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
            if (this.controller) {
                this.controller.knock(...args);
            } else {
                super.knock(...args);
            }
            if (SOURCE && areOpposingFactions(SOURCE, this)) {
                this.peaRecoveryPending = true;
                if (this.species === 0) {
                    this.peaCounterPending = true;
                    this.peaCounterExpiresAtTick = 0;
                }
            }
        }
        // A unit that is walking to a place keeps the speed it was told to walk at: drag is for bodies that are thrown.
        dragRate() {
            return this.moveControlActive && this.stun <= 0 && this.down <= 0 && this.z <= 0.04 ? 0 : super.dragRate();
        }
        integrate(dt) {
            if (this.controller?.integrate(this._world, dt)) {
                return;
            }
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
// Mature peanut geometry is a pure function of its valid tier: authored body
// metadata and size configuration are frozen. Preserve the original arithmetic
// and apply the live giant scale only in the getters, never in this table.
const PEANUT_MATURE_GEOMETRY = Object.freeze(
    Array.from({ length: 6 }, (_, index) => {
        const UNIT_LOCAL = { species: 4, tier: index + 1, growthElapsed: 1, growthDuration: 1 };
        return Object.freeze({ radius: unitBodyRadius(UNIT_LOCAL), height: unitBodyHeight(UNIT_LOCAL) });
    }),
);
function peanutMatureGeometry(unit) {
    return unit.species === 4 && unit.mature && Number.isInteger(unit.tier) && unit.tier >= 1 && unit.tier <= 6
        ? PEANUT_MATURE_GEOMETRY[unit.tier - 1]
        : null;
}
// Walnut-only mature geometry uses the same pure authored formulas. Keep the
// peanut cache separate and leave live giant scaling in the getters below.
const WALNUT_MATURE_GEOMETRY = Object.freeze(
    Array.from({ length: 6 }, (_, index) => {
        const UNIT_LOCAL = { species: 5, tier: index + 1, growthElapsed: 1, growthDuration: 1 };
        return Object.freeze({ radius: unitBodyRadius(UNIT_LOCAL), height: unitBodyHeight(UNIT_LOCAL) });
    }),
);
function walnutMatureGeometry(unit) {
    return unit.species === 5 && unit.mature && Number.isInteger(unit.tier) && unit.tier >= 1 && unit.tier <= 6
        ? WALNUT_MATURE_GEOMETRY[unit.tier - 1]
        : null;
}

function initializeFarmLifecycle(unit, x, y) {
    Object.assign(unit, {
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
    });
}
const UNIT = class Unit extends ATTACKING_BODY(KNOCKABLE(BODY)) {
    constructor(
        id,
        species,
        tier,
        x,
        y,
        { statProfile = null, bodyProfile = null, attackMotionProfile = null, controller = null } = {},
    ) {
        super(x, y);
        Object.assign(this, {
            id,
            statProfile,
            statModifiers: {},
            bodyProfile,
            attackMotionProfile,
            generation: 0,
            species,
            tier,
            permanentStatMultiplier: 1,
            growthMaxHpMultiplier: 1,
            temperament: 0,
            genes: [0, 0],
            seedling: null,
            faction: FACTION_CONFIG.PLAYER,
            hp: statProfile?.maxHp ?? STATS(tier, species).maxHp,
            down: 0,
            seed: typeof id === 'number' ? id * 2.39996 : 0,
            scatterAttackCount: 0,
            ownerId: '',
            farmId: 0,
            dropLanded: true,
            isBattleOnlySummon: false,
            battleSummonKind: '',
            battleSummonParentId: 0,
            battleSummonParentGeneration: 0,
            peanutInheritedPowerRank: 0,
            peanutInheritedSpeedRank: 0,
            battleSummonEncounterId: 0,
            countsTowardPermanentRoster: true,
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
            peaCounterExpiresAtTick: 0,
            peaCounterPending: false,
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
            barleyArmorShredBuckets: createBarleyArmorShredBuckets(),
            giantUntil: 0,
            giantSizeMultiplier: 3,
            giantEndedAt: -10,
            isFormationClone: false,
            cloneBornAt: -10,
        });
        if (!controller) {
            initializeFarmLifecycle(this, x, y);
        }
        this.controller = controller ? new controller(this) : null;
        this.initializeActions();
        Object.defineProperties(this, {
            onDied: { value: new Signal() },
            onRevived: { value: new Signal() },
            onHealthChanged: { value: new Signal() },
        });
    }
    initializeActions() {
        this.ability = CREATE_UNIT_ATTACK_CYCLE(this);
        this.specialAbility = CREATE_UNIT_ATTACK_CYCLE.createSpecial(this);
    }
    attachWorld(world) {
        Object.defineProperty(this, '_world', { value: world, writable: true, configurable: true });
        for (const SIGNAL of [this.onDied, this.onRevived, this.onHealthChanged]) {
            SIGNAL.scope = world.mutationNotifications;
            SIGNAL.immediate = true;
        }
    }
    notifyHealthCapacity(previousMaxHp) {
        const MAX_HP = this.maxHp;
        if (MAX_HP !== previousMaxHp) {
            this.onHealthChanged.emit({
                unitId: this.id,
                previousHp: this.hp,
                hp: this.hp,
                previousMaxHp,
                maxHp: MAX_HP,
            });
        }
    }
    setBaseStats(values) {
        const PREVIOUS_MAX_HP = this.maxHp;
        this.statProfile = { ...(this.statProfile ?? baseUnitStatsFor(this.tier, this.species)), ...values };
        this.notifyHealthCapacity(PREVIOUS_MAX_HP);
    }
    setStatModifiers(modifiers) {
        const PREVIOUS_MAX_HP = this.maxHp;
        this.statModifiers = structuredClone(modifiers);
        this.notifyHealthCapacity(PREVIOUS_MAX_HP);
    }
    get maxHp() {
        return resolveUnitStats(this).maxHp;
    }
    set maxHp(value) {
        this.setBaseStats({ maxHp: value });
    }
    get attackPower() {
        return resolveUnitStats(this).attackPower;
    }
    set attackPower(value) {
        this.setBaseStats({ attackPower: value });
    }
    get moveSpeed() {
        return resolveUnitStats(this).moveSpeed;
    }
    set moveSpeed(value) {
        this.setBaseStats({ moveSpeed: value });
    }
    setHealth(value) {
        const PREVIOUS = this.hp;
        this.hp = value;
        if (PREVIOUS !== value) {
            this.onHealthChanged.emit({ unitId: this.id, previousHp: PREVIOUS, hp: value });
        }
    }
    die() {
        this.ability?.interrupt();
        this.specialAbility?.interrupt();
        this.barleyArmorShredBuckets = createBarleyArmorShredBuckets();
        this.ability?.resetCombatEffects?.();
        if (this.deathSplitHandled) {
            return false;
        }
        this.deathSplitHandled = true;
        this.onDied.emit({ unitId: this.id, x: this.x, y: this.y, z: this.z });
        return true;
    }
    revive(maxHp) {
        this.barleyArmorShredBuckets = createBarleyArmorShredBuckets();
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
        this.initializeActions();
        this.peaRecoveryPending = false;
        this.peaCounterExpiresAtTick = 0;
        this.peaCounterPending = false;
        this.peaRecoveryBoostExpiresAtTick = 0;
        this.peaRecoveryBoostMultiplier = 0;
        this.onRevived.emit({ unitId: this.id, x: this.x, y: this.y, hp: this.hp });
    }
    dispose() {
        this.ability?.interrupt();
        this.specialAbility?.interrupt();
        this.ability?.resetCombatEffects?.();
        this.onDied.clear();
        this.onRevived.clear();
        this.onHealthChanged.clear();
        this.onDied.scope = this.onRevived.scope = this.onHealthChanged.scope = null;
    }
    get giantScale() {
        return this.giantUntil > (this._world?.time ?? 0) ? (this.giantSizeMultiplier ?? 3) : 1;
    }
    get radius() {
        return (
            (this.bodyProfile?.radius(this) ??
                peanutMatureGeometry(this)?.radius ??
                walnutMatureGeometry(this)?.radius ??
                unitBodyRadius(this)) * this.giantScale
        );
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
        return (this.bodyProfile?.vectorScale?.(this) ?? unitVectorScale(this)) * this.giantScale;
    }
    get attackRangeOffset() {
        return this.bodyProfile ? Math.max(0, this.radius - unitBodyRadius(this)) : 0;
    }
    get attackGeometryScale() {
        return this.bodyProfile ? this.radius / unitBodyRadius(this) : 1;
    }
    get height() {
        return (
            (this.bodyProfile?.height(this) ??
                peanutMatureGeometry(this)?.height ??
                walnutMatureGeometry(this)?.height ??
                unitBodyHeight(this)) * this.giantScale
        );
    }
    get bodyHeight() {
        return (this.bodyProfile?.bodyHeight?.(this) ?? unitTorsoHeight(this)) * this.giantScale;
    }
};
function inverseBodyMass(body) {
    if (body.fixed === true) {
        return 0;
    }
    const MASS = Number.isFinite(body.mass) ? body.mass : 1;
    return MASS > 0 ? 1 / MASS : 0;
}
function contact(
    a,
    b,
    radius = a.radius + b.radius,
    heightA = a.height,
    heightB = b.height,
    massA = null,
    massB = null,
) {
    const DX = b.x - a.x,
        DY = b.y - a.y,
        D_LOCAL = Math.hypot(DX, DY),
        R_LOCAL = radius;
    if (a.z > b.z + heightB || b.z > a.z + heightA) {
        return false;
    }
    if (D_LOCAL >= R_LOCAL) {
        return false;
    }
    const NX = D_LOCAL > 1e-6 ? DX / D_LOCAL : 1,
        NY = D_LOCAL > 1e-6 ? DY / D_LOCAL : 0,
        INVERSE_MASS_A = massA ?? inverseBodyMass(a),
        INVERSE_MASS_B = massB ?? inverseBodyMass(b),
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
// What a group of materials turns into: the same species one tier up, or - for two different species with a recipe -
// the recipe's species at the same tier.
function mergeOutcome(materials) {
    const FIRST = materials[0];
    if (!FIRST) {
        return null;
    }
    if (materials.every((unit) => unit.species === FIRST.species)) {
        return { species: FIRST.species, tier: FIRST.tier + 1, recipe: null };
    }
    const RECIPE = materials.length === 2 ? recipeFor(materials[0].species, materials[1].species) : null;
    return RECIPE ? { species: RECIPE.result, tier: FIRST.tier, recipe: RECIPE } : null;
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
        this._armyThreats = [];
        this._armyThreatTick = -1;
        this._armySpacingTick = -1;
        this._armySpacingRadius = 0;
        this._armySpacingNeighbors = [];
        this._armySpacingRadii = new Map();
        this._armyAttackTurns = new Set();
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
            '_battlePairA',
            '_battlePairB',
            '_battlePairOpposing',
            '_battlePairCount',
            '_battleMoved',
            '_battleRadius',
            '_battleHeight',
            '_battleInverseMass',
            '_bossGridUnits',
            '_bossGroundUnits',
            '_bossQueryCandidates',
            '_bossHitCandidates',
            '_armyThreats',
            '_armyThreatTick',
            '_armySpacingTick',
            '_armySpacingRadius',
            '_armySpacingNeighbors',
            '_armySpacingRadii',
            '_armyAttackTurns',
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
                get: () => (this._benched?.size ? this._fieldUnits() : this.unitCollection.items),
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
            if (TASK === excludedTask || TASK.phase !== 'approach') {
                continue;
            }
            if (TASK.partnerSpecies < 0) {
                cost += TASK.sourceSpecies === species ? TASK.materialIds.length - 1 : 0;
            } else if (TASK.sourceSpecies === species || TASK.partnerSpecies === species) {
                cost += 1;
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
        if (this.isBoss(unit)) {
            return;
        }
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
    get boss() {
        return this.bosses?.find((boss) => boss.active && boss.hp > 0) || this.bosses?.[0];
    }
    isBoss(unit) {
        return !!unit && this.bosses?.includes(unit);
    }
    replaceBosses(bosses) {
        for (const BOSS of this.bosses || []) {
            if (!bosses.includes(BOSS)) {
                BOSS.dispose();
            }
        }
        this.bosses = bosses;
    }
    combatUnits({ includeInactive = false } = {}) {
        return [...this.bosses.filter((boss) => includeInactive || (boss.active && boss.hp > 0)), ...this.units];
    }
    _unitForId(id) {
        const BOSS = this.bosses.find((boss) => boss.id === id);
        if (BOSS) {
            return BOSS;
        }
        // Outside a controlled step/batch, public callers may have replaced units
        // or edited their IDs directly. Rebuild rather than trusting a dirty bit.
        if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._rebuildUnitSpatialIndex(this.units);
        }
        return this._unitById.get(id);
    }
    _unitIsActive(unit) {
        return this.isBoss(unit) ? unit.active && unit.hp > 0 : this._unitById.get(unit?.id) === unit;
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
    _collectContactOrders(unit, minimumOrder, maximumOrder, out, queryRadius = null, bodyOrder = null, contactGap = 0) {
        const GAP = this.tower.active && this.battleCommand === 'scatter' ? CONFIG.farm.deploy.scatterGap : 0.22,
            RADIUS = queryRadius ?? unit.radius + CONFIG.unit.maxRadius + GAP;
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
                if (bodyOrder !== null) {
                    if (
                        unit.z > CANDIDATE.z + this._battleHeight[ORDER] ||
                        CANDIDATE.z > unit.z + this._battleHeight[bodyOrder]
                    ) {
                        continue;
                    }
                    const DX = CANDIDATE.x - unit.x,
                        DY = CANDIDATE.y - unit.y,
                        REACH = this._battleRadius[bodyOrder] + this._battleRadius[ORDER] + contactGap,
                        REACH_SQUARED = REACH * REACH;
                    // Keep the rounding boundary for the original Math.hypot comparison.
                    // Query again after every Jacobi move: a later pass can create a new contact.
                    if (DX * DX + DY * DY > REACH_SQUARED + Math.max(1, REACH_SQUARED) * Number.EPSILON * 8) {
                        continue;
                    }
                }
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
        this._activeBreedReservations = new Map();
        this._benched = new Set();
        this._ejectQueue = [];
        this._bossHitBatch = [];
        this._benchRevision = 0;
        this._fieldCache = { revision: -1, bench: -1, list: [] };
        this._deployReadyTime = 0;
        this.battleCommand = 'engage';
        this._armyThreatTick = -1;
        this._armyThreats.length = 0;
        this._armySpacingTick = -1;
        this._armySpacingNeighbors.length = 0;
        this._armySpacingRadii.clear();
        this._armyAttackTurns.clear();
        // True while the troops are inside the tower: the battlefield is its hall, not the farm.
        this.insideTower = false;
        this.tower = {
            active: false,
            floor: 0,
            kind: 'battle',
            ...freshTowerRun(),
            sleepUntil: new Map(),
            record: false,
        };
        this._stepUnits.length = 0;
        this.corpseRecoveryVersion = 1;
        this.rng = new SEEDED_PRNG(this.seed);
        this.combine = { recipe: -1, tier: 1 };
        this.codex = { recipes: [], forms: [], colors: [] };
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
        };
        this.playerProgression = createPlayerProgressionState();
        this.frontlineLimit = Math.min(CONFIG.farm.deploy.maxFrontline, Math.floor(this.capacity / 2));
        this.runProgressionSnapshot = null;
        this.workBasisPoints = CONFIG.farm.work.defaultBasisPoints;
        // null: every species gives the same worker share. Otherwise the breeders are split between species by weight.
        this.breedWeights = null;
        // Who drops first in a fight: the front of this list goes in first.
        this.deployOrder = Array.from({ length: CONFIG.unit.speciesCount }, (_, species) => species);
        this._deployCount = 0;
        this._workerIds = new Set();
        resetWork(this);
        this._workerRates = new Map();
        this._workRate = 0;
        this._workCount = 0;
        this._nextWorkerRefreshTick = 0;
        this.starter = 0;
        this.notices = [];
        this.eventSequence = 0;
        this.foodTaps = {
            produced: 0,
            revision: 0,
        };
        this.projectiles = [];
        this.chestnutAttacks = [];
        this.cornAttachments = CornAttachmentModel.createManager();
        this.attackSerial = 0;
        this.projectileSerial = 0;
        this.bossSummonSerial = 0;
        this.combatLog = [];
        this.scene = 'farm';
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
        this.replaceBosses([this.createBoss()]);
        this.bossEncounter = null;
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
            this.recordCodex(U);
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
                    const MAX_HP = u.isFormationClone ? 1 : unitMaxHpFor(u);
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
        return farmCapacityForProgression(this.playerProgression || { overallXp: 0 });
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
            0,
        );
    }
    sortActiveFarm(order = 'mixed') {
        if (
            this.scene !== 'farm' ||
            this.farmBossEvent?.phase !== 'idle' ||
            !['species', 'tier-high', 'tier-low'].includes(order)
        ) {
            return false;
        }
        const UNITS = this.roster.residents();
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
        if (!this.unitCollection.reorder(UNITS.map((unit) => unit.id))) {
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
        return CONFIG.farm.breeding.cooldownSeconds;
    }
    breedGrowthDuration() {
        return this.breedCooldownDuration() / 2;
    }
    abilityProgressionFor(unit) {
        if (this.isBoss(unit)) {
            return BOSS_ATTACK_PROGRESSION;
        }
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
        const IN_COMBAT = this.farmBossEvent?.phase !== 'idle' || this.tower.active;
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
    resetProgression(scope) {
        const IN_COMBAT = this.farmBossEvent?.phase !== 'idle' || this.tower.active;
        const RESULT = resetPlayerProgression(this.playerProgression, scope, {
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
        return this.resetProgression({ type: 'abilities' });
    }
    spawnLobProjectile(unit, action, shot, projectileEffect = null) {
        if (this.projectiles.length >= CONFIG.battle.capacity.projectiles) {
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
        if (this.projectiles.length >= CONFIG.battle.capacity.projectiles) {
            return false;
        }
        const TARGET = this._unitForId(action.thornTargetId);
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
        const ID = this.nextId++,
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
        if (this.isBoss(unit)) {
            return unit.hp <= 0 && unit.die();
        }
        if (!this.unitCollection.has(unit)) {
            return false;
        }
        const SPLIT_BEFORE = unit.splitUsedThisBattle,
            DIED = unit.die();
        return DIED && !SPLIT_BEFORE && unit.splitUsedThisBattle;
    }
    processUnitDeath(unit) {
        return this.mutateUnits(this._processUnitDeath, unit);
    }
    // The run's passive cards in a fight. A hit gains from the attacker's low health, the fight's first seconds and the
    // allies fallen so far; a unit hurt while low takes less. All of it is zero outside a tower climb.
    passiveState(unit) {
        if (unit.faction === FACTION_CONFIG.ENEMY) {
            return { totals: this.tower.bossPassives, fallen: this.tower.bossFallen };
        }
        return { totals: this._temperamentTotals(unit.temperament), fallen: this.tower.fallen };
    }
    // The run's cards plus the one passive a unit's temperament carries (its first-rarity value); rebuilt only when the
    // run's totals are replaced.
    _temperamentTotals(temperament) {
        const TOTALS = this.tower.passives;
        if (this._temperamentTotalsSource !== TOTALS) {
            this._temperamentTotalsSource = TOTALS;
            this._temperamentTotalsByKind = TEMPERAMENT_PASSIVE_IDS.map((id) => ({
                ...TOTALS,
                [id]: (TOTALS[id] || 0) + passiveCard(id).values[0],
            }));
        }
        return this._temperamentTotalsByKind[temperament] ?? TOTALS;
    }
    passiveAttackScale(source, sourceMaxHp) {
        const TOWER = this.tower;
        if (!TOWER.active) {
            return 1;
        }
        const { totals: TOTALS, fallen: FALLEN } = this.passiveState(source),
            SETTINGS = PASSIVE_SETTINGS;
        let scale = 1;
        scale +=
            (source.hp <= sourceMaxHp * SETTINGS.lastStandBelow ? TOTALS['last-stand'] || 0 : 0) +
            (this.farmBossEvent.elapsed <= SETTINGS.openingSeconds ? TOTALS.opening || 0 : 0) +
            (TOTALS.vengeance || 0) * Math.min(FALLEN, SETTINGS.vengeanceMaxFallen);
        return scale;
    }
    passiveDamageScale(source, sourceMaxHp, target, targetMaxHp) {
        return this.passiveAttackScale(source, sourceMaxHp) * this.passiveReceivedScale(target, targetMaxHp);
    }
    passiveReceivedScale(unit, maxHp = unitMaxHpFor(unit)) {
        const TOWER = this.tower;
        if (!TOWER.active || unit.hp > maxHp * PASSIVE_SETTINGS.resolveBelow) {
            return 1;
        }
        return 1 - Math.min(PASSIVE_SETTINGS.resolveMaxReduction, this.passiveState(unit).totals.resolve || 0);
    }
    // A unit that took a killing blow holds on once per fight, at the card's share of its health.
    passiveUndying(unit) {
        const TOWER = this.tower,
            RESTORE = TOWER.passives.undying;
        if (
            !TOWER.active ||
            !RESTORE ||
            unit.hp > 0 ||
            !hasFaction(unit, FACTION_CONFIG.PLAYER) ||
            unit.isBattleOnlySummon ||
            TOWER.undyingUsed.has(unit.id)
        ) {
            return;
        }
        TOWER.undyingUsed.add(unit.id);
        unit.hp = Math.max(1, unitMaxHpFor(unit) * Math.min(PASSIVE_SETTINGS.undyingMaxRestore, RESTORE));
        this.combat('passive-undying', {
            unit: unit.id,
            x: unit.x,
            y: unit.y,
            z: unit.z,
            radius: unit.radius,
            height: unit.height,
        });
    }
    // An ally falls: vengeance counts it and the helper card heals the ones standing near.
    passiveAllyFell(unit) {
        const TOWER = this.tower;
        if (
            !TOWER.active ||
            unit.isFormationClone ||
            (unit.isBattleOnlySummon && unit.battleSummonKind !== 'boss-mouth-t1')
        ) {
            return;
        }
        const ENEMY = unit.faction === FACTION_CONFIG.ENEMY;
        TOWER[ENEMY ? 'bossFallen' : 'fallen']++;
        const TOTALS = this.passiveState(unit).totals,
            HEAL = TOTALS.helper || 0,
            VENGEANCE = TOTALS.vengeance || 0;
        if (!HEAL && !VENGEANCE) {
            return;
        }
        const NEAR = [...this.bosses, ...this.unitCollection.items]
            .filter(
                (other) =>
                    other !== unit &&
                    other.hp > 0 &&
                    !other.isFormationClone &&
                    (!this.isBoss(other) || other.active) &&
                    (ENEMY || !other.isBattleOnlySummon) &&
                    other.faction === unit.faction &&
                    Math.hypot(other.x - unit.x, other.y - unit.y) <= PASSIVE_SETTINGS.helperRadius,
            )
            .sort(
                (a, b) =>
                    Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y) || a.id - b.id,
            );
        if (HEAL) {
            for (const OTHER of NEAR) {
                applyHealing(OTHER, unitMaxHpFor(OTHER) * HEAL);
            }
        }
        const TARGETS = NEAR.slice(0, 6).map((other) => ({ x: other.x, y: other.y, z: other.z, height: other.height }));
        for (const KIND of [HEAL && 'passive-helper', VENGEANCE && 'passive-vengeance']) {
            if (KIND) {
                this.combat(KIND, { x: unit.x, y: unit.y, z: unit.z, height: unit.height, targets: TARGETS });
            }
        }
    }
    _processUnitDeath(unit) {
        this.passiveAllyFell(unit);
        unit.ability.interrupt();
        unit.specialAbility?.interrupt();
        unit.ability.resetCombatEffects?.();
        this.clearPeaRecoveryBoost(unit);
        this.onCombatResolved.emit({
            allyDeaths:
                !unit.isFormationClone && (!unit.isBattleOnlySummon || unit.battleSummonKind === 'boss-mouth-t1')
                    ? 1
                    : 0,
            role: unit.faction === FACTION_CONFIG.ENEMY ? 'boss' : 'player',
            sourceFaction: unit.faction,
            targetFaction: unit.faction,
        });
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
        for (const BOSS of this.bosses) {
            BOSS.ability.interrupt();
            BOSS.specialAbility?.interrupt();
            BOSS.ability.resetCombatEffects?.();
        }
        for (const UNIT_LOCAL of this.units) {
            if (!UNIT_LOCAL.isBattleOnlySummon) {
                UNIT_LOCAL.ability.resetCombatEffects?.();
            }
        }
        this.unitCollection.removeWhere((unit) => unit.isBattleOnlySummon);
        this.projectiles = [];
        this.chestnutAttacks = [];
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
        const BOSS_TARGETS = BATTLE_ACTIVE
            ? this.bosses.filter((boss) => boss.active && boss.hp > 0 && areOpposingFactions(unit, boss))
            : [];
        let hasUnitEnemy = false;
        for (const [FACTION, COUNT] of this._liveFactionCounts) {
            if (FACTION !== unit.faction && COUNT > 0) {
                hasUnitEnemy = true;
                break;
            }
        }
        if (!hasUnitEnemy && !BOSS_TARGETS.length) {
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
        for (const BOSS of BOSS_TARGETS) {
            CONSIDER(BOSS);
        }
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
    random() {
        return this.rng.nextUint32() / 4294967296;
    }
    // A fresh seed: its species, temperament and colour genes are fixed now and shown once it has grown.
    rollSeedLineage() {
        const RANDOM = lineageRandom(this.seed, this.nextId, 0);
        return {
            temperament: rollTemperament(RANDOM),
            genes: rollSeedGenes(RANDOM),
            seedling: { fed: 0, cooldown: 0 },
        };
    }
    // The child of a breeding pair takes its genes from both parents like any other result.
    inheritLineage(parents) {
        const RANDOM = lineageRandom(this.seed, this.nextId, 1);
        return {
            temperament: inheritTemperament(
                parents.map((unit) => unit.temperament),
                RANDOM,
            ),
            genes: inheritGenes(
                parents.map((unit) => unit.genes),
                RANDOM,
            ),
        };
    }
    // The codex remembers every kind of unit the farm has had: species by temperament, and species by shown colour.
    recordCodex(unit) {
        const ENTRIES = [
            [this.codex.forms, unit.species * TEMPERAMENT_COUNT + unit.temperament],
            ...(elementOf(unit.genes)
                ? [[this.codex.colors, unit.species * ELEMENT_COUNT + elementOf(unit.genes) - 1]]
                : []),
        ];
        for (const [LIST, VALUE] of ENTRIES) {
            if (!LIST.includes(VALUE)) {
                LIST.push(VALUE);
                LIST.sort((a, b) => a - b);
                this.markProgressChanged();
            }
        }
    }
    recordRecipe(index) {
        if (!this.codex.recipes.includes(index)) {
            this.codex.recipes.push(index);
            this.codex.recipes.sort((a, b) => a - b);
            this.markProgressChanged();
        }
    }
    // One meal of a seed. The third makes it a full unit.
    feedSeedling(unit) {
        const SEEDLING = unit.seedling;
        if (!SEEDLING) {
            return false;
        }
        SEEDLING.fed += 1;
        SEEDLING.cooldown = SEED_FEED_COOLDOWN_SECONDS;
        if (SEEDLING.fed >= SEED_FEEDS) {
            unit.seedling = null;
            unit.growthElapsed = unit.growthDuration;
            unit.growth = CONFIG.farm.breeding.matureMeals;
            this.metrics.births++;
            this.recordCodex(unit);
            this.emit('birth', unit.x, unit.y, 0.7);
        } else {
            unit.growthElapsed = (unit.growthDuration * SEEDLING.fed * 0.8) / SEED_FEEDS;
        }
        this.markProgressChanged();
        this._markMergeAvailabilityChanged();
        return true;
    }
    spawn(species, tier, x, y, { birthReservationOwner = null, lineage = null } = {}) {
        if (this.scene === 'farm') {
            if (this.freeRoom(birthReservationOwner) <= 0) {
                return null;
            }
        } else if (this.units.length >= SIMULATION_SCENES[this.scene].capacity(this)) {
            return null;
        }
        const U = new UNIT(this.nextId++, species, CLAMP(tier, 1, CONFIG.unit.maxTier), x, y);
        if (lineage) {
            U.temperament = lineage.temperament;
            U.genes = [...lineage.genes];
            U.seedling = lineage.seedling ? { ...lineage.seedling } : null;
            if (U.seedling) {
                U.growthDuration = this.breedGrowthDuration();
            }
        }
        U.hp = unitMaxHpFor(U);
        applyRunGrowthHealth(U, this.runProgressionSnapshot, { preserveRatio: true });
        this.addUnit(U);
        return U;
    }
    addUnit(unit, options) {
        if (!Number.isSafeInteger(unit.generation) || unit.generation <= 0) {
            unit.generation = ++this.entityGenerationSerial;
        } else {
            this.entityGenerationSerial = Math.max(this.entityGenerationSerial, unit.generation);
        }
        return this.unitCollection.add(unit, options);
    }
    removeUnit(unit, options) {
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
    isWorker(unit) {
        return this._workerIds.has(unit.id);
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
    workOrder(unit) {
        return workOrder(this, unit);
    }
    canBreedNow(unit) {
        return unit.breedingEligible !== false && !this._workerIds.has(unit.id);
    }
    // The share of the farm that makes food instead of breeding, in basis points.
    setWorkBasisPoints(basisPoints) {
        if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 10000) {
            return false;
        }
        this.workBasisPoints = basisPoints;
        this._nextWorkerRefreshTick = 0;
        this.refreshWorkers();
        return true;
    }
    // Who gets the breeding: one weight per species (null: even by headcount).
    setBreedWeights(weights) {
        if (
            weights !== null &&
            !(
                Array.isArray(weights) &&
                weights.length <= CONFIG.unit.speciesCount &&
                weights.every((weight) => Number.isSafeInteger(weight) && weight >= 0) &&
                weights.some((weight) => weight > 0)
            )
        ) {
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
        const WORK = CONFIG.farm.work,
            RATIO = this.workBasisPoints / 10000,
            NEXT = new Set(),
            RATES = new Map();
        let total = 0;
        if (this.scene === 'farm') {
            const BY_SPECIES = new Map();
            for (const UNIT_LOCAL of this.roster.residents()) {
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
            const WORKERS = workersBySpecies(
                new Map([...BY_SPECIES].map(([species, list]) => [species, list.length])),
                RATIO,
                this.breedWeights,
            );
            for (const [SPECIES, LIST] of BY_SPECIES) {
                LIST.sort((a, b) => a.id - b.id);
                const COUNT = WORKERS.get(SPECIES);
                for (let index = 0; index < COUNT; index++) {
                    const WORKER = LIST[index],
                        RATE = (1 + WORK.tierBonus * (WORKER.tier - 1)) / WORK.secondsPerFood;
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
        }
    }
    spawnFood(x, y, count = 1, { from = null } = {}) {
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
    // Start a climb: the farm's units go up the tower floor by floor, from any floor up to the best one so far.
    startTower(startFloor = 1) {
        this._flushEjected();
        if (
            this.scene !== 'farm' ||
            this.boss.active ||
            this.farmBossEvent.phase !== 'idle' ||
            this.tower.active ||
            !this.units.some((u) => !u.isBattleOnlySummon && u.hp > 0)
        ) {
            return false;
        }
        const FLOOR = Math.min(
                Math.max(1, Math.floor(startFloor) || 1),
                highestTowerStartFloor(this.playerProgression.towerBest),
            ),
            KIND = FLOOR % CONFIG.farm.tower.midBossEvery === 0 ? 'mid' : 'battle';
        // Whoever is already down sleeps through the first floor.
        const SLEEP = new Map(this.units.filter((u) => !u.isBattleOnlySummon && u.hp <= 0).map((u) => [u.id, FLOOR]));
        const REWARD_RUN = beginTowerRewardRun(this.playerProgression);
        this.playerProgression = REWARD_RUN.state;
        this.battleCommand = 'engage';
        this.runProgressionSnapshot = structuredClone(this.playerProgression);
        for (const UNIT_LOCAL of this.unitCollection.items) {
            applyRunGrowthHealth(UNIT_LOCAL, this.runProgressionSnapshot, { preserveRatio: true });
        }
        this.tower = {
            pendingKind: KIND,
            phase: 'climbing',
            summitElapsed: 0,
            startFloor: FLOOR,
            rewardRunId: REWARD_RUN.runId,
            active: true,
            floor: FLOOR,
            kind: KIND,
            ...freshTowerRun(),
            sleepUntil: SLEEP,
            record: false,
        };
        // Everyone on the farm walks to the door first; the floor begins when they are inside.
        this.farmBossEvent = { ...this.farmBossEvent, phase: 'marching', elapsed: 0, outcome: 'fighting' };
        this.markProgressChanged();
        return true;
    }
    // One unit's walk to the tower door while the march lasts.
    _marchUnit(unit) {
        if (unit.hp <= 0 || unit.isBattleOnlySummon) {
            return;
        }
        const GATE = this.towerGate,
            SPREAD = ((unit.id * 7) % 11) - 5;
        this.steer(unit, GATE.x + SPREAD * 0.25, GATE.y, 0, CONFIG.farm.tower.marchSpeed);
    }
    // Where the tower door is: the middle of the back edge of the farm.
    get towerGate() {
        return { x: 0, y: CONFIG.farm.arena.radiusY };
    }
    benchUnit(unit) {
        this._benched.add(unit);
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
        const SETTINGS = CONFIG.farm.tower,
            ARENA = CONFIG.farm.arena,
            UNITS = this.unitCollection.items.filter((unit) => !unit.isBattleOnlySummon);
        for (let index = UNITS.length - 1; index > 0; index--) {
            const OTHER = Math.floor(this.random() * (index + 1));
            [UNITS[index], UNITS[OTHER]] = [UNITS[OTHER], UNITS[index]];
        }
        this._ejectQueue = UNITS.map((unit, index) => {
            const AT = ARENA_GEOMETRY.clamp(
                { x: (this.random() * 2 - 1) * (ARENA.radiusX - 2), y: (this.random() * 2 - 1) * (ARENA.radiusY - 2) },
                'farm',
                1,
            );
            Object.assign(unit, { x: AT.x, y: AT.y, z: 0, vx: 0, vy: 0, vz: 0 });
            return { unit, at: this.time + (index / UNITS.length) * SETTINGS.ejectSeconds, target: AT };
        });
        this._benched = new Set(UNITS);
        this._benchRevision++;
        this._unitSpatialDirty = true;
    }
    // The next troop whose turn has come leaves the door in an arc that lands on its spot.
    _releaseEjected() {
        const SETTINGS = CONFIG.farm.tower,
            GATE = this.towerGate;
        while (this._ejectQueue.length && this._ejectQueue[0].at <= this.time) {
            const NEXT = this._ejectQueue.shift(),
                UNIT_LOCAL = NEXT.unit,
                TARGET = NEXT.target;
            this._benched.delete(UNIT_LOCAL);
            this._benchRevision++;
            if (this.unitCollection.has(UNIT_LOCAL)) {
                const X = GATE.x + (this.random() - 0.5) * 3,
                    Y = GATE.y - 0.8,
                    T = SETTINGS.flightSeconds;
                Object.assign(UNIT_LOCAL, {
                    x: X,
                    y: Y,
                    z: SETTINGS.ejectHeight,
                    vx: (TARGET.x - X) / T,
                    vy: (TARGET.y - Y) / T,
                    vz: (0.5 * CONFIG.physics.gravity * T * T - SETTINGS.ejectHeight) / T,
                    // A sleeping unit has no drop landing of its own: it just falls.
                    dropLanded: UNIT_LOCAL.hp <= 0,
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
        const T = this.tower,
            FLOOR = T.floor + 1;
        T.nextKind = rollFloorKind({
            floor: FLOOR,
            since: T.since,
            random: () => this.random(),
            midBossEvery: CONFIG.farm.tower.midBossEvery,
            topFloor: CONFIG.farm.tower.topFloor,
        });
        if (T.nextKind === 'mid') {
            return [{ type: 'fight', kind: 'mid' }];
        }
        if (T.nextKind === 'battle') {
            return [
                { type: 'fight', kind: 'battle' },
                { type: 'fight', kind: 'elite' },
            ];
        }
        if (T.nextKind === 'event') {
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
            random: () => this.random(),
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
    _wakeUnit(unit) {
        unit.revive(unitMaxHpFor(unit));
        this.tower.sleepUntil.delete(unit.id);
    }
    chooseDoor(index) {
        const T = this.tower,
            DOOR = T.doors[index];
        if (!T.active || this.farmBossEvent.phase !== 'idle' || !DOOR || this.time < (T.bossCardDraw?.until || 0)) {
            return false;
        }
        T.floor++;
        T.since = advanceSince(T.since, T.nextKind);
        T.doors = [];
        if (DOOR.type === 'fight') {
            return this._beginFloor(DOOR.kind);
        }
        let playerReceipt = null;
        if (['skill', 'stat', 'passive'].includes(DOOR.type)) {
            playerReceipt = applyTowerCard(T, DOOR);
            this._applyRunStats();
        } else {
            TOWER_EVENTS.find((event) => event.id === DOOR.id).apply(this);
        }
        if (['skill', 'stat', 'passive'].includes(DOOR.type)) {
            drawBossCard(
                T,
                () => this.random(),
                this.time,
                CONFIG.farm.tower.relicSlots,
                CONFIG.farm.tower.relicMaxLevel,
                playerReceipt,
            );
            this._applyBossRunStats();
        }
        // A floor reached without a fight still counts as reached.
        this.playerProgression.towerBest = Math.max(this.playerProgression.towerBest, T.floor);
        T.kind = T.nextKind;
        T.doors = this._rollDoors();
        this.combat('tower-card', { floor: T.floor });
        this.markProgressChanged();
        return true;
    }
    _applyBossRunStats() {
        const TOWER = this.tower,
            MODIFIERS = TOWER.active ? runStatModifiers(TOWER.bossCards, 'boss') : {};
        TOWER.bossPassives = TOWER.active ? passiveTotals(TOWER.bossCards, 'boss') : {};
        for (const UNIT_LOCAL of [...this.bosses, ...this.unitCollection.items]) {
            if (UNIT_LOCAL.faction === FACTION_CONFIG.ENEMY) {
                UNIT_LOCAL.setStatModifiers(MODIFIERS);
                UNIT_LOCAL.hp = Math.min(UNIT_LOCAL.hp, unitMaxHpFor(UNIT_LOCAL));
            }
        }
    }
    _clearRunStats() {
        for (const UNIT_LOCAL of this.unitCollection.items) {
            applyRunGrowthHealth(UNIT_LOCAL, null);
        }
        this.tower.cards = [];
        this._applyRunStats();
    }
    // The run's stat cards change every unit's stats; hit points never stay above the new top.
    _applyRunStats() {
        setRunStatMods(runStatModifiers(this.tower.cards));
        this.tower.passives = passiveTotals(this.tower.cards);
        for (const UNIT_LOCAL of this.unitCollection.items) {
            if (UNIT_LOCAL.hp > 0 && !UNIT_LOCAL.isFormationClone) {
                UNIT_LOCAL.hp = Math.min(UNIT_LOCAL.hp, unitMaxHpFor(UNIT_LOCAL));
            }
        }
    }
    // Stopping after a cleared floor keeps everything that was won.
    leaveTower() {
        if (!this.tower.active || this.farmBossEvent.phase !== 'idle') {
            return false;
        }
        this._endTower();
        return true;
    }
    _endTower() {
        this._clearRunStats();
        this.tower.active = false;
        this.runProgressionSnapshot = null;
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
                UNIT_LOCAL.hp = unitMaxHpFor(UNIT_LOCAL);
            }
        }
        T.fallen = 0;
        T.bossFallen = 0;
        T.undyingUsed = new Set();
        // Between floors residents are still benched; the field-only view is empty.
        for (const UNIT_LOCAL of this.unitCollection.items) {
            if (!UNIT_LOCAL.isBattleOnlySummon) {
                UNIT_LOCAL.splitUsedThisBattle = false;
                UNIT_LOCAL.deathSplitHandled = false;
                UNIT_LOCAL.chestnutNextThornTick = 0;
            }
        }
        this.replaceBosses([]);
        this.bossEncounter = createTowerEncounter(T.floor);
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
        this.joinNextBoss(true);
        // Nobody walks in by themselves: every living unit waits in the hand until the player deploys it.
        this._benched = new Set(this.unitCollection.items.filter((u) => !u.isBattleOnlySummon));
        this._benchRevision++;
        this._beginArmyDeployment();
        this._unitSpatialDirty = true;
        this.markProgressChanged();
        return true;
    }
    joinNextBoss(initial = false) {
        const ENCOUNTER = this.bossEncounter,
            ENTRY = ENCOUNTER?.roster[ENCOUNTER.nextIndex];
        if (!ENTRY || (ENTRY.final && this.bosses.some((boss) => boss.active && boss.hp > 0))) {
            return false;
        }
        const INDEX = ENCOUNTER.nextIndex++,
            BOSS = this.createBoss(ENTRY.species, INDEX === 0 ? 'boss' : `boss-${INDEX}`),
            KIND = CONFIG.farm.tower[this.tower.kind],
            BUDGET = encounterBudget(ENCOUNTER.floor, this.tower.startFloor || 1),
            STATS = bossStageStats(ENCOUNTER.floor),
            ANGLE = INDEX * 2.399963229728653;
        BOSS.controller.configureStage(ENCOUNTER.floor, ENTRY.species);
        BOSS.setBaseStats({
            maxHp: Math.max(1, Math.round(STATS.hp * KIND.hp * BUDGET.hp * ENTRY.hpShare)),
            attackPower: STATS.attackPower * KIND.attack * BUDGET.attack * ENTRY.attackShare,
        });
        BOSS.setStatModifiers(runStatModifiers(this.tower.bossCards, 'boss'));
        BOSS.setHealth(BOSS.maxHp);
        Object.assign(BOSS, {
            x: INDEX ? Math.cos(ANGLE) * 9 : 0,
            y: INDEX ? Math.sin(ANGLE) * 6 : 0,
            z: CONFIG.battle.dropHeight,
            dropLanded: false,
            active: true,
            encounterId: this.farmBossEvent.encounterId,
            isFinalBoss: ENTRY.final,
        });
        this.bosses.push(BOSS);
        ENCOUNTER.nextJoinAt = ENCOUNTER.elapsed + TOWER_ENCOUNTER_SETTINGS.reinforcementSeconds;
        if (!initial) {
            this.combat('tower-boss-join', { unit: BOSS.id, final: ENTRY.final, x: BOSS.x, y: BOSS.y, z: BOSS.z });
        }
        return true;
    }
    advanceBossEncounter(dt) {
        const ENCOUNTER = this.bossEncounter;
        if (!ENCOUNTER) {
            return this.boss.hp <= 0;
        }
        ENCOUNTER.elapsed += dt;
        for (const BOSS of this.bosses) {
            if (BOSS.hp <= 0 && !ENCOUNTER.clearedIds.includes(BOSS.id)) {
                BOSS.die();
                BOSS.active = false;
                BOSS.ability.interrupt();
                BOSS.specialAbility?.interrupt();
                BOSS.patternRuntime.active = null;
                ENCOUNTER.clearedIds.push(BOSS.id);
            }
        }
        const ALIVE = this.bosses.some((boss) => boss.active && boss.hp > 0);
        if (ENCOUNTER.nextIndex < ENCOUNTER.roster.length && (!ALIVE || ENCOUNTER.elapsed >= ENCOUNTER.nextJoinAt)) {
            this.joinNextBoss();
            return false;
        }
        ENCOUNTER.completed = !ALIVE && ENCOUNTER.nextIndex === ENCOUNTER.roster.length;
        return ENCOUNTER.completed;
    }
    finishTowerSummit() {
        if (this.tower.phase !== 'summit') {
            return false;
        }
        this.tower.phase = 'complete';
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
        this.replaceBosses([this.createBoss()]);
        this.bossEncounter = null;
        this._endTower();
        return true;
    }
    // The units that are on the field: everything but the ones still waiting in the hand.
    _fieldUnits() {
        const CACHE = this._fieldCache;
        if (CACHE.revision !== this.unitCollection.revision || CACHE.bench !== this._benchRevision) {
            CACHE.list = this.unitCollection.items.filter((unit) => !this._benched.has(unit));
            CACHE.revision = this.unitCollection.revision;
            CACHE.bench = this._benchRevision;
        }
        return CACHE.list;
    }
    get handCounts() {
        const COUNTS = new Map();
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
            if (UNIT_LOCAL.faction === 'player' && !UNIT_LOCAL.isBattleOnlySummon && UNIT_LOCAL.hp > 0) {
                count++;
            }
        }
        return count;
    }
    get deployCooldownLeft() {
        return Math.max(0, this._deployReadyTime - this.time);
    }
    _beginArmyDeployment() {
        for (const UNIT of this.unitCollection.items) {
            UNIT.scatterAttackCount = 0;
        }
        this.frontlineLimit = Math.min(CONFIG.farm.deploy.maxFrontline, Math.floor(this.capacity / 2));
        this._benched = new Set(this.unitCollection.items.filter((unit) => !unit.isBattleOnlySummon));
        this._benchRevision++;
        this._deployReadyTime = this.time;
        this._deployCount = 0;
        this._armyThreatTick = -1;
        this._unitSpatialDirty = true;
    }
    setBattleCommand(command) {
        if (!['engage', 'scatter', 'retreat'].includes(command) || !this.tower.active) {
            return false;
        }
        this.battleCommand = command;
        if (command === 'retreat' || command === 'scatter') {
            for (const UNIT_LOCAL of this.unitCollection.items) {
                if (hasFaction(UNIT_LOCAL, FACTION_CONFIG.PLAYER) && UNIT_LOCAL.ability.phase === 'windup') {
                    // Do not cancel special skills, launched projectiles or committed leaps.
                    UNIT_LOCAL.ability.interrupt();
                }
            }
        }
        return true;
    }
    // The whole order at once: it must list every species exactly once.
    setDeployOrder(order) {
        const COUNT = CONFIG.unit.speciesCount;
        if (
            !Array.isArray(order) ||
            order.length !== COUNT ||
            new Set(order).size !== COUNT ||
            !order.every((species) => Number.isSafeInteger(species) && species >= 0 && species < COUNT)
        ) {
            return false;
        }
        this.deployOrder = [...order];
        return true;
    }
    // Fill a bounded frontline in roughly 1.5 seconds, then refill casualties in
    // the same species priority. A summon never consumes a regular army slot.
    _autoDeploy() {
        if (
            this.scene !== 'farm' ||
            !['dropping', 'fighting'].includes(this.farmBossEvent.phase) ||
            this._benched.size === 0 ||
            this.deployCooldownLeft > 0
        ) {
            return;
        }
        const DEPLOY = CONFIG.farm.deploy,
            ARENA = ARENA_GEOMETRY.arena(this),
            BATCH_SIZE = Math.ceil((this.frontlineLimit * DEPLOY.cooldownSeconds) / DEPLOY.initialSeconds),
            COUNT = Math.min(BATCH_SIZE, this.frontlineLimit - this.fieldFighterCount);
        for (let index = 0; index < COUNT; index++) {
            const ANGLE = this._deployCount * 2.399963229728653,
                X = Math.cos(ANGLE) * (ARENA.radiusX - 1),
                Y = Math.sin(ANGLE) * (ARENA.radiusY - 1);
            let deployed = false;
            for (const SPECIES of this.deployOrder) {
                if (this._deployReservedUnit(SPECIES, X, Y)) {
                    this._deployCount++;
                    deployed = true;
                    break;
                }
            }
            if (!deployed) {
                break;
            }
        }
        this._deployReadyTime = this.time + DEPLOY.cooldownSeconds;
    }
    // Drops one waiting unit of the species (the strongest first) onto the spot.
    deployUnit(species, x, y) {
        if (
            this.scene !== 'farm' ||
            !['dropping', 'fighting'].includes(this.farmBossEvent.phase) ||
            this.deployCooldownLeft > 0 ||
            this.fieldFighterCount >= this.frontlineLimit ||
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        ) {
            return false;
        }
        if (!this._deployReservedUnit(species, x, y)) {
            return false;
        }
        this._deployReadyTime = this.time + CONFIG.farm.deploy.cooldownSeconds;
        return true;
    }
    _deployReservedUnit(species, x, y) {
        let pick = null;
        for (const UNIT_LOCAL of this._benched) {
            if (
                UNIT_LOCAL.species === species &&
                hasFaction(UNIT_LOCAL, FACTION_CONFIG.PLAYER) &&
                !UNIT_LOCAL.isBattleOnlySummon &&
                UNIT_LOCAL.hp > 0 &&
                (!pick || UNIT_LOCAL.tier > pick.tier || (UNIT_LOCAL.tier === pick.tier && UNIT_LOCAL.id < pick.id))
            ) {
                pick = UNIT_LOCAL;
            }
        }
        if (!pick) {
            return false;
        }
        const AT = ARENA_GEOMETRY.clamp({ x, y }, this, 1);
        this._benched.delete(pick);
        this._benchRevision++;
        Object.assign(pick, { x: AT.x, y: AT.y, z: CONFIG.battle.dropHeight, vx: 0, vy: 0, vz: 0, dropLanded: false });
        this._unitSpatialDirty = true;
        return true;
    }
    // Leaving a fight that is going on is a defeat.
    retreatFromFight() {
        if (this.farmBossEvent.phase === 'dropping') {
            this.farmBossEvent.phase = 'fighting';
            this.farmBossEvent.elapsed = 0;
        }
        return this.finishFarmBossEvent('defeat');
    }
    getBossAcquisitionChance({ farmEvent = false } = {}) {
        return bossAcquisitionChance({
            farmEvent,
        });
    }
    createBoss(species = BOSS_SPECIES, id = 'boss') {
        const BOSS = new UNIT(id, CLAMP(species, 0, CONFIG.unit.speciesCount - 1), 1, 0, 0, {
            statProfile: { maxHp: 2000, attackPower: 4, moveSpeed: CONFIG.boss.chaseSpeed },
            bodyProfile: {
                radius: bossBodyRadius,
                height: bossBodyHeight,
                bodyHeight: bossTorsoHeight,
                vectorScale: () => bossVectorScale(),
            },
            // Enlarging a weapon/hit area must not multiply body travel. Keep
            // the same shared attack clips, with a short grounded weight shift.
            attackMotionProfile: { groundOffsetLimit: 0.65, heightScale: 1 },
            controller: BossController,
        });
        BOSS.attachWorld(this);
        Object.assign(BOSS, {
            generation: ++this.entityGenerationSerial,
            faction: FACTION_CONFIG.ENEMY,
            ownerId: 'boss',
            growthElapsed: 1,
            growthDuration: 1,
            growth: CONFIG.farm.breeding.matureMeals,
            countsTowardPermanentRoster: false,
            breedingEligible: false,
            mergeEligible: false,
            canSplit: false,
            usesPersistentSleep: false,
            stage: 0,
            isFinalBoss: false,
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
            barleyArmorShredBuckets: createBarleyArmorShredBuckets(),
            summonMouth: {
                x: 0,
                y: 0,
                z: 0,
            },
        });
        return BOSS;
    }
    // Past the time limit the boss enrages instead of ending the fight; only a wipe or a retreat loses.
    get bossEnraged() {
        return this.farmBossEvent?.phase === 'fighting' && this.farmBossEvent.elapsed >= this.battleTimeLimit();
    }
    // 1-based boss phase from remaining HP: each unlockHp threshold crossed opens a phase.
    get bossPhase() {
        return 1 + BOSS_PHASE_THRESHOLDS.filter((t) => this.bossHpRatio <= t).length;
    }
    // Remaining HP as the patterns see it: elites and mid-bosses start further along, so they know their skills early.
    get bossHpRatio() {
        return this.bossHpRatioFor(this.boss);
    }
    bossHpRatioFor(boss) {
        const EDGE = this.tower.active ? CONFIG.farm.tower[this.tower.kind]?.edge || 0 : 0;
        return (boss.maxHp ? boss.hp / boss.maxHp : 1) - EDGE - (boss.isFinalBoss ? 0.25 : 0);
    }
    // A boss fight lasts 90 seconds at stage 1 and 10 seconds longer for every stage after it.
    battleTimeLimit() {
        return 90 + 10 * Math.max(0, (this.boss.stage ?? 1) - 1);
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
                this.freeRoom(BIRTH_RESERVATION ? OWNER : null) > 0 &&
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
    cancelBreedPlans() {
        for (const OWNER of [...(this._activeBreedReservations?.keys() || [])]) {
            this.releaseActiveBreedReservation(OWNER);
        }
        this._activeBreedReservations?.clear();
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
            !this.canBreedPair(a, b) ||
            a.down > 0 ||
            b.down > 0 ||
            (a.mateId && a.mateId !== b.id) ||
            (b.mateId && b.mateId !== a.id)
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
            reservation: RESERVATION,
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
            if (this.freeRoom() <= 0) {
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
                    CANDIDATE.hp <= 0 ||
                    CANDIDATE.down > 0 ||
                    !CANDIDATE.mature ||
                    !CANDIDATE.fed ||
                    CANDIDATE.cooldown > 0 ||
                    !this.canBreedNow(CANDIDATE) ||
                    this.unitCollection.reservationOwner(CANDIDATE) ||
                    !this.canBreedPair(unit, CANDIDATE)
                ) {
                    continue;
                }
                CANDIDATES.push(CANDIDATE);
            }
            CANDIDATES.sort(
                (a, b) =>
                    Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y) || a.id - b.id,
            );
            for (const MATE of CANDIDATES) {
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
                OUTCOME = FIRST ? mergeOutcome(materials) : null;
            if (!OUTCOME) {
                return false;
            }
            const COMBINE = OUTCOME.recipe !== null,
                MATERIAL_COUNT = COMBINE ? 2 : mergeMaterialCostForTier(OUTCOME.tier);
            if (MATERIAL_COUNT < 2 || materials.length !== MATERIAL_COUNT || OUTCOME.tier > CONFIG.unit.maxTier) {
                return false;
            }
            const IDS = new Set();
            for (const UNIT_LOCAL of materials) {
                if (
                    !UNIT_LOCAL ||
                    IDS.has(UNIT_LOCAL.id) ||
                    UNIT_LOCAL.isBattleOnlySummon ||
                    UNIT_LOCAL.mergeEligible === false ||
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
            for (const MATERIAL_SPECIES of new Set(materials.map((unit) => unit.species))) {
                const LOSS = COMBINE ? 1 : MATERIAL_COUNT - 1;
                if (
                    this._ownedSpeciesCounts[MATERIAL_SPECIES] -
                        this._pendingMergeCost(MATERIAL_SPECIES, EXCLUDED_TASK) -
                        LOSS <
                    2
                ) {
                    return false;
                }
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
    // Sorts the units that may be merged right now into species-and-tier groups.
    _collectMergeEligible() {
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
                    (!this.unitCollection.reservationOwner(UNIT_LOCAL) ||
                        this._isValidBreedReservation(UNIT_LOCAL, this.unitCollection.reservationOwner(UNIT_LOCAL))) &&
                    !this.senseEnemy(UNIT_LOCAL)
                ) {
                    this._mergeEligibleGroups[UNIT_LOCAL.species * (CONFIG.unit.maxTier + 1) + UNIT_LOCAL.tier].push(
                        UNIT_LOCAL,
                    );
                }
            }
        }
    }
    // The closest pair for a recipe at one tier, or null.
    selectCombineMaterials(recipeIndex, tier) {
        const RECIPE = RECIPES[recipeIndex];
        if (this.scene !== 'farm' || !RECIPE || !Number.isInteger(tier) || tier < 1 || tier > CONFIG.unit.maxTier) {
            return null;
        }
        const BATCH = !this._spatialStepActive;
        if (BATCH) {
            this._beginSpatialQueryBatch();
        }
        try {
            this._collectMergeEligible();
            const FIRST_GROUP = this._mergeEligibleGroups[RECIPE.a * (CONFIG.unit.maxTier + 1) + tier],
                SECOND_GROUP = this._mergeEligibleGroups[RECIPE.b * (CONFIG.unit.maxTier + 1) + tier];
            let best = null,
                bestDistance = Infinity;
            for (const A of FIRST_GROUP) {
                for (const B of SECOND_GROUP) {
                    const DISTANCE = (A.x - B.x) ** 2 + (A.y - B.y) ** 2;
                    if (
                        DISTANCE < bestDistance ||
                        (DISTANCE === bestDistance && best && A.id + B.id < best[0].id + best[1].id)
                    ) {
                        if (this.canMergeGroup([A, B], { requireNoEnemy: true })) {
                            best = [A, B];
                            bestDistance = DISTANCE;
                        }
                    }
                }
            }
            return best;
        } finally {
            if (BATCH) {
                this._endSpatialQueryBatch();
            }
        }
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
            this._collectMergeEligible();
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
    setCombineSelection(recipe, tier) {
        if (
            !Number.isInteger(recipe) ||
            recipe < -1 ||
            recipe >= RECIPES.length ||
            !Number.isInteger(tier) ||
            tier < 1 ||
            tier > CONFIG.unit.maxTier ||
            (recipe === this.combine.recipe && tier === this.combine.tier)
        ) {
            return false;
        }
        this.combine = { recipe, tier };
        this._markMergeAvailabilityChanged();
        this.markProgressChanged();
        return true;
    }
    combineDecision() {
        if (this.scene !== 'farm') {
            return { available: false, code: 'wrong-scene', reason: '농장 화면에서만 조합할 수 있어요.' };
        }
        if (this.farmBossEvent?.phase !== 'idle') {
            return { available: false, code: 'boss-event', reason: '레이드 중에는 조합할 수 없어요.' };
        }
        const RECIPE = RECIPES[this.combine.recipe];
        if (!RECIPE) {
            return { available: false, code: 'no-recipe', reason: '도감에서 조합식을 골라 주세요.' };
        }
        const MATERIALS = this.selectCombineMaterials(this.combine.recipe, this.combine.tier);
        if (!MATERIALS) {
            return {
                available: false,
                code: 'no-eligible-materials',
                reason: `T${this.combine.tier} 재료가 부족해요. 각 병종이 3마리씩 있어야 해요.`,
            };
        }
        return {
            available: true,
            code: 'ready',
            tier: this.combine.tier,
            materialCount: 2,
            materials: MATERIALS,
            reason: `T${this.combine.tier} 조합`,
        };
    }
    combineAvailability() {
        const DECISION = this.combineDecision();
        return { available: DECISION.available, code: DECISION.code, reason: DECISION.reason };
    }
    startManualMerge(combine = false) {
        return this.mutateUnits(this._startManualMerge, combine);
    }
    _startManualMerge(combine) {
        const DECISION = combine ? this.combineDecision() : this.mergeDecision();
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
            partnerSpecies: combine ? MATERIALS[1].species : -1,
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
        const OUTCOME = mergeOutcome(ORDERED),
            RESULT = new UNIT(this.nextId, OUTCOME.species, OUTCOME.tier, X, Y);
        const LINEAGE_RANDOM = lineageRandom(this.seed, this.nextId, 2);
        RESULT.temperament = inheritTemperament(
            ORDERED.map((unit) => unit.temperament),
            LINEAGE_RANDOM,
        );
        RESULT.genes = inheritGenes(
            ORDERED.map((unit) => unit.genes),
            LINEAGE_RANDOM,
        );
        RESULT.hp = unitMaxHpFor(RESULT);
        applyRunGrowthHealth(RESULT, this.runProgressionSnapshot, { preserveRatio: true });
        RESULT.dropLanded = false;
        RESULT.meals = 1;
        RESULT.growth = CONFIG.farm.breeding.matureMeals;
        RESULT.growthDuration = this.breedGrowthDuration();
        RESULT.growthElapsed = RESULT.growthDuration;
        RESULT.z = Math.max(0, Z - RESULT.height * 0.85);
        RESULT.vz = -CONFIG.farm.merge.resultFallVelocity;
        RESULT.cooldown = CONFIG.farm.merge.cooldownSeconds;
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
                    TASK.partnerSpecies = OUTCOME.recipe ? ORDERED[1].species : -1;
                    TASK.sourceTier = FIRST.tier;
                    this.recordCodex(RESULT);
                    if (OUTCOME.recipe) {
                        this.recordRecipe(RECIPES.indexOf(OUTCOME.recipe));
                    }
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
        if (this.tower.phase === 'summit') {
            this.time += dt;
            this.simulationTick++;
            this.tower.summitElapsed += dt;
            const SCENE = SIMULATION_SCENES[this.scene];
            this._oldStepPosition ||= { x: 0, y: 0, z: 0 };
            for (const UNIT_LOCAL of this.units) {
                if (UNIT_LOCAL.hp > 0 && (UNIT_LOCAL.z > 0 || UNIT_LOCAL.vz > 0)) {
                    // Finish existing landings without restarting combat or farm AI.
                    UNIT_LOCAL.moveControlActive = false;
                    this.integrateLivingUnit(UNIT_LOCAL, dt, SCENE);
                    this.updateUnitSpatial(UNIT_LOCAL);
                }
            }
            advanceBossRewardCalculations(this);
            grantPendingBossAcquisitions(this);
            if (this.tower.summitElapsed >= TOWER_ENCOUNTER_SETTINGS.summitSeconds) {
                this.finishTowerSummit();
            }
            return;
        }
        const LOGIC_START = this.profiler?.start();
        this.simulationTick = (this.simulationTick || 0) + 1;
        this._spatialStepActive = true;
        this._spatialQueryDepth = 0;
        this.time += dt;
        let progressTimersAdvanced = false;
        advanceBossRewardCalculations(this);
        grantPendingBossAcquisitions(this);
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
        this._releaseEjected();
        this.formationSkills.update(dt);
        const SCENE = SIMULATION_SCENES[this.scene];
        SCENE.advanceClock(this, dt);
        this._autoDeploy();
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
            if (
                (U.statProfile?.regen ?? STATS(U.tier, U.species).regen) > 0 ||
                U.statModifiers.regen ||
                TEMPERAMENT_TILTS[U.temperament]?.regenPct
            ) {
                const UNIT_STATS = resolveUnitStats(U);
                applyHealing(U, UNIT_STATS.regen * dt, UNIT_STATS);
            }
            if (U.seedling) {
                // A seed grows by eating, never by waiting.
                if (U.seedling.cooldown > 0) {
                    progressTimersAdvanced = true;
                    U.seedling.cooldown = Math.max(0, U.seedling.cooldown - dt);
                }
            } else if (!U.mature) {
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
        advanceChestnutAttacks(this);
        const POST_STEP_START = this.profiler?.start();
        SCENE.resolveLifeContacts(this, UNITS);
        this.resolvePeaRecoveryBoosts(UNITS);
        this.resolvePeaRecoveryBoosts(this.bosses.filter((boss) => boss.active));
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
            this.integrateLivingUnit(U, dt, scene);
            this.updateUnitSpatial(U);
        }
        for (const BOSS of this.bosses) {
            if (BOSS.active && BOSS.hp > 0) {
                this.integrateLivingUnit(BOSS, dt, scene);
            }
        }
        if (this.bosses.some((boss) => boss.active)) {
            this.updateProjectiles(dt);
            scene.separateBossUnits(this, units);
        }
        const COLLISION_START = this.profiler?.start();
        this.resolveContacts(units, dt);
        this.profiler?.end('collision', COLLISION_START);
    }
    integrateLivingUnit(unit, dt, scene) {
        const U = unit,
            OLD_Z = U.z,
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
            U.landingRecovery = ACTIVE_ATTACK.landingRecoverySeconds?.() ?? 0.25;
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
        if (U.controller && U.moveControlActive) {
            U.travel += Math.hypot(U.x - OLD_POSITION.x, U.y - OLD_POSITION.y);
        }
    }
    updateUnitIntent(unit, dt, enemy, scene) {
        if (this.farmBossEvent.phase === 'marching') {
            this._marchUnit(unit);
            return;
        }
        if (this.isMergeTaskMaterial(unit)) {
            return;
        }
        if (
            this.tower.active &&
            ['dropping', 'fighting'].includes(this.farmBossEvent.phase) &&
            hasFaction(unit, FACTION_CONFIG.PLAYER)
        ) {
            // Commands are army-wide, even after retreat has taken a unit beyond
            // its ordinary farm perception. Never resume farming inside a fight.
            let target = enemy,
                nearestDistance = Infinity;
            if (!target && this.farmBossEvent.phase === 'fighting') {
                for (const THREAT of this._armyThreatsForTick()) {
                    const DISTANCE = Math.hypot(unit.x - THREAT.x, unit.y - THREAT.y);
                    if (THREAT.hp > 0 && DISTANCE < nearestDistance) {
                        target = THREAT;
                        nearestDistance = DISTANCE;
                    }
                }
            }
            this.battleUnit(unit, dt, target);
            return;
        }
        if (enemy) {
            this.battleUnit(unit, dt, enemy);
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
        unit.peaCounterExpiresAtTick = 0;
        unit.peaCounterPending = false;
        unit.peaRecoveryBoostExpiresAtTick = 0;
        unit.peaRecoveryBoostMultiplier = 0;
    }
    resolvePeaRecoveryBoosts(units) {
        for (const UNIT_LOCAL of units) {
            if (UNIT_LOCAL.hp <= 0) {
                this.clearPeaRecoveryBoost(UNIT_LOCAL);
                continue;
            }
            if (
                UNIT_LOCAL.peaCounterPending &&
                UNIT_LOCAL.down <= 0 &&
                UNIT_LOCAL.stun <= 0 &&
                UNIT_LOCAL.z <= 0.1 &&
                UNIT_LOCAL.landingRecovery <= 0 &&
                UNIT_LOCAL.dropLanded
            ) {
                UNIT_LOCAL.peaCounterPending = false;
                UNIT_LOCAL.peaCounterExpiresAtTick = this.simulationTick + 60;
            }
            if (UNIT_LOCAL.peaCounterExpiresAtTick < this.simulationTick) {
                UNIT_LOCAL.peaCounterExpiresAtTick = 0;
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
    solveContactSeparations(units, dt, bodiesCached = false) {
        if (this.tower.active && this.battleCommand === 'scatter') {
            this._prepareArmySpacing();
        }
        this._ensureContactSolverBuffers(units.length);
        // Body geometry does not change inside a Jacobi solve. Cache it once,
        // rather than evaluating authored shape/grade/giant getters per pair.
        if (!bodiesCached) {
            this._cacheBattleBodies(units);
        }
        const CORRECTION_X = this._contactCorrectionX,
            CORRECTION_Y = this._contactCorrectionY,
            CORRECTION_COUNT = this._contactCorrectionCount,
            BODY_RADIUS = this._battleRadius,
            BODY_HEIGHT = this._battleHeight,
            BODY_INVERSE_MASS = this._battleInverseMass,
            SCATTER_COMMAND = this.tower.active && this.battleCommand === 'scatter',
            QUERY_GAP = SCATTER_COMMAND ? CONFIG.farm.deploy.scatterGap : 0.22,
            ITERATIONS = CONFIG.physics.separationIterations,
            SOFT_FACTOR = 1 - Math.exp((-CONFIG.physics.softSeparationRate * dt) / ITERATIONS);
        let maximumRadius = 0;
        for (let index = 0; index < units.length; index++) {
            maximumRadius = Math.max(maximumRadius, BODY_RADIUS[index]);
        }
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
                const INVERSE_MASS_A = BODY_INVERSE_MASS[i];
                const PENDING = this._collectContactOrders(
                    UNIT_LOCAL,
                    i + 1,
                    units.length - 1,
                    this._contactPending,
                    BODY_RADIUS[i] + maximumRadius + QUERY_GAP,
                    i,
                    QUERY_GAP,
                );
                for (const J of PENDING) {
                    const OTHER = units[J];
                    if (this.isMergeTaskMaterial(OTHER)) {
                        continue;
                    }
                    if (UNIT_LOCAL.z > OTHER.z + BODY_HEIGHT[J] || OTHER.z > UNIT_LOCAL.z + BODY_HEIGHT[i]) {
                        continue;
                    }
                    const DX = OTHER.x - UNIT_LOCAL.x,
                        DY = OTHER.y - UNIT_LOCAL.y,
                        DISTANCE = Math.hypot(DX, DY),
                        RADIUS = BODY_RADIUS[i] + BODY_RADIUS[J],
                        INVERSE_MASS_B = BODY_INVERSE_MASS[J],
                        INVERSE_MASS_SUM = INVERSE_MASS_A + INVERSE_MASS_B;
                    if (INVERSE_MASS_SUM <= 0) {
                        continue;
                    }
                    const SCATTER =
                            SCATTER_COMMAND &&
                            hasFaction(UNIT_LOCAL, FACTION_CONFIG.PLAYER) &&
                            hasFaction(OTHER, FACTION_CONFIG.PLAYER),
                        GAP =
                            SCATTER && !(this._armyAttackTurns.has(UNIT_LOCAL) && this._armyAttackTurns.has(OTHER))
                                ? CONFIG.farm.deploy.scatterGap
                                : 0.22,
                        SOFT =
                            DISTANCE >= RADIUS &&
                            DISTANCE < RADIUS + GAP &&
                            UNIT_LOCAL.z < 0.1 &&
                            OTHER.z < 0.1 &&
                            (SCATTER || (UNIT_LOCAL.ability.phase === 'idle' && OTHER.ability.phase === 'idle')),
                        TARGET_DISTANCE = SOFT ? RADIUS + GAP : RADIUS;
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
                    MAX_CORRECTION = Math.max(0.05, BODY_RADIUS[i] * 1.25);
                if (LENGTH > MAX_CORRECTION) {
                    const SCALE = MAX_CORRECTION / LENGTH;
                    deltaX *= SCALE;
                    deltaY *= SCALE;
                }
                UNIT_LOCAL.x += deltaX;
                UNIT_LOCAL.y += deltaY;
                this.boundBody(UNIT_LOCAL, this.scene, BODY_RADIUS[i]);
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
    separateBossUnitsJacobi(units, boss = this.boss) {
        const BOSS = boss;
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
                UNIT_LOCAL.z > BOSS.z + BOSS.height ||
                UNIT_LOCAL.z + UNIT_LOCAL.height < BOSS.z ||
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
    _pushBattlePair(first, second, opposing) {
        const COUNT = this._battlePairCount;
        if (COUNT >= this._battlePairA.length) {
            const CAPACITY = Math.max(256, this._battlePairA.length * 2),
                A = new Int32Array(CAPACITY),
                B = new Int32Array(CAPACITY),
                O = new Uint8Array(CAPACITY);
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
        const RADIUS = this._battleRadius,
            HEIGHT = this._battleHeight;
        const MARGIN = CONFIG.physics.battleNeighborMargin,
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
                this._pushBattlePair(i, J, areOpposingFactions(UNIT_LOCAL, units[J]));
            }
        }
    }
    battleContacts(units) {
        this._collectBattlePairs(units);
        // Bump impulses and stuns only apply between opposing sides. Allies just separate.
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
        const CORRECTION_X = this._contactCorrectionX,
            CORRECTION_Y = this._contactCorrectionY,
            CORRECTION_COUNT = this._contactCorrectionCount,
            MOVED = this._battleMoved,
            PAIR_A = this._battlePairA,
            PAIR_B = this._battlePairB,
            PAIR_OPPOSING = this._battlePairOpposing,
            RADIUS = this._battleRadius,
            INVERSE_MASS = this._battleInverseMass,
            ITERATIONS = CONFIG.physics.battleSeparationIterations,
            RELAXATION = CONFIG.physics.separationRelaxation,
            ALLY_SCALE = 1 - CONFIG.physics.battleAllyOverlap;
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
        // Impulses only change velocity/stun, not body geometry or mass. Share the
        // existing solver cache across this pass and the following Jacobi solve.
        this._cacheBattleBodies(units);
        const RADIUS = this._battleRadius,
            HEIGHT = this._battleHeight,
            INVERSE_MASS = this._battleInverseMass,
            GAP = this.tower.active && this.battleCommand === 'scatter' ? CONFIG.farm.deploy.scatterGap : 0.22;
        for (let i = 0; i < units.length; i++) {
            const UNIT_LOCAL = units[i],
                PENDING = this._collectContactOrders(
                    UNIT_LOCAL,
                    i + 1,
                    units.length - 1,
                    this._contactPending,
                    RADIUS[i] + CONFIG.unit.maxRadius + GAP,
                    i,
                );
            if (this.isMergeTaskMaterial(UNIT_LOCAL)) {
                continue;
            }
            for (const J of PENDING) {
                if (this.isMergeTaskMaterial(units[J])) {
                    continue;
                }
                if (
                    contact(
                        UNIT_LOCAL,
                        units[J],
                        RADIUS[i] + RADIUS[J],
                        HEIGHT[i],
                        HEIGHT[J],
                        INVERSE_MASS[i],
                        INVERSE_MASS[J],
                    )
                ) {
                    this.metrics.contacts++;
                }
            }
        }
        this.solveContactSeparations(units, dt, true);
    }
    resolveFarmContactPairs(units) {
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
        if (!unit || this.scene !== 'farm' || unit.hp <= 0 || unit.fed || !this._groundedFoodCount) {
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
    outsideFarm(x, y) {
        return !ARENA_GEOMETRY.inside({ x, y }, 'farm');
    }
    boundBody(body, scene, margin) {
        const ARENA = ARENA_GEOMETRY.arena(scene === this.scene ? this : scene),
            RX = ARENA.radiusX - margin,
            RY = ARENA.radiusY - margin;
        if (body.workOut) {
            // A builder on its way to another cell of the grid walks out of the farm; it is held again once back.
            if (Math.abs(body.x) <= RX && Math.abs(body.y) <= RY) {
                body.workOut = false;
            } else {
                return;
            }
        }
        if (ARENA.shape === 'rect') {
            const X = CLAMP(body.x, -RX, RX),
                Y = CLAMP(body.y, -RY, RY);
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
        const K = Math.max(1, Math.hypot(body.x / RX, body.y / RY));
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
            if (this.tower.active && this.battleCommand === 'scatter' && hasFaction(u, FACTION_CONFIG.PLAYER)) {
                u.scatterAttackCount++;
            }
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
            ATTACKER_STATS = resolveUnitStats(u);
        return {
            source: u,
            sourceKind: 'direct',
            attackerStats: ATTACKER_STATS,
            damageMultiplier: Number.isFinite(attackMultiplier) ? attackMultiplier : SPEC.skillMultiplier,
            kind: attackKind || SPEC.kind,
            buffed: false,
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
        const STATS = resolveUnitStats(target),
            ABILITY_ARMOR = target.ability?.armorModifier?.(this, this.simulationTick) || 0,
            ROLE_ARMOR = target.controller?.armorModifier?.() || 0;
        return {
            maxHp: STATS.maxHp,
            armor: BarleyArmorShredModel.effectiveArmor(
                target,
                STATS.armor,
                (target.giantUntil > this.time ? 100 : 0) + ABILITY_ARMOR + ROLE_ARMOR,
                this.simulationTick,
            ),
        };
    }
    damageCombatTarget(u, action, target, point, options = {}) {
        return this.mutateUnits(this._damageCombatTarget, u, action, target, point, options);
    }
    _damageCombatTarget(u, action, target, point, options = {}) {
        const IS_BOSS = this.isBoss(target);
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
            } = CONTEXT;
        CONTEXT.hitTargets?.add(target);
        const DEFENSE = this.combatTargetDefense(target),
            CRITICAL_BONUS =
                KIND === abilityProfile(SOURCE.species).kind
                    ? this.riceCriticalChanceBonus(SOURCE, target.hp, DEFENSE.maxHp)
                    : 0,
            SOURCE_STAT_OVERRIDES = {
                ...CONTEXT.sourceStatOverrides,
                critChance: CONTEXT.criticalChanceSnapshot ?? CLAMP(ATTACKER_STATS.critChance + CRITICAL_BONUS, 0, 1),
            };
        // A coloured unit's hit against the floor band's enemies carries element damage.
        const HIT_ELEMENT =
                SOURCE.faction === FACTION_CONFIG.PLAYER && target.faction === FACTION_CONFIG.ENEMY
                    ? elementOf(SOURCE.genes)
                    : 0,
            ELEMENT_SCALE = elementHitScale(HIT_ELEMENT, towerElement(this.tower.floor)),
            RAW_BASE_DAMAGE =
                ATTACKER_STATS.attackPower *
                (CONTEXT.attackPowerMultiplier ?? (SOURCE.giantUntil > this.time ? 3 : 1)) *
                DAMAGE_MULTIPLIER *
                ELEMENT_SCALE,
            RAW_DAMAGE = Number.isFinite(CONTEXT.sourceDamageScale)
                ? (RAW_BASE_DAMAGE * CONTEXT.sourceDamageScale + (CONTEXT.rawDamageBonus || 0)) *
                  this.passiveReceivedScale(target, DEFENSE.maxHp)
                : (RAW_BASE_DAMAGE + (SOURCE.ability?.rawDamageBonus?.(this, action, KIND) || 0)) *
                  this.passiveDamageScale(SOURCE, ATTACKER_STATS.maxHp, target, DEFENSE.maxHp);
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
            this.passiveUndying(target);
        }
        const CRITICAL_RAW_DAMAGE =
            RAW_DAMAGE *
            (DAMAGE.critical ? (SOURCE_STAT_OVERRIDES.critMultiplier ?? ATTACKER_STATS.critMultiplier ?? 1) : 1);
        target.ability?.receiveRawDamage?.(this, CRITICAL_RAW_DAMAGE, SOURCE, action);
        if (!IS_BOSS) {
            this._syncUnitAliveCount(target);
        }
        for (const [ROLE, FACTION] of [
            ['player', FACTION_CONFIG.PLAYER],
            ['boss', FACTION_CONFIG.ENEMY],
        ]) {
            this.onCombatResolved.emit({
                role: ROLE,
                sourceFaction: SOURCE.faction,
                targetFaction: target.faction,
                excluded: SOURCE.isFormationClone,
                damageDealt:
                    SOURCE.faction === FACTION
                        ? DAMAGE.totalActualLoss /
                          (Number.isFinite(CONTEXT.sourceDamageScale)
                              ? CONTEXT.attackPowerMultiplier
                              : SOURCE.giantUntil > this.time
                                ? 3
                                : 1)
                        : 0,
                damageTaken: target.faction === FACTION && !target.isFormationClone ? DAMAGE.totalActualLoss : 0,
                hits: SOURCE.faction === FACTION ? 1 : 0,
                critHits: SOURCE.faction === FACTION && DAMAGE.critical ? 1 : 0,
            });
        }
        if (!options.suppressBasicProc) {
            this.applyGrainOnBasicHit(SOURCE, target, KIND);
            SOURCE.ability?.afterSuccessfulAttack?.(this, action, target, DAMAGE);
        }
        const STRENGTH = DAMAGE_MULTIPLIER * (DAMAGE.critical ? ATTACKER_STATS.critMultiplier : 1);
        if (IS_BOSS) {
            this.finishBossHit(SOURCE, action, target, point, CONTEXT, DAMAGE, STRENGTH, HIT_ELEMENT);
        } else {
            this.finishUnitHit(SOURCE, action, target, point, CONTEXT, DAMAGE, STRENGTH);
        }
        return true;
    }
    finishBossHit(u, action, boss, point, { kind, strikeIndex, buffed }, damage, strength, element) {
        if (boss.hp <= 0) {
            this.handleUnitDeath(boss);
        }
        boss.flash = 0.13;
        const DX = point.x - boss.x,
            DY = point.y - boss.y,
            D_LOCAL = Math.hypot(DX, DY) || 1;
        this.combat('boss-hit', {
            targetId: boss.id,
            unit: u.id,
            ownerId: u.ownerId,
            species: u.species,
            attackId: action.id,
            strikeIndex,
            attackKind: kind,
            buffed,
            critical: damage.critical,
            damage: damage.totalActualLoss,
            element,
            elementMultiplier: element ? elementMultiplier(element, towerElement(this.tower.floor)) : 1,
            x: boss.x + (DX / D_LOCAL) * boss.radius,
            y: boss.y + (DY / D_LOCAL) * boss.radius,
            z: CLAMP(point.z + 0.2, 0.2, boss.height),
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
            damage: damage.totalActualLoss,
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

            for (const BOSS of this.bosses) {
                BOSS.flash = Math.max(0, (BOSS.flash || 0) - dt);
            }
        } finally {
            if (BATCH) {
                this._endSpatialQueryBatch();
            }
        }
    }
    _armyThreatsForTick() {
        if (this._armyThreatTick !== this.simulationTick) {
            this._armyThreatTick = this.simulationTick;
            this._armyThreats.length = 0;
            for (const ACTOR of this.combatUnits()) {
                if (ACTOR.hp > 0 && hasFaction(ACTOR, FACTION_CONFIG.ENEMY)) {
                    this._armyThreats.push(ACTOR);
                }
            }
        }
        return this._armyThreats;
    }
    _retreatArmyUnit(unit, dt) {
        const THREATS = this._armyThreatsForTick(),
            SPEED = scaleMoveSpeed(unit.bodyProfile ? 1 : 4.1, unit);
        if (!THREATS.length) {
            unit.vx = unit.vy = 0;
            return;
        }
        let awayX = 0,
            awayY = 0;
        for (const THREAT of THREATS) {
            const DX = unit.x - THREAT.x,
                DY = unit.y - THREAT.y,
                LENGTH = Math.hypot(DX, DY) || 1,
                GAP = Math.max(0.5, LENGTH - THREAT.radius - unit.radius),
                WEIGHT = 1 / (GAP * GAP);
            awayX += (DX / LENGTH) * WEIGHT;
            awayY += (DY / LENGTH) * WEIGHT;
        }
        const DIRECTION = Math.abs(awayX) + Math.abs(awayY) > 1e-6 ? Math.atan2(awayY, awayX) : unit.seed * Math.PI * 2,
            LOOK_AHEAD = Math.max(1.5, SPEED * 0.6);
        let bestScore = -Infinity,
            bestX = unit.x,
            bestY = unit.y;
        // Compare reachable directions, not an unreachable point beyond a wall.
        // Tangential candidates let troops escape walls and two-sided pressure.
        for (let index = 0; index < 12; index++) {
            const ANGLE = DIRECTION + (index * Math.PI) / 6,
                POINT = ARENA_GEOMETRY.clamp(
                    { x: unit.x + Math.cos(ANGLE) * LOOK_AHEAD, y: unit.y + Math.sin(ANGLE) * LOOK_AHEAD },
                    this,
                    unit.radius + 0.1,
                ),
                TRAVEL = Math.hypot(POINT.x - unit.x, POINT.y - unit.y);
            if (TRAVEL < 0.12) {
                continue;
            }
            let safety = Infinity;
            for (const THREAT of THREATS) {
                safety = Math.min(safety, Math.hypot(POINT.x - THREAT.x, POINT.y - THREAT.y) - THREAT.radius);
            }
            const SCORE = safety + TRAVEL * 0.12 + Math.cos(ANGLE - DIRECTION) * 0.05;
            if (SCORE > bestScore) {
                bestScore = SCORE;
                bestX = POINT.x;
                bestY = POINT.y;
            }
        }
        this.steer(unit, bestX, bestY, dt, SPEED);
    }
    _prepareArmySpacing() {
        if (this._armySpacingTick !== this.simulationTick) {
            this._armySpacingTick = this.simulationTick;
            this._armySpacingRadius = 0;
            this._armySpacingRadii.clear();
            this._armyAttackTurns.clear();
            const CANDIDATES = [];
            for (const ALLY of this.units) {
                if (ALLY.hp > 0 && hasFaction(ALLY, FACTION_CONFIG.PLAYER)) {
                    const RADIUS = ALLY.radius;
                    this._armySpacingRadius = Math.max(this._armySpacingRadius, RADIUS);
                    this._armySpacingRadii.set(ALLY, RADIUS);
                    if (ALLY.dropLanded) {
                        CANDIDATES.push(ALLY);
                    }
                }
            }
            // Successful launches rotate the scarce approach space. Priority is
            // checkpointed on the actor, so the same inner troops cannot monopolize it.
            CANDIDATES.sort((a, b) => a.scatterAttackCount - b.scatterAttackCount || a.id - b.id);
            const LIMIT = Math.ceil(
                Math.min(CANDIDATES.length, CONFIG.farm.deploy.maxFrontline) * CONFIG.farm.deploy.scatterAttackShare,
            );
            for (const ALLY of CANDIDATES.slice(0, LIMIT)) {
                this._armyAttackTurns.add(ALLY);
            }
        }
    }
    _scatterArmyUnit(unit, dt, enemy, attackDistance) {
        this._prepareArmySpacing();
        if (this._armyAttackTurns.has(unit)) {
            return false;
        }
        const GAP = CONFIG.farm.deploy.scatterGap,
            QUERY_RADIUS = unit.radius + this._armySpacingRadius + GAP * 2.5;
        this.unitSpatial.queryAABB(
            unit.x - QUERY_RADIUS,
            unit.y - QUERY_RADIUS,
            unit.x + QUERY_RADIUS,
            unit.y + QUERY_RADIUS,
            this._armySpacingNeighbors,
        );
        const DESTINATION = scatterDestination(
            unit,
            this._armySpacingNeighbors,
            this._armyThreatsForTick(),
            GAP,
            ARENA_GEOMETRY.bounds(this, unit.radius + 0.1),
            enemy,
            attackDistance,
            this._armySpacingRadii,
        );
        if (!DESTINATION) {
            unit.vx = unit.vy = 0;
            return true;
        }
        this.steer(unit, DESTINATION.x, DESTINATION.y, dt, scaleMoveSpeed(unit.bodyProfile ? 1 : 4.1, unit));
        return true;
    }
    battleUnit(u, dt, enemy = null) {
        if (!u.dropLanded || (enemy && !areOpposingFactions(u, enemy))) {
            return;
        }
        if (u.hp <= 0) {
            u.down = CONFIG.unit.corpseRecoverySeconds;
            u.ability.interrupt();
            u.specialAbility?.interrupt();
            this.clearPeaRecoveryBoost(u);
            return;
        }
        const RETREAT = this.tower.active && this.battleCommand === 'retreat' && hasFaction(u, FACTION_CONFIG.PLAYER),
            PARALLEL_GUARD = u.ability.guardAlongsideAttack?.(this);
        if (RETREAT && u.ability.phase === 'windup') {
            u.ability.interrupt();
        }
        if (PARALLEL_GUARD && !RETREAT) {
            u.ability.tryStartGuard(this);
        }
        const ACTIVE_ATTACK = u.specialAbility && u.specialAbility.phase !== 'idle' ? u.specialAbility : u.ability;
        const ATTACK_BUSY = ACTIVE_ATTACK.update(this, dt);
        if (RETREAT) {
            if (
                u.stun > 0 ||
                u.down > 0 ||
                u.z > 0.1 ||
                u.landingRecovery > 0 ||
                ACTIVE_ATTACK.phase === 'active' ||
                ACTIVE_ATTACK.phase === 'windup'
            ) {
                return;
            }
            this._retreatArmyUnit(u, dt);
            return;
        }
        if (ATTACK_BUSY || u.stun > 0 || u.z > 0.1 || u.landingRecovery > 0) {
            return;
        }
        if (!PARALLEL_GUARD && u.ability.isGuarding?.(this.simulationTick)) {
            return;
        }
        if (!enemy) {
            return;
        }
        const B_LOCAL = enemy,
            DX = u.x - B_LOCAL.x,
            DY = u.y - B_LOCAL.y,
            N = Math.hypot(DX, DY) || 1,
            TARGET_ID = enemy.id;
        // Hold the current firing bearing. Ranged troops retreat from a boss that closes in;
        // they never follow a rotating slot through its body to reach the opposite side.
        const BEHAVIOR = unitCapabilityComposition(u.species),
            STAND = B_LOCAL.radius + u.ability.attackRange(this),
            MIN = STAND - 0.55,
            MAX = STAND + BEHAVIOR.outerRangeSlack;
        if (
            this.tower.active &&
            this.battleCommand === 'scatter' &&
            hasFaction(u, FACTION_CONFIG.PLAYER) &&
            this._scatterArmyUnit(u, dt, enemy, MAX)
        ) {
            return;
        }
        if (N > MAX || (BEHAVIOR.retreatWithinRange && N < MIN)) {
            const SLOT = ARENA_GEOMETRY.clamp(
                {
                    x: B_LOCAL.x + (DX / N) * (STAND - (u.species === 4 ? 0.1 : 0)),
                    y: B_LOCAL.y + (DY / N) * (STAND - (u.species === 4 ? 0.1 : 0)),
                },
                this,
                u.radius,
            );
            // A ranged actor at the wall can fire within its existing maximum
            // range instead of endlessly steering toward a clamped retreat point.
            if (N > MAX || Math.hypot(SLOT.x - u.x, SLOT.y - u.y) > 0.08) {
                this.steer(u, SLOT.x, SLOT.y, dt, scaleMoveSpeed(u.bodyProfile ? 1 : 4.1, u));
                return;
            }
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
            N <= B_LOCAL.radius + SPECIAL_ABILITY.spec.range + (u.tier - 1) * 0.12 + u.attackRangeOffset
        ) {
            SPECIAL_ABILITY.begin(this, TARGET);
            return;
        }
        if (!PARALLEL_GUARD && u.ability.tryStartGuard?.(this, TARGET)) {
            return;
        }
        u.ability.begin(this, TARGET);
    }
    finishFarmBossEvent(outcome) {
        return this.mutateUnits(this._finishFarmBossEvent, outcome);
    }
    _finishFarmBossEvent(outcome) {
        if (this.scene !== 'farm' || this.farmBossEvent.phase !== 'fighting') {
            return false;
        }
        if (outcome === 'victory' && this.bossEncounter && !this.bossEncounter.completed) {
            return false;
        }
        this.formationSkills.end();
        this.cleanupBattleSummons();
        // A cleared floor keeps the hand for the next one; any other ending sends everyone back to the farm.
        const SUMMIT = outcome === 'victory' && this.tower.active && this.tower.floor === CONFIG.farm.tower.topFloor,
            CLIMBING = outcome === 'victory' && this.tower.active;
        if (!CLIMBING) {
            this._clearRunStats();
            this.tower.active = false;
            this.runProgressionSnapshot = null;
            this.tower.doors = [];
            this._benched.clear();
            this._benchRevision++;
            this._unitSpatialDirty = true;
        }
        for (const BOSS of this.bosses) {
            BOSS.active = false;
            BOSS.patternRuntime.active = null;
        }
        this.projectiles = [];
        this.chestnutAttacks = [];
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
            const REWARD_BOSS = this.bosses[0];
            const EVENT_STAGE = REWARD_BOSS.stage,
                STAGE_STATS = bossStageStats(EVENT_STAGE),
                BEST = this.playerProgression.towerBest,
                KIND = CONFIG.farm.tower[this.tower.floor ? this.tower.kind : 'battle'];
            this.tower.record = EVENT_STAGE > BEST;
            if (this.tower.record) {
                this.playerProgression.towerBest = EVENT_STAGE;
            }
            // Every win pays by its floor and kind; a floor higher than ever before pays double.
            const REWARD_SCALE = KIND.reward * (this.tower.record ? BOSS_REWARD_SETTINGS.recordMultiplier : 1),
                // Every boss is the plain sprout, so the seed it drops, and the species whose mastery the win feeds,
                // is drawn from the first-tier species.
                DROP_SPECIES =
                    SEED_SPECIES[Math.floor(lineageRandom(this.seed, ENCOUNTER_ID, 3)() * SEED_SPECIES.length)],
                FIRST_CLEAR = !bossSpeciesOwned(this, DROP_SPECIES),
                SETTLEMENT = settleBossKill(this, {
                    encounterId: ENCOUNTER_ID,
                    source: 'farm',
                    stage: EVENT_STAGE,
                    species: DROP_SPECIES,
                    tier: 1,
                    x: REWARD_BOSS.x,
                    y: REWARD_BOSS.y,
                    firstClear: FIRST_CLEAR,
                    rollBudget: STAGE_STATS.rollBudget * REWARD_SCALE,
                    xpAmount: STAGE_STATS.xp * REWARD_SCALE,
                });
            const REWARD = SETTLEMENT.receipt;
            if (this.tower.rewardRunId) {
                const OVERALL = awardTowerFloorXp(
                    this.playerProgression,
                    this.tower.rewardRunId,
                    EVENT_STAGE,
                    KIND.reward,
                );
                this.playerProgression = OVERALL.state;
                this.combat('tower-overall-xp', {
                    floor: EVENT_STAGE,
                    xp: OVERALL.xpAwarded,
                    levelsGained: OVERALL.levelsGained,
                });
            }
            this.combat('farm-boss-xp', {
                encounterId: ENCOUNTER_ID,
                species: DROP_SPECIES,
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
        if (SUMMIT) {
            this.tower.phase = 'summit';
            this.tower.summitElapsed = 0;
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
        return bossAttackArea(this.boss, unitRadius, this);
    }
    livingBossTargets() {
        return this.units
            .filter((u) => hasFaction(u, FACTION_CONFIG.PLAYER) && u.hp > 0 && u.dropLanded)
            .sort((a, b) => a.id - b.id);
    }
    nearestBossTarget(living, groundOnly = false, boss = this.boss) {
        const B_LOCAL = boss;
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
    bossTargetGrid(_living, boss = this.boss) {
        if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
            this._rebuildUnitSpatialIndex(this.units);
        }
        const B_LOCAL = boss,
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
    eachBossGridUnit(grid, minX, minY, maxX, maxY, visit, groundOnly = false, boss = this.boss) {
        this.unitSpatial.queryAABB(minX, minY, maxX, maxY, this._bossQueryCandidates);
        const B_LOCAL = boss;
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
    chargeBossTarget(living, grid = null, boss = this.boss) {
        grid ||= this.bossTargetGrid(living, boss);
        const B_LOCAL = boss,
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
                    this,
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
                undefined,
                boss,
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
    leapBossTarget(living, grid = null, boss = this.boss) {
        grid ||= this.bossTargetGrid(living, boss);
        const B_LOCAL = boss,
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
                    this,
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
                boss,
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
    bossPatternTargets(living, boss = this.boss) {
        const GRID = this.bossTargetGrid(living, boss);
        return {
            nearest: this.nearestBossTarget(living, true, boss),
            charge: this.chargeBossTarget(living, GRID, boss),
            leap: this.leapBossTarget(living, GRID, boss),
        };
    }
    bossTargetForPattern(id, living, boss = this.boss) {
        const BEHAVIOR = BOSS_BEHAVIORS.forId(id);
        return BEHAVIOR ? BEHAVIOR.target(this, living, boss) : this.nearestBossTarget(living, true, boss);
    }
    eligibleBossPatterns(living, targets = null, boss = this.boss) {
        targets ||= this.bossPatternTargets(living, boss);
        const RUNTIME = boss.patternRuntime,
            ALIVE_ADDS = this.units.reduce((n, u) => n + (hasFaction(u, FACTION_CONFIG.ENEMY) && u.hp > 0 ? 1 : 0), 0),
            ELIGIBLE = [];
        for (const ID of BOSS_PATTERN_IDS) {
            if (RUNTIME.cooldowns[ID] > 1e-9 || this.bossHpRatioFor(boss) > BOSS_PATTERN_CONFIG[ID].unlockHp) {
                continue;
            }
            const BEHAVIOR = BOSS_BEHAVIORS.forId(ID);
            if (BEHAVIOR.eligible(this, targets, ALIVE_ADDS, boss) && this.bossAttackWorthIt(BEHAVIOR, targets, boss)) {
                ELIGIBLE.push(ID);
            }
        }
        return ELIGIBLE;
    }
    // An area attack is used only when it deals more in total than the basic attack's one strong hit.
    bossAttackWorthIt(behavior, targets, boss = this.boss) {
        if (behavior.id === BOSS_BASIC_ID) {
            return true;
        }
        const HITS = behavior.expectedHits(this, targets, boss);
        return (
            HITS === null ||
            bossAttackTotal(behavior.config.damageMultiplier, HITS) >
                bossAttackTotal(BOSS_PATTERN_CONFIG[BOSS_BASIC_ID].damageMultiplier, 1)
        );
    }
    // Whether the unit's body touches the wedge from the boss out to `range` around bearing `aim`, `half` to each side.
    bossWedgeContains(unit, range, aim, half, boss = this.boss) {
        const DX = unit.x - boss.x,
            DY = unit.y - boss.y,
            D_LOCAL = Math.hypot(DX, DY);
        if (D_LOCAL > range + unit.radius) {
            return false;
        }
        const BEARING = Math.atan2(DY, DX),
            OFFSET = Math.atan2(Math.sin(BEARING - aim), Math.cos(BEARING - aim)),
            PAD = D_LOCAL <= unit.radius ? Math.PI : Math.asin(Math.min(1, unit.radius / Math.max(D_LOCAL, 1e-6)));
        return Math.abs(OFFSET) <= half + PAD;
    }
    // The units on the ground within `range` of a point (their bodies counted), nearest the boss first.
    bossGroundUnitsNear(x, y, range, boss = this.boss) {
        const EXTENT = range + CONFIG.unit.maxRadius;
        return this._nearestBossFirst(
            this._collectBossTargets(x - EXTENT, y - EXTENT, x + EXTENT, y + EXTENT, this._bossHitCandidates, true),
            boss,
        ).filter((unit) => Math.hypot(unit.x - x, unit.y - y) <= range + unit.radius);
    }
    beginBossPattern(id, target, boss = this.boss) {
        const B_LOCAL = boss,
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
    hitBossPatternUnit(unit, patternId, point, normal = null, boss = this.boss, options = null) {
        return this.mutateUnits(this._hitBossPatternUnit, unit, patternId, point, normal, boss, options);
    }
    // A hit knocks the unit back at once and queues its damage: the damage is shared among everyone hit in the same
    // moment, which is only known once the attack has looked at all of them (_settleBossHits).
    // `options.scale` weakens the hit (a lightning jump) and `options.repeat` lets a unit be hit again in one attack.
    _hitBossPatternUnit(unit, patternId, point, normal = null, boss = this.boss, options = null) {
        const B_LOCAL = boss,
            ACTION = B_LOCAL.patternRuntime.active,
            CONFIG_LOCAL = BOSS_PATTERN_CONFIG[patternId];
        if (
            !ACTION ||
            !CONFIG_LOCAL ||
            !hasFaction(unit, FACTION_CONFIG.PLAYER) ||
            !areOpposingFactions(B_LOCAL, unit) ||
            unit.hp <= 0 ||
            !unit.dropLanded ||
            (ACTION.hitIds.has(unit.id) && !options?.repeat)
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
        this._bossHitBatch.push({
            bossId: boss.id,
            unit,
            patternId,
            point: { x: point.x, y: point.y },
            nx: DX / N,
            ny: DY / N,
            guard: GUARD,
            scale: options?.scale ?? 1,
        });
        return true;
    }
    // The damage of the hits queued since the last call: each unit takes 35% of the attack plus its share of the other 65%.
    _settleBossHits(boss = this.boss) {
        const BATCH = this._bossHitBatch.filter((hit) => hit.bossId === boss.id),
            B_LOCAL = boss;
        if (!BATCH.length) {
            return;
        }
        const SHARE = BOSS_HIT_SPLIT.everyone + (1 - BOSS_HIT_SPLIT.everyone) / BATCH.length,
            STATS = resolveUnitStats(B_LOCAL),
            ACTION = B_LOCAL.patternRuntime.active;
        let criticalRoll = ACTION?.criticalRoll;
        const ROLL = () => {
            if (criticalRoll == null) {
                criticalRoll = this.random();
                if (ACTION) {
                    ACTION.criticalRoll = criticalRoll;
                }
            }
            return criticalRoll;
        };
        const CRITICAL = STATS.critChance > 0 && resolveCritical(STATS, ROLL());
        for (const HIT of BATCH) {
            const UNIT_LOCAL = HIT.unit,
                CONFIG_LOCAL = BOSS_PATTERN_CONFIG[HIT.patternId],
                ELEMENT_TAKEN = CONFIG_LOCAL.element ? elementDamageTaken(CONFIG_LOCAL.element, UNIT_LOCAL.genes) : 1;
            const RAW_DAMAGE =
                B_LOCAL.attackPower *
                (B_LOCAL.giantUntil > this.time ? 3 : 1) *
                CONFIG_LOCAL.damageMultiplier *
                SHARE *
                (this.bossEnraged ? BOSS_ENRAGE.damageMultiplier : 1) *
                (HIT.guard?.receivedDamageMultiplier ?? 1) *
                HIT.scale *
                ELEMENT_TAKEN *
                this.passiveDamageScale(B_LOCAL, B_LOCAL.maxHp, UNIT_LOCAL, unitMaxHpFor(UNIT_LOCAL));
            // The guard observes this unit's allocated pre-armor damage once,
            // before lethal damage can clear its guard state.
            UNIT_LOCAL.ability?.receiveRawDamage?.(
                this,
                RAW_DAMAGE * (CRITICAL ? STATS.critMultiplier : 1),
                B_LOCAL,
                HIT,
            );
            const RECEIVED = applyDamageToTargets(B_LOCAL, [UNIT_LOCAL], {
                armorForTarget: () => this.combatTargetDefense(UNIT_LOCAL).armor,
                rawDamage: RAW_DAMAGE,
                sourceKind: 'direct',
                area: true,
                roll: ROLL,
            });
            this.passiveUndying(UNIT_LOCAL);
            this.onCombatResolved.emit({
                damageTaken: RECEIVED.totalActualLoss,
                excluded: UNIT_LOCAL.isFormationClone,
            });
            if (!UNIT_LOCAL.isFormationClone) {
                this.onCombatResolved.emit({
                    role: 'boss',
                    sourceFaction: 'enemy',
                    sourceActor: 'boss',
                    targetFaction: UNIT_LOCAL.faction,
                    hits: 1,
                    critHits: RECEIVED.critical ? 1 : 0,
                    damageDealt: RECEIVED.totalActualLoss,
                });
            }
            this._syncUnitAliveCount(UNIT_LOCAL);
            if (UNIT_LOCAL.hp === 0) {
                UNIT_LOCAL.down = UNIT_LOCAL.isBattleOnlySummon ? 0 : CONFIG.unit.corpseRecoverySeconds;
                this.handleUnitDeath(UNIT_LOCAL);
            }
            this.metrics.directHits++;
            this.metrics[BOSS_BEHAVIORS.forId(HIT.patternId).hitMetric]++;
            this.combat('unit-hit', {
                attackKind: HIT.patternId,
                attackId: B_LOCAL.attackId,
                unit: UNIT_LOCAL.id,
                x: HIT.point.x,
                y: HIT.point.y,
                z: Math.max(0.15, UNIT_LOCAL.z + 0.25),
                nx: HIT.nx,
                ny: HIT.ny,
                strength: CONFIG_LOCAL.damageMultiplier * (RECEIVED.critical ? STATS.critMultiplier : 1),
                critical: RECEIVED.critical,
                element: CONFIG_LOCAL.element || 0,
                elementMultiplier: ELEMENT_TAKEN,
            });
        }
        this._bossHitBatch = this._bossHitBatch.filter((hit) => hit.bossId !== boss.id);
    }
    _nearestBossFirst(candidates, boss = this.boss) {
        const B_LOCAL = boss;
        return candidates.sort(
            (a, b) => Math.hypot(a.x - B_LOCAL.x, a.y - B_LOCAL.y) - Math.hypot(b.x - B_LOCAL.x, b.y - B_LOCAL.y),
        );
    }
    // Everyone within `range` of the boss's middle (so from its body outwards, no gap) whose bearing lies in the wedge
    // from..to, widened by the unit's own size. A sweep calls it each tick with the wedge its arm crossed since the last.
    resolveBossWedge(action, patternId, range, from, to, limit = Infinity, boss = this.boss) {
        const B_LOCAL = boss,
            AIM = (from + to) / 2,
            HALF = (to - from) / 2;
        let hits = 0;
        const EXTENT = range + CONFIG.unit.maxRadius;
        for (const UNIT_LOCAL of this._nearestBossFirst(
            this._collectBossTargets(
                B_LOCAL.x - EXTENT,
                B_LOCAL.y - EXTENT,
                B_LOCAL.x + EXTENT,
                B_LOCAL.y + EXTENT,
                this._bossHitCandidates,
                true,
            ),
            boss,
        )) {
            if (hits >= limit) {
                break;
            }
            if (action.hitIds.has(UNIT_LOCAL.id) || UNIT_LOCAL.z > 0.1) {
                continue;
            }
            if (!this.bossWedgeContains(UNIT_LOCAL, range, AIM, HALF, boss)) {
                continue;
            }
            const DX = UNIT_LOCAL.x - B_LOCAL.x,
                DY = UNIT_LOCAL.y - B_LOCAL.y,
                N = Math.hypot(DX, DY) || 1;
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
                    boss,
                )
            ) {
                hits++;
            }
        }
        return hits;
    }
    sweepBossBody(old, patternId, boss = this.boss) {
        const B_LOCAL = boss,
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
                    boss,
                );
            }
        }
    }
    bossMouthPoint(released, boss = this.boss) {
        return bossMouthWorldPoint(boss, released);
    }
    bossSummonLanding(angle, action = null, boss = this.boss) {
        const B_LOCAL = boss,
            SCENE = this,
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
    spawnBossMouthUnit(action, boss = this.boss) {
        return this.mutateUnits(this._spawnBossMouthUnit, action, boss);
    }
    _spawnBossMouthUnit(action, boss = this.boss) {
        if (action.released >= action.volleyCount) {
            return false;
        }
        const B_LOCAL = boss,
            LANDING = this.bossSummonLanding(action.aim, action, boss);
        if (!LANDING) {
            return false;
        }
        const MOUTH = this.bossMouthPoint(action.released + 1, boss);
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
            peanutInheritedPowerRank: 0,
            peanutInheritedSpeedRank: 0,
            battleSummonEncounterId: B_LOCAL.encounterId || 1,
            countsTowardPermanentRoster: false,
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
        UNIT_LOCAL.setStatModifiers(runStatModifiers(this.tower.active ? this.tower.bossCards : [], 'boss'));
        UNIT_LOCAL.setHealth(unitMaxHpFor(UNIT_LOCAL));
        this.addUnit(UNIT_LOCAL, { markProgress: false });
        action.released++;
        action.landingPoints ||= [];
        action.landingPoints.push(LANDING);
        boss.summonMouth = MOUTH;
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
    activateBossPattern(action, boss = this.boss) {
        const B_LOCAL = boss,
            RUNTIME = B_LOCAL.patternRuntime,
            CONFIG_LOCAL = BOSS_PATTERN_CONFIG[action.id];
        action.phase = 'active';
        action.phaseElapsed = 0;
        B_LOCAL.attackId = ++this.attackSerial;
        action.hitIds.clear();
        RUNTIME.cooldowns[action.id] = CONFIG_LOCAL.cooldown * (this.bossEnraged ? BOSS_ENRAGE.cooldownMultiplier : 1);
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
        BOSS_BEHAVIORS.forId(action.id).activate(this, action, boss);
    }
    enterBossPatternRecovery(action) {
        action.phase = 'recover';
        action.phaseElapsed = 0;
    }
};
export {
    GARDEN as Garden,
    UNIT as Unit,
    AttackCycle,
    CREATE_UNIT_ATTACK_CYCLE as createUnitAttackCycle,
    ATTACK_TYPES,
    ARENA_GEOMETRY as ArenaGeometry,
    BALLISTICS as Ballistics,
    CONFIG,
    CLAMP as clamp,
    MUTABLE_STATS as stats,
    bossAttackArea,
};
