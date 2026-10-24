// Points are already in the compiled SVG canvas coordinate system. Source SVG
// transforms are baked into geometry; never apply them again to these anchors.
function readVectorSockets({ metadata, viewBox, sourcePath }, label = sourcePath || metadata?.id || 'unknown asset') {
    const FAIL = (message) => {
        throw new Error(`Vector socket contract (${label}): ${message}`);
    };
    if (
        !Array.isArray(viewBox) ||
        viewBox.length !== 4 ||
        !viewBox.every(Number.isFinite) ||
        viewBox[2] <= 0 ||
        viewBox[3] <= 0
    ) {
        FAIL('a finite SVG viewBox is required');
    }
    const PARTS = new Map((metadata?.parts || []).map((part) => [part.id, part]));
    const ANCHORS = {};
    for (const NAME of ['mouth', 'ground']) {
        const SOCKET = metadata?.sockets?.[NAME];
        if (!SOCKET || !PARTS.has(SOCKET.part)) {
            FAIL(`${NAME} must name an authored part`);
        }
        if (!Array.isArray(SOCKET.point) || SOCKET.point.length !== 2 || !SOCKET.point.every(Number.isFinite)) {
            FAIL(`${NAME} must contain two finite canvas coordinates`);
        }
        const [X, Y] = SOCKET.point;
        if (X < viewBox[0] || X > viewBox[0] + viewBox[2] || Y < viewBox[1] || Y > viewBox[1] + viewBox[3]) {
            FAIL(`${NAME} lies outside the SVG canvas`);
        }
        ANCHORS[NAME] = Object.freeze({
            part: SOCKET.part,
            x: X,
            y: Y,
        });
    }
    if (ANCHORS.ground.part !== 'body') {
        FAIL('ground must belong to body');
    }
    if (ANCHORS.mouth.y >= ANCHORS.ground.y) {
        FAIL('mouth must be above the authored ground baseline');
    }
    return Object.freeze(ANCHORS);
}
const BOSS_VECTOR_DIAMETER = 220,
    BOSS_VECTOR_RADIUS_SCALE = 1.16,
    WORLD_HEIGHT_PROJECTION = 0.785,
    WORLD_DEPTH_PROJECTION = 0.62;
// Every boss is the troop art of its species at this one size; its hit volume is then measured from the drawn body.
const BOSS_ART_RADIUS = 4.4;
function bossVectorScale() {
    return (2 * BOSS_ART_RADIUS * BOSS_VECTOR_RADIUS_SCALE) / BOSS_VECTOR_DIAMETER;
}
function socketWorldPoint(boss, socket, ground) {
    const SCALE = bossVectorScale();
    // Boss art is a screen-facing billboard. Its canvas x is world x, not facing
    // distance. Keep the static ground baseline fixed to the world's shadow root.
    return {
        x: boss.x + (socket.x - ground.x) * SCALE,
        y: boss.y,
        z: (boss.z || 0) + ((ground.y - socket.y) * SCALE) / WORLD_HEIGHT_PROJECTION,
    };
}
export {
    readVectorSockets,
    BOSS_ART_RADIUS,
    bossVectorScale,
    socketWorldPoint,
    WORLD_HEIGHT_PROJECTION,
    WORLD_DEPTH_PROJECTION,
};
