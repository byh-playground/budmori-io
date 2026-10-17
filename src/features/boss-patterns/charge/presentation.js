import { BossAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';

export class ChargePresentation extends BossAttackPresentation {
    constructor() {
        super(FEATURE, 'walk');
    }
    active(boss, pose) {
        const STRIDE = Math.sin((boss.patternTraveled || 0) * 3.1),
            LIFT = Math.max(0, STRIDE);
        pose.body.y = -1.5 - Math.abs(STRIDE) * 1.2;
        pose.body.scaleX = 1.055;
        pose.body.scaleY = 0.965;
        pose.body.rotation = pose.aim * 0.11;
        pose.arm(pose.lead, -0.72 + pose.strikeAngle * 0.3 + STRIDE * 0.12);
        pose.arm(pose.trail, 0.46 - STRIDE * 0.18);
        pose.extras['foot-left'] = { x: -STRIDE * 4, y: -LIFT * 5, rotation: -STRIDE * 0.12 };
        pose.extras['foot-right'] = { x: STRIDE * 4, y: -Math.max(0, -STRIDE) * 5, rotation: STRIDE * 0.12 };
        if (pose.parts.has('leaf')) {
            pose.extras.leaf = { rotation: STRIDE * 0.14 };
        }
    }
    pose(boss, parts, scratch) {
        const POSE = super.pose(boss, parts, scratch);
        if (this.config && parts.has('body')) {
            const ROTATION = POSE.active ? 0.08 * Math.sin((boss.patternTraveled || 0) * 3.1) : 0;
            for (const PART of ['kernel-mark', 'hilum']) {
                if (parts.has(PART)) {
                    POSE.extras[PART] = { rotation: ROTATION };
                }
            }
        }
        return POSE;
    }
}
