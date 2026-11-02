import { LOCALE } from '../locale.js';

// Startup loading panel, startup error popup and the diagnostic summary (src/startup-loading.js, src/bootstrap.js).
export const BOOT = LOCALE.messages({
    bootstrapUnavailable: { ko: '시작 파일을 불러오지 못했어요', en: 'Couldn’t load the startup files' },
    bootstrapUnavailableDetail: {
        ko: '연결 상태를 확인하고 다시 불러와 주세요.',
        en: 'Check your connection and reload.',
    },
    stageModules: { ko: '게임 기능을 불러오고 있어요', en: 'Loading game features' },
    stageVectorDownload: { ko: '캐릭터 그림을 불러오고 있어요', en: 'Loading character art' },
    stageVectors: { ko: '캐릭터 원본을 준비하고 있어요', en: 'Preparing character sources' },
    stageGameModules: { ko: '게임 파일을 불러오고 있어요', en: 'Loading game files' },
    stageGame: { ko: '게임 화면을 준비하고 있어요', en: 'Preparing the game screen' },
    stageAtlasPlan: { ko: '애니메이션 구성을 준비하고 있어요', en: 'Planning animations' },
    stageAtlas: { ko: '애니메이션 이미지를 준비하고 있어요', en: 'Preparing animation images' },
    // The current stage and the overall progress of the whole startup (not of the stage).
    stageProgress: {
        ko: ({ stage, percent }) => `${stage} · ${percent}%`,
        en: ({ stage, percent }) => `${stage} · ${percent}%`,
    },
    manifestFailed: {
        ko: '게임 설정을 읽지 못했어요. 진단 정보를 복사해 알려 주세요',
        en: 'Couldn’t read the game configuration. Copy the diagnostics and send them to us',
    },
    startFailed: {
        ko: '게임을 시작하지 못했어요. 진단 정보를 복사해 알려 주세요',
        en: 'Couldn’t start the game. Copy the diagnostics and send them to us',
    },
    // Error popup
    errorTitle: { ko: '게임이 오류로 중단됐어요', en: 'The game stopped because of an error' },
    errorMessage: {
        ko: '진단 정보를 복사해 알려 주시거나 새로고침해 주세요.',
        en: 'Copy the diagnostics and send them to us, or reload the page.',
    },
    reload: { ko: '새로고침', en: 'Reload' },
    diagnosticResult: { ko: '진단 정보 복사 결과', en: 'Copied diagnostics' },
    startupError: {
        ko: '게임을 시작하는 중 오류가 발생했어요. 진단 정보를 복사해 알려 주세요.',
        en: 'An error occurred while starting the game. Copy the diagnostics and send them to us.',
    },
    // A translated lead; the error's own (developer) message follows it.
    prepareFailed: {
        ko: ({ message }) => `게임 준비를 마치지 못했어요. ${message}`,
        en: ({ message }) => `Couldn’t finish preparing the game. ${message}`,
    },
    runtimeStopped: {
        ko: '게임이 오류로 중단됐어요. 진단 정보를 복사해 알려 주세요.',
        en: 'The game stopped because of an error. Copy the diagnostics and send them to us.',
    },
    diagnosticsCopied: { ko: '진단 정보가 복사됐어요', en: 'Diagnostics copied' },
    diagnosticsCopyManually: {
        ko: '자동 복사를 못 했어요. 아래 텍스트를 길게 눌러 복사해 주세요',
        en: 'Couldn’t copy automatically. Long-press the text below to copy it',
    },
    // Diagnostic summary lines (pasted into chat)
    unknown: { ko: '미확인', en: 'unknown' },
    none: { ko: '없음', en: 'none' },
    notProvided: { ko: '미제공', en: 'not provided' },
    errorFallback: { ko: '오류', en: 'error' },
    performanceUnmeasured: {
        ko: ({ stage }) => `성능 미측정 · 시작 단계 ${stage}`,
        en: ({ stage }) => `Performance not measured · startup stage ${stage}`,
    },
    errorSummary: {
        ko: ({ total, stage, inputs }) => `오류 ${total} · 단계 ${stage} · 최근 입력 ${inputs}`,
        en: ({ total, stage, inputs }) => `Errors ${total} · stage ${stage} · recent input ${inputs}`,
    },
    errorLocation: {
        ko: ({ location, cause }) => `위치 ${location} · 원인 ${cause}`,
        en: ({ location, cause }) => `Location ${location} · cause ${cause}`,
    },
});
