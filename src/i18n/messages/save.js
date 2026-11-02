import { defineMessages } from '../text.js';

// What the player reads when the save module refuses (src/save/farm-storage.js saveFailureMessage).
export const SAVE = defineMessages({
    unreadable: {
        ko: '저장을 읽지 못해 원본을 그대로 두었어요. 이 브라우저의 저장은 덮어쓰지 않아요.',
        en: 'Couldn’t read the save, so it was left as it is. This browser’s save won’t be overwritten.',
    },
    conflict: {
        ko: '다른 탭에서 저장이 바뀌었어요. 이 탭을 새로고침해 이어가 주세요.',
        en: 'The save changed in another tab. Reload this tab to continue.',
    },
    quotaExceeded: {
        ko: '브라우저 저장 공간이 부족해 저장하지 못했어요. 기존 저장은 그대로예요. 저장 내보내기로 보관해 주세요.',
        en: 'Not enough browser storage to save. Your existing save is unchanged. Use Export save to keep a copy.',
    },
    storage: {
        ko: '브라우저 저장소를 쓰지 못했어요. 기존 저장은 그대로예요. 진단 정보를 복사해 알려 주세요.',
        en: 'Couldn’t write to browser storage. Your existing save is unchanged. Copy the diagnostics and send them to us.',
    },
    closed: { ko: '저장이 닫혔어요. 새로고침해 주세요.', en: 'The save was closed. Reload the page.' },
    invalid: {
        ko: '저장 데이터를 확인하지 못해 저장하지 않았어요. 기존 저장은 그대로예요. 진단 정보를 복사해 알려 주세요.',
        en: 'Couldn’t verify the save data, so nothing was saved. Your existing save is unchanged. Copy the diagnostics and send them to us.',
    },
});
