import { LOCALE, LOCALES, LOCALE_NAMES, chooseLocale } from '../i18n/locale.js';
import { LANGUAGE } from '../i18n/messages/language.js';

// Settings row that switches the display language. A switch reloads the page (see i18n/locale.js), so the host
// tells it when leaving the page would lose progress; then the choice is refused with the reason.
export class LanguageSetting {
    constructor({ choices, notice, canReload }) {
        this.notice = notice;
        this.canReload = canReload;
        choices.replaceChildren(
            ...LOCALES.map((locale) => {
                const BUTTON = document.createElement('button');
                BUTTON.type = 'button';
                BUTTON.lang = locale;
                BUTTON.dataset.locale = locale;
                BUTTON.textContent = LOCALE_NAMES[locale];
                BUTTON.setAttribute('aria-pressed', String(locale === LOCALE));
                BUTTON.onclick = () => this.choose(locale);
                return BUTTON;
            }),
        );
    }
    choose(locale) {
        if (locale === LOCALE) {
            return;
        }
        if (!this.canReload()) {
            this.notice.textContent = LANGUAGE.blockedDuringRun();
            return;
        }
        this.notice.textContent = '';
        chooseLocale(locale);
    }
}
