import { PerformanceDiagnostics } from './performance-diagnostics.js';
import { FormationSkillsUI } from './formation-skills-ui.js';
import { Garden, CONFIG, ArenaGeometry, ATTACK_TYPES, Ballistics } from './farm-model.js';
import { Diorama } from './farm-renderer.js';
import { FarmSession } from './farm-session.js';
import { FarmStorage, saveHasLegacyFarmProgress } from './farm-storage.js';
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
import {
    abortReservedRaidRun,
    reserveRaidRun,
    settleRaidOwnerFarm,
    raidDeploymentRewardMultiplier,
} from './raid-settlement.js';
import { BOSS_REWARD_SETTINGS, bossAcquisitionChance, bossStageStats, settleBossKill } from './boss-rewards.js';
import { selectFarmBossStage } from './farm-boss-stages.js';
import { speciesById, giantSpeciesName, speciesRewardName } from './species-catalog.js';
const DOLLAR = (id) => document.getElementById(id),
    STORAGE = new FarmStorage();
DOLLAR('abilitySpeciesTabs').innerHTML = renderAbilitySpeciesTabsMarkup();
let imported = null;
let importedLegacy = false;
let active = null;
let home = true;
let personalGarden = null;
let unsubscribeProgress = null;
let menuOpen = false;
let menuTab = 'play';
let menuWasPaused = true;
let menuPauseChanged = false;
let menuAutoPaused = false;
let dropPointer = null;
let dropTimer = null;
let panPointer = null;
let bossEncounterOpen = false;
let bossSwipe = null;
let bossPauseBeforeOpen = null;
let lastAutoSettledRunKey = null;
const RENDERER = new Diorama(DOLLAR('world'));
const FORMATION_UI = new FormationSkillsUI((kind, payload) => active?.queue(kind, payload));
const PERFORMANCE_DIAGNOSTICS = new PerformanceDiagnostics();
STORAGE.profiler = PERFORMANCE_DIAGNOSTICS;
function frameRate() {
    return PERFORMANCE_DIAGNOSTICS.frameRate();
}
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
    DOLLAR('diagnosticStatus').textContent = '명시적으로 요청한 상세 JSON입니다. 저장 데이터는 포함하지 않습니다.';
};
const FAIL = (error) => {
    DOLLAR('error').hidden = false;
    DOLLAR('error').textContent = '정원을 진행하지 못했어요. ' + error.message;
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
    lastAutoSettledRunKey = RUN_KEY;
    try {
        persistRaidSettlement(localSettlementRoster(world, OWNER_ID, RUN), OWNER_ID);
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
const FOOD_FEEL = new FoodFeel(requestFeed);
const COMBAT_FEEL = new CombatFeel(FOOD_FEEL);
function requestFeed() {
    if (!home && active && !active.paused) {
        FOOD_FEEL.unlock();
        active.queue('feed');
    }
}
function install(world) {
    if (active) {
        stopWorldInput();
    }
    active?.dispose();
    RENDERER.resetPan();
    active = new FarmSession(world, {
        onError: FAIL,
        onWorldStep,
    });
    return active;
}
install(new Garden());
active.paused = true;
function showBossEncounterMessage(text) {
    const MESSAGE = DOLLAR('bossEncounterMessage');
    MESSAGE.textContent = text;
    MESSAGE.hidden = !text;
    if (text) {
        clearTimeout(showBossEncounterMessage.timer);
        showBossEncounterMessage.timer = setTimeout(() => {
            MESSAGE.hidden = true;
        }, 1800);
    }
}
function renderBossEncounterStage(stage) {
    if (!personalGarden || active?.world?.scene === 'raid') {
        return null;
    }
    const PROGRESS = personalGarden.farmBossProgress,
        WAS_SELECTED = PROGRESS.selections.some((entry) => entry.stage === stage),
        PREVIOUS_STAGE = PROGRESS.currentStage;
    const SELECTION = selectFarmBossStage(PROGRESS, stage);
    if (!WAS_SELECTED || PREVIOUS_STAGE !== stage) {
        personalGarden.markProgressChanged();
        saveImmediate(personalGarden);
    }
    const SPECIES = SELECTION.species,
        CATALOG_ENTRY = speciesById(SPECIES),
        REWARD_NAME = speciesRewardName(SPECIES),
        ENCOUNTER_NAME = giantSpeciesName(SPECIES),
        ROLLS = SELECTION.rolls;
    DOLLAR('bossStageCounter').textContent = `${SELECTION.stage} / ${BOSS_REWARD_SETTINGS.maxStage}`;
    DOLLAR('bossStageLabel').textContent = `STAGE ${SELECTION.stage}`;
    renderNeutralBossPreview(DOLLAR('bossPreview'), SPECIES, CATALOG_ENTRY.asset, `${ENCOUNTER_NAME} 미리보기`);
    DOLLAR('bossStageName').textContent = ENCOUNTER_NAME;
    DOLLAR('bossStageHp').textContent = `HP ${Math.round(SELECTION.hp).toLocaleString('ko-KR')}`;
    DOLLAR('bossStageAttack').textContent =
        `공격력 ${Number(SELECTION.attackPower.toPrecision(3)).toLocaleString('ko-KR')}`;
    DOLLAR('bossStageXp').textContent = `+${SELECTION.xp.toLocaleString('ko-KR')} XP`;
    DOLLAR('bossStageDrop').hidden = ROLLS === 0;
    DOLLAR('bossStageDrop').replaceChildren();
    if (ROLLS > 0) {
        const ICON = document.createElement('img');
        ICON.draggable = false;
        const LABEL = document.createElement('span'),
            TITLE = document.createElement('strong'),
            DETAILS = document.createElement('small');
        TITLE.textContent = REWARD_NAME;
        DETAILS.textContent = `${Math.round(BOSS_REWARD_SETTINGS.acquisitionChance * 100)}%씩 · ${ROLLS}회 개별 추첨 · 성공마다 T1 1마리`;
        LABEL.append(TITLE, DETAILS);
        DOLLAR('bossStageDrop').append(ICON, LABEL);
        renderNeutralBossPreview(ICON, SPECIES, CATALOG_ENTRY.asset);
        DOLLAR('bossStageNotice').textContent = '';
    } else {
        DOLLAR('bossStageNotice').textContent = '종 보상은 없어요 · 5스테이지부터 1회 추첨';
    }
    DOLLAR('bossEncounterChallenge').disabled =
        !hasRaidRosterEntries(personalGarden.units) ||
        personalGarden.farmBossEvent?.phase !== 'idle' ||
        personalGarden.activeRaidRunSequence !== null;
    DOLLAR('bossEncounterChallenge').title = DOLLAR('bossEncounterChallenge').disabled
        ? '전투를 시작하려면 투입 가능한 병력과 정원 상태가 필요해요.'
        : '';
    return SELECTION;
}
function openBossEncounter(push = true) {
    stopWorldInput();
    if (active?.world?.scene === 'raid') {
        return false;
    }
    if (!personalGarden) {
        if (STORAGE.world && STORAGE.world.activeRaidRunSequence === null) {
            start(restore(snapshot(STORAGE.world)), false);
        } else {
            return false;
        }
    }
    if (personalGarden.farmBossEvent?.phase !== 'idle' || personalGarden.activeRaidRunSequence !== null) {
        return false;
    }
    if (!persist()) {
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
    renderBossEncounterStage(personalGarden.farmBossProgress.currentStage);
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
    document.body.dataset.bossScreen = 'false';
    DOLLAR('bossEncounterScreen').hidden = true;
    bossSwipe = null;
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
    DOLLAR('continueLegacyGame').disabled = !STORAGE.legacyCompatible;
    DOLLAR('legacySaveNotice').hidden = !STORAGE.legacyCompatible;
    DOLLAR('exportSave').disabled = !(STORAGE.raw || STORAGE.legacyRaw);
    DOLLAR('exportLegacySave').hidden = !STORAGE.legacyBackup;
    DOLLAR('exportLegacySave').disabled = !STORAGE.legacyBackup;
    DOLLAR('saveNotice').textContent = [STORAGE.migrationNotice, STORAGE.error].filter(Boolean).join(' ');
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
function start(world, push = true) {
    AUTOSAVE.reset();
    FOOD_FEEL.unlock();
    replacePersonalGarden(world);
    install(world);
    setHome(false, push);
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
        FAIL(Error(STORAGE.error || '농장 원정 예약을 저장하지 못했어요.'));
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
    const ENTRIES = raidRosterEntries(personalGarden.units, CONFIG.raid.capacity.playerUnits).map(
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
            settleVictory: ({ farm, receiptKey, deploymentMultiplier }) => {
                const GARDEN = restore(farm),
                    STAGE = raidWorld.boss.stage || 0,
                    STAGE_REWARD = STAGE ? bossStageStats(STAGE) : null,
                    RESOLVED = settleBossKill(GARDEN, {
                        encounterId: FARM_RUN.runSequence,
                        source: 'raid',
                        receiptKey,
                        acquisitionMultiplier: deploymentMultiplier,
                        rollCount: STAGE_REWARD?.rolls ?? 1,
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
                            roll: REWARD.roll,
                            rollCount: REWARD.rollCount,
                            rolls: REWARD.drops,
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
        !personalGarden ||
        active.world.scene === 'raid' ||
        personalGarden.activeRaidRunSequence !== null ||
        personalGarden.farmBossEvent?.phase !== 'idle' ||
        !raidRosterEntries(personalGarden.units, 1).length
    ) {
        return;
    }
    if (!persist()) {
        return;
    }
    const BOSS_STAGE = renderBossEncounterStage(personalGarden.farmBossProgress.currentStage);
    if (!BOSS_STAGE || !persist()) {
        return;
    }
    const RESERVED = reservePersonalRaidRun();
    if (!RESERVED) {
        return;
    }
    closeBossEncounter(false);
    const BATTLE = Garden.createRaidBattle(
        (personalGarden.seed + Math.floor(performance.now())) >>> 0,
        ['solo'],
        BOSS_STAGE,
    );
    install(BATTLE);
    active.queue('register-roster', {
        entries: raidRosterEntries(personalGarden.units, CONFIG.raid.capacity.playerUnits),
        abilitySnapshot: createAbilityRuntimeSnapshot(personalGarden.playerProgression),
        settlement: {
            sessionId: RESERVED.sessionId,
            runSequence: RESERVED.runSequence,
            encounterId: RESERVED.runSequence,
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
        start(restore(snapshot(STORAGE.world)));
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
DOLLAR('bossEncounterChallenge').onclick = () => {
    if (DOLLAR('bossEncounterChallenge').disabled) {
        return;
    }
    closeBossEncounter(false);
    beginRaid(true);
};
DOLLAR('bossEncounterScreen').addEventListener('pointerdown', (e) => {
    if (!bossEncounterOpen || e.button > 0 || e.target.closest('button')) {
        return;
    }
    const VIEWPORT = DOLLAR('bossEncounterViewport'),
        CARD = DOLLAR('bossEncounterCard');
    bossSwipe = {
        pointerId: e.pointerId,
        y: e.clientY,
    };
    CARD.style.transition = 'none';
    VIEWPORT.setPointerCapture?.(e.pointerId);
    e.preventDefault();
});
DOLLAR('bossEncounterScreen').addEventListener('pointermove', (e) => {
    if (!bossSwipe || e.pointerId !== bossSwipe.pointerId) {
        return;
    }
    const DELTA = Math.max(-120, Math.min(120, e.clientY - bossSwipe.y));
    DOLLAR('bossEncounterCard').style.transform = `translateY(${DELTA * 0.55}px)`;
    e.preventDefault();
});
DOLLAR('bossEncounterScreen').addEventListener('pointerup', (e) => {
    if (!bossSwipe || e.pointerId !== bossSwipe.pointerId) {
        return;
    }
    const DELTA = e.clientY - bossSwipe.y,
        CARD = DOLLAR('bossEncounterCard');
    bossSwipe = null;
    if (Math.abs(DELTA) < 42) {
        CARD.style.transition = 'transform .18s ease-out';
        CARD.style.transform = 'translateY(0)';
        setTimeout(() => {
            CARD.style.transition = '';
            CARD.style.transform = '';
        }, 200);
        return;
    }
    const CURRENT = personalGarden?.farmBossProgress?.currentStage || 1,
        NEXT = DELTA < 0 ? Math.min(BOSS_REWARD_SETTINGS.maxStage, CURRENT + 1) : Math.max(1, CURRENT - 1);
    if (NEXT === CURRENT) {
        showBossEncounterMessage(
            DELTA < 0 ? `현재 스테이지 상한 ${BOSS_REWARD_SETTINGS.maxStage}예요` : '첫 스테이지예요',
        );
        return;
    }
    CARD.style.transform = '';
    CARD.style.transition = '';
    CARD.style.animation = 'none';
    void CARD.offsetWidth;
    CARD.style.animation = '';
    renderBossEncounterStage(NEXT);
});
DOLLAR('bossEncounterScreen').addEventListener('pointercancel', (e) => {
    if (bossSwipe?.pointerId === e.pointerId) {
        bossSwipe = null;
        const CARD = DOLLAR('bossEncounterCard');
        CARD.style.transition = 'transform .18s ease-out';
        CARD.style.transform = 'translateY(0)';
        setTimeout(() => {
            CARD.style.transition = '';
            CARD.style.transform = '';
        }, 200);
    }
});
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
        DOLLAR('saveNotice').textContent = '이전 원정을 보상 없이 종료했어요. 병력과 성장 포인트는 그대로예요.';
    } catch (error) {
        FAIL(error);
    }
};
DOLLAR('newGame').onclick = () => {
    // Overwriting an existing save is a separate, explicit user action.
    if ((STORAGE.raw || STORAGE.legacyRaw) && !DOLLAR('newConfirm').hidden) {
        return;
    }
    if (STORAGE.raw || STORAGE.legacyRaw) {
        DOLLAR('newConfirmText').textContent = STORAGE.raw
            ? '현재 정원을 새 정원으로 바꿀까요? 필요한 저장은 먼저 내보내 주세요.'
            : '새 정원을 시작할까요? 기존 원본 저장은 별도 키에 그대로 남아요.';
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
    const RAW = STORAGE.raw || STORAGE.legacyRaw;
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
DOLLAR('exportLegacySave').onclick = () => {
    const RAW = STORAGE.legacyBackup?.raw;
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
    A.download = 'budmori-legacy-save-' + new Date().toISOString().slice(0, 10) + '.json';
    A.click();
    setTimeout(() => URL.revokeObjectURL(URL_LOCAL), 1000);
};
DOLLAR('importSave').onclick = () => DOLLAR('saveFile').click();
DOLLAR('continueLegacyGame').onclick = async () => {
    if (!STORAGE.legacyRaw) {
        return;
    }
    try {
        const { validateSave: VALIDATE_SAVE } = await import('./farm-storage.js');
        VALIDATE_SAVE(STORAGE.legacyRaw);
        imported = STORAGE.legacyRaw;
        importedLegacy = true;
        DOLLAR('importConfirmText').textContent = saveHasLegacyFarmProgress(STORAGE.legacyRaw)
            ? '이전 활동 기반 강화는 종료되고 경험치 포인트로 통합돼요. 기존 무료 강화는 초기화되고, 원본을 먼저 백업합니다. 이어갈까요?'
            : '0.4 원본 저장은 그대로 두고 새 저장 키에 복사해 이어갈까요?';
        DOLLAR('confirmImport').textContent = '원본을 보존하고 이어가기';
        DOLLAR('importConfirm').hidden = false;
    } catch (e) {
        DOLLAR('saveNotice').textContent = e.message;
    }
};
DOLLAR('saveFile').onchange = async () => {
    const FILE = DOLLAR('saveFile').files[0];
    if (!FILE) {
        return;
    }
    try {
        if (FILE.size > 2 * 1024 * 1024) {
            throw Error('저장 파일이 너무 큽니다.');
        }
        const TEXT = await FILE.text();
        const { validateSave: VALIDATE_SAVE } = await import('./farm-storage.js');
        VALIDATE_SAVE(TEXT);
        imported = TEXT;
        importedLegacy = false;
        DOLLAR('importConfirmText').textContent = saveHasLegacyFarmProgress(TEXT)
            ? '이전 활동 기반 강화는 종료되고 경험치 포인트로 통합돼요. 기존 무료 강화는 초기화됩니다. 원본을 먼저 백업한 뒤 이 저장을 불러올까요?'
            : '선택한 파일로 개인 저장을 바꿀까요?';
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
    importedLegacy = false;
    DOLLAR('importConfirm').hidden = true;
};
DOLLAR('confirmImport').onclick = () => {
    try {
        if (imported) {
            const LEGACY = importedLegacy,
                WORLD = STORAGE.import(imported);
            AUTOSAVE.reset();
            if (LEGACY) {
                start(WORLD);
            } else {
                replacePersonalGarden(WORLD);
                install(WORLD);
                active.paused = true;
            }
        }
        imported = null;
        importedLegacy = false;
        DOLLAR('importConfirm').hidden = true;
        refreshStart();
    } catch (e) {
        DOLLAR('saveNotice').textContent = e.message;
    }
};
DOLLAR('farm').onclick = () => returnToFarm();
DOLLAR('raid').onclick = () => openBossEncounter();
DOLLAR('return').onclick = () => returnToFarm();
for (const VALUE of ['breed', 'merge']) {
    DOLLAR(VALUE).onclick = () =>
        active.queue('mode', {
            value: VALUE,
        });
}
DOLLAR('feed').addEventListener('keydown', (e) => {
    if (e.repeat && ['Enter', ' '].includes(e.key)) {
        e.preventDefault();
    }
});
DOLLAR('feed').onclick = (e) => {
    if (e.detail === 0 && !e.pointerType) {
        requestFeed();
    }
};
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
}
const MENU_ROUTES = {
    play: '#/menu',
    growth: '#/growth',
    abilities: '#/abilities',
    help: '#/help',
    formation: '#/formation',
};
const ROUTE_MENU_TAB = (route) => Object.keys(MENU_ROUTES).find((tab) => MENU_ROUTES[tab] === route) || 'play';
function applyMenuTab(tab) {
    menuTab = tab;
    const UPGRADES = ['growth', 'abilities', 'formation'].includes(tab);
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
        ['growth', 'treePanel'],
        ['abilities', 'abilityPanel'],
        ['help', 'helpPanel'],
        ['formation', 'formationPanel'],
    ]) {
        DOLLAR(ID).hidden = NAME !== tab;
    }
    if (tab === 'growth') {
        drawTree();
    } else if (tab === 'abilities') {
        drawAbilityTree();
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
        ['growth', 'abilities', 'formation'].includes(menuTab)
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
GAME_MENU_OVERLAY.addEventListener('pointerdown', CLOSE_MENU_FROM_BACKDROP);
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
        active.queue('ability-reset');
    } else if (BUTTON.dataset.abilityNode) {
        const [ABILITY_ID, KIND, LEVEL] = BUTTON.dataset.abilityNode.split(':');
        const NODE_ID = KIND === 'root' ? 'root' : `${KIND}-${LEVEL}`;
        active.queue('progression-invest', {
            scope: 'ability',
            abilityId: ABILITY_ID,
            nodeId: NODE_ID,
        });
    }
    setTimeout(drawAbilityTree, 180);
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
    syncFlag(
        'deployTroops',
        'disabled',
        !ROSTER || REMAINING - QUEUED <= 0 || active.paused || ['victory', 'defeat'].includes(W.encounter.outcome),
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
        const STAGE_REWARD = bossStageStats(STAGE),
            MULTIPLIER = raidDeploymentRewardMultiplier({
                availableAtStart: ROSTER?.troops.length || 0,
                originalUnitsDeployed: deployed,
            }),
            CHANCE = Math.round(
                bossAcquisitionChance({
                    acquisitionMultiplier: MULTIPLIER,
                }) * 100,
            );
        syncText(
            'raidRewardChance',
            STAGE_REWARD.rolls
                ? `${speciesRewardName(W.boss.species)} · ${CHANCE}%씩 · ${STAGE_REWARD.rolls}회 개별 추첨`
                : '종 추첨 없음',
        );
    } else {
        syncText('raidRewardChance', '');
    }
}
function canUseWorldInput() {
    return !home && !menuOpen && !bossEncounterOpen && !active.paused;
}
function deployTroop() {
    if (!canUseWorldInput() || active.world.scene !== 'raid') {
        return false;
    }
    return active.deployNext();
}
function stopDrop(e) {
    if (e && dropPointer !== null && e.pointerId !== dropPointer) {
        return;
    }
    const ID = dropPointer;
    dropPointer = null;
    if (dropTimer !== null) {
        clearInterval(dropTimer);
    }
    dropTimer = null;
    const BUTTON = DOLLAR('deployTroops');
    BUTTON.setAttribute('aria-pressed', 'false');
    if (typeof ID === 'number' && BUTTON.hasPointerCapture?.(ID)) {
        BUTTON.releasePointerCapture(ID);
    }
}
function beginDrop(id) {
    if (dropPointer !== null || panPointer || !deployTroop()) {
        return false;
    }
    dropPointer = id;
    DOLLAR('deployTroops').setAttribute('aria-pressed', 'true');
    dropTimer = setInterval(() => {
        if (dropPointer !== null && !deployTroop()) {
            stopDrop();
        }
    }, 100);
    return true;
}
DOLLAR('deployTroops').addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !beginDrop(e.pointerId)) {
        return;
    }
    FOOD_FEEL.unlock();
    DOLLAR('deployTroops').setPointerCapture?.(e.pointerId);
    e.preventDefault();
});
DOLLAR('deployTroops').addEventListener('lostpointercapture', stopDrop);
DOLLAR('deployTroops').addEventListener('keydown', (e) => {
    if (!['Enter', ' '].includes(e.key)) {
        return;
    }
    e.preventDefault();
    if (!e.repeat) {
        beginDrop('keyboard');
    }
});
DOLLAR('deployTroops').addEventListener('keyup', (e) => {
    if (['Enter', ' '].includes(e.key)) {
        e.preventDefault();
        stopDrop();
    }
});
DOLLAR('deployTroops').addEventListener('blur', () => stopDrop());
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
function stopWorldInput(e) {
    stopDrop(e);
    stopPan(e);
}
CANVAS.addEventListener('pointerdown', (e) => {
    FOOD_FEEL.unlock();
    if (e.button !== 0 || !canUseWorldInput() || panPointer || dropPointer !== null) {
        return;
    }
    panPointer = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
    };
    CANVAS.setPointerCapture?.(e.pointerId);
    e.preventDefault();
});
CANVAS.addEventListener('pointermove', (e) => {
    if (!panPointer || e.pointerId !== panPointer.id) {
        return;
    }
    if (!canUseWorldInput()) {
        stopPan();
        return;
    }
    RENDERER.panByScreen(e.clientX - panPointer.x, e.clientY - panPointer.y);
    panPointer.x = e.clientX;
    panPointer.y = e.clientY;
    e.preventDefault();
});
CANVAS.addEventListener('lostpointercapture', stopPan);
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
    }
});
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bossEncounterOpen) {
        e.preventDefault();
        closeBossEncounter();
    } else if (e.key === 'Escape' && menuOpen) {
        e.preventDefault();
        closeMenu();
    } else if (bossEncounterOpen && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const CURRENT = personalGarden?.farmBossProgress?.currentStage || 1,
            NEXT =
                e.key === 'ArrowUp' ? Math.min(BOSS_REWARD_SETTINGS.maxStage, CURRENT + 1) : Math.max(1, CURRENT - 1);
        renderBossEncounterStage(NEXT);
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
    if (R === '#/help' || R === '#/growth' || R === '#/abilities' || R === '#/formation' || R === '#/menu') {
        const RAID = active.world.scene === 'raid',
            FARM_EVENT_ACTIVE = !RAID && personalGarden?.farmBossEvent?.phase !== 'idle';
        const RESTRICTED =
            (R === '#/growth' && (RAID || FARM_EVENT_ACTIVE)) || (R === '#/abilities' && (RAID || !personalGarden));
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
        HAS_READY_TROOPS = personalGarden ? hasRaidRosterEntries(personalGarden.units) : false,
        REWARD_WORLD = personalGarden || W,
        PENDING_REWARD = REWARD_WORLD.bossRewardReceipts.find((reward) => reward.status === 'pending');
    if ((home || menuOpen || bossEncounterOpen || active.paused) && (dropPointer !== null || panPointer)) {
        stopWorldInput();
    }
    syncAttribute('farm', 'aria-pressed', !RAID && !bossEncounterOpen);
    syncAttribute('raid', 'aria-pressed', RAID || bossEncounterOpen);
    syncAttribute('breed', 'aria-pressed', W.mode === 'breed');
    syncAttribute('merge', 'aria-pressed', W.mode === 'merge');
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
    syncFlag('farmControls', 'hidden', RAID || FARM_EVENT_ACTIVE || home || bossEncounterOpen);
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
            ? `${W.units.length} deployed in raid`
            : PENDING_REWARD
              ? `${speciesRewardName(PENDING_REWARD.species)} 보상 대기 · 공간이 생기면 합류해요`
              : !HAS_READY_TROOPS
                ? '모두 휴식 중 · 회복까지 기다려 주세요'
                : worldCount >= W.capacity
                  ? '정원이 가득 찼어요'
                  : '번식으로 식구를 늘려요',
    );
    syncWidth('allyHealth', (armyMax ? (armyCurrent / armyMax) * 100 : 0) + '%');
    syncText(
        'allyHealthText',
        Math.ceil(armyCurrent) + ' / ' + Math.ceil(armyMax) + ' HP · ' + armyLiving + '/' + armyTotal + ' 생존',
    );
    const BOSS = display.boss,
        BATTLE_OUTCOME = RAID ? W.encounter.outcome : FARM_EVENT?.outcome,
        SETTLED_RUN_SEQUENCE = RAID ? (personalGarden?.activeRaidRunSequence ?? W.boss.encounterId) : null,
        SETTLED_REWARD =
            RAID &&
            personalGarden?.raidSettlementReceipts?.find((receipt) => receipt.runSequence === SETTLED_RUN_SEQUENCE)
                ?.reward,
        STAGE_NAME = RAID && BOSS.stage ? `STAGE ${BOSS.stage}` : '',
        REWARD_NAME = speciesRewardName(BOSS.species),
        ENCOUNTER_NAME = giantSpeciesName(BOSS.species);
    syncText('bossName', ENCOUNTER_NAME);
    syncAttribute('bossHealth', 'aria-label', `${ENCOUNTER_NAME} 체력`);
    syncText('bossHealthText', Math.ceil(BOSS.hp) + ' / ' + BOSS.maxHp + ' HP');
    syncText('bossHealthNote', FARM_EVENT_ACTIVE ? '상대 능력치 고정' : '전사자 포함 최대 HP');
    syncAttribute('allyHealth', 'aria-valuenow', armyCurrent);
    syncAttribute('allyHealth', 'aria-valuemax', armyMax);
    syncAttribute('bossHealth', 'aria-valuenow', BOSS.hp);
    syncAttribute('bossHealth', 'aria-valuemax', BOSS.maxHp);
    syncWidth('bossHealth', BOSS.maxHp ? (BOSS.hp / BOSS.maxHp) * 100 + '%' : '0%');
    syncText(
        'battleOutcome',
        RAID
            ? BATTLE_OUTCOME === 'victory'
                ? `${STAGE_NAME} · ${ENCOUNTER_NAME} · 승리 · ${SETTLED_REWARD?.xp?.amount ?? bossStageStats(BOSS.stage || 1).xp} XP${SETTLED_REWARD?.acquisition?.rollCount ? ` · ${REWARD_NAME} ${SETTLED_REWARD.acquisition.rolls?.filter((drop) => drop.status === 'granted').length || 0}/${SETTLED_REWARD.acquisition.rollCount}회 성공` : SETTLED_REWARD ? ' · 종 추첨 없음' : bossStageStats(BOSS.stage || 1).rolls ? ' · 정원 복귀 후 보상 정산' : ' · 종 추첨 없음'} · 모두 정원으로 돌아갈 수 있어요`
                : BATTLE_OUTCOME === 'defeat'
                  ? `${STAGE_NAME} · ${ENCOUNTER_NAME} · 패배 · 휴식이 필요해요 · 정원에서 다시 준비해요`
                  : ''
            : BATTLE_OUTCOME === 'victory'
              ? FARM_EVENT.rewardStatus === 'granted'
                  ? `${ENCOUNTER_NAME} 격파 · ${REWARD_NAME} 획득 · 정원에 합류했어요`
                  : FARM_EVENT.rewardStatus === 'pending'
                    ? `${ENCOUNTER_NAME} 격파 · ${REWARD_NAME} 획득 대기 · 공간이 생기면 합류해요`
                    : `${ENCOUNTER_NAME} 격파`
              : BATTLE_OUTCOME === 'defeat'
                ? `${ENCOUNTER_NAME} 도전 종료 · 동료들이 다시 일어날 때까지 기다려요`
                : '',
    );
    syncFlag(
        'battleOutcome',
        'hidden',
        home || !BATTLE_HUD || BATTLE_OUTCOME === 'fighting' || BATTLE_OUTCOME === 'idle',
    );
    syncFlag(
        'bossEncounterChallenge',
        'disabled',
        !personalGarden || !HAS_READY_TROOPS || FARM_EVENT_ACTIVE || personalGarden?.activeRaidRunSequence !== null,
    );
    syncFlag('menuTabGrowth', 'disabled', RAID || FARM_EVENT_ACTIVE || bossEncounterOpen);
    syncFlag('menuTabAbilities', 'disabled', RAID || !personalGarden);
    syncFlag('raid', 'disabled', RAID || FARM_EVENT_ACTIVE || !personalGarden);
    syncText('pause', active.paused ? '▶' : 'Ⅱ');
    syncAttribute('pause', 'aria-label', active.paused ? '게임 계속' : '게임 일시 정지');
    syncAttribute('pause', 'title', active.paused ? '게임 계속' : '일시 정지');
    syncAttribute('feed', 'aria-label', `먹이 탭, 5회 중 ${W.foodTaps.remainder}회`);
    syncData('feed', 'state', W.food.length >= 140 ? 'full' : 'ready');
    syncData('feed', 'produced', now < FOOD_FEEL.completeUntil);
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
        RENDERER.render(DISPLAY, COMBAT_FEEL, DISPLAY.displayTimeMs);
        PERFORMANCE_DIAGNOSTICS.end('render', RENDER_START);
        const UI_START = PERFORMANCE_DIAGNOSTICS.start();
        sync(DISPLAY, now, NOTICES);
        FORMATION_UI.update(active.world, DISPLAY, !home, active.localPlayerId);
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
DOLLAR('startVersion').textContent = PRODUCT_VERSION + ' · 자동 편성 스킬 9종';
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
