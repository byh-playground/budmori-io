import { PerformanceDiagnostics } from './performance-diagnostics.js';
import { RelicDock, RELIC_ICONS } from './relic-dock.js';
import { FORMATION_SKILL_DEFINITIONS, formationUpgradeValue } from './formation-skill-state.js';
import { Garden, CONFIG, ArenaGeometry, ATTACK_TYPES, Ballistics } from './farm-model.js';
import { Diorama } from './farm-renderer.js';
import { FarmSession } from './farm-session.js';
import { FarmStorage } from './farm-storage.js';
import { FarmAutosave } from './farm-autosave.js';
import { snapshot, restore } from './farm-state.js';
import { PRODUCT_VERSION } from './version.js';
import { FoodFeel } from './food-feel.js';
import { CombatFeel } from './combat-feel.js';
import { renderAbilityTreeMarkup, renderAbilitySpeciesTabsMarkup } from './ability-tree.js';
import { canResetPlayerProgression } from './ability-progression.js';
import { advanceBossRewardReveal, openAllBossRewardBoxes } from './boss-rewards.js';
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
let deploySpecies = -1;
let handKey = '';
let farmSortTransition = null;
let farmPanelRevision = -1;
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
const RELIC_DOCK = new RelicDock();
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
const BOSS_REWARD_CHEST_TIERS = ['wood', 'iron', 'gold', 'magic', 'jade'];

function bossRewardChestTier(receipt) {
    if (!receipt.stage) {
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
        NOMINAL_CHANCE = receipt.baselineChance ?? 0.1,
        CUMULATIVE = BOXES.slice(0, REVEALED).reduce((sum, box) => sum + (box.hit ? box.payout : 0), 0),
        PROCESSED = receipt.calculation?.jobState?.processedTrials ?? 0;
    DOLLAR('bossRewardStage').textContent = receipt.stage ? `보스 격파 · ${receipt.stage}층` : '보스 격파';
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
function syncBossRewardDialog(world, { receiptKey = null } = {}) {
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
    stopBossRewardCalculation();
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
    return OK;
}
const AUTOSAVE = new FarmAutosave(() => writeCheckpoint());
function replacePersonalGarden(world) {
    unsubscribeProgress?.();
    personalGarden = world;
    // The saved garden remains an owner while a separate raid session is active.
    unsubscribeProgress = world?.onProgressChanged.on(() => AUTOSAVE.markDirty()) ?? null;
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
const WORK_STORAGE_KEY = 'budmori.work.basisPoints';
// The worker ratio is a play setting, not part of the farm save.
function loadWorkSetting(fallback) {
    try {
        const RAW = localStorage.getItem(WORK_STORAGE_KEY),
            VALUE = Number(RAW);
        return RAW !== null && Number.isSafeInteger(VALUE) && VALUE >= 0 && VALUE <= 10000 ? VALUE : fallback;
    } catch {
        return fallback;
    }
}
function saveWorkSetting(value) {
    try {
        localStorage.setItem(WORK_STORAGE_KEY, String(value));
    } catch {
        /* The ratio still applies for this run. */
    }
}
// The farm bar is [breed | food] with one cut: the share of the farm that breeds.
function workCut(world) {
    return Math.round((100 - world.workBasisPoints / 100) / 5) * 5;
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
    });
    world.setWorkBasisPoints(loadWorkSetting(world.workBasisPoints));
    return active;
}
install(new Garden());
active.paused = true;
function raidStartBlockReason() {
    if (!personalGarden) {
        return '내 정원에서만 보스에 도전할 수 있어요.';
    }
    if (personalGarden.farmBossEvent?.phase !== 'idle') {
        return '이미 전투 중이에요.';
    }
    if (!personalGarden.units.some((unit) => !unit.isBattleOnlySummon && unit.hp > 0)) {
        return '싸울 유닛이 없어요. 유닛을 먼저 키워 주세요.';
    }
    return '';
}
// A line on screen, for a press that cannot do what it says: a button never just does nothing.
function say(text) {
    const NOTICE = DOLLAR('farmNotice');
    NOTICE.textContent = text;
    NOTICE.hidden = false;
    clearTimeout(say.timer);
    say.timer = setTimeout(() => {
        NOTICE.hidden = true;
    }, 4000);
}
function refreshStart() {
    DOLLAR('continueGame').disabled = !STORAGE.hasWorld;
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
    }
    home = value;
    document.body.dataset.home = String(value);
    DOLLAR('startScreen').hidden = !value;
    active.paused = value;
    if (push) {
        history.pushState(null, '', value ? '#/' : '#/farm');
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
// The climb starts at floor 1: a boss drops in and the hand waits for the player to deploy it.
function beginChallenge() {
    const REASON = raidStartBlockReason();
    if (REASON !== '') {
        say(REASON);
        return;
    }
    if (personalGarden.startTower(startFloorValue(personalGarden))) {
        active.paused = false;
        active.loop.resetTiming();
    }
}
DOLLAR('continueGame').onclick = () => {
    if (STORAGE.world) {
        start(restore(snapshot(STORAGE.world)), true, true);
    }
};
DOLLAR('fightRetreat').onclick = () => {
    personalGarden?.retreatFromFight();
};
DOLLAR('bossChallenge').onclick = beginChallenge;
// The climb starts at the best floor by default; the slider can start lower, never higher.
let startFloorChoice = 0;
function startFloorValue(garden) {
    const BEST = Math.max(1, garden.playerProgression.towerBest);
    return startFloorChoice >= 1 && startFloorChoice <= BEST ? startFloorChoice : BEST;
}
DOLLAR('startFloor').oninput = (e) => {
    startFloorChoice = Number(e.target.value);
    paintRange(e.target);
};
DOLLAR('doorCards').addEventListener('click', (e) => {
    const BUTTON = e.target.closest('[data-door]');
    if (BUTTON) {
        personalGarden?.chooseDoor(Number(BUTTON.dataset.door));
    }
});
DOLLAR('towerLeave').onclick = () => {
    personalGarden?.leaveTower();
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
DOLLAR('merge').onclick = () => active?.queue('merge');
DOLLAR('merge').addEventListener('keydown', (e) => {
    if (e.repeat && ['Enter', ' '].includes(e.key)) {
        e.preventDefault();
    }
});
function drawFarmPanel() {
    const W = personalGarden || active?.world;
    if (!W || farmPanelRevision === W.progressRevision) {
        return;
    }
    farmPanelRevision = W.progressRevision;
    const LOCKED = !!farmSortTransition || active?.world?.scene !== 'farm' || W.farmBossEvent?.phase !== 'idle';
    DOLLAR('farmStatPlaced').textContent = String(W.ownedPopulation);
    DOLLAR('farmStatCapacity').textContent = `/ ${W.capacity}`;
    DOLLAR('farmStatPending').textContent = String(W.pendingRewardPopulation);
    syncFlag('farmLockNote', 'hidden', !LOCKED || !!farmSortTransition);
    for (const BUTTON of DOLLAR('farmPlotActions').querySelectorAll('[data-farm-sort]')) {
        BUTTON.disabled = LOCKED;
    }
}
function drawAbilityTree() {
    const W = personalGarden || active.world,
        IN_COMBAT = W.farmBossEvent?.phase !== 'idle';
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
    if (menuTab === 'abilities') {
        return { type: 'abilities', speciesId: Number(DOLLAR('abilityPanel').dataset.selectedSpecies || 0) };
    }
    return null;
}
function renderProgressionResetActions() {
    const HOST = DOLLAR('progressionResetActions'),
        CURRENT = DOLLAR('progressionResetCurrent'),
        ALL = DOLLAR('progressionResetAll');
    if (!active || !menuOpen || menuTab !== 'abilities') {
        HOST.hidden = true;
        return;
    }
    const W = personalGarden || active.world,
        IN_COMBAT = W.farmBossEvent?.phase !== 'idle',
        CONTEXT = { location: active.world.scene, inCombat: IN_COMBAT },
        SCOPE = currentProgressionResetScope(),
        CURRENT_CHECK = canResetPlayerProgression(W.playerProgression, SCOPE, CONTEXT),
        ALL_CHECK = canResetPlayerProgression(W.playerProgression, { type: 'all' }, CONTEXT),
        LABEL = '이 종 특성 초기화';
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
    abilities: '#/abilities',
    help: '#/help',
};
const ROUTE_MENU_TAB = (route) => Object.keys(MENU_ROUTES).find((tab) => MENU_ROUTES[tab] === route) || 'play';
function applyMenuTab(tab) {
    menuTab = tab;
    const UPGRADES = ['farms', 'abilities'].includes(tab);
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
        ['abilities', 'abilityPanel'],
        ['help', 'helpPanel'],
    ]) {
        DOLLAR(ID).hidden = NAME !== tab;
    }
    if (tab === 'farms') {
        farmPanelRevision = -1;
        drawFarmPanel();
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
        history.pushState(null, '', '#/farm');
    }
    DOLLAR(
        ['farms', 'abilities'].includes(menuTab) ? 'upgradeMenu' : menuTab === 'help' ? 'helpMenu' : 'gameMenu',
    ).focus();
}
DOLLAR('gameMenu').onclick = () => (menuOpen && menuTab === 'play' ? closeMenu() : openMenu());
DOLLAR('upgradeMenu').onclick = () => openMenu('abilities');
DOLLAR('helpMenu').onclick = () => openMenu('help');
DOLLAR('gameMenuClose').onclick = () => closeMenu();
DOLLAR('gameMenuTabs').onclick = (e) => {
    const BUTTON = e.target.closest('[data-menu-tab]');
    if (BUTTON && !BUTTON.disabled) {
        switchMenuTab(BUTTON.dataset.menuTab);
    }
};
DOLLAR('farmPlotActions').addEventListener('click', (e) => {
    const BUTTON = e.target.closest('[data-farm-sort]');
    if (BUTTON) {
        beginFarmSortTransition(BUTTON.dataset.farmSort);
    }
});
// The track colour split follows the slider value.
function paintRange(node) {
    const RANGE = Number(node.max) - Number(node.min) || 1;
    node.style.setProperty('--fill', `${((Number(node.value) - Number(node.min)) / RANGE) * 100}%`);
}
DOLLAR('workCutA').addEventListener('input', () => {
    paintRange(DOLLAR('workCutA'));
    const CUT = Number(DOLLAR('workCutA').value),
        POINTS = (100 - CUT) * 100;
    saveWorkSetting(POINTS);
    (personalGarden || active.world).setWorkBasisPoints(POINTS);
    active.queue('farm-work', { basisPoints: POINTS });
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
const FLOOR_KIND = { battle: '전투', elite: '정예', mid: '중간 보스', rest: '쉼터', relic: '유물' };
const DOOR_TEXT = {
    battle: '보스 한 마리',
    elite: '더 세지만 보상 ×2',
    mid: '피할 수 없어요 · 보상 ×3',
    rest: '잠든 병력을 모두 깨워요',
};
function relicDoorCard(tower, index) {
    const ID = tower.offer,
        DEFINITION = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === ID),
        LEVEL = tower.relics.get(ID) || 0,
        VALUE = Math.round(formationUpgradeValue(DEFINITION, LEVEL + 1) * 10) / 10,
        GAIN = LEVEL ? `Lv.${LEVEL} → ${LEVEL + 1}` : '새 유물';
    return `<button type="button" class="door door--relic" data-door="${index}"><b>${RELIC_ICONS[ID]} ${DEFINITION.name}</b><small>${GAIN} · ${DEFINITION.description || ''}${LEVEL ? ` (→ ${VALUE}${DEFINITION.upgradeUnit})` : ''}</small></button>`;
}
let railKey = '';
let railTimer = 0;
let bannerKey = '';
let bannerTimer = 0;
let doorKey = '';
let tintFloor = -1;
// The tower: a rail of floors that steps up, a banner for every new floor, and doors between floors.
function syncTower(garden, home, event) {
    const T = garden.tower,
        CLIMBING = T.active && !home,
        BEST = garden.playerProgression.towerBest;
    syncFlag('tower', 'hidden', !CLIMBING);
    syncText('towerRelics', [...T.relics].map(([id, level]) => `${RELIC_ICONS[id]} Lv.${level}`).join(' · '));
    const TINT = DOLLAR('towerTint');
    if (TINT.dataset.on !== String(CLIMBING)) {
        TINT.dataset.on = String(CLIMBING);
    }
    if (CLIMBING && tintFloor !== T.floor) {
        tintFloor = T.floor;
        TINT.style.setProperty('--floor', String(T.floor));
    }
    const SLEEPERS = T.sleepUntil.size;
    if (CLIMBING) {
        const KEY = `${T.floor}|${T.kind}|${BEST}`;
        if (KEY !== railKey) {
            const STEPPED = railKey !== '' && railKey.split('|')[0] !== String(T.floor);
            railKey = KEY;
            const FLOORS = [];
            for (let f = T.floor + 2; f >= Math.max(1, T.floor - 1); f--) {
                FLOORS.push(f);
            }
            const RAIL = DOLLAR('towerRail');
            RAIL.innerHTML = FLOORS.map((f) => {
                const MID = f % CONFIG.farm.tower.midBossEvery === 0,
                    NOTE = f === T.floor ? FLOOR_KIND[T.kind] : MID ? '♛ 중간' : f === BEST ? '★ 최고' : '';
                return `<li class="tower__floor${f === T.floor ? ' is-now' : ''}${MID ? ' is-mid' : ''}${f < T.floor ? ' is-gone' : ''}">${f}<small>${NOTE}</small></li>`;
            }).join('');
            if (STEPPED) {
                RAIL.classList.add('is-climbing');
                clearTimeout(railTimer);
                railTimer = setTimeout(() => RAIL.classList.remove('is-climbing'), 750);
            }
        }
    } else {
        railKey = '';
    }
    // A banner announces each new floor as the boss drops in, and the rest stop.
    const NEXT_BANNER = !CLIMBING
        ? ''
        : (T.kind === 'rest' || T.kind === 'relic') && T.doors.length
          ? `r${T.floor}`
          : event?.phase === 'dropping'
            ? `e${event.encounterId}`
            : '';
    if (NEXT_BANNER && NEXT_BANNER !== bannerKey) {
        DOLLAR('floorBannerNum').textContent = `${T.floor}층`;
        DOLLAR('floorBannerKind').textContent = FLOOR_KIND[T.kind];
        const BANNER = DOLLAR('floorBanner');
        BANNER.hidden = false;
        clearTimeout(bannerTimer);
        bannerTimer = setTimeout(() => {
            BANNER.hidden = true;
        }, 1500);
    }
    if (NEXT_BANNER !== '' || !CLIMBING) {
        bannerKey = NEXT_BANNER;
    }
    const DOORS = CLIMBING && event?.phase === 'idle' && T.doors.length > 0;
    syncFlag('towerDoors', 'hidden', !DOORS);
    if (DOORS) {
        const KEY = `${T.doors.join()}|${T.floor}|${SLEEPERS}|${T.offer}|${T.relics.size}`;
        if (KEY !== doorKey) {
            doorKey = KEY;
            DOLLAR('doorCards').innerHTML = T.doors
                .map((d, i) =>
                    d === 'relic'
                        ? relicDoorCard(T, i)
                        : `<button type="button" class="door door--${d}" data-door="${i}"><b>${FLOOR_KIND[d]}</b><small>${DOOR_TEXT[d]}</small></button>`,
                )
                .join('');
        }
        syncText(
            'doorsTitle',
            T.kind === 'rest'
                ? `${T.floor}층 쉼터 · 잠든 병력이 모두 깼어요`
                : T.kind === 'relic'
                  ? `${T.floor}층 유물을 얻었어요`
                  : `${T.floor}층 돌파!`,
        );
        syncText('doorsNote', `다음은 ${T.floor + 1}층 · 잠든 병력 ${SLEEPERS}마리`);
    } else {
        doorKey = '';
    }
    const RESULT = !T.active && T.floor > 0 && !home && event?.phase === 'idle';
    syncFlag('towerResult', 'hidden', !RESULT);
    syncText('towerResult', `지난 도전 ${T.floor}층${T.record ? ' · 새 기록!' : ''} · 최고 ${BEST}층`);
}
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
function fightActive() {
    return ['dropping', 'fighting'].includes(active?.world.farmBossEvent?.phase);
}
// The hand: one card per species still waiting. A tapped card stays chosen, so tapping the field keeps deploying it.
function syncHand(garden, visible) {
    syncFlag('hand', 'hidden', !visible);
    if (!visible) {
        deploySpecies = -1;
        handKey = '';
        return;
    }
    const COUNTS = garden.handCounts,
        IDS = [...COUNTS.keys()].sort((a, b) => a - b),
        KEY = IDS.join(',');
    if (!COUNTS.has(deploySpecies)) {
        deploySpecies = IDS[0] ?? -1;
    }
    if (KEY !== handKey) {
        handKey = KEY;
        DOLLAR('handCards').innerHTML = IDS.map((id) => {
            const SPECIES = speciesById(id);
            return `<button type="button" class="hand__card" data-deploy="${id}" aria-label="${SPECIES.name}"><img src="./assets/troops/${SPECIES.asset}" alt="" width="40" height="40" draggable="false"><b></b></button>`;
        }).join('');
    }
    for (const BUTTON of DOLLAR('handCards').children) {
        const ID = Number(BUTTON.dataset.deploy);
        const LABEL = BUTTON.querySelector('b'),
            TEXT = `×${COUNTS.get(ID) || 0}`;
        if (LABEL.textContent !== TEXT) {
            LABEL.textContent = TEXT;
        }
        BUTTON.setAttribute('aria-pressed', String(ID === deploySpecies));
    }
    const LEFT = garden.deployCooldownLeft;
    DOLLAR('hand').style.setProperty(
        '--cd',
        String(LEFT > 0 ? Math.min(1, LEFT / CONFIG.farm.deploy.cooldownSeconds) : 0),
    );
    syncText(
        'handNote',
        IDS.length
            ? `카드를 고르고 땅을 눌러 투입해요 · 필드 ${garden.fieldFighterCount}/${CONFIG.farm.deploy.fieldCap}${garden.tower.sleepUntil.size ? ` · 잠든 병력 ${garden.tower.sleepUntil.size}` : ''}`
            : '대기 중인 병력이 없어요',
    );
}
DOLLAR('handCards').addEventListener('click', (e) => {
    const BUTTON = e.target.closest('[data-deploy]');
    if (BUTTON) {
        deploySpecies = Number(BUTTON.dataset.deploy);
    }
});
function canUseWorldInput() {
    return !home && !menuOpen && !active.paused && !farmSortTransition;
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
    if (farmSortTransition || active.world.scene !== 'farm' || active.world.farmBossEvent?.phase !== 'idle') {
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
    if (e.button !== 0 || !canUseWorldInput() || panPointer) {
        return;
    }
    const POINT = RENDERER.screenToWorld(e.clientX, e.clientY);
    panPointer = {
        id: e.pointerId,
        // Food only goes on this farm's own ground; the land around it can be looked at and dragged.
        mode: !(active.world.scene === 'farm' && ArenaGeometry.inside(POINT, 'farm'))
            ? 'pan'
            : fightActive()
              ? 'deploy'
              : active.world.tower.active
                ? 'pan'
                : 'pending',
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
    };
    if (panPointer.mode === 'deploy') {
        const SPOT = { x: POINT.x, y: POINT.y },
            SEND = () => {
                if (deploySpecies >= 0) {
                    active.queue('deploy', { species: deploySpecies, x: SPOT.x, y: SPOT.y });
                }
            };
        SEND();
        foodHold = {
            pointerId: e.pointerId,
            point: SPOT,
            initialTimer: null,
            repeatTimer: setInterval(() => {
                if (foodHold?.pointerId === e.pointerId && canUseWorldInput() && panPointer?.mode === 'deploy') {
                    SEND();
                }
            }, 150),
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
    } else if (panPointer.mode === 'deploy' && DISTANCE >= 8) {
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
    if (e.key === 'Escape' && menuOpen) {
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
    if (R === '#/help' || R === '#/farms' || R === '#/abilities' || R === '#/menu') {
        const FARM_EVENT_ACTIVE = personalGarden?.farmBossEvent?.phase !== 'idle';
        const RESTRICTED = (R === '#/farms' && FARM_EVENT_ACTIVE) || (R === '#/abilities' && !personalGarden);
        if (RESTRICTED) {
            closeMenu(false);
            history.replaceState(null, '', '#/farm');
            return;
        }
        openMenu(ROUTE_MENU_TAB(R), false);
        return;
    }
    if (menuOpen) {
        closeMenu(false);
    }
}
window.addEventListener('popstate', route);
function sync(display, now, notices) {
    const W = active.world,
        FARM_EVENT = display.farmBossEvent,
        FARM_EVENT_ACTIVE = FARM_EVENT?.phase !== 'idle',
        BATTLE_OUTCOME = FARM_EVENT?.outcome,
        HAS_READY_TROOPS = personalGarden ? personalGarden.units.some((unit) => unit.hp > 0 && unit.down <= 0) : false,
        REWARD_WORLD = personalGarden || W,
        PENDING_REWARD = REWARD_WORLD.bossRewardReceipts.find(
            (reward) => ['calculating', 'ready'].includes(reward.status) || reward.queuedCount > 0,
        ),
        MERGE_STATUS = mergeAvailability(W, now);
    syncBossRewardDialog(REWARD_WORLD);
    if ((home || menuOpen || active.paused) && panPointer) {
        stopWorldInput();
    }
    syncFlag('merge', 'disabled', home || FARM_EVENT_ACTIVE || !MERGE_STATUS.available);
    syncData('merge', 'availability', MERGE_STATUS.code || 'unavailable');
    syncFlag('mergeNotice', 'hidden', home || FARM_EVENT_ACTIVE);
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
    for (const UNIT of W.units) {
        if (!UNIT.isBattleOnlySummon) {
            worldCount++;
        }
    }
    syncFlag('farmControls', 'hidden', FARM_EVENT_ACTIVE || home || W.tower.active);
    syncFlag('workHud', 'hidden', FARM_EVENT_ACTIVE || home || W.tower.active);
    syncTower(W, home, FARM_EVENT);
    syncFlag('bossbar', 'hidden', !FARM_EVENT_ACTIVE || home || FARM_EVENT.phase === 'marching');
    syncHand(W, !home && ['dropping', 'fighting'].includes(FARM_EVENT?.phase));
    syncText('count', displayedCount);
    syncText('capacity', personalGarden?.capacity ?? CONFIG.farm.capacity.max);
    syncText(
        'starter',
        PENDING_REWARD
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
        Math.ceil(armyCurrent) + '/' + Math.ceil(armyMax) + ' · ' + armyLiving + '/' + armyTotal + '마리',
    );
    const BOSS = display.boss,
        FARM_REWARD =
            FARM_EVENT?.outcome === 'victory'
                ? W.bossRewardReceipts.find(
                      (reward) => reward.source === 'farm' && reward.encounterId === FARM_EVENT.encounterId,
                  )
                : null,
        REWARD_NAME = speciesRewardName(BOSS.species),
        ENCOUNTER_NAME = giantSpeciesName(BOSS.species);
    syncText(
        'bossName',
        BOSS.stage
            ? `${BOSS.stage}층 · ${W.tower.kind === 'battle' ? '' : FLOOR_KIND[W.tower.kind] + ' '}${ENCOUNTER_NAME}`
            : ENCOUNTER_NAME,
    );
    syncAttribute('bossHealth', 'aria-label', `${ENCOUNTER_NAME} 체력`);
    syncText('bossHealthText', Math.ceil(BOSS.hp) + '/' + BOSS.maxHp);
    syncText(
        'bossHealthNote',
        FARM_EVENT_ACTIVE && FARM_EVENT.phase === 'dropping'
            ? '보스가 있는 칸으로 가는 중이에요'
            : FARM_EVENT_ACTIVE && FARM_EVENT.phase === 'fighting'
              ? W.bossEnraged
                  ? '격노! 피해 2배, 공격이 빨라져요'
                  : `${W.bossPhase}페이즈 · 격노까지 ${Math.max(0, Math.ceil(W.battleTimeLimit() - FARM_EVENT.elapsed))}초`
              : FARM_EVENT_ACTIVE
                ? ''
                : '쓰러진 병력 포함 최대 체력',
    );
    syncFlag('fightRetreat', 'hidden', !(FARM_EVENT_ACTIVE && ['dropping', 'fighting'].includes(FARM_EVENT.phase)));
    syncAttribute('allyHealth', 'aria-valuenow', armyCurrent);
    syncAttribute('allyHealth', 'aria-valuemax', armyMax);
    syncAttribute('bossHealth', 'aria-valuenow', BOSS.hp);
    syncAttribute('bossHealth', 'aria-valuemax', BOSS.maxHp);
    syncWidth('bossHealth', BOSS.maxHp ? (BOSS.hp / BOSS.maxHp) * 100 + '%' : '0%');
    syncText(
        'battleOutcome',
        BATTLE_OUTCOME === 'victory'
            ? FARM_EVENT.rewardStatus === 'granted'
                ? `${BOSS.stage}층 돌파 · 새 기록! ${REWARD_NAME} ${rewardReceiptSummary(FARM_REWARD)} · 농장에 합류했어요`
                : FARM_EVENT.rewardStatus === 'pending'
                  ? `${BOSS.stage}층 돌파 · 새 기록! ${REWARD_NAME} ${rewardReceiptSummary(FARM_REWARD)} · 공간이 생기면 합류해요`
                  : W.tower.record
                    ? `${BOSS.stage}층 돌파 · 새 기록!`
                    : `${BOSS.stage}층 돌파 · 이미 오른 층이라 보상은 없어요`
            : BATTLE_OUTCOME === 'defeat'
              ? `${BOSS.stage}층에서 쓰러졌어요 · 최고 ${W.playerProgression.towerBest}층 · 쓰러진 병력은 농장에서 쉬어요`
              : '',
    );
    syncFlag(
        'battleOutcome',
        'hidden',
        home || !FARM_EVENT_ACTIVE || BATTLE_OUTCOME === 'fighting' || BATTLE_OUTCOME === 'idle',
    );
    const BEST_FLOOR = W.playerProgression.towerBest,
        START_FLOOR = startFloorValue(W);
    syncFlag('startFloorBox', 'hidden', BEST_FLOOR < 2 || FARM_EVENT_ACTIVE || home);
    syncAttribute('startFloor', 'max', Math.max(1, BEST_FLOOR));
    if (document.activeElement !== DOLLAR('startFloor') && DOLLAR('startFloor').value !== String(START_FLOOR)) {
        DOLLAR('startFloor').value = String(START_FLOOR);
    }
    paintRange(DOLLAR('startFloor'));
    syncText('startFloorValue', `시작 ${START_FLOOR} / ${BEST_FLOOR}층`);
    syncText('bossChallenge', '탑 오르기');
    syncFlag('bossChallenge', 'hidden', FARM_EVENT_ACTIVE || home);
    syncAttribute('bossChallenge', 'aria-disabled', String(raidStartBlockReason() !== ''));
    syncFlag('menuTabFarms', 'disabled', FARM_EVENT_ACTIVE);
    syncFlag('menuTabAbilities', 'disabled', !personalGarden);
    const WORK_WORLD = personalGarden || W,
        WORKERS = WORK_WORLD.workerCount,
        BREEDERS = Math.max(0, WORK_WORLD.units.length - WORKERS),
        CUT = workCut(WORK_WORLD);
    let note = `일꾼 ${WORKERS}마리 · 먹이 ${WORK_WORLD.workFoodPerMinute.toFixed(1)}/분`,
        warn = false;
    if (WORK_WORLD.warehouseFull) {
        note = '농장에 먹이가 가득해요 · 일꾼이 번식으로 돌아갔어요';
        warn = true;
    } else if (WORKERS === 0) {
        note = '일꾼이 없어서 먹이가 안 만들어져요';
        warn = true;
    }
    DOLLAR('workCutA').disabled = !!farmSortTransition;
    if (document.activeElement !== DOLLAR('workCutA')) {
        DOLLAR('workCutA').value = String(CUT);
    }
    syncText('workHudNote', note);
    syncText('workHudBreed', `번식 ${BREEDERS}`);
    syncText('workHudFood', `먹이 ${WORKERS}`);
    syncData('workHud', 'warn', warn);
    paintRange(DOLLAR('workCutA'));
    if (menuOpen && menuTab === 'farms') {
        drawFarmPanel();
    }
    for (const E of notices) {
        FOOD_FEEL.event(E.kind);
    }
    FOOD_FEEL.frame();
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
        RENDERER.render(DISPLAY, COMBAT_FEEL, DISPLAY.displayTimeMs);
        PERFORMANCE_DIAGNOSTICS.end('render', RENDER_START);
        const UI_START = PERFORMANCE_DIAGNOSTICS.start();
        sync(DISPLAY, now, NOTICES);
        RELIC_DOCK.update(
            active.world,
            DISPLAY,
            !home && active.world.tower.active && active.world.farmBossEvent?.phase !== 'idle',
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
