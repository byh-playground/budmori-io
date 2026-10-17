import { FormationPresentation } from '../presentation-base.js';
export class GiantPresentation extends FormationPresentation {
    draw(renderer, effect) {
        const PULSE = 0.85 + Math.sin(effect.age * 5) * 0.15;
        renderer.ring(effect.x, effect.y, 0.9 * PULSE, '#b3d875aa', 0.07);
        renderer.ring(effect.x, effect.y, 1.1 * PULSE, '#e6f3b344', 0.04);
        for (let i = 0; i < 5; i++) {
            const A = (i * Math.PI * 2) / 5 + effect.age,
                P = renderer.project(
                    effect.x + Math.cos(A) * 0.7,
                    effect.y + Math.sin(A) * 0.7,
                    (effect.age * 1.3 + i * 0.4) % 2,
                );
            renderer.ellipse(P.x, P.y, renderer.scale * 0.025, renderer.scale * 0.055, '#e2f7a9aa');
        }
    }
}
