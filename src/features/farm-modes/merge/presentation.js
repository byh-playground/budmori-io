import { clamp } from '../../../model/farm-model.js';
import { COMBINE_AIR } from '../combine/definition.js';
import {
    TAU,
    clamp01,
    easeOut,
    drawRay,
    drawLitSparkle,
    drawLitMote,
    drawContactLight,
    gradeColor,
    pop,
    rgba,
    strokeArc,
} from '../vfx-kit.js';

const HOLE_PURPLE = '#7b58bd',
    HOLE_LIGHT = '#d9c4ff',
    HOLE_RIM = '#e9dcff',
    CREAM = '#fffbee';
const ORBIT_COUNT = 6,
    TRAIL_STEPS = 3;

function mergeHoleState(renderer, task) {
    const APPROACH = task.phase === 'approach',
        PROGRESS = APPROACH ? clamp(task.elapsed / task.duration, 0, 1) : 1,
        PULSE = 0.5 + 0.5 * Math.sin(renderer.displayTimeMs * 0.006 + (task.materialIds?.[0] || 0) * 0.17),
        OPEN = APPROACH ? easeOut(PROGRESS / 0.25) : 1;
    let bump = 0;
    if (!APPROACH && task.materialIds?.length) {
        // Each absorbed material makes the hole swell briefly.
        const STEP = (task.duration * 0.72) / task.materialIds.length;
        for (let index = 0; index < task.materialIds.length; index++) {
            const AGE = task.elapsed - (index + 1) * STEP;
            if (AGE >= 0) {
                bump = Math.max(bump, Math.exp(-AGE * 16));
            }
        }
    }
    const RADIUS = renderer.scale * (0.26 + PROGRESS * 0.07 + PULSE * 0.025 + bump * 0.07) * OPEN;
    return { progress: PROGRESS, pulse: PULSE, bump, open: OPEN, radius: RADIUS };
}
// Orbiting motes. The half behind the hole is drawn in the back layer, the other half in front.
function drawOrbit(renderer, task, state, front) {
    const TIME = renderer.displayTimeMs * 0.0042,
        Z = task.centerZ + (front ? 0.32 : -0.16);
    for (let index = 0; index < ORBIT_COUNT; index++) {
        const DIRECTION = index % 2 ? -1 : 1,
            BASE = TIME * DIRECTION + (index * TAU) / ORBIT_COUNT,
            SPREAD = 0.46 + 0.1 * Math.sin(index * 1.7) + state.bump * 0.12;
        for (let trail = TRAIL_STEPS; trail >= 0; trail--) {
            const ANGLE = BASE - trail * 0.2 * DIRECTION,
                IS_FRONT = Math.sin(ANGLE) >= 0;
            if (IS_FRONT !== front) {
                continue;
            }
            const POINT = renderer.project(
                    task.centerX + Math.cos(ANGLE) * SPREAD,
                    task.centerY + Math.sin(ANGLE) * SPREAD * 0.74,
                    Z,
                ),
                SIZE = renderer.scale * (0.04 - trail * 0.007) * state.open * (1 + state.bump * 0.4);
            renderer.ellipse(
                POINT.x,
                POINT.y,
                SIZE,
                SIZE * 0.78,
                rgba(trail ? HOLE_LIGHT : CREAM, (1 - trail / (TRAIL_STEPS + 1)) * 0.95),
            );
        }
    }
}
export function drawMergeBlackHoleBack(renderer, task) {
    const STATE = mergeHoleState(renderer, task),
        CENTER = renderer.project(task.centerX, task.centerY, task.centerZ - 0.16),
        R = STATE.radius;
    renderer.ellipse(CENTER.x, CENTER.y, R * 3.3, R * 1.95, rgba(HOLE_PURPLE, 0.18 * STATE.open));
    renderer.ellipse(CENTER.x, CENTER.y, R * 2.3, R * 1.38, rgba(HOLE_PURPLE, 0.5 * STATE.open));
    drawOrbit(renderer, task, STATE, false);
}
export function drawMergeBlackHoleFront(renderer, task) {
    const STATE = mergeHoleState(renderer, task),
        CENTER = renderer.project(task.centerX, task.centerY, task.centerZ + 0.32),
        R = STATE.radius;
    renderer.ellipse(CENTER.x, CENTER.y, R * 1.6, R * 0.98, '#21182e');
    renderer.ellipse(CENTER.x, CENTER.y, R * 1.2, R * 0.72, '#0f0b17');
    strokeArc(
        renderer,
        CENTER,
        R * 1.62,
        R * 0.99,
        0,
        TAU,
        rgba(HOLE_RIM, 0.55 + 0.35 * STATE.bump),
        renderer.scale * 0.028,
    );
    if (STATE.bump > 0.05) {
        strokeArc(
            renderer,
            CENTER,
            R * (1.7 + (1 - STATE.bump) * 1.1),
            R * (1.04 + (1 - STATE.bump) * 0.7),
            0,
            TAU,
            rgba(CREAM, STATE.bump * 0.7),
            renderer.scale * 0.02,
        );
    }
    drawOrbit(renderer, task, STATE, true);
}
export function drawMergeBlackHoles(renderer, world) {
    for (const TASK of world.mergeTasks) {
        if (TASK.partnerSpecies >= 0 && TASK.phase === 'animation' && TASK.elapsed >= COMBINE_AIR.revealDelay) {
            continue;
        }
        if (!Number.isFinite(TASK.centerX) || !Number.isFinite(TASK.centerY) || !Number.isFinite(TASK.centerZ)) {
            continue;
        }
        const STATE = mergeHoleState(renderer, TASK),
            ID = Number.isFinite(TASK.materialIds?.[0]) ? TASK.materialIds[0] : 0,
            DEPTH = 0.785 * TASK.centerY - 0.62 * TASK.centerZ,
            TIME = renderer.displayTimeMs * 0.0016;
        // Summoning circle on the ground: filled disc, two rings and eight turning dots.
        renderer.groundEllipse(
            TASK.centerX,
            TASK.centerY,
            0.62 * STATE.open,
            0.62 * STATE.open,
            rgba(HOLE_PURPLE, 0.16),
        );
        renderer.strokeGroundEllipse(
            TASK.centerX,
            TASK.centerY,
            (0.56 + STATE.pulse * 0.05) * STATE.open,
            (0.56 + STATE.pulse * 0.05) * STATE.open,
            rgba('#8a63c9', 0.7),
            0.04,
        );
        renderer.strokeGroundEllipse(
            TASK.centerX,
            TASK.centerY,
            0.38 * STATE.open,
            0.38 * STATE.open,
            rgba(HOLE_LIGHT, 0.5),
            0.025,
        );
        for (let index = 0; index < 8; index++) {
            const ANGLE = TIME + (index * TAU) / 8,
                POINT = renderer.project(
                    TASK.centerX + Math.cos(ANGLE) * 0.56 * STATE.open,
                    TASK.centerY + Math.sin(ANGLE) * 0.56 * STATE.open,
                    0,
                );
            renderer.ellipse(POINT.x, POINT.y, renderer.scale * 0.032, renderer.scale * 0.02, rgba(HOLE_LIGHT, 0.9));
        }
        renderer.addActor(renderer.mergeHoleBackPresentation, TASK, DEPTH + 0.62 * 0.16, -2000000000 + ID);
        renderer.addActor(renderer.mergeHoleFrontPresentation, TASK, DEPTH - 0.62 * 0.32, 2000000000 + ID);
    }
}

export function mergeMaterialProgress(effect) {
    const DELAY = Number.isFinite(effect.delay) ? effect.delay : 0,
        SPAN = Number.isFinite(effect.span) ? effect.span : 1;
    if (effect.life < DELAY) {
        return null;
    }
    return Number.isFinite(effect.span) ? clamp((effect.life - DELAY) / SPAN, 0, 1) : effect.life;
}
export function mergeMaterialPosition(effect, progress) {
    const T = clamp(progress, 0, 1);
    return {
        x: effect.x + (effect.targetX - effect.x) * T,
        y: effect.y + (effect.targetY - effect.y) * T,
        z: (effect.z || 0) + ((effect.targetZ ?? effect.z ?? 0) - (effect.z || 0)) * T,
    };
}

// Completion burst. The colour is the result's grade colour, so the new rarity reads at a glance.
export class MergeEffect {
    draw(renderer, effect, progress) {
        const P = clamp01(progress),
            COLOR = gradeColor(effect.tier),
            X = effect.x,
            Y = effect.y,
            Z = effect.z || 1;
        if (P >= 1) {
            return;
        }
        drawContactLight(renderer, X, Y, Z, 0.65, P, COLOR);
        const RING_A = easeOut(P);
        renderer.ring(X, Y, 0.3 + RING_A * 1.9, rgba(COLOR, 0.95 * (1 - P)), 0.12 * (1 - P) + 0.02);
        if (P > 0.12) {
            const Q = clamp01((P - 0.12) / 0.88);
            renderer.ring(X, Y, 0.2 + easeOut(Q) * 1.35, rgba(CREAM, 0.8 * (1 - Q)), 0.05 * (1 - Q) + 0.012);
        }
        const BEAM = clamp01(1 - P / 0.6);
        if (BEAM > 0) {
            const BOTTOM = renderer.project(X, Y, 0),
                TOP = renderer.project(X, Y, 2.4),
                WIDTH = renderer.scale * 0.34 * (0.4 + 0.6 * BEAM),
                C = renderer.ctx;
            C.fillStyle = rgba(COLOR, 0.3 * BEAM);
            C.beginPath();
            C.moveTo(BOTTOM.x - WIDTH, BOTTOM.y);
            C.lineTo(TOP.x - WIDTH * 0.35, TOP.y);
            C.lineTo(TOP.x + WIDTH * 0.35, TOP.y);
            C.lineTo(BOTTOM.x + WIDTH, BOTTOM.y);
            C.closePath();
            C.fill();
        }
        const RAYS = 8,
            REACH = easeOut(P) * 1.5;
        for (let index = 0; index < RAYS; index++) {
            const ANGLE = (index * TAU) / RAYS + P * 0.5,
                FROM = renderer.project(X + Math.cos(ANGLE) * REACH * 0.4, Y + Math.sin(ANGLE) * REACH * 0.4, Z - 0.5),
                TO = renderer.project(X + Math.cos(ANGLE) * REACH, Y + Math.sin(ANGLE) * REACH, Z - 0.5);
            drawRay(
                renderer,
                FROM,
                TO,
                renderer.scale * 0.05 * (1 - P),
                rgba(index % 2 ? CREAM : COLOR, (1 - P) ** 1.4),
            );
        }
        const SPARKLES = 6 + (effect.tier || 2) * 2;
        for (let index = 0; index < SPARKLES; index++) {
            const SEED = Math.sin(index * 12.9898 + 4.1) * 43758.5453,
                JITTER = SEED - Math.floor(SEED),
                ANGLE = (index * TAU) / SPARKLES + JITTER * 0.8,
                DISTANCE = (0.35 + JITTER * 0.9) * easeOut(P),
                RISE = easeOut(P) * (0.5 + JITTER * 0.8) - P * P * 0.4,
                POINT = renderer.project(
                    X + Math.cos(ANGLE) * DISTANCE,
                    Y + Math.sin(ANGLE) * DISTANCE * 0.8,
                    Z - 0.3 + RISE,
                ),
                SIZE = renderer.scale * (0.07 + JITTER * 0.07) * pop(P * 2.2) * (1 - P * 0.6);
            drawLitSparkle(renderer, POINT, SIZE, index % 2 ? CREAM : COLOR, clamp01(1.4 - P * 1.3), P * 3 + index);
        }
    }
}

// Absorbed material: a glowing mote that curves into the hole, leaving a short fading trail.
export class MergeMaterialEffect {
    draw(renderer, effect, progress) {
        const T = clamp(progress, 0, 1),
            SIDE = (effect.sequenceIndex || 0) % 2 ? 1 : -1,
            DX = effect.targetX - effect.x,
            DY = effect.targetY - effect.y,
            LENGTH = Math.hypot(DX, DY) || 1,
            NORMAL_X = -DY / LENGTH,
            NORMAL_Y = DX / LENGTH,
            AT = (u) => {
                const V = clamp(u, 0, 1),
                    POSITION = mergeMaterialPosition(effect, V),
                    ARC = Math.sin(V * Math.PI) * 0.45 * SIDE * Math.min(1, LENGTH / 1.2);
                return renderer.project(
                    POSITION.x + NORMAL_X * ARC,
                    POSITION.y + NORMAL_Y * ARC,
                    POSITION.z + Math.sin(V * Math.PI) * 0.25,
                );
            };
        for (let step = 5; step >= 1; step--) {
            const U = T - step * 0.07;
            if (U < 0) {
                continue;
            }
            const POINT = AT(U),
                FADE = 1 - step / 6;
            renderer.ellipse(
                POINT.x,
                POINT.y,
                renderer.scale * 0.08 * FADE * (1 - 0.4 * T),
                renderer.scale * 0.06 * FADE * (1 - 0.4 * T),
                rgba('#58b9bb', 0.55 * FADE),
            );
        }
        const HEAD = AT(T),
            SIZE = renderer.scale * 0.13 * (1 - 0.45 * T);
        drawLitMote(renderer, HEAD, SIZE, '#58b9bb', 0.95);
        drawLitSparkle(renderer, HEAD, SIZE * 0.75, HOLE_LIGHT, 0.75 * Math.sin(T * Math.PI), T * 3);
    }
}
