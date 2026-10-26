import { growthForAbility, growthBuildOf } from '../features/species-growth/state.js';
import { SPECIES_MASTERY_CAP, growthTreeCapacity } from '../features/species-growth/definition.js';
import { investedPointsOf, masteryXpForNextLevel } from '../abilities/ability-state.js';
import { speciesById } from '../units/species-catalog.js';
import { formatXpForDisplay } from '../model/player-progression.js';

const CORN_FORMS = Object.freeze([
    ['알갱이 부착', '알갱이 1개가 붙은 뒤 폭발'],
    ['세 알 투척', '알갱이 3개가 차례로 적중'],
    ['통옥수수', '통옥수수가 꽂히고 알 4개 연쇄'],
    ['대왕옥수수', '큰 포물선 직격과 알 5개 연쇄'],
    ['옥수수 메테오', '상공에서 낙하하고 알 6개 연쇄'],
    ['연속 메테오', '차례로 3번 낙하 · 알갱이 총 9개 부착'],
]);
const PEA_FORMS = Object.freeze([
    ['박치기', '적에게 다가가 한 번 박치기'],
    ['탄성 박치기', '몸을 움츠렸다가 튕겨 나가 박치기'],
    ['회전 연타', '적 앞에서 회전하며 두 번 박치기'],
    ['힘껏 돌진', '몸을 움츠린 뒤 앞으로 세게 박치기'],
    ['반동 박치기', '박치기 후 뒤로 튕겼다가 다시 박치기'],
    ['삼단 박치기', '빠르게 두 번 부딪힌 뒤 힘껏 박치기'],
]);
const REDBEAN_FORMS = Object.freeze([
    ['낮은 도약', '낮게 뛰어 적을 내려찍기'],
    ['앞구르기 착지', '앞으로 한 바퀴 돌아 좁은 범위를 내려찍기'],
    ['이중 착지', '첫 착지 뒤 재도약해 두 번째 착지'],
    ['옆으로 뛰어찍기', '가까이 내려찍은 뒤 옆으로 뛰어 다시 내려찍기'],
    ['회전 내려찍기', '공중에서 돌며 부딪힌 뒤 세게 내려찍기'],
    ['삼단 뛰어찍기', '낮게 찍기 · 옆으로 돌며 부딪히기 · 높이 뛰어 내려찍기'],
]);
const CHESTNUT_FORMS = Object.freeze([
    ['짧은 가시 찌르기', '정면 가시 1발에 기본 피해 100%'],
    ['엇갈려 찌르기', '좌우 가시 교차 · 기본 피해 45·55%'],
    ['가시 펼치기', '앞으로 가시를 펼쳐 공격 · 기본 피해 100%'],
    ['모아 찌르기', '가시 펼치기 40% · 겨냥한 지점에 모아 찌르기 60%'],
    ['중앙 가시 찌르기', '가시 펼치기 40% · 중앙 찌르기 60%'],
    ['삼단 가시 공격', '가시 펼치기 25% · 모아 찌르기 30% · 중앙 찌르기 45%'],
]);
const PEANUT_FORMS = Object.freeze([
    ['교대 툭툭', '두 알이 번갈아 50·50% 타격'],
    ['좌우 시간차', '양쪽으로 벌려 45·55% 시간차 타격'],
    ['엇갈려 연타', '좌→우→좌 교차 협공 · 30·30·40%'],
    ['중앙 합쳐치기', '바깥 두 타 뒤 중앙 합체 · 25·25·50%'],
    ['양옆에서 협공', '양옆으로 휘두른 뒤 안쪽으로 치기 · 20·20·30·30%'],
    ['협공 내려찍기', '양옆으로 벌리기 · 엇갈려 휘두르기 · 중앙 내려찍기 · 15·15·20·20·30%'],
]);
const WALNUT_FORMS = Object.freeze([
    ['망치 내려찍기', '망치로 한 번 내려찍기 · 100%'],
    ['찍고 되받기', '내려찍기 뒤 짧게 되받기 · 60·40%'],
    ['휘둘러 내려찍기', '앞으로 가로질러 휘두른 뒤 내려찍기 · 35·65%'],
    ['망치 충격', '휘두르기 · 내려찍기 · 맞은 곳 주변에 충격 · 25·45·30%'],
    ['올려치기 강타', '올려치기 · 내려찍기 · 바닥에 충격 · 25·45·30%'],
    ['쐐기 강타', '가로막기 · 끌어올리기 · 강한 내려찍기 · 가까이에 쐐기 충격 · 15·20·40·25%'],
]);
const RICE_FORMS = Object.freeze([
    ['짧은 낫베기', '짧게 한 번 낫베기 · 100%'],
    ['낫베기와 되베기', '앞으로 베고 되베기 · 45·55%'],
    ['가로 사선베기', '낮은 가로베기 뒤 높은 사선베기 · 40·60%'],
    ['크게 휘둘러 베기', '넓게 휘두른 뒤 안쪽을 베기 · 40·60%'],
    ['삼단 낫베기', '비스듬히 베기 · 반원으로 되베기 · 좁게 내려찍기 · 25·30·45%'],
    ['교차 낫베기', '좌우로 베기 · 안쪽 베기 · 크게 반원으로 베기 · 20·20·25·35%'],
]);
const WHEAT_FORMS = Object.freeze([
    ['지휘봉 치기', '지휘봉으로 앞을 한 번 치기 · 100%'],
    ['올려치고 내리기', '지휘봉 올려치기 뒤 내리기 · 45·55%'],
    ['휘두르고 찌르기', '앞으로 넓게 휘두른 뒤 주 대상을 찌르기 · 40·60%'],
    ['크게 휘두르기', '길어진 지휘봉을 앞으로 휘두른 뒤 세게 치기 · 40·60%'],
    ['지휘봉 삼연타', '앞으로 휘두르기 · 되돌려 치기 · 정면을 세게 치기 · 25·30·45%'],
    ['지휘봉 연타', '좌우로 두 번 치기 · 정면 치기 · 크게 휘두르기 · 20·20·25·35%'],
]);
const BARLEY_FORMS = Object.freeze([
    ['도리깨 치기', '도리깨로 한 번 후려치기 · 100%'],
    ['후려치고 당기기', '전면 후려치기 뒤 당겨치기 · 40·60%'],
    ['휘둘러 빗겨찍기', '앞으로 넓게 휘두른 뒤 비스듬히 내려찍기 · 40·60%'],
    ['돌려 내려찍기', '전면 반원 회전 뒤 중앙 찍기 · 40·60%'],
    ['좌우 휘둘러 찍기', '왼쪽 휘두르기 · 오른쪽 휘두르기 · 중앙 내려찍기 · 25·30·45%'],
    ['도리깨 연타', '낮게 휘두르기 · 되돌려 치기 · 당겨 치기 · 중앙 내려찍기 · 20·20·25·35%'],
]);
const PRESENTATIONS = new Map([
    [
        'barley-armor-break',
        {
            key: 'barley',
            name: '보리',
            title: '도리깨 공격과 방어 깨기',
            forms: BARLEY_FORMS,
            effect: barleyGrowthEffect,
            note: '각 타격의 피해를 먼저 적용한 뒤 방어를 깎아요. 공격당 대상별 방어 감소량은 (1+0.4×방어 감소 강화 단계)×(1+0.03×기본 공격 위력 강화 단계)×(1+0.2×(실제 등급−1))이며, 직접 피해의 합성 보정은 다시 곱하지 않아요. T1은 한 타격 뒤 전부 적용하고 T2 이상은 마지막을 뺀 앞 타격에 균등하게 나눠요. 빗나간 몫은 다음 타격으로 넘기지 않으며 마지막 타격은 낮아진 방어를 이용해요. 각 방어 감소는 적용한 시점부터 3~5초 동안 유지돼요. 다시 맞혀도 이전 감소의 지속시간은 늘어나지 않고, 방어는 0보다 낮아지지 않아요. 주변 최대 4명은 각 타격의 50% 피해와 같은 방어 감소 몫을 받아요.',
        },
    ],
    [
        'wheat-command-crit',
        {
            key: 'wheat',
            name: '밀',
            title: '지휘봉 공격과 전투 지휘',
            forms: WHEAT_FORMS,
            effect: wheatGrowthEffect,
            note: '기본 공격을 발사할 때 공격당 한 번, 35% 확률로 살아 있는 범위 내 아군과 자신에게 공격 속도를 높이는 지휘를 해요. 지휘 지속시간은 실제 합성 등급마다 3초씩 늘어나 T1 3초에서 T6 18초가 돼요. 공격 형태를 연구하지 않아도 적용돼요. 기본 위력 투자도 지휘 강도에 랭크당 3%씩 한 번 적용돼요. 범위를 떠나도 유지되며 가장 강한 지휘만 적용돼요. 같은 강도는 기존 종료 시각과 새 지속시간 중 더 늦은 쪽으로 갱신해요. 지휘는 공격마다 한 번만 발동해요. T4 이상 지휘봉의 피해 사거리는 1.30배이며 지휘 반경 투자는 피해 사거리를 늘리지 않아요. 주변 최대 4명은 각 타격의 50% 피해를 받아요.',
        },
    ],
    [
        'rice-low-health-harvest',
        {
            key: 'rice',
            name: '쌀',
            title: '낫베기와 치명타',
            forms: RICE_FORMS,
            effect: riceGrowthEffect,
            note: '대상별 첫 명중 직전 적이 잃은 체력 비율로 치명타 확률 보너스를 계산하고 한 번만 추첨해요. 같은 공격의 후속 타격은 같은 치명 결과를 사용해요. 공통 치명타 확률과 합해 최대 100%이며 기본 치명타 피해는 2배예요. 주변 최대 4명에게 각 타격의 50% 피해를 줘요. 마지막 낫베기 강화는 기본 공격 총피해 기준이며 즉사·처형·최대 체력 비례 피해는 없어요.',
        },
    ],
    [
        'walnut-raw-guard',
        {
            key: 'walnut',
            name: '호두',
            title: '방어와 망치 반격',
            forms: WALNUT_FORMS,
            effect: walnutGrowthEffect,
            note: '5초마다 2초 동안 방어력 +50이며 공격과 함께 작동해요. 방어 중에는 방어 적용 전 받은 피해를 모았다가 다음 공격에 반격 피해로 더해요. 반격 피해는 모은 피해에 반격 비율을 곱한 값이며, 기본 공격 총피해의 3배를 넘지 않아요. 이 상한은 합성 등급·망치 위력·거대화·공격 시작 시 피해 강화를 반영하고, 치명타와 적 방어를 적용하기 전 값이에요. 모은 피해 자체에는 합성 배율을 곱하지 않아요. T1~T3은 마지막 직접 타격, T4~T6은 마지막 직접 타격과 근접 충격에 70:30으로 나눠요. 주변 최대 4명은 기본 타격 피해의 50%만 받아요. 마지막 망치 강화는 저장 추가 피해를 늘리지 않아요. 공격 중 새로 저장한 피해는 다음 공격에 사용하며 취소된 저장분은 돌려받지 않아요.',
        },
    ],
    [
        'peanut-death-split',
        {
            key: 'peanut',
            name: '땅콩',
            title: '두 알 협공과 분열',
            forms: PEANUT_FORMS,
            effect: peanutGrowthEffect,
            note: '두 알은 한 본체·한 체력으로 협공해요. 주변 최대 4명에게 각 타격의 50% 피해를 주며 본체가 죽거나 기절하면 남은 협공은 취소돼요. 사망하면 T1 분열체 2마리가 생기며 생성 당시 탑 도전의 기본 위력·공격 속도 랭크만 고정해서 물려받아요. 체력 투자·실제 등급·진화·협공 범위·마무리는 물려받지 않고 분열체 강화는 한 번만 적용돼요. 분열체는 다시 분열하거나 번식·합성하지 않으며, 전투가 끝나면 사라져요.',
        },
    ],
    [
        'chestnut-target-thorns',
        {
            key: 'chestnut',
            name: '밤톨',
            title: '가시 공격',
            forms: CHESTNUT_FORMS,
            effect: chestnutGrowthEffect,
            note: '기본 공격 자체가 가시 공격이며 별도 주기 공격은 없어요. 가시 추가 강화 단계만큼 같은 기본 공격 안에 가시가 더 나와요. 주 대상 추가 피해는 기본 피해×(1+0.4×가시 추가 강화 단계)/3이며, 형태 가시와 추가 가시 전체에 균등하게 나눠요. 기본 피해에는 합성 등급 보정과 가시 위력 투자가 각각 한 번 적용돼요. 마지막 가시 강화는 마지막 가시에 기본 피해의 8%씩를 더해요. 주변 최대 4명은 범위 공격 피해의 50%만 받고 주 대상 추가 피해는 받지 않아요. 모든 공격 속도 증가는 가시 기본 공격 전체의 반복 속도를 높여요. 이미 발사한 가시는 본체가 사라져도 고정한 표적점까지 진행해요.',
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
            note: '뛰어올랐다가 적을 내려찍어요. 주변 피해는 각 타격의 50%이며 추가 4명까지 맞아요. 연속 도약은 마지막 착지에서 한 번만 추첨하며 성공하면 공격 후 대기 시간만 0.1초로 줄어요. 다음 공격의 준비와 비행은 생략하지 않아요. 마무리 보너스는 기본 공격 총피해 기준으로 마지막 착지에 한 번 더해요.',
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
            note: '기본 공격 위력은 직격과 부착 폭발 전체에 랭크당 3%씩 적용돼요. 부착 폭발 위력 투자는 여기에 별도로 곱해져요. 부착 폭발의 기본 총피해는 알 수로 나눠요. 추가 알과 마지막 폭발 보너스는 부착 폭발 총피해를 기준으로 별도 계산돼요. 첫 부착 1초 뒤부터 0.1초 간격으로 폭발해요.',
        },
    ],
    [
        'pea-recovery-boost',
        {
            key: 'pea',
            name: '콩',
            title: '연속 박치기',
            forms: PEA_FORMS,
            effect: peaGrowthEffect,
            note: '모든 충돌은 지상에서 이어져요. 적에게 밀려난 뒤 움직일 수 있게 되면 2초간 이동 속도가 증가해요. 재돌진 보너스는 강제 이동 종료 뒤 3초 안에 시작한 첫 공격 전체에 한 번 적용돼요. 자체 반동은 발동 조건이 아니에요. 첫·마지막 충돌 특화는 기본 공격 총피해 기준으로 더하며, 단타에는 두 보너스를 합산해요.',
        },
    ],
]);

const GROWTH_REASON_LABELS = new Map([
    ['not-available', '아직 미출시'],
    ['unknown-node', '사용할 수 없는 항목'],
    ['invalid-state', '성장 데이터를 확인해 주세요'],
    ['combat-lock', '탑 도전을 마치고 농장에서 강화 가능'],
    ['farm-only', '농장에서 투자 가능'],
    ['max-rank', '최대 강화'],
    ['insufficient-points', '숙련 포인트 부족'],
]);

export function growthPresentationFor(abilityId) {
    return PRESENTATIONS.get(abilityId) || null;
}

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
      ${investment.legacyInvestment ? `<p class="ability-tree__note" data-growth-refund>기존 투자 ${investedPointsOf(investment.legacyInvestment)}P 환급 완료 · 남은 포인트 ${GROWTH.pointsLeft(BUILD)}P. 환급분은 현재 숙련 포인트에 포함되어 있으며 별도 보너스로 더해지지 않아요.</p>` : ''}
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
      <header class="ability-card__header"><div><p class="ability-card__species">${speciesById(definition.species).name}</p><h3>${PRESENTATION.title}</h3></div><span class="ability-card__grade">최대 50P 사용 / 전체 항목 ${growthTreeCapacity(GROWTH.definition)}P</span></header>
      <p class="ability-card__description">공격 진화로 새 동작을 배우고, 기본·특화 성장으로 능력을 강화해요. 진화를 연구하지 않아도 합성할 수 있고 합성 등급에 따라 공격이 강해져요.</p>
      <p class="ability-card__current-effect" data-growth-form>보유 최고 합성 등급 T${ACTUAL_TIER} · 연구한 공격 형태 T${FORM_TIER} (${PRESENTATION.forms[FORM_TIER - 1][0]})<br>연구해도 유닛의 실제 등급을 넘는 형태는 사용하지 않아요.</p>
      <section class="ability-branch growth-evolution" aria-label="공격 진화"><h4>공격 진화 <small>각 2P · 앞 단계부터</small></h4><div class="growth-evolution__nodes"><div class="growth-evolution__root"><strong>T1 ${PRESENTATION.forms[0][0]}</strong><span>기본 해금 · 무료</span></div>${EVOLUTION.map((node) => renderGrowthNode(GROWTH, BUILD, definition.id, node, context)).join('')}</div></section>
      <section class="growth-preview" aria-label="${PRESENTATION.name} 공격 동작 미리보기"><h4>동작 미리보기</h4><div class="growth-preview__tiers">${PRESENTATION.forms.map((form, index) => `<button type="button" data-growth-preview-species="${PRESENTATION.key}" data-growth-preview-tier="${index + 1}" data-${PRESENTATION.key}-preview-tier="${index + 1}" aria-pressed="false">T${index + 1} ${form[0]}</button>`).join('')}</div><div class="growth-evolution-preview ${PRESENTATION.key}-evolution-preview" aria-label="선택한 ${PRESENTATION.name} 공격 시연"></div><p class="ability-tree__note" data-growth-preview-caption data-${PRESENTATION.key}-preview-caption>단계를 누르면 공격 동작을 볼 수 있어요. 농장과 강화 상태는 바뀌지 않아요.</p></section>
      <div class="ability-card__branches">${SECTIONS}</div>
      <p class="ability-tree__note">${PRESENTATION.note}</p><p class="ability-tree__note">기본 공격 총피해는 한 번의 공격에 포함된 기본 타격 피해를 합한 값이에요. 추가 타격 보너스·치명타·적 방어를 적용하기 전을 기준으로 해요.</p>
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
            return `직격·부착 폭발 피해 +${rank * 3}%`;
        case 'basic-2':
            return `부착 폭발 피해 +${rank * 3}%`;
        case 'basic-3':
            return `공격 속도 +${rank * 2}%`;
        case 'specialty-1':
            return `뒤 순서마다 +${rank * 2}% · 최대 +20%`;
        case 'specialty-2':
            return `마지막 폭발에 부착 폭발 총피해의 ${rank * 8}% 추가`;
        case 'specialty-3':
            return `${rank * 8}% 확률 · 부착 폭발 총피해 100%만큼 피해를 주는 추가 알`;
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
            return `공격 후 대기 시간 -${rank * 1.5}% (준비 시간 제외)`;
        case 'specialty-1':
            return `적에게 밀려난 뒤 2초 동안 이동 속도 +${25 + rank * 6}%`;
        case 'specialty-2':
            return `첫 충돌에 기본 공격 총피해의 ${rank * 8}% 추가`;
        case 'specialty-3':
            return `마지막 충돌에 기본 공격 총피해의 ${rank * 8}% 추가`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}

function redbeanGrowthEffect(nodeId, rank) {
    switch (nodeId) {
        case 'basic-1':
            return `모든 도약 피해 +${rank * 3}%`;
        case 'basic-2':
            return `최대 체력 +${rank * 4}% · 다음 탑 도전부터 적용`;
        case 'basic-3':
            return `공격 속도 +${rank * 2}%`;
        case 'specialty-1':
            return `착지 반경 +${rank * 4}%`;
        case 'specialty-2':
            return `마지막 착지 후 ${Math.min(65, 20 + rank * 9)}% 확률로 공격 후 대기 시간 0.1초`;
        case 'specialty-3':
            return `마지막 착지에 기본 공격 총피해의 ${rank * 8}% 추가`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}

function chestnutGrowthEffect(nodeId, rank) {
    switch (nodeId) {
        case 'basic-1':
            return `가시 기본 공격 전체 피해 +${rank * 3}%`;
        case 'basic-2':
            return `최대 체력 +${rank * 4}% · 다음 탑 도전부터 적용`;
        case 'basic-3':
            return `공격 속도 +${rank * 2}% · 가시 기본 공격 전체에 적용`;
        case 'specialty-1':
            return `기본 공격 가시 +${rank}발 · 주 대상 추가 피해 (기본 피해의 ${100 + rank * 40}%)/3을 전체 가시에 분배`;
        case 'specialty-2':
            return `가시 사거리·범위 +${rank * 4}%`;
        case 'specialty-3':
            return `마지막 가시에 기본 피해의 ${rank * 8}% 추가`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}

function peanutGrowthEffect(nodeId, rank) {
    switch (nodeId) {
        case 'basic-1':
            return `본체·분열체 협공 피해 +${rank * 3}%`;
        case 'basic-2':
            return `최대 체력 +${rank * 4}% · 다음 탑 도전부터 적용`;
        case 'basic-3':
            return `본체·분열체 공격 속도 +${rank * 2}% · 공격 후 대기 시간에 적용`;
        case 'specialty-1':
            return `협공 사거리·범위 +${rank * 4}%`;
        case 'specialty-2':
            return `중앙 또는 마지막 타격에 기본 공격 총피해의 ${rank * 8}% 추가`;
        case 'specialty-3':
            return `사망 시 T1 분열체 체력·공격력 ${100 + rank * 25}% · 한 번 적용`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}

function walnutGrowthEffect(nodeId, rank) {
    switch (nodeId) {
        case 'basic-1':
            return `공격력 +${rank * 3}% · 기본 공격 피해와 저장 피해 상한에 적용`;
        case 'basic-2':
            return `최대 체력 +${rank * 4}% · 다음 탑 도전부터 적용`;
        case 'basic-3':
            return `공격 속도 +${rank * 2}% · 공격 후 대기 시간에 적용`;
        case 'specialty-1':
            return `기본 방어력 +${rank * 3} · 방어 중 +50과 합산`;
        case 'specialty-2':
            return `모은 피해의 반격 비율 ${100 + rank * 25}% · 추가 피해는 기본 공격 총피해의 3배까지`;
        case 'specialty-3':
            return `마지막 망치 타격에 기본 공격 총피해의 ${rank * 8}% 추가 · 모아 둔 반격 피해 제외`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}

function riceGrowthEffect(nodeId, rank) {
    switch (nodeId) {
        case 'basic-1':
            return `낫 공격력 +${rank * 3}%`;
        case 'basic-2':
            return `최대 체력 +${rank * 4}% · 다음 탑 도전부터 적용`;
        case 'basic-3':
            return `공격 속도 +${rank * 2}% · 준비 시간은 고정, 타격과 공격 후 대기 시간에 적용`;
        case 'specialty-1':
            return `적이 잃은 체력 비율×최대 ${35 + rank * 8}%p 치명타 확률 보너스 · 합계 100% 상한`;
        case 'specialty-2':
            return `낫 사거리·범위 +${rank * 4}%`;
        case 'specialty-3':
            return `마지막 낫베기에 기본 공격 총피해의 ${rank * 8}% 추가`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}

function wheatGrowthEffect(nodeId, rank) {
    switch (nodeId) {
        case 'basic-1':
            return `지휘봉 공격력·지휘 공격 속도 보너스 +${rank * 3}%`;
        case 'basic-2':
            return `최대 체력 +${rank * 4}% · 다음 탑 도전부터 적용`;
        case 'basic-3':
            return `공격 속도 +${rank * 2}% · 준비 시간은 고정, 타격과 공격 후 대기 시간에 적용`;
        case 'specialty-1':
            return `지휘 공격 속도 +${50 + rank * 12.5}% · 기본 위력 배율 별도 · T1 3초→T6 18초`;
        case 'specialty-2':
            return `지휘 반경 기본 사거리×${2 + rank * 0.5} · 피해 범위 제외`;
        case 'specialty-3':
            return `마지막 지휘봉 타격에 기본 공격 총피해의 ${rank * 8}% 추가`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}

function barleyGrowthEffect(nodeId, rank) {
    switch (nodeId) {
        case 'basic-1':
            return `도리깨 공격력·공격당 방어 감소량 +${rank * 3}%`;
        case 'basic-2':
            return `최대 체력 +${rank * 4}% · 다음 탑 도전부터 적용`;
        case 'basic-3':
            return `공격 속도 +${rank * 2}% · 준비 시간은 고정, 타격과 공격 후 대기 시간에 적용`;
        case 'specialty-1':
            return `공격당 대상별 방어 감소 ${Number((1 + rank * 0.4).toFixed(1))} · 기본 위력·실제 등급 배율 별도`;
        case 'specialty-2':
            return `각 방어 감소가 적용 후 ${Number((3 + rank * 0.4).toFixed(1))}초 유지 · 각각 만료`;
        case 'specialty-3':
            return `마지막 도리깨 타격에 기본 공격 총피해의 ${rank * 8}% 추가`;
        default:
            throw new RangeError(`Unknown growth effect: ${nodeId}`);
    }
}
