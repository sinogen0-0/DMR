<script lang="ts">
	import { getPlatformInfo } from '$lib/utils/platformDetector';

	const platformInfo = getPlatformInfo();
</script>

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
		margin-bottom: 1rem;
	}

	.status-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		background-color: #eee8d8;
		border-radius: 2px;
	}

	.led {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.led.active {
		background-color: #4b654e;
		box-shadow: 0 0 4px rgba(75, 101, 78, 0.5);
	}

	.led.inactive {
		background-color: #9a442d;
		opacity: 0.3;
	}
</style>

<div class="home-container">
	<div class="status-box">
		<div class="status-title">SYSTEM_STATUS</div>
		<div class="status-content">
			<p>Dungeon Deck Recorder initialized successfully on <strong>{platformInfo.platform}</strong>.</p>
			<p style="margin-top: 0.5rem;">
				<span class="status-indicator">
					<span class="led active" />
					Core System Ready
				</span>
			</p>
		</div>
	</div>

	<div class="feature-grid">
		<div class="feature-card">
			<div class="feature-title">🎙️ Audio Recording</div>
			<div class="feature-desc">
				Record audio in FLAC format for high-quality transcription.
			</div>
			<span class="status-indicator">
				<span class="led inactive" />
				Not Implemented
			</span>
		</div>

		<div class="feature-card">
			<div class="feature-title">📝 Transcription</div>
			<div class="feature-desc">
				Convert recorded audio to text using Web Speech API.
			</div>
			<span class="status-indicator">
				<span class="led inactive" />
				Not Implemented
			</span>
		</div>

		<div class="feature-card">
			<div class="feature-title">🔍 Entity Extraction</div>
			<div class="feature-desc">
				Automatically extract NPCs, locations, and story elements.
			</div>
			<span class="status-indicator">
				<span class="led inactive" />
				Not Implemented
			</span>
		</div>

		<div class="feature-card">
			<div class="feature-title">📂 Dossiers</div>
			<div class="feature-desc">
				Organize extracted entities into categorized dossiers.
			</div>
			<span class="status-indicator">
				<span class="led inactive" />
				Not Implemented
			</span>
		</div>
	</div>
</div>
