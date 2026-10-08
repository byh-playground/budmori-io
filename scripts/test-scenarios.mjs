import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const suites = {
  all: ['scripts/verify-gamekit-source.cjs', 'tests/browser.e2e.mjs', 'tests/save-version-browser.mjs', 'tests/multiplayer-browser.e2e.mjs'],
  core: ['scripts/verify-gamekit-source.cjs', 'tests/browser.e2e.mjs'],
  network: ['scripts/verify-gamekit-source.cjs', 'tests/multiplayer-browser.e2e.mjs'],
  save: ['scripts/verify-gamekit-source.cjs', 'tests/save-version-browser.mjs'],
};
const suite = process.argv[2] ?? 'all';
const scenarios = suites[suite];
if (!scenarios) throw new Error('Unknown scenario suite: ' + suite);
const budgetMs = 180000, cleanupReserveMs = 5000, started = performance.now();
let active = null;
function stopChild(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: cleanupReserveMs });
  else { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { stopChild(active); process.exit(130); });
async function run(file) {
  const remaining = budgetMs - cleanupReserveMs - (performance.now() - started);
  if (remaining <= 0) throw new Error('Scenario verification exceeded 180 seconds; unfinished coverage is NOT PASS');
  console.log('Scenario:', file);
  await new Promise((resolve, reject) => {
    const child = active = spawn(process.execPath, [file], { cwd: root, stdio: 'inherit', windowsHide: true, detached: process.platform !== 'win32' });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; stopChild(child); }, remaining);
    child.once('error', error => { clearTimeout(timer); active = null; reject(error); });
    child.once('exit', code => {
      clearTimeout(timer); active = null;
      if (timedOut) reject(new Error('Scenario verification exceeded 180 seconds: ' + file));
      else if (code !== 0) reject(new Error('Scenario failed: ' + file + ' (exit ' + code + ')'));
      else resolve();
    });
  });
}
try {
  for (const file of scenarios) await run(file);
  console.log(JSON.stringify({ status: 'PASS', suite, elapsedMs: Math.round(performance.now() - started), budgetMs, scenarios }));
} catch (error) {
  console.error(error.message); process.exitCode = 1;
}
