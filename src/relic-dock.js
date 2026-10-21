import { FORMATION_SKILL_DEFINITIONS, FORMATION_COOLDOWN_SECONDS } from './formation-skill-state.js';

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
const NUMBER = (value) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(value || 0);

// Owns DOM only: the relics won on this climb, with how close each is to firing.
export class RelicDock {
    constructor() {
        this.key = '';
        this.root = document.createElement('section');
        this.root.className = 'formation-dock';
        this.root.setAttribute('aria-label', '유물');
        this.root.innerHTML = '<div class="formation-slots"></div>';
        document.querySelector('#gameplayDock').prepend(this.root);
        this.slotHost = this.root.querySelector('.formation-slots');
    }
    update(world, display, visible) {
        this.root.hidden = !visible;
        if (!visible) {
            return;
        }
        const RELICS = [...world.tower.relics],
            KEY = JSON.stringify(RELICS);
        if (KEY !== this.key) {
            this.key = KEY;
            this.slotHost.innerHTML = RELICS.map(([id, level]) => {
                const DEFINITION = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === id);
                return `<div class="formation-slot" data-formation-slot="${ESCAPE(id)}" data-empty="false">
                    <div class="formation-icon" title="${ESCAPE(DEFINITION.name)} Lv.${level}" aria-label="${ESCAPE(DEFINITION.name)} Lv.${level}">
                    <span>${RELIC_ICONS[id]}</span><i class="formation-clock"></i><em class="formation-lv">${level}</em></div>
                    <div class="formation-charge"><i></i></div></div>`;
            }).join('');
        }
        const RELICS_LEVEL = new Map(RELICS),
            SLOTS = display.formationSlots || world.formationSkills?.slots || [];
        for (const ELEMENT of this.slotHost.children) {
            const ID = ELEMENT.dataset.formationSlot,
                DEFINITION = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === ID),
                RUNTIME = SLOTS.find((item) => item.id === ID),
                REQUIRED = DEFINITION.required || 1,
                CHARGE = Math.min(REQUIRED, RUNTIME?.charge || 0),
                COOLDOWN = Math.max(0, RUNTIME?.cooldown || 0);
            ELEMENT.querySelector('.formation-clock').style.setProperty(
                '--cooldown',
                `${(COOLDOWN / FORMATION_COOLDOWN_SECONDS) * 360}deg`,
            );
            ELEMENT.querySelector('.formation-charge i').style.width = `${(CHARGE / REQUIRED) * 100}%`;
            ELEMENT.querySelector('.formation-icon').title =
                `${DEFINITION.name} Lv.${RELICS_LEVEL.get(ID)} · ${CONDITION_LABELS[DEFINITION.condition] || ''} ${NUMBER(CHARGE)}/${NUMBER(REQUIRED)}`;
            ELEMENT.dataset.ready = String(CHARGE >= REQUIRED && COOLDOWN === 0);
        }
    }
}
