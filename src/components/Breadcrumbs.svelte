<script lang="ts">
  export let crumbs: { label: string; href?: string }[] = [];
</script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
  {#each crumbs as crumb, i}
    {#if i > 0}
      <span class="sep" aria-hidden="true">›</span>
    {/if}
    {#if crumb.href && i < crumbs.length - 1}
      <a href={crumb.href} class="crumb link">{crumb.label}</a>
    {:else}
      <span class="crumb current">{crumb.label}</span>
    {/if}
  {/each}
</nav>

<style>
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6b6250;
    padding: 0.5rem 0;
  }

  .sep {
    color: #b0a48a;
    font-size: 0.9rem;
    line-height: 1;
  }

  .crumb {
    color: #6b6250;
    text-decoration: none;
  }

  .crumb.link {
    color: #9a442d;
  }

  .crumb.link:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .crumb.current {
    color: #363226;
    font-weight: 600;
  }
</style>
