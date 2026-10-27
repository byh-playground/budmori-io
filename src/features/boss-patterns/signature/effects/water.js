import { TAU, ballistic, clamp, polar, rand } from './brush.js';

// Water: a jet made of hundreds of droplets, a splash at its end.
const WATER_CONFIG = Object.freeze({
    lifeMs: 1000,
    droplets: 150,
    splashSparks: 28,
    windupDroplets: 14,
    dark: '#2f86d6',
    mid: '#4cb0f2',
    light: '#6ac4fa',
    spark: '#f2fbff',
    ripple: '#d2f0ff',
    pool: '#3c8cd2',
    poolRim: '#bee9ff',
    windupDroplet: '#cfeeff',
});

function waterJet(brush, event, seconds) {
    const COS = Math.cos(event.angle),
        SIN = Math.sin(event.angle),
        REACH = event.reach,
        START = event.radius * 0.85,
        EXTENT = REACH + 1.4,
        WIDTH = event.width,
        DROPS = [];
    for (let index = 0; index < WATER_CONFIG.droplets; index++) {
        const LIFE = 0.34 + 0.2 * rand(index, 3),
            DELAY = rand(index, 4) * 0.34,
            Q = (seconds - DELAY) / LIFE;
        if (Q < 0 || Q > 1) {
            continue;
        }
        const ALONG = START + (EXTENT - START) * Q,
            SPREAD = (rand(index, 1) * 2 - 1) * WIDTH * (0.35 + 0.65 * Math.min(1, Q * 1.6)),
            TURBULENCE = Math.sin(Q * 14 + rand(index, 2) * 6 + seconds * 22) * 0.12 * (0.3 + Q),
            ARC = Math.sin(Q * Math.PI) * (0.3 + 1.1 * rand(index, 5));
        let along = ALONG,
            lift = 0.9 + ARC,
            across = SPREAD + TURBULENCE;
        if (ALONG > REACH) {
            const E = (ALONG - REACH) / 1.4;
            along = REACH + E * 0.9 * (rand(index, 6) - 0.3);
            lift = 0.9 + Math.sin(E * Math.PI * 0.9) * (1 + 2 * rand(index, 7));
            across = SPREAD * (1 + E);
        }
        DROPS.push({
            x: event.x + COS * along - SIN * across,
            y: event.y + SIN * along + COS * across,
            z: lift,
            r: (0.22 + 0.26 * rand(index, 8)) * (ALONG > REACH ? 0.7 : 1),
            a: clamp(Q / 0.04) * (1 - clamp((Q - 0.9) / 0.1)),
            tone: rand(index, 9),
        });
    }
    for (const DROP of DROPS) {
        brush.dot(DROP.x, DROP.y, DROP.z, DROP.r * 1.7, WATER_CONFIG.dark, 0.4 * DROP.a);
    }
    for (const DROP of DROPS) {
        brush.dot(
            DROP.x,
            DROP.y,
            DROP.z,
            DROP.r,
            DROP.tone > 0.5 ? WATER_CONFIG.mid : WATER_CONFIG.light,
            0.82 * DROP.a,
        );
    }
    brush.add(true);
    for (const DROP of DROPS) {
        brush.dot(
            DROP.x - DROP.r * 0.3,
            DROP.y,
            DROP.z + DROP.r * 0.5,
            DROP.r * 0.38,
            WATER_CONFIG.spark,
            0.9 * DROP.a,
        );
    }
    brush.add(false);
    const SPLASH = clamp((seconds - 0.28) / 0.7),
        END = polar(event.x, event.y, event.angle, REACH);
    for (let ring = 0; ring < 3; ring++) {
        const Q = clamp(SPLASH * 1.15 - ring * 0.12);
        if (Q > 0 && Q < 1) {
            const RADIUS = 1 + Q * (4.5 + ring);
            brush.flat(END.x, END.y, RADIUS, RADIUS, null, (1 - Q) * 0.85, WATER_CONFIG.ripple, 0.16 * (1 - Q) + 0.05);
        }
    }
    for (let index = 0; index < WATER_CONFIG.splashSparks; index++) {
        const T = (seconds - 0.2 - rand(index, 22) * 0.35) / 0.55;
        if (T < 0 || T > 1) {
            continue;
        }
        const AT = ballistic(
            END.x,
            END.y,
            rand(index, 1) * TAU,
            2 + 5 * rand(index, 2),
            T,
            0,
            3 + 4 * rand(index, 3),
            9,
        );
        if (AT.z >= 0) {
            brush.dot(
                AT.x,
                AT.y,
                AT.z,
                0.12 + 0.12 * rand(index, 4),
                index % 2 ? WATER_CONFIG.light : WATER_CONFIG.spark,
                1 - T * T,
            );
        }
    }
    const POOL = clamp((seconds - 0.4) / 0.5) * (1 - clamp((seconds - 0.8) / 0.4));
    brush.flat(END.x, END.y, 2.4, 2.4, WATER_CONFIG.pool, 0.28 * POOL, WATER_CONFIG.poolRim, 0.05);
}

// Spray beads travel along the danger lane while the jet winds up.
function waterWindup(brush, area, progress, seconds) {
    const COS = Math.cos(area.angle),
        SIN = Math.sin(area.angle);
    for (let index = 0; index < WATER_CONFIG.windupDroplets; index++) {
        const Q = (seconds * 0.8 + rand(index, 1)) % 1,
            ALONG = area.reach * Math.min(1, progress + 0.15) * (0.1 + 0.9 * rand(index, 2)),
            ACROSS = (rand(index, 3) * 2 - 1) * area.width * 0.9;
        brush.dot(
            area.x + COS * ALONG - SIN * ACROSS,
            area.y + SIN * ALONG + COS * ACROSS,
            0.5 + Q * 0.8,
            0.07 + 0.08 * rand(index, 4),
            WATER_CONFIG.windupDroplet,
            Math.sin(Q * Math.PI) * 0.85,
        );
    }
}

export const WATER_EFFECT = Object.freeze({ lifeMs: WATER_CONFIG.lifeMs, draw: waterJet, windup: waterWindup });
