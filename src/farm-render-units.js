import { ChestnutAttackPresentation } from './features/unit-attacks/chestnut/presentation.js';
import { RedbeanAttackPresentation } from './features/unit-attacks/redbean/presentation.js';
import { unitBodyDefinition, unitDisplayScale } from './features/unit-body/definition.cjs';
import { BarleyArmorShredPresentation } from './features/abilities/barley-shred/presentation.js';
import { UnitAttackPresentation } from './features/unit-attacks/presentation-base.js';
import { PeaAttackPresentation } from './features/unit-attacks/pea/presentation.js';
import { LobPresentation } from './features/unit-attacks/lob/presentation.js';
import { DualStrikePresentation } from './features/unit-attacks/dual-strike/presentation.js';
import { ATTACK_TYPES, CONFIG, clamp } from './farm-model.js';
import { farmBreedingCooldown, unitRestPresentation } from './farm-indicators.js';
import { scenePresentation } from './farm-render-scenes.js';
import { PassiveMarksPresentation } from './tower-passive-presentations.js';

const CHESTNUT_ATTACK = new ChestnutAttackPresentation();
const REDBEAN_ATTACK = new RedbeanAttackPresentation();
const PEA_ATTACK = new PeaAttackPresentation();
const DEFAULT_ATTACK = new UnitAttackPresentation();
const BARLEY_SHRED_PRESENTATION = new BarleyArmorShredPresentation();
const PASSIVE_MARKS = new PassiveMarksPresentation();
const ATTACK_PRESENTATIONS = new Map(
    [new DualStrikePresentation(), new LobPresentation()].map((presentation) => [presentation.id, presentation]),
);
function unitAttackPresentation(unit) {
    if (unit.species === 3 && unit.ability?.chestnutForm) {
        return CHESTNUT_ATTACK;
    }
    if (unit.species === 2 && unit.ability?.redbeanForm) {
        return REDBEAN_ATTACK;
    }
    if (unit.species === 0 && unit.ability?.peaForm) {
        return PEA_ATTACK;
    }
    return ATTACK_PRESENTATIONS.get(ATTACK_TYPES[unit.species]?.kind) || DEFAULT_ATTACK;
}

// A worker at the grain stack reuses its attack clips: wind up, strike on the tap, then recover.
function workSwing(u, sim) {
    const SWING = sim.workSwingOf?.(u.id);
    if (!SWING || SWING.phase === 'idle' || u.hp <= 0) {
        return null;
    }
    const ELAPSED = SWING.elapsed * 1000;
    if (SWING.phase === 'windup') {
        return { name: 'windup', elapsed: Math.min(279, ELAPSED) };
    }
    return SWING.phase === 'fire'
        ? { name: unitAttackPresentation(u).activeMotion(u), elapsed: Math.min(ELAPSED, 399) }
        : { name: 'recover', elapsed: ELAPSED };
}
function unitMotion(u, sim, rest) {
    const DEAD = u.hp <= 0 || u.down > 0,
        AIRBORNE = !u.dropLanded || u.z > 0.1,
        PHASE = u.ability?.phase || 'idle';
    const MOVING = Math.hypot(u.vx || 0, u.vy || 0) > 0.18;
    if (rest) {
        return rest.phase;
    }
    if (DEAD) {
        return 'death';
    }
    if (scenePresentation(sim.scene).victorious(sim)) {
        return 'victory';
    }
    if (AIRBORNE) {
        return 'airborne';
    }
    if (u.stun > 0) {
        return 'hit';
    }
    if (u.bounce > 0.04) {
        return 'landing';
    }
    if (PHASE === 'windup') {
        return unitAttackPresentation(u).windupMotion?.(u) || 'windup';
    }
    if (PHASE === 'active') {
        return unitAttackPresentation(u).activeMotion(u);
    }
    if (PHASE === 'recover') {
        return unitAttackPresentation(u).recoverMotion(u);
    }
    return MOVING ? 'walk' : 'idle';
}
function motionElapsedMs(u, name, clip) {
    if (name === 'idle' || name === 'walk' || name === 'airborne') {
        return ((u.seed || 0) * 80) % clip.durationMs;
    }
    if (
        name === 'windup' ||
        name.startsWith('windup-') ||
        name === 'fire' ||
        name.startsWith('fire-') ||
        name === 'recover'
    ) {
        return clamp((u.ability?.elapsed || 0) * 1000, 0, clip.durationMs);
    }
    if (name === 'hit') {
        return clip.durationMs * (1 - clamp((u.stun || 0) / 0.5, 0, 1));
    }
    if (name === 'landing') {
        return clip.durationMs * (1 - clamp((u.bounce || 0) / 0.22, 0, 1));
    }
    if (name === 'victory') {
        return (Math.abs(u.seed || 0) * 97.531) % clip.durationMs;
    }
    return clip.durationMs;
}
function unitExpression(u, sim, joyEffects, rest) {
    const DEAD = u.hp <= 0 || u.down > 0,
        AIRBORNE = !u.dropLanded || u.z > 0.5;
    const PHASE = u.ability?.phase;
    if (rest) {
        return rest.phase === 'defeat' ? 'dead' : rest.phase === 'wake' ? 'neutral' : 'sleep';
    }
    if (DEAD) {
        return 'dead';
    }
    if (scenePresentation(sim.scene).victorious(sim)) {
        return 'happy';
    }
    if (u.stun > 0) {
        return 'hurt';
    }
    if (AIRBORNE) {
        return 'surprised';
    }
    if (u.walnutGuarding) {
        return 'guard';
    }
    if (PHASE === 'windup') {
        return 'focused';
    }
    if (PHASE === 'active') {
        return 'attack';
    }
    return scenePresentation(sim.scene).unitMood(u, joyEffects);
}
const ATTACK_ACCENTS = ['#8fac68', '#dbb76b', '#b58b9c', '#9a6947', '#d7914f', '#a86b32'];

// The unit presentation owns its reusable indicator scratch and the ordering of
// rear rings, native vector passes, front rings, and sleep feedback.
export class UnitPresentation {
    constructor(renderer) {
        this.renderer = renderer;
        this.unitRings = [];
        this.unitRingPool = [{}, {}, {}, {}];
        this.breedingIndicator = {};
        this.restIndicator = {};
    }
    addUnitRing(radius, color, width, progress) {
        const EFFECT = this.unitRingPool[this.unitRings.length];
        EFFECT.radius = radius;
        EFFECT.color = color;
        EFFECT.width = width;
        EFFECT.progress = progress;
        this.unitRings.push(EFFECT);
    }
    unitRingEffects(u, world) {
        const EFFECTS = this.unitRings,
            A = u.ability,
            S_LOCAL = ATTACK_TYPES[u.species];
        EFFECTS.length = 0;
        if (u.buffed && u.hp > 0) {
            this.addUnitRing(u.radius + 0.16, '#eacb72', 0.055, 1);
        }
        if (world.isWorker?.(u)) {
            this.addUnitRing(u.radius + 0.08, '#c2913e', 0.04, 1);
        }
        if (A.phase === 'windup' && S_LOCAL) {
            this.addUnitRing(
                u.radius + 0.1,
                ATTACK_ACCENTS[u.species] || ATTACK_ACCENTS[0],
                0.065,
                Math.min(1, A.elapsed / S_LOCAL.timing.windup),
            );
        }
        const BREEDING = farmBreedingCooldown(u, world, CONFIG.farm.breeding.cooldownSeconds, this.breedingIndicator);
        if (BREEDING && BREEDING.progress > 0) {
            this.addUnitRing(u.radius + 0.085, '#8fac68', 0.035, BREEDING.progress);
        }
        return EFFECTS;
    }
    drawUnitRingLayer(u, effects, side) {
        for (const EFFECT of effects) {
            const SWEEP = Math.PI * 2 * Math.max(0, Math.min(1, Number(EFFECT.progress) || 0));
            if (SWEEP >= Math.PI * 2) {
                // A complete ring is one full-ellipse stroke, which the renderer draws analytically. Two half arcs
                // would tessellate a polyline stroke twice per unit per frame.
                if (side === 'rear') {
                    this.renderer.ring(u.x, u.y, EFFECT.radius, EFFECT.color, EFFECT.width);
                }
            } else if (side === 'rear' && SWEEP > 0) {
                this.renderer.ring(u.x, u.y, EFFECT.radius, EFFECT.color, EFFECT.width, 0, Math.min(Math.PI, SWEEP));
            } else if (side === 'front' && SWEEP > Math.PI) {
                this.renderer.ring(u.x, u.y, EFFECT.radius, EFFECT.color, EFFECT.width, Math.PI, SWEEP);
            }
        }
    }
    drawSleepIndicator(rest, pose) {
        if (!rest || rest.phase === 'defeat') {
            return;
        }
        const C = this.renderer.ctx,
            D = this.renderer.pixelRatio,
            P = pose.p,
            R = pose.r;
        // Short lavender elapsed bar BELOW the body. No HP colors, grade outline,
        // overhead numeric badge, or countdown for Raid's non-advancing recovery.
        if (rest.progress >= 0) {
            const W = Math.max(18 * D, Math.min(30 * D, R * 1.6)),
                H = 3 * D,
                X = P.x - W / 2,
                Y = P.y + R * 0.35 + 3 * D;
            C.fillStyle = '#494257';
            C.beginPath();
            C.roundRect(X - D, Y - D, W + 2 * D, H + 2 * D, 2.5 * D);
            C.fill();
            C.fillStyle = '#c2b2e8';
            C.beginPath();
            C.roundRect(X, Y, W * rest.progress, H, 1.5 * D);
            C.fill();
        }
        if (rest.phase === 'sleep') {
            const SIZE = 2.4 * D,
                X = P.x + R * 0.9,
                Y = P.y - R * 0.9;
            C.strokeStyle = '#494257';
            C.lineWidth = 2.2 * D;
            C.lineCap = 'round';
            C.beginPath();
            C.moveTo(X, Y - SIZE);
            C.lineTo(X + SIZE * 1.5, Y - SIZE);
            C.lineTo(X, Y + SIZE);
            C.lineTo(X + SIZE * 1.5, Y + SIZE);
            C.stroke();
            C.strokeStyle = '#ded3f5';
            C.lineWidth = D;
            C.stroke();
        }
    }
    drawVectorUnit(u, sim, p, r, rest) {
        const RECORD = this.renderer.vectorAssets.get(u.species);
        if (!RECORD) {
            throw new Error('Missing required troop vector asset for species ' + u.species);
        }
        let player = this.renderer.vectorPlayers.get(u.id);
        if (player && this.renderer.vectorPlayerAssets.get(player) !== RECORD) {
            player.dispose();
            this.renderer.vectorPlayers.delete(u.id);
            player = null;
        }
        const METADATA = RECORD.compiled.metadata,
            SWING = rest ? null : workSwing(u, sim),
            MOTION_NAME = SWING?.name || unitMotion(u, sim, rest),
            CLIP = METADATA.clips[MOTION_NAME] || METADATA.clips.idle,
            PHASE_TIME_MS = !rest && !SWING ? unitAttackPresentation(u).clipElapsedMs?.(u, MOTION_NAME) : null,
            HAS_PHASE_CLOCK = Number.isFinite(PHASE_TIME_MS);
        const CLIP_START_AT_MS =
            rest || HAS_PHASE_CLOCK
                ? 0
                : this.renderer.displayTimeMs - (SWING ? SWING.elapsed : motionElapsedMs(u, MOTION_NAME, CLIP));
        if (!player) {
            player = RECORD.asset.createPlayer({
                clip: MOTION_NAME,
                startedAtMs: CLIP_START_AT_MS,
            });
            this.renderer.vectorPlayers.set(u.id, player);
            this.renderer.vectorPlayerAssets.set(player, RECORD);
        } else if (player.currentClip !== MOTION_NAME) {
            player.play(MOTION_NAME, CLIP_START_AT_MS);
        }
        const ORIGINAL =
                u.isFormationClone && sim.time - u.cloneBornAt < 0.5
                    ? sim.units.find((unit) => unit.id === u.cloneParentId)
                    : null,
            EXPRESSION = unitExpression(ORIGINAL || u, sim, this.renderer.joyEffects, rest);
        if (EXPRESSION !== player.currentExpression) {
            player.setExpression(EXPRESSION);
        }
        player.seek(
            HAS_PHASE_CLOCK
                ? clamp(PHASE_TIME_MS, 0, CLIP.durationMs)
                : rest
                  ? rest.elapsed * 1000
                  : this.renderer.displayTimeMs,
        );
        const [, , WIDTH, HEIGHT] = RECORD.compiled.viewBox,
            GROUND = unitBodyDefinition(u.species).ground,
            SCALE = (2 * r) / Math.max(WIDTH, HEIGHT);
        const MATRIX = [SCALE, 0, 0, SCALE, p.x - GROUND.x * SCALE, p.y - GROUND.y * SCALE];
        if (!SWING && !rest && u.species === 0 && u.hp > 0 && u.stun <= 0 && u.dropLanded && u.z === 0) {
            PEA_ATTACK.applyGroundedPose(MATRIX, u, GROUND);
        }
        if (!SWING && !rest && u.species === 2 && u.hp > 0 && u.stun <= 0 && u.dropLanded) {
            REDBEAN_ATTACK.applyPose(MATRIX, u, GROUND);
        }
        if (!SWING && !rest && u.species === 3 && u.hp > 0 && u.stun <= 0 && u.dropLanded) {
            CHESTNUT_ATTACK.applyPose(MATRIX, u, GROUND);
        }
        // Native vector players submit directly to MeshRenderer, so flush earlier 2D paint first.
        this.renderer.ctx.vector.flush();
        player.draw({
            projection: this.renderer.ctx.vector.projection,
            matrix: MATRIX,
            alpha: u.isFormationClone ? 0.52 : 1,
            color: u.isFormationClone ? [0.55, 0.82, 1, 1] : [1, 1, 1, 1],
        });
        return true;
    }
    drawUnit(u, sim, rest) {
        const DEAD = u.hp <= 0,
            WALK = DEAD ? 0 : Math.min(1, Math.hypot(u.vx, u.vy)),
            BOB = u.z === 0 ? Math.abs(Math.sin(sim.time * 9 + u.seed)) * 0.1 * WALK : 0,
            P = this.renderer.project(
                u.x + (u.isFormationClone ? Math.min(1, (sim.time - u.cloneBornAt) / 0.5) * 0.35 : 0),
                u.y,
                u.z + BOB,
            );
        const BODY = unitBodyDefinition(u.species),
            GIANT_SCALE = u.giantUntil > sim.time ? 3 : 1,
            SCALE = unitDisplayScale(
                BODY,
                u.bodyScale,
                this.renderer.scale,
                this.renderer.minimumUnitPixels() * GIANT_SCALE,
            ),
            R =
                SCALE *
                Math.max(BODY.viewBox[2], BODY.viewBox[3]) *
                0.5 *
                (1 +
                    Math.sin((sim.time - u.giantEndedAt) * 30) *
                        0.12 *
                        Math.max(0, 1 - (sim.time - u.giantEndedAt) / 0.35));
        this.drawVectorUnit(u, sim, P, R, rest);
        return {
            p: P,
            r: R,
        };
    }
    draw(u, sim) {
        const EFFECTS = this.unitRingEffects(u, sim);
        this.drawUnitRingLayer(u, EFFECTS, 'rear');
        const REST = unitRestPresentation(u, sim, CONFIG.unit.corpseRecoverySeconds, this.restIndicator);
        const POSE = this.drawUnit(u, sim, REST);
        this.drawUnitRingLayer(u, EFFECTS, 'front');
        this.drawSleepIndicator(REST, POSE);
        PASSIVE_MARKS.drawUnit(this.renderer, u, sim.time);
        BARLEY_SHRED_PRESENTATION.drawStatus(this.renderer, u);
    }
}
