// The farm loads its vetted GameKit intro only when the visitor requests it.
// Normal gameplay and offline smoke tests do not fetch another SDK module.
if (new URLSearchParams(location.search).get('showcaseDemo') !== '1') {
    const START_BUTTON = document.getElementById('newGame');
    const LAUNCH = document.createElement('button');
    LAUNCH.type = 'button';
    LAUNCH.className = 'btn';
    LAUNCH.textContent = '▶ 소개 보기';
    LAUNCH.setAttribute('aria-label', '버드모리 플레이 소개 보기');
    START_BUTTON.insertAdjacentElement('afterend', LAUNCH);
    let hostInstance = null;
    let pending = null;
    async function host() {
        if (hostInstance) {
            return hostInstance;
        }
        if (!pending) {
            pending =
                import('https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@6fc81fe071e1adfc6ef3c94840775070f3de1b33/scenario.js')
                    .then(({ installShowcase }) => {
                        hostInstance = installShowcase({
                            title: '버드모리',
                            launcher: '#newGame',
                            playSelector: '#newGame',
                            durationMs: 27000,
                            ready: (win) => typeof win.document.getElementById('newGame')?.onclick === 'function',
                            timeline: [
                                {
                                    atMs: 0,
                                    action: 'chapter',
                                    index: 0,
                                    title: '농장에서 작은 병력을 키워요',
                                    caption: '먹이를 마련하고 번식한 병력을 합체해 더 큰 부대로 성장시킵니다.',
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
                                    title: '병력을 모아 보스에게 도전',
                                    caption: '실제 농장 병력이 출전하며 각자의 역할로 자동 전투합니다.',
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
                                    title: '병종과 기술이 만드는 연쇄 전투',
                                    caption: '생존 병력과 유물 보상을 바탕으로 다음 층에 도전합니다.',
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
        LAUNCH.textContent = '소개 준비 중…';
        try {
            (await host())?.open();
        } catch (error) {
            console.warn('[Budmori intro]', error);
            LAUNCH.textContent = '소개를 불러오지 못했습니다 · 다시 시도';
        } finally {
            LAUNCH.disabled = false;
        }
    }
    LAUNCH.addEventListener('click', open);
    if (window.__BLOOM_SHOWCASE_DEEPLINK) {
        window.addEventListener('load', open, { once: true });
    }
}
