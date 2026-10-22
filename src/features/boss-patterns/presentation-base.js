import { clamp } from '../../farm-model.js';

const EXTRA_PARTS = ['foot-left', 'foot-right', 'leaf', 'kernel-mark', 'hilum'];
const POSE_PHASE_METHODS = { windup: 'windup', active: 'active', recover: 'recover' };

export class BossAttackPose {
    reset(boss, parts, config, recoveryImpactSeconds) {
        this.parts = parts;
        this.config = config;
        this.elapsed = Math.max(0, boss.patternPhaseElapsed || 0);
        this.aim = Math.atan2(-0.62 * Math.sin(boss.patternAim ?? boss.angle), Math.cos(boss.patternAim ?? boss.angle));
        this.body = { y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
        this.arms = { 'arm-left': 0, 'arm-right': 0 };
        this.extras = {};
        for (const PART of EXTRA_PARTS) {
            if (parts.has(PART)) {
                this.extras[PART] = { x: 0, y: 0, rotation: 0 };
            }
        }
        this.active = boss.patternPhase === 'active';
        this.recoverImpact = boss.patternPhase === 'recover' && this.elapsed < recoveryImpactSeconds;
        this.impact = !!config && parts.has('body') && (this.active || this.recoverImpact);
        this.releasePulse = 0;
        const WIND = boss.patternPhase === 'windup' && config ? clamp(this.elapsed / config.windup, 0, 1) : 0,
            RECOVER = boss.patternPhase === 'recover' && config ? clamp(this.elapsed / config.recover, 0, 1) : 0;
        this.windEase = WIND * WIND * (3 - 2 * WIND);
        this.recoverEase = RECOVER * RECOVER * (3 - 2 * RECOVER);
        this.lead = Math.cos(this.aim) >= 0 ? 'arm-right' : 'arm-left';
        this.trail = this.lead === 'arm-right' ? 'arm-left' : 'arm-right';
        this.strikeAngle = clamp(this.aim, -1.2, 1.2);
    }
    arm(key, value) {
        if (this.parts.has(key)) {
            this.arms[key] = value;
        }
    }
    windup() {
        this.body.y = 4 * this.windEase;
        this.body.scaleX = 1 - 0.035 * this.windEase;
        this.body.scaleY = 1 + 0.06 * this.windEase;
        this.body.rotation = this.aim * 0.045 * this.windEase;
        this.arm(this.lead, -0.72 + this.strikeAngle * 0.22);
        this.arm(this.trail, 0.28 - this.strikeAngle * 0.12);
    }
    settle() {
        this.body.y = 3 * (1 - this.recoverEase);
        this.body.scaleX = 1 + 0.045 * (1 - this.recoverEase);
        this.body.scaleY = 1 - 0.065 * (1 - this.recoverEase);
        this.body.rotation = this.aim * 0.025 * (1 - this.recoverEase);
        this.arm(this.lead, 0.35 * (1 - this.recoverEase) + this.strikeAngle * 0.16);
        this.arm(this.trail, -0.12 * (1 - this.recoverEase));
    }
    strike() {
        this.body.y = -3;
        this.body.scaleX = 1.075;
        this.body.scaleY = 0.91;
        this.body.rotation = this.aim * 0.09;
        this.arm(this.lead, 0.95 + this.strikeAngle * 0.55);
        this.arm(this.trail, -0.42 - this.strikeAngle * 0.18);
    }
}

export class BossAttackPresentation {
    constructor(feature, activeClip = 'strike', recoveryClipSeconds = 0, recoveryImpactSeconds = 0) {
        this.id = feature?.id;
        this.config = feature?.config;
        this.activeClip = activeClip;
        this.recoveryClipSeconds = recoveryClipSeconds;
        this.recoveryImpactSeconds = recoveryImpactSeconds;
        this.summoning = false;
    }
    pose(boss, parts, scratch) {
        scratch.reset(boss, parts, this.config, this.recoveryImpactSeconds);
        if (this.config && parts.has('body')) {
            this[POSE_PHASE_METHODS[boss.patternPhase]]?.(boss, scratch);
        }
        return scratch;
    }
    windup(_boss, pose) {
        pose.windup();
    }
    active(_boss, pose) {
        pose.strike();
    }
    recover(_boss, pose) {
        pose.settle();
    }
    activeMotion() {
        return this.activeClip;
    }
    recoverMotion(boss) {
        return (boss.patternPhaseElapsed || 0) < this.recoveryClipSeconds ? this.activeClip : 'recover';
    }
    play(instance, _metadata, _boss, clipName, startedAtMs) {
        if (instance.summoning || instance.player.currentClip !== clipName) {
            instance.player.transitionTo(clipName, startedAtMs, 70);
        }
        instance.summoning = false;
    }
    seek(player, displayTimeMs) {
        player.seek(displayTimeMs);
    }
    mouthOpen() {
        return false;
    }
    drawRelease() {
        // Ordinary attacks have no mouth-release paint.
    }
    drawBehind() {
        // Ordinary attacks paint nothing behind the body.
    }
    drawWeapon() {
        // Ordinary attacks have no articulated weapon pass.
    }
    drawTelegraph(renderer, area) {
        renderer.drawBossDanger(area);
    }
}
