'use strict';

const FS = require('node:fs');
const PATH = require('node:path');
const ESPREE = require('espree');
const SCRIPT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);
const EXCLUDED_DIRECTORIES = new Set(['.git', 'node_modules', 'vendor']);
const COMPILED_FIELDS = ['schemaVersion', 'compilerVersion', 'sourceSha256', 'metadata', 'geometry'];
const GEOMETRY_FIELDS = ['vertices', 'strideFloats', 'partCount', 'morphCount'];
const GENERATED_MODULE = /(?:^|\/)vector-assets\.generated\.[cm]?js(?:[?#]|$)/i;
const CHARACTER_RESOURCE = /^assets\/(?:troops|bosses)\//;
const ORIGINAL_RESOURCE = /^assets\/(?:troops|bosses)\/[a-z0-9-]+\.svg$/;

function rejectArtifact(file, reason) {
    throw new Error(`${file}: ${reason}. Keep original SVG sources and compile them with the runtime loader`);
}

function visitNodes(node, visit) {
    if (!node || typeof node !== 'object') {
        return;
    }
    if (typeof node.type === 'string') {
        visit(node);
    }
    for (const VALUE of Object.values(node)) {
        if (Array.isArray(VALUE)) {
            for (const CHILD of VALUE) {
                visitNodes(CHILD, visit);
            }
        } else if (VALUE && typeof VALUE === 'object') {
            visitNodes(VALUE, visit);
        }
    }
}

function propertyName(property) {
    if (property.type !== 'Property') {
        return null;
    }
    if (!property.computed && property.key.type === 'Identifier') {
        return property.key.name;
    }
    return property.key.type === 'Literal' ? property.key.value : null;
}

function checkFields(fields, stride, file) {
    if (COMPILED_FIELDS.every((field) => fields.has(field))) {
        rejectArtifact(file, 'Stored GameKit compiled SVG asset');
    }
    if (stride === 11 && GEOMETRY_FIELDS.every((field) => fields.has(field))) {
        rejectArtifact(file, 'Stored GameKit SVG geometry');
    }
}

function checkResource(file, resource) {
    if (typeof resource !== 'string') {
        return;
    }
    const NORMALIZED = resource
        .replaceAll('\\', '/')
        .replace(/^(?:\.\.?\/)+/, '')
        .replace(/^\//, '')
        .split(/[?#]/)[0];
    if (GENERATED_MODULE.test(NORMALIZED)) {
        rejectArtifact(file, 'Retired generated vector module');
    }
    if (CHARACTER_RESOURCE.test(NORMALIZED) && !ORIGINAL_RESOURCE.test(NORMALIZED)) {
        rejectArtifact(file, `Character resource must be an original SVG: ${resource}`);
    }
}

function checkJson(value, file) {
    if (typeof value === 'string') {
        checkSerializedJson(value, file);
    }
    if (!value || typeof value !== 'object') {
        return;
    }
    const FIELDS = new Set(Object.keys(value));
    checkFields(FIELDS, value.strideFloats, file);
    if (Array.isArray(value.vectorAssets)) {
        for (const ASSET of value.vectorAssets) {
            if (!ORIGINAL_RESOURCE.test(ASSET?.file ?? '')) {
                rejectArtifact(file, 'Runtime vector manifest must reference original SVG files');
            }
        }
    }
    for (const [KEY, CHILD] of Object.entries(value)) {
        if (['file', 'url', 'src'].includes(KEY)) {
            checkResource(file, CHILD);
        }
        checkJson(CHILD, file);
    }
}

function checkSerializedJson(value, file) {
    let source = value.trim();
    if (/^[A-Za-z0-9+/]+={0,2}$/.test(source) && source.length % 4 === 0) {
        source = Buffer.from(source, 'base64').toString('utf8').trim();
    }
    if (!source.startsWith('{') && !source.startsWith('[')) {
        return;
    }
    let parsed;
    try {
        parsed = JSON.parse(source);
    } catch {
        return;
    }
    checkJson(parsed, file);
}

function checkCompilerDecoder(node, file) {
    // This is the typed-array serializer in the pinned GameKit compiler.js.
    // Ordinary math arrays, typed-array allocations and unrelated base64 are allowed.
    let literalBase64 = false;
    let byteArray = false;
    let meshArray = false;
    let byteCharacter = false;
    visitNodes(node.body, (child) => {
        if (child.type === 'NewExpression' && child.callee.type === 'Identifier') {
            byteArray ||= child.callee.name === 'Uint8Array';
            meshArray ||= ['Float32Array', 'Uint16Array'].includes(child.callee.name);
        }
        if (child.type !== 'CallExpression') {
            return;
        }
        literalBase64 ||=
            child.callee.type === 'Identifier' &&
            child.callee.name === 'atob' &&
            child.arguments[0]?.type === 'Literal' &&
            typeof child.arguments[0].value === 'string';
        byteCharacter ||= child.callee.type === 'MemberExpression' && child.callee.property.name === 'charCodeAt';
    });
    if (literalBase64 && byteArray && meshArray && byteCharacter) {
        rejectArtifact(file, 'Embedded GameKit base64 typed-array payload');
    }
}

function checkScript(source, file) {
    const TREE = ESPREE.parse(source, {
        ecmaVersion: 'latest',
        sourceType: file.endsWith('.cjs') ? 'commonjs' : 'module',
    });
    visitNodes(TREE, (node) => {
        if (node.type === 'ObjectExpression') {
            const FIELDS = new Map(node.properties.map((property) => [propertyName(property), property.value]));
            checkFields(FIELDS, FIELDS.get('strideFloats')?.value, file);
        }
        if (node.type === 'Literal' && typeof node.value === 'string') {
            checkResource(file, node.value);
            checkSerializedJson(node.value, file);
        }
        if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
            checkResource(file, node.quasis[0].value.cooked ?? '');
            checkSerializedJson(node.quasis[0].value.cooked ?? '', file);
        }
        if (['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'].includes(node.type)) {
            checkCompilerDecoder(node, file);
        }
    });
}

function checkHtml(source, file) {
    for (const MATCH of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
        const ATTRIBUTES = MATCH[1];
        const SCRIPT = MATCH[2].trim();
        const URL = ATTRIBUTES.match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1];
        checkResource(file, URL);
        if (!SCRIPT) {
            continue;
        }
        const TYPE = ATTRIBUTES.match(/\btype\s*=\s*['"]([^'"]+)['"]/i)?.[1];
        if (TYPE === 'application/json' || TYPE === 'importmap') {
            checkJson(JSON.parse(SCRIPT), file);
        } else if (!TYPE || ['module', 'text/javascript', 'application/javascript'].includes(TYPE)) {
            checkScript(SCRIPT, file);
        }
    }
}

function validateVectorArtifacts(root) {
    let checkedFiles = 0;
    function visitDirectory(directory) {
        for (const ENTRY of FS.readdirSync(directory, { withFileTypes: true })) {
            const ABSOLUTE = PATH.join(directory, ENTRY.name);
            const FILE = PATH.relative(root, ABSOLUTE).split(PATH.sep).join('/');
            if (ENTRY.isDirectory()) {
                if (!EXCLUDED_DIRECTORIES.has(FILE) && FILE !== 'tests/output') {
                    visitDirectory(ABSOLUTE);
                }
                continue;
            }
            checkResource(FILE, FILE);
            const EXTENSION = PATH.extname(FILE).toLowerCase();
            if (!SCRIPT_EXTENSIONS.has(EXTENSION) && !['.json', '.html'].includes(EXTENSION)) {
                continue;
            }
            const SOURCE = FS.readFileSync(ABSOLUTE, 'utf8');
            if (SCRIPT_EXTENSIONS.has(EXTENSION)) {
                checkScript(SOURCE, FILE);
            } else if (EXTENSION === '.json') {
                checkJson(JSON.parse(SOURCE), FILE);
            } else {
                checkHtml(SOURCE, FILE);
            }
            checkedFiles++;
        }
    }
    visitDirectory(root);
    return { checkedFiles };
}

module.exports = { validateVectorArtifacts };

if (require.main === module) {
    console.log(JSON.stringify(validateVectorArtifacts(PATH.resolve(__dirname, '..')), null, 2));
}
