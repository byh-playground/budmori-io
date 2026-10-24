import { createRiceAttack, launchRiceAttack, resolveRiceSlots } from '../../species-growth/rice-attack.js';
export function createRiceAttackMixin(contactAttack, geometry) {
    return (base) =>
        class extends contactAttack(base) {
            prepareAttack(sim) {
                super.prepareAttack?.(sim);
                if (!this.action.riceAttack) {
                    const R = createRiceAttack(sim, this.owner, this.action, this.attackSpeedMultiplier(sim));
                    if (R) {
                        this.action.riceAttack = R;
                    }
                }
            }
            attackWindupSeconds(sim) {
                return (
                    this.action?.riceAttack?.windupSeconds ??
                    super.attackWindupSeconds?.(sim) ??
                    this.spec.timing.windup
                );
            }
            attackRecoverySeconds(sim) {
                return this.action?.riceAttack?.recoverySeconds ?? super.attackRecoverySeconds(sim);
            }
            syncAttackSpeedMultiplier(tick) {
                if (!this.action?.riceAttack) {
                    super.syncAttackSpeedMultiplier(tick);
                }
            }
            createAttackPath() {
                const R = this.action?.riceAttack;
                if (!R) {
                    return super.createAttackPath();
                }
                this.action.path = {
                    from: { ...R.origin },
                    to: { ...R.origin },
                    height: 0,
                    duration: R.durationSeconds,
                };
            }
            launchAttack(sim) {
                if (this.action?.riceAttack) {
                    launchRiceAttack(sim, this.action);
                } else {
                    super.launchAttack?.(sim);
                }
            }
            afterMove(sim, old) {
                const A = this.action;
                if (!A?.riceAttack) {
                    return super.afterMove(sim, old);
                }
                if (this.phase !== 'active') {
                    return;
                }
                resolveRiceSlots(sim, this.owner, A, this.elapsed, geometry);
                if (
                    this.action === A &&
                    this.phase === 'active' &&
                    this.elapsed >= A.riceAttack.durationSeconds - 1e-9
                ) {
                    this.recover(sim, false);
                }
            }
        };
}
