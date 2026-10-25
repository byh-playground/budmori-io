import { FormationPresentation, bodyScale, stroke } from '../presentation-base.js';
const BEAM_POINTS = new WeakMap();

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

export class UfoPresentation extends FormationPresentation {
    draw(renderer, effect) {
        const ENTER = Math.min(1, effect.age / 0.5),
            EXIT = Math.max(0, effect.age - 0.5 - effect.duration) / 0.5,
            Z = effect.z + (1 - ENTER) * (1 - ENTER) * 4 + EXIT * 4 + Math.sin(effect.age * 5) * 0.08,
            P = renderer.project(effect.x, effect.y, Z),
            BODY_RADIUS = Math.max(0.2, effect.sizeRadius || effect.bodyRadius || 0.3),
            // The saucer's widest ellipse has a 0.72 radius, hence a 1.44 full width.
            BODY_SCALE = effect.visualWidth > 0 ? effect.visualWidth / 1.44 : Math.max(1, BODY_RADIUS * 2.6),
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
            const POINTS = beamPointsFor(effect);
            POINTS[0][0] = effect.x;
            POINTS[0][1] = effect.y;
            POINTS[0][2] = Z - 0.15;
            POINTS[1][0] = effect.x;
            POINTS[1][1] = effect.y;
            POINTS[1][2] = effect.beamTargetZ;
            const BEAM = bodyScale(effect.bodyRadius);
            const WIDTH = effect.beamWidth || 0.11 * BEAM;
            stroke(renderer, POINTS, '#74f5db44', effect.beamWidth ? WIDTH * 1.15 : 0.33 * BEAM);
            stroke(renderer, POINTS, '#afffe6cc', WIDTH);
            stroke(renderer, POINTS, '#f4fff3', effect.beamWidth ? WIDTH * 0.32 : 0.035 * BEAM);
            if (effect.beamWidth) {
                renderer.groundEllipse(effect.x, effect.y, WIDTH / 2, WIDTH / 2, '#afffe633');
                renderer.ring(effect.x, effect.y, WIDTH / 2, '#afffe6cc', 0.035);
            }
            if (PULSE_ACTIVE) {
                renderer.ring(effect.x, effect.y, 0.25 + PULSE_AGE * 2, '#bfffd7aa', 0.04);
            }
        }
        // Draw the shared saucer above the beam: a wide round cap must not erase its silhouette.
        renderer.ellipse(P.x, P.y, S * 0.72, S * 0.19, '#718695');
        renderer.ellipse(P.x, P.y - S * 0.13, S * 0.34, S * 0.25, '#b9e6e2bb');
        renderer.ellipse(P.x, P.y + S * 0.12, S * 0.26, S * 0.065, '#a0f8e4');
        for (let i = 0; i < 5; i++) {
            renderer.ellipse(P.x + (i - 2) * S * 0.23, P.y + S * 0.04, S * 0.035, S * 0.025, '#e9f8b4');
        }
        C.globalAlpha = 1;
    }
}
