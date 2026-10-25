import { ACTOR_ATTACK_SNAPSHOT_SHAPE, FARM_SNAPSHOT_SHAPE } from './farm-snapshot.js';
import { specialAbilityCompositionFor } from './unit-abilities.js';
import { validateSnapshot } from './farm-snapshot-validation.js';
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
    const SNAPSHOT = clone ? structuredClone(raw) : raw;
    const LEGACY_BOSS_SPECIAL = !Object.hasOwn(SNAPSHOT.boss, 'specialAbility');
    for (const TARGET of [...SNAPSHOT.units, SNAPSHOT.boss]) {
        TARGET.statProfile ??= null;
        TARGET.statModifiers ??= {};
        TARGET.giantSizeMultiplier ??= 3;
    }
    // Before shared basic attacks, boss checkpoints omitted combat fields.
    // Add only the absent contract fields; never allocate identity or replace
    // an existing action, generation, or captured attack budget.
    for (const KEY of Object.keys(ACTOR_ATTACK_SNAPSHOT_SHAPE)) {
        if (!LEGACY_BOSS_FIELDS.has(KEY) && !Object.hasOwn(SNAPSHOT.boss, KEY)) {
            SNAPSHOT.boss[KEY] = structuredClone(FARM_SNAPSHOT_SHAPE.boss[KEY]);
        }
    }
    if (LEGACY_BOSS_SPECIAL && specialAbilityCompositionFor(SNAPSHOT.boss.species)) {
        SNAPSHOT.boss.specialAbility = structuredClone(ACTOR_ATTACK_SNAPSHOT_SHAPE.ability);
    }
    // Older runtime checkpoints have no interrupted-recovery cache or aim
    // state. Preserve their original action rather than reopening preparation.
    for (const UNIT of [...SNAPSHOT.units, SNAPSHOT.boss]) {
        UNIT.ability.interruptedRecoverySeconds ??= null;
        if (UNIT.specialAbility) {
            UNIT.specialAbility.interruptedRecoverySeconds ??= null;
        }
    }
    SNAPSHOT.formationRuntime.bossRetrySkillId ??= null;
    SNAPSHOT.boss.giantUntil ??= 0;
    SNAPSHOT.boss.giantEndedAt ??= -10;
    SNAPSHOT.boss.deathSplitHandled ??= false;
    validateSnapshot(SNAPSHOT, { allowLegacyBarleyShred: true });
    for (const TARGET of [...SNAPSHOT.units, SNAPSHOT.boss]) {
        TARGET.barleyArmorShredBuckets = migrateLegacyBarleyArmorShredBuckets(
            TARGET.barleyArmorShredBuckets,
            SNAPSHOT.simulationTick,
        );
    }
    validateSnapshot(SNAPSHOT);
    return SNAPSHOT;
}
