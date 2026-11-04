import { LOCALE } from '../locale.js';

// App shell (install, update) and small presentation widgets: sound toggle, help demo frame, seedling reveal,
// showcase launcher (src/ui/app-shell.js, src/render/food-feel.js, src/ui/help-panel.js, src/ui/seedling-reveal.js,
// src/showcase.js).
export const SHELL = LOCALE.messages({
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
    showcaseFarmTitle: { ko: '농장에서 키워요', en: 'Raise them on the farm' },
    showcaseFarmCaption: {
        ko: '먹이를 모아 번식하고, 합쳐서 더 큰 병력으로 키워요.',
        en: 'Gather food, breed, and merge your troops into a bigger army.',
    },
    showcaseBossTitle: { ko: '탑에서 싸워요', en: 'Fight in the tower' },
    showcaseBossCaption: {
        ko: '병력이 보스와 자동으로 싸워요. 한 번 도전은 5~15분이에요.',
        en: 'Your troops fight the boss on their own. A run takes 5 to 15 minutes.',
    },
    showcaseChainTitle: { ko: '더 높이 올라가요', en: 'Climb higher' },
    showcaseChainCaption: {
        ko: '보상으로 병력과 새로운 힘을 얻고, 100층을 향해 다시 도전해요.',
        en: 'Earn troops and new powers, then take on the next floors toward floor 100.',
    },
});
