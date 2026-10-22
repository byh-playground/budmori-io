import { FormationPresentation, bodyScale, cloud, stroke } from '../presentation-base.js';
const POINT_BUFFERS = new WeakMap();

function pointBuffersFor(effect) {
    let buffers = POINT_BUFFERS.get(effect);
    if (!buffers) {
        const POINT = () => [0, 0, 0];
        buffers = {
            arcs: Array.from({ length: 3 }, () => Array.from({ length: 13 }, POINT)),
            intro: Array.from({ length: 4 }, POINT),
            branches: Array.from({ length: 3 }, () => Array.from({ length: 3 }, POINT)),
        };
        POINT_BUFFERS.set(effect, buffers);
    }
    return buffers;
}

function visualOffset(effect, index, salt) {
    const VALUE = Math.sin(effect.id * 127.1 + effect.pulse * 311.7 + index * 74.7 + salt * 41.3) * 43758.5453;
    return (VALUE - Math.floor(VALUE)) * 2 - 1;
}

export class StormCloudPresentation extends FormationPresentation {
    draw(renderer, effect) {
        const BODY_RADIUS = Math.max(0.2, (effect.bodyRadius || 0.3) * 0.55),
            BODY_SCALE = bodyScale(effect.bodyRadius),
            CLOUD_SIZE = BODY_RADIUS * 2.6,
            ENTER = Math.min(1, effect.age / 0.5),
            EXIT = Math.max(0, effect.age - 0.5 - effect.duration) / 0.5,
            // The cloud's screen-facing lobes grow with the target. Keep their underside clear of the head;
            // this is presentation-only, so flying-skill targeting, range and pulse timing stay unchanged.
            LIFT = CLOUD_SIZE * 0.5 + BODY_RADIUS * 0.6,
            Z = effect.z + LIFT + Math.sin(effect.age * 3) * Math.min(0.1, BODY_RADIUS * 0.12),
            ARC_Z = Z - CLOUD_SIZE * 0.25,
            SPREAD = (1 - ENTER + EXIT) * BODY_RADIUS * 2.6;
        for (let index = 0; index < 3; index++) {
            const ANGLE = (index * Math.PI * 2) / 3;
            cloud(
                renderer,
                effect.x + Math.cos(ANGLE) * SPREAD,
                effect.y + Math.sin(ANGLE) * SPREAD,
                Z,
                CLOUD_SIZE,
                Math.max(0, 1 - EXIT) * Math.min(1, effect.age * 8),
            );
        }
        if (ENTER < 1 && effect.age > 0.15) {
            const INTRO_POINTS = pointBuffersFor(effect).intro;
            INTRO_POINTS[0][0] = effect.x - 0.3;
            INTRO_POINTS[0][1] = effect.y;
            INTRO_POINTS[0][2] = Z;
            INTRO_POINTS[1][0] = effect.x + 0.1;
            INTRO_POINTS[1][1] = effect.y;
            INTRO_POINTS[1][2] = Z + 0.1;
            INTRO_POINTS[2][0] = effect.x - 0.05;
            INTRO_POINTS[2][1] = effect.y;
            INTRO_POINTS[2][2] = Z - 0.1;
            INTRO_POINTS[3][0] = effect.x + 0.3;
            INTRO_POINTS[3][1] = effect.y;
            INTRO_POINTS[3][2] = Z;
            stroke(renderer, INTRO_POINTS, '#b7e8f0aa', 0.035);
        }
        if (effect.pulse > 0 && effect.age > 0.5 && EXIT === 0) {
            const BUFFERS = pointBuffersFor(effect),
                ARCS = BUFFERS.arcs,
                BRANCHES = BUFFERS.branches;
            for (let arcIndex = 0; arcIndex < ARCS.length; arcIndex++) {
                const POINTS = ARCS[arcIndex];
                for (let index = 0; index < POINTS.length; index++) {
                    const T = index / (POINTS.length - 1),
                        CURVE = Math.sin(T * Math.PI),
                        SEED = arcIndex * 17,
                        BEND = visualOffset(effect, index, SEED) * CURVE,
                        SIDE = (arcIndex - 1) * BODY_RADIUS * 0.34 * CURVE,
                        POINT = POINTS[index];
                    POINT[0] = effect.x + (effect.targetX - effect.x) * T + BEND * 0.55 + SIDE;
                    POINT[1] = effect.y + (effect.targetY - effect.y) * T + BEND * 0.22 - SIDE * 0.42;
                    POINT[2] = ARC_Z + (effect.targetZ - ARC_Z) * T + CURVE * (0.18 + BEND * 0.16);
                }
                const BRANCH = BRANCHES[arcIndex],
                    ROOT_T = 0.3 + arcIndex * 0.18 + visualOffset(effect, arcIndex, 1) * 0.08,
                    ROOT = POINTS[Math.round(ROOT_T * (POINTS.length - 1))],
                    DX = visualOffset(effect, arcIndex, 2) * BODY_RADIUS * 2.4,
                    DY = visualOffset(effect, arcIndex, 3) * BODY_RADIUS * 1.9;
                BRANCH[0][0] = ROOT[0];
                BRANCH[0][1] = ROOT[1];
                BRANCH[0][2] = ROOT[2];
                BRANCH[1][0] = ROOT[0] + DX * 0.55;
                BRANCH[1][1] = ROOT[1] + DY * 0.55;
                BRANCH[1][2] = ROOT[2] + BODY_RADIUS * 0.45;
                BRANCH[2][0] = ROOT[0] + DX;
                BRANCH[2][1] = ROOT[1] + DY;
                BRANCH[2][2] = ROOT[2] + BODY_RADIUS * 0.2;
                stroke(renderer, POINTS, '#408bff99', 0.3 * BODY_SCALE);
                stroke(renderer, POINTS, '#8bd4ff', 0.13 * BODY_SCALE);
                stroke(renderer, POINTS, '#f3fdff', 0.045 * BODY_SCALE);
                stroke(renderer, BRANCH, '#408bff88', 0.18 * BODY_SCALE);
                stroke(renderer, BRANCH, '#d9f5ff', 0.045 * BODY_SCALE);
            }
        }
    }
}
