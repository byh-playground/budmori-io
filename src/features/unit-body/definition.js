import { WORLD_HEIGHT_PROJECTION, bossVectorScale as BOSS_VECTOR_SCALE } from '../../vector-sockets.js';

// Neutral, named torso contours measured in the original SVG canvas, including
// their authored round stroke. Hats, leaves, weapons, limbs and grade outlines
// do not enlarge the body. Source identities are checked by the existing build.
const AUTHORED_BODIES = [
    {
        species: 0,
        asset: 'assets/troops/pea.svg',
        shapeId: 'body-outline',
        sourceSha256: '4d4d6311b69aafb79bf271deea9c0898a2de81c46137503df23041ea843b0365',
        viewBox: [0.0, 0.0, 320.0, 350.0],
        bounds: {
            left: 57.00453577435779,
            top: 103.16243270259355,
            right: 278.93153243769814,
            bottom: 312.75,
        },
        ground: {
            x: 160.0,
            y: 350,
        },
        mouth: {
            x: 176.0,
            y: 211.76175,
        },
    },
    {
        species: 1,
        asset: 'assets/troops/corn-kernel.svg',
        shapeId: 'corn-body-outline',
        sourceSha256: 'ffa82f15e14bef8e9d450a5f105bb66d66cbe18022c948c8a27740eaaf065790',
        viewBox: [0.0, 0.0, 285.0, 295.0],
        bounds: {
            left: 23.038415422304524,
            top: 7.394271983516546,
            right: 258.5,
            bottom: 243.25,
        },
        ground: {
            x: 142.5,
            y: 295,
        },
        mouth: {
            x: 140.0,
            y: 113.6965,
        },
    },
    {
        species: 2,
        asset: 'assets/troops/kidney-bean.svg',
        shapeId: 'bean-body-outline',
        sourceSha256: '201e77f6097da10d06b5aea94437b146a213e59a50cf3b81ddc57fe3157f713e',
        viewBox: [0.0, 0.0, 260.0, 320.0],
        bounds: {
            left: 35.860000000000014,
            top: 12.298798725449615,
            right: 223.18548295320454,
            bottom: 279.2683248982993,
        },
        ground: {
            x: 130.0,
            y: 320,
        },
        mouth: {
            x: 119.0,
            y: 110.4355,
        },
    },
    {
        species: 3,
        asset: 'assets/troops/chestnut.svg',
        shapeId: 'chestnut-shell',
        sourceSha256: 'a35483cf970c33886b311346d2032df16275cb7382d80f91581b35bb36248ee1',
        viewBox: [0.0, 0.0, 320.0, 300.0],
        bounds: {
            left: 38.666666666666664,
            top: 19.0,
            right: 281.3333333333333,
            bottom: 233.0,
        },
        ground: {
            x: 160,
            y: 261,
        },
        mouth: {
            x: 160.0,
            y: 140.0,
        },
    },
    {
        species: 4,
        asset: 'assets/troops/peanut.svg',
        shapeId: 'peanut-pod-outline',
        sourceSha256: '79c2dc3bdb2f576662fd620b8b1be8795a33399fdfe42e527e8e8eeaae782c84',
        viewBox: [0.0, 0.0, 320.0, 300.0],
        bounds: {
            left: 101.3125,
            top: 63.5,
            right: 215.25,
            bottom: 252.4375,
        },
        ground: {
            x: 160,
            y: 269,
        },
        mouth: {
            x: 160.0,
            y: 139.42,
        },
    },
    {
        species: 5,
        asset: 'assets/troops/walnut.svg',
        shapeId: 'walnut-body-outline',
        sourceSha256: '6f3f16d7548daa981439764dd2646817349dfd644f6d8e8f4beb1defe9342c57',
        viewBox: [0.0, 0.0, 320.0, 300.0],
        bounds: {
            left: 83.5,
            top: 71.0,
            right: 247.75,
            bottom: 252.75,
        },
        ground: {
            x: 160,
            y: 273,
        },
        mouth: {
            x: 160.0,
            y: 161.0,
        },
    },
    {
        species: 6,
        asset: 'assets/troops/rice.svg',
        shapeId: 'rice-body-outline',
        sourceSha256: '5aef9bd138b053edc1f87908dffb623139d981c401aa21e6b59e401edd484de2',
        viewBox: [0.0, 0.0, 320.0, 350.0],
        bounds: {
            left: 70.60885389809643,
            top: 80.465,
            right: 244.56002549222026,
            bottom: 308.5244145408352,
        },
        ground: {
            x: 160,
            y: 320,
        },
        mouth: {
            x: 159.0,
            y: 181.0,
        },
    },
    {
        species: 7,
        asset: 'assets/troops/wheat.svg',
        shapeId: 'wheat-grain-outline',
        sourceSha256: '4bcb07c0d461f030e9fb54d0709cc162d3ef33514f21b5c691574fecf6628697',
        viewBox: [0.0, 0.0, 320.0, 350.0],
        bounds: {
            left: 85.19999999999996,
            top: 41.26666666666667,
            right: 221.6,
            bottom: 303.6,
        },
        ground: {
            x: 160,
            y: 320,
        },
        mouth: {
            x: 153.0,
            y: 173.0,
        },
    },
    {
        species: 8,
        asset: 'assets/troops/barley.svg',
        shapeId: 'barley-seed-outline',
        sourceSha256: 'b91f433fd962b33dca843436712f12658565a0818161442f9674ffdc8ea3fb8d',
        viewBox: [0.0, 0.0, 320.0, 350.0],
        bounds: {
            left: 69.30899999999998,
            top: 101.629,
            right: 252.47099999999998,
            bottom: 297.4735,
        },
        ground: {
            x: 160,
            y: 320,
        },
        mouth: {
            x: 160.0,
            y: 171.85,
        },
    },
];
const UNIT_BODIES = Object.freeze(
    AUTHORED_BODIES.map((body) =>
        Object.freeze({
            ...body,
            viewBox: Object.freeze(body.viewBox),
            bounds: Object.freeze(body.bounds),
            ground: Object.freeze(body.ground),
            mouth: Object.freeze(body.mouth),
        }),
    ),
);
const UNIT_BODY_CONFIG = Object.freeze({
    baseSize: 0.55,
    sizePerTier: 0.1,
    birthScale: 0.5,
    vectorRadiusScale: 0.78,
});

function unitBodyDefinition(species) {
    const BODY = UNIT_BODIES[species];
    if (!BODY) {
        throw new RangeError('Missing authored unit body for species ' + species);
    }
    return BODY;
}
function unitVisualSize(unit) {
    const MATURE = unit.growthElapsed >= unit.growthDuration - 1e-9,
        GROWTH =
            MATURE || !(unit.growthDuration > 0)
                ? 1
                : Math.max(0, Math.min(1, unit.growthElapsed / unit.growthDuration));
    return (
        (UNIT_BODY_CONFIG.baseSize + UNIT_BODY_CONFIG.sizePerTier * unit.tier) *
        (UNIT_BODY_CONFIG.birthScale + (1 - UNIT_BODY_CONFIG.birthScale) * GROWTH)
    );
}
function unitVectorScale(unit) {
    const BODY = unitBodyDefinition(unit.species);
    return (unitVisualSize(unit) * 2 * UNIT_BODY_CONFIG.vectorRadiusScale) / Math.max(BODY.viewBox[2], BODY.viewBox[3]);
}
function bodyRadiusAtScale(body, scale) {
    // The ground root remains the simulation position. A circular footprint
    // encloses the asymmetric authored torso around that root.
    return Math.max(body.ground.x - body.bounds.left, body.bounds.right - body.ground.x) * scale;
}
function unitBodyRadius(unit) {
    return bodyRadiusAtScale(unitBodyDefinition(unit.species), unitVectorScale(unit));
}
function unitBodyHeight(unit) {
    const BODY = unitBodyDefinition(unit.species);
    return ((BODY.ground.y - BODY.bounds.top) * unitVectorScale(unit)) / WORLD_HEIGHT_PROJECTION;
}
// A boss is drawn from the same authored troop art as a unit, only larger, so its drawn body is measured the same way:
// the torso bounds times the boss vector scale. That drawn body is the boss `radius`/`height`: hit volume and display agree.
function bossBodyHeight(boss) {
    const BODY = unitBodyDefinition(boss.species);
    return ((BODY.ground.y - BODY.bounds.top) * BOSS_VECTOR_SCALE()) / WORLD_HEIGHT_PROJECTION;
}
function bossBodyRadius(boss) {
    return bodyRadiusAtScale(unitBodyDefinition(boss.species), BOSS_VECTOR_SCALE());
}
function unitTorsoHeight(unit) {
    const BODY = unitBodyDefinition(unit.species);
    return ((BODY.bounds.bottom - BODY.bounds.top) * unitVectorScale(unit)) / WORLD_HEIGHT_PROJECTION;
}
function maximumUnitRadius(tier) {
    return Math.max(
        ...UNIT_BODIES.map((body) =>
            unitBodyRadius({
                species: body.species,
                tier,
                growthElapsed: 1,
                growthDuration: 1,
            }),
        ),
    );
}
function unitDisplayScale(body, vectorScale, pixelsPerWorldUnit, minimumRadiusPixels) {
    return Math.max(
        vectorScale * pixelsPerWorldUnit,
        (2 * minimumRadiusPixels) / Math.max(body.viewBox[2], body.viewBox[3]),
    );
}
function validateUnitBodySource(species, source) {
    const BODY = unitBodyDefinition(species);
    if (source.sha256 !== BODY.sourceSha256 || source.file !== BODY.asset) {
        throw new Error('Authored unit body must be remeasured after SVG changes: ' + BODY.asset);
    }
}

export {
    UNIT_BODIES,
    UNIT_BODY_CONFIG,
    unitBodyDefinition,
    unitVisualSize,
    unitVectorScale,
    unitBodyRadius,
    unitBodyHeight,
    bossBodyHeight,
    bossBodyRadius,
    unitTorsoHeight,
    maximumUnitRadius,
    unitDisplayScale,
    validateUnitBodySource,
};
