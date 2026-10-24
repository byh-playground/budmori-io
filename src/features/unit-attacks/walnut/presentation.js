import { UnitAttackPresentation } from '../presentation-base.js';

// Derive the displayed stage from the committed combat record. No second attack
// schedule or preview-only actor: each hammer contact lands on its real slot tick.
export function updateWalnutPresentation(output, action, phase, elapsed) {
    const RECORD = action?.walnutAttack,
        TICK = phase === 'active' ? elapsed * 20 : 0,
        INDEX = RECORD ? RECORD.shots.findIndex((shot) => TICK <= shot.tick) : -1,
        SLOT = RECORD ? (INDEX < 0 ? RECORD.shots.length - 1 : INDEX) : 0,
        SHOT = RECORD?.shots[SLOT],
        START = SLOT > 0 ? RECORD.shots[SLOT - 1].tick : 0;
    output.walnutForm = RECORD?.form || 0;
    output.walnutActionId = action?.id || 0;
    output.walnutSlot = SLOT;
    output.walnutStage = phase === 'active' ? SHOT?.stage || 'down' : phase;
    output.walnutFirstStage = RECORD?.shots[0]?.stage || 'down';
    output.walnutLastStage = RECORD?.shots.at(-1)?.stage || 'down';
    output.walnutStageProgress = SHOT ? Math.max(0, Math.min(1, (TICK - START) / (SHOT.tick - START))) : 0;
    output.walnutMotionTick = RECORD?.motionTick || 0;
    output.walnutWindupDuration = RECORD?.windupSeconds || 0.5;
    output.walnutRecoveryDuration = RECORD?.recoverySeconds || 1;
    output.walnutPointX = RECORD?.point.x || 0;
    output.walnutPointY = RECORD?.point.y || 0;
    output.walnutRawBudget = RECORD?.rawBudget || 0;
    const LOCAL = RECORD?.shots.find((shot) => shot.stage === 'impact' || shot.stage === 'wedge'),
        AGE = LOCAL
            ? phase === 'active'
                ? (TICK - LOCAL.tick) / 20
                : phase === 'recover'
                  ? elapsed + RECORD.durationSeconds - LOCAL.tick / 20
                  : -1
            : -1;
    output.walnutImpactLife = AGE >= 0 && AGE < 0.18 ? 1 - AGE / 0.18 : 0;
}

export class WalnutAttackPresentation extends UnitAttackPresentation {
    windupMotion(unit) {
        return `windup-walnut-${unit.ability.walnutFirstStage}`;
    }
    activeMotion(unit) {
        const A = unit.ability;
        return `fire-walnut-${A.walnutStage === 'down' && A.walnutForm === 6 ? 'strong-down' : A.walnutStage}`;
    }
    recoverMotion(unit) {
        return `recover-walnut-${unit.ability.walnutLastStage === 'up' ? 'up' : 'down'}`;
    }
    clipElapsedMs(unit, motion) {
        if (!motion.includes('-walnut-')) {
            return null;
        }
        const A = unit.ability;
        return A.phase === 'active'
            ? A.walnutStageProgress * 1000
            : (A.elapsed / (A.phase === 'windup' ? A.walnutWindupDuration : A.walnutRecoveryDuration)) * 1000;
    }
    applyPose(matrix, unit, ground) {
        // Hammer art faces right; face the committed target, not a later target.
        if (unit.ability.walnutPointX < unit.x) {
            matrix[4] += 2 * ground.x * matrix[0];
            matrix[0] *= -1;
        }
    }
    drawContact(renderer, unit) {
        const A = unit.ability;
        if (!A.walnutForm || !A.walnutImpactLife || unit.hp <= 0 || unit.stun > 0) {
            return;
        }
        const C = renderer.ctx,
            P = renderer.project(A.walnutPointX, A.walnutPointY, 0),
            R = Math.max(4 * renderer.pixelRatio, unit.radius * renderer.scale * 0.4);
        C.save();
        C.globalAlpha = A.walnutImpactLife;
        C.strokeStyle = A.walnutRawBudget > 0 ? '#ffe298' : '#bc8d52';
        C.lineWidth = 2 * renderer.pixelRatio;
        // A stationary contact crack, not an expanding ring or traveling wave.
        C.beginPath();
        for (let i = 0; i < (A.walnutForm === 6 ? 5 : 3); i++) {
            const ANGLE = (i / (A.walnutForm === 6 ? 5 : 3)) * Math.PI * 2;
            C.moveTo(P.x, P.y);
            C.lineTo(P.x + Math.cos(ANGLE) * R * 0.5, P.y + Math.sin(ANGLE) * R * 0.25);
            C.lineTo(P.x + Math.cos(ANGLE + 0.25) * R, P.y + Math.sin(ANGLE + 0.25) * R * 0.5);
        }
        C.stroke();
        C.restore();
    }
}
