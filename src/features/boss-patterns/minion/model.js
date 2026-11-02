import { BossPattern } from '../model-base.js';
import { MINION_FEATURES, boltFlight } from './definition.js';

// Shared by the minion patterns: the hits carry the caster's own element, and each landing shows an impact.
class MinionPattern extends BossPattern {
    constructor(feature, dependencies) {
        super(feature, dependencies);
        this.physicalActive = true;
    }
    hitElement(caster) {
        return caster.enemyElement || 0;
    }
    // The telegraph and the shot are drawn in the caster's element colour.
    writeArea(boss, action, scene, pad, area) {
        area.element = this.hitElement(boss);
        this.writeShape(boss, action, scene, pad, area);
    }
    updateActive(world, action, _dt, _caster) {
        if (action.phaseElapsed >= this.config.active - 1e-9) {
            world.enterBossPatternRecovery(action);
        }
    }
    radiusFor(caster) {
        return this.attackExtentFor(caster, this.config.radius);
    }
    // Everyone grounded in the circle is hit and thrown outward.
    hitDisk(world, caster, x, y, radius) {
        for (const UNIT of world.bossGroundUnitsNear(x, y, radius, caster)) {
            const DX = UNIT.x - x,
                DY = UNIT.y - y,
                N = Math.hypot(DX, DY) || 1;
            world.hitBossPatternUnit(UNIT, this.id, { x: UNIT.x, y: UNIT.y, z: 0 }, { x: DX / N, y: DY / N }, caster);
        }
    }
    impact(world, caster, x, y, reach) {
        world.combat('minion-impact', { patternId: this.id, element: caster.enemyElement, x, y, reach });
    }
}

// The ranged minion's basic: a shot that flies from where it stood to the locked point and hits one ally there.
export class MinionBoltPattern extends MinionPattern {
    constructor(dependencies) {
        super(MINION_FEATURES.bolt, dependencies);
    }
    writeShape(boss, action, _scene, _pad, area) {
        area.kind = 'bolt';
        area.fromX = action.start?.x ?? boss.x;
        area.fromY = action.start?.y ?? boss.y;
        area.x = action.target?.x ?? boss.x;
        area.y = action.target?.y ?? boss.y;
        area.reach = this.config.hitRadius;
    }
    updateActive(world, action, _dt, caster) {
        const TARGET = action.target ?? { x: caster.x, y: caster.y };
        if (boltFlight(action.start, TARGET, action.phaseElapsed, this.config) < 1) {
            return;
        }
        // The aimed ally if it is still there, otherwise whoever stands nearest the point.
        const NEAR = world
                .bossGroundUnitsNear(TARGET.x, TARGET.y, this.config.hitRadius, caster)
                .sort(
                    (a, b) =>
                        (b.id === action.targetId) - (a.id === action.targetId) ||
                        Math.hypot(a.x - TARGET.x, a.y - TARGET.y) - Math.hypot(b.x - TARGET.x, b.y - TARGET.y) ||
                        a.id - b.id,
                ),
            HIT = NEAR[0];
        if (HIT) {
            world.hitBossPatternUnit(
                HIT,
                this.id,
                { x: HIT.x, y: HIT.y, z: 0 },
                { x: Math.cos(action.aim), y: Math.sin(action.aim) },
                caster,
            );
        }
        this.impact(world, caster, TARGET.x, TARGET.y, this.config.hitRadius);
        world.enterBossPatternRecovery(action);
    }
}

// The ranged minion's pattern: a shell lobbed onto the target's spot, hitting everyone in the circle there.
export class MinionMortarPattern extends MinionPattern {
    constructor(dependencies) {
        super(MINION_FEATURES.mortar, dependencies);
    }
    writeShape(boss, action, _scene, pad, area) {
        area.kind = 'disk';
        area.fromX = boss.x;
        area.fromY = boss.y;
        area.x = action.target?.x ?? boss.x;
        area.y = action.target?.y ?? boss.y;
        area.reach = this.radiusFor(boss) + pad;
    }
    activate(world, action, caster) {
        const X = action.target?.x ?? caster.x,
            Y = action.target?.y ?? caster.y,
            RADIUS = this.radiusFor(caster);
        this.hitDisk(world, caster, X, Y, RADIUS);
        this.impact(world, caster, X, Y, RADIUS);
    }
}

// The bomber's fuse: a circle past its own body edge. When the fuse ends it explodes there and dies; killed
// before that, it never goes off.
export class MinionBlastPattern extends MinionPattern {
    constructor(dependencies) {
        super(MINION_FEATURES.blast, dependencies);
    }
    reachFor(caster) {
        return caster.radius + super.reachFor(caster);
    }
    radiusFor(caster) {
        return caster.radius + super.radiusFor(caster);
    }
    writeShape(boss, _action, _scene, pad, area) {
        area.kind = 'disk';
        area.reach = this.radiusFor(boss) + pad;
    }
    activate(world, _action, caster) {
        const RADIUS = this.radiusFor(caster);
        this.hitDisk(world, caster, caster.x, caster.y, RADIUS);
        world._settleBossHits(caster);
        this.impact(world, caster, caster.x, caster.y, RADIUS);
        world.endBattleSummon(caster);
    }
}
