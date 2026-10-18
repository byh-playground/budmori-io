import { getAbilityEffects } from '../../../ability-progression.js';

export const BARLEY_ARMOR_SHRED_BUCKETS = 60;
const ABILITY_ID = 'barley-armor-break';

export function createBarleyArmorShredBuckets() {
    return Array.from({ length: BARLEY_ARMOR_SHRED_BUCKETS }, () => ({ expiresAtTick: 0, amount: 0 }));
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
        if (
            !target ||
            target.hp <= 0 ||
            !Number.isFinite(amount) ||
            amount <= 0 ||
            !Number.isSafeInteger(tick) ||
            tick < 0
        ) {
            return null;
        }
        const BUCKETS =
            Array.isArray(target.barleyArmorShredBuckets) &&
            target.barleyArmorShredBuckets.length === BARLEY_ARMOR_SHRED_BUCKETS
                ? target.barleyArmorShredBuckets
                : (target.barleyArmorShredBuckets = createBarleyArmorShredBuckets());
        this.prune(target, tick);
        const INDEX = tick % BARLEY_ARMOR_SHRED_BUCKETS,
            BUCKET = BUCKETS[INDEX],
            EXPIRES_AT_TICK = tick + BARLEY_ARMOR_SHRED_BUCKETS;
        if (BUCKET.expiresAtTick === EXPIRES_AT_TICK) {
            BUCKET.amount += amount;
        } else {
            BUCKET.expiresAtTick = EXPIRES_AT_TICK;
            BUCKET.amount = amount;
        }
        return {
            amount,
            expiresAtTick: EXPIRES_AT_TICK,
            total: this.total(target, tick),
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
    static effectiveArmor(target, baseArmor, armorBonus, tick) {
        const BASE_ARMOR = Number.isFinite(baseArmor) ? baseArmor : 0,
            ARMOR_BONUS = Number.isFinite(armorBonus) ? armorBonus : 0;
        return Math.max(0, BASE_ARMOR + ARMOR_BONUS - this.total(target, tick));
    }
    static hasActiveShred(target, tick) {
        return this.total(target, tick) > 0;
    }
}
