import { Ballistics } from '../../../model/farm-model.js';
import { FEATURE, CHESTNUT_THORN_COLORS } from './definition.js';

// One authoritative projectile can display a bounded bundle. Shards never own
// collision or damage. Every point uses the same fixed launch/impact endpoints.
export function sampleChestnutShards(projectile, progress) {
    const Q = Math.max(0, Math.min(1, progress)),
        P = projectile.path,
        CENTER = Ballistics.sample(P, Q),
        DX = P.to.x - P.from.x,
        DY = P.to.y - P.from.y,
        N = Math.hypot(DX, DY) || 1,
        STAGE = projectile.chestnutStage,
        OFFSETS = STAGE === 'fan' || STAGE === 'spread' ? [-1, -0.5, 0, 0.5, 1] : STAGE === 'converge' ? [-1, 1] : [0],
        WIDTH = STAGE === 'spread' ? 0.4 * N : STAGE === 'fan' ? N : 0.6;
    return OFFSETS.map((offset) => {
        const CROSS = STAGE === 'cross-left' ? -1 : STAGE === 'cross-right' ? 1 : 0,
            SIDE = CROSS ? CROSS * 0.25 * (1 - 2 * Q) : offset * WIDTH * (STAGE === 'converge' ? 1 - Q : Q),
            SIDE_VELOCITY = CROSS ? -CROSS * 0.5 : offset * WIDTH * (STAGE === 'converge' ? -1 : 1);
        return {
            x: CENTER.x - (DY / N) * SIDE,
            y: CENTER.y + (DX / N) * SIDE,
            z: CENTER.z,
            angle: Math.atan2(DY + (DX / N) * SIDE_VELOCITY, DX - (DY / N) * SIDE_VELOCITY),
            width: STAGE === 'central' ? 0.16 : 0.085,
            length: STAGE === 'central' ? 0.36 : 0.22,
        };
    });
}
export class SpikeProjectilePresentation {
    constructor() {
        this.id = FEATURE.id;
    }
    drawShadow(renderer, projectile) {
        renderer.groundEllipse(projectile.x, projectile.y, 0.14, 0.1, '#55452433');
    }
    draw(renderer, projectile, point, tail) {
        if (projectile.chestnutActionId) {
            const HEADS = sampleChestnutShards(projectile, projectile.elapsed / projectile.path.duration),
                TAILS = sampleChestnutShards(projectile, (projectile.elapsed - 0.06) / projectile.path.duration);
            HEADS.forEach((head, index) => {
                const TIP = renderer.project(
                        head.x + Math.cos(head.angle) * head.length,
                        head.y + Math.sin(head.angle) * head.length,
                        head.z,
                    ),
                    P = renderer.project(head.x, head.y, head.z),
                    T = TAILS[index];
                renderer.line(renderer.project(T.x, T.y, T.z), P, 0.045, CHESTNUT_THORN_COLORS.trail);
                renderer.line(P, TIP, head.width, CHESTNUT_THORN_COLORS.shaft);
                renderer.ellipse(
                    TIP.x,
                    TIP.y,
                    renderer.scale * 0.045,
                    renderer.scale * 0.035,
                    CHESTNUT_THORN_COLORS.tip,
                    head.angle,
                );
            });
            return;
        }
        const ANGLE = Math.atan2(
                projectile.path.to.y - projectile.path.from.y,
                projectile.path.to.x - projectile.path.from.x,
            ),
            TIP = {
                x: point.x + Math.cos(ANGLE) * renderer.scale * 0.22,
                y: point.y - 0.62 * Math.sin(ANGLE) * renderer.scale * 0.22,
            };
        renderer.line(renderer.project(tail.x, tail.y, tail.z), point, 0.055, CHESTNUT_THORN_COLORS.trail);
        renderer.line(point, TIP, 0.105, CHESTNUT_THORN_COLORS.shaft);
        renderer.ellipse(
            TIP.x,
            TIP.y,
            renderer.scale * 0.045,
            renderer.scale * 0.035,
            CHESTNUT_THORN_COLORS.tip,
            ANGLE,
        );
    }
}
