import { LOCALE } from '../i18n/locale.js';
import { RECIPES, TEMPERAMENTS, ELEMENTS, ELEMENT_COUNT, TEMPERAMENT_COUNT } from '../model/lineage.js';
import { SPECIES_COUNT } from '../units/species-catalog.js';
import { elementIconSvg } from '../units/species-face.js';
import { iconSvg } from './icons.js';
import { speciesPortraitSource } from '../units/species-paint.js';
import { CODEX } from '../i18n/messages/ui-codex.js';
import { speciesName } from '../i18n/messages/species.js';

const TABS = Object.freeze([
    Object.freeze({ id: 'recipes', label: CODEX.tabRecipes() }),
    Object.freeze({ id: 'forms', label: CODEX.tabForms() }),
    Object.freeze({ id: 'colors', label: CODEX.tabColors() }),
]);

// The authored face selection and cheek fills match the native player's data.
function icon(species, known, look = null) {
    const IMAGE = `<img class="codex-icon${known ? '' : ' is-unknown'}" src="${speciesPortraitSource(species, known ? look?.element : 0, known ? look?.temperament : -1)}" alt="${known ? speciesName(species) : CODEX.undiscovered()}" width="40" height="40" draggable="false">`;
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
        return `<span class="codex-ingredient">${icon(species, KNOWN)}<span>${KNOWN ? speciesName(species) : CODEX.undiscovered()}</span></span>`;
    };
    const ROW = (recipe, index, species) => {
        const SELECTED = world.combine.recipe === index,
            PARTNER = recipe.a === species ? recipe.b : recipe.a,
            TIERS = SELECTED ? craftableTiers(world, recipe) : [],
            CHIPS =
                SELECTED && TIERS.length > 1
                    ? `<span class="codex-tiers">${TIERS.map((tier) => `<button type="button" class="codex-tier" data-tier="${tier}" aria-pressed="${tier === world.combine.tier}">T${tier}</button>`).join('')}</span>`
                    : '';
        return `<li><button type="button" class="codex-recipe" data-recipe="${index}" aria-pressed="${SELECTED}">${PORTRAIT(species)}<b>${iconSvg('plus')}</b>${PORTRAIT(PARTNER)}<b>${iconSvg('arrow-right')}</b>${PORTRAIT(recipe.result)}<small>${SELECTED ? CODEX.selected() : world.codex.recipes.includes(index) ? CODEX.recipeFound() : CODEX.recipeUnknown()}</small></button>${CHIPS}</li>`;
    };
    const GROUPS = [...KNOWN_SPECIES]
        .sort((a, b) => a - b)
        .map((species) => {
            const ROWS = RECIPES.flatMap((recipe, index) =>
                recipe.a === species || recipe.b === species ? [ROW(recipe, index, species)] : [],
            );
            return `<section class="codex-uses" data-ingredient="${species}"><h3>${speciesName(species)}<span>${CODEX.owned({ count: COUNTS.get(species) || 0 })}</span></h3>${ROWS.length ? `<ul class="codex-recipes">${ROWS.join('')}</ul>` : `<p>${CODEX.noRecipes()}</p>`}</section>`;
        });
    return `<p>${CODEX.recipesIntro()}</p><p>${CODEX.recipesHowTo()}</p>${GROUPS.length ? GROUPS.join('') : `<p>${CODEX.recipesEmpty()}</p>`}`;
}

function gridHtml(list, columns, label, lookFor) {
    const HEAD = columns.map((column) => `<th scope="col">${column}</th>`).join('');
    const ROWS = Array.from({ length: SPECIES_COUNT }, (_, species) => {
        const CELLS = columns.map((_, column) => {
            const HAS = list.includes(species * columns.length + column);
            return `<td>${icon(species, HAS, lookFor(column))}</td>`;
        });
        return `<tr><th scope="row">${speciesName(species)}</th>${CELLS.join('')}</tr>`;
    });
    return `<table class="codex-grid" aria-label="${label}"><thead><tr><td></td>${HEAD}</tr></thead><tbody>${ROWS.join('')}</tbody></table><p class="codex-count">${list.length} / ${SPECIES_COUNT * columns.length}</p>`;
}

export function codexHtml(world, tab) {
    if (tab === 'forms') {
        return gridHtml(
            world.codex.forms,
            TEMPERAMENTS.map((entry) => LOCALE.text(entry.name)),
            CODEX.formsGrid(),
            (column) => ({ temperament: column, element: 0 }),
        );
    }
    if (tab === 'colors') {
        return gridHtml(
            world.codex.colors,
            ELEMENTS.slice(1, ELEMENT_COUNT + 1).map((entry) => LOCALE.text(entry.name)),
            CODEX.colorsGrid(),
            (column) => ({ temperament: 0, element: column + 1 }),
        );
    }
    return recipesHtml(world);
}

export const CODEX_TABS = TABS;
