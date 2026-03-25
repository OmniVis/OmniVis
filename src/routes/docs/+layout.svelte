<script lang="ts">
  import SiteNavbar from '$/components/SiteNavbar.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();
</script>

<SiteNavbar />
<main>
  {@render children()}
</main>
