import { SPECIES_CATALOG, speciesById } from './species-catalog.js';
import {
    RAID_DEPLOYMENT_CARD_LIMIT,
    RAID_DEPLOYMENT_CARD_SLOT_COST,
    isValidRaidDeploymentCardsState,
} from './raid-deployment-cards.js';

const ESCAPE = (value) =>
    String(value).replace(
        /[&<>"']/g,
        (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
    );

export class RaidDeploymentCardsUI {
    constructor({ command, deploy, canDeploy }) {
        this.command = command;
        this.deploy = deploy;
        this.canDeploy = canDeploy;
        this.editorFingerprint = '';
        this.raidFingerprint = '';
        this.hold = null;
        this.timer = null;
        this.root = document.querySelector('#deploymentCards');
        this.row = this.root.querySelector('.deployment-card-row');
        this.content = document.querySelector('#deploymentCardContent');
        this.content.addEventListener('change', (event) => this.change(event));
        this.content.addEventListener('click', (event) => this.click(event));
        this.row.addEventListener('pointerdown', (event) => this.pointerDown(event));
        this.row.addEventListener('pointerup', (event) => this.stopHold(event));
        this.row.addEventListener('pointercancel', (event) => this.stopHold(event));
        this.row.addEventListener('lostpointercapture', (event) => this.stopHold(event));
        this.row.addEventListener('click', (event) => event.preventDefault());
        this.row.addEventListener('keydown', (event) => this.keyDown(event));
        this.row.addEventListener('keyup', (event) => this.keyUp(event));
        this.row.addEventListener('blur', () => this.stopHold(), true);
        window.addEventListener('blur', () => this.stopHold());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopHold();
            }
        });
    }
    change(event) {
        const SELECT = event.target.closest('select[data-deployment-slot]');
        if (!SELECT || SELECT.disabled) {
            return;
        }
        const VALUE = SELECT.value === '' ? null : Number(SELECT.value);
        this.command('deployment-card-select', { slot: Number(SELECT.dataset.deploymentSlot), speciesId: VALUE });
    }
    click(event) {
        const BUTTON = event.target.closest('button[data-deployment-buy-slot]');
        if (BUTTON && !BUTTON.disabled) {
            this.command('deployment-card-buy-slot', {});
        }
    }
    pointerDown(event) {
        const BUTTON = event.target.closest('button[data-deploy-species]');
        if (!BUTTON || event.button !== 0 || BUTTON.disabled || !this.canDeploy() || this.hold) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (!this.beginHold(BUTTON.dataset.deploySpecies, event.pointerId)) {
            return;
        }
        BUTTON.setPointerCapture?.(event.pointerId);
    }
    keyDown(event) {
        const BUTTON = event.target.closest('button[data-deploy-species]');
        if (!BUTTON || !['Enter', ' '].includes(event.key)) {
            return;
        }
        event.preventDefault();
        if (!event.repeat && !this.hold && !BUTTON.disabled && this.canDeploy()) {
            this.beginHold(BUTTON.dataset.deploySpecies, 'keyboard');
        }
    }
    keyUp(event) {
        if (['Enter', ' '].includes(event.key)) {
            event.preventDefault();
            this.stopHold();
        }
    }
    beginHold(speciesId, pointerId) {
        if (!this.deploy(Number(speciesId))) {
            return false;
        }
        this.hold = { speciesId, pointerId };
        this.row.querySelector(`[data-deploy-species="${speciesId}"]`)?.setAttribute('aria-pressed', 'true');
        this.timer = setInterval(() => {
            if (!this.hold || !this.canDeploy() || !this.deploy(Number(this.hold.speciesId))) {
                this.stopHold();
            }
        }, 100);
        return true;
    }
    stopHold(event) {
        if (event && this.hold?.pointerId !== event.pointerId) {
            return;
        }
        const HOLD = this.hold;
        this.hold = null;
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.row.querySelector(`[data-deploy-species="${HOLD?.speciesId}"]`)?.setAttribute('aria-pressed', 'false');
        if (typeof HOLD?.pointerId === 'number') {
            const BUTTON = [...this.row.querySelectorAll('[data-deploy-species]')].find(
                (button) => button.dataset.deploySpecies === HOLD.speciesId,
            );
            if (BUTTON?.hasPointerCapture?.(HOLD.pointerId)) {
                BUTTON.releasePointerCapture(HOLD.pointerId);
            }
        }
    }
    update(world, sourceWorld, visible, ownerId = '', canEditLoadout = world.scene === 'farm') {
        const ROSTER = world.scene === 'raid' && world.raidRoster(ownerId),
            SHOW_RAID = !!visible && !!ROSTER;
        this.root.hidden = !SHOW_RAID;
        if (!SHOW_RAID) {
            this.stopHold();
            this.raidFingerprint = '';
        } else {
            if (!this.canDeploy() || ['victory', 'defeat'].includes(world.encounter.outcome)) {
                this.stopHold();
            }
            const KEY = JSON.stringify(ROSTER.deploymentCardSpecies);
            if (KEY !== this.raidFingerprint) {
                this.raidFingerprint = KEY;
                this.drawRaidCards(ROSTER);
            }
            this.updateRaidCounts(ROSTER);
        }
        const PLAYER = sourceWorld?.playerProgression,
            STATE = PLAYER?.raidDeploymentCards;
        if (!STATE || !isValidRaidDeploymentCardsState(STATE)) {
            this.content.replaceChildren();
            this.editorFingerprint = '';
            return;
        }
        const LOCKED =
                !canEditLoadout ||
                world.scene !== 'farm' ||
                sourceWorld.running ||
                sourceWorld.farmBossEvent?.phase !== 'idle',
            OWNED = sourceWorld.units
                .filter((unit) => unit.countsTowardPermanentRoster !== false)
                .reduce((map, unit) => map.set(unit.species, (map.get(unit.species) || 0) + 1), new Map()),
            KEY = JSON.stringify([STATE, PLAYER.availablePoints, LOCKED, [...OWNED]]);
        if (KEY !== this.editorFingerprint) {
            this.editorFingerprint = KEY;
            this.drawEditor(STATE, PLAYER.availablePoints, LOCKED, OWNED);
        }
    }
    drawRaidCards(roster) {
        const SPECIES = roster.deploymentCardSpecies || [],
            AVAILABLE = (speciesId) =>
                roster.troops.filter((troop) => troop.species === speciesId && !troop.deployed).length,
            ACTIVE = (speciesId) => SPECIES.some((candidate) => candidate === speciesId);
        this.row.innerHTML = SPECIES.map((speciesId, index) => {
            const SPECIES_INFO = speciesById(speciesId),
                REMAINING = AVAILABLE(speciesId);
            return `<button class="deployment-card" type="button" data-deploy-species="${speciesId}"
                aria-label="${ESCAPE(SPECIES_INFO.name)} 병력 배치, 남은 ${REMAINING}마리"
                aria-pressed="false" ${REMAINING === 0 || !ACTIVE(speciesId) ? 'disabled' : ''}>
                <span class="deployment-card__number">${index + 1}</span>
                <strong>${ESCAPE(SPECIES_INFO.name)}</strong><small>${REMAINING} 남음</small></button>`;
        }).join('');
    }
    updateRaidCounts(roster) {
        for (const BUTTON of this.row.querySelectorAll('button[data-deploy-species]')) {
            const SPECIES_ID = Number(BUTTON.dataset.deploySpecies),
                REMAINING = roster.troops.filter((troop) => troop.species === SPECIES_ID && !troop.deployed).length;
            BUTTON.disabled = REMAINING === 0;
            BUTTON.querySelector('small').textContent = `${REMAINING} \uB0A8\uC74C`;
            BUTTON.setAttribute(
                'aria-label',
                `${speciesById(SPECIES_ID).name} \uBCD1\uB825 \uBC30\uCE58, \uB0A8\uC740 ${REMAINING}\uB9C8\uB9AC`,
            );
        }
    }
    drawEditor(state, points, locked, owned) {
        const UNLOCKED = Array.from({ length: state.unlockedSlots }, (_, slot) => {
            const CURRENT = state.speciesBySlot[slot],
                OPTIONS = SPECIES_CATALOG.filter(({ id }) => owned.has(id));
            return `<article class="deployment-editor-slot">
                <label for="deploymentSpecies${slot}">슬롯 ${slot + 1}${slot === 0 ? ' · 무료' : ''}</label>
                <select id="deploymentSpecies${slot}" data-deployment-slot="${slot}" ${locked ? 'disabled' : ''}>
                    <option value="">선택 안 함</option>
                    ${OPTIONS.map(
                        ({ id, name }) => `<option value="${id}" ${CURRENT === id ? 'selected' : ''}
                        ${state.speciesBySlot.some((selected, index) => index !== slot && selected === id) ? 'disabled' : ''}>
                        ${ESCAPE(name)} (${owned.get(id)})</option>`,
                    ).join('')}
                </select></article>`;
        }).join('');
        const LOCKED = Array.from(
            { length: RAID_DEPLOYMENT_CARD_LIMIT - state.unlockedSlots },
            (_, index) => state.unlockedSlots + index,
        )
            .map(
                (slot) => `<button class="deployment-card-buy" type="button" data-deployment-buy-slot
            ${locked || points < RAID_DEPLOYMENT_CARD_SLOT_COST ? 'disabled' : ''}>
            슬롯 ${slot + 1} 잠김 · ${RAID_DEPLOYMENT_CARD_SLOT_COST} 포인트로 해금</button>`,
            )
            .join('');
        this.content.innerHTML = `<p class="deployment-card-intro">보유한 병종을 최대 4개 편성하고, 카드를 누르거나 길게 눌러 한 마리씩 배치합니다. 편성은 농장에서만 바꿀 수 있습니다.</p>
            <p class="deployment-card-wallet"><strong>${points}</strong> 공용 포인트</p>
            <div class="deployment-editor-slots">${UNLOCKED}${LOCKED}</div>`;
    }
}
