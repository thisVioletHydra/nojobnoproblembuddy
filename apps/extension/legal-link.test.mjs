import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('попап: мелкая ссылка «Документы» рядом с версией → <сервер>/legal через tabs.create', () => {
  const html = read('./src/popup.html');
  assert.match(html, /<footer class="build-info"[\s\S]*?id="build-hash"[\s\S]*?<a id="legal-link" class="legal-link" href="https:\/\/nojobnoproblem\.up\.railway\.app\/legal">[\s\S]*?<\/footer>/);
  const ts = read('./src/popup/popup.ts');
  assert.match(ts, /getElementById\('legal-link'\)[\s\S]*?preventDefault\(\)[\s\S]*?adminUrl\(gate, syncUrlNow\) \|\| DEFAULT_ADMIN_URL[\s\S]*?browser\.tabs\.create\(\{ url: `\$\{origin\}\/legal` \}\)/);
  assert.match(read('./src/popup.css'), /\.legal-link \{ color: inherit;/);
});

test('версия 0.5.134, ID-ключ манифеста не тронут', () => {
  assert.match(read('../../package.json'), /"version": "0\.5\.134"/);
  assert.match(read('./src/manifest.json'), /"key":/);
});
