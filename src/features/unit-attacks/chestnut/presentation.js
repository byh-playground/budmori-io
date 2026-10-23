import { UnitAttackPresentation } from '../presentation-base.js';

// Accents follow the actual finite emission slots, not a separate attack clock.
export class ChestnutAttackPresentation extends UnitAttackPresentation {
    applyPose(matrix, unit, ground) {
        const A = unit.ability,
            FORM = A.chestnutForm,
            STAGE = A.chestnutStage,
            DIRECTION = Math.cos(unit.angle || 0) >= 0 ? 1 : -1,
            Q = Math.max(0, Math.min(1, A.chestnutStageProgress || 0));
        if (!FORM || !['windup', 'active', 'recover'].includes(A.phase)) {
            return;
        }
        let squash,
            lean = 0;
        if (A.phase === 'windup') {
            const WINDUP = Math.min(1, A.elapsed / A.chestnutWindupDuration);
            squash = (FORM === 6 ? 0.28 : 0.16) * WINDUP;
            lean = -0.12 * WINDUP;
        } else {
            const PULSE = Math.sin(Math.PI * Q);
            switch (STAGE) {
                case 'cross-left':
                    lean = -0.3 * PULSE;
                    squash = -0.08 * PULSE;
                    break;
                case 'cross-right':
                    lean = 0.3 * PULSE;
                    squash = -0.08 * PULSE;
                    break;
                case 'fan':
                case 'spread':
                    squash = 0.18 * PULSE;
                    break;
                case 'converge':
                    squash = -0.18 * PULSE;
                    lean = 0.12 * PULSE;
                    break;
                case 'central':
                    squash = -0.24 * PULSE;
                    lean = 0.25 * PULSE;
                    break;
                case 'thrust':
                    lean = 0.16 * PULSE;
                    squash = -0.08 * PULSE;
                    break;
                default:
                    squash = 0.06 * Math.max(0, 1 - A.elapsed / 0.65);
            }
        }
        const SCALE = matrix[0],
            X = matrix[4] + ground.x * SCALE,
            Y = matrix[5] + ground.y * SCALE;
        matrix[0] = SCALE * (1 + squash * 0.6);
        matrix[2] = SCALE * lean * DIRECTION;
        matrix[3] = SCALE * (1 - squash);
        matrix[4] = X - ground.x * matrix[0] - ground.y * matrix[2];
        matrix[5] = Y - ground.y * matrix[3];
    }
}
