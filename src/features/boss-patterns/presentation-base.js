import { clamp } from '../../farm-model.js';
import { HAND_REST_FACE } from '../../boss-vector-sockets.js';

const EXTRA_PARTS = ['foot-left', 'foot-right', 'leaf', 'kernel-mark', 'hilum'];
const POSE_PHASE_METHODS = { windup: 'windup', active: 'active', recover: 'recover' };

export class BossAttackPose {
    reset(boss, parts, config, recoveryImpactSeconds, rig) {
        this.parts = parts;
        this.config = config;
        this.elapsed = Math.max(0, boss.patternPhaseElapsed || 0);
        this.aim = Math.atan2(-0.62 * Math.sin(boss.patternAim ?? boss.angle), Math.cos(boss.patternAim ?? boss.angle));
        this.body = { y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
        // The floating hands: how far each is from where it rests (world units on the screen, +x right, +y down) and
        // which way its knuckles face. R is the body radius, the unit the poses are written in.
        this.rig = rig;
        this.radius = boss.radius;
        this.hands = {
            'arm-left': { x: 0, y: 0, face: HAND_REST_FACE },
            'arm-right': { x: 0, y: 0, face: HAND_REST_FACE },
        };
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
    }
    side(key) {
        return key === 'arm-left' ? -1 : 1;
    }
    hand(key, x, y, face = HAND_REST_FACE) {
        Object.assign(this.hands[key], { x, y, face });
    }
    // The same, but placed from the middle of the body instead of from the resting spot.
    handAt(key, x, y, face = HAND_REST_FACE) {
        const REST = this.rig.rest[key];
        this.hand(key, x - REST.x, y - REST.y, face);
    }
    // Where the lead hand goes in a strike: out toward the target. The other one hangs out to its own side.
    strikeHands(amount) {
        const R = this.radius;
        this.hand(this.lead, Math.cos(this.aim) * 1.1 * R * amount, Math.sin(this.aim) * 1.1 * R * amount, this.aim);
        this.hand(this.trail, this.side(this.trail) * 0.4 * R * amount, -0.1 * R * amount);
    }
    windup() {
        this.body.y = 4 * this.windEase;
        this.body.scaleX = 1 - 0.035 * this.windEase;
        this.body.scaleY = 1 + 0.06 * this.windEase;
        this.body.rotation = this.aim * 0.045 * this.windEase;
        const R = this.radius;
        this.hand(this.lead, this.side(this.lead) * 0.3 * R * this.windEase, -0.95 * R * this.windEase);
        this.hand(this.trail, this.side(this.trail) * 0.5 * R * this.windEase, -0.35 * R * this.windEase);
    }
    settle() {
        this.body.y = 3 * (1 - this.recoverEase);
        this.body.scaleX = 1 + 0.045 * (1 - this.recoverEase);
        this.body.scaleY = 1 - 0.065 * (1 - this.recoverEase);
        this.body.rotation = this.aim * 0.025 * (1 - this.recoverEase);
        this.strikeHands(1 - this.recoverEase);
    }
    strike() {
        this.body.y = -3;
        this.body.scaleX = 1.075;
        this.body.scaleY = 0.91;
        this.body.rotation = this.aim * 0.09;
        this.strikeHands(1);
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
    pose(boss, parts, scratch, rig) {
        scratch.reset(boss, parts, this.config, this.recoveryImpactSeconds, rig);
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
    drawTelegraph(renderer, area) {
        renderer.drawBossDanger(area);
    }
}
