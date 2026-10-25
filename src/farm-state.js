import { Garden, Unit, createUnitAttackCycle, CREATE_UNIT_SPECIAL_ABILITY } from './farm-model.js';
import { normalizeSnapshot } from './farm-snapshot-migrations.js';
import { validateSnapshot } from './farm-snapshot-validation.js';
export { snapshot } from './farm-snapshot.js';
export { normalizeSnapshot, validateSnapshot };

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
            ([key]) => !['radius', 'height', 'maxHp', 'attackPower', 'moveSpeed', 'statProfile'].includes(key),
        ),
    );
    G.boss.setBaseStats(STAT_PROFILE || { maxHp: MAX_HP, attackPower: ATTACK_POWER, moveSpeed: MOVE_SPEED });
    Object.assign(G.boss, BOSS_STATE);
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
            const U = Object.assign(new Unit(data.id, data.species, data.tier, data.x, data.y), structuredClone(data));
            U.ability = Object.assign(createUnitAttackCycle(U), structuredClone(data.ability));
            if (U.ability.action?.cornAttack?.launchTick !== null && U.ability.action?.cornAttack) {
                const RECORD = G.cornAttachments.actions.find((action) => action.id === U.ability.action.cornAttack.id);
                if (RECORD) {
                    U.ability.action.cornAttack = RECORD;
                }
            }
            if (U.ability.action?.chestnutAttack?.launchTick !== null && U.ability.action?.chestnutAttack) {
                const RECORD = G.chestnutAttacks.find((record) => record.id === U.ability.action.chestnutAttack.id);
                if (RECORD) {
                    U.ability.action.chestnutAttack = RECORD;
                }
            }
            const SPECIAL = CREATE_UNIT_SPECIAL_ABILITY(U);
            U.specialAbility = SPECIAL ? Object.assign(SPECIAL, structuredClone(data.specialAbility || {})) : null;
            return U;
        }),
    );
    G.reconcileMateReservations();
    return G;
}
