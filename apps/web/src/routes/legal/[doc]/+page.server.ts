import { error } from '@sveltejs/kit';

import { legalDoc } from '$lib/legal/docs';
import { renderMarkdown } from '$lib/legal/markdown';

export function load({ params }) {
  const doc = legalDoc(params.doc);
  if (doc === null)
    error(404, 'Документ не найден');

  return { title: doc.title, html: renderMarkdown(doc.source) };
}
