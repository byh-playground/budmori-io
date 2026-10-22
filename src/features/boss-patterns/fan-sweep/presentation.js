import { BossAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';
import { clamp } from '../../../farm-model.js';

export class FanSweepPresentation extends BossAttackPresentation {
    constructor() {
        super(FEATURE, 'sweep', 0.12);
    }
    active(_boss, pose) {
        const Q = clamp(pose.elapsed / this.config.active, 0, 1),
            ARC = pose.aim - this.config.sector / 2 + this.config.sector * Q,
            PROJECTED = Math.atan2(-0.62 * Math.sin(ARC), Math.cos(ARC));
        pose.body.rotation = 0.1 * Math.sin(PROJECTED - pose.aim);
        pose.body.scaleX = 1.035;
        pose.body.scaleY = 0.97;
        this.hands(pose, PROJECTED);
        if (pose.parts.has('leaf')) {
            pose.extras.leaf = { rotation: 0.12 * Math.sin(Q * Math.PI) };
        }
    }
    recover(boss, pose) {
        if (pose.elapsed >= 0.12) {
            super.recover(boss, pose);
            return;
        }
        const ARC = pose.aim + this.config.sector / 2,
            PROJECTED = Math.atan2(-0.62 * Math.sin(ARC), Math.cos(ARC));
        pose.body.rotation = 0.08 * Math.sin(PROJECTED - pose.aim);
        pose.body.scaleX = 1.05;
        this.hands(pose, PROJECTED);
    }
    // The lead hand follows the sweep, out along the angle it has reached; the other hangs at its side.
    hands(pose, angle) {
        pose.hand(pose.lead, Math.cos(angle) * 1.15 * pose.radius, Math.sin(angle) * 1.15 * pose.radius);
        pose.hand(pose.trail, pose.side(pose.trail) * 0.45 * pose.radius, -0.15 * pose.radius);
    }
}
