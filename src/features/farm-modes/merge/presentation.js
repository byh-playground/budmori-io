import { CelebrationEffect } from '../presentation-base.js';
import { clamp } from '../../../farm-model.js';

function mergeHolePulse(renderer, task) {
    const PROGRESS = task.phase === 'approach' ? clamp(task.elapsed / task.duration, 0, 1) : 1,
        PULSE = 0.5 + 0.5 * Math.sin(renderer.displayTimeMs * 0.006 + task.materialIds[0] * 0.17);
    return { progress: PROGRESS, pulse: PULSE, radius: renderer.scale * (0.2 + PULSE * 0.035 + PROGRESS * 0.055) };
}
export function drawMergeBlackHoleBack(renderer, task) {
    const { pulse: PULSE, radius: RADIUS } = mergeHolePulse(renderer, task),
        CENTER = renderer.project(task.centerX, task.centerY, task.centerZ - 0.16);
    renderer.ellipse(CENTER.x, CENTER.y, RADIUS * 3.1, RADIUS * 1.8, '#9274d944');
    renderer.ellipse(CENTER.x, CENTER.y, RADIUS * 2.25, RADIUS * 1.35, '#7b58bd88');
    for (let index = 0; index < 2; index++) {
        const ANGLE = renderer.displayTimeMs * 0.004 * (index ? -1 : 1) + index * Math.PI,
            POINT = renderer.project(
                task.centerX + Math.cos(ANGLE) * 0.43,
                task.centerY + Math.sin(ANGLE) * 0.32,
                task.centerZ - 0.12,
            ),
            PARTICLE_RADIUS = renderer.scale * (0.035 + PULSE * 0.012);
        renderer.ellipse(POINT.x, POINT.y, PARTICLE_RADIUS, PARTICLE_RADIUS * 0.72, '#e0c4ff99');
    }
}
export function drawMergeBlackHoleFront(renderer, task) {
    const { pulse: PULSE, radius: RADIUS } = mergeHolePulse(renderer, task),
        Z = task.centerZ + 0.32,
        CENTER = renderer.project(task.centerX, task.centerY, Z);
    renderer.ellipse(CENTER.x, CENTER.y, RADIUS * 1.55, RADIUS * 0.95, '#21182e');
    renderer.ellipse(CENTER.x, CENTER.y, RADIUS * 1.18, RADIUS * 0.7, '#100d18');
    for (let index = 0; index < 2; index++) {
        const ANGLE = renderer.displayTimeMs * 0.004 * (index ? 1 : -1) + ((index + 2) * Math.PI) / 2,
            POINT = renderer.project(
                task.centerX + Math.cos(ANGLE) * 0.43,
                task.centerY + Math.sin(ANGLE) * 0.32,
                Z + 0.04,
            ),
            PARTICLE_RADIUS = renderer.scale * (0.035 + PULSE * 0.012);
        renderer.ellipse(POINT.x, POINT.y, PARTICLE_RADIUS, PARTICLE_RADIUS * 0.72, '#e0c4ff');
    }
}
export function drawMergeBlackHoles(renderer, world) {
    for (const TASK of world.mergeTasks) {
        if (!Number.isFinite(TASK.centerX) || !Number.isFinite(TASK.centerY) || !Number.isFinite(TASK.centerZ)) {
            continue;
        }
        const { pulse: PULSE } = mergeHolePulse(renderer, TASK),
            ID = Number.isFinite(TASK.materialIds?.[0]) ? TASK.materialIds[0] : 0,
            DEPTH = 0.785 * TASK.centerY - 0.62 * TASK.centerZ;
        renderer.strokeGroundEllipse(
            TASK.centerX,
            TASK.centerY,
            0.52 + PULSE * 0.08,
            0.4 + PULSE * 0.06,
            '#7650a888',
            0.04,
        );
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
        z: (effect.z || 0) + ((effect.targetZ ?? effect.z ?? 0) - (effect.z || 0)) * T + Math.sin(Math.PI * T) * 0.55,
    };
}

export class MergeEffect extends CelebrationEffect {
    constructor() {
        super();
        this.color = '#58b9bb';
        this.rotationSpeed = 2;
    }
    radius(progress) {
        return 1.8 * (1 - progress) + 0.15;
    }
    spread(progress) {
        return 1.8 * (1 - progress);
    }
    drawParticle(renderer, point, radius) {
        const C = renderer.ctx;
        C.beginPath();
        C.moveTo(point.x, point.y - radius * 1.5);
        C.lineTo(point.x + radius, point.y);
        C.lineTo(point.x, point.y + radius * 1.5);
        C.lineTo(point.x - radius, point.y);
        C.closePath();
        C.fill();
    }
}

export class MergeMaterialEffect {
    draw(renderer, effect, progress) {
        const E = effect,
            Q = progress;

        const T = clamp(Q, 0, 1),
            POINT_POSITION = mergeMaterialPosition(E, T),
            START = renderer.project(E.x, E.y, E.z || 0),
            POINT = renderer.project(POINT_POSITION.x, POINT_POSITION.y, POINT_POSITION.z);
        renderer.line(START, POINT, 0.045, `rgba(88,185,187,${0.2 + 0.65 * (1 - T)})`);
        renderer.ellipse(
            POINT.x,
            POINT.y,
            renderer.scale * 0.12 * (1 - 0.4 * T),
            renderer.scale * 0.09 * (1 - 0.4 * T),
            `rgba(88,185,187,${1 - 0.35 * T})`,
            T * Math.PI,
        );
    }
}
