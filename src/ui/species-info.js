import { speciesById } from '../units/species-catalog.js';
import { speciesPortraitSource } from '../units/species-paint.js';
import { baseUnitStatsFor } from '../units/unit-stats.js';
import { SPECIES_ABILITY_DEFINITIONS } from '../abilities/ability-definitions.js';

const NUMBER = (value) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(value);
const TEXT = (value) =>
    String(value).replace(
        /[&<>"']/g,
        (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
    );
const STATS = [
    ['maxHp', '체력'],
    ['attackPower', '공격력'],
    ['armor', '방어력'],
    ['moveSpeed', '이동 속도'],
    ['attackSpeed', '공격 속도'],
    ['critChance', '치명타 확률', (value) => `${NUMBER(value * 100)}%`],
    ['critMultiplier', '치명타 피해', (value) => `${NUMBER(value * 100)}%`],
];

// Read-only species reference: canonical catalog, ability definitions and stat resolver own the facts.
export function speciesInfoHtml(world, id) {
    const SPECIES = speciesById(id),
        RESIDENTS = world.roster.residents().filter((unit) => !unit.seedling && unit.species === id),
        TIER = Math.max(1, ...RESIDENTS.map((unit) => unit.tier)),
        BASE = baseUnitStatsFor(1, id, false),
        OWNED = baseUnitStatsFor(TIER, id, false),
        ABILITY = SPECIES_ABILITY_DEFINITIONS.find((definition) => definition.species === id);
    return `<div class="species-info__portrait"><img src="${speciesPortraitSource(id)}" alt="" width="64" height="64"><p>${TEXT(SPECIES.description)}</p></div>
        <h3>병종 특성 · ${TEXT(ABILITY.name)}</h3><p>${TEXT(ABILITY.description)}</p>
        <h3>기본 스펙</h3><p>영구 성장·성향·카드·일시 효과를 적용하기 전 수치예요. 공격력은 타격별 배율을 적용하기 전 기준이며, 실제 공격은 병종의 동작과 강화에 따라 달라져요.</p>
        <table><thead><tr><th scope="col">능력치</th><th scope="col">T1</th><th scope="col">보유 최고 T${TIER}</th></tr></thead><tbody>${STATS.map(([stat, label, format = NUMBER]) => `<tr><th scope="row">${label}</th><td>${format(BASE[stat])}</td><td>${format(OWNED[stat])}</td></tr>`).join('')}</tbody></table>`;
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
        this.dialog.querySelector('#speciesInfoTitle').textContent = `${speciesById(id).name} 병종 정보`;
        this.dialog.querySelector('#speciesInfoBody').innerHTML = speciesInfoHtml(world, id);
        this.dialog.showModal();
    }
}
