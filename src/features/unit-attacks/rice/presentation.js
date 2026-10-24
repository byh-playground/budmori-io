import { unitBodyDefinition, unitDisplayScale } from '../../unit-body/definition.js';
import { WORLD_DEPTH_PROJECTION } from '../../../vector-sockets.js';
import { UnitAttackPresentation } from '../presentation-base.js';

// The committed finite melee schedule is the only presentation clock.
export function updateRicePresentation(output, action, phase, elapsed) {
    const RECORD = action?.riceAttack,
        TICK = phase === 'active' ? elapsed * 20 : 0,
        INDEX = RECORD ? RECORD.shots.findIndex((shot) => TICK <= shot.tick) : -1,
        SLOT = RECORD ? (INDEX < 0 ? RECORD.shots.length - 1 : INDEX) : 0,
        SHOT = RECORD?.shots[SLOT],
        START = SLOT > 0 ? RECORD.shots[SLOT - 1].tick : 0;
    output.riceForm = RECORD?.form || 0;
    output.riceActionId = RECORD?.id || action?.id || 0;
    output.riceSlot = SLOT;
    output.riceStage = phase === 'active' ? SHOT?.stage || 'slash' : phase;
    output.ricePreviousStage = SLOT > 0 ? RECORD.shots[SLOT - 1].stage : 'ready';
    output.riceFirstStage = RECORD?.shots[0]?.stage || 'slash';
    output.riceLastStage = RECORD?.shots.at(-1)?.stage || 'slash';
    output.riceStageProgress = SHOT ? Math.max(0, Math.min(1, (TICK - START) / (SHOT.tick - START))) : 0;
    output.riceWindupDuration = RECORD?.windupSeconds || 0.42;
    output.riceRecoveryDuration = RECORD?.recoverySeconds || 0.62;
    output.ricePointX = RECORD?.point.x || 0;
    output.ricePointY = RECORD?.point.y || 0;
}

const TRAILS = new WeakMap();
const CONTACT_SOCKETS = new WeakMap();
// Read the endpoint through the pinned native player once per asset/stage.
// This player is never drawn and is disposed immediately; live draw poses are
// still driven solely by the actual committed action's phase clock.
function contactSocket(record, stage) {
    let cache = CONTACT_SOCKETS.get(record);
    if (!cache) {
        cache = new Map();
        CONTACT_SOCKETS.set(record, cache);
    }
    if (!cache.has(stage)) {
        const CLIP = Object.keys(record.compiled.metadata.clips).find(
            (name) => name.startsWith('fire-rice-') && name.endsWith(`-${stage}`),
        );
        const PLAYER = record.asset.createPlayer({ clip: CLIP, startedAtMs: 0 });
        try {
            PLAYER.seek(1000);
            cache.set(stage, PLAYER.getSocket('weapon-tip'));
        } finally {
            PLAYER.dispose();
        }
    }
    return cache.get(stage);
}
const SMOOTH = (value) => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, value)))) / 2;

export class RiceAttackPresentation extends UnitAttackPresentation {
    contactOffset(renderer, unit, stage, time) {
        const RECORD = renderer.vectorAssets.get(6);
        if (!RECORD) {
            return { x: 0, y: 0 };
        }
        const BODY = unitBodyDefinition(6),
            TIP = contactSocket(RECORD, stage),
            GIANT = unit.giantUntil > time ? 3 : 1,
            SCALE =
                unitDisplayScale(BODY, unit.bodyScale, renderer.scale, renderer.minimumUnitPixels() * GIANT) *
                (1 +
                    Math.sin((time - unit.giantEndedAt) * 30) *
                        0.12 *
                        Math.max(0, 1 - (time - unit.giantEndedAt) / 0.35)),
            FACE = unit.ability.ricePointX < unit.x ? -1 : 1,
            POINT = renderer.project(unit.ability.ricePointX, unit.ability.ricePointY, 0),
            ORIGIN = renderer.project(unit.x, unit.y, unit.z),
            DX = POINT.x - ORIGIN.x - FACE * (TIP.x - BODY.ground.x) * SCALE,
            DY = POINT.y - ORIGIN.y - (TIP.y - BODY.ground.y) * SCALE;
        return { x: DX / renderer.scale, y: -DY / (renderer.scale * WORLD_DEPTH_PROJECTION) };
    }
    groundOffset(renderer, unit, time) {
        const A = unit.ability;
        if (!A.riceForm || unit.hp <= 0 || unit.stun > 0) {
            return null;
        }
        if (A.phase === 'windup') {
            return { x: 0, y: 0 };
        }
        if (A.phase === 'recover') {
            const END = this.contactOffset(renderer, unit, A.riceLastStage, time),
                LEFT = 1 - SMOOTH(A.elapsed / A.riceRecoveryDuration);
            return { x: END.x * LEFT, y: END.y * LEFT };
        }
        if (A.phase !== 'active') {
            return null;
        }
        const START =
                A.ricePreviousStage === 'ready'
                    ? { x: 0, y: 0 }
                    : this.contactOffset(renderer, unit, A.ricePreviousStage, time),
            END = this.contactOffset(renderer, unit, A.riceStage, time),
            T = SMOOTH(A.riceStageProgress);
        return { x: START.x + (END.x - START.x) * T, y: START.y + (END.y - START.y) * T };
    }

    windupMotion(unit) {
        return `windup-rice-${unit.ability.riceFirstStage}`;
    }
    activeMotion(unit) {
        return `fire-rice-${unit.ability.ricePreviousStage}-${unit.ability.riceStage}`;
    }
    recoverMotion(unit) {
        return `recover-rice-${unit.ability.riceLastStage}`;
    }
    clipElapsedMs(unit, motion) {
        if (!motion.includes('-rice-')) {
            return null;
        }
        const A = unit.ability;
        return A.phase === 'active'
            ? A.riceStageProgress * 1000
            : (A.elapsed / (A.phase === 'windup' ? A.riceWindupDuration : A.riceRecoveryDuration)) * 1000;
    }
    applyPose(matrix, unit, ground) {
        if (unit.ability.ricePointX < unit.x) {
            matrix[4] += 2 * ground.x * matrix[0];
            matrix[0] *= -1;
        }
    }
    drawContact(renderer, unit, player, matrix) {
        const A = unit.ability;
        if (
            !A.riceForm ||
            A.phase !== 'active' ||
            unit.hp <= 0 ||
            unit.stun > 0 ||
            !player.currentClip.startsWith('fire-rice-')
        ) {
            TRAILS.delete(player);
            return;
        }
        const TIP = player.getSocket('weapon-tip'),
            KEY = `${A.riceActionId}:${A.riceSlot}`;
        let trail = TRAILS.get(player);
        if (!trail || trail.key !== KEY) {
            trail = { key: KEY, points: [], progress: -1 };
            TRAILS.set(player, trail);
        }
        if (trail.progress !== A.riceStageProgress) {
            trail.points.push({ x: TIP.x, y: TIP.y });
            if (trail.points.length > 5) {
                trail.points.shift();
            }
            trail.progress = A.riceStageProgress;
        }
        // A small blade trail follows actual native socket samples, not a second
        // attack, projectile, hitbox, or remotely expanding magical slash.
        if (trail.points.length < 2) {
            return;
        }
        const C = renderer.ctx;
        C.save();
        C.globalAlpha = 0.55;
        C.strokeStyle = '#f4dfa0';
        C.lineWidth = 2 * renderer.pixelRatio;
        C.beginPath();
        trail.points.forEach((point, index) => {
            const X = point.x * matrix[0] + point.y * matrix[2] + matrix[4],
                Y = point.x * matrix[1] + point.y * matrix[3] + matrix[5];
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
