// Species-specific attack behavior stays separate from common unit stats.
// This ID-keyed object is the single profile lookup for all catalogued species.
export const UNIT_ABILITY_PROFILES = Object.freeze({
  0: Object.freeze({ kind: "ram", windup: .28, recovery: .65, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 }),
  1: Object.freeze({ kind: "lob", windup: .38, recovery: 1.25, range: 4.1, skillMultiplier: 1.6, projectileCount: 1, bounces: 0 }),
  2: Object.freeze({ kind: "leap", windup: .32, recovery: .9, range: 2.5, skillMultiplier: 1.3, projectileCount: 0, bounces: 0 }),
  3: Object.freeze({ kind: "punch", windup: .28, recovery: .65, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 }),
  // One Peanut remains one world unit; its two kernels are presentation-only
  // and the two deterministic strike slots share the same active window.
  4: Object.freeze({ kind: "peanut-dual-strike", windup: .25, active: .5, recovery: 1, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 }),
  // Walnut's base hammer is a single hit; the separate guard trait empowers
  // one subsequent basic cycle without adding an attack queue or timer.
  5: Object.freeze({ kind: "walnut-hammer", windup: .5, active: .25, recovery: 1, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 }),
  6: Object.freeze({ kind: "ram", windup: .28, recovery: .65, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 }),
  7: Object.freeze({ kind: "punch", windup: .28, recovery: .65, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 }),
  8: Object.freeze({ kind: "ram", windup: .28, recovery: .65, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 })
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
