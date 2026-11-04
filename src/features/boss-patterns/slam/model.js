import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';

// Reach only: the presentation puts the hand on the same spot the model hits.
const GEOMETRY = new BossPattern(FEATURE, null);

// Where the hand comes down: the target's spot, no farther from the boss than its reach.
export function slamPoint(boss, target) {
    const DX = target.x - boss.x,
        DY = target.y - boss.y,
        D_LOCAL = Math.hypot(DX, DY),
        REACH = GEOMETRY.reachFor(boss),
        SCALE = D_LOCAL > REACH ? REACH / D_LOCAL : 1;
    return { x: boss.x + DX * SCALE, y: boss.y + DY * SCALE };
}

// The boss's basic attack: a hand slammed down on the nearest troop, throwing everyone in a small disc around that
// spot outward (see the config in boss-patterns.js).
export class SlamBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
    }
    writeArea(boss, action, _scene, pad, area) {
        const POINT = slamPoint(boss, action.target ?? boss);
        area.kind = 'disk';
        area.x = POINT.x;
        area.y = POINT.y;
        area.reach = this.config.radius + pad;
    }
    activate(world, action, boss) {
        const POINT = slamPoint(boss, action.target ?? boss);
        for (const UNIT of world.bossGroundUnitsNear(POINT.x, POINT.y, this.config.radius, boss)) {
            // Thrown away from where the hand came down; the troop right under it goes the way the boss faces.
            const DX = UNIT.x - POINT.x,
                DY = UNIT.y - POINT.y,
                N = Math.hypot(DX, DY),
                NORMAL = N > 1e-6 ? { x: DX / N, y: DY / N } : { x: Math.cos(action.aim), y: Math.sin(action.aim) };
            world.hitBossPatternUnit(UNIT, action.id, { x: UNIT.x, y: UNIT.y, z: 0 }, NORMAL, boss);
        }
        world.enterBossPatternRecovery(action);
    }
}
