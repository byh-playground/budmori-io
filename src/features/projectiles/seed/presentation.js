import { FEATURE, seedEllipseRadii } from './definition.js';
import { unitBodyDefinition, unitDisplayScale } from '../../unit-body/definition.cjs';
import { WORLD_HEIGHT_PROJECTION } from '../../../vector-sockets.cjs';

export function seedDisplayMultiplier(renderer, projectile) {
    const BODY = unitBodyDefinition(projectile.species),
        OWNER_VECTOR_SCALE =
            (projectile.height * WORLD_HEIGHT_PROJECTION) /
            (FEATURE.bodyHeightFraction * (BODY.bounds.bottom - BODY.bounds.top)),
        DISPLAY_SCALE = unitDisplayScale(
            BODY,
            OWNER_VECTOR_SCALE,
            renderer.scale,
            renderer.scenePresentation.minimumUnitPixels * renderer.pixelRatio,
        );
    // The same minimum-pixel rule is presentation-only, including after the
    // owner disappears. No viewport value is ever copied into the projectile.
    return DISPLAY_SCALE / OWNER_VECTOR_SCALE;
}

export class SeedProjectilePresentation {
    constructor() {
        this.id = FEATURE.id;
    }
    drawShadow(renderer, projectile) {
        const RADIUS = (projectile.radius * seedDisplayMultiplier(renderer, projectile)) / renderer.scale;
        renderer.groundEllipse(projectile.x, projectile.y, RADIUS, (RADIUS * 5) / 7, '#55452433');
    }
    draw(renderer, projectile, point, tail) {
        const RADII = seedEllipseRadii(projectile),
            SCALE = seedDisplayMultiplier(renderer, projectile),
            HEIGHT = projectile.height * WORLD_HEIGHT_PROJECTION * SCALE,
            P = { x: point.x, y: point.y - HEIGHT * 0.5 },
            TAIL = renderer.project(tail.x, tail.y, tail.z),
            X = RADII.x * SCALE,
            Y = RADII.y * SCALE;
        TAIL.y -= HEIGHT * 0.5;
        renderer.line(TAIL, P, (RADII.y * 0.35 * SCALE) / renderer.scale, '#ba964a80');
        renderer.ellipse(P.x, P.y, X, Y, '#cfa957', FEATURE.rotation);
        renderer.ellipse(P.x - Y * 0.15, P.y - Y * 0.25, Y * 0.25, Y * 0.4, '#fff0ae');
    }
}
