// Species-specific attack behavior stays separate from common unit stats.
// This ID-keyed object is the single profile lookup for all catalogued species.
const ATTACK_DEFAULTS = Object.freeze({
  timing:Object.freeze({windup:.28,recovery:.65}),
  range:1.45,skillMultiplier:1,projectileCount:0,bounces:0
});
// Resolve overrides once when this module loads. Each attack and its timing
// remain immutable; absent active duration stays absent for path-timed attacks.
function attackProfile(kind, {timing, ...overrides} = {}) {
  return Object.freeze({
    kind,...ATTACK_DEFAULTS,...overrides,
    timing:timing?Object.freeze({...ATTACK_DEFAULTS.timing,...timing}):ATTACK_DEFAULTS.timing
  });
}
export const UNIT_ABILITY_PROFILES = Object.freeze({
  0: attackProfile("ram"),
  1: attackProfile("lob", {timing:{windup:.38,recovery:1.25},range:4.1,skillMultiplier:1.6,projectileCount:1}),
  2: attackProfile("leap", {timing:{windup:.32,recovery:.9},range:2.5,skillMultiplier:1.3}),
  3: attackProfile("punch"),
  // One Peanut remains one world unit; its two kernels are presentation-only
  // and the two deterministic strike slots share the same active window.
  4: attackProfile("peanut-dual-strike", {timing:{windup:.25,active:.5,recovery:1}}),
  // Walnut's base hammer is a single hit; the separate guard trait empowers
  // one subsequent basic cycle without adding an attack queue or timer.
  5: attackProfile("walnut-hammer", {timing:{windup:.5,active:.25,recovery:1}}),
  6: attackProfile("ram"),
  7: attackProfile("punch"),
  8: attackProfile("ram")
});

export function abilityProfile(species) {
  return UNIT_ABILITY_PROFILES[species] || UNIT_ABILITY_PROFILES[0];
}

// Species only select reusable behavior here. The simulator never uses species
// IDs to select attack mechanics. Compositions are compiled once, not scanned
// as a component list on every update. Any profile can select the same traits.
const composition = (attack, traits = [], options = {}) => Object.freeze({
  attack, traits: Object.freeze(traits),
  contactRecoil: false, useActiveDuration: false,
  retreatWithinRange: false, aimAtCenter: false, outerRangeSlack: .55,
  ...options
});
export const UNIT_CAPABILITY_COMPOSITIONS = Object.freeze({
  0: composition('contact', ['deathSplit'], {contactRecoil: true}),
  1: composition('projectile', ['burstFire', 'popcorn'], {retreatWithinRange: true, aimAtCenter: true}),
  2: composition('contact', ['landing', 'landingShockwave', 'leapReset']),
  3: composition('contact', ['launchFan'], {contactRecoil: true}),
  4: composition('repeatedStrike', ['assault'], {useActiveDuration: true, outerRangeSlack: 0}),
  5: composition('contact', ['guard'], {useActiveDuration: true}),
  6: composition('contact', ['harvest'], {contactRecoil: true}),
  7: composition('contact', ['commandAura'], {contactRecoil: true}),
  8: composition('contact', ['armorBreak'], {contactRecoil: true})
});

export function unitCapabilityComposition(species) {
  return UNIT_CAPABILITY_COMPOSITIONS[species] || UNIT_CAPABILITY_COMPOSITIONS[0];
}

export function hasUnitCapability(species, capability) {
  const definition = UNIT_CAPABILITY_COMPOSITIONS[species];
  return !!definition && (definition.attack === capability || definition.traits.includes(capability));
}

// Reuse existing species indexes for capability queries without re-scanning the
// whole roster or a component list. Runtime iteration visits equipped groups.
const capabilitySpecies = new Map();
for (const [species, definition] of Object.entries(UNIT_CAPABILITY_COMPOSITIONS)) {
  for (const capability of new Set([definition.attack, ...definition.traits])) {
    if (!capabilitySpecies.has(capability)) capabilitySpecies.set(capability, []);
    capabilitySpecies.get(capability).push(Number(species));
  }
}
for (const species of capabilitySpecies.values()) Object.freeze(species);
const NO_SPECIES = Object.freeze([]);
export function speciesWithCapability(capability) {
  return capabilitySpecies.get(capability) || NO_SPECIES;
}
