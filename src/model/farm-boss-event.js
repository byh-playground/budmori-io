import { SEED_SPECIES } from './lineage.js';
import { settleBossKill } from '../boss/boss-rewards.js';
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
                    BEST = this.playerProgression.towerBest,
                    KIND = CONFIG.farm.tower[this.tower.floor ? this.tower.kind : 'battle'];
                this.tower.record = EVENT_STAGE > BEST;
                if (this.tower.record) {
                    this.playerProgression.towerBest = EVENT_STAGE;
                }
                // Every boss is the plain sprout; its seed comes from the first-tier species.
                const DROP_SPECIES =
                        SEED_SPECIES[Math.floor(lineageRandom(this.seed, ENCOUNTER_ID, 3)() * SEED_SPECIES.length)],
                    SETTLEMENT = settleBossKill(this, {
                        encounterId: ENCOUNTER_ID,
                        source: 'farm',
                        stage: EVENT_STAGE,
                        species: DROP_SPECIES,
                        tier: 1,
                        kindReward: KIND.reward,
                        record: this.tower.record,
                    });
                const REWARD = SETTLEMENT.receipt;
                if (this.tower.rewardRunId) {
                    const OVERALL = awardTowerFloorXp(
                        this.playerProgression,
                        this.tower.rewardRunId,
                        EVENT_STAGE,
                        KIND.xpMultiplier,
                    );
                    this.playerProgression = OVERALL.state;
                    this.combat('tower-overall-xp', {
                        floor: EVENT_STAGE,
                        xp: OVERALL.xpAwarded,
                        levelsGained: OVERALL.levelsGained,
                    });
                }
                this.combat('farm-boss-reward', {
                    acquiredCount: REWARD.acquiredCount,
                    placedCount: REWARD.placedCount,
                    queuedCount: REWARD.queuedCount,
                    baseAmount: REWARD.baseAmount,
                    bandIndex: REWARD.bandIndex,
                    species: REWARD.species,
                    tier: REWARD.tier,
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
