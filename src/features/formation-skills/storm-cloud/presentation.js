import { FormationPresentation, cloud, stroke } from '../presentation-base.js';
export class StormCloudPresentation extends FormationPresentation {
    draw(renderer, effect) {
        const ENTER = Math.min(1, effect.age / 0.5),
            EXIT = Math.max(0, effect.age - 0.5 - effect.duration) / 0.5,
            Z = effect.z + Math.sin(effect.age * 3) * 0.1,
            SPREAD = (1 - ENTER + EXIT) * 1.2;
        for (let i = 0; i < 3; i++) {
            const A = (i * Math.PI * 2) / 3;
            cloud(
                renderer,
                effect.x + Math.cos(A) * SPREAD,
                effect.y + Math.sin(A) * SPREAD,
                Z,
                0.7,
                Math.max(0, 1 - EXIT) * Math.min(1, effect.age * 8),
            );
        }
        if (ENTER < 1 && effect.age > 0.15) {
            stroke(
                renderer,
                [
                    [effect.x - 0.3, effect.y, Z],
                    [effect.x + 0.1, effect.y, Z + 0.1],
                    [effect.x - 0.05, effect.y, Z - 0.1],
                    [effect.x + 0.3, effect.y, Z],
                ],
                '#b7e8f0aa',
                0.035,
            );
        }
        const AGE = effect.age - effect.lastPulse;
        if (AGE >= 0 && AGE < 0.25 && effect.age > 0.5 && EXIT === 0) {
            const POINTS = [];
            for (let i = 0; i <= 12; i++) {
                const T = i / 12,
                    ARC = Math.sin(T * Math.PI) * 0.8;
                POINTS.push([
                    effect.x + (effect.targetX - effect.x) * T + ARC,
                    effect.y + (effect.targetY - effect.y) * T,
                    Z + (effect.targetZ - Z) * T + Math.sin(i * 9.2 + effect.id) * 0.13,
                ]);
            }
            stroke(renderer, POINTS, '#72b1f344', 0.2);
            stroke(renderer, POINTS, '#d8f5ff', 0.045);
        }
    }
}
