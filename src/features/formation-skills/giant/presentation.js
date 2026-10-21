import { FormationPresentation } from '../presentation-base.js';
export class GiantPresentation extends FormationPresentation {
    draw(renderer, effect) {
        const PULSE = 0.85 + Math.sin(effect.age * 5) * 0.15,
            RADIUS = Math.max(0.3, effect.radius || 0.3);
        renderer.ring(effect.x, effect.y, RADIUS * 1.15 * PULSE, '#b3d875cc', 0.14);
        renderer.ring(effect.x, effect.y, RADIUS * 1.42 * PULSE, '#e6f3b366', 0.08);
        for (let i = 0; i < 5; i++) {
            const A = (i * Math.PI * 2) / 5 + effect.age,
                P = renderer.project(
                    effect.x + Math.cos(A) * RADIUS * 1.25,
                    effect.y + Math.sin(A) * RADIUS * 1.25,
                    ((effect.age * 1.3 + i * 0.4) % 2) * Math.max(1, RADIUS),
                );
            renderer.ellipse(P.x, P.y, renderer.scale * 0.06, renderer.scale * 0.11, '#e2f7a9aa');
        }
    }
}
