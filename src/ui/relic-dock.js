import {
    FORMATION_SKILL_DEFINITIONS,
    FORMATION_COOLDOWN_SECONDS,
    formationUpgradeValue,
} from '../formation/formation-skill-state.js';

const CONDITION_LABELS = Object.freeze({
    damageDealt: '준 피해',
    damageTaken: '받은 피해',
    hits: '공격 적중',
    critHits: '치명타',
    allyDeaths: '아군 쓰러짐',
    time: '전투 시간',
});
export const RELIC_ICONS = Object.freeze({
    giant: '🌱',
    lightning: 'ϟ',
    meteor: '☄',
    'meteor-shower': '✦',
    copy: '◈',
    'healing-rain': '☂',
    hammer: '⚒',
    ufo: '🛸',
    'storm-cloud': '☁',
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
export function relicEffectText(definition, level, role = 'player', previousLevel = 0) {
    const PROFILE = role === 'boss' ? { ...definition, ...definition.boss } : definition,
        VALUE = formationUpgradeValue(PROFILE, level),
        PREVIOUS = previousLevel ? formationUpgradeValue(PROFILE, previousLevel) : null,
        AMOUNT = PREVIOUS === null ? NUMBER(VALUE) : `${NUMBER(PREVIOUS)} → ${NUMBER(VALUE)}`,
        DURATION = PREVIOUS === null ? SECONDS(VALUE) : `${SECONDS(PREVIOUS)} → ${SECONDS(VALUE)}`,
        FRIEND = role === 'boss' ? '보스 진영' : '아군',
        ENEMY = role === 'boss' ? '아군' : '적';
    if (PROFILE.pulseInterval) {
        return `${DURATION} 동안 ${SECONDS(PROFILE.pulseInterval)}마다 ${ENEMY} 최대 ${PROFILE.targetCount}명에게 피해 ${NUMBER(PROFILE.pulseDamage)}`;
    }
    if (PROFILE.id === 'giant') {
        return `${FRIEND} 최대 ${AMOUNT}명 · ${SECONDS(PROFILE.durationSeconds)} 동안 몸집 ×${NUMBER(PROFILE.sizeMultiplier)}, 공격력 ×3, 방어력 +100`;
    }
    if (PROFILE.id === 'meteor-shower') {
        return `유성 ${AMOUNT}개 · ${SECONDS(PROFILE.shotInterval)} 간격 · 개당 범위 피해 ${NUMBER(PROFILE.shotDamage)}`;
    }
    if (PROFILE.id === 'copy') {
        return `${FRIEND} 밀집 위치에 체력 1 분신 · 반경 ${AMOUNT} × T1 몸통 지름 · 전투 종료까지`;
    }
    if (PROFILE.id === 'healing-rain') {
        return `${SECONDS(PROFILE.durationSeconds)} 동안 ${FRIEND}에 총 회복 ${AMOUNT} 분배`;
    }
    if (PROFILE.id === 'hammer') {
        return `${ENEMY} 하나에게 피해 ${AMOUNT} · ${SECONDS(PROFILE.stunSeconds)} 기절`;
    }
    return `${PROFILE.aoeRadius > 0 || PROFILE.aoeRadiusRatio > 0 ? '범위' : '단일'} 피해 ${AMOUNT}${PROFILE.id === 'meteor' ? ' · 밀쳐내기' : ''}`;
}

export function relicAcquisitionText(receipt) {
    const DEFINITION = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === receipt.card.id),
        BEFORE = receipt.before.level,
        AFTER = receipt.after.level;
    return `${BEFORE ? `Lv.${BEFORE} → ${AFTER}` : '새 기술'} · ${relicEffectText(DEFINITION, AFTER, receipt.role, BEFORE)}`;
}

function slotState(definition, runtime, cast) {
    const REQUIRED = definition.required || 1,
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
    return { required: REQUIRED, charge: CHARGE, cooldown: COOLDOWN, state: STATE, label: LABEL };
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
        this.dialog.innerHTML = `<div class="relic-detail__heading"><h2 id="relicDetailTitle-${role}"></h2><button type="button" class="relic-detail__close" aria-label="기술 상세 닫기">×</button></div><p class="relic-detail__effect"></p><dl><dt>발동 조건</dt><dd class="relic-detail__condition"></dd><dt>현재 상태</dt><dd class="relic-detail__state"></dd><dt>재사용 대기</dt><dd>${FORMATION_COOLDOWN_SECONDS}초 · 조건과 재사용 대기를 모두 채우면 자동 발동</dd></dl>`;
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
            CONDITION =
                this.role === 'boss' && DEFINITION.condition === 'allyDeaths'
                    ? '보스 진영 쓰러짐'
                    : CONDITION_LABELS[DEFINITION.condition] || DEFINITION.condition;
        this.dialog.querySelector('h2').textContent =
            `${this.role === 'boss' ? '보스' : '아군'} · ${DEFINITION.name} Lv.${LEVEL}`;
        this.dialog.querySelector('.relic-detail__effect').textContent = relicEffectText(DEFINITION, LEVEL, this.role);
        this.dialog.querySelector('.relic-detail__condition').textContent =
            `${CONDITION} ${NUMBER(STATUS.charge)} / ${NUMBER(STATUS.required)}`;
        this.dialog.querySelector('.relic-detail__state').textContent =
            `${STATUS.label}${STATUS.state === 'recover' ? ` · 재사용 ${SECONDS(Math.ceil(STATUS.cooldown * 10) / 10)}` : ''}`;
    }
    // A UI-only emphasis follows each acquired skill into its first following battle.
    // This never changes the model's receipt, skill level or cooldown.
    syncAcquisitions(world) {
        const TOWER = world.tower,
            DRAW = TOWER.bossCardDraw,
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
            const RECEIPT = this.role === 'boss' ? DRAW.receipt : DRAW.player;
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
                return `<div class="formation-slot" data-formation-slot="${ESCAPE(id)}" data-empty="false"><button type="button" class="formation-icon" data-relic-detail="${ESCAPE(id)}" aria-label="${ESCAPE(DEFINITION.name)} Lv.${level} 상세" aria-haspopup="dialog" aria-controls="${this.dialog.id}" aria-expanded="false"><span aria-hidden="true">${RELIC_ICONS[id]}</span><i class="formation-clock" aria-hidden="true"></i><em class="formation-lv">${level}</em></button><div class="formation-charge" aria-hidden="true"><i></i></div><small class="formation-status"></small><small class="formation-acquired" hidden></small></div>`;
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
            this.states.set(ID, { definition: DEFINITION, level: LEVELS.get(ID), status: STATUS });
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
