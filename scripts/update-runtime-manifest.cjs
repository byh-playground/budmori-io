'use strict';

// Deterministic asset manifest generation; no source bundle is copied to HTML. `--check` writes nothing and fails
// when index.html is out of date (part of `npm run check`), e.g. after a game module import changed.
const FS = require('node:fs'),
    PATH = require('node:path'),
    CRYPTO = require('node:crypto');
const CANONICAL_TEXT_BYTES = (bytes) => Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
function readCanonicalTextAsset(file, check) {
    const SOURCE = FS.readFileSync(file),
        BYTES = CANONICAL_TEXT_BYTES(SOURCE);
    if (!check && !SOURCE.equals(BYTES)) {
        FS.writeFileSync(file, BYTES);
    }
    return BYTES;
}
// The pinned GameKit module-graph lister (vendor/upstream/boot-build.mjs), loaded only after its bytes match the
// pinned dist manifest whose hash is the one in gamekit-lock.json.
function pinnedModuleGraph(root, lock, sha) {
    const MANIFEST_BYTES = FS.readFileSync(PATH.join(root, 'vendor/upstream/manifest.json'));
    if (sha(MANIFEST_BYTES) !== lock.manifestSHA256) {
        throw new Error('vendor/upstream/manifest.json does not match gamekit-lock.json manifestSHA256');
    }
    const FILE = PATH.join(root, 'vendor/upstream/boot-build.mjs'),
        ENTRY = JSON.parse(MANIFEST_BYTES).modules.find((entry) => entry.file === 'boot-build.mjs');
    if (!ENTRY || sha(FS.readFileSync(FILE)) !== ENTRY.sha256) {
        throw new Error('vendor/upstream/boot-build.mjs does not match the pinned GameKit manifest');
    }
    return require(FILE).listModuleGraph;
}
function prepareRuntime(root = PATH.resolve(__dirname, '..'), { check = false } = {}) {
    const LOCK = JSON.parse(FS.readFileSync(PATH.join(root, 'gamekit-lock.json'), 'utf8'));
    const NAMESPACES = {
        input: 'BloomGamekitInput',
        interpolation: 'BloomGamekitInterpolation',
        camera: 'BloomGamekitCamera',
        hud: 'BloomGamekitHud',
        'presentation-events': 'BloomGamekitPresentationEvents',
        'debug-tools': 'BloomGamekitDebugTools',
        'object-pool': 'BloomGamekitObjectPool',
        rendering: 'BloomGamekitRendering',
        'vector-assets': 'BloomGamekitVectorAssets',
        'vector-assets-loader': 'BloomGamekitVectorAssetLoader',
        deterministic: 'BloomGamekitDeterministic',
        simloop: 'BloomGamekitSimloop',
        'work-scheduler': 'BloomGamekitWorkScheduler',
        behavior: 'BloomGamekitBehavior',
        scenario: 'BloomGamekitScenario',
        save: 'BloomGamekitSave',
        pwa: 'BloomGamekitPwa',
        boot: 'BloomGamekitBoot',
        i18n: 'BloomGamekitI18n',
        face: 'BloomGamekitFace',
    };
    const SHA = (bytes) => CRYPTO.createHash('sha256').update(bytes).digest('hex');
    const MODULES = Object.entries(NAMESPACES).map(([name, globalName]) => {
        const BYTES = FS.readFileSync(PATH.join(root, 'vendor/upstream', name + '.js'));
        return {
            name,
            globalName,
            url: `https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@${LOCK.distCommit}/${name}.js`,
            bytes: BYTES.length,
            sha256: SHA(BYTES),
        };
    });
    const VECTOR_ASSETS = require('./vector-sources.cjs').validateVectorSources(root);
    const MANIFEST = {
        vectorAssets: VECTOR_ASSETS,
        schemaVersion: 1,
        sourceCommit: LOCK.sourceCommit,
        distCommit: LOCK.distCommit,
        modules: MODULES,
        game: { file: 'src/farm-app.js' },
        // Every local module the game entry loads, entry first; bootstrap preloads them in parallel before import().
        gameModules: pinnedModuleGraph(root, LOCK, SHA)({ root, entry: 'src/farm-app.js' }),
        bootstrap: { file: 'src/bootstrap.js' },
    };
    const SCOPE_FILE = PATH.join(root, 'src/scope.js');
    if (FS.existsSync(SCOPE_FILE)) {
        const BYTES = readCanonicalTextAsset(SCOPE_FILE, check);
        MANIFEST.scope = {
            file: 'src/scope.js',
            bytes: BYTES.length,
            sha256: SHA(BYTES),
        };
    }
    const VERSION_SOURCE = FS.readFileSync(PATH.join(root, 'src/version.js'), 'utf8');
    const PRODUCT_VERSION = VERSION_SOURCE.match(/PRODUCT_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
    if (!PRODUCT_VERSION) {
        throw new Error('Product version is missing from src/version.js');
    }
    MANIFEST.productVersion = PRODUCT_VERSION;
    const CURRENT = FS.readFileSync(PATH.join(root, 'index.html'), 'utf8');
    let html = CURRENT.replace(/\r\n/g, '\n');
    const MARKER = /<script id="bloom-runtime-manifest" type="application\/json">[\s\S]*?<\/script>/;
    if (!MARKER.test(html)) {
        throw new Error('Runtime manifest marker missing');
    }
    html = html.replace(
        MARKER,
        '<script id="bloom-runtime-manifest" type="application/json">' + JSON.stringify(MANIFEST) + '</script>',
    );
    const BOOTSTRAP_MARKER = /<script\b(?=[^>]*\bdata-bloom-bootstrap(?:\s|>|=))[^>]*>\s*<\/script>/;
    if (!BOOTSTRAP_MARKER.test(html)) {
        throw new Error('Runtime bootstrap marker missing');
    }
    html = html.replace(
        BOOTSTRAP_MARKER,
        '<script type="module" src="./src/bootstrap.js" data-bloom-bootstrap></script>',
    );
    if (check) {
        if (html !== CURRENT) {
            throw new Error('index.html runtime manifest is out of date: run node scripts/update-runtime-manifest.cjs');
        }
    } else {
        FS.writeFileSync(PATH.join(root, 'index.html'), html);
    }
    return {
        modules: MODULES.length,
        gameModules: MANIFEST.gameModules.length,
        indexBytes: Buffer.byteLength(html),
    };
}
module.exports = {
    prepareRuntime,
    canonicalTextBytes: CANONICAL_TEXT_BYTES,
};
if (require.main === module) {
    console.log(JSON.stringify(prepareRuntime(undefined, { check: process.argv.includes('--check') })));
}
