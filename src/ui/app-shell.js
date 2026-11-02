import { PAGE } from '../i18n/messages/page.js';
import { SHELL } from '../i18n/messages/shell.js';

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
        initialUpdate = null;
    const SHOW = (text) => {
        NOTICE.textContent = SETTINGS_NOTICE.textContent = text;
    };
    const SYNC = () => {
        UPDATE.hidden = !ready;
        UPDATE.disabled = applying;
        SETTINGS.dataset.updateReady = String(ready);
        SETTINGS.setAttribute('aria-label', ready ? SHELL.settingsOpenUpdate() : PAGE.settingsOpen());
        SETTINGS.title = ready ? SHELL.settingsTitleUpdate() : PAGE.settingsTitle();
        CHECK.textContent = ready ? PAGE.appUpdate() : PAGE.checkUpdate();
        CHECK.classList.toggle('btn--primary', ready);
        CHECK.classList.toggle('btn--secondary', !ready);
        CHECK.disabled = applying;
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
                throw new Error(SHELL.updateSaveFailed());
            }
            await PWA.update();
            // Keep the simulation paused and the dialog open until controllerchange reloads the page.
        } catch (error) {
            applying = false;
            PROGRESS.close();
            onUpdating(false);
            SYNC();
            SHOW(SHELL.updateFailed({ message: error.message }));
        }
    };
    const PWA = globalThis.BloomGamekitPwa.registerPwa({
        serviceWorker: './sw.js',
        onUpdate: () => {
            ready = true;
            SYNC();
            SHOW(SHELL.updateReady());
            if (canAutoUpdate()) {
                initialUpdate = APPLY();
            }
        },
        onError: (error) => SHOW(SHELL.pwaFailed({ message: error.message })),
        onInstallable: () => {
            INSTALL.hidden = false;
        },
    });
    PROGRESS.addEventListener('cancel', (event) => event.preventDefault());
    UPDATE.onclick = APPLY;
    // A new version is found and applied by the startup check (below), so checking means saving and reloading.
    CHECK.onclick = async () => {
        if (ready) {
            await APPLY();
            return;
        }
        applying = true;
        SYNC();
        if ((await beforeUpdate()) !== true) {
            applying = false;
            SYNC();
            SHOW(SHELL.updateSaveFailed());
            return;
        }
        location.reload();
    };
    INSTALL.onclick = async () => {
        INSTALL.hidden = true;
        try {
            await PWA.install();
        } catch (error) {
            SHOW(SHELL.installFailed({ message: error.message }));
        }
    };
    try {
        // Keep the game's initial route behind discovery and installation, so
        // refreshing a controlled page applies its new worker before play starts.
        await PWA.checkForUpdate();
    } catch (error) {
        SHOW(SHELL.startCheckFailed({ message: error.message }));
    }
    await initialUpdate;
    return !applying;
}
