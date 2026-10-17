import JS from '@eslint/js';
import GLOBALS from 'globals';
import PROJECT_RULES from './scripts/lint-rules.js';

const SOURCE_FILES = ['src/**/*.{js,cjs,mjs}', 'scripts/**/*.{js,cjs,mjs}', 'tests/**/*.{js,cjs,mjs}', '*.config.js'];

// Deliberately explicit: new model owners must be added during code review.
// Session, storage, DOM and presentation adapters are not model owners.
const MODEL_FILES = [
    'src/ability-catalog.js',
    'src/ability-progression.js',
    'src/ability-state.js',
    'src/boss-patterns.js',
    'src/boss-rewards.js',
    'src/factions.js',
    'src/farm-boss-stages.js',
    'src/farm-model.js',
    'src/farm-progress.js',
    'src/farm-save-codec.js',
    'src/farm-snapshot.js',
    'src/farm-snapshot-migrations.js',
    'src/farm-snapshot-validation.js',
    'src/farm-state.js',
    'src/farm-upgrades.js',
    'src/player-progression.js',
    'src/raid-roster.js',
    'src/raid-settlement.js',
    'src/spatial-grid.js',
    'src/species-abilities.js',
    'src/species-catalog.js',
    'src/unit-abilities.js',
    'src/unit-attack-capabilities.js',
    'src/unit-combat-patterns.js',
    'src/unit-grades.js',
    'src/unit-stats.js',
];
const MODEL_BOUNDARY_MESSAGE = 'Model code must not depend on rendering, storage or UI adapters.';
const MODEL_ADAPTER_IMPORT =
    '(?:^|/)(?:farm-renderer|farm-storage|farm-app|ability-tree|bootstrap)(?:\\.[cm]?js)?$|(?:^|/)(?:renderer|storage|ui)(?:/|\\.[cm]?js$|$)';
// ESQuery regex literals need a slash-free representation of path separators.
const MODEL_ADAPTER_SELECTOR = MODEL_ADAPTER_IMPORT.replaceAll('/', '\\u002F');

export default [
    {
        name: 'budmori/generated-and-vendor',
        ignores: ['**/node_modules/**', 'vendor/**', 'tests/output/**', 'src/game.js', '**/*.generated.*', 'dist/**'],
    },
    {
        name: 'budmori/owned-javascript',
        files: SOURCE_FILES,
        languageOptions: { ecmaVersion: 'latest' },
        linterOptions: { reportUnusedDisableDirectives: 'error' },
        plugins: { project: PROJECT_RULES },
        rules: {
            ...JS.configs.recommended.rules,
            'project/binding-names': 'error',
            'prefer-const': 'error',
            'no-var': 'error',
            curly: ['error', 'all'],
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            'no-unused-vars': [
                'error',
                {
                    vars: 'all',
                    args: 'all',
                    argsIgnorePattern: '^_',
                    caughtErrors: 'all',
                    reportUsedIgnorePattern: true,
                },
            ],
            'no-unreachable': 'error',
            'no-dupe-class-members': 'error',
            'constructor-super': 'error',
            'no-this-before-super': 'error',
            'no-empty': ['error', { allowEmptyCatch: false }],
            // ESLint 10 includes this rule; review its replacement before upgrading to 11.
            'max-statements-per-line': ['error', { max: 1 }],
        },
    },
    {
        name: 'budmori/browser',
        files: ['src/**/*.js'],
        languageOptions: { globals: GLOBALS.browser },
    },
    {
        name: 'budmori/node',
        files: ['scripts/**/*.{js,cjs,mjs}', 'tests/**/*.{js,cjs,mjs}', '*.config.js', 'src/**/*.cjs'],
        languageOptions: { globals: GLOBALS.node },
    },
    {
        name: 'budmori/browser-scenarios',
        files: ['tests/**/*.mjs'],
        // Playwright callbacks execute in the page and can read the public game API.
        languageOptions: { globals: { ...GLOBALS.browser, BUDMORI: 'readonly' } },
    },
    {
        name: 'budmori/model-boundaries',
        files: MODEL_FILES,
        rules: {
            'no-restricted-globals': [
                'error',
                {
                    globals: [
                        { name: 'document', message: MODEL_BOUNDARY_MESSAGE },
                        { name: 'localStorage', message: MODEL_BOUNDARY_MESSAGE },
                    ],
                    checkGlobalObject: true,
                },
            ],
            'no-restricted-imports': [
                'error',
                { patterns: [{ regex: MODEL_ADAPTER_IMPORT, caseSensitive: true, message: MODEL_BOUNDARY_MESSAGE }] },
            ],
            'no-restricted-syntax': [
                'error',
                {
                    selector: `ImportExpression[source.value=/${MODEL_ADAPTER_SELECTOR}/u]`,
                    message: MODEL_BOUNDARY_MESSAGE,
                },
                {
                    selector: `CallExpression[callee.type='Identifier'][callee.name='require'][arguments.0.value=/${MODEL_ADAPTER_SELECTOR}/u]`,
                    message: MODEL_BOUNDARY_MESSAGE,
                },
            ],
        },
    },
];
