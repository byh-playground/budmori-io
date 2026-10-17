// The runtime faction field is the single source of truth for combat sides.
export const FACTION_CONFIG = Object.freeze({ PLAYER: 'player', ENEMY: 'enemy' });

export function hasFaction(actor, faction) {
  return actor?.faction === faction;
}

export function areOpposingFactions(a, b) {
  return !!a && !!b && typeof a.faction === 'string' && typeof b.faction === 'string' && a.faction !== b.faction;
}

export function legacyUnitFaction(unit) {
  return unit?.battleSummonKind === 'boss-mouth-t1' ? FACTION_CONFIG.ENEMY : FACTION_CONFIG.PLAYER;
}
