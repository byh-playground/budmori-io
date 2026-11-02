import { ABILITIES } from '../../../i18n/messages/abilities.js';
export class WalnutRawGuardPresentation {
    label(_definition, value) {
        return ABILITIES.walnutRawGuardLabel({ value });
    }
    title(value) {
        return ABILITIES.walnutRawGuardTitle({ value });
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
