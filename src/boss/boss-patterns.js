// Shared Farm/Raid boss kit. Pattern behavior is shared by species; species
// only selects the authored body and the T1 reward/summon identity.
export const BOSS_PATTERN_IDS = Object.freeze([
    'attack.slam',
    'attack.sweep-360',
    'attack.charge',
    'attack.leap-slam',
    'attack.fan-sweep',
    'attack.spin-throw',
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
// The boss's basic attack is the slam (attack.slam, `basic`): it never takes a special's turn in the rhythm.
// Only a boss that walks into its species' own attack range before the slam's swings that attack, once per half second.
export const BOSS_BASIC_TIMING = Object.freeze({ windup: 0.2, recovery: 0.25 });
// A pattern worth using must reach at least this many units, otherwise the basic attack does the job.
export const BOSS_AREA_MIN_HITS = 2;
// The boss's basic attack, and what it uses instead when no troop is within the slam's reach.
export const BOSS_BASIC_PATTERN = 'attack.slam';
export const BOSS_GAP_CLOSERS = Object.freeze(['attack.leap-slam', 'attack.charge']);
// Rhythm: `basicsPerSpecial` basic attacks, then one special; every `specialsPerArea`-th special is an area pattern
// and the others are the boss's own element skill. An unavailable special is skipped for the other kind, never queued.
export const BOSS_RHYTHM = Object.freeze({ basicsPerSpecial: 7, specialsPerArea: 3 });
// Each element band's boss has one signature skill. All of its damage is element damage (see elementDamageTaken) and it
// is used on the shared cooldown. Water: a narrow jet that pushes. Grass: roots erupt under the target. Fire: a long
// breath that burns several times. Ice: a pulse around the boss that freezes. Lightning: a chain that jumps `hops` times,
// each jump `falloff` of the one before, to the nearest ally not hit yet.
const SIGNATURE_COOLDOWN = 5;
const SIGNATURE_PATTERN_CONFIG = Object.freeze({
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
// Patterns only minions cast (MINION_KINDS), through the same kit as the boss's: telegraph, hit settlement, element
// damage. Their element is the caster's own (enemyElement). Extents are world units at the minion's size (its kind's
// patternScale is 1). bolt: the ranged basic, a shot that flies `speed` to the locked point and hits one ally within
// hitRadius of it. mortar: a shell lobbed onto the target, telegraphed `radius` circle there. blast: the bomber's fuse,
// a `radius` circle past its own body edge; it explodes when the windup ends and the bomber dies with it.
const MINION_PATTERN_CONFIG = Object.freeze({
    'minion.bolt': Object.freeze({
        kind: 'minion-bolt',
        unlockHp: 1,
        windup: 0.35,
        active: 9 / 18,
        recover: 0.25,
        cooldown: 1.6,
        reach: 9,
        speed: 18,
        hitRadius: 0.6,
        damageMultiplier: 1,
        knockback: 2,
        lift: 0.6,
        groundOnly: true,
    }),
    'minion.mortar': Object.freeze({
        kind: 'minion-mortar',
        unlockHp: 1,
        windup: 1.1,
        active: 0.3,
        recover: 0.5,
        cooldown: 6,
        reach: 11,
        radius: 2.6,
        damageMultiplier: 1.6,
        knockback: 4,
        lift: 3,
        groundOnly: true,
    }),
    'minion.blast': Object.freeze({
        kind: 'minion-blast',
        unlockHp: 1,
        windup: 0.9,
        active: 0.05,
        recover: 0,
        cooldown: 0,
        // Lights once the pack it runs at is within this gap of its body edge.
        reach: 1.5,
        radius: 3,
        damageMultiplier: 4,
        knockback: 13,
        lift: 6,
        groundOnly: true,
    }),
});
export const SUMMON_PATTERN_ID = 'summon.mouth-t1';
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
    // Slam: the basic attack of the boss and of a caster minion. The lead hand comes down on the nearest troop within
    // `reachPastBody` of the body's edge (or that far toward it),
    // and everyone within `radius` of that spot is hit and thrown outward as hard as the arm sweep throws: three to
    // five troops of a tight pack. Its damage is split like any area hit; at `damageMultiplier` 0.5 four troops
    // together take about what one punch used to deal to a single troop.
    // When no troop is within reach the boss uses a gap closer (leap or charge, whichever is ready) or walks.
    'attack.slam': Object.freeze({
        kind: 'slam',
        basic: true,
        unlockHp: 1,
        windup: 0.2,
        active: 0.05,
        recover: 0.25,
        cooldown: 0,
        reachPastBody: 0.9,
        radius: 0.9,
        damageMultiplier: 0.5,
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
    // Spin throw: the boss spins on the spot with both hands out, `turns` times round over `active`; every
    // `throwInterval` it flings `throwCount` troops in its reach, one from each of as many equal slices of the circle
    // (the slices start at a random angle, the troop in each slice is drawn at random), so they fly off all round
    // instead of in one wall. A throw is outward with `spin` of the turn's tangent, as high as the arm sweep's.
    // On its own clock like the summon (from `firstEligible` s into the fight): a crowd keeps cutting the basic
    // attacks short, so the rhythm's area slot comes round too rarely for the boss to be seen spinning.
    'attack.spin-throw': Object.freeze({
        kind: 'spin-throw',
        ownClock: true,
        unlockHp: 1,
        firstEligible: 5,
        windup: 1,
        active: 2,
        recover: 1,
        cooldown: 12,
        reach: 7.35,
        turns: 3,
        throwInterval: 0.2,
        throwCount: 10,
        spin: 0.5,
        damageMultiplier: 1,
        knockback: 13,
        lift: 10.2,
        groundOnly: true,
    }),
    // Summon: a damage-free shockwave clears the ground around the boss as the windup starts, then the boss spits
    // `volleyCount` minions onto the cleared ring. How many may be alive at once, the kinds, when it unlocks and its
    // cooldown come from the floor's summon band (tower-encounter.js); unlockHp and cooldown here are the first band's.
    // A minion is the boss shrunk to a giant unit: weak stats, but it casts its summoner's element skill (minion).
    'summon.mouth-t1': Object.freeze({
        kind: 'mouth-t1',
        // On its own clock: cast whenever its cooldown is up and there is room for minions, outside the basic/special
        // rhythm, so the boss keeps calling minions even while a crowd keeps cutting its basic attacks short.
        ownClock: true,
        unlockHp: 0.75,
        windup: 0.5,
        active: 0.75,
        recover: 0.5,
        cooldown: 10,
        firstEligible: 10,
        volleyCount: 2,
        releaseInterval: 0.25,
        dropHeight: 3,
        landingSeconds: 0.56,
        // A minion lands this far past the boss's edge, with its whole body clear of the boss (mouth-summon model).
        landingGap: 0.3,
        // Reaches 7.2 past the boss's edge (beyond the landing spot: gap + a minion's width ≈ 3.7) and pushes like the
        // boss's own arm sweep (fan-sweep knockback 13) with half of its lift: troops are thrown clear, not launched.
        shockwave: Object.freeze({ radius: 7.2, knockback: 13, lift: 10.2 * 0.5 }),
        // Every minion's body and stat share: bodyScale × the summoner species' T1 body (via the giant size; giant
        // armor comes with it); hpRatio/attackRatio × the summoner's max HP and attack. Its kind (MINION_KINDS) adds
        // how it fights.
        minion: Object.freeze({ bodyScale: 6, hpRatio: 0.05, attackRatio: 0.25 }),
    }),
    ...MINION_PATTERN_CONFIG,
});
// The element skill (signature pattern id) of an element, or null.
export function signaturePatternFor(element) {
    return Object.keys(SIGNATURE_PATTERN_CONFIG).find((id) => SIGNATURE_PATTERN_CONFIG[id].element === element) ?? null;
}
// The minion pool (#SSOT, data-driven): every kind IS-A boss minion (the body and shares above) and HAS-A behaviour
// (boss/boss-minions.js) that casts the boss-kit patterns named here. A summon draws each minion by `weight`.
//   caster  melee basic + the summoner's element skill at patternScale of the boss's reach, castCooldownMultiplier × cooldown
//   ranged  holds keepDistance from its nearest ally (steps back first inside fleeDistance); `basic` bolt whenever ready,
//           `pattern` mortar on its own cooldown
//   bomber  runs at speedMultiplier × unit speed to the densest pack (most allies within clusterRadius, among those
//           within scanRadius, re-picked every retargetSeconds) and lights `pattern` (the fuse) once in reach of it
// hpScale: × the minion health share. patternScale: × the authored extent of the patterns it casts.
export const MINION_KINDS = Object.freeze({
    caster: Object.freeze({
        id: 'caster',
        summonKind: 'boss-minion-caster',
        weight: 2,
        hpScale: 1,
        patternScale: 0.5,
        castCooldownMultiplier: 2,
    }),
    ranged: Object.freeze({
        id: 'ranged',
        summonKind: 'boss-minion-ranged',
        weight: 2,
        hpScale: 1,
        patternScale: 1,
        castCooldownMultiplier: 1,
        keepDistance: 8,
        // Closer than this (half of keepDistance) it steps back before it shoots, unless a wall stops it.
        fleeDistance: 4,
        basic: 'minion.bolt',
        pattern: 'minion.mortar',
    }),
    bomber: Object.freeze({
        id: 'bomber',
        summonKind: 'boss-minion-bomber',
        weight: 1,
        hpScale: 0.6,
        patternScale: 1,
        castCooldownMultiplier: 1,
        speedMultiplier: 1.6,
        clusterRadius: 3,
        scanRadius: 14,
        retargetSeconds: 0.5,
        pattern: 'minion.blast',
    }),
});
const MINION_KINDS_BY_SUMMON = new Map(Object.values(MINION_KINDS).map((kind) => [kind.summonKind, kind]));
// The kind row of a boss minion (by its saved battleSummonKind), or null for everyone else.
export function minionKindOf(unit) {
    return MINION_KINDS_BY_SUMMON.get(unit?.battleSummonKind) ?? null;
}
// The one predicate for "a boss-summoned minion" (counts, deaths, validation, render).
export function isBossMinion(unit) {
    return MINION_KINDS_BY_SUMMON.has(unit?.battleSummonKind);
}
// The kind a roll in [0, 1) draws, by weight, from the pool kinds named in `ids`.
export function drawMinionKind(roll, ids) {
    const KINDS = ids.map((id) => MINION_KINDS[id]),
        TOTAL = KINDS.reduce((sum, kind) => sum + kind.weight, 0);
    let left = roll * TOTAL;
    for (const KIND of KINDS) {
        left -= KIND.weight;
        if (left < 0) {
            return KIND;
        }
    }
    return KINDS[KINDS.length - 1];
}
// How far a caster's boss patterns reach, × the authored extent: a giant boss reaches as far past its larger body as
// it did past its normal one (its giant scale); a minion reaches patternScale of the boss's. Render views carry the
// value this returned for their unit (patternReachScale), so model and telegraph share one answer.
export function patternReachScale(actor) {
    return actor.patternReachScale ?? minionKindOf(actor)?.patternScale ?? actor.giantScale ?? 1;
}

// The boss's basic attack throws its target as far as the arm sweep does, so a plain swing feels as heavy as a special.
// It follows the sweep's numbers instead of keeping its own, so tuning the sweep tunes the swing too.
export const BOSS_BASIC_KNOCK = Object.freeze({
    power: BOSS_PATTERN_CONFIG['attack.fan-sweep'].knockback,
    lift: BOSS_PATTERN_CONFIG['attack.fan-sweep'].lift,
});
const BOSS_PATTERN_WEIGHT_DEFAULTS = Object.freeze({
    base: 1,
    eligibleBonus: 0.5,
    cap: 3,
});
// Boss phases: a pattern joins the rotation once boss HP falls to its unlockHp fraction.
// Enraged (past the fight's time limit; a tower boss at 60 s): double damage and half cooldowns, it fires the area
// patterns ready instead of slamming, walks `chaseMultiplier` x faster and its gap closers (charge, leap) go
// `gapCloserScale` x as far and as fast, so an army running round to heal is caught.
export const BOSS_ENRAGE = Object.freeze({
    damageMultiplier: 2,
    cooldownMultiplier: 0.5,
    chaseMultiplier: 2,
    gapCloserScale: 2,
});
// The charge's and leap's reach (and the charge's speed) multiplier: `boss.enraged` is set by its controller each
// tick and carried by the render projection, never saved.
export function gapCloserScale(boss) {
    return boss.enraged ? BOSS_ENRAGE.gapCloserScale : 1;
}
export const BOSS_PHASE_THRESHOLDS = Object.freeze(
    [...new Set(BOSS_PATTERN_IDS.map((id) => BOSS_PATTERN_CONFIG[id].unlockHp).filter((t) => t < 1))].sort(
        (a, b) => b - a,
    ),
);
// Stagger: the boss shrugs off single hits (super armor), but every `gauge` of its health lost since it last went
// down puts it down for `seconds`, and a boss that is down (stunned by anything) takes `damageTaken` times the
// damage. `patternRuntime.staggerFrom` is the health fraction the gauge counts from; damage taken while down does
// not fill it, and healing drains it. Getting up from a stagger, the boss heals `recovery.healLost` of the health it
// lost since it last got up (`patternRuntime.risenFrom`, the health fraction then; full at the start), so every
// stagger still leaves it lower than the one before, and swings `recovery.pattern` at once, without its windup, throwing the troops that piled on while it was
// down: a grown-up army cannot just stand on the boss and melt it. `patternRuntime.stagger` is 'standing', 'down'
// (staggered) or 'rising' (the recovery swing until it ends); the gauge only fills while standing.
export const BOSS_STAGGER_STATES = Object.freeze(['standing', 'down', 'rising']);
export const BOSS_STAGGER = Object.freeze({
    gauge: 0.1,
    seconds: 2,
    damageTaken: 1.5,
    recovery: Object.freeze({ pattern: 'attack.sweep-360', healLost: 0.2 }),
});
export function bossHealthFraction(boss) {
    return Math.min(1, Math.max(0, boss.hp) / Math.max(1, boss.maxHp));
}
// How full the stagger gauge is, 0..1. While the boss is down it shows the recovery instead: empty as it falls,
// full as it gets up.
export function bossStaggerGauge(boss) {
    if (boss.stun > 0) {
        return 1 - Math.min(1, boss.stun / BOSS_STAGGER.seconds);
    }
    const FROM = boss.patternRuntime?.staggerFrom ?? 1;
    return Math.min(1, Math.max(0, (FROM - bossHealthFraction(boss)) / BOSS_STAGGER.gauge));
}
// Hit cap: a boss or minion pattern hit takes at most `pattern` of the troop's maximum health, after armor and crits,
// so a grown troop shrugs off what a weak one cannot and one swing never wipes the crowd that piled on, whatever the
// floor's boss attack is.
export const BOSS_HIT_CAPS = Object.freeze({ pattern: 0.25 });
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
        staggerFrom: 1,
        stagger: 'standing',
        risenFrom: 1,
    };
}

// Caller supplies only currently eligible IDs and the boss's rhythm counters. Returns null while the boss should keep
// using its basic attack. Area patterns share their slot by weight; ineligible patterns are never touched, so their
// accumulated weights remain frozen until they can be used.
export function chooseBossPattern(runtime, eligibleIds, random, rhythm) {
    if (!runtime || !runtime.weights || !Array.isArray(eligibleIds) || typeof random !== 'function' || !rhythm) {
        throw new TypeError(
            'Boss pattern selection requires runtime, eligible patterns, rhythm and a seeded random source',
        );
    }
    if (rhythm.basicCount < BOSS_RHYTHM.basicsPerSpecial) {
        return null;
    }
    const ELIGIBLE = [...new Set(eligibleIds)]
        .filter((id) => BOSS_PATTERN_IDS.includes(id))
        .sort((a, b) => BOSS_PATTERN_IDS.indexOf(a) - BOSS_PATTERN_IDS.indexOf(b));
    const AREA = ELIGIBLE.filter((id) => !BOSS_PATTERN_CONFIG[id].element),
        SIGNATURE = ELIGIBLE.filter((id) => BOSS_PATTERN_CONFIG[id].element);
    const AREA_DUE = (rhythm.specialCount + 1) % BOSS_RHYTHM.specialsPerArea === 0;
    if (!(AREA_DUE && AREA.length)) {
        return SIGNATURE[0] ?? null;
    }
    const TOTAL = AREA.reduce((sum, id) => sum + Math.max(0, runtime.weights[id] || 0), 0);
    if (!(TOTAL > 0)) {
        return SIGNATURE[0] ?? null;
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
