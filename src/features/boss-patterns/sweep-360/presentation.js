import { BossAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';
import { clamp } from '../../../farm-model.js';

const TAU = Math.PI * 2;

export class CircleSweepPresentation extends BossAttackPresentation {
    constructor() {
        super(FEATURE, 'sweep', 0.14, 0.14);
    }
    windup(boss, pose) {
        super.windup(boss, pose);
        pose.arm('arm-left', -0.72);
        pose.arm('arm-right', 0.72);
    }
    active(_boss, pose) {
        const Q = pose.recoverImpact ? 1 : clamp(pose.elapsed / Math.max(this.config.active, 0.001), 0, 1),
            SWEEP = TAU * Q,
            ARM_SWAY = Math.sin(SWEEP) * 0.48;
        pose.body.rotation = 0.06 * Math.sin(SWEEP);
        pose.arm('arm-left', -0.72 - ARM_SWAY);
        pose.arm('arm-right', 0.72 + ARM_SWAY);
    }
    recover(boss, pose) {
        if (pose.recoverImpact) {
            this.active(boss, pose);
            return;
        }
        super.recover(boss, pose);
    }
    drawTelegraph(renderer, area) {
        const CTX = renderer.ctx,
            ALPHA = CTX.globalAlpha,
            FADE = area.phase === 'recover' ? Math.max(0, 1 - area.elapsed / 0.14) : 1,
            START = area.angle,
            END = START + Math.PI * 2 * clamp(area.progress, 0, 1);
        if (!FADE) {
            return;
        }
        CTX.globalAlpha = ALPHA * FADE;
        renderer.ring(area.x, area.y, area.reach + area.width, '#b46c45', area.active ? 0.05 : 0.09);
        renderer.ring(area.x, area.y, area.reach - area.width, '#c59b7288', 0.045);
        renderer.ring(area.x, area.y, area.reach + area.width + 0.12, '#dfad65', 0.14, START, END);
        CTX.globalAlpha = ALPHA;
    }
    drawWeapon(renderer, boss, _player, _matrix, _pose) {
        if (boss.patternPhase !== 'active') {
            return;
        }
        const Q = clamp((boss.patternPhaseElapsed || 0) / Math.max(this.config.active, 0.001), 0, 1),
            ANGLE = (boss.patternAim ?? boss.angle) - Math.PI / 2 + TAU * Q,
            TANGENT_X = -Math.sin(ANGLE) * this.config.width * 0.7,
            TANGENT_Y = Math.cos(ANGLE) * this.config.width * 0.7,
            RADIUS_X = Math.cos(ANGLE) * this.config.reach,
            RADIUS_Y = Math.sin(ANGLE) * this.config.reach,
            FROM = renderer.project(boss.x + RADIUS_X - TANGENT_X, boss.y + RADIUS_Y - TANGENT_Y, (boss.z || 0) + 0.2),
            TO = renderer.project(boss.x + RADIUS_X + TANGENT_X, boss.y + RADIUS_Y + TANGENT_Y, (boss.z || 0) + 0.2);
        renderer.ctx.flush();
        renderer.line(FROM, TO, 0.2, '#68463299');
        renderer.line(FROM, TO, 0.085, '#f0c77c');
    }
}
