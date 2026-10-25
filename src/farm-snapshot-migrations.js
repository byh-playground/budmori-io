import { ACTOR_ATTACK_SNAPSHOT_SHAPE, BOSS_SNAPSHOT_SHAPE } from './farm-snapshot.js';
import { specialAbilityCompositionFor } from './unit-abilities.js';
import { validateSnapshot } from './farm-snapshot-validation.js';
import { freshTowerRun } from './tower-run.js';
import { migratePlayerProgressionState } from './player-progression.js';
import { migrateLegacyBarleyArmorShredBuckets } from './features/abilities/barley-shred/model.js';

// These fields were already required before bosses shared the unit attack
// contract. Do not repair malformed legacy identity, health, or motion data.
const LEGACY_BOSS_FIELDS = new Set(
    'statProfile statModifiers giantUntil giantSizeMultiplier giantEndedAt deathSplitHandled x y z faction generation hp species angle flash stun barleyArmorBreakUntil barleyArmorBreakReduction barleyArmorShredBuckets'.split(
        ' ',
    ),
);

// Runtime checkpoints retain the previous 60-tick shred ring at this boundary.
// Disk save compatibility remains at the separate user-facing import boundary.
export function normalizeSnapshot(raw, { clone = true } = {}) {
    const SNAPSHOT = clone ? structuredClone(raw) : raw,
        LEGACY_ENCOUNTER = Object.hasOwn(SNAPSHOT, 'boss') && !Object.hasOwn(SNAPSHOT, 'bosses');
    SNAPSHOT.playerProgression = migratePlayerProgressionState(SNAPSHOT.playerProgression);
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
            sleepUntil: [],
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
    for (const TARGET of [...SNAPSHOT.units, ...SNAPSHOT.bosses]) {
        TARGET.statProfile ??= null;
        TARGET.statModifiers ??= {};
        TARGET.giantSizeMultiplier ??= 3;
    }
    // Add only absent combat fields of older boss checkpoints. Never allocate
    // identity or replace an existing action, generation, or attack budget.
    for (const BOSS of SNAPSHOT.bosses) {
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
        if (!Object.hasOwn(UNIT, 'scatterAttackCount')) {
            UNIT.scatterAttackCount = 0;
        }
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
