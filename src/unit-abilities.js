import { FEATURE as LOB_FEATURE } from './features/unit-attacks/lob/definition.js';
import { FEATURE as DUAL_STRIKE_FEATURE } from './features/unit-attacks/dual-strike/definition.js';
import { KIDNEY_CONTINUOUS_LEAP_FEATURE } from './features/abilities/kidney-continuous-leap.js';
import { CHESTNUT_THORNS_FEATURE } from './features/abilities/chestnut-thorns/definition.js';
// Species-specific attack behavior stays separate from common unit stats.
// This ID-keyed object is the single profile lookup for all catalogued species.
const ATTACK_DEFAULTS = Object.freeze({
    timing: Object.freeze({
        windup: 0.28,
        recovery: 0.65,
    }),
    range: 1.45,
    skillMultiplier: 1,
    projectileCount: 0,
    bounces: 0,
});
// Resolve overrides once when this module loads. Each attack and its timing
// remain immutable; absent active duration stays absent for path-timed attacks.
function attackProfile(kind, { timing, ...overrides } = {}) {
    return Object.freeze({
        kind,
        ...ATTACK_DEFAULTS,
        ...overrides,
        timing: timing
            ? Object.freeze({
                  ...ATTACK_DEFAULTS.timing,
                  ...timing,
              })
            : ATTACK_DEFAULTS.timing,
    });
}
export const UNIT_ABILITY_PROFILES = Object.freeze({
    0: attackProfile('ram'),
    1: attackProfile(LOB_FEATURE.id, {
        timing: {
            windup: 0.38,
            recovery: 1.25,
        },
        range: 4.1,
        skillMultiplier: 1.6,
        projectileCount: 1,
    }),
    2: attackProfile('ram'),
    3: attackProfile('punch'),
    // One Peanut remains one world unit; its two kernels are presentation-only
    // and the two deterministic strike slots share the same active window.
    4: attackProfile(DUAL_STRIKE_FEATURE.id, {
        timing: {
            windup: 0.25,
            active: 0.5,
            recovery: 1,
        },
    }),
    // Walnut's base hammer is a single hit; the separate guard trait empowers
    // one subsequent basic cycle without adding an attack queue or timer.
    5: attackProfile('walnut-hammer', {
        timing: {
            windup: 0.5,
            active: 0.25,
            recovery: 1,
        },
    }),
    6: attackProfile('ram'),
    7: attackProfile('punch'),
    8: attackProfile('ram'),
});
export function abilityProfile(species) {
    return UNIT_ABILITY_PROFILES[species] || UNIT_ABILITY_PROFILES[0];
}

// Species only select reusable behavior here. The simulator never uses species
// IDs to select attack mechanics. Compositions are compiled once, not scanned
// as a component list on every update. Any profile can select the same traits.
const COMPOSITION = (attack, traits = [], options = {}) =>
    Object.freeze({
        attack,
        traits: Object.freeze(traits),
        contactRecoil: false,
        useActiveDuration: false,
        retreatWithinRange: false,
        aimAtCenter: false,
        outerRangeSlack: 0.55,
        specialAbility: null,
        ...options,
    });
export const UNIT_CAPABILITY_COMPOSITIONS = Object.freeze({
    0: COMPOSITION('pea', ['recoveryHaste'], {
        contactRecoil: true,
    }),
    1: COMPOSITION(LOB_FEATURE.modelKey, ['cornAttachment'], {
        retreatWithinRange: true,
        aimAtCenter: true,
    }),
    2: COMPOSITION('redbean', [], { specialAbility: 'kidneyLeap' }),
    3: COMPOSITION('chestnut', [], {
        contactRecoil: true,
        specialAbility: 'chestnutThorns',
    }),
    4: COMPOSITION(DUAL_STRIKE_FEATURE.modelKey, ['deathSplit'], {
        useActiveDuration: true,
        outerRangeSlack: 0,
    }),
    5: COMPOSITION('walnut', ['guard'], {
        useActiveDuration: true,
    }),
    6: COMPOSITION('rice', ['riceCritical'], {
        useActiveDuration: true,
    }),
    7: COMPOSITION('contact', ['commandAura'], {
        contactRecoil: true,
    }),
    8: COMPOSITION('contact', ['armorBreak'], {
        contactRecoil: true,
    }),
});
export const UNIT_SPECIAL_ABILITY_COMPOSITIONS = Object.freeze({
    chestnutThorns: Object.freeze({
        definition: CHESTNUT_THORNS_FEATURE.definition,
        profile: CHESTNUT_THORNS_FEATURE.definition.attackProfile,
        cooldownTicks: CHESTNUT_THORNS_FEATURE.definition.cooldownTicks,
        attack: 'contact',
        traits: Object.freeze(['chestnutThorns']),
        composition: Object.freeze({
            attack: 'contact',
            traits: Object.freeze(['chestnutThorns']),
            contactRecoil: false,
            useActiveDuration: false,
            retreatWithinRange: false,
            aimAtCenter: false,
            outerRangeSlack: 0.55,
            specialAbility: null,
        }),
    }),
    kidneyLeap: Object.freeze({
        definition: KIDNEY_CONTINUOUS_LEAP_FEATURE.definition,
        profile: KIDNEY_CONTINUOUS_LEAP_FEATURE.model.specialAttackProfile,
        cooldownTicks: KIDNEY_CONTINUOUS_LEAP_FEATURE.model.cooldownTicks,
        attack: 'contact',
        traits: Object.freeze(['landing', 'leapReset', 'kidneyLeap']),
        composition: Object.freeze({
            attack: 'contact',
            traits: Object.freeze(['landing', 'leapReset', 'kidneyLeap']),
            contactRecoil: false,
            useActiveDuration: false,
            retreatWithinRange: false,
            aimAtCenter: false,
            outerRangeSlack: 0.55,
            specialAbility: null,
        }),
    }),
});
export function unitCapabilityComposition(species) {
    return UNIT_CAPABILITY_COMPOSITIONS[species] || UNIT_CAPABILITY_COMPOSITIONS[0];
}
export function specialAbilityCompositionFor(species) {
    const NAME = unitCapabilityComposition(species).specialAbility;
    return NAME ? UNIT_SPECIAL_ABILITY_COMPOSITIONS[NAME] || null : null;
}
export function hasUnitCapability(species, capability) {
    const DEFINITION = UNIT_CAPABILITY_COMPOSITIONS[species];
    return (
        !!DEFINITION &&
        (DEFINITION.attack === capability ||
            DEFINITION.traits.includes(capability) ||
            DEFINITION.specialAbility === capability)
    );
}

// Reuse existing species indexes for capability queries without re-scanning the
// whole roster or a component list. Runtime iteration visits equipped groups.
const CAPABILITY_SPECIES = new Map();
for (const [SPECIES, DEFINITION] of Object.entries(UNIT_CAPABILITY_COMPOSITIONS)) {
    for (const CAPABILITY of new Set([
        DEFINITION.attack,
        ...DEFINITION.traits,
        ...(DEFINITION.specialAbility ? [DEFINITION.specialAbility] : []),
    ])) {
        if (!CAPABILITY_SPECIES.has(CAPABILITY)) {
            CAPABILITY_SPECIES.set(CAPABILITY, []);
        }
        CAPABILITY_SPECIES.get(CAPABILITY).push(Number(SPECIES));
    }
}
for (const SPECIES of CAPABILITY_SPECIES.values()) {
    Object.freeze(SPECIES);
}
const NO_SPECIES = Object.freeze([]);
export function speciesWithCapability(capability) {
    return CAPABILITY_SPECIES.get(capability) || NO_SPECIES;
}
