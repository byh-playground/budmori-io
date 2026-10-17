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
export function bolt(renderer, x, y, z, height, age, seed = 0) {
    const FADE = Math.max(0, 1 - age / 0.65);
    if (FADE <= 0) {
        return;
    }
    const POINTS = [];
    for (let i = 0; i <= 9; i++) {
        POINTS.push([
            x + (i === 9 ? 0 : Math.sin(i * 13.17 + seed) * 0.32),
            y + (i === 9 ? 0 : Math.cos(i * 5.7 + seed) * 0.12),
            z + height * (1 - i / 9),
        ]);
    }
    if (age < 0.12) {
        stroke(renderer, POINTS, `rgba(51,121,255,${FADE * 0.2})`, 0.5);
        stroke(renderer, POINTS, `rgba(99,181,255,${FADE * 0.65})`, 0.19);
        stroke(renderer, POINTS, `rgba(236,251,255,${FADE})`, 0.11);
    } else {
        for (let i = 0; i < POINTS.length - 1; i++) {
            const FRAGMENT = Math.max(0, 1 - (age - 0.12 - (i % 3) * 0.035) / 0.35);
            if (i % 3 === Math.floor(age * 9) % 3) {
                continue;
            }
            const SEGMENT = POINTS.slice(i, i + 2);
            stroke(renderer, SEGMENT, `rgba(84,169,255,${FRAGMENT * 0.55})`, 0.16);
            stroke(renderer, SEGMENT, `rgba(216,247,255,${FRAGMENT})`, 0.035);
        }
    }
    renderer.ring(x, y, 0.3 + age * 3, `rgba(157,212,255,${FADE * 0.8})`, 0.09);
    if (age < 0.09) {
        const P = renderer.project(x, y, z + 0.15);
        renderer.ellipse(P.x, P.y, renderer.scale * 0.65, renderer.scale * 0.42, '#effcffdd');
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
            `rgba(98,128,157,${alpha})`,
        );
    }
}
export class FormationPresentation {
    draw(_renderer, _effect, _world) {
        /* Concrete skill owns its visual. */
    }
}
