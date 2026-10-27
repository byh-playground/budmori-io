import { WORLD_HEIGHT_PROJECTION, bossVectorScale as BOSS_VECTOR_SCALE } from '../../vector-sockets.js';

// Neutral, named torso contours measured in the original SVG canvas, including
// their authored round stroke. Hats, leaves, weapons, limbs and grade outlines
// do not enlarge the body. Source identities are checked against the original SVG assets.
const AUTHORED_BODIES = [
    {
        species: 0,
        asset: 'assets/troops/pea.svg',
        shapeId: 'body-outline',
        sourceSha256: 'f3f3d480579373ba7fe4bb7961de59c80b81db6cf08153d75ebe842d0845ce1e',
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
        sourceSha256: 'b52e2d449019b9b8c360682b5d3b8acb055d5882fa490c1f08c2d78deb81c638',
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
        sourceSha256: 'f0d1d868b79ce229282c003a1a947fe18398ecf33d7794d1482cc3d8f5392299',
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
        sourceSha256: '4f34092a1823e87bd2e52a8d25ed1c50f8768573fc607aae6119800821d9b24f',
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
        sourceSha256: 'f25ceef51ad77d946631178b2fa8dcf25aa832637855870689d928918817e2ea',
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
        sourceSha256: 'd0a54fea5ea28b86e2f6b4f67d3e9e9bebeafc09439bb7a1378c13398780e5e6',
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
        sourceSha256: 'cac2d8f9fcad42d2e3053fe8e38bd72f35cc0ac0d26441935ed9d5a1ae6dff03',
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
        sourceSha256: 'eb8ed59e463927ff72b21ad09b30f8aab9cb323b2bb719b32a6ae1c6ebbe0710',
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
        sourceSha256: 'dd25d37aebc1ad04f3e0fe11a27cb1d2a62931e3b2db8186d2ebce7b0d1a4494',
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
    {
        species: 9,
        asset: 'assets/troops/sprout.svg',
        shapeId: 'body-outline',
        sourceSha256: '393781e60efc1b1d0f1330d81bd5f3d7ca275903360c65808d539f275562f08c',
        viewBox: [0.0, 0.0, 320.0, 350.0],
        bounds: {
            left: 62.600001930191,
            top: 130.0000035762787,
            right: 253.4000095129013,
            bottom: 329.8000115056,
        },
        ground: {
            x: 160.0,
            y: 350,
        },
        mouth: {
            x: 160.7,
            y: 254.2,
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
function bossTorsoHeight(boss) {
    const BODY = unitBodyDefinition(boss.species);
    return ((BODY.bounds.bottom - BODY.bounds.top) * BOSS_VECTOR_SCALE()) / WORLD_HEIGHT_PROJECTION;
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
    bossTorsoHeight,
    unitTorsoHeight,
    maximumUnitRadius,
    unitDisplayScale,
    validateUnitBodySource,
};
