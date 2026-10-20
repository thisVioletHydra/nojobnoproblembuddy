import { LEGAL_DOCS } from '$lib/legal/docs';

export function load() {
  return { docs: LEGAL_DOCS.map(doc => ({ slug: doc.slug, title: doc.title })) };
}
