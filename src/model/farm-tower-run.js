import { highestTowerStartFloor, beginTowerRewardRun } from './player-progression.js';
import { CONFIG, CLAMP } from './farm-config.js';
import { applyRunGrowthHealth, unitMaxHpFor, setRunStatMods } from '../units/unit-stats.js';
import {
    freshTowerRun,
    rollFloorKind,
    rollEventOffers,
    rollCardOffers,
    PASSIVE_CARDS,
    advanceSince,
    applyTowerCard,
    TOWER_EVENTS,
    drawBossCard,
    runStatModifiers,
    passiveTotals,
} from '../tower/tower-run.js';
import { ARENA_GEOMETRY } from './arena-geometry.js';
import { FORMATION_SKILL_DEFINITIONS } from '../formation/formation-skill-state.js';
import { FACTION_CONFIG, hasFaction } from '../core/factions.js';
import { createTowerEncounter, encounterBudget, TOWER_ENCOUNTER_SETTINGS } from '../tower/tower-encounter.js';
import { bossStageStats, bossAcquisitionChance } from '../boss/boss-rewards.js';
import { BOSS_SPECIES } from '../units/species-catalog.js';
import { Unit as UNIT } from './farm-unit.js';
import { bossBodyRadius, bossBodyHeight, bossTorsoHeight } from '../features/unit-body/definition.js';
import { bossVectorScale } from '../vector-sockets.js';
import { BossController } from '../boss/boss-controller.js';
import { createBossPatternRuntime } from '../boss/boss-patterns.js';
import { createBarleyArmorShredBuckets } from '../features/abilities/barley-shred/model.js';

export const FARM_TOWER_RUN = (base) =>
    class FarmTowerRun extends base {
        startTower(startFloor = 1) {
            this._flushEjected();
            if (
                this.scene !== 'farm' ||
                this.boss.active ||
                this.farmBossEvent.phase !== 'idle' ||
                this.tower.active ||
                !this.units.some((u) => !u.isBattleOnlySummon && u.hp > 0)
            ) {
                return false;
            }
            const FLOOR = Math.min(
                    Math.max(1, Math.floor(startFloor) || 1),
                    highestTowerStartFloor(this.playerProgression.towerBest),
                ),
                KIND = FLOOR % CONFIG.farm.tower.midBossEvery === 0 ? 'mid' : 'battle';
            // Whoever is already down sleeps through the first floor.
            const SLEEP = new Map(
                this.units.filter((u) => !u.isBattleOnlySummon && u.hp <= 0).map((u) => [u.id, FLOOR]),
            );
            const REWARD_RUN = beginTowerRewardRun(this.playerProgression);
            this.playerProgression = REWARD_RUN.state;
            this.battleCommand = 'engage';
            this.runProgressionSnapshot = structuredClone(this.playerProgression);
            for (const UNIT_LOCAL of this.unitCollection.items) {
                applyRunGrowthHealth(UNIT_LOCAL, this.runProgressionSnapshot, { preserveRatio: true });
            }
            this.tower = {
                pendingKind: KIND,
                phase: 'climbing',
                summitElapsed: 0,
                startFloor: FLOOR,
                rewardRunId: REWARD_RUN.runId,
                active: true,
                floor: FLOOR,
                kind: KIND,
                ...freshTowerRun(),
                sleepUntil: SLEEP,
                record: false,
            };
            // Everyone on the farm walks to the door first; the floor begins when they are inside.
            this.farmBossEvent = { ...this.farmBossEvent, phase: 'marching', elapsed: 0, outcome: 'fighting' };
            this.markProgressChanged();
            return true;
        }
        _marchUnit(unit) {
            if (unit.hp <= 0 || unit.isBattleOnlySummon) {
                return;
            }
            const GATE = this.towerGate,
                SPREAD = ((unit.id * 7) % 11) - 5;
            this.steer(unit, GATE.x + SPREAD * 0.25, GATE.y, 0, CONFIG.farm.tower.marchSpeed);
        }
        benchUnit(unit) {
            this._benched.add(unit);
            this._benchRevision++;
            this._unitSpatialDirty = true;
        }
        finishMarch() {
            this.insideTower = true;
            return this._beginFloor(this.tower.pendingKind);
        }
        _leaveTowerView() {
            this.insideTower = false;
            const SETTINGS = CONFIG.farm.tower,
                ARENA = CONFIG.farm.arena,
                UNITS = this.unitCollection.items.filter((unit) => !unit.isBattleOnlySummon);
            for (let index = UNITS.length - 1; index > 0; index--) {
                const OTHER = Math.floor(this.random() * (index + 1));
                [UNITS[index], UNITS[OTHER]] = [UNITS[OTHER], UNITS[index]];
            }
            this._ejectQueue = UNITS.map((unit, index) => {
                const AT = ARENA_GEOMETRY.clamp(
                    {
                        x: (this.random() * 2 - 1) * (ARENA.radiusX - 2),
                        y: (this.random() * 2 - 1) * (ARENA.radiusY - 2),
                    },
                    'farm',
                    1,
                );
                Object.assign(unit, { x: AT.x, y: AT.y, z: 0, vx: 0, vy: 0, vz: 0 });
                return { unit, at: this.time + (index / UNITS.length) * SETTINGS.ejectSeconds, target: AT };
            });
            this._benched = new Set(UNITS);
            this._benchRevision++;
            this._unitSpatialDirty = true;
        }
        _releaseEjected() {
            const SETTINGS = CONFIG.farm.tower,
                GATE = this.towerGate;
            while (this._ejectQueue.length && this._ejectQueue[0].at <= this.time) {
                const NEXT = this._ejectQueue.shift(),
                    UNIT_LOCAL = NEXT.unit,
                    TARGET = NEXT.target;
                this._benched.delete(UNIT_LOCAL);
                this._benchRevision++;
                if (this.unitCollection.has(UNIT_LOCAL)) {
                    const X = GATE.x + (this.random() - 0.5) * 3,
                        Y = GATE.y - 0.8,
                        T = SETTINGS.flightSeconds;
                    Object.assign(UNIT_LOCAL, {
                        x: X,
                        y: Y,
                        z: SETTINGS.ejectHeight,
                        vx: (TARGET.x - X) / T,
                        vy: (TARGET.y - Y) / T,
                        vz: (0.5 * CONFIG.physics.gravity * T * T - SETTINGS.ejectHeight) / T,
                        // A sleeping unit has no drop landing of its own: it just falls.
                        dropLanded: UNIT_LOCAL.hp <= 0,
                    });
                }
                this._unitSpatialDirty = true;
            }
        }
        _flushEjected() {
            for (const NEXT of this._ejectQueue) {
                this._benched.delete(NEXT.unit);
            }
            this._ejectQueue.length = 0;
            this._benchRevision++;
            this._unitSpatialDirty = true;
        }
        _rollDoors() {
            const T = this.tower,
                FLOOR = T.floor + 1;
            T.nextKind = rollFloorKind({
                floor: FLOOR,
                since: T.since,
                random: () => this.random(),
                midBossEvery: CONFIG.farm.tower.midBossEvery,
                topFloor: CONFIG.farm.tower.topFloor,
            });
            if (T.nextKind === 'mid') {
                return [{ type: 'fight', kind: 'mid' }];
            }
            if (T.nextKind === 'battle') {
                return [
                    { type: 'fight', kind: 'battle' },
                    { type: 'fight', kind: 'elite' },
                ];
            }
            if (T.nextKind === 'event') {
                return rollEventOffers({ world: this, random: () => this.random() });
            }
            return rollCardOffers({
                floor: FLOOR,
                cards: T.cards,
                relics: T.relics,
                skillIds: FORMATION_SKILL_DEFINITIONS.map(({ id }) => id),
                passiveIds: PASSIVE_CARDS.map((card) => card.id),
                relicSlots: CONFIG.farm.tower.relicSlots,
                relicMaxLevel: CONFIG.farm.tower.relicMaxLevel,
                random: () => this.random(),
            });
        }
        afterFloor() {
            const T = this.tower;
            if (!T.active) {
                if (this.insideTower) {
                    this._leaveTowerView();
                }
                return;
            }
            for (const U of this.unitCollection.items) {
                if (!U.isBattleOnlySummon && U.hp <= 0 && !T.sleepUntil.has(U.id)) {
                    T.sleepUntil.set(U.id, T.floor + Math.min(CONFIG.farm.tower.sleepMax, U.tier));
                }
            }
            this._benched = new Set(this.unitCollection.items.filter((u) => !u.isBattleOnlySummon));
            this._benchRevision++;
            this._unitSpatialDirty = true;
            T.doors = this._rollDoors();
            this.markProgressChanged();
        }
        _wakeUnit(unit) {
            unit.revive(unitMaxHpFor(unit));
            this.tower.sleepUntil.delete(unit.id);
        }
        chooseDoor(index) {
            const T = this.tower,
                DOOR = T.doors[index];
            if (!T.active || this.farmBossEvent.phase !== 'idle' || !DOOR || this.time < (T.bossCardDraw?.until || 0)) {
                return false;
            }
            T.floor++;
            T.since = advanceSince(T.since, T.nextKind);
            T.doors = [];
            if (DOOR.type === 'fight') {
                return this._beginFloor(DOOR.kind);
            }
            let playerReceipt = null;
            if (['skill', 'stat', 'passive'].includes(DOOR.type)) {
                playerReceipt = applyTowerCard(T, DOOR);
                this._applyRunStats();
            } else {
                TOWER_EVENTS.find((event) => event.id === DOOR.id).apply(this);
            }
            if (['skill', 'stat', 'passive'].includes(DOOR.type)) {
                drawBossCard(
                    T,
                    () => this.random(),
                    this.time,
                    CONFIG.farm.tower.relicSlots,
                    CONFIG.farm.tower.relicMaxLevel,
                    playerReceipt,
                );
                this._applyBossRunStats();
            }
            // A floor reached without a fight still counts as reached.
            this.playerProgression.towerBest = Math.max(this.playerProgression.towerBest, T.floor);
            T.kind = T.nextKind;
            T.doors = this._rollDoors();
            this.combat('tower-card', { floor: T.floor });
            this.markProgressChanged();
            return true;
        }
        _applyBossRunStats() {
            const TOWER = this.tower,
                MODIFIERS = TOWER.active ? runStatModifiers(TOWER.bossCards, 'boss') : {};
            TOWER.bossPassives = TOWER.active ? passiveTotals(TOWER.bossCards, 'boss') : {};
            for (const UNIT_LOCAL of [...this.bosses, ...this.unitCollection.items]) {
                if (UNIT_LOCAL.faction === FACTION_CONFIG.ENEMY) {
                    UNIT_LOCAL.setStatModifiers(MODIFIERS);
                    UNIT_LOCAL.hp = Math.min(UNIT_LOCAL.hp, unitMaxHpFor(UNIT_LOCAL));
                }
            }
        }
        _clearRunStats() {
            for (const UNIT_LOCAL of this.unitCollection.items) {
                applyRunGrowthHealth(UNIT_LOCAL, null);
            }
            this.tower.cards = [];
            this._applyRunStats();
        }
        _applyRunStats() {
            setRunStatMods(runStatModifiers(this.tower.cards));
            this.tower.passives = passiveTotals(this.tower.cards);
            for (const UNIT_LOCAL of this.unitCollection.items) {
                if (UNIT_LOCAL.hp > 0 && !UNIT_LOCAL.isFormationClone) {
                    UNIT_LOCAL.hp = Math.min(UNIT_LOCAL.hp, unitMaxHpFor(UNIT_LOCAL));
                }
            }
        }
        leaveTower() {
            if (!this.tower.active || this.farmBossEvent.phase !== 'idle') {
                return false;
            }
            this._endTower();
            return true;
        }
        _endTower() {
            this._clearRunStats();
            this.tower.active = false;
            this.runProgressionSnapshot = null;
            this.tower.doors = [];
            this._benched.clear();
            this._benchRevision++;
            this._leaveTowerView();
            this.markProgressChanged();
        }
        _beginFloor(kind) {
            const T = this.tower;
            T.kind = kind;
            for (const UNIT_LOCAL of this.unitCollection.items) {
                if (UNIT_LOCAL.isBattleOnlySummon) {
                    continue;
                }
                if (
                    UNIT_LOCAL.hp <= 0 &&
                    T.sleepUntil.has(UNIT_LOCAL.id) &&
                    T.sleepUntil.get(UNIT_LOCAL.id) < T.floor
                ) {
                    this._wakeUnit(UNIT_LOCAL);
                } else if (UNIT_LOCAL.hp > 0) {
                    UNIT_LOCAL.hp = unitMaxHpFor(UNIT_LOCAL);
                }
            }
            T.fallen = 0;
            T.bossFallen = 0;
            T.undyingUsed = new Set();
            // Between floors residents are still benched; the field-only view is empty.
            for (const UNIT_LOCAL of this.unitCollection.items) {
                if (!UNIT_LOCAL.isBattleOnlySummon) {
                    UNIT_LOCAL.splitUsedThisBattle = false;
                    UNIT_LOCAL.deathSplitHandled = false;
                    UNIT_LOCAL.chestnutNextThornTick = 0;
                }
            }
            this.replaceBosses([]);
            this.bossEncounter = createTowerEncounter(T.floor);
            this.farmBossEvent = {
                phase: 'dropping',
                elapsed: 0,
                outcome: 'fighting',
                encounterId: this.nextBossEncounterId++,
                rewardStatus: 'unresolved',
                rewardChance: 0,
                rewardRoll: 0,
                rewardUnitId: 0,
            };
            this.joinNextBoss(true);
            // Nobody walks in by themselves: every living unit waits in the hand until the player deploys it.
            this._benched = new Set(this.unitCollection.items.filter((u) => !u.isBattleOnlySummon));
            this._benchRevision++;
            this._beginArmyDeployment();
            this._unitSpatialDirty = true;
            this.markProgressChanged();
            return true;
        }
        joinNextBoss(initial = false) {
            const ENCOUNTER = this.bossEncounter,
                ENTRY = ENCOUNTER?.roster[ENCOUNTER.nextIndex];
            if (!ENTRY || (ENTRY.final && this.bosses.some((boss) => boss.active && boss.hp > 0))) {
                return false;
            }
            const INDEX = ENCOUNTER.nextIndex++,
                BOSS = this.createBoss(ENTRY.species, INDEX === 0 ? 'boss' : `boss-${INDEX}`),
                KIND = CONFIG.farm.tower[this.tower.kind],
                BUDGET = encounterBudget(ENCOUNTER.floor, this.tower.startFloor || 1),
                STATS = bossStageStats(ENCOUNTER.floor),
                ANGLE = INDEX * 2.399963229728653;
            BOSS.controller.configureStage(ENCOUNTER.floor, ENTRY.species);
            BOSS.setBaseStats({
                maxHp: Math.max(1, Math.round(STATS.hp * KIND.hp * BUDGET.hp * ENTRY.hpShare)),
                attackPower: STATS.attackPower * KIND.attack * BUDGET.attack * ENTRY.attackShare,
            });
            BOSS.setStatModifiers(runStatModifiers(this.tower.bossCards, 'boss'));
            BOSS.setHealth(BOSS.maxHp);
            Object.assign(BOSS, {
                x: INDEX ? Math.cos(ANGLE) * 9 : 0,
                y: INDEX ? Math.sin(ANGLE) * 6 : 0,
                z: CONFIG.battle.dropHeight,
                dropLanded: false,
                active: true,
                encounterId: this.farmBossEvent.encounterId,
                isFinalBoss: ENTRY.final,
            });
            this.bosses.push(BOSS);
            ENCOUNTER.nextJoinAt = ENCOUNTER.elapsed + TOWER_ENCOUNTER_SETTINGS.reinforcementSeconds;
            if (!initial) {
                this.combat('tower-boss-join', { unit: BOSS.id, final: ENTRY.final, x: BOSS.x, y: BOSS.y, z: BOSS.z });
            }
            return true;
        }
        advanceBossEncounter(dt) {
            const ENCOUNTER = this.bossEncounter;
            if (!ENCOUNTER) {
                return this.boss.hp <= 0;
            }
            ENCOUNTER.elapsed += dt;
            for (const BOSS of this.bosses) {
                if (BOSS.hp <= 0 && !ENCOUNTER.clearedIds.includes(BOSS.id)) {
                    BOSS.die();
                    BOSS.active = false;
                    BOSS.ability.interrupt();
                    BOSS.specialAbility?.interrupt();
                    BOSS.patternRuntime.active = null;
                    ENCOUNTER.clearedIds.push(BOSS.id);
                }
            }
            const ALIVE = this.bosses.some((boss) => boss.active && boss.hp > 0);
            if (
                ENCOUNTER.nextIndex < ENCOUNTER.roster.length &&
                (!ALIVE || ENCOUNTER.elapsed >= ENCOUNTER.nextJoinAt)
            ) {
                this.joinNextBoss();
                return false;
            }
            ENCOUNTER.completed = !ALIVE && ENCOUNTER.nextIndex === ENCOUNTER.roster.length;
            return ENCOUNTER.completed;
        }
        finishTowerSummit() {
            if (this.tower.phase !== 'summit') {
                return false;
            }
            this.tower.phase = 'complete';
            this.farmBossEvent = {
                phase: 'idle',
                elapsed: 0,
                outcome: 'idle',
                encounterId: 0,
                rewardStatus: 'none',
                rewardChance: 0,
                rewardRoll: 0,
                rewardUnitId: 0,
            };
            this.replaceBosses([this.createBoss()]);
            this.bossEncounter = null;
            this._endTower();
            return true;
        }
        _fieldUnits() {
            const CACHE = this._fieldCache;
            if (CACHE.revision !== this.unitCollection.revision || CACHE.bench !== this._benchRevision) {
                CACHE.list = this.unitCollection.items.filter((unit) => !this._benched.has(unit));
                CACHE.revision = this.unitCollection.revision;
                CACHE.bench = this._benchRevision;
            }
            return CACHE.list;
        }
        _beginArmyDeployment() {
            this.frontlineLimit = Math.min(CONFIG.farm.deploy.maxFrontline, Math.floor(this.capacity / 2));
            this._benched = new Set(this.unitCollection.items.filter((unit) => !unit.isBattleOnlySummon));
            this._benchRevision++;
            this._deployReadyTime = this.time;
            this._deployCount = 0;
            this._armyThreatTick = -1;
            this._unitSpatialDirty = true;
        }
        setBattleCommand(command) {
            if (!['engage', 'scatter', 'retreat'].includes(command) || !this.tower.active) {
                return false;
            }
            this.battleCommand = command;
            if (command === 'retreat' || command === 'scatter') {
                for (const UNIT_LOCAL of this.unitCollection.items) {
                    if (hasFaction(UNIT_LOCAL, FACTION_CONFIG.PLAYER) && UNIT_LOCAL.ability.phase === 'windup') {
                        // Do not cancel special skills, launched projectiles or committed leaps.
                        UNIT_LOCAL.ability.interrupt();
                    }
                }
            }
            return true;
        }
        setDeployOrder(order) {
            const COUNT = CONFIG.unit.speciesCount;
            if (
                !Array.isArray(order) ||
                order.length !== COUNT ||
                new Set(order).size !== COUNT ||
                !order.every((species) => Number.isSafeInteger(species) && species >= 0 && species < COUNT)
            ) {
                return false;
            }
            this.deployOrder = [...order];
            return true;
        }
        _autoDeploy() {
            if (
                this.scene !== 'farm' ||
                !['dropping', 'fighting'].includes(this.farmBossEvent.phase) ||
                this._benched.size === 0 ||
                this.deployCooldownLeft > 0
            ) {
                return;
            }
            const DEPLOY = CONFIG.farm.deploy,
                ARENA = ARENA_GEOMETRY.arena(this),
                BATCH_SIZE = Math.ceil((this.frontlineLimit * DEPLOY.cooldownSeconds) / DEPLOY.initialSeconds),
                COUNT = Math.min(BATCH_SIZE, this.frontlineLimit - this.fieldFighterCount);
            for (let index = 0; index < COUNT; index++) {
                const ANGLE = this._deployCount * 2.399963229728653,
                    X = Math.cos(ANGLE) * (ARENA.radiusX - 1),
                    Y = Math.sin(ANGLE) * (ARENA.radiusY - 1);
                let deployed = false;
                for (const SPECIES of this.deployOrder) {
                    if (this._deployReservedUnit(SPECIES, X, Y)) {
                        this._deployCount++;
                        deployed = true;
                        break;
                    }
                }
                if (!deployed) {
                    break;
                }
            }
            this._deployReadyTime = this.time + DEPLOY.cooldownSeconds;
        }
        deployUnit(species, x, y) {
            if (
                this.scene !== 'farm' ||
                !['dropping', 'fighting'].includes(this.farmBossEvent.phase) ||
                this.deployCooldownLeft > 0 ||
                this.fieldFighterCount >= this.frontlineLimit ||
                !Number.isFinite(x) ||
                !Number.isFinite(y)
            ) {
                return false;
            }
            if (!this._deployReservedUnit(species, x, y)) {
                return false;
            }
            this._deployReadyTime = this.time + CONFIG.farm.deploy.cooldownSeconds;
            return true;
        }
        _deployReservedUnit(species, x, y) {
            let pick = null;
            for (const UNIT_LOCAL of this._benched) {
                if (
                    UNIT_LOCAL.species === species &&
                    hasFaction(UNIT_LOCAL, FACTION_CONFIG.PLAYER) &&
                    !UNIT_LOCAL.isBattleOnlySummon &&
                    UNIT_LOCAL.hp > 0 &&
                    (!pick || UNIT_LOCAL.tier > pick.tier || (UNIT_LOCAL.tier === pick.tier && UNIT_LOCAL.id < pick.id))
                ) {
                    pick = UNIT_LOCAL;
                }
            }
            if (!pick) {
                return false;
            }
            const AT = ARENA_GEOMETRY.clamp({ x, y }, this, 1);
            this._benched.delete(pick);
            this._benchRevision++;
            Object.assign(pick, {
                x: AT.x,
                y: AT.y,
                z: CONFIG.battle.dropHeight,
                vx: 0,
                vy: 0,
                vz: 0,
                dropLanded: false,
            });
            this._unitSpatialDirty = true;
            return true;
        }
        retreatFromFight() {
            if (this.farmBossEvent.phase === 'dropping') {
                this.farmBossEvent.phase = 'fighting';
                this.farmBossEvent.elapsed = 0;
            }
            return this.finishFarmBossEvent('defeat');
        }
        getBossAcquisitionChance({ farmEvent = false } = {}) {
            return bossAcquisitionChance({
                farmEvent,
            });
        }
        createBoss(species = BOSS_SPECIES, id = 'boss') {
            const BOSS = new UNIT(id, CLAMP(species, 0, CONFIG.unit.speciesCount - 1), 1, 0, 0, {
                statProfile: { maxHp: 2000, attackPower: 4, moveSpeed: CONFIG.boss.chaseSpeed },
                bodyProfile: {
                    radius: bossBodyRadius,
                    height: bossBodyHeight,
                    bodyHeight: bossTorsoHeight,
                    vectorScale: () => bossVectorScale(),
                },
                // Enlarging a weapon/hit area must not multiply body travel. Keep
                // the same shared attack clips, with a short grounded weight shift.
                attackMotionProfile: { groundOffsetLimit: 0.65, heightScale: 1 },
                controller: BossController,
            });
            BOSS.attachWorld(this);
            Object.assign(BOSS, {
                generation: ++this.entityGenerationSerial,
                faction: FACTION_CONFIG.ENEMY,
                ownerId: 'boss',
                growthElapsed: 1,
                growthDuration: 1,
                growth: CONFIG.farm.breeding.matureMeals,
                countsTowardPermanentRoster: false,
                breedingEligible: false,
                mergeEligible: false,
                canSplit: false,
                usesPersistentSleep: false,
                stage: 0,
                isFinalBoss: false,
                encounterId: 0,
                active: false,
                angle: 0,
                facing: 0,
                flash: 0,
                swings: 0,
                basicCount: 0,
                attackId: 0,
                sweepClock: 0,
                startAngle: 0,
                travel: 0,
                patternRuntime: createBossPatternRuntime(),
                stun: 0,
                knockVx: 0,
                knockVy: 0,
                airborneRecovery: 0,
                barleyArmorBreakUntil: 0,
                barleyArmorBreakReduction: 0,
                barleyArmorShredBuckets: createBarleyArmorShredBuckets(),
                summonMouth: {
                    x: 0,
                    y: 0,
                    z: 0,
                },
            });
            return BOSS;
        }
        bossHpRatioFor(boss) {
            const EDGE = this.tower.active ? CONFIG.farm.tower[this.tower.kind]?.edge || 0 : 0;
            return (boss.maxHp ? boss.hp / boss.maxHp : 1) - EDGE - (boss.isFinalBoss ? 0.25 : 0);
        }
        battleTimeLimit() {
            return 90 + 10 * Math.max(0, (this.boss.stage ?? 1) - 1);
        }
    };
