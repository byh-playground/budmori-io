import { BossAttackPresentation } from '../presentation-base.js';
import { FEATURE } from './definition.js';
import { bossSummonPose, sampleBossSummon } from '../../../render/boss-vector-sockets.js';

export class MouthSummonPresentation extends BossAttackPresentation {
    constructor() {
        super(FEATURE, 'fire');
        this.summoning = true;
    }
    pose(boss, parts, scratch, rig) {
        if (!parts.has('body')) {
            return super.pose(boss, parts, scratch, rig);
        }
        return bossSummonPose(boss, parts);
    }
    play(instance, metadata, boss) {
        sampleBossSummon(instance.player, metadata, boss);
        instance.summoning = true;
    }
    seek() {
        // sampleBossSummon owns the exact phase seek used by model sockets too.
    }
    mouthOpen(boss) {
        return (
            boss.patternPhase === 'active' ||
            (boss.patternPhase === 'windup' && boss.patternPhaseElapsed >= this.config.windup * 0.5)
        );
    }
    drawRelease(renderer, boss, pose, mouth) {
        if (!(boss.patternReleased > 0 && pose.releasePulse > 0 && mouth)) {
            return;
        }
        const PULSE = 0.55 + 0.45 * pose.releasePulse,
            TARGET = Math.atan2(-0.62 * Math.sin(boss.patternAim), Math.cos(boss.patternAim));
        renderer.ellipse(
            mouth.x,
            mouth.y,
            renderer.scale * 0.18 * PULSE,
            renderer.scale * 0.12 * PULSE,
            'rgba(255,210,113,.72)',
        );
        renderer.ellipse(
            mouth.x + Math.cos(TARGET) * renderer.scale * 0.16,
            mouth.y + Math.sin(TARGET) * renderer.scale * 0.1,
            renderer.scale * 0.065,
            renderer.scale * 0.08,
            '#fff1ad',
        );
    }
    drawTelegraph(renderer, area) {
        // Summons announce arrival without claiming a damaging red area.
        const REACH = this.config.landingRadius,
            X = area.x + Math.cos(area.angle) * REACH,
            Y = area.y + Math.sin(area.angle) * REACH;
        renderer.strokeGroundEllipse(X, Y, 0.65, 0.48, '#bd915d', 0.085);
        renderer.ring(X, Y, 0.28, '#f1d391', 0.045, 0, Math.PI * 1.8);
    }
}
