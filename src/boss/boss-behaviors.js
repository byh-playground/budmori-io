import { createBossPatternBehaviors } from './boss-pattern-behaviors.js';
import { BOSS_PATTERN_CONFIG } from './boss-patterns.js';
import { CONFIG, CLAMP } from '../model/farm-config.js';
import { ARENA_GEOMETRY, BALLISTICS } from '../model/arena-geometry.js';

export function bossAttackArea(boss, unitRadius = 0, scene = 'battle', area = {}) {
    const ACTION = boss.patternRuntime?.active,
        CONFIG_LOCAL = BOSS_PATTERN_CONFIG[ACTION?.id];
    if (!CONFIG_LOCAL) {
        return null;
    }
    const PHASE = ACTION.phase,
        PAD = Math.max(0, unitRadius),
        ELAPSED = Math.max(0, ACTION.phaseElapsed || 0);
    area.x = boss.x;
    area.y = boss.y;
    area.angle = ACTION.aim ?? boss.angle;
    area.patternId = ACTION.id;
    area.phase = PHASE;
    area.elapsed = ELAPSED;
    area.active = PHASE === 'active';
    area.locked = !!ACTION.locked;
    area.progress =
        PHASE === 'recover'
            ? 1
            : CLAMP(ELAPSED / (PHASE === 'windup' ? CONFIG_LOCAL.windup : CONFIG_LOCAL.active || 1), 0, 1);
    BOSS_BEHAVIORS.forId(ACTION.id).writeArea(boss, ACTION, scene, PAD, area);
    return area;
}

export const BOSS_BEHAVIORS = createBossPatternBehaviors({
    CONFIG,
    ArenaGeometry: ARENA_GEOMETRY,
    Ballistics: BALLISTICS,
    clamp: CLAMP,
});
