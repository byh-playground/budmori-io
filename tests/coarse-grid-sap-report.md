# Coarse-grid adaptive SAP: full-game research

Status: draft experiment; production `index.html` and SDK are unchanged. Real Chromium and five-peer CI evidence is pending. Do not interpret this draft as a production optimization or a device-FPS result.

## Scope and source

Baseline is merged main `c0093a22dd891835a9858fe864eb10c46fd19248`, tree `962ae5727dcc060905dcc3e1b0277bfb3ab07f81`, HTML SHA-256 `21602a56ab94c8bd2f4140a1843ef8fec2e4609fe128c7bf56d86d371cb786b3`. The prior Rally source and active SAP call path are pinned in `adaptive-sap-comparison-report.md` and its checked excerpt.

Unlike the earlier frozen comparison, this experiment allows old placement/order to change and executes the actual moving game, full adapter tick, narrowphase, correction and terrain constraints. Same-version peers, rollback and restored snapshots must still agree exactly. No Worker, entity cap, AI-frequency reduction, visual reduction or new neighbor cutoff is introduced. The existing `CONFIG.motion.separationMaxNeighbors` remains the solver budget, not a broadphase completeness limit.

## What was implemented

- Existing optimized grid and its 32/64/128/256 cell controls.
- Complete centroid-grid pair enumeration with a radius-aware neighboring-cell halo.
- Global adaptive SAP.
- Full-AABB multi-cell grid at 32/64/128/256, with per-cell x/y variance selection, 25% axis hysteresis, coherent insertion order and complete native-sort fallback.
- Canonical ownership by the lowest shared AABB cell, avoiding duplicate pairs and missed large-body/boundary contacts. No fixed one-cell-radius assumption.
- Deterministic stable-ID pair order, reusable radii/records/arrays and unsigned radix sorting for larger pair lists.
- A batched 32-grid control that computes the existing directional separation on a frozen post-movement grid, then applies corrections.

The pair variants enumerate all AABB contacts (or optionally all exact circle contacts), run narrowphase, and resolve each unordered pair once while accounting for both endpoints' existing eight-neighbor budgets. Static/ineligible bodies remain obstacles. Marker placement preserves the original ordinary-branch eligibility, including stun, undeploy, pending melee, sleeping wild and special attack paths. Correction uses the final swept terrain implementation. The existing post-phase leader solver and its refresh remain intact.

The global phase changes gameplay ordering: all ordinary movement precedes separation, and a leash crossing due to correction may be noticed next tick. This is not old-trajectory parity. Movement presentation is adjusted for correction. Grid-only and pair variants can evolve different crowd distributions, so final population and penetration quality are measured separately.

Candidate-only version sealing updates SDK sessions, prepared snapshot context checks, diagnostics and public room versions/keys. Equivalent pair broadphases share a version; batched-grid cell sizes have distinct versions. Disk/graph formats stay unchanged because serialization layout has not changed. Old session versions cannot prepare candidate snapshots. Candidate HTML is generated only into ignored test artifacts; no experimental flags enter production.

## Actual scale

Five humans with 1,000 companions each produce 5,001 unit records, excluding human leaders. Initial collision radius min/median/max is 7.72 / 11.58 / 12.16 world units. The current 32 cell is about 1.4 median diameters. Initial occupied fine cells are 987 with median occupancy 2 and maximum 28; at 128 they are 95 with median 53 and maximum 100. This makes 2×/4×/8× enlargement meaningful rather than a tiny tuning change.

## Exploratory native results

Node 24.19.0 actual HTML/SDK in native V8, five humans, 10 TPS, all 5,001 bodies preserved in separated-army tests. No renderer/network/device-FPS claim. These tables describe recorded exploratory generator revisions; source hashes are retained in `coarse-native-results.json`. Subsequent compatibility/presentation/fine-grid cleanup is validated by CI against the final generated SHA. Do not substitute these numbers for that final browser run.

Grid enlargement alone, live full ticks (40 measured samples after 10 warmups, stage wrappers included):

| Cell | Full tick p50 ms | p95 ms |
|---|---:|---:|
| 32 | 116.16 | 128.89 |
| 64 | 112.62 | 141.70 |
| 128 | 125.65 | 160.44 |
| 256 | 148.21 | 166.75 |

Longer live trajectories, 70 measured after 30 warmups:

| Solver | Full tick p50 ms | p95 ms |
|---|---:|---:|
| Existing grid | 110.66 | 156.01 |
| Batched grid 32 | 107.15 | 132.02 |
| Batched grid 64 | 110.64 | 204.40 |
| Coarse SAP 64 | 114.50 | 197.39 |
| Coarse SAP 128 | 107.84 | 131.24 |

Twenty matched-start moving snapshots, uninstrumented broadphase, whole adapter tick including solver/terrain but excluding restore/setup and final validation:

| Solver | Full tick p50 ms | p95 ms |
|---|---:|---:|
| Existing grid | 125.39 | 334.97 |
| Batched grid 32 | 116.55 | 174.64 |
| Global SAP | 141.24 | 196.10 |
| Coarse SAP 64 | 149.10 | 246.59 |
| Coarse SAP 128 | 119.33 | 170.04 |
| Coarse SAP 256 | 126.70 | 195.60 |

Matched-start restore activity, shared process/JIT/heap and host load make these tails noisy. All pair lanes produced the same resulting authority hash for each starting snapshot. Coarse 128 is a better SAP size here than 32/64 or global SAP; it is not yet a demonstrated best production choice. Dense PvP outcomes lose units rapidly, so their later medians cannot establish an algorithm speedup and are not used in these speed tables.

## Allocation and collision quality

Separate instrumented profiles use 20 warmup plus 60 moving ticks, five × 1,000, all 5,001 bodies alive. Sampling includes collected objects when supported. Allocation totals are estimates, retained growth is forced-GC heap change, and instrumented time is not used as benchmark time.

| Metric | Existing grid | Coarse SAP 128 | Batched grid 32 |
|---|---:|---:|---:|
| Estimated steady allocation MB | 1,316 | 1,612 | 1,402 |
| Final forced-GC heap MB | 41.7 | 49.1 | 46.0 |
| Steady retained growth MB | 0.23 | 0.77 | 0.41 |
| Observed peak heap MB | 107.5 | 154.6 | 129.5 |
| Minor collections | 19 | 22 | 20 |
| Final exact overlaps | 47,663 | 65,686 | 49,638 |
| Mean normalized penetration | 0.335 | 0.373 | 0.335 |

The coarse solver has 37.8% more overlaps and 69.1% more overlaps deeper than half the radius sum than baseline. The batched control has 4.1% more overlaps with essentially the same mean depth and slightly lower p95 depth. These are same-player crowd contacts; human leaders are excluded from this read-only quality count. The existing game already permits troop overlap; no zero-overlap guarantee is invented.

The first coarse raw profiles were overwritten by an interrupted repeat. Original summary numbers remain; replacement raw files are explicitly supplemental, not evidence for those original totals. The later quality-only replay records its distinct generator SHA, with no unsupported claim of matching an unrecorded historical final hash.

Initial recommendation: do not ship the coarse pair solver on this evidence. Its small native speed difference does not compensate for worse allocation and crowd penetration. The simpler batched-grid control remains a browser-validation candidate, not a selected default. The 80 ms p95 goal is not established.

## Verification and reproduction

- `node tests/coarse-pair-enumerator.cjs`: 1,814 brute-force checks including large/negative/corner boundaries, AIR, movement, spawn/death, shuffled input, cold caches, duplicate-free pairs and uint32 radix values above the signed boundary.
- `node tests/coarse-collision-validation.cjs --experimental`: actual-engine canonical/effect continuation, cold load, warm graph replacement, rollback cache, behavioral eligibility, neighbor budget, coincident bodies, terrain, airborne support and disk/version compatibility.
- `node tests/coarse-write-candidates.cjs`: exact candidate HTML and SHA manifest.
- `node tests/shared-world.cjs tests/collision-artifacts/coarse-128.html` and the batched file: passed the real game/SDK five-human campaign with deterministic byte-transport fixture, admission, owner-attributed commands, death/recovery, restore, input replay, coordinator leave and fail-closed partition. This native test is not real WebRTC.
- `node tests/coarse-grid-live-sweep.cjs`, `node tests/coarse-pair-live-sweep.cjs`, `node tests/coarse-matched-ticks.cjs`: full native controls and matched workloads.
- `node --expose-gc tests/coarse-cpu-memory.cjs --mode coarse --cell 128 --exact false --out-prefix tests/profiles/coarse128`: CPU/allocation/retained-memory capture; see `--help` for baseline, batched and quality-only replay.
- `node tests/coarse-browser-performance.mjs`: real Chromium low/high population matrix (10/155/1000 per human), serial isolated contexts and reversed order repeat; manual full ticks and WebGL CPU submission are separately measured.
- CI runs five real Chromium/WebRTC peers for both finalists using the existing multiplayer E2E. Browser verification is pending; local browser socket creation is unavailable in this execution environment.
