'use strict';

const PATH = require('node:path'),
    { buildSync: BUILD_SYNC } = require('esbuild');
const ROOT = PATH.resolve(__dirname, '..');
async function verifyStartupPresentation() {
    const ASSERT = require('node:assert/strict'),
        { pathToFileURL: PATH_TO_FILE_URL } = require('node:url');
    const LOAD = (file) => import(PATH_TO_FILE_URL(PATH.join(ROOT, file)).href);
    // Use the real pinned runtime and application models: bundling alone cannot
    // detect a removed simulation method still called by a presentation adapter.
    for (const [NAME, FILE] of [
        ['BloomGamekitDeterministic', 'deterministic'],
        ['BloomGamekitInterpolation', 'interpolation'],
        ['BloomGamekitSimloop', 'simloop'],
        ['BloomGamekitWorkScheduler', 'work-scheduler'],
    ]) {
        globalThis[NAME] = await LOAD(`vendor/upstream/${FILE}.js`);
    }
    const { Garden: GARDEN } = await LOAD('src/farm-model.js'),
        { FarmSession: FARM_SESSION } = await LOAD('src/farm-session.js');
    const { SPECIES_CATALOG } = await LOAD('src/species-catalog.js');
    const STARTER = new FARM_SESSION();
    try {
        const VIEW = STARTER.presentation(performance.now());
        ASSERT.equal(VIEW.units.length, 2, 'default FarmSession captures both starter peas');
        ASSERT(VIEW.units.every((unit) => unit.species === 0 && unit.walnutGuarding === false));
    } finally {
        STARTER.dispose();
    }
    const { encodeFarmSave: ENCODE_SAVE, parseSave: PARSE_SAVE } = await LOAD('src/farm-save-codec.js'),
        SAVE_WORLD = new GARDEN();
    const RESUMED = new FARM_SESSION(PARSE_SAVE(ENCODE_SAVE(SAVE_WORLD).text));
    try {
        ASSERT.equal(RESUMED.presentation(performance.now()).units.length, 2);
    } finally {
        RESUMED.dispose();
    }
    const WORLD = new GARDEN(),
        UNITS = SPECIES_CATALOG.map(({ id }) => WORLD.spawn(id, 3, 0, 0)),
        SESSION = new FARM_SESSION(WORLD);
    try {
        const VIEW = SESSION.presentation(performance.now());
        for (const UNIT of UNITS) {
            const RENDERED = VIEW.units.find((item) => item.id === UNIT.id);
            ASSERT(
                RENDERED && RENDERED.species === UNIT.species && RENDERED.walnutGuarding === false,
                `species ${UNIT.species} has an initial presentation`,
            );
        }
        const WALNUT = UNITS.find((unit) => unit.species === 5),
            CYCLE = WALNUT.ability;
        const SAMPLE_GUARD = () => {
            ASSERT(SESSION.capturePresentation('reset'));
            return SESSION.presentation(performance.now()).units.find((unit) => unit.id === WALNUT.id).walnutGuarding;
        };
        ASSERT(CYCLE.tryStartGuard(WORLD), 'default Walnut ability can start without an unlock purchase');
        ASSERT.equal(SAMPLE_GUARD(), true, 'the 40-tick defense posture is presented');
        ASSERT.equal(SAMPLE_GUARD(), true, 'repeated presentation does not consume the guard');
        ASSERT.equal(WORLD.combatTargetDefense(WALNUT).armor, 50, 'guard armor is applied as a modifier');
        WORLD.simulationTick = WALNUT.walnutGuardUntilTick;
        ASSERT.equal(SAMPLE_GUARD(), false, 'the armor modifier expires at 40 ticks');
        ASSERT.equal(WORLD.combatTargetDefense(WALNUT).armor, 0);
    } finally {
        SESSION.dispose();
    }
    return {
        starterUnits: 2,
        savedStartup: 'current FarmSession save and presentation checked',
        species: SPECIES_CATALOG.length,
        walnutGuard: 'active, read-only, consumed and idle checked',
    };
}
(async () => {
    const { validateVectorSources: VALIDATE_VECTOR_SOURCES } = require('./vector-sources.cjs');
    const { validateVectorArtifacts: VALIDATE_VECTOR_ARTIFACTS } = require('./vector-artifacts.cjs');
    VALIDATE_VECTOR_ARTIFACTS(ROOT);
    const VECTOR_ASSETS = VALIDATE_VECTOR_SOURCES(ROOT);
    const STARTUP_PRESENTATION = await verifyStartupPresentation();
    BUILD_SYNC({
        entryPoints: [PATH.join(ROOT, 'src/farm-app.js')],
        outfile: PATH.join(ROOT, 'src/game.js'),
        bundle: true,
        format: 'iife',
        target: 'es2022',
        charset: 'utf8',
        legalComments: 'inline',
    });
    const RUNTIME = require('./update-runtime-manifest.cjs').prepareRuntime(ROOT);
    const VECTOR_ARTIFACTS = VALIDATE_VECTOR_ARTIFACTS(ROOT);
    console.log(
        JSON.stringify(
            {
                startupPresentation: STARTUP_PRESENTATION,
                vectorAssets: VECTOR_ASSETS,
                vectorArtifacts: VECTOR_ARTIFACTS,
                ...RUNTIME,
            },
            null,
            2,
        ),
    );
})().catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
});
