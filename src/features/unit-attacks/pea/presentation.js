import { UnitAttackPresentation } from '../presentation-base.js';

// One body, one grounded transform. These accents never create actors or damage.
// The model owns the contact/rebound/charge stage and the renderer follows it.
export class PeaAttackPresentation extends UnitAttackPresentation {
    applyGroundedPose(matrix, unit, ground) {
        const ABILITY = unit.ability,
            FORM = ABILITY.peaForm,
            PHASE = ABILITY.phase,
            STAGE = ABILITY.peaStage,
            PROGRESS = Math.max(0, Math.min(1, ABILITY.peaStageProgress || 0)),
            DIRECTION = Math.cos(unit.angle || 0) >= 0 ? 1 : -1;
        if (FORM < 2 || !['windup', 'active', 'recover'].includes(PHASE)) {
            return;
        }
        let squash, lean;
        if (PHASE === 'windup') {
            const WINDUP = Math.min(1, ABILITY.elapsed / (ABILITY.peaWindupDuration || 0.28));
            squash = WINDUP * (FORM === 4 ? 0.42 : FORM === 2 ? 0.28 : 0.18);
            lean = -DIRECTION * WINDUP * (FORM === 4 ? 0.2 : 0.08);
        } else if (PHASE === 'active') {
            if (FORM === 3) {
                // Two alternating rolls remain on the target's front face.
                lean = DIRECTION * Math.sin(PROGRESS * Math.PI) * (ABILITY.peaSlot % 2 ? -0.65 : 0.65);
                squash = 0.12 * Math.sin(PROGRESS * Math.PI);
            } else if (STAGE === 'charge') {
                squash = 0.42 * PROGRESS;
                lean = -DIRECTION * 0.16 * PROGRESS;
            } else if (STAGE === 'rebound') {
                squash = -0.12 * Math.sin(PROGRESS * Math.PI);
                lean = -DIRECTION * 0.25 * Math.sin(PROGRESS * Math.PI);
            } else {
                squash = FORM === 4 ? -0.22 : FORM === 2 ? -0.16 : -0.1;
                lean = DIRECTION * (FORM === 4 ? 0.32 : 0.18);
            }
        } else {
            const SETTLE = Math.max(0, 1 - ABILITY.elapsed / 0.18);
            squash = (FORM === 4 || FORM === 6 ? 0.25 : 0.12) * SETTLE;
            lean = DIRECTION * 0.12 * SETTLE;
        }
        const SCALE = matrix[0],
            X = matrix[4] + ground.x * SCALE,
            Y = matrix[5] + ground.y * SCALE;
        // Rotate around the grounded baseline, compensating its lowest corner.
        // No model z displacement, airborne clip, clone, or secondary body is used.
        const ROTATION = FORM === 3 && PHASE === 'active' ? lean : 0,
            COS = Math.cos(ROTATION),
            SIN = Math.sin(ROTATION),
            SCALE_X = SCALE * (1 + squash * 0.65),
            SCALE_Y = SCALE * (1 - squash);
        matrix[0] = COS * SCALE_X;
        matrix[1] = SIN * SCALE_X;
        matrix[2] = ROTATION ? -SIN * SCALE_Y : SCALE * lean;
        matrix[3] = COS * SCALE_Y;
        matrix[4] = X - ground.x * matrix[0] - ground.y * matrix[2];
        matrix[5] = Y - ground.x * matrix[1] - ground.y * matrix[3] - Math.abs(SIN) * ground.x * SCALE_X;
    }
}
