import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileVectorAssetFile, compiledAssetModuleSource } from '../vendor/upstream-source/modules/vector-assets/compiler.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const configPath = path.join(root, 'scripts/vector-assets-sources.json');
const motionPath = path.join(root, 'scripts/vector-assets-motion.json');
const outputPath = path.join(root, 'src/vector-assets.generated.js');

function withAuthoredMotion(asset, authored) {
  const metadata = asset.metadata;
  const parts = new Map(metadata.parts.map(part => [part.id, part]));
  const eyes = parts.get('eyes'), mouth = parts.get('mouth');
  if (!parts.has('body') || !eyes || !mouth) throw new Error(`${metadata.id} needs body, eyes, and mouth parts for authored motion`);
  const accent = parts.get(authored.accentPart),eyeOffset = authored.face.eyeHalfSpacing;
  if (!accent || !(eyeOffset > 0) || !(authored.face.eyeRadius > 0)) throw new Error(`${metadata.id} has invalid authored face sockets or accent part`);
  for(const [clipName,clip] of Object.entries(authored.clips))for(const frame of clip.keyframes)for(const partId of Object.keys(frame.parts))if(!parts.has(partId))throw new Error(`${metadata.id} clip ${clipName} references missing part ${partId}`);
  const sockets = {
    ...metadata.sockets,
    'face-eye-left': { part: 'body', point: [eyes.pivot[0] - eyeOffset, eyes.pivot[1]] },
    'face-eye-right': { part: 'body', point: [eyes.pivot[0] + eyeOffset, eyes.pivot[1]] },
  };
  const faceParts = ['eyes', 'mouth'];
  const visibleParts = metadata.parts.map(part => part.id).filter(id => !faceParts.includes(id));
  const expressions = { ...metadata.expressions };
  for (const name of Object.keys(authored.face.expressions)) {
    if (name === 'neutral') continue;
    expressions[name] = { show: visibleParts, hide: faceParts };
  }
  return {
    ...asset,
    metadata: {
      ...metadata,
      sockets,
      expressions,
      clips: metadata.clips,
      presentation: { faces: authored.face.expressions, faceInk: authored.face.ink, faceBlush: authored.face.blush, faceArt: { eyeRadius: authored.face.eyeRadius }, motionParts: ['body',authored.accentPart], motions: Object.fromEntries(Object.entries(authored.clips).map(([name,motion])=>[name,{...motion,keyframes:motion.keyframes.map(frame=>({...frame,easing:frame.easing||motion.easing||'linear'}))}])) },
    },
  };
}

export async function compileTroopAssets() {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const motionConfig = JSON.parse(await readFile(motionPath, 'utf8'));
  if (config.schemaVersion !== 1 || !Array.isArray(config.assets) || config.assets.length !== 3) {
    throw new TypeError('Vector source config must map exactly three species');
  }
  if (motionConfig.schemaVersion !== 1 || !Array.isArray(motionConfig.assets) || motionConfig.assets.length !== 3) {
    throw new TypeError('Vector motion config must map exactly three species');
  }
  const sources = [...config.assets].sort((a, b) => a.species - b.species);
  if (sources.some((entry, index) => entry.species !== index || typeof entry.file !== 'string')) {
    throw new TypeError('Vector source config must map species 0, 1, and 2 once each');
  }

  const troopDir = path.resolve(root, 'assets/troops');
  const listed = await readdir(troopDir).catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error));
  const svgNames = listed.filter(name => name.toLowerCase().endsWith('.svg')).sort();
  const configuredNames = sources.map(entry => path.basename(entry.file)).sort();
  if (svgNames.some(name => !configuredNames.includes(name))) {
    throw new TypeError('Unexpected SVG in assets/troops; add its species mapping to vector-assets-sources.json');
  }

  const supplied = [];
  for (const source of sources) {
    const absolute = path.resolve(root, source.file);
    if (!absolute.startsWith(troopDir + path.sep)) throw new TypeError('Vector sources must stay inside assets/troops');
    try {
      await readFile(absolute);
      supplied.push({ ...source, absolute });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  if (supplied.length !== 0 && supplied.length !== sources.length) {
    throw new Error('All three troop SVG sources are required before vector assets can be built');
  }

  const declarations = [];
  const entries = [];
  const compiled = [];
  const authoredBySpecies = new Map(motionConfig.assets.map(entry => [entry.species, entry]));
  if (authoredBySpecies.size !== 3 || [0, 1, 2].some(species => !authoredBySpecies.has(species))) {
    throw new TypeError('Vector motion config must map species 0, 1, and 2 once each');
  }
  for (const source of supplied) {
    const compiledSource = await compileVectorAssetFile(source.absolute, source.file.replaceAll('\\', '/'));
    const asset = withAuthoredMotion(compiledSource, authoredBySpecies.get(source.species));
    const { sourcePaths, ...runtimeAsset } = asset;
    const name = `troopAsset${source.species}`;
    declarations.push((await compiledAssetModuleSource(runtimeAsset, name)).trim());
    entries.push(`${source.species}: ${name}`);
    compiled.push({ species: source.species, id: asset.metadata.id, sourceSha256: asset.sourceSha256,
      compilerVersion: asset.compilerVersion, parts: asset.geometry.partCount,
      vertices: asset.geometry.vertices.length / asset.geometry.strideFloats,
      clips: Object.keys(asset.metadata.clips), motions:Object.keys(asset.metadata.presentation.motions), expressions: Object.keys(asset.metadata.expressions) });
  }

  const contents = [
    '// Generated from the SVG sources by GameKit vector-assets; do not edit.',
    ...declarations,
    `export const TROOP_VECTOR_ASSETS = Object.freeze({${entries.join(',')}});`,
    '',
  ].join('\n');
  await writeFile(outputPath, contents, 'utf8');
  if (!supplied.length) console.warn('No troop SVG sources yet; the vector registry stays empty until all three sources arrive.');
  return { sourceCount: supplied.length, assets: compiled, output: 'src/vector-assets.generated.js' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  compileTroopAssets().then(report => console.log(JSON.stringify(report, null, 2))).catch(error => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
}
