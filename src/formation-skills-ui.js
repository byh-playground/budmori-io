import {
    FORMATION_SKILL_DEFINITIONS,
    formationUpgradeValue,
    FORMATION_MAX_LEVEL,
    FORMATION_COOLDOWN_SECONDS,
} from './formation-skill-state.js';

const CONDITION_LABELS = Object.freeze({
    damageDealt: '준 피해',
    damageTaken: '받은 피해',
    hits: '공격 적중',
    critHits: '치명타',
    allyDeaths: '아군 쓰러짐',
    time: '전투 시간',
});
const ICONS = Object.freeze({
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
const NUMBER = (value) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(value || 0);

// Owns DOM only. Every purchase/equip goes through the deterministic session command boundary.
export class FormationSkillsUI {
    constructor(command) {
        this.command = command;
        this.fingerprint = '';
        this.dockKey = '';
        this.root = document.createElement('section');
        this.root.className = 'formation-dock';
        this.root.setAttribute('aria-label', '편성 스킬');
        this.root.innerHTML =
            '<button class="formation-open" type="button">편성 스킬</button>' + '<div class="formation-slots"></div>';
        this.dialog = document.createElement('dialog');
        this.dialog.className = 'formation-dialog';
        this.dialog.setAttribute('aria-labelledby', 'formation-title');
        this.dialog.innerHTML =
            '<header><div><small>FORMATION</small><h2 id="formation-title">편성 스킬</h2></div>' +
            '<button type="button" data-formation-close aria-label="편성 닫기">×</button></header>' +
            '<div class="formation-content"></div>';
        document.body.append(this.root, this.dialog);
        this.content = this.dialog.querySelector('.formation-content');
        this.slotHost = this.root.querySelector('.formation-slots');
        this.root.querySelector('button').onclick = () => this.dialog.showModal();
        this.dialog.onclick = (event) => this.click(event);
        this.dialog.addEventListener('close', () => this.root.querySelector('button').focus());
    }
    click(event) {
        const BUTTON = event.target.closest('button');
        if (!BUTTON || BUTTON.disabled) {
            return;
        }
        if (BUTTON.hasAttribute('data-formation-close')) {
            this.dialog.close();
        } else if (BUTTON.hasAttribute('data-formation-buy-slot')) {
            this.command('formation-slot', {});
        } else if (BUTTON.dataset.formationPurchase) {
            this.command('formation-purchase', { id: BUTTON.dataset.formationPurchase });
        } else if (BUTTON.dataset.formationEquip) {
            this.command('formation-equip', {
                slot: Number(BUTTON.dataset.slot),
                id: BUTTON.dataset.formationEquip,
            });
        } else if (BUTTON.dataset.formationUnequip !== undefined) {
            this.command('formation-equip', { slot: Number(BUTTON.dataset.formationUnequip), id: null });
        }
    }
    update(world, display, visible, ownerId = '') {
        this.root.hidden = !visible;
        if (!visible && this.dialog.open) {
            this.dialog.close();
        }
        const PLAYER = world.scene === 'raid' ? world.raidRoster(ownerId)?.abilitySnapshot : world.playerProgression,
            STATE = PLAYER?.formationSkills;
        if (!STATE) {
            return;
        }
        const LOCKED = world.scene !== 'farm' || world.running || world.farmBossEvent?.phase !== 'idle',
            POINTS = PLAYER.availablePoints,
            KEY = JSON.stringify([STATE, POINTS, LOCKED]);
        if (KEY !== this.fingerprint) {
            this.fingerprint = KEY;
            this.drawEditor(STATE, POINTS, LOCKED);
        }
        const DOCK_KEY = JSON.stringify([STATE.slots, STATE.equipped]);
        if (DOCK_KEY !== this.dockKey) {
            this.dockKey = DOCK_KEY;
            this.slotHost.innerHTML = Array.from({ length: STATE.slots }, (_, slot) => {
                const DEFINITION = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === STATE.equipped[slot]);
                return `<div class="formation-slot" data-formation-slot="${slot}">
                    <div class="formation-icon" title="${ESCAPE(DEFINITION?.name || '빈 슬롯')}">
                    <span>${ICONS[DEFINITION?.id] || '+'}</span><i class="formation-clock"></i></div>
                    <div class="formation-readout"><strong>${ESCAPE(DEFINITION?.name || '빈 슬롯')}</strong>
                    <div class="formation-charge"><i></i></div><small></small></div></div>`;
            }).join('');
        }
        const SLOTS = display.formationSlots || world.formationSkills?.slots || [];
        for (const ELEMENT of this.slotHost.children) {
            const INDEX = Number(ELEMENT.dataset.formationSlot),
                ID = STATE.equipped[INDEX],
                DEFINITION = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === ID),
                RUNTIME = SLOTS.find((item) => item.id === ID && (!item.ownerId || item.ownerId === ownerId)),
                REQUIRED = DEFINITION?.required || 1,
                CHARGE = Math.min(REQUIRED, RUNTIME?.charge || 0),
                COOLDOWN = Math.max(0, RUNTIME?.cooldown || 0),
                READY = !!ID && CHARGE >= REQUIRED && COOLDOWN === 0;
            ELEMENT.querySelector('.formation-clock').style.setProperty(
                '--cooldown',
                `${(COOLDOWN / FORMATION_COOLDOWN_SECONDS) * 360}deg`,
            );
            ELEMENT.querySelector('.formation-charge i').style.width = `${(CHARGE / REQUIRED) * 100}%`;
            ELEMENT.querySelector('small').textContent = DEFINITION
                ? `${NUMBER(CHARGE)}/${NUMBER(REQUIRED)} ${CONDITION_LABELS[DEFINITION.condition] || ''}`
                : '농장에서 장착';
            ELEMENT.dataset.ready = String(READY);
            ELEMENT.querySelector('.formation-icon').setAttribute(
                'aria-label',
                `${DEFINITION?.name || '빈 슬롯'}, 재사용 ${NUMBER(COOLDOWN)}초`,
            );
        }
    }
    drawEditor(state, points, locked) {
        const EMPTY = Array.from({ length: state.slots }, (_, index) => index).find((index) => !state.equipped[index]);
        const SLOT_CARDS = Array.from({ length: state.slots }, (_, index) => {
            const ID = state.equipped[index],
                NAME = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === ID)?.name || '빈 슬롯';
            return `<div class="formation-equipped"><b>${index + 1}</b><span>${ESCAPE(NAME)}</span>
                <button type="button" data-formation-unequip="${index}" ${locked || !ID ? 'disabled' : ''}>
                해제</button></div>`;
        }).join('');
        const CARDS = FORMATION_SKILL_DEFINITIONS.map((definition) => {
            const LEVEL = state.levels[definition.id] || 0,
                EQUIPPED = state.equipped.includes(definition.id),
                BUY_DISABLED = locked || points < 1 || LEVEL >= FORMATION_MAX_LEVEL,
                EQUIP_DISABLED = locked || !LEVEL || EQUIPPED || EMPTY === undefined;
            return `<article class="formation-card" data-skill="${definition.id}">
                <div class="formation-card-heading"><span class="formation-card-icon">${ICONS[definition.id]}</span>
                <h3>${ESCAPE(definition.name)}</h3><small>${LEVEL ? `Lv.${LEVEL}` : '미습득'}</small></div>
                <p>${ESCAPE(definition.description || '')}</p>
                <div class="formation-rule">${CONDITION_LABELS[definition.condition] || ''} ${definition.required}
                <span>재사용 5초</span></div>
                <small class="formation-axis">강화: ${ESCAPE(definition.upgradeAxis || '')}<br>${NUMBER(formationUpgradeValue(definition, LEVEL))}${ESCAPE(definition.upgradeUnit)}${LEVEL > 0 && LEVEL < FORMATION_MAX_LEVEL ? ' → ' + NUMBER(formationUpgradeValue(definition, LEVEL + 1)) + ESCAPE(definition.upgradeUnit) : ''}</small>
                <div class="formation-card-actions"><button type="button" data-formation-purchase="${definition.id}"
                ${BUY_DISABLED ? 'disabled' : ''}>${LEVEL ? '강화' : '습득'} · 1 포인트</button>
                <button type="button" data-formation-equip="${definition.id}" data-slot="${EMPTY ?? 0}"
                ${EQUIP_DISABLED ? 'disabled' : ''}>${EQUIPPED ? '장착 중' : '장착'}</button></div></article>`;
        }).join('');
        this.content.innerHTML = `<p class="formation-intro">종별 패시브와 별도로, 조건과 재사용 시간이 준비되면 자동 발동합니다.</p>
            <p class="formation-wallet"><strong>${points}</strong> 공용 포인트
            <span>${locked ? '전투 중 편성 고정' : '농장에서 무료 장착·해제'}</span></p>
            <div class="formation-equipment">${SLOT_CARDS}</div>
            <button class="formation-add-slot" type="button" data-formation-buy-slot
            ${locked || state.slots >= 3 || points < 1 ? 'disabled' : ''}>
            ${state.slots >= 3 ? '슬롯 3칸 개방 완료' : '슬롯 추가 · 1 포인트'}</button>
            <div class="formation-catalog">${CARDS}</div>`;
    }
}
