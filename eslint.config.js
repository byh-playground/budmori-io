import JS from '@eslint/js';
import GLOBALS from 'globals';
import PROJECT_RULES from './scripts/lint-rules.js';

const SOURCE_FILES = ['src/**/*.{js,cjs,mjs}', 'scripts/**/*.{js,cjs,mjs}', 'tests/**/*.{js,cjs,mjs}', '*.config.js'];

// Deliberately explicit: new model owners must be added during code review.
// Session, storage, DOM and presentation adapters are not model owners.
const MODEL_FILES = [
    'src/abilities/ability-catalog.js',
    'src/abilities/ability-progression.js',
    'src/abilities/ability-state.js',
    'src/model/mastery.js',
    'src/boss/boss-patterns.js',
    'src/boss/boss-rewards.js',
    'src/core/factions.js',
    'src/model/farm-model.js',
    'src/model/army-scatter.js',
    'src/core/combat-identity.js',
    'src/tower/tower-encounter.js',
    'src/formation/formation-skills.js',
    'src/formation/formation-skill-state.js',
    'src/features/species-growth/*.js',
    'src/features/formation-skills/**/model*.js',
    'src/features/formation-skills/**/definition.js',
    'src/model/farm-progress.js',
    'src/save/farm-save-codec.js',
    'src/save/farm-snapshot.js',
    'src/save/farm-snapshot-migrations.js',
    'src/save/farm-snapshot-validation.js',
    'src/model/farm-state.js',
    'src/model/player-progression.js',
    'src/core/spatial-grid.js',
    'src/units/species-catalog.js',
    'src/units/unit-abilities.js',
    'src/units/unit-attack-capabilities.js',
    'src/units/unit-combat-patterns.js',
    'src/units/unit-grades.js',
    'src/tower/tower-run.js',
    'src/units/unit-stats.js',
    'src/model/unit-collection.js',
    'src/core/signal.js',
    'src/core/mutation-notifications.js',
    'src/boss/boss-pattern-behaviors.js',
    'src/model/farm-mode-behaviors.js',
    'src/features/abilities/barley-armor-break.js',
    'src/features/abilities/kidney-continuous-leap.js',
    'src/features/abilities/rice-low-health-harvest.js',
    'src/features/abilities/wheat-command-crit.js',
    'src/features/boss-patterns/charge/definition.js',
    'src/features/boss-patterns/charge/model.js',
    'src/features/boss-patterns/fan-sweep/definition.js',
    'src/features/boss-patterns/fan-sweep/model.js',
    'src/features/boss-patterns/front-slam/definition.js',
    'src/features/boss-patterns/front-slam/model.js',
    'src/features/boss-patterns/leap-slam/definition.js',
    'src/features/boss-patterns/leap-slam/model.js',
    'src/features/boss-patterns/model-base.js',
    'src/features/boss-patterns/mouth-summon/definition.js',
    'src/features/boss-patterns/mouth-summon/model.js',
    'src/features/boss-patterns/sweep-360/definition.js',
    'src/features/boss-patterns/sweep-360/model.js',
    'src/features/farm-modes/breed/definition.js',
    'src/features/farm-modes/breed/model.js',
    'src/features/farm-modes/model-base.js',
    'src/features/projectiles/damage-model.js',
    'src/features/projectiles/definition.js',
    'src/features/projectiles/model-base.js',
    'src/features/projectiles/seed/definition.js',
    'src/features/projectiles/seed/model.js',
    'src/features/projectiles/spike/definition.js',
    'src/features/projectiles/spike/model.js',
    'src/features/scenes/farm/boss-event-phases.js',
    'src/features/scenes/farm/definition.js',
    'src/features/scenes/farm/model.js',
    'src/features/scenes/model-base.js',
    'src/features/unit-body/definition.cjs',
    'src/features/unit-attacks/dual-strike/definition.js',
    'src/features/unit-attacks/dual-strike/model.js',
    'src/features/unit-attacks/lob/definition.js',
    'src/features/unit-attacks/lob/model.js',
    'src/model/projectile-behaviors.js',
    'src/model/simulation-scenes.js',
];
const MODEL_BOUNDARY_MESSAGE = 'Model code must not depend on rendering, storage or UI adapters.';
const MODEL_ADAPTER_IMPORT =
    '(?:^|/)(?:farm-renderer|farm-render-[^/]+|presentation(?:-base)?|farm-storage|farm-app|ability-tree|bootstrap)(?:\\.[cm]?js)?$|(?:^|/)(?:renderer|storage|ui)(?:/|\\.[cm]?js$|$)';
// ESQuery regex literals need a slash-free representation of path separators.
const MODEL_ADAPTER_SELECTOR = MODEL_ADAPTER_IMPORT.replaceAll('/', '\\u002F');

export default [
    {
        name: 'budmori/generated-and-vendor',
        ignores: ['**/node_modules/**', 'vendor/**', 'tests/output/**', '**/*.generated.*', 'dist/**'],
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
                    selector: "AssignmentExpression[left.type='MemberExpression'][left.property.name='units']",
                    message:
                        'UnitCollection owns roster replacement; use resetUnits/addUnit/removeUnit/replaceUnitGroup.',
                },
                {
                    selector:
                        "AssignmentExpression[left.type='MemberExpression'][left.object.type='MemberExpression'][left.object.property.name='units']",
                    message: 'UnitCollection owns roster slots and length.',
                },
                {
                    selector:
                        "CallExpression[callee.type='MemberExpression'][callee.object.type='MemberExpression'][callee.object.property.name='units'][callee.property.name=/^(push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin)$/u]",
                    message: 'UnitCollection owns roster mutations.',
                },
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
