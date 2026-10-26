// Evidence for model-only paired regressions. These are the actual source bytes
// imported in this process, not labels inferred later from a branch or version.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'espree';

const ENTRIES = ['src/farm-model.js', 'src/farm-state.js', 'src/player-progression.js'],
    RUNTIME = ['vendor/upstream/deterministic.js', 'vendor/upstream/work-scheduler.js'],
    HASH = (bytes) => createHash('sha256').update(bytes).digest('hex');

function dependencyTree(root, entries) {
    const FILES = new Map(),
        EDGES = [];
    const VISIT = (file) => {
        if (FILES.has(file)) {
            return;
        }
        const ABSOLUTE = path.resolve(root, file);
        assert.ok(ABSOLUTE.startsWith(path.resolve(root) + path.sep));
        const BYTES = fs.readFileSync(ABSOLUTE),
            TREE = parse(BYTES.toString('utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
        FILES.set(file, { file, bytes: BYTES.length, sha256: HASH(BYTES) });
        const WALK = (node) => {
            if (!node || typeof node !== 'object') {
                return;
            }
            if (
                ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(
                    node.type,
                ) &&
                node.source
            ) {
                assert.equal(typeof node.source.value, 'string', `unresolved model import in ${file}`);
                assert.ok(node.source.value.startsWith('.'), `nonlocal model import in ${file}`);
                const TARGET = path.posix.normalize(path.posix.join(path.posix.dirname(file), node.source.value));
                EDGES.push({ from: file, to: TARGET });
                VISIT(TARGET);
            }
            for (const VALUE of Object.values(node)) {
                if (Array.isArray(VALUE)) {
                    VALUE.forEach(WALK);
                } else if (VALUE && typeof VALUE === 'object') {
                    WALK(VALUE);
                }
            }
        };
        WALK(TREE);
    };
    entries.forEach(VISIT);
    const RECORDS = [...FILES.values()].sort((a, b) => a.file.localeCompare(b.file));
    EDGES.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
    return { sha256: HASH(JSON.stringify({ files: RECORDS, edges: EDGES })), files: RECORDS, edges: EDGES };
}

export function captureContactInputs(baselineRoot, candidateRoot, harnessURL) {
    return {
        base: dependencyTree(baselineRoot, ENTRIES),
        candidate: dependencyTree(candidateRoot, ENTRIES),
        // Both variants import the same pinned deterministic/scheduler runtime.
        sharedRuntime: dependencyTree(candidateRoot, RUNTIME),
        harnessSha256: HASH(fs.readFileSync(fileURLToPath(harnessURL))),
        provenanceHelperSha256: HASH(fs.readFileSync(fileURLToPath(import.meta.url))),
    };
}

export function verifyContactInputs(inputs, baselineRoot, candidateRoot, harnessURL) {
    assert.deepEqual(
        captureContactInputs(baselineRoot, candidateRoot, harnessURL),
        inputs,
        'all imported model dependencies, runtime and test source bytes remained unchanged during verification',
    );
}
