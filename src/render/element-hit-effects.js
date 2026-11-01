import { drawElementRing, emitElementParticles, matchupParticles, ELEMENT_RGB } from './element-particles.js';

// How a unit's elemental hit looks on the enemy it lands on: the shared element particles plus a flash and a floor ring.
// A plain hit keeps the generic cream sparks in combat-feel.js. Presentation only: the hit event already carries the
// element and its matchup multiplier. `body` is the striker's body scale (T1 = 1).
const FLASH = '#fffdf0';

export function drawElementHit(renderer, event, t, crowded, body = 1) {
    const PARTICLES = matchupParticles(event.element, event.elementMultiplier ?? 1, crowded);
    emitElementParticles(renderer, event.element, { x: event.x, y: event.y, z: event.z || 0.1 }, t, {
        count: PARTICLES.count,
        size: PARTICLES.size * body,
        seed: event.sequence || 0,
    });
    if (t < 0.24) {
        const CENTER = renderer.project(event.x, event.y, event.z || 0.1),
            K = (1 - t / 0.24) * body,
            RGB = ELEMENT_RGB[event.element],
            REACH = renderer.scale * 0.3 * K;
        if (!crowded) {
            renderer.ellipse(CENTER.x, CENTER.y, REACH * 0.6, REACH * 0.4, `rgba(${RGB},${0.35 * (1 - t / 0.24)})`);
        }
        renderer.line({ x: CENTER.x - REACH, y: CENTER.y }, { x: CENTER.x + REACH, y: CENTER.y }, 0.035 * K, FLASH);
        renderer.line(
            { x: CENTER.x, y: CENTER.y - REACH * 0.65 },
            { x: CENTER.x, y: CENTER.y + REACH * 0.65 },
            0.025 * K,
            FLASH,
        );
        renderer.ellipse(CENTER.x, CENTER.y, renderer.scale * 0.07 * K, renderer.scale * 0.07 * K, FLASH);
    }
}
export function drawElementHitGround(renderer, event, t, body = 1) {
    drawElementRing(
        renderer,
        event.element,
        event,
        t,
        matchupParticles(event.element, event.elementMultiplier ?? 1, false).size * body,
    );
}
