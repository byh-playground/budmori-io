import { unitBodyDefinition } from '../features/unit-body/definition.js';
import { unitArtSpecies } from '../units/species-catalog.js';
import { unitAttackDisplayScale } from '../features/unit-attacks/presentation-geometry.js';
import { applyUnitAttackPose } from '../features/unit-attacks/presentation.js';
import { WORLD_DEPTH_PROJECTION, WORLD_HEIGHT_PROJECTION } from '../vector-sockets.js';

const ART_RADII = new WeakMap();
const MATRIX = [1, 0, 0, 1, 0, 0];
const BOUNDED_EASINGS = new Set(['linear', 'inOutSine', 'outQuad']);

// One disk encloses every authored vertex, expression, morph and clip. The
// native mesh stores already-transformed SVG coordinates in its 11-float layout.
// Rotations may take any angle; keyframe translations/scales stay between their
// endpoints for the accepted easings. Unknown geometry/easing keeps rendering.
function unitArtRadius(compiled, ground) {
    if (ART_RADII.has(compiled)) {
        return ART_RADII.get(compiled);
    }
    const GEOMETRY = compiled.geometry,
        PARTS = compiled.metadata?.parts,
        CLIPS = compiled.metadata?.clips;
    let radius = Infinity;
    if (
        GEOMETRY?.strideFloats === 11 &&
        GEOMETRY.vertices instanceof Float32Array &&
        !GEOMETRY.nonScalingStroke &&
        !GEOMETRY.shaderSurfaces?.length &&
        [0, 2].includes(GEOMETRY.morphCount) &&
        PARTS?.length &&
        CLIPS &&
        Object.values(CLIPS).every((clip) =>
            clip.keyframes.every((frame) => BOUNDED_EASINGS.has(frame.easing || clip.easing)),
        )
    ) {
        const LIMITS = new Map(
            PARTS.map((part) => [part.id, { part, x: 0, y: 0, scale: 1, scaleDelta: 0, rotates: false }]),
        );
        for (const CLIP of Object.values(CLIPS)) {
            for (const FRAME of CLIP.keyframes) {
                for (const [ID, POSE] of Object.entries(FRAME.parts)) {
                    const LIMIT = LIMITS.get(ID);
                    LIMIT.x = Math.max(LIMIT.x, Math.abs(POSE.x || 0));
                    LIMIT.y = Math.max(LIMIT.y, Math.abs(POSE.y || 0));
                    LIMIT.rotates ||= !!POSE.rotation;
                    for (const SCALE of [POSE.scaleX ?? 1, POSE.scaleY ?? 1]) {
                        LIMIT.scale = Math.max(LIMIT.scale, Math.abs(SCALE));
                        LIMIT.scaleDelta = Math.max(LIMIT.scaleDelta, Math.abs(SCALE - 1));
                    }
                }
            }
        }
        // The sole runtime base-pose enlargement is Wheat's T4+ baton. Reserve
        // it even for lower tiers so the cached envelope never depends on state.
        const BATON = LIMITS.get('command-baton');
        if (BATON) {
            BATON.scale *= 1.3;
            BATON.scaleDelta = Math.max(BATON.scaleDelta * 1.3 + 0.3, 0.3);
        }
        radius = 0;
        const VERTICES = GEOMETRY.vertices;
        for (let offset = 0; offset < VERTICES.length; offset += 11) {
            let x = VERTICES[offset],
                y = VERTICES[offset + 1],
                reach =
                    Math.hypot(VERTICES[offset + 6], VERTICES[offset + 7]) +
                    Math.hypot(VERTICES[offset + 8], VERTICES[offset + 9]),
                part = PARTS[VERTICES[offset + 10]];
            while (part) {
                const LIMIT = LIMITS.get(part.id),
                    [PX, PY] = part.pivot,
                    DISTANCE = Math.hypot(x - PX, y - PY),
                    TRANSLATION = Math.hypot(LIMIT.x, LIMIT.y);
                if (LIMIT.rotates) {
                    reach = LIMIT.scale * (DISTANCE + reach) + TRANSLATION;
                    x = PX;
                    y = PY;
                } else {
                    reach = LIMIT.scale * reach + LIMIT.scaleDelta * DISTANCE + TRANSLATION;
                }
                part = part.parent === null ? null : LIMITS.get(part.parent).part;
            }
            radius = Math.max(radius, Math.hypot(x - ground.x, y - ground.y) + reach);
        }
    }
    ART_RADII.set(compiled, radius);
    return radius;
}

// Culling pays only when the player deliberately clips the world. Automatic
// framing keeps the original all-unit path, avoiding a second visibility list
// and per-unit geometry checks in the most common full-army view.
export function unitCullingEnabled(renderer) {
    if (!renderer.manualCamera) {
        return false;
    }
    const ARENA = renderer.cameraArena;
    if (!ARENA) {
        return true;
    }
    const S = renderer.scale,
        X = (renderer.offset[0] + renderer.view[0] + (renderer.shakeX || 0)) * S,
        Y = (renderer.view[1] - renderer.offset[1]) * S,
        RX = ARENA.radiusX * S,
        RY = ARENA.radiusY * WORLD_DEPTH_PROJECTION * S;
    return X - RX < 0 || X + RX > renderer.canvas.width || Y - RY < 0 || Y + RY > renderer.canvas.height;
}

function intersects(renderer, x, y, rx, ry = rx) {
    const PAD = 4 * renderer.pixelRatio;
    return !(
        x + rx < -PAD ||
        x - rx > renderer.canvas.width + PAD ||
        y + ry < -PAD ||
        y - ry > renderer.canvas.height + PAD
    );
}

// This is display-only. Call after prepareUnits so committed melee lunges and
// release easing are already reflected in x/y. Never filter the world roster.
export function unitMayBeVisible(renderer, unit, sim) {
    if (
        renderer.cornAttachmentBodies.has(unit.id) ||
        unit.barleyArmorShredTotal > 0 ||
        (unit.species >= 6 && unit.ability.phase === 'active')
    ) {
        // Attachments/text have independent extents; active melee trails retain
        // their native sample history even across an instantaneous camera move.
        return true;
    }
    const RECORD = renderer.vectorAssets.get(unitArtSpecies(unit));
    if (!RECORD) {
        return true;
    }
    const BODY = unitBodyDefinition(unitArtSpecies(unit)),
        ART_RADIUS = unitArtRadius(RECORD.compiled, BODY.ground);
    if (!Number.isFinite(ART_RADIUS)) {
        return true;
    }
    const S = renderer.scale,
        X = (unit.x + renderer.offset[0] + renderer.view[0] + (renderer.shakeX || 0)) * S,
        GROUND_Y = (renderer.view[1] - WORLD_DEPTH_PROJECTION * unit.y - renderer.offset[1]) * S,
        GROUND_REACH =
            Math.max(unit.size * 0.75, unit.radius * 3.2, unit.radius + 0.3 + 0.12 * (unit.commandBeatLife || 0)) * S +
            (0.1 + 0.003 * (unit.vengeanceStacks || 0)) * S;
    if (intersects(renderer, X, GROUND_Y, GROUND_REACH)) {
        return true;
    }
    const SCALE = unitAttackDisplayScale(renderer, unit, sim.time),
        CLONE_X = unit.isFormationClone ? Math.min(1, (sim.time - unit.cloneBornAt) / 0.5) * 0.35 * S : 0,
        PX = X + CLONE_X,
        PY = GROUND_Y - unit.z * WORLD_HEIGHT_PROJECTION * S,
        // Includes the largest sleeping bar and Z, and the 0.1-world-unit bob.
        INDICATORS = Math.max(32 * renderer.pixelRatio, Math.max(BODY.viewBox[2], BODY.viewBox[3]) * SCALE * 0.7),
        ART = Math.max(ART_RADIUS * SCALE, INDICATORS) + 0.1 * WORLD_HEIGHT_PROJECTION * S;
    if (intersects(renderer, PX, PY, ART)) {
        return true;
    }
    // External combat transforms are the same functions as drawVectorUnit.
    // Union with the neutral envelope covers work/rest paths that skip the pose.
    MATRIX[0] = SCALE;
    MATRIX[1] = 0;
    MATRIX[2] = 0;
    MATRIX[3] = SCALE;
    MATRIX[4] = PX - BODY.ground.x * SCALE;
    MATRIX[5] = PY - BODY.ground.y * SCALE;
    applyUnitAttackPose(MATRIX, unit, BODY.ground);
    if (
        intersects(
            renderer,
            MATRIX[0] * BODY.ground.x + MATRIX[2] * BODY.ground.y + MATRIX[4],
            MATRIX[1] * BODY.ground.x + MATRIX[3] * BODY.ground.y + MATRIX[5],
            ART_RADIUS * (Math.abs(MATRIX[0]) + Math.abs(MATRIX[2])) + INDICATORS,
            ART_RADIUS * (Math.abs(MATRIX[1]) + Math.abs(MATRIX[3])) + INDICATORS + 0.1 * S,
        )
    ) {
        return true;
    }
    if (intersects(renderer, X, PY - unit.height * WORLD_HEIGHT_PROJECTION * S, GROUND_REACH)) {
        return true;
    }
    const A = unit.ability;
    if (A.walnutImpactLife > 0) {
        return intersects(
            renderer,
            (A.walnutPointX + renderer.offset[0] + renderer.view[0] + (renderer.shakeX || 0)) * S,
            (renderer.view[1] - WORLD_DEPTH_PROJECTION * A.walnutPointY - renderer.offset[1]) * S,
            Math.max(4 * renderer.pixelRatio, unit.radius * S * 0.4) + 2 * renderer.pixelRatio,
        );
    }
    return false;
}
