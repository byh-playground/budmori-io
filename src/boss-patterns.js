// Shared Farm/Raid boss kit. Pattern behavior is shared by species; species
// only selects the authored body and the T1 reward/summon identity.
export const BOSS_PATTERN_IDS = Object.freeze([
    'attack.sweep-360',
    'attack.front-slam',
    'attack.charge',
    'attack.leap-slam',
    'attack.fan-sweep',
    'summon.mouth-t1',
]);

// Numeric balance values are implementation defaults derived from the source
// combat scale (T1 attack 4, boss radius 4.4). The boss HP 2,000 is 50x T1 HP.
export const BOSS_PATTERN_CONFIG = Object.freeze({
    'attack.sweep-360': Object.freeze({
        kind: 'sweep-360',
        windup: 1.05,
        active: 0,
        recover: 1.05,
        cooldown: 10,
        reach: 6.5,
        damageMultiplier: 2.5,
        knockback: 13,
        lift: 10.2,
        groundOnly: true,
    }),
    'attack.front-slam': Object.freeze({
        kind: 'front-slam',
        windup: 0.75,
        active: 0,
        recover: 0.75,
        cooldown: 5,
        reach: 5.5,
        sector: Math.PI / 2,
        damageMultiplier: 2.5,
        knockback: 13,
        lift: 10.2,
        groundOnly: true,
    }),
    'attack.charge': Object.freeze({
        kind: 'charge',
        windup: 0.5,
        active: 6.6 / 5.3,
        recover: 0.75,
        cooldown: 5,
        reach: 6.6,
        speed: 5.3,
        damageMultiplier: 2,
        knockback: 13,
        lift: 10.2,
        groundOnly: false,
    }),
    'attack.leap-slam': Object.freeze({
        kind: 'leap-slam',
        windup: 0.5,
        active: 1.013,
        recover: 0.75,
        cooldown: 5,
        reach: 6.6,
        landingRadius: 5.5,
        damageMultiplier: 2,
        knockback: 10,
        lift: 7.2,
        groundOnly: false,
    }),
    'attack.fan-sweep': Object.freeze({
        kind: 'fan-sweep',
        windup: 1,
        active: 0.8,
        recover: 1,
        cooldown: 5,
        reach: 6.5,
        width: 0.85,
        sector: (Math.PI * 2) / 3,
        damageMultiplier: 2,
        knockback: 13,
        lift: 10.2,
        groundOnly: true,
    }),
    'summon.mouth-t1': Object.freeze({
        kind: 'mouth-t1',
        windup: 0.5,
        active: 0.75,
        recover: 0.5,
        cooldown: 10,
        firstEligible: 10,
        volleyCount: 4,
        releaseInterval: 0.25,
        maxAlive: 10,
        dropHeight: 3,
        landingSeconds: 0.56,
        landingRadius: 4.8,
    }),
});
export const BOSS_PATTERN_WEIGHT_DEFAULTS = Object.freeze({
    base: 1,
    eligibleBonus: 0.5,
    cap: 3,
});
export const BOSS_AIM_TURN_RATE = 5.5;
export function createBossPatternRuntime() {
    return {
        weights: Object.fromEntries(BOSS_PATTERN_IDS.map((id) => [id, BOSS_PATTERN_WEIGHT_DEFAULTS.base])),
        cooldowns: Object.fromEntries(BOSS_PATTERN_IDS.map((id) => [id, 0])),
        active: null,
        encounterElapsed: 0,
    };
}

// Caller supplies only currently eligible IDs. Ineligible patterns are never
// touched, so their accumulated weights remain frozen until they can be used.
export function chooseBossPattern(runtime, eligibleIds, random) {
    if (!runtime || !runtime.weights || !Array.isArray(eligibleIds) || typeof random !== 'function') {
        throw new TypeError('Boss pattern selection requires runtime, eligible patterns, and a seeded random source');
    }
    const ELIGIBLE = [...new Set(eligibleIds)]
        .filter((id) => BOSS_PATTERN_IDS.includes(id))
        .sort((a, b) => BOSS_PATTERN_IDS.indexOf(a) - BOSS_PATTERN_IDS.indexOf(b));
    if (!ELIGIBLE.length) {
        return null;
    }
    const TOTAL = ELIGIBLE.reduce((sum, id) => sum + Math.max(0, runtime.weights[id] || 0), 0);
    if (!(TOTAL > 0)) {
        return null;
    }
    let roll = random() * TOTAL;
    let chosen = ELIGIBLE.at(-1);
    for (const ID of ELIGIBLE) {
        roll -= Math.max(0, runtime.weights[ID] || 0);
        if (roll < 0) {
            chosen = ID;
            break;
        }
    }
    for (const ID of ELIGIBLE) {
        runtime.weights[ID] =
            ID === chosen
                ? BOSS_PATTERN_WEIGHT_DEFAULTS.base
                : Math.min(
                      BOSS_PATTERN_WEIGHT_DEFAULTS.cap,
                      Math.max(0, runtime.weights[ID] || 0) + BOSS_PATTERN_WEIGHT_DEFAULTS.eligibleBonus,
                  );
    }
    return chosen;
}
