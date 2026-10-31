import { RECIPES, TEMPERAMENTS, ELEMENTS, ELEMENT_COUNT, TEMPERAMENT_COUNT } from '../model/lineage.js';
import { speciesById, SPECIES_COUNT } from '../units/species-catalog.js';
import { elementIconSvg } from '../units/species-face.js';
import { iconSvg } from './icons.js';
import { speciesPortraitSource } from '../units/species-paint.js';

const TABS = Object.freeze([
    Object.freeze({ id: 'recipes', label: '조합식' }),
    Object.freeze({ id: 'forms', label: '성향' }),
    Object.freeze({ id: 'colors', label: '색' }),
]);

// The authored face selection and cheek fills match the native player's data.
function icon(species, known, look = null) {
    const ENTRY = speciesById(species),
        IMAGE = `<img class="codex-icon${known ? '' : ' is-unknown'}" src="${speciesPortraitSource(species, known ? look?.element : 0, known ? look?.temperament : -1)}" alt="${known ? ENTRY.name : '미발견'}" width="40" height="40" draggable="false">`;
    if (!known || !look) {
        return IMAGE;
    }
    return `<span class="codex-pic">${IMAGE}${elementIconSvg(look.element, 14)}</span>`;
}

// The species tiers a recipe can be made at right now: both ingredients owned at the same tier.
function craftableTiers(world, recipe) {
    const TIERS = new Map();
    for (const UNIT of world.roster.residents()) {
        if (!UNIT.seedling && (UNIT.species === recipe.a || UNIT.species === recipe.b)) {
            const SPECIES = TIERS.get(UNIT.tier) || new Set();
            SPECIES.add(UNIT.species);
            TIERS.set(UNIT.tier, SPECIES);
        }
    }
    return [...TIERS]
        .filter(([, species]) => species.size === 2)
        .map(([tier]) => tier)
        .sort((a, b) => a - b);
}

function recipesHtml(world) {
    const KNOWN_SPECIES = new Set(world.codex.forms.map((form) => Math.floor(form / TEMPERAMENT_COUNT))),
        COUNTS = new Map();
    for (const UNIT of world.roster.residents()) {
        if (!UNIT.seedling) {
            COUNTS.set(UNIT.species, (COUNTS.get(UNIT.species) || 0) + 1);
        }
    }
    const PORTRAIT = (species) => {
        const KNOWN = KNOWN_SPECIES.has(species);
        return `<span class="codex-ingredient">${icon(species, KNOWN)}<span>${KNOWN ? speciesById(species).name : '미발견'}</span></span>`;
    };
    const ROW = (recipe, index, species) => {
        const SELECTED = world.combine.recipe === index,
            PARTNER = recipe.a === species ? recipe.b : recipe.a,
            TIERS = SELECTED ? craftableTiers(world, recipe) : [],
            CHIPS =
                SELECTED && TIERS.length > 1
                    ? `<span class="codex-tiers">${TIERS.map((tier) => `<button type="button" class="codex-tier" data-tier="${tier}" aria-pressed="${tier === world.combine.tier}">T${tier}</button>`).join('')}</span>`
                    : '';
        return `<li><button type="button" class="codex-recipe" data-recipe="${index}" aria-pressed="${SELECTED}">${PORTRAIT(species)}<b>${iconSvg('plus')}</b>${PORTRAIT(PARTNER)}<b>${iconSvg('arrow-right')}</b>${PORTRAIT(recipe.result)}<small>${SELECTED ? '선택됨' : world.codex.recipes.includes(index) ? '조합 발견' : '조합 미확인'}</small></button>${CHIPS}</li>`;
    };
    const GROUPS = [...KNOWN_SPECIES]
        .sort((a, b) => a - b)
        .map((species) => {
            const ROWS = RECIPES.flatMap((recipe, index) =>
                recipe.a === species || recipe.b === species ? [ROW(recipe, index, species)] : [],
            );
            return `<section class="codex-uses" data-ingredient="${species}"><h3>${speciesById(species).name}<span>현재 보유 ${COUNTS.get(species) || 0}마리</span></h3>${ROWS.length ? `<ul class="codex-recipes">${ROWS.join('')}</ul>` : '<p>이 병종을 재료로 쓰는 조합은 없어요.</p>'}</section>`;
        });
    return `<p>발견한 병종을 재료로 쓰는 조합이에요. 미발견 병종은 실루엣으로 보여요. 보유 수는 새싹을 제외한 전체 등급 합계예요.</p><p>조합식을 고른 뒤 조합 버튼을 누르세요. 각 재료 병종은 번식을 위해 최소 2마리를 남겨요(전체 등급 합산). 남겨둘 2마리를 제외한 여유 유닛 중 같은 등급의 성체를 각 병종에서 1마리씩 조합해요.</p>${GROUPS.length ? GROUPS.join('') : '<p>병종을 발견하면 활용할 수 있는 조합이 여기에 나타나요.</p>'}`;
}

function gridHtml(list, columns, label, lookFor) {
    const HEAD = columns.map((column) => `<th scope="col">${column}</th>`).join('');
    const ROWS = Array.from({ length: SPECIES_COUNT }, (_, species) => {
        const CELLS = columns.map((_, column) => {
            const HAS = list.includes(species * columns.length + column);
            return `<td>${icon(species, HAS, lookFor(column))}</td>`;
        });
        return `<tr><th scope="row">${speciesById(species).name}</th>${CELLS.join('')}</tr>`;
    });
    return `<table class="codex-grid" aria-label="${label}"><thead><tr><td></td>${HEAD}</tr></thead><tbody>${ROWS.join('')}</tbody></table><p class="codex-count">${list.length} / ${SPECIES_COUNT * columns.length}</p>`;
}

export function codexHtml(world, tab) {
    if (tab === 'forms') {
        return gridHtml(
            world.codex.forms,
            TEMPERAMENTS.map((entry) => entry.name),
            '성향 도감',
            (column) => ({ temperament: column, element: 0 }),
        );
    }
    if (tab === 'colors') {
        return gridHtml(
            world.codex.colors,
            ELEMENTS.slice(1, ELEMENT_COUNT + 1).map((entry) => entry.name),
            '색 도감',
            (column) => ({ temperament: 0, element: column + 1 }),
        );
    }
    return recipesHtml(world);
}

export const CODEX_TABS = TABS;
