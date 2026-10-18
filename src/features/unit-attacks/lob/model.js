export function createLobAttackMixin(pathMotion) {
    const PATH_MOTION = pathMotion;
    const PROJECTILE_ATTACK = (base) =>
        class extends PATH_MOTION(base) {
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
