import { attackOwnerCanContinue, attackTargetKey, sampleCriticalRoll, strikeCandidates } from './attack-action.js';

// Resolves the strike slots of one melee growth attack that have come due. The species supplies only what differs:
//   recordKey      property of the action that holds its attack record
//   runtime        cache of the record's live AttackAction (see createAttackRuntime)
//   slotGeometry   (record, slot) => sweep volume of that slot
//   attackKind     combat attack kind
//   eventKind      combat event announced once per resolved slot
//   motionTicks    (record) => last motion tick of the active window
//   finishSlot     (record) => slot that carries the finish-rank bonus
//   contextFor     (record, strike, key, isMain) => extra damage-context fields (placed after the base weight fields)
//   afterDamage    optional (world, unit, record, strike, target, damage) => void, run for each target that was hit
export function resolveStrikeSlots(world, unit, action, elapsed, geometry, species) {
    const R = action[species.recordKey];
    if (!R || R.launchTick === null || !attackOwnerCanContinue(world, unit, action, R)) {
        return;
    }
    R.motionTick = Math.min(species.motionTicks(R), Math.max(0, Math.round(elapsed * 20)));
    const A = species.runtime(R).action,
        READY = A.advance(R.launchTick + R.motionTick);
    if (!READY.length) {
        R.attack.lastTick = A.lastTick;
        return;
    }
    for (const S of READY) {
        if (!attackOwnerCanContinue(world, unit, action, R)) {
            break;
        }
        const G = species.slotGeometry(R, S.slot),
            TARGET = world.attackTarget(unit, action),
            PRIMARY = TARGET?.hp > 0 ? TARGET : null;
        let secondary = 0;
        for (const T of strikeCandidates(world, unit, PRIMARY)) {
            if (!attackOwnerCanContinue(world, unit, action, R)) {
                break;
            }
            const MAIN = T === PRIMARY;
            if (!MAIN && secondary >= 4) {
                continue;
            }
            const HIT = geometry.sweep(G.from, G.to, G.radius, G.height, T);
            if (!HIT || !A.claimHit(S.slot, T.id, T.generation)) {
                continue;
            }
            if (!MAIN) {
                secondary++;
            }
            const KEY = attackTargetKey(T.id, T.generation),
                CRITICAL_ROLL = sampleCriticalRoll(world, R, KEY),
                SOURCE = R.source,
                DAMAGE = world.damageCombatTarget(unit, { id: action.id, hit: false }, T, HIT, {
                    attackKind: species.attackKind,
                    suppressBasicProc: !A.claimOnce('basic-proc'),
                    attackContext: {
                        source: unit,
                        sourceKind: SOURCE.sourceKind,
                        attackerStats: SOURCE.attackerStats,
                        damageMultiplier:
                            R.multiplier *
                            (S.weight + (S.slot === species.finishSlot(R) ? 0.08 * R.ranks.finish : 0)) *
                            (MAIN ? 1 : 0.5),
                        ...species.contextFor(R, S, KEY, MAIN),
                        attackPowerMultiplier: SOURCE.attackPowerMultiplier,
                        sourceDamageScale: SOURCE.sourceDamageScale,
                        kind: species.attackKind,
                        strikeIndex: S.slot,
                        buffed: false,
                        sourceStatOverrides: SOURCE.attackerStats,
                        area: true,
                        criticalRoll: CRITICAL_ROLL,
                        hitTargets: null,
                    },
                });
            species.afterDamage?.(world, unit, R, S, T, DAMAGE);
        }
        world.combat(species.eventKind, {
            unit: unit.id,
            actionId: action.id,
            slot: S.slot,
            form: R.form,
            stage: R.shots[S.slot].stage,
        });
    }
    // The plan and start tick are immutable after launch. Keep their original
    // transport copy and synchronize only consumed slots and mutable claims.
    R.attack.nextSlot = A.nextSlot;
    R.attack.lastTick = A.lastTick;
    R.attack.cancelled = A.cancelled;
    for (const S of READY) {
        R.attack.hits[S.slot] = [...A.hits[S.slot]];
    }
    R.attack.claims = [...A.claims];
}

// The melee-contact defaults (wheat, barley, rice); peanut and walnut override what differs.
export function strikeSpecies(species) {
    return Object.freeze({
        motionTicks: (record) => Math.round(record.durationSeconds * 20),
        finishSlot: (record) => record.shots.length - 1,
        contextFor: (record, _strike, key) => ({ criticalChanceSnapshot: Reflect.get(record.criticalChances, key) }),
        ...species,
    });
}
