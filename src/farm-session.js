import { Garden, bindPresentationClock } from './farm-model.js';
import { baseUnitStatsFor } from './unit-stats.js';
import { BarleyArmorShredModel } from './features/abilities/barley-shred/model.js';
const { PresentationRuntime: PRESENTATION_RUNTIME, RenderObject: RENDER_OBJECT } = globalThis.BloomGamekitInterpolation;
const R = RENDER_OBJECT;
const PRESENTATION_STEP_MS = 50;
const LOCAL_PROFILE = Object.freeze({
    tickRate: 20,
    maxCatchupSteps: 4,
});
const LOCAL_INPUT = new Uint8Array(0);
const ADVANCED = Object.freeze({
    status: 'advanced',
});
const CLOSED = Object.freeze({
    status: 'closed',
});

// Health changes can interpolate while alive; death/revival must snap as one
// state boundary so a 0→60 down reset never looks like half-completed sleep.
class UnitRender extends RENDER_OBJECT {
    static renderSchema = Object.freeze({
        id: R.STEP,
        x: R.POSITION_X,
        y: R.POSITION_Y,
        z: R.POSITION_Z,
        angle: R.ANGLE,
        vx: R.LINEAR,
        vy: R.LINEAR,
        hp: R.LINEAR,
        down: R.LINEAR,
        isDowned: R.STATE_KEY,
        stun: R.LINEAR,
        flash: R.LINEAR,
        bounce: R.LINEAR,
        'ability.phase': R.STATE_KEY,
        'ability.elapsed': R.LINEAR,
        'ability.peanutStrikeCount': R.STEP,
        walnutGuarding: R.STEP,
        cooldown: R.LINEAR,
        cooldownDuration: R.STEP,
        meals: R.STEP,
        species: R.STEP,
        tier: R.STEP,
        seed: R.STEP,
        size: R.LINEAR,
        bodyScale: R.LINEAR,
        height: R.LINEAR,
        radius: R.LINEAR,
        maxHp: R.STEP,
        fed: R.STEP,
        ownerId: R.STATE_KEY,
        faction: R.STEP,
        farmId: R.STEP,
        dropLanded: R.STEP,
        buffed: R.STEP,
        isBattleOnlySummon: R.STEP,
        isFormationClone: R.STEP,
        giantUntil: R.STEP,
        giantEndedAt: R.STEP,
        cloneParentId: R.STEP,
        cloneBornAt: R.STEP,
        barleyArmorShredTotal: R.STEP,
    });
    constructor() {
        super();
        this.ability = {};
    }
    update(u, world) {
        this.id = u.id;
        this.x = u.x;
        this.y = u.y;
        this.z = u.z;
        this.angle = u.angle;
        this.vx = u.vx;
        this.vy = u.vy;
        this.hp = u.hp;
        this.down = u.down;
        this.isDowned = u.hp <= 0;
        this.stun = u.stun;
        this.flash = u.flash;
        this.bounce = u.bounce;
        this.ability.phase = u.ability.phase;
        this.ability.elapsed = u.ability.elapsed;
        this.ability.peanutStrikeCount = u.ability.action?.peanutStrikeCount || 2;
        this.walnutGuarding = !!u.ability.isGuarding?.(world.simulationTick);
        this.cooldown = u.cooldown;
        this.cooldownDuration = u.cooldownDuration;
        this.meals = u.meals;
        this.species = u.species;
        this.tier = u.tier;
        this.seed = u.seed;
        this.size = u.size;
        this.bodyScale = u.bodyScale;
        this.height = u.height;
        this.radius = u.radius;
        this.maxHp = u.isFormationClone ? 1 : baseUnitStatsFor(u.tier, u.species).maxHp;
        this.fed = u.fed;
        this.ownerId = u.ownerId;
        this.faction = u.faction;
        this.farmId = u.farmId;
        this.dropLanded = u.dropLanded;
        this.buffed = world.time < (world.raidRoster(u.ownerId)?.buffUntil || 0);
        this.isBattleOnlySummon = u.isBattleOnlySummon;
        this.isFormationClone = u.isFormationClone;
        this.giantUntil = u.giantUntil;
        this.giantEndedAt = u.giantEndedAt;
        this.cloneParentId = u.battleSummonParentId;
        this.cloneBornAt = u.cloneBornAt;
        this.barleyArmorShredTotal = BarleyArmorShredModel.total(u, world.simulationTick);
    }
}
class BossRender extends RENDER_OBJECT {
    static renderSchema = Object.freeze({
        x: R.POSITION_X,
        y: R.POSITION_Y,
        z: R.POSITION_Z,
        angle: R.ANGLE,
        startAngle: R.ANGLE,
        phase: R.STATE_KEY,
        clock: R.LINEAR,
        travel: R.LINEAR,
        hp: R.LINEAR,
        maxHp: R.STEP,
        radius: R.STEP,
        height: R.STEP,
        flash: R.LINEAR,
        species: R.STEP,
        patternId: R.STATE_KEY,
        patternPhase: R.STATE_KEY,
        patternPhaseElapsed: R.LINEAR,
        patternAim: R.ANGLE,
        patternLocked: R.STEP,
        patternTargetId: R.STEP,
        patternTargetX: R.STEP,
        patternTargetY: R.STEP,
        patternTargetZ: R.STEP,
        stage: R.STEP,
        patternStartX: R.STEP,
        patternStartY: R.STEP,
        patternStartZ: R.STEP,
        patternVolleyCount: R.STEP,
        patternReleased: R.STEP,
        patternTraveled: R.LINEAR,
        summonMouthX: R.STEP,
        summonMouthY: R.STEP,
        summonMouthZ: R.STEP,
        barleyArmorShredTotal: R.STEP,
    });
    update(b, world) {
        const ACTION = b.patternRuntime.active,
            EVENT = world.farmBossEvent,
            TARGET = ACTION?.target || null,
            START = ACTION?.start || null,
            MOUTH = b.summonMouth || {},
            ENDED =
                world.scene === 'raid' && !b.active
                    ? world.notices.findLast((e) => e.kind === 'victory' || e.kind === 'defeat')
                    : null;
        this.x = b.x;
        this.y = b.y;
        this.z = b.z;
        this.angle = b.angle;
        this.startAngle = b.startAngle;
        this.phase = ACTION?.phase || (!b.active || EVENT?.phase === 'dropping' ? 'resting' : 'chase');
        this.clock =
            ACTION?.phaseElapsed ??
            (EVENT.phase === 'celebrating' || EVENT.phase === 'fading'
                ? EVENT.elapsed
                : ENDED?.bossPatternElapsed || 0);
        this.travel = b.travel || 0;
        this.hp = b.hp;
        this.maxHp = b.maxHp;
        this.radius = b.radius;
        this.height = b.height;
        this.flash = b.flash;
        this.species = b.species ?? 3;
        this.stage = b.stage ?? 0;
        this.patternId = ACTION?.id || '';
        this.patternPhase = ACTION?.phase || 'idle';
        this.patternPhaseElapsed = ACTION?.phaseElapsed || 0;
        this.patternAim = ACTION?.aim ?? b.angle;
        this.patternLocked = !!ACTION?.locked;
        this.patternTargetId = ACTION?.targetId || 0;
        this.patternTargetX = TARGET?.x ?? b.x;
        this.patternTargetY = TARGET?.y ?? b.y;
        this.patternTargetZ = TARGET?.z ?? 0;
        this.patternStartX = START?.x ?? b.x;
        this.patternStartY = START?.y ?? b.y;
        this.patternStartZ = START?.z ?? b.z;
        this.patternVolleyCount = ACTION?.volleyCount || 0;
        this.patternReleased = ACTION?.released || 0;
        this.patternTraveled = ACTION?.traveled || 0;
        this.summonMouthX = MOUTH.x ?? b.x;
        this.summonMouthY = MOUTH.y ?? b.y;
        this.summonMouthZ = MOUTH.z ?? b.z;
        this.barleyArmorShredTotal = BarleyArmorShredModel.total(b, world.simulationTick);
    }
}
class FoodRender extends RENDER_OBJECT {
    static renderSchema = Object.freeze({
        x: R.POSITION_X,
        y: R.POSITION_Y,
        z: R.POSITION_Z,
        vx: R.LINEAR,
        vy: R.LINEAR,
        vz: R.LINEAR,
        phase: R.STATE_KEY,
        tx: R.STEP,
        ty: R.STEP,
        seed: R.STEP,
    });
    update(f) {
        this.x = f.x;
        this.y = f.y;
        this.z = f.z;
        this.vx = f.vx;
        this.vy = f.vy;
        this.vz = f.vz;
        this.phase = f.phase;
        this.tx = f.tx ?? 0;
        this.ty = f.ty ?? 0;
        this.seed = f.seed ?? 0;
    }
}
class ProjectileRender extends RENDER_OBJECT {
    static renderSchema = Object.freeze({
        id: R.STEP,
        x: R.POSITION_X,
        y: R.POSITION_Y,
        z: R.POSITION_Z,
        elapsed: R.LINEAR,
        owner: R.STEP,
        species: R.STEP,
        tier: R.STEP,
        radius: R.STEP,
        height: R.STEP,
        projectileKind: R.STATE_KEY,
        shotIndex: R.STEP,
        fanIndex: R.STEP,
        'path.from.x': R.STEP,
        'path.from.y': R.STEP,
        'path.from.z': R.STEP,
        'path.to.x': R.STEP,
        'path.to.y': R.STEP,
        'path.to.z': R.STEP,
        'path.height': R.STEP,
        'path.duration': R.STEP,
    });
    constructor() {
        super();
        this.path = {
            from: {},
            to: {},
        };
    }
    update(p) {
        this.id = p.id;
        this.x = p.x;
        this.y = p.y;
        this.z = p.z;
        this.elapsed = p.elapsed;
        this.owner = p.owner;
        this.species = p.species;
        this.tier = p.tier;
        this.radius = p.radius;
        this.height = p.height;
        this.projectileKind = p.projectileKind || '';
        this.shotIndex = p.shotIndex || 0;
        this.fanIndex = p.fanIndex || 0;
        this.path.from.x = p.path.from.x;
        this.path.from.y = p.path.from.y;
        this.path.from.z = p.path.from.z;
        this.path.to.x = p.path.to.x;
        this.path.to.y = p.path.to.y;
        this.path.to.z = p.path.to.z;
        this.path.height = p.path.height;
        this.path.duration = p.path.duration;
    }
}
class EffectRender extends RENDER_OBJECT {
    static renderSchema = Object.freeze({
        x: R.POSITION_X,
        y: R.POSITION_Y,
        z: R.POSITION_Z,
        life: R.LINEAR,
        kind: R.STATE_KEY,
        radius: R.STEP,
        duration: R.STEP,
        owner: R.STEP,
    });
    update(e) {
        this.x = e.x;
        this.y = e.y;
        this.z = e.z;
        this.life = e.life;
        this.kind = e.kind;
        this.radius = e.radius || 0;
        this.duration = e.duration || 0;
        this.owner = e.owner || 0;
    }
}
class FormationEffectRender extends RENDER_OBJECT {
    static renderSchema = Object.freeze({
        id: R.STEP,
        kind: R.STATE_KEY,
        x: R.POSITION_X,
        y: R.POSITION_Y,
        z: R.POSITION_Z,
        age: R.LINEAR,
        duration: R.STEP,
        delay: R.STEP,
        radius: R.STEP,
        unitId: R.STEP,
        targetX: R.LINEAR,
        targetY: R.LINEAR,
        targetZ: R.LINEAR,
        lastPulse: R.STEP,
        pulse: R.STEP,
        beamTarget: R.STATE_KEY,
        beamTargetZ: R.LINEAR,
    });
    update(effect) {
        for (const KEY of Object.keys(FormationEffectRender.renderSchema)) {
            this[KEY] = effect[KEY] ?? (KEY === 'kind' ? '' : 0);
        }
    }
}
class DelayedEffectRender extends EffectRender {
    static renderSchema = Object.freeze({
        ...EffectRender.renderSchema,
        delay: R.STEP,
        span: R.STEP,
    });
    update(e) {
        super.update(e);
        this.delay = e.delay;
        this.span = e.span;
    }
}
class MergeMaterialRender extends DelayedEffectRender {
    static renderSchema = Object.freeze({
        ...DelayedEffectRender.renderSchema,
        targetX: R.STEP,
        targetY: R.STEP,
        targetZ: R.STEP,
        sequenceIndex: R.STEP,
        sequenceCount: R.STEP,
    });
    update(e) {
        super.update(e);
        this.targetX = e.targetX;
        this.targetY = e.targetY;
        this.targetZ = e.targetZ;
        this.sequenceIndex = e.sequenceIndex;
        this.sequenceCount = e.sequenceCount;
    }
}
class GameClockRender extends RENDER_OBJECT {
    static renderSchema = Object.freeze({
        gameTimeMs: R.LINEAR,
    });
    constructor(gameTimeMs) {
        super();
        this.gameTimeMs = gameTimeMs;
    }
}
class FarmSession {
    constructor(world = new Garden(), { onError = console.error, onWorldStep = () => {} } = {}) {
        this.world = world;
        this.onWorldStep = onWorldStep;
        this.tick = 0;
        this.presentationTick = 0;
        this.profile = LOCAL_PROFILE;
        this.pace = 1;
        this.closed = false;
        this._paused = false;
        this.pauseStartedAt = null;
        this.pausedDurationMs = 0;
        this.pending = [];
        this.pendingNotices = [];
        this.presentationNotices = [];
        this.unsubscribeNotices = null;
        this.noticeWorld = null;
        this.localPlayerId = 'solo';
        this.localDeploySequence = world.raidRoster(this.localPlayerId)?.lastDeploySequence || 0;
        this.presentationRevision = 0;
        this.presentationSequence = 0;
        this.pendingPresentationMode = null;
        this.pendingPulsePresentationMode = null;
        this.presentationRuntime = new PRESENTATION_RUNTIME({
            stepMs: PRESENTATION_STEP_MS,
            delayMs: PRESENTATION_STEP_MS,
            snapDistance: 12,
        });
        this.presentationAdapters = new WeakMap();
        this.captureEntities = [];
        this.clockEntity = {
            id: 'clock',
            generation: 0,
            source: new GameClockRender(0),
        };
        this.presentationIds = new WeakMap();
        this.nextPresentationId = 1;
        this.previousCaptureTimeMs = null;
        this.latestCaptureTimeMs = 0;
        this.presentationOriginWallMs = null;
        this.lastFrameClockMs = null;
        this.lastCaptureClockMs = 0;
        this.pulseTimestamp = null;
        this.currentPulseCapped = false;
        // FarmSession owns local command order; the shared loop owns timing/backlog.
        // No room, transport, rollback history or input-submission pipeline is created.
        this.loop = globalThis.BloomGamekitSimloop.createLoop({
            session: this,
            getInput: () => LOCAL_INPUT,
            onError,
            onBacklogDrop: (details) => {
                const REASON = details?.reason,
                    DROPPED_MS = Math.max(0, Number.isFinite(details?.droppedMs) ? details.droppedMs : 0);
                if (REASON === 'input-dt-clamp' || REASON === 'backlog-overflow') {
                    const IS_INPUT_CLAMP = REASON === 'input-dt-clamp';
                    this.profiler?.count(IS_INPUT_CLAMP ? 'inputDtClampEvents' : 'backlogOverflowEvents');
                    this.profiler?.count(IS_INPUT_CLAMP ? 'inputDtClampedMs' : 'backlogOverflowMs', DROPPED_MS);
                    if (!this.currentPulseCapped) {
                        this.profiler?.count('backlogCappedFrames');
                        this.currentPulseCapped = true;
                    }
                    this.profiler?.count('backlogClippedMs', DROPPED_MS);
                    return;
                }
                this.profiler?.count('backlogDrops');
                this.profiler?.count('backlogDroppedMs', DROPPED_MS);
                if (REASON === 'clock-gap') {
                    this.profiler?.count('clockGapDrops');
                    this.profiler?.count('clockGapDroppedMs', DROPPED_MS);
                } else if (REASON === 'drop-policy') {
                    this.profiler?.count('dropPolicyDrops');
                    this.profiler?.count('dropPolicyDroppedMs', DROPPED_MS);
                }
                this.pendingPresentationMode = 'reset';
            },
            onAdvance: (result) => {
                const ON_ADVANCE_START = this.profiler?.start();
                try {
                    if (this.pendingPresentationMode) {
                        this.pendingPulsePresentationMode = 'reset';
                    } else if (result.status === 'advanced' && !this.paused) {
                        this.pendingPulsePresentationMode ||= 'continuous';
                        const REMAINING_MS = this.pulseTimestamp - this.loop.simulationTimeMs,
                            STEP_MS = (1000 / LOCAL_PROFILE.tickRate) * this.pace,
                            EPSILON_MS = 1e-7,
                            HAS_NEXT_STEP = REMAINING_MS + EPSILON_MS >= STEP_MS,
                            HAS_STEP_AFTER_NEXT = REMAINING_MS - STEP_MS + EPSILON_MS >= STEP_MS;
                        if (HAS_NEXT_STEP && !HAS_STEP_AFTER_NEXT) {
                            // Preserve the exact penultimate/current pair for the delayed
                            // presentation sample; intermediate catch-up states are never drawn.
                            this.capturePresentation('continuous');
                        }
                    }
                } finally {
                    this.profiler?.end('onAdvance', ON_ADVANCE_START);
                }
            },
        });
        this.bindNoticeJournal();
        this.capturePresentation('reset');
    }
    bindNoticeJournal() {
        this.unsubscribeNotices?.();
        this.unsubscribeNotices = null;
        if (this.noticeWorld !== this.world) {
            this.pendingNotices.length = 0;
            this.presentationNotices.length = 0;
        }
        this.noticeWorld = this.world;
        if (this.closed) {
            return;
        }
        // Signals only enqueue committed facts. Effects and audio wait for the
        // presentation frame and its interpolated clock, including while paused.
        this.unsubscribeNotices = this.world.onNotice.on((notice) => {
            this.pendingNotices.push(notice);
            if (this.pendingNotices.length > 512) {
                this.pendingNotices.shift();
            }
        });
    }
    takePresentationNotices() {
        // The returned batch is borrowed until the next call. Both presentation
        // consumers finish synchronously; no retained history is scanned again.
        const EMPTY = this.presentationNotices;
        EMPTY.length = 0;
        this.presentationNotices = this.pendingNotices;
        this.pendingNotices = EMPTY;
        return this.presentationNotices;
    }
    // Required by the shared loop; a local session has no incoming work to poll.
    poll() {}
    queue(type, args = {}) {
        if (this.closed || this.pending.length >= 64) {
            return false;
        }
        this.pending.push(
            structuredClone({
                type,
                ...args,
            }),
        );
        return true;
    }
    deployNext(speciesId) {
        const W = this.world,
            ROSTER = W.scene === 'raid' && W.raidRoster(this.localPlayerId);
        if (!ROSTER || this.closed || this.paused || ['victory', 'defeat'].includes(W.encounter.outcome)) {
            return false;
        }
        if (
            speciesId !== undefined &&
            (!ROSTER.deploymentCardSpecies.includes(speciesId) || W.raidRemaining(this.localPlayerId, speciesId) <= 0)
        ) {
            return false;
        }
        this.localDeploySequence = Math.max(this.localDeploySequence, ROSTER.lastDeploySequence);
        if (this.localDeploySequence - ROSTER.lastDeploySequence >= W.raidRemaining(this.localPlayerId)) {
            return false;
        }
        const QUEUED_FOR_SPECIES = this.pending.filter(
            (command) => command.type === 'deploy' && command.speciesId === speciesId,
        ).length;
        if (speciesId !== undefined && QUEUED_FOR_SPECIES >= W.raidRemaining(this.localPlayerId, speciesId)) {
            return false;
        }
        const SEQUENCE = this.localDeploySequence + 1;
        if (
            !this.queue('deploy', {
                sequence: SEQUENCE,
                ...(speciesId === undefined ? {} : { speciesId }),
            })
        ) {
            return false;
        }
        this.localDeploySequence = SEQUENCE;
        return true;
    }
    advance() {
        if (this.closed) {
            return CLOSED;
        }
        const COMMAND_START = this.profiler?.start();
        const COMMAND_CHANGED_WORLD = this.applyPendingCommands(32);
        this.profiler?.end('commandQueue', COMMAND_START);
        if (this.paused) {
            this.tick++;
            if (COMMAND_CHANGED_WORLD) {
                this.onWorldStep(this.world);
            }
            return ADVANCED;
        }
        const W = this.world,
            START_TIME = W.time,
            LOOP_START = this.loop?.simulationTimeMs,
            START_CLOCK = this.adjustedWallTime(
                Number.isFinite(LOOP_START) ? LOOP_START : (this.pulseTimestamp ?? globalThis.performance.now()),
            ),
            PRESENTATION_START_MS = Math.max(0, START_CLOCK - (this.presentationOriginWallMs ?? START_CLOCK));
        bindPresentationClock(W, (time) => (PRESENTATION_START_MS + (time - START_TIME) * 1000) / 1000);
        if (W.scene === 'farm') {
            const AUTO_TAPS_START = this.profiler?.start();
            try {
                W.advanceAutoTaps(1 / LOCAL_PROFILE.tickRate);
            } finally {
                this.profiler?.end('autoTaps', AUTO_TAPS_START);
            }
        }
        W.step(1 / LOCAL_PROFILE.tickRate);
        this.tick++;
        this.presentationTick++;
        const WORLD_STEP_FOLLOWUP_START = this.profiler?.start();
        try {
            this.onWorldStep(W);
        } finally {
            this.profiler?.end('worldStepFollowup', WORLD_STEP_FOLLOWUP_START);
        }
        return ADVANCED;
    }
    applyPendingCommands(limit) {
        if (!this.pending.length) {
            return false;
        }
        let changed = false;
        for (const COMMAND of this.pending.splice(0, limit)) {
            try {
                changed = this.command(COMMAND) || changed;
            } catch {
                /* Reject invalid local intent without blocking later commands. */
            }
        }
        return changed;
    }
    flushQueuedCommands() {
        if (this.closed || this.world.scene !== 'farm') {
            return false;
        }
        const CHANGED = this.applyPendingCommands(this.pending.length);
        if (CHANGED) {
            this.onWorldStep(this.world);
        }
        return CHANGED;
    }
    command(c, ownerId = this.localPlayerId) {
        const W = this.world;
        switch (c.type) {
            case 'feed':
                return W.scene === 'farm' && W.scatterFoodAtRandomLocation();
            case 'scatter-food':
                return W.scene === 'farm' && W.scatterFood(c.x, c.y);
            case 'farm-plot-switch':
                return W.scene === 'farm' && W.switchFarmPlot(c.plotId);
            case 'farm-target':
                return W.scene === 'farm' && W.setSpeciesTarget(c.speciesId, c.basisPoints);
            case 'farm-work':
                return (
                    W.scene === 'farm' &&
                    W.setWorkBasisPoints(c.basisPoints, c.resourceBasisPoints, c.buildBasisPoints, c.exploreBasisPoints)
                );
            case 'farm-build':
                return W.scene === 'farm' && typeof c.facilityId === 'string' && W.startBuild(c.facilityId);
            case 'farm-rush':
                return W.scene === 'farm' && W.setBuildRush(c.on === true);
            case 'farm-sort':
                return W.scene === 'farm' && W.sortActiveFarm(c.order);
            case 'merge':
                return W.scene === 'farm' && W.startManualMerge();
            case 'progression-invest':
                if (W.scene === 'farm' && typeof c.nodeId === 'string' && c.nodeId.length < 64) {
                    if (c.scope === 'farm') {
                        return W.investFarmUpgrade(c.nodeId).ok;
                    }
                    if (c.scope === 'ability' && typeof c.abilityId === 'string' && c.abilityId.length < 64) {
                        return W.investAbilityNode(c.abilityId, c.nodeId).ok;
                    }
                }
                return false;
            case 'formation-purchase':
                return W.formationSkills.purchase(c.id);
            case 'formation-slot':
                return W.formationSkills.buySlot();
            case 'formation-equip':
                return W.formationSkills.equip(c.slot, c.id);
            case 'deployment-card-buy-slot':
                return W.raidDeploymentCards.buySlot();
            case 'deployment-card-select':
                return W.raidDeploymentCards.select(c.slot, c.speciesId);
            case 'progression-reset':
                return W.scene === 'farm' && W.resetProgression(c.scope).ok;
            case 'ability-reset':
                return W.scene === 'farm' && W.resetAbilityTree().ok;
            case 'register-roster':
                return (
                    Array.isArray(c.entries) &&
                    W.registerRaidRoster(
                        ownerId,
                        c.entries,
                        c.abilitySnapshot,
                        c.settlement || null,
                        Array.isArray(c.deploymentCardSpecies) ? c.deploymentCardSpecies : null,
                    )
                );
            case 'deploy':
                return Number.isSafeInteger(c.sequence) && W.deployNextRaidUnit(ownerId, c.sequence, c.speciesId);
            case 'buff':
                return W.useRaidBuff(ownerId);
        }
        return false;
    }
    presentationIdentity(kind, source) {
        let id = this.presentationIds.get(source);
        if (!id) {
            id = this.nextPresentationId++;
            this.presentationIds.set(source, id);
        }
        return kind + ':' + id;
    }
    // GameKit capture copies declared fields synchronously. Reuse only its input
    // adapters, keyed weakly by the live actor; captured history stays SDK-owned.
    presentationEntity(id, source, typeLocal) {
        let entity = this.presentationAdapters.get(source);
        if (!entity || entity.source.constructor !== typeLocal) {
            entity = {
                id,
                generation: 0,
                source: new typeLocal(),
            };
            this.presentationAdapters.set(source, entity);
        }
        entity.id = id;
        entity.source.update(source, this.world);
        return entity;
    }
    get paused() {
        return this._paused;
    }
    set paused(value) {
        value = !!value;
        if (value === this._paused) {
            return;
        }
        const NOW = globalThis.performance.now();
        if (value) {
            this.pauseStartedAt = NOW;
        } else if (this.pauseStartedAt !== null) {
            this.pausedDurationMs += NOW - this.pauseStartedAt;
            this.pauseStartedAt = null;
        }
        this._paused = value;
    }
    adjustedWallTime(now) {
        return (
            now - this.pausedDurationMs - (this._paused && this.pauseStartedAt !== null ? now - this.pauseStartedAt : 0)
        );
    }
    capturePresentation(mode = 'continuous') {
        const START = this.profiler?.start();
        this.profiler?.count('presentationCaptures');
        try {
            return this.capturePresentationSnapshot(mode);
        } finally {
            this.profiler?.end('presentationCapture', START);
        }
    }
    capturePresentationSnapshot(mode) {
        if (mode !== 'continuous' && this.presentationSequence > 0) {
            this.presentationRevision++;
            // The combat consumer discards the prior epoch. Unconsumed food
            // input edges still reach the HUD once, as they did before a reset.
            this.bindNoticeJournal();
        }
        const WORLD = this.world,
            SNAPSHOT_START = this.profiler?.start(),
            RECEIPT_NOW_MS = this.captureClock(),
            TIME_MS =
                this.presentationOriginWallMs === null
                    ? 0
                    : Math.max(this.latestCaptureTimeMs, RECEIPT_NOW_MS - this.presentationOriginWallMs),
            ENTITIES = this.captureEntities;
        ENTITIES.length = 0;
        if (this.presentationOriginWallMs === null) {
            this.presentationOriginWallMs = RECEIPT_NOW_MS;
        }
        for (const U of WORLD.units) {
            ENTITIES.push(this.presentationEntity('unit:' + U.id, U, UnitRender));
        }
        ENTITIES.push(this.presentationEntity('boss', WORLD.boss, BossRender));
        for (const F of WORLD.food) {
            // Settled food has no movement or animated fields. Keep it in the
            // live view; snapshot only flight/bounce food that needs interpolation.
            if (mode === 'continuous' && F.phase === 'grounded') {
                continue;
            }
            ENTITIES.push(this.presentationEntity(this.presentationIdentity('food', F), F, FoodRender));
        }
        for (const P of WORLD.projectiles) {
            ENTITIES.push(this.presentationEntity('projectile:' + P.id, P, ProjectileRender));
        }
        for (const E of WORLD.effects) {
            const TYPE =
                E.kind === 'merge-material'
                    ? MergeMaterialRender
                    : Number.isFinite(E.delay) && Number.isFinite(E.span)
                      ? DelayedEffectRender
                      : EffectRender;
            ENTITIES.push(this.presentationEntity(this.presentationIdentity('effect', E), E, TYPE));
        }
        for (const EFFECT of WORLD.formationRuntime.effects) {
            ENTITIES.push(this.presentationEntity('formation:' + EFFECT.id, EFFECT, FormationEffectRender));
        }
        this.clockEntity.source.gameTimeMs = WORLD.time * 1000;
        ENTITIES.push(this.clockEntity);
        this.profiler?.count('presentationEntities', ENTITIES.length);
        this.profiler?.end('presentationSnapshot', SNAPSHOT_START);
        const CAPTURE_MODE =
            mode === 'continuous'
                ? 'continuous'
                : mode === 'load'
                  ? 'load'
                  : mode === 'rollback'
                    ? 'rollback'
                    : 'reset';
        if (CAPTURE_MODE === 'continuous') {
            this.previousCaptureTimeMs = this.latestCaptureTimeMs;
        } else {
            this.previousCaptureTimeMs = null;
        }
        const RUNTIME_START = this.profiler?.start();
        let accepted;
        try {
            accepted = this.presentationRuntime.capture(
                {
                    revision: this.presentationRevision,
                    sequence: ++this.presentationSequence,
                    timeMs: TIME_MS,
                    mode: CAPTURE_MODE,
                    entities: ENTITIES,
                },
                RECEIPT_NOW_MS,
            );
        } finally {
            this.profiler?.end('runtimeCapture', RUNTIME_START);
        }
        if (accepted) {
            this.latestCaptureTimeMs = TIME_MS;
            this.lastCaptureClockMs = RECEIPT_NOW_MS;
            this.pendingPresentationMode = null;
        }
        return accepted;
    }
    captureClock() {
        const NOW = this.pulseTimestamp ?? globalThis.performance.now(),
            BOUNDARY = this.loop?.simulationTimeMs;
        const CANDIDATE = this.adjustedWallTime(Number.isFinite(BOUNDARY) ? BOUNDARY : NOW);
        const RECEIPT = Math.max(CANDIDATE, this.lastCaptureClockMs, this.lastFrameClockMs ?? 0);
        this.lastCaptureClockMs = RECEIPT;
        return RECEIPT;
    }
    frameClock(now) {
        const CLOCK = Math.max(this.lastFrameClockMs ?? 0, this.lastCaptureClockMs, this.adjustedWallTime(now));
        this.lastFrameClockMs = CLOCK;
        return CLOCK;
    }
    presentation(now) {
        const FRAME = this.presentationRuntime.frame(this.frameClock(now)),
            WORLD = this.world;
        if (!this.presentationView || Object.getPrototypeOf(this.presentationView) !== WORLD) {
            const VIEW = (this.presentationView = Object.assign(
                Object.create(WORLD, {
                    // Shadow the model's collection accessor without invoking
                    // its setter: presentation owns only this borrowed buffer.
                    units: { value: [], writable: true, enumerable: true, configurable: true },
                }),
                {
                    food: [],
                    presentationFoodIds: new Set(),
                    projectiles: [],
                    effects: [],
                    formationEffects: [],
                    presentationDiagnostics: {},
                },
            ));
            // Only consume these models synchronously in this frame. GameKit owns and
            // reuses their fields; the app reuses the collection containers, not snapshots.
            this.collectPresentationModel = (model, id) => {
                if (id.startsWith('formation:')) {
                    VIEW.formationEffects.push(model);
                } else if (id.startsWith('unit:')) {
                    VIEW.units.push(model);
                } else if (id.startsWith('food:')) {
                    VIEW.food.push(model);
                    VIEW.presentationFoodIds.add(id);
                } else if (id.startsWith('projectile:')) {
                    VIEW.projectiles.push(model);
                } else if (id.startsWith('effect:')) {
                    VIEW.effects.push(model);
                }
            };
        }
        const VIEW = this.presentationView;
        VIEW.units.length = 0;
        VIEW.food.length = 0;
        VIEW.presentationFoodIds.clear();
        VIEW.projectiles.length = 0;
        VIEW.effects.length = 0;
        VIEW.formationEffects.length = 0;
        VIEW.formationSlots = WORLD.formationRuntime.slots;
        FRAME.forEach(this.collectPresentationModel);
        for (const FOOD of WORLD.food) {
            if (FOOD.phase === 'grounded') {
                const ID = this.presentationIdentity('food', FOOD);
                if (!VIEW.presentationFoodIds.has(ID)) {
                    VIEW.food.push(FOOD);
                }
            }
        }
        VIEW.time = (FRAME.sample('clock', 0)?.gameTimeMs ?? WORLD.time * 1000) / 1000;
        VIEW.boss = FRAME.sample('boss', 0) || this.presentationEntity('boss', WORLD.boss, BossRender).source;
        VIEW.displayTimeMs = FRAME.timeMs;
        VIEW.presentationRevision = this.presentationRevision;
        const PREVIOUS = this.previousCaptureTimeMs,
            LATEST = this.latestCaptureTimeMs,
            SPAN = LATEST - PREVIOUS,
            DIAGNOSTICS = VIEW.presentationDiagnostics;
        DIAGNOSTICS.timeMs = FRAME.timeMs;
        DIAGNOSTICS.latestSnapshotTimeMs = LATEST;
        DIAGNOSTICS.previousSnapshotTimeMs = PREVIOUS;
        DIAGNOSTICS.intervalMs = SPAN;
        DIAGNOSTICS.sampleAgeMs = LATEST - FRAME.timeMs;
        DIAGNOSTICS.renderFraction =
            PREVIOUS === null || SPAN <= 0 ? null : Math.max(0, Math.min(1, (FRAME.timeMs - PREVIOUS) / SPAN));
        DIAGNOSTICS.captureSequence = this.presentationSequence;
        DIAGNOSTICS.revision = this.presentationRevision;
        this.latestPresentationDiagnostics = DIAGNOSTICS;
        return VIEW;
    }
    pulse(now) {
        // GameKit reports exact drop reasons; Farm records each reason once.
        // limits for diagnostics only; the loop itself remains the timekeeper.
        this.pulseTimestamp = now;
        this.currentPulseCapped = false;
        this.pendingPulsePresentationMode = null;
        const PREVIOUS_TICK = this.tick,
            STEP_LOOP_START = this.profiler?.start();
        try {
            this.loop.pulse(now, {
                render: false,
            });
        } finally {
            this.profiler?.end('stepLoop', STEP_LOOP_START);
        }
        this.currentPulseCapped = false;
        const CAPTURE_MODE = this.pendingPulsePresentationMode;
        this.pendingPulsePresentationMode = null;
        if (CAPTURE_MODE) {
            const PULSE_CAPTURE_START = this.profiler?.start();
            try {
                this.capturePresentation(CAPTURE_MODE);
            } finally {
                this.profiler?.end('pulseCapture', PULSE_CAPTURE_START);
            }
        }
        this.profiler?.count('catchupTicks', Math.max(0, this.tick - PREVIOUS_TICK - 1));
    }
    dispose() {
        this.closed = true;
        this.unsubscribeNotices?.();
        this.unsubscribeNotices = null;
        this.noticeWorld = null;
        this.pendingNotices.length = 0;
        this.presentationNotices.length = 0;
        this.loop.stop();
        this.pending.length = 0;
        this.captureEntities.length = 0;
        this.presentationAdapters = new WeakMap();
    }
}
export { FarmSession };
