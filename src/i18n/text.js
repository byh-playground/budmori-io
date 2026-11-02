import { LOCALE, LOCALE_TAG, LOCALES } from './locale.js';

// Contract (docs/i18n.md): every player-visible text is a TextPair — one object holding all locales side by side.
//   { ko: '낙뢰', en: 'Lightning' }                                    fixed text
//   { ko: ({ count }) => `새싹 ${count}마리`,                           text with values; each locale owns its
//     en: ({ count }) => `${count} ${plural(count, 'sprout', 'sprouts')}` }   word order, particles and plurals
// Model definitions keep TextPairs as plain data (they must not import this module); presentation resolves them.
// The lint rule project/localized-text allows Hangul literals only inside the `ko` member of such a pair.

function isTextPair(value) {
    return (
        !!value &&
        typeof value === 'object' &&
        Object.keys(value).length === LOCALES.length &&
        LOCALES.every((locale) => ['string', 'function'].includes(typeof value[locale]))
    );
}

// Resolves one TextPair in the page locale. `values` feeds a function member.
export function localized(pair, values) {
    if (!isTextPair(pair)) {
        throw new TypeError(`Not a text pair: ${JSON.stringify(pair)}`);
    }
    const TEXT = pair[LOCALE];
    return typeof TEXT === 'function' ? TEXT(values ?? {}) : TEXT;
}

// A message table: { key: TextPair } → { key: (values?) => string }. Validated once, at module load.
export function defineMessages(table) {
    return Object.freeze(
        Object.fromEntries(
            Object.entries(table).map(([key, pair]) => {
                if (!isTextPair(pair)) {
                    throw new TypeError(`Message "${key}" must define exactly ${LOCALES.join(', ')}.`);
                }
                return [key, (values) => localized(pair, values)];
            }),
        ),
    );
}

const NUMBER_FORMAT = new Intl.NumberFormat(LOCALE_TAG);
// Grouped integer or decimal in the page locale (1,234).
export function formatNumber(value) {
    return NUMBER_FORMAT.format(value);
}
// English count noun; Korean counters do not inflect.
export function plural(count, one, other) {
    return count === 1 ? one : other;
}

// Static markup: <x data-i18n="key"> sets textContent, <x data-i18n-aria-label="key"> sets aria-label (any attribute).
// Keys name members of the given message table.
export function applyPageText(root, messages) {
    document.documentElement.lang = LOCALE;
    for (const ELEMENT of root.querySelectorAll('*')) {
        for (const NAME of ELEMENT.getAttributeNames()) {
            if (!NAME.startsWith('data-i18n')) {
                continue;
            }
            const KEY = ELEMENT.getAttribute(NAME),
                MESSAGE = messages[KEY];
            if (!MESSAGE) {
                throw new Error(`Missing page message "${KEY}"`);
            }
            if (NAME === 'data-i18n') {
                ELEMENT.textContent = MESSAGE();
            } else {
                ELEMENT.setAttribute(NAME.slice('data-i18n-'.length), MESSAGE());
            }
        }
    }
}
