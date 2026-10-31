// Captures reproducible frames of a scene from the real game: node tests/tools/capture-scene.mjs [options]
//   --lab '<json>'    a lab scene (see src/debug/scene-lab.js) | --help <id>   a help or species preview scene
//   --at 1000,2500    scene times (ms of scene clock) to shoot; default one shot at the end
//   --when <step>     instead of --at: shoot whenever the scene's step equals this (e.g. flight); --count N shots, --gap ms apart, --delay ms after the match
//   --clip x,y,w,h    crop the shot to this rectangle (viewport pixels); --scale 3 renders at 3x pixel density
//   --size 1100x850   viewport             --out <dir>   output dir (default tests/output/scenes)
//   --name <text>     file prefix          --eval '<js>' run in the page at every shot and print its result
//   --hold            freeze the sim right after the shot time and shoot the frozen frame (default: shoot live)
// Each shot prints {scene, timeMs, tick, step, commit}, so the same frame can be asked for again.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ARGS = (() => {
    const OUT = { flags: new Set() };
    const LIST = process.argv.slice(2);
    for (let index = 0; index < LIST.length; index++) {
        const KEY = LIST[index].replace(/^--/, '');
        if (KEY === 'hold') {
            OUT.flags.add(KEY);
        } else {
            OUT[KEY] = LIST[++index];
        }
    }
    return OUT;
})();
if (!ARGS.lab && !ARGS.help) {
    throw new Error('capture-scene: pass --lab <json> or --help <scene id>');
}
const [WIDTH, HEIGHT] = (ARGS.size ?? '1100x850').split('x').map(Number);
const OUTPUT = path.resolve(ROOT, ARGS.out ?? 'tests/output/scenes');
const NAME = ARGS.name ?? (ARGS.help ? ARGS.help : 'lab');
const WHEN = ARGS.when ?? null,
    COUNT = Number(ARGS.count ?? 1),
    GAP = Number(ARGS.gap ?? 400),
    DELAY = Number(ARGS.delay ?? 0);
const TIMES = (ARGS.at ?? '').split(',').filter(Boolean).map(Number);
const TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
};
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MANIFEST = JSON.parse(
    HTML.match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
);
const MODULES = new Map(
    MANIFEST.modules.map((item) => [item.url, fs.readFileSync(path.join(ROOT, 'vendor/upstream', item.name + '.js'))]),
);
const COMMIT = (() => {
    try {
        return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim();
    } catch {
        return 'unknown';
    }
})();
const SERVER = http.createServer((request, response) => {
    const FILE = path.resolve(ROOT, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(request.url.includes('favicon.ico') ? 204 : 404).end();
        return;
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(fs.readFileSync(FILE));
});
await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
fs.mkdirSync(OUTPUT, { recursive: true });
const ERRORS = [];
let browser;
try {
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        ...(process.env.BUDMORI_HARDWARE_RENDERING === '1'
            ? { ignoreDefaultArgs: ['--enable-unsafe-swiftshader'] }
            : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }),
    });
    const PAGE = await browser.newPage({
        viewport: { width: WIDTH, height: HEIGHT },
        deviceScaleFactor: Number(ARGS.scale ?? 1),
    });
    PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
    PAGE.on('console', (message) => {
        if (message.type() === 'error') {
            ERRORS.push(message.text());
        }
    });
    await PAGE.route(/cdn\.jsdelivr\.net\/gh\/byh-playground\/bloom-gamekit@/, (route) => {
        const BYTES = MODULES.get(route.request().url());
        return BYTES
            ? route.fulfill({
                  body: BYTES,
                  contentType: 'text/javascript',
                  headers: { 'access-control-allow-origin': '*' },
              })
            : route.abort();
    });
    const QUERY = ARGS.lab ? `lab=${encodeURIComponent(ARGS.lab)}` : `help=${encodeURIComponent(ARGS.help)}`;
    await PAGE.goto(`http://127.0.0.1:${SERVER.address().port}/index.html?${QUERY}`);
    await PAGE.waitForFunction(() => globalThis.__budmoriHelp, null, { timeout: 30000 }).catch((error) => {
        console.error(ERRORS.join('\n') || 'no page errors');
        throw error;
    });
    const SHOTS = WHEN ? Array.from({ length: COUNT }, () => 'when') : TIMES.length ? TIMES : [null];
    let lastMs = 0;
    for (const AT of SHOTS) {
        if (AT === 'when') {
            await PAGE.waitForFunction(
                ([step, from]) => {
                    const SNAP = globalThis.__budmoriHelp.snapshot();
                    return SNAP.step === step && SNAP.timeMs >= from;
                },
                [WHEN, lastMs + GAP],
                { timeout: 120000, polling: 8 },
            );
            if (DELAY > 0) {
                const MATCHED = await PAGE.evaluate(() => globalThis.__budmoriHelp.snapshot().timeMs);
                await PAGE.waitForFunction((ms) => globalThis.__budmoriHelp.snapshot().timeMs >= ms, MATCHED + DELAY, {
                    timeout: 120000,
                    polling: 8,
                });
            }
        } else if (AT !== null) {
            await PAGE.waitForFunction((ms) => globalThis.__budmoriHelp.snapshot().timeMs >= ms, AT, {
                timeout: 120000,
                polling: 16,
            });
        } else {
            await PAGE.waitForFunction(
                () => BUDMORI.runtime.paused === true || globalThis.__budmoriHelp.snapshot().timeMs > 0,
                null,
                {
                    timeout: 120000,
                },
            );
        }
        if (ARGS.flags.has('hold')) {
            await PAGE.evaluate(() => {
                BUDMORI.runtime.paused = true;
            });
            await PAGE.waitForTimeout(150);
        }
        const SNAP = await PAGE.evaluate(() => globalThis.__budmoriHelp.snapshot());
        lastMs = SNAP.timeMs;
        const EVAL = ARGS.eval ? await PAGE.evaluate(ARGS.eval) : undefined;
        const FILE = path.join(OUTPUT, `${NAME}-${String(Math.round(SNAP.timeMs)).padStart(6, '0')}ms.png`);
        const [CX, CY, CW, CH] = (ARGS.clip ?? '').split(',').map(Number);
        await PAGE.screenshot({
            path: FILE,
            ...(ARGS.clip ? { clip: { x: CX, y: CY, width: CW, height: CH } } : {}),
        });
        console.log(
            JSON.stringify({
                file: path.relative(ROOT, FILE),
                scene: QUERY,
                timeMs: Math.round(SNAP.timeMs),
                tick: SNAP.tick,
                step: SNAP.step,
                commit: COMMIT,
                ...(EVAL === undefined ? {} : { eval: EVAL }),
            }),
        );
        if (ARGS.flags.has('hold')) {
            await PAGE.evaluate(() => {
                BUDMORI.runtime.paused = false;
            });
        }
    }
    if (ERRORS.length) {
        console.error('page errors:\n' + ERRORS.join('\n'));
        process.exitCode = 1;
    }
} finally {
    await browser?.close();
    SERVER.close();
}
