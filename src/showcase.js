import { installShowcase } from 'https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@401a056bc4323e03d95c5d947414fbc8e7383257/scenario.js';
const SHOWCASE = installShowcase({
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

// Restore direct introduction links after the game's own menu router has booted.
if (window.__BLOOM_SHOWCASE_DEEPLINK && SHOWCASE) {
    window.addEventListener('load', () => SHOWCASE.open(), { once: true });
}
