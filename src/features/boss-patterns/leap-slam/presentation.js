import { BossAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';
import { clamp } from '../../../farm-model.js';

export class LeapSlamPresentation extends BossAttackPresentation {
    constructor() {
        super(FEATURE, 'strike', 0.18, 0.18);
    }
    // Both hands go up and out to the sides, as high as the given share of the body radius.
    handsUp(pose, height) {
        for (const KEY of ['arm-left', 'arm-right']) {
            pose.hand(KEY, pose.side(KEY) * 0.55 * pose.radius, -height * pose.radius);
        }
    }
    activeMotion(boss) {
        return boss.z > 0.1 ? 'airborne' : 'strike';
    }
    windup(boss, pose) {
        super.windup(boss, pose);
        pose.body.y = 5 * pose.windEase;
        pose.body.scaleX = 1 - 0.05 * pose.windEase;
        pose.body.scaleY = 1 + 0.09 * pose.windEase;
        this.handsUp(pose, 0.9 * pose.windEase);
    }
    active(boss, pose) {
        const LIFT = clamp((boss.z || 0) / Math.max(1, boss.height || 1), 0, 1);
        pose.body.rotation = pose.aim * 0.06;
        pose.body.scaleX = 1 + 0.045 * LIFT;
        pose.body.scaleY = 1 - 0.035 * LIFT;
        this.handsUp(pose, 0.7);
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
        for (const KEY of ['arm-left', 'arm-right']) {
            pose.hand(KEY, pose.side(KEY) * 0.7 * pose.radius, 0.25 * pose.radius);
        }
        pose.extras['foot-left'] = { x: -5, y: 2, rotation: -0.14 };
        pose.extras['foot-right'] = { x: 5, y: 2, rotation: 0.14 };
    }
}
