// Actor-independent presentation of the model's committed cast clock. The model
// releases effects at prepare -> recover; sampling a pose never releases them.
const CLAMP = (value) => Math.max(0, Math.min(1, value));
const EASE = (value) => {
    const T = CLAMP(value);
    return T * T * (3 - 2 * T);
};

export function visibleSkillCast(actor) {
    const CAST = actor.skillCast;
    return actor.hp > 0 && CAST && ['prepare', 'release', 'recover'].includes(CAST.phase) ? CAST : null;
}

// All translations are in the caller's coordinate units, relative to radius.
// Missing limbs are deliberately not synthesized. A body-less renderer can use
// body as a ground-pivot matrix overlay instead of calling setBasePose('body').
export function sampleSkillCastPose(cast, radius = 1) {
    const PROGRESS = CLAMP(Math.max(0, cast.elapsed || 0) / Math.max(0.001, cast.duration || 0.001)),
        PREPARING = cast.phase === 'prepare',
        GATHER = PREPARING ? EASE(PROGRESS / 0.7) : 0,
        LIFT = PREPARING ? EASE((PROGRESS - 0.7) / 0.3) : 1,
        SETTLE = cast.phase === 'recover' ? EASE(PROGRESS) : 0,
        HOLD = 1 - SETTLE,
        CROUCH = GATHER * (1 - LIFT),
        RISE = LIFT * HOLD,
        BODY_Y = radius * (0.12 * CROUCH - 0.1 * RISE);
    return {
        body: {
            x: 0,
            y: BODY_Y,
            rotation: 0,
            scaleX: 1 + 0.08 * CROUCH - 0.035 * RISE,
            scaleY: 1 - 0.1 * CROUCH + 0.075 * RISE,
        },
        hands: {
            'arm-left': { x: radius * (-0.12 * CROUCH - 0.25 * RISE), y: -radius * (0.2 * CROUCH + 0.85 * RISE) },
            'arm-right': { x: radius * (0.12 * CROUCH + 0.25 * RISE), y: -radius * (0.2 * CROUCH + 0.85 * RISE) },
        },
        expression: PREPARING ? 'focused' : SETTLE < 0.65 ? 'attack' : 'neutral',
        releasePulse: PREPARING ? 0 : CLAMP(1 - Math.max(0, cast.elapsed || 0) / 0.16),
    };
}
