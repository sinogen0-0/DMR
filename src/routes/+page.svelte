<script lang="ts">
	import { getPlatformInfo } from '$lib/utils/platformDetector';
	
	const platformInfo = getPlatformInfo();

	function navigateToRecording() {
		window.location.href = '/recording';
	}

	function navigateToTranscription() {
		window.location.href = '/transcription-test';
	}

	function navigateToEntities() {
		window.location.href = '/entities';
	}

	function navigateToDossiers() {
		window.location.href = '/dossiers';
	}
</script>

<div class="home-container">
	<div class="status-box">
		<div class="status-title">System Status</div>
		<div class="status-content">
			<p>Platform: <strong>{platformInfo.platform}</strong></p>
			<p>Dungeon Deck Recorder is ready!</p>
		</div>
	</div>

	<div>
		<h2>Features</h2>
		<div class="feature-grid">
			<button on:click={navigateToRecording} class="feature-card feature-link" type="button">
				<div class="feature-title">🎙️ Audio Recording</div>
				<div class="feature-desc">Record D&D sessions in FLAC format with offline support</div>
			</button>
			<button on:click={navigateToTranscription} class="feature-card feature-link" type="button">
				<div class="feature-title">✨ Transcription</div>
				<div class="feature-desc">Convert audio to M4A after automatic transcription</div>
			</button>
			<button on:click={navigateToEntities} class="feature-card feature-link" type="button">
				<div class="feature-title">📖 Entity Lists</div>
				<div class="feature-desc">Add characters, NPCs, locations, and story objects</div>
			</button>
			<button on:click={navigateToDossiers} class="feature-card feature-link" type="button">
				<div class="feature-title">🗂️ Dossier System</div>
				<div class="feature-desc">View transcriptions grouped by dossier with mention snippets</div>
			</button>
		</div>
	</div>
</div>

<style>
	.home-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding: 2rem;
	}

	.status-box {
		background: #ffffff;
		border-top: 1px solid #eee8d8;
		border-left: 1px solid #eee8d8;
		border-bottom: 1px solid #363226;
		border-right: 1px solid #363226;
		padding: 1.5rem;
		font-size: 0.875rem;
	}

	.status-title {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #9a442d;
		margin-bottom: 0.5rem;
	}

	.status-content {
		font-family: 'Inter', sans-serif;
		color: #363226;
		line-height: 1.5;
	}

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin-top: 1rem;
	}

	.feature-card {
		background: #ffffff;
		border-top: 1px solid #eee8d8;
		border-left: 1px solid #eee8d8;
		border-bottom: 1px solid #363226;
		border-right: 1px solid #363226;
		padding: 1.5rem;
		font-family: inherit;
		cursor: pointer;
	}

	.feature-link {
		text-decoration: none;
		color: inherit;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.feature-link:hover {
		background-color: #f9f5f0;
		border-top: 1px solid #e8dcc8;
		border-left: 1px solid #e8dcc8;
		border-bottom: 1px solid #4a3a2a;
		border-right: 1px solid #4a3a2a;
	}

	.feature-link:active {
		border-top: 1px solid #363226;
		border-left: 1px solid #363226;
		border-bottom: 1px solid #eee8d8;
		border-right: 1px solid #eee8d8;
	}

	.feature-title {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #363226;
		margin-bottom: 0.75rem;
	}

	.feature-desc {
		font-family: 'Inter', sans-serif;
		font-size: 0.875rem;
		color: #6b6250;
		line-height: 1.5;
	}

	h2 {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 1.25rem;
		font-weight: 600;
		color: #363226;
		margin-bottom: 1rem;
	}
</style>
