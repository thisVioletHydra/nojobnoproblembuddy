// Cached server policy can survive an extension update. Check it against the installed version before rendering.
import type { StorageArea } from './store.ts';

export const UPDATE_KEY = 'extUpdate:v1';

export type UpdateFlag = { outdated: boolean; blocked: boolean; recommended: string; min: string; url: string; at: number };

export function readUpdateHeaders(headers: Headers, status: number, now = Date.now()): UpdateFlag | null {
  const outdated = headers.get('x-ext-outdated');
  if (outdated === null && status !== 426)
    return null;

  return { outdated: outdated === '1' || status === 426, blocked: status === 426, recommended: headers.get('x-ext-recommended') ?? '', min: headers.get('x-ext-min') ?? '', url: headers.get('x-ext-update-url') ?? '', at: now };
}

export async function noteUpdate(area: StorageArea, flag: UpdateFlag | null): Promise<void> {
  if (flag !== null)
    await area.set({ [UPDATE_KEY]: flag });
}

export async function updateFlag(area: StorageArea): Promise<UpdateFlag | null> {
  const flag = (await area.get(UPDATE_KEY))[UPDATE_KEY] as UpdateFlag | undefined;

  return flag?.outdated ? flag : null;
}

export function isNewer(target: string, installed: string): boolean {
  const parts = target.trim().split('.');
  if (parts.length > 4 || parts.some(part => /^\d+$/.test(part) === false))
    return false;

  const current = installed.split('.').map(Number);
  for (let index = 0; index < 4; index++) {
    const difference = Number(parts[index] ?? 0) - (current[index] ?? 0);
    if (difference !== 0)
      return difference > 0;
  }

  return false;
}

export function bannerHtml(flag: UpdateFlag | null, base: string, installed: string): string {
  if (!flag)
    return '';

  const blocked = flag.blocked && (flag.min === '' || isNewer(flag.min, installed));
  if (blocked === false && isNewer(flag.recommended, installed) === false)
    return '';

  const href = flag.url.startsWith('/') ? `${base}${flag.url}` : flag.url;
  const text = blocked ? `Расширение устарело (минимум ${flag.min}), работа остановлена.` : `Доступна новая версия ${flag.recommended}.`;

  return `<div class="cc-update" role="alert">${text} ${href ? `<a href="${href.replace(/"/g, '')}" target="_blank" rel="noopener">Скачать zip</a>` : ''}</div>`;
}
