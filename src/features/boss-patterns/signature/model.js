import { BossPattern } from '../model-base.js';
import { SIGNATURE_FEATURES } from './definition.js';
import { towerElement } from '../../../tower/tower-theme.js';

// Shared by the five skills: only the boss of the matching element band uses it, on a unit it can reach.
class SignaturePattern extends BossPattern {
    constructor(feature, dependencies) {
        super(feature, dependencies);
        this.physicalActive = true;
    }
    eligible(world, targets, aliveAdds, boss) {
        return (
            towerElement(world.tower.floor) === this.config.element && super.eligible(world, targets, aliveAdds, boss)
        );
    }
    // An element skill is always worth using: its damage is not compared with the basic attack's.
    expectedHits() {
        return null;
    }
    // The skills that strike at once do it here and then only wait out their active time.
    updateActive(world, action, _dt, _boss) {
        if (action.phaseElapsed >= this.config.active - 1e-9) {
            world.enterBossPatternRecovery(action);
        }
    }
    effect(world, detail) {
        world.combat('boss-signature', { element: this.config.element, ...detail });
    }
}

// A narrow, long jet straight at the target; everyone in it is pushed along it.
export class WaterJetPattern extends SignaturePattern {
    constructor(dependencies) {
        super(SIGNATURE_FEATURES.water, dependencies);
    }
    writeArea(boss, _action, _scene, pad, area) {
        area.kind = 'line';
        area.reach = this.reachFor(boss);
        area.width = this.config.halfWidth + pad;
    }
    activate(world, action, boss) {
        const REACH = this.reachFor(boss),
            COS = Math.cos(action.aim),
            SIN = Math.sin(action.aim);
        for (const UNIT of world.bossGroundUnitsNear(boss.x, boss.y, REACH, boss)) {
            const DX = UNIT.x - boss.x,
                DY = UNIT.y - boss.y,
                ALONG = DX * COS + DY * SIN,
                ACROSS = Math.abs(-DX * SIN + DY * COS);
            if (ALONG > -UNIT.radius && ALONG <= REACH + UNIT.radius && ACROSS <= this.config.halfWidth + UNIT.radius) {
                world.hitBossPatternUnit(UNIT, this.id, { x: UNIT.x, y: UNIT.y, z: 0 }, { x: COS, y: SIN }, boss);
            }
        }
        this.effect(world, {
            x: boss.x,
            y: boss.y,
            radius: boss.radius,
            angle: action.aim,
            reach: REACH,
            width: this.config.halfWidth,
        });
    }
}

// Roots break through the ground where the target stands and throw up everyone in the circle.
export class RootEruptionPattern extends SignaturePattern {
    constructor(dependencies) {
        super(SIGNATURE_FEATURES.grass, dependencies);
    }
    radiusFor(boss) {
        return this.attackExtentFor(boss, this.config.radius);
    }
    writeArea(boss, action, _scene, pad, area) {
        area.kind = 'disk';
        area.x = action.target?.x ?? boss.x;
        area.y = action.target?.y ?? boss.y;
        area.reach = this.radiusFor(boss) + pad;
    }
    activate(world, action, boss) {
        const X = action.target?.x ?? boss.x,
            Y = action.target?.y ?? boss.y,
            RADIUS = this.radiusFor(boss);
        for (const UNIT of world.bossGroundUnitsNear(X, Y, RADIUS, boss)) {
            const DX = UNIT.x - X,
                DY = UNIT.y - Y,
                N = Math.hypot(DX, DY) || 1;
            world.hitBossPatternUnit(UNIT, this.id, { x: UNIT.x, y: UNIT.y, z: 0 }, { x: DX / N, y: DY / N }, boss);
        }
        this.effect(world, { x: X, y: Y, reach: RADIUS });
    }
}

// A breath that burns the whole sector several times in a row.
export class FireBreathPattern extends SignaturePattern {
    constructor(dependencies) {
        super(SIGNATURE_FEATURES.fire, dependencies);
    }
    writeArea(boss, _action, _scene, pad, area) {
        area.kind = 'sector';
        area.reach = this.reachFor(boss) + pad;
        area.sector = this.config.sector;
    }
    activate(_world, action) {
        action.ticks = 0;
    }
    updateActive(world, action, dt, boss) {
        const INTERVAL = this.config.active / this.config.ticks,
            DUE = Math.min(this.config.ticks, Math.floor(action.phaseElapsed / INTERVAL + 1e-9) + 1);
        while (action.ticks < DUE) {
            action.ticks++;
            action.hitIds.clear();
            world.resolveBossWedge(
                action,
                this.id,
                this.reachFor(boss),
                action.aim - this.config.sector / 2,
                action.aim + this.config.sector / 2,
                undefined,
                boss,
            );
            this.effect(world, {
                x: boss.x,
                y: boss.y,
                radius: boss.radius,
                angle: action.aim,
                reach: this.reachFor(boss),
                sector: this.config.sector,
                tick: action.ticks,
            });
        }
        super.updateActive(world, action, dt, boss);
    }
}

// A pulse around the boss: everyone in the disc is hurt and frozen (the unit's stun) for a moment.
export class FrostPulsePattern extends SignaturePattern {
    constructor(dependencies) {
        super(SIGNATURE_FEATURES.ice, dependencies);
    }
    writeArea(boss, _action, _scene, pad, area) {
        area.kind = 'sweep';
        area.reach = this.reachFor(boss) + pad;
        area.angle = 0;
    }
    activate(world, _action, boss) {
        for (const UNIT of world.bossGroundUnitsNear(boss.x, boss.y, this.reachFor(boss), boss)) {
            const DX = UNIT.x - boss.x,
                DY = UNIT.y - boss.y,
                N = Math.hypot(DX, DY) || 1;
            if (
                world.hitBossPatternUnit(UNIT, this.id, { x: UNIT.x, y: UNIT.y, z: 0 }, { x: DX / N, y: DY / N }, boss)
            ) {
                UNIT.stun = Math.max(UNIT.stun, this.config.freeze);
            }
        }
        this.effect(world, { x: boss.x, y: boss.y, reach: this.reachFor(boss) });
    }
}

// Lightning jumps from the first ally hit to the nearest one not hit yet (anyone near, if all were hit), each jump a
// tenth weaker than the one before, until it has jumped `hops` times or nobody is in reach.
export class ChainLightningPattern extends SignaturePattern {
    constructor(dependencies) {
        super(SIGNATURE_FEATURES.lightning, dependencies);
        this.physicalActive = true;
    }
    writeArea(boss, action, _scene, pad, area) {
        area.kind = 'disk';
        area.x = action.target?.x ?? boss.x;
        area.y = action.target?.y ?? boss.y;
        area.reach = 1.2 + pad;
    }
    activate(_world, action, boss) {
        action.chain = { hop: 0, last: { x: boss.x, y: boss.y }, lastUnit: null, hit: new Set(), over: false };
    }
    nextTarget(world, chain, action, boss) {
        if (!chain.lastUnit) {
            return (
                world
                    .bossGroundUnitsNear(boss.x, boss.y, this.reachFor(boss), boss)
                    .find((unit) => unit.id === action.targetId) ??
                world.bossGroundUnitsNear(boss.x, boss.y, this.reachFor(boss), boss)[0] ??
                null
            );
        }
        const NEAR = world
                .bossGroundUnitsNear(chain.last.x, chain.last.y, this.config.hopRadius, boss)
                .sort(
                    (a, b) =>
                        Math.hypot(a.x - chain.last.x, a.y - chain.last.y) -
                            Math.hypot(b.x - chain.last.x, b.y - chain.last.y) || a.id - b.id,
                ),
            OTHERS = NEAR.filter((unit) => unit !== chain.lastUnit),
            FRESH = OTHERS.filter((unit) => !chain.hit.has(unit.id));
        return FRESH[0] ?? OTHERS[0] ?? NEAR[0] ?? null;
    }
    updateActive(world, action, _dt, boss) {
        const CHAIN = action.chain;
        while (
            !CHAIN.over &&
            CHAIN.hop < this.config.hops &&
            action.phaseElapsed + 1e-9 >= CHAIN.hop * this.config.hopSeconds
        ) {
            const UNIT = this.nextTarget(world, CHAIN, action, boss);
            const DX = UNIT ? UNIT.x - CHAIN.last.x : 0,
                DY = UNIT ? UNIT.y - CHAIN.last.y : 0,
                N = Math.hypot(DX, DY) || 1;
            if (
                !UNIT ||
                !world.hitBossPatternUnit(
                    UNIT,
                    this.id,
                    { x: UNIT.x, y: UNIT.y, z: 0 },
                    { x: DX / N, y: DY / N },
                    boss,
                    { scale: this.config.falloff ** CHAIN.hop, repeat: true },
                )
            ) {
                CHAIN.over = true;
                break;
            }
            // Each jump is settled alone so it is not shared out with the jumps of the same moment.
            world._settleBossHits(boss);
            this.effect(world, { x: CHAIN.last.x, y: CHAIN.last.y, toX: UNIT.x, toY: UNIT.y, hop: CHAIN.hop });
            CHAIN.hit.add(UNIT.id);
            CHAIN.last = { x: UNIT.x, y: UNIT.y };
            CHAIN.lastUnit = UNIT;
            CHAIN.hop++;
        }
        if (CHAIN.over || CHAIN.hop >= this.config.hops) {
            world.enterBossPatternRecovery(action);
        }
    }
}
