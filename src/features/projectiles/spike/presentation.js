import { FEATURE } from './definition.js';

export class SpikeProjectilePresentation {
    constructor() {
        this.id = FEATURE.id;
    }
    drawShadow(renderer, projectile) {
        renderer.groundEllipse(projectile.x, projectile.y, 0.14, 0.1, '#55452433');
    }
    draw(renderer, projectile, point, tail) {
        const F = projectile,
            P = point,
            TAIL = tail;

        const ANGLE = Math.atan2(F.path.to.y - F.path.from.y, F.path.to.x - F.path.from.x),
            TIP = {
                x: P.x + Math.cos(ANGLE) * renderer.scale * 0.22,
                y: P.y - 0.62 * Math.sin(ANGLE) * renderer.scale * 0.22,
            };
        renderer.line(renderer.project(TAIL.x, TAIL.y, TAIL.z), P, 0.055, '#778f4c88');
        renderer.line(P, TIP, 0.105, '#79964e');
        renderer.ellipse(TIP.x, TIP.y, renderer.scale * 0.045, renderer.scale * 0.035, '#d5df9d', ANGLE);
    }
}
