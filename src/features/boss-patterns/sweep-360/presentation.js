import { BossAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';
import { clamp } from '../../../farm-model.js';

const SWEEP_WEAPON_SOCKET_BY_BOSS_ASSET = Object.freeze({
    'budmori-chestnut-boss': 'fist-right',
});

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
            SWEEP = 2 * Math.PI * Q;
        pose.body.rotation = 0.12 * Math.sin(SWEEP);
        pose.body.scaleX = 1.055;
        pose.body.scaleY = 0.94;
        pose.arm('arm-left', -0.78 - 0.55 * Math.sin(SWEEP));
        pose.arm('arm-right', 0.78 + 0.55 * Math.sin(SWEEP));
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
    drawWeapon(renderer, boss, player, matrix, pose, record) {
        if (boss.patternPhase !== 'active') {
            return;
        }
        // Only the chestnut boss asset authors the right-fist socket used by
        // this weapon flourish. Other species share the physical sweep pattern,
        // but their SVGs do not claim a compatible swing-origin socket.
        const SOCKET_ID = SWEEP_WEAPON_SOCKET_BY_BOSS_ASSET[record.compiled.metadata.id];
        if (!SOCKET_ID) {
            return;
        }
        const SOCKET = player.getSocket(SOCKET_ID);
        const BASE = {
                x: matrix[0] * SOCKET.x + matrix[4],
                y: matrix[3] * SOCKET.y + matrix[5],
            },
            Q = clamp(pose.elapsed / this.config.active, 0, 1),
            ANGLE = (boss.patternAim ?? boss.angle) - Math.PI / 2 + Math.PI * 2 * Q,
            TIP = renderer.project(
                boss.x + Math.cos(ANGLE) * this.config.reach,
                boss.y + Math.sin(ANGLE) * this.config.reach,
                (boss.z || 0) + 0.2,
            ),
            TAIL = renderer.project(
                boss.x + Math.cos(ANGLE - 0.18) * this.config.reach,
                boss.y + Math.sin(ANGLE - 0.18) * this.config.reach,
                (boss.z || 0) + 0.35,
            );
        renderer.ctx.flush();
        renderer.line(BASE, TIP, 0.26, '#684632');
        renderer.line(BASE, TIP, 0.13, '#f0c77c');
        renderer.ellipse(
            TIP.x,
            TIP.y,
            this.config.width * renderer.scale * 0.48,
            this.config.width * renderer.scale * 0.3,
            '#dfad79',
            Math.atan2(-0.62 * Math.sin(ANGLE), Math.cos(ANGLE)),
        );
        renderer.line(TAIL, TIP, 0.26, '#e6cf7b99');
    }
}
