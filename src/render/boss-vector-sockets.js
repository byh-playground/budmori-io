import { BOSS_PATTERN_CONFIG } from '../boss/boss-patterns.js';
import { bossVectorScale, readVectorSockets, socketWorldPoint, WORLD_DEPTH_PROJECTION } from '../vector-sockets.js';
const CLAMP = (x, a, b) => Math.max(a, Math.min(b, x));
const BOSS_ASSETS = new Map();
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
// Read the current species' authored rig once. There is no separate boss art:
// existing arms, cooperating kernels or held items receive the pattern/cast
// offsets. Missing limbs are never synthesized or painted by this adapter.
export function bossHandRig(compiled) {
    const PARTS = compiled.metadata.parts,
        BY_ID = new Map(PARTS.map((part, index) => [part.id, { ...part, index }])),
        SOCKETS = compiled.metadata.sockets,
        SCALE = bossVectorScale(),
        CENTRE = BY_ID.get('body').pivot,
        IS_DESCENDANT = (id, parent) => {
            for (let part = BY_ID.get(id); part; part = BY_ID.get(part.parent)) {
                if (part.id === parent) {
                    return true;
                }
            }
            return false;
        },
        PICK = (...ids) => ids.find((id) => BY_ID.has(id)),
        EFFECTORS = {
            'arm-left': PICK('arm-left', 'kernel-left', 'flail'),
            'arm-right': PICK('arm-right', 'kernel-right', 'sickle', 'command-baton', 'shield'),
        },
        REST = {},
        CHANNELS = {};
    let radius = 0;
    for (const [SIDE, ID] of Object.entries(EFFECTORS)) {
        CHANNELS[SIDE] = [];
        REST[SIDE] = { x: 0, y: 0 };
        if (!ID) {
            continue;
        }
        const MEMBERS = new Set(
                PARTS.filter((part) => IS_DESCENDANT(part.id, ID)).map((part) => BY_ID.get(part.id).index),
            ),
            VERTICES = compiled.geometry.vertices,
            STRIDE = compiled.geometry.strideFloats;
        let left = Infinity,
            right = -Infinity,
            top = Infinity,
            bottom = -Infinity;
        for (let index = 0; index < VERTICES.length; index += STRIDE) {
            if (MEMBERS.has(VERTICES[index + STRIDE - 1])) {
                left = Math.min(left, VERTICES[index]);
                right = Math.max(right, VERTICES[index]);
                top = Math.min(top, VERTICES[index + 1]);
                bottom = Math.max(bottom, VERTICES[index + 1]);
            }
        }
        if (![left, right, top, bottom].every(Number.isFinite)) {
            throw new Error(`Vector rig contract (${compiled.metadata.id}): ${ID} has no authored geometry`);
        }
        const SOCKET =
                SOCKETS[SIDE === 'arm-left' ? 'fist-left' : 'fist-right'] ||
                (SOCKETS['weapon-tip'] && IS_DESCENDANT(SOCKETS['weapon-tip'].part, ID) ? SOCKETS['weapon-tip'] : null),
            AT = SOCKET?.point || [(left + right) / 2, (top + bottom) / 2];
        REST[SIDE] = { x: (AT[0] - CENTRE[0]) * SCALE, y: (AT[1] - CENTRE[1]) * SCALE };
        radius = Math.max(radius, ((right - left) * SCALE) / 2);
        CHANNELS[SIDE].push({ part: ID, followsBody: IS_DESCENDANT(ID, 'body') });
        if (ID === 'arm-right' && BY_ID.has('hammer') && !IS_DESCENDANT('hammer', ID)) {
            CHANNELS[SIDE].push({ part: 'hammer', followsBody: IS_DESCENDANT('hammer', 'body') });
        }
        Object.freeze(REST[SIDE]);
        Object.freeze(CHANNELS[SIDE]);
    }
    return Object.freeze({ radius, rest: Object.freeze(REST), channels: Object.freeze(CHANNELS) });
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
            'arm-left': { x: 0, y: 0 },
            'arm-right': { x: 0, y: 0 },
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
    const CLIP_NAME = NAME,
        CLIP = metadata.clips[CLIP_NAME];
    if (!CLIP) {
        throw new Error(`Vector socket contract (${metadata.id}): shared summon clip ${NAME} is required`);
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
