// Key wizard → the logged-in account's own provider chain (xai + grok model). Only the given login is read and written.
import type { Provider } from '../../../../../hh/src/model/model.ts';
import type { KeyCheck } from './byok-check.ts';

import { MAX_PROVIDER_CHAIN, parseChain, presetOf } from '../../../../../hh/src/model/model.ts';
import { validXaiKey } from './byok-check.ts';

type Stored = { modelChain: string };
export type ChainDeps<A extends Stored> = {
  read: (login: string) => Promise<A>;
  write: (login: string, next: A) => Promise<void>;
  test: (key: string) => Promise<KeyCheck>;
};

export function xaiProvider(key: string): Provider {
  const preset = presetOf('xai')!;

  return { id: 'xai', key: key.trim(), model: preset.model, url: preset.url };
}

// Keep existing models in order when adding a checked key.
export async function addXaiToChain<A extends Stored>(login: string, key: string, deps: ChainDeps<A>): Promise<{ ok: boolean; detail: string }> {
  if (validXaiKey(key) === false)
    return { ok: false, detail: 'не похоже на ключ xAI (xai-…)' };

  const check = await deps.test(key);
  if (check.ok === false && check.code !== 'key-no-credits')
    return { ok: false, detail: check.message };

  const saved = await deps.read(login);
  const chain = parseChain(saved.modelChain);
  const provider = xaiProvider(key);
  const exists = chain.some(item => item.url === provider.url && item.model === provider.model && item.key === provider.key);
  const next = exists ? chain : [...chain, provider];
  if (next.length > MAX_PROVIDER_CHAIN)
    return { ok: false, detail: `В пуле максимум ${MAX_PROVIDER_CHAIN} моделей` };

  await deps.write(login, { ...saved, modelChain: JSON.stringify(next) });

  return { ok: true, detail: check.ok ? 'Grok добавлен в цепочку' : 'Grok добавлен в цепочку (ключ верный, но нет кредитов)' };
}
