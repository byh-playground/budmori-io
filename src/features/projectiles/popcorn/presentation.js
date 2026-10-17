import { seedDisplayMultiplier } from '../seed/presentation.js';
import { clamp } from '../../../farm-model.js';
import { FEATURE } from './definition.js';

export class PopcornProjectilePresentation {
    constructor(flightPresentation) {
        this.id = FEATURE.id;
        this.flightPresentation = flightPresentation;
    }
    drawShadow(renderer, projectile) {
        if (!projectile.landed) {
            this.flightPresentation(projectile).drawShadow(renderer, projectile);
            return;
        }
        const RADIUS = (projectile.radius * seedDisplayMultiplier(renderer, projectile)) / renderer.scale;
        renderer.groundEllipse(
            projectile.x,
            projectile.y,
            RADIUS,
            RADIUS * 0.75,
            projectile.exploded ? '#d86c3b55' : '#c78a4366',
        );
    }
    draw(renderer, projectile, point, tail) {
        if (!projectile.landed) {
            this.flightPresentation(projectile).draw(renderer, projectile, point, tail);
            return;
        }
        const F = projectile,
            SCALE = seedDisplayMultiplier(renderer, F);

        const FUSE = Math.max(0, Math.min(1, F.fuseRemaining || 0));
        if (!F.exploded && F.popcornConfig?.radius > 0) {
            renderer.ring(F.x, F.y, F.popcornConfig.radius, 'rgba(190,111,52,.18)', 0.035);
        }
        if (F.exploded) {
            const PROGRESS = Math.max(0, Math.min(1, (F.explosionLife || 0) / 0.5));
            renderer.ring(
                F.x,
                F.y,
                (F.popcornConfig?.radius || 0.3) * (0.25 + 0.75 * PROGRESS),
                `rgba(224,111,54,${0.68 * (1 - PROGRESS)})`,
                0.12,
            );
        } else {
            renderer.ring(F.x, F.y, 0.2 + 0.2 * (1 - FUSE), `rgba(238,181,83,${0.45 + 0.4 * (1 - FUSE)})`, 0.045);
        }
        // The landed pose flattens the kernel, but its horizontal footprint
        // remains the snapshotted collision radius used by popcorn contacts.
        const ROTATION = 0.2,
            ASPECT = 8 / 13,
            X = (F.radius * SCALE) / Math.hypot(Math.cos(ROTATION), ASPECT * Math.sin(ROTATION)),
            Y = X * ASPECT,
            HALF_HEIGHT = Math.hypot(X * Math.sin(ROTATION), Y * Math.cos(ROTATION)),
            KERNEL = renderer.project(F.x, F.y, 0);
        KERNEL.y -= HALF_HEIGHT;
        renderer.ellipse(KERNEL.x, KERNEL.y, X, Y, F.exploded ? '#e37f42' : '#d4a347', ROTATION);
        renderer.ellipse(KERNEL.x - X * 0.27, KERNEL.y - Y * 0.25, X * 0.35, Y * 0.375, '#ffe0a0');
    }
}

export class PopcornExplosionEffect {
    draw(renderer, effect, progress) {
        const E = effect,
            Q = progress;

        const PROGRESS = clamp(Q / (E.duration || 0.5), 0, 1),
            RADIUS = Math.max(0.08, E.radius) * (0.18 + 0.82 * PROGRESS);
        renderer.groundEllipse(E.x, E.y, RADIUS, RADIUS, `rgba(235,143,63,${0.18 * (1 - PROGRESS)})`);
        renderer.ring(E.x, E.y, RADIUS, `rgba(233,115,49,${0.88 * (1 - PROGRESS)})`, 0.1 * (1 - PROGRESS) + 0.025);
        renderer.ring(E.x, E.y, Math.max(0.05, RADIUS * 0.72), `rgba(255,206,101,${0.7 * (1 - PROGRESS)})`, 0.055);
        for (let i = 0; i < 5; i++) {
            const A = (i * Math.PI * 2) / 5 + PROGRESS * 0.8,
                D = RADIUS * (0.55 + 0.3 * PROGRESS),
                P = renderer.project(E.x + Math.cos(A) * D, E.y + Math.sin(A) * D, 0.08 * (1 - PROGRESS));
            renderer.ellipse(
                P.x,
                P.y,
                renderer.scale * 0.045 * (1 - PROGRESS),
                renderer.scale * 0.03 * (1 - PROGRESS),
                `rgba(255,216,119,${1 - PROGRESS})`,
                A,
            );
        }
    }
}

export class PopcornImpactEffect {
    draw(renderer, effect, progress) {
        const E = effect,
            Q = progress;

        const PROGRESS = clamp(Q / (E.duration || 0.25), 0, 1);
        renderer.ring(
            E.x,
            E.y,
            0.08 + PROGRESS * (E.radius || 0.1) * 1.6,
            `rgba(225,150,72,${0.65 * (1 - PROGRESS)})`,
            0.045,
        );
    }
}
