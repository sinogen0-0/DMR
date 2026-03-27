<script lang="ts">
	import { getPlatformInfo } from '$lib/utils/platformDetector';
	
	const platformInfo = getPlatformInfo();
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
			<div class="feature-card">
				<div class="feature-title">🎙️ Audio Recording</div>
				<div class="feature-desc">Record D&D sessions in FLAC format with offline support</div>
			</div>
			<div class="feature-card">
				<div class="feature-title">✨ Transcription</div>
				<div class="feature-desc">Convert audio to M4A after automatic transcription</div>
			</div>
			<div class="feature-card">
				<div class="feature-title">📖 Entity Extraction</div>
				<div class="feature-desc">Auto-extract NPCs, locations, and plot points</div>
			</div>
			<div class="feature-card">
				<div class="feature-title">🗂️ Dossier System</div>
				<div class="feature-desc">Manage and link entities across sessions</div>
			</div>
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
