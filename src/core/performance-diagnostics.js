const STAGES = Object.freeze([
    'simulation',
    'stepLoop',
    'commandQueue',
    'autoTaps',
    'onAdvance',
    'pulseCapture',
    'logic',
    'mergeTask',
    'ai',
    'spatial',
    'physics',
    'collision',
    'worldStep',
    'worldPostStep',
    'mutationDispatch',
    'worldStepFollowup',
    'workScheduler',
    'presentationCapture',
    'presentationSnapshot',
    'runtimeCapture',
    'presentation',
    'render',
    'ui',
    'save',
    'saveCapture',
    'saveEncode',
    'saveIO',
    'instrumentation',
]);
const COUNTERS = Object.freeze([
    'logicTicks',
    'workSchedulerTicks',
    'workSchedulerUnits',
    'foodSearchCandidateChecks',
    'foodSearchCellVisits',
    'workSchedulerQueueDepth',
    'workSchedulerJobsQueued',
    'workSchedulerJobsCompleted',
    'workSchedulerJobsCancelled',
    'workSchedulerWaitedJobs',
    'workSchedulerWaitingTicks',
    'workSchedulerMaxWaitTicks',
    'workSchedulerBudgetExhaustions',
    'physicsSteps',
    'physicsSolverIterations',
    'catchupTicks',
    'backlogDrops',
    'backlogDroppedMs',
    'backlogCappedFrames',
    'backlogClippedMs',
    'inputDtClampEvents',
    'inputDtClampedMs',
    'backlogOverflowEvents',
    'backlogOverflowMs',
    'clockGapDrops',
    'clockGapDroppedMs',
    'dropPolicyDrops',
    'dropPolicyDroppedMs',
    'presentationCaptures',
    'presentationEntities',
    'saveCalls',
    'drawCalls',
    'vectorFlushCalls',
    'vectorSubmissions',
    'pathTessellations',
    'pathStrokeBuilds',
    'meshCreates',
    'bufferUploads',
    'bufferBytes',
    'gpuPoseInstances',
    'cpuPoseInstances',
    'uniformPoseInstances',
    'poseTextureUploadBytes',
]);
const FRAME_MAX_COUNTERS = Object.freeze(['workSchedulerMaxWaitTicks']);
const NUMBER = (value, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '미측정');

// Owns local diagnostic policy and text. GameKit owns the bounded numeric ring.
export class PerformanceDiagnostics {
    constructor() {
        this.meter = new globalThis.BloomGamekitDebugTools.FrameMetrics({
            capacity: 240,
            stages: STAGES,
            counters: COUNTERS,
        });
        this.detailed = false;
        this.frameMaximums = Object.create(null);
    }
    setDetailed(enabled) {
        this.detailed = !!enabled;
        this.frameMaximums = Object.create(null);
        this.meter.clear();
    }
    start() {
        return this.detailed ? performance.now() : 0;
    }
    end(name, startedAtMs) {
        if (!this.detailed) {
            return;
        }
        const END = performance.now();
        this.meter.stage(name, Math.max(0, END - startedAtMs));
        // Observed recorder overhead; excludes start-clock cost. Already inside callback CPU.
        this.meter.stage('instrumentation', Math.max(0, performance.now() - END));
    }
    count(name, amount = 1) {
        this.meter.count(name, amount);
    }
    maximum(name, amount = 0) {
        if (!Number.isFinite(amount) || amount < 0) {
            return;
        }
        this.frameMaximums[name] = Math.max(this.frameMaximums[name] || 0, amount);
    }
    beginFrame(now) {
        this.frameMaximums = Object.create(null);
        this.meter.beginFrame(now);
    }
    endFrame(renderer) {
        if (renderer.device.state !== 'ready' || renderer.device.gl.isContextLost()) {
            this.frameMaximums = Object.create(null);
            this.meter.endFrame();
            return;
        }
        const POSES = renderer.ctx.stats().mesh?.poses;
        if (POSES) {
            this.count('gpuPoseInstances', POSES.gpuDrawInstances);
            this.count('cpuPoseInstances', POSES.cpuDrawInstances);
            this.count('uniformPoseInstances', POSES.uniformDrawInstances);
            this.count(
                'poseTextureUploadBytes',
                POSES.cpuPoseUploadBytes + POSES.stateUploadBytes + POSES.overrideUploadBytes,
            );
        }
        for (const NAME of COUNTERS) {
            if (NAME in renderer.device.stats) {
                this.count(NAME, renderer.device.stats[NAME]);
            }
        }
        for (const NAME of FRAME_MAX_COUNTERS) {
            this.count(NAME, this.frameMaximums[NAME] || 0);
        }
        this.frameMaximums = Object.create(null);
        this.meter.endFrame();
    }
    snapshot(limit = 0) {
        return {
            ...this.meter.snapshot({ limit, slowLimit: 2 }),
            detailed: this.detailed,
            gpuMs: null,
            units: 'milliseconds and counts; no GPU completion timing',
            timingHierarchy:
                'callback CPU contains simulation/presentation/render/ui; simulation contains stepLoop and pulseCapture; stepLoop contains FarmSession.advance, onAdvance callbacks and any presentation captures requested there; Garden.step contains logic/physics/worldPostStep/mutationDispatch; logic contains AI/spatial/workScheduler/mergeTask; presentationCapture contains snapshot preparation and runtimeCapture (SDK schema plans are cached by render type); save contains capture/encode/IO. Stage durations sum repeated calls within one RAF. Do not sum parents and children. Outside-callback events belong to the preceding RAF interval, not callback CPU.',
        };
    }
    frameRate() {
        const SNAPSHOT = this.meter.snapshot();
        return {
            frames: this.meter.sequence,
            fps: SNAPSHOT.fps || 0,
            frametimeMs: {
                p50: SNAPSHOT.intervalMs.p50,
                p95: SNAPSHOT.intervalMs.p95,
                max: SNAPSHOT.intervalMs.max,
            },
        };
    }
    summary(world, paused) {
        const SAMPLE = this.snapshot(),
            COUNT = (name) => SAMPLE.counts[name]?.total || 0,
            FRAME_COUNT = Math.max(1, SAMPLE.retainedFrames),
            PER_FRAME = (name) => NUMBER(COUNT(name) / FRAME_COUNT),
            PER_LOGIC_TICK = (name) => NUMBER(COUNT(name) / Math.max(1, COUNT('logicTicks'))),
            AVG_SEARCH_WAIT = NUMBER(
                COUNT('workSchedulerWaitingTicks') / Math.max(1, COUNT('workSchedulerWaitedJobs')),
            ),
            MAX_SEARCH_WAIT = NUMBER(SAMPLE.counts.workSchedulerMaxWaitTicks?.max || 0, 0),
            TIME = (name) => {
                const VALUE = SAMPLE.stagesMs[name];
                return this.detailed && SAMPLE.retainedFrames > 1
                    ? `${NUMBER(VALUE.mean)}/${NUMBER(VALUE.p95)}/${NUMBER(VALUE.max)}`
                    : '미측정';
            };
        const LINES = [
            `work scheduler (food-target scans only): ${TIME('workScheduler')} / ${PER_LOGIC_TICK('workSchedulerUnits')} of 24 deterministic candidate/cell units per logic tick / ${PER_LOGIC_TICK('foodSearchCandidateChecks')} candidates and ${PER_LOGIC_TICK('foodSearchCellVisits')} cell visits / ${COUNT('workSchedulerJobsCompleted')} complete / queue ${PER_LOGIC_TICK('workSchedulerQueueDepth')} / first-service wait ${AVG_SEARCH_WAIT} ticks/job, max ${MAX_SEARCH_WAIT} ticks/RAF`,
            `SDK loss ms: clock-gap ${NUMBER(COUNT('clockGapDroppedMs'), 0)} / input clamp ${NUMBER(COUNT('inputDtClampedMs'), 0)} / backlog overflow ${NUMBER(COUNT('backlogOverflowMs'), 0)} / drop-policy ${NUMBER(COUNT('dropPolicyDroppedMs'), 0)}`,
            `상태 ${world.scene} ${paused ? '정지' : '실행'} · 병력 ${world.units.length} · 먹이 ${world.food.length}`,
            `창 ${NUMBER(SAMPLE.windowMs / 1000, 2)}s/${SAMPLE.retainedFrames}프레임 · 상세 ${this.detailed ? '켜짐' : '꺼짐'} · ${SAMPLE.retainedFrames > 1 ? '유효' : '표본 부족'}`,
            `RAF FPS ${NUMBER(SAMPLE.fps)} · 간격 평균/p95/최대 ${NUMBER(SAMPLE.intervalMs.mean)}/${NUMBER(SAMPLE.intervalMs.p95)}/${NUMBER(SAMPLE.intervalMs.max)}ms · CPU ${NUMBER(SAMPLE.cpuMs.mean)}/${NUMBER(SAMPLE.cpuMs.p95)}/${NUMBER(SAMPLE.cpuMs.max)}ms`,
            `창 합계: 논리 ${COUNT('logicTicks')} (${PER_FRAME('logicTicks')}/RAF) · advancePhysics 호출 ${COUNT('physicsSteps')} (${PER_FRAME('physicsSteps')}/RAF) · solver 반복 ${COUNT('physicsSolverIterations')} · 추가 catchup ${COUNT('catchupTicks')} · backlog drop ${COUNT('backlogDrops')}회/${NUMBER(COUNT('backlogDroppedMs'), 0)}ms · cap ${COUNT('backlogCappedFrames')}프레임/${NUMBER(COUNT('backlogClippedMs'), 0)}ms`,
            `CPU 평균/p95/최대(부모·자식 합산 금지): ${TIME('simulation')} · loop ${TIME('stepLoop')} · 명령 ${TIME('commandQueue')} · 자동 먹이 ${TIME('autoTaps')} · 논리 ${TIME('logic')} (합성 접근 ${TIME('mergeTask')}) · 물리 ${TIME('physics')}`,
            `CPU post-step ${TIME('worldPostStep')} · event dispatch ${TIME('mutationDispatch')} · world-step follow-up ${TIME('worldStepFollowup')} · capture ${TIME('presentationCapture')} (snapshot prep ${TIME('presentationSnapshot')} / SDK ${TIME('runtimeCapture')})`,
            `프레임 평균: 프레젠테이션 캡처 ${PER_FRAME('presentationCaptures')}회 / 엔티티 ${PER_FRAME('presentationEntities')} · solver 반복 ${PER_FRAME('physicsSolverIterations')}`,
            `CPU AI ${TIME('ai')} · 인덱스 재구축/갱신 ${TIME('spatial')} · 충돌 ${TIME('collision')}`,
            `CPU 보간 ${TIME('presentation')} · WebGL 제출 ${TIME('render')} · UI ${TIME('ui')}`,
            `저장 ${COUNT('saveCalls')}회 · CPU 전체 ${TIME('save')} / 캡처 ${TIME('saveCapture')} / 인코딩 ${TIME('saveEncode')} / IO ${TIME('saveIO')}`,
            `프레임 평균: draw ${PER_FRAME('drawCalls')} · vector flush ${PER_FRAME('vectorFlushCalls')} · submit ${PER_FRAME('vectorSubmissions')} · fill 재테셀 ${PER_FRAME('pathTessellations')} · stroke 생성 ${PER_FRAME('pathStrokeBuilds')}`,
            `프레임 평균: retained mesh 생성 ${PER_FRAME('meshCreates')} · upload ${PER_FRAME('bufferUploads')}회/${NUMBER(COUNT('bufferBytes') / FRAME_COUNT / 1024)}KiB · 계측 기록 비용 ${TIME('instrumentation')}`,
            'GPU 시간 미측정 · CPU=콜백 작업, RAF=다음 콜백까지 간격. 외부 이벤트·대기 시간은 CPU에 합산하지 않음.',
        ];
        for (const FRAME of SAMPLE.slowFrames.slice(0, 1)) {
            LINES.push(
                `느린 구간 #${FRAME.sequence} RAF ${NUMBER(FRAME.intervalMs)}ms/콜백 CPU ${NUMBER(FRAME.cpuMs)}ms · sim ${NUMBER(FRAME.stagesMs.simulation)} render ${NUMBER(FRAME.stagesMs.render)} save ${NUMBER(FRAME.stagesMs.save)} · tick/solver ${FRAME.counts.logicTicks}/${FRAME.counts.physicsSolverIterations} draw ${FRAME.counts.drawCalls}${this.detailed ? '' : ' · 상세 시간 미측정'}`,
            );
        }
        return LINES;
    }
}
