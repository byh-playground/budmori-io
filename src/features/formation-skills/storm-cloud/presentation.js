import { FormationPresentation, bodyScale, cloud, glint, radialStreaks, stroke } from '../presentation-base.js';
import { WORLD_HEIGHT_PROJECTION, WORLD_DEPTH_PROJECTION } from '../../../vector-sockets.js';
const POINT_BUFFERS = new WeakMap();
const CLOUD_SPREAD_DEPTH = 0.35,
    CLOUD_SIDE_SCALE = 0.82,
    CLOUD_LAYER_OFFSET = 0.14,
    // One five-lobe cloud reaches 0.5 + 0.34 from its centre. Include all three layered silhouettes.
    CLOUD_LOBE_EXTENT = 0.84,
    CLOUD_LEFT_EXTENT = CLOUD_LOBE_EXTENT + CLOUD_LAYER_OFFSET / 2,
    CLOUD_RIGHT_EXTENT = CLOUD_LOBE_EXTENT * CLOUD_SIDE_SCALE + CLOUD_LAYER_OFFSET,
    CLOUD_WIDTH_FACTOR = CLOUD_LEFT_EXTENT + CLOUD_RIGHT_EXTENT;

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

function cloudGeometry(effect) {
    const RADIUS = Math.max(0.2, (effect.sizeRadius || effect.bodyRadius || 0.3) * 0.55);
    return {
        radius: RADIUS,
        size:
            effect.visualWidth > 0
                ? effect.visualWidth / CLOUD_WIDTH_FACTOR
                : effect.cloudSize > 0
                  ? effect.cloudSize
                  : RADIUS * 2.6,
        z: Math.max(effect.z, effect.targetZ + 2) + RADIUS * 1.9,
    };
}

export class StormCloudPresentation extends FormationPresentation {
    includeBounds(effect, bounds) {
        const { radius: RADIUS, size: SIZE, z: Z } = cloudGeometry(effect),
            SPREAD = RADIUS * 2.6,
            LEFT_WIDTH = SIZE * CLOUD_LEFT_EXTENT + SPREAD,
            RIGHT_WIDTH = SIZE * CLOUD_RIGHT_EXTENT + SPREAD;
        // Reserve the complete entrance/exit spread, not the current pulse, to avoid camera pumping.
        bounds.left = Math.min(bounds.left, effect.x - LEFT_WIDTH - 1);
        bounds.right = Math.max(bounds.right, effect.x + RIGHT_WIDTH + 1);
        bounds.top = Math.max(
            bounds.top,
            (effect.y + SPREAD * CLOUD_SPREAD_DEPTH) * WORLD_DEPTH_PROJECTION +
                (Z + 0.1 + SIZE * 0.35) * WORLD_HEIGHT_PROJECTION +
                SIZE * 0.26 +
                1,
        );
    }
    draw(renderer, effect) {
        const { radius: BODY_RADIUS, size: CLOUD_SIZE, z: CLOUD_Z } = cloudGeometry(effect),
            ENTER = Math.min(1, effect.age / 0.5),
            EXIT = Math.max(0, effect.age - 0.5 - effect.duration) / 0.5,
            // The cloud uses its resolved size reference. Keep its underside clear of the actual target's head;
            // this is presentation-only, so flying-skill targeting, range and pulse timing stay unchanged.
            Z = CLOUD_Z + Math.sin(effect.age * 3) * Math.min(0.1, BODY_RADIUS * 0.12),
            ARC_Z = Z - CLOUD_SIZE * 0.25,
            SPREAD = (1 - ENTER + EXIT) * BODY_RADIUS * 2.6,
            PULSE_AGE = Math.max(0, effect.age - effect.lastPulse),
            CHARGE = Math.max(0, 1 - PULSE_AGE / 0.24);
        for (let index = 0; index < 3; index++) {
            const ANGLE = (index * Math.PI * 2) / 3;
            cloud(
                renderer,
                effect.x + Math.cos(ANGLE) * (SPREAD + CLOUD_SIZE * CLOUD_LAYER_OFFSET),
                effect.y + Math.sin(ANGLE) * (SPREAD + CLOUD_SIZE * CLOUD_LAYER_OFFSET) * CLOUD_SPREAD_DEPTH,
                Z + (index === 2 ? CLOUD_SIZE * 0.11 : 0),
                CLOUD_SIZE * (index === 2 ? 1 : CLOUD_SIDE_SCALE),
                Math.max(0, 1 - EXIT) * Math.min(1, effect.age * 8),
            );
        }
        if ((ENTER < 1 || CHARGE > 0) && effect.age > 0.15 && EXIT === 0) {
            const INTRO_POINTS = pointBuffersFor(effect).intro;
            INTRO_POINTS[0][0] = effect.x - CLOUD_SIZE * 0.48;
            INTRO_POINTS[0][1] = effect.y;
            INTRO_POINTS[0][2] = ARC_Z;
            INTRO_POINTS[1][0] = effect.x - CLOUD_SIZE * 0.15;
            INTRO_POINTS[1][1] = effect.y;
            INTRO_POINTS[1][2] = ARC_Z + CLOUD_SIZE * 0.06;
            INTRO_POINTS[2][0] = effect.x + CLOUD_SIZE * 0.12;
            INTRO_POINTS[2][1] = effect.y;
            INTRO_POINTS[2][2] = ARC_Z - CLOUD_SIZE * 0.04;
            INTRO_POINTS[3][0] = effect.x + CLOUD_SIZE * 0.48;
            INTRO_POINTS[3][1] = effect.y;
            INTRO_POINTS[3][2] = ARC_Z;
            stroke(renderer, INTRO_POINTS, `rgba(173,219,255,${0.25 + CHARGE * 0.65})`, 0.045);
        }
        for (const TARGET of effect.targets ?? []) {
            if (effect.age < TARGET.readyAt) {
                renderer.ring(TARGET.x, TARGET.y, TARGET.bodyRadius * 1.3, '#b7e8f0aa', 0.035);
            }
        }
        if (effect.pulse > 0 && effect.age > 0.5 && EXIT === 0) {
            const BUFFERS = pointBuffersFor(effect),
                ARCS = BUFFERS.arcs,
                BRANCHES = BUFFERS.branches;
            const TARGETS =
                effect.targetCount > 1
                    ? effect.targets || []
                    : [{ x: effect.targetX, y: effect.targetY, z: effect.targetZ, bodyRadius: effect.bodyRadius }];
            for (const TARGET of TARGETS) {
                if (effect.age < (TARGET.readyAt ?? 0)) {
                    continue;
                }
                const BODY_SCALE = bodyScale(TARGET.bodyRadius),
                    ARC_RADIUS = Math.max(0.2, (TARGET.bodyRadius || 0.3) * 0.55);
                for (let arcIndex = 0; arcIndex < ARCS.length; arcIndex++) {
                    const POINTS = ARCS[arcIndex];
                    for (let index = 0; index < POINTS.length; index++) {
                        const T = index / (POINTS.length - 1),
                            CURVE = Math.sin(T * Math.PI),
                            SEED = arcIndex * 17,
                            BEND = visualOffset(effect, index, SEED) * CURVE,
                            SIDE = (arcIndex - 1) * ARC_RADIUS * 0.34 * CURVE,
                            POINT = POINTS[index];
                        POINT[0] = effect.x + (TARGET.x - effect.x) * T + BEND * 0.55 + SIDE;
                        POINT[1] = effect.y + (TARGET.y - effect.y) * T + BEND * 0.22 - SIDE * 0.42;
                        POINT[2] = ARC_Z + (TARGET.z - ARC_Z) * T + CURVE * (0.18 + BEND * 0.16);
                    }
                    const BRANCH = BRANCHES[arcIndex],
                        ROOT_T = 0.3 + arcIndex * 0.18 + visualOffset(effect, arcIndex, 1) * 0.08,
                        ROOT = POINTS[Math.round(ROOT_T * (POINTS.length - 1))],
                        DX = visualOffset(effect, arcIndex, 2) * ARC_RADIUS * 2.4,
                        DY = visualOffset(effect, arcIndex, 3) * ARC_RADIUS * 1.9;
                    BRANCH[0][0] = ROOT[0];
                    BRANCH[0][1] = ROOT[1];
                    BRANCH[0][2] = ROOT[2];
                    BRANCH[1][0] = ROOT[0] + DX * 0.55;
                    BRANCH[1][1] = ROOT[1] + DY * 0.55;
                    BRANCH[1][2] = ROOT[2] + ARC_RADIUS * 0.45;
                    BRANCH[2][0] = ROOT[0] + DX;
                    BRANCH[2][1] = ROOT[1] + DY;
                    BRANCH[2][2] = ROOT[2] + ARC_RADIUS * 0.2;
                    stroke(renderer, POINTS, `rgba(64,139,255,${0.12 + CHARGE * 0.22})`, 0.26 * BODY_SCALE);
                    stroke(renderer, POINTS, `rgba(139,212,255,${0.4 + CHARGE * 0.6})`, 0.1 * BODY_SCALE);
                    stroke(renderer, POINTS, `rgba(243,253,255,${0.35 + CHARGE * 0.65})`, 0.035 * BODY_SCALE);
                    stroke(renderer, BRANCH, `rgba(129,195,255,${0.2 + CHARGE * 0.65})`, 0.035 * BODY_SCALE);
                }
                glint(renderer, TARGET.x, TARGET.y, TARGET.z, ARC_RADIUS * 0.18, CHARGE, '210,244,255');
                radialStreaks(
                    renderer,
                    TARGET.x,
                    TARGET.y,
                    TARGET.z,
                    ARC_RADIUS,
                    PULSE_AGE / 0.3,
                    effect.id,
                    '145,210,255',
                );
            }
        }
    }
}
