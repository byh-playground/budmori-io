import { unitBodyDefinition, unitDisplayScale } from '../unit-body/definition.js';
import { unitArtSpecies } from '../../units/species-catalog.js';

// bodyScale already includes the body's profile and giant multiplier. The
// minimum pixel radius is presentation-only and must never multiply it again.
export function unitAttackDisplayScale(renderer, unit, time) {
    const BODY = unitBodyDefinition(unitArtSpecies(unit)),
        GIANT = unit.giantUntil > time ? (unit.giantSizeMultiplier ?? 3) : 1,
        ENDED_AT = unit.giantEndedAt ?? -10,
        REBOUND = 1 + Math.sin((time - ENDED_AT) * 30) * 0.12 * Math.max(0, 1 - (time - ENDED_AT) / 0.35);
    const SOURCE_BODY = unitBodyDefinition(unit.species),
        ART_SCALE =
            (unit.bodyScale * Math.max(SOURCE_BODY.viewBox[2], SOURCE_BODY.viewBox[3])) /
            Math.max(BODY.viewBox[2], BODY.viewBox[3]);
    return unitDisplayScale(BODY, ART_SCALE, renderer.scale, renderer.minimumUnitPixels() * GIANT) * REBOUND;
}

// Bound the committed contact endpoint before its active/recovery easing.
// Clamping an already-eased offset would flatten most of the motion, then snap
// home at the end. Coordinates here are world-plane units, not screen pixels.
export function unitAttackGroundOffset(unit, x, y) {
    const LIMIT = unit.attackGroundOffsetLimit,
        DISTANCE = Math.hypot(x, y),
        SCALE = LIMIT != null && DISTANCE > LIMIT ? LIMIT / DISTANCE : 1;
    return { x: x * SCALE, y: y * SCALE };
}
