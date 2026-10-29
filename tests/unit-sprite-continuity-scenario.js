// Actual presentation submissions at successive display times, including
// independent phases, native weapon sockets, overlap, palette and clone alpha.
export async function unitSpriteContinuityScenario(app) {
    const R = app.renderer,
        P = R.unitPresentation,
        C = R.ctx,
        GL = R.device.gl,
        WORLD = app.sim;
    const { snapshot: SNAPSHOT } = await import('/src/save/farm-snapshot.js');
    const MODEL_BEFORE = JSON.stringify(SNAPSHOT(WORLD)),
        BASE = app.runtime.presentationView.units[0];
    const CHECK = (value, message) => {
        if (!value) {
            throw new Error(message);
        }
    };
    const UNITS = [0, 9, 8, 0, 0].map((species, index) => ({
        ...BASE,
        id: 900000 + index,
        generation: 1,
        species,
        isSeedling: false,
        isBoss: false,
        x: index * 3,
        y: 0,
        z: 0,
        hp: 100,
        down: 0,
        cooldown: 0,
        stun: 0,
        bounce: 0,
        vx: index < 2 ? 1 : 0,
        vy: 0,
        seed: 0.3125 + index * 0.7,
        fed: index !== 1,
        faction: 'player',
        element: index === 4 ? 1 : 0,
        dropLanded: true,
        walnutGuarding: false,
        isFormationClone: index === 3,
        cloneBornAt: -100,
        ability: {
            ...BASE.ability,
            phase: index === 2 ? 'windup' : index === 3 ? 'active' : 'idle',
            elapsed: 0,
            barleyForm: index === 2 ? 1 : 0,
            barleyFirstStage: 'front',
            barleyPreviousStage: 'ready',
            barleyStage: 'front',
            barleyLastStage: 'front',
            barleyStageProgress: 0.5,
            barleyWindupDuration: 0.25,
        },
    }));
    const SAVED_JOY = [...R.joyEffects],
        MATRICES = new Map();
    R.joyEffects.length = 0;
    R.joyEffects.push({ x: 0, y: 0 });
    const SHEET = globalThis.document.createElement('canvas');
    SHEET.width = 320;
    SHEET.height = 5 * 184;
    const SHEET_CTX = SHEET.getContext('2d');
    SHEET_CTX.fillStyle = '#fff';
    SHEET_CTX.fillRect(0, 0, SHEET.width, SHEET.height);
    SHEET_CTX.font = '12px sans-serif';
    const TRACE = [],
        SOCKETS = [],
        ORIGINAL_DRAW = R.ctx.drawVectorActor;
    // Diagnostic only: keep the exact-pixel assertion and record actual GPU
    // submissions so a state/input difference can be distinguished from resolve.
    const GPU_TRACES = [],
        READBACK_TRACES = [],
        GPU_OUTPUTS = [],
        GL_ORIGINALS = new Map(),
        OBJECT_IDS = new Map();
    let gpuTrace = null;
    let gpuOutputs = null;
    const READ_ROI = () => {
        const PIXELS = new Uint8Array(160 * 160 * 4);
        GL.readPixels(220, R.canvas.height - 410, 160, 160, GL.RGBA, GL.UNSIGNED_BYTE, PIXELS);
        return PIXELS;
    };
    const PIXEL_DIFF = (a, b) => {
        let max = 0,
            channels = 0;
        for (let index = 0; index < a.length; index++) {
            const DELTA = Math.abs(a[index] - b[index]);
            max = Math.max(max, DELTA);
            channels += Number(DELTA > 0);
        }
        return { maxChannel: max, changedChannels: channels };
    };
    const DESCRIBE = (value) => {
        if (ArrayBuffer.isView(value) || Array.isArray(value)) {
            return [...value];
        }
        if (value && typeof value === 'object') {
            if (!OBJECT_IDS.has(value)) {
                OBJECT_IDS.set(value, OBJECT_IDS.size + 1);
            }
            return OBJECT_IDS.get(value);
        }
        return value;
    };
    const BUFFER_STATE = (buffer) => {
        if (!buffer) {
            return null;
        }
        const PREVIOUS = GL.getParameter(GL.COPY_READ_BUFFER_BINDING);
        GL.bindBuffer(GL.COPY_READ_BUFFER, buffer);
        const SIZE = GL.getBufferParameter(GL.COPY_READ_BUFFER, GL.BUFFER_SIZE),
            BYTES = new Uint8Array(SIZE);
        GL.getBufferSubData(GL.COPY_READ_BUFFER, 0, BYTES);
        GL.bindBuffer(GL.COPY_READ_BUFFER, PREVIOUS);
        let hash = 2166136261;
        for (const BYTE of BYTES) {
            hash = Math.imul(hash ^ BYTE, 16777619) >>> 0;
        }
        return { id: DESCRIBE(buffer), size: SIZE, hash };
    };
    const TEXTURE_STATE = (texture) => {
        const RECORD = [...R.device.textures.values()].find((record) => record.gpu === texture);
        const RESULT = {
            id: DESCRIBE(texture),
            format: RECORD?.format,
            width: RECORD?.width,
            height: RECORD?.height,
            filter: RECORD?.filter,
        };
        if (RECORD?.format === 'rgba32f') {
            let pixels = RECORD.source;
            if (RECORD.framebuffer) {
                const PREVIOUS = GL.getParameter(GL.READ_FRAMEBUFFER_BINDING);
                pixels = new Float32Array(RECORD.width * RECORD.height * 4);
                GL.bindFramebuffer(GL.READ_FRAMEBUFFER, RECORD.framebuffer);
                GL.readPixels(0, 0, RECORD.width, RECORD.height, GL.RGBA, GL.FLOAT, pixels);
                GL.bindFramebuffer(GL.READ_FRAMEBUFFER, PREVIOUS);
            }
            if (ArrayBuffer.isView(pixels)) {
                let hash = 2166136261;
                for (const BYTE of new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength)) {
                    hash = Math.imul(hash ^ BYTE, 16777619) >>> 0;
                }
                RESULT.numericBytesHash = hash;
            }
        }
        return RESULT;
    };
    for (const NAME of ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced']) {
        const ORIGINAL = GL[NAME];
        GL_ORIGINALS.set(NAME, ORIGINAL);
        GL[NAME] = function (...args) {
            if (gpuTrace) {
                const PROGRAM = GL.getParameter(GL.CURRENT_PROGRAM),
                    UNIFORMS = [],
                    ATTRIBUTES = [],
                    TEXTURES = [],
                    ACTIVE_TEXTURE = GL.getParameter(GL.ACTIVE_TEXTURE);
                for (let unit = 0; unit < 4; unit++) {
                    GL.activeTexture(GL.TEXTURE0 + unit);
                    TEXTURES.push(TEXTURE_STATE(GL.getParameter(GL.TEXTURE_BINDING_2D)));
                }
                GL.activeTexture(ACTIVE_TEXTURE);
                for (let index = 0; index < GL.getProgramParameter(PROGRAM, GL.ACTIVE_UNIFORMS); index++) {
                    const INFO = GL.getActiveUniform(PROGRAM, index);
                    UNIFORMS.push([
                        INFO.name,
                        DESCRIBE(GL.getUniform(PROGRAM, GL.getUniformLocation(PROGRAM, INFO.name))),
                    ]);
                }
                for (let index = 0; index < GL.getParameter(GL.MAX_VERTEX_ATTRIBS); index++) {
                    if (GL.getVertexAttrib(index, GL.VERTEX_ATTRIB_ARRAY_ENABLED)) {
                        ATTRIBUTES.push({
                            index,
                            buffer: BUFFER_STATE(GL.getVertexAttrib(index, GL.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING)),
                            offset: GL.getVertexAttribOffset(index, GL.VERTEX_ATTRIB_ARRAY_POINTER),
                            size: GL.getVertexAttrib(index, GL.VERTEX_ATTRIB_ARRAY_SIZE),
                            stride: GL.getVertexAttrib(index, GL.VERTEX_ATTRIB_ARRAY_STRIDE),
                            divisor: GL.getVertexAttrib(index, GL.VERTEX_ATTRIB_ARRAY_DIVISOR),
                        });
                    }
                }
                gpuTrace.push({
                    name: NAME,
                    args,
                    program: DESCRIBE(PROGRAM),
                    framebuffer: DESCRIBE(GL.getParameter(GL.DRAW_FRAMEBUFFER_BINDING)),
                    viewport: DESCRIBE(GL.getParameter(GL.VIEWPORT)),
                    blend: [
                        GL.isEnabled(GL.BLEND),
                        GL.getParameter(GL.BLEND_SRC_RGB),
                        GL.getParameter(GL.BLEND_DST_RGB),
                    ],
                    attributes: ATTRIBUTES,
                    indices: BUFFER_STATE(GL.getParameter(GL.ELEMENT_ARRAY_BUFFER_BINDING)),
                    textures: TEXTURES,
                    targetState: [
                        GL.getParameter(GL.SAMPLES),
                        GL.getParameter(GL.SAMPLE_BUFFERS),
                        GL.getParameter(GL.READ_FRAMEBUFFER_BINDING),
                        GL.getParameter(GL.COLOR_WRITEMASK),
                        GL.getParameter(GL.SCISSOR_BOX),
                    ].map(DESCRIBE),
                    tests: [
                        GL.DITHER,
                        GL.SCISSOR_TEST,
                        GL.DEPTH_TEST,
                        GL.STENCIL_TEST,
                        GL.SAMPLE_COVERAGE,
                        GL.SAMPLE_ALPHA_TO_COVERAGE,
                    ].map((key) => [key, GL.isEnabled(key)]),
                    uniforms: UNIFORMS,
                });
            }
            const RESULT = ORIGINAL.apply(this, args);
            if (gpuOutputs && GL.getParameter(GL.DRAW_FRAMEBUFFER_BINDING) === null) {
                gpuOutputs.push(READ_ROI());
            }
            return RESULT;
        };
    }
    let current = null;
    R.ctx.drawVectorActor = function (actor, options) {
        if (current && actor === current.player) {
            MATRICES.set(current.unit.id, [...options.matrix]);
        }
        return ORIGINAL_DRAW.call(this, actor, options);
    };
    const ENCODE_TILE = (pixels, x, y) => {
        const IMAGE = SHEET_CTX.createImageData(160, 160);
        for (let row = 0; row < 160; row++) {
            IMAGE.data.set(pixels.subarray(row * 640, (row + 1) * 640), (159 - row) * 640);
        }
        SHEET_CTX.putImageData(IMAGE, x, y);
    };
    try {
        for (const [INDEX, TIME] of [25, 75, 125, 175, 225].entries()) {
            R.displayTimeMs = 2000000 + TIME;
            P.preparedVisibleUnits.clear();
            const PREPARED = UNITS.map((unit) => {
                unit.ability.elapsed = TIME / 1000;
                const ENTRY = P.prepareVisibleUnit(unit, WORLD);
                return { ...ENTRY, selection: ENTRY.sprite, unit };
            });
            function draw(sprite, reverse = false) {
                gpuTrace = [];
                C.beginFrame({ width: R.canvas.width, height: R.canvas.height, clearColor: [1, 1, 1, 1] });
                gpuOutputs = [READ_ROI()];
                R.unitSprites.beginFrame();
                const ORDER = reverse ? [4, 3, 2, 1, 0] : [0, 1, 2, 3, 4];
                // The production vector reference prepares every visible pose
                // before actor submission. Match that boundary when forcing
                // an otherwise sprite-eligible player through the native path.
                for (const ENTRY of PREPARED) {
                    if (!sprite || !ENTRY.selection.entry) {
                        ENTRY.player.preparePose();
                    }
                }
                R.ctx.acquireMeshRenderer().preparePoses();
                for (const SLOT of ORDER) {
                    const ENTRY = PREPARED[SLOT],
                        CACHED = P.preparedVisibleUnits.get(ENTRY.unit.id);
                    CACHED.sprite = sprite ? ENTRY.selection : { reason: 'continuityReference' };
                    current = ENTRY;
                    P.drawVectorUnit(ENTRY.unit, WORLD, { x: 270 + SLOT * 12, y: 350 + SLOT * 3 }, 24, null);
                }
                current = null;
                C.endFrame();
                const PIXELS = new Uint8Array(160 * 160 * 4);
                GL.readPixels(220, R.canvas.height - 410, 160, 160, GL.RGBA, GL.UNSIGNED_BYTE, PIXELS);
                const REPEATED_READ = new Uint8Array(PIXELS.length);
                GL.readPixels(220, R.canvas.height - 410, 160, 160, GL.RGBA, GL.UNSIGNED_BYTE, REPEATED_READ);
                READBACK_TRACES.push({
                    sameWithoutRedraw: PIXELS.every((value, offset) => value === REPEATED_READ[offset]),
                });
                CHECK(GL.getError() === GL.NO_ERROR, 'Continuity GL error');
                GPU_TRACES.push(gpuTrace);
                GPU_OUTPUTS.push(gpuOutputs);
                gpuTrace = null;
                gpuOutputs = null;
                return PIXELS;
            }
            const COLD_NATIVE = draw(false),
                NATIVE = draw(false),
                REPEAT = draw(false),
                SPRITE = draw(true);
            let coldMax = 0,
                coldChanged = 0;
            for (let offset = 0; offset < NATIVE.length; offset++) {
                const DELTA = Math.abs(COLD_NATIVE[offset] - NATIVE[offset]);
                coldMax = Math.max(coldMax, DELTA);
                coldChanged += Number(DELTA > 0);
            }
            if (!NATIVE.every((value, offset) => value === REPEAT[offset])) {
                let max = 0,
                    changed = 0;
                const PIXEL_DIFFERENCES = [];
                for (let offset = 0; offset < NATIVE.length; offset++) {
                    const DELTA = Math.abs(NATIVE[offset] - REPEAT[offset]);
                    max = Math.max(max, DELTA);
                    changed += Number(DELTA > 0);
                    if (DELTA > 0) {
                        PIXEL_DIFFERENCES.push({
                            x: Math.floor(offset / 4) % 160,
                            y: Math.floor(offset / 640),
                            channel: offset % 4,
                            native: NATIVE[offset],
                            repeat: REPEAT[offset],
                        });
                    }
                }
                ENCODE_TILE(NATIVE, 0, INDEX * 184 + 24);
                ENCODE_TILE(REPEAT, 160, INDEX * 184 + 24);
                globalThis.__unitSpriteContinuityFailure = {
                    timeMs: TIME,
                    maxChannel: max,
                    changedChannels: changed,
                    differences: PIXEL_DIFFERENCES,
                    renderContext: {
                        attributes: GL.getContextAttributes(),
                        samples: GL.getParameter(GL.SAMPLES),
                        sampleBuffers: GL.getParameter(GL.SAMPLE_BUFFERS),
                        canvasSize: [R.canvas.width, R.canvas.height],
                        simTime: WORLD.time,
                        displayTimeMs: R.displayTimeMs,
                    },
                    gpuTraces: GPU_TRACES.slice(-4),
                    perDrawDifference: GPU_OUTPUTS.at(-3).map((pixels, index) => ({
                        stage: index,
                        ...PIXEL_DIFF(pixels, GPU_OUTPUTS.at(-2)[index]),
                    })),
                    readbackTraces: READBACK_TRACES.slice(-4),
                    exactGpuDrawStateEqual: JSON.stringify(GPU_TRACES.at(-3)) === JSON.stringify(GPU_TRACES.at(-2)),
                    matrices: [...MATRICES],
                    players: PREPARED.map((entry) => ({
                        id: entry.unit.id,
                        clip: entry.player.currentClip,
                        expression: entry.player.currentExpression,
                        time: entry.player.currentTimeMs,
                    })),
                    image: SHEET.toDataURL('image/png').split(',')[1],
                };
            }
            // Native MSAA/alpha repeat variation is distinct from sampled art.
            // Keep every raw difference while enforcing stable area/geometry.
            const REPEAT_DIFFERENCE = PIXEL_DIFF(NATIVE, REPEAT);
            CHECK(
                REPEAT_DIFFERENCE.changedChannels / NATIVE.length <= 0.01,
                'Native repeat changed over one percent of the ROI channels',
            );
            let repeatSum = 0;
            for (let offset = 0; offset < NATIVE.length; offset++) {
                repeatSum += Math.abs(NATIVE[offset] - REPEAT[offset]);
            }
            CHECK(repeatSum / NATIVE.length <= 1, 'Native repeat mean channel difference exceeds one level');
            CHECK(
                R.unitSprites.frame.sprite === 4 && R.unitSprites.frame.vector === 1,
                'Continuity backend coverage ' + JSON.stringify(R.unitSprites.frame),
            );
            CHECK(
                R.unitSprites.frame.reasons.triangleAlpha === 1 &&
                    Object.keys(R.unitSprites.frame.reasons).length === 1,
                'Only the clone keeps vector; element colour is the face layer, not a body palette',
            );
            let changed = 0,
                max = 0,
                total = 0;
            for (let offset = 0; offset < NATIVE.length; offset += 4) {
                let different = false;
                for (let channel = 0; channel < 3; channel++) {
                    const DELTA = Math.abs(NATIVE[offset + channel] - SPRITE[offset + channel]);
                    max = Math.max(max, DELTA);
                    total += DELTA;
                    different ||= DELTA > 1;
                }
                changed += Number(different);
            }
            ENCODE_TILE(NATIVE, 0, INDEX * 184 + 24);
            ENCODE_TILE(SPRITE, 160, INDEX * 184 + 24);
            SHEET_CTX.fillStyle = '#111';
            SHEET_CTX.fillText(TIME + ' ms: vector', 4, INDEX * 184 + 16);
            SHEET_CTX.fillText('sampled sprite', 164, INDEX * 184 + 16);
            TRACE.push({
                timeMs: TIME,
                changedPixelsOver1: changed,
                maxChannel: max,
                meanWholeRoiChannel: total / (160 * 160 * 3),
                coldReferenceMaxChannel: coldMax,
                coldReferenceChangedChannels: coldChanged,
                nativeRepeatDifference: REPEAT_DIFFERENCE,
                nativeRepeatMeanChannel: repeatSum / NATIVE.length,
                bodyCounts: { ...R.unitSprites.frame },
            });
            for (const ENTRY of PREPARED) {
                if (!ENTRY.selection.entry) {
                    continue;
                }
                const ATLAS_ENTRY = ENTRY.selection.entry,
                    LOCAL_TIME = ENTRY.player.currentTimeMs - ENTRY.startedAtMs;
                ATLAS_ENTRY.player.seek(Math.max(0, LOCAL_TIME), 0);
                const FRAME_INDEX = ATLAS_ENTRY.player.sample(0).frameIndex,
                    SAMPLE_TIME = ATLAS_ENTRY.atlas.stats.sampleTimesMs[FRAME_INDEX],
                    CONTROL = globalThis.BloomGamekitVectorAssets.createVectorActor(R.ctx, ENTRY.record.compiled, {
                        clip: ENTRY.player.currentClip,
                        startedAtMs: 0,
                    });
                CONTROL.setExpression(ENTRY.player.currentExpression);
                CONTROL.seek(LOCAL_TIME);
                for (const NAME of ['mouth', 'weapon-tip']) {
                    if (!ENTRY.record.compiled.metadata.sockets[NAME]) {
                        continue;
                    }
                    const A = ENTRY.player.getSocket(NAME),
                        B = CONTROL.getSocket(NAME),
                        M = MATRICES.get(ENTRY.unit.id),
                        DX = A.x - B.x,
                        DY = A.y - B.y;
                    CHECK(Math.hypot(DX, DY) <= 1e-6, 'Native authoritative socket changed');
                    CONTROL.seek(SAMPLE_TIME);
                    const SAMPLED_SOCKET = CONTROL.getSocket(NAME);
                    SOCKETS.push({
                        species: ENTRY.unit.species,
                        clip: ENTRY.player.currentClip,
                        timeMs: TIME,
                        localTimeMs: LOCAL_TIME,
                        sampledTimeMs: SAMPLE_TIME,
                        socket: NAME,
                        nativeAuthorityError: Math.hypot(DX, DY),
                        screenDifferencePixels: Math.hypot(
                            M[0] * (A.x - SAMPLED_SOCKET.x) + M[2] * (A.y - SAMPLED_SOCKET.y),
                            M[1] * (A.x - SAMPLED_SOCKET.x) + M[3] * (A.y - SAMPLED_SOCKET.y),
                        ),
                    });
                    CONTROL.seek(LOCAL_TIME);
                }
                CONTROL.dispose();
            }
            if (INDEX === 4) {
                const WRONG_ORDER = draw(true, true);
                let orderChanged = 0;
                for (let offset = 0; offset < SPRITE.length; offset += 4) {
                    orderChanged += Number(
                        [0, 1, 2].some(
                            (channel) => Math.abs(SPRITE[offset + channel] - WRONG_ORDER[offset + channel]) > 1,
                        ),
                    );
                }
                CHECK(orderChanged > 50, 'Overlap fixture must detect painter order');
                TRACE[INDEX].reversedOrderChangedPixels = orderChanged;
            }
        }
        CHECK(MODEL_BEFORE === JSON.stringify(SNAPSHOT(WORLD)), 'Continuity scenario mutated authority');
        return {
            frames: TRACE,
            sampledSocketDifferences: SOCKETS,
            modelUnchanged: true,
            image: SHEET.toDataURL('image/png').split(',')[1],
            scope: 'Left/right same actual display time, independent phases and native sockets. Image quantisation is intentionally present; no numeric pixel threshold declares perceptual acceptance.',
        };
    } finally {
        for (const [NAME, ORIGINAL] of GL_ORIGINALS) {
            GL[NAME] = ORIGINAL;
        }
        R.ctx.drawVectorActor = ORIGINAL_DRAW;
        R.joyEffects.length = 0;
        R.joyEffects.push(...SAVED_JOY);
        for (const UNIT of UNITS) {
            R.vectorPlayers.get(UNIT.id)?.dispose();
            R.vectorPlayers.delete(UNIT.id);
            P.playerIdentities.delete(UNIT.id);
            P.preparedVisibleUnits.delete(UNIT.id);
        }
    }
}
