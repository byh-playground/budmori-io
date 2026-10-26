import { getAbilityEffects } from '../../../abilities/ability-progression.js';

export const BARLEY_ARMOR_SHRED_LEGACY_DURATION_TICKS = 60;
export const BARLEY_ARMOR_SHRED_MAX_DURATION_TICKS = 100;
export const BARLEY_ARMOR_SHRED_BUCKETS = BARLEY_ARMOR_SHRED_MAX_DURATION_TICKS + 1;
const ABILITY_ID = 'barley-armor-break';

export function createBarleyArmorShredBuckets() {
    return Array.from({ length: BARLEY_ARMOR_SHRED_BUCKETS }, () => ({ expiresAtTick: 0, amount: 0 }));
}

// The checkpoint boundary validates legacy entries before migration. Keep each
// live expiry unchanged; the old hit-index ring happened to share expiry % 60.
export function migrateLegacyBarleyArmorShredBuckets(buckets, tick) {
    if (buckets.length !== BARLEY_ARMOR_SHRED_LEGACY_DURATION_TICKS) {
        return buckets;
    }
    const RESULT = createBarleyArmorShredBuckets();
    for (const BUCKET of buckets) {
        if (BUCKET.expiresAtTick > tick) {
            const NEXT = RESULT[BUCKET.expiresAtTick % BARLEY_ARMOR_SHRED_BUCKETS];
            NEXT.expiresAtTick = BUCKET.expiresAtTick;
            NEXT.amount += BUCKET.amount;
        }
    }
    return RESULT;
}

export class BarleyArmorShredModel {
    static config(progression, tier) {
        const EFFECT = getAbilityEffects(progression, ABILITY_ID, tier);
        if (!EFFECT) {
            return null;
        }
        return {
            amount: EFFECT.value,
        };
    }
    static applyHit(target, amount, tick) {
        return this.applyAmount(target, tick, amount, BARLEY_ARMOR_SHRED_LEGACY_DURATION_TICKS);
    }
    static applyAmount(target, tick, amount, durationTicks) {
        if (
            !target ||
            !Number.isFinite(target.hp) ||
            target.hp <= 0 ||
            !Number.isFinite(amount) ||
            amount <= 0 ||
            !Number.isSafeInteger(tick) ||
            tick < 0 ||
            !Number.isSafeInteger(durationTicks) ||
            durationTicks < BARLEY_ARMOR_SHRED_LEGACY_DURATION_TICKS ||
            durationTicks > BARLEY_ARMOR_SHRED_MAX_DURATION_TICKS ||
            !Number.isSafeInteger(tick + durationTicks)
        ) {
            return null;
        }
        const BUCKETS =
            Array.isArray(target.barleyArmorShredBuckets) &&
            [BARLEY_ARMOR_SHRED_BUCKETS, BARLEY_ARMOR_SHRED_LEGACY_DURATION_TICKS].includes(
                target.barleyArmorShredBuckets.length,
            )
                ? (target.barleyArmorShredBuckets = migrateLegacyBarleyArmorShredBuckets(
                      target.barleyArmorShredBuckets,
                      tick,
                  ))
                : (target.barleyArmorShredBuckets = createBarleyArmorShredBuckets());
        this.prune(target, tick);
        const EXPIRES_AT_TICK = tick + durationTicks,
            BUCKET = BUCKETS[EXPIRES_AT_TICK % BARLEY_ARMOR_SHRED_BUCKETS],
            TOTAL = this.total(target, tick) + amount;
        // Distinct live expiries cannot collide within the bounded 100-tick
        // horizon. Do not erase an existing contribution on malformed input.
        if ((BUCKET.expiresAtTick > tick && BUCKET.expiresAtTick !== EXPIRES_AT_TICK) || !Number.isFinite(TOTAL)) {
            return null;
        }
        if (BUCKET.expiresAtTick === EXPIRES_AT_TICK) {
            BUCKET.amount += amount;
        } else {
            BUCKET.expiresAtTick = EXPIRES_AT_TICK;
            BUCKET.amount = amount;
        }
        return {
            amount,
            expiresAtTick: EXPIRES_AT_TICK,
            total: TOTAL,
        };
    }
    static prune(target, tick) {
        const BUCKETS = target?.barleyArmorShredBuckets;
        if (!Array.isArray(BUCKETS)) {
            return;
        }
        for (const BUCKET of BUCKETS) {
            if (BUCKET.expiresAtTick <= tick) {
                BUCKET.expiresAtTick = 0;
                BUCKET.amount = 0;
            }
        }
    }
    static total(target, tick) {
        let total = 0;
        for (const BUCKET of target?.barleyArmorShredBuckets || []) {
            if (BUCKET.expiresAtTick > tick) {
                total += BUCKET.amount;
            }
        }
        return total;
    }
    // Latest live expiry against the fixed five-second maximum, not stack amount.
    static remaining(target, tick) {
        let latest = 0;
        for (const BUCKET of target?.barleyArmorShredBuckets || []) {
            latest = Math.max(latest, BUCKET.expiresAtTick - tick);
        }
        return Math.max(0, Math.min(1, latest / BARLEY_ARMOR_SHRED_MAX_DURATION_TICKS));
    }
    static effectiveArmor(target, baseArmor, armorBonus, tick) {
        const BASE_ARMOR = Number.isFinite(baseArmor) ? baseArmor : 0,
            ARMOR_BONUS = Number.isFinite(armorBonus) ? armorBonus : 0;
        return Math.max(0, BASE_ARMOR + ARMOR_BONUS - this.total(target, tick));
    }
    static hasActiveShred(target, tick) {
        return this.total(target, tick) > 0;
    }
}
