import { PerformanceDiagnostics } from './core/performance-diagnostics.js';
import { FarmHudCounts } from './ui/farm-hud-counts.js';
import { RelicDock, RELIC_ICONS, relicEffectText, relicAcquisitionText } from './ui/relic-dock.js';
import { FORMATION_SKILL_DEFINITIONS } from './formation/formation-skill-state.js';
import {
    RARITY_NAMES,
    TOWER_EVENTS,
    TOWER_RUN_SETTINGS,
    cardStacks,
    cardAcquisitionText,
    cardValue,
    cardChoicePhase,
    passiveEffectText,
    passiveCard,
    statCard,
    statCardText,
} from './tower/tower-run.js';
import { Garden, CONFIG, ArenaGeometry, ATTACK_TYPES, Ballistics, clamp } from './model/farm-model.js';
import { Diorama } from './render/farm-renderer.js';
import { FarmSession, LOCAL_PROFILE } from './app/farm-session.js';
import { FarmStorage } from './save/farm-storage.js';
import { FarmAutosave } from './save/farm-autosave.js';
import { snapshot, restore } from './model/farm-state.js';
import { PRODUCT_VERSION } from './version.js';
import { highestTowerStartFloor, overallLevel, overallXpForLevel } from './model/player-progression.js';
import { towerTheme } from './tower/tower-theme.js';
import { FoodFeel } from './render/food-feel.js';
import { CombatFeel } from './render/combat-feel.js';
import { renderAbilityTreeMarkup, renderAbilitySpeciesTabsMarkup } from './abilities/ability-tree.js';
import { canResetPlayerProgression, getAbilityPointsLeft } from './abilities/ability-progression.js';
import { SPECIES_ABILITY_DEFINITIONS } from './abilities/ability-catalog.js';
import { advanceBossRewardReveal, openAllBossRewardBoxes, bossRewardQueueBySpecies } from './boss/boss-rewards.js';
import { workersBySpecies } from './model/farm-work.js';
import { apportionBreedShares, adjustBreedShare } from './model/breed-allocation.js';
import { speciesById, giantSpeciesName } from './units/species-catalog.js';
import { HELP_MAX_FRAME_MS, HELP_PLAYBACK_RATE, helpSceneById } from './ui/help-scenes.js';
import { createHelpPanel } from './ui/help-panel.js';
import { codexHtml, CODEX_TABS } from './ui/codex-dialog.js';
const DOLLAR = (id) => document.getElementById(id),
    STORAGE = new FarmStorage();
STORAGE.initializeIncompatible(new Garden());
const HELP_PANEL = createHelpPanel(DOLLAR);
DOLLAR('abilitySpeciesTabs').innerHTML = renderAbilitySpeciesTabsMarkup();
let imported = null;
let active = null;
let frameRequest = null;
let graphicsRecovery = null;
let sessionClockNow = () => performance.now();
let home = true;
let personalGarden = null;
let unsubscribeProgress = null;
let menuOpen = false;
let menuTab = 'play';
let menuWasPaused = true;
let menuPauseChanged = false;
let menuAutoPaused = false;
let cameraGesture = null;
const CAMERA_POINTERS = new Map();
let suppressCanvasClick = false;
let handKey = '';
let farmSortTransition = null;
let farmPanelRevision = -1;
let abilityTreeProgression = null;
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
    combine: null,
};
const RENDERER = new Diorama(DOLLAR('world'));
const RELIC_DOCK = new RelicDock({ onOpen: () => stopWorldInput() });
const BOSS_RELIC_DOCK = new RelicDock({ role: 'boss', host: '#bossRelicHost', onOpen: () => stopWorldInput() });
const PERFORMANCE_DIAGNOSTICS = new PerformanceDiagnostics();
const HUD_COUNTS = new FarmHudCounts();
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
            combine: world.combineAvailability(),
        };
    }
    return mergeStatusCache;
}
function rewardReceiptSummary(reward) {
    if (!reward) {
        return '보상 없음';
    }
    if (reward.status === 'calculating') {
        const DONE = reward.calculation?.jobState?.processedTrials ?? 0;
        return '보상 준비 중 (' + DONE + '/' + reward.boxCount + ')';
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
        return '보상 준비 중 (' + DONE + '/' + reward.boxCount + ')';
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

function bossRewardMasteryLine(receipt) {
    if (!receipt.xpAmount) {
        return '';
    }
    const LEVEL_UP = receipt.pointsAwarded > 0 ? ' · 숙련 포인트 +' + receipt.pointsAwarded : '';
    return speciesById(receipt.species).name + ' 숙련 +' + receipt.xpAmount + ' XP' + LEVEL_UP;
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
            : FIRST_CLEAR
              ? '처음 만난 종이에요 · 동료로 합류해요'
              : HAS_PRESENTATION
                ? COUNT +
                  '회 추첨 · 상자당 ' +
                  MIN +
                  (MIN === MAX ? '' : '–' + MAX) +
                  '마리 · ' +
                  '재도전 ' +
                  Math.round(NOMINAL_CHANCE * 100) +
                  '% (편성 반영 ' +
                  Math.round(receipt.chance * 100) +
                  '%)'
                : '획득한 보상 합계';
    DOLLAR('bossRewardTotals').textContent =
        receipt.status === 'calculating'
            ? '보상 준비 ' + PROCESSED + '/' + COUNT
            : [bossRewardMasteryLine(receipt), '현재 합계 ' + CUMULATIVE + '마리 · ' + bossRewardSummary(receipt)]
                  .filter(Boolean)
                  .join('\n');
    DOLLAR('bossRewardRevealCount').textContent =
        receipt.status === 'calculating' ? '추첨 ' + PROCESSED + '/' + COUNT : REVEALED + '/' + COUNT + ' 상자 공개';
    const SCENE = DOLLAR('bossRewardChestScene');
    if (
        receipt.status === 'ready' &&
        receipt.acquiredCount > 0 &&
        bossRewardPortraitReceiptKey !== receipt.receiptKey
    ) {
        bossRewardPortraitReceiptKey = receipt.receiptKey;
        const PORTRAIT = DOLLAR('bossRewardPortrait');
        PORTRAIT.src = './assets/troops/sprout.svg';
        PORTRAIT.alt = '새싹';
        PORTRAIT.hidden = false;
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
    stopWorldInput();
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
    if (home || world?.tower.phase === 'summit') {
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
    BUTTON.textContent = RECEIPT.status === 'calculating' ? '보상 준비 중…' : '보상 상자 열기';
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
    DOLLAR('diagnosticStatus').textContent = '상세 진단 정보예요. 저장 데이터는 포함하지 않아요.';
};
const FAIL = (error) => {
    DOLLAR('error').hidden = false;
    DOLLAR('error').textContent = '농장을 진행하지 못했어요. ' + error.message;
    console.error(error);
    if (active) {
        active.paused = true;
    }
};
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
    abilityTreeProgression = null;
    // The saved garden remains an owner while a separate raid session is active.
    unsubscribeProgress =
        world?.onProgressChanged.on(() => {
            AUTOSAVE.markDirty();
            if (world.tower.phase === 'summit') {
                // The final receipt is durable before the next frame can offer Skip.
                AUTOSAVE.flush();
            }
            // Purchases/reset publish their new state before this signal. A wall-time
            // delay can run before the queued command; refresh only committed state.
            // Other farm progress keeps the same identity and must not kill previews.
            if (menuOpen && menuTab === 'abilities' && abilityTreeProgression !== world.playerProgression) {
                drawAbilityTree();
            }
        }) ?? null;
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
const BREED_WEIGHTS_KEY = 'budmori.breed.weights';
function loadBreedWeights(world) {
    try {
        world.setBreedWeights(JSON.parse(localStorage.getItem(BREED_WEIGHTS_KEY) || 'null'));
    } catch {
        /* Even split stands. */
    }
}
function saveBreedWeights(world) {
    try {
        localStorage.setItem(BREED_WEIGHTS_KEY, JSON.stringify(world.breedWeights));
    } catch {
        /* Applies for this run. */
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
// The split the slider asks for, counted over everyone (asleep or still growing too), so the numbers follow the
// slider even while nobody can work right now.
function plannedWorkers(world) {
    const COUNTS = new Map();
    let total = 0;
    for (const UNIT of world.units) {
        if (!UNIT.seedling && !UNIT.isBattleOnlySummon && !UNIT.isFormationClone) {
            COUNTS.set(UNIT.species, (COUNTS.get(UNIT.species) || 0) + 1);
            total++;
        }
    }
    let workers = 0;
    for (const COUNT of workersBySpecies(COUNTS, world.workBasisPoints / 10000, world.breedWeights).values()) {
        workers += COUNT;
    }
    return { total, workers };
}
function workCut(world) {
    return Math.round((100 - world.workBasisPoints / 100) / 5) * 5;
}
function install(world) {
    if (active) {
        stopWorldInput();
        cancelFarmSortTransition();
    }
    active?.dispose();
    HUD_COUNTS.bind(world);
    RENDERER.resetPan();
    active = new FarmSession(world, {
        onError: FAIL,
        now: () => sessionClockNow(),
    });
    if (graphicsRecovery) {
        active.suspendClock();
    }
    world.setWorkBasisPoints(loadWorkSetting(world.workBasisPoints));
    loadBreedWeights(world);
    loadDeployOrder(world);
    return active;
}
install(new Garden());
active.paused = true;
function raidStartBlockReason() {
    if (!personalGarden) {
        return '농장에서만 보스에 도전할 수 있어요.';
    }
    if (personalGarden.farmBossEvent?.phase !== 'idle') {
        return '이미 전투 중이에요.';
    }
    if (!personalGarden.units.some((unit) => !unit.isBattleOnlySummon && unit.hp > 0)) {
        return '싸울 병력이 없어요. 먼저 모리를 키워 주세요.';
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
    DOLLAR('continueGame').disabled = !hasMemoryRun() && !STORAGE.hasWorld;
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
    if (ownedCounts(personalGarden).size < 2) {
        climb();
        return;
    }
    openDeck();
}
function climb() {
    if (personalGarden.startTower(startFloorValue(personalGarden))) {
        active.paused = false;
        active.loop.resetTiming();
    }
}
// The deck: the species that go in, in order. Tap one card, then another, to swap them.
let deckOrder = [],
    deckPicked = -1;
function paintDeck() {
    const COUNTS = ownedCounts(personalGarden),
        OWNED = deckOrder.filter((id) => COUNTS.has(id));
    DOLLAR('deckCards').innerHTML = OWNED.map((id, slot) => deckCardHtml(id, COUNTS.get(id), slot + 1)).join('');
    for (const BUTTON of DOLLAR('deckCards').children) {
        BUTTON.setAttribute('aria-pressed', String(Number(BUTTON.dataset.deploy) === deckPicked));
    }
}
function openDeck() {
    deckOrder = [...personalGarden.deployOrder];
    deckPicked = -1;
    paintDeck();
    DOLLAR('deckDialog').hidden = false;
}
DOLLAR('deckClose').onclick = () => {
    DOLLAR('deckDialog').hidden = true;
};
DOLLAR('deckGo').onclick = () => {
    DOLLAR('deckDialog').hidden = true;
    personalGarden.setDeployOrder(deckOrder);
    saveDeployOrder(deckOrder);
    climb();
};
DOLLAR('deckCards').addEventListener('click', (e) => {
    const BUTTON = e.target.closest('[data-deploy]');
    if (!BUTTON) {
        return;
    }
    const ID = Number(BUTTON.dataset.deploy);
    if (deckPicked < 0 || deckPicked === ID) {
        deckPicked = deckPicked === ID ? -1 : ID;
    } else {
        const FROM = deckOrder.indexOf(deckPicked),
            TO = deckOrder.indexOf(ID);
        [deckOrder[FROM], deckOrder[TO]] = [deckOrder[TO], deckOrder[FROM]];
        deckPicked = -1;
    }
    paintDeck();
});
function hasMemoryRun() {
    return !!(personalGarden?.tower.active && active?.world === personalGarden && !active.closed);
}
function resumeMemoryRun(push = true) {
    if (!hasMemoryRun()) {
        return false;
    }
    // Home pauses this session; it is not a disk checkpoint or a new climb.
    active.loop.resetTiming();
    setHome(false, push);
    markSeen();
    return true;
}
DOLLAR('continueGame').onclick = () => {
    if (resumeMemoryRun()) {
        return;
    }
    if (STORAGE.world) {
        start(restore(snapshot(STORAGE.world)), true, true);
    }
};
DOLLAR('fightRetreat').onclick = () => {
    personalGarden?.retreatFromFight();
};
DOLLAR('bossChallenge').onclick = beginChallenge;
DOLLAR('battleCommands').addEventListener('change', (event) => {
    if (event.target.matches('input[name="battleCommand"]') && active && !home) {
        active.queue('battle-command', { mode: event.target.value });
        active.flushQueuedCommands();
    }
});
DOLLAR('summitSkip').onclick = () => active?.queue('tower-summit-skip', {});
DOLLAR('towerSummit').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        active?.queue('tower-summit-skip', {});
    } else if (event.key === 'Tab') {
        event.preventDefault();
        DOLLAR('summitSkip').focus();
    }
});
// A fresh run starts 20% below the record by default, leaving room for its first cards.
let startFloorChoice = 0;
function startFloorValue(garden) {
    const HIGHEST = highestTowerStartFloor(garden.playerProgression.towerBest);
    return startFloorChoice >= 1 && startFloorChoice <= HIGHEST ? startFloorChoice : HIGHEST;
}
DOLLAR('startFloor').oninput = (e) => {
    startFloorChoice = Number(e.target.value);
    paintRange(e.target);
};
let doorPointerPress = null;
DOLLAR('doorCards').addEventListener('pointerdown', (event) => {
    const BUTTON = event.target.closest('[data-door]');
    doorPointerPress =
        BUTTON && DOLLAR('towerDoors').dataset.owner === 'player'
            ? { button: BUTTON, serial: personalGarden?.tower.bossCardDraw?.serial || 0 }
            : null;
});
DOLLAR('doorCards').addEventListener('pointercancel', () => {
    doorPointerPress = null;
});
DOLLAR('doorCards').addEventListener('keydown', (event) => {
    if (['Enter', ' '].includes(event.key) && (event.repeat || DOLLAR('towerDoors').dataset.owner === 'boss')) {
        event.preventDefault();
    }
});
DOLLAR('doorCards').addEventListener('click', (event) => {
    const BUTTON = event.target.closest('[data-door]'),
        PRESS = doorPointerPress;
    doorPointerPress = null;
    if (
        !BUTTON ||
        BUTTON.disabled ||
        DOLLAR('towerDoors').dataset.owner === 'boss' ||
        (event.detail > 0 &&
            (PRESS?.button !== BUTTON || PRESS.serial !== (personalGarden?.tower.bossCardDraw?.serial || 0)))
    ) {
        return;
    }
    if (personalGarden?.chooseDoor(Number(BUTTON.dataset.door))) {
        stopWorldInput();
        syncTower(personalGarden, home, personalGarden.farmBossEvent);
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
        const { validateSave: VALIDATE_SAVE } = await import('./save/farm-storage.js');
        VALIDATE_SAVE(TEXT);
        imported = TEXT;
        DOLLAR('importConfirmText').textContent = '선택한 파일로 현재 저장을 바꿀까요?';
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
    if (active?.world?.tower.active) {
        DOLLAR('saveNotice').textContent = '탑 도전을 끝내고 농장으로 돌아온 뒤 저장을 불러올 수 있어요.';
        return;
    }
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
// Holding a merge button merges once right away, then one more every 0.1 s while it stays down.
let mergeHold = null;
function stopMergeHold() {
    if (mergeHold) {
        clearTimeout(mergeHold.delay);
        clearInterval(mergeHold.repeat);
        mergeHold = null;
    }
}
function bindMergeButton(id, command, onBlocked = null) {
    const BUTTON = DOLLAR(id);
    BUTTON.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || BUTTON.disabled) {
            return;
        }
        stopMergeHold();
        if (onBlocked?.()) {
            return;
        }
        active?.queue(command);
        const HOLD = (mergeHold = { delay: 0, repeat: 0 });
        HOLD.delay = setTimeout(() => {
            HOLD.repeat = setInterval(() => active?.queue(command), 100);
        }, 350);
    });
    for (const EVENT of ['pointerup', 'pointercancel', 'pointerleave']) {
        BUTTON.addEventListener(EVENT, stopMergeHold);
    }
    // A pointer press already merged above; this is for the keyboard.
    BUTTON.onclick = (e) => {
        if (e.detail === 0 && !onBlocked?.()) {
            active?.queue(command);
        }
    };
    BUTTON.addEventListener('keydown', (e) => {
        if (e.repeat && ['Enter', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });
}
window.addEventListener('blur', stopMergeHold);
bindMergeButton('merge', 'merge');
// Without a chosen recipe the combine button opens the codex to pick one.
bindMergeButton('combine', 'combine', () => {
    if (personalGarden.combine.recipe >= 0) {
        return false;
    }
    openCodex('recipes');
    return true;
});
// The codex: recipes to pick, and every kind of unit the farm has had.
let codexTab = 'recipes';
function paintCodex() {
    DOLLAR('codexTabs').innerHTML = CODEX_TABS.map(
        (tab) =>
            `<button type="button" role="tab" data-tab="${tab.id}" aria-selected="${tab.id === codexTab}">${tab.label}</button>`,
    ).join('');
    DOLLAR('codexBody').innerHTML = codexHtml(personalGarden, codexTab);
}
function openCodex(tab = codexTab) {
    codexTab = tab;
    paintCodex();
    DOLLAR('codexDialog').hidden = false;
}
DOLLAR('codexOpen').onclick = () => openCodex();
DOLLAR('codexClose').onclick = () => {
    DOLLAR('codexDialog').hidden = true;
};
DOLLAR('codexTabs').addEventListener('click', (e) => {
    const TAB = e.target.closest('[data-tab]');
    if (TAB) {
        codexTab = TAB.dataset.tab;
        paintCodex();
    }
});
DOLLAR('codexBody').addEventListener('click', (e) => {
    const RECIPE = e.target.closest('[data-recipe]'),
        TIER = e.target.closest('[data-tier]');
    if (RECIPE) {
        const INDEX = Number(RECIPE.dataset.recipe);
        active?.queue('combine-select', {
            recipe: INDEX === personalGarden.combine.recipe ? -1 : INDEX,
            tier: 1,
        });
    } else if (TIER) {
        active?.queue('combine-select', { recipe: personalGarden.combine.recipe, tier: Number(TIER.dataset.tier) });
    }
    // The command lands on the next tick; paint after it.
    setTimeout(paintCodex, 120);
});
// Selection and the proportional editing basis are presentation-only, never part of a farm save.
const BREED_CONTROL = { selected: null, idsKey: '', world: null, sourceKey: '', basis: [] };
function speciesCounts(world) {
    const COUNTS = new Map();
    for (const UNIT of world.units) {
        if (!UNIT.isBattleOnlySummon && !UNIT.isFormationClone) {
            COUNTS.set(UNIT.species, (COUNTS.get(UNIT.species) || 0) + 1);
        }
    }
    return COUNTS;
}
function breedControlState(world) {
    const COUNTS = speciesCounts(world),
        IDS = [...COUNTS.keys()].sort((x, y) => x - y),
        WEIGHTS = IDS.map((id) => (world.breedWeights ? world.breedWeights[id] || 0 : COUNTS.get(id))),
        SOURCE_KEY = WEIGHTS.join(','),
        IDS_KEY = IDS.join(',');
    if (BREED_CONTROL.world !== world || BREED_CONTROL.idsKey !== IDS_KEY || BREED_CONTROL.sourceKey !== SOURCE_KEY) {
        BREED_CONTROL.world = world;
        BREED_CONTROL.basis = WEIGHTS;
        BREED_CONTROL.sourceKey = SOURCE_KEY;
    }
    if (!IDS.includes(BREED_CONTROL.selected)) {
        BREED_CONTROL.selected = IDS[0] ?? null;
    }
    return { counts: COUNTS, ids: IDS, weights: WEIGHTS, shares: apportionBreedShares(WEIGHTS), idsKey: IDS_KEY };
}
function drawSpeciesRoles(world) {
    const STATE = breedControlState(world),
        HOST = DOLLAR('speciesRoles');
    if (BREED_CONTROL.idsKey !== STATE.idsKey) {
        BREED_CONTROL.idsKey = STATE.idsKey;
        HOST.innerHTML = STATE.ids
            .map((id) => {
                const SPECIES = speciesById(id);
                return `<button type="button" class="breed-chip" data-breed-species="${id}" aria-pressed="false"><img src="./assets/troops/${SPECIES.asset}" alt="" width="36" height="36"><span>${SPECIES.name}</span><b data-breed-percent></b></button>`;
            })
            .join('');
    }
    STATE.ids.forEach((id, index) => {
        const CHIP = HOST.querySelector(`[data-breed-species="${id}"]`),
            SELECTED = id === BREED_CONTROL.selected;
        CHIP.setAttribute('aria-pressed', String(SELECTED));
        CHIP.querySelector('[data-breed-percent]').textContent = `${STATE.shares[index]}%`;
    });
    const INDEX = STATE.ids.indexOf(BREED_CONTROL.selected),
        SHARE = STATE.shares[INDEX] ?? 0,
        RANGE = DOLLAR('speciesBreedShare'),
        DISABLED = STATE.ids.length < 2;
    DOLLAR('speciesBreedLabel').textContent =
        INDEX < 0 ? '병종이 없어요' : `${speciesById(BREED_CONTROL.selected).name} 번식 몫`;
    DOLLAR('speciesBreedValue').textContent = `${SHARE}%`;
    RANGE.value = String(SHARE);
    RANGE.disabled = DISABLED;
    RANGE.setAttribute('aria-valuetext', `${SHARE}%`);
    paintRange(RANGE);
    DOLLAR('speciesBreedLess').disabled = DISABLED || SHARE === 0;
    DOLLAR('speciesBreedMore').disabled = DISABLED || SHARE === 100;
    DOLLAR('speciesBreedEqual').disabled = STATE.ids.length === 0;
    const WORKERS = workersBySpecies(STATE.counts, world.workBasisPoints / 10000, world.breedWeights);
    DOLLAR('speciesBreedPlan').textContent =
        INDEX < 0
            ? ''
            : `배분 계획 · 번식 ${STATE.counts.get(BREED_CONTROL.selected) - WORKERS.get(BREED_CONTROL.selected)} · 먹이 ${WORKERS.get(BREED_CONTROL.selected)}`;
}
function applyBreedShares(world, ids, shares) {
    const WEIGHTS = new Array(Math.max(...ids) + 1).fill(0);
    ids.forEach((id, index) => {
        WEIGHTS[id] = shares[index];
    });
    if (!world.setBreedWeights(WEIGHTS)) {
        return;
    }
    // Keep the starting proportions while editing one species. Rounded 0% must not erase a small share.
    BREED_CONTROL.sourceKey = shares.join(',');
    saveBreedWeights(world);
    active.queue('farm-breed-weights', { weights: WEIGHTS });
    drawSpeciesRoles(world);
}
function changeBreedShare(value) {
    const WORLD = personalGarden || active?.world;
    if (!WORLD) {
        return;
    }
    const STATE = breedControlState(WORLD),
        INDEX = STATE.ids.indexOf(BREED_CONTROL.selected);
    if (STATE.ids.length < 2 || Number(value) === STATE.shares[INDEX]) {
        return;
    }
    applyBreedShares(WORLD, STATE.ids, adjustBreedShare(BREED_CONTROL.basis, INDEX, Number(value)));
}
DOLLAR('speciesRoles').addEventListener('click', (event) => {
    const CHIP = event.target.closest('[data-breed-species]'),
        WORLD = personalGarden || active?.world;
    if (!CHIP || !WORLD || Number(CHIP.dataset.breedSpecies) === BREED_CONTROL.selected) {
        return;
    }
    const STATE = breedControlState(WORLD);
    BREED_CONTROL.selected = Number(CHIP.dataset.breedSpecies);
    BREED_CONTROL.basis = STATE.weights;
    drawSpeciesRoles(WORLD);
});
DOLLAR('speciesBreedShare').addEventListener('input', (event) => changeBreedShare(event.target.value));
DOLLAR('speciesBreedLess').addEventListener('click', () =>
    changeBreedShare(Number(DOLLAR('speciesBreedShare').value) - 1),
);
DOLLAR('speciesBreedMore').addEventListener('click', () =>
    changeBreedShare(Number(DOLLAR('speciesBreedShare').value) + 1),
);
DOLLAR('speciesBreedEqual').addEventListener('click', () => {
    const WORLD = personalGarden || active?.world;
    if (!WORLD) {
        return;
    }
    const STATE = breedControlState(WORLD);
    if (!STATE.ids.length) {
        return;
    }
    BREED_CONTROL.basis = STATE.ids.map(() => 1);
    applyBreedShares(WORLD, STATE.ids, apportionBreedShares(BREED_CONTROL.basis));
});
// Which species wait for room, so a long queue reads as "who is next" rather than one number.
function drawRewardQueue(world) {
    const QUEUE = bossRewardQueueBySpecies(world),
        BOX = DOLLAR('farmQueue'),
        HTML = QUEUE.map(
            ([species, count]) =>
                `<span class="farm-queue__chip"><img src="./assets/troops/${speciesById(species).asset}" alt="${speciesById(species).name}" width="20" height="20"><b>${count}</b></span>`,
        ).join('');
    BOX.hidden = QUEUE.length === 0;
    if (BOX.innerHTML !== HTML) {
        BOX.innerHTML = HTML;
    }
}
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
    drawRewardQueue(W);
    syncFlag('farmLockNote', 'hidden', !LOCKED || !!farmSortTransition);
    drawSpeciesRoles(W);
    for (const BUTTON of DOLLAR('farmPlotActions').querySelectorAll('[data-farm-sort]')) {
        BUTTON.disabled = LOCKED;
    }
}
function stopGrowthPreview() {
    DOLLAR('abilityNodes').querySelector('.growth-evolution-preview')?.replaceChildren();
}
function mountGrowthPreview(species, tier) {
    stopGrowthPreview();
    const HOST = DOLLAR('abilityNodes').querySelector('.growth-evolution-preview');
    if (
        !HOST ||
        !['corn', 'pea', 'redbean', 'chestnut', 'peanut', 'walnut', 'rice', 'wheat', 'barley'].includes(species) ||
        !Number.isInteger(tier) ||
        tier < 1 ||
        tier > 6
    ) {
        return;
    }
    const FRAME = document.createElement('iframe');
    FRAME.title = `${{ pea: '콩', corn: '옥수수', redbean: '팥', chestnut: '밤톨', peanut: '땅콩', walnut: '호두', rice: '쌀', wheat: '밀', barley: '보리' }[species]} T${tier} 공격 미리보기`;
    FRAME.src = new URL(`?help=${species}-t${tier}`, location.href).href.split('#')[0];
    HOST.replaceChildren(FRAME);
    for (const BUTTON of DOLLAR('abilityNodes').querySelectorAll('[data-growth-preview-tier]')) {
        BUTTON.setAttribute('aria-pressed', String(Number(BUTTON.dataset.growthPreviewTier) === tier));
    }
    DOLLAR('abilityNodes').querySelector('[data-growth-preview-caption]').textContent =
        `T${tier} · 공격 미리보기 0.6배속 · 같은 단계를 누르면 다시 재생`;
}
function drawAbilityTree() {
    stopGrowthPreview();
    const W = personalGarden || active.world,
        IN_COMBAT = W.farmBossEvent?.phase !== 'idle' || W.tower.active;
    const SELECTED_SPECIES = Number(DOLLAR('abilityPanel').dataset.selectedSpecies || 0);
    const MASTERY_DEFINITION = SPECIES_ABILITY_DEFINITIONS.find(
        (definition) => definition.species === SELECTED_SPECIES,
    );
    DOLLAR('abilityPoints').textContent = String(
        MASTERY_DEFINITION ? getAbilityPointsLeft(W.playerProgression, MASTERY_DEFINITION.id) : 0,
    );
    for (const BUTTON of DOLLAR('abilitySpeciesTabs').querySelectorAll('[data-ability-species]')) {
        BUTTON.setAttribute('aria-pressed', String(Number(BUTTON.dataset.abilitySpecies) === SELECTED_SPECIES));
    }
    DOLLAR('abilityNodes').innerHTML = renderAbilityTreeMarkup(W.playerProgression, {
        highestSpeciesTier: W.highestSpeciesTiers(),
        location: active.world.scene,
        inCombat: IN_COMBAT,
        runActive: W.tower.active,
        selectedSpecies: SELECTED_SPECIES,
    });
    abilityTreeProgression = W.playerProgression;
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
        IN_COMBAT = W.farmBossEvent?.phase !== 'idle' || W.tower.active,
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
    stopGrowthPreview();
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
    HELP_PANEL.setVisible(menuOpen && tab === 'help');
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
    RELIC_DOCK.closeDetail();
    BOSS_RELIC_DOCK.closeDetail();
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
    stopGrowthPreview();
    HELP_PANEL.setVisible(false);
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
let workSliderHeld = false;
DOLLAR('workCutA').addEventListener('pointerdown', () => {
    workSliderHeld = true;
});
for (const EVENT of ['pointerup', 'pointercancel']) {
    window.addEventListener(EVENT, () => {
        workSliderHeld = false;
    });
}
DOLLAR('workCutA').addEventListener('input', () => {
    paintRange(DOLLAR('workCutA'));
    const CUT = Number(DOLLAR('workCutA').value),
        POINTS = (100 - CUT) * 100;
    saveWorkSetting(POINTS);
    (personalGarden || active.world).setWorkBasisPoints(POINTS);
    active.queue('farm-work', { basisPoints: POINTS });
    farmPanelRevision = -1;
});
DOLLAR('progressionResetActions').onclick = (event) => {
    const BUTTON = event.target.closest('button[data-progression-reset]');
    if (!BUTTON || BUTTON.disabled) {
        return;
    }
    const SCOPE = BUTTON.dataset.progressionReset === 'all' ? { type: 'all' } : currentProgressionResetScope();
    if (SCOPE) {
        active.queue('progression-reset', { scope: SCOPE });
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
    const PREVIEW = e.target.closest('[data-growth-preview-tier]');
    if (PREVIEW) {
        mountGrowthPreview(PREVIEW.dataset.growthPreviewSpecies, Number(PREVIEW.dataset.growthPreviewTier));
        return;
    }
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
// Holding a finger down opens the browser's context menu on touch screens; the game owns long presses.
document.addEventListener('contextmenu', (event) => {
    if (!event.target.closest?.('input, textarea')) {
        event.preventDefault();
    }
});
// Compare with the actual DOM so event handlers and route changes remain authoritative.
const FLOOR_KIND = { battle: '전투', elite: '정예', mid: '중간 보스', power: '강화', event: '이벤트' };
const DOOR_TEXT = {
    battle: '보스 전원 처치',
    elite: '더 세지만 보상 ×2',
    mid: '피할 수 없어요 · 보상 ×3',
};
const NEXT_FLOOR_TEXT = {
    battle: '전투 준비 · 싸울 상대를 고르세요',
    mid: '중간 보스 · 피할 수 없어요',
    power: '강화 · 카드 한 장을 고르세요',
    event: '이벤트',
};
function statDoorCard(door, cards, index, role = 'player', receipt = null) {
    const CARD = statCard(door.id),
        LEVEL = receipt?.before.level ?? cardStacks(cards, door.id);
    return `<button type="button" class="door door--stat door--rarity-${door.rarity}" data-door="${index}"><b>${CARD.name} ${statCardText(CARD, door.rarity, role)}</b><small>${RARITY_NAMES[door.rarity]} · ${role === 'boss' ? '보스 진영' : '모든 아군'} · ${LEVEL}/${TOWER_RUN_SETTINGS.cardCap}장</small></button>`;
}
function passiveDoorCard(door, cards, index, role = 'player', receipt = null) {
    const CARD = passiveCard(door.id),
        LEVEL = receipt?.before.level ?? cardStacks(cards, door.id),
        EFFECT = passiveEffectText(CARD, cardValue(CARD, door.rarity, role), role);
    return `<button type="button" class="door door--passive door--rarity-${door.rarity}" data-door="${index}"><b>${CARD.name}</b><small>${RARITY_NAMES[door.rarity]} · ${EFFECT} · ${LEVEL}/${TOWER_RUN_SETTINGS.cardCap}장</small></button>`;
}
function skillDoorCard(tower, door, index, role = 'player', receipt = null) {
    const DEFINITION = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === door.id),
        LEVEL = receipt?.before.level ?? (tower.relics.get(door.id) || 0),
        GAIN = LEVEL ? `Lv.${LEVEL} → ${LEVEL + 1}` : '새 기술';
    return `<button type="button" class="door door--skill" data-door="${index}"><b>${RELIC_ICONS[door.id]} ${DEFINITION.name}</b><small>${GAIN} · ${relicEffectText(DEFINITION, LEVEL + 1, role)}</small></button>`;
}
function eventDoorCard(door, index) {
    const EVENT = TOWER_EVENTS.find((item) => item.id === door.id);
    return `<button type="button" class="door door--event" data-door="${index}"><b>${EVENT.name}</b><small>${EVENT.text}</small></button>`;
}
function doorCard(tower, door, index, role = 'player', receipt = null) {
    if (door.type === 'fight') {
        return `<button type="button" class="door door--${door.kind}" data-door="${index}"><b>${FLOOR_KIND[door.kind]}</b><small>${DOOR_TEXT[door.kind]}</small></button>`;
    }
    if (door.type === 'stat') {
        return statDoorCard(door, tower.cards, index, role, receipt);
    }
    if (door.type === 'passive') {
        return passiveDoorCard(door, tower.cards, index, role, receipt);
    }
    return door.type === 'skill' ? skillDoorCard(tower, door, index, role, receipt) : eventDoorCard(door, index);
}
let bannerKey = '';
let bannerTimer = 0;
let doorKey = '';
let tintFloor = -1;
let doorAnnouncementTower = null;
let doorAnnouncementSerial = 0;
function bossCardName(card) {
    return card?.type === 'skill'
        ? FORMATION_SKILL_DEFINITIONS.find((item) => item.id === card.id)?.name
        : card?.type === 'stat'
          ? statCard(card.id)?.name
          : card?.type === 'passive'
            ? passiveCard(card.id)?.name
            : '';
}
function acquisitionText(receipt) {
    return receipt.card.type === 'skill' ? relicAcquisitionText(receipt) : cardAcquisitionText(receipt);
}
function readonlyDoor(button, label, selected) {
    button.removeAttribute('data-door');
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.tabIndex = -1;
    button.dataset.selected = String(selected);
    let badge = button.querySelector('.door__selected');
    if (selected && !badge) {
        badge = document.createElement('span');
        badge.className = 'door__selected';
        button.append(badge);
    }
    if (badge) {
        badge.textContent = label;
        badge.hidden = !selected;
    }
}
function syncBossChoice(tower, draw, phase) {
    const HOST = DOLLAR('doorCards'),
        OWNER = phase === 'receipt' ? 'player' : 'boss',
        RAIL_KEY = `${draw.serial}:${OWNER}`;
    if (HOST.dataset.receipt !== RAIL_KEY) {
        HOST.dataset.receipt = RAIL_KEY;
        if (phase === 'receipt') {
            HOST.innerHTML = doorCard(tower, draw.player.card, 0, 'player', draw.player);
            HOST.firstElementChild.dataset.playerReceipt = 'true';
        } else {
            const PREVIEW = { cards: draw.offerState.cards, relics: new Map(draw.offerState.relics) };
            HOST.innerHTML = draw.offers.map((card, index) => doorCard(PREVIEW, card, index, 'boss')).join('');
        }
    }
    for (const [INDEX, BUTTON] of [...HOST.children].entries()) {
        if (phase === 'receipt') {
            readonlyDoor(BUTTON, '✓ 내 카드 획득', true);
        } else {
            BUTTON.dataset.bossOffer = String(INDEX);
            readonlyDoor(
                BUTTON,
                '✓ 보스 선택',
                ['selected', 'outcome'].includes(phase) && INDEX === draw.selectedIndex,
            );
        }
    }
}
function syncCardReceipts(tower, draw, phase) {
    const HOST = DOLLAR('doorReceipts'),
        VISIBLE = !!draw && ['receipt', 'outcome', ''].includes(phase);
    HOST.hidden = !VISIBLE;
    if (!VISIBLE) {
        return;
    }
    const KEY = `${draw.serial}:${phase}`;
    if (HOST.dataset.receipt !== KEY) {
        HOST.dataset.receipt = KEY;
        HOST.dataset.phase = phase || 'summary';
        HOST.replaceChildren();
        for (const RECEIPT of phase === 'receipt'
            ? [draw.player]
            : phase === 'outcome'
              ? [draw.receipt]
              : [draw.player, draw.receipt]) {
            if (!RECEIPT) {
                continue;
            }
            const ROW = document.createElement('p'),
                TITLE = document.createElement('b'),
                EFFECT = document.createElement('span');
            ROW.dataset.role = RECEIPT.role;
            ROW.dataset.cardType = RECEIPT.card.type;
            TITLE.textContent = `${RECEIPT.role === 'boss' ? '보스 획득' : '내 카드'} · ${bossCardName(RECEIPT.card)}`;
            EFFECT.textContent = acquisitionText(RECEIPT);
            ROW.append(TITLE, EFFECT);
            HOST.append(ROW);
        }
        if (draw.status === 'maxed') {
            const EMPTY = document.createElement('p');
            EMPTY.dataset.role = 'boss';
            EMPTY.textContent = '보스 카드 없음 · 모든 후보 강화 완료';
            HOST.append(EMPTY);
        }
    }
    if (doorAnnouncementTower !== tower) {
        doorAnnouncementTower = tower;
        doorAnnouncementSerial = 0;
    }
    if (['outcome', ''].includes(phase) && doorAnnouncementSerial !== draw.serial) {
        doorAnnouncementSerial = draw.serial;
        syncText(
            'doorAnnouncement',
            [draw.player, draw.receipt]
                .filter(Boolean)
                .map(
                    (receipt) =>
                        `${receipt.role === 'boss' ? '보스 획득' : '내 카드 획득'} · ${bossCardName(receipt.card)}. ${acquisitionText(receipt)}`,
                )
                .join('. ') + (draw.status === 'maxed' ? '. 보스 카드 없음 · 모든 후보 강화 완료' : ''),
        );
    }
}
// The tower: a rail of floors that steps up, a banner for every new floor, and doors between floors.
function syncTower(garden, home, event) {
    const T = garden.tower,
        CLIMBING = T.active && !home,
        BEST = garden.playerProgression.towerBest,
        SUMMIT = CLIMBING && T.phase === 'summit';
    const SUMMIT_DIALOG = DOLLAR('towerSummit');
    if (SUMMIT_DIALOG.hidden === SUMMIT) {
        SUMMIT_DIALOG.hidden = !SUMMIT;
        if (SUMMIT) {
            stopWorldInput();
            DOLLAR('summitSkip').focus();
        } else if (!home) {
            DOLLAR('bossChallenge').focus();
        }
    }
    syncFlag('gameplayDock', 'hidden', SUMMIT);
    const TINT = DOLLAR('towerTint');
    if (TINT.dataset.on !== String(CLIMBING)) {
        TINT.dataset.on = String(CLIMBING);
    }
    if (CLIMBING && tintFloor !== T.floor) {
        tintFloor = T.floor;
        TINT.style.setProperty('--floor', String(T.floor));
    }
    const SLEEPERS = T.sleepUntil.size;
    syncFlag('floorChip', 'hidden', !CLIMBING);
    if (CLIMBING) {
        syncText('floorNow', `${T.floor}층 · ${towerTheme(T.floor).name}`);
    }
    // A banner announces each new floor as the boss drops in, and the rest stop.
    const NEXT_BANNER = !CLIMBING
        ? ''
        : (T.kind === 'power' || T.kind === 'event') && T.doors.length
          ? `r${T.floor}`
          : event?.phase === 'dropping'
            ? `e${event.encounterId}`
            : '';
    if (NEXT_BANNER && NEXT_BANNER !== bannerKey) {
        DOLLAR('floorBannerNum').textContent = `${T.floor}층`;
        DOLLAR('floorBannerKind').textContent = `${towerTheme(T.floor).name} · ${FLOOR_KIND[T.kind]}`;
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
    const DRAW = T.bossCardDraw,
        DRAW_LOCKED = CLIMBING && garden.time < (DRAW?.until || 0),
        BOSS_CHOICE = DRAW_LOCKED && Array.isArray(DRAW.offers),
        PHASE = BOSS_CHOICE ? cardChoicePhase(DRAW, garden.time) : '',
        DOORS = CLIMBING && event?.phase === 'idle' && (T.doors.length > 0 || BOSS_CHOICE);
    syncFlag('towerDoors', 'hidden', !DOORS);
    if (DOORS) {
        const KEY = `${JSON.stringify(T.doors)}|${T.floor}|${SLEEPERS}|${T.cards.length}|${T.relics.size}|${DRAW?.serial || 0}|${BOSS_CHOICE}|${PHASE}`;
        syncData('towerDoors', 'owner', BOSS_CHOICE ? 'boss' : 'player');
        syncData('towerDoors', 'phase', PHASE);
        if (KEY !== doorKey) {
            doorKey = KEY;
            if (BOSS_CHOICE) {
                syncBossChoice(T, DRAW, PHASE);
            } else {
                DOLLAR('doorCards').dataset.receipt = '';
                DOLLAR('doorCards').innerHTML = T.doors.map((door, i) => doorCard(T, door, i)).join('');
            }
        }
        syncCardReceipts(T, DRAW, PHASE);
        if (BOSS_CHOICE) {
            syncText(
                'doorsTitle',
                PHASE === 'receipt'
                    ? '내 카드 확정'
                    : PHASE === 'offers'
                      ? '보스의 카드 선택'
                      : `보스 선택 · ${bossCardName(DRAW.card)}`,
            );
            syncText(
                'doorsNote',
                PHASE === 'receipt'
                    ? '획득한 강화가 적용됐어요'
                    : PHASE === 'outcome'
                      ? '선택한 강화는 다음 보스부터 적용돼요'
                      : '보스 차례 · 같은 카드풀에서 한 장을 선택해요',
            );
        } else {
            syncText('doorsTitle', `${T.floor + 1}층 ${NEXT_FLOOR_TEXT[T.nextKind]}`);
            syncText(
                'doorsNote',
                DRAW
                    ? `최근 강화 · ${DRAW.floor}층 · 다음 문을 고르세요`
                    : `${T.floor}층 돌파 · 잠든 병력 ${SLEEPERS}마리 · 강화 카드 ${T.cards.length}장`,
            );
        }
    } else {
        doorKey = '';
        doorPointerPress = null;
        DOLLAR('doorCards').dataset.receipt = '';
        DOLLAR('doorReceipts').dataset.receipt = '';
        if (!T.active) {
            doorAnnouncementTower = null;
            doorAnnouncementSerial = 0;
            syncText('doorAnnouncement', '');
        }
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
// The deploy order. Before the climb the deck dialog sets it (tap two cards to swap them); a fight sends everyone
// in by itself in this order, and tapping a card during the fight puts that species in front.
const DEPLOY_ORDER_KEY = 'budmori.deploy.order';
function loadDeployOrder(world) {
    try {
        world.setDeployOrder(JSON.parse(localStorage.getItem(DEPLOY_ORDER_KEY) || 'null'));
    } catch {
        /* The default order stands. */
    }
}
function saveDeployOrder(order) {
    try {
        localStorage.setItem(DEPLOY_ORDER_KEY, JSON.stringify(order));
    } catch {
        /* Applies for this run. */
    }
}
function deckCardHtml(id, count, slot) {
    const SPECIES = speciesById(id);
    return `<button type="button" class="deck-card" data-deploy="${id}" aria-label="${slot}번 ${SPECIES.name}"><i>${slot}</i><img src="./assets/troops/${SPECIES.asset}" alt="" width="40" height="40" draggable="false"><b>×${count}</b></button>`;
}
function ownedCounts(garden) {
    const COUNTS = new Map();
    for (const UNIT of garden.units) {
        if (UNIT.faction === 'player' && !UNIT.isBattleOnlySummon && UNIT.hp > 0) {
            COUNTS.set(UNIT.species, (COUNTS.get(UNIT.species) || 0) + 1);
        }
    }
    return COUNTS;
}
// In a fight: the species still waiting, front first.
const BATTLE_COMMAND_NOTES = Object.freeze({
    engage: '사거리까지 접근해 공격해요',
    scatter: '간격을 넓히며 공격해요',
    retreat: '공격을 멈추고 적에게서 물러나요',
});
function syncBattleCommands(garden, visible, counts) {
    syncFlag('battleCommands', 'hidden', !visible);
    if (!visible) {
        return;
    }
    syncText('frontlineStatus', `전선 ${counts.fighters}/${garden.frontlineLimit} · 예비대 ${counts.reserves}`);
    syncText('battleCommandNote', BATTLE_COMMAND_NOTES[garden.battleCommand]);
    for (const INPUT of DOLLAR('battleCommands').querySelectorAll('input')) {
        INPUT.checked = INPUT.value === garden.battleCommand;
    }
}
function syncHand(garden, visible, counts) {
    const COUNTS = counts?.hand,
        IDS = visible ? garden.deployOrder.filter((id) => COUNTS.has(id)) : [],
        KEY = IDS.map((id) => `${id}x${COUNTS.get(id)}`).join(',');
    syncFlag('hand', 'hidden', !visible || IDS.length < 2);
    if (KEY !== handKey) {
        handKey = KEY;
        DOLLAR('handCards').innerHTML = IDS.map((id, slot) => deckCardHtml(id, COUNTS.get(id), slot + 1)).join('');
    }
}
DOLLAR('handCards').addEventListener('click', (e) => {
    const BUTTON = e.target.closest('[data-deploy]');
    if (BUTTON) {
        const FIRST = Number(BUTTON.dataset.deploy),
            ORDER = [FIRST, ...personalGarden.deployOrder.filter((id) => id !== FIRST)];
        saveDeployOrder(ORDER);
        active.queue('deploy-order', { order: ORDER });
    }
});
function canUseWorldInput() {
    return !home && !menuOpen && !active.paused && !farmSortTransition;
}
function canUseCamera() {
    return (
        canUseWorldInput() &&
        active.world.scene === 'farm' &&
        active.world.farmBossEvent?.phase !== 'marching' &&
        active.world.tower?.phase !== 'summit' &&
        !RENDERER.cameraDirected &&
        ![...document.querySelectorAll('[aria-modal="true"]')].some(
            (node) => !node.hidden && node.getClientRects().length,
        )
    );
}
function cameraPlace() {
    const WORLD = active.world;
    return WORLD.insideTower ? 'tower:' + WORLD.tower.floor : WORLD.scene;
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
function pointerSpan() {
    const [A, B] = [...CAMERA_POINTERS.values()];
    return B
        ? { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, distance: Math.hypot(A.x - B.x, A.y - B.y) }
        : { ...A, distance: 0 };
}
function rebaseCameraGesture() {
    const SPAN = CAMERA_POINTERS.size ? pointerSpan() : null;
    cameraGesture = SPAN
        ? {
              ...SPAN,
              zoom: RENDERER.zoom,
              anchor: RENDERER.screenToWorld(SPAN.x, SPAN.y),
              place: cameraPlace(),
              world: active.world,
          }
        : null;
}
function stopWorldInput() {
    const IDS = [...CAMERA_POINTERS.keys()];
    CAMERA_POINTERS.clear();
    cameraGesture = null;
    for (const ID of IDS) {
        if (CANVAS.hasPointerCapture(ID)) {
            CANVAS.releasePointerCapture(ID);
        }
    }
}
function endCameraPointer(event) {
    if (!CAMERA_POINTERS.delete(event.pointerId)) {
        return;
    }
    if (CANVAS.hasPointerCapture(event.pointerId)) {
        CANVAS.releasePointerCapture(event.pointerId);
    }
    rebaseCameraGesture();
}
CANVAS.addEventListener(
    'wheel',
    (event) => {
        if (!canUseCamera()) {
            return;
        }
        const UNIT = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? CANVAS.clientHeight : 1;
        RENDERER.takeCameraControl();
        RENDERER.zoomAt(Math.exp(clamp(-event.deltaY * UNIT * 0.0016, -4, 4)), event.clientX, event.clientY);
        event.preventDefault();
    },
    { passive: false },
);
CANVAS.addEventListener('pointerdown', (event) => {
    FOOD_FEEL.unlock();
    if (event.button !== 0 || !canUseCamera()) {
        return;
    }
    if (!CAMERA_POINTERS.size) {
        suppressCanvasClick = false;
    }
    CAMERA_POINTERS.set(event.pointerId, { x: event.clientX, y: event.clientY });
    suppressCanvasClick ||= CAMERA_POINTERS.size > 1;
    rebaseCameraGesture();
    CANVAS.setPointerCapture(event.pointerId);
    event.preventDefault();
});
CANVAS.addEventListener('pointermove', (event) => {
    if (!CAMERA_POINTERS.has(event.pointerId)) {
        return;
    }
    if (!canUseCamera() || cameraGesture?.place !== cameraPlace() || cameraGesture.world !== active.world) {
        stopWorldInput();
        return;
    }
    CAMERA_POINTERS.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const SPAN = pointerSpan(),
        DX = SPAN.x - cameraGesture.x,
        DY = SPAN.y - cameraGesture.y;
    // A small single-pointer movement stays a tap; multi-touch always owns the gesture.
    if (!suppressCanvasClick && Math.hypot(DX, DY) < 5) {
        return;
    }
    suppressCanvasClick = true;
    RENDERER.takeCameraControl();
    if (SPAN.distance > 0 && cameraGesture.distance > 0) {
        // Keep an absolute baseline: sequential pointer events may temporarily hit
        // a zoom limit even when both fingers are simply translating together.
        RENDERER.zoomAt(
            (cameraGesture.zoom * SPAN.distance) / (cameraGesture.distance * RENDERER.zoom),
            SPAN.x,
            SPAN.y,
        );
    }
    const POINT = RENDERER.project(cameraGesture.anchor.x, cameraGesture.anchor.y),
        RECT = CANVAS.getBoundingClientRect();
    RENDERER.panByScreen(
        SPAN.x - RECT.left - POINT.x / RENDERER.pixelRatio,
        SPAN.y - RECT.top - POINT.y / RENDERER.pixelRatio,
    );
    event.preventDefault();
});
CANVAS.addEventListener(
    'click',
    (event) => {
        if (suppressCanvasClick) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    },
    true,
);
CANVAS.addEventListener('lostpointercapture', endCameraPointer);
window.addEventListener('pointerup', endCameraPointer, true);
window.addEventListener('pointercancel', endCameraPointer, true);
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
    if (frameRequest === null) {
        return;
    }
    cancelAnimationFrame(frameRequest);
    frameRequest = null;
    graphicsRecovery = null;
    stopWorldInput();
    persist();
    if (!home) {
        markSeen();
    }
    active.dispose();
    HUD_COUNTS.dispose();
    unsubscribeProgress?.();
    unsubscribeProgress = null;
    RENDERER.dispose();
});
const GRAPHICS_RECOVERY_MESSAGE = '그래픽 화면을 복구하고 있어요.';
function suspendGraphics() {
    if (frameRequest === null || active.closed) {
        return;
    }
    if (!graphicsRecovery) {
        stopWorldInput();
        persist();
        graphicsRecovery = { revision: 0, failed: false };
    }
    active.suspendClock();
    if (DOLLAR('error').hidden) {
        DOLLAR('error').hidden = false;
        DOLLAR('error').textContent = GRAPHICS_RECOVERY_MESSAGE;
    }
}
CANVAS.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    suspendGraphics();
    if (graphicsRecovery) {
        graphicsRecovery.revision++;
    }
});
CANVAS.addEventListener('webglcontextrestored', () => {
    const RECOVERY = graphicsRecovery,
        REVISION = RECOVERY?.revision;
    // SDK resource listeners, including lazily created painters, finish first.
    setTimeout(() => {
        if (!RECOVERY || graphicsRecovery !== RECOVERY || RECOVERY.revision !== REVISION || RECOVERY.failed) {
            return;
        }
        if (frameRequest === null || active.closed) {
            graphicsRecovery = null;
            return;
        }
        if (RENDERER.device.gl.isContextLost()) {
            return;
        }
        if ([RENDERER.device, RENDERER.ctx, RENDERER.meshes].some((owner) => owner.state !== 'ready')) {
            RECOVERY.failed = true;
            FAIL(Error('그래픽 화면을 복구하지 못했어요. 새로고침해 다시 이어가 주세요.'));
            return;
        }
        if (HELP.scene) {
            HELP.last = performance.now();
        }
        active.resumeClock();
        graphicsRecovery = null;
        if (DOLLAR('error').textContent === GRAPHICS_RECOVERY_MESSAGE) {
            DOLLAR('error').hidden = true;
            DOLLAR('error').textContent = '';
        }
    }, 0);
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
    if (home && !resumeMemoryRun(false)) {
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
        MERGE_CACHE = mergeAvailability(W, now),
        MERGE_STATUS = MERGE_CACHE.value,
        COMBINE_STATUS = MERGE_CACHE.combine;
    syncBossRewardDialog(REWARD_WORLD);
    if (cameraGesture && (!canUseCamera() || cameraGesture.place !== cameraPlace() || cameraGesture.world !== W)) {
        stopWorldInput();
    }
    syncFlag('merge', 'disabled', home || FARM_EVENT_ACTIVE || !MERGE_STATUS.available);
    syncData('merge', 'availability', MERGE_STATUS.code || 'unavailable');
    syncFlag('mergeNotice', 'hidden', home || FARM_EVENT_ACTIVE);
    syncAttribute('merge', 'aria-label', `합성${MERGE_STATUS.available ? '' : ' 불가'} · ${MERGE_STATUS.reason}`);
    syncText('mergeNotice', MERGE_STATUS.reason);
    syncFlag('combine', 'disabled', home || FARM_EVENT_ACTIVE || (W.combine.recipe >= 0 && !COMBINE_STATUS.available));
    syncData('combine', 'availability', COMBINE_STATUS.code || 'unavailable');
    syncAttribute('combine', 'aria-label', `조합${COMBINE_STATUS.available ? '' : ' 불가'} · ${COMBINE_STATUS.reason}`);
    const WORLD_COUNT = HUD_COUNTS.worldPopulation(W),
        BATTLE_VISIBLE = !home && fightActive(),
        BATTLE_COUNTS = BATTLE_VISIBLE ? HUD_COUNTS.battleCounts(W) : null;
    let armyCurrent = 0;
    let armyMax = 0;
    let armyLiving = 0;
    let armyTotal = 0;
    for (const UNIT of display.units) {
        if (UNIT.faction === CONFIG.factions.PLAYER) {
            armyCurrent += Math.max(0, Math.min(UNIT.maxHp, UNIT.hp));
            armyMax += UNIT.maxHp;
            armyLiving += UNIT.hp > 0 ? 1 : 0;
            armyTotal++;
        }
    }
    syncFlag('farmControls', 'hidden', FARM_EVENT_ACTIVE || home || W.tower.active);
    syncFlag('workHud', 'hidden', FARM_EVENT_ACTIVE || home || W.tower.active);
    syncTower(W, home, FARM_EVENT);
    syncFlag(
        'bossbar',
        'hidden',
        !FARM_EVENT_ACTIVE || home || FARM_EVENT.phase === 'marching' || W.tower.phase === 'summit',
    );
    syncBattleCommands(W, BATTLE_VISIBLE, BATTLE_COUNTS);
    syncHand(W, BATTLE_VISIBLE, BATTLE_COUNTS);
    syncText('count', WORLD_COUNT);
    syncText('capacity', personalGarden?.capacity ?? CONFIG.farm.capacity.max);
    const PROGRESSION = (personalGarden || W).playerProgression,
        LEVEL = overallLevel(PROGRESSION),
        LEVEL_START = overallXpForLevel(LEVEL),
        NEXT_LEVEL = overallXpForLevel(LEVEL + 1);
    syncText('overallLevel', `전체 Lv.${LEVEL}`);
    syncText(
        'overallXp',
        NEXT_LEVEL > LEVEL_START
            ? `${PROGRESSION.overallXp - LEVEL_START}/${NEXT_LEVEL - LEVEL_START} XP`
            : '정원 최대',
    );
    syncAttribute(
        'overallGrowth',
        'title',
        `전체 XP ${PROGRESSION.overallXp} · 농장 정원 ${W.capacity} · 다음 전선 ${Math.floor(W.capacity / 2)}`,
    );
    syncText(
        'starter',
        PENDING_REWARD
            ? '씨앗 보상 대기 · 공간이 생기면 합류해요'
            : !HAS_READY_TROOPS
              ? '모두 잠자는 중 · 회복을 기다려요'
              : WORLD_COUNT >= W.capacity
                ? '농장이 가득 찼어요'
                : '번식으로 식구를 늘려요',
    );
    syncWidth('allyHealth', (armyMax ? (armyCurrent / armyMax) * 100 : 0) + '%');
    syncText(
        'allyHealthText',
        Math.ceil(armyCurrent) + '/' + Math.ceil(armyMax) + ' · ' + armyLiving + '/' + armyTotal + '마리',
    );
    const BOSS = display.boss,
        BOSSES = display.bosses,
        BOSS_HP = BOSSES.reduce((total, boss) => total + Math.max(0, boss.hp), 0),
        BOSS_MAX_HP = BOSSES.reduce((total, boss) => total + boss.maxHp, 0),
        ENCOUNTER = W.bossEncounter,
        BOSS_TOTAL = ENCOUNTER?.roster.length || 1,
        BOSS_LIVING = BOSSES.filter((boss) => boss.hp > 0).length,
        BOSS_PENDING = ENCOUNTER ? Math.max(0, BOSS_TOTAL - ENCOUNTER.nextIndex) : 0,
        FARM_REWARD =
            FARM_EVENT?.outcome === 'victory'
                ? W.bossRewardReceipts.find(
                      (reward) => reward.source === 'farm' && reward.encounterId === FARM_EVENT.encounterId,
                  )
                : null,
        REWARD_NAME = '씨앗',
        ENCOUNTER_NAME = giantSpeciesName(BOSS.species);
    syncText(
        'bossName',
        W.tower.active
            ? `${BOSS.stage}층 · ${BOSS.isFinalBoss ? '최종 수호자' : `보스 ${BOSS_LIVING}/${BOSS_TOTAL}`}`
            : ENCOUNTER_NAME,
    );
    syncAttribute('bossHealth', 'aria-label', '등장한 보스 합계 체력');
    syncText('bossHealthText', Math.ceil(BOSS_HP) + '/' + Math.round(BOSS_MAX_HP));
    syncText(
        'bossHealthNote',
        FARM_EVENT_ACTIVE && FARM_EVENT.phase === 'dropping'
            ? '보스가 있는 칸으로 가는 중이에요'
            : FARM_EVENT_ACTIVE && FARM_EVENT.phase === 'fighting'
              ? W.bossEnraged
                  ? '격노! 피해 2배, 공격이 빨라져요'
                  : BOSS_PENDING > 0
                    ? `남은 합류 ${BOSS_PENDING} · ${Math.max(0, Math.ceil(ENCOUNTER.nextJoinAt - ENCOUNTER.elapsed))}초 후 증원`
                    : `전원 등장 · 격노까지 ${Math.max(0, Math.ceil(W.battleTimeLimit() - FARM_EVENT.elapsed))}초`
              : FARM_EVENT_ACTIVE
                ? ''
                : '쓰러진 병력 포함 최대 체력',
    );
    syncFlag('fightRetreat', 'hidden', !(FARM_EVENT_ACTIVE && ['dropping', 'fighting'].includes(FARM_EVENT.phase)));
    syncAttribute('allyHealth', 'aria-valuenow', armyCurrent);
    syncAttribute('allyHealth', 'aria-valuemax', armyMax);
    syncAttribute('bossHealth', 'aria-valuenow', BOSS_HP);
    syncAttribute('bossHealth', 'aria-valuemax', BOSS_MAX_HP);
    syncWidth('bossHealth', BOSS_MAX_HP ? (BOSS_HP / BOSS_MAX_HP) * 100 + '%' : '0%');
    syncText(
        'battleOutcome',
        BATTLE_OUTCOME === 'victory'
            ? FARM_EVENT.rewardStatus === 'granted'
                ? `${BOSS.stage}층 돌파 · 새 기록! ${REWARD_NAME} ${rewardReceiptSummary(FARM_REWARD)} · 농장에 합류했어요`
                : FARM_EVENT.rewardStatus === 'pending'
                  ? `${BOSS.stage}층 돌파 · 새 기록! ${REWARD_NAME} ${rewardReceiptSummary(FARM_REWARD)} · 공간이 생기면 합류해요`
                  : W.tower.record
                    ? `${BOSS.stage}층 돌파 · 새 기록!`
                    : `${BOSS.stage}층 돌파 · 전체 성장 XP 획득`
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
    syncAttribute('startFloor', 'max', highestTowerStartFloor(BEST_FLOOR));
    if (document.activeElement !== DOLLAR('startFloor') && DOLLAR('startFloor').value !== String(START_FLOOR)) {
        DOLLAR('startFloor').value = String(START_FLOOR);
    }
    paintRange(DOLLAR('startFloor'));
    syncText(
        'startFloorValue',
        `시작 ${START_FLOOR}층 · 최고 시작 ${highestTowerStartFloor(BEST_FLOOR)} · 기록 ${BEST_FLOOR}층`,
    );
    syncText('bossChallenge', '탑 오르기');
    syncFlag('bossChallenge', 'hidden', FARM_EVENT_ACTIVE || home);
    syncAttribute('bossChallenge', 'aria-disabled', String(raidStartBlockReason() !== ''));
    syncFlag('menuTabFarms', 'disabled', FARM_EVENT_ACTIVE);
    syncFlag('menuTabAbilities', 'disabled', !personalGarden);
    const WORK_WORLD = personalGarden || W,
        WORKERS = WORK_WORLD.workerCount,
        CUT = workCut(WORK_WORLD),
        PLAN = plannedWorkers(WORK_WORLD),
        BREEDERS = PLAN.total - PLAN.workers;
    let note = `일꾼 ${WORKERS}마리 · 먹이 ${WORK_WORLD.workFoodPerMinute.toFixed(1)}/분`,
        warn = false;
    if (WORK_WORLD.warehouseFull) {
        note = '농장에 먹이가 가득해요 · 일꾼은 쉬는 중이에요';
        warn = true;
    } else if (WORKERS === 0) {
        note = '일꾼이 없어서 먹이가 안 만들어져요';
        warn = true;
    }
    DOLLAR('workCutA').disabled = !!farmSortTransition;
    if (document.activeElement !== DOLLAR('workCutA') && !workSliderHeld) {
        DOLLAR('workCutA').value = String(CUT);
    }
    syncText('workHudNote', note);
    syncText('workHudBreed', `번식 ${BREEDERS}`);
    syncText('workHudFood', `먹이 ${PLAN.workers}`);
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
    if (frameRequest === null) {
        return;
    }
    if (graphicsRecovery || RENDERER.device.gl.isContextLost()) {
        suspendGraphics();
        frameRequest = requestAnimationFrame(frame);
        return;
    }
    try {
        PERFORMANCE_DIAGNOSTICS.beginFrame(now);
        active.profiler = PERFORMANCE_DIAGNOSTICS;
        active.world.profiler = PERFORMANCE_DIAGNOSTICS;
        const SIMULATION_START = PERFORMANCE_DIAGNOSTICS.start();
        const CLOCK = HELP.scene ? HELP.clock(now) : now;
        if (!home && !document.hidden) {
            active.pulse(CLOCK);
            HELP.scenario?.pulse(CLOCK);
        }
        PERFORMANCE_DIAGNOSTICS.end('simulation', SIMULATION_START);
        const PRESENTATION_START = PERFORMANCE_DIAGNOSTICS.start();
        const DISPLAY = active.presentation(CLOCK),
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
            !home && !menuOpen && active.world.tower.active && active.world.farmBossEvent?.phase !== 'idle',
        );
        BOSS_RELIC_DOCK.update(
            active.world,
            DISPLAY,
            !home && !menuOpen && active.world.tower.active && !DOLLAR('bossbar').hidden,
        );
        PERFORMANCE_DIAGNOSTICS.end('ui', UI_START);
        PERFORMANCE_DIAGNOSTICS.endFrame(RENDERER);
        frameRequest = requestAnimationFrame(frame);
    } catch (error) {
        if (RENDERER.device.gl.isContextLost()) {
            PERFORMANCE_DIAGNOSTICS.endFrame(RENDERER);
            suspendGraphics();
            frameRequest = requestAnimationFrame(frame);
            return;
        }
        if (typeof globalThis.BloomReportRuntimeFatal === 'function') {
            globalThis.BloomReportRuntimeFatal(error);
        } else {
            console.error('Farm render loop stopped', error);
        }
    }
}
DOLLAR('productVersion').textContent = PRODUCT_VERSION;
DOLLAR('startVersion').textContent = PRODUCT_VERSION;
DOLLAR('settingsVersion').textContent = `v${PRODUCT_VERSION}`;
setHome(true, false);
if (location.hash && location.hash !== '#/') {
    route();
}

// A help card is this same page, loaded as ?help=<card> inside a frame: a scripted garden that plays at half speed.
const HELP = {
    scene: helpSceneById(new URLSearchParams(location.search).get('help')),
    scenario: null,
    memo: {},
    complete: false,
    scaled: 0,
    last: null,
    clock(now) {
        // The first RAF can carry the timestamp of a frame that began before
        // a long synchronous asset preparation. Never move the session clock
        // behind the current startup anchor or backwards after restoration.
        const NEXT = Math.max(this.last ?? performance.now(), now);
        this.scaled =
            this.last === null
                ? NEXT
                : this.scaled + Math.min(NEXT - this.last, HELP_MAX_FRAME_MS) * (this.scene.rate ?? HELP_PLAYBACK_RATE);
        this.last = NEXT;
        return this.scaled;
    },
    run(event) {
        if (event.cmd) {
            active.queue(event.cmd, event.args);
        } else if (event.pick !== undefined) {
            active.queue('tower-door', { index: event.pick });
        } else if (event.finish) {
            // Cuts the demo fight short; the win that follows is the game's own path.
            active.world.finishFarmBossEvent(event.finish);
        }
    },
};
sessionClockNow = () => (HELP.scene && HELP.last !== null ? HELP.scaled : performance.now());
if (HELP.scene) {
    const SCENE = HELP.scene,
        WORLD = new Garden(SCENE.seed);
    SCENE.setup(WORLD);
    RENDERER.attackPreviewSpecies = /^pea-t[1-6]$/.test(SCENE.id)
        ? 0
        : /^redbean-t[1-6]$/.test(SCENE.id)
          ? 2
          : /^chestnut-t[1-6]$/.test(SCENE.id)
            ? 3
            : /^peanut-t[1-6]$/.test(SCENE.id)
              ? 4
              : /^walnut-t[1-6]$/.test(SCENE.id)
                ? 5
                : /^rice-t[1-6]$/.test(SCENE.id)
                  ? 6
                  : /^wheat-t[1-6]$/.test(SCENE.id)
                    ? 7
                    : /^barley-t[1-6]$/.test(SCENE.id)
                      ? 8
                      : null;
    document.documentElement.classList.toggle('chestnut-attack-preview', RENDERER.attackPreviewSpecies === 3);
    document.documentElement.classList.toggle('peanut-attack-preview', RENDERER.attackPreviewSpecies === 4);
    document.documentElement.classList.toggle('walnut-attack-preview', RENDERER.attackPreviewSpecies === 5);
    document.documentElement.classList.toggle('rice-attack-preview', RENDERER.attackPreviewSpecies === 6);
    document.documentElement.classList.toggle('wheat-attack-preview', RENDERER.attackPreviewSpecies === 7);
    document.documentElement.classList.toggle('barley-attack-preview', RENDERER.attackPreviewSpecies === 8);
    start(WORLD, false);
    active.paused = false;
    HELP.scenario = globalThis.BloomGamekitScenario.createScenario({
        definition: {
            seed: SCENE.seed,
            tickRate: LOCAL_PROFILE.tickRate,
            endTick: Math.ceil((SCENE.durationMs * LOCAL_PROFILE.tickRate) / 1000),
            timeline: SCENE.timeline,
        },
        createRun: () => ({
            step: (frame) => {
                frame.events.forEach((event) => HELP.run(event));
                // A scene may also react to the run itself, e.g. choose a door once the real win has opened them.
                const REACTION = SCENE.auto?.(active.world, frame.timeMs, HELP.memo);
                if (REACTION?.door || REACTION?.cmd) {
                    HELP.run(REACTION);
                }
                HELP.complete ||= REACTION?.complete === true;
            },
            isComplete: () => HELP.complete,
            dispose() {},
        }),
        onEnd: () => {
            active.paused = true;
        },
    });
    HELP.scenario.play({ automatic: false });
    globalThis.__budmoriHelp = {
        snapshot: () => ({ ...HELP.scenario.snapshot(), step: SCENE.step(active.world) }),
    };
}
frameRequest = requestAnimationFrame(frame);
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
    get poseDiagnostics() {
        return RENDERER.meshes.poseStats();
    },
    get unitArtDiagnostics() {
        return RENDERER.unitSprites.stats();
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
