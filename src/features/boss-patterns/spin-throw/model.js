import { BossPattern } from '../model-base.js';
import { FEATURE } from './definition.js';

const TAU = Math.PI * 2;

// The boss spins on the spot and keeps flinging troops off all round it (see the config in boss-patterns.js).
export class SpinThrowBossPattern extends BossPattern {
    constructor(dependencies) {
        super(FEATURE, dependencies);
        this.physicalActive = true;
        this.slices = Array.from({ length: this.config.throwCount }, () => []);
    }
    writeArea(boss, _action, _scene, pad, area) {
        area.kind = 'sweep';
        area.reach = this.reachFor(boss) + pad;
        area.angle = 0;
    }
    eligible(world, targets, aliveAdds, boss) {
        return (
            boss.patternRuntime.encounterElapsed + 1e-9 >= this.config.firstEligible &&
            super.eligible(world, targets, aliveAdds, boss)
        );
    }
    expectedHits(world, _targets, boss) {
        return world.bossGroundUnitsNear(boss.x, boss.y, this.reachFor(boss), boss).length;
    }
    updateActive(world, action, _dt, boss) {
        const THROWS = Math.round(this.config.active / this.config.throwInterval),
            DUE = Math.min(THROWS, Math.floor(action.phaseElapsed / this.config.throwInterval + 1e-9) + 1);
        while (action.released < DUE) {
            action.released++;
            this.fling(world, action, boss);
        }
        if (action.phaseElapsed >= this.config.active - 1e-9) {
            world.enterBossPatternRecovery(action);
        }
    }
    // One throw: a random troop from each slice of the circle, flung outward with a share of the spin's tangent.
    fling(world, action, boss) {
        const SLICES = this.slices,
            COUNT = SLICES.length,
            WIDTH = TAU / COUNT,
            OFFSET = world.random() * WIDTH;
        for (const SLICE of SLICES) {
            SLICE.length = 0;
        }
        for (const UNIT of world.bossGroundUnitsNear(boss.x, boss.y, this.reachFor(boss), boss)) {
            const ANGLE = Math.atan2(UNIT.y - boss.y, UNIT.x - boss.x) - OFFSET,
                SLICE = Math.floor((((ANGLE % TAU) + TAU) % TAU) / WIDTH);
            SLICES[Math.min(COUNT - 1, SLICE)].push(UNIT);
        }
        for (const SLICE of SLICES) {
            if (!SLICE.length) {
                continue;
            }
            const UNIT = SLICE[Math.min(SLICE.length - 1, Math.floor(world.random() * SLICE.length))],
                DX = UNIT.x - boss.x,
                DY = UNIT.y - boss.y,
                N = Math.hypot(DX, DY) || 1,
                OUT_X = DX / N,
                OUT_Y = DY / N,
                X = OUT_X - OUT_Y * this.config.spin,
                Y = OUT_Y + OUT_X * this.config.spin,
                M = Math.hypot(X, Y);
            world.hitBossPatternUnit(UNIT, action.id, { x: UNIT.x, y: UNIT.y, z: 0 }, { x: X / M, y: Y / M }, boss, {
                repeat: true,
            });
        }
    }
    get hitMetric() {
        return 'sweepHits';
    }
}
