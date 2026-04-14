<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    void goto('/settings?section=tagging', { replaceState: true });
  });
</script>

<div class="redirect-note">Redirecting to unified settings...</div>

<style>
  .redirect-note {
    font-family: 'Inter', sans-serif;
    color: #6b6250;
    padding: 1rem;
  }
</style>
