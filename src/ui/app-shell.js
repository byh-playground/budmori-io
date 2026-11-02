import { SHELL } from '../i18n/messages/shell.js';

// Every page load runs the latest deployed files (GameKit pwa, docs in README "설치·오프라인"). Checking for a new
// version is therefore saving the farm and reloading; the SDK never reads or deletes progress saves.
export function startAppShell({ dollar, beforeUpdate }) {
    const NOTICE = dollar('appNotice'),
        SETTINGS_NOTICE = dollar('settingsAppNotice'),
        CHECK = dollar('settingsCheckUpdate'),
        INSTALL = dollar('appInstall');
    const SHOW = (text) => {
        NOTICE.textContent = SETTINGS_NOTICE.textContent = text;
    };
    const PWA = globalThis.BloomGamekitPwa.registerPwa({
        serviceWorker: './sw.js',
        onError: (error) => SHOW(SHELL.pwaFailed({ message: error.message })),
        onInstallable: () => {
            INSTALL.hidden = false;
        },
    });
    CHECK.onclick = async () => {
        CHECK.disabled = true;
        if ((await beforeUpdate()) !== true) {
            CHECK.disabled = false;
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
}
