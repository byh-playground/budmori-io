# Raid-to-Farm settlement seam

This feature integrates the pure owner-local settlement module with Farm
reservation, Raid roster registration, compare-before-write storage, reward and
progression helpers, save validation, and the return-to-Farm flow. The Raid
world stays deterministic and contains no shared or host wallet.

## Owner-local settlement API

`src/raid-settlement.js` accepts exactly one private Farm snapshot and applies
only original Farm unit IDs from that owner's verified Raid roster. A casualty
remains in that owner's roster with `hp = 0` and `down = 60`; it is temporarily
unavailable rather than lost. Existing Farm rules must also exclude sleeping
units from breeding, merging, and new Raid deployment, and must not revive them
when the Raid's copies are reinstalled. The shared Raid world is never passed
to local storage and never receives another player's private reward or
progression wallet.

The owner-scoped idempotency key is:

`raid:${JSON.stringify([ownerId, sessionId, encounterId])}`

Reuse the same stable Raid session and encounter IDs through reconnects and
retries. The key is passed to the common reward and XP helpers. Persist returned
sleep changes, owner-private rewards/progression, and the receipt as a single
Farm snapshot replacement. A duplicate after reload returns the prior receipt
without replaying deaths or invoking reward/progression logic. Detailed receipts
are capped at 128 entries; the monotonic `raidSettlementWatermark` continues to
block reapplication after older receipt details are compacted.

## Storage reservation and compare-before-write requirements

`reserveRaidRun` reserves one Farm-local sequence and session on a candidate
Farm. It must be committed through the existing FarmStorage compare-before-write
guard **before** a new Raid session starts. If two tabs race from the same Farm
snapshot, only the CAS winner may start; a losing tab must not report success or
open another run. The same Farm cannot host simultaneous Raids. A reconnect to a still-running
session must reuse its stored active session/sequence; it must not create a
fresh run.

Settlement must also be committed with compare-before-write against the stored
active-run Farm revision. Do not show death or reward settlement as successful
until that replacement succeeds. If saving conflicts, keep the original Raid
result and active reservation intact so settlement can be retried against the
latest Farm. Stable reward/XP receipt keys make resolver retries idempotent. If
another tab already committed the result, reload the watermark/receipt and
return that result without changing the Farm again.

The active sequence and session fields are part of the private Farm snapshot,
so they survive reload even though the Raid runtime does not. The app must not
silently resume that reservation as a new fight or automatically discard a
possibly-live Raid in another tab. It blocks continuation until the player
explicitly chooses “end previous Raid and return”; that action writes an
`aborted` recovery receipt with no casualties, rewards, XP, points, or unit
changes, then advances the watermark under the same compare-before-write guard.
An old tab that later tries to settle that run is ignored by the watermark.
Normal in-runtime aborts may still apply verified casualties as 60-second
sleep, but never call the reward seam.

## Shared resolver integration seam

`settleVictory` receives `{ farm, ownerId, sessionId, encounterId, receiptKey,
source: 'raid', deploymentMultiplier }`, where `farm` is a plain private Farm
snapshot. It must return `{ farm: plainFarmSnapshot, summary }`. This snapshot
contract is intentional: `structuredClone` strips class prototypes. An adapter
using a Garden class should explicitly hydrate/restore the snapshot, run the
shared resolver, and return the resulting Garden snapshot. It must never pass
the lockstep Raid world or a shared/host reward wallet to the resolver.

The common Farm boss-reward helper currently accepts numeric encounter IDs and
derives XP idempotency keys from source plus encounter. The post-PR67 adapter
needs a string receipt-key seam so two owners or Raid sessions cannot collide.
Both acquisition receipt persistence and `awardBossKillXp` must use the exact
owner-scoped `receiptKey`; XP remains the shared helper's 100 points per boss
victory with shared level thresholds/points. A retry after a storage conflict
must resolve to the same reward and XP receipt instead of rerolling.

The resolver also needs to accept the Raid `deploymentMultiplier` for boss-unit
acquisition chance only. Farm-event acquisition keeps the common configured
event multiplier and never stacks the Raid deployment bonus. Raid victory XP
is not multiplied. A positive-deployment victory requires the common resolver;
missing it throws before returning any settled Farm/receipt. Zero-deployment
victories cannot earn acquisition/XP. Defeat and abort never call the resolver.

## Confirmed Raid acquisition multiplier

The confirmed Raid-only acquisition multiplier is:

`multiplier = 1 + (availableAtStart - originalUnitsDeployed) / availableAtStart`

It is clamped to `[1, 2]` for positive deployment and returns `0` for an empty
deployment, preventing an empty Raid from earning boss loot. The denominator
is the owner's registered, eligible Farm roster available when the encounter
starts; the numerator counts unique original roster entries deployed at any
point, including units that later die. Battle-only summons do not count. This
yields 1x for deploying the full eligible roster, 1.5x for half, and approaches
2x for smaller deployments. Only acquisition chance is multiplied; confirmed
100 XP per boss victory and the common progression thresholds are unchanged.
The common boss-reward configuration remains the source of the base chance.

## Battle-only pea split units

Only a strict pea split marker is accepted as a temporary Raid summon:
`isBattleOnlySummon === true` and `battleSummonKind === 'pea-death-split'`, with
species 0/tier 1, `canSplit`, `countsTowardPermanentRoster`,
`eligibleForRaidDeployment`, `breedingEligible`, `mergeEligible`, and
`usesPersistentSleep` all false. The parent ID must resolve to a dead, deployed,
original pea of the same owner and Farm ID. Such children are excluded before
original-manifest and casualty reconciliation; malformed or unmarked original
troops still fail validation. Tests cover one original and two split children.

## User-flow verification

The previous per-feature settlement runner has been removed. The maintained
browser suite is launched with `npm test`; its core Farm flow covers Raid entry,
battle, return to the Farm, save, and reload. The contract details above remain
design requirements, but they are not represented as a separate persistent
unit-test suite.

The owner-overlapping Farm ID isolation, CAS reservation/refresh helpers, and
stored return receipt are covered at the unit/module layer. An online browser
check should still exercise an actual two-owner casualty return through the
app and verify each private save independently before the feature is merged.
