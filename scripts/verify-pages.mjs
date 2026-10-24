import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const HASH = (bytes) => createHash('sha256').update(bytes).digest('hex');
const CANONICAL_TEXT = (bytes) => Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
const HTML = CANONICAL_TEXT(await readFile(new URL('../index.html', import.meta.url))),
    EXPECTED = HASH(HTML);
const MANIFEST = JSON.parse(
    HTML.toString('utf8').match(
        /<script id="bloom-runtime-manifest" type="application\/json">([\s\S]*?)<\/script>/,
    )?.[1] || 'null',
);
const STYLE_FILES = await Promise.all(
    [...HTML.toString('utf8').matchAll(/<link\s+rel="stylesheet"\s+href="\.\/([^"]+)"/g)].map(async (match) => {
        const BYTES = CANONICAL_TEXT(await readFile(new URL('../' + match[1], import.meta.url)));
        return { file: match[1], bytes: BYTES.length, sha256: HASH(BYTES) };
    }),
);
const FILES = await Promise.all(
    [
        ...STYLE_FILES,
        { file: 'index.html', sha256: EXPECTED, bytes: HTML.length },
        ...[MANIFEST?.game, MANIFEST?.bootstrap, MANIFEST?.scope, ...(MANIFEST?.vectorAssets || [])].filter(Boolean),
    ].map(async (spec) => {
        if (spec.sha256 && spec.bytes) {
            return spec;
        }
        const BYTES = CANONICAL_TEXT(await readFile(new URL('../' + spec.file, import.meta.url)));
        return { ...spec, bytes: BYTES.length, sha256: HASH(BYTES) };
    }),
);
const URL_LOCAL = 'https://byh-playground.github.io/budmori-io/';
const DEADLINE = Date.now() + 8 * 60 * 1000;
let observed = 'not fetched';
let verified = false;
while (Date.now() < DEADLINE) {
    try {
        const RESULTS = await Promise.all(
            FILES.map(async (spec) => {
                const TARGET = spec.file === 'index.html' ? URL_LOCAL : new URL(spec.file, URL_LOCAL).href;
                const RESPONSE = await fetch(
                    TARGET +
                        '?build=' +
                        encodeURIComponent(process.env.GITHUB_SHA || EXPECTED) +
                        '&check=' +
                        Date.now(),
                    {
                        cache: 'no-store',
                        signal: AbortSignal.timeout(15000),
                    },
                );
                if (!RESPONSE.ok) {
                    throw new Error(spec.file + ' HTTP ' + RESPONSE.status);
                }
                const BYTES = Buffer.from(await RESPONSE.arrayBuffer()),
                    ACTUAL = HASH(BYTES);
                return {
                    file: spec.file,
                    bytes: BYTES.length,
                    sha256: ACTUAL,
                    match: ACTUAL === spec.sha256 && BYTES.length === spec.bytes,
                };
            }),
        );
        observed =
            RESULTS.filter((r) => !r.match)
                .map((r) => r.file + ':' + r.sha256)
                .join(',') || 'matched';
        if (RESULTS.every((r) => r.match)) {
            console.log(
                JSON.stringify({
                    status: 'PASS',
                    url: URL_LOCAL,
                    commit: process.env.GITHUB_SHA,
                    sha256: EXPECTED,
                    files: RESULTS,
                }),
            );
            verified = true;
            break;
        }
    } catch (error) {
        observed = error.message;
    }
    console.log('Waiting for Pages bytes:', observed, 'expected:', EXPECTED);
    await new Promise((r) => setTimeout(r, 10000));
}
if (!verified) {
    throw new Error('Pages did not serve the tested index.html within the deployment observation window: ' + observed);
}
