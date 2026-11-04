import { LOCALE } from '../i18n/locale.js';
import {
    RECIPES,
    TEMPERAMENTS,
    TEMPERAMENT_TILTS,
    ELEMENTS,
    ELEMENT_COUNT,
    TEMPERAMENT_COUNT,
    elementMultiplier,
} from '../model/lineage.js';
import { SPECIES_COUNT } from '../units/species-catalog.js';
import { elementIconSvg } from '../units/species-face.js';
import { iconSvg } from './icons.js';
import { speciesPortraitSource } from '../units/species-paint.js';
import { CODEX } from '../i18n/messages/ui-codex.js';
import { SPECIES_INFO } from '../i18n/messages/ui-species-info.js';
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

// The "?" beside a grid opens a note under it. It is built from the model's own tables, so the chart never drifts
// from what the fights use.
const HELP_ID = 'codexHelp';
function helpHtml(label, noteHtml) {
    return `<div class="codex-help"><button type="button" class="codex-help__button" aria-expanded="false" aria-controls="${HELP_ID}" aria-label="${label}" title="${label}">?</button></div><div class="codex-help__note" id="${HELP_ID}" hidden>${noteHtml}</div>`;
}
const SIGNED_PERCENT = (factor) => `${factor >= 1 ? '+' : '−'}${Math.round(Math.abs(factor - 1) * 100)}%`;
function temperamentNote() {
    const ROWS = TEMPERAMENTS.map((entry, index) => {
        const PARTS = Object.entries(TEMPERAMENT_TILTS[index]).map(([stat, factor]) =>
            stat === 'regenPct' ? CODEX.tiltRegen() : `${SPECIES_INFO[stat]()} ${SIGNED_PERCENT(factor)}`,
        );
        return `<tr><th scope="row">${LOCALE.text(entry.name)}</th><td>${PARTS.join(' · ')}</td></tr>`;
    });
    return `<p>${CODEX.temperamentHelpIntro()}</p><table class="codex-chart"><tbody>${ROWS.join('')}</tbody></table>`;
}
function elementNote() {
    const ELEMENT_LIST = ELEMENTS.slice(1, ELEMENT_COUNT + 1),
        NAME = (entry) => LOCALE.text(entry.name),
        HEAD = [...ELEMENT_LIST, ELEMENTS[0]].map((entry) => `<th scope="col">${NAME(entry)}</th>`).join(''),
        ROWS = ELEMENT_LIST.map((attacker) => {
            const CELLS = [...ELEMENT_LIST, ELEMENTS[0]].map((defender) => {
                const MULTIPLIER = elementMultiplier(attacker.id, defender.id),
                    TONE = MULTIPLIER > 1 ? ' class="is-strong"' : MULTIPLIER < 1 ? ' class="is-weak"' : '';
                return `<td${TONE}>×${MULTIPLIER}</td>`;
            });
            return `<tr><th scope="row">${NAME(attacker)}</th>${CELLS.join('')}</tr>`;
        });
    return `<p>${CODEX.elementHelpIntro()}</p><table class="codex-chart"><thead><tr><th scope="col">${CODEX.elementHelpAttack()}</th>${HEAD}</tr></thead><tbody>${ROWS.join('')}</tbody></table><p>${CODEX.elementHelpTotal()}</p><p>${CODEX.elementHelpBoss()}</p>`;
}
// Opens or closes the note behind a "?" button; the codex body is not repainted, so nothing else resets.
export function toggleCodexHelp(button) {
    const NOTE = document.getElementById(HELP_ID),
        OPEN = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(OPEN));
    NOTE.hidden = !OPEN;
}

function gridHtml(list, columns, label, lookFor, help = '') {
    const HEAD = columns.map((column) => `<th scope="col">${column}</th>`).join('');
    const ROWS = Array.from({ length: SPECIES_COUNT }, (_, species) => {
        const CELLS = columns.map((_, column) => {
            const HAS = list.includes(species * columns.length + column);
            return `<td>${icon(species, HAS, lookFor(column))}</td>`;
        });
        return `<tr><th scope="row">${speciesName(species)}</th>${CELLS.join('')}</tr>`;
    });
    return `${help}<table class="codex-grid" aria-label="${label}"><thead><tr><td></td>${HEAD}</tr></thead><tbody>${ROWS.join('')}</tbody></table><p class="codex-count">${list.length} / ${SPECIES_COUNT * columns.length}</p>`;
}

export function codexHtml(world, tab) {
    if (tab === 'forms') {
        return gridHtml(
            world.codex.forms,
            TEMPERAMENTS.map((entry) => LOCALE.text(entry.name)),
            CODEX.formsGrid(),
            (column) => ({ temperament: column, element: 0 }),
            helpHtml(CODEX.helpTemperament(), temperamentNote()),
        );
    }
    if (tab === 'colors') {
        return gridHtml(
            world.codex.colors,
            ELEMENTS.slice(1, ELEMENT_COUNT + 1).map((entry) => LOCALE.text(entry.name)),
            CODEX.colorsGrid(),
            (column) => ({ temperament: 0, element: column + 1 }),
            helpHtml(CODEX.helpElement(), elementNote()),
        );
    }
    return recipesHtml(world);
}

export const CODEX_TABS = TABS;
