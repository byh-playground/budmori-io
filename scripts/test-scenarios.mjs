import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SUITES = {
    core: ['core'],
    cadence: ['cadence'],
    mergePolicy: ['mergePolicy'],
    upgrades: ['upgrades'],
    grain: ['grain'],
    integration: ['representativeAbilities', 'bossRewards'],
    reset: ['reset'],
    formation: ['formation'],
    save: ['save'],
    migration: ['migration'],
    event: ['event'],
    bossRewards: ['bossRewards'],
    victory: ['victory'],
};
const SUITE = process.argv[2] ?? 'core';
const SCENARIOS = SUITES[SUITE];
if (!SCENARIOS) {
    throw new Error('Unknown scenario suite: ' + SUITE);
}
const BUDGET_MS = 180000,
    CLEANUP_RESERVE_MS = 5000,
    STARTED = performance.now();
let active = null;
function stopChild(child) {
    if (!child?.pid || child.exitCode !== null || child.signalCode !== null) {
        return;
    }
    if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
            windowsHide: true,
            stdio: 'ignore',
            timeout: CLEANUP_RESERVE_MS,
        });
    } else {
        try {
            process.kill(-child.pid, 'SIGKILL');
        } catch {
            child.kill('SIGKILL');
        }
    }
}
for (const SIGNAL of ['SIGINT', 'SIGTERM']) {
    process.once(SIGNAL, () => {
        stopChild(active);
        process.exit(130);
    });
}
async function run(file) {
    const REMAINING = BUDGET_MS - CLEANUP_RESERVE_MS - (performance.now() - STARTED);
    if (REMAINING <= 0) {
        throw new Error('Scenario verification exceeded 180 seconds; unfinished coverage is NOT PASS');
    }
    console.log('Scenario:', file);
    await new Promise((resolve, reject) => {
        const CHILD = (active = spawn(process.execPath, ['tests/farm.e2e.mjs', file], {
            cwd: ROOT,
            stdio: 'inherit',
            windowsHide: true,
            detached: process.platform !== 'win32',
        }));
        let timedOut = false;
        const TIMER = setTimeout(() => {
            timedOut = true;
            stopChild(CHILD);
        }, REMAINING);
        CHILD.once('error', (error) => {
            clearTimeout(TIMER);
            active = null;
            reject(error);
        });
        CHILD.once('exit', (code) => {
            clearTimeout(TIMER);
            active = null;
            if (timedOut) {
                reject(new Error('Scenario verification exceeded 180 seconds: ' + file));
            } else if (code !== 0) {
                reject(new Error('Scenario failed: ' + file + ' (exit ' + code + ')'));
            } else {
                resolve();
            }
        });
    });
}
try {
    for (const FILE of SCENARIOS) {
        await run(FILE);
    }
    console.log(
        JSON.stringify({
            status: 'PASS',
            suite: SUITE,
            elapsedMs: Math.round(performance.now() - STARTED),
            budgetMs: BUDGET_MS,
            scenarios: SCENARIOS,
        }),
    );
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
