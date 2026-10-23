import { createCornAttack, launchCornAttack } from '../../species-growth/corn-attack.js';

export function createLobAttackMixin(pathMotion) {
    const PATH_MOTION = pathMotion;
    const PROJECTILE_ATTACK = (base) =>
        class extends PATH_MOTION(base) {
            prepareAttack(sim) {
                super.prepareAttack?.(sim);
                const RECORD = createCornAttack(sim, this.owner, this.action, this.attackSpeedMultiplier(sim));
                if (RECORD) {
                    this.action.cornAttack = RECORD;
                }
            }
            attackWindupSeconds(sim) {
                return (
                    this.action?.cornAttack?.windupSeconds ??
                    super.attackWindupSeconds?.(sim) ??
                    this.spec.timing.windup
                );
            }
            attackRecoverySeconds(sim) {
                return this.action?.cornAttack?.recoverySeconds ?? super.attackRecoverySeconds(sim);
            }
            syncAttackSpeedMultiplier(tick) {
                if (!this.action?.cornAttack) {
                    super.syncAttackSpeedMultiplier(tick);
                }
            }
            projectileShots() {
                return [
                    {
                        shotIndex: 0,
                        delaySeconds: 0,
                        attackMultiplier: this.spec.skillMultiplier,
                    },
                ];
            }
            launchAttack(sim) {
                super.launchAttack?.(sim);
                if (this.action?.cornAttack) {
                    launchCornAttack(sim, this.owner, this.action);
                    this.recover(sim, true);
                    return;
                }
                const U = this.owner,
                    A = this.action,
                    PROJECTILE_EFFECT = this.projectileEffect?.(sim) || null,
                    SHOTS = this.projectileShots(sim);
                A.pendingShots = SHOTS.slice(1);
                A.projectileAbility = {
                    effect: PROJECTILE_EFFECT,
                };
                sim.spawnLobProjectile(U, A, SHOTS[0], PROJECTILE_EFFECT);
                this.recover(sim, true);
            }
            updateRecovery(sim) {
                super.updateRecovery?.(sim);
                const PENDING = this.action?.pendingShots || [];
                while (PENDING.length && PENDING[0].delaySeconds <= this.elapsed + 1e-9) {
                    const SHOT = PENDING.shift();
                    sim.spawnLobProjectile(
                        this.owner,
                        this.action,
                        SHOT,
                        this.action.projectileAbility?.effect || null,
                    );
                }
            }
        };
    return PROJECTILE_ATTACK;
}
