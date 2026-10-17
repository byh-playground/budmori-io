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
                    POPCORN_LOCAL = this.projectileEffect?.(sim) || null,
                    SHOTS = this.projectileShots(sim);
                A.pendingShots = SHOTS.slice(1);
                A.projectileAbility = {
                    popcorn: POPCORN_LOCAL,
                };
                sim.spawnLobProjectile(U, A, SHOTS[0], POPCORN_LOCAL);
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
                        this.action.projectileAbility?.popcorn || null,
                    );
                }
            }
        };
    return PROJECTILE_ATTACK;
}
