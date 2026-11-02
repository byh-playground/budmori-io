import { isolatedPage } from '../save/save-adapter.js';
import { gamekitEntry, loadGamekitModule } from '../gamekit-module.js';

// The page's display language and every player-visible text, through the pinned GameKit i18n module (docs/i18n.md).
// The loading text of the very first module already reads in the player's language, so the verified i18n bundle is
// loaded here before any message table is defined (top-level await); bootstrap reuses the same verified load.
//   order: ?lang= → saved choice → first browser language that matches → 'en'
// Isolated scenes (tests, help scenes, the showcase iframe) never read or write the saved choice.
const I18N = (await loadGamekitModule(gamekitEntry('i18n'))).exports;

export const LOCALE = I18N.createLocale({
    locales: ['ko', 'en'],
    fallback: 'en',
    storageKey: 'budmori-locale',
    isolated: isolatedPage(location.search),
});
// Each language's own name (autonym), shown unchanged in every locale.
export const LOCALE_NAMES = Object.freeze({ ko: '한국어', en: 'English' });
