// The app owns when an installed update may replace the running farm. The SDK owns
// service-worker discovery/activation and never reads or deletes progress saves.
export async function startAppShell({ dollar, beforeUpdate, canAutoUpdate, onUpdating }) {
    const NOTICE = dollar('appNotice'),
        SETTINGS_NOTICE = dollar('settingsAppNotice'),
        UPDATE = dollar('appUpdate'),
        CHECK = dollar('settingsCheckUpdate'),
        SETTINGS = dollar('gameMenu'),
        PROGRESS = dollar('appUpdateProgress'),
        INSTALL = dollar('appInstall');
    let ready = false,
        applying = false,
        checking = false,
        initialUpdate = null;
    const SHOW = (text) => {
        NOTICE.textContent = SETTINGS_NOTICE.textContent = text;
    };
    const SYNC = () => {
        UPDATE.hidden = !ready;
        UPDATE.disabled = applying;
        SETTINGS.dataset.updateReady = String(ready);
        SETTINGS.setAttribute('aria-label', ready ? '게임 설정 열기, 새 버전 있음' : '게임 설정 열기');
        SETTINGS.title = ready ? '설정 · 새 버전 있음' : '설정';
        CHECK.textContent = ready ? '최신 버전 업데이트' : '새 버전 확인';
        CHECK.classList.toggle('btn--primary', ready);
        CHECK.classList.toggle('btn--secondary', !ready);
        CHECK.disabled = applying || checking;
    };
    const APPLY = async () => {
        if (applying || !ready) {
            return;
        }
        applying = true;
        SYNC();
        PROGRESS.showModal();
        onUpdating(true);
        try {
            if ((await beforeUpdate()) !== true) {
                throw new Error('농장을 저장하지 못해 업데이트를 멈췄어요.');
            }
            await PWA.update();
            // Keep the simulation paused and the dialog open until controllerchange reloads the page.
        } catch (error) {
            applying = false;
            PROGRESS.close();
            onUpdating(false);
            SYNC();
            SHOW('새 버전으로 바꾸지 못했어요. ' + error.message);
        }
    };
    const PWA = globalThis.BloomGamekitPwa.registerPwa({
        serviceWorker: './sw.js',
        onUpdate: () => {
            ready = true;
            SYNC();
            SHOW('새 버전이 준비됐어요. 농장을 저장하고 업데이트할 수 있어요.');
            if (canAutoUpdate()) {
                initialUpdate = APPLY();
            }
        },
        onError: (error) => SHOW('앱 설치·오프라인 준비를 하지 못했어요. ' + error.message),
        onInstallable: () => {
            INSTALL.hidden = false;
        },
    });
    PROGRESS.addEventListener('cancel', (event) => event.preventDefault());
    UPDATE.onclick = APPLY;
    CHECK.onclick = async () => {
        if (ready) {
            await APPLY();
            return;
        }
        checking = true;
        SYNC();
        SHOW('새 버전을 확인하고 있어요.');
        try {
            await PWA.checkForUpdate();
            if (!ready) {
                SHOW('새 버전 확인을 요청했어요. 준비되면 알려드려요.');
            }
        } catch (error) {
            SHOW('새 버전을 확인하지 못했어요. ' + error.message);
        } finally {
            checking = false;
            SYNC();
        }
    };
    INSTALL.onclick = async () => {
        INSTALL.hidden = true;
        try {
            await PWA.install();
        } catch (error) {
            SHOW('앱으로 설치하지 못했어요. ' + error.message);
        }
    };
    try {
        // Keep the game's initial route behind discovery and installation, so
        // refreshing a controlled page applies its new worker before play starts.
        await PWA.checkForUpdate();
    } catch (error) {
        SHOW('새 버전을 확인하지 못해 현재 버전으로 시작해요. ' + error.message);
    }
    await initialUpdate;
    return !applying;
}
