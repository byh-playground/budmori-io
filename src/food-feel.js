const DOLLAR = (id) => document.getElementById(id);
class FoodFeel {
    constructor() {
        this.voices = new Set();
        this.lastSound = {};
        this.frameId = 0;
        this.soundFrame = {};
        this.muted = false;
        this.peakVoices = 0;
        this.counts = {
            land: 0,
            eat: 0,
        };
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
        window.addEventListener('blur', () => {
            this.silence();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.silence();
            }
        });
        window.addEventListener('pagehide', () => {
            this.silence();
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
                crit: [620, 240, 0.11, 0.2],
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
    event(kind) {
        if (kind === 'food-land' || kind === 'eat') {
            const KEY = kind === 'eat' ? 'eat' : 'land';
            this.counts[KEY]++;
            this.sound(KEY);
        }
    }
    frame() {
        this.frameId++;
    }
}
export { FoodFeel };
