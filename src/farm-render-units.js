import {
    unitAttackPresentation,
    unitCombatMotion,
    unitCombatExpression,
    motionElapsedMs,
    prepareUnitAttackPlayer,
    applyUnitAttackPose,
    updateUnitAttackDisplay,
    drawUnitAttackGround,
    drawUnitAttackContact,
} from './features/unit-attacks/presentation.js';
import { unitAttackDisplayScale } from './features/unit-attacks/presentation-geometry.js';
import { unitBodyDefinition } from './features/unit-body/definition.js';
import { BarleyArmorShredPresentation } from './features/abilities/barley-shred/presentation.js';
import { ATTACK_TYPES, CONFIG, clamp } from './farm-model.js';
import { farmBreedingCooldown, unitRestPresentation } from './farm-indicators.js';
import { scenePresentation } from './farm-render-scenes.js';
import { PassiveMarksPresentation } from './tower-passive-presentations.js';

const BARLEY_SHRED_PRESENTATION = new BarleyArmorShredPresentation();
const PASSIVE_MARKS = new PassiveMarksPresentation();

// Labor has its own clock, independent of an overlapping combat action. Use
// the shared native work clips, never a form-specific combat stage from that action.
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
        ? { name: 'fire', elapsed: Math.min(ELAPSED, 399) }
        : { name: 'recover', elapsed: ELAPSED };
}
function unitMotion(u, sim, rest) {
    const DEAD = u.hp <= 0 || u.down > 0;
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
    const COMBAT_MOTION = unitCombatMotion(u);
    if (COMBAT_MOTION) {
        return COMBAT_MOTION;
    }
    return MOVING ? 'walk' : 'idle';
}
function unitExpression(u, sim, joyEffects, rest) {
    const DEAD = u.hp <= 0 || u.down > 0;
    if (rest) {
        return rest.phase === 'defeat' ? 'dead' : rest.phase === 'wake' ? 'neutral' : 'sleep';
    }
    if (DEAD) {
        return 'dead';
    }
    if (scenePresentation(sim.scene).victorious(sim)) {
        return 'happy';
    }
    return unitCombatExpression(u) || scenePresentation(sim.scene).unitMood(u, joyEffects);
}
const ATTACK_ACCENTS = ['#8fac68', '#dbb76b', '#b58b9c', '#9a6947', '#d7914f', '#a86b32'];

// The unit presentation owns its reusable indicator scratch and the ordering of
// rear rings, native vector passes, front rings, and sleep feedback.
export class UnitPresentation {
    constructor(renderer) {
        this.renderer = renderer;
        this.unitRings = [];
        this.riceDisplayUnits = new Map();
        this.wheatDisplayUnits = new Map();
        this.barleyDisplayUnits = new Map();
        this.unitRingPool = [{}, {}, {}, {}];
        this.breedingIndicator = {};
        this.restIndicator = {};
    }
    prepareUnits(units, time, world) {
        if (
            this.riceDisplayWorld !== world ||
            this.riceDisplayTime > this.renderer.displayTimeMs ||
            this.riceDisplayRevision !== world.presentationRevision
        ) {
            this.riceDisplayUnits.clear();
            this.wheatDisplayUnits.clear();
            this.barleyDisplayUnits.clear();
        }
        this.riceDisplayWorld = world;
        this.riceDisplayTime = this.renderer.displayTimeMs;
        this.riceDisplayRevision = world.presentationRevision;
        const LIVE = new Set();
        for (const UNIT of units) {
            if (UNIT.species !== 6 && UNIT.species !== 7 && UNIT.species !== 8) {
                continue;
            }
            LIVE.add(UNIT.id);
            const CACHE =
                UNIT.species === 8
                    ? this.barleyDisplayUnits
                    : UNIT.species === 7
                      ? this.wheatDisplayUnits
                      : this.riceDisplayUnits;
            let entry = CACHE.get(UNIT.id);
            if (!entry || entry.seed !== UNIT.seed || entry.generation !== UNIT.generation) {
                entry = {
                    seed: UNIT.seed,
                    generation: UNIT.generation,
                    unit: {},
                    offset: { x: 0, y: 0 },
                    releasedAt: null,
                };
                CACHE.set(UNIT.id, entry);
            }
            updateUnitAttackDisplay(this.renderer, entry, UNIT, time);
        }
        for (const CACHE of [this.riceDisplayUnits, this.wheatDisplayUnits, this.barleyDisplayUnits]) {
            for (const ID of CACHE.keys()) {
                if (!LIVE.has(ID)) {
                    CACHE.delete(ID);
                }
            }
        }
    }
    displayUnit(unit) {
        const CACHE =
            unit.species === 8
                ? this.barleyDisplayUnits
                : unit.species === 7
                  ? this.wheatDisplayUnits
                  : unit.species === 6
                    ? this.riceDisplayUnits
                    : null;
        return CACHE?.get(unit.id)?.unit || unit;
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
            this.addUnitRing(
                u.radius + 0.16 + 0.12 * u.commandBeatLife,
                '#eacb72',
                0.045 + 0.025 * u.commandBeatLife,
                1,
            );
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
        prepareUnitAttackPlayer(player, u);
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
        if (!SWING && !rest) {
            applyUnitAttackPose(MATRIX, u, GROUND);
        }
        if (this.renderer.cornAttachmentBodies.has(u.id)) {
            this.renderer.captureCornAttachmentBody(u, u.id, player, MATRIX);
        }
        // Native vector players submit directly to MeshRenderer, so flush earlier 2D paint first.
        this.renderer.ctx.vector.flush();
        player.draw({
            projection: this.renderer.ctx.vector.projection,
            matrix: MATRIX,
            alpha: u.isFormationClone ? 0.52 : 1,
            color: u.isFormationClone ? [0.55, 0.82, 1, 1] : [1, 1, 1, 1],
        });
        drawUnitAttackContact(this.renderer, u, player, MATRIX);
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
            R = unitAttackDisplayScale(this.renderer, u, sim.time) * Math.max(BODY.viewBox[2], BODY.viewBox[3]) * 0.5;
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
        if (!REST) {
            drawUnitAttackGround(this.renderer, u);
        }
        const POSE = this.drawUnit(u, sim, REST);
        this.drawUnitRingLayer(u, EFFECTS, 'front');
        this.drawSleepIndicator(REST, POSE);
        PASSIVE_MARKS.drawUnit(this.renderer, u, sim.time);
        BARLEY_SHRED_PRESENTATION.drawStatus(this.renderer, u);
    }
}
