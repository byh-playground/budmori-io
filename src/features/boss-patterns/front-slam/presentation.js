import { BossAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';

export class FrontSlamPresentation extends BossAttackPresentation {
    constructor() {
        super(FEATURE, 'strike', 0.18, 0.14);
    }
    recover(boss, pose) {
        if (pose.recoverImpact) {
            this.active(boss, pose);
            return;
        }
        super.recover(boss, pose);
    }
}
