import { createPeaAttack, startPeaContacts, resolvePeaContacts } from '../../species-growth/pea-attack.js';
import { AttackAction } from '../../species-growth/attack-action.js';
import { scaleAttackArea } from '../../../units/unit-stats.js';

// The contact capability remains untouched for the seven unreleased species.
export function createPeaAttackMixin(contactAttack, geometry) {
    return (base) =>
        class extends contactAttack(base) {
            resetCombatEffects() {
                super.resetCombatEffects?.();
                this.interrupt();
            }
            prepareAttack(sim) {
                super.prepareAttack?.(sim);
                const RECORD = createPeaAttack(sim, this.owner, this.action, super.attackRecoverySeconds(sim));
                if (RECORD) {
                    this.action.peaAttack = RECORD;
                }
            }
            attackRecoverySeconds(sim) {
                return this.action?.peaAttack?.recoverySeconds ?? super.attackRecoverySeconds(sim);
            }
            syncAttackSpeedMultiplier(tick) {
                if (!this.action?.peaAttack) {
                    super.syncAttackSpeedMultiplier(tick);
                }
            }
            onLaunch(sim, action) {
                super.onLaunch?.(sim, action);
                if (action.peaAttack) {
                    action.peaAttack.launchTick = sim.simulationTick;
                }
            }
            interrupt() {
                const RECORD = this.action?.peaAttack;
                if (RECORD?.attack) {
                    const ATTACK = AttackAction.fromDTO(RECORD.attack);
                    ATTACK.cancel();
                    RECORD.attack = ATTACK.toDTO();
                }
                super.interrupt();
            }
            integrate(dt) {
                const RECORD = this.action?.peaAttack,
                    U = this.owner;
                if (!RECORD || RECORD.contactTick === null || this.phase !== 'active') {
                    return super.integrate(dt);
                }
                if (U.stun > 0 || U.down > 0 || U.landingRecovery > 0) {
                    return false;
                }
                this.elapsed += dt;
                const Q = Math.min(1, this.elapsed / (RECORD.comboTicks / 20)),
                    SPLIT = RECORD.form === 6 ? 3 / 8 : 1,
                    LEG_Q = Q === 1 ? 1 : Q < SPLIT ? Q / SPLIT : (Q - SPLIT) / (1 - SPLIT),
                    DISTANCE = (RECORD.form === 3 ? 0.08 : 0.35) * Math.sin(Math.PI * LEG_Q),
                    X = RECORD.contact.x - RECORD.direction.x * DISTANCE,
                    Y = RECORD.contact.y - RECORD.direction.y * DISTANCE;
                RECORD.stage =
                    RECORD.form === 6 && Q >= SPLIT && LEG_Q < 0.65 ? 'charge' : LEG_Q < 0.5 ? 'rebound' : 'contact';
                RECORD.stageProgress = LEG_Q;
                U.vx = (X - U.x) / dt;
                U.vy = (Y - U.y) / dt;
                U.vz = 0;
                U.x = X;
                U.y = Y;
                U.z = 0;
                U.flash = Math.max(0, U.flash - dt);
                U.bounce = Math.max(0, U.bounce - dt);
                return true;
            }
            afterMove(sim, old) {
                const A = this.action,
                    RECORD = A?.peaAttack,
                    U = this.owner;
                if (!RECORD) {
                    super.afterMove(sim, old);
                    return;
                }
                if (this.phase !== 'active' || !A.path) {
                    return;
                }
                const TARGET = sim.attackTarget(U, A);
                if (!TARGET || TARGET.hp <= 0) {
                    this.interrupt();
                    return;
                }
                const HIT = geometry.sweep(
                    old,
                    U,
                    scaleAttackArea(U.radius, U) + (RECORD.contactTick === null ? 0 : 1e-7),
                    U.height,
                    TARGET,
                );
                if (RECORD.contactTick === null) {
                    if (!HIT) {
                        if (this.elapsed >= A.path.duration) {
                            U.z = U.vz = U.vx = U.vy = 0;
                            this.recover(sim, true);
                        }
                        return;
                    }
                    U.x = HIT.x;
                    U.y = HIT.y;
                    U.z = 0;
                    startPeaContacts(sim, U, A, HIT);
                    this.elapsed = 0;
                    resolvePeaContacts(sim, U, A, TARGET, HIT);
                    if (!RECORD.comboTicks) {
                        this.recover(sim, true);
                    }
                    return;
                }
                // Sweeping clamps the real body at the near face, including a target that moves toward it.
                if (
                    HIT &&
                    Math.hypot(U.x - TARGET.x, U.y - TARGET.y) < Math.hypot(old.x - TARGET.x, old.y - TARGET.y)
                ) {
                    U.x = HIT.x;
                    U.y = HIT.y;
                    U.z = 0;
                }
                resolvePeaContacts(sim, U, A, TARGET, HIT);
                if (sim.simulationTick >= RECORD.contactTick + RECORD.comboTicks) {
                    this.recover(sim, true);
                }
            }
        };
}
