// A raid deploys only living, recovered units. Downed farm units remain in the
// saved Farm roster while their simulation-time recovery timer continues.
export function raidRosterEntries(units, limit = 100) {
  if (!Array.isArray(units) || !Number.isSafeInteger(limit) || limit < 0) return [];
  return units.filter(unit => unit?.hp > 0 && unit.down <= 0 && !unit.isBattleOnlySummon && unit.countsTowardPermanentRoster !== false && unit.eligibleForRaidDeployment !== false)
    .slice(0, limit)
    .map(unit => [unit.id, unit.species, unit.tier]);
}
