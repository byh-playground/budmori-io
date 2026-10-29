import { buildFace } from '../units/face-layer.js';

const FACE_SOCKETS = ['face-eye-left', 'face-eye-right', 'face-mouth'];
const OPS_CACHE = new Map();

// The three face sockets of a compiled body at its rest pose, in the body's SVG canvas.
export function faceAnchor(compiled) {
    const SOCKETS = compiled.metadata.sockets,
        POINT = (id) => {
            const SOCKET = SOCKETS[id];
            if (!SOCKET) {
                throw new Error('Body is missing face socket ' + id + ' (' + compiled.sourcePath + ')');
            }
            return SOCKET.point;
        };
    return { eyeLeft: POINT(FACE_SOCKETS[0]), eyeRight: POINT(FACE_SOCKETS[1]), mouth: POINT(FACE_SOCKETS[2]) };
}

export function faceOps(compiled, faceId, cheekColor) {
    const KEY = compiled.sourceSha256 + ':' + faceId + ':' + cheekColor;
    let ops = OPS_CACHE.get(KEY);
    if (!ops) {
        ops = Object.freeze(buildFace(faceId, faceAnchor(compiled), cheekColor));
        OPS_CACHE.set(KEY, ops);
    }
    return ops;
}

// Maps the rest anchor triangle onto the posed one, so squash, lean and bounce carry the face like the body.
export function posedFace(player, rest, out) {
    const EL = player.getSocket(FACE_SOCKETS[0]),
        ER = player.getSocket(FACE_SOCKETS[1]),
        MO = player.getSocket(FACE_SOCKETS[2]);
    const U1X = rest.eyeRight[0] - rest.eyeLeft[0],
        U1Y = rest.eyeRight[1] - rest.eyeLeft[1],
        U2X = rest.mouth[0] - rest.eyeLeft[0],
        U2Y = rest.mouth[1] - rest.eyeLeft[1],
        V1X = ER.x - EL.x,
        V1Y = ER.y - EL.y,
        V2X = MO.x - EL.x,
        V2Y = MO.y - EL.y,
        DET = U1X * U2Y - U1Y * U2X;
    // [a c; b d] = V * U^-1
    out[0] = (V1X * U2Y - V2X * U1Y) / DET;
    out[1] = (V1Y * U2Y - V2Y * U1Y) / DET;
    out[2] = (V2X * U1X - V1X * U2X) / DET;
    out[3] = (V2Y * U1X - V1Y * U2X) / DET;
    out[4] = EL.x - (out[0] * rest.eyeLeft[0] + out[2] * rest.eyeLeft[1]);
    out[5] = EL.y - (out[1] * rest.eyeLeft[0] + out[3] * rest.eyeLeft[1]);
    return out;
}
export const POSED = [0, 0, 0, 0, 0, 0];

// matrix: the screen transform the body was drawn with; alpha: the body's alpha. Call after the body's own submission.
export function drawUnitFace(ctx, record, player, faceId, cheekColor, matrix, alpha = 1) {
    if (!faceId) {
        return;
    }
    const OPS = faceOps(record.compiled, faceId, cheekColor),
        P = posedFace(player, faceAnchor(record.compiled), POSED);
    ctx.save();
    ctx.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
    ctx.transform(P[0], P[1], P[2], P[3], P[4], P[5]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const OP of OPS) {
        ctx.beginPath();
        for (const [COMMAND, ...N] of OP.path) {
            if (COMMAND === 'M') {
                ctx.moveTo(N[0], N[1]);
            } else if (COMMAND === 'L') {
                ctx.lineTo(N[0], N[1]);
            } else if (COMMAND === 'Q') {
                ctx.quadraticCurveTo(N[0], N[1], N[2], N[3]);
            } else if (COMMAND === 'C') {
                ctx.bezierCurveTo(N[0], N[1], N[2], N[3], N[4], N[5]);
            } else {
                ctx.closePath();
            }
        }
        if (OP.fill) {
            ctx.globalAlpha = OP.opacity * alpha;
            ctx.fillStyle = OP.fill;
            ctx.fill();
        } else {
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = OP.stroke;
            ctx.lineWidth = OP.width;
            ctx.stroke();
        }
    }
    ctx.restore();
}
