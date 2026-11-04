import { BossAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';
import { slamPoint } from './model.js';
import { WORLD_DEPTH_PROJECTION } from '../../../vector-sockets.js';

// A minion is drawn as a troop sprite, not the boss rig: its slam plays the troop's own attack clips.
export function slamUnitMotion(unit) {
    if (unit.patternId !== FEATURE.id) {
        return null;
    }
    if (unit.patternPhase === 'windup') {
        return 'windup';
    }
    return unit.patternPhase === 'active' || (unit.patternPhaseElapsed || 0) < 0.12 ? 'fire' : 'recover';
}

// The lead hand goes up over the head in the windup and comes down on the spot the slam hits; the body squashes as
// it lands and both settle back in the recovery.
export class SlamPresentation extends BossAttackPresentation {
    constructor() {
        super(FEATURE, 'strike', 0.12, 0.12);
    }
    // The lead hand `amount` of the way from its resting spot to the slam's spot on the ground.
    handDown(boss, pose, amount) {
        const POINT = slamPoint(boss, { x: boss.patternTargetX ?? boss.x, y: boss.patternTargetY ?? boss.y }),
            GIANT = boss.giantScale ?? 1,
            REST = pose.rig.rest[pose.lead],
            X = pose.rig.ground.x + (POINT.x - boss.x) / GIANT,
            Y = pose.rig.ground.y - ((POINT.y - boss.y) * WORLD_DEPTH_PROJECTION) / GIANT;
        pose.hand(pose.lead, (X - REST.x) * amount, (Y - REST.y) * amount);
        pose.hand(pose.trail, pose.side(pose.trail) * 0.25 * pose.radius * amount, 0.05 * pose.radius * amount);
    }
    windup(_boss, pose) {
        const E = pose.windEase,
            R = pose.radius;
        pose.body.y = 3 * E;
        pose.body.scaleX = 1 - 0.04 * E;
        pose.body.scaleY = 1 + 0.08 * E;
        pose.body.rotation = -pose.aim * 0.05 * E;
        pose.hand(pose.lead, Math.cos(pose.aim) * 0.35 * R * E, -1.15 * R * E);
        pose.hand(pose.trail, pose.side(pose.trail) * 0.3 * R * E, -0.2 * R * E);
    }
    active(boss, pose) {
        pose.body.y = 4;
        pose.body.scaleX = 1.09;
        pose.body.scaleY = 0.9;
        pose.body.rotation = pose.aim * 0.1;
        this.handDown(boss, pose, 1);
    }
    recover(boss, pose) {
        if (pose.recoverImpact) {
            this.active(boss, pose);
            return;
        }
        const LEFT = 1 - pose.recoverEase;
        pose.body.y = 4 * LEFT;
        pose.body.scaleX = 1 + 0.09 * LEFT;
        pose.body.scaleY = 1 - 0.1 * LEFT;
        pose.body.rotation = pose.aim * 0.1 * LEFT;
        this.handDown(boss, pose, LEFT);
    }
}
