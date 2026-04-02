<script lang="ts">
	import { onMount } from 'svelte';
	import type { CustomEntity, DossierType, Recording, TranscriptionTag } from '$lib/types';
	import { createCustomEntityService, createStorageService } from '$lib/services';

	const storageService = createStorageService();
	const customEntityService = createCustomEntityService();

	let recordings: Recording[] = [];
	let customEntities: CustomEntity[] = [];
	let suggestedMatches: CustomEntity[] = [];

	let loading = true;
	let error = '';

	let selectedRecording: Recording | null = null;
	let selectedTag: TranscriptionTag | null = null;

	let editMode = false;
	let editName = '';
	let editType: DossierType = 'NPC';
	let editNotes = '';

	onMount(async () => {
		await loadData();
	});

	async function loadData(): Promise<void> {
		loading = true;
		error = '';

		try {
			await storageService.initialize();
			await customEntityService.initialize();

			const allRecordings = await storageService.listRecordings();
			recordings = allRecordings
				.filter((recording) => getNeedsReviewTags(recording).length > 0)
				.sort((a, b) => b.timestamp - a.timestamp);

			customEntities = await customEntityService.listEntities();
		} catch (err) {
			error = `Failed to load review data: ${String(err)}`;
		} finally {
			loading = false;
		}
	}

	function getNeedsReviewTags(recording: Recording): TranscriptionTag[] {
		return (recording.transcriptionTags ?? []).filter(
			(tag) => tag.status === 'needs_review' || !tag.customEntityId
		);
	}

	function getMentionContext(tag: TranscriptionTag): string {
		return tag.mentionContexts?.[0] ?? '';
	}

	function selectRecording(recording: Recording): void {
		selectedRecording = recording;
		selectedTag = null;
		editMode = false;
	}

	function selectTag(tag: TranscriptionTag): void {
		selectedTag = tag;
		editMode = false;
		editName = tag.name;
		editType = tag.type;
		editNotes = '';

		suggestedMatches = customEntities.filter((entity) => {
			const sameType = entity.type === tag.type;
			const nameA = entity.name.toLowerCase();
			const nameB = tag.name.toLowerCase();
			const fuzzyMatch = nameA.includes(nameB) || nameB.includes(nameA);
			return sameType && fuzzyMatch;
		});
	}

	async function persistRecording(recording: Recording): Promise<void> {
		await storageService.saveRecording(recording);
		recordings = recordings
			.map((r) => (r.id === recording.id ? recording : r))
			.filter((r) => getNeedsReviewTags(r).length > 0)
			.sort((a, b) => b.timestamp - a.timestamp);

		if (selectedRecording && getNeedsReviewTags(recording).length === 0) {
			selectedRecording = null;
			selectedTag = null;
			editMode = false;
		}
	}

	async function linkToExistingEntity(entity: CustomEntity): Promise<void> {
		if (!selectedRecording || !selectedTag) return;

		try {
			const updatedTags = (selectedRecording.transcriptionTags ?? []).map((tag) =>
				tag.id === selectedTag!.id
					? {
							...tag,
							customEntityId: entity.id,
							status: 'linked' as const
						}
					: tag
			);

			const updatedRecording: Recording = {
				...selectedRecording,
				transcriptionTags: updatedTags
			};

			await persistRecording(updatedRecording);
			selectedRecording = updatedRecording;
			selectedTag = null;
		} catch (err) {
			error = `Failed to link entity: ${String(err)}`;
		}
	}

	async function createNewEntity(): Promise<void> {
		if (!selectedRecording || !selectedTag || !editName.trim()) return;

		try {
			const newEntity = await customEntityService.addEntity(editName.trim(), editType, editNotes.trim() || undefined);
			await linkToExistingEntity(newEntity);
		} catch (err) {
			error = `Failed to create entity: ${String(err)}`;
		}
	}

	async function rejectTag(): Promise<void> {
		if (!selectedRecording || !selectedTag) return;

		try {
			const updatedRecording: Recording = {
				...selectedRecording,
				transcriptionTags: (selectedRecording.transcriptionTags ?? []).filter(
					(tag) => tag.id !== selectedTag!.id
				)
			};

			await persistRecording(updatedRecording);
			selectedRecording = updatedRecording;
			selectedTag = null;
			editMode = false;
		} catch (err) {
			error = `Failed to reject tag: ${String(err)}`;
		}
	}
</script>

<div class="review-container">
	<h1>Extraction Review</h1>

	{#if error}
		<div class="error-banner">{error}</div>
	{/if}

	{#if loading}
		<div class="empty-state">Loading review queue...</div>
	{:else if recordings.length === 0}
		<div class="empty-state">
			<p>No extractions pending review.</p>
			<p>All extracted tags are already linked.</p>
		</div>
	{:else}
		<div class="review-grid">
			<div class="recording-list">
				<h2>Pending Recordings ({recordings.length})</h2>
				<div class="list">
					{#each recordings as recording (recording.id)}
						<button
							type="button"
							class="recording-item {selectedRecording?.id === recording.id ? 'active' : ''}"
							on:click={() => selectRecording(recording)}
						>
							<div class="recording-header">
								<strong>{new Date(recording.timestamp).toLocaleString()}</strong>
								<span class="tag-count">{getNeedsReviewTags(recording).length} tags</span>
							</div>
							{#if recording.transcription}
								<div class="recording-preview">{recording.transcription.slice(0, 80)}...</div>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<div class="review-content">
				{#if selectedRecording}
					<div class="transcription-section">
						<h2>Transcription</h2>
						<div class="transcription-box">{selectedRecording.transcription || 'No transcription available.'}</div>
					</div>

					<div class="tags-section">
						<h2>Extracted Tags Needing Review</h2>
						<div class="tags-list">
							{#each getNeedsReviewTags(selectedRecording) as tag (tag.id)}
								<button
									type="button"
									class="tag-item {selectedTag?.id === tag.id ? 'active' : ''}"
									on:click={() => selectTag(tag)}
								>
									<div class="tag-header">
										<strong>{tag.name}</strong>
										<span class="tag-type">{tag.type}</span>
									</div>
									<div class="tag-context">{getMentionContext(tag).slice(0, 80)}...</div>
									<div class="tag-confidence">Confidence: {tag.confidence}%</div>
								</button>
							{/each}
						</div>
					</div>
				{:else}
					<div class="empty-state">Select a recording to review its tags.</div>
				{/if}
			</div>

			<div class="action-panel">
				{#if selectedTag}
					<h2>Resolve Tag</h2>
					<div class="entity-info">
						<div class="info-box">
							<div class="info-label">Entity Name</div>
							<div class="value">{selectedTag.name}</div>
						</div>
						<div class="info-box">
							<div class="info-label">Type</div>
							<div class="value">{selectedTag.type}</div>
						</div>
						<div class="info-box">
							<div class="info-label">Confidence</div>
							<div class="value">{selectedTag.confidence}%</div>
						</div>
					</div>

					{#if !editMode}
						<div class="suggested-section">
							<h3>Suggested Matches</h3>
							{#if suggestedMatches.length > 0}
								<div class="suggestions">
									{#each suggestedMatches as match (match.id)}
										<button type="button" class="suggestion-btn" on:click={() => linkToExistingEntity(match)}>
											<span class="match-name">{match.name}</span>
											<span class="match-type">{match.type}</span>
										</button>
									{/each}
								</div>
							{:else}
								<p class="no-suggestions">No close matches found.</p>
							{/if}
						</div>

						<div class="action-buttons">
							<button type="button" class="btn-primary" on:click={() => (editMode = true)}>Create New Entity</button>
							<button type="button" class="btn-secondary" on:click={rejectTag}>Reject Tag</button>
						</div>
					{:else}
						<div class="edit-section">
							<div class="form-group">
								<label for="edit-name">Entity Name</label>
								<input id="edit-name" bind:value={editName} type="text" placeholder="Enter name" />
							</div>

							<div class="form-group">
								<label for="edit-type">Type</label>
								<select id="edit-type" bind:value={editType}>
									<option value="PLAYER_CHARACTER">Character</option>
									<option value="NPC">NPC</option>
									<option value="LOCATION">Location</option>
									<option value="STORY_PLOT">Story Device</option>
								</select>
							</div>

							<div class="form-group">
								<label for="edit-notes">Notes (Optional)</label>
								<textarea id="edit-notes" bind:value={editNotes} placeholder="Add notes" rows="3"></textarea>
							</div>

							<div class="action-buttons">
								<button type="button" class="btn-primary" on:click={createNewEntity}>Save and Link</button>
								<button type="button" class="btn-secondary" on:click={() => (editMode = false)}>Cancel</button>
							</div>
						</div>
					{/if}
				{:else}
					<div class="empty-state">Select a tag to resolve.</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.review-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		padding: 20px;
		background-color: #fef9f0;
	}

	h1 {
		margin: 0 0 16px;
		color: #9a442d;
	}

	.review-grid {
		display: grid;
		grid-template-columns: 260px 1fr 300px;
		gap: 16px;
		flex: 1;
		overflow: hidden;
	}

	.recording-list,
	.review-content,
	.action-panel {
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		border: 2px inset #9a442d;
		background: #fef9f0;
	}

	h2 {
		margin: 0;
		padding: 12px;
		font-size: 15px;
		color: #9a442d;
		border-bottom: 2px outset #9a442d;
	}

	.list,
	.tags-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
	}

	.recording-item,
	.tag-item,
	.suggestion-btn,
	.btn-primary,
	.btn-secondary {
		cursor: pointer;
	}

	.recording-item,
	.tag-item {
		padding: 10px;
		border: 2px outset #d4a574;
		background: #fef9f0;
		text-align: left;
	}

	.recording-item.active,
	.tag-item.active {
		border: 2px inset #9a442d;
		background: #f5ede0;
	}

	.recording-header,
	.tag-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	.tag-count,
	.tag-type,
	.match-type {
		padding: 2px 8px;
		border: 1px solid #9a442d;
		background: #d4a574;
		font-size: 11px;
		color: #5c3d2e;
	}

	.recording-preview,
	.tag-context,
	.tag-confidence,
	.no-suggestions {
		margin-top: 6px;
		font-size: 12px;
		color: #666;
	}

	.transcription-box {
		padding: 14px;
		white-space: pre-wrap;
		line-height: 1.5;
		max-height: 280px;
		overflow-y: auto;
	}

	.action-panel {
		padding: 12px;
	}

	.entity-info,
	.suggestions,
	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.info-label {
		font-size: 12px;
		font-weight: 700;
		color: #9a442d;
		margin-bottom: 4px;
	}

	.value {
		padding: 8px;
		border: 1px inset #d4a574;
		background: #fff;
	}

	.suggested-section {
		margin: 12px 0;
	}

	.suggestion-btn {
		padding: 10px;
		border: 2px outset #d4a574;
		background: #f5ede0;
		display: flex;
		justify-content: space-between;
	}

	.form-group {
		margin-bottom: 10px;
	}

	.form-group label {
		display: block;
		font-size: 12px;
		font-weight: 700;
		color: #9a442d;
		margin-bottom: 4px;
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		width: 100%;
		box-sizing: border-box;
		padding: 8px;
		border: 1px inset #d4a574;
		background: #fff;
	}

	.btn-primary,
	.btn-secondary {
		padding: 10px;
		border: 2px outset #9a442d;
		font-weight: 700;
	}

	.btn-primary {
		color: #fef9f0;
		background: #9a442d;
	}

	.btn-secondary {
		color: #5c3d2e;
		background: #d4a574;
	}

	.empty-state {
		padding: 24px;
		text-align: center;
		color: #666;
	}

	.error-banner {
		padding: 10px 12px;
		margin-bottom: 12px;
		border: 2px outset #9a442d;
		background: #f5ede0;
		color: #5c3d2e;
	}

	@media (max-width: 1100px) {
		.review-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
