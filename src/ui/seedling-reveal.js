import { speciesPortraitSource } from '../units/species-paint.js';
import { SEEDLING_TRANSFORM } from '../features/seedling-growth/definition.js';
import { iconSvg } from './icons.js';
import { SHELL } from '../i18n/messages/shell.js';
import { speciesDescription, speciesName } from '../i18n/messages/species.js';

// Committed growth notices feed a presentation-only queue. Loading a farm never scans its collection for reveals.
export class SeedlingReveal {
    constructor(root) {
        this.root = root;
        this.world = null;
        this.queue = [];
        this.seenSpecies = new Set();
        this.remainingMs = 0;
        this.lastNow = null;
        this.animation = null;
        root.innerHTML =
            '<img width="64" height="64" alt=""><div><small></small><h2></h2><p></p></div><button type="button">' +
            iconSvg('close') +
            '</button>';
        root.querySelector('small').textContent = SHELL.seedlingGrown();
        root.querySelector('button').setAttribute('aria-label', SHELL.seedlingClose());
        root.querySelector('button').onclick = () => {
            this.remainingMs = 0;
        };
    }
    update(world, display, notices, visible, now) {
        if (this.world !== world) {
            this.world = world;
            this.queue.length = 0;
            this.seenSpecies.clear();
            this.remainingMs = 0;
            this.animation?.cancel();
            this.root.hidden = true;
        }
        for (const NOTICE of notices) {
            if (NOTICE.kind !== 'seedling-grown' || !NOTICE.firstSpecies || this.seenSpecies.has(NOTICE.species)) {
                continue;
            }
            this.seenSpecies.add(NOTICE.species);
            this.queue.push(NOTICE);
        }
        if (!visible) {
            this.root.hidden = true;
            this.lastNow = now;
            return;
        }
        this.remainingMs -= this.lastNow === null ? 0 : Math.max(0, Math.min(100, now - this.lastNow));
        this.lastNow = now;
        if (this.remainingMs <= 0) {
            const NEXT = this.queue[0];
            if (!NEXT || display.time < NEXT.time + SEEDLING_TRANSFORM.duration) {
                this.root.hidden = true;
                return;
            }
            this.queue.shift();
            const NAME = speciesName(NEXT.species),
                PORTRAIT = this.root.querySelector('img');
            PORTRAIT.src = speciesPortraitSource(NEXT.species, NEXT.element, NEXT.temperament);
            PORTRAIT.alt = NAME;
            this.root.querySelector('h2').textContent = SHELL.seedlingFound({ name: NAME });
            this.root.querySelector('p').textContent = speciesDescription(NEXT.species);
            this.root.dataset.species = String(NEXT.species);
            this.remainingMs = 4500;
            this.animation?.cancel();
            if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
                this.animation = this.root.animate(
                    [
                        { opacity: 0, translate: '0 12px', scale: 0.9 },
                        { opacity: 1, translate: '0 0', scale: 1 },
                    ],
                    { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' },
                );
            }
        }
        this.root.hidden = false;
    }
}
