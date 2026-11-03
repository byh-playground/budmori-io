// Balance measurement: climbs the real tower with fixed farm armies and an automatic player, and prints how far each
// army gets: node tests/tools/tower-climb.mjs [options]
//   --armies 30x2,100x3,200x4   army size × tier (species 0..8 in turn)   --start 1   first floor
//   --seeds 1,2                 world seeds (card offers, door kinds, summons)  --floors 100   stop after this floor
//   --fight-limit 400           seconds a fight may run before it counts as lost   --jobs 6   pages at once
//   --root <dir>                code to serve (default this checkout; another worktree compares before/after)
//   --out <file>                JSON report (default tests/output/tower-climb/<label>.json)   --label <text>
// The automatic player takes the first fight door (never elite), a seeded-random card or event, and leaves skills to
// cast themselves as they do in play. Logic only: fixed 20 Hz model ticks, nothing rendered.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ARGS = Object.fromEntries(
    process.argv
        .slice(2)
        .join(' ')
        .split(/\s*--/)
        .filter(Boolean)
        .map((pair) => pair.split(/\s+/)),
);
const ROOT = path.resolve(ARGS.root ?? fileURLToPath(new URL('../../', import.meta.url))),
    ARMIES = (ARGS.armies ?? '30x2,100x3,200x4').split(',').map((text) => text.split('x').map(Number)),
    SEEDS = (ARGS.seeds ?? '1').split(',').map(Number),
    START = Number(ARGS.start ?? 1),
    LAST = Number(ARGS.floors ?? 100),
    FIGHT_LIMIT = Number(ARGS['fight-limit'] ?? 400),
    JOBS = Number(ARGS.jobs ?? 6),
    LABEL = ARGS.label ?? 'climb',
    OUT = path.resolve(ARGS.out ?? `tests/output/tower-climb/${LABEL}.json`);
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
    MANIFEST = JSON.parse(
        HTML.match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
    ),
    MODULES = new Map(
        MANIFEST.modules.map((module) => [
            module.url,
            fs.readFileSync(path.join(ROOT, 'vendor/upstream', module.name + '.js')),
        ]),
    ),
    TYPES = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
    };
const SERVER = http.createServer((request, response) => {
    const FILE = path.resolve(ROOT, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(404).end();
        return;
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(fs.readFileSync(FILE));
});
await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
const BROWSER = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function climb({ size, tier, seed }) {
    const PAGE = await BROWSER.newPage({ viewport: { width: 640, height: 480 } });
    PAGE.on('pageerror', (error) => console.error('pageerror', size, tier, seed, String(error)));
    await PAGE.route(/cdn\.jsdelivr\.net\/gh\/byh-playground\/bloom-gamekit@/, (route) => {
        const BODY = MODULES.get(route.request().url());
        return BODY
            ? route.fulfill({
                  body: BODY,
                  contentType: 'text/javascript',
                  headers: { 'access-control-allow-origin': '*' },
              })
            : route.abort();
    });
    await PAGE.goto(`http://127.0.0.1:${SERVER.address().port}/index.html`);
    await PAGE.waitForFunction(() => globalThis.BUDMORI && !document.getElementById('bloom-module-loading'), null, {
        timeout: 180_000,
    });
    await PAGE.locator('#newGame').click();
    await PAGE.waitForFunction(() => BUDMORI.sim.scene === 'farm');
    const RESULT = await PAGE.evaluate(
        async ({ size, tier, seed, start, last, fightLimit }) => {
            const W = BUDMORI.sim,
                { overallXpForLevel: XP_FOR_LEVEL } = await import('/src/model/player-progression.js');
            BUDMORI.runtime.paused = true;
            W.resetUnits();
            W.playerProgression.overallXp = XP_FOR_LEVEL(41);
            W.playerProgression.towerBest = 100;
            W.setWorkBasisPoints(0);
            for (let index = 0; index < size; index++) {
                const UNIT = W.spawn(index % 9, tier, ((index * 7) % 30) - 15, ((index * 13) % 20) - 10);
                UNIT.growthElapsed = UNIT.growthDuration;
                UNIT.dropLanded = true;
            }
            W.rng.state = (seed * 2654435761) >>> 0;
            const TICK = 1 / 20,
                STEP = (seconds, until) => {
                    for (let n = 0; n < seconds / TICK && !until(); n++) {
                        W.step(TICK);
                    }
                    return until();
                },
                ALIVE = () => W.unitCollection.items.filter((u) => !u.isBattleOnlySummon && u.hp > 0).length,
                RANDOM = () => W.random();
            if (!W.startTower(start)) {
                return { size, tier, seed, end: 'not started', reached: start - 1, cards: [], floors: [] };
            }
            const T = () => W.tower;
            // Arrive at the door at once (the march is walking, not balance).
            W.finishMarch();
            const FLOORS = [];
            let end = 'top';
            for (;;) {
                if (
                    !STEP(
                        120,
                        () => W.farmBossEvent.phase === 'fighting' || (T().doors?.length && T().active) || !T().active,
                    )
                ) {
                    end = 'stuck';
                    break;
                }
                if (!T().active) {
                    end = 'left';
                    break;
                }
                if (W.farmBossEvent.phase === 'fighting') {
                    const FROM = W.time,
                        KIND = T().kind;
                    STEP(fightLimit, () => W.farmBossEvent.phase !== 'fighting');
                    const OUTCOME = W.farmBossEvent.phase === 'fighting' ? 'timeout' : W.farmBossEvent.outcome,
                        BOSS =
                            W.bosses.reduce((sum, boss) => sum + Math.max(0, boss.hp), 0) /
                            Math.max(
                                1,
                                W.bosses.reduce((sum, boss) => sum + boss.maxHp, 0),
                            );
                    FLOORS.push({
                        floor: T().floor,
                        kind: KIND,
                        outcome: OUTCOME,
                        seconds: +(W.time - FROM).toFixed(1),
                        alive: ALIVE(),
                        bossHpLeft: +BOSS.toFixed(2),
                        bossMaxHp: Math.round(W.bosses[0]?.maxHp ?? 0),
                    });
                    if (OUTCOME !== 'victory') {
                        end = OUTCOME;
                        break;
                    }
                    if (T().floor >= last) {
                        break;
                    }
                    continue;
                }
                // Doors are up: wait out the boss's card pick, then choose.
                STEP(10, () => W.time >= (T().bossCardDraw?.until || 0));
                if (T().floor >= last) {
                    break;
                }
                const DOORS = T().doors,
                    FIGHT = DOORS.findIndex((door) => door.type === 'fight' && door.kind !== 'elite'),
                    PICK = FIGHT >= 0 ? FIGHT : Math.floor(RANDOM() * DOORS.length);
                if (!W.chooseDoor(PICK)) {
                    end = 'door refused';
                    break;
                }
            }
            return {
                size,
                tier,
                seed,
                end,
                reached: FLOORS.filter((row) => row.outcome === 'victory').at(-1)?.floor ?? start - 1,
                cards: T().cards.map((card) => card.id + (card.level ? ':' + card.level : '')),
                floors: FLOORS,
            };
        },
        { size, tier, seed, start: START, last: LAST, fightLimit: FIGHT_LIMIT },
    );
    await PAGE.close();
    return RESULT;
}

const CASES = SEEDS.flatMap((seed) => ARMIES.map(([size, tier]) => ({ size, tier, seed })));
const RESULTS = [];
let next = 0;
await Promise.all(
    Array.from({ length: Math.min(JOBS, CASES.length) }, async () => {
        while (next < CASES.length) {
            const CASE = CASES[next++],
                RESULT = await climb(CASE),
                LAST_FIGHT = RESULT.floors.at(-1);
            RESULTS.push(RESULT);
            console.log(
                `${LABEL} ${RESULT.size}x T${RESULT.tier} seed ${RESULT.seed}: reached ${RESULT.reached} (${RESULT.end}` +
                    (LAST_FIGHT && LAST_FIGHT.outcome !== 'victory' ? `, boss ${LAST_FIGHT.bossHpLeft} left` : '') +
                    `), fights ${RESULT.floors.length}, mean ${(
                        RESULT.floors.reduce((sum, row) => sum + row.seconds, 0) / Math.max(1, RESULT.floors.length)
                    ).toFixed(1)}s`,
            );
        }
    }),
);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(RESULTS, null, 1));
console.log('report', OUT);
await BROWSER.close();
SERVER.close();
