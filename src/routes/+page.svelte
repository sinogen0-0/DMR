<script lang="ts">
	/**
	 * Home Page Redirect
	 * Automatically redirect to Recording view
	 */
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/recording', { replaceState: true });
	});
</script>

<div class="redirect-message">
	<span class="crt-text">&gt; REDIRECTING TO RECORDER...</span>
</div>

<style>
	.redirect-message {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100vh;
		background: var(--color-device-bg);
	}

	.crt-text {
		color: var(--color-phosphor-green);
		font-family: var(--font-display);
		font-size: 1rem;
	}
</style>
