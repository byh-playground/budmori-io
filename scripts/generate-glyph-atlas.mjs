#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'index.html');
const outputPath = path.join(root, 'scripts', 'assets', 'world-glyph-atlas.json');
const packageManifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const FONT_FAMILY = 'Noto Sans KR';
const FONT_SIZE = 32;
const UNITS_PER_EM = FONT_SIZE;
const CELL = 48;
const ATLAS_WIDTH = 2016;
const COLUMNS = ATLAS_WIDTH / CELL;
const PADDING = 6;
const FONT = `700 ${FONT_SIZE}px "${FONT_FAMILY}"`;

function extractCorpus(html) {
  // Keep Korean-bearing JavaScript string/template chunks from the current game
  // source. This intentionally includes static UI copy as a safety superset of
  // the labels, combat feedback, fusion results, and mineral gains emitted in
  // the world. Interpolated expressions are dynamic, so include printable
  // ASCII and the renderer's explicit non-ASCII combat/reward symbols below.
  const chunks = [];
  const literal = /'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|`((?:\\.|[^`\\])*)`/gs;
  const nonAscii = new Set();
  for (const match of html.matchAll(literal)) {
    const value = match[1] ?? match[2] ?? match[3];
    for (const character of value) if (character.codePointAt(0) > 0x7f) nonAscii.add(character);
    if (/[\uac00-\ud7a3]/u.test(value)) chunks.push(value.replace(/\$\{[^{}]*\}/g, ''));
  }
  if (!chunks.length) throw new Error('No Korean-bearing source literals found in index.html');

  const chars = new Set([...chunks.join('')]);
  for (const match of html.matchAll(/[\uac00-\ud7a3]/gu)) chars.add(match[0]);
  for (const character of nonAscii) chars.add(character);
  for (let code = 0x20; code <= 0x7e; code++) chars.add(String.fromCodePoint(code));
  for (const char of '−…·◇⛨✓◆◈×⇄→←↑↓') chars.add(char);
  return { chunks, chars: [...chars].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)) };
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function packMask(mask) {
  const packed = [];
  for (let i = 0; i < mask.length;) {
    let run = 1;
    while (run < 130 && i + run < mask.length && mask[i + run] === mask[i]) run++;
    if (run >= 4) {
      packed.push(0x80 | (run - 3), mask[i]); i += run; continue;
    }
    const start = i; i += run;
    while (i < mask.length && i - start < 128) {
      let nextRun = 1;
      while (nextRun < 4 && i + nextRun < mask.length && mask[i + nextRun] === mask[i]) nextRun++;
      if (nextRun >= 4) break;
      i += nextRun;
    }
    packed.push(i - start - 1, ...mask.subarray(start, i));
  }
  return Uint8Array.from(packed);
}

const html = await readFile(sourcePath, 'utf8');
const sourceForGlyphCorpus = html.replace(/<script\b(?=[^>]*\bid="bloom-world-glyph-atlas")(?=[^>]*\btype="application\/json")[^>]*>[\s\S]*?<\/script>/, '<script id="bloom-world-glyph-atlas" type="application/json">GENERATED_ATLAS</script>');
const { chunks, chars } = extractCorpus(sourceForGlyphCorpus);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const raster = await page.evaluate(async ({ chars, font, fontFamily, fontSize, cell, columns, padding }) => {
    await document.fonts.load(font, '가나다ABC123');
    if (!document.fonts.check(font, '가나다ABC123')) {
      throw new Error(`Required local font is unavailable: ${fontFamily}`);
    }
    const rows = Math.ceil(chars.length / columns);
    const canvas = document.createElement('canvas');
    canvas.width = columns * cell;
    canvas.height = rows * cell;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas2D is unavailable in the local generator browser');
    context.font = font;
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    context.fillStyle = '#fff';
    context.clearRect(0, 0, canvas.width, canvas.height);
    const fontMetrics = context.measureText('한Ag');
    const ascent = fontMetrics.actualBoundingBoxAscent || fontSize * 0.8;
    const descent = fontMetrics.actualBoundingBoxDescent || fontSize * 0.2;
    const glyphs = Object.create(null);
    const missing = [];

    for (let index = 0; index < chars.length; index++) {
      const char = chars[index];
      const x = (index % columns) * cell;
      const y = Math.floor(index / columns) * cell;
      const metrics = context.measureText(char);
      const left = metrics.actualBoundingBoxLeft || 0;
      const glyphAscent = metrics.actualBoundingBoxAscent || 0;
      const glyphDescent = metrics.actualBoundingBoxDescent || 0;
      const baselineX = x + padding + Math.max(0, left);
      const baselineY = y + padding + Math.max(ascent, glyphAscent);
      const hasInkExpected = !/^\s$/u.test(char);
      context.fillText(char, baselineX, baselineY);
      const sample = context.getImageData(x, y, cell, cell).data;
      let minX = cell, minY = cell, maxX = -1, maxY = -1;
      for (let py = 0; py < cell; py++) for (let px = 0; px < cell; px++) {
        if (sample[(py * cell + px) * 4 + 3] === 0) continue;
        minX = Math.min(minX, px); minY = Math.min(minY, py);
        maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
      }
      if (hasInkExpected && maxX < 0) missing.push(char.codePointAt(0));
      const inkWidth = maxX < 0 ? 0 : maxX - minX + 1;
      const inkHeight = maxY < 0 ? 0 : maxY - minY + 1;
      glyphs[`U+${char.codePointAt(0).toString(16).toUpperCase()}`] = {
        x: maxX < 0 ? 0 : x + minX,
        y: maxY < 0 ? 0 : y + minY,
        width: inkWidth,
        height: inkHeight,
        advance: Math.round(metrics.width * 1000) / 1000,
        bearingX: maxX < 0 ? 0 : minX - padding,
        bearingY: maxY < 0 ? 0 : baselineY - (y + minY),
      };
      // Clear each temporary glyph cell so its transparent pixels remain zero.
      // The final atlas is copied from this one deterministic canvas.
    }
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const mask = new Uint8Array(canvas.width * canvas.height);
    for (let i = 0; i < mask.length; i++) mask[i] = image.data[i * 4 + 3];
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < mask.length; offset += chunkSize) binary += String.fromCharCode(...mask.subarray(offset, Math.min(mask.length, offset + chunkSize)));
    return {
      width: canvas.width, height: canvas.height,
      maskBase64: btoa(binary), glyphs, missing,
      ascent: Math.round(ascent * 1000) / 1000,
      descent: Math.round(descent * 1000) / 1000,
      browser: navigator.userAgent,
      fontStatus: document.fonts.check(font, '가나다ABC123'),
      fontMetrics: { ascent: fontMetrics.actualBoundingBoxAscent, descent: fontMetrics.actualBoundingBoxDescent },
    };
  }, { chars, font: FONT, fontFamily: FONT_FAMILY, fontSize: FONT_SIZE, cell: CELL, columns: COLUMNS, padding: PADDING });

  const mask = Buffer.from(raster.maskBase64, 'base64');
  const packedMask = packMask(mask);
  const sourceBytes = Buffer.from(sourceForGlyphCorpus, 'utf8');
  const missingCodePoints = raster.missing.map(codePoint => `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`);
  const hangulCount = chars.filter(char => /[\uac00-\ud7a3]/u.test(char)).length;
  const asset = {
    format: 'budmori-glyph-atlas-v2-r8-packbits',
    generatedBy: 'scripts/generate-glyph-atlas.mjs',
    provenance: {
      source: 'index.html',
      sourceSHA256: sha256(sourceBytes),
      corpusPolicy: 'Unique code points from every Hangul syllable in index.html plus Korean-bearing JavaScript string/template chunks (a deliberate superset of world labels, combat feedback, fusion results, and mineral gains), printable ASCII, and explicit renderer/reward symbols.',
      includedWorldText: ['world labels', 'combat feedback', 'fusion results', 'mineral gains'],
      koreanBearingLiteralCount: chunks.length,
      uniqueCodePointCount: chars.length,
      uniqueHangulSyllableCount: hangulCount,
      uniquePrintableAsciiCount: 95,
      font: {
        family: FONT_FAMILY,
        style: '700 normal; white fill mask; geometric outline is generated by GlyphAtlas at runtime',
        sizePixels: FONT_SIZE,
        localOnly: true,
        license: 'Noto Sans KR is distributed under the SIL Open Font License 1.1; the generator loads the locally installed font and performs no network requests.',
        licenseSource: 'https://github.com/notofonts/noto-cjk',
        fontAvailableInBrowser: raster.fontStatus,
        browserFontMetrics: raster.fontMetrics,
      },
      generatorRuntime: { playwrightVersion: packageManifest.devDependencies.playwright, browser: raster.browser },
    },
    atlas: {
      width: raster.width,
      height: raster.height,
      packing: { cellPixels: CELL, columns: COLUMNS, fontPixels: FONT_SIZE, paddingPixels: PADDING, order: 'ascending Unicode code point' },
      unitsPerEm: UNITS_PER_EM,
      ascent: raster.ascent,
      descent: raster.descent,
      colorFormat: 'R8 glyph coverage mask; renderer expands to white RGBA bytes at startup',
      maskDecodedBytes: mask.byteLength,
      maskSHA256: sha256(mask),
      codec: 'PackBits RLE: literal token 0..127 is token+1 bytes; run token 128..255 repeats next byte (token&127)+3 times',
      packedMaskBytes: packedMask.byteLength,
      packedMaskSHA256: sha256(packedMask),
      base64EncodedBytes: packedMask.byteLength,
      base64Characters: Math.ceil(packedMask.byteLength / 3) * 4,
      runtimeRgbaBytes: mask.byteLength * 4,
    },
    glyphs: raster.glyphs,
    missingCodePoints,
    packedMaskBase64: Buffer.from(packedMask).toString('base64'),
  };
  let finalOutput;
  asset.atlas.encodedJsonBytes = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    finalOutput = Buffer.from(`${JSON.stringify(asset)}\n`, 'utf8');
    if (asset.atlas.encodedJsonBytes === finalOutput.byteLength) break;
    asset.atlas.encodedJsonBytes = finalOutput.byteLength;
  }
  finalOutput = Buffer.from(`${JSON.stringify(asset)}\n`, 'utf8');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, finalOutput);
  console.log(JSON.stringify({
    output: path.relative(root, outputPath),
    sourceSHA256: asset.provenance.sourceSHA256,
    packedMaskSHA256: asset.atlas.packedMaskSHA256,
    characters: chars.length,
    hangul: hangulCount,
    koreanBearingLiterals: chunks.length,
    missingCodePoints,
    dimensions: `${raster.width}x${raster.height}`,
    decodedMaskBytes: mask.byteLength,
    runtimeRgbaBytes: asset.atlas.runtimeRgbaBytes,
    packedMaskBytes: packedMask.byteLength,
    base64Characters: asset.atlas.base64Characters,
    encodedJsonBytes: finalOutput.byteLength,
    font: `${FONT} (${raster.browser})`,
  }, null, 2));
} finally {
  await browser.close();
}
