import { CelebrationEffect } from '../presentation-base.js';
import { clamp } from '../../../farm-model.js';

export function drawMergeBlackHoles(renderer, world) {
    for (const TASK of world.mergeTasks) {
        let x = 0,
            y = 0,
            count = 0;
        if (TASK.phase === 'approach') {
            for (const ID of TASK.materialIds) {
                const UNIT = world._unitById.get(ID);
                if (UNIT) {
                    x += UNIT.x;
                    y += UNIT.y;
                    count++;
                }
            }
        } else if (TASK.phase === 'animation') {
            const RESULT = world._unitById.get(TASK.resultId);
            if (RESULT) {
                x = RESULT.x;
                y = RESULT.y;
                count = 1;
            }
        }
        if (!count) {
            continue;
        }
        x /= count;
        y /= count;
        const PULSE = 0.5 + 0.5 * Math.sin(renderer.displayTimeMs * 0.006 + (TASK.resultId || TASK.aId) * 0.17),
            CENTER = renderer.project(x, y, 0.3),
            RADIUS = renderer.scale * (0.13 + PULSE * 0.025);
        renderer.strokeGroundEllipse(x, y, 0.42 + PULSE * 0.08, 0.34 + PULSE * 0.06, '#7650aacc', 0.055);
        renderer.ellipse(CENTER.x, CENTER.y, RADIUS * 2.15, RADIUS * 1.5, '#7b58bd66');
        renderer.ellipse(CENTER.x, CENTER.y, RADIUS, RADIUS * 0.72, '#21182e');
        for (let index = 0; index < 3; index++) {
            const ANGLE = renderer.displayTimeMs * 0.004 * (index % 2 ? -1 : 1) + (index * Math.PI * 2) / 3,
                POINT = renderer.project(x + Math.cos(ANGLE) * 0.36, y + Math.sin(ANGLE) * 0.28, 0.38),
                PARTICLE_RADIUS = renderer.scale * (0.035 + PULSE * 0.012);
            renderer.ellipse(POINT.x, POINT.y, PARTICLE_RADIUS, PARTICLE_RADIUS * 0.72, '#e0c4ff');
        }
    }
}

export class MergeEffect extends CelebrationEffect {
    constructor() {
        super();
        this.color = '#58b9bb';
        this.rotationSpeed = 2;
    }
    radius(progress) {
        return 1.8 * (1 - progress) + 0.15;
    }
    spread(progress) {
        return 1.8 * (1 - progress);
    }
    drawParticle(renderer, point, radius) {
        const C = renderer.ctx;
        C.beginPath();
        C.moveTo(point.x, point.y - radius * 1.5);
        C.lineTo(point.x + radius, point.y);
        C.lineTo(point.x, point.y + radius * 1.5);
        C.lineTo(point.x - radius, point.y);
        C.closePath();
        C.fill();
    }
}

export class MergeMaterialEffect {
    draw(renderer, effect, progress) {
        const E = effect,
            Q = progress;

        const T = clamp(Q, 0, 1),
            X = E.x + (E.targetX - E.x) * T,
            Y = E.y + (E.targetY - E.y) * T,
            Z = (E.z || 0) + Math.sin(Math.PI * T) * 0.55;
        const START = renderer.project(E.x, E.y, E.z || 0),
            POINT = renderer.project(X, Y, Z);
        renderer.line(START, POINT, 0.045, `rgba(88,185,187,${0.2 + 0.65 * (1 - T)})`);
        renderer.ellipse(
            POINT.x,
            POINT.y,
            renderer.scale * 0.12 * (1 - 0.4 * T),
            renderer.scale * 0.09 * (1 - 0.4 * T),
            `rgba(88,185,187,${1 - 0.35 * T})`,
            T * Math.PI,
        );
    }
}
