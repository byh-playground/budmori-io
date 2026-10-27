import { WORLD_DEPTH_PROJECTION } from '../../../../vector-sockets.js';
import { TAU, clamp, polar, rand } from './brush.js';

// Fire: a flat-packet breath, one burst per burn tick.
const FIRE_CONFIG = Object.freeze({
    lifeMs: 800,
    packets: 60,
    packetDelay: 0.2,
    packetLife: 0.42,
    packetLifeSpread: 0.14,
    smokePuffs: 8,
    hot: '#fff09a',
    mid: '#ff9b32',
    cool: '#d94718',
    glow: '#ff8a28',
    flash: '#ffe9a0',
    scorch: '#ff6a1e',
    smoke: '#1d1612',
    spark: '#ffd070',
    windupEmbers: 18,
    windupEmber: '#ffaa3c',
});

function fireBurst(brush, event, seconds) {
    const HALF = event.sector / 2,
        MOUTH = event.radius * 0.85,
        SEED = event.tick ?? 1,
        PACKETS = [];
    for (let index = 0; index < FIRE_CONFIG.packets; index++) {
        const DELAY = rand(index, SEED + 1) * FIRE_CONFIG.packetDelay,
            LIFE = FIRE_CONFIG.packetLife + FIRE_CONFIG.packetLifeSpread * rand(index, SEED + 2),
            Q = (seconds - DELAY) / LIFE;
        if (Q < 0 || Q > 1) {
            continue;
        }
        const U = rand(index, SEED + 3) * 2 - 1,
            EDGE = rand(index, SEED + 4) < 0.14,
            OFFSET =
                (EDGE ? Math.sign(U || 1) * (0.86 + 0.12 * rand(index, SEED + 5)) : Math.sign(U) * Math.abs(U) ** 0.9) *
                    HALF +
                Math.sin(Q * TAU + rand(index, SEED + 6) * 6) * HALF * 0.03,
            TRAVEL = Q ** 0.94,
            DIST = MOUTH + (event.reach * (0.98 + 0.16 * rand(index, SEED + 7)) - MOUTH) * TRAVEL,
            ANGLE = event.angle + OFFSET,
            CENTER = 1 - Math.min(1, Math.abs(OFFSET) / HALF);
        PACKETS.push({
            q: Q,
            ...polar(event.x, event.y, ANGLE, DIST),
            z: 1.6 * (1 - TRAVEL) + 0.4 + Math.sin(Q * Math.PI) * 1.4 * rand(index, SEED + 9),
            size: (0.55 + 0.9 * Math.sin(Math.PI * Q)) * (0.7 + 0.3 * CENTER) * (0.7 + 0.6 * rand(index, SEED + 8)),
            alpha: (0.55 + 0.4 * CENTER) * clamp(Q / 0.05) * clamp((1 - Q) / 0.14),
            heading: Math.atan2(-WORLD_DEPTH_PROJECTION * Math.sin(ANGLE), Math.cos(ANGLE)),
        });
    }
    const SCORCH = clamp(seconds / 0.4) * (1 - clamp((seconds - 0.4) / 0.4)),
        SCORCH_AT = polar(event.x, event.y, event.angle, event.reach * 0.62);
    brush.flat(SCORCH_AT.x, SCORCH_AT.y, event.reach * 0.28, event.reach * 0.28, FIRE_CONFIG.scorch, 0.16 * SCORCH);
    const SMOKE = [];
    for (let index = 0; index < FIRE_CONFIG.smokePuffs; index++) {
        const Q = (seconds - 0.2 - rand(index, SEED + 11) * 0.2) / 0.6;
        if (Q >= 0 && Q <= 1) {
            const PUFF = {
                q: Q,
                ...polar(
                    event.x,
                    event.y,
                    event.angle + (rand(index, SEED + 12) * 2 - 1) * HALF * 0.8,
                    event.reach * (0.5 + 0.5 * rand(index, SEED + 13)),
                ),
            };
            SMOKE.push(PUFF);
            brush.dot(PUFF.x, PUFF.y, 0.8 + Q * 2, 0.35 + 0.5 * Q, FIRE_CONFIG.smoke, 0.2 * Math.sin(Q * Math.PI));
        }
    }
    for (const PACKET of PACKETS) {
        const COLOR = PACKET.q < 0.24 ? FIRE_CONFIG.hot : PACKET.q < 0.58 ? FIRE_CONFIG.mid : FIRE_CONFIG.cool;
        brush.sliver(PACKET.x, PACKET.y, PACKET.z, PACKET.size, PACKET.heading, COLOR, PACKET.alpha);
    }
    // The glow of the hot packets, the muzzle flash and the sparks add up where they overlap.
    brush.add(true);
    for (const PACKET of PACKETS) {
        if (PACKET.q < 0.3) {
            brush.dot(PACKET.x, PACKET.y, PACKET.z, PACKET.size * 1.7, FIRE_CONFIG.glow, PACKET.alpha * 0.2);
        }
    }
    const MUZZLE = 1 - clamp(seconds / 0.32);
    if (MUZZLE > 0) {
        const AT = polar(event.x, event.y, event.angle, MOUTH);
        brush.dot(AT.x, AT.y, 1.4, 1.5 * MUZZLE + 0.3, FIRE_CONFIG.glow, 0.3 * MUZZLE);
        brush.dot(AT.x, AT.y, 1.4, 0.8 * MUZZLE + 0.2, FIRE_CONFIG.flash, 0.6 * MUZZLE);
    }
    for (const PUFF of SMOKE) {
        brush.dot(PUFF.x, PUFF.y, 0.5 + PUFF.q * 2.6, 0.12, FIRE_CONFIG.spark, 0.9 * (1 - PUFF.q));
    }
}

// Embers drifting up inside the danger sector while the breath winds up.
function fireWindup(brush, area, progress, seconds) {
    brush.add(true);
    for (let index = 0; index < FIRE_CONFIG.windupEmbers; index++) {
        const Q = (seconds * 0.9 + rand(index, 1)) % 1,
            AT = polar(
                area.x,
                area.y,
                area.angle + (rand(index, 2) * 2 - 1) * (area.sector / 2) * 0.9,
                area.reach * (0.15 + 0.85 * rand(index, 3)) * progress,
            );
        brush.dot(AT.x, AT.y, 0.4 + Q * 1.6, 0.1, FIRE_CONFIG.windupEmber, (1 - Q) * 0.9 * progress);
    }
}

export const FIRE_EFFECT = Object.freeze({ lifeMs: FIRE_CONFIG.lifeMs, draw: fireBurst, windup: fireWindup });
