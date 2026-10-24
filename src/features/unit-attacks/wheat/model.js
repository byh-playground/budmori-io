import { createWheatAttack, launchWheatAttack, resolveWheatSlots } from '../../species-growth/wheat-attack.js';
export function createWheatAttackMixin(contactAttack, geometry) {
    return (base) =>
        class extends contactAttack(base) {
            prepareAttack(sim) {
                super.prepareAttack?.(sim);
                if (!this.action.wheatAttack) {
                    const R = createWheatAttack(sim, this.owner, this.action, this.attackSpeedMultiplier(sim));
                    if (R) {
                        this.action.wheatAttack = R;
                    }
                }
            }
            attackWindupSeconds(sim) {
                return (
                    this.action?.wheatAttack?.windupSeconds ??
                    super.attackWindupSeconds?.(sim) ??
                    this.spec.timing.windup
                );
            }
            attackRecoverySeconds(sim) {
                return this.action?.wheatAttack?.recoverySeconds ?? super.attackRecoverySeconds(sim);
            }
            syncAttackSpeedMultiplier(tick) {
                if (!this.action?.wheatAttack) {
                    super.syncAttackSpeedMultiplier(tick);
                }
            }
            createAttackPath() {
                const R = this.action?.wheatAttack;
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
                if (this.action?.wheatAttack) {
                    launchWheatAttack(sim, this.action);
                } else {
                    super.launchAttack?.(sim);
                }
            }
            afterMove(sim, old) {
                const A = this.action;
                if (!A?.wheatAttack) {
                    return super.afterMove(sim, old);
                }
                if (this.phase !== 'active') {
                    return;
                }
                resolveWheatSlots(sim, this.owner, A, this.elapsed, geometry);
                if (
                    this.action === A &&
                    this.phase === 'active' &&
                    this.elapsed >= A.wheatAttack.durationSeconds - 1e-9
                ) {
                    this.recover(sim, false);
                }
            }
        };
}
