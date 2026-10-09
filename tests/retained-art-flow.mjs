import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

// Actual game art / WebGL contract probe. Production RAF, input and authority
// keep running between gallery frames. This is not an input-latency or FPS test.
// The caller owns browser launch, SDK fixtures, integrity and full-scene parity.
export async function exerciseRetainedArt(page, {screenshotPath} = {}) {
  const result = await page.evaluate(async takeScreenshot => {
    const context = globalThis.__testWorldRenderer;
    const art = globalThis.RallyArt;
    if (!context?.isBloomWebGL || !art?.draw) throw new Error('Actual world WebGL renderer and RallyArt required');
    const gl = context.gl, canvas = context.canvas;
    const width = canvas.width, height = canvas.height;
    const columns = 6, rows = 4;
    const cellWidth = Math.floor(width / columns), cellHeight = Math.floor(height / rows);
    if (cellWidth < 40 || cellHeight < 40) throw new Error('Gallery requires at least 240×160 framebuffer pixels');
    const types = [...art.types];
    if (types.length !== 24 || new Set(types).size !== 24) throw new Error('Expected all 24 distinct army species');
    const radius = Math.min(cellWidth, cellHeight) / 10;
    const animated = ['dandelion', 'mage', 'pillbug', 'flowerbee', 'sporemoth', 'siege', 'shelltitan'];
    const teams = ['friendly', 'enemy', 'neutral'];
    const background = [9 / 255, 14 / 255, 19 / 255, 1];
    const samples = [], warmup = [];
    let firstPixels = null;
    let galleryPNG = null;

    function paint(timeMs, deployProgress, attackProgress, measured) {
      if (canvas.width !== width || canvas.height !== height) throw new Error('Gallery framebuffer resized during sampling');
      if (!context.beginFrame()) throw new Error('World renderer could not begin gallery frame');
      context.save();
      let pixels, frame;
      try {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalAlpha = 1;
        context.filter = 'none';
        context.device.clear({color: background});
        for (let i = 0; i < types.length; i++) {
          const x = (i % columns + .5) * cellWidth;
          const y = (Math.floor(i / columns) + .5) * cellHeight;
          context.save();
          try {
            // Fixed root transforms and paint state cannot create a false
            // animation witness. Only authored time / continuous poses vary.
            context.translate(x, y);
            context.rotate((i % 5 - 2) * .12);
            context.globalAlpha = i % 2 ? .7 : 1;
            art.draw(context, types[i], teams[i % teams.length], 0, 0,
              radius, -.9, timeMs, {
                attack: true, attackProgress, deployProgress, deployed: false,
                phaseOffsetMs: i * 37,
                hullFacing: -.6, turretFacing: -1.8,
                gradeOutline: i % 3 === 0 ? '#f5b94e' : null,
                whiteFlash: i === 0,
                poseStretch: i % 2 ? 1.08 : 1,
              });
          } finally { context.restore(); }
        }
        // Flush BOTH retained meshes and immediate vectors before readback.
        context.flush();
        pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        if (takeScreenshot && measured && timeMs === 641) galleryPNG = canvas.toDataURL('image/png');
        const error = gl.getError();
        if (error !== gl.NO_ERROR) throw new Error('Gallery WebGL readback error: ' + error);
      } finally {
        context.restore();
        frame = context.endFrame();
      }
      const mesh = frame.mesh;
      if (!mesh || mesh.state !== 'ready') throw new Error('Retained mesh renderer is not ready');
      const cache = art.stats().meshes;
      const cells = types.map((type, i) => {
        const left = i % columns * cellWidth + 3;
        const top = Math.floor(i / columns) * cellHeight + 3;
        let visible = 0, changedFromFirst = 0, hash = 2166136261 >>> 0;
        for (let y = top; y < top + cellHeight - 6; y++) {
          for (let x = left; x < left + cellWidth - 6; x++) {
            const at = ((height - 1 - y) * width + x) * 4;
            const distance = Math.abs(pixels[at] - 9) + Math.abs(pixels[at + 1] - 14) + Math.abs(pixels[at + 2] - 19);
            if (distance > 40) visible++;
            if (firstPixels && Math.abs(pixels[at] - firstPixels[at]) + Math.abs(pixels[at + 1] - firstPixels[at + 1]) + Math.abs(pixels[at + 2] - firstPixels[at + 2]) > 12) changedFromFirst++;
            for (let channel = 0; channel < 4; channel++) hash = Math.imul(hash ^ pixels[at + channel], 16777619) >>> 0;
          }
        }
        return {type, visible, changedFromFirst, hash};
      });
      const sample = {timeMs, deployProgress, attackProgress, cells, mesh, cache,
        drawCalls: frame.drawCalls, vertices: frame.vertices};
      if (measured) {
        samples.push(sample);
        firstPixels ??= pixels;
      } else warmup.push(sample);
    }

    // Every gallery frame is a real RAF task. No timer overrides, manual
    // authority ticks, suspended driver or synthetic simulation advancement.
    for (const pose of [
      [0, .05, .13, false], [83, .25, .31, false],
      [0, .05, .13, true], [83, .25, .31, true],
      [257, .55, .63, true], [641, .95, .91, true],
    ]) {
      await new Promise((resolve, reject) => requestAnimationFrame(() => {
        try { paint(...pose); resolve(); } catch (error) { reject(error); }
      }));
    }
    return {kind: 'actual world WebGL retained-art gallery; not FPS or baseline pixel parity',
      width, height, radius, attributes: gl.getContextAttributes(), types, animated, warmup, samples, galleryPNG};
  }, Boolean(screenshotPath));
  if (screenshotPath) {
    assert.ok(result.galleryPNG?.startsWith('data:image/png;base64,'), 'Actual gallery pixels captured before browser composition clears the framebuffer');
    await writeFile(screenshotPath, Buffer.from(result.galleryPNG.split(',')[1], 'base64'));
  }
  delete result.galleryPNG;

  assert.equal(result.types.length, 24);
  assert.equal(result.samples.length, 4);
  for (const sample of [...result.warmup, ...result.samples]) {
    assert.ok(sample.drawCalls > 0, 'Gallery submits real GPU draw calls');
    assert.ok(sample.mesh.instances >= 24, 'Every species submits retained mesh instances');
    assert.ok(sample.cache.meshes <= 384 && sample.cache.bytes <= 24 * 1024 * 1024,
      'Army cache stays within 384 meshes / 24MiB');
    for (const cell of sample.cells) assert.ok(cell.visible > 10,
      `${cell.type} has visible pixels at time ${sample.timeMs}: ${JSON.stringify(cell)}`);
  }
  for (const sample of result.samples) {
    assert.equal(sample.mesh.geometryUploads, 0, 'Warm continuous poses never upload new geometry');
    assert.equal(sample.mesh.geometryBytesUploaded, 0, 'Warm gallery geometry upload bytes are zero');
  }
  for (const type of result.animated) assert.ok(result.samples.slice(1).some(sample =>
    sample.cells.find(cell => cell.type === type).changedFromFirst > 3),
  `${type} animates in actual pixels with fixed root transform / paint state`);
  return result;
}
