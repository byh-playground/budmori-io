# Sampled unit art validation

This change keeps native SVG players, clocks and sockets authoritative. Only eligible body submissions use a prepared full-frame sprite. Dynamic bosses, coloured palettes, per-triangle clone alpha, dynamic wheat base poses, unprepared expressions and magnification retain vector rendering and are counted. No simulation, input, save or AI rules change.

## Code setting

`CONFIG.render.unitArt` in `src/model/farm-config.js` is the single code setting: `'sprite'` (default) or `'vector'` (retained SVG mesh). Vector mode allocates/bakes no sprite atlas. SVGs remain the source of truth in either mode, and the native player supplies clocks/sockets in both. There is no user UI or URL override. Population fixtures serve this same code setting with one of the two values; they do not use a second rendering implementation. Help iframes remain explicitly native vector previews so each preview does not allocate another full atlas.

The ordinary body's finite manifest bakes every authored clip once with the neutral body variant, basic palette only, a nominal 96px raster viewBox and 50ms samples (100ms for normalised 1000ms weapon stages). Faces are not baked: they are the [face layer](./unit-face-layer.md) drawn over the sampled body. Walnut's guard variant, clones and magnification retain native vector rendering and are counted. The 128MiB budget still applies; budget-rejected clips use vector and playback never starts a new bake.

Historical (superseded by the face layer, which maps three body sockets through the live pose): the barley comparison exposed an existing overlay bug in both paths: `drawFaceMarks` used the signed X scale for Y. A horizontal mirror put brows above the head. The additional overlay also duplicated brows already authored in selected SVG faces. The final implementation removes that extra geometry altogether, in gameplay and the codex. Element icons and named cheek colours remain. Atlas packing was not the cause.

`unitLook` in `species-face.js` returns the body variant and the face separately; see [the face layer](./unit-face-layer.md). Temperament 0..4 (느긋/소심/발끈/까불/다정) has its own five faces that show only while no state face applies. Explicit combat, hurt, airborne, hungry, happy, guard, sleep and death states take priority; enemies and growing seedlings do not get the adult temperament face. The game and codex share this selector.

## Contract defined before the new candidate run

The user explicitly accepts microscopic pixel differences between these rendering structures. Pixel maximum/mean values remain diagnostics, including observations above the former worker-defined 8/255 covered-area mean. They are not a calibrated perceptual acceptance test. Native-to-native repeat variation and vector-to-sprite difference are recorded separately.

Automated same-sample checks at a 48px nominal viewBox enforce:

- identical root affine transform within 1e-6, accounting for atlas pixels per SVG unit;
- screen silhouette bounds within two pixels and silhouette intersection/union at least 0.8;
- flat 3x3 native interior mean RGB error at most two byte levels; at boundaries, MSAA and texture filtering differ;
- zero best integer alignment offset;
- actual sprite submissions for supported cases and declared vector fallback for clone/palette/base-pose/magnification cases;
- native repeats retain bounds within one pixel and covered-area mean error at most one byte level.

These guards detect missing geometry, translation, scale and broad colour changes. They do not establish facial-detail quality by themselves. Same-time original/candidate PNGs and nearest-neighbour enlarged eye/mouth/weapon crops require direct visual review. The reviewer may still reject blurred thin details.

The consecutive-time overlap fixture retains independent phases, a normalised barley weapon clip, clone alpha and palette fallback. Native repeat changes are bounded to one percent of ROI channels and one mean byte level; full raw differences are preserved. Sprite appearance at arbitrary times intentionally holds a sampled frame. Native socket values are compared against an independent native player at the exact same local animation time (1e-6), while socket-to-sampled-art displacement is reported separately. Model snapshots remain exact, and reversing painter order must visibly change the overlap fixture.

## Timing and memory

The population fixture uses the real Garden/FarmSession/render path with fixed seed, clock and camera. CPU total includes pulse, presentation and renderer; render/mesh submission/GPU time are separate. DOM/HUD/input and uninstrumented whole-app FPS are outside this boundary. Asynchronous GPU query samples discard disjoint results and preserve missing coverage. CPU and GPU are never added.

Initial SVG compile/atlas preparation is separate from steady playback. Prepared image textures must not be baked or uploaded during steady frames. Numeric pose texture and instance-buffer traffic are measured separately. Retained SVG resources remain resident for authority/fallback. The 128MiB budget covers final atlas images; transient SS4 bake memory and numeric buffers are additional and must be reported. Physical mobile behaviour is unverified.
