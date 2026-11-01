import { BOSS_REWARD_BANDS, revealBossReward } from '../boss/boss-rewards.js';
import { BOSS_SPECIES } from '../units/species-catalog.js';
import { speciesFacePortraitSource } from '../units/species-paint.js';

const PRESENTATION = Object.freeze({
    durationMs: 1000,
    resultHoldMs: 1400,
    maxSprouts: 24,
    specks: 12,
    sceneHeight: 340,
    sproutWidth: 52,
    sproutHeight: 58,
});
const CHEST_TIERS = ['wood', 'iron', 'gold', 'magic', 'jade'];

// Presentation jitter has its own deterministic hash, so the animation never consumes game RNG.
function variation(seed, index, domain) {
    let value = (seed + index * 104729 + domain * 13007) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

export class BossRewardDialog {
    constructor(root, { onOpen }) {
        this.root = root;
        this.onOpen = onOpen;
        this.world = null;
        this.receipt = null;
        this.frame = null;
        this.closeTimer = null;
        this.previousFocus = null;
        this.elapsedMs = 0;
        this.sprouts = [];
        this.specks = [];
        this.elements = Object.fromEntries(
            [...root.querySelectorAll('[id]')].map((element) => [element.id.replace('bossReward', ''), element]),
        );
        this.lid = root.querySelector('.boss-reward-chest__lid-pivot');
        this.lock = root.querySelector('.boss-reward-chest__lock');
        this.resize = new ResizeObserver(() => {
            if (!this.root.hidden) {
                this.measure();
                this.render(this.elapsedMs);
            }
        });
        this.resize.observe(this.elements.ChestScene);
        this.listeners = new AbortController();
        const OPTIONS = { signal: this.listeners.signal };
        this.elements.Close.addEventListener('click', () => this.close(), OPTIONS);
        this.elements.OpenAll.addEventListener(
            'click',
            () => (this.receipt?.revealed ? this.close() : this.finish()),
            OPTIONS,
        );
        root.addEventListener(
            'click',
            (event) => {
                if (event.target === root) {
                    this.close();
                }
            },
            OPTIONS,
        );
        root.addEventListener('keydown', (event) => this.handleKey(event), OPTIONS);
    }
    show(world, receipt) {
        if (this.world === world && this.receipt === receipt && !this.root.hidden) {
            return;
        }
        this.hide();
        this.world = world;
        this.receipt = receipt;
        this.previousFocus = document.activeElement;
        this.onOpen();
        this.root.hidden = false;
        this.elements.Chest.dataset.tier = CHEST_TIERS[(Math.max(1, receipt.stage) - 1) % CHEST_TIERS.length];
        this.elements.Stage.textContent = `${receipt.stage}층 · 보스 격파`;
        this.elements.Title.textContent = '승리 보상';
        this.elements.RevealCount.textContent = '보상 상자 1개';
        this.prepare();
        this.measure();
        this.elements.OpenAll.focus({ preventScroll: true });
        if (receipt.revealed || matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.finish();
            return;
        }
        this.render(0);
        const STARTED = performance.now();
        const ADVANCE = (now) => {
            this.frame = null;
            if (this.root.hidden) {
                return;
            }
            this.render(Math.min(PRESENTATION.durationMs, Math.max(0, now - STARTED)));
            if (this.elapsedMs < PRESENTATION.durationMs) {
                this.frame = requestAnimationFrame(ADVANCE);
            } else {
                this.finish();
            }
        };
        this.frame = requestAnimationFrame(ADVANCE);
    }
    prepare() {
        this.elements.Sprouts.replaceChildren();
        this.sprouts.length = 0;
        this.specks.length = 0;
        const COUNT = Math.min(this.receipt.acquiredCount, PRESENTATION.maxSprouts),
            PORTRAITS = COUNT
                ? ['surprised', 'happy'].map((face) => speciesFacePortraitSource(BOSS_SPECIES, face))
                : [];
        this.seed = (this.world.seed ^ this.receipt.encounterId) >>> 0;
        for (let index = 0; index < COUNT; index += 1) {
            const SPROUT = document.createElement('img');
            SPROUT.className = 'boss-reward-sprout';
            SPROUT.alt = '';
            SPROUT.src = PORTRAITS[index % PORTRAITS.length];
            SPROUT.draggable = false;
            this.elements.Sprouts.append(SPROUT);
            this.sprouts.push(SPROUT);
        }
        for (let index = 0; index < (COUNT ? PRESENTATION.specks : 0); index += 1) {
            const SPECK = document.createElement('i');
            SPECK.className = 'boss-reward-speck';
            this.elements.Sprouts.append(SPECK);
            this.specks.push(SPECK);
        }
    }
    measure() {
        const SCENE = this.elements.ChestScene;
        this.scale = SCENE.clientHeight / PRESENTATION.sceneHeight;
        this.centerX = SCENE.clientWidth / 2;
        this.spread = Math.min(SCENE.clientWidth - PRESENTATION.sproutWidth * this.scale, 260 * this.scale);
        SCENE.style.setProperty('--reward-scale', this.scale);
    }
    render(elapsedMs) {
        this.elapsedMs = elapsedMs;
        const OPEN = Math.max(0, Math.min(1, (elapsedMs - 120) / 120)),
            SCALE = this.scale;
        this.lid.style.transform = `translateY(${-47 * OPEN}px) rotate(${-12 * OPEN}deg)`;
        this.lock.style.opacity = 1 - OPEN;
        this.elements.ChestWrap.style.transform = 'translateX(-50%)' + (elapsedMs < 120 ? ' scale(1.025, .95)' : '');
        this.elements.Mouth.style.opacity = OPEN;
        this.elements.Glow.style.opacity = this.receipt.acquiredCount
            ? OPEN * Math.max(0, 1 - (elapsedMs - 400) / 550) * 0.7
            : 0;
        const COUNT = this.sprouts.length;
        for (let index = 0; index < COUNT; index += 1) {
            const SPROUT = this.sprouts[index],
                RANDOM = (domain) => variation(this.seed, index, domain),
                DELAY = 150 + RANDOM(1) * 130,
                T = Math.max(0, Math.min(1, (elapsedMs - DELAY) / (620 + RANDOM(2) * 130))),
                // Golden-ratio spacing avoids overlapping rows for counts divisible by seven.
                RANK = COUNT > 1 ? (index * 0.618033988749895) % 1 : 0.5,
                END_X = this.centerX + (RANK - 0.5) * this.spread,
                END_Y = (285 + Math.floor(index / 8) * 14) * SCALE,
                START_X = this.centerX + (RANDOM(3) - 0.5) * 32 * SCALE,
                START_Y = 191 * SCALE,
                X = START_X + (END_X - START_X) * Math.sin((T * Math.PI) / 2),
                Y = START_Y + (END_Y - START_Y) * T - (65 + RANDOM(4) * 70) * 4 * T * (1 - T) * SCALE,
                BOUNCE = T > 0.86 ? Math.sin(((T - 0.86) / 0.14) * Math.PI) * 8 * SCALE : 0,
                ROTATION = (1 - T) * (RANDOM(5) - 0.5) * 65,
                SIZE = T < 0.07 ? 0.6 + T * 5.7 : 1;
            SPROUT.style.opacity = elapsedMs < DELAY ? 0 : 1;
            SPROUT.style.transform = `translate(${X - (PRESENTATION.sproutWidth / 2) * SCALE}px, ${Y - PRESENTATION.sproutHeight * SCALE - BOUNCE}px) rotate(${ROTATION}deg) scale(${SIZE})`;
            SPROUT.style.zIndex = String(3 + Math.round(Y));
        }
        for (let index = 0; index < this.specks.length; index += 1) {
            const SPECK = this.specks[index],
                T = Math.max(0, Math.min(1, (elapsedMs - 160) / 550)),
                ANGLE = (index * Math.PI * 2) / PRESENTATION.specks,
                X = this.centerX + Math.cos(ANGLE) * (35 + 100 * T) * SCALE,
                Y = (180 + Math.sin(ANGLE) * (25 + 105 * T) + 50 * T * T) * SCALE;
            SPECK.style.opacity = elapsedMs < 160 ? 0 : Math.max(0, 1 - T);
            SPECK.style.transform = `translate(${X}px, ${Y}px) rotate(${index * 30 + 90 * T}deg) scale(${SCALE})`;
        }
        this.renderSummary();
    }
    renderSummary() {
        const RECEIPT = this.receipt,
            DONE = this.elapsedMs >= PRESENTATION.durationMs;
        this.elements.ChestScene.dataset.phase = DONE ? 'result' : 'opening';
        this.elements.Summary.textContent =
            DONE && RECEIPT.acquiredCount === 0 ? '다음 전투의 보상을 기대해 주세요' : '새싹이 농장에 합류해요';
        this.elements.Band.hidden = !DONE || RECEIPT.bandIndex === null || RECEIPT.acquiredCount === 0;
        this.elements.Band.textContent = BOSS_REWARD_BANDS[RECEIPT.bandIndex]?.label || '';
        this.elements.PopAmount.textContent = DONE
            ? RECEIPT.acquiredCount > 0
                ? `새싹 ${RECEIPT.acquiredCount.toLocaleString('ko-KR')}마리`
                : '이번 상자는 비었어요'
            : this.elapsedMs < 160
              ? '상자가 열려요…'
              : RECEIPT.acquiredCount > 0
                ? '새싹이 쏟아져요!'
                : '상자가 열려요…';
        this.elements.Prize.dataset.phase = DONE ? 'result' : 'opening';
        this.elements.Totals.textContent =
            DONE && RECEIPT.acquiredCount > 0
                ? `${RECEIPT.placedCount.toLocaleString('ko-KR')}마리 농장에 배치` +
                  (RECEIPT.queuedCount > 0 ? ` · ${RECEIPT.queuedCount.toLocaleString('ko-KR')}마리 자리 대기` : '')
                : '';
        this.elements.OpenAll.textContent = DONE ? '확인' : '결과 바로 보기';
    }
    update(world) {
        if (!this.root.hidden && this.world === world && this.receipt) {
            this.renderSummary();
        }
    }
    finish() {
        if (!this.receipt) {
            return;
        }
        this.cancelAnimation();
        revealBossReward(this.world, this.receipt.receiptKey);
        this.render(PRESENTATION.durationMs);
        clearTimeout(this.closeTimer);
        this.closeTimer = setTimeout(() => this.close(), PRESENTATION.resultHoldMs);
    }
    cancelAnimation() {
        if (this.frame !== null) {
            cancelAnimationFrame(this.frame);
            this.frame = null;
        }
        clearTimeout(this.closeTimer);
        this.closeTimer = null;
    }
    close() {
        if (this.root.hidden) {
            return;
        }
        revealBossReward(this.world, this.receipt.receiptKey);
        const FOCUS = this.previousFocus;
        this.hide();
        if (FOCUS?.isConnected && !FOCUS.closest('[hidden]')) {
            FOCUS.focus({ preventScroll: true });
        }
    }
    hide() {
        this.cancelAnimation();
        this.root.hidden = true;
        this.world = null;
        this.receipt = null;
        this.previousFocus = null;
        this.elements.Sprouts.replaceChildren();
        this.sprouts.length = 0;
        this.specks.length = 0;
    }
    handleKey(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.close();
        } else if (event.key === 'Tab') {
            const FIRST = this.elements.Close,
                LAST = this.elements.OpenAll;
            if (event.shiftKey && document.activeElement === FIRST) {
                event.preventDefault();
                LAST.focus();
            } else if (!event.shiftKey && document.activeElement === LAST) {
                event.preventDefault();
                FIRST.focus();
            }
        }
    }
    dispose() {
        this.hide();
        this.resize.disconnect();
        this.listeners.abort();
    }
}
