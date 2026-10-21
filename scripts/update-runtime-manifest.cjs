'use strict';

// Deterministic asset manifest generation; no source bundle is copied to HTML.
const FS = require('node:fs'),
    PATH = require('node:path'),
    CRYPTO = require('node:crypto');
const CANONICAL_TEXT_BYTES = (bytes) => Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
function readCanonicalTextAsset(file) {
    const SOURCE = FS.readFileSync(file),
        BYTES = CANONICAL_TEXT_BYTES(SOURCE);
    if (!SOURCE.equals(BYTES)) {
        FS.writeFileSync(file, BYTES);
    }
    return BYTES;
}
function prepareRuntime(root = PATH.resolve(__dirname, '..')) {
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
        scenario: 'BloomGamekitScenario',
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
    const GAME_BYTES = readCanonicalTextAsset(PATH.join(root, 'src/game.js')),
        BOOTSTRAP = readCanonicalTextAsset(PATH.join(root, 'src/bootstrap.js'));
    const VECTOR_ASSETS = require('./vector-sources.cjs').validateVectorSources(root);
    const MANIFEST = {
        vectorAssets: VECTOR_ASSETS,
        schemaVersion: 1,
        sourceCommit: LOCK.sourceCommit,
        distCommit: LOCK.distCommit,
        modules: MODULES,
        game: {
            file: 'src/game.js',
            bytes: GAME_BYTES.length,
            sha256: SHA(GAME_BYTES),
        },
        bootstrap: {
            file: 'src/bootstrap.js',
            bytes: BOOTSTRAP.length,
            sha256: SHA(BOOTSTRAP),
        },
    };
    const SCOPE_FILE = PATH.join(root, 'src/scope.js');
    if (FS.existsSync(SCOPE_FILE)) {
        const BYTES = readCanonicalTextAsset(SCOPE_FILE);
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
    let html = FS.readFileSync(PATH.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
    const MARKER = /<script id="bloom-runtime-manifest" type="application\/json">[\s\S]*?<\/script>/;
    if (!MARKER.test(html)) {
        throw new Error('Runtime manifest marker missing');
    }
    html = html.replace(
        MARKER,
        '<script id="bloom-runtime-manifest" type="application/json">' + JSON.stringify(MANIFEST) + '</script>',
    );
    const INTEGRITY = 'sha256-' + Buffer.from(MANIFEST.bootstrap.sha256, 'hex').toString('base64');
    const BOOTSTRAP_MARKER = /<script\b(?=[^>]*\bdata-bloom-bootstrap(?:\s|>|=))[^>]*>\s*<\/script>/;
    if (!BOOTSTRAP_MARKER.test(html)) {
        throw new Error('Runtime bootstrap marker missing');
    }
    html = html.replace(
        BOOTSTRAP_MARKER,
        `<script type="module" src="./src/bootstrap.js?version=${MANIFEST.bootstrap.sha256}" integrity="${INTEGRITY}" crossorigin="anonymous" data-bloom-bootstrap></script>`,
    );
    FS.writeFileSync(PATH.join(root, 'index.html'), html);
    return {
        modules: MODULES.length,
        gameBytes: GAME_BYTES.length,
        indexBytes: Buffer.byteLength(html),
        gameSha256: MANIFEST.game.sha256,
    };
}
module.exports = {
    prepareRuntime,
    canonicalTextBytes: CANONICAL_TEXT_BYTES,
};
if (require.main === module) {
    console.log(JSON.stringify(prepareRuntime()));
}
