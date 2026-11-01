import { FormationPresentation, bodyScale, glint, segmentedRing } from '../presentation-base.js';
export class GiantPresentation extends FormationPresentation {
    draw(renderer, effect) {
        const RADIUS = Math.max(0.3, effect.radius || 0.3),
            SCALE = bodyScale(RADIUS),
            ENTER = Math.max(0, 1 - effect.age / 0.45),
            FADE = Math.min(1, effect.age * 12, Math.max(0, effect.duration - effect.age) * 3),
            PULSE = 1 + Math.sin(effect.age * 4) * 0.025;
        renderer.groundEllipse(effect.x, effect.y, RADIUS * 1.2, RADIUS * 1.2, `rgba(172,189,57,${FADE * 0.08})`);
        segmentedRing(
            renderer,
            effect.x,
            effect.y,
            0.03,
            RADIUS * 1.18 * PULSE,
            FADE * 0.85,
            effect.age * 0.28,
            '224,230,115',
        );
        renderer.ring(
            effect.x,
            effect.y,
            RADIUS * (1.1 + (1 - ENTER) * 0.55),
            `rgba(255,234,145,${ENTER * 0.7})`,
            0.05 * SCALE,
        );
        for (let i = 0; i < 6; i++) {
            const PHASE = (effect.age * 0.7 + i / 6) % 1,
                A = i * 2.39996 + effect.age * 0.4,
                HEIGHT = RADIUS * (0.15 + PHASE * 2.4),
                ALPHA = Math.sin(PHASE * Math.PI) * FADE;
            glint(
                renderer,
                effect.x + Math.cos(A) * RADIUS * 1.12,
                effect.y + Math.sin(A) * RADIUS * 1.12,
                HEIGHT,
                0.055 * SCALE,
                ALPHA * 0.8,
                i % 2 ? '246,241,169' : '181,221,108',
            );
        }
    }
}
