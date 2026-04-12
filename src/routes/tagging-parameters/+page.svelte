<script lang="ts">
  import { goto } from '$app/navigation';
  import { taggingParams, DEFAULT_TAGGING_PARAMS, resetTaggingParams } from '$stores/taggingParamsStore';
  import type { RuleConfig } from '$stores/taggingParamsStore';

  // Deep copy current params as the editable draft
  let draft = JSON.parse(JSON.stringify($taggingParams));

  let activeTab: string = 'NPC';
  let saveStatus: '' | 'saved' | 'reset' = '';

  // Per-(type, field) add inputs
  let addInputs: Record<string, string> = {};
  let addRaceInput = '';
  let addClassInput = '';
  let addPrepInput = '';

  const TYPE_LABELS: Record<string, string> = {
    NPC: 'NPC',
    PLAYER_CHARACTER: 'Player Character',
    LOCATION: 'Location',
    STORY_PLOT: 'Story Plot'
  };

  const WEIGHT_LABELS: Array<[keyof RuleConfig['weights'], string]> = [
    ['nameStartsWith', 'Name starts with'],
    ['nameContains', 'Name contains'],
    ['nameEndsWith', 'Name ends with'],
    ['contextKeyword', 'Context keyword'],
    ['contextPhrase', 'Context phrase']
  ];

  type KeywordField = 'nameStartsWith' | 'nameContains' | 'nameEndsWith' | 'contextKeywords' | 'contextPhrases';

  const KEYWORD_FIELDS: Array<[KeywordField, string]> = [
    ['nameStartsWith', 'Name starts with'],
    ['nameContains', 'Name contains'],
    ['nameEndsWith', 'Name ends with'],
    ['contextKeywords', 'Context keywords'],
    ['contextPhrases', 'Context phrases']
  ];

  function getRuleIndex(type: string): number {
    return draft.rules.findIndex((r: RuleConfig) => r.type === type);
  }

  function removeKeyword(type: string, field: KeywordField, index: number) {
    const ri = getRuleIndex(type);
    (draft.rules[ri][field] as string[]).splice(index, 1);
    draft = { ...draft };
  }

  function addKeyword(type: string, field: KeywordField) {
    const key = `${type}_${field}`;
    const val = (addInputs[key] ?? '').trim();
    if (!val) return;
    const ri = getRuleIndex(type);
    (draft.rules[ri][field] as string[]).push(val);
    addInputs[key] = '';
    draft = { ...draft };
  }

  function handleKeydownKeyword(e: KeyboardEvent, type: string, field: KeywordField) {
    if (e.key === 'Enter') { e.preventDefault(); addKeyword(type, field); }
  }

  function removeIndicatorTerm(field: 'raceTerms' | 'classTerms' | 'locationPrepositions', index: number) {
    draft.indicators[field].splice(index, 1);
    draft = { ...draft };
  }

  function addIndicatorTerm(field: 'raceTerms' | 'classTerms' | 'locationPrepositions', value: string) {
    const val = value.trim();
    if (!val) return;
    draft.indicators[field].push(val);
    if (field === 'raceTerms') addRaceInput = '';
    else if (field === 'classTerms') addClassInput = '';
    else addPrepInput = '';
    draft = { ...draft };
  }

  function save() {
    taggingParams.set(JSON.parse(JSON.stringify(draft)));
    saveStatus = 'saved';
    setTimeout(() => { saveStatus = ''; }, 2500);
  }

  function reset() {
    resetTaggingParams();
    draft = JSON.parse(JSON.stringify(DEFAULT_TAGGING_PARAMS));
    addInputs = {};
    addRaceInput = '';
    addClassInput = '';
    addPrepInput = '';
    saveStatus = 'reset';
    setTimeout(() => { saveStatus = ''; }, 2500);
  }

  $: activeRule = draft.rules.find((r: RuleConfig) => r.type === activeTab);
  $: activeRuleIndex = getRuleIndex(activeTab);
</script>

<div class="page">
  <div class="page-header">
    <button class="btn-back" on:click={() => goto('/')}>← Back</button>
    <h1 class="page-title">TAGGING PARAMETERS</h1>
    <div class="header-actions">
      {#if saveStatus === 'saved'}
        <span class="status-badge status-saved">✓ Saved</span>
      {:else if saveStatus === 'reset'}
        <span class="status-badge status-reset">✓ Reset to defaults</span>
      {/if}
      <button class="btn btn-secondary" on:click={reset}>Reset Defaults</button>
      <button class="btn btn-primary" on:click={save}>Save Parameters</button>
    </div>
  </div>

  <div class="sections">

    <!-- ── Section 1: Extraction Defaults ───────────────────────── -->
    <div class="section">
      <div class="section-header">EXTRACTION DEFAULTS</div>
      <div class="section-body">
        <div class="field-row">
          <div class="field-info">
            <label class="field-label" for="min-confidence">Min Confidence</label>
            <span class="field-hint">Entities scoring below this are discarded. Default: 30</span>
          </div>
          <div class="slider-group">
            <input id="min-confidence" type="range" min="0" max="100" bind:value={draft.extraction.minConfidence} />
            <input type="number" min="0" max="100" class="number-input" bind:value={draft.extraction.minConfidence} />
          </div>
        </div>
        <div class="field-row">
          <div class="field-info">
            <label class="field-label" for="max-entities">Max Entities</label>
            <span class="field-hint">Hard cap on entities returned per transcription. Default: 50</span>
          </div>
          <input id="max-entities" type="number" min="1" max="500" class="number-input" bind:value={draft.extraction.maxEntities} />
        </div>
      </div>
    </div>

    <!-- ── Section 2: Classification Thresholds ─────────────────── -->
    <div class="section">
      <div class="section-header">CLASSIFICATION THRESHOLDS</div>
      <div class="section-body">
        <div class="field-row">
          <div class="field-info">
            <label class="field-label" for="ambiguous-threshold">Ambiguity Threshold</label>
            <span class="field-hint">When the score gap between top two types is less than this, confidence is penalised by ~25%. Default: 8</span>
          </div>
          <div class="slider-group">
            <input id="ambiguous-threshold" type="range" min="0" max="50" bind:value={draft.thresholds.ambiguous} />
            <input type="number" min="0" max="50" class="number-input" bind:value={draft.thresholds.ambiguous} />
          </div>
        </div>
        <div class="field-row">
          <div class="field-info">
            <label class="field-label" for="low-evidence">Low Evidence Threshold</label>
            <span class="field-hint">When the best score is below this, the entity falls back to NPC at confidence 32. Default: 20</span>
          </div>
          <div class="slider-group">
            <input id="low-evidence" type="range" min="0" max="100" bind:value={draft.thresholds.lowEvidence} />
            <input type="number" min="0" max="100" class="number-input" bind:value={draft.thresholds.lowEvidence} />
          </div>
        </div>
      </div>
    </div>

    <!-- ── Section 3: Entity Type Rules ─────────────────────────── -->
    <div class="section">
      <div class="section-header">ENTITY TYPE RULES</div>
      <div class="rule-tabs">
        {#each draft.rules as rule (rule.type)}
          <button
            class="rule-tab"
            class:active={activeTab === rule.type}
            on:click={() => { activeTab = rule.type; }}
          >{TYPE_LABELS[rule.type] ?? rule.type}</button>
        {/each}
      </div>

      {#if activeRule}
        <div class="rule-panel">

          <!-- Score Weights -->
          <div class="subsection-label">SCORE WEIGHTS</div>
          <div class="weights-grid">
            {#each WEIGHT_LABELS as [wk, wLabel]}
              <div class="weight-field">
                <label class="weight-label">{wLabel}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  class="number-input"
                  bind:value={draft.rules[activeRuleIndex].weights[wk]}
                />
              </div>
            {/each}
          </div>

          <!-- Keyword Lists -->
          {#each KEYWORD_FIELDS as [field, fieldLabel]}
            {@const arr = draft.rules[activeRuleIndex][field] as string[]}
            {@const inputKey = `${activeTab}_${field}`}
            <div class="keyword-block">
              <div class="subsection-label">{fieldLabel}</div>
              <div class="chips">
                {#each arr as kw, ki}
                  <span class="chip">
                    <span class="chip-text">{kw}</span>
                    <button
                      class="chip-remove"
                      title="Remove"
                      on:click={() => removeKeyword(activeTab, field, ki)}
                    >×</button>
                  </span>
                {/each}
                {#if arr.length === 0}
                  <span class="chips-empty">No entries</span>
                {/if}
              </div>
              <div class="add-row">
                <input
                  type="text"
                  class="text-input"
                  placeholder="Add entry and press Enter…"
                  bind:value={addInputs[inputKey]}
                  on:keydown={(e) => handleKeydownKeyword(e, activeTab, field)}
                />
                <button class="btn btn-small" on:click={() => addKeyword(activeTab, field)}>Add</button>
              </div>
            </div>
          {/each}

        </div>
      {/if}
    </div>

    <!-- ── Section 4: D&D Indicators ────────────────────────────── -->
    <div class="section">
      <div class="section-header">D&D INDICATORS</div>
      <div class="section-body">

        <div class="field-row">
          <div class="field-info">
            <label class="field-label" for="npc-bonus">Race/Class → NPC Bonus</label>
            <span class="field-hint">Points added to NPC score when a race or class term appears near the entity. Default: 10</span>
          </div>
          <input id="npc-bonus" type="number" min="0" max="50" class="number-input" bind:value={draft.indicators.raceClassNpcBonus} />
        </div>
        <div class="field-row">
          <div class="field-info">
            <label class="field-label" for="pc-bonus">Race/Class → PC Bonus</label>
            <span class="field-hint">Points added to Player Character score for the same race/class match. Default: 8</span>
          </div>
          <input id="pc-bonus" type="number" min="0" max="50" class="number-input" bind:value={draft.indicators.raceClassPcBonus} />
        </div>
        <div class="field-row">
          <div class="field-info">
            <label class="field-label" for="prep-bonus">Location Preposition Bonus</label>
            <span class="field-hint">Points added to Location score when a preposition directly precedes the entity name. Default: 14</span>
          </div>
          <input id="prep-bonus" type="number" min="0" max="50" class="number-input" bind:value={draft.indicators.locationPrepBonus} />
        </div>

        <!-- Race Terms -->
        <div class="keyword-block">
          <div class="subsection-label">RACE TERMS</div>
          <div class="chips">
            {#each draft.indicators.raceTerms as term, i}
              <span class="chip">
                <span class="chip-text">{term}</span>
                <button class="chip-remove" title="Remove" on:click={() => removeIndicatorTerm('raceTerms', i)}>×</button>
              </span>
            {/each}
          </div>
          <div class="add-row">
            <input
              type="text"
              class="text-input"
              placeholder="Add race term and press Enter…"
              bind:value={addRaceInput}
              on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIndicatorTerm('raceTerms', addRaceInput); } }}
            />
            <button class="btn btn-small" on:click={() => addIndicatorTerm('raceTerms', addRaceInput)}>Add</button>
          </div>
        </div>

        <!-- Class Terms -->
        <div class="keyword-block">
          <div class="subsection-label">CLASS TERMS</div>
          <div class="chips">
            {#each draft.indicators.classTerms as term, i}
              <span class="chip">
                <span class="chip-text">{term}</span>
                <button class="chip-remove" title="Remove" on:click={() => removeIndicatorTerm('classTerms', i)}>×</button>
              </span>
            {/each}
          </div>
          <div class="add-row">
            <input
              type="text"
              class="text-input"
              placeholder="Add class term and press Enter…"
              bind:value={addClassInput}
              on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIndicatorTerm('classTerms', addClassInput); } }}
            />
            <button class="btn btn-small" on:click={() => addIndicatorTerm('classTerms', addClassInput)}>Add</button>
          </div>
        </div>

        <!-- Location Prepositions -->
        <div class="keyword-block">
          <div class="subsection-label">LOCATION PREPOSITIONS</div>
          <div class="chips">
            {#each draft.indicators.locationPrepositions as term, i}
              <span class="chip">
                <span class="chip-text">{term}</span>
                <button class="chip-remove" title="Remove" on:click={() => removeIndicatorTerm('locationPrepositions', i)}>×</button>
              </span>
            {/each}
          </div>
          <div class="add-row">
            <input
              type="text"
              class="text-input"
              placeholder="Add preposition and press Enter…"
              bind:value={addPrepInput}
              on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIndicatorTerm('locationPrepositions', addPrepInput); } }}
            />
            <button class="btn btn-small" on:click={() => addIndicatorTerm('locationPrepositions', addPrepInput)}>Add</button>
          </div>
        </div>

      </div>
    </div>

  </div>
</div>

<style>
  /* ── Layout ────────────────────────────────────────────────────── */
  .page {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-width: 900px;
    margin: 0 auto;
    padding-bottom: 4rem;
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .page-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #363226;
    flex: 1;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .status-badge {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    padding: 0.25rem 0.75rem;
  }

  .status-saved { color: #4b654e; }
  .status-reset { color: #9a442d; }

  /* ── Buttons ───────────────────────────────────────────────────── */
  .btn-back {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.8rem;
    letter-spacing: 0.05em;
    background: #eee8d8;
    color: #363226;
    border: none;
    padding: 0.4rem 0.85rem;
    cursor: pointer;
    box-shadow:
      1px 1px 0 #fff inset,
      -1px -1px 0 #b8ad98 inset;
  }

  .btn {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.45rem 1rem;
    border: none;
    cursor: pointer;
  }

  .btn-primary {
    background: #9a442d;
    color: #fef9f0;
    box-shadow:
      1px 1px 0 #c4614a inset,
      -1px -1px 0 #6b2e1e inset;
  }

  .btn-primary:active {
    box-shadow:
      -1px -1px 0 #c4614a inset,
      1px 1px 0 #6b2e1e inset;
  }

  .btn-secondary {
    background: #eee8d8;
    color: #363226;
    box-shadow:
      1px 1px 0 #fff inset,
      -1px -1px 0 #b8ad98 inset;
  }

  .btn-small {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.35rem 0.7rem;
    border: none;
    background: #eee8d8;
    color: #363226;
    cursor: pointer;
    box-shadow:
      1px 1px 0 #fff inset,
      -1px -1px 0 #b8ad98 inset;
    white-space: nowrap;
  }

  .btn-small:active {
    box-shadow:
      -1px -1px 0 #fff inset,
      1px 1px 0 #b8ad98 inset;
  }

  /* ── Sections ──────────────────────────────────────────────────── */
  .sections {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .section {
    border-top: 1px solid #eee8d8;
    border-left: 1px solid #eee8d8;
    border-bottom: 1px solid #363226;
    border-right: 1px solid #363226;
    background: #fff;
  }

  .section-header {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9a442d;
    background: #eee8d8;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid #b8ad98;
  }

  .section-body {
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* ── Fields ────────────────────────────────────────────────────── */
  .field-row {
    display: flex;
    align-items: flex-start;
    gap: 1.5rem;
  }

  .field-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .field-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    color: #363226;
    letter-spacing: 0.03em;
  }

  .field-hint {
    font-family: 'Inter', sans-serif;
    font-size: 0.72rem;
    color: #8a785e;
    line-height: 1.4;
  }

  .slider-group {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-shrink: 0;
  }

  input[type="range"] {
    width: 120px;
    accent-color: #9a442d;
  }

  .number-input {
    width: 64px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.85rem;
    padding: 0.3rem 0.5rem;
    background: #eee8d8;
    border: none;
    color: #363226;
    text-align: center;
    box-shadow:
      -1px -1px 0 #fff inset,
      1px 1px 0 #b8ad98 inset;
  }

  /* ── Rule Tabs ─────────────────────────────────────────────────── */
  .rule-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid #b8ad98;
    background: #eee8d8;
  }

  .rule-tab {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.5rem 1.25rem;
    border: none;
    background: transparent;
    color: #8a785e;
    cursor: pointer;
    border-right: 1px solid #b8ad98;
  }

  .rule-tab.active {
    background: #fff;
    color: #9a442d;
    font-weight: 700;
  }

  /* ── Rule Panel ─────────────────────────────────────────────────── */
  .rule-panel {
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .subsection-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9a442d;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid #eee8d8;
    padding-bottom: 0.25rem;
  }

  .weights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.75rem;
  }

  .weight-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .weight-label {
    font-family: 'Inter', sans-serif;
    font-size: 0.72rem;
    color: #6b6250;
  }

  /* ── Keywords ──────────────────────────────────────────────────── */
  .keyword-block {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    min-height: 2rem;
    padding: 0.35rem;
    background: #f9f5ef;
    box-shadow:
      -1px -1px 0 #fff inset,
      1px 1px 0 #b8ad98 inset;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.4rem 0.2rem 0.55rem;
    background: #eee8d8;
    box-shadow:
      1px 1px 0 #fff inset,
      -1px -1px 0 #b8ad98 inset;
  }

  .chip-text {
    font-family: 'Inter', sans-serif;
    font-size: 0.75rem;
    color: #363226;
  }

  .chip-remove {
    font-size: 0.85rem;
    line-height: 1;
    background: none;
    border: none;
    color: #9a442d;
    cursor: pointer;
    padding: 0 0.1rem;
  }

  .chips-empty {
    font-family: 'Inter', sans-serif;
    font-size: 0.72rem;
    color: #b8ad98;
    padding: 0.1rem 0.25rem;
  }

  .add-row {
    display: flex;
    gap: 0.5rem;
  }

  .text-input {
    flex: 1;
    font-family: 'Inter', sans-serif;
    font-size: 0.8rem;
    padding: 0.3rem 0.6rem;
    background: #eee8d8;
    border: none;
    color: #363226;
    box-shadow:
      -1px -1px 0 #fff inset,
      1px 1px 0 #b8ad98 inset;
  }

  .text-input::placeholder { color: #b8ad98; }
  .text-input:focus { outline: 1px solid #9a442d; }
</style>
