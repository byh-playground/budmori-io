import { ELEMENT_RGB } from './element-hit-effects.js';

// A coloured unit's projectile carries its element in flight: a tinted glow on the head, a tinted tail, and one small
// mark that reads as the element (embers, droplets, a leaf, a crystal glint, a spark). Drawn over the projectile's own
// art by the one shared draw call, so no projectile type needs an element branch.
const TAU = Math.PI * 2;
const MARKS = Object.freeze({
    1: (renderer, head, _tint, clock, size) => {
        const RISE = (clock * 3) % 1;
        renderer.ellipse(
            head.x,
            head.y - size * (0.5 + RISE),
            size * 0.32,
            size * 0.32,
            `rgba(255,214,120,${1 - RISE})`,
        );
    },
    2: (renderer, head, _tint, clock, size) => {
        const TURN = clock * 4;
        renderer.ellipse(head.x, head.y, size * 0.22, size * 0.8, 'rgba(255,255,255,0.85)', TURN);
    },
    3: (renderer, head, tint, clock, size) => {
        const TURN = clock * 6;
        renderer.ellipse(head.x - size * 0.7, head.y - size * 0.4, size * 0.55, size * 0.25, `rgba(${tint},0.9)`, TURN);
    },
    4: (renderer, head, _tint, clock, size) => {
        const FLICK = Math.floor(clock * 18) % 2 ? 1 : -1;
        renderer.line(
            { x: head.x - size * 0.9, y: head.y + size * 0.5 * FLICK },
            { x: head.x + size * 0.1, y: head.y - size * 0.4 * FLICK },
            0.05,
            'rgba(255,255,240,0.95)',
        );
    },
    5: (renderer, head, tint, clock, size) => {
        const DROP = (clock * 3) % 1;
        renderer.ellipse(
            head.x - size * 0.3,
            head.y + size * DROP,
            size * 0.28,
            size * 0.28,
            `rgba(${tint},${1 - DROP})`,
        );
    },
});

export function drawElementProjectile(renderer, projectile, head, tail) {
    const TINT = ELEMENT_RGB[projectile.element],
        SIZE = renderer.scale * 0.1,
        BACK = renderer.project(tail.x, tail.y, tail.z);
    renderer.ellipse(head.x, head.y, SIZE * 1.7, SIZE * 1.3, `rgba(${TINT},0.38)`);
    renderer.line(BACK, head, 0.07, `rgba(${TINT},0.55)`);
    MARKS[projectile.element](renderer, head, TINT, (projectile.elapsed * 1.7) % TAU, SIZE);
}
