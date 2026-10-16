import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const appPath=fileURLToPath(new URL('../src/farm-app.js',import.meta.url));
const htmlPath=fileURLToPath(new URL('../index.html',import.meta.url));
const [app,html]=await Promise.all([readFile(appPath,'utf8'),readFile(htmlPath,'utf8')]);

const ids=[...new Set([...app.matchAll(/\$\('([^']+)'\)\.onclick\s*=/g)].map(match=>match[1]))];
assert.ok(ids.length>0,'Farm app exposes its event-bound DOM contracts');
for(const id of ids){
  const count=[...html.matchAll(new RegExp(`\\bid=["']${id}["']`,'g'))].length;
  assert.equal(count,1,`Farm app event binding #${id} has exactly one matching element in index.html`);
}

const legacyExport=html.match(/<button\b[^>]*\bid="exportLegacySave"[^>]*>[\s\S]*?<\/button>/)?.[0];
assert.ok(legacyExport,'index.html exposes the legacy-save backup export control');
assert.match(legacyExport,/\bhidden\b/,'legacy backup export stays hidden when no backup exists');
assert.match(legacyExport,/백업 내보내기/,'legacy backup export label is discoverable to users');
assert.match(app,/\$\('exportLegacySave'\)\.hidden\s*=\s*!storage\.legacyBackup/,'the legacy backup export appears when a recoverable backup exists');


const utility=html.match(/<div class="utility">([\s\S]*?)<\/div>/)?.[1]||'';
assert.equal([...utility.matchAll(/<button\b/g)].length,1,'one conventional gear button replaces scattered utility controls');
assert.match(utility,/id="gameMenu"[^>]*aria-label="게임 설정 열기"[^>]*aria-haspopup="dialog"/,'utility contains one named settings button that opens a dialog');
assert.deepEqual([...html.matchAll(/<button[^>]*data-menu-tab="([^"]+)"[^>]*>([^<]+)<\/button>/g)].map(match=>match[2]),['플레이','성장','특수 능력','도움말'],'the shared menu exposes four direct Korean tabs');
assert.doesNotMatch(html,/<[^>]+id="roles"/,'the boss map has no floating troop-role explanation');
assert.doesNotMatch(html,/#roles\b/,'no layout rules keep the removed troop-role overlay alive');
assert.doesNotMatch(html,/#treeClose\b/,'no close-button styling remains for removed nested upgrade panels');
for(const id of ['feed','raidControls','raidRemaining','bossbar','allyHealth','bossHealth'])assert.match(html,new RegExp(`\\bid="${id}"`),`essential gameplay indicator #${id} remains in the document`);
assert.match(app,/gameMenuOverlay/,'Farm app controls the shared menu overlay');

console.log(`Farm app DOM contract checks passed (${ids.length} event bindings)`);
