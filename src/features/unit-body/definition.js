import { WORLD_HEIGHT_PROJECTION, bossVectorScale as BOSS_VECTOR_SCALE } from '../../vector-sockets.js';

// Neutral, named torso contours measured in the original SVG canvas, including
// their authored round stroke. Hats, leaves, weapons, limbs and grade outlines
// do not enlarge the body. Source identities are checked against the original SVG assets.
const AUTHORED_BODIES = [
    {
        species: 0,
        asset: 'assets/troops/pea.svg',
        shapeId: 'body-outline',
        sourceSha256: '3d11c0bef609432dfc375d6f77f4e0995dd02d860f49b3bd6f5d6413a66062f6',
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
        sourceSha256: '885de67bc288faa9a155310ed0cb018f22a018adccf3a2415506a063d8af812a',
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
        sourceSha256: '7a8c3abeb8e8390c12f63cb182d640512478c3b91f8b65f731845ca261761331',
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
        sourceSha256: '31204217947db20fdf4a60072d8527e17894cae7a44654761ff1d7c4e729f5e5',
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
        sourceSha256: '9c758723459c227f422b25c783a056f9eca9d6117a2adce47ac39a7c8c60f150',
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
        sourceSha256: 'f1f07b15a41ad7461156945293608142fbf660bc17a51896cdbaafb589b307c7',
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
        sourceSha256: '6976724f66805c497e348600f45bbb6064649a89e73122f54e6d360581282ae4',
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
        sourceSha256: 'ae8b5e13138529f7de1aabcaa17487531f37527897b84e937c90f98d57954a09',
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
        sourceSha256: '43fd62e24d7b95e685716377acf6c720a8ac07bfa6ed4f8c563c10ee5864a6e4',
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
        sourceSha256: '4c18589cd791c270c8349fac2acd01777c4ea4803b856720a4146214dc8dc5e6',
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
