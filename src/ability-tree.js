import { SPECIES_ABILITY_DEFINITIONS } from "./ability-catalog.js";
import { SPECIES_CATALOG, speciesById } from "./species-catalog.js";
import { createAbilityProgressionState, isValidAbilityProgressionState } from "./ability-state.js";
import { abilityProfile } from "./unit-abilities.js";
import { experienceForNextLevel, formatXpForDisplay, isValidPlayerProgressionState } from "./player-progression.js";
import { FARM_UPGRADE_MAX_LEVELS, FARM_UPGRADE_NODES } from "./farm-upgrades.js";

export { ABILITY_TREE_SCHEMA_VERSION, createAbilityProgressionState, isValidAbilityProgressionState } from "./ability-state.js";

export const SHARED_ABILITY_POINT_COST = 1;

const definitionById = new Map(SPECIES_ABILITY_DEFINITIONS.map(definition => [definition.id, definition]));

export function abilityStateFor(state, abilityId) {
  if (!definitionById.has(abilityId) || !state?.abilities?.[abilityId]) return null;
  return state.abilities[abilityId];
}

export function getAbilityPowerLevel(state, abilityId) {
  return abilityStateFor(state, abilityId)?.powerLevel || 0;
}

export function getAbilityGradeLevel(state, abilityId) {
  return abilityStateFor(state, abilityId)?.gradeLevel || 0;
}

export function getMinimumApplicableTier(state, abilityId) {
  const definition = definitionById.get(abilityId);
  if (!definition) return null;
  const gradeLevel = getAbilityGradeLevel(state, abilityId);
  return definition.gradeThresholds[Math.min(gradeLevel, definition.gradeThresholds.length - 1)];
}

export function isAbilityActive(state, abilityId, unitTier) {
  const investment = abilityStateFor(state, abilityId);
  const minimumTier = getMinimumApplicableTier(state, abilityId);
  return !!investment?.rootUnlocked && Number.isInteger(unitTier) && unitTier >= minimumTier;
}

export function powerLevelFor(state, abilityId) {
  return getAbilityPowerLevel(state, abilityId);
}

export function getAbilityEffects(state, abilityId, unitTier) {
  const definition = definitionById.get(abilityId);
  if (!definition || !isAbilityActive(state, abilityId, unitTier)) return null;
  const level = getAbilityPowerLevel(state, abilityId);
  return { abilityId, species: definition.species, unitTier, powerLevel: level, value: definition.powerValues[level] };
}

export function getInvestedPointCount(state) {
  if (!isValidAbilityProgressionState(state)) return 0;
  return Object.values(state.abilities).reduce((total, investment) => total +
    Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel, 0);
}

export function canPurchaseAbilityNode(state, abilityId, nodeId, context = {}) {
  const definition = definitionById.get(abilityId);
  if (!definition) return { allowed: false, reason: "unknown-ability" };
  if (!isValidAbilityProgressionState(state)) return { allowed: false, reason: "invalid-state" };
  if (context.location !== "farm" || context.inCombat === true) return { allowed: false, reason: context.inCombat ? "combat-lock" : "farm-only" };

  const investment = state.abilities[abilityId];
  const node = parseNodeId(nodeId);
  if (!node) return { allowed: false, reason: "unknown-node" };
  if (node.kind === "root") {
    if (investment.rootUnlocked) return { allowed: false, reason: "already-invested" };
    const highestTier = context.highestSpeciesTier?.[definition.species] ?? context.highestSpeciesTier ?? 0;
    if (!Number.isInteger(highestTier) || highestTier < definition.rootTier) return { allowed: false, reason: "requires-rare-tier" };
  } else {
    if (!investment.rootUnlocked) return { allowed: false, reason: "root-required" };
    const currentLevel = node.kind === "power" ? investment.powerLevel : investment.gradeLevel;
    const maxLevel = node.kind === "power" ? definition.powerValues.length - 1 : definition.gradeThresholds.length - 1;
    if (node.level <= currentLevel) return { allowed: false, reason: "already-invested" };
    if (node.level !== currentLevel + 1) return { allowed: false, reason: "prerequisite-required" };
    if (node.level > maxLevel) return { allowed: false, reason: "max-level" };
  }
  if (state.availablePoints < SHARED_ABILITY_POINT_COST) return { allowed: false, reason: "insufficient-points" };
  return { allowed: true, reason: null };
}

export function purchaseAbilityNode(state, abilityId, nodeId, context = {}) {
  const check = canPurchaseAbilityNode(state, abilityId, nodeId, context);
  if (!check.allowed) return { ok: false, reason: check.reason, state };
  const node = parseNodeId(nodeId);
  const next = cloneState(state);
  next.availablePoints -= SHARED_ABILITY_POINT_COST;
  if (node.kind === "root") next.abilities[abilityId].rootUnlocked = true;
  else if (node.kind === "power") next.abilities[abilityId].powerLevel = node.level;
  else next.abilities[abilityId].gradeLevel = node.level;
  return { ok: true, reason: null, state: next };
}

export function canResetAbilityProgression(state, context = {}) {
  if (!isValidAbilityProgressionState(state)) return { allowed: false, reason: "invalid-state" };
  if (context.location !== "farm" || context.inCombat === true) return { allowed: false, reason: context.inCombat ? "combat-lock" : "farm-only" };
  if (getInvestedPointCount(state) === 0) return { allowed: false, reason: "nothing-invested" };
  return { allowed: true, reason: null };
}

export function resetAbilityProgression(state, context = {}) {
  const check = canResetAbilityProgression(state, context);
  if (!check.allowed) return { ok: false, reason: check.reason, state };
  const refunded = getInvestedPointCount(state);
  const next = cloneState(state);
  next.availablePoints += refunded;
  next.abilities = Object.fromEntries(SPECIES_ABILITY_DEFINITIONS.map(definition => [definition.id, {
    rootUnlocked: false,
    powerLevel: 0,
    gradeLevel: 0
  }]));
  return { ok: true, reason: null, refunded, state: next };
}

export function canPurchaseFarmUpgrade(state, nodeId, context = {}) {
  const node = FARM_UPGRADE_NODES.find(candidate => candidate.id === nodeId);
  if (!node) return { allowed: false, reason: "unknown-node" };
  if (!isValidPlayerProgressionState(state)) return { allowed: false, reason: "invalid-state" };
  if (context.location !== "farm" || context.inCombat === true) return { allowed: false, reason: context.inCombat ? "combat-lock" : "farm-only" };
  if (state.farmUpgrades[nodeId] >= FARM_UPGRADE_MAX_LEVELS[nodeId]) return { allowed: false, reason: "max-level" };
  if (state.availablePoints < SHARED_ABILITY_POINT_COST) return { allowed: false, reason: "insufficient-points" };
  return { allowed: true, reason: null };
}

export function purchaseFarmUpgrade(state, nodeId, context = {}) {
  const check = canPurchaseFarmUpgrade(state, nodeId, context);
  if (!check.allowed) return { ok: false, reason: check.reason, state };
  const next = cloneState(state);
  next.availablePoints -= SHARED_ABILITY_POINT_COST;
  next.farmUpgrades[nodeId] += 1;
  return { ok: true, reason: null, state: next };
}

export function renderFarmUpgradeTreeMarkup(state, { location = "farm", inCombat = false } = {}) {
  if (!isValidPlayerProgressionState(state)) throw new TypeError("Cannot render invalid player progression state");
  const nodes = FARM_UPGRADE_NODES.map(node => {
    const level = state.farmUpgrades[node.id];
    const check = canPurchaseFarmUpgrade(state, node.id, { location, inCombat });
    return `<article class="tree-node" data-ready="${check.allowed}"><div class="node-heading"><span class="node-icon" aria-hidden="true">${node.icon}</span><h3>${node.name}</h3><span>${level}/${FARM_UPGRADE_MAX_LEVELS[node.id]}</span></div><p>${node.description}</p><div class="node-values">${node.value(level)}${level < FARM_UPGRADE_MAX_LEVELS[node.id] ? ` <span>→ ${node.value(level + 1)}</span>` : ""}</div><small>${level === FARM_UPGRADE_MAX_LEVELS[node.id] ? "완료" : check.reason ? farmUpgradeReasonLabel(check.reason) : "공용 포인트 1개"}</small><button type="button" data-progression-farm-node="${node.id}" aria-disabled="${!check.allowed}" ${check.allowed ? "" : "disabled"}>${level === FARM_UPGRADE_MAX_LEVELS[node.id] ? "✓" : "+"}<span class="sr-only">${node.name} 투자</span></button></article>`;
  }).join("");
  return `<section class="farm-upgrade-tree" aria-label="일반 정원 강화"><p class="ability-tree__wallet" aria-live="polite"><strong>${state.availablePoints}</strong><span>공용 XP 포인트</span></p>${renderPlayerProgressMarkup(state)}<div class="farm-upgrade-tree__nodes">${nodes}</div></section>`;
}

export function getAbilityNodeStatus(state, definition, nodeId, context = {}) {
  const node = parseNodeId(nodeId);
  if (!node) return { purchased: false, ready: false, reason: "unknown-node" };
  const investment = state?.abilities?.[definition.id] || { rootUnlocked: false, powerLevel: 0, gradeLevel: 0 };
  if (node.kind === "root" && investment.rootUnlocked) return { purchased: true, ready: false, reason: "already-invested" };
  if (node.kind === "power" && node.level <= investment.powerLevel) return { purchased: true, ready: false, reason: "already-invested" };
  if (node.kind === "grade" && node.level <= investment.gradeLevel) return { purchased: true, ready: false, reason: "already-invested" };
  const result = canPurchaseAbilityNode(state, definition.id, nodeId, context);
  return { purchased: false, ready: result.allowed, reason: result.reason };
}

export function renderAbilitySpeciesTabsMarkup(selectedSpecies = 0) {
  return SPECIES_CATALOG.map(species => `<button type="button" data-ability-species="${species.id}" aria-pressed="${species.id === selectedSpecies}">${species.name}</button>`).join("");
}

export function renderAbilityTreeMarkup(state, {
  highestSpeciesTier = {},
  location = "farm",
  inCombat = false,
  selectedSpecies = null
} = {}) {
  if (!isValidAbilityProgressionState(state)) throw new TypeError("Cannot render invalid ability progression state");
  const invested = getInvestedPointCount(state);
  const context = { highestSpeciesTier, location, inCombat };
  const resetCheck = canResetAbilityProgression(state, context);
  const visibleDefinitions = Number.isInteger(selectedSpecies)
    ? SPECIES_ABILITY_DEFINITIONS.filter(definition => definition.species === selectedSpecies)
    : SPECIES_ABILITY_DEFINITIONS;
  const cards = visibleDefinitions.map(definition => renderAbilityCard(state, definition, context)).join("") ||
    `<p class="ability-tree__note" role="status">이 병종은 기본 공격으로 전투에 참여해요. 전용 특수 능력 트리는 아직 추가되지 않았어요.</p>`;
  const levelMarkup = renderPlayerProgressMarkup(state);
  return `<section class="ability-tree" aria-labelledby="ability-tree-title">
    <header class="ability-tree__header">
      <div><p class="ability-tree__eyebrow">정원 성장</p><h2 id="ability-tree-title">특수 능력</h2></div>
      <p class="ability-tree__wallet" aria-live="polite"><strong>${state.availablePoints}</strong><span>공용 포인트</span></p>
    </header>
    <p class="ability-tree__note">능력마다 Rare(T3)에서 해금할 수 있고, 강화와 적용 등급 완화에 같은 포인트를 씁니다. 사용하지 않은 포인트는 보존됩니다.</p>
    ${levelMarkup}
    <div class="ability-tree__actions">
      <p class="ability-tree__lock-note" role="status">${inCombat ? "전투 중에는 투자와 초기화가 잠깁니다." : location !== "farm" ? "농장에서 투자하거나 초기화할 수 있습니다." : "농장에서 무료로 초기화할 수 있습니다."}</p>
      <button type="button" class="ability-tree__reset" data-ability-action="reset" aria-describedby="ability-tree-reset-help" aria-disabled="${!resetCheck.allowed}">무료 초기화</button>
      <span class="ability-tree__action-help" id="ability-tree-reset-help">${resetReasonLabel(resetCheck.reason, invested)}</span>
    </div>
    <div class="ability-tree__cards">${cards}</div>
  </section>`;
}

function renderPlayerProgressMarkup(state) {
  if (!Number.isSafeInteger(state.level) || state.level < 1 || !Number.isFinite(state.experience) || state.experience < 0) return "";
  const nextLevelXp = experienceForNextLevel(state.level);
  if (!Number.isFinite(nextLevelXp) || state.experience >= nextLevelXp) return "";
  const label = `플레이어 레벨 ${state.level} 경험치`;
  return `<div class="ability-tree__progress" aria-live="polite">
    <div><strong>플레이어 Lv. ${state.level}</strong><span>${formatXpForDisplay(state.experience)} / ${formatXpForDisplay(nextLevelXp)} XP</span></div>
    <progress max="${nextLevelXp}" value="${state.experience}" aria-label="${label}"></progress>
  </div>`;
}

export function mountAbilityTreePanel(host, {
  getState,
  getContext = () => ({}),
  onStateChange = () => {}
} = {}) {
  if (!host || typeof host.addEventListener !== "function") throw new TypeError("A DOM host element is required");
  if (typeof getState !== "function") throw new TypeError("getState callback is required");
  const render = () => {
    const state = getState();
    host.innerHTML = renderAbilityTreeMarkup(state, getContext());
  };
  const onClick = event => {
    const button = event.target?.closest?.("button[data-ability-action],button[data-ability-node]");
    if (!button || button.getAttribute("aria-disabled") === "true") return;
    const state = getState();
    const context = getContext();
    let result;
    if (button.dataset.abilityAction === "reset") result = resetAbilityProgression(state, context);
    else if (button.dataset.abilityNode) {
      const [abilityId, kind, level] = button.dataset.abilityNode.split(":");
      const nodeId = kind === "root" ? "root" : `${kind}-${level}`;
      result = purchaseAbilityNode(state, abilityId, nodeId, context);
    }
    if (result?.ok) {
      onStateChange(result.state, result);
      render();
    }
  };
  host.addEventListener("click", onClick);
  render();
  return {
    render,
    dispose() { host.removeEventListener("click", onClick); }
  };
}

function renderAbilityCard(state, definition, context) {
  const investment = state.abilities[definition.id];
  const powerNodes = definition.powerValues.slice(1).map((value, index) => {
    const level = index + 1;
    const label = powerLabel(definition.id, value, level);
    return renderNode(state, definition, `power-${level}`, powerTitle(definition.id, value), label, context);
  }).join("");
  const gradeNodes = definition.gradeThresholds.slice(1).map((tier, index) => {
    const level = index + 1;
    const grade = tier === 2 ? "Uncommon (T2)" : "Common (T1)";
    return renderNode(state, definition, `grade-${level}`, `${grade}까지`, `최소 적용 등급 ${grade}`, context);
  }).join("");
  const minimumTier = getMinimumApplicableTier(state, definition.id);
  const rootStatus = getAbilityNodeStatus(state, definition, "root", context);
  const speciesName = speciesById(definition.species).name;
  return `<article class="ability-card" data-species="${definition.species}" data-ability="${definition.id}">
    <header class="ability-card__header"><div><p class="ability-card__species">${speciesName}</p><h3>${definition.name}</h3></div><span class="ability-card__grade">${investment.rootUnlocked ? `최소 T${minimumTier}` : "Rare · T3 해금"}</span></header>
    <p class="ability-card__description">${definition.description}</p>
    <div class="ability-card__root">
      <span class="ability-node__branch-label">능력 루트</span>
      ${renderNode(state, definition, "root", "능력 해금", `Rare (T${definition.rootTier}) 개체 필요`, context, rootStatus)}
      <p class="ability-card__base-effect">기본 효과: ${powerLabel(definition.id, definition.powerValues[0], 0)}</p>
    </div>
    <div class="ability-card__branches">
      <section class="ability-branch" aria-label="능력 강화 경로"><h4>능력 강화</h4><div class="ability-branch__nodes">${powerNodes}</div></section>
      <section class="ability-branch" aria-label="적용 등급 완화 경로"><h4>적용 등급 완화</h4><div class="ability-branch__nodes">${gradeNodes}</div></section>
    </div>
  </article>`;
}

function renderNode(state, definition, nodeId, title, effect, context, knownStatus = null) {
  const status = knownStatus || getAbilityNodeStatus(state, definition, nodeId, context);
  const hintId = `ability-help-${definition.id}-${nodeId.replace(/[^a-z0-9-]/gi, "-")}`;
  const statusText = status.purchased ? "투자 완료" : nodeReasonLabel(status.reason, definition, context);
  const attr = nodeId === "root" ? `${definition.id}:root` : `${definition.id}:${nodeId.replace(/-(\d+)$/, ":$1")}`;
  return `<div class="ability-node ${status.purchased ? "is-purchased" : ""} ${status.ready ? "is-ready" : "is-locked"}">
    <button type="button" class="ability-node__button" data-ability-node="${attr}" aria-describedby="${hintId}" aria-disabled="${!status.ready}">
      <span class="ability-node__title">${title}</span><span class="ability-node__effect">${effect}</span><span class="ability-node__cost">${status.purchased ? "완료" : "1 포인트"}</span>
    </button>
    <span class="ability-node__status" id="${hintId}">${statusText}</span>
  </div>`;
}

function powerLabel(abilityId, value, level) {
  if (abilityId === "pea-death-split") return `전투 사망 시 같은 종 T1 ${value}마리 생성`;
  if (abilityId === "corn-burst-fire") {
    const share = definitionById.get(abilityId).projectileAttackShare;
    return `한 공격 주기 · 발사 ${value}발 · 발당 ATK ×${abilityProfile(1).skillMultiplier * share}`;
  }
  if (abilityId === "corn-popcorn-chain") {
    const definition = definitionById.get(abilityId);
    const radiusMultiplier = definition.radiusMultipliers[level] || definition.radiusMultipliers[0];
    return `착탄 ${definition.fuseSeconds}초 후 · 팝콘 접촉 즉시 연쇄 · 피해 ATK ×${value} · 반경 기본 사거리 ×${definition.baseRangeFraction} ×${radiusMultiplier}`;
  }
  if (abilityId === "chestnut-spike-fan") {
    const definition = definitionById.get(abilityId);
    return `목표 방향 부채꼴 90° ${value}발 · 발당 ATK ×${definition.projectileAttackMultiplier} · 기본 공격 ${definition.intervalBasicCycles}주기마다`;
  }
  if (abilityId === "kidney-continuous-leap") return `착지 후 도약 쿨다운 초기화 ${Math.round(value * 100)}%`;
  if (abilityId === "kidney-landing-shockwave") return `충격파 피해·반경 ${value}×`;
  if (abilityId === "peanut-separated-assault") return `한 공격 주기 ${value}타 · 타격당 ATK ×${definitionById.get(abilityId).strikeAttackMultiplier} · 넓은 협공 궤적`;
  if (abilityId === "walnut-guard-slam") {
    const definition = definitionById.get(abilityId);
    return `첫 방어 피격 피해 −${Math.round((1-definition.receivedDamageMultiplier)*100)}%·넉백 −${Math.round((1-definition.receivedKnockbackMultiplier)*100)}% · 다음 공격 ATK ×${value} · 충격파 반경 기본 사거리 ×${definition.radiusBaseRangeFraction * definition.radiusMultipliers[level]}`;
  }
  if (abilityId === "rice-low-health-harvest") return `HP ${Math.round(definitionById.get(abilityId).targetHpThreshold * 100)}% 이하 대상에게 기본 피해 총 ${value}×`;
  if (abilityId === "wheat-command-crit") {
    const definition = definitionById.get(abilityId);
    return `기본 공격 적중 시 자신 포함 반경 기본 사거리 ×${definition.radiusRangeRatio} 안의 생존 아군 치명타 +${Math.round(value * 100)}%p · ${definition.durationSeconds}초`;
  }
  if (abilityId === "barley-armor-break") return `기본 공격 적중 시 방어도 ${Math.round(value * 100)}% 감소 · 5초`;
  return `강화 ${level}`;
}

function powerTitle(abilityId, value) {
  if (abilityId === "pea-death-split") return `T1 ${value}마리 생성`;
  if (abilityId === "corn-burst-fire") return `${value}발 연사`;
  if (abilityId === "corn-popcorn-chain") return `ATK ×${value} 폭발`;
  if (abilityId === "chestnut-spike-fan") return `가시 ${value}발`;
  if (abilityId === "kidney-continuous-leap") return `초기화 ${Math.round(value * 100)}%`;
  if (abilityId === "kidney-landing-shockwave") return `충격파 ×${value}`;
  if (abilityId === "peanut-separated-assault") return `협공 ${value}타`;
  if (abilityId === "walnut-guard-slam") return `반격 피해 ×${value}`;
  if (abilityId === "rice-low-health-harvest") return `수확 피해 ×${value}`;
  if (abilityId === "wheat-command-crit") return `치명타 +${Math.round(value * 100)}%p`;
  if (abilityId === "barley-armor-break") return `방어도 ${Math.round(value * 100)}% 감소`;
  return "능력 강화";
}

function nodeReasonLabel(reason, definition, context) {
  switch (reason) {
    case "already-invested": return "이미 투자한 노드입니다.";
    case "root-required": return "먼저 능력 루트를 해금하세요.";
    case "prerequisite-required": return "이전 단계에 먼저 투자하세요.";
    case "insufficient-points": return "공용 포인트가 필요합니다.";
    case "requires-rare-tier": return `이 종의 Rare (T${definition.rootTier}) 이상 개체가 필요합니다.`;
    case "combat-lock": return "전투 중에는 투자할 수 없습니다.";
    case "farm-only": return "농장에서만 투자할 수 있습니다.";
    case "max-level": return "최대 강화 단계입니다.";
    case "invalid-state": return "성장 데이터가 유효하지 않습니다.";
    default: return context.location === "farm" ? "사용할 수 없는 노드입니다." : "농장에서 사용할 수 있습니다.";
  }
}

function resetReasonLabel(reason, invested) {
  if (reason === "nothing-invested") return "투자한 포인트가 없습니다.";
  if (reason === "combat-lock") return "전투 중에는 초기화할 수 없습니다.";
  if (reason === "farm-only") return "농장에서만 초기화할 수 있습니다.";
  if (reason === "invalid-state") return "성장 데이터가 유효하지 않습니다.";
  return `투자 ${invested}개를 무료로 돌려받습니다.`;
}

function farmUpgradeReasonLabel(reason) {
  switch (reason) {
    case "insufficient-points": return "공용 XP 포인트가 필요합니다.";
    case "combat-lock": return "전투 중에는 투자할 수 없습니다.";
    case "farm-only": return "농장에서만 투자할 수 있습니다.";
    case "max-level": return "최대 강화 단계입니다.";
    case "invalid-state": return "성장 데이터가 유효하지 않습니다.";
    default: return "사용할 수 없는 노드입니다.";
  }
}

function parseNodeId(nodeId) {
  if (nodeId === "root") return { kind: "root", level: 0 };
  const match = /^(power|grade)-(\d+)$/.exec(String(nodeId || ""));
  if (!match) return null;
  return { kind: match[1], level: Number(match[2]) };
}

function cloneState(state) {
  return {
    ...state,
    farmUpgrades: { ...state.farmUpgrades },
    abilities: Object.fromEntries(Object.entries(state.abilities).map(([id, value]) => [id, { ...value }]))
  };
}

