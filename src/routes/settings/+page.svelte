<script lang="ts">
  /**
   * Settings View - Twin Peaks Interface
   * Modal overlay for app configuration
   */

  import { goto } from '$app/navigation';
  import OscilloscopeDisplay from '$lib/components/physical/OscilloscopeDisplay.svelte';
  import PhysicalButton from '$lib/components/physical/PhysicalButton.svelte';
  import ButtonPanel from '$lib/components/physical/ButtonPanel.svelte';

  let activeSection: 'general' | 'tagging' = 'general';

  function handleClose() {
    goto('/recording'); // Return to default view
  }

  function handleSave() {
    // TODO: Implement actual settings save
    console.log('[Settings] Save settings');
    handleClose();
  }
</script>

<div class="settings-view">
  <div class="settings-container">
    <!-- Header -->
    <div class="settings-header">
      <div class="header-title crt-text-bright">FIELD LOG: CONFIGURATION</div>
      <button class="close-button" on:click={handleClose}>✕</button>
    </div>

    <!-- Main Content -->
    <div class="settings-content">
      <OscilloscopeDisplay className="settings-display">
        <div class="display-content">
          <!-- Section Tabs -->
          <div class="section-tabs">
            <button
              class="tab-button crt-text {activeSection === 'general' ? 'active' : ''}"
              on:click={() => activeSection = 'general'}
            >
              GENERAL
            </button>
            <button
              class="tab-button crt-text {activeSection === 'tagging' ? 'active' : ''}"
              on:click={() => activeSection = 'tagging'}
            >
              TAGGING
            </button>
          </div>

          <div class="divider" />

          <!-- General Settings -->
          {#if activeSection === 'general'}
            <div class="settings-section">
              <div class="section-title crt-text-bright">&gt; GENERAL SETTINGS</div>
              
              <div class="setting-item">
                <div class="setting-label crt-text">AUDIO CODEC</div>
                <select class="crt-select crt-text">
                  <option>OPUS (DEFAULT)</option>
                  <option>M4A (APPLE)</option>
                  <option>WAV (UNCOMPRESSED)</option>
                </select>
              </div>

              <div class="setting-item">
                <div class="setting-label crt-text">LANGUAGE</div>
                <select class="crt-select crt-text">
                  <option>EN-US</option>
                  <option>EN-GB</option>
                  <option>ES-ES</option>
                </select>
              </div>

              <div class="setting-item">
                <div class="setting-label crt-text">DOSSIER LINK STYLE</div>
                <div class="setting-options">
                  <label class="crt-text-dim">
                    <input type="radio" name="linkStyle" value="modal" checked />
                    MODAL PREVIEW
                  </label>
                  <label class="crt-text-dim">
                    <input type="radio" name="linkStyle" value="fullpage" />
                    FULL PAGE
                  </label>
                </div>
              </div>
            </div>
          {/if}

          <!-- Tagging Settings -->
          {#if activeSection === 'tagging'}
            <div class="settings-section">
              <div class="section-title crt-text-bright">&gt; TAGGING PARAMETERS</div>
              
              <div class="setting-item">
                <div class="setting-label crt-text">EXTRACTION CONFIDENCE</div>
                <div class="slider-container">
                  <input type="range" min="0" max="100" value="70" class="crt-slider" />
                  <span class="slider-value crt-text-dim">70%</span>
                </div>
              </div>

              <div class="setting-item">
                <div class="setting-label crt-text">MERGE THRESHOLD</div>
                <div class="slider-container">
                  <input type="range" min="0" max="100" value="80" class="crt-slider" />
                  <span class="slider-value crt-text-dim">80%</span>
                </div>
              </div>

              <div class="setting-item">
                <div class="setting-label crt-text">MAX ENTITIES PER RECORDING</div>
                <input type="number" min="1" max="50" value="20" class="crt-input crt-text" />
              </div>
            </div>
          {/if}

          <div class="divider" />

          <!-- Info -->
          <div class="settings-info crt-text-dim">
            <p>&gt; FIELD_LOG_V1.0</p>
            <p>&gt; BUILD: 2026.05.11</p>
          </div>
        </div>
      </OscilloscopeDisplay>
    </div>

    <!-- Controls -->
    <div class="settings-controls">
      <ButtonPanel orientation="horizontal" align="space-between">
        <PhysicalButton
          label="CANCEL"
          icon="✗"
          variant="default"
          size="medium"
          on:click={handleClose}
        />
        <PhysicalButton
          label="SAVE"
          icon="✓"
          variant="record"
          size="medium"
          on:click={handleSave}
        />
      </ButtonPanel>
    </div>
  </div>
</div>

<style>
  .settings-view {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fade-in 200ms;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .settings-container {
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    animation: slide-up 300ms ease-out;
  }

  @keyframes slide-up {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* Header */
  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background: var(--color-device-panel);
    border-radius: 8px 8px 0 0;
  }

  .header-title {
    font-size: 1rem;
    font-weight: bold;
    letter-spacing: 0.1em;
  }

  .close-button {
    width: 32px;
    height: 32px;
    background: var(--color-button-default);
    border: none;
    border-radius: 50%;
    color: #999999;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 100ms;
  }

  .close-button:hover {
    background: var(--color-button-highlight);
    color: #ffffff;
  }

  /* Content */
  .settings-content {
    flex: 1;
    min-height: 0;
  }

  .settings-display {
    height: 100%;
    min-height: 400px;
    max-height: 600px;
  }

  .display-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  /* Tabs */
  .section-tabs {
    display: flex;
    gap: var(--spacing-sm);
  }

  .tab-button {
    flex: 1;
    background: transparent;
    border: 1px solid var(--color-phosphor-green-dim);
    color: var(--color-phosphor-green-dim);
    font-family: var(--font-display);
    font-size: 0.75rem;
    padding: var(--spacing-xs) var(--spacing-sm);
    cursor: pointer;
    transition: all 100ms;
  }

  .tab-button:hover {
    border-color: var(--color-phosphor-green);
    color: var(--color-phosphor-green);
  }

  .tab-button.active {
    background: var(--color-crt-bg-light);
    border-color: var(--color-phosphor-green-bright);
    color: var(--color-phosphor-green-bright);
    box-shadow: 0 0 8px var(--color-phosphor-glow);
  }

  .divider {
    height: 1px;
    background: var(--color-phosphor-green-dim);
    opacity: 0.3;
    box-shadow: 0 0 2px var(--color-phosphor-glow);
  }

  /* Settings Section */
  .settings-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .section-title {
    font-size: 0.85rem;
    font-weight: bold;
    letter-spacing: 0.1em;
  }

  .setting-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .setting-label {
    font-size: 0.75rem;
    letter-spacing: 0.05em;
  }

  /* Form Controls */
  .crt-select,
  .crt-input {
    background: rgba(0, 26, 13, 0.5);
    border: 1px solid var(--color-phosphor-green-dim);
    color: var(--color-phosphor-green);
    font-family: var(--font-display);
    font-size: 0.85rem;
    padding: var(--spacing-xs) var(--spacing-sm);
    outline: none;
  }

  .crt-select:focus,
  .crt-input:focus {
    border-color: var(--color-phosphor-green);
    box-shadow: 0 0 8px var(--color-phosphor-glow);
  }

  .setting-options {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
  }

  .setting-options label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.75rem;
    cursor: pointer;
  }

  .slider-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .crt-slider {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: var(--color-crt-bg-light);
    outline: none;
  }

  .crt-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--color-phosphor-green);
    cursor: pointer;
    border-radius: 50%;
    box-shadow: 0 0 4px var(--color-phosphor-glow);
  }

  .slider-value {
    min-width: 40px;
    font-size: 0.75rem;
  }

  /* Info */
  .settings-info {
    font-size: 0.7rem;
    line-height: 1.6;
    margin-top: var(--spacing-md);
  }

  /* Controls */
  .settings-controls {
    padding: var(--spacing-md);
    background: var(--color-device-panel);
    border-radius: 0 0 8px 8px;
  }
</style>
