import { T1_DIAMETER } from './model-base.js';
// One size rule for every skill drawn against a body: widths and particle sizes tuned for a tier-1 body grow with the
// drawn body radius, softened so a boss gets heavier marks without every line turning into a bar.
export const REFERENCE_RADIUS = T1_DIAMETER / 2,
    SCALE_EXPONENT = 0.7;
export function bodyScale(radius) {
    return Math.max(1, (Number.isFinite(radius) ? radius : REFERENCE_RADIUS) / REFERENCE_RADIUS) ** SCALE_EXPONENT;
}
export function stroke(renderer, points, color, width) {
    const C = renderer.ctx;
    C.beginPath();
    for (let i = 0; i < points.length; i++) {
        const P = renderer.project(...points[i]);
        if (i === 0) {
            C.moveTo(P.x, P.y);
        } else {
            C.lineTo(P.x, P.y);
        }
    }
    C.strokeStyle = color;
    C.lineWidth = Math.max(renderer.pixelRatio, renderer.scale * width);
    C.lineCap = 'round';
    C.lineJoin = 'round';
    C.stroke();
}
// Visual reference: PixelFX a841596, lightning-strike / small-explosion / holy-heal.
// These bounded vector motifs are independently authored for the native WebGL canvas.
const BOLT_POINTS = Array.from({ length: 10 }, () => [0, 0, 0]),
    LINE = [
        [0, 0, 0],
        [0, 0, 0],
    ],
    BRANCH = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
    ];

export function glint(renderer, x, y, z, radius, alpha = 1, rgb = '180,235,255') {
    if (alpha <= 0) {
        return;
    }
    const P = renderer.project(x, y, z),
        S = Math.max(renderer.pixelRatio, radius * renderer.scale),
        C = renderer.ctx;
    renderer.ellipse(P.x, P.y, S * 1.8, S * 1.2, `rgba(${rgb},${alpha * 0.1})`);
    C.beginPath();
    C.moveTo(P.x, P.y - S * 2.1);
    C.lineTo(P.x + S * 0.36, P.y - S * 0.3);
    C.lineTo(P.x + S * 1.4, P.y);
    C.lineTo(P.x + S * 0.36, P.y + S * 0.3);
    C.lineTo(P.x, P.y + S * 2.1);
    C.lineTo(P.x - S * 0.36, P.y + S * 0.3);
    C.lineTo(P.x - S * 1.4, P.y);
    C.lineTo(P.x - S * 0.36, P.y - S * 0.3);
    C.closePath();
    C.fillStyle = `rgba(${rgb},${alpha})`;
    C.fill();
    renderer.ellipse(P.x, P.y, S * 0.28, S * 0.28, `rgba(250,255,244,${alpha})`);
}

export function radialStreaks(renderer, x, y, z, radius, progress, seed = 0, rgb = '255,225,155') {
    if (progress < 0 || progress >= 1) {
        return;
    }
    const FADE = (1 - progress) ** 1.6,
        REACH = 1 - (1 - progress) ** 2;
    for (let i = 0; i < 8; i++) {
        const A = i * 2.39996 + seed,
            LENGTH = radius * (0.65 + (i % 3) * 0.28),
            START = LENGTH * REACH,
            END = START + LENGTH * 0.42 * FADE;
        LINE[0][0] = x + Math.cos(A) * START;
        LINE[0][1] = y + Math.sin(A) * START * 0.65;
        LINE[0][2] = z + Math.sin(i * 1.7) * radius * 0.1;
        LINE[1][0] = x + Math.cos(A) * END;
        LINE[1][1] = y + Math.sin(A) * END * 0.65;
        LINE[1][2] = LINE[0][2];
        stroke(renderer, LINE, `rgba(${rgb},${FADE * 0.8})`, radius * 0.055 * FADE);
    }
}

export function segmentedRing(renderer, x, y, z, radius, alpha, phase = 0, rgb = '150,225,255') {
    if (alpha <= 0) {
        return;
    }
    for (let i = 0; i < 6; i++) {
        const A = (i * Math.PI) / 3 + phase;
        renderer.ring(x, y, radius, `rgba(${rgb},${alpha * 0.7})`, radius * 0.035, A, A + 0.64, z);
        renderer.ring(x, y, radius * 0.97, `rgba(244,255,240,${alpha * 0.65})`, radius * 0.012, A + 0.15, A + 0.44, z);
    }
}

export function bolt(renderer, x, y, z, height, age, seed = 0, radius = 0.3) {
    const FADE = Math.max(0, 1 - age / 0.65);
    if (FADE <= 0) {
        return;
    }
    const SCALE = bodyScale(radius),
        IMPACT = Math.max(0, 1 - age / 0.14);
    for (let i = 0; i < BOLT_POINTS.length; i++) {
        const T = i / (BOLT_POINTS.length - 1),
            P = BOLT_POINTS[i];
        P[0] = x + (i === 9 ? 0 : Math.sin(i * 13.17 + seed) * 0.2 * SCALE);
        P[1] = y + (i === 9 ? 0 : Math.cos(i * 5.7 + seed) * 0.08 * SCALE);
        P[2] = z + height * (1 - T);
    }
    if (age < 0.12) {
        stroke(renderer, BOLT_POINTS, `rgba(53,111,245,${IMPACT * 0.28})`, 0.48 * SCALE);
        stroke(renderer, BOLT_POINTS, `rgba(114,199,255,${FADE})`, 0.16 * SCALE);
        stroke(renderer, BOLT_POINTS, `rgba(245,255,255,${FADE})`, 0.055 * SCALE);
        for (let i = 0; i < 3; i++) {
            const ROOT = BOLT_POINTS[2 + i * 2],
                SIDE = i % 2 ? 1 : -1;
            BRANCH[0][0] = ROOT[0];
            BRANCH[0][1] = ROOT[1];
            BRANCH[0][2] = ROOT[2];
            BRANCH[1][0] = ROOT[0] + SIDE * radius * 0.55;
            BRANCH[1][1] = y;
            BRANCH[1][2] = ROOT[2] - height * 0.12;
            BRANCH[2][0] = ROOT[0] + SIDE * radius;
            BRANCH[2][1] = y;
            BRANCH[2][2] = ROOT[2] - height * 0.3;
            stroke(renderer, BRANCH, `rgba(120,196,255,${IMPACT * 0.7})`, 0.04 * SCALE);
        }
    } else {
        for (let i = 0; i < BOLT_POINTS.length - 1; i++) {
            if ((i + Math.floor(age * 13)) % 3 === 0) {
                continue;
            }
            for (let axis = 0; axis < 3; axis++) {
                LINE[0][axis] = BOLT_POINTS[i][axis];
                LINE[1][axis] = BOLT_POINTS[i + 1][axis];
            }
            stroke(renderer, LINE, `rgba(112,170,255,${FADE * 0.55})`, 0.045 * SCALE);
        }
    }
    radialStreaks(renderer, x, y, z, radius * 1.25, age / 0.35, seed, '165,215,255');
    renderer.ring(
        x,
        y,
        radius * (0.5 + Math.min(1, age / 0.3)),
        `rgba(140,194,255,${FADE * 0.55})`,
        0.04 * SCALE,
        0,
        Math.PI * 2,
        z,
    );
    glint(renderer, x, y, z, radius * 0.22, IMPACT, '218,244,255');
}
export function groundShadow(renderer, x, y, radius, alpha, fade = 1) {
    const P = renderer.project(x, y, 0);
    renderer.ellipse(
        P.x,
        P.y,
        renderer.scale * radius,
        renderer.scale * radius * 0.62,
        `rgba(20,12,8,${alpha * fade})`,
    );
}
export function burst(renderer, x, y, z, radius, age, seed = 0, rgb = '255,224,130') {
    const FADE = Math.max(0, 1 - age / 0.55);
    if (FADE <= 0) {
        return;
    }
    for (let i = 0; i < 10; i++) {
        const A = i * 2.399 + seed,
            SPEED = radius * (2.2 + (i % 3)),
            PREVIOUS = Math.max(0, age - 0.045),
            PX = x + Math.cos(A) * SPEED * age,
            PY = y + Math.sin(A) * SPEED * age * 0.6,
            PZ = z + (2.2 + (i % 4) * 0.7) * radius * age - 6 * radius * age * age;
        LINE[0][0] = x + Math.cos(A) * SPEED * PREVIOUS;
        LINE[0][1] = y + Math.sin(A) * SPEED * PREVIOUS * 0.6;
        LINE[0][2] = z + (2.2 + (i % 4) * 0.7) * radius * PREVIOUS - 6 * radius * PREVIOUS * PREVIOUS;
        LINE[1][0] = PX;
        LINE[1][1] = PY;
        LINE[1][2] = PZ;
        stroke(renderer, LINE, `rgba(${rgb},${FADE * 0.9})`, radius * 0.07 * FADE);
        if (i % 3 === 0) {
            glint(renderer, PX, PY, PZ, radius * 0.08, FADE * 0.8, rgb);
        }
    }
}
export function cloud(renderer, x, y, z, size, alpha = 1) {
    for (let i = 0; i < 5; i++) {
        const P = renderer.project(x + (i - 2) * 0.25 * size, y, z + Math.sin(i * 1.4) * 0.14 * size);
        renderer.ellipse(
            P.x,
            P.y,
            renderer.scale * size * 0.34,
            renderer.scale * size * 0.26,
            `rgba(38,53,83,${alpha * 0.92})`,
        );
    }
    for (let i = 0; i < 4; i++) {
        const P = renderer.project(x + (i - 1.5) * 0.25 * size, y, z + size * 0.14 + Math.sin(i * 2.1) * 0.1 * size);
        renderer.ellipse(
            P.x,
            P.y,
            renderer.scale * size * 0.26,
            renderer.scale * size * 0.18,
            `rgba(135,160,199,${alpha * 0.8})`,
        );
    }
}
export class FormationPresentation {
    draw(_renderer, _effect, _world) {
        /* Concrete skill owns its visual. */
    }
}
