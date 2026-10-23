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
const PEA_FORMS = Object.freeze([
    ['밀착 박치기', '지상에서 한 번 밀착 충돌'],
    ['탄성 박치기', '몸을 압축한 뒤 탄성 충돌'],
    ['회전 연타', '앞면에서 회전하며 두 번 충돌'],
    ['강압축 돌진', '강하게 압축한 뒤 직선 강충돌'],
    ['반동 재돌진', '첫 충돌 뒤 짧게 뒤튕겨 다시 충돌'],
    ['삼연 압축 충돌', '빠른 두 충돌 뒤 압축 마무리'],
]);
const REDBEAN_FORMS = Object.freeze([
    ['낮은 도약', '낮게 뛰어 본체로 착지'],
    ['앞구르기 착지', '앞으로 한 바퀴 돌아 작은 원형 착지'],
    ['이중 착지', '첫 착지 뒤 재도약해 두 번째 착지'],
    ['측면 교차 도약', '가까운 면 착지 뒤 옆으로 교차 착지'],
    ['공중 회전 강하', '공중 회전 접촉 뒤 아래로 강하게 착지'],
    ['삼연 도약 강타', '낮은 찍기 · 측면 회전 접촉 · 높은 마무리 착지'],
]);
const CHESTNUT_FORMS = Object.freeze([
    ['짧은 가시 주먹', '짧은 가시를 정면으로 한 번 발사'],
    ['좌우 엇찌르기', '좌우 가시가 교차하며 45·55% 타격'],
    ['전면 가시 부채', '전방에 펼친 가시가 한 예산으로 타격'],
    ['부채 수렴', '부채 전개 40% 뒤 고정 표적점으로 60% 수렴'],
    ['중앙 가시 찌르기', '부채 40% 뒤 굵은 중앙 가시 60%'],
    ['삼단 압축 가시', '전개 25% · 양 날개 수렴 30% · 중앙 마무리 45%'],
]);
const PRESENTATIONS = new Map([
    [
        'chestnut-target-thorns',
        {
            key: 'chestnut',
            name: '밤톨',
            title: '가시 전개와 집중',
            forms: CHESTNUT_FORMS,
            effect: chestnutGrowthEffect,
            note: '전개와 수렴은 서로 다른 타격 예산을 써요. 범위 타격은 주 대상 100%, 주변 최대 4명에게 50%예요. 주기 가시는 평타와 별도로 3초마다 0.1초 간격으로 발사하며 총예산을 가시 수로 나눠요. 이미 발사한 가시는 본체가 사라져도 고정한 표적점까지 진행해요.',
        },
    ],
    [
        'kidney-continuous-leap',
        {
            key: 'redbean',
            name: '팥',
            title: '도약과 연속 착지',
            forms: REDBEAN_FORMS,
            effect: redbeanGrowthEffect,
            note: '하나의 본체가 실제로 도약하고 착지해요. 주변 피해는 각 타격의 50%이며 추가 4명까지 맞아요. 연속 도약은 마지막 착지에서 한 번만 추첨하며 성공하면 후딜만 0.1초로 줄어요. 다음 공격의 준비와 비행은 생략하지 않아요. 마무리 보너스는 전체 직접 피해 예산 기준으로 마지막 착지에 한 번 더해요.',
        },
    ],
    [
        'corn-kernel-chain',
        {
            key: 'corn',
            name: '옥수수',
            title: '포격과 연쇄 폭발',
            forms: CORN_FORMS,
            effect: cornGrowthEffect,
            note: '기본 부착 총예산은 알 수로 나눠요. 추가 알과 마지막 폭발 보너스는 전체 부착 예산을 기준으로 별도 계산돼요. 첫 부착 1초 뒤부터 0.1초 간격으로 폭발해요.',
        },
    ],
    [
        'pea-recovery-boost',
        {
            key: 'pea',
            name: '콩',
            title: '탄성과 연속 박치기',
            forms: PEA_FORMS,
            effect: peaGrowthEffect,
            note: '모든 충돌은 지상에서 이어져요. 적에게 밀린 뒤 회복하면 2초간 이동 속도가 증가해요. 재돌진 보너스는 강제 이동 종료 뒤 3초 안에 시작한 첫 공격 전체에 한 번 적용돼요. 자체 반동은 발동 조건이 아니에요. 첫·마지막 충돌 특화는 전체 직접 피해 예산 기준으로 더하며, 단타에는 두 보너스를 합산해요.',
        },
    ],
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
        PRESENTATION = PRESENTATIONS.get(definition.id),
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
      <header class="ability-card__header"><div><p class="ability-card__species">${speciesById(definition.species).name}</p><h3>${PRESENTATION.title}</h3></div><span class="ability-card__grade">50P 선택 / 용량 ${growthTreeCapacity(GROWTH.definition)}P</span></header>
      <p class="ability-card__description">진화는 공격 동작을, 기본·특화는 전투 성향을 바꿔요. 합성은 연구 없이도 가능하고 실제 등급만큼 공격력이 보정돼요.</p>
      <p class="ability-card__current-effect" data-growth-form>보유 최고 합성 등급 T${ACTUAL_TIER} · 현재 연구 형태 T${FORM_TIER} (${PRESENTATION.forms[FORM_TIER - 1][0]})<br>연구해도 유닛의 실제 등급을 넘는 형태는 사용하지 않아요.</p>
      <section class="ability-branch growth-evolution" aria-label="공격 진화"><h4>공격 진화 <small>각 2P · 앞 단계부터</small></h4><div class="growth-evolution__nodes"><div class="growth-evolution__root"><strong>T1 ${PRESENTATION.forms[0][0]}</strong><span>기본 해금 · 무료</span></div>${EVOLUTION.map((node) => renderGrowthNode(GROWTH, BUILD, definition.id, node, context)).join('')}</div></section>
      <section class="growth-preview" aria-label="${PRESENTATION.name} 공격 동작 미리보기"><h4>동작 미리보기</h4><div class="growth-preview__tiers">${PRESENTATION.forms.map((form, index) => `<button type="button" data-growth-preview-species="${PRESENTATION.key}" data-growth-preview-tier="${index + 1}" data-${PRESENTATION.key}-preview-tier="${index + 1}" aria-pressed="false">T${index + 1} ${form[0]}</button>`).join('')}</div><div class="growth-evolution-preview ${PRESENTATION.key}-evolution-preview" aria-label="선택한 ${PRESENTATION.name} 공격 시연"></div><p class="ability-tree__note" data-growth-preview-caption data-${PRESENTATION.key}-preview-caption>단계를 누르면 같은 상황의 실제 공격을 재생해요. 농장과 투자는 변경되지 않아요.</p></section>
      <div class="ability-card__branches">${SECTIONS}</div>
      <p class="ability-tree__note">${PRESENTATION.note}</p>
    </article>`;
}

function renderGrowthNode(growth, build, abilityId, node, context) {
    const PRESENTATION = PRESENTATIONS.get(abilityId),
        RANK = build.nodeRanks[node.id] || 0,
        CHECK = growth.canPurchase(build, node.id, context),
        MAXED = RANK === node.maxRank,
        NEXT_RANK = Math.min(node.maxRank, RANK + 1),
        UNLOCK = node.unlockLevels[NEXT_RANK - 1],
        TITLE = node.kind === 'evolution' ? `T${node.tier} ${PRESENTATION.forms[node.tier - 1][0]}` : node.name,
        HELP_ID = `ability-help-${abilityId}-${node.id}`,
        ATTR = `${abilityId}:${node.id.replace(/-(\d+)$/, ':$1')}`,
        REASON = CHECK.allowed ? '투자 가능' : growthReason(CHECK, node),
        EFFECT = node.kind === 'evolution' ? PRESENTATION.forms[node.tier - 1][1] : PRESENTATION.effect(node.id, RANK),
        NEXT_EFFECT = node.kind === 'evolution' || MAXED ? '' : `다음: ${PRESENTATION.effect(node.id, NEXT_RANK)}`,
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

function cornGrowthEffect(nodeId, rank) {
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

function peaGrowthEffect(nodeId, rank) {
    switch (nodeId) {
        case 'basic-1':
            return `모든 박치기 피해 +${rank * 3}%`;
        case 'basic-2':
            return `적에게 밀린 뒤 첫 공격 전체 피해 +${rank * 5}%`;
        case 'basic-3':
            return `공격 후딜 -${rank * 1.5}% (준비 시간 제외)`;
        case 'specialty-1':
            return `적 강제 이동 회복 뒤 2초 이속 +${25 + rank * 6}%`;
        case 'specialty-2':
            return `첫 충돌에 전체 직접 예산의 ${rank * 8}% 추가`;
        case 'specialty-3':
            return `마지막 충돌에 전체 직접 예산의 ${rank * 8}% 추가`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}

function redbeanGrowthEffect(nodeId, rank) {
    switch (nodeId) {
        case 'basic-1':
            return `모든 도약 피해 +${rank * 3}%`;
        case 'basic-2':
            return `최대 체력 +${rank * 4}% · 다음 런부터 적용`;
        case 'basic-3':
            return `공격 속도 +${rank * 2}%`;
        case 'specialty-1':
            return `착지 반경 +${rank * 4}%`;
        case 'specialty-2':
            return `마지막 착지 후 ${Math.min(65, 20 + rank * 9)}% 확률로 후딜 0.1초`;
        case 'specialty-3':
            return `마지막 착지에 전체 직접 예산의 ${rank * 8}% 추가`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}

function chestnutGrowthEffect(nodeId, rank) {
    switch (nodeId) {
        case 'basic-1':
            return `공격력 +${rank * 3}% · 평타와 주기 가시에 적용`;
        case 'basic-2':
            return `최대 체력 +${rank * 4}% · 다음 런부터 적용`;
        case 'basic-3':
            return `공격 속도 +${rank * 2}% · 주기 가시 간격 제외`;
        case 'specialty-1':
            return `주기 가시 ${1 + rank}개 · 총예산 ${100 + rank * 40}% 균등 분배`;
        case 'specialty-2':
            return `가시 사거리·범위 +${rank * 4}%`;
        case 'specialty-3':
            return `평타 마지막 가시에 전체 직접 예산의 ${rank * 8}% 추가`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}
