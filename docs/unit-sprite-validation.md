# Sampled unit art validation

This change keeps native SVG players, clocks and sockets authoritative. Only eligible body submissions use a prepared full-frame sprite. Dynamic bosses, coloured palettes, per-triangle clone alpha, dynamic wheat base poses, unprepared expressions and magnification retain vector rendering and are counted. No simulation, input, save or AI rules change.

## Code setting

`CONFIG.render.unitArt` in `src/model/farm-config.js` is the single code setting: `'sprite'` (default) or `'vector'` (retained SVG mesh). Vector mode allocates/bakes no sprite atlas. SVGs remain the source of truth in either mode, and the native player supplies clocks/sockets in both. There is no user UI or URL override. Population fixtures serve this same code setting with one of the two values; they do not use a second rendering implementation. Help iframes remain explicitly native vector previews so each preview does not allocate another full atlas.

The ordinary body's finite manifest uses authored clips with the required idle/walk temperament expressions or action expression, basic palette only, a nominal 96px raster viewBox and 50ms samples (100ms for normalised 1000ms weapon stages). Common idle/walk combinations across all species are prepared first, then windup/fire clips. The 128MiB budget selects the remaining sheets. Budget-rejected combinations retain their actual expression and use vector; playback never starts a new bake. This is not an all-expressions/all-palettes sprite conversion.

The barley comparison exposed an existing overlay bug in both paths: `drawFaceMarks` used the signed X scale for Y. A horizontal mirror put brows above the head. The additional overlay also duplicated brows already authored in selected SVG faces. The final implementation removes that extra geometry altogether, in gameplay and the codex. Element icons and named cheek colours remain. Atlas packing was not the cause.

`selectUnitExpression` in `species-face.js` selects a single authored face. When the state is neutral, temperament 0..4 maps to neutral/focused/attack/surprised/happy (끈기/듬직/발끈/성급/다정). Here `attack` means the SVG face only: a hot-tempered idle unit does not enter an attack or change its body clip. Explicit combat, hurt, airborne, hungry, happy, guard, sleep and death expressions take priority; enemies and growing seedlings do not get the adult temperament mapping. The game, sprite manifest and codex share this selector. Portraits use the SVG metadata show/hide list, retaining every original shape and named fill rather than drawing new brows. Tests cover all ten species and all five temperaments.

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
