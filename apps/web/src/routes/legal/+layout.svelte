<script lang="ts">
let { children } = $props();
</script>

<div class="min-h-dvh bg-[#0b0d12] text-zinc-300" data-testid="legal">
  <div class="mx-auto max-w-3xl px-5 py-8 lg:py-12">
    <nav class="mb-8 flex items-center gap-3 text-xs text-zinc-500">
      <a class="hover:text-zinc-300" href="/">NoJobNoProblemBuddy</a>
      <span aria-hidden="true">/</span>
      <a class="hover:text-zinc-300" href="/legal">Документы</a>
    </nav>
    {@render children()}
  </div>
</div>
