import { createChestnutAttack, launchChestnutAttack } from '../../species-growth/chestnut-attack.js';
export function createChestnutAttackMixin(contactAttack) {
    return (base) =>
        class extends contactAttack(base) {
            prepareAttack(sim) {
                super.prepareAttack?.(sim);
                const R = createChestnutAttack(sim, this.owner, this.action, this.attackSpeedMultiplier(sim));
                if (R) {
                    this.action.chestnutAttack = R;
                }
            }
            attackWindupSeconds(sim) {
                return (
                    this.action?.chestnutAttack?.windupSeconds ??
                    super.attackWindupSeconds?.(sim) ??
                    this.spec.timing.windup
                );
            }
            attackRecoverySeconds(sim) {
                return this.action?.chestnutAttack?.recoverySeconds ?? super.attackRecoverySeconds(sim);
            }
            syncAttackSpeedMultiplier(tick) {
                if (!this.action?.chestnutAttack) {
                    super.syncAttackSpeedMultiplier(tick);
                }
            }
            resetCombatEffects() {
                super.resetCombatEffects?.();
                this.interrupt();
            }
            launchAttack(sim) {
                if (this.action?.chestnutAttack) {
                    launchChestnutAttack(sim, this.owner, this.action);
                    this.recover(sim, false);
                } else {
                    super.launchAttack?.(sim);
                }
            }
        };
}
