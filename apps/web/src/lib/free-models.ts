const models: Readonly<Record<string, readonly string[]>> = {
  groq: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'],
  gemini: ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'],
  zai: ['glm-4.5-flash'],
  openrouter: ['openrouter/free'],
  cohere: ['command-a-plus-05-2026'],
  cloudflare: ['@cf/qwen/qwen3.8-27b', '@cf/google/gemma-4-26b-a4b-it'],
};

export function freeModels(provider: string): readonly string[] {
  return Object.hasOwn(models, provider) ? models[provider] ?? [] : [];
}

export function isFreeModel(provider: string, model: string): boolean {
  return freeModels(provider).includes(model)
    || (provider === 'openrouter' && /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*:free$/i.test(model));
}
