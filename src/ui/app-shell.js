// The installed-app layer: the generated service worker keeps the game startable offline, and the start screen
// offers installing and the waiting new version. Lines go to the same notices the save uses: the start screen
// line, and the farm notice while playing.
export function startAppShell({ dollar, notify, beforeUpdate }) {
    const NOTICE = dollar('appNotice'),
        UPDATE = dollar('appUpdate'),
        INSTALL = dollar('appInstall');
    const SHOW = (text) => {
        NOTICE.textContent = text;
        notify(text);
    };
    const PWA = globalThis.BloomGamekitPwa.registerPwa({
        serviceWorker: './sw.js',
        onUpdate: () => {
            UPDATE.hidden = false;
            NOTICE.textContent = '새 버전이 있어요.';
            notify('새 버전이 있어요. 처음 화면에서 다시 열 수 있어요.');
        },
        onError: (error) => SHOW('앱 설치·오프라인 준비를 하지 못했어요. ' + error.message),
        onInstallable: () => {
            INSTALL.hidden = false;
        },
    });
    UPDATE.onclick = async () => {
        UPDATE.disabled = true;
        try {
            // The farm is written before the page reloads into the new version.
            await beforeUpdate();
            await PWA.update();
        } catch (error) {
            UPDATE.disabled = false;
            SHOW('새 버전으로 바꾸지 못했어요. ' + error.message);
        }
    };
    INSTALL.onclick = async () => {
        // The browser's install prompt can be shown once; either answer ends the offer.
        INSTALL.hidden = true;
        try {
            await PWA.install();
        } catch (error) {
            SHOW('앱으로 설치하지 못했어요. ' + error.message);
        }
    };
    return PWA;
}
