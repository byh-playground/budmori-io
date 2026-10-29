// Images are prepared outside ordinary scene submission. Native players retain
// the exact game clock and sockets; sampled art never feeds authority back.
const IMAGE_BUDGET_BYTES = 128 * 1024 * 1024;
const IMAGE_SIZE = 96;
// The shared device atlas holds every baked sheet, so the byte budget is its layer count.
const ATLAS_LAYER = { width: 2048, height: 1024 };
export const UNIT_SPRITE_ATLAS = Object.freeze({
    ...ATLAS_LAYER,
    layers: IMAGE_BUDGET_BYTES / (ATLAS_LAYER.width * ATLAS_LAYER.height * 4),
});
// Keep at least two prepared texels per displayed source unit. Larger actors
// (zoom, DPR, giant) retain native vector detail rather than magnifying a sheet.
const MAX_DISPLAY_TO_IMAGE_SCALE = 0.5;
// Faces are a separate layer drawn over the sampled body, so one body expression per clip is baked.
const BAKED_EXPRESSION = 'neutral';

export class UnitSpriteAtlas {
    constructor(renderer, enabled) {
        this.renderer = renderer;
        this.enabled = enabled;
        this.entries = new Map();
        this.manifest = [];
        this.imageBytes = 0;
        this.plannedImageBytes = 0;
        this.bakeCount = 0;
        this.preparationCpuMs = 0;
        this.restoreGeneration = -1;
        this.frame = { sprite: 0, vector: 0, reasons: {} };
        this.disposed = false;
    }
    *preparationSteps() {
        if (!this.enabled || this.disposed) {
            return;
        }
        const R = this.renderer,
            GENERATION = R.device.stats.restores ?? 0;
        if (GENERATION === this.restoreGeneration) {
            return;
        }
        if (!this.entries.size) {
            const { createVectorSpriteAtlas: CREATE_ATLAS } = globalThis.BloomGamekitVectorAssets;
            // Prepare every species' common face combinations first. The fixed
            // image budget then selects remaining clips; rejected entries keep
            // their real expression and use the native path, never a neutral lie.
            const SOURCES = [...R.vectorAssets].flatMap(([species, record]) =>
                Object.entries(record.compiled.metadata.clips).map(([clip, definition]) => ({
                    species,
                    record,
                    clip,
                    definition,
                })),
            );
            const PRIORITY = (clip) => (['idle', 'walk'].includes(clip) ? 0 : /^(windup|fire)/.test(clip) ? 1 : 2);
            SOURCES.sort((a, b) => PRIORITY(a.clip) - PRIORITY(b.clip));
            const TOTAL = SOURCES.length;
            let planned = 0;
            yield { stage: 'atlas-plan', completed: 0, total: TOTAL };
            for (const { species: SPECIES, record: RECORD, clip: CLIP, definition: DEFINITION } of SOURCES) {
                const PPU = IMAGE_SIZE / Math.max(RECORD.compiled.viewBox[2], RECORD.compiled.viewBox[3]);
                // Only authored 1000ms weapon stages use normalized time.
                // Peanut's short -tN clips retain their real-time sampling.
                const INTERVAL = CLIP.includes('-') && DEFINITION.durationMs === 1000 ? 100 : 50;
                for (const EXPRESSION of [BAKED_EXPRESSION]) {
                    const ATLAS = CREATE_ATLAS(R.ctx, RECORD.compiled, {
                        clip: CLIP,
                        expression: EXPRESSION,
                        sampleIntervalMs: INTERVAL,
                        pixelsPerUnit: PPU,
                        supersample: 4,
                    });
                    const PLAN = ATLAS.stats,
                        KEY = `${SPECIES}:${CLIP}:${EXPRESSION}`;
                    const ENTRY = {
                        atlas: ATLAS,
                        animation: null,
                        player: null,
                        region: null,
                        pixelsPerUnit: PPU,
                        ready: false,
                        reason: PLAN.reason,
                        bytes: PLAN.atlasBytes,
                    };
                    if (!ENTRY.reason && this.plannedImageBytes + ENTRY.bytes > IMAGE_BUDGET_BYTES) {
                        ENTRY.reason = 'imageBudget';
                    }
                    if (ENTRY.reason) {
                        ATLAS.dispose();
                        ENTRY.atlas = null;
                    } else {
                        this.plannedImageBytes += ENTRY.bytes;
                    }
                    this.entries.set(KEY, ENTRY);
                    this.manifest.push({
                        species: SPECIES,
                        clip: CLIP,
                        expression: EXPRESSION,
                        palette: 0,
                        sampleIntervalMs: INTERVAL,
                        pixelsPerUnit: PPU,
                        frames: PLAN.frameCount,
                        bytes: ENTRY.bytes,
                        reason: ENTRY.reason,
                    });
                    yield { stage: 'atlas-plan', completed: ++planned, total: TOTAL };
                }
            }
        }
        const { createSpriteAnimation: CREATE_ANIMATION } = globalThis.BloomGamekitRendering;
        this.imageBytes = 0;
        const TOTAL = [...this.entries.values()].filter((entry) => entry.atlas).length;
        let completed = 0;
        yield { stage: 'atlas', completed, total: TOTAL };
        for (const [KEY, ENTRY] of this.entries) {
            if (!ENTRY.atlas) {
                continue;
            }
            const BEFORE = ENTRY.atlas.stats.bakeCount,
                RESULT = ENTRY.atlas.bake();
            this.bakeCount += ENTRY.atlas.stats.bakeCount - BEFORE;
            this.imageBytes += ENTRY.atlas.stats.allocatedBytes;
            ENTRY.ready = RESULT.backend === 'sprite';
            ENTRY.reason = RESULT.reason;
            if (ENTRY.ready && ENTRY.region !== ENTRY.atlas.region) {
                ENTRY.animation?.dispose();
                ENTRY.region = ENTRY.atlas.region;
                ENTRY.animation = CREATE_ANIMATION(R.ctx, ENTRY.atlas.region, ENTRY.atlas.definition);
                ENTRY.player = ENTRY.animation.createPlayer({ clip: KEY.split(':')[1] });
            }
            yield { stage: 'atlas', completed: ++completed, total: TOTAL };
        }
        this.restoreGeneration = GENERATION;
    }
    prepare() {
        if (!this.enabled || this.disposed || this.restoreGeneration === (this.renderer.device.stats.restores ?? 0)) {
            return;
        }
        const START = performance.now();
        try {
            const STEPS = this.preparationSteps();
            while (!STEPS.next().done) {
                // Context restoration and direct renderer consumers stay synchronous.
            }
        } finally {
            this.preparationCpuMs += performance.now() - START;
        }
    }
    async prepareAsync({ onProgress, yieldControl }) {
        const STEPS = this.preparationSteps(),
            GENERATION = this.renderer.device.stats.restores ?? 0;
        let yieldedAt = performance.now();
        let stage = null;
        try {
            for (;;) {
                if (
                    this.disposed ||
                    this.renderer.device.state !== 'ready' ||
                    this.renderer.device.gl.isContextLost() ||
                    (this.renderer.device.stats.restores ?? 0) !== GENERATION
                ) {
                    throw new Error('Graphics became unavailable during animation preparation');
                }
                const START = performance.now();
                const NEXT = STEPS.next();
                if (NEXT.done) {
                    break;
                }
                this.preparationCpuMs += performance.now() - START;
                onProgress?.(NEXT.value.stage, NEXT.value.completed, NEXT.value.total);
                if (stage !== NEXT.value.stage || performance.now() - yieldedAt >= 32) {
                    await yieldControl();
                    yieldedAt = performance.now();
                    stage = NEXT.value.stage;
                }
            }
        } finally {
            STEPS.return();
        }
    }
    beginFrame() {
        this.frame = { sprite: 0, vector: 0, reasons: {} };
    }
    resolve(unit, prepared, displayScale) {
        if (!this.enabled) {
            return { reason: this.renderer.unitArtMode };
        }
        if (unit.isBoss) {
            return { reason: 'dynamicBoss' };
        }
        // Applying global alpha to a flattened image differs from applying it
        // to each original overlapping triangle. Keep that original contract.
        if (unit.isFormationClone) {
            return { reason: 'triangleAlpha' };
        }
        if (!unit.isSeedling && unit.species === 7 && unit.ability.wheatLongBaton) {
            return { reason: 'dynamicBasePose' };
        }
        const SPECIES = unit.isSeedling ? 9 : unit.species,
            ENTRY = this.entries.get(`${SPECIES}:${prepared.player.currentClip}:${prepared.player.currentExpression}`);
        if (ENTRY && displayScale > ENTRY.pixelsPerUnit * MAX_DISPLAY_TO_IMAGE_SCALE) {
            return { reason: 'magnification' };
        }
        return ENTRY?.ready ? { entry: ENTRY } : { reason: ENTRY?.reason || 'expressionNotPrepared' };
    }
    draw(prepared, options) {
        const SELECTION = prepared.sprite;
        if (!SELECTION?.entry) {
            const REASON = SELECTION?.reason || 'notPrepared';
            this.frame.vector++;
            this.frame.reasons[REASON] = (this.frame.reasons[REASON] || 0) + 1;
            return false;
        }
        const ENTRY = SELECTION.entry,
            M = options.matrix,
            PPU = ENTRY.pixelsPerUnit,
            CLIP = prepared.clip;
        if (Math.max(Math.hypot(M[0], M[1]), Math.hypot(M[2], M[3])) > PPU * MAX_DISPLAY_TO_IMAGE_SCALE) {
            this.frame.vector++;
            this.frame.reasons.magnification = (this.frame.reasons.magnification || 0) + 1;
            return false;
        }
        let elapsed = prepared.player.currentTimeMs - prepared.startedAtMs;
        if (CLIP.loop !== 'once') {
            const PERIOD = CLIP.durationMs * (CLIP.loop === 'alternate' ? 2 : 1);
            elapsed = ((elapsed % PERIOD) + PERIOD) % PERIOD;
        }
        ENTRY.player.seek(Math.max(0, elapsed), 0);
        ENTRY.player.draw({
            ...options,
            timeMs: 0,
            matrix: [M[0] / PPU, M[1] / PPU, M[2] / PPU, M[3] / PPU, M[4], M[5]],
        });
        this.frame.sprite++;
        return true;
    }
    stats() {
        return {
            enabled: this.enabled,
            imageBudgetBytes: IMAGE_BUDGET_BYTES,
            imageBytes: this.imageBytes,
            plannedImageBytes: this.plannedImageBytes,
            maxDisplayToImageScale: MAX_DISPLAY_TO_IMAGE_SCALE,
            manifestEntries: this.manifest.length,
            bakeCount: this.bakeCount,
            preparationCpuMs: this.preparationCpuMs,
            bossVectorActors: this.renderer.displayBosses?.length ?? 0,
            bodySubmissionSpriteRatio:
                this.frame.sprite + this.frame.vector
                    ? this.frame.sprite / (this.frame.sprite + this.frame.vector)
                    : null,
            restoreGeneration: this.restoreGeneration,
            ...this.frame,
        };
    }
    dispose() {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        for (const ENTRY of this.entries.values()) {
            ENTRY.animation?.dispose();
            ENTRY.atlas?.dispose();
        }
        this.entries.clear();
        this.manifest.length = 0;
        this.imageBytes = 0;
    }
}
