import { CircleSweepPresentation } from '../sweep-360/presentation.js';
import { BossAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';
import { clamp } from '../../../model/farm-model.js';

// The two-hand sweep's hands, kept going round `turns` whole times, the body rocking as it spins.
export class SpinThrowPresentation extends CircleSweepPresentation {
    constructor() {
        super(FEATURE);
    }
    get finalTurn() {
        return 2 * this.config.turns;
    }
    active(_boss, pose) {
        const Q = pose.recoverImpact ? 1 : clamp(pose.elapsed / Math.max(this.config.active, 0.001), 0, 1);
        pose.body.rotation = 0.08 * Math.sin(Math.PI * 2 * this.config.turns * Q);
        this.place(pose, this.finalTurn * Q, 1);
    }
    // The whole disc is the danger; one bright arc runs round with the hands.
    drawTelegraph(renderer, area) {
        const FADE = area.phase === 'recover' ? Math.max(0, 1 - area.elapsed / 0.14) : 1;
        if (!FADE) {
            return;
        }
        BossAttackPresentation.prototype.drawTelegraph.call(this, renderer, area);
        if (!area.active) {
            return;
        }
        const CTX = renderer.ctx,
            ALPHA = CTX.globalAlpha,
            AT = Math.PI * 2 * this.config.turns * clamp(area.progress, 0, 1);
        CTX.globalAlpha = ALPHA * FADE;
        for (const START of [AT, AT + Math.PI]) {
            renderer.ring(area.x, area.y, area.reach, '#dfad65', 0.14, START, START + Math.PI / 3);
        }
        CTX.globalAlpha = ALPHA;
    }
}
