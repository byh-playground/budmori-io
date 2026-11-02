import { LOCALE_TAG } from '../i18n/locale.js';
import { localized } from '../i18n/text.js';
import { SPECIES_INFO } from '../i18n/messages/ui-species-info.js';
import { speciesDescription, speciesName } from '../i18n/messages/species.js';
import { speciesPortraitSource } from '../units/species-paint.js';
import { baseUnitStatsFor } from '../units/unit-stats.js';
import { SPECIES_ABILITY_DEFINITIONS } from '../abilities/ability-definitions.js';

const NUMBER = (value) => new Intl.NumberFormat(LOCALE_TAG, { maximumFractionDigits: 2 }).format(value);
const TEXT = (value) =>
    String(value).replace(
        /[&<>"']/g,
        (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
    );
const STATS = [
    ['maxHp', SPECIES_INFO.maxHp],
    ['attackPower', SPECIES_INFO.attackPower],
    ['armor', SPECIES_INFO.armor],
    ['moveSpeed', SPECIES_INFO.moveSpeed],
    ['attackSpeed', SPECIES_INFO.attackSpeed],
    ['critChance', SPECIES_INFO.critChance, (value) => `${NUMBER(value * 100)}%`],
    ['critMultiplier', SPECIES_INFO.critMultiplier, (value) => `${NUMBER(value * 100)}%`],
];

// Read-only species reference: canonical catalog, ability definitions and stat resolver own the facts.
export function speciesInfoHtml(world, id) {
    const RESIDENTS = world.roster.residents().filter((unit) => !unit.seedling && unit.species === id),
        TIER = Math.max(1, ...RESIDENTS.map((unit) => unit.tier)),
        BASE = baseUnitStatsFor(1, id, false),
        OWNED = baseUnitStatsFor(TIER, id, false),
        ABILITY = SPECIES_ABILITY_DEFINITIONS.find((definition) => definition.species === id);
    return `<div class="species-info__portrait"><img src="${speciesPortraitSource(id)}" alt="" width="64" height="64"><p>${TEXT(speciesDescription(id))}</p></div>
        <h3>${TEXT(SPECIES_INFO.trait({ name: localized(ABILITY.name) }))}</h3><p>${TEXT(localized(ABILITY.description))}</p>
        <h3>${SPECIES_INFO.baseStats()}</h3><p>${SPECIES_INFO.baseStatsNote()}</p>
        <table><thead><tr><th scope="col">${SPECIES_INFO.statColumn()}</th><th scope="col">T1</th><th scope="col">${SPECIES_INFO.bestOwned({ tier: TIER })}</th></tr></thead><tbody>${STATS.map(([stat, label, format = NUMBER]) => `<tr><th scope="row">${label()}</th><td>${format(BASE[stat])}</td><td>${format(OWNED[stat])}</td></tr>`).join('')}</tbody></table>`;
}

export class SpeciesInfoDialog {
    constructor(dialog) {
        this.dialog = dialog;
        dialog.querySelector('[data-species-info-close]').addEventListener('click', () => dialog.close());
        // Stop the parent farm menu's Escape handler; the native dialog owns dismissal and focus restoration.
        dialog.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
            }
        });
    }
    open(world, id) {
        if (!world.roster.residents().some((unit) => !unit.seedling && unit.species === id)) {
            return;
        }
        this.dialog.querySelector('#speciesInfoTitle').textContent = SPECIES_INFO.title({ name: speciesName(id) });
        this.dialog.querySelector('#speciesInfoBody').innerHTML = speciesInfoHtml(world, id);
        this.dialog.showModal();
    }
}
