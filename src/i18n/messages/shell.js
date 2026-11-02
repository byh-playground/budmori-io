import { defineMessages } from '../text.js';

// App shell (install, update) and small presentation widgets: sound toggle, help demo frame, seedling reveal,
// showcase launcher (src/ui/app-shell.js, src/render/food-feel.js, src/ui/help-panel.js, src/ui/seedling-reveal.js,
// src/showcase.js).
export const SHELL = defineMessages({
    updateSaveFailed: {
        ko: '농장을 저장하지 못해 새로고침하지 않았어요. 저장된 농장은 그대로예요.',
        en: 'Couldn’t save the farm, so the page wasn’t reloaded. Your saved farm is unchanged.',
    },
    pwaFailed: {
        ko: ({ message }) => `앱 설치·오프라인 준비를 하지 못했어요. ${message}`,
        en: ({ message }) => `Couldn’t set up app install and offline play. ${message}`,
    },
    installFailed: {
        ko: ({ message }) => `앱으로 설치하지 못했어요. ${message}`,
        en: ({ message }) => `Couldn’t install as an app. ${message}`,
    },
    soundOff: { ko: '꺼짐', en: 'Off' },
    soundTurnOn: { ko: '효과음 켜기', en: 'Turn on sound effects' },
    helpDemoFailed: {
        ko: '데모를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요',
        en: 'Couldn’t load the demo. Try again in a moment',
    },
    helpDemoLoading: { ko: '데모를 준비하고 있어요', en: 'Getting the demo ready' },
    helpDemoFrame: { ko: ({ title }) => `${title} 데모`, en: ({ title }) => `${title} demo` },
    seedlingGrown: { ko: '새싹이 병사로 자랐어요', en: 'A sprout grew into a soldier' },
    seedlingClose: { ko: '획득 카드 닫기', en: 'Close the new species card' },
    seedlingFound: { ko: ({ name }) => `${name} 병종 발견!`, en: ({ name }) => `New species: ${name}!` },
    showcaseOpen: { ko: '▶ 소개 보기', en: '▶ Watch intro' },
    showcaseOpenLabel: { ko: '버드모리 플레이 소개 보기', en: 'Watch the BUDMORI gameplay intro' },
    showcaseLoading: { ko: '소개 준비 중…', en: 'Preparing intro…' },
    showcaseFailed: { ko: '소개를 불러오지 못했습니다 · 다시 시도', en: 'Couldn’t load the intro · Try again' },
    showcaseTitle: { ko: '버드모리', en: 'BUDMORI' },
    showcaseFarmTitle: { ko: '농장에서 작은 병력을 키워요', en: 'Raise a small army on the farm' },
    showcaseFarmCaption: {
        ko: '먹이를 마련하고 번식한 병력을 합체해 더 큰 부대로 성장시킵니다.',
        en: 'Gather food, breed troops and merge them into a bigger army.',
    },
    showcaseBossTitle: { ko: '병력을 모아 보스에게 도전', en: 'Gather your troops and challenge the boss' },
    showcaseBossCaption: {
        ko: '실제 농장 병력이 출전하며 각자의 역할로 자동 전투합니다.',
        en: 'Your real farm troops deploy and fight on their own, each in its role.',
    },
    showcaseChainTitle: { ko: '병종과 기술이 만드는 연쇄 전투', en: 'Chain battles of species and skills' },
    showcaseChainCaption: {
        ko: '생존 병력과 유물 보상을 바탕으로 다음 층에 도전합니다.',
        en: 'Survivors and relic rewards carry you to the next floor.',
    },
});
