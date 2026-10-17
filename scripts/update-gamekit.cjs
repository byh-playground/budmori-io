'use strict';

// 검증한 배포 Git objects와 실제 ESM 참조/게임 원본 무결성을 함께 갱신합니다.
const FS = require('node:fs'),
    PATH = require('node:path'),
    OS = require('node:os'),
    CP = require('node:child_process'),
    ASSERT = require('node:assert/strict');
const { verify: VERIFY, sha: SHA, MODULES, DIST_ASSETS, SOURCE_FILES } = require('./gamekit-provenance.cjs');
const { prepareRuntime: PREPARE_RUNTIME } = require('./update-runtime-manifest.cjs');
const ROOT = PATH.resolve(__dirname, '..'),
    REPOSITORY = process.argv[2] || 'https://github.com/byh-playground/bloom-gamekit.git',
    REF = process.argv[3] || 'refs/heads/dist';
const PREVIOUS = JSON.parse(FS.readFileSync(PATH.join(ROOT, 'gamekit-lock.json'), 'utf8'));
const TASK_TEMP = FS.mkdtempSync(PATH.join(OS.tmpdir(), 'budmori-gamekit-update-'));
const GIT = (args) =>
    CP.execFileSync('git', args, {
        cwd: TASK_TEMP,
        maxBuffer: 64 * 1024 * 1024,
        timeout: 120000,
        env: {
            ...process.env,
            GIT_TERMINAL_PROMPT: '0',
        },
    });
try {
    GIT(['init', '--bare', '--quiet']);
    GIT(['fetch', '--quiet', '--no-tags', '--depth=1', REPOSITORY, REF]);
    const DIST_COMMIT = GIT(['rev-parse', 'FETCH_HEAD']).toString().trim(),
        DIST_BYTES = GIT(['cat-file', 'commit', DIST_COMMIT]);
    const SOURCE_COMMIT = DIST_BYTES.toString('utf8').match(/^Source-Commit: ([a-f0-9]{40})$/m)?.[1];
    ASSERT(SOURCE_COMMIT, 'dist requires verified Source-Commit trailer');
    GIT(['fetch', '--quiet', '--no-tags', '--depth=1', REPOSITORY, SOURCE_COMMIT]);
    const MANIFEST_BYTES = GIT(['show', `${DIST_COMMIT}:manifest.json`]),
        MANIFEST = JSON.parse(MANIFEST_BYTES);
    ASSERT.deepEqual(Object.keys(MANIFEST), ['schemaVersion', 'modules', 'assets'], 'manifest keys');
    ASSERT.equal(MANIFEST.schemaVersion, 2, 'font assets require manifest schema 2');
    ASSERT.deepEqual(
        MANIFEST.modules.map((m) => m.file),
        [
            'interpolation.js',
            'rendering.js',
            'vector-assets.js',
            'vector-assets-loader.js',
            'input.js',
            'deterministic.js',
            'simloop.js',
            'transport.js',
            'replay.js',
            'rollback.js',
            'camera.js',
            'presentation-events.js',
            'hud.js',
            'debug-tools.js',
            'audio.js',
            'navigation.js',
            'scenario.js',
        ],
        'fixed distribution module order',
    );
    ASSERT.deepEqual(
        MANIFEST.assets.map(({ file, version }) => ({
            file,
            version,
        })),
        DIST_ASSETS,
        'fixed font asset inventory',
    );
    ASSERT.equal(
        Buffer.from(JSON.stringify(MANIFEST, null, 2) + '\n').equals(MANIFEST_BYTES),
        true,
        'canonical distribution manifest',
    );
    const STAGED = PATH.join(TASK_TEMP, 'staged'),
        VENDOR = PATH.join(STAGED, 'vendor/upstream');
    FS.mkdirSync(VENDOR, {
        recursive: true,
    });
    const PUT = (file, bytes) => {
        const TARGET = PATH.join(VENDOR, ...file.split('/'));
        FS.mkdirSync(PATH.dirname(TARGET), {
            recursive: true,
        });
        FS.writeFileSync(TARGET, bytes);
    };
    const SOURCE_CACHE = PATH.join(STAGED, 'vendor/upstream-source');
    FS.mkdirSync(SOURCE_CACHE, {
        recursive: true,
    });
    const PUT_SOURCE = (file, bytes) => {
        const TARGET = PATH.join(SOURCE_CACHE, file);
        FS.mkdirSync(PATH.dirname(TARGET), {
            recursive: true,
        });
        FS.writeFileSync(TARGET, bytes);
    };
    PUT_SOURCE('source-tree.base64', GIT(['cat-file', 'tree', `${SOURCE_COMMIT}^{tree}`]).toString('base64') + '\n');
    PUT_SOURCE('modules-tree.base64', GIT(['cat-file', 'tree', `${SOURCE_COMMIT}:modules`]).toString('base64') + '\n');
    PUT_SOURCE(
        'vector-assets-tree.base64',
        GIT(['cat-file', 'tree', `${SOURCE_COMMIT}:modules/vector-assets`]).toString('base64') + '\n',
    );
    for (const FILE of SOURCE_FILES) {
        PUT_SOURCE(FILE, GIT(['show', `${SOURCE_COMMIT}:${FILE}`]));
    }
    PUT('dist-commit.raw', DIST_BYTES);
    PUT('source-commit.raw', GIT(['cat-file', 'commit', SOURCE_COMMIT]));
    PUT('dist-tree.base64', GIT(['cat-file', 'tree', `${DIST_COMMIT}^{tree}`]).toString('base64') + '\n');
    PUT('manifest.json', MANIFEST_BYTES);
    PUT('assets-tree.base64', GIT(['cat-file', 'tree', `${DIST_COMMIT}:assets`]).toString('base64') + '\n');
    PUT('assets-fonts-tree.base64', GIT(['cat-file', 'tree', `${DIST_COMMIT}:assets/fonts`]).toString('base64') + '\n');
    for (const ENTRY of MANIFEST.modules) {
        ASSERT.match(ENTRY.file, /^[a-z-]+\.js$/);
        PUT(ENTRY.file, GIT(['show', `${DIST_COMMIT}:${ENTRY.file}`]));
    }
    for (const ENTRY of MANIFEST.assets) {
        ASSERT(
            DIST_ASSETS.some((asset) => asset.file === ENTRY.file && asset.version === ENTRY.version),
            'asset path/version must be explicitly supported',
        );
        ASSERT(
            Number.isSafeInteger(ENTRY.bytes) && ENTRY.bytes > 0 && /^[a-f0-9]{64}$/.test(ENTRY.sha256),
            'asset size/hash',
        );
        PUT(ENTRY.file, GIT(['show', `${DIST_COMMIT}:${ENTRY.file}`]));
    }
    let html = FS.readFileSync(PATH.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
    const LOCK = {
        ...PREVIOUS,
        schemaVersion: 3,
        sourceCommit: SOURCE_COMMIT,
        distCommit: DIST_COMMIT,
        manifestSHA256: SHA(MANIFEST_BYTES),
        assets: MANIFEST.assets,
        modules: [],
    };
    for (const NAME of Object.keys(MODULES)) {
        const BYTES = FS.readFileSync(PATH.join(VENDOR, NAME + '.js'));
        LOCK.modules.push({
            name: NAME,
            bundleSHA256: SHA(BYTES),
        });
    }
    html = html.split(PREVIOUS.sourceCommit).join(SOURCE_COMMIT).split(PREVIOUS.distCommit).join(DIST_COMMIT);
    const GAME = FS.readFileSync(PATH.join(ROOT, 'src/game.js'), 'utf8')
        .replace(/\r\n/g, '\n')
        .split(PREVIOUS.sourceCommit)
        .join(SOURCE_COMMIT)
        .split(PREVIOUS.distCommit)
        .join(DIST_COMMIT);
    FS.writeFileSync(PATH.join(STAGED, 'index.html'), html);
    FS.writeFileSync(PATH.join(STAGED, 'gamekit-lock.json'), JSON.stringify(LOCK, null, 2) + '\n');
    FS.mkdirSync(PATH.join(STAGED, 'src'), {
        recursive: true,
    });
    FS.writeFileSync(PATH.join(STAGED, 'src/game.js'), GAME);
    FS.copyFileSync(PATH.join(ROOT, 'src/bootstrap.js'), PATH.join(STAGED, 'src/bootstrap.js'));
    if (FS.existsSync(PATH.join(ROOT, 'src/scope.js'))) {
        FS.copyFileSync(PATH.join(ROOT, 'src/scope.js'), PATH.join(STAGED, 'src/scope.js'));
    }
    FS.cpSync(PATH.join(ROOT, 'assets'), PATH.join(STAGED, 'assets'), {
        recursive: true,
    });
    FS.mkdirSync(PATH.join(STAGED, 'scripts'), {
        recursive: true,
    });
    FS.copyFileSync(
        PATH.join(ROOT, 'scripts/vector-assets-sources.json'),
        PATH.join(STAGED, 'scripts/vector-assets-sources.json'),
    );
    PREPARE_RUNTIME(STAGED);
    VERIFY(STAGED); // 완성한 staged 전체를 검증하기 전 작업 파일은 바꾸지 않습니다.
    for (const FILE of ['index.html', 'gamekit-lock.json']) {
        FS.copyFileSync(PATH.join(STAGED, FILE), PATH.join(ROOT, FILE));
    }
    FS.copyFileSync(PATH.join(STAGED, 'src/game.js'), PATH.join(ROOT, 'src/game.js'));
    FS.mkdirSync(PATH.join(ROOT, 'vendor/upstream'), {
        recursive: true,
    });
    FS.cpSync(VENDOR, PATH.join(ROOT, 'vendor/upstream'), {
        recursive: true,
        force: true,
    });
    FS.cpSync(SOURCE_CACHE, PATH.join(ROOT, 'vendor/upstream-source'), {
        recursive: true,
        force: true,
    });
    FS.rmSync(PATH.join(ROOT, 'vendor/upstream/rollback-netcode.js'), {
        force: true,
    }); // Merge new fixed assets; preserve unrelated source archive/user files.
    VERIFY(ROOT);
    console.log('PASS updated verified gamekit source', SOURCE_COMMIT, 'dist', DIST_COMMIT);
} finally {
    // mkdtemp가 만든 전용 디렉터리만 정리합니다. 저장소·사용자 파일은 대상이 아닙니다.
    ASSERT(
        PATH.dirname(TASK_TEMP) === PATH.resolve(OS.tmpdir()) &&
            PATH.basename(TASK_TEMP).startsWith('budmori-gamekit-update-'),
    );
    FS.rmSync(TASK_TEMP, {
        recursive: true,
        force: true,
    });
}
