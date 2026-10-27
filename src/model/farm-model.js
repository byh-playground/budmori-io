import { advanceChestnutAttacks } from '../features/species-growth/chestnut-attack.js';
import { applyOffline } from '../save/farm-offline.js';
import { Unit as UNIT } from './farm-unit.js';
import { FARM_FOOD_FIELD } from './farm-food-field.js';
import { FARM_CONTACT_SOLVER } from './farm-contact-solver.js';
import { FARM_MERGE_BREED } from './farm-merge-breed.js';
import { FARM_BOSS_PATTERNS } from './farm-boss-patterns.js';
import { FARM_TOWER_RUN } from './farm-tower-run.js';
import { assignWorkers, resetWork, stepWork, workOrder, workersBySpecies } from './farm-work.js';
import { FormationSkills } from '../formation/formation-skills.js';
import { createFormationRuntime } from '../formation/formation-skill-state.js';
import { Signal } from '../core/signal.js';
import {} from '../features/unit-body/definition.js';
import { seedProjectileDimensions } from '../features/projectiles/seed/definition.js';
import { MutationNotifications } from '../core/mutation-notifications.js';
import { UnitCollection } from './unit-collection.js';
import { FarmingRoster } from './farm-roster.js';
import {
    SEED_FEEDS,
    SEED_FEED_COOLDOWN_SECONDS,
    SEED_SPECIES,
    inheritGenes,
    inheritTemperament,
    lineageRandom,
    TEMPERAMENT_PASSIVE_IDS,
    elementHitScale,
    elementMultiplier,
    TEMPERAMENT_TILTS,
    rollSeedGenes,
    rollTemperament,
    elementOf,
    ELEMENT_COUNT,
    TEMPERAMENT_COUNT,
} from './lineage.js';
import { createSimulationScenes } from './simulation-scenes.js';
import { createProjectileBehaviors } from './projectile-behaviors.js';
import { createFarmBossEventPhases } from '../features/scenes/farm/boss-event-phases.js';
import { FARM_MODES } from './farm-mode-behaviors.js';
import { BarleyArmorShredModel } from '../features/abilities/barley-shred/model.js';
import { CornAttachmentModel } from '../features/abilities/corn-attachment/model.js';
const { SeededPRNG: SEEDED_PRNG } = globalThis.BloomGamekitDeterministic;
const { createBudgetedScheduler: CREATE_BUDGETED_SCHEDULER } = globalThis.BloomGamekitWorkScheduler;
import {
    resolveUnitStats,
    applyRunGrowthHealth,
    unitMaxHpFor,
    applyDamageToTargets,
    applyHealing,
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
    bossStageStats,
    settleBossKill,
    bossSpeciesOwned,
    grantPendingBossAcquisitions,
    advanceBossRewardCalculations,
    createBossRewardStreams,
} from '../boss/boss-rewards.js';
import { passiveCard, PASSIVE_SETTINGS, freshTowerRun } from '../tower/tower-run.js';
import { createPlayerProgressionState, farmCapacityForProgression, awardTowerFloorXp } from './player-progression.js';
import { towerElement } from '../tower/tower-theme.js';
import {} from '../units/species-catalog.js';
import { TOWER_ENCOUNTER_SETTINGS } from '../tower/tower-encounter.js';
import { createAbilityProgressionState } from '../abilities/ability-state.js';
import {} from '../vector-sockets.js';
import { purchaseAbilityNode, resetPlayerProgression } from '../abilities/ability-progression.js';
import { BOSS_PHASE_THRESHOLDS } from '../boss/boss-patterns.js';
import { FACTION_CONFIG, hasFaction, areOpposingFactions } from '../core/factions.js';
import { FixedSpatialGrid } from '../core/spatial-grid.js';
import { scatterDestination } from './army-scatter.js';
import { CONFIG, CLAMP, STATS, MUTABLE_STATS } from './farm-config.js';
import { bossAttackArea } from '../boss/boss-behaviors.js';
import { ARENA_GEOMETRY, BALLISTICS } from './arena-geometry.js';
import { AttackCycle, CREATE_UNIT_ATTACK_CYCLE } from '../units/attack-cycle.js';
import {} from '../boss/boss-controller.js';
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

const FARM_BOSS_PHASES = createFarmBossEventPhases(CONFIG);
const PROJECTILE_BEHAVIORS = createProjectileBehaviors({ Ballistics: BALLISTICS, ArenaGeometry: ARENA_GEOMETRY });

export const CREATE_UNIT_SPECIAL_ABILITY = (owner) => CREATE_UNIT_ATTACK_CYCLE.createSpecial(owner);
const SIMULATION_SCENES = createSimulationScenes({
    config: CONFIG,
    stats: STATS,
    createUnitAttackCycle: CREATE_UNIT_ATTACK_CYCLE,
    farmModes: FARM_MODES,
    bossEventPhases: FARM_BOSS_PHASES,
});
const GARDEN = class Garden extends FARM_TOWER_RUN(
    FARM_BOSS_PATTERNS(FARM_MERGE_BREED(FARM_CONTACT_SOLVER(FARM_FOOD_FIELD(Object)))),
) {
    constructor(seed = 731) {
        super();
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
            this._nextWorkerRefreshTick = 0;
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
        return !unit.seedling && this._workerIds.has(unit.id);
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
                    UNIT_LOCAL.seedling ||
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
    // One unit's walk to the tower door while the march lasts.
    // Where the tower door is: the middle of the back edge of the farm.
    get towerGate() {
        return { x: 0, y: CONFIG.farm.arena.radiusY };
    }
    // The march is over: whoever got to the door is inside, and the first floor starts.
    // Back out on the farm: the troops drop out of the tower door one after another and scatter over the whole farm. Each
    // one is already resting on its landing spot (so a save taken now is sound) but stays in hand until its turn.
    // The next troop whose turn has come leaves the door in an arc that lands on its spot.
    // Whoever is still in the door when something else begins is set down on its spot at once.
    // The next floor: its kind is drawn (tower-run.js) and its doors are what that kind offers. A fight offers its bosses,
    // a strengthening floor offers cards, an event floor offers events.
    // Between floors everybody waits in the hand; the fallen start sleeping for tier (max 3) floors.
    // The run's stat cards change every unit's stats; hit points never stay above the new top.
    // Stopping after a cleared floor keeps everything that was won.
    // The units that are on the field: everything but the ones still waiting in the hand.
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
    // The whole order at once: it must list every species exactly once.
    // Fill a bounded frontline in roughly 1.5 seconds, then refill casualties in
    // the same species priority. A summon never consumes a regular army slot.
    // Drops one waiting unit of the species (the strongest first) onto the spot.
    // Leaving a fight that is going on is a defeat.
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
    // A boss fight lasts 90 seconds at stage 1 and 10 seconds longer for every stage after it.

    // Sorts the units that may be merged right now into species-and-tier groups.
    // The closest pair for a recipe at one tier, or null.
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
    resolveContacts(units, dt = 1 / 20) {
        SIMULATION_SCENES[this.scene].resolveContacts(this, units, dt);
    }
    updateUnitSpatial(unit) {
        const START = this.profiler?.start();
        this.unitSpatial.update(unit);
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
    // One spatial pass per tick. The pair list is ordered by (first, second) step order, so the
    // accumulation order below is deterministic and identical on every peer.
    // Radius, height and mass are derived getters; read them once per tick instead of per pair.
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
    // An area attack is used only when it deals more in total than the basic attack's one strong hit.
    // Whether the unit's body touches the wedge from the boss out to `range` around bearing `aim`, `half` to each side.
    // The units on the ground within `range` of a point (their bodies counted), nearest the boss first.
    // A hit knocks the unit back at once and queues its damage: the damage is shared among everyone hit in the same
    // moment, which is only known once the attack has looked at all of them (_settleBossHits).
    // `options.scale` weakens the hit (a lightning jump) and `options.repeat` lets a unit be hit again in one attack.
    // The damage of the hits queued since the last call: each unit takes 35% of the attack plus its share of the other 65%.
    // Everyone within `range` of the boss's middle (so from its body outwards, no gap) whose bearing lies in the wedge
    // from..to, widened by the unit's own size. A sweep calls it each tick with the wedge its arm crossed since the last.
};
export {
    GARDEN as Garden,
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
