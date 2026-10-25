import { unitBodyDefinition, unitDisplayScale } from '../unit-body/definition.js';

// bodyScale already includes the body's profile and giant multiplier. The
// minimum pixel radius is presentation-only and must never multiply it again.
export function unitAttackDisplayScale(renderer, unit, time) {
    const BODY = unitBodyDefinition(unit.species),
        GIANT = unit.giantUntil > time ? (unit.giantSizeMultiplier ?? 3) : 1,
        ENDED_AT = unit.giantEndedAt ?? -10,
        REBOUND = 1 + Math.sin((time - ENDED_AT) * 30) * 0.12 * Math.max(0, 1 - (time - ENDED_AT) / 0.35);
    return unitDisplayScale(BODY, unit.bodyScale, renderer.scale, renderer.minimumUnitPixels() * GIANT) * REBOUND;
}
