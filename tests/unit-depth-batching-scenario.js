// One fixed native presentation flow compares the original painter order with grouped body submission. Fixtures are
// detached display DTOs: this scenario never changes the model or adds a product-side rendering/debug mode.
export async function unitDepthBatchingScenario(app) {
    const R = app.renderer,
        C = R.ctx,
        GL = R.device.gl,
        WORLD = app.sim,
        BASE_VIEW = app.runtime.presentationView,
        BASE = BASE_VIEW.units[0],
        DRAW_ACTORS = R.drawActors,
        { snapshot: SNAPSHOT } = await import('/src/save/farm-snapshot.js'),
        MODEL_BEFORE = JSON.stringify(SNAPSHOT(WORLD)),
        CASES = [],
        IMAGES = [];
    const CHECK = (value, message) => {
        if (!value) {
            throw new Error(message);
        }
    };
    CHECK(R.unitArtMode !== 'sprite', 'Depth scene exercises production native vector bodies');
    let nextId = 950000;
    function unit(species, x, y, extra = {}) {
        const { ability: ABILITY = {}, ...FIELDS } = extra;
        return {
            ...BASE,
            id: nextId++,
            generation: 1,
            species,
            seed: 0.3125,
            isSeedling: false,
            isBoss: false,
            x,
            y,
            z: 0,
            vz: 0,
            vx: 0,
            vy: 0,
            hp: 100,
            down: 0,
            cooldown: 0,
            stun: 0,
            bounce: 0,
            fed: true,
            faction: 'player',
            element: 0,
            dropLanded: true,
            walnutGuarding: false,
            bodyScale: BASE.bodyScale * 4,
            size: BASE.size * 4,
            radius: BASE.radius * 4,
            height: BASE.height * 4,
            isFormationClone: false,
            cloneBornAt: -100,
            ...FIELDS,
            ability: {
                ...BASE.ability,
                phase: 'idle',
                elapsed: 0,
                peanutForm: 0,
                riceForm: 0,
                wheatForm: 0,
                barleyForm: 0,
                walnutForm: 0,
                ...ABILITY,
            },
        };
    }
    const MIXED = Array.from({ length: 30 }, (_, index) =>
        unit(index % 10, ((index % 5) - 2) * 0.18, (Math.floor(index / 5) - 2.5) * 0.16, {
            element: (index % 5) + 1,
            vx: index % 3 === 0 ? 1 : 0,
        }),
    );
    const SCENES = [
        { name: 'mixed-species-overlap', units: MIXED, expectReduction: true },
        {
            name: 'reversed-depth-and-equal-depth-id',
            units: MIXED.map((entry, index) => ({
                ...entry,
                id: 960000 - index,
                y: index % 2 ? -entry.y : 0,
                ability: { ...entry.ability },
            })),
        },
        {
            name: 'clone-alpha-front-and-back',
            units: [
                unit(0, 0, 0.25),
                unit(2, 0.05, 0.15, { isFormationClone: true }),
                unit(3, -0.05, 0.05, { isFormationClone: true }),
                unit(1, 0, -0.05),
                unit(0, 0.04, -0.15, { isFormationClone: true }),
            ],
        },
        {
            name: 'hidden-shell-parts',
            units: [unit(1, 0, 0.2), unit(4, 0, 0), unit(2, 0.06, -0.2)],
        },
        {
            name: 'fading-shell-parts',
            units: [
                unit(1, 0, 0.2),
                unit(4, 0, 0, { ability: { phase: 'windup', elapsed: 0.12 } }),
                unit(2, 0.06, -0.2),
            ],
        },
        {
            name: 'translucent-body-decoration',
            units: [unit(0, 0, 0.12), unit(7, 0.02, 0.06), unit(8, 0, 0), unit(2, -0.02, -0.06)],
        },
        {
            name: 'ordered-only-translucent-bodies',
            units: [
                unit(4, 0, 0.12),
                unit(7, 0.02, 0.06),
                unit(8, 0, 0),
                unit(2, -0.02, -0.06, { isFormationClone: true }),
            ],
        },
        {
            name: 'giant-vector-face',
            expectVectorFace: true,
            units: [
                unit(1, 0, 0.4),
                unit(0, 0, 0, {
                    bodyScale: BASE.bodyScale * 20,
                    size: BASE.size * 20,
                    radius: BASE.radius * 20,
                    height: BASE.height * 20,
                    giantUntil: BASE_VIEW.time + 100,
                    giantSizeMultiplier: 10,
                    element: 1,
                }),
                unit(3, 0.1, -0.3),
            ],
        },
        {
            name: 'pile-food-rear-front-and-passive-marks',
            units: [
                unit(0, -0.2, 0.3, {
                    buffed: true,
                    commandBeatLife: 0.5,
                    ability: { phase: 'windup', elapsed: 0.17 },
                }),
                unit(2, 0.2, -0.2, { resolveOn: true, vengeanceStacks: 2, openingLeft: 1 }),
                unit(1, -0.15, -0.25, { element: 2, lastStandOn: true }),
            ],
            piles: [{ id: 950001, x: 0, y: 0, food: 100, maxFood: 100, stack: 3, hitRev: 0 }],
            food: [
                { id: 950002, x: 0.15, y: 0.2, z: 0.4, vx: 1, vy: 0, vz: -1, phase: 'flight' },
                { id: 950003, x: -0.15, y: -0.3, z: 0, vx: 0, vy: 0, vz: 0, phase: 'ground' },
            ],
        },
    ];
    function painterActors(view) {
        for (const ACTOR of this.actors) {
            if (!ACTOR.culled) {
                ACTOR.presentation.draw(ACTOR.source, view);
            }
        }
    }
    function capture(view, optimized) {
        R.drawActors = optimized ? DRAW_ACTORS : painterActors;
        const DRAW_FACE = R.unitOverlays.drawFace;
        let vectorFaces = 0;
        R.unitOverlays.drawFace = function (...args) {
            const RESULT = DRAW_FACE.apply(this, args);
            vectorFaces += Number(!RESULT);
            return RESULT;
        };
        try {
            R.render(view, null, 2000000);
        } finally {
            R.unitOverlays.drawFace = DRAW_FACE;
        }
        const PIXELS = new Uint8Array(R.canvas.width * R.canvas.height * 4);
        GL.readPixels(0, 0, R.canvas.width, R.canvas.height, GL.RGBA, GL.UNSIGNED_BYTE, PIXELS);
        CHECK(GL.getError() === GL.NO_ERROR, 'Depth scene GL error');
        return {
            pixels: PIXELS,
            image: R.canvas.toDataURL('image/png').split(',')[1],
            drawCalls: R.device.stats.drawCalls,
            meshDraws: R.ctx.stats().mesh.draws,
            vectorFaces,
        };
    }
    try {
        for (const SCENE of SCENES) {
            const FIELDS = {
                units: SCENE.units,
                bosses: [],
                boss: null,
                effects: [],
                formationEffects: [],
                food: SCENE.food || [],
                projectiles: [],
                piles: SCENE.piles || [],
                mergeTasks: [],
                cornAttachments: { groups: [] },
                farmBossEvent: { phase: 'idle' },
            };
            const VIEW = Object.create(
                BASE_VIEW,
                Object.fromEntries(
                    Object.entries(FIELDS).map(([key, value]) => [key, { value, writable: true, enumerable: true }]),
                ),
            );
            // Warm the same native poses and presentation caches before comparing identical display time/DTOs.
            capture(VIEW, false);
            const REFERENCE = capture(VIEW, false),
                CANDIDATE = capture(VIEW, true);
            let changed = 0,
                maxChannel = 0;
            for (let offset = 0; offset < REFERENCE.pixels.length; offset++) {
                const DELTA = Math.abs(REFERENCE.pixels[offset] - CANDIDATE.pixels[offset]);
                changed += Number(DELTA > 0);
                maxChannel = Math.max(maxChannel, DELTA);
            }
            const OBSERVATION = {
                name: SCENE.name,
                units: SCENE.units.length,
                changedChannels: changed,
                maxChannel,
                referenceDrawCalls: REFERENCE.drawCalls,
                groupedDrawCalls: CANDIDATE.drawCalls,
                groupedMeshDraws: CANDIDATE.meshDraws,
                vectorFaces: CANDIDATE.vectorFaces,
            };
            CASES.push(OBSERVATION);
            IMAGES.push({ name: SCENE.name, before: REFERENCE.image, after: CANDIDATE.image });
            if (changed) {
                globalThis.__unitDepthBatchingFailure = { ...OBSERVATION, images: IMAGES.slice(-1) };
            }
            CHECK(changed === 0, `Depth batching changed painter-order pixels: ${JSON.stringify(OBSERVATION)}`);
            CHECK(CANDIDATE.drawCalls <= REFERENCE.drawCalls, 'Depth batching added submission boundaries');
            if (SCENE.expectReduction) {
                CHECK(CANDIDATE.drawCalls < REFERENCE.drawCalls, 'Grouped native body scene did not reduce calls');
            }
            if (SCENE.expectVectorFace) {
                CHECK(CANDIDATE.vectorFaces > 0, 'Giant scene did not exercise the vector face representation');
            }
        }
        CHECK(MODEL_BEFORE === JSON.stringify(SNAPSHOT(WORLD)), 'Depth scene changed authoritative model');
        return {
            seed: 0.3125,
            displayTimeMs: 2000000,
            width: R.canvas.width,
            height: R.canvas.height,
            dpr: globalThis.devicePixelRatio,
            depthBuffer: GL.getContextAttributes().depth,
            renderDidNotMutate: true,
            cases: CASES,
            images: IMAGES,
        };
    } finally {
        R.drawActors = DRAW_ACTORS;
        C.depthTest = false;
        C.depthWrite = false;
        C.depth = 0;
    }
}
