import { COMMON_UNIT_STAT_DEFAULTS } from '../../../unit-stats.js';

export class RiceCriticalPresentation {
    label(_definition, value) {
        return `잃은 체력 비율에 따라 치명타 확률 최대 +${Math.round(value * 100)}%p · 치명타 피해 ×${COMMON_UNIT_STAT_DEFAULTS.critMultiplier}`;
    }
    title(value) {
        return `치명타 최대 +${Math.round(value * 100)}%p`;
    }
    drawCriticalHit(renderer, event, progress) {
        const T = Math.min(1, progress / 0.58),
            ALPHA = 1 - T,
            CENTER = renderer.project(event.x, event.y, (event.z || 0) + 0.22);
        if (ALPHA <= 0) {
            return;
        }
        renderer.ring(event.x, event.y, 0.3 + T * 0.62, `rgba(255,211,92,${ALPHA * 0.95})`, 0.11);
        for (let index = 0; index < 3; index++) {
            const ANGLE = -Math.PI / 2 + (index - 1) * 0.42 + (event.sequence % 7) * 0.08,
                DISTANCE = renderer.scale * (0.19 + T * 0.22),
                FROM = {
                    x: CENTER.x - Math.cos(ANGLE) * DISTANCE,
                    y: CENTER.y - Math.sin(ANGLE) * DISTANCE,
                },
                TO = {
                    x: CENTER.x + Math.cos(ANGLE) * DISTANCE,
                    y: CENTER.y + Math.sin(ANGLE) * DISTANCE,
                };
            renderer.line(FROM, TO, renderer.scale * 0.07, `rgba(255,242,184,${ALPHA})`);
        }
    }
}
