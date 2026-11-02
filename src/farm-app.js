import { LOCALE } from './i18n/locale.js';
import { RELIC } from './i18n/messages/ui-relic.js';
import { PAGE } from './i18n/messages/page.js';
import { SpeciesInfoDialog } from './ui/species-info.js';
import { PerformanceDiagnostics } from './core/performance-diagnostics.js';
import { FarmHudCounts } from './ui/farm-hud-counts.js';
import { RelicDock, relicEffectText, relicAcquisitionText } from './ui/relic-dock.js';
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
import { readFarmExport } from './save/farm-save-codec.js';
import { PlaySettings } from './save/play-settings.js';
import { isolatedPage, saveOpener } from './save/save-adapter.js';
import { FarmAutosave } from './save/farm-autosave.js';
import { snapshot, restore } from './model/farm-state.js';
import { PRODUCT_VERSION } from './version.js';
import { highestTowerStartFloor, overallLevel, overallXpForLevel } from './model/player-progression.js';
import { towerTheme, towerElement } from './tower/tower-theme.js';
import { syncBossChoiceMascot } from './ui/boss-eat.js';
import { FoodFeel } from './render/food-feel.js';
import { CombatFeel } from './render/combat-feel.js';
import { bossRewardQueueBySpecies } from './boss/boss-rewards.js';
import { BossRewardDialog } from './ui/boss-reward-dialog.js';
import { workersBySpecies } from './model/farm-work.js';
import { apportionBreedShares, adjustBreedShare } from './model/breed-allocation.js';
import { BOSS_SPECIES } from './units/species-catalog.js';
import { speciesName, giantSpeciesName } from './i18n/messages/species.js';
import { APP_HOME } from './i18n/messages/app-home.js';
import { APP_FARM } from './i18n/messages/app-farm.js';
import { APP_TOWER } from './i18n/messages/app-tower.js';
import { speciesFacePortraitSource, speciesPortraitSource } from './units/species-paint.js';
import { HELP_MAX_FRAME_MS, HELP_PLAYBACK_RATE, helpSceneById } from './ui/help-scenes.js';
import { labScene } from './debug/lab.js';
import { createHelpPanel } from './ui/help-panel.js';
import { codexHtml, CODEX_TABS } from './ui/codex-dialog.js';
import { iconSvg, mountIcons } from './ui/icons.js';
import { SeedlingReveal } from './ui/seedling-reveal.js';
import { startAppShell } from './ui/app-shell.js';
import { LanguageSetting } from './ui/language-setting.js';
const DOLLAR = (id) => document.getElementById(id),
    ISOLATED_PAGE = isolatedPage(location.search),
    OPEN_SAVE = saveOpener(location.search),
    // The game starts after both saves are read. An unreadable one keeps the start screen closed (saveLocked).
    STORAGE = await FarmStorage.open(OPEN_SAVE),
    PLAY = await PlaySettings.open(OPEN_SAVE);
const HELP_PANEL = createHelpPanel(DOLLAR);
mountIcons();
for (const PORTRAIT of document.querySelectorAll('[data-home-species]')) {
    PORTRAIT.src = speciesFacePortraitSource(Number(PORTRAIT.dataset.homeSpecies), 'happy');
}
const SEEDLING_REVEAL = new SeedlingReveal(DOLLAR('seedlingReveal'));
const BOSS_REWARD_DIALOG = new BossRewardDialog(DOLLAR('bossRewardDialog'), { onOpen: stopWorldInput });
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
let mergeHold = null;
let farmPanelRevision = -1;
// The boss card draw is presented (eaten) only once the reward dialog is gone; this is the moment it began.
let presentedDraw = null;
let presentedDrawStart = 0;
let mergeStatusCache = {
    world: null,
    revision: -1,
    updatedAt: -Infinity,
    value: null,
    combine: null,
};
const RENDERER = new Diorama(DOLLAR('world'), { deferSpritePreparation: true });
// Startup progress (src/startup-loading.js): game initialization ends here; the renderer reports its atlas stages.
globalThis.BudmoriStartup?.finish('game');
await RENDERER.prepareStartup({
    onProgress: globalThis.BudmoriStartup?.report,
    yieldControl: () => globalThis.BudmoriStartup?.yield() ?? new Promise((resolve) => setTimeout(resolve, 0)),
});
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
        return APP_TOWER.rewardNone();
    }
    if (reward.acquiredCount === 0) {
        return APP_TOWER.rewardNoSprouts();
    }
    return APP_TOWER.rewardSummary({
        acquired: reward.acquiredCount,
        placed: reward.placedCount,
        queued: reward.queuedCount,
    });
}
function latestBossReward(world) {
    const RECEIPTS = world?.bossRewardReceipts || [];
    return RECEIPTS.find((reward) => !reward.revealed) || RECEIPTS.at(-1);
}
function syncBossRewardDialog(world) {
    const RECEIPT = latestBossReward(world),
        BUTTON = DOLLAR('bossRewardOpen');
    if (home || world?.tower.phase === 'summit') {
        BOSS_REWARD_DIALOG.hide();
        BUTTON.hidden = true;
        return;
    }
    if (!DOLLAR('bossRewardDialog').hidden) {
        BOSS_REWARD_DIALOG.update(world);
    } else if (RECEIPT && !RECEIPT.revealed) {
        BOSS_REWARD_DIALOG.show(world, RECEIPT);
    }
    BUTTON.hidden = !RECEIPT || RECEIPT.revealed || !DOLLAR('bossRewardDialog').hidden;
}
DOLLAR('bossRewardOpen').addEventListener('click', () => {
    const WORLD = personalGarden || active?.world,
        RECEIPT = latestBossReward(WORLD);
    if (RECEIPT) {
        BOSS_REWARD_DIALOG.show(WORLD, RECEIPT);
    }
});
globalThis.BudmoriPerformanceDiagnostics = {
    summary: () => (active ? PERFORMANCE_DIAGNOSTICS.summary(active.world, active.paused) : []),
    snapshot: () => PERFORMANCE_DIAGNOSTICS.snapshot(30),
};
DOLLAR('diagnosticDetail').onchange = (event) => PERFORMANCE_DIAGNOSTICS.setDetailed(event.target.checked);
DOLLAR('copyDiagnostics').onclick = async () => {
    const RESULT = await globalThis.BloomDiagnostics.copy({ textarea: DOLLAR('settingsDiagnosticText') });
    DOLLAR('settingsDiagnosticText').hidden = RESULT.copied;
    DOLLAR('diagnosticStatus').textContent = RESULT.copied
        ? APP_HOME.diagnosticsCopied()
        : APP_HOME.diagnosticsSelectToCopy();
};
DOLLAR('exportDiagnostics').onclick = () => {
    const TEXT = DOLLAR('settingsDiagnosticText');
    TEXT.value = globalThis.BloomDiagnostics.detail();
    TEXT.hidden = false;
    TEXT.focus();
    TEXT.select();
    DOLLAR('diagnosticStatus').textContent = APP_HOME.diagnosticsDetail();
};
const FAIL = (error) => {
    DOLLAR('error').hidden = false;
    DOLLAR('error').textContent = APP_HOME.farmFailed({ message: error.message });
    console.error(error);
    if (active) {
        active.paused = true;
    }
};
async function writeCheckpoint(world = personalGarden) {
    if (!world) {
        return false;
    }
    const OK = await STORAGE.save(world);
    DOLLAR('saveNotice').textContent = OK ? PLAY.error : STORAGE.error;
    return OK;
}
// A refused save is shown where the player is: the start screen line, and the farm notice during play.
function showSaveError(message) {
    DOLLAR('saveNotice').textContent = message;
    if (!home) {
        say(message);
    }
}
STORAGE.onError = showSaveError;
PLAY.onError = showSaveError;
// Isolated scenes run this same page and must not install, cache or update the app.
if (!ISOLATED_PAGE) {
    startAppShell({
        dollar: DOLLAR,
        // A fresh page has no changed farm in memory. Even a locked save stays
        // byte-for-byte intact while the page reloads into the latest version.
        beforeUpdate: () => (personalGarden === null ? true : saveLocked() ? false : persist()),
    });
}
function saveLocked() {
    return STORAGE.locked || PLAY.locked;
}
const AUTOSAVE = new FarmAutosave(() => writeCheckpoint());
function replacePersonalGarden(world) {
    unsubscribeProgress?.();
    personalGarden = world;
    // The saved garden remains an owner while a separate raid session is active.
    unsubscribeProgress =
        world?.onProgressChanged.on(() => {
            AUTOSAVE.markDirty();
            if (world.tower.phase === 'summit') {
                // The final receipt is durable before the next frame can offer Skip.
                AUTOSAVE.flush();
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
// Isolated scenes play silently. While the play settings cannot be read nothing plays (the start screen stays).
const FOOD_FEEL = new FoodFeel({
    muted: ISOLATED_PAGE || (PLAY.value?.foodMuted ?? true),
    onMutedChange: (muted) => void PLAY.set({ foodMuted: muted }),
});
const COMBAT_FEEL = new CombatFeel(FOOD_FEEL);
// A tower run lives only in this page's memory: a language switch (a reload) waits until the run ends.
new LanguageSetting({
    choices: DOLLAR('languageChoices'),
    notice: DOLLAR('languageNotice'),
    canReload: () => !personalGarden?.tower.active,
});
// The worker ratio, breeding weights and deploy order are play settings, not part of the farm save.
function applyPlaySettings(world) {
    const SETTINGS = PLAY.value;
    if (!SETTINGS) {
        return;
    }
    if (SETTINGS.workBasisPoints !== null) {
        world.setWorkBasisPoints(SETTINGS.workBasisPoints);
    }
    world.setBreedWeights(SETTINGS.breedWeights);
    if (SETTINGS.deployOrder !== null) {
        world.setDeployOrder(SETTINGS.deployOrder);
    }
}
function saveBreedWeights(world) {
    void PLAY.set({ breedWeights: world.breedWeights });
}
function saveWorkSetting(value) {
    void PLAY.set({ workBasisPoints: value });
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
    applyPlaySettings(world);
    return active;
}
install(new Garden());
active.paused = true;
function raidStartBlockReason() {
    if (!personalGarden) {
        return APP_FARM.raidOnlyOnFarm();
    }
    if (personalGarden.farmBossEvent?.phase !== 'idle') {
        return APP_FARM.raidAlreadyFighting();
    }
    if (!personalGarden.units.some((unit) => !unit.isBattleOnlySummon && unit.hp > 0)) {
        return APP_FARM.raidNoTroops();
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
    const LOCKED = saveLocked();
    const HAS_FARM = hasMemoryRun() || STORAGE.hasWorld,
        GARDEN = personalGarden,
        SAVED = STORAGE.savedProgress,
        POPULATION = GARDEN
            ? GARDEN.ownedPopulation
            : SAVED?.roster.reduce((sum, row) => sum + row.residentIds.length, 0),
        BEST = GARDEN?.playerProgression.towerBest ?? SAVED?.player.towerBest ?? 0;
    DOLLAR('continueGame').hidden = !HAS_FARM;
    DOLLAR('continueGame').disabled = LOCKED || !HAS_FARM;
    DOLLAR('continueGame').textContent =
        hasMemoryRun() && GARDEN.tower.active ? APP_HOME.continueRun() : PAGE.continueFarm();
    DOLLAR('newGame').classList.toggle('btn--primary', !HAS_FARM);
    DOLLAR('homeProgress').hidden = !HAS_FARM || LOCKED;
    DOLLAR('homeProgress').textContent = HAS_FARM
        ? APP_HOME.homeProgress({ population: POPULATION ?? 0, best: BEST })
        : '';
    DOLLAR('newGame').disabled = LOCKED;
    DOLLAR('resetSave').hidden = !LOCKED;
    DOLLAR('resetConfirm').hidden ||= !LOCKED;
    DOLLAR('importSave').disabled = LOCKED;
    DOLLAR('exportSave').disabled = STORAGE.exportText() === null;
    DOLLAR('saveNotice').textContent = STORAGE.error || PLAY.error;
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
        DOLLAR(saveLocked() ? 'resetSave' : DOLLAR('continueGame').disabled ? 'newGame' : 'continueGame').focus();
    }
}
function markSeen() {
    void PLAY.set({ lastSeenMs: Date.now() });
}
function offlineText(summary) {
    return APP_HOME.offlineAway({
        minutes: Math.floor(summary.seconds / 60),
        births: summary.births,
        food: summary.food,
    });
}
// The time spent away is settled by a formula when the farm comes back (see farm-offline.js).
function settleOffline() {
    const SEEN = PLAY.value.lastSeenMs;
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
    return !!(personalGarden && active?.world === personalGarden && !active.closed);
}
function resumeMemoryRun(push = true) {
    if (!hasMemoryRun()) {
        return false;
    }
    // Home pauses this farm or climb; resuming keeps the same live session.
    active.loop.resetTiming();
    setHome(false, push);
    if (personalGarden.tower.active) {
        markSeen();
    } else {
        settleOffline();
    }
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
async function startNewFarm() {
    const WORLD = new Garden();
    if (await STORAGE.save(WORLD)) {
        AUTOSAVE.reset();
        DOLLAR('newConfirm').hidden = true;
        start(WORLD);
    } else {
        refreshStart();
    }
}
DOLLAR('newGame').onclick = () => {
    // Overwriting an existing save is a separate, explicit user action.
    if (saveLocked() || (STORAGE.hasWorld && !DOLLAR('newConfirm').hidden)) {
        return;
    }
    if (STORAGE.hasWorld) {
        DOLLAR('newConfirmText').textContent = PAGE.newConfirm();
        DOLLAR('newConfirm').hidden = false;
        return;
    }
    void startNewFarm();
};
DOLLAR('confirmNew').onclick = () => void startNewFarm();
DOLLAR('cancelNew').onclick = () => {
    DOLLAR('newConfirm').hidden = true;
};
// An unreadable record stays locked until the player chooses to discard it. Only the locked records are reset;
// a readable farm or settings record is kept.
DOLLAR('resetSave').onclick = () => {
    if (!saveLocked()) {
        return;
    }
    DOLLAR('resetConfirmText').textContent = APP_HOME.resetConfirm({ farm: STORAGE.locked, play: PLAY.locked });
    DOLLAR('resetConfirm').hidden = false;
};
DOLLAR('cancelReset').onclick = () => {
    DOLLAR('resetConfirm').hidden = true;
};
DOLLAR('confirmReset').onclick = async () => {
    DOLLAR('resetConfirm').hidden = true;
    try {
        if (STORAGE.locked) {
            await STORAGE.reset();
        }
        if (PLAY.locked) {
            await PLAY.reset();
            FOOD_FEEL.setMuted(PLAY.value.foodMuted);
            applyPlaySettings(active.world);
        }
    } catch (e) {
        refreshStart();
        DOLLAR('saveNotice').textContent = e.message;
        return;
    }
    refreshStart();
};
DOLLAR('exportSave').onclick = () => {
    const RAW = STORAGE.exportText();
    if (RAW === null) {
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
            throw Error(APP_HOME.saveTooLarge());
        }
        const TEXT = await FILE.text();
        readFarmExport(TEXT);
        imported = TEXT;
        DOLLAR('importConfirmText').textContent = PAGE.importConfirm();
        DOLLAR('confirmImport').textContent = PAGE.confirmImport();
        DOLLAR('importConfirm').hidden = false;
    } catch (e) {
        DOLLAR('saveNotice').textContent = importErrorText(e);
    } finally {
        DOLLAR('saveFile').value = '';
    }
};
// The save codec rejects a file with a developer TypeError; the player reads it as "not a farm save".
function importErrorText(error) {
    return error instanceof TypeError ? APP_HOME.importUnreadable({ detail: error.message }) : error.message;
}
DOLLAR('cancelImport').onclick = () => {
    imported = null;
    DOLLAR('importConfirm').hidden = true;
};
DOLLAR('confirmImport').onclick = async () => {
    if (active?.world?.tower.active) {
        DOLLAR('saveNotice').textContent = APP_HOME.importBlockedDuringRun();
        return;
    }
    try {
        if (imported) {
            const WORLD = await STORAGE.import(imported);
            AUTOSAVE.reset();
            replacePersonalGarden(WORLD);
            install(WORLD);
            active.paused = true;
        }
        imported = null;
        DOLLAR('importConfirm').hidden = true;
        refreshStart();
    } catch (e) {
        DOLLAR('saveNotice').textContent = importErrorText(e);
    }
};
// The pulse index belongs to this press, never to the materials or simulation/save state.
const MERGE_HOLD = Object.freeze({ intervalMs: 100, pulsesPerStep: 10, combineDelayMs: 350 });
function stopMergeHold() {
    if (!mergeHold) {
        return;
    }
    clearTimeout(mergeHold.delay);
    clearInterval(mergeHold.repeat);
    if (mergeHold.accelerate) {
        mergeHold.button.textContent = PAGE.merge();
    }
    mergeHold = null;
}
function bindMergeButton(id, command, onBlocked = null, { accelerate = false } = {}) {
    const BUTTON = DOLLAR(id);
    const START = (input) => {
        stopMergeHold();
        if (BUTTON.disabled || !active || active.closed || home || menuOpen || onBlocked?.()) {
            return;
        }
        const HOLD = (mergeHold = {
            ...input,
            button: BUTTON,
            session: active,
            accelerate,
            pulses: 0,
            delay: 0,
            repeat: 0,
        });
        const EXECUTE = () => {
            if (
                mergeHold !== HOLD ||
                active !== HOLD.session ||
                HOLD.session.closed ||
                BUTTON.disabled ||
                home ||
                menuOpen
            ) {
                stopMergeHold();
                return;
            }
            const PULSE = HOLD.pulses + 1,
                COUNT = accelerate ? 1 + Math.floor((PULSE - 1) / MERGE_HOLD.pulsesPerStep) : 1;
            if (!HOLD.session.queue(command, accelerate ? { count: COUNT } : {})) {
                stopMergeHold();
                return;
            }
            HOLD.pulses = PULSE;
            if (accelerate) {
                BUTTON.textContent = APP_FARM.mergeCount({ count: COUNT });
            }
        };
        EXECUTE();
        if (mergeHold !== HOLD) {
            return;
        }
        if (accelerate) {
            HOLD.repeat = setInterval(EXECUTE, MERGE_HOLD.intervalMs);
        } else {
            // Recipe combination keeps its existing initial grace and single operation cadence.
            HOLD.delay = setTimeout(() => {
                if (mergeHold === HOLD) {
                    HOLD.repeat = setInterval(EXECUTE, MERGE_HOLD.intervalMs);
                }
            }, MERGE_HOLD.combineDelayMs);
        }
    };
    const END_POINTER = (event) => {
        if (mergeHold?.button === BUTTON && mergeHold.pointerId === event.pointerId) {
            stopMergeHold();
        }
    };
    BUTTON.addEventListener('pointerdown', (event) => {
        if (event.button === 0 && event.isPrimary) {
            START({ pointerId: event.pointerId });
        }
    });
    BUTTON.addEventListener('pointermove', (event) => {
        if (mergeHold?.button !== BUTTON || mergeHold.pointerId !== event.pointerId) {
            return;
        }
        // Touch implicitly captures the pointer, so leaving its bounds does not
        // emit pointerleave until capture ends. Keep capture, but end this hold.
        const BOUNDS = BUTTON.getBoundingClientRect();
        if (
            event.clientX < BOUNDS.left ||
            event.clientX > BOUNDS.right ||
            event.clientY < BOUNDS.top ||
            event.clientY > BOUNDS.bottom
        ) {
            stopMergeHold();
        }
    });
    for (const EVENT of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture']) {
        BUTTON.addEventListener(EVENT, END_POINTER);
    }
    BUTTON.addEventListener('blur', () => {
        if (mergeHold?.button === BUTTON) {
            stopMergeHold();
        }
    });
    // Prevent the native keyboard click when a key itself starts the repeating hold.
    BUTTON.addEventListener('keydown', (event) => {
        if (!['Enter', ' '].includes(event.key)) {
            return;
        }
        if (event.repeat || accelerate) {
            event.preventDefault();
        }
        if (accelerate && !event.repeat) {
            START({ key: event.key });
        }
    });
    BUTTON.addEventListener('keyup', (event) => {
        if (accelerate && mergeHold?.button === BUTTON && mergeHold.key === event.key) {
            event.preventDefault();
            stopMergeHold();
        }
    });
    // Assistive activation has no pointer/key-down counterpart and remains a single execution.
    BUTTON.onclick = (event) => {
        if (event.detail === 0 && !BUTTON.disabled && !home && !menuOpen && !onBlocked?.()) {
            active?.queue(command, accelerate ? { count: 1 } : {});
        }
    };
}
window.addEventListener('blur', stopMergeHold);
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopMergeHold();
    }
});
window.addEventListener('pointerup', (event) => {
    if (mergeHold?.pointerId === event.pointerId) {
        stopMergeHold();
    }
});
bindMergeButton('merge', 'merge', null, { accelerate: true });
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
const SPECIES_INFO = new SpeciesInfoDialog(DOLLAR('speciesInfoDialog'));
const BREED_CONTROL = { selected: null, idsKey: '', world: null, sourceKey: '', basis: [] };
function speciesCounts(world) {
    const COUNTS = new Map();
    for (const UNIT of world.units) {
        if (!UNIT.isBattleOnlySummon && !UNIT.isFormationClone && !UNIT.seedling) {
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
                const NAME = speciesName(id);
                return `<div class="breed-chip-wrap"><button type="button" class="breed-chip" data-breed-species="${id}" aria-pressed="false"><img src="${speciesPortraitSource(id)}" alt="" width="36" height="36"><span>${NAME}</span><b data-breed-percent></b></button><button type="button" class="species-info-open" data-species-info="${id}" aria-label="${APP_FARM.speciesInfo({ name: NAME })}" aria-haspopup="dialog">${iconSvg('info')}</button></div>`;
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
        INDEX < 0 ? APP_FARM.noSpecies() : APP_FARM.breedShare({ name: speciesName(BREED_CONTROL.selected) });
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
            : APP_FARM.breedPlan({
                  breeders: STATE.counts.get(BREED_CONTROL.selected) - WORKERS.get(BREED_CONTROL.selected),
                  workers: WORKERS.get(BREED_CONTROL.selected),
              });
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
    const INFO = event.target.closest('[data-species-info]');
    if (INFO) {
        const WORLD = personalGarden || active?.world;
        if (WORLD) {
            SPECIES_INFO.open(WORLD, Number(INFO.dataset.speciesInfo));
        }
        return;
    }
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
// Seeds waiting for room are no species yet, so the queue is one number of sprouts.
function drawRewardQueue(world) {
    const WAITING = bossRewardQueueBySpecies(world).reduce((sum, [, count]) => sum + count, 0),
        BOX = DOLLAR('farmQueue'),
        HTML =
            WAITING > 0
                ? `<span class="farm-queue__chip"><img src="${speciesPortraitSource(BOSS_SPECIES)}" alt="${APP_FARM.sprout()}" width="20" height="20"><b>${WAITING}</b></span>`
                : '';
    BOX.hidden = WAITING === 0;
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
    const LOCKED = active?.world?.scene !== 'farm' || W.farmBossEvent?.phase !== 'idle';
    DOLLAR('farmStatPlaced').textContent = String(W.ownedPopulation);
    DOLLAR('farmStatCapacity').textContent = `/ ${W.capacity}`;
    DOLLAR('farmStatPending').textContent = String(W.pendingRewardPopulation);
    drawRewardQueue(W);
    syncFlag('farmLockNote', 'hidden', !LOCKED);
    drawSpeciesRoles(W);
}
const MENU_ROUTES = {
    play: '#/menu',
    farms: '#/farms',
    help: '#/help',
};
const ROUTE_MENU_TAB = (route) => Object.keys(MENU_ROUTES).find((tab) => MENU_ROUTES[tab] === route) || 'play';
function applyMenuTab(tab) {
    menuTab = tab;
    const UPGRADES = tab === 'farms';
    DOLLAR('gameMenuTitle').textContent = UPGRADES
        ? PAGE.upgrades()
        : tab === 'help'
          ? PAGE.help()
          : PAGE.settingsTitle();
    DOLLAR('gameMenuClose').setAttribute(
        'aria-label',
        APP_FARM.menuClose({ title: DOLLAR('gameMenuTitle').textContent }),
    );
    for (const [ID, SELECTED] of [
        ['gameMenu', tab === 'play'],
        ['upgradeMenu', UPGRADES],
        ['helpMenu', tab === 'help'],
    ]) {
        DOLLAR(ID).setAttribute('aria-expanded', String(menuOpen && SELECTED));
    }
    HELP_PANEL.setVisible(menuOpen && tab === 'help');
    for (const [NAME, ID] of [
        ['play', 'menuPlayPanel'],
        ['farms', 'farmPanel'],
        ['help', 'helpPanel'],
    ]) {
        DOLLAR(ID).hidden = NAME !== tab;
    }
    if (tab === 'farms') {
        farmPanelRevision = -1;
        drawFarmPanel();
    }
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
    DOLLAR('gameMenuClose').focus();
}
function closeMenu(push = true) {
    if (!menuOpen) {
        return;
    }
    menuOpen = false;
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
    DOLLAR(menuTab === 'farms' ? 'upgradeMenu' : menuTab === 'help' ? 'helpMenu' : 'gameMenu').focus();
}
DOLLAR('returnHome').onclick = () => setHome(true);
DOLLAR('gameMenu').onclick = () => (menuOpen && menuTab === 'play' ? closeMenu() : openMenu());
DOLLAR('upgradeMenu').onclick = () => openMenu('farms');
DOLLAR('helpMenu').onclick = () => openMenu('help');
DOLLAR('gameMenuClose').onclick = () => closeMenu();
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
function applyWorkCut() {
    paintRange(DOLLAR('workCutA'));
    const CUT = Number(DOLLAR('workCutA').value),
        POINTS = (100 - CUT) * 100,
        WORLD = personalGarden || active.world;
    if (WORLD.workBasisPoints === POINTS) {
        return;
    }
    saveWorkSetting(POINTS);
    WORLD.setWorkBasisPoints(POINTS);
    active.queue('farm-work', { basisPoints: POINTS });
    farmPanelRevision = -1;
}
DOLLAR('workCutA').addEventListener('input', applyWorkCut);
DOLLAR('workCutA').addEventListener('change', applyWorkCut);
const GAME_MENU_OVERLAY = DOLLAR('gameMenuOverlay'),
    CLOSE_MENU_FROM_BACKDROP = (e) => {
        if (e.target === GAME_MENU_OVERLAY) {
            closeMenu();
        }
    };
GAME_MENU_OVERLAY.addEventListener('click', CLOSE_MENU_FROM_BACKDROP);
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
const FLOOR_KIND = {
    battle: APP_TOWER.floorBattle,
    elite: APP_TOWER.floorElite,
    mid: APP_TOWER.floorMid,
    power: APP_TOWER.floorPower,
    event: APP_TOWER.floorEvent,
};
const DOOR_TEXT = { battle: APP_TOWER.doorBattle, elite: APP_TOWER.doorElite, mid: APP_TOWER.doorMid };
const NEXT_FLOOR_TEXT = {
    battle: APP_TOWER.nextBattle,
    mid: APP_TOWER.nextMid,
    power: APP_TOWER.nextPower,
    event: APP_TOWER.nextEvent,
};
function statDoorCard(door, cards, index, role = 'player', receipt = null) {
    const CARD = statCard(door.id),
        LEVEL = receipt?.before.level ?? cardStacks(cards, door.id);
    return `<button type="button" class="door door--stat door--rarity-${door.rarity}" data-door="${index}"><b>${LOCALE.text(CARD.name)} ${LOCALE.text(statCardText(CARD, door.rarity, role, door.effect))}</b><small>${APP_TOWER.statDoorDetail({ rarity: LOCALE.text(RARITY_NAMES[door.rarity]), boss: role === 'boss', level: LEVEL, cap: TOWER_RUN_SETTINGS.cardCap })}</small></button>`;
}
function passiveDoorCard(door, cards, index, role = 'player', receipt = null) {
    const CARD = passiveCard(door.id),
        LEVEL = receipt?.before.level ?? cardStacks(cards, door.id),
        EFFECT = LOCALE.text(passiveEffectText(CARD, cardValue(CARD, door.rarity, role), role));
    return `<button type="button" class="door door--passive door--rarity-${door.rarity}" data-door="${index}"><b>${LOCALE.text(CARD.name)}</b><small>${APP_TOWER.passiveDoorDetail({ rarity: LOCALE.text(RARITY_NAMES[door.rarity]), effect: EFFECT, level: LEVEL, cap: TOWER_RUN_SETTINGS.cardCap })}</small></button>`;
}
function skillDoorCard(tower, door, index, role = 'player', receipt = null) {
    const DEFINITION = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === door.id),
        LEVEL = receipt?.before.level ?? (tower.relics.get(door.id) || 0),
        GAIN = LEVEL ? `Lv.${LEVEL} → ${LEVEL + 1}` : RELIC.newSkill();
    return `<button type="button" class="door door--skill" data-door="${index}"><b>${iconSvg(door.id)} ${LOCALE.text(DEFINITION.name)}</b><small>${GAIN} · ${relicEffectText(DEFINITION, LEVEL + 1, role, 0, tower.floor)}</small></button>`;
}
function eventDoorCard(door, index) {
    const EVENT = TOWER_EVENTS.find((item) => item.id === door.id);
    return `<button type="button" class="door door--event" data-door="${index}"><b>${LOCALE.text(EVENT.name)}</b><small>${LOCALE.text(EVENT.text)}</small></button>`;
}
function doorCard(tower, door, index, role = 'player', receipt = null) {
    if (door.type === 'fight') {
        return `<button type="button" class="door door--${door.kind}" data-door="${index}"><b>${FLOOR_KIND[door.kind]()}</b><small>${DOOR_TEXT[door.kind]()}</small></button>`;
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
    const NAME =
        card?.type === 'skill'
            ? FORMATION_SKILL_DEFINITIONS.find((item) => item.id === card.id)?.name
            : card?.type === 'stat'
              ? statCard(card.id)?.name
              : card?.type === 'passive'
                ? passiveCard(card.id)?.name
                : null;
    return NAME ? LOCALE.text(NAME) : '';
}
function acquisitionText(receipt) {
    return receipt.card.type === 'skill'
        ? relicAcquisitionText(receipt, active?.world?.tower.floor || 1)
        : LOCALE.text(cardAcquisitionText(receipt));
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
// The three shared cards: the boss's is taken and cannot be chosen; the player's choices map back to `tower.doors`.
function syncSharedChoice(tower, draw, phase, locked) {
    const HOST = DOLLAR('doorCards'),
        LOCKED = locked,
        RAIL_KEY = `${draw.serial}:shared:${LOCKED}`;
    if (HOST.dataset.receipt !== RAIL_KEY) {
        HOST.dataset.receipt = RAIL_KEY;
        const BOSS_VIEW = { cards: draw.offerState.cards, relics: new Map(draw.offerState.relics) };
        let doorIndex = 0;
        HOST.innerHTML = draw.offers
            .map((card, index) =>
                index === draw.selectedIndex
                    ? doorCard(BOSS_VIEW, card, index, 'boss')
                    : doorCard(tower, card, doorIndex++, 'player'),
            )
            .join('');
    }
    for (const [INDEX, BUTTON] of [...HOST.children].entries()) {
        const TAKEN = INDEX === draw.selectedIndex;
        BUTTON.dataset.bossOffer = String(INDEX);
        if (TAKEN) {
            readonlyDoor(BUTTON, APP_TOWER.bossPicked(), ['selected', 'outcome'].includes(phase));
        } else if (LOCKED) {
            readonlyDoor(BUTTON, '', false);
        }
    }
}
// A catalog name, or the id when the catalog no longer has it.
function localizedOr(pair, fallback) {
    return pair ? LOCALE.text(pair) : fallback;
}
// What the boss has picked so far, for the row of cards under it.
function bossCardChips(tower) {
    const CHIPS = [...tower.bossRelics].map(([id, level]) => ({
        id,
        level,
        icon: id,
        name: localizedOr(FORMATION_SKILL_DEFINITIONS.find((item) => item.id === id)?.name, id),
    }));
    const COUNTS = new Map();
    for (const CARD of tower.bossCards) {
        COUNTS.set(CARD.id, (COUNTS.get(CARD.id) || 0) + 1);
    }
    for (const [ID, LEVEL] of COUNTS) {
        const STAT = statCard(ID);
        CHIPS.push({
            id: ID,
            level: LEVEL,
            icon: STAT?.icon ?? ID,
            name: localizedOr(STAT?.name ?? passiveCard(ID)?.name, ID),
        });
    }
    return CHIPS.slice(-14);
}
function syncBossMascot(tower, draw, phase, visible) {
    syncBossChoiceMascot(DOLLAR('doorBoss'), {
        visible,
        species: BOSS_SPECIES,
        floor: tower.floor,
        element: towerElement(tower.floor),
        serial: draw?.serial || 0,
        phase,
        selectedEl: visible ? DOLLAR('doorCards').children[draw.selectedIndex] : null,
        cards: visible ? bossCardChips(tower) : [],
        pickedId: draw?.card?.id ?? null,
    });
}
function syncCardReceipts(tower, draw, phase) {
    const HOST = DOLLAR('doorReceipts'),
        VISIBLE = !!draw && draw.floor === tower.floor && ['outcome', ''].includes(phase);
    HOST.hidden = !VISIBLE;
    if (!VISIBLE) {
        return;
    }
    const KEY = `${draw.serial}:${phase}`;
    if (HOST.dataset.receipt !== KEY) {
        HOST.dataset.receipt = KEY;
        HOST.dataset.phase = phase || 'summary';
        HOST.replaceChildren();
        for (const RECEIPT of [draw.receipt]) {
            if (!RECEIPT) {
                continue;
            }
            const ROW = document.createElement('p'),
                TITLE = document.createElement('b'),
                EFFECT = document.createElement('span');
            ROW.dataset.role = RECEIPT.role;
            ROW.dataset.cardType = RECEIPT.card.type;
            TITLE.textContent = APP_TOWER.receiptTitle({
                boss: RECEIPT.role === 'boss',
                card: bossCardName(RECEIPT.card),
            });
            EFFECT.textContent = acquisitionText(RECEIPT);
            ROW.append(TITLE, EFFECT);
            HOST.append(ROW);
        }
        if (draw.status === 'maxed') {
            const EMPTY = document.createElement('p');
            EMPTY.dataset.role = 'boss';
            EMPTY.textContent = APP_TOWER.bossMaxed();
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
            [tower.playerPick?.receipt, draw.receipt]
                .filter(Boolean)
                .map((receipt) =>
                    APP_TOWER.receiptAnnouncement({
                        boss: receipt.role === 'boss',
                        card: bossCardName(receipt.card),
                        effect: acquisitionText(receipt),
                    }),
                )
                .join('. ') + (draw.status === 'maxed' ? '. ' + APP_TOWER.bossMaxed() : ''),
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
    const DOWNED = T.downed.size;
    syncFlag('floorChip', 'hidden', !CLIMBING);
    if (CLIMBING) {
        syncText('floorNow', APP_TOWER.floorNow({ floor: T.floor, theme: LOCALE.text(towerTheme(T.floor).name) }));
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
        DOLLAR('floorBannerNum').textContent = APP_TOWER.floorNumber({ floor: T.floor });
        DOLLAR('floorBannerKind').textContent = APP_TOWER.floorBannerKind({
            theme: LOCALE.text(towerTheme(T.floor).name),
            kind: FLOOR_KIND[T.kind](),
        });
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
    // The reward dialog comes first: the card panel and the boss's eating wait until it has closed.
    const PENDING_REWARD = latestBossReward(garden),
        REWARD_OPEN = !DOLLAR('bossRewardDialog').hidden || (!!PENDING_REWARD && !PENDING_REWARD.revealed),
        RAW_DRAW = T.bossCardDraw;
    if (RAW_DRAW && RAW_DRAW !== presentedDraw && CLIMBING && !REWARD_OPEN) {
        presentedDraw = RAW_DRAW;
        presentedDrawStart = garden.time;
    }
    const DRAW =
            RAW_DRAW && RAW_DRAW === presentedDraw
                ? {
                      ...RAW_DRAW,
                      startedAt: presentedDrawStart,
                      until: presentedDrawStart + (RAW_DRAW.until - RAW_DRAW.startedAt),
                  }
                : RAW_DRAW && !CLIMBING
                  ? RAW_DRAW
                  : null,
        DRAW_LOCKED = CLIMBING && garden.time < (DRAW?.until || 0),
        // The boss's card stays on screen, taken, while the player picks from the rest of the same three.
        SHARED =
            CLIMBING &&
            !!DRAW?.card &&
            DRAW.floor === T.floor &&
            T.doors.length > 0 &&
            T.doors.every((door) => door.type !== 'fight' && door.type !== 'event'),
        BOSS_CHOICE = DRAW_LOCKED && Array.isArray(DRAW.offers),
        PHASE = BOSS_CHOICE ? cardChoicePhase(DRAW, garden.time) : SHARED ? 'outcome' : '',
        DOORS = CLIMBING && !REWARD_OPEN && event?.phase === 'idle' && (T.doors.length > 0 || BOSS_CHOICE);
    syncFlag('towerDoors', 'hidden', !DOORS);
    if (DOORS) {
        const KEY = `${JSON.stringify(T.doors)}|${T.floor}|${DOWNED}|${T.cards.length}|${T.relics.size}|${DRAW?.serial || 0}|${BOSS_CHOICE}|${SHARED}|${PHASE}`;
        syncData('towerDoors', 'owner', BOSS_CHOICE ? 'boss' : 'player');
        syncData('towerDoors', 'phase', PHASE);
        if (KEY !== doorKey) {
            doorKey = KEY;
            if (SHARED) {
                syncSharedChoice(T, DRAW, PHASE, BOSS_CHOICE);
            } else {
                DOLLAR('doorCards').dataset.receipt = '';
                DOLLAR('doorCards').innerHTML = T.doors.map((door, i) => doorCard(T, door, i)).join('');
            }
        }
        syncCardReceipts(T, DRAW, PHASE);
        syncBossMascot(T, DRAW, PHASE, SHARED);
        if (SHARED) {
            syncText(
                'doorsTitle',
                BOSS_CHOICE
                    ? PHASE === 'offers'
                        ? APP_TOWER.bossChoosing()
                        : APP_TOWER.bossChoice({ card: bossCardName(DRAW.card) })
                    : APP_TOWER.bossChose({ card: bossCardName(DRAW.card) }),
            );
            syncText('doorsNote', BOSS_CHOICE ? APP_TOWER.bossChoosingNote() : APP_TOWER.pickFromRest());
        } else {
            syncText('doorsTitle', APP_TOWER.doorsTitle({ floor: T.floor + 1, next: NEXT_FLOOR_TEXT[T.nextKind]() }));
            syncText(
                'doorsNote',
                DRAW?.floor === T.floor && DRAW.card
                    ? APP_TOWER.bossTookPickRest({ card: bossCardName(DRAW.card) })
                    : APP_TOWER.floorCleared({ floor: T.floor, downed: DOWNED, cards: T.cards.length }),
            );
        }
    } else {
        syncBossMascot(T, DRAW, '', false);
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
    syncText('towerResult', APP_TOWER.towerResult({ floor: T.floor, record: T.record, best: BEST }));
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
function saveDeployOrder(order) {
    void PLAY.set({ deployOrder: order });
}
function deckCardHtml(id, count, slot) {
    return `<button type="button" class="deck-card" data-deploy="${id}" aria-label="${APP_TOWER.deckCard({ slot, name: speciesName(id) })}"><i>${slot}</i><img src="${speciesPortraitSource(id)}" alt="" width="40" height="40" draggable="false"><b>×${count}</b></button>`;
}
function ownedCounts(garden) {
    const COUNTS = new Map();
    for (const UNIT of garden.units) {
        if (UNIT.faction === 'player' && !UNIT.isBattleOnlySummon && UNIT.hp > 0 && !UNIT.seedling) {
            COUNTS.set(UNIT.species, (COUNTS.get(UNIT.species) || 0) + 1);
        }
    }
    return COUNTS;
}
// In a fight: how many fight on the field and how many wait; the deploy itself is automatic.
const BATTLE_COMMAND_NOTES = Object.freeze({
    engage: PAGE.commandEngageNote,
    scatter: APP_TOWER.commandScatter,
    retreat: APP_TOWER.commandRetreat,
});
function syncBattleCommands(garden, visible, counts) {
    syncFlag('battleCommands', 'hidden', !visible);
    if (!visible) {
        return;
    }
    syncText(
        'frontlineStatus',
        APP_TOWER.frontlineStatus({
            fighters: counts.fighters,
            limit: garden.frontlineLimit,
            reserves: counts.reserves,
        }),
    );
    syncText('battleCommandNote', BATTLE_COMMAND_NOTES[garden.battleCommand]());
    for (const INPUT of DOLLAR('battleCommands').querySelectorAll('input')) {
        INPUT.checked = INPUT.value === garden.battleCommand;
    }
}
function canUseWorldInput() {
    return !home && !menuOpen && !active.paused;
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
    stopMergeHold();
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
    BOSS_REWARD_DIALOG.dispose();
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
const GRAPHICS_RECOVERY_MESSAGE = APP_HOME.graphicsRecovering();
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
        if ([RENDERER.device, RENDERER.ctx].some((owner) => owner.state !== 'ready')) {
            RECOVERY.failed = true;
            FAIL(Error(APP_HOME.graphicsRecoveryFailed()));
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
        if (saveLocked() || (STORAGE.error && !STORAGE.hasWorld)) {
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
    if (R === '#/help' || R === '#/farms' || R === '#/menu') {
        const FARM_EVENT_ACTIVE = personalGarden?.farmBossEvent?.phase !== 'idle';
        const RESTRICTED = R === '#/farms' && FARM_EVENT_ACTIVE;
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
        PENDING_REWARD = REWARD_WORLD.bossRewardReceipts.find((reward) => !reward.revealed || reward.queuedCount > 0),
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
    syncAttribute(
        'merge',
        'aria-label',
        APP_FARM.mergeLabel({
            label: DOLLAR('merge').textContent.trim(),
            available: MERGE_STATUS.available,
            reason: LOCALE.text(MERGE_STATUS.reason),
        }),
    );
    syncText('mergeNotice', LOCALE.text(MERGE_STATUS.reason));
    syncFlag('combine', 'disabled', home || FARM_EVENT_ACTIVE || (W.combine.recipe >= 0 && !COMBINE_STATUS.available));
    syncData('combine', 'availability', COMBINE_STATUS.code || 'unavailable');
    syncAttribute(
        'combine',
        'aria-label',
        APP_FARM.combineLabel({ available: COMBINE_STATUS.available, reason: LOCALE.text(COMBINE_STATUS.reason) }),
    );
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
    syncText('count', WORLD_COUNT);
    syncText('capacity', personalGarden?.capacity ?? CONFIG.farm.capacity.max);
    const PROGRESSION = (personalGarden || W).playerProgression,
        LEVEL = overallLevel(PROGRESSION),
        LEVEL_START = overallXpForLevel(LEVEL),
        NEXT_LEVEL = overallXpForLevel(LEVEL + 1);
    syncText('overallLevel', APP_FARM.overallLevel({ level: LEVEL }));
    syncText(
        'overallXp',
        NEXT_LEVEL > LEVEL_START
            ? `${PROGRESSION.overallXp - LEVEL_START}/${NEXT_LEVEL - LEVEL_START} XP`
            : APP_FARM.capacityMax(),
    );
    syncAttribute(
        'overallGrowth',
        'title',
        APP_FARM.overallGrowth({
            xp: PROGRESSION.overallXp,
            capacity: W.capacity,
            frontline: Math.floor(W.capacity / 2),
        }),
    );
    syncText(
        'starter',
        PENDING_REWARD
            ? APP_FARM.starterRewardWaiting()
            : !HAS_READY_TROOPS
              ? APP_FARM.starterAllAsleep()
              : WORLD_COUNT >= W.capacity
                ? APP_FARM.starterFarmFull()
                : APP_FARM.starterBreed(),
    );
    syncWidth('allyHealth', (armyMax ? (armyCurrent / armyMax) * 100 : 0) + '%');
    syncText(
        'allyHealthText',
        APP_FARM.armyHealth({
            current: Math.ceil(armyCurrent),
            max: Math.ceil(armyMax),
            living: armyLiving,
            total: armyTotal,
        }),
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
        ENCOUNTER_NAME = giantSpeciesName(BOSS.species);
    syncText(
        'bossName',
        W.tower.active
            ? APP_TOWER.bossFloor({
                  floor: BOSS.stage,
                  final: BOSS.isFinalBoss,
                  living: BOSS_LIVING,
                  total: BOSS_TOTAL,
              })
            : ENCOUNTER_NAME,
    );
    syncAttribute('bossHealth', 'aria-label', APP_TOWER.bossHealth());
    syncText('bossHealthText', Math.ceil(BOSS_HP) + '/' + Math.round(BOSS_MAX_HP));
    syncText(
        'bossHealthNote',
        FARM_EVENT_ACTIVE && FARM_EVENT.phase === 'dropping'
            ? APP_TOWER.bossMarching()
            : FARM_EVENT_ACTIVE && FARM_EVENT.phase === 'fighting'
              ? W.bossEnraged
                  ? APP_TOWER.bossEnraged()
                  : BOSS_PENDING > 0
                    ? APP_TOWER.bossCrownWaiting()
                    : APP_TOWER.bossAllIn({
                          seconds: Math.max(0, Math.ceil(W.battleTimeLimit() - FARM_EVENT.elapsed)),
                      })
              : FARM_EVENT_ACTIVE
                ? ''
                : PAGE.bossHealthNote(),
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
                ? APP_TOWER.victoryJoined({ floor: BOSS.stage, reward: rewardReceiptSummary(FARM_REWARD) })
                : FARM_EVENT.rewardStatus === 'pending'
                  ? APP_TOWER.victoryPending({ floor: BOSS.stage, reward: rewardReceiptSummary(FARM_REWARD) })
                  : W.tower.record
                    ? APP_TOWER.victoryRecord({ floor: BOSS.stage })
                    : APP_TOWER.victoryXp({ floor: BOSS.stage })
            : BATTLE_OUTCOME === 'defeat'
              ? APP_TOWER.defeat({ floor: BOSS.stage, best: W.playerProgression.towerBest })
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
        APP_TOWER.startFloor({
            start: START_FLOOR,
            highest: highestTowerStartFloor(BEST_FLOOR),
            best: BEST_FLOOR,
        }),
    );
    syncText('bossChallenge', PAGE.climbTower());
    syncFlag('bossChallenge', 'hidden', FARM_EVENT_ACTIVE || home);
    syncAttribute('bossChallenge', 'aria-disabled', String(raidStartBlockReason() !== ''));
    const WORK_WORLD = personalGarden || W,
        WORKERS = WORK_WORLD.workerCount,
        CUT = workCut(WORK_WORLD),
        PLAN = plannedWorkers(WORK_WORLD),
        BREEDERS = PLAN.total - PLAN.workers;
    let note = APP_FARM.workNote({ workers: WORKERS, perMinute: WORK_WORLD.workFoodPerMinute.toFixed(1) }),
        warn = false;
    if (WORK_WORLD.warehouseFull) {
        note = APP_FARM.workFoodFull();
        warn = true;
    } else if (WORKERS === 0) {
        note = APP_FARM.workNoWorkers();
        warn = true;
    }
    if (document.activeElement !== DOLLAR('workCutA') && !workSliderHeld) {
        DOLLAR('workCutA').value = String(CUT);
    }
    syncText('workHudNote', note);
    syncText('workHudBreed', APP_FARM.workHudBreed({ count: BREEDERS }));
    syncText('workHudFood', APP_FARM.workHudFood({ count: PLAN.workers }));
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
        if (!home) {
            RENDERER.render(DISPLAY, COMBAT_FEEL, DISPLAY.displayTimeMs);
        }
        PERFORMANCE_DIAGNOSTICS.end('render', RENDER_START);
        const UI_START = PERFORMANCE_DIAGNOSTICS.start();
        sync(DISPLAY, now, NOTICES);
        SEEDLING_REVEAL.update(
            active.world,
            DISPLAY,
            NOTICES,
            !home &&
                !menuOpen &&
                !HELP.scene &&
                !document.hidden &&
                !active.world.tower.active &&
                DOLLAR('codexDialog').hidden &&
                DOLLAR('deckDialog').hidden,
            now,
        );
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
    scene: helpSceneById(new URLSearchParams(location.search).get('help')) ?? labScene(location.search),
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
        // Stops the game on the first simulation tick whose world time reaches ms, the same tick on every run.
        holdAt: (ms) => {
            active.holdAtTime = ms / 1000;
        },
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
        return RENDERER.ctx.stats().mesh?.poses ?? null;
    },
    get unitArtDiagnostics() {
        return RENDERER.unitSprites.stats();
    },
    renderer: RENDERER,
    storage: STORAGE,
    play: PLAY,
    foodFeel: FOOD_FEEL,
    combatFeel: COMBAT_FEEL,
    CONFIG,
    ATTACK_TYPES,
    Ballistics,
    ArenaGeometry,
    version: PRODUCT_VERSION,
};
