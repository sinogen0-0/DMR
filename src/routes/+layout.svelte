<script>
	import { getPlatformInfo } from '$lib/utils/platformDetector';
	import { page } from '$app/stores';
	import Breadcrumbs from '../components/Breadcrumbs.svelte';
	
	let platformInfo = getPlatformInfo();

	function titleizeSegment(segment) {
		if (!segment) return '';
		const map = {
			recording: 'Recording',
			entities: 'Entities',
			dossiers: 'Dossiers',
			settings: 'Settings',
			transcriptions: 'Transcriptions',
			review: 'Review',
			tagging: 'Tagging'
		};
		if (map[segment]) return map[segment];
		if (/^[0-9a-z]{8,}$/i.test(segment)) return 'Detail';
		return segment
			.split('-')
			.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
			.join(' ');
	}

	$: breadcrumbs = (() => {
		const segs = $page.url.pathname.split('/').filter(Boolean);
		if (segs.length === 0) return [{ label: 'Home' }];

		const crumbs = [{ label: 'Home', href: '/' }];
		let acc = '';
		for (let i = 0; i < segs.length; i += 1) {
			const seg = segs[i];
			acc += `/${seg}`;
			const isLast = i === segs.length - 1;
			crumbs.push({
				label: titleizeSegment(seg),
				href: isLast ? undefined : acc
			});
		}

		if (segs[0] === 'dossiers' && segs.length === 1) {
			const t = $page.url.searchParams.get('type');
			if (t) {
				crumbs.push({ label: titleizeSegment(t) });
			}
		}

		return crumbs;
	})();
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
		margin-bottom: 1rem;
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

	.breadcrumb-wrap {
		padding: 0.2rem 0 0.35rem;
		border-bottom: 1px solid #eee8d8;
	}
</style>

<main>
	<header>
		<h1>🎲 Dungeon Deck Recorder</h1>
		<p class="platform-info">Platform: {platformInfo.platform}</p>
		<div class="breadcrumb-wrap">
			<Breadcrumbs crumbs={breadcrumbs} />
		</div>
	</header>

	<slot />
</main>
