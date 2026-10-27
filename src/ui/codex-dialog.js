import { RECIPES, TEMPERAMENTS, ELEMENTS, ELEMENT_COUNT, TEMPERAMENT_COUNT } from '../model/lineage.js';
import { speciesById, SPECIES_COUNT } from '../units/species-catalog.js';
import { elementIconSvg, faceOverlaySvg } from '../units/species-face.js';

const TABS = Object.freeze([
    Object.freeze({ id: 'recipes', label: '조합식' }),
    Object.freeze({ id: 'forms', label: '성향' }),
    Object.freeze({ id: 'colors', label: '색' }),
]);

// A species picture; a known one in the grids also carries the temperament's brows and the element's cheeks and mark.
function icon(species, known, look = null) {
    const ENTRY = speciesById(species),
        IMAGE = `<img class="codex-icon${known ? '' : ' is-unknown'}" src="./assets/troops/${ENTRY.asset}" alt="${known ? ENTRY.name : '미발견'}" width="40" height="40" draggable="false">`;
    if (!known || !look) {
        return IMAGE;
    }
    return `<span class="codex-pic">${IMAGE}${faceOverlaySvg(species, look.temperament, look.element)}${elementIconSvg(look.element, 14)}</span>`;
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
    const KNOWN_SPECIES = new Set(world.codex.forms.map((form) => Math.floor(form / TEMPERAMENT_COUNT)));
    const ROWS = RECIPES.map((recipe, index) => {
        const FOUND = world.codex.recipes.includes(index),
            SELECTED = world.combine.recipe === index,
            RESULT_KNOWN = KNOWN_SPECIES.has(recipe.result),
            TIERS = SELECTED ? craftableTiers(world, recipe) : [],
            CHIPS =
                SELECTED && TIERS.length > 1
                    ? `<span class="codex-tiers">${TIERS.map((tier) => `<button type="button" class="codex-tier" data-tier="${tier}" aria-pressed="${tier === world.combine.tier}">T${tier}</button>`).join('')}</span>`
                    : '';
        return `<li><button type="button" class="codex-recipe" data-recipe="${index}" aria-pressed="${SELECTED}">${
            FOUND ? `${icon(recipe.a, true)}<b>+</b>${icon(recipe.b, true)}` : '<span class="codex-hidden">? + ?</span>'
        }<b>→</b>${icon(recipe.result, RESULT_KNOWN)}${SELECTED ? '<small>선택됨</small>' : ''}</button>${CHIPS}</li>`;
    });
    return `<p>조합할 식을 고르면 조합 버튼이 같은 등급 재료 두 마리를 합쳐요. 재료는 각각 3마리 이상 있어야 해요.</p><ul class="codex-recipes">${ROWS.join('')}</ul>`;
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
