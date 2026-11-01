import { formationBaseValue, formationDamageBudget } from '../formation/formation-damage.js';
import { giantBonusFor } from '../features/formation-skills/giant/definition.js';
import {
    FORMATION_SKILL_DEFINITIONS,
    FORMATION_COOLDOWN_SECONDS,
    formationUpgradeValue,
} from '../formation/formation-skill-state.js';
import { iconSvg } from './icons.js';

const CONDITION_LABELS = Object.freeze({
    damageDealt: '준 피해',
    damageTaken: '받은 피해',
    hits: '공격 적중',
    critHits: '치명타',
    hitCharge: '적중 충전',
    allyDeaths: '아군 쓰러짐',
    time: '전투 시간',
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
const NUMBER = (value) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(value || 0);
const SECONDS = (value) => `${NUMBER(Math.max(0, value))}초`;

// Card previews and both docks describe the same level and role profile.
export function relicEffectText(definition, level, role = 'player', previousLevel = 0, floor = 1, compact = false) {
    if (definition.damage) {
        const PROFILE = role === 'boss' ? { ...definition, ...definition.boss } : definition,
            BUDGET = formationDamageBudget(PROFILE, floor, level, role),
            BEFORE = previousLevel ? formationDamageBudget(PROFILE, floor, previousLevel, role).damage : null,
            BASE = BEFORE === null ? NUMBER(BUDGET.damage) : `${NUMBER(BEFORE)} → ${NUMBER(BUDGET.damage)}`,
            PARTS = [
                `기본 ${BASE}`,
                ...(BUDGET.maxHpDamageRatio ? [`대상 최대 체력 ${NUMBER(BUDGET.maxHpDamageRatio * 100)}%`] : []),
                ...(BUDGET.missingHpDamageRatio
                    ? [`대상이 잃은 체력 ${NUMBER(BUDGET.missingHpDamageRatio * 100)}%`]
                    : []),
            ],
            DELIVERY = PROFILE.pulseInterval
                ? `${SECONDS(PROFILE.upgradeBase + PROFILE.upgradeStep * (level - 1))} 동안 분할`
                : PROFILE.damage.total
                  ? `유성 ${PROFILE.upgradeBase + PROFILE.upgradeStep * (level - 1)}개로 분할`
                  : PROFILE.stunSeconds
                    ? `${SECONDS(PROFILE.stunSeconds)} 기절`
                    : PROFILE.aoeRadius > 0 || PROFILE.aoeRadiusRatio > 0
                      ? '범위 피해'
                      : '단일 피해';
        return `${floor}층 · ${PROFILE.damage.total ? '1회 발동 총 ' : ''}${PARTS.join(' + ')}${compact ? '' : ` · ${DELIVERY} · 방어 적용 전`}`;
    }
    const PROFILE = role === 'boss' ? { ...definition, ...definition.boss } : definition,
        VALUE = formationUpgradeValue(PROFILE, level),
        PREVIOUS = previousLevel ? formationUpgradeValue(PROFILE, previousLevel) : null,
        AMOUNT = PREVIOUS === null ? NUMBER(VALUE) : `${NUMBER(PREVIOUS)} → ${NUMBER(VALUE)}`,
        FRIEND = role === 'boss' ? '보스 진영' : '아군';
    if (PROFILE.id === 'giant') {
        const BONUS = giantBonusFor(floor, level, role),
            BEFORE = previousLevel ? giantBonusFor(floor, previousLevel, role) : null,
            EXTRA = BEFORE === null ? NUMBER(BONUS) : `${NUMBER(BEFORE)} → ${NUMBER(BONUS)}`;
        return `${floor}층 · 무작위 ${PROFILE.upgradeValues[0]}명 · ${SECONDS(PROFILE.durationSeconds)} · 기본 공격 한 동작 추가 피해 ${EXTRA}${compact ? '' : ` · 몸집 ×${NUMBER(PROFILE.sizeMultiplier)}, 방어력 +${NUMBER(PROFILE.armorBonus)} · 연타 분할·방어 적용 전`}`;
    }
    if (PROFILE.id === 'copy') {
        return `${FRIEND} 밀집 위치에 체력 1 분신 · 반경 ${AMOUNT} × T1 몸통 지름 · 전투 종료까지`;
    }
    if (PROFILE.id === 'healing-rain') {
        const BASE = formationBaseValue(PROFILE.healing.base, floor, level, role),
            BEFORE = previousLevel ? formationBaseValue(PROFILE.healing.base, floor, previousLevel, role) : null,
            AMOUNT = BEFORE === null ? NUMBER(BASE) : `${NUMBER(BEFORE)} → ${NUMBER(BASE)}`,
            REFERENCE = role === 'boss' ? '보스 자신의' : '원본 아군 평균';
        return `${floor}층 · 총 회복 ${AMOUNT} + ${REFERENCE} 최대 체력 ${NUMBER(PROFILE.healing.maxHpRatio * 100)}%${compact ? '' : ` · ${SECONDS(PROFILE.durationSeconds)} 동안 부상자에게 분배`}`;
    }
    return PROFILE.description;
}

export function relicAcquisitionText(receipt, floor = 1) {
    const DEFINITION = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === receipt.card.id),
        BEFORE = receipt.before.level,
        AFTER = receipt.after.level;
    return `${BEFORE ? `Lv.${BEFORE} → ${AFTER}` : '새 기술'} · ${relicEffectText(DEFINITION, AFTER, receipt.role, BEFORE, floor, true)}`;
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
                ? `시전 ${SECONDS(REMAINING)}`
                : PHASE === 'recover'
                  ? `후딜 ${SECONDS(REMAINING)}`
                  : STATE === 'waiting'
                    ? '전투 대기'
                    : STATE === 'cooldown'
                      ? `재사용 ${SECONDS(Math.ceil(COOLDOWN * 10) / 10)}`
                      : STATE === 'ready'
                        ? '발동 대기'
                        : `충전 ${Math.floor((CHARGE / REQUIRED) * 100)}%`;
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
        this.root.setAttribute('aria-label', `${role === 'boss' ? '보스' : '아군'} 기술`);
        this.root.innerHTML = '<div class="formation-slots"></div>';
        document.querySelector(host).prepend(this.root);
        this.slotHost = this.root.querySelector('.formation-slots');
        this.dialog = document.createElement('dialog');
        this.dialog.id = `relicDetail-${role}`;
        this.dialog.className = 'relic-detail';
        this.dialog.setAttribute('aria-labelledby', `relicDetailTitle-${role}`);
        this.dialog.innerHTML = `<div class="relic-detail__heading"><h2 id="relicDetailTitle-${role}"></h2><button type="button" class="relic-detail__close" aria-label="기술 상세 닫기">${iconSvg('close')}</button></div><p class="relic-detail__effect"></p><dl><dt>발동 조건</dt><dd class="relic-detail__condition"></dd><dt>현재 상태</dt><dd class="relic-detail__state"></dd><dt>재사용 대기</dt><dd>${FORMATION_COOLDOWN_SECONDS}초 · 조건과 재사용 대기를 모두 채우면 자동 발동</dd></dl>`;
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
                        ? '본체가 받은 피해'
                        : '본체가 준 피해'
                    : this.role === 'boss' && DEFINITION.condition === 'allyDeaths'
                      ? '보스 진영 쓰러짐'
                      : DEFINITION.condition === 'hitCharge'
                        ? `적중당 +1 · 치명타 추가 +${NUMBER(DEFINITION.criticalChargeBonus)}`
                        : CONDITION_LABELS[DEFINITION.condition] || DEFINITION.condition,
            THRESHOLD_RULE = DAMAGE_CHARGE
                ? `${CURRENT.floor}층 기준 ${NUMBER(formationBaseValue(DAMAGE_CHARGE.base, CURRENT.floor, 1))}과 시전자 최대 체력 ${NUMBER(DAMAGE_CHARGE.maxHpRatio * 100)}% 중 작은 값 · 유물 레벨과 무관`
                : '';
        this.dialog.querySelector('h2').textContent =
            `${this.role === 'boss' ? '보스' : '아군'} · ${DEFINITION.name} Lv.${LEVEL}`;
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
                  ? '전투에서 시전자 보스의 최대 체력으로 계산'
                  : '전투에서 현재 원본 아군 기준으로 계산'
              : `${CONDITION} ${NUMBER(STATUS.charge)} / ${NUMBER(STATUS.required)}${DEFINITION.healing ? ` · 이번 총 회복 ${NUMBER(STATUS.healingTotal)} · 문턱은 회복량 ×${NUMBER(DEFINITION.chargeRatio)}` : ''}`;
        this.dialog.querySelector('.relic-detail__state').textContent =
            `${STATUS.label}${STATUS.state === 'recover' ? ` · 재사용 ${SECONDS(Math.ceil(STATUS.cooldown * 10) / 10)}` : ''}`;
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
                return `<div class="formation-slot" data-formation-slot="${ESCAPE(id)}" data-empty="false"><button type="button" class="formation-icon" data-relic-detail="${ESCAPE(id)}" aria-label="${ESCAPE(DEFINITION.name)} Lv.${level} 상세" aria-haspopup="dialog" aria-controls="${this.dialog.id}" aria-expanded="false">${iconSvg(id)}<i class="formation-clock" aria-hidden="true"></i><em class="formation-lv">${level}</em></button><div class="formation-charge" aria-hidden="true"><i></i></div><small class="formation-status"></small><small class="formation-acquired" hidden></small></div>`;
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
                        : '새 기술'
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
                `${this.role === 'boss' ? '보스' : '아군'} ${DEFINITION.name} Lv.${LEVELS.get(ID)} · ${STATUS.label}${BADGE ? ` · 이번 전투 ${BADGE}` : ''} · 상세 보기`,
            );
            ELEMENT.dataset.state = STATUS.state;
            ELEMENT.dataset.ready = String(STATUS.state === 'ready');
        }
        if (this.selectedId) {
            this.syncDetail();
        }
    }
}
