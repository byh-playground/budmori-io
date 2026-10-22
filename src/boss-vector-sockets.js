import { BOSS_PATTERN_CONFIG } from './boss-patterns.js';
import { bossVectorScale, readVectorSockets, socketWorldPoint, WORLD_DEPTH_PROJECTION } from './vector-sockets.cjs';
const CLAMP = (x, a, b) => Math.max(a, Math.min(b, x));
const BOSS_ASSETS = new Map();
// A resting hand points at the camera; every hand pose says which way the knuckles face (0 = right, down = +90 degrees).
export const HAND_REST_FACE = Math.PI / 2;
// Runtime-only assets/players are never attached to a Garden or save snapshot.
export function bindBossSocketAsset(species, record) {
    const LABEL = `species ${species}, ${record.compiled.sourcePath || record.compiled.metadata.id}`;
    const ANCHORS = readVectorSockets(record.compiled, LABEL);
    BOSS_ASSETS.get(species)?.player?.dispose();
    BOSS_ASSETS.set(species, {
        record,
        anchors: ANCHORS,
        player: null,
    });
    return ANCHORS;
}
export function unbindBossSocketAsset(species, record) {
    const ENTRY = BOSS_ASSETS.get(species);
    if (ENTRY?.record !== record) {
        return;
    }
    ENTRY.player?.dispose();
    BOSS_ASSETS.delete(species);
}
// The floating hands of a boss asset, in world units: how big they are and where each rests, measured from the middle of
// the body (the point the sweep turns round).
export function bossHandRig(compiled) {
    const SOCKETS = compiled.metadata.sockets,
        SCALE = bossVectorScale(),
        POINT = (name) => {
            const POINT = SOCKETS[name]?.point;
            if (!POINT) {
                throw new Error(`Vector socket contract (${compiled.metadata.id}): the boss needs a ${name} socket`);
            }
            return POINT;
        },
        CENTRE = POINT('hand-centre'),
        REST = (name) => {
            const AT = POINT(name);
            return { x: (AT[0] - CENTRE[0]) * SCALE, y: (AT[1] - CENTRE[1]) * SCALE };
        };
    return Object.freeze({
        radius: (POINT('hand-edge')[0] - POINT('hand-left')[0]) * SCALE,
        rest: Object.freeze({ 'arm-left': REST('hand-left'), 'arm-right': REST('hand-right') }),
    });
}
export function bossSummonPose(b, parts = new Set()) {
    const CONFIG = BOSS_PATTERN_CONFIG['summon.mouth-t1'],
        PHASE = b.patternPhase,
        ELAPSED = Math.max(0, b.patternPhaseElapsed || 0);
    const AIM = Math.atan2(
        -WORLD_DEPTH_PROJECTION * Math.sin(b.patternAim ?? b.angle),
        Math.cos(b.patternAim ?? b.angle),
    );
    const BODY = {
            x: 0,
            y: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
        },
        HANDS = {
            'arm-left': { x: 0, y: 0, face: HAND_REST_FACE },
            'arm-right': { x: 0, y: 0, face: HAND_REST_FACE },
        },
        R = b.radius || 0;
    let releasePulse = 0;
    if (PHASE === 'windup') {
        const WIND = CLAMP(ELAPSED / CONFIG.windup, 0, 1),
            EASE = WIND * WIND * (3 - 2 * WIND);
        BODY.y = 2 * EASE;
        BODY.scaleX = 1 + 0.025 * EASE;
        BODY.scaleY = 1 - 0.035 * EASE;
        Object.assign(HANDS['arm-left'], { x: -0.4 * R * EASE, y: -0.5 * R * EASE });
        Object.assign(HANDS['arm-right'], { x: 0.4 * R * EASE, y: -0.5 * R * EASE });
    } else if (PHASE === 'active' || PHASE === 'recover') {
        const LAST = (b.patternReleased || 0) - 1,
            AGE = LAST < 0 ? 1 : PHASE === 'active' ? Math.max(0, ELAPSED - LAST * CONFIG.releaseInterval) : ELAPSED;
        releasePulse = CLAMP(1 - AGE / 0.16, 0, 1);
        BODY.scaleX = 1 + 0.025 * releasePulse;
        BODY.scaleY = 1 - 0.018 * releasePulse;
        BODY.rotation = AIM * 0.02;
        Object.assign(HANDS['arm-left'], { x: -0.45 * R, y: -0.55 * R });
        Object.assign(HANDS['arm-right'], { x: 0.45 * R, y: -0.55 * R });
    }
    const EXTRAS = {};
    for (const PART of ['foot-left', 'foot-right', 'leaf', 'kernel-mark', 'hilum']) {
        if (parts.has(PART)) {
            EXTRAS[PART] = {
                x: 0,
                y: 0,
                rotation: PART === 'leaf' ? 0.08 * releasePulse : 0,
            };
        }
    }
    return {
        body: BODY,
        hands: HANDS,
        extras: EXTRAS,
        impact: false,
        releasePulse,
    };
}
export function sampleBossSummon(player, metadata, b) {
    const NAME = b.patternPhase === 'windup' ? 'windup' : b.patternPhase === 'recover' ? 'recover' : 'fire';
    const CLIP_NAME = metadata.clips[NAME] ? NAME : 'idle',
        CLIP = metadata.clips[CLIP_NAME];
    if (!CLIP) {
        throw new Error(`Vector socket contract (${metadata.id}): summon clip ${NAME} or idle is required`);
    }
    // Explicit phase seek has no crossfade/frame-history state. Restore and model
    // release sampling use exactly the same authored pose as the rendered summon.
    player.play(CLIP_NAME, 0);
    player.seek(Math.min(CLIP.durationMs, Math.max(0, b.patternPhaseElapsed || 0) * 1000));
    const POSE = bossSummonPose(b);
    player.setBasePose('body', POSE.body);
    return POSE;
}
export function bossMouthWorldPoint(boss, released) {
    const ENTRY = BOSS_ASSETS.get(boss.species);
    if (!ENTRY) {
        throw new Error(`Vector socket contract (species ${boss.species}): startup boss asset binding is missing`);
    }
    const { record: RECORD, anchors: ANCHORS } = ENTRY,
        ACTION = boss.patternRuntime?.active;
    if (ACTION?.id !== 'summon.mouth-t1') {
        throw new Error(
            `Vector socket contract (species ${boss.species}): mouth spawn requires the active summon pattern`,
        );
    }
    ENTRY.player ||= RECORD.asset.createPlayer({
        clip: 'idle',
        startedAtMs: 0,
    });
    sampleBossSummon(ENTRY.player, RECORD.compiled.metadata, {
        angle: boss.angle,
        patternAim: ACTION.aim,
        patternPhase: ACTION.phase,
        patternPhaseElapsed: ACTION.phaseElapsed,
        patternReleased: released ?? ACTION.released,
    });
    return socketWorldPoint(boss, ENTRY.player.getSocket('mouth'), ANCHORS.ground);
}
