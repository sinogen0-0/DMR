<script>
	import { getPlatformInfo } from '$lib/utils/platformDetector';
	
	let platformInfo = getPlatformInfo();
</script>

<style>
	:global {
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			background-color: #fef9f0;
			color: #363226;
		}

		html, body, :global(#svelte) {
			width: 100%;
			height: 100%;
		}
	}

	main {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		padding: 1rem;
	}

	header {
		margin-bottom: 2rem;
	}

	h1 {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.platform-info {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 0.75rem;
		color: #9a442d;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}
</style>

<main>
	<header>
		<h1>🎲 Dungeon Deck Recorder</h1>
		<p class="platform-info">Platform: {platformInfo.platform}</p>
	</header>

	<slot />
</main>
