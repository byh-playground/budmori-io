import { BossAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';
import { clamp } from '../../../farm-model.js';

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
}
