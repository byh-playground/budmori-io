// Species-specific attack behavior stays separate from common unit stats.
// Values preserve the existing combat profiles at the neutral stat baseline.
export const UNIT_ABILITY_PROFILES = Object.freeze([
  Object.freeze({ kind: "ram", windup: .28, recovery: .65, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 }),
  Object.freeze({ kind: "lob", windup: .38, recovery: 1.25, range: 4.1, skillMultiplier: 1.6, projectileCount: 1, bounces: 0 }),
  Object.freeze({ kind: "leap", windup: .32, recovery: .9, range: 2.5, skillMultiplier: 1.3, projectileCount: 0, bounces: 0 }),
  Object.freeze({ kind: "punch", windup: .28, recovery: .65, range: 1.45, skillMultiplier: 1, projectileCount: 0, bounces: 0 })
]);

export function abilityProfile(species) {
  return UNIT_ABILITY_PROFILES[species] || UNIT_ABILITY_PROFILES[0];
}
