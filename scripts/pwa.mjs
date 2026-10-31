// `node scripts/pwa.mjs` writes the web app manifest, icons, share image, sw.js and the <head> tags between the
// bloom-pwa markers; `--check` (part of `npm run check`) only fails when the committed files are out of date.
// The generator is the pinned GameKit dist file vendor/upstream/pwa-build.mjs. Its bytes are checked here against
// the pinned dist manifest, whose hash is the one in gamekit-lock.json, before it is imported.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const SHA256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const LOCK = JSON.parse(readFileSync('gamekit-lock.json', 'utf8'));
const MANIFEST_BYTES = readFileSync('vendor/upstream/manifest.json');
if (SHA256(MANIFEST_BYTES) !== LOCK.manifestSHA256) {
    throw new Error('vendor/upstream/manifest.json does not match gamekit-lock.json manifestSHA256');
}
const GENERATOR = JSON.parse(MANIFEST_BYTES).modules.find((entry) => entry.file === 'pwa-build.mjs');
if (!GENERATOR || SHA256(readFileSync('vendor/upstream/pwa-build.mjs')) !== GENERATOR.sha256) {
    throw new Error('vendor/upstream/pwa-build.mjs does not match the pinned GameKit manifest');
}
const { buildPwa: BUILD_PWA } = await import('../vendor/upstream/pwa-build.mjs');

const { changed: CHANGED } = await BUILD_PWA({
    chromium,
    name: 'budmori · 농장과 커다란 이웃',
    shortName: 'budmori',
    description: '작은 농장을 키워 커다란 이웃에게 도전해요.',
    lang: 'ko',
    icon: 'assets/pwa/icon.svg',
    maskableIcon: 'assets/pwa/icon-maskable.svg',
    share: 'assets/pwa/share.svg',
    themeColor: '#e3ead6',
    backgroundColor: '#e3ead6',
    startUrl: './',
    scope: './',
    siteUrl: 'https://byh-playground.github.io/budmori-io/',
    html: 'index.html',
    // Everything the page reads from this origin to start: the page, the authored ESM and CSS, and the troop SVGs
    // the bootstrap compiles. Pinned GameKit modules are listed in index.html and src/showcase.js and are cached too.
    precache: ['index.html', 'src/**', 'assets/troops/*'],
    out: '.',
    check: process.argv.includes('--check'),
});
console.log(CHANGED.length ? 'PWA files written: ' + CHANGED.join(', ') : 'PWA files up to date');
