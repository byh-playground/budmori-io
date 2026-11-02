import { isolatedPage } from '../save/save-adapter.js';

// The page's display language. Decided once per page load, before any text is resolved; changing it saves the
// choice and reloads the page (see chooseLocale), so no text ever needs re-resolving at runtime.
//   order: ?lang= → saved choice → first browser language that matches → DEFAULT_LOCALE
// Isolated scenes (tests, help scenes) never read or write the saved choice: their saves live in memory too.
export const LOCALES = Object.freeze(['ko', 'en']);
export const DEFAULT_LOCALE = 'en';
// BCP 47 tag per locale, for Intl number formatting and <html lang>.
export const LOCALE_TAGS = Object.freeze({ ko: 'ko-KR', en: 'en-US' });
// Each language's own name (autonym), shown unchanged in every locale.
export const LOCALE_NAMES = Object.freeze({ ko: '한국어', en: 'English' });
const LOCALE_STORAGE_KEY = 'budmori-locale';
const LOCALE_PARAM = 'lang';

// Pure: maps a requested/saved/browser language to a supported locale.
export function resolveLocale({ requested = null, saved = null, languages = [] } = {}) {
    for (const CANDIDATE of [requested, saved]) {
        if (LOCALES.includes(CANDIDATE)) {
            return CANDIDATE;
        }
    }
    for (const LANGUAGE of languages) {
        const PRIMARY = String(LANGUAGE).toLowerCase().split('-')[0];
        if (LOCALES.includes(PRIMARY)) {
            return PRIMARY;
        }
    }
    return DEFAULT_LOCALE;
}

function readSavedLocale() {
    try {
        return localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
        return null;
    }
}

export const LOCALE = resolveLocale({
    requested: new URLSearchParams(location.search).get(LOCALE_PARAM),
    saved: isolatedPage(location.search) ? null : readSavedLocale(),
    languages: navigator.languages?.length ? navigator.languages : [navigator.language],
});
export const LOCALE_TAG = LOCALE_TAGS[LOCALE];

// Saves the player's choice and reloads into it. ?lang= is set to the same choice so an earlier ?lang= cannot
// override it and the switch works even when storage refuses the write.
// The caller decides whether leaving the page is allowed now (see farm-app.js language setting).
export function chooseLocale(locale) {
    if (!LOCALES.includes(locale)) {
        throw new RangeError(`Unsupported locale: ${locale}`);
    }
    try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
        // Storage refused: the ?lang= parameter below still switches this visit.
    }
    const URL_NOW = new URL(location.href);
    URL_NOW.searchParams.set(LOCALE_PARAM, locale);
    location.replace(URL_NOW.href);
}
