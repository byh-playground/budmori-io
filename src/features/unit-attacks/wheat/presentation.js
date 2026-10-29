import { unitAttackDisplayScale, unitAttackGroundOffset } from '../presentation-geometry.js';
import { unitBodyDefinition } from '../../unit-body/definition.js';
import { WORLD_DEPTH_PROJECTION } from '../../../vector-sockets.js';
import { UnitAttackPresentation } from '../presentation-base.js';

// The committed finite melee schedule is the only presentation clock.
export function updateWheatPresentation(output, action, phase, _elapsed) {
    const RECORD = action?.wheatAttack,
        TICK = phase === 'active' ? RECORD?.motionTick || 0 : 0,
        INDEX = RECORD ? RECORD.shots.findIndex((shot) => TICK <= shot.tick) : -1,
        SLOT = RECORD ? (INDEX < 0 ? RECORD.shots.length - 1 : INDEX) : 0,
        SHOT = RECORD?.shots[SLOT],
        START = SLOT > 0 ? RECORD.shots[SLOT - 1].tick : 0;
    output.wheatForm = RECORD?.form || 0;
    output.wheatActionId = RECORD?.id || action?.id || 0;
    output.wheatSlot = SLOT;
    output.wheatStage = phase === 'active' ? SHOT?.stage || 'front' : phase;
    output.wheatPreviousStage = SLOT > 0 ? RECORD.shots[SLOT - 1].stage : 'ready';
    output.wheatFirstStage = RECORD?.shots[0]?.stage || 'front';
    output.wheatLastStage = RECORD?.shots.at(-1)?.stage || 'front';
    output.wheatStageProgress = SHOT
        ? Math.max(0, Math.min(1, SHOT.tick === START ? 1 : (TICK - START) / (SHOT.tick - START)))
        : 0;
    output.wheatWindupDuration = RECORD?.windupSeconds || 0.28;
    output.wheatRecoveryDuration = RECORD?.recoverySeconds || 0.62;
    output.wheatPointX = RECORD?.point.x || 0;
    output.wheatPointY = RECORD?.point.y || 0;
    output.wheatFace = RECORD && RECORD.point.x < RECORD.origin.x ? -1 : 1;
}

const TRAILS = new WeakMap();
const CONTACT_SOCKETS = new WeakMap();
// Read the endpoint through the pinned native player once per asset/stage.
// This player is never drawn and is disposed immediately; live draw poses are
// still driven solely by the actual committed action's phase clock.
function contactSocket(context, record, stage, longBaton = false) {
    let cache = CONTACT_SOCKETS.get(record);
    if (!cache) {
        cache = new Map();
        CONTACT_SOCKETS.set(record, cache);
    }
    const KEY = `${longBaton ? 1 : 0}:${stage}`;
    if (!cache.has(KEY)) {
        const CLIP = Object.keys(record.compiled.metadata.clips).find(
            (name) => name.startsWith('fire-wheat-') && name.endsWith(`-${stage}`),
        );
        const PLAYER = globalThis.BloomGamekitVectorAssets.createVectorActor(context, record.compiled, {
            clip: CLIP,
            startedAtMs: 0,
        });
        try {
            setWheatBatonLength(PLAYER, longBaton);
            PLAYER.seek(1000);
            cache.set(KEY, PLAYER.getSocket('weapon-tip'));
        } finally {
            PLAYER.dispose();
        }
    }
    return cache.get(KEY);
}
const BATON_LENGTHS = new WeakMap();
// Only the held wooden baton is longer at T4+. Its painted grip remains fixed;
// the connected character, hand, shadow and body geometry are never stretched.
export function setWheatBatonLength(player, longBaton) {
    const LENGTH = longBaton ? 1.3 : 1;
    if (BATON_LENGTHS.get(player) !== LENGTH) {
        player.setBasePose('command-baton', { scaleX: LENGTH, scaleY: LENGTH });
        BATON_LENGTHS.set(player, LENGTH);
    }
}
const PREVIEW_LIFT = new WeakMap();
export function wheatPreviewEnvelope(renderer, unit) {
    const BODY = unitBodyDefinition(7),
        ART = unit.bodyScale * Math.max(BODY.viewBox[2], BODY.viewBox[3]),
        RECORD = renderer.vectorAssets.get(7);
    let lift = 0.55 * ART;
    if (RECORD) {
        if (!PREVIEW_LIFT.has(RECORD)) {
            const STAGES = new Set(
                Object.keys(RECORD.compiled.metadata.clips)
                    .filter((name) => name.startsWith('fire-wheat-'))
                    .map((name) => name.split('-').at(-1)),
            );
            PREVIEW_LIFT.set(
                RECORD,
                Math.max(
                    0,
                    ...[...STAGES].map((stage) => BODY.ground.y - contactSocket(renderer.ctx, RECORD, stage, true).y),
                ),
            );
        }
        lift = PREVIEW_LIFT.get(RECORD) * unit.bodyScale;
    }
    // The preview is grounded at y=0. Reserve every contact lunge, the whole
    // authored upper body/hat, and the widest foot/grade ring including stroke.
    const FOOTPRINT = Math.max(unit.size * 0.66 * 1.12, unit.radius + 0.1);
    // Reserve the full possible12% post-giant body rebound too. At the
    // supported160px+ modal height the fitted art remains above the66px
    // giant minimum (11px radius ×2 ×3), so no hidden clamp enlarges it.
    return { above: ART * 1.05 * 1.12, below: lift * 1.12 + FOOTPRINT * WORLD_DEPTH_PROJECTION + 0.06 };
}
const SMOOTH = (value) => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, value)))) / 2;

export class WheatAttackPresentation extends UnitAttackPresentation {
    contactOffset(renderer, unit, stage, time, record) {
        const RECORD = record || renderer.vectorAssets.get(7);
        if (!RECORD) {
            return { x: 0, y: 0 };
        }
        const BODY = unitBodyDefinition(7),
            TIP = contactSocket(renderer.ctx, RECORD, stage, unit.ability.wheatLongBaton),
            SCALE = unitAttackDisplayScale(renderer, unit, time),
            FACE = unit.ability.wheatFace,
            POINT = renderer.project(unit.ability.wheatPointX, unit.ability.wheatPointY, 0),
            ORIGIN = renderer.project(unit.x, unit.y, unit.z),
            DX = POINT.x - ORIGIN.x - FACE * (TIP.x - BODY.ground.x) * SCALE,
            DY = POINT.y - ORIGIN.y - (TIP.y - BODY.ground.y) * SCALE;
        return unitAttackGroundOffset(unit, DX / renderer.scale, -DY / (renderer.scale * WORLD_DEPTH_PROJECTION));
    }
    groundOffset(renderer, unit, time, record) {
        const A = unit.ability;
        if (!A.wheatForm || unit.hp <= 0 || unit.stun > 0) {
            return null;
        }
        if (A.phase === 'windup') {
            return { x: 0, y: 0 };
        }
        if (A.phase === 'recover') {
            const END = this.contactOffset(renderer, unit, A.wheatLastStage, time, record),
                LEFT = 1 - SMOOTH(A.elapsed / A.wheatRecoveryDuration);
            return { x: END.x * LEFT, y: END.y * LEFT };
        }
        if (A.phase !== 'active') {
            return null;
        }
        const START =
                A.wheatPreviousStage === 'ready'
                    ? { x: 0, y: 0 }
                    : this.contactOffset(renderer, unit, A.wheatPreviousStage, time, record),
            END = this.contactOffset(renderer, unit, A.wheatStage, time, record),
            T = SMOOTH(A.wheatStageProgress);
        return { x: START.x + (END.x - START.x) * T, y: START.y + (END.y - START.y) * T };
    }

    windupMotion(unit) {
        return `windup-wheat-${unit.ability.wheatFirstStage}`;
    }
    activeMotion(unit) {
        return `fire-wheat-${unit.ability.wheatPreviousStage}-${unit.ability.wheatStage}`;
    }
    recoverMotion(unit) {
        return `recover-wheat-${unit.ability.wheatLastStage}`;
    }
    clipElapsedMs(unit, motion) {
        if (!motion.includes('-wheat-')) {
            return null;
        }
        const A = unit.ability;
        return A.phase === 'active'
            ? A.wheatStageProgress * 1000
            : (A.elapsed / (A.phase === 'windup' ? A.wheatWindupDuration : A.wheatRecoveryDuration)) * 1000;
    }
    applyPose(matrix, unit, ground) {
        if (unit.ability.wheatFace < 0) {
            matrix[4] += 2 * ground.x * matrix[0];
            matrix[0] *= -1;
        }
    }
    drawContact(renderer, unit, player, matrix) {
        const A = unit.ability;
        if (
            !A.wheatForm ||
            A.phase !== 'active' ||
            unit.hp <= 0 ||
            unit.stun > 0 ||
            !player.currentClip.startsWith('fire-wheat-')
        ) {
            TRAILS.delete(player);
            return;
        }
        const TIP = player.getSocket('weapon-tip'),
            KEY = `${A.wheatActionId}:${A.wheatSlot}`;
        let trail = TRAILS.get(player);
        if (!trail || trail.key !== KEY) {
            trail = { key: KEY, points: [], progress: -1 };
            TRAILS.set(player, trail);
        }
        if (trail.progress !== A.wheatStageProgress) {
            trail.points.push({
                x: TIP.x * matrix[0] + TIP.y * matrix[2] + matrix[4],
                y: TIP.x * matrix[1] + TIP.y * matrix[3] + matrix[5],
            });
            if (trail.points.length > 5) {
                trail.points.shift();
            }
            trail.progress = A.wheatStageProgress;
        }
        // A short wooden baton trail follows actual native socket samples, not a second
        // attack, projectile, hitbox, or remotely expanding magic wave.
        if (trail.points.length < 2) {
            return;
        }
        const C = renderer.ctx;
        C.save();
        C.globalAlpha = 0.3;
        C.strokeStyle = '#bd8e43';
        C.lineWidth = 1.5 * renderer.pixelRatio;
        C.beginPath();
        trail.points.forEach((point, index) => {
            const X = point.x,
                Y = point.y;
            if (index === 0) {
                C.moveTo(X, Y);
            } else {
                C.lineTo(X, Y);
            }
        });
        C.stroke();
        C.restore();
    }
}
