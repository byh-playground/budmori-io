import {
    createRedbeanAttack,
    launchRedbeanAttack,
    sampleRedbeanMotion,
    resolveRedbeanSlots,
    redbeanPlan,
} from '../../species-growth/redbean-attack.js';

export function createRedbeanAttackMixin(contactAttack, geometry) {
    return (base) =>
        class extends contactAttack(base) {
            prepareAttack(sim) {
                super.prepareAttack?.(sim);
                const RECORD = createRedbeanAttack(sim, this.owner, this.action, this.attackSpeedMultiplier(sim));
                if (RECORD) {
                    this.action.redbeanAttack = RECORD;
                }
            }
            attackWindupSeconds(sim) {
                return (
                    this.action?.redbeanAttack?.windupSeconds ??
                    super.attackWindupSeconds?.(sim) ??
                    this.spec.timing.windup
                );
            }
            attackRecoverySeconds(sim) {
                const R = this.action?.redbeanAttack;
                return R
                    ? (R.reset ? 0.1 : Math.ceil(R.recoverySeconds * 20 - 1e-9) / 20) - 1e-9
                    : super.attackRecoverySeconds(sim);
            }
            syncAttackSpeedMultiplier(tick) {
                if (!this.action?.redbeanAttack) {
                    super.syncAttackSpeedMultiplier(tick);
                }
            }
            onLaunch(sim, action) {
                super.onLaunch?.(sim, action);
                if (action.redbeanAttack) {
                    launchRedbeanAttack(sim, this.owner, action);
                }
            }
            landingRecoverySeconds() {
                return this.action?.redbeanAttack ? 0.05 : 0.25;
            }
            resetCombatEffects() {
                super.resetCombatEffects?.();
                this.interrupt();
            }
            integrate(dt) {
                const R = this.action?.redbeanAttack,
                    U = this.owner;
                if (!R || this.phase !== 'active') {
                    return super.integrate(dt);
                }
                if (U.stun > 0 || U.down > 0 || U.hp <= 0) {
                    return false;
                }
                this.elapsed += dt;
                // Movement follows the exact same authoritative tick plan as contact claims.
                R.motionTick = Math.min(redbeanPlan(R.form, R.speed).durationTicks, this.elapsed * 20);
                const P = sampleRedbeanMotion(R, R.motionTick);
                U.vx = (P.x - U.x) / dt;
                U.vy = (P.y - U.y) / dt;
                U.vz = (P.z - U.z) / dt;
                U.x = P.x;
                U.y = P.y;
                U.z = P.z;
                U.flash = Math.max(0, U.flash - dt);
                U.bounce = Math.max(0, U.bounce - dt);
                return true;
            }
            afterMove(sim, old) {
                const A = this.action,
                    R = A?.redbeanAttack,
                    U = this.owner;
                if (!R) {
                    super.afterMove(sim, old);
                    return;
                }
                if (this.phase !== 'active') {
                    return;
                }
                if (U.hp <= 0 || U.stun > 0 || U.down > 0) {
                    this.interrupt();
                    return;
                }
                // Sampling by simulation tick aligns ground state and damage, also after a model-step jump.
                R.motionTick = Math.min(redbeanPlan(R.form, R.speed).durationTicks, sim.simulationTick - R.launchTick);
                Object.assign(U, sampleRedbeanMotion(R, R.motionTick));
                resolveRedbeanSlots(sim, U, A, geometry);
                // Slot resolution observes planned poses but must not leave a past pose in presentation.
                Object.assign(U, sampleRedbeanMotion(R, R.motionTick));
                if (R.motionTick >= redbeanPlan(R.form, R.speed).durationTicks) {
                    U.z = U.vz = U.vx = U.vy = 0;
                    U.bounce = 0.16;
                    this.recover(sim, false);
                }
            }
        };
}
