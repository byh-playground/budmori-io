export class WalnutRawGuardPresentation {
    label(_definition, value) {
        return `5초마다 2초 방어 · 방어력 +50 · 저장 RAW의 ${Math.round(value * 100)}% 추가 반격`;
    }
    title(value) {
        return `추가 피해 ${Math.round(value * 100)}%`;
    }
    drawGuard(renderer, effect, progress) {
        const T = Math.min(1, progress / 0.3),
            ALPHA = 1 - progress,
            RADIUS = 0.42 + T * 0.18;
        if (ALPHA <= 0) {
            return;
        }
        renderer.ring(effect.x, effect.y, RADIUS, `rgba(180,194,150,${ALPHA * 0.9})`, 0.08);
        renderer.groundEllipse(effect.x, effect.y, RADIUS * 0.72, RADIUS * 0.72, `rgba(199,213,162,${ALPHA * 0.18})`);
    }
}
