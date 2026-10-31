import { speciesById } from '../units/species-catalog.js';
import { speciesPortraitSource } from '../units/species-paint.js';
import { SEEDLING_TRANSFORM } from '../features/seedling-growth/definition.js';
import { iconSvg } from './icons.js';

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
            '<img width="64" height="64" alt=""><div><small>새싹이 병사로 자랐어요</small><h2></h2><p></p></div><button type="button" aria-label="획득 카드 닫기">' +
            iconSvg('close') +
            '</button>';
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
            const SPECIES = speciesById(NEXT.species),
                PORTRAIT = this.root.querySelector('img');
            PORTRAIT.src = speciesPortraitSource(NEXT.species, NEXT.element, NEXT.temperament);
            PORTRAIT.alt = SPECIES.name;
            this.root.querySelector('h2').textContent = `${SPECIES.name} 병종 발견!`;
            this.root.querySelector('p').textContent = SPECIES.description;
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
