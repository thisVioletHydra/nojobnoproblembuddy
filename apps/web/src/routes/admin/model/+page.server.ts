import type { Actions, PageServerLoad } from './$types';

import { presetOf, probeProvider, providerName, readProbeLog } from '@cursor-chrome/hh';
import { dev } from '$app/environment';
import { error, redirect } from '@sveltejs/kit';
import { isDemoLogin } from '$lib/server/demo';
import { chainOf, isCreator, readAccount } from '$lib/server/secrets';
import { readSession } from '$lib/server/session';
import { addProviderAdmin, raiseProviderAdmin, removeProviderAdmin, unlinkAdmin } from '$lib/server/admin-actions';

const CHECK_GAP_MS = 750;
const CHECK_STATUS_KEY = 'app:provider-checks';
const LOCAL_CHECKS: ProviderCheck[] = [
  { name: 'Grok', model: 'demo-model', ok: true, status: 200, alternative: '' },
  { name: 'Gemini', model: 'demo-model', ok: true, status: 200, alternative: '' },
  { name: 'Z.ai', model: 'demo-old', ok: false, status: 404, alternative: 'demo-replacement' },
  { name: 'OpenRouter', model: 'demo-model', ok: false, status: 429, alternative: '' },
  { name: 'Cohere', model: 'demo-model', ok: false, status: 0, alternative: '' },
];

function localPreview(hostname: string): boolean {
  return dev && process.env.NOJ_LOCAL_PREVIEW === '1' && hostname === '127.0.0.1';
}

type ProviderCheck = {
  name: string;
  model: string;
  ok: boolean;
  status: number;
  alternative: string;
};

type CheckJob = {
  state: 'queued' | 'running' | 'done' | 'failed';
  id: number;
  mock: boolean;
  total: number;
  current: Pick<ProviderCheck, 'name' | 'model'> | null;
  checkedAt: string;
  checks: ProviderCheck[];
};

const jobs = new Map<string, CheckJob>();
const queue: string[] = [];
let workerRunning = false;
let nextJobId = 0;

export const load: PageServerLoad = async ({ parent, cookies, depends, url }) => {
  depends(CHECK_STATUS_KEY);
  const login = readSession(cookies.get('session'))?.login;
  const { preview, canPreview } = await parent();
  // the demo account sets up its own BYOK chain (key wizard) here
  if (canPreview === false && !isDemoLogin(login))
    redirect(303, '/start');

  if (preview)
    return { probes: [], checkJob: null, localCheckPreview: false };

  const notes = await readProbeLog();

  return {
    localCheckPreview: canPreview && localPreview(url.hostname),
    checkJob: login && canPreview ? jobs.get(login) ?? null : null,
    probes: notes.slice(-16).reverse().map(row => ({
      name: row.name,
      model: row.model,
      ok: row.ok,
      detail: row.detail,
      at: row.at,
    })),
  };
};

async function checkChain(login: string, job: CheckJob): Promise<void> {
  if (job.mock) {
    job.total = LOCAL_CHECKS.length;
    for (const check of LOCAL_CHECKS) {
      job.current = { name: check.name, model: check.model };
      await new Promise(resolve => setTimeout(resolve, 1500));
      job.checks.push(check);
    }

    return;
  }

  const chain = chainOf(await readAccount(login));
  job.total = chain.length;

  for (const provider of chain) {
    if (job.checks.length > 0)
      await new Promise(resolve => setTimeout(resolve, CHECK_GAP_MS));

    const name = providerName(provider);
    job.current = { name, model: provider.model };
    const result = await probeProvider(provider);
    const preset = presetOf(provider.id);
    const alternative = preset?.url === provider.url && preset.model !== provider.model ? preset.model : '';
    job.checks.push({ name, model: provider.model, ok: result.ok, status: result.status, alternative });
    job.current = null;
  }
}

async function drainChecks(): Promise<void> {
  workerRunning = true;
  try {
    for (let login = queue.shift(); login !== undefined; login = queue.shift()) {
      const job = jobs.get(login);
      if (!job)
        continue;

      job.state = 'running';
      try {
        await checkChain(login, job);
        job.state = 'done';
      }
      catch {
        job.state = 'failed';
      }
      finally {
        job.current = null;
        job.checkedAt = new Date().toISOString();
      }
    }
  }
  finally {
    workerRunning = false;
  }
}

export const actions: Actions = {
  check: ({ cookies, url }) => {
    const session = readSession(cookies.get('session'));
    if (!session || !isCreator(session.login) || cookies.get('preview') === 'guest')
      error(403);

    const login = session.login;
    const existing = jobs.get(login);
    if (existing?.state === 'queued' || existing?.state === 'running')
      return { ok: true };

    jobs.set(login, { id: ++nextJobId, state: 'queued', mock: localPreview(url.hostname), total: 0, current: null, checkedAt: '', checks: [] });
    queue.push(login);
    if (!workerRunning)
      void drainChecks();

    return { ok: true };
  },
  add: addProviderAdmin,
  remove: removeProviderAdmin,
  raise: raiseProviderAdmin,
  unlink: unlinkAdmin,
};
