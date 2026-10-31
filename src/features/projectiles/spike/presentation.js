import { Ballistics } from '../../../model/farm-model.js';
import { FEATURE, CHESTNUT_THORN_COLORS } from './definition.js';
import { tierBodyScale, unitBodyRadius } from '../../unit-body/definition.js';

// Shard sizes are tuned for a tier-1 body and grow with the firing body. A bare path (camera bounds) has no body: 1.
function shardSize(projectile) {
    return Number.isInteger(projectile.species)
        ? tierBodyScale(projectile.species, projectile.tier) * (projectile.chestnutGiant ?? 1)
        : 1;
}

// One authoritative projectile can display a bounded bundle. Shards never own
// collision or damage. Every point uses the same fixed launch/impact endpoints.
export function sampleChestnutShards(projectile, progress) {
    const SIZE = shardSize(projectile),
        Q = Math.max(0, Math.min(1, progress)),
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
            width: (STAGE === 'central' ? 0.16 : 0.085) * SIZE,
            length: (STAGE === 'central' ? 0.36 : 0.22) * SIZE,
        };
    });
}
export class SpikeProjectilePresentation {
    constructor() {
        this.id = FEATURE.id;
    }
    drawShadow(renderer, projectile) {
        const SIZE = shardSize(projectile);
        renderer.groundEllipse(projectile.x, projectile.y, 0.14 * SIZE, 0.1 * SIZE, '#55452433');
    }
    draw(renderer, projectile, point, tail) {
        if (projectile.chestnutActionId) {
            const HEADS = sampleChestnutShards(projectile, projectile.elapsed / projectile.path.duration),
                TAILS = sampleChestnutShards(projectile, (projectile.elapsed - 0.06) / projectile.path.duration);
            HEADS.forEach((head, index) => {
                // One long triangle, reaching as far as the old shaft plus its round tip did.
                const REACH = head.length + 0.045 * shardSize(projectile),
                    TIP = renderer.project(
                        head.x + Math.cos(head.angle) * REACH,
                        head.y + Math.sin(head.angle) * REACH,
                        head.z,
                    ),
                    P = renderer.project(head.x, head.y, head.z),
                    T = TAILS[index];
                renderer.line(
                    renderer.project(T.x, T.y, T.z),
                    P,
                    0.045 * shardSize(projectile),
                    CHESTNUT_THORN_COLORS.trail,
                );
                renderer.spike(P, TIP, head.width, CHESTNUT_THORN_COLORS.shaft);
            });
            return;
        }
        const ANGLE = Math.atan2(
                projectile.path.to.y - projectile.path.from.y,
                projectile.path.to.x - projectile.path.from.x,
            ),
            REACH = renderer.scale * (0.22 + 0.045 * shardSize(projectile)),
            TIP = {
                x: point.x + Math.cos(ANGLE) * REACH,
                y: point.y - 0.62 * Math.sin(ANGLE) * REACH,
            };
        renderer.line(renderer.project(tail.x, tail.y, tail.z), point, 0.055, CHESTNUT_THORN_COLORS.trail);
        renderer.spike(point, TIP, 0.105, CHESTNUT_THORN_COLORS.shaft);
    }
}

// A thorn is gone the tick it lands, while the screen draws a tick behind, so its last flying frame stops short of the
// body. For this long after the hit it is drawn stuck in the contact point instead: point in, base outward.
export const CHESTNUT_IMPACT_MS = 65;
const T1_CHESTNUT_RADIUS = unitBodyRadius({ species: 3, tier: 1, growthElapsed: 1, growthDuration: 1 });
export function drawChestnutImpact(renderer, hit) {
    const SIZE = Number.isFinite(hit.sourceRadius) ? Math.max(1, hit.sourceRadius / T1_CHESTNUT_RADIUS) : 1,
        REACH = (0.22 + 0.045) * SIZE,
        // A boss hit is raised 0.2 above the contact for its sparks (farm-combat finishBossHit); the thorn sits at the contact.
        Z = Math.max(0, (hit.z ?? 0.3) - 0.2);
    renderer.spike(
        renderer.project(hit.x + (hit.nx || 0) * REACH, hit.y + (hit.ny || 0) * REACH, Z),
        renderer.project(hit.x, hit.y, Z),
        0.085 * SIZE,
        CHESTNUT_THORN_COLORS.shaft,
    );
}
