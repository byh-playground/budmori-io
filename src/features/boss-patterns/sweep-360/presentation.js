import { BossAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';
import { clamp } from '../../../farm-model.js';
import { speciesById } from '../../../species-catalog.js';

const HALF_TURN = Math.PI;
const EASE = (t) => t * t * (3 - 2 * t);
// The drawn arms: thickness and fist radius (world units), and the seconds they take to fold back in. Their colours are
// the boss species' own (species-catalog.js); the highlight is that fill mixed with white.
const ARM_WIDTH = 1,
    ARM_FIST = 0.85,
    ARM_FOLD_SECONDS = 0.4,
    HIGHLIGHT_MIX = 0.3;
function highlight(hex) {
    const CHANNELS = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
    return `rgb(${CHANNELS.map((c) => Math.round(c + (255 - c) * HIGHLIGHT_MIX)).join(',')})`;
}

export class CircleSweepPresentation extends BossAttackPresentation {
    constructor() {
        super(FEATURE, 'sweep', 0.14, 0.14);
    }
    windup(boss, pose) {
        super.windup(boss, pose);
        pose.arm('arm-left', -0.72);
        pose.arm('arm-right', 0.72);
    }
    // Both arms swing together: each goes out further the nearer it is to the middle of its half turn.
    active(_boss, pose) {
        const Q = pose.recoverImpact ? 1 : clamp(pose.elapsed / Math.max(this.config.active, 0.001), 0, 1),
            SWAY = Math.sin(HALF_TURN * Q) * 0.48;
        pose.body.rotation = 0.06 * Math.sin(HALF_TURN * Q);
        pose.arm('arm-left', -0.72 - SWAY);
        pose.arm('arm-right', 0.72 + SWAY);
    }
    recover(boss, pose) {
        if (pose.recoverImpact) {
            this.active(boss, pose);
            return;
        }
        super.recover(boss, pose);
    }
    // The whole disc is the danger; the two bright arcs are the halves the arms have swept so far.
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
    // The arms are drawn by hand: long limbs that swing round the body, so the turn can be seen. The one on the far half
    // of the circle goes behind the body (drawBehind), the one on the near half in front of it (drawWeapon).
    drawBehind(renderer, boss) {
        this.drawArms(renderer, boss, true);
    }
    drawWeapon(renderer, boss) {
        this.drawArms(renderer, boss, false);
    }
    // How far out the arms are (0 folded in, 1 stretched to the reach) and how far round they have turned (0..1).
    armPose(boss) {
        const ELAPSED = boss.patternPhaseElapsed || 0;
        if (boss.patternPhase === 'windup') {
            return { out: EASE(clamp(ELAPSED / this.config.windup, 0, 1)), turn: 0 };
        }
        if (boss.patternPhase === 'active') {
            return { out: 1, turn: clamp(ELAPSED / Math.max(this.config.active, 0.001), 0, 1) };
        }
        if (boss.patternPhase === 'recover') {
            return { out: 1 - EASE(clamp(ELAPSED / ARM_FOLD_SECONDS, 0, 1)), turn: 1 };
        }
        return { out: 0, turn: 0 };
    }
    drawArms(renderer, boss, behind) {
        const POSE = this.armPose(boss);
        if (POSE.out <= 0.001) {
            return;
        }
        const SPECIES = speciesById(boss.species),
            OUTLINE = SPECIES.limbOutline,
            FILL = SPECIES.limbFill,
            LIGHT = highlight(FILL),
            START = (boss.patternAim ?? boss.angle) - Math.PI / 2,
            SHOULDER_Z = (boss.z || 0) + boss.height * 0.3,
            REACH = this.config.reach - ARM_FIST,
            TIP_DISTANCE = boss.radius * 0.8 + (REACH - boss.radius * 0.8) * POSE.out;
        renderer.ctx.flush();
        for (const ARM_START of [START, START + HALF_TURN]) {
            const ANGLE = ARM_START + HALF_TURN * POSE.turn,
                COS = Math.cos(ANGLE),
                SIN = Math.sin(ANGLE);
            // World y grows away from the camera: an arm pointing that way is on the far half.
            if (SIN > 0 !== behind) {
                continue;
            }
            const FROM = renderer.project(
                    boss.x + COS * boss.radius * 0.55,
                    boss.y + SIN * boss.radius * 0.55,
                    SHOULDER_Z,
                ),
                TO = renderer.project(boss.x + COS * TIP_DISTANCE, boss.y + SIN * TIP_DISTANCE, SHOULDER_Z);
            renderer.line(FROM, TO, ARM_WIDTH + 0.34, OUTLINE);
            renderer.line(FROM, TO, ARM_WIDTH, FILL);
            renderer.line(FROM, TO, ARM_WIDTH * 0.28, LIGHT);
            renderer.ellipse(
                TO.x,
                TO.y,
                renderer.scale * (ARM_FIST + 0.17),
                renderer.scale * (ARM_FIST + 0.17),
                OUTLINE,
            );
            renderer.ellipse(TO.x, TO.y, renderer.scale * ARM_FIST, renderer.scale * ARM_FIST, FILL);
            renderer.ellipse(
                TO.x - renderer.scale * 0.2,
                TO.y - renderer.scale * 0.22,
                renderer.scale * ARM_FIST * 0.38,
                renderer.scale * ARM_FIST * 0.3,
                LIGHT,
            );
        }
        renderer.ctx.flush();
    }
}
