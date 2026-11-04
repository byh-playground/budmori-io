import { maximumUnitRadius } from '../features/unit-body/definition.js';
import { baseUnitStatsFor } from '../units/unit-stats.js';
import { BOSS_REWARD_SETTINGS } from '../boss/boss-rewards.js';
import { SPECIES_COUNT } from '../units/species-catalog.js';
import { FARM_BOSS_EVENT_MAX_STAGE } from './player-progression.js';
import { MAX_UNIT_TIER, MAX_GRADE_MATERIAL_COUNT } from '../units/unit-grades.js';
import { FACTION_CONFIG } from '../core/factions.js';
import { MAX_TOWER_MINIONS } from '../tower/tower-encounter.js';

// sim.js
const BREED_COOLDOWN_SECONDS = 10;

export const BREED_RESERVATION_OWNER = (aId, bId) => `breed:${Math.min(aId, bId)}:${Math.max(aId, bId)}`;

export const MERGE_RESERVATION_OWNER = (ids) => `merge:${[...ids].sort((a, b) => a - b).join(':')}`;

const FARM_MAX_UNITS = 500,
    MAX_PEANUT_SPLIT_CHILDREN = 2,
    // Boss minions alive at once: the largest summon band cap (tower-encounter.js).
    MAX_BOSS_SUMMONS = MAX_TOWER_MINIONS,
    BATTLE_ACTOR_CAPACITY = FARM_MAX_UNITS * (1 + MAX_PEANUT_SPLIT_CHILDREN) + MAX_BOSS_SUMMONS + 2000;

const WORLD_ARENA = Object.freeze({
    radiusX: 23,
    radiusY: 17,
});

const FARM_ARENA = Object.freeze({ radiusX: 23, radiusY: 17, shape: 'rect' });
const PILE_ART = Object.freeze({ radiusX: 0.86, baseScale: 0.95, foodScale: 0.5, hitSquash: 0.14 });
const PILE_WIDTH = 2 * PILE_ART.radiusX * (PILE_ART.baseScale + PILE_ART.foodScale) * (1 + PILE_ART.hitSquash);

// Runtime configuration is separate from saved world fields and their import
// migration. Only already-established capacity/growth relations are derived.
export const CONFIG = Object.freeze({
    factions: FACTION_CONFIG,
    farm: Object.freeze({
        arena: FARM_ARENA,
        capacity: Object.freeze({
            max: FARM_MAX_UNITS,
            battleUnits: BATTLE_ACTOR_CAPACITY,
        }),
        maxUnitId: 999999999,
        work: Object.freeze({
            secondsPerFood: 8,
            tierBonus: 0.5,
            refreshTicks: 20,
            defaultBasisPoints: 4000,
            maxFood: 50,
            pileKind: Object.freeze({ amount: 12 }),
            workersPerPile: 20,
            // Full pile artwork width, including its maximum hit squash.
            pileArt: PILE_ART,
            pileWidth: PILE_WIDTH,
            pileGap: 3 * PILE_WIDTH,
            pileRadiusX: FARM_ARENA.radiusX * 0.86,
            pileRadiusY: FARM_ARENA.radiusY * 0.86,
            pileRespawnSeconds: 3,
            starterUnits: 6,
        }),
        breeding: Object.freeze({
            cooldownSeconds: BREED_COOLDOWN_SECONDS,
            growthSeconds: BREED_COOLDOWN_SECONDS / 2,
            matureMeals: 3,
        }),
        offline: Object.freeze({
            capSeconds: 1800,
            minSeconds: 60,
            // Idle output is a share of what the workers would make while you watch.
            efficiency: 0.1,
        }),
        merge: Object.freeze({
            cooldownSeconds: 4,
            animationSeconds: 0.85,
            celebrationSeconds: 1,
            centerHeight: 1.8,
            resultFallVelocity: 0.2,
            maxMaterials: MAX_GRADE_MATERIAL_COUNT,
        }),
        // The regular frontline is the farm's whole capacity, fixed for one floor; owned units past it wait in reserve.
        deploy: Object.freeze({
            cooldownSeconds: 0.1,
            initialSeconds: 1.5,
            scatterGap: 2.4,
        }),
        // Draft numbers for the tower: every 5th floor is a mid-boss; fallen units sleep tier (max 3) floors.
        tower: Object.freeze({
            arena: Object.freeze({
                radiusX: FARM_ARENA.radiusX * 1.5,
                radiusY: FARM_ARENA.radiusY * 1.5,
                shape: 'rect',
            }),
            midBossEvery: 5,
            topFloor: FARM_BOSS_EVENT_MAX_STAGE,
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
            battle: Object.freeze({ hp: 1, attack: 1, edge: 0, reward: 1, xpMultiplier: 1 }),
            elite: Object.freeze({
                hp: 1.6,
                attack: 1.25,
                edge: 0.25,
                reward: BOSS_REWARD_SETTINGS.maxKindReward,
                xpMultiplier: 2,
            }),
            mid: Object.freeze({
                hp: 2.2,
                attack: 1.4,
                edge: 0.5,
                reward: BOSS_REWARD_SETTINGS.maxKindReward,
                xpMultiplier: 3,
            }),
        }),
        bossEvent: Object.freeze({
            fadeSeconds: 0.5,
            celebrationSeconds: 1,
        }),
    }),
    battle: Object.freeze({
        capacity: Object.freeze({
            battleUnits: BATTLE_ACTOR_CAPACITY,
            // At most three basic and three independent thorn slots per actor in flight;
            // reserve two extra slots for mixed legacy projectile overlap.
            projectiles: BATTLE_ACTOR_CAPACITY * 8 + 40,
        }),
        arena: WORLD_ARENA,
        dropHeight: 3,
    }),
    unit: Object.freeze({
        speciesCount: SPECIES_COUNT,
        maxTier: MAX_UNIT_TIER,
        maxRadius: maximumUnitRadius(MAX_UNIT_TIER),
        perceptionRange: 18,
        corpseRecoverySeconds: 60,
    }),
    boss: Object.freeze({
        summonIdBase: 5000000,
        basicReach: 6.2,
        sweepReach: 6.5,
        weaponRadius: 0.85,
        chaseSpeed: 2.65,
    }),
    physics: Object.freeze({
        gravity: 19,
        separationIterations: 4,
        separationRelaxation: 0.8,
        softSeparationRate: -Math.log(1 - 0.035) * 120,
    }),
});

export const CLAMP = (x, a, b) => Math.max(a, Math.min(b, x));

export const STATS = baseUnitStatsFor;

export const MUTABLE_STATS = (tier, species) => ({
    ...STATS(tier, species),
});
