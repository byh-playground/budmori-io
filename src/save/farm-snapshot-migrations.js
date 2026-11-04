import { ACTOR_ATTACK_SNAPSHOT_SHAPE, BOSS_SNAPSHOT_SHAPE } from './farm-snapshot.js';
import { specialAbilityCompositionFor } from '../units/unit-abilities.js';
import { validateSnapshot } from './farm-snapshot-validation.js';
import { freshTowerRun } from '../tower/tower-run.js';
import { towerElement } from '../tower/tower-theme.js';
import { BOSS_PATTERN_IDS, MINION_KINDS, bossHealthFraction } from '../boss/boss-patterns.js';
import { migratePlayerProgressionState } from '../model/player-progression.js';
import { migrateLegacyBarleyArmorShredBuckets } from '../features/abilities/barley-shred/model.js';
import { migrateBossRewardLedger } from './boss-reward-ledger.js';
import { migrateTowerCardEffects } from './tower-card-migrations.js';

function migrateSnapshotRewards(snapshot) {
    if (!Object.hasOwn(snapshot, 'bossRewardStreams')) {
        const LEDGER = migrateBossRewardLedger({
            nextEncounterId: snapshot.nextBossEncounterId,
            settledThrough: snapshot.bossRewardWatermarks,
            pendingRewards: snapshot.bossRewardReceipts,
            rewardRngState: snapshot.bossRewardRngState,
            queuedRewards: snapshot.bossRewardInventory,
        });
        snapshot.bossRewardReceipts = LEDGER.pendingRewards;
        return;
    }
    const EVENT = snapshot.farmBossEvent;
    if (
        !EVENT ||
        !['none', 'unresolved', 'calculating', 'ready'].includes(EVENT.rewardStatus) ||
        !Number.isFinite(EVENT.rewardChance) ||
        EVENT.rewardChance < 0 ||
        EVENT.rewardChance > 1 ||
        EVENT.rewardRoll !== 0 ||
        EVENT.rewardUnitId !== 0
    ) {
        throw new TypeError('올바른 이전 보상 체크포인트가 아니에요.');
    }
    if (EVENT.outcome === 'victory' && EVENT.phase !== 'idle') {
        const RECEIPT = snapshot.bossRewardReceipts.find(
            (reward) => reward.encounterId === EVENT.encounterId && reward.source === 'farm',
        );
        if (!RECEIPT || RECEIPT.status !== EVENT.rewardStatus || RECEIPT.chance !== EVENT.rewardChance) {
            throw new TypeError('이전 보상과 전투 결과가 일치하지 않아요.');
        }
    } else {
        const EXPECTED_STATUS = ['marching', 'dropping', 'fighting'].includes(EVENT.phase) ? 'unresolved' : 'none';
        if (EVENT.rewardChance !== 0 || EVENT.rewardStatus !== EXPECTED_STATUS) {
            throw new TypeError('올바른 이전 보상 체크포인트가 아니에요.');
        }
    }
    const LEDGER = migrateBossRewardLedger({
        nextEncounterId: snapshot.nextBossEncounterId,
        settledThrough: snapshot.bossRewardWatermarks,
        rewardStreams: snapshot.bossRewardStreams,
        pendingRewards: snapshot.bossRewardReceipts,
        queuedRewards: snapshot.bossRewardInventory,
    });
    snapshot.bossRewardRngState = LEDGER.rewardRngState;
    snapshot.bossRewardReceipts = LEDGER.pendingRewards;
    snapshot.bossRewardInventory = LEDGER.queuedRewards;
    delete snapshot.bossRewardStreams;
    EVENT.rewardStatus = EVENT.outcome === 'victory' && EVENT.phase !== 'idle' ? 'ready' : 'none';
    delete EVENT.rewardChance;
    delete EVENT.rewardRoll;
    delete EVENT.rewardUnitId;
}

// These fields were already required before bosses shared the unit attack
// contract. Do not repair malformed legacy identity, health, or motion data.
const LEGACY_BOSS_FIELDS = new Set(
    'statProfile statModifiers giantUntil giantSizeMultiplier giantEndedAt deathSplitHandled x y z faction generation hp species angle flash stun barleyArmorBreakUntil barleyArmorBreakReduction barleyArmorShredBuckets'.split(
        ' ',
    ),
);

// Runtime checkpoints retain the previous 60-tick shred ring at this boundary.
// Disk save compatibility remains at the separate user-facing import boundary.
// Up to 0.67.13 a tower encounter joined one boss every 12 seconds (nextJoinAt), split the floor budget among its
// bosses (hpShare, attackShare) and every enemy took the floor band's element. Bosses now enter together, each with
// the whole floor budget and its own element. An old checkpoint keeps the bosses already on the field as they are;
// its not-yet-joined bosses come at full budget and every enemy keeps the band element.
function migrateBossEncounter(snapshot) {
    const ENCOUNTER = snapshot.bossEncounter,
        BAND_ELEMENT = towerElement(snapshot.tower?.active ? snapshot.tower.floor : 1);
    if (ENCOUNTER) {
        delete ENCOUNTER.nextJoinAt;
        // Tower floors no longer wait in 'dropping' for every boss to land: the fight runs while they leap in.
        if (snapshot.farmBossEvent?.phase === 'dropping') {
            snapshot.farmBossEvent.phase = 'fighting';
        }
        for (const ENTRY of ENCOUNTER.roster ?? []) {
            ENTRY.element ??= towerElement(ENCOUNTER.floor);
            delete ENTRY.hpShare;
            delete ENTRY.attackShare;
        }
    }
    for (const UNIT of [...snapshot.units, ...snapshot.bosses]) {
        UNIT.enemyElement ??= UNIT.faction === 'enemy' ? BAND_ELEMENT : 0;
    }
}
// Before the minion pool (0.67.24) every boss minion was 'boss-mouth-t1', the kind now called caster.
function migrateBossMinionKinds(snapshot) {
    for (const UNIT of snapshot.units) {
        if (UNIT.battleSummonKind === 'boss-mouth-t1') {
            UNIT.battleSummonKind = MINION_KINDS.caster.summonKind;
        }
    }
}

export function normalizeSnapshot(raw, { clone = true } = {}) {
    const SNAPSHOT = clone ? structuredClone(raw) : raw,
        LEGACY_ENCOUNTER = Object.hasOwn(SNAPSHOT, 'boss') && !Object.hasOwn(SNAPSHOT, 'bosses');
    migrateSnapshotRewards(SNAPSHOT);
    migrateTowerCardEffects(SNAPSHOT);
    SNAPSHOT.playerProgression = migratePlayerProgressionState(SNAPSHOT.playerProgression);
    if (!Object.hasOwn(SNAPSHOT, 'foodRuntime')) {
        SNAPSHOT.foodRuntime = null;
    }
    if (SNAPSHOT.runProgressionSnapshot) {
        SNAPSHOT.runProgressionSnapshot = migratePlayerProgressionState(SNAPSHOT.runProgressionSnapshot);
    }
    if (LEGACY_ENCOUNTER) {
        SNAPSHOT.bosses = [SNAPSHOT.boss];
        delete SNAPSHOT.boss;
        SNAPSHOT.bossEncounter = null;
        SNAPSHOT.battleCommand = 'engage';
        SNAPSHOT.frontlineLimit = 100;
        SNAPSHOT.insideTower = false;
        const RUN = freshTowerRun();
        SNAPSHOT.tower = {
            ...RUN,
            active: false,
            floor: 0,
            kind: 'battle',
            record: false,
            relics: [],
            bossRelics: [],
            undyingUsed: [],
            downed: [],
        };
        SNAPSHOT.deployOrder = Array.from({ length: 9 }, (_, index) => index);
        SNAPSHOT.benchedIds = [];
        SNAPSHOT.ejectQueue = [];
        SNAPSHOT.deployReadyTime = 0;
        SNAPSHOT.deployCount = 0;
    }
    if (!Array.isArray(SNAPSHOT.bosses)) {
        throw new TypeError('Invalid boss encounter checkpoint');
    }
    migrateBossEncounter(SNAPSHOT);
    migrateBossMinionKinds(SNAPSHOT);
    for (const TARGET of [...SNAPSHOT.units, ...SNAPSHOT.bosses]) {
        TARGET.statProfile ??= null;
        TARGET.statModifiers ??= {};
        TARGET.giantSizeMultiplier ??= 3;
        TARGET.giantBonusDamage ??= 0;
    }
    // Add only absent combat fields of older boss checkpoints. Never allocate
    // identity or replace an existing action, generation, or attack budget.
    for (const BOSS of SNAPSHOT.bosses) {
        if (BOSS.patternRuntime) {
            const RUNTIME = BOSS.patternRuntime;
            // Breaks (0.67.25) gave way to the stagger recovery swing (0.67.40).
            delete RUNTIME.breaks;
            // Before the stagger gauge (0.67.29): the gauge starts empty at the current health.
            RUNTIME.staggerFrom ??= bossHealthFraction(BOSS);
            // A boss down when saved before 0.67.40 gets up without the recovery swing.
            RUNTIME.stagger ??= 'standing';
            // A pattern added later (attack.spin-throw, 0.67.40) starts at the default weight, ready.
            for (const ID of BOSS_PATTERN_IDS) {
                RUNTIME.weights[ID] ??= 1;
                RUNTIME.cooldowns[ID] ??= 0;
            }
        }
        const LEGACY_SPECIAL = !Object.hasOwn(BOSS, 'specialAbility');
        for (const KEY of Object.keys(ACTOR_ATTACK_SNAPSHOT_SHAPE)) {
            if (!LEGACY_BOSS_FIELDS.has(KEY) && !Object.hasOwn(BOSS, KEY)) {
                BOSS[KEY] = structuredClone(BOSS_SNAPSHOT_SHAPE[KEY]);
            }
        }
        if (LEGACY_SPECIAL && specialAbilityCompositionFor(BOSS.species)) {
            BOSS.specialAbility = structuredClone(ACTOR_ATTACK_SNAPSHOT_SHAPE.ability);
        }
        BOSS.isFinalBoss ??= false;
        BOSS.dropLanded ??= true;
        BOSS.giantUntil ??= 0;
        BOSS.giantEndedAt ??= -10;
        BOSS.deathSplitHandled ??= false;
    }
    // Older runtime checkpoints have no interrupted-recovery cache or aim
    // state. Preserve their original action rather than reopening preparation.
    for (const UNIT of [...SNAPSHOT.units, ...SNAPSHOT.bosses]) {
        delete UNIT.scatterAttackCount;
        UNIT.ability.interruptedRecoverySeconds ??= null;
        if (UNIT.specialAbility) {
            UNIT.specialAbility.interruptedRecoverySeconds ??= null;
        }
    }
    SNAPSHOT.formationRuntime.bossRetrySkillId ??= null;
    if (LEGACY_ENCOUNTER) {
        const BOSS = SNAPSHOT.bosses[0],
            CAST = SNAPSHOT.formationRuntime.bossCast;
        if (CAST && !Object.hasOwn(CAST, 'casterId') && !Object.hasOwn(CAST, 'casterGeneration')) {
            CAST.casterId = BOSS.id;
            CAST.casterGeneration = BOSS.generation;
        }
        for (const EFFECT of SNAPSHOT.formationRuntime.effects) {
            if (
                EFFECT.role === 'boss' &&
                !Object.hasOwn(EFFECT, 'casterId') &&
                !Object.hasOwn(EFFECT, 'casterGeneration')
            ) {
                EFFECT.casterId = BOSS.id;
                EFFECT.casterGeneration = BOSS.generation;
            }
        }
    }
    validateSnapshot(SNAPSHOT, { allowLegacyBarleyShred: true });
    for (const TARGET of [...SNAPSHOT.units, ...SNAPSHOT.bosses]) {
        TARGET.barleyArmorShredBuckets = migrateLegacyBarleyArmorShredBuckets(
            TARGET.barleyArmorShredBuckets,
            SNAPSHOT.simulationTick,
        );
    }
    validateSnapshot(SNAPSHOT);
    return SNAPSHOT;
}
