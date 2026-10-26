import { BossAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';
import { SWEEP_HAND_STARTS } from './model.js';
import { clamp } from '../../../model/farm-model.js';
import { WORLD_DEPTH_PROJECTION } from '../../../vector-sockets.js';

const HALF_TURN = Math.PI;
const EASE = (t) => t * t * (3 - 2 * t);
// Seconds the hands take to come back to the body once the sweep is over.
const HAND_FOLD_SECONDS = 0.4;

export class CircleSweepPresentation extends BossAttackPresentation {
    constructor() {
        super(FEATURE, 'sweep', 0.14, 0.14);
    }
    // Where a hand is after the given share of its half turn: on the ellipse the reach circle makes on screen.
    orbit(pose, key, turn) {
        const ANGLE = SWEEP_HAND_STARTS[key] + HALF_TURN * turn,
            R = this.config.reach - pose.rig.radius,
            DEPTH = WORLD_DEPTH_PROJECTION;
        return {
            x: R * Math.cos(ANGLE),
            y: -DEPTH * R * Math.sin(ANGLE),
        };
    }
    // The hands go from where they rest to (amount 1) the given point of their turn, and back.
    place(pose, turn, amount) {
        for (const KEY of Object.keys(SWEEP_HAND_STARTS)) {
            const AT = this.orbit(pose, KEY, turn),
                REST = pose.rig.rest[KEY];
            pose.handAt(KEY, REST.x + (AT.x - REST.x) * amount, REST.y + (AT.y - REST.y) * amount);
        }
    }
    windup(boss, pose) {
        super.windup(boss, pose);
        this.place(pose, 0, pose.windEase);
    }
    // Both hands swing together, each across its own half of the circle.
    active(_boss, pose) {
        const Q = pose.recoverImpact ? 1 : clamp(pose.elapsed / Math.max(this.config.active, 0.001), 0, 1);
        pose.body.rotation = 0.06 * Math.sin(HALF_TURN * Q);
        this.place(pose, Q, 1);
    }
    recover(boss, pose) {
        if (pose.recoverImpact) {
            this.active(boss, pose);
            return;
        }
        super.recover(boss, pose);
        this.place(pose, 1, 1 - EASE(clamp(pose.elapsed / HAND_FOLD_SECONDS, 0, 1)));
    }
    // The whole disc is the danger; the two bright arcs are the halves the hands have swept so far.
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
}
