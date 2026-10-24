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
const PEANUT_FORMS = Object.freeze([
    ['교대 툭툭', '두 알이 번갈아 50·50% 타격'],
    ['좌우 시간차', '양쪽으로 벌려 45·55% 시간차 타격'],
    ['삼연 교차', '좌→우→좌 교차 협공 · 30·30·40%'],
    ['중앙 합쳐치기', '바깥 두 타 뒤 중앙 합체 · 25·25·50%'],
    ['반원 조이기', '양쪽 반원 스윕 뒤 직선 닫기 · 20·20·30·30%'],
    ['전개 스윕 찍기', '좌우 전개 · 엇갈린 스윕 · 중앙 찍기 · 15·15·20·20·30%'],
]);
const WALNUT_FORMS = Object.freeze([
    ['망치 내려찍기', '망치로 한 번 내려찍기 · 100%'],
    ['찍고 되받기', '내려찍기 뒤 짧게 되받기 · 60·40%'],
    ['스윕 뒤 찍기', '전면 가로 스윕 뒤 내려찍기 · 35·65%'],
    ['스윕 접촉 충격', '스윕 · 내려찍기 · 접촉점 근접 충격 · 25·45·30%'],
    ['올려치기 강타', '올려치기 · 내려찍기 · 바닥 근접 충격 · 25·45·30%'],
    ['근접 쐐기 강타', '가로막기 · 끌어올리기 · 강한 내려찍기 · 근접 쐐기 · 15·20·40·25%'],
]);
const RICE_FORMS = Object.freeze([
    ['짧은 낫베기', '짧게 한 번 낫베기 · 100%'],
    ['낫베기와 되베기', '앞으로 베고 되베기 · 45·55%'],
    ['가로 사선베기', '낮은 가로베기 뒤 높은 사선베기 · 40·60%'],
    ['넓은 호 집중베기', '넓은 첫 호 뒤 안쪽 집중 베기 · 40·60%'],
    ['삼단 수확 찍기', '사선 · 반원 회수 · 좁은 수확 찍기 · 25·30·45%'],
    ['교차 수확 마무리', '좌우 교차 · 안쪽 수확 · 넓은 반원 마무리 · 20·20·25·35%'],
]);
const WHEAT_FORMS = Object.freeze([
    ['짧은 전면 타격', '실제 지휘봉으로 짧게 전면 타격 · 100%'],
    ['올려치고 내리기', '지휘봉 올려치기 뒤 내리기 · 45·55%'],
    ['전면 박자와 찌르기', '넓은 전면 박자 뒤 주 대상 찌르기 · 40·60%'],
    ['긴 지휘봉 스윕', '길어진 실제 지휘봉 전방 스윕 뒤 강세 · 40·60%'],
    ['스윕 회수 강세', '전방 스윕 · 지휘봉 회수 · 정면 강세 · 25·30·45%'],
    ['좌우 박자 큰 마무리', '좌우 지휘봉 2타 · 정면 강타 · 큰 마무리 · 20·20·25·35%'],
]);
const PRESENTATIONS = new Map([
    [
        'wheat-command-crit',
        {
            key: 'wheat',
            name: '밀',
            title: '지휘봉 타격과 아군 박자',
            forms: WHEAT_FORMS,
            effect: wheatGrowthEffect,
            note: '기본 공격을 발사할 때 공격당 한 번, 35% 확률로 살아 있는 범위 내 아군과 자신에게 3초 공속 지휘를 줘요. 지휘 강도는 실제 합성 등급이 오를 때마다 이전 등급 효과의 1.5배가 돼요. 봉 형태를 연구하지 않아도 적용돼요. 기본 위력 투자도 지휘 강도에 랭크당 3%씩 한 번 적용돼요. 범위를 떠나도 유지되며 가장 강한 지휘만 적용돼요. 같은 강도는 남은 시간을 3초로 갱신해요. 실제 지휘 발동 때만 박자 연출이 나오고 마무리에서 다시 발동하지 않아요. T4 이상 실제 지휘봉의 피해 사거리는 1.30배이며 지휘 반경 투자는 피해 사거리를 늘리지 않아요. 주변 최대 4명은 각 타격의 50% 피해를 받아요. 마법 파동·강제 평타·분신·명령 연쇄는 없어요.',
        },
    ],
    [
        'rice-low-health-harvest',
        {
            key: 'rice',
            name: '쌀',
            title: '낫베기와 수확 치명',
            forms: RICE_FORMS,
            effect: riceGrowthEffect,
            note: '대상별 첫 명중 직전 적이 잃은 체력 비율로 치명 보너스를 계산하고 한 번만 추첨해요. 같은 공격의 후속 타격은 같은 치명 결과를 사용해요. 공통 치명 확률과 합해 최대 100%이며 기본 치명 피해는 2배예요. 주변 최대 4명에게 각 타격의 50% 피해를 줘요. 마지막 수확 보너스는 전체 직접 피해 예산 기준이며 즉사·처형·최대 체력 비례 피해는 없어요.',
        },
    ],
    [
        'walnut-raw-guard',
        {
            key: 'walnut',
            name: '호두',
            title: '방어 저장과 망치 강타',
            forms: WALNUT_FORMS,
            effect: walnutGrowthEffect,
            note: '5초마다 2초 동안 방어력 +50이며 공격과 함께 작동해요. 방어 중 받은 방어 계산 전 피해(RAW)를 저장하고 공격 시작에 한 번 소비해요. 추가 피해는 저장량×전환율과 공격력 A×3 중 작은 값이며 주 대상만 받아요. T1~T3은 마지막 직접 타격, T4~T6은 마지막 직접 타격과 근접 충격에 70:30으로 나눠요. 주변 최대 4명은 기본 슬롯 피해의 50%만 받아요. 강타 특화는 저장 추가 피해를 늘리지 않아요. 공격 중 새로 저장한 피해는 다음 공격에 사용하며 취소된 저장분은 돌려받지 않아요.',
        },
    ],
    [
        'peanut-death-split',
        {
            key: 'peanut',
            name: '땅콩',
            title: '두 알 협공과 사망 분열',
            forms: PEANUT_FORMS,
            effect: peanutGrowthEffect,
            note: '두 알은 한 본체·한 체력으로 협공해요. 주변 최대 4명에게 각 타격의 50% 피해를 주며 본체가 죽거나 기절하면 남은 협공은 취소돼요. 사망하면 T1 분열체 2마리가 생기며 부모의 성장과 진화를 다시 적용하지 않아요. 분열체는 재분열·영구 보유·번식·합성 없이 전투가 끝나면 사라져요.',
        },
    ],
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

function peanutGrowthEffect(nodeId, rank) {
    switch (nodeId) {
        case 'basic-1':
            return `생존 협공 피해 +${rank * 3}%`;
        case 'basic-2':
            return `최대 체력 +${rank * 4}% · 다음 런부터 적용`;
        case 'basic-3':
            return `공격 속도 +${rank * 2}% · 후딜에 적용`;
        case 'specialty-1':
            return `협공 사거리·범위 +${rank * 4}%`;
        case 'specialty-2':
            return `중앙 또는 마지막 타격에 전체 직접 예산의 ${rank * 8}% 추가`;
        case 'specialty-3':
            return `사망 T1 분열체 체력·공격력 ${100 + rank * 25}% · 한 번 적용`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}

function walnutGrowthEffect(nodeId, rank) {
    switch (nodeId) {
        case 'basic-1':
            return `공격력 +${rank * 3}% · 직접 예산과 저장 피해 상한에 적용`;
        case 'basic-2':
            return `최대 체력 +${rank * 4}% · 다음 런부터 적용`;
        case 'basic-3':
            return `공격 속도 +${rank * 2}% · 후딜에 적용`;
        case 'specialty-1':
            return `상시 방어력 +${rank * 3} · 방어 중 +50과 합산`;
        case 'specialty-2':
            return `저장 RAW 전환율 ${100 + rank * 25}% · 추가 피해 상한 A×3 유지`;
        case 'specialty-3':
            return `마지막 직접 망치에 전체 직접 예산의 ${rank * 8}% 추가 · 저장분 제외`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}

function riceGrowthEffect(nodeId, rank) {
    switch (nodeId) {
        case 'basic-1':
            return `낫 공격력 +${rank * 3}%`;
        case 'basic-2':
            return `최대 체력 +${rank * 4}% · 다음 런부터 적용`;
        case 'basic-3':
            return `공격 속도 +${rank * 2}% · 준비 시간은 고정, 타격·후딜 예산에 적용`;
        case 'specialty-1':
            return `적 잃은 체력 비율×최대 ${35 + rank * 8}%p 치명 보너스 · 합계 100% 상한`;
        case 'specialty-2':
            return `낫 사거리·범위 +${rank * 4}%`;
        case 'specialty-3':
            return `마지막 수확에 전체 직접 예산의 ${rank * 8}% 추가`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}

function wheatGrowthEffect(nodeId, rank) {
    switch (nodeId) {
        case 'basic-1':
            return `지휘봉 공격력·지휘 공속 보너스 +${rank * 3}%`;
        case 'basic-2':
            return `최대 체력 +${rank * 4}% · 다음 런부터 적용`;
        case 'basic-3':
            return `공격 속도 +${rank * 2}% · 준비 시간은 고정, 타격·후딜 예산에 적용`;
        case 'specialty-1':
            return `T1 지휘 공속 +${50 + rank * 12.5}% · 등급마다 이전 효과 ×1.5 · T6 +${Number(((50 + rank * 12.5) * 1.5 ** 5).toFixed(2))}% · 기본 위력 배율 별도`;
        case 'specialty-2':
            return `지휘 반경 기본 사거리×${2 + rank * 0.5} · 피해 범위 제외`;
        case 'specialty-3':
            return `마지막 지휘봉 타격에 전체 직접 예산의 ${rank * 8}% 추가`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}
