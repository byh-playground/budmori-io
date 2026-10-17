'use strict';

// Import official Git data responses when git fetch is unavailable. No response
// is trusted until its reconstructed Git object ID equals the immutable pin.
const FS = require('node:fs'),
    PATH = require('node:path'),
    ASSERT = require('node:assert/strict'),
    CRYPTO = require('node:crypto');
const FILE = process.argv[2];
ASSERT(FILE, 'Pass JSON with dist, source, tree and manifest official API responses');
const DATA = JSON.parse(FS.readFileSync(FILE)),
    DIR = PATH.dirname(FILE);
const OID = (type, b) =>
    CRYPTO.createHash('sha1')
        .update(Buffer.concat([Buffer.from(`${type} ${b.length}\0`), b]))
        .digest('hex');
function commit(c) {
    const V = c.verification;
    const CANDIDATES = [];
    if (V?.payload && V.signature) {
        const AT = V.payload.indexOf('\n\n'),
            SIG = 'gpgsig ' + V.signature.trimEnd().replace(/\n/g, '\n ');
        for (const ENDING of ['', '\n', '\n ']) {
            CANDIDATES.push(V.payload.slice(0, AT) + '\n' + SIG + ENDING + V.payload.slice(AT));
        }
    } else {
        const IDENTITY = (p) => `${p.name} <${p.email}> ${Date.parse(p.date) / 1000}`;
        for (const TZ of ['+0000', '+0900']) {
            for (const ENDING of ['\n', '']) {
                CANDIDATES.push(
                    `tree ${c.tree.sha}\n${c.parents.map((p) => 'parent ' + p.sha + '\n').join('')}author ${IDENTITY(c.author)} ${TZ}\ncommitter ${IDENTITY(c.committer)} ${TZ}\n\n${c.message}${ENDING}`,
                );
            }
        }
    }
    const BYTES = CANDIDATES.map((x) => Buffer.from(x)).find((b) => OID('commit', b) === c.sha);
    ASSERT(BYTES, 'Cannot reconstruct exact Git commit ' + c.sha);
    return BYTES;
}
ASSERT.equal(DATA.tree.truncated, false);
const TREE = Buffer.concat(
    DATA.tree.tree.map((e) => {
        ASSERT.equal(e.type, 'blob');
        ASSERT.equal(e.mode, '100644');
        ASSERT(!/[\0/]/.test(e.path));
        return Buffer.concat([Buffer.from(e.mode + ' ' + e.path + '\0'), Buffer.from(e.sha, 'hex')]);
    }),
);
ASSERT.equal(OID('tree', TREE), DATA.tree.sha);
ASSERT.equal(DATA.dist.tree.sha, DATA.tree.sha);
const DIST_BYTES = commit(DATA.dist),
    SOURCE_BYTES = commit(DATA.source);
FS.writeFileSync(PATH.join(DIR, 'dist-commit.raw'), DIST_BYTES);
FS.writeFileSync(PATH.join(DIR, 'source-commit.raw'), SOURCE_BYTES);
FS.writeFileSync(PATH.join(DIR, 'dist-tree.base64'), TREE.toString('base64') + '\n');
FS.writeFileSync(PATH.join(DIR, 'manifest.json'), DATA.manifest);
console.log('Reconstructed exact pinned Git source, distribution, tree objects');
