import { CelebrationEffect } from '../presentation-base.js';
import { clamp } from '../../../farm-model.js';

export function drawMergeBlackHoles(renderer, world) {
    for (const TASK of world.mergeTasks) {
        if (!Number.isFinite(TASK.centerX) || !Number.isFinite(TASK.centerY) || !Number.isFinite(TASK.centerZ)) {
            continue;
        }
        const PROGRESS = TASK.phase === 'approach' ? clamp(TASK.elapsed / TASK.duration, 0, 1) : 1,
            PULSE = 0.5 + 0.5 * Math.sin(renderer.displayTimeMs * 0.006 + TASK.materialIds[0] * 0.17),
            X = TASK.centerX,
            Y = TASK.centerY,
            Z = TASK.centerZ,
            CENTER = renderer.project(X, Y, Z),
            RADIUS = renderer.scale * (0.2 + PULSE * 0.035 + PROGRESS * 0.055);
        renderer.strokeGroundEllipse(X, Y, 0.52 + PULSE * 0.08, 0.4 + PULSE * 0.06, '#7650a888', 0.04);
        renderer.ellipse(CENTER.x, CENTER.y, RADIUS * 3.1, RADIUS * 1.8, '#9274d944');
        renderer.ellipse(CENTER.x, CENTER.y, RADIUS * 2.25, RADIUS * 1.35, '#7b58bd88');
        renderer.ellipse(CENTER.x, CENTER.y, RADIUS * 1.55, RADIUS * 0.95, '#21182e');
        for (let index = 0; index < 4; index++) {
            const ANGLE = renderer.displayTimeMs * 0.004 * (index % 2 ? -1 : 1) + (index * Math.PI * 2) / 4,
                POINT = renderer.project(X + Math.cos(ANGLE) * 0.43, Y + Math.sin(ANGLE) * 0.32, Z + 0.07),
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
            Z = (E.z || 0) + ((E.targetZ ?? E.z ?? 0) - (E.z || 0)) * T + Math.sin(Math.PI * T) * 0.55;
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
