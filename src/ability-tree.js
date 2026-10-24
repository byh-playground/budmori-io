import { SPECIES_ABILITY_DEFINITIONS, abilityPresentationFor } from './ability-catalog.js';
import { SPECIES_CATALOG, speciesById } from './species-catalog.js';
import { isValidAbilityProgressionState, masteryXpForNextLevel } from './ability-state.js';
import { abilityProfile } from './unit-abilities.js';
import { formatXpForDisplay } from './player-progression.js';
import { isGrowthInvestment } from './features/species-growth/state.js';
import { renderGrowthCardMarkup, renderGrowthMasteryMarkup } from './species-growth-presentation.js';
import {
    canResetAbilityProgression,
    getAbilityNodeStatus,
    getAbilityPointsLeft,
    getInvestedAbilityPointCount,
    purchaseAbilityNode,
    resetAbilityProgression,
} from './ability-progression.js';

const DEFAULT_ABILITY_PRESENTATION = {
    label(_definition, _value, level) {
        return `강화 ${level}`;
    },
    title() {
        return '능력 강화';
    },
};
const INVESTMENT_REASON_LABELS = new Map([
    ['already-invested', '이미 투자한 항목이에요.'],
    ['prerequisite-required', '이전 단계에 먼저 투자해야 해요.'],
    ['insufficient-points', '이 종의 숙련 포인트가 필요해요. 이 종 보스를 잡으면 쌓여요.'],
    ['combat-lock', '전투 중에는 투자할 수 없어요.'],
    ['farm-only', '농장에서만 투자할 수 있어요.'],
    ['max-level', '최대 강화 단계예요.'],
    ['invalid-state', '성장 정보를 불러올 수 없어요.'],
]);
const NODE_REASON_LABELS = new Map([...Array.from(INVESTMENT_REASON_LABELS, ([reason, text]) => [reason, () => text])]);
const RESET_REASON_LABELS = new Map([
    ['nothing-invested', '투자한 포인트가 없어요.'],
    ['combat-lock', '전투 중에는 초기화할 수 없어요.'],
    ['farm-only', '농장에서만 초기화할 수 있어요.'],
    ['invalid-state', INVESTMENT_REASON_LABELS.get('invalid-state')],
]);
export function renderAbilitySpeciesTabsMarkup(selectedSpecies = 0) {
    return SPECIES_CATALOG.map(
        (species) =>
            `<button type="button" data-ability-species="${species.id}" aria-pressed="${species.id === selectedSpecies}">${species.name}</button>`,
    ).join('');
}
export function renderAbilityTreeMarkup(
    state,
    { highestSpeciesTier = {}, location = 'farm', inCombat = false, runActive = false, selectedSpecies = null } = {},
) {
    if (!isValidAbilityProgressionState(state)) {
        throw new TypeError('Cannot render invalid ability progression state');
    }
    const INVESTED = getInvestedAbilityPointCount(state, Number.isInteger(selectedSpecies) ? selectedSpecies : null);
    const CONTEXT = {
        highestSpeciesTier,
        location,
        inCombat,
        runActive,
    };
    const RESET_CHECK = canResetAbilityProgression(
        state,
        CONTEXT,
        Number.isInteger(selectedSpecies) ? selectedSpecies : null,
    );
    const VISIBLE_DEFINITIONS = Number.isInteger(selectedSpecies)
        ? SPECIES_ABILITY_DEFINITIONS.filter((definition) => definition.species === selectedSpecies)
        : SPECIES_ABILITY_DEFINITIONS;
    const CARDS =
        VISIBLE_DEFINITIONS.map((definition) =>
            isGrowthInvestment(state.abilities[definition.id])
                ? renderGrowthCardMarkup(state, definition, CONTEXT)
                : renderAbilityCard(state, definition, CONTEXT),
        ).join('') ||
        `<p class="ability-tree__note" role="status">이 병종은 기본 공격으로 싸워요. 아직 강화할 특성은 없어요.</p>`;
    const FOCUS = Number.isInteger(selectedSpecies)
            ? SPECIES_ABILITY_DEFINITIONS.find((definition) => definition.species === selectedSpecies)
            : null,
        POINTS = FOCUS
            ? getAbilityPointsLeft(state, FOCUS.id)
            : SPECIES_ABILITY_DEFINITIONS.reduce(
                  (total, definition) => total + getAbilityPointsLeft(state, definition.id),
                  0,
              ),
        LEVEL_MARKUP = FOCUS
            ? isGrowthInvestment(state.abilities[FOCUS.id])
                ? renderGrowthMasteryMarkup(state.abilities[FOCUS.id], FOCUS)
                : renderMasteryMarkup(state.abilities[FOCUS.id], speciesById(FOCUS.species).name)
            : '',
        DEFAULTS_NOTE =
            '각 병종의 기본 특성은 T1부터 적용돼요. 같은 병종의 보스를 쓰러뜨리면 숙련이 올라 특성을 강화할 포인트를 얻어요.';
    return `<section class="ability-tree" aria-labelledby="ability-tree-title">
    <header class="ability-tree__header">
      <div><p class="ability-tree__eyebrow">농장 성장</p><h2 id="ability-tree-title">병종 특성</h2></div>
      <p class="ability-tree__wallet" aria-live="polite"><strong>${POINTS}</strong><span>숙련 포인트</span></p>
    </header>
    <p class="ability-tree__note">${DEFAULTS_NOTE}</p>
    ${LEVEL_MARKUP}
    <div class="ability-tree__actions">
      <p class="ability-tree__lock-note" role="status">${inCombat || runActive ? '탑 도전 중에는 투자하거나 초기화할 수 없어요.' : location !== 'farm' ? '농장에서 투자하거나 초기화할 수 있어요.' : '농장에서 무료로 초기화할 수 있어요.'}</p>
      <button type="button" class="ability-tree__reset" data-ability-action="reset" aria-describedby="ability-tree-reset-help" aria-disabled="${!RESET_CHECK.allowed}">무료 초기화</button>
      <span class="ability-tree__action-help" id="ability-tree-reset-help">${resetReasonLabel(RESET_CHECK.reason, INVESTED)}</span>
    </div>
    <div class="ability-tree__cards">${CARDS}</div>
  </section>`;
}
function renderMasteryMarkup(mastery, speciesName) {
    const NEXT_LEVEL_XP = masteryXpForNextLevel(mastery.masteryLevel),
        LABEL = `${speciesName} 숙련 ${mastery.masteryLevel} 경험치`;
    return `<div class="ability-tree__progress" aria-live="polite">
    <div><strong>${speciesName} 숙련 Lv. ${mastery.masteryLevel}</strong><span>${formatXpForDisplay(mastery.masteryXp)} / ${formatXpForDisplay(NEXT_LEVEL_XP)} XP</span></div>
    <progress max="${NEXT_LEVEL_XP}" value="${mastery.masteryXp}" aria-label="${LABEL}"></progress>
  </div>`;
}
export function mountAbilityTreePanel(host, { getState, getContext = () => ({}), onStateChange = () => {} } = {}) {
    if (!host || typeof host.addEventListener !== 'function') {
        throw new TypeError('A DOM host element is required');
    }
    if (typeof getState !== 'function') {
        throw new TypeError('getState callback is required');
    }
    const RENDER = () => {
        const STATE = getState();
        host.innerHTML = renderAbilityTreeMarkup(STATE, getContext());
    };
    const ON_CLICK = (event) => {
        const BUTTON = event.target?.closest?.('button[data-ability-action],button[data-ability-node]');
        if (!BUTTON || BUTTON.getAttribute('aria-disabled') === 'true') {
            return;
        }
        const STATE = getState();
        const CONTEXT = getContext();
        let result;
        if (BUTTON.dataset.abilityAction === 'reset') {
            result = resetAbilityProgression(
                STATE,
                CONTEXT,
                Number.isInteger(CONTEXT.selectedSpecies) ? CONTEXT.selectedSpecies : null,
            );
        } else if (BUTTON.dataset.abilityNode) {
            const [ABILITY_ID, KIND, LEVEL] = BUTTON.dataset.abilityNode.split(':');
            const NODE_ID = KIND === 'root' ? 'root' : `${KIND}-${LEVEL}`;
            result = purchaseAbilityNode(STATE, ABILITY_ID, NODE_ID, CONTEXT);
        }
        if (result?.ok) {
            onStateChange(result.state, result);
            RENDER();
        }
    };
    host.addEventListener('click', ON_CLICK);
    RENDER();
    return {
        render: RENDER,
        dispose() {
            host.removeEventListener('click', ON_CLICK);
        },
    };
}
function renderAbilityCard(state, definition, context) {
    const INVESTMENT = state.abilities[definition.id];
    const POWER_NODES = definition.powerValues
        .slice(1)
        .map((value, index) => {
            const LEVEL = index + 1;
            const LABEL = powerLabel(definition, value, LEVEL);
            return renderNode(state, definition, `power-${LEVEL}`, powerTitle(definition, value), LABEL, context);
        })
        .join('');
    const BRANCH_SECTIONS = Object.entries(definition.branches || {})
        .map(([branchId, branch]) => {
            const NODES = branch.values
                .slice(1)
                .map((value, index) => {
                    const LEVEL = index + 1;
                    return renderNode(
                        state,
                        definition,
                        `branch-${branchId}-${LEVEL}`,
                        branchTitle(definition, branchId, value, LEVEL),
                        branchLabel(definition, branchId, value, LEVEL),
                        context,
                    );
                })
                .join('');
            return `<section class="ability-branch" aria-label="${branch.name}"><h4>${branch.name}</h4><div class="ability-branch__nodes">${NODES}</div></section>`;
        })
        .join('');
    const CURRENT_EFFECT = [
        powerLabel(definition, definition.powerValues[INVESTMENT.powerLevel], INVESTMENT.powerLevel),
        ...Object.entries(definition.branches || {}).map(([branchId, branch]) =>
            branchLabel(
                definition,
                branchId,
                branch.values[INVESTMENT.branchLevels?.[branchId] || 0],
                INVESTMENT.branchLevels?.[branchId] || 0,
            ),
        ),
    ].join(' · ');
    const BASE_EFFECT = [
        powerLabel(definition, definition.powerValues[0], 0),
        ...Object.entries(definition.branches || {}).map(([branchId, branch]) =>
            branchLabel(definition, branchId, branch.values[0], 0),
        ),
    ].join(' · ');
    const SPECIES_NAME = speciesById(definition.species).name,
        CURRENT_LABEL = '현재 효과';
    return `<article class="ability-card" data-species="${definition.species}" data-ability="${definition.id}">
    <header class="ability-card__header"><div><p class="ability-card__species">${SPECIES_NAME}</p><h3>${definition.name}</h3></div><span class="ability-card__grade">일반(T1)</span></header>
    <p class="ability-card__description">${definition.description}</p>
    <p class="ability-card__current-effect">${CURRENT_LABEL}: ${CURRENT_EFFECT}</p>
    <div class="ability-card__root"><p class="ability-card__base-effect">기본 효과: ${BASE_EFFECT}</p></div>
    <div class="ability-card__branches">
      <section class="ability-branch" aria-label="능력 강화 경로"><h4>능력 강화</h4><div class="ability-branch__nodes">${POWER_NODES}</div></section>
      ${BRANCH_SECTIONS}
    </div>
  </article>`;
}
function renderNode(state, definition, nodeId, title, effect, context, knownStatus = null) {
    const STATUS = knownStatus || getAbilityNodeStatus(state, definition, nodeId, context);
    const HINT_ID = `ability-help-${definition.id}-${nodeId.replace(/[^a-z0-9-]/gi, '-')}`;
    const STATUS_TEXT = STATUS.purchased ? '투자 완료' : nodeReasonLabel(STATUS.reason, definition, context);
    const ATTR = `${definition.id}:${nodeId.replace(/-(\d+)$/, ':$1')}`;
    return `<div class="ability-node ${STATUS.purchased ? 'is-purchased' : ''} ${STATUS.ready ? 'is-ready' : 'is-locked'}">
    <button type="button" class="ability-node__button" data-ability-node="${ATTR}" aria-describedby="${HINT_ID}" aria-disabled="${!STATUS.ready}">
      <span class="ability-node__title">${title}</span><span class="ability-node__effect">${effect}</span><span class="ability-node__cost">${STATUS.purchased ? '완료' : '1 포인트'}</span>
    </button>
    <span class="ability-node__status" id="${HINT_ID}">${STATUS_TEXT}</span>
  </div>`;
}
function powerLabel(definition, value, level) {
    return (abilityPresentationFor(definition.id) || DEFAULT_ABILITY_PRESENTATION).label(
        definition,
        value,
        level,
        abilityProfile(definition.species),
    );
}
function powerTitle(definition, value) {
    return (abilityPresentationFor(definition.id) || DEFAULT_ABILITY_PRESENTATION).title(value);
}
function branchLabel(definition, branchId, value, level) {
    return (
        abilityPresentationFor(definition.id)?.branchLabel?.(
            definition,
            branchId,
            value,
            level,
            abilityProfile(definition.species),
        ) ?? `${definition.branches[branchId].name} ${value}`
    );
}
function branchTitle(definition, branchId, value, level) {
    return (
        abilityPresentationFor(definition.id)?.branchTitle?.(
            definition,
            branchId,
            value,
            level,
            abilityProfile(definition.species),
        ) ?? `${definition.branches[branchId].name} ${value}`
    );
}
function nodeReasonLabel(reason, definition, context) {
    return (
        NODE_REASON_LABELS.get(reason)?.(definition) ??
        (context.location === 'farm' ? '사용할 수 없는 항목이에요.' : '농장에서 사용할 수 있어요.')
    );
}
function resetReasonLabel(reason, invested) {
    return RESET_REASON_LABELS.get(reason) ?? `투자한 ${invested}포인트를 무료로 돌려받아요.`;
}
