// Verify conservative envelopes against the actual pinned native player's
// interpolated part matrices and every compiled vertex, including both morphs.
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.BloomGamekitDeterministic = await import('../vendor/upstream/deterministic.js');
globalThis.BloomGamekitWorkScheduler = await import('../vendor/upstream/work-scheduler.js');
const { createVectorAssetLoader: CREATE_LOADER } = await import('../vendor/upstream/vector-assets-loader.js'),
    { createVectorAsset: CREATE_ASSET } = await import('../vendor/upstream/vector-assets.js'),
    { UNIT_BODIES } = await import('../src/features/unit-body/definition.js'),
    {
        unitArtRadius: ART_RADIUS,
        unitMayBeVisible: UNIT_VISIBLE,
        effectMayBeVisible: EFFECT_VISIBLE,
    } = await import('../src/farm-render-visibility.js'),
    LOADER = CREATE_LOADER({ fetch: async (url) => new Response(fs.readFileSync(new URL(url))) }),
    MESHES = { createMesh: (geometry) => geometry, drawMesh() {}, deleteMesh() {} },
    OUTPUT = new URL('./output/render-visibility/', import.meta.url),
    REPORT = { status: 'running', species: [], poses: 0, vertices: 0 };

for (const BODY of UNIT_BODIES) {
    const COMPILED = await LOADER.load(new URL(`../${BODY.asset}`, import.meta.url), {
            sourcePath: BODY.asset,
            expectedSha256: BODY.sourceSha256,
            curveSegments: 2,
            strokeArcDivisions: 2,
        }),
        ASSET = CREATE_ASSET(MESHES, COMPILED),
        PLAYER = ASSET.createPlayer({ clip: 'idle', startedAtMs: 0 }),
        RADIUS = ART_RADIUS(COMPILED, BODY.ground),
        V = COMPILED.geometry.vertices;
    assert.ok(Number.isFinite(RADIUS), `known authored species ${BODY.species} has a finite envelope`);
    if (BODY.species === 7) {
        PLAYER.setBasePose('command-baton', { scaleX: 1.3, scaleY: 1.3 });
    }
    let maximum = 0;
    for (const [NAME, CLIP] of Object.entries(COMPILED.metadata.clips)) {
        PLAYER.play(NAME, 0);
        const TIMES = new Set([0, CLIP.durationMs]);
        for (let frame = 1; frame < CLIP.keyframes.length; frame++) {
            const START = CLIP.keyframes[frame - 1].timeMs,
                END = CLIP.keyframes[frame].timeMs;
            for (const FRACTION of [0, 0.25, 0.5, 0.75, 1]) {
                TIMES.add(START + (END - START) * FRACTION);
            }
        }
        for (const TIME of TIMES) {
            PLAYER.seek(TIME);
            const POSES = PLAYER.partPoses();
            REPORT.poses++;
            for (let offset = 0; offset < V.length; offset += 11) {
                const M = POSES[V[offset + 10]].transform;
                // The authored sketch morph traverses this triangle; testing all
                // three vertices also bounds every convex interpolation inside.
                for (const MORPH of [0, 1, 2]) {
                    const X = V[offset] + (MORPH ? V[offset + 4 + MORPH * 2] : 0),
                        Y = V[offset + 1] + (MORPH ? V[offset + 5 + MORPH * 2] : 0),
                        DX = M[0] * X + M[2] * Y + M[4] - BODY.ground.x,
                        DY = M[1] * X + M[3] * Y + M[5] - BODY.ground.y,
                        DISTANCE = Math.hypot(DX, DY);
                    assert.ok(
                        DISTANCE <= RADIUS + 1e-6,
                        `${BODY.species}/${NAME}/${TIME}: native vertex outside envelope`,
                    );
                    maximum = Math.max(maximum, DISTANCE);
                }
                REPORT.vertices++;
            }
        }
    }
    REPORT.species.push({ species: BODY.species, radius: RADIUS, largestSampledRadius: maximum });
    const RENDERER = {
            canvas: { width: 390, height: 844 },
            scale: 10,
            offset: [0, 0],
            view: [19.5, 42.2],
            pixelRatio: 1,
            cornAttachmentBodies: new Map(),
            vectorAssets: new Map([[BODY.species, { compiled: COMPILED }]]),
            minimumUnitPixels: () => 11,
        },
        UNIT = {
            id: 1,
            species: BODY.species,
            x: 0,
            y: 0,
            z: 0,
            size: 1,
            radius: 0.5,
            height: 1,
            bodyScale: 0.005,
            hp: 1,
            dropLanded: true,
            ability: { phase: 'idle' },
        };
    assert.equal(UNIT_VISIBLE(RENDERER, UNIT, { time: 1 }), true);
    UNIT.x = 1000;
    assert.equal(UNIT_VISIBLE(RENDERER, UNIT, { time: 1 }), false);
    RENDERER.cornAttachmentBodies.set(1, null);
    assert.equal(UNIT_VISIBLE(RENDERER, UNIT, { time: 1 }), true, 'corn target kept even with distant root');
    RENDERER.cornAttachmentBodies.clear();
    UNIT.barleyArmorShredTotal = 1;
    assert.equal(UNIT_VISIBLE(RENDERER, UNIT, { time: 1 }), true, 'independent text extent remains visible');
    UNIT.barleyArmorShredTotal = 0;
    UNIT.x = 0;
    UNIT.y = -100;
    UNIT.z = 80;
    assert.equal(UNIT_VISIBLE(RENDERER, UNIT, { time: 1 }), true, 'airborne body remains when ground is outside');
    UNIT.y = 0;
    UNIT.z = 1000;
    assert.equal(UNIT_VISIBLE(RENDERER, UNIT, { time: 1 }), true, 'ground remains when airborne body is outside');
    if (BODY.species >= 6) {
        UNIT.x = 1000;
        UNIT.ability.phase = 'active';
        assert.equal(UNIT_VISIBLE(RENDERER, UNIT, { time: 1 }), true, 'active melee trail sampling remains live');
    }
    assert.equal(EFFECT_VISIBLE(RENDERER, { kind: 'unknown', x: 1000, y: 0 }), true);
    assert.equal(EFFECT_VISIBLE(RENDERER, { kind: 'impact', x: 1000, y: 0 }), false);
    assert.equal(EFFECT_VISIBLE(RENDERER, { kind: 'thresh', x: 0, y: 0 }), true);
    assert.equal(
        ART_RADIUS({ ...COMPILED, geometry: { ...COMPILED.geometry, nonScalingStroke: true } }, BODY.ground),
        Infinity,
    );
    PLAYER.dispose();
    ASSET.dispose();
}
LOADER.dispose();
REPORT.status = 'passed';
fs.mkdirSync(OUTPUT, { recursive: true });
fs.writeFileSync(new URL('report.json', OUTPUT), `${JSON.stringify(REPORT, null, 2)}\n`);
console.log(JSON.stringify(REPORT));
