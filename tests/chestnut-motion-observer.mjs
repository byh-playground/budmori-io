// Runs inside the real HELP document. This observer forwards native draws unchanged;
// it never steps the simulation, seeks a player, injects a pose, or creates a hit.
export function installChestnutMotionObserver({ body, thornColors }) {
    if (!new URLSearchParams(location.search).has('help')) {
        return;
    }
    const REQUEST = globalThis.requestAnimationFrame.bind(globalThis),
        CLOCK = { last: null, current: null, maxDelta: 0, bounded: true };
    globalThis.__chestnutPreviewClock = CLOCK;
    function install() {
        const APP = BUDMORI,
            WORLD = APP.sim,
            UNIT = WORLD.units[0],
            SESSION = APP.runtime,
            RENDERER = APP.renderer,
            CASE = new URLSearchParams(location.search).get('chestnut-case') || `t${UNIT.tier}`,
            STATE = {
                case: CASE,
                actionId: null,
                ready: false,
                complete: false,
                fixture: {
                    provenance:
                        'Fresh production HELP Garden, seed731. Real boss factory / chooseDoor; no imported user save.',
                    bossRoster: [],
                    acquiredGiant: false,
                },
                trace: [],
                projectiles: {},
                hits: [],
                foreignHits: [],
                captures: [],
                interruption: null,
                installedAt: { clock: { ...CLOCK }, initialCaptureClock: SESSION.lastCaptureClockMs },
            },
            RENDER = RENDERER.render,
            PRESENT = SESSION.presentation;
        let record = null,
            bodyFrame = null,
            renderedShots = [],
            pending = [],
            frameSerial = 0,
            inShot = false,
            recoverFrame = null;
        const SEEN = new Set();
        globalThis.__chestnutMotion = STATE;
        SESSION.__chestnutObservationClock = CLOCK;
        SESSION.presentation = function (now) {
            globalThis.__chestnutInputClock = now;
            return PRESENT.call(this, now);
        };
        SESSION.loop.resetTiming();
        if (CASE === 'small-boss' || CASE === 'large-boss') {
            STATE.fixture.bossRoster = Array.from({ length: APP.CONFIG.unit.speciesCount }, (_value, species) => {
                WORLD.boss.controller.configureStage(1, species);
                return { species, radius: WORLD.boss.radius, height: WORLD.boss.height };
            });
            const SORTED = [...STATE.fixture.bossRoster].sort((a, b) => a.radius - b.radius),
                CHOSEN = CASE === 'small-boss' ? SORTED[0] : SORTED.at(-1);
            WORLD.boss.controller.configureStage(1, CHOSEN.species);
            Object.assign(WORLD.boss, { z: 0, hp: 1e7, maxHp: 1e7, stun: 60 });
            UNIT.x = -(WORLD.boss.radius + UNIT.ability.attackRange(WORLD));
            UNIT.y = 0;
            WORLD._unitSpatialDirty = true;
            STATE.fixture.selectedBoss = CHOSEN;
        }
        if (CASE === 'giant-card') {
            WORLD.farmBossEvent.phase = 'idle';
            WORLD.tower.nextKind = 'power';
            WORLD.tower.doors = [{ type: 'skill', id: 'giant' }];
            STATE.fixture.acquiredGiant = WORLD.chooseDoor(0);
            if (!STATE.fixture.acquiredGiant || WORLD.tower.relics.get('giant') !== 1) {
                throw Error('Actual giant card acquisition failed');
            }
            WORLD.farmBossEvent.phase = 'fighting';
            WORLD.farmBossEvent.elapsed = 0;
        }
        function marker(label, details = {}) {
            if (SEEN.has(label) || STATE.complete) {
                return;
            }
            SEEN.add(label);
            // Contact and recovery are recorded without pausing: a pause re-captures the presentation, which drops the
            // landed thorn's stuck frame before the eye (and this observer) could see it.
            if (label.startsWith('contact-') || label === 'recover') {
                (STATE.passed ||= []).push({ label, ...details, frame: frameSerial });
                recoverFrame ??= label === 'recover' ? frameSerial : null;
                return;
            }
            pending.push({ label, ...details });
        }
        function bounds(points) {
            return {
                left: Math.min(...points.map((point) => point.x)),
                right: Math.max(...points.map((point) => point.x)),
                top: Math.min(...points.map((point) => point.y)),
                bottom: Math.max(...points.map((point) => point.y)),
            };
        }
        function wrapPlayer() {
            const PLAYER = RENDERER.vectorPlayers.get(UNIT.id);
            if (!PLAYER || PLAYER.__chestnutObserver) {
                return;
            }
            const DRAW = PLAYER.draw,
                WRAPPER = Object.create(PLAYER);
            Object.defineProperty(WRAPPER, 'draw', {
                value(options) {
                    const RESULT = DRAW.call(PLAYER, options),
                        DISPLAY = SESSION.presentationView?.units.find((unit) => unit.id === UNIT.id),
                        MATRIX = options.matrix,
                        [LEFT, TOP, WIDTH, HEIGHT] = RENDERER.vectorAssets.get(3).compiled.viewBox,
                        TRANSFORM = (x, y) => ({
                            x: MATRIX[0] * x + MATRIX[2] * y + MATRIX[4],
                            y: MATRIX[1] * x + MATRIX[3] * y + MATRIX[5],
                        }),
                        RECT = (left, top, right, bottom) =>
                            bounds(
                                [
                                    [left, top],
                                    [right, top],
                                    [left, bottom],
                                    [right, bottom],
                                ].map(([x, y]) => TRANSFORM(x, y)),
                            ),
                        GROUND = PLAYER.getSocket('ground'),
                        ROOT = RENDERER.project(DISPLAY.x, DISPLAY.y, 0),
                        RADIUS = Math.max(DISPLAY.size * 0.66 * 1.12, DISPLAY.radius + 0.1) * RENDERER.scale;
                    bodyFrame = {
                        frame: frameSerial,
                        matrix: [...MATRIX],
                        bounds: RECT(LEFT, TOP, LEFT + WIDTH, TOP + HEIGHT),
                        torso: RECT(body.left, body.top, body.right, body.bottom),
                        ground: TRANSFORM(GROUND.x, GROUND.y),
                        root: ROOT,
                        ring: {
                            left: ROOT.x - RADIUS - 0.06 * RENDERER.scale,
                            right: ROOT.x + RADIUS + 0.06 * RENDERER.scale,
                            top: ROOT.y - RADIUS * 0.62 - 0.06 * RENDERER.scale,
                            bottom: ROOT.y + RADIUS * 0.62 + 0.06 * RENDERER.scale,
                        },
                        canvas: { width: RENDERER.canvas.width, height: RENDERER.canvas.height },
                        pixelRatio: RENDERER.pixelRatio,
                        phase: DISPLAY.ability.phase,
                        stage: DISPLAY.ability.chestnutStage,
                        slot: DISPLAY.ability.chestnutSlot,
                        progress: DISPLAY.ability.chestnutStageProgress,
                        form: DISPLAY.ability.chestnutForm,
                        elapsed: DISPLAY.ability.elapsed,
                        giant: DISPLAY.giantUntil > WORLD.time,
                        position: { x: DISPLAY.x, y: DISPLAY.y, z: DISPLAY.z },
                        time: RENDERER.displayTimeMs,
                    };
                    return RESULT;
                },
            });
            WRAPPER.__chestnutObserver = true;
            RENDERER.vectorPlayerAssets.set(WRAPPER, RENDERER.vectorPlayerAssets.get(PLAYER));
            RENDERER.vectorPlayers.set(UNIT.id, WRAPPER);
        }
        const PROJECTILES = RENDERER.projectilePresentation,
            DRAW = PROJECTILES.draw;
        PROJECTILES.draw = function (shot, ...args) {
            if (shot.chestnutActionId !== STATE.actionId) {
                return DRAW.call(this, shot, ...args);
            }
            const LINES = [],
                ELLIPSES = [],
                LINE = RENDERER.line,
                SPIKE = RENDERER.spike,
                ELLIPSE = RENDERER.ellipse;
            RENDERER.line = function (a, b, width, color) {
                LINES.push({
                    a: { ...a },
                    b: { ...b },
                    width: width * this.scale,
                    color,
                    role: color === thornColors.shaft ? 'spike-body' : 'trail',
                });
                return LINE.call(this, a, b, width, color);
            };
            // A spike is a long triangle; its centerline from base to point is the spike body.
            RENDERER.spike = function (a, b, width, color) {
                LINES.push({
                    a: { ...a },
                    b: { ...b },
                    width: width * this.scale,
                    color,
                    role: color === thornColors.shaft ? 'spike-body' : 'trail',
                });
                return SPIKE.call(this, a, b, width, color);
            };
            RENDERER.ellipse = function (x, y, rx, ry, color, angle = 0) {
                ELLIPSES.push({ x, y, rx, ry, angle });
                return ELLIPSE.call(this, x, y, rx, ry, color, angle);
            };
            let result;
            inShot = true;
            try {
                result = DRAW.call(this, shot, ...args);
            } finally {
                inShot = false;
                RENDERER.line = LINE;
                RENDERER.spike = SPIKE;
                RENDERER.ellipse = ELLIPSE;
            }
            const POINTS = [];
            for (const L of LINES) {
                for (const P of [L.a, L.b]) {
                    POINTS.push(
                        { x: P.x - L.width / 2, y: P.y - L.width / 2 },
                        { x: P.x + L.width / 2, y: P.y + L.width / 2 },
                    );
                }
            }
            for (const E of ELLIPSES) {
                const RX = Math.hypot(E.rx * Math.cos(E.angle), E.ry * Math.sin(E.angle)),
                    RY = Math.hypot(E.rx * Math.sin(E.angle), E.ry * Math.cos(E.angle));
                POINTS.push({ x: E.x - RX, y: E.y - RY }, { x: E.x + RX, y: E.y + RY });
            }
            const SAMPLE = {
                frame: frameSerial,
                slot: shot.chestnutSlot,
                stage: shot.chestnutStage,
                actionId: shot.chestnutActionId,
                kind: shot.projectileKind,
                progress: shot.elapsed / shot.path.duration,
                path: structuredClone(shot.path),
                bounds: bounds(POINTS),
                lines: LINES,
                ellipses: ELLIPSES,
                origin: RENDERER.project(shot.path.from.x, shot.path.from.y, shot.path.from.z),
                endpoint: RENDERER.project(shot.path.to.x, shot.path.to.y, shot.path.to.z),
                tick: WORLD.simulationTick,
                displayTimeMs: RENDERER.displayTimeMs,
            };
            const SLOT = (STATE.projectiles[shot.chestnutSlot] ||= { first: SAMPLE, last: SAMPLE, samples: 0 });
            SLOT.last = SAMPLE;
            SLOT.samples++;
            renderedShots.push(SAMPLE);
            marker(`launch-${shot.chestnutSlot}`, { slot: shot.chestnutSlot, progress: SAMPLE.progress });
            if (SAMPLE.progress >= 0.3 && SAMPLE.progress <= 0.7) {
                SLOT.motion ||= SAMPLE;
                marker(`motion-${shot.chestnutSlot}`, { slot: shot.chestnutSlot, progress: SAMPLE.progress });
            }
            return result;
        };
        const IMPACTS = new Map(),
            DAMAGE = WORLD.damageCombatTarget;
        WORLD.damageCombatTarget = function (source, action, target, point, options) {
            const SLOT = options?.attackContext?.strikeIndex;
            if (action.id === STATE.actionId && options?.attackKind === 'chestnut-spike') {
                const SHOT = WORLD.projectiles.find(
                    (shot) => shot.chestnutActionId === action.id && shot.chestnutSlot === SLOT,
                );
                IMPACTS.set(SLOT, {
                    projectile: SHOT && structuredClone(SHOT),
                    impact: structuredClone(point),
                    nativeImpact: {
                        actionId: action.id,
                        slot: SLOT,
                        point: RENDERER.project(point.x, point.y, point.z),
                        pixelRatio: RENDERER.pixelRatio,
                        renderFrame: frameSerial,
                        displayTimeMs: RENDERER.displayTimeMs,
                    },
                });
            }
            return DAMAGE.call(this, source, action, target, point, options);
        };
        WORLD.onNotice.on((notice) => {
            if (
                STATE.actionId !== null &&
                !STATE.complete &&
                notice.kind === 'boss-hit' &&
                notice.unit === UNIT.id &&
                notice.attackId !== STATE.actionId
            ) {
                STATE.foreignHits.push(structuredClone(notice));
            }
            if (notice.kind !== 'boss-hit' || notice.attackId !== STATE.actionId) {
                return;
            }
            const IMPACT = IMPACTS.get(notice.strikeIndex),
                LAST = STATE.projectiles[notice.strikeIndex]?.last;
            STATE.hits.push({
                ...structuredClone(notice),
                tick: WORLD.simulationTick,
                ...IMPACT,
                lastNative: LAST && structuredClone(LAST),
            });
            marker(`contact-${notice.strikeIndex}`, { slot: notice.strikeIndex });
        });
        RENDERER.render = function (...args) {
            frameSerial++;
            renderedShots = [];
            wrapPlayer();
            // Thorn spikes drawn outside a flying shot are the landed thorn, stuck in the contact point after a hit.
            const STUCK = [],
                SPIKE = RENDERER.spike;
            RENDERER.spike = function (a, b, width, color) {
                if (!inShot && color === thornColors.shaft) {
                    STUCK.push({ a: { ...a }, b: { ...b }, width: width * this.scale, color, role: 'spike-body' });
                }
                return SPIKE.call(this, a, b, width, color);
            };
            let rendered;
            try {
                rendered = RENDER.apply(this, args);
            } finally {
                RENDERER.spike = SPIKE;
            }
            if (STUCK.length) {
                for (const HIT of STATE.hits) {
                    // The contact point is projected with this frame's camera, the one the stuck thorn was drawn with.
                    HIT.impactNative ||= HIT.impact && {
                        frame: frameSerial,
                        tick: WORLD.simulationTick,
                        lines: STUCK,
                        point: RENDERER.project(HIT.impact.x, HIT.impact.y, HIT.impact.z),
                    };
                }
            }
            const RESULT = rendered,
                LIVE = UNIT.ability.action?.chestnutAttack,
                DISPLAY = SESSION.presentationView?.units.find((unit) => unit.id === UNIT.id);
            if (STATE.interruption) {
                const CHECK = {
                    tick: WORLD.simulationTick,
                    capture: SESSION.presentationSequence,
                    action: !!UNIT.ability.action,
                    form: DISPLAY?.ability.chestnutForm,
                    paused: SESSION.paused,
                    clock: CLOCK.current,
                };
                STATE.interruption.last = CHECK;
                if (
                    !CHECK.action &&
                    !CHECK.form &&
                    !CHECK.paused &&
                    CHECK.tick >= STATE.interruption.tick + 2 &&
                    CHECK.capture >= STATE.interruption.capture + 2
                ) {
                    STATE.interruption.settled ||= CHECK;
                }
                return RESULT;
            }
            if (!bodyFrame || bodyFrame.frame !== frameSerial) {
                return RESULT;
            }
            if (
                STATE.actionId === null &&
                LIVE &&
                bodyFrame.phase === 'windup' &&
                bodyFrame.elapsed >= LIVE.windupSeconds * 0.5 &&
                (CASE !== 'giant-card' || (UNIT.giantUntil > WORLD.time && bodyFrame.giant))
            ) {
                STATE.actionId = LIVE.id;
                record = LIVE;
                STATE.initialHp = WORLD.boss.hp;
                STATE.geometry = {
                    bossSpecies: WORLD.boss.species,
                    bossRadius: WORLD.boss.radius,
                    bossHeight: WORLD.boss.height,
                    tier: UNIT.tier,
                    giantActive: UNIT.giantUntil > WORLD.time,
                    giantLevel: WORLD.tower.relics.get('giant') || 0,
                    giantCasts: WORLD.notices
                        .filter((notice) => notice.kind === 'formation-cast' && notice.skillId === 'giant')
                        .map((notice) => ({ ...notice })),
                };
                marker('windup');
            }
            if (!record || STATE.complete || STATE.ready) {
                return RESULT;
            }
            if (
                record.launchTick !== null &&
                record.nextShot === record.shots.length &&
                STATE.hits.length === record.shots.length &&
                bodyFrame.phase === 'recover' &&
                bodyFrame.form === record.form &&
                !WORLD.projectiles.some((shot) => !shot.hit && shot.chestnutActionId === record.id)
            ) {
                marker('recover');
            }
            // Recovery can start the frame a thorn lands; the observation ends once every landed thorn has been drawn
            // stuck in its contact (or a dozen frames later, so a missing one fails the contact gate instead of waiting).
            if (
                recoverFrame !== null &&
                (STATE.hits.every((hit) => hit.impactNative) || frameSerial - recoverFrame > 12)
            ) {
                marker('settled');
            }
            if (pending.length) {
                const SAMPLE = {
                    tick: WORLD.simulationTick,
                    record: structuredClone(record),
                    body: structuredClone(bodyFrame),
                    projectiles: structuredClone(renderedShots),
                    markers: pending,
                    units: WORLD.units.length,
                    hp: WORLD.boss.hp,
                };
                STATE.trace.push(SAMPLE);
                STATE.captures = pending;
                STATE.ready = true;
                if (pending.some((entry) => entry.label === 'settled')) {
                    STATE.complete = true;
                }
                pending = [];
                SESSION.paused = true;
                SESSION.pauseStartedAt = globalThis.__chestnutInputClock;
            }
            return RESULT;
        };
    }
    globalThis.requestAnimationFrame = (callback) =>
        REQUEST((now) => {
            if (!globalThis.BUDMORI) {
                callback(now);
                return;
            }
            if (CLOCK.last === null) {
                CLOCK.current = Math.max(now, performance.now());
            } else if (CLOCK.last !== now) {
                const DELTA = BUDMORI.runtime.paused
                    ? 0
                    : Math.min(CLOCK.bounded ? 25 : Infinity, Math.max(0, now - CLOCK.last));
                CLOCK.current += DELTA;
                if (CLOCK.bounded) {
                    CLOCK.maxDelta = Math.max(CLOCK.maxDelta, DELTA);
                }
            }
            CLOCK.last = now;
            if (!globalThis.__chestnutMotion) {
                install();
            }
            callback(CLOCK.current);
        });
}

// FarmSession's public pause setter samples the raw wall clock. Preserve the
// observer's shared HELP clock across screenshot latency by restoring the
// computed duration AFTER unpausing, just like the established wheat observer.
export function resumeChestnutMotionObservation(interrupt = false) {
    const SESSION = BUDMORI.runtime,
        STATE = globalThis.__chestnutMotion,
        DURATION = SESSION.pausedDurationMs + globalThis.__chestnutInputClock - SESSION.pauseStartedAt;
    STATE.ready = false;
    if (interrupt) {
        STATE.interruption = {
            tick: BUDMORI.sim.simulationTick,
            capture: SESSION.presentationSequence,
            clock: globalThis.__chestnutInputClock,
        };
        globalThis.__chestnutPreviewClock.bounded = false;
        BUDMORI.sim.units[0].ability.interrupt();
        BUDMORI.sim.units[0].stun = 0.5;
    }
    SESSION.paused = false;
    SESSION.pausedDurationMs = DURATION;
    SESSION.loop.resetTiming();
    (STATE.resumes ||= []).push({
        inputClock: globalThis.__chestnutInputClock,
        rawClock: performance.now(),
        pausedDurationMs: SESSION.pausedDurationMs,
    });
}

// Native spike shafts are continuous line segments. Comparing only endpoints
// overstates the gap when contact falls beside the middle of the drawn shaft.
// Use the exact renderer camera retained at the damage call, not a later frame's
// camera. Stroke width is deliberately not subtracted: this is a conservative
// centerline measurement against the unchanged 12px gate.
// The thorn stuck in the contact point after the hit is what the eye sees land; without one, the last flying frame.
export function measureChestnutNativeContact(hit) {
    const DRAWN = hit.impactNative ?? hit.lastNative,
        TARGET = hit.impactNative?.point ?? hit.nativeImpact.point,
        SPIKES = DRAWN.lines.filter((line) => line.role === 'spike-body'),
        DISTANCES = SPIKES.map(({ a, b }) => {
            const DX = b.x - a.x,
                DY = b.y - a.y,
                LENGTH_SQUARED = DX * DX + DY * DY,
                T =
                    LENGTH_SQUARED > 0
                        ? Math.max(0, Math.min(1, ((TARGET.x - a.x) * DX + (TARGET.y - a.y) * DY) / LENGTH_SQUARED))
                        : 0;
            return Math.hypot(TARGET.x - a.x - T * DX, TARGET.y - a.y - T * DY);
        });
    return {
        point: TARGET,
        nativeDistancePixels: Math.min(...DISTANCES) / hit.nativeImpact.pixelRatio,
        spikeBodySegments: SPIKES.length,
        tipDistancePixels:
            Math.min(...SPIKES.map(({ b }) => Math.hypot(b.x - TARGET.x, b.y - TARGET.y))) /
            hit.nativeImpact.pixelRatio,
        endpointDistancePixels:
            Math.min(
                ...DRAWN.lines.flatMap(({ a, b }) => [
                    Math.hypot(a.x - TARGET.x, a.y - TARGET.y),
                    Math.hypot(b.x - TARGET.x, b.y - TARGET.y),
                ]),
            ) / hit.nativeImpact.pixelRatio,
        deltaTicks: hit.tick - hit.lastNative.tick,
        renderFrame: hit.nativeImpact.renderFrame,
        nativeFrame: hit.lastNative.frame,
        progress: hit.lastNative.progress,
        stuck: Boolean(hit.impactNative),
        stuckFrame: hit.impactNative?.frame ?? null,
    };
}
