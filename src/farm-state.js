import { Garden, Unit, createUnitAttackCycle, CREATE_UNIT_SPECIAL_ABILITY } from './farm-model.js';
import { normalizeSnapshot } from './farm-snapshot-migrations.js';
import { validateSnapshot } from './farm-snapshot-validation.js';
export { snapshot } from './farm-snapshot.js';
export { normalizeSnapshot, validateSnapshot };

function hydrateAttackCycle(cycle, data) {
    cycle.phase = data.phase;
    cycle.elapsed = data.elapsed;
    cycle.interruptedRecoverySeconds = data.interruptedRecoverySeconds;
    cycle.action = structuredClone(data.action);
    return cycle;
}
function hydrateActorActions(actor, data, world) {
    actor.ability = hydrateAttackCycle(createUnitAttackCycle(actor), data.ability);
    for (const [KEY, RECORDS] of [
        ['cornAttack', world.cornAttachments.actions],
        ['chestnutAttack', world.chestnutAttacks],
    ]) {
        const ACTION = actor.ability.action?.[KEY];
        if (ACTION && ACTION.launchTick !== null) {
            const RECORD = RECORDS.find((record) => record.id === ACTION.id);
            if (RECORD) {
                actor.ability.action[KEY] = RECORD;
            }
        }
    }
    const SPECIAL = CREATE_UNIT_SPECIAL_ABILITY(actor);
    actor.specialAbility = SPECIAL ? hydrateAttackCycle(SPECIAL, data.specialAbility) : null;
    return actor;
}

// Only hydration constructs runtime owners. DTO shapes and validation do not
// inspect constructors or copy caches back into the persisted field contract.
export function restore(raw) {
    raw = normalizeSnapshot(raw);
    validateSnapshot(raw);
    const G = new Garden();
    const { units: UNIT_DATA, boss: BOSS_DATA, ...WORLD_DATA } = structuredClone(raw);
    G.resetUnits();
    Object.assign(G, WORLD_DATA);
    G.boss.dispose();
    G.boss = G.createBoss(BOSS_DATA.species);
    const { maxHp: MAX_HP, attackPower: ATTACK_POWER, moveSpeed: MOVE_SPEED, statProfile: STAT_PROFILE } = BOSS_DATA;
    const BOSS_STATE = Object.fromEntries(
        Object.entries(BOSS_DATA).filter(
            ([key]) =>
                ![
                    'radius',
                    'height',
                    'maxHp',
                    'attackPower',
                    'moveSpeed',
                    'statProfile',
                    'ability',
                    'specialAbility',
                ].includes(key),
        ),
    );
    G.boss.setBaseStats(STAT_PROFILE || { maxHp: MAX_HP, attackPower: ATTACK_POWER, moveSpeed: MOVE_SPEED });
    Object.assign(G.boss, BOSS_STATE);
    hydrateActorActions(G.boss, BOSS_DATA, G);
    // Hydration does not allocate a new logical generation.
    G.entityGenerationSerial = raw.entityGenerationSerial;
    G.bossRewardReceipts = G.bossRewardReceipts.map((reward) => ({
        ...reward,
        boxes: [],
        revealedCount: reward.status === 'ready' ? reward.boxCount : 0,
    }));
    G.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(raw.rng.state);
    if (G.boss.patternRuntime.active) {
        G.boss.patternRuntime.active.hitIds = new Set(raw.boss.patternRuntime.active.hitIds);
    }
    G.resetUnits(
        UNIT_DATA.map((data) => {
            const { ability: ABILITY, specialAbility: SPECIAL_ABILITY, ...STATE } = data;
            const U = Object.assign(new Unit(data.id, data.species, data.tier, data.x, data.y), STATE);
            return hydrateActorActions(U, { ability: ABILITY, specialAbility: SPECIAL_ABILITY }, G);
        }),
    );
    G.reconcileMateReservations();
    return G;
}
