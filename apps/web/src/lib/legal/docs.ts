// Юридические страницы: тексты Адвоката лежат рядом как .md и не правятся здесь.
import terms from './terms-of-use.md?raw';
import privacy from './privacy-policy.md?raw';
import disclaimer from './disclaimer.md?raw';
import extension from './chrome-extension-privacy.md?raw';
import consent from './consent-personal-data.md?raw';

export type LegalDoc = { slug: string; title: string; source: string };

export const LEGAL_DOCS: LegalDoc[] = [
  { slug: 'terms-of-use', title: 'Условия использования', source: terms },
  { slug: 'privacy-policy', title: 'Политика конфиденциальности', source: privacy },
  { slug: 'disclaimer', title: 'Отказ от ответственности', source: disclaimer },
  { slug: 'chrome-extension-privacy', title: 'Конфиденциальность расширения Chrome', source: extension },
  { slug: 'consent-personal-data', title: 'Согласие на обработку персональных данных', source: consent },
];

export function legalDoc(slug: string): LegalDoc | null {
  return LEGAL_DOCS.find(doc => doc.slug === slug) ?? null;
}
