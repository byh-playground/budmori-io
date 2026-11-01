import { captureStatCard, visitTowerCards, runStatModifiers } from '../tower/tower-run.js';
import { baseUnitStatsFor, applyStatModifier } from '../units/unit-stats.js';

// Explicit checkpoint boundary for 0.67.2–0.67.5. Disk farm saves contain no
// active climb. Remove this archive when importing these checkpoints is retired.
const PREVIOUS_EFFECTS = Object.freeze({
    'attack-flat': { stat: 'attackPower', mode: 'basePct', values: [0.1, 0.15, 0.25] },
    'hp-flat': { stat: 'maxHp', mode: 'basePct', values: [0.1, 0.15, 0.25] },
    'regen-flat': { stat: 'regen', mode: 'pct', values: [0.005, 0.0075, 0.0125] },
    'regen-pct': { stat: 'regen', mode: 'pct', values: [0.005, 0.008, 0.0125] },
});
function rejectCheckpoint() {
    throw new TypeError('이전 탑 카드와 공격 기록의 수치가 일치하지 않아요.');
}
function modifiersEqual(left, right) {
    const KEYS = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);
    return [...KEYS].every((key) =>
        ['flat', 'pct', 'basePct'].every((mode) => (left?.[key]?.[mode] ?? 0) === (right?.[key]?.[mode] ?? 0)),
    );
}
export function migrateTowerCardEffects(snapshot) {
    const TOWER = snapshot.tower;
    if (!TOWER) {
        return;
    }
    let historical = false;
    visitTowerCards(TOWER, (card) => {
        if (Object.hasOwn(card, 'effect')) {
            // Existing proof is never repaired or replaced from a live catalog.
            return;
        }
        const OLD = PREVIOUS_EFFECTS[card.id];
        if (OLD) {
            if (!Number.isInteger(card.rarity) || card.rarity < 0 || card.rarity >= OLD.values.length) {
                rejectCheckpoint();
            }
            card.effect = { stat: OLD.stat, mode: OLD.mode, value: OLD.values[card.rarity] };
            historical = true;
        } else {
            Object.assign(card, captureStatCard(card));
        }
    });
    if (!historical) {
        return;
    }
    const BOSS_MODS = runStatModifiers(TOWER.bossCards, 'boss');
    if (TOWER.active && (TOWER.bossCards || []).length) {
        for (const BOSS of snapshot.bosses || (snapshot.boss ? [snapshot.boss] : [])) {
            if (!modifiersEqual(BOSS.statModifiers, BOSS_MODS)) {
                rejectCheckpoint();
            }
        }
    }
    const PLAYER_MODS = runStatModifiers(TOWER.cards),
        ACTORS = [...snapshot.units, ...(snapshot.bosses || [])],
        RECORDS = ACTORS.flatMap((actor) => Object.values(actor.ability?.action || {})).filter(
            (record) => record?.budgetInputs,
        );
    RECORDS.push(...(snapshot.cornAttachments?.actions || []), ...(snapshot.chestnutAttacks || []));
    for (const RECORD of RECORDS) {
        const INPUTS = RECORD.budgetInputs,
            ACTOR = ACTORS.find((actor) => actor.id === RECORD.owner && actor.generation === RECORD.ownerGeneration);
        if (!ACTOR || ACTOR.faction !== 'player' || INPUTS?.power) {
            continue;
        }
        const ONE = applyStatModifier(
                baseUnitStatsFor(1, ACTOR.species, false).attackPower,
                PLAYER_MODS.attackPower || {},
            ),
            CURRENT = applyStatModifier(
                baseUnitStatsFor(RECORD.tier, ACTOR.species, false).attackPower,
                PLAYER_MODS.attackPower || {},
            );
        if ((INPUTS.one ?? INPUTS.tierOneAttack) !== ONE || (INPUTS.current ?? INPUTS.tierAttack) !== CURRENT) {
            rejectCheckpoint();
        }
    }
}
