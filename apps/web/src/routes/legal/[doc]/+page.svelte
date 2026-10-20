<script lang="ts">
let { data } = $props();
</script>

<svelte:head><title>{data.title} — NoJobNoProblemBuddy</title></svelte:head>

<!-- html собран из экранированного Markdown (lib/legal/markdown.ts) -->
<article class="legal-doc" data-testid="legal-doc">{@html data.html}</article>

<style>
  .legal-doc { font-size: 15px; line-height: 1.65; }
  .legal-doc :global(h1) { margin: 0 0 1.25rem; font-size: 1.6rem; line-height: 1.25; font-weight: 600; color: #f4f4f5; }
  .legal-doc :global(h2) { margin: 2rem 0 .75rem; font-size: 1.1rem; font-weight: 600; color: #e4e4e7; }
  .legal-doc :global(h3) { margin: 1.5rem 0 .5rem; font-weight: 600; color: #e4e4e7; }
  .legal-doc :global(p) { margin: 0 0 .9rem; }
  .legal-doc :global(ul), .legal-doc :global(ol) { margin: 0 0 .9rem; padding-left: 1.4rem; }
  .legal-doc :global(ul) { list-style: disc; }
  .legal-doc :global(ol) { list-style: decimal; }
  .legal-doc :global(li) { margin: .25rem 0; }
  .legal-doc :global(strong) { color: #f4f4f5; }
  .legal-doc :global(blockquote) { margin: 0 0 1.5rem; padding: .6rem .9rem; border-left: 3px solid #f59e0b80; background: #f59e0b14; border-radius: 6px; font-size: 13px; color: #fcd34d; }
  .legal-doc :global(.table) { overflow-x: auto; margin: 0 0 1rem; }
  .legal-doc :global(table) { width: 100%; border-collapse: collapse; font-size: 13px; }
  .legal-doc :global(th), .legal-doc :global(td) { padding: .45rem .6rem; border: 1px solid #ffffff14; text-align: left; vertical-align: top; }
  .legal-doc :global(th) { color: #e4e4e7; background: #ffffff08; }
</style>
