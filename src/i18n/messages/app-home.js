import { defineMessages } from '../text.js';

// Start screen, saves, diagnostics and app-level errors (src/farm-app.js).
export const APP_HOME = defineMessages({
    continueRun: { ko: '도전 이어가기', en: 'Continue run' },
    homeProgress: {
        ko: ({ population, best }) => `병력 ${population}마리 · 최고 ${best}층`,
        en: ({ population, best }) => `${population} troops · Best floor ${best}`,
    },
    // minutes: whole minutes away; births/food: 0 when nothing happened.
    offlineAway: {
        ko: ({ minutes, births, food }) => {
            const TIME = minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`,
                PARTS = [births && `새 식구 ${births}마리`, food && `먹이 ${food}`].filter(Boolean);
            return `${TIME} 동안 자리를 비웠어요${PARTS.length ? ' · ' + PARTS.join(' · ') : ''}`;
        },
        en: ({ minutes, births, food }) => {
            const TIME = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`,
                PARTS = [births && `${births} born`, food && `${food} food`].filter(Boolean);
            return `You were away for ${TIME}${PARTS.length ? ' · ' + PARTS.join(' · ') : ''}`;
        },
    },
    // farm / play: which unreadable records will be deleted.
    resetConfirm: {
        ko: ({ farm, play }) =>
            `읽지 못한 ${[farm && '농장', play && '플레이 설정'].filter(Boolean).join('·')} 저장을 지우고 새로 시작할까요? 지운 기록은 되돌릴 수 없어요.`,
        en: ({ farm, play }) =>
            `Delete the unreadable ${farm && play ? 'farm and play settings' : farm ? 'farm' : 'play settings'} save and start over? This can’t be undone.`,
    },
    // ko shows the codec's own reason unchanged; en cannot, so it states the outcome.
    importUnreadable: {
        ko: ({ detail }) => detail,
        en: () => 'This file isn’t a BUDMORI farm save.',
    },
    saveTooLarge: { ko: '저장 파일이 너무 커요.', en: 'The save file is too large.' },
    importBlockedDuringRun: {
        ko: '탑 도전을 끝내고 농장으로 돌아온 뒤 저장을 불러올 수 있어요.',
        en: 'Finish the tower run and return to the farm to load a save.',
    },
    diagnosticsCopied: {
        ko: '진단 요약을 복사했어요. 채팅에 붙여 넣어 주세요.',
        en: 'Diagnostic summary copied. Paste it into the chat.',
    },
    diagnosticsSelectToCopy: {
        ko: '아래 진단 요약을 선택해 복사해 주세요.',
        en: 'Select and copy the diagnostic summary below.',
    },
    diagnosticsDetail: {
        ko: '상세 진단 정보예요. 저장 데이터는 포함하지 않아요.',
        en: 'Detailed diagnostics. Save data isn’t included.',
    },
    // A translated lead; the error's own (developer) message follows it.
    farmFailed: {
        ko: ({ message }) => `농장을 진행하지 못했어요. ${message}`,
        en: ({ message }) => `The farm couldn’t continue. ${message}`,
    },
    graphicsRecovering: { ko: '그래픽 화면을 복구하고 있어요.', en: 'Restoring the graphics…' },
    graphicsRecoveryFailed: {
        ko: '그래픽 화면을 복구하지 못했어요. 새로고침해 다시 이어가 주세요.',
        en: 'Couldn’t restore the graphics. Reload the page to continue.',
    },
});
