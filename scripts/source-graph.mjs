// Read-only verification of the authored browser sources. Never writes or bundles files.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { parse } from 'espree';
import { DOMParser } from '@xmldom/xmldom';

const DEFAULT_ROOT = fileURLToPath(new URL('../', import.meta.url));
const REQUIRE = createRequire(import.meta.url);
const HASH = (bytes) => createHash('sha256').update(bytes).digest('hex');
const SHA256 = /^[a-f0-9]{64}$/;
function walk(node, visit) {
    if (!node || typeof node !== 'object') {
        return;
    }
    if (typeof node.type === 'string') {
        visit(node);
    }
    for (const VALUE of Object.values(node)) {
        if (Array.isArray(VALUE)) {
            VALUE.forEach((child) => walk(child, visit));
        } else if (VALUE && typeof VALUE === 'object') {
            walk(VALUE, visit);
        }
    }
}
function attributes(tag) {
    return Object.fromEntries(
        [...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/gs)].map((match) => [match[1].toLowerCase(), match[3]]),
    );
}
function literal(node) {
    if (node?.type === 'Literal' && typeof node.value === 'string') {
        return node.value;
    }
    if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
        return node.quasis[0].value.cooked;
    }
    return null;
}
function moduleURL(node) {
    const VALUE = node?.type === 'MemberExpression' && node.property.name === 'href' ? node.object : node;
    const BASE = VALUE?.arguments?.[1];
    return VALUE?.type === 'NewExpression' &&
        VALUE.callee.name === 'URL' &&
        BASE?.type === 'MemberExpression' &&
        BASE.object.type === 'MetaProperty' &&
        BASE.object.meta.name === 'import' &&
        BASE.property.name === 'url'
        ? literal(VALUE.arguments[0])
        : null;
}

export function sourceGraph(root = DEFAULT_ROOT) {
    // Refresh verifies a staged SDK before replacing the working cache. Use that root's pinned schema.
    const { validateAssetMetadata: VALIDATE_ASSET_METADATA } = REQUIRE(
        path.resolve(root, 'vendor/upstream-source/modules/vector-assets/schema.js'),
    );
    const ROOT = fs.realpathSync(root),
        FILES = new Map(),
        EDGES = [],
        SEEN = new Set();
    const READ = (file) => {
        const ABSOLUTE = path.resolve(ROOT, file);
        assert.ok(ABSOLUTE.startsWith(ROOT + path.sep), `Source escapes repository: ${file}`);
        assert.ok(fs.existsSync(ABSOLUTE) && fs.statSync(ABSOLUTE).isFile(), `Missing source file: ${file}`);
        assert.ok(fs.realpathSync(ABSOLUTE).startsWith(ROOT + path.sep), `Source symlink escapes repository: ${file}`);
        return fs.readFileSync(ABSOLUTE);
    };
    const RECORD = (file, kind) => {
        const BYTES = READ(file);
        FILES.set(file, { file, kind, bytes: BYTES.length, sha256: HASH(BYTES) });
        return BYTES;
    };
    const RESOLVE = (specifier, importer, module = false) => {
        assert.ok(typeof specifier === 'string' && specifier.length > 0, `Empty source reference in ${importer}`);
        assert.ok(!/[\\?#]/.test(specifier), `Unsupported source reference ${specifier} in ${importer}`);
        assert.ok(!/^(?:[a-z][\w+.-]*:|\/)/i.test(specifier), `Nonlocal source reference ${specifier} in ${importer}`);
        if (module) {
            assert.ok(/^\.\.?\//.test(specifier), `Unsupported bare browser import ${specifier} in ${importer}`);
        }
        const FILE = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
        assert.ok(!FILE.startsWith('../'), `Source escapes repository: ${specifier} in ${importer}`);
        if (module) {
            assert.ok(FILE.endsWith('.js'), `Browser import must be native .js, not CommonJS: ${FILE}`);
        }
        return FILE;
    };
    const HTML = RECORD('index.html', 'html').toString('utf8'),
        SCRIPTS = [...HTML.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)],
        MANIFEST_SCRIPT = SCRIPTS.find((match) => attributes(match[1]).id === 'bloom-runtime-manifest');
    assert.ok(MANIFEST_SCRIPT, 'Runtime manifest is required');
    const MANIFEST = JSON.parse(MANIFEST_SCRIPT[2]);
    const VERSION_MODULE = parse(READ('src/version.js').toString('utf8'), {
        ecmaVersion: 'latest',
        sourceType: 'module',
    });
    const VERSION_DECLARATION = VERSION_MODULE.body
        .filter((node) => node.type === 'ExportNamedDeclaration')
        .flatMap((node) => node.declaration?.declarations || [])
        .find((node) => node.id.name === 'PRODUCT_VERSION');
    assert.equal(typeof VERSION_DECLARATION?.init?.value, 'string', 'Product version must be a source literal');
    assert.equal(MANIFEST.productVersion, VERSION_DECLARATION.init.value, 'Runtime manifest product version');
    assert.equal(MANIFEST.game?.file, 'src/farm-app.js', 'Runtime entry must be the authored farm-app.js');
    assert.equal(MANIFEST.bootstrap?.file, 'src/bootstrap.js');
    const ENTRY_POINTS = [];
    for (const SCRIPT of SCRIPTS) {
        const ATTR = attributes(SCRIPT[1]);
        if (ATTR.type === 'application/json') {
            continue;
        }
        assert.equal(ATTR.type, 'module', 'Browser scripts must use native modules');
        assert.ok(ATTR.src && !SCRIPT[2].trim(), 'Browser entry must reference an authored module file');
        ENTRY_POINTS.push(RESOLVE(ATTR.src, 'index.html', true));
    }
    assert.ok(ENTRY_POINTS.includes(MANIFEST.bootstrap.file), 'Runtime bootstrap must be loaded by index.html');
    ENTRY_POINTS.push(MANIFEST.game.file);
    if (MANIFEST.scope) {
        ENTRY_POINTS.push(RESOLVE('./' + MANIFEST.scope.file, 'index.html', true));
    }
    const VISIT_MODULE = (file) => {
        if (SEEN.has(file)) {
            return;
        }
        SEEN.add(file);
        const SOURCE = RECORD(file, 'module').toString('utf8'),
            TREE = parse(SOURCE, { ecmaVersion: 'latest', sourceType: 'module' }),
            DECLARATIONS = new Map();
        walk(TREE, (node) => {
            if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
                const LIST = DECLARATIONS.get(node.id.name) || [];
                LIST.push(node.init);
                DECLARATIONS.set(node.id.name, LIST);
            }
        });
        walk(TREE, (node) => {
            let specifier;
            if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type)) {
                if (!node.source) {
                    return;
                }
                specifier = literal(node.source);
            } else if (node.type === 'ImportExpression') {
                specifier = literal(node.source) ?? moduleURL(node.source);
                if (specifier === null && node.source.type === 'Identifier') {
                    const VALUES = DECLARATIONS.get(node.source.name) || [],
                        URLS = VALUES.map(moduleURL).filter((value) => value !== null);
                    if (URLS.length === 1) {
                        specifier = URLS[0];
                    } else if (
                        file === MANIFEST.bootstrap.file &&
                        node.source.name === 'URL_LOCAL' &&
                        VALUES.some(
                            (value) =>
                                value?.type === 'CallExpression' &&
                                value.callee.object?.name === 'URL' &&
                                value.callee.property?.name === 'createObjectURL' &&
                                value.arguments[0]?.type === 'NewExpression' &&
                                value.arguments[0].callee.name === 'Blob',
                        )
                    ) {
                        // The existing bootstrap imports hash-verified immutable SDK bytes, not generated app code.
                        EDGES.push({ from: file, kind: 'verified-sdk-manifest', to: 'runtime-manifest.modules' });
                        return;
                    }
                }
                assert.ok(
                    specifier !== null,
                    `Unresolved dynamic browser import in ${file}: ${SOURCE.slice(node.start, node.end)}`,
                );
            } else {
                return;
            }
            if (file === 'src/showcase.js' && specifier.startsWith('https://')) {
                // Intro host is a version-pinned GameKit ESM import, not arbitrary remote code.
                const PIN = JSON.parse(READ('gamekit-lock.json')).showcase;
                assert.ok(PIN, 'GameKit introduction pin is required');
                assert.match(PIN.distCommit, /^[a-f0-9]{40}$/);
                assert.match(PIN.bundleSHA256, SHA256);
                assert.equal(
                    specifier,
                    `https://cdn.jsdelivr.net/gh/${PIN.repository}@${PIN.distCommit}/scenario.js`,
                    'Showcase must import exactly the vetted GameKit scenario release',
                );
                EDGES.push({ from: file, kind: 'immutable-sdk-scenario', to: specifier });
                return;
            }
            const TARGET = RESOLVE(specifier, file, true);
            EDGES.push({ from: file, kind: node.type, to: TARGET });
            VISIT_MODULE(TARGET);
        });
    };
    ENTRY_POINTS.forEach(VISIT_MODULE);
    assert.ok(
        EDGES.some((edge) => edge.from === MANIFEST.bootstrap.file && edge.to === MANIFEST.game.file),
        'Bootstrap must import the manifest game entry directly',
    );
    const VISIT_STYLE = (file) => {
        if (FILES.has(file)) {
            return;
        }
        const CSS = RECORD(file, 'stylesheet')
            .toString('utf8')
            .replace(/\/\*[\s\S]*?\*\//g, '');
        for (const MATCH of CSS.matchAll(/@import\s+(?:url\(\s*)?(["'])(.*?)\1\s*\)?/gi)) {
            VISIT_STYLE(RESOLVE(MATCH[2], file));
        }
        for (const MATCH of CSS.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
            if (/^(?:data:|#)/i.test(MATCH[2])) {
                continue;
            }
            const TARGET = RESOLVE(MATCH[2], file);
            if (TARGET.endsWith('.css')) {
                VISIT_STYLE(TARGET);
            } else {
                RECORD(TARGET, 'style-asset');
            }
        }
    };
    for (const MATCH of HTML.matchAll(/<link\b([^>]*)>/gi)) {
        const ATTR = attributes(MATCH[1]);
        if (ATTR.rel === 'stylesheet') {
            VISIT_STYLE(RESOLVE(ATTR.href, 'index.html'));
        }
    }
    const LOCK = JSON.parse(READ('gamekit-lock.json')),
        SDK_MANIFEST_BYTES = READ('vendor/upstream/manifest.json'),
        SDK_MANIFEST = JSON.parse(SDK_MANIFEST_BYTES),
        SDK_NAMES = new Set();
    assert.equal(HASH(SDK_MANIFEST_BYTES), LOCK.manifestSHA256, 'Frozen SDK manifest hash');
    assert.equal(MANIFEST.sourceCommit, LOCK.sourceCommit, 'SDK source commit');
    assert.equal(MANIFEST.distCommit, LOCK.distCommit, 'SDK distribution commit');
    assert.match(LOCK.distCommit, /^[a-f0-9]{40}$/);
    const SDK_MODULES = MANIFEST.modules.map((module) => {
        assert.ok(!SDK_NAMES.has(module.name), `Duplicate SDK module: ${module.name}`);
        SDK_NAMES.add(module.name);
        const FILE = `vendor/upstream/${module.name}.js`,
            BYTES = READ(FILE),
            PIN = LOCK.modules.find((entry) => entry.name === module.name),
            UPSTREAM = SDK_MANIFEST.modules.find((entry) => entry.file === `${module.name}.js`);
        assert.match(module.sha256, SHA256);
        assert.equal(module.sha256, PIN?.bundleSHA256, `SDK lock hash: ${module.name}`);
        assert.equal(module.sha256, UPSTREAM?.sha256, `SDK manifest hash: ${module.name}`);
        assert.equal(HASH(BYTES), module.sha256, `Frozen SDK bytes: ${module.name}`);
        assert.equal(BYTES.length, module.bytes, `Frozen SDK length: ${module.name}`);
        assert.equal(module.url, `https://cdn.jsdelivr.net/gh/${LOCK.repository}@${LOCK.distCommit}/${module.name}.js`);
        return { file: FILE, url: module.url, bytes: BYTES.length, sha256: module.sha256 };
    });
    assert.deepEqual([...SDK_NAMES].sort(), LOCK.modules.map((module) => module.name).sort(), 'All locked SDK modules');
    const INVENTORY = JSON.parse(READ('scripts/vector-assets-sources.json')),
        EXPECTED_ASSETS = [
            ...INVENTORY.assets.map(({ species, ...entry }) => ({ kind: 'troop', id: species, ...entry })),
            ...INVENTORY.bosses.map((entry) => ({ kind: 'boss', ...entry })),
        ],
        VECTOR_METADATA = [];
    assert.equal(MANIFEST.vectorAssets.length, EXPECTED_ASSETS.length, 'Complete original SVG inventory');
    const ASSET_KEYS = new Set();
    for (const SPEC of MANIFEST.vectorAssets) {
        const KEY = `${SPEC.kind}:${SPEC.id}`,
            EXPECTED = EXPECTED_ASSETS.find((entry) => `${entry.kind}:${entry.id}` === KEY);
        assert.ok(EXPECTED && !ASSET_KEYS.has(KEY), `Unknown or duplicate SVG identity: ${KEY}`);
        ASSET_KEYS.add(KEY);
        assert.equal(SPEC.file, EXPECTED.file);
        assert.equal(SPEC.qualityPreset, EXPECTED.qualityPreset);
        assert.match(SPEC.file, /^assets\/(troops|bosses)\/[a-z0-9-]+\.svg$/);
        const BYTES = RECORD(SPEC.file, 'svg');
        assert.equal(BYTES.length, SPEC.bytes, `SVG length: ${SPEC.file}`);
        assert.equal(HASH(BYTES), SPEC.sha256, `SVG hash: ${SPEC.file}`);
        const DOCUMENT = new DOMParser({
                onError(level, message) {
                    throw new Error(`${SPEC.file}: ${level}: ${message}`);
                },
            }).parseFromString(BYTES.toString('utf8'), 'image/svg+xml'),
            IDS = new Map();
        const VISIT_NODE = (node) => {
            if (node.nodeType !== 1) {
                return;
            }
            const ID = node.getAttribute('id');
            if (ID) {
                assert.ok(!IDS.has(ID), `Duplicate SVG id ${ID}: ${SPEC.file}`);
                IDS.set(ID, node);
            }
            for (let child = node.firstChild; child; child = child.nextSibling) {
                VISIT_NODE(child);
            }
        };
        VISIT_NODE(DOCUMENT.documentElement);
        assert.equal(DOCUMENT.documentElement.nodeName, 'svg');
        const METADATA = VALIDATE_ASSET_METADATA(JSON.parse(IDS.get('vector-asset')?.textContent), IDS);
        for (const NAME of ['mouth', 'ground']) {
            assert.ok(METADATA.sockets[NAME], `Missing SVG socket ${NAME}: ${SPEC.file}`);
        }
        if (SPEC.kind === 'boss') {
            const SPECIES = Number(SPEC.id.replace(/^species-/, '')),
                TROOP = MANIFEST.vectorAssets.find((entry) => entry.kind === 'troop' && entry.id === SPECIES);
            assert.ok(TROOP, `Missing shared species source for ${SPEC.id}`);
            assert.equal(SPEC.file, TROOP.file, `Boss and troop must use one authored rig: ${SPEC.id}`);
            assert.equal(SPEC.sha256, TROOP.sha256, `Shared species source identity: ${SPEC.id}`);
            assert.equal(SPEC.qualityPreset, 'standard', `Boss quality remains standard: ${SPEC.id}`);
            assert.equal(TROOP.qualityPreset, 'smallAsset', `Troop quality remains smallAsset: ${SPEC.id}`);
            for (const NAME of ['idle', 'walk', 'windup', 'fire', 'recover', 'hit', 'airborne', 'landing', 'death']) {
                assert.ok(METADATA.clips[NAME], `Missing shared combat clip ${NAME}: ${SPEC.file}`);
            }
        }
        VECTOR_METADATA.push({
            file: SPEC.file,
            id: METADATA.id,
            parts: METADATA.parts.length,
            clips: Object.keys(METADATA.clips).sort(),
        });
    }
    const SORTED_FILES = [...FILES.values()].sort((a, b) => a.file.localeCompare(b.file)),
        SORTED_SDK = SDK_MODULES.sort((a, b) => a.file.localeCompare(b.file));
    return {
        format: 'budmori authored browser source graph v1',
        sha256: HASH(JSON.stringify({ files: SORTED_FILES, sdkModules: SORTED_SDK })),
        entryPoints: [...new Set(ENTRY_POINTS)].sort(),
        files: SORTED_FILES,
        imports: EDGES.sort((a, b) => `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`)),
        sdk: {
            sourceCommit: LOCK.sourceCommit,
            distCommit: LOCK.distCommit,
            manifestSha256: LOCK.manifestSHA256,
            modules: SORTED_SDK,
        },
        vectorMetadata: VECTOR_METADATA,
    };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    console.log(JSON.stringify(sourceGraph(process.argv[2] || DEFAULT_ROOT), null, 2));
}
