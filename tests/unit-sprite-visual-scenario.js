// Fixed presentation user flow; these are detached display DTOs, never model actors.
export function unitSpriteVisualScenario(app) {
    const R = app.renderer,
        C = R.ctx,
        GL = R.device.gl,
        P = R.unitPresentation,
        WORLD = app.sim,
        BASE = app.runtime.presentationView.units[0],
        TRACE = [],
        OBSERVATIONS = [];
    const CHECK = (value, message) => {
        if (!value) {
            throw new Error(message);
        }
    };
    const CASES = [];
    for (let species = 0; species < 10; species++) {
        for (const MOTION of ['idle', 'walk', 'windup', 'fire']) {
            CASES.push({ species, motion: MOTION });
        }
    }
    CASES.push(
        { species: 8, motion: 'windup', nativeBarley: true },
        { species: 8, motion: 'fire', nativeBarley: true },
        { species: 0, motion: 'walk', element: 1, expectedFallback: 'paletteNotPrepared' },
        { species: 0, motion: 'fire', clone: true, expectedFallback: 'triangleAlpha' },
        { species: 7, motion: 'walk', longBaton: true, expectedFallback: 'dynamicBasePose' },
        { species: 0, motion: 'walk', large: true },
    );
    const IMAGES = [];
    function png(bytes) {
        const CANVAS = globalThis.document.createElement('canvas');
        CANVAS.width = CANVAS.height = 240;
        const CONTEXT = CANVAS.getContext('2d'),
            IMAGE = CONTEXT.createImageData(240, 240);
        for (let row = 0; row < 240; row++) {
            IMAGE.data.set(bytes.subarray(row * 960, (row + 1) * 960), (239 - row) * 960);
        }
        CONTEXT.putImageData(IMAGE, 0, 0);
        return CANVAS.toDataURL('image/png').split(',')[1];
    }
    for (let index = 0; index < CASES.length; index++) {
        const CASE = CASES[index],
            UNIT = {
                ...BASE,
                id: 800000 + index,
                species: CASE.species,
                generation: 1,
                seed: 0.3125,
                isSeedling: false,
                isBoss: false,
                hp: 100,
                down: 0,
                fed: true,
                stun: 0,
                bounce: 0,
                z: 0,
                vx: CASE.motion === 'walk' ? 1 : 0,
                vy: 0,
                dropLanded: true,
                walnutGuarding: false,
                faction: 'player',
                element: CASE.element || 0,
                isFormationClone: !!CASE.clone,
                cloneBornAt: -100,
                ability: {
                    ...BASE.ability,
                    phase: CASE.motion === 'windup' ? 'windup' : CASE.motion === 'fire' ? 'active' : 'idle',
                    elapsed: 0.125,
                    wheatLongBaton: !!CASE.longBaton,
                    barleyForm: CASE.nativeBarley ? 1 : 0,
                    barleyFirstStage: 'front',
                    barleyStage: 'front',
                    barleyPreviousStage: 'ready',
                    barleyLastStage: 'front',
                    barleyStageProgress: 0.5,
                    barleyWindupDuration: 0.25,
                },
            };
        R.displayTimeMs = 1000000;
        const PREPARED = P.prepareVisibleUnit(UNIT, WORLD),
            SELECTION = PREPARED.sprite,
            SAMPLED = SELECTION.entry;
        CHECK(
            CASE.expectedFallback ? SELECTION.reason === CASE.expectedFallback : !!SAMPLED,
            'Unexpected art backend for ' + JSON.stringify(CASE) + ': ' + SELECTION.reason,
        );
        let sampleTimeMs = null;
        if (SAMPLED) {
            // Compare original and flattened art at the SAME authored sample.
            // Moving-frame temporal quantisation is a separate disclosed cost.
            const STATS = SAMPLED.atlas.stats,
                TIMES = STATS.sampleTimesMs,
                TARGET = PREPARED.player.currentTimeMs - PREPARED.startedAtMs;
            sampleTimeMs = TIMES.reduce((best, time) =>
                Math.abs(time - TARGET) < Math.abs(best - TARGET) ? time : best,
            );
            PREPARED.player.seek(PREPARED.startedAtMs + sampleTimeMs);
        }
        let nativeMatrix = null,
            spriteMatrix = null,
            spriteRect = null;
        const DRAW_MESH = R.meshes.drawMesh;
        R.meshes.drawMesh = function (mesh, options) {
            if (mesh === PREPARED.record.asset.mesh) {
                nativeMatrix = [...options.matrix];
            } else if (SAMPLED && options.texture === SAMPLED.atlas.texture) {
                spriteMatrix = [...options.matrix];
                spriteRect = [...options.localRect];
            }
            return DRAW_MESH.call(this, mesh, options);
        };
        function pixels(sprite) {
            C.beginFrame({ width: R.canvas.width, height: R.canvas.height, clearColor: [1, 1, 1, 1] });
            PREPARED.sprite = sprite ? SELECTION : { reason: 'visualReference' };
            R.unitSprites.beginFrame();
            P.drawVectorUnit(UNIT, WORLD, { x: 300, y: 350 }, CASE.large ? 48 : 24, null);
            C.endFrame();
            const BYTES = new Uint8Array(240 * 240 * 4);
            GL.readPixels(180, R.canvas.height - 430, 240, 240, GL.RGBA, GL.UNSIGNED_BYTE, BYTES);
            CHECK(GL.getError() === GL.NO_ERROR, 'Visual fixture GL error');
            return BYTES;
        }
        const VECTOR = pixels(false),
            REPEATED_VECTOR = pixels(false),
            CANDIDATE = pixels(true);
        R.meshes.drawMesh = DRAW_MESH;
        const REPEAT_MAX = VECTOR.reduce(
            (maximum, value, offset) => Math.max(maximum, Math.abs(value - REPEATED_VECTOR[offset])),
            0,
        );
        CHECK(
            CASE.large
                ? R.unitSprites.frame.reasons.magnification === 1
                : CASE.expectedFallback
                  ? R.unitSprites.frame.vector === 1
                  : R.unitSprites.frame.sprite === 1,
            'Actual sprite/fallback draw coverage mismatch',
        );
        let max = 0,
            total = 0,
            covered = 0,
            changed = 0,
            maskIntersection = 0,
            repeatTotal = 0;
        let interiorTotal = 0,
            interiorPixels = 0,
            interiorMax = 0,
            edgeChanged = 0;
        const BOUNDS = (bytes) => {
            const RESULT = { minX: 240, minY: 240, maxX: -1, maxY: -1 };
            for (let pixel = 0; pixel < bytes.length; pixel += 4) {
                if ([0, 1, 2].some((channel) => bytes[pixel + channel] < 250)) {
                    const X = (pixel / 4) % 240,
                        Y = Math.floor(pixel / 960);
                    RESULT.minX = Math.min(RESULT.minX, X);
                    RESULT.maxX = Math.max(RESULT.maxX, X);
                    RESULT.minY = Math.min(RESULT.minY, Y);
                    RESULT.maxY = Math.max(RESULT.maxY, Y);
                }
            }
            return RESULT;
        };
        const FLAT = (bytes, pixel) => {
            const X = (pixel / 4) % 240,
                Y = Math.floor(pixel / 960);
            if (X === 0 || X === 239 || Y === 0 || Y === 239) {
                return false;
            }
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    for (let channel = 0; channel < 3; channel++) {
                        if (Math.abs(bytes[pixel + dy * 960 + dx * 4 + channel] - bytes[pixel + channel]) > 1) {
                            return false;
                        }
                    }
                }
            }
            return true;
        };
        for (let pixel = 0; pixel < VECTOR.length; pixel += 4) {
            const NATIVE_COVERED = [0, 1, 2].some((channel) => VECTOR[pixel + channel] < 250),
                SPRITE_COVERED = [0, 1, 2].some((channel) => CANDIDATE[pixel + channel] < 250);
            maskIntersection += Number(NATIVE_COVERED && SPRITE_COVERED);
            if ([0, 1, 2].some((channel) => VECTOR[pixel + channel] < 250 || CANDIDATE[pixel + channel] < 250)) {
                covered++;
                let different = false;
                for (let channel = 0; channel < 3; channel++) {
                    const DELTA = Math.abs(VECTOR[pixel + channel] - CANDIDATE[pixel + channel]);
                    total += DELTA;
                    max = Math.max(max, DELTA);
                    repeatTotal += Math.abs(VECTOR[pixel + channel] - REPEATED_VECTOR[pixel + channel]);
                    different ||= DELTA > 1;
                }
                changed += Number(different);
                if (different && (!FLAT(VECTOR, pixel) || !FLAT(CANDIDATE, pixel))) {
                    edgeChanged++;
                }
                if (FLAT(VECTOR, pixel)) {
                    interiorPixels++;
                    for (let channel = 0; channel < 3; channel++) {
                        const DELTA = Math.abs(VECTOR[pixel + channel] - CANDIDATE[pixel + channel]);
                        interiorTotal += DELTA;
                        interiorMax = Math.max(interiorMax, DELTA);
                    }
                }
            }
        }
        CHECK(covered > 100, 'Missing character pixels');
        const MEAN = total / (covered * 3);
        if (MEAN > 8) {
            OBSERVATIONS.push({ ...CASE, mean: MEAN, reason: 'legacySameSampleMeanOver8' });
        }
        const ALIGNMENTS = [];
        if (SAMPLED && !CASE.large) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    let difference = 0;
                    for (let y = 1; y < 239; y++) {
                        for (let x = 1; x < 239; x++) {
                            for (let channel = 0; channel < 3; channel++) {
                                difference += Math.abs(
                                    VECTOR[(y * 240 + x) * 4 + channel] -
                                        CANDIDATE[((y + dy) * 240 + x + dx) * 4 + channel],
                                );
                            }
                        }
                    }
                    ALIGNMENTS.push({ dx, dy, difference });
                }
            }
        }
        ALIGNMENTS.sort((a, b) => a.difference - b.difference);
        const PPU = SAMPLED?.pixelsPerUnit,
            ROOT_MATRIX_ERROR =
                spriteMatrix && nativeMatrix
                    ? Math.max(
                          ...nativeMatrix.map((value, offset) =>
                              Math.abs(value - spriteMatrix[offset] * (offset < 4 ? PPU : 1)),
                          ),
                      )
                    : null;
        const NATIVE_BOUNDS = BOUNDS(VECTOR),
            SPRITE_BOUNDS = BOUNDS(CANDIDATE),
            REPEAT_BOUNDS = BOUNDS(REPEATED_VECTOR),
            BOUNDS_ERROR = Math.max(
                ...Object.keys(NATIVE_BOUNDS).map((key) => Math.abs(NATIVE_BOUNDS[key] - SPRITE_BOUNDS[key])),
            ),
            REPEAT_BOUNDS_ERROR = Math.max(
                ...Object.keys(NATIVE_BOUNDS).map((key) => Math.abs(NATIVE_BOUNDS[key] - REPEAT_BOUNDS[key])),
            ),
            INTERIOR_MEAN = interiorPixels ? interiorTotal / (interiorPixels * 3) : null;
        CHECK(
            REPEAT_BOUNDS_ERROR <= 1 && repeatTotal / (covered * 3) <= 1,
            'Native repeat geometry/area colour changed',
        );
        CHECK(BOUNDS_ERROR <= 2, 'Character position/size changed by more than two screen pixels');
        CHECK(maskIntersection / covered >= 0.8, 'Character silhouette content missing');
        CHECK(INTERIOR_MEAN === null || INTERIOR_MEAN <= 2, 'Flat interior colour changed');
        if (SAMPLED && !CASE.large) {
            CHECK(ROOT_MATRIX_ERROR <= 1e-6, 'Sprite root transform changed');
            CHECK(ALIGNMENTS[0].dx === 0 && ALIGNMENTS[0].dy === 0, 'Sprite integer alignment changed');
        }
        TRACE.push({
            ...CASE,
            backend: SAMPLED ? 'sprite' : 'vector',
            reason: SELECTION.reason ?? null,
            sampleTimeMs,
            meanCoveredChannelDifference: MEAN,
            maxChannelDifference: max,
            coveredPixels: covered,
            changedPixelsOver1: changed,
            originalRepeatMaxChannel: REPEAT_MAX,
            nativeBounds: NATIVE_BOUNDS,
            spriteBounds: SPRITE_BOUNDS,
            boundsErrorPixels: BOUNDS_ERROR,
            silhouetteIntersectionOverUnion: maskIntersection / covered,
            nativeRepeatBoundsErrorPixels: REPEAT_BOUNDS_ERROR,
            nativeRepeatMeanCoveredChannel: repeatTotal / (covered * 3),
            nativeFlatInteriorMean: INTERIOR_MEAN,
            nativeFlatInteriorMax: interiorMax,
            nativeFlatInteriorPixels: interiorPixels,
            edgeChangedFraction: changed ? edgeChanged / changed : 0,
            bestIntegerAlignment: ALIGNMENTS[0] ?? null,
            rootMatrixError: ROOT_MATRIX_ERROR,
            nativeMatrix,
            spriteMatrix,
            spriteRect,
        });
        if (CASE.species === 0 || CASE.nativeBarley || MEAN > 8) {
            IMAGES.push({
                name: index + '-' + CASE.species + '-' + CASE.motion,
                vector: png(VECTOR),
                sprite: png(CANDIDATE),
            });
        }
        R.vectorPlayers.get(UNIT.id)?.dispose();
        R.vectorPlayers.delete(UNIT.id);
        P.playerIdentities.delete(UNIT.id);
        P.preparedVisibleUnits.delete(UNIT.id);
    }
    return {
        cases: TRACE,
        observations: OBSERVATIONS,
        contract: {
            rootMatrixError: 1e-6,
            screenBoundsErrorPixels: 2,
            silhouetteIntersectionOverUnion: 0.8,
            flatInteriorMeanChannelError: 2,
            nativeRepeatBoundsErrorPixels: 1,
            nativeRepeatMeanCoveredChannelError: 1,
            pixelDifference: 'diagnostic; legacy 8/255 observations retained separately',
        },
        images: IMAGES,
    };
}
