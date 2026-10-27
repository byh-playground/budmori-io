// Shared Farm/Raid boss kit. Pattern behavior is shared by species; species
// only selects the authored body and the T1 reward/summon identity.
export const BOSS_PATTERN_IDS = Object.freeze([
    'attack.sweep-360',
    'attack.front-slam',
    'attack.charge',
    'attack.leap-slam',
    'attack.fan-sweep',
    'summon.mouth-t1',
    'signature.water',
    'signature.grass',
    'signature.fire',
    'signature.ice',
    'signature.lightning',
]);

// Numeric balance values are implementation defaults derived from the source
// combat scale (T1 attack 4, boss radius 4.4). The boss HP 2,000 is 50x T1 HP.
// Everyone an attack reaches is hit and knocked back. Of the attack's damage, `BOSS_HIT_SPLIT.everyone` (35%) is dealt to
// every unit hit and the rest (65%) is split among all the units hit in the same moment: one unit takes it all, a crowd
// takes just over 35% each, so a tight pack is hurt a little more but never in proportion to its size.
export const BOSS_HIT_SPLIT = Object.freeze({ everyone: 0.35 });
// The boss's basic attack is the single strong hit; every other attack is an area attack.
export const BOSS_BASIC_ID = 'attack.front-slam';
// Shared standoff used by pursuit and the basic attack on oversized bodies.
export const BOSS_CONTACT_MARGIN = 0.2;
// All the damage an attack of this strength deals when it reaches `hits` units (what BOSS_HIT_SPLIT adds up to).
export function bossAttackTotal(multiplier, hits) {
    return multiplier * (BOSS_HIT_SPLIT.everyone * hits + (1 - BOSS_HIT_SPLIT.everyone));
}
// Each element band's boss has one signature skill. All of its damage is element damage (see elementDamageTaken) and it
// is used on the shared cooldown. Water: a narrow jet that pushes. Grass: roots erupt under the target. Fire: a long
// breath that burns several times. Ice: a pulse around the boss that freezes. Lightning: a chain that jumps `hops` times,
// each jump `falloff` of the one before, to the nearest ally not hit yet.
const SIGNATURE_COOLDOWN = 5;
export const SIGNATURE_PATTERN_CONFIG = Object.freeze({
    'signature.water': Object.freeze({
        kind: 'signature-water',
        element: 5,
        unlockHp: 1,
        windup: 0.9,
        active: 0.4,
        recover: 0.7,
        cooldown: SIGNATURE_COOLDOWN,
        reach: 13,
        halfWidth: 1.1,
        damageMultiplier: 1.6,
        knockback: 20,
        lift: 2,
        groundOnly: true,
    }),
    'signature.grass': Object.freeze({
        kind: 'signature-grass',
        element: 3,
        unlockHp: 1,
        windup: 1,
        active: 0.4,
        recover: 0.7,
        cooldown: SIGNATURE_COOLDOWN,
        reach: 9,
        radius: 2.6,
        damageMultiplier: 1.6,
        knockback: 3,
        lift: 14,
        groundOnly: true,
    }),
    'signature.fire': Object.freeze({
        kind: 'signature-fire',
        element: 1,
        unlockHp: 1,
        windup: 0.9,
        active: 1.2,
        recover: 0.8,
        cooldown: SIGNATURE_COOLDOWN,
        reach: 10.5,
        sector: (Math.PI * 2) / 3,
        ticks: 4,
        damageMultiplier: 0.4,
        knockback: 3,
        lift: 0,
        groundOnly: true,
    }),
    'signature.ice': Object.freeze({
        kind: 'signature-ice',
        element: 2,
        unlockHp: 1,
        windup: 1,
        active: 0.3,
        recover: 0.8,
        cooldown: SIGNATURE_COOLDOWN,
        reach: 8.5,
        freeze: 1.5,
        damageMultiplier: 1.6,
        knockback: 6,
        lift: 4,
        groundOnly: true,
    }),
    'signature.lightning': Object.freeze({
        kind: 'signature-lightning',
        element: 4,
        unlockHp: 1,
        windup: 0.8,
        active: 0.8,
        recover: 0.7,
        cooldown: SIGNATURE_COOLDOWN,
        reach: 12,
        hops: 7,
        hopSeconds: 0.1,
        hopRadius: 6,
        falloff: 0.9,
        damageMultiplier: 1.6,
        knockback: 2,
        lift: 3,
        groundOnly: false,
    }),
});
export const BOSS_PATTERN_CONFIG = Object.freeze({
    ...SIGNATURE_PATTERN_CONFIG,
    'attack.sweep-360': Object.freeze({
        kind: 'sweep-360',
        unlockHp: 0.4,
        windup: 1.05,
        active: 1.05,
        recover: 1.05,
        cooldown: 16,
        reach: 7.35,
        damageMultiplier: 2.5,
        knockback: 13,
        lift: 10.2,
        groundOnly: true,
    }),
    'attack.front-slam': Object.freeze({
        kind: 'front-slam',
        unlockHp: 1,
        windup: 0.75,
        active: 0,
        recover: 0.75,
        cooldown: 5,
        reach: 5.5,
        sector: Math.PI / 3,
        damageMultiplier: 4,
        knockback: 13,
        lift: 10.2,
        groundOnly: true,
    }),
    'attack.charge': Object.freeze({
        kind: 'charge',
        unlockHp: 1,
        windup: 0.5,
        active: 6.6 / 5.3,
        recover: 0.75,
        cooldown: 12,
        reach: 6.6,
        speed: 5.3,
        damageMultiplier: 2,
        knockback: 13,
        lift: 10.2,
        groundOnly: false,
    }),
    'attack.leap-slam': Object.freeze({
        kind: 'leap-slam',
        unlockHp: 0.6,
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
        unlockHp: 0.75,
        windup: 1,
        active: 0.8,
        recover: 1,
        cooldown: 5,
        reach: 7.35,
        sector: (Math.PI * 2) / 3,
        damageMultiplier: 2,
        knockback: 13,
        lift: 10.2,
        groundOnly: true,
    }),
    'summon.mouth-t1': Object.freeze({
        kind: 'mouth-t1',
        unlockHp: 0.5,
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
// The basic attack and the area attacks are chosen 1 : 1 whenever both can be used.
const BOSS_BASIC_SHARE = 0.5;
const BOSS_PATTERN_WEIGHT_DEFAULTS = Object.freeze({
    base: 1,
    eligibleBonus: 0.5,
    cap: 3,
});
// Boss phases: a pattern joins the rotation once boss HP falls to its unlockHp fraction.
export const BOSS_ENRAGE = Object.freeze({ damageMultiplier: 2, cooldownMultiplier: 0.5 });
export const BOSS_PHASE_THRESHOLDS = Object.freeze(
    [...new Set(BOSS_PATTERN_IDS.map((id) => BOSS_PATTERN_CONFIG[id].unlockHp).filter((t) => t < 1))].sort(
        (a, b) => b - a,
    ),
);
export const BOSS_AIM_TURN_RATE = 5.5;
export function createBossPatternRuntime() {
    return {
        weights: Object.fromEntries(BOSS_PATTERN_IDS.map((id) => [id, BOSS_PATTERN_WEIGHT_DEFAULTS.base])),
        // A signature skill is not ready at the start of a fight: it waits out its first cooldown.
        cooldowns: Object.fromEntries(
            BOSS_PATTERN_IDS.map((id) => [id, BOSS_PATTERN_CONFIG[id].element ? SIGNATURE_COOLDOWN : 0]),
        ),
        active: null,
        encounterElapsed: 0,
    };
}

// Caller supplies only currently eligible IDs. The basic attack takes BOSS_BASIC_SHARE of the picks when an area attack
// is also possible; the area attacks share the rest by weight. Ineligible patterns are never touched, so their
// accumulated weights remain frozen until they can be used.
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
    const AREA = ELIGIBLE.filter((id) => id !== BOSS_BASIC_ID);
    if (ELIGIBLE.includes(BOSS_BASIC_ID) && (!AREA.length || random() < BOSS_BASIC_SHARE)) {
        return BOSS_BASIC_ID;
    }
    const TOTAL = AREA.reduce((sum, id) => sum + Math.max(0, runtime.weights[id] || 0), 0);
    if (!(TOTAL > 0)) {
        return null;
    }
    let roll = random() * TOTAL;
    let chosen = AREA.at(-1);
    for (const ID of AREA) {
        roll -= Math.max(0, runtime.weights[ID] || 0);
        if (roll < 0) {
            chosen = ID;
            break;
        }
    }
    for (const ID of AREA) {
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
