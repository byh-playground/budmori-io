import { WORLD_HEIGHT_PROJECTION } from '../../../vector-sockets.js';

export const FEATURE = Object.freeze({
    id: 'seed',
    landingEffect: 'shell-land',
    bodyHeightFraction: 0.2,
    widthToHeight: 0.7,
    rotation: 0.3,
});
const VERTICAL_EXTENT = Math.hypot(FEATURE.widthToHeight * Math.sin(FEATURE.rotation), Math.cos(FEATURE.rotation));
const HORIZONTAL_EXTENT = Math.hypot(FEATURE.widthToHeight * Math.cos(FEATURE.rotation), Math.sin(FEATURE.rotation));

export function seedEllipseRadii(projectile) {
    // The upright cylinder stores world-z height. Billboard pixels use .785;
    // compensate for the authored tilt so its visible vertical span is exact.
    const Y = (projectile.height * WORLD_HEIGHT_PROJECTION * 0.5) / VERTICAL_EXTENT;
    return { x: Y * FEATURE.widthToHeight, y: Y };
}
export function seedProjectileDimensions(unit) {
    const HEIGHT = unit.bodyHeight * FEATURE.bodyHeightFraction,
        RADII = seedEllipseRadii({ height: HEIGHT });
    // Snapshot at launch. Later growth, merging or owner removal cannot resize it.
    return { radius: RADII.y * HORIZONTAL_EXTENT, height: HEIGHT };
}
