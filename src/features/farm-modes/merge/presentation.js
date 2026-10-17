import { CelebrationEffect } from '../presentation-base.js';
import { clamp } from '../../../farm-model.js';

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
