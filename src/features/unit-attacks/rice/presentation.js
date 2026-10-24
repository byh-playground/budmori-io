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
export class RiceAttackPresentation extends UnitAttackPresentation {
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
