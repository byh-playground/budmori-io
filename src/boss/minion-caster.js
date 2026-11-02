import { BOSS_BEHAVIORS } from './boss-behaviors.js';
import { BOSS_SUMMON_MINIONS, createBossPatternRuntime, signaturePatternFor } from './boss-patterns.js';

// A boss minion casts its summoner's element skill through the boss pattern kit (same targeting, telegraph, hits),
// with itself as the caster. Stateless: the cast in progress lives on the minion (patternRuntime), is not saved, and
// starts over idle after a reload. While a cast runs the minion stands still and does nothing else.
export const MINION_CASTER = Object.freeze({
    // True while the minion is casting this tick (its ordinary intent is skipped).
    update(world, unit, dt) {
        const PROFILE = BOSS_SUMMON_MINIONS[unit.battleSummonKind],
            ID = PROFILE ? signaturePatternFor(unit.enemyElement) : null;
        if (!ID || unit.hp <= 0) {
            return false;
        }
        const RUNTIME = (unit.patternRuntime ||= {
            ...createBossPatternRuntime(),
            cooldownScale: PROFILE.castCooldownMultiplier,
        });
        RUNTIME.encounterElapsed += dt;
        RUNTIME.cooldowns[ID] = Math.max(0, RUNTIME.cooldowns[ID] - dt);
        const LIVING = world.livingBossTargets(),
            BEHAVIOR = BOSS_BEHAVIORS.forId(ID);
        if (!RUNTIME.active) {
            if (RUNTIME.cooldowns[ID] > 1e-9 || unit.stun > 0 || unit.z > 0.1 || !LIVING.length) {
                return false;
            }
            const TARGETS = world.bossPatternTargets(LIVING, unit);
            if (!BEHAVIOR.eligible(world, TARGETS, 0, unit)) {
                return false;
            }
            const FALLBACK = TARGETS.nearest || world.nearestBossTarget(LIVING, undefined, unit);
            world.beginBossPattern(ID, BEHAVIOR.selectedTarget(world, TARGETS, FALLBACK, unit), unit);
            BEHAVIOR.selected(world, unit);
        }
        const ACTION = RUNTIME.active;
        unit.vx = unit.vy = 0;
        unit.moveControlActive = false;
        ACTION.phaseElapsed += dt;
        if (ACTION.phase === 'active' && BEHAVIOR.physicalActive) {
            BEHAVIOR.updateActive(world, ACTION, dt, unit);
        } else {
            BOSS_BEHAVIORS.update(world, ACTION, dt, LIVING, unit);
        }
        world._settleBossHits(unit);
        return true;
    },
});
