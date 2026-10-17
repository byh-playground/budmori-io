import { CONFIG } from './farm-model.js';
import { resolveUnitStats } from './unit-stats.js';
import { createPlayerProgressionState } from './player-progression.js';
import { createAbilityRuntimeSnapshot } from './ability-state.js';
import { abilityProfile, hasUnitCapability } from './unit-abilities.js';
import { createFarmBossProgress } from './farm-boss-stages.js';
import { BOSS_PATTERN_IDS } from './boss-patterns.js';
import { FACTION_CONFIG, legacyUnitFaction } from './factions.js';
import { FARM_SNAPSHOT_SHAPE, UNIT_SNAPSHOT_SHAPE, LEGACY_UNIT_DEFAULT_KEYS } from './farm-snapshot.js';
import { assertSnapshot as assert, validBattleUnitId } from './farm-snapshot-validation.js';

// The versioned save envelope admits 0.4–0.7 before reaching this boundary.
// Those releases used additive fields rather than a second schema version, so
// migration is presence-based and also accepts current in-memory checkpoints.
// Keep normalization before final serialization: cooldowns, corpse clocks,
// serials and reward watermarks may change even on a live checkpoint.
export function normalizeSnapshot(raw, { migrateLegacyRaid = false, clone = true } = {}) {
    // Internal checkpoint serialization can skip the copy because `snapshot()` already returned an owned plain-data graph.
    const RESET_LEGACY_CORPSE_TIMERS = !Object.hasOwn(raw, 'corpseRecoveryVersion'),
        HAS_REWARD_WATERMARKS = Object.hasOwn(raw, 'bossRewardWatermarks');
    if (clone) {
        raw = structuredClone(raw);
    }
    delete raw.progress;
    if (raw.speed === 1 || raw.speed === 4) {
        delete raw.speed;
    }
    if (RESET_LEGACY_CORPSE_TIMERS) {
        raw.corpseRecoveryVersion = 1;
    }
    if (!Object.hasOwn(raw, 'farmBossProgress')) {
        raw.farmBossProgress = createFarmBossProgress(raw.seed);
    }
    const BASE = FARM_SNAPSHOT_SHAPE,
        FILL = (v, d) => {
            for (const [K, X] of Object.entries(d)) {
                if (!Object.hasOwn(v, K)) {
                    v[K] = structuredClone(X);
                } else if (
                    v[K] &&
                    X &&
                    typeof v[K] === 'object' &&
                    typeof X === 'object' &&
                    !Array.isArray(v[K]) &&
                    !Array.isArray(X)
                ) {
                    FILL(v[K], X);
                }
            }
        };
    FILL(raw, BASE);
    // Merge tasks are transient. Discard pre-expansion pair tasks and older
    // animation records that cannot represent the material count/output actor.
    if (
        raw.mergeTask &&
        (!Array.isArray(raw.mergeTask.materialIds) ||
            (raw.mergeTask.phase === 'animation' && !Number.isSafeInteger(raw.mergeTask.resultId)))
    ) {
        raw.mergeTask = null;
    }
    for (const R of raw.raidRosters || []) {
        if (!Object.hasOwn(R, 'abilitySnapshot')) {
            R.abilitySnapshot = createAbilityRuntimeSnapshot(createPlayerProgressionState());
        } else if (!Object.hasOwn(R.abilitySnapshot, 'farmUpgrades')) {
            R.abilitySnapshot.farmUpgrades = structuredClone(createPlayerProgressionState().farmUpgrades);
        }
        if (
            R.abilitySnapshot?.abilities &&
            typeof R.abilitySnapshot.abilities === 'object' &&
            !Array.isArray(R.abilitySnapshot.abilities)
        ) {
            for (const [ID, VALUE] of Object.entries(BASE.playerProgression.abilities)) {
                if (!Object.hasOwn(R.abilitySnapshot.abilities, ID)) {
                    R.abilitySnapshot.abilities[ID] = structuredClone(VALUE);
                }
            }
        }
        if (!Object.hasOwn(R, 'settlementSessionId')) {
            R.settlementSessionId = '';
        }
        if (!Object.hasOwn(R, 'settlementRunSequence')) {
            R.settlementRunSequence = 0;
        }
        if (!Object.hasOwn(R, 'settlementEncounterId')) {
            R.settlementEncounterId = 0;
        }
    }
    for (const U of raw.units || []) {
        for (const KEY of LEGACY_UNIT_DEFAULT_KEYS) {
            if (!Object.hasOwn(U, KEY)) {
                U[KEY] = UNIT_SNAPSHOT_SHAPE[KEY];
            }
        }
        if (!Object.hasOwn(U, 'faction')) {
            U.faction = legacyUnitFaction(U);
        }
        const ACTION = U.ability?.action;
        if (ACTION && hasUnitCapability(U.species, 'repeatedStrike')) {
            if (!Object.hasOwn(ACTION, 'peanutStrikeCount')) {
                ACTION.peanutStrikeCount = 2;
            }
            if (!Object.hasOwn(ACTION, 'peanutAttackMultiplier')) {
                ACTION.peanutAttackMultiplier = 0.5;
            }
            if (!Object.hasOwn(ACTION, 'peanutSpreadRadians')) {
                ACTION.peanutSpreadRadians = Math.PI / 12;
            }
        }
        if (ACTION && hasUnitCapability(U.species, 'guard')) {
            if (!Object.hasOwn(ACTION, 'walnutEmpowered')) {
                ACTION.walnutEmpowered = false;
            }
            if (!Object.hasOwn(ACTION, 'walnutGuardUsed')) {
                ACTION.walnutGuardUsed = false;
            }
        }
    }
    for (const P of raw.projectiles || []) {
        if (!Object.hasOwn(P, 'attackMultiplier')) {
            P.attackMultiplier = abilityProfile(P.species).skillMultiplier;
        }
        if (!Object.hasOwn(P, 'shotIndex')) {
            P.shotIndex = 0;
        }
        if (!Object.hasOwn(P, 'ownerId')) {
            P.ownerId = raw.units.find((u) => u.id === P.owner)?.ownerId || '';
        }
        if (!Object.hasOwn(P, 'faction')) {
            P.faction =
                P.ownerId === 'boss' || P.owner >= CONFIG.boss.summonIdBase
                    ? FACTION_CONFIG.ENEMY
                    : FACTION_CONFIG.PLAYER;
        }
    }
    raw.projectileSerial = Math.max(
        Number.isSafeInteger(raw.projectileSerial) ? raw.projectileSerial : 0,
        ...(raw.projectiles || []).map((p) => (Number.isSafeInteger(p?.id) ? p.id : 0)),
    );
    raw.raidSummonSerial = Number.isSafeInteger(raw.raidSummonSerial)
        ? raw.raidSummonSerial
        : Math.max(
              0,
              ...(raw.units || []).map((u) =>
                  Number.isSafeInteger(u?.id) && u.id >= CONFIG.raid.ids.summonBase
                      ? u.id - CONFIG.raid.ids.summonBase + 1
                      : 0,
              ),
          );
    if (raw.farmBossEvent.phase !== 'idle' && raw.farmBossEvent.encounterId === 0) {
        const ENCOUNTER_ID = raw.nextBossEncounterId++;
        raw.farmBossEvent.encounterId = ENCOUNTER_ID;
        raw.farmBossEvent.rewardStatus =
            raw.farmBossEvent.outcome === 'victory'
                ? 'missed'
                : raw.farmBossEvent.outcome === 'defeat'
                  ? 'none'
                  : 'unresolved';
        raw.farmBossEvent.rewardChance = 0;
        raw.farmBossEvent.rewardRoll = 0;
        raw.farmBossEvent.rewardUnitId = 0;
        if (raw.farmBossEvent.outcome === 'victory') {
            raw.bossRewardReceipts.push({
                encounterId: ENCOUNTER_ID,
                source: 'farm',
                species: 3,
                tier: 1,
                x: raw.boss.x,
                y: raw.boss.y,
                chance: 0,
                roll: 0,
                status: 'missed',
                unitId: 0,
            });
        }
    }
    for (const R of raw.raidRosters || []) {
        if (!Object.hasOwn(R, 'lastDeploySequence')) {
            R.lastDeploySequence = Array.isArray(R.troops) ? R.troops.filter((t) => t?.deployed).length : 0;
        }
    }
    if (!HAS_REWARD_WATERMARKS) {
        for (const SOURCE of ['farm', 'raid']) {
            raw.bossRewardWatermarks[SOURCE] = Math.max(
                0,
                ...raw.bossRewardReceipts
                    .filter((reward) => reward?.source === SOURCE && Number.isSafeInteger(reward.encounterId))
                    .map((reward) => reward.encounterId),
            );
        }
    }
    raw.bossSummonSerial = Number.isSafeInteger(raw.bossSummonSerial)
        ? raw.bossSummonSerial
        : Math.max(
              0,
              ...(raw.units || []).map((u) =>
                  Number.isSafeInteger(u?.id) && u.id >= CONFIG.boss.summonIdBase ? u.id - CONFIG.boss.summonIdBase : 0,
              ),
          );
    // Preserve the old terminal animation sample as immutable encounter evidence.
    if (raw.scene === 'raid' && !raw.boss.active && Number.isFinite(raw.boss.clock)) {
        const ENDED = raw.notices.findLast((e) => e.kind === 'victory' || e.kind === 'defeat');
        if (ENDED && !Object.hasOwn(ENDED, 'bossPatternElapsed')) {
            ENDED.bossPatternElapsed = raw.boss.clock;
        }
    }
    normalizeBossPatternSnapshot(raw.boss, BASE.boss.patternRuntime, raw.bossSummonSerial);
    raw.nextRaidRunSequence = Math.max(raw.nextRaidRunSequence || 0, raw.bossRewardWatermarks.raid || 0);
    raw.raidSettlementWatermark = Math.max(raw.raidSettlementWatermark || 0, raw.bossRewardWatermarks.raid || 0);
    for (const U of raw.units) {
        if (
            !Number.isFinite(U.cooldownDuration) ||
            U.cooldownDuration < (Number.isFinite(U.cooldown) ? U.cooldown : 0)
        ) {
            U.cooldownDuration = Math.max(0, Number.isFinite(U.cooldown) ? U.cooldown : 0);
        }
        if (!Object.hasOwn(U, 'growthElapsed')) {
            const PROGRESS = Number.isFinite(U.growth)
                ? Math.max(0, Math.min(CONFIG.farm.breeding.matureMeals, U.growth))
                : 0;
            U.growthElapsed = (U.growthDuration * PROGRESS) / CONFIG.farm.breeding.matureMeals;
        }
        if (U.hp <= 0) {
            if (RESET_LEGACY_CORPSE_TIMERS || !Number.isFinite(U.down) || U.down <= 0) {
                U.down = CONFIG.unit.corpseRecoverySeconds;
            } else {
                U.down = Math.min(CONFIG.unit.corpseRecoverySeconds, U.down);
            }
        } else {
            U.down = 0;
        }
    }
    if (migrateLegacyRaid && raw.scene === 'raid') {
        raw.scene = 'farm';
        raw.running = false;
        raw.encounter = {
            outcome: 'idle',
            elapsed: 0,
        };
        raw.raidExpectedPlayers = ['solo'];
        raw.raidRosters = [];
        raw.raidDeploymentStarted = false;
        raw.projectiles = [];
        raw.boss = structuredClone(BASE.boss);
        for (const U of raw.units) {
            U.x = U.home?.x ?? U.x;
            U.y = U.home?.y ?? U.y;
            Object.assign(U, {
                z: 0,
                vx: 0,
                vy: 0,
                vz: 0,
                stun: 0,
                down: 0,
                hp: resolveUnitStats(U).maxHp,
                dropLanded: true,
            });
            U.ability = {
                phase: 'idle',
                elapsed: 0,
                action: null,
            };
        }
    }
    return raw;
}
// Only the import boundary understands pre-SSOT boss mirrors. A loaded world
// and every new snapshot contain one action phase, timer, target, and hit set.
function normalizeBossPatternSnapshot(boss, baseRuntime, bossSummonSerial) {
    if (Object.hasOwn(boss, 'phase')) {
        assert(
            [
                'chase',
                'windup',
                'active',
                'recover',
                'resting',
                'strike-windup',
                'strike',
                'sweep-windup',
                'sweep',
            ].includes(boss.phase),
        );
    }
    if (Object.hasOwn(boss, 'clock')) {
        assert(Number.isFinite(boss.clock));
    }
    if (Object.hasOwn(boss, 'targetId')) {
        assert(Number.isFinite(boss.targetId));
    }
    if (Object.hasOwn(boss, 'attackKind')) {
        assert(['basic', 'sweep', ...BOSS_PATTERN_IDS].includes(boss.attackKind));
    }
    if (Object.hasOwn(boss, 'hit')) {
        assert(
            Array.isArray(boss.hit) &&
                boss.hit.length <= CONFIG.raid.capacity.battleUnits &&
                boss.hit.every((id) => validBattleUnitId(id, bossSummonSerial)) &&
                new Set(boss.hit).size === boss.hit.length,
        );
    }
    if (!boss.patternRuntime || boss.patternRuntime.active === undefined) {
        boss.patternRuntime = structuredClone(baseRuntime);
    }
    if (['strike-windup', 'strike', 'sweep-windup', 'sweep'].includes(boss.phase)) {
        boss.patternRuntime.active = null;
    }
    const ACTION = boss.patternRuntime.active;
    if (ACTION) {
        // Old saves wrote both lists. Retain their corruption check at migration,
        // rather than keeping a second runtime owner solely to compare it later.
        if (Object.hasOwn(boss, 'hit')) {
            assert(
                Array.isArray(ACTION.hitIds) &&
                    boss.hit.length === ACTION.hitIds.length &&
                    ACTION.hitIds.every((id) => boss.hit.includes(id)),
            );
        }
    }
    for (const KEY of ['phase', 'clock', 'hit', 'targetId', 'attackKind']) {
        delete boss[KEY];
    }
}
