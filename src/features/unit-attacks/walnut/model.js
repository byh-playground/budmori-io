import { createWalnutAttack, launchWalnutAttack, resolveWalnutSlots } from '../../species-growth/walnut-attack.js';
export function createWalnutAttackMixin(contactAttack, geometry) {
    return (base) =>
        class extends contactAttack(base) {
            prepareAttack(sim) {
                super.prepareAttack?.(sim);
                if (!this.action.walnutAttack) {
                    const R = createWalnutAttack(sim, this.owner, this.action, this.attackSpeedMultiplier(sim));
                    if (R) {
                        this.action.walnutAttack = R;
                    }
                }
            }
            attackWindupSeconds(sim) {
                return (
                    this.action?.walnutAttack?.windupSeconds ??
                    super.attackWindupSeconds?.(sim) ??
                    this.spec.timing.windup
                );
            }
            attackRecoverySeconds(sim) {
                return this.action?.walnutAttack?.recoverySeconds ?? super.attackRecoverySeconds(sim);
            }
            syncAttackSpeedMultiplier(tick) {
                if (!this.action?.walnutAttack) {
                    super.syncAttackSpeedMultiplier(tick);
                }
            }
            createAttackPath() {
                const R = this.action?.walnutAttack;
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
                if (this.action?.walnutAttack) {
                    launchWalnutAttack(sim, this.action);
                } else {
                    super.launchAttack?.(sim);
                }
            }
            afterMove(sim, old) {
                const A = this.action;
                if (!A?.walnutAttack) {
                    return super.afterMove(sim, old);
                }
                if (this.phase !== 'active') {
                    return;
                }
                resolveWalnutSlots(sim, this.owner, A, this.elapsed, geometry);
                if (
                    this.action === A &&
                    this.phase === 'active' &&
                    this.elapsed >= A.walnutAttack.durationSeconds - 1e-9
                ) {
                    this.recover(sim, false);
                }
            }
        };
}
