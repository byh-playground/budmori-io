import { createBarleyAttack, launchBarleyAttack, resolveBarleySlots } from '../../species-growth/barley-attack.js';
export function createBarleyAttackMixin(contactAttack, geometry) {
    return (base) =>
        class extends contactAttack(base) {
            prepareAttack(sim) {
                super.prepareAttack?.(sim);
                if (!this.action.barleyAttack) {
                    const R = createBarleyAttack(sim, this.owner, this.action, this.attackSpeedMultiplier(sim));
                    if (R) {
                        this.action.barleyAttack = R;
                    }
                }
            }
            attackWindupSeconds(sim) {
                return (
                    this.action?.barleyAttack?.windupSeconds ??
                    super.attackWindupSeconds?.(sim) ??
                    this.spec.timing.windup
                );
            }
            attackRecoverySeconds(sim) {
                return this.action?.barleyAttack?.recoverySeconds ?? super.attackRecoverySeconds(sim);
            }
            syncAttackSpeedMultiplier(tick) {
                if (!this.action?.barleyAttack) {
                    super.syncAttackSpeedMultiplier(tick);
                }
            }
            createAttackPath() {
                const R = this.action?.barleyAttack;
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
                if (this.action?.barleyAttack) {
                    launchBarleyAttack(sim, this.action);
                } else {
                    super.launchAttack?.(sim);
                }
            }
            afterMove(sim, old) {
                const A = this.action;
                if (!A?.barleyAttack) {
                    return super.afterMove(sim, old);
                }
                if (this.phase !== 'active') {
                    return;
                }
                resolveBarleySlots(sim, this.owner, A, this.elapsed, geometry);
                if (
                    this.action === A &&
                    this.phase === 'active' &&
                    this.elapsed >= A.barleyAttack.durationSeconds - 1e-9
                ) {
                    this.recover(sim, false);
                }
            }
        };
}
