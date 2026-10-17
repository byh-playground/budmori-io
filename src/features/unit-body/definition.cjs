'use strict';

const { WORLD_HEIGHT_PROJECTION } = require('../../vector-sockets.cjs');

// Neutral, named torso contours measured in the original SVG canvas, including
// their authored round stroke. Hats, leaves, weapons, limbs and grade outlines
// do not enlarge the body. Source identities are checked by the existing build.
const AUTHORED_BODIES = [
    {
        species: 0,
        asset: 'assets/troops/pea.svg',
        shapeId: 'body-outline',
        sourceSha256: 'ff9dbc01524d084635102cd5935928f54ba8507364e393552bf4e131caedab40',
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
        sourceSha256: 'ff9a4a17a517e4626b76fa9ffea9b9736a46f8206608e404feba5376f79da98f',
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
        sourceSha256: '2be6109c4f7bde4a956665dba42b81eeff5b548533e155bebdcccde37ac18684',
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
        sourceSha256: 'b427702d13ab21faf9d974c5acf54a308cb54f97918385290b7a18abc29e4f1a',
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
        sourceSha256: '8ae8527f9bd3c642b6b062fdb8b02669dc9043c9e7010a1a5957024ea41f1c15',
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
        sourceSha256: '01dff507e05f1c18dc83632520d0e478ad106be8c1783e4f7a11965209e5f5df',
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
        sourceSha256: 'bf3e3cb568c274a5d0a1d9c92b0ffcdb1fecb8ddf0f4bf50ef8e0883b64cdbf4',
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
        sourceSha256: '1307b9ccb40a3ad86eb21a092e0325afc8d857e27561437aecfdf353c28eeec6',
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
        sourceSha256: '23a1dbe97aa53f240881c05e7f5162b0757df90b6e7c5706aa50bd7ef58e76f1',
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

module.exports = {
    UNIT_BODIES,
    UNIT_BODY_CONFIG,
    unitBodyDefinition,
    unitVisualSize,
    unitVectorScale,
    unitBodyRadius,
    unitBodyHeight,
    unitTorsoHeight,
    maximumUnitRadius,
    unitDisplayScale,
    validateUnitBodySource,
};
