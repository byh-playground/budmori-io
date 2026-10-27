import { SEED_SPECIES } from './lineage.js';
import { BOSS_REWARD_SETTINGS, bossStageStats, settleBossKill, bossSpeciesOwned } from '../boss/boss-rewards.js';
import { awardTowerFloorXp } from './player-progression.js';
import { CONFIG } from './farm-config.js';
import { lineageRandom } from './lineage.js';

export const FARM_BOSS_EVENT = (base) =>
    class FarmBossEvent extends base {
        finishFarmBossEvent(outcome) {
            return this.mutateUnits(this._finishFarmBossEvent, outcome);
        }
        _finishFarmBossEvent(outcome) {
            if (this.scene !== 'farm' || this.farmBossEvent.phase !== 'fighting') {
                return false;
            }
            if (outcome === 'victory' && this.bossEncounter && !this.bossEncounter.completed) {
                return false;
            }
            this.formationSkills.end();
            this.cleanupBattleSummons();
            // A cleared floor keeps the hand for the next one; any other ending sends everyone back to the farm.
            const SUMMIT =
                    outcome === 'victory' && this.tower.active && this.tower.floor === CONFIG.farm.tower.topFloor,
                CLIMBING = outcome === 'victory' && this.tower.active;
            if (!CLIMBING) {
                this._clearRunStats();
                this.tower.active = false;
                this.runProgressionSnapshot = null;
                this.tower.doors = [];
                this._benched.clear();
                this._benchRevision++;
                this._unitSpatialDirty = true;
            }
            for (const BOSS of this.bosses) {
                BOSS.active = false;
                BOSS.patternRuntime.active = null;
            }
            this.projectiles = [];
            this.chestnutAttacks = [];
            const ENCOUNTER_ID = this.farmBossEvent.encounterId;
            this.farmBossEvent = {
                phase: 'celebrating',
                elapsed: 0,
                outcome,
                encounterId: ENCOUNTER_ID,
                rewardStatus: 'none',
                rewardChance: 0,
                rewardRoll: 0,
                rewardUnitId: 0,
            };
            for (const U of this.units) {
                U.specialAbility?.interrupt();
                this.clearPeaRecoveryBoost(U);
                if (U.hp > 0) {
                    U.ability.interrupt();
                }
            }
            if (outcome === 'victory') {
                const REWARD_BOSS = this.bosses[0];
                const EVENT_STAGE = REWARD_BOSS.stage,
                    STAGE_STATS = bossStageStats(EVENT_STAGE),
                    BEST = this.playerProgression.towerBest,
                    KIND = CONFIG.farm.tower[this.tower.floor ? this.tower.kind : 'battle'];
                this.tower.record = EVENT_STAGE > BEST;
                if (this.tower.record) {
                    this.playerProgression.towerBest = EVENT_STAGE;
                }
                // Every win pays by its floor and kind; a floor higher than ever before pays double.
                const REWARD_SCALE = KIND.reward * (this.tower.record ? BOSS_REWARD_SETTINGS.recordMultiplier : 1),
                    // Every boss is the plain sprout, so the seed it drops, and the species whose mastery the win feeds,
                    // is drawn from the first-tier species.
                    DROP_SPECIES =
                        SEED_SPECIES[Math.floor(lineageRandom(this.seed, ENCOUNTER_ID, 3)() * SEED_SPECIES.length)],
                    FIRST_CLEAR = !bossSpeciesOwned(this, DROP_SPECIES),
                    SETTLEMENT = settleBossKill(this, {
                        encounterId: ENCOUNTER_ID,
                        source: 'farm',
                        stage: EVENT_STAGE,
                        species: DROP_SPECIES,
                        tier: 1,
                        x: REWARD_BOSS.x,
                        y: REWARD_BOSS.y,
                        firstClear: FIRST_CLEAR,
                        rollBudget: STAGE_STATS.rollBudget * REWARD_SCALE,
                        xpAmount: STAGE_STATS.xp * REWARD_SCALE,
                    });
                const REWARD = SETTLEMENT.receipt;
                if (this.tower.rewardRunId) {
                    const OVERALL = awardTowerFloorXp(
                        this.playerProgression,
                        this.tower.rewardRunId,
                        EVENT_STAGE,
                        KIND.reward,
                    );
                    this.playerProgression = OVERALL.state;
                    this.combat('tower-overall-xp', {
                        floor: EVENT_STAGE,
                        xp: OVERALL.xpAwarded,
                        levelsGained: OVERALL.levelsGained,
                    });
                }
                this.combat('farm-boss-xp', {
                    encounterId: ENCOUNTER_ID,
                    species: DROP_SPECIES,
                    xp: SETTLEMENT.xpAwarded,
                    levelsGained: SETTLEMENT.levelsGained,
                    pointsAwarded: SETTLEMENT.pointsAwarded,
                });
                this.combat('farm-boss-reward', {
                    acquired: REWARD.grantedCount > 0,
                    pending: REWARD.status === 'pending',
                    successCount: REWARD.successCount,
                    grantedCount: REWARD.grantedCount,
                    species: REWARD.species,
                    tier: REWARD.tier,
                    chance: REWARD.chance,
                    roll: REWARD.roll,
                    encounterId: ENCOUNTER_ID,
                });
            }
            if (SUMMIT) {
                this.tower.phase = 'summit';
                this.tower.summitElapsed = 0;
            }
            this.markProgressChanged();
            this.combat(outcome === 'victory' ? 'farm-boss-victory' : 'farm-boss-defeat', {
                x: this.boss.x,
                y: this.boss.y,
                z: 0,
            });
            return true;
        }
    };
