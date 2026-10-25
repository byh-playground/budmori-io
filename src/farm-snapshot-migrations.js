import { validateSnapshot } from './farm-snapshot-validation.js';
import { migrateLegacyBarleyArmorShredBuckets } from './features/abilities/barley-shred/model.js';

// Runtime checkpoints retain the previous 60-tick shred ring at this boundary.
// Disk save compatibility remains at the separate user-facing import boundary.
export function normalizeSnapshot(raw, { clone = true } = {}) {
    const SNAPSHOT = clone ? structuredClone(raw) : raw;
    for (const TARGET of [...SNAPSHOT.units, SNAPSHOT.boss]) {
        TARGET.statProfile ??= null;
        TARGET.statModifiers ??= {};
        TARGET.giantSizeMultiplier ??= 3;
    }
    // Older runtime checkpoints have no interrupted-recovery cache or aim
    // state. Preserve their original action rather than reopening preparation.
    for (const UNIT of SNAPSHOT.units) {
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
