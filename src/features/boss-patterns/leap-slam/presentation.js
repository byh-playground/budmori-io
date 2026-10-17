import { BossAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';
import { clamp } from '../../../farm-model.js';

export class LeapSlamPresentation extends BossAttackPresentation {
    constructor() {
        super(FEATURE, 'strike', 0.18, 0.18);
    }
    activeMotion(boss) {
        return boss.z > 0.1 ? 'airborne' : 'strike';
    }
    windup(boss, pose) {
        super.windup(boss, pose);
        pose.body.y = 5 * pose.windEase;
        pose.body.scaleX = 1 - 0.05 * pose.windEase;
        pose.body.scaleY = 1 + 0.09 * pose.windEase;
        pose.arm(pose.lead, -0.9);
        pose.arm(pose.trail, -0.45);
    }
    active(boss, pose) {
        const LIFT = clamp((boss.z || 0) / Math.max(1, boss.height || 1), 0, 1);
        pose.body.rotation = pose.aim * 0.06;
        pose.body.scaleX = 1 + 0.045 * LIFT;
        pose.body.scaleY = 1 - 0.035 * LIFT;
        pose.arm('arm-left', -0.28);
        pose.arm('arm-right', 0.28);
        pose.extras['foot-left'] = { y: -4 * LIFT, rotation: -0.08 * LIFT };
        pose.extras['foot-right'] = { y: -4 * LIFT, rotation: 0.08 * LIFT };
        if (pose.parts.has('leaf')) {
            pose.extras.leaf = { rotation: -0.12 * LIFT };
        }
    }
    recover(boss, pose) {
        if (!pose.recoverImpact) {
            super.recover(boss, pose);
            return;
        }
        pose.body.y = 5;
        pose.body.scaleX = 1.12;
        pose.body.scaleY = 0.8;
        pose.body.rotation = pose.aim * 0.08;
        pose.arm('arm-left', -0.65);
        pose.arm('arm-right', 0.65);
        pose.extras['foot-left'] = { x: -5, y: 2, rotation: -0.14 };
        pose.extras['foot-right'] = { x: 5, y: 2, rotation: 0.14 };
    }
}
