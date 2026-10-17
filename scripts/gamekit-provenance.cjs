'use strict';

// Offline verification proves the checked-in cache belongs to the pinned Git
// objects and checks the immutable ESM references. It does not contact GitHub
// or independently attest the source build. Refresh fetches immutable commits.
const FS = require('node:fs'),
    PATH = require('node:path'),
    CRYPTO = require('node:crypto'),
    ASSERT = require('node:assert/strict'),
    CP = require('node:child_process'),
    OS = require('node:os');
const ROOT = PATH.resolve(__dirname, '..');
const MODULES = Object.freeze({
    'presentation-events': 'BloomGamekitPresentationEvents',
    camera: 'BloomGamekitCamera',
    deterministic: 'BloomGamekitDeterministic',
    simloop: 'BloomGamekitSimloop',
    interpolation: 'BloomGamekitInterpolation',
    hud: 'BloomGamekitHud',
    rendering: 'BloomGamekitRendering',
    'vector-assets': 'BloomGamekitVectorAssets',
    'vector-assets-loader': 'BloomGamekitVectorAssetLoader',
    input: 'BloomGamekitInput',
    'debug-tools': 'BloomGamekitDebugTools',
    'object-pool': 'BloomGamekitObjectPool',
});
const DIST_MODULES = Object.freeze([
    'interpolation',
    'rendering',
    'vector-assets',
    'vector-assets-loader',
    'input',
    'deterministic',
    'simloop',
    'transport',
    'replay',
    'rollback',
    'camera',
    'presentation-events',
    'hud',
    'debug-tools',
    'audio',
    'navigation',
    'scenario',
    'object-pool',
]);
const DIST_ASSETS = Object.freeze([
    Object.freeze({
        file: 'assets/fonts/noto-sans-kr-700-v1.json',
        version: 'noto-sans-kr-700-v1',
    }),
]);
const SOURCE_FILES = Object.freeze([
    'modules/vector-assets/compiler.js',
    'modules/vector-assets/compiler-core.js',
    'modules/vector-assets/quality-presets.js',
    'modules/vector-assets/schema.js',
]);
const SHA = (bytes, algorithm = 'sha256') => CRYPTO.createHash(algorithm).update(bytes).digest('hex');
const OBJECT_ID = (type, bytes) => SHA(Buffer.concat([Buffer.from(`${type} ${bytes.length}\0`), bytes]), 'sha1');
function exactKeys(value, keys) {
    return (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).length === keys.length &&
        keys.every((key) => Object.hasOwn(value, key))
    );
}
function inline(name, bytes) {
    const ESBUILD = require('esbuild');
    ASSERT.equal(ESBUILD.version, '0.28.2', 'Pinned transform version');
    return Buffer.from(
        ESBUILD.buildSync({
            stdin: {
                contents: bytes.toString('utf8'),
                sourcefile: `budmori-gamekit-migration/vendor/upstream/${name}.js`,
                loader: 'js',
            },
            bundle: true,
            write: false,
            format: 'iife',
            globalName: MODULES[name],
            platform: 'browser',
            target: 'es2022',
            charset: 'utf8',
            legalComments: 'inline',
            minify: false,
            sourcemap: false,
        }).outputFiles[0].contents,
    );
}
function treeEntries(bytes) {
    const RESULT = new Map();
    let offset = 0;
    while (offset < bytes.length) {
        const SPACE = bytes.indexOf(32, offset),
            NUL = bytes.indexOf(0, SPACE);
        ASSERT(SPACE > offset && NUL > SPACE && NUL + 21 <= bytes.length, 'Malformed Git tree');
        const MODE = bytes.subarray(offset, SPACE).toString(),
            NAME = bytes.subarray(SPACE + 1, NUL).toString();
        ASSERT(!RESULT.has(NAME), 'Duplicate Git tree entry');
        RESULT.set(NAME, {
            mode: MODE,
            oid: bytes.subarray(NUL + 1, NUL + 21).toString('hex'),
        });
        offset = NUL + 21;
    }
    return RESULT;
}
function verify(root = ROOT) {
    const LOCK = JSON.parse(FS.readFileSync(PATH.join(root, 'gamekit-lock.json'))),
        DIR = PATH.join(root, 'vendor/upstream'),
        SOURCE_DIR = PATH.join(root, 'vendor/upstream-source'),
        READ = (n) => FS.readFileSync(PATH.join(DIR, ...n.split('/'))),
        READ_SOURCE = (n) => FS.readFileSync(PATH.join(SOURCE_DIR, ...n.split('/')));
    ASSERT.equal(LOCK.schemaVersion, 3, 'external ESM reference lock schema');
    ASSERT.equal(LOCK.repository, 'byh-playground/bloom-gamekit');
    for (const KEY of ['sourceCommit', 'distCommit']) {
        ASSERT.match(LOCK[KEY], /^[a-f0-9]{40}$/);
    }
    ASSERT.equal(LOCK.esbuild, '0.28.2');
    ASSERT.equal(LOCK.modules.length, Object.keys(MODULES).length);
    ASSERT.equal(new Set(LOCK.modules.map((m) => m.name)).size, LOCK.modules.length);
    ASSERT.deepEqual(
        LOCK.assets?.map(({ file, version, bytes, sha256 }) => ({
            file,
            version,
            bytes,
            sha256,
        })),
        LOCK.assets,
        'Pinned font asset metadata is required',
    );
    ASSERT.equal(LOCK.assets.length, DIST_ASSETS.length);
    const COMMIT = READ('dist-commit.raw'),
        SOURCE = READ('source-commit.raw'),
        TREE_TEXT = READ('dist-tree.base64').toString('ascii').replace(/\r\n/g, '\n'),
        TREE = Buffer.from(TREE_TEXT.trim(), 'base64');
    ASSERT.equal(TREE.toString('base64') + '\n', TREE_TEXT, 'Canonical base64 Git tree cache');
    ASSERT.equal(OBJECT_ID('commit', COMMIT), LOCK.distCommit, 'Distribution commit object');
    ASSERT.equal(OBJECT_ID('commit', SOURCE), LOCK.sourceCommit, 'Source commit object');
    const MESSAGE = COMMIT.toString('utf8');
    ASSERT.equal(MESSAGE.match(/^tree ([a-f0-9]{40})$/m)?.[1], OBJECT_ID('tree', TREE), 'Distribution tree');
    const SOURCE_TREE_TEXT = READ_SOURCE('source-tree.base64').toString('ascii').replace(/\r\n/g, '\n'),
        SOURCE_TREE = Buffer.from(SOURCE_TREE_TEXT.trim(), 'base64');
    ASSERT.equal(SOURCE_TREE.toString('base64') + '\n', SOURCE_TREE_TEXT, 'Canonical source Git tree cache');
    ASSERT.equal(
        SOURCE.toString('utf8').match(/^tree ([a-f0-9]{40})$/m)?.[1],
        OBJECT_ID('tree', SOURCE_TREE),
        'Source tree',
    );
    const SOURCE_MODULES_TREE = Buffer.from(READ_SOURCE('modules-tree.base64').toString('ascii').trim(), 'base64'),
        SOURCE_VECTOR_TREE = Buffer.from(READ_SOURCE('vector-assets-tree.base64').toString('ascii').trim(), 'base64');
    const SOURCE_ENTRIES = treeEntries(SOURCE_TREE),
        SOURCE_MODULE_ENTRIES = treeEntries(SOURCE_MODULES_TREE),
        SOURCE_VECTOR_ENTRIES = treeEntries(SOURCE_VECTOR_TREE);
    ASSERT.equal(SOURCE_ENTRIES.get('modules')?.mode, '40000', 'source modules tree');
    ASSERT.equal(
        SOURCE_ENTRIES.get('modules')?.oid,
        OBJECT_ID('tree', SOURCE_MODULES_TREE),
        'source modules tree object',
    );
    ASSERT.equal(SOURCE_MODULE_ENTRIES.get('vector-assets')?.mode, '40000', 'source vector-assets tree');
    ASSERT.equal(
        SOURCE_MODULE_ENTRIES.get('vector-assets')?.oid,
        OBJECT_ID('tree', SOURCE_VECTOR_TREE),
        'source vector-assets tree object',
    );
    for (const FILE of SOURCE_FILES) {
        const BASENAME = FILE.split('/').at(-1),
            ENTRY = SOURCE_VECTOR_ENTRIES.get(BASENAME),
            BYTES = READ_SOURCE(FILE);
        ASSERT.equal(ENTRY?.mode, '100644', FILE + ' must be regular file');
        ASSERT.equal(OBJECT_ID('blob', BYTES), ENTRY.oid, FILE + ' pinned source Git blob');
    }
    ASSERT.equal(
        MESSAGE.match(/^Source-Commit: ([a-f0-9]{40})$/m)?.[1],
        LOCK.sourceCommit,
        'Distribution source trailer',
    );
    ASSERT.equal(
        MESSAGE.match(/^Manifest-SHA256: ([a-f0-9]{64})$/m)?.[1],
        LOCK.manifestSHA256,
        'Distribution manifest trailer',
    );
    const ENTRIES = treeEntries(TREE),
        MANIFEST_BYTES = READ('manifest.json');
    const CHECK_BLOB = (name, bytes) => {
        ASSERT.equal(ENTRIES.get(name)?.mode, '100644', name + ' must be regular file');
        ASSERT.equal(OBJECT_ID('blob', bytes), ENTRIES.get(name)?.oid, name + ' pinned Git blob');
    };
    CHECK_BLOB('manifest.json', MANIFEST_BYTES);
    ASSERT.equal(SHA(MANIFEST_BYTES), LOCK.manifestSHA256, 'Manifest SHA-256');
    const MANIFEST = JSON.parse(MANIFEST_BYTES);
    ASSERT.deepEqual(Object.keys(MANIFEST), ['schemaVersion', 'modules', 'assets']);
    ASSERT.equal(MANIFEST.schemaVersion, 2);
    ASSERT.equal(MANIFEST.modules.length, DIST_MODULES.length);
    ASSERT.deepEqual(
        MANIFEST.modules.map((m) => m.file),
        DIST_MODULES.map((n) => n + '.js'),
    );
    for (const ENTRY of MANIFEST.modules) {
        ASSERT(exactKeys(ENTRY, ['file', 'sha256']), 'Bundle manifest schema');
        const BYTES = READ(ENTRY.file);
        CHECK_BLOB(ENTRY.file, BYTES);
        ASSERT.equal(SHA(BYTES), ENTRY.sha256, ENTRY.file + ' manifest bytes');
        ASSERT(
            MESSAGE.split('\n').includes(`Bundle-SHA256: ${ENTRY.file} ${ENTRY.sha256}`),
            ENTRY.file + ' commit trailer',
        );
    }
    ASSERT.equal(new Set(MANIFEST.modules.map((m) => m.file)).size, MANIFEST.modules.length);
    ASSERT.equal(MANIFEST.assets.length, DIST_ASSETS.length);
    ASSERT.deepEqual(
        MANIFEST.assets.map(({ file, version }) => ({
            file,
            version,
        })),
        DIST_ASSETS,
    );
    const ASSETS_TREE = Buffer.from(READ('assets-tree.base64').toString('ascii').trim(), 'base64'),
        FONTS_TREE = Buffer.from(READ('assets-fonts-tree.base64').toString('ascii').trim(), 'base64');
    ASSERT.equal(ENTRIES.get('assets')?.mode, '40000', 'assets subtree');
    ASSERT.equal(ENTRIES.get('assets')?.oid, OBJECT_ID('tree', ASSETS_TREE), 'assets subtree object');
    const ASSET_ENTRIES = treeEntries(ASSETS_TREE);
    ASSERT.equal(ASSET_ENTRIES.get('fonts')?.mode, '40000', 'font directory');
    ASSERT.equal(ASSET_ENTRIES.get('fonts')?.oid, OBJECT_ID('tree', FONTS_TREE), 'font subtree object');
    const FONT_ENTRIES = treeEntries(FONTS_TREE);
    for (const [INDEX, ENTRY] of MANIFEST.assets.entries()) {
        ASSERT(exactKeys(ENTRY, ['file', 'version', 'bytes', 'sha256']), 'Font asset manifest schema');
        ASSERT.equal(ENTRY.file, DIST_ASSETS[INDEX].file);
        ASSERT.equal(ENTRY.version, DIST_ASSETS[INDEX].version);
        ASSERT(Number.isSafeInteger(ENTRY.bytes) && ENTRY.bytes > 0);
        ASSERT.match(ENTRY.sha256, /^[a-f0-9]{64}$/);
        const FILE = ENTRY.file.split('/').at(-1),
            BYTES = READ(ENTRY.file),
            BLOB = FONT_ENTRIES.get(FILE);
        ASSERT.equal(BLOB?.mode, '100644', ENTRY.file + ' must be a regular file');
        ASSERT.equal(OBJECT_ID('blob', BYTES), BLOB.oid, ENTRY.file + ' pinned Git blob');
        ASSERT.equal(BYTES.length, ENTRY.bytes, ENTRY.file + ' manifest byte count');
        ASSERT.equal(SHA(BYTES), ENTRY.sha256, ENTRY.file + ' manifest bytes');
        ASSERT(
            MESSAGE.split('\n').includes(`Asset-SHA256: ${ENTRY.file} ${ENTRY.sha256}`),
            ENTRY.file + ' commit hash trailer',
        );
        ASSERT(
            MESSAGE.split('\n').includes(`Asset-Bytes: ${ENTRY.file} ${ENTRY.bytes}`),
            ENTRY.file + ' commit byte trailer',
        );
    }
    ASSERT.deepEqual(LOCK.assets, MANIFEST.assets, 'game lock font assets match pinned manifest');
    ASSERT.equal(
        Buffer.from(JSON.stringify(MANIFEST, null, 2) + '\n').equals(MANIFEST_BYTES),
        true,
        'canonical pinned manifest',
    );
    const HTML = FS.readFileSync(PATH.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
    const RUNTIME = JSON.parse(
        HTML.match(/<script id="bloom-runtime-manifest" type="application\/json">([\s\S]*?)<\/script>/)?.[1] || 'null',
    );
    ASSERT(RUNTIME && RUNTIME.schemaVersion === 1, 'runtime manifest required');
    ASSERT.equal(RUNTIME.sourceCommit, LOCK.sourceCommit);
    ASSERT.equal(RUNTIME.distCommit, LOCK.distCommit);
    ASSERT.equal(RUNTIME.modules.length, LOCK.modules.length);
    for (const MODULE of LOCK.modules) {
        ASSERT(Object.hasOwn(MODULES, MODULE.name), 'Unexpected module');
        const FILENAME = MODULE.name + '.js',
            BYTES = READ(FILENAME),
            ENTRY = MANIFEST.modules.find((m) => m.file === FILENAME);
        ASSERT(ENTRY, FILENAME + ' missing from manifest');
        CHECK_BLOB(FILENAME, BYTES);
        ASSERT.equal(SHA(BYTES), ENTRY.sha256, FILENAME + ' manifest bytes');
        ASSERT.equal(SHA(BYTES), MODULE.bundleSHA256, FILENAME + ' lock bytes');
        ASSERT(
            MESSAGE.split('\n').includes(`Bundle-SHA256: ${FILENAME} ${MODULE.bundleSHA256}`),
            FILENAME + ' commit trailer',
        );
        const REFERENCE = RUNTIME.modules.find((m) => m.name === MODULE.name);
        ASSERT(REFERENCE, MODULE.name + ' runtime reference');
        ASSERT.equal(REFERENCE.globalName, MODULES[MODULE.name]);
        ASSERT.equal(
            REFERENCE.url,
            `https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@${LOCK.distCommit}/${FILENAME}`,
        );
        ASSERT.equal(REFERENCE.sha256, MODULE.bundleSHA256);
        ASSERT.equal(REFERENCE.bytes, BYTES.length);
        ASSERT(!Object.hasOwn(MODULE, 'inlineSHA256'), 'inline SDK copy metadata removed');
    }
    ASSERT(!HTML.includes('BEGIN GAMEKIT'), 'HTML must reference modules, not include their bodies');
    for (const NAME of ['game', 'bootstrap']) {
        const SPEC = RUNTIME[NAME];
        ASSERT.equal(SPEC.file, `src/${NAME === 'game' ? 'game' : 'bootstrap'}.js`);
        const SOURCE = FS.readFileSync(PATH.join(root, SPEC.file));
        ASSERT.equal(SOURCE.length, SPEC.bytes, SPEC.file + ' byte count');
        ASSERT.equal(SHA(SOURCE), SPEC.sha256, SPEC.file + ' SHA256');
        ASSERT(!SOURCE.toString().includes('BEGIN GAMEKIT'), 'Game source must not carry a module body');
    }
    const BOOTSTRAP_SRI = 'sha256-' + Buffer.from(RUNTIME.bootstrap.sha256, 'hex').toString('base64');
    ASSERT(HTML.includes(`integrity="${BOOTSTRAP_SRI}"`), 'bootstrap integrity attribute');
    if (RUNTIME.scope) {
        ASSERT.equal(RUNTIME.scope.file, 'src/scope.js');
        const BYTES = FS.readFileSync(PATH.join(root, RUNTIME.scope.file));
        ASSERT.equal(BYTES.length, RUNTIME.scope.bytes);
        ASSERT.equal(SHA(BYTES), RUNTIME.scope.sha256);
    }
    return LOCK;
}
// Update-time command: obtain real Git objects from immutable pins, then validate
// all bundles before replacing the cache. A local upstream Git checkout is also
// accepted so maintainers can use their authenticated fetch outside this tool.
function refresh(repository, root = ROOT) {
    const LOCK = JSON.parse(FS.readFileSync(PATH.join(root, 'gamekit-lock.json'))),
        TEMP = FS.mkdtempSync(PATH.join(OS.tmpdir(), 'budmori-provenance-'));
    const GIT = (args) =>
        CP.execFileSync('git', args, {
            cwd: TEMP,
            maxBuffer: 32 * 1024 * 1024,
            timeout: 120000,
            env: {
                ...process.env,
                GIT_TERMINAL_PROMPT: '0',
            },
        });
    try {
        GIT(['init', '--bare', '--quiet']);
        for (const PIN of [LOCK.distCommit, LOCK.sourceCommit]) {
            ASSERT.match(PIN, /^[a-f0-9]{40}$/);
            GIT(['fetch', '--quiet', '--no-tags', '--depth=1', repository, PIN]);
        }
        const CACHE = PATH.join(TEMP, 'cache'),
            SOURCE_CACHE = PATH.join(TEMP, 'source-cache');
        FS.mkdirSync(CACHE);
        FS.mkdirSync(SOURCE_CACHE);
        const PUT = (base, name, bytes) => {
            const TARGET = PATH.join(base, ...name.split('/'));
            FS.mkdirSync(PATH.dirname(TARGET), {
                recursive: true,
            });
            FS.writeFileSync(TARGET, bytes);
        };
        PUT(CACHE, 'dist-commit.raw', GIT(['cat-file', 'commit', LOCK.distCommit]));
        PUT(CACHE, 'source-commit.raw', GIT(['cat-file', 'commit', LOCK.sourceCommit]));
        PUT(
            CACHE,
            'dist-tree.base64',
            GIT(['cat-file', 'tree', `${LOCK.distCommit}^{tree}`]).toString('base64') + '\n',
        );
        for (const NAME of [
            'manifest.json',
            ...DIST_MODULES.map((n) => n + '.js'),
            ...DIST_ASSETS.map((a) => a.file),
        ]) {
            PUT(CACHE, NAME, GIT(['show', `${LOCK.distCommit}:${NAME}`]));
        }
        PUT(
            CACHE,
            'assets-tree.base64',
            GIT(['cat-file', 'tree', `${LOCK.distCommit}:assets`]).toString('base64') + '\n',
        );
        PUT(
            CACHE,
            'assets-fonts-tree.base64',
            GIT(['cat-file', 'tree', `${LOCK.distCommit}:assets/fonts`]).toString('base64') + '\n',
        );
        PUT(
            SOURCE_CACHE,
            'source-tree.base64',
            GIT(['cat-file', 'tree', `${LOCK.sourceCommit}^{tree}`]).toString('base64') + '\n',
        );
        PUT(
            SOURCE_CACHE,
            'modules-tree.base64',
            GIT(['cat-file', 'tree', `${LOCK.sourceCommit}:modules`]).toString('base64') + '\n',
        );
        PUT(
            SOURCE_CACHE,
            'vector-assets-tree.base64',
            GIT(['cat-file', 'tree', `${LOCK.sourceCommit}:modules/vector-assets`]).toString('base64') + '\n',
        );
        for (const NAME of SOURCE_FILES) {
            PUT(SOURCE_CACHE, NAME, GIT(['show', `${LOCK.sourceCommit}:${NAME}`]));
        }
        const STAGED = PATH.join(TEMP, 'staged');
        FS.mkdirSync(PATH.join(STAGED, 'vendor'), {
            recursive: true,
        });
        FS.cpSync(CACHE, PATH.join(STAGED, 'vendor/upstream'), {
            recursive: true,
        });
        FS.cpSync(SOURCE_CACHE, PATH.join(STAGED, 'vendor/upstream-source'), {
            recursive: true,
        });
        for (const NAME of ['index.html', 'gamekit-lock.json']) {
            FS.copyFileSync(PATH.join(root, NAME), PATH.join(STAGED, NAME));
        }
        FS.cpSync(PATH.join(root, 'src'), PATH.join(STAGED, 'src'), {
            recursive: true,
        });
        FS.cpSync(PATH.join(root, 'assets'), PATH.join(STAGED, 'assets'), {
            recursive: true,
        });
        FS.mkdirSync(PATH.join(STAGED, 'scripts'), {
            recursive: true,
        });
        FS.copyFileSync(
            PATH.join(root, 'scripts/vector-assets-sources.json'),
            PATH.join(STAGED, 'scripts/vector-assets-sources.json'),
        );
        require('./update-runtime-manifest.cjs').prepareRuntime(STAGED);
        verify(STAGED);
        FS.cpSync(CACHE, PATH.join(root, 'vendor/upstream'), {
            recursive: true,
            force: true,
        });
        FS.cpSync(SOURCE_CACHE, PATH.join(root, 'vendor/upstream-source'), {
            recursive: true,
            force: true,
        });
        FS.copyFileSync(PATH.join(STAGED, 'index.html'), PATH.join(root, 'index.html'));
        console.log(
            'Verified immutable cache refreshed:',
            LOCK.distCommit,
            'with vector compiler source',
            LOCK.sourceCommit,
        );
    } finally {
        FS.rmSync(TEMP, {
            recursive: true,
            force: true,
        });
    }
}
module.exports = {
    verify,
    inline,
    sha: SHA,
    MODULES,
    DIST_ASSETS,
    SOURCE_FILES,
};
if (require.main === module) {
    if (process.argv[2] === 'refresh') {
        refresh(process.argv[3] || 'https://github.com/byh-playground/bloom-gamekit.git');
    } else {
        const LOCK = verify();
        console.log(
            'PASS pinned Git objects, manifest, immutable ESM references and runtime source integrity',
            LOCK.sourceCommit,
            LOCK.distCommit,
        );
    }
}
