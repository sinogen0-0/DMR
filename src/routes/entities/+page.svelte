<script lang="ts">
	import { onMount } from 'svelte';
	import { createCustomEntityService } from '$lib/services/customEntityService';
	import type { CustomEntity, DossierType } from '$lib/types';

	const service = createCustomEntityService();

	type TabKey = 'PLAYER_CHARACTER' | 'NPC' | 'LOCATION' | 'STORY_PLOT';

	const tabs: { key: TabKey; label: string; icon: string }[] = [
		{ key: 'PLAYER_CHARACTER', label: 'Characters', icon: '⚔️' },
		{ key: 'NPC', label: 'NPCs', icon: '🧙' },
		{ key: 'LOCATION', label: 'Locations', icon: '🗺️' },
		{ key: 'STORY_PLOT', label: 'Story Devices', icon: '📜' }
	];

	let activeTab: TabKey = 'PLAYER_CHARACTER';
	let entities: CustomEntity[] = [];
	let newName = '';
	let error = '';
	let loading = true;

	onMount(async () => {
		await service.initialize();
		await loadEntities();
		loading = false;
	});

	async function loadEntities() {
		entities = await service.listEntities(activeTab);
	}

	async function switchTab(tab: TabKey) {
		activeTab = tab;
		error = '';
		newName = '';
		await loadEntities();
	}

	async function addEntity() {
		const trimmed = newName.trim();
		if (!trimmed) return;

		error = '';
		try {
			await service.addEntity(trimmed, activeTab);
			newName = '';
			await loadEntities();
		} catch (e: any) {
			error = e.message || 'Failed to add entry';
		}
	}

	async function removeEntity(id: string) {
		await service.removeEntity(id);
		await loadEntities();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			addEntity();
		}
	}

	function tabLabel(type: DossierType): string {
		return tabs.find(t => t.key === type)?.label || type;
	}
</script>

<div class="entities-container">
	<div class="page-header">
		<h2>Entity Lists</h2>
		<p class="page-desc">Add known characters, NPCs, locations, and story devices. These names will be recognized during transcription extraction.</p>
	</div>

	<!-- Tabs -->
	<div class="tab-bar">
		{#each tabs as tab}
			<button
				class="tab-btn"
				class:active={activeTab === tab.key}
				on:click={() => switchTab(tab.key)}
				type="button"
			>
				<span class="tab-icon">{tab.icon}</span>
				<span class="tab-label">{tab.label}</span>
			</button>
		{/each}
	</div>

	<!-- Add new entity -->
	<div class="add-row">
		<div class="input-bay">
			<input
				type="text"
				bind:value={newName}
				on:keydown={handleKeydown}
				placeholder="Type a name to add..."
				class="entity-input"
				maxlength="100"
			/>
		</div>
		<button class="add-btn" on:click={addEntity} type="button" disabled={!newName.trim()}>
			+ Add
		</button>
	</div>

	{#if error}
		<div class="error-msg">{error}</div>
	{/if}

	<!-- Entity list -->
	<div class="list-container">
		{#if loading}
			<div class="empty-state">Loading...</div>
		{:else if entities.length === 0}
			<div class="empty-state">No {tabLabel(activeTab).toLowerCase()} added yet. Type a name above to get started.</div>
		{:else}
			<div class="entity-count">{entities.length} {tabLabel(activeTab).toLowerCase()}</div>
			<ul class="entity-list">
				{#each entities as entity (entity.id)}
					<li class="entity-item">
						<span class="entity-name">{entity.name}</span>
						<button
							class="remove-btn"
							on:click={() => removeEntity(entity.id)}
							type="button"
							title="Remove"
						>✕</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<style>
	.entities-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 2rem;
		max-width: 640px;
	}

	.page-header h2 {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 1.25rem;
		font-weight: 600;
		color: #363226;
		margin-bottom: 0.25rem;
	}

	.page-desc {
		font-family: 'Inter', sans-serif;
		font-size: 0.8125rem;
		color: #6b6250;
		line-height: 1.5;
	}

	/* Tabs */
	.tab-bar {
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	.tab-btn {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: 0.5rem 1rem;
		cursor: pointer;
		background: #eee8d8;
		color: #6b6250;
		border-top: 1px solid #ffffff;
		border-left: 1px solid #ffffff;
		border-bottom: 1px solid #363226;
		border-right: 1px solid #363226;
		transition: background 0.15s;
	}

	.tab-btn.active {
		background: #ffffff;
		color: #9a442d;
		font-weight: 600;
		border-top: 1px solid #363226;
		border-left: 1px solid #363226;
		border-bottom: 1px solid #eee8d8;
		border-right: 1px solid #eee8d8;
	}

	.tab-btn:hover:not(.active) {
		background: #f5efe3;
	}

	.tab-icon {
		margin-right: 0.35rem;
	}

	/* Add row */
	.add-row {
		display: flex;
		gap: 0.5rem;
		align-items: stretch;
	}

	.input-bay {
		flex: 1;
		background: #eee8d8;
		border-top: 1px solid #363226;
		border-left: 1px solid #363226;
		border-bottom: 1px solid #ffffff;
		border-right: 1px solid #ffffff;
		padding: 2px;
	}

	.entity-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-family: 'Inter', sans-serif;
		font-size: 0.875rem;
		border: none;
		background: #f8f4eb;
		color: #363226;
		outline: none;
	}

	.entity-input:focus {
		outline: 2px solid #9a442d;
		outline-offset: -2px;
	}

	.entity-input::placeholder {
		color: #a89e8c;
	}

	.add-btn {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.5rem 1.25rem;
		cursor: pointer;
		background: #9a442d;
		color: #fef9f0;
		border-top: 1px solid #c46a50;
		border-left: 1px solid #c46a50;
		border-bottom: 1px solid #5a2818;
		border-right: 1px solid #5a2818;
		white-space: nowrap;
	}

	.add-btn:hover:not(:disabled) {
		background: #b0503a;
	}

	.add-btn:active:not(:disabled) {
		border-top: 1px solid #5a2818;
		border-left: 1px solid #5a2818;
		border-bottom: 1px solid #c46a50;
		border-right: 1px solid #c46a50;
	}

	.add-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Error */
	.error-msg {
		font-family: 'Inter', sans-serif;
		font-size: 0.8125rem;
		color: #9a442d;
		padding: 0.5rem 0.75rem;
		background: #fef0eb;
		border-left: 3px solid #9a442d;
	}

	/* List */
	.list-container {
		flex: 1;
		background: #ffffff;
		border-top: 1px solid #eee8d8;
		border-left: 1px solid #eee8d8;
		border-bottom: 1px solid #363226;
		border-right: 1px solid #363226;
		padding: 1rem;
	}

	.entity-count {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #9a442d;
		margin-bottom: 0.75rem;
	}

	.empty-state {
		font-family: 'Inter', sans-serif;
		font-size: 0.875rem;
		color: #a89e8c;
		text-align: center;
		padding: 2rem 1rem;
	}

	.entity-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.entity-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.25rem;
		font-family: 'Inter', sans-serif;
		font-size: 0.875rem;
		color: #363226;
	}

	.entity-item + .entity-item {
		border-top: 1px solid #eee8d8;
	}

	.entity-name {
		flex: 1;
	}

	.remove-btn {
		font-size: 0.75rem;
		padding: 0.2rem 0.5rem;
		cursor: pointer;
		background: transparent;
		border: 1px solid transparent;
		color: #a89e8c;
		font-family: 'Inter', sans-serif;
		line-height: 1;
	}

	.remove-btn:hover {
		color: #9a442d;
		background: #fef0eb;
	}
</style>
