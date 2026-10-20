import { PerformanceDiagnostics } from './performance-diagnostics.js';
import { FormationSkillsUI } from './formation-skills-ui.js';
import { RaidDeploymentCardsUI } from './raid-deployment-cards-ui.js';
import { raidDeploymentCardSpecies } from './raid-deployment-cards.js';
import { Garden, CONFIG, ArenaGeometry, ATTACK_TYPES, Ballistics } from './farm-model.js';
import { Diorama } from './farm-renderer.js';
import { FarmSession } from './farm-session.js';
import { FarmStorage } from './farm-storage.js';
import { FarmAutosave } from './farm-autosave.js';
import { snapshot, restore } from './farm-state.js';
import { PRODUCT_VERSION } from './version.js';
import { FoodFeel } from './food-feel.js';
import { CombatFeel } from './combat-feel.js';
import { raidRosterEntries, hasRaidRosterEntries } from './raid-roster.js';
import { createAbilityRuntimeSnapshot } from './ability-state.js';
import {
    renderAbilityTreeMarkup,
    renderAbilitySpeciesTabsMarkup,
    renderFarmUpgradeTreeMarkup,
} from './ability-tree.js';
import { canResetPlayerProgression } from './ability-progression.js';
import {
    abortReservedRaidRun,
    reserveRaidRun,
    settleRaidOwnerFarm,
    raidDeploymentRewardMultiplier,
} from './raid-settlement.js';
import {
    advanceBossRewardReveal,
    bossRewardRollDescription,
    bossStageStats,
    openAllBossRewardBoxes,
    settleBossKill,
    advanceBossRewardCalculations,
} from './boss-rewards.js';
import { selectMapBossStage } from './farm-boss-stages.js';
import { createWorldMapView } from './world-map-view.js';
import {
    beginChallenge,
    canBuildMine,
    canChallenge,
    canExploreTile,
    farmBuildBlock,
    inReach,
    TERRAIN_NAMES,
    tileRemaining,
    tileResource,
    tileTerrain,
    hasBoss,
    isRevealed,
    setExploreTarget,
    tileDanger,
    tileSpecies,
    tileX,
    tileY,
} from './world-map.js';
import { speciesById, giantSpeciesName, speciesRewardName } from './species-catalog.js';
const DOLLAR = (id) => document.getElementById(id),
    STORAGE = new FarmStorage();
STORAGE.initializeIncompatible(new Garden());
DOLLAR('abilitySpeciesTabs').innerHTML = renderAbilitySpeciesTabsMarkup();
let imported = null;
let active = null;
let home = true;
let personalGarden = null;
let unsubscribeProgress = null;
let menuOpen = false;
let menuTab = 'play';
let menuWasPaused = true;
let menuPauseChanged = false;
let menuAutoPaused = false;
let panPointer = null;
let foodHold = null;
let farmSortTransition = null;
let farmPanelRevision = -1;
let bossEncounterOpen = false;
// A raid is a boss met on the world map; the screen is the map.
let bossMapTile = -1;
// While the party walks out to a boss on the map: where from, where to, and when it set off.
let raidApproach = null;
const RAID_APPROACH_MS = 1800;
let worldMapView = null;
let miniMapView = null;
let lastLit = null;
let bossPauseBeforeOpen = null;
let lastAutoSettledRunKey = null;
let bossRewardRevealTimer = null;
let bossRewardCalculationTimer = null;
let bossRewardDialogReceiptKey = null;
let bossRewardAnimationSerial = 0;
let bossRewardPortraitReceiptKey = '';
const BOSS_REWARD_CYCLE_TIMERS = new Set();
const AUTO_OPENED_BOSS_REWARDS = new Set();
let mergeStatusCache = {
    world: null,
    revision: -1,
    updatedAt: -Infinity,
    value: null,
};
const RENDERER = new Diorama(DOLLAR('world'));
const FORMATION_UI = new FormationSkillsUI((kind, payload) => {
    const QUEUED = active?.queue(kind, payload) ?? false;
    setTimeout(renderProgressionResetActions, 180);
    return QUEUED;
});
const RAID_DEPLOYMENT_UI = new RaidDeploymentCardsUI({
    command: (kind, payload) => {
        const QUEUED = active?.queue(kind, payload) ?? false;
        setTimeout(renderProgressionResetActions, 180);
        return QUEUED;
    },
    deploy: (speciesId) => active?.deployNext(speciesId) ?? false,
    canDeploy: () => canUseWorldInput() && active?.world.scene === 'raid' && !panPointer,
});
const PERFORMANCE_DIAGNOSTICS = new PerformanceDiagnostics();
STORAGE.profiler = PERFORMANCE_DIAGNOSTICS;
function frameRate() {
    return PERFORMANCE_DIAGNOSTICS.frameRate();
}
function mergeAvailability(world, now) {
    if (
        mergeStatusCache.world !== world ||
        mergeStatusCache.revision !== world.mergeAvailabilityRevision ||
        now - mergeStatusCache.updatedAt >= 250
    ) {
        mergeStatusCache = {
            world,
            revision: world.mergeAvailabilityRevision,
            updatedAt: now,
            value: world.mergeAvailability(),
        };
    }
    return mergeStatusCache.value;
}
function rewardReceiptSummary(reward) {
    if (!reward) {
        return '보상 없음';
    }
    if (reward.status === 'calculating') {
        const DONE = reward.calculation?.jobState?.processedTrials ?? 0;
        return '보상 상자 계산 중 (' + DONE + '/' + reward.boxCount + ')';
    }
    const ACQUIRED = reward.acquiredCount ?? reward.successCount ?? 0,
        PLACED = reward.placedCount ?? reward.grantedCount ?? 0,
        QUEUED = reward.queuedCount ?? Math.max(0, ACQUIRED - PLACED);
    if (ACQUIRED === 0) {
        return '이번에는 획득한 모리가 없어요';
    }
    return ACQUIRED + '마리 획득 · ' + PLACED + '마리 배치' + (QUEUED ? ' · ' + QUEUED + '마리 자리 대기' : '');
}
function latestBossReward(world) {
    return [...(world?.bossRewardReceipts || [])]
        .reverse()
        .find((reward) => ['calculating', 'ready'].includes(reward.status));
}
function bossRewardSummary(reward) {
    if (!reward) {
        return '보상 내역 없음';
    }
    if (reward.status === 'calculating') {
        const DONE = reward.calculation?.jobState?.processedTrials ?? 0;
        return '보상 상자 계산 중 (' + DONE + '/' + reward.boxCount + ')';
    }
    const ACQUIRED = reward.acquiredCount ?? reward.successCount ?? 0,
        PLACED = reward.placedCount ?? reward.grantedCount ?? 0,
        QUEUED = reward.queuedCount ?? Math.max(0, ACQUIRED - PLACED);
    return ACQUIRED + '개 획득 · ' + PLACED + '개 배치' + (QUEUED ? ' · 공간 대기 ' + QUEUED + '개' : '');
}
function persistBossRewardSettlement(world) {
    if (!saveImmediate(world)) {
        DOLLAR('bossRewardSummary').textContent = '보상 진행 상황을 저장하지 못했어요: ' + STORAGE.error;
        return false;
    }
    return true;
}
const BOSS_REWARD_CHEST_TIERS = ['wood', 'iron', 'gold', 'magic', 'jade'];

function bossRewardChestTier(receipt) {
    if (receipt.source !== 'raid' || !receipt.stage) {
        return 'wood';
    }
    return BOSS_REWARD_CHEST_TIERS[(receipt.stage - 1) % BOSS_REWARD_CHEST_TIERS.length];
}

function renderBossRewardBoxes(receipt) {
    DOLLAR('bossRewardChest').dataset.tier = bossRewardChestTier(receipt);
    const COUNT = receipt.boxCount || 0,
        REVEALED = receipt.revealedCount || 0,
        BOXES = receipt.boxes || [],
        HAS_PRESENTATION = BOXES.length === COUNT,
        PAYOUTS = receipt.calculation?.payouts || BOXES.map((box) => box.payout),
        MIN = PAYOUTS.length ? Math.min(...PAYOUTS) : 0,
        MAX = PAYOUTS.length ? Math.max(...PAYOUTS) : 0,
        FIRST_CLEAR = receipt.firstClear === true,
        NOMINAL_CHANCE = receipt.baselineChance ?? (receipt.source === 'farm' ? 0.1 : FIRST_CLEAR ? 0.15 : 0.05),
        CUMULATIVE = BOXES.slice(0, REVEALED).reduce((sum, box) => sum + (box.hit ? box.payout : 0), 0),
        PROCESSED = receipt.calculation?.jobState?.processedTrials ?? 0;
    DOLLAR('bossRewardStage').textContent = receipt.stage
        ? (receipt.source === 'raid' ? '승리 · ' : '농장 레이드 · ') + receipt.stage + '단계'
        : receipt.source === 'farm'
          ? '농장 레이드 승리'
          : '레이드 보스 승리';
    DOLLAR('bossRewardRibbon').hidden = !FIRST_CLEAR;
    DOLLAR('bossRewardTitle').textContent = receipt.status === 'calculating' ? '보상 준비 중' : '승리 보상';
    DOLLAR('bossRewardSummary').textContent =
        receipt.status === 'calculating'
            ? '상자 ' + COUNT + '개의 보상을 준비하고 있어요.'
            : HAS_PRESENTATION
              ? COUNT +
                '회 추첨 · 상자당 ' +
                MIN +
                (MIN === MAX ? '' : '–' + MAX) +
                '마리 · ' +
                (FIRST_CLEAR ? '첫 클리어 ' : '재도전 ') +
                Math.round(NOMINAL_CHANCE * 100) +
                '% (편성 반영 ' +
                Math.round(receipt.chance * 100) +
                '%)'
              : '이미 확정된 보상 합계';
    DOLLAR('bossRewardTotals').textContent =
        receipt.status === 'calculating'
            ? '추첨 계산 ' + PROCESSED + '/' + COUNT
            : '현재 합계 ' + CUMULATIVE + '마리 · ' + bossRewardSummary(receipt);
    DOLLAR('bossRewardRevealCount').textContent =
        receipt.status === 'calculating' ? '추첨 ' + PROCESSED + '/' + COUNT : REVEALED + '/' + COUNT + ' 상자 공개';
    const SCENE = DOLLAR('bossRewardChestScene');
    if (
        receipt.status === 'ready' &&
        receipt.acquiredCount > 0 &&
        bossRewardPortraitReceiptKey !== receipt.receiptKey
    ) {
        const ENTRY = speciesById(receipt.species);
        if (ENTRY) {
            bossRewardPortraitReceiptKey = receipt.receiptKey;
            renderNeutralBossPreview(
                DOLLAR('bossRewardPortrait'),
                receipt.species,
                ENTRY.asset,
                speciesRewardName(receipt.species),
            );
        }
    }
    DOLLAR('bossRewardOpenAll').disabled = receipt.status !== 'ready' || !HAS_PRESENTATION || REVEALED >= COUNT;
    DOLLAR('bossRewardOpenAll').hidden = receipt.status !== 'ready' || REVEALED >= COUNT;
    DOLLAR('bossRewardClose').hidden = receipt.status !== 'ready' || REVEALED < COUNT;
    if (!HAS_PRESENTATION && receipt.status === 'ready') {
        SCENE.classList.add('is-settled');
    } else {
        SCENE.classList.remove('is-settled');
    }
}
function scheduleBossRewardCycle(callback, delay, serial) {
    const TIMER = setTimeout(() => {
        BOSS_REWARD_CYCLE_TIMERS.delete(TIMER);
        if (serial === bossRewardAnimationSerial) {
            callback();
        }
    }, delay);
    BOSS_REWARD_CYCLE_TIMERS.add(TIMER);
}
function cancelBossRewardCycle() {
    bossRewardAnimationSerial += 1;
    for (const TIMER of BOSS_REWARD_CYCLE_TIMERS) {
        clearTimeout(TIMER);
    }
    BOSS_REWARD_CYCLE_TIMERS.clear();
    const SCENE = DOLLAR('bossRewardChestScene');
    SCENE?.classList.remove('is-compressing', 'is-lid-open', 'is-reward', 'is-empty');
    if (SCENE) {
        SCENE.dataset.cycle = '';
    }
    const PRIZE = DOLLAR('bossRewardPrize'),
        EMPTY = DOLLAR('bossRewardEmpty');
    if (PRIZE) {
        PRIZE.hidden = true;
    }
    if (EMPTY) {
        EMPTY.hidden = true;
    }
}
function revealBossRewardBatch() {
    const WORLD = personalGarden || active?.world,
        RECEIPT = WORLD?.bossRewardReceipts.find((reward) => reward.receiptKey === bossRewardDialogReceiptKey);
    if (!WORLD || !RECEIPT || RECEIPT.status !== 'ready') {
        clearInterval(bossRewardRevealTimer);
        bossRewardRevealTimer = null;
        cancelBossRewardCycle();
        return;
    }
    const FROM = RECEIPT.revealedCount || 0,
        TO = Math.min(RECEIPT.boxCount, FROM + 10),
        BATCH = RECEIPT.boxes.slice(FROM, TO),
        AMOUNT = BATCH.reduce((sum, box) => sum + (box.hit ? box.payout : 0), 0),
        SERIAL = ++bossRewardAnimationSerial,
        SCENE = DOLLAR('bossRewardChestScene');
    if (FROM >= RECEIPT.boxCount || !BATCH.length) {
        clearInterval(bossRewardRevealTimer);
        bossRewardRevealTimer = null;
        renderBossRewardBoxes(RECEIPT);
        return;
    }
    SCENE.classList.remove('is-compressing', 'is-lid-open', 'is-reward', 'is-empty');
    void SCENE.offsetWidth;
    SCENE.dataset.cycle = AMOUNT > 0 ? 'hit' : 'miss';
    SCENE.classList.add('is-compressing');
    DOLLAR('bossRewardOutcome').textContent = '';
    DOLLAR('bossRewardPopAmount').textContent = AMOUNT > 0 ? '+' + AMOUNT : '';
    DOLLAR('bossRewardEmpty').hidden = true;
    DOLLAR('bossRewardPrize').hidden = true;
    DOLLAR('bossRewardRevealCount').textContent = '상자 ' + TO + '/' + RECEIPT.boxCount + ' · 보상 공개 중';
    scheduleBossRewardCycle(
        () => {
            SCENE.classList.remove('is-compressing');
            SCENE.classList.add('is-lid-open');
            if (AMOUNT > 0) {
                SCENE.classList.add('is-reward');
            }
        },
        100,
        SERIAL,
    );
    scheduleBossRewardCycle(
        () => {
            if (AMOUNT > 0) {
                DOLLAR('bossRewardPrize').hidden = false;
            } else {
                SCENE.classList.add('is-empty');
                DOLLAR('bossRewardEmpty').hidden = false;
                DOLLAR('bossRewardOutcome').textContent = '빈 상자';
            }
        },
        220,
        SERIAL,
    );
    scheduleBossRewardCycle(
        () => {
            advanceBossRewardReveal(WORLD, RECEIPT.receiptKey, BATCH.length);
            renderBossRewardBoxes(RECEIPT);
        },
        420,
        SERIAL,
    );
    scheduleBossRewardCycle(
        () => {
            SCENE.classList.remove('is-compressing', 'is-lid-open', 'is-reward', 'is-empty');
            if (RECEIPT.revealedCount >= RECEIPT.boxCount) {
                clearInterval(bossRewardRevealTimer);
                bossRewardRevealTimer = null;
                renderBossRewardBoxes(RECEIPT);
            }
        },
        500,
        SERIAL,
    );
}
function stopBossRewardCalculation() {
    clearInterval(bossRewardCalculationTimer);
    bossRewardCalculationTimer = null;
}
function advanceRaidRewardCalculation() {
    const WORLD = personalGarden,
        RECEIPT = WORLD?.bossRewardReceipts.find((reward) => reward.receiptKey === bossRewardDialogReceiptKey);
    if (!WORLD || !RECEIPT || RECEIPT.source !== 'raid' || RECEIPT.status !== 'calculating') {
        stopBossRewardCalculation();
        return;
    }
    advanceBossRewardCalculations(WORLD);
    if (RECEIPT.status !== 'calculating') {
        stopBossRewardCalculation();
        persistBossRewardSettlement(WORLD);
    }
    if (!DOLLAR('bossRewardDialog').hidden) {
        renderBossRewardBoxes(RECEIPT);
    }
}
function showBossRewardDialog(receipt, { auto = false } = {}) {
    if (!receipt || !['calculating', 'ready'].includes(receipt.status)) {
        return;
    }
    const DIALOG = DOLLAR('bossRewardDialog');
    clearInterval(bossRewardRevealTimer);
    bossRewardRevealTimer = null;
    cancelBossRewardCycle();
    if (bossRewardDialogReceiptKey !== receipt.receiptKey) {
        bossRewardPortraitReceiptKey = '';
    }
    bossRewardDialogReceiptKey = receipt.receiptKey;
    DIALOG.hidden = false;
    DOLLAR('bossRewardOpen').hidden = true;
    renderBossRewardBoxes(receipt);
    if (auto && receipt.status === 'ready' && !AUTO_OPENED_BOSS_REWARDS.has(receipt.receiptKey)) {
        AUTO_OPENED_BOSS_REWARDS.add(receipt.receiptKey);
    }
    if (
        receipt.status === 'ready' &&
        receipt.boxes?.length === receipt.boxCount &&
        receipt.revealedCount < receipt.boxCount
    ) {
        bossRewardRevealTimer = setInterval(revealBossRewardBatch, 500);
    }
}
function syncBossRewardDialog(world, { receiptKey = null, raidVictory = false } = {}) {
    const RECEIPT = receiptKey
            ? world?.bossRewardReceipts.find((reward) => reward.receiptKey === receiptKey)
            : latestBossReward(world),
        BUTTON = DOLLAR('bossRewardOpen'),
        DIALOG = DOLLAR('bossRewardDialog');
    if (home) {
        DIALOG.hidden = true;
        BUTTON.hidden = true;
        clearInterval(bossRewardRevealTimer);
        bossRewardRevealTimer = null;
        cancelBossRewardCycle();
        stopBossRewardCalculation();
        return;
    }
    BUTTON.hidden =
        !RECEIPT || (RECEIPT.status === 'ready' && RECEIPT.revealedCount >= RECEIPT.boxCount) || !DIALOG.hidden;
    BUTTON.disabled = RECEIPT?.status === 'calculating';
    if (!RECEIPT) {
        stopBossRewardCalculation();
        return;
    }
    BUTTON.textContent = RECEIPT.status === 'calculating' ? '보상 계산 중…' : '보상 상자 열기';
    if (
        raidVictory &&
        RECEIPT.status === 'calculating' &&
        (DIALOG.hidden || bossRewardDialogReceiptKey !== RECEIPT.receiptKey)
    ) {
        showBossRewardDialog(RECEIPT);
    }
    // A reward that was already fully opened (every box revealed, e.g. after a reload) is not shown again.
    if (
        RECEIPT.status === 'ready' &&
        RECEIPT.revealedCount < RECEIPT.boxCount &&
        !AUTO_OPENED_BOSS_REWARDS.has(RECEIPT.receiptKey)
    ) {
        showBossRewardDialog(RECEIPT, { auto: true });
    } else if (!DIALOG.hidden && bossRewardDialogReceiptKey === RECEIPT.receiptKey) {
        renderBossRewardBoxes(RECEIPT);
    }
    if (raidVictory && RECEIPT.status === 'calculating') {
        if (!bossRewardCalculationTimer) {
            bossRewardCalculationTimer = setInterval(advanceRaidRewardCalculation, 50);
        }
    } else {
        stopBossRewardCalculation();
    }
}

function closeBossRewardDialog() {
    const WORLD = personalGarden || active?.world,
        RECEIPT = WORLD?.bossRewardReceipts.find((reward) => reward.receiptKey === bossRewardDialogReceiptKey);
    if (RECEIPT?.status !== 'ready' || RECEIPT.revealedCount < RECEIPT.boxCount) {
        return;
    }
    DOLLAR('bossRewardDialog').hidden = true;
    DOLLAR('bossRewardOpen').hidden = true;
    clearInterval(bossRewardRevealTimer);
    bossRewardRevealTimer = null;
    cancelBossRewardCycle();
}

function attachBossRewardHandlers() {
    DOLLAR('bossRewardOpen').addEventListener('click', () => {
        showBossRewardDialog(latestBossReward(personalGarden || active?.world));
    });
    DOLLAR('bossRewardClose').addEventListener('click', closeBossRewardDialog);
    DOLLAR('bossRewardDialog').addEventListener('click', (event) => {
        if (event.target === event.currentTarget) {
            closeBossRewardDialog();
        }
    });
    DOLLAR('bossRewardDialog').addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeBossRewardDialog();
        }
    });
    DOLLAR('bossRewardOpenAll').addEventListener('click', () => {
        const WORLD = personalGarden || active?.world,
            RECEIPT = WORLD?.bossRewardReceipts.find((reward) => reward.receiptKey === bossRewardDialogReceiptKey);
        if (!WORLD || !RECEIPT) {
            return;
        }
        clearInterval(bossRewardRevealTimer);
        bossRewardRevealTimer = null;
        cancelBossRewardCycle();
        openAllBossRewardBoxes(WORLD, RECEIPT.receiptKey);
        renderBossRewardBoxes(RECEIPT);
    });
}
attachBossRewardHandlers();
globalThis.BudmoriPerformanceDiagnostics = {
    summary: () => (active ? PERFORMANCE_DIAGNOSTICS.summary(active.world, active.paused) : []),
    snapshot: () => PERFORMANCE_DIAGNOSTICS.snapshot(30),
};
DOLLAR('diagnosticDetail').onchange = (event) => PERFORMANCE_DIAGNOSTICS.setDetailed(event.target.checked);
DOLLAR('copyDiagnostics').onclick = async () => {
    const RESULT = await globalThis.BloomDiagnostics.copy({ textarea: DOLLAR('settingsDiagnosticText') });
    DOLLAR('settingsDiagnosticText').hidden = RESULT.copied;
    DOLLAR('diagnosticStatus').textContent = RESULT.copied
        ? '진단 요약을 복사했어요. 채팅에 붙여 넣어 주세요.'
        : '아래 진단 요약을 선택해 복사해 주세요.';
};
DOLLAR('exportDiagnostics').onclick = () => {
    const TEXT = DOLLAR('settingsDiagnosticText');
    TEXT.value = globalThis.BloomDiagnostics.detail();
    TEXT.hidden = false;
    TEXT.focus();
    TEXT.select();
    DOLLAR('diagnosticStatus').textContent = '명시적으로 요청한 상세 JSON이에요. 저장 데이터는 포함하지 않아요.';
};
const FAIL = (error) => {
    DOLLAR('error').hidden = false;
    DOLLAR('error').textContent = '농장을 진행하지 못했어요. ' + error.message;
    console.error(error);
    if (active) {
        active.paused = true;
    }
};
const BOSS_PREVIEW_SOURCES = new Map(),
    BOSS_PREVIEW_VERSIONS = new WeakMap();
function bossPreviewSource(asset) {
    if (BOSS_PREVIEW_SOURCES.has(asset)) {
        const CACHED = BOSS_PREVIEW_SOURCES.get(asset);
        BOSS_PREVIEW_SOURCES.delete(asset);
        BOSS_PREVIEW_SOURCES.set(asset, CACHED);
        return CACHED;
    }
    const SOURCE = fetch(new URL(asset, document.baseURI), {
        credentials: 'same-origin',
    }).then((response) => {
        if (!response.ok) {
            throw Error(`Boss preview source failed: ${response.status}`);
        }
        return response.text();
    });
    BOSS_PREVIEW_SOURCES.set(asset, SOURCE);
    if (BOSS_PREVIEW_SOURCES.size > 16) {
        BOSS_PREVIEW_SOURCES.delete(BOSS_PREVIEW_SOURCES.keys().next().value);
    }
    SOURCE.catch(() => {
        if (BOSS_PREVIEW_SOURCES.get(asset) === SOURCE) {
            BOSS_PREVIEW_SOURCES.delete(asset);
        }
    });
    return SOURCE;
}
async function createNeutralBossPreview(species, asset) {
    const COMPILED = globalThis.BudmoriVectorResources?.troops?.[species],
        EXPRESSIONS = COMPILED?.metadata?.expressions,
        NEUTRAL = EXPRESSIONS?.neutral;
    if (!NEUTRAL) {
        throw Error(`Species ${species} is missing the neutral GameKit expression`);
    }
    const DOCUMENT_SVG = new DOMParser().parseFromString(
        await bossPreviewSource(`./assets/troops/${asset}`),
        'image/svg+xml',
    );
    if (DOCUMENT_SVG.getElementsByTagName('parsererror').length || DOCUMENT_SVG.documentElement.localName !== 'svg') {
        throw Error(`Invalid SVG preview source: ${asset}`);
    }
    const SVG = DOCUMENT_SVG.documentElement,
        NODES_BY_ID = new Map([...SVG.querySelectorAll('[id]')].map((node) => [node.getAttribute('id'), node]));
    const EXPRESSION_PARTS = new Set(
            Object.values(EXPRESSIONS).flatMap((variant) => [...variant.show, ...variant.hide]),
        ),
        VISIBLE = new Set(NEUTRAL.show);
    for (const ID of NEUTRAL.hide) {
        VISIBLE.delete(ID);
    }
    for (const ID of EXPRESSION_PARTS) {
        const NODE = NODES_BY_ID.get(ID);
        if (!NODE) {
            throw Error(`SVG preview is missing GameKit expression part: ${ID}`);
        }
        NODE.style.setProperty('display', VISIBLE.has(ID) ? 'inline' : 'none');
    }
    // Source opacity stays paintable for runtime animation; previews use the idle starting pose.
    const IDLE_POSE = COMPILED.metadata.clips.idle.keyframes[0].parts;
    for (const [ID, POSE] of Object.entries(IDLE_POSE)) {
        if (POSE.opacity !== undefined) {
            const NODE = NODES_BY_ID.get(ID);
            if (!NODE) {
                throw Error(`SVG preview is missing idle part: ${ID}`);
            }
            NODE.style.setProperty('opacity', String(POSE.opacity));
        }
    }
    return document.importNode(SVG, true);
}
async function renderNeutralBossPreview(target, species, asset, label = '') {
    const VERSION = (BOSS_PREVIEW_VERSIONS.get(target) || 0) + 1;
    BOSS_PREVIEW_VERSIONS.set(target, VERSION);
    target.setAttribute('aria-busy', 'true');
    try {
        const SVG = await createNeutralBossPreview(species, asset);
        if (BOSS_PREVIEW_VERSIONS.get(target) !== VERSION || !target.isConnected) {
            return;
        }
        SVG.id = target.id;
        SVG.setAttribute('class', target.getAttribute('class') || '');
        SVG.removeAttribute('hidden');
        SVG.setAttribute('aria-busy', 'false');
        if (label) {
            SVG.setAttribute('role', 'img');
            SVG.setAttribute('aria-label', label);
        } else {
            SVG.setAttribute('aria-hidden', 'true');
            SVG.removeAttribute('role');
            SVG.removeAttribute('aria-label');
        }
        target.replaceWith(SVG);
        BOSS_PREVIEW_VERSIONS.set(SVG, VERSION);
    } catch (error) {
        if (BOSS_PREVIEW_VERSIONS.get(target) !== VERSION) {
            return;
        }
        target.hidden = true;
        target.setAttribute('aria-busy', 'false');
        console.error('Unable to render neutral boss preview', error);
    }
}
function writeCheckpoint(world = personalGarden) {
    if (!world) {
        return false;
    }
    const OK = STORAGE.save(world);
    DOLLAR('saveNotice').textContent = OK ? '' : STORAGE.error;
    DOLLAR('treeStorage').hidden = OK;
    return OK;
}
const AUTOSAVE = new FarmAutosave(() => writeCheckpoint());
function saveImmediate(world = personalGarden) {
    const OK = writeCheckpoint(world);
    if (OK) {
        AUTOSAVE.reset();
    }
    return OK;
}
function replacePersonalGarden(world) {
    unsubscribeProgress?.();
    personalGarden = world;
    // The saved garden remains an owner while a separate raid session is active.
    unsubscribeProgress = world?.onProgressChanged.on(() => AUTOSAVE.markDirty()) ?? null;
}
function onWorldStep(world) {
    if (
        world?.scene !== 'raid' ||
        !['victory', 'defeat'].includes(world.encounter?.outcome) ||
        !personalGarden ||
        personalGarden.activeRaidRunSequence === null
    ) {
        return;
    }
    const OWNER_ID = active?.localPlayerId,
        RUN = {
            sessionId: personalGarden.activeRaidSessionId,
            runSequence: personalGarden.activeRaidRunSequence,
        };
    if (!OWNER_ID || !RUN.sessionId || !RUN.runSequence) {
        return;
    }
    const RUN_KEY = `${RUN.sessionId}:${RUN.runSequence}`;
    if (lastAutoSettledRunKey === RUN_KEY) {
        return;
    }
    try {
        persistRaidSettlement(localSettlementRoster(world, OWNER_ID, RUN), OWNER_ID);
        lastAutoSettledRunKey = RUN_KEY;
    } catch (error) {
        FAIL(error);
    }
}
function persist() {
    if (active?.world === personalGarden) {
        active.flushQueuedCommands();
    }
    if (personalGarden?.hasProgressTimers()) {
        AUTOSAVE.markDirty();
    }
    return AUTOSAVE.flush();
}
const FOOD_FEEL = new FoodFeel();
const COMBAT_FEEL = new CombatFeel(FOOD_FEEL);
const WORK_STORAGE_KEYS = {
    work: 'budmori.work.basisPoints',
    resource: 'budmori.work.resourceBasisPoints',
    wood: 'budmori.work.woodBasisPoints',
    build: 'budmori.work.buildBasisPoints',
    explore: 'budmori.work.exploreBasisPoints',
    walkers: 'budmori.neighbourWalkers',
};
// The worker ratio is a play setting, not part of the farm save, so old saves stay valid.
function loadWorkSetting(key, fallback) {
    try {
        const RAW = localStorage.getItem(key),
            VALUE = Number(RAW);
        return RAW !== null && Number.isSafeInteger(VALUE) && VALUE >= 0 && VALUE <= 10000 ? VALUE : fallback;
    } catch {
        return fallback;
    }
}
function loadWalkerSetting(fallback) {
    try {
        const RAW = localStorage.getItem(WORK_STORAGE_KEYS.walkers),
            VALUE = Number(RAW);
        return RAW !== null && Number.isSafeInteger(VALUE) && VALUE >= 0 && VALUE <= 1000 ? VALUE : fallback;
    } catch {
        return fallback;
    }
}
function saveWorkSetting(key, value) {
    try {
        localStorage.setItem(key, String(value));
    } catch {
        /* The ratio still applies for this run. */
    }
}
// The HUD bar is [breed | food | resource | build | explore]; the four cuts are percentages of the whole farm.
function workCuts(world) {
    const WORK = world.workBasisPoints / 100,
        CUT_A = 100 - WORK,
        CUT_D = 100 - (WORK * world.exploreBasisPoints) / 10000,
        CUT_C = CUT_D - (WORK * world.buildBasisPoints) / 10000,
        CUT_B = CUT_C - (WORK * world.resourceBasisPoints) / 10000,
        ROUND = (value) => Math.round(value / 5) * 5;
    return { a: ROUND(CUT_A), b: ROUND(CUT_B), c: ROUND(CUT_C), d: ROUND(CUT_D) };
}
function cutsToBasisPoints(a, b, c, d) {
    const WORK = 100 - a;
    return {
        work: WORK * 100,
        resource: WORK > 0 ? Math.round(((c - b) / WORK) * 10000) : 0,
        build: WORK > 0 ? Math.round(((d - c) / WORK) * 10000) : 0,
        explore: WORK > 0 ? Math.round(((100 - d) / WORK) * 10000) : 0,
    };
}
function install(world) {
    if (active) {
        stopWorldInput();
        cancelFarmSortTransition();
    }
    active?.dispose();
    RENDERER.resetPan();
    active = new FarmSession(world, {
        onError: FAIL,
        onWorldStep,
    });
    world.neighbourWalkers = loadWalkerSetting(world.neighbourWalkers);
    DOLLAR('neighbourWalkers').value = String(world.neighbourWalkers);
    world.setWorkBasisPoints(
        loadWorkSetting(WORK_STORAGE_KEYS.work, world.workBasisPoints),
        loadWorkSetting(WORK_STORAGE_KEYS.resource, world.resourceBasisPoints),
        loadWorkSetting(WORK_STORAGE_KEYS.build, world.buildBasisPoints),
        loadWorkSetting(WORK_STORAGE_KEYS.explore, world.exploreBasisPoints),
    );
    world.setWoodShare(loadWorkSetting(WORK_STORAGE_KEYS.wood, world.woodBasisPoints));
    showWoodShare(world.woodBasisPoints);
    return active;
}
install(new Garden());
active.paused = true;
function raidStartBlockReason() {
    if (!personalGarden) {
        return '내 정원에서만 레이드를 시작할 수 있어요.';
    }
    if (personalGarden.farmBossEvent?.phase !== 'idle') {
        return '농장 이벤트가 끝난 뒤에 시작할 수 있어요.';
    }
    if (personalGarden.activeRaidRunSequence !== null) {
        return '진행 중인 레이드를 먼저 마쳐 주세요.';
    }
    if (!hasRaidRosterEntries(personalGarden.roster.residents())) {
        return '투입할 수 있는 병력이 없어요. 유닛을 먼저 키워 주세요.';
    }
    return '';
}
function mapChallengeBlockReason() {
    if (!personalGarden) {
        return raidStartBlockReason();
    }
    if (bossMapTile < 0 || !canChallenge(personalGarden.worldMap, bossMapTile)) {
        return '도전할 보스를 골라 주세요. 농장 시야 안의 밝은 칸에 있는 보스만 도전할 수 있어요.';
    }
    return raidStartBlockReason();
}
// What the map views draw each frame: the map itself, how far the next tile is, and how many explorers are out.
function worldMapFrame() {
    if (!personalGarden) {
        return null;
    }
    const MAP = personalGarden.worldMap;
    return {
        map: MAP,
        selected: bossMapTile,
        targets: personalGarden.exploreTargets,
        approach: raidApproach,
        explorers: personalGarden.workerKindCounts.explore,
        rate: personalGarden.exploreRate,
    };
}
// Boss sprites for the map: the neutral SVG of each species, turned into an image once and reused.
const MAP_BOSS_SPRITES = new Map();
function mapBossSprite(species) {
    if (MAP_BOSS_SPRITES.has(species)) {
        return MAP_BOSS_SPRITES.get(species);
    }
    MAP_BOSS_SPRITES.set(species, null);
    const ENTRY = speciesById(species);
    if (ENTRY) {
        createNeutralBossPreview(species, ENTRY.asset)
            .then((svg) => {
                const IMAGE = new Image();
                IMAGE.onload = () => MAP_BOSS_SPRITES.set(species, IMAGE);
                IMAGE.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
            })
            .catch((error) => console.error('Unable to load map boss sprite', error));
    }
    return null;
}
function startWorldMapView() {
    worldMapView ??= createWorldMapView(DOLLAR('worldMapCanvas'), {
        interactive: true,
        onSelect: selectWorldMapTile,
        fps: 30,
        bossSprite: mapBossSprite,
    });
    worldMapView.start(worldMapFrame);
}
function stopWorldMapView() {
    worldMapView?.stop();
}
// The small map on the farm screen runs only while it is shown.
function syncMiniMap(visible) {
    const MINI = DOLLAR('miniMap');
    if (MINI.hidden === visible) {
        MINI.hidden = !visible;
    }
    if (visible && !miniMapView) {
        miniMapView = createWorldMapView(DOLLAR('miniMapCanvas'), { fps: 12, bossSprite: mapBossSprite });
        miniMapView.start(worldMapFrame);
    } else if (!visible && miniMapView) {
        miniMapView.stop();
        miniMapView = null;
    }
    if (visible && personalGarden) {
        syncText('miniMapLabel', exploreLine(personalGarden.activePlotId, true));
    }
}
// A short line on screen, for a press that cannot do what it says: a button never just does nothing.
function say(text) {
    const NOTICE = DOLLAR('exploreNotice');
    NOTICE.textContent = text;
    NOTICE.hidden = false;
    clearTimeout(announceExploration.timer);
    announceExploration.timer = setTimeout(() => {
        NOTICE.hidden = true;
    }, 4000);
}
// A tile lifted from the fog is announced where the player is looking, whether the map is open or not.
function announceExploration() {
    const MAP = personalGarden?.worldMap;
    if (!MAP) {
        lastLit = null;
        return;
    }
    if (!lastLit || lastLit.world !== personalGarden) {
        lastLit = { world: personalGarden, set: new Set(MAP.revealed), bosses: new Set(MAP.bosses) };
        return;
    }
    const FOUND = MAP.revealed.filter((index) => !lastLit.set.has(index)).length,
        APPEARED = MAP.bosses.filter((index) => !lastLit.bosses.has(index)).length;
    lastLit.set = new Set(MAP.revealed);
    lastLit.bosses = new Set(MAP.bosses);
    if (APPEARED > 0) {
        say('보스가 나타났어요! 지도에서 확인해 보세요.');
    } else if (FOUND > 0) {
        say(`새 칸 ${FOUND}개를 발견했어요`);
    }
}
// "Exploring 0%" reads like a bug, so say what the explorers are doing: walking there, or lifting fog.
const EXPLORE_PHASE_TEXT = {
    none: '탐사 일꾼 없음',
    idle: '탐사할 칸 없음',
    moving: '이동 중',
    working: '탐사 중',
};
function exploreLine(plotId, short = false) {
    const STATUS = personalGarden.exploreStatus(plotId),
        PERCENT = Math.floor(personalGarden.exploreProgress * 100);
    if (short) {
        return STATUS.phase === 'working' ? `탐사 중 ${PERCENT}%` : EXPLORE_PHASE_TEXT[STATUS.phase];
    }
    return STATUS.phase === 'working'
        ? `탐사 중 ${PERCENT}% · 현장 ${STATUS.onSite}/${STATUS.workers}마리`
        : STATUS.phase === 'moving'
          ? `이동 중 · 일꾼 ${STATUS.workers}마리가 걸어가는 중`
          : EXPLORE_PHASE_TEXT[STATUS.phase];
}
function renderWorldMap() {
    if (!personalGarden) {
        return;
    }
    const MAP = personalGarden.worldMap;
    const GAUGE = exploreLine(personalGarden.activePlotId),
        TILE = bossMapTile;
    let title = '칸을 눌러 보세요',
        info = GAUGE,
        canExplore = false,
        canBuild = false,
        canMine = false;
    if (TILE >= 0) {
        const POSITION = `(${tileX(TILE)}, ${tileY(TILE)})`;
        if (!isRevealed(MAP, TILE)) {
            title = `안개 ${POSITION}`;
            canExplore = canExploreTile(MAP, TILE);
            info = canExplore
                ? `탐사 일꾼이 이 칸부터 안개를 걷게 할 수 있어요. ${GAUGE}`
                : !inReach(MAP, TILE)
                  ? '농장 반경 밖이에요. 망루를 올리거나 새 농장을 지으면 닿아요.'
                  : `밝은 칸과 맞닿은 칸만 고를 수 있어요. ${GAUGE}`;
        } else if (hasBoss(MAP, TILE)) {
            const STAGE = tileDanger(MAP, TILE),
                SPECIES = tileSpecies(MAP, TILE),
                STATS = bossStageStats(STAGE);
            title = `${giantSpeciesName(SPECIES)} · 위험도 ${STAGE}단계 (${TERRAIN_NAMES[tileTerrain(MAP, TILE)]})`;
            info = `체력 ${Math.round(STATS.hp).toLocaleString('ko-KR')} · 공격력 ${Number(STATS.attackPower.toPrecision(3)).toLocaleString('ko-KR')} · 승리 +${STATS.xp.toLocaleString('ko-KR')} XP`;
        } else {
            title = `${TERRAIN_NAMES[tileTerrain(MAP, TILE)]} ${POSITION}`;
            const RESOURCE = tileResource(MAP, TILE),
                NAME = RESOURCE === 'wood' ? '목재' : '돌';
            canMine = canBuildMine(MAP, TILE, personalGarden.activePlotId);
            info = !RESOURCE
                ? '아무것도 없는 칸이에요.'
                : MAP.mines.includes(TILE)
                  ? `채굴장이 있어요. ${NAME}이 줄지 않지만 일꾼이 캐는 속도는 절반이에요.`
                  : `${NAME} ${tileRemaining(MAP, TILE)}개가 남아 있어요. 일꾼이 캐서 농장으로 날라요.`;
        }
    }
    if (TILE >= 0 && isRevealed(MAP, TILE)) {
        const BLOCK = farmBuildBlock(MAP, TILE),
            PLOT = personalGarden.projectInfo('plot'),
            COST = PLOT ? `목재 ${PLOT.cost.wood} · 돌 ${PLOT.cost.stone}` : '',
            BUILDING = !!personalGarden.siteOf('plot') || MAP.buildTile >= 0;
        if (MAP.farms.some((farm) => farm.tile === TILE)) {
            title = `농장 ${tileX(TILE)}, ${tileY(TILE)}`;
            info = '여기서 탐사 반경이 뻗어요. 농장 안에 망루를 지으면 더 멀리 닿아요.';
        } else if (BLOCK === 'boss') {
            info = `${info} 새 농장은 이 칸과 둘레 1칸에 보스가 없어야 지을 수 있어요.`;
        } else if (BLOCK === null) {
            canBuild = !BUILDING && !!PLOT;
            info = `${info} ${BUILDING ? '다른 새 농장을 짓는 중이에요.' : `새 농장을 지을 수 있어요 · ${COST}`}`;
        }
    }
    DOLLAR('worldMapTitle').textContent = title;
    DOLLAR('worldMapInfo').textContent = info;
    DOLLAR('worldMapExplore').hidden = !canExplore;
    const MINE_INFO = personalGarden.projectInfo('mine');
    DOLLAR('worldMapMine').hidden = !canMine || !MINE_INFO;
    DOLLAR('worldMapMine').textContent = MINE_INFO
        ? `채굴장 짓기 · 목재 ${MINE_INFO.cost.wood} · 돌 ${MINE_INFO.cost.stone}`
        : '채굴장 짓기';
    DOLLAR('worldMapMine').disabled =
        !!personalGarden.siteOf('mine') ||
        !MINE_INFO ||
        personalGarden.materials.wood < MINE_INFO.cost.wood ||
        personalGarden.materials.stone < MINE_INFO.cost.stone;
    DOLLAR('worldMapBuild').hidden = !canBuild;
    DOLLAR('worldMapBuild').disabled =
        !canBuild ||
        !personalGarden.projectInfo('plot') ||
        personalGarden.materials.wood < personalGarden.projectInfo('plot').cost.wood ||
        personalGarden.materials.stone < personalGarden.projectInfo('plot').cost.stone;
    DOLLAR('bossEncounterHint').textContent = mapChallengeBlockReason();
    DOLLAR('bossStageCounter').textContent = `보스 ${MAP.bosses.length}마리`;
}
function selectWorldMapTile(index) {
    bossMapTile = bossMapTile === index ? -1 : index;
    renderWorldMap();
}
// The farm is paused behind the map screen, but the explorers keep working so the fog keeps lifting while you look.
let bossMapTicker = 0;
function stopBossMapTicker() {
    clearInterval(bossMapTicker);
    bossMapTicker = 0;
}
function setBossView() {
    stopBossMapTicker();
    stopWorldMapView();
    DOLLAR('bossEncounterScreen').dataset.view = 'map';
    DOLLAR('worldMapView').hidden = false;
    renderWorldMap();
    startWorldMapView();
    bossMapTicker = setInterval(() => {
        personalGarden?.tickExploration(0.25, false);
        renderWorldMap();
    }, 250);
}
function openBossEncounter(push = true) {
    stopWorldInput();
    if (active?.world?.scene === 'raid') {
        say('이미 레이드 중이에요.');
        return false;
    }
    if (!personalGarden) {
        if (STORAGE.world && STORAGE.world.activeRaidRunSequence === null) {
            start(restore(snapshot(STORAGE.world)), false);
        } else {
            say('내 정원으로 돌아간 뒤에 레이드를 열 수 있어요.');
            return false;
        }
    }
    if (personalGarden.farmBossEvent?.phase !== 'idle') {
        say('농장 이벤트가 끝난 뒤에 열 수 있어요.');
        return false;
    }
    if (personalGarden.activeRaidRunSequence !== null) {
        say('진행 중인 레이드를 먼저 마쳐 주세요.');
        return false;
    }
    if (!persist()) {
        say(`저장하지 못해서 레이드를 열지 못했어요: ${STORAGE.error || '저장 오류'}`);
        return false;
    }
    if (menuOpen) {
        closeMenu(false);
    }
    bossPauseBeforeOpen = active?.paused ?? true;
    if (active && !bossPauseBeforeOpen) {
        active.paused = true;
        active.loop.resetTiming();
    }
    bossEncounterOpen = true;
    document.body.dataset.bossScreen = 'true';
    DOLLAR('bossEncounterScreen').hidden = false;
    setBossView();
    if (push) {
        history.pushState(null, '', '#/boss');
    }
    DOLLAR('bossEncounterBack').focus();
    return true;
}
function closeBossEncounter(push = true) {
    if (!bossEncounterOpen) {
        return;
    }
    bossEncounterOpen = false;
    stopBossMapTicker();
    stopWorldMapView();
    document.body.dataset.bossScreen = 'false';
    DOLLAR('bossEncounterScreen').hidden = true;
    for (const ID of ['bossPreview']) {
        const PREVIEW = DOLLAR(ID);
        if (PREVIEW) {
            BOSS_PREVIEW_VERSIONS.set(PREVIEW, (BOSS_PREVIEW_VERSIONS.get(PREVIEW) || 0) + 1);
            PREVIEW.hidden = true;
        }
    }
    if (active && bossPauseBeforeOpen !== null) {
        active.paused = bossPauseBeforeOpen;
        bossPauseBeforeOpen = null;
        active.loop.resetTiming();
    }
    if (push) {
        history.pushState(null, '', '#/farm');
    }
}
function refreshStart() {
    const HAS_RESERVED_RAID = STORAGE.hasReservedRaid,
        LIVE_RAID = active?.world?.scene === 'raid',
        STALE_RAID = HAS_RESERVED_RAID && !LIVE_RAID;
    DOLLAR('continueGame').disabled = !STORAGE.hasWorld || STALE_RAID;
    DOLLAR('startBossEncounter').disabled = !STORAGE.hasWorld || STALE_RAID;
    DOLLAR('staleRaidNotice').hidden = !STALE_RAID;
    DOLLAR('exportSave').disabled = !STORAGE.raw;
    DOLLAR('saveNotice').textContent = STORAGE.error || STORAGE.notice;
}
function setHome(value, push = true) {
    stopWorldInput();
    if (value) {
        persist();
        if (menuOpen) {
            closeMenu(false);
        }
        if (bossEncounterOpen) {
            closeBossEncounter(false);
        }
    }
    home = value;
    document.body.dataset.home = String(value);
    DOLLAR('startScreen').hidden = !value;
    active.paused = value;
    if (push) {
        history.pushState(null, '', value ? '#/' : active.world.scene === 'raid' ? '#/raid' : '#/farm');
    }
    refreshStart();
    if (value) {
        DOLLAR('continueGame').focus();
    }
}
const SEEN_KEY = 'budmori.lastSeen';
function markSeen() {
    try {
        localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {
        /* Without a stored time there is simply no idle progress. */
    }
}
function readSeen() {
    try {
        const VALUE = Number(localStorage.getItem(SEEN_KEY));
        return Number.isFinite(VALUE) && VALUE > 0 ? VALUE : 0;
    } catch {
        return 0;
    }
}
function offlineText(summary) {
    const MINUTES = Math.floor(summary.seconds / 60),
        TIME = MINUTES >= 60 ? `${Math.floor(MINUTES / 60)}시간 ${MINUTES % 60}분` : `${MINUTES}분`,
        PARTS = [];
    if (summary.births) {
        PARTS.push(`새 식구 ${summary.births}마리`);
    }
    if (summary.food) {
        PARTS.push(`먹이 ${summary.food}`);
    }
    if (summary.wood || summary.stone) {
        PARTS.push(`목재 ${summary.wood} · 돌 ${summary.stone}`);
    }
    if (summary.built.length) {
        PARTS.push(`${summary.built.join(', ')} 완성`);
    }
    for (const SITE of summary.sites) {
        PARTS.push(`${SITE.name} ${SITE.percent}%`);
    }
    return `${TIME} 동안 자리를 비웠어요${PARTS.length ? ' · ' + PARTS.join(' · ') : ''}`;
}
// The time spent away is settled by a formula when the farm comes back (see farm-offline.js).
function settleOffline() {
    const SEEN = readSeen();
    markSeen();
    const WORLD = personalGarden;
    if (!SEEN || !WORLD || WORLD.scene !== 'farm') {
        return;
    }
    const SUMMARY = WORLD.settleOffline((Date.now() - SEEN) / 1000);
    if (SUMMARY) {
        const NOTICE = DOLLAR('offlineNotice');
        NOTICE.textContent = offlineText(SUMMARY);
        NOTICE.hidden = false;
        clearTimeout(settleOffline.timer);
        settleOffline.timer = setTimeout(() => {
            NOTICE.hidden = true;
        }, 9000);
    }
}
setInterval(() => {
    if (!document.hidden && !home) {
        markSeen();
    }
}, 5000);
function start(world, push = true, settle = false) {
    AUTOSAVE.reset();
    FOOD_FEEL.unlock();
    replacePersonalGarden(world);
    install(world);
    setHome(false, push);
    if (settle) {
        settleOffline();
    } else {
        markSeen();
    }
}
function reservePersonalRaidRun(sessionId = null) {
    let reserved;
    try {
        reserved = reserveRaidRun(snapshot(personalGarden), {
            sessionId,
        });
    } catch (error) {
        FAIL(error);
        return null;
    }
    const CANDIDATE = restore(reserved.farm);
    if (!saveImmediate(CANDIDATE)) {
        FAIL(Error(STORAGE.error || '농장 레이드 예약을 저장하지 못했어요.'));
        return null;
    }
    replacePersonalGarden(STORAGE.world);
    return reserved;
}
function localSettlementRoster(world, ownerId, run) {
    const CURRENT = world.raidRosters?.find((roster) => roster.ownerId === ownerId);
    if (CURRENT) {
        if (
            CURRENT.settlementRunSequence !== run.runSequence ||
            CURRENT.settlementSessionId !== run.sessionId ||
            CURRENT.settlementEncounterId !== run.runSequence
        ) {
            throw Error('레이드 명단의 정산 예약이 개인 농장 저장과 일치하지 않아요.');
        }
        return world;
    }
    const ENTRIES = raidRosterEntries(personalGarden.roster.residents(), CONFIG.raid.capacity.playerUnits).map(
        ([farmId, species, tier]) => ({
            farmId,
            species,
            tier,
            deployed: false,
        }),
    );
    const VIEW = snapshot(world);
    VIEW.raidExpectedPlayers = [...new Set([...VIEW.raidExpectedPlayers, ownerId])];
    VIEW.raidRosters.push({
        ownerId,
        troops: ENTRIES,
        abilitySnapshot: createAbilityRuntimeSnapshot(personalGarden.playerProgression),
        settlementSessionId: run.sessionId,
        settlementRunSequence: run.runSequence,
        settlementEncounterId: run.runSequence,
        lastDeploySequence: 0,
        buffUntil: 0,
        buffReadyAt: 0,
    });
    return VIEW;
}
function persistRaidSettlement(raidWorld, ownerId) {
    const FARM_RUN = {
        sessionId: personalGarden.activeRaidSessionId,
        runSequence: personalGarden.activeRaidRunSequence,
    };
    if (!FARM_RUN.sessionId || !FARM_RUN.runSequence) {
        return false;
    }
    const OUTCOME = ['victory', 'defeat'].includes(raidWorld.encounter?.outcome)
        ? raidWorld.encounter.outcome
        : 'aborted';
    const PREPARE = (base) =>
        settleRaidOwnerFarm(snapshot(base), {
            ownerId,
            sessionId: FARM_RUN.sessionId,
            encounterId: FARM_RUN.runSequence,
            runSequence: FARM_RUN.runSequence,
            outcome: OUTCOME,
            raidWorld,
            completedAtMs: Date.now(),
            settleVictory: ({ farm, receiptKey, deploymentMultiplier, firstClear }) => {
                const GARDEN = restore(farm),
                    STAGE = raidWorld.boss.stage || 0,
                    STAGE_REWARD = STAGE ? bossStageStats(STAGE) : null,
                    RESOLVED = settleBossKill(GARDEN, {
                        encounterId: FARM_RUN.runSequence,
                        source: 'raid',
                        stage: STAGE,
                        firstClear,
                        receiptKey,
                        acquisitionMultiplier: deploymentMultiplier,
                        rollBudget: STAGE_REWARD?.rollBudget ?? 1,
                        xpAmount: STAGE_REWARD?.xp,
                        species: raidWorld.boss.species ?? 3,
                        tier: 1,
                        x: raidWorld.boss.x,
                        y: raidWorld.boss.y,
                    });
                const REWARD = RESOLVED.receipt;
                return {
                    farm: snapshot(GARDEN),
                    summary: {
                        stage: STAGE,
                        acquisition: {
                            status: REWARD.status,
                            chance: REWARD.chance,
                            rollCount: REWARD.rollCount,
                            rollBudget: REWARD.rollBudget,
                            successCount: REWARD.successCount,
                            grantedCount: REWARD.grantedCount,
                            rolls: REWARD.drops || [],
                            unitId: REWARD.unitId,
                            receiptKey: REWARD.receiptKey,
                        },
                        xp: {
                            status: REWARD.xpStatus,
                            amount: REWARD.xpAmount,
                            levelsGained: REWARD.levelsGained,
                            pointsAwarded: REWARD.pointsAwarded,
                            receiptKey: REWARD.xpReceiptKey,
                        },
                    },
                };
            },
        });
    let settled = PREPARE(personalGarden);
    let candidate = restore(settled.farm);
    if (!saveImmediate(candidate)) {
        if (!STORAGE.refresh()) {
            throw Error(STORAGE.error || '최신 농장 저장을 다시 읽지 못했어요.');
        }
        settled = PREPARE(STORAGE.world);
        candidate = restore(settled.farm);
        if (!saveImmediate(candidate)) {
            throw Error(STORAGE.error || '전투 결과 저장에 실패했어요.');
        }
    }
    replacePersonalGarden(STORAGE.world);
    return settled;
}
function beginRaid(push = true) {
    if (
        raidApproach ||
        !personalGarden ||
        active.world.scene === 'raid' ||
        personalGarden.activeRaidRunSequence !== null ||
        personalGarden.farmBossEvent?.phase !== 'idle' ||
        !raidRosterEntries(personalGarden.roster.residents(), 1).length
    ) {
        return;
    }
    if (!persist()) {
        return;
    }
    // A boss on the world map: its stage and species come from the tile, and it is gone once beaten.
    if (bossMapTile < 0 || !beginChallenge(personalGarden.worldMap, bossMapTile)) {
        return;
    }
    const BOSS_STAGE = selectMapBossStage(personalGarden.farmBossProgress, personalGarden.worldMap, bossMapTile);
    personalGarden.markProgressChanged();
    if (!persist()) {
        personalGarden.worldMap.challengeTile = -1;
        return;
    }
    const RESERVED = reservePersonalRaidRun();
    if (!RESERVED) {
        return;
    }
    // The party walks out to the boss while the camera closes in on it, then the fight starts.
    const FARM_TILE = personalGarden.worldMap.farms.find((farm) => farm.plotId === personalGarden.activePlotId)?.tile,
        BOSS_TILE = bossMapTile;
    raidApproach = {
        from: FARM_TILE ?? personalGarden.worldMap.farms[0]?.tile,
        tile: BOSS_TILE,
        count: Math.min(
            40,
            raidRosterEntries(personalGarden.roster.residents(), CONFIG.raid.capacity.playerUnits).length,
        ),
        start: performance.now(),
        ms: RAID_APPROACH_MS,
    };
    worldMapView?.focus(BOSS_TILE, 80, RAID_APPROACH_MS);
    setTimeout(() => {
        raidApproach = null;
        startRaidBattle(BOSS_STAGE, RESERVED, push);
    }, RAID_APPROACH_MS);
}
function startRaidBattle(bossStage, reserved, push) {
    closeBossEncounter(false);
    const BATTLE = Garden.createRaidBattle(
        (personalGarden.seed + Math.floor(performance.now())) >>> 0,
        ['solo'],
        bossStage,
    );
    install(BATTLE);
    active.queue('register-roster', {
        entries: raidRosterEntries(personalGarden.roster.residents(), CONFIG.raid.capacity.playerUnits),
        abilitySnapshot: createAbilityRuntimeSnapshot(personalGarden.playerProgression),
        deploymentCardSpecies: raidDeploymentCardSpecies(personalGarden.playerProgression.raidDeploymentCards),
        settlement: {
            sessionId: reserved.sessionId,
            runSequence: reserved.runSequence,
            encounterId: reserved.runSequence,
        },
    });
    setHome(false, push);
}
async function returnToFarm(push = true) {
    stopWorldInput();
    if (bossEncounterOpen) {
        closeBossEncounter(false);
    }
    if (!personalGarden) {
        return;
    }
    // Leaving a fight that is still going is a retreat, and counts as a defeat.
    if (active?.world?.scene === 'raid' && active.world.running) {
        active.world.finish('defeat');
    }
    const RAID_WORLD = active?.world?.scene === 'raid' ? snapshot(active.world) : null;
    if (RAID_WORLD && personalGarden.activeRaidRunSequence !== null) {
        const OWNER_ID = active.localPlayerId,
            RUN = {
                sessionId: personalGarden.activeRaidSessionId,
                runSequence: personalGarden.activeRaidRunSequence,
            };
        try {
            persistRaidSettlement(localSettlementRoster(RAID_WORLD, OWNER_ID, RUN), OWNER_ID);
        } catch (error) {
            FAIL(error);
            return false;
        }
    }
    install(personalGarden);
    setHome(false, push);
    return true;
}
DOLLAR('continueGame').onclick = () => {
    if (active?.world?.scene === 'raid') {
        setHome(false);
        return;
    }
    if (STORAGE.world && STORAGE.world.activeRaidRunSequence === null) {
        start(restore(snapshot(STORAGE.world)), true, true);
    }
};
DOLLAR('startBossEncounter').onclick = () => {
    if (!STORAGE.world || STORAGE.world.activeRaidRunSequence !== null) {
        return;
    }
    start(restore(snapshot(STORAGE.world)), false);
    openBossEncounter();
};
DOLLAR('menuBossEncounter').onclick = () => {
    closeMenu(false);
    openBossEncounter();
};
DOLLAR('bossEncounterBack').onclick = () => closeBossEncounter();
DOLLAR('worldMapFit').onclick = () => {
    if (personalGarden) {
        worldMapView?.recenter(personalGarden.worldMap);
    }
};
DOLLAR('miniMap').onclick = () => openBossEncounter();
DOLLAR('worldMapBuild').onclick = () => {
    if (personalGarden && bossMapTile >= 0 && personalGarden.startBuild('plot', { tile: bossMapTile })) {
        saveImmediate(personalGarden);
        renderWorldMap();
    }
};
DOLLAR('worldMapMine').onclick = () => {
    if (personalGarden && bossMapTile >= 0 && personalGarden.startBuild('mine', { tile: bossMapTile })) {
        saveImmediate(personalGarden);
        renderWorldMap();
    }
};
DOLLAR('worldMapExplore').onclick = () => {
    if (personalGarden && bossMapTile >= 0 && setExploreTarget(personalGarden.worldMap, bossMapTile)) {
        personalGarden.markProgressChanged();
        saveImmediate(personalGarden);
        renderWorldMap();
    }
};
DOLLAR('bossEncounterChallenge').onclick = () => {
    // Never a dead button: when the raid cannot start, the reason is said right here.
    const REASON = DOLLAR('bossStageNotice').textContent;
    if (REASON !== '') {
        say(REASON);
        return;
    }
    beginRaid(true);
};
DOLLAR('abortRaidRun').onclick = () => {
    if (active?.world?.scene === 'raid') {
        return;
    }
    const WORLD = STORAGE.world;
    if (!WORLD || WORLD.activeRaidRunSequence === null) {
        return refreshStart();
    }
    try {
        const RESULT = abortReservedRaidRun(snapshot(WORLD), {
            completedAtMs: Date.now(),
        });
        if (!RESULT.applied) {
            return refreshStart();
        }
        if (!saveImmediate(restore(RESULT.farm))) {
            DOLLAR('saveNotice').textContent = STORAGE.error;
            return;
        }
        replacePersonalGarden(STORAGE.world);
        refreshStart();
        DOLLAR('saveNotice').textContent = '이전 레이드를 보상 없이 끝냈어요. 병력과 포인트는 그대로예요.';
    } catch (error) {
        FAIL(error);
    }
};
DOLLAR('newGame').onclick = () => {
    // Overwriting an existing save is a separate, explicit user action.
    if (STORAGE.raw && !DOLLAR('newConfirm').hidden) {
        return;
    }
    if (STORAGE.raw) {
        DOLLAR('newConfirmText').textContent = '현재 농장을 새 농장으로 바꿀까요? 필요한 저장은 먼저 내보내 주세요.';
        DOLLAR('newConfirm').hidden = false;
        return;
    }
    const WORLD = new Garden();
    if (STORAGE.replace(WORLD)) {
        AUTOSAVE.reset();
        start(WORLD);
    } else {
        refreshStart();
    }
};
DOLLAR('confirmNew').onclick = () => {
    const WORLD = new Garden();
    if (STORAGE.replace(WORLD)) {
        AUTOSAVE.reset();
        DOLLAR('newConfirm').hidden = true;
        start(WORLD);
    } else {
        refreshStart();
    }
};
DOLLAR('cancelNew').onclick = () => {
    DOLLAR('newConfirm').hidden = true;
};
DOLLAR('exportSave').onclick = () => {
    const RAW = STORAGE.raw;
    if (!RAW) {
        return;
    }
    const URL_LOCAL = URL.createObjectURL(
            new Blob([RAW], {
                type: 'application/json',
            }),
        ),
        A = document.createElement('a');
    A.href = URL_LOCAL;
    A.download = 'budmori-save-' + new Date().toISOString().slice(0, 10) + '.json';
    A.click();
    setTimeout(() => URL.revokeObjectURL(URL_LOCAL), 1000);
};
DOLLAR('importSave').onclick = () => DOLLAR('saveFile').click();
DOLLAR('saveFile').onchange = async () => {
    const FILE = DOLLAR('saveFile').files[0];
    if (!FILE) {
        return;
    }
    try {
        if (FILE.size > 2 * 1024 * 1024) {
            throw Error('저장 파일이 너무 커요.');
        }
        const TEXT = await FILE.text();
        const { validateSave: VALIDATE_SAVE } = await import('./farm-storage.js');
        VALIDATE_SAVE(TEXT);
        imported = TEXT;
        DOLLAR('importConfirmText').textContent = '현재 형식의 저장 데이터로 진행 상태를 바꿀까요?';
        DOLLAR('confirmImport').textContent = '이 저장 불러오기';
        DOLLAR('importConfirm').hidden = false;
    } catch (e) {
        DOLLAR('saveNotice').textContent = e.message;
    } finally {
        DOLLAR('saveFile').value = '';
    }
};
DOLLAR('cancelImport').onclick = () => {
    imported = null;
    DOLLAR('importConfirm').hidden = true;
};
DOLLAR('confirmImport').onclick = () => {
    try {
        if (imported) {
            const WORLD = STORAGE.import(imported);
            AUTOSAVE.reset();
            replacePersonalGarden(WORLD);
            install(WORLD);
            active.paused = true;
        }
        imported = null;
        DOLLAR('importConfirm').hidden = true;
        refreshStart();
    } catch (e) {
        DOLLAR('saveNotice').textContent = e.message;
    }
};
DOLLAR('farm').onclick = () => returnToFarm();
DOLLAR('raid').onclick = () => openBossEncounter();
DOLLAR('return').onclick = () => returnToFarm();
DOLLAR('merge').onclick = () => active?.queue('merge');
DOLLAR('merge').addEventListener('keydown', (e) => {
    if (e.repeat && ['Enter', ' '].includes(e.key)) {
        e.preventDefault();
    }
});
DOLLAR('pause').onclick = () => {
    menuPauseChanged = true;
    active.paused = !active.paused;
    if (active.paused) {
        persist();
    } else if (menuOpen) {
        closeMenu();
    }
};
function drawTree() {
    const W = personalGarden || active.world,
        IN_COMBAT = active.world.scene === 'raid' || W.running || W.farmBossEvent?.phase !== 'idle';
    DOLLAR('treeNodes').innerHTML = renderFarmUpgradeTreeMarkup(W.playerProgression, {
        location: active.world.scene,
        inCombat: IN_COMBAT,
    });
    renderProgressionResetActions();
}
let plotStatusCache = { at: -Infinity, value: new Map() };
function farmPlotStatuses(world) {
    const NOW = performance.now();
    if (NOW - plotStatusCache.at > 400) {
        plotStatusCache = {
            at: NOW,
            value: new Map([...world.farmPlots.keys()].map((id) => [id, world.farmPlotStatus(id)])),
        };
    }
    return plotStatusCache.value;
}
function farmPlotDisplayName(plotId) {
    return `농장 ${String(plotId).match(/^plot-(\d+)$/)?.[1] || plotId}`;
}
function drawFarmPanel() {
    const W = personalGarden || active?.world;
    if (!W || farmPanelRevision === W.progressRevision) {
        return;
    }
    farmPanelRevision = W.progressRevision;
    const LOCKED =
        !!farmSortTransition || active?.world?.scene !== 'farm' || W.running || W.farmBossEvent?.phase !== 'idle';
    DOLLAR('farmStatPlaced').textContent = String(W.placedPopulation);
    DOLLAR('farmStatCapacity').textContent = `/ ${W.totalFarmCapacity}`;
    DOLLAR('farmStatReserved').textContent = String(W.reservedPopulation);
    DOLLAR('farmStatPending').textContent = String(W.pendingRewardPopulation);
    DOLLAR('farmStatFood').textContent = String(W.warehouseFood);
    syncFlag('farmLockNote', 'hidden', !LOCKED || !!farmSortTransition);
    DOLLAR('farmPlotList').innerHTML = [...W.farmPlots.values()]
        .map((plot) => {
            const COUNT = W.roster.placedPopulation(plot.id),
                STATUS = W.farmPlotStatus(plot.id);
            return `<button type="button" data-farm-plot="${plot.id}" aria-label="${farmPlotDisplayName(plot.id)} · ${COUNT}마리 / ${plot.capacity}마리" aria-pressed="${plot.id === W.activePlotId}"${LOCKED ? ' disabled' : ''}><b>${farmPlotDisplayName(plot.id)}</b><small>${COUNT} / ${plot.capacity}</small><small>먹이 ${STATUS.food} · 배고픔 ${STATUS.hungry}</small></button>`;
        })
        .join('');
    const ACTIVE = W.activeFarmPlot,
        NEXT_CAPACITY = ACTIVE.canExpand() ? [50, 75, 100, 150, 200][ACTIVE.capacityLevel + 1] : ACTIVE.capacity;
    const EXPAND = W.projectInfo('expand'),
        PLOT = W.projectInfo('plot'),
        CAN_PAY = (info) => W.materials.wood >= info.cost.wood && W.materials.stone >= info.cost.stone,
        COST_TEXT = (info) => `목재 ${info.cost.wood} · 돌 ${info.cost.stone}`;
    DOLLAR('farmExpand').innerHTML = EXPAND
        ? `<b>농장 확장</b><small>${ACTIVE.capacity} → ${NEXT_CAPACITY}마리 · ${COST_TEXT(EXPAND)}</small>`
        : '<b>농장 확장</b><small>최대 크기예요</small>';
    DOLLAR('farmExpand').disabled = LOCKED || !EXPAND || !!W.siteOf('expand') || !CAN_PAY(EXPAND);
    DOLLAR('farmUnlock').innerHTML =
        `<b>새 농장 짓기</b><small>지도에서 칸을 골라요 · ${COST_TEXT(PLOT)}${CAN_PAY(PLOT) ? '' : ' · 부족해요'}</small>`;
    DOLLAR('farmUnlock').disabled = LOCKED || !!W.siteOf('plot');
    for (const BUTTON of DOLLAR('farmPlotActions').querySelectorAll('[data-farm-sort]')) {
        BUTTON.disabled = LOCKED;
    }
    const COUNTS = W.roster.countsBySpecies(),
        TOTAL = [...COUNTS.values()].reduce((sum, count) => sum + count, 0);
    DOLLAR('farmRatioList').innerHTML = W.farmTargets
        .map((value, speciesId) => {
            const SPECIES = speciesById(speciesId),
                COUNT = COUNTS.get(speciesId) || 0,
                CURRENT = TOTAL ? ((COUNT / TOTAL) * 100).toFixed(0) : '0';
            return `<label class="farm-ratio"><img src="./assets/troops/${SPECIES.asset}" alt="" width="40" height="40" draggable="false"><span class="farm-ratio__name"><b>${SPECIES.name}</b><small>${COUNT}마리 · 현재 ${CURRENT}%</small></span><output>목표 ${+(value / 100).toFixed(1)}%</output><input type="range" min="0" max="10000" step="50" value="${value}" aria-label="${SPECIES.name} 목표 비율" data-farm-target="${SPECIES.id}"${LOCKED ? ' disabled' : ''}></label>`;
        })
        .join('');
}
function drawAbilityTree() {
    const W = personalGarden || active.world,
        IN_COMBAT = active.world.scene === 'raid' || W.running || W.farmBossEvent?.phase !== 'idle';
    const SELECTED_SPECIES = Number(DOLLAR('abilityPanel').dataset.selectedSpecies || 0);
    DOLLAR('abilityPoints').textContent = String(W.playerProgression.availablePoints);
    for (const BUTTON of DOLLAR('abilitySpeciesTabs').querySelectorAll('[data-ability-species]')) {
        BUTTON.setAttribute('aria-pressed', String(Number(BUTTON.dataset.abilitySpecies) === SELECTED_SPECIES));
    }
    DOLLAR('abilityNodes').innerHTML = renderAbilityTreeMarkup(W.playerProgression, {
        highestSpeciesTier: W.highestSpeciesTiers(),
        location: active.world.scene,
        inCombat: IN_COMBAT,
        selectedSpecies: SELECTED_SPECIES,
    });
    renderProgressionResetActions();
}
function currentProgressionResetScope() {
    if (menuTab === 'growth') {
        return { type: 'farm' };
    }
    if (menuTab === 'abilities') {
        return { type: 'abilities', speciesId: Number(DOLLAR('abilityPanel').dataset.selectedSpecies || 0) };
    }
    if (menuTab === 'formation') {
        return { type: 'formation' };
    }
    if (menuTab === 'deployment') {
        return { type: 'deployment-cards' };
    }
    return null;
}
function renderProgressionResetActions() {
    const HOST = DOLLAR('progressionResetActions'),
        CURRENT = DOLLAR('progressionResetCurrent'),
        ALL = DOLLAR('progressionResetAll');
    if (!active || !menuOpen || !['growth', 'abilities', 'formation', 'deployment'].includes(menuTab)) {
        HOST.hidden = true;
        return;
    }
    const W = personalGarden || active.world,
        IN_COMBAT = active.world.scene === 'raid' || W.running || W.farmBossEvent?.phase !== 'idle',
        CONTEXT = { location: active.world.scene, inCombat: IN_COMBAT },
        SCOPE = currentProgressionResetScope(),
        CURRENT_CHECK = canResetPlayerProgression(W.playerProgression, SCOPE, CONTEXT),
        ALL_CHECK = canResetPlayerProgression(W.playerProgression, { type: 'all' }, CONTEXT),
        LABEL =
            menuTab === 'growth'
                ? '성장 항목 초기화'
                : menuTab === 'formation'
                  ? '형성 능력 초기화'
                  : menuTab === 'deployment'
                    ? '병력 편성 초기화'
                    : '이 종 특성 초기화';
    HOST.hidden = false;
    CURRENT.hidden = menuTab === 'abilities';
    CURRENT.disabled = !CURRENT_CHECK.allowed;
    CURRENT.textContent = `${LABEL} · ${CURRENT_CHECK.refunded}P`;
    ALL.disabled = !ALL_CHECK.allowed;
    ALL.textContent = `전체 초기화 · ${ALL_CHECK.refunded}P`;
}
const MENU_ROUTES = {
    play: '#/menu',
    farms: '#/farms',
    growth: '#/growth',
    abilities: '#/abilities',
    help: '#/help',
    formation: '#/formation',
    deployment: '#/deployment',
};
const ROUTE_MENU_TAB = (route) => Object.keys(MENU_ROUTES).find((tab) => MENU_ROUTES[tab] === route) || 'play';
function applyMenuTab(tab) {
    menuTab = tab;
    const UPGRADES = ['farms', 'growth', 'abilities', 'formation', 'deployment'].includes(tab);
    DOLLAR('gameMenuTabs').hidden = !UPGRADES;
    DOLLAR('gameMenuTitle').textContent = UPGRADES ? '업그레이드' : tab === 'help' ? '도움말' : '설정';
    DOLLAR('gameMenuClose').setAttribute('aria-label', `${DOLLAR('gameMenuTitle').textContent} 닫기`);
    for (const [ID, SELECTED] of [
        ['gameMenu', tab === 'play'],
        ['upgradeMenu', UPGRADES],
        ['helpMenu', tab === 'help'],
    ]) {
        DOLLAR(ID).setAttribute('aria-expanded', String(menuOpen && SELECTED));
    }
    for (const BUTTON of DOLLAR('gameMenuTabs').querySelectorAll('[data-menu-tab]')) {
        const SELECTED = BUTTON.dataset.menuTab === tab;
        BUTTON.setAttribute('aria-selected', String(SELECTED));
        BUTTON.tabIndex = SELECTED ? 0 : -1;
    }
    for (const [NAME, ID] of [
        ['play', 'menuPlayPanel'],
        ['farms', 'farmPanel'],
        ['growth', 'treePanel'],
        ['abilities', 'abilityPanel'],
        ['help', 'helpPanel'],
        ['formation', 'formationPanel'],
        ['deployment', 'deploymentCardPanel'],
    ]) {
        DOLLAR(ID).hidden = NAME !== tab;
    }
    if (tab === 'farms') {
        farmPanelRevision = -1;
        drawFarmPanel();
    } else if (tab === 'growth') {
        drawTree();
    } else if (tab === 'abilities') {
        drawAbilityTree();
    }
    renderProgressionResetActions();
}
function syncMenuPause(tab) {
    if (tab === 'play') {
        if (menuAutoPaused && !menuPauseChanged) {
            active.paused = menuWasPaused;
        }
        menuAutoPaused = false;
        return;
    }
    if (!menuAutoPaused) {
        menuWasPaused = active.paused;
    }
    menuAutoPaused = true;
    if (!active.paused) {
        active.paused = true;
        persist();
    }
}
function openMenu(tab = 'play', push = true) {
    stopWorldInput();
    if (!menuOpen) {
        menuWasPaused = active.paused;
        menuPauseChanged = false;
        menuAutoPaused = false;
        menuOpen = true;
        DOLLAR('gameMenuOverlay').hidden = false;
        DOLLAR('gameMenu').setAttribute('aria-expanded', 'true');
    }
    syncMenuPause(tab);
    applyMenuTab(tab);
    if (push) {
        history.pushState(null, '', MENU_ROUTES[tab] || MENU_ROUTES.play);
    }
    (DOLLAR('gameMenuTabs').querySelector(`[data-menu-tab="${tab}"]`) || DOLLAR('gameMenuClose')).focus();
}
function switchMenuTab(tab, push = true) {
    if (!Object.hasOwn(MENU_ROUTES, tab)) {
        return;
    }
    if (!menuOpen) {
        openMenu(tab, push);
        return;
    }
    if (menuTab === tab) {
        return;
    }
    syncMenuPause(tab);
    applyMenuTab(tab);
    if (push) {
        history.pushState(null, '', MENU_ROUTES[tab]);
    }
}
function closeMenu(push = true) {
    if (!menuOpen) {
        return;
    }
    menuOpen = false;
    DOLLAR('gameMenuOverlay').hidden = true;
    for (const ID of ['gameMenu', 'upgradeMenu', 'helpMenu']) {
        DOLLAR(ID).setAttribute('aria-expanded', 'false');
    }
    if (menuAutoPaused && !menuPauseChanged) {
        active.paused = menuWasPaused;
    }
    menuPauseChanged = false;
    menuAutoPaused = false;
    if (push) {
        history.pushState(null, '', active.world.scene === 'raid' ? '#/raid' : '#/farm');
    }
    DOLLAR(
        ['farms', 'growth', 'abilities', 'formation', 'deployment'].includes(menuTab)
            ? 'upgradeMenu'
            : menuTab === 'help'
              ? 'helpMenu'
              : 'gameMenu',
    ).focus();
}
DOLLAR('gameMenu').onclick = () => (menuOpen && menuTab === 'play' ? closeMenu() : openMenu());
DOLLAR('upgradeMenu').onclick = () =>
    openMenu(active.world.scene === 'raid' || personalGarden?.farmBossEvent?.phase !== 'idle' ? 'formation' : 'growth');
DOLLAR('helpMenu').onclick = () => openMenu('help');
DOLLAR('gameMenuClose').onclick = () => closeMenu();
DOLLAR('menuHome').onclick = () => {
    closeMenu(false);
    setHome(true);
};
DOLLAR('gameMenuTabs').onclick = (e) => {
    const BUTTON = e.target.closest('[data-menu-tab]');
    if (BUTTON && !BUTTON.disabled) {
        switchMenuTab(BUTTON.dataset.menuTab);
    }
};
DOLLAR('farmPlotList').onclick = (e) => {
    const BUTTON = e.target.closest('[data-farm-plot]');
    if (BUTTON && !BUTTON.disabled) {
        active.queue('farm-plot-switch', { plotId: BUTTON.dataset.farmPlot });
    }
};
function switchAdjacentFarmPlot(step) {
    const WORLD = personalGarden || active.world,
        IDS = [...WORLD.farmPlots.keys()],
        INDEX = IDS.indexOf(WORLD.activePlotId);
    if (IDS.length > 1 && INDEX >= 0) {
        active.queue('farm-plot-switch', { plotId: IDS[(INDEX + step + IDS.length) % IDS.length] });
    }
}
DOLLAR('plotPrev').onclick = () => switchAdjacentFarmPlot(-1);
DOLLAR('plotNext').onclick = () => switchAdjacentFarmPlot(1);
DOLLAR('farmExpand').onclick = () => {
    active.queue('farm-build', { facilityId: 'expand' });
};
DOLLAR('neighbourWalkers').onchange = (e) => {
    const VALUE = Math.round(Number(e.target.value));
    if (personalGarden && Number.isSafeInteger(VALUE) && VALUE >= 0 && VALUE <= 1000) {
        personalGarden.neighbourWalkers = VALUE;
        saveWorkSetting(WORK_STORAGE_KEYS.walkers, VALUE);
    }
    e.target.value = String(personalGarden?.neighbourWalkers ?? VALUE);
};
DOLLAR('farmUnlock').onclick = () => {
    openBossEncounter();
    setBossView(true);
};
DOLLAR('farmPlotActions').addEventListener('click', (e) => {
    const BUTTON = e.target.closest('[data-farm-sort]');
    if (BUTTON) {
        beginFarmSortTransition(BUTTON.dataset.farmSort);
    }
});
function applyWorkCuts(a, b, c, d) {
    const [CUT_A, CUT_B, CUT_C, CUT_D] = [a, b, c, d].sort((x, y) => x - y),
        POINTS = cutsToBasisPoints(CUT_A, CUT_B, CUT_C, CUT_D);
    DOLLAR('workCutA').value = String(CUT_A);
    DOLLAR('workCutB').value = String(CUT_B);
    DOLLAR('workCutC').value = String(CUT_C);
    DOLLAR('workCutD').value = String(CUT_D);
    saveWorkSetting(WORK_STORAGE_KEYS.work, POINTS.work);
    saveWorkSetting(WORK_STORAGE_KEYS.resource, POINTS.resource);
    saveWorkSetting(WORK_STORAGE_KEYS.build, POINTS.build);
    saveWorkSetting(WORK_STORAGE_KEYS.explore, POINTS.explore);
    (personalGarden || active.world).setWorkBasisPoints(POINTS.work, POINTS.resource, POINTS.build, POINTS.explore);
    active.queue('farm-work', {
        basisPoints: POINTS.work,
        resourceBasisPoints: POINTS.resource,
        buildBasisPoints: POINTS.build,
        exploreBasisPoints: POINTS.explore,
    });
}
function showWoodShare(points) {
    const PERCENT = Math.round(points / 100);
    DOLLAR('woodShare').value = String(PERCENT);
    DOLLAR('woodShareLabel').textContent = `자원 중 목재 ${PERCENT}% · 돌 ${100 - PERCENT}%`;
}
DOLLAR('woodShare').addEventListener('input', () => {
    const POINTS = Number(DOLLAR('woodShare').value) * 100;
    saveWorkSetting(WORK_STORAGE_KEYS.wood, POINTS);
    showWoodShare(POINTS);
    (personalGarden || active.world).setWoodShare(POINTS);
});
const WORK_CUT_IDS = ['workCutA', 'workCutB', 'workCutC', 'workCutD'];
for (const ID of WORK_CUT_IDS) {
    DOLLAR(ID).addEventListener('input', () => {
        applyWorkCuts(...WORK_CUT_IDS.map((id) => Number(DOLLAR(id).value)));
    });
}
DOLLAR('workHudToggle').addEventListener('click', () => {
    const OPEN = DOLLAR('workHud').dataset.open !== 'true';
    DOLLAR('workHud').dataset.open = String(OPEN);
    DOLLAR('workHudToggle').setAttribute('aria-expanded', String(OPEN));
});
DOLLAR('workHud').addEventListener('click', (e) => {
    const BUTTON = e.target.closest('[data-work-preset]');
    if (BUTTON && !BUTTON.disabled) {
        applyWorkCuts(...BUTTON.dataset.workPreset.split(',').map(Number));
    }
});
function syncText2(element, text) {
    if (element.textContent !== text) {
        element.textContent = text;
    }
}
function facilityLabel(id) {
    const SPEC = CONFIG.farm.work.facilities[id];
    return `<span><b data-name>${SPEC.name}</b><br /><small>${SPEC.effect}</small></span><small data-cost></small>`;
}
for (const ID of Object.keys(CONFIG.farm.work.facilities)) {
    const BUTTON = document.createElement('button');
    BUTTON.type = 'button';
    BUTTON.dataset.facility = ID;
    BUTTON.innerHTML = facilityLabel(ID);
    DOLLAR('facilityList').append(BUTTON);
}
DOLLAR('facilityList').addEventListener('click', (e) => {
    const BUTTON = e.target.closest('[data-facility]');
    if (BUTTON && !BUTTON.disabled) {
        active.queue('farm-build', { facilityId: BUTTON.dataset.facility });
    }
});
DOLLAR('buildRush').addEventListener('click', () => {
    active.queue('farm-rush', { on: DOLLAR('buildRush').getAttribute('aria-pressed') !== 'true' });
});
DOLLAR('farmRatioList').addEventListener('input', (e) => {
    const INPUT = e.target.closest('[data-farm-target]');
    if (INPUT) {
        INPUT.parentElement.querySelector('output').textContent = `목표 ${+(Number(INPUT.value) / 100).toFixed(1)}%`;
    }
});
DOLLAR('farmRatioList').addEventListener('change', (e) => {
    const INPUT = e.target.closest('[data-farm-target]');
    if (INPUT) {
        active.queue('farm-target', {
            speciesId: Number(INPUT.dataset.farmTarget),
            basisPoints: Number(INPUT.value),
        });
    }
});
DOLLAR('progressionResetActions').onclick = (event) => {
    const BUTTON = event.target.closest('button[data-progression-reset]');
    if (!BUTTON || BUTTON.disabled) {
        return;
    }
    const SCOPE = BUTTON.dataset.progressionReset === 'all' ? { type: 'all' } : currentProgressionResetScope();
    if (SCOPE) {
        active.queue('progression-reset', { scope: SCOPE });
        setTimeout(() => {
            drawTree();
            drawAbilityTree();
            renderProgressionResetActions();
        }, 180);
    }
};
DOLLAR('gameMenuTabs').onkeydown = (e) => {
    const BUTTONS = [...DOLLAR('gameMenuTabs').querySelectorAll('[role="tab"]:not(:disabled)')],
        INDEX = BUTTONS.indexOf(document.activeElement);
    let next;
    if (e.key === 'ArrowRight') {
        next = (INDEX + 1) % BUTTONS.length;
    } else if (e.key === 'ArrowLeft') {
        next = (INDEX - 1 + BUTTONS.length) % BUTTONS.length;
    } else if (e.key === 'Home') {
        next = 0;
    } else if (e.key === 'End') {
        next = BUTTONS.length - 1;
    } else {
        return;
    }
    e.preventDefault();
    BUTTONS[next]?.focus();
    if (BUTTONS[next]) {
        switchMenuTab(BUTTONS[next].dataset.menuTab);
    }
};
const GAME_MENU_OVERLAY = DOLLAR('gameMenuOverlay'),
    CLOSE_MENU_FROM_BACKDROP = (e) => {
        if (e.target === GAME_MENU_OVERLAY) {
            closeMenu();
        }
    };
GAME_MENU_OVERLAY.addEventListener('click', CLOSE_MENU_FROM_BACKDROP);
DOLLAR('treeNodes').onclick = (e) => {
    const B = e.target.closest('[data-progression-farm-node]');
    if (B) {
        active.queue('progression-invest', {
            scope: 'farm',
            nodeId: B.dataset.progressionFarmNode,
        });
        setTimeout(drawTree, 180);
    }
};
DOLLAR('abilitySpeciesTabs').onclick = (e) => {
    const BUTTON = e.target.closest('[data-ability-species]');
    if (!BUTTON) {
        return;
    }
    DOLLAR('abilityPanel').dataset.selectedSpecies = BUTTON.dataset.abilitySpecies;
    drawAbilityTree();
};
DOLLAR('abilityNodes').onclick = (e) => {
    const BUTTON = e.target.closest('button[data-ability-action],button[data-ability-node]');
    if (!BUTTON || BUTTON.getAttribute('aria-disabled') === 'true') {
        return;
    }
    if (BUTTON.dataset.abilityAction === 'reset') {
        active.queue('progression-reset', {
            scope: {
                type: 'abilities',
                speciesId: Number(DOLLAR('abilityPanel').dataset.selectedSpecies || 0),
            },
        });
    } else if (BUTTON.dataset.abilityNode) {
        const [ABILITY_ID, KIND, LEVEL] = BUTTON.dataset.abilityNode.split(':');
        const NODE_ID = KIND === 'root' ? 'root' : `${KIND}-${LEVEL}`;
        active.queue('progression-invest', {
            scope: 'ability',
            abilityId: ABILITY_ID,
            nodeId: NODE_ID,
        });
    }
    setTimeout(() => {
        drawAbilityTree();
        renderProgressionResetActions();
    }, 180);
};
function focusableMenuButtons() {
    return [...DOLLAR('gameMenuPanel').querySelectorAll('button:not(:disabled):not([aria-disabled="true"])')].filter(
        (button) => button.getClientRects().length > 0,
    );
}
DOLLAR('gameMenuPanel').onkeydown = (e) => {
    if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        return;
    }
    if (e.key !== 'Tab') {
        return;
    }
    const BUTTONS = focusableMenuButtons();
    if (!BUTTONS.length) {
        return;
    }
    const FIRST = BUTTONS[0],
        LAST = BUTTONS.at(-1);
    if (e.shiftKey && document.activeElement === FIRST) {
        e.preventDefault();
        LAST.focus();
    } else if (!e.shiftKey && document.activeElement === LAST) {
        e.preventDefault();
        FIRST.focus();
    }
};
const CANVAS = DOLLAR('world');
// Compare with the actual DOM so event handlers and route changes remain authoritative.
function syncText(id, value) {
    const NODE = DOLLAR(id),
        TEXT = String(value);
    if (NODE.textContent !== TEXT) {
        NODE.textContent = TEXT;
    }
}
function syncFlag(id, key, value) {
    const NODE = DOLLAR(id),
        FLAG = !!value;
    if (NODE[key] !== FLAG) {
        NODE[key] = FLAG;
    }
}
function syncAttribute(id, key, value) {
    const NODE = DOLLAR(id),
        TEXT = String(value);
    if (NODE.getAttribute(key) !== TEXT) {
        NODE.setAttribute(key, TEXT);
    }
}
const HUD_WIDTHS = new Map();
function syncWidth(id, value) {
    const NODE = DOLLAR(id);
    let previous = HUD_WIDTHS.get(id);
    if (previous?.value === value && previous.applied === NODE.style.width) {
        return;
    }
    if (NODE.style.width !== value) {
        NODE.style.width = value;
    }
    if (!previous) {
        previous = {};
        HUD_WIDTHS.set(id, previous);
    }
    previous.value = value;
    previous.applied = NODE.style.width;
}
function syncData(id, key, value) {
    const NODE = DOLLAR(id),
        TEXT = String(value);
    if (NODE.dataset[key] !== TEXT) {
        NODE.dataset[key] = TEXT;
    }
}
function deploymentHud() {
    const W = active.world,
        ROSTER = W.raidRoster(active.localPlayerId),
        REMAINING = ROSTER ? W.raidRemaining(active.localPlayerId) : personalGarden?.units.length || 0,
        QUEUED = ROSTER ? Math.max(0, active.localDeploySequence - ROSTER.lastDeploySequence) : 0;
    syncText(
        'raidRemaining',
        !ROSTER
            ? '출전 병력을 준비하고 있어요…'
            : `남은 병력 ${Math.max(0, REMAINING - QUEUED)} · 약한 병력부터 · 맵 가장자리 전방위 투입`,
    );
    let deployed = 0;
    if (ROSTER) {
        for (const TROOP of ROSTER.troops) {
            if (TROOP.deployed) {
                deployed++;
            }
        }
    }
    const STAGE = W.boss.stage || 0;
    if (STAGE) {
        const MULTIPLIER = raidDeploymentRewardMultiplier({
            availableAtStart: ROSTER?.troops.length || 0,
            originalUnitsDeployed: deployed,
        });
        syncText(
            'raidRewardChance',
            `${speciesRewardName(W.boss.species)} · ${bossRewardRollDescription(STAGE, { acquisitionMultiplier: MULTIPLIER, firstClear: STAGE > (personalGarden?.farmBossProgress?.highestClearedRaidStage ?? 0) })}`,
        );
    } else {
        syncText('raidRewardChance', '');
    }
}
function canUseWorldInput() {
    return !home && !menuOpen && !bossEncounterOpen && !active.paused && !farmSortTransition;
}
function cancelFarmSortTransition() {
    if (!farmSortTransition) {
        return false;
    }
    clearTimeout(farmSortTransition.commitTimer);
    clearTimeout(farmSortTransition.finishTimer);
    farmSortTransition = null;
    CANVAS.style.transition = '';
    CANVAS.style.opacity = '';
    CANVAS.style.transform = '';
    farmPanelRevision = -1;
    if (menuOpen && menuTab === 'farms' && personalGarden) {
        drawFarmPanel();
    }
    return true;
}
function beginFarmSortTransition(order) {
    if (
        farmSortTransition ||
        active.world.scene !== 'farm' ||
        active.world.running ||
        active.world.farmBossEvent?.phase !== 'idle'
    ) {
        return false;
    }
    [...document.querySelectorAll('#farmPlotActions button, #farmPlotList button, #farmRatioList input')].forEach(
        (button) => (button.disabled = true),
    );
    farmSortTransition = { commitTimer: null, finishTimer: null };
    CANVAS.style.transition = 'opacity 250ms ease, transform 250ms ease';
    CANVAS.style.opacity = '0';
    CANVAS.style.transform = 'scale(0.96)';
    farmSortTransition.commitTimer = setTimeout(() => {
        if (!farmSortTransition || active.world.scene !== 'farm') {
            cancelFarmSortTransition();
            return;
        }
        if (!active.queue('farm-sort', { order })) {
            cancelFarmSortTransition();
            return;
        }
        CANVAS.style.opacity = '1';
        CANVAS.style.transform = 'scale(1)';
        farmSortTransition.finishTimer = setTimeout(cancelFarmSortTransition, 250);
    }, 250);
    return true;
}
function stopPan(e) {
    if (e && panPointer && e.pointerId !== panPointer.id) {
        return;
    }
    const ID = panPointer?.id;
    panPointer = null;
    if (ID !== undefined && CANVAS.hasPointerCapture?.(ID)) {
        CANVAS.releasePointerCapture(ID);
    }
}
function stopFoodHold(e) {
    if (e && foodHold && e.pointerId !== foodHold.pointerId) {
        return;
    }
    if (foodHold) {
        clearTimeout(foodHold.initialTimer);
        clearInterval(foodHold.repeatTimer);
        foodHold = null;
    }
}
function stopWorldInput(e) {
    if (e) {
        PINCH_POINTERS.delete(e.pointerId);
    } else {
        PINCH_POINTERS.clear();
    }
    pinchDistance = 0;
    stopFoodHold(e);
    RAID_DEPLOYMENT_UI.stopHold(e);
    stopPan(e);
}
const PINCH_POINTERS = new Map();
let pinchDistance = 0;
function pinchSpan() {
    const [A, B] = [...PINCH_POINTERS.values()];
    return { distance: Math.hypot(A.x - B.x, A.y - B.y), x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
}
CANVAS.addEventListener(
    'wheel',
    (e) => {
        if (!canUseWorldInput() || active?.world.scene !== 'farm') {
            return;
        }
        const LINE = e.deltaMode === 1 ? 16 : 1;
        RENDERER.zoomAt(Math.exp(-e.deltaY * LINE * 0.0016), e.clientX, e.clientY);
        e.preventDefault();
    },
    { passive: false },
);
for (const [ID, ACT] of [
    ['zoomIn', () => RENDERER.zoomAt(1.4)],
    ['zoomOut', () => RENDERER.zoomAt(1 / 1.4)],
    ['zoomFit', () => RENDERER.fitAll()],
]) {
    DOLLAR(ID).onclick = ACT;
}
CANVAS.addEventListener('pointerdown', (e) => {
    FOOD_FEEL.unlock();
    if (e.pointerType === 'touch' && canUseWorldInput() && active?.world.scene === 'farm') {
        PINCH_POINTERS.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (PINCH_POINTERS.size === 2) {
            stopFoodHold();
            if (panPointer) {
                panPointer.mode = 'pinch';
            }
            pinchDistance = pinchSpan().distance;
            CANVAS.setPointerCapture?.(e.pointerId);
            e.preventDefault();
            return;
        }
    }
    if (e.button !== 0 || !canUseWorldInput() || panPointer || RAID_DEPLOYMENT_UI.hold) {
        return;
    }
    const POINT = RENDERER.screenToWorld(e.clientX, e.clientY);
    panPointer = {
        id: e.pointerId,
        // Food only goes on this farm's own ground; the land around it can be looked at and dragged.
        mode: active.world.scene === 'farm' && ArenaGeometry.inside(POINT, 'farm') ? 'pending' : 'pan',
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
    };
    if (panPointer.mode === 'pending') {
        foodHold = {
            pointerId: e.pointerId,
            point: { x: POINT.x, y: POINT.y },
            initialTimer: setTimeout(() => {
                if (foodHold?.pointerId !== e.pointerId || panPointer?.mode !== 'pending') {
                    return;
                }
                panPointer.mode = 'feed';
                active.queue('scatter-food', foodHold.point);
                foodHold.repeatTimer = setInterval(() => {
                    if (foodHold?.pointerId === e.pointerId && canUseWorldInput() && panPointer?.mode === 'feed') {
                        active.queue('scatter-food', foodHold.point);
                    }
                }, 100);
            }, 100),
            repeatTimer: null,
        };
    }
    CANVAS.setPointerCapture?.(e.pointerId);
    e.preventDefault();
});
CANVAS.addEventListener('pointermove', (e) => {
    if (PINCH_POINTERS.has(e.pointerId)) {
        PINCH_POINTERS.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (PINCH_POINTERS.size === 2 && pinchDistance > 0) {
            const SPAN = pinchSpan();
            RENDERER.zoomAt(SPAN.distance / pinchDistance, SPAN.x, SPAN.y);
            pinchDistance = SPAN.distance;
            e.preventDefault();
            return;
        }
    }
    if (!panPointer || e.pointerId !== panPointer.id) {
        return;
    }
    if (!canUseWorldInput()) {
        stopWorldInput(e);
        return;
    }
    const DISTANCE = Math.hypot(e.clientX - panPointer.startX, e.clientY - panPointer.startY);
    if (panPointer.mode === 'pending' && DISTANCE >= 8) {
        stopFoodHold(e);
        panPointer.mode = 'pan';
    } else if (panPointer.mode === 'feed' && DISTANCE >= 8) {
        stopFoodHold(e);
        panPointer.mode = 'pan';
    }
    if (panPointer.mode === 'pan') {
        RENDERER.panByScreen(e.clientX - panPointer.x, e.clientY - panPointer.y);
        panPointer.x = e.clientX;
        panPointer.y = e.clientY;
    }
    e.preventDefault();
});
CANVAS.addEventListener('lostpointercapture', stopWorldInput);
window.addEventListener('pointerup', stopWorldInput, true);
window.addEventListener('pointercancel', stopWorldInput, true);
window.addEventListener('blur', () => {
    stopWorldInput();
    persist();
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopWorldInput();
        persist();
        active.loop.resetTiming();
        if (!home) {
            markSeen();
        }
    } else if (!home) {
        settleOffline();
    }
});
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bossEncounterOpen) {
        e.preventDefault();
        closeBossEncounter();
    } else if (e.key === 'Escape' && menuOpen) {
        e.preventDefault();
        closeMenu();
    }
});
window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
        location.reload();
    }
});
window.addEventListener('resize', () => {
    stopWorldInput();
    RENDERER.resize();
});
window.addEventListener('pagehide', () => {
    stopWorldInput();
    persist();
    if (!home) {
        markSeen();
    }
    active.dispose();
    unsubscribeProgress?.();
    unsubscribeProgress = null;
    RENDERER.dispose();
});
CANVAS.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stopWorldInput();
    persist();
    FAIL(Error('그래픽 연결이 끊겼어요. 새로고침해 다시 이어가 주세요.'));
});
function route() {
    stopWorldInput();
    const R = location.hash;
    if (R === '#/' || !R) {
        if (menuOpen) {
            closeMenu(false);
        }
        setHome(true, false);
        return;
    }
    if (STORAGE.hasReservedRaid && active.world.scene !== 'raid') {
        if (menuOpen) {
            closeMenu(false);
        }
        setHome(true, false);
        history.replaceState(null, '', '#/');
        return;
    }
    if (home) {
        if (STORAGE.error && !STORAGE.hasWorld) {
            setHome(true, false);
            history.replaceState(null, '', '#/');
            return;
        }
        if (STORAGE.hasWorld) {
            start(restore(snapshot(STORAGE.world)), false);
        } else {
            start(new Garden(), false);
        }
    }
    if (R === '#/boss') {
        if (!openBossEncounter(false)) {
            history.replaceState(null, '', '#/farm');
        }
        return;
    }
    if (
        R === '#/help' ||
        R === '#/farms' ||
        R === '#/growth' ||
        R === '#/abilities' ||
        R === '#/formation' ||
        R === '#/menu'
    ) {
        const RAID = active.world.scene === 'raid',
            FARM_EVENT_ACTIVE = !RAID && personalGarden?.farmBossEvent?.phase !== 'idle';
        const RESTRICTED =
            ((R === '#/farms' || R === '#/growth') && (RAID || FARM_EVENT_ACTIVE)) ||
            (R === '#/abilities' && (RAID || !personalGarden));
        if (RESTRICTED) {
            closeMenu(false);
            history.replaceState(null, '', RAID ? '#/raid' : '#/farm');
            return;
        }
        openMenu(ROUTE_MENU_TAB(R), false);
        return;
    }
    if (menuOpen) {
        closeMenu(false);
    }
    if (bossEncounterOpen && R !== '#/boss') {
        closeBossEncounter(false);
    }
    if (R === '#/raid') {
        if (personalGarden?.farmBossEvent?.phase !== 'idle') {
            history.replaceState(null, '', '#/farm');
        } else {
            openBossEncounter(false);
        }
    } else if (R === '#/farm' && active.world.scene === 'raid') {
        returnToFarm(false);
    }
}
window.addEventListener('popstate', route);
function sync(display, now, notices) {
    const W = active.world,
        RAID = display.scene === 'raid',
        FARM_EVENT = display.farmBossEvent,
        FARM_EVENT_ACTIVE = !RAID && FARM_EVENT?.phase !== 'idle',
        BATTLE_HUD = RAID || FARM_EVENT_ACTIVE,
        BATTLE_OUTCOME = RAID ? W.encounter.outcome : FARM_EVENT?.outcome,
        HAS_READY_TROOPS = personalGarden ? hasRaidRosterEntries(personalGarden.roster.residents()) : false,
        REWARD_WORLD = personalGarden || W,
        SETTLED_RUN_SEQUENCE = RAID ? (personalGarden?.activeRaidRunSequence ?? W.boss.encounterId) : null,
        SETTLED_REWARD = RAID
            ? personalGarden?.raidSettlementReceipts?.find((receipt) => receipt.runSequence === SETTLED_RUN_SEQUENCE)
                  ?.reward
            : null,
        SETTLED_REWARD_RECEIPT = SETTLED_REWARD?.acquisition?.receiptKey
            ? REWARD_WORLD.bossRewardReceipts.find(
                  (reward) => reward.receiptKey === SETTLED_REWARD.acquisition.receiptKey,
              )
            : null,
        PENDING_REWARD = REWARD_WORLD.bossRewardReceipts.find(
            (reward) => ['calculating', 'ready'].includes(reward.status) || reward.queuedCount > 0,
        ),
        MERGE_STATUS = mergeAvailability(W, now);
    syncBossRewardDialog(REWARD_WORLD, {
        receiptKey: BATTLE_OUTCOME === 'victory' ? SETTLED_REWARD_RECEIPT?.receiptKey || null : null,
        raidVictory: RAID && BATTLE_OUTCOME === 'victory',
    });
    if ((home || menuOpen || bossEncounterOpen || active.paused) && (RAID_DEPLOYMENT_UI.hold || panPointer)) {
        stopWorldInput();
    }
    syncAttribute('farm', 'aria-pressed', !RAID && !bossEncounterOpen);
    syncAttribute('raid', 'aria-pressed', RAID || bossEncounterOpen);
    syncFlag('merge', 'disabled', home || RAID || FARM_EVENT_ACTIVE || bossEncounterOpen || !MERGE_STATUS.available);
    syncData('merge', 'availability', MERGE_STATUS.code || 'unavailable');
    syncFlag('mergeNotice', 'hidden', home || RAID || FARM_EVENT_ACTIVE || bossEncounterOpen);
    const PLOT_WORLD = personalGarden || W,
        PLOT_IDS = PLOT_WORLD.farmPlots ? [...PLOT_WORLD.farmPlots.keys()] : [];
    syncFlag('plotBar', 'hidden', home || RAID || FARM_EVENT_ACTIVE || bossEncounterOpen || PLOT_IDS.length < 2);
    if (PLOT_IDS.length > 1) {
        const STATUSES = farmPlotStatuses(PLOT_WORLD),
            CURRENT = STATUSES.get(PLOT_WORLD.activePlotId) ?? { food: 0, hungry: 0 },
            NEEDS_VISIT = [...STATUSES].some(
                ([id, status]) => id !== PLOT_WORLD.activePlotId && status.food === 0 && status.hungry > 0,
            );
        syncText('plotBarName', farmPlotDisplayName(PLOT_WORLD.activePlotId));
        syncText(
            'plotBarCount',
            `${PLOT_WORLD.roster.placedPopulation(PLOT_WORLD.activePlotId)} / ${PLOT_WORLD.activeFarmPlot.capacity}`,
        );
        syncText('plotBarFood', `먹이 ${CURRENT.food} · 배고픔 ${CURRENT.hungry}`);
        syncFlag('plotPrev', 'disabled', !!farmSortTransition || W.running);
        syncFlag('plotNext', 'disabled', !!farmSortTransition || W.running);
        syncData('plotPrev', 'alert', String(NEEDS_VISIT));
        syncData('plotNext', 'alert', String(NEEDS_VISIT));
    }
    syncAttribute('merge', 'aria-label', `합성${MERGE_STATUS.available ? '' : ' 불가'} · ${MERGE_STATUS.reason}`);
    syncText('mergeNotice', MERGE_STATUS.reason);
    let displayedCount = 0;
    let worldCount = 0;
    let armyCurrent = 0;
    let armyMax = 0;
    let armyLiving = 0;
    let armyTotal = 0;
    for (const UNIT of display.units) {
        if (!UNIT.isBattleOnlySummon) {
            displayedCount++;
        }
        if (UNIT.faction === CONFIG.factions.PLAYER) {
            armyCurrent += Math.max(0, Math.min(UNIT.maxHp, UNIT.hp));
            armyMax += UNIT.maxHp;
            armyLiving += UNIT.hp > 0 ? 1 : 0;
            armyTotal++;
        }
    }
    if (!RAID) {
        for (const UNIT of W.units) {
            if (!UNIT.isBattleOnlySummon) {
                worldCount++;
            }
        }
    }
    syncFlag('bossEncounterScreen', 'hidden', home || !bossEncounterOpen);
    syncMiniMap(!home && !RAID && !FARM_EVENT_ACTIVE && !bossEncounterOpen && !!personalGarden);
    announceExploration();
    syncFlag('farmControls', 'hidden', RAID || FARM_EVENT_ACTIVE || home || bossEncounterOpen);
    syncFlag('zoomBar', 'hidden', RAID || FARM_EVENT_ACTIVE || home || bossEncounterOpen);
    syncFlag('zoomFit', 'hidden', PLOT_IDS.length < 2);
    syncFlag('workHud', 'hidden', RAID || FARM_EVENT_ACTIVE || home || bossEncounterOpen);
    syncFlag('raidControls', 'hidden', !RAID || home);
    syncFlag('bossbar', 'hidden', !BATTLE_HUD || home);
    syncText(
        'count',
        RAID
            ? (W.raidRoster(active.localPlayerId)?.troops.length ?? personalGarden?.units.length ?? 0)
            : displayedCount,
    );
    syncText('capacity', personalGarden?.capacity ?? CONFIG.farm.capacity.base);
    syncText(
        'starter',
        RAID
            ? `${W.units.length}마리 출전 중`
            : PENDING_REWARD
              ? `${speciesRewardName(PENDING_REWARD.species)} 보상 대기 · 공간이 생기면 합류해요`
              : !HAS_READY_TROOPS
                ? '모두 잠자는 중 · 회복을 기다려요'
                : worldCount >= W.capacity
                  ? '농장이 가득 찼어요'
                  : '번식으로 식구를 늘려요',
    );
    syncWidth('allyHealth', (armyMax ? (armyCurrent / armyMax) * 100 : 0) + '%');
    syncText(
        'allyHealthText',
        Math.ceil(armyCurrent) + ' / ' + Math.ceil(armyMax) + ' 체력 · ' + armyLiving + '/' + armyTotal + ' 생존',
    );
    const BOSS = display.boss,
        FARM_REWARD =
            !RAID && FARM_EVENT?.outcome === 'victory'
                ? W.bossRewardReceipts.find(
                      (reward) => reward.source === 'farm' && reward.encounterId === FARM_EVENT.encounterId,
                  )
                : null,
        STAGE_NAME = RAID && BOSS.stage ? `${BOSS.stage}단계` : '',
        REWARD_NAME = speciesRewardName(BOSS.species),
        ENCOUNTER_NAME = giantSpeciesName(BOSS.species);
    syncText('bossName', !RAID && BOSS.stage ? `${ENCOUNTER_NAME} · 레이드 ${BOSS.stage}단계` : ENCOUNTER_NAME);
    syncAttribute('bossHealth', 'aria-label', `${ENCOUNTER_NAME} 체력`);
    syncText('bossHealthText', Math.ceil(BOSS.hp) + ' / ' + BOSS.maxHp + ' HP');
    syncText(
        'bossHealthNote',
        RAID && W.running
            ? `남은 시간 ${Math.max(0, Math.ceil(W.raidTimeLimit() - W.encounter.elapsed))}초`
            : FARM_EVENT_ACTIVE
              ? '상대 능력치 고정'
              : '쓰러진 병력 포함 최대 체력',
    );
    syncAttribute('allyHealth', 'aria-valuenow', armyCurrent);
    syncAttribute('allyHealth', 'aria-valuemax', armyMax);
    syncAttribute('bossHealth', 'aria-valuenow', BOSS.hp);
    syncAttribute('bossHealth', 'aria-valuemax', BOSS.maxHp);
    syncWidth('bossHealth', BOSS.maxHp ? (BOSS.hp / BOSS.maxHp) * 100 + '%' : '0%');
    syncText(
        'battleOutcome',
        RAID
            ? BATTLE_OUTCOME === 'victory'
                ? `${STAGE_NAME} · ${ENCOUNTER_NAME} 승리 · +${SETTLED_REWARD?.xp?.amount ?? bossStageStats(BOSS.stage || 1).xp} XP · ${SETTLED_REWARD ? rewardReceiptSummary(SETTLED_REWARD_RECEIPT || SETTLED_REWARD.acquisition) : '농장으로 돌아가면 보상을 받아요'}`
                : BATTLE_OUTCOME === 'defeat'
                  ? `${STAGE_NAME} · ${ENCOUNTER_NAME} 패배${W.encounter.elapsed >= W.raidTimeLimit() ? '(시간 초과)' : ''} · 농장에서 다시 준비해요`
                  : ''
            : BATTLE_OUTCOME === 'victory'
              ? FARM_EVENT.rewardStatus === 'granted'
                  ? `${ENCOUNTER_NAME} 격파 · ${REWARD_NAME} ${rewardReceiptSummary(FARM_REWARD)} · 농장에 합류했어요`
                  : FARM_EVENT.rewardStatus === 'pending'
                    ? `${ENCOUNTER_NAME} 격파 · ${REWARD_NAME} ${rewardReceiptSummary(FARM_REWARD)} · 공간이 생기면 합류해요`
                    : `${ENCOUNTER_NAME} 격파`
              : BATTLE_OUTCOME === 'defeat'
                ? `${ENCOUNTER_NAME} 레이드 종료 · 병력이 회복하는 동안 잠자요`
                : '',
    );
    syncFlag(
        'battleOutcome',
        'hidden',
        home || !BATTLE_HUD || BATTLE_OUTCOME === 'fighting' || BATTLE_OUTCOME === 'idle',
    );
    {
        const REASON = mapChallengeBlockReason();
        syncAttribute('bossEncounterChallenge', 'aria-disabled', String(REASON !== ''));
        syncText('bossStageNotice', REASON);
    }
    syncFlag('menuTabFarms', 'disabled', RAID || FARM_EVENT_ACTIVE || bossEncounterOpen);
    syncFlag('menuTabGrowth', 'disabled', RAID || FARM_EVENT_ACTIVE || bossEncounterOpen);
    syncFlag('menuTabAbilities', 'disabled', RAID || !personalGarden);
    syncText('return', RAID && W.running ? '후퇴' : '농장으로 돌아가기');
    syncText('pause', active.paused ? '▶' : 'Ⅱ');
    syncAttribute('pause', 'aria-label', active.paused ? '계속하기' : '일시정지');
    syncAttribute('pause', 'title', active.paused ? '계속하기' : '일시정지');
    syncText('warehouseStock', String(W.warehouseFood));
    const WORK_WORLD = personalGarden || W;
    const KINDS = WORK_WORLD.workerKindCounts,
        WORKERS = WORK_WORLD.workerCount,
        BREEDERS = Math.max(0, WORK_WORLD.units.length - WORKERS),
        CUTS = workCuts(WORK_WORLD),
        SITES = WORK_WORLD.buildSites;
    let note = `일꾼 ${WORKERS}마리 · 먹이 ${WORK_WORLD.workFoodPerMinute.toFixed(1)}/분 · 자원 ${WORK_WORLD.workResourcePerMinute.toFixed(1)}/분`,
        warn = false;
    if (WORKERS === 0) {
        note = '일꾼이 없어서 먹이와 자원이 안 만들어져요';
        warn = true;
    } else if (WORK_WORLD.warehouseFull && KINDS.resource === 0) {
        note = '농장에 먹이가 가득해요 · 일꾼이 쉬어요';
        warn = true;
    }
    if (SITES.length > 0 && WORKERS > 0) {
        note = `${SITES.map((site) => `${WORK_WORLD.siteName(site)} ${Math.floor((site.done / site.need) * 100)}%`).join(' · ')} 짓는 중${WORK_WORLD.buildRush ? ' · 전원 건설' : ''}`;
    }
    for (const ID of WORK_CUT_IDS) {
        DOLLAR(ID).disabled = !!farmSortTransition;
    }
    if (!WORK_CUT_IDS.some((id) => document.activeElement === DOLLAR(id))) {
        DOLLAR('workCutA').value = String(CUTS.a);
        DOLLAR('workCutB').value = String(CUTS.b);
        DOLLAR('workCutC').value = String(CUTS.c);
        DOLLAR('workCutD').value = String(CUTS.d);
    }
    DOLLAR('buildRush').hidden = SITES.length === 0;
    DOLLAR('buildRush').setAttribute('aria-pressed', String(WORK_WORLD.buildRush));
    syncText('buildRush', WORK_WORLD.buildRush ? '전원 건설 중 (끄기)' : '전원 건설');
    for (const BUTTON of DOLLAR('facilityList').children) {
        const ID = BUTTON.dataset.facility,
            SPEC = CONFIG.farm.work.facilities[ID],
            LEVEL = WORK_WORLD.facilityLevel(ID),
            MAXED = LEVEL >= (SPEC.maxLevel ?? CONFIG.farm.work.facilityMaxLevel),
            INFO = WORK_WORLD.projectInfo(ID),
            COST = INFO?.cost || { wood: 0, stone: 0 };
        BUTTON.disabled =
            MAXED ||
            !!WORK_WORLD.siteOf(ID) ||
            WORK_WORLD.materials.wood < COST.wood ||
            WORK_WORLD.materials.stone < COST.stone;
        syncText2(BUTTON.querySelector('[data-name]'), LEVEL ? `${SPEC.name} Lv.${LEVEL}` : SPEC.name);
        syncText2(
            BUTTON.querySelector('[data-cost]'),
            MAXED
                ? '최대 레벨'
                : WORK_WORLD.siteOf(ID)
                  ? '짓는 중'
                  : `${LEVEL ? `Lv.${LEVEL + 1} · ` : ''}목재 ${COST.wood}${COST.stone ? ` · 돌 ${COST.stone}` : ''}`,
        );
    }
    syncText('workHudNote', note);
    syncText('workHudBreed', `번식 ${BREEDERS}`);
    syncText('workHudFood', `먹이 ${KINDS.food}`);
    syncText('workHudRes', `자원 ${KINDS.resource}`);
    syncText('workHudBuild', `건설 ${KINDS.build}`);
    syncText('workHudExplore', `탐사 ${KINDS.explore}`);
    syncText('materialWood', String(W.materials.wood));
    syncText('materialStone', String(W.materials.stone));
    syncData('workHud', 'warn', warn);
    DOLLAR('workHudBreed').style.flex = `${Math.max(1, CUTS.a)} 1 0`;
    DOLLAR('workHudFood').style.flex = `${Math.max(1, CUTS.b - CUTS.a)} 1 0`;
    DOLLAR('workHudRes').style.flex = `${Math.max(1, CUTS.c - CUTS.b)} 1 0`;
    DOLLAR('workHudBuild').style.flex = `${Math.max(1, CUTS.d - CUTS.c)} 1 0`;
    DOLLAR('workHudExplore').style.flex = `${Math.max(1, 100 - CUTS.d)} 1 0`;
    for (const BUTTON of DOLLAR('workHud').querySelectorAll('[data-work-preset]')) {
        BUTTON.setAttribute(
            'aria-pressed',
            String(BUTTON.dataset.workPreset === `${CUTS.a},${CUTS.b},${CUTS.c},${CUTS.d}`),
        );
        BUTTON.disabled = !!farmSortTransition;
    }
    syncText('warehouseProgressLabel', `타작 ${W.foodTaps.remainder}/5`);
    syncAttribute('warehouseProgress', 'aria-valuenow', String(W.foodTaps.remainder));
    syncAttribute('warehouseProgress', 'aria-valuetext', `타작 ${W.foodTaps.remainder}/5`);
    if (menuOpen && menuTab === 'farms') {
        drawFarmPanel();
    }
    syncData('warehouseProgress', 'produced', now < FOOD_FEEL.completeUntil);
    for (let i = 0; i < 5; i++) {
        const PIP = FOOD_FEEL.pips[i],
            FILLED = now < FOOD_FEEL.completeUntil || i < W.foodTaps.remainder;
        if (PIP.classList.contains('filled') !== FILLED) {
            PIP.classList.toggle('filled', FILLED);
        }
    }
    for (const E of notices) {
        if (E.kind === 'food-tap') {
            FOOD_FEEL.tap(E.source, E.completed, E.remainder);
        } else if (E.kind === 'manual-feed') {
            FOOD_FEEL.manualScatter();
        } else {
            FOOD_FEEL.event(E.kind);
        }
    }
    FOOD_FEEL.frame(now);
    deploymentHud();
}
function frame(now) {
    try {
        PERFORMANCE_DIAGNOSTICS.beginFrame(now);
        active.profiler = PERFORMANCE_DIAGNOSTICS;
        active.world.profiler = PERFORMANCE_DIAGNOSTICS;
        const SIMULATION_START = PERFORMANCE_DIAGNOSTICS.start();
        if (!home && !document.hidden) {
            active.pulse(now);
        }
        PERFORMANCE_DIAGNOSTICS.end('simulation', SIMULATION_START);
        const PRESENTATION_START = PERFORMANCE_DIAGNOSTICS.start();
        const DISPLAY = active.presentation(now),
            NOTICES = active.takePresentationNotices();
        COMBAT_FEEL.observe(active.world, DISPLAY.displayTimeMs, DISPLAY.presentationRevision, NOTICES);
        PERFORMANCE_DIAGNOSTICS.end('presentation', PRESENTATION_START);
        const RENDER_START = PERFORMANCE_DIAGNOSTICS.start();
        RENDERER.backdrop = active.world.scene === 'farm' ? active.world : null;
        if (RENDERER.backdrop && panPointer?.mode === 'pan') {
            const NEXT_PLOT = RENDERER.cameraPlot(active.world);
            if (NEXT_PLOT) {
                RENDERER.cameraSwitch = NEXT_PLOT;
                active.queue('farm-plot-switch', { plotId: NEXT_PLOT });
            }
        }
        RENDERER.render(DISPLAY, COMBAT_FEEL, DISPLAY.displayTimeMs);
        PERFORMANCE_DIAGNOSTICS.end('render', RENDER_START);
        const UI_START = PERFORMANCE_DIAGNOSTICS.start();
        sync(DISPLAY, now, NOTICES);
        FORMATION_UI.update(
            active.world,
            DISPLAY,
            !home && (active.world.scene === 'raid' || active.world.farmBossEvent?.phase !== 'idle'),
            active.localPlayerId,
        );
        RAID_DEPLOYMENT_UI.update(
            active.world,
            personalGarden || active.world,
            !home,
            active.localPlayerId,
            active.world.scene === 'farm' && !active.world.running && active.world.farmBossEvent?.phase === 'idle',
        );
        PERFORMANCE_DIAGNOSTICS.end('ui', UI_START);
        PERFORMANCE_DIAGNOSTICS.endFrame(RENDERER);
        requestAnimationFrame(frame);
    } catch (error) {
        if (typeof globalThis.BloomReportRuntimeFatal === 'function') {
            globalThis.BloomReportRuntimeFatal(error);
        } else {
            console.error('Farm render loop stopped', error);
        }
    }
}
DOLLAR('productVersion').textContent = PRODUCT_VERSION;
DOLLAR('startVersion').textContent = PRODUCT_VERSION;
setHome(true, false);
if (location.hash && location.hash !== '#/') {
    route();
}
requestAnimationFrame(frame);
// Read-only diagnostics for support and browser scenarios. Commands use the product session.
globalThis.BUDMORI = {
    get sim() {
        return active.world;
    },
    get runtime() {
        return active;
    },
    get renderMetrics() {
        return frameRate();
    },
    get presentationDiagnostics() {
        return active.latestPresentationDiagnostics;
    },
    renderer: RENDERER,
    storage: STORAGE,
    foodFeel: FOOD_FEEL,
    combatFeel: COMBAT_FEEL,
    CONFIG,
    ATTACK_TYPES,
    Ballistics,
    ArenaGeometry,
    version: PRODUCT_VERSION,
};
