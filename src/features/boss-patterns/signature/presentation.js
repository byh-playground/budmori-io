import { BossAttackPresentation } from '../presentation-base.js';
import { SIGNATURE_FEATURES } from './definition.js';

// Bright effect colours by element id (lineage.js): fire, ice, grass, lightning, water.
const FX_COLORS = Object.freeze({
    1: [255, 128, 56],
    2: [170, 226, 255],
    3: [112, 205, 92],
    4: [255, 236, 92],
    5: [72, 142, 255],
});
const RGBA = (element, alpha) => `rgba(${FX_COLORS[element].join(',')},${alpha})`;

// The windup uses the shared boss pose; the danger area keeps the shared red and gets an edge in the element's colour.
export class SignaturePresentation extends BossAttackPresentation {
    constructor(feature) {
        super(feature, 'strike', 0.12, 0.12);
    }
    drawTelegraph(renderer, area) {
        super.drawTelegraph(renderer, area);
        if (area.phase === 'recover') {
            return;
        }
        const COLOR = RGBA(this.config.element, 0.55 + 0.35 * area.progress);
        if (area.kind === 'line') {
            const COS = Math.cos(area.angle),
                SIN = Math.sin(area.angle);
            for (const SIDE of [-1, 1]) {
                const OX = -SIN * area.width * SIDE,
                    OY = COS * area.width * SIDE;
                renderer.line(
                    renderer.project(area.x + OX, area.y + OY, 0),
                    renderer.project(area.x + OX + COS * area.reach, area.y + OY + SIN * area.reach, 0),
                    0.07,
                    COLOR,
                );
            }
        } else if (area.kind === 'sector') {
            renderer.ring(
                area.x,
                area.y,
                area.reach,
                COLOR,
                0.08,
                area.angle - area.sector / 2,
                area.angle + area.sector / 2,
            );
        } else {
            renderer.ring(area.x, area.y, area.reach, COLOR, 0.08);
        }
    }
}
export const SIGNATURE_PRESENTATIONS = Object.freeze(
    Object.values(SIGNATURE_FEATURES).map((feature) => new SignaturePresentation(feature)),
);

// The moment a signature skill lands (and each burn tick or jump): a short drawing in the element's colour.
export class SignatureEffectPresentation {
    lifeMs = 520;
    draw(renderer, event, progress) {
        const ALPHA = Math.max(0, 1 - progress);
        if (ALPHA <= 0) {
            return;
        }
        const SHAPES = {
            line: () => this.jet(renderer, event, progress, ALPHA),
            disk: () => this.roots(renderer, event, progress, ALPHA),
            sector: () => this.breath(renderer, event, progress, ALPHA),
            ring: () => this.pulse(renderer, event, progress, ALPHA),
            chain: () => this.bolt(renderer, event, ALPHA),
        };
        SHAPES[event.shape]?.();
    }
    jet(renderer, event, progress, alpha) {
        const COS = Math.cos(event.angle),
            SIN = Math.sin(event.angle),
            REACH = event.reach * Math.min(1, progress * 4 + 0.25);
        for (const OFFSET of [-0.6, -0.2, 0.2, 0.6]) {
            const OX = -SIN * event.width * OFFSET,
                OY = COS * event.width * OFFSET;
            renderer.line(
                renderer.project(event.x + OX, event.y + OY, 0.5),
                renderer.project(event.x + OX + COS * REACH, event.y + OY + SIN * REACH, 0.2),
                0.16,
                RGBA(event.element, alpha * 0.85),
            );
        }
    }
    roots(renderer, event, progress, alpha) {
        const RISE = Math.sin(Math.min(1, progress * 2.2) * Math.PI * 0.5);
        for (let index = 0; index < 10; index++) {
            const ANGLE = (index / 10) * Math.PI * 2 + 0.3,
                DIST = event.reach * (0.25 + 0.7 * ((index * 0.37) % 1)),
                X = event.x + Math.cos(ANGLE) * DIST,
                Y = event.y + Math.sin(ANGLE) * DIST;
            renderer.line(
                renderer.project(X, Y, 0),
                renderer.project(X, Y, 1.6 * RISE * (0.6 + 0.4 * ((index * 0.61) % 1))),
                0.2,
                RGBA(event.element, alpha * 0.9),
            );
        }
        renderer.ring(event.x, event.y, event.reach * (0.6 + 0.4 * RISE), RGBA(event.element, alpha * 0.7), 0.1);
    }
    breath(renderer, event, progress, alpha) {
        for (let band = 1; band <= 3; band++) {
            renderer.ring(
                event.x,
                event.y,
                (event.reach * band * (0.4 + 0.6 * Math.min(1, progress * 2))) / 3,
                RGBA(event.element, alpha * 0.85),
                0.14,
                event.angle - event.sector / 2,
                event.angle + event.sector / 2,
            );
        }
    }
    pulse(renderer, event, progress, alpha) {
        renderer.ring(event.x, event.y, event.reach * Math.min(1, progress * 2.4), RGBA(event.element, alpha), 0.16);
        renderer.ring(
            event.x,
            event.y,
            event.reach * 0.6 * Math.min(1, progress * 2.4),
            `rgba(255,255,255,${alpha})`,
            0.06,
        );
    }
    bolt(renderer, event, alpha) {
        const DX = event.toX - event.x,
            DY = event.toY - event.y,
            N = Math.hypot(DX, DY) || 1,
            SEGMENTS = 5;
        let previous = renderer.project(event.x, event.y, 0.9);
        for (let step = 1; step <= SEGMENTS; step++) {
            const T = step / SEGMENTS,
                JITTER = step === SEGMENTS ? 0 : Math.sin(event.hop * 3.1 + step * 2.3) * 0.5,
                NEXT = renderer.project(
                    event.x + DX * T - (DY / N) * JITTER,
                    event.y + DY * T + (DX / N) * JITTER,
                    0.9,
                );
            renderer.line(previous, NEXT, 0.2, RGBA(event.element, alpha * 0.8));
            renderer.line(previous, NEXT, 0.07, `rgba(255,255,255,${alpha})`);
            previous = NEXT;
        }
    }
}
