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
