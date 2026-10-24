import { WORLD_HEIGHT_PROJECTION } from '../../../vector-sockets.js';

// How a stuck kernel looks while it waits and when it pops. The model owns when it explodes; this only reads that.
const DEFAULT_BODY = Object.freeze({ radius: 0.3, height: 1, scale: 1, shiftX: 0, shiftY: 0 });
const POP_RING = 0.5;
// Presentation-only, weakly owned by the snapshot group. Never consume combat RNG or write to its DTO.
const LOCAL_POINTS = new WeakMap();
function visualHash(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
        hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    }
    return hash >>> 0;
}
function visualRandom(seed) {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let value = Math.imul(state ^ (state >>> 15), 1 | state);
        value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}
function transformPoint(matrix, point) {
    return {
        x: matrix[0] * point.x + matrix[2] * point.y + matrix[4],
        y: matrix[1] * point.x + matrix[3] * point.y + matrix[5],
    };
}
// An inset torso ellipse, not the collision circle: aspect and face exclusion come from the authored SVG.
// The narrow peanut waist needs a smaller horizontal inset. Sampling is continuous, never a slot/grid.
export function cornLocalPoint(attachment, group, definition) {
    let cache = LOCAL_POINTS.get(group);
    if (!cache || cache.definition !== definition) {
        cache = { definition, points: new Map() };
        LOCAL_POINTS.set(group, cache);
    }
    if (!cache.points.has(attachment.id)) {
        const { bounds: BOUNDS, mouth: MOUTH } = definition,
            WIDTH = BOUNDS.right - BOUNDS.left,
            HEIGHT = BOUNDS.bottom - BOUNDS.top,
            RX = WIDTH * (definition.species === 4 ? 0.25 : 0.32),
            RY = HEIGHT * 0.31;
        // Model order is append-only, including removed kernels until the entire group expires.
        // Rebuilding after restore thus picks exactly the same points, independent of display/frame history.
        for (const ENTRY of group.attachments) {
            if (cache.points.has(ENTRY.id)) {
                continue;
            }
            const RANDOM = visualRandom(
                visualHash(
                    JSON.stringify([
                        group.cornActionId ?? group.id,
                        group.targetId,
                        group.targetGeneration,
                        ENTRY.id,
                        ENTRY.ownerId,
                        ENTRY.ownerGeneration,
                    ]),
                ),
            );
            let best = null,
                bestDistance = -1;
            // Bounded best-candidate spacing; crowded groups never loop forever or move old kernels.
            for (let attempt = 0; attempt < 32; attempt++) {
                const ANGLE = RANDOM() * Math.PI * 2,
                    RADIUS = Math.sqrt(RANDOM()),
                    POINT = {
                        x: (BOUNDS.left + BOUNDS.right) * 0.5 + Math.cos(ANGLE) * RADIUS * RX,
                        y: BOUNDS.top + HEIGHT * 0.56 + Math.sin(ANGLE) * RADIUS * RY,
                    };
                const FACE_X = (POINT.x - MOUTH.x) / (WIDTH * 0.29),
                    FACE_Y = (POINT.y - (MOUTH.y - HEIGHT * 0.09)) / (HEIGHT * 0.2);
                if (FACE_X * FACE_X + FACE_Y * FACE_Y < 1) {
                    continue;
                }
                let distance = Infinity;
                for (const PREVIOUS of cache.points.values()) {
                    distance = Math.min(distance, Math.hypot(POINT.x - PREVIOUS.x, POINT.y - PREVIOUS.y));
                }
                if (distance > bestDistance) {
                    best = POINT;
                    bestDistance = distance;
                }
                if (distance >= Math.min(WIDTH, HEIGHT) * 0.16) {
                    break;
                }
            }
            // Finite fallback below the face, even for a future unusually large face exclusion.
            cache.points.set(
                ENTRY.id,
                best || {
                    x: (BOUNDS.left + BOUNDS.right) * 0.5,
                    y: BOUNDS.top + HEIGHT * 0.82,
                },
            );
            if (ENTRY.id === attachment.id) {
                break;
            }
        }
    }
    return cache.points.get(attachment.id);
}

export class CornAttachmentPresentation {
    label(_definition, value) {
        return `부착 1초 후 연쇄 폭발 · 알갱이마다 공격력 ${Math.round(value * 100)}%`;
    }
    title(value) {
        return `알갱이 ${Math.round(value * 100)}%`;
    }
    // Spreads the model's small offsets over the visible front of the target's body, so the kernels sit on it
    // (a boss is far bigger than the 0.18 the offsets were made for) and follow its hit recoil.
    anchor(attachment, group, body, renderer) {
        if (body.definition && renderer) {
            const SCREEN = transformPoint(
                    body.matrix,
                    transformPoint(body.transform, cornLocalPoint(attachment, group, body.definition)),
                ),
                ORIGIN = renderer.project(0, group.targetY, 0);
            return {
                x: (SCREEN.x - ORIGIN.x) / renderer.scale,
                y: group.targetY,
                z: (ORIGIN.y - SCREEN.y) / (renderer.scale * WORLD_HEIGHT_PROJECTION),
            };
        }
        const SPREAD = body.radius / 0.18,
            FACE = body.radius * 0.55;
        return {
            x: group.targetX + attachment.offsetX * SPREAD + body.shiftX,
            y: group.targetY - FACE + body.shiftY,
            z: group.targetZ + body.height * (0.5 + (attachment.offsetY / 0.12) * 0.3),
        };
    }
    // A waiting kernel breathes faster as its fuse runs out and turns hot at the end; a popping one flares and shrinks.
    drawAttachment(renderer, attachment, group, { tick, body = DEFAULT_BODY }) {
        const AT = this.anchor(attachment, group, body, renderer),
            P = renderer.project(AT.x, AT.y, AT.z),
            FUSE = Math.min(
                1,
                Math.max(0, (tick - group.firstAttachTick) / Math.max(1, group.closeAtTick - group.firstAttachTick)),
            ),
            BASE = renderer.scale * 0.055 * body.scale;
        if (attachment.status === 'fading') {
            const POP = 1 - attachment.fadeTicks / 6;
            renderer.ring(AT.x, AT.y, POP_RING * body.scale * POP, `rgba(255,214,102,${1 - POP})`, 0.06);
            renderer.ellipse(P.x, P.y, BASE * (1.8 - POP), BASE * (1.8 - POP), `rgba(255,246,200,${1 - POP})`);
            return;
        }
        const RATE = 4 + 14 * FUSE * FUSE,
            BREATH = 1 + 0.18 * Math.sin((renderer.displayTimeMs / 1000) * RATE * Math.PI),
            HOT = FUSE > 0.7 ? (FUSE - 0.7) / 0.3 : 0,
            SIZE = BASE * BREATH;
        renderer.ellipse(
            P.x,
            P.y,
            SIZE,
            SIZE * 1.2,
            `rgba(${238 + 17 * HOT},${192 - 70 * HOT},${75 - 30 * HOT},1)`,
            attachment.angle,
        );
        renderer.ellipse(P.x - SIZE * 0.2, P.y - SIZE * 0.35, SIZE * 0.2, SIZE * 0.25, 'rgba(255,238,147,1)');
    }
}
