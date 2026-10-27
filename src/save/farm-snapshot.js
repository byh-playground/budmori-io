import { createFormationRuntime } from '../formation/formation-skill-state.js';
import { createPlayerProgressionState } from '../model/player-progression.js';
import { createBarleyArmorShredBuckets } from '../features/abilities/barley-shred/model.js';
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
        interruptedRecoverySeconds: null,
        action: null,
    },
    specialAbility: null,
    kidneyLeapReadyTick: 0,
    kidneyLeapLastUseTick: 0,
    peaRecoveryPending: false,
    peaCounterExpiresAtTick: 0,
    peaCounterPending: false,
    peaRecoveryBoostExpiresAtTick: 0,
    peaRecoveryBoostMultiplier: 0,
    id: 1,
    generation: 1,
    species: 0,
    tier: 1,
    statProfile: null,
    statModifiers: null,
    permanentStatMultiplier: 1,
    growthMaxHpMultiplier: 1,
    temperament: 0,
    genes: [0, 0],
    seedling: null,
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
    scatterAttackCount: 0,
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
};
// Both resident units and the boss own the same combat state. Keep one
// field/default contract without copying farm-only lifecycle fields to the boss.
export const ACTOR_ATTACK_SNAPSHOT_SHAPE = Object.fromEntries(
    [
        'x y z vx vy vz angle stun flash bounce ability specialAbility',
        'kidneyLeapReadyTick kidneyLeapLastUseTick peaRecoveryPending peaCounterExpiresAtTick peaCounterPending',
        'peaRecoveryBoostExpiresAtTick peaRecoveryBoostMultiplier id generation species tier statProfile statModifiers',
        'permanentStatMultiplier growthMaxHpMultiplier faction growth growthElapsed growthDuration hp ownerId farmId',
        'isBattleOnlySummon peanutInheritedPowerRank peanutInheritedSpeedRank canSplit splitUsedThisBattle deathSplitHandled',
        'chestnutNextThornTick landingRecovery scatterAttackCount walnutNextGuardTick walnutGuardUntilTick walnutStoredRawDamage',
        'wheatCommandUntil wheatCommandCritBonus wheatCommandBuffs barleyArmorBreakUntil barleyArmorBreakReduction',
        'barleyArmorShredBuckets giantUntil giantSizeMultiplier giantEndedAt isFormationClone cloneBornAt',
    ]
        .join(' ')
        .split(' ')
        .map((key) => [key, UNIT_SNAPSHOT_SHAPE[key]]),
);
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
        interruptedRecoverySeconds: null,
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
export const BOSS_SNAPSHOT_SHAPE = {
    ...ACTOR_ATTACK_SNAPSHOT_SHAPE,
    id: 'boss',
    isFinalBoss: false,
    dropLanded: true,
    ownerId: 'boss',
    canSplit: false,
    growth: 3,
    growthElapsed: 1,
    growthDuration: 1,
    faction: 'enemy',
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
    facing: 0,
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
    knockVx: 0,
    knockVy: 0,
    airborneRecovery: 0,
    summonMouth: {
        x: 0,
        y: 0,
        z: 0,
    },
};
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
    },
    formationRuntime: createFormationRuntime(),
    playerProgression: createPlayerProgressionState(),
    runProgressionSnapshot: null,
    starter: 0,
    foodTaps: {
        produced: 0,
        revision: 0,
    },
    projectiles: [],
    chestnutAttacks: [],
    entityGenerationSerial: 2,
    cornAttachments: {
        nextGroupId: 1,
        nextAttachmentId: 1,
        groups: [],
        actions: [],
    },
    attackSerial: 0,
    projectileSerial: 0,
    bossSummonSerial: 0,
    combatLog: [],
    scene: 'farm',
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
    bosses: [],
    bossEncounter: null,
    battleCommand: 'engage',
    frontlineLimit: 100,
    insideTower: false,
    tower: null,
    deployOrder: [],
    benchedIds: [],
    ejectQueue: [],
    deployReadyTime: 0,
    deployCount: 0,
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
const CORN_SOURCE = FIELDS(
    'id generation ownerId faction isFormationClone species tier hp x y z giantUntil sourceKind attackPowerMultiplier sourceDamageScale buffed',
    { attackerStats: JSON_PAYLOAD },
);
const CORN_ACTION = FIELDS(
    'version id owner ownerGeneration tier form geometryScale launchTick firstAttachTick speed windupSeconds recoverySeconds baseKernelCount extraKernel terminalIndex directMultiplier attachmentMultiplier',
    {
        shots: [FIELDS('slot weight duration kernelStart kernelCount')],
        ranks: FIELDS('heating finish extra'),
        budgetInputs: FIELDS(
            'tierOneAttack tierAttack gradeMultiplier permanentMultiplier directRank attachmentRank speedRank commandSpeed',
            { profile: FIELDS('attackPower flat pct permanentMultiplier') },
        ),
        source: CORN_SOURCE,
        attack: JSON_PAYLOAD,
        criticalRolls: JSON_PAYLOAD,
    },
);
const ATTACK = FIELDS(
    'id targetId targetGeneration hit resolvedMask hitMask peanutStrikeCount peanutAttackMultiplier peanutSpreadRadians leapDepartureCommitted leapCooldownResetApplied thornTargetId thornTargetGeneration thornShotsRemaining thornNextShotTick thornShotIndex',
    {
        target: POINT,
        prepareAim: FIELDS('originX originY startX startY x y radius reacquired locked'),
        path: PATH,
        pendingShots: [FIELDS('shotIndex delaySeconds attackMultiplier')],
        projectileAbility: {
            effect: FIELDS('abilityId', { config: JSON_PAYLOAD }),
        },
        thornConfig: JSON_PAYLOAD,
        cornAttack: CORN_ACTION,
        peaAttack: JSON_PAYLOAD,
        redbeanAttack: JSON_PAYLOAD,
        peanutAttack: JSON_PAYLOAD,
        walnutAttack: JSON_PAYLOAD,
        riceAttack: JSON_PAYLOAD,
        wheatAttack: JSON_PAYLOAD,
        barleyAttack: JSON_PAYLOAD,
        chestnutAttack: JSON_PAYLOAD,
    },
);
const ACTOR_ATTACK_FIELDS = {
    statProfile: JSON_PAYLOAD,
    statModifiers: JSON_PAYLOAD,
    ability: {
        phase: true,
        elapsed: true,
        interruptedRecoverySeconds: true,
        action: ATTACK,
    },
    specialAbility: {
        phase: true,
        elapsed: true,
        interruptedRecoverySeconds: true,
        action: ATTACK,
    },
    wheatCommandBuffs: [FIELDS('level bonus tier powerRank appliedAtTick expiresAtTick')],
    barleyArmorShredBuckets: [FIELDS('expiresAtTick amount')],
};
const UNIT = shapeFields(UNIT_SNAPSHOT_SHAPE, {
    ...ACTOR_ATTACK_FIELDS,
    genes: [true],
    seedling: FIELDS('fed cooldown'),
});
const BOSS_ACTION = FIELDS(
    'id phase phaseElapsed motionDelay targetId aim locked traveled volleyCount released nextRelease criticalRoll',
    {
        target: POINT,
        start: POINT,
        path: PATH,
        hitIds: [true],
        landingPoints: [POINT],
    },
);
const BOSS = shapeFields(BOSS_SNAPSHOT_SHAPE, {
    ...ACTOR_ATTACK_FIELDS,
    patternRuntime: shapeFields(BOSS_SNAPSHOT_SHAPE.patternRuntime, {
        active: BOSS_ACTION,
    }),
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
// Progression owns its mixed species schema, including optional migration archives.
// Its semantic validator rejects unknown keys; do not trim archives using a default build.
const PROGRESSION = JSON_PAYLOAD;
const PROJECTILE = FIELDS(
    'isFormationClone id owner ownerGeneration targetId targetGeneration faction ownerId species tier elapsed x y z radius height hit attackMultiplier shotIndex projectileKind fanIndex cornActionId cornSlot cornForm chestnutActionId chestnutSlot chestnutForm chestnutStage chestnutBornTick',
    {
        path: PATH,
        attackPayload: JSON_PAYLOAD,
        cornPayload: JSON_PAYLOAD,
        abilityEffect: JSON_PAYLOAD,
    },
);
const CORN_ATTACHMENT = FIELDS(
    'id groupId targetId targetGeneration ownerId ownerGeneration damageMultiplier status fadeTicks angle offsetX offsetY cornActionId cornKernelIndex explosionTick cornDamageScale',
    { payload: JSON_PAYLOAD },
);
const CORN_GROUP = FIELDS(
    'id targetId targetGeneration targetX targetY targetZ firstAttachTick closeAtTick nextExplosionTick status cornActionId',
    { attachments: [CORN_ATTACHMENT] },
);
const SNAPSHOT_FIELDS = shapeFields(FARM_SNAPSHOT_SHAPE, {
    food: [FIELDS('x y z vx vy vz seed phase tx ty')],
    formationRuntime: JSON_PAYLOAD,
    units: [UNIT],
    bosses: [BOSS],
    bossEncounter: JSON_PAYLOAD,
    tower: JSON_PAYLOAD,
    benchedIds: [true],
    ejectQueue: [FIELDS('unitId at', { target: FIELDS('x y') })],
    deployOrder: [true],
    playerProgression: PROGRESSION,
    runProgressionSnapshot: PROGRESSION,
    projectiles: [PROJECTILE],
    chestnutAttacks: [JSON_PAYLOAD],
    cornAttachments: FIELDS('nextGroupId nextAttachmentId', { groups: [CORN_GROUP], actions: [CORN_ACTION] }),
    bossRewardReceipts: [REWARD],
    bossRewardStreams: JSON_PAYLOAD,
    bossRewardInventory: [FIELDS('species tier count')],
    events: [JSON_PAYLOAD],
    effects: [JSON_PAYLOAD],
    notices: [JSON_PAYLOAD],
    combatLog: [JSON_PAYLOAD],
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
        if (KEY in value && value[KEY] !== undefined) {
            RESULT[KEY] = copyFields(value[KEY], CHILD);
        }
    }
    return RESULT;
}
export function snapshot(world) {
    // Raid settlement and save checkpoints copy the resident set from the collection's single owner.
    const SOURCE = {
        ...world,
        units: world?.unitCollection ? world.unitCollection.items : world.units,
        tower: world.tower
            ? {
                  ...world.tower,
                  relics: [...world.tower.relics],
                  bossRelics: [...world.tower.bossRelics],
                  undyingUsed: [...world.tower.undyingUsed],
                  sleepUntil: [...world.tower.sleepUntil],
              }
            : null,
        benchedIds: [...world._benched].map((unit) => unit.id),
        ejectQueue: world._ejectQueue.map(({ unit, at, target }) => ({ unitId: unit.id, at, target })),
        deployReadyTime: world._deployReadyTime,
        deployCount: world._deployCount,
    };
    return copyFields(SOURCE, SNAPSHOT_FIELDS);
}
