import { FormationPresentation, bodyScale, stroke } from '../presentation-base.js';
import { WORLD_HEIGHT_PROJECTION, WORLD_DEPTH_PROJECTION } from '../../../vector-sockets.js';
const BEAM_POINTS = new WeakMap();
const UFO_VISUAL = Object.freeze({
    entranceSeconds: 0.5,
    travelHeight: 4,
    minimumClearance: 2,
    saucerClearance: 0.95,
    wideBeamClearance: 1.75,
    nozzleOffset: 0.12,
    skyPadding: 3,
});

function beamPointsFor(effect) {
    let points = BEAM_POINTS.get(effect);
    if (!points) {
        points = [
            [0, 0, 0],
            [0, 0, 0],
        ];
        BEAM_POINTS.set(effect, points);
    }
    return points;
}

// A model's hover point is only two world units above its target. The native saucer grows
// with the body it follows, so reserve visual clearance for that saucer instead of burying
// the entire beam under its nozzle. Targeting, beam width and hit height remain model-owned.
function ufoGeometry(effect) {
    const BODY_RADIUS = Math.max(0.2, effect.sizeRadius || effect.bodyRadius || 0.3),
        BODY_SCALE = effect.visualWidth > 0 ? effect.visualWidth / 1.44 : Math.max(1, bodyScale(BODY_RADIUS) * 1.25),
        CONTACT_Z = effect.beamTarget === true ? effect.beamTargetZ : effect.targetZ,
        CLEARANCE = Math.max(
            UFO_VISUAL.minimumClearance,
            BODY_SCALE * UFO_VISUAL.saucerClearance,
            (effect.beamWidth || 0) * UFO_VISUAL.wideBeamClearance,
        ),
        HOVER_Z = Math.max(effect.z, effect.targetZ + CLEARANCE);
    return { bodyScale: BODY_SCALE, contactZ: CONTACT_Z, hoverZ: HOVER_Z };
}

export class UfoPresentation extends FormationPresentation {
    includeBounds(effect, bounds) {
        const GEOMETRY = ufoGeometry(effect),
            HALF_WIDTH = Math.max(GEOMETRY.bodyScale * 0.72, (effect.beamWidth || 0) * 0.7) + 1;
        bounds.left = Math.min(bounds.left, effect.x - HALF_WIDTH);
        bounds.right = Math.max(bounds.right, effect.x + HALF_WIDTH);
        // Reserve the full entrance/exit envelope for this floor. Camera framing must not
        // pump with each pulse or crop the raised emitter when the target is a giant boss.
        bounds.top = Math.max(
            bounds.top,
            effect.y * WORLD_DEPTH_PROJECTION +
                (GEOMETRY.hoverZ + UFO_VISUAL.travelHeight) * WORLD_HEIGHT_PROJECTION +
                GEOMETRY.bodyScale * 0.4 +
                UFO_VISUAL.skyPadding,
        );
    }
    draw(renderer, effect) {
        const ENTER = Math.min(1, effect.age / UFO_VISUAL.entranceSeconds),
            EXIT = Math.max(0, effect.age - UFO_VISUAL.entranceSeconds - effect.duration) / 0.5,
            GEOMETRY = ufoGeometry(effect),
            Z =
                GEOMETRY.hoverZ +
                (1 - ENTER) * (1 - ENTER) * UFO_VISUAL.travelHeight +
                EXIT * UFO_VISUAL.travelHeight +
                Math.sin(effect.age * 5) * 0.08,
            P = renderer.project(effect.x, effect.y, Z),
            BODY_SCALE = GEOMETRY.bodyScale,
            S = renderer.scale * BODY_SCALE * Math.max(0.08, ENTER) * (1 - Math.min(1, EXIT)),
            C = renderer.ctx;
        const PULSE_AGE = effect.age - effect.lastPulse,
            CHARGING = effect.age > 0.3 && ENTER < 1;
        if (CHARGING || (effect.age >= 0.5 && EXIT === 0)) {
            renderer.ellipse(P.x, P.y + S * 0.15, S * (0.1 + 0.05 * Math.sin(effect.age * 12)), S * 0.07, '#afffeb88');
        }
        const BEAM_ACTIVE = effect.beamTarget === true && effect.age > 0.5 && EXIT === 0,
            PULSE_ACTIVE = PULSE_AGE >= 0 && PULSE_AGE < 0.13;
        if (BEAM_ACTIVE) {
            const POINTS = beamPointsFor(effect),
                BEAM = bodyScale(effect.bodyRadius),
                WIDTH = effect.beamWidth || 0.11 * BEAM,
                NOZZLE_Z = Z - (BODY_SCALE * UFO_VISUAL.nozzleOffset) / WORLD_HEIGHT_PROJECTION;
            POINTS[0][0] = effect.x;
            POINTS[0][1] = effect.y;
            POINTS[0][2] = NOZZLE_Z;
            POINTS[1][0] = effect.x;
            POINTS[1][1] = effect.y;
            POINTS[1][2] = GEOMETRY.contactZ;
            stroke(renderer, POINTS, '#74f5db44', effect.beamWidth ? WIDTH * 1.15 : 0.33 * BEAM);
            stroke(renderer, POINTS, '#afffe6cc', WIDTH);
            stroke(renderer, POINTS, '#f4fff3', effect.beamWidth ? WIDTH * 0.32 : 0.035 * BEAM);
            // Flow is visual-only and follows the same continuous emitter-to-contact segment.
            C.fillStyle = '#eafff4';
            for (let index = 0; index < 5; index++) {
                const T = (effect.age * 1.7 + index / 5) % 1,
                    DOT = renderer.project(
                        effect.x + Math.sin(index * 2.4 + effect.id) * WIDTH * 0.2,
                        effect.y,
                        NOZZLE_Z + (GEOMETRY.contactZ - NOZZLE_Z) * T,
                    ),
                    SIZE = Math.max(renderer.pixelRatio, renderer.scale * WIDTH * 0.045);
                C.fillRect(DOT.x - SIZE / 2, DOT.y - SIZE, SIZE, SIZE * 2);
            }
            const IMPACT = renderer.project(effect.x, effect.y, GEOMETRY.contactZ),
                FLARE = renderer.scale * WIDTH * (PULSE_ACTIVE ? 0.7 : 0.5);
            renderer.ellipse(IMPACT.x, IMPACT.y, FLARE, FLARE * 0.3, '#afffe677');
            renderer.ellipse(IMPACT.x, IMPACT.y, FLARE * 0.42, FLARE * 0.16, '#f4fff3');
            if (effect.beamWidth) {
                // The beam's ground footprint still shows the horizontal damage radius below its raised contact glow.
                renderer.groundEllipse(effect.x, effect.y, WIDTH / 2, WIDTH / 2, '#afffe633');
                renderer.ring(effect.x, effect.y, WIDTH / 2, '#afffe6cc', 0.035);
                renderer.ring(effect.x, effect.y, WIDTH / 2, '#afffe6cc', 0.035, 0, Math.PI * 2, GEOMETRY.contactZ);
            }
            if (PULSE_ACTIVE) {
                renderer.ring(
                    effect.x,
                    effect.y,
                    WIDTH / 2 + PULSE_AGE * 2,
                    '#bfffd7aa',
                    0.04,
                    0,
                    Math.PI * 2,
                    GEOMETRY.contactZ,
                );
            }
        }
        // Draw the shared saucer above the beam. Its nozzle and beam start use the same screen anchor.
        renderer.ellipse(P.x, P.y, S * 0.72, S * 0.19, '#718695');
        renderer.ellipse(P.x, P.y - S * 0.13, S * 0.34, S * 0.25, '#b9e6e2bb');
        renderer.ellipse(P.x, P.y + S * 0.12, S * 0.26, S * 0.065, '#a0f8e4');
        for (let i = 0; i < 5; i++) {
            renderer.ellipse(P.x + (i - 2) * S * 0.23, P.y + S * 0.04, S * 0.035, S * 0.025, '#e9f8b4');
        }
        C.globalAlpha = 1;
    }
}
