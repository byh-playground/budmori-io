import { createFormationSkillState, createFormationRuntime } from './formation-skill-state.js';
import { createAbilityProgressionState } from './ability-state.js';
import { createRaidDeploymentCardsState } from './raid-deployment-cards.js';
import { createFarmPlotsProgression, INITIAL_FARM_PLOT_ID } from './farm-plot.js';
// Internal current-schema checkpoint shapes. Disk writes use farm-progress.js;
// runtime values are not exported as user saves.
export const UNIT_SNAPSHOT_SHAPE = {
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
        phase: 'idle',
        elapsed: 0,
        action: null,
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
    faction: 'player',
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
        y: 0,
    },
    hp: 40,
    down: 0,
    seed: 2.39996,
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
};
const STARTER_UNIT = (id, x, y) => ({
    ...UNIT_SNAPSHOT_SHAPE,
    id,
    generation: id,
    x,
    y,
    home: {
        x,
        y,
    },
    seed: id * 2.39996,
    growth: 3,
    growthElapsed: 5,
    ability: {
        phase: 'idle',
        elapsed: 0,
        action: null,
    },
});
const PATTERN_VALUES = (value) =>
    Object.fromEntries(
        [
            'attack.sweep-360',
            'attack.front-slam',
            'attack.charge',
            'attack.leap-slam',
            'attack.fan-sweep',
            'summon.mouth-t1',
        ].map((id) => [id, value]),
    );
const ABILITY_INVESTMENTS = () => createAbilityProgressionState().abilities;
export const FARM_SNAPSHOT_SHAPE = {
    seed: 731,
    notices: [],
    eventSequence: 0,
    mergeTasks: [],
    corpseRecoveryVersion: 1,
    rng: {
        state: 3031296687,
    },
    units: [
        STARTER_UNIT(1, 1.7868577390909195, -0.7556014072615653),
        STARTER_UNIT(2, -1.5288560669869184, -0.5486694728024304),
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
        firstClear: { rngState: 0, distributionState: null, payoutRngState: 0 },
    },
    bossRewardInventory: [],
    bossRewardWatermarks: {
        farm: 0,
        raid: 0,
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
            merge: 0,
        },
        farmPlots: createFarmPlotsProgression(),
        abilities: ABILITY_INVESTMENTS(),
        level: 1,
        experience: 0,
        farmBossEventStage: 1,
        processedBossKillReceipts: [],
    },
    starter: 0,
    materials: {
        wood: 0,
        stone: 0,
    },
    facilities: [],
    savedSite: null,
    foodTaps: {
        remainder: 0,
        autoClock: 0,
        produced: 0,
        revision: 0,
    },
    projectiles: [],
    entityGenerationSerial: 2,
    cornAttachments: {
        nextGroupId: 1,
        nextAttachmentId: 1,
        groups: [],
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
        selections: [],
    },
    scene: 'farm',
    running: false,
    encounter: {
        outcome: 'idle',
        elapsed: 0,
    },
    farmBossEvent: {
        phase: 'idle',
        elapsed: 0,
        outcome: 'idle',
        encounterId: 0,
        rewardStatus: 'none',
        rewardChance: 0,
        rewardRoll: 0,
        rewardUnitId: 0,
    },
    boss: {
        x: 0,
        y: 0,
        faction: 'enemy',
        z: 0,
        generation: 3,
        radius: 4.4,
        height: 5.2,
        hp: 2000,
        maxHp: 2000,
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
            encounterElapsed: 0,
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
            z: 0,
        },
    },
    raidExpectedPlayers: ['solo'],
    raidRosters: [],
    raidDeploymentStarted: false,
    metrics: {
        births: 0,
        merges: 0,
        directHits: 0,
        contacts: 0,
        landings: 0,
        basicHits: 0,
        sweepHits: 0,
    },
};

// A recipe selects internal checkpoint fields even when an entity gains enumerable
// caches, backreferences, or rendering helpers. Nullable/optional records and
// arrays have explicit recipes too; no runtime object is JSON-stringified.
const FIELDS = (names, nested = {}) => ({
    ...Object.fromEntries(
        names
            .split(' ')
            .filter(Boolean)
            .map((key) => [key, true]),
    ),
    ...nested,
});
function shapeFields(shape, nested = {}) {
    return Object.fromEntries(
        Object.entries(shape).map(([key, value]) => [
            key,
            nested[key] ??
                (Array.isArray(value) ? [true] : value && typeof value === 'object' ? shapeFields(value) : true),
        ]),
    );
}
const POINT = FIELDS('x y z id generation');
const PATH = FIELDS('height duration', {
    from: POINT,
    to: POINT,
});
const JSON_PAYLOAD = Symbol('json-payload');
const ATTACK = FIELDS(
    'id targetId targetGeneration hit resolvedMask hitMask peanutStrikeCount peanutAttackMultiplier peanutSpreadRadians leapDepartureCommitted leapCooldownResetApplied thornTargetId thornTargetGeneration thornShotsRemaining thornNextShotTick thornShotIndex',
    {
        target: POINT,
        path: PATH,
        pendingShots: [FIELDS('shotIndex delaySeconds attackMultiplier')],
        projectileAbility: {
            effect: FIELDS('abilityId', { config: JSON_PAYLOAD }),
        },
        thornConfig: JSON_PAYLOAD,
    },
);
const UNIT = shapeFields(UNIT_SNAPSHOT_SHAPE, {
    ability: {
        phase: true,
        elapsed: true,
        action: ATTACK,
    },
    specialAbility: {
        phase: true,
        elapsed: true,
        action: ATTACK,
    },
    wheatCommandBuffs: [FIELDS('level expiresAtTick')],
    barleyArmorShredBuckets: [FIELDS('expiresAtTick amount')],
});
const BOSS_ACTION = FIELDS('id phase phaseElapsed targetId aim locked traveled volleyCount released nextRelease', {
    target: POINT,
    start: POINT,
    path: PATH,
    hitIds: [true],
    landingPoints: [POINT],
});
const BOSS = shapeFields(FARM_SNAPSHOT_SHAPE.boss, {
    patternRuntime: shapeFields(FARM_SNAPSHOT_SHAPE.boss.patternRuntime, {
        active: BOSS_ACTION,
    }),
    barleyArmorShredBuckets: [FIELDS('expiresAtTick amount')],
});
const REWARD = FIELDS(
    'encounterId source receiptKey acquisitionMultiplier stage species tier x y firstClear chance baselineChance roll unitId rollBudget bonusRollChance rollCount boxCount successCount acquiredCount grantedCount placedCount queuedCount status xpReceiptKey xpStatus xpAmount levelsGained pointsAwarded',
    {
        calculation: JSON_PAYLOAD,
    },
);
// Events, notices, effects and log entries are value payloads, not entities.
// Their APIs and settlement summaries accept extensible JSON records. Keep
// that explicit open contract, including old keys, without opening entity,
// ability or projectile field selection to future runtime caches.
const SETTLEMENT = FIELDS(
    'key ownerId sessionId encounterId runSequence outcome status completedAtMs availableAtStart originalUnitsDeployed deploymentMultiplier',
    {
        sleptFarmUnitIds: [true],
        reward: JSON_PAYLOAD,
    },
);
const PROGRESSION = shapeFields(FARM_SNAPSHOT_SHAPE.playerProgression, {
    farmPlots: {
        plots: [FIELDS('id capacityLevel')],
        currentPlotId: true,
        nextPlotNumber: true,
        targetBasisPoints: [true],
    },
});
const RUNTIME_PROGRESSION = FIELDS('schemaVersion level availablePoints', {
    farmUpgrades: PROGRESSION.farmUpgrades,
    abilities: PROGRESSION.abilities,
    formationSkills: PROGRESSION.formationSkills,
    raidDeploymentCards: PROGRESSION.raidDeploymentCards,
});
const ROSTER = FIELDS(
    'ownerId settlementSessionId settlementRunSequence settlementEncounterId lastDeploySequence buffUntil buffReadyAt',
    {
        troops: [FIELDS('farmId species tier deployed')],
        deploymentCardSpecies: [true],
        abilitySnapshot: RUNTIME_PROGRESSION,
    },
);
const PROJECTILE = FIELDS(
    'isFormationClone id owner ownerGeneration targetId targetGeneration faction ownerId species tier elapsed x y z radius height hit attackMultiplier shotIndex projectileKind fanIndex',
    {
        path: PATH,
        attackPayload: JSON_PAYLOAD,
        cornPayload: JSON_PAYLOAD,
        abilityEffect: JSON_PAYLOAD,
    },
);
const CORN_ATTACHMENT = FIELDS(
    'id groupId targetId targetGeneration ownerId ownerGeneration damageMultiplier status fadeTicks angle offsetX offsetY',
    { payload: JSON_PAYLOAD },
);
const CORN_GROUP = FIELDS(
    'id targetId targetGeneration targetX targetY targetZ firstAttachTick closeAtTick nextExplosionTick status',
    { attachments: [CORN_ATTACHMENT] },
);
const SNAPSHOT_FIELDS = shapeFields(FARM_SNAPSHOT_SHAPE, {
    facilities: [FIELDS('id x y level')],
    savedSite: JSON_PAYLOAD,
    farmPlots: [FIELDS('id', { food: [FIELDS('x y z vx vy vz seed phase tx ty')] })],
    formationRuntime: JSON_PAYLOAD,
    units: [UNIT],
    boss: BOSS,
    playerProgression: PROGRESSION,
    raidRosters: [ROSTER],
    projectiles: [PROJECTILE],
    cornAttachments: FIELDS('nextGroupId nextAttachmentId', { groups: [CORN_GROUP] }),
    bossRewardReceipts: [REWARD],
    bossRewardStreams: JSON_PAYLOAD,
    bossRewardInventory: [FIELDS('species tier count')],
    raidSettlementReceipts: [SETTLEMENT],
    food: [FIELDS('x y z vx vy vz seed phase tx ty')],
    events: [JSON_PAYLOAD],
    effects: [JSON_PAYLOAD],
    notices: [JSON_PAYLOAD],
    combatLog: [JSON_PAYLOAD],
    farmBossProgress: shapeFields(FARM_SNAPSHOT_SHAPE.farmBossProgress, {
        selections: [FIELDS('stage species selectionId')],
    }),
    mergeTasks: [
        FIELDS('phase aId bId elapsed duration resultId sourceSpecies sourceTier centerX centerY centerZ', {
            materialIds: [true],
            startPositions: [FIELDS('id x y z')],
        }),
    ],
});
function copyJsonPayload(value, depth = 0) {
    if (depth >= 18) {
        throw new TypeError('올바른 농장 저장 데이터가 아니에요.');
    }
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? (value === 0 ? 0 : value) : null;
    }
    if (Array.isArray(value)) {
        return Array.from(value, (item) => (item === undefined ? null : copyJsonPayload(item, depth + 1)));
    }
    if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
        throw new TypeError('올바른 농장 저장 데이터가 아니에요.');
    }
    return Object.fromEntries(
        Object.entries(value)
            .filter(([, item]) => item !== undefined)
            .map(([key, item]) => [key, copyJsonPayload(item, depth + 1)]),
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
        if (typeof value === 'number') {
            return Number.isFinite(value) ? (value === 0 ? 0 : value) : null;
        }
        if (typeof value === 'string' || typeof value === 'boolean') {
            return value;
        }
        throw new TypeError('올바른 농장 저장 데이터가 아니에요.');
    }
    if (Array.isArray(recipe)) {
        if (!Array.isArray(value) && !(value instanceof Set)) {
            throw new TypeError('올바른 농장 저장 데이터가 아니에요.');
        }
        return Array.from(value, (item) => copyFields(item, recipe[0]));
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError('올바른 농장 저장 데이터가 아니에요.');
    }
    const RESULT = {};
    for (const [KEY, CHILD] of Object.entries(recipe)) {
        if (Object.hasOwn(value, KEY) && value[KEY] !== undefined) {
            RESULT[KEY] = copyFields(value[KEY], CHILD);
        }
    }
    return RESULT;
}
export function snapshot(world) {
    // The live farm view exposes only the selected plot. Raid settlement and
    // save checkpoints need the complete resident set, including residents in
    // other plots and reserve, so copy from the collection's single owner.
    const SOURCE =
        world?.farmPlots instanceof Map
            ? {
                  ...world,
                  farmPlots: [...world.farmPlots.values()].map((plot) => ({ id: plot.id, food: plot.food })),
                  ...(world.scene === 'farm' && world.unitCollection ? { units: world.unitCollection.items } : {}),
              }
            : world;
    const SITE = world?.buildSite;
    return copyFields(
        {
            ...SOURCE,
            savedSite: SITE
                ? {
                      facility: SITE.facility,
                      level: SITE.level,
                      x: SITE.x,
                      y: SITE.y,
                      done: SITE.done,
                      need: SITE.need,
                      ...(SITE.plotId === undefined ? {} : { plotId: SITE.plotId }),
                  }
                : null,
        },
        SNAPSHOT_FIELDS,
    );
}
