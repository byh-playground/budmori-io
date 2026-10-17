import { FormationPresentation, cloud, stroke } from '../presentation-base.js';
const POINT_BUFFERS = new WeakMap();

function pointBuffersFor(effect) {
    let buffers = POINT_BUFFERS.get(effect);
    if (!buffers) {
        const POINT = () => [0, 0, 0];
        buffers = {
            arc: Array.from({ length: 13 }, POINT),
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
        const ENTER = Math.min(1, effect.age / 0.5),
            EXIT = Math.max(0, effect.age - 0.5 - effect.duration) / 0.5,
            Z = effect.z + Math.sin(effect.age * 3) * 0.1,
            SPREAD = (1 - ENTER + EXIT) * 1.2;
        for (let index = 0; index < 3; index++) {
            const ANGLE = (index * Math.PI * 2) / 3;
            cloud(
                renderer,
                effect.x + Math.cos(ANGLE) * SPREAD,
                effect.y + Math.sin(ANGLE) * SPREAD,
                Z,
                0.7,
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
                POINTS = BUFFERS.arc,
                BRANCHES = BUFFERS.branches;
            for (let index = 0; index < POINTS.length; index++) {
                const T = index / (POINTS.length - 1),
                    BEND = visualOffset(effect, index, 0) * Math.sin(T * Math.PI),
                    POINT = POINTS[index];
                POINT[0] = effect.x + (effect.targetX - effect.x) * T + BEND * 0.55;
                POINT[1] = effect.y + (effect.targetY - effect.y) * T + BEND * 0.22;
                POINT[2] = Z + (effect.targetZ - Z) * T + Math.sin(T * Math.PI) * 0.28 + BEND * 0.16;
            }
            for (let index = 0; index < BRANCHES.length; index++) {
                const T = 0.24 + index * 0.24 + visualOffset(effect, index, 1) * 0.08,
                    ROOT = POINTS[Math.round(T * (POINTS.length - 1))],
                    DX = visualOffset(effect, index, 2) * 0.72,
                    DY = visualOffset(effect, index, 3) * 0.58,
                    BRANCH = BRANCHES[index];
                BRANCH[0][0] = ROOT[0];
                BRANCH[0][1] = ROOT[1];
                BRANCH[0][2] = ROOT[2];
                BRANCH[1][0] = ROOT[0] + DX * 0.55;
                BRANCH[1][1] = ROOT[1] + DY * 0.55;
                BRANCH[1][2] = ROOT[2] + 0.16;
                BRANCH[2][0] = ROOT[0] + DX;
                BRANCH[2][1] = ROOT[1] + DY;
                BRANCH[2][2] = ROOT[2] + 0.08;
            }
            stroke(renderer, POINTS, '#408bff99', 0.3);
            stroke(renderer, POINTS, '#8bd4ff', 0.13);
            stroke(renderer, POINTS, '#f3fdff', 0.045);
            for (const BRANCH of BRANCHES) {
                stroke(renderer, BRANCH, '#408bff88', 0.18);
                stroke(renderer, BRANCH, '#d9f5ff', 0.045);
            }
        }
    }
}
