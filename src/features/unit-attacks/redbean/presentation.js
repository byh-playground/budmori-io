import { UnitAttackPresentation } from '../presentation-base.js';

// The real body's transform follows the model's leg and flight progress; no extra actor or hitbox.
export class RedbeanAttackPresentation extends UnitAttackPresentation {
    applyPose(matrix, unit, ground) {
        const A = unit.ability,
            FORM = A.redbeanForm,
            PHASE = A.phase,
            Q = Math.max(0, Math.min(1, A.redbeanStageProgress || 0)),
            LEG = A.redbeanLeg || 0,
            DIRECTION = Math.cos(unit.angle || 0) >= 0 ? 1 : -1;
        if (!FORM || !['windup', 'active', 'recover'].includes(PHASE)) {
            return;
        }
        let rotation = 0,
            squash = 0;
        if (PHASE === 'windup') {
            squash = 0.25 * Math.min(1, A.elapsed / A.redbeanWindupDuration);
        } else if (PHASE === 'recover' || A.redbeanStage === 'ground') {
            squash = 0.22 * Math.max(0, 1 - A.elapsed / 0.2);
        } else {
            switch (FORM) {
                case 1:
                    rotation = DIRECTION * 0.18 * Math.sin(Math.PI * Q);
                    squash = -0.08 * Math.sin(Math.PI * Q);
                    break;
                case 2:
                    rotation = DIRECTION * Math.PI * 2 * Q;
                    break;
                case 3:
                    rotation = DIRECTION * (LEG ? -0.45 : 0.3) * Math.sin(Math.PI * Q);
                    squash = -0.16 * Math.sin(Math.PI * Q);
                    break;
                case 4:
                    rotation = DIRECTION * (LEG ? -0.65 : 0.3) * Math.sin(Math.PI * Q);
                    squash = -0.1 * Math.sin(Math.PI * Q);
                    break;
                case 5:
                    rotation = LEG === 0 ? DIRECTION * Math.PI * 2 * Q : DIRECTION * 0.22 * Math.sin(Math.PI * Q);
                    squash = LEG === 1 ? -0.2 * Math.sin(Math.PI * Q) : 0;
                    break;
                case 6:
                    rotation =
                        LEG === 1
                            ? -DIRECTION * Math.PI * 2 * Q
                            : DIRECTION * (LEG === 2 ? 0.45 : 0.15) * Math.sin(Math.PI * Q);
                    squash = LEG === 2 ? -0.22 * Math.sin(Math.PI * Q) : 0.08 * Math.sin(Math.PI * Q);
                    break;
            }
        }
        const SCALE = matrix[0],
            CENTER = { x: ground.x, y: ground.y - 100 },
            X = matrix[4] + CENTER.x * SCALE,
            Y = matrix[5] + CENTER.y * SCALE,
            COS = Math.cos(rotation),
            SIN = Math.sin(rotation),
            SX = SCALE * (1 + squash * 0.6),
            SY = SCALE * (1 - squash);
        matrix[0] = COS * SX;
        matrix[1] = SIN * SX;
        matrix[2] = -SIN * SY;
        matrix[3] = COS * SY;
        matrix[4] = X - CENTER.x * matrix[0] - CENTER.y * matrix[2];
        matrix[5] = Y - CENTER.x * matrix[1] - CENTER.y * matrix[3];
    }
}
