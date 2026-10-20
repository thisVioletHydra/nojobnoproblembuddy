<script lang="ts">
let { data } = $props();
</script>

<svelte:head><title>Документы — NoJobNoProblemBuddy</title></svelte:head>

<h1 class="mb-6 text-2xl font-semibold text-zinc-100">Юридические документы</h1>
<ul class="space-y-2" data-testid="legal-index">
  {#each data.docs as doc (doc.slug)}
    <li><a class="text-indigo-300 hover:text-indigo-200 hover:underline" href={`/legal/${doc.slug}`}>{doc.title}</a></li>
  {/each}
</ul>
