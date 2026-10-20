import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { legacyAdminPath, legacyLegalPath } from './src/lib/server/legacy-path.ts';
import { renderMarkdown } from './src/lib/legal/markdown.ts';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const SLUGS = ['terms-of-use', 'privacy-policy', 'disclaimer', 'chrome-extension-privacy', 'consent-personal-data'];

test('все 5 документов и индекс /legal на месте', () => {
  for (const slug of SLUGS) {
    assert.ok(existsSync(new URL(`./src/lib/legal/${slug}.md`, import.meta.url)), slug);
    assert.match(read('./src/lib/legal/docs.ts'), new RegExp(`slug: '${slug}'`));
  }
  assert.ok(existsSync(new URL('./src/routes/legal/+page.svelte', import.meta.url)));
  assert.ok(existsSync(new URL('./src/routes/legal/[doc]/+page.server.ts', import.meta.url)));
});

test('/legal публичный: auth-гейт hooks касается только /admin', () => {
  const hooks = read('./src/hooks.server.ts');
  assert.match(hooks, /event\.url\.pathname === '\/admin' \|\| event\.url\.pathname\.startsWith\('\/admin\/'\)/);
  assert.doesNotMatch(hooks, /startsWith\('\/legal/);
  assert.equal(existsSync(new URL('./src/routes/legal/+layout.server.ts', import.meta.url)), false);
});

test('старые /terms /privacy /disclaimer → 301 на /legal/*', () => {
  const at = path => legacyLegalPath(new URL(path, 'https://x.test'));
  assert.equal(at('/terms'), '/legal/terms-of-use');
  assert.equal(at('/privacy/'), '/legal/privacy-policy');
  assert.equal(at('/disclaimer?x=1'), '/legal/disclaimer?x=1');
  assert.equal(at('/legal/terms-of-use'), null);
  assert.equal(at('/termsx'), null);
  assert.equal(legacyAdminPath(new URL('/terms', 'https://x.test')), null);
  const hooks = read('./src/hooks.server.ts');
  assert.match(hooks, /legacyLegalPath\(event\.url\)[\s\S]*?status: 301/);
  assert.ok(hooks.indexOf('legacyLegalPath(event.url)') < hooks.indexOf('useDevSession(event)'));
});

test('ссылка на /legal в подвале входа и админки, дисклеймер не тронут', () => {
  for (const file of ['./src/lib/LoginScene.svelte', './src/routes/admin/+layout.svelte']) {
    const src = read(file);
    assert.match(src, /\{DISCLAIMER\} <a [^>]*href="\/legal"[^>]*data-testid="legal-link"/, file);
  }
});

test('markdown: экранирует HTML, рендерит заголовки/таблицы/списки, тексты целы', () => {
  assert.equal(renderMarkdown('<script>x</script>'), '<p>&lt;script&gt;x&lt;/script&gt;</p>');
  const html = renderMarkdown(read('./src/lib/legal/privacy-policy.md'));
  assert.match(html, /<h1>/);
  assert.match(html, /<table>/);
  assert.match(html, /\[КОНТАКТНЫЙ EMAIL\]/);
  assert.doesNotMatch(html, /<script/);
  const consent = renderMarkdown(read('./src/lib/legal/consent-personal-data.md'));
  assert.match(consent, /<ol>/);
  assert.match(consent, /<strong>Данные:<\/strong>/);
});
