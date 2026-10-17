const DOLLAR = (id) => document.getElementById(id);
class FoodFeel {
    constructor(requestFeed) {
        this.button = DOLLAR('feed');
        this.pips = [...this.button.querySelectorAll('.tap-pip')];
        this.completeUntil = 0;
        this.pulseUntil = 0;
        this.animations = new Map();
        this.voices = new Set();
        this.lastSound = {};
        this.frameId = 0;
        this.soundFrame = {};
        this.muted = false;
        this.peakVoices = 0;
        this.counts = {
            manual: 0,
            auto: 0,
            complete: 0,
            land: 0,
            eat: 0,
        };
        this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        try {
            this.muted = localStorage.getItem('budmori.food.muted') === 'true';
        } catch {
            // Keep the session mute default when browser preferences cannot be read.
        }
        this.updateSoundButton();
        DOLLAR('sound').onclick = () => {
            this.muted = !this.muted;
            this.unlock();
            this.silence();
            try {
                localStorage.setItem('budmori.food.muted', String(this.muted));
            } catch {
                // Keep the current session preference when browser storage cannot persist it.
            }
            this.updateSoundButton();
        };
        const POINTERS = new Set();
        this.button.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) {
                return;
            }
            e.preventDefault();
            this.unlock();
            POINTERS.add(e.pointerId);
            this.button.setPointerCapture(e.pointerId);
            this.animate(
                this.button,
                [
                    {
                        transform: 'scale(1)',
                    },
                    {
                        transform: this.reduced ? 'scale(1)' : 'scale(1.035,.94)',
                    },
                ],
                75,
            );
        });
        this.button.addEventListener('pointerup', (e) => {
            if (!POINTERS.delete(e.pointerId)) {
                return;
            }
            e.preventDefault();
            const R = this.button.getBoundingClientRect();
            if (e.clientX >= R.left && e.clientX <= R.right && e.clientY >= R.top && e.clientY <= R.bottom) {
                requestFeed();
            }
            if (this.button.hasPointerCapture(e.pointerId)) {
                this.button.releasePointerCapture(e.pointerId);
            }
        });
        const CANCEL = (e) => POINTERS.delete(e.pointerId);
        this.button.addEventListener('pointercancel', CANCEL);
        this.button.addEventListener('lostpointercapture', CANCEL);
        window.addEventListener('blur', () => {
            POINTERS.clear();
            this.silence();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                POINTERS.clear();
                this.silence();
            }
        });
        window.addEventListener('pagehide', () => {
            this.silence();
            for (const A of this.animations.values()) {
                A.cancel();
            }
            this.animations.clear();
            this.audio?.close().catch(() => {
                // Page teardown can race an already-closed audio context.
            });
        });
    }
    updateSoundButton() {
        const B = DOLLAR('sound');
        DOLLAR('soundState').textContent = this.muted ? '꺼짐' : '켜짐';
        B.setAttribute('aria-pressed', String(!this.muted));
        B.setAttribute('aria-label', this.muted ? '효과음 켜기' : '효과음 끄기');
    }
    unlock() {
        if (this.muted) {
            return;
        }
        try {
            if (!this.audio) {
                this.audio = new AudioContext();
                this.master = this.audio.createGain();
                this.master.gain.value = 0.22;
                this.master.connect(this.audio.destination);
            }
            if (this.audio.state === 'suspended') {
                this.audio.resume().catch(() => {
                    // Autoplay policy may reject resume; a later user gesture can retry.
                });
            }
        } catch {
            // Audio may be unavailable or blocked; visual food feedback still works.
        }
    }
    silence() {
        for (const V of this.voices) {
            try {
                V.o.stop();
            } catch {
                // An already-ended oscillator needs no further cleanup.
            }
        }
    }
    sound(kind, step = 0) {
        if (this.muted || !this.audio || this.audio.state !== 'running' || document.hidden) {
            return;
        }
        const NOW = this.audio.currentTime,
            GAP = kind === 'tap' ? 0.025 : kind === 'complete' ? 0.055 : 0.09;
        if (
            this.soundFrame[kind] === this.frameId ||
            NOW - (this.lastSound[kind] ?? -99) < GAP ||
            this.voices.size >= 4
        ) {
            return;
        }
        this.soundFrame[kind] = this.frameId;
        this.lastSound[kind] = NOW;
        const DEFS = {
                tap: [340 + step * 65, 420 + step * 65, 0.055, 0.14],
                complete: [520, 1040, 0.12, 0.2],
                land: [240, 150, 0.065, 0.1],
                eat: [740, 990, 0.09, 0.09],
                strike: [180, 80, 0.075, 0.16],
                heavy: [95, 42, 0.16, 0.22],
                launch: [290, 145, 0.06, 0.07],
            },
            [HZ, END, DURATION, GAIN] = DEFS[kind];
        const O = this.audio.createOscillator(),
            G = this.audio.createGain(),
            V = {
                o: O,
                g: G,
            };
        O.type = kind === 'land' ? 'sine' : 'triangle';
        O.frequency.setValueAtTime(HZ, NOW);
        O.frequency.exponentialRampToValueAtTime(END, NOW + DURATION);
        G.gain.setValueAtTime(0, NOW);
        G.gain.linearRampToValueAtTime(GAIN, NOW + 0.004);
        G.gain.exponentialRampToValueAtTime(0.0001, NOW + DURATION);
        O.connect(G);
        G.connect(this.master);
        this.voices.add(V);
        this.peakVoices = Math.max(this.peakVoices, this.voices.size);
        O.onended = () => {
            O.disconnect();
            G.disconnect();
            this.voices.delete(V);
        };
        O.start(NOW);
        O.stop(NOW + DURATION + 0.01);
    }
    animate(el, frames, duration) {
        this.animations.get(el)?.cancel();
        const A = el.animate(frames, {
            duration,
            easing: 'ease-out',
        });
        this.animations.set(el, A);
        A.onfinish = () => {
            if (this.animations.get(el) === A) {
                this.animations.delete(el);
            }
        };
    }
    tap(source, complete, remainder) {
        this.counts[source]++;
        const NOW = performance.now(),
            MANUAL = source === 'manual';
        if (complete) {
            this.counts.complete++;
            this.completeUntil = NOW + (MANUAL ? 190 : 100);
        }
        // Automatic ticks never replace a stronger active manual response.
        if (MANUAL || NOW > this.pulseUntil) {
            this.pulseUntil = NOW + (MANUAL ? 150 : 55);
            this.button.dataset.impact = complete && MANUAL ? 'complete' : MANUAL ? 'manual' : 'auto';
            this.animate(
                this.button,
                [
                    {
                        transform:
                            this.reduced || !MANUAL
                                ? 'scale(1)'
                                : complete
                                  ? 'translateY(3px) scale(1.06,.90)'
                                  : 'scale(1.025,.95)',
                        filter: MANUAL ? 'brightness(1.16)' : 'brightness(1.035)',
                    },
                    {
                        transform: 'translateY(0) scale(1)',
                        filter: 'brightness(1)',
                    },
                ],
                MANUAL ? (complete ? 210 : 125) : 70,
            );
        }
        const PIP = this.pips[complete ? 4 : remainder - 1];
        this.animate(
            PIP,
            [
                {
                    transform: this.reduced ? 'scale(1)' : 'scaleY(1.8)',
                    background: '#fffbea',
                },
                {
                    transform: 'scaleY(1)',
                    background: complete ? '#fff1b9' : '#fff1b9',
                },
            ],
            MANUAL ? 160 : 70,
        );
        for (let i = 0; i < 5; i++) {
            this.pips[i].classList.toggle('filled', complete || i < remainder);
        }
        if (MANUAL) {
            this.sound(complete ? 'complete' : 'tap', remainder);
        }
    }
    event(kind) {
        if (kind === 'food-land' || kind === 'eat') {
            const KEY = kind === 'eat' ? 'eat' : 'land';
            this.counts[KEY]++;
            this.sound(KEY);
        }
    }
    frame(now) {
        this.frameId++;
        if (now > this.pulseUntil && this.button.dataset.impact !== '') {
            this.button.dataset.impact = '';
        }
    }
}
export { FoodFeel };
