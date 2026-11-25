<script lang="ts">
import { invalidate } from '$app/navigation';
import { enhance } from '$lib/admin-forms';
import { freeModels, isFreeModel } from '$lib/free-models';
import Out from '$lib/Out.svelte';

let { data } = $props();
let startingCheck = $state(false);
const checkJob = $derived(data.checkJob);
const checkActive = $derived(checkJob?.state === 'queued' || checkJob?.state === 'running');

$effect(() => {
  if (!checkActive)
    return;

  let waiting = false;
  const timer = window.setInterval(async () => {
    if (waiting)
      return;

    waiting = true;
    try {
      await invalidate('app:provider-checks');
    }
    catch {
      // A temporary disconnect should not stop polling.
    }
    finally {
      waiting = false;
    }
  }, 650);

  return () => window.clearInterval(timer);
});

const activityLines = ['Запускаю пробу…', 'Стучу в API…', 'Ловлю ответ…', 'Кручу фишку…'];
let activityIndex = $state(0);
const currentChip = $derived(checkJob?.current ? `${checkJob.id}:${checkJob.checks.length}` : '');

$effect(() => {
  if (!currentChip)
    return;

  activityIndex = 0;
  const timer = window.setInterval(() => {
    activityIndex = (activityIndex + 1) % activityLines.length;
  }, 450);

  return () => window.clearInterval(timer);
});

type CheckTone = 'pending' | 'success' | 'failure' | 'warning';

const checkChips = $derived([
  ...(checkJob?.checks.map(row => ({ ...row, tone: checkTone(row.ok, row.status) })) ?? []),
  ...(checkJob?.current ? [{ ...checkJob.current, tone: 'pending' as const, ok: false, status: 0, alternative: '' }] : []),
]);

const chipIcons: Record<CheckTone, string> = {
  pending: '',
  success: '✓',
  failure: '×',
  warning: '?',
};

function checkTone(ok: boolean, status: number): CheckTone {
  if (ok)
    return 'success';

  return status === 401 || status === 403 || status === 429 ? 'warning' : 'failure';
}

function checkLabel(ok: boolean, status: number): string {
  if (ok)
    return 'Модель отвечает';

  if (status >= 200 && status < 300)
    return 'Модель не прошла пробу';

  const labels: Record<number, string> = {
    0: 'Нет ответа',
    401: 'Ключ не принят',
    403: 'Нет доступа',
    404: 'Модель или адрес не найдены',
    429: 'Лимит или нет плана',
    503: 'Провайдер временно недоступен',
  };

  return labels[status] ?? `Ошибка HTTP ${status}`;
}

function checkTime(at: string): string {
  return new Date(at).toLocaleTimeString('ru-RU', {
    timeZone: 'Asia/Bishkek',
    hour: '2-digit',
    minute: '2-digit',
  });
}

let providerId = $state('groq');
let key = $state('');
let savedKeyIndex = $state('');
let cloudflareAccountId = $state('');
let model = $state('');
let phase = $state<'idle' | 'checking'>('idle');
let message = $state('');
let ok = $state(false);
let openUnlink = $state(false);
let phrase = $state('');

const availablePresets = $derived(data.presets.filter(item => freeModels(item.id).length > 0));
const preset = $derived(availablePresets.find(item => item.id === providerId) ?? availablePresets[0]);
const modelChoices = $derived(freeModels(providerId));
const cloudflare = $derived(providerId === 'cloudflare');
const savedKeys = $derived(data.providers
  .map((row, index) => ({ ...row, index }))
  .filter(row => row.id === providerId && row.canReuseKey));
const ready = $derived((key.trim().length > 0 || savedKeyIndex !== '')
  && isFreeModel(providerId, model.trim())
  && (!cloudflare || /^[a-f0-9]{32}$/i.test(cloudflareAccountId.trim())));

function pick(id: string) {
  providerId = id;
  model = freeModels(id)[0] ?? '';
  key = '';
  savedKeyIndex = '';
  cloudflareAccountId = '';
  message = '';
}
$effect(() => {
  if (model.length === 0 && preset)
    model = freeModels(preset.id)[0] ?? '';
});
</script>

<header class="mb-5">
  <p class="text-xs tracking-wide text-zinc-500 uppercase">Модель</p>
  <h1 class="mt-1 text-3xl font-semibold tracking-tight">Цепочка провайдеров</h1>
  <p class="mt-2 text-sm text-zinc-500">Модели пробуются по порядку. При ошибке или лимите запрос переходит к следующей, а недоступная модель пробуется снова после паузы.</p>
</header>

{#if data.providers.length > 0}
  <section class="rounded-2xl border border-white/8 bg-[#151922] px-5 py-4">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-base font-semibold text-white">Подключено</h2>
      <button class="cursor-pointer rounded-lg px-3 py-1.5 text-sm text-rose-400 transition hover:bg-rose-500 hover:text-white focus-visible:bg-rose-500 focus-visible:text-white focus-visible:outline-none" type="button" onclick={() => { phrase = ''; openUnlink = true; }}>Убрать все</button>
    </div>
    <ol class="mt-3 divide-y divide-white/6">
      {#each data.providers as row, index (index)}
        <li class="flex items-center gap-3 py-3 text-sm">
          <span class="grid size-7 shrink-0 place-items-center rounded-full bg-white/8 text-xs text-zinc-300">{index + 1}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-zinc-100">{row.name} <span class="text-zinc-500">· {row.model}</span></p>
            <p class="truncate text-xs text-zinc-500">{row.host} · ключ …{row.keyTail}</p>
          </div>
          {#if index > 0}
            <form method="POST" action="?/raise" use:enhance>
              <input name="index" type="hidden" value={index} />
              <button class="btn btn-ghost btn-sm" type="submit" aria-label="Поднять выше">↑</button>
            </form>
          {/if}
          <form method="POST" action="?/remove" use:enhance>
            <input name="index" type="hidden" value={index} />
            <button class="btn btn-ghost btn-sm text-rose-400" type="submit" aria-label="Убрать">✕</button>
          </form>
        </li>
      {/each}
    </ol>
  </section>
{/if}

<section class="mt-4 rounded-2xl border border-white/8 bg-[#151922] px-5 py-4">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h2 class="text-base font-semibold text-white">Пробы</h2>
    {#if data.canPreview && !data.preview && (data.providers.length > 0 || data.localCheckPreview)}
      <form
        method="POST"
        action="?/check"
        use:enhance={() => {
          startingCheck = true;

          return async ({ update }) => {
            try {
              await update();
            }
            finally {
              startingCheck = false;
            }
          };
        }}
      >
        <button class="btn btn-outline btn-sm" type="submit" disabled={startingCheck || checkActive}>
          {startingCheck || checkActive ? 'Проверяю модели…' : 'Проверить цепочку'}
        </button>
      </form>
    {/if}
  </div>
  {#if data.localCheckPreview}
    <p class="mt-2 text-sm text-zinc-400">Локальное демо · 5 тестовых моделей</p>
  {/if}
  {#if checkJob}
    <div class="mt-3 rounded-xl border border-white/10 px-4 py-4">
      {#key checkJob.id}
        {#if checkChips.length > 0}
          <ol class="probe-chips" aria-label="Результаты по моделям">
            {#each checkChips as row, index (index)}
              {@const status = row.tone === 'pending' ? 'Проверяется' : checkLabel(row.ok, row.status)}
              <li class="probe-chip" data-tone={row.tone} title={`${row.name} · ${row.model}: ${status}${row.alternative ? `. Другой вариант: ${row.alternative}` : ''}`}>
                <div class="chip-stage" aria-hidden="true">
                  <div class="chip-disc">
                    <span class="chip-face chip-front">{row.name.slice(0, 1)}</span>
                    <span class="chip-face chip-back">{chipIcons[row.tone]}</span>
                  </div>
                  {#if row.tone === 'success'}
                    <span class="chip-sparks">
                      {#each [-90, -35, 25, 87, 149, 205, 255] as angle (angle)}
                        <i style:--ray={`${angle}deg`}></i>
                      {/each}
                    </span>
                  {/if}
                </div>
                <div class="chip-label">
                  <span class="chip-provider">{row.name}</span>
                  {#if row.tone === 'pending'}
                    {#key activityIndex}
                      <span class="chip-activity" aria-hidden="true">{activityLines[activityIndex]}</span>
                    {/key}
                  {:else}
                    <span class="chip-model">{row.model}</span>
                    {#if !row.ok}
                      <span class="chip-reason">{status}</span>
                    {/if}
                    <span class="sr-only">{row.ok ? status : ''}{row.alternative ? `. Другой вариант: ${row.alternative}` : ''}</span>
                  {/if}
                </div>
              </li>
            {/each}
          </ol>
        {/if}
      {/key}
      <div class="probe-progress" role="status">
        <div class="probe-progress-label">
          <span>
            {#if checkJob.state === 'queued'}
              Проверка в очереди
            {:else if checkJob.state === 'failed'}
              Проверка прервалась. Можно запустить её снова.
            {:else if checkJob.current}
              Проверяется {checkJob.current.name}
            {:else if checkJob.state === 'done'}
              Проверка завершена в {checkTime(checkJob.checkedAt)}
            {:else}
              Готовлю следующую проверку
            {/if}
          </span>
          <span class="probe-count">Проверено {checkJob.checks.length} из {checkJob.total}</span>
        </div>
      </div>
    </div>
  {/if}
  {#if data.probes.length > 0}
    <ul class="mt-3 divide-y divide-white/6">
      {#each data.probes as row, index (row.name + row.model + row.detail + index)}
        <li class="flex items-baseline justify-between gap-3 py-2 text-sm">
          <span class="min-w-0 truncate text-zinc-100">{row.name} <span class="text-zinc-500">· {row.model}</span></span>
          <span class="max-w-[55%] shrink-0 truncate text-right font-mono text-xs {row.ok ? 'text-emerald-300' : 'text-rose-300'}">{checkTime(row.at)} · {row.ok ? 'ok' : 'нет'} · {row.detail}</span>
        </li>
      {/each}
    </ul>
  {:else if !checkJob && !data.localCheckPreview}
    <p class="mt-2 text-sm text-zinc-500">Пока пусто. Запись появится после проверки ключа или пинга цепочки.</p>
  {/if}
</section>

<section class="mt-4 rounded-2xl border border-white/8 bg-[#151922] px-5 py-4">
  <h2 class="text-base font-semibold text-white">Добавить модель с бесплатным доступом</h2>
  <div class="mt-3 flex flex-wrap gap-2">
    {#each availablePresets as item (item.id)}
      <button
        class="cursor-pointer rounded-full border px-3 py-1.5 text-sm transition {providerId === item.id ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-white/10 text-zinc-400 hover:border-white/30 hover:text-zinc-200'}"
        type="button"
        onclick={() => pick(item.id)}
      >
        {item.name}
      </button>
    {/each}
  </div>

  {#if preset && preset.keysUrl}
    <div class="mt-3 grid gap-2 rounded-xl border border-white/10 p-4 text-sm text-zinc-300">
      <a class="btn btn-outline btn-sm justify-self-start" href={preset.keysUrl} target="_blank" rel="noopener">Получить ключ {preset.name}</a>
      {#if cloudflare}
        <p>Создай API Token для Workers AI. Затем открой <Out href="https://dash.cloudflare.com/?to=/:account/workers-and-pages" text="Workers &amp; Pages" /> и скопируй Account ID из блока Account Details.</p>
        <p class="text-zinc-400">У Workers Free есть бесплатная дневная квота. <Out href="https://developers.cloudflare.com/workers-ai/platform/pricing/" text="Лимиты и модели" /></p>
      {:else if providerId === 'openrouter'}
        <p>Для бесплатного резерва оставь <code>openrouter/free</code> или выбери модель с суффиксом <code>:free</code> из каталога.</p>
        <p><Out href="https://openrouter.ai/collections/free-models" text="Открыть каталог бесплатных моделей" /></p>
      {:else}
        <p>Создай API-ключ в аккаунте с бесплатным тарифом и вставь его ниже.</p>
      {/if}
    </div>
  {/if}

  {#if message}
    <p class="mt-3 font-mono text-xs {ok ? 'text-emerald-300' : 'text-rose-300'}">{message}</p>
  {/if}

  <form
    class="mt-4 grid gap-3"
    method="POST"
    action="?/add"
    use:enhance={() => {
      phase = 'checking';
      message = 'проверяю';
      ok = false;
      return async ({ result, update }) => {
        phase = 'idle';
        const body = result.type === 'success' ? result.data : null;
        ok = body?.ok === true;
        message = typeof body?.detail === 'string' ? body.detail : 'не вышло';
        if (ok) {
          key = '';
          savedKeyIndex = '';
          await update({ reset: false });
        }
      };
    }}
  >
    <input name="provider" type="hidden" value={providerId} />
    {#if savedKeys.length > 0}
      <label class="grid gap-1 text-sm text-zinc-300">
        Ключ провайдера
        <select class="select w-full max-w-md" name="savedKeyIndex" bind:value={savedKeyIndex} disabled={phase === 'checking'}>
          <option value="">Вставить новый ключ</option>
          {#each savedKeys as saved (saved.index)}
            <option value={String(saved.index)}>Использовать ключ …{saved.keyTail} · {saved.model}</option>
          {/each}
        </select>
      </label>
    {/if}
    {#if cloudflare}
      <label class="grid gap-1 text-sm text-zinc-300">
        Cloudflare Account ID
        <input class="input w-full max-w-md" name="cloudflareAccountId" bind:value={cloudflareAccountId} maxlength="32" autocomplete="off" />
      </label>
    {/if}
    <div class="flex flex-wrap items-end gap-3">
      {#if savedKeyIndex === ''}
      <input
        class="input input-bordered h-11 min-w-40 flex-1 border-white/10 bg-black/30 text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
        name="key"
        type="password"
        autocomplete="off"
        placeholder="API key"
        readonly={phase === 'checking'}
        bind:value={key}
      />
      {/if}
      <input
        class="input input-bordered h-11 w-56 border-white/10 bg-black/30 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
        name="model"
        list="provider-model-choices"
        autocomplete="off"
        placeholder="модель"
        bind:value={model}
      />
      <datalist id="provider-model-choices">
        {#each modelChoices as choice (choice)}
          <option value={choice}></option>
        {/each}
      </datalist>
      <button class="btn btn-primary h-11 min-h-11 shrink-0 px-4" type="submit" disabled={ready === false || phase === 'checking'}>
        {phase === 'checking' ? 'Проверяю' : 'Проверить и добавить'}
      </button>
    </div>
  </form>
</section>

{#if openUnlink}
  <dialog class="modal modal-open">
    <div class="modal-box border border-white/10 bg-[#151922]">
      <form method="POST" action="?/unlink">
        <p class="text-sm leading-6 text-zinc-300">Впиши unlink, чтобы убрать всех провайдеров.</p>
        <input class="input input-bordered mt-4 w-full border-white/10 bg-black/30 focus:border-indigo-400 focus:outline-none" name="phrase" autocomplete="off" bind:value={phrase} />
        <input name="section" type="hidden" value="model" />
        <div class="mt-5 flex gap-3">
          <button class="btn btn-error" type="submit" disabled={phrase !== 'unlink'}>Убрать</button>
          <button class="btn btn-ghost" type="button" onclick={() => openUnlink = false}>Закрыть</button>
        </div>
      </form>
    </div>
    <button class="modal-backdrop" type="button" aria-label="Закрыть" onclick={() => openUnlink = false}></button>
  </dialog>
{/if}


<style>
  .probe-chips {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 1rem 1.1rem;
    margin: 0;
    padding: 0.2rem 0 1.15rem;
    list-style: none;
  }

  .probe-chip {
    --chip-color: #aeafff;
    --chip-fill: #252947;
    display: grid;
    justify-items: center;
    align-content: start;
    gap: 0.3rem;
    width: 6.25rem;
    min-width: 0;
    text-align: center;
    animation: chip-arrive 300ms ease-out both;
  }

  .probe-chip[data-tone='pending'] {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    justify-items: start;
    gap: 0.7rem;
    width: 13rem;
    max-width: 100%;
    text-align: left;
  }

  .probe-chip[data-tone='success'] {
    --chip-color: #6ee7ba;
    --chip-fill: #17483e;
  }

  .probe-chip[data-tone='failure'] {
    --chip-color: #ff939f;
    --chip-fill: #532733;
  }

  .probe-chip[data-tone='warning'] {
    --chip-color: #ffd487;
    --chip-fill: #4a381f;
  }

  .chip-stage {
    width: 3.5rem;
    height: 3.5rem;
    position: relative;
    display: grid;
    place-items: center;
    perspective: 12rem;
  }

  .chip-stage::before {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid color-mix(in srgb, var(--chip-color) 33%, transparent);
    border-radius: 50%;
  }

  [data-tone='pending'] .chip-stage::before {
    border-top-color: var(--chip-color);
    border-right-color: var(--chip-color);
    animation: chip-orbit 850ms linear infinite;
  }

  [data-tone='failure'] .chip-stage {
    animation: chip-shake 280ms ease-in-out both;
  }

  .chip-disc {
    position: relative;
    width: 2.85rem;
    height: 2.85rem;
    transform-style: preserve-3d;
  }

  [data-tone='success'] .chip-disc,
  [data-tone='warning'] .chip-disc {
    animation: chip-flip 420ms ease-in-out both;
  }

  [data-tone='failure'] .chip-disc {
    transform: rotateY(180deg);
  }

  .chip-face {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--chip-color) 45%, transparent);
    backface-visibility: hidden;
    font-size: 1.55rem;
    font-weight: 700;
    line-height: 1;
  }

  .chip-front {
    color: #c5c5ff;
    background: #252947;
  }

  .chip-back {
    color: var(--chip-color);
    background: var(--chip-fill);
    transform: rotateY(180deg);
  }

  .chip-sparks {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .chip-sparks i {
    position: absolute;
    top: calc(50% - 2px);
    left: calc(50% - 2px);
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--chip-color);
    animation: chip-splash 460ms 240ms ease-out both;
  }

  .chip-label {
    display: grid;
    gap: 0.12rem;
    min-width: 0;
    max-width: 100%;
  }

  .chip-provider,
  .chip-model,
  .chip-activity {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chip-provider {
    color: #e4e4e7;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .chip-model {
    color: #a1a1aa;
    font-size: 0.7rem;
  }

  .chip-reason {
    color: var(--chip-color);
    font-size: 0.7rem;
    line-height: 1.25;
  }

  .chip-activity {
    color: var(--chip-color);
    font-size: 0.77rem;
    animation: activity-enter 180ms ease-out both;
  }

  .probe-progress {
    padding-top: 0.3rem;
  }

  .probe-progress-label {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.3rem 0.65rem;
    color: #a1a1aa;
    font-size: 0.78rem;
  }

  .probe-count {
    border: 1px solid #323545;
    border-radius: 999px;
    padding: 0.12rem 0.48rem;
    font-variant-numeric: tabular-nums;
  }

  @keyframes chip-arrive {
    from { opacity: 0; transform: translateX(0.75rem) scale(0.9); }
    to { opacity: 1; transform: translateX(0) scale(1); }
  }

  @keyframes activity-enter {
    from { opacity: 0; transform: translateY(0.2rem); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes chip-orbit {
    to { transform: rotate(360deg); }
  }

  @keyframes chip-flip {
    from { transform: rotateY(0); }
    to { transform: rotateY(180deg); }
  }

  @keyframes chip-shake {
    0%, 100% { translate: 0; }
    12%, 34%, 56%, 78% { translate: -3px; }
    23%, 45%, 67%, 89% { translate: 3px; }
  }

  @keyframes chip-splash {
    0% { opacity: 0; transform: rotate(var(--ray)) translateX(1.45rem); }
    26% { opacity: 1; }
    100% { opacity: 0; transform: rotate(var(--ray)) translateX(2.45rem) scale(0.35); }
  }

  @media (prefers-reduced-motion: reduce) {
    .probe-chip, .chip-stage, .chip-stage::before, .chip-disc, .chip-sparks i, .chip-activity {
      animation: none !important;
    }

    [data-tone='success'] .chip-disc,
    [data-tone='warning'] .chip-disc {
      transform: rotateY(180deg);
    }

    .chip-sparks {
      display: none;
    }

  }
</style>
