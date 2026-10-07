# Adaptive SAP collision comparison

Research-only, 2026-10-07. No production HTML, physics, rate, cutoff, quality, or Worker change.

## Correction and active source path

The previous grid-only characterization of Rally was incomplete. Rally uses general-query/fixed-cell grids **and active adaptive SAP** in its final non-allied ground overlap recovery. The existing spatial-performance.cjs X-interval counts are not an actual SAP benchmark and are not evidence against adaptive SAP.

Pinned reference: [Rally e9a30813](https://github.com/byh-playground/rally-frontier/blob/e9a30813bf0d1b1abfac2b524a49568205cdbd85/index.html#L22036), index.html Git blob 258c43dda704f9b8d89f24de50e505066f28498e. The checked fixture contains the verbatim broadphase prefix through packed-pair sort, and the complete penetration-owner method. Excerpt SHA-256: 48d1559dbd73faf4a5ab2c0cfaff17d365b44cdfd6d7b5fcc617ba404bc655be. Budmori HTML SHA-256: 21602a56ab94c8bd2f4140a1843ef8fec2e4609fe128c7bf56d86d371cb786b3.

Verified call path in that HTML:
- Simulation tick invokes solveContacts at line 22416.
- solveContacts (22125) uses fixed-cell broadphases for swept non-allied surface motion and allied Jacobi/PBD contact correction.
- Each collision iteration then invokes enforceNonAlliedNoOverlap at 22227.
- Its 22036–22113 implementation chooses x/y from variance with 25% hysteresis, reuses insertion-sorted interval order, prunes expired active intervals, filters the other axis, and numerically sorts owner*(n+1)+other packed pairs before correction.
- Runtime SAP arrays initialize/reset in the collision capability (17312–17355); this is live source, not an abandoned candidate.

## Budmori contracts that must remain

- General targeting/range queries use the coarse query grid and are outside this comparison.
- Ordinary troop separation (6532) runs sequentially inside updateUnit, includes allied and opposing bodies of the same air/ground class, observes live positions through historical fine-grid buckets, visits the center cell first, and retains the existing eight-overlap cutoff. Reordering can change both selected neighbors and movement.
- Shared WorldSimulation rebuilds before sequential unit updates (21347–21350) and refreshes the fine grid after them (21352). Static start-of-tick SAP intervals are not sufficient for exact live-query equivalence.
- Leader solveMoaContacts (8244) gathers radius plus maxPairCorrection candidates per pass, appends other human leaders, sorts entity IDs, applies sequential bounded corrections, and reindexes displaced troops. It is a different contract from Rally's global non-allied hard fix. Human leader queries are not timed here.

## Reproduction

Run: SAP_REPORT=tests/adaptive-sap-comparison-results.json node tests/adaptive-sap-comparison.cjs

The pinned excerpt is local: no network or sibling Rally checkout is required. Optional RALLY_HTML=/path/to/index.html extracts and reports another supplied Rally source. SAP_REPEATS (default 12) and SAP_WARMUPS (default 4) control samples. Native engine harness and actual embedded SDK create four valid five-human snapshots: 155 and 1000 companions each, geographically separated or deliberately co-located. Camps are disabled. No dense simulation ticks are run.

All eight uncapped exact-overlap set comparisons passed (four snapshots × two eligibility domains). Additional variance-ratio checks 1.20 → 1.30 → 1.00 → 0.70 produced axes x → y → y → x, confirming the real hysteresis branch.

## Explicit adapters and limits

- All four measured fixtures contain ground bodies; the explicit AIR adapter branch is not separately validated by these samples.

- coordinates: Budmori x/y world-coordinate floats copied to fx/fy with no fixed-point quantization; current moaBodyRadius values copied into Float64Array.
- entities: Live state.units only (troops plus resident entity), preserving array index and entity ID; human leaders excluded.
- eligibility: Projected alive=true; capability lookup returns null, so no burrow/leap/objective flags. Rally lane preserves AIR exclusion and excludes equal Budmori factionId; Budmori lane removes AIR exclusion and includes allied pairs. Both preserve same-layer matching.
- owner: Verbatim Rally nonAlliedPenetrationOwner executes. side is Budmori factionId; NEUTRAL_SIDE maps to wild; start positions equal current snapshot positions so non-neutral pairs select by string-ID tie; fallbackNormal returns [1,0].
- pairOrdering: Original owner*(n+1)+other numeric packing and numeric sort execute. This is adapted broadphase pair ordering, not Budmori visit order or the full Rally solver.
- stopping: Exactly one broadphase pass returns after pair sort; no penetration resolution or sequential live movement.

- Frozen broadphase only, no actual browser, device GPU, full-tick or FPS claim. Every live state.units entry is queried; actual AI may skip separation for some entries. Human leaders are excluded from this troop broadphase comparison.
- Original Rally domain excludes allied and AIR; Budmori lane explicitly includes allies and AIR but keeps same-layer filtering.
- Rally original semantic owner/pair ordering is retained with zero snapshot movement; it is not Budmori visit order.
- Warm timing reuses identical stationary order, an optimistic temporal-coherence bound; cold timing clears order.
- Grid queries keep actual center-first order, self visits, exact radius and optional existing cutoff. SAP emits unique unordered AABB pairs. Both exact overlap sets are compared after normalizing directed/unique differences.
- All timings include current fine-grid refresh, or SAP projection/radii update and actual build/sweep/packed pair sorting. General targeting grid is excluded.
- The grid lane runs the actual refreshMoaContactGrid and nearLocal functions. Uncapped grid enumeration includes exact circle filtering; SAP timing ends at AABB-pair sorting and excludes its circle/narrowphase check. This already favors SAP; it is not a matched full solver timing.
- The existing-cutoff grid lane preserves the original cutoff value; it does not add a new cap. The alternate Rally-domain cutoff lane is diagnostic only, not a claim about Rally gameplay.
- Cold means cleared cached ordering, not fresh allocation of every backing array. Warm frozen order is optimistic compared with moving entities.
- No entire SAP physics branch, continued canonical snapshot/effects parity, browser, or device/FPS result is claimed.

## Budmori eligibility: median native milliseconds

Includes grid refresh+queries, or SAP coordinate/radius projection+build+active sweep+packed pair sort. v24.19.0; 12 measured samples after four warmups; lane order alternates.

| Companions/player | Layout | Grid uncapped | Grid existing cutoff | SAP warm | SAP order-cold | SAP warm projection | SAP warm build | SAP warm sweep | SAP warm pair sort |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 155 | separated | 1.863 | 1.808 | 2.452 | 2.753 | 0.108 | 0.038 | 1.746 | 0.499 |
| 155 | dense | 4.940 | 1.886 | 5.702 | 6.133 | 0.108 | 0.037 | 3.857 | 1.614 |
| 1000 | separated | 26.233 | 14.869 | 44.803 | 48.013 | 1.831 | 0.288 | 33.340 | 8.994 |
| 1000 | dense | 111.069 | 20.894 | 114.062 | 114.206 | 2.085 | 0.362 | 83.834 | 26.314 |

Phase medians do not necessarily sum to the median total. Full samples' p50/p95/p99 summaries and grid build/query times are in the JSON. No cross-machine timing threshold is asserted.

## Counts with matched eligibility

Grid raw visits are directed and include self/layer-rejected records; SAP active-pair checks are unique orientation checks before orthogonal rejection. These are different work counters, not directly interchangeable candidate cardinalities. Exact-overlap sets are normalized to unique unordered index pairs and asserted equal.

| Companions/player | Layout | Grid raw visits | SAP active pair checks | SAP AABB pairs | Exact unique overlaps (both) | Existing-cutoff grid raw visits |
|---|---|---:|---:|---:|---:|---:|
| 155 | separated | 15378 | 22211 | 3204 | 2815 | 14085 |
| 155 | dense | 53973 | 46376 | 8710 | 7205 | 14236 |
| 1000 | separated | 187135 | 443342 | 43099 | 37071 | 69490 |
| 1000 | dense | 670315 | 954974 | 111291 | 90646 | 83688 |

## Separate Rally-like non-allied ground domain

These rows use the same domain on both algorithms. Different eligibility does not establish a Budmori optimization. Separated armies have zero non-allied overlaps; dense armies have real opposing contacts.

| Companions/player | Layout | Exact unique overlaps (both) | Grid uncapped p50 ms | SAP warm p50 ms |
|---|---|---:|---:|---:|
| 155 | separated | 0 | 1.635 | 1.270 |
| 155 | dense | 4390 | 5.182 | 4.677 |
| 1000 | separated | 0 | 20.691 | 24.724 |
| 1000 | dense | 53575 | 104.837 | 94.488 |

## Actual separation-block ordering proof

The test extracts Budmori's exact production separation block and executes it twice on a cloned real snapshot entity: once with the actual nearLocal callback order, once with the generated SAP packed-pair order. This isolates an individual separation operation; it is not a full simulation rewrite.

- 155/player dense, entity 2: grid neighbors [175, 374, 408, 463, 636, 395, 429, 450]; SAP-order neighbors [340, 353, 374, 387, 395, 408, 429, 442]. Actual block output differs by 15.134184 world units.
- 1000/player dense, entity 2: grid neighbors [1018, 2060, 2047, 3003, 4016, 1005, 2026, 1010]; SAP-order neighbors [2026, 2039, 2047, 2060, 3003, 4008, 4016, 1005]. Actual block output differs by 6.574939 world units.

The separated examples change order but not their selected sets or resulting displacement in this isolated operation. Dense cases establish a concrete gameplay difference for the direct ordering swap.

## Recommendation

Keep the general query grid and the current collision visit/cutoff contracts. The literal adapted Rally broadphase has not demonstrated a useful speed advantage for Budmori's current separation workload; even stationary warm ordering includes active-list and pair-sort cost, while the existing grid can stop after its existing eight contacts. Do not transplant Rally's global correction solver or its pair order under a performance-only change.

A SAP cull feeding original nearLocal order could be explored separately, but it must remain conservative as positions change, preserve historical bucket membership and center/cell/list order, and retain the original callback cutoff exactly. This benchmark does not establish such a method's correctness or speed. Any production candidate needs an actual sequential-motion, leader-reindex, restore/replay, canonical-byte and effects comparison before adoption.
