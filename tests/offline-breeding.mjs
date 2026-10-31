// Offline settlement shares scarce food and room by the slider's breeding share, never by species id.
// Runs the real applyOffline against a minimal world double, without a browser: node tests/offline-breeding.mjs
import assert from 'node:assert/strict';
import { applyOffline } from '../src/save/farm-offline.js';

const SPECIES_COUNT = 9;
const CONFIG = {
    unit: { speciesCount: SPECIES_COUNT },
    farm: {
        offline: { capSeconds: 1e9, minSeconds: 0, efficiency: 1 },
        breeding: { cooldownSeconds: 10, growthSeconds: 10 },
    },
};

// `breeders` adults per species rest and breed; one worker makes `foodPerSecond` food.
function world({ breeders, capacity, foodPerSecond }) {
    const UNITS = [];
    let serial = 0;
    const add = (species, mature) => {
        const UNIT = { id: ++serial, species, mature, hp: 1, growthDuration: 1, growthElapsed: mature ? 1 : 0 };
        UNITS.push(UNIT);
        return UNIT;
    };
    const WORKER = add(0, true);
    breeders.forEach((count, species) => {
        for (let index = 0; index < count; index++) {
            add(species, true);
        }
    });
    const BORN = new Array(SPECIES_COUNT).fill(0);
    let seed = 1;
    return {
        BORN,
        scene: 'farm',
        farmBossEvent: { phase: 'idle' },
        capacity,
        birthReservations: 0,
        get ownedPopulation() {
            return UNITS.length;
        },
        _workerIds: new Set([WORKER.id]),
        _workerRates: new Map([[WORKER.id, foodPerSecond]]),
        metrics: { births: 0 },
        roster: { residents: () => UNITS },
        refreshWorkers() {},
        markProgressChanged() {},
        random: () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646,
        spawn(species) {
            if (UNITS.length >= capacity) {
                return null;
            }
            BORN[species]++;
            return add(species, false);
        },
    };
}

// The slider gives species 0 a fifth and species 8 four fifths of the breeders; food covers one and a half rounds.
const SCARCE = world({ breeders: [8, 0, 0, 0, 0, 0, 0, 0, 32], capacity: 1e6, foodPerSecond: 0.3 });
applyOffline(SCARCE, CONFIG, 200);
const [LOW, HIGH] = [SCARCE.BORN[0], SCARCE.BORN[8]];
assert.ok(LOW + HIGH > 0, 'scarce food still breeds');
assert.ok(Math.abs(HIGH / (LOW + HIGH) - 0.8) <= 0.05, `births follow the 20:80 share, got ${LOW}:${HIGH}`);

// Room for only a few children: the last free places are still shared by the share, not taken by species 0.
const CROWDED = world({ breeders: [8, 0, 0, 0, 0, 0, 0, 0, 32], capacity: 51, foodPerSecond: 100 });
applyOffline(CROWDED, CONFIG, 200);
assert.deepEqual([CROWDED.BORN[0], CROWDED.BORN[8]], [2, 8], 'ten free places split 2:8');

// Plenty of food and room: every pair breeds every round, as before.
const PLENTY = world({ breeders: [8, 0, 0, 0, 0, 0, 0, 0, 32], capacity: 1e6, foodPerSecond: 100 });
applyOffline(PLENTY, CONFIG, 200);
assert.deepEqual([PLENTY.BORN[0], PLENTY.BORN[8]], [40, 160], 'every pair breeds each of the 10 rounds');

console.log(`PASS offline breeding: scarce food ${LOW}:${HIGH}, crowded 2:8, plenty 40:160`);
