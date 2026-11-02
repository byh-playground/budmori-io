// One verified load per pinned GameKit bundle for the whole page: fetch the pinned URL, check its byte count and
// SHA-256 against the runtime manifest in index.html, then import it from a blob URL. The page locale
// (i18n/locale.js, needed by the very first module) and bootstrap share these loads, so no bundle is fetched twice.
const LOADS = new Map();
const IMPORT_URLS = new Set();
let manifest = null;

// The runtime manifest written by scripts/update-runtime-manifest.cjs. Module scripts run after parsing, so the
// JSON element after them in index.html is already there.
export function runtimeManifest() {
    if (!manifest) {
        const ELEMENT = document.getElementById('bloom-runtime-manifest');
        if (!ELEMENT) {
            throw new Error('Runtime manifest is missing');
        }
        manifest = JSON.parse(ELEMENT.textContent);
    }
    return manifest;
}

export function gamekitEntry(name) {
    const ENTRY = runtimeManifest().modules.find((module) => module.name === name);
    if (!ENTRY) {
        throw new Error(`Required gamekit ${name} module is missing from the manifest`);
    }
    return ENTRY;
}

const DIGEST = async (bytes) =>
    Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) =>
        b.toString(16).padStart(2, '0'),
    ).join('');

async function verifiedImport(entry) {
    const RESPONSE = await fetch(entry.url, {
        cache: 'force-cache',
    });
    if (!RESPONSE.ok) {
        throw new Error('Module request failed: ' + RESPONSE.status + ' (' + entry.name + ')');
    }
    const BYTES = await RESPONSE.arrayBuffer();
    if (BYTES.byteLength !== entry.bytes || (await DIGEST(BYTES)) !== entry.sha256) {
        throw new Error('Module integrity failed: ' + entry.name);
    }
    const URL_LOCAL = URL.createObjectURL(
        new Blob([BYTES], {
            type: 'text/javascript',
        }),
    );
    try {
        const EXPORTS = await import(URL_LOCAL);
        IMPORT_URLS.add(URL_LOCAL);
        return {
            exports: EXPORTS,
            verifiedImportURL: URL_LOCAL,
        };
    } catch (error) {
        URL.revokeObjectURL(URL_LOCAL);
        throw error;
    }
}

// `entry` is a manifest module entry ({ name, url, bytes, sha256 }). A failed load is forgotten so a later call
// can try again; startup retry itself is a full page reload.
export function loadGamekitModule(entry) {
    if (!LOADS.has(entry.name)) {
        LOADS.set(
            entry.name,
            verifiedImport(entry).catch((error) => {
                LOADS.delete(entry.name);
                throw error;
            }),
        );
    }
    return LOADS.get(entry.name);
}

// Releases every blob URL. Modules already evaluated keep running; only new imports of those URLs stop working.
export function revokeGamekitModules() {
    for (const URL_LOCAL of IMPORT_URLS) {
        URL.revokeObjectURL(URL_LOCAL);
    }
    IMPORT_URLS.clear();
    LOADS.clear();
}
