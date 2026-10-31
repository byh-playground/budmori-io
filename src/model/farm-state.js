import { Garden, createUnitAttackCycle, CREATE_UNIT_SPECIAL_ABILITY } from './farm-model.js';
import { Unit } from './farm-unit.js';
import { normalizeSnapshot } from '../save/farm-snapshot-migrations.js';
import { validateSnapshot } from '../save/farm-snapshot-validation.js';
import { runStatModifiers } from '../tower/tower-run.js';
import { setRunStatMods } from '../units/unit-stats.js';
export { snapshot } from '../save/farm-snapshot.js';
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
    const {
        units: UNIT_DATA,
        bosses: BOSS_DATA,
        tower: TOWER,
        benchedIds: BENCHED_IDS,
        ejectQueue: EJECT_QUEUE,
        deployReadyTime: DEPLOY_READY_TIME,
        deployCount: DEPLOY_COUNT,
        foodRuntime: FOOD_RUNTIME,
        ...WORLD_DATA
    } = structuredClone(raw);
    G.resetUnits();
    Object.assign(G, WORLD_DATA);
    if (TOWER) {
        G.tower = {
            ...TOWER,
            relics: new Map(TOWER.relics),
            bossRelics: new Map(TOWER.bossRelics),
            undyingUsed: new Set(TOWER.undyingUsed),
            downed: new Set(TOWER.downed),
        };
    }
    setRunStatMods(runStatModifiers(G.tower.cards));
    G.replaceBosses(
        BOSS_DATA.map((data) => {
            const BOSS = G.createBoss(data.species, data.id),
                { maxHp: MAX_HP, attackPower: ATTACK_POWER, moveSpeed: MOVE_SPEED, statProfile: STAT_PROFILE } = data,
                BOSS_STATE = Object.fromEntries(
                    Object.entries(data).filter(
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
            BOSS.setBaseStats(STAT_PROFILE || { maxHp: MAX_HP, attackPower: ATTACK_POWER, moveSpeed: MOVE_SPEED });
            Object.assign(BOSS, BOSS_STATE);
            hydrateActorActions(BOSS, data, G);
            if (BOSS.patternRuntime.active) {
                BOSS.patternRuntime.active.hitIds = new Set(data.patternRuntime.active.hitIds);
            }
            return BOSS;
        }),
    );
    // Hydration does not allocate a new logical generation.
    G.entityGenerationSerial = raw.entityGenerationSerial;
    G.bossRewardReceipts = G.bossRewardReceipts.map((reward) => ({
        ...reward,
        boxes: [],
        revealedCount: reward.status === 'ready' ? reward.boxCount : 0,
    }));
    G.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(raw.rng.state);
    G.resetUnits(
        UNIT_DATA.map((data) => {
            const { ability: ABILITY, specialAbility: SPECIAL_ABILITY, ...STATE } = data;
            const U = Object.assign(new Unit(data.id, data.species, data.tier, data.x, data.y), STATE);
            return hydrateActorActions(U, { ability: ABILITY, specialAbility: SPECIAL_ABILITY }, G);
        }),
    );
    G._benched = new Set(BENCHED_IDS.map((id) => G.unitCollection.items.find((unit) => unit.id === id)));
    G._ejectQueue = EJECT_QUEUE.map(({ unitId, at, target }) => ({
        unit: G.unitCollection.items.find((unit) => unit.id === unitId),
        at,
        target,
    }));
    G._benchRevision++;
    G._unitSpatialDirty = true;
    G._deployReadyTime = DEPLOY_READY_TIME;
    G._deployCount = DEPLOY_COUNT;
    G.reconcileMateReservations();
    G._foodReservations.restore(FOOD_RUNTIME);
    return G;
}
