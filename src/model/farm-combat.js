import { DEFINITION as GIANT_SKILL } from '../features/formation-skills/giant/definition.js';
import { PROJECTILE_BEHAVIORS } from './projectile-behaviors.js';

import { hasFaction, FACTION_CONFIG, areOpposingFactions } from '../core/factions.js';
import { abilityProfile } from '../units/unit-abilities.js';
import { kitSpecies } from '../units/species-catalog.js';
import { BOSS_BASIC_KNOCK } from '../boss/boss-patterns.js';

// What a basic hit between two units does to its target.
const UNIT_BASIC_KNOCK = Object.freeze({ power: 5, lift: 2.4 });
import { CREATE_UNIT_ATTACK_CYCLE } from '../units/attack-cycle.js';
import { resolveUnitStats, applyDamageToTargets, resolveCritical } from '../units/unit-stats.js';
import { BarleyArmorShredModel } from '../features/abilities/barley-shred/model.js';
import { CLAMP, CONFIG } from './farm-config.js';
import { elementOf, elementHitScale, elementMultiplier } from './lineage.js';
import { towerElement } from '../tower/tower-theme.js';

export const FARM_COMBAT = (base) =>
    class FarmCombat extends base {
        // Only the player's coloured units carry an element into a fight; everyone else attacks plain.
        // A shot whose shooter already fell carries a source snapshot without genes; the shooter's body still has them.
        attackElement(unit) {
            if (unit.faction !== FACTION_CONFIG.PLAYER) {
                return 0;
            }
            const GENES = unit.genes ?? this._unitForId(unit.id)?.genes;
            return GENES ? elementOf(GENES) : 0;
        }
        combatEvent(kind, u, action, cycle = u.ability) {
            this.combatLog.push({
                kind,
                id: action?.id ?? 0,
                unit: u.id,
                species: u.species,
                time: this.time,
                x: u.x,
                y: u.y,
                z: u.z,
            });
            if (this.combatLog.length > 240) {
                this.combatLog.shift();
            }
            if (kind === 'launch') {
                this.combat('attack-launch', {
                    species: u.species,
                    unit: u.id,
                    x: u.x,
                    y: u.y,
                    z: u.z,
                    attackKind: cycle?.spec?.kind || abilityProfile(kitSpecies(u)).kind,
                });
                cycle?.onLaunch?.(this, action);
            }
        }
        riceCriticalChanceBonus(u, hpBefore, maxHp) {
            return (u.ability || CREATE_UNIT_ATTACK_CYCLE(u)).criticalChanceBonus?.(this, hpBefore, maxHp) ?? 0;
        }
        applyGrainOnBasicHit(u, target, kind) {
            if (!hasFaction(u, FACTION_CONFIG.PLAYER) || kind !== abilityProfile(kitSpecies(u)).kind) {
                return;
            }
            (u.ability || CREATE_UNIT_ATTACK_CYCLE(u)).onBasicHit?.(this, target);
        }
        attackTarget(unit, action) {
            const TARGET = this._unitForId(action.targetId);
            return TARGET?.generation === action.targetGeneration && TARGET.hp > 0 && areOpposingFactions(unit, TARGET)
                ? TARGET
                : null;
        }
        unitStatsFor(unit) {
            return resolveUnitStats(unit);
        }
        combatTargetDefense(target) {
            const STATS = resolveUnitStats(target),
                ABILITY_ARMOR = target.ability?.armorModifier?.(this, this.simulationTick) || 0,
                ROLE_ARMOR = target.controller?.armorModifier?.() || 0;
            return {
                maxHp: STATS.maxHp,
                armor: BarleyArmorShredModel.effectiveArmor(
                    target,
                    STATS.armor,
                    (target.giantUntil > this.time ? GIANT_SKILL.armorBonus : 0) + ABILITY_ARMOR + ROLE_ARMOR,
                    this.simulationTick,
                ),
            };
        }
        damageCombatTarget(u, action, target, point, options = {}) {
            return this.mutateUnits(this._damageCombatTarget, u, action, target, point, options);
        }
        _damageCombatTarget(u, action, target, point, options = {}) {
            const IS_BOSS = this.isBoss(target);
            if (
                !target ||
                target.hp <= 0 ||
                !areOpposingFactions(u, target) ||
                action.hit ||
                (IS_BOSS && !hasFaction(u, FACTION_CONFIG.PLAYER)) ||
                options.attackContext?.hitTargets?.has(target)
            ) {
                return false;
            }
            action.hit = true;
            const CONTEXT = options.attackContext || this.createAttackContext(u, options),
                {
                    source: SOURCE,
                    attackerStats: ATTACKER_STATS,
                    damageMultiplier: DAMAGE_MULTIPLIER,
                    kind: KIND,
                } = CONTEXT;
            CONTEXT.hitTargets?.add(target);
            const DEFENSE = this.combatTargetDefense(target),
                CRITICAL_BONUS =
                    KIND === abilityProfile(kitSpecies(SOURCE)).kind
                        ? this.riceCriticalChanceBonus(SOURCE, target.hp, DEFENSE.maxHp)
                        : 0,
                SOURCE_STAT_OVERRIDES = {
                    ...CONTEXT.sourceStatOverrides,
                    critChance:
                        CONTEXT.criticalChanceSnapshot ?? CLAMP(ATTACKER_STATS.critChance + CRITICAL_BONUS, 0, 1),
                };
            // A coloured unit's hit against the floor band's enemies carries element damage.
            const HIT_ELEMENT = target.faction === FACTION_CONFIG.ENEMY ? this.attackElement(SOURCE) : 0,
                ELEMENT_SCALE = elementHitScale(HIT_ELEMENT, towerElement(this.tower.floor)),
                RAW_BASE_DAMAGE =
                    ATTACKER_STATS.attackPower *
                    (CONTEXT.attackPowerMultiplier ?? 1) *
                    DAMAGE_MULTIPLIER *
                    ELEMENT_SCALE,
                ORIGINAL_RAW_DAMAGE = Number.isFinite(CONTEXT.sourceDamageScale)
                    ? (RAW_BASE_DAMAGE * CONTEXT.sourceDamageScale + (CONTEXT.rawDamageBonus || 0)) *
                      this.passiveReceivedScale(target, DEFENSE.maxHp)
                    : (RAW_BASE_DAMAGE + (SOURCE.ability?.rawDamageBonus?.(this, action, KIND) || 0)) *
                      this.passiveDamageScale(SOURCE, ATTACKER_STATS.maxHp, target, DEFENSE.maxHp);
            // A giant adds one unscaled cycle budget, distributed by the authored strike weights.
            // Crit/element/grade/source bonuses strengthen the original hit only; defense still affects both parts.
            const GIANT_BONUS =
                    Math.max(0, CONTEXT.giantBonusDamage || 0) * this.passiveReceivedScale(target, DEFENSE.maxHp),
                CRIT_SCALE =
                    GIANT_BONUS > 0 &&
                    SOURCE_STAT_OVERRIDES.critChance > 0 &&
                    resolveCritical(
                        SOURCE_STAT_OVERRIDES,
                        CONTEXT.criticalRoll ?? (CONTEXT.criticalRoll = this.random()),
                    )
                        ? Math.max(1, SOURCE_STAT_OVERRIDES.critMultiplier ?? ATTACKER_STATS.critMultiplier ?? 1)
                        : 1,
                RAW_DAMAGE = ORIGINAL_RAW_DAMAGE + GIANT_BONUS / CRIT_SCALE;
            // The context belongs to one attack, so a mixed boss/unit area hit shares
            // one lazy roll while each target retains its own armor and actual HP loss.
            const DAMAGE = applyDamageToTargets(SOURCE, [target], {
                rawDamage: RAW_DAMAGE,
                area: CONTEXT.area,
                sourceKind: CONTEXT.sourceKind,
                sourceStatOverrides: SOURCE_STAT_OVERRIDES,
                armorForTarget: () => DEFENSE.armor,
                roll: () => CONTEXT.criticalRoll ?? (CONTEXT.criticalRoll = this.random()),
            });
            if (!IS_BOSS) {
                this.passiveUndying(target);
            }
            const CRITICAL_RAW_DAMAGE =
                RAW_DAMAGE *
                (DAMAGE.critical ? (SOURCE_STAT_OVERRIDES.critMultiplier ?? ATTACKER_STATS.critMultiplier ?? 1) : 1);
            target.ability?.receiveRawDamage?.(this, CRITICAL_RAW_DAMAGE, SOURCE, action);
            if (!IS_BOSS) {
                this._syncUnitAliveCount(target);
            }
            for (const [ROLE, FACTION] of [
                ['player', FACTION_CONFIG.PLAYER],
                ['boss', FACTION_CONFIG.ENEMY],
            ]) {
                this.onCombatResolved.emit({
                    role: ROLE,
                    sourceFaction: SOURCE.faction,
                    sourceActor: SOURCE.id,
                    targetActor: target.id,
                    targetFaction: target.faction,
                    excluded: SOURCE.isFormationClone || (ROLE === 'boss' && target.isFormationClone),
                    damageDealt:
                        SOURCE.faction === FACTION && RAW_DAMAGE > 0
                            ? (DAMAGE.totalActualLoss * ORIGINAL_RAW_DAMAGE) / RAW_DAMAGE
                            : 0,
                    damageTaken: target.faction === FACTION && !target.isFormationClone ? DAMAGE.totalActualLoss : 0,
                    hits: SOURCE.faction === FACTION ? 1 : 0,
                    critHits: SOURCE.faction === FACTION && DAMAGE.critical ? 1 : 0,
                });
            }
            if (!options.suppressBasicProc) {
                this.applyGrainOnBasicHit(SOURCE, target, KIND);
                SOURCE.ability?.afterSuccessfulAttack?.(this, action, target, DAMAGE);
            }
            const STRENGTH = DAMAGE_MULTIPLIER * (DAMAGE.critical ? ATTACKER_STATS.critMultiplier : 1);
            if (IS_BOSS) {
                this.finishBossHit(SOURCE, action, target, point, CONTEXT, DAMAGE, STRENGTH, HIT_ELEMENT);
            } else {
                this.finishUnitHit(SOURCE, action, target, point, CONTEXT, DAMAGE, STRENGTH);
            }
            return true;
        }
        finishBossHit(u, action, boss, point, { kind, strikeIndex, buffed }, damage, strength, element) {
            if (boss.hp <= 0) {
                this.handleUnitDeath(boss);
            }
            boss.flash = 0.13;
            const DX = point.x - boss.x,
                DY = point.y - boss.y,
                D_LOCAL = Math.hypot(DX, DY) || 1;
            this.combat('boss-hit', {
                targetId: boss.id,
                unit: u.id,
                ownerId: u.ownerId,
                species: u.species,
                attackId: action.id,
                strikeIndex,
                attackKind: kind,
                buffed,
                critical: damage.critical,
                damage: damage.totalActualLoss,
                element,
                elementMultiplier: element ? elementMultiplier(element, towerElement(this.tower.floor)) : 1,
                x: boss.x + (DX / D_LOCAL) * boss.radius,
                y: boss.y + (DY / D_LOCAL) * boss.radius,
                z: CLAMP(point.z + 0.2, 0.2, boss.height),
                nx: DX / D_LOCAL,
                ny: DY / D_LOCAL,
                strength,
                // The spark is as big as the body that struck, at the shared skill size contract.
                sourceRadius: u.radius,
            });
            this.combatEvent('damage', u, action);
        }
        finishUnitHit(u, action, target, point, { kind, strikeIndex }, damage, strength) {
            const DX = target.x - u.x,
                DY = target.y - u.y,
                N = Math.hypot(DX, DY) || 1;
            const KNOCK = this.isBoss(u) ? BOSS_BASIC_KNOCK : UNIT_BASIC_KNOCK;
            target.knock(DX / N, DY / N, KNOCK.power, KNOCK.lift, u);
            if (target.hp === 0) {
                target.down = target.isBattleOnlySummon ? 0 : CONFIG.unit.corpseRecoverySeconds;
                this.handleUnitDeath(target);
            }
            this.metrics.directHits++;
            this.metrics.basicHits++;
            this.combat('unit-hit', {
                attackKind: kind,
                attackId: action.id,
                strikeIndex,
                unit: target.id,
                sourceUnit: u.id,
                damage: damage.totalActualLoss,
                critical: !!damage?.critical,
                x: point.x,
                y: point.y,
                z: Math.max(0.15, target.z + 0.25),
                nx: DX / N,
                ny: DY / N,
                strength,
                sourceRadius: u.radius,
            });
        }
        updateProjectiles(dt) {
            const BATCH = !this._spatialStepActive;
            if (BATCH) {
                this._beginSpatialQueryBatch();
            }
            try {
                for (const PROJECTILE of this.projectiles) {
                    const BEHAVIOR = PROJECTILE_BEHAVIORS.forProjectile(PROJECTILE);
                    if (!this._spatialStepActive) {
                        BEHAVIOR.advanceLifecycle(this, PROJECTILE, dt);
                    }
                    if (BEHAVIOR.isAlive(PROJECTILE)) {
                        BEHAVIOR.update(this, PROJECTILE, dt);
                    }
                }
                // Preserve the second-pass chain ordering after every flight update.
                for (const PROJECTILE of this.projectiles) {
                    PROJECTILE_BEHAVIORS.forProjectile(PROJECTILE).updateChain(this, PROJECTILE);
                }

                for (const BOSS of this.bosses) {
                    BOSS.flash = Math.max(0, (BOSS.flash || 0) - dt);
                }
            } finally {
                if (BATCH) {
                    this._endSpatialQueryBatch();
                }
            }
        }
    };
