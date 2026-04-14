<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { appSettings, initializeSettingsStore, updateSettings, resetSettings, DEFAULT_SETTINGS } from '$stores/settingsStore';
  import TaggingParametersPanel from '../../components/TaggingParametersPanel.svelte';

  let saveMessage = '';
  let activeSection: 'general' | 'tagging' = 'general';

  onMount(() => {
    initializeSettingsStore();
  });

  $: {
    const section = $page.url.searchParams.get('section');
    if (section === 'tagging') activeSection = 'tagging';
    else activeSection = 'general';
  }

  function onCodecChange(value: 'flac' | 'opus') {
    updateSettings({ audioCodec: value });
    saveMessage = 'Settings updated.';
  }

  function onMergeThresholdInput(value: number) {
    updateSettings({ mergeThreshold: value });
    saveMessage = 'Settings updated.';
  }

  function onReferenceStyleChange(value: 'modal' | 'fullpage') {
    updateSettings({ referenceLinkStyle: value });
    saveMessage = 'Settings updated.';
  }

  function onLanguageChange(value: string) {
    updateSettings({ language: value || 'en-US' });
    saveMessage = 'Settings updated.';
  }

  function onThemeChange(value: 'light' | 'dark') {
    updateSettings({ theme: value });
    saveMessage = 'Settings updated.';
  }

  function onReset() {
    resetSettings();
    saveMessage = 'Settings reset to defaults.';
  }
</script>

<div class="settings-page">
  <div class="header-strip">
    <div>
      <div class="eyebrow">System Configuration</div>
      <h1>Settings Control Center</h1>
      <p>General app behavior and tagging/categorization tuning in one place.</p>
    </div>
  </div>

  <div class="section-tabs" role="tablist" aria-label="Settings sections">
    <button
      type="button"
      class:active={activeSection === 'general'}
      role="tab"
      aria-selected={activeSection === 'general'}
      on:click={() => (activeSection = 'general')}
    >General Settings</button>
    <button
      type="button"
      class:active={activeSection === 'tagging'}
      role="tab"
      aria-selected={activeSection === 'tagging'}
      on:click={() => (activeSection = 'tagging')}
    >Tagging Parameters</button>
  </div>

  {#if saveMessage}
    <div class="status-banner">{saveMessage}</div>
  {/if}

  {#if activeSection === 'general'}
    <section class="panel">
      <h2>Audio Codec</h2>
      <div class="segmented">
        <button
          type="button"
          class:active={$appSettings.audioCodec === 'flac'}
          on:click={() => onCodecChange('flac')}
        >FLAC -> M4A</button>
        <button
          type="button"
          class:active={$appSettings.audioCodec === 'opus'}
          on:click={() => onCodecChange('opus')}
        >Opus</button>
      </div>
    </section>

    <section class="panel">
      <h2>Merge Similarity Threshold</h2>
      <label>
        <span>{$appSettings.mergeThreshold}%</span>
        <input
          type="range"
          min="50"
          max="100"
          step="1"
          value={$appSettings.mergeThreshold}
          on:input={(e) => onMergeThresholdInput(Number((e.currentTarget as HTMLInputElement).value))}
        />
      </label>
      <p class="hint">Entities at or above this threshold auto-merge.</p>
    </section>

    <section class="panel">
      <h2>Reference Link Style</h2>
      <div class="segmented">
        <button
          type="button"
          class:active={$appSettings.referenceLinkStyle === 'modal'}
          on:click={() => onReferenceStyleChange('modal')}
        >Modal Preview</button>
        <button
          type="button"
          class:active={$appSettings.referenceLinkStyle === 'fullpage'}
          on:click={() => onReferenceStyleChange('fullpage')}
        >Full Page</button>
      </div>
    </section>

    <section class="panel two-col">
      <div>
        <h2>Language</h2>
        <input value={$appSettings.language} on:input={(e) => onLanguageChange((e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div>
        <h2>Theme</h2>
        <div class="segmented">
          <button
            type="button"
            class:active={$appSettings.theme === 'light'}
            on:click={() => onThemeChange('light')}
          >Light</button>
          <button
            type="button"
            class:active={$appSettings.theme === 'dark'}
            on:click={() => onThemeChange('dark')}
          >Dark</button>
        </div>
      </div>
    </section>

    <div class="actions-row">
      <button class="danger-button" type="button" on:click={onReset}>Reset Defaults ({DEFAULT_SETTINGS.mergeThreshold}% merge)</button>
    </div>
  {:else}
    <TaggingParametersPanel />
  {/if}
</div>

<style>
  .settings-page {
    display: grid;
    gap: 0.95rem;
    padding: 1rem 0 2rem;
  }

  .header-strip {
    display: flex;
    justify-content: flex-start;
    gap: 1rem;
    align-items: flex-start;
    background: #eee8d8;
    border-top: 1px solid #fff;
    border-left: 1px solid #fff;
    border-bottom: 2px solid #bcae95;
    border-right: 2px solid #bcae95;
    padding: 0.9rem 1rem;
  }

  .eyebrow {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.68rem;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: #9a442d;
  }

  h1 {
    margin: 0.25rem 0 0;
    font-family: 'Space Grotesk', sans-serif;
    color: #363226;
  }

  p { margin: 0.35rem 0 0; color: #6b6250; font-family: 'Inter', sans-serif; }

  .panel {
    background: #fff;
    border-top: 1px solid #f7f1e6;
    border-left: 1px solid #f7f1e6;
    border-bottom: 2px solid #d2c6b1;
    border-right: 2px solid #d2c6b1;
    padding: 0.9rem;
    display: grid;
    gap: 0.6rem;
  }

  h2 {
    margin: 0;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #9a442d;
  }

  .segmented {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .segmented button,
  .secondary-button,
  .danger-button {
    border: none;
    padding: 0.45rem 0.8rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
    background: #eee8d8;
    color: #363226;
    box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #b8ad98;
  }

  .segmented button.active {
    background: #9a442d;
    color: #fef9f0;
    box-shadow: inset 1px 1px 0 #c46a50, inset -1px -1px 0 #5a2818;
  }

  label span {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    color: #363226;
  }

  input[type='range'] { width: 100%; }

  input[type='text'],
  input:not([type]) {
    border-top: 2px solid #c7b89f;
    border-left: 2px solid #c7b89f;
    border-bottom: 1px solid #fff;
    border-right: 1px solid #fff;
    background: #fef9f0;
    color: #2e261c;
    font-family: 'Inter', sans-serif;
    padding: 0.45rem 0.5rem;
    font-size: 0.86rem;
  }

  .hint { font-size: 0.8rem; color: #7f715c; margin: 0; }

  .two-col {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    align-items: start;
  }

  .status-banner {
    background: #eef6e9;
    color: #3f5f3c;
    padding: 0.55rem 0.7rem;
    border-top: 1px solid #f5fff0;
    border-left: 1px solid #f5fff0;
    border-bottom: 1px solid #b7d1ad;
    border-right: 1px solid #b7d1ad;
    font-family: 'Inter', sans-serif;
    font-size: 0.82rem;
  }

  .actions-row { display: flex; justify-content: flex-end; }

  .section-tabs {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.2rem;
  }

  .section-tabs button {
    border: none;
    padding: 0.42rem 0.75rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
    background: #eee8d8;
    color: #6b6250;
    box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #b8ad98;
  }

  .section-tabs button.active {
    background: #9a442d;
    color: #fef9f0;
    box-shadow: inset 1px 1px 0 #c46a50, inset -1px -1px 0 #5a2818;
  }

  .danger-button {
    background: #7d2719;
    color: #fef9f0;
    box-shadow: inset 1px 1px 0 #a13f2e, inset -1px -1px 0 #4d140b;
  }
</style>
