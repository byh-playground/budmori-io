import { LOCALE } from '../i18n/locale.js';
import { formationBaseValue, formationDamageBudget } from '../formation/formation-damage.js';
import { giantBonusFor } from '../features/formation-skills/giant/definition.js';
import {
    FORMATION_SKILL_DEFINITIONS,
    FORMATION_COOLDOWN_SECONDS,
    formationUpgradeValue,
} from '../formation/formation-skill-state.js';
import { iconSvg } from './icons.js';
import { RELIC } from '../i18n/messages/ui-relic.js';

const CONDITION_LABELS = Object.freeze({
    damageDealt: RELIC.conditionDamageDealt,
    damageTaken: RELIC.conditionDamageTaken,
    hits: RELIC.conditionHits,
    critHits: RELIC.conditionCritHits,
    hitCharge: RELIC.conditionHitCharge,
    allyDeaths: RELIC.conditionAllyDeaths,
    time: RELIC.conditionTime,
});
const ESCAPE = (value) =>
    String(value).replace(
        /[&<>"']/g,
        (character) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[character],
    );
const NUMBER = (value) => new Intl.NumberFormat(LOCALE.locale, { maximumFractionDigits: 2 }).format(value || 0);
const SECONDS = (value) => RELIC.seconds({ value: NUMBER(Math.max(0, value)) });

// Card previews and both docks describe the same level and role profile.
export function relicEffectText(definition, level, role = 'player', previousLevel = 0, floor = 1, compact = false) {
    if (definition.damage) {
        const PROFILE = role === 'boss' ? { ...definition, ...definition.boss } : definition,
            BUDGET = formationDamageBudget(PROFILE, floor, level, role),
            BEFORE = previousLevel ? formationDamageBudget(PROFILE, floor, previousLevel, role).damage : null,
            BASE = BEFORE === null ? NUMBER(BUDGET.damage) : `${NUMBER(BEFORE)} → ${NUMBER(BUDGET.damage)}`,
            PARTS = [
                RELIC.baseDamage({ amount: BASE }),
                ...(BUDGET.maxHpDamageRatio
                    ? [RELIC.maxHpDamage({ percent: NUMBER(BUDGET.maxHpDamageRatio * 100) })]
                    : []),
                ...(BUDGET.missingHpDamageRatio
                    ? [RELIC.missingHpDamage({ percent: NUMBER(BUDGET.missingHpDamageRatio * 100) })]
                    : []),
            ],
            DELIVERY = PROFILE.pulseInterval
                ? RELIC.splitOverTime({ duration: SECONDS(PROFILE.upgradeBase + PROFILE.upgradeStep * (level - 1)) })
                : PROFILE.damage.total
                  ? RELIC.splitMeteors({ count: PROFILE.upgradeBase + PROFILE.upgradeStep * (level - 1) })
                  : PROFILE.stunSeconds
                    ? RELIC.stun({ duration: SECONDS(PROFILE.stunSeconds) })
                    : PROFILE.aoeRadius > 0 || PROFILE.aoeRadiusRatio > 0
                      ? RELIC.areaDamage()
                      : RELIC.singleDamage(),
            DAMAGE = PROFILE.damage.total ? RELIC.castTotal({ parts: PARTS.join(' + ') }) : PARTS.join(' + ');
        return `${RELIC.floor({ floor })} · ${DAMAGE}${compact ? '' : ` · ${DELIVERY} · ${RELIC.beforeDefense()}`}`;
    }
    const PROFILE = role === 'boss' ? { ...definition, ...definition.boss } : definition,
        VALUE = formationUpgradeValue(PROFILE, level),
        PREVIOUS = previousLevel ? formationUpgradeValue(PROFILE, previousLevel) : null,
        AMOUNT = PREVIOUS === null ? NUMBER(VALUE) : `${NUMBER(PREVIOUS)} → ${NUMBER(VALUE)}`,
        BOSS = role === 'boss';
    if (PROFILE.id === 'giant') {
        const BONUS = giantBonusFor(floor, level, role),
            BEFORE = previousLevel ? giantBonusFor(floor, previousLevel, role) : null,
            EXTRA = BEFORE === null ? NUMBER(BONUS) : `${NUMBER(BEFORE)} → ${NUMBER(BONUS)}`;
        return `${RELIC.floor({ floor })} · ${RELIC.giantTargets({ count: PROFILE.upgradeValues[0] })} · ${SECONDS(PROFILE.durationSeconds)} · ${RELIC.giantExtraDamage({ amount: EXTRA })}${compact ? '' : ` · ${RELIC.giantBody({ size: NUMBER(PROFILE.sizeMultiplier), armor: NUMBER(PROFILE.armorBonus) })} · ${RELIC.giantSplit()}`}`;
    }
    if (PROFILE.id === 'copy') {
        return RELIC.copyEffect({ boss: BOSS, amount: AMOUNT });
    }
    if (PROFILE.id === 'healing-rain') {
        const BASE = formationBaseValue(PROFILE.healing.base, floor, level, role),
            BEFORE = previousLevel ? formationBaseValue(PROFILE.healing.base, floor, previousLevel, role) : null,
            AMOUNT = BEFORE === null ? NUMBER(BASE) : `${NUMBER(BEFORE)} → ${NUMBER(BASE)}`,
            TOTAL = RELIC.healingTotal({
                boss: BOSS,
                amount: AMOUNT,
                percent: NUMBER(PROFILE.healing.maxHpRatio * 100),
            });
        return `${RELIC.floor({ floor })} · ${TOTAL}${compact ? '' : ` · ${RELIC.healingSpread({ duration: SECONDS(PROFILE.durationSeconds) })}`}`;
    }
    return LOCALE.text(PROFILE.description);
}

export function relicAcquisitionText(receipt, floor = 1) {
    const DEFINITION = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === receipt.card.id),
        BEFORE = receipt.before.level,
        AFTER = receipt.after.level;
    return `${BEFORE ? `Lv.${BEFORE} → ${AFTER}` : RELIC.newSkill()} · ${relicEffectText(DEFINITION, AFTER, receipt.role, BEFORE, floor, true)}`;
}

function slotState(definition, runtime, cast) {
    const REQUIRED = runtime?.required ?? definition.required ?? 1,
        CHARGE = Math.max(0, Math.min(REQUIRED, runtime?.charge || 0)),
        COOLDOWN = Math.max(0, runtime?.cooldown || 0),
        PHASE = cast?.id === definition.id ? cast.phase : '',
        REMAINING = PHASE ? Math.max(0, Math.ceil((cast.duration - cast.elapsed) * 10) / 10) : 0,
        READY = !!runtime && CHARGE >= REQUIRED && COOLDOWN < 1e-9,
        STATE = PHASE || (!runtime ? 'waiting' : COOLDOWN > 1e-9 ? 'cooldown' : READY ? 'ready' : 'charging'),
        LABEL =
            PHASE === 'prepare'
                ? RELIC.casting({ duration: SECONDS(REMAINING) })
                : PHASE === 'recover'
                  ? RELIC.recovering({ duration: SECONDS(REMAINING) })
                  : STATE === 'waiting'
                    ? RELIC.waitingBattle()
                    : STATE === 'cooldown'
                      ? RELIC.cooldown({ duration: SECONDS(Math.ceil(COOLDOWN * 10) / 10) })
                      : STATE === 'ready'
                        ? RELIC.ready()
                        : RELIC.charging({ percent: Math.floor((CHARGE / REQUIRED) * 100) });
    return {
        required: REQUIRED,
        charge: CHARGE,
        cooldown: COOLDOWN,
        state: STATE,
        label: LABEL,
        healingTotal: runtime?.healingTotal,
        thresholdKnown: Number.isFinite(runtime?.required),
    };
}

// Owns DOM only. Both factions read the model's charge, cooldown and cast lifecycle.
export class RelicDock {
    constructor({ role = 'player', host = '#gameplayDock', onOpen = () => {} } = {}) {
        this.role = role;
        this.onOpen = onOpen;
        this.key = '';
        this.selectedId = '';
        this.states = new Map();
        this.acquisitions = new Map();
        this.acquisitionTower = null;
        this.acquisitionSerial = 0;
        this.root = document.createElement('section');
        this.root.className = 'formation-dock';
        this.root.dataset.role = role;
        this.root.setAttribute('aria-label', RELIC.dockLabel({ boss: role === 'boss' }));
        this.root.innerHTML = '<div class="formation-slots"></div>';
        document.querySelector(host).prepend(this.root);
        this.slotHost = this.root.querySelector('.formation-slots');
        this.dialog = document.createElement('dialog');
        this.dialog.id = `relicDetail-${role}`;
        this.dialog.className = 'relic-detail';
        this.dialog.setAttribute('aria-labelledby', `relicDetailTitle-${role}`);
        this.dialog.innerHTML = `<div class="relic-detail__heading"><h2 id="relicDetailTitle-${role}"></h2><button type="button" class="relic-detail__close" aria-label="${RELIC.closeDetail()}">${iconSvg('close')}</button></div><p class="relic-detail__effect"></p><dl><dt>${RELIC.detailCondition()}</dt><dd class="relic-detail__condition"></dd><dt>${RELIC.detailState()}</dt><dd class="relic-detail__state"></dd><dt>${RELIC.detailCooldown()}</dt><dd>${RELIC.cooldownRule({ seconds: FORMATION_COOLDOWN_SECONDS })}</dd></dl>`;
        document.body.append(this.dialog);
        this.slotHost.addEventListener('click', (event) => {
            const BUTTON = event.target.closest('[data-relic-detail]');
            if (BUTTON) {
                this.openDetail(BUTTON.dataset.relicDetail);
            }
        });
        this.dialog.querySelector('button').addEventListener('click', () => this.closeDetail());
        this.dialog.addEventListener('click', (event) => {
            if (event.target === this.dialog) {
                const BOUNDS = this.dialog.getBoundingClientRect();
                if (
                    event.clientX < BOUNDS.left ||
                    event.clientX > BOUNDS.right ||
                    event.clientY < BOUNDS.top ||
                    event.clientY > BOUNDS.bottom
                ) {
                    this.closeDetail();
                }
            }
        });
        this.dialog.addEventListener('close', () => {
            // A queued close event must not clear a detail reopened in the same task.
            if (!this.dialog.open) {
                this.selectedId = '';
                this.syncExpanded();
            }
        });
        this.dialog.addEventListener('keydown', (event) => event.stopPropagation());
    }
    syncExpanded() {
        for (const BUTTON of this.slotHost.querySelectorAll('[data-relic-detail]')) {
            BUTTON.setAttribute(
                'aria-expanded',
                String(this.dialog.open && BUTTON.dataset.relicDetail === this.selectedId),
            );
        }
    }
    openDetail(id) {
        if (!this.states.has(id) || this.root.hidden) {
            return;
        }
        this.selectedId = id;
        this.syncDetail();
        this.onOpen();
        if (!this.dialog.open) {
            this.dialog.showModal();
        }
        this.syncExpanded();
    }
    closeDetail() {
        if (this.dialog.open) {
            this.dialog.close();
        }
        this.selectedId = '';
        this.syncExpanded();
    }
    syncDetail() {
        const CURRENT = this.states.get(this.selectedId);
        if (!CURRENT) {
            this.closeDetail();
            return;
        }
        const { definition: DEFINITION, level: LEVEL, status: STATUS } = CURRENT,
            DAMAGE_CHARGE = DEFINITION.damageCharge,
            CONDITION =
                this.role === 'boss' && DAMAGE_CHARGE
                    ? DEFINITION.condition === 'damageTaken'
                        ? RELIC.conditionBossDamageTaken()
                        : RELIC.conditionBossDamageDealt()
                    : this.role === 'boss' && DEFINITION.condition === 'allyDeaths'
                      ? RELIC.conditionBossAllyDeaths()
                      : DEFINITION.condition === 'hitCharge'
                        ? RELIC.conditionHitChargeRule({ bonus: NUMBER(DEFINITION.criticalChargeBonus) })
                        : CONDITION_LABELS[DEFINITION.condition]?.() || DEFINITION.condition,
            THRESHOLD_RULE = DAMAGE_CHARGE
                ? RELIC.thresholdRule({
                      floor: CURRENT.floor,
                      base: NUMBER(formationBaseValue(DAMAGE_CHARGE.base, CURRENT.floor, 1)),
                      percent: NUMBER(DAMAGE_CHARGE.maxHpRatio * 100),
                  })
                : '';
        this.dialog.querySelector('h2').textContent = RELIC.detailTitle({
            boss: this.role === 'boss',
            name: LOCALE.text(DEFINITION.name),
            level: LEVEL,
        });
        this.dialog.querySelector('.relic-detail__effect').textContent = relicEffectText(
            DEFINITION,
            LEVEL,
            this.role,
            0,
            CURRENT.floor,
        );
        this.dialog.querySelector('.relic-detail__condition').textContent = DAMAGE_CHARGE
            ? `${CONDITION}${STATUS.thresholdKnown ? ` ${NUMBER(STATUS.charge)} / ${NUMBER(STATUS.required)}` : ''} · ${THRESHOLD_RULE}`
            : DEFINITION.healing && !STATUS.thresholdKnown
              ? this.role === 'boss'
                  ? RELIC.healingUnknownBoss()
                  : RELIC.healingUnknownAlly()
              : `${CONDITION} ${NUMBER(STATUS.charge)} / ${NUMBER(STATUS.required)}${DEFINITION.healing ? ` · ${RELIC.healingProgress({ total: NUMBER(STATUS.healingTotal), ratio: NUMBER(DEFINITION.chargeRatio) })}` : ''}`;
        this.dialog.querySelector('.relic-detail__state').textContent =
            `${STATUS.label}${STATUS.state === 'recover' ? ` · ${RELIC.cooldown({ duration: SECONDS(Math.ceil(STATUS.cooldown * 10) / 10) })}` : ''}`;
    }
    // A UI-only emphasis follows each acquired skill into its first following battle.
    // This never changes the model's receipt, skill level or cooldown.
    syncAcquisitions(world) {
        const TOWER = world.tower,
            DRAW = this.role === 'boss' ? TOWER.bossCardDraw : TOWER.playerPick,
            BATTLE = ['dropping', 'fighting'].includes(world.farmBossEvent?.phase);
        if (this.acquisitionTower !== TOWER) {
            this.acquisitionTower = TOWER;
            this.acquisitionSerial = 0;
            this.acquisitions.clear();
            this.key = '';
        }
        if (!TOWER.active) {
            this.acquisitions.clear();
            this.acquisitionSerial = DRAW?.serial || 0;
            return;
        }
        for (const [ID, ACQUISITION] of this.acquisitions) {
            if (ACQUISITION.battleFloor !== null && (!BATTLE || ACQUISITION.battleFloor !== TOWER.floor)) {
                this.acquisitions.delete(ID);
            }
        }
        if (DRAW && DRAW.serial !== this.acquisitionSerial) {
            this.acquisitionSerial = DRAW.serial;
            const RECEIPT = DRAW.receipt;
            if (RECEIPT?.card.type === 'skill') {
                this.acquisitions.set(RECEIPT.card.id, { receipt: RECEIPT, battleFloor: null });
            }
        }
        if (BATTLE) {
            for (const ACQUISITION of this.acquisitions.values()) {
                ACQUISITION.battleFloor ??= TOWER.floor;
            }
        }
    }
    update(world, display, visible) {
        this.syncAcquisitions(world);
        const RELICS = [...(this.role === 'boss' ? world.tower.bossRelics : world.tower.relics)];
        this.root.hidden = !visible || RELICS.length === 0;
        if (this.root.hidden) {
            this.closeDetail();
            return;
        }
        const KEY = JSON.stringify(RELICS);
        if (KEY !== this.key) {
            this.key = KEY;
            this.closeDetail();
            this.slotHost.innerHTML = RELICS.map(([id, level]) => {
                const DEFINITION = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === id);
                return `<div class="formation-slot" data-formation-slot="${ESCAPE(id)}" data-empty="false"><button type="button" class="formation-icon" data-relic-detail="${ESCAPE(id)}" aria-label="${ESCAPE(RELIC.slotDetail({ name: LOCALE.text(DEFINITION.name), level }))}" aria-haspopup="dialog" aria-controls="${this.dialog.id}" aria-expanded="false">${iconSvg(id)}<i class="formation-clock" aria-hidden="true"></i><em class="formation-lv">${level}</em></button><div class="formation-charge" aria-hidden="true"><i></i></div><small class="formation-status"></small><small class="formation-acquired" hidden></small></div>`;
            }).join('');
        }
        const SLOTS =
                (this.role === 'boss' ? display.bossSlots : display.formationSlots) ||
                world.formationRuntime?.slots ||
                [],
            CAST =
                this.role === 'boss'
                    ? display.bossCast === undefined
                        ? world.formationRuntime?.bossCast
                        : display.bossCast
                    : null,
            LEVELS = new Map(RELICS);
        this.states.clear();
        for (const ELEMENT of this.slotHost.children) {
            const ID = ELEMENT.dataset.formationSlot,
                BASE = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === ID),
                DEFINITION = this.role === 'boss' ? { ...BASE, ...BASE.boss } : BASE,
                RUNTIME = SLOTS.find((item) => item.id === ID && (item.role || 'player') === this.role),
                STATUS = slotState(DEFINITION, RUNTIME, CAST),
                ACQUISITION = this.acquisitions.get(ID)?.receipt,
                BADGE = ACQUISITION
                    ? ACQUISITION.before.level
                        ? `Lv.${ACQUISITION.before.level} → ${ACQUISITION.after.level}`
                        : RELIC.newSkill()
                    : '';
            ELEMENT.dataset.acquired = ACQUISITION ? (ACQUISITION.before.level ? 'upgrade' : 'new') : '';
            ELEMENT.querySelector('.formation-acquired').hidden = !ACQUISITION;
            ELEMENT.querySelector('.formation-acquired').textContent = BADGE;
            this.states.set(ID, {
                definition: DEFINITION,
                level: LEVELS.get(ID),
                status: STATUS,
                floor: world.tower.floor,
            });
            ELEMENT.querySelector('.formation-clock').style.setProperty(
                '--cooldown',
                `${Math.min(1, STATUS.cooldown / FORMATION_COOLDOWN_SECONDS) * 360}deg`,
            );
            ELEMENT.querySelector('.formation-charge i').style.width = `${(STATUS.charge / STATUS.required) * 100}%`;
            ELEMENT.querySelector('.formation-status').textContent = STATUS.label;
            ELEMENT.querySelector('.formation-icon').setAttribute(
                'aria-label',
                `${RELIC.slotSummary({ boss: this.role === 'boss', name: LOCALE.text(DEFINITION.name), level: LEVELS.get(ID) })} · ${STATUS.label}${BADGE ? ` · ${RELIC.thisBattle({ badge: BADGE })}` : ''} · ${RELIC.viewDetails()}`,
            );
            ELEMENT.dataset.state = STATUS.state;
            ELEMENT.dataset.ready = String(STATUS.state === 'ready');
        }
        if (this.selectedId) {
            this.syncDetail();
        }
    }
}
