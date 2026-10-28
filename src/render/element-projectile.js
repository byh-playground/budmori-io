import { ELEMENT_RGB, emitElementParticles } from './element-particles.js';

// A coloured unit's projectile carries its element in flight: a tinted glow on the head, a tinted tail, and a short
// stream of the shared element particles. Drawn over the projectile's own art by the one shared draw call, so no
// projectile type needs an element branch.
const STREAM_PARTICLES = 2;
const STREAM_SIZE = 0.45;
const STREAM_RATE = 2.2;

export function drawElementProjectile(renderer, projectile, head, tail) {
    const TINT = ELEMENT_RGB[projectile.element],
        SIZE = renderer.scale * 0.1,
        BACK = renderer.project(tail.x, tail.y, tail.z);
    renderer.ellipse(head.x, head.y, SIZE * 1.7, SIZE * 1.3, `rgba(${TINT},0.38)`);
    renderer.line(BACK, head, 0.07, `rgba(${TINT},0.55)`);
    for (let k = 0; k < STREAM_PARTICLES; k++) {
        const PHASE = (projectile.elapsed * STREAM_RATE + k / STREAM_PARTICLES) % 1;
        emitElementParticles(renderer, projectile.element, projectile, PHASE, {
            count: 1,
            size: STREAM_SIZE,
            seed: projectile.id * 3 + k + Math.floor(projectile.elapsed * STREAM_RATE + k / STREAM_PARTICLES),
        });
    }
}
