// Старый адрес раздела /admin/hh переехал на /admin/source.
// Возвращает новый адрес (с query) или null, если путь не старый.
export function legacyAdminPath(url: URL): string | null {
  const path = url.pathname;
  if (path !== '/admin/hh' && path.startsWith('/admin/hh/') === false)
    return null;

  return `/admin/source${path.slice('/admin/hh'.length)}${url.search}`;
}

// Старые /terms, /privacy, /disclaimer → /legal/* (301).
const LEGAL_MOVED: Record<string, string> = {
  '/terms': '/legal/terms-of-use',
  '/privacy': '/legal/privacy-policy',
  '/disclaimer': '/legal/disclaimer',
};

export function legacyLegalPath(url: URL): string | null {
  const to = LEGAL_MOVED[url.pathname.replace(/\/+$/, '')];

  return to === undefined ? null : `${to}${url.search}`;
}
