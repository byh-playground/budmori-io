import { SeedProjectilePresentation } from '../features/projectiles/seed/presentation.js';
import { CornProjectilePresentation } from '../features/projectiles/corn/presentation.js';
import { SpikeProjectilePresentation } from '../features/projectiles/spike/presentation.js';
import { projectileFeature } from '../features/projectiles/definition.js';
import { Ballistics } from '../model/farm-model.js';
import { drawElementProjectile } from './element-projectile.js';

export class FoodPresentation {
    constructor(renderer) {
        this.renderer = renderer;
    }
    draw(f) {
        this.renderer.groundEllipse(f.x, f.y, 0.1, 0.07, '#55452433');
        if (f.phase === 'flight') {
            const TAIL = this.renderer.project(
                    f.x - f.vx * 0.045,
                    f.y - f.vy * 0.045,
                    Math.max(0, f.z - f.vz * 0.045) + 0.1,
                ),
                HEAD = this.renderer.project(f.x, f.y, f.z + 0.1);
            this.renderer.line(TAIL, HEAD, 0.055, '#e6bd7480');
        }
        const P = this.renderer.project(f.x, f.y, f.z + 0.1);
        this.renderer.ellipse(P.x, P.y, this.renderer.scale * 0.09, this.renderer.scale * 0.12, '#c78a43', 0.4);
        this.renderer.ellipse(
            P.x - 0.025 * this.renderer.scale,
            P.y - 0.08 * this.renderer.scale,
            this.renderer.scale * 0.036,
            this.renderer.scale * 0.05,
            '#e7bf72',
        );
    }
}

const CORN_PROJECTILE_PRESENTATION = new CornProjectilePresentation();

const PROJECTILE_PRESENTATIONS = new Map(
    [new SeedProjectilePresentation(), new SpikeProjectilePresentation()].map((presentation) => [
        presentation.id,
        presentation,
    ]),
);

export class ProjectilePresentation {
    constructor(renderer) {
        this.renderer = renderer;
    }
    draw(projectile) {
        const RENDERER = this.renderer,
            P = RENDERER.project(projectile.x, projectile.y, projectile.z),
            TAIL = Ballistics.sample(
                projectile.path,
                Math.max(0, (projectile.elapsed - 0.04) / projectile.path.duration),
            );
        const PRESENTATION =
            projectile.cornForm >= 3
                ? CORN_PROJECTILE_PRESENTATION
                : PROJECTILE_PRESENTATIONS.get(projectileFeature(projectile).id);
        PRESENTATION.drawShadow(RENDERER, projectile);
        PRESENTATION.draw(RENDERER, projectile, P, TAIL);
        if (projectile.element) {
            drawElementProjectile(RENDERER, projectile, P, TAIL);
        }
    }
}
