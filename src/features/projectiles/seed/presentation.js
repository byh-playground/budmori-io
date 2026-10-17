import { FEATURE } from './definition.js';

export class SeedProjectilePresentation {
    constructor() {
        this.id = FEATURE.id;
    }
    draw(renderer, _projectile, point, tail) {
        const P = point,
            TAIL = tail;

        renderer.line(renderer.project(TAIL.x, TAIL.y, TAIL.z), P, 0.07, '#ba964a80');
        renderer.ellipse(P.x, P.y, renderer.scale * 0.14, renderer.scale * 0.2, '#cfa957', 0.3);
        renderer.ellipse(
            P.x - renderer.scale * 0.03,
            P.y - renderer.scale * 0.05,
            renderer.scale * 0.05,
            renderer.scale * 0.08,
            '#fff0ae',
        );
    }
}
