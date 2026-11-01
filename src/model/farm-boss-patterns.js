import { CONFIG, STATS } from './farm-config.js';
import { FACTION_CONFIG, hasFaction, areOpposingFactions } from '../core/factions.js';
import { ARENA_GEOMETRY } from './arena-geometry.js';
import { Unit as UNIT } from './farm-unit.js';
import { bossAttackArea, BOSS_BEHAVIORS } from '../boss/boss-behaviors.js';
import {
    BOSS_PATTERN_IDS,
    BOSS_HIT_SPLIT,
    BOSS_PATTERN_CONFIG,
    BOSS_AREA_MIN_HITS,
    BOSS_ENRAGE,
} from '../boss/boss-patterns.js';
import { bossMouthWorldPoint } from '../render/boss-vector-sockets.js';
import { unitBodyRadius } from '../features/unit-body/definition.js';
import { elementDamageTaken } from './lineage.js';
import { applyDamageToTargets, resolveCritical, resolveUnitStats, unitMaxHpFor } from '../units/unit-stats.js';
import { runStatModifiers } from '../tower/tower-run.js';

export const FARM_BOSS_PATTERNS = (base) =>
    class FarmBossPatterns extends base {
        bossAttackArea(unitRadius = 0) {
            return bossAttackArea(this.boss, unitRadius, this);
        }
        livingBossTargets() {
            return this.units
                .filter((u) => hasFaction(u, FACTION_CONFIG.PLAYER) && u.hp > 0 && u.dropLanded)
                .sort((a, b) => a.id - b.id);
        }
        nearestBossTarget(living, groundOnly = false, boss = this.boss) {
            const B_LOCAL = boss;
            let best = null;
            let distance = Infinity;
            for (const UNIT_LOCAL of living) {
                if (groundOnly && UNIT_LOCAL.z > 0.1) {
                    continue;
                }
                const NEXT = Math.hypot(UNIT_LOCAL.x - B_LOCAL.x, UNIT_LOCAL.y - B_LOCAL.y);
                if (NEXT < distance || (NEXT === distance && (!best || UNIT_LOCAL.id < best.id))) {
                    best = UNIT_LOCAL;
                    distance = NEXT;
                }
            }
            return best;
        }
        bossTargetGrid(_living, boss = this.boss) {
            if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
                this._rebuildUnitSpatialIndex(this.units);
            }
            const B_LOCAL = boss,
                RANGE = CONFIG.unit.perceptionRange,
                EXTENT = RANGE + CONFIG.unit.maxRadius,
                UNITS = this._bossGridUnits,
                GROUND_UNITS = this._bossGroundUnits;
            UNITS.length = 0;
            GROUND_UNITS.length = 0;
            this.unitSpatial.queryAABB(
                B_LOCAL.x - EXTENT,
                B_LOCAL.y - EXTENT,
                B_LOCAL.x + EXTENT,
                B_LOCAL.y + EXTENT,
                this._bossQueryCandidates,
            );
            for (const UNIT_LOCAL of this._bossQueryCandidates) {
                if (
                    !this._unitIsActive(UNIT_LOCAL) ||
                    !hasFaction(UNIT_LOCAL, FACTION_CONFIG.PLAYER) ||
                    UNIT_LOCAL.hp <= 0 ||
                    !UNIT_LOCAL.dropLanded ||
                    Math.hypot(UNIT_LOCAL.x - B_LOCAL.x, UNIT_LOCAL.y - B_LOCAL.y) > RANGE + UNIT_LOCAL.radius
                ) {
                    continue;
                }
                UNITS.push(UNIT_LOCAL);
                if (UNIT_LOCAL.z <= 0.1) {
                    GROUND_UNITS.push(UNIT_LOCAL);
                }
            }
            UNITS.sort((a, c) => a.id - c.id);
            GROUND_UNITS.sort((a, c) => a.id - c.id);
            return {
                units: UNITS,
                groundUnits: GROUND_UNITS,
                cellSize: 3,
                range: RANGE,
            };
        }
        eachBossGridUnit(grid, minX, minY, maxX, maxY, visit, groundOnly = false, boss = this.boss) {
            this.unitSpatial.queryAABB(minX, minY, maxX, maxY, this._bossQueryCandidates);
            const B_LOCAL = boss;
            for (const UNIT_LOCAL of this._bossQueryCandidates) {
                if (
                    !this._unitIsActive(UNIT_LOCAL) ||
                    !hasFaction(UNIT_LOCAL, FACTION_CONFIG.PLAYER) ||
                    UNIT_LOCAL.hp <= 0 ||
                    !UNIT_LOCAL.dropLanded ||
                    (groundOnly && UNIT_LOCAL.z > 0.1) ||
                    Math.hypot(UNIT_LOCAL.x - B_LOCAL.x, UNIT_LOCAL.y - B_LOCAL.y) > grid.range + UNIT_LOCAL.radius
                ) {
                    continue;
                }
                visit(UNIT_LOCAL);
            }
        }
        chargeBossTarget(living, grid = null, boss = this.boss) {
            grid ||= this.bossTargetGrid(living, boss);
            const B_LOCAL = boss,
                CONFIG_LOCAL = BOSS_PATTERN_CONFIG['attack.charge'];
            if (!grid.units.length) {
                return null;
            }
            // Candidate routes are angularly bucketed, then each route is scored only
            // against occupants of the spatial cells intersecting its swept envelope.
            const BINS = 72,
                CANDIDATES = new Map();
            for (const UNIT_LOCAL of grid.units) {
                const DX = UNIT_LOCAL.x - B_LOCAL.x,
                    DY = UNIT_LOCAL.y - B_LOCAL.y,
                    D_LOCAL = Math.hypot(DX, DY),
                    ANGLE = Math.atan2(DY, DX),
                    BIN = Math.floor(((ANGLE + Math.PI) / (Math.PI * 2)) * BINS) % BINS,
                    CURRENT = CANDIDATES.get(BIN);
                if (
                    !CURRENT ||
                    D_LOCAL < CURRENT.distance - 1e-9 ||
                    (Math.abs(D_LOCAL - CURRENT.distance) <= 1e-9 && UNIT_LOCAL.id < CURRENT.unit.id)
                ) {
                    CANDIDATES.set(BIN, {
                        unit: UNIT_LOCAL,
                        distance: D_LOCAL,
                        angle: ANGLE,
                    });
                }
            }
            let best = null;
            for (const CANDIDATE of CANDIDATES.values()) {
                const END = ARENA_GEOMETRY.clamp(
                        {
                            x: B_LOCAL.x + Math.cos(CANDIDATE.angle) * CONFIG_LOCAL.reach,
                            y: B_LOCAL.y + Math.sin(CANDIDATE.angle) * CONFIG_LOCAL.reach,
                        },
                        this,
                        B_LOCAL.radius + 0.25,
                    ),
                    FROM = {
                        x: B_LOCAL.x,
                        y: B_LOCAL.y,
                        z: B_LOCAL.z,
                    },
                    TO = {
                        x: END.x,
                        y: END.y,
                        z: B_LOCAL.z,
                    },
                    EXTENT = B_LOCAL.radius + CONFIG.unit.maxRadius;
                let score = 0;
                this.eachBossGridUnit(
                    grid,
                    Math.min(FROM.x, TO.x) - EXTENT,
                    Math.min(FROM.y, TO.y) - EXTENT,
                    Math.max(FROM.x, TO.x) + EXTENT,
                    Math.max(FROM.y, TO.y) + EXTENT,
                    (unit) => {
                        if (ARENA_GEOMETRY.sweep(FROM, TO, B_LOCAL.radius, B_LOCAL.height, unit)) {
                            score++;
                        }
                    },
                    undefined,
                    boss,
                );
                if (
                    score &&
                    (!best ||
                        score > best.score ||
                        (score === best.score &&
                            (CANDIDATE.distance < best.distance - 1e-9 ||
                                (Math.abs(CANDIDATE.distance - best.distance) <= 1e-9 &&
                                    CANDIDATE.unit.id < best.unit.id))))
                ) {
                    best = {
                        ...CANDIDATE,
                        score,
                    };
                }
            }
            return best?.unit || null;
        }
        leapBossTarget(living, grid = null, boss = this.boss) {
            grid ||= this.bossTargetGrid(living, boss);
            const B_LOCAL = boss,
                CONFIG_LOCAL = BOSS_PATTERN_CONFIG['attack.leap-slam'];
            if (!grid.units.length) {
                return null;
            }
            // Leap candidates are clipped to the real maximum landing distance; score
            // the exact landing disk with a spatial-cell query, not a unit-pair pass.
            const CANDIDATES = new Map(),
                SIZE = grid.cellSize;
            for (const UNIT_LOCAL of grid.groundUnits) {
                let dx = UNIT_LOCAL.x - B_LOCAL.x;
                let dy = UNIT_LOCAL.y - B_LOCAL.y;
                const D_LOCAL = Math.hypot(dx, dy) || 1;
                if (D_LOCAL > CONFIG_LOCAL.reach) {
                    dx *= CONFIG_LOCAL.reach / D_LOCAL;
                    dy *= CONFIG_LOCAL.reach / D_LOCAL;
                }
                const POINT = ARENA_GEOMETRY.clamp(
                        {
                            x: B_LOCAL.x + dx,
                            y: B_LOCAL.y + dy,
                        },
                        this,
                        B_LOCAL.radius + 0.25,
                    ),
                    CELL_X = Math.floor(POINT.x / SIZE),
                    CELL_Y = Math.floor(POINT.y / SIZE),
                    KEY = (CELL_Y + 64) * 128 + (CELL_X + 64),
                    DISTANCE = Math.hypot(UNIT_LOCAL.x - B_LOCAL.x, UNIT_LOCAL.y - B_LOCAL.y),
                    CURRENT = CANDIDATES.get(KEY);
                if (
                    !CURRENT ||
                    DISTANCE < CURRENT.distance - 1e-9 ||
                    (Math.abs(DISTANCE - CURRENT.distance) <= 1e-9 && UNIT_LOCAL.id < CURRENT.unit.id)
                ) {
                    CANDIDATES.set(KEY, {
                        unit: UNIT_LOCAL,
                        distance: DISTANCE,
                        point: POINT,
                    });
                }
            }
            let best = null;
            for (const CANDIDATE of CANDIDATES.values()) {
                let score = 0;
                const EXTENT = CONFIG_LOCAL.landingRadius + CONFIG.unit.maxRadius;
                this.eachBossGridUnit(
                    grid,
                    CANDIDATE.point.x - EXTENT,
                    CANDIDATE.point.y - EXTENT,
                    CANDIDATE.point.x + EXTENT,
                    CANDIDATE.point.y + EXTENT,
                    (unit) => {
                        if (
                            Math.hypot(unit.x - CANDIDATE.point.x, unit.y - CANDIDATE.point.y) <=
                            CONFIG_LOCAL.landingRadius + unit.radius
                        ) {
                            score++;
                        }
                    },
                    true,
                    boss,
                );
                if (
                    score &&
                    (!best ||
                        score > best.score ||
                        (score === best.score &&
                            (CANDIDATE.distance < best.distance - 1e-9 ||
                                (Math.abs(CANDIDATE.distance - best.distance) <= 1e-9 &&
                                    CANDIDATE.unit.id < best.unit.id))))
                ) {
                    best = {
                        ...CANDIDATE,
                        score,
                    };
                }
            }
            return best?.unit || null;
        }
        bossPatternTargets(living, boss = this.boss) {
            const GRID = this.bossTargetGrid(living, boss);
            return {
                nearest: this.nearestBossTarget(living, true, boss),
                charge: this.chargeBossTarget(living, GRID, boss),
                leap: this.leapBossTarget(living, GRID, boss),
            };
        }
        bossTargetForPattern(id, living, boss = this.boss) {
            const BEHAVIOR = BOSS_BEHAVIORS.forId(id);
            return BEHAVIOR ? BEHAVIOR.target(this, living, boss) : this.nearestBossTarget(living, true, boss);
        }
        eligibleBossPatterns(living, targets = null, boss = this.boss) {
            targets ||= this.bossPatternTargets(living, boss);
            const RUNTIME = boss.patternRuntime,
                ALIVE_ADDS = this.units.reduce(
                    (n, u) => n + (hasFaction(u, FACTION_CONFIG.ENEMY) && u.hp > 0 ? 1 : 0),
                    0,
                ),
                ELIGIBLE = [];
            for (const ID of BOSS_PATTERN_IDS) {
                if (RUNTIME.cooldowns[ID] > 1e-9 || this.bossHpRatioFor(boss) > BOSS_PATTERN_CONFIG[ID].unlockHp) {
                    continue;
                }
                const BEHAVIOR = BOSS_BEHAVIORS.forId(ID);
                if (
                    BEHAVIOR.eligible(this, targets, ALIVE_ADDS, boss) &&
                    this.bossAttackWorthIt(BEHAVIOR, targets, boss)
                ) {
                    ELIGIBLE.push(ID);
                }
            }
            return ELIGIBLE;
        }
        bossAttackWorthIt(behavior, targets, boss = this.boss) {
            const HITS = behavior.expectedHits(this, targets, boss);
            return HITS === null || HITS >= BOSS_AREA_MIN_HITS;
        }
        bossWedgeContains(unit, range, aim, half, boss = this.boss) {
            const DX = unit.x - boss.x,
                DY = unit.y - boss.y,
                D_LOCAL = Math.hypot(DX, DY);
            if (D_LOCAL > range + unit.radius) {
                return false;
            }
            const BEARING = Math.atan2(DY, DX),
                OFFSET = Math.atan2(Math.sin(BEARING - aim), Math.cos(BEARING - aim)),
                PAD = D_LOCAL <= unit.radius ? Math.PI : Math.asin(Math.min(1, unit.radius / Math.max(D_LOCAL, 1e-6)));
            return Math.abs(OFFSET) <= half + PAD;
        }
        bossGroundUnitsNear(x, y, range, boss = this.boss) {
            const EXTENT = range + CONFIG.unit.maxRadius;
            return this._nearestBossFirst(
                this._collectBossTargets(x - EXTENT, y - EXTENT, x + EXTENT, y + EXTENT, this._bossHitCandidates, true),
                boss,
            ).filter((unit) => Math.hypot(unit.x - x, unit.y - y) <= range + unit.radius);
        }
        beginBossPattern(id, target, boss = this.boss) {
            const B_LOCAL = boss,
                RUNTIME = B_LOCAL.patternRuntime,
                CONFIG_LOCAL = BOSS_PATTERN_CONFIG[id];
            if (!CONFIG_LOCAL) {
                return false;
            }
            const TARGET_POINT = target
                    ? {
                          x: target.x,
                          y: target.y,
                          z: target.z || 0,
                      }
                    : null,
                AIM = TARGET_POINT ? Math.atan2(TARGET_POINT.y - B_LOCAL.y, TARGET_POINT.x - B_LOCAL.x) : B_LOCAL.angle;
            RUNTIME.active = {
                id,
                phase: 'windup',
                phaseElapsed: 0,
                targetId: target?.id ?? 0,
                target: TARGET_POINT,
                aim: AIM,
                locked: false,
                start: {
                    x: B_LOCAL.x,
                    y: B_LOCAL.y,
                    z: B_LOCAL.z,
                },
                traveled: 0,
                hitIds: new Set(),
                volleyCount: 0,
                released: 0,
                nextRelease: 0,
                path: null,
            };
            B_LOCAL.angle = AIM;
            B_LOCAL.facing = AIM;
            this.combat('boss-pattern-prepare', {
                patternId: id,
                attackKind: id,
                x: B_LOCAL.x,
                y: B_LOCAL.y,
                z: B_LOCAL.z,
                angle: AIM,
                targetId: RUNTIME.active.targetId,
            });
            return true;
        }
        hitBossPatternUnit(unit, patternId, point, normal = null, boss = this.boss, options = null) {
            return this.mutateUnits(this._hitBossPatternUnit, unit, patternId, point, normal, boss, options);
        }
        _hitBossPatternUnit(unit, patternId, point, normal = null, boss = this.boss, options = null) {
            const B_LOCAL = boss,
                ACTION = B_LOCAL.patternRuntime.active,
                CONFIG_LOCAL = BOSS_PATTERN_CONFIG[patternId];
            if (
                !ACTION ||
                !CONFIG_LOCAL ||
                !hasFaction(unit, FACTION_CONFIG.PLAYER) ||
                !areOpposingFactions(B_LOCAL, unit) ||
                unit.hp <= 0 ||
                !unit.dropLanded ||
                (ACTION.hitIds.has(unit.id) && !options?.repeat)
            ) {
                return false;
            }
            if (CONFIG_LOCAL.groundOnly && unit.z > 0.1) {
                return false;
            }
            ACTION.hitIds.add(unit.id);
            const DX = normal?.x ?? unit.x - B_LOCAL.x,
                DY = normal?.y ?? unit.y - B_LOCAL.y,
                N = Math.hypot(DX, DY) || 1;
            const GUARD = unit.ability.receiveGuard?.(this),
                KNOCKBACK_MULTIPLIER = GUARD?.receivedKnockbackMultiplier ?? 1;
            unit.knock(
                DX / N,
                DY / N,
                CONFIG_LOCAL.knockback * KNOCKBACK_MULTIPLIER,
                CONFIG_LOCAL.lift * KNOCKBACK_MULTIPLIER,
                B_LOCAL,
            );
            this._bossHitBatch.push({
                bossId: boss.id,
                unit,
                patternId,
                point: { x: point.x, y: point.y },
                nx: DX / N,
                ny: DY / N,
                guard: GUARD,
                scale: options?.scale ?? 1,
            });
            return true;
        }
        _settleBossHits(boss = this.boss) {
            const BATCH = this._bossHitBatch.filter((hit) => hit.bossId === boss.id),
                B_LOCAL = boss;
            if (!BATCH.length) {
                return;
            }
            const SHARE = BOSS_HIT_SPLIT.everyone + (1 - BOSS_HIT_SPLIT.everyone) / BATCH.length,
                STATS = resolveUnitStats(B_LOCAL),
                ACTION = B_LOCAL.patternRuntime.active;
            let criticalRoll = ACTION?.criticalRoll;
            const ROLL = () => {
                if (criticalRoll == null) {
                    criticalRoll = this.random();
                    if (ACTION) {
                        ACTION.criticalRoll = criticalRoll;
                    }
                }
                return criticalRoll;
            };
            const CRITICAL = STATS.critChance > 0 && resolveCritical(STATS, ROLL());
            for (const HIT of BATCH) {
                const UNIT_LOCAL = HIT.unit,
                    CONFIG_LOCAL = BOSS_PATTERN_CONFIG[HIT.patternId],
                    ELEMENT_TAKEN = CONFIG_LOCAL.element
                        ? elementDamageTaken(CONFIG_LOCAL.element, UNIT_LOCAL.genes)
                        : 1;
                const RAW_DAMAGE =
                    B_LOCAL.attackPower *
                    CONFIG_LOCAL.damageMultiplier *
                    SHARE *
                    (this.bossEnraged ? BOSS_ENRAGE.damageMultiplier : 1) *
                    (HIT.guard?.receivedDamageMultiplier ?? 1) *
                    HIT.scale *
                    ELEMENT_TAKEN *
                    this.passiveDamageScale(B_LOCAL, B_LOCAL.maxHp, UNIT_LOCAL, unitMaxHpFor(UNIT_LOCAL));
                // The guard observes this unit's allocated pre-armor damage once,
                // before lethal damage can clear its guard state.
                UNIT_LOCAL.ability?.receiveRawDamage?.(
                    this,
                    RAW_DAMAGE * (CRITICAL ? STATS.critMultiplier : 1),
                    B_LOCAL,
                    HIT,
                );
                const RECEIVED = applyDamageToTargets(B_LOCAL, [UNIT_LOCAL], {
                    armorForTarget: () => this.combatTargetDefense(UNIT_LOCAL).armor,
                    rawDamage: RAW_DAMAGE,
                    sourceKind: 'direct',
                    area: true,
                    roll: ROLL,
                });
                this.passiveUndying(UNIT_LOCAL);
                this.onCombatResolved.emit({
                    damageTaken: RECEIVED.totalActualLoss,
                    excluded: UNIT_LOCAL.isFormationClone,
                });
                if (!UNIT_LOCAL.isFormationClone) {
                    this.onCombatResolved.emit({
                        role: 'boss',
                        sourceFaction: 'enemy',
                        sourceActor: B_LOCAL.id,
                        targetFaction: UNIT_LOCAL.faction,
                        hits: 1,
                        critHits: RECEIVED.critical ? 1 : 0,
                        damageDealt: RECEIVED.totalActualLoss,
                    });
                }
                this._syncUnitAliveCount(UNIT_LOCAL);
                if (UNIT_LOCAL.hp === 0) {
                    UNIT_LOCAL.down = UNIT_LOCAL.isBattleOnlySummon ? 0 : CONFIG.unit.corpseRecoverySeconds;
                    this.handleUnitDeath(UNIT_LOCAL);
                }
                this.metrics.directHits++;
                this.metrics[BOSS_BEHAVIORS.forId(HIT.patternId).hitMetric]++;
                this.combat('unit-hit', {
                    attackKind: HIT.patternId,
                    attackId: B_LOCAL.attackId,
                    unit: UNIT_LOCAL.id,
                    x: HIT.point.x,
                    y: HIT.point.y,
                    z: Math.max(0.15, UNIT_LOCAL.z + 0.25),
                    nx: HIT.nx,
                    ny: HIT.ny,
                    strength: CONFIG_LOCAL.damageMultiplier * (RECEIVED.critical ? STATS.critMultiplier : 1),
                    sourceRadius: B_LOCAL.radius,
                    critical: RECEIVED.critical,
                    element: CONFIG_LOCAL.element || 0,
                    elementMultiplier: ELEMENT_TAKEN,
                });
            }
            this._bossHitBatch = this._bossHitBatch.filter((hit) => hit.bossId !== boss.id);
        }
        _nearestBossFirst(candidates, boss = this.boss) {
            const B_LOCAL = boss;
            return candidates.sort(
                (a, b) => Math.hypot(a.x - B_LOCAL.x, a.y - B_LOCAL.y) - Math.hypot(b.x - B_LOCAL.x, b.y - B_LOCAL.y),
            );
        }
        resolveBossWedge(action, patternId, range, from, to, limit = Infinity, boss = this.boss) {
            const B_LOCAL = boss,
                AIM = (from + to) / 2,
                HALF = (to - from) / 2;
            let hits = 0;
            const EXTENT = range + CONFIG.unit.maxRadius;
            for (const UNIT_LOCAL of this._nearestBossFirst(
                this._collectBossTargets(
                    B_LOCAL.x - EXTENT,
                    B_LOCAL.y - EXTENT,
                    B_LOCAL.x + EXTENT,
                    B_LOCAL.y + EXTENT,
                    this._bossHitCandidates,
                    true,
                ),
                boss,
            )) {
                if (hits >= limit) {
                    break;
                }
                if (action.hitIds.has(UNIT_LOCAL.id) || UNIT_LOCAL.z > 0.1) {
                    continue;
                }
                if (!this.bossWedgeContains(UNIT_LOCAL, range, AIM, HALF, boss)) {
                    continue;
                }
                const DX = UNIT_LOCAL.x - B_LOCAL.x,
                    DY = UNIT_LOCAL.y - B_LOCAL.y,
                    N = Math.hypot(DX, DY) || 1;
                if (
                    this.hitBossPatternUnit(
                        UNIT_LOCAL,
                        patternId,
                        {
                            x: UNIT_LOCAL.x,
                            y: UNIT_LOCAL.y,
                            z: 0,
                        },
                        {
                            x: DX / N,
                            y: DY / N,
                        },
                        boss,
                    )
                ) {
                    hits++;
                }
            }
            return hits;
        }
        sweepBossBody(old, patternId, boss = this.boss) {
            const B_LOCAL = boss,
                ACTION = B_LOCAL.patternRuntime.active,
                EXTENT = B_LOCAL.radius + CONFIG.unit.maxRadius;
            for (const UNIT_LOCAL of this._collectBossTargets(
                Math.min(old.x, B_LOCAL.x) - EXTENT,
                Math.min(old.y, B_LOCAL.y) - EXTENT,
                Math.max(old.x, B_LOCAL.x) + EXTENT,
                Math.max(old.y, B_LOCAL.y) + EXTENT,
                this._bossHitCandidates,
            )) {
                if (ACTION.hitIds.has(UNIT_LOCAL.id)) {
                    continue;
                }
                const HIT = ARENA_GEOMETRY.sweep(old, B_LOCAL, B_LOCAL.radius, B_LOCAL.height, UNIT_LOCAL);
                if (HIT) {
                    this.hitBossPatternUnit(
                        UNIT_LOCAL,
                        patternId,
                        HIT,
                        BOSS_BEHAVIORS.forId(patternId).sweepNormal(B_LOCAL),
                        boss,
                    );
                }
            }
        }
        bossMouthPoint(released, boss = this.boss) {
            return bossMouthWorldPoint(boss, released);
        }
        bossSummonLanding(angle, action = null, boss = this.boss) {
            const B_LOCAL = boss,
                SCENE = this,
                RADIUS = unitBodyRadius({ species: B_LOCAL.species, tier: 1, growthElapsed: 1, growthDuration: 1 });
            for (let i = 0; i < 16; i++) {
                const OFFSET = i === 0 ? 0 : ((i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI) / 8,
                    A_LOCAL = angle + OFFSET,
                    CANDIDATE = {
                        x: B_LOCAL.x + Math.cos(A_LOCAL) * BOSS_PATTERN_CONFIG['summon.mouth-t1'].landingRadius,
                        y: B_LOCAL.y + Math.sin(A_LOCAL) * BOSS_PATTERN_CONFIG['summon.mouth-t1'].landingRadius,
                    };
                if (!ARENA_GEOMETRY.inside(CANDIDATE, SCENE, RADIUS)) {
                    continue;
                }
                const BLOCKED =
                    this.units.some(
                        (unit) =>
                            unit.hp > 0 &&
                            Math.hypot(unit.x - CANDIDATE.x, unit.y - CANDIDATE.y) < RADIUS + unit.radius + 0.08,
                    ) ||
                    (action?.landingPoints || []).some(
                        (point) => Math.hypot(point.x - CANDIDATE.x, point.y - CANDIDATE.y) < RADIUS * 2 + 0.08,
                    );
                if (!BLOCKED) {
                    return CANDIDATE;
                }
            }
            return null;
        }
        spawnBossMouthUnit(action, boss = this.boss) {
            return this.mutateUnits(this._spawnBossMouthUnit, action, boss);
        }
        _spawnBossMouthUnit(action, boss = this.boss) {
            if (action.released >= action.volleyCount) {
                return false;
            }
            const B_LOCAL = boss,
                LANDING = this.bossSummonLanding(action.aim, action, boss);
            if (!LANDING) {
                return false;
            }
            const MOUTH = this.bossMouthPoint(action.released + 1, boss);
            const ID = CONFIG.boss.summonIdBase + ++this.bossSummonSerial,
                UNIT_LOCAL = new UNIT(ID, B_LOCAL.species, 1, MOUTH.x, MOUTH.y),
                ANGLE = Math.atan2(LANDING.y - MOUTH.y, LANDING.x - MOUTH.x),
                FLIGHT_SECONDS = Math.sqrt((2 * MOUTH.z) / CONFIG.physics.gravity),
                HORIZONTAL_DISTANCE = Math.hypot(LANDING.x - MOUTH.x, LANDING.y - MOUTH.y),
                DRAG = 0.8,
                SPEED = (HORIZONTAL_DISTANCE * DRAG) / (1 - Math.exp(-DRAG * FLIGHT_SECONDS));
            Object.assign(UNIT_LOCAL, {
                ownerId: 'boss',
                farmId: 0,
                faction: FACTION_CONFIG.ENEMY,
                home: {
                    x: MOUTH.x,
                    y: MOUTH.y,
                },
                hp: STATS(1, B_LOCAL.species).maxHp,
                down: 0,
                isBattleOnlySummon: true,
                battleSummonKind: 'boss-mouth-t1',
                battleSummonParentId: 0,
                battleSummonParentGeneration: 0,
                peanutInheritedPowerRank: 0,
                peanutInheritedSpeedRank: 0,
                battleSummonEncounterId: B_LOCAL.encounterId || 1,
                countsTowardPermanentRoster: false,
                breedingEligible: false,
                mergeEligible: false,
                canSplit: false,
                usesPersistentSleep: false,
                lifetime: 'until-death-or-battle-end',
                growthElapsed: UNIT_LOCAL.growthDuration,
                growth: CONFIG.farm.breeding.matureMeals,
                meals: 1,
                deathSplitHandled: false,
                splitUsedThisBattle: true,
                dropLanded: false,
                z: MOUTH.z,
                vx: Math.cos(ANGLE) * SPEED,
                vy: Math.sin(ANGLE) * SPEED,
                vz: 0,
                landingRecovery: 0,
                seed: ID * 2.39996,
            });
            UNIT_LOCAL.setStatModifiers(runStatModifiers(this.tower.active ? this.tower.bossCards : [], 'boss'));
            UNIT_LOCAL.setHealth(unitMaxHpFor(UNIT_LOCAL));
            this.addUnit(UNIT_LOCAL, { markProgress: false });
            action.released++;
            action.landingPoints ||= [];
            action.landingPoints.push(LANDING);
            boss.summonMouth = MOUTH;
            this.combat('boss-mouth-spit', {
                patternId: action.id,
                unit: ID,
                species: B_LOCAL.species,
                x: MOUTH.x,
                y: MOUTH.y,
                z: MOUTH.z,
                landingX: LANDING.x,
                landingY: LANDING.y,
                sequence: action.released,
            });
            return true;
        }
        activateBossPattern(action, boss = this.boss) {
            const B_LOCAL = boss,
                RUNTIME = B_LOCAL.patternRuntime,
                CONFIG_LOCAL = BOSS_PATTERN_CONFIG[action.id];
            action.phase = 'active';
            action.phaseElapsed = 0;
            B_LOCAL.attackId = ++this.attackSerial;
            action.hitIds.clear();
            RUNTIME.cooldowns[action.id] =
                CONFIG_LOCAL.cooldown * (this.bossEnraged ? BOSS_ENRAGE.cooldownMultiplier : 1);
            this.combat('boss-pattern-launch', {
                patternId: action.id,
                attackKind: action.id,
                attackId: B_LOCAL.attackId,
                x: B_LOCAL.x,
                y: B_LOCAL.y,
                z: B_LOCAL.z,
                angle: action.aim,
                targetId: action.targetId || 0,
            });
            BOSS_BEHAVIORS.forId(action.id).activate(this, action, boss);
        }
        enterBossPatternRecovery(action) {
            action.phase = 'recover';
            action.phaseElapsed = 0;
        }
    };
