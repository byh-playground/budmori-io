import { growthForAbility, growthBuildOf } from './features/species-growth/state.js';
import { SPECIES_MASTERY_CAP, growthTreeCapacity } from './features/species-growth/definition.js';
import { investedPointsOf, masteryXpForNextLevel } from './ability-state.js';
import { speciesById } from './species-catalog.js';
import { formatXpForDisplay } from './player-progression.js';

const CORN_FORMS = Object.freeze([
    ['알갱이 부착', '알 1개가 붙고 폭발'],
    ['세 알 투척', '3개 알이 시간차로 적중'],
    ['통옥수수', '통옥수수가 꽂히고 알 4개 연쇄'],
    ['대왕옥수수', '큰 포물선 직격과 알 5개 연쇄'],
    ['옥수수 메테오', '상공에서 낙하하고 알 6개 연쇄'],
    ['삼연 메테오', '시차 낙하 3회 · 부착 총 9개'],
]);
const GROWTH_REASON_LABELS = new Map([
    ['not-available', '아직 미출시'],
    ['unknown-node', '사용할 수 없는 노드'],
    ['invalid-state', '성장 데이터를 확인해 주세요'],
    ['combat-lock', '런 종료 후 농장에서 투자 가능'],
    ['farm-only', '농장에서 투자 가능'],
    ['max-rank', '최대 랭크'],
    ['insufficient-points', '숙련 포인트 부족'],
]);

export function renderGrowthMasteryMarkup(investment, definition) {
    const GROWTH = growthForAbility(definition.id),
        BUILD = growthBuildOf(investment),
        SPENT = GROWTH.investedPoints(BUILD),
        CAPPED = BUILD.masteryLevel === SPECIES_MASTERY_CAP,
        NEXT = CAPPED ? null : masteryXpForNextLevel(BUILD.masteryLevel),
        NAME = speciesById(definition.species).name;
    return `<div class="ability-tree__progress" aria-live="polite">
      <div><strong>${NAME} 숙련 Lv. ${BUILD.masteryLevel} / ${SPECIES_MASTERY_CAP}</strong><span>${formatXpForDisplay(BUILD.masteryXp)}${CAPPED ? ' 누적 XP · 레벨 상한' : ` / ${formatXpForDisplay(NEXT)} XP`}</span></div>
      ${CAPPED ? '<p class="ability-tree__note">숙련은 최대예요. 이후 XP는 보존되며 포인트는 추가 지급되지 않아요.</p>' : `<progress max="${NEXT}" value="${BUILD.masteryXp}" aria-label="${NAME} 다음 숙련까지 경험치"></progress>`}
      ${investment.legacyInvestment ? `<p class="ability-tree__note" data-growth-refund>기존 투자 ${investedPointsOf(investment.legacyInvestment)}P 환급 완료 · 현재 미투자 ${GROWTH.pointsLeft(BUILD)}P. 환급분은 새 숙련 포인트 예산에 포함되어 있으며 별도 보너스로 더해지지 않아요.</p>` : ''}
      <div class="growth-wallet" data-growth-wallet><span>총 <strong>${BUILD.masteryLevel}P</strong></span><span>사용 <strong>${SPENT}P</strong></span><span>남음 <strong>${GROWTH.pointsLeft(BUILD)}P</strong></span></div>
    </div>`;
}

export function renderGrowthCardMarkup(state, definition, context) {
    const GROWTH = growthForAbility(definition.id),
        BUILD = growthBuildOf(state.abilities[definition.id]),
        ACTUAL_TIER = Math.max(1, Math.min(6, context.highestSpeciesTier?.[definition.species] || 1)),
        FORM_TIER = GROWTH.attackTier(BUILD, ACTUAL_TIER),
        EVOLUTION = GROWTH.definition.nodes.filter((node) => node.kind === 'evolution'),
        SECTIONS = [
            ['basic', '기본 성장', '각 1P · 10랭크'],
            ['specialty', '특화 성장', '각 2P · 5랭크'],
        ]
            .map(
                ([kind, label, cost]) =>
                    `<section class="ability-branch growth-branch" aria-label="${label}"><h4>${label} <small>${cost}</small></h4><div class="ability-branch__nodes">${GROWTH.definition.nodes
                        .filter((node) => node.kind === kind)
                        .map((node) => renderGrowthNode(GROWTH, BUILD, definition.id, node, context))
                        .join('')}</div></section>`,
            )
            .join('');
    return `<article class="ability-card growth-card" data-species="${definition.species}" data-ability="${definition.id}" data-growth-tree>
      <header class="ability-card__header"><div><p class="ability-card__species">${speciesById(definition.species).name}</p><h3>포격과 연쇄 폭발</h3></div><span class="ability-card__grade">50P 선택 / 용량 ${growthTreeCapacity(GROWTH.definition)}P</span></header>
      <p class="ability-card__description">진화는 공격 동작을, 기본·특화는 전투 성향을 바꿔요. 합성은 연구 없이도 가능하고 실제 등급만큼 공격력이 보정돼요.</p>
      <p class="ability-card__current-effect" data-growth-form>보유 최고 합성 등급 T${ACTUAL_TIER} · 현재 연구 형태 T${FORM_TIER} (${CORN_FORMS[FORM_TIER - 1][0]})<br>연구해도 유닛의 실제 등급을 넘는 형태는 사용하지 않아요.</p>
      <section class="ability-branch growth-evolution" aria-label="공격 진화"><h4>공격 진화 <small>각 2P · 앞 단계부터</small></h4><div class="growth-evolution__nodes"><div class="growth-evolution__root"><strong>T1 ${CORN_FORMS[0][0]}</strong><span>기본 해금 · 무료</span></div>${EVOLUTION.map((node) => renderGrowthNode(GROWTH, BUILD, definition.id, node, context)).join('')}</div></section>
      <section class="growth-preview" aria-label="옥수수 공격 동작 미리보기"><h4>동작 미리보기</h4><div class="growth-preview__tiers">${CORN_FORMS.map((form, index) => `<button type="button" data-corn-preview-tier="${index + 1}" aria-pressed="false">T${index + 1} ${form[0]}</button>`).join('')}</div><div class="corn-evolution-preview" aria-label="선택한 옥수수 공격 시연"></div><p class="ability-tree__note" data-corn-preview-caption>단계를 누르면 같은 상황의 실제 공격을 재생해요. 농장과 투자는 변경되지 않아요.</p></section>
      <div class="ability-card__branches">${SECTIONS}</div>
      <p class="ability-tree__note">기본 부착 총예산은 알 수로 나눠요. 추가 알과 마지막 폭발 보너스는 전체 부착 예산을 기준으로 별도 계산돼요. 첫 부착 1초 뒤부터 0.1초 간격으로 폭발해요.</p>
    </article>`;
}

function renderGrowthNode(growth, build, abilityId, node, context) {
    const RANK = build.nodeRanks[node.id] || 0,
        CHECK = growth.canPurchase(build, node.id, context),
        MAXED = RANK === node.maxRank,
        NEXT_RANK = Math.min(node.maxRank, RANK + 1),
        UNLOCK = node.unlockLevels[NEXT_RANK - 1],
        TITLE = node.kind === 'evolution' ? `T${node.tier} ${CORN_FORMS[node.tier - 1][0]}` : node.name,
        HELP_ID = `ability-help-${abilityId}-${node.id}`,
        ATTR = `${abilityId}:${node.id.replace(/-(\d+)$/, ':$1')}`,
        REASON = CHECK.allowed ? '투자 가능' : growthReason(CHECK, node),
        EFFECT = node.kind === 'evolution' ? CORN_FORMS[node.tier - 1][1] : growthEffect(node.id, RANK),
        NEXT_EFFECT = node.kind === 'evolution' || MAXED ? '' : `다음: ${growthEffect(node.id, NEXT_RANK)}`,
        PREREQUISITE = node.prerequisite
            ? ` · 이전 T${node.tier - 1} ${build.nodeRanks[node.prerequisite] === 1 ? '충족' : '연구 필요'}`
            : '';
    return `<div class="ability-node ${RANK > 0 ? 'is-purchased' : ''} ${CHECK.allowed ? 'is-ready' : 'is-locked'}" data-growth-node="${node.id}">
      <button type="button" class="ability-node__button" data-ability-node="${ATTR}" aria-describedby="${HELP_ID}" aria-disabled="${!CHECK.allowed}">
        <span class="ability-node__title">${TITLE} <span class="growth-rank">${RANK}/${node.maxRank}</span></span><span class="ability-node__effect">${EFFECT}</span><span class="ability-node__cost">${MAXED ? '완료' : `${node.pointCost}P`}</span>${NEXT_EFFECT ? `<span class="growth-next">${NEXT_EFFECT}</span>` : ''}
      </button>
      <span class="ability-node__status" id="${HELP_ID}">${REASON} · 숙련 Lv.${UNLOCK}${PREREQUISITE}</span>
    </div>`;
}

function growthReason(check, node) {
    if (check.reason === 'mastery-required') {
        return `숙련 Lv.${check.requiredLevel} 필요`;
    }
    if (check.reason === 'prerequisite-required') {
        return `이전 T${node.tier - 1} 미연구`;
    }
    return GROWTH_REASON_LABELS.get(check.reason) || '잠김';
}

function growthEffect(nodeId, rank) {
    switch (nodeId) {
        case 'basic-1':
            return `직격 피해 +${rank * 3}%`;
        case 'basic-2':
            return `부착 폭발 피해 +${rank * 3}%`;
        case 'basic-3':
            return `공격 속도 +${rank * 2}%`;
        case 'specialty-1':
            return `뒤 순서마다 +${rank * 2}% · 최대 +20%`;
        case 'specialty-2':
            return `마지막 예정 폭발에 총 부착 예산의 ${rank * 8}% 추가`;
        case 'specialty-3':
            return `${rank * 8}% 확률 · 총 부착 예산 100%의 추가 알`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}
