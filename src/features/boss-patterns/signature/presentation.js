import { BossAttackPresentation } from '../presentation-base.js';
import { SIGNATURE_FEATURES } from './definition.js';
import { SIGNATURE_EFFECTS, drawSignatureEffect, drawSignatureWindup } from './effects.js';

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
        drawSignatureWindup(renderer, this.config.element, area);
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

// The moment a signature skill lands (and each burn tick or jump): the element's own drawing, see effects.js.
export class SignatureEffectPresentation {
    lifeMsFor(event) {
        return SIGNATURE_EFFECTS[event.element].lifeMs;
    }
    draw(renderer, event, progress) {
        drawSignatureEffect(renderer, event, progress, this.lifeMsFor(event));
    }
}
