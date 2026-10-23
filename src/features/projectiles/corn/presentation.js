import { WORLD_HEIGHT_PROJECTION, WORLD_DEPTH_PROJECTION } from '../../../vector-sockets.cjs';
import { seedDisplayMultiplier } from '../seed/presentation.js';

// Visual cob dimensions are deliberately independent of the physical hit filter.
// Changing the artwork never changes collision radius/height, damage, or arrival clocks.
function cornVisualHeight(form) {
    return form >= 5 ? 3.8 : form === 4 ? 2.8 : 1.6;
}

export function includeCornProjectileBounds(world, bounds) {
    for (const PROJECTILE of world.projectiles) {
        if (!(PROJECTILE.cornForm >= 3)) {
            continue;
        }
        const PATH = PROJECTILE.path,
            SIZE = cornVisualHeight(PROJECTILE.cornForm),
            SIDE = SIZE * 0.9 + 0.5,
            SKY = Math.max(PATH.from.z, PATH.to.z) + PATH.height + SIZE * 2.1;
        // Like storm-cloud bounds, reserve the complete path and trail for the floor,
        // not the current sample. The camera therefore never pumps between missiles.
        bounds.left = Math.min(bounds.left, PATH.from.x - SIDE, PATH.to.x - SIDE);
        bounds.right = Math.max(bounds.right, PATH.from.x + SIDE, PATH.to.x + SIDE);
        bounds.top = Math.max(
            bounds.top,
            Math.max(PATH.from.y, PATH.to.y) * WORLD_DEPTH_PROJECTION + SKY * WORLD_HEIGHT_PROJECTION + 1,
        );
    }
}

// Reuses the game's GameKit VectorContext primitives. Every position and flight clock
// comes from the live projectile; presentation does not advance or predict combat.
export class CornProjectilePresentation {
    drawShadow(renderer, projectile) {
        const SCALE = seedDisplayMultiplier(renderer, projectile),
            RADIUS = (projectile.radius * SCALE) / renderer.scale;
        renderer.groundEllipse(projectile.x, projectile.y, RADIUS, RADIUS * 0.7, '#55452433');
        if (projectile.cornForm < 5) {
            return;
        }
        const TARGET = projectile.path.to,
            PROGRESS = Math.min(1, projectile.elapsed / projectile.path.duration),
            RING_RADIUS = Math.max(projectile.radius * 1.3, 0.2);
        // A small broken gold arrival marker cannot be mistaken for the boss's red danger fill.
        for (let quadrant = 0; quadrant < 4; quadrant++) {
            const ANGLE = (quadrant * Math.PI) / 2;
            renderer.ring(
                TARGET.x,
                TARGET.y,
                RING_RADIUS,
                `rgba(194,153,50,${0.3 + PROGRESS * 0.4})`,
                0.025,
                ANGLE,
                ANGLE + Math.PI * 0.28,
            );
        }
    }

    draw(renderer, projectile, point, tail) {
        const SCALE = seedDisplayMultiplier(renderer, projectile),
            LENGTH = cornVisualHeight(projectile.cornForm) * WORLD_HEIGHT_PROJECTION * SCALE,
            WIDTH = LENGTH * 0.28,
            CENTER = { x: point.x, y: point.y - LENGTH * 0.5 },
            TAIL = renderer.project(tail.x, tail.y, tail.z),
            DX = point.x - TAIL.x,
            DY = point.y - TAIL.y,
            ANGLE = Math.abs(DX) + Math.abs(DY) > 0.001 ? Math.atan2(DY, DX) - Math.PI / 2 : 0;
        TAIL.y -= LENGTH * 0.5;
        if (projectile.cornForm >= 5) {
            drawMeteorTrail(renderer, CENTER, LENGTH, WIDTH, ANGLE, projectile.cornSlot);
        } else {
            renderer.line(TAIL, CENTER, (WIDTH * 0.24) / renderer.scale, '#c79f4970');
        }
        drawCob(renderer, CENTER, LENGTH, WIDTH, ANGLE);
    }
}

function drawCob(renderer, center, length, width, angle) {
    const COS = Math.cos(angle),
        SIN = Math.sin(angle),
        POINT = (x, y) => ({ x: center.x + x * COS - y * SIN, y: center.y + x * SIN + y * COS });
    // Three flared husks behind a long, tapered cob make this a distinct silhouette,
    // not a stretched seed. The nose follows the actual path tangent.
    drawLeaf(renderer, POINT, width, length, -1);
    drawLeaf(renderer, POINT, width, length, 1);
    renderer.ellipse(center.x, center.y, width, length * 0.49, '#775a23', angle);
    renderer.ellipse(center.x, center.y, width * 0.88, length * 0.46, '#edb93d', angle);
    for (let row = 0; row < 6; row++) {
        const Y = -length * 0.33 + (row * length * 0.64) / 5,
            ROW_WIDTH = width * (0.64 - Math.abs(row - 2.5) * 0.065);
        for (let column = 0; column < 3; column++) {
            const P = POINT((column - 1) * ROW_WIDTH, Y);
            renderer.ellipse(
                P.x,
                P.y,
                width * 0.23,
                length * 0.049,
                column === 0 ? '#ffdf76' : column === 1 ? '#f9ce55' : '#dba12e',
                angle,
            );
        }
    }
    const LEAF = [
        POINT(-width * 0.5, -length * 0.27),
        POINT(0, -length * 0.65),
        POINT(width * 0.33, -length * 0.25),
        POINT(0, length * 0.13),
    ];
    fillPolygon(renderer.ctx, LEAF, '#799548');
    renderer.line(POINT(0, -length * 0.48), POINT(0, length * 0.09), (width * 0.11) / renderer.scale, '#b5c56f');
}

function drawLeaf(renderer, point, width, length, side) {
    const POINTS = [
        point(side * width * 0.35, -length * 0.18),
        point(side * width * 1.55, -length * 0.62),
        point(side * width * 1.38, -length * 0.03),
        point(side * width * 0.52, length * 0.24),
    ];
    fillPolygon(renderer.ctx, POINTS, side < 0 ? '#6c873b' : '#8fa653');
}

function drawMeteorTrail(renderer, center, length, width, angle, slot) {
    const COS = Math.cos(angle),
        SIN = Math.sin(angle),
        DISTANCE = length * (0.8 + (slot || 0) * 0.1);
    // Only three narrow streaks per meteor. No screen-wide bloom or opaque danger cover.
    for (let index = -1; index <= 1; index++) {
        const OFFSET = index * width * 0.6,
            START = { x: center.x + OFFSET * COS, y: center.y + OFFSET * SIN },
            END = {
                x: START.x + DISTANCE * SIN,
                y: START.y - DISTANCE * COS,
            };
        renderer.line(
            END,
            START,
            (width * (index === 0 ? 0.5 : 0.2)) / renderer.scale,
            index === 0 ? '#f4ca6570' : '#e6af4350',
        );
    }
}

function fillPolygon(context, points, color) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index++) {
        context.lineTo(points[index].x, points[index].y);
    }
    context.closePath();
    context.fill();
}
