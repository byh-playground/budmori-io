# Unit sprite render comparison

Source: `b8c7b1695fec47e210a1c59f761b33f183eae392`, clean=true. Chromium 153.0.8010.12; NVIDIA GTX1660Ti/D3D11; 1100×850, DPR 1.

CPU total = session pulse + presentation + renderer. Render and submit are subsets; GPU is measured separately. These are not whole-app FPS numbers. Two orders, 24 warmup +60 measured frames per run. Quantiles are nearest rank over 120 frames; per-run tails/raw samples are in the JSON.

| Scene / owned units | Path   | CPU total p50/p95 | Render p50/p95/p99 | Submit p50/p95 | GPU p50/p95/p99   | Draw p50 | Sprite bodies |
| ------------------- | ------ | ----------------- | ------------------ | -------------- | ----------------- | -------- | ------------- |
| farm 100            | vector | 14.50/19.10       | 9.70/12.90/15.50   | 1.80/2.90      | 2.65/4.57/5.77    | 123      | 0.0%          |
| farm 100            | sprite | 15.80/19.80       | 10.20/13.10/16.30  | 2.20/3.30      | 2.33/4.39/5.88    | 113      | 99.8%         |
| farm 500            | vector | 51.00/58.70       | 25.70/31.60/34.10  | 10.90/12.80    | 14.08/18.20/22.56 | 486      | 0.0%          |
| farm 500            | sprite | 48.80/56.40       | 22.90/27.30/30.70  | 9.80/11.70     | 12.59/15.91/19.60 | 480      | 100.0%        |
| farm 1000           | vector | 95.80/109.30      | 44.90/49.90/55.60  | 21.70/24.70    | 27.95/32.67/42.35 | 939      | 0.0%          |
| farm 1000           | sprite | 88.50/97.80       | 39.10/44.70/46.10  | 19.00/21.60    | 25.49/29.37/34.17 | 935      | 99.9%         |
| tower battle 100    | vector | 16.10/21.40       | 10.10/13.30/36.30  | 2.60/3.40      | 6.93/10.34/12.74  | 145      | 0.0%          |
| tower battle 100    | sprite | 16.80/21.30       | 10.40/13.70/42.50  | 2.70/3.60      | 6.14/8.34/10.98   | 138      | 90.2%         |
| tower battle 500    | vector | 59.50/86.80       | 32.70/49.70/67.50  | 11.90/13.80    | 29.56/43.69/47.42 | 614      | 0.0%          |
| tower battle 500    | sprite | 59.40/79.80       | 31.20/49.80/73.00  | 11.10/14.00    | 27.46/33.78/45.29 | 610      | 90.6%         |

Prepared 421 combinations; 360 sheets fit the unchanged 128 MiB image budget. Final atlas images=127.91MiB. Preparation CPU range=3631.0–3736.4ms; this is atlas preparation, not total cold SVG/module startup. SVG compile CPU was not separately measured.

Observed simultaneous logical texture allocation peak=152.78MiB, including numeric textures. This excludes default framebuffer, driver caches, DOM images and buffers; it is not physical VRAM. Retained SVG meshes remain for fallback/authority.

All measured cells have zero repeated image uploads, zero bake draws and zero SVG loader calls. Position/instance/numeric pose updates are not zero. GPU validity and every fallback count remain in JSON. Model final hashes and combat per-frame hashes are asserted identical between rendering modes. Frames retain painter order; no species/frame reordering is used.

Large SS4 initial preparation and memory are costs. Raster filtering softens thin details at enlargement; samples hold frames. Dynamic bosses, coloured palettes, clone triangle alpha, dynamic base pose, magnification and unprepared/budget combinations remain native. Physical mobile is unverified. See [validation contract](../unit-sprite-validation.md) and [resource audit](../unit-resource-audit.md).

## Interpretation and validation

`CONFIG.render.unitArt` defaults to `'sprite'`; `'vector'` selects retained SVG mesh rendering and prepares zero sprite atlas images. No UI or URL toggle exists. SVGs, state selection, clocks and authoritative sockets are shared. The baseline above uses this same corrected body/face implementation and SDK, isolating the rendering choice rather than claiming a before/after improvement over all old-main code.

The benefit is workload-dependent. At 100 units, sprite CPU render median is slightly worse. At 500 battle units, CPU render p95 is essentially unchanged (49.7→49.8ms), and p99 worsens (67.5→73.0ms). In the reverse-order battle 500 run, GPU p95 also worsens (36.65→39.95ms), despite the lower pooled GPU p95. These short windows do not establish universal tail-latency improvement. Per-run values and every sample are retained in the JSON. CPU and GPU are not summed; RAF intervals include browser wait and fixture work, not whole-app FPS.

All 1,200 GPU timer samples are valid; disjoint/unsupported/pending samples would remain marked and excluded from GPU quantiles, never inserted as zero. No actors were culled in these fixed scenes. Farm 100/500/1000 body sprite submission coverage is 99.8/100/99.9%; battle 100/500 coverage is 90.2/90.6%, with native bosses separate. The explicit budget/unprepared-expression reasons remain in the report; this is not an all-unit/all-expression sprite conversion. Battle stops at the current 500-unit frontline cap.

Both orders used the same seed, source, viewport 1100×850, DPR 1,camera and simulation timestamps. Required local checks passed: `npm run check`, `npm run verify:upstream`, `test:unit-sprites`, `test:source-smoke`, `test:seedling-motion`, `test:graphics-recovery`, `npm test`, `test:breed-allocation`, `test:hud-sampling` and `test:palette`. The palette suite uses SwiftShader for functional pixels/mobile touch emulation; the render comparison uses the actual GTX1660Ti/D3D11. Physical mobile remains untested.

SDK 0.19.8 is pinned to source 42ebe23125718f847e78a9b69f257d4425b2d64c and immutable dist a0418c9bcf62f71297d098f4667b49fc9d19436f. Final image storage is 127.91 MiB under the unchanged 128 MiB budget; logical texture peak 152.78 MiB includes transient SS4 and numeric allocations, excluding physical framebuffer/driver/DOM overhead. Vector mode avoids that atlas cost. The nine species' missing action-cheek geometry is intentionally left unchanged as an original art-design decision for a separate follow-up; this PR never restores a procedural cheek overlay.
