// The contact crack has a fixed topology. Its centerline scales with radius;
// stroke offsets remain in pixels. Retain those two affine components instead
// of rebuilding the same stroke at every visible contact frame.
const RAYS = new Map();
function raysFor(count) {
    if (!RAYS.has(count)) {
        RAYS.set(
            count,
            Array.from({ length: count }, (_value, index) => {
                const ANGLE = (index / count) * Math.PI * 2;
                return [
                    [0, 0],
                    [Math.cos(ANGLE) * 0.5, Math.sin(ANGLE) * 0.25],
                    [Math.cos(ANGLE + 0.25), Math.sin(ANGLE + 0.25) * 0.5],
                ];
            }),
        );
    }
    return RAYS.get(count);
}
function walnutContactTriangles(count, radius, width, cap, join, miterLimit) {
    const OUT = [],
        HALF = width / 2,
        EMIT = (a, b, c) => OUT.push(...a, ...b, ...c),
        FAN = (center, points) => {
            for (let index = 1; index < points.length; index++) {
                EMIT(center, points[index - 1], points[index]);
            }
        };
    for (const RAY of raysFor(count)) {
        const POINTS = RAY.map(([x, y]) => [x * radius, y * radius]),
            DIRS = [],
            NORMALS = [];
        for (let index = 0; index < 2; index++) {
            const A = POINTS[index],
                B = POINTS[index + 1],
                DX = B[0] - A[0],
                DY = B[1] - A[1],
                LENGTH = Math.hypot(DX, DY),
                D = [DX / LENGTH, DY / LENGTH],
                N = [(-DY / LENGTH) * HALF, (DX / LENGTH) * HALF];
            DIRS.push(D);
            NORMALS.push(N);
            const EXTEND = cap === 'square' ? HALF : 0,
                AX = A[0] - D[0] * EXTEND,
                AY = A[1] - D[1] * EXTEND,
                BX = B[0] + D[0] * EXTEND,
                BY = B[1] + D[1] * EXTEND,
                P = [AX + N[0], AY + N[1]],
                Q = [BX + N[0], BY + N[1]],
                R = [BX - N[0], BY - N[1]],
                S = [AX - N[0], AY - N[1]];
            EMIT(P, Q, R);
            EMIT(P, R, S);
        }
        const V = POINTS[1],
            D0 = DIRS[0],
            D1 = DIRS[1],
            N0 = NORMALS[0],
            N1 = NORMALS[1],
            CROSS = D0[0] * D1[1] - D0[1] * D1[0];
        if (Math.abs(CROSS) >= 1e-8) {
            const SIGN = CROSS > 0 ? -1 : 1,
                A = [V[0] + N0[0] * SIGN, V[1] + N0[1] * SIGN],
                B = [V[0] + N1[0] * SIGN, V[1] + N1[1] * SIGN];
            if (join === 'round') {
                const START = Math.atan2(A[1] - V[1], A[0] - V[0]),
                    END = Math.atan2(B[1] - V[1], B[0] - V[0]);
                let sweep = END - START;
                if (CROSS > 0) {
                    while (sweep > 0) {
                        sweep -= Math.PI * 2;
                    }
                } else {
                    while (sweep < 0) {
                        sweep += Math.PI * 2;
                    }
                }
                const STEPS = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 8))),
                    ARC = [A];
                for (let index = 1; index <= STEPS; index++) {
                    const ANGLE = START + (sweep * index) / STEPS;
                    ARC.push([V[0] + Math.cos(ANGLE) * HALF, V[1] + Math.sin(ANGLE) * HALF]);
                }
                FAN(V, ARC);
            } else if (join === 'miter') {
                const MX = N0[0] * SIGN + N1[0] * SIGN,
                    MY = N0[1] * SIGN + N1[1] * SIGN,
                    ML = Math.hypot(MX, MY),
                    DENOM = ML ? (MX / ML) * (N1[0] * SIGN) + (MY / ML) * (N1[1] * SIGN) : 0,
                    MITER = DENOM ? HALF / DENOM : Infinity;
                // Preserve the pinned renderer's miter calculation, including
                // its limit comparison, rather than silently changing the art.
                if (Number.isFinite(MITER) && Math.abs(MITER) <= HALF * miterLimit) {
                    EMIT(A, [V[0] + (MX / ML) * MITER, V[1] + (MY / ML) * MITER], B);
                } else {
                    EMIT(V, A, B);
                }
            } else {
                EMIT(V, A, B);
            }
        }
        if (cap === 'round') {
            for (const [INDEX, ANGLE] of [
                [0, Math.atan2(DIRS[0][1], DIRS[0][0]) + Math.PI],
                [1, Math.atan2(DIRS[1][1], DIRS[1][0])],
            ]) {
                const CENTER = POINTS[INDEX === 0 ? 0 : 2],
                    START = ANGLE - Math.PI / 2,
                    ARC = [];
                for (let index = 0; index <= 8; index++) {
                    const A = START + (Math.PI * index) / 8;
                    ARC.push([CENTER[0] + Math.cos(A) * HALF, CENTER[1] + Math.sin(A) * HALF]);
                }
                FAN(CENTER, ARC);
            }
        }
    }
    return OUT;
}
export function walnutContactGeometry(count, width, cap, join, miterLimit) {
    const BASE = walnutContactTriangles(count, 1, width, cap, join, miterLimit),
        TARGET = walnutContactTriangles(count, 2, width, cap, join, miterLimit),
        VERTICES = new Float32Array((BASE.length / 2) * 11);
    for (let index = 0; index < BASE.length; index += 2) {
        VERTICES.set(
            [
                BASE[index],
                BASE[index + 1],
                1,
                1,
                1,
                1,
                TARGET[index] - BASE[index],
                TARGET[index + 1] - BASE[index + 1],
                0,
                0,
                0,
            ],
            (index / 2) * 11,
        );
    }
    return { vertices: VERTICES, strideFloats: 11, partCount: 1, morphCount: 1 };
}
