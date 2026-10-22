import { T1_DIAMETER } from './model-base.js';
// One size rule for every skill drawn against a body: widths and particle sizes tuned for a tier-1 body grow with the
// drawn body radius, softened so a boss gets heavier marks without every line turning into a bar.
const REFERENCE_RADIUS = T1_DIAMETER / 2,
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
export function bolt(renderer, x, y, z, height, age, seed = 0, radius = 0.3) {
    const FADE = Math.max(0, 1 - age / 0.65);
    if (FADE <= 0) {
        return;
    }
    const BODY_SCALE = bodyScale(radius);
    const POINTS = [];
    for (let i = 0; i <= 9; i++) {
        POINTS.push([
            x + (i === 9 ? 0 : Math.sin(i * 13.17 + seed) * 0.32 * BODY_SCALE),
            y + (i === 9 ? 0 : Math.cos(i * 5.7 + seed) * 0.12 * BODY_SCALE),
            z + height * (1 - i / 9),
        ]);
    }
    if (age < 0.12) {
        stroke(renderer, POINTS, `rgba(51,121,255,${FADE * 0.3})`, 0.9 * BODY_SCALE);
        stroke(renderer, POINTS, `rgba(99,181,255,${FADE * 0.8})`, 0.34 * BODY_SCALE);
        stroke(renderer, POINTS, `rgba(236,251,255,${FADE})`, 0.17 * BODY_SCALE);
    } else {
        for (let i = 0; i < POINTS.length - 1; i++) {
            const FRAGMENT = Math.max(0, 1 - (age - 0.12 - (i % 3) * 0.035) / 0.35);
            if (i % 3 === Math.floor(age * 9) % 3) {
                continue;
            }
            const SEGMENT = POINTS.slice(i, i + 2);
            stroke(renderer, SEGMENT, `rgba(84,169,255,${FRAGMENT * 0.55})`, 0.16 * BODY_SCALE);
            stroke(renderer, SEGMENT, `rgba(216,247,255,${FRAGMENT})`, 0.035 * BODY_SCALE);
        }
    }
    renderer.ring(
        x,
        y,
        radius + age * radius * 10,
        `rgba(157,212,255,${FADE * 0.8})`,
        0.09 * BODY_SCALE,
        0,
        Math.PI * 2,
        z,
    );
    if (age < 0.09) {
        const P = renderer.project(x, y, z + 0.15);
        renderer.ellipse(P.x, P.y, renderer.scale * radius * 2.17, renderer.scale * radius * 1.4, '#effcffdd');
    }
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
            SPEED = radius * (3 + (i % 3)),
            PX = x + Math.cos(A) * SPEED * age,
            PY = y + Math.sin(A) * SPEED * age * 0.6,
            PZ = z + (2.2 + (i % 4) * 0.7) * radius * age - 6 * radius * age * age,
            P = renderer.project(PX, PY, PZ);
        renderer.ellipse(
            P.x,
            P.y,
            renderer.scale * radius * 0.16,
            renderer.scale * radius * 0.16,
            `rgba(${rgb},${FADE})`,
        );
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
            `rgba(98,128,157,${alpha * 0.85})`,
        );
    }
    for (let i = 0; i < 4; i++) {
        const P = renderer.project(x + (i - 1.5) * 0.25 * size, y, z + size * 0.14 + Math.sin(i * 2.1) * 0.1 * size);
        renderer.ellipse(
            P.x,
            P.y,
            renderer.scale * size * 0.26,
            renderer.scale * size * 0.18,
            `rgba(168,190,212,${alpha * 0.8})`,
        );
    }
}
export class FormationPresentation {
    draw(_renderer, _effect, _world) {
        /* Concrete skill owns its visual. */
    }
}
