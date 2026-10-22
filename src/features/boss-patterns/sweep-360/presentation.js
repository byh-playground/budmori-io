import { BossAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';
import { clamp } from '../../../farm-model.js';

const HALF_TURN = Math.PI;
// How far from the body an arm's drawn stroke runs, as a share of the reach.
const ARM_INNER = 0.45;

export class CircleSweepPresentation extends BossAttackPresentation {
    constructor() {
        super(FEATURE, 'sweep', 0.14, 0.14);
    }
    windup(boss, pose) {
        super.windup(boss, pose);
        pose.arm('arm-left', -0.72);
        pose.arm('arm-right', 0.72);
    }
    // Both arms swing together: each goes out further the nearer it is to the middle of its half turn.
    active(_boss, pose) {
        const Q = pose.recoverImpact ? 1 : clamp(pose.elapsed / Math.max(this.config.active, 0.001), 0, 1),
            SWAY = Math.sin(HALF_TURN * Q) * 0.48;
        pose.body.rotation = 0.06 * Math.sin(HALF_TURN * Q);
        pose.arm('arm-left', -0.72 - SWAY);
        pose.arm('arm-right', 0.72 + SWAY);
    }
    recover(boss, pose) {
        if (pose.recoverImpact) {
            this.active(boss, pose);
            return;
        }
        super.recover(boss, pose);
    }
    // The whole disc is the danger; the two bright arcs are the halves the arms have swept so far.
    drawTelegraph(renderer, area) {
        const FADE = area.phase === 'recover' ? Math.max(0, 1 - area.elapsed / 0.14) : 1;
        if (!FADE) {
            return;
        }
        super.drawTelegraph(renderer, area);
        const CTX = renderer.ctx,
            ALPHA = CTX.globalAlpha,
            SWEPT = HALF_TURN * clamp(area.progress, 0, 1);
        CTX.globalAlpha = ALPHA * FADE;
        for (const START of [area.angle, area.angle + HALF_TURN]) {
            renderer.ring(area.x, area.y, area.reach, '#dfad65', 0.14, START, START + SWEPT);
        }
        CTX.globalAlpha = ALPHA;
    }
    // Two arm strokes from near the body out to the reach, one per arm.
    drawWeapon(renderer, boss, _player, _matrix, _pose) {
        if (boss.patternPhase !== 'active') {
            return;
        }
        const Q = clamp((boss.patternPhaseElapsed || 0) / Math.max(this.config.active, 0.001), 0, 1),
            START = (boss.patternAim ?? boss.angle) - Math.PI / 2;
        renderer.ctx.flush();
        for (const ARM_START of [START, START + HALF_TURN]) {
            const ANGLE = ARM_START + HALF_TURN * Q,
                COS = Math.cos(ANGLE),
                SIN = Math.sin(ANGLE),
                FROM = renderer.project(
                    boss.x + COS * this.config.reach * ARM_INNER,
                    boss.y + SIN * this.config.reach * ARM_INNER,
                    (boss.z || 0) + 0.2,
                ),
                TO = renderer.project(
                    boss.x + COS * this.config.reach,
                    boss.y + SIN * this.config.reach,
                    (boss.z || 0) + 0.2,
                );
            renderer.line(FROM, TO, 0.2, '#68463299');
            renderer.line(FROM, TO, 0.085, '#f0c77c');
        }
    }
}
