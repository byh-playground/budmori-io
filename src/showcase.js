// The farm loads its vetted GameKit intro only when the visitor requests it.
// Normal gameplay and offline smoke tests do not fetch another SDK module.
import { SHELL } from './i18n/messages/shell.js';

if (new URLSearchParams(location.search).get('showcaseDemo') !== '1') {
    const START_BUTTON = document.getElementById('newGame');
    const LAUNCH = document.createElement('button');
    LAUNCH.type = 'button';
    LAUNCH.className = 'btn';
    LAUNCH.textContent = SHELL.showcaseOpen();
    LAUNCH.setAttribute('aria-label', SHELL.showcaseOpenLabel());
    START_BUTTON.insertAdjacentElement('afterend', LAUNCH);
    let hostInstance = null;
    let pending = null;
    async function host() {
        if (hostInstance) {
            return hostInstance;
        }
        if (!pending) {
            pending =
                import('https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@f0df18d64dfec77227200494f43419821b34aaf3/scenario.js')
                    .then(({ installShowcase }) => {
                        hostInstance = installShowcase({
                            title: SHELL.showcaseTitle(),
                            launcher: '#newGame',
                            playSelector: '#newGame',
                            durationMs: 27000,
                            ready: (win) => typeof win.document.getElementById('newGame')?.onclick === 'function',
                            timeline: [
                                {
                                    atMs: 0,
                                    action: 'chapter',
                                    index: 0,
                                    title: SHELL.showcaseFarmTitle(),
                                    caption: SHELL.showcaseFarmCaption(),
                                },
                                {
                                    atMs: 650,
                                    action: 'click',
                                    selector: '#newGame',
                                },
                                {
                                    atMs: 7800,
                                    action: 'chapter',
                                    index: 1,
                                    title: SHELL.showcaseBossTitle(),
                                    caption: SHELL.showcaseBossCaption(),
                                },
                                {
                                    atMs: 8200,
                                    action: 'click',
                                    selector: '#bossChallenge',
                                },
                                {
                                    atMs: 9200,
                                    action: 'click',
                                    selector: '#deckGo',
                                },
                                {
                                    atMs: 17800,
                                    action: 'chapter',
                                    index: 2,
                                    title: SHELL.showcaseChainTitle(),
                                    caption: SHELL.showcaseChainCaption(),
                                },
                                {
                                    atMs: 19200,
                                    action: 'click',
                                    selector: '#bossChallenge',
                                },
                            ],
                        });
                        LAUNCH.remove();
                        return hostInstance;
                    })
                    .catch((error) => {
                        pending = null;
                        throw error;
                    });
        }
        return pending;
    }
    async function open() {
        LAUNCH.disabled = true;
        LAUNCH.textContent = SHELL.showcaseLoading();
        try {
            (await host())?.open();
        } catch (error) {
            console.warn('[Budmori intro]', error);
            LAUNCH.textContent = SHELL.showcaseFailed();
        } finally {
            LAUNCH.disabled = false;
        }
    }
    LAUNCH.addEventListener('click', open);
    if (window.__BLOOM_SHOWCASE_DEEPLINK) {
        window.addEventListener('load', open, { once: true });
    }
}
