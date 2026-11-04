import { hasFaction, FACTION_CONFIG, areOpposingFactions } from '../core/factions.js';
import { scaleMoveSpeed } from '../units/unit-stats.js';
import { ARENA_GEOMETRY } from './arena-geometry.js';
import { CONFIG } from './farm-config.js';
import { scatterHeading } from './army-scatter.js';
import { ARMY_COMMAND, BattleTurn } from './unit-turn.js';

const NO_BODIES = Object.freeze([]);

export const FARM_ARMY_BATTLE = (base) =>
    class FarmArmyBattle extends base {
        _armyThreatsForTick() {
            if (this._armyThreatTick !== this.simulationTick) {
                this._armyThreatTick = this.simulationTick;
                this._armyThreats.length = 0;
                for (const ACTOR of this.combatUnits()) {
                    if (ACTOR.hp > 0 && hasFaction(ACTOR, FACTION_CONFIG.ENEMY)) {
                        this._armyThreats.push(ACTOR);
                    }
                }
            }
            return this._armyThreats;
        }
        _retreatArmyUnit(unit, dt) {
            const THREATS = this._armyThreatsForTick();
            if (!THREATS.length) {
                unit.vx = unit.vy = 0;
                return;
            }
            this.retreatFrom(unit, dt, THREATS, scaleMoveSpeed(unit.bodyProfile ? 1 : 4.1, unit));
        }
        // Steers `unit` toward the reachable spot farthest from every threat (nearer threats push harder), never into
        // an `avoid` body. Returns false when no direction leads anywhere.
        retreatFrom(unit, dt, threats, speed, avoid = NO_BODIES) {
            let awayX = 0,
                awayY = 0;
            for (const THREAT of threats) {
                const DX = unit.x - THREAT.x,
                    DY = unit.y - THREAT.y,
                    LENGTH = Math.hypot(DX, DY) || 1,
                    GAP = Math.max(0.5, LENGTH - THREAT.radius - unit.radius),
                    WEIGHT = 1 / (GAP * GAP);
                awayX += (DX / LENGTH) * WEIGHT;
                awayY += (DY / LENGTH) * WEIGHT;
            }
            const DIRECTION =
                    Math.abs(awayX) + Math.abs(awayY) > 1e-6 ? Math.atan2(awayY, awayX) : unit.seed * Math.PI * 2,
                LOOK_AHEAD = Math.max(1.5, speed * 0.6);
            let bestScore = -Infinity,
                bestX = unit.x,
                bestY = unit.y;
            // Compare reachable directions, not an unreachable point beyond a wall.
            // Tangential candidates let troops escape walls and two-sided pressure.
            for (let index = 0; index < 12; index++) {
                const ANGLE = DIRECTION + (index * Math.PI) / 6,
                    POINT = ARENA_GEOMETRY.clamp(
                        { x: unit.x + Math.cos(ANGLE) * LOOK_AHEAD, y: unit.y + Math.sin(ANGLE) * LOOK_AHEAD },
                        this,
                        unit.radius + 0.1,
                    ),
                    TRAVEL = Math.hypot(POINT.x - unit.x, POINT.y - unit.y);
                if (
                    TRAVEL < 0.12 ||
                    avoid.some((body) => Math.hypot(POINT.x - body.x, POINT.y - body.y) < body.radius + unit.radius)
                ) {
                    continue;
                }
                let safety = Infinity;
                for (const THREAT of threats) {
                    safety = Math.min(safety, Math.hypot(POINT.x - THREAT.x, POINT.y - THREAT.y) - THREAT.radius);
                }
                const SCORE = safety + TRAVEL * 0.12 + Math.cos(ANGLE - DIRECTION) * 0.05;
                if (SCORE > bestScore) {
                    bestScore = SCORE;
                    bestX = POINT.x;
                    bestY = POINT.y;
                }
            }
            if (bestScore === -Infinity) {
                return false;
            }
            this.steer(unit, bestX, bestY, dt, speed);
            return true;
        }
        _prepareArmySpacing() {
            if (this._armySpacingTick !== this.simulationTick) {
                this._armySpacingTick = this.simulationTick;
                this._armySpacingRadius = 0;
                this._armySpacingRadii.clear();
                for (const ALLY of this.units) {
                    if (ALLY.hp > 0 && hasFaction(ALLY, FACTION_CONFIG.PLAYER)) {
                        const RADIUS = ALLY.radius;
                        this._armySpacingRadius = Math.max(this._armySpacingRadius, RADIUS);
                        this._armySpacingRadii.set(ALLY, RADIUS);
                    }
                }
            }
        }
        // Returns true when separation moved the unit this tick; false lets it engage normally.
        _scatterArmyUnit(unit, dt, enemy, attackDistance, recovering) {
            // An idle unit that already reaches the target attacks; steering would keep it moving and it
            // would never start an attack. Only the recovery after an attack is spent spreading.
            if (!recovering && enemy && Math.hypot(unit.x - enemy.x, unit.y - enemy.y) <= attackDistance) {
                return false;
            }
            this._prepareArmySpacing();
            const GAP = CONFIG.farm.deploy.scatterGap,
                QUERY_RADIUS = unit.radius + this._armySpacingRadius + GAP;
            this.unitSpatial.queryAABB(
                unit.x - QUERY_RADIUS,
                unit.y - QUERY_RADIUS,
                unit.x + QUERY_RADIUS,
                unit.y + QUERY_RADIUS,
                this._armySpacingNeighbors,
            );
            const HEADING = scatterHeading(
                unit,
                this._armySpacingNeighbors,
                GAP,
                enemy,
                attackDistance,
                this._armySpacingRadii,
                this._armyScatterHeading,
            );
            if (!HEADING) {
                return false;
            }
            const LENGTH = Math.hypot(HEADING.x, HEADING.y),
                BOUNDS = ARENA_GEOMETRY.bounds(this, unit.radius + 0.1),
                LOOK_AHEAD = GAP * 1.5,
                X = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, unit.x + (HEADING.x / LENGTH) * LOOK_AHEAD)),
                Y = Math.max(-BOUNDS.y, Math.min(BOUNDS.y, unit.y + (HEADING.y / LENGTH) * LOOK_AHEAD));
            this.steer(unit, X, Y, dt, scaleMoveSpeed(unit.bodyProfile ? 1 : 4.1, unit) * Math.min(1, LENGTH));
            return true;
        }
        get _battleTurn() {
            return (this._battleTurnRecord ??= new BattleTurn());
        }
        battleUnit(u, dt, enemy = null) {
            if (!u.dropLanded || (enemy && !areOpposingFactions(u, enemy))) {
                return;
            }
            if (u.hp <= 0) {
                u.down = CONFIG.unit.corpseRecoverySeconds;
                u.ability.interrupt();
                u.specialAbility?.interrupt();
                this.clearPeaRecoveryBoost(u);
                return;
            }
            const RETREAT =
                    this.tower.active && this.battleCommand === 'retreat' && hasFaction(u, FACTION_CONFIG.PLAYER),
                PARALLEL_GUARD = u.ability.guardAlongsideAttack?.(this);
            // Every tick, whatever the command: retreat drops a basic attack not yet fired, a guard that runs
            // alongside attacks starts, and the attack in progress plays on.
            if (RETREAT && u.ability.phase === 'windup') {
                u.ability.interrupt();
            }
            if (PARALLEL_GUARD && !RETREAT) {
                u.ability.tryStartGuard(this);
            }
            const ACTIVE_ATTACK = u.specialAbility && u.specialAbility.phase !== 'idle' ? u.specialAbility : u.ability;
            const ATTACK_BUSY = ACTIVE_ATTACK.update(this, dt);
            ARMY_COMMAND.decide(
                this._battleTurn.begin(this, u, dt, enemy, ACTIVE_ATTACK, ATTACK_BUSY, RETREAT, PARALLEL_GUARD),
            );
        }
    };
