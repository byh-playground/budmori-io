import { SIMULATION_SCENES } from './simulation-scenes.js';
import { FACTION_CONFIG, hasFaction } from '../core/factions.js';
import { TEMPERAMENT_PASSIVE_IDS } from './lineage.js';
import { passiveCard, PASSIVE_SETTINGS } from '../tower/tower-run.js';
import { unitMaxHpFor, applyHealing, resolveUnitStats } from '../units/unit-stats.js';
import { CONFIG } from './farm-config.js';
import { Unit as UNIT } from './farm-unit.js';
import { CornAttachmentModel } from '../features/abilities/corn-attachment/model.js';

export const FARM_UNIT_LIFE = (base) =>
    class FarmUnitLife extends base {
        handleUnitDeath(unit) {
            return this.mutateUnits(this._handleUnitDeath, unit);
        }
        _handleUnitDeath(unit) {
            if (this.isBoss(unit)) {
                return unit.hp <= 0 && unit.die();
            }
            if (!this.unitCollection.has(unit)) {
                return false;
            }
            const SPLIT_BEFORE = unit.splitUsedThisBattle,
                DIED = unit.die();
            return DIED && !SPLIT_BEFORE && unit.splitUsedThisBattle;
        }
        processUnitDeath(unit) {
            return this.mutateUnits(this._processUnitDeath, unit);
        }
        passiveState(unit) {
            if (unit.faction === FACTION_CONFIG.ENEMY) {
                return { totals: this.tower.bossPassives, fallen: this.tower.bossFallen };
            }
            return { totals: this._temperamentTotals(unit.temperament), fallen: this.tower.fallen };
        }
        _temperamentTotals(temperament) {
            const TOTALS = this.tower.passives;
            if (this._temperamentTotalsSource !== TOTALS) {
                this._temperamentTotalsSource = TOTALS;
                this._temperamentTotalsByKind = TEMPERAMENT_PASSIVE_IDS.map((id) => ({
                    ...TOTALS,
                    [id]: (TOTALS[id] || 0) + passiveCard(id).values[0],
                }));
            }
            return this._temperamentTotalsByKind[temperament] ?? TOTALS;
        }
        passiveAttackScale(source, sourceMaxHp) {
            const TOWER = this.tower;
            if (!TOWER.active) {
                return 1;
            }
            const { totals: TOTALS, fallen: FALLEN } = this.passiveState(source),
                SETTINGS = PASSIVE_SETTINGS;
            let scale = 1;
            scale +=
                (source.hp <= sourceMaxHp * SETTINGS.lastStandBelow ? TOTALS['last-stand'] || 0 : 0) +
                (this.farmBossEvent.elapsed <= SETTINGS.openingSeconds ? TOTALS.opening || 0 : 0) +
                (TOTALS.vengeance || 0) * Math.min(FALLEN, SETTINGS.vengeanceMaxFallen);
            return scale;
        }
        passiveDamageScale(source, sourceMaxHp, target, targetMaxHp) {
            return this.passiveAttackScale(source, sourceMaxHp) * this.passiveReceivedScale(target, targetMaxHp);
        }
        passiveReceivedScale(unit, maxHp = unitMaxHpFor(unit)) {
            const TOWER = this.tower;
            if (!TOWER.active || unit.hp > maxHp * PASSIVE_SETTINGS.resolveBelow) {
                return 1;
            }
            return 1 - Math.min(PASSIVE_SETTINGS.resolveMaxReduction, this.passiveState(unit).totals.resolve || 0);
        }
        passiveUndying(unit) {
            const TOWER = this.tower,
                RESTORE = TOWER.passives.undying;
            if (
                !TOWER.active ||
                !RESTORE ||
                unit.hp > 0 ||
                !hasFaction(unit, FACTION_CONFIG.PLAYER) ||
                unit.isBattleOnlySummon ||
                TOWER.undyingUsed.has(unit.id)
            ) {
                return;
            }
            TOWER.undyingUsed.add(unit.id);
            unit.hp = Math.max(1, unitMaxHpFor(unit) * Math.min(PASSIVE_SETTINGS.undyingMaxRestore, RESTORE));
            this.combat('passive-undying', {
                unit: unit.id,
                x: unit.x,
                y: unit.y,
                z: unit.z,
                radius: unit.radius,
                height: unit.height,
            });
        }
        passiveAllyFell(unit) {
            const TOWER = this.tower;
            if (
                !TOWER.active ||
                unit.isFormationClone ||
                (unit.isBattleOnlySummon && unit.battleSummonKind !== 'boss-mouth-t1')
            ) {
                return;
            }
            const ENEMY = unit.faction === FACTION_CONFIG.ENEMY;
            TOWER[ENEMY ? 'bossFallen' : 'fallen']++;
            const TOTALS = this.passiveState(unit).totals,
                HEAL = TOTALS.helper || 0,
                VENGEANCE = TOTALS.vengeance || 0;
            if (!HEAL && !VENGEANCE) {
                return;
            }
            const NEAR = [...this.bosses, ...this.unitCollection.items]
                .filter(
                    (other) =>
                        other !== unit &&
                        other.hp > 0 &&
                        !other.isFormationClone &&
                        (!this.isBoss(other) || other.active) &&
                        (ENEMY || !other.isBattleOnlySummon) &&
                        other.faction === unit.faction &&
                        Math.hypot(other.x - unit.x, other.y - unit.y) <= PASSIVE_SETTINGS.helperRadius,
                )
                .sort(
                    (a, b) =>
                        Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y) || a.id - b.id,
                );
            if (HEAL) {
                for (const OTHER of NEAR) {
                    applyHealing(OTHER, unitMaxHpFor(OTHER) * HEAL);
                }
            }
            const TARGETS = NEAR.slice(0, 6).map((other) => ({
                x: other.x,
                y: other.y,
                z: other.z,
                height: other.height,
            }));
            for (const KIND of [HEAL && 'passive-helper', VENGEANCE && 'passive-vengeance']) {
                if (KIND) {
                    this.combat(KIND, { x: unit.x, y: unit.y, z: unit.z, height: unit.height, targets: TARGETS });
                }
            }
        }
        _processUnitDeath(unit) {
            this.passiveAllyFell(unit);
            unit.ability.interrupt();
            unit.specialAbility?.interrupt();
            unit.ability.resetCombatEffects?.();
            this.clearPeaRecoveryBoost(unit);
            this.onCombatResolved.emit({
                allyDeaths:
                    !unit.isFormationClone && (!unit.isBattleOnlySummon || unit.battleSummonKind === 'boss-mouth-t1')
                        ? 1
                        : 0,
                role: unit.faction === FACTION_CONFIG.ENEMY ? 'boss' : 'player',
                sourceFaction: unit.faction,
                targetFaction: unit.faction,
            });
            this._syncUnitAliveCount(unit);
            if (!unit.isBattleOnlySummon) {
                this.markProgressChanged();
            }
            if (unit.isBattleOnlySummon) {
                if (unit.isFormationClone) {
                    this.emit('formation-copy-death', unit.x, unit.y, unit.z, { duration: 0.6 });
                }
                unit.down = 0;
                this.removeUnit(unit, { keepStepSnapshot: true });
                return false;
            }
            const IN_BATTLE = SIMULATION_SCENES[this.scene].inBattle(this);
            const DESCRIPTORS = unit.ability.deathSplitDescriptors?.(this, IN_BATTLE) || [];
            if (!DESCRIPTORS.length) {
                return false;
            }
            unit.splitUsedThisBattle = true;
            unit.down = CONFIG.unit.corpseRecoverySeconds;
            for (let index = 0; index < DESCRIPTORS.length; index++) {
                const DESC = DESCRIPTORS[index],
                    ANGLE = ((index + 0.5) * Math.PI * 2) / DESCRIPTORS.length,
                    ID = SIMULATION_SCENES[this.scene].summonId(this);
                const X = unit.x + Math.cos(ANGLE) * 0.38,
                    Y = unit.y + Math.sin(ANGLE) * 0.38,
                    CHILD = new UNIT(ID, DESC.species, DESC.tier, X, Y);
                Object.assign(CHILD, DESC, {
                    ownerId: unit.ownerId,
                    farmId: unit.farmId,
                    home: {
                        x: X,
                        y: Y,
                    },
                    down: 0,
                    generation: ++this.entityGenerationSerial,
                    growthElapsed: CHILD.growthDuration,
                    growth: CONFIG.farm.breeding.matureMeals,
                    meals: 1,
                    dropLanded: true,
                    deathSplitHandled: false,
                });
                CHILD.hp = resolveUnitStats(CHILD).maxHp;
                this.addUnit(CHILD, { markProgress: false });
            }
            const EFFECT_ID = ++this.eventSequence;
            this.effects.push({
                kind: 'peanut-split',
                eventId: EFFECT_ID,
                owner: unit.id,
                ownerGeneration: unit.generation,
                species: unit.species,
                x: unit.x,
                y: unit.y,
                z: 0,
                life: 0,
                duration: 0.7,
            });
            this.combat('peanut-split', {
                effectId: EFFECT_ID,
                unit: unit.id,
                ownerId: unit.ownerId,
                species: unit.species,
                count: DESCRIPTORS.length,
                x: unit.x,
                y: unit.y,
            });
            return true;
        }
        processUnitRevival(unit) {
            return this.mutateUnits(this._processUnitRevival, unit);
        }
        _processUnitRevival(unit) {
            this._syncUnitAliveCount(unit);
            this.combat('unit-recover', { unit: unit.id, x: unit.x, y: unit.y });
            this.markProgressChanged();
        }
        cleanupBattleSummons() {
            return this.mutateUnits(this._cleanupBattleSummons);
        }
        _cleanupBattleSummons() {
            for (const BOSS of this.bosses) {
                BOSS.ability.interrupt();
                BOSS.specialAbility?.interrupt();
                BOSS.ability.resetCombatEffects?.();
            }
            for (const UNIT_LOCAL of this.units) {
                if (!UNIT_LOCAL.isBattleOnlySummon) {
                    UNIT_LOCAL.ability.resetCombatEffects?.();
                }
            }
            this.unitCollection.removeWhere((unit) => unit.isBattleOnlySummon);
            this.projectiles = [];
            this.chestnutAttacks = [];
            this.cornAttachments = CornAttachmentModel.createManager();
            return true;
        }
    };
