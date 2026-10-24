import { createHash } from 'node:crypto';
import { sourceGraph } from './source-graph.mjs';

const HASH = (bytes) => createHash('sha256').update(bytes).digest('hex');
const SOURCE_GRAPH = sourceGraph(),
    FILES = SOURCE_GRAPH.files,
    EXPECTED = FILES.find((file) => file.file === 'index.html').sha256;
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
                    sourceGraphSha256: SOURCE_GRAPH.sha256,
                    sdk: SOURCE_GRAPH.sdk,
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
    throw new Error(
        'Pages did not serve the complete tested source graph within the deployment observation window: ' + observed,
    );
}
